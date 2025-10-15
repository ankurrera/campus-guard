# Native Mobile Integration Guide

This guide explains how to integrate the Campus Guard 3D face capture with native mobile platforms using Capacitor.

## Overview

The native mobile integration provides access to:
- **iOS LiDAR** sensors (iPhone 12 Pro and later, iPad Pro 2020 and later)
- **Android ARCore Depth API** (supported Android 10+ devices)
- High-precision depth data for improved face recognition
- Real-time depth visualization

## Prerequisites

1. **Capacitor CLI**
   ```bash
   npm install -g @capacitor/cli
   ```

2. **Platform-specific tools**
   - iOS: Xcode 13+ and CocoaPods
   - Android: Android Studio and Android SDK

## Setup

### 1. Initialize Capacitor

```bash
# Already configured in capacitor.config.ts
npx cap init
```

### 2. Add Platforms

```bash
# Add iOS platform
npx cap add ios

# Add Android platform
npx cap add android
```

### 3. Build Web Assets

```bash
npm run build
```

### 4. Sync Platforms

```bash
npx cap sync
```

## iOS Implementation

### Step 1: Create Native Plugin

Create `ios/App/App/Plugins/NativeDepthCapturePlugin.swift`:

```swift
import Foundation
import Capacitor
import ARKit

@objc(NativeDepthCapturePlugin)
public class NativeDepthCapturePlugin: CAPPlugin, ARSessionDelegate {
    private var arSession: ARSession?
    private var currentDepthData: CVPixelBuffer?
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            let hasLiDAR = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
            call.resolve([
                "available": hasLiDAR,
                "method": hasLiDAR ? "lidar" : nil
            ])
        } else {
            call.resolve([
                "available": false,
                "method": nil
            ])
        }
    }
    
    @objc func initialize(_ call: CAPPluginCall) {
        guard #available(iOS 14.0, *),
              ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else {
            call.reject("LiDAR not available")
            return
        }
        
        arSession = ARSession()
        arSession?.delegate = self
        
        let configuration = ARWorldTrackingConfiguration()
        configuration.frameSemantics = .sceneDepth
        
        arSession?.run(configuration)
        call.resolve(["success": true])
    }
    
    @objc func captureDepthFrame(_ call: CAPPluginCall) {
        guard let session = arSession,
              let frame = session.currentFrame,
              let depthData = frame.sceneDepth?.depthMap else {
            call.reject("No depth data available")
            return
        }
        
        // Convert depth data to array
        let width = CVPixelBufferGetWidth(depthData)
        let height = CVPixelBufferGetHeight(depthData)
        
        CVPixelBufferLockBaseAddress(depthData, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthData, .readOnly) }
        
        guard let baseAddress = CVPixelBufferGetBaseAddress(depthData) else {
            call.reject("Failed to access depth data")
            return
        }
        
        let floatBuffer = baseAddress.assumingMemoryBound(to: Float32.self)
        var depthArray: [Float] = []
        depthArray.reserveCapacity(width * height)
        
        for i in 0..<(width * height) {
            depthArray.append(floatBuffer[i])
        }
        
        // Get RGB frame
        let imageBuffer = frame.capturedImage
        guard let jpegData = convertPixelBufferToJPEG(imageBuffer) else {
            call.reject("Failed to convert RGB frame")
            return
        }
        
        call.resolve([
            "success": true,
            "depthData": [
                "width": width,
                "height": height,
                "data": depthArray,
                "format": "float32"
            ],
            "rgbData": jpegData.base64EncodedString(),
            "timestamp": Date().timeIntervalSince1970 * 1000
        ])
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        arSession?.pause()
        arSession = nil
        call.resolve(["success": true])
    }
    
    @objc func getCapabilities(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            let hasLiDAR = ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
            call.resolve([
                "hasLiDAR": hasLiDAR,
                "hasARCore": false,
                "maxDepthRange": 5.0,
                "minDepthRange": 0.0,
                "resolution": [
                    "width": 256,
                    "height": 192
                ]
            ])
        } else {
            call.resolve([
                "hasLiDAR": false,
                "hasARCore": false,
                "maxDepthRange": 0,
                "minDepthRange": 0,
                "resolution": ["width": 0, "height": 0]
            ])
        }
    }
    
    private func convertPixelBufferToJPEG(_ pixelBuffer: CVPixelBuffer) -> Data? {
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        let context = CIContext()
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            return nil
        }
        let uiImage = UIImage(cgImage: cgImage)
        return uiImage.jpegData(compressionQuality: 0.8)
    }
}
```

### Step 2: Register Plugin

Update `ios/App/App/capacitor.config.json`:

```json
{
  "plugins": {
    "NativeDepthCapture": {
      "ios": {
        "source": "Plugins/NativeDepthCapturePlugin.swift"
      }
    }
  }
}
```

### Step 3: Update Info.plist

Add camera and AR permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access for face recognition and 3D capture</string>
<key>NSFaceIDUsageDescription</key>
<string>We use Face ID for secure biometric authentication</string>
```

## Android Implementation

### Step 1: Create Native Plugin

Create `android/app/src/main/java/com/campusguard/app/NativeDepthCapturePlugin.java`:

```java
package com.campusguard.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ar.core.ArCoreApk;
import com.google.ar.core.Config;
import com.google.ar.core.Frame;
import com.google.ar.core.Session;
import com.google.ar.core.exceptions.CameraNotAvailableException;
import com.google.ar.core.exceptions.UnavailableException;

import android.graphics.Bitmap;
import android.media.Image;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.nio.FloatBuffer;

@CapacitorPlugin(name = "NativeDepthCapture")
public class NativeDepthCapturePlugin extends Plugin {
    private Session arSession;
    
    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            ArCoreApk.Availability availability = ArCoreApk.getInstance()
                .checkAvailability(getContext());
            
            boolean hasARCore = availability.isSupported();
            
            JSObject ret = new JSObject();
            ret.put("available", hasARCore);
            ret.put("method", hasARCore ? "arcore" : null);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to check ARCore availability", e);
        }
    }
    
    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            arSession = new Session(getContext());
            
            Config config = arSession.getConfig();
            config.setDepthMode(Config.DepthMode.AUTOMATIC);
            arSession.configure(config);
            
            arSession.resume();
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (UnavailableException | CameraNotAvailableException e) {
            call.reject("Failed to initialize ARCore", e);
        }
    }
    
    @PluginMethod
    public void captureDepthFrame(PluginCall call) {
        if (arSession == null) {
            call.reject("AR session not initialized");
            return;
        }
        
        try {
            Frame frame = arSession.update();
            Image depthImage = frame.acquireDepthImage();
            Image cameraImage = frame.acquireCameraImage();
            
            if (depthImage == null || cameraImage == null) {
                call.reject("No depth data available");
                return;
            }
            
            // Convert depth image to float array
            int width = depthImage.getWidth();
            int height = depthImage.getHeight();
            FloatBuffer depthBuffer = FloatBuffer.allocate(width * height);
            
            // ARCore depth is in mm, convert to meters
            for (int i = 0; i < width * height; i++) {
                depthBuffer.put(i, depthImage.getPlanes()[0].getBuffer().getShort(i * 2) / 1000.0f);
            }
            
            // Convert camera image to JPEG
            Bitmap bitmap = imageToBitmap(cameraImage);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
            String rgbBase64 = Base64.encodeToString(baos.toByteArray(), Base64.DEFAULT);
            
            JSObject depthData = new JSObject();
            depthData.put("width", width);
            depthData.put("height", height);
            depthData.put("data", depthBuffer.array());
            depthData.put("format", "float32");
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("depthData", depthData);
            ret.put("rgbData", rgbBase64);
            ret.put("timestamp", System.currentTimeMillis());
            
            depthImage.close();
            cameraImage.close();
            
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to capture depth frame", e);
        }
    }
    
    @PluginMethod
    public void stop(PluginCall call) {
        if (arSession != null) {
            arSession.pause();
            arSession.close();
            arSession = null;
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
    
    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("hasLiDAR", false);
        ret.put("hasARCore", arSession != null);
        ret.put("maxDepthRange", 8.0);
        ret.put("minDepthRange", 0.2);
        
        JSObject resolution = new JSObject();
        resolution.put("width", 160);
        resolution.put("height", 120);
        ret.put("resolution", resolution);
        
        call.resolve(ret);
    }
    
    private Bitmap imageToBitmap(Image image) {
        // Convert YUV_420_888 to RGB
        // Implementation details omitted for brevity
        return Bitmap.createBitmap(image.getWidth(), image.getHeight(), Bitmap.Config.ARGB_8888);
    }
}
```

### Step 2: Update build.gradle

Add ARCore dependency:

```gradle
dependencies {
    implementation 'com.google.ar:core:1.40.0'
    // ... other dependencies
}
```

### Step 3: Update AndroidManifest.xml

Add camera permission:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.ar" android:required="false" />

<application>
    <meta-data android:name="com.google.ar.core" android:value="optional" />
</application>
```

## Usage in Application

### Basic Integration

```typescript
import NativeDepthCapture from '../plugins/NativeDepthCapture';
import { captureNative3DFace } from '../lib/depthAdapters/native';

// Check availability
const availability = await NativeDepthCapture.isAvailable();
console.log('Native depth available:', availability.available);
console.log('Method:', availability.method);

// Capture 3D face
if (availability.available) {
  const capture = await captureNative3DFace((progress) => {
    console.log('Capture progress:', progress);
  });
  
  if (capture) {
    console.log('Capture successful!');
    console.log('Method:', capture.method);
    console.log('Depth map size:', capture.depthMap?.width, 'x', capture.depthMap?.height);
  }
}
```

### Integration with FaceRecognition Component

Update the component to use native depth when available:

```typescript
import { captureNative3DFace } from '../lib/depthAdapters/native';

// In the capture handler
const handleCapture = async () => {
  // Try native depth first
  const nativeCapture = await captureNative3DFace();
  
  if (nativeCapture) {
    // Use native depth data
    onCapture(nativeCapture.rgbFrame, spoofingResult, {
      method: nativeCapture.method,
      depthMap: nativeCapture.depthMap,
    });
  } else {
    // Fall back to photogrammetry
    await start3DCapture();
  }
};
```

## Building and Running

### iOS

```bash
# Sync and open in Xcode
npx cap sync ios
npx cap open ios

# Build in Xcode or via command line
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release
```

### Android

```bash
# Sync and open in Android Studio
npx cap sync android
npx cap open android

# Build via Gradle
cd android
./gradlew assembleRelease
```

## Testing

### iOS Testing (requires device with LiDAR)
- iPhone 12 Pro / Pro Max
- iPhone 13 Pro / Pro Max
- iPhone 14 Pro / Pro Max
- iPhone 15 Pro / Pro Max
- iPad Pro (2020 or later)

### Android Testing (requires ARCore support)
- Google Pixel 4 and later
- Samsung Galaxy S10 and later (select models)
- OnePlus 8 and later

Use `adb devices` and Chrome DevTools for debugging.

## Troubleshooting

### iOS Issues

**Issue**: LiDAR not detected
- Verify device supports LiDAR (check hardware specs)
- Check Info.plist permissions
- Ensure iOS 14.0+ deployment target

**Issue**: AR session fails to start
- Check camera permissions granted
- Verify no other app is using AR session
- Restart device if needed

### Android Issues

**Issue**: ARCore not available
- Install ARCore app from Play Store
- Check device compatibility: https://developers.google.com/ar/devices
- Verify minimum Android version (10+)

**Issue**: Depth data is null
- Check lighting conditions (ARCore requires good lighting)
- Ensure device is not moving too fast
- Verify proper ARCore configuration

## Performance Considerations

### iOS LiDAR
- Frame rate: Up to 60 fps
- Resolution: 256 x 192 pixels
- Range: 0-5 meters
- Accuracy: ~1cm at 1m distance

### Android ARCore
- Frame rate: Up to 30 fps
- Resolution: 160 x 120 pixels (varies by device)
- Range: 0.2-8 meters
- Accuracy: ~2-5cm at 1m distance

## Security

- All biometric data processed locally first
- Depth data encrypted before upload
- Native permissions required (camera, AR)
- Data deleted after processing (configurable)

## References

- Capacitor Documentation: https://capacitorjs.com/docs
- ARKit Depth API: https://developer.apple.com/documentation/arkit
- ARCore Depth API: https://developers.google.com/ar/develop/depth
