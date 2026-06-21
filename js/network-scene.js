(function () {
  'use strict';

  var section   = document.getElementById('netSection');
  var sticky    = document.getElementById('netSticky');
  var copyEl    = document.getElementById('netCopy');
  var sentence  = document.getElementById('netSentence');
  var netCanvas = document.getElementById('netCanvas');
  var sem1Bg    = document.getElementById('sem1Bg');
  var patchFinal= document.getElementById('patchFinal');

  if (!section || !sticky || !netCanvas) return;

  var ctx = netCanvas.getContext('2d');

  /* ── Utility ──────────────────────────────────────────── */
  function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)); }
  function remap(v, a, b)    { return clamp((v - a) / (b - a), 0, 1); }
  function smooth(t)         { return t * t * (3 - 2 * t); }

  /* ── Word-by-word spans ───────────────────────────────── */
  var words = sentence.textContent.trim().split(/\s+/);
  sentence.innerHTML = words.map(function (w) {
    return '<span class="net-word">' + w + '</span>';
  }).join(' ');
  var wordSpans = Array.prototype.slice.call(sentence.querySelectorAll('.net-word'));

  /* ── State ────────────────────────────────────────────── */
  var sem1SavedOpacity = null;
  var patchSavedOpacity = null;
  var wiringBuilt = false;
  var paths = [];

  /* ── Build wiring paths (relative fractions, resolved at draw time) */
  function buildPaths(W, H) {
    var cx = W / 2, cy = H / 2;
    // Each path: array of {x,y} waypoints using orthogonal segments
    // All paths converge on/near centre
    return [
      // Left edge → centre (upper)
      [{ x: 0, y: H*0.28 }, { x: W*0.22, y: H*0.28 }, { x: W*0.22, y: cy }, { x: cx-18, y: cy }],
      // Left edge → centre (lower)
      [{ x: 0, y: H*0.68 }, { x: W*0.18, y: H*0.68 }, { x: W*0.18, y: cy+18 }, { x: cx, y: cy+18 }],
      // Top edge → centre (left)
      [{ x: W*0.28, y: 0 }, { x: W*0.28, y: H*0.22 }, { x: cx, y: H*0.22 }, { x: cx, y: cy-18 }],
      // Top edge → centre (right)
      [{ x: W*0.72, y: 0 }, { x: W*0.72, y: H*0.20 }, { x: cx+18, y: H*0.20 }, { x: cx+18, y: cy }],
      // Right edge → centre (upper)
      [{ x: W, y: H*0.32 }, { x: W*0.78, y: H*0.32 }, { x: W*0.78, y: cy }, { x: cx+20, y: cy }],
      // Right edge → centre (lower)
      [{ x: W, y: H*0.70 }, { x: W*0.82, y: H*0.70 }, { x: W*0.82, y: cy+18 }, { x: cx, y: cy+18 }],
      // Bottom edge → centre (left)
      [{ x: W*0.30, y: H }, { x: W*0.30, y: H*0.78 }, { x: cx-18, y: H*0.78 }, { x: cx-18, y: cy+10 }],
      // Bottom edge → centre (right)
      [{ x: W*0.68, y: H }, { x: W*0.68, y: H*0.76 }, { x: cx+10, y: H*0.76 }, { x: cx+10, y: cy }],
    ];
  }

  /* ── Draw a partially-drawn multi-segment path ──────── */
  function drawPathAt(pts, progress) {
    if (progress <= 0) return;
    // Compute total length
    var totalLen = 0;
    var segs = [];
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i].x - pts[i-1].x;
      var dy = pts[i].y - pts[i-1].y;
      var len = Math.sqrt(dx*dx + dy*dy);
      segs.push(len);
      totalLen += len;
    }
    var drawLen = progress * totalLen;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    var cum = 0;
    for (var j = 0; j < segs.length; j++) {
      var segEnd = pts[j + 1];
      var segSt  = pts[j];
      if (cum + segs[j] <= drawLen) {
        ctx.lineTo(segEnd.x, segEnd.y);
        cum += segs[j];
      } else {
        var t = (drawLen - cum) / segs[j];
        ctx.lineTo(segSt.x + (segEnd.x - segSt.x) * t,
                   segSt.y + (segEnd.y - segSt.y) * t);
        break;
      }
    }
    ctx.stroke();
    // Draw dot at start
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── Draw hub glow at centre ─────────────────────────── */
  function drawHub(W, H, alpha) {
    if (alpha <= 0) return;
    var cx = W / 2, cy = H / 2;
    // Outer glow
    var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 38);
    grd.addColorStop(0,   'rgba(100,200,255,' + (alpha * 0.55) + ')');
    grd.addColorStop(0.4, 'rgba(40,120,255,'  + (alpha * 0.28) + ')');
    grd.addColorStop(1,   'rgba(20,60,200,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fill();
    // Core dot
    ctx.fillStyle = 'rgba(180,230,255,' + alpha + ')';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Ring
    ctx.strokeStyle = 'rgba(100,190,255,' + (alpha * 0.7) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ── Main draw call ──────────────────────────────────── */
  function drawWiring(wireP) {
    var W = netCanvas.width, H = netCanvas.height;
    ctx.clearRect(0, 0, W, H);
    if (wireP <= 0) return;

    if (!wiringBuilt) {
      paths = buildPaths(W, H);
      wiringBuilt = true;
    }

    var N = paths.length;
    // Stagger: path i starts at i/(N+2) and ends at (i+3)/(N+2)
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;

    for (var i = 0; i < N; i++) {
      var startP = i / (N + 2);
      var endP   = (i + 3) / (N + 2);
      var pathP  = smooth(remap(wireP, startP, endP));

      // Line colour: bright cyan-blue
      var a = pathP * 0.85;
      ctx.strokeStyle = 'rgba(80,185,255,' + a + ')';
      ctx.fillStyle   = 'rgba(120,210,255,' + a + ')';
      drawPathAt(paths[i], pathP);
    }

    // Hub glows in once most paths are drawn
    drawHub(W, H, smooth(remap(wireP, 0.7, 1.0)));
  }

  /* ── Resize canvas ───────────────────────────────────── */
  function resizeCanvas() {
    netCanvas.width  = window.innerWidth;
    netCanvas.height = window.innerHeight;
    wiringBuilt = false; // rebuild paths on next draw
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  /* ── Scroll update ───────────────────────────────────── */
  var ticking = false;

  function update() {
    ticking = false;

    var sTop = section.getBoundingClientRect().top + window.scrollY;
    var sH   = section.offsetHeight;
    var raw  = (window.scrollY - sTop) / (sH - window.innerHeight);
    var p    = clamp(raw, 0, 1);

    /* Before section */
    if (raw < -0.02) {
      sticky.classList.remove('active');
      window.PIXMAP = window.PIXMAP || {};
      window.PIXMAP.netActive = false;
      // Restore sem1 / patchFinal opacity if we touched them
      if (sem1SavedOpacity !== null && sem1Bg) {
        sem1Bg.style.opacity   = sem1SavedOpacity;
        sem1SavedOpacity = null;
      }
      if (patchSavedOpacity !== null && patchFinal) {
        patchFinal.style.opacity = patchSavedOpacity;
        patchSavedOpacity = null;
      }
      wordSpans.forEach(function (s) { s.classList.remove('visible'); });
      ctx.clearRect(0, 0, netCanvas.width, netCanvas.height);
      return;
    }

    sticky.classList.add('active');
    window.PIXMAP = window.PIXMAP || {};
    window.PIXMAP.netActive = true;

    /* Capture initial states once */
    if (sem1SavedOpacity === null && sem1Bg) {
      sem1SavedOpacity  = sem1Bg.style.opacity  || '1';
    }
    if (patchSavedOpacity === null && patchFinal) {
      patchSavedOpacity = patchFinal.style.opacity || '1';
    }

    /* ── Phase 1 (0→0.15): flip sem1 + patch away ──────── */
    var flipP = smooth(remap(p, 0, 0.15));
    if (sem1Bg)    sem1Bg.style.opacity    = (1 - flipP).toFixed(3);
    if (patchFinal) patchFinal.style.opacity = (1 - flipP).toFixed(3);

    /* ── Phase 2–4: cinematic text ──────────────────────── */
    var textAlpha = smooth(remap(p, 0.18, 0.36)) * (1 - smooth(remap(p, 0.64, 0.76)));
    copyEl.style.opacity = textAlpha.toFixed(3);

    // Word-by-word reveal mapped to text-in phase (0.18→0.38)
    var wordP = remap(p, 0.18, 0.42);
    wordSpans.forEach(function (span, i) {
      var threshold = i / wordSpans.length;
      if (wordP >= threshold) span.classList.add('visible');
      else                    span.classList.remove('visible');
    });

    /* ── Phase 5 (0.76→1.0): network wiring ─────────────── */
    var wireP = remap(p, 0.76, 1.0);
    drawWiring(wireP);

    /* After section */
    if (raw > 1.02) {
      sticky.classList.remove('active');
      window.PIXMAP = window.PIXMAP || {};
      window.PIXMAP.netActive = false;
    }
  }

  function onScroll() {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    wiringBuilt = false;
    update();
  });
  update();
}());
