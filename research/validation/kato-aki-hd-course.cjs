// Kato et al., CEN Case Reports 2023, doi:10.1007/s13730-022-00748-5.
// Figure 3 p. 224: labeled ACV concentrations (µg/mL) and creatinine (mg/dL).
// Approximate hours from plotted abscissas (labeled ticks at 1, 10, …, 91 h).
// Exact clinical timestamps, dialyzer clearances and effluent mass are unavailable.
'use strict';
const assert = require('node:assert/strict');
const samples = [
  {hour: 1, acv: 44.074, scr: 4.63}, {hour: 5, acv: 36.314},
  {hour: 29, acv: 18.492, scr: 6.29}, {hour: 35, acv: 7.800, scr: 2.89},
  {hour: 57, acv: 4.049, scr: 4.55}, {hour: 61, acv: 1.809, scr: 2.09},
  {hour: 85, acv: .196}, {hour: 88, acv: .105, scr: 1.08}
];
const sessions = [[2, 3], [4, 5], [6, 7]].map(([i, j]) => {
  const before = samples[i], after = samples[j];
  return {before, after, plasmaFallPct: 100 * (1 - after.acv / before.acv)};
});
const between = [[0, 2], [3, 4], [5, 6]].map(([i, j]) => {
  const before = samples[i], after = samples[j];
  const logRatio = Math.log(before.acv / after.acv);
  const interval = after.hour - before.hour;
  // Conservative illustrative ±1 h uncertainty at each endpoint (±2 h
  // for the interval); a digitization sensitivity rather than a statistical CI.
  return {before, after, interval, apparentHalfLife: interval * Math.LN2 / logRatio,
    timingSensitivity: [interval - 2, interval + 2].map(h => h * Math.LN2 / logRatio)};
});
assert.ok(sessions.every(s => s.plasmaFallPct > 46 && s.plasmaFallPct < 59));
console.log(JSON.stringify({sessions, between}, null, 2));
// The apparent half-lives describe observed intervals during changing renal
// function and after HD. Absorption, redistribution and recovery may contribute.
// The first HD pair lacks a closely timed post-disconnect follow-up; neither
// a rebound magnitude nor a percentage of body drug mass can be recovered here.
