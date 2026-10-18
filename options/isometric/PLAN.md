# Isometric campus: design plan

Direction id `isometric`. The page is a set of engineering drawings: a light drawing sheet, isometric
line drawings in aubergine with three-tone face shading, gold only where current flows, and the national
hex map built as an extruded board on a plinth, seen from the same isometric camera as the campus.

## Palette (named)

| Name | Hex | Role |
|---|---|---|
| Sheet | `#f7f5f9` (wash) | page ground, the drawing paper |
| Top face | `#ffffff` | top planes of every solid, uncovered tile tops, the title block field |
| Lilac | `#efe8f4` | left faces, partial-hatch ground, quiet panels |
| Lilac shade | `#d9cce3` (derived) | right faces, rules on the sheet |
| Aubergine | `#43314d` | all linework, siting tiles, secondary text |
| Ink | `#312439` | type, conductor casing, footer band |
| Gold | `#EBBE07` | live conductors, current, energized tile rims, selection; text only on ink |

Derived map tones (lilac family, so the legend stays truthful):
- hosting tile top `#c7b5d6`, sides `#ad98bf` / `#9783aa` (literal lilac `#efe8f4` would vanish on a wash sheet,
  so hosting is translated one step darker inside the lilac family; the legend swatch uses the same tone);
- siting tile top `#43314d` aubergine, sides `#312439` / `#261b2d`;
- partial: hatched stripes of the tier tone over lilac; uncovered tiles are white tops with lilac sides,
  drawn as linework only, so "absent" reads as unbuilt ground, not as a color.

Contrast checks: ink on sheet 13.9:1; aubergine on sheet 11.3:1; muted text `#5f4f67` on sheet 6.7:1;
ink on hosting top 8:1; white on siting top 11.6:1; gold on ink 8.6:1. Gold never sets text on a light ground.
Focus ring is ink (2px, offset 3px) on the sheet and gold on the ink footer.

## Type (Work Sans only)

Scale on a 1.25 ratio from a 17px body; tabular numerals everywhere numbers appear.

| Role | Size | Weight / tracking |
|---|---|---|
| Display (headline) | clamp(3.25rem, 7.6vw, 7.25rem), line-height .92 | 300, -0.035em |
| Section heading h2 | clamp(2rem, 3.6vw, 3rem), 1.05 | 350, -0.02em |
| Step title / h3 | 1.3125rem, 1.25 | 600 |
| Body / lede | 1.0625rem / 1.1875rem lede, 1.55 | 400 |
| Callout and meta | .8125rem, 1.35 | 500, +0.01em |
| Wordmark DECENNIAL | .9375rem | 600, +0.24em (the one capitals run, the brand mark) |

Drawing callouts (part names on the art) are set like annotation on a plan: small, medium weight,
with a thin leader line to the part. Their words come from `copy.story[*].title`.

## Layout

Left-aligned throughout, on a 12-column grid inside a drawing-sheet frame (a 1px aubergine border inset
from the viewport, with tick marks at the column lines; no zone letters or numbers).

First viewport at 1440x900:
```
+-----------------------------------------------------------------------------------+
| DECENNIAL  Energy Maps                                Coverage   Large and small  |
|+---------------------------------------------------------------------------------+|
||                                                  HV lines enter from sheet edge ||
||  Megawatts                                   /  /                                ||
||  before acres.                          [ campus plate: dead-end gantry,        ||
||                                           transformers, feeder, data hall,     ||
||                                           rooftop units, generator yard ]      ||
||  +-- title block ----------------+                                             ||
||  | subhead (lede)                |        /\                                   ||
||  | Find your state  [ select v ] |      / hex board on a plinth,              ||
||  +-------------------------------+     /  covered tiles extruded  \           ||
++------------------------------------- board continues past the fold -----------++
```

Page:
```
header (wordmark + Energy Maps | Coverage, Large and small loads)
hero sheet: headline, title block (subhead + find), campus plate, board (living, clickable)
-- story (v=story only): sticky stage, drawing list of 6 steps left, assembling scene right,
   camera pulls back to the board at step 6
-- scales (all other motions): heading + intro, [grid level toggle: zoom only]
   two detail drawings side by side ("large" substation detail / "small" feeder detail), note
coverage: heading, intro, [filter: micro] [grid level toggle: zoom], legend as iso tile key,
   the board (full width), "Coverage as of", covered states index, every map as an equipment schedule
footer: ink band, DECENNIAL, internal line, year
```
Phone (390): header, headline, title block, campus plate scaled to width, board flattened below;
the schedule rows stack; story stage shows the active step over the art.

## Principles

1. One projection for everything. The campus and the board share the 30-degree isometric camera, so the
   page reads as one model seen from one point of view, never a picture pasted on a template.
2. Linework carries structure. Faces are shaded from the palette (top white, left lilac, right lilac shade)
   with one stroke weight (non-scaling), like a development rendering, not a 3D toy.
3. Gold means current. It appears only on live conductors, flowing current, and energized or selected tiles.
4. The working parts stay plainly working: the find control is a ruled title-block field, the board is
   clickable, the covered-state list is the keyboard path, the directory is a readable schedule.
5. The campus is generic. It never sits on a state tile, and nothing in it names a place or a figure.

## The four motions, in this world

- **story**: the campus assembles as the reader scrolls. Each step's parts drop into place along the
  vertical axis (plant, then lattice towers marching in, then the substation, the feeder poles, the data
  hall), and gold current runs along the conductors to the part being built. The camera tracks the build
  along the power path. At step 6 the camera pulls back and up: the campus shrinks to a model on its own
  pad and the national board rises underneath, tiles extruding as the scroll finishes. Reduced motion:
  all steps listed, the full scene drawn, the board shown below it with every tile raised.
- **energize**: in the first viewport, current enters the campus from the HV lines and runs through the
  substation and feeder to the hall; then the board energizes. Corridors are drawn as cased conductors
  across the tile tops, gold pulses run west to east, and each covered tile rises from the plinth with a
  gold rim as its pulse arrives. The coverage board repeats the same sequence when it scrolls into view.
- **zoom**: the grid level toggle moves the camera. Transmission is a high overview of the whole board
  (only large-load states raised); Distribution swings the camera low and close over the Northeast and
  Mid-Atlantic (map.zoomTo), hosting tiles rise while large-only tiles settle. The two detail drawings in
  the scales section trade emphasis: the active one's conductors go live (gold), the other goes dead.
- **micro**: the tier filter lifts matching tiles higher and drops the rest flat to the plinth, in a wave
  across the board; fills morph to the unbuilt white. The schedule rows FLIP into their new order.

Reduced motion everywhere: the boards flatten to a low, frontal tilt with tiles raised, every sequence
renders its end state, and no loop runs.

## Review against the brief: what I revised and why

- First draft put the copy left and the art right as two equal columns. That is the split-hero template.
  Revised: the hero is a drawing sheet. The copy lives in a ruled title block (the part of an engineering
  sheet that names the drawing), and the art runs past the fold, so the board's top edge is the thing the
  eye follows down. The world carries the layout instead of decorating a template.
- First draft used a tilted map with in-plane labels. Rotated and foreshortened text fails "labels readable".
  Revised: labels are upright billboards positioned from each tile's projected top face, so they stay
  horizontal at any camera angle and ride up with the tile.
- First draft drew a dashed projection line from the campus pad down to the board (exploded axonometric).
  That would land on specific states and imply a real project. Revised: the campus sits on its own pad
  behind the board, connected only by timing in the energize sequence, never by a wire to a state.
- Directory as a grid of identical cards was the default. Revised: an equipment schedule (rows and columns,
  the way drawing sets list equipment), which is also the honest shape for eight comparable records.
- Literal lilac `#efe8f4` for hosting tiles would disappear on the wash sheet. Translated to `#c7b5d6`
  inside the lilac family, and the legend swatch uses the same tone.
- Gold focus ring on a light sheet fails non-text contrast. Revised to an ink ring; gold stays for current.
- A gold ambient loop on the hero would be decoration in three of four motions. Revised: the hero is still
  except in energize, where it is the motion; repeat pulses on the coverage board pause offscreen.
