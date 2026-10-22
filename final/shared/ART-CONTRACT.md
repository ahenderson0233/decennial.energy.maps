# Artwork contract for the final landing page

The four final pages (`final/current`, `final/lifelike-3d`, `final/lifelike-illustrated`, `final/blueprint`) are identical except for their artwork: the hero campus and the story scene. Everything else (copy, boards, energize choreography, story controller, panel, coverage, directory, caps headings) lives in `final/shared/` and `options/shared/`. **Never edit the shared files from an artwork set.** Report problems instead.

## Files per set
- `index.html`: a copy of `final/current/index.html`. Change only the `data-art` attribute and the script and stylesheet lines specific to the set. An extra pinned library may be added before `art.js`, for example three.js at `https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js`.
- `art.js`: sets `window.DEM_ART = { id, hero, story }`. It must load **before** `../shared/page.js`.
- `art.css`: styles for the set's own artwork only, scoped under `html[data-art="<id>"]` or the set's own classes. It may restyle `.hero-campus` and `.story-scene` and what they contain. It must not restyle the boards, copy, panel or layout.

## Interface
```js
window.DEM_ART = {
  id: 'my-set',
  // container: #hero-campus (decorative, aria-hidden). Draw the campus scene into it.
  // Returns { run(onArrive) }. On load, page.js calls run(): animate current flowing from the
  // transmission lines through the substation to BOTH data centers, then call onArrive() exactly once,
  // which energizes the hero board. Under reduced motion (DEM.reducedMotion), show the finished,
  // energized state and call onArrive() immediately.
  hero: function (container) { return { run: function (onArrive) {} }; },

  // container: #story-scene (absolutely positioned, fills the story art column; decorative).
  // Returns { size(), update(q, isStatic) }.
  //  size(): re-measure the container (called on resize).
  //  update(q, isStatic): q runs 0..7 continuously with scroll. Stop i (0-based) is q in [i, i+1):
  //    0 Generation, 1 High-Voltage Transmission, 2 Transmission Substation,
  //    3 Hyperscale Data Center (branches off the transmission substation via its own HV tap),
  //    4 Distribution Feeder (steps down from the substation), 5 Data Center (smaller, under 25 MW, on the feeder),
  //    6 Every Covered State: pull back so the whole path reads small near the top of the art column;
  //      page.js raises the hex board into the lower ~64% of the column during this stop.
  //  Each stop: that stop's equipment appears or builds, and current (gold) advances along it. The camera or
  //  framing follows the active stop. isStatic === true (reduced motion): render the complete, energized
  //  scene, fitted to the container. The container is then position: relative and about 300-480px tall.
  story: function (container) { return { size: function () {}, update: function (q, isStatic) {} }; }
};
```

## Truth rules (binding, from CLAUDE.md and PRODUCT.md)
- Generic illustration only: no real project, site, company, logo, signage text, state or place.
- No figures or labels inside the art (no MW, kV or names). The step text in the page carries the words.
- The hyperscale campus is visibly large (several big halls). The smaller data center is visibly small (one modest building). The hyperscale campus branches off the transmission substation, before the feeder; the small one connects to the distribution feeder.
- Brand palette: ink `#312439`, aubergine `#43314d`, gold `#EBBE07` (current and energized only; never text on light), lilac `#efe8f4`, wash `#f7f5f9`. A life-like set may add natural material tones (concrete, galvanized steel, glass, grass, sky), kept muted so the page stays on brand.
- No raster images fetched from the web. Everything is authored: SVG, CSS, canvas or WebGL geometry. No other external resources beyond pinned CDN libraries.
- Performance: stop animation loops when offscreen or idle; a WebGL set must fall back gracefully if WebGL is unavailable (for example, a simplified SVG) and keep first paint fast.
