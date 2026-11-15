'use strict';
/**
 * Computational Simulation: 4-Hour Post-Hemodialysis CMMG Forecasting vs. Carry-Forward
 * Evaluates whether updating the adult AyFlux PK model from CMMG alone or paired (ACV+CMMG)
 * beats carry-forward under complete vs. incomplete prior dosing history with 4% assay CV.
 */
const fs = require('node:fs');
const path = require('node:path');
const pk = require('../../public/assets/pk-engine.js');

function createRng(seed = 987654321) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const norm = () => {
    const u1 = Math.max(1e-12, rand());
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  return { rand, norm };
}

function interp(time, values, t) {
  if (t <= time[0]) return values[0];
  if (t >= time[time.length - 1]) return values[values.length - 1];
  let lo = 0, hi = time.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (time[m] < t) lo = m;
    else hi = m;
  }
  const f = (t - time[lo]) / (time[hi] - time[lo]);
  return values[lo] * (1 - f) + values[hi] * f;
}

function weightedMedian(vals, weights) {
  const pairs = vals.map((v, j) => [v, weights[j]]).sort((a, b) => a[0] - b[0]);
  const sum = weights.reduce((a, b) => a + b, 0);
  let cur = 0;
  for (const [v, w] of pairs) {
    cur += w;
    if (cur >= 0.5 * sum) return v;
  }
  return pairs[pairs.length - 1][0];
}

function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const baseConfig = {
  ...pk.DEFAULTS,
  weight: 70,
  crcl: 0,
  crclSource: 'manual',
  renalMode: 'constant',
  hdStart: 24,
  hdDuration: 4,
  hdRepeat: 48,
  hdCl: 81.8,
  horizon: 48,
  variability: 1,
  draws: 400,
  assayCV: 0.04
};

const hdRows = [{ type: 'HD', start: 24, end: 28 }];

// Scenarios
const SCENARIOS = [
  {
    id: 'single_dose',
    name: 'Single Prior Dose (500 mg IV at 12h)',
    description: '1 dose prior to HD (t=12h, 12h before HD session start at 24h)',
    dosesTrue: [{ time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }],
    dosesComplete: [{ time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }],
    dosesHidden: [{ time: 12, route: 'Acyclovir IV', amount: 250, infusion: 1 }],
    hiddenDescription: 'Forecaster assumes 250 mg (50% under-specified dose amount)'
  },
  {
    id: 'repeated_doses',
    name: 'Repeated Prior Doses (500 mg IV at 0h and 12h)',
    description: '2 doses prior to HD (t=0h and t=12h, leading to multi-dose accumulation)',
    dosesTrue: [
      { time: 0, route: 'Acyclovir IV', amount: 500, infusion: 1 },
      { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
    ],
    dosesComplete: [
      { time: 0, route: 'Acyclovir IV', amount: 500, infusion: 1 },
      { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
    ],
    dosesHidden: [
      { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
    ],
    hiddenDescription: 'Earlier dose at t=0h unrecorded/hidden (forecaster only knows t=12h dose)'
  }
];

function runFullSimulation() {
  const rng = createRng(11223344);
  const N_VIRTUAL = 500;
  const M_ENSEMBLE = 400;

  console.log(`Generating ${N_VIRTUAL} virtual true patients and ${M_ENSEMBLE} forecaster ensemble draws...`);
  const trueParams = pk.drawParams({ ...baseConfig, draws: N_VIRTUAL });
  const fcParams = pk.drawParams({ ...baseConfig, draws: M_ENSEMBLE });

  const summaryRows = [];

  for (const sc of SCENARIOS) {
    // True simulations
    const trueSims = trueParams.map(p => pk.single(baseConfig, p, hdRows, 0.25, sc.dosesTrue));
    const trueData = trueSims.map(sim => ({
      acv28: interp(sim.t, sim.cols.plasma, 28),
      cmmg28: interp(sim.t, sim.cols.cmmg, 28),
      acv32: interp(sim.t, sim.cols.plasma, 32),
      cmmg32: interp(sim.t, sim.cols.cmmg, 32)
    }));

    // Forecaster ensembles
    const fcSimsComplete = fcParams.map(p => pk.single(baseConfig, p, hdRows, 0.25, sc.dosesComplete));
    const fcSimsHidden = fcParams.map(p => pk.single(baseConfig, p, hdRows, 0.25, sc.dosesHidden));

    const conditions = [
      {
        label: 'Exact (0% noise) + Complete History',
        cv: 0.0,
        fcSims: fcSimsComplete,
        historyLabel: 'Complete'
      },
      {
        label: '4% Assay CV + Complete History',
        cv: 0.04,
        fcSims: fcSimsComplete,
        historyLabel: 'Complete'
      },
      {
        label: `4% Assay CV + Incomplete History (${sc.hiddenDescription})`,
        cv: 0.04,
        fcSims: fcSimsHidden,
        historyLabel: 'Incomplete'
      }
    ];

    for (const cond of conditions) {
      const errsCF = [];
      const errsCMMG = [];
      const errsBoth = [];

      for (let k = 0; k < N_VIRTUAL; k++) {
        const d = trueData[k];
        const noiseACV = cond.cv === 0 ? 0 : rng.norm() * cond.cv;
        const noiseCMMG = cond.cv === 0 ? 0 : rng.norm() * cond.cv;

        const measACV = Math.max(0.01, d.acv28 * (1 + noiseACV));
        const measCMMG = Math.max(0.01, d.cmmg28 * (1 + noiseCMMG));
        const trueTarget = d.cmmg32;

        // 1. Carry-Forward
        const predCF = measCMMG;
        errsCF.push(Math.abs(predCF - trueTarget));

        // 2. CMMG-only Update
        const logwCMMG = cond.fcSims.map(sim => {
          const pred = interp(sim.t, sim.cols.cmmg, 28);
          const sd = Math.max(0.1, pred * (cond.cv || 0.04));
          return -0.5 * Math.pow((measCMMG - pred) / sd, 2) - Math.log(sd);
        });
        const maxLogwCMMG = Math.max(...logwCMMG);
        const unnormCMMG = logwCMMG.map(lw => Math.exp(lw - maxLogwCMMG));
        const sumCMMG = unnormCMMG.reduce((a, b) => a + b, 0);
        const weightsCMMG = unnormCMMG.map(w => w / sumCMMG);

        const cmmg32Vals = cond.fcSims.map(sim => interp(sim.t, sim.cols.cmmg, 32));
        const predCMMGOnly = weightedMedian(cmmg32Vals, weightsCMMG);
        errsCMMG.push(Math.abs(predCMMGOnly - trueTarget));

        // 3. Both Analytes (ACV + CMMG) Update
        const logwBoth = cond.fcSims.map(sim => {
          const predCMMG = interp(sim.t, sim.cols.cmmg, 28);
          const sdCMMG = Math.max(0.1, predCMMG * (cond.cv || 0.04));
          const lCMMG = -0.5 * Math.pow((measCMMG - predCMMG) / sdCMMG, 2) - Math.log(sdCMMG);

          const predACV = interp(sim.t, sim.cols.plasma, 28);
          const sdACV = Math.max(0.1, predACV * (cond.cv || 0.04));
          const lACV = -0.5 * Math.pow((measACV - predACV) / sdACV, 2) - Math.log(sdACV);

          return lCMMG + lACV;
        });
        const maxLogwBoth = Math.max(...logwBoth);
        const unnormBoth = logwBoth.map(lw => Math.exp(lw - maxLogwBoth));
        const sumBoth = unnormBoth.reduce((a, b) => a + b, 0);
        const weightsBoth = unnormBoth.map(w => w / sumBoth);

        const predBoth = weightedMedian(cmmg32Vals, weightsBoth);
        errsBoth.push(Math.abs(predBoth - trueTarget));
      }

      const medCF = median(errsCF);
      const medCMMG = median(errsCMMG);
      const medBoth = median(errsBoth);

      let countCmmgBeatsCF = 0;
      let countBothBeatsCF = 0;
      let countAcvMakesWorse = 0;

      for (let k = 0; k < N_VIRTUAL; k++) {
        if (errsCMMG[k] < errsCF[k]) countCmmgBeatsCF++;
        if (errsBoth[k] < errsCF[k]) countBothBeatsCF++;
        if (errsBoth[k] > errsCMMG[k]) countAcvMakesWorse++;
      }

      const pctCmmgBeatsCF = (100 * countCmmgBeatsCF / N_VIRTUAL).toFixed(1);
      const pctBothBeatsCF = (100 * countBothBeatsCF / N_VIRTUAL).toFixed(1);
      const pctAcvMakesWorse = (100 * countAcvMakesWorse / N_VIRTUAL).toFixed(1);

      summaryRows.push({
        scenario: sc.name,
        condition: cond.label,
        history: cond.historyLabel,
        medCF: medCF.toFixed(4),
        medCMMG: medCMMG.toFixed(4),
        medBoth: medBoth.toFixed(4),
        pctCmmgBeatsCF: pctCmmgBeatsCF + '%',
        pctBothBeatsCF: pctBothBeatsCF + '%',
        pctAcvMakesWorse: pctAcvMakesWorse + '%'
      });
    }
  }

  return summaryRows;
}

const rows = runFullSimulation();
console.log('\n========================================================================');
console.log('RESULTS (ALL VALUES ARE SIMULATIONS — FOR EXPLORATORY RESEARCH ONLY)');
console.log('========================================================================\n');
console.table(rows);
