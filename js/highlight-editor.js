/* ============================================================
   HIGHLIGHT EDITOR  — dev tool, always loaded
   A small "✏" button floats in the bottom-left corner.
   Click it to enter edit mode: drag boxes, resize with the
   orange corner handle, then copy the output to usp-scene.js.
   ============================================================ */

(function () {
  'use strict';

  var NAMES = [
    'RAPID PATCH WORKFLOW',
    'CREATIVE MASKING',
    'DRAG SLIDER CONTROLS',
    'COLOR PALETTE PICKER',
    'FIT CANVAS TO CONTENT',
    'LABEL COLOR ASSIGNMENT',
    'INDIVIDUAL PANEL DELETION',
    'MULTI-FORMAT BATCH EXPORT',
    'SMART GROUP CREATION',
    'BRAND LOGO INTEGRATION'
  ];

  var editMode = false;
  var hls      = [];
  var vals     = [];
  var panel, pre, toggleBtn;

  /* ---- Wait for usp-scene to build the highlight DOM ---- */
  function waitForHighlights(cb) {
    var wrap = document.getElementById('uspHighlights');
    if (wrap && wrap.children.length > 0) { cb(wrap); return; }
    setTimeout(function () { waitForHighlights(cb); }, 150);
  }

  function boot() {
    /* Always-visible toggle button — bottom-left corner */
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'hlEditToggle';
    toggleBtn.title = 'Edit USP Highlight Regions';
    toggleBtn.innerHTML = '&#9998;';   /* pencil ✎ */
    toggleBtn.style.cssText = [
      'position:fixed', 'bottom:22px', 'left:22px',
      'z-index:999999',
      'width:40px', 'height:40px',
      'background:rgba(255,100,20,0.90)',
      'color:#fff', 'border:none',
      'border-radius:50%',
      'font-size:18px', 'line-height:1',
      'cursor:pointer',
      'box-shadow:0 3px 14px rgba(0,0,0,0.55)',
      'transition:transform .15s,background .15s'
    ].join(';');
    toggleBtn.addEventListener('mouseover', function () {
      toggleBtn.style.transform = 'scale(1.12)';
    });
    toggleBtn.addEventListener('mouseout', function () {
      toggleBtn.style.transform = 'scale(1)';
    });
    toggleBtn.addEventListener('click', function () {
      editMode ? deactivate() : activate();
    });
    document.body.appendChild(toggleBtn);

    /* Build output panel (hidden until activated) */
    panel = document.createElement('div');
    panel.id = 'hlEditorPanel';
    panel.style.cssText = [
      'display:none',
      'position:fixed', 'top:14px', 'right:14px',
      'z-index:999998',
      'background:rgba(6,10,20,0.97)',
      'border:1px solid rgba(255,120,40,0.40)',
      'border-radius:10px',
      'padding:14px 16px',
      'font:11px/1.6 "Courier New",monospace',
      'color:#00ffaa',
      'width:500px', 'max-height:80vh', 'overflow-y:auto',
      'box-shadow:0 8px 40px rgba(0,0,0,0.80)'
    ].join(';');

    panel.innerHTML =
      '<div style="color:#ff6600;font-weight:bold;font-size:13px;letter-spacing:.07em;margin-bottom:10px">' +
        '&#9998;&nbsp; HIGHLIGHT EDITOR' +
        '<span style="color:rgba(200,200,200,0.35);font-size:10px;font-weight:normal;margin-left:10px">drag to move · orange handle to resize</span>' +
      '</div>' +
      '<pre id="hlEditorPre" style="margin:0 0 12px;font-size:10.5px;line-height:1.65;white-space:pre;color:#7effc4;"></pre>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
        '<button id="hlCopyBtn"  style="background:#ff6600;color:#fff;border:none;padding:6px 14px;border-radius:5px;cursor:pointer;font:bold 11px monospace;">&#11015; Copy USP_HL</button>' +
        '<button id="hlResetBtn" style="background:rgba(255,255,255,0.07);color:#bbb;border:1px solid rgba(255,255,255,0.14);padding:6px 12px;border-radius:5px;cursor:pointer;font:11px monospace;">&#8617; Reset</button>' +
        '<button id="hlCloseBtn" style="margin-left:auto;background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.12);padding:6px 10px;border-radius:5px;cursor:pointer;font:11px monospace;">&#10005;</button>' +
      '</div>' +
      '<div style="color:rgba(200,200,200,0.35);font-size:10px">Paste output into <b style="color:#fa0">USP_HL</b> in <b style="color:#fa0">js/usp-scene.js</b></div>';

    document.body.appendChild(panel);
    pre = document.getElementById('hlEditorPre');

    document.getElementById('hlCopyBtn').addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(pre.textContent).then(function () {
        btn.textContent = '✓ Copied!';
        setTimeout(function () { btn.innerHTML = '&#11015; Copy USP_HL'; }, 2000);
      });
    });

    document.getElementById('hlResetBtn').addEventListener('click', resetAll);
    document.getElementById('hlCloseBtn').addEventListener('click', deactivate);

    /* Load highlights once ready */
    waitForHighlights(function (wrap) {
      hls  = Array.from(wrap.querySelectorAll('.usp-highlight'));
      vals = hls.map(function (el) {
        return {
          l: parseFloat(el.style.left)   || 0,
          t: parseFloat(el.style.top)    || 0,
          w: parseFloat(el.style.width)  || 2,
          h: parseFloat(el.style.height) || 2,
          origL: parseFloat(el.style.left)   || 0,
          origT: parseFloat(el.style.top)    || 0,
          origW: parseFloat(el.style.width)  || 2,
          origH: parseFloat(el.style.height) || 2
        };
      });
      prepareHighlights();
    });
  }

  /* ================================================================
     PREPARE — add labels + resize handles (hidden until edit mode)
  ================================================================ */
  function prepareHighlights() {
    hls.forEach(function (el, i) {
      /* Label */
      var lbl = document.createElement('span');
      lbl.className = 'hl-editor-label';
      lbl.textContent = i + ' · ' + NAMES[i];
      lbl.style.cssText = [
        'display:none',
        'position:absolute', 'top:2px', 'left:3px',
        'font:bold 9px/1 "Courier New",monospace',
        'color:#ffaa00', 'background:rgba(0,0,0,0.78)',
        'padding:2px 4px', 'border-radius:2px',
        'pointer-events:none', 'white-space:nowrap',
        'max-width:calc(100% - 6px)',
        'overflow:hidden', 'text-overflow:ellipsis',
        'z-index:5'
      ].join(';');
      el.appendChild(lbl);

      /* Resize handle */
      var rh = document.createElement('div');
      rh.className = 'hl-editor-rh';
      rh.style.cssText = [
        'display:none',
        'position:absolute', 'bottom:-5px', 'right:-5px',
        'width:12px', 'height:12px',
        'background:#ff6600', 'border-radius:2px',
        'cursor:se-resize', 'z-index:6'
      ].join(';');
      el.appendChild(rh);

      /* Drag — move */
      el.addEventListener('mousedown', function (e) {
        if (!editMode || e.target === rh) return;
        e.preventDefault();
        var bg = document.getElementById('sem1Bg');
        var br = bg.getBoundingClientRect();
        var sx = e.clientX, sy = e.clientY;
        var sl = vals[i].l, st = vals[i].t;

        function mm(e) {
          vals[i].l = Math.max(0, sl + (e.clientX - sx) / br.width  * 100);
          vals[i].t = Math.max(0, st + (e.clientY - sy) / br.height * 100);
          el.style.left = vals[i].l.toFixed(3) + '%';
          el.style.top  = vals[i].t.toFixed(3) + '%';
          refreshPanel();
        }
        function mu() {
          document.removeEventListener('mousemove', mm);
          document.removeEventListener('mouseup',   mu);
        }
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup',   mu);
      });

      /* Drag — resize */
      rh.addEventListener('mousedown', function (e) {
        e.preventDefault(); e.stopPropagation();
        var bg = document.getElementById('sem1Bg');
        var br = bg.getBoundingClientRect();
        var sx = e.clientX, sy = e.clientY;
        var sw = vals[i].w, sh = vals[i].h;

        function mm(e) {
          vals[i].w = Math.max(0.3, sw + (e.clientX - sx) / br.width  * 100);
          vals[i].h = Math.max(0.3, sh + (e.clientY - sy) / br.height * 100);
          el.style.width  = vals[i].w.toFixed(3) + '%';
          el.style.height = vals[i].h.toFixed(3) + '%';
          refreshPanel();
        }
        function mu() {
          document.removeEventListener('mousemove', mm);
          document.removeEventListener('mouseup',   mu);
        }
        document.addEventListener('mousemove', mm);
        document.addEventListener('mouseup',   mu);
      });
    });
  }

  /* ================================================================
     ACTIVATE / DEACTIVATE
  ================================================================ */
  var _forceInterval = null;

  function activate() {
    editMode = true;
    panel.style.display = 'block';
    toggleBtn.style.background = 'rgba(255,60,0,1)';
    toggleBtn.title = 'Exit Highlight Editor';

    hls.forEach(function (el, i) {
      el.style.setProperty('opacity',        '1',    'important');
      el.style.setProperty('pointer-events', 'all',  'important');
      el.style.setProperty('cursor',         'move',  'important');
      el.style.setProperty('background',     'rgba(255,90,30,0.10)', 'important');
      el.style.setProperty('border',         '1.5px solid rgba(255,130,40,0.85)', 'important');
      el.style.setProperty('box-shadow',     'none', 'important');

      var lbl = el.querySelector('.hl-editor-label');
      var rh  = el.querySelector('.hl-editor-rh');
      if (lbl) lbl.style.display = 'block';
      if (rh)  rh.style.display  = 'block';
    });

    /* Also keep sem1Bg visible */
    var bg = document.getElementById('sem1Bg');
    _forceInterval = setInterval(function () {
      if (!editMode) return;
      if (bg) bg.style.setProperty('opacity', '1', 'important');
      hls.forEach(function (el) {
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('pointer-events', 'all', 'important');
      });
    }, 40);

    refreshPanel();
  }

  function deactivate() {
    editMode = false;
    if (_forceInterval) { clearInterval(_forceInterval); _forceInterval = null; }
    panel.style.display = 'none';
    toggleBtn.style.background = 'rgba(255,100,20,0.90)';
    toggleBtn.title = 'Edit USP Highlight Regions';

    hls.forEach(function (el) {
      /* Remove forced styles — let scroll-story take back over */
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
      el.style.removeProperty('cursor');
      el.style.removeProperty('background');
      el.style.removeProperty('border');
      el.style.removeProperty('box-shadow');

      var lbl = el.querySelector('.hl-editor-label');
      var rh  = el.querySelector('.hl-editor-rh');
      if (lbl) lbl.style.display = 'none';
      if (rh)  rh.style.display  = 'none';
    });
  }

  function resetAll() {
    vals.forEach(function (v, i) {
      v.l = v.origL; v.t = v.origT;
      v.w = v.origW; v.h = v.origH;
      var el = hls[i];
      el.style.left   = v.l.toFixed(3) + '%';
      el.style.top    = v.t.toFixed(3) + '%';
      el.style.width  = v.w.toFixed(3) + '%';
      el.style.height = v.h.toFixed(3) + '%';
    });
    refreshPanel();
  }

  /* ================================================================
     PANEL OUTPUT
  ================================================================ */
  function refreshPanel() {
    if (!pre) return;
    var lines = ['var USP_HL = ['];
    vals.forEach(function (v, i) {
      var pad = i < 10 ? '0' + i : '' + i;
      lines.push(
        '  { l: ' + fmt(v.l) + ', t: ' + fmt(v.t) +
        ', w: ' + fmt(v.w) + ', h: ' + fmt(v.h) + ' },' +
        '  /* ' + pad + ' — ' + NAMES[i] + ' */'
      );
    });
    lines.push('];');
    pre.textContent = lines.join('\n');
  }

  function fmt(n) {
    var s = n.toFixed(3);
    while (s.length < 7) s = ' ' + s;
    return s;
  }

  /* ---- Boot ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

}());
