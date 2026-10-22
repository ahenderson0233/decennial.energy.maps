/*
  Decennial Energy Maps: coverage inventory.
  Committed and public. NO URLS here, ever: they live in apps.local.js (gitignored).

  tier:      "siting"  = parcel-level siting app (grid, land, owner, community, incentives)
             "hosting" = utility hosting-capacity map (distribution headroom + transmission context)
  levels:    which grid levels the app maps: "parcel", "transmission", "distribution"
  scale:     "large" = large-load siting at the transmission bus; "small" = distribution feeders under 25 MW
  states:    per-state coverage. "full" = the state's utility territories are covered;
             "partial" = only some utility territories in the state are covered.
  Sources: each app's own page and repo (checked 2026-10-17).
*/
window.DEM_APPS = [
  {
    id: "indiana",
    name: "Indiana",
    fullName: "Decennial Energy Maps - Indiana",
    tier: "siting",
    levels: ["parcel", "transmission"],
    scale: ["large"],
    states: [{ code: "IN", coverage: "full", utilities: ["Statewide, across MISO and PJM"] }]
  },
  {
    id: "illinois",
    name: "Illinois",
    fullName: "Decennial Energy Maps - Illinois",
    tier: "siting",
    levels: ["parcel", "transmission", "distribution"],
    scale: ["large", "small"],
    states: [{ code: "IL", coverage: "full", utilities: ["ComEd", "Ameren Illinois"] }]
  },
  {
    id: "ohio",
    name: "Ohio",
    fullName: "Decennial Energy Maps - Ohio",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [{
      code: "OH", coverage: "full",
      utilities: ["AEP Ohio", "Ohio Edison", "The Illuminating Company", "Toledo Edison", "AES Ohio", "Duke Energy Ohio"]
    }]
  },
  {
    id: "dominion",
    name: "Dominion",
    fullName: "Decennial Energy Maps - Dominion",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [
      { code: "VA", coverage: "partial", utilities: ["Dominion Energy Virginia"] },
      { code: "NC", coverage: "partial", utilities: ["Dominion Energy North Carolina"] }
    ]
  },
  {
    id: "new-york",
    name: "New York",
    fullName: "Decennial Energy Maps - New York",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [{
      code: "NY", coverage: "full",
      utilities: ["Con Edison", "Orange and Rockland", "NYSEG", "RG&E", "National Grid", "Central Hudson"]
    }]
  },
  {
    id: "new-england",
    name: "New England",
    fullName: "Decennial Energy Maps - New England",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [
      { code: "MA", coverage: "full", utilities: ["Eversource", "National Grid"] },
      { code: "CT", coverage: "full", utilities: ["Eversource", "United Illuminating"] },
      { code: "RI", coverage: "full", utilities: ["Rhode Island Energy"] },
      { code: "VT", coverage: "full", utilities: ["Green Mountain Power", "Burlington Electric", "Vermont Electric Cooperative"] },
      { code: "NH", coverage: "partial", utilities: ["Eversource", "Liberty"] },
      { code: "ME", coverage: "partial", utilities: ["Central Maine Power"] }
    ]
  },
  {
    id: "mid-atlantic",
    name: "Mid-Atlantic",
    fullName: "Decennial Energy Maps - Mid-Atlantic",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [
      { code: "DC", coverage: "full", utilities: ["Pepco"] },
      { code: "MD", coverage: "full", utilities: ["Pepco", "Delmarva Power", "BGE", "Potomac Edison"] },
      { code: "NJ", coverage: "full", utilities: ["Atlantic City Electric", "JCP&L", "PSE&G", "Rockland Electric"] },
      { code: "DE", coverage: "partial", utilities: ["Delmarva Power"] },
      { code: "PA", coverage: "partial", utilities: ["PECO"] }
    ]
  },
  {
    id: "california",
    name: "California",
    fullName: "Decennial Energy Maps - California",
    tier: "hosting",
    levels: ["distribution", "transmission"],
    scale: ["small"],
    states: [{ code: "CA", coverage: "full", utilities: ["PG&E", "SCE", "SDG&E", "LADWP", "SMUD"] }]
  }
];

/* Month and year the inventory above was last checked against the apps. */
window.DEM_COVERAGE_ASOF = "October 2026";
