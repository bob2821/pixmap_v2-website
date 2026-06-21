/* ============================================================
   USP HIGHLIGHT REGION TOOL  v2
   Floating toolbar — drag rectangular regions over the sem1
   image. Coordinates are recorded as image-relative percentages
   {l, t, w, h} — same format as USP_HL in usp-scene.js.
   Hand the downloaded JSON to Claude to bake into USP_HL.
   ============================================================ */

(function () {
  'use strict';

  var STORAGE_KEY = 'pixmap_usp_hl_v2';
  var TOTAL       = 12;

  /* [{l,t,w,h}] — image-relative %, matching USP_HL format */
  var regions   = [];
  var recording = false;
  var panelOpen = false;
  var activeSlot = null;

  /* Active drag state */
  var drag = { active: false, startX: 0, startY: 0 };

  /* ── Storage ──────────────────────────────────────────────── */
  function loadRegions() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) regions = parsed;
      }
    } catch (e) { regions = []; }
  }

  function saveRegions() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(regions)); } catch (e) {}
  }

  loadRegions();

  /* ── Style helper ─────────────────────────────────────────── */
  function css(el, props) { Object.assign(el.style, props); return el; }
  function mk(tag, props, text) {
    var e = document.createElement(tag);
    if (props) css(e, props);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ── Get sem1Bg rect (null if not visible/big enough) ─────── */
  function getSem1Rect() {
    var sem1 = document.getElementById('sem1Bg');
    if (!sem1) return null;
    var r = sem1.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return null;
    return r;
  }

  /* ── Toggle button ────────────────────────────────────────── */
  var toggleBtn = mk('button', {
    position:       'fixed',
    bottom:         '22px',
    left:           '70px',
    zIndex:         '9997',
    width:          '38px',
    height:         '38px',
    borderRadius:   '50%',
    background:     'rgba(8, 14, 36, 0.92)',
    border:         '1px solid rgba(255, 160, 40, 0.50)',
    color:          'rgba(255, 170, 50, 1)',
    fontSize:       '16px',
    lineHeight:     '1',
    cursor:         'pointer',
    backdropFilter: 'blur(12px)',
    boxShadow:      '0 4px 18px rgba(0,0,0,0.5)',
    transition:     'border-color 0.2s, box-shadow 0.2s',
    fontFamily:     'monospace',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
  }, '⬚');

  /* ── Panel ────────────────────────────────────────────────── */
  var panel = mk('div', {
    position:       'fixed',
    bottom:         '70px',
    left:           '62px',
    zIndex:         '9997',
    width:          '240px',
    background:     'rgba(6, 11, 28, 0.97)',
    border:         '1px solid rgba(255, 160, 40, 0.22)',
    borderRadius:   '12px',
    padding:        '18px 16px 14px',
    display:        'none',
    backdropFilter: 'blur(24px)',
    boxShadow:      '0 16px 48px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,160,40,0.08)',
    fontFamily:     "'Open Sans', monospace",
    color:          'rgba(195, 215, 238, 0.85)',
    fontSize:       '12px',
    lineHeight:     '1.5',
  });

  panel.appendChild(mk('div', {
    fontSize:      '10px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    marginBottom:  '4px',
    fontWeight:    '600',
    color:         'rgba(255, 160, 40, 0.70)',
  }, 'Highlight Regions'));

  panel.appendChild(mk('div', {
    fontSize:     '10px',
    color:        'rgba(120,160,200,0.45)',
    marginBottom: '12px',
    lineHeight:   '1.5',
  }, 'Click slot → drag on sem1 image. Scroll to USP section first.'));

  var countEl = mk('div', {
    fontSize:      '28px',
    fontWeight:    '700',
    marginBottom:  '12px',
    letterSpacing: '0.04em',
    color:         'rgba(220, 240, 255, 0.90)',
  });

  var statusEl = mk('div', {
    fontSize:      '11px',
    marginBottom:  '12px',
    letterSpacing: '0.06em',
    minHeight:     '16px',
  });

  panel.appendChild(countEl);
  panel.appendChild(statusEl);

  /* ── Slot grid ────────────────────────────────────────────── */
  var slotGrid = mk('div', {
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 '5px',
    marginBottom:        '12px',
  });

  var slotBtns = [];
  for (var si = 0; si < TOTAL; si++) {
    (function (idx) {
      var b = mk('button', {
        background:    'rgba(255,255,255,0.04)',
        border:        '1px solid rgba(255,160,40,0.22)',
        borderRadius:  '5px',
        color:         'rgba(150,200,240,0.7)',
        fontFamily:    'monospace',
        fontSize:      '10px',
        padding:       '5px 0',
        cursor:        'pointer',
        transition:    'all 0.15s',
      }, String(idx + 1).padStart(2, '0'));
      b.addEventListener('click', function () { startRecordingSlot(idx); });
      slotBtns.push(b);
      slotGrid.appendChild(b);
    }(si));
  }
  panel.appendChild(slotGrid);

  /* ── Action buttons ───────────────────────────────────────── */
  function mkBtn(label, accent, onClick) {
    var b = mk('button', {
      width:         '100%',
      padding:       '9px 8px',
      marginBottom:  '7px',
      background:    accent === 'red'   ? 'rgba(180,50,50,0.18)'
                   : accent === 'green' ? 'rgba(50,180,90,0.18)'
                   :                      'rgba(255,160,40,0.12)',
      border:        '1px solid ' + (
                       accent === 'red'   ? 'rgba(220,80,80,0.35)'
                     : accent === 'green' ? 'rgba(50,200,90,0.35)'
                     :                      'rgba(255,160,40,0.30)'),
      borderRadius:  '6px',
      color:         accent === 'red'   ? 'rgba(220,100,100,0.90)'
                   : accent === 'green' ? 'rgba(80,220,120,0.90)'
                   :                      'rgba(255,170,60,0.90)',
      fontSize:      '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      cursor:        'pointer',
      fontFamily:    "'Open Sans', monospace",
      transition:    'background 0.15s',
    }, label);
    b.addEventListener('click', onClick);
    return b;
  }

  var stopBtn     = mkBtn('⏹  Stop Recording', 'orange', stopRecording);
  var clearBtn    = mkBtn('✕  Clear All',       'red',    clearAll);
  var downloadBtn = mkBtn('⬇  Download JSON',   'green',  downloadJSON);

  stopBtn.style.display = 'none';
  panel.appendChild(stopBtn);
  panel.appendChild(clearBtn);
  panel.appendChild(downloadBtn);

  /* ── Hint bar ─────────────────────────────────────────────── */
  var hintEl = mk('div', {
    position:      'fixed',
    top:           '16px',
    left:          '50%',
    transform:     'translateX(-50%)',
    background:    'rgba(6,11,28,0.92)',
    border:        '1px solid rgba(255,160,40,0.30)',
    borderRadius:  '6px',
    padding:       '8px 18px',
    fontSize:      '12px',
    letterSpacing: '0.12em',
    color:         'rgba(255,170,50,0.90)',
    fontFamily:    "'Open Sans', monospace",
    pointerEvents: 'none',
    backdropFilter:'blur(10px)',
    whiteSpace:    'nowrap',
    zIndex:        '10000',
    display:       'none',
  });
  document.body.appendChild(hintEl);

  /* ── Drag overlay ─────────────────────────────────────────── */
  var overlay = mk('div', {
    position: 'fixed',
    inset:    '0',
    zIndex:   '9998',
    cursor:   'crosshair',
    display:  'none',
  });

  var dragRect = mk('div', {
    position:      'fixed',
    display:       'none',
    border:        '2px dashed rgba(255,170,50,0.85)',
    background:    'rgba(255,170,50,0.08)',
    pointerEvents: 'none',
    zIndex:        '9999',
    boxSizing:     'border-box',
  });
  document.body.appendChild(dragRect);

  /* ── Marker layer ─────────────────────────────────────────── */
  var markerLayer = mk('div', {
    position:      'fixed',
    inset:         '0',
    zIndex:        '9996',
    pointerEvents: 'none',
  });

  /* ── Render helpers ───────────────────────────────────────── */
  function updateSlots() {
    for (var i = 0; i < TOTAL; i++) {
      var b = slotBtns[i];
      if (i === activeSlot && recording) {
        css(b, { background: 'rgba(255,160,40,0.30)', borderColor: 'rgba(255,160,40,0.90)', color: '#fff' });
        b.textContent = '→' + String(i + 1).padStart(2, '0');
      } else if (regions[i]) {
        css(b, { background: 'rgba(255,160,40,0.12)', borderColor: 'rgba(255,160,40,0.50)', color: 'rgba(255,210,100,0.95)' });
        b.textContent = '✓' + String(i + 1).padStart(2, '0');
      } else {
        css(b, { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,160,40,0.22)', color: 'rgba(150,200,240,0.7)' });
        b.textContent = String(i + 1).padStart(2, '0');
      }
    }
  }

  function renderStatus() {
    var n = regions.filter(Boolean).length;
    countEl.textContent = n + ' / ' + TOTAL;

    if (recording) {
      css(countEl,  { color: 'rgba(255,140,30,0.95)' });
      css(statusEl, { color: 'rgba(255,140,30,0.80)' });
      statusEl.textContent  = '● Recording slot ' + (activeSlot + 1);
      hintEl.style.display  = 'block';
      hintEl.textContent    = 'Drag region for slot ' + (activeSlot + 1) + ' on the sem1 image';
      stopBtn.style.display = 'block';
    } else if (n === TOTAL) {
      css(countEl,  { color: 'rgba(80,220,120,0.95)' });
      css(statusEl, { color: 'rgba(80,220,120,0.80)' });
      statusEl.textContent  = '✓ All ' + TOTAL + ' regions recorded';
      hintEl.style.display  = 'none';
      stopBtn.style.display = 'none';
    } else {
      css(countEl,  { color: 'rgba(220,240,255,0.90)' });
      css(statusEl, { color: 'rgba(120,160,200,0.60)' });
      statusEl.textContent  = n > 0 ? 'Click a slot to (re)record it' : 'Click a slot number to start';
      hintEl.style.display  = 'none';
      stopBtn.style.display = 'none';
    }

    css(toggleBtn, {
      borderColor: n === TOTAL
        ? 'rgba(80,220,120,0.70)'
        : recording ? 'rgba(255,100,30,0.70)' : 'rgba(255,160,40,0.50)',
      color: n === TOTAL
        ? 'rgba(80,220,120,1)'
        : recording ? 'rgba(255,100,30,1)' : 'rgba(255,170,50,1)',
    });

    css(downloadBtn, { opacity: n > 0 ? '1' : '0.35', cursor: n > 0 ? 'pointer' : 'default' });
    updateSlots();
  }

  function renderMarkers() {
    markerLayer.innerHTML = '';
    var sem1 = document.getElementById('sem1Bg');
    if (!sem1) return;
    var r = sem1.getBoundingClientRect();
    if (r.width < 10) return;

    regions.forEach(function (reg, i) {
      if (!reg) return;
      var left   = r.left + reg.l / 100 * r.width;
      var top    = r.top  + reg.t / 100 * r.height;
      var width  = reg.w  / 100 * r.width;
      var height = reg.h  / 100 * r.height;

      var box = mk('div', {
        position:     'fixed',
        left:         left   + 'px',
        top:          top    + 'px',
        width:        width  + 'px',
        height:       height + 'px',
        border:       '1px solid rgba(255,170,50,0.70)',
        background:   'rgba(255,170,50,0.06)',
        boxSizing:    'border-box',
        borderRadius: '2px',
      });

      box.appendChild(mk('div', {
        position:      'absolute',
        top:           '3px',
        left:          '5px',
        fontSize:      '9px',
        fontWeight:    '700',
        letterSpacing: '0.12em',
        color:         'rgba(255,200,80,0.95)',
        fontFamily:    'monospace',
        lineHeight:    '1',
        textShadow:    '0 1px 3px rgba(0,0,0,0.8)',
        userSelect:    'none',
      }, String(i + 1)));

      markerLayer.appendChild(box);
    });
  }

  /* ── Slot-specific recording ──────────────────────────────── */
  function startRecordingSlot(idx) {
    var sem1Rect = getSem1Rect();
    if (!sem1Rect) {
      css(statusEl, { color: 'rgba(255,140,80,0.90)' });
      statusEl.textContent = '⚠ Scroll so sem1 image is visible first';
      return;
    }
    activeSlot = idx;
    recording  = true;
    overlay.style.display = 'block';
    renderStatus();
  }

  function stopRecording() {
    recording  = false;
    activeSlot = null;
    overlay.style.display = 'none';
    css(dragRect, { display: 'none' });
    drag.active = false;
    renderStatus();
  }

  /* ── Mouse drag ───────────────────────────────────────────── */
  overlay.addEventListener('mousedown', function (e) {
    if (!recording) return;
    e.preventDefault();
    drag.active = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    css(dragRect, { display: 'block', left: drag.startX + 'px', top: drag.startY + 'px', width: '0px', height: '0px' });
  });

  document.addEventListener('mousemove', function (e) {
    if (!drag.active) return;
    var x1 = Math.min(drag.startX, e.clientX);
    var y1 = Math.min(drag.startY, e.clientY);
    css(dragRect, {
      left:   x1 + 'px',
      top:    y1 + 'px',
      width:  Math.abs(e.clientX - drag.startX) + 'px',
      height: Math.abs(e.clientY - drag.startY) + 'px',
    });
  });

  function commitDrag(x1, y1, x2, y2) {
    if ((x2 - x1) < 10 || (y2 - y1) < 10) return;

    var sem1Rect = getSem1Rect();
    if (!sem1Rect) {
      css(statusEl, { color: 'rgba(255,140,80,0.90)' });
      statusEl.textContent = '⚠ Sem1 not visible — scroll to USP section';
      stopRecording();
      return;
    }

    var l = parseFloat(((x1 - sem1Rect.left) / sem1Rect.width  * 100).toFixed(3));
    var t = parseFloat(((y1 - sem1Rect.top)  / sem1Rect.height * 100).toFixed(3));
    var w = parseFloat(((x2 - x1)            / sem1Rect.width  * 100).toFixed(3));
    var h = parseFloat(((y2 - y1)            / sem1Rect.height * 100).toFixed(3));

    l = Math.max(0, l);
    t = Math.max(0, t);
    w = Math.min(w, 100 - l);
    h = Math.min(h, 100 - t);

    regions[activeSlot] = { l: l, t: t, w: w, h: h };
    saveRegions();
    renderMarkers();

    /* Auto-advance to next empty slot */
    var next = null;
    for (var i = activeSlot + 1; i < TOTAL; i++) {
      if (!regions[i]) { next = i; break; }
    }
    if (next !== null) {
      activeSlot = next;
      renderStatus();
    } else {
      stopRecording();
    }
  }

  document.addEventListener('mouseup', function (e) {
    if (!drag.active) return;
    drag.active = false;
    css(dragRect, { display: 'none' });
    if (!recording) return;
    var x1 = Math.min(drag.startX, e.clientX);
    var y1 = Math.min(drag.startY, e.clientY);
    commitDrag(x1, y1, Math.max(drag.startX, e.clientX), Math.max(drag.startY, e.clientY));
  });

  /* Touch */
  overlay.addEventListener('touchstart', function (e) {
    if (!recording) return;
    e.preventDefault();
    var tc = e.touches[0];
    drag.active = true;
    drag.startX = tc.clientX;
    drag.startY = tc.clientY;
    css(dragRect, { display: 'block', left: tc.clientX + 'px', top: tc.clientY + 'px', width: '0px', height: '0px' });
  }, { passive: false });

  document.addEventListener('touchmove', function (e) {
    if (!drag.active) return;
    var tc = e.touches[0];
    css(dragRect, {
      left: Math.min(drag.startX, tc.clientX) + 'px',
      top:  Math.min(drag.startY, tc.clientY) + 'px',
      width:  Math.abs(tc.clientX - drag.startX) + 'px',
      height: Math.abs(tc.clientY - drag.startY) + 'px',
    });
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!drag.active) return;
    drag.active = false;
    css(dragRect, { display: 'none' });
    if (!recording) return;
    var tc = e.changedTouches[0];
    var x1 = Math.min(drag.startX, tc.clientX);
    var y1 = Math.min(drag.startY, tc.clientY);
    commitDrag(x1, y1, Math.max(drag.startX, tc.clientX), Math.max(drag.startY, tc.clientY));
  });

  /* ── Actions ──────────────────────────────────────────────── */
  function clearAll() {
    regions = new Array(TOTAL).fill(null);
    recording = false; activeSlot = null;
    drag.active = false;
    overlay.style.display = 'none';
    css(dragRect, { display: 'none' });
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    renderMarkers();
    renderStatus();
  }

  function downloadJSON() {
    var n = regions.filter(Boolean).length;
    if (!n) return;
    var output = new Array(TOTAL);
    for (var i = 0; i < TOTAL; i++) output[i] = regions[i] || null;
    var json = JSON.stringify(output, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'usp_highlight_regions_v2.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* ── Panel toggle ─────────────────────────────────────────── */
  toggleBtn.addEventListener('click', function () {
    panelOpen = !panelOpen;
    panel.style.display = panelOpen ? 'block' : 'none';
    if (panelOpen) { renderMarkers(); renderStatus(); }
    else { if (recording) stopRecording(); markerLayer.innerHTML = ''; }
  });

  /* ── Mount ────────────────────────────────────────────────── */
  document.body.appendChild(markerLayer);
  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  renderStatus();

}());
