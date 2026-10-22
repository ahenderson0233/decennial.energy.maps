/*
  Isometric drawing kit for the final landing page (shared by the current and blueprint artwork sets).
  - A 30-degree axonometric kit: three-tone faces, one stroke weight, conductors with a live gold core.
  - The power path scene in seven stops: generation, transmission, transmission substation, the hyperscale
    campus branching off that substation, the distribution feeder, the smaller data center, then coverage.
  - Current: lights the conductors hop by hop in path order.
  Everything is a generic illustration; it never sits on a state and never stands for a real project.
  Exposed as window.ISOKIT.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var C30 = Math.cos(Math.PI / 6), S30 = 0.5;

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
  function r1(v) { return Math.round(v * 10) / 10; }
  function P(x, y, z) { return [(x - y) * C30, (x + y) * S30 - (z || 0)]; }

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

  /* A lattice tower whose line runs along x (crossarms along y): the plain lattice with x and y swapped
     about the tower's own center. */
  function latticeX(k, x, y, H) {
    var sw = Object.create(k);
    sw.line = function (pts, cls) {
      return k.line(pts.map(function (p) { return [x + (p[1] - y), y + (p[0] - x), p[2]]; }), cls);
    };
    return lattice(sw, x, y, H).map(function (p) { return [x + (p[1] - y), y + (p[0] - x), p[2]]; });
  }

  /* A gantry spanning along y at a fixed x, for lines that leave along x. */
  function gantryY(k, x, y0, y1, H) {
    k.box(x - 2, y0 - 2, 0, 4, 4, H, 'steel');
    k.box(x - 2, y1 - 2, 0, 4, 4, H, 'steel');
    k.box(x - 2, y0 - 2, H - 5, 4, y1 - y0 + 4, 5, 'steel');
    var ys = [lerp(y0, y1, 0.2), lerp(y0, y1, 0.8), lerp(y0, y1, 0.5)];
    return ys.map(function (y) { k.line([[x, y, H - 5], [x, y, H - 13]], 'ins'); return [x, y, H - 13]; });
  }

  /* ---------------------------------------------------------------- the scene */

  var TOWERS = [-950, -780, -610, -440, -270];
  var HYPER_TOWERS = [420, 570];

  /* Stops in path order; each is a kit group, and the story assembles one per step. */
  var GROUPS = ['generation', 'transmission', 'substation', 'hyperscale', 'feeder', 'datacenter'];

  /* Hops (the order current flows):
     0 plant; 1-5 transmission spans; 6-9 into and through the transmission substation;
     10-15 the hyperscale branch (bus, east gantry, two towers, campus switchyard, halls);
     16-18 the distribution feeder; 19-20 the smaller data center. */
  var MILESTONE_HOPS = [0, 5, 9, 15, 18];

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

    /* The transmission substation: incoming gantry, high-voltage bus, step-down transformers. */
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
    k.part(); var eg = gantryY(k, 246, -44, 36, 62);
    k.part(); fence(k, 16, -86, 240, 224, 15, 'front');
    k.zoff = 0;

    /* The hyperscale campus: a dedicated high-voltage tap off the transmission bus, its own switchyard,
       three large halls and a generator yard. */
    k.group('hyperscale');
    k.part('fade');
    bars.forEach(function (yb, j) { k.wire([212, yb, 40], [eg[j][0], eg[j][1], eg[j][2] + 4], 0, 10); });
    var hp = eg.map(function (a) { return [a[0], a[1], a[2] + 4]; });
    HYPER_TOWERS.forEach(function (tx, j) {
      k.part(); var ht = latticeX(k, tx, -4, 112);
      k.part('fade'); k.span(hp, ht, 12, 11 + j);
      hp = ht;
    });
    k.part(); k.box(640, -110, 0, 150, 190, 4, 'pad yard');
    k.zoff = 4;
    k.part(); fence(k, 646, -104, 138, 178, 14, 'back');
    k.part(); var hg = gantryY(k, 662, -44, 36, 58);
    k.part('fade'); k.span(hp, hg.map(function (a) { return [a[0], a[1], a[2] - 4]; }), 10, 13);
    k.part(); var h1 = transformer(k, 700, -76);
    k.part(); var h2 = transformer(k, 700, 14);
    k.part('fade');
    [h1, h2].forEach(function (t) { t.hv.forEach(function (h, j) { k.wire([hg[j][0], hg[j][1], hg[j][2] - 4], h, 3, 14); }); });
    k.part(); fence(k, 646, -104, 138, 178, 14, 'front');
    k.zoff = 0;
    k.part(); k.box(810, -300, 0, 520, 560, 6, 'pad');
    k.zoff = 6;
    var halls = [-280, -110, 60];
    halls.forEach(function (hy) { k.part(); hall(k, 840, hy, 440, 130, 48, 3, 12); });
    k.part();
    for (var g = 0; g < 6; g++) genset(k, 850 + g * 72, 214);
    k.zoff = 0;
    /* Service drops onto the hall roofs: the north transformer feeds the first two halls, the south one the third. */
    var drops = [[[848, -240, 54], [848, -200, 54], [848, -60, 54]], [[848, 90, 54], [848, 120, 54], [848, 150, 54]]];
    k.part('fade');
    /* Transformer bushings were drawn on the 4-unit switchyard pad; add that back now the offset is cleared. */
    [h1, h2].forEach(function (t, ti) { t.lv.forEach(function (l, j) { k.wire([l[0], l[1], l[2] + 4], drops[ti][j], 4, 15); }); });

    /* The distribution feeder: from the substation's low-voltage side out along wood poles. */
    k.group('feeder');
    var poles = [212, 292, 372], pa = null;
    var riser = [[118, 118, 24], [140, 118, 24], [129, 118, 24]];
    poles.forEach(function (py, j) {
      k.part(); var a = pole(k, 130, py, 52);
      k.part('fade'); k.span(pa || riser, a, pa ? 6 : 3, 16 + j);
      pa = a;
    });

    /* The smaller data center (under 25 MW) on the feeder. */
    k.group('datacenter');
    k.part(); k.box(-70, 404, 0, 330, 190, 6, 'pad');
    k.zoff = 6;
    k.part(); k.box(100, 418, 0, 64, 28, 26, 'bldg');
    k.part('fade'); k.span(pa, [[112, 430, 26], [150, 430, 26], [132, 430, 26]], 5, 19);
    k.part('fade'); k.wire([110, 446, 22], [90, 470, 34], 0, 20);
    k.part(); hall(k, -50, 462, 200, 96, 34, 1, 5);
    k.part(); for (var s = 0; s < 2; s++) genset(k, 180, 474 + s * 28);
    k.zoff = 0;
  }

  /* Current milestones: how far current has run by the end of each stop's narration (six drawn stops). */
  function milestones(cur) {
    return MILESTONE_HOPS.map(function (h) { return cur.endOf(h); }).concat([cur.total]);
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

  window.ISOKIT = {
    NS: NS, P: P, el: el, clamp: clamp, lerp: lerp, smooth: smooth, easeOut: easeOut, easeInOut: easeInOut, r1: r1,
    Kit: Kit, Current: Current, fitStroke: fitStroke, newSvg: newSvg, buildScene: buildScene, milestones: milestones,
    GROUPS: GROUPS, TOWERS: TOWERS,
    equipment: { lattice: lattice, latticeX: latticeX, gantry: gantry, gantryY: gantryY, pole: pole, transformer: transformer, fence: fence, hall: hall, genset: genset }
  };
})();
