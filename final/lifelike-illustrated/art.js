/*
  Artwork set 3, "Life-like illustrated": the power path as one continuous aerial panorama, drawn in SVG with
  real proportions, materials and light. Implements window.DEM_ART (see final/shared/ART-CONTRACT.md).
  - Projection: every object has its own camera straight in front of it (a sliding camera, eye 350 m up), so
    each reads as true two-point perspective and the long panorama never shears at its ends.
  - Light: one sun from the upper left. Each face is shaded by its angle to the sun and hazed by distance;
    shadows are flat ink polygons cast onto the ground.
  - Story: the camera flies stop to stop; each stop's structures rise, its conductors are strung, then current
    (gold over an ink casing, with a bright head) runs on. Stop 7 pulls back to the whole island.
  Generic illustration only: no text, no figures, no real place.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var F = 1000, D = 500, HC = 350;
  var PHI = -28 * Math.PI / 180;
  var LV = (function () { var v = [-0.60, 0.70, -0.25], m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; })();
  var AMB = 0.3;
  var SHX = -LV[0] / LV[1], SHZ = -LV[2] / LV[1];

  var INK = '#312439', GOLD = '#EBBE07', WASH = '#f7f5f9', HAZE = '#ece7f0';
  var WIRE = '#5f546a', BUS = '#877d90';

  /* Material tones: [shadow side, full sun]. */
  var MAT = {
    pad: ['#b9b1be', '#ece9ee'],
    concrete: ['#988e9f', '#f0edf2'],
    gravel: ['#a39aa5', '#dad5da'],
    asphalt: ['#958e9c', '#cdc8d2'],
    clad: ['#857b8f', '#f6f4f8'],
    cladDk: ['#6c6276', '#d8d2de'],
    roof: ['#a29aaa', '#fbfafc'],
    steel: ['#6b6373', '#d3ced8'],
    tank: ['#5a5263', '#c3bec9'],
    hrsg: ['#5f566a', '#d2ccd9'],
    stack: ['#736a7e', '#ece8f0'],
    genset: ['#7c7385', '#f0edf2'],
    rtu: ['#81788a', '#ebe8ef'],
    glass: ['#352a3f', '#8e819b'],
    wood: ['#4f4045', '#a08e88'],
    dark: ['#2f2537', '#6a5e73'],
    porcelain: ['#3f3247', '#8d7e96'],
    car: ['#5d5466', '#d6d1db']
  };
  var FIELD = ['#dfe2d6', '#e5e6dd', '#d9ddcf', '#e7e2df', '#e2e4da', '#dcdfd2'];
  var TREE = ['#717d67', '#9ea98e', '#5c5258'];

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function fx(v) { return Math.round(v * 100) / 100; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }

  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (x) { var s = Math.round(clamp(x, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; }).join(''); }
  function mix(a, b, t) { var A = rgb(a), B = rgb(b); return hex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]); }
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hull(P) {
    var p = P.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p;
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i, q;
    for (i = 0; i < p.length; i++) { q = p[i]; while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (i = p.length - 1; i >= 0; i--) { q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  function dp(pts, close) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + fx(pts[i][0]) + ',' + fx(pts[i][1]);
    return close ? s + 'Z' : s;
  }
  function rect(u0, u1, w0, w1, v) { return [[u0, v, w0], [u1, v, w0], [u1, v, w1], [u0, v, w1]]; }
  function ring(u, v, w, r, n) {
    var a = [];
    for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; a.push([u + r * Math.cos(t), v, w + r * Math.sin(t)]); }
    return a;
  }
  function ext0() { return [Infinity, Infinity, -Infinity, -Infinity]; }
  function grow(e, x, y) { if (x < e[0]) e[0] = x; if (y < e[1]) e[1] = y; if (x > e[2]) e[2] = x; if (y > e[3]) e[3] = y; }
  function union(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }
  function hazeAt(Z) { return clamp((Z - 120) / 3300, 0, 0.24); }
  function groundY(Z) { return HC * F / (D + Z); }
  function kAt(Z) { return F / (D + Z); }

  /* ================================================================== scene: batched drawing */

  function Scene(svg, px) {
    this.svg = svg;
    this.px = px;
    this.defs = el('defs', null, svg);
    this.root = el('g', { class: 'll-root' }, svg);
    this.ext = ext0();
    this.boxes = [this.ext];
    this.groups = [];
    this.hops = [];
    this.hopIx = {};
    this.target = this.root;
    this.runs = [];
    this.grads = {};
    this.keeps = [];
    this.n = 0;
    this.G = null;
    this.P = null;
  }
  Scene.prototype.track = function (x, y) { for (var i = 0; i < this.boxes.length; i++) grow(this.boxes[i], x, y); };
  /* Consecutive shapes of the same tone merge into one path; draw order is preserved. */
  Scene.prototype.add = function (k, c, w, d) {
    if (!d) return;
    var last = this.runs[this.runs.length - 1];
    if (k !== 'g' && last && last.k === k && last.c === c && last.w === w) last.d += d;
    else this.runs.push({ k: k, c: c, w: w, d: d });
  };
  Scene.prototype.flush = function () {
    var t = this.target;
    this.runs.forEach(function (r) {
      var v = r.c.indexOf('var(') === 0;
      if (r.k === 'f') {
        if (v) el('path', { d: r.d, class: 'nss', style: 'fill:' + r.c + ';stroke:' + r.c + ';stroke-width:.35' }, t);
        else el('path', { d: r.d, fill: r.c, stroke: r.c, 'stroke-width': 0.35, class: 'nss' }, t);
      } else if (r.k === 's') {
        if (v) el('path', { d: r.d, class: 'nss ln', style: 'stroke:' + r.c + ';stroke-width:' + r.w }, t);
        else el('path', { d: r.d, stroke: r.c, 'stroke-width': r.w, class: 'nss ln' }, t);
      } else if (r.k === 'o') {
        el('path', { d: r.d, fill: r.c, 'fill-opacity': r.w }, t);
      } else {
        el('path', { d: r.d, fill: r.c }, t);
      }
    });
    this.runs = [];
  };
  Scene.prototype.group = function (name) {
    this.flush();
    var g = el('g', { class: 'll-group g-' + name }, this.root);
    var G = { name: name, g: g, parts: [], ext: ext0() };
    this.groups.push(G);
    this.G = G; this.P = null;
    this.target = g;
    this.boxes = [this.ext, G.ext];
    return G;
  };
  /* A part is the unit that assembles: 'grow' rises from its base, 'fade' appears, 'wire' is strung. */
  Scene.prototype.part = function (kind) {
    this.flush();
    var g = el('g', { class: 'll-part' }, this.G.g);
    var P = { g: g, kind: kind || 'grow', ext: ext0(), wires: [], t: -1 };
    this.G.parts.push(P);
    this.P = P;
    this.target = g;
    this.boxes = [this.ext, this.G.ext, P.ext];
    return P;
  };
  Scene.prototype.grad = function (mat, hz, dir) {
    var key = mat + '-' + Math.round(hz * 40) + '-' + dir;
    if (this.grads[key]) return this.grads[key];
    var id = this.px + '-g' + (++this.n);
    var g = el('linearGradient', dir === 'v' ? { id: id, x1: 0, y1: 0, x2: 1, y2: 0 } : { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, this.defs);
    var m = MAT[mat];
    var stops = dir === 'v' ? [[0, 0.56], [0.28, 0.92], [0.62, 0.55], [1, 0.3]] : [[0, 0.95], [0.5, 0.7], [1, 0.34]];
    stops.forEach(function (s) { el('stop', { offset: s[0], 'stop-color': mix(mix(m[0], m[1], s[1]), HAZE, hz) }, g); });
    return (this.grads[key] = id);
  };
  /* Shapes drawn once in <defs> and placed with <use>: towers, poles, trees. */
  Scene.prototype.symbol = function (id, Zref, fn) {
    this.flush();
    var prev = { t: this.target, b: this.boxes };
    var g = el('g', { id: this.px + '-' + id }, this.defs);
    var ext = ext0();
    this.target = g; this.boxes = [ext];
    var V = new View(this, 0, Zref, { norm: kAt(Zref), hz: 0 });
    var out = fn(V, g) || {};
    this.flush();
    this.target = prev.t; this.boxes = prev.b;
    out.ext = ext;
    out.href = '#' + this.px + '-' + id;
    return out;
  };
  Scene.prototype.use = function (sym, x, y, k, style) {
    this.flush();
    var u = el('use', { href: sym.href, transform: 'translate(' + fx(x) + ' ' + fx(y) + ') scale(' + k.toFixed(4) + ')', style: style || null }, this.target);
    var e = sym.ext;
    this.track(x + e[0] * k, y + e[1] * k);
    this.track(x + e[2] * k, y + e[3] * k);
    return u;
  };
  Scene.prototype.defHop = function (id, stop, branch) {
    var h = { id: id, stop: stop, branch: branch, wires: [] };
    this.hops.push(h);
    this.hopIx[id] = h;
  };
  /* A conductor between two screen points: a dead line, plus a cased gold live line when it carries current. */
  Scene.prototype.wire = function (a, b, sag, hop, color, cls) {
    this.flush();
    var L0 = Math.hypot(b[0] - a[0], b[1] - a[1]), s = sag * L0;
    var n = Math.max(2, Math.min(20, Math.round(L0 / 5)));
    var pts = [], len = 0;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + s * 4 * t * (1 - t)]);
      if (i) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    }
    len = Math.max(len, 0.5);
    var d = dp(pts, false);
    var g = el('g', { class: 'll-w' }, this.target);
    var w = { g: g, pts: pts, len: len, h: -1, b: -1 };
    w.dead = el('path', { class: 'll-dead' + (cls ? ' ' + cls : ''), d: d, stroke: color || WIRE }, g);
    var H = hop && this.hopIx[hop];
    if (H) {
      w.cas = el('path', { class: 'll-case', d: d }, g);
      w.live = el('path', { class: 'll-live', d: d }, g);
      [w.cas, w.live].forEach(function (p) { p.style.strokeDasharray = r1(len) + ' ' + r1(len + 4); p.style.strokeDashoffset = r1(len); });
      H.wires.push(w);
    }
    for (var j = 0; j < pts.length; j++) this.track(pts[j][0], pts[j][1]);
    if (this.P) this.P.wires.push(w);
    return w;
  };
  /* Three-phase span between two sets of screen attachment points. */
  Scene.prototype.span = function (A, B, sag, hop, color) {
    for (var i = 0; i < 3; i++) this.wire(A[i], B[i], sag, hop, color);
  };
  Scene.prototype.keep = function (V, u0, u1, w0, w1) { this.keeps.push({ V: V, u0: u0, u1: u1, w0: w0, w1: w1 }); };
  Scene.prototype.kept = function (x, y) {
    for (var i = 0; i < this.keeps.length; i++) {
      var K = this.keeps[i], q = K.V.un(x, y);
      if (q[0] > K.u0 && q[0] < K.u1 && q[1] > K.w0 && q[1] < K.w1) return true;
    }
    return false;
  };

  /* ================================================================== view: one object's camera */

  function View(sc, X, Z, o) {
    o = o || {};
    this.sc = sc; this.X = X; this.Z = Z;
    var ph = o.phi == null ? PHI : o.phi;
    this.c = Math.cos(ph); this.s = Math.sin(ph);
    this.hz = o.hz == null ? hazeAt(Z) : o.hz;
    this.nk = o.norm || 0;
    this.tc = {};
  }
  View.prototype.q = function (u, v, w) {
    var dx = u * this.c - w * this.s, dz = u * this.s + w * this.c, k = F / (D + this.Z + dz);
    var x = this.X + dx * k, y = (HC - v) * k;
    if (this.nk) { x = (x - this.X) / this.nk; y = (y - HC * this.nk) / this.nk; }
    return [x, y];
  };
  View.prototype.p = function (u, v, w) { var r = this.q(u, v, w); this.sc.track(r[0], r[1]); return r; };
  View.prototype.k = function (u, w) { return F / (D + this.Z + u * this.s + w * this.c); };
  View.prototype.depth = function (u, w) { return this.Z + u * this.s + w * this.c; };
  /* Screen x and depth of a local ground point: the anchor for a neighbouring object's own camera. */
  View.prototype.at = function (u, w) {
    var dx = u * this.c - w * this.s, dz = u * this.s + w * this.c;
    return [this.X + dx * F / (D + this.Z + dz), this.Z + dz];
  };
  /* Screen point on the ground back to local (u, w). */
  View.prototype.un = function (x, y) {
    var k = y / HC, dz = F / k - D - this.Z, dx = (x - this.X) / k;
    return [dx * this.c + dz * this.s, -dx * this.s + dz * this.c];
  };
  View.prototype.nw = function (n) { return [n[0] * this.c - n[2] * this.s, n[1], n[0] * this.s + n[2] * this.c]; };
  View.prototype.seen = function (n, q) {
    var N = this.nw(n), dx = q[0] * this.c - q[2] * this.s, dz = q[0] * this.s + q[2] * this.c;
    return N[0] * -dx + N[1] * (HC - q[1]) + N[2] * (-(D + this.Z) - dz) > 0;
  };
  View.prototype.col = function (mat, I) { var m = MAT[mat]; return mix(mix(m[0], m[1], clamp(I, 0, 1)), HAZE, this.hz); };
  View.prototype.tone = function (mat, n, bias) {
    var key = mat + n.join(',') + (bias || 0);
    if (this.tc[key]) return this.tc[key];
    var N = this.nw(n), d = N[0] * LV[0] + N[1] * LV[1] + N[2] * LV[2];
    return (this.tc[key] = this.col(mat, AMB + (1 - AMB) * Math.max(0, d) + (bias || 0)));
  };
  View.prototype.hzc = function (c) { return this.hz ? mix(c, HAZE, this.hz) : c; };
  View.prototype.d = function (pts3, close) {
    var self = this;
    return dp(pts3.map(function (q) { return self.p(q[0], q[1], q[2]); }), close);
  };
  View.prototype.poly = function (pts3, fill) { this.sc.add('f', fill, 0, this.d(pts3, true)); };
  View.prototype.face = function (pts3, n, mat, bias) {
    var c = [0, 0, 0];
    pts3.forEach(function (q) { c[0] += q[0] / pts3.length; c[1] += q[1] / pts3.length; c[2] += q[2] / pts3.length; });
    if (!this.seen(n, c)) return false;
    this.poly(pts3, this.tone(mat, n, bias));
    return true;
  };
  View.prototype.lines = function (segs, color, w) {
    var d = '', self = this;
    segs.forEach(function (s) { d += self.d(s, false); });
    this.sc.add('s', color, w, d);
  };
  View.prototype.shadow = function (pts3, g, op) {
    g = g || 0;
    var su = SHX * this.c + SHZ * this.s, sw = -SHX * this.s + SHZ * this.c;
    var flat = pts3.map(function (q) { var dv = Math.max(0, q[1] - g); return [q[0] + su * dv, q[2] + sw * dv]; });
    var h = hull(flat);
    this.sc.add('o', INK, r1((op || 0.2) * (1 - this.hz * 1.5) * 100) / 100, this.d(h.map(function (p) { return [p[0], g, p[1]]; }), true));
  };
  View.prototype.box = function (u, v, w, du, dv, dw, mat, o) {
    o = o || {};
    var u1 = u + du, v1 = v + dv, w1 = w + dw, only = o.only, vis = {};
    if (only !== 'top' && o.shadow !== false) {
      this.shadow([[u, v1, w], [u1, v1, w], [u1, v1, w1], [u, v1, w1], [u, v, w], [u1, v, w], [u1, v, w1], [u, v, w1]], o.g == null ? v : o.g, o.so);
    }
    if (only !== 'top') {
      vis.l = this.face([[u, v, w1], [u, v, w], [u, v1, w], [u, v1, w1]], [-1, 0, 0], mat, o.sb);
      vis.b = this.face([[u1, v, w1], [u, v, w1], [u, v1, w1], [u1, v1, w1]], [0, 0, 1], mat, o.sb);
      vis.f = this.face([[u, v, w], [u1, v, w], [u1, v1, w], [u, v1, w]], [0, 0, -1], mat, o.sb);
      vis.r = this.face([[u1, v, w], [u1, v, w1], [u1, v1, w1], [u1, v1, w]], [1, 0, 0], mat, o.sb);
    }
    if (only !== 'sides') vis.t = this.face([[u, v1, w], [u1, v1, w], [u1, v1, w1], [u, v1, w1]], [0, 1, 0], o.top || mat, o.tb == null ? 0.05 : o.tb);
    return vis;
  };
  /* Vertical cylinder (optionally tapered): hull of its rings, shaded by a lit-left gradient. */
  View.prototype.cyl = function (u, w, v, r, h, mat, o) {
    o = o || {};
    var n = o.n || 14, rt = o.r1 == null ? r : o.r1, bot = ring(u, v, w, r, n), top = ring(u, v + h, w, rt, n), self = this;
    if (o.shadow !== false) this.shadow(bot.concat(top), o.g == null ? v : o.g, o.so);
    var pts = bot.concat(top).map(function (q) { return self.p(q[0], q[1], q[2]); });
    var side = dp(hull(pts), true);
    if (o.flat) this.sc.add('f', this.tone(mat, [0, 0, -1], o.sb), 0, side);
    else this.sc.add('g', 'url(#' + this.sc.grad(mat, this.hz, 'v') + ')', 0, side);
    if (!o.open) this.sc.add('f', this.tone(mat, [0, 1, 0], 0.04), 0, this.d(top, true));
  };
  /* Horizontal cylinder along u, centered at height v and depth w. */
  View.prototype.hcyl = function (u0, u1, v, w, r, mat, o) {
    o = o || {};
    var n = 12, a0 = [], a1 = [], self = this;
    for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; a0.push([u0, v + r * Math.sin(t), w + r * Math.cos(t)]); a1.push([u1, v + r * Math.sin(t), w + r * Math.cos(t)]); }
    if (o.shadow !== false) this.shadow(a0.concat(a1), o.g || 0, o.so);
    var pts = a0.concat(a1).map(function (q) { return self.p(q[0], q[1], q[2]); });
    this.sc.add('g', 'url(#' + this.sc.grad(mat, this.hz, 'h') + ')', 0, dp(hull(pts), true));
    this.sc.add('f', this.tone(mat, [1, 0, 0]), 0, this.d(a1, true));
  };
  function viewAt(sc, V, u, w) { var a = V.at(u, w); return new View(sc, a[0], a[1]); }

  /* ================================================================== equipment */

  function darker(c, t) { return mix(c, INK, t); }

  /* Repeated small units (rooftop units, generator enclosures, cars): every side, then every top. */
  function units(V, list, du, dv, dw, mat, v0, o) {
    o = o || {};
    list.forEach(function (p) { V.box(p[0], v0, p[1], p[2] || du, dv, p[3] || dw, mat, { only: 'sides', so: o.so || 0.15 }); });
    list.forEach(function (p) { V.box(p[0], v0, p[1], p[2] || du, dv, p[3] || dw, mat, { only: 'top' }); });
  }

  function stand(V, u, w, h) {
    V.box(u - 0.3, 0, w - 0.3, 0.6, h, 0.6, 'steel', { so: 0.1 });
    V.cyl(u, w, h, 0.24, 1.5, 'porcelain', { n: 8, flat: true, shadow: false });
    return [u, h + 1.5, w];
  }

  function breaker(V, u, w) {
    V.box(u - 0.6, 0, w - 0.6, 1.2, 1.8, 1.2, 'steel', { so: 0.1 });
    V.hcyl(u - 1.4, u + 1.4, 2.5, w, 0.6, 'tank', { g: 0, so: 0.12 });
    V.cyl(u - 0.9, w, 3, 0.18, 2.2, 'porcelain', { n: 8, flat: true, shadow: false });
    V.cyl(u + 0.9, w, 3, 0.18, 2.2, 'porcelain', { n: 8, flat: true, shadow: false });
  }

  /* A dead-end H-frame: two lattice columns and a beam, with insulator strings. Returns the phase points. */
  function hframe(V, u, w, along, span, h) {
    var aw = along === 'w', cols = aw ? [[u, w + span / 2], [u, w - span / 2]] : [[u - span / 2, w], [u + span / 2, w]];
    var lace = [], ft = darker(V.tone('steel', [0, 0, -1]), 0.25);
    function col(c) {
      V.box(c[0] - 0.55, 0, c[1] - 0.55, 1.1, h, 1.1, 'steel', { so: 0.11 });
      for (var z = 0; z + 1.6 <= h; z += 1.6) lace.push([[c[0] - 0.55, z, c[1] - 0.55], [c[0] + 0.55, z + 1.6, c[1] - 0.55]]);
    }
    col(cols[0]);
    if (aw) V.box(u - 0.5, h - 1.3, w - span / 2, 1, 1.3, span, 'steel', { g: 0, so: 0.1 });
    else V.box(u - span / 2, h - 1.3, w - 0.5, span, 1.3, 1, 'steel', { g: 0, so: 0.1 });
    col(cols[1]);
    V.lines(lace, ft, 0.45);
    var ph = [0.2, 0.5, 0.8].map(function (f) { return aw ? [u, h - 3.7, w - span / 2 + span * f] : [u - span / 2 + span * f, h - 3.7, w]; });
    V.lines(ph.map(function (p) { return [[p[0], h - 1.3, p[2]], p]; }), V.hzc('#43314d'), 1.7);
    return ph;
  }

  function transformer(V, u, w, L, W, H) {
    V.box(u - 1.2, 0, w - 4.8, L + 2.4, 0.6, W + 6, 'concrete', { tb: 0, so: 0.08 });
    var top = H + 0.6;
    V.box(u, 0.6, w, L, H, W, 'tank');
    V.hcyl(u + 1.2, u + L * 0.62, top + 1.9, w + W - 1.6, 1.0, 'tank', { g: top, so: 0.14 });
    V.lines([[[u + 2, top, w + W - 1.6], [u + 2, top + 1, w + W - 1.6]], [[u + L * 0.55, top, w + W - 1.6], [u + L * 0.55, top + 1, w + W - 1.6]]], V.tone('steel', [0, 0, -1]), 0.6);
    var hv = [], lv = [];
    [0.3, 0.5, 0.7].forEach(function (f) { var x = u + L * f; V.cyl(x, w + W * 0.58, top, 0.34, 4.2, 'porcelain', { n: 9, flat: true, shadow: false }); hv.push([x, top + 4.2, w + W * 0.58]); });
    [0.32, 0.5, 0.68].forEach(function (f) { var x = u + L * f; V.cyl(x, w + W * 0.2, top, 0.26, 2.1, 'porcelain', { n: 8, flat: true, shadow: false }); lv.push([x, top + 2.1, w + W * 0.2]); });
    /* Radiator bank on the front: a slab of fins. */
    var rw = w - 3.4;
    V.box(u + 1, 1.2, rw, L - 2, H - 1.8, 3.2, 'tank', { g: 0, so: 0.12 });
    var fins = [], ft = darker(V.tone('tank', [0, 0, -1]), 0.3), tt = darker(V.tone('tank', [0, 1, 0]), 0.22), tops = [];
    for (var x = u + 1.35; x < u + L - 1.2; x += 0.5) { fins.push([[x, 1.4, rw], [x, H - 0.8, rw]]); tops.push([[x, H - 0.6, rw], [x, H - 0.6, rw + 3.2]]); }
    V.lines(fins, ft, 0.45);
    V.lines(tops, tt, 0.4);
    return { hv: hv, lv: lv };
  }

  function fence(V, u0, w0, u1, w1, h, side) {
    var edges = side === 'back' ? [[[u0, w1], [u1, w1]], [[u0, w0], [u0, w1]]] : [[[u0, w0], [u1, w0]], [[u1, w0], [u1, w1]]];
    var mesh = '', posts = [], rails = [];
    edges.forEach(function (e) {
      var a = e[0], b = e[1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6));
      mesh += V.d([[a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], h, b[1]], [a[0], h, a[1]]], true);
      for (var i = 0; i <= n; i++) { var x = lerp(a[0], b[0], i / n), z = lerp(a[1], b[1], i / n); posts.push([[x, 0, z], [x, h, z]]); }
      rails.push([[a[0], h, a[1]], [b[0], h, b[1]]]);
    });
    V.sc.add('o', V.hzc('#5d5266'), 0.09, mesh);
    var pc = V.hzc('#7d7386');
    V.lines(posts, pc, 0.45);
    V.lines(rails, pc, 0.5);
  }

  /* A long data hall: clad box, ribbed and louvered facades, parapet, rooftop units. */
  function hall(V, u, w, L, W, H, o) {
    o = o || {};
    var vis = V.box(u, 0, w, L, H, W, o.mat || 'clad', { top: 'roof', so: 0.17 });
    var fT = V.tone(o.mat || 'clad', [0, 0, -1]), rT = V.tone(o.mat || 'clad', [1, 0, 0]);
    var x, segs = [];
    if (vis.f) {
      V.poly([[u, 0, w], [u + L, 0, w], [u + L, 0.7, w], [u, 0.7, w]], darker(fT, 0.14));
      for (x = u + (o.rib || 3); x < u + L - 0.5; x += o.rib || 3) segs.push([[x, 0.7, w], [x, H - 0.3, w]]);
      V.lines(segs, darker(fT, 0.09), 0.45);
      var louv = '', hatch = [];
      var lw = o.louver || 12, step = o.louverStep || 28;
      for (x = u + 8; x + lw < u + L - 4; x += step) {
        louv += V.d([[x, H - 4.4, w], [x + lw, H - 4.4, w], [x + lw, H - 1.4, w], [x, H - 1.4, w]], true);
        for (var z = H - 4.1; z < H - 1.5; z += 0.6) hatch.push([[x, z, w], [x + lw, z, w]]);
      }
      V.sc.add('f', darker(fT, 0.2), 0, louv);
      V.lines(hatch, darker(fT, 0.34), 0.35);
      var doors = '';
      (o.doors || []).forEach(function (dx) { doors += V.d([[u + dx, 0.7, w], [u + dx + 4.2, 0.7, w], [u + dx + 4.2, 5.4, w], [u + dx, 5.4, w]], true); });
      V.sc.add('f', V.col('dark', 0.55), 0, doors);
    }
    if (vis.r) {
      segs = [];
      for (x = w + 2.5; x < w + W - 0.5; x += 2.5) segs.push([[u + L, 0.7, x], [u + L, H - 0.3, x]]);
      V.lines(segs, darker(rT, 0.1), 0.45);
    }
    var tT = V.tone('roof', [0, 1, 0], 0.05);
    V.lines([[[u + 1, H, w + 1], [u + L - 1, H, w + 1], [u + L - 1, H, w + W - 1], [u + 1, H, w + W - 1], [u + 1, H, w + 1]]], darker(tT, 0.16), 0.5);
    if (o.rtu) {
      units(V, o.rtu, o.rtuSize[0], o.rtuSize[1], o.rtuSize[2], 'rtu', H);
      var fans = '';
      o.rtu.forEach(function (p) {
        var fu = o.rtuSize[0], fw = o.rtuSize[2], v1 = H + o.rtuSize[1] + 0.02;
        var nf = Math.max(1, Math.round(fu / 3.4));
        for (var i = 0; i < nf; i++) fans += V.d(ring(p[0] + fu * (i + 0.5) / nf, v1, p[1] + fw / 2, Math.min(fw, fu / nf) * 0.36, 10), true);
      });
      V.sc.add('f', V.col('dark', 0.6), 0, fans);
    }
    return vis;
  }

  /* Glazed office with a curtain wall: glass faces, mullions, a lilac sheen. */
  function office(V, u, w, L, W, H) {
    var vis = V.box(u, 0, w, L, H, W, 'glass', { top: 'roof', so: 0.17, sb: 0.06 });
    var mul = [], mc = V.hzc('#b9afc3');
    if (vis.f) {
      for (var x = u + 2.4; x < u + L; x += 2.4) mul.push([[x, 0, w], [x, H, w]]);
      for (var z = 3.6; z < H; z += 3.6) mul.push([[u, z, w], [u + L, z, w]]);
      V.sc.add('g', 'url(#' + V.sc.px + '-sheen)', 0, V.d([[u, 0, w], [u + L, 0, w], [u + L, H, w], [u, H, w]], true));
    }
    if (vis.r) {
      for (var y = w + 2.4; y < w + W; y += 2.4) mul.push([[u + L, 0, y], [u + L, H, y]]);
      for (var z2 = 3.6; z2 < H; z2 += 3.6) mul.push([[u + L, z2, w], [u + L, z2, w + W]]);
    }
    V.lines(mul, mc, 0.4);
    V.lines([[[u + 0.6, H, w + 0.6], [u + L - 0.6, H, w + 0.6], [u + L - 0.6, H, w + W - 0.6], [u + 0.6, H, w + W - 0.6], [u + 0.6, H, w + 0.6]]], darker(V.tone('roof', [0, 1, 0]), 0.15), 0.45);
  }

  /* Paved lot with stall lines along u. */
  function parking(V, u0, u1, w0, w1, cars, rnd) {
    V.poly(rect(u0, u1, w0, w1, 0.02), V.col('asphalt', 0.84));
    var segs = [], lc = V.hzc('#f3f1f5'), mid = (w0 + w1) / 2;
    for (var x = u0 + 1; x <= u1 - 1; x += 2.8) { segs.push([[x, 0.03, w0 + 1], [x, 0.03, w0 + 5.6]]); segs.push([[x, 0.03, w1 - 5.6], [x, 0.03, w1 - 1]]); }
    V.lines(segs, lc, 0.4);
    if (!cars) return;
    var A = [], B = [];
    for (var c = u0 + 1.4; c < u1 - 2.4; c += 2.8) {
      [[w0 + 1.2, 1], [w1 - 5.4, 1]].forEach(function (row) { if (rnd() < cars) (rnd() < 0.55 ? A : B).push([c, row[0], 1.9, 4.3]); });
    }
    void mid;
    units(V, A, 1.9, 1.45, 4.3, 'car', 0.02, { so: 0.12 });
    units(V, B, 1.9, 1.45, 4.3, 'concrete', 0.02, { so: 0.12 });
  }

  /* ================================================================== symbols */

  function towerSym(sc) {
    return sc.symbol('tower', 560, function (V) {
      var lv = [0, 6.5, 12.5, 17.5, 21.5, 25];
      function hw(v) { return lerp(4.6, 1.3, v / 25); }
      var su = SHX * V.c + SHZ * V.s, sw = -SHX * V.s + SHZ * V.c;
      function sh(q) { return [q[0] + su * q[1], 0, q[2] + sw * q[1]]; }
      /* Cast shadow: the body as a tapering band, the crossarm as a thin bar. */
      var body = [[-4.6, 0, -4.6], [4.6, 0, 4.6], [-4.6, 0, 4.6], [4.6, 0, -4.6], sh([-1.3, 25, -1.3]), sh([1.3, 25, 1.3]), sh([0, 31, -4]), sh([0, 31, 4])];
      var bh = hull(body.map(function (q) { return [q[0], q[2]]; }));
      var arm = hull([sh([-1, 31.8, -12.5]), sh([1, 31.8, -12.5]), sh([-1, 31.8, 12.5]), sh([1, 31.8, 12.5])].map(function (q) { return [q[0], q[2]]; }));
      sc.add('o', INK, 0.09, V.d(bh.map(function (p) { return [p[0], 0, p[1]]; }), true) + V.d(arm.map(function (p) { return [p[0], 0, p[1]]; }), true));
      var front = [], back = [];
      function edge(a, b, isBack) { (isBack ? back : front).push([a, b]); }
      /* Legs: the corner at (-u, +w) is the far one. */
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) {
        edge([s[0] * 4.6, 0, s[1] * 4.6], [s[0] * 1.3, 25, s[1] * 1.3], s[0] < 0 && s[1] > 0);
      });
      /* Faces: -w and +u face the viewer; +w and -u face away. */
      for (var i = 0; i < lv.length - 1; i++) {
        var a0 = lv[i], a1 = lv[i + 1], h0 = hw(a0), h1 = hw(a1);
        [[0, -1, false], [1, 1, false], [0, 1, true], [1, -1, true]].forEach(function (f) {
          var ax = f[0], sg = f[1], bk = f[2];
          function P(t, v, h) { return ax === 0 ? [t * h, v, sg * h] : [sg * h, v, t * h]; }
          edge(P(-1, a0, h0), P(1, a1, h1), bk);
          edge(P(1, a0, h0), P(-1, a1, h1), bk);
          edge(P(-1, a1, h1), P(1, a1, h1), bk);
        });
      }
      /* Head: the legs splay along w to the crossarm, leaving a window for the middle phase. */
      [-1, 1].forEach(function (s) {
        edge([-1.3, 25, s * 1.3], [-1, 31, s * 4.2], s > 0);
        edge([1.3, 25, s * 1.3], [1, 31, s * 4.2], false);
        edge([1.3, 25, s * 1.3], [1, 31, s * 2.2], false);
      });
      /* Crossarm: a box truss along w. */
      [-1, 1].forEach(function (s) {
        edge([s, 31, -12.5], [s, 31, 12.5], s < 0);
        edge([s, 32.6, -12.5], [s, 32.6, 12.5], s < 0);
        for (var zi = 0; zi < 16; zi++) { var z = -12.5 + zi * 25 / 16, lo = zi % 2 === 0; edge([s, lo ? 31 : 32.6, z], [s, lo ? 32.6 : 31, z + 25 / 16], s < 0); }
      });
      [-12.5, 12.5].forEach(function (z) { edge([-1, 31, z], [1, 31, z], false); edge([-1, 32.6, z], [1, 32.6, z], false); edge([1, 31, z], [1, 32.6, z], false); });
      /* Earth-wire peaks. */
      [-1, 1].forEach(function (s) {
        edge([-1, 32.6, s * 3.2], [0, 37.5, s * 4.4], s > 0);
        edge([1, 32.6, s * 3.2], [0, 37.5, s * 4.4], false);
        edge([1, 32.6, s * 5.6], [0, 37.5, s * 4.4], false);
      });
      V.lines(back, 'var(--s2)', 0.5);
      V.lines(front, 'var(--s1)', 0.75);
      var ph = [-11, 0, 11];
      V.lines(ph.map(function (z) { return [[0, 31, z], [0, 27.3, z]]; }), 'var(--s3)', 1.8);
      return { ph: ph.map(function (z) { return V.q(0, 27.3, z); }), ew: [-1, 1].map(function (s) { return V.q(0, 37.5, s * 4.4); }) };
    });
  }

  /* Steel monopole for the dedicated tap: the line runs along w, davit arms along u. */
  function monoSym(sc) {
    return sc.symbol('mono', 560, function (V) {
      V.cyl(0, 0, 0, 1.25, 36, 'steel', { r1: 0.55, n: 12, so: 0.12 });
      var arms = [[33, 1], [28.5, -1], [24, 1]], ph = [];
      V.lines(arms.map(function (a) { return [[a[1] * 0.5, a[0], 0], [a[1] * 4.6, a[0] + 0.7, 0]]; }), V.tone('steel', [0, 0, -1], -0.15), 1.5);
      V.lines(arms.map(function (a) { ph.push([a[1] * 4.4, a[0] - 1.9, 0]); return [[a[1] * 4.4, a[0] + 0.6, 0], [a[1] * 4.4, a[0] - 1.9, 0]]; }), '#43314d', 1.7);
      V.lines([[[0, 36, 0], [0, 38, 0]]], V.tone('steel', [0, 0, -1]), 1);
      return { ph: ph.map(function (p) { return V.q(p[0], p[1], p[2]); }), ew: [V.q(0, 38, 0)] };
    });
  }

  /* Wood distribution pole, the feeder running along u; optionally with a pole-top transformer. */
  function poleSym(sc, xf) {
    return sc.symbol(xf ? 'polex' : 'pole', 230, function (V) {
      V.cyl(0, 0, 0, 0.32, 12.3, 'wood', { r1: 0.24, n: 8, so: 0.16 });
      V.box(-0.13, 10.6, -1.5, 0.26, 0.26, 3, 'wood', { shadow: false });
      var ph = [[0, 11.3, -1.25], [0, 11.3, 1.25], [0, 12.85, 0]];
      V.lines(ph.map(function (p) { return [[p[0], p[1] - 0.45, p[2]], p]; }), '#43314d', 2);
      var out = { ph: ph.map(function (p) { return V.q(p[0], p[1], p[2]); }) };
      if (xf) {
        V.lines([[[0.2, 8.7, 0], [0.62, 8.7, 0]]], V.tone('steel', [0, 0, -1]), 1);
        V.cyl(0.72, 0, 7.7, 0.5, 1.6, 'tank', { n: 10, shadow: false });
        V.lines([[[0.72, 9.3, 0], [0.72, 9.8, 0]]], '#43314d', 1.6);
        out.xf = V.q(0.72, 9.8, 0);
      }
      return out;
    });
  }

  function blob(cx, cy, r, n, rnd) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2, rr = r * (0.86 + rnd() * 0.2); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]); }
    var s = '';
    for (var j = 0; j < n; j++) {
      var p = pts[j], q = pts[(j + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      s += (j ? '' : 'M' + fx((pts[n - 1][0] + p[0]) / 2) + ',' + fx((pts[n - 1][1] + p[1]) / 2)) + 'Q' + fx(p[0]) + ',' + fx(p[1]) + ' ' + fx(m[0]) + ',' + fx(m[1]);
    }
    return s + 'Z';
  }
  function treeSym(sc) {
    sc.flush();
    var g = el('g', { id: sc.px + '-tree' }, sc.defs), rnd = rng(7);
    el('ellipse', { cx: 1.15, cy: -0.32, rx: 1.45, ry: 0.5, fill: INK, 'fill-opacity': 0.14, transform: 'rotate(-14 1.15 -0.32)' }, g);
    el('path', { d: 'M-0.07,0L-0.05,-0.7L0.05,-0.7L0.07,0Z', style: 'fill:var(--t0)' }, g);
    /* A crown of three lobes in shade, two catching the sun on the upper left. */
    el('path', { d: blob(-0.42, -1.0, 0.62, 8, rnd) + blob(0.42, -1.04, 0.6, 8, rnd) + blob(0, -1.5, 0.66, 8, rnd), style: 'fill:var(--t1)' }, g);
    el('path', { d: blob(-0.36, -1.18, 0.42, 7, rnd) + blob(-0.08, -1.62, 0.44, 7, rnd), style: 'fill:var(--t2)' }, g);
    return { href: '#' + sc.px + '-tree', ext: [-1.1, -2.3, 2.6, 0.3] };
  }

  /* ================================================================== the power path */

  var STOPS = ['generation', 'transmission', 'substation', 'hyperscale', 'feeder', 'datacenter'];

  function buildAll(sc, opt) {
    var hero = !!opt.hero;
    var S = { tower: towerSym(sc), mono: monoSym(sc), pole: poleSym(sc, false), polex: poleSym(sc, true), tree: treeSym(sc) };
    var Vp = new View(sc, 40, 760);
    var Vs = new View(sc, 1250, 330);
    var Vc = viewAt(sc, Vs, 215, 330);
    var Vd = viewAt(sc, Vs, 350, -24);
    var out = { towers: [] };

    sc.defHop('g1', 0, 'trunk'); sc.defHop('g2', 0, 'trunk');
    for (var t = 0; t <= 5; t++) sc.defHop('t' + t, 1, 'trunk');
    sc.defHop('s1', 2, 'trunk'); sc.defHop('s2', 2, 'trunk'); sc.defHop('s3', 2, 'trunk');
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(function (h) { sc.defHop(h, 3, 'hyper'); });
    ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].forEach(function (h) { sc.defHop(h, 4, 'feed'); });
    sc.defHop('d1', 5, 'feed'); sc.defHop('d2', 5, 'feed');

    /* ---- 0 generation */
    sc.group('generation');
    var plantG = plant(sc, Vp, hero);
    var gA = { ph: plantG.ph.map(function (p) { return Vp.q(p[0], p[1], p[2]); }), X: Vp.at(212, -36)[0], Z: Vp.at(212, -36)[1] };

    /* ---- 1 transmission */
    sc.group('transmission');
    var inG = { u: 10, w: 55, span: 40, h: 17 };
    var inPh = [0.2, 0.5, 0.8].map(function (f) { return Vs.q(inG.u, inG.h - 3.7, inG.w - inG.span / 2 + inG.span * f); });
    var sA = Vs.at(inG.u, inG.w);
    var prev = gA.ph, prevEw = null, tw;
    for (var i = 1; i <= 5; i++) {
      var f = i / 6, X = lerp(gA.X, sA[0], f), Z = lerp(gA.Z, sA[1], f), k = kAt(Z), y = groundY(Z), hz = hazeAt(Z);
      var tph = S.tower.ph.map(function (p) { return [X + p[0] * k, y + p[1] * k]; });
      var tew = S.tower.ew.map(function (p) { return [X + p[0] * k, y + p[1] * k]; });
      var wc = mix(WIRE, HAZE, hz);
      if (!hero || i >= 4) {
        var P = sc.part();
        sc.use(S.tower, X, y, k, '--s1:' + mix('#6d6576', HAZE, hz) + ';--s2:' + mix('#aaa2b2', HAZE, hz) + ';--s3:' + mix('#43314d', HAZE, hz));
        out.towers.push(P.ext);
        sc.part('wire');
        sc.span(prev, tph, 0.05, hero && i < 4 ? null : 't' + (i - 1), wc);
        if (prevEw) { sc.wire(prevEw[0], tew[0], 0.04, null, wc, 'is-earth'); sc.wire(prevEw[1], tew[1], 0.04, null, wc, 'is-earth'); }
      }
      prev = tph; prevEw = tew; tw = { X: X, Z: Z };
      if (i === 2 || i === 4) (sc.lineViews = sc.lineViews || []).push(new View(sc, X, Z));
    }
    sc.part('wire');
    sc.span(prev, inPh, 0.045, 't5', mix(WIRE, HAZE, hazeAt(sA[1])));
    void tw;

    /* ---- 2 transmission substation */
    sc.group('substation');
    var sub = substation(sc, Vs, inG);

    /* ---- 3 hyperscale campus, on its own high-voltage tap */
    sc.group('hyperscale');
    sc.part('wire');
    var busEnd = [49, 55, 61].map(function (wl) { return Vs.q(124, 9.3, wl); });
    var tapPh = sub.tapG.map(function (p) { return Vs.q(p[0], p[1], p[2]); });
    sc.span(busEnd, tapPh, 0.03, 'h1', BUS);
    var cG = { u: -88, w: -8, span: 32, h: 17 };
    var cPh = [0.2, 0.5, 0.8].map(function (f) { return Vc.q(cG.u - cG.span / 2 + cG.span * f, cG.h - 3.7, cG.w); });
    var tA = Vs.at(124, 104), cA = Vc.at(cG.u, cG.w);
    var mprev = tapPh;
    [1 / 3, 2 / 3].forEach(function (fr, j) {
      var X = lerp(tA[0], cA[0], fr), Z = lerp(tA[1], cA[1], fr), k = kAt(Z), y = groundY(Z);
      sc.part();
      sc.use(S.mono, X, y, k);
      var mph = S.mono.ph.map(function (p) { return [X + p[0] * k, y + p[1] * k]; });
      sc.part('wire');
      sc.span(mprev, mph, 0.04, 'h' + (j + 2), mix(WIRE, HAZE, hazeAt(Z)));
      mprev = mph;
    });
    var camp = campus(sc, Vc, cG, function () { sc.span(mprev, cPh, 0.04, 'h4', mix(WIRE, HAZE, Vc.hz)); });
    void camp;

    /* ---- 4 distribution feeder */
    sc.group('feeder');
    sc.part('wire');
    var swIn = [104, 110, 116].map(function (x) { return Vs.q(x, 4.6, 9); });
    sub.lv.forEach(function (set) { sc.span(set.map(function (p) { return Vs.q(p[0], p[1], p[2]); }), swIn, 0.12, 'f1', BUS); });
    var risPh = sub.riser.map(function (p) { return Vs.q(p[0], p[1], p[2]); });
    sc.span([118, 120, 122].map(function (x) { return Vs.q(x, 4.6, 9); }), risPh, 0.08, 'f2', BUS);
    var pprev = risPh, poles = [178, 216, 254, 292];
    poles.forEach(function (pu, j) {
      var b = Vs.p(pu, 0, 8), k = Vs.k(pu, 8);
      sc.part();
      sc.use(S.pole, b[0], b[1], k);
      var pph = S.pole.ph.map(function (p) { return [b[0] + p[0] * k, b[1] + p[1] * k]; });
      sc.part('wire');
      sc.span(pprev, pph, 0.05, 'f' + (j + 3), WIRE);
      pprev = pph;
    });

    /* ---- 5 the smaller data center, on the feeder */
    sc.group('datacenter');
    datacenter(sc, Vd, S, pprev);

    /* ---- the land, under everything */
    ground(sc, [Vp, Vs, Vc, Vd], S, hero);

    out.groups = sc.groups;
    return out;
  }

  function plant(sc, V, hero) {
    var rnd = rng(11);
    sc.part('fade');
    V.poly(rect(-34, 258, -88, 128, 0), V.col('pad', 0.9));
    V.poly(rect(160, 224, -64, -8, 0.04), V.col('gravel', 0.8));
    V.poly(rect(86, 96, -230, -88, 0.02), V.col('asphalt', 0.85));
    sc.keep(V, -50, 290, -128, 140);
    if (hero) return { ph: [0.2, 0.5, 0.8].map(function (f) { return [212, 14.3, -54 + 36 * f]; }) };

    /* Air-cooled condenser: a fan deck on columns. */
    sc.part();
    var cols = [];
    for (var cu = 6; cu <= 76; cu += 14) for (var cw = 82; cw <= 113; cw += 15.5) cols.push([[cu, 0, cw], [cu, 16, cw]]);
    V.shadow([[4, 21, 80], [78, 21, 80], [78, 21, 114], [4, 21, 114]], 0, 0.16);
    V.lines(cols, V.tone('steel', [0, 0, -1], -0.1), 0.7);
    V.box(4, 16, 80, 74, 5, 34, 'steel', { top: 'cladDk', shadow: false });
    var fans = '';
    for (var fu = 0; fu < 5; fu++) for (var fw = 0; fw < 2; fw++) fans += V.d(ring(11.5 + fu * 14.4, 21.05, 89 + fw * 16, 5.4, 16), true);
    sc.add('f', V.col('dark', 0.5), 0, fans);

    sc.part();
    V.cyl(116, 104, 0, 10, 13, 'clad', { n: 20 });
    V.cyl(146, 108, 0, 6, 9, 'clad', { n: 16 });

    /* Turbine hall. */
    sc.part();
    var vis = V.box(0, 0, 0, 60, 28, 55, 'cladDk', { top: 'roof' });
    var fT = V.tone('cladDk', [0, 0, -1]), segs = [];
    if (vis.f) {
      for (var x = 2.5; x < 60; x += 2.5) segs.push([[x, 0.6, 0], [x, 21, 0]]);
      V.lines(segs, darker(fT, 0.08), 0.45);
      V.poly([[2, 21.5, 0], [58, 21.5, 0], [58, 25, 0], [2, 25, 0]], V.col('glass', 0.62));
      V.lines([[[2, 23.2, 0], [58, 23.2, 0]]], V.hzc('#b6abc0'), 0.4);
      V.poly([[40, 0, 0], [49, 0, 0], [49, 13, 0], [40, 13, 0]], darker(fT, 0.28));
      var slats = [];
      for (var z = 0.8; z < 13; z += 0.8) slats.push([[40, z, 0], [49, z, 0]]);
      V.lines(slats, darker(fT, 0.4), 0.35);
      V.poly([[10, 0, 0], [12.2, 0, 0], [12.2, 2.6, 0], [10, 2.6, 0]], V.col('dark', 0.5));
    }
    units(V, [[8, 12], [22, 12], [36, 12], [8, 34], [22, 34]], 5, 1.8, 4, 'rtu', 28);

    /* Heat-recovery boilers, ducts, stacks: the far train first. */
    [[30, 38], [4, 12]].forEach(function (tr) {
      sc.part();
      V.box(60, 3, tr[0] + 2, 8, 14, 12, 'hrsg', { so: 0.14 });
      var hv = V.box(68, 0, tr[0], 60, 30, 16, 'hrsg');
      if (hv.f) {
        var st = [];
        for (var z2 = 2.5; z2 < 30; z2 += 2.5) st.push([[68, z2, tr[0]], [128, z2, tr[0]]]);
        for (var x2 = 74; x2 < 128; x2 += 9) st.push([[x2, 0, tr[0]], [x2, 30, tr[0]]]);
        V.lines(st, darker(V.tone('hrsg', [0, 0, -1]), 0.12), 0.45);
      }
      V.hcyl(80, 118, 31.6, tr[1], 1.4, 'hrsg', { g: 30, so: 0.14 });
      V.box(128, 18, tr[1] - 3, 4, 9, 6, 'hrsg', { g: 0, so: 0.12 });
      V.cyl(135, tr[1], 0, 3.5, 58, 'stack', { n: 18, so: 0.15 });
      V.lines([ring(135, 44, tr[1], 3.62, 18).concat([[138.62, 44, tr[1]]]), ring(135, 56, tr[1], 3.62, 18).concat([[138.62, 56, tr[1]]])], V.hzc('#8f8598'), 0.6);
    });

    /* Generator step-up transformers in front of the hall. */
    sc.part();
    var g1 = transformer(V, 8, -24, 12, 8, 6);
    sc.part();
    var g2 = transformer(V, 30, -24, 12, 8, 6);

    /* Control building. */
    sc.part();
    office(V, -28, -56, 30, 18, 9);

    /* Switchyard: take-off frame, breakers, the line gantry. */
    sc.part();
    var take = hframe(V, 58, -32, 'w', 24, 16);
    sc.part();
    [-46.8, -36, -25.2].forEach(function (wl) { breaker(V, 188, wl); });
    sc.part();
    var gant = hframe(V, 212, -36, 'w', 36, 18);

    sc.part('wire');
    [g1, g2].forEach(function (g) { sc.span(g.hv.map(function (p) { return V.q(p[0], p[1], p[2]); }), take.map(function (p) { return V.q(p[0], p[1], p[2]); }), 0.06, 'g1', BUS); });
    sc.span(take.map(function (p) { return V.q(p[0], p[1], p[2]); }), gant.map(function (p) { return V.q(p[0], p[1], p[2]); }), 0.05, 'g2', mix(WIRE, HAZE, V.hz));

    sc.plantCore = sc.G.ext.slice();
    sc.part('fade');
    /* Steam: soft puffs that grow, thin out and drift with the wind. */
    [[135, 38], [135, 12]].forEach(function (s, j) {
      var b = V.q(s[0], 58, s[1]), k = V.k(s[0], s[1]), n = 9;
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, px = b[0] + t * 120 * k + j * 4 * k, py = b[1] - 6 * k - Math.sqrt(t) * 34 * k;
        var r = (2.6 + t * 15) * k;
        var d = blob(px, py, r, 9, rnd);
        sc.add('o', '#ffffff', fx(0.62 * Math.pow(1 - t, 1.3) + 0.04), d);
        sc.track(px - r, py - r); sc.track(px + r, py + r);
      }
    });
    return { ph: gant };
  }

  function substation(sc, V, inG) {
    var o = {}, rnd = rng(23);
    sc.part('fade');
    V.poly(rect(0, 150, 0, 110, 0), V.col('gravel', 0.86));
    var dots = '';
    for (var i = 0; i < 260; i++) { var u = rnd() * 150, w = rnd() * 110; dots += V.d([[u, 0.01, w], [u + 0.7, 0.01, w], [u + 0.7, 0.01, w + 0.5], [u, 0.01, w + 0.5]], true); }
    sc.add('o', INK, 0.07, dots);
    V.poly(rect(70, 78, -78, 0, 0.02), V.col('asphalt', 0.86));
    sc.keep(V, -14, 186, -44, 124);

    sc.part();
    fence(V, 0, 0, 150, 110, 2.6, 'back');
    V.lines([[[4, 0, 106], [4, 24, 106]]], V.tone('steel', [0, 0, -1]), 1.1);
    sc.part();
    hframe(V, inG.u, inG.w, 'w', inG.span, inG.h);
    sc.part();
    o.tapG = hframe(V, 124, 104, 'u', 30, 17);
    sc.part();
    var ch = V.box(112, 0, 78, 24, 4.4, 16, 'concrete', { top: 'roof' });
    if (ch.f) V.poly([[116, 0, 78], [117.4, 0, 78], [117.4, 2.4, 78], [116, 2.4, 78]], V.col('dark', 0.5));

    /* High-voltage bus on post insulators. */
    sc.part();
    var lanes = [49, 55, 61];
    for (var bu = 24; bu <= 124; bu += 20) lanes.forEach(function (wl) { stand(V, bu, wl, 7.8); });
    sc.part();
    [47, 81].forEach(function (bu) { breaker(V, bu, 38); });

    sc.part();
    var t1 = transformer(V, 40, 14, 14, 9, 7.2);
    sc.part();
    var t2 = transformer(V, 74, 14, 14, 9, 7.2);
    o.lv = [t1.lv, t2.lv];

    sc.part();
    var sg = V.box(100, 0, 4, 24, 4.6, 10, 'clad', { top: 'roof' });
    if (sg.f) {
      var dd = '';
      for (var dx = 102; dx < 122; dx += 3.2) dd += V.d([[dx, 0.3, 4], [dx + 2.2, 0.3, 4], [dx + 2.2, 3.4, 4], [dx, 3.4, 4]], true);
      sc.add('f', darker(V.tone('clad', [0, 0, -1]), 0.16), 0, dd);
    }
    sc.part();
    o.riser = hframe(V, 140, 8, 'w', 7, 10);

    sc.part();
    fence(V, 0, 0, 150, 110, 2.6, 'front');
    V.lines([[[146, 0, 4], [146, 24, 4]]], V.tone('steel', [0, 0, -1]), 1.1);

    sc.part('wire');
    var inPh = [0.2, 0.5, 0.8].map(function (f) { return [inG.u, inG.h - 3.7, inG.w - inG.span / 2 + inG.span * f]; });
    inPh.forEach(function (p, j) { sc.wire(V.q(p[0], p[1], p[2]), V.q(24, 9.3, lanes[j]), 0.05, 's1', BUS); });
    lanes.forEach(function (wl) { sc.wire(V.q(24, 9.3, wl), V.q(124, 9.3, wl), 0, 's2', BUS); });
    [[t1, 47], [t2, 81]].forEach(function (tt) {
      tt[0].hv.forEach(function (h, j) { sc.wire(V.q(tt[1], 9.3, lanes[j]), V.q(h[0], h[1], h[2]), 0.04, 's3', BUS); });
    });
    return o;
  }

  function campus(sc, V, cG, tapSpan) {
    var rnd = rng(31);
    var halls = [164, 82, 0];
    sc.part('fade');
    V.poly(rect(-122, 244, -72, 226, 0), V.col('pad', 0.92));
    V.poly(rect(-116, -26, -16, 214, 0.03), V.col('gravel', 0.86));
    V.poly(rect(-30, 238, -26, -16, 0.04), V.col('asphalt', 0.86));
    V.poly(rect(230, 238, -16, 222, 0.04), V.col('asphalt', 0.86));
    V.poly(rect(110, 118, -150, -26, 0.04), V.col('asphalt', 0.86));
    parking(V, 64, 170, -66, -32, 0.7, rnd);
    sc.keep(V, -136, 278, -112, 240);

    sc.part();
    fence(V, -116, -16, -26, 214, 2.6, 'back');
    sc.part();
    hframe(V, cG.u, cG.w, 'u', cG.span, cG.h);
    sc.part('wire');
    tapSpan();

    /* The campus switchyard: bus along w, one transformer per hall. */
    sc.part();
    var lanes = [-98, -90, -82];
    for (var bw = 194; bw >= 6; bw -= 26) lanes.forEach(function (ul) { stand(V, ul, bw, 7.8); });
    var tx = [];
    sc.part();
    halls.forEach(function (hw) { tx.push(transformer(V, -66, hw + 22, 13, 8.5, 6.8)); });
    sc.part();
    fence(V, -116, -16, -26, 214, 2.6, 'front');
    sc.part('wire');
    var gph = [0.2, 0.5, 0.8].map(function (f) { return [cG.u - cG.span / 2 + cG.span * f, cG.h - 3.7, cG.w]; });
    gph.forEach(function (p, j) { sc.wire(V.q(p[0], p[1], p[2]), V.q(lanes[j], 9.3, 6), 0.05, 'h5', BUS); });
    lanes.forEach(function (ul) { sc.wire(V.q(ul, 9.3, 6), V.q(ul, 9.3, 194), 0, 'h5', BUS); });
    tx.forEach(function (t, i) {
      var hw = halls[i] + 22;
      t.hv.forEach(function (h, j) { sc.wire(V.q(lanes[j], 9.3, hw + 6), V.q(h[0], h[1], h[2]), 0.04, 'h5', BUS); });
      t.lv.forEach(function (l, j) { sc.wire(V.q(l[0], l[1], l[2]), V.q(10, 9.5, halls[i] + 16 + j * 4), 0.05, 'h6', BUS); });
    });

    /* Three long halls, the far one first, each with its generator yard at the open end. */
    halls.forEach(function (hw) {
      sc.part();
      var rtu = [];
      for (var r = 0; r < 2; r++) for (var c = 0; c < 11; c++) rtu.push([16 + c * 17, hw + 12 + r * 18]);
      hall(V, 10, hw, 200, 48, 16, { rtu: rtu, rtuSize: [9, 2.4, 4.6], doors: [14, 70, 130, 180] });
      sc.part();
      var gs = [];
      for (var gc = 0; gc < 2; gc++) for (var gr = 0; gr < 5; gr++) gs.push([215 + gc * 5.6, hw + 2 + gr * 9.2]);
      V.poly(rect(213, 227, hw, hw + 48, 0.05), V.col('concrete', 0.84));
      units(V, gs, 3.4, 3.8, 7.8, 'genset', 0.05, { so: 0.15 });
      var ex = '';
      gs.forEach(function (p) { ex += V.d(rect(p[0] + 1.2, p[0] + 2.2, p[1] + 5.6, p[1] + 6.4, 5.4), true); });
      sc.add('f', V.col('dark', 0.45), 0, ex);
    });

    sc.part();
    office(V, 20, -50, 40, 20, 10.8);
    return {};
  }

  function datacenter(sc, V, S, feed) {
    var rnd = rng(47);
    sc.part('fade');
    V.poly(rect(-44, 96, -44, 56, 0), V.col('pad', 0.9));
    V.poly(rect(-6, 92, -12, 44, 0.03), V.col('concrete', 0.86));
    parking(V, -40, -10, -40, -14, 0.6, rnd);
    V.poly(rect(-30, -22, -62, -40, 0.03), V.col('asphalt', 0.86));
    sc.keep(V, -56, 128, -84, 68);

    sc.part();
    fence(V, -42, -42, 94, 54, 2.4, 'back');

    /* Pole-top transformer pole, then the building. */
    var pb = V.p(-18, 0, -18), pk = V.k(-18, -18);
    sc.part();
    sc.use(S.polex, pb[0], pb[1], pk);
    var xph = S.polex.ph.map(function (p) { return [pb[0] + p[0] * pk, pb[1] + p[1] * pk]; });
    var xf = [pb[0] + S.polex.xf[0] * pk, pb[1] + S.polex.xf[1] * pk];
    sc.part('wire');
    sc.span(feed, xph, 0.05, 'd1', WIRE);

    sc.part();
    var rtu = [[10, 8], [24, 8], [38, 8], [10, 19], [24, 19]];
    hall(V, 0, 0, 58, 30, 9.5, { rtu: rtu, rtuSize: [7, 2.2, 3.6], rib: 2, louver: 8, louverStep: 16, doors: [44, 50] });
    sc.part();
    V.poly([[2, 0.7, 0], [9, 0.7, 0], [9, 4.2, 0], [2, 4.2, 0]], V.col('glass', 0.66));
    V.box(1.4, 4.2, -2.4, 8.2, 0.4, 2.4, 'concrete', { g: 0, so: 0.12 });
    V.lines([[[5.5, 0.7, 0], [5.5, 4.2, 0]]], V.hzc('#b9afc3'), 0.4);

    /* Two generators at the open end, then the service drop to the building. */
    sc.part();
    V.poly(rect(62, 82, 2, 26, 0.04), V.col('concrete', 0.82));
    units(V, [[64, 4], [64, 15]], 14, 3.9, 3.6, 'genset', 0.04, { so: 0.16 });
    var ex = '';
    [[64, 4], [64, 15]].forEach(function (p) { ex += V.d(rect(p[0] + 10.5, p[0] + 11.6, p[1] + 1.2, p[1] + 2.2, 3.95), true); });
    sc.add('f', V.col('dark', 0.45), 0, ex);
    sc.part();
    V.box(-5, 0, 10, 2.4, 1.8, 2.4, 'cladDk', { so: 0.14 });

    sc.part();
    fence(V, -42, -42, 94, 54, 2.4, 'front');

    sc.part('wire');
    var entry = [V.q(0.4, 8.2, 13), V.q(0.4, 8.2, 15), V.q(0.4, 8.2, 17)];
    sc.wire(xf, V.q(-3.8, 1.8, 11.2), 0.02, 'd2', WIRE);
    entry.forEach(function (e, j) { sc.wire(xph[j], e, 0.06, 'd2', WIRE); });
  }

  /* ================================================================== the land */

  function ground(sc, views, S, hero) {
    sc.flush();
    var e = sc.ext, W = e[2] - e[0], H = e[3] - e[1];
    var layer = el('g', { class: 'll-ground' });
    sc.root.insertBefore(layer, sc.root.firstChild);
    sc.target = layer; sc.boxes = [];
    sc.G = null; sc.P = null;

    /* An island elongated along the path, fading to the page at every edge. */
    var cx = (e[0] + e[2]) / 2, cy = (e[1] + e[3]) / 2 + H * 0.06, ang = Math.atan2(H * 0.42, W) * 180 / Math.PI;
    var rx = W * 0.66, ry = H * 1.05, ar = ang * Math.PI / 180;
    var hx = Math.hypot(rx * Math.cos(ar), ry * Math.sin(ar)), hy = Math.hypot(rx * Math.sin(ar), ry * Math.cos(ar));
    var x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy;
    el('rect', { x: fx(x0), y: fx(y0), width: fx(x1 - x0), height: fx(y1 - y0), fill: 'url(#' + sc.px + '-land)' }, layer);

    var rnd = rng(5);
    var regions = [
      [views[0], -420, 520, -380, 420, 96, 70],
      [views[2], -380, 520, -260, 520, 90, 68],
      [views[1], -460, 720, -260, 300, 84, 64],
      [views[3], -260, 300, -220, 220, 80, 60]
    ];
    (sc.lineViews || []).forEach(function (V) { regions.unshift([V, -260, 260, -200, 220, 92, 66]); });
    var trees = [];
    regions.forEach(function (R) {
      var V = R[0], cells = {}, rows = {};
      for (var u = R[1]; u < R[2]; u += R[5]) {
        for (var w = R[3]; w < R[4]; w += R[6]) {
          var r = rnd();
          if (r < 0.22) continue;
          var tone = FIELD[Math.floor(rnd() * FIELD.length)];
          (cells[tone] = cells[tone] || []).push([u, w]);
          if (rnd() < 0.42) (rows[tone] = rows[tone] || []).push([u, w]);
          if (rnd() < 0.16) {
            var along = rnd() < 0.5;
            for (var s = 3; s < (along ? R[5] : R[6]) - 2; s += 5.5 + rnd() * 4) {
              var tu = along ? u + s : u, twp = along ? w : w + s;
              trees.push([V, tu + (rnd() - 0.5) * 2.4, twp + (rnd() - 0.5) * 2.4, 3.2 + rnd() * 1.6]);
            }
          }
        }
      }
      Object.keys(cells).forEach(function (tone) {
        var d = '';
        cells[tone].forEach(function (c) { d += V.d(rect(c[0], c[0] + R[5], c[1], c[1] + R[6], 0), true); });
        sc.add('f', V.hzc(tone), 0, d);
      });
      /* Crop rows on some fields, running with the site grid. */
      var segs = [];
      Object.keys(rows).forEach(function (tone) {
        rows[tone].forEach(function (c, i) {
          var byU = (i + Math.round(c[0])) % 2 === 0;
          if (byU) for (var rw = c[1] + 2.5; rw < c[1] + R[6] - 1; rw += 4.5) segs.push([[c[0] + 1.5, 0, rw], [c[0] + R[5] - 1.5, 0, rw]]);
          else for (var ru = c[0] + 2.5; ru < c[0] + R[5] - 1; ru += 4.5) segs.push([[ru, 0, c[1] + 1.5], [ru, 0, c[1] + R[6] - 1.5]]);
        });
      });
      V.lines(segs, V.hzc('#b9bdae'), 0.45);
      /* A woodlot or two. */
      for (var lot = 0; lot < 2; lot++) {
        var lu = lerp(R[1], R[2], rnd()), lw = lerp(R[3], R[4], rnd());
        for (var tt = 0; tt < 9; tt++) trees.push([V, lu + (rnd() - 0.5) * 34, lw + (rnd() - 0.5) * 26, 4.5 + rnd() * 2.5]);
      }
    });
    /* A county road through the foreground, with a dashed center line. */
    var Vs = views[1];
    Vs.poly(rect(-560, 820, -88, -78, 0.01), Vs.col('asphalt', 0.88));
    var dash = [];
    for (var du = -560; du < 820; du += 9) dash.push([[du, 0.02, -83], [du + 4, 0.02, -83]]);
    Vs.lines(dash, '#f4f2f6', 0.5);
    sc.flush();

    /* Trees, far to near, clear of every site. */
    var tl = [];
    trees.forEach(function (t) {
      var b = t[0].q(t[1], 0, t[2]);
      if (b[0] < x0 || b[0] > x1 || b[1] < y0 || b[1] > y1) return;
      if (sc.kept(b[0], b[1])) return;
      if (b[1] > 607 && b[1] < 625 && false) return;
      tl.push([b, t[0].k(t[1], t[2]) * t[3], t[0].hz]);
    });
    tl.sort(function (a, b) { return a[0][1] - b[0][1]; });
    tl.forEach(function (t) {
      var h = Math.min(0.6, t[2] * 1.5);
      el('use', { href: S.tree.href, transform: 'translate(' + fx(t[0][0]) + ' ' + fx(t[0][1]) + ') scale(' + fx(t[1]) + ')', style: '--t0:' + mix(TREE[2], HAZE, h) + ';--t1:' + mix(TREE[0], HAZE, h) + ';--t2:' + mix(TREE[1], HAZE, h) }, layer);
    });

    /* The far tree line, then the haze that turns the land into the page. */
    var ty = lerp(y0, e[1], 0.62), tl2 = 'M' + fx(x0) + ',' + fx(ty + 6), rr = rng(9);
    for (var x = x0; x <= x1; x += 6 + rr() * 8) tl2 += 'Q' + fx(x + 3) + ',' + fx(ty - 3 - rr() * 5) + ' ' + fx(x + 7) + ',' + fx(ty + rr() * 2);
    tl2 += 'L' + fx(x1) + ',' + fx(ty + 8) + 'L' + fx(x0) + ',' + fx(ty + 8) + 'Z';
    el('path', { d: tl2, fill: mix(TREE[0], HAZE, 0.66) }, layer);
    el('rect', { x: fx(x0), y: fx(y0), width: fx(x1 - x0), height: fx(y1 - y0), fill: 'url(#' + sc.px + '-vig)' }, layer);

    /* Vignette ellipse, rotated along the path. */
    var vig = sc.defs.querySelector('#' + sc.px + '-vig');
    vig.setAttribute('gradientTransform', 'translate(' + fx(cx) + ' ' + fx(cy) + ') rotate(' + fx(ang) + ') scale(' + fx(rx) + ' ' + fx(ry) + ')');
    var land = sc.defs.querySelector('#' + sc.px + '-land');
    land.setAttribute('y1', fx(y0)); land.setAttribute('y2', fx(y1));
    var clip = el('clipPath', { id: sc.px + '-isl' }, sc.defs);
    el('ellipse', { cx: 0, cy: 0, rx: 0.985, ry: 0.985, transform: 'translate(' + fx(cx) + ' ' + fx(cy) + ') rotate(' + fx(ang) + ') scale(' + fx(rx) + ' ' + fx(ry) + ')' }, clip);
    layer.setAttribute('clip-path', 'url(#' + sc.px + '-isl)');
    sc.island = [x0, y0, x1, y1];
    void hero;
  }

  /* Shared gradients: land, vignette, plume, glass sheen, current-head glow. */
  function gradients(sc) {
    var px = sc.px, d = sc.defs;
    var land = el('linearGradient', { id: px + '-land', gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1: 0, y2: 1 }, d);
    [[0, mix('#e2e4da', HAZE, 0.85)], [0.34, mix('#e2e4da', HAZE, 0.35)], [0.62, '#e2e4da'], [1, '#eaebe5']].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1] }, land); });
    var vig = el('radialGradient', { id: px + '-vig', gradientUnits: 'userSpaceOnUse', cx: 0, cy: 0, r: 1 }, d);
    [[0.5, 0], [0.72, 0.55], [0.86, 0.94], [0.95, 1]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': WASH, 'stop-opacity': s[1] }, vig); });
    var pl = el('linearGradient', { id: px + '-plume', x1: 0, y1: 0, x2: 1, y2: 0 }, d);
    [[0, '#ffffff', 0.92], [0.35, '#f8f6fa', 0.62], [1, WASH, 0]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }, pl); });
    var sh = el('linearGradient', { id: px + '-sheen', x1: 0, y1: 0, x2: 1, y2: 1 }, d);
    [[0, '#efe8f4', 0.5], [0.45, '#efe8f4', 0.08], [0.62, '#efe8f4', 0.22], [1, '#efe8f4', 0]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }, sh); });
    var gl = el('radialGradient', { id: px + '-glow' }, d);
    [[0, GOLD, 0.62], [0.45, GOLD, 0.2], [1, GOLD, 0]].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }, gl); });
  }

  /* ================================================================== current */

  function Current(sc, mode) {
    this.sc = sc;
    this.sw = 1;
    var hops = sc.hops.filter(function (h) { return h.wires.length; });
    hops.forEach(function (h) { h.len = Math.max.apply(null, h.wires.map(function (w) { return w.len; })); });
    var total = 0;
    if (mode === 'story') {
      hops.forEach(function (h) { h.start = total; total += h.len; });
    } else {
      var t = 0, ends = {};
      hops.forEach(function (h) { if (h.branch === 'trunk') { h.start = t; t += h.len; } });
      hops.forEach(function (h) {
        if (h.branch === 'trunk') return;
        var s = ends[h.branch] == null ? t : ends[h.branch];
        h.start = s; ends[h.branch] = s + h.len;
      });
      total = Math.max.apply(null, [t].concat(Object.keys(ends).map(function (k) { return ends[k]; })));
    }
    this.hops = hops;
    this.total = total;
    this.heads = [];
  }
  Current.prototype.mark = function (stop) {
    var e = 0;
    this.hops.forEach(function (h) { if (h.stop <= stop) e = Math.max(e, h.start + h.len); });
    return e;
  };
  Current.prototype.head = function (i) {
    if (!this.heads[i]) {
      var g = el('g', { class: 'll-head' }, this.sc.root);
      el('circle', { r: 11, fill: 'url(#' + this.sc.px + '-glow)' }, g);
      el('circle', { r: 3.3, fill: INK }, g);
      el('circle', { r: 2.1, fill: GOLD }, g);
      this.heads[i] = g;
    }
    return this.heads[i];
  };
  Current.prototype.set = function (len, noHeads) {
    var self = this, hi = 0;
    this.hops.forEach(function (o) {
      var h = clamp((len - o.start) / o.len, 0, 1);
      o.wires.forEach(function (w) {
        if (w.h === h) return;
        w.h = h;
        var off = r1(w.len * (1 - h));
        w.cas.style.strokeDashoffset = off;
        w.live.style.strokeDashoffset = off;
        w.g.classList.toggle('is-live', h > 0);
      });
      if (!noHeads && h > 0 && h < 1) {
        var w0 = o.wires[Math.min(1, o.wires.length - 1)], target = h * w0.len, acc = 0, pt = null;
        for (var i = 1; i < w0.pts.length; i++) {
          var a = w0.pts[i - 1], b = w0.pts[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (acc + s >= target) { var t = (target - acc) / (s || 1); pt = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; break; }
          acc += s;
        }
        if (pt && hi < 4) {
          var g = self.head(hi++);
          g.style.display = '';
          g.setAttribute('transform', 'translate(' + r1(pt[0]) + ' ' + r1(pt[1]) + ') scale(' + self.sw.toFixed(3) + ')');
        }
      }
    });
    for (var j = hi; j < this.heads.length; j++) this.heads[j].style.display = 'none';
  };

  function newSvg(parent, cls, px) {
    var svg = el('svg', { class: cls, xmlns: NS, focusable: 'false', 'aria-hidden': 'true' }, parent);
    var sc = new Scene(svg, px);
    gradients(sc);
    return sc;
  }

  /* ================================================================== hero */

  function hero(container) {
    var sc = newSvg(container, 'campus-svg ll-svg', 'llh');
    var svg = sc.svg;
    buildAll(sc, { hero: true });
    var cur = new Current(sc, 'hero');
    var G = {};
    sc.groups.forEach(function (g) { G[g.name] = g.ext; });
    var core = union(union(G.substation, G.hyperscale), union(G.feeder, G.datacenter));

    function crop() {
      var cw = container.clientWidth || 800;
      var c = core.slice();
      /* Room on the left for the incoming line to enter from the sheet edge; phones keep less of it. */
      c[0] -= (c[2] - c[0]) * (cw < 560 ? 0.06 : 0.13);
      var padX = (c[2] - c[0]) * 0.02, padY = (c[3] - c[1]) * 0.06;
      svg.setAttribute('viewBox', [r1(c[0] - padX), r1(c[1] - padY), r1(c[2] - c[0] + padX * 2), r1(c[3] - c[1] + padY * 2)].join(' '));
      svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
      fit();
    }
    function fit() {
      var vb = svg.viewBox.baseVal, w = svg.clientWidth, h = svg.clientHeight;
      if (!vb || !vb.width || !w) return;
      var s = Math.min(w / vb.width, h ? h / vb.height : Infinity);
      cur.sw = 1 / s;
      svg.style.setProperty('--sw', (1 / s).toFixed(3));
    }
    crop();
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = container.clientWidth;
        if (Math.abs(w - lastW) < 1) return;
        var was = lastW < 560, now = w < 560;
        lastW = w;
        if (was !== now || !svg.getAttribute('viewBox')) crop(); else fit();
      }).observe(container);
    }
    cur.set(cur.total, true);
    return {
      run: function (onArrive) {
        if (reduced()) { cur.set(cur.total, true); onArrive(); return; }
        cur.set(0);
        var ms = 2500, t0 = 0;
        function frame(now) {
          if (!t0) t0 = now;
          var t = clamp((now - t0) / ms, 0, 1);
          cur.set(cur.total * (t < 1 ? 0.02 + 0.98 * easeInOut(t) : 1), t >= 1);
          if (t < 1) requestAnimationFrame(frame);
          else onArrive();
        }
        setTimeout(function () { fit(); requestAnimationFrame(frame); }, 350);
      }
    };
  }

  /* ================================================================== story */

  function story(host) {
    var sc = newSvg(host, 'story-svg ll-svg', 'lls');
    var svg = sc.svg;
    var built = buildAll(sc, { hero: false });
    var cur = new Current(sc, 'story');
    var marks = [0, 1, 2, 3, 4, 5].map(function (s) { return cur.mark(s); });
    marks[5] = cur.total;
    var groups = sc.groups;

    /* Story mode: conductors are strung with a dash draw-on before current runs. */
    groups.forEach(function (g) { g.parts.forEach(function (p) { p.wires.forEach(function (w) { w.dead.style.strokeDasharray = r1(w.len) + ' ' + r1(w.len + 4); }); p.oy = p.ext[3]; }); });

    function rectOf(e, pad) { var w = e[2] - e[0], h = e[3] - e[1]; return { x: (e[0] + e[2]) / 2, y: (e[1] + e[3]) / 2, w: w * (1 + pad), h: h * (1 + pad) }; }
    var tw = built.towers;
    var lineMid = tw.length >= 4 ? union(tw[1], tw[2]) : groups[1].ext;
    var frames = [
      rectOf(sc.plantCore || groups[0].ext, 0.02),
      rectOf(lineMid, 0.42),
      rectOf(groups[2].ext, 0.12),
      rectOf(groups[3].ext, 0.06),
      rectOf(union(groups[4].ext, [groups[2].ext[0] + (groups[2].ext[2] - groups[2].ext[0]) * 0.55, groups[2].ext[1], groups[2].ext[2], groups[2].ext[3]]), 0.1),
      rectOf(groups[5].ext, 0.14)
    ];
    var all = sc.ext;
    var W = 1, H = 1, isStatic = false;

    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      svg.setAttribute('viewBox', '0 0 ' + r1(W) + ' ' + r1(H));
    }
    function fitAll(fw, fh, vy) {
      var w = all[2] - all[0], h = all[3] - all[1];
      return { x: (all[0] + all[2]) / 2, y: (all[1] + all[3]) / 2, s: Math.min(W * fw / w, H * fh / h), vy: vy };
    }
    function camAt(q) {
      if (isStatic) return fitAll(0.96, 0.94, 0.5);
      var phone = W < 640;
      var ks = frames.map(function (f) {
        var s = Math.min(W * (phone ? 0.98 : 0.9) / f.w, H * (phone ? 0.86 : 0.7) / f.h);
        return { x: f.x, y: f.y, s: Math.min(s, 7), vy: 0.5 };
      });
      ks.push(fitAll(0.92, 0.3, phone ? 0.2 : 0.18));
      var x = clamp(q - 0.5, 0, ks.length - 1);
      var i = Math.min(ks.length - 2, Math.floor(x)), t = easeInOut(x - i);
      var a = ks[i], b = ks[i + 1];
      var s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), t));
      /* A long move dollies out a little on the way, so it reads as flight rather than slide. */
      var dist = Math.hypot(b.x - a.x, b.y - a.y), view = W / Math.min(a.s, b.s);
      s *= 1 - clamp(dist / view - 0.35, 0, 1) * 0.3 * Math.sin(Math.PI * t);
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), s: s, vy: lerp(a.vy, b.vy, t) };
    }
    var lastSw = 0;
    function update(q, stat) {
      isStatic = !!stat;
      var cam = camAt(q);
      sc.root.setAttribute('transform', 'translate(' + r1(W / 2) + ' ' + r1(H * cam.vy) + ') scale(' + cam.s.toFixed(4) + ') translate(' + r1(-cam.x) + ' ' + r1(-cam.y) + ')');
      var sw = 1 / cam.s;
      if (Math.abs(sw - lastSw) / sw > 0.015) { lastSw = sw; svg.style.setProperty('--sw', sw.toFixed(4)); }
      cur.sw = sw;

      /* Assembly: each stop's parts rise, fade in or are strung, staggered through the stop's opening. */
      groups.forEach(function (g, gi) {
        var b = gi === 0 || isStatic ? 1 : smooth((q - (gi - 0.45)) / 0.8);
        var parts = g.parts, n = parts.length;
        parts.forEach(function (p, j) {
          var start = n > 1 ? (j / (n - 1)) * 0.55 : 0;
          var t = clamp((b - start) / 0.45, 0, 1);
          if (p.t === t) return;
          p.t = t;
          if (p.kind === 'wire') {
            p.wires.forEach(function (w) { w.dead.style.strokeDashoffset = r1(w.len * (1 - easeOut(t))); });
            p.g.style.opacity = t <= 0 ? 0 : '';
            return;
          }
          if (t >= 1) { p.g.removeAttribute('transform'); p.g.style.opacity = ''; return; }
          if (p.kind === 'grow') {
            var e = Math.max(0.001, easeOut(t));
            p.g.setAttribute('transform', 'matrix(1 0 0 ' + e.toFixed(4) + ' 0 ' + r1(p.oy * (1 - e)) + ')');
            p.g.style.opacity = t <= 0 ? 0 : clamp(t * 3, 0, 1);
          } else p.g.style.opacity = t;
        });
      });

      /* Current: from the previous stop's milestone to this one's, across the stop. */
      var len;
      if (isStatic) len = cur.total;
      else {
        var st = Math.floor(clamp(q, 0, 6.999));
        if (st >= 6) len = cur.total;
        else len = lerp(st === 0 ? 0 : marks[st - 1], marks[st], smooth((q - st - 0.1) / 0.8));
      }
      cur.set(len, isStatic || len >= cur.total);
    }
    size();
    return { size: size, update: update };
  }

  window.DEM_ART = { id: 'lifelike-illustrated', hero: hero, story: story };
})();
