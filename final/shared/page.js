/*
  Final landing page: everything except the artwork, shared by all four artwork sets.
  - IsoBoard: the hex map tilted on a plinth (hero, story and coverage boards).
  - Energize: the hero runs current to the data centers on load, then its board energizes; the coverage
    board energizes the first time it scrolls into view (the core waits for visibility).
  - Story: seven stops driven by scroll; the artwork draws stops 1-6, the board rises for stop 7.
  The artwork set registers window.DEM_ART before this file loads:
    DEM_ART.hero(container)  -> { run(onArrive) }   current in on load; onArrive() when it reaches the halls
    DEM_ART.story(container) -> { size(), update(q, isStatic) }   q runs 0..7 across the seven stops
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DEG = Math.PI / 180;
  var ROOT = document.documentElement;

  /* Cameras for the board: true isometric, and a flatter frontal view for phones and reduced motion. */
  var ISO = { a: 54.7356, b: 45 };
  var FLAT = { a: 24, b: 0 };
  var ZOOM_CAM = {
    iso: { large: { a: 44, b: 45 }, small: { a: 60, b: 45 } },
    flat: { large: { a: 14, b: 0 }, small: { a: 34, b: 0 } }
  };

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
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }

  /* After energize, every corridor gets a gold live core inside its ink casing. */
  function liveCorridors(run) {
    if (!run || !run.corridors) return;
    run.corridors.forEach(function (c) {
      var l = c.cloneNode(false);
      l.setAttribute('class', 'corridor-live');
      c.parentNode.appendChild(l);
    });
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

  function refreshAll(o) { boards.forEach(function (b) { b.refresh(o); }); }

  /* ================================================================== story */

  var STOPS = 7;

  /* The artwork draws stops 1-6; for stop 7 the board rises in front of it and its tiles extrude. */
  function StoryController(section, art) {
    var self = this;
    this.section = section;
    this.art = art;
    this.boardHost = section.querySelector('#story-board');
    this.board = new IsoBoard(this.boardHost, {
      labels: 'covered', hidden: true, fill: 0.96,
      maxH: function () { return section.classList.contains('is-static') ? Math.min(620, window.innerHeight * 0.8) : self.boardHost.clientHeight; }
    });
    window.addEventListener('resize', function () { self.art.size(); self.update(self.q, self.isStatic); });
    this.q = 0;
  }
  StoryController.prototype.update = function (q, isStatic) {
    this.q = q;
    this.isStatic = !!isStatic;
    this.art.update(q, this.isStatic);
    var last = STOPS - 1;
    var show = isStatic ? 1 : clamp((q - (last - 0.2)) / 0.35, 0, 1);
    this.boardHost.style.opacity = show;
    this.boardHost.style.visibility = show > 0 ? 'visible' : 'hidden';
    this.boardHost.style.transform = isStatic ? '' : 'translateY(' + r1((1 - easeOut(clamp((q - (last - 0.2)) / 0.6, 0, 1))) * 90) + 'px)';
    var tileRise = isStatic ? 1 : smooth((q - (last + 0.2)) / 0.6);
    if (this.board.rise !== tileRise || !this._once) {
      this._once = true;
      this.board.rise = tileRise;
      this.board.refresh({ instant: true });
    } else if (show > 0 && show < 1) this.board.placeLabels();
  };

  /* ================================================================== boot */

  DEM.ready(function (DEM) {
    var art = window.DEM_ART;

    /* Opened from the review site: a way back to the four versions. */
    if (new URLSearchParams(location.search).get('review') === '1') {
      var back = hel('nav', 'dem-review-back', document.body);
      back.setAttribute('aria-label', 'Review');
      var a = hel('a', null, back);
      a.href = '../../index.html';
      a.textContent = 'Back to the four versions';
    }

    DEM.renderFind(document.getElementById('find'));
    var ctl = document.querySelector('#find .dem-find-control');
    if (ctl) chevron(ctl);

    DEM.renderLegend(document.getElementById('legend'));
    legendTiles(document.getElementById('legend'));

    var hero = art.hero(document.getElementById('hero-campus'));
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

    /* Energize, part one: on load the hero's current runs to the data centers, then its board lights. */
    heroBoard.map.el.setAttribute('data-energize', 'pending');
    heroBoard.refresh({ instant: true });
    hero.run(function () { liveCorridors(heroBoard.map.energize({ loop: 0, speed: 600 })); });

    /* Energize, part two: the coverage board lights the first time it scrolls into view. */
    liveCorridors(map.energize({ loop: 7000 }));
    board.refresh({ instant: true });
    new IntersectionObserver(function (es) {
      board.host.classList.toggle('is-offscreen', !es[0].isIntersecting);
    }).observe(board.host);

    /* Story: seven stops. */
    var section = document.getElementById('story');
    section.style.setProperty('--story-steps', STOPS);
    DEM.renderStorySteps(document.getElementById('story-steps'));
    var story = new StoryController(section, art.story(document.getElementById('story-scene')));
    DEM.scrollStory(section, function (s) {
      if (s.isStatic || section.classList.contains('is-static')) {
        if (!story.isStatic || s.isStatic) { story.art.size(); story.update(STOPS, true); }
        return;
      }
      story.update(s.p * s.steps, false);
    });
    DEM.on('reducedmotion', function () { story.art.size(); boards.forEach(function (b) { b.applyMode(true); b.refresh({ instant: true }); }); });

    /* Fonts change label widths; place everything again once they land. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { boards.forEach(function (b) { b.placeLabels(); }); });
    window.addEventListener('load', function () { boards.forEach(function (b) { b.applyMode(true); b.refresh({ instant: true }); }); });
  });
})();
