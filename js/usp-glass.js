/* ============================================================
   USP GLASS — Fluid simulation gradient, WebGL procedural
   Double domain-warp sine field creates organic moving blobs
   of light blue + dark blue on a frosted glass panel.
   Canvas inside #uspCards at z:1, behind cards at z:2.
   ============================================================ */
(function () {
  'use strict';

  var VS = [
    'attribute vec2 a_pos;',
    'attribute vec2 a_uv;',
    'varying   vec2 v_uv;',
    'void main(){gl_Position=vec4(a_pos,0.0,1.0);v_uv=a_uv;}',
  ].join('\n');

  var FS = [
    'precision highp float;',
    'varying vec2  v_uv;',
    'uniform float u_alpha;',
    'uniform float u_radius;',
    'uniform float u_aspect;',
    'uniform float u_time;',

    /* ── SDF rounded rect ──────────────────────────────────── */
    'float rBox(vec2 uv,float r,float asp){',
    '  vec2 p=(uv-0.5)*vec2(asp,1.0);',
    '  vec2 b=vec2(asp*0.5-r,0.5-r);',
    '  vec2 q=abs(p)-b;',
    '  return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;',
    '}',

    /* ── Domain warp — twists coordinates organically ──────── */
    'vec2 warp(vec2 p,float t){',
    '  return p+0.20*vec2(',
    '    sin(p.y*2.50+t*0.37)*cos(p.x*1.80+t*0.28),',
    '    cos(p.x*2.90+t*0.44)*sin(p.y*2.10+t*0.32)',
    '  );',
    '}',

    'void main(){',
    '  vec2 uv=v_uv;',

    /* corner mask */
    '  float sdf=rBox(uv,u_radius,u_aspect);',
    '  float mask=1.0-smoothstep(-0.010,0.010,sdf);',
    '  if(mask<0.01)discard;',

    /* ── FLUID FIELD — double-warped sine lattice ──────────── */
    '  float t=u_time*0.18;',          /* very slow drift */
    '  vec2 p=uv;',
    '  p=warp(p,t);',                  /* first warp pass */
    '  p=warp(p,t*0.60+1.57);',        /* second warp pass — offset phase */

    '  float v=0.0;',
    '  v+=sin(p.x*3.10+t*0.52)*0.5+0.5;',
    '  v+=sin(p.y*4.20+t*0.40)*0.5+0.5;',
    '  v+=sin((p.x+p.y)*2.70+t*0.45)*0.5+0.5;',
    '  v+=sin((p.x-p.y)*2.20+t*0.34)*0.5+0.5;',
    '  v/=4.0;',                        /* 0..1 fluid scalar */

    /* ── Colour mapping: dark navy ↔ sky blue ──────────────── */
    '  vec3 darkBlue =vec3(0.03,0.07,0.38);',
    '  vec3 lightBlue=vec3(0.28,0.62,1.00);',
    '  vec3 midBlue  =vec3(0.08,0.22,0.65);',

    '  vec3 c=mix(darkBlue,lightBlue,v);',
    /* mid-tone at peaks and troughs for richer palette */
    '  c=mix(c,midBlue,sin(v*3.14159)*0.40);',

    /* ── Glass surface effects ─────────────────────────────── */
    /* top-face specular */
    '  float sy=pow(max(0.0,1.0-uv.y),4.5);',
    '  float sx=max(0.0,1.0-abs(uv.x-0.5)*2.3);',
    '  c+=sy*sx*sx*0.55*vec3(0.80,0.93,1.00);',

    /* edge Fresnel rim */
    '  float eD=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));',
    '  float eB=1.0-smoothstep(0.0,0.11,eD);',
    '  c+=eB*vec3(0.35,0.65,1.00)*0.38;',

    /* top rim hairline */
    '  float rY=pow(max(0.0,1.0-uv.y*20.0),3.0);',
    '  float rX=max(0.0,1.0-abs(uv.x-0.5)*3.5);',
    '  c+=rY*rX*0.60*vec3(0.70,0.88,1.00);',

    '  c=clamp(c,0.0,1.0);',
    '  gl_FragColor=vec4(c,u_alpha*0.84*mask);',
    '}',
  ].join('\n');

  /* ── Shader compile ─────────────────────────────────────── */
  function mkShader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[usp-glass]', gl.getShaderInfoLog(s)); return null;
    }
    return s;
  }

  /* ── Wait for #uspCards DOM node ────────────────────────── */
  function waitForContainer() {
    var c = document.getElementById('uspCards');
    if (!c) { requestAnimationFrame(waitForContainer); return; }
    init(c);
  }

  function init(container) {
    var canvas = document.createElement('canvas');
    canvas.id = 'uspGlassCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute', top: '0', left: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '1',
    });
    container.insertBefore(canvas, container.firstChild);

    var gl = canvas.getContext('webgl', {
      alpha: true, premultipliedAlpha: false, antialias: false,
    });
    if (!gl) { canvas.remove(); return; }

    var vs = mkShader(gl, gl.VERTEX_SHADER,   VS);
    var fs = mkShader(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[usp-glass] link:', gl.getProgramInfoLog(prog)); return;
    }

    var loc = {
      a_pos:    gl.getAttribLocation(prog,  'a_pos'),
      a_uv:     gl.getAttribLocation(prog,  'a_uv'),
      u_alpha:  gl.getUniformLocation(prog, 'u_alpha'),
      u_radius: gl.getUniformLocation(prog, 'u_radius'),
      u_aspect: gl.getUniformLocation(prog, 'u_aspect'),
      u_time:   gl.getUniformLocation(prog, 'u_time'),
    };

    var posBuf = gl.createBuffer();
    var uvBuf  = gl.createBuffer();
    var t0     = performance.now();

    function drawQuad(cr, dpr) {
      var W = canvas.width, H = canvas.height;
      var cl  =  cr.left              * dpr / W * 2 - 1;
      var cR  = (cr.left + cr.width)  * dpr / W * 2 - 1;
      var ct  = 1 -  cr.top              * dpr / H * 2;
      var cb  = 1 - (cr.top  + cr.height)* dpr / H * 2;

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        cl,ct, cR,ct, cl,cb, cl,cb, cR,ct, cR,cb,
      ]), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.a_pos);
      gl.vertexAttribPointer(loc.a_pos, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0,0, 1,0, 0,1, 0,1, 1,0, 1,1,
      ]), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc.a_uv);
      gl.vertexAttribPointer(loc.a_uv, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    var RADIUS_PX = 12;

    function render() {
      requestAnimationFrame(render);

      var dpr  = Math.min(window.devicePixelRatio || 1, 2);
      var newW = Math.round(window.innerWidth  * dpr);
      var newH = Math.round(window.innerHeight * dpr);
      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW; canvas.height = newH;
        gl.viewport(0, 0, newW, newH);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      var cards = container.querySelectorAll('.usp-card');
      if (!cards.length) return;

      var anyVis = false;
      for (var i = 0; i < cards.length; i++) {
        if (parseFloat(cards[i].style.opacity || '0') > 0.005) { anyVis = true; break; }
      }
      if (!anyVis) return;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog);
      gl.uniform1f(loc.u_time, (performance.now() - t0) * 0.001);

      for (var j = 0; j < cards.length; j++) {
        var card  = cards[j];
        var alpha = parseFloat(card.style.opacity || '0');
        if (alpha < 0.005) continue;
        var cr = card.getBoundingClientRect();
        if (cr.width < 4 || cr.height < 4) continue;
        gl.uniform1f(loc.u_alpha,  alpha);
        gl.uniform1f(loc.u_radius, RADIUS_PX / cr.height);
        gl.uniform1f(loc.u_aspect, cr.width  / cr.height);
        drawQuad(cr, dpr);
      }
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForContainer);
  } else {
    waitForContainer();
  }
}());
