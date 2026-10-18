# Night lights field: plan

Direction id `night-lights`. The page is the United States seen from orbit at night, rendered as a dot
matrix. Covered states are lit fields of light; everything else is a faint grid of unlit land. Gold is
live power, and only power: trails, pulses, the selected state, and the focus ring.

## Subject, audience, job

- Subject: where the grid has room for data centers, state by state.
- Audience: invited Decennial Group employees now, company-wide and holding-company teams later.
- Job: see which states are lit, at what depth, and open the right map in one move.

## Palette (named hex)

| Name | Hex | Role |
|---|---|---|
| Night | `#1b1420` | the ground. Ink `#312439` taken down about 45% in lightness, hue kept, so the page reads as aubergine dark, never neutral black |
| Ink | `#312439` | raised surfaces: panel, chips, controls, tooltip; also the "dusk" ground the energize motion starts from |
| Aubergine | `#43314d` | hairline rules, control borders, unlit wires |
| Lilac | `#efe8f4` | body text, and hosting-capacity light |
| Wash | `#f7f5f9` | headings, and parcel-level siting light (the brightest light on the page) |
| Gold | `#EBBE07` | power: corridors, pulses, selected state, focus ring, story step numbers (text on dark only) |

Derived: muted text `#b9a8c6` (lilac over night, 8.1:1 on night, 6.6:1 on ink); unlit land dot =
lilac at 18% alpha.

### Map translation (noted for the legend)

The core semantics are aubergine = parcel-level siting, lilac = hosting capacity, hatched = partial. On a
night ground a literal aubergine fill would be nearly invisible, so the roles translate into light within
the brand family:

- **Parcel-level siting:** the aubergine role becomes the brightest, densest light: wash-white dots on a
  doubled lattice (twice the dots per area), with the strongest haze. On a light ground aubergine is
  the heaviest mark; on night the heaviest mark is the brightest one.
- **Hosting capacity:** lilac light, one dot per lattice position, softer brightness, lighter haze.
- **Partial:** the hatch survives as a dotted hatch: only lattice positions on diagonal lines are lit
  (every third diagonal), so partial reads as striped, sparser light.
- **Uncovered land:** one dot in four, lilac at low alpha.

The legend swatches are drawn with the same dot geometry (CSS radial-gradient lattices), so the key
is literally a sample of the map.

## Type (Work Sans only, 300..700 axis)

Scale on a 1.333 ratio from a 17px body, with the display set from the hero's own width.

| Role | Size | Weight / tracking | Notes |
|---|---|---|---|
| Display (headline) | clamp(2.75rem, 5.2cqw, 5.75rem) | 500 / -0.03em, line-height .95 | set in the map's dark interior |
| H2 section | clamp(2rem, 3.4vw, 2.75rem) | 400 / -0.02em | balanced |
| H3 | 1.375rem | 500 / -0.01em | |
| Lead | 1.1875rem / 1.55 | 400 | subhead, intros |
| Body | 1.0625rem / 1.6 | 400 | max 66ch |
| Small / meta | .875rem / 1.45 | 400 | muted lilac |
| Wordmark | 1rem | 600 / .22em | DECENNIAL, the only capitals run |

Tabular numerals (`font-variant-numeric: tabular-nums`) on the as-of line, footer year and story step
numbers.

## Layout and alignment

Left aligned throughout. 12-column grid, max 1320px, gutters clamp(16px, 4vw, 56px). Vertical rhythm:
sections 128px apart on desktop, 80px on phones; more space above a heading than below it.

### First viewport, 1440 x 900

The hero is the night field itself, full width. The copy is set inside the map, in the dark interior
between lit California and lit Illinois, where no state is covered. The headline sits over the northern
plains, the subhead and the working "Find your state" control over the Southwest; the CA to OH power
corridor runs between them like a horizon.

```
+--------------------------------------------------------------------------------+
| DECENNIAL Energy Maps                          Coverage   Large and small loads |
|                                                                                 |
|  . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . :::::   |
|  :::. . . Megawatts           . . . . . . . . .         . ::::::::::::::::      |
|  ::::. .  before acres.       . . . . . . . . . . :::: ##:::::::::NY::::MA      |
|  ::::: . . . . . . . . . . . . . . . . . . . . IL::IN##OH::PA:::NJ             |
| CA::::==========(gold corridor CA..OH)=================####::::::::MD DC       |
|  :::::: . Decennial Energy Maps shows where . . . . . . . . . .VA:::::          |
|   ::::: . the grid has room for data ... . . . . . . . . . . . :NC::            |
|    :::  . [ Find your state           v ] . . . . . . . . . . . .               |
|_________________________________________________________________________________|  <- fold
     (Texas, Florida and the AK/HI insets continue just below the fold)
```
`::` hosting light, `##` siting light, `.` unlit land.

Below 960px of hero width the overlay steps aside: copy stacks above a full-width map.

### Page

```
header      wordmark + product                              nav
hero        night field, copy in the dark interior, find control
story       (v=story) sticky stage: heading + one step + dot progress rail | authored power-path art
            ends with the camera pulling back to the national night field
scales      (other motions) heading, intro
            [v=zoom: toggle Transmission | Distribution, and a sticky night map at right]
            two blocks, each with a small dot diagram: large loads | small loads; note
coverage    heading, intro, [v=micro: filter]
            map (8 cols) | legend + as-of (4 cols)
            covered states list (4 columns of rows)
            every map: directory as rows on hairlines, not cards
footer      DECENNIAL Energy Maps . Internal to Decennial Group . 2026  (one quiet row)
```

## Principles

1. **Light is information.** A dot is lit only where a map covers the ground. No city points, no data
   center points, nothing invented: lights fill state shapes or travel along the core's corridors.
2. **The matrix is a display, not a texture.** Dots are fixed in screen pixels (a whole-pixel pitch),
   so when the map zooms the geography moves under the matrix and more dots fall inside each state:
   resolution increases the way a display renders a zoom.
3. **Gold means power.** It never decorates. If it is gold, current is flowing or you chose it.
4. **One glow, bounded.** A single blur filter makes area haze under lit states (light pollution
   spilling past a border), never a neon edge.
5. **The page is the night.** Every section stays on the same ground; surfaces rise only to ink.

## The four motions, as one world

All four reuse one material idea: a state's lights switch on by a radius spreading from the point where
power reaches it (an SVG clip circle per lit state), and switch off by dimming the field.

- **story:** a close-up of one night landscape (authored SVG, generic, no place). Scroll lights it in
  order: a single gold plant light; a line of transmission tower lights with a gold trail drawn along
  it; a substation's tight grid of lights; finer feeder dots branching out; the data hall's dense white
  field with its haze. On the last step the camera pulls back: the close-up shrinks and fades as the
  national night field resolves in front of it. Reduced motion: every step listed, the close-up fully
  lit, the national field shown below it.
- **energize:** the hero opens at dusk (ink ground, covered states unlit). Gold trails leave California
  and run east along the corridors, leaving a dim persistent trail; as a pulse reaches a state its
  lights strike on from that point outward with a short lamp flicker, the haze rises, and the ground
  settles from dusk to night as the last state lights. Then a quiet pulse every few seconds while the
  map is on screen.
- **zoom:** the scales section gets its own night map beside the toggle. Transmission: the whole
  country, long-haul corridors redraw west to east as bright trails, siting states bright, hosting
  states dimmed. Distribution: the camera moves to the Northeast and Mid-Atlantic, the dot pitch tightens
  from 5px to 4px, hosting states relight from their centers, the trails sink, and Indiana dims (it has
  no distribution map). The large and small copy blocks trade emphasis and their diagrams relight.
- **micro:** the coverage filter. The tier you leave goes dark fast (240ms dim); the tier you choose
  relights from each state's center (650ms). The directory FLIPs (core). Filter buttons carry their own
  dot-lattice swatch.

Reduced motion everywhere: lights are simply on, the ground is night, zoom jumps, story is static.

## Review against the brief: what I revised and why

1. **Split hero (copy left, map right).** My first sketch was a 5/7 split. That is the template the
   Persuade rules call out, with the world as a sticker. Revised: the night field is the hero ground at
   full width and the copy lives inside it, in the uncovered interior. The composition is only possible
   on this map with this coverage, so it cannot be mistaken for any other page.
2. **Near-black with one bright accent** is a generated-page default. Revised: the ground is ink-derived
   `#1b1420` (visibly aubergine), and most of the light on the page is lilac and wash, not gold. Gold is
   rationed to power.
3. **Neon edge glow on lit states** is the default "night map" move. Revised: no strokes glow; one blur
   filter makes area haze beneath the lit fields.
4. **Directory as a grid of cards.** Revised: rows on hairline rules with a dot swatch as the tier mark,
   because the directory is a list to scan, not a set of products.
5. **A regular, even dot grid** reads as an LED gimmick. Revised: brightness varies per dot on a 10x10
   tile (seeded, fixed), so lit fields shimmer like real lights while staying a truthful density code.
6. **Scattered entrance animations.** Cut. Nothing fades up on scroll; the only motion is the chosen
   concept and direct feedback (hover, select, panel).

## Deviations to report

- Two to three maps per page: the hero night field (interactive, no chips), the coverage map (with chips,
  legend, list), plus the story stage map (story) or the scales map (zoom). The hero map is the energize
  stage, because the moment must happen in the first viewport.
- The core's fill rules for covered states are replaced by a lights layer beneath the core paths (core
  paths stay on top, transparent for covered states, so all interaction is the core's). Filter and scale
  dimming are re-expressed in that layer, scoped to the map the control drives (coverage map for micro,
  scales map for zoom); the hero stays fully lit.
