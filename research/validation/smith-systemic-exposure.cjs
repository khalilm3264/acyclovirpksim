// Smith et al. 2010, doi:10.1128/AAC.00729-09, Methods and Table 1.
// Compare circulating parent and metabolite over the fifth dosing interval.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const {cases} = require('../../public/assets/literature-cases.js');
const source = {
  'smith-normal': {n: 6, parent: 137, cmmg: 17},
  'smith-ckd': {n: 3, parent: 577, cmmg: 148}
};
const samples = [0, .5, 1, 1.5, 2, 3, 4, 6, 8, 12];
const microMolarPerMgL = {plasma: 1000 / 225.21, cmmg: 1000 / 239.19};
const mean = numbers => numbers.reduce((sum, value) => sum + value, 0) / numbers.length;

function estimate(study, weight, crcl, coefficient, dt) {
  const config = {...study.config, weight, crcl};
  // Paper V's fitted CLr / CrCl is an absolute slope. Set it directly at
  // each weight, rather than multiplying the reported slope by allometry.
  if (coefficient !== null) config.metRenal = coefficient / (2 * (weight / 70) ** .75);
  assert.deepEqual(engine.validate(config, study.mode), []);
  const p = engine.drawParams(config)[0];
  if (coefficient !== null) assert.ok(Math.abs(p.mr / (crcl * .06) - coefficient) < 1e-10);
  const run = engine.single(config, p, [], dt);
  const [start, end] = study.interval;
  const times = samples.filter(t => t <= end - start).map(t => start + t);
  function integrate(analyte) {
    const concentrations = times.map(t => {
      const i = run.t.indexOf(t);
      assert.ok(i >= 0);
      return run.cols[analyte][i] * microMolarPerMgL[analyte];
    });
    return times.slice(1).reduce((sum, t, i) => sum +
      (t - times[i]) * (concentrations[i] + concentrations[i + 1]) / 2, 0);
  }
  const parent = integrate('plasma'), cmmg = integrate('cmmg');
  return {parent, cmmg, ratio: cmmg / parent};
}

const rows = [];
for (const study of cases().filter(row => Object.hasOwn(source, row.id))) {
  const obs = source[study.id];
  // CKD participant clearances are reported individually without linkable AUCs.
  const sets = study.id === 'smith-ckd' ? [[26], [17, 30, 31]] : [[111]];
  for (const weight of [50, 70, 90]) {
    for (const crcls of sets) {
      for (const coefficient of [null, 3.7474]) {
        const results = crcls.map(crcl => {
          const main = estimate(study, weight, crcl, coefficient, .0625);
          const fine = estimate(study, weight, crcl, coefficient, .03125);
          for (const key of ['parent', 'cmmg']) assert.ok(Math.abs(main[key] / fine[key] - 1) < .0001);
          return main;
        });
        const parent = mean(results.map(r => r.parent)), cmmg = mean(results.map(r => r.cmmg));
        rows.push({id: study.id, weight, crcls, coefficient, parent, cmmg,
          ratioOfMeans: cmmg / parent, observedRatioOfMeans: obs.cmmg / obs.parent,
          parentFold: parent / obs.parent, cmmgFold: cmmg / obs.cmmg});
      }
    }
  }
}
assert.equal(rows.length, 18);
console.log(JSON.stringify({units: 'µmol·h/L', source, rows}, null, 2));
