# Handoff: Decennial Energy Maps landing page

Written 2026-10-22 so a fresh session can pick up after context compaction. Read this file, `CLAUDE.md` (binding rules and tool guide) and `PRODUCT.md` (product truth) first. People are named by role ("the operator").

## Where things stand
- **Live site:** https://ahenderson0233.github.io/decennial.energy.maps/
  - GitHub Pages serves from `main`, at the repo root.
  - Repo: `github.com/ahenderson0233/decennial.energy.maps` (public).
  - Local working folder: `C:\Users\ahend\Downloads\Decennial Summer Work\Project Reverse Uno\Landing Page`.
- **What is live:** the life-like 3D landing page, which the operator chose on 2026-10-22. Everything below has shipped to `main`:
  - **Hero:** "MEGAWATTS BEFORE ACRES." with a subhead and the "Find your state" select. A three.js campus energizes on load: current runs through the transmission substation to both data centers, then the hero hex board energizes.
  - **Story:** six stops driven by scroll, in a 3D scene with a camera that flies the path. The stops:
    1. Generation
    2. High-Voltage Transmission
    3. Transmission Substation
    4. Hyperscale Data Center: a campus on its own high-voltage tap off the transmission substation.
    5. Distribution Feeder
    6. Edge-Computing Data Center: under 25 MW, on the feeder. The story ends here.
  - **Removed on the operator's ruling:** the seventh stop ("Every Covered State") and its rising map.
  - **Coverage ("WHERE THE MAPS REACH"):** a tilted isometric hex board that energizes the first time it scrolls into view, the legend, the covered-state list (the keyboard path), and the "Every map" schedule.
  - **Header:** wordmark only. The section links were removed so visitors scroll through the animations. A keyboard-only "Skip to coverage" link stays for WCAG 2.4.1.
  - **Headings:** all in capitals, through CSS `text-transform`, with the source text in title or sentence case.
  - **Hex map:** follows the operator's reference tile map, shipped in commit `cc3b0c0`. Florida sits under Alabama and Georgia, the Great Lakes rows are fixed, and the corridors run only between tiles that touch.
- **Recent commits on `main`:**
  - `cc3b0c0`: hex layout
  - `b0f980f`: header links removed
  - `cd1d8d8`: story ends at stop 6
  - `ca4eaf1`: 3D page moved to the root
- **Review history:**
  - `ad7e0da`: the four-version review site (current isometric, life-like 3D, life-like illustration, blueprint to built).
  - `c489989`: the first-round review of options A-D.
  - The five phase-A options are in history before `ca4eaf1`.
  - Restore any of them with `git show <sha>:<path>` or a worktree.

## File map
| Path | What it is |
|---|---|
| `index.html` | The page. Script order: d3 7.9.0 (cdnjs), topojson-client 3.1.0 (jsdelivr), `data/*`, `js/core.js`, `js/iso-kit.js`, three@0.149.0 (jsdelivr), `js/art.js`, `js/page.js` |
| `css/core.css` | Structural CSS and theming custom properties (`--map-*`, `--panel-*`, `--chip-*`) |
| `css/page.css` | The isometric sheet look, hex boards, story layout, coverage/schedule, capitals for headings |
| `css/art.css` | The 3D canvas edges and masks |
| `js/core.js` | Facts and behavior: the coverage index, the `HEX` tile table, `CORRIDORS`, `renderMap` (hex/geo), panel/bottom sheet, list, directory, find control, `energize`, `scrollStory`, and loading the optional `data/apps.local.js` |
| `js/page.js` | `IsoBoard` (tilted hex board), the energize choreography (hero on load, coverage on first view), `StoryController` (`STOPS = 6`), boot |
| `js/art.js` | `window.DEM_ART = { hero(container) -> { run(onArrive) }, story(container) -> { size(), update(q 0..6, isStatic) } }`. Procedural three.js world, camera `KEYS` per stop, `STATIC_KEY` for reduced motion. It falls back to the isometric SVG through `ISOKIT` with no WebGL (`?gl=0` forces the fallback) |
| `js/iso-kit.js` | The isometric drawing kit and scene (fallback only now) |
| `data/apps.js` | Coverage inventory: 8 apps, tier, levels, states (full/partial), utilities. **No URLs ever** |
| `data/copy.js` | Every word on the page. Story stops live here |
| `data/us-states-albers.js` | us-atlas 3.0.1 states inlined, so the page opens from file:// |
| `data/apps.local.example.js` | Template for the gitignored `data/apps.local.js` (app sign-in URLs) |
| `docs/` | `design-plan.md` (the 3D plan), `core-contract.md` (core API; its paths note explains the old layout), this handoff. Excluded from Pages by `_config.yml` |
| `_config.yml` | Jekyll excludes: CLAUDE.md, PRODUCT.md, docs, shots, .claude, .impeccable |
| `robots.txt` + `noindex` meta | Search engines kept out |
| `shots/` | Local Playwright captures, gitignored. Before/after sets: `before-after/`, `story-six/`, `no-nav/`, `hex-layout/` |

## Rulings that bind future work (all in CLAUDE.md)
- **No app URL** in any committed file. Run `git grep -nE "run\.app|github\.io|pages\.dev"` before every push; it must print nothing. The end state is that each app opens to its own sign-in page via `data/apps.local.js`, once the apps are gated.
- **No PII**, and people are named by role. Never use app screenshots unchecked: Indiana renders can show parcel owner names.
- **Never claim** Hammond/Digital Crossroads, any named project, a roadmap, MW figures or customers. Coverage must match `apps.js`.
- **Gold `#EBBE07`** is never text on a light ground.
- **Workflow:**
  - Work on a `design/*` branch. Take Playwright before/after screenshots at 1440x900, 1366x768 and 390x844.
  - Push the branch (allowed). Publish to `main` only after the operator says so in session ("ship it", "publish").
  - Publish with: `git checkout main && git merge --ff-only design/<x> && git push origin main`.
  - Then wait for the Pages build: `gh api repos/ahenderson0233/decennial.energy.maps/pages/builds/latest --jq '.status + " " + .commit'` until it reads `built <sha>`. Then verify the live page.
  - The auto-mode classifier blocks pushes to `main` unless the operator has just authorized them.
- **Commit trailer:** end every commit with the harness's Co-Authored-By and Claude-Session lines.

## Tooling (see CLAUDE.md "Tool guide")
- **Plugins** (project scope, in `.claude/settings.json`): frontend-design, impeccable (Persuade mode, build path `code`), playwright-skill. **Skills:** `/grill-me` and `grilling` (`.claude/skills`, MIT).
- **Playwright:**
  - Skill dir: `%USERPROFILE%\.claude\plugins\cache\playwright-skill\playwright-skill\5.0.0\skills\playwright-skill`.
  - Run scripts with `node "<dir>/run.js" <script.js>`. Launch Chromium with `--use-angle=swiftshader --enable-unsafe-swiftshader` so WebGL works headless.
  - Software rendering is slow: give 3D screenshots `timeout: 120000`.
  - Expect one console error locally, `ERR_FILE_NOT_FOUND` for the optional `data/apps.local.js`; on the live site it shows as a 404.
- **Impeccable launcher (Windows):** `%USERPROFILE%\.claude\plugins\cache\impeccable\impeccable\4.6.0\skills\impeccable\scripts\impeccable.cmd` (`context`, `detect --json <files>`). The only standing detector advisory is the repeating-stripe hatch for partial coverage, which is required and kept.
- **Standard checks for any change:**
  - zero page errors;
  - 6 `.dem-story-step`;
  - 18 `#map .dem-state.is-energized` after scrolling `#map` into view;
  - clicking `.dem-statelist button[data-state="VA"]` opens the panel titled "Virginia";
  - `scrollWidth - innerWidth === 0`;
  - with reduced motion, `.dem-story.is-static`.

## Coverage data (apps.js, checked October 2026)
- Parcel-level siting: Indiana (statewide), Illinois (ComEd, Ameren Illinois).
- Hosting capacity:
  - Ohio (6 investor-owned utilities)
  - Dominion (VA partial, NC partial)
  - New York (6 investor-owned utilities)
  - New England (MA, CT, RI, VT full; NH, ME partial)
  - Mid-Atlantic (DC, MD, NJ full; DE partial (Delmarva); PA partial (PECO only))
  - California (PG&E, SCE, SDG&E, LADWP, SMUD)
- In total: 17 states plus DC.

## Open items and ideas (none in progress)
1. **Real-device check of the 3D page.** Only tested in SwiftShader. The first scroll into the story may hitch while the scene builds lazily.
2. **DESIGN.md.** Impeccable's `document` step was never run for the shipped world. CLAUDE.md says to run it once the chosen direction is built. Use `/impeccable document`, or spawn `impeccable:impeccable-documenter` with the project root, `index.html`, `PRODUCT.md` and `docs/design-plan.md`.
3. **Gating.** When the apps get sign-in, fill `data/apps.local.js` locally, then decide how URLs reach the deployed page: a gated host such as Cloudflare Access or Cloud Run, rather than a public repo.
4. **Stale context in `.impeccable/surfaces/`.** It holds phase-A direction briefs for files that no longer exist. Harmless; clean up if Impeccable reports drift.
5. **Dead code in `js/core.js`.** The phase-A dev switcher and `?review=1` back link are unused now (they need `data-look`, which the root page does not set).
6. **Story heading.** The story has no visible heading; its `h2` is screen-reader only and reads "Large loads and small loads".
