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

    let animationTime = 0;
    const facePoints: any = {};
    
    // Initialize facial landmark points with more detail
    const initializeFacePoints = () => {
      const centerX = 320;
      const centerY = 240;
      
      // Forehead points
      facePoints.forehead = [
        { x: centerX - 80, y: centerY - 120, vx: 0, vy: 0 },
        { x: centerX - 40, y: centerY - 125, vx: 0, vy: 0 },
        { x: centerX, y: centerY - 130, vx: 0, vy: 0 },
        { x: centerX + 40, y: centerY - 125, vx: 0, vy: 0 },
        { x: centerX + 80, y: centerY - 120, vx: 0, vy: 0 },
      ];
      
      // Eyebrow points
      facePoints.leftEyebrow = [
        { x: centerX - 90, y: centerY - 70, vx: 0, vy: 0 },
        { x: centerX - 70, y: centerY - 75, vx: 0, vy: 0 },
        { x: centerX - 50, y: centerY - 70, vx: 0, vy: 0 },
      ];
      facePoints.rightEyebrow = [
        { x: centerX + 50, y: centerY - 70, vx: 0, vy: 0 },
        { x: centerX + 70, y: centerY - 75, vx: 0, vy: 0 },
        { x: centerX + 90, y: centerY - 70, vx: 0, vy: 0 },
      ];
      
      // Eye contour points
      facePoints.leftEye = [
        { x: centerX - 80, y: centerY - 40, vx: 0, vy: 0 },
        { x: centerX - 70, y: centerY - 45, vx: 0, vy: 0 },
        { x: centerX - 60, y: centerY - 40, vx: 0, vy: 0 },
        { x: centerX - 70, y: centerY - 35, vx: 0, vy: 0 },
      ];
      facePoints.rightEye = [
        { x: centerX + 60, y: centerY - 40, vx: 0, vy: 0 },
        { x: centerX + 70, y: centerY - 45, vx: 0, vy: 0 },
        { x: centerX + 80, y: centerY - 40, vx: 0, vy: 0 },
        { x: centerX + 70, y: centerY - 35, vx: 0, vy: 0 },
      ];
      
      // Nose bridge and tip
      facePoints.nose = [
        { x: centerX, y: centerY - 30, vx: 0, vy: 0 },
        { x: centerX, y: centerY, vx: 0, vy: 0 },
        { x: centerX - 15, y: centerY + 20, vx: 0, vy: 0 },
        { x: centerX, y: centerY + 25, vx: 0, vy: 0 },
        { x: centerX + 15, y: centerY + 20, vx: 0, vy: 0 },
      ];
      
      // Cheek muscle points
      facePoints.leftCheek = [
        { x: centerX - 100, y: centerY, vx: 0, vy: 0 },
        { x: centerX - 90, y: centerY + 30, vx: 0, vy: 0 },
        { x: centerX - 80, y: centerY + 60, vx: 0, vy: 0 },
      ];
      facePoints.rightCheek = [
        { x: centerX + 100, y: centerY, vx: 0, vy: 0 },
        { x: centerX + 90, y: centerY + 30, vx: 0, vy: 0 },
        { x: centerX + 80, y: centerY + 60, vx: 0, vy: 0 },
      ];
      
      // Mouth contour
      facePoints.mouth = [
        { x: centerX - 40, y: centerY + 80, vx: 0, vy: 0 },
        { x: centerX - 20, y: centerY + 75, vx: 0, vy: 0 },
        { x: centerX, y: centerY + 78, vx: 0, vy: 0 },
        { x: centerX + 20, y: centerY + 75, vx: 0, vy: 0 },
        { x: centerX + 40, y: centerY + 80, vx: 0, vy: 0 },
        { x: centerX + 20, y: centerY + 85, vx: 0, vy: 0 },
        { x: centerX, y: centerY + 87, vx: 0, vy: 0 },
        { x: centerX - 20, y: centerY + 85, vx: 0, vy: 0 },
      ];
      
      // Jawline points
      facePoints.jawline = [
        { x: centerX - 100, y: centerY - 20, vx: 0, vy: 0 },
        { x: centerX - 95, y: centerY + 40, vx: 0, vy: 0 },
        { x: centerX - 80, y: centerY + 100, vx: 0, vy: 0 },
        { x: centerX - 40, y: centerY + 140, vx: 0, vy: 0 },
        { x: centerX, y: centerY + 150, vx: 0, vy: 0 },
        { x: centerX + 40, y: centerY + 140, vx: 0, vy: 0 },
        { x: centerX + 80, y: centerY + 100, vx: 0, vy: 0 },
        { x: centerX + 95, y: centerY + 40, vx: 0, vy: 0 },
        { x: centerX + 100, y: centerY - 20, vx: 0, vy: 0 },
      ];
    };
    
    initializeFacePoints();
    
    // Animate points with micro-movements
    const animatePoints = () => {
      Object.keys(facePoints).forEach(feature => {
        facePoints[feature].forEach((point: any, i: number) => {
          // Add subtle breathing animation
          const breathingOffset = Math.sin(animationTime * 0.001) * 2;
          
          // Add micro-expressions
          if (feature === 'leftEyebrow' || feature === 'rightEyebrow') {
            // Eyebrow lift simulation
            point.vy = Math.sin(animationTime * 0.002 + i) * 1.5;
          } else if (feature === 'leftEye' || feature === 'rightEye') {
            // Blink simulation
            if (Math.random() < 0.002) {
              point.vy = 3;
            }
            point.vy *= 0.9;
          } else if (feature === 'mouth') {
            // Subtle smile movements
            const smileOffset = Math.sin(animationTime * 0.0015) * 0.5;
            point.vx = smileOffset * (i < 4 ? -1 : 1);
          } else if (feature === 'leftCheek' || feature === 'rightCheek') {
            // Cheek muscle movement
            point.vx = Math.sin(animationTime * 0.001 + i) * 0.8;
            point.vy = Math.cos(animationTime * 0.001 + i) * 0.5 + breathingOffset * 0.3;
          } else if (feature === 'jawline') {
            // Jaw muscle tension
            point.vx = Math.sin(animationTime * 0.0008 + i * 0.5) * 0.5;
            point.vy = breathingOffset * 0.5;
          }
          
          // Apply velocity with damping
          point.x += point.vx;
          point.y += point.vy;
          point.vx *= 0.95;
          point.vy *= 0.95;
        });
      });
    };
    
    // Draw smooth muscle fiber lines
    const drawMuscleLines = (points: any[], closed = false) => {
      if (points.length < 2) return;
      
      ctx.beginPath();
      
      // Use quadratic curves for smooth lines
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length - 1; i++) {
        const cp = points[i];
        const next = points[i + 1];
        const midX = (cp.x + next.x) / 2;
        const midY = (cp.y + next.y) / 2;
        ctx.quadraticCurveTo(cp.x, cp.y, midX, midY);
      }
      
      if (closed) {
        const last = points[points.length - 1];
        const first = points[0];
        const midX = (last.x + first.x) / 2;
        const midY = (last.y + first.y) / 2;
        ctx.quadraticCurveTo(last.x, last.y, midX, midY);
        ctx.quadraticCurveTo(first.x, first.y, first.x, first.y);
      } else {
        const last = points[points.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      
      ctx.stroke();
    };
    
    // Draw connecting muscle fibers between features
    const drawConnectingFibers = () => {
      // Forehead to eyebrows
      facePoints.forehead.forEach((fp: any, i: number) => {
        if (i < 3) {
          const eyebrowPoint = facePoints.leftEyebrow[Math.min(i, facePoints.leftEyebrow.length - 1)];
          drawMuscleLines([fp, eyebrowPoint]);
        } else {
          const eyebrowPoint = facePoints.rightEyebrow[Math.min(i - 2, facePoints.rightEyebrow.length - 1)];
          drawMuscleLines([fp, eyebrowPoint]);
        }
      });
      
      // Eyebrows to eyes
      facePoints.leftEyebrow.forEach((bp: any, i: number) => {
        const eyePoint = facePoints.leftEye[Math.min(i, facePoints.leftEye.length - 1)];
        drawMuscleLines([bp, eyePoint]);
      });
      facePoints.rightEyebrow.forEach((bp: any, i: number) => {
        const eyePoint = facePoints.rightEye[Math.min(i, facePoints.rightEye.length - 1)];
        drawMuscleLines([bp, eyePoint]);
      });
      
      // Nose to cheeks
      const noseCenter = facePoints.nose[1];
      drawMuscleLines([noseCenter, facePoints.leftCheek[0]]);
      drawMuscleLines([noseCenter, facePoints.rightCheek[0]]);
      
      // Cheeks to mouth corners
      drawMuscleLines([facePoints.leftCheek[2], facePoints.mouth[0]]);
      drawMuscleLines([facePoints.rightCheek[2], facePoints.mouth[4]]);
      
      // Jawline to mouth
      drawMuscleLines([facePoints.jawline[3], facePoints.mouth[7]]);
      drawMuscleLines([facePoints.jawline[5], facePoints.mouth[3]]);
    };

    const drawLoop = () => {
      if (!isStreaming) return;
      
      animationTime++;
      animatePoints();
      
      ctx.clearRect(0, 0, meshCanvasRef.current!.width, meshCanvasRef.current!.height);
      
      // Set drawing style for muscle fibers
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw main feature outlines with varying opacity for depth
      ctx.globalAlpha = 0.4;
      drawMuscleLines(facePoints.forehead);
      
      ctx.globalAlpha = 0.6;
      drawMuscleLines(facePoints.leftEyebrow);
      drawMuscleLines(facePoints.rightEyebrow);
      
      ctx.globalAlpha = 0.8;
      drawMuscleLines(facePoints.leftEye, true);
      drawMuscleLines(facePoints.rightEye, true);
      
      ctx.globalAlpha = 0.5;
      drawMuscleLines(facePoints.nose);
      
      ctx.globalAlpha = 0.4;
      drawMuscleLines(facePoints.leftCheek);
      drawMuscleLines(facePoints.rightCheek);
      
      ctx.globalAlpha = 0.7;
      drawMuscleLines(facePoints.mouth, true);
      
      ctx.globalAlpha = 0.5;
      drawMuscleLines(facePoints.jawline);
      
      // Draw connecting muscle fibers with lower opacity
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 0.5;
      drawConnectingFibers();
      
      // Add pulsing glow effect on key points
      ctx.globalAlpha = Math.sin(animationTime * 0.05) * 0.2 + 0.3;
      ctx.fillStyle = '#ffffff';
      
      // Pulse on eye centers
      ctx.beginPath();
      ctx.arc(facePoints.leftEye[1].x, facePoints.leftEye[1].y, 2, 0, Math.PI * 2);
      ctx.arc(facePoints.rightEye[1].x, facePoints.rightEye[1].y, 2, 0, Math.PI * 2);
      ctx.fill();
      
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