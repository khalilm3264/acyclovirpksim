// node research/validation/laskin-fitted-distribution.cjs
// Laskin et al., Clin Pharmacol Ther 1982, doi:10.1038/clpt.1982.83.
// Tables I (p. 595) and II (pp. 598–599) report fitted disposition parameters.
// Columns: weight kg, BSA m², V1 L/1.73 m², k12, k21, kel, kdial (all h⁻¹).
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const subjects = [
  [74.0, 1.90, 20.80, .300, .383, .059, .191],
  [57.0, 1.65, 9.73, 1.650, .500, .214, .588],
  [48.0, 1.52, 19.50, .563, .448, .099, .234],
  [52.9, 1.60, 25.49, .133, .203, .100, .208],
  [50.1, 1.51, 12.49, 1.900, .812, .112, .427],
  [63.2, 1.80, 3.63, 1.940, .192, .299, 1.607]
];
const hours = [1, 2, 8, 12, 24, 48, 54, 54.25, 54.5, 55, 55.5];
// Predialysis group means from companion Am J Med Table I,
// doi:10.1016/0002-9343(82)90090-0. End-HD arterial mean from CPT Table III.
// Post-HD lags vary by patient. No common post-HD clock time was observed.
const measured = [37.5, 17.6, 10.3, 8.9, 6.4, 2.74, 1.00];

function profile(subject, fitted, dt) {
  const [weight, bsa, indexedV1, k12, k21, kel, kdial] = subject;
  const config = {...structuredClone(engine.DEFAULTS), weight, crcl: 0,
    renalMode: 'constant', crclSource: 'manual', route: 'Acyclovir IV',
    dose: 2.5 * weight, infusion: 1, dosingMode: 'repeat', doseCount: 1,
    variability: 0, draws: 1, observations: [], horizon: 56, hdCl: 81.8,
    schedule: [{type: 'HD', start: 48, end: 54}]};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const p = engine.drawParams(config)[0];
  if (fitted) {
    p.vc = indexedV1 * bsa / 1.73;
    p.q = k12 * p.vc;
    p.vp = p.q / k21;
    p.hd = kdial * p.vc;
    // The source fits total interdialytic ACV elimination, with no
    // metabolite partition. Only parent plasma concentrations are compared.
    p.other = kel * p.vc;
    p.form = 0;
  }
  const run = engine.single(config, p, engine.scheduleFor(mode, config), dt);
  return hours.map(hour => {
    const index = run.t.indexOf(hour);
    assert.ok(index >= 0);
    return run.cols.plasma[index] / .22521;
  });
}
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
if (require.main === module) {
  const output = {hours, measured, units: 'µmol/L'};
  for (const [name, fitted] of [['default', false], ['sourceFit', true]]) {
    const profiles = subjects.map(subject => {
      const curve = profile(subject, fitted, 1 / 32);
      const fine = profile(subject, fitted, 1 / 64);
      curve.forEach((value, i) => assert.ok(Math.abs(value - fine[i]) < .0001));
      return curve;
    });
    output[name] = {profiles, mean: hours.map((_, i) => mean(profiles.map(curve => curve[i])))};
  }
  console.log(JSON.stringify(output, null, 2));
}
module.exports = {subjects,hours,profile};
