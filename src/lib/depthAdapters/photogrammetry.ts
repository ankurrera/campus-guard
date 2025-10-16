/**
 * Photogrammetry Multi-View Capture
 * Provides guided multi-view capture flow for 3D reconstruction
 */

import { Face3DCapture } from '../face3d';

export interface MultiViewFrame {
  imageData: string; // base64 encoded
  timestamp: Date;
  angle: number; // rotation angle in degrees
}

export interface PhotogrammetryCaptureResult {
  frames: MultiViewFrame[];
  duration: number;
  totalFrames: number;
  completed: boolean;
}

export type CapturePhase = 'idle' | 'countdown' | 'capturing' | 'completed';

export interface CaptureInstructions {
  phase: CapturePhase;
  currentFrame: number;
  totalFrames: number;
  countdown: number;
  message: string;
}

/**
 * Multi-view capture controller for photogrammetry
 */
export class PhotogrammetryCapture {
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement;
  private capturedFrames: MultiViewFrame[] = [];
  private captureInterval: number | null = null;
  private startTime: Date | null = null;
  private onProgress: ((instructions: CaptureInstructions) => void) | null = null;

  // Configuration
  private readonly targetFrameCount: number = 30;
  private readonly captureDuration: number = 10000; // 10 seconds
  private readonly countdownDuration: number = 3;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  /**
   * Start multi-view capture process
   */
  async start(
    video: HTMLVideoElement,
    onProgress?: (instructions: CaptureInstructions) => void
  ): Promise<PhotogrammetryCaptureResult> {
    this.video = video;
    this.onProgress = onProgress || null;
    this.capturedFrames = [];

    // Configure canvas
    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;

    // Countdown phase
    await this.countdown();

    // Capture phase
    await this.captureFrames();

    return {
      frames: this.capturedFrames,
      duration: Date.now() - (this.startTime?.getTime() || 0),
      totalFrames: this.capturedFrames.length,
      completed: true,
    };
  }

  /**
   * Countdown before capture
   */
  private async countdown(): Promise<void> {
    return new Promise((resolve) => {
      let count = this.countdownDuration;

      const tick = () => {
        if (this.onProgress) {
          this.onProgress({
            phase: 'countdown',
            currentFrame: 0,
            totalFrames: this.targetFrameCount,
            countdown: count,
            message: `Get ready! Starting in ${count}...`,
          });
        }

        count--;
        if (count > 0) {
          setTimeout(tick, 1000);
        } else {
          resolve();
        }
      };

      tick();
    });
  }

  /**
   * Capture frames in sequence
   */
  private async captureFrames(): Promise<void> {
    return new Promise((resolve) => {
      this.startTime = new Date();
      const frameInterval = this.captureDuration / this.targetFrameCount;
      let frameCount = 0;

      this.captureInterval = window.setInterval(() => {
        if (frameCount >= this.targetFrameCount || !this.video) {
          this.stopCapture();
          resolve();
          return;
        }

        // Capture current frame
        const frame = this.captureFrame(frameCount);
        if (frame) {
          this.capturedFrames.push(frame);
        }

        frameCount++;

        // Update progress
        if (this.onProgress) {
          const angle = (frameCount / this.targetFrameCount) * 360;
          this.onProgress({
            phase: 'capturing',
            currentFrame: frameCount,
            totalFrames: this.targetFrameCount,
            countdown: 0,
            message: this.getInstructionForAngle(angle),
          });
        }
      }, frameInterval);
    });
  }

  /**
   * Capture single frame from video
   */
  private captureFrame(index: number): MultiViewFrame | null {
    if (!this.video || !this.canvas) return null;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return null;

    // Draw current video frame to canvas
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Convert to base64
    const imageData = this.canvas.toDataURL('image/jpeg', 0.95);

    // Calculate angle based on frame index
    const angle = (index / this.targetFrameCount) * 360;

    return {
      imageData,
      timestamp: new Date(),
      angle,
    };
  }

  /**
   * Stop capture process
   */
  private stopCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.onProgress) {
      this.onProgress({
        phase: 'completed',
        currentFrame: this.capturedFrames.length,
        totalFrames: this.targetFrameCount,
        countdown: 0,
        message: 'Capture complete! Processing frames...',
      });
    }
  }

  /**
   * Get instruction message for current angle
   */
  private getInstructionForAngle(angle: number): string {
    if (angle < 45) {
      return 'Hold steady, looking straight ahead...';
    } else if (angle < 90) {
      return 'Slowly turn your head to the left...';
    } else if (angle < 135) {
      return 'Continue turning left...';
    } else if (angle < 180) {
      return 'Keep turning, almost halfway...';
    } else if (angle < 225) {
      return 'Great! Now turn your head to the right...';
    } else if (angle < 270) {
      return 'Continue turning right...';
    } else if (angle < 315) {
      return 'Almost done, keep turning...';
    } else {
      return 'Final frames, looking straight ahead...';
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopCapture();
    this.video = null;
    this.capturedFrames = [];
  }
}

/**
 * Convert captured frames to 3D face capture data
 */
export function framesToFace3DCapture(
  result: PhotogrammetryCaptureResult,
  rgbFrame: string,
  antiSpoofingMetrics: {
    depthScore: number;
    textureScore: number;
    motionScore: number;
    confidence: number;
  }
): Partial<Face3DCapture> {
  return {
    method: 'photogrammetry',
    timestamp: new Date(),
    rgbFrame,
    antiSpoofingMetrics,
    deviceInfo: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hasLiDAR: false,
      hasDepthSensor: false,
    },
  };
}
