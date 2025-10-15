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

export interface PhotogrammetryCapture {
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
  private frames: MultiViewFrame[] = [];
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
  ): Promise<PhotogrammetryCapture> {
    this.video = video;
    this.onProgress = onProgress || null;
    this.frames = [];

    // Configure canvas
    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;

    // Countdown phase
    await this.countdown();

    // Capture phase
    await this.captureFrames();

    return {
      frames: this.frames,
      duration: Date.now() - (this.startTime?.getTime() || 0),
      totalFrames: this.frames.length,
      completed: true,
    };
  }

  /**
   * Countdown before starting capture
   */
  private async countdown(): Promise<void> {
    for (let i = this.countdownDuration; i > 0; i--) {
      this.onProgress?.({
        phase: 'countdown',
        currentFrame: 0,
        totalFrames: this.targetFrameCount,
        countdown: i,
        message: `Get ready! Starting in ${i}...`,
      });
      await this.sleep(1000);
    }
  }

  /**
   * Capture frames over the specified duration
   */
  private async captureFrames(): Promise<void> {
    this.startTime = new Date();
    const frameInterval = this.captureDuration / this.targetFrameCount;

    this.onProgress?.({
      phase: 'capturing',
      currentFrame: 0,
      totalFrames: this.targetFrameCount,
      countdown: 0,
      message: 'Slowly rotate your head left and right...',
    });

    let frameCount = 0;
    
    return new Promise((resolve) => {
      this.captureInterval = window.setInterval(() => {
        if (frameCount >= this.targetFrameCount) {
          this.stopCapture();
          this.onProgress?.({
            phase: 'completed',
            currentFrame: this.targetFrameCount,
            totalFrames: this.targetFrameCount,
            countdown: 0,
            message: 'Capture complete! Processing...',
          });
          resolve();
          return;
        }

        this.captureFrame(frameCount);
        frameCount++;

        this.onProgress?.({
          phase: 'capturing',
          currentFrame: frameCount,
          totalFrames: this.targetFrameCount,
          countdown: 0,
          message: `Capturing frame ${frameCount}/${this.targetFrameCount}...`,
        });
      }, frameInterval);
    });
  }

  /**
   * Capture a single frame
   */
  private captureFrame(frameIndex: number): void {
    if (!this.video) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Draw current video frame
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Get image data
    const imageData = this.canvas.toDataURL('image/jpeg', 0.85);

    // Calculate approximate angle based on frame position
    // Assuming user rotates head about 60 degrees total over capture
    const angle = -30 + (frameIndex / this.targetFrameCount) * 60;

    this.frames.push({
      imageData,
      timestamp: new Date(),
      angle,
    });
  }

  /**
   * Stop capture process
   */
  private stopCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  /**
   * Utility: sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset capture state
   */
  reset(): void {
    this.stopCapture();
    this.frames = [];
    this.startTime = null;
  }

  /**
   * Get captured frames
   */
  getFrames(): MultiViewFrame[] {
    return this.frames;
  }

  /**
   * Export frames for upload
   */
  exportForUpload(): {
    frameCount: number;
    duration: number;
    frames: string[]; // base64 images
  } {
    return {
      frameCount: this.frames.length,
      duration: Date.now() - (this.startTime?.getTime() || 0),
      frames: this.frames.map(f => f.imageData),
    };
  }
}

/**
 * Validate photogrammetry capture quality
 */
export function validatePhotogrammetryCapture(
  capture: PhotogrammetryCapture
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (capture.totalFrames < 20) {
    issues.push('Insufficient frames captured (minimum 20 required)');
  }

  if (capture.duration < 5000) {
    issues.push('Capture duration too short (minimum 5 seconds)');
  }

  if (capture.frames.length < capture.totalFrames * 0.8) {
    issues.push('Too many frames dropped during capture');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
