/*
  Control room: world wiring. The core owns facts and behavior; this file dresses the hex map as a
  lamp board (bezel plate, recess, lens, shine), builds the annunciator windows, and stages each motion
  as one moment in the board's own mechanics.
*/
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var HEX_R = 40.8;      /* core hex radius after its gap */
  var LENS = 0.74;       /* lens scale; matches style.css */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function sv(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  DEM.ready(function (DEM) {
    var root = document.documentElement;
    var motion = DEM.motion;

    if (motion === 'story') $('.cr-nav-scales').setAttribute('href', '#story');

    /* ------------------------------------------------------------ hero */
    DEM.renderFind($('#find'));
    var windows = buildWindows($('#windows'));

    /* ------------------------------------------------------------ coverage */
    DEM.renderLegend($('#legend'));
    var map = DEM.renderMap($('#map'), { form: 'hex' });
    dressBoard(map);
    DEM.renderList($('#list'));
    buildScheduleHead($('#directory'));
    DEM.renderDirectory($('#directory'));

    var readout = setupReadout(map);

    /* hover and selection mirror onto the annunciator windows */
    DEM.on('state:hover', function (code) {
      var rel = {};
      if (code) DEM.relatedCodes(code).forEach(function (c) { rel[c] = true; });
      windows.forEach(function (w) { w.classList.toggle('is-related', !!rel[w.getAttribute('data-state')]); });
    });
    DEM.on('state:select', function (code) {
      windows.forEach(function (w) { w.classList.toggle('is-selected', w.getAttribute('data-state') === code); });
    });
    DEM.on('panel:close', function () { windows.forEach(function (w) { w.classList.remove('is-selected'); }); });

    /* ------------------------------------------------------------ motions */
    if (motion === 'energize') energize(map, readout);
    if (motion === 'micro') micro(map, readout);
    if (motion === 'zoom') zoom(map, readout);
    if (motion === 'story') story();
    readout.update();

    /* ============================================================ builders */

    function buildWindows(ul) {
      var out = [];
      DEM.coveredCodes.forEach(function (code) {
        var p = DEM.statePartial(code);
        var cls = ['cr-window', 'tier-' + DEM.stateTier(code)];
        if (p) cls.push('is-partial');
        var scales = {};
        DEM.coverageOf(code).forEach(function (x) { x.app.scale.forEach(function (s) { scales[s] = true; }); });
        Object.keys(scales).forEach(function (s) { cls.push('scale-' + s); });
        var b = DEM.el('button', {
          type: 'button', class: cls.join(' '), 'data-state': code,
          'aria-label': DEM.stateNames[code] + ', ' + DEM.coverageLine(code)
        }, [
          DEM.el('span', { class: 'cr-window-name', text: DEM.stateNames[code] }),
          DEM.el('span', { class: 'cr-window-meta', 'aria-hidden': 'true', text: DEM.coverageLine(code) })
        ]);
        b.addEventListener('click', function () { DEM.selectState(code, b); });
        b.addEventListener('pointerenter', function () { DEM.hoverState(code); });
        b.addEventListener('pointerleave', function () { DEM.hoverState(null); });
        b.addEventListener('focus', function () { DEM.hoverState(code); });
        b.addEventListener('blur', function () { DEM.hoverState(null); });
        ul.appendChild(DEM.el('li', null, b));
        out.push(b);
      });
      return out;
    }

    function buildScheduleHead(container) {
      var head = DEM.el('div', { class: 'cr-schedule-head', 'aria-hidden': 'true' },
        ['Map', 'Grid levels', 'States', 'Utilities', 'Access'].map(function (t) { return DEM.el('span', { class: 'cr-engr', text: t }); }));
      container.appendChild(head);
    }

    /* Turn a core hex map into a lamp board: bezel plates and recesses under the lenses, bus lines
       running into each lamp, a shine on every lens, and an ink plate under codes on hatched lenses. */
    function dressBoard(m) {
      var L = m.layers, svgEl = m.svg;
      var plates = sv('g', { class: 'cr-plates' });
      var bus = sv('g', { class: 'cr-buses', 'aria-hidden': 'true' });
      var trails = sv('g', { class: 'cr-trails', 'aria-hidden': 'true' });
      var shines = sv('g', { class: 'cr-shines', 'aria-hidden': 'true' });
      m.cr = { plates: {}, shines: {}, labels: {}, trails: trails, bus: bus };

      Object.keys(m.paths).forEach(function (code) {
        var d = m.paths[code].getAttribute('d');
        var plate = sv('path', { d: d, class: 'cr-plate', 'data-state': code });
        var recess = sv('path', { d: d, class: 'cr-recess', 'data-state': code });
        plates.appendChild(plate);
        plates.appendChild(recess);
        m.cr.plates[code] = plate;

        var c = m.centroids[code], r = HEX_R * LENS - 4.5;
        var a0 = -Math.PI / 2, a1 = -Math.PI * 5 / 6;
        var p0 = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)];
        var p1 = [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)];
        var s0 = [p0[0] + (p1[0] - p0[0]) * 0.2, p0[1] + (p1[1] - p0[1]) * 0.2];
        var s1 = [p0[0] + (p1[0] - p0[0]) * 0.78, p0[1] + (p1[1] - p0[1]) * 0.78];
        var stateCls = Array.prototype.filter.call(m.paths[code].classList, function (k) { return /^(is-covered|is-partial|tier-|scale-)/.test(k); });
        var shine = sv('path', { class: ['cr-shine'].concat(stateCls).join(' '), d: 'M' + s0.join(',') + 'L' + s1.join(',') });
        shines.appendChild(shine);
        m.cr.shines[code] = shine;
        if (m.paths[code].classList.contains('is-partial')) {
          shines.appendChild(sv('rect', { class: 'cr-codeplate', x: c[0] - 17, y: c[1] - 11, width: 34, height: 22, rx: 3 }));
        }
      });
      $$('.dem-label', L.labels).forEach(function (t) { m.cr.labels[t.getAttribute('data-state')] = t; });

      /* z-order: plates, painted bus, core corridors, gold trails, pulses, lenses, shines, labels */
      svgEl.insertBefore(plates, L.states);
      svgEl.insertBefore(bus, L.states);
      svgEl.insertBefore(L.corridors, L.states);
      svgEl.insertBefore(trails, L.states);
      svgEl.insertBefore(L.pulses, L.states);
      svgEl.insertBefore(shines, L.labels);

      /* painted bus lines: straight mimic segments between lamp centers */
      m.corridorPaths().forEach(function (c) {
        bus.appendChild(sv('path', { class: 'cr-bus', d: straight(c.points) }));
      });
      return m;
    }

    function straight(points) {
      return 'M' + points.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
    }

    function eachTile(m, fn) {
      Object.keys(m.paths).forEach(function (code) {
        fn(code, m.paths[code], m.cr.labels[code], m.cr.shines[code]);
      });
    }

    /* Re-arm sweep: lamps change state column by column, west to east, like a board being re-armed. */
    function sweep(m) {
      if (DEM.reducedMotion) return;
      var xs = Object.keys(m.centroids).map(function (k) { return m.centroids[k][0]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      m.el.classList.add('is-sweeping');
      eachTile(m, function (code, p, label) {
        var delay = Math.round((m.centroids[code][0] - x0) / (x1 - x0) * 380) + 'ms';
        p.style.transitionDelay = delay;
        if (label) label.style.transitionDelay = delay;
      });
      clearTimeout(m.cr.sweepTimer);
      m.cr.sweepTimer = setTimeout(function () {
        m.el.classList.remove('is-sweeping');
        eachTile(m, function (code, p, label) { p.style.transitionDelay = ''; if (label) label.style.transitionDelay = ''; });
      }, 1000);
    }

    /* Readout: lamps lit of the real covered total, true in every motion. */
    function setupReadout(m) {
      var total = DEM.coveredCodes.length;
      var litEl = $('#readout-lit'), totalEl = $('#readout-total'), box = $('#readout');
      totalEl.textContent = total;
      if (motion === 'micro' || motion === 'zoom') box.setAttribute('aria-live', 'polite');
      function isLit(code) {
        var p = m.paths[code];
        if (motion === 'energize' && m.el.getAttribute('data-energize') !== 'done' && !p.classList.contains('is-energized')) return false;
        var f = root.getAttribute('data-filter');
        if (f && DEM.stateTier(code) !== f) return false;
        var s = motion === 'zoom' && root.getAttribute('data-scale');
        if (s && !p.classList.contains('scale-' + s)) return false;
        return true;
      }
      function update() {
        litEl.textContent = DEM.coveredCodes.filter(isLit).length;
      }
      return { update: update, total: total };
    }

    /* ============================================================ energize */

    function energize(m, ro) {
      var speed = 380;
      var ctrl = m.energize({
        speed: speed, pulse: 70, loop: 0,
        onEnergize: function (code) {
          if (m.cr.labels[code]) m.cr.labels[code].classList.add('cr-lit');
          if (m.cr.shines[code]) m.cr.shines[code].classList.add('cr-lit');
          var plate = m.cr.plates[code];
          if (plate && !DEM.reducedMotion && plate.animate) {
            plate.animate([
              { stroke: '#EBBE07', strokeWidth: 5 },
              { stroke: '#EBBE07', strokeWidth: 3, offset: 0.35 },
              { stroke: '#1b1320', strokeWidth: 1.2 }
            ], { duration: 1100, easing: 'cubic-bezier(.16,1,.3,1)' });
          }
          ro.update();
        }
      });
      m.cr.bus.style.display = 'none';
      var paths = m.corridorPaths();
      var plans = ctrl.corridors.map(function (el, i) {
        var curve = el.getTotalLength();
        el.setAttribute('d', straight(paths[i].points));
        var len = el.getTotalLength();
        var trail = sv('path', { class: 'cr-trail', d: el.getAttribute('d') });
        trail.style.strokeDasharray = len + ' ' + (len + 2);
        trail.style.strokeDashoffset = len;
        m.cr.trails.appendChild(trail);
        var start = ctrl.arrival[paths[i].codes[0]] || 0;
        return { trail: trail, len: len, curve: curve, start: start, duration: curve / speed };
      });
      function run() {
        plans.forEach(function (pl) {
          if (DEM.reducedMotion || !pl.trail.animate) { pl.trail.style.strokeDashoffset = 0; return; }
          var D = pl.duration * 1000, pulse = 70;
          /* the gold trail follows the tail of the core's pulse */
          var t0 = pulse / (pl.curve + pulse), t1 = (pl.len + pulse) / (pl.curve + pulse);
          pl.trail.animate([{ strokeDashoffset: pl.len }, { strokeDashoffset: 0 }], {
            delay: pl.start * 1000 + t0 * D, duration: Math.max(1, (t1 - t0) * D), easing: 'linear', fill: 'both'
          });
        });
      }
      var started = false;
      new MutationObserver(function () {
        var st = m.el.getAttribute('data-energize');
        if (!started && (st === 'running' || st === 'done')) { started = true; run(); }
        if (st === 'done') {
          plans.forEach(function (pl) { pl.trail.style.strokeDashoffset = 0; });
          eachTile(m, function (code, p, label, shine) { if (label) label.classList.add('cr-lit'); if (shine) shine.classList.add('cr-lit'); });
          ro.update();
        }
      }).observe(m.el, { attributes: true, attributeFilter: ['data-energize'] });
    }

    /* ============================================================ micro */

    function micro(m, ro) {
      DEM.renderFilter($('#filter'));
      DEM.on('filter:change', function () { sweep(m); ro.update(); });
    }

    /* ============================================================ zoom */

    function zoom(m, ro) {
      var mini = DEM.renderMap($('#scale-board'), { form: 'hex', tooltip: false });
      dressBoard(mini);
      var smallCodes = DEM.coveredCodes.filter(function (c) { return m.paths[c].classList.contains('scale-small'); });
      var first = true;
      DEM.on('scale:change', function (s) {
        var target = s === 'small' ? smallCodes : null;
        [m, mini].forEach(function (b) {
          if (!first) sweep(b);
          b.zoomTo(target, first ? 0 : 950);
        });
        first = false;
        ro.update();
      });
      DEM.renderScaleToggle($('#scale-toggle'));
      var group = $('#scale-toggle .dem-scale');
      var btns = $$('.dem-scale-btn', group);

      /* two-position rotary selector between the two positions */
      var knob = DEM.el('div', { class: 'cr-knob', 'aria-hidden': 'true' });
      var k = sv('svg', { viewBox: '0 0 104 104', focusable: 'false' });
      [45, 135].forEach(function (deg) {
        var a = (deg - 90) * Math.PI / 180;
        k.appendChild(sv('line', { class: 'cr-knob-detent', x1: 52 + 45 * Math.cos(a), y1: 52 + 45 * Math.sin(a), x2: 52 + 51 * Math.cos(a), y2: 52 + 51 * Math.sin(a) }));
      });
      k.appendChild(sv('circle', { class: 'cr-knob-plate', cx: 52, cy: 52, r: 40 }));
      k.appendChild(sv('circle', { class: 'cr-knob-body', cx: 52, cy: 52, r: 33 }));
      var grip = sv('g', { class: 'cr-knob-grip' });
      grip.appendChild(sv('rect', { class: 'cr-knob-bar', x: 46, y: 16, width: 12, height: 72, rx: 6 }));
      grip.appendChild(sv('circle', { class: 'cr-knob-tip', cx: 52, cy: 25, r: 3.2 }));
      k.appendChild(grip);
      knob.appendChild(k);
      knob.addEventListener('click', function () {
        DEM.setScale(root.getAttribute('data-scale') === 'small' ? 'large' : 'small');
      });
      group.insertBefore(knob, btns[1]);
      var cap = DEM.el('p', { class: 'cr-engr cr-switch-caption', 'aria-hidden': 'true', text: DEM.copy.scaleToggle.label });
      $('#scale-toggle').insertBefore(cap, group);
    }

    /* ============================================================ story */

    function story() {
      var section = $('#story');
      DEM.renderStorySteps($('#story-steps'));
      var boardWrap = $('#story-board');
      var sm = DEM.renderMap(boardWrap, { form: 'hex', tooltip: false });
      dressBoard(sm);
      sm.svg.setAttribute('aria-hidden', 'true');

      var mimic = $('#mimic');
      var live = $$('.cr-live path', mimic);
      var eq = $$('.cr-eq', mimic);
      var lamps = $$('.cr-station-lamps > g', mimic);
      var racks = $$('.cr-rack-lamps circle', mimic);
      var order = DEM.coveredCodes.slice().sort(function (a, b) { return sm.centroids[a][0] - sm.centroids[b][0]; });

      /* camera boxes for narrow stages: the view follows the active station */
      var boxes = [
        [20, 40, 330, 330],
        [250, 20, 540, 540],
        [680, 70, 320, 320],
        [360, 250, 500, 360],
        [30, 300, 320, 320],
        [0, 0, 1000, 600]
      ];
      var full = [0, 0, 1000, 600];
      var boardFull = [0, 0, 975, 610];
      var inC = sm.centroids.IN, bw = 975 / 3.4, bh = 610 / 3.4;
      var boardStart = [inC[0] - bw / 2, inC[1] - bh / 2, bw, bh];

      function seg(P, k) { return clamp((P - k) / 0.8, 0, 1); }

      function render(s) {
        /* core keeps sending scroll progress under reduced motion; hold the static view */
        if (DEM.reducedMotion) s = { p: 1, step: 5, local: 1, steps: 6, isStatic: true };
        var P = s.isStatic ? 6 : s.p * 6;
        for (var k = 0; k < 5; k++) {
          var pr = seg(P, k);
          if (live[k]) live[k].style.strokeDashoffset = (1 - pr).toFixed(4);
          eq.forEach(function (g) { if (+g.getAttribute('data-seg') === k) g.classList.toggle('is-live', pr > 0.02); });
          lamps[k].classList.toggle('is-lit', pr >= 0.98);
        }
        var hall = seg(P, 4);
        var nLit = Math.round(hall * racks.length);
        racks.forEach(function (c, i) { c.classList.toggle('is-lit', i < nLit); });

        /* step six: the diagram zooms out and the national board takes its place */
        var z = s.isStatic ? 1 : ease(clamp((P - 5) / 0.42, 0, 1));
        var lampsOn = s.isStatic ? order.length : Math.round(clamp((P - 5.25) / 0.55, 0, 1) * order.length);
        order.forEach(function (code, i) {
          var off = i >= lampsOn;
          sm.paths[code].classList.toggle('cr-off', off);
          if (sm.cr.labels[code]) sm.cr.labels[code].classList.toggle('cr-off', off);
          if (sm.cr.shines[code]) sm.cr.shines[code].classList.toggle('cr-off', off);
        });
        if (s.isStatic) {
          mimic.style.opacity = ''; boardWrap.style.opacity = '';
          mimic.setAttribute('viewBox', full.join(' '));
          sm.svg.setAttribute('viewBox', boardFull.join(' '));
          boardWrap.classList.add('is-on');
          return;
        }
        boardWrap.classList.toggle('is-on', z > 0.6);

        /* camera: on narrow stages the view follows the active station */
        var narrow = mimic.getBoundingClientRect().width < 640;
        var vb = full;
        if (narrow) {
          var i = Math.min(s.step, 4), t = smooth(clamp((s.local - 0.72) / 0.28, 0, 1));
          var a = boxes[i], b = boxes[Math.min(i + 1, 5)];
          if (s.step >= 5) { a = boxes[5]; b = boxes[5]; }
          vb = a.map(function (v, j) { return v + (b[j] - v) * t; });
        }
        /* zoom out: the diagram's view widens around its center while the board's view
           widens from the Indiana lamp to the whole nation (viewBox zooms, no CSS scaling) */
        var k = 1 + 1.6 * z;
        var cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2;
        vb = [cx - vb[2] * k / 2, cy - vb[3] * k / 2, vb[2] * k, vb[3] * k];
        mimic.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(1); }).join(' '));
        mimic.style.opacity = (1 - z).toFixed(3);
        var bv = boardStart.map(function (v, j) { return v + (boardFull[j] - v) * z; });
        sm.svg.setAttribute('viewBox', bv.map(function (v) { return v.toFixed(1); }).join(' '));
        boardWrap.style.opacity = clamp(z * 1.4, 0, 1).toFixed(3);
      }

      DEM.scrollStory(section, render);
    }
  });
})();
