'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runTargetPerturbationCheck,
  runOutcomeRemovalCheck,
  runMaskedArmAudit,
  runRevealedArmSensitivityAudit,
  runChartObservationIndependenceAudit
} = require('../research/validation/cmmg-forecast-leakage-audit.cjs');
const { generatePatientForecast } = require('../research/validation/cmmg-forecast-post-hd.cjs');

test('CMMG forecast pipeline exhibits no future-data leakage detected by target perturbation checks', () => {
  const n = runTargetPerturbationCheck(generatePatientForecast);
  assert.equal(n, 6000, 'Must verify all 6000 patient-scenario instances across all 4 conditions');
});

test('CMMG forecast pipeline executes cleanly and identically with future outcome removed', () => {
  const n = runOutcomeRemovalCheck(generatePatientForecast);
  assert.equal(n, 500, 'Must verify 500 virtual patients with stripped target');
});

test('Masked arm (CMMG-only) cannot access end-HD ACV and remains strictly invariant', () => {
  const n = runMaskedArmAudit(generatePatientForecast);
  assert.equal(n, 500, 'Must verify 500 virtual patients under ACV corruption');
});

test('Revealed arm (Both analytes) exhibits active sensitivity to end-HD ACV', () => {
  const n = runRevealedArmSensitivityAudit(generatePatientForecast);
  assert.equal(n, 100, 'Must verify revealed arm sensitivity');
});

test('Chart-history comparator is strictly invariant to end-HD observations (no leakage detected by observation independence check)', () => {
  const n = runChartObservationIndependenceAudit(generatePatientForecast);
  assert.equal(n, 500, 'Must verify 500 virtual patients under observation corruption');
});

test('Deliberate-failure negative controls catch target leakage, input leakage, blindness, and chart observation leakage', () => {
  // 1. Leaked future target must throw
  const leakyFuture = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    if (obs.trueCMMGAtTarget !== undefined) res.predER_CMMG += 0.05 * obs.trueCMMGAtTarget;
    return res;
  };
  assert.throws(() => runTargetPerturbationCheck(leakyFuture), /Future-data leakage detected/);

  // 2. Leaked ACV into masked arm must throw
  const leakyMasked = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_CMMG += 0.05 * obs.measACV;
    return res;
  };
  assert.throws(() => runMaskedArmAudit(leakyMasked), /Masked arm leakage detected/);

  // 3. Blind revealed arm must throw
  const blindRevealed = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_Both = res.predER_CMMG;
    res.wBoth = res.wCMMG;
    res.predSU_Unw_Both = res.predSU_Unw_CMMG;
    res.predSU_Rew_Both = res.predSU_Rew_CMMG;
    return res;
  };
  assert.throws(() => runRevealedArmSensitivityAudit(blindRevealed), /Revealed arm blindness detected/);

  // 4. Leaked observation into chart history must throw
  const leakyChart = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predCH += 0.05 * obs.measCMMG;
    return res;
  };
  assert.throws(() => runChartObservationIndependenceAudit(leakyChart), /Chart history observation leak detected/);
});
