/* ============================================================
   PATCH REVEAL  v8
   Phase 3  — auto-play on scroll trigger (p ≥ 0.38):
     a) Logo square auto-shrinks to single-tile size  (0.52 s)
     b) Logo fades out, tile grid activates
     c) Tile wave bursts centre-out                   (WAVE_MS)
     d) Seamless crossfades in, patchReady = true
   Phase 4  — crossfade patch_stage → patch.png (scroll-driven)
   Reverse plays in opposite order on scroll-back.
   ============================================================ */

(function () {
  'use strict';

  /* ---- Grid ---- */
  var COLS    = 22;
  var ROWS    = 5;
  var TOTAL   = COLS * ROWS;
  var WAVE_MS = 850;

  /* ---- Elements ---- */
  var reveal        = document.getElementById('patchReveal');
  var tileGrid      = document.getElementById('prTileGrid');
  var seamless      = document.getElementById('prSeamless');
  var patchFinalEl  = document.getElementById('patchFinal');
  var pfTileGridEl  = document.getElementById('pfTileGrid');
  var pfSeamlessEl  = document.getElementById('pfSeamless');

  if (!reveal || !tileGrid) return;

  /* ════════════════════════════════════════════════════════
     BUILD TILE GRID  (patch_stage.png)
     Elliptical wave distance: faster horizontal spread.
     ════════════════════════════════════════════════════════ */
  var tiles   = [];
  var cCol    = (COLS - 1) / 2;
  var cRow    = (ROWS - 1) / 2;
  var maxDist = 0;

  for (var i = 0; i < TOTAL; i++) {
    var col  = i % COLS;
    var row  = Math.floor(i / COLS);
    var tile = document.createElement('div');
    tile.className = 'pr-tile';
    tile.style.backgroundPosition =
      (col / (COLS - 1) * 100).toFixed(3) + '% ' +
      (row / (ROWS - 1) * 100).toFixed(3) + '%';
    var dx   = col - cCol;
    var dy   = row - cRow;
    var dist = Math.sqrt(dx * dx * 0.70 + dy * dy * 2.0);
    tile._dist = dist;
    if (dist > maxDist) maxDist = dist;
    tileGrid.appendChild(tile);
    tiles.push(tile);
  }

  /* ════════════════════════════════════════════════════════
     BUILD PATCH FINAL TILE GRID  (patch.png — Phase 4)
     Same 22×5 elliptical wave, separate container.
     ════════════════════════════════════════════════════════ */
  var pfTiles = [];

  /* Set container + grid aspect-ratio from patch.png natural dimensions */
  (function () {
    var img = new Image();
    img.onload = function () {
      var ratio = (this.naturalWidth / this.naturalHeight).toFixed(6);
      if (patchFinalEl)  patchFinalEl.style.aspectRatio  = ratio;
      if (pfTileGridEl)  pfTileGridEl.style.aspectRatio  = ratio;
    };
    img.src = 'assets/images/patch.png';
  }());

  if (pfTileGridEl) {
    for (var j = 0; j < TOTAL; j++) {
      var colP  = j % COLS;
      var rowP  = Math.floor(j / COLS);
      var tileP = document.createElement('div');
      tileP.className = 'pf-tile';
      tileP.style.backgroundPosition =
        (colP / (COLS - 1) * 100).toFixed(3) + '% ' +
        (rowP / (ROWS - 1) * 100).toFixed(3) + '%';
      var dxP = colP - cCol;
      var dyP = rowP - cRow;
      tileP._dist = Math.sqrt(dxP * dxP * 0.70 + dyP * dyP * 2.0);
      pfTileGridEl.appendChild(tileP);
      pfTiles.push(tileP);
    }
  }

  /* ════════════════════════════════════════════════════════
     STATE
     ════════════════════════════════════════════════════════ */
  var revealScale = 1;
  var isOpen      = false;
  var pendingTOs  = [];
  var pfTOs       = [];
  var pfOpen      = false;

  function applyRevealTransform() {
    reveal.style.transform = 'translateY(-50%) scale(' + revealScale.toFixed(4) + ')';
  }

  function cancelPending() {
    pendingTOs.forEach(function (id) { clearTimeout(id); });
    pendingTOs = [];
  }

  function schedule(fn, delay) {
    pendingTOs.push(setTimeout(fn, delay));
  }

  /* ---- patchFinal helpers (Phase 4) ---- */
  function cancelPfTOs() {
    pfTOs.forEach(function (id) { clearTimeout(id); });
    pfTOs = [];
  }

  function schedulePf(fn, delay) {
    pfTOs.push(setTimeout(fn, delay));
  }

  /* Show patchFinal: tile wave in, then clean full image */
  function openPatchFinal() {
    if (pfOpen) return;
    pfOpen = true;
    cancelPfTOs();
    if (patchFinalEl) patchFinalEl.classList.add('active');
    pfTiles.forEach(function (t) {
      var delay = (t._dist / maxDist) * WAVE_MS;
      schedulePf(function () { t.classList.add('visible'); }, delay);
    });
    /* After wave settles, fade in clean full image — no tile seams */
    schedulePf(function () {
      if (pfOpen && pfSeamlessEl) pfSeamlessEl.style.opacity = '1';
    }, WAVE_MS + 300);
  }

  /* Hide patchFinal: clean image out, tile wave collapses */
  function closePatchFinal() {
    if (!pfOpen) return;
    pfOpen = false;
    cancelPfTOs();
    if (pfSeamlessEl) pfSeamlessEl.style.opacity = '0';
    pfTiles.forEach(function (t) {
      var delay = ((maxDist - t._dist) / maxDist) * (WAVE_MS * 0.5);
      schedulePf(function () { t.classList.remove('visible'); }, delay);
    });
    schedulePf(function () {
      if (!pfOpen && patchFinalEl) patchFinalEl.classList.remove('active');
    }, WAVE_MS * 0.5 + 300);
  }

  /* Hard-reset (no animation) used by snap/close paths */
  function resetPatchFinal() {
    pfOpen = false;
    cancelPfTOs();
    if (pfSeamlessEl)  pfSeamlessEl.style.opacity = '0';
    pfTiles.forEach(function (t) { t.classList.remove('visible'); });
    if (patchFinalEl) {
      patchFinalEl.classList.remove('active');
      patchFinalEl.style.opacity = '0';
    }
  }

  window.PIXMAP           = window.PIXMAP || {};
  window.PIXMAP.patchReady = false;
  window.PIXMAP.tiltPaused = false;

  /* ════════════════════════════════════════════════════════
     STATE MACHINE
     Triggered by scroll-story.js when p crosses 0.38.
     OPEN  — logo shrinks → tile wave → seamless → patchReady
     CLOSE — reverse: seamless out → tiles collapse → logo back
     ════════════════════════════════════════════════════════ */
  window.PIXMAP.setPatchReveal = function (open) {
    if (open === isOpen) return;
    isOpen = open;
    cancelPending();

    var logoEl = document.getElementById('logo3d');

    if (open) {
      /* ══ OPEN ══════════════════════════════════════════ */
      window.PIXMAP.tiltPaused = true;

      /* Compute target scale: one tile width relative to logo width */
      var revW  = reveal.getBoundingClientRect().width || window.innerWidth * 0.86;
      var tileW = revW / COLS;
      var logoW = logoEl ? logoEl.offsetWidth : 300;
      var ratio = Math.min(0.22, tileW / logoW);

      /* a. Logo square shrinks to single-tile size */
      if (logoEl) {
        logoEl.style.transition = 'transform 0.52s cubic-bezier(0.4, 0, 0.2, 1)';
        logoEl.style.transform  =
          'translate3d(-50%, -50%, 0) scale(' + ratio.toFixed(4) + ')';
      }

      /* b. After shrink: fade logo, activate reveal, fire tile wave */
      schedule(function () {
        if (logoEl) {
          logoEl.style.transition = 'opacity 0.22s ease';
          logoEl.style.opacity    = '0';
        }

        reveal.classList.add('active');

        /* Tile wave — centre first, edges last */
        tiles.forEach(function (t) {
          var delay = (t._dist / maxDist) * WAVE_MS;
          schedule(function () { t.classList.add('visible'); }, delay);
        });

        /* Once wave settles, crossfade to seamless image */
        schedule(function () {
          if (isOpen && seamless) {
            seamless.style.opacity   = '1';
            window.PIXMAP.patchReady = true;   /* unlock Phase 4 */
          }
        }, WAVE_MS + 300);

      }, 540);   /* wait for logo shrink to finish */

    } else {
      /* ══ CLOSE ══════════════════════════════════════════ */
      window.PIXMAP.patchReady = false;

      if (seamless) seamless.style.opacity = '0';

      /* Reset Phase 4 state */
      revealScale = 1;
      reveal.style.opacity    = '';
      reveal.style.visibility = '';
      applyRevealTransform();
      resetPatchFinal();

      /* Tile wave collapses — edges first, centre last */
      tiles.forEach(function (t) {
        var delay = ((maxDist - t._dist) / maxDist) * WAVE_MS;
        schedule(function () { t.classList.remove('visible'); }, delay);
      });

      /* Logo re-appears at tile size, then un-shrinks to full */
      schedule(function () {
        if (!isOpen && logoEl) {
          logoEl.style.transition = 'opacity 0.28s ease';
          logoEl.style.opacity    = '1';
          schedule(function () {
            if (!isOpen && logoEl) {
              logoEl.style.transition =
                'transform 0.52s cubic-bezier(0.2, 0, 0.4, 1)';
              logoEl.style.transform =
                'translate3d(-50%, -50%, 0) scale(1)';
            }
          }, 120);
        }
      }, WAVE_MS * 0.68);

      /* Resume tilt after logo returns */
      schedule(function () {
        if (!isOpen) {
          window.PIXMAP.tiltPaused = false;
          if (logoEl) logoEl.style.transition = '';
        }
      }, WAVE_MS * 0.68 + 680);

      schedule(function () {
        if (!isOpen) {
          reveal.classList.remove('active');
          reveal.style.transform = 'translateY(-50%)';
        }
      }, WAVE_MS + 480);
    }
  };

  /* ════════════════════════════════════════════════════════
     SNAP FUNCTIONS  — fast-scroll: skip to settled state
     ════════════════════════════════════════════════════════ */
  window.PIXMAP.snapPatchOpen = function () {
    if (!isOpen || window.PIXMAP.patchReady) return;
    cancelPending();
    var logoEl = document.getElementById('logo3d');
    if (logoEl) { logoEl.style.transition = 'none'; logoEl.style.opacity = '0'; }
    reveal.classList.add('active');
    tiles.forEach(function (t) { t.classList.add('visible'); });
    if (seamless) seamless.style.opacity = '1';
    window.PIXMAP.patchReady = true;
  };

  window.PIXMAP.snapPatchClose = function () {
    if (isOpen) return;
    cancelPending();
    window.PIXMAP.patchReady = false;
    if (seamless) seamless.style.opacity = '0';
    tiles.forEach(function (t) { t.classList.remove('visible'); });
    resetPatchFinal();
    reveal.classList.remove('active');
    revealScale = 1;
    reveal.style.opacity    = '';
    reveal.style.visibility = '';
    reveal.style.transform  = 'translateY(-50%)';
    var logoEl = document.getElementById('logo3d');
    if (logoEl) {
      logoEl.style.transition = 'none';
      logoEl.style.opacity    = '1';
      logoEl.style.transform  = 'translate3d(-50%, -50%, 0) scale(1)';
      requestAnimationFrame(function () {
        if (logoEl) logoEl.style.transition = '';
      });
    }
    window.PIXMAP.tiltPaused = false;
  };

  /* ════════════════════════════════════════════════════════
     PHASE 4 — SHRINK + CROSSFADE  (scroll-driven, fully reversible)

     t: 0.0 → 0.5   patchReveal shrinks scale 1.0 → 0.5, fully opaque
     t: 0.5 → 0.8   crossfade zone: patchReveal fades OUT (1→0)
                                     patchFinal  fades IN  (0→1)
                                     both at scale 0.5 — identical size,
                                     clean dissolve, no tile wave
     t: 0.8 → 1.0   patchFinal fully visible at scale 0.5, patchReveal gone

     Scroll back reverses every step.  sem1Bg driven by scroll-story.js.
     ════════════════════════════════════════════════════════ */
  window.PIXMAP.setPatchExit = function (t) {

    /* Stage A: shrink patchReveal 1.0 → 0.5, then hold at 0.5 */
    revealScale = t < 0.5 ? (1.0 - t) : 0.5;
    reveal.style.transform = 'translateY(-50%) scale(' + revealScale.toFixed(4) + ')';

    /* Stage B: crossfade (t 0.5 → 0.8), eased for smooth dissolve */
    var fadeRaw = Math.max(0, Math.min(1, (t - 0.5) / 0.3));
    /* easeInOut — slow start, slow end — avoids hard pop at either boundary */
    var fadeT = fadeRaw < 0.5
      ? 2 * fadeRaw * fadeRaw
      : 1 - Math.pow(-2 * fadeRaw + 2, 2) / 2;
    var revealOpacity = 1 - fadeT;
    var pfOpacity     = fadeT;

    reveal.style.opacity    = revealOpacity.toFixed(3);
    reveal.style.visibility = revealOpacity > 0.004 ? '' : 'hidden';

    /* seamless stays solid — container opacity drives the fade */
    if (seamless) seamless.style.opacity = '1';

    if (pfOpacity > 0) {
      if (patchFinalEl) {
        patchFinalEl.classList.add('active');
        patchFinalEl.style.opacity = pfOpacity.toFixed(3);
      }
      if (pfSeamlessEl) pfSeamlessEl.style.opacity = '1';
    } else {
      if (patchFinalEl) {
        patchFinalEl.style.opacity = '0';
        patchFinalEl.classList.remove('active');
      }
    }
  };

}());
