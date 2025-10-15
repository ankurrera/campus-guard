# Fixing Supabase Storage Bucket Errors

## Problem
The application was encountering two errors when attempting to upload biometric data:

1. **Error ensuring bucket exists: StorageApiError: new row violates row-level security policy**
   - This occurred because the client-side code tried to create a storage bucket using `supabase.storage.createBucket()`
   - The `storage.buckets` table has Row Level Security (RLS) enabled, and authenticated users don't have permission to insert into it

2. **Error uploading RGB frame: StorageApiError: Bucket not found**
   - This occurred because the bucket creation failed (due to the first error)
   - Without the bucket, all subsequent upload operations fail

## Solution
The fix involves two parts:

### 1. SQL Migration (007_create_biometric_storage_bucket.sql)
Created a SQL migration that:
- Defines the `is_admin()` helper function used by RLS policies to check if the current user has admin privileges
- Creates the `biometric-data` storage bucket directly in the database
- Sets up proper RLS policies for the bucket to allow authenticated users to:
  - Upload files to their own student folder (`students/{studentId}/...`)
  - Read their own biometric data
  - Update their own biometric data
  - Delete their own biometric data
- Allows admins full access to all biometric data

### 2. Code Changes (src/lib/supabaseStorage.ts)
Updated the TypeScript code to:
- Remove the client-side bucket creation logic (which was failing due to RLS)
- Change `ensureBucketExists()` to only verify the bucket exists, not create it
- Change `initializeBiometricBucket()` to provide helpful error messages if the bucket is missing
- Document that the bucket should be created via the SQL migration

## How to Apply the Fix

### Using Supabase CLI (Recommended)
1. Ensure you have the Supabase CLI installed
2. Link your project (if not already linked):
   ```bash
   supabase link --project-ref YOUR_PROJECT_ID
   ```
3. Apply the migration:
   ```bash
   supabase db push
   ```

### Using Supabase Dashboard (Manual)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/migrations/007_create_biometric_storage_bucket.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### Verification
After applying the migration, you can verify it worked by:

1. In Supabase Dashboard, go to **Storage**
2. You should see a bucket named `biometric-data`
3. Click on the bucket to view its settings:
   - Should be **Private** (not public)
   - Should have file size limit of 50MB
   - Should have allowed MIME types configured

4. Go to **Database** → **Storage** → **policies**
5. You should see 5 new policies for the `storage.objects` table related to the `biometric-data` bucket

## Technical Details

### is_admin() Function
The migration includes a helper function that checks if the current user has admin privileges:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

This function is used in the admin RLS policy to grant full access to biometric data for administrators.

### Storage Policies Created
1. **Allow authenticated users to upload biometric data**: `INSERT` policy for authenticated users
2. **Allow authenticated users to read own biometric data**: `SELECT` policy for authenticated users
3. **Allow authenticated users to update own biometric data**: `UPDATE` policy for authenticated users
4. **Allow authenticated users to delete own biometric data**: `DELETE` policy for authenticated users
5. **Allow admins full access to biometric data**: Full access policy for admin users

### Bucket Configuration
- **Name**: `biometric-data`
- **Public**: `false` (private bucket)
- **File Size Limit**: 50MB (52,428,800 bytes)
- **Allowed MIME Types**:
  - `model/gltf-binary`
  - `model/obj`
  - `application/octet-stream`
  - `image/png`
  - `image/jpeg`
  - `text/plain` (for PLY files)

### File Structure
Files are stored in the bucket with the following path structure:
```
biometric-data/
  students/
    {studentId}/
      pointcloud_{timestamp}.ply
      depthmap_{timestamp}.png
      rgb_{timestamp}.jpg
      mesh_{timestamp}.glb
```

## Testing the Fix
After applying the migration:

1. Navigate to the student signup page
2. Complete the face registration process
3. The biometric data upload should now succeed without errors
4. Check the browser console - you should no longer see the RLS or "Bucket not found" errors

## Rollback (if needed)
If you need to rollback this change:

```sql
-- Remove storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload biometric data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read own biometric data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update own biometric data" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete own biometric data" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins full access to biometric data" ON storage.objects;

-- Remove bucket (WARNING: This will delete all files in the bucket)
DELETE FROM storage.buckets WHERE id = 'biometric-data';
```

## Additional Notes
- The migration is idempotent - it's safe to run multiple times (uses `ON CONFLICT DO NOTHING`)
- Existing functionality is not affected - the code still checks if the bucket exists before operations
- The bucket must be created by a database administrator or via SQL migration - regular users cannot create buckets due to RLS policies
