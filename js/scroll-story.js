/* ============================================================
   SCROLL STORY
   Phase 1 (0→18%)  : hero copy moves up first, then fades word-by-word
   Phase 2 (0→25%)  : logo 3D flip 180°, glass tile fades
   Mouse tilt        : logo (+ glass tile) tilts subtly with cursor
   Mobile (≤820px)  : copy stacked top/bottom, moves up/down on scroll
   ============================================================ */

(function () {
  'use strict';

  /* ---- Element references ---- */
  const hero      = document.getElementById('heroSection');
  const logoFlip  = document.getElementById('logoFlip');
  const tileGlass = document.querySelector('#logo3d .tile-glass');
  const logo3d    = document.getElementById('logo3d');
  const diamond   = document.querySelector('#logo3d .face.back .diamond');
  const heroCopyL = document.getElementById('heroCopyL');
  const heroCopyR = document.getElementById('heroCopyR');

  /* ---- Helpers ---- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /* Word spans cached on first use */
  var wordsL = null;
  var wordsR = null;
  var animsCleared = false;

  /* ---- Phase 2b/3 auto-sequence state ---- */
  var autoSequenceFired = false;
  var autoSeqTO         = null;

  /* ---- Phase 4 anchor: set the moment patchReady first becomes true ---- */
  var _phase4StartP   = null;
  var _prevPatchReady = false;

  /* ---- sem1 ready: scrollY recorded once sem1 is fully formed ---- */
  var _sem1ReadyRecorded = false;

  /* ---- Scroll velocity tracking (px per rAF tick) ---- */
  var _lastScrollY = 0;
  var _scrollVel   = 0;

  /* ---- Scroll update (rAF-throttled) ---- */
  function update() {
    ticking = false;

    /* Measure how many px scrolled since last tick — used for snap decisions */
    _scrollVel   = Math.abs(window.scrollY - _lastScrollY);
    _lastScrollY = window.scrollY;

    var isMobile = window.innerWidth <= 820;
    const range  = hero.offsetHeight - window.innerHeight;
    const p      = clamp(window.scrollY / range, 0, 1);

    /* ══════════════════════════════════════════════════════
       PHASE 1 — hero copy: travel up first, then word-by-word fade
       ══════════════════════════════════════════════════════ */
    if (window.PIXMAP && window.PIXMAP.copyVisible) {

      if (!wordsL && heroCopyL) wordsL = Array.prototype.slice.call(heroCopyL.querySelectorAll('.word'));
      if (!wordsR && heroCopyR) wordsR = Array.prototype.slice.call(heroCopyR.querySelectorAll('.word'));

      /* Release CSS animation-fill-mode lock on first scroll tick */
      if (!animsCleared && p > 0) {
        animsCleared = true;
        [wordsL, wordsR].forEach(function (words) {
          if (!words) return;
          words.forEach(function (w) {
            w.style.opacity   = window.getComputedStyle(w).opacity;
            w.style.animation = 'none';
          });
        });
      }

      var moveT = easeInOut(clamp(p / 0.18, 0, 1));

      if (isMobile) {
        var mMoveUp = (moveT * 50).toFixed(1);
        if (heroCopyL) heroCopyL.style.transform = 'translateY(-' + mMoveUp + 'px)';
        if (heroCopyR) heroCopyR.style.transform = 'translateY('  + mMoveUp + 'px)';
      } else {
        var moveUp = (moveT * 220).toFixed(1);
        var copyTx = 'translateY(calc(-50% - ' + moveUp + 'px))';
        if (heroCopyL) heroCopyL.style.transform = copyTx;
        if (heroCopyR) heroCopyR.style.transform = copyTx;
      }

      /* Words wait for fadeDelay (copy travels up first), then cascade out */
      [wordsL, wordsR].forEach(function (words) {
        if (!words) return;
        var count     = words.length;
        var fadeDelay = 0.07;
        var fadeDur   = 0.05;
        var fadeRange = 0.18 - fadeDelay - fadeDur;
        var step      = fadeRange / (count - 1 || 1);
        for (var i = 0; i < count; i++) {
          var wStart = fadeDelay + i * step;
          var wordT  = easeInOut(clamp((p - wStart) / fadeDur, 0, 1));
          words[i].style.opacity   = (1 - wordT).toFixed(3);
          words[i].style.transform = '';
        }
      });
    }

    /* ══════════════════════════════════════════════════════
       PHASE 2 — logo 3D flip (p 0 → 0.25), 180° to back face
       ══════════════════════════════════════════════════════ */
    const flipT = easeInOut(clamp(p / 0.25, 0, 1));
    logoFlip.style.transform = 'rotateY(' + (180 * flipT).toFixed(2) + 'deg)';

    if (tileGlass) {
      tileGlass.style.opacity = (1 - easeInOut(clamp(p / 0.08, 0, 1))).toFixed(3);
    }

    /* Phase 2b + 3 — auto-sequence: fires once flip is complete (flipT = 1).
       No more scrolling needed — diamond untilts via CSS transition,
       then patch grid builds automatically after it settles. */
    if (flipT >= 1 && !autoSequenceFired) {
      autoSequenceFired = true;
      if (diamond) {
        diamond.style.transition = 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)';
        diamond.style.transform  = 'rotate(0deg)';
      }
      autoSeqTO = setTimeout(function () {
        if (autoSequenceFired && window.PIXMAP && window.PIXMAP.setPatchReveal) {
          window.PIXMAP.setPatchReveal(true);
        }
      }, 700);
    }

    /* Scroll-back reset — user scrolled back past the hysteresis point */
    if (p < 0.20 && autoSequenceFired) {
      autoSequenceFired = false;
      clearTimeout(autoSeqTO);
      if (diamond) {
        diamond.style.transition = '';
        diamond.style.transform  = 'rotate(45deg)';
      }
      if (window.PIXMAP && window.PIXMAP.setPatchReveal) {
        window.PIXMAP.setPatchReveal(false);
      }
    }

    /* Fast-scroll: jump to settled state */
    if (_scrollVel > 25) {
      if (autoSequenceFired && window.PIXMAP && window.PIXMAP.snapPatchOpen) {
        window.PIXMAP.snapPatchOpen();
      }
      if (!autoSequenceFired && window.PIXMAP && window.PIXMAP.snapPatchClose) {
        window.PIXMAP.snapPatchClose();
      }
    }

    /* Phase 4 — starts the moment patch_stage is fully formed (patchReady).
       Anchors to the scroll position at that instant so the very next scroll
       drives the shrink/crossfade — no dead zone after formation. */
    var patchNowReady = !!(window.PIXMAP && window.PIXMAP.patchReady);
    if (patchNowReady && !_prevPatchReady) _phase4StartP = p;
    if (!patchNowReady)                    _phase4StartP = null;
    _prevPatchReady = patchNowReady;

    var phase4T = 0;
    if (patchNowReady && _phase4StartP !== null) {
      phase4T = easeInOut(clamp((p - _phase4StartP) / 0.15, 0, 1));
      if (window.PIXMAP && window.PIXMAP.setPatchExit) {
        window.PIXMAP.setPatchExit(phase4T);
      }
    }

    /* sem1 enlarges behind the shrinking patch during Phase 4.
       Scales from 0.4 → 1.0, fades in — opposite of patch_stage shrink.
       Skip when network section is active — it owns sem1's opacity. */
    var sem1El = document.getElementById('sem1Bg');
    if (sem1El && !(window.PIXMAP && window.PIXMAP.netActive)) {
      if (phase4T > 0) {
        var sem1Scale = (0.4 + phase4T * 0.6);
        var uspPulse  = (window.PIXMAP && window.PIXMAP.uspPulseScale != null)
          ? window.PIXMAP.uspPulseScale : 1;
        sem1El.style.visibility = 'visible';
        sem1El.style.opacity    = phase4T.toFixed(3);
        sem1El.style.transform  =
          'translateX(-50%) translateY(-50%) scale(' +
          (sem1Scale * uspPulse).toFixed(4) + ')';
        sem1El.style.clipPath       = 'none';
        sem1El.style.webkitClipPath = 'none';
        /* Glow + laser activate once sem1 is fully formed */
        sem1El.classList.toggle('glow-active', phase4T >= 0.98);
      } else {
        sem1El.style.opacity    = '0';
        sem1El.style.visibility = 'hidden';
        sem1El.style.transform  = 'translateX(-50%) translateY(-50%) scale(0.4)';
        sem1El.classList.remove('glow-active');
      }
    }

    /* Record scrollY once when sem1 is fully formed — USP scene uses this
       as its anchor so the first USP fires the very next scroll after sem1. */
    if (phase4T >= 0.98 && !_sem1ReadyRecorded) {
      _sem1ReadyRecorded = true;
      window.PIXMAP = window.PIXMAP || {};
      window.PIXMAP.sem1ReadyScrollY = window.scrollY;
    }
    if (!patchNowReady && _sem1ReadyRecorded) {
      _sem1ReadyRecorded = false;
      if (window.PIXMAP) window.PIXMAP.sem1ReadyScrollY = null;
    }

    logo3d.classList.remove('docked');
  }

  let ticking = false;

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();


  /* ════════════════════════════════════════════════════════
     MOUSE TILT — logo + glass tile gently follow the cursor
     Activates after the logoPop intro animation completes.
     The .flip child (which holds the scroll-driven rotateY)
     is a separate element, so tilt and flip coexist cleanly.
     ════════════════════════════════════════════════════════ */

  var tiltReady = false;
  var tiltTargX = 0, tiltTargY = 0;   /* target angles  */
  var tiltCurrX = 0, tiltCurrY = 0;   /* current angles (lerped) */
  var tiltRaf   = null;

  var MAX_TILT_Y = 20;   /* degrees — horizontal mouse sweep */
  var MAX_TILT_X = 16;   /* degrees — vertical mouse sweep   */
  var LERP       = 0.10; /* smoothing: smaller = more inertia */

  /* Wait for the logoPop animation to finish before taking over the transform */
  if (logo3d) {
    logo3d.addEventListener('animationend', function () {
      /* Freeze animation; JS will now own the transform each frame */
      logo3d.style.animation = 'none';
      tiltReady = true;
    }, { once: true });
  }

  /* Track cursor across the whole page */
  document.addEventListener('mousemove', function (e) {
    if (!tiltReady) return;
    /* Normalise to -0.5 … +0.5 from viewport centre */
    var dx = e.clientX / window.innerWidth  - 0.5;
    var dy = e.clientY / window.innerHeight - 0.5;
    tiltTargY =  dx * MAX_TILT_Y * 2;   /* left ↔ right  → rotateY */
    tiltTargX = -dy * MAX_TILT_X * 2;   /* up   ↕ down   → rotateX */
    scheduleTilt();
  }, { passive: true });

  /* Ease back to centre when cursor leaves the window */
  document.addEventListener('mouseleave', function () {
    tiltTargX = 0;
    tiltTargY = 0;
    scheduleTilt();
  });

  function scheduleTilt() {
    if (!tiltRaf) tiltRaf = requestAnimationFrame(stepTilt);
  }

  function stepTilt() {
    tiltRaf = null;
    if (!logo3d || !tiltReady) return;
    /* patch-scene.js sets this flag when it controls the logo transform */
    if (window.PIXMAP && window.PIXMAP.tiltPaused) return;

    /* Smooth lerp toward target */
    tiltCurrX += (tiltTargX - tiltCurrX) * LERP;
    tiltCurrY += (tiltTargY - tiltCurrY) * LERP;

    /*
      Apply tilt to #logo3d while preserving the centering translate.
      .flip (inside) still gets its own rotateY from the scroll phase —
      those are separate elements, so they compose cleanly in 3D.
    */
    logo3d.style.transform =
      'translate3d(-50%, -50%, 0) ' +
      'rotateX(' + tiltCurrX.toFixed(3) + 'deg) ' +
      'rotateY(' + tiltCurrY.toFixed(3) + 'deg)';

    /* Keep ticking until close enough to rest */
    if (Math.abs(tiltTargX - tiltCurrX) > 0.005 ||
        Math.abs(tiltTargY - tiltCurrY) > 0.005) {
      tiltRaf = requestAnimationFrame(stepTilt);
    }
  }

}());
