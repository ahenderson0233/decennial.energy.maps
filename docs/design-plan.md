# Artwork set: lifelike-3d (real-time three.js)

The power path built as a small, believable landscape model: procedural equipment at real proportions,
lit by a soft sun, sitting on a ground "island" that dissolves into the light drawing sheet. Gold is the
only saturated color, and it only appears where current flows.

## Subject and job
- Subject: the physical grid between a gas plant and two data centers. The visitor should recognize the
  objects (a lattice tower, a transformer with radiators, a long data hall with rooftop units) without labels.
- Job: carry the seven-stop story and the hero arrival. The page around it stays the isometric sheet.

## Palette (sRGB hex; muted, cool, tinted toward the brand)
| Role | Name | Hex |
| --- | --- | --- |
| Current (only accent) | gold | `#EBBE07` |
| Current head (hot core) | gold light | `#FFE98A` |
| Fog, sky, far ground | wash | `#f7f5f9` |
| Hemisphere sky / env top | lilac | `#efe8f4` |
| Hemisphere ground / shadow tint | aubergine | `#43314d` |
| Dead conductors, insulators | ink | `#312439` |
| Field (base) | sage field | `#c4c5b2` |
| Field patches | fallow / meadow | `#cdcabb` `#b9bda7` `#c9c9b6` |
| Tree canopy | olive shade | `#8b927a` |
| Gravel yard | gravel | `#d2cec8` |
| Concrete pads | concrete | `#dcd9d4` |
| Asphalt | asphalt | `#8e8993` |
| Precast halls, roofs | panel / membrane | `#e9e6ec` / `#dcd8e0` |
| Plant cladding, boiler casing | cladding / casing | `#cbc6d1` / `#a8a2af` |
| Galvanized steel | steel | `#a9acb1` |
| Transformer tanks | ANSI gray | `#8c8f96` |
| Wood poles | creosote | `#6e5a48` |
| Glazing | glass | `#5d5466` |

Everything except gold sits between ink and wash, or is a natural tone pulled toward gray. Shadows take the
aubergine tint from the hemisphere and environment light, so they read as brand shade, not black.

## Light and atmosphere
- Sun: one DirectionalLight from the west-southwest at about 50 degrees, warm-neutral `#fff7ec`; it casts
  PCF-soft shadows. The shadow frustum follows the camera target and scales with the framing, so a 2048 map
  (1024 on phones) stays sharp at every stop. Shadow maps re-render only when the camera or a part moves.
- Fill: a PMREM environment baked once from a tiny gradient sphere (lilac above, aubergine below) plus a weak
  hemisphere light. Metals pick up a soft lilac sheen instead of going black.
- ACES filmic tone mapping for the scene; the conductor shader writes sRGB directly and skips tone mapping, so
  the gold is the brand gold, not a filmic orange.
- Fog toward wash, near and far scaled to the camera distance. The ground plane fades to full transparency
  with distance from the camera target, so there is no box and no horizon line: the model sits on the sheet.

## Type
None in the artwork (contract). The page's Work Sans carries all words.

## Wireframes
Hero (desktop, art column 5-12; the board overlaps the bottom ~80px):
```
+--------------------------------------------------+
|   tower . tower .                                |  lines enter from the top-left edge, fading in haze
|              \   [substation]==tap==[switchyard] |
|               \       |              [hall      ]|  hyperscale campus fills the right third
|           feeder poles             [hall        ]|
|              [small dc]          [hall          ]|
|            (ground dissolves into the sheet)     |
+--------------------------------------------------+
```
Story (sticky art column): the subject of each stop centered, the scene filling the column; stop 7 pulls high
so the whole path sits in the top ~35% while page.js raises the hex board below.

## Camera path (target, distance from a fit radius, azimuth from the south toward the east, elevation)
| Stop | Framing | Az | El |
| --- | --- | --- | --- |
| 1 Generation | plant close, stacks and turbine hall | 38 | 22 |
| 2 Transmission | low, looking up the corridor so towers recede into haze | 18 | 12 |
| 3 Transmission substation | over the yard, gantry to transformers | 48 | 32 |
| 4 Hyperscale | wider, tap leaving the yard and the three halls | 32 | 28 |
| 5 Feeder | low beside the pole line | 62 | 16 |
| 6 Data center | close on the small building and the pole-top transformer | 44 | 22 |
| 7 Every covered state | high overview, whole path small, pinned near the top | 30 | 50 |

Between stops: targets interpolate linearly, angles linearly, distance geometrically, eased in-out over the
second half of the previous stop and the first half of the next (same timing as the reference). The vertical
framing uses a projection view offset, so stop 7 can sit high without tilting the camera.

## Motion grammar
- Build: each stop's parts grow up out of the ground (vertical scale from the base, cubic ease-out), staggered
  in path order across the stop's opening. Conductors are strung after their supports: a stringing front
  runs along each span, the same coordinate the current uses.
- Current: a shader on the conductors. Behind the front: brand gold, slightly wider than a dead conductor;
  at the front a brighter, wider comet head that tapers back over ~20 m. Behind it, faint dashes travel along
  the line while the scene is active, then settle to steady gold after a few idle seconds.
- Story: current advances from one stop's milestone to the next across each stop (sequential path order).
- Hero: the current runs along the network as a tree, so it splits at the substation and reaches both data
  centers in about 2.5 s; then onArrive() fires once.
- Reduced motion: no camera travel, no stringing, no shimmer. Everything built, fully energized, fitted.

## Equipment (generic, no text, no logos)
- Gas plant (2x1 combined cycle): turbine hall with clerestory, two gas-turbine inlet houses, two heat
  recovery boilers with stiffener ribs and drums, two exhaust stacks with platforms, an air-cooled condenser
  on columns with fan rings, two tanks, two step-up transformers, a switchyard dead-end gantry.
- Transmission: five lattice towers (tapered legs, girts, X bracing, two crossarm levels, insulator strings)
  and three-phase catenary spans.
- Transmission substation: fenced gravel yard, incoming gantry, disconnect switches, dead-tank breakers, rigid
  tubular bus on post insulators, two power transformers (tank, radiator banks, conservator, bushings),
  metal-clad switchgear, control house, an east gantry for the hyperscale tap.
- Hyperscale: two steel monopoles with davit arms, a fenced campus switchyard with gantry and two
  transformers, three 240 m halls with rooftop units and parapets, an office block, a generator yard.
- Feeder: underground exit to a riser pole, wood poles with crossarms and pin insulators, a pole-top
  transformer on the last pole.
- Small data center: one 48 m building with a few rooftop units, two generators, a small lot, a service drop.
- Landscape: field patches, county roads, woodlots and hedgerows (instanced), all kept out of the sites.

## Performance plan
- One WebGLRenderer per canvas (hero, story). DPR capped at 2. Transparent canvas, antialias on.
- Render on demand: a frame is drawn when q changes, during the hero run, during resize, and while the flow
  shimmer runs (throttled to ~30 fps, stops after idle). IntersectionObserver stops everything offscreen.
- The story world is built lazily when the story section approaches the viewport, keeping first paint fast.
- Geometry merged per part per material (vertex colors), one shared tower geometry reused by every tower,
  trees as two InstancedMeshes, all conductors in a single mesh with one shader.
- Shadow map updates only when the camera or a part moves, not on shimmer frames.

## Fallback
No WebGL or no THREE: draw the reference isometric scene with window.ISOKIT (shared kit), same interface.

## Review against generic defaults (revisions)
- First instinct was a dark, cinematic night render with bloom: the stock "3D energy" look, and a hard dark box
  on a light sheet. Revised to a daylight model on a transparent canvas that fades into the page, so the
  page's isometric sheet stays the ground and gold remains the single accent.
- First instinct for the current was particles or glowing tubes with additive bloom. On a light page additive
  glow washes to white. Revised to crisp, screen-width-aware gold conductors with a tapered comet head, which
  matches the line-drawing voice of the rest of the page.
- A sky gradient behind the scene was dropped: the fog color is the page wash, so distance resolves into the
  sheet itself.
- Grass green was pulled toward gray-sage so the ground does not fight the lilac page or the gold.

> Update (operator ruling): the story now ends at stop 6, the Edge-Computing Data Center. The seventh stop and the board that rose at the end of the story were removed. References to stop 7 below are historical.
