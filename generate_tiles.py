#!/usr/bin/env python3
"""
Firnum Map Tile Generator
=========================
Run this on your local machine to generate Leaflet-compatible map tiles.

Requirements:
    pip install Pillow

Usage:
    python generate_tiles.py

This will read Firnum_Base_1200.png and generate tiles in a 'tiles/' folder
organized as tiles/{z}/{x}/{y}.png — the standard Leaflet tile format.

Zoom levels 0-7 will be generated:
  - Zoom 0: 1x1 tiles (whole map in one tile)
  - Zoom 7: 128x128 tiles (near-native resolution)

Total tiles: ~8,000-12,000 files, ~200-400 MB
Expected runtime: 5-15 minutes depending on your machine.
"""

import os
import sys
import math
from pathlib import Path
from PIL import Image

# Allow massive images
Image.MAX_IMAGE_PIXELS = None

# ============================================================
# CONFIGURATION - Edit these paths if needed
# ============================================================

# Path to your base map image (the clean version without grid numbers)
INPUT_IMAGE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "2. Universes", "! Firnum", "Firnum", "Map of Firnum", "Firnum_Base_1200.png"
)

# Output directory for tiles
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tiles")

TILE_SIZE = 256
MIN_ZOOM = 0
MAX_ZOOM = 7  # 2^7 = 128 tiles per axis = 32768px grid (close to 36846 native)

# Background color for areas outside the map (dark navy)
BG_COLOR = (20, 20, 30)

# ============================================================


def generate_tiles():
    input_path = os.path.normpath(INPUT_IMAGE)

    if not os.path.exists(input_path):
        print(f"ERROR: Image not found at: {input_path}")
        print(f"Please edit INPUT_IMAGE in this script to point to your Firnum map.")
        sys.exit(1)

    print(f"Opening image: {input_path}")
    print("(This may take a minute for large images...)")

    img = Image.open(input_path)
    orig_w, orig_h = img.size
    print(f"Image size: {orig_w} x {orig_h}")
    print(f"Generating zoom levels {MIN_ZOOM} to {MAX_ZOOM}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # For each zoom level, we need a resized version of the image
    # To save memory, we'll create intermediate sizes and work from those

    # Pre-compute what zoom levels need what image sizes
    zoom_configs = []
    for z in range(MIN_ZOOM, MAX_ZOOM + 1):
        grid_px = (2 ** z) * TILE_SIZE
        scale = grid_px / max(orig_w, orig_h)
        needed_w = int(orig_w * scale)
        needed_h = int(orig_h * scale)
        zoom_configs.append({
            'zoom': z,
            'grid_px': grid_px,
            'num_tiles': 2 ** z,
            'needed_w': needed_w,
            'needed_h': needed_h,
            'scale': scale,
        })

    # Group zoom levels by similar sizes to reuse resized images
    # Process from smallest to largest
    total_tiles = 0

    for cfg in zoom_configs:
        z = cfg['zoom']
        grid_px = cfg['grid_px']
        num_tiles = cfg['num_tiles']
        needed_w = cfg['needed_w']
        needed_h = cfg['needed_h']

        print(f"Zoom {z}: {num_tiles}x{num_tiles} grid, scaling map to {needed_w}x{needed_h}...")

        # Resize image for this zoom level
        resized = img.resize((needed_w, needed_h), Image.LANCZOS)

        # Calculate offset to center map in the square grid
        offset_x = (grid_px - needed_w) // 2
        offset_y = (grid_px - needed_h) // 2

        tiles_count = 0

        for tx in range(num_tiles):
            col_dir = os.path.join(OUTPUT_DIR, str(z), str(tx))
            os.makedirs(col_dir, exist_ok=True)

            for ty in range(num_tiles):
                # This tile covers grid pixels:
                gx0 = tx * TILE_SIZE
                gy0 = ty * TILE_SIZE

                # Map to resized image coordinates
                img_x0 = gx0 - offset_x
                img_y0 = gy0 - offset_y
                img_x1 = img_x0 + TILE_SIZE
                img_y1 = img_y0 + TILE_SIZE

                # Check if tile overlaps the image at all
                if img_x1 <= 0 or img_y1 <= 0 or img_x0 >= needed_w or img_y0 >= needed_h:
                    continue  # Tile is entirely background, skip

                # Create tile
                tile = Image.new('RGB', (TILE_SIZE, TILE_SIZE), BG_COLOR)

                # Calculate the overlap region
                src_x0 = max(0, img_x0)
                src_y0 = max(0, img_y0)
                src_x1 = min(needed_w, img_x1)
                src_y1 = min(needed_h, img_y1)

                # Crop from resized image
                crop = resized.crop((src_x0, src_y0, src_x1, src_y1))

                # Paste at correct position in tile
                paste_x = src_x0 - img_x0
                paste_y = src_y0 - img_y0
                tile.paste(crop, (paste_x, paste_y))

                # Save tile
                tile_path = os.path.join(col_dir, f"{ty}.png")
                tile.save(tile_path, "PNG")
                tiles_count += 1

                crop.close()
                tile.close()

        resized.close()
        total_tiles += tiles_count
        print(f"  -> {tiles_count} tiles generated")

    img.close()

    print(f"\n{'='*50}")
    print(f"DONE! Generated {total_tiles} tiles total.")
    print(f"Tiles saved to: {OUTPUT_DIR}")
    print(f"\nImage dimensions: {orig_w} x {orig_h}")
    print(f"Zoom range: {MIN_ZOOM}-{MAX_ZOOM}")
    print(f"Tile size: {TILE_SIZE}px")
    print(f"\nNow copy the 'tiles' folder into your firnum-map project")
    print(f"and deploy to Netlify!")

    # Write metadata file for the web app
    meta_path = os.path.join(OUTPUT_DIR, "metadata.json")
    import json
    with open(meta_path, 'w') as f:
        json.dump({
            "imageWidth": orig_w,
            "imageHeight": orig_h,
            "tileSize": TILE_SIZE,
            "minZoom": MIN_ZOOM,
            "maxZoom": MAX_ZOOM,
        }, f, indent=2)
    print(f"Metadata written to: {meta_path}")


if __name__ == "__main__":
    generate_tiles()
