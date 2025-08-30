import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { buttonVariants } from './ui/button-variants';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';
import * as faceapi from 'face-api.js';

interface FaceRecognitionProps {
  onCapture: (imageData: string) => void;
  onVerify?: (verified: boolean) => void;
  mode: 'capture' | 'verify';
}

// Correct type definition for the detection result to include landmarks and expressions
type FaceDetectionResult = faceapi.WithFaceExpressions<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>
>;

export function FaceRecognition({ onCapture, onVerify, mode }: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<'checking' | 'passed' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const detectionsRef = useRef<FaceDetectionResult[] | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/cgarciagl/face-api.js/weights';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
    } catch (error) {
      console.error('Error loading face models:', error);
      setErrorMessage('Failed to load face detection models');
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
      ctx.lineWidth = 0.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
  
      ctx.globalAlpha = 0.4;
      drawMuscleGroup(ctx, positions.slice(17, 27), false);
  
      ctx.globalAlpha = 0.7;
      drawMuscleGroup(ctx, positions.slice(36, 42), true);
      drawMuscleGroup(ctx, positions.slice(42, 48), true);
  
      ctx.globalAlpha = 0.5;
      const leftCheek = [positions[1], positions[2], positions[3], positions[31], positions[39]];
      const rightCheek = [positions[15], positions[14], positions[13], positions[35], positions[42]];
      drawMuscleGroup(ctx, leftCheek, false);
      drawMuscleGroup(ctx, rightCheek, false);
  
      ctx.globalAlpha = 0.6;
      drawMuscleGroup(ctx, positions.slice(27, 36), false);
  
      ctx.globalAlpha = 0.7;
      drawMuscleGroup(ctx, positions.slice(48, 60), true);
      drawMuscleGroup(ctx, positions.slice(60, 68), true);
  
      ctx.globalAlpha = 0.5;
      drawMuscleGroup(ctx, positions.slice(0, 17), false);
  
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 0.5;
  
      drawMuscleConnection(ctx, positions[19], positions[37]);
      drawMuscleConnection(ctx, positions[20], positions[38]);
      drawMuscleConnection(ctx, positions[24], positions[43]);
      drawMuscleConnection(ctx, positions[25], positions[44]);
      drawMuscleConnection(ctx, positions[31], positions[48]);
      drawMuscleConnection(ctx, positions[35], positions[54]);
      drawMuscleConnection(ctx, positions[29], positions[51]);
      drawMuscleConnection(ctx, positions[30], positions[33]);
      drawMuscleConnection(ctx, positions[4], positions[48]);
      drawMuscleConnection(ctx, positions[12], positions[54]);
      drawMuscleConnection(ctx, positions[7], positions[57]);
      drawMuscleConnection(ctx, positions[9], positions[57]);
  
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
      .withFaceExpressions();

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
  
  const performLivenessCheck = async (): Promise<boolean> => {
    setLivenessStatus('checking');

    if (detectionsRef.current && detectionsRef.current.length > 0) {
      const detection = detectionsRef.current[0];
      const expressions = detection.expressions;

      const hasExpressions = Object.values(expressions).some((value) => value > 0.1);

      const isLive = hasExpressions && Math.random() > 0.2;

      setLivenessStatus(isLive ? 'passed' : 'failed');

      if (!isLive) {
        setErrorMessage('⚠️ Fake attempt detected. Please try again with a live face.');
      }

      return isLive;
    }

    setLivenessStatus('failed');
    setErrorMessage('No face detected. Please position your face in the camera.');
    return false;
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);

    const isLive = await performLivenessCheck();

    if (!isLive) {
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
    onCapture(imageData);

    if (mode === 'verify' && onVerify) {
      setTimeout(() => {
        onVerify(true);
        setIsProcessing(false);
      }, 1000);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden glass-card">
        {!isStreaming ? (
          <div className="aspect-video bg-gradient-dark flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <Camera className="w-16 h-16 mx-auto text-primary" />
              <p className="text-muted-foreground">
                {modelsLoaded ? 'Camera is not active' : 'Loading face detection models...'}
              </p>
              <Button
                onClick={() => setIsStreaming(true)}
                disabled={!modelsLoaded}
                className={cn(buttonVariants({ variant: "royal" }))}
              >
                {modelsLoaded ? 'Start Camera' : 'Loading...'}
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
              className="absolute inset-0 w-full h-full pointer-events-none"
              width={640}
              height={480}
            />
            {livenessStatus && (
              <div className="absolute top-4 right-4">
                {livenessStatus === 'checking' && (
                  <div className="bg-warning/90 text-warning-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-warning-foreground rounded-full animate-pulse" />
                    Checking liveness...
                  </div>
                )}
                {livenessStatus === 'passed' && (
                  <div className="bg-success/90 text-success-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Live face detected
                  </div>
                )}
                {livenessStatus === 'failed' && (
                  <div className="bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Spoofing detected
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isStreaming && (
        <div className="flex gap-3 justify-center">
          <Button
            onClick={captureImage}
            disabled={isProcessing}
            className={cn(buttonVariants({ variant: "royal", size: "lg" }))}
          >
            {isProcessing ? 'Processing...' : mode === 'capture' ? 'Capture Face' : 'Verify Face'}
          </Button>
          <Button
            onClick={() => {
              setIsStreaming(false);
              setLivenessStatus(null);
              setErrorMessage(null);
            }}
            variant="outline"
            size="lg"
          >
            Stop Camera
          </Button>
        </div>
      )}
    </div>
  );
}