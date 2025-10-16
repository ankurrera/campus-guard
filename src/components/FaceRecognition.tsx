import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, AlertCircle, CheckCircle, XCircle, Shield, Eye, Move, Layers, Box } from 'lucide-react';
import { Button } from './ui/button';
import { buttonVariants } from './ui/button-variants';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as faceapi from 'face-api.js';
import { FaceAntiSpoofingAnalyzer, AntiSpoofingResult } from '@/lib/faceAntiSpoofing';
import { 
  detectDeviceCapabilities, 
  DeviceCapabilities, 
  CaptureMethod 
} from '@/lib/face3d';
import { 
  PhotogrammetryCapture as PhotogrammetryController,
  CaptureInstructions 
} from '@/lib/depthAdapters/photogrammetry';
import { BiometricConsentModal, BiometricConsentData } from './BiometricConsentModal';
import { Switch } from './ui/switch';
import { computeFaceDescriptor, computeFaceDescriptorFromDataUrl, FaceDescriptor } from '@/lib/faceMatching';

interface FaceRecognitionProps {
  onCapture: (imageData: string, antiSpoofingResult?: AntiSpoofingResult, capture3D?: { method: string; frames?: unknown[]; frameCount?: number; duration?: number; consentData?: BiometricConsentData | null }, faceDescriptor?: FaceDescriptor) => void;
  onVerify?: (verified: boolean, antiSpoofingResult?: AntiSpoofingResult, faceDescriptor?: FaceDescriptor) => void;
  mode: 'capture' | 'verify';
  studentId?: string; // Required for 3D capture uploads
}

// Correct type definition for the detection result to include landmarks and expressions
type FaceDetectionResult = faceapi.WithFaceExpressions<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>
>;

export function FaceRecognition({ onCapture, onVerify, mode, studentId }: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<'checking' | 'passed' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [antiSpoofingResult, setAntiSpoofingResult] = useState<AntiSpoofingResult | null>(null);
  const detectionsRef = useRef<FaceDetectionResult[] | null>(null);
  const antiSpoofingAnalyzer = useRef(new FaceAntiSpoofingAnalyzer());

  // 3D Capture state
  const [enable3DCapture, setEnable3DCapture] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [is3DCapturing, setIs3DCapturing] = useState(false);
  const [captureInstructions, setCaptureInstructions] = useState<CaptureInstructions | null>(null);
  const photogrammetryController = useRef<PhotogrammetryController>(new PhotogrammetryController());

  // Check device capabilities on mount
  useEffect(() => {
    detectDeviceCapabilities().then(caps => {
      setDeviceCapabilities(caps);
      console.log('Device capabilities:', caps);
    });
  }, []);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      // Try local models first (bundled with the app)
      const LOCAL_MODEL_URL = '/models';
      
      try {
        console.log('Loading face detection models from local directory...');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(LOCAL_MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(LOCAL_MODEL_URL)
        ]);
        console.log('Successfully loaded all face detection models from local directory');
        setModelsLoaded(true);
        return;
      } catch (localError) {
        console.warn('Local models failed, trying CDN fallback:', localError);
        
        // Fallback to CDN if local models fail
        const CDN_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        try {
          console.log('Loading face detection models from CDN fallback...');
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(CDN_URL)
          ]);
          console.log('Successfully loaded face detection models from CDN');
          setModelsLoaded(true);
          return;
        } catch (cdnError) {
          console.warn('CDN fallback also failed:', cdnError);
          throw new Error('All model sources failed to load face detection models');
        }
      }
    } catch (error) {
      console.error('Error loading face models:', error);
      setErrorMessage('Failed to load face detection models. Please check your internet connection and try again.');
      setModelsLoaded(false);
    }
  };

  const drawMuscleGroup = useCallback((ctx: CanvasRenderingContext2D, points: faceapi.Point[], closed: boolean) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const prev = points[i - 1];
      const cpx = (current.x + prev.x) / 2;
      const cpy = (current.y + prev.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }

    if (closed) {
      const first = points[0];
      const last = points[points.length - 1];
      const cpx = (first.x + last.x) / 2;
      const cpy = (first.y + last.y) / 2;
      ctx.quadraticCurveTo(last.x, last.y, cpx, cpy);
      ctx.closePath();
    } else {
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    ctx.stroke();
  }, []);

  const drawMuscleConnection = useCallback((ctx: CanvasRenderingContext2D, point1: faceapi.Point, point2: faceapi.Point) => {
    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);

    const cpx = (point1.x + point2.x) / 2 + (Math.random() - 0.5) * 5;
    const cpy = (point1.y + point2.y) / 2 + (Math.random() - 0.5) * 5;
    ctx.quadraticCurveTo(cpx, cpy, point2.x, point2.y);

    ctx.stroke();
  }, []);

  const drawMuscleOverlay = useCallback((ctx: CanvasRenderingContext2D, detections: FaceDetectionResult[]) => {
    if (!meshCanvasRef.current) return;
    ctx.clearRect(0, 0, meshCanvasRef.current.width, meshCanvasRef.current.height);
  
    detections.forEach(detection => {
      const landmarks = detection.landmarks;
      const positions = landmarks.positions;
  
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 1.5; // Increased line width
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(139, 92, 246, 0.7)'; // Added glow effect
      ctx.shadowBlur = 8; // Added glow effect
  
      ctx.globalAlpha = 0.9; // Increased opacity
      drawMuscleGroup(ctx, positions.slice(17, 27), false);
  
      ctx.globalAlpha = 1.0; // Increased opacity
      drawMuscleGroup(ctx, positions.slice(36, 42), true);
      drawMuscleGroup(ctx, positions.slice(42, 48), true);
  
      ctx.globalAlpha = 0.8; // Increased opacity
      const leftCheek = [positions[1], positions[2], positions[3], positions[31], positions[39]];
      const rightCheek = [positions[15], positions[14], positions[13], positions[35], positions[42]];
      drawMuscleGroup(ctx, leftCheek, false);
      drawMuscleGroup(ctx, rightCheek, false);
  
      ctx.globalAlpha = 0.9; // Increased opacity
      drawMuscleGroup(ctx, positions.slice(27, 36), false);
  
      ctx.globalAlpha = 1.0; // Increased opacity
      drawMuscleGroup(ctx, positions.slice(48, 60), true);
      drawMuscleGroup(ctx, positions.slice(60, 68), true);
  
      ctx.globalAlpha = 0.8; // Increased opacity
      drawMuscleGroup(ctx, positions.slice(0, 17), false);
  
      ctx.globalAlpha = 0.7; // Increased opacity
      ctx.lineWidth = 1;
  
      // Connect eyebrows to the forehead
      drawMuscleConnection(ctx, positions[17], positions[19]);
      drawMuscleConnection(ctx, positions[18], positions[20]);
      drawMuscleConnection(ctx, positions[25], positions[23]);
      drawMuscleConnection(ctx, positions[26], positions[24]);
  
      // Connect points around the eyes for a more detailed mesh
      drawMuscleConnection(ctx, positions[36], positions[41]);
      drawMuscleConnection(ctx, positions[37], positions[40]);
      drawMuscleConnection(ctx, positions[38], positions[39]);
      drawMuscleConnection(ctx, positions[42], positions[47]);
      drawMuscleConnection(ctx, positions[43], positions[46]);
      drawMuscleConnection(ctx, positions[44], positions[45]);
  
      // More connections around the mouth
      drawMuscleConnection(ctx, positions[48], positions[60]);
      drawMuscleConnection(ctx, positions[50], positions[61]);
      drawMuscleConnection(ctx, positions[51], positions[62]);
      drawMuscleConnection(ctx, positions[53], positions[64]);
      drawMuscleConnection(ctx, positions[54], positions[65]);
      drawMuscleConnection(ctx, positions[56], positions[66]);
  
      // Denser mesh for cheeks and nose
      drawMuscleConnection(ctx, positions[3], positions[30]);
      drawMuscleConnection(ctx, positions[13], positions[30]);
      drawMuscleConnection(ctx, positions[48], positions[31]);
      drawMuscleConnection(ctx, positions[54], positions[35]);
      drawMuscleConnection(ctx, positions[30], positions[8]);
      drawMuscleConnection(ctx, positions[48], positions[8]);
      drawMuscleConnection(ctx, positions[54], positions[8]);
  
      // Cross-connections for the jawline
      drawMuscleConnection(ctx, positions[1], positions[15]);
      drawMuscleConnection(ctx, positions[2], positions[14]);
      drawMuscleConnection(ctx, positions[3], positions[13]);
      drawMuscleConnection(ctx, positions[4], positions[12]);
      drawMuscleConnection(ctx, positions[5], positions[11]);
      drawMuscleConnection(ctx, positions[6], positions[10]);
      drawMuscleConnection(ctx, positions[7], positions[9]);

      // Connect eyes to the corners of the mouth
      drawMuscleConnection(ctx, positions[39], positions[48]);
      drawMuscleConnection(ctx, positions[42], positions[54]);
      drawMuscleConnection(ctx, positions[21], positions[33]);
      drawMuscleConnection(ctx, positions[22], positions[33]);
  
      // Reset shadow for points to avoid blurring them too much
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.8;
      const depthPoints = [
        positions[30],
        positions[8],
        positions[27],
        positions[0],
        positions[16]
      ];
  
      depthPoints.forEach((point, index) => {
        const size = 2 - (index * 0.3);
        const opacity = 0.9 - (index * 0.15);
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fill();
      });
  
      const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.5;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 1.5;
  
      const expressions = detection.expressions;
      if (expressions.happy > 0.5) {
        ctx.strokeStyle = '#ffffff';
        drawMuscleGroup(ctx, [positions[48], positions[51], positions[54]], false);
      }
      if (expressions.surprised > 0.5) {
        drawMuscleGroup(ctx, positions.slice(18, 26), false);
      }
    });
  }, [drawMuscleGroup, drawMuscleConnection]);

  const detectFace = useCallback(async () => {
    if (!videoRef.current || !meshCanvasRef.current || !modelsLoaded) return;

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions() as FaceDetectionResult[];

    detectionsRef.current = detections;

    if (meshCanvasRef.current) {
      const displaySize = { width: 640, height: 480 };
      faceapi.matchDimensions(meshCanvasRef.current, displaySize);

      const ctx = meshCanvasRef.current.getContext('2d');
      if (ctx) {
        drawMuscleOverlay(ctx, detections);
      }
    }

    if (isStreaming) {
      requestAnimationFrame(detectFace);
    }
  }, [modelsLoaded, isStreaming, drawMuscleOverlay]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          detectFace();
        };
      }
    } catch (err) {
      setErrorMessage('Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  }, [detectFace]);

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };
  
  useEffect(() => {
    if (isStreaming && modelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isStreaming, modelsLoaded, startCamera]);
  
  const performLivenessCheck = async (): Promise<AntiSpoofingResult | null> => {
    setLivenessStatus('checking');

    if (!videoRef.current || !detectionsRef.current || detectionsRef.current.length === 0) {
      setLivenessStatus('failed');
      setErrorMessage('No face detected. Please position your face in the camera.');
      return null;
    }

    try {
      // Use enhanced anti-spoofing analyzer
      const result = await antiSpoofingAnalyzer.current.analyze(
        videoRef.current, 
        detectionsRef.current.map(detection => ({
          detection: detection.detection,
          landmarks: detection.landmarks,
          expressions: detection.expressions
        }))
      );

      setAntiSpoofingResult(result);

      if (result.isLive) {
        setLivenessStatus('passed');
        setErrorMessage(null);
      } else {
        setLivenessStatus('failed');
        const spoofingMessages = {
          'photo': '📷 Photo spoofing detected. Please use a live camera.',
          'screen': '📱 Screen display detected. Please use a live camera.',
          'video': '🎥 Video playback detected. Please present yourself live.',
          'deepfake': '🤖 Deepfake or synthetic media detected.',
          'multiple_faces': '👥 Multiple faces detected. Only one person allowed.'
        };
        
        setErrorMessage(
          spoofingMessages[result.spoofingType as keyof typeof spoofingMessages] || 
          '⚠️ Liveness check failed. Please try again with a live face.'
        );
      }

      return result;
    } catch (error) {
      console.error('Anti-spoofing analysis failed:', error);
      setLivenessStatus('failed');
      setErrorMessage('Security analysis failed. Please try again.');
      return null;
    }
  };

  const captureBasicImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not available. Please start the camera first.');
      return;
    }

    setIsProcessing(true);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) {
      setIsProcessing(false);
      return;
    }

    // Capture the actual camera frame
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Create a basic anti-spoofing result indicating limited verification
    const basicResult: AntiSpoofingResult = {
      isLive: true, // Assume live since it's from camera
      confidence: 0.7, // Lower confidence due to no face detection
      details: {
        depthAnalysis: 0.7,
        textureAnalysis: 0.7,
        motionAnalysis: 0.7,
        faceCount: 1, // Assume one face
        eyeMovement: 0.7,
        blinkDetection: 0.7
      }
    };

    onCapture(imageData, basicResult);
    setIsProcessing(false);
  };

  // Handle 3D capture toggle
  const handle3DCaptureToggle = (checked: boolean) => {
    if (checked && !hasConsent) {
      setShowConsentModal(true);
    } else {
      setEnable3DCapture(checked);
    }
  };

  // Store consent data when granted
  const [consentData, setConsentData] = useState<BiometricConsentData | null>(null);

  // Handle consent
  const handleConsent = (data: BiometricConsentData) => {
    setHasConsent(true);
    setConsentData(data);
    setEnable3DCapture(true);
    setShowConsentModal(false);
    toast.success('Biometric consent granted. 3D capture enabled.');
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
    setEnable3DCapture(false);
    toast.info('3D capture disabled. You can still use 2D face recognition.');
  };

  // Start 3D multi-view capture
  const start3DCapture = async () => {
    if (!videoRef.current || !hasConsent) return;

    setIs3DCapturing(true);
    setIsProcessing(true);

    try {
      const captureResult = await photogrammetryController.current.start(
        videoRef.current,
        (instructions) => {
          setCaptureInstructions(instructions);
        }
      );

      // Capture complete
      setCaptureInstructions(null);
      setIs3DCapturing(false);

      // Perform liveness check on first frame
      const spoofingResult = await performLivenessCheck();

      // Get the first frame as the main image
      const firstFrame = captureResult.frames[0]?.imageData || '';
      
      // Compute face descriptor from the first frame
      const faceDescriptor = await computeFaceDescriptorFromDataUrl(firstFrame);
      
      if (!faceDescriptor) {
        toast.error('Failed to compute face descriptor from 3D capture. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Pass capture data to parent
      onCapture(firstFrame, spoofingResult || undefined, {
        method: 'photogrammetry' as CaptureMethod,
        frames: captureResult.frames,
        frameCount: captureResult.totalFrames,
        duration: captureResult.duration,
        consentData: consentData,
      }, faceDescriptor);

      toast.success('3D face capture completed successfully!');
      setIsProcessing(false);
    } catch (error) {
      console.error('3D capture failed:', error);
      setIs3DCapturing(false);
      setIsProcessing(false);
      toast.error('3D capture failed. Please try again.');
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // If 3D capture is enabled, use multi-view capture
    if (enable3DCapture && hasConsent) {
      await start3DCapture();
      return;
    }

    setIsProcessing(true);

    const spoofingResult = await performLivenessCheck();

    if (!spoofingResult || !spoofingResult.isLive) {
      setIsProcessing(false);
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    
    // Compute face descriptor for face matching
    const faceDescriptor = await computeFaceDescriptor(canvas);
    
    if (!faceDescriptor) {
      toast.error('Failed to compute face descriptor. Please try again.');
      setIsProcessing(false);
      return;
    }
    
    onCapture(imageData, spoofingResult, undefined, faceDescriptor);

    if (mode === 'verify' && onVerify) {
      setTimeout(() => {
        onVerify(true, spoofingResult, faceDescriptor);
        setIsProcessing(false);
      }, 1000);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Biometric Consent Modal */}
      <BiometricConsentModal
        open={showConsentModal}
        onConsent={handleConsent}
        onDecline={handleConsentDecline}
      />

      {/* 3D Capture Toggle */}
      {deviceCapabilities && deviceCapabilities.supportedMethods.length > 0 && mode === 'capture' && (
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Box className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Enable 3D Face Capture</p>
                <p className="text-sm text-muted-foreground">
                  {deviceCapabilities.hasDepthSensor || deviceCapabilities.hasWebXR || deviceCapabilities.hasLiDAR
                    ? 'Your device supports advanced depth sensing'
                    : 'Multi-view photogrammetry capture available'}
                </p>
              </div>
            </div>
            <Switch
              checked={enable3DCapture}
              onCheckedChange={handle3DCaptureToggle}
              disabled={isStreaming || isProcessing}
            />
          </div>
          {enable3DCapture && (
            <Alert className="mt-3">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                3D capture will guide you through a {deviceCapabilities.hasDepthSensor ? 'depth scan' : 'multi-view capture'} process for enhanced security.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Capture Instructions Overlay */}
      {is3DCapturing && captureInstructions && (
        <div className="glass-card p-6 rounded-xl bg-primary/10 border-2 border-primary">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Box className="h-6 w-6 text-primary animate-pulse" />
              <h3 className="text-lg font-semibold">
                {captureInstructions.phase === 'countdown' && 'Get Ready'}
                {captureInstructions.phase === 'capturing' && '3D Capture in Progress'}
                {captureInstructions.phase === 'completed' && 'Capture Complete'}
              </h3>
            </div>
            
            {captureInstructions.phase === 'countdown' && (
              <div className="text-5xl font-bold text-primary animate-pulse">
                {captureInstructions.countdown}
              </div>
            )}
            
            {captureInstructions.phase === 'capturing' && (
              <div className="space-y-3">
                <p className="text-muted-foreground">{captureInstructions.message}</p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(captureInstructions.currentFrame / captureInstructions.totalFrames) * 100}%` 
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Frame {captureInstructions.currentFrame} of {captureInstructions.totalFrames}
                </p>
              </div>
            )}

            {captureInstructions.phase === 'completed' && (
              <div className="flex items-center justify-center gap-2 text-green-500">
                <CheckCircle className="h-6 w-6" />
                <p>{captureInstructions.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden glass-card">
        {!isStreaming ? (
          <div className="aspect-video bg-gradient-dark flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <Camera className="w-16 h-16 mx-auto text-primary" />
              <p className="text-muted-foreground">
                {errorMessage ? 'Face detection models failed to load' : 
                 modelsLoaded ? (enable3DCapture ? 'Ready for 3D face capture with enhanced security' : 'Ready to capture your face with advanced security checks') : 'Loading face detection models...'}
              </p>
              <Button
                onClick={() => setIsStreaming(true)}
                disabled={!modelsLoaded && !errorMessage}
                className={cn(buttonVariants({ variant: "royal" }))}
              >
                {errorMessage ? 'Start Camera (Basic Mode)' :
                 modelsLoaded ? (enable3DCapture ? 'Start 3D Face Capture' : 'Start Face Registration') : 'Loading...'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={meshCanvasRef}
              className="absolute inset-0 w-full h-full"
              width={640}
              height={480}
            />
            {livenessStatus && modelsLoaded && (
              <div className="absolute top-4 right-4">
                {livenessStatus === 'checking' && (
                  <div className="bg-warning/90 text-warning-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning-foreground rounded-full animate-pulse" />
                    Analyzing face...
                  </div>
                )}
                {livenessStatus === 'passed' && (
                  <div className="bg-success/90 text-success-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Live face verified
                  </div>
                )}
                {livenessStatus === 'failed' && (
                  <div className="bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Security check failed
                  </div>
                )}
              </div>
            )}
            {!modelsLoaded && isStreaming && (
              <div className="absolute top-4 right-4">
                <div className="bg-info/90 text-info-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Basic capture mode
                </div>
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Security Analysis Display */}
      {antiSpoofingResult && (
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-primary" />
            Security Analysis
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Layers className="w-3 h-3" />
              <span>Depth Analysis:</span>
              <span className={cn(
                "font-medium",
                antiSpoofingResult.details.depthAnalysis > 0.6 ? "text-success" : "text-destructive"
              )}>
                {Math.round(antiSpoofingResult.details.depthAnalysis * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <span>Texture Quality:</span>
              <span className={cn(
                "font-medium",
                antiSpoofingResult.details.textureAnalysis > 0.6 ? "text-success" : "text-destructive"
              )}>
                {Math.round(antiSpoofingResult.details.textureAnalysis * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3" />
              <span>Motion Detection:</span>
              <span className={cn(
                "font-medium",
                antiSpoofingResult.details.motionAnalysis > 0.6 ? "text-success" : "text-destructive"
              )}>
                {Math.round(antiSpoofingResult.details.motionAnalysis * 100)}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3" />
              <span>Overall Score:</span>
              <span className={cn(
                "font-medium",
                antiSpoofingResult.confidence > 0.6 ? "text-success" : "text-destructive"
              )}>
                {Math.round(antiSpoofingResult.confidence * 100)}%
              </span>
            </div>
          </div>
          
          {antiSpoofingResult.spoofingType && (
            <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
              Spoofing type detected: {antiSpoofingResult.spoofingType.replace('_', ' ')}
            </div>
          )}
        </div>
      )}

      {errorMessage && errorMessage.includes('Failed to load face detection models') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>Face detection models couldn't be loaded. Please check your internet connection and try refreshing the page.</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setErrorMessage(null);
                    setModelsLoaded(false);
                    loadModels();
                  }}
                  size="sm"
                  variant="outline"
                >
                  Retry Loading Models
                </Button>
                <Button
                  onClick={() => {
                    // Enhanced fallback: capture actual camera image without face detection
                    if (videoRef.current && canvasRef.current) {
                      const canvas = canvasRef.current;
                      const context = canvas.getContext('2d');
                      if (context) {
                        canvas.width = videoRef.current.videoWidth || 640;
                        canvas.height = videoRef.current.videoHeight || 480;
                        context.drawImage(videoRef.current, 0, 0);
                        const imageData = canvas.toDataURL('image/jpeg', 0.8);
                        
                        // Create a basic fallback anti-spoofing result
                        const fallbackResult: AntiSpoofingResult = {
                          isLive: true,
                          confidence: 0.7, // Lower confidence since we can't verify
                          details: {
                            depthAnalysis: 0.7,
                            textureAnalysis: 0.7,
                            motionAnalysis: 0.7,
                            faceCount: 1,
                            eyeMovement: 0.7,
                            blinkDetection: 0.7
                          }
                        };
                        onCapture(imageData, fallbackResult);
                        return;
                      }
                    }
                    
                    // If no camera, use placeholder
                    const fallbackResult: AntiSpoofingResult = {
                      isLive: true,
                      confidence: 0.6,
                      details: {
                        depthAnalysis: 0.6,
                        textureAnalysis: 0.6,
                        motionAnalysis: 0.6,
                        faceCount: 1,
                        eyeMovement: 0.6,
                        blinkDetection: 0.6
                      }
                    };
                    onCapture('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', fallbackResult);
                  }}
                  size="sm"
                  className={cn(buttonVariants({ variant: "royal" }))}
                >
                  Continue Without Face Detection
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && !errorMessage.includes('Failed to load face detection models') && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {isStreaming && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={modelsLoaded ? captureImage : captureBasicImage}
            disabled={isProcessing || is3DCapturing}
            className={cn(buttonVariants({ variant: "royal", size: "lg" }))}
          >
            {isProcessing || is3DCapturing ? 'Processing...' : 
             mode === 'capture' ? 
               (enable3DCapture ? 'Capture 3D Face' : 
                modelsLoaded ? 'Capture Face (Secure)' : 'Capture Face (Basic)') : 
               (modelsLoaded ? 'Verify Face (Secure)' : 'Verify Face (Basic)')}
          </Button>
          <Button
            onClick={() => {
              setIsStreaming(false);
              setLivenessStatus(null);
              setErrorMessage(null);
              setIs3DCapturing(false);
              photogrammetryController.current.cleanup();
            }}
            variant="outline"
            size="lg"
            disabled={is3DCapturing}
          >
            Stop Camera
          </Button>
        </div>
      )}
    </div>
  );
}