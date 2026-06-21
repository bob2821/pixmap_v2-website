/* ============================================================
   USP CONNECTOR PATH TOOL
   Floating toolbar — draw a custom STRAIGHT-LINE path for each
   USP, from its highlight to its card. Click to drop points;
   straight segments connect them (a polyline). Double-click or
   "Finish" to complete the active path.

   Coordinates are stored as image-relative percentages {x,y}
   of the sem1 image — same anchoring as USP_HL — so the path
   stays glued to the image as it scales/scrolls.

   Output: window.PIXMAP.uspConnectorPaths
           = [ [{x,y},{x,y},...],   // USP 00
               [{x,y},...],         // USP 01
               ... ]
   usp-scene.js reads this live and draws the comet trail along
   the polyline instead of the auto bezier curve.

   NOTE: TOTAL is set to the live USP count (10). Bump it if you
   add the remaining features (Cloud Registry, etc.).
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'pixmap_usp_connectors_v1';
  var TOTAL       = 10;

  /* Labels — mirror USP_HL order in usp-scene.js */
  var LABELS = [
    'RAPID PATCH WORKFLOW', 'CREATIVE MASKING', 'DRAG SLIDER CONTROLS',
    'COLOR PALETTE PICKER', 'FIT CANVAS TO CONTENT', 'LABEL COLOR ASSIGNMENT',
    'INDIVIDUAL PANEL DELETION', 'MULTI-FORMAT BATCH EXPORT',
    'SMART GROUP CREATION', 'BRAND LOGO INTEGRATION'
  ];

  /* paths[i] = [{x,y}, ...] image-relative %, or null */
  var paths      = new Array(TOTAL).fill(null);
  var activeSlot = null;        /* slot being drawn               */
  var draftPts   = [];          /* in-progress points (image-%)   */
  var panelOpen  = false;

  /* ── Storage ──────────────────────────────────────────────── */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (Array.isArray(p)) {
          for (var i = 0; i < TOTAL; i++) paths[i] = p[i] || null;
        }
      }
    } catch (e) {}
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(paths)); } catch (e) {}
    window.PIXMAP = window.PIXMAP || {};
    window.PIXMAP.uspConnectorPaths = paths.map(function (a) {
      return a ? a.slice() : null;
    });
    /* nudge usp-scene to recompute the trail this frame */
    try { window.dispatchEvent(new Event('scroll')); } catch (e) {}
  }
  load();
  persist();   /* expose immediately so usp-scene picks up saved paths */

  /* ── Helpers ──────────────────────────────────────────────── */
  function css(el, p) { Object.assign(el.style, p); return el; }
  function mk(tag, p, t) {
    var e = document.createElement(tag);
    if (p) css(e, p);
    if (t !== undefined) e.textContent = t;
    return e;
  }
  function getSem1Rect() {
    var s = document.getElementById('sem1Bg');
    if (!s) return null;
    var r = s.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return null;
    return r;
  }
  function toImgPct(clientX, clientY) {
    var r = getSem1Rect();
    if (!r) return null;
    return {
      x: parseFloat(((clientX - r.left) / r.width  * 100).toFixed(3)),
      y: parseFloat(((clientY - r.top)  / r.height * 100).toFixed(3))
    };
  }
  function toScreen(pt, r) {
    return { x: r.left + pt.x / 100 * r.width, y: r.top + pt.y / 100 * r.height };
  }

  /* ================================================================
     UI
  ================================================================ */
  var toggleBtn = mk('button', {
    position: 'fixed', bottom: '22px', left: '120px', zIndex: '9997',
    background: 'rgba(8,14,36,0.92)', color: 'rgba(120,210,140,0.95)',
    border: '1px solid rgba(110,220,140,0.45)', borderRadius: '6px',
    fontFamily: 'monospace', fontSize: '11px', letterSpacing: '0.12em',
    padding: '7px 12px', cursor: 'pointer', backdropFilter: 'blur(10px)',
    transition: 'background 0.2s'
  }, '⤳ PATH');

  var panel = mk('div', {
    position: 'fixed', bottom: '58px', left: '120px', zIndex: '9997',
    width: '280px', background: 'rgba(6,12,28,0.97)',
    border: '1px solid rgba(110,220,140,0.26)', borderRadius: '10px',
    fontFamily: 'monospace', fontSize: '11px', color: 'rgba(200,225,255,0.85)',
    backdropFilter: 'blur(18px)', overflow: 'hidden', display: 'none',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)'
  });

  panel.appendChild(mk('div', {
    padding: '10px 14px 8px', borderBottom: '1px solid rgba(110,220,140,0.18)',
    color: 'rgba(120,210,140,0.9)', letterSpacing: '0.18em', fontSize: '10px',
    textTransform: 'uppercase'
  }, 'USP Connector Path Tool'));

  var statusBar = mk('div', {
    padding: '8px 14px', background: 'rgba(110,220,140,0.07)',
    color: 'rgba(170,225,190,0.8)', fontSize: '10px', letterSpacing: '0.05em',
    borderBottom: '1px solid rgba(110,220,140,0.12)', minHeight: '34px',
    lineHeight: '1.5'
  });
  panel.appendChild(statusBar);

  /* Slot list (label + point count) */
  var list = mk('div', { padding: '10px 12px 4px', maxHeight: '230px', overflowY: 'auto' });
  var slotBtns = [];
  for (var i = 0; i < TOTAL; i++) {
    (function (idx) {
      var b = mk('button', {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', textAlign: 'left', gap: '8px', marginBottom: '5px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(110,220,140,0.20)',
        borderRadius: '5px', color: 'rgba(170,210,235,0.75)', fontFamily: 'monospace',
        fontSize: '10px', padding: '7px 9px', cursor: 'pointer', transition: 'all 0.16s'
      });
      b.addEventListener('click', function () { startDraw(idx); });
      slotBtns.push(b);
      list.appendChild(b);
    }(i));
  }
  panel.appendChild(list);

  /* Action rows */
  var row1 = mk('div', { display: 'flex', gap: '6px', padding: '6px 12px 0' });
  var finishBtn = mk('button', {
    flex: '1', background: 'rgba(110,220,140,0.16)', border: '1px solid rgba(110,220,140,0.4)',
    borderRadius: '5px', color: 'rgba(150,235,180,0.95)', fontFamily: 'monospace',
    fontSize: '10px', padding: '7px 0', cursor: 'pointer', letterSpacing: '0.06em'
  }, '✓ Finish');
  finishBtn.addEventListener('click', commitDraft);
  var undoBtn = mk('button', {
    flex: '1', background: 'rgba(255,200,80,0.10)', border: '1px solid rgba(255,200,80,0.3)',
    borderRadius: '5px', color: 'rgba(255,215,130,0.9)', fontFamily: 'monospace',
    fontSize: '10px', padding: '7px 0', cursor: 'pointer', letterSpacing: '0.06em'
  }, '↶ Undo pt');
  undoBtn.addEventListener('click', undoPoint);
  row1.appendChild(finishBtn); row1.appendChild(undoBtn);
  panel.appendChild(row1);

  var row2 = mk('div', { display: 'flex', gap: '6px', padding: '6px 12px 12px' });
  var dlBtn = mk('button', {
    flex: '1', background: 'rgba(110,220,140,0.14)', border: '1px solid rgba(110,220,140,0.35)',
    borderRadius: '5px', color: 'rgba(150,235,180,0.95)', fontFamily: 'monospace',
    fontSize: '10px', padding: '7px 0', cursor: 'pointer', letterSpacing: '0.06em'
  }, '↓ Download');
  dlBtn.addEventListener('click', downloadJSON);
  var clrBtn = mk('button', {
    flex: '1', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,100,100,0.25)',
    borderRadius: '5px', color: 'rgba(255,140,140,0.8)', fontFamily: 'monospace',
    fontSize: '10px', padding: '7px 0', cursor: 'pointer', letterSpacing: '0.06em'
  }, '✕ Clear all');
  clrBtn.addEventListener('click', clearAll);
  row2.appendChild(dlBtn); row2.appendChild(clrBtn);
  panel.appendChild(row2);

  document.body.appendChild(toggleBtn);
  document.body.appendChild(panel);

  /* Drawing overlay (canvas, full-screen) */
  var canvas = mk('canvas', {
    position: 'fixed', inset: '0', zIndex: '9996',
    display: 'none', cursor: 'crosshair'
  });
  document.body.appendChild(canvas);
  var cx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  function sizeCanvas() {
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  canvas.addEventListener('click', onDrawClick);
  canvas.addEventListener('dblclick', function (e) { e.preventDefault(); commitDraft(); });

  /* ================================================================
     LOGIC
  ================================================================ */
  function startDraw(idx) {
    activeSlot = idx;
    draftPts = paths[idx] ? paths[idx].slice() : [];  /* edit existing */
    canvas.style.display = 'block';
    refreshSlots(); refreshStatus();
  }

  function onDrawClick(e) {
    if (activeSlot === null) return;
    var p = toImgPct(e.clientX, e.clientY);
    if (!p) {
      statusBar.textContent = '⚠ Scroll to the USP section so the sem1 image is on screen.';
      return;
    }
    draftPts.push(p);
    refreshStatus();
  }

  function undoPoint() {
    if (activeSlot === null || !draftPts.length) return;
    draftPts.pop();
    refreshStatus();
  }

  function commitDraft() {
    if (activeSlot === null) return;
    if (draftPts.length >= 2) {
      paths[activeSlot] = draftPts.slice();
    } else {
      paths[activeSlot] = null;   /* fewer than 2 points = no path */
    }
    persist();
    activeSlot = null;
    draftPts = [];
    canvas.style.display = 'none';
    refreshSlots(); refreshStatus();
  }

  function clearAll() {
    paths = new Array(TOTAL).fill(null);
    activeSlot = null; draftPts = [];
    canvas.style.display = 'none';
    persist();
    refreshSlots(); refreshStatus();
  }

  function downloadJSON() {
    var any = paths.some(Boolean);
    if (!any) { statusBar.textContent = '⚠ No paths drawn yet.'; return; }
    var blob = new Blob([JSON.stringify(paths, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'usp_connectors.json'; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── UI refresh ───────────────────────────────────────────── */
  function refreshSlots() {
    for (var i = 0; i < TOTAL; i++) {
      var b = slotBtns[i];
      var n = paths[i] ? paths[i].length : 0;
      var tag = String(i).padStart(2, '0') + '  ' + (LABELS[i] || ('USP ' + i));
      var meta = (i === activeSlot) ? '✎ drawing'
               : n ? (n + ' pts') : '—';
      b.innerHTML = '';
      var l = mk('span', { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, tag);
      var r = mk('span', { flexShrink: '0', opacity: '0.85' }, meta);
      b.appendChild(l); b.appendChild(r);
      if (i === activeSlot) {
        b.style.background = 'rgba(110,220,140,0.28)';
        b.style.borderColor = 'rgba(110,220,140,0.9)';
        b.style.color = '#fff';
      } else if (n) {
        b.style.background = 'rgba(110,220,140,0.10)';
        b.style.borderColor = 'rgba(110,220,140,0.45)';
        b.style.color = 'rgba(160,225,185,0.95)';
      } else {
        b.style.background = 'rgba(255,255,255,0.04)';
        b.style.borderColor = 'rgba(110,220,140,0.20)';
        b.style.color = 'rgba(170,210,235,0.75)';
      }
    }
  }

  function refreshStatus() {
    if (activeSlot !== null) {
      statusBar.style.color = 'rgba(150,235,180,0.95)';
      statusBar.textContent = '✎ ' + (LABELS[activeSlot] || ('USP ' + activeSlot)) +
        ' — click points (' + draftPts.length + '). Dbl-click or Finish to save.';
    } else {
      var done = paths.filter(Boolean).length;
      statusBar.style.color = done === TOTAL ? 'rgba(120,230,160,0.95)' : 'rgba(170,210,235,0.75)';
      statusBar.textContent = done === TOTAL
        ? '✓ All ' + TOTAL + ' paths set — Download to save JSON.'
        : done + ' / ' + TOTAL + ' paths set • click a USP to draw.';
    }
  }

  /* ── Render loop (only while panel open) ──────────────────── */
  function frame() {
    if (!panelOpen) return;
    requestAnimationFrame(frame);
    var W = window.innerWidth, H = window.innerHeight;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    var r = getSem1Rect();
    if (!r) return;

    /* faint outline of sem1 image bounds for reference */
    cx.strokeStyle = 'rgba(110,220,140,0.25)';
    cx.lineWidth = 1;
    cx.strokeRect(r.left, r.top, r.width, r.height);

    /* draw all saved paths dim; active draft bright */
    for (var i = 0; i < TOTAL; i++) {
      if (!paths[i] || i === activeSlot) continue;
      drawPolyline(paths[i], r, 'rgba(110,200,150,0.30)', 2, false);
    }
    if (activeSlot !== null && draftPts.length) {
      drawPolyline(draftPts, r, 'rgba(150,235,180,0.95)', 2.4, true);
    }
  }

  function drawPolyline(pts, r, color, w, showHandles) {
    if (!pts.length) return;
    var s = pts.map(function (p) { return toScreen(p, r); });
    if (s.length >= 2) {
      cx.beginPath();
      cx.moveTo(s[0].x, s[0].y);
      for (var k = 1; k < s.length; k++) cx.lineTo(s[k].x, s[k].y);
      cx.strokeStyle = color; cx.lineWidth = w; cx.lineJoin = 'round'; cx.lineCap = 'round';
      cx.stroke();
    }
    if (showHandles) {
      s.forEach(function (pt, k) {
        cx.beginPath();
        cx.arc(pt.x, pt.y, k === 0 ? 6 : 4.5, 0, Math.PI * 2);
        cx.fillStyle = k === 0 ? 'rgba(255,210,90,0.95)'
                     : k === s.length - 1 ? 'rgba(120,200,255,0.95)'
                     : 'rgba(150,235,180,0.95)';
        cx.fill();
        cx.strokeStyle = 'rgba(0,0,0,0.5)'; cx.lineWidth = 1; cx.stroke();
      });
    }
  }

  /* ── Toggle ───────────────────────────────────────────────── */
  toggleBtn.addEventListener('click', function () {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    toggleBtn.style.background = panelOpen ? 'rgba(110,220,140,0.22)' : 'rgba(8,14,36,0.92)';
    if (panelOpen) {
      refreshSlots(); refreshStatus();
      requestAnimationFrame(frame);
    } else {
      activeSlot = null; draftPts = [];
      canvas.style.display = 'none';
    }
  });

  refreshSlots();
  refreshStatus();

  /* Keyboard: Enter = finish, Esc = cancel draft, Z = undo pt */
  window.addEventListener('keydown', function (e) {
    if (!panelOpen || activeSlot === null) return;
    if (e.key === 'Enter')  { e.preventDefault(); commitDraft(); }
    else if (e.key === 'Escape') { activeSlot = null; draftPts = []; canvas.style.display = 'none'; refreshSlots(); refreshStatus(); }
    else if (e.key === 'z' || e.key === 'Z') { undoPoint(); }
  });

}());
