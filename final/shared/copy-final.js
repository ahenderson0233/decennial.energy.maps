/*
  Final landing page copy: extends options/shared/copy.js (loaded first) without changing the options pages.
  Story: seven stops, with the hyperscale campus branching off the transmission substation and the smaller
  data center coming later off a distribution feeder. Titles are set in title case here; headings render in
  capitals through CSS so screen readers still read words normally.
  Rules: no claims beyond apps.js, no figures other than the 25 MW distribution threshold already in copy.js.
*/
(function () {
  var C = window.DEM_COPY;
  C.story = [
    { id: 'generation', title: 'Generation', text: 'Power starts at the plant, and the grid decides where it can go.' },
    { id: 'transmission', title: 'High-Voltage Transmission', text: 'Transmission lines carry it across the region at the highest voltages.' },
    { id: 'substation', title: 'Transmission Substation', text: 'Large loads connect here. Bus headroom says how many megawatts a new load can take before the grid needs upgrades.' },
    { id: 'hyperscale', title: 'Hyperscale Data Center', text: 'Hyperscale campuses branch off the transmission system at the substation, sited where the bus has room.' },
    { id: 'feeder', title: 'Distribution Feeder', text: 'Feeders step power down and carry it the last miles. Hosting capacity says how much new load each feeder can take.' },
    { id: 'datacenter', title: 'Data Center', text: 'Smaller data centers, under 25 MW, connect to a feeder where the power already has room.' },
    { id: 'coverage', title: 'Every Covered State', text: 'Each one opens to the map that covers it.' }
  ];
})();
