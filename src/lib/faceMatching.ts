/**
 * Face Matching Library
 * Provides face descriptor computation and comparison using face-api.js
 * for biometric attendance verification
 */

import * as faceapi from 'face-api.js';

export interface FaceDescriptor {
  descriptor: Float32Array;
  algorithm: string;
  confidence: number;
  timestamp: string;
}

export interface FaceMatchResult {
  match: boolean;
  similarityScore: number;
  distance: number;
  message: string;
}

/**
 * Compute face descriptor from an image
 * Uses face-api.js to compute a 128-dimensional face embedding
 * 
 * @param imageElement - HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement
 * @returns Face descriptor or null if face detection failed
 */
export async function computeFaceDescriptor(
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDescriptor | null> {
  try {
    // Detect single face with landmarks and descriptor
    const detection = await faceapi
      .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.error('No face detected in image');
      return null;
    }

    // Extract the 128-dimensional descriptor
    const descriptor = detection.descriptor;

    return {
      descriptor,
      algorithm: 'face-api.js-facenet',
      confidence: detection.detection.score,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error computing face descriptor:', error);
    return null;
  }
}

/**
 * Compute face descriptor from base64 image data
 * 
 * @param imageDataUrl - Base64 encoded image data URL
 * @returns Face descriptor or null if failed
 */
export async function computeFaceDescriptorFromDataUrl(
  imageDataUrl: string
): Promise<FaceDescriptor | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        const descriptor = await computeFaceDescriptor(img);
        resolve(descriptor);
      } catch (error) {
        console.error('Error processing image:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image');
      resolve(null);
    };
    
    img.src = imageDataUrl;
  });
}

/**
 * Compare two face descriptors using Euclidean distance
 * Lower distance = more similar faces
 * 
 * @param descriptor1 - First face descriptor
 * @param descriptor2 - Second face descriptor
 * @returns Face match result with similarity score
 */
export function compareFaceDescriptors(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[],
  threshold: number = 0.6
): FaceMatchResult {
  try {
    // Convert to Float32Array if needed
    const desc1 = descriptor1 instanceof Float32Array 
      ? descriptor1 
      : new Float32Array(descriptor1);
    const desc2 = descriptor2 instanceof Float32Array 
      ? descriptor2 
      : new Float32Array(descriptor2);

    // Calculate Euclidean distance
    const distance = faceapi.euclideanDistance(desc1, desc2);
    
    // Convert to similarity score (0-1 range, higher is better)
    // Euclidean distance typically ranges from 0 to ~1.2 for faces
    // We normalize and invert it to get similarity
    const similarityScore = Math.max(0, 1 - distance);
    
    // Determine if faces match based on threshold
    const match = similarityScore >= threshold;
    
    // Generate descriptive message
    let message: string;
    if (match) {
      message = `Face match confirmed (${Math.round(similarityScore * 100)}% similarity)`;
    } else {
      message = `Face mismatch detected (${Math.round(similarityScore * 100)}% similarity, threshold: ${Math.round(threshold * 100)}%)`;
    }

    return {
      match,
      similarityScore,
      distance,
      message,
    };
  } catch (error) {
    console.error('Error comparing face descriptors:', error);
    return {
      match: false,
      similarityScore: 0,
      distance: Infinity,
      message: 'Error comparing face descriptors',
    };
  }
}

/**
 * Serialize face descriptor to JSON array for database storage
 * 
 * @param descriptor - Face descriptor
 * @returns JSON-serializable array
 */
export function serializeFaceDescriptor(descriptor: FaceDescriptor): number[] {
  return Array.from(descriptor.descriptor);
}

/**
 * Deserialize face descriptor from JSON array
 * 
 * @param descriptorArray - Array of numbers from database
 * @param algorithm - Algorithm used to compute descriptor
 * @returns Face descriptor
 */
export function deserializeFaceDescriptor(
  descriptorArray: number[],
  algorithm: string
): FaceDescriptor {
  return {
    descriptor: new Float32Array(descriptorArray),
    algorithm,
    confidence: 1.0, // We don't store confidence for registered embeddings
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate face descriptor
 * Ensures descriptor is valid before storage or comparison
 * 
 * @param descriptor - Face descriptor to validate
 * @returns true if valid, false otherwise
 */
export function validateFaceDescriptor(descriptor: FaceDescriptor | null): boolean {
  if (!descriptor) {
    return false;
  }

  // face-api.js uses 128-dimensional descriptors
  if (descriptor.descriptor.length !== 128) {
    console.error(`Invalid descriptor length: ${descriptor.descriptor.length}, expected 128`);
    return false;
  }

  // Check if descriptor contains valid numbers
  for (let i = 0; i < descriptor.descriptor.length; i++) {
    if (isNaN(descriptor.descriptor[i]) || !isFinite(descriptor.descriptor[i])) {
      console.error('Descriptor contains invalid values');
      return false;
    }
  }

  // Check confidence score
  if (descriptor.confidence < 0.3) {
    console.error(`Low confidence score: ${descriptor.confidence}`);
    return false;
  }

  return true;
}

/**
 * Calculate average descriptor from multiple face images
 * Useful for creating more robust face embeddings from multiple captures
 * 
 * @param descriptors - Array of face descriptors
 * @returns Averaged face descriptor or null if input is invalid
 */
export function averageFaceDescriptors(
  descriptors: FaceDescriptor[]
): FaceDescriptor | null {
  if (descriptors.length === 0) {
    return null;
  }

  if (descriptors.length === 1) {
    return descriptors[0];
  }

  // Initialize averaged descriptor
  const avgDescriptor = new Float32Array(128);
  avgDescriptor.fill(0);

  // Sum all descriptors
  for (const desc of descriptors) {
    for (let i = 0; i < 128; i++) {
      avgDescriptor[i] += desc.descriptor[i];
    }
  }

  // Divide by count to get average
  for (let i = 0; i < 128; i++) {
    avgDescriptor[i] /= descriptors.length;
  }

  // Calculate average confidence
  const avgConfidence = descriptors.reduce((sum, d) => sum + d.confidence, 0) / descriptors.length;

  return {
    descriptor: avgDescriptor,
    algorithm: descriptors[0].algorithm,
    confidence: avgConfidence,
    timestamp: new Date().toISOString(),
  };
}
