/*
  Decennial Energy Maps: single-line schematic world.
  Draws the page's one-line diagram (main bus, feeders, breakers, switches, transformers) and the four
  motions in that language. Behavior and facts come from ../shared/core.js; this file only draws.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function circ(cx, cy, r) {
    return 'M' + (cx - r) + ',' + cy + 'a' + r + ',' + r + ' 0 1,0 ' + (2 * r) + ',0a' + r + ',' + r + ' 0 1,0 ' + (-2 * r) + ',0';
  }
  function box(x, y, w, h) { return 'M' + x + ',' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'z'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v) { return parseFloat(v) || 0; }
  function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function after(ms, fn) { return setTimeout(fn, ms); }

  /* Small device symbols, authored once and reused. */
  var SYMBOL = {
    generator: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
      '<circle cx="20" cy="20" r="15" fill="#ffffff" stroke="#312439" stroke-width="2.25"/>' +
      '<path d="M10,20 C13.5,11.5 17,11.5 20,20 S26.5,28.5 30,20" fill="none" stroke="#43314d" stroke-width="2"/></svg>',
    ground: '<svg viewBox="0 0 32 26" aria-hidden="true" focusable="false">' +
      '<path d="M16,0 V9 M3,9 H29 M8,15.5 H24 M12.5,22 H19.5" fill="none" stroke="#312439" stroke-width="2.5"/></svg>'
  };

  DEM.ready(function (DEM) {
    var root = document.documentElement;
    var motion = DEM.motion;
    var reduced = DEM.reducedMotion;
    var armed = root.classList.contains('ez-armed') && motion === 'energize' && !reduced;
    if (!armed) root.classList.remove('ez-armed');

    var sheet = document.getElementById('sheet');
    var wires = document.getElementById('wires');
    var sourceEl = document.getElementById('source');
    var groundEl = document.getElementById('ground');
    sourceEl.innerHTML = SYMBOL.generator;
    groundEl.innerHTML = SYMBOL.ground;

    /* ---------------------------------------------------------------- core renders */
    DEM.renderFind(document.getElementById('find'));
    var kp = DEM.renderMap(document.getElementById('keyplan-map'), { form: 'geo', chips: false, tooltip: true });
    DEM.renderLegend(document.getElementById('legend'));
    var map = DEM.renderMap(document.getElementById('map'), { form: 'geo' });
    DEM.renderList(document.getElementById('list'));
    DEM.renderDirectory(document.getElementById('directory'));
    var mapframe = document.getElementById('mapframe');

    if (motion === 'story') {
      var navScales = document.getElementById('nav-scales');
      if (navScales) navScales.setAttribute('href', '#story');
    }

    /* ---------------------------------------------------------------- the load drops */
    function dropSvg(kind) {
      var s = '<svg aria-hidden="true" focusable="false">' +
        '<line class="d-case" x1="12" y1="0" x2="12" y2="100%"/>' +
        '<line class="d-core" x1="12" y1="0" x2="12" y2="100%"/>';
      if (kind === 'large') {
        /* disconnect switch then breaker: a transmission-level service */
        s += '<line class="w-knock" x1="12" y1="15" x2="12" y2="37"/>' +
          '<path class="w-dev" d="M6,14 H18"/>' +
          '<line class="w-blade" x1="12" y1="37" x2="12" y2="14"/>' +
          '<circle class="w-pivot" cx="12" cy="37" r="3"/>' +
          '<rect class="w-brk" x="4" y="52" width="16" height="16"/>';
      } else {
        /* step-down transformer then feeder breaker: a distribution service */
        s += '<path class="w-knock-fill" d="' + circ(12, 26, 11) + circ(12, 42, 11) + '"/>' +
          '<path class="w-dev" d="' + circ(12, 26, 11) + '"/>' +
          '<path class="w-dev" d="' + circ(12, 42, 11) + '"/>' +
          '<rect class="w-brk" x="4" y="66" width="16" height="16"/>';
      }
      return s + '</svg>';
    }
    document.querySelectorAll('.load').forEach(function (n) {
      n.querySelector('.drop').innerHTML = dropSvg(n.classList.contains('load-large') ? 'large' : 'small');
    });

    /* ---------------------------------------------------------------- corridors drawn as energized lines */
    function drawCorridors(m, opts) {
      opts = opts || {};
      /* a sibling of the core's corridor layer (energize() clears that layer), under the pulses */
      var g = mk('g', { class: 'sx-corr' + (opts.pendingCores ? ' sx-cores-pending' : ''), 'aria-hidden': 'true' });
      m.layers.pulses.parentNode.insertBefore(g, m.layers.pulses);
      var cps = m.corridorPaths();
      if (!opts.skipCase) cps.forEach(function (c) { mk('path', { class: 'sx-corr-case', d: c.d }, g); });
      cps.forEach(function (c) { mk('path', { class: 'sx-corr-core', d: c.d }, g); });
      var nodes = {};
      cps.forEach(function (c) {
        c.codes.forEach(function (code) {
          if (nodes[code] || !DEM.coverageOf(code).length) return;
          var p = m.centroids[code];
          nodes[code] = mk('circle', { class: 'sx-node' + (opts.darkNodes ? ' is-dark' : ''), cx: p[0], cy: p[1], r: 4.2 }, g);
        });
      });
      return { g: g, nodes: nodes };
    }

    function ring(m, code) {
      var c = m.centroids[code];
      if (!c || DEM.reducedMotion) return;
      var r = mk('circle', { class: 'sx-ring', cx: c[0], cy: c[1], r: 18 }, m.layers.pulses);
      var a = r.animate([{ transform: 'scale(.12)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }],
        { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)' });
      a.onfinish = function () { r.remove(); };
    }

    /* ---------------------------------------------------------------- the wire overlay */
    var W = {};
    function wireGroup(name, weight) {
      var g = mk('g', { class: 'w-' + name }, wires);
      return {
        g: g,
        kase: mk('path', { class: 'w-case w-' + weight }, g),
        core: mk('path', { class: 'w-core w-' + weight, pathLength: 1 }, g)
      };
    }
    W.bus = wireGroup('main', 'bus');
    W.hero = wireGroup('hero', 'feed');
    W.map = wireGroup('mapfeed', 'feed');
    /* devices on the hero and map feeders: transformer (hero, wide only), disconnect, breaker */
    function devices(w, withXfmr) {
      var d = mk('g', { class: 'w-devs' }, w.g);
      w.devs = d;
      if (withXfmr) {
        w.xk = mk('path', { class: 'w-knock-fill' }, d);
        w.x1 = mk('path', { class: 'w-dev' }, d);
        w.x2 = mk('path', { class: 'w-dev' }, d);
      }
      w.knock = mk('line', { class: 'w-knock' }, d);
      w.contact = mk('path', { class: 'w-dev' }, d);
      w.blade = mk('line', { class: 'w-blade' }, d);
      w.pivot = mk('circle', { class: 'w-pivot', r: 3 }, d);
      w.brk = mk('rect', { class: 'w-brk' }, d);
    }
    devices(W.hero, true);
    devices(W.map, false);

    var heroEl = document.getElementById('top');
    var heroCopy = heroEl.querySelector('.hero-copy');
    var kpFrame = heroEl.querySelector('.keyplan-frame');
    var geom = {};

    function rel(el, ox, oy) {
      var r = el.getBoundingClientRect();
      return { l: r.left - ox, t: r.top - oy, r: r.right - ox, b: r.bottom - oy, w: r.width, h: r.height };
    }

    function placeSwitch(w, x0, x1, y, brkX, brk, show) {
      w.brk.setAttribute('x', brkX - brk / 2);
      w.brk.setAttribute('y', y - brk / 2);
      w.brk.setAttribute('width', brk);
      w.brk.setAttribute('height', brk);
      var on = show && x1 - x0 >= 14;
      [w.knock, w.contact, w.blade, w.pivot].forEach(function (n) { n.style.display = on ? '' : 'none'; });
      if (!on) return;
      w.knock.setAttribute('x1', x0 + 2); w.knock.setAttribute('x2', x1 - 2);
      w.knock.setAttribute('y1', y); w.knock.setAttribute('y2', y);
      w.contact.setAttribute('d', 'M' + x1 + ',' + (y - 6) + 'V' + (y + 6));
      w.blade.setAttribute('x1', x0); w.blade.setAttribute('y1', y);
      w.blade.setAttribute('x2', x1); w.blade.setAttribute('y2', y);
      w.blade.style.transformOrigin = x0 + 'px ' + y + 'px';
      w.pivot.setAttribute('cx', x0); w.pivot.setAttribute('cy', y);
    }

    function layoutWires() {
      var sr = sheet.getBoundingClientRect();
      var ox = sr.left + sheet.clientLeft, oy = sr.top + sheet.clientTop;
      var cs = getComputedStyle(sheet);
      var busX = num(cs.getPropertyValue('--bus-x'));
      var contentX = num(cs.getPropertyValue('--content-x'));
      var tapGap = num(cs.getPropertyValue('--tap-gap'));
      var brk = num(cs.getPropertyValue('--brk')) || 16;
      var brkX = busX + (contentX - busX - tapGap) / 2;
      var narrow = contentX < 80;

      var src = rel(sourceEl, ox, oy), gnd = rel(groundEl, ox, oy);
      var busTop = src.b - src.h * 0.125, busBot = gnd.t + 1;
      W.bus.kase.setAttribute('d', 'M' + busX + ',' + busTop + 'V' + busBot);
      W.bus.core.setAttribute('d', 'M' + busX + ',' + busTop + 'V' + busBot);
      geom.busTop = busTop; geom.busBot = busBot;

      /* hero feeder: leaves the bus above the headline, drops through a transformer in the gutter,
         and enters the key plan at California, where the corridors begin */
      var ks = rel(kp.svg, ox, oy), copy = rel(heroCopy, ox, oy), hero = rel(heroEl, ox, oy), kf = rel(kpFrame, ox, oy);
      var k = ks.w / 975, ca = kp.centroids.CA;
      var cy = ks.t + ca[1] * k, cx = ks.l + ca[0] * k;
      var wide = kf.l > copy.r;
      var d, y0;
      if (wide) {
        y0 = hero.t + Math.max(30, (copy.t - hero.t) * 0.42);
        var xg = Math.round((copy.r + kf.l) / 2);
        d = 'M' + busX + ',' + y0 + 'H' + xg + 'V' + cy + 'H' + cx;
        var span = cy - y0, xc = y0 + span * 0.42, r = 13;
        var t1 = circ(xg, xc - 9, r), t2 = circ(xg, xc + 9, r);
        W.hero.xk.setAttribute('d', t1 + t2);
        W.hero.x1.setAttribute('d', t1);
        W.hero.x2.setAttribute('d', t2);
        [W.hero.xk, W.hero.x1, W.hero.x2].forEach(function (n) { n.style.display = span > 110 ? '' : 'none'; });
      } else {
        y0 = cy;
        d = 'M' + busX + ',' + cy + 'H' + cx;
        [W.hero.xk, W.hero.x1, W.hero.x2].forEach(function (n) { n.style.display = 'none'; });
      }
      W.hero.kase.setAttribute('d', d);
      W.hero.core.setAttribute('d', d);
      placeSwitch(W.hero, brkX + brk / 2 + 8, wide ? contentX + 34 : contentX - 6, y0, brkX, brk, !narrow);
      geom.heroY = y0;

      /* map feeder: straight off the bus into the coverage map at California */
      var ms = rel(map.svg, ox, oy), mf = rel(mapframe, ox, oy);
      var mk2 = ms.w / 975, mca = map.centroids.CA;
      var my, mx;
      if (motion === 'zoom') { my = ms.t + ms.h * 0.5; mx = ms.l; }
      else { my = ms.t + mca[1] * mk2; mx = ms.l + mca[0] * mk2; }
      var md = 'M' + busX + ',' + my + 'H' + mx;
      W.map.kase.setAttribute('d', md);
      W.map.core.setAttribute('d', md);
      placeSwitch(W.map, brkX + brk / 2 + 8, mf.l - 8, my, brkX, brk, !narrow);
      geom.mapY = my;
    }

    var layoutQueued = false;
    function queueLayout() {
      if (layoutQueued) return;
      layoutQueued = true;
      requestAnimationFrame(function () { layoutQueued = false; layoutWires(); });
    }
    layoutWires();
    if (window.ResizeObserver) new ResizeObserver(queueLayout).observe(sheet);
    window.addEventListener('resize', queueLayout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueLayout);

    /* ---------------------------------------------------------------- motion: energize */
    function setOpen(w, open) { w.g.classList.toggle('is-open', open); }
    function drain(path, ms, delay) {
      /* run gold along a wire: pathLength is 1, so offset 1 is empty and 0 is full */
      path.style.strokeDasharray = '1 1';
      path.style.strokeDashoffset = '1';
      path.getBoundingClientRect();
      path.style.setProperty('--dur', ms + 'ms');
      after(delay || 0, function () {
        path.classList.add('is-draining');
        path.style.strokeDashoffset = '0';
      });
    }

    if (motion === 'energize') {
      kp.el.setAttribute('data-energize', 'pending');
      map.el.setAttribute('data-energize', 'pending');
      var kpCorr = drawCorridors(kp, { skipCase: true, pendingCores: true, darkNodes: true });
      var mapCorr = drawCorridors(map, { skipCase: true, pendingCores: true, darkNodes: true });
      var onLit = function (m, corr) {
        return function (code) {
          ring(m, code);
          if (corr.nodes[code]) corr.nodes[code].classList.remove('is-dark');
        };
      };
      var whenDone = function (m, corr) {
        var mo = new MutationObserver(function () {
          if (m.el.getAttribute('data-energize') === 'done') {
            corr.g.classList.remove('sx-cores-pending');
            Object.keys(corr.nodes).forEach(function (c) { corr.nodes[c].classList.remove('is-dark'); });
            mo.disconnect();
          }
        });
        mo.observe(m.el, { attributes: true, attributeFilter: ['data-energize'] });
      };
      whenDone(kp, kpCorr);
      whenDone(map, mapCorr);

      if (!armed) {
        kp.energize({ loop: 0 });
        map.energize({ loop: 0 });
      } else {
        /* one sequence: the hero breaker closes, gold runs down the bus and along the hero feeder into
           the key plan, the map carries it east; every tap down the page closes as the bus reaches it */
        setOpen(W.hero, true);
        setOpen(W.map, true);
        W.hero.core.style.strokeDasharray = '1 1';
        W.hero.core.style.strokeDashoffset = '1';
        W.map.core.style.strokeDasharray = '1 1';
        W.map.core.style.strokeDashoffset = '1';
        var BUS_MS = 2600;
        drain(W.bus.core, BUS_MS, 120);
        after(260, function () { setOpen(W.hero, false); });
        drain(W.hero.core, 900, 640);
        after(1560, function () {
          kp.energize({ speed: 620, pulse: 80, loop: 0, onEnergize: onLit(kp, kpCorr) });
        });

        var span = Math.max(1, geom.busBot - geom.busTop);
        var sr0 = sheet.getBoundingClientRect();
        document.querySelectorAll('.tap, .loads, .load, .switchboard').forEach(function (n) {
          var y = n.getBoundingClientRect().top - sr0.top;
          var t = 120 + BUS_MS * clamp((y - geom.busTop) / span, 0, 1);
          after(t, function () { n.classList.add('is-live'); });
        });

        /* the coverage map is held with its feeder open until it is in view */
        var io = new IntersectionObserver(function (entries) {
          if (!entries.some(function (e) { return e.isIntersecting; })) return;
          io.disconnect();
          var wait = Math.max(0, 2900 - performance.now());
          after(wait + 200, function () { setOpen(W.map, false); });
          drain(W.map.core, 700, wait + 560);
          after(wait + 1280, function () {
            map.energize({ speed: 620, pulse: 80, loop: 0, onEnergize: onLit(map, mapCorr) });
          });
        }, { threshold: 0.4 });
        io.observe(mapframe);
      }
    } else {
      drawCorridors(kp);
      var covCorr = drawCorridors(map);
    }

    /* ---------------------------------------------------------------- motion: zoom */
    var MIDWEST = ['IL', 'IN', 'OH', 'MI', 'WI', 'KY', 'IA', 'MO'];
    function transferSwitch(group) {
      var s = mk('svg', { class: 'xfer', 'aria-hidden': 'true', focusable: 'false' });
      group.insertBefore(s, group.firstChild);
      var parts = {
        feed: mk('path', { class: 'w-case', 'stroke-width': 5 }, s),
        feedCore: mk('path', { class: 'w-core', 'stroke-width': 1.6 }, s),
        top: mk('path', { class: 'w-dev', 'stroke-width': 2.5 }, s),
        bot: mk('path', { class: 'w-dev', 'stroke-width': 2.5 }, s),
        blade: mk('line', { class: 'w-blade xfer-blade' }, s),
        pivot: mk('circle', { class: 'w-pivot', r: 3.5 }, s)
      };
      function place() {
        var btns = group.querySelectorAll('.dem-scale-btn');
        if (btns.length < 2) return;
        var g = group.getBoundingClientRect();
        var w = s.getBoundingClientRect().width;
        var y1 = btns[0].getBoundingClientRect().top - g.top + btns[0].offsetHeight / 2;
        var y2 = btns[1].getBoundingClientRect().top - g.top + btns[1].offsetHeight / 2;
        var py = (y1 + y2) / 2, px0 = 12, cx = w - 10;
        parts.feed.setAttribute('d', 'M0,' + py + 'H' + px0);
        parts.feedCore.setAttribute('d', 'M0,' + py + 'H' + px0);
        parts.top.setAttribute('d', 'M' + cx + ',' + y1 + 'H' + w + 'M' + cx + ',' + (y1 - 6) + 'V' + (y1 + 6));
        parts.bot.setAttribute('d', 'M' + cx + ',' + y2 + 'H' + w + 'M' + cx + ',' + (y2 - 6) + 'V' + (y2 + 6));
        var len = Math.hypot(cx - px0, (y2 - y1) / 2);
        parts.blade.setAttribute('x1', px0); parts.blade.setAttribute('y1', py);
        parts.blade.setAttribute('x2', px0 + len); parts.blade.setAttribute('y2', py);
        parts.blade.style.transformOrigin = px0 + 'px ' + py + 'px';
        parts.pivot.setAttribute('cx', px0); parts.pivot.setAttribute('cy', py);
        parts.angle = Math.atan2((y2 - y1) / 2, cx - px0) * 180 / Math.PI;
        aim();
      }
      function aim() {
        var large = root.getAttribute('data-scale') !== 'small';
        parts.blade.style.transform = 'rotate(' + ((large ? -1 : 1) * (parts.angle || 38)) + 'deg)';
      }
      place();
      if (window.ResizeObserver) new ResizeObserver(place).observe(group);
      DEM.on('scale:change', aim);
    }

    if (motion === 'zoom') {
      var t1 = DEM.renderScaleToggle(document.getElementById('scale-toggle'));
      var t2 = DEM.renderScaleToggle(document.getElementById('scale-toggle-map'));
      transferSwitch(t1);
      transferSwitch(t2);
      var applyScale = function (s, ms) {
        mapframe.setAttribute('data-grid', s);
        map.zoomTo(s === 'large' ? MIDWEST : null, ms);
      };
      applyScale(root.getAttribute('data-scale') || 'large', 0);
      DEM.on('scale:change', function (s) { applyScale(s, 950); });
    }

    /* ---------------------------------------------------------------- motion: micro */
    function knife(btn) {
      var s = mk('svg', { class: 'knife', viewBox: '0 0 40 22', 'aria-hidden': 'true', focusable: 'false' });
      mk('path', { class: 'w-case', d: 'M0,15H8M32,15H40', 'stroke-width': 3 }, s);
      mk('path', { class: 'w-dev', d: 'M32,9V21', 'stroke-width': 2 }, s);
      mk('line', { class: 'w-blade knife-blade', x1: 8, y1: 15, x2: 32, y2: 15, 'stroke-width': 3 }, s);
      mk('path', { class: 'w-core knife-core', d: 'M10,15H30', 'stroke-width': 1.2 }, s);
      mk('circle', { class: 'w-pivot', cx: 8, cy: 15, r: 3 }, s);
      btn.insertBefore(s, btn.firstChild);
    }
    if (motion === 'micro') {
      var f = DEM.renderFilter(document.getElementById('filter'));
      f.querySelectorAll('.dem-filter-btn').forEach(knife);
      DEM.on('filter:change', function () {
        if (DEM.reducedMotion) return;
        mapframe.classList.remove('is-switching');
        void mapframe.offsetWidth;
        mapframe.classList.add('is-switching');
        clearTimeout(mapframe._sw);
        mapframe._sw = after(900, function () { mapframe.classList.remove('is-switching'); });
      });
    }

    /* ---------------------------------------------------------------- motion: story */
    if (motion === 'story') buildStory();

    function buildStory() {
      var section = document.getElementById('story');
      var art = document.getElementById('story-art');
      DEM.renderStorySteps(document.getElementById('story-steps'));
      /* number from the data, so a step shown alone on a phone keeps its own number */
      section.querySelectorAll('.dem-story-step').forEach(function (n, i) { n.setAttribute('data-n', String(i + 1)); });

      var svg = mk('svg', { class: 'sx', role: 'img', 'aria-label': 'One-line diagram of the power path, from generation to a data hall, then the national coverage map', preserveAspectRatio: 'xMidYMid meet' }, art);
      var defs = mk('defs', null, svg);
      var pat = mk('pattern', { id: 'sx-hatch', patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, defs);
      mk('rect', { width: 7, height: 7, fill: '#ffffff' }, pat);
      mk('line', { class: 'sm-hatch-line', x1: 0, y1: 0, x2: 0, y2: 7 }, pat);

      /* the national map, drawn into the same sheet */
      var gMap = mk('g', { class: 'sm' }, svg);
      var nameToCode = {};
      Object.keys(DEM.stateNames).forEach(function (c) { nameToCode[DEM.stateNames[c]] = c; });
      var topo = window.DEM_US_TOPO;
      var feats = topojson.feature(topo, topo.objects.states).features;
      var gp = d3.geoPath();
      var smStates = [], smCent = {};
      feats.forEach(function (f) {
        var code = nameToCode[f.properties.name];
        if (!code) return;
        var tier = DEM.stateTier(code);
        var cls = 'sm-state' + (tier ? ' is-covered tier-' + tier + (DEM.statePartial(code) ? ' is-partial' : '') : '');
        var p = mk('path', { class: cls, d: gp(f), 'data-state': code }, gMap);
        smCent[code] = gp.centroid(f);
        if (tier) smStates.push({ el: p, code: code, x: smCent[code][0] });
      });
      var xs = smStates.map(function (s) { return s.x; });
      var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
      var CA = smCent.CA;
      gMap.addEventListener('click', function (e) {
        var t = e.target.closest && e.target.closest('.sm-state.is-covered');
        if (t) DEM.selectState(t.getAttribute('data-state'), null);
      });

      /* the route from the substation bus to the map, and the diagram itself */
      var gRoute = mk('g', null, svg);
      var routeInk = mk('path', { class: 'ink w-tx', pathLength: 1 }, gRoute);
      var routeGold = mk('path', { class: 'gold w-tx', pathLength: 1 }, gRoute);
      var gDia = mk('g', { class: 'sx-dia' }, svg);
      var gCond = mk('g', null, gDia), gGold = mk('g', null, gDia), gDev = mk('g', null, gDia), gNote = mk('g', null, gDia);

      var L = DEM.copy.levels;
      /* Each step: ink (drawn in order), gold (energized after), breakers, fills, notes. Diagram units. */
      var STEPS = [
        { /* generation */
          ink: [[circ(90, 72, 30), 'w-dv', gDev], ['M68,72 C75,52 83,52 90,72 S105,92 112,72', 'w-dv', gDev], ['M90,102 V180', 'w-fd']],
          gold: [['M90,102 V180', 'w-fd']],
          brk: [[90, 140]],
          balloon: [1, 166, 44, 154, 50, 118, 62]
        },
        { /* step-up transformer and the transmission line */
          ink: [[circ(90, 196, 16), 'w-dv', gDev], [circ(90, 220, 16), 'w-dv', gDev], ['M90,236 V268 H470', 'w-tx']],
          gold: [[circ(90, 196, 16), 'w-dv'], [circ(90, 220, 16), 'w-dv'], ['M90,236 V268 H470', 'w-tx']],
          label: [L.transmission, 280, 252],
          balloon: [2, 214, 306, 214, 293, 214, 272]
        },
        { /* substation: disconnect, breaker, bus, step-down transformer, ground, distribution bus */
          ink: [['M470,268 V284', 'w-tx'], ['M464,284 H476', 'w-dv', gDev], ['M470,306 V286', 'w-dv', gDev], ['M470,306 V318', 'w-tx'], ['M470,336 V352', 'w-tx'],
            ['M330,352 H530', 'w-bus'], ['M370,352 V368', 'w-fd'], ['M370,386 V398', 'w-fd'],
            [circ(370, 414, 16), 'w-dv', gDev], [circ(370, 438, 16), 'w-dv', gDev],
            ['M386,438 H404 V450', 'w-dv', gDev], ['M393,450 H415 M397,456 H411 M401,462 H407', 'w-dv', gDev],
            ['M370,454 V472', 'w-fd'], ['M290,472 H450', 'w-bus']],
          gold: [['M470,268 V286', 'w-tx'], ['M470,306 V352', 'w-tx'], ['M330,352 H530', 'w-bus'], ['M370,352 V398', 'w-fd'],
            [circ(370, 414, 16), 'w-dv'], [circ(370, 438, 16), 'w-dv'], ['M370,454 V472', 'w-fd'], ['M290,472 H450', 'w-bus']],
          brk: [[470, 327], [370, 377]],
          pivot: [470, 306],
          fence: [278, 280, 270, 214],
          balloon: [3, 316, 424, 329, 424, 352, 420]
        },
        { /* distribution feeder */
          ink: [['M330,472 V488', 'w-fd'], ['M330,506 V540 H110', 'w-fd'], ['M234,540 V560', 'w-fine']],
          gold: [['M330,472 V540 H110', 'w-fd'], ['M234,540 V560', 'w-fine']],
          brk: [[330, 497]],
          fills: ['M228,557 L234,569 L240,557 Z'],
          label: [L.distribution, 186, 528],
          balloon: [4, 400, 566, 388, 562, 338, 544]
        },
        { /* the data hall */
          ink: [['M110,540 V560', 'w-fd'], ['M110,578 V590', 'w-fd']],
          gold: [['M110,540 V590', 'w-fd']],
          brk: [[110, 569]],
          fills: ['M101,588 L110,604 L119,588 Z'],
          hall: [40, 606, 140, 46],
          balloon: [5, 232, 629, 219, 629, 182, 629]
        }
      ];

      function drawable(d, cls, parent, gold) {
        var p = mk('path', { d: d, class: (gold ? 'gold ' : 'ink ') + cls, pathLength: 1 }, parent);
        p.style.strokeDasharray = '1 1';
        return p;
      }
      var balloons = [], labels = [];
      STEPS.forEach(function (st, i) {
        st.inkEls = st.ink.map(function (it) { return drawable(it[0], it[1], it[2] || gCond, false); });
        st.goldEls = st.gold.map(function (it) { return drawable(it[0], it[1], gGold, true); });
        st.brkEls = (st.brk || []).map(function (b) { return mk('path', { class: 'sx-brk', d: box(b[0] - 9, b[1] - 9, 18, 18) }, gDev); });
        st.fillEls = (st.fills || []).map(function (d) { return mk('path', { class: 'sx-fill', d: d }, gDev); });
        if (st.pivot) st.fillEls.push(mk('circle', { class: 'sx-brk', cx: st.pivot[0], cy: st.pivot[1], r: 3.2 }, gDev));
        if (st.fence) st.fenceEl = mk('rect', { class: 'sx-fence', x: st.fence[0], y: st.fence[1], width: st.fence[2], height: st.fence[3] }, gNote);
        if (st.hall) {
          var h = st.hall;
          st.hallEl = mk('rect', { class: 'sx-hall', x: h[0], y: h[1], width: h[2], height: h[3] }, gDev);
          var racks = '';
          for (var x = h[0] + 16; x < h[0] + h[2] - 8; x += 12) racks += 'M' + x + ',' + (h[1] + 9) + 'V' + (h[1] + h[3] - 9);
          st.inkEls.push(drawable(racks, 'w-fine', gDev, false));
        }
        st.noteEls = [];
        if (st.label) {
          var t = mk('text', { class: 'sx-label', x: st.label[1], y: st.label[2], 'text-anchor': 'middle' }, gNote);
          t.textContent = st.label[0];
          labels.push(t);
          st.noteEls.push(t);
        }
        if (st.balloon) {
          var b = st.balloon;
          var bg = mk('g', { class: 'sx-balloon' }, gNote);
          var leader = mk('path', { class: 'sx-leader' }, bg);
          var c = mk('circle', { cx: b[1], cy: b[2], r: 13 }, bg);
          var tx = mk('text', { x: b[1], y: b[2] }, bg);
          tx.textContent = String(b[0]);
          balloons.push({ c: c, t: tx, leader: leader, b: b });
          st.noteEls.push(bg);
        }
      });

      /* layout: compositions for the final camera (diagram scale s at dx,dy; map at mx,my scaled ms) */
      var D = [16, 26, 552, 640];
      var COMPS = {
        wide: { s: 0.42, dx: 0, dy: 0, mx: 300, my: 40, ms: 1 },
        narrow: { s: 0.42, dx: 0, dy: 0, mx: 0, my: 306, ms: 1 },
        tall: { s: 0.7, dx: 0, dy: 0, mx: 0, my: 506, ms: 0.8 },
        staticWide: { s: 1, dx: 0, dy: 0, mx: 640, my: 120, ms: 0.78 },
        staticNarrow: { s: 1, dx: 0, dy: 0, mx: 0, my: 704, ms: 0.575 }
      };
      var comp = COMPS.narrow, cam1 = null, lastU = 0, isStatic = false;

      function camFor(c) {
        var x0 = Math.min(D[0] * c.s + c.dx, c.mx - 30), y0 = Math.min(D[1] * c.s + c.dy, c.my - 20);
        var x1 = Math.max((D[0] + D[2]) * c.s + c.dx, c.mx + 975 * c.ms), y1 = Math.max((D[1] + D[3]) * c.s + c.dy, c.my + 610 * c.ms);
        return [x0 - 16, y0 - 16, x1 - x0 + 32, y1 - y0 + 32];
      }
      function chooseComp() {
        var r = art.getBoundingClientRect();
        isStatic = section.classList.contains('is-static');
        if (isStatic) comp = r.width > 760 ? COMPS.staticWide : COMPS.staticNarrow;
        else {
          var aspect = r.width / Math.max(1, r.height);
          comp = aspect > 1.3 ? COMPS.wide : aspect < 0.8 ? COMPS.tall : COMPS.narrow;
        }
        cam1 = camFor(comp);
        if (isStatic) art.style.setProperty('--art-aspect', (cam1[2] / cam1[3]).toFixed(4));
        else art.style.removeProperty('--art-aspect');
        /* keep annotation type legible when the drawing is small on screen */
        var vw = isStatic ? cam1 : D;
        var scale = Math.min(r.width / vw[2], (r.height || r.width) / vw[3]) || 1;
        var k = clamp(1 / scale, 1, 1.9);
        labels.forEach(function (t) { t.setAttribute('font-size', (15 * k).toFixed(1)); });
        balloons.forEach(function (o) {
          var rr = 13 * Math.min(k, 1.5);
          o.c.setAttribute('r', rr.toFixed(1));
          o.t.setAttribute('font-size', (14 * Math.min(k, 1.5)).toFixed(1));
          var b = o.b;
          o.leader.setAttribute('d', 'M' + b[3] + ',' + b[4] + 'L' + b[5] + ',' + b[6]);
        });
      }

      function route(c) {
        var ex = 530 * c.s + c.dx, ey = 352 * c.s + c.dy;
        var cx = c.mx + CA[0] * c.ms, cy = c.my + CA[1] * c.ms;
        if (c.mx > ex + 20) {
          var lane = Math.min(ex + 40, c.mx - 16);
          return 'M' + ex + ',' + ey + 'H' + lane + 'V' + cy + 'H' + cx;
        }
        var top = c.my - 16;
        return 'M' + ex + ',' + ey + 'H' + (ex + 26) + 'V' + top + 'H' + (c.mx - 18) + 'V' + cy + 'H' + cx;
      }

      function seq(els, amt) {
        var n = els.length;
        els.forEach(function (el, j) {
          var a = clamp(amt * n - j, 0, 1);
          el.style.strokeDashoffset = (1 - a).toFixed(4);
          el.style.opacity = a > 0 ? 1 : 0;
        });
      }

      function render(u) {
        lastU = u;
        STEPS.forEach(function (st, i) {
          var a = clamp((u - i) / 0.5, 0, 1);
          var g = clamp((u - i - 0.45) / 0.5, 0, 1);
          seq(st.inkEls, a);
          seq(st.goldEls, g);
          st.brkEls.concat(st.fillEls).forEach(function (el) { el.style.opacity = a > 0.35 ? 1 : 0; });
          st.brkEls.forEach(function (el) { el.classList.toggle('is-hot', g > 0.5); });
          if (st.fenceEl) st.fenceEl.style.opacity = clamp((a - 0.2) / 0.5, 0, 1);
          if (st.hallEl) {
            st.hallEl.style.opacity = a > 0.5 ? 1 : 0;
            st.hallEl.classList.toggle('is-hot', g >= 0.99);
          }
          st.noteEls.forEach(function (el) { el.style.opacity = clamp((a - 0.3) / 0.4, 0, 1); });
        });

        /* the last step: pull back to the national map, fed from the substation bus */
        var e = easeIO(clamp((u - 5) / 0.42, 0, 1));
        var s = lerp(1, comp.s, e);
        gDia.setAttribute('transform', 'translate(' + (comp.dx * e).toFixed(2) + ' ' + (comp.dy * e).toFixed(2) + ') scale(' + s.toFixed(4) + ')');
        gMap.setAttribute('transform', 'translate(' + comp.mx + ' ' + comp.my + ') scale(' + comp.ms + ')');
        gMap.style.opacity = e.toFixed(3);
        gMap.style.pointerEvents = e > 0.95 ? 'auto' : 'none';
        var vb = D.map(function (v, k) { return lerp(v, cam1[k], e); });
        svg.setAttribute('viewBox', vb.map(function (v) { return v.toFixed(2); }).join(' '));
        var cur = { s: s, dx: comp.dx * e, dy: comp.dy * e, mx: comp.mx, my: comp.my, ms: comp.ms };
        var rd = route(cur);
        routeInk.setAttribute('d', rd);
        routeGold.setAttribute('d', rd);
        seq([routeInk], clamp((u - 5.3) / 0.16, 0, 1));
        seq([routeGold], clamp((u - 5.44) / 0.2, 0, 1));
        var sweep = clamp((u - 5.6) / 0.26, 0, 1);
        smStates.forEach(function (o) {
          var lit = sweep > 0 && sweep >= (o.x - xMin) / Math.max(1, xMax - xMin) - 0.001;
          if (o.el.classList.contains('is-lit') !== lit) o.el.classList.toggle('is-lit', lit);
        });
      }

      chooseComp();
      DEM.scrollStory(section, function (st) {
        if (st.isStatic || section.classList.contains('is-static')) {
          if (!isStatic) chooseComp();
          render(6);
          return;
        }
        if (isStatic) chooseComp();
        render(clamp(st.p * 6 + 0.15, 0, 6));
      });
      var rq = false;
      function onResize() {
        if (rq) return;
        rq = true;
        requestAnimationFrame(function () { rq = false; chooseComp(); render(lastU); });
      }
      if (window.ResizeObserver) new ResizeObserver(onResize).observe(art);
      window.addEventListener('resize', onResize);
    }
  });
})();
