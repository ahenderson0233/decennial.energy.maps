# Blueprint to built: artwork plan

One idea carries the set: every structure is first a drawing, then the drawing becomes the asset. Current is
what turns plan into built. Nothing is energized until it is built, and nothing is built until current
reaches it, so the story reads as development: drafted, connected, constructed, live.

## Ground and palette

Deliberate choice: **graphite plum on drafting film**, inside the light page. No dark panel and no cyan
blueprint blue. An ink panel was considered; the hero board overlaps the bottom of the campus and the story
board rises over the scene at stop 7, so a dark rectangle behind either would fight the boards. The light
sheet keeps the page one surface. The "blue" of the blueprint becomes aubergine linework.

| Role | Name | Hex |
|---|---|---|
| Drafting ground (page sheet) | wash | `#f7f5f9` |
| Drafting grid, minor / major | film rule | `#ede6f2` / `#e0d6e8` |
| Plan object lines | graphite plum | `#7b678a` |
| Hidden lines, centerlines, dimensions | faint plum | `#a998b6` |
| Construction lines | trace | `#d3c7dd` |
| Built: roofs and lit tops | white | `#ffffff` |
| Built: lit walls | lilac | `#efe8f4` |
| Built: shade walls | heather | `#c6b5d3` |
| Built: slabs and pads | slab | `#e8e0ee` / `#d6cae0` / `#c2b1cf` |
| Built: machinery (transformer tanks, gensets, doors) | aubergine / ink | `#43314d` / `#312439` |
| Built edges | ink | `#312439` |
| Current and energized conductors only | gold | `#EBBE07` (cased in ink) |

Gold never appears as text and never as a fill on structures. Machinery is the darkest material, so the
gold conductors that land on transformer bushings read against ink.

## Line-weight hierarchy (screen pixels, held constant at every zoom)

Every stroke width is `n * var(--sw)`, where `--sw` is the inverse of the camera scale, so hairlines stay
hairlines while the camera moves. Dash lengths are rescaled the same way from script. On the stop 7
pull-back the multiplier eases down to about 0.6 so the small drawing does not thicken into a smudge.

| Line | Weight | Treatment |
|---|---|---|
| Live conductor | 1.25 gold in a 2.6 ink case | solid |
| Built object line (tower steel) | 0.9 ink | solid |
| Built face edge | 0.7 ink | solid |
| Plan object line | 0.7 graphite plum | draws on |
| Plan conductor (proposed line) | 0.6 faint plum | centerline dash-dot |
| Hidden edge | 0.6 faint plum | dashed 3 / 2.2 |
| Dimension line, extension lines | 0.5 faint plum | ticks at 1.1 graphite plum, slashed at 60 degrees, no numbers |
| Construction overshoot | 0.5 trace | lines run past the corners |
| Drafting grid | 1 device pixel film rule | non-scaling, faded at the column edges |

Plan extras are restrained to what a draftsman would add: dimensions on site pads only, a height
dimension on the large halls, hidden edges on solid volumes, construction overshoot on pads and buildings,
centerline axes on the plant stacks.

## Reveal grammar (the signature)

Each part of a stop is two layers in one group, in painter's order: **built** (filled faces, ink edges)
under **plan** (object lines, plus an extras layer for hidden lines, dimensions and construction).

1. **Draft.** Plan object lines draw on (stroke offset on a unit path length), staggered part by part in
   build order; hidden lines, dimensions and construction lines fade in behind them as each part
   completes. Proposed conductors appear as dash-dot centerlines.
2. **Connect.** Current advances along the stop's conductors. A conductor's built line appears just ahead
   of the current, the gold core follows, and the centerline dissolves.
3. **Build.** Each structure builds the moment current reaches it (found geometrically: the first point of
   any conductor inside the part's 3D bounds). Material rises from the ground: a clip wipe from the part's
   lowest screen point to its highest. Hidden lines and dimensions go first (the material now occludes
   them), the object lines hold until the material is up, then hand over to the ink edges.

Timing per story stop i (q is scroll position, 0..7): draft over q in [i - 0.06, i + 0.32], current over
[i + 0.25, i + 0.68], each build takes 0.13, so every stop is fully built by about i + 0.82, before the
camera moves on. Stop 1 arrives already drafted, so the first view of the story is a full blueprint of the
plant. Scrolling back un-builds, because everything is a pure function of q.

## Camera keyframes (story)

Each stop holds its framing and moves between stops across the step boundary, so the drafting happens
while the camera settles and the build happens while it is still. Transition i to i+1 over
q in [i + 0.88, i + 1.28], eased in and out, with scale interpolated geometrically.

| Stop | Focus (scene x, y, z) | Span across the art width (wide / phone) |
|---|---|---|
| 1 Generation | 110, -1200, 40 | 620 / 500 |
| 2 High-voltage transmission | 120, -610, 50 | 1180 / 760 |
| 3 Transmission substation | 136, 18, 26 | 560 / 450 |
| 4 Hyperscale data center | 880, -30, 30 | 1420 / 900 |
| 5 Distribution feeder | 130, 292, 26 | 580 / 460 |
| 6 Data center | 90, 500, 16 | 640 / 520 |
| 7 Every covered state | whole built path, centered at 17% of the column height, 30% tall | fit |

Phones get their own spans: the column is narrow but tall, so a fraction of the wide span left the stops
too small. On the pull-back the drafting film recedes: minor rules drop out, major rules lighten to 45%,
and the grid's fade follows the framing. Stop 7 moves over q in [5.8, 6.25] so the path is small and high before the
board finishes rising.

## Hero

The hero campus (one tower, the substation, the hyperscale branch, the feeder and the small data center)
drafts itself left to right in about 0.65 s, like a plotter pass. Current then enters from the off-sheet
conductors and runs the whole path in about 2.5 s; each structure builds as it arrives, and onArrive()
fires when current completes, as the last hall is going up. The sheet already carries a drafting grid,
so the hero adds none of its own.

## Reduced motion

Everything built and energized, fitted to the container, plan layers hidden.

## Review against generic defaults, and revisions

- **Cyan on blue "blueprint".** The obvious move; rejected. The drafting world is translated into brand:
  plum graphite on wash film.
- **Line draw-on everywhere.** The SVG stroke draw-on is the stock "technical" animation. Revised so the
  draw-on is short and quiet (a draft pass), and the signature is the build: material rising from the
  ground the moment current reaches it, causally tied to the gold.
- **Glow on the current.** Considered for "energized"; cut. Gold stays a flat, ink-cased conductor, the
  same language as the boards.
- **Dimension text and title-block costume.** No numbers, no labels, no sheet title block in the art: the
  truth rules forbid figures, and the page already has a title block. Dimensions stay as pure linework.
- **A scan line on the build wipe.** Tried in the plan as a leading edge; cut as glitch-like. The wipe edge
  is just the material's own edge.
- **Dark drafting panel.** Rejected for the reason above: the boards overlap the art.
