# 3D Reconstruction Setup Guide

This document explains how to set up server-side 3D reconstruction using OpenMVG and COLMAP for the Campus Guard biometric system.

## Overview

The 3D reconstruction pipeline processes multi-view photogrammetry frames to generate:
- Dense point clouds
- 3D meshes
- Texture maps
- Face embeddings from 3D data

## Prerequisites

### Software Requirements

1. **OpenMVG** (v2.0+)
   - Feature extraction and matching
   - Structure-from-Motion (SfM)
   - Download: https://github.com/openMVG/openMVG

2. **COLMAP** (v3.8+)
   - Dense reconstruction
   - Multi-view stereo
   - Mesh generation
   - Download: https://colmap.github.io/

3. **Docker** (recommended)
   - Containerized reconstruction environment
   - Simplifies deployment

### System Requirements

- CPU: 8+ cores recommended
- RAM: 16GB minimum, 32GB recommended
- GPU: NVIDIA GPU with CUDA support (optional, for dense reconstruction)
- Storage: 100GB+ for processing temporary files

## Installation

### Option 1: Docker (Recommended)

```bash
# Pull the OpenMVG/COLMAP Docker image
docker pull openmvg/openmvg-colmap:latest

# Or build custom image with both tools
cd docker
docker build -t campus-guard-3d-reconstruction .
```

### Option 2: Native Installation

#### Ubuntu/Debian

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y cmake build-essential libpng-dev libjpeg-dev libtiff-dev libglu1-mesa-dev

# Install OpenMVG
git clone --recursive https://github.com/openMVG/openMVG.git
cd openMVG
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=RELEASE ..
make -j$(nproc)
sudo make install

# Install COLMAP
sudo apt-get install -y colmap
```

#### macOS

```bash
# Using Homebrew
brew install cmake boost eigen ceres-solver glew cgal
brew install colmap

# Build OpenMVG from source
git clone --recursive https://github.com/openMVG/openMVG.git
cd openMVG
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=RELEASE ..
make -j$(sysctl -n hw.ncpu)
sudo make install
```

## Configuration

### Supabase Edge Function Setup

1. Deploy the reconstruction function:

```bash
cd supabase/functions
supabase functions deploy reconstruct-3d
```

2. Set environment variables:

```bash
supabase secrets set OPENMVG_PATH=/path/to/openmvg
supabase secrets set COLMAP_PATH=/path/to/colmap
supabase secrets set RECONSTRUCTION_WORKERS=4
```

### Reconstruction Pipeline Configuration

Create `config/reconstruction.json`:

```json
{
  "openmvg": {
    "feature_detector": "SIFT",
    "feature_detector_params": {
      "num_features": 5000,
      "contrast_threshold": 0.04
    },
    "matching_method": "exhaustive",
    "geometric_model": "FUNDAMENTAL_MATRIX"
  },
  "colmap": {
    "dense_reconstruction": {
      "window_radius": 5,
      "num_samples": 15,
      "num_iterations": 5
    },
    "mesh_generation": {
      "method": "Poisson",
      "depth": 10,
      "point_weight": 4.0
    }
  },
  "output_formats": ["ply", "obj", "glb"],
  "quality_threshold": 0.75
}
```

## Usage

### Processing Pipeline

The reconstruction pipeline follows these steps:

1. **Feature Extraction** (OpenMVG)
   - Detect SIFT/AKAZE features in each frame
   - Extract feature descriptors
   - ~10-30 seconds per frame

2. **Feature Matching** (OpenMVG)
   - Match features between frame pairs
   - Geometric verification
   - ~1-5 minutes for 30 frames

3. **Structure-from-Motion** (OpenMVG)
   - Incremental camera pose estimation
   - Sparse 3D reconstruction
   - ~2-10 minutes

4. **Dense Reconstruction** (COLMAP)
   - Multi-view stereo matching
   - Dense point cloud generation
   - ~5-20 minutes (GPU accelerated)

5. **Mesh Generation** (COLMAP)
   - Poisson surface reconstruction
   - Texture mapping
   - ~1-5 minutes

Total processing time: **10-60 minutes** depending on hardware

### API Usage

Call the reconstruction Edge Function:

```typescript
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/reconstruct-3d',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      studentId: 'student-123',
      frames: capturedFrames,
      captureMethod: 'photogrammetry',
    }),
  }
);

const result = await response.json();
console.log('Point cloud URL:', result.pointCloudUrl);
console.log('Mesh URL:', result.meshUrl);
```

## Output Files

The pipeline generates the following files:

```
biometric-data/
  {studentId}/
    3d_models/
      reconstruction_{timestamp}/
        ├── point_cloud.ply          # Sparse point cloud
        ├── point_cloud_dense.ply    # Dense point cloud
        ├── mesh.obj                 # 3D mesh (OBJ format)
        ├── mesh.glb                 # 3D mesh (GLB format)
        ├── texture.png              # Texture map
        ├── cameras.txt              # Camera parameters
        └── quality_report.json      # Quality metrics
```

## Quality Metrics

The pipeline computes these quality metrics:

- **Point Count**: Number of 3D points reconstructed
- **Coverage**: Percentage of face surface covered
- **Reconstruction Error**: Average reprojection error (pixels)
- **Completeness**: Percentage of frames successfully registered
- **Resolution**: Average point density (points/cm²)

## Troubleshooting

### Low Point Count

- Increase number of captured frames (30+ recommended)
- Ensure good lighting conditions
- Check for motion blur in frames
- Adjust feature detector parameters

### High Reconstruction Error

- Improve camera calibration
- Use more frames with better angular coverage
- Check for rolling shutter effects
- Reduce motion during capture

### Failed Frame Registration

- Ensure sufficient overlap between frames
- Check for featureless regions
- Adjust matching thresholds
- Verify frame quality

## Performance Optimization

### GPU Acceleration

Enable CUDA for COLMAP:

```bash
# Build COLMAP with CUDA
cmake -DCMAKE_BUILD_TYPE=Release \
      -DCUDA_ENABLED=ON \
      -DCUDA_ARCHS="75;80;86" \
      ..
```

### Parallel Processing

Configure worker threads:

```json
{
  "parallel_processing": {
    "feature_extraction_workers": 4,
    "matching_workers": 4,
    "dense_reconstruction_workers": 2
  }
}
```

### Cloud Deployment

Deploy on cloud GPU instances:

- AWS EC2 g4dn instances (NVIDIA T4)
- Google Cloud GPU instances (NVIDIA T4/V100)
- Azure NC-series instances

## Security Considerations

1. **Data Privacy**
   - All biometric data is encrypted at rest
   - Temporary files are deleted after processing
   - Access logs maintained for audit

2. **Processing Isolation**
   - Each reconstruction runs in isolated container
   - No data shared between jobs
   - Resource limits enforced

3. **Rate Limiting**
   - Maximum 10 reconstructions per student per day
   - Queue-based processing to prevent overload
   - Priority given to live attendance captures

## Monitoring

Set up monitoring for:

- Processing queue length
- Average processing time
- Success/failure rates
- Resource utilization (CPU, GPU, memory)
- Storage usage

Use Supabase Edge Function logs:

```bash
supabase functions logs reconstruct-3d
```

## Cost Estimation

Approximate costs per 1000 reconstructions:

- Compute (GPU): $50-100
- Storage: $5-10
- Bandwidth: $10-20
- **Total**: $65-130

Optimize costs by:
- Using spot instances
- Batch processing during off-peak hours
- Implementing aggressive caching
- Archiving old reconstructions

## References

- OpenMVG Documentation: https://openmvg.readthedocs.io/
- COLMAP Documentation: https://colmap.github.io/
- Structure-from-Motion Tutorial: https://colmap.github.io/tutorial.html
- Poisson Surface Reconstruction: http://www.cs.jhu.edu/~misha/MyPapers/ToG13.pdf

## Support

For issues or questions:
- GitHub Issues: https://github.com/ankurrera/campus-guard/issues
- Email: support@campusguard.com
