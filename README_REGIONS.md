# How to Add Regions to the Firnum Map

Regions are colored polygon overlays that show countries, territories, or areas on your map. They're defined in a single CSV file and show up as toggleable overlays.

---

## Step 1: Open the regions file

Open this file in any text editor, Google Sheets, or Excel:

```
firnum-map/data/regions.csv
```

## Step 2: Understand the columns

| Column | Required? | What it does | Example |
|--------|-----------|-------------|---------|
| `name` | **Yes** | The region's display name | `Kingdom of Malores` |
| `description` | No | Shows when you click the region on the map | `A holy empire of pure strain humans.` |
| `color` | **Yes** | Hex color for the fill and border | `#c8a848` |
| `fill_opacity` | No | How transparent the fill is (0.0 = invisible, 1.0 = solid). Default: `0.15` | `0.1` |
| `border_opacity` | No | How visible the border line is (0.0–1.0). Default: `0.6` | `0.5` |
| `coordinates` | **Yes** | The shape of the region (see Step 3) | `-005.-036 045.-036 045.035 -005.035` |

## Step 3: Define the region shape with coordinates

Coordinates use the same **grid square format** as your locations (EW.NS), separated by **spaces**.

The points connect in order to form a polygon. The last point automatically connects back to the first.

### Example: A rectangle

```
001.005 020.005 020.025 001.025
```

This draws a box from grid square 001.005 (top-left) → 020.005 (top-right) → 020.025 (bottom-right) → 001.025 (bottom-left) and back to the start.

### Example: A triangle

```
010.010 020.020 000.020
```

### Example: An irregular shape (like a real border)

Just add more points to trace the border:

```
-005.-036 010.-036 015.-020 020.-010 020.035 -005.035
```

**Tip:** You need at least 3 points. More points = smoother/more detailed borders.

**Tip:** Use the grid overlay on the map (press `G`) to find the grid coordinates of the corners you want.

## Step 4: Add your row to the CSV

Each region is one row. Here's a complete example with 3 regions:

```csv
name,description,color,fill_opacity,border_opacity,coordinates
The Borderlands,"The wild frontier between Malores and Urden.",#c8a848,0.08,0.4,-005.-036 045.-036 045.035 -005.035
Kingdom of Malores,"The holy Maloresian Empire. Mutants not welcome.",#4488cc,0.12,0.5,-172.-036 -006.-036 -006.264 -172.264
Urden,"The magocratic empire of sorcerers.",#9944cc,0.12,0.5,046.-036 215.-036 215.264 046.264
```

### If using Google Sheets:

1. Open or create a Google Sheet with the column headers
2. Fill in each row
3. **Important:** If your description has commas, the sheet handles the quoting automatically
4. File → Download → Comma Separated Values (.csv)
5. Name it `regions.csv` and put it in the `firnum-map/data/` folder, replacing the old one

### If using a text editor:

1. Open `firnum-map/data/regions.csv`
2. Add a new line for each region
3. **Important:** If your description contains commas, wrap the whole description in double quotes: `"Like this, with commas"`
4. Save the file

## Step 5: View on the map

1. Refresh the map in your browser
2. Click the **"Regions: OFF"** button (top-right) to turn regions on
3. Each region appears as a colored overlay you can click for its description
4. Individual regions can be toggled on/off in the sidebar

---

## Quick Reference

Minimal region (just name, color, and shape):

```csv
name,description,color,fill_opacity,border_opacity,coordinates
My Region,,#ff0000,,,001.001 010.001 010.010 001.010
```

## Color Ideas

| Color | Hex | Good for |
|-------|-----|----------|
| Gold | `#c8a848` | Neutral/wild lands |
| Blue | `#4488cc` | Kingdoms, water |
| Purple | `#9944cc` | Magic empires |
| Red | `#cc4444` | Hostile territory |
| Green | `#44aa44` | Forests, nature |
| Teal | `#20b2aa` | Coastal regions |
| Orange | `#dd8833` | Desert, arid |

## Troubleshooting

- **Region not showing?** Make sure you clicked "Regions: OFF" to toggle it on. Check that you have at least 3 coordinate points.
- **Shape looks wrong?** The points connect in order. Walk around the border clockwise or counter-clockwise.
- **Region too bright/dark?** Adjust `fill_opacity`. Lower = more see-through. Try values between `0.05` and `0.2`.
- **Can't see the border?** Increase `border_opacity` toward `1.0`.
- **Coordinates format:** It's `EW.NS` with a dot in between, and spaces between each point. No commas between coordinates.
