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
const {
  generatePatientForecast,
  allPatientRecords,
  loadBaselineFrom5826d04,
  compareRecordsAgainstBaseline
} = require('../research/validation/cmmg-forecast-post-hd.cjs');

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

test('Baseline verification against frozen 5826d04 asserts row-by-row numerical identity and catches missing/altered baseline', () => {
  // 1. Positive control: loads from frozen 5826d04 and asserts all 6000 rows match row by row
  const baselineRecords = loadBaselineFrom5826d04('5826d04');
  assert.equal(baselineRecords.length, 6000, 'Baseline must contain exactly 6000 records');
  const nChecked = compareRecordsAgainstBaseline(allPatientRecords, baselineRecords);
  assert.equal(nChecked, 6000, 'All 6000 records must match row by row');

  // 2. Negative control: missing baseline fails explicitly with Error
  assert.throws(
    () => loadBaselineFrom5826d04('nonexistent_ref_missing_404'),
    /Baseline verification failed: required 5826d04 baseline data is unavailable/
  );

  // 3. Negative control: altered prediction fails row-by-row check
  const alteredPred = allPatientRecords.map(r => ({ ...r }));
  alteredPred[42].pred_su_unw_both = String(parseFloat(alteredPred[42].pred_su_unw_both) + 0.4);
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredPred, baselineRecords),
    /mismatch vs 5826d04 baseline/
  );

  // 4. Negative control: altered weight fails row-by-row check
  const alteredWeight = allPatientRecords.map(r => ({ ...r }));
  alteredWeight[500].w_H1 = String(parseFloat(alteredWeight[500].w_H1) + 0.2);
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredWeight, baselineRecords),
    /mismatch vs 5826d04 baseline/
  );
});
