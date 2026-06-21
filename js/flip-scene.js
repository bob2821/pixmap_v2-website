/* ============================================================
   POST-USP SCENE  — HYBRID

   FORWARD:  One scroll past anchor (raw > 0.30) fires an
             automated, time-based sequence that plays in full
             without any further scrolling needed:
             glow builds → particles orbit → icon1 flies from
             start pos → sem1/patch fade → words form one by one.

   REVERSE:  Scrolling BACK past the saved anchor position gives
             a scroll-driven reversal:  words hide → icon1 flies
             back → backgrounds fade in.  When far enough back,
             leave() releases control and USPs resume.

   RE-TRIGGER: leave() fully resets the state machine so the
               scene plays again the next time the user scrolls
               past the USP anchor.

   STATE MACHINE
   ─────────────
   IDLE      → watching for first trigger scroll
   ANIMATING → rAF loop runs the automated forward sequence
   COMPLETE  → everything visible; scroll back drives reversal
   ============================================================ */

(function () {
  'use strict';

  var sem1Bg     = document.getElementById('sem1Bg');
  var patchFinal = document.getElementById('patchFinal');
  var icon1El    = document.getElementById('icon1');
  var icon1Text  = document.getElementById('icon1Text');

  if (!sem1Bg) return;

  /* ── Helpers ─────────────────────────────────────────────── */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function eio(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
  function lerp(a, b, t) { return a + (b-a)*t; }
  function getStartPos() {
    return {
      x: parseFloat(localStorage.getItem('icon1StartX') || '-520'),
      y: parseFloat(localStorage.getItem('icon1StartY') || '280')
    };
  }

  /* ── Three.js small particle glow ───────────────────────── */
  var glowCanvas   = null;
  var glowRenderer = null;
  var glowScene    = null;
  var glowCamera   = null;
  var glowMat      = null;
  var glowInited   = false;
  var glowTime     = 0;
  var lastTs       = null;

  function initGlow() {
    if (glowInited || !window.THREE) return;
    glowInited = true;

    glowCanvas = document.createElement('canvas');
    glowCanvas.id = 'icon1GlowCanvas';
    glowCanvas.style.cssText =
      'position:fixed;left:0;top:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:492;opacity:0;';
    document.body.appendChild(glowCanvas);

    glowRenderer = new THREE.WebGLRenderer({ canvas: glowCanvas, alpha: true, antialias: false });
    glowRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    glowRenderer.setSize(window.innerWidth, window.innerHeight);
    glowRenderer.setClearColor(0x000000, 0);

    glowScene  = new THREE.Scene();
    glowCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    glowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest:   false,
      blending:    THREE.AdditiveBlending,
      uniforms: {
        uOrigin: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: 0.055 },   /* SMALL — compact particle glow */
        uTime:   { value: 0.0 },
        uAlpha:  { value: 0.0 },
        uRes:    { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: [
        'uniform vec2 uOrigin;uniform float uRadius,uTime,uAlpha;uniform vec2 uRes;',
        'void main(){',
        '  vec2 uv=gl_FragCoord.xy/uRes;float t=uTime;float r=uRadius;',
        /* Compact main orb */
        '  float d=distance(uv,uOrigin);',
        '  float core=pow(max(0.,1.-d/(r*0.25)),1.5);',
        '  float halo=pow(max(0.,1.-d/(r*2.5)),5.);',
        /* 4 orbiting micro-particles */
        '  float pr=r*0.62;float ps=r*0.14;float pts=0.;',
        '  pts+=pow(max(0.,1.-distance(uv,uOrigin+pr*vec2(cos(t*1.10),       sin(t*1.10))      )/ps),1.5)*(0.75+0.25*sin(t*4.0));',
        '  pts+=pow(max(0.,1.-distance(uv,uOrigin+pr*vec2(cos(t*0.80+2.09),  sin(t*0.80+2.09)) )/ps),1.5)*(0.70+0.30*sin(t*3.2+1.));',
        '  pts+=pow(max(0.,1.-distance(uv,uOrigin+pr*vec2(cos(t*1.30+4.19),  sin(t*1.30+4.19)) )/ps),1.5)*(0.80+0.20*sin(t*3.7+2.));',
        '  pts+=pow(max(0.,1.-distance(uv,uOrigin+pr*vec2(cos(t*0.90+1.05),  sin(t*0.90+1.05)) )/ps),1.5)*(0.65+0.35*sin(t*2.9+3.));',
        '  float g=(core*0.55+halo*0.15+pts*0.30)*(0.90+0.10*sin(t*2.8))*uAlpha;',
        '  vec3 col=mix(mix(vec3(0.10,0.25,0.70),vec3(0.27,0.69,0.90),min(1.,halo*3.)),vec3(0.88,0.98,1.0),core);',
        '  gl_FragColor=vec4(col*g,g*0.90);',
        '}'
      ].join('')
    });

    glowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMat));

    window.addEventListener('resize', function () {
      if (!glowRenderer) return;
      glowRenderer.setSize(window.innerWidth, window.innerHeight);
      glowMat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
    });
  }

  function renderGlow(alpha) {
    if (!glowInited || !glowMat || !glowCanvas) return;
    if (alpha > 0.005) {
      glowCanvas.style.opacity = '1';
      glowMat.uniforms.uAlpha.value = alpha;
      glowMat.uniforms.uTime.value  = glowTime;
      glowRenderer.render(glowScene, glowCamera);
    } else {
      glowCanvas.style.opacity = '0';
    }
  }

  /* ── Word spans ──────────────────────────────────────────── */
  var wordSpans  = [];
  var textInited = false;

  function initText() {
    if (textInited || !icon1Text) return;
    textInited = true;

    var sentence = icon1Text.textContent.replace(/\s+/g, ' ').trim();
    icon1Text.innerHTML = '';
    wordSpans = [];

    sentence.split(' ').forEach(function (w, i, arr) {
      if (!w) return;
      var s = document.createElement('span');
      s.textContent = w;
      s.style.cssText =
        'display:inline-block;opacity:0;filter:blur(5px);transform:translateY(9px);' +
        'transition:opacity 0.22s ease,filter 0.22s ease,transform 0.22s ease;' +
        'margin-right:' + (i < arr.length - 1 ? '0.32em' : '0') + ';';
      icon1Text.appendChild(s);
      wordSpans.push(s);
    });
  }

  function showWords(count) {
    if (!icon1Text) return;
    var n = Math.max(0, Math.min(wordSpans.length, Math.round(count)));
    icon1Text.style.visibility = n > 0 ? 'visible' : 'hidden';
    icon1Text.style.opacity    = '1';
    icon1Text.style.transform  = 'translateX(-50%)';
    wordSpans.forEach(function (s, i) {
      var on = i < n;
      s.style.opacity   = on ? '1'          : '0';
      s.style.filter    = on ? 'blur(0px)'  : 'blur(5px)';
      s.style.transform = on ? 'translateY(0px)' : 'translateY(9px)';
    });
  }

  /* ── State ───────────────────────────────────────────────── */
  var STATE       = 'IDLE';   /* IDLE | ANIMATING | COMPLETE */
  var savedAnchor = null;     /* snapshot of uspCompleteScrollY at trigger */
  var seqT0       = null;     /* performance.now() at sequence start */

  /* Forward sequence timing (seconds from trigger) */
  var S = {
    GLOW_IN:    0.35,   /* glow finishes fading in     */
    GLOW_HOLD:  1.05,   /* glow starts fading out      */
    GLOW_OUT:   1.50,   /* glow fully gone             */
    ICON_SHOW:  0.20,   /* icon1 starts appearing at start pos */
    FLY_START:  1.50,   /* icon1 begins flying to centre */
    FLY_DUR:    1.25,   /* flight duration             */
    BG_START:   1.60,   /* sem1+patch start fading out */
    BG_DUR:     1.00,
    TEXT_START: 2.85,   /* first word appears          */
    TEXT_STEP:  0.072   /* seconds between words       */
  };

  function seqTotalDuration() {
    return S.TEXT_START + Math.max(1, wordSpans.length) * S.TEXT_STEP + 0.4;
  }

  /* ── Leave: full reset ───────────────────────────────────── */
  function leave() {
    if (!window.PIXMAP || !window.PIXMAP.netActive) return;
    window.PIXMAP.netActive = false;

    if (window.PIXMAP._savedPE) {
      window.PIXMAP.setPatchExit = window.PIXMAP._savedPE;
      delete window.PIXMAP._savedPE;
    }

    STATE = 'IDLE'; savedAnchor = null; seqT0 = null;

    sem1Bg.style.opacity    = '';
    sem1Bg.style.visibility = '';
    if (patchFinal) { patchFinal.style.opacity = ''; patchFinal.style.visibility = ''; }
    if (icon1El)    { icon1El.style.opacity = ''; icon1El.style.visibility = ''; icon1El.style.transform = ''; }
    if (icon1Text)  { icon1Text.style.opacity = ''; icon1Text.style.visibility = ''; icon1Text.style.transform = ''; }
    if (glowCanvas) glowCanvas.style.opacity = '0';

    wordSpans.forEach(function (s) {
      s.style.opacity   = '0';
      s.style.filter    = 'blur(5px)';
      s.style.transform = 'translateY(9px)';
    });
  }

  /* ── Complete visual state ──────────────────────────────── */
  function setComplete() {
    sem1Bg.style.visibility = 'hidden'; sem1Bg.style.opacity = '0';
    if (patchFinal) { patchFinal.style.visibility = 'hidden'; patchFinal.style.opacity = '0'; }
    if (icon1El) {
      icon1El.style.visibility = 'visible';
      icon1El.style.opacity    = '1';
      icon1El.style.transform  = 'translate(-50%,-50%) scale(1)';
    }
    showWords(wordSpans.length);
    renderGlow(0);
  }

  /* ── Scroll-driven reversal ──────────────────────────────── */
  /* backRaw = (savedAnchor - scrollY) / innerHeight
     0   → fully complete state
     ~1.1 → about to call leave() */
  function doReversal(backRaw) {
    var sp = getStartPos();

    /* Words: hide last→first as backRaw 0 → 0.28 */
    var wordT = 1.0 - eio(clamp(backRaw / 0.28, 0, 1));
    showWords(wordT * wordSpans.length);

    /* icon1: flies back, backRaw 0.20 → 0.80 */
    var flyT   = eio(clamp((backRaw - 0.20) / 0.60, 0, 1));
    var iconOp = clamp(1.0 - eio(clamp((backRaw - 0.75) / 0.20, 0, 1)), 0, 1);
    if (icon1El) {
      var ix  = lerp(0, sp.x, flyT);
      var iy  = lerp(0, sp.y, flyT);
      var isc = lerp(1.0, 0.4, flyT);
      icon1El.style.visibility = iconOp > 0.005 ? 'visible' : 'hidden';
      icon1El.style.opacity    = iconOp.toFixed(3);
      icon1El.style.transform  =
        'translate(calc(-50% + ' + ix.toFixed(1) + 'px),' +
        'calc(-50% + ' + iy.toFixed(1) + 'px)) scale(' + isc.toFixed(4) + ')';
    }

    /* Backgrounds: fade back in, backRaw 0.65 → 1.05 */
    var bgT = eio(clamp((backRaw - 0.65) / 0.40, 0, 1));
    sem1Bg.style.visibility = bgT > 0.005 ? 'visible' : 'hidden';
    sem1Bg.style.opacity    = bgT.toFixed(3);
    if (patchFinal) {
      patchFinal.style.visibility = bgT > 0.005 ? 'visible' : 'hidden';
      patchFinal.style.opacity    = bgT.toFixed(3);
    }

    renderGlow(0);
  }

  /* ── rAF loop: drives ANIMATING sequence + keeps glow ticking */
  function frame(ts) {
    requestAnimationFrame(frame);
    if (lastTs !== null) glowTime += (ts - lastTs) / 1000;
    lastTs = ts;

    /* Keep glow pulsing when visible (COMPLETE state, edge case) */
    if (STATE !== 'ANIMATING') {
      if (glowInited && glowMat && glowCanvas && glowCanvas.style.opacity !== '0') {
        glowMat.uniforms.uTime.value = glowTime;
        glowRenderer.render(glowScene, glowCamera);
      }
      return;
    }

    if (!seqT0) return;

    /* Emergency bail: anchor cleared while animating */
    var liveAnchor = window.PIXMAP && window.PIXMAP.uspCompleteScrollY;
    if (!liveAnchor && savedAnchor && window.scrollY < savedAnchor - 60) {
      leave(); return;
    }

    var elapsed = (ts - seqT0) / 1000;
    var sp = getStartPos();
    window.PIXMAP.netActive = true;

    /* ── Glow ──────────────────────────────────────────────── */
    var gAlpha;
    if      (elapsed < S.GLOW_IN)   { gAlpha = eio(elapsed / S.GLOW_IN); }
    else if (elapsed < S.GLOW_HOLD) { gAlpha = 1.0; }
    else if (elapsed < S.GLOW_OUT)  { gAlpha = 1.0 - eio((elapsed - S.GLOW_HOLD) / (S.GLOW_OUT - S.GLOW_HOLD)); }
    else                             { gAlpha = 0; }
    renderGlow(clamp(gAlpha, 0, 1));

    /* ── icon1: appears at start pos during glow, then flies ─ */
    var appearT   = eio(clamp((elapsed - S.ICON_SHOW) / 0.45, 0, 1));
    var flyElapsed = elapsed - S.FLY_START;
    var flyT       = flyElapsed < 0 ? 0 : eio(clamp(flyElapsed / S.FLY_DUR, 0, 1));
    var iop        = flyElapsed < 0 ? appearT : 1.0;
    if (icon1El) {
      var ix  = lerp(sp.x, 0, flyT);
      var iy  = lerp(sp.y, 0, flyT);
      var isc = lerp(0.4, 1.0, flyT);
      icon1El.style.visibility = iop > 0.005 ? 'visible' : 'hidden';
      icon1El.style.opacity    = iop.toFixed(3);
      icon1El.style.transform  =
        'translate(calc(-50% + ' + ix.toFixed(1) + 'px),' +
        'calc(-50% + ' + iy.toFixed(1) + 'px)) scale(' + isc.toFixed(4) + ')';
    }

    /* ── Backgrounds fade out ─────────────────────────────── */
    var bgElapsed = elapsed - S.BG_START;
    var bgOp = bgElapsed < 0 ? 1.0 : clamp(1.0 - eio(bgElapsed / S.BG_DUR), 0, 1);
    sem1Bg.style.visibility = bgOp > 0.005 ? 'visible' : 'hidden';
    sem1Bg.style.opacity    = bgOp.toFixed(3);
    if (patchFinal) {
      patchFinal.style.visibility = bgOp > 0.005 ? 'visible' : 'hidden';
      patchFinal.style.opacity    = bgOp.toFixed(3);
    }

    /* ── Words: time-staggered reveal ────────────────────── */
    var textElapsed = elapsed - S.TEXT_START;
    if (textElapsed > 0 && wordSpans.length) {
      var toShow = Math.min(wordSpans.length, Math.ceil(textElapsed / S.TEXT_STEP));
      showWords(toShow);
    } else if (icon1Text) {
      icon1Text.style.visibility = 'hidden';
    }

    /* ── Sequence complete? ──────────────────────────────── */
    if (elapsed >= seqTotalDuration()) {
      STATE = 'COMPLETE';
      setComplete();
    }
  }
  requestAnimationFrame(frame);

  /* ── Scroll listener ────────────────────────────────────── */
  window.addEventListener('scroll', function () {
    var anchor = window.PIXMAP && window.PIXMAP.uspCompleteScrollY;

    /* ── IDLE: watch for trigger ───────────────────────── */
    if (STATE === 'IDLE') {
      if (!anchor) return;
      if ((window.scrollY - anchor) / window.innerHeight < 0.30) return;

      /* TRIGGER */
      savedAnchor = anchor;
      seqT0       = performance.now();
      STATE       = 'ANIMATING';

      window.PIXMAP = window.PIXMAP || {};
      window.PIXMAP.netActive = true;

      if (window.PIXMAP.setPatchExit && !window.PIXMAP._savedPE) {
        window.PIXMAP._savedPE    = window.PIXMAP.setPatchExit;
        window.PIXMAP.setPatchExit = function () {};
      }

      initGlow(); initText();

      /* Pin glow origin to icon1 start position */
      var sp = getStartPos();
      if (glowMat) {
        glowMat.uniforms.uOrigin.value.set(
          0.5 + sp.x / window.innerWidth,
          0.5 - sp.y / window.innerHeight
        );
      }
      return;
    }

    /* ── ANIMATING: emergency bail only ───────────────── */
    if (STATE === 'ANIMATING') {
      if (!anchor && savedAnchor && window.scrollY < savedAnchor - 60) {
        leave();
      }
      return;
    }

    /* ── COMPLETE: scroll-based reversal ─────────────── */
    if (STATE === 'COMPLETE') {
      window.PIXMAP = window.PIXMAP || {};
      window.PIXMAP.netActive = true;

      if (!savedAnchor) { leave(); return; }

      /* How far the user has scrolled BACK past the saved anchor */
      var dist = savedAnchor - window.scrollY;  /* positive = scrolled back */

      if (dist > window.innerHeight * 1.10) {
        /* Far enough back — release to USPs */
        leave(); return;
      }

      if (dist > 0) {
        /* Scroll-driven reversal */
        doReversal(dist / window.innerHeight);
      } else {
        /* Still forward of anchor — maintain complete state */
        setComplete();
      }
    }
  }, { passive: true });

  window.addEventListener('resize', function () {
    /* Re-pin glow origin on resize */
    if (glowMat && savedAnchor) {
      var sp = getStartPos();
      glowMat.uniforms.uOrigin.value.set(
        0.5 + sp.x / window.innerWidth,
        0.5 - sp.y / window.innerHeight
      );
    }
  });

}());
