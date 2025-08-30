import React, { useRef, useEffect, useState } from 'react';
import { Camera, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { buttonVariants } from './ui/button-variants';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';

interface FaceRecognitionProps {
  onCapture: (imageData: string) => void;
  onVerify?: (verified: boolean) => void;
  mode: 'capture' | 'verify';
}

export function FaceRecognition({ onCapture, onVerify, mode }: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState<'checking' | 'passed' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isStreaming) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isStreaming]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      drawFaceMesh();
    } catch (err) {
      setErrorMessage('Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const drawFaceMesh = () => {
    if (!meshCanvasRef.current || !videoRef.current) return;
    
    const ctx = meshCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const drawLoop = () => {
      if (!isStreaming) return;
      
      ctx.clearRect(0, 0, meshCanvasRef.current!.width, meshCanvasRef.current!.height);
      
      // Simulated face mesh points (in production, use face detection library)
      const points = [
        { x: 320, y: 150 }, // Top center
        { x: 220, y: 200 }, // Left eye
        { x: 420, y: 200 }, // Right eye
        { x: 320, y: 280 }, // Nose
        { x: 270, y: 350 }, // Left mouth
        { x: 370, y: 350 }, // Right mouth
        { x: 320, y: 400 }, // Chin
      ];

      // Draw white mesh lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;

      // Connect points with lines
      ctx.beginPath();
      points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();

      // Draw connection lines for triangulation
      ctx.beginPath();
      ctx.moveTo(points[1].x, points[1].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(points[3].x, points[3].y);
      ctx.lineTo(points[4].x, points[4].y);
      ctx.lineTo(points[5].x, points[5].y);
      ctx.lineTo(points[3].x, points[3].y);
      ctx.stroke();

      requestAnimationFrame(drawLoop);
    };

    drawLoop();
  };

  const performLivenessCheck = async (): Promise<boolean> => {
    setLivenessStatus('checking');
    
    // Simulate liveness detection (in production, use proper AI model)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random success for demo (in production, use actual detection)
    const isLive = Math.random() > 0.3;
    setLivenessStatus(isLive ? 'passed' : 'failed');
    
    if (!isLive) {
      setErrorMessage('⚠️ Fake attempt detected. Please try again with a live face.');
    }
    
    return isLive;
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    // Perform liveness check first
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
      // Simulate verification (in production, use actual face matching)
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
              <p className="text-muted-foreground">Camera is not active</p>
              <Button
                onClick={() => setIsStreaming(true)}
                className={cn(buttonVariants({ variant: "royal" }))}
              >
                Start Camera
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