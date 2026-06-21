/* ============================================================
   GRID TRAIL
   - Always-visible faint base grid
   - Random blue flicker cells
   - Mouse cursor leaves a fading grid-cell highlight trail
   - Very subtle mouse parallax: grid drifts ±6 px toward
     the mouse — barely perceptible but present
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('gridTrail');
  const ctx    = canvas.getContext('2d');

  const CELL         = 32;    /* grid cell size in px */
  const LIFE         = 1400;  /* mouse trail fade in ms */
  const FLICKER_LIFE = 1400;  /* random flicker fade in ms — gentle twinkle */
  const dpr          = Math.min(window.devicePixelRatio || 1, 2);

  /* ── Subtle mouse parallax ─────────────────────────────────
     MAX_SHIFT: maximum grid drift in logical pixels.
     Keep very small — the effect is meant to be felt, not seen.
     LERP_F: smoothing per frame (~60fps → settles in ~18 frames ≈ 0.3s) */
  const MAX_SHIFT = 6;
  const LERP_F    = 0.055;
  let   gOffX = 0, gOffY = 0;   /* current smoothed offset */
  let   mx = 0,    my = 0;      /* raw mouse coords */

  let W, H;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mx = W / 2; my = H / 2;    /* reset to centre on resize */
  }

  resize();
  window.addEventListener('resize', resize);

  /* Mouse trail: "col,row" → birth timestamp */
  const cells = new Map();
  let curC = -1, curR = -1, onPage = false, lastMove = -1e9;

  /* Random flicker: "col,row" → { birth, color } */
  const flickerCells = new Map();

  /* Palette — cycles through all brand colors one by one */
  const TWINKLE_COLORS = [
    [33,  106, 214],   /* #216AD6  Primary Blue      */
    [44,  136, 221],   /* #2C88DD  Medium Blue       */
    [59,  161, 225],   /* #3BA1E1  Light Blue        */
    [21,   24,  44],   /* #15182C  Dark Border Blue  */
    [40,   56,  84],   /* #283854  Grid Line Blue    */
    [50,   96, 143],   /* #32608F  Shadow Blue       */
    [59,   59,  59],   /* #3B3B3B  Dark Charcoal     */
    [169, 169, 169],   /* #A9A9A9  Standard Gray     */
  ];
  var colorIdx = 0;

  function addCell(c, r) {
    cells.set(c + ',' + r, performance.now());
  }

  /* ---- Always-visible faint base grid ---- */
  function drawBaseGrid() {
    ctx.strokeStyle = 'rgba(47, 142, 223, 0.07)';
    ctx.lineWidth   = 0.5;
    /* Draw one extra column/row on each side to cover parallax shift */
    const cols = Math.ceil(W / CELL) + 1;
    const rows = Math.ceil(H / CELL) + 1;
    for (let c = -1; c <= cols; c++) {
      for (let r = -1; r <= rows; r++) {
        ctx.strokeRect(c * CELL + 0.5, r * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }
  }

  /* ---- Pixmap-tinted gradient fill per cell ---- */
  function fillCell(x, y, alpha, strong) {
    const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
    g.addColorStop(0, 'rgba(47,142,223,' + (alpha * (strong ? 0.18 : 0.10)).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(31, 99,214,' + (alpha * (strong ? 0.20 : 0.12)).toFixed(3) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.strokeStyle = 'rgba(47,142,223,' + (alpha * (strong ? 0.55 : 0.38)).toFixed(3) + ')';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
  }

  /* ---- Random flicker spawner — 4-5 independent twinkle chains, cycling colors ---- */
  function spawnFlicker() {
    const cols  = Math.ceil(W / CELL);
    const rows  = Math.ceil(H / CELL);
    const c     = Math.floor(Math.random() * cols);
    const r     = Math.floor(Math.random() * rows);
    const color = TWINKLE_COLORS[colorIdx % TWINKLE_COLORS.length];
    colorIdx++;
    flickerCells.set(c + ',' + r, { birth: performance.now(), color: color });
  }

  function twinkleChain() {
    spawnFlicker();
    /* each chain independently waits then twinkles again at a random pace */
    setTimeout(twinkleChain, FLICKER_LIFE + Math.random() * 1800 + 600);
  }

  function scheduleFlicker() {
    /* launch 4-5 independent chains, staggered so they don't all fire at once */
    var count = 4 + Math.floor(Math.random() * 2); /* 4 or 5 chains */
    for (var i = 0; i < count; i++) {
      setTimeout(twinkleChain, i * (Math.random() * 600 + 200));
    }
  }

  /* Start flickering only after the logo finishes scaling up (logoPop = 4s) */
  var logo3dEl = document.getElementById('logo3d');
  if (logo3dEl) {
    var logoObserver = new MutationObserver(function () {
      if (logo3dEl.classList.contains('reveal')) {
        logoObserver.disconnect();
        setTimeout(scheduleFlicker, 4000); /* wait for logoPop animation to complete */
      }
    });
    logoObserver.observe(logo3dEl, { attributes: true, attributeFilter: ['class'] });
  } else {
    // If no logo3d element is found (e.g., subpages), start flickering after a brief delay
    setTimeout(scheduleFlicker, 500);
  }

  /* ---- Mouse: track raw coords + trail cells (Bresenham fill) ---- */
  window.addEventListener('pointermove', function (e) {
    /* Raw position for parallax */
    mx = e.clientX;
    my = e.clientY;

    /* Cell coordinates for trail */
    const c = Math.floor(e.clientX / CELL);
    const r = Math.floor(e.clientY / CELL);
    if (c === curC && r === curR) { onPage = true; return; }

    if (curC >= 0) {
      let c0 = curC, r0 = curR;
      const dc = Math.abs(c - c0), dr = Math.abs(r - r0);
      const sc = c0 < c ? 1 : -1, sr = r0 < r ? 1 : -1;
      let err = dc - dr;
      while (c0 !== c || r0 !== r) {
        const e2 = err * 2;
        if (e2 > -dr) { err -= dr; c0 += sc; }
        if (e2 <  dc) { err += dc; r0 += sr; }
        addCell(c0, r0);
      }
    } else {
      addCell(c, r);
    }

    curC = c; curR = r; onPage = true;
    lastMove = performance.now();
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    onPage = false; curC = -1; curR = -1;
  });

  /* ---- Render loop ---- */
  function frame() {
    requestAnimationFrame(frame);

    const now = performance.now();

    /* ── Update smooth parallax offset ──────────────────────
       When mouse is on page, drift toward (mx,my)-derived target.
       When off page, decay slowly back to zero.                 */
    if (onPage) {
      const tgX = ((mx / W) - 0.5) * MAX_SHIFT;
      const tgY = ((my / H) - 0.5) * MAX_SHIFT;
      gOffX += (tgX - gOffX) * LERP_F;
      gOffY += (tgY - gOffY) * LERP_F;
    } else {
      gOffX *= 0.94;  /* drift back to centre */
      gOffY *= 0.94;
    }

    /* ── Clear full canvas (before translate) ──────────────── */
    ctx.clearRect(0, 0, W, H);

    /* ── Apply parallax offset to all drawing ──────────────── */
    ctx.save();
    ctx.translate(gOffX, gOffY);

    /* 1. Base grid — always on */
    drawBaseGrid();

    /* 2. Random flicker cells — bell-curve, cycling brand colors */
    flickerCells.forEach(function (data, key) {
      const age = now - data.birth;
      if (age > FLICKER_LIFE) { flickerCells.delete(key); return; }
      const parts = key.split(',');
      const x = +parts[0] * CELL;
      const y = +parts[1] * CELL;
      const a = Math.sin((age / FLICKER_LIFE) * Math.PI); /* 0 → 1 → 0 bell */
      const rgb = data.color;

      const g = ctx.createLinearGradient(x, y, x + CELL, y + CELL);
      g.addColorStop(0,   'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (a * 0.80).toFixed(3) + ')');
      g.addColorStop(1,   'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (a * 0.45).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, CELL, CELL);
    });

    /* 3. Mouse trail */
    cells.forEach(function (birth, key) {
      const age = now - birth;
      if (age > LIFE) { cells.delete(key); return; }
      const parts = key.split(',');
      const x = +parts[0] * CELL;
      const y = +parts[1] * CELL;
      const a = Math.pow(1 - age / LIFE, 1.6);
      fillCell(x, y, a, false);
    });

    /* 4. Cursor cluster — fades after 3s idle */
    const idle  = now - lastMove;
    const idleA = idle < 3000 ? 1 : Math.max(0, 1 - (idle - 3000) / 900);
    if (onPage && curC >= 0 && idleA > 0) {
      fillCell(curC * CELL, curR * CELL, idleA, true);
    }

    ctx.restore();
  }

  frame();
}());
