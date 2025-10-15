/**
 * Native Depth Capture Plugin
 * Provides bridge to native LiDAR (iOS) and ARCore (Android) depth APIs
 */

import { registerPlugin } from '@capacitor/core';
import type { DepthMapData } from '../lib/face3d';

export interface NativeDepthCapturePlugin {
  /**
   * Check if native depth capture is available on this device
   */
  isAvailable(): Promise<{ available: boolean; method: 'lidar' | 'arcore' | null }>;
  
  /**
   * Initialize depth capture session
   */
  initialize(): Promise<{ success: boolean }>;
  
  /**
   * Capture a single depth frame
   */
  captureDepthFrame(): Promise<{
    success: boolean;
    depthData?: {
      width: number;
      height: number;
      data: number[]; // Float32Array serialized as array
      format: 'float32' | 'uint16';
    };
    rgbData?: string; // Base64 encoded image
    timestamp: number;
  }>;
  
  /**
   * Stop depth capture session
   */
  stop(): Promise<{ success: boolean }>;
  
  /**
   * Get device capabilities
   */
  getCapabilities(): Promise<{
    hasLiDAR: boolean;
    hasARCore: boolean;
    maxDepthRange: number;
    minDepthRange: number;
    resolution: { width: number; height: number };
  }>;
}

const NativeDepthCapture = registerPlugin<NativeDepthCapturePlugin>('NativeDepthCapture', {
  web: () => import('./NativeDepthCaptureWeb').then(m => new m.NativeDepthCaptureWeb()),
});

export default NativeDepthCapture;
