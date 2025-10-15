# Testing Guide for 3D Face Data and Biometric Consent Fix

## Overview
This document describes how to manually test the fixes for storing 3D face data and biometric consent during student registration.

## Issue Fixed
Previously, the following database columns were always empty after student registration:
- `face_mesh_url`
- `face_pointcloud_url`
- `face_depthmap_url`
- `face_embedding`
- `face_embedding_algorithm`
- `biometric_consent` (always false)
- `biometric_consent_date` (always null)

## Changes Made

### 1. StudentSignup.tsx
- Updated `handleFaceCapture` to accept a third parameter `capture3D`
- When 3D capture is used, `biometric_consent` is set to `true` and `biometric_consent_date` is set to the current timestamp
- After student insert, the student ID is retrieved from the insert response
- If 3D capture data exists, it's uploaded to storage and the student record is updated with URLs

### 2. FaceRecognition.tsx
- Added `consentData` state to store biometric consent information
- When consent is granted, it's stored in state
- The consent data is passed along with capture3D data to the parent component

## Manual Testing

### Test Case 1: Normal 2D Face Registration
1. Navigate to student signup page
2. Fill in all required fields (steps 1 and 2)
3. On step 3 (Face Registration), do NOT enable "3D Face Capture"
4. Capture your face normally
5. Complete registration

**Expected Result:**
- Student record is created
- `face_data` column contains the 2D image and anti-spoofing data
- `biometric_consent` = `false`
- `biometric_consent_date` = `null`
- 3D data columns remain empty

### Test Case 2: 3D Face Registration with Consent
1. Navigate to student signup page
2. Fill in all required fields (steps 1 and 2)
3. On step 3 (Face Registration), toggle ON "Enable 3D Face Capture"
4. A consent modal should appear
5. Read the consent form and check all required boxes
6. Click "I Consent"
7. Follow the 3D capture instructions (multi-view capture)
8. Complete registration

**Expected Result:**
- Student record is created
- `face_data` column contains the 2D image and anti-spoofing data with `has3DCapture: true`
- `biometric_consent` = `true`
- `biometric_consent_date` = timestamp of consent
- 3D data columns may be populated if upload succeeds:
  - `face_mesh_url` (if mesh data available)
  - `face_pointcloud_url` (if point cloud data available)
  - `face_depthmap_url` (if depth map data available)
  - `face_embedding` (if embedding computed)
  - `face_embedding_algorithm` (if embedding computed)

### Test Case 3: 3D Face Registration - Consent Declined
1. Navigate to student signup page
2. Fill in all required fields (steps 1 and 2)
3. On step 3 (Face Registration), toggle ON "Enable 3D Face Capture"
4. A consent modal should appear
5. Click "Decline"
6. The 3D toggle should be turned off
7. Capture your face normally (2D mode)
8. Complete registration

**Expected Result:**
- Same as Test Case 1 (normal 2D registration)
- `biometric_consent` = `false`

## Database Verification

After completing a test, verify the database records:

```sql
-- Check the student record
SELECT 
  id,
  name,
  email,
  biometric_consent,
  biometric_consent_date,
  face_mesh_url,
  face_pointcloud_url,
  face_depthmap_url,
  face_embedding IS NOT NULL as has_embedding,
  face_embedding_algorithm
FROM students
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Check face_data JSON structure
SELECT 
  name,
  email,
  face_data::json->'has3DCapture' as has_3d_capture,
  face_data::json->'antiSpoofingResult'->>'confidence' as confidence
FROM students
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

## Troubleshooting

### 3D Data Not Uploaded
If 3D data columns remain empty even when consent was granted:
1. Check browser console for errors during upload
2. Verify the biometric-data storage bucket exists in Supabase
3. Check that the student has proper RLS policies for the students table
4. The upload may fail silently - check server logs

### Consent Always False
If `biometric_consent` is always false:
1. Verify that the 3D capture toggle was enabled
2. Check that the consent modal was completed (not declined)
3. Ensure the `capture3D` parameter is being passed correctly

### Build/Runtime Errors
If you encounter TypeScript errors:
1. Run `npm install` to ensure all dependencies are installed
2. Run `npm run build` to verify the build succeeds
3. Check that all imports are correct

## Notes

- The 3D capture feature requires device support (depth sensors, WebXR, or photogrammetry)
- Not all devices will show the 3D capture option
- 3D data upload is a best-effort process - registration will succeed even if upload fails
- The actual 3D reconstruction from photogrammetry frames would typically happen server-side
