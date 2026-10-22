/*
  Every word on the page. Rules: American spelling, no emoji, no marker glyphs, no claims beyond apps.js.
  Headings render in capitals through CSS; keep source text in sentence or title case so screen readers read words.
*/
window.DEM_COPY = {
  wordmark: "DECENNIAL",
  product: "Energy Maps",
  title: "Decennial Energy Maps",

  headline: "Megawatts before acres.",
  subhead: "Decennial Energy Maps shows where the grid has room for data centers, from high-voltage transmission to distribution feeders, state by state.",
  findLabel: "Find your state",
  findPlaceholder: "Choose a covered state",


  coverage: {
    heading: "Where the maps reach",
    // {apps} {states} are filled from apps.js
    intro: "{apps} maps cover {states}. Choose a state to open the map that covers it.",
    asOf: "Coverage as of {asof}.",
    listHeading: "Covered states",
    directoryHeading: "Every map"
  },

  legend: {
    siting: { label: "Parcel-level siting", text: "Grid, land, owner, community and incentive layers for every parcel." },
    hosting: { label: "Hosting capacity", text: "Utility-published distribution headroom, with transmission context." },
    partial: { label: "Partial", text: "Only some utility territories in the state are covered." }
  },

  tiers: { siting: "Parcel-level siting", hosting: "Hosting capacity" },
  levels: { parcel: "Parcel", transmission: "Transmission", distribution: "Distribution" },
  coverageWords: { full: "Statewide", partial: "Partial" },

  panel: {
    utilitiesLabel: "Utilities covered here",
    alsoCovers: "This map also covers",
    open: "Open {name}",
    opensToSignIn: "Opens to sign-in",
    invitation: "Access by invitation",
    close: "Close"
  },

  scales: {
    heading: "Large loads and small loads",
    intro: "A data center is sited by the power it can reach. The maps read the grid at both scales.",
    large: {
      label: "Transmission: large loads",
      title: "Large loads connect at high voltage",
      text: "Hyperscale campuses take power from a substation on the transmission system. The parcel-level apps read the headroom at each transmission bus, so a site is judged by the megawatts it can actually draw."
    },
    small: {
      label: "Distribution: small loads under 25 MW",
      title: "Small loads connect to a feeder",
      text: "Data centers under 25 MW can connect at distribution voltage. Where utilities publish hosting capacity, the maps show how much new load each feeder can take today."
    },
    note: "Hosting capacity exists only where utilities publish it, so distribution coverage follows utility territories, not state lines."
  },

  filter: { all: "All maps", siting: "Parcel-level siting", hosting: "Hosting capacity", label: "Show" },
  scaleToggle: { label: "Grid level", large: "Transmission", small: "Distribution" },

  /* The power path in six stops; the hyperscale campus branches off the transmission substation and the
     edge-computing data center comes later off a distribution feeder. Titles are in title case; CSS sets them in capitals. */
  story: [
    { id: "generation", title: "Generation", text: "Power starts at the plant, and the grid decides where it can go." },
    { id: "transmission", title: "High-Voltage Transmission", text: "Transmission lines carry it across the region at the highest voltages." },
    { id: "substation", title: "Transmission Substation", text: "Large loads connect here. Bus headroom says how many megawatts a new load can take before the grid needs upgrades." },
    { id: "hyperscale", title: "Hyperscale Data Center", text: "Hyperscale campuses branch off the transmission system at the substation, sited where the bus has room." },
    { id: "feeder", title: "Distribution Feeder", text: "Feeders step power down and carry it the last miles. Hosting capacity says how much new load each feeder can take." },
    { id: "datacenter", title: "Edge-Computing Data Center", text: "Edge-computing data centers, under 25 MW, connect to the distribution feeder rather than the transmission system, where the power already has room." }
  ],

  footer: { internal: "Internal to Decennial Group", year: "2026" }
};
