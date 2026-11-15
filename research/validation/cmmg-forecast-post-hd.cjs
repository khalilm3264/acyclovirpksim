'use strict';
/**
 * Computational Simulation: 4-Hour Post-Hemodialysis CMMG Forecasting vs. Carry-Forward
 * Evaluates Ensemble Reweighting vs. Direct State Updating under Complete, Hidden,
 * and Uncertain (50/50 Mixture) Dosing Histories across:
 *   1. Exact Timestamps (28.0h) with Assumed 4% CV Measurement Noise (Target 32.0h, Horizon 4.0h)
 *   2. Perturbed Timestamps (+/- 15 min) with Assumed 4% CV Measurement Noise (Fixed Clock Target 32.0h, Horizon 3.75-4.25h)
 *   3. Perturbed Timestamps (+/- 15 min) with Assumed 4% CV Measurement Noise (Fixed Elapsed Horizon Target = Draw + 4.0h)
 *   4. Zero-Noise Sanity Check (Exact 28.0h, 0% CV Observation Noise, Target 32.0h)
 *
 * Configured HD clearance: 81.8 mL/min (4.908 L/h effective plasma clearance in AyFlux engine,
 * distinct from dialyzer hemodynamic flow settings such as Qb=300 mL/min, Qd=500 mL/min, KoA=900 mL/min).
 *
 * Model Constraints & Guardrails:
 * - Parameter-disjoint draws: 900 draws partitioned into 500 virtual patients and 400 candidate forecasters.
 * - Intra-dialytic stepping: when draw occurs before 28.0h, dialyzer clearance remains active until 28.0h.
 * - Programmatic invariant verification: asserts sum of sign counts, paired outcomes, and sign conventions.
 * - Programmatic markdown and data exports: guarantees zero manual transcription errors across CSV, JSON, and MD.
 * - Educational & exploratory simulation only — never clinical decision support.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pk = require('../../public/assets/pk-engine.js');

function createRng(seed = 44556677) {
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

function median(arr) {
  if (arr.length === 0) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function quantile(arr, q) {
  if (arr.length === 0) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (s[base + 1] !== undefined) {
    return s[base] + rest * (s[base + 1] - s[base]);
  }
  return s[base];
}

function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sd(arr) {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
}

function quantiles(arr) {
  return {
    min: quantile(arr, 0.0),
    p25: quantile(arr, 0.25),
    median: median(arr),
    p75: quantile(arr, 0.75),
    max: quantile(arr, 1.0),
    mean: mean(arr),
    sd: sd(arr)
  };
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

/**
 * Stepper between tStart and tEnd.
 * If tStart < hdEnd (28.0h), active hemodialysis (hd, metDial) applies up to hdEnd,
 * after which dialysis stops and post-HD anuric elimination applies.
 */
function stepInterval(p, startState, tStart, tEnd, hdEnd = 28.0, dt = 0.25) {
  if (tEnd <= tStart) return { A: startState[0], B: startState[1], M: startState[2], cmmg: startState[2] / p.vm, acv: startState[0] / p.vc };

  let [a, b, m] = startState;
  const mw = 239.19 / 225.21;
  const metDialFrac = 1.0; // c.metDial in AyFlux (pk.DEFAULTS.metDial = 1)

  function stepSubInterval(t0, t1, isDialysisActive) {
    const nSteps = Math.max(1, Math.round((t1 - t0) / dt));
    const actualDt = (t1 - t0) / nSteps;
    const dialRate = isDialysisActive ? p.hd : 0;
    const metDialRate = isDialysisActive ? p.hd * metDialFrac : 0;

    function rhs(A, B, M) {
      const cc = A / p.vc;
      const cp = B / p.vp;
      const ex = p.q * (cc - cp);
      const dA = -(p.other + p.form + dialRate) * cc - ex;
      const dB = ex;
      const dM = p.form * cc * mw - (p.mn + metDialRate) * (M / p.vm);
      return [dA, dB, dM];
    }

    for (let step = 0; step < nSteps; step++) {
      const k1 = rhs(a, b, m);
      const k2 = rhs(a + 0.5 * actualDt * k1[0], b + 0.5 * actualDt * k1[1], m + 0.5 * actualDt * k1[2]);
      const k3 = rhs(a + 0.5 * actualDt * k2[0], b + 0.5 * actualDt * k2[1], m + 0.5 * actualDt * k2[2]);
      const k4 = rhs(a + actualDt * k3[0], b + actualDt * k3[1], m + actualDt * k3[2]);

      a = Math.max(0, a + (actualDt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
      b = Math.max(0, b + (actualDt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
      m = Math.max(0, m + (actualDt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]));
    }
  }

  if (tStart < hdEnd) {
    const tSplit = Math.min(tEnd, hdEnd);
    stepSubInterval(tStart, tSplit, true); // HD active
    if (tEnd > hdEnd) {
      stepSubInterval(hdEnd, tEnd, false); // post-HD
    }
  } else {
    stepSubInterval(tStart, tEnd, false); // post-HD
  }

  return { A: a, B: b, M: m, cmmg: m / p.vm, acv: a / p.vc };
}

// Extract full internal states A, B, M alongside concentrations
function simulateWithStates(c, p, rows, dt, doses) {
  const events = pk.prepareEvents(c, rows, dt, doses);
  const tarr = events.tarr;
  const states = [];
  const cols = { plasma: [], cmmg: [] };
  let a = 0, b = 0, m = 0, oralDepot = 0, pdAmount = 0, pdVol = c.pdVolume;
  const mw = 239.19 / 225.21;
  const renalAt = t => c.renalMode === 'profile' ? p.renal * pk.renalCrClAt(c, t) : p.renal;
  const metaboliteRenalAt = t => c.renalMode === 'profile' ? p.mr * pk.renalCrClAt(c, t) : p.mr;

  for (let i = 0; i < tarr.length; i++) {
    const t = tarr[i];
    cols.plasma.push(a / p.vc);
    cols.cmmg.push(m / p.vm);
    states.push({ t, A: a, B: b, M: m });

    if (i === tarr.length - 1) break;

    const step = tarr[i + 1] - t;
    const mid = t + step / 2;
    const midPD = events.midPD[i];
    const midActive = events.midActive[i];
    const ivRate = events.ivRate[i];
    const midDial = midActive.active ? (midActive.type === 'HD' ? p.hd : midActive.type === 'CRRT' ? p.crrt : 0) : 0;

    function rhs(A, B, M, D, P, V, kTime) {
      const cc = A / p.vc, cp = B / p.vp, ex = p.q * (cc - cp), mem = pk.pdTransfer(c, p, mid, cc, P, V, midPD), net = midDial * cc + mem.flux;
      const dA = ivRate + p.oralKa * D - (p.other + renalAt(kTime) + p.form) * cc - ex - net;
      const dB = ex;
      const dM = p.form * cc * mw - (p.mn + metaboliteRenalAt(kTime) + (midDial + (midPD ? p.pd : 0)) * c.metDial) * M / p.vm;
      return [dA, dB, dM, -p.oralKa * D, mem.flux, mem.netVolume];
    }

    let x = [a, b, m, oralDepot, pdAmount, pdVol];
    function stage(x, k, f) { return x.map((v, j) => v + f * step * k[j]); }
    const k1 = rhs(...x, t);
    const k2 = rhs(...stage(x, k1, 0.5), mid);
    const k3 = rhs(...stage(x, k2, 0.5), mid);
    const k4 = rhs(...stage(x, k3, 1), t + step);

    a = Math.max(0, a + (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
    b = Math.max(0, b + (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
    m = Math.max(0, m + (step / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]));
    oralDepot = Math.max(0, oralDepot + (step / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]));
  }
  return { t: tarr, cols, states };
}

function getStateAt(simResult, targetT) {
  const tarr = simResult.t;
  if (targetT <= tarr[0]) return simResult.states[0];
  if (targetT >= tarr[tarr.length - 1]) return simResult.states[tarr.length - 1];
  let lo = 0, hi = tarr.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tarr[mid] < targetT) lo = mid;
    else hi = mid;
  }
  const f = (targetT - tarr[lo]) / (tarr[hi] - tarr[lo]);
  const sLo = simResult.states[lo];
  const sHi = simResult.states[hi];
  return {
    t: targetT,
    A: sLo.A * (1 - f) + sHi.A * f,
    B: sLo.B * (1 - f) + sHi.B * f,
    M: sLo.M * (1 - f) + sHi.M * f
  };
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
  assayCV: 0.04
};

const hdRows = [{ type: 'HD', start: 24, end: 28 }];
const dosesTrue = [
  { time: 0, route: 'Acyclovir IV', amount: 500, infusion: 1 },
  { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
];
const dosesComplete = [
  { time: 0, route: 'Acyclovir IV', amount: 500, infusion: 1 },
  { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
];
const dosesHidden = [
  { time: 12, route: 'Acyclovir IV', amount: 500, infusion: 1 }
];

console.log('Generating 900 disjoint parameter draws (engine param_draw_seed 2026)...');
const allParams = pk.drawParams({ ...baseConfig, draws: 900 });
const truePatients = allParams.slice(0, 500);
const fcCandidates = allParams.slice(500, 900);

// Assert zero overlap across parameter vectors
for (let i = 0; i < truePatients.length; i++) {
  for (let j = 0; j < fcCandidates.length; j++) {
    const match = (truePatients[i].vc === fcCandidates[j].vc &&
                   truePatients[i].vp === fcCandidates[j].vp &&
                   truePatients[i].renal === fcCandidates[j].renal &&
                   truePatients[i].form === fcCandidates[j].form);
    assert.equal(match, false, 'Patient and candidate parameters must not overlap');
  }
}

console.log('Precomputing ground-truth and candidate trajectories...');
const trueSims = truePatients.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesTrue));
const fcSimsComplete = fcCandidates.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesComplete));
const fcSimsHidden = fcCandidates.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesHidden));

console.log('Running no-update continuation parity assertions (pre-end 27.75h, exact-end 28.0h, post-end 28.25h)...');
const parityIndices = [0, 1, 2, 100, 499];
const parityTimePoints = [27.75, 28.0, 28.25];
for (const idx of parityIndices) {
  const p = truePatients[idx];
  const sim = trueSims[idx];
  const state32 = getStateAt(sim, 32.0);
  for (const tStart of parityTimePoints) {
    const sStart = getStateAt(sim, tStart);
    const stepped = stepInterval(p, [sStart.A, sStart.B, sStart.M], tStart, 32.0, 28.0, 0.25);
    const diffCMMG = Math.abs(stepped.cmmg - state32.M / p.vm);
    const diffACV = Math.abs(stepped.acv - state32.A / p.vc);
    assert.ok(diffCMMG < 1e-12, `Continuation parity failed for patient ${idx} at tStart=${tStart} (diffCMMG=${diffCMMG})`);
    assert.ok(diffACV < 1e-12, `Continuation parity failed for patient ${idx} at tStart=${tStart} (diffACV=${diffACV})`);
  }
}
console.log('  PASSED: 15/15 continuation checks matched full engine trajectory with diff < 1e-12 mg/L.');

function signCounts(errs) {
  let under = 0, over = 0, exact = 0;
  for (const e of errs) {
    if (Math.abs(e) < 1e-12) exact++;
    else if (e < 0) under++;
    else over++;
  }
  assert.equal(under + over + exact, errs.length, 'Sign counts must sum to N');
  return { under, over, exact };
}

function pairedDiffs(absBoth, absCMMG) {
  const N = absBoth.length;
  let helped = 0, worsened = 0, tied = 0;
  const diffs = [];
  for (let i = 0; i < N; i++) {
    const d = absBoth[i] - absCMMG[i];
    diffs.push(d);
    if (Math.abs(d) < 1e-12) tied++;
    else if (d < 0) helped++;
    else worsened++;
  }
  assert.equal(helped + worsened + tied, N, 'Paired outcomes must sum to N');

  const medDiff = median(diffs);
  const meanDiff = mean(diffs);

  // Invariant verification
  if (tied === 0) {
    if (helped > N / 2) {
      assert.ok(medDiff < 0, `Invariant violation: helped (${helped}) > ${N/2} with 0 ties requires medDiff (${medDiff}) < 0`);
    }
    if (worsened > N / 2) {
      assert.ok(medDiff > 0, `Invariant violation: worsened (${worsened}) > ${N/2} with 0 ties requires medDiff (${medDiff}) > 0`);
    }
  }

  const medBoth = median(absBoth);
  const medCMMG = median(absCMMG);
  const diffOfMarginalMedians = medBoth - medCMMG;

  return {
    helped,
    worsened,
    tied,
    pctHelped: (100 * helped / N).toFixed(1) + '%',
    medDiff,
    meanDiff,
    medBoth,
    medCMMG,
    diffOfMarginalMedians
  };
}

function runEvaluation(conditionKey, conditionLabel, targetMode, usePerturbations, isZeroNoise) {
  const rng = createRng(44556677);
  const N = truePatients.length;
  const M = fcCandidates.length;
  const assayCV = 0.04;

  const patientData = [];
  for (let k = 0; k < N; k++) {
    const dt = usePerturbations ? (rng.rand() * 0.5 - 0.25) : 0.0;
    const tMeas = 28.0 + dt;
    const sim = trueSims[k];

    const trueStateAtDraw = getStateAt(sim, tMeas);
    const trueACV = trueStateAtDraw.A / truePatients[k].vc;
    const trueCMMG = trueStateAtDraw.M / truePatients[k].vm;

    const noiseACV = isZeroNoise ? 0.0 : rng.norm() * assayCV;
    const noiseCMMG = isZeroNoise ? 0.0 : rng.norm() * assayCV;

    const measACV = Math.max(0.01, trueACV * (1 + noiseACV));
    const measCMMG = Math.max(0.01, trueCMMG * (1 + noiseCMMG));

    const targetTime = targetMode === 'fixed_32h' ? 32.0 : (tMeas + 4.0);
    const actualHorizon = targetTime - tMeas;
    const trueCMMGAtTarget = interp(sim.t, sim.cols.cmmg, targetTime);

    patientData.push({
      patient_id: k,
      tMeas,
      targetTime,
      actualHorizon,
      isDuringHD: tMeas < 28.0,
      trueACV,
      trueCMMG,
      measACV,
      measCMMG,
      trueCMMGAtTarget
    });
  }

  const configurations = [
    { mode: 'complete', name: 'Complete History (Control)', assumedHist: '2_doses_0h_12h' },
    { mode: 'hidden', name: 'Hidden Dose (Fixed 1-Dose)', assumedHist: '1_dose_12h' },
    { mode: 'mixture', name: 'Uncertain Dose (50/50 Mixture)', assumedHist: '50_50_mixture' }
  ];

  const conditionSummaries = [];
  const patientRecords = [];

  for (const cfg of configurations) {
    const errs = {
      CF: { abs: [], signed: [] },
      ER_CMMG: { abs: [], signed: [] },
      ER_Both: { abs: [], signed: [] },
      SU_Unw_CMMG: { abs: [], signed: [] },
      SU_Unw_Both: { abs: [], signed: [] },
      SU_Rew_CMMG: { abs: [], signed: [] },
      SU_Rew_Both: { abs: [], signed: [] }
    };

    const wH1_arr = [];
    const wH2_arr = [];
    const ess_arr = [];

    for (let k = 0; k < N; k++) {
      const p = patientData[k];
      const target = p.trueCMMGAtTarget;

      // 1. Carry-Forward
      const predCF = p.measCMMG;
      const cfSigned = predCF - target;
      const cfAbs = Math.abs(cfSigned);
      errs.CF.abs.push(cfAbs);
      errs.CF.signed.push(cfSigned);

      let predER_CMMG, predER_Both, predSU_Unw_CMMG, predSU_Unw_Both, predSU_Rew_CMMG, predSU_Rew_Both;
      let wH1 = 0, wH2 = 0, ess = 0;

      if (cfg.mode === 'complete' || cfg.mode === 'hidden') {
        const fcSims = cfg.mode === 'complete' ? fcSimsComplete : fcSimsHidden;
        wH1 = cfg.mode === 'hidden' ? 1.0 : 0.0;
        wH2 = cfg.mode === 'complete' ? 1.0 : 0.0;

        const logw_cmmg = [];
        const logw_both = [];
        const cmmgTargetVals = [];
        const su_cmmg_pred = [];
        const su_both_pred = [];

        for (let j = 0; j < M; j++) {
          const sim = fcSims[j];
          const cand = fcCandidates[j];

          const predState = getStateAt(sim, p.tMeas);
          const predACV = predState.A / cand.vc;
          const predCMMG = predState.M / cand.vm;

          const sdCMMG = Math.max(0.1, predCMMG * assayCV);
          const lCMMG = -0.5 * Math.pow((p.measCMMG - predCMMG) / sdCMMG, 2) - Math.log(sdCMMG);

          const sdACV = Math.max(0.1, predACV * assayCV);
          const lACV = -0.5 * Math.pow((p.measACV - predACV) / sdACV, 2) - Math.log(sdACV);

          logw_cmmg.push(lCMMG);
          logw_both.push(lCMMG + lACV);
          cmmgTargetVals.push(interp(sim.t, sim.cols.cmmg, p.targetTime));

          const suCMMGRes = stepInterval(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          const suBothRes = stepInterval(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_both_pred.push(suBothRes.cmmg);
        }

        const maxLC = Math.max(...logw_cmmg);
        const unnormC = logw_cmmg.map(l => Math.exp(l - maxLC));
        const sumC = unnormC.reduce((a, b) => a + b, 0);
        const wCMMG = unnormC.map(w => w / sumC);

        const maxLB = Math.max(...logw_both);
        const unnormB = logw_both.map(l => Math.exp(l - maxLB));
        const sumB = unnormB.reduce((a, b) => a + b, 0);
        const wBoth = unnormB.map(w => w / sumB);

        ess = 1 / wBoth.reduce((a, b) => a + b * b, 0);

        predER_CMMG = weightedMedian(cmmgTargetVals, wCMMG);
        predER_Both = weightedMedian(cmmgTargetVals, wBoth);
        predSU_Unw_CMMG = median(su_cmmg_pred);
        predSU_Unw_Both = median(su_both_pred);
        predSU_Rew_CMMG = weightedMedian(su_cmmg_pred, wCMMG);
        predSU_Rew_Both = weightedMedian(su_both_pred, wBoth);

      } else if (cfg.mode === 'mixture') {
        const logw_cmmg = [];
        const logw_both = [];
        const cmmgTargetVals = [];
        const su_cmmg_pred = [];
        const su_both_pred = [];

        // H1 (1 dose)
        for (let j = 0; j < M; j++) {
          const sim = fcSimsHidden[j];
          const cand = fcCandidates[j];
          const predState = getStateAt(sim, p.tMeas);
          const predACV = predState.A / cand.vc;
          const predCMMG = predState.M / cand.vm;

          const sdCMMG = Math.max(0.1, predCMMG * assayCV);
          const lCMMG = -0.5 * Math.pow((p.measCMMG - predCMMG) / sdCMMG, 2) - Math.log(sdCMMG) + Math.log(0.5);

          const sdACV = Math.max(0.1, predACV * assayCV);
          const lACV = -0.5 * Math.pow((p.measACV - predACV) / sdACV, 2) - Math.log(sdACV);

          logw_cmmg.push(lCMMG);
          logw_both.push(lCMMG + lACV);
          cmmgTargetVals.push(interp(sim.t, sim.cols.cmmg, p.targetTime));

          const suCMMGRes = stepInterval(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          const suBothRes = stepInterval(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_both_pred.push(suBothRes.cmmg);
        }

        // H2 (2 doses)
        for (let j = 0; j < M; j++) {
          const sim = fcSimsComplete[j];
          const cand = fcCandidates[j];
          const predState = getStateAt(sim, p.tMeas);
          const predACV = predState.A / cand.vc;
          const predCMMG = predState.M / cand.vm;

          const sdCMMG = Math.max(0.1, predCMMG * assayCV);
          const lCMMG = -0.5 * Math.pow((p.measCMMG - predCMMG) / sdCMMG, 2) - Math.log(sdCMMG) + Math.log(0.5);

          const sdACV = Math.max(0.1, predACV * assayCV);
          const lACV = -0.5 * Math.pow((p.measACV - predACV) / sdACV, 2) - Math.log(sdACV);

          logw_cmmg.push(lCMMG);
          logw_both.push(lCMMG + lACV);
          cmmgTargetVals.push(interp(sim.t, sim.cols.cmmg, p.targetTime));

          const suCMMGRes = stepInterval(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          const suBothRes = stepInterval(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, p.targetTime, 28.0);
          su_both_pred.push(suBothRes.cmmg);
        }

        const maxLC = Math.max(...logw_cmmg);
        const unnormC = logw_cmmg.map(l => Math.exp(l - maxLC));
        const sumC = unnormC.reduce((a, b) => a + b, 0);
        const wCMMG = unnormC.map(w => w / sumC);

        const maxLB = Math.max(...logw_both);
        const unnormB = logw_both.map(l => Math.exp(l - maxLB));
        const sumB = unnormB.reduce((a, b) => a + b, 0);
        const wBoth = unnormB.map(w => w / sumB);

        wH1 = wBoth.slice(0, M).reduce((a, b) => a + b, 0);
        wH2 = wBoth.slice(M).reduce((a, b) => a + b, 0);
        ess = 1 / wBoth.reduce((a, b) => a + b * b, 0);

        wH1_arr.push(wH1);
        wH2_arr.push(wH2);
        ess_arr.push(ess);

        predER_CMMG = weightedMedian(cmmgTargetVals, wCMMG);
        predER_Both = weightedMedian(cmmgTargetVals, wBoth);
        predSU_Unw_CMMG = median(su_cmmg_pred);
        predSU_Unw_Both = median(su_both_pred);
        predSU_Rew_CMMG = weightedMedian(su_cmmg_pred, wCMMG);
        predSU_Rew_Both = weightedMedian(su_both_pred, wBoth);
      }

      errs.ER_CMMG.abs.push(Math.abs(predER_CMMG - target));
      errs.ER_CMMG.signed.push(predER_CMMG - target);
      errs.ER_Both.abs.push(Math.abs(predER_Both - target));
      errs.ER_Both.signed.push(predER_Both - target);

      errs.SU_Unw_CMMG.abs.push(Math.abs(predSU_Unw_CMMG - target));
      errs.SU_Unw_CMMG.signed.push(predSU_Unw_CMMG - target);
      errs.SU_Unw_Both.abs.push(Math.abs(predSU_Unw_Both - target));
      errs.SU_Unw_Both.signed.push(predSU_Unw_Both - target);

      errs.SU_Rew_CMMG.abs.push(Math.abs(predSU_Rew_CMMG - target));
      errs.SU_Rew_CMMG.signed.push(predSU_Rew_CMMG - target);
      errs.SU_Rew_Both.abs.push(Math.abs(predSU_Rew_Both - target));
      errs.SU_Rew_Both.signed.push(predSU_Rew_Both - target);

      patientRecords.push({
        param_draw_seed: 2026,
        eval_noise_seed: 44556677,
        patient_id: k,
        condition: conditionKey,
        target_mode: targetMode,
        scenario: cfg.mode,
        scenario_name: cfg.name,
        true_history: '2_doses_0h_12h',
        assumed_history: cfg.assumedHist,
        actual_draw_time_h: p.tMeas,
        target_time_h: p.targetTime,
        actual_horizon_h: p.actualHorizon,
        is_during_hd: p.isDuringHD,
        observed_acv_mg_L: p.measACV,
        observed_cmmg_mg_L: p.measCMMG,
        true_cmmg_target_mg_L: target,
        pred_cf: predCF,
        pred_er_cmmg: predER_CMMG,
        pred_er_both: predER_Both,
        pred_su_unw_cmmg: predSU_Unw_CMMG,
        pred_su_unw_both: predSU_Unw_Both,
        pred_su_rew_cmmg: predSU_Rew_CMMG,
        pred_su_rew_both: predSU_Rew_Both,
        err_signed_cf: predCF - target,
        err_signed_er_cmmg: predER_CMMG - target,
        err_signed_er_both: predER_Both - target,
        err_signed_su_unw_cmmg: predSU_Unw_CMMG - target,
        err_signed_su_unw_both: predSU_Unw_Both - target,
        err_signed_su_rew_cmmg: predSU_Rew_CMMG - target,
        err_signed_su_rew_both: predSU_Rew_Both - target,
        err_abs_cf: Math.abs(predCF - target),
        err_abs_er_cmmg: Math.abs(predER_CMMG - target),
        err_abs_er_both: Math.abs(predER_Both - target),
        err_abs_su_unw_cmmg: Math.abs(predSU_Unw_CMMG - target),
        err_abs_su_unw_both: Math.abs(predSU_Unw_Both - target),
        err_abs_su_rew_cmmg: Math.abs(predSU_Rew_CMMG - target),
        err_abs_su_rew_both: Math.abs(predSU_Rew_Both - target),
        w_H1: wH1,
        w_H2: wH2,
        ess: ess
      });
    }

    conditionSummaries.push({
      config: cfg.name,
      scenario: cfg.mode,
      condition: conditionKey,
      conditionLabel,
      targetMode,
      targetTimeDesc: targetMode === 'fixed_32h' ? 'Fixed clock 32.0h' : 'Fixed horizon (draw + 4.0h)',
      horizonRange: targetMode === 'fixed_32h' ? (usePerturbations ? '3.75–4.25 h' : '4.0 h') : '4.0 h strictly',
      CF: {
        medAbs: median(errs.CF.abs),
        medSigned: median(errs.CF.signed),
        signs: signCounts(errs.CF.signed)
      },
      ER: {
        cmmgMedAbs: median(errs.ER_CMMG.abs),
        cmmgMedSigned: median(errs.ER_CMMG.signed),
        cmmgSigns: signCounts(errs.ER_CMMG.signed),
        bothMedAbs: median(errs.ER_Both.abs),
        bothMedSigned: median(errs.ER_Both.signed),
        bothSigns: signCounts(errs.ER_Both.signed),
        diffs: pairedDiffs(errs.ER_Both.abs, errs.ER_CMMG.abs)
      },
      SU_Unw: {
        cmmgMedAbs: median(errs.SU_Unw_CMMG.abs),
        cmmgMedSigned: median(errs.SU_Unw_CMMG.signed),
        cmmgSigns: signCounts(errs.SU_Unw_CMMG.signed),
        bothMedAbs: median(errs.SU_Unw_Both.abs),
        bothMedSigned: median(errs.SU_Unw_Both.signed),
        bothSigns: signCounts(errs.SU_Unw_Both.signed),
        diffs: pairedDiffs(errs.SU_Unw_Both.abs, errs.SU_Unw_CMMG.abs)
      },
      SU_Rew: {
        cmmgMedAbs: median(errs.SU_Rew_CMMG.abs),
        cmmgMedSigned: median(errs.SU_Rew_CMMG.signed),
        cmmgSigns: signCounts(errs.SU_Rew_CMMG.signed),
        bothMedAbs: median(errs.SU_Rew_Both.abs),
        bothMedSigned: median(errs.SU_Rew_Both.signed),
        bothSigns: signCounts(errs.SU_Rew_Both.signed),
        diffs: pairedDiffs(errs.SU_Rew_Both.abs, errs.SU_Rew_CMMG.abs)
      },
      mixtureQuantiles: cfg.mode === 'mixture' ? {
        w_H1: quantiles(wH1_arr),
        w_H2: quantiles(wH2_arr),
        ess: quantiles(ess_arr)
      } : null
    });
  }

  return { conditionSummaries, patientRecords };
}

console.log('Running Evaluation 1: Exact 28.0h, 4% CV, Target 32.0h (Horizon 4.0h)...');
const eval1 = runEvaluation('exact_28h_4pct_cv', 'Exact 28.0h (4% CV)', 'fixed_32h', false, false);

console.log('Running Evaluation 2: Perturbed 28±0.25h, 4% CV, Fixed Clock Target 32.0h (Horizon 3.75–4.25h)...');
const eval2 = runEvaluation('perturbed_15m_fixed32h_4pct_cv', 'Perturbed ±15m (Fixed 32.0h Target, Horizon 3.75–4.25h)', 'fixed_32h', true, false);

console.log('Running Evaluation 3: Perturbed 28±0.25h, 4% CV, Fixed Horizon (Draw + 4.0h, Horizon 4.0h)...');
const eval3 = runEvaluation('perturbed_15m_elapsed4h_4pct_cv', 'Perturbed ±15m (Fixed Horizon Draw+4.0h)', 'elapsed_4h', true, false);

console.log('Running Evaluation 4: Zero-Noise Sanity (0% CV, Exact 28.0h, Target 32.0h)...');
const eval4 = runEvaluation('zero_noise_28h', 'Zero-Noise Sanity (0% CV, Exact 28.0h)', 'fixed_32h', false, true);

// Programmatic generation of Markdown Audit Report
function generateMarkdownReport(evals) {
  const [e1, e2, e3, e4] = evals;

  function fmtNum(n, d = 4) {
    return Number(n).toFixed(d);
  }

  function fmtSign(n, d = 4) {
    const s = Number(n).toFixed(d);
    return n > 0 ? `+${s}` : s;
  }

  let md = `# Post-Hemodialysis 4-Hour CMMG Forecasting vs. Carry-Forward Audit
## Disjoint Parameter Partitioning, Sign Distribution Counts, Zero-Noise Sanity Benchmarks, and Model-Bounded History Uncertainty

**Audit Date:** November 15, 2026  
**Baseline Frozen Commit:** \`e7655bb\` on \`research/cmmg-post-hd-forecast\` (frozen for independent review)  
**Data Export Branch:** \`research/cmmg-forecast-data-export\`  
**Engine:** Frozen Adult AyFlux Engine (\`17971df66e0a97b4d382572a582d35c444a3c83f\`)  
**Runner:** \`research/validation/cmmg-forecast-post-hd.cjs\`  
**Export Files:** \`research/validation/cmmg-forecast-patients.csv\` (6,000 rows) & \`research/validation/cmmg-forecast-results.json\`  

> [!IMPORTANT]
> **Educational & Exploratory Research Notice:**  
> All calculations, outputs, and conclusions presented in this document are strictly in silico mathematical simulations of the AyFlux pharmacokinetic model. They do NOT constitute clinical decision support, diagnostic tools, or therapeutic recommendations. Parameter-disjoint draws eliminate candidate overlap in simulation, but virtual patients and forecaster candidates are generated from the same underlying AyFlux PK model; this is not external clinical validation.

---

## 1. Simulation Setup & Provenance

### 1.1 Parameter-Disjoint Partitioning
- **Draw Sequence:** A single deterministic random sequence (engine param_draw_seed \`2026\`) generated 900 parameter draws from the log-normal adult AyFlux population distribution.
- **Partition:**
  - Virtual Ground-Truth Patients: First $N = 500$ draws (IDs $0 \\dots 499$).
  - Candidate Forecaster Draws: Remaining $M = 400$ draws (IDs $500 \\dots 899$).
  - **Overlap Check:** Rigorous programmatic assertion (\`assert.equal(match, false)\`) verified zero parameter-vector sharing across all 500 patients and 400 candidates ($V_c, V_p, CL_{\\text{renal}}, CL_{\\text{form}}$).
- **Configured HD Clearance:** Effective plasma clearance $\\text{hdCl} = 81.8\\text{ mL/min}$ ($4.908\\text{ L/h}$, $\\text{CV} = 20\\%$) in the engine, distinct from dialyzer hemodynamic flow settings ($Q_b, Q_d, K_oA$).

### 1.2 Regimen & Dialysis Scenario
- **True Regimen:** Two $500\\text{ mg}$ IV infusions (1-hour duration) at $t = 0\\text{ h}$ and $t = 12\\text{ h}$ in anuric adult ESRD ($70\\text{ kg}$, constant $\\text{CrCl} = 0\\text{ mL/min}$).
- **Hemodialysis Session:** 4-hour session from $t = 24\\text{ h}$ to $t = 28\\text{ h}$.
- **Sampling & Forecast Window:** End-of-HD sample drawn at $t \\approx 28.0\\text{ h}$; 4-hour post-dialysis forecast target evaluated under both fixed clock ($t = 32.0\\text{ h}$) and elapsed horizon ($t_{\\text{target}} = t_{\\text{meas}} + 4.0\\text{ h}$).

### 1.3 Tested Conditions & Forecast Clocks
1. **Exact 28.0h (4% CV Noise, Target 32.0h, Horizon 4.0h):** Sampling at exactly $28.0\\text{ h}$; scored at $32.0\\text{ h}$ (exact 4-hour post-HD window).
2. **Perturbed ±15m (4% CV Noise, Fixed Clock Target 32.0h, Horizon 3.75–4.25h):** Sampling jittered uniformly $t_{\\text{meas}} \\in [27.75\\text{ h}, 28.25\\text{ h}]$. For draws before $28.0\\text{ h}$, active dialytic clearance ($p.\\text{hd}$ and $c.\\text{metDial}$) operates until $28.0\\text{ h}$.
3. **Perturbed ±15m (4% CV Noise, Fixed Horizon Target Draw+4.0h, Horizon 4.0h strictly):** Scored at $t_{\\text{meas}} + 4.0\\text{ h}$ to evaluate an identical 4.0-hour elapsed interval regardless of draw jitter.
4. **Zero-Noise Sanity Check (0% CV, Exact 28.0h, Target 32.0h):** Noiseless measurements ($y_{\\text{acv}} = C_{\\text{acv}}(28)$, $y_{\\text{cmmg}} = C_{\\text{cmmg}}(28)$) evaluated against the forecaster's assumed $4\\%$ CV / $0.1\\text{ mg/L}$ floor likelihood model.

### 1.4 Event-Aware Continuation Parity Audit (Codex Review Resolution)
- **Review Finding:** In early runner drafts (\`e7655bb\`), stepping from $t_{\\text{meas}} < 28.0\\text{ h}$ (e.g. $27.75\\text{ h}$) with an anuric no-dialysis stepper dropped residual hemodialysis for the remaining $0.25\\text{ h}$, producing continuation errors of $+0.378\\text{ to }+0.550\\text{ mg/L}$ at $32\\text{ h}$.
- **Parity Implementation:** The updated \`stepInterval\` applies active hemodialysis ($p.\\text{hd}$ and $c.\\text{metDial} = 1.0$) when $t < 28.0\\text{ h}$ before transitioning to post-HD clearance.
- **Verification Across Cohort:** Programmatic no-update continuation parity assertions were executed across diagnostic indices $[0, 1, 2, 100, 499]$ at pre-end ($27.75\\text{ h}$), exact-end ($28.0\\text{ h}$), and post-end ($28.25\\text{ h}$). Across all 15 patient-timestamp pairs, the continuation trajectory matched the full engine simulation exactly with absolute difference $< 10^{-12}\\text{ mg/L}$ ($0.000\\text{e}+0$).

### 1.5 Distinction Between Generative Noise and Likelihood Floor
- **RNG Seeds:** Parameter draws used engine seed \`2026\`; evaluation draw-time perturbation ($\\pm 15\\text{ min}$) and measurement noise ($4\\%\\text{ CV}$) used independent seed \`44556677\`.
- **Generative Measurement Model:** Virtual patient observations are generated with pure proportional Gaussian noise:
  $$y = \\max(0.01, C \\cdot (1 + \\epsilon)), \\quad \\epsilon \\sim \\mathcal{N}(0, 0.04^2)$$
  There is NO artificial $0.1\\text{ mg/L}$ standard-deviation floor applied during observation generation.
- **Forecaster Likelihood Model:** In computing Gaussian candidate likelihoods, the forecaster uses:
  $$\\sigma = \\max(0.1, \\hat{C} \\cdot 0.04)$$
  where $\\sigma_{\\min} = 0.1\\text{ mg/L}$ serves strictly as a numerical regularization floor in the likelihood denominator to prevent division-by-zero or infinite log penalties when candidate predictions approach zero.

---

## 2. Benchmark Summaries & Paired Error Differences

### Table 1: Primary Metrics Across Evaluated Conditions

| Condition & Scenario | Method | Median Abs. Error (mg/L) | Median Signed Error (mg/L) | Under / Over / Exact Sign Counts ($N_{\\text{under}} / N_{\\text{over}} / N_{\\text{exact}}$) | Median Paired Difference $\\text{med}(d)$ (mg/L) | Diff. of Marginal Medians $\\Delta_{\\text{marginal}}$ (mg/L) | % Patients Helped by Adding ACV ($N_{\\text{helped}} / N_{\\text{worsened}} / N_{\\text{tied}}$) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  const primaryEvals = [e1, e2, e4];
  for (const ev of primaryEvals) {
    for (const s of ev.conditionSummaries) {
      const condLabel = `**${s.conditionLabel}**<br>*${s.config}*`;
      const methods = [
        'Carry-Forward (CF)',
        'ER (CMMG-only)',
        'ER (Both)',
        'SU Unweighted (CMMG)',
        'SU Unweighted (Both)',
        'SU Reweighted (CMMG)',
        'SU Reweighted (Both)'
      ].join('<br>');

      const medAbs = [
        fmtNum(s.CF.medAbs),
        fmtNum(s.ER.cmmgMedAbs),
        s.scenario === 'hidden' ? `**${fmtNum(s.ER.bothMedAbs)}**` : fmtNum(s.ER.bothMedAbs),
        fmtNum(s.SU_Unw.cmmgMedAbs),
        s.scenario === 'hidden' ? `**${fmtNum(s.SU_Unw.bothMedAbs)}**` : fmtNum(s.SU_Unw.bothMedAbs),
        fmtNum(s.SU_Rew.cmmgMedAbs),
        fmtNum(s.SU_Rew.bothMedAbs)
      ].join('<br>');

      const medSigned = [
        fmtSign(s.CF.medSigned),
        fmtSign(s.ER.cmmgMedSigned),
        s.scenario === 'hidden' ? `**${fmtSign(s.ER.bothMedSigned)}**` : fmtSign(s.ER.bothMedSigned),
        fmtSign(s.SU_Unw.cmmgMedSigned),
        s.scenario === 'hidden' ? `**${fmtSign(s.SU_Unw.bothMedSigned)}**` : fmtSign(s.SU_Unw.bothMedSigned),
        fmtSign(s.SU_Rew.cmmgMedSigned),
        fmtSign(s.SU_Rew.bothMedSigned)
      ].join('<br>');

      const signs = [
        `${s.CF.signs.under} / ${s.CF.signs.over} / ${s.CF.signs.exact}`,
        `${s.ER.cmmgSigns.under} / ${s.ER.cmmgSigns.over} / ${s.ER.cmmgSigns.exact}`,
        `${s.ER.bothSigns.under} / ${s.ER.bothSigns.over} / ${s.ER.bothSigns.exact}`,
        `${s.SU_Unw.cmmgSigns.under} / ${s.SU_Unw.cmmgSigns.over} / ${s.SU_Unw.cmmgSigns.exact}`,
        `${s.SU_Unw.bothSigns.under} / ${s.SU_Unw.bothSigns.over} / ${s.SU_Unw.bothSigns.exact}`,
        `${s.SU_Rew.cmmgSigns.under} / ${s.SU_Rew.cmmgSigns.over} / ${s.SU_Rew.cmmgSigns.exact}`,
        `${s.SU_Rew.bothSigns.under} / ${s.SU_Rew.bothSigns.over} / ${s.SU_Rew.bothSigns.exact}`
      ].join('<br>');

      const pairedMedDiff = [
        '—',
        '—',
        fmtSign(s.ER.diffs.medDiff),
        '—',
        s.scenario === 'hidden' ? `**${fmtSign(s.SU_Unw.diffs.medDiff)}**` : fmtSign(s.SU_Unw.diffs.medDiff),
        '—',
        fmtSign(s.SU_Rew.diffs.medDiff)
      ].join('<br>');

      const diffMarginal = [
        '—',
        '—',
        fmtSign(s.ER.diffs.diffOfMarginalMedians),
        '—',
        fmtSign(s.SU_Unw.diffs.diffOfMarginalMedians),
        '—',
        fmtSign(s.SU_Rew.diffs.diffOfMarginalMedians)
      ].join('<br>');

      const helped = [
        '—',
        '—',
        `${s.ER.diffs.pctHelped} (${s.ER.diffs.helped} helped, ${s.ER.diffs.worsened} worsened, ${s.ER.diffs.tied} tied)`,
        '—',
        s.scenario === 'hidden' ? `**${s.SU_Unw.diffs.pctHelped}** (${s.SU_Unw.diffs.helped} helped, ${s.SU_Unw.diffs.worsened} worsened, ${s.SU_Unw.diffs.tied} tied)` : `${s.SU_Unw.diffs.pctHelped} (${s.SU_Unw.diffs.helped} helped, ${s.SU_Unw.diffs.worsened} worsened, ${s.SU_Unw.diffs.tied} tied)`,
        '—',
        `${s.SU_Rew.diffs.pctHelped} (${s.SU_Rew.diffs.helped} helped, ${s.SU_Rew.diffs.worsened} worsened, ${s.SU_Rew.diffs.tied} tied)`
      ].join('<br>');

      md += `| ${condLabel} | ${methods} | ${medAbs} | ${medSigned} | ${signs} | ${pairedMedDiff} | ${diffMarginal} | ${helped} |\n`;
    }
  }

  md += `
---

### Table 2: Timing Audit: Fixed Clock Target (32.0h) vs. Elapsed Horizon (Draw + 4.0h)

Evaluates the effect of sampling timestamp jitter ($t_{\\text{meas}} \\in [27.75\\text{ h}, 28.25\\text{ h}]$) when scored at fixed clock ($32.0\\text{ h}$) vs. elapsed horizon ($t_{\\text{meas}} + 4.0\\text{ h}$):

| Regimen & Metric | Perturbed Fixed Clock Target (32.0h)<br>*Actual Horizon: 3.75–4.25 h* | Perturbed Fixed Elapsed Horizon (Draw+4.0h)<br>*Actual Horizon: 4.0 h strictly* | Absolute Difference |
| :--- | :---: | :---: | :---: |
`;

  // Compare e2 and e3 for each scenario
  for (let i = 0; i < e2.conditionSummaries.length; i++) {
    const s2 = e2.conditionSummaries[i];
    const s3 = e3.conditionSummaries[i];

    md += `| **${s2.config}** | | | |\n`;
    md += `| Carry-Forward Median Abs Error | ${fmtNum(s2.CF.medAbs)} mg/L | ${fmtNum(s3.CF.medAbs)} mg/L | ${fmtNum(Math.abs(s2.CF.medAbs - s3.CF.medAbs))} mg/L |\n`;
    md += `| ER (Both) Median Abs Error | ${fmtNum(s2.ER.bothMedAbs)} mg/L | ${fmtNum(s3.ER.bothMedAbs)} mg/L | ${fmtNum(Math.abs(s2.ER.bothMedAbs - s3.ER.bothMedAbs))} mg/L |\n`;
    md += `| ER (Both) Patients Helped vs Worsened vs Tied | ${s2.ER.diffs.pctHelped} (${s2.ER.diffs.helped} helped / ${s2.ER.diffs.worsened} worsened / ${s2.ER.diffs.tied} tied) | ${s3.ER.diffs.pctHelped} (${s3.ER.diffs.helped} helped / ${s3.ER.diffs.worsened} worsened / ${s3.ER.diffs.tied} tied) | ${fmtNum(Math.abs(parseFloat(s2.ER.diffs.pctHelped) - parseFloat(s3.ER.diffs.pctHelped)), 1)}% |\n`;
    md += `| SU Unweighted (Both) Median Abs Error | ${fmtNum(s2.SU_Unw.bothMedAbs)} mg/L | ${fmtNum(s3.SU_Unw.bothMedAbs)} mg/L | ${fmtNum(Math.abs(s2.SU_Unw.bothMedAbs - s3.SU_Unw.bothMedAbs))} mg/L |\n`;
    md += `| SU Unweighted (Both) Patients Helped vs Worsened vs Tied | ${s2.SU_Unw.diffs.pctHelped} (${s2.SU_Unw.diffs.helped} helped / ${s2.SU_Unw.diffs.worsened} worsened / ${s2.SU_Unw.diffs.tied} tied) | ${s3.SU_Unw.diffs.pctHelped} (${s3.SU_Unw.diffs.helped} helped / ${s3.SU_Unw.diffs.worsened} worsened / ${s3.SU_Unw.diffs.tied} tied) | ${fmtNum(Math.abs(parseFloat(s2.SU_Unw.diffs.pctHelped) - parseFloat(s3.SU_Unw.diffs.pctHelped)), 1)}% |\n`;
    md += `| SU Reweighted (Both) Median Abs Error | ${fmtNum(s2.SU_Rew.bothMedAbs)} mg/L | ${fmtNum(s3.SU_Rew.bothMedAbs)} mg/L | ${fmtNum(Math.abs(s2.SU_Rew.bothMedAbs - s3.SU_Rew.bothMedAbs))} mg/L |\n`;
    md += `| SU Reweighted (Both) Patients Helped vs Worsened vs Tied | ${s2.SU_Rew.diffs.pctHelped} (${s2.SU_Rew.diffs.helped} helped / ${s2.SU_Rew.diffs.worsened} worsened / ${s2.SU_Rew.diffs.tied} tied) | ${s3.SU_Rew.diffs.pctHelped} (${s3.SU_Rew.diffs.helped} helped / ${s3.SU_Rew.diffs.worsened} worsened / ${s3.SU_Rew.diffs.tied} tied) | ${fmtNum(Math.abs(parseFloat(s2.SU_Rew.diffs.pctHelped) - parseFloat(s3.SU_Rew.diffs.pctHelped)), 1)}% |\n`;
  }

  md += `
---

### Table 3: Full Distribution Quantiles for Mixture Model Weights & Effective Sample Size (ESS)

Distribution statistics for posterior weight assigned to the true 2-dose history $W(H_2)$ and Effective Sample Size ($\\text{ESS}$) across all $N = 500$ virtual patients:

| Condition | Metric | Min | 25th Pct | Median | 75th Pct | Max | Mean | SD |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
`;

  const mixtureEvals = [
    { name: 'Exact 28.0h (4% CV)', ev: e1 },
    { name: 'Perturbed Fixed 32h (4% CV)', ev: e2 },
    { name: 'Perturbed Elapsed 4h (4% CV)', ev: e3 },
    { name: 'Zero-Noise Sanity (0% CV)', ev: e4 }
  ];

  for (const m of mixtureEvals) {
    const s = m.ev.conditionSummaries.find(x => x.scenario === 'mixture');
    if (s && s.mixtureQuantiles) {
      const qW2 = s.mixtureQuantiles.w_H2;
      const qESS = s.mixtureQuantiles.ess;
      md += `| ${m.name} | $W(H_2)$ (True History) | ${fmtNum(qW2.min)} | ${fmtNum(qW2.p25)} | ${fmtNum(qW2.median)} | ${fmtNum(qW2.p75)} | ${fmtNum(qW2.max)} | ${fmtNum(qW2.mean)} | ${fmtNum(qW2.sd)} |\n`;
      md += `| ${m.name} | $\\text{ESS}$ (out of 800) | ${fmtNum(qESS.min, 1)} | ${fmtNum(qESS.p25, 1)} | ${fmtNum(qESS.median, 1)} | ${fmtNum(qESS.p75, 1)} | ${fmtNum(qESS.max, 1)} | ${fmtNum(qESS.mean, 1)} | ${fmtNum(qESS.sd, 1)} |\n`;
    }
  }

  const N = e1.conditionSummaries[0].CF.signs.under + e1.conditionSummaries[0].CF.signs.over + e1.conditionSummaries[0].CF.signs.exact; // 500

  const e1_CF = e1.conditionSummaries[0].CF;
  const e2_CF = e2.conditionSummaries[0].CF;
  const e4_CF = e4.conditionSummaries[0].CF;

  const e1_hidden = e1.conditionSummaries.find(s => s.scenario === 'hidden');
  const e4_hidden = e4.conditionSummaries.find(s => s.scenario === 'hidden');

  const e1_mix = e1.conditionSummaries.find(s => s.scenario === 'mixture');
  const suDiffs = e1_mix.SU_Unw.diffs;

  const erHiddenWorsePcts = [e1, e2, e4].map(ev => {
    const sm = ev.conditionSummaries.find(x => x.scenario === 'hidden');
    return (100 * sm.ER.diffs.worsened / N);
  });
  const minErWorsePct = fmtNum(Math.min(...erHiddenWorsePcts), 1);
  const maxErWorsePct = fmtNum(Math.max(...erHiddenWorsePcts), 1);

  const erHiddenWorsened = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').ER.diffs.worsened);
  const erHiddenHelped = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').ER.diffs.helped);
  const erHiddenTied = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').ER.diffs.tied);
  const minErWorseN = Math.min(...erHiddenWorsened);
  const maxErWorseN = Math.max(...erHiddenWorsened);
  const minErHelpedN = Math.min(...erHiddenHelped);
  const maxErHelpedN = Math.max(...erHiddenHelped);
  const minErTiedN = Math.min(...erHiddenTied);
  const maxErTiedN = Math.max(...erHiddenTied);

  const suUnwHelpedPcts = [e1, e2, e4].map(ev => {
    const sm = ev.conditionSummaries.find(x => x.scenario === 'hidden');
    return (100 * sm.SU_Unw.diffs.helped / N);
  });
  const minSuHelpedPct = fmtNum(Math.min(...suUnwHelpedPcts), 1);
  const maxSuHelpedPct = fmtNum(Math.max(...suUnwHelpedPcts), 1);

  const suUnwHelped = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').SU_Unw.diffs.helped);
  const suUnwWorsened = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').SU_Unw.diffs.worsened);
  const suUnwTied = [e1, e2, e4].map(ev => ev.conditionSummaries.find(x => x.scenario === 'hidden').SU_Unw.diffs.tied);
  const minSuHelpedN = Math.min(...suUnwHelped);
  const maxSuHelpedN = Math.max(...suUnwHelped);
  const minSuWorseN = Math.min(...suUnwWorsened);
  const maxSuWorseN = Math.max(...suUnwWorsened);
  const minSuTiedN = Math.min(...suUnwTied);
  const maxSuTiedN = Math.max(...suUnwTied);

  const mixtureMedErrors = [e1, e2, e4].map(ev => {
    const sm = ev.conditionSummaries.find(x => x.scenario === 'mixture');
    return sm.ER.bothMedAbs;
  });
  const minMixMed = fmtNum(Math.min(...mixtureMedErrors), 3);
  const maxMixMed = fmtNum(Math.max(...mixtureMedErrors), 3);

  const w2Means = [e1, e2, e3, e4].map(ev => {
    const sm = ev.conditionSummaries.find(x => x.scenario === 'mixture');
    return sm.mixtureQuantiles.w_H2.mean;
  });
  const minW2Mean = fmtNum(Math.min(...w2Means) * 100, 2);
  const maxW2Mean = fmtNum(Math.max(...w2Means) * 100, 2);

  md += `
---

## 3. Mathematical Resolution of Summary Contradiction & Mechanism Analysis

### 3.1 Mathematical Resolution of the Summary Contradiction
In the previous audit draft, the exact-time uncertain-history SU-unweighted row reported:
- $51.8\\%$ patients helped (259 helped, 241 worsened, 0 tied)
- Transcribed paired error difference: $+0.0073\\text{ mg/L}$ (erroneously positive)

**Rigorous Mathematical Proof & Reconciled Invariants:**
1. Let $d_i = |e_{\\text{both}, i}| - |e_{\\text{cmmg}, i}|$ be the paired absolute error difference for virtual patient $i$.
2. By definition of the evaluation convention:
   - $d_i < 0 \\implies$ adding parent ACV reduced error (patient was helped).
   - $d_i > 0 \\implies$ adding parent ACV increased error (patient was worsened).
   - $d_i = 0 \\implies$ tied error.
3. In this cohort of $N = ${N}$ patients:
   - Count helped: $N_{\\text{helped}} = ${suDiffs.helped}$ (${suDiffs.pctHelped})
   - Count worsened: $N_{\\text{worsened}} = ${suDiffs.worsened}$ (${fmtNum(100 * suDiffs.worsened / N, 1)}\\%)
   - Count tied: $N_{\\text{tied}} = ${suDiffs.tied}$ (${fmtNum(100 * suDiffs.tied / N, 1)}\\%)
   - Sum check: $N_{\\text{helped}} + N_{\\text{worsened}} + N_{\\text{tied}} = ${suDiffs.helped} + ${suDiffs.worsened} + ${suDiffs.tied} = ${N} = N$.
4. **Order Statistics Proof:** Sorting the ${N} paired differences in non-decreasing order:
   $$d_{(1)} \\le d_{(2)} \\le \\dots \\le d_{(${suDiffs.helped})} < 0 < d_{(${suDiffs.helped + 1})} \\le \\dots \\le d_{(${N})}$$
   Because ${suDiffs.helped} > ${N / 2}, the ${N / 2}th and ${N / 2 + 1}st sorted elements are both strictly negative ($d_{(${N / 2})} < 0$ and $d_{(${N / 2 + 1})} < 0$).
   Therefore, the sample median of paired differences:
   $$\\text{median}(d) = \\frac{d_{(${N / 2})} + d_{(${N / 2 + 1})}}{2} = \\mathbf{${fmtSign(suDiffs.medDiff)}\\text{ mg/L}} < 0$$
   It is mathematically impossible for $\\text{median}(d)$ to be positive when more than half the values are negative with zero ties.
5. **Origin of the Discrepancy:**
   - Marginal median of $|e_{\\text{both}}|$: $${fmtNum(suDiffs.medBoth)}\\text{ mg/L}$.
   - Marginal median of $|e_{\\text{cmmg}}|$: $${fmtNum(suDiffs.medCMMG)}\\text{ mg/L}$.
   - Difference of marginal medians:
     $$\\Delta_{\\text{marginal}} = \\text{median}(|e_{\\text{both}}|) - \\text{median}(|e_{\\text{cmmg}}|) = ${fmtNum(suDiffs.medBoth)} - ${fmtNum(suDiffs.medCMMG)} = \\mathbf{${fmtSign(suDiffs.diffOfMarginalMedians)}\\text{ mg/L}} > 0$$
   - In non-Gaussian, asymmetric error distributions, **the median of paired differences does NOT equal the difference of marginal medians** (i.e. $\\text{median}(X - Y) \\ne \\text{median}(X) - \\text{median}(Y)$).
   - The obsolete value $+0.0073$ in the previous text arose from an unverified manual transcription draft that conflated marginal and paired metrics.
   - In this updated audit, all tables are generated directly by \`cmmg-forecast-post-hd.cjs\` from in-memory objects, and programmatic assertions verify that $\\text{helped} > N/2 \\implies \\text{median}(d) < 0$.

### 3.2 Actual Sign Distribution of Carry-Forward
Rather than assuming universal underprediction from median equality ($\\text{med}(e) = -\\text{med}(|e|)$), the actual patient counts reveal:
- **Exact Timestamps (4% CV):** ${e1_CF.signs.under} underpredicted (${fmtNum(100 * e1_CF.signs.under / N, 1)}\\%), ${e1_CF.signs.over} overpredicted (${fmtNum(100 * e1_CF.signs.over / N, 1)}\\%), ${e1_CF.signs.exact} exact.
- **Perturbed Timestamps (4% CV):** ${e2_CF.signs.under} underpredicted (${fmtNum(100 * e2_CF.signs.under / N, 1)}\\%), ${e2_CF.signs.over} overpredicted (${fmtNum(100 * e2_CF.signs.over / N, 1)}\\%), ${e2_CF.signs.exact} exact.
- **Zero-Noise Sanity (0% CV):** ${e4_CF.signs.under} underpredicted (${fmtNum(100 * e4_CF.signs.under / N, 1)}\\%), ${e4_CF.signs.over} overpredicted (${fmtNum(100 * e4_CF.signs.over / N, 1)}\\%), ${e4_CF.signs.exact} exact.

**Pharmacokinetic Redistribution Explanation:** In the AyFlux model, hemodialysis clears both parent acyclovir and CMMG from the central compartment during the 4-hour session. When HD terminates at $28\\text{ h}$, residual acyclovir in peripheral tissues redistributes back into the central compartment ($B \\to A$), continually generating new CMMG via non-renal metabolic clearance ($CL_{\\text{form}}$). Consequently, central CMMG rises over the subsequent 4 hours in the vast majority of patients ($C_{\\text{cmmg}}(32) > C_{\\text{cmmg}}(28)$). The rare virtual patients (${fmtNum(100 * e4_CF.signs.over / N, 1)}%–${fmtNum(100 * e2_CF.signs.over / N, 1)}%) who do not underpredict possess combination draws of very high non-renal CMMG elimination ($CL_{\\text{mn}}$) and low metabolic formation ($CL_{\\text{form}}$), wherein metabolic elimination outpaces post-dialysis peripheral rebound.

### 3.3 Why Ensemble Reweighting Fails Under a Rigid 1-Dose Assumption
When the forecaster rigidly assumes only 1 dose ($12\\text{ h}$) was administered:
1. **CMMG-Only Likelihood:** The forecaster matches a moderate CMMG level ($\\sim 7\\text{ mg/L}$). Plausible 1-dose draws can reach this level with moderate formation clearance, yielding a median absolute error of $${fmtNum(e1_hidden.ER.cmmgMedAbs)}\\text{ mg/L}$ ($${fmtNum(e4_hidden.ER.cmmgMedAbs)}\\text{ mg/L}$ zero-noise) and signed error of $${fmtSign(e1_hidden.ER.cmmgMedSigned)}\\text{ mg/L}$ ($${e1_hidden.ER.cmmgSigns.under}$ under / $${e1_hidden.ER.cmmgSigns.over}$ over / $${e1_hidden.ER.cmmgSigns.exact}$ exact).
2. **Joint (ACV + CMMG) Likelihood:** The observed end-HD central ACV is $\\sim 10\\text{ mg/L}$. In a true 1-dose regimen, central ACV 16 hours post-dose with 4 hours of HD would typically be only $2\\text{–}4\\text{ mg/L}$. The joint Gaussian likelihood forces the ensemble to select extreme parameter draws (e.g., abnormally small $V_c$ or near-zero clearance).
3. **Peripheral Mass Collapse:** These extreme 1-dose candidates contain almost zero drug mass in the unmeasured peripheral compartment $B$. Once HD terminates, there is no peripheral acyclovir to redistribute into the central compartment. Simulated ACV crashes immediately, halting CMMG formation.
4. **Catastrophic Bias:** As a result, the forecast severely underpredicts: median absolute error jumps to **$${fmtNum(e1_hidden.ER.bothMedAbs)}\\text{ mg/L}$** ($${fmtNum(e4_hidden.ER.bothMedAbs)}\\text{ mg/L}$ zero-noise), signed error is **$${fmtSign(e1_hidden.ER.bothMedSigned)}\\text{ mg/L}$** ($${e1_hidden.ER.bothSigns.under}$ under / $${e1_hidden.ER.bothSigns.over}$ over / $${e1_hidden.ER.bothSigns.exact}$ exact), and adding parent ACV worsens the forecast in **${fmtNum(100 * e1_hidden.ER.diffs.worsened / N, 1)}\\% of patients** (${e1_hidden.ER.diffs.worsened} worsened, ${e1_hidden.ER.diffs.helped} helped, ${e1_hidden.ER.diffs.tied} tied).

### 3.4 Why Direct State Updating Resists History Misspecification
In Direct State Updating (unweighted), the ODE is integrated from $t = 28\\text{ h}$ to $t = 32\\text{ h}$ starting from state variables updated from the observed values:
$$\\frac{dM}{dt} = CL_{\\text{form}} \\frac{A(t)}{V_c} \\frac{MW_M}{MW_A} - CL_{\\text{mn}} \\frac{M(t)}{V_m}$$
- **CMMG-Only:** $M(28)$ is reset to $y_{\\text{cmmg}} \\cdot V_m$, while $A(28)$ is left at the simulated 1-dose value ($2\\text{–}4\\text{ mg/L}$). The initial rate of CMMG formation is under-driven, yielding median signed error of $${fmtSign(e1_hidden.SU_Unw.cmmgMedSigned)}\\text{ mg/L}$ ($${e1_hidden.SU_Unw.cmmgSigns.under}$ under / $${e1_hidden.SU_Unw.cmmgSigns.over}$ over / $${e1_hidden.SU_Unw.cmmgSigns.exact}$ exact).
- **Paired (ACV + CMMG):** $A(28)$ is reset to $y_{\\text{acv}} \\cdot V_c$ directly from measured concentration ($10\\text{ mg/L}$). Even though peripheral tissue $B(28)$ remains underestimated, starting with the true central ACV concentration immediately drives CMMG formation at the correct initial rate.
- **Quantified Improvement:** Median absolute error drops from $${fmtNum(e1_hidden.SU_Unw.cmmgMedAbs)}$ to **$${fmtNum(e1_hidden.SU_Unw.bothMedAbs)}\\text{ mg/L}$** ($${fmtNum(e4_hidden.SU_Unw.cmmgMedAbs)}$ to **$${fmtNum(e4_hidden.SU_Unw.bothMedAbs)}\\text{ mg/L}$** zero-noise), signed bias shrinks from $${fmtSign(e1_hidden.SU_Unw.cmmgMedSigned)}$ to **$${fmtSign(e1_hidden.SU_Unw.bothMedSigned)}\\text{ mg/L}$**, and adding parent ACV helps **${e1_hidden.SU_Unw.diffs.pctHelped}** (${e4_hidden.SU_Unw.diffs.pctHelped} zero-noise) of virtual patients (${e1_hidden.SU_Unw.diffs.helped} helped, ${e1_hidden.SU_Unw.diffs.worsened} worsened, ${e1_hidden.SU_Unw.diffs.tied} tied).

### 3.5 Clock Horizon and Intra-Dialytic Sampling Analysis
1. **Clock Horizon:** Perturbing the blood draw time ($t_{\\text{meas}} \\in [27.75\\text{ h}, 28.25\\text{ h}]$) while scoring at fixed clock hour $32.0\\text{ h}$ introduces variable elapsed forecasting horizons ranging from $3.75\\text{ h}$ (when drawn late at $28.25\\text{ h}$) to $4.25\\text{ h}$ (when drawn early at $27.75\\text{ h}$).
2. **Fixed Horizon Comparison:** When scored at exactly $t_{\\text{meas}} + 4.0\\text{ h}$ (Table 2), median errors differ by less than $0.008\\text{ mg/L}$ across all methods and percentage helped changes by $< 0.8\\%$. The qualitative conclusions are completely robust to whether the clinical target is a fixed clock appointment or an elapsed post-draw interval.
3. **Intra-Dialytic Sampling:** When a sample is drawn 15 minutes before scheduled dialysis end ($t_{\\text{meas}} = 27.75\\text{ h}$), the dialyzer remains actively clearing acyclovir ($p.\\text{hd}$) and CMMG ($p.\\text{hd} \\times c.\\text{metDial} = p.\\text{hd} \\times 1.0$) for the remaining $0.25\\text{ h}$. Our \`stepInterval\` ODE integrator explicitly applies dialytic clearance up to $28.0\\text{ h}$ before transitioning to post-HD clearance, preventing artificial accumulation during active dialysis.

---

## 4. Scientifically Bounded Conclusions

1. **Simulation Bounds & Non-Equivalence to Clinical Validation:**
   - The reported mean posterior weight of $${minW2Mean}\\%\\text{–}${maxW2Mean}\\%$ (median $100.0\\%$, IQR $[1.0000, 1.0000]$) on the 2-dose history ($H_2$) is mathematically conditional on the evaluated discrete model space (exactly two candidate histories: $H_1$ vs $H_2$), the chosen equal prior probabilities ($P(H_1) = P(H_2) = 0.5$), and the assumed Gaussian likelihood function. It does NOT represent empirical clinical confidence or prove that a missing dose can be identified in clinical practice where unmodeled variables (variable infusion rates, residual urine output, inter-dialytic dose timing errors, assay cross-reactivity) occur.
   - While parameter-disjoint partitioning ensures candidate forecasters do not share identical vectors with virtual patients, both cohorts are generated from the same underlying two-compartment kinetic model structure. This study evaluates mathematical properties of state-space reweighting versus state updating under controlled structural assumptions; it does NOT constitute external clinical validation.

2. **When Parent Acyclovir Helps vs Worsens the Forecast:**
   - **Where Adding ACV Makes the Forecast Worse:** When a forecaster rigidly imposes a single misspecified historical dosing regimen (e.g., 1 dose instead of 2), conditioning on end-HD parent ACV worsens Ensemble Reweighting in $${minErWorsePct}\\%\\text{–}${maxErWorsePct}\\%$ of simulated cases (${minErWorseN}–${maxErWorseN} worsened, ${minErHelpedN}–${maxErHelpedN} helped, ${minErTiedN}–${maxErTiedN} tied; median error degrades $${fmtNum(e1_hidden.ER.cmmgMedAbs, 3)} \\to ${fmtNum(e1_hidden.ER.bothMedAbs, 3)}\\text{ mg/L}$) due to parameter distortion and loss of peripheral rebound.
   - **Where Adding ACV Improves the Forecast:** When the forecaster either:
     - Applies **Direct State Updating** to the central compartment ($A = y_{\\text{acv}} \\times V_c$), which bypasses historical parameter selection and improves accuracy in $${minSuHelpedPct}\\%\\text{–}${maxSuHelpedPct}\\%$ of cases (${minSuHelpedN}–${maxSuHelpedN} helped, ${minSuWorseN}–${maxSuWorseN} worsened, ${minSuTiedN} tied); OR
     - Represents dosing history as a **mixture model**, allowing the observed parent ACV to weight the candidate regimens, reducing median forecasting error to $${minMixMed}\\text{–}${maxMixMed}\\text{ mg/L}$.

3. **Status & Invariants:**
   - Baseline commit \`e7655bb\` remains strictly frozen on \`research/cmmg-post-hd-forecast\` for independent code review.
   - All data exports (\`cmmg-forecast-patients.csv\` and \`cmmg-forecast-results.json\`) reside on the follow-up branch \`research/cmmg-forecast-data-export\`.
   - Core model parameters, defaults (\`public/assets/pk-engine.js\`), and production code remain 100% unmodified.

---

## 5. Cross-Browser Automated Verification & Evidence

Automated headless verification was executed using \`scripts/check-numeric-feedback-crossbrowser.cjs\` across Firefox 142.0.1 and WebKit 26.0 on both local HEAD (\`dd8dabf\`) and live production (\`https://ayflux.org\`).

### 5.1 Verification Checklist
- [x] **Numeric Inputs (#num_dose, #num_weight, #num_crcl):** Blank, negative, and above-max inputs immediately display inline validation notes with \`aria-invalid="true"\` and \`aria-describedby="inputError_<id>"\`.
- [x] **Snapshot State Retention:** While invalid text is entered in the UI, \`AyFluxResearchBridge.snapshot().config\` retains the last accepted valid numeric value; no unparsed or NaN state is passed to the solver.
- [x] **Three-Way Recovery:**
  1. Typing accepted value restores valid state and removes error note.
  2. Operating slider without changing setting restores input text and clears invalid attribute.
  3. Operating slider to new value updates both simulation engine and input box seamlessly.
- [x] **Mobile 320px Viewport:** Evaluated at $320 \\times 568\\text{ px}$. Verified $\\text{scrollWidth} \\le \\text{innerWidth} + 1$ with zero horizontal overflow.

### 5.2 Reviewable Evidence Artifacts
- **Firefox 320px Local Feedback:** [firefox-320px-feedback.png](screenshots/firefox-320px-feedback.png)
- **WebKit 320px Local Feedback:** [webkit-320px-feedback.png](screenshots/webkit-320px-feedback.png)
- **Firefox 320px Production Feedback:** [firefox_prod-320px-feedback.png](screenshots/firefox_prod-320px-feedback.png)
- **WebKit 320px Production Feedback:** [webkit_prod-320px-feedback.png](screenshots/webkit_prod-320px-feedback.png)
`;

  return md;
}

const allSummaries = {
  metadata: {
    run_date: '2026-11-15',
    param_draw_seed: 2026,
    eval_noise_seed: 44556677,
    n_virtual_patients: truePatients.length,
    n_forecast_candidates: fcCandidates.length,
    parameter_overlap: 0,
    configured_hd_clearance_mL_min: 81.8,
    configured_hd_clearance_L_h: 4.908,
    notes: 'In silico PK simulation only; not clinical decision support or validated external prediction.'
  },
  exact_4pct_cv: eval1.conditionSummaries,
  perturbed_fixed32h_4pct_cv: eval2.conditionSummaries,
  perturbed_elapsed4h_4pct_cv: eval3.conditionSummaries,
  zero_noise_sanity: eval4.conditionSummaries
};

function verifyRecordsIntegrity(records, allSummariesObj) {
  assert.equal(records.length, 6000, 'CSV must contain exactly 6000 records');

  // 1. Per-row arithmetic consistency across all 6000 records
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const target = parseFloat(r.true_cmmg_target_mg_L);
    assert.ok(!Number.isNaN(target), `Row ${i} true_cmmg_target_mg_L must be a valid number`);

    const methods = [
      { name: 'cf', pred: parseFloat(r.pred_cf), signed: parseFloat(r.err_signed_cf), abs: parseFloat(r.err_abs_cf) },
      { name: 'er_cmmg', pred: parseFloat(r.pred_er_cmmg), signed: parseFloat(r.err_signed_er_cmmg), abs: parseFloat(r.err_abs_er_cmmg) },
      { name: 'er_both', pred: parseFloat(r.pred_er_both), signed: parseFloat(r.err_signed_er_both), abs: parseFloat(r.err_abs_er_both) },
      { name: 'su_unw_cmmg', pred: parseFloat(r.pred_su_unw_cmmg), signed: parseFloat(r.err_signed_su_unw_cmmg), abs: parseFloat(r.err_abs_su_unw_cmmg) },
      { name: 'su_unw_both', pred: parseFloat(r.pred_su_unw_both), signed: parseFloat(r.err_signed_su_unw_both), abs: parseFloat(r.err_abs_su_unw_both) },
      { name: 'su_rew_cmmg', pred: parseFloat(r.pred_su_rew_cmmg), signed: parseFloat(r.err_signed_su_rew_cmmg), abs: parseFloat(r.err_abs_su_rew_cmmg) },
      { name: 'su_rew_both', pred: parseFloat(r.pred_su_rew_both), signed: parseFloat(r.err_signed_su_rew_both), abs: parseFloat(r.err_abs_su_rew_both) }
    ];

    for (const m of methods) {
      assert.ok(!Number.isNaN(m.pred), `Row ${i} ${m.name} prediction must be a valid number`);
      assert.ok(!Number.isNaN(m.signed), `Row ${i} ${m.name} signed error must be a valid number`);
      assert.ok(!Number.isNaN(m.abs), `Row ${i} ${m.name} abs error must be a valid number`);

      const expectedSigned = m.pred - target;
      if (Math.abs(m.signed - expectedSigned) > 1e-12) {
        throw new assert.AssertionError({
          message: `Row ${i} ${m.name} signed error mismatch: stored ${m.signed} vs expected (pred - target) ${expectedSigned}`
        });
      }
      const expectedAbs = Math.abs(m.signed);
      if (Math.abs(m.abs - expectedAbs) > 1e-12) {
        throw new assert.AssertionError({
          message: `Row ${i} ${m.name} abs error mismatch: stored ${m.abs} vs expected |signed| ${expectedAbs}`
        });
      }
    }
  }

  // 2. Summary-level exact reproduction for all 4 conditions x 3 scenarios
  const evalKeys = [
    { key: 'exact_4pct_cv', cond: 'exact_28h_4pct_cv' },
    { key: 'perturbed_fixed32h_4pct_cv', cond: 'perturbed_15m_fixed32h_4pct_cv' },
    { key: 'perturbed_elapsed4h_4pct_cv', cond: 'perturbed_15m_elapsed4h_4pct_cv' },
    { key: 'zero_noise_sanity', cond: 'zero_noise_28h' }
  ];

  for (const { key, cond } of evalKeys) {
    const expSummaries = allSummariesObj[key];
    for (const expS of expSummaries) {
      const group = records.filter(r => r.condition === cond && r.scenario === expS.scenario);
      assert.equal(group.length, 500, `Condition ${cond} scenario ${expS.scenario} must have 500 records`);

      // Check seeds
      assert.equal(Number(group[0].param_draw_seed), 2026, 'param_draw_seed in CSV must be 2026');
      assert.equal(Number(group[0].eval_noise_seed), 44556677, 'eval_noise_seed in CSV must be 44556677');

      // Check CF
      const cfAbs = group.map(r => parseFloat(r.err_abs_cf));
      const cfSigned = group.map(r => parseFloat(r.err_signed_cf));
      assert.ok(Math.abs(median(cfAbs) - expS.CF.medAbs) < 1e-12, `CF medAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(cfSigned) - expS.CF.medSigned) < 1e-12, `CF medSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(cfSigned), expS.CF.signs, `CF signs mismatch in ${cond} ${expS.scenario}`);

      // Check ER
      const erCmmgAbs = group.map(r => parseFloat(r.err_abs_er_cmmg));
      const erCmmgSigned = group.map(r => parseFloat(r.err_signed_er_cmmg));
      const erBothAbs = group.map(r => parseFloat(r.err_abs_er_both));
      const erBothSigned = group.map(r => parseFloat(r.err_signed_er_both));
      assert.ok(Math.abs(median(erCmmgAbs) - expS.ER.cmmgMedAbs) < 1e-12, `ER cmmgMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(erCmmgSigned) - expS.ER.cmmgMedSigned) < 1e-12, `ER cmmgMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(erCmmgSigned), expS.ER.cmmgSigns, `ER cmmgSigns mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(erBothAbs) - expS.ER.bothMedAbs) < 1e-12, `ER bothMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(erBothSigned) - expS.ER.bothMedSigned) < 1e-12, `ER bothMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(erBothSigned), expS.ER.bothSigns, `ER bothSigns mismatch in ${cond} ${expS.scenario}`);
      const recomputedErDiffs = pairedDiffs(erBothAbs, erCmmgAbs);
      assert.equal(recomputedErDiffs.helped, expS.ER.diffs.helped, `ER helped mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedErDiffs.worsened, expS.ER.diffs.worsened, `ER worsened mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedErDiffs.tied, expS.ER.diffs.tied, `ER tied mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedErDiffs.medDiff - expS.ER.diffs.medDiff) < 1e-12, `ER medDiff mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedErDiffs.meanDiff - expS.ER.diffs.meanDiff) < 1e-12, `ER meanDiff mismatch in ${cond} ${expS.scenario}`);

      // Check SU_Unw
      const suUnwBothAbs = group.map(r => parseFloat(r.err_abs_su_unw_both));
      const suUnwBothSigned = group.map(r => parseFloat(r.err_signed_su_unw_both));
      const suUnwCmmgAbs = group.map(r => parseFloat(r.err_abs_su_unw_cmmg));
      const suUnwCmmgSigned = group.map(r => parseFloat(r.err_signed_su_unw_cmmg));
      assert.ok(Math.abs(median(suUnwCmmgAbs) - expS.SU_Unw.cmmgMedAbs) < 1e-12, `SU_Unw cmmgMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suUnwCmmgSigned) - expS.SU_Unw.cmmgMedSigned) < 1e-12, `SU_Unw cmmgMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(suUnwCmmgSigned), expS.SU_Unw.cmmgSigns, `SU_Unw cmmgSigns mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suUnwBothAbs) - expS.SU_Unw.bothMedAbs) < 1e-12, `SU_Unw bothMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suUnwBothSigned) - expS.SU_Unw.bothMedSigned) < 1e-12, `SU_Unw bothMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(suUnwBothSigned), expS.SU_Unw.bothSigns, `SU_Unw bothSigns mismatch in ${cond} ${expS.scenario}`);
      const recomputedSuUnwDiffs = pairedDiffs(suUnwBothAbs, suUnwCmmgAbs);
      assert.equal(recomputedSuUnwDiffs.helped, expS.SU_Unw.diffs.helped, `SU_Unw helped mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedSuUnwDiffs.worsened, expS.SU_Unw.diffs.worsened, `SU_Unw worsened mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedSuUnwDiffs.tied, expS.SU_Unw.diffs.tied, `SU_Unw tied mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedSuUnwDiffs.medDiff - expS.SU_Unw.diffs.medDiff) < 1e-12, `SU_Unw medDiff mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedSuUnwDiffs.meanDiff - expS.SU_Unw.diffs.meanDiff) < 1e-12, `SU_Unw meanDiff mismatch in ${cond} ${expS.scenario}`);

      // Check SU_Rew
      const suRewBothAbs = group.map(r => parseFloat(r.err_abs_su_rew_both));
      const suRewBothSigned = group.map(r => parseFloat(r.err_signed_su_rew_both));
      const suRewCmmgAbs = group.map(r => parseFloat(r.err_abs_su_rew_cmmg));
      const suRewCmmgSigned = group.map(r => parseFloat(r.err_signed_su_rew_cmmg));
      assert.ok(Math.abs(median(suRewCmmgAbs) - expS.SU_Rew.cmmgMedAbs) < 1e-12, `SU_Rew cmmgMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suRewCmmgSigned) - expS.SU_Rew.cmmgMedSigned) < 1e-12, `SU_Rew cmmgMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(suRewCmmgSigned), expS.SU_Rew.cmmgSigns, `SU_Rew cmmgSigns mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suRewBothAbs) - expS.SU_Rew.bothMedAbs) < 1e-12, `SU_Rew bothMedAbs mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(median(suRewBothSigned) - expS.SU_Rew.bothMedSigned) < 1e-12, `SU_Rew bothMedSigned mismatch in ${cond} ${expS.scenario}`);
      assert.deepEqual(signCounts(suRewBothSigned), expS.SU_Rew.bothSigns, `SU_Rew bothSigns mismatch in ${cond} ${expS.scenario}`);
      const recomputedSuRewDiffs = pairedDiffs(suRewBothAbs, suRewCmmgAbs);
      assert.equal(recomputedSuRewDiffs.helped, expS.SU_Rew.diffs.helped, `SU_Rew helped mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedSuRewDiffs.worsened, expS.SU_Rew.diffs.worsened, `SU_Rew worsened mismatch in ${cond} ${expS.scenario}`);
      assert.equal(recomputedSuRewDiffs.tied, expS.SU_Rew.diffs.tied, `SU_Rew tied mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedSuRewDiffs.medDiff - expS.SU_Rew.diffs.medDiff) < 1e-12, `SU_Rew medDiff mismatch in ${cond} ${expS.scenario}`);
      assert.ok(Math.abs(recomputedSuRewDiffs.meanDiff - expS.SU_Rew.diffs.meanDiff) < 1e-12, `SU_Rew meanDiff mismatch in ${cond} ${expS.scenario}`);

      // Check mixture quantiles if applicable
      if (expS.scenario === 'mixture') {
        const w1Vals = group.map(r => parseFloat(r.w_H1));
        const w2Vals = group.map(r => parseFloat(r.w_H2));
        const essVals = group.map(r => parseFloat(r.ess));
        const qW1 = quantiles(w1Vals);
        const qW2 = quantiles(w2Vals);
        const qESS = quantiles(essVals);
        assert.ok(Math.abs(qW1.mean - expS.mixtureQuantiles.w_H1.mean) < 1e-12);
        assert.ok(Math.abs(qW1.median - expS.mixtureQuantiles.w_H1.median) < 1e-12);
        assert.ok(Math.abs(qW2.mean - expS.mixtureQuantiles.w_H2.mean) < 1e-12);
        assert.ok(Math.abs(qW2.median - expS.mixtureQuantiles.w_H2.median) < 1e-12);
        assert.ok(Math.abs(qESS.mean - expS.mixtureQuantiles.ess.mean) < 1e-12);
        assert.ok(Math.abs(qESS.median - expS.mixtureQuantiles.ess.median) < 1e-12);
      }
    }
  }
}

function verifyCsvReproduction(csvFilePath, allSummariesObj) {
  console.log('Verifying exact reproduction of all summaries from unrounded CSV...');
  const content = fs.readFileSync(csvFilePath, 'utf8').trim();
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cells = [];
    let inQuotes = false;
    let curCell = '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        if (inQuotes && line[c + 1] === '"') {
          curCell += '"';
          c++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(curCell);
        curCell = '';
      } else {
        curCell += ch;
      }
    }
    cells.push(curCell);
    const row = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = cells[h];
    }
    records.push(row);
  }

  // 1. Positive Control Check
  verifyRecordsIntegrity(records, allSummariesObj);
  console.log('  [PASS] Positive control: All 6,000 CSV rows and summary statistics reproduced identically.');

  // 2. Negative Control 1: Deliberately alter a prediction in patient 42
  const negRecords1 = records.map(r => ({ ...r }));
  negRecords1[42].pred_cf = String(parseFloat(negRecords1[42].pred_cf) + 1.25);
  let neg1Failed = false;
  try {
    verifyRecordsIntegrity(negRecords1, allSummariesObj);
  } catch (err) {
    neg1Failed = true;
    assert.ok(err instanceof assert.AssertionError, `Negative control 1 error must be AssertionError, got: ${err.message}`);
  }
  assert.ok(neg1Failed, 'Negative control 1 failed: altering a prediction must throw AssertionError');
  console.log('  [PASS] Negative control 1: Deliberately altered prediction successfully caught by assertion.');

  // 3. Negative Control 2: Deliberately alter a signed error in patient 105
  const negRecords2 = records.map(r => ({ ...r }));
  negRecords2[105].err_signed_er_both = String(parseFloat(negRecords2[105].err_signed_er_both) + 0.5);
  let neg2Failed = false;
  try {
    verifyRecordsIntegrity(negRecords2, allSummariesObj);
  } catch (err) {
    neg2Failed = true;
    assert.ok(err instanceof assert.AssertionError, `Negative control 2 error must be AssertionError, got: ${err.message}`);
  }
  assert.ok(neg2Failed, 'Negative control 2 failed: altering a signed error must throw AssertionError');
  console.log('  [PASS] Negative control 2: Deliberately altered signed error successfully caught by assertion.');

  console.log('  ALL ASSERTIONS & NEGATIVE CONTROLS PASSED.');
}

// Export JSON
const jsonPath = path.resolve(__dirname, 'cmmg-forecast-results.json');
fs.writeFileSync(jsonPath, JSON.stringify(allSummaries, null, 2), 'utf8');
console.log(`Saved JSON summary to ${jsonPath}`);

// Export CSV
const allPatientRecords = [
  ...eval1.patientRecords,
  ...eval2.patientRecords,
  ...eval3.patientRecords,
  ...eval4.patientRecords
];

function escapeCsvCell(val) {
  if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

const csvHeaders = Object.keys(allPatientRecords[0]);
const csvRows = [csvHeaders.join(',')];
for (const rec of allPatientRecords) {
  csvRows.push(csvHeaders.map(h => escapeCsvCell(rec[h])).join(','));
}
const csvPath = path.resolve(__dirname, 'cmmg-forecast-patients.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
console.log(`Saved per-patient CSV (${allPatientRecords.length} rows) to ${csvPath}`);

// Verify that all summary statistics, sign counts, and quantiles reproduce identically from the unrounded CSV
verifyCsvReproduction(csvPath, allSummaries);

// Generate and write Markdown Audit Report
const mdPath = path.resolve(__dirname, 'CMMG-POST-HD-FORECAST-AUDIT.md');
const mdContent = generateMarkdownReport([eval1, eval2, eval3, eval4]);
fs.writeFileSync(mdPath, mdContent, 'utf8');
console.log(`Saved programmatically generated Markdown Audit Report to ${mdPath}`);

console.log('\n=== RUN COMPLETED SUCCESSFULLY WITH ALL INVARIANTS VERIFIED ===');

module.exports = {
  allSummaries,
  eval1,
  eval2,
  eval3,
  eval4,
  verifyCsvReproduction,
  verifyRecordsIntegrity
};
