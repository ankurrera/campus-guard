import * as faceapi from 'face-api.js';
import { DepthMapData, computeDepthAntiSpoofingScore } from './face3d';

export interface AntiSpoofingResult {
  isLive: boolean;
  confidence: number;
  spoofingType?: 'photo' | 'screen' | 'video' | 'deepfake' | 'multiple_faces';
  details: {
    depthAnalysis: number;
    textureAnalysis: number;
    motionAnalysis: number;
    faceCount: number;
    eyeMovement: number;
    blinkDetection: number;
    depth3DScore?: number; // Optional real depth score from 3D capture
  };
}

export interface FaceDetectionWithLandmarks {
  detection: faceapi.FaceDetection;
  landmarks: faceapi.FaceLandmarks68;
  expressions: faceapi.FaceExpressions;
}

/**
 * Advanced face depth analysis using facial landmarks
 * Analyzes 3D characteristics to detect flat surfaces (photos/screens)
 */
export function analyzeDepth(landmarks: faceapi.FaceLandmarks68): number {
  const positions = landmarks.positions;
  
  // Calculate nose bridge depth ratio
  const noseTip = positions[30]; // Nose tip
  const noseBase = positions[33]; // Nose base
  const leftNostril = positions[31];
  const rightNostril = positions[35];
  
  // Calculate eye socket depth
  const leftEyeInner = positions[39];
  const leftEyeOuter = positions[36];
  const rightEyeInner = positions[42];
  const rightEyeOuter = positions[45];
  
  // Calculate depth ratios
  const noseDepthRatio = Math.abs(noseTip.y - noseBase.y) / Math.abs(leftNostril.x - rightNostril.x);
  const eyeDepthRatio = (Math.abs(leftEyeInner.y - leftEyeOuter.y) + Math.abs(rightEyeInner.y - rightEyeOuter.y)) / 2;
  
  // Calculate face width to height ratio for perspective analysis
  const faceWidth = Math.abs(positions[0].x - positions[16].x);
  const faceHeight = Math.abs(positions[8].y - positions[27].y);
  const aspectRatio = faceWidth / faceHeight;
  
  // Analyze chin and forehead projection
  const chin = positions[8];
  const forehead = positions[27];
  const leftCheek = positions[1];
  const rightCheek = positions[15];
  
  const chinProjection = Math.abs(chin.y - (leftCheek.y + rightCheek.y) / 2);
  const foreheadProjection = Math.abs(forehead.y - (leftCheek.y + rightCheek.y) / 2);
  
  // Combine depth indicators (higher = more likely real face)
  const depthScore = (
    noseDepthRatio * 0.3 +
    eyeDepthRatio * 0.2 +
    (aspectRatio > 0.6 && aspectRatio < 1.0 ? 0.2 : 0) + // Natural face proportions
    (chinProjection > 5 ? 0.15 : 0) +
    (foreheadProjection > 3 ? 0.15 : 0)
  );
  
  return Math.min(depthScore, 1.0);
}

/**
 * Texture analysis to detect printed photos or screen displays
 * Analyzes pixel patterns around facial features
 */
export function analyzeTexture(video: HTMLVideoElement, landmarks: faceapi.FaceLandmarks68): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  const positions = landmarks.positions;
  const samples: Array<{x: number, y: number}> = [
    positions[30], // Nose tip
    positions[39], // Left eye inner corner
    positions[42], // Right eye inner corner
    positions[48], // Left mouth corner
    positions[54], // Right mouth corner
  ];
  
  let textureScore = 0;
  const sampleSize = 10; // 10x10 pixel area around each point
  
  for (const sample of samples) {
    const x = Math.round(sample.x);
    const y = Math.round(sample.y);
    
    try {
      const imageData = ctx.getImageData(
        Math.max(0, x - sampleSize/2),
        Math.max(0, y - sampleSize/2),
        sampleSize,
        sampleSize
      );
      
      // Calculate texture variance (higher variance = more natural texture)
      const pixels = imageData.data;
      const greyValues: number[] = [];
      
      for (let i = 0; i < pixels.length; i += 4) {
        const grey = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        greyValues.push(grey);
      }
      
      const mean = greyValues.reduce((sum, val) => sum + val, 0) / greyValues.length;
      const variance = greyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / greyValues.length;
      
      // Normalize variance (natural skin typically has variance 200-800)
      const normalizedVariance = Math.min(variance / 800, 1.0);
      textureScore += normalizedVariance;
      
    } catch (error) {
      console.warn('Texture analysis error:', error);
    }
  }
  
  return textureScore / samples.length;
}

/**
 * Motion-based liveness detection
 * Tracks micro-movements and natural facial animations
 */
export class MotionAnalyzer {
  private previousLandmarks: faceapi.FaceLandmarks68[] = [];
  private movementHistory: number[] = [];
  private blinkHistory: boolean[] = [];
  private expressionHistory: faceapi.FaceExpressions[] = [];
  
  analyzeMotion(landmarks: faceapi.FaceLandmarks68, expressions: faceapi.FaceExpressions): number {
    this.previousLandmarks.push(landmarks);
    this.expressionHistory.push(expressions);
    
    // Keep only last 10 frames
    if (this.previousLandmarks.length > 10) {
      this.previousLandmarks.shift();
      this.expressionHistory.shift();
    }
    
    if (this.previousLandmarks.length < 3) {
      return 0.5; // Not enough data yet
    }
    
    // Analyze micro-movements
    const movementScore = this.calculateMovementScore();
    
    // Analyze blink patterns
    const blinkScore = this.analyzeBlinking(landmarks);
    
    // Analyze expression changes
    const expressionScore = this.analyzeExpressionChanges();
    
    // Combine scores
    return (movementScore * 0.4 + blinkScore * 0.4 + expressionScore * 0.2);
  }
  
  private calculateMovementScore(): number {
    if (this.previousLandmarks.length < 2) return 0;
    
    const current = this.previousLandmarks[this.previousLandmarks.length - 1];
    const previous = this.previousLandmarks[this.previousLandmarks.length - 2];
    
    // Calculate movement of key points
    const keyPoints = [30, 8, 27, 39, 42]; // Nose tip, chin, forehead, eye corners
    let totalMovement = 0;
    
    for (const pointIndex of keyPoints) {
      const currentPoint = current.positions[pointIndex];
      const previousPoint = previous.positions[pointIndex];
      
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - previousPoint.x, 2) +
        Math.pow(currentPoint.y - previousPoint.y, 2)
      );
      
      totalMovement += distance;
    }
    
    // Natural micro-movements should be 1-5 pixels per frame
    const naturalMovement = Math.min(totalMovement / 20, 1.0);
    this.movementHistory.push(naturalMovement);
    
    if (this.movementHistory.length > 10) {
      this.movementHistory.shift();
    }
    
    // Calculate movement consistency
    const avgMovement = this.movementHistory.reduce((sum, val) => sum + val, 0) / this.movementHistory.length;
    
    // Ideal movement is consistent but not zero (which indicates stillness/photo)
    return avgMovement > 0.1 && avgMovement < 0.8 ? 1.0 : avgMovement * 0.5;
  }
  
  private analyzeBlinking(landmarks: faceapi.FaceLandmarks68): number {
    const leftEyeTop = landmarks.positions[37];
    const leftEyeBottom = landmarks.positions[41];
    const rightEyeTop = landmarks.positions[44];
    const rightEyeBottom = landmarks.positions[46];
    
    const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
    const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
    
    const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;
    const isBlink = avgEyeHeight < 3; // Threshold for closed eyes
    
    this.blinkHistory.push(isBlink);
    
    if (this.blinkHistory.length > 30) { // Keep last 30 frames (about 1 second at 30fps)
      this.blinkHistory.shift();
    }
    
    // Count blinks in recent history
    let blinkCount = 0;
    let inBlink = false;
    
    for (const blink of this.blinkHistory) {
      if (blink && !inBlink) {
        blinkCount++;
        inBlink = true;
      } else if (!blink) {
        inBlink = false;
      }
    }
    
    // Natural blink rate is 1-3 blinks in 30 frames
    const blinkRate = blinkCount / (this.blinkHistory.length / 30);
    return blinkRate > 0.5 && blinkRate < 4 ? 1.0 : Math.max(0.3, 1 - Math.abs(blinkRate - 1.5) / 3);
  }
  
  private analyzeExpressionChanges(): number {
    if (this.expressionHistory.length < 3) return 0.5;
    
    const recent = this.expressionHistory.slice(-3);
    let changeScore = 0;
    
    // Look for natural micro-expression changes
    const expressions = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'] as const;
    
    for (const expr of expressions) {
      const values = recent.map(exp => exp[expr]);
      const variance = this.calculateVariance(values);
      changeScore += variance;
    }
    
    // Natural faces show subtle expression changes
    return Math.min(changeScore / 0.1, 1.0);
  }
  
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }
}

/**
 * Screen reflection detection
 * Looks for telltale signs of screen display (pixelation, refresh patterns)
 */
export function detectScreenReflection(video: HTMLVideoElement, landmarks: faceapi.FaceLandmarks68): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  // Sample areas around the eyes (common reflection spots)
  const leftEye = landmarks.positions[39];
  const rightEye = landmarks.positions[42];
  
  let reflectionScore = 0;
  const samplePoints = [leftEye, rightEye];
  
  for (const point of samplePoints) {
    try {
      const x = Math.round(point.x);
      const y = Math.round(point.y);
      const size = 20;
      
      const imageData = ctx.getImageData(
        Math.max(0, x - size/2),
        Math.max(0, y - size/2),
        size,
        size
      );
      
      const pixels = imageData.data;
      
      // Look for unnatural brightness patterns (screen glare)
      let brightPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (brightness > 200) brightPixels++;
        totalPixels++;
      }
      
      const brightnessRatio = brightPixels / totalPixels;
      
      // Natural skin shouldn't have high brightness concentrations
      if (brightnessRatio > 0.3) {
        reflectionScore += 0.5;
      }
      
    } catch (error) {
      console.warn('Screen reflection detection error:', error);
    }
  }
  
  // Return inverted score (lower reflection = higher liveness)
  return Math.max(0, 1 - reflectionScore);
}

/**
 * Multiple face detection prevention
 * Ensures only one face is present during authentication
 */
export function validateSingleFace(detections: FaceDetectionWithLandmarks[]): {
  isValid: boolean;
  faceCount: number;
  confidence: number;
} {
  const faceCount = detections.length;
  
  if (faceCount === 0) {
    return { isValid: false, faceCount, confidence: 0 };
  }
  
  if (faceCount > 1) {
    return { isValid: false, faceCount, confidence: 0 };
  }
  
  // Check face size (should occupy reasonable portion of frame)
  const detection = detections[0].detection;
  const box = detection.box;
  const faceArea = box.width * box.height;
  const frameArea = 640 * 480; // Assuming standard resolution
  const faceRatio = faceArea / frameArea;
  
  // Face should be 5-50% of frame
  const confidence = faceRatio >= 0.05 && faceRatio <= 0.5 ? 1.0 : 0.3;
  
  return {
    isValid: faceCount === 1 && confidence > 0.5,
    faceCount,
    confidence
  };
}

/**
 * Comprehensive anti-spoofing analysis
 * Combines all detection methods for final verdict
 */
export class FaceAntiSpoofingAnalyzer {
  private motionAnalyzer = new MotionAnalyzer();
  
  async analyze(
    video: HTMLVideoElement,
    detections: FaceDetectionWithLandmarks[],
    depthMap?: DepthMapData
  ): Promise<AntiSpoofingResult> {
    
    // Check for single face
    const faceValidation = validateSingleFace(detections);
    if (!faceValidation.isValid) {
      return {
        isLive: false,
        confidence: 0,
        spoofingType: faceValidation.faceCount > 1 ? 'multiple_faces' : undefined,
        details: {
          depthAnalysis: 0,
          textureAnalysis: 0,
          motionAnalysis: 0,
          faceCount: faceValidation.faceCount,
          eyeMovement: 0,
          blinkDetection: 0
        }
      };
    }
    
    const detection = detections[0];
    const landmarks = detection.landmarks;
    const expressions = detection.expressions;
    
    // Perform all analyses
    const depthScore = analyzeDepth(landmarks);
    const textureScore = analyzeTexture(video, landmarks);
    const motionScore = this.motionAnalyzer.analyzeMotion(landmarks, expressions);
    const reflectionScore = detectScreenReflection(video, landmarks);
    
    // Compute 3D depth score if available
    let depth3DScore: number | undefined;
    if (depthMap) {
      depth3DScore = computeDepthAntiSpoofingScore(depthMap);
    }

    // Calculate overall confidence
    // If we have real 3D depth data, weight it heavily
    let overallConfidence: number;
    if (depth3DScore !== undefined) {
      overallConfidence = (
        depth3DScore * 0.5 +        // Real depth gets highest weight
        depthScore * 0.15 +          // Landmark-based depth reduced
        textureScore * 0.15 +
        motionScore * 0.15 +
        reflectionScore * 0.05
      );
    } else {
      // Original weighting without 3D depth
      overallConfidence = (
        depthScore * 0.3 +
        textureScore * 0.25 +
        motionScore * 0.3 +
        reflectionScore * 0.15
      );
    }
    
    // Determine spoofing type based on which test failed most
    let spoofingType: AntiSpoofingResult['spoofingType'];
    if (overallConfidence < 0.6) {
      if (depth3DScore !== undefined && depth3DScore < 0.3) {
        spoofingType = 'photo'; // Flat surface detected by real depth
      } else if (depthScore < 0.3) {
        spoofingType = 'photo';
      } else if (reflectionScore < 0.3) {
        spoofingType = 'screen';
      } else if (motionScore < 0.3) {
        spoofingType = 'video';
      } else {
        spoofingType = 'deepfake';
      }
    }
    
    const isLive = overallConfidence >= 0.6;
    
    return {
      isLive,
      confidence: overallConfidence,
      spoofingType: !isLive ? spoofingType : undefined,
      details: {
        depthAnalysis: depthScore,
        textureAnalysis: textureScore,
        motionAnalysis: motionScore,
        faceCount: faceValidation.faceCount,
        eyeMovement: motionScore, // Simplified for now
        blinkDetection: motionScore, // Simplified for now
        depth3DScore // Include 3D depth score if available
      }
    };
  }
}