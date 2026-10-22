# Decennial Energy Maps: landing page

The front door to the operator's energy and data center siting apps, for invited Decennial Group employees. It will later serve employees company-wide and the holding companies. Repo: `github.com/ahenderson0233/decennial.energy.maps`. It is a public GitHub Pages site, served from `main`.

Product truth lives in `PRODUCT.md`. Durable visual decisions go in `DESIGN.md`, which is written after a direction is chosen and built. The approved plan and its rulings are summarized below. Do not reopen a settled ruling without the operator.

## Rules (binding)

1. **No app URL in any committed file.** Coverage, utilities, tier and level live in `apps.js`. URLs live only in a gitignored `apps.local.js` (template: `apps.local.example.js`), merged in when present. Public clicks show "Access by invitation".
   - End state, once every app is gated: each app opens to its own sign-in page.
   - Before every push, check with `git grep -nE "run\.app|github\.io|pages\.dev"`; it must return nothing.
2. **No PII anywhere:** copy, code, commits, screenshots or docs.
   - No personal names. App titles read "Decennial Energy Maps - Indiana", not a person's possessive.
   - No personal emails or phone numbers.
   - No parcel owner names in any screenshot. Indiana app renders can show them, so never reuse an app screenshot unchecked.
   - People are referred to by role: "the operator", "a teammate".
   - The GitHub username in the repo URL is unavoidable and acceptable.
3. **Reader-facing text:**
   - no emoji, no marker glyphs;
   - American spelling;
   - **headings are set in capitals** (operator ruling, 2026-10-22): every h1-h3, the hero headline, section titles, story stop titles and map names. Do this with CSS `text-transform: uppercase`, keeping the source text in title or sentence case so screen readers read words. Story stop titles are in title case in the source ("Distribution Feeder", "Data Center");
   - body text, labels and buttons stay in sentence case;
   - the set-in-type "DECENNIAL" wordmark is a brand mark.
4. **Design changes go through a branch with before/after screenshots** from the Playwright skill at 390x844, 1366x768 and 1440x900. They land on `main` only with the operator's approval.
5. **Git:**
   - Claude commits and pushes feature branches (`design/*`).
   - Merging to `main` publishes Pages, and needs the operator's approval in session.
   - End commit messages with the Co-Authored-By line the harness provides.
6. **Never claim:**
   - Hammond / Digital Crossroads, or any named development project or developer credential;
   - a roadmap or planned states;
   - testimonials, MW figures or customers.
   - Coverage shown must match `apps.js` exactly: full, partial or absent.
7. **Brand gold `#EBBE07` is never text on a light ground** (1.76:1 on white). Use it for lines, fills and energized states, or as text on ink only.

## Settled design inputs

- **Name:** "Decennial Energy Maps". The wordmark is "DECENNIAL", set in Work Sans; there is no logo image. The favicon is a gold-on-ink "D" SVG.
- **Copy:** headline "Megawatts before acres." One shared copy set lives in `options/shared/copy.js`.
- **Palette:** ink `#312439`, aubergine `#43314d`, gold `#EBBE07`, lilac `#efe8f4`, wash `#f7f5f9`. Each direction sets its own dark/light balance.
- **Sections:**
  - coverage map plus app directory;
  - large- vs small-scale siting (transmission vs distribution hosting capacity, under 25 MW);
  - a minimal footer: wordmark, "Internal to Decennial Group", the year.
- **Map:**
  - aubergine = parcel-level siting; lilac = hosting capacity; hatched = partial;
  - a single-state app opens directly, or shows the panel when it has no URL;
  - a multi-state app opens a panel listing its utilities in that state;
  - small Northeast states get callout chips; phones get a bottom sheet;
  - an accessible state list mirrors the map.
- **Motion concepts,** selected with `?v=`: `story` (power path you scroll through), `energize` (energized national map), `zoom` (transmission vs distribution toggle), `micro` (button morphs).
- **Quality floor:** WCAG 2.2 AA, keyboard access, a static view when reduced motion is on, and current evergreen browsers plus iOS Safari.
- **No** analytics, cookies or trackers. `robots.txt` disallows everything, and pages carry `noindex`.
- **Stack:** static HTML, CSS and JS with no build step. Pinned CDN versions: D3 7.9.0 (cdnjs), topojson-client 3.1.0 (jsdelivr). Map data is inlined as JS so pages open by double-click.

## Layout

- `options/`: the five design options from phase A. The board is `options/index.html`. All options share behavior from `options/shared/` (see `options/shared/README.md` for the contract).
- `options/shots/`: Playwright review captures, committed so the comparison is reproducible.
- **Phase B (from 2026-10-22).** The operator combined options C and D (isometric campus) into one final page:
  - D's energize: the hero energizes on load, and the coverage board energizes on first view;
  - C's scroll story, now seven stops: Generation, High-Voltage Transmission, Transmission Substation, Hyperscale Data Center (branching off the transmission substation), Distribution Feeder, Data Center (under 25 MW, on the feeder), Every Covered State.
- `final/shared/`: everything common to the final page (`page.js`, `page.css`, `iso-kit.js`, `copy-final.js`), plus `ART-CONTRACT.md`.
- `final/<set>/`: one page per artwork set, and the operator picks one as the final build:
  - `current`: the isometric drawings;
  - `lifelike-3d`: three.js;
  - `lifelike-illustrated`: realistic SVG;
  - `blueprint`: blueprint to built.
- After the pick, the chosen set moves to the repo root. The others are deleted and remain in history.
- The root `index.html` is the review front page that management opens. Earlier rounds live under `review/`.

## Tool guide: when and how to use each skill

The workflow runs in this order. The tools build on one another: frontend-design produces the first draft, Playwright verifies it, and Impeccable refines it.

1. **`/grill-me`** (project skill, `.claude/skills/grill-me` and `grilling`, MIT, mattpocock/skills). Use it at the start of any open design or product decision. It interviews in numbered rounds, each question with a recommended answer, and asks only the questions that are unblocked. Facts are looked up, never asked. Nothing is acted on until the operator confirms a shared understanding.
2. **frontend-design** (plugin, Anthropic). It loads automatically for UI work. Before writing code for a new section or direction, write the compact plan it asks for and check it against the brief, revising anything that reads as a generic default. The plan covers:
   - 4-6 named hex values;
   - type roles and scale;
   - an ASCII wireframe with alignment.
3. **Impeccable** (plugin, pbakaus, `/impeccable <command>`). The surface is in **Persuade** mode. The build path is `code` (`.impeccable/config.json`).
   - Run `impeccable context` once per session. On Windows: `"%USERPROFILE%\.claude\plugins\cache\impeccable\impeccable\4.6.0\skills\impeccable\scripts\impeccable.cmd" context`.
   - Read `reference/craft-floor.md` before any UI edit.
   - `shape <surface>` plans the UX of a new section before code.
   - `critique` and `audit` evaluate after each build pass.
   - `bolder`, `quieter`, `animate`, `delight`, `typeset`, `colorize` and `layout` tune one axis at a time.
   - `clarify` fixes copy; `adapt` handles phone layouts; `polish` is the final pass before a merge.
   - `document` writes DESIGN.md once the chosen direction is built.
   - `detect --json <files>` is the mechanical anti-pattern scan when its hook is not active.
4. **playwright-skill** (plugin, lackeyjb). Run it after every build pass.
   - Capture screenshots at 390x844, 1366x768 and 1440x900, plus mid-scroll frames for the motion concepts.
   - Check console errors, keyboard focus, and the reduced-motion view (`page.emulateMedia({ reducedMotion: 'reduce' })`).
   - Skill dir: `%USERPROFILE%\.claude\plugins\cache\playwright-skill\playwright-skill\5.0.0\skills\playwright-skill`. Run scripts with `node "<skill dir>/run.js" <script.js>`, using `PW_HEADLESS=true` and `PW_ARTIFACT_DIR` set to the project's `shots/` (gitignored) or `options/shots/` (committed review boards).
5. **Hand-off:** before/after screenshots → push the `design/*` branch → the operator approves the merge.

**Teammate setup:**
- The plugins are declared in `.claude/settings.json`: `enabledPlugins` plus `extraKnownMarketplaces` for impeccable and playwright-skill.
- On a fresh machine, run once from this folder:
  - `claude plugin install frontend-design@claude-plugins-official --scope project`
  - `claude plugin install impeccable@impeccable --scope project`
  - `claude plugin install playwright-skill@playwright-skill --scope project`
  - then `npm run setup` in the playwright skill dir. It needs Node 20+.
