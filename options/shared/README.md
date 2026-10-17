# options/shared: the core every design option builds on

The core owns **facts and behavior**; a direction owns **the look**. Every option renders the same content from the same files, so the operator compares visuals and motion, not words or data. Do not edit files in `shared/` from a direction; report core bugs instead. `reference.html` is the unstyled wiring example. Open it to see every feature working.

## Files
| File | What it is |
|---|---|
| `apps.js` | `window.DEM_APPS`: coverage inventory (no URLs, ever) |
| `apps.local.example.js` | template for gitignored `apps.local.js` (`window.DEM_APP_URLS`) |
| `copy.js` | `window.DEM_COPY`: the one shared copy set |
| `us-states-albers.js` | `window.DEM_US_TOPO`: us-atlas 3.0.1 states, pre-projected, 975x610 |
| `core.js` | `window.DEM`: maps, panel, list, directory, find control, motion engines |
| `core.css` | structural CSS themed by custom properties |
| `favicon.svg` | gold-on-ink "D" set in type |

## Page head (copy exactly; paths are relative to `options/<direction>/`)
```html
<html lang="en" data-look="<direction-id>">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="../shared/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300..700&display=swap">
<link rel="stylesheet" href="../shared/core.css">
<link rel="stylesheet" href="style.css">
...
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js"></script>
<script src="../shared/us-states-albers.js"></script>
<script src="../shared/apps.js"></script>
<script src="../shared/copy.js"></script>
<script src="../shared/core.js"></script>
<script src="world.js"></script>
```
`data-look` turns on the dev switcher (look x motion links; hidden with `?shot=1`).

## Copy
Put `data-copy="path.in.copy"` on any element and the core fills its text (`headline`, `subhead`, `nav.coverage`, `coverage.intro`, `scales.large.text`, `footer.internal`...). `coverage.intro` and `coverage.asOf` are formatted with live counts. Never hard-code copy that exists in `copy.js`; never add claims, figures, or names that are not in `copy.js` / `apps.js`. Small structural words (a nav label, an aria-label) are fine.

## Motion
`DEM.motion` is `story | energize | zoom | micro` from `?v=` (default `energize`). `<html data-motion>` is set for CSS. Elements with `data-dem-only="zoom"` show only in that motion; `data-dem-hide="story"` hides in that motion. `DEM.reducedMotion` and `html.dem-reduce` reflect the user setting; every motion must have a complete static presentation.

## API (call inside `DEM.ready(function (DEM) { ... })`)
- `DEM.renderMap(container, { form: 'geo'|'hex', chips, labels, tooltip })` returns `map`:
  - `map.el` (`.dem-map`), `map.svg`, `map.paths[code]`, `map.centroids[code]`, `map.bounds[code]`
  - `map.layers.{defs, states, corridors, pulses, labels, leaders}` (SVG groups you may draw into)
  - `map.energize({ speed, pulse, loop, onEnergize })`: corridors and pulses run west to east; covered states gain `.is-energized`; `map.el[data-energize] = pending|running|done`
  - `map.zoomTo(codes|null, ms)` tweens the viewBox
  - `map.corridorPaths()` returns `[{ codes, points, d }]`
  - State path classes: `dem-state`, `is-covered`, `tier-siting|tier-hosting`, `is-partial`, `scale-large`, `scale-small`, `app-<id>`, and dynamic `is-hover`, `is-related`, `is-selected`, `is-energized`. Hex labels carry the same classes as `.dem-label`.
  - Geo maps add `.dem-chips > .dem-chip[data-state]` (callouts for small states; a row under the map when the map is narrower than 760px) and `.dem-leader` lines.
- `DEM.renderFind(container)`: the hero's working action ("Find your state" select).
- `DEM.renderLegend(container)`, `DEM.renderList(container)` (accessible covered-state list = keyboard path to the map), `DEM.renderDirectory(container)` (`.dem-entry` per app, `data-tier`).
- `DEM.renderFilter(container)` (micro) sets `html[data-filter]` and FLIPs directory entries; `DEM.renderScaleToggle(container)` (zoom) sets `html[data-scale=large|small]`.
- `DEM.renderStorySteps(container)` builds an `ol.dem-story-steps` (it IS a sequence). `DEM.scrollStory(section, cb)`: the section `.dem-story` is a tall track holding a sticky `.dem-story-stage`; cb gets `{ p, step, local, steps, isStatic }`; the section gets `--story-p`, `--story-local`, `data-step`, `.is-static` under reduced motion.
- `DEM.selectState(code)`, `DEM.hoverState(code)`, `DEM.hoverApp(id)`, `DEM.setFilter(t)`, `DEM.setScale(s)`, `DEM.flip(nodes, mutate)`.
- Events: `DEM.on('state:hover'|'state:select'|'app:hover'|'panel:open'|'panel:close'|'filter:change'|'scale:change'|'story:step'|'state:energized'|'reducedmotion', fn)`.
- Data: `DEM.apps`, `DEM.coveredCodes`, `DEM.stateNames`, `DEM.coverageOf(code)`, `DEM.coverageLine(code)`, `DEM.stateTier(code)`, `DEM.statePartial(code)`, `DEM.copy`.

## Theming hooks (custom properties; define on `:root`)
Map: `--map-land --map-land-stroke --map-siting --map-hosting --map-partial-bg --map-dim --map-related-stroke --map-selected-stroke --map-corridor --map-pulse --map-label --map-label-covered --map-label-partial --map-leader`. Chips: `--chip-bg --chip-text --chip-border --chip-radius`. Panel: `--panel-bg --panel-text --panel-muted --panel-rule --panel-shadow`. Also `--dem-font --dem-focus`. Restyle any `.dem-*` class freely; keep the behavior.

## Behavior the core guarantees (do not re-implement)
Clicking a covered state: a single-state app with a live URL opens in a new tab; otherwise the panel opens (side panel desktop, bottom sheet under 720px) listing the app(s), tier, coverage, utilities in that state, other states the map covers, and "Access by invitation" or "Open <name> map / Opens to sign-in". Escape and the close button close it and return focus. Hovering a state highlights every state of the same map(s).
