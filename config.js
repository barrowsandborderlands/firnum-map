/**
 * Firnum Map Configuration
 */

const FIRNUM_CONFIG = {
  // ── Map Image ─────────────────────────────────────────────────
  mapImage: 'map.jpg',
  imageWidth: 9212,
  imageHeight: 7124,

  // Zoom range (negative = zoom out further, higher = zoom in more)
  minZoom: -2,
  maxZoom: 4,
  defaultZoom: 0,

  // ── Grid System ───────────────────────────────────────────────
  // EW.NS format. NS increases DOWNWARD on the image.
  //   NW (top-left):  -172.-036
  //   NE (top-right):  215.-036
  //   SW (bot-left):  -172.264
  //   SE (bot-right):  215.264
  // 388 EW × 301 NS = 116,788 squares
  grid: {
    // These map integer grid coords to square CENTERS.
    // Image spans from left edge of -172 to right edge of 215 (388 squares)
    // and top edge of -036 to bottom edge of 264 (301 squares).
    // Using ±0.5 offset so that integer coords hit square centers.
    xMin: -172.5,  // left edge of image (half-square before center of -172)
    xMax: 215.5,   // right edge of image (half-square after center of 215)
    yMin: -36.5,   // top edge of image
    yMax: 264.5,   // bottom edge of image
  },

  // Default center (EW=21.5, NS=114)
  defaultCenter: { x: 21.5, y: 114 },

  // ── Google Sheets Integration ────────────────────────────────
  sheets: {
    // For local dev you can hard-code a fallback key or leave empty
    // In production → use Netlify environment variable GOOGLE_SHEETS_API_KEY
    apiKey: window.GOOGLE_SHEETS_API_KEY || 'placeholder-for-local-dev',
    spreadsheetId: '10kXopE2ZUUH6D1dIFBiTtp0-8gdmXiuNfr5P9QS306I',
    locationsTab: 'Map Locations',        // tab name for location data
    charactersTab: 'Character Map Placement', // tab name for character placements
  },

  // ── Display ───────────────────────────────────────────────────
  mapTitle: 'Map of Firnum',
  backgroundColor: '#14141e',
};

// Make it globally available (no export needed)
window.FIRNUM_CONFIG = FIRNUM_CONFIG;
