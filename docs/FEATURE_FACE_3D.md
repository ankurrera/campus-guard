# 3D Face Capture Feature

## Overview

The 3D Face Capture feature enhances the biometric attendance system with support for capturing and processing 3D facial data. This provides improved security, anti-spoofing capabilities, and more accurate face recognition.

## Features

### 1. Device Capability Detection
- Automatically detects device capabilities for depth sensing
- Supports WebXR Depth Sensing API (experimental)
- Checks for LiDAR support (iOS devices)
- Checks for ARCore Depth API (Android devices)
- Provides photogrammetry fallback for all devices

### 2. Capture Methods

#### Photogrammetry (Multi-View Capture)
- Available on all devices as a fallback
- Guides users through a 10-second capture process
- Captures 30 frames while user rotates head
- Provides real-time progress feedback
- Suitable for server-side 3D reconstruction

#### WebXR Depth Sensing (Experimental)
- Uses browser WebXR API when available
- Requires supported device and browser
- Currently a stub implementation requiring full WebXR session setup

#### Native Depth (Capacitor Plugin)
- LiDAR support for iOS devices via Capacitor bridge
- ARCore Depth API for Android devices via Capacitor bridge
- Real-time depth capture from native sensors
- High-quality depth data (< 1cm accuracy for LiDAR)

### 3. Biometric Consent Management
- Required consent dialog before 3D capture
- Complies with privacy regulations
- Clear explanation of data usage
- User rights information (access, deletion, withdrawal)
- Consent tracking in database

### 4. Data Storage
- Secure storage in Supabase Storage
- Encrypted at rest
- Private bucket with access controls
- Supports multiple formats:
  - Point clouds (.ply)
  - Depth maps (.png)
  - Mesh files (.glb, .obj)
  - Face embeddings (JSON/base64)

### 5. Enhanced Anti-Spoofing
- Depth-based spoofing detection
- Variance analysis across face region
- Combined with existing 2D heuristics
- Detects flat surfaces (photos, screens)

## Database Schema

### New Fields in `students` Table

```sql
face_mesh_url            TEXT           -- URL to 3D mesh file
face_pointcloud_url      TEXT           -- URL to point cloud file
face_depthmap_url        TEXT           -- URL to depth map image
face_embedding           TEXT           -- Face embedding vector (base64)
face_embedding_algorithm TEXT           -- Algorithm identifier
biometric_consent        BOOLEAN        -- User consent flag
biometric_consent_date   TIMESTAMP      -- Consent timestamp
```

### New Fields in `teaching_assistants` Table
Same fields as students table.

## API Reference

### Core Functions

#### `detectDeviceCapabilities()`
Detects device capabilities for 3D capture.

```typescript
const capabilities = await detectDeviceCapabilities();
// Returns: DeviceCapabilities object
```

#### `PhotogrammetryCapture.start()`
Starts multi-view capture process.

```typescript
const controller = new PhotogrammetryCapture();
const result = await controller.start(videoElement, onProgress);
// Returns: PhotogrammetryCapture result with frames
```

#### `upload3DFaceData()`
Uploads 3D face data to Supabase Storage.

```typescript
const result = await upload3DFaceData(studentId, capture);
// Returns: UploadResult with URLs
```

#### `updateBiometricConsent()`
Updates student biometric consent status.

```typescript
await updateBiometricConsent(studentId, true);
```

### Data Structures

#### `Face3DCapture`
```typescript
{
  method: CaptureMethod;
  timestamp: Date;
  rgbFrame?: string;
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
  deviceInfo: { ... };
}
```

#### `BiometricConsentData`
```typescript
{
  consent: boolean;
  consentDate: Date;
  purposes: string[];
}
```

## Usage Guide

### Enabling 3D Capture in UI

1. **Check Device Capabilities**
   - Component automatically detects capabilities on mount
   - Shows 3D toggle if supported methods are available

2. **Request User Consent**
   - Toggle triggers consent modal
   - User must accept terms before enabling

3. **Capture Process**
   - For photogrammetry: 3-second countdown, 10-second guided capture
   - User slowly rotates head left and right
   - Real-time progress indicator shows frame count

4. **Data Upload**
   - Frames are processed and uploaded to storage
   - Database is updated with file URLs
   - Face embedding is computed and stored

### Example Integration

```typescript
<FaceRecognition
  mode="capture"
  studentId={currentStudent.id}
  onCapture={async (imageData, antiSpoofing, capture3D) => {
    if (capture3D) {
      // Handle 3D capture data
      const uploadResult = await upload3DFaceData(
        studentId, 
        capture3D
      );
      
      await updateStudent3DFaceData(
        studentId,
        uploadResult,
        embedding,
        'face-api-v1'
      );
    } else {
      // Handle 2D capture as before
      await saveStudentFaceData(studentId, imageData);
    }
  }}
/>
```

## Privacy & Security

### Data Protection
- All biometric data encrypted at rest
- Private storage buckets with access controls
- No third-party sharing
- Compliance with GDPR/CCPA guidelines

### User Rights
- **Right to Access**: View stored biometric data
- **Right to Delete**: Remove all biometric data
- **Right to Withdraw**: Revoke consent anytime
- **Data Portability**: Export data on request

### Retention Policy
- Raw capture frames: 90 days (configurable)
- Processed meshes: Retained while account active
- Face embeddings: Retained for matching
- Automatic cleanup of old/unused data

## Configuration

### Environment Variables

```bash
# Enable 3D face capture feature
VITE_ENABLE_FACE_3D_CAPTURE=true

# Biometric data retention (days)
VITE_BIOMETRIC_RETENTION_DAYS=90

# Max file size for uploads (bytes)
VITE_MAX_BIOMETRIC_FILE_SIZE=52428800
```

### Feature Flags

The feature can be disabled by setting `VITE_ENABLE_FACE_3D_CAPTURE=false` or removing the variable.

## Testing

### Manual Testing Checklist

- [ ] 3D toggle appears on supported devices
- [ ] Consent modal displays with all information
- [ ] Declining consent disables 3D capture
- [ ] Accepting consent enables feature
- [ ] Multi-view capture shows countdown
- [ ] Progress bar updates during capture
- [ ] All 30 frames are captured
- [ ] Files upload to storage successfully
- [ ] Database records are updated
- [ ] Can capture 2D when 3D is disabled
- [ ] Stop button works during capture
- [ ] Error handling for failed uploads

### Browser Compatibility

| Browser | Photogrammetry | WebXR Depth |
|---------|----------------|-------------|
| Chrome  | ✅ Yes         | 🧪 Experimental |
| Firefox | ✅ Yes         | ❌ No       |
| Safari  | ✅ Yes         | ❌ No       |
| Edge    | ✅ Yes         | 🧪 Experimental |

### Device Support

| Platform | Depth Sensor | Native Support |
|----------|--------------|----------------|
| iOS 14+  | LiDAR/TrueDepth | ✅ Capacitor Plugin |
| Android 10+ | ARCore Depth | ✅ Capacitor Plugin |
| Desktop  | N/A          | ✅ Photogrammetry |
| Mobile   | Varies       | ✅ Photogrammetry |

## Troubleshooting

### Common Issues

**Issue**: 3D toggle doesn't appear
- Check environment variable is set
- Verify device capabilities detection
- Check browser console for errors

**Issue**: Capture fails after countdown
- Verify camera permissions
- Check network connectivity
- Ensure adequate lighting

**Issue**: Files not uploading
- Check Supabase Storage configuration
- Verify bucket exists and has correct policies
- Check file size limits

**Issue**: Consent modal doesn't show
- Verify BiometricConsentModal is imported
- Check state management for showConsentModal

## Future Enhancements

### Planned Features
- [x] Native mobile integration (Capacitor plugin)
- [x] Server-side 3D reconstruction from frames
- [x] Real-time depth visualization
- [x] Face embedding computation from 3D data
- [x] Supabase Edge Functions for processing
- [ ] Multiple mesh format support (partial - PLY, OBJ supported)
- [ ] Face embedding comparison algorithms (basic implementation)
- [ ] Automatic quality assessment (basic implementation)
- [ ] Progressive enhancement for better devices

### Integration Points
- ✅ Supabase Edge Functions for processing (`process-3d-face`, `reconstruct-3d`)
- ✅ OpenMVG/COLMAP for reconstruction (Docker-based)
- ✅ Three.js for mesh visualization (DepthVisualizer component)
- ✅ Custom 3D face embedding computation library

### New Components

#### Capacitor Native Depth Plugin
- `src/plugins/NativeDepthCapture.ts` - Plugin interface
- `src/plugins/NativeDepthCaptureWeb.ts` - Web fallback implementation
- `src/lib/depthAdapters/native.ts` - Native depth adapter

#### 3D Visualization
- `src/components/3d/DepthVisualizer.tsx` - Real-time Three.js visualization
- Supports point clouds and depth maps
- Auto-rotation and interactive viewing

#### Face Embedding
- `src/lib/face3dEmbedding.ts` - 3D face embedding computation
- Geometric feature extraction
- Depth-based features
- Embedding similarity calculation

#### Edge Functions
- `supabase/functions/process-3d-face/` - Face data processing
- `supabase/functions/reconstruct-3d/` - Server-side reconstruction

#### Docker Support
- `docker/Dockerfile.reconstruction` - OpenMVG/COLMAP container
- `docker/scripts/reconstruct.sh` - Reconstruction pipeline script

## Support

For issues or questions, please refer to:
- GitHub Issues: https://github.com/ankurrera/campus-guard/issues
- Documentation: README.md
- Privacy Policy: Contact administrator

## License

This feature is part of the Campus Guard project and follows the same license terms.
