/**
 * 3D Face Embedding Library
 * Computes face embeddings from 3D point cloud and depth data
 * for improved face recognition and matching
 */

import { PointCloudData, DepthMapData } from './face3d';

export interface FaceEmbedding {
  vector: Float32Array;
  algorithm: string;
  confidence: number;
  metadata: {
    pointCount?: number;
    depthResolution?: { width: number; height: number };
    captureMethod: string;
    timestamp: Date;
  };
}

/**
 * Compute face embedding from 3D point cloud
 * Uses geometric features and spatial relationships
 */
export function computeEmbeddingFromPointCloud(
  pointCloud: PointCloudData,
  captureMethod: string = 'unknown'
): FaceEmbedding {
  // Extract geometric features from point cloud
  const features = extractGeometricFeatures(pointCloud);
  
  // Create embedding vector (128 dimensions is standard)
  const embeddingSize = 128;
  const vector = new Float32Array(embeddingSize);
  
  // Fill embedding with geometric features
  // In production, this would use a trained neural network
  for (let i = 0; i < embeddingSize; i++) {
    if (i < features.length) {
      vector[i] = features[i];
    } else {
      // Pad with derived features
      vector[i] = features[i % features.length] * 0.5;
    }
  }
  
  // Normalize the embedding
  normalizeVector(vector);
  
  return {
    vector,
    algorithm: '3d-geometric-features-v1',
    confidence: 0.85,
    metadata: {
      pointCount: pointCloud.count,
      captureMethod,
      timestamp: new Date(),
    },
  };
}

/**
 * Compute face embedding from depth map
 * Analyzes depth gradients and surface normals
 */
export function computeEmbeddingFromDepthMap(
  depthMap: DepthMapData,
  captureMethod: string = 'unknown'
): FaceEmbedding {
  // Extract depth-based features
  const features = extractDepthFeatures(depthMap);
  
  // Create embedding vector
  const embeddingSize = 128;
  const vector = new Float32Array(embeddingSize);
  
  // Fill embedding with depth features
  for (let i = 0; i < embeddingSize; i++) {
    if (i < features.length) {
      vector[i] = features[i];
    } else {
      vector[i] = features[i % features.length] * 0.7;
    }
  }
  
  // Normalize
  normalizeVector(vector);
  
  return {
    vector,
    algorithm: '3d-depth-features-v1',
    confidence: 0.80,
    metadata: {
      depthResolution: { width: depthMap.width, height: depthMap.height },
      captureMethod,
      timestamp: new Date(),
    },
  };
}

/**
 * Extract geometric features from point cloud
 * Analyzes facial landmarks and structure in 3D
 */
function extractGeometricFeatures(pointCloud: PointCloudData): number[] {
  const features: number[] = [];
  
  // Calculate centroid
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < pointCloud.count; i++) {
    cx += pointCloud.points[i * 3];
    cy += pointCloud.points[i * 3 + 1];
    cz += pointCloud.points[i * 3 + 2];
  }
  cx /= pointCloud.count;
  cy /= pointCloud.count;
  cz /= pointCloud.count;
  
  features.push(cx, cy, cz);
  
  // Calculate bounding box
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < pointCloud.count; i++) {
    const x = pointCloud.points[i * 3];
    const y = pointCloud.points[i * 3 + 1];
    const z = pointCloud.points[i * 3 + 2];
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  
  features.push(maxX - minX, maxY - minY, maxZ - minZ);
  
  // Calculate distances from centroid (spatial distribution)
  const distances: number[] = [];
  for (let i = 0; i < Math.min(pointCloud.count, 20); i += Math.floor(pointCloud.count / 20)) {
    const x = pointCloud.points[i * 3] - cx;
    const y = pointCloud.points[i * 3 + 1] - cy;
    const z = pointCloud.points[i * 3 + 2] - cz;
    const dist = Math.sqrt(x * x + y * y + z * z);
    distances.push(dist);
  }
  features.push(...distances);
  
  // Calculate surface curvature indicators
  const curvatures = estimateCurvature(pointCloud);
  features.push(...curvatures);
  
  return features;
}

/**
 * Extract depth-based features
 */
function extractDepthFeatures(depthMap: DepthMapData): number[] {
  const features: number[] = [];
  
  // Calculate depth statistics
  const depths = Array.from(depthMap.data).filter(d => d > 0);
  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
  const variance = depths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / depths.length;
  const stdDev = Math.sqrt(variance);
  
  features.push(mean, variance, stdDev);
  
  // Calculate depth gradients (edges in depth)
  const gradients = calculateDepthGradients(depthMap);
  features.push(...gradients);
  
  // Sample depth values at key facial regions (assuming center-aligned face)
  const cx = Math.floor(depthMap.width / 2);
  const cy = Math.floor(depthMap.height / 2);
  
  // Nose region (center)
  features.push(depthMap.data[cy * depthMap.width + cx]);
  
  // Eyes region (upper)
  const eyeY = cy - Math.floor(depthMap.height / 6);
  features.push(depthMap.data[eyeY * depthMap.width + (cx - Math.floor(depthMap.width / 8))]);
  features.push(depthMap.data[eyeY * depthMap.width + (cx + Math.floor(depthMap.width / 8))]);
  
  // Mouth region (lower)
  const mouthY = cy + Math.floor(depthMap.height / 6);
  features.push(depthMap.data[mouthY * depthMap.width + cx]);
  
  return features;
}

/**
 * Estimate surface curvature from point cloud
 */
function estimateCurvature(pointCloud: PointCloudData): number[] {
  const curvatures: number[] = [];
  const sampleSize = Math.min(10, Math.floor(pointCloud.count / 10));
  
  for (let i = 0; i < sampleSize; i++) {
    const idx = Math.floor(i * pointCloud.count / sampleSize);
    
    // Calculate local curvature by comparing with nearby points
    const x = pointCloud.points[idx * 3];
    const y = pointCloud.points[idx * 3 + 1];
    const z = pointCloud.points[idx * 3 + 2];
    
    let curvature = 0;
    let neighbors = 0;
    
    // Check nearby points
    for (let j = Math.max(0, idx - 5); j < Math.min(pointCloud.count, idx + 5); j++) {
      if (j === idx) continue;
      
      const nx = pointCloud.points[j * 3];
      const ny = pointCloud.points[j * 3 + 1];
      const nz = pointCloud.points[j * 3 + 2];
      
      const dist = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2 + (nz - z) ** 2);
      if (dist < 0.1) {
        curvature += dist;
        neighbors++;
      }
    }
    
    curvatures.push(neighbors > 0 ? curvature / neighbors : 0);
  }
  
  return curvatures;
}

/**
 * Calculate depth gradients
 */
function calculateDepthGradients(depthMap: DepthMapData): number[] {
  const gradients: number[] = [];
  const step = Math.floor(Math.min(depthMap.width, depthMap.height) / 10);
  
  for (let y = step; y < depthMap.height - step; y += step) {
    for (let x = step; x < depthMap.width - step; x += step) {
      const center = depthMap.data[y * depthMap.width + x];
      const right = depthMap.data[y * depthMap.width + (x + 1)];
      const down = depthMap.data[(y + 1) * depthMap.width + x];
      
      const gradX = right - center;
      const gradY = down - center;
      const gradMag = Math.sqrt(gradX * gradX + gradY * gradY);
      
      gradients.push(gradMag);
    }
  }
  
  return gradients.slice(0, 20); // Limit to 20 gradient samples
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: Float32Array): void {
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);
  
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
}

/**
 * Calculate similarity between two embeddings (cosine similarity)
 */
export function calculateEmbeddingSimilarity(
  embedding1: FaceEmbedding,
  embedding2: FaceEmbedding
): number {
  if (embedding1.vector.length !== embedding2.vector.length) {
    throw new Error('Embeddings must have the same dimensions');
  }
  
  let dotProduct = 0;
  for (let i = 0; i < embedding1.vector.length; i++) {
    dotProduct += embedding1.vector[i] * embedding2.vector[i];
  }
  
  // Vectors are already normalized, so dot product = cosine similarity
  return dotProduct;
}

/**
 * Export embedding to base64 string for storage
 */
export function embeddingToBase64(embedding: FaceEmbedding): string {
  const bytes = new Uint8Array(embedding.vector.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Import embedding from base64 string
 */
export function embeddingFromBase64(base64: string, algorithm: string): FaceEmbedding {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const vector = new Float32Array(bytes.buffer);
  
  return {
    vector,
    algorithm,
    confidence: 0.85,
    metadata: {
      captureMethod: 'unknown',
      timestamp: new Date(),
    },
  };
}
