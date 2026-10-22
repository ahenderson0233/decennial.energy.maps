/*
  Artwork set 4, "Blueprint to built". Every structure is first drafted as plan linework (object lines,
  hidden lines, construction overshoot, dimension strings without figures) and then builds into flat-shaded
  material the moment current reaches it: the drawing becomes the asset.
  - Geometry comes from window.ISOKIT (the shared seven-stop power path). BlueKit draws each part twice:
    a built layer (filled faces, ink edges) and a plan layer over it.
  - A part builds when current first touches its 3D bounds; material rises from the ground with a clip wipe.
  - Stroke widths and dash lengths are multiplied by --sw (the inverse camera scale), so hairlines stay crisp.
  Implements window.DEM_ART (see ../shared/ART-CONTRACT.md).
*/
(function () {
  'use strict';
  var K = window.ISOKIT;
  var el = K.el, P = K.P, clamp = K.clamp, lerp = K.lerp, smooth = K.smooth, easeOut = K.easeOut, easeInOut = K.easeInOut, r1 = K.r1;
  var Kit = K.Kit;
  var C30 = Math.cos(Math.PI / 6);
  var uid = 0;
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }
  /* Inverse of smoothstep, so a structure's build can be scheduled at the moment current reaches it. */
  function invSmooth(u) { u = clamp(u, 0, 1); return 0.5 - Math.sin(Math.asin(1 - 2 * u) / 3); }

  /* ================================================================== the two-layer kit */

  function BlueKit(parent) {
    Kit.call(this, parent);
    this.root.setAttribute('class', 'bp-scene');
    this.parts = [];
    this.cp = null;
    this.track = true;
  }
  BlueKit.prototype = Object.create(Kit.prototype);
  BlueKit.prototype.constructor = BlueKit;

  /* Every projected point also grows the current part's 3D bounds and screen bounds. */
  BlueKit.prototype.p = function (x, y, z) {
    var q = Kit.prototype.p.call(this, x, y, z), c = this.cp;
    if (c && this.track) {
      var Z = (z || 0) + this.zoff, a = c._a3, e = c._e2;
      if (x < a[0]) a[0] = x; if (y < a[1]) a[1] = y; if (Z < a[2]) a[2] = Z;
      if (x > a[3]) a[3] = x; if (y > a[4]) a[4] = y; if (Z > a[5]) a[5] = Z;
      if (q[0] < e[0]) e[0] = q[0]; if (q[1] < e[1]) e[1] = q[1];
      if (q[0] > e[2]) e[2] = q[0]; if (q[1] > e[3]) e[3] = q[1];
    }
    return q;
  };

  /* A part: built geometry, then the plan extras (hidden, construction, dimensions), then plan object lines. */
  BlueKit.prototype.part = function (kind) {
    var w = el('g', { class: 'bp-part' }, this.layer);
    w._kind = kind || 'drop';
    w._b = el('g', { class: 'bp-b' }, w);
    w._x = el('g', { class: 'bp-x' }, w);
    w._p = el('g', { class: 'bp-p' }, w);
    w._a3 = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    w._e2 = [Infinity, Infinity, -Infinity, -Infinity];
    w._wires = [];
    if (this.layer._parts) this.layer._parts.push(w);
    this.parts.push(w);
    this.cur = w._b;
    this.cp = w;
    return w;
  };

  /* Plan-only linework; it does not count toward the part's bounds. */
  BlueKit.prototype.x = function (pts, cls) {
    this.track = false;
    var n = el('path', { d: this.d(pts, false), class: cls }, this.cp._x);
    this.track = true;
    return n;
  };

  /* A dimension string with no figure: two extension lines, the dimension line, slashed ticks. */
  BlueKit.prototype.dim = function (a, b, o, tk) {
    var self = this;
    function add(p, v, s) { return [p[0] + v[0] * s, p[1] + v[1] * s, p[2] + v[2] * s]; }
    [a, b].forEach(function (p) { self.x([add(p, o, 0.2), add(p, o, 1.25)], 'px-dim'); });
    var A = add(a, o, 1), B = add(b, o, 1);
    this.x([A, B], 'px-dim');
    [A, B].forEach(function (p) { self.x([add(p, tk, -2.6), add(p, tk, 2.6)], 'px-tick'); });
  };

  BlueKit.prototype.box = function (x, y, z, w, d, h, cls) {
    Kit.prototype.box.call(this, x, y, z, w, d, h, cls);
    if (!this.cp) return;
    var c = ' ' + (cls || '') + ' ';
    var pad = c.indexOf(' pad ') >= 0;
    var big = pad || / (hall|bldg) /.test(c);
    var solid = / (hall|bldg|tank|genset) /.test(c);
    if (solid) {
      this.x([[x + w, y, z], [x, y, z], [x, y + d, z]], 'px-hid');
      this.x([[x, y, z], [x, y, z + h]], 'px-hid');
    }
    if (big && z === 0) {
      var e = 12;
      this.x([[x - e, y + d, 0], [x + w + e, y + d, 0]], 'px-con');
      this.x([[x + w, y - e, 0], [x + w, y + d + e, 0]], 'px-con');
      this.x([[x - e, y, 0], [x + w + e, y, 0]], 'px-con');
      this.x([[x, y - e, 0], [x, y + d + e, 0]], 'px-con');
    }
    if (pad) {
      this.dim([x, y + d, 0], [x + w, y + d, 0], [0, 20, 0], [1, 0, 1]);
      this.dim([x + w, y, 0], [x + w, y + d, 0], [20, 0, 0], [0, 1, 1]);
    }
    if (c.indexOf(' hall ') >= 0) this.dim([x + w, y + d, z], [x + w, y + d, z + h], [16, 0, 0], [1, 0, 1]);
  };

  BlueKit.prototype.cyl = function (x, y, z, r, h, cls) {
    Kit.prototype.cyl.call(this, x, y, z, r, h, cls);
    if (!this.cp) return;
    /* The ellipses reach past the center points; widen the bounds to the cylinder's square footprint. */
    this.p(x + r, y - r, z); this.p(x - r, y + r, z); this.p(x + r, y + r, z); this.p(x - r, y - r, z + h);
    if (/stack-big/.test(cls || '')) {
      this.x([[x, y, z - 8], [x, y, z + h + 16]], 'px-cl');
      var b = P(x, y, z + this.zoff), rx = r * Math.SQRT2 * C30, ry = r * Math.SQRT2 * 0.5;
      el('path', { class: 'px-hid', d: 'M' + r1(b[0] - rx) + ',' + r1(b[1]) + 'A' + r1(rx) + ',' + r1(ry) + ' 0 0 1 ' + r1(b[0] + rx) + ',' + r1(b[1]) }, this.cp._x);
    }
  };

  /* Conductors: the shared wire (dead line, ink case, gold core), its 3D samples, and a plan centerline. */
  BlueKit.prototype.wire = function (a, b, sag, hop) {
    var w = Kit.prototype.wire.call(this, a, b, sag, hop);
    var n = sag ? 12 : 1;
    w.p3 = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      w.p3.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t) - sag * 4 * t * (1 - t) + this.zoff]);
    }
    el('path', { class: 'px-cl', d: w.g.firstChild.getAttribute('d') }, this.cp._x);
    this.cp._wires.push(w);
    return w;
  };

  /* After the scene is built: plan object lines as unit-length clones of the built edges, and a clip per part. */
  function finish(kit, svg) {
    var defs = el('defs', null);
    svg.insertBefore(defs, svg.firstChild);
    var id = 'bp' + (++uid);
    kit.parts.forEach(function (w, i) {
      w._dT = w._bT = -1;
      if (w._kind === 'fade') return;
      var frag = document.createDocumentFragment();
      w._b.querySelectorAll('path, ellipse').forEach(function (n) {
        var c = n.cloneNode(false);
        c.setAttribute('class', 'po');
        c.setAttribute('pathLength', '1');
        frag.appendChild(c);
      });
      w._p.appendChild(frag);
      var e = w._e2, m = 3;
      w._cx = [e[0] - m, e[1] - m, e[2] + m, e[3] + m];
      var cp = el('clipPath', { id: id + '-' + i }, defs);
      w._clip = el('rect', { x: r1(w._cx[0]), width: r1(w._cx[2] - w._cx[0]), y: r1(w._cx[1]), height: r1(w._cx[3] - w._cx[1]) }, cp);
      w._clipId = 'url(#' + id + '-' + i + ')';
    });
    return defs;
  }

  /* Where current first touches each part, as a distance along the whole path. */
  function arrivals(kit, cur) {
    var S = [];
    cur.order.forEach(function (o) {
      o.ws.forEach(function (w) {
        w._start = o.start;
        var n = w.p3.length - 1;
        w.p3.forEach(function (p, i) { S.push([p[0], p[1], p[2], o.start + (n ? i / n : 0) * o.len]); });
      });
    });
    kit.parts.forEach(function (w) {
      if (w._kind === 'fade') {
        var m = Infinity;
        w._wires.forEach(function (x) { if (x._start !== undefined && x._start < m) m = x._start; });
        w._arrL = m < Infinity ? m : null;
        return;
      }
      var a = w._a3, best = Infinity, M = 5;
      for (var i = 0; i < S.length; i++) {
        var s = S[i];
        if (s[3] < best && s[0] >= a[0] - M && s[0] <= a[3] + M && s[1] >= a[1] - M && s[1] <= a[4] + M && s[2] >= a[2] - M && s[2] <= a[5] + 70) best = s[3];
      }
      w._arrL = best < Infinity ? best : null;
    });
  }

  function vis(n, on, op) {
    n.style.visibility = on ? '' : 'hidden';
    n.style.opacity = on && op < 0.999 ? op.toFixed(3) : '';
  }

  /* One part at draft progress dT and build progress bT (both 0..1). */
  function apply(w, dT, bT) {
    if (w._dT === dT && w._bT === bT) return;
    w._dT = dT; w._bT = bT;
    if (w._kind === 'fade') {
      vis(w._b, bT > 0, bT);
      var co = dT * (1 - bT);
      vis(w._x, co > 0.002, co);
      return;
    }
    var po = dT > 0 ? 1 - smooth((bT - 0.55) / 0.45) : 0;
    w._p.style.setProperty('--d', (1 - easeOut(dT)).toFixed(4));
    vis(w._p, po > 0.002, po);
    var xo = smooth((dT - 0.45) / 0.55) * (1 - smooth(bT / 0.45));
    vis(w._x, xo > 0.002, xo);
    if (bT <= 0) { vis(w._b, false, 1); return; }
    vis(w._b, true, 1);
    if (bT >= 1) { w._b.removeAttribute('clip-path'); return; }
    var c = w._cx, y = lerp(c[3], c[1], easeOut(bT));
    w._clip.setAttribute('y', r1(y));
    w._clip.setAttribute('height', r1(Math.max(0, c[3] - y)));
    w._b.setAttribute('clip-path', w._clipId);
  }

  function strokes(svg, sw) {
    svg.style.setProperty('--sw', sw.toFixed(3));
    svg.style.setProperty('--da-hid', r1(3.2 * sw) + ' ' + r1(2.4 * sw));
    svg.style.setProperty('--da-cl', r1(9 * sw) + ' ' + r1(2.4 * sw) + ' ' + r1(1.6 * sw) + ' ' + r1(2.4 * sw));
  }

  /* ================================================================== hero */

  function hero(container) {
    var svg = K.newSvg(container, 'campus-svg bp-svg');
    var kit = new BlueKit(svg);
    K.buildScene(kit, { plant: false, from: 4 });
    var cur = new K.Current(kit);
    finish(kit, svg);
    arrivals(kit, cur);
    var e = kit.ext;
    svg.setAttribute('viewBox', [r1(e[0] - 8), r1(e[1] - 6), r1(e[2] - e[0] + 14), r1(e[3] - e[1] + 14)].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');

    function fit() {
      var vb = svg.viewBox.baseVal, w = svg.clientWidth, h = svg.clientHeight;
      if (!vb || !vb.width || !w) return;
      var sw = 1 / Math.min(w / vb.width, h ? h / vb.height : Infinity);
      strokes(svg, sw);
      cur.sw = sw;
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(svg);

    /* Timeline (ms): a left-to-right drafting pass, then current runs the path and each part builds on arrival. */
    var T0 = 620, T1 = 3150, DRAW = 300, BUILD = 440, WIRE = 150;
    function ease(u) { u = clamp(u, 0, 1); return 0.35 * u + 0.65 * smooth(u); }
    function tOfL(L) {
      var u = clamp(L / cur.total, 0, 1), lo = 0, hi = 1;
      for (var i = 0; i < 26; i++) { var m = (lo + hi) / 2; if (ease(m) < u) lo = m; else hi = m; }
      return T0 + (T1 - T0) * lo;
    }
    var x0 = Infinity, x1 = -Infinity;
    kit.parts.forEach(function (w) { var cx = (w._e2[0] + w._e2[2]) / 2; w._mx = cx; x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); });
    var prev = null, end = T1;
    kit.parts.forEach(function (w) {
      var fade = w._kind === 'fade';
      w._hd = ((w._mx - x0) / ((x1 - x0) || 1)) * 380;
      var tb = w._arrL !== null ? tOfL(w._arrL) - (fade ? WIRE - 20 : 40) : (prev !== null ? prev + 90 : T0);
      if (!fade) prev = tb;
      w._hb = Math.max(tb, w._hd + DRAW * 0.8);
      w._hl = fade ? WIRE : BUILD;
      end = Math.max(end, w._hb + w._hl);
    });

    function state(t) {
      kit.parts.forEach(function (w) { apply(w, clamp((t - w._hd) / DRAW, 0, 1), clamp((t - w._hb) / w._hl, 0, 1)); });
      cur.set(t >= T1 ? Infinity : t <= T0 ? 0 : cur.total * ease((t - T0) / (T1 - T0)));
    }
    function done() { kit.parts.forEach(function (w) { apply(w, 1, 1); }); cur.set(Infinity); }
    done();

    return {
      run: function (onArrive) {
        if (reduced()) { done(); onArrive(); return; }
        var t0 = 0, fired = false;
        state(0);
        function frame(now) {
          if (!t0) t0 = now;
          var t = now - t0;
          state(t);
          if (!fired && t >= T1) { fired = true; onArrive(); }
          if (t < end) requestAnimationFrame(frame);
          else done();
        }
        requestAnimationFrame(frame);
      }
    };
  }

  /* ================================================================== story */

  /* The drafting grid lies in the ground plane of the scene, in two weights. */
  function drawGrid(g) {
    var minor = '', major = '', X0 = -1000, X1 = 2200, Y0 = -2200, Y1 = 1500, S = 20, v, a, b, s;
    for (v = X0; v <= X1; v += S) {
      a = P(v, Y0, 0); b = P(v, Y1, 0);
      s = 'M' + r1(a[0]) + ',' + r1(a[1]) + 'L' + r1(b[0]) + ',' + r1(b[1]);
      if (v % 100 === 0) major += s; else minor += s;
    }
    for (v = Y0; v <= Y1; v += S) {
      a = P(X0, v, 0); b = P(X1, v, 0);
      s = 'M' + r1(a[0]) + ',' + r1(a[1]) + 'L' + r1(b[0]) + ',' + r1(b[1]);
      if (v % 100 === 0) major += s; else minor += s;
    }
    return [el('path', { class: 'bp-grid-minor', d: minor }, g), el('path', { class: 'bp-grid-major', d: major }, g)];
  }

  function story(host) {
    var svg = K.newSvg(host, 'story-svg bp-svg');
    var gridWrap = el('g', { class: 'bp-gridwrap' }, svg);
    var gridCam = el('g', null, gridWrap);
    var grid = drawGrid(gridCam), gridCy = null;
    var camG = el('g', { class: 'bp-cam' }, svg);
    var kit = new BlueKit(camG);
    K.buildScene(kit, { plant: true, from: 0 });
    var current = new K.Current(kit);
    var defs = finish(kit, svg);
    arrivals(kit, current);

    /* The grid fades out toward the edges of the art column. */
    var mid = 'bp' + (++uid);
    var rg = el('radialGradient', { id: mid + 'g', cx: '0.5', cy: '0.45', r: '0.6' }, defs);
    el('stop', { offset: '0.3', 'stop-color': '#fff' }, rg);
    el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, rg);
    var mask = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', maskContentUnits: 'userSpaceOnUse', x: 0, y: 0 }, defs);
    var mrect = el('rect', { x: 0, y: 0, fill: 'url(#' + mid + 'g)' }, mask);
    gridWrap.setAttribute('mask', 'url(#' + mid + ')');

    var marks = K.milestones(current);
    var e = kit.ext;
    var box = { x: e[0], y: e[1], w: e[2] - e[0], h: e[3] - e[1] };

    /* Current runs across [C0, C1] of each stop; drafting opens each stop; builds follow arrival. */
    var C0 = 0.25, C1 = 0.68, DRAW = 0.16, BUILD = 0.13, WIRE = 0.05;
    function lenAt(q) {
      if (q >= marks.length) return Infinity;
      var st = Math.max(0, Math.floor(q)), from = st ? marks[st - 1] : 0, to = marks[st];
      return lerp(from, to, smooth((q - st - C0) / (C1 - C0)));
    }
    function qOfL(L) {
      for (var st = 0; st < marks.length; st++) {
        var from = st ? marks[st - 1] : 0, to = marks[st];
        if (L <= to + 0.01) return st + C0 + (C1 - C0) * invSmooth(to > from ? (L - from) / (to - from) : 0);
      }
      return marks.length - 1 + C1;
    }
    kit.groups.forEach(function (g, gi) {
      var parts = g._parts, n = parts.length, prev = null;
      parts.forEach(function (w, j) {
        var fade = w._kind === 'fade';
        w._ds = gi === 0 ? -Infinity : gi - 0.06 + (n > 1 ? j / (n - 1) : 0) * 0.22;
        var qb = w._arrL !== null ? qOfL(w._arrL) - (fade ? WIRE : 0.02) : (prev !== null ? prev + 0.035 : gi + C0);
        qb = Math.max(qb, (gi === 0 ? 0 : w._ds) + 0.12);
        if (!fade) prev = qb;
        w._bs = qb;
        w._bl = fade ? WIRE : BUILD;
      });
    });

    /* Camera per drawn stop: a focus point and how many scene units span the art width (wide, then phone);
       stop 7 fits all. Phones get their own spans: the column is narrow but tall. */
    var keys = [
      { f: P(110, -1200, 40), span: 620, ph: 500 },
      { f: P(120, -610, 50), span: 1180, ph: 760 },
      { f: P(136, 18, 26), span: 560, ph: 450 },
      { f: P(880, -30, 30), span: 1420, ph: 900 },
      { f: P(130, 292, 26), span: 580, ph: 460 },
      { f: P(90, 500, 16), span: 640, ph: 520 }
    ];
    var W = 1, H = 1, isStatic = false;

    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      svg.setAttribute('viewBox', '0 0 ' + r1(W) + ' ' + r1(H));
      [mask, mrect].forEach(function (n) { n.setAttribute('width', r1(W)); n.setAttribute('height', r1(H)); });
    }
    function camAt(q) {
      var wide = W > 640;
      var fit = { f: [box.x + box.w / 2, box.y + box.h / 2], s: Math.min(W * 0.9 / box.w, H * (isStatic ? 0.94 : 0.3) / box.h), vy: isStatic ? 0.5 : (wide ? 0.17 : 0.16) };
      if (isStatic) return fit;
      var ks = keys.map(function (k) { return { f: k.f, s: W / (wide ? k.span : k.ph), vy: 0.5 }; }).concat([fit]);
      /* Hold each stop's framing; move across the step boundary. */
      var i = 0, t = 0;
      for (var j = 0; j < ks.length - 1; j++) {
        var last = j === ks.length - 2, a0 = last ? 5.8 : j + 0.88, a1 = last ? 6.25 : j + 1.28;
        if (q >= a1) { i = j + 1; continue; }
        if (q > a0) { i = j; t = easeInOut((q - a0) / (a1 - a0)); }
        break;
      }
      var a = ks[i], b = ks[Math.min(i + 1, ks.length - 1)];
      var s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), t));
      return { f: [lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t)], s: s, vy: lerp(a.vy, b.vy, t) };
    }
    var lastQ = null;
    function update(q, stat) {
      lastQ = q;
      isStatic = !!stat;
      var cam = camAt(q);
      var tr = 'translate(' + r1(W / 2) + ' ' + r1(H * cam.vy) + ') scale(' + cam.s.toFixed(4) + ') translate(' + r1(-cam.f[0]) + ' ' + r1(-cam.f[1]) + ')';
      kit.root.setAttribute('transform', tr);
      gridCam.setAttribute('transform', tr);
      /* Hairlines hold their screen weight; on the far pull-back they thin a little so the small drawing stays light. */
      var m = cam.s >= 0.7 ? 1 : lerp(0.62, 1, clamp((cam.s - 0.25) / 0.45, 0, 1));
      var sw = m / cam.s;
      strokes(svg, sw);
      current.sw = sw;
      /* The film recedes on the pull-back: minor rules drop out, major rules lighten, the fade follows the framing. */
      grid[0].style.opacity = smooth((cam.s - 0.3) / 0.35).toFixed(3);
      grid[1].style.opacity = lerp(0.45, 1, smooth((cam.s - 0.25) / 0.35)).toFixed(3);
      var cy = cam.vy.toFixed(3);
      if (cy !== gridCy) { gridCy = cy; rg.setAttribute('cy', cy); }

      kit.parts.forEach(function (w) {
        var dT = isStatic || w._ds === -Infinity ? 1 : clamp((q - w._ds) / DRAW, 0, 1);
        var bT = isStatic ? 1 : clamp((q - w._bs) / w._bl, 0, 1);
        apply(w, dT, bT);
      });
      current.set(isStatic ? Infinity : lenAt(q));
    }
    size();
    /* The column can settle after construction (fonts, the phone layout); re-measure and redraw when it does. */
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var r = host.getBoundingClientRect();
        if (Math.abs(r.width - W) < 0.5 && Math.abs(r.height - H) < 0.5) return;
        size();
        if (lastQ !== null) update(lastQ, isStatic);
      }).observe(host);
    }
    return { size: size, update: update };
  }

  window.DEM_ART = { id: 'blueprint', hero: hero, story: story };
})();
