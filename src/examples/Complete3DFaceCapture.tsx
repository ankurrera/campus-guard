/**
 * Example: Complete 3D Face Capture Integration
 * Demonstrates usage of all new 3D capture features
 */

import React, { useState, useEffect } from 'react';
import { FaceRecognition } from '../components/FaceRecognition';
import { DepthVisualizer } from '../components/3d/DepthVisualizer';
import { upload3DFaceData, updateStudent3DFaceData } from '../lib/supabaseStorage';
import { 
  computeEmbeddingFromPointCloud,
  computeEmbeddingFromDepthMap,
  embeddingToBase64 
} from '../lib/face3dEmbedding';
import { depthMapToPointCloud } from '../lib/face3d';
import { captureNative3DFace } from '../lib/depthAdapters/native';
import { supabase } from '../integrations/supabase/client';

interface Complete3DFaceCaptureProps {
  studentId: string;
  onComplete?: () => void;
}

export function Complete3DFaceCapture({ studentId, onComplete }: Complete3DFaceCaptureProps) {
  const [captureData, setCaptureData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<string>('Ready to capture');
  const [useNativeDepth, setUseNativeDepth] = useState(false);

  // Check if native depth is available
  useEffect(() => {
    async function checkNative() {
      const result = await captureNative3DFace();
      setUseNativeDepth(result !== null);
    }
    checkNative();
  }, []);

  const handleCapture = async (
    imageData: string,
    antiSpoofing?: any,
    capture3D?: any
  ) => {
    setProcessing(true);
    setStatus('Processing capture...');

    try {
      // Step 1: Upload captured data to storage
      if (capture3D) {
        setStatus('Uploading to storage...');
        const uploadResult = await upload3DFaceData(studentId, {
          method: capture3D.method,
          timestamp: new Date(),
          rgbFrame: imageData,
          depthMap: capture3D.depthMap,
          pointCloud: capture3D.pointCloud,
          antiSpoofingMetrics: antiSpoofing || {
            depthScore: 0.8,
            textureScore: 0.8,
            motionScore: 0.8,
            confidence: 0.8,
          },
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            hasLiDAR: false,
            hasDepthSensor: !!capture3D.depthMap,
          },
        });

        console.log('Upload result:', uploadResult);
        setCaptureData({ uploadResult, capture3D });

        // Step 2: Compute face embedding from 3D data
        setStatus('Computing 3D face embedding...');
        let embedding;
        
        if (capture3D.pointCloud) {
          embedding = computeEmbeddingFromPointCloud(
            capture3D.pointCloud,
            capture3D.method
          );
        } else if (capture3D.depthMap) {
          // Generate point cloud from depth map first
          const pointCloud = depthMapToPointCloud(capture3D.depthMap);
          embedding = computeEmbeddingFromPointCloud(pointCloud, capture3D.method);
        }

        // Step 3: Update database with embedding and URLs
        if (embedding) {
          setStatus('Updating database...');
          const embeddingBase64 = embeddingToBase64(embedding);
          
          await updateStudent3DFaceData(
            studentId,
            uploadResult,
            embeddingBase64,
            embedding.algorithm
          );
        }

        // Step 4: Call Edge Function for server-side processing
        setStatus('Triggering server-side processing...');
        
        // Process 3D face data
        await supabase.functions.invoke('process-3d-face', {
          body: {
            studentId,
            depthMapUrl: uploadResult.depthMapUrl,
            pointCloudUrl: uploadResult.pointCloudUrl,
          }
        });

        // Step 5: If we have multiple frames, trigger reconstruction
        if (capture3D.frames && capture3D.frames.length > 10) {
          setStatus('Queueing 3D reconstruction...');
          
          await supabase.functions.invoke('reconstruct-3d', {
            body: {
              studentId,
              frames: capture3D.frames,
              captureMethod: capture3D.method,
            }
          });
        }

        setStatus('Complete!');
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error('Failed to process capture:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleNativeCapture = async () => {
    setProcessing(true);
    setStatus('Starting native depth capture...');

    try {
      const capture = await captureNative3DFace((progress) => {
        setStatus(`Capturing... ${Math.round(progress * 100)}%`);
      });

      if (capture) {
        // Process the native capture
        await handleCapture(
          capture.rgbFrame || '',
          {
            depthScore: capture.antiSpoofingMetrics.depthScore,
            textureScore: capture.antiSpoofingMetrics.textureScore,
            motionScore: capture.antiSpoofingMetrics.motionScore,
            confidence: capture.antiSpoofingMetrics.confidence,
          },
          {
            method: capture.method,
            depthMap: capture.depthMap,
            pointCloud: capture.pointCloud,
          }
        );
      } else {
        setStatus('Native capture failed, please try regular capture');
      }
    } catch (error) {
      console.error('Native capture error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Display */}
      <div className="glass-card p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${processing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          <span className="text-sm font-medium">{status}</span>
        </div>
      </div>

      {/* Native Depth Option */}
      {useNativeDepth && (
        <div className="glass-card p-4 rounded-xl">
          <button
            onClick={handleNativeCapture}
            disabled={processing}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            📱 Use Native Depth Capture (LiDAR/ARCore)
          </button>
        </div>
      )}

      {/* Regular Face Capture */}
      <FaceRecognition
        mode="capture"
        studentId={studentId}
        onCapture={handleCapture}
      />

      {/* Real-time Depth Visualization */}
      {captureData?.capture3D && (
        <div className="glass-card p-4 rounded-xl space-y-3">
          <h3 className="text-lg font-semibold">3D Visualization</h3>
          
          <DepthVisualizer
            depthMap={captureData.capture3D.depthMap}
            pointCloud={captureData.capture3D.pointCloud}
            width={640}
            height={480}
            autoRotate={true}
            showDepthMap={true}
          />

          {/* Capture Stats */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-black/20 p-3 rounded-lg">
              <div className="text-gray-400">Method</div>
              <div className="font-medium">{captureData.capture3D.method}</div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg">
              <div className="text-gray-400">Points</div>
              <div className="font-medium">
                {captureData.capture3D.pointCloud?.count.toLocaleString() || 'N/A'}
              </div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg">
              <div className="text-gray-400">Resolution</div>
              <div className="font-medium">
                {captureData.capture3D.depthMap?.width || 0} x{' '}
                {captureData.capture3D.depthMap?.height || 0}
              </div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg">
              <div className="text-gray-400">Quality</div>
              <div className="font-medium">
                {Math.round((captureData.capture3D.antiSpoofingMetrics?.confidence || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Results */}
      {captureData?.uploadResult && (
        <div className="glass-card p-4 rounded-xl space-y-3">
          <h3 className="text-lg font-semibold">Upload Results</h3>
          <div className="space-y-2 text-sm">
            {captureData.uploadResult.rgbFrameUrl && (
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>RGB Frame uploaded</span>
              </div>
            )}
            {captureData.uploadResult.depthMapUrl && (
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Depth Map uploaded</span>
              </div>
            )}
            {captureData.uploadResult.pointCloudUrl && (
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Point Cloud uploaded</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
