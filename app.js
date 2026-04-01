/**
 * Firnum Interactive Map
 * Single-image overlay + grid + CSV locations + sidebar + regions
 */
(function () {
  'use strict';
  const C = FIRNUM_CONFIG;

  // ── Coordinate Helpers ──────────────────────────────────────

  function gridToPixel(gx, gy) {
    const px = ((gx - C.grid.xMin) / (C.grid.xMax - C.grid.xMin)) * C.imageWidth;
    const py = ((gy - C.grid.yMin) / (C.grid.yMax - C.grid.yMin)) * C.imageHeight;
    return [px, py];
  }

  function pixelToGrid(px, py) {
    const gx = C.grid.xMin + (px / C.imageWidth) * (C.grid.xMax - C.grid.xMin);
    const gy = C.grid.yMin + (py / C.imageHeight) * (C.grid.yMax - C.grid.yMin);
    return [gx, gy];
  }

  function formatGrid(gx, gy) {
    const ew = Math.round(gx);
    const ns = Math.round(gy);
    const ewStr = (ew < 0 ? '-' : '') + String(Math.abs(ew)).padStart(3, '0');
    const nsStr = (ns < 0 ? '-' : '') + String(Math.abs(ns)).padStart(3, '0');
    return `${ewStr}.${nsStr}`;
  }

  function pxToLatLng(px, py) { return L.latLng(-py, px); }

  // ── Map Setup ───────────────────────────────────────────────

  const bounds = L.latLngBounds(
    L.latLng(-C.imageHeight, 0),
    L.latLng(0, C.imageWidth)
  );

  const map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: C.minZoom,
    maxZoom: C.maxZoom,
    maxBounds: bounds.pad(0.15),
    maxBoundsViscosity: 0.8,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    attributionControl: false,
  });

  const [cx, cy] = gridToPixel(C.defaultCenter.x, C.defaultCenter.y);
  map.setView(pxToLatLng(cx, cy), C.defaultZoom);

  L.imageOverlay(C.mapImage, bounds).addTo(map);

  // ── Sidebar Toggle ──────────────────────────────────────────

  const sidebarEl = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggle');

  sidebarToggleBtn.addEventListener('click', function () {
    sidebarEl.classList.toggle('collapsed');
    document.body.classList.toggle('sidebar-open');
    setTimeout(() => map.invalidateSize(), 350);
  });

  // ── Grid Number Overlay ───────────────────────────────────

  const gridLayer = L.layerGroup();
  let gridVisible = false;

  function getGridFontSize(zoom) {
    return Math.max(10, Math.round(14 + (zoom) * 3.5));
  }

  function updateGridLabels() {
    gridLayer.clearLayers();
    const zoom = map.getZoom();
    const b = map.getBounds();
    const fontSize = getGridFontSize(zoom);

    const [gxNW, gyNW] = pixelToGrid(Math.max(0, b.getWest()), Math.max(0, -b.getNorth()));
    const [gxSE, gySE] = pixelToGrid(Math.min(C.imageWidth, b.getEast()), Math.min(C.imageHeight, -b.getSouth()));

    const ewStart = Math.floor(Math.min(gxNW, gxSE));
    const ewEnd   = Math.ceil(Math.max(gxNW, gxSE));
    const nsStart = Math.floor(Math.min(gyNW, gySE));
    const nsEnd   = Math.ceil(Math.max(gyNW, gySE));

    let step = 1;
    if (zoom < -1) step = 20;
    else if (zoom < 0) step = 10;
    else if (zoom < 1) step = 5;
    else if (zoom < 2) step = 2;

    const iconW = Math.round(fontSize * 6.5);
    const iconH = Math.round(fontSize * 1.6);

    for (let ew = Math.floor(ewStart / step) * step; ew <= ewEnd; ew += step) {
      if (ew < -172 || ew > 215) continue;
      for (let ns = Math.floor(nsStart / step) * step; ns <= nsEnd; ns += step) {
        if (ns < -36 || ns > 264) continue;
        const [px, py] = gridToPixel(ew, ns);
        const icon = L.divIcon({
          className: 'grid-label',
          html: `<span style="font-size:${fontSize}px;line-height:${iconH}px">${formatGrid(ew, ns)}</span>`,
          iconSize: [iconW, iconH],
          iconAnchor: [iconW / 2, iconH / 2],
        });
        L.marker(pxToLatLng(px, py), { icon, interactive: false }).addTo(gridLayer);
      }
    }
  }

  document.getElementById('gridToggle').addEventListener('click', function () {
    if (gridVisible) {
      map.removeLayer(gridLayer);
      map.off('moveend', updateGridLabels);
      gridVisible = false;
      this.textContent = 'Grid: OFF';
      this.classList.remove('active');
    } else {
      gridLayer.addTo(map);
      updateGridLabels();
      map.on('moveend', updateGridLabels);
      gridVisible = true;
      this.textContent = 'Grid: ON';
      this.classList.add('active');
    }
  });

  // ── Travel Mode Flag (used by click handler below) ─────────

  let travelMode = false;

  // ── Coordinate Display ──────────────────────────────────────

  const coordDisplay = document.getElementById('coordDisplay');

  map.on('mousemove', function (e) {
    const px = e.latlng.lng;
    const py = -e.latlng.lat;
    if (px >= 0 && px <= C.imageWidth && py >= 0 && py <= C.imageHeight) {
      const [gx, gy] = pixelToGrid(px, py);
      coordDisplay.textContent = `Square: ${formatGrid(gx, gy)}`;
      coordDisplay.style.opacity = '1';
    } else {
      coordDisplay.style.opacity = '0.3';
      coordDisplay.textContent = 'Square: ---';
    }
  });

  map.on('mouseout', function () {
    coordDisplay.textContent = 'Square: ---';
    coordDisplay.style.opacity = '0.3';
  });

  map.on('click', function (e) {
    // Skip default popup if travel mode or draw mode handled this click
    if (e.originalEvent._travelHandled) return;
    if (e.originalEvent._drawHandled) return;
    if (travelMode) return;

    const px = e.latlng.lng;
    const py = -e.latlng.lat;
    if (px >= 0 && px <= C.imageWidth && py >= 0 && py <= C.imageHeight) {
      const [gx, gy] = pixelToGrid(px, py);
      L.popup()
        .setLatLng(e.latlng)
        .setContent(`<div class="grid-ref" style="font-size:15px;">Square: ${formatGrid(gx, gy)}</div>`)
        .openOn(map);
    }
  });

  // ── Icon Mapping & Colors ─────────────────────────────────

  const ICON_MAP = {
    location:      'icons/position-marker.svg',
    portal:        'icons/star-gate.svg',
    castle_or_fort:'icons/castle.svg',
    city:          'icons/village.svg',
    dungeon:       'icons/dungeon-gate.svg',
    player_owned:  'icons/player-owned.svg',
  };
  const DEFAULT_ICON = 'icons/position-marker.svg';

  // Display names and dot colors for each type
  const TYPE_META = {
    city:          { label: 'Cities',          color: '#20B2AA' },
    location:      { label: 'Locations',       color: '#E03030' },
    dungeon:       { label: 'Dungeons',        color: '#FF6347' },
    portal:        { label: 'Portals',         color: '#9B30FF' },
    castle_or_fort:{ label: 'Castles & Forts', color: '#FFB800' },
    player_owned:  { label: 'Player Owned',    color: '#44cc44' },
  };

  function getTypeMeta(type) {
    const key = type.toLowerCase().replace(/\s+/g, '_');
    return TYPE_META[key] || { label: type, color: '#c8b888' };
  }

  function normalizeType(type) {
    return (type || 'location').toLowerCase().replace(/\s+/g, '_');
  }

  // ── Type Visibility State ─────────────────────────────────

  const hiddenTypes = new Set();

  function isTypeVisible(type) {
    return !hiddenTypes.has(normalizeType(type));
  }

  // ── Marker Size & Creation ────────────────────────────────

  function getMarkerSize(zoom) {
    return Math.max(24, Math.round(28 + (zoom) * 5));
  }

  function makeIcon(type, size) {
    const key = normalizeType(type);
    const url = ICON_MAP[key] || DEFAULT_ICON;
    const s = size || 28;
    return L.icon({
      iconUrl: url,
      iconSize: [s, s],
      iconAnchor: [s / 2, s / 2],
      popupAnchor: [0, -(s / 2 + 4)],
      className: 'map-marker-icon',
    });
  }

  // ── Google Sheets API Helpers ─────────────────────────────

  const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  const SID = C.sheets.spreadsheetId;
  const SKEY = C.sheets.apiKey;

  function sheetsUrl(tab, range) {
    const r = range ? `${tab}!${range}` : tab;
    return `${SHEETS_BASE}/${SID}/values/${encodeURIComponent(r)}?key=${SKEY}`;
  }

  // ── Apps Script Proxy for Writes ──────────────────────────
  // The API key can only READ public sheets. Writes go through a
  // Google Apps Script web-app proxy. Set this URL after deploying
  // the script (see APPS_SCRIPT_SETUP.md).
  const APPS_SCRIPT_URL = C.sheets.appsScriptUrl || '';

  async function sheetAppend(tab, rowData) {
    if (!APPS_SCRIPT_URL) {
      throw new Error('Apps Script proxy URL not configured. Character writes are disabled.');
    }
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'append', tab, values: [rowData] }),
    });
    if (!resp.ok) throw new Error(`Proxy error ${resp.status}`);
    return resp.json();
  }

  async function sheetClearRow(tab, row) {
    if (!APPS_SCRIPT_URL) {
      throw new Error('Apps Script proxy URL not configured.');
    }
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'clear', tab, row }),
    });
    if (!resp.ok) throw new Error(`Proxy error ${resp.status}`);
    return resp.json();
  }

  // ── Data Loading (Google Sheets with CSV fallback) ────────

  let locations = [];
  let markers = [];

  async function loadLocationsFromSheets() {
    try {
      const resp = await fetch(sheetsUrl(C.sheets.locationsTab));
      if (!resp.ok) throw new Error(`Sheets API ${resp.status}`);
      const data = await resp.json();
      const rows = data.values || [];
      if (rows.length < 2) throw new Error('No data rows');

      const headers = rows[0].map(h => h.trim().toLowerCase());
      locations = [];
      for (let i = 1; i < rows.length; i++) {
        const row = {};
        headers.forEach((h, j) => { row[h] = (rows[i][j] || '').trim(); });
        const loc = processRow(row);
        if (loc) locations.push(loc);
      }
      console.log(`Loaded ${locations.length} locations from Google Sheets`);
      return locations;
    } catch (err) {
      console.warn('Sheets load failed, falling back to CSV:', err);
      return loadCSVFallback();
    }
  }

  function loadCSVFallback() {
    return new Promise((resolve, reject) => {
      Papa.parse('data/locations.csv', {
        download: true, header: true, skipEmptyLines: true,
        complete: function (results) {
          locations = results.data.map(processRow).filter(Boolean);
          console.log(`Loaded ${locations.length} locations from CSV fallback`);
          resolve(locations);
        },
        error: reject,
      });
    });
  }

  function processRow(row) {
    let gridX, gridY;
    if (row.square) {
      const parts = row.square.toString().trim();
      const match = parts.match(/^(-?\d+)\.(-?\d+)$/);
      if (match) {
        gridX = parseInt(match[1], 10);
        gridY = parseInt(match[2], 10);
      } else {
        const dotIdx = parts.indexOf('.');
        if (dotIdx >= 0) {
          gridX = parseInt(parts.substring(0, dotIdx), 10);
          gridY = parseInt(parts.substring(dotIdx + 1), 10);
        } else {
          return null;
        }
      }
    } else {
      return null;
    }
    if (isNaN(gridX) || isNaN(gridY)) return null;

    const visible = row.visible !== undefined
      ? String(row.visible).toLowerCase() !== 'false'
      : true;

    return {
      gridX, gridY,
      name: row.name || '',
      type: (row.type || 'location').trim(),
      description: row.description || '',
      color: row.color || '#c8b888',
      visible,
    };
  }

  // ── Markers ───────────────────────────────────────────────

  function createMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    const size = getMarkerSize(map.getZoom());

    locations.forEach(loc => {
      if (!loc.visible) return;
      const [px, py] = gridToPixel(loc.gridX, loc.gridY);
      const icon = makeIcon(loc.type, size);
      const marker = L.marker(pxToLatLng(px, py), { icon, interactive: true });

      const popupHtml = `
        <h3>${loc.name || 'Location'}</h3>
        <div class="grid-ref">Square: ${formatGrid(loc.gridX, loc.gridY)}</div>
        ${loc.type ? `<div style="color:#888;font-size:12px;margin-top:2px;">${loc.type}</div>` : ''}
        ${loc.description ? `<div class="description">${loc.description}</div>` : ''}
      `;
      marker.bindPopup(popupHtml, { maxWidth: 350 });

      // Respect type visibility
      if (isTypeVisible(loc.type)) {
        marker.addTo(map);
      }
      markers.push(marker);
      marker._locationData = loc;
    });
  }

  function updateMarkerSizes() {
    const size = getMarkerSize(map.getZoom());
    markers.forEach(m => {
      const loc = m._locationData;
      if (loc) m.setIcon(makeIcon(loc.type, size));
    });
  }
  map.on('zoomend', updateMarkerSizes);

  function refreshTypeVisibility() {
    markers.forEach(m => {
      const loc = m._locationData;
      if (!loc) return;
      if (isTypeVisible(loc.type) && loc.visible) {
        if (!map.hasLayer(m)) m.addTo(map);
      } else {
        if (map.hasLayer(m)) map.removeLayer(m);
      }
    });
  }

  // ── Regions / Polygons ────────────────────────────────────

  let regions = [];
  const regionLayers = [];
  const regionLayerGroup = L.layerGroup();
  let regionsVisible = false;
  const hiddenRegions = new Set();

  function loadRegions() {
    return new Promise((resolve) => {
      Papa.parse('data/regions.csv', {
        download: true, header: true, skipEmptyLines: true,
        complete: function (results) {
          regions = results.data.map(processRegion).filter(Boolean);
          console.log(`Loaded ${regions.length} regions`);
          resolve(regions);
        },
        error: function () {
          console.log('No regions.csv found (optional)');
          resolve([]);
        },
      });
    });
  }

  function processRegion(row) {
    if (!row.name || !row.coordinates) return null;
    const coordPairs = row.coordinates.trim().split(/\s+/);
    const latLngs = [];
    for (const pair of coordPairs) {
      const match = pair.match(/^(-?\d+)\.(-?\d+)$/);
      if (!match) continue;
      const gx = parseInt(match[1], 10);
      const gy = parseInt(match[2], 10);
      const [px, py] = gridToPixel(gx, gy);
      latLngs.push(pxToLatLng(px, py));
    }
    if (latLngs.length < 3) return null;

    return {
      name: row.name,
      description: row.description || '',
      color: row.color || '#c8b888',
      fillOpacity: parseFloat(row.fill_opacity) || 0.15,
      borderOpacity: parseFloat(row.border_opacity) || 0.6,
      latLngs,
    };
  }

  function createRegions() {
    regionLayers.length = 0;
    regionLayerGroup.clearLayers();

    regions.forEach(reg => {
      const poly = L.polygon(reg.latLngs, {
        color: reg.color, weight: 2, opacity: reg.borderOpacity,
        fillColor: reg.color, fillOpacity: reg.fillOpacity, interactive: true,
      });
      const popupHtml = `
        <h3>${reg.name}</h3>
        ${reg.description ? `<div class="description">${reg.description}</div>` : ''}
      `;
      poly.bindPopup(popupHtml, { maxWidth: 350 });
      poly._regionData = reg;
      regionLayers.push(poly);
      if (!hiddenRegions.has(reg.name)) {
        poly.addTo(regionLayerGroup);
      }
    });
  }

  document.getElementById('regionsToggle').addEventListener('click', function () {
    if (regionsVisible) {
      map.removeLayer(regionLayerGroup);
      regionsVisible = false;
      this.textContent = 'Regions: OFF';
      this.classList.remove('active');
    } else {
      regionLayerGroup.addTo(map);
      regionsVisible = true;
      this.textContent = 'Regions: ON';
      this.classList.add('active');
    }
  });

  function refreshRegionVisibility() {
    regionLayers.forEach(poly => {
      const reg = poly._regionData;
      if (!reg) return;
      if (hiddenRegions.has(reg.name)) {
        if (regionLayerGroup.hasLayer(poly)) regionLayerGroup.removeLayer(poly);
      } else {
        if (!regionLayerGroup.hasLayer(poly)) poly.addTo(regionLayerGroup);
      }
    });
  }

  // ── Sidebar: Tabs, Toggles, List ──────────────────────────

  const sidebarTabsEl   = document.getElementById('sidebarTabs');
  const typeTogglesEl   = document.getElementById('typeToggles');
  const regionTogglesEl = document.getElementById('regionToggles');
  const sidebarListEl   = document.getElementById('sidebarList');
  const sidebarFooterEl = document.getElementById('sidebarFooter');
  const searchInput     = document.getElementById('searchInput');

  let activeTab = 'all';
  let knownTypes = [];

  function discoverTypes() {
    const typeSet = new Set();
    locations.forEach(loc => {
      if (loc.visible) typeSet.add(normalizeType(loc.type));
    });
    const order = ['city', 'location', 'dungeon', 'portal', 'castle_or_fort', 'player_owned'];
    knownTypes = order.filter(t => typeSet.has(t));
    typeSet.forEach(t => {
      if (!knownTypes.includes(t)) knownTypes.push(t);
    });
  }

  function buildTabs() {
    sidebarTabsEl.innerHTML = '';

    // "All" tab
    const allBtn = document.createElement('button');
    allBtn.className = 'sidebar-tab' + (activeTab === 'all' ? ' active' : '');
    const allCount = locations.filter(l => l.visible && isTypeVisible(l.type)).length;
    allBtn.innerHTML = `All <span class="tab-count">${allCount}</span>`;
    allBtn.addEventListener('click', () => { activeTab = 'all'; buildTabs(); renderList(); });
    sidebarTabsEl.appendChild(allBtn);

    knownTypes.forEach(type => {
      const meta = getTypeMeta(type);
      const count = locations.filter(l => l.visible && normalizeType(l.type) === type && isTypeVisible(l.type)).length;
      const btn = document.createElement('button');
      btn.className = 'sidebar-tab' + (activeTab === type ? ' active' : '');
      btn.innerHTML = `${meta.label} <span class="tab-count">${count}</span>`;
      btn.addEventListener('click', () => { activeTab = type; buildTabs(); renderList(); });
      sidebarTabsEl.appendChild(btn);
    });

    // "Wilderness Travel" tab
    const wildBtn = document.createElement('button');
    wildBtn.className = 'sidebar-tab' + (activeTab === 'wilderness' ? ' active' : '');
    wildBtn.style.color = activeTab === 'wilderness' ? '#c8b888' : '#888';
    wildBtn.innerHTML = 'Wilderness Travel';
    wildBtn.addEventListener('click', () => { activeTab = 'wilderness'; buildTabs(); renderList(); });
    sidebarTabsEl.appendChild(wildBtn);
  }

  function buildTypeToggles() {
    typeTogglesEl.innerHTML = '';
    knownTypes.forEach(type => {
      const meta = getTypeMeta(type);
      const el = document.createElement('div');
      el.className = 'type-toggle' + (hiddenTypes.has(type) ? ' hidden-type' : '');
      el.innerHTML = `<span class="toggle-dot" style="background:${meta.color}"></span>${meta.label}`;
      el.addEventListener('click', () => {
        if (hiddenTypes.has(type)) { hiddenTypes.delete(type); }
        else { hiddenTypes.add(type); }
        refreshTypeVisibility();
        buildTypeToggles();
        buildTabs();
        renderList();
      });
      typeTogglesEl.appendChild(el);
    });
  }

  function buildRegionToggles() {
    regionTogglesEl.innerHTML = '';
    if (regions.length === 0) { regionTogglesEl.style.display = 'none'; return; }
    regionTogglesEl.style.display = '';

    const seen = new Set();
    regions.forEach(reg => {
      if (seen.has(reg.name)) return;
      seen.add(reg.name);
      const el = document.createElement('div');
      el.className = 'region-toggle' + (hiddenRegions.has(reg.name) ? ' hidden-region' : '');
      el.innerHTML = `<span class="toggle-swatch" style="background:${reg.color}"></span>${reg.name}`;
      el.addEventListener('click', () => {
        if (hiddenRegions.has(reg.name)) { hiddenRegions.delete(reg.name); }
        else { hiddenRegions.add(reg.name); }
        refreshRegionVisibility();
        buildRegionToggles();
      });
      regionTogglesEl.appendChild(el);
    });
  }

  function getFilteredLocations() {
    const q = searchInput.value.toLowerCase().trim();
    return locations.filter(loc => {
      if (!loc.visible) return false;
      if (!isTypeVisible(loc.type)) return false;
      if (activeTab !== 'all' && activeTab !== 'wilderness' && normalizeType(loc.type) !== activeTab) return false;
      if (q) {
        const searchable = [loc.name, loc.type, loc.description, formatGrid(loc.gridX, loc.gridY)]
          .map(s => (s || '').toLowerCase()).join(' ');
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }

  // ── Wilderness Travel Panel ───────────────────────────────

  const wildernessPanel = document.getElementById('wildernessPanel');

  function renderList() {
    // Toggle between location list and wilderness panel
    if (activeTab === 'wilderness') {
      sidebarListEl.style.display = 'none';
      wildernessPanel.style.display = '';
      sidebarFooterEl.textContent = 'Wilderness Travel Rules';
      if (!wildernessPanel.innerHTML) buildWildernessPanel();
      return;
    }
    sidebarListEl.style.display = '';
    wildernessPanel.style.display = 'none';

    const filtered = getFilteredLocations();
    sidebarListEl.innerHTML = '';

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    filtered.forEach(loc => {
      const ntype = normalizeType(loc.type);
      const meta = getTypeMeta(ntype);
      const iconUrl = ICON_MAP[ntype] || DEFAULT_ICON;

      const div = document.createElement('div');
      div.className = 'loc-item';
      div.innerHTML = `
        <div class="loc-item-name">
          <img src="${iconUrl}" alt="" />
          ${loc.name}
        </div>
        <div class="loc-item-grid">${formatGrid(loc.gridX, loc.gridY)} &middot; <span style="color:${meta.color}">${meta.label}</span></div>
        ${loc.description ? `<div class="loc-item-desc">${loc.description.substring(0, 120)}${loc.description.length > 120 ? '...' : ''}</div>` : ''}
      `;
      div.addEventListener('click', () => {
        flyToLocation(loc);
        sidebarListEl.querySelectorAll('.loc-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
      });
      sidebarListEl.appendChild(div);
    });

    sidebarFooterEl.textContent = `${filtered.length} location${filtered.length !== 1 ? 's' : ''}`;
  }

  function buildWildernessPanel() {
    wildernessPanel.innerHTML = `<div class="wilderness-content">
<h3>Daily Wilderness Procedure</h3>
<p><strong>START:</strong> Roll d6 to check if lost. If lost, travel 1 square in a random direction (d8: 1=N, 2=NE, 3=E, 4=SE, 5=S, 6=SW, 7=W, 8=NW), then resume normal travel.</p>
<p><strong>MOVE:</strong> Travel squares equal to daily movement. Roll 1d6 for encounters <strong>3 times/day</strong> (morning, noon, night) based on terrain.</p>
<p><strong>INTERACTION:</strong> Interact with or evade encounters. Evasion Roll required for Wandering Monsters/Pilgrims (B&amp;B Vol-4 pg.22). Parties spot monsters 120'-720' away unless surprised.</p>
<p><strong>CAMP:</strong> Set up camp, consume a ration, heal 1hp. Roll final encounter check.</p>
<ul>
<li>60% chance sleeping when encounter arrives (surprised 4-in-6)</li>
<li>Night watch: 15% chance asleep</li>
<li>If awake: surprise returns to 2-in-6</li>
</ul>

<h3>Lost &amp; Encounter Chances (d6)</h3>
<table>
<tr><th></th><th>Clear</th><th>Woods</th><th>River</th><th>Swamp</th><th>Mtns</th><th>Desert</th><th>Dead</th><th>Jungle</th><th>Arid</th><th>Crater</th><th>Canyon</th></tr>
<tr><td><strong>Lost</strong></td><td>1</td><td>1-2</td><td>1</td><td>1-3</td><td>1-2</td><td>1-3</td><td>1-3</td><td>1-3</td><td>1-2</td><td>1</td><td>1-3</td></tr>
<tr><td><strong>Enc.</strong></td><td>6</td><td>5-6</td><td>5-6</td><td>4-6</td><td>4-6</td><td>5-6</td><td>4-6</td><td>4-6</td><td>5-6</td><td>4-6</td><td>5-6</td></tr>
</table>

<h3>Encounter Type (d12)</h3>
<table>
<tr><th>d12</th><th>Result</th></tr>
<tr><td>1-5</td><td>Wandering Monsters (Vol-4 pg.20)</td></tr>
<tr><td>6-8</td><td>Keyed Hex Location*</td></tr>
<tr><td>9-10</td><td>Pilgrims (Vol-4 pg.22)</td></tr>
<tr><td>11-12</td><td>Random Location (Vol-4 pg.23)</td></tr>
</table>
<p class="note">*If no Keyed Locations present, treat as Wandering Monster.</p>
<p class="note">Ship/air travel: encounters on 6 only. If docked: waterborne on 5, normal on 6.</p>
<p class="note">Monsters: 20% chance Hybrid, 15% chance Infused.</p>

<h3>Wandering Monster Table (d10)</h3>
<table>
<tr><th></th><th>Clear</th><th>Woods</th><th>River</th><th>Swamp</th><th>Mtns</th><th>Desert</th><th>Dead</th><th>Jungle</th><th>Arid</th><th>Crater</th><th>Canyon</th><th>Tundra</th></tr>
<tr><td>1</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td><td>Men</td></tr>
<tr><td>2</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td><td>Flyer</td></tr>
<tr><td>3</td><td>Man-Like</td><td>Man-Like</td><td>Man-Like</td><td>Man-Like</td><td>Man-Like</td><td>Man-Like</td><td>Undead</td><td>Dino</td><td>Man-Like</td><td>Strange</td><td>Man-Like</td><td>Man-Like</td></tr>
<tr><td>4</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Men</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td><td>Lycan.</td></tr>
<tr><td>5</td><td>Animals</td><td>Lycan.</td><td>Swimmer</td><td>Swimmer</td><td>Animals</td><td>Animals</td><td>Undead</td><td>Animals</td><td>Animals</td><td>Animals</td><td>Animals</td><td>Animals</td></tr>
<tr><td>6</td><td>Men</td><td>Men</td><td>Swimmer</td><td>Undead</td><td>Man-Like</td><td>Dragon</td><td>Dragon</td><td>Undead</td><td>Men</td><td>Dragon</td><td>Men</td><td>Animals</td></tr>
<tr><td>7</td><td>Animals</td><td>Animals</td><td>Animals</td><td>Undead</td><td>Dragon</td><td>Animals</td><td>Man-Like</td><td>Animals</td><td>Animals</td><td>Undead</td><td>Animals</td><td>Undead</td></tr>
<tr><td>8</td><td>Dragon</td><td>Dragon</td><td>Dragon</td><td>Dragon</td><td>Dragon</td><td>Undead</td><td>Dino</td><td>Dino</td><td>Dino</td><td>Dino</td><td>Dino</td><td>Undead</td></tr>
<tr><td>9</td><td>Dino</td><td>Men</td><td>Swimmer</td><td>Strange</td><td>Men</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Undead</td><td>Dino</td><td>Frozen</td></tr>
<tr><td>10</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td><td>Strange</td></tr>
</table>
<p class="note">Tundra: 65% chance encounters are Frozen (Cold Resistance, 25% immune to Cold).</p>

<h3>Hybrid Monster (20% chance, d100)</h3>
<table>
<tr><th>d100</th><th>Type</th><th>d100</th><th>Type</th><th>d100</th><th>Type</th><th>d100</th><th>Type</th></tr>
<tr><td>01</td><td>Cat</td><td>21</td><td>Raven</td><td>36</td><td>Mastodon</td><td>58</td><td>Beaver</td></tr>
<tr><td>02</td><td>Dog</td><td>22</td><td>Slug</td><td>37</td><td>Robot</td><td>59</td><td>Wolverine</td></tr>
<tr><td>03</td><td>Lion</td><td>23</td><td>Snake</td><td>38</td><td>Fish</td><td>60</td><td>Lycanthrope</td></tr>
<tr><td>04</td><td>Tiger</td><td>24</td><td>Lizard</td><td>39</td><td>Shark</td><td>61</td><td>Elemental</td></tr>
<tr><td>05</td><td>Octopus</td><td>25</td><td>Hippo</td><td>40</td><td>Eel</td><td>62</td><td>Golem</td></tr>
<tr><td>06</td><td>Falcon</td><td>26</td><td>Deer</td><td>41-45</td><td>Human</td><td>63</td><td>Dinosaur</td></tr>
<tr><td>07</td><td>Newt</td><td>27</td><td>Painter</td><td>46</td><td>Elf</td><td>64</td><td>Energy Being</td></tr>
<tr><td>08</td><td>Alligator</td><td>28</td><td>Beetle</td><td>47</td><td>Dwarf</td><td>65</td><td>Dark Staborn</td></tr>
<tr><td>09</td><td>Frog</td><td>29</td><td>Spider</td><td>48</td><td>Orc</td><td>66</td><td>Daemon</td></tr>
<tr><td>10</td><td>Boar</td><td>30</td><td>Centipede</td><td>49</td><td>Starborn</td><td>67</td><td>Giant</td></tr>
<tr><td>11</td><td>Ibis</td><td>31</td><td>Bat</td><td>50</td><td>Kobold</td><td>68</td><td>Long Arms</td></tr>
<tr><td>12</td><td>Skeleton</td><td>32</td><td>Troll</td><td>51</td><td>Snail</td><td>69-83</td><td>Other Random Race</td></tr>
<tr><td>13</td><td>Zombie</td><td>33</td><td>Ogre</td><td>52-55</td><td>Slime</td><td>84-98</td><td>Other Random Monster</td></tr>
<tr><td>14</td><td>Vampire</td><td>34</td><td>Caveman</td><td>56</td><td>Basilisk</td><td>99</td><td>Roll Two, Add Both</td></tr>
<tr><td>15-20</td><td>Medusa</td><td>35</td><td>Alien</td><td>57</td><td>Bear</td><td>00</td><td>Roll Three, Add All</td></tr>
</table>

<h3>Infusion Modifier (15% chance, d20)</h3>
<table>
<tr><th>d20</th><th>Color</th><th>Effect</th></tr>
<tr><td>1</td><td>Blue</td><td>Immune: C, M. Double damage from F</td></tr>
<tr><td>2</td><td>Green</td><td>Immune: A, PO, V, G, M</td></tr>
<tr><td>3</td><td>Cyan</td><td>Immune: L, C, M</td></tr>
<tr><td>4</td><td>Red</td><td>Immune: F, M. Double damage from C</td></tr>
<tr><td>5</td><td>Purple</td><td>15' Aura of Sleep (Sorcery ST)</td></tr>
<tr><td>6</td><td>Yellow</td><td>Immune: A, M. Acid spit 2&times;HP 15' cone (Breath ST)</td></tr>
<tr><td>7</td><td>Indigo</td><td>Can become ethereal (as Specter)</td></tr>
<tr><td>8</td><td>Ylw-Green</td><td>Can morph body like a Slime</td></tr>
<tr><td>9</td><td>Magenta</td><td>2 random Psychic Disciplines (Inv. 6)</td></tr>
<tr><td>10</td><td>Orange</td><td>Immune: F, L, M</td></tr>
<tr><td>11</td><td>Violet</td><td>80% Sorcery Resistance</td></tr>
<tr><td>12</td><td>Pink</td><td>Magic bubble breath (d6s = HD, Breath ST)</td></tr>
<tr><td>13</td><td>Copper</td><td>Immune to all ranged attacks</td></tr>
<tr><td>14</td><td>Silver</td><td>60' Spell Dampening Aura (-2 CL)</td></tr>
<tr><td>15</td><td>Gold</td><td>Immune: nearly everything. 70% SR. Only +3 weapons</td></tr>
<tr><td>16</td><td>Dolm</td><td>Can Teleport at will</td></tr>
<tr><td>17</td><td>Jale</td><td>CL = d20. Has 1-10 random spells</td></tr>
<tr><td>18</td><td>Ulfire</td><td>Ulfire Dragon Breath (2&times;HP damage)</td></tr>
<tr><td>19</td><td colspan="2">Roll Again: Two Colors combined</td></tr>
<tr><td>20</td><td colspan="2">Roll Again: Three Colors combined</td></tr>
</table>

<h3>Immunity Codes</h3>
<table>
<tr><th>Code</th><th>Immunity</th><th>Code</th><th>Immunity</th><th>Code</th><th>Immunity</th></tr>
<tr><td>A</td><td>Acid</td><td>FR</td><td>Fear</td><td>P</td><td>Paralysis</td></tr>
<tr><td>C</td><td>Cold</td><td>G</td><td>Gas</td><td>PO</td><td>Poison</td></tr>
<tr><td>CF</td><td>Confusion</td><td>L</td><td>Lightning</td><td>PY</td><td>Psychic</td></tr>
<tr><td>CH</td><td>Charm</td><td>LB</td><td>Life Blasting</td><td>S</td><td>Sonics</td></tr>
<tr><td>E</td><td>Energy</td><td>LD</td><td>Life Draining</td><td>SL</td><td>Sleep</td></tr>
<tr><td>F</td><td>Fire</td><td>M</td><td>Mundane Wpns</td><td>V</td><td>Venom</td></tr>
</table>
</div>`;
  }

  // ── Fly to Location ───────────────────────────────────────

  function flyToLocation(loc) {
    const [px, py] = gridToPixel(loc.gridX, loc.gridY);
    const latLng = pxToLatLng(px, py);
    map.flyTo(latLng, Math.max(map.getZoom(), 3));
    const m = markers.find(mk => mk._locationData === loc);
    if (m) { setTimeout(() => m.openPopup(), 400); }
  }

  // ── Search ────────────────────────────────────────────────

  searchInput.addEventListener('input', function () {
    renderList();
    const q = this.value.toLowerCase().trim();
    markers.forEach(m => {
      const el = m.getElement?.();
      if (!q) {
        m.setOpacity(1);
        el?.classList.remove('search-hit', 'search-dim');
        return;
      }
      const l = m._locationData;
      const hit = [l.name, l.type, l.description, formatGrid(l.gridX, l.gridY)]
        .some(s => s && s.toLowerCase().includes(q));
      if (hit) {
        m.setOpacity(1);
        el?.classList.add('search-hit');
        el?.classList.remove('search-dim');
      } else {
        m.setOpacity(0.3);
        el?.classList.remove('search-hit');
        el?.classList.add('search-dim');
      }
    });
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const filtered = getFilteredLocations();
      if (filtered.length > 0) { flyToLocation(filtered[0]); }
    }
  });

  // ── Keyboard Shortcuts ────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchInput.blur();
      map.closePopup();
      markers.forEach(m => {
        m.setOpacity(1);
        m.getElement?.()?.classList.remove('search-hit', 'search-dim');
      });
      renderList();
    }
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey && document.activeElement !== searchInput) {
      document.getElementById('gridToggle').click();
    }
  });

  // ── Travel Distance Calculator ────────────────────────────

  const travelPanel      = document.getElementById('travelPanel');
  const travelToggleBtn  = document.getElementById('travelToggle');
  const travelCloseBtn   = document.getElementById('travelClose');
  const travelResetBtn   = document.getElementById('travelReset');
  const travelSpeedInput = document.getElementById('travelSpeed');
  const travelInstructions = document.getElementById('travelInstructions');
  const travelPointAEl   = document.getElementById('travelPointA').querySelector('.point-value');
  const travelPointBEl   = document.getElementById('travelPointB').querySelector('.point-value');
  const travelResultEl   = document.getElementById('travelResult');

  let travelPointA = null;
  let travelPointB = null;
  const travelMarkers = [];
  let travelLine = null;

  function calcGridDistance(ax, ay, bx, by) {
    const dx = Math.abs(bx - ax);
    const dy = Math.abs(by - ay);
    const diag = Math.min(dx, dy);
    const straight = Math.abs(dx - dy);
    const totalSquares = diag * 1.5 + straight;
    return totalSquares;
  }

  function updateTravelResult() {
    if (!travelPointA || !travelPointB) { travelResultEl.classList.remove('visible'); return; }
    const speed = Math.max(1, parseInt(travelSpeedInput.value, 10) || 24);
    const distSquares = calcGridDistance(travelPointA.gx, travelPointA.gy, travelPointB.gx, travelPointB.gy);
    const distMiles = distSquares * 5;
    const travelDays = distSquares / speed;

    let daysStr;
    if (travelDays < 1) {
      const hours = travelDays * 8;
      daysStr = hours < 1 ? `< 1 hour` : `~${hours.toFixed(1)} hours (of an 8-hr travel day)`;
    } else {
      daysStr = `${travelDays.toFixed(1)} day${travelDays >= 1.05 ? 's' : ''}`;
    }

    travelResultEl.innerHTML = `
      <div>Grid distance: <span class="result-value">${distSquares.toFixed(1)} squares</span></div>
      <div>Distance: <span class="result-value">${distMiles.toFixed(1)} miles</span></div>
      <div>Travel time: <span class="result-value">${daysStr}</span></div>
      <div style="font-size:11px;color:#888;margin-top:4px;">At ${speed} squares/day · 5 mi/square</div>
    `;
    travelResultEl.classList.add('visible');
  }

  function clearTravelPoints() {
    travelPointA = null; travelPointB = null;
    travelPointAEl.textContent = '—'; travelPointBEl.textContent = '—';
    travelResultEl.classList.remove('visible');
    travelMarkers.forEach(m => map.removeLayer(m));
    travelMarkers.length = 0;
    if (travelLine) { map.removeLayer(travelLine); travelLine = null; }
    travelInstructions.textContent = 'Click two points on the map to measure travel distance.';
  }

  function addTravelMarker(gx, gy, isA) {
    const [px, py] = gridToPixel(gx, gy);
    const latLng = pxToLatLng(px, py);
    const icon = L.divIcon({
      className: `travel-marker ${isA ? 'point-a' : 'point-b'}`,
      iconSize: [16, 16], iconAnchor: [8, 8],
    });
    const m = L.marker(latLng, { icon, interactive: false, zIndexOffset: 9000 }).addTo(map);
    travelMarkers.push(m);
    return latLng;
  }

  function drawTravelLine() {
    if (travelLine) { map.removeLayer(travelLine); travelLine = null; }
    if (!travelPointA || !travelPointB) return;
    const [pxA, pyA] = gridToPixel(travelPointA.gx, travelPointA.gy);
    const [pxB, pyB] = gridToPixel(travelPointB.gx, travelPointB.gy);
    travelLine = L.polyline(
      [pxToLatLng(pxA, pyA), pxToLatLng(pxB, pyB)],
      { color: '#c8b888', weight: 2, dashArray: '8 6', opacity: 0.8 }
    ).addTo(map);
  }

  function handleTravelClick(e) {
    if (!travelMode) return;
    const px = e.latlng.lng;
    const py = -e.latlng.lat;
    if (px < 0 || px > C.imageWidth || py < 0 || py > C.imageHeight) return;
    const [gx, gy] = pixelToGrid(px, py);
    const snappedX = Math.round(gx);
    const snappedY = Math.round(gy);

    if (!travelPointA) {
      travelPointA = { gx: snappedX, gy: snappedY };
      travelPointAEl.textContent = formatGrid(snappedX, snappedY);
      addTravelMarker(snappedX, snappedY, true);
      travelInstructions.textContent = 'Now click the destination point.';
    } else if (!travelPointB) {
      travelPointB = { gx: snappedX, gy: snappedY };
      travelPointBEl.textContent = formatGrid(snappedX, snappedY);
      addTravelMarker(snappedX, snappedY, false);
      drawTravelLine();
      updateTravelResult();
      travelInstructions.textContent = 'Done! Reset to measure again.';
    }
    e.originalEvent._travelHandled = true;
  }

  function enableTravelMode() {
    travelMode = true;
    travelPanel.classList.add('active');
    travelToggleBtn.classList.add('active');
    travelToggleBtn.textContent = 'Travel: ON';
    document.getElementById('map').classList.add('travel-cursor');
    map.on('click', handleTravelClick);
  }

  function disableTravelMode() {
    travelMode = false;
    travelPanel.classList.remove('active');
    travelToggleBtn.classList.remove('active');
    travelToggleBtn.textContent = 'Travel';
    document.getElementById('map').classList.remove('travel-cursor');
    map.off('click', handleTravelClick);
    clearTravelPoints();
  }

  travelToggleBtn.addEventListener('click', function () {
    if (travelMode) { disableTravelMode(); } else { enableTravelMode(); }
  });
  travelCloseBtn.addEventListener('click', disableTravelMode);
  travelResetBtn.addEventListener('click', clearTravelPoints);
  travelSpeedInput.addEventListener('input', updateTravelResult);

  // ── Character Placement System ─────────────────────────────

  let characters = [];
  const charMarkers = [];
  const CHAR_HEADERS = ['square', 'player_name', 'character_name', 'race', 'class', 'level', 'xp', 'timestamp'];

  const RATE_LIMIT = 3;
  const RATE_WINDOW = 30 * 60 * 1000;

  function getPlacementLog() {
    try { return JSON.parse(localStorage.getItem('firnum_char_placements') || '[]'); }
    catch { return []; }
  }

  function logPlacement() {
    const log = getPlacementLog();
    log.push(Date.now());
    localStorage.setItem('firnum_char_placements', JSON.stringify(log));
  }

  function canPlace() {
    const now = Date.now();
    const log = getPlacementLog().filter(t => now - t < RATE_WINDOW);
    localStorage.setItem('firnum_char_placements', JSON.stringify(log));
    return { allowed: log.length < RATE_LIMIT, remaining: RATE_LIMIT - log.length, log };
  }

  async function loadCharacters() {
    try {
      const resp = await fetch(sheetsUrl(C.sheets.charactersTab));
      if (!resp.ok) throw new Error(`Sheets API ${resp.status}`);
      const data = await resp.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        // Initialize headers via proxy if available
        if (APPS_SCRIPT_URL) {
          try { await sheetAppend(C.sheets.charactersTab, CHAR_HEADERS); } catch (e) { console.warn('Header init failed:', e); }
        }
        characters = [];
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      characters = [];
      for (let i = 1; i < rows.length; i++) {
        const row = {};
        headers.forEach((h, j) => { row[h] = (rows[i][j] || '').trim(); });
        if (!row.square || !row.character_name) continue;
        row._sheetRow = i + 1;
        characters.push(row);
      }
      console.log(`Loaded ${characters.length} characters from Sheets`);
    } catch (err) {
      console.warn('Failed to load characters:', err);
      characters = [];
    }
  }

  function createCharacterMarkers() {
    charMarkers.forEach(m => map.removeLayer(m));
    charMarkers.length = 0;

    const bySquare = {};
    characters.forEach(ch => {
      if (!bySquare[ch.square]) bySquare[ch.square] = [];
      bySquare[ch.square].push(ch);
    });

    Object.entries(bySquare).forEach(([square, chars]) => {
      const match = square.match(/^(-?\d+)\.(-?\d+)$/);
      if (!match) return;
      const gx = parseInt(match[1], 10);
      const gy = parseInt(match[2], 10);
      const [px, py] = gridToPixel(gx, gy);
      const count = chars.length;

      const icon = L.divIcon({
        className: 'char-marker',
        html: count > 1 ? `${count}` : chars[0].character_name.charAt(0).toUpperCase(),
        iconSize: [20, 20], iconAnchor: [10, 10],
      });

      const marker = L.marker(pxToLatLng(px, py), {
        icon, interactive: true, zIndexOffset: 5000,
      }).addTo(map);

      marker.bindPopup(buildCharPopup(square, chars), { maxWidth: 350 });
      marker._charSquare = square;
      marker._chars = chars;
      charMarkers.push(marker);
    });
  }

  function buildCharPopup(square, chars) {
    let html = `<h3>Characters at ${square}</h3><div class="char-popup-list">`;
    chars.forEach(ch => {
      html += `
        <div class="char-popup-entry">
          <button class="char-popup-remove" data-row="${ch._sheetRow}" data-player="${escHtml(ch.player_name)}" title="Remove this character">remove</button>
          <div class="char-popup-name">${escHtml(ch.character_name)}</div>
          <div class="char-popup-info">
            ${escHtml(ch.player_name)} · ${escHtml(ch.race)} ${escHtml(ch.class)} · Lv ${escHtml(ch.level)} · ${Number(ch.xp || 0).toLocaleString()} XP
          </div>
        </div>`;
    });
    html += '</div>';
    return html;
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // Handle remove clicks inside popups
  map.on('popupopen', function (e) {
    const popup = e.popup;
    const container = popup.getElement();
    if (!container) return;
    container.querySelectorAll('.char-popup-remove').forEach(btn => {
      btn.addEventListener('click', async function () {
        const row = parseInt(this.dataset.row, 10);
        const playerName = this.dataset.player;

        const confirmName = prompt(`To remove this character, type the player name "${playerName}":`);
        if (!confirmName || confirmName.trim().toLowerCase() !== playerName.toLowerCase()) {
          alert('Player name does not match. Removal cancelled.');
          return;
        }

        try {
          await sheetClearRow(C.sheets.charactersTab, row);
          await loadCharacters();
          createCharacterMarkers();
          map.closePopup();
          alert('Character removed.');
        } catch (err) {
          console.error('Remove failed:', err);
          alert('Failed to remove character. The write proxy may not be configured yet.');
        }
      });
    });
  });

  // ── Right-Click Context Menu ───────────────────────────────

  const contextMenu   = document.getElementById('charContextMenu');
  const contextHeader = document.getElementById('charMenuHeader');
  const contextPlace  = document.getElementById('charMenuPlace');
  const contextView   = document.getElementById('charMenuView');
  let contextSquare = null;

  document.getElementById('map').addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  map.on('contextmenu', function (e) {
    const px = e.latlng.lng;
    const py = -e.latlng.lat;
    if (px < 0 || px > C.imageWidth || py < 0 || py > C.imageHeight) return;

    const [gx, gy] = pixelToGrid(px, py);
    const snappedX = Math.round(gx);
    const snappedY = Math.round(gy);
    const formatted = formatGrid(snappedX, snappedY);
    contextSquare = { gx: snappedX, gy: snappedY, formatted };

    contextHeader.textContent = `Square: ${formatted}`;
    const charsHere = characters.filter(c => c.square === formatted);
    contextView.style.display = charsHere.length > 0 ? '' : 'none';

    contextMenu.style.left = e.originalEvent.clientX + 'px';
    contextMenu.style.top = e.originalEvent.clientY + 'px';
    contextMenu.classList.add('visible');
  });

  document.addEventListener('click', function () { contextMenu.classList.remove('visible'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') contextMenu.classList.remove('visible');
  });

  contextView.addEventListener('click', function () {
    if (!contextSquare) return;
    const charsHere = characters.filter(c => c.square === contextSquare.formatted);
    if (charsHere.length === 0) return;
    const [px, py] = gridToPixel(contextSquare.gx, contextSquare.gy);
    L.popup()
      .setLatLng(pxToLatLng(px, py))
      .setContent(buildCharPopup(contextSquare.formatted, charsHere))
      .openOn(map);
  });

  // ── Character Placement Modal ──────────────────────────────

  const modalOverlay   = document.getElementById('charModalOverlay');
  const modalSquareEl  = document.getElementById('charModalSquare');
  const charPlayerName = document.getElementById('charPlayerName');
  const charCharName   = document.getElementById('charCharName');
  const charRace       = document.getElementById('charRace');
  const charClass      = document.getElementById('charClass');
  const charLevel      = document.getElementById('charLevel');
  const charXP         = document.getElementById('charXP');
  const charRateLimitMsg = document.getElementById('charRateLimit');
  const charSaveBtn    = document.getElementById('charModalSave');

  contextPlace.addEventListener('click', function () {
    if (!contextSquare) return;

    if (!APPS_SCRIPT_URL) {
      alert('Character placement is not yet available. The write proxy needs to be configured.');
      return;
    }

    const { allowed, remaining } = canPlace();
    if (!allowed) {
      charRateLimitMsg.textContent = `Rate limit: You can place more characters in a few minutes.`;
      charRateLimitMsg.style.display = '';
      charSaveBtn.disabled = true;
    } else {
      charRateLimitMsg.style.display = 'none';
      charSaveBtn.disabled = false;
    }

    modalSquareEl.textContent = `Square: ${contextSquare.formatted}`;
    const lastPlayer = localStorage.getItem('firnum_player_name') || '';
    charPlayerName.value = lastPlayer;
    charCharName.value = '';
    charRace.value = '';
    charClass.value = '';
    charLevel.value = '';
    charXP.value = '';
    modalOverlay.classList.add('visible');
    if (lastPlayer) { charCharName.focus(); } else { charPlayerName.focus(); }
  });

  document.getElementById('charModalClose').addEventListener('click', closeCharModal);
  document.getElementById('charModalCancel').addEventListener('click', closeCharModal);
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) closeCharModal();
  });

  function closeCharModal() { modalOverlay.classList.remove('visible'); }

  charSaveBtn.addEventListener('click', async function () {
    const pName = charPlayerName.value.trim();
    const cName = charCharName.value.trim();
    const race  = charRace.value.trim();
    const cls   = charClass.value.trim();
    const level = charLevel.value.trim();
    const xp    = charXP.value.trim();

    if (!pName || !cName) { alert('Player Name and Character Name are required.'); return; }
    const { allowed } = canPlace();
    if (!allowed) { alert('Rate limit reached. Please wait a few minutes.'); return; }

    localStorage.setItem('firnum_player_name', pName);

    const rowData = [
      contextSquare.formatted, pName, cName, race || '', cls || '',
      level || '', xp || '', new Date().toISOString(),
    ];

    charSaveBtn.disabled = true;
    charSaveBtn.textContent = 'Saving...';

    try {
      await sheetAppend(C.sheets.charactersTab, rowData);
      logPlacement();
      closeCharModal();
      await loadCharacters();
      createCharacterMarkers();
    } catch (err) {
      console.error('Failed to place character:', err);
      alert('Failed to save character. The write proxy may not be configured yet.');
    } finally {
      charSaveBtn.disabled = false;
      charSaveBtn.textContent = 'Place Character';
    }
  });

  // ── Init ──────────────────────────────────────────────────

  async function init() {
    try {
      await Promise.all([loadLocationsFromSheets(), loadRegions()]);
      discoverTypes();
      createMarkers();
      createRegions();
      buildTabs();
      buildTypeToggles();
      buildRegionToggles();
      renderList();

      // Load character placements
      await loadCharacters();
      createCharacterMarkers();

      // Initialize drawing tools & party token
      if (window.initDrawTools) {
        window.initDrawTools(map, {
          pxToLatLng,
          gridToPixel,
          pixelToGrid,
          formatGrid,
          imageWidth: C.imageWidth,
          imageHeight: C.imageHeight,
        });
      }
    } catch (err) {
      console.warn('Init error:', err);
    }
    document.getElementById('loading').classList.add('hidden');
    setTimeout(() => document.getElementById('loading')?.remove(), 600);
  }

  setTimeout(init, 300);
})();
