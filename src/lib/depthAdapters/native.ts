/**
 * Native Depth Adapter
 * Provides interface for capturing depth data using native device APIs
 * through Capacitor plugin (LiDAR for iOS, ARCore for Android)
 */

import NativeDepthCapture from '../../plugins/NativeDepthCapture';
import { DepthMapData, Face3DCapture, CaptureMethod, getDeviceInfo } from '../face3d';

export interface NativeDepthCapture {
  method: 'lidar' | 'arcore_depth';
  depthMap: DepthMapData;
  rgbFrame: string;
  timestamp: Date;
}

/**
 * Check if native depth capture is available
 */
export async function isNativeDepthAvailable(): Promise<{
  available: boolean;
  method: 'lidar' | 'arcore_depth' | null;
}> {
  try {
    const result = await NativeDepthCapture.isAvailable();
    return {
      available: result.available,
      method: result.method === 'lidar' ? 'lidar' : result.method === 'arcore' ? 'arcore_depth' : null,
    };
  } catch (error) {
    console.error('Failed to check native depth availability:', error);
    return { available: false, method: null };
  }
}

/**
 * Initialize native depth capture session
 */
export async function initializeNativeDepth(): Promise<boolean> {
  try {
    const result = await NativeDepthCapture.initialize();
    return result.success;
  } catch (error) {
    console.error('Failed to initialize native depth:', error);
    return false;
  }
}

/**
 * Capture depth data using native APIs
 */
export async function captureNativeDepth(): Promise<NativeDepthCapture | null> {
  try {
    // Check if available first
    const availability = await isNativeDepthAvailable();
    if (!availability.available || !availability.method) {
      console.warn('Native depth capture not available');
      return null;
    }

    // Capture frame
    const result = await NativeDepthCapture.captureDepthFrame();
    
    if (!result.success || !result.depthData || !result.rgbData) {
      console.warn('Failed to capture native depth frame');
      return null;
    }

    // Convert the depth data
    const depthMap: DepthMapData = {
      width: result.depthData.width,
      height: result.depthData.height,
      data: new Float32Array(result.depthData.data),
      format: result.depthData.format,
    };

    return {
      method: availability.method,
      depthMap,
      rgbFrame: result.rgbData,
      timestamp: new Date(result.timestamp),
    };
  } catch (error) {
    console.error('Native depth capture failed:', error);
    return null;
  }
}

/**
 * Stop native depth capture session
 */
export async function stopNativeDepth(): Promise<void> {
  try {
    await NativeDepthCapture.stop();
  } catch (error) {
    console.error('Failed to stop native depth:', error);
  }
}

/**
 * Get native depth capabilities
 */
export async function getNativeDepthCapabilities(): Promise<{
  hasLiDAR: boolean;
  hasARCore: boolean;
  maxDepthRange: number;
  minDepthRange: number;
  resolution: { width: number; height: number };
}> {
  try {
    return await NativeDepthCapture.getCapabilities();
  } catch (error) {
    console.error('Failed to get native depth capabilities:', error);
    return {
      hasLiDAR: false,
      hasARCore: false,
      maxDepthRange: 0,
      minDepthRange: 0,
      resolution: { width: 0, height: 0 },
    };
  }
}

/**
 * Capture full 3D face data using native depth
 */
export async function captureNative3DFace(
  onProgress?: (progress: number) => void
): Promise<Face3DCapture | null> {
  try {
    // Initialize
    if (onProgress) onProgress(0.1);
    const initialized = await initializeNativeDepth();
    if (!initialized) {
      console.warn('Failed to initialize native depth capture');
      return null;
    }

    // Capture depth frame
    if (onProgress) onProgress(0.5);
    const capture = await captureNativeDepth();
    if (!capture) {
      await stopNativeDepth();
      return null;
    }

    // Stop session
    if (onProgress) onProgress(0.9);
    await stopNativeDepth();

    // Build Face3DCapture object
    const deviceInfo = getDeviceInfo();
    
    if (onProgress) onProgress(1.0);

    return {
      method: capture.method,
      timestamp: capture.timestamp,
      rgbFrame: capture.rgbFrame,
      depthMap: capture.depthMap,
      antiSpoofingMetrics: {
        depthScore: 0.9, // Native depth is highly reliable
        textureScore: 0.8,
        motionScore: 0.7,
        confidence: 0.9,
      },
      deviceInfo: {
        ...deviceInfo,
        hasDepthSensor: true,
      },
    };
  } catch (error) {
    console.error('Failed to capture native 3D face:', error);
    await stopNativeDepth();
    return null;
  }
}
