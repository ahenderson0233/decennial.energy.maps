# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Static HTML, CSS and JavaScript with no build step, served by GitHub Pages from `main`. Libraries load from pinned CDN versions: D3 7, topojson-client 3, us-atlas 3. Work Sans comes from Google Fonts. No analytics, cookies or trackers.

## Users
- **Primary:** invited Decennial Group employees. About five people today, all of whom already hold logins to one or more of the siting apps. They arrive to open the right app for the state or utility territory they are siting in.
- **Within a year:** employees company-wide and teams at the holding companies within Decennial Group's purview. Many of them will not know what "hosting capacity" or "bus headroom" means, so the copy explains these plainly.

## Product Purpose
Decennial Energy Maps is the front door to a family of siting applications built for data center development:
- **Parcel-level siting apps** (Indiana; Illinois). They start from the grid and layer in land, owner likelihood to sell, bans and moratoria, incentives, water, environment and logistics.
- **Utility hosting-capacity maps** (Ohio, Dominion VA and NC, New York, New England, Mid-Atlantic, California). These map distribution-level headroom for small developments under 25 MW, alongside transmission context.

**Success** means a visitor lands, sees which states are covered and at what depth, and is one click from the right app. Along the way, they come away understanding how energy and data center siting meet.

## Positioning
The tools were built inside a real-asset developer for its own siting decisions, not sold by a data vendor. They are power-first and parcel-level, built to reach "no" quickly on weak sites so effort goes to strong ones. The coverage spans both scales: transmission for large loads and distribution hosting capacity for small ones.

## Operating Context
- **Every app sits behind its own sign-in page.** Indiana and Illinois run on Cloud Run with Google Identity Platform. The legacy maps are to be gated.
- **Every app is gated** (verified 2026-10-22). The page links each app's own sign-in page, from `data/apps.js`. Clicking a covered state opens a popup with the map's coverage, its utilities and an "Open <map> map" button, which opens the sign-in page in a new tab. No other app address is published.
- Coverage changes as apps ship. The page is data-driven from `apps.js`.

## Capabilities and Constraints
- **National coverage map.** Clicking a state routes to its app. A state with several apps, or an app spanning several states, opens a chooser. Partial coverage is marked.
- **Tiers:**
  - parcel-level siting: IN, IL;
  - hosting capacity: OH; VA, with NC partial; NY; MA, CT, RI and VT, with NH and ME partial; DC, MD and NJ, with DE and PA partial; CA.
- **Not on the page:**
  - roadmap or planned states;
  - a list of platform features;
  - principles copy;
  - contact or request-access copy;
  - any named development project or claim about Decennial as a developer.
- **Terminology:** "hosting capacity", "headroom", "transmission", "distribution", "large load", "parcel-level".

## Brand Commitments
- **Name:** "Decennial Energy Maps". The wordmark is "DECENNIAL", set in type; there is no logo image.
- **Colors:**
  - ink #312439
  - aubergine #43314d
  - gold #EBBE07: never used as text on a light background (1.76:1 on white)
  - lilac #efe8f4
  - wash #f7f5f9
- **Typeface:** Work Sans, matching decennialgroup.com, with tabular numerals for figures.
- **Headline:** "Megawatts before acres."
- **Subhead:** "Decennial Energy Maps shows where the grid has room for data centers, from high-voltage transmission to distribution feeders, state by state."
- **No personal names** anywhere in copy, titles, commits or screenshots. People are named by role.
- **Reader-facing text:** no emoji, no marker glyphs, no runs of capitals; American spelling.

## Evidence on Hand
- The coverage inventory: states and utilities per app, in `apps.js`.
- **No** screenshots of the apps are cleared for use: Indiana renders may show parcel owner names.
- **No** testimonials, customer names, MW figures, project names or deal claims. None may be fabricated.

## Product Principles
1. Route first: the right app is one click away from the national map.
2. Show coverage honestly: full, partial and absent are distinct, and nothing implies coverage that doesn't exist.
3. Energy is the subject: the story is where power and data centers meet, at both transmission and distribution scale.
4. Nothing internal leaks: no app URL, personal name or owner data in the public repo or on the page.

## Accessibility & Inclusion
WCAG 2.2 AA:
- full keyboard access to the map, including an accessible state list that mirrors it;
- a static presentation when the visitor's reduced-motion setting is on;
- support for current Chrome, Edge, Safari and Firefox, plus iOS Safari at phone width.
