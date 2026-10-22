/*
  The landing page artwork, "Life-like 3D" (chosen 2026-10-22): the power path as a small real-time landscape model, drawn with three.js 0.149
  (UMD global THREE, loaded before this file). Implements window.DEM_ART (the interface page.js documents).
  - Procedural equipment at believable proportions: a combined-cycle gas plant, lattice towers, a transmission
    substation, a hyperscale campus on its own tap, a wood-pole feeder and a small data center.
  - Geometry is merged per part and per material (vertex colors); every conductor shares one shader that
    draws the stringing front, the gold current and its traveling head.
  - The canvas is transparent: the ground fades out around the camera target and distance fogs into the page
    wash, so the model sits on the drawing sheet without a box.
  - Renders on demand, stops offscreen. Without WebGL it draws the shared isometric scene (window.ISOKIT).
  Generic illustration only: no labels, figures, logos or real places.
*/
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }
  function now() { return performance.now(); }
  var STATS = /[?&]stats3d\b/.test(location.search);

  /* ================================================================== capability */

  var glOK = null;
  function canGL() {
    if (glOK !== null) return glOK;
    glOK = false;
    if (!window.THREE || /[?&]gl=0\b/.test(location.search)) return glOK;
    try {
      var c = document.createElement('canvas');
      var ctx = c.getContext('webgl2') || c.getContext('webgl');
      glOK = !!ctx;
      var lose = ctx && ctx.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) { glOK = false; }
    return glOK;
  }

  /* ================================================================== palette (sRGB) */

  var COL = {
    field: 0xc4c5b2, gravel: 0xd6d2cc, concrete: 0xdedbd6, asphalt: 0xa4a1a8,
    panel: 0xebe8ee, roof: 0xdedae2, clad: 0xcdc8d3, casing: 0xaaa4b1, stack: 0xc9c4cd,
    steel: 0xaeb1b6, steelDark: 0x7f828a, tank: 0x8f929a, tankDark: 0x787b83, wood: 0x6e5a48,
    ins: 0x4b3f53, glass: 0x5d5466, rtu: 0xcfccd3, fan: 0x5f5866, gen: 0xdcd9e0, white: 0xf3f1f5,
    trunk: 0x6b5d52, door: 0x9d97a4, cond: 0x3d3346, alu: 0xbfc2c8, trench: 0xb7b2ab,
    gold: 0xEBBE07, hot: 0xFFE98A, ink: 0x312439, wash: 0xf7f5f9
  };
  var TREE_TONES = [0x76805f, 0x6d7859, 0x808866, 0x687257, 0x858a6c];
  var FIELD_TONES = ['#c4c5b2', '#cdcabb', '#b9bda7', '#c9c9b6', '#bfc2ad', '#d0ccbe'];

  /* ================================================================== three.js scene kit */

  var T = null;            // THREE, bound on first use
  var UNIT = {};
  var tmp = {};
  function bindThree() {
    if (T) return;
    T = window.THREE;
    if (T.ColorManagement) T.ColorManagement.legacyMode = false;
    tmp = { m: new T.Matrix4(), nm: new T.Matrix3(), v: new T.Vector3(), n: new T.Vector3(), q: new T.Quaternion(),
      s: new T.Vector3(), p: new T.Vector3(), a: new T.Vector3(), b: new T.Vector3(), d: new T.Vector3(),
      c: new T.Color(), up: new T.Vector3(0, 1, 0) };
  }
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  function raw(hex) { return new T.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255); }
  function unitBox() { return UNIT.box || (UNIT.box = new T.BoxGeometry(1, 1, 1).toNonIndexed()); }
  function unitCyl(seg, ratio) {
    var k = 'c' + seg + '_' + ratio;
    return UNIT[k] || (UNIT[k] = new T.CylinderGeometry(ratio, 1, 1, seg, 1, false).toNonIndexed());
  }

  /* Geometry accumulator: every primitive is transformed into world space and appended to one bucket per
     material class, with its color baked into a vertex attribute. flush() turns the buckets into meshes. */
  function Builder() { this.bk = {}; this.M = new T.Matrix4(); this.stack = []; }
  Builder.prototype.bucket = function (cls) { return this.bk[cls] || (this.bk[cls] = { p: [], n: [], c: [], u: [] }); };
  Builder.prototype.geo = function (cls, g, local, color, uvf) {
    var m = tmp.m.multiplyMatrices(this.M, local);
    tmp.nm.getNormalMatrix(m);
    var B = this.bucket(cls), pos = g.attributes.position.array, nor = g.attributes.normal.array,
      uvs = g.attributes.uv ? g.attributes.uv.array : null, v = tmp.v, n = tmp.n, c = tmp.c.setHex(color);
    for (var i = 0, len = pos.length / 3; i < len; i++) {
      v.fromArray(pos, i * 3).applyMatrix4(m);
      n.fromArray(nor, i * 3).applyMatrix3(tmp.nm).normalize();
      B.p.push(v.x, v.y, v.z); B.n.push(n.x, n.y, n.z); B.c.push(c.r, c.g, c.b);
      if (uvf) { var w = uvf(i, v, uvs); B.u.push(w[0], w[1]); } else B.u.push(0, 0);
    }
  };
  /* Box with its base at y. */
  Builder.prototype.box = function (cls, color, x, y, z, w, h, d, ry) {
    var local = new T.Matrix4().compose(tmp.p.set(x, y + h / 2, z), tmp.q.setFromAxisAngle(tmp.up, ry || 0), tmp.s.set(w, h, d));
    var uvf = null;
    if (cls === 'panel') {
      uvf = function (i, v, uvs) {
        var f = (i / 6) | 0, span = f < 2 ? d : w;
        return [uvs[i * 2] * span / 6, f === 2 || f === 3 ? 0.9 : uvs[i * 2 + 1]];
      };
    } else if (cls === 'gravel') uvf = function (i, v) { return [v.x / 5, v.z / 5]; };
    this.geo(cls, unitBox(), local, color, uvf);
  };
  /* Vertical cylinder with its base at y; ratio is top radius over bottom radius. */
  Builder.prototype.cyl = function (cls, color, x, y, z, r, h, seg, ratio) {
    var local = new T.Matrix4().compose(tmp.p.set(x, y + h / 2, z), tmp.q.identity(), tmp.s.set(r, h, r));
    this.geo(cls, unitCyl(seg || 12, ratio === undefined ? 1 : ratio), local, color);
  };
  /* A member between two points: square section (beam) or round (rod). t is the side or the radius. */
  Builder.prototype.link = function (cls, color, a, b, t, round, seg) {
    var A = tmp.a.set(a[0], a[1], a[2]), Bv = tmp.b.set(b[0], b[1], b[2]);
    var d = tmp.d.subVectors(Bv, A), len = d.length();
    if (len < 1e-4) return;
    var local = new T.Matrix4().compose(tmp.p.addVectors(A, Bv).multiplyScalar(0.5), tmp.q.setFromUnitVectors(tmp.up, d.divideScalar(len)), tmp.s.set(t, len, t));
    this.geo(cls, round ? unitCyl(seg || 6, 1) : unitBox(), local, color);
  };
  /* Runs fn in a local frame: translated and turned about y. */
  Builder.prototype.at = function (x, y, z, ry, fn) {
    this.stack.push(this.M.clone());
    this.M.multiply(new T.Matrix4().compose(V(x, y, z), new T.Quaternion().setFromAxisAngle(tmp.up, ry || 0), V(1, 1, 1)));
    var r = fn.call(this, this);
    this.M.copy(this.stack.pop());
    return r;
  };
  /* Local point to world. */
  Builder.prototype.w = function (x, y, z) { return V(x, y, z).applyMatrix4(this.M); };
  Builder.prototype.flush = function (mats, parent) {
    var self = this;
    Object.keys(this.bk).forEach(function (cls) {
      var B = self.bk[cls];
      if (!B.p.length) return;
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(B.n, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(B.c, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(B.u, 2));
      g.computeBoundingSphere();
      var mesh = new T.Mesh(g, mats[cls]);
      mesh.castShadow = cls !== 'fence' && cls !== 'flat';
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    });
    this.bk = {};
  };

  /* ---------------------------------------------------------------- textures (authored on canvas) */

  function canvasTex(w, h, draw, wrapS, wrapT) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 8;
    t.wrapS = wrapS || T.ClampToEdgeWrapping;
    t.wrapT = wrapT || T.ClampToEdgeWrapping;
    return t;
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeTextures() {
    /* Precast wall panels: a joint every 3 m, a faint reveal, and contact darkening at the base. */
    var panel = canvasTex(256, 128, function (g, w, h) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      [0, 128].forEach(function (x) {
        g.fillStyle = 'rgba(58,44,68,.17)'; g.fillRect(x, 0, 2, h);
        g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 2, 0, 1, h);
      });
      g.fillStyle = 'rgba(58,44,68,.06)'; g.fillRect(0, Math.round(h * 0.38), w, 1);
      var gr = g.createLinearGradient(0, h, 0, h * 0.72);
      gr.addColorStop(0, 'rgba(60,44,72,.30)'); gr.addColorStop(1, 'rgba(60,44,72,0)');
      g.fillStyle = gr; g.fillRect(0, h * 0.72, w, h * 0.28);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 0, w, 2);
    }, T.RepeatWrapping, T.ClampToEdgeWrapping);
    var r = rng(7);
    var gravel = canvasTex(128, 128, function (g, w, h) {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) {
        var l = Math.round(196 + r() * 59);
        g.fillStyle = 'rgba(' + (l - 6) + ',' + (l - 8) + ',' + l + ',.9)';
        g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
      }
    }, T.RepeatWrapping, T.RepeatWrapping);
    return { panel: panel, gravel: gravel };
  }

  /* Farmland under the model: field parcels with soft hedgerow seams, in muted sage tones. */
  var GROUND = { cx: 220, cz: -300, size: 5600 };
  function fieldGrid() {
    var r = rng(11), xs = [], zs = [], x = GROUND.cx - GROUND.size / 2, z = GROUND.cz - GROUND.size / 2;
    while (x < GROUND.cx + GROUND.size / 2) { xs.push(x); x += 230 + r() * 260; }
    while (z < GROUND.cz + GROUND.size / 2) { zs.push(z); z += 210 + r() * 240; }
    return { xs: xs, zs: zs };
  }
  function groundTexture(grid) {
    var r = rng(23), S = 1024, k = S / GROUND.size, x0 = GROUND.cx - GROUND.size / 2, z0 = GROUND.cz - GROUND.size / 2;
    return canvasTex(S, S, function (g) {
      g.fillStyle = FIELD_TONES[0]; g.fillRect(0, 0, S, S);
      for (var i = 0; i < grid.xs.length; i++) {
        for (var j = 0; j < grid.zs.length; j++) {
          var ax = (grid.xs[i] - x0) * k, az = (grid.zs[j] - z0) * k;
          var bx = ((grid.xs[i + 1] || GROUND.cx + GROUND.size / 2) - x0) * k, bz = ((grid.zs[j + 1] || GROUND.cz + GROUND.size / 2) - z0) * k;
          g.fillStyle = FIELD_TONES[Math.floor(r() * FIELD_TONES.length)];
          g.fillRect(ax + 1, az + 1, bx - ax - 2, bz - az - 2);
          if (r() < 0.45) {
            /* Crop rows, faint. */
            g.save(); g.beginPath(); g.rect(ax + 1, az + 1, bx - ax - 2, bz - az - 2); g.clip();
            g.strokeStyle = 'rgba(70,64,60,.05)'; g.lineWidth = 1;
            var vert = r() < 0.5;
            for (var s = (vert ? ax : az) + 2; s < (vert ? bx : bz); s += 3) {
              g.beginPath();
              if (vert) { g.moveTo(s, az); g.lineTo(s, bz); } else { g.moveTo(ax, s); g.lineTo(bx, s); }
              g.stroke();
            }
            g.restore();
          }
        }
      }
      for (var n = 0; n < 9000; n++) {
        g.fillStyle = r() < 0.5 ? 'rgba(80,72,64,.05)' : 'rgba(255,255,250,.06)';
        g.fillRect(r() * S, r() * S, 2 + r() * 3, 2 + r() * 3);
      }
    });
  }

  /* ---------------------------------------------------------------- materials */

  /* Ground, roads and trees dissolve with distance from the view target: smooth alpha on the ground,
     hashed discard on the rest (no sorting artifacts). */
  function fadeInject(mat, fade, hashed) {
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uFade = fade;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\n{ vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp = instanceMatrix * wp;\n#endif\n vWPos = (modelMatrix * wp).xyz; }');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform vec4 uFade;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n{ float fa = 1.0 - smoothstep(uFade.z, ' + (hashed ? 'mix(uFade.z, uFade.w, 0.4)' : 'uFade.w') + ', length(vWPos.xz - uFade.xy));\n' +
          (hashed ? ' if (fa < fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard; }'
                  : ' gl_FragColor.a *= fa; }'));
    };
    mat.customProgramCacheKey = function () { return hashed ? 'fade-h' : 'fade-a'; };
    return mat;
  }
  function envDim(mats) {
    Object.keys(mats).forEach(function (k) { mats[k].envMapIntensity = 0.55; });
    return mats;
  }
  function makeMaterials(tex, fade) {
    return envDim({
      matte: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }),
      metal: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.38 }),
      panel: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, map: tex.panel }),
      gravel: new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: tex.gravel }),
      glass: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 0.7 }),
      flat: new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
      fence: new T.MeshStandardMaterial({ color: 0x9c9fa6, roughness: 0.7, metalness: 0.3, transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide }),
      road: fadeInject(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }), fade, true)
    });
  }

  /* Soft studio environment for image-based fill light: lilac above, wash at the horizon, aubergine below. */
  function makeEnvironment(renderer) {
    var scene = new T.Scene();
    var geo = new T.SphereGeometry(10, 32, 16);
    var cols = [], pos = geo.attributes.position, top = new T.Color(0xf6f2fa), hor = new T.Color(0xece6f1), low = new T.Color(0x6c5d73), c = new T.Color();
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 10;
      if (y >= 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(low, Math.pow(-y, 0.5));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    scene.add(new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
    /* A warm patch where the sun is, so metals catch a highlight. */
    var sun = new T.Mesh(new T.SphereGeometry(1.4, 16, 8), new T.MeshBasicMaterial({ color: new T.Color(0xfff6e6).multiplyScalar(3) }));
    sun.position.set(-5.5, 6.5, 3.5);
    scene.add(sun);
    var pm = new T.PMREMGenerator(renderer);
    var rt = pm.fromScene(scene, 0.035);
    pm.dispose();
    geo.dispose();
    return rt.texture;
  }

  /* ---------------------------------------------------------------- conductors */

  /* Every conductor is a thin tube whose radius never drops below about a pixel, so lines read at any
     distance. aS is the conductor's coordinate along the current path: the stringing front (uBuilt), the
     current (uProg) and the traveling dashes all read it. */
  var WIRE_VS = [
    'attribute vec3 aOff; attribute float aS; attribute float aR; attribute vec3 aDead;',
    'uniform float uProg; uniform float uPx; uniform float uHead;',
    'varying float vS; varying vec3 vDead; varying float vDepth; varying float vShade;',
    'void main() {',
    '  vec4 wc = modelMatrix * vec4(position, 1.0);',
    '  float d = max(1.0, -(viewMatrix * wc).z);',
    '  float px = d * uPx;',
    '  float live = step(aS, uProg);',
    '  float head = live * exp(-(uProg - aS) / uHead);',
    '  float r = mix(max(aR, px * 0.42), max(aR * 1.5, px * (0.85 + 0.9 * head)), live);',
    '  wc.xyz += aOff * r;',
    '  vS = aS; vDead = aDead; vShade = 0.8 + 0.2 * aOff.y;',
    '  vec4 mv = viewMatrix * wc;',
    '  vDepth = -mv.z;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var WIRE_FS = [
    'uniform float uProg; uniform float uBuilt; uniform float uTime; uniform float uFlow; uniform float uDash; uniform float uHead;',
    'uniform vec3 uGold; uniform vec3 uHot; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;',
    'varying float vS; varying vec3 vDead; varying float vDepth; varying float vShade;',
    'void main() {',
    '  if (vS > uBuilt) discard;',
    '  vec3 col = vDead * vShade;',
    '  if (vS <= uProg) {',
    '    float ph = fract((vS - uTime * uDash * 0.8) / uDash);',
    '    float pulse = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.28, 0.5, ph));',
    '    col = uGold * (1.0 - 0.1 * uFlow) + (uHot - uGold) * 0.55 * uFlow * pulse;',
    '    col = mix(col, uHot, 0.5 * exp(-(uProg - vS) / uHead));',
    '  }',
    '  float f = smoothstep(uFogNear, uFogFar, vDepth);',
    '  gl_FragColor = vec4(mix(col, uFogColor, f), 1.0);',
    '}'
  ].join('\n');
  /* The head of the current: an ink ring around a gold bead, a fixed size on screen. */
  var HEAD_VS = [
    'uniform float uSize;',
    'void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; gl_Position = projectionMatrix * mv; }'
  ].join('\n');
  var HEAD_FS = [
    'uniform vec3 uGold; uniform vec3 uInk;',
    'void main() {',
    '  float r = length(gl_PointCoord - 0.5) * 2.0;',
    '  if (r > 1.0) discard;',
    '  float a = 1.0 - smoothstep(0.86, 1.0, r);',
    '  vec3 c = mix(uGold, uInk, smoothstep(0.52, 0.62, r));',
    '  gl_FragColor = vec4(c, a);',
    '}'
  ].join('\n');

  function Wires() { this.hops = []; this.total = 1; }
  Wires.prototype.hop = function (group, after) {
    var h = { id: this.hops.length, group: group, after: after === undefined ? this.hops.length - 1 : (after === null ? -1 : after.id), wires: [] };
    this.hops.push(h);
    return h;
  };
  Wires.prototype.line = function (h, pts, r, dead) {
    var lens = [0];
    for (var i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    h.wires.push({ pts: pts, lens: lens, len: Math.max(lens[lens.length - 1], 0.01), r: r, dead: dead });
  };
  Wires.prototype.wire = function (h, a, b, sag, r, dead) {
    var len = a.distanceTo(b), n = sag > 0.01 ? clamp(Math.round(len / 7), 6, 28) : 1, pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, p = a.clone().lerp(b, t);
      p.y -= sag * 4 * t * (1 - t);
      pts.push(p);
    }
    this.line(h, pts, r, dead);
  };
  Wires.prototype.span = function (h, A, B, sag, r, dead) {
    for (var i = 0; i < 3; i++) this.wire(h, A[i], B[i], sag, r, dead);
  };
  /* 'seq': hops follow one another in creation order (the story). 'tree': each hop starts where its parent
     ends, so current splits at the substation and reaches both data centers together (the hero). */
  Wires.prototype.layout = function (mode) {
    var acc = 0, hops = this.hops, total = 0;
    hops.forEach(function (h) {
      h.len = Math.max.apply(null, h.wires.map(function (w) { return w.len; }).concat([0.01]));
      if (mode === 'seq') { h.start = acc; acc += h.len; }
      else h.start = h.after >= 0 ? hops[h.after].start + hops[h.after].len : 0;
      h.end = h.start + h.len;
      total = Math.max(total, h.end);
    });
    this.total = total;
  };
  Wires.prototype.groupRange = function (g) {
    var a = Infinity, b = -Infinity;
    this.hops.forEach(function (h) { if (h.group === g) { a = Math.min(a, h.start); b = Math.max(b, h.end); } });
    return a === Infinity ? null : [a, b];
  };
  Wires.prototype.build = function () {
    var RING = 6, P = [], O = [], S = [], R = [], D = [], I = [], base = 0;
    var t = V(0, 0, 0), n1 = V(0, 0, 0), n2 = V(0, 0, 0), up = V(0, 1, 0), X = V(1, 0, 0), off = V(0, 0, 0);
    this.hops.forEach(function (h) {
      h.wires.forEach(function (w) {
        var pts = w.pts, dead = raw(w.dead);
        for (var i = 0; i < pts.length; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          t.subVectors(b, a).normalize();
          n1.crossVectors(t, up);
          if (n1.lengthSq() < 1e-6) n1.crossVectors(t, X);
          n1.normalize();
          n2.crossVectors(t, n1).normalize();
          var s = h.start + (w.lens[i] / w.len) * h.len;
          for (var k = 0; k < RING; k++) {
            var an = k / RING * Math.PI * 2;
            off.copy(n1).multiplyScalar(Math.cos(an)).addScaledVector(n2, Math.sin(an));
            P.push(pts[i].x, pts[i].y, pts[i].z); O.push(off.x, off.y, off.z); S.push(s); R.push(w.r); D.push(dead.x, dead.y, dead.z);
          }
          if (i > 0) {
            var r0 = base + (i - 1) * RING, r1 = base + i * RING;
            for (var j = 0; j < RING; j++) {
              var j1 = (j + 1) % RING;
              I.push(r0 + j, r1 + j, r1 + j1, r0 + j, r1 + j1, r0 + j1);
            }
          }
        }
        base += pts.length * RING;
      });
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('aOff', new T.Float32BufferAttribute(O, 3));
    g.setAttribute('aS', new T.Float32BufferAttribute(S, 1));
    g.setAttribute('aR', new T.Float32BufferAttribute(R, 1));
    g.setAttribute('aDead', new T.Float32BufferAttribute(D, 3));
    g.setIndex(I);
    g.computeBoundingSphere();
    g.boundingSphere.radius += 50;
    this.uniforms = {
      uProg: { value: 0 }, uBuilt: { value: 1e9 }, uTime: { value: 0 }, uFlow: { value: 0 }, uDash: { value: 8 },
      uHead: { value: 14 }, uPx: { value: 0.002 }, uGold: { value: raw(COL.gold) }, uHot: { value: raw(COL.hot) },
      uFogColor: { value: raw(COL.wash) }, uFogNear: { value: 1e5 }, uFogFar: { value: 2e5 }
    };
    var mesh = new T.Mesh(g, new T.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WIRE_VS, fragmentShader: WIRE_FS }));
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    this.mesh = mesh;

    /* Heads: up to eight beads, one per hop the current is crossing. */
    var hg = new T.BufferGeometry();
    hg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(24), 3));
    hg.setDrawRange(0, 0);
    this.headUniforms = { uSize: { value: 11 }, uGold: { value: raw(COL.gold) }, uInk: { value: raw(COL.ink) } };
    this.heads = new T.Points(hg, new T.ShaderMaterial({ uniforms: this.headUniforms, vertexShader: HEAD_VS, fragmentShader: HEAD_FS, transparent: true, depthWrite: false }));
    this.heads.frustumCulled = false;
    this.heads.renderOrder = 10;
    return mesh;
  };
  Wires.prototype.setProgress = function (len, showHeads) {
    this.uniforms.uProg.value = len;
    var arr = this.heads.geometry.attributes.position, n = 0;
    if (showHeads) {
      for (var i = 0; i < this.hops.length && n < 8; i++) {
        var h = this.hops[i], f = (len - h.start) / h.len;
        if (f <= 0 || f >= 1 || !h.wires.length) continue;
        var w = h.wires[Math.min(1, h.wires.length - 1)], target = f * w.len;
        for (var k = 1; k < w.pts.length; k++) {
          if (w.lens[k] >= target) {
            var a = w.pts[k - 1], b = w.pts[k], t = (target - w.lens[k - 1]) / Math.max(1e-6, w.lens[k] - w.lens[k - 1]);
            arr.setXYZ(n++, lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
            break;
          }
        }
      }
    }
    this.heads.geometry.setDrawRange(0, n);
    arr.needsUpdate = true;
  };

  /* ================================================================== equipment */

  /* Insulator string hanging from (x, y, z): a rod and a stack of discs. */
  function insString(b, x, y, z, L, discs) {
    discs = discs || 10;
    b.link('metal', COL.steelDark, [x, y, z], [x, y - L, z], 0.045, true);
    for (var k = 0; k < discs; k++) b.cyl('matte', COL.ins, x, y - 0.45 - k * (L - 0.7) / (discs - 1), z, 0.24, 0.09, 8);
  }
  /* Station post insulator standing on (x, y, z). */
  function postIns(b, x, y, z, h) {
    b.cyl('matte', COL.ins, x, y, z, 0.11, h, 8);
    for (var k = 0; k < 5; k++) b.cyl('matte', COL.ins, x, y + 0.25 + k * (h - 0.45) / 4, z, 0.2, 0.07, 8);
    b.cyl('metal', COL.steel, x, y + h, z, 0.13, 0.12, 8);
  }
  function bushing(b, x, y, z, h, r) {
    b.cyl('matte', COL.ins, x, y, z, r, h, 8, 0.6);
    for (var k = 0; k < 5; k++) b.cyl('matte', COL.ins, x, y + 0.3 + k * (h - 0.7) / 4, z, r * 1.8, 0.08, 8);
    b.cyl('metal', COL.steel, x, y + h, z, r * 0.7, 0.22, 8);
    return b.w(x, y + h + 0.22, z);
  }

  /* Steel lattice suspension tower, line along z, crossarms along x. Returns attachment points, local,
     ordered left-lower, upper, right-lower. */
  function latticeTower(b, H) {
    var bw = 4.8, tw = 1.4, za = H * 0.66, arm = 10.5, armU = 7.2, zt = za + (H - za) * 0.58, S = COL.steel;
    function wAt(y) { return y <= za ? lerp(bw, tw, y / za) : lerp(tw, tw * 0.72, (y - za) / (H - za)); }
    var lv = [0, 0.19, 0.36, 0.51, 0.64, 0.76, 0.88, 1].map(function (f) { return f * za; }).concat([za + (H - za) * 0.5, H]);
    var corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (var i = 0; i < lv.length - 1; i++) {
      var y0 = lv[i], y1 = lv[i + 1], w0 = wAt(y0), w1 = wAt(y1);
      corners.forEach(function (s) { b.link('metal', S, [s[0] * w0, y0, s[1] * w0], [s[0] * w1, y1, s[1] * w1], i < 3 ? 0.34 : 0.26); });
      for (var f = 0; f < 4; f++) {
        var c0 = corners[f], c1 = corners[(f + 1) % 4];
        b.link('metal', S, [c0[0] * w0, y0, c0[1] * w0], [c1[0] * w1, y1, c1[1] * w1], 0.12);
        b.link('metal', S, [c1[0] * w0, y0, c1[1] * w0], [c0[0] * w1, y1, c0[1] * w1], 0.12);
        b.link('metal', S, [c0[0] * w1, y1, c0[1] * w1], [c1[0] * w1, y1, c1[1] * w1], 0.14);
      }
    }
    function arm3(y, x0, x1, hgt, half) {
      b.link('metal', S, [x0, y, -half], [x1, y, -half], 0.2);
      b.link('metal', S, [x0, y, half], [x1, y, half], 0.2);
      b.link('metal', S, [x0, y + hgt, 0], [x1, y + 0.2, 0], 0.18);
      for (var k = 0; k <= 4; k++) {
        var x = lerp(x0, x1, k / 4), yt = lerp(y + hgt, y + 0.2, k / 4);
        b.link('metal', S, [x, y, -half], [x, yt, 0], 0.09);
        b.link('metal', S, [x, y, half], [x, yt, 0], 0.09);
        if (k) b.link('metal', S, [x, y, -half], [x, y, half], 0.09);
      }
    }
    var wa = wAt(za), wu = wAt(zt), wt = wAt(H);
    arm3(za, -wa, -arm, 2.8, 1.1);
    arm3(za, wa, arm, 2.8, 1.1);
    arm3(zt, wu, armU, 2.2, 0.9);
    b.link('metal', S, [-wt, H, 0], [0, H + 2.4, 0], 0.14);
    b.link('metal', S, [wt, H, 0], [0, H + 2.4, 0], 0.14);
    [[-arm + 0.4, za], [armU - 0.3, zt], [arm - 0.4, za]].forEach(function (a) { insString(b, a[0], a[1], 0, 4.2); });
    corners.forEach(function (s) { b.box('matte', COL.concrete, s[0] * bw, -0.4, s[1] * bw, 1.4, 0.75, 1.4); });
    return [V(-arm + 0.4, za - 4.3, 0), V(armU - 0.3, zt - 4.3, 0), V(arm - 0.4, za - 4.3, 0)];
  }

  /* Tubular steel monopole, line along x, davit arms along z. Returns attachment points (world). */
  function monopole(b, H) {
    b.cyl('matte', COL.concrete, 0, -0.4, 0, 1.4, 0.8, 16);
    b.cyl('metal', COL.steel, 0, 0, 0, 0.9, H, 16, 0.48);
    b.cyl('metal', COL.steel, 0, H, 0, 0.45, 1.2, 10, 0.4);
    return [[H - 2, 5.4], [H - 7, -5.4], [H - 12, 5.4]].map(function (a) {
      var s = Math.sign(a[1]);
      b.link('metal', COL.steel, [0, a[0] - 0.9, s * 0.4], [0, a[0] + 0.2, a[1]], 0.16, true, 8);
      insString(b, 0, a[0] + 0.1, a[1] - s * 0.2, 2.6, 7);
      return b.w(0, a[0] + 0.1 - 2.75, a[1] - s * 0.2);
    });
  }

  /* Square lattice column standing at (x, z). */
  function latticeColumn(b, x, z, H, w) {
    var h = w / 2, n = Math.max(2, Math.round(H / 2.6)), C = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    C.forEach(function (s) { b.link('metal', COL.steel, [x + s[0] * h, 0, z + s[1] * h], [x + s[0] * h, H, z + s[1] * h], 0.16); });
    for (var i = 0; i < n; i++) {
      var y0 = H * i / n, y1 = H * (i + 1) / n;
      for (var f = 0; f < 4; f++) {
        var a = C[f], c = C[(f + 1) % 4];
        b.link('metal', COL.steel, [x + a[0] * h, y0, z + a[1] * h], [x + c[0] * h, y1, z + c[1] * h], 0.06);
        b.link('metal', COL.steel, [x + a[0] * h, y1, z + a[1] * h], [x + c[0] * h, y1, z + c[1] * h], 0.07);
      }
    }
    b.box('matte', COL.concrete, x, -0.3, z, w + 0.8, 0.6, w + 0.8);
  }
  /* Dead-end gantry, beam along local x, insulators at the given x offsets. Returns attachment points (world). */
  function gantry(b, span, H, xs) {
    latticeColumn(b, -span / 2, 0, H, 1.1);
    latticeColumn(b, span / 2, 0, H, 1.1);
    var y0 = H - 1.5, y1 = H, hz = 0.55, n = Math.round(span / 2);
    [[y0, -hz], [y0, hz], [y1, -hz], [y1, hz]].forEach(function (c) { b.link('metal', COL.steel, [-span / 2, c[0], c[1]], [span / 2, c[0], c[1]], 0.13); });
    for (var i = 0; i < n; i++) {
      var xa = lerp(-span / 2, span / 2, i / n), xb = lerp(-span / 2, span / 2, (i + 1) / n);
      b.link('metal', COL.steel, [xa, y0, -hz], [xb, y1, -hz], 0.06);
      b.link('metal', COL.steel, [xa, y0, hz], [xb, y1, hz], 0.06);
    }
    return xs.map(function (x) { insString(b, x, y0, 0, 3.0, 8); return b.w(x, y0 - 3.1, 0); });
  }

  /* Power transformer, long axis x: tank, radiator banks on both long sides, conservator, bushings. */
  function powerTx(b, big) {
    var L = big ? 7.6 : 6.2, Ht = big ? 4.2 : 3.6, D = big ? 3.6 : 3.0, y = 0.35;
    b.box('matte', COL.concrete, 0, 0, 0, L + 5, y, D + 6.4);
    b.box('metal', COL.tankDark, 0, y, 0, L + 0.4, 0.35, D + 0.4);
    b.box('metal', COL.tank, 0, y + 0.35, 0, L, Ht, D);
    b.box('metal', COL.tankDark, 0, y + 0.35 + Ht, 0, L + 0.3, 0.14, D + 0.3);
    [-1, 1].forEach(function (sd) {
      [-1, 1].forEach(function (k) {
        var cx = k * L * 0.25, zc = sd * (D / 2 + 0.95);
        for (var f = 0; f < 8; f++) b.box('metal', COL.tank, cx - 1.05 + f * 0.3, y + 0.75, zc, 0.07, Ht - 0.9, 1.5);
        b.link('metal', COL.tankDark, [cx - 1.25, y + Ht - 0.05, zc], [cx + 1.25, y + Ht - 0.05, zc], 0.11, true, 6);
        b.link('metal', COL.tankDark, [cx - 1.25, y + 0.8, zc], [cx + 1.25, y + 0.8, zc], 0.11, true, 6);
      });
    });
    var top = y + 0.49 + Ht;
    b.link('metal', COL.tank, [-L / 2 + 0.5, top + 1.7, -D / 2 + 0.55], [-L / 2 + 3.4, top + 1.7, -D / 2 + 0.55], 0.5, true, 12);
    b.link('metal', COL.steelDark, [-L / 2 + 1.0, top, -D / 2 + 0.55], [-L / 2 + 1.0, top + 1.3, -D / 2 + 0.55], 0.1);
    b.link('metal', COL.steelDark, [-L / 2 + 2.9, top, -D / 2 + 0.55], [-L / 2 + 2.9, top + 1.3, -D / 2 + 0.55], 0.1);
    b.box('metal', COL.tankDark, L / 2 + 0.45, y + 0.6, D * 0.1, 0.9, 1.6, 1.2);
    var hv = [-1.7, 0, 1.7].map(function (x) { return bushing(b, x, top, -0.5, big ? 3.4 : 2.8, 0.19); });
    var lv = [-1.5, 0, 1.5].map(function (x) { return bushing(b, x, top, D / 2 - 0.6, 1.5, 0.14); });
    return { hv: hv, lv: lv };
  }
  /* Dead-tank breaker for one phase, tank along z. Returns [in, out] bushing tops (world). */
  function breaker(b) {
    [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(function (c) { b.link('metal', COL.steel, [c[0] * 0.6, 0, c[1]], [c[0] * 0.6, 2.2, c[1]], 0.12); });
    b.box('matte', COL.concrete, 0, -0.2, 0, 2.4, 0.4, 3.0);
    b.link('metal', COL.tank, [0, 2.75, -1.35], [0, 2.75, 1.35], 0.55, true, 12);
    b.box('metal', COL.tankDark, 0.75, 1.0, 0, 0.6, 1.1, 0.8);
    var out = [];
    [-1, 1].forEach(function (s) {
      var a = [0, 3.1, s * 0.85], t = [0, 5.7, s * 1.5];
      b.link('matte', COL.ins, a, t, 0.13, true, 8);
      for (var k = 0; k < 5; k++) { var f = 0.15 + k * 0.17; b.link('matte', COL.ins, [0, lerp(a[1], t[1], f) - 0.04, lerp(a[2], t[2], f)], [0, lerp(a[1], t[1], f) + 0.04, lerp(a[2], t[2], f)], 0.23, true, 8); }
      out.push(b.w(t[0], t[1] + 0.15, t[2]));
    });
    return out;
  }
  /* Disconnect switch for one phase: stand, two posts, blade along z. Returns the blade center (world). */
  function disconnect(b) {
    b.box('metal', COL.steel, 0, 0, 0, 0.32, 4.3, 0.32);
    b.box('metal', COL.steel, 0, 4.3, 0, 0.3, 0.25, 2.4);
    postIns(b, 0, 4.55, -1.0, 2.1);
    postIns(b, 0, 4.55, 1.0, 2.1);
    b.link('metal', COL.alu, [0, 6.8, -1.0], [0, 6.8, 1.0], 0.06, true);
    return b.w(0, 6.85, 0);
  }
  /* Chain-link fence around a rectangle, sides limited to 'back' (north, west) or 'front' (south, east). */
  function fence(b, x0, z0, x1, z1, which, gate) {
    var H = 2.4;
    function run(ax, az, bx, bz) {
      var len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3.2));
      for (var i = 0; i <= n; i++) {
        var px = lerp(ax, bx, i / n), pz = lerp(az, bz, i / n);
        if (gate && Math.abs(px - gate[0]) < gate[2] && Math.abs(pz - gate[1]) < gate[2]) continue;
        b.cyl('metal', COL.steel, px, 0, pz, 0.04, H + 0.3, 5);
      }
      b.link('metal', COL.steel, [ax, H, az], [bx, H, bz], 0.035, true, 5);
      b.link('metal', COL.steelDark, [ax, H + 0.3, az], [bx, H + 0.3, bz], 0.012, true, 4);
      var mx = (ax + bx) / 2, mz = (az + bz) / 2;
      b.box('fence', 0xffffff, mx, 0, mz, Math.abs(bx - ax) || 0.01, H, Math.abs(bz - az) || 0.01);
    }
    if (which !== 'front') { run(x0, z0, x1, z0); run(x0, z0, x0, z1); }
    if (which !== 'back') { run(x0, z1, x1, z1); run(x1, z0, x1, z1); }
  }
  /* A flat-roofed hall, long axis x: precast walls with a parapet, membrane roof, rooftop units, doors. */
  function hall(b, L, D, H, rows, unitEvery, opt) {
    opt = opt || {};
    var t = 0.5, P = H + 1.1;
    b.box('panel', opt.wall || COL.panel, 0, 0, -D / 2 + t / 2, L, P, t);
    b.box('panel', opt.wall || COL.panel, 0, 0, D / 2 - t / 2, L, P, t);
    b.box('panel', opt.wall || COL.panel, -L / 2 + t / 2, 0, 0, t, P, D - 2 * t);
    b.box('panel', opt.wall || COL.panel, L / 2 - t / 2, 0, 0, t, P, D - 2 * t);
    b.box('matte', COL.roof, 0, H - 0.4, 0, L - 2 * t, 0.4, D - 2 * t);
    var n = Math.max(1, Math.floor((L - 16) / unitEvery));
    for (var r = 0; r < rows; r++) {
      var z = rows === 1 ? 0 : lerp(-D / 2 + 9, D / 2 - 9, r / (rows - 1));
      for (var i = 0; i < n; i++) {
        var x = -L / 2 + 8 + unitEvery / 2 + i * unitEvery;
        b.box('matte', COL.rtu, x, H, z, opt.unitL || 6.4, 2.6, 2.6);
        b.box('matte', COL.steelDark, x, H, z, (opt.unitL || 6.4) + 0.3, 0.3, 2.9);
        b.cyl('matte', COL.fan, x - 1.5, H + 2.6, z, 0.95, 0.12, 12);
        b.cyl('matte', COL.fan, x + 1.5, H + 2.6, z, 0.95, 0.12, 12);
      }
    }
    var doors = opt.doors || Math.max(2, Math.round(L / 45));
    for (var d = 0; d < doors; d++) {
      var dx = lerp(-L / 2 + 14, L / 2 - 14, doors === 1 ? 0.5 : d / (doors - 1));
      b.box('matte', COL.door, dx, 0, D / 2 + 0.03, 4.2, 4.6, 0.12);
    }
    /* Louver bands on the end walls. */
    [-1, 1].forEach(function (s) { b.box('matte', COL.casing, s * (L / 2 + 0.03), H * 0.55, 0, 0.12, H * 0.3, D * 0.7); });
  }
  /* Containerized standby generator, long axis x. */
  function genset(b, x, z) {
    b.box('matte', COL.concrete, x, 0, z, 14, 0.25, 4.6);
    b.box('matte', COL.gen, x, 0.25, z, 12.2, 3.3, 3.2);
    b.box('matte', COL.fan, x + 4.6, 3.55, z, 2.4, 0.18, 2.6);
    b.cyl('metal', COL.steelDark, x - 3.2, 3.55, z + 0.6, 0.28, 2.4, 8);
    b.box('matte', COL.casing, x - 6.25, 0.6, z, 0.1, 2.2, 2.4);
  }
  /* Wood distribution pole, line along z, crossarm along x. Returns attachment points (world). */
  function woodPole(b, H) {
    b.cyl('matte', COL.wood, 0, 0, 0, 0.2, H, 8, 0.75);
    b.box('matte', COL.wood, 0, H - 1.0, 0, 2.6, 0.11, 0.11);
    b.link('matte', COL.wood, [-0.9, H - 0.95, 0.09], [0, H - 1.75, 0.13], 0.05);
    b.link('matte', COL.wood, [0.9, H - 0.95, 0.09], [0, H - 1.75, 0.13], 0.05);
    [[-1.15, H - 0.89], [1.15, H - 0.89]].forEach(function (p) { b.cyl('matte', COL.ins, p[0], p[1], 0, 0.07, 0.24, 6); });
    b.cyl('matte', COL.ins, 0, H, 0, 0.07, 0.3, 6);
    return [b.w(-1.15, H - 0.6, 0), b.w(0, H + 0.3, 0), b.w(1.15, H - 0.6, 0)];
  }
  /* Pole-top transformer can hung on the pole's south-east side. Returns its primary and secondary terminals. */
  function poleCan(b, H) {
    b.box('metal', COL.steelDark, 0.25, H - 4.2, 0.25, 0.1, 1.4, 0.1);
    b.cyl('metal', COL.tank, 0.62, H - 4.4, 0.45, 0.36, 1.15, 12);
    b.cyl('metal', COL.tankDark, 0.62, H - 3.25, 0.45, 0.38, 0.1, 12);
    b.cyl('matte', COL.ins, 0.62, H - 3.15, 0.45, 0.06, 0.3, 6);
    b.cyl('matte', COL.ins, 0.95, H - 3.9, 0.55, 0.05, 0.2, 6);
    return { pri: b.w(0.62, H - 2.85, 0.45), sec: b.w(1.0, H - 3.7, 0.6) };
  }

  /* ================================================================== the world */

  var TOWERS = [-845, -675, -505, -335, -165];

  /* Stops: 0 generation, 1 transmission, 2 transmission substation, 3 hyperscale, 4 feeder, 5 data center.
     Parts are added per stop in path order; hops record the order current flows. */
  function World(opts) {
    bindThree();
    this.opts = opts;
    this.scene = new T.Scene();
    this.fade = { value: new T.Vector4(0, 0, 400, 900) };
    this.tex = makeTextures();
    this.mats = makeMaterials(this.tex, this.fade);
    this.b = new Builder();
    this.wires = new Wires();
    this.groups = [];
    this.parts = [];
    this.excl = [];
    this.build();
  }
  World.prototype.group = function () { this.cur = []; this.groups.push(this.cur); return this.groups.length - 1; };
  World.prototype.part = function (fn) {
    var p = new T.Group();
    fn.call(this, this.b);
    this.b.flush(this.mats, p);
    p.userData.t = 1;
    this.scene.add(p);
    this.cur.push(p);
    this.parts.push(p);
    return p;
  };
  World.prototype.keepClear = function (x0, z0, x1, z1) { this.excl.push([x0, z0, x1, z1]); };

  World.prototype.build = function () {
    var self = this, W = this.wires, o = this.opts;
    var DEAD = COL.cond;

    /* ---------------- 0 generation: a 2x1 combined-cycle gas plant */
    this.group();
    var plantOut = null;
    if (o.plant) {
      this.keepClear(-150, -1150, 140, -950);
      this.part(function (b) {
        b.box('gravel', COL.gravel, -5, 0, -1045, 240, 0.3, 170);
        b.box('matte', COL.concrete, -12, 0.3, -1032, 104, 0.2, 38);
      });
      /* Turbine hall with a clerestory, and the two gas-turbine air inlets on its south face. */
      this.part(function (b) {
        b.at(-12, 0.5, -1032, 0, function (b) {
          hall(b, 100, 32, 24, 0, 999, { wall: COL.clad, doors: 3 });
          b.box('panel', COL.clad, -4, 24, 0, 66, 5.5, 11);
          b.box('matte', COL.roof, -4, 29.5, 0, 66.4, 0.3, 11.4);
        });
        [-42, -6].forEach(function (x) {
          b.box('matte', COL.casing, x, 12, -1012.5, 13, 9, 7);
          for (var k = 0; k < 6; k++) b.box('matte', COL.tankDark, x, 12.8 + k * 1.35, -1008.95, 12.4, 0.35, 0.1);
          b.box('matte', COL.casing, x, 0.5, -1014, 4, 11.5, 3);
        });
      });
      /* Heat-recovery boilers with stiffener ribs, drums and the stacks behind them. */
      [-42, -6].forEach(function (x) {
        self.part(function (b) {
          b.box('matte', COL.casing, x, 0.3, -1053, 11, 15, 6);
          b.box('matte', COL.casing, x, 0.3, -1076, 14, 27, 40);
          for (var z = -1094; z <= -1058; z += 4) {
            b.box('matte', COL.tankDark, x - 7.1, 0.3, z, 0.25, 27, 0.35);
            b.box('matte', COL.tankDark, x + 7.1, 0.3, z, 0.25, 27, 0.35);
          }
          b.link('metal', COL.casing, [x - 5.5, 29, -1068], [x + 5.5, 29, -1068], 1.15, true, 12);
          b.box('metal', COL.steelDark, x, 27.3, -1068, 1.2, 0.6, 2.0);
          b.box('metal', COL.steel, x + 8.4, 0.3, -1060, 2.6, 28, 2.6);
          b.box('matte', COL.casing, x, 0.3, -1099, 6, 18, 8);
          b.cyl('matte', COL.stack, x, 0.3, -1101, 3.3, 54, 20, 0.92);
          b.cyl('metal', COL.steelDark, x, 40, -1101, 4.3, 0.35, 20);
          b.cyl('matte', COL.casing, x, 52.3, -1101, 3.1, 2.0, 20);
        });
      });
      /* Air-cooled condenser on columns, A-frame ridges behind a windwall; two tanks. */
      this.part(function (b) {
        var cx = 72, cz = -1078;
        for (var i = 0; i <= 5; i++) for (var j = 0; j <= 3; j++) b.box('matte', COL.concrete, cx - 25 + i * 10, 0.3, cz - 15 + j * 10, 0.9, 18, 0.9);
        b.box('matte', COL.casing, cx, 18.3, cz, 52, 1.4, 32);
        for (var r = 0; r < 3; r++) b.link('matte', COL.casing, [cx - 25, 23, cz - 10 + r * 10], [cx + 25, 23, cz - 10 + r * 10], 5.6, true, 3);
        b.box('panel', COL.clad, cx, 19.7, cz - 15.8, 52, 8, 0.4);
        b.box('panel', COL.clad, cx, 19.7, cz + 15.8, 52, 8, 0.4);
        b.box('panel', COL.clad, cx - 25.8, 19.7, cz, 0.4, 8, 31.2);
        b.box('panel', COL.clad, cx + 25.8, 19.7, cz, 0.4, 8, 31.2);
        b.link('metal', COL.steel, [cx - 26, 25, cz], [cx - 56, 25, cz], 1.6, true, 12);
        b.cyl('matte', COL.white, -96, 0.3, -1066, 8, 11, 24);
        b.cyl('matte', COL.white, -96, 11.3, -1066, 8, 1.4, 24, 0.12);
        b.cyl('matte', COL.white, -96, 0.3, -1034, 6, 9, 24);
        b.cyl('matte', COL.white, -96, 9.3, -1034, 6, 1.1, 24, 0.12);
      });
      var gsu = [];
      this.part(function (b) {
        [-42, -6].forEach(function (x) { gsu.push(b.at(x, 0.3, -1001, 0, function (b) { return powerTx(b, true); })); });
      });
      this.part(function (b) { plantOut = b.at(0, 0.3, -978, 0, function (b) { return gantry(b, 24, 17, [-8, 0, 8]); }); });
      var h0 = W.hop(0, null);
      gsu.forEach(function (t) { W.span(h0, t.hv, plantOut, 1.2, 0.04, DEAD); });
    }

    /* ---------------- 1 high-voltage transmission */
    this.group();
    this.keepClear(-40, -990, 40, -40);
    var tpl = new T.Group(), tplAt;
    (function () { var b = new Builder(); tplAt = latticeTower(b, 44); b.flush(self.mats, tpl); })();
    var prev = plantOut, from = o.towerFrom || 0;
    for (var i = from; i < TOWERS.length; i++) {
      var z = TOWERS[i];
      var p = new T.Group();
      tpl.children.forEach(function (m) { var c = new T.Mesh(m.geometry, m.material); c.castShadow = true; c.receiveShadow = true; p.add(c); });
      p.position.set(0, 0, z);
      p.userData.t = 1;
      this.scene.add(p); this.cur.push(p); this.parts.push(p);
      var at = tplAt.map(function (a) { return V(a.x, a.y, a.z + z); });
      var A = prev || at.map(function (a) { return V(a.x, a.y + 4, a.z - 240); });
      W.span(W.hop(1, prev ? undefined : null), A, at, prev ? 6.5 : 9, 0.045, DEAD);
      prev = at;
    }

    /* ---------------- 2 transmission substation */
    this.group();
    this.keepClear(-80, -75, 80, 72);
    var Y = 0.3, sg, sw = [], bk = [], zb = [-16, -12, -8], tx = [], eg;
    this.part(function (b) {
      b.box('gravel', COL.gravel, 0, 0, -2, 124, Y, 116);
      fence(b, -60, -58, 60, 54, 'back', [-60, 30, 4]);
    });
    this.part(function (b) { sg = b.at(0, Y, -47, 0, function (b) { return gantry(b, 26, 17, [-8, 0, 8]); }); });
    this.part(function (b) {
      [-8, 0, 8].forEach(function (x) {
        sw.push(b.at(x, Y, -38, 0, function (b) { return disconnect(b); }));
        bk.push(b.at(x, Y, -27, 0, function (b) { return breaker(b); }));
      });
    });
    this.part(function (b) {
      for (var x = -44; x <= 48; x += 9.2) zb.forEach(function (z) { b.box('metal', COL.steel, x, Y, z, 0.35, 5.2, 0.35); postIns(b, x, Y + 5.2, z, 2.6); });
    });
    this.part(function (b) { tx.push(b.at(-24, Y, 16, 0, function (b) { return powerTx(b, true); })); });
    this.part(function (b) { tx.push(b.at(12, Y, 16, 0, function (b) { return powerTx(b, true); })); });
    this.part(function (b) {
      b.at(-12, Y, 41, 0, function (b) {
        b.box('matte', COL.concrete, 0, 0, 0, 24, 0.3, 6);
        b.box('metal', COL.gen, 0, 0.3, 0, 22, 3.4, 4.2);
        b.box('metal', COL.steelDark, 0, 3.7, 0, 22.4, 0.18, 4.6);
        for (var k = 0; k < 9; k++) b.box('matte', COL.casing, -9.6 + k * 2.4, 1.0, 2.13, 1.6, 1.8, 0.05);
      });
      b.at(32, Y, 38, 0, function (b) { hall(b, 16, 9, 4.2, 0, 99, { doors: 1 }); });
    });
    this.part(function (b) { eg = b.at(56, Y, -12, Math.PI / 2, function (b) { return gantry(b, 16, 15, [4, 0, -4]); }); });
    this.part(function (b) { fence(b, -60, -58, 60, 54, 'front'); });
    var busY = Y + 8.0;
    var hIn = W.hop(2);
    W.span(hIn, prev, sg, 3.5, 0.045, DEAD);
    var hJ = W.hop(2);
    sg.forEach(function (a, j) { W.wire(hJ, a, V(sw[j].x, sw[j].y, sw[j].z - 1.0), 0.6, 0.035, DEAD); });
    var hB = W.hop(2);
    sw.forEach(function (s, j) { W.wire(hB, V(s.x, s.y, s.z + 1.0), bk[j][0], 0.3, 0.035, DEAD); });
    var hBus = W.hop(2);
    bk.forEach(function (k, j) {
      var tap = V(k[1].x, busY, zb[j]);
      W.wire(hBus, k[1], tap, 0.2, 0.035, DEAD);
      W.line(hBus, [tap, V(-44, busY, zb[j])], 0.09, COL.alu);
      W.line(hBus, [tap, V(48, busY, zb[j])], 0.09, COL.alu);
    });
    var hTx = W.hop(2);
    tx.forEach(function (t) { t.hv.forEach(function (h, j) { W.wire(hTx, V(h.x, busY, zb[j]), h, 0.6, 0.035, DEAD); }); });

    /* ---------------- 3 hyperscale campus on its own high-voltage tap */
    this.group();
    this.keepClear(60, -45, 300, 20);
    this.keepClear(280, -175, 690, 135);
    var mp = [], cg, ct = [], halls = [-110, -38, 34];
    [150, 238].forEach(function (x) { self.part(function (b) { mp.push(b.at(x, 0, -12, 0, function (b) { return monopole(b, 32); })); }); });
    this.part(function (b) {
      b.box('gravel', COL.gravel, 330, 0, -12, 84, Y, 104);
      fence(b, 290, -62, 370, 38, 'back');
      fence(b, 290, -62, 370, 38, 'front');
    });
    this.part(function (b) {
      cg = b.at(298, Y, -12, Math.PI / 2, function (b) { return gantry(b, 16, 15, [4, 0, -4]); });
      ct.push(b.at(338, Y, -36, 0, function (b) { return powerTx(b, true); }));
      ct.push(b.at(338, Y, 12, 0, function (b) { return powerTx(b, true); }));
    });
    this.part(function (b) {
      b.box('matte', COL.concrete, 520, 0, -20, 262, 0.35, 262);
      b.box('flat', COL.asphalt, 520, 0.35, 66, 250, 0.06, 8);
    });
    halls.forEach(function (z) { self.part(function (b) { b.at(518, 0.35, z, 0, function (b) { hall(b, 232, 56, 15, 2, 9.4); }); }); });
    this.part(function (b) {
      b.at(422, 0.35, 92, 0, function (b) {
        b.box('glass', COL.glass, 0, 0, 0, 36, 13, 14);
        b.box('matte', COL.white, 0, 13, 0, 36.6, 0.6, 14.6);
        for (var k = 0; k < 4; k++) b.box('matte', COL.white, 0, 3.1 + k * 3.2, 0, 36.3, 0.18, 14.3);
      });
      for (var g = 0; g < 9; g++) { genset(b, 462 + g * 19.5, 82); genset(b, 462 + g * 19.5, 97); }
    });
    var hTap = W.hop(3, hBus);
    eg.forEach(function (a, j) { W.wire(hTap, V(48, busY, zb[j]), a, 0.5, 0.035, DEAD); });
    /* Gantry phases run north to south; the monopole arms are upper (south), middle (north), lower (south). */
    var mpOrder = function (m) { return [m[1], m[0], m[2]]; };
    var hp = eg;
    mp.forEach(function (m) { var at = mpOrder(m); W.span(W.hop(3), hp, at, 2.8, 0.04, DEAD); hp = at; });
    W.span(W.hop(3), hp, cg, 2.2, 0.04, DEAD);
    var hCt = W.hop(3);
    ct.forEach(function (t) { t.hv.forEach(function (h, j) { W.wire(hCt, cg[j], h, 1.0, 0.035, DEAD); }); });
    var hHall = W.hop(3);
    var entry = function (z, j) { return V(402 - 0.6, 11.2 - j * 0.9, z - 6 + j * 2); };
    [[0, -110], [0, -38], [1, 34]].forEach(function (e) {
      ct[e[0]].lv.forEach(function (l, j) { W.wire(hHall, l, entry(e[1], j), 2.2, 0.035, DEAD); });
    });

    /* ---------------- 4 distribution feeder */
    this.group();
    this.keepClear(-30, 55, 10, 250);
    var poles = [64, 108, 152, 196, 240], pa = [], can;
    poles.forEach(function (z, k) {
      self.part(function (b) {
        pa.push(b.at(-12, 0, z, 0, function (b) {
          var a = woodPole(b, 13);
          if (k === 0) {
            b.link('metal', COL.steelDark, [0.24, 0, 0.12], [0.24, 11.6, 0.12], 0.07, true);
            b.box('matte', COL.ins, 0, 11.4, 0.3, 2.2, 0.35, 0.2);
          }
          if (k === poles.length - 1) can = poleCan(b, 13);
          return a;
        }));
      });
    });
    var hLv = W.hop(4, hTx);
    tx.forEach(function (t, ti) { t.lv.forEach(function (l, j) { W.wire(hLv, l, V(-12 + (ti ? 4 : -4) + (j - 1) * 1.2, Y + 3.9, 41), 0.5, 0.03, DEAD); }); });
    var hUg = W.hop(4);
    W.line(hUg, [V(-12, Y + 0.08, 44.5), V(-12, Y + 0.08, 56), V(-11.76, 0.08, 64.12)], 0.12, COL.trench);
    var hRiser = W.hop(4);
    W.line(hRiser, [V(-11.76, 0.1, 64.12), V(-11.76, 11.6, 64.12)], 0.08, COL.steelDark);
    var hTop = W.hop(4);
    pa[0].forEach(function (a) { W.wire(hTop, V(-11.76, 11.6, 64.3), a, 0.3, 0.025, DEAD); });
    for (var k = 1; k < pa.length; k++) W.span(W.hop(4), pa[k - 1], pa[k], 0.9, 0.025, DEAD);

    /* ---------------- 5 data center, under 25 MW, on the feeder */
    this.group();
    this.keepClear(-5, 252, 85, 330);
    this.part(function (b) {
      b.box('matte', COL.concrete, 34, 0, 280, 74, 0.3, 46);
      b.box('flat', COL.asphalt, 30, 0.3, 309, 56, 0.06, 18);
      for (var k = 0; k <= 18; k++) b.box('flat', COL.white, 5 + k * 2.8, 0.36, 309, 0.14, 0.02, 5.2);
      b.box('flat', COL.asphalt, 30, 0, 322, 8, 0.25, 14);
    });
    this.part(function (b) {
      b.at(30, 0.3, 276, 0, function (b) { hall(b, 46, 28, 9, 1, 10, { doors: 2 }); });
      b.box('metal', COL.tank, 4.2, 0.3, 266, 1.6, 1.8, 1.4);
    });
    this.part(function (b) { genset(b, 63, 268); genset(b, 63, 284); });
    var hDc = W.hop(5);
    W.wire(hDc, pa[pa.length - 1][2], can.pri, 0.2, 0.025, DEAD);
    var hSvc = W.hop(5);
    W.wire(hSvc, can.sec, V(7.2, 7.8, 268), 1.4, 0.05, DEAD);
    W.wire(hSvc, V(7.2, 7.8, 268), V(4.2, 2.1, 266.6), 0, 0.05, DEAD);

    /* ---------------- landscape: roads and trees around everything above */
    this.landscape();

    this.wires.layout(o.mode);
    this.scene.add(this.wires.build());
    this.scene.add(this.wires.heads);
    this.ranges = this.groups.map(function (g, gi) { return W.groupRange(gi); });
    this.marks = [];
    for (var gi = 0; gi < this.groups.length; gi++) { var r = this.ranges[gi]; this.marks.push(r ? r[1] : (this.marks[gi - 1] || 0)); }
  };

  World.prototype.landscape = function () {
    var self = this, o = this.opts;
    var grid = fieldGrid();
    var tex = groundTexture(grid);
    var gmat = fadeInject(new T.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, transparent: true, dithering: true, envMapIntensity: 0.55 }), this.fade, false);
    var ground = new T.Mesh(new T.PlaneGeometry(GROUND.size, GROUND.size), gmat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GROUND.cx, 0, GROUND.cz);
    ground.receiveShadow = true;
    ground.renderOrder = -1;
    this.scene.add(ground);

    var roads = [[-1600, 330, 1700, 330], [-160, -1700, -160, 1500], [-160, 30, -60, 30], [-160, -1040, -125, -1040], [520, 110, 520, 330], [34, 318, 34, 330], [-26, 58, -26, 330]];
    var land = new T.Group(), b = this.b;
    roads.forEach(function (r) {
      var w = 7, cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, lx = Math.abs(r[2] - r[0]) || w, lz = Math.abs(r[3] - r[1]) || w;
      b.box('road', COL.asphalt, cx, 0, cz, lx + (lz === w ? 0 : 0), 0.09, lz);
      self.keepClear(Math.min(r[0], r[2]) - 9, Math.min(r[1], r[3]) - 9, Math.max(r[0], r[2]) + 9, Math.max(r[1], r[3]) + 9);
    });
    b.flush(this.mats, land);
    land.children.forEach(function (m) { m.castShadow = false; });
    this.scene.add(land);

    /* Trees: woodlots and hedgerows on the field seams, never on a site, road or line corridor. */
    var r = rng(o.seed || 5), pts = [], ex = this.excl;
    var region = o.treeRegion || [-1300, -1600, 1500, 1100];
    function clear(x, z) {
      if (x < region[0] || x > region[2] || z < region[1] || z > region[3]) return false;
      for (var i = 0; i < ex.length; i++) { var e = ex[i]; if (x > e[0] && x < e[2] && z > e[1] && z < e[3]) return false; }
      return true;
    }
    function add(x, z, s) { if (clear(x, z)) pts.push([x, z, s]); }
    var lots = o.lots || 22;
    for (var l = 0; l < lots; l++) {
      var cx = lerp(region[0], region[2], r()), cz = lerp(region[1], region[3], r()), rad = 30 + r() * 60, n = 30 + Math.floor(r() * 50);
      for (var t = 0; t < n; t++) { var a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; add(cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.8, 0.8 + r() * 0.5); }
    }
    grid.xs.forEach(function (x) { if (r() < 0.3) for (var z = region[1]; z < region[3]; z += 9 + r() * 10) if (r() < 0.8) add(x + (r() - 0.5) * 4, z, 0.7 + r() * 0.4); });
    grid.zs.forEach(function (z) { if (r() < 0.3) for (var x = region[0]; x < region[2]; x += 9 + r() * 10) if (r() < 0.8) add(x, z + (r() - 0.5) * 4, 0.7 + r() * 0.4); });
    /* A few street trees by the small data center and the campus office. */
    var sp = [[-4, 302, 0.75], [-4, 316, 0.75], [64, 302, 0.75], [64, 316, 0.75], [392, 112, 0.75], [452, 112, 0.75]];
    /* A hedgerow on the far side of the farm road that the feeder follows. */
    for (var hz = 70; hz < 318; hz += 7 + r() * 9) if (r() < 0.82) sp.push([-41 + (r() - 0.5) * 3, hz, 0.7 + r() * 0.45]);
    pts = sp.concat(pts.slice(0, o.maxTrees || 1300));

    var canopy = new T.IcosahedronGeometry(1, 1), trunk = new T.CylinderGeometry(0.16, 0.22, 1, 6);
    var cm = fadeInject(new T.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true, envMapIntensity: 0.55 }), this.fade, true);
    var tm = fadeInject(new T.MeshStandardMaterial({ color: COL.trunk, roughness: 1, envMapIntensity: 0.55 }), this.fade, true);
    var CI = new T.InstancedMesh(canopy, cm, pts.length), TI = new T.InstancedMesh(trunk, tm, pts.length);
    var m = new T.Matrix4(), q = new T.Quaternion(), c = new T.Color();
    pts.forEach(function (p, i) {
      var s = p[2], h = 9 * s + r() * 4, rr = 3.4 * s + r() * 1.6;
      q.setFromAxisAngle(V(0, 1, 0), r() * 6.28);
      m.compose(V(p[0], h * 0.55 + rr * 0.55, p[1]), q, V(rr, h * 0.5, rr));
      CI.setMatrixAt(i, m);
      c.setHex(TREE_TONES[Math.floor(r() * TREE_TONES.length)]);
      CI.setColorAt(i, c);
      m.compose(V(p[0], h * 0.3, p[1]), q, V(1, h * 0.6, 1));
      TI.setMatrixAt(i, m);
    });
    CI.castShadow = true; CI.receiveShadow = true; TI.castShadow = true;
    this.scene.add(CI); this.scene.add(TI);
    this.trees = pts.length;
  };

  /* ================================================================== rendering stage */

  var FOV = 30;

  function Stage(host, world) {
    var self = this;
    var r = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.setClearColor(0x000000, 0);
    r.outputEncoding = T.sRGBEncoding;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.94;
    r.shadowMap.enabled = true;
    r.shadowMap.type = T.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    r.domElement.className = 'dem3d-canvas';
    r.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(r.domElement);
    this.r = r; this.host = host; this.world = world;
    this.visible = !window.IntersectionObserver; this.raf = 0; this.W = 0; this.H = 0; this.last = 0;
    this.shadowDirty = true;

    var scene = world.scene;
    scene.environment = makeEnvironment(r);
    scene.fog = new T.Fog(0xffffff, 1e4, 2e4);
    scene.fog.color.setRGB(0xf7 / 255, 0xf5 / 255, 0xf9 / 255);
    var hemi = new T.HemisphereLight(0xf3eef7, 0x5b4b63, 0.18);
    scene.add(hemi);
    var sun = new T.DirectionalLight(0xfff5e8, 1.35);
    this.sunDir = V(-0.62, 0.92, 0.42).normalize();
    sun.castShadow = true;
    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 6000;
    scene.add(sun); scene.add(sun.target);
    this.sun = sun;
    this.camera = new T.PerspectiveCamera(FOV, 1, 1, 10000);

    this._frame = function (t) { self.raf = 0; self.frame(t); };
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        self.visible = es[es.length - 1].isIntersecting;
        if (self.visible) self.request();
      }, { rootMargin: '60px 0px' }).observe(host);
    }
    if (window.ResizeObserver) new ResizeObserver(function () { if (self.measure()) { self.onResize && self.onResize(); self.request(); } }).observe(host);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.request(); });
    r.domElement.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; });
    r.domElement.addEventListener('webglcontextrestored', function () { self.lost = false; self.shadowDirty = true; self.request(); });
    this.measure();
  }
  Stage.prototype.measure = function () {
    var w = Math.max(1, Math.round(this.host.clientWidth)), h = Math.max(1, Math.round(this.host.clientHeight));
    if (w === this.W && h === this.H) return false;
    this.W = w; this.H = h;
    this.r.setSize(w, h, false);
    this.shadowDirty = true;
    return true;
  };
  Stage.prototype.request = function () {
    if (!this.raf && this.visible && !document.hidden && !this.lost) this.raf = requestAnimationFrame(this._frame);
  };
  Stage.prototype.frame = function (t) {
    var more = this.tick ? this.tick(t) : false;
    if (more !== 'skip') this.render();
    if (more) this.request();
  };
  /* Frame the view: target, distance, angles and the screen position of the target (vx, vy, 0..1). */
  Stage.prototype.view = function (c) {
    var cam = this.camera, W = this.W, H = this.H, world = this.world;
    var el = c.el * DEG, az = c.az * DEG;
    var dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    cam.position.copy(c.t).addScaledVector(dir, c.d);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.t);
    cam.near = Math.max(0.5, c.d * 0.04);
    cam.far = c.d * 8 + 2000;
    cam.aspect = W / H;
    cam.setViewOffset(W, H, (0.5 - (c.vx === undefined ? 0.5 : c.vx)) * W, (0.5 - (c.vy === undefined ? 0.5 : c.vy)) * H, W, H);
    cam.updateProjectionMatrix();

    var fog = world.scene.fog;
    fog.near = c.d * (c.fogN || 1.0);
    fog.far = c.d * (c.fogF || 3.2);
    var u = world.wires.uniforms;
    u.uFogNear.value = fog.near; u.uFogFar.value = fog.far;
    u.uPx.value = 2 * Math.tan(FOV * DEG / 2) / H;
    u.uHead.value = Math.max(6, c.d * 0.035);
    u.uDash.value = Math.max(4, c.d * 0.05);
    world.wires.headUniforms.uSize.value = 10 * this.r.getPixelRatio();
    world.fade.value.set(c.t.x, c.t.z, c.r * (c.fadeA || 1.35), c.r * (c.fadeB || 2.9));

    /* Sun shadow frustum follows the target, quantized so it does not crawl while the camera moves. */
    var ext = clamp(c.r * 1.9, 45, 1700);
    ext = Math.pow(1.12, Math.round(Math.log(ext) / Math.log(1.12)));
    var texel = 2 * ext / this.sun.shadow.mapSize.x;
    var tx = Math.round(c.t.x / texel) * texel, tz = Math.round(c.t.z / texel) * texel;
    var key = tx + ',' + tz + ',' + ext.toFixed(2);
    if (key !== this.shadowKey) {
      this.shadowKey = key;
      var sc = this.sun.shadow.camera;
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
      sc.far = 3000 + ext * 2;
      sc.updateProjectionMatrix();
      this.sun.shadow.normalBias = texel * 0.9;
      this.sun.target.position.set(tx, 0, tz);
      this.sun.position.set(tx, 0, tz).addScaledVector(this.sunDir, 2000);
      this.sun.target.updateMatrixWorld();
      this.sun.updateMatrixWorld();
      this.shadowDirty = true;
    }
  };
  Stage.prototype.render = function () {
    if (this.lost || !this.W) return;
    if (this.shadowDirty) { this.r.shadowMap.needsUpdate = true; this.shadowDirty = false; }
    this.r.render(this.world.scene, this.camera);
    if (STATS) {
      var s = window.__DEM3D_STATS = window.__DEM3D_STATS || {};
      s[this.host.id] = { calls: this.r.info.render.calls, tris: this.r.info.render.triangles, frames: (s[this.host.id] ? s[this.host.id].frames : 0) + 1, trees: this.world.trees, dpr: this.r.getPixelRatio() };
    }
  };

  function fitDist(R, aspect, fx, fy) {
    var tv = Math.tan(FOV * DEG / 2);
    return Math.max(R / Math.sin(Math.atan(tv * fy)), R / Math.sin(Math.atan(tv * aspect * fx)));
  }

  /* ================================================================== hero */

  /* The establishing view: lines enter from the north edge, the substation in the middle, the hyperscale
     campus to the right, the feeder and the small data center in front. */
  var HERO = { t: [300, 0, 84], r: 262, az: 8, el: 31, vx: 0.59, vy: 0.42, fx: 1.0, fy: 1.0, fogN: 1.1, fogF: 3.6, fadeA: 1.15, fadeB: 2.1 };

  function hero3d(container) {
    var world = new World({ mode: 'tree', plant: false, towerFrom: 2, seed: 9, treeRegion: [-700, -900, 1100, 700], lots: 26 });
    var stage = new Stage(container, world);
    var W = world.wires, prog = 0, run = null, flowUntil = 0, flowFade = 0, drift = 0;

    function frameView() {
      var aspect = stage.W / stage.H;
      var narrow = stage.W < 560;
      var c = {
        t: V(HERO.t[0] - (narrow ? 40 : 0), HERO.t[1], HERO.t[2]), r: HERO.r, az: HERO.az + drift, el: HERO.el,
        vx: narrow ? 0.5 : HERO.vx, vy: HERO.vy, fogN: HERO.fogN, fogF: HERO.fogF, fadeA: HERO.fadeA, fadeB: HERO.fadeB
      };
      c.d = fitDist(narrow ? HERO.r * 0.92 : HERO.r, aspect, HERO.fx, HERO.fy);
      stage.view(c);
    }
    stage.onResize = frameView;
    W.uniforms.uBuilt.value = 1e9;
    W.setProgress(0, false);
    frameView();

    stage.tick = function (t) {
      var more = false;
      if (run) {
        var e = clamp((t - run.t0) / run.ms, 0, 1);
        prog = W.total * (e <= 0 ? 0 : 0.02 + 0.98 * easeInOut(e));
        W.setProgress(prog, e > 0 && e < 1);
        var nd = (1 - easeOut(clamp((t - run.t0 + 350) / (run.ms + 900), 0, 1))) * 5;
        if (Math.abs(nd - drift) > 1e-3) { drift = nd; frameView(); }
        if (e >= 1 && drift < 1e-3) run = null; else more = true;
      }
      W.uniforms.uTime.value = t / 1000;
      if (t < flowUntil) { W.uniforms.uFlow.value = 1; more = true; }
      else if (W.uniforms.uFlow.value > 0) { W.uniforms.uFlow.value = Math.max(0, 1 - (t - flowUntil) / 1200); more = true; }
      if (!run && more && t - stage.last < 30) return 'skip';
      stage.last = t;
      return more;
    };

    return {
      run: function (onArrive) {
        var done = false;
        function arrive() { if (done) return; done = true; onArrive(); }
        if (reduced()) {
          prog = W.total; W.setProgress(prog, false); W.uniforms.uFlow.value = 0; drift = 0; frameView();
          stage.request();
          arrive();
          return;
        }
        var delay = 350, ms = 2500;
        run = { t0: now() + delay, ms: ms };
        flowUntil = now() + delay + ms + 6000;
        drift = 5; frameView();
        stage.request();
        setTimeout(function () { arrive(); stage.request(); }, delay + ms + 30);
      }
    };
  }

  /* ================================================================== story */

  /* Camera per stop: target, fit radius, azimuth (from the south toward the east), elevation. The story ends
     holding on the edge-computing data center; STATIC_KEY frames the whole path for reduced motion. */
  var KEYS = [
    { t: [-10, 18, -1048], r: 92, az: 40, el: 21 },
    { t: [0, 26, -540], r: 190, az: 17, el: 10, fogF: 4.2, fadeB: 3.6 },
    { t: [0, 6, -4], r: 64, az: 50, el: 31 },
    { t: [330, 10, -36], r: 230, az: 31, el: 29 },
    { t: [-14, 5, 98], r: 58, az: 50, el: 27 },
    { t: [24, 6, 268], r: 54, az: 40, el: 24 }
  ];
  var STATIC_KEY = { t: [262, 0, -400], r: 640, az: 32, el: 50, vy: 0.5, fy: 0.95, fx: 0.95, fogN: 1.6, fogF: 5, fadeA: 0.95, fadeB: 1.35 };

  function keyDist(k, aspect) {
    return fitDist(k.r, aspect, k.fx || (aspect < 1 ? 0.96 : 0.9), k.fy || 0.9);
  }
  function keyView(k, aspect) {
    return { t: V(k.t[0], k.t[1], k.t[2]), r: k.r, az: k.az, el: k.el, d: keyDist(k, aspect), vy: k.vy || 0.5,
      fogN: k.fogN || 1.0, fogF: k.fogF || 3.2, fadeA: k.fadeA || 1.35, fadeB: k.fadeB || 2.9 };
  }
  function camAt(q, aspect) {
    var x = clamp(q - 0.5, 0, KEYS.length - 1);
    var i = Math.min(KEYS.length - 2, Math.floor(x)), t = easeInOut(x - i);
    var a = keyView(KEYS[i], aspect), b = keyView(KEYS[i + 1], aspect);
    var travel = a.t.distanceTo(b.t);
    var lift = 1 + clamp(travel / (a.d + b.d), 0, 0.5) * Math.sin(Math.PI * t);
    return {
      t: a.t.clone().lerp(b.t, t), r: Math.exp(lerp(Math.log(a.r), Math.log(b.r), t)),
      az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t),
      d: Math.exp(lerp(Math.log(a.d), Math.log(b.d), t)) * lift, vy: lerp(a.vy, b.vy, t),
      fogN: lerp(a.fogN, b.fogN, t), fogF: lerp(a.fogF, b.fogF, t), fadeA: lerp(a.fadeA, b.fadeA, t), fadeB: lerp(a.fadeB, b.fadeB, t)
    };
  }

  function story3d(host) {
    var stage = null, world = null, q = 0, isStatic = false, failed = null, flowUntil = 0, queued = false;

    function build() {
      if (stage || failed) return;
      try {
        world = new World({ mode: 'seq', plant: true, towerFrom: 0, seed: 5 });
        stage = new Stage(host, world);
      } catch (e) {
        failed = isoStory(host);
        failed.size(); failed.update(q, isStatic);
        return;
      }
      stage.onResize = apply;
      stage.tick = function (t) {
        var u = world.wires.uniforms, more = false;
        u.uTime.value = t / 1000;
        if (!isStatic && t < flowUntil) { u.uFlow.value = 1; more = true; }
        else if (u.uFlow.value > 0) { u.uFlow.value = isStatic ? 0 : Math.max(0, 1 - (t - flowUntil) / 1200); more = u.uFlow.value > 0; }
        if (more && !stage.fresh && t - stage.last < 30) return 'skip';
        stage.fresh = false;
        stage.last = t;
        return more;
      };
      apply();
    }
    function schedule() {
      if (queued) return;
      queued = true;
      var go = function () { build(); };
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (es) {
          if (es[es.length - 1].isIntersecting) { io.disconnect(); go(); }
        }, { rootMargin: '120% 0px' });
        io.observe(host);
      } else go();
      /* Build ahead of time when the browser is idle after load, so the first scroll does not wait. */
      var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 2500); };
      window.addEventListener('load', function () { setTimeout(function () { idle(go, { timeout: 4000 }); }, 3200); });
    }

    function apply() {
      if (!stage) return;
      var aspect = stage.W / stage.H, W = world.wires, u = W.uniforms;
      var stat = isStatic || reduced();
      var c;
      if (stat) { c = keyView(STATIC_KEY, aspect); c.d = fitDist(STATIC_KEY.r, aspect, 0.95, 0.95); }
      else c = camAt(q, aspect);
      stage.view(c);

      /* Assembly: each stop's parts grow out of the ground, staggered in path order. */
      var moved = false;
      world.groups.forEach(function (g, gi) {
        var bld = stat || gi === 0 ? 1 : smooth((q - (gi - 0.5)) / 0.8);
        g.bld = bld;
        var n = g.length;
        g.forEach(function (p, j) {
          var start = n > 1 ? (j / (n - 1)) * 0.45 : 0;
          var t = stat ? 1 : clamp((bld - start) / 0.35, 0, 1);
          if (p.userData.t === t) return;
          p.userData.t = t;
          moved = true;
          p.visible = t > 0;
          p.scale.y = Math.max(0.001, easeOut(t));
        });
      });
      if (moved) stage.shadowDirty = true;

      /* Conductors are strung behind their supports; current runs from one stop's milestone to the next. */
      var built = -1;
      world.groups.forEach(function (g, gi) {
        var rg = world.ranges[gi];
        if (!rg) return;
        var f = clamp((g.bld - 0.35) / 0.65, 0, 1);
        if (f > 0) built = lerp(rg[0], rg[1], f);
      });
      u.uBuilt.value = stat ? 1e9 : built + 0.01;
      var len, marks = world.marks, drawn = marks.length, heads = false;
      if (stat) len = W.total + 1;
      else {
        var st = Math.floor(clamp(q, 0, drawn + 0.999));
        if (st >= drawn) len = W.total + 1;
        else {
          var from = st === 0 ? 0 : marks[st - 1], to = marks[st], e = smooth((q - st - 0.1) / 0.8);
          len = lerp(from, to, e);
          heads = e > 0 && e < 1;
        }
      }
      W.setProgress(len, heads);
      if (stat) { u.uFlow.value = 0; flowUntil = 0; }
      else flowUntil = now() + 5000;
      stage.fresh = true;
      stage.request();
    }

    return {
      size: function () {
        if (failed) return failed.size();
        if (stage && stage.measure()) apply();
      },
      update: function (qq, st) {
        q = qq; isStatic = !!st;
        if (failed) return failed.update(qq, st);
        if (!stage) { schedule(); if (isStatic) build(); return; }
        apply();
      }
    };
  }

  /* ================================================================== fallback: the shared isometric drawing */

  function isoHero(container) {
    var K = window.ISOKIT;
    if (!K) return { run: function (onArrive) { onArrive(); } };
    container.classList.add('is-iso');
    var r1 = K.r1;
    var svg = K.newSvg(container, 'campus-svg');
    var k = new K.Kit(svg);
    K.buildScene(k, { plant: false, from: 4 });
    var cur = new K.Current(k), e = k.ext;
    svg.setAttribute('viewBox', [r1(e[0] - 8), r1(e[1] - 6), r1(e[2] - e[0] + 14), r1(e[3] - e[1] + 14)].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
    K.fitStroke(svg, cur);
    cur.set(Infinity);
    return {
      run: function (onArrive) {
        if (reduced()) { cur.set(Infinity); onArrive(); return; }
        cur.set(0);
        var ms = 2600, t0 = 0;
        function frame(t) {
          if (!t0) t0 = t;
          var p = clamp((t - t0) / ms, 0, 1);
          cur.set(cur.total * (p < 1 ? 0.03 + 0.97 * easeInOut(p) : 1));
          if (p < 1) requestAnimationFrame(frame); else { cur.set(Infinity); onArrive(); }
        }
        setTimeout(function () { requestAnimationFrame(frame); }, 350);
      }
    };
  }

  function isoStory(host) {
    var K = window.ISOKIT;
    if (!K) return { size: function () {}, update: function () {} };
    var P = K.P, r1 = K.r1;
    var svg = K.newSvg(host, 'story-svg');
    var kit = new K.Kit(svg);
    K.buildScene(kit, { plant: true, from: 0 });
    var current = new K.Current(kit), marks = K.milestones(current), e = kit.ext;
    var box = { x: e[0], y: e[1], w: e[2] - e[0], h: e[3] - e[1] };
    var keys = [
      { f: P(110, -1200, 40), span: 620 }, { f: P(120, -610, 50), span: 1180 }, { f: P(136, 18, 26), span: 560 },
      { f: P(880, -30, 30), span: 1420 }, { f: P(130, 292, 26), span: 580 }, { f: P(90, 500, 16), span: 640 }
    ];
    var W = 1, H = 1, isStatic = false;
    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      svg.setAttribute('viewBox', '0 0 ' + r1(W) + ' ' + r1(H));
    }
    function camAtIso(q) {
      var wide = W > 640;
      var fit = { f: [box.x + box.w / 2, box.y + box.h / 2], s: Math.min(W * 0.9 / box.w, H * (isStatic ? 0.94 : 0.3) / box.h), vy: isStatic ? 0.5 : (wide ? 0.17 : 0.16) };
      if (isStatic) return fit;
      var ks = keys.map(function (k) { return k ? { f: k.f, s: W / (wide ? k.span : k.span * 0.82), vy: 0.5 } : fit; });
      var x = clamp(q - 0.5, 0, ks.length - 1), i = Math.min(ks.length - 2, Math.floor(x)), t = easeInOut(x - i);
      var a = ks[i], b = ks[i + 1];
      return { f: [lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t)], s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)), vy: lerp(a.vy, b.vy, t) };
    }
    function update(q, stat) {
      isStatic = !!stat;
      var cam = camAtIso(q);
      kit.root.setAttribute('transform', 'translate(' + r1(W / 2) + ' ' + r1(H * cam.vy) + ') scale(' + cam.s.toFixed(4) + ') translate(' + r1(-cam.f[0]) + ' ' + r1(-cam.f[1]) + ')');
      var sw = Math.max(0.6, Math.min(2.4, 1 / cam.s));
      svg.style.setProperty('--sw', sw.toFixed(3));
      current.sw = sw;
      kit.groups.forEach(function (g, gi) {
        var b = gi === 0 || isStatic ? 1 : smooth((q - (gi - 0.5)) / 0.8), parts = g._parts, n = parts.length;
        parts.forEach(function (p, j) {
          var t = clamp((b - (n > 1 ? (j / (n - 1)) * 0.6 : 0)) / 0.4, 0, 1);
          if (p._t === t) return;
          p._t = t;
          if (t >= 1) { p.removeAttribute('transform'); p.style.opacity = ''; return; }
          if (p._kind === 'drop') p.setAttribute('transform', 'translate(0 ' + r1(-(1 - easeOut(t)) * 90) + ')');
          p.style.opacity = t <= 0 ? 0 : (p._kind === 'fade' ? t : clamp(t * 2, 0, 1));
        });
      });
      var len, drawn = marks.length;
      if (isStatic) len = Infinity;
      else {
        var st = Math.floor(clamp(q, 0, drawn + 0.999));
        len = st >= drawn ? Infinity : lerp(st === 0 ? 0 : marks[st - 1], marks[st], smooth((q - st - 0.1) / 0.8));
      }
      current.set(len);
    }
    size();
    return { size: size, update: update };
  }

  /* ================================================================== contract */

  window.DEM_ART = {
    id: 'lifelike-3d',
    hero: function (container) {
      if (canGL()) {
        try { return hero3d(container); } catch (e) { container.innerHTML = ''; }
      }
      return isoHero(container);
    },
    story: function (container) {
      if (canGL()) return story3d(container);
      return isoStory(container);
    }
  };
})();
