/*
  Night lights field: the United States at night as a dot matrix.
  Covered states are lit fields drawn in a lights layer beneath the core's state paths (which stay on
  top and keep every interaction). Dots are SVG <pattern> lattices fixed in whole screen pixels, so a
  zoom moves the geography under the matrix. Gold is power only.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var N = 10;                      /* pattern tile, in lattice positions */
  var NORTHEAST = ['NY', 'MA', 'CT', 'RI', 'VT', 'NH', 'NJ', 'PA', 'MD', 'DE', 'DC', 'VA'];

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function rnd(i, j, k) { var x = Math.sin((i + 1) * 127.1 + (j + 1) * 311.7 + k * 74.7) * 43758.5453; return x - Math.floor(x); }
  function reduced() { return !!DEM.reducedMotion; }

  /* ------------------------------------------------------------ dot lattices */

  /* Each kind returns lit positions for lattice cell (i, j), in pitch units. */
  var LATTICE = {
    land: function (i, j) { return (i % 2 === 0 && j % 2 === 0) ? [[i + .5, j + .5]] : []; },
    hosting: function (i, j) { return [[i + .5, j + .5]]; },
    'hosting-partial': function (i, j) { return (i + j) % 5 < 2 ? [[i + .5, j + .5]] : []; },
    siting: function (i, j) { return [[i + .25, j + .25], [i + .75, j + .75]]; },
    'siting-partial': function (i, j) { return (i + j) % 5 < 2 ? [[i + .25, j + .25], [i + .75, j + .75]] : []; }
  };
  var RADIUS = { land: .2, hosting: .27, 'hosting-partial': .27, siting: .15, 'siting-partial': .15 };
  function alphaFor(kind, h) {
    if (kind === 'land') return (.6 + .4 * h).toFixed(2);
    if (kind.indexOf('siting') === 0) return (.5 + .5 * h).toFixed(2);
    return (.34 + .66 * Math.pow(h, 1.4)).toFixed(2);
  }

  function buildPattern(id, kind, gold) {
    var p = s('pattern', { id: id, class: 'nl-pat', patternUnits: 'userSpaceOnUse', width: N, height: N });
    var base = kind.replace('-partial', '');
    var cls = 'nl-dot ' + (gold ? 'nl-dot-gold' : 'nl-dot-' + base);
    for (var j = 0; j < N; j++) {
      for (var i = 0; i < N; i++) {
        LATTICE[kind](i, j).forEach(function (pt, k) {
          p.appendChild(s('circle', { cx: pt[0], cy: pt[1], r: RADIUS[kind], class: cls, opacity: alphaFor(kind, rnd(i, j, k + (gold ? 7 : 0))) }));
        });
      }
    }
    return p;
  }

  function kindOf(code) { return DEM.stateTier(code) + (DEM.statePartial(code) ? '-partial' : ''); }
  function neededKinds() {
    var k = { land: true };
    DEM.coveredCodes.forEach(function (c) { k[kindOf(c)] = true; });
    return Object.keys(k);
  }
  function scalesOf(code) {
    var sc = {};
    DEM.coverageOf(code).forEach(function (x) { x.app.scale.forEach(function (v) { sc[v] = true; }); });
    return sc;
  }

  /* ------------------------------------------------------------ the night map */

  var nightMaps = [];

  function basePitch(px) { return px >= 900 ? 5 : px >= 520 ? 4 : 3; }

  function nightMap(container, opts) {
    var o = opts || {};
    var map = DEM.renderMap(container, { form: 'geo', chips: !!o.chips, tooltip: o.tooltip !== false, interactive: o.interactive !== false });
    var id = map.id;
    map.el.classList.add('nl-map');
    if (o.className) map.el.classList.add(o.className);

    var patterns = [];
    neededKinds().forEach(function (kind) {
      var p = buildPattern(id + '-' + kind, kind, false);
      map.layers.defs.appendChild(p); patterns.push(p);
      if (kind !== 'land') {
        var g = buildPattern(id + '-' + kind + '-gold', kind, true);
        map.layers.defs.appendChild(g); patterns.push(g);
      }
    });
    var blur = s('feGaussianBlur', { stdDeviation: 9 });
    map.layers.defs.appendChild(s('filter', { id: id + '-haze', x: '-25%', y: '-25%', width: '150%', height: '150%' }, [blur]));
    map.el.style.setProperty('--map-land', 'url("#' + id + '-land")');

    var gBloom = s('g', { class: 'nl-bloom', filter: 'url(#' + id + '-haze)', 'aria-hidden': 'true' });
    var gLights = s('g', { class: 'nl-lights', 'aria-hidden': 'true' });
    var gTrails = s('g', { class: 'nl-trails', 'aria-hidden': 'true' });
    map.svg.insertBefore(gBloom, map.layers.states);
    map.svg.insertBefore(gLights, map.layers.states);
    map.svg.insertBefore(gTrails, map.layers.pulses);

    var lights = {};
    DEM.coveredCodes.forEach(function (code) {
      var path = map.paths[code];
      if (!path) return;
      var d = path.getAttribute('d');
      var tier = DEM.stateTier(code), partial = DEM.statePartial(code), kind = kindOf(code);
      var b = map.bounds[code], c = map.centroids[code];
      var circle = s('circle', { cx: c[0], cy: c[1], r: 0 });
      map.layers.defs.appendChild(s('clipPath', { id: id + '-clip-' + code, clipPathUnits: 'userSpaceOnUse' }, [circle]));
      var sc = scalesOf(code);
      var cls = 'nl-light tier-' + tier + (partial ? ' is-partial' : '') + Object.keys(sc).map(function (v) { return ' scale-' + v; }).join('');
      var base = s('path', { class: 'nl-base', d: d });
      var haze = s('path', { class: 'nl-haze', d: d });
      var on = s('path', { class: 'nl-on', d: d, 'clip-path': 'url(#' + id + '-clip-' + code + ')' });
      on.style.setProperty('--nl-fill', 'url("#' + id + '-' + kind + '")');
      on.style.setProperty('--nl-fill-gold', 'url("#' + id + '-' + kind + '-gold")');
      var g = s('g', { class: cls, 'data-state': code }, [base, haze, on]);
      gLights.appendChild(g);
      var bl = s('path', { class: 'nl-bloom-shape tier-' + tier + (partial ? ' is-partial' : ''), d: d, 'data-state': code });
      gBloom.appendChild(bl);
      lights[code] = { code: code, g: g, on: on, bloom: bl, circle: circle, bounds: b, c: c, tier: tier, scales: sc, anim: 0, lit: false };
    });

    map.nl = { pitch: 0, base: 0, patterns: patterns, blur: blur, lights: lights, trails: gTrails, bloom: gBloom, raf: 0 };
    Object.keys(lights).forEach(function (k) { lightOn(lights[k], 0); });

    var ro = new ResizeObserver(function () {
      var w = map.el.clientWidth;
      if (!w) return;
      var b = basePitch(w);
      if (b !== map.nl.base) { map.nl.pitch = map.nl.pitch && map.nl.base ? map.nl.pitch - map.nl.base + b : b; map.nl.base = b; }
      syncPitch(map);
    });
    ro.observe(map.el);
    nightMaps.push(map);
    return map;
  }

  /* Pin the lattice to the screen: whole-pixel pitch, origin at the viewBox corner. */
  function syncPitch(map) {
    var vb = map.svg.viewBox.baseVal;
    var w = map.el.clientWidth;
    if (!w || !vb || !vb.width) return;
    var ppu = w / vb.width;
    var u = (map.nl.pitch || 4) / ppu;
    var tf = 'translate(' + vb.x.toFixed(3) + ' ' + vb.y.toFixed(3) + ') scale(' + u.toFixed(5) + ')';
    for (var i = 0; i < map.nl.patterns.length; i++) map.nl.patterns[i].setAttribute('patternTransform', tf);
    map.el.style.setProperty('--nl-u', (1 / ppu).toFixed(4));
    map.nl.blur.setAttribute('stdDeviation', (11 / ppu).toFixed(2));
  }

  function farthest(L, cx, cy) {
    var b = L.bounds;
    return Math.max(Math.hypot(b[0][0] - cx, b[0][1] - cy), Math.hypot(b[1][0] - cx, b[0][1] - cy),
      Math.hypot(b[0][0] - cx, b[1][1] - cy), Math.hypot(b[1][0] - cx, b[1][1] - cy)) + 3;
  }

  /* Lights strike on from a point and spread to the state's edges. */
  function lightOn(L, ms, from, delay) {
    cancelAnimationFrame(L.anim);
    clearTimeout(L.wait);
    L.lit = true;
    L.g.classList.remove('is-off', 'is-dim');
    L.bloom.classList.remove('is-off', 'is-dim');
    var cx = from ? from[0] : L.c[0], cy = from ? from[1] : L.c[1];
    var R = farthest(L, cx, cy);
    L.circle.setAttribute('cx', cx.toFixed(1));
    L.circle.setAttribute('cy', cy.toFixed(1));
    if (!ms || reduced()) { L.circle.setAttribute('r', R.toFixed(1)); return; }
    L.circle.setAttribute('r', '0');
    function go() {
      var t0 = performance.now();
      (function f(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        L.circle.setAttribute('r', (R * easeOut(t)).toFixed(2));
        if (t < 1) L.anim = requestAnimationFrame(f);
      })(t0);
    }
    if (delay) L.wait = setTimeout(go, delay); else go();
  }
  function lightOff(L) {
    cancelAnimationFrame(L.anim);
    clearTimeout(L.wait);
    L.lit = false;
    L.circle.setAttribute('r', '0');
    L.g.classList.add('is-off');
    L.bloom.classList.add('is-off');
  }
  function dim(L, on) {
    L.g.classList.toggle('is-dim', on);
    L.bloom.classList.toggle('is-dim', on);
  }
  function strike(L) {
    L.g.classList.remove('is-striking');
    void L.g.getBoundingClientRect();
    L.g.classList.add('is-striking');
    setTimeout(function () { L.g.classList.remove('is-striking'); }, 900);
  }

  /* Mirror the core's hover / related / selected classes onto the lights layer. */
  function syncSelection() {
    nightMaps.forEach(function (m) {
      Object.keys(m.nl.lights).forEach(function (code) {
        var L = m.nl.lights[code], p = m.paths[code];
        ['is-hover', 'is-related', 'is-selected'].forEach(function (c) {
          var v = p.classList.contains(c);
          L.g.classList.toggle(c, v);
          L.bloom.classList.toggle(c, v);
        });
      });
    });
  }

  /* Corridor lines as light trails, drawn in our own layer. */
  function drawTrails(map, cls) {
    map.nl.trails.innerHTML = '';
    return map.corridorPaths().map(function (c, i) {
      return map.nl.trails.appendChild(s('path', { class: 'nl-trail ' + (cls || ''), d: c.d, pathLength: 1, 'data-i': i }));
    });
  }

  /* Pause looping pulses while a map is off screen. */
  function watchOffscreen(map) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { map.el.classList.toggle('nl-offscreen', !e.isIntersecting); });
    });
    io.observe(map.el);
  }

  /* ------------------------------------------------------------ key swatches (same lattices) */

  function buildKey() {
    var host = s('svg', { class: 'nl-keydefs', width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    var defs = s('defs');
    host.appendChild(defs);
    ['land', 'hosting', 'hosting-partial', 'siting', 'siting-partial'].forEach(function (k) {
      var p = buildPattern('nl-key-' + k, k, false);
      p.setAttribute('patternTransform', 'scale(3)');
      defs.appendChild(p);
    });
    document.body.appendChild(host);
  }
  function swatch(kind, w, h) {
    var tier = kind.replace('-partial', '');
    return s('svg', { class: 'nl-swatch nl-swatch-' + tier, width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true', focusable: 'false' }, [
      s('rect', { class: 'nl-swatch-haze', width: w, height: h }),
      s('rect', { width: w, height: h, fill: 'url(#nl-key-' + kind + ')' })
    ]);
  }

  /* ------------------------------------------------------------ scales diagrams */

  function drawDiagrams() {
    var large = document.querySelector('.nl-diagram-large');
    var small = document.querySelector('.nl-diagram-small');
    if (large) {
      large.appendChild(s('path', { class: 'nl-dg-wire nl-dg-wire-hv', d: 'M8 60 C 70 58 120 40 196 44' }));
      for (var i = 0; i < 8; i++) {
        var t = (i + .5) / 8;
        var x = 8 + t * 188, y = 60 - 16 * Math.sin(t * Math.PI / 2);
        large.appendChild(s('circle', { class: 'nl-dg-tower', cx: x.toFixed(1), cy: y.toFixed(1), r: 2.4 }));
      }
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) large.appendChild(s('circle', { class: 'nl-dg-sub', cx: 206 + c * 8, cy: 36 + r * 8, r: 2.2 }));
      for (var r2 = 0; r2 < 6; r2++) for (var c2 = 0; c2 < 11; c2++) {
        large.appendChild(s('circle', { class: 'nl-dg-load', cx: 244 + c2 * 6.6, cy: 26 + r2 * 7, r: 2, opacity: (.7 + .3 * rnd(c2, r2, 3)).toFixed(2) }));
      }
    }
    if (small) {
      small.appendChild(s('path', { class: 'nl-dg-wire nl-dg-wire-feeder', d: 'M44 50 C 110 52 170 66 238 62' }));
      for (var r3 = 0; r3 < 3; r3++) for (var c3 = 0; c3 < 3; c3++) small.appendChild(s('circle', { class: 'nl-dg-sub', cx: 14 + c3 * 8, cy: 42 + r3 * 8, r: 2.2 }));
      for (var k = 0; k < 18; k++) {
        var tt = (k + .5) / 18;
        var mt = 1 - tt;
        var fx = mt * mt * mt * 44 + 3 * mt * mt * tt * 110 + 3 * mt * tt * tt * 170 + tt * tt * tt * 238;
        var fy = mt * mt * mt * 50 + 3 * mt * mt * tt * 52 + 3 * mt * tt * tt * 66 + tt * tt * tt * 62;
        small.appendChild(s('circle', { class: 'nl-dg-feeder', cx: fx.toFixed(1), cy: fy.toFixed(1), r: 1.5 }));
      }
      for (var r4 = 0; r4 < 3; r4++) for (var c4 = 0; c4 < 5; c4++) {
        small.appendChild(s('circle', { class: 'nl-dg-load nl-dg-load-small', cx: 248 + c4 * 6.6, cy: 55 + r4 * 7, r: 1.9, opacity: (.65 + .35 * rnd(c4, r4, 5)).toFixed(2) }));
      }
    }
  }

  /* ------------------------------------------------------------ story: the power path at night */

  function bez(p, t) {
    var m = 1 - t;
    return [m * m * m * p[0] + 3 * m * m * t * p[2] + 3 * m * t * t * p[4] + t * t * t * p[6],
      m * m * m * p[1] + 3 * m * m * t * p[3] + 3 * m * t * t * p[5] + t * t * t * p[7]];
  }
  function bezD(p) { return 'M' + p[0] + ',' + p[1] + ' C' + p[2] + ',' + p[3] + ' ' + p[4] + ',' + p[5] + ' ' + p[6] + ',' + p[7]; }

  function buildStory(art, titles) {
    var items = [];   /* { el, th } switched on when T >= th */
    var trails = [];  /* { el, a, b } drawn as T runs from a to b */
    var svgEl = s('svg', { class: 'nl-closeup', viewBox: '0 0 960 640', preserveAspectRatio: 'xMidYMid meet', focusable: 'false' });
    var defs = s('defs');
    var ground = buildPattern('nl-story-ground', 'land', false);
    ground.setAttribute('patternTransform', 'scale(10)');
    defs.appendChild(ground);
    defs.appendChild(s('filter', { id: 'nl-story-haze', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [s('feGaussianBlur', { stdDeviation: 14 })]));
    svgEl.appendChild(defs);
    svgEl.appendChild(s('rect', { class: 'nl-art-ground', x: -200, y: -200, width: 1360, height: 1040, fill: 'url(#nl-story-ground)' }));
    var bloom = s('g', { class: 'nl-art-bloom', filter: 'url(#nl-story-haze)' });
    var gWires = s('g', { class: 'nl-art-wires' });
    var gDots = s('g', { class: 'nl-art-dots' });
    var gLabels = s('g', { class: 'nl-art-labels' });
    [bloom, gWires, gDots, gLabels].forEach(function (g) { svgEl.appendChild(g); });

    function dot(x, y, r, cls, th, op) {
      var c = s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: r, class: 'nl-a ' + cls, 'fill-opacity': op || null });
      gDots.appendChild(c); items.push({ el: c, th: th });
    }
    function label(x, y, anchor, text, th) {
      var t = s('text', { x: x, y: y, 'text-anchor': anchor, class: 'nl-a nl-art-label' });
      t.textContent = text;
      gLabels.appendChild(t); items.push({ el: t, th: th });
    }
    function glow(el, th) { el.classList.add('nl-a'); bloom.appendChild(el); items.push({ el: el, th: th }); }
    function wire(p, cls, a, b) {
      var w = s('path', { d: bezD(p), class: 'nl-art-wire ' + cls, pathLength: 1 });
      gWires.appendChild(w); trails.push({ el: w, a: a, b: b });
    }

    /* 0 generation: a single plant light */
    var P = [138, 488];
    glow(s('circle', { cx: P[0], cy: P[1], r: 36, class: 'nl-glow-gold' }), 0);
    dot(P[0], P[1], 7, 'nl-a-gold', 0);
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2;
      dot(P[0] + Math.cos(a) * 17, P[1] + Math.sin(a) * 17, 2.6, 'nl-a-gold', .12 + i * .025);
    }
    for (var k = 0; k < 18; k++) {
      var a2 = k / 18 * Math.PI * 2 + .17;
      dot(P[0] + Math.cos(a2) * 30, P[1] + Math.sin(a2) * 30, 1.5, 'nl-a-lilac', .45 + k * .015, .7);
    }
    label(P[0], P[1] + 62, 'middle', titles[0], .3);

    /* 1 high-voltage transmission: tower lights and a gold trail */
    var TX = [160, 474, 262, 420, 400, 300, 546, 262];
    wire(TX, 'nl-art-wire-hv', 1.04, 1.7);
    for (var t = 1; t <= 13; t++) {
      var pt = bez(TX, t / 14);
      dot(pt[0], pt[1], 3.1, 'nl-a-wash', 1.04 + (t / 14) * .66);
    }
    label(318, 344, 'end', titles[1], 1.2);

    /* 2 substation: a tight grid of lights */
    for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) {
      var sx = 556 + c * 12, sy = 238 + r * 12;
      dot(sx, sy, 2.8, 'nl-a-lilac', 2.06 + Math.hypot(sx - 546, sy - 262) / 70 * .6);
    }
    glow(s('rect', { x: 548, y: 230, width: 64, height: 52, class: 'nl-glow-lilac' }), 2.1);
    label(580, 216, 'middle', titles[2], 2.15);

    /* 3 distribution feeders: finer dots branching out */
    var F1 = [616, 244, 690, 222, 770, 196, 872, 170];
    var F2 = [610, 286, 642, 340, 690, 390, 744, 424];
    var F3 = [582, 290, 574, 360, 550, 440, 518, 532];
    [[F1, 17, 3.08], [F2, 11, 3.05], [F3, 15, 3.14]].forEach(function (f) {
      for (var q = 1; q <= f[1]; q++) {
        var fp = bez(f[0], q / (f[1] + 1));
        dot(fp[0], fp[1], 1.9, 'nl-a-lilac', f[2] + (q / f[1]) * .6, .85);
      }
    });
    wire(F2, 'nl-art-wire-feeder', 3.05, 3.7);
    label(868, 152, 'end', titles[3], 3.2);

    /* 4 the data hall: the densest, brightest field */
    glow(s('rect', { x: 748, y: 408, width: 132, height: 70, class: 'nl-glow-wash' }), 4.2);
    for (var hc = 0; hc < 16; hc++) for (var hr = 0; hr < 8; hr++) {
      dot(756 + hc * 7.4, 416 + hr * 7.4, 2.2, 'nl-a-wash', 4.05 + hc / 16 * .55, (.72 + .28 * rnd(hc, hr, 9)).toFixed(2));
    }
    label(815, 504, 'middle', titles[4], 4.25);

    art.appendChild(svgEl);
    var last = -1;
    return function update(T) {
      if (T === last) return;
      last = T;
      for (var n = 0; n < items.length; n++) {
        var on = T >= items[n].th;
        if (items[n].on !== on) { items[n].on = on; items[n].el.classList.toggle('is-on', on); }
      }
      for (var w = 0; w < trails.length; w++) {
        var tr = trails[w];
        tr.el.style.strokeDashoffset = (1 - clamp((T - tr.a) / (tr.b - tr.a), 0, 1)).toFixed(4);
      }
    };
  }

  /* ------------------------------------------------------------ boot */

  DEM.ready(function (DEM) {
    var motion = DEM.motion;
    var root = document.documentElement;
    if (motion === 'story') document.getElementById('nl-nav-scales').setAttribute('href', '#story');

    buildKey();
    DEM.renderFind(document.getElementById('nl-find'));

    var hero = nightMap(document.getElementById('nl-hero-map'), { chips: false, className: 'nl-map-hero' });
    DEM.renderLegend(document.getElementById('nl-legend'));
    var cover = nightMap(document.getElementById('nl-coverage-map'), { chips: true, className: 'nl-map-coverage' });
    DEM.renderList(document.getElementById('nl-list'));
    DEM.renderDirectory(document.getElementById('nl-directory'));
    drawDiagrams();

    /* Key swatches drawn from the map's own lattices. */
    document.querySelectorAll('.dem-legend-item').forEach(function (li) {
      var sw = li.querySelector('.dem-swatch');
      var k = li.classList.contains('is-siting') ? 'siting' : li.classList.contains('is-partial') ? 'hosting-partial' : 'hosting';
      if (sw) sw.appendChild(swatch(k, 36, 24));
    });
    document.querySelectorAll('.dem-statelist-btn').forEach(function (b) {
      var code = b.getAttribute('data-state');
      b.insertBefore(swatch(kindOf(code), 18, 18), b.firstChild);
    });
    document.querySelectorAll('.dem-entry').forEach(function (li) {
      var tierEl = li.querySelector('.dem-entry-tier');
      if (tierEl) tierEl.insertBefore(swatch(li.getAttribute('data-tier'), 18, 18), tierEl.firstChild);
    });

    ['state:hover', 'app:hover', 'state:select', 'panel:close'].forEach(function (ev) { DEM.on(ev, syncSelection); });

    /* The hero always carries the corridors as faint wires; energize turns them into live trails. */
    if (motion !== 'energize') drawTrails(hero, 'is-wire');

    /* ---------------- energize: dusk, then the grid powers on */
    if (motion === 'energize') {
      var speed = 360;
      var lights = hero.nl.lights;
      var total = Object.keys(lights).length, done = 0;
      if (!reduced()) {
        root.classList.add('nl-dusk');
        Object.keys(lights).forEach(function (k) { lightOff(lights[k]); });
      }
      var start = function () {
        var run = hero.energize({
          speed: speed, pulse: 64, loop: 7200,
          onEnergize: function (code) {
            var L = lights[code];
            if (!L) return;
            if (!reduced()) {
              lightOn(L, clamp(farthest(L, L.c[0], L.c[1]) * 9, 520, 1300));
              strike(L);
            } else lightOn(L, 0);
            done++;
            if (done === 1) root.classList.add('nl-night');
            if (done === total) hero.el.classList.add('nl-powered');
          }
        });
        /* Persistent trails follow the pulses, corridor by corridor. */
        var mo = new MutationObserver(function () {
          var st = hero.el.getAttribute('data-energize');
          if (st !== 'running' && st !== 'done') return;
          mo.disconnect();
          var trails = drawTrails(hero, 'is-live');
          trails.forEach(function (tr, i) {
            var codes = DEM.CORRIDORS[i];
            var len = run.corridors[i].getTotalLength();
            var t0 = (run.arrival[codes[0]] || 0) * 1000;
            if (reduced()) { tr.style.strokeDashoffset = 0; return; }
            tr.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: len / speed * 1000, delay: t0, easing: 'linear', fill: 'both' });
          });
        });
        mo.observe(hero.el, { attributes: true, attributeFilter: ['data-energize'] });
        watchOffscreen(hero);
      };
      if (reduced()) start(); else setTimeout(start, 700);
    }

    /* ---------------- zoom: transmission across the country, distribution in the Northeast */
    if (motion === 'zoom') {
      var sm = nightMap(document.getElementById('nl-scales-map'), { chips: false, className: 'nl-map-scales' });
      var longhaul = drawTrails(sm, 'is-longhaul');
      var first = true;
      DEM.on('scale:change', function (scale) {
        var instant = first || reduced();
        first = false;
        sm.el.setAttribute('data-nl-scale', scale);
        Object.keys(sm.nl.lights).forEach(function (code) {
          var L = sm.nl.lights[code];
          var active = !!L.scales[scale];
          var wasDim = L.g.classList.contains('is-dim');
          if (!active) dim(L, true);
          else if (wasDim) { dim(L, false); lightOn(L, instant ? 0 : 900, null, instant ? 0 : 380); }
        });
        if (scale === 'large' && !instant) {
          longhaul.forEach(function (tr, i) {
            tr.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1300, delay: 200 + i * 90, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
          });
        }
        var ms = instant ? 0 : 1100;
        var target = scale === 'small' ? Math.max(3, sm.nl.base - 1) : sm.nl.base;
        var zoomed = sm.zoomTo(scale === 'small' ? NORTHEAST : null, ms);
        var from = sm.nl.pitch || sm.nl.base, t0 = performance.now();
        cancelAnimationFrame(sm.nl.raf);
        (function f(now) {
          var t = ms ? clamp((now - t0) / ms, 0, 1) : 1;
          var e = 1 - Math.pow(1 - t, 4);
          sm.nl.pitch = from + (target - from) * e;
          syncPitch(sm);
          if (t < 1) sm.nl.raf = requestAnimationFrame(f);
        })(t0);
        zoomed.then(function () { sm.nl.pitch = target; syncPitch(sm); });
      });
      DEM.renderScaleToggle(document.getElementById('nl-scale-toggle'));
    }

    /* ---------------- micro: one tier's lights go out, the other relights */
    if (motion === 'micro') {
      DEM.renderFilter(document.getElementById('nl-filter'));
      DEM.on('filter:change', function (tier) {
        Object.keys(cover.nl.lights).forEach(function (code) {
          var L = cover.nl.lights[code];
          var active = tier === 'all' || L.tier === tier;
          var wasDim = L.g.classList.contains('is-dim');
          if (!active) dim(L, true);
          else if (wasDim) { dim(L, false); lightOn(L, 650, null, 120 + L.c[0] / 975 * 260); }
        });
      });
    }

    /* ---------------- story: the power path, then the camera pulls back */
    if (motion === 'story') {
      var section = document.getElementById('story');
      var art = document.getElementById('nl-story-art');
      var titles = DEM.copy.story.map(function (x) { return x.title; });
      var update = buildStory(art, titles);
      var national = document.createElement('div');
      national.className = 'nl-story-national';
      art.appendChild(national);
      nightMap(national, { chips: false, className: 'nl-map-story' });
      DEM.renderStorySteps(document.getElementById('nl-story-steps'));
      var rail = section.querySelector('.nl-rail');
      DEM.copy.story.forEach(function () { rail.appendChild(document.createElement('span')); });
      var railDots = rail.querySelectorAll('span');
      DEM.scrollStory(section, function (st) {
        /* The core keeps calling back on scroll under reduced motion; hold the static view. */
        if (DEM.reducedMotion && !st.isStatic) st = { p: 1, step: st.steps - 1, local: 1, steps: st.steps, isStatic: true };
        var T = st.isStatic ? 5 : st.p * st.steps;
        update(st.isStatic ? T : T + .15);
        var pull = st.isStatic ? 0 : easeOut(clamp((T - 5) / .6, 0, 1));
        art.style.setProperty('--pull', pull.toFixed(4));
        art.classList.toggle('is-national', pull > .98);
        railDots.forEach(function (d, i) {
          d.classList.toggle('is-on', st.isStatic || i < st.step || (i === st.step));
          d.classList.toggle('is-current', !st.isStatic && i === st.step);
        });
      });
    }
  });
})();
