/* ============================================================
   USP PARALLAX SHOWCASE  v3
   10 product USPs, all cards centred on viewport.
   Particle-trail connector with bezier path routing —
   side highlights arc ABOVE the image to avoid crossing it.
   ============================================================ */

(function () {
  'use strict';

  /* ---- USP Data ---- */
  var USP_DATA = [
    {
      title: 'RAPID PATCH WORKFLOW',
      description: 'User-friendly toolset engineered to minimize setup time. Build production-ready patches in a fraction of the usual effort.'
    },
    {
      title: 'CREATIVE MASKING',
      description: 'Apply custom PNG masks to LED surfaces for precise, shape-accurate creative control.'
    },
    {
      title: 'DRAG SLIDER CONTROLS',
      description: 'Fine-tune parameters with fluid draggable sliders for precise adjustments without breaking creative flow.'
    },
    {
      title: 'COLOR PALETTE PICKER',
      description: 'Instantly select and apply colors via an integrated one-click palette — no manual hex input needed.'
    },
    {
      title: 'FIT CANVAS TO CONTENT',
      description: 'Auto-resize and reposition the canvas to precisely match content boundaries in a single click.'
    },
    {
      title: 'LABEL COLOR ASSIGNMENT',
      description: 'Assign distinct label colors to surfaces and panels for clear, at-a-glance identification across complex rigs.'
    },
    {
      title: 'INDIVIDUAL PANEL DELETION',
      description: 'Remove specific panels directly from the LED surface without disturbing surrounding patch configurations.'
    },
    {
      title: 'MULTI-FORMAT BATCH EXPORT',
      description: 'Deliver across multiple output formats simultaneously. One action, all your export targets covered.'
    },
    {
      title: 'SMART GROUP CREATION',
      description: 'Logically group complex LED patches to streamline workflow management across large-scale installations.'
    },
    {
      title: 'BRAND LOGO INTEGRATION',
      description: 'Embed your own brand mark directly into the project workspace for polished, client-ready deliverables.'
    }
  ];

  var TOTAL = USP_DATA.length; // 10

  /* ---- Highlight regions (image-relative %) ---- */
  var USP_HL = [
    { l:  0.230, t:  9.071, w:  1.921, h:  3.892 },  /* 00 — RAPID PATCH WORKFLOW    */
    { l:  0.307, t: 12.384, w:  1.921, h:  3.892 },  /* 01 — CREATIVE MASKING        */
    { l: 91.613, t: 27.601, w:  7.994, h:  8.532 },  /* 02 — DRAG SLIDER CONTROLS    */
    { l: 84.705, t: 37.730, w: 14.835, h: 12.874 },  /* 03 — COLOR PALETTE PICKER    */
    { l:  0.307, t: 20.508, w:  1.921, h:  3.892 },  /* 04 — FIT CANVAS TO CONTENT   */
    { l: 84.628, t: 59.060, w: 14.911, h: 18.713 },  /* 05 — LABEL COLOR ASSIGNMENT  */
    { l: 84.629, t: 50.904, w: 14.758, h:  8.682 },  /* 06 — INDIVIDUAL PANEL DELETE */
    { l: 17.679, t: 36.227, w: 64.720, h: 29.790 },  /* 07 — MULTI-FORMAT EXPORT     */
    { l:  0.230, t: 15.988, w:  2.075, h:  3.892 },  /* 08 — SMART GROUP CREATION    */
    { l: 18.137, t: 37.028, w: 63.725, h: 28.612 }   /* 09 — BRAND LOGO INTEGRATION  */
  ];

  /* ---- Custom connector paths (image-relative %), drawn with the
     connector tool. Each entry is a polyline of {x,y} points from the
     highlight to the card. null = fall back to the auto bezier curve. ---- */
  var USP_CONNECTORS = [
    [ {x: 2.512, y: 11.179}, {x: 14.920, y: 11.458}, {x: 14.997, y: 24.282}, {x: 31.235, y: 24.700} ],  /* 00 RAPID PATCH WORKFLOW    */
    [ {x: 2.895, y: 14.803}, {x: 15.916, y: 15.221}, {x: 15.916, y: 24.561}, {x: 31.464, y: 24.979} ],  /* 01 CREATIVE MASKING        */
    [ {x: 91.054, y: 30.833}, {x: 81.786, y: 30.694}, {x: 81.786, y: 22.748}, {x: 67.693, y: 22.888} ], /* 02 DRAG SLIDER CONTROLS    */
    [ {x: 84.390, y: 43.379}, {x: 83.012, y: 43.379}, {x: 82.935, y: 22.748}, {x: 68.229, y: 22.051} ], /* 03 COLOR PALETTE PICKER    */
    null,                                                                                                /* 04 FIT CANVAS TO CONTENT   */
    [ {x: 84.237, y: 63.312}, {x: 82.935, y: 63.312}, {x: 83.088, y: 23.167}, {x: 68.076, y: 22.888} ], /* 05 LABEL COLOR ASSIGNMENT  */
    [ {x: 84.237, y: 54.948}, {x: 83.012, y: 54.948}, {x: 83.012, y: 22.888}, {x: 67.999, y: 22.470} ], /* 06 INDIVIDUAL PANEL DELETE */
    [ {x: 27.328, y: 35.015}, {x: 27.328, y: 24.003}, {x: 31.311, y: 24.003} ],                         /* 07 MULTI-FORMAT EXPORT     */
    [ {x: 2.972, y: 18.288}, {x: 14.844, y: 18.288}, {x: 14.920, y: 24.421}, {x: 31.081, y: 24.282} ],  /* 08 SMART GROUP CREATION    */
    [ {x: 71.523, y: 35.294}, {x: 71.676, y: 22.609}, {x: 68.382, y: 22.470} ]                          /* 09 BRAND LOGO INTEGRATION  */
  ];

  /* ---- Feature media (image/gif) shown centred BELOW the patch image
     for select USPs. Files live in the project root. null = no media. ---- */
  var USP_MEDIA = [
    'assets/images/download.gif',                  /* 00 RAPID PATCH WORKFLOW    */
    'assets/images/creative masking.PNG',          /* 01 CREATIVE MASKING        */
    'assets/images/DRAG SLIDER CONTROLS.PNG',      /* 02 DRAG SLIDER CONTROLS    */
    null,                                          /* 03 COLOR PALETTE PICKER    */
    null,                                          /* 04 FIT CANVAS TO CONTENT   */
    null,                                          /* 05 LABEL COLOR ASSIGNMENT  */
    null,                                          /* 06 INDIVIDUAL PANEL DELETE */
    'assets/images/MULTI-FORMAT BATCH EXPORT.PNG', /* 07 MULTI-FORMAT EXPORT     */
    null,                                          /* 08 SMART GROUP CREATION    */
    'assets/images/BRAND LOGO INTEGRATION.PNG'     /* 09 BRAND LOGO INTEGRATION  */
  ];

  /* ---- Element references ---- */
  var uspSection   = document.getElementById('uspSection');
  var uspSticky    = document.getElementById('uspSticky');
  var uspCards     = document.getElementById('uspCards');
  var uspOverlay   = document.getElementById('uspDimOverlay');
  var uspProgress  = document.getElementById('uspProgress');
  var bgSem1       = document.getElementById('sem1Bg');
  var bgPatchFinal = document.getElementById('patchFinal');

  if (!uspSection || !uspCards) return;

  var VH_PER_USP       = 60;
  var USP_START_OFFSET = 180;
  uspSection.style.height = (TOTAL * VH_PER_USP + 300) + 'vh';

  /* ---- Build card DOM ---- */
  var cards = [];
  USP_DATA.forEach(function (usp) {
    var card = document.createElement('div');
    card.className = 'usp-card';
    card.innerHTML =
      '<h3 class="usp-title">' + usp.title       + '</h3>' +
      '<p  class="usp-desc">'  + usp.description  + '</p>';
    uspCards.appendChild(card);
    cards.push(card);
  });

  /* ---- Build highlight DOM inside #sem1Bg ---- */
  var highlightWrap = document.createElement('div');
  highlightWrap.id  = 'uspHighlights';
  if (bgSem1) bgSem1.appendChild(highlightWrap);

  var highlights = [];
  USP_HL.forEach(function (r) {
    var hl = document.createElement('div');
    hl.className    = 'usp-highlight';
    hl.style.left   = r.l.toFixed(3) + '%';
    hl.style.top    = r.t.toFixed(3) + '%';
    hl.style.width  = r.w.toFixed(3) + '%';
    hl.style.height = r.h.toFixed(3) + '%';
    highlightWrap.appendChild(hl);
    highlights.push(hl);
  });

  /* ---- Build feature-media layer (centred below the patch image) ---- */
  var mediaWrap = document.createElement('div');
  mediaWrap.id  = 'uspMedia';
  var mediaEls  = [];
  USP_MEDIA.forEach(function (src) {
    if (!src) { mediaEls.push(null); return; }
    var img = document.createElement('img');
    img.className = 'usp-media-img';
    img.src       = encodeURI(src);   /* handles spaces in filenames */
    img.alt       = '';
    mediaWrap.appendChild(img);
    mediaEls.push(img);
  });
  if (uspSticky) uspSticky.appendChild(mediaWrap);

  function hideMedia() {
    mediaEls.forEach(function (img) { if (img) img.style.opacity = '0'; });
  }

  /* ================================================================
     PARTICLE TRAIL CANVAS
     Paints a flowing particle beam along a quadratic bezier path
     from highlight centre to card edge.  Side highlights arc above
     the sem1 image so the trail never cuts through the patch.
  ================================================================ */

  var partCanvas = document.createElement('canvas');
  partCanvas.id  = 'uspTrailCanvas';
  partCanvas.style.cssText =
    'position:fixed;left:0;top:0;width:100%;height:100%;' +
    'pointer-events:none;z-index:492;';
  document.body.appendChild(partCanvas);

  var pCtx = partCanvas.getContext('2d');
  var pDpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeTrail() {
    partCanvas.width  = window.innerWidth  * pDpr;
    partCanvas.height = window.innerHeight * pDpr;
  }
  resizeTrail();
  window.addEventListener('resize', resizeTrail);

  /* Current bezier path set by update() each scroll tick */
  var trailPath   = null;   /* { id, p0:{x,y}, cp:{x,y}, p1:{x,y}, alpha:0..1 } */
  var trailPathId = -1;     /* USP index of the current path — used to detect changes */

  var trailLastTs = null;

  /* Quadratic bezier position */
  function qBez(p0, cp, p1, t) {
    var u = 1 - t;
    return {
      x: u*u*p0.x + 2*u*t*cp.x + t*t*p1.x,
      y: u*u*p0.y + 2*u*t*cp.y + t*t*p1.y
    };
  }

  /* rAF loop — independent of scroll, always running */
  function trailFrame(ts) {
    requestAnimationFrame(trailFrame);

    var dt = trailLastTs !== null ? Math.min((ts - trailLastTs) / 1000, 0.05) : 0;
    trailLastTs = ts;

    var W = window.innerWidth;
    var H = window.innerHeight;
    pCtx.setTransform(pDpr, 0, 0, pDpr, 0, 0);
    pCtx.clearRect(0, 0, W, H);

    if (!trailPath || trailPath.alpha < 0.008) {
      trailPathId = -1;
      return;
    }

    var alpha = trailPath.alpha;

    /* Unified path sampler — sampleFn(t) returns a point for t in [0,1].
       Supports a custom straight-line polyline (trailPath.pts) drawn via
       the connector tool, or the legacy auto bezier (p0/cp/p1).          */
    var sampleFn, firstPt;
    if (trailPath.pts && trailPath.pts.length >= 2) {
      var _pts = trailPath.pts;
      var _seg = [], _tot = 0;
      for (var _i = 1; _i < _pts.length; _i++) {
        var _dx = _pts[_i].x - _pts[_i - 1].x;
        var _dy = _pts[_i].y - _pts[_i - 1].y;
        var _l  = Math.sqrt(_dx * _dx + _dy * _dy);
        _seg.push(_l); _tot += _l;
      }
      firstPt = _pts[0];
      sampleFn = function (t) {
        if (t <= 0) return _pts[0];
        if (t >= 1) return _pts[_pts.length - 1];
        var target = t * _tot, acc = 0;
        for (var j = 0; j < _seg.length; j++) {
          if (acc + _seg[j] >= target) {
            var lt = _seg[j] > 0 ? (target - acc) / _seg[j] : 0;
            return {
              x: _pts[j].x + (_pts[j + 1].x - _pts[j].x) * lt,
              y: _pts[j].y + (_pts[j + 1].y - _pts[j].y) * lt
            };
          }
          acc += _seg[j];
        }
        return _pts[_pts.length - 1];
      };
    } else {
      var p0 = trailPath.p0, cp = trailPath.cp, p1 = trailPath.p1;
      firstPt  = p0;
      sampleFn = function (t) { return qBez(p0, cp, p1, t); };
    }

    /* ── 1. Full path line — appears instantly, no travel delay ── */
    var LINE_PTS = 32;
    pCtx.beginPath();
    pCtx.moveTo(firstPt.x, firstPt.y);
    for (var s = 1; s <= LINE_PTS; s++) {
      var lp = sampleFn(s / LINE_PTS);
      pCtx.lineTo(lp.x, lp.y);
    }
    pCtx.strokeStyle = 'rgba(44,130,185,' + (alpha * 0.28).toFixed(3) + ')';
    pCtx.lineWidth   = 2.8;
    pCtx.lineCap     = 'round';
    pCtx.lineJoin    = 'round';
    pCtx.stroke();

    /* ── 2. Looping comet particles — same style as highlight border ──
       3 comets sweep continuously along the path in a loop,
       matching the conic-gradient comet arcs on the highlight box.    */
    var tSec       = ts / 1000;
    var CYCLE      = 3.8;   /* seconds per full sweep — slow and subtle  */
    var NUM_COMETS = 3;
    var TAIL_LEN   = 0.10;  /* shorter tail for a cleaner look           */
    var TAIL_STEPS = 9;

    pCtx.lineCap = 'round';

    for (var c = 0; c < NUM_COMETS; c++) {
      var headT   = (tSec / CYCLE + c / NUM_COMETS) % 1.0;
      var headPos = sampleFn(headT);

      /* Fading tail segments — bright at head, transparent at tail */
      for (var k = TAIL_STEPS; k >= 1; k--) {
        var ta = headT - (k       / TAIL_STEPS) * TAIL_LEN;
        var tb = headT - ((k - 1) / TAIL_STEPS) * TAIL_LEN;
        if (ta < 0 || tb < 0) continue;

        var pA  = sampleFn(ta);
        var pB  = sampleFn(tb);
        var f   = (TAIL_STEPS - k + 1) / TAIL_STEPS; /* 0 at tail → 1 at head */

        pCtx.beginPath();
        pCtx.moveTo(pA.x, pA.y);
        pCtx.lineTo(pB.x, pB.y);
        /* Color ramp: dim blue tail → bright cyan-white head,
           matching rgba(68,175,229) → rgba(225,248,255) on the highlight */
        var r = Math.round(68  + f * 157); /* 68  → 225 */
        var g = Math.round(175 + f * 73);  /* 175 → 248 */
        var b = Math.round(229 + f * 26);  /* 229 → 255 */
        pCtx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha * f * 0.55).toFixed(3) + ')';
        pCtx.lineWidth   = 1.2 + f * 2.2; /* thin tail → thick head     */
        pCtx.stroke();
      }

      /* Bright head dot — comet tip */
      pCtx.beginPath();
      pCtx.arc(headPos.x, headPos.y, 2.0, 0, Math.PI * 2);
      pCtx.fillStyle = 'rgba(225,248,255,' + (alpha * 0.65).toFixed(3) + ')';
      pCtx.fill();
    }
  }
  requestAnimationFrame(trailFrame);

  /* ---- Helpers ---- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function easeInOut(t) {
    return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  }

  /* ---- Layout: all cards above the patch image ---- */
  function computeLayout() {
    uspSection.style.height = (TOTAL * VH_PER_USP + 300) + 'vh';
    /* Position card top edge just below the site header, well above sem1Bg */
    var hdr = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h')
    ) || 60;
    var cardTop = Math.max(hdr + 160, 220) + 'px';
    cards.forEach(function (card) {
      card.style.left   = '50%';
      card.style.right  = 'auto';
      card.style.top    = cardTop;
      card.style.bottom = 'auto';
      card.style.width  = 'clamp(280px, 34vw, 460px)';
    });
  }

  computeLayout();
  window.addEventListener('resize', computeLayout);

  window.PIXMAP = window.PIXMAP || {};
  window.PIXMAP.recomputeUspLayout = computeLayout;

  /* ---- Scroll update ---- */
  var ticking = false;

  function update() {
    ticking = false;

    var uspAnchor = (window.PIXMAP && window.PIXMAP.sem1ReadyScrollY != null)
      ? window.PIXMAP.sem1ReadyScrollY
      : null;

    if (uspAnchor === null) {
      if (uspSticky)  uspSticky.classList.remove('active');
      if (uspOverlay) { uspOverlay.style.opacity = '0'; uspOverlay.classList.remove('dimmed'); }
      if (uspProgress) uspProgress.classList.remove('visible');
      cards.forEach(function (c) { c.style.opacity = '0'; });
      highlights.forEach(function (h) { h.style.opacity = '0'; });
      trailPath = null;
      window.PIXMAP.uspPulseScale = 1;
      if (bgPatchFinal) bgPatchFinal.style.transform = '';
      hideMedia();
      return;
    }

    var uspRange = TOTAL * VH_PER_USP * window.innerHeight / 100;
    var raw      = (window.scrollY - uspAnchor - USP_START_OFFSET) / uspRange;
    var uspP     = clamp(raw, 0, 1);

    window.PIXMAP.uspCompleteScrollY = (raw >= 1.0)
      ? (window.PIXMAP.uspCompleteScrollY || window.scrollY)
      : null;

    if (raw < -0.02 || raw > 1.02) {
      if (uspSticky)  uspSticky.classList.remove('active');
      if (uspOverlay) { uspOverlay.style.opacity = '0'; uspOverlay.classList.remove('dimmed'); }
      if (uspProgress) uspProgress.classList.remove('visible');
      cards.forEach(function (c) { c.style.opacity = '0'; });
      highlights.forEach(function (h) { h.style.opacity = '0'; });
      trailPath = null;
      window.PIXMAP.uspPulseScale = 1;
      if (bgPatchFinal) bgPatchFinal.style.transform = '';
      hideMedia();
      return;
    }

    if (uspSticky) uspSticky.classList.add('active');

    var scaled    = uspP * TOTAL;
    var activeIdx = Math.min(Math.floor(scaled), TOTAL - 1);
    var stepT     = scaled - Math.floor(scaled);

    var inT     = easeInOut(clamp((stepT - 0.15) / 0.15, 0, 1));
    var outT    = easeInOut(clamp((stepT - 0.70) / 0.15, 0, 1));
    var cardVis = inT * (1 - outT);

    /* Cards */
    cards.forEach(function (card, i) {
      if (i !== activeIdx) {
        card.style.opacity   = '0';
        card.style.transform = 'translateX(-50%) scale(0.80)';
        return;
      }
      var popScale = (0.78 + inT * 0.22) * (1.0 - outT * 0.15);
      card.style.opacity   = cardVis.toFixed(3);
      card.style.transform = 'translateX(-50%) scale(' + popScale.toFixed(3) + ')';
    });

    /* Highlights */
    highlights.forEach(function (h, i) {
      h.style.opacity = (i === activeIdx) ? cardVis.toFixed(3) : '0';
    });

    /* Feature media — fades in centred BELOW the patch image for the
       active USP, anchored just under the patch (falls back to sem1). */
    if (mediaEls[activeIdx] && cardVis > 0.005) {
      mediaEls.forEach(function (img, i) {
        if (img) img.style.opacity = (i === activeIdx) ? cardVis.toFixed(3) : '0';
      });
      var anchorEl = (bgPatchFinal && bgPatchFinal.getBoundingClientRect().height > 10)
        ? bgPatchFinal : bgSem1;
      if (anchorEl) {
        var aRect = anchorEl.getBoundingClientRect();
        var topPx = Math.min(aRect.bottom + 18, window.innerHeight * 0.80);
        mediaWrap.style.top = topPx.toFixed(0) + 'px';
      }
    } else {
      hideMedia();
    }

    /* ================================================================
       PARTICLE TRAIL PATH
       1. Compute highlight centre in screen space.
       2. Find nearest card border point toward the highlight.
       3. Decide if the straight line crosses through the image body.
       4. If it does: arc the bezier control point ABOVE the image top.
       5. If not (large centre highlights): gentle midpoint curve.
    ================================================================ */
    var _customPaths = (window.PIXMAP && window.PIXMAP.uspConnectorPaths) || USP_CONNECTORS;
    if (bgSem1 && cardVis > 0.005 &&
        _customPaths && _customPaths[activeIdx] && _customPaths[activeIdx].length >= 2) {
      /* ── Custom straight-line polyline from the connector tool.
         Points are image-relative %, converted to screen space here. ── */
      var _sr = bgSem1.getBoundingClientRect();
      var _sp = _customPaths[activeIdx].map(function (p) {
        return { x: _sr.left + p.x / 100 * _sr.width, y: _sr.top + p.y / 100 * _sr.height };
      });
      trailPath = { id: activeIdx, pts: _sp, alpha: cardVis };
    } else if (bgSem1 && cardVis > 0.005) {
      var semRect = bgSem1.getBoundingClientRect();
      var hl      = USP_HL[activeIdx];

      /* Highlight centre in viewport coords */
      var hlCX = semRect.left + (hl.l + hl.w * 0.5) / 100 * semRect.width;
      var hlCY = semRect.top  + (hl.t + hl.h * 0.5) / 100 * semRect.height;

      /* Card bounding rect */
      var cardEl   = cards[activeIdx];
      var cardRect = cardEl.getBoundingClientRect();
      var cardCX   = (cardRect.left + cardRect.right)  / 2;
      var cardCY   = (cardRect.top  + cardRect.bottom) / 2;

      /* Direction vector from highlight centre toward card */
      var dxH  = cardCX - hlCX;
      var dyH  = cardCY - hlCY;
      var dist = Math.sqrt(dxH*dxH + dyH*dyH);

      if (dist < 50) {
        /* Highlight essentially on top of card — no trail */
        trailPath = null;
      } else {
        /* ── Border exit point on the highlight rectangle ──
           Cast a ray from the highlight centre toward the card and
           find where it crosses the highlight's own border.          */
        var hlHalfW = (hl.w / 100 * semRect.width)  / 2;
        var hlHalfH = (hl.h / 100 * semRect.height) / 2;
        var htx     = hlHalfW / (Math.abs(dxH) || 0.001);
        var hty     = hlHalfH / (Math.abs(dyH) || 0.001);
        var hte     = Math.min(htx, hty);
        var startX  = hlCX + dxH * hte;   /* point ON the highlight border */
        var startY  = hlCY + dyH * hte;

        /* ── Border entry point on the card ── */
        var dxC  = hlCX - cardCX;
        var dyC  = hlCY - cardCY;
        var cw   = cardRect.width  / 2;
        var ch   = cardRect.height / 2;
        var ctx_ = cw / (Math.abs(dxC) || 0.001);
        var cty  = ch / (Math.abs(dyC) || 0.001);
        var cte  = Math.min(ctx_, cty);
        var endX = cardCX + dxC * cte;
        var endY = cardCY + dyC * cte;

        /* Bezier control point — gentle bend based on highlight position */
        var imgW   = (semRect.right - semRect.left) || 1;
        var hlRelX = (hlCX - semRect.left) / imgW;
        var midX   = (startX + endX) * 0.5;
        var midY   = (startY + endY) * 0.5;
        var cp;

        if (hlRelX < 0.18) {
          cp = { x: midX - 55, y: midY };
        } else if (hlRelX > 0.82) {
          cp = { x: midX + 55, y: midY };
        } else {
          cp = { x: midX, y: midY - 28 };
        }

        trailPath = {
          id:    activeIdx,
          p0:    { x: startX, y: startY },  /* starts at highlight BORDER */
          cp:    cp,
          p1:    { x: endX,   y: endY   },
          alpha: cardVis
        };
      }
    } else {
      trailPath = null;
    }

    /* Pulse */
    var pulseVal = 1.0 - cardVis * 0.04;
    window.PIXMAP.uspPulseScale = pulseVal;
    if (bgPatchFinal) {
      bgPatchFinal.style.transform =
        'translateY(calc(-50% + 10px)) scale(' + (0.50 * pulseVal).toFixed(4) + ')';
    }

    if (uspOverlay) {
      uspOverlay.style.opacity = '0';
      uspOverlay.classList.remove('dimmed');
    }
    if (uspProgress) uspProgress.classList.remove('visible');
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  window.addEventListener('resize', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  });

  update();

}());
