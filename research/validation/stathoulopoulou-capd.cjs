'use strict';

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const dose = 500;
const acyclovirEquivalent = dose * 225.21 / 324.34;

function run(crcl, weight, step) {
  const config = {
    ...engine.DEFAULTS, weight, crcl, crclSource: 'manual', renalMode: 'constant',
    route: 'Valacyclovir oral', dosingMode: 'repeat', dose, doseCount: 1,
    horizon: 24, draws: 1, variability: 0, trackMassBalance: true
  };
  const mode = 'Peritoneal dialysis';
  assert.deepEqual(engine.validate(config, mode), []);
  const output = engine.single(config, engine.drawParams(config)[0],
    engine.scheduleFor(mode, config), step, engine.buildDoses(config));
  const final = output.accounting.at(-1);
  assert.ok(Math.abs(final.residual) < 0.01, 'Mass balance');
  return { urine: final.parts.kidney, dialysate: final.parts.pdDrained };
}

console.log('| Weight (kg) | CrCl (mL/min) | Urine (mg) | Drained CAPD (mg) | Urine / tablet mass (%) | CAPD / tablet mass (%) | Urine / ACV equivalent (%) | CAPD / ACV equivalent (%) |');
console.log('|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const weight of [50, 70, 90]) {
  for (const crcl of [0, 0.5, 1, 2, 5, 10]) {
    const main = run(crcl, weight, 0.125);
    const fine = run(crcl, weight, 0.0625);
    for (const key of ['urine', 'dialysate']) {
      assert.ok(Math.abs(main[key] - fine[key]) < 0.001, 'Step convergence');
    }
    const values = [weight, crcl, main.urine, main.dialysate,
      100 * main.urine / dose, 100 * main.dialysate / dose,
      100 * main.urine / acyclovirEquivalent, 100 * main.dialysate / acyclovirEquivalent];
    console.log('| ' + values.map(value => value.toFixed(2)).join(' | ') + ' |');
  }
}
