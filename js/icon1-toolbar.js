/* ============================================================
   DEV TOOLBAR — icon1 start-position picker
   Floating panel to interactively set where icon1 begins its
   journey to centre-screen. Position is saved to localStorage
   and read by flip-scene.js on every scroll tick.

   Keys stored:  icon1StartX  (px offset from viewport centre, horizontal)
                 icon1StartY  (px offset from viewport centre, vertical)

   Remove this script tag from index.html when done positioning.
   ============================================================ */

(function () {
  'use strict';

  var KEY_X      = 'icon1StartX';
  var KEY_Y      = 'icon1StartY';
  var DEFAULT_X  = -520;
  var DEFAULT_Y  = 280;

  /* ── Read saved position ── */
  var posX = parseFloat(localStorage.getItem(KEY_X) || DEFAULT_X);
  var posY = parseFloat(localStorage.getItem(KEY_Y) || DEFAULT_Y);

  /* ── Minimap viewport representation ── */
  var MAP_W   = 180;    /* px width of minimap */
  var MAP_H   = 101;    /* px height (≈16:9) */
  var RANGE_X = 1600;   /* total span: ±800 px from centre */
  var RANGE_Y = 1000;   /* total span: ±500 px from centre */

  /* ── Inject toolbar styles ── */
  var css = document.createElement('style');
  css.textContent = [
    '#i1tb {',
    '  position:fixed; bottom:24px; right:24px; width:280px;',
    '  background:rgba(15,15,18,0.93); border:1px solid #2d2d2d;',
    '  border-radius:10px; font:12px/1.4 "Courier New",monospace;',
    '  color:#ccc; z-index:99999; box-shadow:0 6px 28px rgba(0,0,0,0.6);',
    '  backdrop-filter:blur(10px); user-select:none;',
    '}',
    '#i1tb .hdr {',
    '  display:flex; justify-content:space-between; align-items:center;',
    '  padding:8px 12px; border-bottom:1px solid #222;',
    '  color:#F36B22; font-weight:bold; font-size:11px;',
    '  cursor:move; letter-spacing:.5px;',
    '}',
    '#i1tb .hdr button {',
    '  background:none; border:1px solid #444; color:#aaa;',
    '  cursor:pointer; padding:0 6px 1px; border-radius:4px;',
    '  font-size:15px; line-height:1; flex-shrink:0;',
    '}',
    '#i1tb .body { padding:10px 12px; }',
    '#i1tb.min .body { display:none; }',
    /* minimap */
    '#i1tb .mmap { display:flex; justify-content:center; margin-bottom:10px; }',
    '#i1tb .mmap-screen {',
    '  width:'+MAP_W+'px; height:'+MAP_H+'px;',
    '  border:1px solid #383838; border-radius:4px;',
    '  background:rgba(255,255,255,0.03); position:relative; cursor:crosshair;',
    '}',
    '#i1tb .mmap-label {',
    '  position:absolute; font-size:9px; color:#555; pointer-events:none;',
    '}',
    '#i1tb .mmap-label.tl { top:3px; left:4px; }',
    '#i1tb .mmap-label.tr { top:3px; right:4px; }',
    '#i1tb .mmap-label.bl { bottom:3px; left:4px; }',
    '#i1tb .mmap-label.br { bottom:3px; right:4px; }',
    '#i1tb .mmap-cross {',
    '  position:absolute; left:50%; top:50%;',
    '  width:10px; height:10px;',
    '  transform:translate(-50%,-50%);',
    '  pointer-events:none;',
    '}',
    '#i1tb .mmap-cross::before,#i1tb .mmap-cross::after {',
    '  content:""; position:absolute; background:#F36B22;',
    '}',
    '#i1tb .mmap-cross::before { width:1px; height:10px; left:4.5px; top:0; }',
    '#i1tb .mmap-cross::after  { width:10px; height:1px; top:4.5px; left:0; }',
    '#i1tb .mmap-dot {',
    '  position:absolute; width:10px; height:10px;',
    '  border-radius:50%; background:#44afe5;',
    '  transform:translate(-50%,-50%); pointer-events:none;',
    '  box-shadow:0 0 6px #44afe5;',
    '}',
    '#i1tb .mmap-arrow {',
    '  position:absolute; pointer-events:none; overflow:visible;',
    '  left:0; top:0; width:100%; height:100%;',
    '}',
    /* sliders */
    '#i1tb .row { display:flex; align-items:center; gap:6px; margin-bottom:7px; }',
    '#i1tb .row label { width:14px; color:#F36B22; font-size:11px; }',
    '#i1tb .row input[type=range] { flex:1; accent-color:#F36B22; }',
    '#i1tb .row .val { width:42px; text-align:right; color:#fff; font-size:11px; }',
    /* footer */
    '#i1tb .foot {',
    '  display:flex; align-items:center; gap:8px; margin-top:8px;',
    '  padding-top:8px; border-top:1px solid #222;',
    '}',
    '#i1tb .foot button {',
    '  background:#1a1a1e; border:1px solid #3a3a3a; color:#aaa;',
    '  padding:3px 10px; border-radius:4px; cursor:pointer; font-size:11px;',
    '}',
    '#i1tb .foot button:hover { border-color:#F36B22; color:#F36B22; }',
    '#i1tb .foot .saved { color:#4caf50; font-size:11px; }',
    '#i1tb .foot .coords { margin-left:auto; color:#555; font-size:10px; }',
    /* ghost icon on viewport */
    '#i1ghost {',
    '  position:fixed; left:50%; top:50%;',
    '  width:clamp(80px,12vw,140px); height:clamp(80px,12vw,140px);',
    '  border:2px dashed rgba(68,175,229,0.55);',
    '  border-radius:50%; z-index:9998; pointer-events:none;',
    '  transform:translate(-50%,-50%);',
    '  background:rgba(68,175,229,0.07);',
    '  transition:opacity .15s;',
    '}',
    '#i1ghost.hidden { opacity:0; }'
  ].join('\n');
  document.head.appendChild(css);

  /* ── Build toolbar HTML ── */
  var tb = document.createElement('div');
  tb.id = 'i1tb';
  tb.innerHTML =
    '<div class="hdr">' +
      '<span>✦ icon1 start position</span>' +
      '<button id="i1min" title="Minimise">−</button>' +
    '</div>' +
    '<div class="body">' +
      '<div class="mmap">' +
        '<div class="mmap-screen" id="i1map">' +
          '<span class="mmap-label tl">↖</span>' +
          '<span class="mmap-label tr">↗</span>' +
          '<span class="mmap-label bl">↙</span>' +
          '<span class="mmap-label br">↘</span>' +
          '<svg class="mmap-arrow" id="i1arrow"><line id="i1line" stroke="#44afe5" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/></svg>' +
          '<div class="mmap-cross"></div>' +
          '<div class="mmap-dot" id="i1dot"></div>' +
        '</div>' +
      '</div>' +
      '<div class="row">' +
        '<label>X</label>' +
        '<input type="range" id="i1x" min="-800" max="800" step="1" value="'+posX+'">' +
        '<span class="val" id="i1xv">'+Math.round(posX)+'</span>' +
      '</div>' +
      '<div class="row">' +
        '<label>Y</label>' +
        '<input type="range" id="i1y" min="-500" max="500" step="1" value="'+posY+'">' +
        '<span class="val" id="i1yv">'+Math.round(posY)+'</span>' +
      '</div>' +
      '<div class="foot">' +
        '<button id="i1reset">Reset</button>' +
        '<button id="i1ghost-toggle">Ghost ✓</button>' +
        '<span class="saved" id="i1saved"></span>' +
        '<span class="coords" id="i1coords">'+Math.round(posX)+', '+Math.round(posY)+'</span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(tb);

  /* ── Ghost element on viewport ── */
  var ghost = document.createElement('div');
  ghost.id = 'i1ghost';
  document.body.appendChild(ghost);
  var ghostVisible = true;

  /* ── Helper: convert pos → minimap pixel ── */
  function posToMap(px, py) {
    return {
      left: ((px + RANGE_X / 2) / RANGE_X) * MAP_W,
      top:  ((py + RANGE_Y / 2) / RANGE_Y) * MAP_H
    };
  }

  /* ── Update all visuals ── */
  function refresh() {
    var m = posToMap(posX, posY);

    /* dot */
    var dot = document.getElementById('i1dot');
    if (dot) { dot.style.left = m.left + 'px'; dot.style.top = m.top + 'px'; }

    /* arrow from centre to dot */
    var line = document.getElementById('i1line');
    if (line) {
      line.setAttribute('x1', MAP_W / 2); line.setAttribute('y1', MAP_H / 2);
      line.setAttribute('x2', m.left);    line.setAttribute('y2', m.top);
    }

    /* value labels */
    var xv = document.getElementById('i1xv'); if (xv) xv.textContent = Math.round(posX);
    var yv = document.getElementById('i1yv'); if (yv) yv.textContent = Math.round(posY);
    var coords = document.getElementById('i1coords');
    if (coords) coords.textContent = Math.round(posX) + ', ' + Math.round(posY);

    /* ghost on main viewport */
    ghost.style.transform =
      'translate(calc(-50% + ' + posX + 'px), calc(-50% + ' + posY + 'px)) scale(0.4)';
  }

  function save() {
    localStorage.setItem(KEY_X, posX);
    localStorage.setItem(KEY_Y, posY);
    var saved = document.getElementById('i1saved');
    if (saved) {
      saved.textContent = '✓ saved';
      clearTimeout(saved._t);
      saved._t = setTimeout(function () { saved.textContent = ''; }, 1600);
    }
  }

  /* ── Slider listeners ── */
  var slX = document.getElementById('i1x');
  var slY = document.getElementById('i1y');
  if (slX) slX.addEventListener('input', function () {
    posX = parseFloat(this.value); refresh(); save();
  });
  if (slY) slY.addEventListener('input', function () {
    posY = parseFloat(this.value); refresh(); save();
  });

  /* ── Minimap click to reposition dot ── */
  var mapEl = document.getElementById('i1map');
  if (mapEl) {
    mapEl.addEventListener('click', function (e) {
      var rect = mapEl.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / MAP_W) * RANGE_X - RANGE_X / 2;
      var ny = ((e.clientY - rect.top)  / MAP_H) * RANGE_Y - RANGE_Y / 2;
      posX = Math.round(Math.max(-800, Math.min(800, nx)));
      posY = Math.round(Math.max(-500, Math.min(500, ny)));
      if (slX) slX.value = posX;
      if (slY) slY.value = posY;
      refresh(); save();
    });
  }

  /* ── Reset ── */
  document.getElementById('i1reset').addEventListener('click', function () {
    posX = DEFAULT_X; posY = DEFAULT_Y;
    if (slX) slX.value = posX;
    if (slY) slY.value = posY;
    refresh(); save();
  });

  /* ── Ghost toggle ── */
  document.getElementById('i1ghost-toggle').addEventListener('click', function () {
    ghostVisible = !ghostVisible;
    ghost.classList.toggle('hidden', !ghostVisible);
    this.textContent = ghostVisible ? 'Ghost ✓' : 'Ghost ✗';
  });

  /* ── Minimise ── */
  document.getElementById('i1min').addEventListener('click', function () {
    tb.classList.toggle('min');
    this.textContent = tb.classList.contains('min') ? '+' : '−';
  });

  /* ── Drag toolbar ── */
  var hdr = tb.querySelector('.hdr');
  var dragging = false, ox = 0, oy = 0;
  hdr.addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'BUTTON') return;
    dragging = true;
    var r = tb.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    tb.style.right = 'auto'; tb.style.bottom = 'auto';
    tb.style.left = (e.clientX - ox) + 'px';
    tb.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', function () { dragging = false; });

  /* ── Init ── */
  refresh();

}());
