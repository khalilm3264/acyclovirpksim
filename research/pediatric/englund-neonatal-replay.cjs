/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const iv = require('../../public/research/pediatric/model.js');
const neonatal = require('../../public/experimental/neonatal/model.js');

const DOI = '10.1016/S0022-3476(05)81053-4';
const MG_PER_UMOL = 0.22521;
const INFUSION_H = 1;
const SAMPLE_SLOTS = ['early', 'mid', 'trough'];

function loadCohort() {
  const [header, ...lines] = fs.readFileSync(path.join(__dirname, 'englund-1991-table-i.csv'), 'utf8')
    .trimEnd().split(/\r?\n/);
  const keys = header.split(',');
  // This extraction has single-line records; only the list of sampling days can be quoted.
  return lines.map(line => {
    const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
    if (values.length !== keys.length) throw new Error('Malformed Englund Table I record');
    return Object.fromEntries(keys.map((key, i) => [key, values[i]]));
  });
}

function replayCase(row) {
  if (row.exchange_transfusion !== 'no' || !/^\d+$/.test(row.ages_at_sampling_days))
    throw new Error('Replay requires a single sampling day and no exchange transfusion');
  const age = Number(row.ages_at_sampling_days);
  const startAge = Number(row.age_at_first_dose_days);
  const interval = Number(row.table_interval_h);
  const dose = Number(row.table_dose_mg_kg);
  const pmaWeeks = Number(row.gestational_age_weeks) + (age - 1) / 7;
  const typicalClearanceLhKg = neonatal.clearance(pmaWeeks);
  const typicalVolumeLKg = 2.8; // Sampson 2014; also used in neonatal-model-comparison.cjs.
  const p = { cl: typicalClearanceLhKg, v: typicalVolumeLKg };
  // A 1 kg mathematical normalization, not an imputed body weight: dose, CL and V
  // are all proportional to weight, so it cancels in the Sampson concentration.
  // Nominal interval starts at the reported day offset; ±1 previous dose probes
  // missing within-day timing, not the full uncertainty in actual dose history.
  const nominalDoses = 1 + Math.floor(((age - startAge) * 24) / interval);
  const resolution = [-1, 0, 1].map(offset => nominalDoses + offset).filter(n => n > 0);
  const assumedSampleHoursFromInfusionStart = { early: INFUSION_H + 0.25, mid: INFUSION_H + 3, trough: interval };
  const samples = SAMPLE_SLOTS.flatMap(slot => {
    const raw = row[`measured_${slot}_umol_L`];
    if (raw === '') return [];
    const observedUmolL = Number(raw);
    const observedMgL = observedUmolL * MG_PER_UMOL;
    const assumedHour = assumedSampleHoursFromInfusionStart[slot];
    const predictions = resolution.map(doses => {
      const c = { weight: 1, dose, interval, infusion: INFUSION_H, doses };
      const predictedMgL = iv.concentration((doses - 1) * interval + assumedHour, c, p);
      return { doses, predictedMgL, predictedUmolL: predictedMgL / MG_PER_UMOL };
    });
    const nominal = predictions.find(value => value.doses === nominalDoses);
    return [{
      slot, assumedHourFromInfusionStart: assumedHour, observedUmolL, observedMgL,
      ...nominal, predictedToObserved: nominal.predictedMgL / observedMgL,
      doseCountSensitivity: predictions
    }];
  });
  return {
    patientId: Number(row.patient_id), reported: {
      gestationalWeeks: Number(row.gestational_age_weeks), startDayOfLife: startAge,
      samplingDayOfLife: age, serumCreatinineMgDl: Number(row.serum_creatinine_mg_dL),
      doseMgKg: dose, intervalHours: interval, exchangeTransfusion: false
    },
    replay: { pmaWeeks, infusionHours: INFUSION_H, nominalDoses, typicalClearanceLhKg, typicalVolumeLKg },
    samples
  };
}

function report() {
  const rows = loadCohort();
  const cases = [3, 11].map(id => replayCase(rows.find(row => Number(row.patient_id) === id)));
  const troughs = cases.map(c => c.samples.find(sample => sample.slot === 'trough'));
  return {
    source: { doi: DOI, table: 'I, pp. 130–131', samplingMethods: 'p. 132', cohortSize: rows.length,
      measuredValuesInTable: rows.reduce((n, row) => n + SAMPLE_SLOTS.filter(slot => row[`measured_${slot}_umol_L`] !== '').length, 0),
      exchangePatients: rows.filter(row => row.exchange_transfusion === 'yes').length,
      samplesUsedByAuthors: 46, earlierExchangeReportOverlaps: true },
    model: 'Sampson 2014 PMA-only fixed effects (10.1097/01.inf.0000435509.75114.3d)',
    limitations: [
      'Exploratory historical comparison, not a patient-specific reconstruction or dosing aid.',
      'Exact dose and sample timestamps are unavailable; usual collection times and constant dosing are assumed.',
      'Serum measurements are compared with model blood concentrations; no matrix conversion other than units.',
      'Serum creatinine is documented but not used by the PMA-only model. No fitted Englund parameters or observations are used to make predictions.',
      'The D’Agate model is not scored: individual size and renal clearance inputs cannot be recovered from Table I.',
      'The 1987 exchange-transfusion report is included in this cohort and must not be counted separately.'
    ],
    cases,
    troughContrastPatient11Over3: {
      observed: troughs[1].observedUmolL / troughs[0].observedUmolL,
      predicted: troughs[1].predictedUmolL / troughs[0].predictedUmolL
    }
  };
}

if (require.main === module) console.log(JSON.stringify(report(), null, 2));
module.exports = { loadCohort, replayCase, report };
