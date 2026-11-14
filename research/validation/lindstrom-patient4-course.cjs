'use strict';

// Lindström 2019, Table 1 and supplementary Case series, patient 4.
// Reconstructs the documented dose changes (15 mg/kg q8h initially -> 10 mg/kg q12h on day 4 ->
// 12 mg/kg q8h from day 6) and evaluates the timing discrepancy between Table 1 (day 2 sample)
// and the narrative (acute renal failure after 3 days).
// Educational and exploratory research only; never for clinical dosing.

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

const PT4 = { age: 35, sex: 'male', weight: 98, csfMetRatio: 0.025 };

const visits = [
  { id: '4a', day: 2, lag: 6.0, crcl: 30, serum: [110, 57] },
  { id: '4b', day: 9, lag: 7.5, crcl: 125, serum: [25, 2.8] },
  { id: '4c', day: 16, lag: 8.0, crcl: 149, serum: [10, 1.5] }
];

// Helper to simulate a dose array
function runSimulation(doses, horizon, crcl, renalMode = 'constant', renalProfile = [], step = 0.25) {
  const config = {
    ...structuredClone(engine.DEFAULTS),
    age: PT4.age,
    sex: PT4.sex,
    weight: PT4.weight,
    crcl,
    crclSource: 'manual',
    renalMode,
    renalProfile,
    route: 'Acyclovir IV',
    dosingMode: 'custom',
    customDoses: doses,
    horizon,
    draws: 1,
    variability: 0,
    observations: [],
    csfMetRatio: PT4.csfMetRatio
  };
  assert.deepEqual(engine.validate(config, 'No dialysis'), []);
  const builtDoses = engine.buildDoses(config);
  const run = engine.single(config, engine.drawParams(config)[0], [], step, builtDoses);
  assert.equal(run.t.at(-1), horizon);
  return [
    run.cols.plasma.at(-1) * 1000 / 225.21,
    run.cols.cmmg.at(-1) * 1000 / 239.19
  ];
}

// 1. Table 1 Baseline: uniform repeat dosing at visit-specified dose and constant CrCl
function simulateTable1Baseline(visit, step = 0.25) {
  const doseMg = visit.id === '4a' ? 1470 : 1176; // 15 mg/kg or 12 mg/kg
  const days = Math.min(13, visit.day);
  const doseCount = Math.max(1, Math.round(days * 24 / 8));
  const horizon = (doseCount - 1) * 8 + visit.lag;
  const doses = [];
  for (let i = 0; i < doseCount; i++) {
    doses.push({ time: i * 8, amount: doseMg, infusion: 1, route: 'Acyclovir IV' });
  }
  return runSimulation(doses, horizon, visit.crcl, 'constant', [], step);
}

// 2. Supplement-Informed Schedule under Identical Renal Assumptions
// Doses:
// - Days 1-3: 15 mg/kg q8h (1,470 mg)
// - Days 4-5: 10 mg/kg q12h (980 mg)
// - Days 6+: 12 mg/kg q8h (1,176 mg)
function getSupplementDoses(startHour, endHour) {
  const raw = [];
  for (let t = 0; t < 72 && t <= endHour; t += 8) {
    raw.push({ time: t, amount: 1470, infusion: 1, route: 'Acyclovir IV' });
  }
  for (let t = 72; t < 120 && t <= endHour; t += 12) {
    raw.push({ time: t, amount: 980, infusion: 1, route: 'Acyclovir IV' });
  }
  for (let t = 120; t <= endHour; t += 8) {
    raw.push({ time: t, amount: 1176, infusion: 1, route: 'Acyclovir IV' });
  }
  return raw
    .filter(d => d.time >= startHour && d.time <= endHour)
    .map(d => ({ ...d, time: d.time - startHour }));
}

function simulateSupplementSchedule(visit, timingVariant = 'default', renalMode = 'constant', lookback = 312, step = 0.25) {
  let sampleT;
  if (visit.id === '4a') {
    if (timingVariant === 'day2_literal') {
      // Day 2 dose at 24 h, sampled at 30 h (4 doses: 0, 8, 16, 24 h)
      sampleT = 30.0;
    } else if (timingVariant === 'day3_narrative') {
      // "after three days": 9 doses through 64 h, sampled at 70 h
      sampleT = 70.0;
    } else {
      // Standard Table 1 duration: 6 doses through 40 h, sampled at 46 h
      sampleT = 46.0;
    }
  } else if (visit.id === '4b') {
    // Day 9 dose at 192 h, sampled at 199.5 h (7.5 h lag)
    sampleT = (9 - 1) * 24 + visit.lag; // 199.5 h
  } else {
    // Day 16 dose at 360 h, sampled at 368.0 h (8.0 h lag)
    sampleT = (16 - 1) * 24 + visit.lag; // 368.0 h
  }

  const lastDoseT = sampleT - visit.lag;
  const startT = Math.max(0, lastDoseT - lookback);
  const horizon = sampleT - startT;
  assert.ok(horizon <= 336, `Horizon ${horizon} must not exceed engine 336 h limit`);

  const doses = getSupplementDoses(startT, lastDoseT);

  let renalProfile = [];
  if (renalMode === 'profile') {
    // Narrative recovery profile:
    // Days 1-3: CrCl 30 mL/min (acute renal failure)
    // Days 4-5: linear recovery 30 -> 125 mL/min
    // Day 6 to 9: normal CrCl 125 mL/min
    // Day 9 to 16: linear rise 125 -> 149 mL/min (profile capped at engine maximum 140 mL/min)
    const globalKnots = [
      { time: 0, crcl: 30 },
      { time: 72, crcl: 30 },
      { time: 120, crcl: 125 },
      { time: 199.5, crcl: 125 },
      { time: 368.0, crcl: 140 } // capped at engine max 140 for profile knots
    ];

    function clearanceAt(t) {
      if (t <= globalKnots[0].time) return globalKnots[0].crcl;
      for (let i = 1; i < globalKnots.length; i++) {
        const a = globalKnots[i - 1], b = globalKnots[i];
        if (t <= b.time) return a.crcl + (b.crcl - a.crcl) * (t - a.time) / (b.time - a.time);
      }
      return globalKnots.at(-1).crcl;
    }

    renalProfile = [
      { time: 0, crcl: Math.min(140, clearanceAt(startT)) },
      ...globalKnots
        .filter(k => k.time > startT && k.time < sampleT)
        .map(k => ({ time: k.time - startT, crcl: Math.min(140, k.crcl) })),
      { time: horizon, crcl: Math.min(140, clearanceAt(sampleT)) }
    ];
  }

  return runSimulation(doses, horizon, visit.crcl, renalMode, renalProfile, step);
}

function formatRow(visit, scenario, values, observed) {
  const [acv, cmmg] = values;
  return {
    visit: visit.id,
    day_lag_crcl: `Day ${visit.day}, ${visit.lag}h lag, ${visit.crcl} mL/min`,
    scenario,
    observed_serum: `${observed[0]} / ${observed[1]}`,
    pred_acv_umol_L: acv.toFixed(2),
    pred_cmmg_umol_L: cmmg.toFixed(2),
    acv_PO_ratio: (acv / observed[0]).toFixed(2),
    cmmg_PO_ratio: (cmmg / observed[1]).toFixed(2)
  };
}

const tableRows = [];

// Visit 4a
tableRows.push(formatRow(visits[0], 'Table 1 constant baseline (6 doses, 46h)', simulateTable1Baseline(visits[0]), visits[0].serum));
tableRows.push(formatRow(visits[0], 'Supplement schedule, Day 2 literal (4 doses, 30h)', simulateSupplementSchedule(visits[0], 'day2_literal'), visits[0].serum));
tableRows.push(formatRow(visits[0], 'Supplement schedule, Day 3 narrative (9 doses, 70h)', simulateSupplementSchedule(visits[0], 'day3_narrative'), visits[0].serum));

// Visit 4b
tableRows.push(formatRow(visits[1], 'Table 1 constant baseline (12 mg/kg q8h, CrCl 125)', simulateTable1Baseline(visits[1]), visits[1].serum));
tableRows.push(formatRow(visits[1], 'Supplement schedule, constant CrCl 125 (identical renal)', simulateSupplementSchedule(visits[1], 'default', 'constant'), visits[1].serum));
tableRows.push(formatRow(visits[1], 'Supplement schedule, dynamic renal recovery profile', simulateSupplementSchedule(visits[1], 'default', 'profile'), visits[1].serum));

// Visit 4c
tableRows.push(formatRow(visits[2], 'Table 1 constant baseline (12 mg/kg q8h, CrCl 149)', simulateTable1Baseline(visits[2]), visits[2].serum));
tableRows.push(formatRow(visits[2], 'Supplement schedule, constant CrCl 149 (identical renal)', simulateSupplementSchedule(visits[2], 'default', 'constant'), visits[2].serum));
tableRows.push(formatRow(visits[2], 'Supplement schedule, dynamic renal recovery profile (capped at 140)', simulateSupplementSchedule(visits[2], 'default', 'profile'), visits[2].serum));

// Convergence checks: finer step 0.125 h and shorter lookback 240 h
for (const v of visits) {
  const base = simulateSupplementSchedule(v, 'default', 'constant', 312, 0.25);
  const finer = simulateSupplementSchedule(v, 'default', 'constant', 312, 0.125);
  assert.ok(Math.abs(base[0] / finer[0] - 1) < 0.002, `ACV step convergence check passed for ${v.id}`);
  assert.ok(Math.abs(base[1] / finer[1] - 1) < 0.002, `CMMG step convergence check passed for ${v.id}`);
  if (v.id !== '4a') {
    const shorter = simulateSupplementSchedule(v, 'default', 'constant', 240, 0.25);
    assert.ok(Math.abs(base[0] - shorter[0]) < 0.001, `ACV lookback check passed for ${v.id}`);
    assert.ok(Math.abs(base[1] - shorter[1]) < 0.001, `CMMG lookback check passed for ${v.id}`);
  }
}

if (require.main === module) {
  console.table(tableRows);
}

module.exports = { PT4, visits, simulateTable1Baseline, simulateSupplementSchedule, tableRows };
