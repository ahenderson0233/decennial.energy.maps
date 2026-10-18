# Cartographic editorial: plan

Direction id `cartographic`. A light-led page built as one printed atlas sheet: wash paper, aubergine
linework, lilac and aubergine color plates, gold overprinted corridors. The geographic map is the plate.

## Subject, audience, job

- Subject: where the grid has room for data centers, read state by state at two voltages.
- Audience: invited Decennial Group employees now, company-wide and holding-company teams later.
- Primary job: route to the right app from the national map within seconds; secondary job: explain
  transmission versus distribution siting in the vocabulary of a survey map.

## Palette (named hex values)

| Name | Hex | Role |
|---|---|---|
| Ink | `#312439` | text, key-plate linework, state boundaries, focus ring |
| Aubergine plate | `#43314d` | parcel-level siting fill, heavy rules, active tab |
| Lilac plate | `#c6b3d6` | hosting capacity fill (a printable shade of brand lilac `#efe8f4`) |
| Lilac | `#efe8f4` | tints: panel accents, legend sample ground, dim state wash |
| Wash paper | `#f7f5f9` | page ground and water |
| Gold overprint | `#EBBE07` | corridors, pulses, registration marks, focus halo; never text on paper |

Derived: land paper `#fdfcfe` (land is a touch whiter than the wash that reads as water), muted ink
`#5f4f67` (7.3:1 on wash), dim plate `#e9e3ee` (unprinted or filtered states), partial hatch line
`#9a80ae` on land paper.

Translation note (legend stays truthful): brand lilac `#efe8f4` is nearly invisible against the wash
paper, so the hosting tier prints in a deeper lilac of the same hue (`#c6b3d6`) and the partial hatch
uses a deeper lilac line (`#9a80ae`) on land paper. Legend swatches use the same values as the map.

## Type (Work Sans only, axis 200..800)

| Role | Size | Weight / setting |
|---|---|---|
| Plate title (h1) | clamp(2.75rem, 1.1rem + 5.4vw, 6rem), one line at 1280+ | 640, -0.035em, leading 0.95 |
| Section title (h2) | clamp(2rem, 1.2rem + 2.6vw, 3.5rem) | 600, -0.025em |
| Block title (h3) | clamp(1.3rem, 1.1rem + 0.6vw, 1.65rem) | 600 |
| Lead / subhead | clamp(1.125rem, 1rem + 0.4vw, 1.3rem) | 360, leading 1.45 |
| Body | 1.0625rem (17px) | 400, leading 1.55, measure 64ch max |
| Collar and meta | 0.875rem / 0.8125rem | 500, tabular numerals (scale bar, graticule) |
| Wordmark | 0.95rem | 700, 0.26em tracking, set in caps (the one exception) |

Real weight contrast: the 640 plate title against the 360 lead; the 700 wordmark against 300 "Energy Maps".

## Layout

One sheet. The headline is the plate title across the head of the sheet; under it the explanation
column (subhead, the working Find control, the legend) faces the national plate. The plate carries
its own neatline with a graticule band (piano-key border at real 1-degree meridian and parallel
crossings), degree labels, boxed Alaska and Hawaii insets, coastline water lining, registration
marks outside the corners, and a collar with a true scale bar. On desktop the plate stays pinned
while the large and small loads text scrolls past it, so the zoom toggle acts on a map in view.
Left aligned throughout; nothing centered except the story plate inside its frame.

First viewport, 1440x900:

```
+--------------------------------------------------------------------------------------------+
| DECENNIAL  Energy Maps                                         Coverage   Large and small loads |
|                                                                                            |
|  Megawatts before acres.                                                    (plate title)  |
|                                                                                            |
|  Decennial Energy Maps shows    +  ===piano-key neatline with degree ticks=============  + |
|  where the grid has room ...    |  |                                                  |    |
|                                 |  |      geographic national plate (interactive)     |    |
|  Find your state                |  |      gold overprint corridors, lilac/aubergine    |    |
|  [ Choose a covered state  v ]  |  |      color plates, water-lined coast               |    |
|                                 |  |  [AK inset] [HI]                       chips -> |    |
|  # Parcel-level siting ...      |  ==================================================    |
|  # Hosting capacity ...         |   0 ---- 250 ---- 500 miles                               |
|  / Partial ...                  +                                                       +  |
+--------------------------------------------------------------------------------------------+
```

Page:

```
header        wordmark + product | nav
lead grid     [plate title spanning]
              [explanation column] [plate, sticky on desktop]
              [story band, full width, ?v=story only]
              [large and small loads text, left column, beside the pinned plate]
coverage      Where the maps reach + intro
              [plate tabs on the index plate head, ?v=micro only]
              [index plate: map + legend + as-of] [covered states gazetteer, beside it]
              Every map: index entries, two columns, rules not cards
footer        wordmark | internal note, year
```

Phone (390): one column in the same order; the plate drops its graticule labels but keeps its band,
chips become the key row under the plate, the panel is the core bottom sheet.

## Principles

1. The page is an atlas sheet, not a website wearing a map: neatline, collar, scale bar, insets,
   registration, water lining and graticule are the structure, used once each, with real geometry.
2. Symbols mean one thing everywhere: gold cased line with tower ticks = transmission; ink line with
   pole dots = distribution feeder; dash-dot = parcel line; hatching = partial (or built footprint in
   the story diagrams). The same symbols key the scales text, the directory levels and the story.
3. Calm plate, loud title: the boldness is spent on the display title and the plate; everything
   around them is quiet paper and ink.
4. Honest coverage: no fabricated features. Corridors are the core's schematic corridors, drawn as
   an overprint; nothing marks a data center location; the scale bar and graticule are computed from
   the real projection.

## Motion: one orchestrated moment per concept

- **energize** (the press run): corridors start as faint unprinted guides; the core's pulses become
  the press head, and a gold overprint line inks in behind each pulse. As each covered state is
  reached, its color plate arrives out of register (offset, multiplied) and slides into register.
  When the last state lands, the corner registration marks close from two offset crosshairs into one.
  Reduced motion: printed state, everything in register.
- **story** (atlas inset plates): a sticky stage pairs the numbered step index with one framed inset
  plate per stop, each a plan-view survey diagram drawn in the map symbology: the generating plant
  on a river, the transmission corridor across contours, the substation yard and bus, a feeder down a
  street grid, the data hall on a dash-dot parcel. Scroll inks each plate's linework (key plate
  first), then its color plates register; the sixth plate pulls back to the national plate with the
  real coverage. A segmented scale-bar under the frame tracks progress. Reduced motion: all six
  plates printed in full beside their steps.
- **zoom** (regional plate to local inset): Transmission shows the national plate with the large-load
  states printed and the corridors heavy. Distribution tweens the plate (map.zoomTo) to the Northeast
  and Mid-Atlantic, re-ticks the graticule band and scale bar for the new extent, prints state names,
  and draws a locator inset whose extent box shrinks in step with the zoom so California and Illinois
  stay visible. The large and small copy blocks swap emphasis. Reduced motion: instant swap.
- **micro** (thumb-index tabs): tier buttons are tabs on the head of the index plate. Choosing one
  lifts the other tier's color plate (states fall back to the dim plate) and re-registers the chosen
  plate west to east; the legend block morphs (chosen swatch widens into a plate sample, the others
  fall back to the dim sample); the directory FLIPs (core). Reduced motion: instant.

## Review against the brief: what read as default, and what changed

1. First draft put copy left and the map right as two equal halves: that is the split hero the
   Persuade rules call the template. Revised: the headline spans the sheet as the plate title, the
   left column is the plate's explanation block, and the plate is the dominant object (about two
   thirds of the sheet) with collar furniture that only an atlas has.
2. First draft framed every section with hairline rules and small caps-like labels (the broadsheet
   default). Revised: one neatline (on each plate) carries the framing; sections are separated by
   space, not rules; no tracked labels; collar text is sentence case with tabular numerals.
3. First draft used cards for the directory. Revised: index entries (rules between rows, name, tier
   swatch, level symbols) like an atlas index to plates.
4. First draft colored water lilac. Rejected: water in the lilac family would read as hosting
   capacity. Water stays paper, marked only by coastline water lining.
5. Gold focus ring considered and rejected (1.76:1 on paper); focus is an ink ring with a gold halo.
6. Scale toggle placement: the map would be out of view when toggling. Revised: the plate pins beside
   the large and small loads text on desktop so the zoom happens in view.
7. Two national maps (hero plate and coverage) could read as repetition. Revised roles: the hero
   plate is the large atlas plate with corridors; the coverage plate is a smaller index map paired
   with the gazetteer list, without corridors, used by the tier tabs.

## Deviations to note

- Plate tabs sit on the head edge of the index plate rather than the fore-edge: fore-edge tabs would
  cover the small-state callout column.
- Scale bar and graticule labels are map furniture computed from the projection (us-atlas Albers,
  scale 1300), not product claims; they carry no copy beyond units.
