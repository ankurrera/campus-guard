/**
 * Web implementation of NativeDepthCapture plugin
 * Falls back to WebXR or photogrammetry when native APIs are unavailable
 */

import { WebPlugin } from '@capacitor/core';
import type { NativeDepthCapturePlugin } from './NativeDepthCapture';

export class NativeDepthCaptureWeb extends WebPlugin implements NativeDepthCapturePlugin {
  async isAvailable(): Promise<{ available: boolean; method: 'lidar' | 'arcore' | null }> {
    // Check for WebXR depth sensing as fallback
    if ('xr' in navigator) {
      try {
        const xr = navigator.xr as any;
        if (xr && typeof xr.isSessionSupported === 'function') {
          const isSupported = await xr.isSessionSupported('immersive-ar');
          if (isSupported) {
            return { available: true, method: null };
          }
        }
      } catch (error) {
        console.warn('WebXR check failed:', error);
      }
    }
    
    return { available: false, method: null };
  }

  async initialize(): Promise<{ success: boolean }> {
    console.log('Native depth capture not available on web platform');
    return { success: false };
  }

  async captureDepthFrame(): Promise<{
    success: boolean;
    depthData?: {
      width: number;
      height: number;
      data: number[];
      format: 'float32' | 'uint16';
    };
    rgbData?: string;
    timestamp: number;
  }> {
    console.log('Native depth capture not available on web platform');
    return { success: false, timestamp: Date.now() };
  }

  async stop(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async getCapabilities(): Promise<{
    hasLiDAR: boolean;
    hasARCore: boolean;
    maxDepthRange: number;
    minDepthRange: number;
    resolution: { width: number; height: number };
  }> {
    return {
      hasLiDAR: false,
      hasARCore: false,
      maxDepthRange: 0,
      minDepthRange: 0,
      resolution: { width: 0, height: 0 },
    };
  }
}
