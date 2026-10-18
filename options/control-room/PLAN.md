# Control room: plan

Direction id `control-room`. The page is the wall board of a grid operator's control room: an ink board face built from mosaic tiles, aubergine panels screwed into it, a hex mimic board of lamp windows for the coverage map, and an annunciator panel of lit windows as the first thing a visitor can press. Gold means one thing on this board: energized.

## Palette (named)

| Name | Hex | Role |
|---|---|---|
| Board face | `#312439` (ink) | page ground, map board face, stage ground |
| Panel | `#43314d` (aubergine) | panels, rails, lamp bezels, pushbutton bodies |
| Seam | `#241a2b` (ink shade) | panel seams, recess around every lens, dark glass base |
| Live | `#EBBE07` (gold) | energized bus lines, pulses, lit pushbutton lens, focus ring, selected lamp ring. Never text on a light ground. |
| Lilac lamp | `#efe8f4` (lilac) | hosting-capacity lamp lens, primary text on ink and panel |
| Engraving | `#c3b4ce` (lilac shade) | engraved labels and secondary text (7.4:1 on ink, 6.0:1 on panel) |

Derived: siting lamp lens `#7d5a94` (lit aubergine, white label 5.6:1); dark glass `#261c2d`; dimmed armed lamp `#3a2d43`; painted (de-energized) bus line `rgba(239,232,244,.22)`; wash `#f7f5f9` is not used on this dark board.

### Map translation (truthful legend)
The brief's literal mapping puts aubergine `#43314d` on an ink ground, where it is illegible (1.3:1). Translated within the family:
- Parcel-level siting = a lit aubergine lens `#7d5a94` (the aubergine family, raised to lamp brightness).
- Hosting capacity = a lit lilac lens `#efe8f4`.
- Partial = hatched lens: lilac hatch lines on a dark lens, with the code on an ink plate so it stays legible.
- Not covered = dark glass, unlit.
The legend swatches are drawn as the same lenses, so the key matches the board exactly. Gold is not a tier: it marks energized bus lines and the moment a lamp lights, and the selected lamp.

## Type (Work Sans only, 300..700)

| Role | Size / leading | Weight | Notes |
|---|---|---|---|
| Display (headline) | clamp(3rem, 7.2vw, 6rem) / .94 | 500 | tracking -0.035em, lilac on ink; one line at 1440 |
| Section heading (h2) | clamp(2rem, 3.8vw, 3.375rem) / 1.02 | 500 | tracking -0.02em |
| Panel heading (h3) | 1.375rem / 1.2 | 600 | |
| Lead (subhead) | clamp(1.125rem, 1.5vw, 1.3125rem) / 1.5 | 400 | max 46ch |
| Body | 1.0625rem / 1.6 | 400 | max 62ch |
| Engraved label | .8125rem / 1.25 | 600 | tracking .02em, sentence case, engraved text-shadow |
| Readout figure | 2.25rem / 1 | 500 | tabular numerals |
| Wordmark | 1rem | 600 | "DECENNIAL" set in type, tracking .22em (the one run of capitals) |

Scale ratio is a perfect fourth (1.333) from 17px body: 17, 22, 30, 40, 54, then a display jump.

## Layout and alignment
Everything is left aligned to one 12-column board grid (max 1312px, 16px gutters at 390, 40 to 64px at desktop). Panels align to the grid edges; text never centers except inside lamp lenses (where real engraving is centered).

### First viewport, 1440x900
```
+--------------------------------------------------------------------------------------------+
| DECENNIAL  Energy Maps                                     Coverage    Large and small loads |  panel rail, seam under
+--------------------------------------------------------------------------------------------+
|                                                                                              |
|  Megawatts before acres.   (display, one line at 1440, left)                                   |
|                                                                                              |
|                                                                                              |
|  Decennial Energy Maps shows where the grid ...       Find your state                        |
|  (lead, 46ch)                                         [ Choose a covered state          v ]  |
|                                                                                              |
| +- annunciator panel: rail "Covered states" ------------------------------------------------+ |
| | [California   ] [Connecticut ] [Delaware  ///] [District of C.] [Illinois    ] [Indiana    ] | |
| | [Maine     ///] [Maryland    ] [Massachusetts] [New Hampshire/] [New Jersey  ] [New York   ] | |
| | [N. Carolina//] [Ohio        ] [Pennsylv. ///] [Rhode Island  ] [Vermont     ] [Virginia //] | |
| +-------------------------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------------------+
```
Each window is a pressable lamp (state name engraved, coverage line under it). It is the living part of the board in the first viewport and routes in one press. The find select is the primary action.

### Page
```
header rail
hero (above)
[story only] sticky stage: steps column | mimic diagram -> national hex board
scales: h2 + intro
   [zoom only] two-position selector switch
   large panel (mimic glyph + copy) | small panel (mimic glyph + copy)      (zoom: panels stack left, mini board right)
   note
coverage: h2 + intro
   +-- mosaic board face -------------------------------+ +-- control panel ------+
   |  hex mimic board (lamp windows)                     | | [micro] pushbuttons   |
   |                                                     | | lamp key (legend)     |
   |                                                     | | readout: 18 of 18 lit |
   +-----------------------------------------------------+ +-----------------------+
   engraved tag: Coverage as of October 2026.
   Covered states: grid of lamp keys (the keyboard path)
   Every map: a panel schedule, one row per map (lamp, name, tier, levels, states, utilities, access)
footer rail: wordmark, internal, year
```

## Principles
1. The board is the material. Bezels, recesses, lenses, seams and engraving carry the world; nothing glows. Light is a lens changing color, not a halo.
2. Gold is current. It only appears where power is (bus lines, pulses, a lamp's moment of lighting, the selected lamp, focus).
3. Lit means covered, dark means not. Coverage is never implied by decoration: dark glass is honest absence.
4. One orchestrated moment per motion, told in the board's own mechanics (a bus energizing, a switch turning, a pushbutton arming lamps).
5. Route first: the annunciator and the select both open a state's map in one action.

## Motions (one orchestrated moment each)
- **story**: the stage is a mimic diagram painted on the board in de-energized lines: generator, step-up transformer, transmission line on towers, substation bus, distribution feeder on poles, data hall. Scroll energizes it segment by segment (gold flows along the path, each station's lamp lights, equipment outlines brighten). At the data hall its rack lamps light. Step six zooms the diagram out and the national hex board takes its place, its lamps lighting west to east with scroll. On phones the diagram's camera follows the active station. Reduced motion: every step listed, the diagram fully energized, the board fully lit beneath it.
- **energize**: when the board scrolls into view, the core sends pulses along the bus lines (redrawn as straight mimic segments that pass behind every lamp lens). Each line leaves a gold trail behind its pulse, so the bus stays energized. Each covered lamp lights the instant the pulse reaches it, its bezel flashing gold, and the panel readout counts lamps lit up to the real total. Reduced motion: all lit, all bus gold, readout full.
- **zoom**: a two-position rotary selector switch (Transmission / Distribution). Turning it rotates the knob to its detent, re-arms the lamps in a west-to-east sweep (core dims non-matching tiles, the sweep staggers it by column), and the board leans in (map.zoomTo) to the distribution coverage or back out to the national transmission view. The armed copy block gets a lit lamp, the other dims. A mini board sits beside the switch so the change is seen where it is made; the main board below matches.
- **micro**: the tier filter becomes illuminated pushbuttons (the pressed one has a lit gold lens and sits lower in its bezel). Pressing re-arms the lamps in a sweep, the lamp key dims the tier that is off, the readout updates, and the core FLIPs the schedule rows.

## Review against the brief: what I revised and why
- **First draft hero was a split**: copy left, a small hex map right. That is the template split hero with a world painted on. Revised: the hero is a full-width annunciator panel under a left-set display headline, so the board's most characteristic object (a panel of engraved lamp windows) is the first thing to press, and it routes.
- **First draft lit lamps with a soft glow (box-shadow halo, drop-shadow on gold)**. That is the "near-black plus one neon accent with glowing edges" default. Revised: no glow anywhere; lamps are flat lit lenses set in bezels with a recess and a faint top-edge shine; gold is a line color.
- **First draft set the directory as a grid of eight cards**. Revised: a panel schedule (one row per map, columns with seams), the way relay and breaker schedules are posted on a board. It also FLIPs more legibly.
- **First draft used a readout row of big numbers in the hero** (maps, states, utilities). That is the stats-row default, and a utilities count is not cleanly in apps.js (Indiana's entry is a description, not a utility). Revised: one readout, on the coverage panel, "lamps lit" of the real covered total, which every motion changes truthfully.
- **Corridors as smooth curves** read as a data-viz flourish. Revised: straight mimic segments that pass behind each lens, like tape on a mosaic board.
- **Mosaic tile grid** kept only on the board faces (map board, story stage), not the whole page, so it reads as a surface, not wallpaper.

## Build notes (after the Playwright passes)
- The headline sets on one line at 1440 (display capped at 6rem per the craft floor), which leaves the whole annunciator in the first viewport.
- The lamps-lit readout moved from the section head into the console under the lamp key, so it sits beside the board it counts.
- The story's zoom-out uses viewBox changes on both SVGs (diagram widens around its center, board widens from the Indiana lamp to the nation). A CSS scale on the board's parent caused text and shapes to rasterize out of register in Chromium.
- The selector switch sets its two positions at the knob's detents (upper right Transmission, lower right Distribution), so it fits a narrow column without wrapping.
- Zoomed boards clip to their faces (the core SVG is overflow: visible).
- Detector advisories kept on purpose: the hatch is the required partial-coverage encoding; the tile grid appears only on map and mimic surfaces (the mimic board's mosaic), not as page wallpaper.
