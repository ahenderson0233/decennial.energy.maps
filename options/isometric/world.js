/*
  Isometric campus: the world for this direction.
  - A small isometric drawing kit (30-degree axonometric, one stroke weight, three-tone faces).
  - The campus scene: generation, lattice towers, substation, feeder poles, data hall, generator yard.
    The campus is a generic illustration and never sits on a state tile.
  - IsoBoard: the shared hex map tilted on a plinth with CSS 3D, tiles extruded inside the SVG plane,
    upright billboard labels placed from each tile's projected top face.
  - The four motions: story, energize, zoom, micro.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var C30 = Math.cos(Math.PI / 6), S30 = 0.5, DEG = Math.PI / 180;
  var ROOT = document.documentElement;

  /* Cameras for the board: true isometric, and a flatter frontal view for phones and reduced motion. */
  var ISO = { a: 54.7356, b: 45 };
  var FLAT = { a: 24, b: 0 };
  var ZOOM_CAM = {
    iso: { large: { a: 44, b: 45 }, small: { a: 60, b: 45 } },
    flat: { large: { a: 14, b: 0 }, small: { a: 34, b: 0 } }
  };
  var NORTHEAST = ['PA', 'NY', 'VT', 'NH', 'ME', 'MA', 'CT', 'RI', 'NJ', 'DE', 'MD', 'DC', 'VA'];

  /* Tile heights, in map units. */
  var BASE = 3, UP = 14, UP_HI = 24, PLINTH = 16;

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function hel(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function P(x, y, z) { return [(x - y) * C30, (x + y) * S30 - (z || 0)]; }
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }

  /* ================================================================== drawing kit */

  function Kit(svgRoot) {
    this.svg = svgRoot;
    this.root = el('g', { class: 'scene' }, svgRoot);
    this.layer = this.root;
    this.cur = this.root;
    this.zoff = 0;
    this.groups = [];
    this.hops = [];
    this.ext = [Infinity, Infinity, -Infinity, -Infinity];
  }
  Kit.prototype.p = function (x, y, z) {
    var q = P(x, y, (z || 0) + this.zoff), e = this.ext;
    if (q[0] < e[0]) e[0] = q[0];
    if (q[1] < e[1]) e[1] = q[1];
    if (q[0] > e[2]) e[2] = q[0];
    if (q[1] > e[3]) e[3] = q[1];
    return q;
  };
  Kit.prototype.group = function (name) {
    var g = el('g', { class: 'stage-group g-' + name }, this.root);
    g._parts = [];
    this.groups.push(g);
    this.layer = g;
    this.cur = g;
    return g;
  };
  /* A part is the unit that assembles: 'drop' parts fall into place, 'fade' parts (wires) appear. */
  Kit.prototype.part = function (kind) {
    var g = el('g', { class: 'part' }, this.layer);
    g._kind = kind || 'drop';
    if (this.layer._parts) this.layer._parts.push(g);
    this.cur = g;
    return g;
  };
  Kit.prototype.d = function (pts3, close) {
    var self = this;
    return 'M' + pts3.map(function (p) { var q = self.p(p[0], p[1], p[2]); return r1(q[0]) + ',' + r1(q[1]); }).join('L') + (close ? 'Z' : '');
  };
  Kit.prototype.face = function (pts3, cls) { return el('path', { d: this.d(pts3, true), class: cls }, this.cur); };
  Kit.prototype.line = function (pts3, cls) { return el('path', { d: this.d(pts3, false), class: 'ln' + (cls ? ' ' + cls : '') }, this.cur); };
  Kit.prototype.box = function (x, y, z, w, d, h, cls) {
    var c = cls ? ' ' + cls : '';
    this.face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], 'f-left' + c);
    this.face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], 'f-right' + c);
    this.face([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], 'f-top' + c);
  };
  Kit.prototype.cyl = function (x, y, z, r, h, cls) {
    var b = this.p(x, y, z), t = this.p(x, y, z + h);
    var rx = r * Math.SQRT2 * C30, ry = r * Math.SQRT2 * S30;
    var c = cls ? ' ' + cls : '';
    el('path', {
      class: 'f-left' + c,
      d: 'M' + r1(b[0] - rx) + ',' + r1(b[1]) + 'A' + r1(rx) + ',' + r1(ry) + ' 0 0 0 ' + r1(b[0] + rx) + ',' + r1(b[1]) +
        'L' + r1(t[0] + rx) + ',' + r1(t[1]) + 'L' + r1(t[0] - rx) + ',' + r1(t[1]) + 'Z'
    }, this.cur);
    el('ellipse', { class: 'f-top' + c, cx: r1(t[0]), cy: r1(t[1]), rx: r1(rx), ry: r1(ry) }, this.cur);
  };
  /* A conductor: dead linework underneath, a cased gold live line revealed by current progress. */
  Kit.prototype.wire = function (a, b, sag, hop) {
    var pts = [], n = sag ? 12 : 1, self = this;
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t) - sag * 4 * t * (1 - t)]);
    }
    var d = this.d(pts, false);
    var g = el('g', { class: 'wire' }, this.cur);
    el('path', { class: 'w-dead', d: d }, g);
    var cas = el('path', { class: 'w-case', d: d }, g);
    var live = el('path', { class: 'w-live', d: d }, g);
    var scr = pts.map(function (p) { return P(p[0], p[1], p[2] + self.zoff); });
    var len = 0;
    for (var k = 1; k < scr.length; k++) len += Math.hypot(scr[k][0] - scr[k - 1][0], scr[k][1] - scr[k - 1][1]);
    len = Math.max(len, 1);
    [cas, live].forEach(function (p) { p.style.strokeDasharray = r1(len) + ' ' + r1(len + 2); p.style.strokeDashoffset = r1(len); });
    var w = { g: g, cas: cas, live: live, len: len, scr: scr, h: 0 };
    (this.hops[hop] = this.hops[hop] || []).push(w);
    return w;
  };
  /* Three-phase span between two sets of attachment points. */
  Kit.prototype.span = function (A, B, sag, hop) {
    for (var i = 0; i < 3; i++) this.wire(A[i], B[i], sag, hop);
  };

  /* ---------------------------------------------------------------- equipment */

  function lattice(k, x, y, H) {
    var arm = 26, bw = 12, tw = 3.5, zw = H * 0.64;
    var zs = [0, zw * 0.3, zw * 0.58, zw * 0.82, zw];
    var ws = zs.map(function (z) { return lerp(bw, tw, z / zw); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
      k.line([[x + s[0] * bw, y + s[1] * bw, 0], [x + s[0] * tw, y + s[1] * tw, zw], [x + s[0] * tw * 0.5, y + s[1] * tw * 0.5, H]]);
    });
    for (var i = 0; i < 4; i++) {
      var z0 = zs[i], z1 = zs[i + 1], w0 = ws[i], w1 = ws[i + 1];
      k.line([[x + w0, y - w0, z0], [x + w1, y + w1, z1]], 'thin');
      k.line([[x + w0, y + w0, z0], [x + w1, y - w1, z1]], 'thin');
      k.line([[x - w0, y + w0, z0], [x + w1, y + w1, z1]], 'thin');
      k.line([[x + w0, y + w0, z0], [x - w1, y + w1, z1]], 'thin');
      k.line([[x - w1, y + w1, z1], [x + w1, y + w1, z1], [x + w1, y - w1, z1]], 'thin');
    }
    k.line([[x - arm, y - 2, zw], [x + arm, y - 2, zw]]);
    k.line([[x - arm, y + 2, zw], [x + arm, y + 2, zw], [x + arm, y - 2, zw]]);
    k.line([[x - arm, y + 2, zw], [x - arm, y - 2, zw]]);
    k.line([[x - arm * 0.9, y, zw], [x - tw, y, zw + 9]], 'thin');
    k.line([[x + arm * 0.9, y, zw], [x + tw, y, zw + 9]], 'thin');
    var zt = H - 7;
    k.line([[x - 2, y, zt], [x + arm * 0.6, y, zt]]);
    var at = [[x - arm, y, zw - 9], [x + arm, y, zw - 9], [x + arm * 0.6, y, zt - 9]];
    at.forEach(function (a) { k.line([[a[0], a[1], a[2] + 9], a], 'ins'); });
    return at;
  }

  function gantry(k, x0, x1, y, H) {
    k.box(x0 - 2, y - 2, 0, 4, 4, H, 'steel');
    k.box(x1 - 2, y - 2, 0, 4, 4, H, 'steel');
    k.box(x0 - 2, y - 2, H - 5, x1 - x0 + 4, 4, 5, 'steel');
    var xs = [lerp(x0, x1, 0.2), lerp(x0, x1, 0.8), lerp(x0, x1, 0.6)];
    return xs.map(function (x) { k.line([[x, y, H - 5], [x, y, H - 13]], 'ins'); return [x, y, H - 13]; });
  }

  function pole(k, x, y, H) {
    k.box(x - 1.5, y - 1.5, 0, 3, 3, H, 'wood');
    k.box(x - 13, y - 1.5, H - 7, 26, 3, 2.5, 'wood');
    return [[x - 11, y, H - 1.5], [x + 11, y, H - 1.5], [x + 4, y, H - 1.5]].map(function (a) {
      k.line([[a[0], a[1], a[2] - 3], a], 'ins');
      return a;
    });
  }

  function transformer(k, x, y) {
    k.box(x - 2, y - 2, 0, 34, 26, 4, 'base');
    k.box(x, y, 4, 30, 22, 20, 'tank');
    for (var i = 0; i < 5; i++) k.box(x + 30, y + 2.5 + i * 3.8, 7, 4, 1.4, 14, 'fin');
    var hv = [], lv = [];
    for (var j = 0; j < 3; j++) { k.cyl(x + 7 + j * 8, y + 5, 24, 1.6, 11, 'bushing'); hv.push([x + 7 + j * 8, y + 5, 35]); }
    for (var m = 0; m < 3; m++) { k.cyl(x + 7 + m * 8, y + 16, 24, 1.3, 6, 'bushing'); lv.push([x + 7 + m * 8, y + 16, 30]); }
    return { hv: hv, lv: lv };
  }

  function fence(k, x, y, w, d, h, side) {
    function run(a, b) {
      var n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 22));
      for (var i = 0; i <= n; i++) {
        var px = lerp(a[0], b[0], i / n), py = lerp(a[1], b[1], i / n);
        k.line([[px, py, 0], [px, py, h]], 'fence');
      }
      k.line([[a[0], a[1], h], [b[0], b[1], h]], 'fence');
      k.line([[a[0], a[1], h * 0.45], [b[0], b[1], h * 0.45]], 'fence');
    }
    if (side === 'back') { run([x, y + d], [x, y]); run([x, y], [x + w, y]); }
    else { run([x, y + d], [x + w, y + d]); run([x + w, y], [x + w, y + d]); }
  }

  function hall(k, x, y, w, d, h, rows, cols) {
    k.box(x, y, 0, w, d, h, 'hall');
    k.line([[x + 4, y + 4, h], [x + w - 4, y + 4, h], [x + w - 4, y + d - 4, h], [x + 4, y + d - 4, h], [x + 4, y + 4, h]], 'thin');
    k.line([[x, y + d, h - 8], [x + w, y + d, h - 8], [x + w, y, h - 8]], 'thin');
    var doors = Math.max(2, Math.round(w / 70));
    for (var i = 0; i < doors; i++) {
      var dx = x + 18 + i * (w - 40) / Math.max(1, doors - 1);
      k.face([[dx, y + d, 0], [dx + 11, y + d, 0], [dx + 11, y + d, 17], [dx, y + d, 17]], 'door');
    }
    for (var z = 8; z < h - 10; z += 5) k.line([[x + w, y + 10, z], [x + w, y + 30, z]], 'thin');
    var step = (w - 24) / cols, rstep = (d - 20) / rows;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var ux = x + 12 + c * step, uy = y + 10 + r * rstep;
        k.box(ux, uy, h, Math.min(18, step - 6), Math.min(15, rstep - 6), 7, 'rtu');
        k.cyl(ux + Math.min(18, step - 6) / 2, uy + Math.min(15, rstep - 6) / 2, h + 7, 4.2, 0.6, 'fan');
      }
    }
  }

  function genset(k, x, y) {
    k.box(x, y, 0, 62, 15, 15, 'genset');
    for (var z = 3; z < 13; z += 3) k.line([[x + 62, y + 3, z], [x + 62, y + 12, z]], 'thin');
    k.cyl(x + 48, y + 7.5, 15, 2.2, 9, 'stack');
  }

  /* ---------------------------------------------------------------- the scene */

  var TOWERS = [-950, -780, -610, -440, -270];

  /* Builds the whole power path, back to front. opts.plant draws the generation group; opts.from is the
     first tower index drawn (the hero starts mid-line so conductors enter from the sheet edge). */
  function buildScene(k, opts) {
    opts = opts || {};
    var from = opts.from || 0;
    var plantGantry = null;

    k.group('generation');
    if (opts.plant) {
      k.part(); k.box(-30, -1310, 0, 280, 220, 5, 'pad');
      k.zoff = 5;
      k.part(); k.box(0, -1285, 0, 118, 70, 46, 'bldg'); k.box(12, -1268, 46, 94, 30, 8, 'bldg');
      k.part(); k.box(132, -1285, 0, 44, 62, 62, 'bldg');
      k.part(); k.cyl(200, -1270, 0, 9, 126, 'stack-big'); k.cyl(200, -1238, 0, 9, 126, 'stack-big');
      k.part(); var su = transformer(k, 60, -1190);
      k.part(); plantGantry = gantry(k, 66, 156, -1130, 62);
      k.part('fade'); k.span(su.hv, plantGantry.map(function (a) { return [a[0], a[1], a[2] + 5]; }), 4, 0);
      k.zoff = 0;
    }

    k.group('transmission');
    var prev = plantGantry ? plantGantry.map(function (a) { return [a[0], a[1], a[2] + 5]; }) : null;
    for (var i = from; i < TOWERS.length; i++) {
      k.part();
      var at = lattice(k, 120, TOWERS[i], 118);
      if (!prev && i === from) {
        /* Off-sheet conductors arriving from beyond the frame. */
        k.part('fade');
        k.span(at.map(function (a) { return [a[0], a[1] - 180, a[2]]; }), at, 13, i);
      } else if (prev) {
        k.part('fade');
        k.span(prev, at, 13, i + 1);
      }
      prev = at;
    }

    k.group('substation');
    k.part(); k.box(10, -92, 0, 252, 236, 4, 'pad yard');
    k.zoff = 4;
    k.part(); fence(k, 16, -86, 240, 224, 15, 'back');
    k.part(); var sg = gantry(k, 75, 165, -55, 62);
    k.part('fade'); k.span(prev, sg.map(function (a) { return [a[0], a[1], a[2] - 4]; }), 12, 6);
    var bars = [-16, -8, 0];
    k.part();
    [58, 132, 206].forEach(function (x) {
      bars.forEach(function (yb) { k.box(x - 1, yb - 1, 0, 2, 2, 30, 'steel'); k.cyl(x, yb, 30, 1.4, 5, 'bushing'); });
    });
    k.part('fade');
    sg.forEach(function (a, j) { k.wire([a[0], a[1], a[2] - 4], [a[0], bars[j], 36], 0, 7); });
    bars.forEach(function (yb) { k.wire([54, yb, 36], [212, yb, 36], 0, 7); });
    k.part(); var t1 = transformer(k, 64, 34);
    k.part(); var t2 = transformer(k, 148, 34);
    k.part('fade');
    [t1, t2].forEach(function (t) { t.hv.forEach(function (h, j) { k.wire([h[0], bars[j], 36], h, 0, 8); }); });
    k.part(); k.box(92, 96, 0, 66, 22, 20, 'bldg');
    k.part('fade');
    [t1, t2].forEach(function (t) { t.lv.forEach(function (l, j) { k.wire(l, [100 + j * 10 + (t === t2 ? 30 : 0), 106, 20], 2, 9); }); });
    k.part(); fence(k, 16, -86, 240, 224, 15, 'front');
    k.zoff = 0;

    k.group('feeder');
    var poles = [212, 292, 372], pa = null;
    var riser = [[118, 118, 24], [140, 118, 24], [129, 118, 24]];
    poles.forEach(function (py, j) {
      k.part(); var a = pole(k, 130, py, 52);
      k.part('fade'); k.span(pa || riser, a, pa ? 6 : 3, 10 + j);
      pa = a;
    });

    k.group('datahall');
    k.part(); k.box(-200, 404, 0, 650, 236, 6, 'pad');
    k.zoff = 6;
    k.part(); k.box(100, 418, 0, 64, 28, 26, 'bldg');
    k.part('fade'); k.span(pa, [[112, 430, 26], [150, 430, 26], [132, 430, 26]], 5, 13);
    k.part('fade'); k.wire([132, 440, 22], [132, 462, 38], 0, 14);
    k.part(); hall(k, -172, 462, 440, 122, 40, 2, 10);
    k.part(); for (var g = 0; g < 4; g++) genset(k, 300, 466 + g * 28);
    k.zoff = 0;
  }

  /* Current along the hops: per-hop reveal on every phase, plus a head marker on the leading phase. */
  function Current(k) {
    this.k = k;
    var order = [], start = 0;
    k.hops.forEach(function (ws, idx) {
      if (!ws || !ws.length) return;
      var len = Math.max.apply(null, ws.map(function (w) { return w.len; }));
      order.push({ idx: idx, ws: ws, start: start, len: len });
      start += len;
    });
    this.order = order;
    this.total = start;
    this.head = el('g', { class: 'current-head' }, k.root);
    el('circle', { r: 5.5, class: 'head-case' }, this.head);
    el('circle', { r: 3.2, class: 'head-core' }, this.head);
    this.head.style.display = 'none';
  }
  Current.prototype.endOf = function (hop) {
    var e = 0;
    this.order.forEach(function (o) { if (o.idx <= hop) e = o.start + o.len; });
    return e;
  };
  Current.prototype.set = function (len) {
    var head = null;
    this.order.forEach(function (o) {
      var h = clamp((len - o.start) / o.len, 0, 1);
      o.ws.forEach(function (w) {
        if (w.h === h) return;
        w.h = h;
        var off = r1(w.len * (1 - h));
        w.cas.style.strokeDashoffset = off;
        w.live.style.strokeDashoffset = off;
        w.g.classList.toggle('is-live', h > 0);
      });
      if (h > 0 && h < 1) {
        var w0 = o.ws[o.ws.length - 1], target = h * w0.len, acc = 0;
        for (var i = 1; i < w0.scr.length; i++) {
          var a = w0.scr[i - 1], b = w0.scr[i], s = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (acc + s >= target) { var t = (target - acc) / (s || 1); head = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; break; }
          acc += s;
        }
      }
    });
    if (head) {
      this.head.style.display = '';
      this.head.setAttribute('transform', 'translate(' + r1(head[0]) + ' ' + r1(head[1]) + ') scale(' + (this.sw || 1).toFixed(3) + ')');
    } else this.head.style.display = 'none';
  };

  /* Conductors are dashed for the current reveal, so they cannot use non-scaling strokes; instead
     --sw holds the inverse of the drawing's scale and the widths are multiplied by it. */
  function fitStroke(svg, cur) {
    function set() {
      var vb = svg.viewBox.baseVal, w = svg.clientWidth, h = svg.clientHeight;
      if (!vb || !vb.width || !w) return;
      var sc = Math.min(w / vb.width, h ? h / vb.height : Infinity);
      svg.style.setProperty('--sw', (1 / sc).toFixed(3));
      if (cur) cur.sw = 1 / sc;
    }
    set();
    if (window.ResizeObserver) new ResizeObserver(set).observe(svg);
    return set;
  }

  /* After energize, every corridor gets a gold live core inside its ink casing. */
  function liveCorridors(run) {
    if (!run || !run.corridors) return;
    run.corridors.forEach(function (c) {
      var l = c.cloneNode(false);
      l.setAttribute('class', 'corridor-live');
      c.parentNode.appendChild(l);
    });
  }

  function newSvg(parent, cls) {
    return el('svg', { class: cls, xmlns: NS, focusable: 'false', 'aria-hidden': 'true' }, parent);
  }

  /* ================================================================== the board */

  var boards = [];
  var rafId = 0;
  function kick() { if (!rafId) rafId = requestAnimationFrame(tick); }
  function tick(now) {
    rafId = 0;
    var more = false;
    boards.forEach(function (b) { if (b.step(now)) more = true; });
    if (more) kick();
  }

  function IsoBoard(host, opts) {
    var self = this;
    this.host = host;
    this.opts = Object.assign({ interactive: true, labels: 'all', fill: 0.98, hidden: false, tip: false, maxH: null, align: 'center' }, opts || {});
    this.stage = hel('div', 'iso-stage', host);
    this.tilt = hel('div', 'iso-tilt', this.stage);
    this.map = DEM.renderMap(this.tilt, { form: 'hex', tooltip: false, interactive: this.opts.interactive });
    if (this.opts.hidden) this.map.el.setAttribute('aria-hidden', 'true');
    this.labelLayer = hel('div', 'iso-labels', this.stage);
    this.labelLayer.setAttribute('aria-hidden', 'true');
    this.rise = 1;
    this.scale = null;
    this.mode = null;
    this.cam = { a: ISO.a, b: ISO.b };
    this.tiles = [];
    this.byCode = {};

    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Object.keys(this.map.paths).forEach(function (code) {
      var path = self.map.paths[code];
      var nums = (path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      var pts = [];
      for (var i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      var c = self.map.centroids[code];
      var normals = pts.map(function (p, i) {
        var q = pts[(i + 1) % pts.length], mx = (p[0] + q[0]) / 2 - c[0], my = (p[1] + q[1]) / 2 - c[1], l = Math.hypot(mx, my) || 1;
        return [mx / l, my / l];
      });
      pts.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      var g = el('g', { class: 'iso-tile', 'data-state': code });
      var sides = pts.map(function () { return el('path', { class: 'iso-side', 'data-state': code }, g); });
      var tierCls = path.getAttribute('class').replace('dem-state', '').trim();
      sides.forEach(function (s) { s.setAttribute('class', 'iso-side ' + tierCls); });
      g.appendChild(path);
      var t = { code: code, path: path, g: g, sides: sides, pts: pts, n: normals, c: c, lift: BASE, target: BASE, lit: null,
        covered: path.classList.contains('is-covered') };
      self.tiles.push(t);
      self.byCode[code] = t;
      if (self.opts.labels === 'all' || (self.opts.labels === 'covered' && t.covered)) {
        t.label = hel('span', 'iso-label ' + tierCls, self.labelLayer);
        t.label.textContent = code;
      }
    });
    var m = 22;
    this.rect = { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };

    /* The plinth sits under the tiles, in the same SVG plane. */
    this.plinth = el('g', { class: 'iso-plinth' });
    this.map.svg.insertBefore(this.plinth, this.map.layers.states);
    var R = this.rect;
    el('path', { class: 'plinth-top', d: 'M' + R.x0 + ',' + R.y0 + 'H' + R.x1 + 'V' + R.y1 + 'H' + R.x0 + 'Z' }, this.plinth);
    this.plinthSides = [el('path', { class: 'plinth-side s-a' }, this.plinth), el('path', { class: 'plinth-side s-b' }, this.plinth)];

    if (this.opts.tip) {
      this.tip = hel('div', 'iso-tip', this.stage);
      this.tip.setAttribute('aria-hidden', 'true');
      this.tip.hidden = true;
    }

    boards.push(this);
    this.applyMode(true);
    this.refresh({ instant: true });

    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = self.host.clientWidth;
        if (Math.abs(w - lastW) < 1) return;
        lastW = w;
        self.applyMode(true);
      }).observe(host);
    }
  }

  IsoBoard.prototype.isFlat = function () { return reduced() || this.host.clientWidth < 720; };
  IsoBoard.prototype.camFor = function () {
    var flat = this.isFlat();
    if (this.scale) return ZOOM_CAM[flat ? 'flat' : 'iso'][this.scale];
    return flat ? FLAT : ISO;
  };
  /* Recompute the camera for the current width; resets any tween. */
  IsoBoard.prototype.applyMode = function (force) {
    var mode = this.isFlat() ? 'flat' : 'iso';
    if (!force && mode === this.mode) return;
    this.mode = mode;
    this.host.setAttribute('data-cam', mode);
    this.camTween = null;
    this.cam = Object.assign({}, this.camFor());
    this.applyCamera();
  };

  IsoBoard.prototype.layout = function () {
    var W = this.host.clientWidth;
    if (!W) return;
    var R = this.rect, rw = R.x1 - R.x0, rh = R.y1 - R.y0;
    /* Size against the tallest camera this board will use, so the stage does not jump during tweens. */
    var hc = this.scale ? ZOOM_CAM[this.mode === 'flat' ? 'flat' : 'iso'].large : this.cam;
    var sb = Math.abs(Math.sin(this.cam.b * DEG)), cb = Math.cos(this.cam.b * DEG);
    var xext = rw * cb + rh * sb;
    var hsb = Math.abs(Math.sin(hc.b * DEG)), hcb = Math.cos(hc.b * DEG), hca = Math.cos(hc.a * DEG);
    var yext = (rw * hsb + rh * hcb) * hca;
    var up = UP_HI + 10, down = PLINTH + 4;
    var k = W * this.opts.fill / xext;
    var mh = this.opts.maxH ? this.opts.maxH() : 0;
    if (mh) k = Math.min(k, (mh - 8) / (yext + up + down));
    var H = Math.ceil((yext + up + down) * k + 8);
    this.k = k;
    this.stage.style.height = H + 'px';
    var vw = 975 * k, vh = 610 * k;
    var cx = (R.x0 + R.x1) / 2 * k, cy = (R.y0 + R.y1) / 2 * k;
    var centerY = 4 + up * k + yext * k / 2;
    this.tilt.style.width = vw + 'px';
    this.tilt.style.height = vh + 'px';
    this.tilt.style.left = (W / 2 - cx) + 'px';
    this.tilt.style.top = (centerY - cy) + 'px';
    this.tilt.style.transformOrigin = cx + 'px ' + cy + 'px';
  };

  IsoBoard.prototype.applyCamera = function () {
    this.layout();
    this.tilt.style.transform = 'rotateX(' + this.cam.a.toFixed(3) + 'deg) rotateZ(' + this.cam.b.toFixed(3) + 'deg)';
    var sb = Math.sin(this.cam.b * DEG), cb = Math.cos(this.cam.b * DEG);
    /* Painter's order: farther tiles first. */
    this.tiles.sort(function (a, b) { return (a.c[0] * sb + a.c[1] * cb) - (b.c[0] * sb + b.c[1] * cb); });
    var states = this.map.layers.states;
    this.tiles.forEach(function (t) { states.appendChild(t.g); });
    this.renderPlinth();
    var self = this;
    this.tiles.forEach(function (t) { self.renderTile(t); });
    var o = this.offset(UP);
    var tr = 'translate(' + r1(o[0]) + 'px,' + r1(o[1]) + 'px)';
    this.map.layers.corridors.style.transform = tr;
    this.map.layers.pulses.style.transform = tr;
    this.placeLabels();
  };

  /* In-plane vector that projects to straight up on screen by `lift` map units. */
  IsoBoard.prototype.offset = function (lift) {
    var ca = Math.cos(this.cam.a * DEG), sb = Math.sin(this.cam.b * DEG), cb = Math.cos(this.cam.b * DEG);
    var s = lift / ca;
    return [-s * sb, -s * cb];
  };

  IsoBoard.prototype.renderPlinth = function () {
    var R = this.rect, sb = Math.sin(this.cam.b * DEG), cb = Math.cos(this.cam.b * DEG);
    var o = this.offset(-PLINTH);
    function quad(p, q) { return 'M' + r1(p[0]) + ',' + r1(p[1]) + 'L' + r1(q[0]) + ',' + r1(q[1]) + 'L' + r1(q[0] + o[0]) + ',' + r1(q[1] + o[1]) + 'L' + r1(p[0] + o[0]) + ',' + r1(p[1] + o[1]) + 'Z'; }
    /* South edge faces the viewer whenever cos(b) > 0; the east edge when sin(b) > 0. */
    this.plinthSides[0].setAttribute('d', cb > 0.001 ? quad([R.x0, R.y1], [R.x1, R.y1]) : '');
    this.plinthSides[1].setAttribute('d', sb > 0.001 ? quad([R.x1, R.y0], [R.x1, R.y1]) : '');
  };

  IsoBoard.prototype.renderTile = function (t) {
    var sb = Math.sin(this.cam.b * DEG), cb = Math.cos(this.cam.b * DEG);
    var o = this.offset(t.lift);
    t.path.style.transform = 'translate(' + r1(o[0] * 100) / 100 + 'px,' + r1(o[1] * 100) / 100 + 'px)';
    var pts = t.pts;
    for (var i = 0; i < pts.length; i++) {
      var n = t.n[i], side = t.sides[i];
      if (n[0] * sb + n[1] * cb <= 0.001 || t.lift < 0.2) { side.setAttribute('d', ''); continue; }
      var p = pts[i], q = pts[(i + 1) % pts.length];
      side.setAttribute('d', 'M' + r1(p[0]) + ',' + r1(p[1]) + 'L' + r1(q[0]) + ',' + r1(q[1]) +
        'L' + r1(q[0] + o[0]) + ',' + r1(q[1] + o[1]) + 'L' + r1(p[0] + o[0]) + ',' + r1(p[1] + o[1]) + 'Z');
      var sx = n[0] * cb - n[1] * sb;
      side.classList.toggle('s-right', sx > 0.05);
      side.classList.toggle('s-left', sx <= 0.05);
    }
  };

  IsoBoard.prototype.placeLabels = function () {
    if (!this.host.offsetParent && getComputedStyle(this.host).position !== 'fixed') return;
    var sr = this.stage.getBoundingClientRect();
    var self = this;
    var rects = this.tiles.map(function (t) { return t.label ? t.path.getBoundingClientRect() : null; });
    this.tiles.forEach(function (t, i) {
      if (!t.label) return;
      var r = rects[i];
      t.pos = [r.left + r.width / 2 - sr.left, r.top + r.height / 2 - sr.top];
      t.label.style.transform = 'translate(' + r1(t.pos[0]) + 'px,' + r1(t.pos[1]) + 'px) translate(-50%,-50%)';
    });
    if (this.tip && !this.tip.hidden && this.tipCode) this.placeTip();
  };

  /* Height and light for one tile, read from the classes the core keeps current. */
  IsoBoard.prototype.targetFor = function (t) {
    var cl = t.path.classList;
    if (!t.covered) return { lift: BASE, lit: false };
    var lit = true, lift = UP;
    var f = ROOT.getAttribute('data-filter');
    if (f) { lit = cl.contains('tier-' + f); lift = lit ? UP_HI : BASE; }
    var sc = ROOT.getAttribute('data-scale');
    if (sc && DEM.motion === 'zoom') { var ok = cl.contains('scale-' + sc); lit = lit && ok; lift = ok ? UP + 6 : BASE; }
    var en = this.map.el.getAttribute('data-energize');
    if ((en === 'pending' || en === 'running') && !cl.contains('is-energized')) { lit = false; lift = BASE; }
    if (lit) {
      if (cl.contains('is-selected')) lift += 9;
      else if (cl.contains('is-hover')) lift += 6;
      else if (cl.contains('is-related')) lift += 3;
    }
    return { lift: BASE + (lift - BASE) * this.rise, lit: lit };
  };

  IsoBoard.prototype.refresh = function (o) {
    o = o || {};
    var self = this, now = performance.now();
    var instant = o.instant || reduced();
    var sb = Math.sin(this.cam.b * DEG), cb = Math.cos(this.cam.b * DEG);
    this.tiles.forEach(function (t) {
      var r = self.targetFor(t);
      if (r.lit !== t.lit) {
        t.lit = r.lit;
        t.g.classList.toggle('is-lit', r.lit);
        if (t.label) t.label.classList.toggle('is-lit', r.lit);
      }
      if (instant) {
        t.target = t.lift = r.lift; t.next = undefined; t.delayUntil = 0;
        self.renderTile(t);
      } else if (o.wave) {
        /* A wave across the board along the camera's screen x. */
        var sx = (t.c[0] * cb - t.c[1] * sb + 700) / 1400;
        t.next = r.lift;
        t.delayUntil = now + clamp(sx, 0, 1) * 320;
      } else {
        t.target = r.lift; t.next = undefined; t.delayUntil = 0;
      }
    });
    if (instant) this.placeLabels();
    else kick();
  };

  IsoBoard.prototype.setCamera = function (cam, ms) {
    if (reduced() || !ms) { this.cam = Object.assign({}, cam); this.camTween = null; this.applyCamera(); return; }
    this.camTween = { from: Object.assign({}, this.cam), to: Object.assign({}, cam), t0: performance.now(), ms: ms };
    kick();
  };

  IsoBoard.prototype.step = function (now) {
    var dt = Math.min(64, now - (this.last || now));
    this.last = now;
    var moving = false, dirty = false, self = this;
    if (this.camTween) {
      var tw = this.camTween, e = easeInOut((now - tw.t0) / tw.ms);
      this.cam = { a: lerp(tw.from.a, tw.to.a, e), b: lerp(tw.from.b, tw.to.b, e) };
      if (e >= 1) this.camTween = null;
      this.applyCamera();
      moving = true;
    }
    var a = 1 - Math.exp(-dt / 110);
    this.tiles.forEach(function (t) {
      if (t.next !== undefined) {
        if (now < t.delayUntil) { moving = true; return; }
        t.target = t.next; t.next = undefined;
      }
      if (t.lift !== t.target) {
        t.lift += (t.target - t.lift) * a;
        if (Math.abs(t.target - t.lift) < 0.04) t.lift = t.target;
        self.renderTile(t);
        dirty = true; moving = true;
      }
    });
    if (this.followUntil && now < this.followUntil) { dirty = true; moving = true; }
    if (dirty) this.placeLabels();
    return moving;
  };

  IsoBoard.prototype.showTip = function (code) {
    if (!this.tip) return;
    var t = code && this.byCode[code];
    if (!t || !t.covered) { this.tip.hidden = true; this.tipCode = null; return; }
    this.tip.innerHTML = '';
    var s = document.createElement('strong'); s.textContent = DEM.stateNames[code];
    var m = document.createElement('span'); m.textContent = DEM.coverageLine(code);
    this.tip.appendChild(s); this.tip.appendChild(m);
    this.tip.hidden = false;
    this.tipCode = code;
    this.placeTip();
  };
  IsoBoard.prototype.placeTip = function () {
    var t = this.byCode[this.tipCode];
    if (!t || !t.pos) return;
    var W = this.stage.clientWidth, tw = this.tip.offsetWidth;
    var x = clamp(t.pos[0] - tw / 2, 4, W - tw - 4);
    this.tip.style.transform = 'translate(' + r1(x) + 'px,' + r1(t.pos[1] - this.tip.offsetHeight - 22) + 'px)';
  };

  function refreshAll(o) { boards.forEach(function (b) { b.refresh(o); }); }

  /* ================================================================== page pieces */

  function chevron(parent) {
    var s = el('svg', { class: 'find-chevron', viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true', focusable: 'false' }, parent);
    el('path', { d: 'M3.5 6l4.5 4.5L12.5 6', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s);
  }

  /* Legend swatches as small extruded tiles drawn in the same projection as the board. */
  function legendTiles(container) {
    var n = 0;
    container.querySelectorAll('.dem-swatch').forEach(function (sw) {
      var kind = /dem-swatch-(\w+)/.exec(sw.className)[1];
      var id = 'iso-key-' + (++n);
      var s = el('svg', { viewBox: '-12 -14 24 26', width: 26, height: 28, class: 'key-tile key-' + kind, 'aria-hidden': 'true', focusable: 'false' }, sw);
      if (kind === 'partial') {
        var pat = el('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: 3, height: 3, patternTransform: 'rotate(45)' }, el('defs', null, s));
        el('rect', { width: 3, height: 3, class: 'key-hatch-bg' }, pat);
        el('line', { x1: 0, y1: 0, x2: 0, y2: 3, class: 'key-hatch-line' }, pat);
      }
      var r = 9, pts = [];
      for (var i = 0; i < 6; i++) { var a = (60 * i - 90) * DEG; pts.push([r * Math.cos(a), r * Math.sin(a) * 0.62 - 3]); }
      var h = 6;
      [[1, 2], [2, 3], [3, 4]].forEach(function (e, j) {
        var p = pts[e[0]], q = pts[e[1]];
        el('path', { class: 'key-side ' + (j === 0 ? 'k-right' : j === 1 ? 'k-mid' : 'k-left'),
          d: 'M' + r1(p[0]) + ',' + r1(p[1]) + 'L' + r1(q[0]) + ',' + r1(q[1]) + 'L' + r1(q[0]) + ',' + r1(q[1] + h) + 'L' + r1(p[0]) + ',' + r1(p[1] + h) + 'Z' }, s);
      });
      el('path', { class: 'key-top', d: 'M' + pts.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join('L') + 'Z',
        style: kind === 'partial' ? 'fill:url(#' + id + ')' : null }, s);
    });
  }

  /* ================================================================== hero */

  function heroScene(container) {
    var svg = newSvg(container, 'campus-svg');
    var k = new Kit(svg);
    buildScene(k, { plant: false, from: 4 });
    var cur = new Current(k);
    /* Crop: the last towers at the top right, the campus pad at the bottom left. */
    var pts = [P(120 + 30, TOWERS[4] - 40, 120), P(262, -92, 0), P(-200, 640, 0), P(450, 640, 0), P(450, 404, 0), P(120 - 30, TOWERS[4], 118)];
    var x0 = Math.min.apply(null, pts.map(function (p) { return p[0]; })) - 8;
    var x1 = Math.max.apply(null, pts.map(function (p) { return p[0]; })) + 4;
    var y0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })) - 6;
    var y1 = Math.max.apply(null, pts.map(function (p) { return p[1]; })) + 8;
    svg.setAttribute('viewBox', [r1(x0), r1(y0), r1(x1 - x0), r1(y1 - y0)].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
    fitStroke(svg, cur);
    cur.set(Infinity);
    return { kit: k, current: cur, svg: svg };
  }

  /* Energize, hero part: current runs in from the sheet edge to the hall, then the board energizes. */
  function heroEnergize(scene, board) {
    var cur = scene.current;
    board.map.el.setAttribute('data-energize', 'pending');
    board.refresh({ instant: true });
    if (reduced()) { cur.set(Infinity); liveCorridors(board.map.energize({ loop: 0 })); return; }
    cur.set(0);
    var ms = 2100, t0 = 0;
    function frame(now) {
      if (!t0) t0 = now;
      var t = clamp((now - t0) / ms, 0, 1);
      cur.set(cur.total * (t < 1 ? 0.04 + 0.96 * easeInOut(t) : 1));
      if (t < 1) requestAnimationFrame(frame);
      else { cur.set(Infinity); liveCorridors(board.map.energize({ loop: 0, speed: 600 })); }
    }
    setTimeout(function () { requestAnimationFrame(frame); }, 350);
  }

  /* ================================================================== scales: two detail drawings */

  function detailLarge(container) {
    var svg = newSvg(container, 'detail-svg');
    var k = new Kit(svg);
    k.group('d');
    k.part(); k.box(-210, -40, 0, 430, 300, 4, 'pad yard');
    k.zoff = 4;
    k.part(); var at = lattice(k, 70, -10, 112);
    k.part('fade'); k.span(at.map(function (a) { return [a[0], a[1] - 150, a[2] + 6]; }), at, 12, 0);
    k.part(); var g = gantry(k, 30, 120, 72, 58);
    k.part('fade'); k.span(at, g, 9, 1);
    k.part(); var t = transformer(k, 50, 112);
    k.part('fade'); g.forEach(function (a, j) { k.wire(a, t.hv[j], 0, 2); });
    k.part(); hall(k, -190, 170, 250, 82, 40, 2, 7);
    k.part('fade'); t.lv.forEach(function (l, j) { k.wire(l, [40 + j * 6, 170, 40], 3, 3); });
    var cur = new Current(k);
    cur.set(Infinity);
    var e = k.ext;
    svg.setAttribute('viewBox', [r1(e[0] - 6), r1(e[1] - 6), r1(e[2] - e[0] + 12), r1(e[3] - e[1] + 12)].join(' '));
    fitStroke(svg, cur);
    return { svg: svg, current: cur };
  }

  function detailSmall(container) {
    var svg = newSvg(container, 'detail-svg');
    var k = new Kit(svg);
    k.group('d');
    k.part(); k.box(-150, -60, 0, 300, 300, 4, 'pad');
    k.zoff = 4;
    var ys = [-30, 50, 130], prev = null;
    ys.forEach(function (y, i) {
      k.part(); var a = pole(k, 70, y, 50);
      if (i === 2) { k.cyl(76, y + 3, 30, 5, 11, 'tank'); }
      k.part('fade'); k.span(prev || a.map(function (p) { return [p[0], p[1] - 120, p[2] + 4]; }), a, 5, i);
      prev = a;
    });
    k.part(); hall(k, -120, 170, 150, 64, 26, 1, 4);
    k.part('fade'); k.wire([76, 133, 36], [20, 170, 26], 6, 3);
    var cur = new Current(k);
    cur.set(Infinity);
    var e = k.ext;
    svg.setAttribute('viewBox', [r1(e[0] - 6), r1(e[1] - 6), r1(e[2] - e[0] + 12), r1(e[3] - e[1] + 12)].join(' '));
    fitStroke(svg, cur);
    return { svg: svg, current: cur };
  }

  /* ================================================================== story */

  function Story(section) {
    var self = this;
    this.section = section;
    this.sceneHost = section.querySelector('#story-scene');
    this.svg = newSvg(this.sceneHost, 'story-svg');
    this.kit = new Kit(this.svg);
    buildScene(this.kit, { plant: true, from: 0 });
    this.current = new Current(this.kit);
    var c = this.current;
    /* Where the current has reached by the end of each step's narration. */
    this.milestones = [c.endOf(0), c.endOf(5), c.endOf(9), c.endOf(13), c.total];
    var e = this.kit.ext;
    this.sceneBox = { x: e[0], y: e[1], w: e[2] - e[0], h: e[3] - e[1] };
    /* Camera keyframes: a focus point and how many scene units span the art width. */
    function F(x, y, z) { return P(x, y, z); }
    this.keys = [
      { f: F(110, -1200, 40), span: 620 },
      { f: F(120, -610, 50), span: 1180 },
      { f: F(136, 18, 26), span: 520 },
      { f: F(130, 292, 26), span: 560 },
      { f: F(120, 520, 16), span: 860 },
      null
    ];
    this.boardHost = section.querySelector('#story-board');
    this.board = new IsoBoard(this.boardHost, {
      labels: 'covered', hidden: true, fill: 0.96,
      maxH: function () { return section.classList.contains('is-static') ? Math.min(620, window.innerHeight * 0.8) : self.boardHost.clientHeight; }
    });
    this.size();
    window.addEventListener('resize', function () { self.size(); self.update(self.q, self.isStatic); });
    this.q = 0;
  }
  Story.prototype.size = function () {
    var r = this.sceneHost.getBoundingClientRect();
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.svg.setAttribute('viewBox', '0 0 ' + r1(this.W) + ' ' + r1(this.H));
  };
  Story.prototype.camAt = function (q) {
    var W = this.W, H = this.H, B = this.sceneBox, wide = W > 640;
    var fit = { f: [B.x + B.w / 2, B.y + B.h / 2], s: Math.min(W * 0.9 / B.w, H * (this.isStatic ? 0.94 : 0.3) / B.h), vy: this.isStatic ? 0.5 : (wide ? 0.17 : 0.16) };
    var keys = this.keys.map(function (k) {
      if (!k) return fit;
      return { f: k.f, s: W / (wide ? k.span : k.span * 0.82), vy: 0.5 };
    });
    if (this.isStatic) return fit;
    var x = clamp(q - 0.5, 0, keys.length - 1);
    var i = Math.min(keys.length - 2, Math.floor(x)), t = easeInOut(x - i);
    var a = keys[i], b = keys[i + 1];
    /* Interpolate scale geometrically so the pull-back reads as distance, not a linear shrink. */
    var s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), t));
    return { f: [lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t)], s: s, vy: lerp(a.vy, b.vy, t) };
  };
  Story.prototype.update = function (q, isStatic) {
    this.q = q;
    this.isStatic = !!isStatic;
    var k = this.kit, self = this;
    var cam = this.camAt(q);
    k.root.setAttribute('transform', 'translate(' + r1(this.W / 2) + ' ' + r1(this.H * cam.vy) + ') scale(' + cam.s.toFixed(4) + ') translate(' + r1(-cam.f[0]) + ' ' + r1(-cam.f[1]) + ')');
    var sw = Math.max(0.6, Math.min(2.4, 1 / cam.s));
    this.svg.style.setProperty('--sw', sw.toFixed(3));
    this.current.sw = sw;

    /* Assembly: each step's parts drop into place, staggered, during the step's opening. */
    k.groups.forEach(function (g, gi) {
      var b = gi === 0 ? 1 : smooth((q - (gi - 0.5)) / 0.8);
      if (isStatic) b = 1;
      var parts = g._parts, n = parts.length;
      parts.forEach(function (p, j) {
        var start = n > 1 ? (j / (n - 1)) * 0.6 : 0;
        var t = clamp((b - start) / 0.4, 0, 1);
        if (p._t === t) return;
        p._t = t;
        if (t >= 1) { p.removeAttribute('transform'); p.style.opacity = ''; return; }
        if (p._kind === 'drop') p.setAttribute('transform', 'translate(0 ' + r1(-(1 - easeOut(t)) * 90) + ')');
        p.style.opacity = t <= 0 ? 0 : (p._kind === 'fade' ? t : clamp(t * 2, 0, 1));
      });
    });

    /* Current: from the previous milestone to this step's milestone across the step. */
    var len;
    if (isStatic) len = Infinity;
    else {
      var st = Math.floor(clamp(q, 0, 5.999));
      if (st >= 5) len = Infinity;
      else {
        var from = st === 0 ? 0 : this.milestones[st - 1], to = this.milestones[st];
        len = lerp(from, to, smooth((q - st - 0.1) / 0.8));
      }
    }
    this.current.set(len);

    /* Step 6: the camera pulls back and up; the board rises underneath and its tiles extrude. */
    var rise = isStatic ? 1 : smooth((q - 5.0) / 0.55);
    var show = isStatic ? 1 : clamp((q - 4.8) / 0.35, 0, 1);
    this.boardHost.style.opacity = show;
    this.boardHost.style.visibility = show > 0 ? 'visible' : 'hidden';
    this.boardHost.style.transform = isStatic ? '' : 'translateY(' + r1((1 - easeOut(clamp((q - 4.8) / 0.6, 0, 1))) * 90) + 'px)';
    var tileRise = isStatic ? 1 : smooth((q - 5.2) / 0.6);
    if (this.board.rise !== tileRise || !this._boardOnce) {
      this._boardOnce = true;
      this.board.rise = tileRise;
      this.board.refresh({ instant: true });
    } else if (rise > 0 && rise < 1) this.board.placeLabels();
  };

  /* ================================================================== boot */

  DEM.ready(function (DEM) {
    var motion = DEM.motion;

    /* Story mode hides the scales section; the nav anchor follows the story instead. */
    if (motion === 'story') document.getElementById('nav-scales').setAttribute('href', '#story');

    DEM.renderFind(document.getElementById('find'));
    var ctl = document.querySelector('#find .dem-find-control');
    if (ctl) chevron(ctl);

    DEM.renderLegend(document.getElementById('legend'));
    legendTiles(document.getElementById('legend'));

    var hero = heroScene(document.getElementById('hero-campus'));
    var heroBoard = new IsoBoard(document.getElementById('hero-board'), {
      labels: 'covered', hidden: true, fill: 1,
      maxH: function () { return Math.max(260, window.innerHeight * 0.62); }
    });
    heroBoard.host.classList.add('is-hero');

    var board = new IsoBoard(document.getElementById('map'), {
      labels: 'all', tip: true, fill: 0.97,
      maxH: function () { return Math.max(320, window.innerHeight * 0.88); }
    });
    var map = board.map;

    DEM.renderList(document.getElementById('list'));
    DEM.renderDirectory(document.getElementById('directory'));

    var details = null;
    if (motion !== 'story') {
      details = { large: detailLarge(document.getElementById('detail-large')), small: detailSmall(document.getElementById('detail-small')) };
    }

    /* Hover, selection and app highlight lift the matching tiles on every board. */
    DEM.on('state:hover', function (code) { refreshAll(); board.showTip(code); });
    DEM.on('app:hover', function () { refreshAll(); });
    DEM.on('state:select', function () { refreshAll(); });
    DEM.on('panel:close', function () { refreshAll(); });
    DEM.on('state:energized', function (d) {
      boards.forEach(function (b) {
        if (b.map !== d.map) return;
        var t = b.byCode[d.code];
        if (t) t.g.classList.add('is-energized');
        b.refresh();
      });
    });

    if (motion === 'energize') {
      var run = map.energize({ loop: 7000 });
      liveCorridors(run);
      board.refresh({ instant: true });
      heroEnergize(hero, heroBoard);
      /* Repeat pulses run only while the board is on screen. */
      new IntersectionObserver(function (es) {
        board.host.classList.toggle('is-offscreen', !es[0].isIntersecting);
      }).observe(board.host);
    }

    if (motion === 'zoom') {
      DEM.renderScaleToggle(document.getElementById('scale-toggle'));
      DEM.renderScaleToggle(document.getElementById('scale-toggle-map'));
      var first = true;
      function onScale(s) {
        board.scale = s;
        var cam = board.camFor();
        var ms = first ? 0 : 1100;
        board.setCamera(cam, ms);
        board.followUntil = performance.now() + ms + 80;
        map.zoomTo(s === 'small' ? NORTHEAST : null, ms);
        refreshAll();
        if (details) {
          details.large.current.set(s === 'large' ? Infinity : 0);
          details.small.current.set(s === 'small' ? Infinity : 0);
        }
        document.querySelectorAll('[data-scale-block]').forEach(function (n) {
          n.classList.toggle('is-active', n.getAttribute('data-scale-block') === s);
        });
        first = false;
      }
      DEM.on('scale:change', onScale);
      onScale(ROOT.getAttribute('data-scale') || 'large');
      board.layout();
    }

    if (motion === 'micro') {
      DEM.renderFilter(document.getElementById('filter'));
      DEM.on('filter:change', function () { refreshAll({ wave: true }); });
    }

    if (motion === 'story') {
      var section = document.getElementById('story');
      DEM.renderStorySteps(document.getElementById('story-steps'));
      var story = new Story(section);
      DEM.scrollStory(section, function (s) {
        /* The core keeps reporting scroll progress under reduced motion; the static view wins. */
        if (s.isStatic || section.classList.contains('is-static')) {
          if (!story.isStatic || s.isStatic) { story.size(); story.update(6, true); }
          return;
        }
        story.update(s.p * s.steps, false);
      });
      DEM.on('reducedmotion', function () { story.size(); boards.forEach(function (b) { b.applyMode(true); }); });
    } else {
      DEM.on('reducedmotion', function () { boards.forEach(function (b) { b.applyMode(true); b.refresh({ instant: true }); }); });
    }

    /* Fonts change label widths; place everything again once they land. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { boards.forEach(function (b) { b.placeLabels(); }); });
    window.addEventListener('load', function () { boards.forEach(function (b) { b.applyMode(true); b.refresh({ instant: true }); }); });
  });
})();
