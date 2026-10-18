/*
  Cartographic editorial: the world layer.
  The core (shared/core.js) owns facts and behavior. This file draws the atlas furniture around the
  core maps (graticule, water lining, inset boxes, neatline with a degree band, scale bar,
  registration marks, overprinted corridors) and drives the four motion concepts in the plate's
  own terms: a press run (energize), inset plates (story), regional plate to local inset (zoom),
  and thumb-index tabs (micro). Every drawn feature is computed from the real projection or from
  apps.js; nothing marks a data center location.
*/
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VW = 975, VH = 610;          // core map viewBox
  var PAD = 10;                     // neatline band, in map units at national scale
  var FW = VW + 2 * PAD, FH = VH + 2 * PAD;
  /* us-atlas states-albers-10m is d3.geoAlbersUsa().scale(1300).translate([487.5, 305]); its lower-48
     part is exactly this conic, so the graticule and scale bar line up with the core map. */
  var PROJ = d3.geoAlbers().scale(1300).translate([487.5, 305]);
  var MILES_PER_UNIT = 3958.8 / 1300;   // earth radius in miles over projection scale
  var EASE = 'cubic-bezier(.16, 1, .3, 1)';
  /* Distribution view: the Northeast and Mid-Atlantic, where most hosting-capacity maps sit. */
  var LOCAL = ['OH', 'PA', 'NY', 'NJ', 'DE', 'MD', 'DC', 'VA', 'CT', 'RI', 'MA', 'VT', 'NH'];

  function S(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function vbOf(svg) { return svg.getAttribute('viewBox').split(/\s+/).map(Number); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function plateFill(map, code) {
    var tier = DEM.stateTier(code);
    if (!tier) return null;
    if (DEM.statePartial(code)) return 'url(#' + map.id + '-hatch-' + tier + ')';
    return tier === 'siting' ? 'var(--map-siting)' : 'var(--map-hosting)';
  }

  /* ------------------------------------------------------------------ graticule math */

  function latAtY(lon, y) {
    var lo = -15, hi = 84;
    for (var i = 0; i < 32; i++) {
      var mid = (lo + hi) / 2;
      if (PROJ([lon, mid])[1] > y) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function lonAtX(lat, x) {
    var lo = -179, hi = -1;
    for (var i = 0; i < 32; i++) {
      var mid = (lo + hi) / 2;
      if (PROJ([mid, lat])[0] < x) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /* ------------------------------------------------------------------ the plate */

  function insetBoxes(map) {
    return ['AK', 'HI'].map(function (c) {
      var b = map.bounds[c];
      if (!b) return null;
      var x0 = Math.max(2, b[0][0] - 8), y0 = b[0][1] - 8;
      return [x0, y0, b[1][0] + 8 - x0, Math.min(VH - 2, b[1][1] + 8) - y0];
    }).filter(Boolean);
  }

  function regMarks(field) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
      var m = S('svg', { class: 'cart-reg cart-reg-' + pos, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
      var key = S('g', { class: 'cart-reg-key' }, m);
      var col = S('g', { class: 'cart-reg-color' }, m);
      [key, col].forEach(function (g) {
        S('circle', { cx: 12, cy: 12, r: 5.5 }, g);
        S('path', { d: 'M12 1V23M1 12H23' }, g);
      });
      field.appendChild(m);
    });
  }

  /*
    makePlate(map, field, opts): dresses a core geo map as an atlas plate.
    opts.labels  degree labels on the neatline (default true)
    opts.scaleEl element that receives the scale bar
  */
  function makePlate(map, field, opts) {
    opts = opts || {};
    var svg = map.svg;
    svg.classList.add('cart-svg');
    var topo = window.DEM_US_TOPO;

    /* Under the land: graticule on the water, inset boxes for Alaska and Hawaii, coastline water lining. */
    var under = S('g', { class: 'cart-under', 'aria-hidden': 'true' });
    svg.insertBefore(under, map.layers.states);
    S('path', { class: 'cart-graticule', d: d3.geoPath(PROJ)(d3.geoGraticule().extent([[-160, 8], [-40, 72]]).step([5, 5])()) }, under);
    var insets = insetBoxes(map);
    insets.forEach(function (b) { S('rect', { class: 'cart-inset-fill', x: b[0], y: b[1], width: b[2], height: b[3] }, under); });
    var coast = d3.geoPath()(topojson.mesh(topo, topo.objects.nation));
    [8.6, 5.4, 2.7].forEach(function (r) {
      S('path', { class: 'cart-water', d: coast, 'stroke-width': (2 * r + 0.6).toFixed(2) }, under);
      S('path', { class: 'cart-water-gap', d: coast, 'stroke-width': (2 * r - 0.6).toFixed(2) }, under);
    });
    insets.forEach(function (b) { S('rect', { class: 'cart-inset-line', x: b[0], y: b[1], width: b[2], height: b[3] }, under); });

    /* Over the land: color plates arriving out of register (ghosts), then names for the local inset. */
    var ghosts = S('g', { class: 'cart-ghosts', 'aria-hidden': 'true' });
    svg.insertBefore(ghosts, map.layers.corridors);
    var names = S('g', { class: 'cart-names', 'aria-hidden': 'true' });
    svg.insertBefore(names, map.layers.leaders);

    /* The neatline with its degree band, as an overlay that stays put while the map zooms. */
    var frame = S('svg', { class: 'cart-frame', viewBox: '0 0 ' + FW + ' ' + FH, 'aria-hidden': 'true', focusable: 'false' });
    field.appendChild(frame);
    var gKeys = S('g', { class: 'cart-keys' }, frame);
    S('rect', { class: 'cart-neat-outer', x: 0.75, y: 0.75, width: FW - 1.5, height: FH - 1.5 }, frame);
    S('rect', { class: 'cart-neat-inner', x: PAD - 0.4, y: PAD - 0.4, width: VW + 0.8, height: VH + 0.8 }, frame);
    var gLabels = S('g', { class: 'cart-ticks' }, frame);
    regMarks(field);

    function drawFrame() {
      var vb = vbOf(svg);
      var fw = frame.getBoundingClientRect().width || FW;
      var k = FW / fw;
      var fs = 11 * k;
      var showLabels = opts.labels !== false && fw > 600;
      var national = vb[2] > VW - 1;
      gKeys.textContent = '';
      gLabels.textContent = '';
      var x0 = vb[0], y0 = vb[1], x1 = vb[0] + vb[2], y1 = vb[1] + vb[3];
      function fx(x) { return PAD + (x - x0) * VW / vb[2]; }
      function fy(y) { return PAD + (y - y0) * VH / vb[3]; }
      var B0 = 1.5, BW = PAD - 0.4 - B0;
      var insetF = national ? insets.map(function (b) { return [fx(b[0]), fy(b[1]), fx(b[0] + b[2]), fy(b[1] + b[3])]; }) : [];
      function inInset(x, y) { return insetF.some(function (b) { return x > b[0] - 24 && x < b[2] + 24 && y > b[1] - 12 && y < b[3] + 12; }); }

      function band(xs, start, end, draw) {
        if (!xs.length) return;
        xs.sort(function (a, b) { return a.t - b.t; });
        var cuts = [start].concat(xs.map(function (c) { return c.t; })).concat([end]);
        var v0 = Math.abs(xs[0].v);
        for (var i = 0; i < cuts.length - 1; i++) if ((v0 + i) % 2 === 0) draw(cuts[i], cuts[i + 1]);
      }
      function step(xs) {
        if (xs.length < 2) return 5;
        var span = Math.abs(xs[xs.length - 1].t - xs[0].t) / (xs.length - 1);
        return [1, 2, 5, 10].filter(function (s) { return span * s >= 84; })[0] || 10;
      }

      /* Meridians crossing the top and bottom edges. */
      [[y0, B0, false], [y1, FH - PAD + 0.4, true]].forEach(function (e) {
        var xs = [];
        for (var lon = -175; lon <= -40; lon++) {
          var p = PROJ([lon, latAtY(lon, e[0])]);
          if (Math.abs(p[1] - e[0]) < 0.5 && p[0] >= x0 && p[0] <= x1) xs.push({ v: lon, t: fx(p[0]) });
        }
        band(xs, B0, FW - B0, function (a, b) { S('rect', { class: 'cart-key', x: a.toFixed(2), y: e[1], width: (b - a).toFixed(2), height: BW }, gKeys); });
        if (e[2] && showLabels) {
          var st = step(xs);
          xs.forEach(function (c) {
            if (c.v % st || c.t < PAD + 40 || c.t > FW - PAD - 40) return;
            var y = FH - PAD - 6;
            if (inInset(c.t, y)) return;
            S('text', { class: 'cart-tick-label', x: c.t.toFixed(1), y: y.toFixed(1), 'font-size': fs.toFixed(2), 'text-anchor': 'middle' }, gLabels).textContent = Math.abs(c.v) + '°W';
          });
        }
      });
      /* Parallels crossing the left and right edges. */
      [[x0, B0, true], [x1, FW - PAD + 0.4, false]].forEach(function (e) {
        var ys = [];
        for (var lat = 5; lat <= 75; lat++) {
          var p = PROJ([lonAtX(lat, e[0]), lat]);
          if (Math.abs(p[0] - e[0]) < 0.5 && p[1] >= y0 && p[1] <= y1) ys.push({ v: lat, t: fy(p[1]) });
        }
        band(ys, B0, FH - B0, function (a, b) { S('rect', { class: 'cart-key', x: e[1], y: a.toFixed(2), width: BW, height: (b - a).toFixed(2) }, gKeys); });
        if (e[2] && showLabels) {
          var st = step(ys);
          ys.forEach(function (c) {
            if (c.v % st || c.t < PAD + 30 || c.t > FH - PAD - 30) return;
            var x = PAD + 6, y = c.t + fs * 0.34;
            if (inInset(x, y)) return;
            S('text', { class: 'cart-tick-label', x: x, y: y.toFixed(1), 'font-size': fs.toFixed(2) }, gLabels).textContent = c.v + '°N';
          });
        }
      });
    }

    function drawScale() {
      var el = opts.scaleEl;
      if (!el) return;
      var vb = vbOf(svg), w = svg.getBoundingClientRect().width;
      if (!w) return;
      var milesPerPx = MILES_PER_UNIT * vb[2] / w;
      var maxPx = w > 640 ? 200 : 132;
      var miles = [10, 20, 25, 50, 100, 150, 200, 250, 300, 400, 500, 1000].filter(function (m) { return m / milesPerPx <= maxPx; }).pop() || 10;
      var px = miles / milesPerPx;
      var h = 30, x = 6, bar = S('svg', { class: 'cart-scale', width: Math.ceil(px + 84), height: h, viewBox: '0 0 ' + Math.ceil(px + 84) + ' ' + h, focusable: 'false' });
      for (var i = 0; i < 4; i++) S('rect', { class: 'cart-scale-seg' + (i % 2 ? '' : ' is-ink'), x: (x + px * i / 4).toFixed(2), y: 6, width: (px / 4).toFixed(2), height: 5 }, bar);
      S('rect', { class: 'cart-scale-box', x: x, y: 6, width: px.toFixed(2), height: 5 }, bar);
      [[0, '0'], [px / 2, String(miles / 2)], [px, miles + ' miles']].forEach(function (l, j) {
        S('text', { class: 'cart-scale-label', x: (x + l[0]).toFixed(2), y: 26, 'text-anchor': j === 2 ? 'start' : 'middle', dx: j === 2 ? -4 : 0 }, bar).textContent = l[1];
      });
      el.textContent = '';
      el.appendChild(bar);
    }

    var plate = {
      map: map, svg: svg, field: field, frame: frame, ghosts: ghosts, names: names,
      redraw: function () { drawFrame(); drawScale(); }
    };
    if (window.ResizeObserver) {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = Math.round(field.getBoundingClientRect().width);
        if (w !== lastW) { lastW = w; plate.redraw(); if (plate.onResize) plate.onResize(); }
      }).observe(field);
    }
    plate.redraw();
    return plate;
  }

  /* A color plate arriving out of register and sliding into place (multiplied over the key plate). */
  function registerPlate(plate, code, delay, dur) {
    if (DEM.reducedMotion) return;
    var map = plate.map, p = map.paths[code], fill = plateFill(map, code);
    if (!p || !fill) return;
    var g = S('path', { d: p.getAttribute('d'), class: 'cart-ghost' }, plate.ghosts);
    g.style.fill = fill;
    var a = g.animate([
      { transform: 'translate(9px, -7px)', opacity: 0, easing: 'linear' },
      { transform: 'translate(9px, -7px)', opacity: 0.92, offset: 0.12, easing: EASE },
      { transform: 'translate(0px, 0px)', opacity: 0.92, offset: 0.72, easing: 'ease-in' },
      { transform: 'translate(0px, 0px)', opacity: 0 }
    ], { duration: dur || 1150, delay: delay || 0, fill: 'both' });
    a.onfinish = function () { g.remove(); };
  }

  /* ------------------------------------------------------------------ overprinted corridors */

  function buildOverprint(plate, hidden) {
    var map = plate.map;
    var g = S('g', { class: 'cart-overprint', 'aria-hidden': 'true' });
    map.svg.insertBefore(g, map.layers.pulses);
    return map.corridorPaths().map(function (c, i) {
      var id = map.id + '-ink-' + i;
      var mask = S('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -60, y: -60, width: VW + 120, height: VH + 120 }, map.layers.defs);
      var mp = S('path', { class: 'cart-reveal', d: c.d }, mask);
      var grp = S('g', { class: 'cart-corridor', mask: 'url(#' + id + ')' }, g);
      S('path', { class: 'cart-corr-case', d: c.d }, grp);
      S('path', { class: 'cart-corr-ticks', d: c.d }, grp);
      S('path', { class: 'cart-corr-line', d: c.d }, grp);
      var len = mp.getTotalLength();
      mp.style.strokeDasharray = len + ' ' + (len + 60);
      mp.style.strokeDashoffset = hidden ? len : 0;
      return { d: c.d, mask: mp, len: len, inked: !hidden };
    });
  }

  /* ------------------------------------------------------------------ story: inset plates */

  var curve = d3.line().curve(d3.curveBasis);
  var poly = d3.line();
  var closed = d3.line().curve(d3.curveCardinalClosed.tension(0.1));
  function rectD(x, y, w, h) { return 'M' + x + ',' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z'; }
  function circD(cx, cy, r) { return 'M' + (cx - r) + ',' + cy + 'a' + r + ',' + r + ' 0 1,0 ' + (2 * r) + ',0a' + r + ',' + r + ' 0 1,0 ' + (-2 * r) + ',0Z'; }
  /* K: key-plate line that inks in; F: patterned line that fades in; R: color plate that registers. */
  function K(g, d, cls) { return S('path', { d: d, class: 'k ' + cls, pathLength: 1 }, g); }
  function F(g, d, cls) { return S('path', { d: d, class: 'kf ' + cls }, g); }
  function R(g, d, cls, fill) { var p = S('path', { d: d, class: 'r ' + cls }, g); if (fill) p.style.fill = fill; return p; }
  function blob(cx, cy, r, seed, sx) {
    var pts = [];
    for (var i = 0; i < 28; i++) {
      var a = i / 28 * Math.PI * 2;
      var rr = r * (1 + 0.17 * Math.sin(2 * a + seed) + 0.08 * Math.sin(3 * a + seed * 1.9) + 0.04 * Math.cos(5 * a + seed * 0.7));
      pts.push([cx + rr * Math.cos(a) * sx, cy + rr * Math.sin(a)]);
    }
    return closed(pts);
  }
  function hill(g, cx, cy, n, step, seed, sx) {
    for (var i = 1; i <= n; i++) K(g, blob(cx, cy, i * step, seed + i * 0.21, sx), 'sp-contour' + (i % 4 === 0 ? ' is-index' : ''));
  }
  function tl(g, d) { K(g, d, 'sp-tl-case'); F(g, d, 'sp-tl-ticks'); K(g, d, 'sp-tl-gold'); }
  function dl(g, d) { K(g, d, 'sp-dl'); F(g, d, 'sp-poles'); }
  function road(g, d) { K(g, d, 'sp-road-case'); K(g, d, 'sp-road-fill'); }
  function river(g, d) { K(g, d, 'sp-bank'); K(g, d, 'sp-water'); K(g, d, 'sp-wline'); }
  function bldg(g, id, x, y, w, h, tone) {
    R(g, rectD(x, y, w, h), 'sp-hatch', 'url(#' + id + '-hatch' + (tone || '') + ')');
    K(g, rectD(x, y, w, h), 'sp-bldg');
  }
  function pad(g, x, y, w, h) { R(g, rectD(x, y, w, h), 'sp-pad', 'var(--land)'); K(g, rectD(x, y, w, h), 'sp-bldg'); }

  var STORY_PLATES = [
    /* 1. Generation: a plant on a river, its switchyard, transmission leaving east. */
    function (g, id) {
      hill(g, 110, 100, 8, 12, 0.4, 1.35);
      hill(g, 566, 384, 6, 13, 2.2, 1.2);
      R(g, rectD(178, 70, 300, 186), 'sp-fill', 'var(--lilac)');
      river(g, curve([[650, 160], [570, 196], [505, 262], [430, 318], [330, 352], [205, 368], [95, 404], [-10, 424]]));
      road(g, curve([[-10, 252], [80, 246], [150, 226], [204, 200]]));
      bldg(g, id, 200, 150, 120, 62);
      K(g, circD(250, 104, 24), 'sp-bldg'); K(g, circD(250, 104, 15), 'sp-thin');
      K(g, circD(318, 104, 24), 'sp-bldg'); K(g, circD(318, 104, 15), 'sp-thin');
      K(g, circD(348, 184, 6), 'sp-bldg');
      F(g, rectD(372, 118, 86, 96), 'sp-fence');
      [140, 166, 192].forEach(function (y) { K(g, 'M384,' + y + 'H446', 'sp-bus'); });
      K(g, 'M320,181H372', 'sp-thin2');
      tl(g, poly([[458, 140], [540, 104], [650, 58]]));
      tl(g, poly([[458, 192], [556, 174], [650, 150]]));
    },
    /* 2. High-voltage transmission: a double circuit on a cleared right of way across contours. */
    function (g) {
      hill(g, 150, 330, 8, 14, 1.2, 1.45);
      hill(g, 480, 110, 7, 13, 2.6, 1.3);
      hill(g, 606, 404, 4, 13, 0.9, 1.1);
      var c = [[-10, 388], [190, 300], [420, 196], [650, 100]];
      R(g, poly(c), 'sp-row');
      river(g, curve([[-10, 96], [110, 122], [210, 176], [300, 204], [380, 258], [470, 296], [650, 322]]));
      road(g, curve([[296, -10], [306, 110], [336, 250], [326, 450]]));
      tl(g, poly(c.map(function (p) { return [p[0], p[1] - 9]; })));
      tl(g, poly(c.map(function (p) { return [p[0], p[1] + 9]; })));
    },
    /* 3. Substation: fenced yard, high-voltage bus, transformers, feeders leaving. */
    function (g, id) {
      R(g, rectD(120, 78, 400, 284), 'sp-fill', 'var(--lilac)');
      F(g, rectD(120, 78, 400, 284), 'sp-fence');
      tl(g, poly([[-10, 104], [90, 122], [170, 145]]));
      tl(g, poly([[-10, 236], [90, 196], [170, 167]]));
      K(g, 'M170,145H470', 'sp-bus-hv'); K(g, 'M170,167H470', 'sp-bus-hv');
      [230, 320, 410].forEach(function (x) {
        K(g, 'M' + x + ',167V206', 'sp-thin2');
        pad(g, x - 6, 178, 12, 12);
        pad(g, x - 30, 206, 60, 46);
        K(g, circD(x - 8, 229, 11), 'sp-thin2'); K(g, circD(x + 8, 229, 11), 'sp-thin2');
        K(g, 'M' + x + ',252V290', 'sp-thin2');
      });
      K(g, 'M200,290H440', 'sp-bus');
      dl(g, curve([[230, 290], [222, 360], [170, 450]]));
      dl(g, poly([[320, 290], [320, 450]]));
      dl(g, curve([[410, 290], [424, 360], [490, 450]]));
      bldg(g, id, 446, 96, 58, 34);
      road(g, curve([[650, 318], [580, 320], [520, 326]]));
    },
    /* 4. Distribution feeder: a trunk down the streets with laterals; the lilac band is its headroom. */
    function (g, id) {
      var xs = [40, 170, 300, 430, 560], ys = [[24, 118], [170, 112], [310, 120]];
      ys.forEach(function (r) { xs.forEach(function (x) { K(g, rectD(x, r[0], 110, r[1]), 'sp-block'); }); });
      [[60, 40, 40, 30], [110, 90, 30, 36], [190, 40, 60, 40], [320, 50, 36, 60], [370, 60, 30, 26], [450, 190, 70, 40],
        [590, 200, 40, 60], [60, 330, 50, 40], [200, 340, 70, 50], [330, 320, 40, 40], [460, 330, 60, 70], [190, 196, 44, 60]]
        .forEach(function (b) { bldg(g, id, b[0], b[1], b[2], b[3]); });
      R(g, 'M-10,156H650', 'sp-headroom');
      R(g, 'M160,156V450M420,156V-10M550,156V296H650', 'sp-headroom is-lateral');
      dl(g, 'M-10,156H650');
      dl(g, 'M160,156V450');
      dl(g, 'M420,156V-10');
      dl(g, 'M550,156V296H650');
    },
    /* 5. The data hall: a building on a dash-dot parcel, its yard fed from the feeder. */
    function (g, id) {
      hill(g, 566, 70, 5, 15, 1.7, 1.4);
      var parcel = poly([[86, 64], [560, 52], [592, 372], [106, 392]]) + 'Z';
      R(g, parcel, 'sp-fill', 'var(--lilac)');
      F(g, parcel, 'sp-parcel');
      bldg(g, id, 196, 124, 256, 150, '-aub');
      K(g, rectD(196, 124, 256, 150), 'sp-bldg-heavy');
      [260, 324, 388].forEach(function (x) { K(g, 'M' + x + ',124V274', 'sp-thin2'); });
      F(g, rectD(474, 150, 78, 96), 'sp-fence');
      pad(g, 488, 166, 22, 18); pad(g, 520, 166, 22, 18); pad(g, 488, 206, 22, 18); pad(g, 520, 206, 22, 18);
      dl(g, curve([[-10, 300], [110, 302], [160, 318], [470, 318], [512, 246]]));
      road(g, curve([[300, 450], [302, 340], [322, 286]]));
    },
    /* 6. Every covered state: pull back to the national plate (real coverage from apps.js). */
    function (g, id, hero) {
      var outer = S('g', { transform: 'translate(20,30) scale(0.6154)' }, g);
      var pull = S('g', { class: 'sp-pull' }, outer);
      var codes = Object.keys(hero.paths);
      codes.forEach(function (code) {
        var t = DEM.stateTier(code);
        if (!t) return;
        R(pull, hero.paths[code].getAttribute('d'), 'sp-nat-fill',
          DEM.statePartial(code) ? 'url(#' + id + '-hatch-h)' : (t === 'siting' ? 'var(--map-siting)' : 'var(--map-hosting)'));
      });
      codes.forEach(function (code) { K(pull, hero.paths[code].getAttribute('d'), 'sp-nat-line'); });
      hero.corridorPaths().forEach(function (c) { K(pull, c.d, 'sp-ntl-case'); K(pull, c.d, 'sp-ntl-gold'); });
    }
  ];

  function buildStoryPlate(li, i, hero) {
    var id = 'sp' + i;
    var svg = S('svg', { class: 'story-art sp', viewBox: '0 0 640 440', 'aria-hidden': 'true', focusable: 'false' });
    var defs = S('defs', null, svg);
    [['', 'sp-hatch-line'], ['-aub', 'sp-hatch-line is-aub'], ['-h', 'sp-hatch-line is-hosting']].forEach(function (h) {
      var p = S('pattern', { id: id + '-hatch' + h[0], patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }, defs);
      S('rect', { class: 'sp-hatch-bg', width: 5, height: 5 }, p);
      S('line', { class: h[1], x1: 0, y1: 0, x2: 0, y2: 5 }, p);
    });
    var clip = S('clipPath', { id: id + '-clip' }, defs);
    S('rect', { x: 7, y: 7, width: 626, height: 426 }, clip);
    S('rect', { class: 'sp-ground', width: 640, height: 440 }, svg);
    var body = S('g', { 'clip-path': 'url(#' + id + '-clip)' }, svg);
    STORY_PLATES[i](body, id, hero);
    K(svg, rectD(1, 1, 638, 438), 'sp-frame-outer');
    K(svg, rectD(6, 6, 628, 428), 'sp-frame-inner');
    li.appendChild(svg);

    var ks = svg.querySelectorAll('.k'), kfs = svg.querySelectorAll('.kf'), rs = svg.querySelectorAll('.r');
    var pull = svg.querySelector('.sp-pull');
    var last = '';
    return function set(ink, reg) {
      var key = ink.toFixed(3) + '|' + reg.toFixed(3);
      if (key === last) return;
      last = key;
      var off = (1 - ink).toFixed(4);
      each(ks, function (n) { n.style.strokeDashoffset = off; });
      var fo = clamp(ink * 1.6 - 0.6, 0, 1).toFixed(3);
      each(kfs, function (n) { n.style.opacity = fo; });
      var tx = ((1 - reg) * 10).toFixed(2), ty = (-(1 - reg) * 7).toFixed(2);
      each(rs, function (n) { n.style.opacity = reg.toFixed(3); n.style.transform = 'translate(' + tx + 'px,' + ty + 'px)'; });
      if (pull) pull.style.transform = 'scale(' + (1 + (1 - ink) * 0.55).toFixed(4) + ')';
    };
  }

  /* ------------------------------------------------------------------ boot */

  DEM.ready(function (DEM) {
    var motion = DEM.motion;
    var $ = function (id) { return document.getElementById(id); };

    if (motion === 'story') $('nav-scales').setAttribute('href', '#story');

    DEM.renderFind($('find'));
    DEM.renderLegend($('hero-legend'));
    var heroMap = DEM.renderMap($('hero-map'), { form: 'geo' });
    var hero = makePlate(heroMap, $('hero-field'), { scaleEl: $('hero-scale') });
    var plateHero = $('plate-hero');

    DEM.renderLegend($('legend'));
    var indexMap = DEM.renderMap($('map'), { form: 'geo' });
    var index = makePlate(indexMap, $('index-field'), { labels: false });
    $('plate-index').classList.add('is-registered');
    DEM.renderList($('list'));
    DEM.renderDirectory($('directory'));

    /* ---------------- energize: the press run */
    if (motion === 'energize') {
      var press = !DEM.reducedMotion;
      var over = buildOverprint(hero, press);
      if (!press) plateHero.classList.add('is-registered');
      new MutationObserver(function (recs) {
        recs.forEach(function (r) {
          each(r.addedNodes, function (n) {
            if (!n.classList || !n.classList.contains('dem-pulse')) return;
            var a = n.getAnimations ? n.getAnimations()[0] : null;
            if (!a) return;
            var t = a.effect.getTiming(), d = n.getAttribute('d');
            /* The press head: an ink casing under the core's gold pulse. */
            var c = S('path', { class: 'cart-pulse-case', d: d });
            c.style.strokeDasharray = n.style.strokeDasharray;
            n.parentNode.insertBefore(c, n);
            var ca = c.animate(a.effect.getKeyframes(), { duration: t.duration, delay: t.delay, easing: 'linear', fill: 'both' });
            ca.currentTime = a.currentTime;
            ca.onfinish = function () { c.remove(); };
            /* The gold overprint inks in behind the head. */
            var o = over.filter(function (x) { return x.d === d && !x.inked; })[0];
            if (o) {
              o.inked = true;
              var pulse = parseFloat(n.style.strokeDasharray) || 90;
              var oa = o.mask.animate([
                { strokeDashoffset: o.len, offset: 0 },
                { strokeDashoffset: 0, offset: o.len / (o.len + pulse) },
                { strokeDashoffset: 0, offset: 1 }
              ], { duration: t.duration, delay: t.delay, easing: 'linear', fill: 'both' });
              oa.currentTime = a.currentTime;
            }
          });
        });
      }).observe(heroMap.layers.pulses, { childList: true });
      new MutationObserver(function () {
        if (heroMap.el.getAttribute('data-energize') !== 'done') return;
        over.forEach(function (o) { if (!o.inked) { o.inked = true; o.mask.style.strokeDashoffset = 0; } });
        setTimeout(function () { plateHero.classList.add('is-registered'); }, DEM.reducedMotion ? 0 : 250);
      }).observe(heroMap.el, { attributes: true, attributeFilter: ['data-energize'] });
      heroMap.energize({ speed: 300, pulse: 120, loop: 0, onEnergize: function (code) { registerPlate(hero, code, 0, 1150); } });
    } else {
      buildOverprint(hero, false);
      plateHero.classList.add('is-registered');
    }

    /* ---------------- zoom: regional plate to local inset */
    if (motion === 'zoom') {
      var loc = buildLocator(heroMap, $('hero-field'));
      var first = true, seq = 0;
      hero.onResize = function () { if (plateHero.classList.contains('is-local')) placeNames(hero); };
      DEM.on('scale:change', function (s) {
        var local = s === 'small';
        var ms = first || DEM.reducedMotion ? 0 : 1250;
        var my = ++seq;
        first = false;
        plateHero.classList.remove('is-settled');
        plateHero.classList.toggle('is-local', local);
        plateHero.classList.toggle('is-transmission', !local);
        hero.frame.classList.add('is-moving');
        var t0 = performance.now();
        (function track(now) { loc.update(); if (now - t0 < ms + 60) requestAnimationFrame(track); })(t0);
        heroMap.zoomTo(local ? LOCAL : null, ms).then(function () {
          if (my !== seq) return;
          loc.update();
          hero.redraw();
          if (local) placeNames(hero); else hero.names.textContent = '';
          plateHero.classList.add('is-settled');
          hero.frame.classList.remove('is-moving');
        });
      });
      DEM.renderScaleToggle($('scale-toggle'));
    }

    /* ---------------- micro: thumb-index tabs re-register the chosen color plate */
    if (motion === 'micro') {
      DEM.renderFilter($('filter'));
      DEM.on('filter:change', function (t) {
        DEM.coveredCodes.forEach(function (code) {
          if (t !== 'all' && DEM.stateTier(code) !== t) return;
          registerPlate(index, code, indexMap.centroids[code][0] / VW * 340, 900);
        });
      });
    }

    /* ---------------- story: atlas inset plates */
    if (motion === 'story') {
      var section = $('story');
      var ol = DEM.renderStorySteps($('story-steps'));
      var setters = [];
      each(ol.querySelectorAll('.dem-story-step'), function (li, i) { setters.push(buildStoryPlate(li, i, heroMap)); });
      var prog = section.querySelector('.story-progress');
      var segs = setters.map(function () { return prog.appendChild(document.createElement('span')); });
      DEM.scrollStory(section, function (st) {
        var pre = 1;
        if (st.step === 0 && st.p === 0) {
          var r = section.getBoundingClientRect();
          pre = clamp(1 - r.top / window.innerHeight, 0, 1);
        }
        setters.forEach(function (set, i) {
          if (st.isStatic || i < st.step) { set(1, 1); return; }
          if (i > st.step) { set(0, 0); return; }
          var l = i === 0 ? clamp(st.local + (pre - 1) * 0.5 + 0.18, 0, 1) : st.local;
          set(easeOut(clamp(l / 0.5, 0, 1)), easeOut(clamp((l - 0.3) / 0.38, 0, 1)));
        });
        segs.forEach(function (s, i) {
          s.style.setProperty('--f', st.isStatic || i < st.step ? 1 : i > st.step ? 0 : st.local.toFixed(3));
        });
      });
    }
  });

  /* ------------------------------------------------------------------ zoom helpers */

  function buildLocator(map, field) {
    var wrap = document.createElement('div');
    wrap.className = 'cart-locator';
    wrap.setAttribute('aria-hidden', 'true');
    var svg = S('svg', { viewBox: '0 0 ' + VW + ' ' + VH, focusable: 'false' });
    wrap.appendChild(svg);
    Object.keys(map.paths).forEach(function (code) {
      var p = S('path', { class: 'cart-loc-state', d: map.paths[code].getAttribute('d') }, svg);
      var t = DEM.stateTier(code);
      if (t && map.paths[code].classList.contains('scale-small')) p.classList.add(DEM.statePartial(code) ? 'is-partial' : 'is-' + t);
    });
    var box = S('rect', { class: 'cart-loc-box' }, svg);
    var inner = S('rect', { class: 'cart-loc-box-gold' }, svg);
    field.appendChild(wrap);
    return {
      el: wrap,
      update: function () {
        var vb = vbOf(map.svg);
        [box, inner].forEach(function (r) {
          r.setAttribute('x', vb[0].toFixed(1)); r.setAttribute('y', vb[1].toFixed(1));
          r.setAttribute('width', vb[2].toFixed(1)); r.setAttribute('height', vb[3].toFixed(1));
        });
      }
    };
  }

  /* State names for the local inset, set only where the name fits inside the state. */
  function placeNames(plate) {
    var map = plate.map, vb = vbOf(map.svg);
    var w = map.svg.getBoundingClientRect().width;
    if (!w) return;
    var ppu = w / vb[2];
    var px = w > 600 ? 14 : 12;
    var fs = px / ppu;
    plate.names.textContent = '';
    LOCAL.forEach(function (code) {
      var p = map.paths[code];
      if (!p || !p.classList.contains('scale-small')) return;
      var b = map.bounds[code], name = DEM.stateNames[code];
      var need = name.length * px * 0.58 + 10;
      if ((b[1][0] - b[0][0]) * ppu < need || (b[1][1] - b[0][1]) * ppu < px * 2) return;
      var c = map.centroids[code];
      var t = S('text', { class: 'cart-name', x: c[0].toFixed(1), y: c[1].toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs.toFixed(2) }, plate.names);
      t.style.strokeWidth = (3.2 / ppu).toFixed(2);
      t.textContent = name;
    });
  }
})();
