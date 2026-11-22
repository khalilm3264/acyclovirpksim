/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadCohort, replayCase, report } = require('../research/pediatric/englund-neonatal-replay.cjs');

test('Englund Table I keeps published serum observations separate from post hoc fits', () => {
  const cohort = loadCohort();
  assert.deepEqual(cohort.map(row => Number(row.patient_id)), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.equal(report().source.measuredValuesInTable, 34);
  assert.equal(report().source.samplesUsedByAuthors, 46);
  assert.equal(report().source.earlierExchangeReportOverlaps, true);
  assert.equal(cohort[0].serum_creatinine_mg_dL, '<0.5');
  assert.equal(cohort[4].ages_at_sampling_days, '18,22,36');
  assert.deepEqual(cohort.filter(r => r.exchange_transfusion === 'yes').map(r => r.patient_id), ['9','12','14','15','16']);
  assert.throws(() => replayCase(cohort[8]), /no exchange transfusion/);
  assert.throws(() => replayCase(cohort[4]), /single sampling day/);
});

test('Englund replay preserves source values and uses assumed postinfusion and predose slots', () => {
  const { cases, troughContrastPatient11Over3 } = report();
  assert.deepEqual(cases.map(c => [c.patientId, c.reported.serumCreatinineMgDl, c.replay.nominalDoses]), [[3, 0.5, 7], [11, 1.1, 5]]);
  assert.deepEqual(cases.map(c => c.samples.map(s => [s.slot, s.assumedHourFromInfusionStart, s.observedUmolL])), [
    [['early', 1.25, 42], ['mid', 4, 28], ['trough', 12, 6.2]],
    [['mid', 4, 93], ['trough', 12, 52]]
  ]);
  for (const c of cases) {
    const { typicalClearanceLhKg: cl, typicalVolumeLKg: v, nominalDoses } = c.replay;
    const k = cl / v;
    for (const s of c.samples) {
      assert.equal(s.observedMgL, s.observedUmolL * 0.22521);
      assert.deepEqual(s.doseCountSensitivity.map(a => a.doses), [nominalDoses - 1, nominalDoses, nominalDoses + 1]);
      // Independent geometric series for n identical doses, each sampled after infusion end.
      for (const { doses, predictedMgL } of s.doseCountSensitivity) {
        const expected = c.reported.doseMgKg / cl * (1 - Math.exp(-k))
          * Math.exp(-k * (s.assumedHourFromInfusionStart - 1))
          * (1 - Math.exp(-k * 12 * doses)) / (1 - Math.exp(-k * 12));
        assert.ok(Math.abs(predictedMgL - expected) < 1e-12);
      }
      assert.ok(s.predictedToObserved < 1);
    }
  }
  assert.equal(troughContrastPatient11Over3.observed, 52 / 6.2);
  assert.ok(troughContrastPatient11Over3.predicted < 1.2);
});

test('Serum creatinine, measured levels and the paper’s fitted PK cannot tune the predictions', () => {
  const patient = loadCohort()[2];
  const independentlyPredicted = row => replayCase(row).samples.map(s => s.predictedMgL);
  assert.deepEqual(independentlyPredicted(patient), independentlyPredicted({
    ...patient,
    serum_creatinine_mg_dL: '2',
    measured_mid_umol_L: '5',
    fitted_total_clearance_L_kg_h: '100',
    fitted_terminal_half_life_h: '100'
  }));
});
