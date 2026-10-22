# Life-like illustrated: plan

One continuous aerial panorama of the power path, drawn as crisp SVG with real proportions, materials and light. It reads like an architect's site rendering seen from a drone: a three-quarter view from about 25 degrees above the ground, true perspective, vertical edges kept vertical (two-point), the scene floating on the page as a soft-edged island.

## Palette

Brand anchors, then the material tones derived from them. Every material has a dark and a light tone; each face's color comes from its angle to the sun, then is mixed toward the haze by distance.

| Role | Hex | Use |
| --- | --- | --- |
| Ink | `#312439` | shadows (flat, 18 percent), conductor casing, current-head ring |
| Aubergine | `#43314d` | insulators, glass depth, deepest steel |
| Gold | `#EBBE07` | live conductors and the current head only |
| Lilac | `#efe8f4` | sky haze, reflections on glass |
| Wash | `#f7f5f9` | the page; the island and the sky fade into it |
| Haze | `#ece7f0` | atmospheric perspective target (lilac pulled toward wash) |
| Grass | `#dfe2d6` / `#e7e7df` / `#d6dbcc` | muted fields, sage pulled toward lilac |
| Fallow | `#e9e3e2` | bare fields, a warm counterweight |
| Concrete | `#9d93a3` to `#f1eef2` | pads, foundations, walls |
| Gravel | `#b3abb3` to `#d8d3d7` | substation and switchyard yards |
| Cladding | `#8a8093` to `#f4f2f6` | data hall and plant facades |
| Galvanized steel | `#6f6777` to `#cfcad3` | towers, gantries, stands |
| Transformer grey | `#5f5768` to `#bdb7c3` | tanks, radiator fins, generators' enclosures darker |
| Glass | `#3f3249` to `#8d7f99` | curtain walls, with a lilac reflection gradient |
| Wood | `#5e4b4b` to `#9a8580` | distribution poles |
| Tree | `#7c8277` / `#a3a99c` | crowns, two tones |

## Perspective and light

- Camera: eye 350 m up, horizon fixed, focal 1000, so scale falls from about 1.8 px/m in the foreground to 0.8 px/m at the plant. Every object is projected by its own camera placed straight in front of it (a sliding camera), the way an illustrator draws a long panorama. Each object is true two-point perspective; the panorama never distorts at its ends.
- Site grid rotated -28 degrees: long axes descend to the right; front facades face the viewer's left, end walls the right.
- Sun: high, from the left and slightly in front, `L = (-0.63, 0.73, -0.26)`. Roofs brightest, front facades mid, end walls in shade. Shadows fall to the right and a little back, as flat ink polygons, unioned per part so overlaps never double-darken.
- Cylinders (stacks, tanks, bushings) carry a shared lit-left to dark-right gradient per material. Gradients only describe light on material; none are decorative.
- Distance: haze mix 0 to 0.26 by depth; the far edge of the ground fades through haze into wash, which is the sky.

## Panorama (scene units, horizon at y = 0)

```
y 150  . . . . . . . . . . . haze / distant tree line . . . . . . . . . . . . . . . . . .
        [PLANT]  stacks + plume                                   [HYPERSCALE CAMPUS]
 y 280  turbine hall, HRSGs,                                      own switchyard, three
        ACC, GSU, switchyard ---.                                 long halls, RTUs, gensets
                                 T1 -- T2 -- T3                  /  monopole HV tap
 y 380                                      T4 -- T5 --.     M2
                                                       [SUBSTATION]  gantries, bus,
 y 440                                                  breakers, transformers, control
                                                              `-- P1 -- P2 -- P3 -- P4(xf)
 y 560                                                                         [SMALL DC]
        x -150                      x 900                  x 1250            x 1950
```

The island is about 2100 by 450 scene units. The hero crops the right-hand cluster (incoming line from the left edge, substation, tap, campus, feeder, small data center) at about 2.2 to 1.

## Camera keyframes (story)

Each stop frames the projected bounding box of its equipment; the camera interpolates centers linearly and scale geometrically, with a slight dolly-out on long pans so moves read as flight, not slide.

| q | Stop | Frame |
| --- | --- | --- |
| 0 | Generation | the plant, stacks and plume, close |
| 1 | High-voltage transmission | the middle three towers, line running through |
| 2 | Transmission substation | the fenced yard, close enough to read breakers and fins |
| 3 | Hyperscale | from the bus tap out along the monopoles to the campus |
| 4 | Distribution feeder | substation's low side out along the wood poles |
| 5 | Data center | the small building, the pole-top transformer, two generators |
| 6 | Every covered state | whole island, scaled to 92 percent width and at most 30 percent height, centered at 17 percent from the top |

## Motion grammar

- Build: when a stop opens, its structures rise out of the ground (scale-Y from their base with an early opacity ramp, staggered within the stop), pads and yards fade in, and conductors are strung (dash draw-on of the dead conductor).
- Current: gold dash reveal over an ink casing, hop by hop in path order, with a bright head (gold core, ink ring, soft gold halo) riding the leading phase. Branches can run in parallel: in the hero, current splits at the substation bus and reaches both data centers together.
- Hero: 350 ms hold, then about 2.5 s ease-in-out of current from the off-sheet line through the substation to both campuses; onArrive() once.
- Reduced motion: full island, built and energized, fitted; no pans, no heads.
- Cost: one path per material tone per item (batched repeats), symbols with `<use>` for towers, monopoles, poles and trees, flat fills for shadows, no filters; only transforms, opacity and stroke-dashoffset change per frame.

## Review against generic defaults

- First draft lit everything from the front with outlines on every face, which flattened the material and looked like the isometric set re-projected. Revised: no ink outlines; faces are separated by light alone, with a hairline stroke of the face's own tone to seal seams, and outlines kept only where real objects are line-like (lattice, conductors, fences).
- First draft had a full-bleed green landscape rectangle. That is a stock-render default and fights the light page. Revised: the ground is a muted, lilac-leaning island that dissolves into the wash at every edge, and the story column feathers its own edges so the scene never sits in a box beside the copy.
- First draft used a single camera for the whole panorama; edges sheared badly. Revised: per-object cameras.
- Gold is held back to the conductors and the head; energized equipment is not tinted.
