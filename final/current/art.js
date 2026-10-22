/*
  Artwork set 1, "Current": the isometric line drawings as reviewed in options C and D, extended with the
  hyperscale campus that branches off the transmission substation. Implements window.DEM_ART.
*/
(function () {
  'use strict';
  var K = window.ISOKIT;
  var P = K.P, clamp = K.clamp, lerp = K.lerp, smooth = K.smooth, easeOut = K.easeOut, easeInOut = K.easeInOut, r1 = K.r1;
  function reduced() { return !!(window.DEM && DEM.reducedMotion); }

  /* ---------------------------------------------------------------- hero */

  function hero(container) {
    var svg = K.newSvg(container, 'campus-svg');
    var k = new K.Kit(svg);
    K.buildScene(k, { plant: false, from: 4 });
    var cur = new K.Current(k);
    var e = k.ext;
    svg.setAttribute('viewBox', [r1(e[0] - 8), r1(e[1] - 6), r1(e[2] - e[0] + 14), r1(e[3] - e[1] + 14)].join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMaxYMid meet');
    K.fitStroke(svg, cur);
    cur.set(Infinity);
    return {
      run: function (onArrive) {
        if (reduced()) { cur.set(Infinity); onArrive(); return; }
        cur.set(0);
        var ms = 2600, t0 = 0;
        function frame(now) {
          if (!t0) t0 = now;
          var t = clamp((now - t0) / ms, 0, 1);
          cur.set(cur.total * (t < 1 ? 0.03 + 0.97 * easeInOut(t) : 1));
          if (t < 1) requestAnimationFrame(frame);
          else { cur.set(Infinity); onArrive(); }
        }
        setTimeout(function () { requestAnimationFrame(frame); }, 350);
      }
    };
  }

  /* ---------------------------------------------------------------- story */

  function story(host) {
    var svg = K.newSvg(host, 'story-svg');
    var kit = new K.Kit(svg);
    K.buildScene(kit, { plant: true, from: 0 });
    var current = new K.Current(kit);
    var marks = K.milestones(current);
    var e = kit.ext;
    var box = { x: e[0], y: e[1], w: e[2] - e[0], h: e[3] - e[1] };
    /* Camera per drawn stop: a focus point and how many scene units span the art width; the last stop fits all. */
    var keys = [
      { f: P(110, -1200, 40), span: 620 },
      { f: P(120, -610, 50), span: 1180 },
      { f: P(136, 18, 26), span: 560 },
      { f: P(880, -30, 30), span: 1420 },
      { f: P(130, 292, 26), span: 580 },
      { f: P(90, 500, 16), span: 640 },
      null
    ];
    var W = 1, H = 1, isStatic = false;

    function size() {
      var r = host.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      svg.setAttribute('viewBox', '0 0 ' + r1(W) + ' ' + r1(H));
    }
    function camAt(q) {
      var wide = W > 640;
      var fit = { f: [box.x + box.w / 2, box.y + box.h / 2], s: Math.min(W * 0.9 / box.w, H * (isStatic ? 0.94 : 0.3) / box.h), vy: isStatic ? 0.5 : (wide ? 0.17 : 0.16) };
      if (isStatic) return fit;
      var ks = keys.map(function (k) { return k ? { f: k.f, s: W / (wide ? k.span : k.span * 0.82), vy: 0.5 } : fit; });
      var x = clamp(q - 0.5, 0, ks.length - 1);
      var i = Math.min(ks.length - 2, Math.floor(x)), t = easeInOut(x - i);
      var a = ks[i], b = ks[i + 1];
      /* Interpolate scale geometrically so the pull-back reads as distance, not a linear shrink. */
      var s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), t));
      return { f: [lerp(a.f[0], b.f[0], t), lerp(a.f[1], b.f[1], t)], s: s, vy: lerp(a.vy, b.vy, t) };
    }
    function update(q, stat) {
      isStatic = !!stat;
      var cam = camAt(q);
      kit.root.setAttribute('transform', 'translate(' + r1(W / 2) + ' ' + r1(H * cam.vy) + ') scale(' + cam.s.toFixed(4) + ') translate(' + r1(-cam.f[0]) + ' ' + r1(-cam.f[1]) + ')');
      var sw = Math.max(0.6, Math.min(2.4, 1 / cam.s));
      svg.style.setProperty('--sw', sw.toFixed(3));
      current.sw = sw;

      /* Assembly: each stop's parts drop into place, staggered, during the stop's opening. */
      kit.groups.forEach(function (g, gi) {
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

      /* Current: from the previous milestone to this stop's milestone across the stop. */
      var len, drawn = marks.length;
      if (isStatic) len = Infinity;
      else {
        var st = Math.floor(clamp(q, 0, drawn + 0.999));
        if (st >= drawn) len = Infinity;
        else {
          var from = st === 0 ? 0 : marks[st - 1], to = marks[st];
          len = lerp(from, to, smooth((q - st - 0.1) / 0.8));
        }
      }
      current.set(len);
    }
    size();
    return { size: size, update: update };
  }

  window.DEM_ART = { id: 'current', hero: hero, story: story };
})();
