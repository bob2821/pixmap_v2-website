/* ============================================================
   OP1 SCENE — full narrative sequence

   ANIMATED (auto on trigger):
     sem1+patch fade → sentence A → op1 tile assembly + glow

   COMPLETE scroll ranges from op1AsmScrollY (all in vph):
     0.00–0.60  op1 glass panels float, glow ON
     0.60–0.90  op1 panels slide up, glow fades OFF
     0.60–1.60  op1→op2 flip (glow returns at 1.10 when op2 face visible)
     1.60–1.90  dark overlay + sentence B fade in
     1.90–2.50  sentence B holds
     2.50–2.80  sentence B + overlay fade out
     2.80–3.40  op2 glass panels float
     3.40–3.70  op2 panels slide up
     3.70–4.10  op1Scene (op2 image) fades out, glow off
     4.10–4.50  final overlay + sentence C + Download button fade in
     4.50–5.20  final content holds
     5.20–5.60  final content fades out → footer
   ============================================================ */

(function () {
  'use strict';

  var sem1Bg    = document.getElementById('sem1Bg');
  var patchFin  = document.getElementById('patchFinal');
  var op1Scene  = document.getElementById('op1Scene');
  var op1Grid   = document.getElementById('op1TileGrid');
  var op1Img    = document.getElementById('op1Seamless');
  var op1TextEl = document.getElementById('op1Text');
  var finalCta  = document.getElementById('finalCta');

  if (!sem1Bg || !op1Scene || !op1Grid) return;

  /* Safety: reveal #finalCta whenever it scrolls into view, so the footer
     section can never be left hidden if the sequence didn't latch. */
  if (finalCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) finalCta.classList.add('revealed'); });
    }, { threshold: 0.01 }).observe(finalCta);
  }

  /* ── Helpers ──────────────────────────────────────────────── */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function eio(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

  /* uspSection height is managed by usp-scene.js */

  /* ── Tile grid (16 × 9 = 144 tiles) ──────────────────────── */
  var COLS = 16, ROWS = 9, NT = COLS * ROWS;
  var SCATTER = 72;
  var tiles = [], tileSX = [], tileSY = [], tileDelay = [];
  var cCol = (COLS-1)/2, cRow = (ROWS-1)/2;
  /* Elliptical wave distance — faster horizontal spread, same as patch_stage */
  var maxD = Math.sqrt(cCol*cCol*0.70 + cRow*cRow*2.0);
  var WAVE_DUR = 0.85, DELAY_RANGE = 0.45, TILE_TOTAL = WAVE_DUR + DELAY_RANGE;

  for (var ti = 0; ti < NT; ti++) {
    var col  = ti % COLS, row = Math.floor(ti / COLS);
    var tile = document.createElement('div');
    tile.className = 'op1-tile';
    tile.style.backgroundPosition =
      (col / (COLS-1) * 100).toFixed(3) + '% ' +
      (row / (ROWS-1) * 100).toFixed(3) + '%';
    op1Grid.appendChild(tile);
    tiles.push(tile);
    var dx = col-cCol, dy = row-cRow, d = Math.sqrt(dx*dx*0.70 + dy*dy*2.0);
    tileSX.push(0);   /* scatter removed — patch_stage uses scale-pop only */
    tileSY.push(0);
    tileDelay.push(d/maxD*DELAY_RANGE);
  }

  function setTiles(elapsed) {
    for (var i = 0; i < NT; i++) {
      /* easeOutExpo — matches patch_stage's cubic-bezier(0.16,1,0.3,1) pop */
      var raw = clamp((elapsed - tileDelay[i]) / WAVE_DUR, 0, 1);
      var t   = raw >= 1 ? 1 : 1 - Math.pow(2, -10 * raw);
      tiles[i].style.opacity   = t.toFixed(3);
      /* scale-pop 0.28 → 1.0, no translate — identical to .pr-tile */
      tiles[i].style.transform = 'scale(' + (0.28 + t * 0.72).toFixed(3) + ')';
    }
  }

  /* ── Flip wrapper: front = op1, back = op2 ────────────────── */
  var op1FlipWrap = document.createElement('div');
  op1FlipWrap.id  = 'op1FlipWrap';

  var op1Front = document.createElement('div');
  op1Front.className = 'op1-face op1-front';
  op1Front.appendChild(op1Grid);
  op1Front.appendChild(op1Img);

  var op1Back = document.createElement('div');
  op1Back.className = 'op1-face op1-back';
  var op2El = document.createElement('img');
  op2El.src = 'assets/images/op2.png'; op2El.alt = '';
  op1Back.appendChild(op2El);

  op1FlipWrap.appendChild(op1Front);
  op1FlipWrap.appendChild(op1Back);
  op1Scene.appendChild(op1FlipWrap);

  /* ── Glass panel group factory ────────────────────────────── */
  var PANEL_ROW_TOPS = [0.14, 0.42, 0.70];

  function createGroup(data) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:495;visibility:hidden;';
    document.body.appendChild(wrap);
    var panels = [];
    data.forEach(function (p, i) {
      var el = document.createElement('div');
      el.className = 'op1-panel';
      
      var inner = document.createElement('div');
      inner.className = 'op1-panel-inner op1-float-' + i;
      inner.innerHTML =
        '<p class="op1-panel-title">' + p.title + '</p>' +
        '<p class="op1-panel-desc">'  + p.desc  + '</p>';
      
      el.appendChild(inner);
      wrap.appendChild(el);
      panels.push(el);
    });
    return { wrap: wrap, panels: panels };
  }

  function layoutGroup(g) {
    var vh = window.innerHeight, edge = 'clamp(28px,3vw,52px)', w = 'clamp(190px,17vw,260px)';
    g.panels.forEach(function (el, i) {
      var isLeft = i < 3, ri = isLeft ? i : i - 3;
      el.style.top = (vh * PANEL_ROW_TOPS[ri]).toFixed(0) + 'px';
      el.style.width = w; el.style.bottom = 'auto';
      if (isLeft) { el.style.left = edge; el.style.right = 'auto'; }
      else        { el.style.right = edge; el.style.left  = 'auto'; }
    });
  }

  function showGroup(g) {
    g.wrap.style.visibility = 'visible';
    g.panels.forEach(function (el) { el.classList.add('visible'); el.style.opacity=''; el.style.transform=''; });
  }

  function hideGroup(g) {
    g.panels.forEach(function (el) { el.classList.remove('visible'); el.style.opacity=''; el.style.transform=''; });
    g.wrap.style.visibility = 'hidden';
  }

  function slideGroup(g, pT) {
    var pOp = 1 - pT, slideY = -(pT * 55).toFixed(0);
    g.wrap.style.visibility = pOp > 0.01 ? 'visible' : 'hidden';
    g.panels.forEach(function (el) {
      el.classList.add('visible');
      el.style.opacity   = pOp.toFixed(3);
      el.style.transform = 'translateY(' + slideY + 'px)';
    });
  }

  /* ── Panel data ───────────────────────────────────────────── */
  var OP1_PANELS = [
    { title: 'Advanced Output Structuring',  desc: 'Organizes complex LED layouts into clean, output-ready sections.' },
    { title: 'Precise Slice Management',     desc: 'Helps manage individual screen slices with accurate placement and alignment.' },
    { title: 'Pixel-Perfect Output Control', desc: 'Maintains exact size, scale, and positioning across LED sections.' },
    { title: 'Faster Output Preparation',   desc: 'Reduces manual time needed to arrange complex output layouts.' },
    { title: 'Clean Section Organization',  desc: 'Keeps multiple LED parts, screens, and segments easy to identify and manage.' },
    { title: 'Production-Ready Deployment', desc: 'Prepares LED output structures for smoother real-world execution.' }
  ];

  var OP2_PANELS = [
    { title: 'Automatic Wiring Generation',             desc: 'Automatically creates clean LED wiring paths, reducing manual connection effort and setup complexity.' },
    { title: 'Port Capacity Calculation',               desc: 'Calculates how many panels or pixels each port can safely handle for better output planning.' },
    { title: 'Bit Rate & Frame Rate Visibility',        desc: 'Allows teams to view technical output values like bit rate and frame rate for accurate performance monitoring.' },
    { title: 'Custom Processor Selection',              desc: 'Lets users select the required LED processor based on the project\'s technical and production needs.' },
    { title: 'Processor Load & Signal Stability',       desc: 'Helps balance processor load, avoid overload, control signal loss, and maintain stable LED performance during deployment.' },
    { title: 'Detailed PDF Documentation',              desc: 'Generates a complete wiring document with connection details, processor data, and output planning for on-site execution.' }
  ];

  var op1Group = createGroup(OP1_PANELS);
  var op2Group = createGroup(OP2_PANELS);
  layoutGroup(op1Group); layoutGroup(op2Group);
  window.addEventListener('resize', function () { layoutGroup(op1Group); layoutGroup(op2Group); });

  /* ── Mouse parallax for floating panels ──────────────────── */
  var prlxTargX = 0, prlxTargY = 0, prlxX = 0, prlxY = 0;
  var PRLX_MAX  = 14; /* max px offset at screen edge */

  document.addEventListener('mousemove', function (e) {
    prlxTargX = (e.clientX / window.innerWidth  - 0.5) * PRLX_MAX * 2;
    prlxTargY = (e.clientY / window.innerHeight - 0.5) * PRLX_MAX * 2;
  }, { passive: true });

  (function prlxFrame() {
    requestAnimationFrame(prlxFrame);
    prlxX += (prlxTargX - prlxX) * 0.08;
    prlxY += (prlxTargY - prlxY) * 0.08;
    var tx = 'translate(' + prlxX.toFixed(2) + 'px,' + prlxY.toFixed(2) + 'px)';
    if (op1Group.wrap.style.visibility === 'visible') op1Group.wrap.style.transform = tx;
    if (op2Group.wrap.style.visibility === 'visible') op2Group.wrap.style.transform = tx;
  }());
  /* ────────────────────────────────────────────────────────── */

  /* ── Overlay + sentences + final wrap ────────────────────── */
  var op1Overlay = document.createElement('div');
  op1Overlay.id = 'op1Overlay';
  document.body.appendChild(op1Overlay);

  var op1SentB = document.createElement('p');
  op1SentB.id = 'op1SentB';
  op1SentB.textContent =
    "And that’s not all, PIXMAP also brings intelligent LED wiring " +
    "and connection mapping into the workflow.";
  document.body.appendChild(op1SentB);

  /* ── DOM setters ──────────────────────────────────────────── */
  function setOverlay(op) {
    op1Overlay.style.visibility = op > 0.005 ? 'visible' : 'hidden';
    op1Overlay.style.opacity    = op.toFixed(3);
  }
  function setSentB(op) {
    op1SentB.style.visibility = op > 0.005 ? 'visible' : 'hidden';
    op1SentB.style.opacity    = op.toFixed(3);
  }

  /* ── Word spans (sentence A, pre-assembly) ────────────────── */
  var wordSpans = [], textInited = false;

  function initText() {
    if (textInited || !op1TextEl) return;
    textInited = true;
    var sentence = op1TextEl.textContent.replace(/\s+/g, ' ').trim();
    op1TextEl.innerHTML = ''; wordSpans = [];
    sentence.split(' ').forEach(function (w, i, arr) {
      if (!w) return;
      var s = document.createElement('span');
      s.textContent = w;
      s.style.cssText =
        'display:inline-block;opacity:0;filter:blur(6px);transform:translateY(10px);' +
        'transition:opacity 0.26s ease,filter 0.26s ease,transform 0.26s ease;' +
        'margin-right:' + (i < arr.length-1 ? '0.34em' : '0') + ';';
      op1TextEl.appendChild(s);
      wordSpans.push(s);
    });
  }

  function showWords(count) {
    if (!op1TextEl || !wordSpans.length) return;
    var n = clamp(Math.round(count), 0, wordSpans.length);
    op1TextEl.style.visibility = 'visible';
    wordSpans.forEach(function (s, i) {
      var on = i < n;
      s.style.opacity   = on ? '1' : '0';
      s.style.filter    = on ? 'blur(0px)' : 'blur(6px)';
      s.style.transform = on ? 'translateY(0)' : 'translateY(10px)';
    });
  }

  function hideText() {
    if (!op1TextEl) return;
    op1TextEl.style.visibility = 'hidden'; op1TextEl.style.opacity = '1';
    wordSpans.forEach(function (s) {
      s.style.opacity = '0'; s.style.filter = 'blur(6px)'; s.style.transform = 'translateY(10px)';
    });
  }

  /* ── Second sentence (op1SentB) — same word-by-word blur reveal ── */
  var wordSpansB = [], textBInited = false;

  function initTextB() {
    if (textBInited || !op1SentB) return;
    textBInited = true;
    var sentence = op1SentB.textContent.replace(/\s+/g, ' ').trim();
    op1SentB.innerHTML = ''; wordSpansB = [];
    sentence.split(' ').forEach(function (w, i, arr) {
      if (!w) return;
      var s = document.createElement('span');
      s.textContent = w;
      s.style.cssText =
        'display:inline-block;opacity:0;filter:blur(6px);transform:translateY(10px);' +
        'transition:opacity 0.26s ease,filter 0.26s ease,transform 0.26s ease;' +
        'margin-right:' + (i < arr.length-1 ? '0.34em' : '0') + ';';
      op1SentB.appendChild(s);
      wordSpansB.push(s);
    });
  }

  function showWordsB(count) {
    if (!op1SentB || !wordSpansB.length) return;
    var n = clamp(Math.round(count), 0, wordSpansB.length);
    op1SentB.style.visibility = 'visible';
    wordSpansB.forEach(function (s, i) {
      var on = i < n;
      s.style.opacity   = on ? '1' : '0';
      s.style.filter    = on ? 'blur(0px)' : 'blur(6px)';
      s.style.transform = on ? 'translateY(0)' : 'translateY(10px)';
    });
  }

  function hideTextB() {
    if (!op1SentB) return;
    op1SentB.style.visibility = 'hidden'; op1SentB.style.opacity = '1';
    wordSpansB.forEach(function (s) {
      s.style.opacity = '0'; s.style.filter = 'blur(6px)'; s.style.transform = 'translateY(10px)';
    });
  }

  /* ── Sequence timing ──────────────────────────────────────── */
  var S = { BG_OUT:0.55, TEXT_START:0.45, TEXT_STEP:0.095, TEXT_HOLD:2.00, TEXT_FADE:0.55, OP1_GAP:0.20 };
  function textDoneAt()  { return S.TEXT_START + wordSpans.length * S.TEXT_STEP; }
  function fadeStartAt() { return textDoneAt()  + S.TEXT_HOLD; }
  function fadeEndAt()   { return fadeStartAt() + S.TEXT_FADE; }
  function op1StartAt()  { return fadeEndAt()   + S.OP1_GAP; }
  function seqDoneAt()   { return op1StartAt()  + TILE_TOTAL + 0.20; }

  /* ── State ────────────────────────────────────────────────── */
  var STATE = 'IDLE', savedAnchor = null, op1AsmScrollY = null, seqT0 = null;
  var sentBStartT = null, sentBScrollY = null, postBAnchor = null;

  /* ── rAF loop ─────────────────────────────────────────────── */
  function frame(ts) {
    requestAnimationFrame(frame);
    
    if (STATE === 'ANIMATING' && seqT0) {
      var el = (ts - seqT0) / 1000;

      var bgOp = 1 - eio(clamp(el / S.BG_OUT, 0, 1));
      sem1Bg.style.opacity = bgOp.toFixed(3); sem1Bg.style.visibility = bgOp > 0.005 ? 'visible' : 'hidden';
      if (patchFin) { patchFin.style.opacity = bgOp.toFixed(3); patchFin.style.visibility = bgOp > 0.005 ? 'visible' : 'hidden'; }

      var textEl = el - S.TEXT_START;
      if (textEl >= 0 && wordSpans.length) {
        showWords(textEl / S.TEXT_STEP);
        var fadeEl = el - fadeStartAt();
        if (fadeEl < 0) { op1TextEl.style.opacity = '1'; }
        else {
          var fo = 1 - eio(clamp(fadeEl / S.TEXT_FADE, 0, 1));
          op1TextEl.style.opacity = fo.toFixed(3);
          if (fo < 0.005) op1TextEl.style.visibility = 'hidden';
        }
      }

      var op1El = el - op1StartAt();
      if (op1El > 0) {
        op1Scene.style.visibility = 'visible'; op1Scene.style.opacity = '1';
        setTiles(op1El);
        var imgT = eio(clamp((op1El - TILE_TOTAL*0.70) / (TILE_TOTAL*0.30), 0, 1));
        if (op1Img) op1Img.style.opacity = imgT.toFixed(3);
      }

      if (el >= seqDoneAt()) {
        sem1Bg.style.opacity = '0'; sem1Bg.style.visibility = 'hidden';
        if (patchFin) { patchFin.style.opacity = '0'; patchFin.style.visibility = 'hidden'; }
        if (op1TextEl) { op1TextEl.style.opacity = '0'; op1TextEl.style.visibility = 'hidden'; }
        setTiles(TILE_TOTAL + 1);
        if (op1Img) op1Img.style.opacity = '1';
        op1Scene.style.opacity = '1'; op1Scene.style.visibility = 'visible';
        op1FlipWrap.style.transform = 'rotateX(0deg)';
        op1Scene.classList.add('glow-active');
        STATE = 'COMPLETE'; op1AsmScrollY = window.scrollY; seqT0 = null;
        window.PIXMAP = window.PIXMAP || {}; window.PIXMAP.netActive = true;
      }
    }
    
    if (STATE === 'SENT_B_PLAYING' && sentBStartT) {
      var elAuto = (ts - sentBStartT) / 1000;

      /* Word-by-word blur reveal — same treatment as the first sentence */
      initTextB();
      var STEP_B    = S.TEXT_STEP;                       /* 0.095s per word  */
      var revealDur = wordSpansB.length * STEP_B;
      var durHold   = 3.00;
      var durOut    = S.TEXT_FADE;                       /* 0.55s block fade */
      var totalDur  = revealDur + durHold + durOut;
      var ovIn      = Math.min(revealDur, 0.60);

      var sbOp;     /* drives overlay dim + block fade-out */
      if (elAuto < revealDur) {
        showWordsB(elAuto / STEP_B);
        op1SentB.style.visibility = 'visible';
        op1SentB.style.opacity    = '1';
        sbOp = eio(clamp(elAuto / ovIn, 0, 1));
      } else if (elAuto < revealDur + durHold) {
        showWordsB(wordSpansB.length);
        op1SentB.style.visibility = 'visible';
        op1SentB.style.opacity    = '1';
        sbOp = 1.0;
      } else if (elAuto < totalDur) {
        showWordsB(wordSpansB.length);
        sbOp = 1.0 - eio((elAuto - (revealDur + durHold)) / durOut);
        op1SentB.style.opacity = sbOp.toFixed(3);
      } else {
        sbOp = 0;
      }

      setOverlay(sbOp);

      op1FlipWrap.style.transform = 'rotateX(180deg)';
      op1Scene.classList.add('glow-active');
      
      if (sentBScrollY !== null) {
        window.scrollTo(0, sentBScrollY);
      }
      
      if (elAuto >= totalDur) {
        setOverlay(0);
        setSentB(0);
        hideTextB();
        STATE = 'POST_B';
        postBAnchor = window.scrollY;
        sentBStartT = null;
      }
    }
  }
  requestAnimationFrame(frame);

  /* ── leave ────────────────────────────────────────────────── */
  function leave() {
    STATE = 'IDLE'; savedAnchor = null; op1AsmScrollY = null; seqT0 = null;
    sentBStartT = null; sentBScrollY = null; postBAnchor = null;
    op1Scene.classList.remove('glow-active');
    op1Scene.style.opacity = '0'; op1Scene.style.visibility = 'hidden';
    op1Scene.style.transform = '';
    if (op1Img) op1Img.style.opacity = '0';
    op1FlipWrap.style.transform = '';
    setTiles(-1);
    sem1Bg.style.opacity = ''; sem1Bg.style.visibility = '';
    if (patchFin) { patchFin.style.opacity = ''; patchFin.style.visibility = ''; }
    if (window.PIXMAP) {
      window.PIXMAP.netActive = false;
      if (window.PIXMAP._op1SavedPE) { window.PIXMAP.setPatchExit = window.PIXMAP._op1SavedPE; delete window.PIXMAP._op1SavedPE; }
    }
    hideGroup(op1Group); hideGroup(op2Group);
    setOverlay(0); setSentB(0);
    if (window.PIXMAP) { window.PIXMAP._postBExitDone = false; }
    hideText(); hideTextB();
  }

  /* ── Reversal ─────────────────────────────────────────────── */
  function doReversal(backRaw) {
    hideGroup(op1Group); hideGroup(op2Group);
    op1FlipWrap.style.transform = 'rotateX(0deg)';
    setOverlay(0); setSentB(0); hideTextB();
    var op1T = eio(clamp(backRaw / 0.32, 0, 1));
    setTiles(TILE_TOTAL * (1 - op1T));
    if (op1Img) op1Img.style.opacity = (1 - op1T).toFixed(3);
    var op1Op = 1 - op1T;
    op1Scene.style.opacity = op1Op.toFixed(3); op1Scene.style.visibility = op1Op > 0.005 ? 'visible' : 'hidden';
    /* keep glow until op1 has mostly faded — wider threshold prevents flicker */
    if (op1T < 0.5) op1Scene.classList.add('glow-active');
    else            op1Scene.classList.remove('glow-active');
    var bgIn = eio(clamp((backRaw - 0.15) / 0.40, 0, 1));
    sem1Bg.style.opacity = bgIn.toFixed(3); sem1Bg.style.visibility = bgIn > 0.005 ? 'visible' : 'hidden';
    if (patchFin) { patchFin.style.opacity = bgIn.toFixed(3); patchFin.style.visibility = bgIn > 0.005 ? 'visible' : 'hidden'; }
  }

  /* ── Scroll listener ──────────────────────────────────────── */
  window.addEventListener('scroll', function () {
    var anchor = window.PIXMAP && window.PIXMAP.uspCompleteScrollY;

    if (STATE === 'IDLE') {
      if (!anchor) return;
      if ((window.scrollY - anchor) / window.innerHeight < 0.20) return;
      savedAnchor = anchor; seqT0 = performance.now(); STATE = 'ANIMATING';
      window.PIXMAP = window.PIXMAP || {}; window.PIXMAP.netActive = true;
      if (window.PIXMAP.setPatchExit && !window.PIXMAP._op1SavedPE) {
        window.PIXMAP._op1SavedPE = window.PIXMAP.setPatchExit;
        window.PIXMAP.setPatchExit = function () {};
      }
      initText(); return;
    }

    if (STATE === 'ANIMATING') {
      window.PIXMAP = window.PIXMAP || {}; window.PIXMAP.netActive = true;
      /* Abort animation immediately if user scrolls back past the trigger point */
      if (savedAnchor && window.scrollY < savedAnchor + 60) {
        if (op1TextEl) { op1TextEl.style.visibility = 'hidden'; op1TextEl.style.opacity = '0'; }
        leave();
      }
      return;
    }

    if (STATE === 'SENT_B_PLAYING') {
      /* Viewport is pinned by the rAF frame loop (single writer) — avoid a
         second scrollTo here so scroll events don't fight the rAF (smoother). */
      return;
    }

    if (STATE === 'COMPLETE') {
      window.PIXMAP = window.PIXMAP || {};
      if (!savedAnchor) { leave(); return; }

      var vh        = window.innerHeight;
      var asmAnchor = op1AsmScrollY || savedAnchor;
      var fwd       = window.scrollY - asmAnchor;

      if (fwd > 0) {

        /* ── Range constants ──────────────────────────────────────
           0.00–0.60  op1 panels drift up
           0.60–1.20  op1 panels scroll up and exit
           1.20–2.00  op1 → op2 flip (completed at 2.00)
        ─────────────────────────────────────────────────────────── */
        var P1_DRIFT   = 0.60 * vh;
        var P1_EXIT    = P1_DRIFT + 0.60 * vh;   /* 1.20 vph */
        var FL_START   = P1_EXIT;                 /* 1.20 vph */
        var FL_DUR     = 0.80 * vh;
        var FL_END     = FL_START + FL_DUR;        /* 2.00 vph */

        /* Once flip completes, trigger sentence B auto-sequence */
        if (fwd >= FL_END) {
          STATE = 'SENT_B_PLAYING';
          sentBScrollY = window.scrollY;
          sentBStartT = performance.now();
          op1FlipWrap.style.transform = 'rotateX(180deg)';
          op1Scene.classList.add('glow-active');
          return;
        }

        window.PIXMAP.netActive = true;

        /* ── op1Scene — fixed position ── */
        op1Scene.style.visibility = 'visible';
        op1Scene.style.opacity    = '1';
        op1Scene.style.transform  = '';
        setTiles(TILE_TOTAL + 1);
        if (op1Img) op1Img.style.opacity = '1';
        sem1Bg.style.opacity = '0'; sem1Bg.style.visibility = 'hidden';
        if (patchFin) { patchFin.style.opacity = '0'; patchFin.style.visibility = 'hidden'; }

        /* ── op1 panels: drift up, then scroll up and exit ────── */
        if (fwd < P1_EXIT) {
          var p1DriftT = clamp(fwd / P1_DRIFT, 0, 1);
          var p1MoveY  = -(p1DriftT * 32) - (fwd > P1_DRIFT ? fwd - P1_DRIFT : 0);
          op1Group.wrap.style.visibility = 'visible';
          
          var op1Op = 1;
          if (fwd < 120) {
            op1Op = clamp(fwd / 120, 0, 1);
          } else if (fwd > P1_DRIFT) {
            op1Op = clamp(1 - (fwd - P1_DRIFT) / 150, 0, 1);
          }
          
          op1Group.panels.forEach(function (el) {
            el.classList.add('visible');
            el.style.opacity   = op1Op.toFixed(3);
            el.style.transform = 'translateY(' + p1MoveY.toFixed(0) + 'px)';
          });
        } else {
          hideGroup(op1Group);
        }

        /* ── Glow: active only before drift ends, and off during flip ── */
        var showGlow = fwd < P1_DRIFT;
        if (showGlow) op1Scene.classList.add('glow-active');
        else          op1Scene.classList.remove('glow-active');

        /* ── Flip: starts only after op1 panels are fully gone ── */
        var flipT = eio(clamp((fwd - FL_START) / FL_DUR, 0, 1));
        op1FlipWrap.style.transform = 'rotateX(' + (flipT * 180).toFixed(2) + 'deg)';

        /* Hide sentence B and op2 panels during this phase */
        setOverlay(0); setSentB(0);
        hideGroup(op2Group);

      } else {
        /* Backward past asmAnchor */
        window.PIXMAP.netActive = true;
        hideGroup(op1Group); hideGroup(op2Group);
        op1FlipWrap.style.transform = 'rotateX(0deg)';
        setOverlay(0); setSentB(0);

        var back = (savedAnchor - window.scrollY) / vh;
        if (back > 0.65) { leave(); return; }
        if (back > 0) {
          doReversal(back);
        } else {
          setTiles(TILE_TOTAL + 1);
          if (op1Img) op1Img.style.opacity = '1';
          op1Scene.style.opacity = '1'; op1Scene.style.visibility = 'visible';
          op1Scene.style.transform = '';  /* clear any scroll-up translateY from POST_B */
          op1Scene.classList.add('glow-active');
          op1FlipWrap.style.transform = 'rotateX(0deg)';
          sem1Bg.style.opacity = '0'; sem1Bg.style.visibility = 'hidden';
          if (patchFin) { patchFin.style.opacity = '0'; patchFin.style.visibility = 'hidden'; }
        }
      }
    }

    if (STATE === 'POST_B') {
      window.PIXMAP = window.PIXMAP || {};
      var vh = window.innerHeight;
      var fwd = window.scrollY - postBAnchor;

      if (fwd < 0) {
        if (window.PIXMAP) window.PIXMAP._postBExitDone = false;
        if (finalCta) finalCta.classList.remove('revealed');
        STATE = 'COMPLETE';
        var asmAnchor = op1AsmScrollY || savedAnchor;
        window.scrollTo(0, asmAnchor + 2.00 * vh - 10);
        return;
      }

      /* ── Post-B → footer ─────────────────────────────────────
         A SINGLE op2 image: its panels drift, then the image scrolls
         straight up with the page. The instant it has fully cleared the
         top, #finalCta (final sentence + Download button) flows in, then
         the footer. Latched so the overlay never returns over the footer.
      ─────────────────────────────────────────────────────────── */
      var P2_DRIFT = 0.55 * vh;        /* op2 panels drift window */

      window.PIXMAP.netActive = true;

      /* Already handed off to the footer — keep the overlay gone (no overlap). */
      if (window.PIXMAP._postBExitDone) {
        op1Scene.style.opacity = '0'; op1Scene.style.visibility = 'hidden';
        op1Scene.style.transform = '';
        op1Scene.classList.remove('glow-active');
        hideGroup(op1Group); hideGroup(op2Group);
        setOverlay(0); setSentB(0);
        sem1Bg.style.opacity = '0'; sem1Bg.style.visibility = 'hidden';
        if (patchFin) { patchFin.style.opacity = '0'; patchFin.style.visibility = 'hidden'; }
        return;
      }

      /* op2 image visible; after the panels drift it scrolls straight up 1:1 */
      var up = fwd > P2_DRIFT ? (fwd - P2_DRIFT) : 0;
      op1Scene.style.visibility = 'visible';
      op1Scene.style.opacity    = '1';
      op1Scene.style.transform  = up > 0
        ? 'translateX(-50%) translateY(calc(-50% - ' + up.toFixed(0) + 'px))'
        : '';
      setTiles(TILE_TOTAL + 1);
      if (op1Img) op1Img.style.opacity = '1';
      sem1Bg.style.opacity = '0'; sem1Bg.style.visibility = 'hidden';
      if (patchFin) { patchFin.style.opacity = '0'; patchFin.style.visibility = 'hidden'; }
      op1FlipWrap.style.transform = 'rotateX(180deg)';
      op1Scene.classList.add('glow-active');

      /* op2 panels: drift up, then ride up with the image and fade */
      var op2DriftT = clamp(fwd / P2_DRIFT, 0, 1);
      var op2MoveY  = -(op2DriftT * 32) - up;
      op2Group.wrap.style.visibility = 'visible';
      var op2Op = fwd < 120
        ? clamp(fwd / 120, 0, 1)
        : (up > 0 ? clamp(1 - up / 150, 0, 1) : 1);
      op2Group.panels.forEach(function (el) {
        el.classList.add('visible');
        el.style.opacity   = op2Op.toFixed(3);
        el.style.transform = 'translateY(' + op2MoveY.toFixed(0) + 'px)';
      });
      hideGroup(op1Group);
      setOverlay(0); setSentB(0);

      /* Once the op2 image has fully scrolled off the top → reveal footer */
      if (up > 0 && op1Scene.getBoundingClientRect().bottom <= 0) {
        window.PIXMAP._postBExitDone = true;
        op1Scene.style.opacity = '0'; op1Scene.style.visibility = 'hidden';
        op1Scene.classList.remove('glow-active');
        hideGroup(op2Group);
        var uspSticky = document.getElementById('uspSticky');
        if (uspSticky) uspSticky.classList.remove('active');
        var sec = document.getElementById('uspSection');
        if (sec) sec.style.height = (window.scrollY - sec.offsetTop + 4) + 'px';
        if (finalCta) finalCta.classList.add('revealed');
      }

    }
  }, { passive: true });

}());
