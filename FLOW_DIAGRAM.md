# Data Flow Diagram: Student Registration with 3D Face Capture

## Before Fix (Broken Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ Student Registration Flow (BEFORE FIX)                          │
└─────────────────────────────────────────────────────────────────┘

Step 1: Basic Info
  ↓
Step 2: Academic Info + Create Account
  ↓
Step 3: Face Capture
  ↓
User enables 3D capture
  ↓
Consent modal → User grants consent
  ↓
3D capture happens → capture3D data generated
  ↓
onCapture(imageData, antiSpoofingResult, capture3D) called
  ↓
❌ handleFaceCapture only accepts 2 parameters
  ↓
❌ capture3D data LOST/IGNORED
  ↓
Student inserted with:
  ✓ face_data (2D image)
  ❌ biometric_consent = false (always!)
  ❌ biometric_consent_date = null
  ❌ 3D data never uploaded
  ❌ 3D URLs never saved
  ↓
Registration complete but 3D data LOST
```

## After Fix (Working Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ Student Registration Flow (AFTER FIX)                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Basic Info
  ↓
Step 2: Academic Info + Create Account
  ↓
Step 3: Face Capture
  ↓
┌─────────────────────────────────────────────────────────────────┐
│ User Decision: Enable 3D Capture?                               │
└─────────────────────────────────────────────────────────────────┘
      │
      ├─── NO ────────────────────────┐
      │                                │
      └─── YES ─────┐                  │
                    │                  │
           Consent modal appears       │
                    │                  │
      ┌─────────────┴─────────────┐   │
      │                            │   │
   GRANT                       DECLINE │
   CONSENT                             │
      │                            │   │
      │                            └───┤
      ↓                                ↓
Store consentData              No 3D capture
      ↓                                │
Multi-view 3D capture                  │
      ↓                                │
capture3D = {                          │
  method: 'photogrammetry',            │
  frames: [...],                       │
  consentData: { ... }                 │
}                                      │
      ↓                                ↓
      └────────────┬───────────────────┘
                   ↓
onCapture(imageData, antiSpoofingResult, capture3D?)
                   ↓
✓ handleFaceCapture receives all 3 parameters
                   ↓
┌──────────────────┴───────────────────────────────────────┐
│ Determine consent: hasConsent = !!capture3D              │
└──────────────────┬───────────────────────────────────────┘
                   ↓
INSERT student with:
  • face_data (2D image + anti-spoofing)
  • biometric_consent = hasConsent ✓
  • biometric_consent_date = hasConsent ? now : null ✓
                   ↓
Get student ID from insert response
                   ↓
┌──────────────────┴───────────────────────────────────────┐
│ IF capture3D exists:                                     │
│   1. Create Face3DCapture object                         │
│   2. Upload to storage                                   │
│      - upload3DFaceData(studentId, face3DData)          │
│   3. Get URLs from uploadResult                          │
│   4. Update student record                               │
│      - updateStudent3DFaceData(studentId, uploadResult) │
│                                                           │
│ Result:                                                   │
│   ✓ face_mesh_url populated                             │
│   ✓ face_pointcloud_url populated                       │
│   ✓ face_depthmap_url populated                         │
│   ✓ face_embedding populated (if computed)              │
│   ✓ face_embedding_algorithm populated (if computed)    │
└───────────────────────────────────────────────────────────┘
                   ↓
Registration complete with ALL data saved ✓
```

## Component Communication

```
┌──────────────────────────────────────────────────────────────┐
│ FaceRecognition Component                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ State:                                                       │
│ • hasConsent: boolean                                        │
│ • consentData: BiometricConsentData | null  ← NEW!          │
│ • enable3DCapture: boolean                                   │
│                                                              │
│ handleConsent(data):                                         │
│   setHasConsent(true)                                        │
│   setConsentData(data)  ← NEW! Store consent                │
│   setEnable3DCapture(true)                                   │
│                                                              │
│ start3DCapture():                                            │
│   1. Perform 3D capture                                      │
│   2. Call onCapture with:                                    │
│      • imageData                                             │
│      • antiSpoofingResult                                    │
│      • capture3D {  ← NEW! Pass consent                      │
│          method,                                             │
│          frames,                                             │
│          consentData  ← NEW!                                 │
│        }                                                     │
└───────────────────┬──────────────────────────────────────────┘
                    │
                    │ props.onCapture(...)
                    ↓
┌──────────────────────────────────────────────────────────────┐
│ StudentSignup Component                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ handleFaceCapture(                                           │
│   imageData,                                                 │
│   antiSpoofingResult,                                        │
│   capture3D?  ← NEW! Now accepts this parameter             │
│ ):                                                           │
│                                                              │
│   1. Validate liveness & confidence                          │
│                                                              │
│   2. Determine consent:                                      │
│      hasConsent = !!capture3D  ← NEW!                        │
│                                                              │
│   3. Insert student:                                         │
│      biometric_consent = hasConsent  ← NEW!                  │
│      biometric_consent_date = hasConsent ? now : null ← NEW! │
│                                                              │
│   4. Get student ID from response  ← NEW!                    │
│                                                              │
│   5. IF capture3D:  ← NEW! Upload 3D data                    │
│      • upload3DFaceData(studentId, face3DData)              │
│      • updateStudent3DFaceData(studentId, urls)             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Database State

### Before Fix
```sql
students table:
┌────────────┬──────────────────────┬─────────────┬──────────────┐
│ field      │ 2D registration      │ 3D attempt  │ Status       │
├────────────┼──────────────────────┼─────────────┼──────────────┤
│ face_data  │ ✓ populated          │ ✓ populated │ WORKING      │
│ biometric_ │ ✗ false              │ ✗ FALSE     │ BROKEN       │
│  consent   │                      │  (WRONG!)   │              │
│ biometric_ │ ✗ null               │ ✗ NULL      │ BROKEN       │
│  consent_  │                      │  (WRONG!)   │              │
│  date      │                      │             │              │
│ face_mesh_ │ ✗ null               │ ✗ NULL      │ BROKEN       │
│  url       │ (expected)           │  (WRONG!)   │              │
│ face_point │ ✗ null               │ ✗ NULL      │ BROKEN       │
│  cloud_url │ (expected)           │  (WRONG!)   │              │
│ face_depth │ ✗ null               │ ✗ NULL      │ BROKEN       │
│  map_url   │ (expected)           │  (WRONG!)   │              │
│ face_      │ ✗ null               │ ✗ NULL      │ BROKEN       │
│  embedding │ (expected)           │  (WRONG!)   │              │
└────────────┴──────────────────────┴─────────────┴──────────────┘
```

### After Fix
```sql
students table:
┌────────────┬──────────────────────┬─────────────┬──────────────┐
│ field      │ 2D registration      │ 3D attempt  │ Status       │
├────────────┼──────────────────────┼─────────────┼──────────────┤
│ face_data  │ ✓ populated          │ ✓ populated │ WORKING      │
│ biometric_ │ ✓ false              │ ✓ TRUE      │ ✓ FIXED      │
│  consent   │ (correct)            │  (CORRECT!) │              │
│ biometric_ │ ✓ null               │ ✓ TIMESTAMP │ ✓ FIXED      │
│  consent_  │ (correct)            │  (CORRECT!) │              │
│  date      │                      │             │              │
│ face_mesh_ │ ✓ null               │ ✓ URL       │ ✓ FIXED      │
│  url       │ (expected)           │  (CORRECT!) │              │
│ face_point │ ✓ null               │ ✓ URL       │ ✓ FIXED      │
│  cloud_url │ (expected)           │  (CORRECT!) │              │
│ face_depth │ ✓ null               │ ✓ URL       │ ✓ FIXED      │
│  map_url   │ (expected)           │  (CORRECT!) │              │
│ face_      │ ✓ null               │ ✓ BASE64    │ ✓ FIXED      │
│  embedding │ (expected)           │  (CORRECT!) │              │
└────────────┴──────────────────────┴─────────────┴──────────────┘
```

## Key Changes Summary

1. **Parameter Addition**: Added `capture3D` parameter to `handleFaceCapture`
2. **Consent Storage**: Store and pass `consentData` through the capture flow
3. **Consent Persistence**: Set `biometric_consent` and `biometric_consent_date` during insert
4. **ID Retrieval**: Get student ID from insert response
5. **3D Upload**: Upload 3D data to storage if available
6. **URL Update**: Update student record with storage URLs

## Error Handling

```
┌──────────────────────────────────────────────────────────────┐
│ Error Scenarios Handled                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. 3D Upload Fails:                                          │
│    → Log error, continue registration                        │
│    → User sees success message                               │
│    → Basic 2D registration still works                       │
│                                                              │
│ 2. No 3D Data:                                               │
│    → Skip upload step                                        │
│    → biometric_consent = false                               │
│    → Normal 2D registration                                  │
│                                                              │
│ 3. Insert Fails:                                             │
│    → Show error to user                                      │
│    → Don't proceed to 3D upload                              │
│    → User can retry                                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
