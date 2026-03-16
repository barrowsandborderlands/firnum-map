# Firnum Interactive Map — Setup Guide

## What You've Got

```
firnum-map/
├── index.html          ← Main map page
├── app.js              ← Map logic (Leaflet + Google Sheets)
├── config.js           ← All settings (grid range, API key, etc.)
├── netlify.toml        ← Netlify deployment config
├── generate_tiles.py   ← Run this on YOUR machine to create tiles
├── data/
│   └── locations.csv   ← Fallback data (used if no Google Sheets)
└── tiles/              ← (you generate these with the script)
```

---

## Step 1: Generate Map Tiles (on your machine)

Your map image is too large for most web services, so we tile it into small 256x256 chunks at multiple zoom levels.

### Requirements
```bash
pip install Pillow
```

### Run the tile generator
```bash
cd /path/to/firnum-map
python generate_tiles.py
```

**Before running**, open `generate_tiles.py` and verify the `INPUT_IMAGE` path points to your `Firnum_Base_1200.png`. The script will auto-detect the relative path if `firnum-map/` is inside your Allternity vault.

This will create a `tiles/` folder with ~8,000-12,000 small PNG files organized as `tiles/{zoom}/{x}/{y}.png`. Expected runtime: 5-15 minutes. Expected size: 200-400 MB.

---

## Step 2: Set Up Google Sheets

Open your game sheet: https://docs.google.com/spreadsheets/d/10kXopE2ZUUH6D1dIFBiTtp0-8gdmXiuNfr5P9QS306I/

### Create a new tab called `Map Locations`

Add these column headers in row 1:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| **square** | **name** | **type** | **description** | **color** | **visible** |

### Column definitions:

- **square** — Grid reference in EW.NS format (e.g., `-023.142`, `120.493`, `034.-043`)
  - EW = East-West position (-172 to 215)
  - NS = North-South position (-036 to 264)
- **name** — Location name (e.g., "Thornhold Keep")
- **type** — Category (e.g., "city", "dungeon", "ruins", "landmark", "temple")
- **description** — Any notes, flavor text, or game info
- **color** — Hex color for the marker highlight (e.g., `#c8b888`, `#ff4444`). Optional.
- **visible** — `true` or `false`. Set to `false` to hide a location without deleting it. Optional, defaults to true.

### Example rows:

| square | name | type | description | color | visible |
|--------|------|------|-------------|-------|---------|
| 000.000 | Origin Point | landmark | Center of Firnum | #c8b888 | true |
| -023.142 | Thornhold Keep | fortress | Ancient dwarven stronghold | #aaaaff | true |
| 120.493 | The Sunken Temple | dungeon | Partially submerged ruins | #44aa44 | true |
| 034.-043 | Ashfall Wastes | region | Volcanic badlands | #ff6644 | true |

---

## Step 3: Get a Google Sheets API Key

1. Go to https://console.cloud.google.com/
2. Create a new project (or use an existing one)
3. Go to **APIs & Services** → **Library**
4. Search for **Google Sheets API** and enable it
5. Go to **APIs & Services** → **Credentials**
6. Click **Create Credentials** → **API Key**
7. Copy the API key
8. (Recommended) Click **Restrict Key** → under "API restrictions", select **Google Sheets API** only

### Add the key to your map:

Open `config.js` and paste your API key:

```js
googleApiKey: 'AIzaSy..........your-key-here',
```

### Make sure your Google Sheet is accessible:

The sheet must be viewable by anyone with the link (or be public). Go to your sheet → **Share** → **General access** → **Anyone with the link** → **Viewer**.

---

## Step 4: Deploy to Netlify

### Option A: Drag and Drop (easiest)
1. Go to https://app.netlify.com/
2. Click **Add new site** → **Deploy manually**
3. Drag your entire `firnum-map/` folder onto the page
4. Done! Netlify gives you a URL like `https://random-name.netlify.app`

### Option B: GitHub + Netlify (auto-deploys on push)
1. Create a GitHub repo and push the `firnum-map/` folder
2. In Netlify: **Add new site** → **Import from Git** → select your repo
3. Build settings: leave everything blank (it's static HTML)
4. Deploy! Now every `git push` auto-deploys.

### Custom domain (optional)
In Netlify: **Domain management** → **Add custom domain**

---

## Step 5: Test It

1. Open `index.html` locally in a browser (you may need a local server for CORS):
   ```bash
   cd firnum-map
   python -m http.server 8000
   # Then open http://localhost:8000
   ```
2. You should see the Firnum map with zoom/pan
3. Hover over the map to see grid coordinates at the bottom
4. Click anywhere to see the grid square popup
5. Locations from your Google Sheet should appear as invisible markers that highlight on hover

---

## How It Works

- **Map display**: Leaflet.js with `CRS.Simple` (no geographic projection — just your image)
- **Tiles**: Pre-generated PNG tiles at 8 zoom levels for smooth zooming
- **Data**: Google Sheets API v4 reads your "Map Locations" tab on every page load
- **Grid**: EW.NS format mapped to pixel coordinates based on your grid range
- **Markers**: Invisible by default, they highlight on hover and show a popup on click
- **Search**: Ctrl+F to search locations by name, type, or grid reference

---

## Updating Locations

Just edit the Google Sheet! The map reads fresh data on every page load. No redeployment needed for data changes.

To change the map image or code, redeploy to Netlify.

---

## Config Reference (config.js)

| Setting | Description |
|---------|-------------|
| `imageWidth` / `imageHeight` | Your original image dimensions (36846 x 28495) |
| `tileSize` | Tile size in pixels (256 — don't change) |
| `minZoom` / `maxZoom` | Zoom range (0-7) |
| `googleSheetId` | Your sheet's ID from the URL |
| `sheetTabName` | Name of the tab with location data |
| `googleApiKey` | Your Google Sheets API key |
| `grid.xMin/xMax` | East-West range (-172 to 215) |
| `grid.yMin/yMax` | North-South range (264 at top to -36 at bottom) |
