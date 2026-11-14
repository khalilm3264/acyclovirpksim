// Unita et al., J Infect Chemother 2023;29:1068–1070. doi:10.1016/j.jiac.2023.07.001.
// Figure 1, p. 1069. Coordinates (px) read in the original embedded 1033 × 718
// raster, origin upper left. Day-1, 2 and 3 HD lasted 4 hours, QB/QD 200/500 mL/min.
'use strict';
const assert = require('node:assert/strict');
const hour = x => (x - 362) * 72 / (1008 - 362);
const concentration = y => 10 ** (2 - (y - 143) * 3 / (599 - 143));
const pixels = [[362,182,201], [470,209,213], [578,289,306], [685,342,356],
  [744,442,451], [901,417,462], [955,515,null]];
const samples = pixels.map(([x, a, m]) => ({hour: hour(x), acv: concentration(a),
  cmmg: m === null ? null : concentration(m)}));
// Use the exact numerical values in the text wherever available.
assert.ok(Math.abs(samples[0].acv / 55 - 1) < .03);
assert.ok(Math.abs(samples[0].cmmg / 42 - 1) < .03);
assert.ok(Math.abs(samples.at(-1).acv / .36 - 1) < .03);
Object.assign(samples[0], {hour: 0, acv: 55, cmmg: 42});
Object.assign(samples.at(-1), {hour: 66, acv: .36, cmmgUpper: .1});
// Sampling windows contain each HD bar but begin before its start. No
// within-session start concentration is supplied for any of the three sessions.
const bars = [[542,578], [708,744], [919,955]];
const sessions = bars.map(([start, end], index) => {
  const before = samples[2 * index + 1], after = samples[2 * index + 2];
  assert.ok(hour(start) > before.hour && Math.abs(hour(end) - after.hour) < .2);
  const fall = (lo, hi) => 100 * (1 - hi / lo);
  // A ±3 px vertical reading sensitivity, not a confidence interval. The h12
  // symbols overlap, so their separation is less certain than the other pairs.
  const factor = 10 ** (3 * 3 / 456);
  const digitizedRange = (lo, hi, afterExact = false) => [
    fall(lo / factor, hi * (afterExact ? 1 : factor)),
    fall(lo * factor, hi / (afterExact ? 1 : factor))
  ];
  return {before, after, hdStart: hour(start), hdEnd: hour(end),
    beforeLeadHours: hour(start) - before.hour,
    acvFallPct: fall(before.acv, after.acv),
    acvPixelSensitivity: digitizedRange(before.acv, after.acv, index === 2),
    cmmgFallPct: after.cmmg === null ? null : fall(before.cmmg, after.cmmg),
    cmmgPixelSensitivity: after.cmmg === null ? null : digitizedRange(before.cmmg, after.cmmg),
    // At 66 h the authors report detectable and <0.1, not an exact concentration.
    cmmgFallGreaterThanPct: after.cmmg === null ? fall(before.cmmg, after.cmmgUpper) : null};
});
console.log(JSON.stringify({samples, sessions,
  nearAdmissionCsfToPlasma: {acv: 11/55, cmmg: .50/42, csfLagAfterPlasmaHours: 1},
  betweenSecondAndThirdAcvRisePct: 100 * (samples[5].acv / samples[4].acv - 1),
  betweenSecondAndThirdCmmgFallPct: 100 * (1 - samples[5].cmmg / samples[4].cmmg)
}, null, 2));
