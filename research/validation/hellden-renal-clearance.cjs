// Helldén 2010 thesis, preliminary Paper V, Figure 8, printed p. 21 (PDF p. 31).
// Source: https://files01.core.ac.uk/download/pdf/70338802.pdf
// Vector marker bounding-box midpoints digitized from the original PDF.
// Calibration in PDF points: X 131.88–375.00 = CrCl 0–250 mL/min;
// Y 322.34–176.54 = drug clearance 0–800 mL/min. Rounded values below
// are figure estimates, not author-supplied patient records. Near-origin
// marker centers are snapped to X=0 within 0.5 mL/min plotting resolution.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const total = [[115.2,307.2],[191.1,454.8],[167.2,363.1],[150.5,319.8],
  [181.1,411.5],[118.1,342.7],[61.3,156.7],[56.5,108.3],[46.5,108.3],
  [23.1,85.4],[39.9,111.0],[44.6,98.1],[0,67.5],[0,59.9],[0,59.9],[0,57.3]];
const renalParent = [[115.2,177.1],[191.1,284.1],[167.2,233.1],[150.5,235.7],
  [181.1,332.5],[118.1,166.9],[61.3,90.5],[56.5,80.3],[46.5,70.1],
  [23.1,49.7],[39.9,52.4],[44.6,59.9],[0,1.3]];
const renalMet = [[115.5,497.0],[191.3,616.6],[167.5,705.9],[150.8,738.9],
  [181.3,537.6],[118.3,394.9],[61.5,165.6],[56.8,211.5],[46.8,262.6],
  [23.4,198.7],[40.1,168.2],[44.9,183.6],[0,2.6]];
const sum = a => a.reduce((s, v) => s + v, 0);
function fit(rows, freeIntercept = false) {
  const xMean = freeIntercept ? sum(rows.map(r => r[0])) / rows.length : 0;
  const yMean = freeIntercept ? sum(rows.map(r => r[1])) / rows.length : 0;
  const xx = sum(rows.map(([x]) => (x - xMean) ** 2));
  const slope = sum(rows.map(([x,y]) => (x-xMean)*(y-yMean))) / xx;
  return {slope, intercept: yMean - slope*xMean, xx};
}
function renalSummary(rows) {
  const nonzero = rows.filter(([x]) => x > 0);
  const lower = nonzero.filter(([x]) => x < 70);
  const higher = nonzero.filter(([x]) => x >= 70);
  assert.equal(lower.length, 6);
  assert.equal(higher.length, 6);
  const full = fit(rows), low = fit(lower), high = fit(higher);
  const omit = rows.map((_, i) => fit(rows.filter((r,j) => i !== j)).slope);
  return {all: full.slope, lower: low.slope, higher: high.slope,
    highShareOfSumSquaredCrCl: high.xx / full.xx, omitOneRange: [Math.min(...omit), Math.max(...omit)]};
}
const source = {totalSlope: 2.0377, totalIntercept: 40.237, renalParentSlope: 1.5392, renalCmmgSlope: 3.7474};
const parentTotal = fit(total, true);
const parent = renalSummary(renalParent), cmmg = renalSummary(renalMet);
assert.ok(Math.abs(parentTotal.slope - source.totalSlope) < .03);
assert.ok(Math.abs(parentTotal.intercept - source.totalIntercept) < 3);
assert.ok(Math.abs(parent.all - source.renalParentSlope) < .03);
assert.ok(Math.abs(cmmg.all - source.renalCmmgSlope) < .03);
const model = [50,70,90].map(weight => {
  const config = {...engine.DEFAULTS, weight, renalMode: 'constant', crcl: 1, variability: 0, draws: 1};
  const p = engine.drawParams(config)[0];
  return {weight, renalParentSlope: p.renal/.06, renalCmmgSlope: p.mr/.06,
    parentNonrenalMlMin: (p.other+p.form)/.06};
});
console.log(JSON.stringify({source, parentTotal, parent, cmmg, model}, null, 2));
