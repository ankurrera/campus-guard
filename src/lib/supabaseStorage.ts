/**
 * Supabase Storage Utilities for 3D Face Data
 * Handles upload and retrieval of biometric files
 */

import { supabase } from './supabaseClient';
import { Face3DCapture, pointCloudToPLY, encodeDepthMapAsBase64 } from './face3d';

export const BIOMETRIC_BUCKET = 'biometric-data';

export interface UploadResult {
  success: boolean;
  meshUrl?: string;
  pointCloudUrl?: string;
  depthMapUrl?: string;
  error?: string;
}

/**
 * Initialize biometric storage bucket
 * This should be run once during setup
 */
export async function initializeBiometricBucket(): Promise<void> {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BIOMETRIC_BUCKET);

    if (!bucketExists) {
      // Create bucket with appropriate policies
      await supabase.storage.createBucket(BIOMETRIC_BUCKET, {
        public: false, // Private bucket for security
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
        allowedMimeTypes: [
          'model/gltf-binary',
          'model/obj',
          'application/octet-stream',
          'image/png',
          'text/plain', // for PLY files
        ],
      });
      console.log('Biometric storage bucket created successfully');
    }
  } catch (error) {
    console.error('Error initializing biometric bucket:', error);
    throw error;
  }
}

/**
 * Upload 3D face data to Supabase Storage
 */
export async function upload3DFaceData(
  studentId: string,
  capture: Face3DCapture
): Promise<UploadResult> {
  const result: UploadResult = { success: false };

  try {
    const timestamp = Date.now();
    const basePath = `students/${studentId}`;

    // Upload point cloud if available
    if (capture.pointCloud) {
      const plyContent = pointCloudToPLY(capture.pointCloud);
      const plyBlob = new Blob([plyContent], { type: 'text/plain' });
      const plyPath = `${basePath}/pointcloud_${timestamp}.ply`;

      const { error: plyError } = await supabase.storage
        .from(BIOMETRIC_BUCKET)
        .upload(plyPath, plyBlob, {
          contentType: 'text/plain',
          upsert: false,
        });

      if (plyError) {
        console.error('Error uploading point cloud:', plyError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from(BIOMETRIC_BUCKET)
          .getPublicUrl(plyPath);
        result.pointCloudUrl = publicUrl;
      }
    }

    // Upload depth map if available
    if (capture.depthMap) {
      const depthBase64 = encodeDepthMapAsBase64(capture.depthMap);
      const depthBlob = await fetch(depthBase64).then(r => r.blob());
      const depthPath = `${basePath}/depthmap_${timestamp}.png`;

      const { error: depthError } = await supabase.storage
        .from(BIOMETRIC_BUCKET)
        .upload(depthPath, depthBlob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (depthError) {
        console.error('Error uploading depth map:', depthError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from(BIOMETRIC_BUCKET)
          .getPublicUrl(depthPath);
        result.depthMapUrl = publicUrl;
      }
    }

    // Upload mesh if available (as GLB/OBJ)
    if (capture.mesh) {
      // For now, we'll just store a placeholder
      // Full mesh export would require a proper mesh library
      const meshPath = `${basePath}/mesh_${timestamp}.glb`;
      console.log('Mesh upload not fully implemented, path would be:', meshPath);
    }

    // Upload RGB frame
    if (capture.rgbFrame) {
      const rgbBlob = await fetch(capture.rgbFrame).then(r => r.blob());
      const rgbPath = `${basePath}/rgb_${timestamp}.jpg`;

      const { error: rgbError } = await supabase.storage
        .from(BIOMETRIC_BUCKET)
        .upload(rgbPath, rgbBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (rgbError) {
        console.error('Error uploading RGB frame:', rgbError);
      }
    }

    result.success = true;
    return result;
  } catch (error) {
    console.error('Error uploading 3D face data:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Update student record with 3D face data URLs
 */
export async function updateStudent3DFaceData(
  studentId: string,
  uploadResult: UploadResult,
  embedding?: string,
  algorithm?: string
): Promise<boolean> {
  try {
    const updateData: any = {};

    if (uploadResult.meshUrl) {
      updateData.face_mesh_url = uploadResult.meshUrl;
    }
    if (uploadResult.pointCloudUrl) {
      updateData.face_pointcloud_url = uploadResult.pointCloudUrl;
    }
    if (uploadResult.depthMapUrl) {
      updateData.face_depthmap_url = uploadResult.depthMapUrl;
    }
    if (embedding) {
      updateData.face_embedding = embedding;
    }
    if (algorithm) {
      updateData.face_embedding_algorithm = algorithm;
    }

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId);

    if (error) {
      console.error('Error updating student 3D face data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating student record:', error);
    return false;
  }
}

/**
 * Update biometric consent for a student
 */
export async function updateBiometricConsent(
  studentId: string,
  consent: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('students')
      .update({
        biometric_consent: consent,
        biometric_consent_date: consent ? new Date().toISOString() : null,
      })
      .eq('id', studentId);

    if (error) {
      console.error('Error updating biometric consent:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating consent:', error);
    return false;
  }
}

/**
 * Delete biometric data for a student
 */
export async function deleteBiometricData(studentId: string): Promise<boolean> {
  try {
    // Delete files from storage
    const basePath = `students/${studentId}`;
    
    const { data: files } = await supabase.storage
      .from(BIOMETRIC_BUCKET)
      .list(basePath);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${basePath}/${f.name}`);
      await supabase.storage
        .from(BIOMETRIC_BUCKET)
        .remove(filePaths);
    }

    // Clear database references
    const { error } = await supabase
      .from('students')
      .update({
        face_mesh_url: null,
        face_pointcloud_url: null,
        face_depthmap_url: null,
        face_embedding: null,
        face_embedding_algorithm: null,
        biometric_consent: false,
        biometric_consent_date: null,
      })
      .eq('id', studentId);

    if (error) {
      console.error('Error clearing biometric data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting biometric data:', error);
    return false;
  }
}
