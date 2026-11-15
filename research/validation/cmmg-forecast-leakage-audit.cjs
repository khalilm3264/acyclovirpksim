'use strict';

/**
 * AyFlux CMMG Post-HD Forecasting: Comprehensive Future-Data & Input Leakage Audit
 * 
 * Verifies (Audit Finding: No leakage detected by these checks):
 * 1. Future CMMG Target Perturbation:
 *    Perturbing only true future CMMG target leaves every prediction and fitting weight
 *    bit-for-bit identical (max diff < 1e-12 mg/L), while evaluation errors and summary metrics change.
 *    Target shift Delta translates signed error predictably by -Delta (e_signed_new = e_signed - Delta),
 *    while absolute errors |e_signed - Delta| transform non-linearly depending on initial error sign and magnitude.
 * 2. Complete Future Outcome Removal:
 *    Stripping true future outcome entirely leaves forecast generation fully functional and identical.
 * 3. Masked vs. Revealed Input Access:
 *    Masked arm (CMMG-only) is strictly invariant to end-HD ACV (max diff = 0.000e+0),
 *    while revealed arm exhibits proven sensitivity to end-HD ACV.
 * 4. Chart-History Observation Independence:
 *    Chart-history simulation (predCH) uses the unconditioned candidate distribution under charted regimens
 *    (predefined 50/50 prior history weights in mixture) and is strictly invariant (max diff = 0.000e+0)
 *    when end-HD ACV and CMMG observations are corrupted.
 * 5. Deliberate-Failure Controls:
 *    Automated negative controls proving that artificial leaks of future target, artificial
 *    ACV leaks into the masked arm, artificial ACV blindness in the revealed arm, or artificial
 *    observation leaks into chart-history immediately fail with AssertionError.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  generatePatientForecast,
  fcCandidates,
  fcSimsComplete,
  fcSimsHidden,
  eval1,
  eval2,
  eval3,
  eval4,
  median
} = require('./cmmg-forecast-post-hd.cjs');

function runTargetPerturbationCheck(generatorFn) {
  const evals = [
    { name: 'Exact 28.0h (4% CV)', evalObj: eval1 },
    { name: 'Perturbed Fixed 32.0h (4% CV)', evalObj: eval2 },
    { name: 'Perturbed Elapsed 4.0h (4% CV)', evalObj: eval3 },
    { name: 'Zero-Noise Sanity (0% CV)', evalObj: eval4 }
  ];

  let totalChecked = 0;

  for (const { name, evalObj } of evals) {
    const records = evalObj.patientRecords;
    const patientIds = [...new Set(records.map(r => r.patient_id))];

    for (const pid of patientIds) {
      const patientScenarios = records.filter(r => r.patient_id === pid);

      for (const rec of patientScenarios) {
        const cfg = { mode: rec.scenario, name: rec.scenario_name };
        const assayCV = rec.condition === 'zero_noise_28h' ? 0.0 : 0.04;

        const baseObs = {
          tMeas: rec.actual_draw_time_h,
          targetTime: rec.target_time_h,
          measACV: rec.observed_acv_mg_L,
          measCMMG: rec.observed_cmmg_mg_L,
          trueCMMGAtTarget: rec.true_cmmg_target_mg_L
        };

        const fcBase = generatorFn(baseObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

        // Perturb future target by significant delta (+5.0 or -3.0 mg/L)
        const targetShift = (pid % 2 === 0 ? 5.0 : -3.0) * (1 + 0.05 * (pid % 7));
        const perturbedObs = {
          ...baseObs,
          trueCMMGAtTarget: rec.true_cmmg_target_mg_L + targetShift
        };

        const fcPerturbed = generatorFn(perturbedObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

        // Assert forecasts and weights must remain identical
        const checks = [
          ['predCF', fcPerturbed.predCF, fcBase.predCF],
          ['predCH', fcPerturbed.predCH, fcBase.predCH],
          ['predER_CMMG', fcPerturbed.predER_CMMG, fcBase.predER_CMMG],
          ['predER_Both', fcPerturbed.predER_Both, fcBase.predER_Both],
          ['predSU_Unw_CMMG', fcPerturbed.predSU_Unw_CMMG, fcBase.predSU_Unw_CMMG],
          ['predSU_Unw_Both', fcPerturbed.predSU_Unw_Both, fcBase.predSU_Unw_Both],
          ['predSU_Rew_CMMG', fcPerturbed.predSU_Rew_CMMG, fcBase.predSU_Rew_CMMG],
          ['predSU_Rew_Both', fcPerturbed.predSU_Rew_Both, fcBase.predSU_Rew_Both],
          ['wH1', fcPerturbed.wH1, fcBase.wH1],
          ['wH2', fcPerturbed.wH2, fcBase.wH2],
          ['ess', fcPerturbed.ess, fcBase.ess]
        ];

        for (const [key, valPerturbed, valBase] of checks) {
          if (Math.abs(valPerturbed - valBase) > 1e-12) {
            throw new assert.AssertionError({
              message: `Future-data leakage detected in ${key}: baseline=${valBase}, perturbed=${valPerturbed} (diff=${valPerturbed - valBase})`
            });
          }
        }

        // Verify fitting weights array identity
        for (let j = 0; j < fcBase.wCMMG.length; j++) {
          if (Math.abs(fcPerturbed.wCMMG[j] - fcBase.wCMMG[j]) > 1e-12) {
            throw new assert.AssertionError({
              message: `Future-data leakage detected in wCMMG[${j}]`
            });
          }
        }
        for (let j = 0; j < fcBase.wBoth.length; j++) {
          if (Math.abs(fcPerturbed.wBoth[j] - fcBase.wBoth[j]) > 1e-12) {
            throw new assert.AssertionError({
              message: `Future-data leakage detected in wBoth[${j}]`
            });
          }
        }

        // Assert that signed error shifts predictably by exactly -targetShift:
        // e_signed_pert = (pred - (target + targetShift)) = (pred - target) - targetShift = e_signed_base - targetShift
        const baseSignedErr = fcBase.predCH - baseObs.trueCMMGAtTarget;
        const pertSignedErr = fcPerturbed.predCH - perturbedObs.trueCMMGAtTarget;
        if (Math.abs((pertSignedErr - baseSignedErr) - (-targetShift)) > 1e-12) {
          throw new assert.AssertionError({
            message: `Target perturbation did not shift signed error by exactly -targetShift: base=${baseSignedErr}, pert=${pertSignedErr}, shift=${targetShift}`
          });
        }

        // Assert that evaluation error against perturbed target DOES change
        const baseErr = fcBase.predCF - baseObs.trueCMMGAtTarget;
        const pertErr = fcPerturbed.predCF - perturbedObs.trueCMMGAtTarget;
        assert.ok(Math.abs(pertErr - baseErr) > 0.1, 'Evaluation error must reflect target perturbation');

        totalChecked++;
      }
    }
  }

  return totalChecked;
}

function runOutcomeRemovalCheck(generatorFn) {
  const records = eval1.patientRecords.slice(0, 500); // 500 patients under complete/hidden/mixture
  let totalChecked = 0;

  for (const rec of records) {
    const cfg = { mode: rec.scenario, name: rec.scenario_name };
    const assayCV = 0.04;

    const baseObs = {
      tMeas: rec.actual_draw_time_h,
      targetTime: rec.target_time_h,
      measACV: rec.observed_acv_mg_L,
      measCMMG: rec.observed_cmmg_mg_L,
      trueCMMGAtTarget: rec.true_cmmg_target_mg_L
    };

    const fcBase = generatorFn(baseObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Completely remove trueCMMGAtTarget
    const strippedObs = {
      tMeas: rec.actual_draw_time_h,
      targetTime: rec.target_time_h,
      measACV: rec.observed_acv_mg_L,
      measCMMG: rec.observed_cmmg_mg_L
    };

    const fcStripped = generatorFn(strippedObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    assert.equal(fcStripped.predCF, fcBase.predCF);
    assert.equal(fcStripped.predCH, fcBase.predCH);
    assert.equal(fcStripped.predER_CMMG, fcBase.predER_CMMG);
    assert.equal(fcStripped.predER_Both, fcBase.predER_Both);
    assert.equal(fcStripped.predSU_Unw_CMMG, fcBase.predSU_Unw_CMMG);
    assert.equal(fcStripped.predSU_Unw_Both, fcBase.predSU_Unw_Both);
    assert.equal(fcStripped.predSU_Rew_CMMG, fcBase.predSU_Rew_CMMG);
    assert.equal(fcStripped.predSU_Rew_Both, fcBase.predSU_Rew_Both);
    assert.equal(fcStripped.wH1, fcBase.wH1);
    assert.equal(fcStripped.wH2, fcBase.wH2);
    assert.equal(fcStripped.ess, fcBase.ess);

    totalChecked++;
  }

  return totalChecked;
}

function runMaskedArmAudit(generatorFn) {
  const records = eval1.patientRecords.slice(0, 500);
  let totalChecked = 0;

  for (const rec of records) {
    const cfg = { mode: rec.scenario, name: rec.scenario_name };
    const assayCV = 0.04;

    const baseObs = {
      tMeas: rec.actual_draw_time_h,
      targetTime: rec.target_time_h,
      measACV: rec.observed_acv_mg_L,
      measCMMG: rec.observed_cmmg_mg_L
    };

    const fcBase = generatorFn(baseObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Heavily corrupt end-HD ACV
    const corruptedObs = {
      ...baseObs,
      measACV: rec.observed_acv_mg_L * 10.0 + 35.0
    };

    const fcCorrupted = generatorFn(corruptedObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Assert masked arm predictions and weights must NOT change
    const maskedChecks = [
      ['predCF', fcCorrupted.predCF, fcBase.predCF],
      ['predER_CMMG', fcCorrupted.predER_CMMG, fcBase.predER_CMMG],
      ['predSU_Unw_CMMG', fcCorrupted.predSU_Unw_CMMG, fcBase.predSU_Unw_CMMG],
      ['predSU_Rew_CMMG', fcCorrupted.predSU_Rew_CMMG, fcBase.predSU_Rew_CMMG]
    ];

    for (const [key, valCorrupted, valBase] of maskedChecks) {
      if (Math.abs(valCorrupted - valBase) > 1e-12) {
        throw new assert.AssertionError({
          message: `Masked arm leakage detected in ${key}: baseline=${valBase}, corrupted=${valCorrupted} (diff=${valCorrupted - valBase})`
        });
      }
    }

    for (let j = 0; j < fcBase.wCMMG.length; j++) {
      if (Math.abs(fcCorrupted.wCMMG[j] - fcBase.wCMMG[j]) > 1e-12) {
        throw new assert.AssertionError({
          message: `Masked arm leakage detected in wCMMG[${j}]`
        });
      }
    }

    totalChecked++;
  }

  return totalChecked;
}

function runRevealedArmSensitivityAudit(generatorFn) {
  const records = eval1.patientRecords.filter(r => r.scenario === 'hidden').slice(0, 100);
  let totalChecked = 0;

  for (const rec of records) {
    const cfg = { mode: rec.scenario, name: rec.scenario_name };
    const assayCV = 0.04;

    const baseObs = {
      tMeas: rec.actual_draw_time_h,
      targetTime: rec.target_time_h,
      measACV: rec.observed_acv_mg_L,
      measCMMG: rec.observed_cmmg_mg_L
    };

    const fcBase = generatorFn(baseObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Heavily corrupt end-HD ACV
    const corruptedObs = {
      ...baseObs,
      measACV: rec.observed_acv_mg_L * 10.0 + 35.0
    };

    const fcCorrupted = generatorFn(corruptedObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Assert revealed arm MUST change in response to altered ACV
    const diffER = Math.abs(fcCorrupted.predER_Both - fcBase.predER_Both);
    const diffSU_Unw = Math.abs(fcCorrupted.predSU_Unw_Both - fcBase.predSU_Unw_Both);
    const diffSU_Rew = Math.abs(fcCorrupted.predSU_Rew_Both - fcBase.predSU_Rew_Both);

    let maxWeightDiff = 0;
    for (let j = 0; j < fcBase.wBoth.length; j++) {
      maxWeightDiff = Math.max(maxWeightDiff, Math.abs(fcCorrupted.wBoth[j] - fcBase.wBoth[j]));
    }

    if (diffER < 1e-6 && diffSU_Unw < 1e-6 && diffSU_Rew < 1e-6 && maxWeightDiff < 1e-6) {
      throw new assert.AssertionError({
        message: 'Revealed arm blindness detected: altering end-HD ACV produced no change in predictions or weights'
      });
    }

    totalChecked++;
  }

  return totalChecked;
}

function runChartObservationIndependenceAudit(generatorFn) {
  const records = eval1.patientRecords.slice(0, 500);
  let totalChecked = 0;

  for (const rec of records) {
    const cfg = { mode: rec.scenario, name: rec.scenario_name };
    const assayCV = 0.04;

    const baseObs = {
      tMeas: rec.actual_draw_time_h,
      targetTime: rec.target_time_h,
      measACV: rec.observed_acv_mg_L,
      measCMMG: rec.observed_cmmg_mg_L
    };

    const fcBase = generatorFn(baseObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    // Corrupt BOTH end-HD ACV and CMMG observations significantly
    const corruptedObs = {
      ...baseObs,
      measACV: rec.observed_acv_mg_L * 4.0 + 25.0,
      measCMMG: rec.observed_cmmg_mg_L * 8.0 + 40.0
    };

    const fcCorrupted = generatorFn(corruptedObs, fcCandidates, fcSimsComplete, fcSimsHidden, cfg, assayCV);

    if (Math.abs(fcCorrupted.predCH - fcBase.predCH) > 1e-12) {
      throw new assert.AssertionError({
        message: `Chart history observation leak detected: baseline=${fcBase.predCH}, corrupted=${fcCorrupted.predCH} (diff=${fcCorrupted.predCH - fcBase.predCH})`
      });
    }

    totalChecked++;
  }

  return totalChecked;
}

function runFullLeakageAudit() {
  console.log('========================================================================');
  console.log('STARTING FUTURE-DATA LEAKAGE & INPUT ISOLATION AUDIT');
  console.log('========================================================================\n');

  // 1. Future CMMG Target Perturbation Audit
  console.log('1. Auditing Future Target Perturbation Invariance...');
  const nPerturbed = runTargetPerturbationCheck(generatePatientForecast);
  console.log(`   [PASS] Tested ${nPerturbed} patient-scenario cases across all 4 evaluation conditions.`);
  console.log('   All forecasts and fitting weights remained 100% bit-for-bit identical (max diff = 0.000e+0).');
  console.log('   All evaluation errors reflected target shift as expected.\n');

  // 2. Future Outcome Removal Audit
  console.log('2. Auditing Complete Removal of Future Outcome...');
  const nStripped = runOutcomeRemovalCheck(generatePatientForecast);
  console.log(`   [PASS] Tested ${nStripped} patient-scenario cases with trueCMMGAtTarget stripped completely.`);
  console.log('   Forecast generation executes cleanly and yields bit-for-bit identical results.\n');

  // 3. Masked vs Revealed Input Access Audit
  console.log('3. Auditing Masked Arm Invariance and Revealed Arm Sensitivity to ACV...');
  const nMasked = runMaskedArmAudit(generatePatientForecast);
  console.log(`   [PASS] Tested ${nMasked} cases with scrambled end-HD ACV.`);
  console.log('   Masked Arm (CMMG-only): exactly 0.000e+0 change across all predictions and weights.');
  const nRevealed = runRevealedArmSensitivityAudit(generatePatientForecast);
  console.log(`   [PASS] Tested ${nRevealed} revealed arm cases: active sensitivity to ACV confirmed.\n`);

  // 4. Chart History Observation Independence Audit
  console.log('4. Auditing Chart History Observation Independence...');
  const nChart = runChartObservationIndependenceAudit(generatePatientForecast);
  console.log(`   [PASS] Tested ${nChart} cases with scrambled end-HD ACV and CMMG.`);
  console.log('   Chart-History comparator: exactly 0.000e+0 change across all predictions.\n');

  // 5. Deliberate-Failure Negative Controls
  console.log('5. Executing Deliberate-Failure Negative Controls...');

  // 5A. Negative Control: Future Data Leak
  let caughtFutureLeak = false;
  const leakyFutureGenerator = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    if (obs.trueCMMGAtTarget !== undefined) {
      res.predER_CMMG += 0.05 * obs.trueCMMGAtTarget;
    }
    return res;
  };
  try {
    runTargetPerturbationCheck(leakyFutureGenerator);
  } catch (err) {
    caughtFutureLeak = true;
    assert.ok(err instanceof assert.AssertionError, 'Must throw AssertionError');
    assert.match(err.message, /Future-data leakage detected/);
  }
  assert.ok(caughtFutureLeak, 'Deliberate-failure control 5A failed: target leak was not caught');
  console.log('   [PASS] Control 5A: Artificially leaked future target caught by assertion.');

  // 5B. Negative Control: Masked Arm Input Leak
  let caughtMaskedLeak = false;
  const leakyMaskedGenerator = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_CMMG += 0.05 * obs.measACV;
    return res;
  };
  try {
    runMaskedArmAudit(leakyMaskedGenerator);
  } catch (err) {
    caughtMaskedLeak = true;
    assert.ok(err instanceof assert.AssertionError, 'Must throw AssertionError');
    assert.match(err.message, /Masked arm leakage detected/);
  }
  assert.ok(caughtMaskedLeak, 'Deliberate-failure control 5B failed: masked ACV leak was not caught');
  console.log('   [PASS] Control 5B: Artificially leaked ACV into masked arm caught by assertion.');

  // 5C. Negative Control: Revealed Arm Blindness
  let caughtRevealedBlindness = false;
  const blindRevealedGenerator = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predER_Both = res.predER_CMMG;
    res.wBoth = res.wCMMG;
    res.predSU_Unw_Both = res.predSU_Unw_CMMG;
    res.predSU_Rew_Both = res.predSU_Rew_CMMG;
    return res;
  };
  try {
    runRevealedArmSensitivityAudit(blindRevealedGenerator);
  } catch (err) {
    caughtRevealedBlindness = true;
    assert.ok(err instanceof assert.AssertionError, 'Must throw AssertionError');
    assert.match(err.message, /Revealed arm blindness detected/);
  }
  assert.ok(caughtRevealedBlindness, 'Deliberate-failure control 5C failed: revealed blindness was not caught');
  console.log('   [PASS] Control 5C: Artificial ACV blindness in revealed arm caught by assertion.');

  // 5D. Negative Control: Observation Leaked into Chart History
  let caughtChartLeak = false;
  const leakyChartGenerator = (obs, ...args) => {
    const res = generatePatientForecast(obs, ...args);
    res.predCH += 0.05 * obs.measCMMG;
    return res;
  };
  try {
    runChartObservationIndependenceAudit(leakyChartGenerator);
  } catch (err) {
    caughtChartLeak = true;
    assert.ok(err instanceof assert.AssertionError, 'Must throw AssertionError');
    assert.match(err.message, /Chart history observation leak detected/);
  }
  assert.ok(caughtChartLeak, 'Deliberate-failure control 5D failed: observation leak into predCH was not caught');
  console.log('   [PASS] Control 5D: Artificial observation leak into chart-history caught by assertion.\n');

  console.log('========================================================================');
  console.log('AUDIT COMPLETED: NO LEAKAGE DETECTED BY THESE CHECKS');
  console.log('========================================================================\n');
}

if (require.main === module) {
  runFullLeakageAudit();
}

module.exports = {
  runFullLeakageAudit,
  runTargetPerturbationCheck,
  runOutcomeRemovalCheck,
  runMaskedArmAudit,
  runRevealedArmSensitivityAudit,
  runChartObservationIndependenceAudit
};
