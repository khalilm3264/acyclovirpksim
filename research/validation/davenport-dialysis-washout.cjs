// Research-only comparison, Davenport et al., Am J Kidney Dis 1992;20:647–649.
// doi:10.1016/S0272-6386(12)70234-2. Concentrations in blood/CSF are µmol/L.
// Case 1: 17 blood and 8.1 CSF at ~42 h after the last dose; blood 10
// after a further 96 h of PD. No measured residual CrCl or effluent mass.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const observedBlood = [17, 10];
const interval = 96;
const firstSample = 42;
const atEnd = firstSample + interval;
const pdRxRows = Array.from({length: 12}, (_, i) => ({start: 2*i, dwell: 2,
  fill: 1.5, glucose: 1.5, uf: null, sessionStart: null}));

function project(weight, crcl, dialysis, step) {
  // A unit IV input sets the distribution state before washout. Linear parent
  // disposition permits rescaling the 42 h concentration to the observed 17.
  // This is a terminal-shape check, not a reconstruction of oral ACV absorption.
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl, crclSource: 'manual',
    renalMode: 'constant', dosingMode: 'repeat', route: 'Acyclovir IV', dose: 1,
    infusion: 1, doseCount: 1, draws: 1, variability: 0, observations: [], horizon: atEnd,
    pdMethod: 'manual', pdRxEnabled: true, pdRxRows, trackMassBalance: true};
  const mode = dialysis ? 'Peritoneal dialysis' : 'No dialysis';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode, config), step);
  const start = run.t.indexOf(firstSample), end = run.t.indexOf(atEnd);
  assert.ok(start > 0 && end > start);
  assert.ok(Math.abs(run.accounting[end].residual) < 1e-8);
  if (dialysis) assert.equal(run.drains.filter(d => d.start >= firstSample && d.end <= atEnd).length, 48);
  const retained = run.cols.plasma[end] / run.cols.plasma[start];
  const projectedBlood = observedBlood[0] * retained;
  return {weight, crcl, dialysis, retained, projectedBlood,
    intervalHalfLife: -interval * Math.LN2 / Math.log(retained)};
}
const scenarios = [];
for (const weight of [50, 70, 90]) {
  for (const crcl of [0, 5]) {
    for (const dialysis of [true, false]) {
      const result = project(weight, crcl, dialysis, .125);
      const fine = project(weight, crcl, dialysis, .0625);
      assert.ok(Math.abs(result.projectedBlood / fine.projectedBlood - 1) < .001);
      scenarios.push(result);
    }
  }
}
// Case 2: on day 2 (~48 h after last dose), blood/CSF 13/6 before first HD.
// Three consecutive daily sessions: exact duration and sample delays unreported.
const case2 = [[13, 5], [8, 3], [5, 2]];
const cases = {
  case1: {observedBlood, csfBloodRatio: 8.1 / 17,
    intervalHalfLife: interval * Math.LN2 / Math.log(17 / 10), scenarios},
  case2: {csfBloodRatio: 6 / 13,
    sessionDropPct: case2.map(([before, after]) => 100 * (1 - after / before)),
    betweenSessionRisePct: case2.slice(1).map(([before], i) => 100 * (before / case2[i][1] - 1))}
};
console.log(JSON.stringify(cases, null, 2));
