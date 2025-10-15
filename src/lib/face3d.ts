/**
 * 3D Face Capture Library
 * Provides utilities for capturing and processing 3D face data
 * including depth maps, point clouds, and meshes
 */

export interface DeviceCapabilities {
  hasDepthSensor: boolean;
  hasWebXR: boolean;
  hasLiDAR: boolean;
  hasARCore: boolean;
  supportedMethods: CaptureMethod[];
}

export type CaptureMethod = 
  | 'lidar' 
  | 'webxr_depth' 
  | 'arcore_depth' 
  | 'photogrammetry' 
  | 'stereo';

export interface DepthMapData {
  width: number;
  height: number;
  data: Float32Array;
  format: 'float32' | 'uint16';
}

export interface PointCloudData {
  points: Float32Array; // [x, y, z, x, y, z, ...]
  colors?: Uint8Array; // [r, g, b, r, g, b, ...]
  normals?: Float32Array;
  count: number;
}

export interface MeshData {
  vertices: Float32Array;
  faces: Uint32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  format: 'obj' | 'ply' | 'glb';
}

export interface Face3DCapture {
  method: CaptureMethod;
  timestamp: Date;
  rgbFrame?: string; // base64 encoded
  depthMap?: DepthMapData;
  pointCloud?: PointCloudData;
  mesh?: MeshData;
  embedding?: Float32Array;
  antiSpoofingMetrics: {
    depthScore: number;
    textureScore: number;
    motionScore: number;
    confidence: number;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
    hasLiDAR: boolean;
    hasDepthSensor: boolean;
  };
}

/**
 * Detect device capabilities for 3D face capture
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities: DeviceCapabilities = {
    hasDepthSensor: false,
    hasWebXR: false,
    hasLiDAR: false,
    hasARCore: false,
    supportedMethods: [],
  };

  // Check for WebXR support
  if ('xr' in navigator) {
    try {
      const xr = navigator.xr as any;
      if (xr && typeof xr.isSessionSupported === 'function') {
        const isSupported = await xr.isSessionSupported('immersive-ar');
        if (isSupported) {
          capabilities.hasWebXR = true;
          capabilities.supportedMethods.push('webxr_depth');
        }
      }
    } catch (error) {
      console.warn('WebXR check failed:', error);
    }
  }

  // Check for depth sensor via MediaDevices (experimental)
  if ('mediaDevices' in navigator && navigator.mediaDevices.getSupportedConstraints) {
    const constraints = navigator.mediaDevices.getSupportedConstraints() as any;
    if (constraints.depthNear || constraints.depthFar) {
      capabilities.hasDepthSensor = true;
    }
  }

  // Check for LiDAR (iOS devices)
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  if (isIOS) {
    // LiDAR is available on iPhone 12 Pro and later, iPad Pro 2020 and later
    // This is a heuristic check - actual capability would need native bridge
    capabilities.hasLiDAR = userAgent.includes('iPhone') && 
                           parseInt(userAgent.match(/iPhone OS (\d+)/)?.[1] || '0') >= 14;
    if (capabilities.hasLiDAR) {
      capabilities.supportedMethods.push('lidar');
    }
  }

  // Check for ARCore (Android devices)
  const isAndroid = /Android/.test(userAgent);
  if (isAndroid) {
    // ARCore Depth API available on supported devices
    // This is a heuristic check - actual capability would need native bridge
    capabilities.hasARCore = parseInt(userAgent.match(/Android (\d+)/)?.[1] || '0') >= 10;
    if (capabilities.hasARCore) {
      capabilities.supportedMethods.push('arcore_depth');
    }
  }

  // Photogrammetry is always available as fallback
  capabilities.supportedMethods.push('photogrammetry');

  return capabilities;
}

/**
 * Convert depth map to Float32Array
 */
export function normalizeDepthMap(
  depthData: ImageData | ArrayBuffer | Float32Array,
  width: number,
  height: number
): DepthMapData {
  let data: Float32Array;

  if (depthData instanceof ImageData) {
    // Convert RGBA ImageData to depth values
    data = new Float32Array(width * height);
    for (let i = 0; i < depthData.data.length / 4; i++) {
      // Assume depth is encoded in red channel (0-255 -> 0-1)
      data[i] = depthData.data[i * 4] / 255.0;
    }
  } else if (depthData instanceof ArrayBuffer) {
    data = new Float32Array(depthData);
  } else {
    data = depthData;
  }

  return {
    width,
    height,
    data,
    format: 'float32',
  };
}

/**
 * Convert depth map to point cloud
 */
export function depthMapToPointCloud(
  depthMap: DepthMapData,
  rgbImage?: ImageData,
  focalLength: number = 500
): PointCloudData {
  const points: number[] = [];
  const colors: number[] = [];

  const cx = depthMap.width / 2;
  const cy = depthMap.height / 2;

  for (let y = 0; y < depthMap.height; y++) {
    for (let x = 0; x < depthMap.width; x++) {
      const idx = y * depthMap.width + x;
      const depth = depthMap.data[idx];

      if (depth > 0 && depth < 5.0) { // Filter out invalid depths
        // Convert 2D + depth to 3D point
        const z = depth;
        const px = ((x - cx) * z) / focalLength;
        const py = ((y - cy) * z) / focalLength;

        points.push(px, py, z);

        // Add color if available
        if (rgbImage) {
          const rgbIdx = idx * 4;
          colors.push(
            rgbImage.data[rgbIdx],
            rgbImage.data[rgbIdx + 1],
            rgbImage.data[rgbIdx + 2]
          );
        }
      }
    }
  }

  return {
    points: new Float32Array(points),
    colors: colors.length > 0 ? new Uint8Array(colors) : undefined,
    count: points.length / 3,
  };
}

/**
 * Export point cloud to PLY format
 */
export function pointCloudToPLY(pointCloud: PointCloudData): string {
  const hasColors = pointCloud.colors !== undefined;
  let ply = `ply\nformat ascii 1.0\ncomment Created by Campus Guard\n`;
  ply += `element vertex ${pointCloud.count}\n`;
  ply += `property float x\nproperty float y\nproperty float z\n`;
  
  if (hasColors) {
    ply += `property uchar red\nproperty uchar green\nproperty uchar blue\n`;
  }
  
  ply += `end_header\n`;

  for (let i = 0; i < pointCloud.count; i++) {
    const x = pointCloud.points[i * 3];
    const y = pointCloud.points[i * 3 + 1];
    const z = pointCloud.points[i * 3 + 2];
    
    ply += `${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`;
    
    if (hasColors && pointCloud.colors) {
      const r = pointCloud.colors[i * 3];
      const g = pointCloud.colors[i * 3 + 1];
      const b = pointCloud.colors[i * 3 + 2];
      ply += ` ${r} ${g} ${b}`;
    }
    
    ply += `\n`;
  }

  return ply;
}

/**
 * Encode depth map as base64 PNG
 */
export function encodeDepthMapAsBase64(depthMap: DepthMapData): string {
  const canvas = document.createElement('canvas');
  canvas.width = depthMap.width;
  canvas.height = depthMap.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const imageData = ctx.createImageData(depthMap.width, depthMap.height);
  
  // Convert float depth to grayscale image
  for (let i = 0; i < depthMap.data.length; i++) {
    const value = Math.min(255, Math.max(0, depthMap.data[i] * 255));
    imageData.data[i * 4] = value;
    imageData.data[i * 4 + 1] = value;
    imageData.data[i * 4 + 2] = value;
    imageData.data[i * 4 + 3] = 255;
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Compute depth-based anti-spoofing score
 */
export function computeDepthAntiSpoofingScore(depthMap: DepthMapData): number {
  // Calculate depth variance across face region
  const centerX = Math.floor(depthMap.width / 2);
  const centerY = Math.floor(depthMap.height / 2);
  const regionSize = Math.min(depthMap.width, depthMap.height) / 4;

  const depths: number[] = [];
  
  for (let y = centerY - regionSize; y < centerY + regionSize; y++) {
    for (let x = centerX - regionSize; x < centerX + regionSize; x++) {
      if (x >= 0 && x < depthMap.width && y >= 0 && y < depthMap.height) {
        const idx = y * depthMap.width + x;
        const depth = depthMap.data[idx];
        if (depth > 0) {
          depths.push(depth);
        }
      }
    }
  }

  if (depths.length === 0) return 0;

  // Calculate variance
  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
  const variance = depths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / depths.length;
  const stdDev = Math.sqrt(variance);

  // A real 3D face should have depth variation
  // Flat surfaces (photos/screens) will have near-zero variance
  const minExpectedVariance = 0.02; // 2cm variance minimum
  const maxExpectedVariance = 0.15; // 15cm variance maximum

  if (stdDev < minExpectedVariance) {
    // Too flat - likely a photo or screen
    return 0.1;
  } else if (stdDev > maxExpectedVariance) {
    // Too much variation - possibly invalid data
    return 0.5;
  } else {
    // Good depth variation - normalize to 0.6-1.0 range
    return 0.6 + (stdDev / maxExpectedVariance) * 0.4;
  }
}

/**
 * Get device information for logging
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    hasLiDAR: /iPad|iPhone|iPod/.test(navigator.userAgent) && 
              parseInt(navigator.userAgent.match(/iPhone OS (\d+)/)?.[1] || '0') >= 14,
    hasDepthSensor: false, // Will be updated by capability detection
  };
}
