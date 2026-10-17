/*
  One shared copy set for every design option, so the comparison is about the visuals, not the words.
  Rules: sentence case, American spelling, no emoji, no marker glyphs, no runs of capitals
  (the DECENNIAL wordmark is the one exception), no claims beyond apps.js.
*/
window.DEM_COPY = {
  wordmark: "DECENNIAL",
  product: "Energy Maps",
  title: "Decennial Energy Maps",

  headline: "Megawatts before acres.",
  subhead: "Decennial Energy Maps shows where the grid has room for data centers, from high-voltage transmission to distribution feeders, state by state.",
  findLabel: "Find your state",
  findPlaceholder: "Choose a covered state",

  nav: { coverage: "Coverage", scales: "Large and small loads" },

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

  story: [
    { id: "generation", title: "Generation", text: "Power starts at the plant, and the grid decides where it can go." },
    { id: "transmission", title: "High-voltage transmission", text: "Transmission lines carry it across the region. Large loads connect here." },
    { id: "substation", title: "Substation", text: "Bus headroom says how many megawatts a new load can take before the grid needs upgrades." },
    { id: "feeder", title: "Distribution feeder", text: "Feeders carry power the last miles. Hosting capacity says how much a feeder can take, the room a data center under 25 MW needs." },
    { id: "datahall", title: "The data hall", text: "The load itself, sited where the power already has room." },
    { id: "coverage", title: "Every covered state", text: "Each one opens to the map that covers it." }
  ],

  footer: { internal: "Internal to Decennial Group", year: "2026" }
};
