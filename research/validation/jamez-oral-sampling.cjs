// Direct oral acyclovir. Jamez et al. 2026 case 2; Almond 1995 Table 3.
// Pure sampling-time sensitivity: extrapolate a measured level under an imposed
// off-dialysis terminal slope. No AyFlux dosing route or patient clearance fit.
'use strict';
const assert = require('node:assert/strict');
const observedMgL = 4.4, sampleLagH = 7, assumedNextDoseLagH = 12;
const intervalH = assumedNextDoseLagH - sampleLagH;
const terminalHours = [18.2,42.8,10.0,18.1,25.5,15.1,11.9];
const mean = terminalHours.reduce((s,h) => s+h,0) / terminalHours.length;
const sem = Math.sqrt(terminalHours.reduce((s,h) => s+(h-mean)**2,0) /
  (terminalHours.length * (terminalHours.length - 1)));
assert.equal(mean.toFixed(1), '20.2');
assert.equal(sem.toFixed(1), '4.2'); // Printed Table 3 summary gives 4.6 h.
const at12 = h => observedMgL * Math.pow(2, -intervalH/h);
const results = terminalHours.map((halfLife,i) => ({almondId:i+1, halfLife,
  projectedMgL:at12(halfLife), fractionOfSevenHourValue:at12(halfLife)/observedMgL}));
console.log(JSON.stringify({observedMgL, sampleLagH, assumedNextDoseLagH, intervalH,
  measuredMicromolL: observedMgL * 1000 / 225.21, mean, sem,
  projectedAtMeanHalfLife:at12(mean), results}, null, 2));
