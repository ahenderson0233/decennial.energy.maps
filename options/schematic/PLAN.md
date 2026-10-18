# Schematic: plan

Direction id `schematic`. The page is drawn as an electrical one-line (single-line) diagram on a white drawing sheet.
A heavy main bus runs down the left of the page as its spine, sourced by a generator symbol beside the wordmark and ending in a ground symbol at the title block.
Every section is a feeder tapped off that bus through a circuit breaker, and its heading is the feeder label.
The coverage map is geographic and drawn in the same line weights.

## Palette

| Name | Hex | Role |
|---|---|---|
| Sheet | `#ffffff` | the drawing sheet; every surface the reader reads on |
| Wash | `#f7f5f9` | the surround outside the sheet frame; quiet fills (hover rows, panel badges) |
| Ink | `#312439` | type, the main bus, heavy linework, closed breakers |
| Aubergine | `#43314d` | device outlines, conductors, parcel-level siting fill |
| Lilac fill | `#c6b3d8` | hosting-capacity fill (a deepened tint of lilac `#efe8f4`, see translation below) |
| Gold | `#EBBE07` | energized conductors (a gold core inside an ink casing), closed-and-energized breaker fills, pulses. Never text. |

Derived, not headline colors: annotation text `#5f5168` (6.9:1 on white), fine rule `#b9adc2` (map land outlines, drawing hairlines), hatch line `#9e88b5`.

**Translation of the map semantics.** Siting stays aubergine. Hosting capacity at brand lilac `#efe8f4` is 1.1:1 against a white sheet, so it would vanish next to uncovered land. On this ground hosting is drawn in a deepened lilac `#c6b3d8` with an aubergine outline, and uncovered land is the bare sheet with a fine outline, which is how a drawing shows "not in scope". Partial is the hosting hatch (`#9e88b5` lines on white). The legend swatches use exactly these fills, so the legend stays truthful.

## Type (Work Sans only, 300..700)

| Role | Size / leading / weight / tracking |
|---|---|
| Headline (display) | `clamp(3rem, 1.4rem + 5.2vw, 6rem)` / .94 / 600 / -0.03em |
| Feeder label (h2) | `clamp(1.875rem, 1.35rem + 1.6vw, 2.75rem)` / 1.05 / 600 / -0.015em |
| Device label (h3) | `1.375rem` / 1.2 / 600 |
| Lede | `clamp(1.125rem, 1rem + .4vw, 1.3125rem)` / 1.5 / 400 |
| Body | `1.0625rem` / 1.6 / 400, measure under 68ch |
| Annotation | `.8125rem` / 1.3 / 500 / +0.01em, tabular numerals |
| Wordmark | `1.125rem` / 600 / 0.2em, set in capitals (the one exception) |

Steps run roughly a fourth apart (17, 22, 44, 96 at desktop). Weight carries hierarchy: 600 for anything that names a thing, 400 for prose, 500 for drawing annotations.

## Line-weight hierarchy (the world)

| Weight | Use |
|---|---|
| 7px ink with a 2px gold core | main bus (the page spine) and the sub-bus under the directory |
| 4px | transmission conductors, heavy taps |
| 2.5px | distribution feeders, section taps |
| 2px | device outlines: breakers, transformers, generator, switches |
| 1px | annotation leaders, balloon circles, map land outlines (non-scaling) |
| 1px dashed | out-of-service or filtered-out circuits |

Device symbols (authored SVG, one stroke system): breaker = square on the line (open hollow, closed ink, energized gold fill); disconnect = pivoting blade; two-winding transformer = two interlocked circles; generator = circle with a sine; load = arrow; ground = three diminishing bars; callout balloon = numbered circle (story only).

## Wireframes

First viewport, 1440x900:
```
+- wash surround -------------------------------------------------------------------------+
| +- sheet frame (1.5px aubergine, zone ticks) ------------------------------------------+ |
| | (~)  DECENNIAL | Energy Maps                          Coverage   Large and small loads| |
| |  #                                                                                    | |
| |  #==[#]======================================+                                        | |
| |  #                                           |                                        | |
| |  #   Megawatts                               8  transformer                           | |
| |  #   before acres.                           |   +-------------------------------+    | |
| |  #                                           +---+  key plan: geographic US map  |    | |
| |  #   subhead, three lines, 52ch                  |  (covered states filled,      |    | |
| |  #                                               |   clickable)                  |    | |
| |  #   Find your state                             +-------------------------------+    | |
| |  #   [ Choose a covered state            v ]      [] siting  [] hosting  [/] partial  | |
| |  #                                                                                    | |
| |  #==[#]== Large loads and small loads   (next feeder starts at the fold)              | |
```
The hero feeder leaves the bus through a breaker, runs above the headline, drops through a transformer in the gutter and enters the key plan at California's latitude, where the map's own corridors begin. Phones: the same feeder leaves the bus straight into the key plan, which sits under the find control at the fold.

Page:
```
 (~) header
  #
  #==[#]== hero feeder ----------> key plan
  #
  #==[#]== Large loads and small loads          (story motion: the power-path track replaces this)
  #        intro
  #        [transfer switch: Transmission / Distribution]         (zoom only)
  #==[#]====sub-bus========================================
  #        |  Transmission: large loads   |  Distribution: small loads under 25 MW
  #        [#] heavy drop                  8  transformer, [#] feeder
  #        |  Large loads connect...      |  Small loads connect...
  #        v  load                        v  load
  #        note
  #
  #==[#]== Where the maps reach
  #        intro, legend, [switches: all / siting / hosting] (micro), [transfer switch] (zoom)
  #==[#]===> +--------------- map frame, geographic, chips at right ----------------+
  #          +--------------------------------------------------------------------+
  #        Coverage as of ...
  #        Covered states: four-column list of state buttons, each with its tier swatch
  #        Every map: a switchboard, a sub-bus with one breaker per app; rows read as a schedule
  #
  #
 _|_ ground                                  +-- title block: wordmark | internal | year --+
```
Alignment: everything text is flush left on one content edge that sits a fixed tap length right of the bus. Taps are all the same length so every label starts on the same vertical. The title block is the one right-aligned element, as on a real sheet.

## Principles

1. The line weights are the hierarchy. Heavier lines mean more power and more importance; type follows the same order.
2. Gold means energized and nothing else. It appears only where power is flowing or a breaker is closed.
3. Draw, do not decorate. Every symbol is a real one-line device with a job in the diagram; there are no ornamental icons or cards.
4. Labels are annotations, set where a drafter would put them, never as eyebrows above headings.
5. Route first. The find control and a clickable key plan are both in the first viewport.

## Motion, one orchestrated moment each

- **story:** a sticky stage holds a drawing that assembles device by device as you scroll: generator, step-up transformer and the transmission line, the substation (disconnect, breaker, buses, step-down transformer, ground), the distribution feeder, the data hall. Each step's devices draw in ink, then gold runs through them. Numbered callout balloons tie each device to its step in the list. On the last step the camera pulls back, the diagram shrinks to a detail in the corner, the substation bus runs out to a national map and the covered states fill west to east as the gold reaches them. Reduced motion: `.is-static`, all six steps listed, and the drawing shown complete with the map beneath it.
- **energize:** at load the hero breaker's blade swings closed, gold runs down the main bus and along the hero feeder, through the transformer, into the key plan at California, and `map.energize()` carries it east; each state lands with a gold ring at its node. The coverage map is held de-energized with its breaker open until it scrolls into view, then the same sequence closes it. Reduced motion: everything drawn closed and energized.
- **zoom:** the grid-level control is a drawn transfer switch whose blade throws between a Transmission contact and a Distribution contact. Throwing it swaps the line weights of the large and small drops (heavy and energized versus fine and dashed), shifts emphasis between the two copy blocks, re-tiers the map, redraws the map corridors at transmission or feeder weight and zooms the map (Transmission frames the two parcel-level states in the Midwest; Distribution pulls out to the whole country, because hosting coverage runs coast to coast). A second instance of the switch sits above the map so the change is seen where it happens. Reduced motion: instant swap.
- **micro:** the tier filter is a row of knife switches. The chosen one closes and goes gold, the others open. On the map, filtered-out states drop to bare sheet with a dashed outline (out of service), the kept states flash a gold outline as they are switched in, and the switchboard rows FLIP into their new order. Reduced motion: instant state change, no flash.

## Review against the brief: what I revised and why

- **Hero.** First draft was headline left, map right, a badge row under it: the split-hero template the persuade mode warns about. Revised so the map is a key plan connected by a drawn feeder that leaves the page spine, crosses above the headline and enters the map at California, where the corridors start. The connection is the point, not the split.
- **Map colors.** Default would have reused the core's soft lilac and land tints. That reads as a generic choropleth. Revised to bare sheet for uncovered land, crisp non-scaling outlines and a deepened lilac, so the map looks drawn, not shaded.
- **Directory.** First instinct was a grid of app cards. Revised to a switchboard schedule: one sub-bus, one breaker per app, the breaker fill doubling as the tier swatch.
- **Section structure.** Hairline rules between sections would be the broadsheet default. Revised so there are no section dividers at all; the bus and its taps are the only structure.
- **Story numbering.** The steps are a real sequence, so they keep numbers, drawn as drafting balloons that also appear on the diagram, rather than a 01/02 typographic device.
- **Focus ring.** Gold would fail 3:1 on white; the ring is aubergine, with gold reserved for energized states.
- **Footer.** A plain footer line would waste the world; it became the drawing's title block, holding only the three footer facts, with no invented field labels.
