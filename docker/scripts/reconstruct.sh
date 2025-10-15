#!/bin/bash
set -e

# 3D Face Reconstruction Script
# Uses OpenMVG for SfM and COLMAP for dense reconstruction

echo "=== Campus Guard 3D Face Reconstruction ==="
echo ""

# Configuration
INPUT_DIR="${INPUT_DIR:-/workspace/input}"
OUTPUT_DIR="${OUTPUT_DIR:-/workspace/output}"
TEMP_DIR="${TEMP_DIR:-/workspace/temp}"
NUM_CORES="${NUM_CORES:-$(nproc)}"

# Validate input
if [ ! -d "$INPUT_DIR" ] || [ -z "$(ls -A $INPUT_DIR)" ]; then
    echo "Error: No input images found in $INPUT_DIR"
    exit 1
fi

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$TEMP_DIR/openmvg"
mkdir -p "$TEMP_DIR/colmap"

# Count input images
NUM_IMAGES=$(ls -1 $INPUT_DIR/*.{jpg,jpeg,png,JPG,JPEG,PNG} 2>/dev/null | wc -l)
echo "Found $NUM_IMAGES input images"

if [ "$NUM_IMAGES" -lt 10 ]; then
    echo "Error: At least 10 images required for reconstruction"
    exit 1
fi

# ===== STEP 1: OpenMVG Feature Extraction =====
echo ""
echo "Step 1/6: Extracting features with OpenMVG..."
openMVG_main_SfMInit_ImageListing \
    -i "$INPUT_DIR" \
    -o "$TEMP_DIR/openmvg" \
    -d sensor_width_camera_database.txt \
    -c 3 \
    -f 1

openMVG_main_ComputeFeatures \
    -i "$TEMP_DIR/openmvg/sfm_data.json" \
    -o "$TEMP_DIR/openmvg" \
    -m SIFT \
    -n $NUM_CORES \
    -p HIGH

# ===== STEP 2: OpenMVG Feature Matching =====
echo ""
echo "Step 2/6: Matching features..."
openMVG_main_ComputeMatches \
    -i "$TEMP_DIR/openmvg/sfm_data.json" \
    -o "$TEMP_DIR/openmvg" \
    -n $NUM_CORES \
    -r 0.8

# ===== STEP 3: OpenMVG Structure-from-Motion =====
echo ""
echo "Step 3/6: Running Structure-from-Motion..."
openMVG_main_IncrementalSfM \
    -i "$TEMP_DIR/openmvg/sfm_data.json" \
    -m "$TEMP_DIR/openmvg" \
    -o "$TEMP_DIR/openmvg/reconstruction"

# ===== STEP 4: Export to COLMAP format =====
echo ""
echo "Step 4/6: Converting to COLMAP format..."
openMVG_main_openMVG2COLMAP \
    -i "$TEMP_DIR/openmvg/reconstruction/sfm_data.bin" \
    -o "$TEMP_DIR/colmap"

# ===== STEP 5: COLMAP Dense Reconstruction =====
echo ""
echo "Step 5/6: Running dense reconstruction with COLMAP..."

# Undistort images
colmap image_undistorter \
    --image_path "$INPUT_DIR" \
    --input_path "$TEMP_DIR/colmap" \
    --output_path "$TEMP_DIR/colmap/dense" \
    --output_type COLMAP

# Patch match stereo
colmap patch_match_stereo \
    --workspace_path "$TEMP_DIR/colmap/dense" \
    --workspace_format COLMAP \
    --PatchMatchStereo.geom_consistency true

# Stereo fusion
colmap stereo_fusion \
    --workspace_path "$TEMP_DIR/colmap/dense" \
    --workspace_format COLMAP \
    --input_type geometric \
    --output_path "$TEMP_DIR/colmap/dense/fused.ply"

# ===== STEP 6: Mesh Generation =====
echo ""
echo "Step 6/6: Generating mesh..."

# Poisson surface reconstruction
colmap poisson_mesher \
    --input_path "$TEMP_DIR/colmap/dense/fused.ply" \
    --output_path "$TEMP_DIR/colmap/dense/meshed.ply"

# Convert PLY to OBJ (for better compatibility)
# This requires a Python script
python3 << 'EOF'
import sys
import trimesh

try:
    mesh = trimesh.load('/workspace/temp/colmap/dense/meshed.ply')
    mesh.export('/workspace/temp/colmap/dense/meshed.obj')
    print("Mesh converted to OBJ format")
except Exception as e:
    print(f"Warning: Could not convert to OBJ: {e}")
    sys.exit(0)
EOF

# ===== Copy outputs =====
echo ""
echo "Copying outputs to $OUTPUT_DIR..."

# Copy sparse point cloud from OpenMVG
if [ -f "$TEMP_DIR/openmvg/reconstruction/sfm_data.bin" ]; then
    cp "$TEMP_DIR/openmvg/reconstruction/colorized.ply" "$OUTPUT_DIR/point_cloud_sparse.ply" 2>/dev/null || true
fi

# Copy dense point cloud from COLMAP
if [ -f "$TEMP_DIR/colmap/dense/fused.ply" ]; then
    cp "$TEMP_DIR/colmap/dense/fused.ply" "$OUTPUT_DIR/point_cloud_dense.ply"
    echo "✓ Dense point cloud: point_cloud_dense.ply"
fi

# Copy mesh
if [ -f "$TEMP_DIR/colmap/dense/meshed.ply" ]; then
    cp "$TEMP_DIR/colmap/dense/meshed.ply" "$OUTPUT_DIR/mesh.ply"
    echo "✓ Mesh (PLY): mesh.ply"
fi

if [ -f "$TEMP_DIR/colmap/dense/meshed.obj" ]; then
    cp "$TEMP_DIR/colmap/dense/meshed.obj" "$OUTPUT_DIR/mesh.obj"
    echo "✓ Mesh (OBJ): mesh.obj"
fi

# Generate quality report
cat > "$OUTPUT_DIR/quality_report.json" << EOF
{
  "num_input_images": $NUM_IMAGES,
  "timestamp": "$(date -Iseconds)",
  "pipeline": {
    "feature_extraction": "OpenMVG SIFT",
    "sfm": "OpenMVG Incremental",
    "dense_reconstruction": "COLMAP PatchMatch",
    "mesh_generation": "COLMAP Poisson"
  },
  "outputs": {
    "sparse_point_cloud": "$([ -f "$OUTPUT_DIR/point_cloud_sparse.ply" ] && echo "true" || echo "false")",
    "dense_point_cloud": "$([ -f "$OUTPUT_DIR/point_cloud_dense.ply" ] && echo "true" || echo "false")",
    "mesh_ply": "$([ -f "$OUTPUT_DIR/mesh.ply" ] && echo "true" || echo "false")",
    "mesh_obj": "$([ -f "$OUTPUT_DIR/mesh.obj" ] && echo "true" || echo "false")"
  }
}
EOF

echo ""
echo "✓ Reconstruction complete!"
echo ""
echo "Outputs:"
ls -lh "$OUTPUT_DIR"

# Clean up temp files if requested
if [ "$CLEANUP_TEMP" = "true" ]; then
    echo ""
    echo "Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
fi

exit 0
