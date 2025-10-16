# Face Matching Testing Guide

## Overview

This guide provides instructions for testing the face matching implementation in the Campus Guard biometric attendance system.

## Prerequisites

1. **Face-api.js models**: Ensure models are available in `/public/models/`
2. **Database**: PostgreSQL with students table having face_embedding fields
3. **Camera access**: Working webcam for face capture
4. **Test accounts**: Multiple student accounts for testing

## Testing Phases

### Phase 1: Unit Tests (Automated)

Test the core face matching utilities:

```bash
# Run the test script (if configured)
npm test

# Or manually execute:
node -r ts-node/register test/faceMatching.test.ts
```

**What it tests:**
- Face descriptor comparison logic
- Similarity threshold behavior
- Serialization/deserialization
- Validation functions
- Error handling

**Expected results:**
- All 8 tests should pass ✅
- Similarity scores should be consistent
- Threshold behavior should be correct

### Phase 2: Registration Flow Testing

Test student registration with face capture:

#### Test Case 1: Successful Registration

**Steps:**
1. Navigate to `/student/signup`
2. Fill in all required fields
3. Submit the form
4. When prompted, allow camera access
5. Position your face in the camera view
6. Wait for face detection (mesh overlay appears)
7. Click "Capture Face"
8. Wait for liveness check to pass
9. Verify face descriptor is computed
10. Complete registration

**Expected results:**
- ✅ Green "Live face verified" badge appears
- ✅ Face descriptor computed successfully
- ✅ Registration completes without errors
- ✅ Database stores face_embedding and algorithm
- ✅ Success message displays

**What to check in database:**
```sql
SELECT 
  id, 
  name, 
  face_embedding IS NOT NULL as has_embedding,
  face_embedding_algorithm,
  LENGTH(face_embedding) as embedding_size
FROM students 
WHERE email = 'test@student.edu';
```

Expected output:
- `has_embedding`: true
- `face_embedding_algorithm`: "face-api.js-facenet"
- `embedding_size`: ~600-800 characters (JSON array)

#### Test Case 2: Registration with Poor Lighting

**Steps:**
1. Start registration process
2. Use poor lighting (very dark or very bright)
3. Attempt face capture

**Expected results:**
- ⚠️ Low confidence warning may appear
- ⚠️ Face descriptor may fail to compute
- ✅ Clear error message displayed
- ✅ User can retry with better lighting

#### Test Case 3: Registration with Photo/Screen

**Steps:**
1. Start registration process
2. Hold up a photo or show screen with face
3. Attempt capture

**Expected results:**
- ❌ Liveness check should fail
- ❌ "Photo spoofing detected" or "Screen display detected"
- ❌ Registration is blocked

### Phase 3: Attendance Flow Testing

Test face matching during attendance:

#### Test Case 4: Successful Attendance (Same User)

**Steps:**
1. Register a test student (save credentials)
2. Log out
3. Log in with same credentials
4. Navigate to dashboard
5. Click "Mark Attendance"
6. Ensure you're on campus (or bypass geofence for testing)
7. Allow camera access
8. Position face in camera
9. Click "Verify Face"
10. Wait for verification

**Expected results:**
- ✅ Face match successful (similarity ≥60%)
- ✅ Attendance marked successfully
- ✅ Success message shows match percentage
- ✅ Database has attendance record with face match score

**What to check in database:**
```sql
SELECT 
  id,
  student_id,
  status,
  location->>'faceMatchScore' as face_match_score,
  location->>'securityScore' as security_score,
  created_at
FROM attendance_records 
WHERE student_id = 'test-student-id'
ORDER BY created_at DESC 
LIMIT 1;
```

Expected output:
- `status`: "present"
- `face_match_score`: ≥0.6 (60%)
- `security_score`: ≥0.6

#### Test Case 5: Failed Attendance (Different User)

**Steps:**
1. Register Student A
2. Log out
3. Register Student B (different person)
4. Log out
5. Log in as Student A
6. Navigate to dashboard
7. Have Student B present their face to camera
8. Click "Verify Face"

**Expected results:**
- ❌ Face mismatch detected
- ❌ Similarity score <60%
- ❌ Attendance NOT marked
- ❌ Clear error message: "Face mismatch detected! Similarity: XX%"
- ✅ Event logged for security review

#### Test Case 6: Attendance with Different Conditions

Test the same user under various conditions:

**Conditions to test:**
- Different lighting (morning vs evening)
- Different expressions (smiling, neutral, etc.)
- With/without glasses
- Different angles (straight on, slightly tilted)
- After time has passed (hours or days later)

**Expected results:**
- ✅ Should still match (similarity ≥60%)
- ⚠️ Similarity may be slightly lower but still above threshold
- ✅ Attendance marked successfully

#### Test Case 7: Threshold Edge Cases

**Steps:**
1. Register a student
2. Modify threshold in code temporarily for testing
3. Test with various similarity scores

**Test scenarios:**
- Similarity = 0.65 (above threshold) → Should match ✅
- Similarity = 0.60 (at threshold) → Should match ✅
- Similarity = 0.59 (below threshold) → Should NOT match ❌

### Phase 4: Security Testing

#### Test Case 8: Photo Attack Prevention

**Steps:**
1. Register a student with live face
2. Take a photo of that student's face
3. Log in as that student
4. Show the photo to camera during attendance
5. Attempt verification

**Expected results:**
- ❌ Liveness check fails before face matching
- ❌ "Photo spoofing detected"
- ❌ Attendance NOT marked

#### Test Case 9: Video Playback Attack

**Steps:**
1. Register a student with live face
2. Record a video of that student
3. Log in as that student
4. Play video on another device
5. Show video to camera during attendance

**Expected results:**
- ❌ Liveness check detects video playback
- ❌ "Video playback detected"
- ❌ Attendance NOT marked

#### Test Case 10: Screen Display Attack

**Steps:**
1. Register a student with live face
2. Open student's photo on another screen
3. Log in as that student
4. Show screen to camera during attendance

**Expected results:**
- ❌ Liveness check detects screen
- ❌ "Screen display detected"
- ❌ Attendance NOT marked

### Phase 5: Performance Testing

#### Test Case 11: Descriptor Computation Speed

**Steps:**
1. Start registration
2. Capture face
3. Measure time to compute descriptor

**Expected results:**
- ✅ Computation completes in <500ms
- ✅ No UI freezing during computation
- ✅ Clear loading indicator shown

#### Test Case 12: Face Comparison Speed

**Steps:**
1. During attendance verification
2. Measure time from capture to match result

**Expected results:**
- ✅ Comparison completes in <100ms
- ✅ Total verification (including liveness) <2 seconds
- ✅ Responsive UI throughout

### Phase 6: Edge Cases

#### Test Case 13: No Face Detected

**Steps:**
1. Start face capture
2. Don't show face to camera (empty room)
3. Attempt capture

**Expected results:**
- ❌ "No face detected" error
- ❌ Cannot proceed
- ✅ Clear guidance to position face

#### Test Case 14: Multiple Faces

**Steps:**
1. Start face capture
2. Have 2+ people in camera view
3. Attempt capture

**Expected results:**
- ❌ "Multiple faces detected" error
- ❌ Verification blocked
- ✅ Instruction to have only one person

#### Test Case 15: Face Too Far/Close

**Steps:**
1. Start face capture
2. Position face very far or very close
3. Attempt capture

**Expected results:**
- ⚠️ May succeed but with lower confidence
- ⚠️ May fail if face too small/large
- ✅ Retry option available

## Testing Checklist

Use this checklist to track testing progress:

### Registration
- [ ] Successful registration with valid face
- [ ] Registration with poor lighting
- [ ] Registration blocks photo attacks
- [ ] Face embedding stored correctly in DB
- [ ] Algorithm field populated correctly

### Attendance (Same User)
- [ ] Successful attendance with same user
- [ ] Works with different lighting
- [ ] Works with different expressions
- [ ] Works with glasses (if registered with them)
- [ ] Match score ≥60%

### Attendance (Different User)
- [ ] Attendance blocked for different user
- [ ] Face mismatch detected correctly
- [ ] Similarity score <60%
- [ ] Clear error message shown
- [ ] Event logged for security

### Security
- [ ] Photo attacks blocked by liveness
- [ ] Video attacks blocked by liveness
- [ ] Screen attacks blocked by liveness
- [ ] Multiple faces rejected
- [ ] No face scenario handled

### Performance
- [ ] Descriptor computation <500ms
- [ ] Face comparison <100ms
- [ ] UI remains responsive
- [ ] No memory leaks after multiple captures

### Error Handling
- [ ] Clear error messages
- [ ] Retry options available
- [ ] Failed attempts logged
- [ ] No crashes or freezes

## Debugging Guide

### Issue: "Failed to compute face descriptor"

**Possible causes:**
- Poor lighting
- Face too far/close
- Models not loaded
- Face partially obscured

**Debug steps:**
1. Check browser console for errors
2. Verify models loaded: Check Network tab for 404s
3. Test with better lighting
4. Ensure face is clearly visible

### Issue: "Face mismatch detected" for same user

**Possible causes:**
- Significant appearance change
- Poor quality capture
- Threshold too high
- Different person

**Debug steps:**
1. Check similarity score in console
2. If score is close to threshold (55-65%), may need adjustment
3. Try recapturing with better lighting
4. Verify user identity
5. Consider re-registering if appearance changed significantly

### Issue: Liveness check passes for photo

**Possible causes:**
- High-quality photo with texture
- Motion detected in photo
- Threshold needs adjustment

**Debug steps:**
1. Review anti-spoofing scores in console
2. Check depth analysis score
3. Adjust liveness threshold if needed
4. Consider additional security measures

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Delete test attendance records
DELETE FROM attendance_records 
WHERE student_id IN (
  SELECT id FROM students WHERE email LIKE 'test%@%'
);

-- Delete test students
DELETE FROM students WHERE email LIKE 'test%@%';

-- Delete test user accounts
-- (Use Supabase dashboard or appropriate auth cleanup)
```

## Monitoring in Production

Once deployed, monitor these metrics:

1. **Match Rate**: % of successful matches
2. **False Positives**: Different person accepted
3. **False Negatives**: Same person rejected
4. **Average Similarity**: Track over time
5. **Liveness Failures**: Count and types
6. **Performance**: Computation times

Set up alerts for:
- Match rate drops below 95%
- False positive rate exceeds 1%
- Computation time exceeds 1 second
- High liveness failure rate

## Conclusion

Following this testing guide ensures the face matching system works correctly and securely. All tests should pass before deploying to production.

For issues or questions, refer to FACE_MATCHING_IMPLEMENTATION.md or contact the development team.
