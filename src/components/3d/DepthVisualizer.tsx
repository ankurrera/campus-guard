/**
 * Real-time Depth Visualizer Component
 * Uses Three.js to render depth maps and point clouds in real-time
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { DepthMapData, PointCloudData } from '../../lib/face3d';

interface DepthVisualizerProps {
  depthMap?: DepthMapData;
  pointCloud?: PointCloudData;
  width?: number;
  height?: number;
  autoRotate?: boolean;
  showDepthMap?: boolean;
}

export function DepthVisualizer({
  depthMap,
  pointCloud,
  width = 640,
  height = 480,
  autoRotate = false,
  showDepthMap = true,
}: DepthVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointCloudMeshRef = useRef<THREE.Points | null>(null);
  const depthMapMeshRef = useRef<THREE.Mesh | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
      );
      camera.position.z = 2;
      cameraRef.current = camera;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Animation loop
      const animate = () => {
        animationIdRef.current = requestAnimationFrame(animate);

        if (autoRotate && pointCloudMeshRef.current) {
          pointCloudMeshRef.current.rotation.y += 0.005;
        }

        if (autoRotate && depthMapMeshRef.current) {
          depthMapMeshRef.current.rotation.y += 0.005;
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        if (animationIdRef.current !== null) {
          cancelAnimationFrame(animationIdRef.current);
        }
        if (renderer) {
          renderer.dispose();
        }
        if (containerRef.current && renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    } catch (err) {
      console.error('Failed to initialize Three.js:', err);
      setError('Failed to initialize 3D visualization');
    }
  }, [width, height, autoRotate]);

  // Update point cloud visualization
  useEffect(() => {
    if (!sceneRef.current || !pointCloud) return;

    try {
      // Remove existing point cloud
      if (pointCloudMeshRef.current) {
        sceneRef.current.remove(pointCloudMeshRef.current);
        pointCloudMeshRef.current.geometry.dispose();
        (pointCloudMeshRef.current.material as THREE.Material).dispose();
      }

      // Create geometry from point cloud
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(pointCloud.points, 3));

      if (pointCloud.colors) {
        // Normalize colors to 0-1 range
        const normalizedColors = new Float32Array(pointCloud.colors.length);
        for (let i = 0; i < pointCloud.colors.length; i++) {
          normalizedColors[i] = pointCloud.colors[i] / 255;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(normalizedColors, 3));
      }

      // Create material
      const material = new THREE.PointsMaterial({
        size: 0.01,
        vertexColors: pointCloud.colors ? true : false,
        color: pointCloud.colors ? undefined : 0x00ff00,
      });

      // Create points mesh
      const points = new THREE.Points(geometry, material);
      sceneRef.current.add(points);
      pointCloudMeshRef.current = points;

      // Center the point cloud
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere) {
        points.position.sub(geometry.boundingSphere.center);
      }
    } catch (err) {
      console.error('Failed to update point cloud:', err);
      setError('Failed to render point cloud');
    }
  }, [pointCloud]);

  // Update depth map visualization
  useEffect(() => {
    if (!sceneRef.current || !depthMap || !showDepthMap) return;

    try {
      // Remove existing depth map
      if (depthMapMeshRef.current) {
        sceneRef.current.remove(depthMapMeshRef.current);
        depthMapMeshRef.current.geometry.dispose();
        (depthMapMeshRef.current.material as THREE.Material).dispose();
      }

      // Create plane geometry
      const geometry = new THREE.PlaneGeometry(2, 2, depthMap.width - 1, depthMap.height - 1);
      const positions = geometry.attributes.position.array as Float32Array;

      // Apply depth to Z coordinates
      for (let i = 0; i < depthMap.data.length; i++) {
        positions[i * 3 + 2] = depthMap.data[i] * 0.5; // Scale depth
      }

      geometry.computeVertexNormals();

      // Create material with wireframe
      const material = new THREE.MeshPhongMaterial({
        color: 0x00aaff,
        wireframe: true,
        side: THREE.DoubleSide,
      });

      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.x = pointCloud ? 1.5 : 0; // Offset if showing point cloud too
      sceneRef.current.add(mesh);
      depthMapMeshRef.current = mesh;
    } catch (err) {
      console.error('Failed to update depth map:', err);
      setError('Failed to render depth map');
    }
  }, [depthMap, showDepthMap, pointCloud]);

  return (
    <div className="relative">
      <div ref={containerRef} className="rounded-lg overflow-hidden" />
      {error && (
        <div className="absolute top-2 left-2 bg-red-500/80 text-white px-3 py-1 rounded text-sm">
          {error}
        </div>
      )}
      {!depthMap && !pointCloud && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
          No depth data to visualize
        </div>
      )}
    </div>
  );
}
