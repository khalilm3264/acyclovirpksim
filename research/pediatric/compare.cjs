'use strict';
const fs = require('node:fs');
const path = require('node:path');
const abdalla = require('../../public/research/pediatric/model.js');
// Unit conversion only: this does not reconcile Counahan and historical Schwartz estimates.
const toZengUnits = indexed => indexed * 60 / 1000 / 1.73;
function zengParameters(weight, indexed) {
  const renal = toZengUnits(indexed);
  if (!Number.isFinite(weight) || weight < 7.3 || weight > 70.2 || !Number.isFinite(renal) || renal < 2 || renal > 5.7) throw new RangeError('Outside Zeng observed weight or renal range.');
  return { cl: 3.55 * (weight / 19.6) ** 0.75 * (renal / 3.7) ** 0.51, v: 7.36 * weight / 19.6 };
}
function compare() {
  return [10, 19.6, 40].flatMap(weight => [90, 120, 160].map(egfr => {
    const c = { ...abdalla.defaults, weight, egfr };
    return { weightKg: weight, indexedRenalMlMin173: egfr, zengRenalLHourM2: toZengUnits(egfr), doseMgKg: c.dose, intervalHours: c.interval, infusionHours: c.infusion,
      abdalla: abdalla.summary(c), zeng: abdalla.summary(c, zengParameters(weight, egfr)) };
  }));
}
if (require.main === module) fs.writeFileSync(path.join(__dirname, 'model-comparison.json'), JSON.stringify({
  sources: ['10.1128/AAC.01426-20', '10.1128/AAC.01138-08'],
  interpretation: 'Typical IV predictions at equal numerical indexed renal inputs, not equal physiologic renal function. Different renal estimators and populations; no patient validation, random effects, or efficacy targets. Peaks and troughs are theoretical steady state.',
  rows: compare()
}, null, 2) + '\n');
module.exports = { toZengUnits, zengParameters, compare };
