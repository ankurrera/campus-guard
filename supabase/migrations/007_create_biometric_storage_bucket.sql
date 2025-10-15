-- Create biometric-data storage bucket for 3D face data
-- This migration creates the storage bucket and sets up proper RLS policies

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biometric-data',
  'biometric-data',
  false, -- Private bucket for security
  52428800, -- 50MB limit in bytes
  ARRAY[
    'model/gltf-binary',
    'model/obj',
    'application/octet-stream',
    'image/png',
    'image/jpeg',
    'text/plain' -- for PLY files
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for biometric-data bucket

-- Policy: Allow authenticated users to upload their own biometric data
CREATE POLICY "Allow authenticated users to upload biometric data"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'biometric-data' AND
  (storage.foldername(name))[1] = 'students'
);

-- Policy: Allow authenticated users to read their own biometric data
CREATE POLICY "Allow authenticated users to read own biometric data"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'biometric-data' AND
  (storage.foldername(name))[1] = 'students'
);

-- Policy: Allow authenticated users to update their own biometric data
CREATE POLICY "Allow authenticated users to update own biometric data"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'biometric-data' AND
  (storage.foldername(name))[1] = 'students'
);

-- Policy: Allow authenticated users to delete their own biometric data
CREATE POLICY "Allow authenticated users to delete own biometric data"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'biometric-data' AND
  (storage.foldername(name))[1] = 'students'
);

-- Policy: Allow admins full access to all biometric data
CREATE POLICY "Allow admins full access to biometric data"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'biometric-data' AND
  is_admin()
);
