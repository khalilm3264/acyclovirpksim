// Boulieu et al., Ther Drug Monit 1997, PMID 9421114, primary abstract.
// The abstract does not pair clearance, half-life, or average removal with patients.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const source = {peaks: [{mgKg: 5, every: 24, values: [9.3]}, {mgKg: 10, every: 48, values: [29.6,20.7]}],
  circuitCl: [17.4,22.3], terminalHours: [8.8,11.2], averageRemovedMgH: [6.7,13.0],
  sieving: [.92,.98]};

function simulate(mgKg, every, weight, crcl, circuitCl, dt) {
  // Supply the reported absolute extracorporeal clearance directly. An
  // equivalent 100%-delivered effluent input is not a reported machine flow.
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl, dose: mgKg * weight,
    every, doseCount: 5, infusion: 1, horizon: 5 * every, draws: 1, variability: 0,
    crclSource: 'manual', renalMode: 'constant', effluent: circuitCl * 60 / weight,
    sieving: 1, delivered: 1, trackMassBalance: true};
  assert.deepEqual(engine.validate(config, 'CRRT'), []);
  const p = engine.drawParams(config)[0];
  assert.ok(Math.abs(p.crrt / .06 - circuitCl) < 1e-10);
  const run = engine.single(config, p, engine.scheduleFor('CRRT',config),dt);
  const at = t => {const i=run.t.indexOf(t); assert.ok(i >= 0); return i;};
  const peak = n => run.cols.plasma[at((n - 1) * every + 1)];
  const mass = t => run.accounting[at(t)].parts.crrt;
  const averageRemoval = n => (mass(n * every) - mass((n - 1) * every)) / every;
  // Slow eigenvalue of the two-compartment parent equations with constant clearance.
  const elim = (p.renal + p.other + p.form + p.crrt) / p.vc;
  const k21 = p.q / p.vp, sum = elim + p.q / p.vc + k21;
  const slowRate = 2 * elim * k21 / (sum + Math.sqrt(sum ** 2 - 4 * elim * k21));
  const terminalHours = Math.LN2 / slowRate;
  const numericalLateHours = 6 * Math.LN2 / Math.log(run.cols.plasma[at(every-6)] / run.cols.plasma[at(every)]);
  assert.ok(Math.abs(terminalHours - numericalLateHours) < .001);
  return {firstPeak: peak(1), fifthPeak: peak(5), terminalHours,
    firstAverageRemoval: averageRemoval(1), fifthAverageRemoval: averageRemoval(5),
    fractionTotalClearance: p.crrt / (p.renal + p.other + p.form + p.crrt)};
}

const results = [];
for (const {mgKg,every} of source.peaks) {
  for (const weight of [50,70,90]) for (const crcl of [0,10]) {
    for (const circuitCl of source.circuitCl) {
      const result = simulate(mgKg,every,weight,crcl,circuitCl,.125);
      const fine = simulate(mgKg,every,weight,crcl,circuitCl,.0625);
      for (const key of Object.keys(fine)) assert.ok(Math.abs(result[key]-fine[key]) < .001, key);
      results.push({mgKg,every,weight,crcl,circuitCl,...fine});
    }
  }
}
console.log(JSON.stringify({source,results},null,2));
