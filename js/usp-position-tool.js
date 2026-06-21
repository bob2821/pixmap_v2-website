/* ============================================================
   USP POSITION TOOL
   Records card placement positions for each of the 12 USPs.
   Click a slot → click anywhere on screen → position saved.
   Download JSON → hand to usp-scene.js or keep in localStorage.
   ============================================================ */

(function () {
  'use strict';

  var TOTAL = 12;
  var positions = new Array(TOTAL).fill(null);
  var activeSlot = null;
  var dotEls = [];

  /* ---- Load any existing saved positions ---- */
  try {
    var saved = localStorage.getItem('pixmap_usp_positions');
    if (saved) {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === TOTAL) {
        positions = parsed.slice();
      }
    }
  } catch (e) {}

  /* ================================================================
     BUILD UI
  ================================================================ */

  /* Toggle button */
  var toggleBtn = document.createElement('button');
  toggleBtn.id = 'uspPosTool_toggle';
  toggleBtn.textContent = '⊹ POS';
  toggleBtn.style.cssText =
    'position:fixed;bottom:22px;left:20px;z-index:9999;' +
    'background:rgba(10,18,44,0.92);color:rgba(68,175,229,0.95);' +
    'border:1px solid rgba(68,175,229,0.35);border-radius:6px;' +
    'font-family:monospace;font-size:11px;letter-spacing:0.12em;' +
    'padding:7px 12px;cursor:pointer;backdrop-filter:blur(10px);' +
    'transition:background 0.2s;';

  /* Panel */
  var panel = document.createElement('div');
  panel.id = 'uspPosTool_panel';
  panel.style.cssText =
    'position:fixed;bottom:58px;left:20px;z-index:9999;' +
    'width:260px;background:rgba(6,12,32,0.96);' +
    'border:1px solid rgba(68,175,229,0.28);border-radius:10px;' +
    'font-family:monospace;font-size:11px;color:rgba(200,225,255,0.85);' +
    'backdrop-filter:blur(18px);overflow:hidden;display:none;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.55);';

  var header = document.createElement('div');
  header.style.cssText =
    'padding:10px 14px 8px;border-bottom:1px solid rgba(68,175,229,0.18);' +
    'color:rgba(68,175,229,0.9);letter-spacing:0.18em;font-size:10px;text-transform:uppercase;';
  header.textContent = 'USP Position Tool';

  var statusBar = document.createElement('div');
  statusBar.style.cssText =
    'padding:8px 14px;background:rgba(68,175,229,0.07);' +
    'color:rgba(160,220,255,0.8);font-size:10px;letter-spacing:0.06em;' +
    'border-bottom:1px solid rgba(68,175,229,0.12);min-height:30px;line-height:1.5;';

  /* 4×3 grid of slot buttons */
  var grid = document.createElement('div');
  grid.style.cssText =
    'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px 14px;';

  var slotBtns = [];
  for (var i = 0; i < TOTAL; i++) {
    (function (idx) {
      var btn = document.createElement('button');
      btn.style.cssText =
        'background:rgba(255,255,255,0.04);border:1px solid rgba(68,175,229,0.22);' +
        'border-radius:5px;color:rgba(150,200,240,0.7);font-family:monospace;' +
        'font-size:10px;padding:6px 0;cursor:pointer;transition:all 0.18s;';
      btn.textContent = String(idx + 1).padStart(2, '0');
      btn.addEventListener('click', function () { startCapture(idx); });
      slotBtns.push(btn);
      grid.appendChild(btn);
    }(i));
  }

  /* Action row */
  var actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:6px;padding:0 14px 12px;';

  var dlBtn = document.createElement('button');
  dlBtn.textContent = '↓ Download';
  dlBtn.style.cssText =
    'flex:1;background:rgba(68,175,229,0.14);border:1px solid rgba(68,175,229,0.35);' +
    'border-radius:5px;color:rgba(68,175,229,0.95);font-family:monospace;font-size:10px;' +
    'padding:7px 0;cursor:pointer;letter-spacing:0.08em;';
  dlBtn.addEventListener('click', downloadJSON);

  var clearBtn = document.createElement('button');
  clearBtn.textContent = '✕ Clear';
  clearBtn.style.cssText =
    'flex:1;background:rgba(255,80,80,0.08);border:1px solid rgba(255,100,100,0.25);' +
    'border-radius:5px;color:rgba(255,140,140,0.8);font-family:monospace;font-size:10px;' +
    'padding:7px 0;cursor:pointer;letter-spacing:0.08em;';
  clearBtn.addEventListener('click', clearAll);

  actions.appendChild(dlBtn);
  actions.appendChild(clearBtn);
  panel.appendChild(header);
  panel.appendChild(statusBar);
  panel.appendChild(grid);
  panel.appendChild(actions);
  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);

  /* Full-screen capture overlay */
  var overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:9998;cursor:crosshair;display:none;';
  overlay.addEventListener('click', onScreenClick);
  document.body.appendChild(overlay);

  /* ================================================================
     LOGIC
  ================================================================ */

  function updateSlots() {
    for (var i = 0; i < TOTAL; i++) {
      var btn = slotBtns[i];
      if (i === activeSlot) {
        btn.style.background    = 'rgba(68,175,229,0.30)';
        btn.style.borderColor   = 'rgba(68,175,229,0.90)';
        btn.style.color         = '#fff';
        btn.textContent         = '→' + String(i + 1).padStart(2, '0');
      } else if (positions[i]) {
        btn.style.background    = 'rgba(68,175,229,0.12)';
        btn.style.borderColor   = 'rgba(68,175,229,0.50)';
        btn.style.color         = 'rgba(120,210,255,0.95)';
        btn.textContent         = '✓' + String(i + 1).padStart(2, '0');
      } else {
        btn.style.background    = 'rgba(255,255,255,0.04)';
        btn.style.borderColor   = 'rgba(68,175,229,0.22)';
        btn.style.color         = 'rgba(150,200,240,0.7)';
        btn.textContent         = String(i + 1).padStart(2, '0');
      }
    }
  }

  function updateStatus() {
    if (activeSlot !== null) {
      statusBar.style.color = 'rgba(68,175,229,0.95)';
      statusBar.textContent = '→ Click to place USP ' + (activeSlot + 1) + ' of ' + TOTAL;
    } else {
      var done = positions.filter(Boolean).length;
      statusBar.style.color = done === TOTAL
        ? 'rgba(100,220,150,0.9)'
        : 'rgba(160,200,240,0.7)';
      statusBar.textContent = done === TOTAL
        ? '✓ All ' + TOTAL + ' positions set — ready to download'
        : done + ' / ' + TOTAL + ' set  •  click a slot number to record';
    }
  }

  function startCapture(idx) {
    activeSlot = idx;
    overlay.style.display = 'block';
    updateSlots();
    updateStatus();
  }

  function stopCapture() {
    activeSlot = null;
    overlay.style.display = 'none';
    updateSlots();
    updateStatus();
  }

  function onScreenClick(e) {
    if (activeSlot === null) return;
    var x = parseFloat((e.clientX / window.innerWidth).toFixed(4));
    var y = parseFloat((e.clientY / window.innerHeight).toFixed(4));
    positions[activeSlot] = { x: x, y: y };
    showDot(activeSlot, e.clientX, e.clientY);
    persist();

    /* Auto-advance to next empty slot */
    var next = null;
    for (var i = activeSlot + 1; i < TOTAL; i++) {
      if (!positions[i]) { next = i; break; }
    }
    if (next !== null) {
      activeSlot = next;
      updateSlots();
      updateStatus();
    } else {
      stopCapture();
    }
  }

  function persist() {
    try { localStorage.setItem('pixmap_usp_positions', JSON.stringify(positions)); } catch (e) {}
    window.PIXMAP = window.PIXMAP || {};
    window.PIXMAP.uspCustomPositions = positions.slice();
    if (window.PIXMAP.recomputeUspLayout) window.PIXMAP.recomputeUspLayout();
  }

  /* Preview dot */
  function showDot(idx, cx, cy) {
    if (dotEls[idx]) dotEls[idx].remove();
    var dot = document.createElement('div');
    dot.style.cssText =
      'position:fixed;z-index:9997;pointer-events:none;' +
      'width:22px;height:22px;border-radius:50%;' +
      'border:1.5px solid rgba(68,175,229,0.85);' +
      'background:rgba(68,175,229,0.20);' +
      'transform:translate(-50%,-50%);' +
      'left:' + cx + 'px;top:' + cy + 'px;';
    var lbl = document.createElement('span');
    lbl.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'font-family:monospace;font-size:8px;color:rgba(68,175,229,0.95);';
    lbl.textContent = idx + 1;
    dot.appendChild(lbl);
    document.body.appendChild(dot);
    dotEls[idx] = dot;
  }

  function renderSavedDots() {
    for (var i = 0; i < TOTAL; i++) {
      if (positions[i]) {
        showDot(i,
          positions[i].x * window.innerWidth,
          positions[i].y * window.innerHeight
        );
      }
    }
  }

  function clearAll() {
    positions = new Array(TOTAL).fill(null);
    dotEls.forEach(function (d) { if (d) d.remove(); });
    dotEls = [];
    stopCapture();
    try { localStorage.removeItem('pixmap_usp_positions'); } catch (e) {}
    window.PIXMAP = window.PIXMAP || {};
    window.PIXMAP.uspCustomPositions = null;
    if (window.PIXMAP.recomputeUspLayout) window.PIXMAP.recomputeUspLayout();
    updateSlots();
    updateStatus();
  }

  function downloadJSON() {
    if (!positions.filter(Boolean).length) {
      statusBar.textContent = '⚠ No positions recorded yet.';
      return;
    }
    var blob = new Blob([JSON.stringify(positions, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'usp_positions.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Toggle */
  var panelOpen = false;
  toggleBtn.addEventListener('click', function () {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    toggleBtn.style.background = panelOpen
      ? 'rgba(68,175,229,0.22)'
      : 'rgba(10,18,44,0.92)';
    if (panelOpen) {
      renderSavedDots();
      updateSlots();
      updateStatus();
    } else {
      dotEls.forEach(function (d) { if (d) d.remove(); });
      dotEls = [];
      stopCapture();
    }
  });

  updateSlots();
  updateStatus();

}());
