'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  runTargetPerturbationCheck,
  runOutcomeRemovalCheck,
  runMaskedArmAudit,
  runRevealedArmSensitivityAudit,
  runChartObservationIndependenceAudit,
  assertValidForecastResult,
  assertValidWeightArray
} = require('../research/validation/cmmg-forecast-leakage-audit.cjs');
const {
  generatePatientForecast,
  fcCandidates,
  allPatientRecords,
  loadBaselineFrom5826d04,
  compareRecordsAgainstBaseline,
  verifyAgainstFrozen34bd374,
  verifyRecordsIntegrity,
  allSummaries,
  FULL_BASELINE_SHA,
  FROZEN_34BD374_SHA,
  ALL_8_METHODS_AND_WEIGHTS
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
  assert.throws(() => runTargetPerturbationCheck(leakyFuture), /Future-data leakage/);

  // 2. Leaked ACV into masked arm must throw
  const leakyMasked = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_CMMG += 0.05 * obs.measACV;
    return res;
  };
  assert.throws(() => runMaskedArmAudit(leakyMasked), /Masked arm leakage/);

  // 3. Blind revealed arm must throw
  const blindRevealed = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_Both = res.predER_CMMG;
    res.wBoth = res.wCMMG;
    res.predSU_Unw_Both = res.predSU_Unw_CMMG;
    res.predSU_Rew_Both = res.predSU_Rew_CMMG;
    return res;
  };
  assert.throws(() => runRevealedArmSensitivityAudit(blindRevealed), /Revealed arm blindness/);

  // 4. Leaked observation into chart history must throw
  const leakyChart = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predCH += 0.05 * obs.measCMMG;
    return res;
  };
  assert.throws(() => runChartObservationIndependenceAudit(leakyChart), /Chart history observation leak/);
});

test('Every leakage audit rejects non-finite or missing forecast values and malformed weight arrays injected via generator', () => {
  const auditFns = [
    { name: 'TargetPerturbationCheck', fn: runTargetPerturbationCheck },
    { name: 'OutcomeRemovalCheck', fn: runOutcomeRemovalCheck },
    { name: 'MaskedArmAudit', fn: runMaskedArmAudit },
    { name: 'RevealedArmSensitivityAudit', fn: runRevealedArmSensitivityAudit },
    { name: 'ChartObservationIndependenceAudit', fn: runChartObservationIndependenceAudit }
  ];

  for (const { name, fn } of auditFns) {
    // 1. Injected NaN forecast
    const genNaN = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.predER_Both = NaN;
      return res;
    };
    assert.throws(() => fn(genNaN), /Non-finite forecast value/, `${name} must reject NaN forecast`);

    // 2. Injected Infinity forecast
    const genInf = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.predCF = Infinity;
      return res;
    };
    assert.throws(() => fn(genInf), /Non-finite forecast value/, `${name} must reject Infinity forecast`);

    // 3. Injected missing forecast
    const genMissing = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      delete res.predCH;
      return res;
    };
    assert.throws(() => fn(genMissing), /Missing forecast value/, `${name} must reject missing forecast`);

    // 4. Injected malformed weight array (non-array)
    const genNonArrWeights = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wCMMG = 'not-an-array';
      return res;
    };
    assert.throws(() => fn(genNonArrWeights), /Malformed weight array/, `${name} must reject non-array weights`);

    // 5. Injected malformed weight array (NaN element)
    const genNaNWeights = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wBoth = res.wBoth.slice();
      res.wBoth[0] = NaN;
      return res;
    };
    assert.throws(() => fn(genNaNWeights), /Malformed weight array/, `${name} must reject NaN weight elements`);

    // 6. Injected malformed weight array (negative weight)
    const genNegWeights = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wCMMG = res.wCMMG.slice();
      res.wCMMG[0] = -0.1;
      return res;
    };
    assert.throws(() => fn(genNegWeights), /Malformed weight array/, `${name} must reject negative weights`);

    // 7. Injected malformed weight array (not summing to 1.0)
    const genUnnormWeights = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wBoth = res.wBoth.map(w => w * 2.0);
      return res;
    };
    assert.throws(() => fn(genUnnormWeights), /weights must sum to 1.0/, `${name} must reject unnormalized weights`);

    // 8. Injected appended-zero weight array on wCMMG
    const genAppendedZeroCMMG = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wCMMG = [...res.wCMMG, 0];
      return res;
    };
    assert.throws(() => fn(genAppendedZeroCMMG), /expected length/, `${name} must reject appended-zero wCMMG array`);

    // 9. Injected appended-zero weight array on wBoth
    const genAppendedZeroBoth = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      res.wBoth = [...res.wBoth, 0];
      return res;
    };
    assert.throws(() => fn(genAppendedZeroBoth), /expected length/, `${name} must reject appended-zero wBoth array`);

    // 10. Injected truncated-but-renormalized weight array on wCMMG
    const genTruncRenormCMMG = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      const trunc = res.wCMMG.slice(0, -1);
      const sum = trunc.reduce((acc, v) => acc + v, 0);
      res.wCMMG = trunc.map(v => v / sum);
      return res;
    };
    assert.throws(() => fn(genTruncRenormCMMG), /expected length/, `${name} must reject truncated-but-renormalized wCMMG array`);

    // 11. Injected truncated-but-renormalized weight array on wBoth
    const genTruncRenormBoth = (obs, ...args) => {
      const res = generatePatientForecast(obs, ...args);
      const trunc = res.wBoth.slice(0, -1);
      const sum = trunc.reduce((acc, v) => acc + v, 0);
      res.wBoth = trunc.map(v => v / sum);
      return res;
    };
    assert.throws(() => fn(genTruncRenormBoth), /expected length/, `${name} must reject truncated-but-renormalized wBoth array`);
  }
});

test('Weight array length validator strictly enforces M=400 for complete/hidden and 2M=800 for mixture on wCMMG and wBoth', () => {
  const M = fcCandidates.length; // 400
  const validM = new Array(M).fill(1 / M);
  const valid2M = new Array(2 * M).fill(1 / (2 * M));

  const validFC = {
    predCF: 2.0,
    predCH: 2.5,
    predER_CMMG: 2.2,
    predER_Both: 2.3,
    predSU_Unw_CMMG: 2.1,
    predSU_Unw_Both: 2.4,
    predSU_Rew_CMMG: 2.2,
    predSU_Rew_Both: 2.3,
    wH1: 1.0,
    wH2: 0.0,
    ess: 100,
    wCMMG: validM,
    wBoth: validM
  };

  // 1. Complete scenario: expects M=400
  assert.doesNotThrow(() => assertValidForecastResult(validFC, { mode: 'complete' }));

  // Appended-zero (M+1) on wCMMG
  const fcAppZeroCMMG_complete = { ...validFC, wCMMG: [...validM, 0] };
  assert.throws(
    () => assertValidForecastResult(fcAppZeroCMMG_complete, { mode: 'complete' }),
    /expected length 400, got 401/
  );

  // Appended-zero (M+1) on wBoth
  const fcAppZeroBoth_complete = { ...validFC, wBoth: [...validM, 0] };
  assert.throws(
    () => assertValidForecastResult(fcAppZeroBoth_complete, { mode: 'complete' }),
    /expected length 400, got 401/
  );

  // Truncated-but-renormalized (M-1) on wCMMG
  const truncCMMG_M = validM.slice(0, -1);
  const sumTruncCMMG_M = truncCMMG_M.reduce((a, b) => a + b, 0);
  const fcTruncCMMG_complete = { ...validFC, wCMMG: truncCMMG_M.map(w => w / sumTruncCMMG_M) };
  assert.throws(
    () => assertValidForecastResult(fcTruncCMMG_complete, { mode: 'complete' }),
    /expected length 400, got 399/
  );

  // Truncated-but-renormalized (M-1) on wBoth
  const truncBoth_M = validM.slice(0, -1);
  const sumTruncBoth_M = truncBoth_M.reduce((a, b) => a + b, 0);
  const fcTruncBoth_complete = { ...validFC, wBoth: truncBoth_M.map(w => w / sumTruncBoth_M) };
  assert.throws(
    () => assertValidForecastResult(fcTruncBoth_complete, { mode: 'complete' }),
    /expected length 400, got 399/
  );

  // Mixture-length (2M) passed to complete: must throw
  const fcMixtureLenInComplete = { ...validFC, wCMMG: valid2M, wBoth: valid2M };
  assert.throws(
    () => assertValidForecastResult(fcMixtureLenInComplete, { mode: 'complete' }),
    /expected length 400, got 800/
  );

  // 2. Hidden scenario: expects M=400
  assert.doesNotThrow(() => assertValidForecastResult(validFC, { mode: 'hidden' }));
  assert.throws(
    () => assertValidForecastResult(fcAppZeroCMMG_complete, { mode: 'hidden' }),
    /expected length 400, got 401/
  );
  assert.throws(
    () => assertValidForecastResult(fcTruncBoth_complete, { mode: 'hidden' }),
    /expected length 400, got 399/
  );

  // 3. Mixture scenario: expects 2M=800
  const validMixtureFC = {
    ...validFC,
    wH1: 0.5,
    wH2: 0.5,
    wCMMG: valid2M,
    wBoth: valid2M
  };
  assert.doesNotThrow(() => assertValidForecastResult(validMixtureFC, { mode: 'mixture' }));

  // Appended-zero (2M+1) on wCMMG
  const fcAppZeroCMMG_mixture = { ...validMixtureFC, wCMMG: [...valid2M, 0] };
  assert.throws(
    () => assertValidForecastResult(fcAppZeroCMMG_mixture, { mode: 'mixture' }),
    /expected length 800, got 801/
  );

  // Appended-zero (2M+1) on wBoth
  const fcAppZeroBoth_mixture = { ...validMixtureFC, wBoth: [...valid2M, 0] };
  assert.throws(
    () => assertValidForecastResult(fcAppZeroBoth_mixture, { mode: 'mixture' }),
    /expected length 800, got 801/
  );

  // Truncated-but-renormalized (2M-1) on wCMMG
  const truncCMMG_2M = valid2M.slice(0, -1);
  const sumTruncCMMG_2M = truncCMMG_2M.reduce((a, b) => a + b, 0);
  const fcTruncCMMG_mixture = { ...validMixtureFC, wCMMG: truncCMMG_2M.map(w => w / sumTruncCMMG_2M) };
  assert.throws(
    () => assertValidForecastResult(fcTruncCMMG_mixture, { mode: 'mixture' }),
    /expected length 800, got 799/
  );

  // Truncated-but-renormalized (2M-1) on wBoth
  const truncBoth_2M = valid2M.slice(0, -1);
  const sumTruncBoth_2M = truncBoth_2M.reduce((a, b) => a + b, 0);
  const fcTruncBoth_mixture = { ...validMixtureFC, wBoth: truncBoth_2M.map(w => w / sumTruncBoth_2M) };
  assert.throws(
    () => assertValidForecastResult(fcTruncBoth_mixture, { mode: 'mixture' }),
    /expected length 800, got 799/
  );

  // Complete-length (M) passed to mixture: must throw
  const fcCompleteLenInMixture = { ...validMixtureFC, wCMMG: validM, wBoth: validM };
  assert.throws(
    () => assertValidForecastResult(fcCompleteLenInMixture, { mode: 'mixture' }),
    /expected length 800, got 400/
  );
});

test('Baseline verification against frozen 5826d04 asserts row-by-row numerical identity and catches missing/altered baseline', () => {
  // 1. Positive control: loads from frozen 5826d041b53555e7fd199b123872175185c90458 and asserts all 6000 rows match row by row
  const baselineRecords = loadBaselineFrom5826d04(FULL_BASELINE_SHA);
  assert.equal(baselineRecords.length, 6000, 'Baseline must contain exactly 6000 records');
  const comparison = compareRecordsAgainstBaseline(allPatientRecords, baselineRecords);
  assert.equal(comparison.totalRows, 6000, 'All 6000 records must match row by row');
  assert.equal(comparison.bitForBitMatches, 144000, 'All 144,000 comparisons must be bit-for-bit identical');
  assert.equal(comparison.toleranceMatches, 144000, 'All 144,000 comparisons must match within tolerance (< 1e-12)');
  assert.ok(comparison.maxAbsDiff <= 1e-12, 'Max absolute difference must be <= 1e-12');

  // 2. Negative control: missing baseline fails explicitly with Error
  assert.throws(
    () => loadBaselineFrom5826d04('nonexistent_ref_missing_404'),
    /Baseline verification failed: required nonexistent_ref_missing_404 baseline data is unavailable/
  );

  // 3. Negative control: altered prediction fails row-by-row check
  const alteredPred = allPatientRecords.map(r => ({ ...r }));
  alteredPred[42].pred_su_unw_both = String(parseFloat(alteredPred[42].pred_su_unw_both) + 0.4);
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredPred, baselineRecords),
    /mismatch vs baseline/
  );

  // 4. Negative control: altered weight fails row-by-row check
  const alteredWeight = allPatientRecords.map(r => ({ ...r }));
  alteredWeight[500].w_H1 = String(parseFloat(alteredWeight[500].w_H1) + 0.2);
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredWeight, baselineRecords),
    /mismatch vs baseline/
  );

  // 5. Negative control: NaN value rejected before comparison
  const alteredNaN = allPatientRecords.map(r => ({ ...r }));
  alteredNaN[10].pred_er_cmmg = 'NaN';
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredNaN, baselineRecords),
    /invalid\/non-finite numeric output/
  );

  // 6. Negative control: Infinity value rejected before comparison
  const alteredInf = allPatientRecords.map(r => ({ ...r }));
  alteredInf[20].pred_su_unw_both = 'Infinity';
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredInf, baselineRecords),
    /invalid\/non-finite numeric output/
  );

  // 7. Negative control: Missing numeric output rejected before comparison
  const alteredMissing = allPatientRecords.map(r => ({ ...r }));
  delete alteredMissing[30].w_H1;
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredMissing, baselineRecords),
    /missing numeric output/
  );

  // 8. Negative control: Empty string numeric output rejected before comparison
  const alteredEmpty = allPatientRecords.map(r => ({ ...r }));
  alteredEmpty[40].ess = '   ';
  assert.throws(
    () => compareRecordsAgainstBaseline(alteredEmpty, baselineRecords),
    /missing numeric output/
  );
});

test('Integrity checks reject NaN, infinities, and missing numeric outputs before evaluation', () => {
  // 1. Missing target
  const r1 = allPatientRecords.map(r => ({ ...r }));
  r1[0].true_cmmg_target_mg_L = '';
  assert.throws(() => verifyRecordsIntegrity(r1, allSummaries), /missing numeric output/);

  // 2. NaN target
  const r2 = allPatientRecords.map(r => ({ ...r }));
  r2[0].true_cmmg_target_mg_L = 'NaN';
  assert.throws(() => verifyRecordsIntegrity(r2, allSummaries), /finite number/);

  // 3. Infinity prediction
  const r3 = allPatientRecords.map(r => ({ ...r }));
  r3[0].pred_cf = 'Infinity';
  assert.throws(() => verifyRecordsIntegrity(r3, allSummaries), /finite number/);

  // 4. Missing prediction
  const r4 = allPatientRecords.map(r => ({ ...r }));
  delete r4[0].pred_chart;
  assert.throws(() => verifyRecordsIntegrity(r4, allSummaries), /missing numeric output/);

  // 5. -Infinity signed error
  const r5 = allPatientRecords.map(r => ({ ...r }));
  r5[0].err_signed_er_both = '-Infinity';
  assert.throws(() => verifyRecordsIntegrity(r5, allSummaries), /finite number/);
});

test('Valid forecasts and weights remain unchanged against frozen 34bd374 across all 8 methods', () => {
  const comparison = verifyAgainstFrozen34bd374(allPatientRecords);
  assert.equal(comparison.totalRows, 6000, 'Must verify all 6000 records');
  assert.equal(comparison.totalFields, 27, 'Must verify all 27 fields across 8 methods + weights');
  assert.equal(comparison.bitForBitMatches, 162000, 'All 162,000 comparisons must be bit-for-bit identical');
  assert.equal(comparison.toleranceMatches, 162000, 'All 162,000 comparisons must match within tolerance (< 1e-12)');
  assert.ok(comparison.maxAbsDiff <= 1e-12, 'Maximum absolute difference must be <= 1e-12');
});
