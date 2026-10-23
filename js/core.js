/*
  Decennial Energy Maps: the facts and the core behavior. The look lives in css/ and js/page.js + js/art.js;
  this file owns:
  coverage data, the geographic and hex maps, the state panel / bottom sheet, the covered-state list,
  the directory, the find-your-state control, and the four motion engines (story, energize, zoom, micro).
  API: docs/core-contract.md. Requires d3 7.9.0, topojson-client 3.1.0, data/us-states-albers.js,
  data/apps.js and data/copy.js to load first. data/apps.local.js (gitignored) is loaded on demand when present.
*/
(function () {
  'use strict';

  var BASE = (function () {
    var src = document.currentScript && document.currentScript.src;
    return src ? src.slice(0, src.lastIndexOf('/') + 1) : '../shared/';
  })();

  var SVGNS = 'http://www.w3.org/2000/svg';
  var VIEW_W = 975, VIEW_H = 610;

  var FIPS = {
    '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
    '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
    '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
    '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
    '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
    '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY'
  };

  /* Equal-area hex tile layout: [column, row]; odd rows sit half a tile to the right. */
  /* Follows the operator's reference tile map (2026-10-22): every mainland state touches its real
     neighbors, Florida hangs below Alabama and Georgia, Wisconsin / Illinois / Michigan sit in the
     Great Lakes rows, and Rhode Island tucks beside Massachusetts and Connecticut. */
  var HEX = {
    AK: [1, 0], ME: [12, 0],
    VT: [10, 1], NH: [11, 1],
    WA: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], WI: [6, 2], MI: [8, 2], NY: [10, 2], MA: [11, 2], RI: [12, 2],
    ID: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IL: [6, 3], IN: [7, 3], OH: [8, 3], PA: [9, 3], NJ: [10, 3], CT: [11, 3],
    OR: [2, 4], NV: [3, 4], CO: [4, 4], NE: [5, 4], MO: [6, 4], KY: [7, 4], WV: [8, 4], VA: [9, 4], MD: [10, 4], DE: [11, 4],
    CA: [2, 5], UT: [3, 5], NM: [4, 5], KS: [5, 5], AR: [6, 5], TN: [7, 5], NC: [8, 5], SC: [9, 5], DC: [10, 5],
    AZ: [4, 6], OK: [5, 6], LA: [6, 6], MS: [7, 6], AL: [8, 6], GA: [9, 6],
    HI: [0, 7], TX: [5, 7], FL: [8, 7]
  };

  /* Small states that get callout chips on the geographic map, north to south. */
  var SMALL = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'];

  /* Stylized transmission corridors, as state sequences. Power is drawn flowing west to east. */
  /* Every hop is between tiles that touch on the hex board, so the corridors run smoothly. */
  var CORRIDORS = [
    ['CA', 'UT', 'NM', 'KS', 'MO', 'IL', 'IN', 'OH'],
    ['OH', 'PA', 'NJ', 'CT', 'RI'],
    ['PA', 'NY', 'MA', 'NH', 'ME'],
    ['NY', 'VT'],
    ['OH', 'WV', 'VA', 'NC'],
    ['PA', 'MD', 'DC'],
    ['MD', 'DE']
  ];

  var LOOKS = [
    { id: 'control-room', name: 'Control room' },
    { id: 'schematic', name: 'Single-line schematic' },
    { id: 'night-lights', name: 'Night lights field' },
    { id: 'cartographic', name: 'Cartographic editorial' },
    { id: 'isometric', name: 'Isometric campus' }
  ];
  var MOTIONS = [
    { id: 'story', name: 'Story' },
    { id: 'energize', name: 'Energize' },
    { id: 'zoom', name: 'Zoom' },
    { id: 'micro', name: 'Micro' }
  ];

  var NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

  /* ------------------------------------------------------------------ utilities */

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    setAttrs(n, attrs);
    append(n, children);
    return n;
  }
  function svg(tag, attrs, children) {
    var n = document.createElementNS(SVGNS, tag);
    setAttrs(n, attrs);
    append(n, children);
    return n;
  }
  function setAttrs(n, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.setAttribute('class', v);
      else n.setAttribute(k, v === true ? '' : v);
    });
  }
  function append(n, children) {
    if (children === null || children === undefined) return;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }
  function fmt(s, vars) {
    return String(s).replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : ''; });
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function joinList(items) {
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  /* ------------------------------------------------------------------ events */

  var handlers = {};
  function on(type, fn) { (handlers[type] = handlers[type] || []).push(fn); return function () { off(type, fn); }; }
  function off(type, fn) { handlers[type] = (handlers[type] || []).filter(function (f) { return f !== fn; }); }
  function emit(type, detail) { (handlers[type] || []).slice().forEach(function (fn) { fn(detail); }); }

  /* ------------------------------------------------------------------ data */

  var DEM = window.DEM = {
    LOOKS: LOOKS, MOTIONS: MOTIONS, CORRIDORS: CORRIDORS, SMALL: SMALL, HEX: HEX,
    on: on, off: off, emit: emit, el: el, svg: svg, fmt: fmt,
    copy: window.DEM_COPY,
    maps: []
  };

  var stateNames = {};
  var byState = {};       // code -> [{ app, entry }]
  var appsById = {};

  function buildData() {
    var urls = window.DEM_APP_URLS || {};
    DEM.hasUrls = Object.keys(urls).some(function (k) { return !!urls[k]; });
    DEM.apps = (window.DEM_APPS || []).map(function (a) {
      var copy = Object.assign({}, a);
      copy.url = urls[a.id] || a.url || '';
      return copy;
    });
    window.DEM_US_TOPO.objects.states.geometries.forEach(function (g) {
      stateNames[FIPS[g.id]] = g.properties.name;
    });
    DEM.apps.forEach(function (app) {
      appsById[app.id] = app;
      app.states.forEach(function (entry) {
        (byState[entry.code] = byState[entry.code] || []).push({ app: app, entry: entry });
      });
    });
    DEM.stateNames = stateNames;
    DEM.coveredCodes = Object.keys(byState).sort(function (a, b) { return stateNames[a].localeCompare(stateNames[b]); });
  }

  function coverageOf(code) { return byState[code] || []; }
  function stateTier(code) {
    var list = coverageOf(code);
    if (!list.length) return null;
    return list.some(function (x) { return x.app.tier === 'siting'; }) ? 'siting' : 'hosting';
  }
  function statePartial(code) {
    var list = coverageOf(code);
    return list.length > 0 && list.every(function (x) { return x.entry.coverage === 'partial'; });
  }
  function relatedCodes(code) {
    var set = {};
    coverageOf(code).forEach(function (x) { x.app.states.forEach(function (s) { set[s.code] = true; }); });
    return Object.keys(set);
  }
  function coverageSummary() {
    var states = DEM.coveredCodes.filter(function (c) { return c !== 'DC'; }).length;
    var hasDC = DEM.coveredCodes.indexOf('DC') !== -1;
    var n = DEM.apps.length;
    return {
      apps: NUMBER_WORDS[n] || String(n),
      states: states + ' states' + (hasDC ? ' and the District of Columbia' : '')
    };
  }
  /* One line describing a state's coverage: "Hosting capacity" for a state's own map,
     "New England map, partial" for a regional one. */
  function coverageLine(code) {
    return coverageOf(code).map(function (x) {
      var name = x.app.name === stateNames[code] ? DEM.copy.tiers[x.app.tier] : x.app.name + ' map';
      return name + (x.entry.coverage === 'partial' ? ', partial' : '');
    }).join('; ');
  }
  DEM.coverageLine = coverageLine;
  DEM.coverageOf = coverageOf;
  DEM.stateTier = stateTier;
  DEM.statePartial = statePartial;
  DEM.relatedCodes = relatedCodes;
  DEM.app = function (id) { return appsById[id]; };

  /* ------------------------------------------------------------------ copy fill */

  /* Fill [data-copy="a.b.c"] with text from DEM_COPY. [data-copy="coverage.intro"] and
     [data-copy="coverage.asOf"] are formatted with live counts. */
  function fillCopy(root) {
    root = root || document;
    var vars = Object.assign(coverageSummary(), { asof: window.DEM_COVERAGE_ASOF || '' });
    root.querySelectorAll('[data-copy]').forEach(function (n) {
      var v = n.getAttribute('data-copy').split('.').reduce(function (o, k) { return o ? o[k] : undefined; }, DEM.copy);
      if (typeof v === 'string') n.textContent = fmt(v, vars);
    });
  }
  DEM.fillCopy = fillCopy;

  /* ------------------------------------------------------------------ motion state */

  var params = new URLSearchParams(location.search);
  var motion = params.get('v');
  if (!MOTIONS.some(function (m) { return m.id === motion; })) motion = 'energize';
  DEM.motion = motion;
  DEM.shot = params.get('shot') === '1';
  var rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  DEM.reducedMotion = rmQuery.matches;
  function syncRoot() {
    var r = document.documentElement;
    r.setAttribute('data-motion', DEM.motion);
    r.classList.toggle('dem-reduce', DEM.reducedMotion);
    if (DEM.shot) r.setAttribute('data-shot', '1');
  }
  syncRoot();
  if (rmQuery.addEventListener) {
    rmQuery.addEventListener('change', function (e) { DEM.reducedMotion = e.matches; syncRoot(); emit('reducedmotion', e.matches); });
  }

  /* ------------------------------------------------------------------ map */

  var mapCount = 0;
  var geo = null;

  function geoFeatures() {
    if (!geo) {
      var topo = window.DEM_US_TOPO;
      var fc = topojson.feature(topo, topo.objects.states);
      var path = d3.geoPath();
      geo = fc.features.map(function (f) {
        var code = FIPS[f.id];
        return { code: code, d: path(f), centroid: path.centroid(f), bounds: path.bounds(f) };
      });
      /* Nudge centroids that fall in water or off-shape so corridors land on land. */
      var nudge = { MI: [0, 22], FL: [18, 0], MD: [-12, -6], LA: [-10, 0], VA: [8, 0], NY: [10, 0] };
      geo.forEach(function (g) {
        var n = nudge[g.code];
        if (n) g.centroid = [g.centroid[0] + n[0], g.centroid[1] + n[1]];
      });
    }
    return geo;
  }

  function hexShapes() {
    var r = 43, w = Math.sqrt(3) * r;
    var gap = 2.2;
    /* Center the grid in the view from its actual tile extent. */
    var x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    Object.keys(HEX).forEach(function (code) {
      var x = HEX[code][0] * w + (HEX[code][1] % 2 ? w / 2 : 0);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, HEX[code][1] * 1.5 * r);
    });
    var ox = (VIEW_W - (x1 - x0)) / 2 - x0;
    var oy = (VIEW_H - y1) / 2;
    return Object.keys(HEX).map(function (code) {
      var c = HEX[code][0], row = HEX[code][1];
      var cx = ox + c * w + (row % 2 ? w / 2 : 0);
      var cy = oy + row * 1.5 * r;
      var pts = [];
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 180 * (60 * i - 90);
        pts.push([cx + (r - gap) * Math.cos(a), cy + (r - gap) * Math.sin(a)]);
      }
      return {
        code: code,
        d: 'M' + pts.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join('L') + 'Z',
        centroid: [cx, cy],
        bounds: [[cx - w / 2, cy - r], [cx + w / 2, cy + r]]
      };
    });
  }

  function hatchPattern(id, tier) {
    return svg('pattern', { id: id, class: 'dem-hatch dem-hatch-' + tier, patternUnits: 'userSpaceOnUse', width: 7, height: 7, patternTransform: 'rotate(45)' }, [
      svg('rect', { class: 'dem-hatch-bg', width: 7, height: 7 }),
      svg('line', { class: 'dem-hatch-line', x1: 0, y1: 0, x2: 0, y2: 7 })
    ]);
  }

  function mapLabel() {
    var s = coverageSummary();
    return 'Map of the United States. ' + fmt(DEM.copy.coverage.intro, s).split('.')[0] +
      '. Use the covered states list to choose a state with the keyboard.';
  }

  /*
    DEM.renderMap(container, options) -> map api
    options.form     'geo' (default) | 'hex'
    options.chips    callout chips for small states (geo only; default true)
    options.labels   state abbreviations on tiles (default: true for hex)
    options.tooltip  hover label (default true)
    options.interactive (default true)
  */
  function renderMap(container, options) {
    var o = Object.assign({ form: 'geo', chips: true, tooltip: true, interactive: true }, options || {});
    if (o.labels === undefined) o.labels = o.form === 'hex';
    var id = 'dem-map-' + (++mapCount);
    var shapes = o.form === 'hex' ? hexShapes() : geoFeatures();

    var wrap = el('div', { class: 'dem-map', 'data-form': o.form, id: id });
    var root = svg('svg', { class: 'dem-map-svg', viewBox: '0 0 ' + VIEW_W + ' ' + VIEW_H, role: 'img', 'aria-label': mapLabel(), preserveAspectRatio: 'xMidYMid meet' });
    var defs = svg('defs', null, [hatchPattern(id + '-hatch-siting', 'siting'), hatchPattern(id + '-hatch-hosting', 'hosting')]);
    var gStates = svg('g', { class: 'dem-states' });
    var gCorr = svg('g', { class: 'dem-corridors', 'aria-hidden': 'true' });
    var gPulse = svg('g', { class: 'dem-pulses', 'aria-hidden': 'true' });
    var gLabels = svg('g', { class: 'dem-labels', 'aria-hidden': 'true' });
    var gLeaders = svg('g', { class: 'dem-leaders', 'aria-hidden': 'true' });
    append(root, [defs, gStates, gCorr, gPulse, gLeaders, gLabels]);
    wrap.appendChild(root);

    var paths = {}, centroids = {}, bounds = {};
    shapes.forEach(function (s) {
      var tier = stateTier(s.code);
      var cls = ['dem-state'];
      if (tier) {
        cls.push('is-covered', 'tier-' + tier);
        if (statePartial(s.code)) cls.push('is-partial');
        var scales = {};
        coverageOf(s.code).forEach(function (x) {
          cls.push('app-' + x.app.id);
          x.app.scale.forEach(function (sc) { scales[sc] = true; });
        });
        Object.keys(scales).forEach(function (sc) { cls.push('scale-' + sc); });
      }
      var p = svg('path', { d: s.d, class: cls.join(' '), 'data-state': s.code });
      if (tier && statePartial(s.code)) p.style.setProperty('--dem-partial-fill', 'url(#' + id + '-hatch-' + tier + ')');
      gStates.appendChild(p);
      paths[s.code] = p;
      centroids[s.code] = s.centroid;
      bounds[s.code] = s.bounds;
      if (o.labels) {
        /* Labels carry the same state classes as their shape, so filter / scale / energize rules can recolor both. */
        gLabels.appendChild(svg('text', {
          class: cls.join(' ').replace('dem-state', 'dem-label'), 'data-state': s.code,
          x: s.centroid[0], y: s.centroid[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', text: s.code
        }));
      }
    });

    /* Callout chips for the small Northeast states. Desktop: a column right of the coast with leader
       lines. Phones: CSS turns the chip column into a row under the map and hides the leaders. */
    var chipWrap = null;
    if (o.form === 'geo' && o.chips) {
      chipWrap = el('div', { class: 'dem-chips', role: 'group', 'aria-label': 'Small states' });
      /* Chips sit as close to their state's latitude as a 30-unit spacing allows, so leaders do not cross. */
      var x0 = 912, yMin = 182, step = 30;
      var small = SMALL.filter(function (c) { return coverageOf(c).length; })
        .sort(function (a, b) { return centroids[a][1] - centroids[b][1]; });
      var ys = [];
      small.forEach(function (code, i) { ys.push(Math.max(centroids[code][1], i ? ys[i - 1] + step : yMin)); });
      var drift = ys.reduce(function (s, y, i) { return s + y - centroids[small[i]][1]; }, 0) / (ys.length || 1);
      var lift = Math.min(drift, ys.length ? ys[0] - yMin : 0);
      ys = ys.map(function (y) { return y - lift; });
      small.forEach(function (code, i) {
        var y = ys[i];
        var c = centroids[code];
        gLeaders.appendChild(svg('path', { class: 'dem-leader', 'data-state': code, d: 'M' + c[0].toFixed(1) + ',' + c[1].toFixed(1) + 'L' + (x0 - 6) + ',' + y }));
        gLeaders.appendChild(svg('circle', { class: 'dem-leader-dot', cx: c[0], cy: c[1], r: 1.8 }));
        var tier = stateTier(code);
        var chip = el('button', {
          type: 'button', class: 'dem-chip tier-' + tier + (statePartial(code) ? ' is-partial' : ''), 'data-state': code,
          'aria-label': stateNames[code] + ', ' + coverageOf(code).map(function (x) { return x.app.name; }).join(', '),
          style: '--x:' + (x0 / VIEW_W * 100).toFixed(3) + '%;--y:' + (y / VIEW_H * 100).toFixed(3) + '%'
        }, code);
        chipWrap.appendChild(chip);
      });
      wrap.appendChild(chipWrap);
    }

    var tip = null;
    if (o.tooltip) {
      tip = el('div', { class: 'dem-tip', 'aria-hidden': 'true', hidden: true });
      wrap.appendChild(tip);
    }

    container.appendChild(wrap);

    var api = {
      id: id, el: wrap, svg: root, form: o.form,
      layers: { defs: defs, states: gStates, corridors: gCorr, pulses: gPulse, labels: gLabels, leaders: gLeaders },
      paths: paths, centroids: centroids, bounds: bounds,
      chips: chipWrap,
      zoomTo: function (codes, ms) { return zoomTo(api, codes, ms); },
      energize: function (opts) { return energize(api, opts); },
      corridorPaths: function () { return corridorPaths(api); }
    };

    if (o.interactive) wireMap(api, tip);
    DEM.maps.push(api);
    applySelection();
    return api;
  }
  DEM.renderMap = renderMap;

  function wireMap(api, tip) {
    function codeFrom(t) { var n = t.closest && t.closest('[data-state]'); return n ? n.getAttribute('data-state') : null; }
    var wrap = api.el;
    wrap.addEventListener('pointerover', function (e) {
      var code = codeFrom(e.target);
      if (!code || !coverageOf(code).length) return;
      hoverState(code);
      if (tip && e.pointerType !== 'touch') {
        tip.innerHTML = '';
        append(tip, [el('strong', { text: stateNames[code] }), el('span', { text: coverageLine(code) })]);
        tip.hidden = false;
      }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!tip || tip.hidden) return;
      var r = wrap.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      var tx = x > r.width - 260 ? x - 14 - tip.offsetWidth : x + 14;
      tip.style.transform = 'translate(' + Math.round(tx) + 'px,' + Math.round(y + 14) + 'px)';
    });
    wrap.addEventListener('pointerout', function (e) {
      var code = codeFrom(e.target);
      var to = e.relatedTarget && codeFrom(e.relatedTarget);
      if (code && code !== to) { hoverState(null); if (tip) tip.hidden = true; }
    });
    wrap.addEventListener('click', function (e) {
      var code = codeFrom(e.target);
      if (code && coverageOf(code).length) selectState(code, e.target.closest('button') || null);
    });
  }

  /* ------------------------------------------------------------------ highlight + selection */

  var current = { hover: null, hoverApp: null, selected: null };

  function applySelection() {
    var related = {};
    if (current.hover) relatedCodes(current.hover).forEach(function (c) { related[c] = true; });
    if (current.hoverApp && appsById[current.hoverApp]) appsById[current.hoverApp].states.forEach(function (s) { related[s.code] = true; });
    DEM.maps.forEach(function (m) {
      m.el.classList.toggle('has-related', Object.keys(related).length > 0);
      Object.keys(m.paths).forEach(function (code) {
        var p = m.paths[code];
        p.classList.toggle('is-hover', code === current.hover);
        p.classList.toggle('is-related', !!related[code]);
        p.classList.toggle('is-selected', code === current.selected);
      });
      if (m.chips) m.chips.querySelectorAll('.dem-chip').forEach(function (c) {
        var code = c.getAttribute('data-state');
        c.classList.toggle('is-related', !!related[code]);
        c.classList.toggle('is-selected', code === current.selected);
      });
      m.layers.leaders.querySelectorAll('.dem-leader').forEach(function (l) {
        l.classList.toggle('is-related', !!related[l.getAttribute('data-state')]);
      });
    });
    document.querySelectorAll('.dem-entry').forEach(function (n) {
      var id = n.getAttribute('data-app');
      var hit = current.hoverApp === id || (current.hover && coverageOf(current.hover).some(function (x) { return x.app.id === id; }));
      n.classList.toggle('is-related', !!hit);
    });
  }
  function hoverState(code) { current.hover = code; applySelection(); emit('state:hover', code); }
  function hoverApp(id) { current.hoverApp = id; applySelection(); emit('app:hover', id); }
  DEM.hoverState = hoverState;
  DEM.hoverApp = hoverApp;

  /*
    Selecting a state always opens the panel (a side panel on desktop, a bottom sheet on phones), so the
    visitor sees the map, its coverage and utilities before choosing "Open <map>", which opens that app's
    sign-in page in a new tab (operator ruling, 2026-10-22).
  */
  function selectState(code, sourceEl) {
    var list = coverageOf(code);
    if (!list.length) return;
    current.selected = code;
    applySelection();
    emit('state:select', code);
    openPanel(code, sourceEl);
  }
  DEM.selectState = selectState;

  /* ------------------------------------------------------------------ panel / bottom sheet */

  var panel, panelBody, panelReturn = null;

  function buildPanel() {
    var c = DEM.copy.panel;
    panel = el('div', { class: 'dem-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'dem-panel-title', hidden: true });
    var close = el('button', { type: 'button', class: 'dem-panel-close', 'aria-label': c.close });
    close.appendChild(svg('svg', { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': 'true' }, [
      svg('path', { d: 'M3 3l10 10M13 3L3 13', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.75, 'stroke-linecap': 'round' })
    ]));
    close.addEventListener('click', closePanel);
    panelBody = el('div', { class: 'dem-panel-body' });
    append(panel, [el('div', { class: 'dem-panel-grip', 'aria-hidden': 'true' }), close, panelBody]);
    document.body.appendChild(panel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
    document.addEventListener('pointerdown', function (e) {
      if (panel.hidden) return;
      if (panel.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-state], .dem-find')) return;
      closePanel();
    });
  }

  function appAction(app) {
    var c = DEM.copy.panel;
    if (app.url) {
      return el('p', { class: 'dem-action-row' }, [
        el('a', { class: 'dem-action', href: app.url, target: '_blank', rel: 'noopener' }, [
          fmt(c.open, { name: app.name + ' map' }),
          el('span', { class: 'dem-sr', text: ' (opens in a new tab)' })
        ]),
        el('span', { class: 'dem-signin', text: c.opensToSignIn })
      ]);
    }
    return el('p', { class: 'dem-invite', text: c.invitation });
  }
  DEM.appAction = appAction;

  function openPanel(code, sourceEl) {
    var c = DEM.copy.panel;
    panelReturn = sourceEl || document.activeElement;
    panelBody.innerHTML = '';
    panelBody.appendChild(el('h2', { class: 'dem-panel-title', id: 'dem-panel-title', tabindex: '-1', text: stateNames[code] }));
    coverageOf(code).forEach(function (x) {
      var app = x.app;
      var others = app.states.filter(function (s) { return s.code !== code; });
      var sec = el('section', { class: 'dem-panel-app tier-' + app.tier, 'data-app': app.id }, [
        el('h3', { class: 'dem-panel-app-name', text: app.name }),
        el('p', { class: 'dem-badges' }, [
          el('span', { class: 'dem-badge dem-badge-tier tier-' + app.tier, text: DEM.copy.tiers[app.tier] }),
          el('span', { class: 'dem-badge dem-badge-coverage is-' + x.entry.coverage, text: DEM.copy.coverageWords[x.entry.coverage] })
        ]),
        el('p', { class: 'dem-panel-label', text: c.utilitiesLabel }),
        el('ul', { class: 'dem-panel-utils' }, x.entry.utilities.map(function (u) { return el('li', { text: u }); })),
        others.length ? el('p', { class: 'dem-panel-label', text: c.alsoCovers }) : null,
        others.length ? el('p', { class: 'dem-panel-others', text: joinList(others.map(function (s) { return stateNames[s.code] + (s.coverage === 'partial' ? ' (partial)' : ''); })) }) : null,
        appAction(app)
      ]);
      panelBody.appendChild(sec);
    });
    panel.hidden = false;
    panel.setAttribute('data-state', code);
    requestAnimationFrame(function () {
      panel.classList.add('is-open');
      panelBody.querySelector('.dem-panel-title').focus({ preventScroll: true });
    });
    emit('panel:open', code);
  }
  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.classList.remove('is-open');
    var done = function () { panel.hidden = true; };
    if (DEM.reducedMotion) done(); else setTimeout(done, 220);
    current.selected = null;
    applySelection();
    if (panelReturn && panelReturn.focus && document.contains(panelReturn)) panelReturn.focus({ preventScroll: true });
    emit('panel:close');
  }
  DEM.openPanel = openPanel;
  DEM.closePanel = closePanel;

  /* ------------------------------------------------------------------ list, find, legend, directory */

  function renderList(container) {
    var ul = el('ul', { class: 'dem-statelist' });
    DEM.coveredCodes.forEach(function (code) {
      var list = coverageOf(code);
      var b = el('button', { type: 'button', class: 'dem-statelist-btn tier-' + stateTier(code) + (statePartial(code) ? ' is-partial' : ''), 'data-state': code }, [
        el('span', { class: 'dem-statelist-name', text: stateNames[code] }),
        el('span', { class: 'dem-statelist-meta', text: coverageLine(code) })
      ]);
      b.addEventListener('click', function () { selectState(code, b); });
      b.addEventListener('pointerenter', function () { hoverState(code); });
      b.addEventListener('pointerleave', function () { hoverState(null); });
      b.addEventListener('focus', function () { hoverState(code); });
      b.addEventListener('blur', function () { hoverState(null); });
      ul.appendChild(el('li', null, b));
    });
    container.appendChild(ul);
    return ul;
  }
  DEM.renderList = renderList;

  /* The hero's working action: a native select, which is accessible and phone-friendly. */
  function renderFind(container) {
    var c = DEM.copy;
    var sel = el('select', { class: 'dem-find-select', id: 'dem-find-' + (++mapCount) });
    sel.appendChild(el('option', { value: '', text: c.findPlaceholder }));
    DEM.coveredCodes.forEach(function (code) {
      sel.appendChild(el('option', { value: code, text: stateNames[code] + ' - ' + coverageOf(code).map(function (x) { return x.app.name; }).join(', ') }));
    });
    sel.addEventListener('change', function () {
      if (sel.value) selectState(sel.value, sel);
    });
    var wrap = el('div', { class: 'dem-find' }, [el('label', { class: 'dem-find-label', for: sel.id, text: c.findLabel }), el('div', { class: 'dem-find-control' }, sel)]);
    container.appendChild(wrap);
    on('panel:close', function () { sel.value = ''; });
    return wrap;
  }
  DEM.renderFind = renderFind;

  function renderLegend(container) {
    var L = DEM.copy.legend;
    var ul = el('ul', { class: 'dem-legend' });
    ['siting', 'hosting', 'partial'].forEach(function (k) {
      ul.appendChild(el('li', { class: 'dem-legend-item is-' + k }, [
        el('span', { class: 'dem-swatch dem-swatch-' + k, 'aria-hidden': 'true' }),
        el('span', { class: 'dem-legend-text' }, [el('strong', { text: L[k].label }), ' ', el('span', { text: L[k].text })])
      ]));
    });
    container.appendChild(ul);
    return ul;
  }
  DEM.renderLegend = renderLegend;

  function renderDirectory(container) {
    var C = DEM.copy;
    var ul = el('ul', { class: 'dem-directory' });
    DEM.apps.forEach(function (app) {
      var utils = {};
      app.states.forEach(function (s) { s.utilities.forEach(function (u) { utils[u] = true; }); });
      var li = el('li', { class: 'dem-entry tier-' + app.tier, 'data-app': app.id, 'data-tier': app.tier }, [
        el('h3', { class: 'dem-entry-name', text: app.name }),
        el('p', { class: 'dem-entry-tier', text: C.tiers[app.tier] }),
        el('ul', { class: 'dem-entry-levels', 'aria-label': 'Grid levels' }, app.levels.map(function (lv) {
          return el('li', { class: 'dem-level dem-level-' + lv, text: C.levels[lv] });
        })),
        el('p', { class: 'dem-entry-states' }, app.states.map(function (s, i) {
          return el('span', { class: 'dem-entry-state is-' + s.coverage, 'data-state': s.code }, [
            stateNames[s.code], s.coverage === 'partial' ? ' (partial)' : '', i < app.states.length - 1 ? ', ' : ''
          ]);
        })),
        el('p', { class: 'dem-entry-utils', text: Object.keys(utils).join(', ') }),
        appAction(app)
      ]);
      li.addEventListener('pointerenter', function () { hoverApp(app.id); });
      li.addEventListener('pointerleave', function () { hoverApp(null); });
      li.addEventListener('focusin', function () { hoverApp(app.id); });
      li.addEventListener('focusout', function () { hoverApp(null); });
      ul.appendChild(li);
    });
    container.appendChild(ul);
    return ul;
  }
  DEM.renderDirectory = renderDirectory;

  /* ------------------------------------------------------------------ micro: tier filter + FLIP */

  function flip(nodes, mutate, ms) {
    if (DEM.reducedMotion || !nodes.length) { mutate(); return; }
    var first = new Map();
    nodes.forEach(function (n) { first.set(n, n.getBoundingClientRect()); });
    mutate();
    nodes.forEach(function (n) {
      if (n.hidden) return;
      var a = first.get(n), b = n.getBoundingClientRect();
      if (!a || (a.width === 0 && a.height === 0)) {
        n.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: ms || 320, easing: 'cubic-bezier(.16,1,.3,1)' });
        return;
      }
      var dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: ms || 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    });
  }
  DEM.flip = flip;

  function setFilter(tier) {
    var entries = Array.prototype.slice.call(document.querySelectorAll('.dem-entry'));
    flip(entries, function () {
      if (tier === 'all') document.documentElement.removeAttribute('data-filter');
      else document.documentElement.setAttribute('data-filter', tier);
      entries.forEach(function (n) { n.hidden = tier !== 'all' && n.getAttribute('data-tier') !== tier; });
    });
    document.querySelectorAll('.dem-filter-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === tier)); });
    emit('filter:change', tier);
  }
  DEM.setFilter = setFilter;

  function renderFilter(container) {
    var F = DEM.copy.filter;
    var group = el('div', { class: 'dem-filter', role: 'group', 'aria-label': F.label });
    ['all', 'siting', 'hosting'].forEach(function (k) {
      var b = el('button', { type: 'button', class: 'dem-filter-btn', 'data-filter': k, 'aria-pressed': String(k === 'all'), text: F[k] });
      b.addEventListener('click', function () { setFilter(k); });
      group.appendChild(b);
    });
    container.appendChild(group);
    return group;
  }
  DEM.renderFilter = renderFilter;

  /* ------------------------------------------------------------------ zoom: grid-level toggle */

  function setScale(scale) {
    document.documentElement.setAttribute('data-scale', scale);
    document.querySelectorAll('.dem-scale-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-scale') === scale)); });
    emit('scale:change', scale);
  }
  DEM.setScale = setScale;

  function renderScaleToggle(container) {
    var S = DEM.copy.scaleToggle;
    var group = el('div', { class: 'dem-scale', role: 'group', 'aria-label': S.label });
    ['large', 'small'].forEach(function (k) {
      var b = el('button', { type: 'button', class: 'dem-scale-btn', 'data-scale': k, 'aria-pressed': 'false' }, [
        el('span', { class: 'dem-scale-name', text: S[k] }),
        el('span', { class: 'dem-scale-desc', text: k === 'large' ? 'Large loads' : 'Small loads, under 25 MW' })
      ]);
      b.addEventListener('click', function () { setScale(k); });
      group.appendChild(b);
    });
    container.appendChild(group);
    if (!document.documentElement.getAttribute('data-scale')) setScale('large');
    else setScale(document.documentElement.getAttribute('data-scale'));
    return group;
  }
  DEM.renderScaleToggle = renderScaleToggle;

  /* Tween the map's viewBox to the bounds of the given state codes (null = whole country). */
  function zoomTo(api, codes, ms) {
    var target;
    if (!codes || !codes.length) target = [0, 0, VIEW_W, VIEW_H];
    else {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      codes.forEach(function (c) {
        var b = api.bounds[c]; if (!b) return;
        x0 = Math.min(x0, b[0][0]); y0 = Math.min(y0, b[0][1]); x1 = Math.max(x1, b[1][0]); y1 = Math.max(y1, b[1][1]);
      });
      var pad = 24, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
      var aspect = VIEW_W / VIEW_H;
      if (w / h > aspect) { var nh = w / aspect; y0 -= (nh - h) / 2; h = nh; } else { var nw = h * aspect; x0 -= (nw - w) / 2; w = nw; }
      target = [x0 - pad, y0 - pad, w, h];
    }
    api.el.classList.toggle('is-zoomed', !!(codes && codes.length));
    var from = api.svg.getAttribute('viewBox').split(/\s+/).map(Number);
    if (DEM.reducedMotion || !ms) { api.svg.setAttribute('viewBox', target.join(' ')); return Promise.resolve(); }
    return new Promise(function (resolve) {
      var t0 = performance.now();
      function frame(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        var e = 1 - Math.pow(1 - t, 4);
        api.svg.setAttribute('viewBox', from.map(function (f, i) { return (f + (target[i] - f) * e).toFixed(2); }).join(' '));
        if (t < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  /* ------------------------------------------------------------------ energize: corridors + pulses */

  function corridorPaths(api) {
    var line = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
    return CORRIDORS.map(function (codes) {
      var pts = codes.map(function (c) { return api.centroids[c]; }).filter(Boolean);
      return { codes: codes, points: pts, d: line(pts) };
    });
  }

  /*
    api.energize(options): draws the corridors and sends gold pulses west to east. A covered state
    gains .is-energized as a pulse reaches it. Starts when the map scrolls into view.
    options: speed (map units per second, default 520), pulse (length, default 90), loop (ms between
    repeat pulses after the first pass; 0 = none; default 5200), onEnergize(code)
  */
  function energize(api, options) {
    var o = Object.assign({ speed: 520, pulse: 90, loop: 5200, onEnergize: null }, options || {});
    var corridors = corridorPaths(api);
    /* Draw into an own sub-group so anything a direction put in the corridors layer survives. */
    var own = api.layers.corridors.querySelector('.dem-energize-corridors');
    if (own) own.remove();
    own = api.layers.corridors.appendChild(svg('g', { class: 'dem-energize-corridors' }));
    api.layers.pulses.querySelectorAll('.dem-pulse').forEach(function (n) { n.remove(); });
    var els = corridors.map(function (c) {
      return own.appendChild(svg('path', { class: 'dem-corridor', d: c.d }));
    });
    var inView = false;
    new IntersectionObserver(function (entries) { inView = entries[entries.length - 1].isIntersecting; }).observe(api.el);

    /* Arrival time (s) at each vertex; a corridor starts when an earlier one reaches its first state. */
    var arrival = {};
    var plans = corridors.map(function (c, i) {
      var start = arrival[c.codes[0]] !== undefined ? arrival[c.codes[0]] : 0;
      var total = els[i].getTotalLength();
      var seg = [0];
      for (var k = 1; k < c.points.length; k++) {
        seg.push(seg[k - 1] + Math.hypot(c.points[k][0] - c.points[k - 1][0], c.points[k][1] - c.points[k - 1][1]));
      }
      var chord = seg[seg.length - 1] || 1;
      var times = seg.map(function (s) { return start + (s / chord) * total / o.speed; });
      c.codes.forEach(function (code, k) { if (arrival[code] === undefined || times[k] < arrival[code]) arrival[code] = times[k]; });
      return { el: els[i], total: total, start: start, duration: total / o.speed };
    });

    function light(code) {
      var p = api.paths[code];
      if (!p || !p.classList.contains('is-covered') || p.classList.contains('is-energized')) return;
      p.classList.add('is-energized');
      if (o.onEnergize) o.onEnergize(code);
      emit('state:energized', { map: api, code: code });
    }

    function sendPulses(first) {
      plans.forEach(function (pl) {
        var dot = api.layers.pulses.appendChild(svg('path', { class: 'dem-pulse', d: pl.el.getAttribute('d') }));
        dot.style.strokeDasharray = o.pulse + ' ' + (pl.total + o.pulse);
        var anim = dot.animate([{ strokeDashoffset: o.pulse }, { strokeDashoffset: -pl.total }], {
          duration: pl.duration * 1000, delay: pl.start * 1000, easing: 'linear', fill: 'both'
        });
        anim.onfinish = function () { dot.remove(); };
      });
      if (first) {
        Object.keys(arrival).forEach(function (code) { setTimeout(function () { light(code); }, arrival[code] * 1000 + 60); });
      }
    }

    var timer = null;
    function run() {
      api.el.setAttribute('data-energize', 'running');
      if (DEM.reducedMotion) {
        Object.keys(api.paths).forEach(light);
        api.el.setAttribute('data-energize', 'done');
        return;
      }
      sendPulses(true);
      var last = Math.max.apply(null, Object.keys(arrival).map(function (k) { return arrival[k]; }));
      setTimeout(function () {
        Object.keys(api.paths).forEach(light);
        api.el.setAttribute('data-energize', 'done');
        if (o.loop) timer = setInterval(function () { if (inView && !document.hidden && !DEM.reducedMotion) sendPulses(false); }, o.loop);
      }, last * 1000 + 400);
    }

    api.el.setAttribute('data-energize', 'pending');
    if (DEM.reducedMotion) { run(); return { corridors: els, arrival: arrival, stop: function () {} }; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); }
    }, { threshold: 0.25 });
    io.observe(api.el);
    return { corridors: els, arrival: arrival, stop: function () { clearInterval(timer); } };
  }

  /* ------------------------------------------------------------------ story: scroll progress */

  function renderStorySteps(container) {
    var ol = el('ol', { class: 'dem-story-steps' });
    DEM.copy.story.forEach(function (s, i) {
      ol.appendChild(el('li', { class: 'dem-story-step', 'data-step': i, 'data-id': s.id }, [
        el('h3', { class: 'dem-story-title', text: s.title }),
        el('p', { class: 'dem-story-text', text: s.text })
      ]));
    });
    container.appendChild(ol);
    return ol;
  }
  DEM.renderStorySteps = renderStorySteps;

  /*
    DEM.scrollStory(section, onProgress): the section is a tall scroll track holding a sticky stage.
    Sets --story-p (0..1) and data-step on the section, toggles .is-active on .dem-story-step, and calls
    onProgress({ p, step, local, steps }) every frame the scroll position changes. With reduced motion
    the section gets .is-static and directions render all stops stacked, fully drawn.
  */
  function scrollStory(section, onProgress) {
    var steps = DEM.copy.story.length;
    var stepEls = section.querySelectorAll('.dem-story-step');
    var lastStep = -1, ticking = false;
    function measure() {
      ticking = false;
      var r = section.getBoundingClientRect();
      var track = section.offsetHeight - window.innerHeight;
      var p = track > 0 ? clamp(-r.top / track, 0, 1) : 1;
      var raw = p * steps;
      var step = Math.min(steps - 1, Math.floor(raw));
      var local = clamp(raw - step, 0, 1);
      section.style.setProperty('--story-p', p.toFixed(4));
      section.style.setProperty('--story-local', local.toFixed(4));
      if (step !== lastStep) {
        lastStep = step;
        section.setAttribute('data-step', step);
        stepEls.forEach(function (n, i) { n.classList.toggle('is-active', i === step); n.classList.toggle('is-past', i < step); });
        emit('story:step', step);
      }
      if (onProgress) onProgress({ p: p, step: step, local: local, steps: steps });
    }
    function request() { if (DEM.reducedMotion) return; if (!ticking) { ticking = true; requestAnimationFrame(measure); } }
    function setStatic() {
      section.classList.toggle('is-static', DEM.reducedMotion);
      if (DEM.reducedMotion) {
        section.style.setProperty('--story-p', '1');
        stepEls.forEach(function (n) { n.classList.add('is-active'); });
        if (onProgress) onProgress({ p: 1, step: steps - 1, local: 1, steps: steps, isStatic: true });
      } else request();
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    on('reducedmotion', setStatic);
    setStatic();
    return { refresh: request, steps: steps };
  }
  DEM.scrollStory = scrollStory;

  /* ------------------------------------------------------------------ dev switcher (options only) */

  /* ?review=1 (the management review site): no look/motion switcher, just a way back to the options page. */
  function buildReviewBack() {
    document.body.appendChild(el('nav', { class: 'dem-review-back', 'aria-label': 'Review' }, [
      el('a', { href: '../../review/round-1.html', text: 'Back to the options' })
    ]));
  }

  function buildSwitcher() {
    var look = document.documentElement.getAttribute('data-look') || '';
    var bar = el('nav', { class: 'dem-switcher', 'aria-label': 'Design options' });
    var looks = el('div', { class: 'dem-switcher-row' }, [el('span', { class: 'dem-switcher-label', text: 'Look' })]);
    LOOKS.forEach(function (L) {
      looks.appendChild(el('a', { href: '../' + L.id + '/index.html?v=' + DEM.motion, 'aria-current': L.id === look ? 'page' : null, text: L.name }));
    });
    var motions = el('div', { class: 'dem-switcher-row' }, [el('span', { class: 'dem-switcher-label', text: 'Motion' })]);
    MOTIONS.forEach(function (M) {
      motions.appendChild(el('a', { href: '?v=' + M.id, 'aria-current': M.id === DEM.motion ? 'true' : null, text: M.name }));
    });
    var board = el('a', { class: 'dem-switcher-board', href: '../index.html', text: 'All options' });
    append(bar, [looks, motions, board]);
    document.body.appendChild(bar);
  }

  /* ------------------------------------------------------------------ boot */

  function domReady() {
    return new Promise(function (res) {
      if (document.readyState !== 'loading') res(); else document.addEventListener('DOMContentLoaded', res, { once: true });
    });
  }
  function loadLocalUrls() {
    return new Promise(function (res) {
      if (window.DEM_APP_URLS) return res();
      var s = document.createElement('script');
      s.src = BASE + '../data/apps.local.js';
      s.onload = function () { res(); };
      s.onerror = function () { s.remove(); res(); };
      document.head.appendChild(s);
    });
  }

  var booted = null;
  DEM.ready = function (fn) {
    if (!booted) {
      booted = domReady().then(loadLocalUrls).then(function () {
        buildData();
        buildPanel();
        fillCopy(document);
        if (document.documentElement.getAttribute('data-look')) {
          if (params.get('review') === '1') buildReviewBack(); else buildSwitcher();
        }
        document.documentElement.classList.add('dem-ready');
      });
    }
    return booted.then(function () { if (fn) fn(DEM); });
  };
})();
