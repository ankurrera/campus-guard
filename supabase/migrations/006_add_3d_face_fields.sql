-- Add 3D face capture fields to students table
-- This migration adds support for storing 3D biometric data including
-- mesh files, point clouds, depth maps, and face embeddings

-- Add new columns for 3D face data
ALTER TABLE students
ADD COLUMN IF NOT EXISTS face_mesh_url TEXT,
ADD COLUMN IF NOT EXISTS face_pointcloud_url TEXT,
ADD COLUMN IF NOT EXISTS face_depthmap_url TEXT,
ADD COLUMN IF NOT EXISTS face_embedding TEXT,
ADD COLUMN IF NOT EXISTS face_embedding_algorithm TEXT,
ADD COLUMN IF NOT EXISTS biometric_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS biometric_consent_date TIMESTAMP WITH TIME ZONE;

-- Add comment descriptions
COMMENT ON COLUMN students.face_mesh_url IS 'URL to stored 3D face mesh file (glb/obj format)';
COMMENT ON COLUMN students.face_pointcloud_url IS 'URL to stored point cloud file (ply format)';
COMMENT ON COLUMN students.face_depthmap_url IS 'URL to stored depth map image';
COMMENT ON COLUMN students.face_embedding IS 'Base64-encoded face embedding vector for matching';
COMMENT ON COLUMN students.face_embedding_algorithm IS 'Algorithm used to compute face embedding (e.g., face-api-v1)';
COMMENT ON COLUMN students.biometric_consent IS 'Whether student has consented to biometric data storage';
COMMENT ON COLUMN students.biometric_consent_date IS 'Date when biometric consent was given';

-- Create index on biometric consent for querying
CREATE INDEX IF NOT EXISTS idx_students_biometric_consent ON students(biometric_consent);

-- Add the same columns to teaching_assistants table
ALTER TABLE teaching_assistants
ADD COLUMN IF NOT EXISTS face_mesh_url TEXT,
ADD COLUMN IF NOT EXISTS face_pointcloud_url TEXT,
ADD COLUMN IF NOT EXISTS face_depthmap_url TEXT,
ADD COLUMN IF NOT EXISTS face_embedding TEXT,
ADD COLUMN IF NOT EXISTS face_embedding_algorithm TEXT,
ADD COLUMN IF NOT EXISTS biometric_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS biometric_consent_date TIMESTAMP WITH TIME ZONE;

-- Add comment descriptions for TAs
COMMENT ON COLUMN teaching_assistants.face_mesh_url IS 'URL to stored 3D face mesh file (glb/obj format)';
COMMENT ON COLUMN teaching_assistants.face_pointcloud_url IS 'URL to stored point cloud file (ply format)';
COMMENT ON COLUMN teaching_assistants.face_depthmap_url IS 'URL to stored depth map image';
COMMENT ON COLUMN teaching_assistants.face_embedding IS 'Base64-encoded face embedding vector for matching';
COMMENT ON COLUMN teaching_assistants.face_embedding_algorithm IS 'Algorithm used to compute face embedding (e.g., face-api-v1)';
COMMENT ON COLUMN teaching_assistants.biometric_consent IS 'Whether TA has consented to biometric data storage';
COMMENT ON COLUMN teaching_assistants.biometric_consent_date IS 'Date when biometric consent was given';

-- Create index on biometric consent for querying
CREATE INDEX IF NOT EXISTS idx_tas_biometric_consent ON teaching_assistants(biometric_consent);
