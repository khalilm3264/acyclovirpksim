'use strict';
/**
 * Computational Simulation: 4-Hour Post-Hemodialysis CMMG Forecasting vs. Carry-Forward
 * Evaluates Ensemble Reweighting vs. Direct State Updating under Complete, Hidden,
 * and Uncertain (50/50 Mixture) Dosing Histories across:
 *   1. Exact Timestamps (28.0h) with Assumed 4% CV Measurement Noise
 *   2. Perturbed Timestamps (+/- 15 min) with Assumed 4% CV Measurement Noise
 *   3. Zero-Noise Sanity Check (Exact 28.0h, 0% CV Observation Noise)
 *
 * Configured HD clearance: 81.8 mL/min (4.908 L/h effective plasma clearance in AyFlux engine,
 * distinct from dialyzer hemodynamic flow settings such as Qb=300 mL/min, Qd=500 mL/min, KoA=900 mL/min).
 *
 * Model Constraints & Guardrails:
 * - Parameter-disjoint draws: 900 draws partitioned into 500 virtual patients and 400 candidate forecasters.
 * - Educational & exploratory simulation only — never clinical decision support.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pk = require('../../public/assets/pk-engine.js');

function createRng(seed = 123456789) {
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

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// RK4 post-HD stepper from tStart to tEnd (anuric, no doses, no dialysis)
function stepPostHD(p, startState, tStart, tEnd, dt = 0.25) {
  let [a, b, m] = startState;
  const mw = 239.19 / 225.21;
  const nSteps = Math.max(1, Math.round((tEnd - tStart) / dt));
  const actualDt = (tEnd - tStart) / nSteps;

  function rhs(A, B, M) {
    const cc = A / p.vc;
    const cp = B / p.vp;
    const ex = p.q * (cc - cp);
    const dA = -(p.other + p.form) * cc - ex; // renal = 0 in anuric dialysis
    const dB = ex;
    const dM = p.form * cc * mw - p.mn * (M / p.vm); // mr = 0 in anuric dialysis
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
  hdCl: 81.8, // Configured HD clearance: 81.8 mL/min (4.908 L/h effective plasma clearance)
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

// 1. Separate patients from ensemble: Generate 900 parameter draws once
const allParams = pk.drawParams({ ...baseConfig, draws: 900 });
const truePatients = allParams.slice(0, 500);
const fcCandidates = allParams.slice(500, 900);

assert.equal(truePatients.length, 500);
assert.equal(fcCandidates.length, 400);

// Assert zero overlap between patients and forecaster
for (let i = 0; i < truePatients.length; i++) {
  for (let j = 0; j < fcCandidates.length; j++) {
    const match = (truePatients[i].vc === fcCandidates[j].vc &&
                   truePatients[i].vp === fcCandidates[j].vp &&
                   truePatients[i].renal === fcCandidates[j].renal &&
                   truePatients[i].form === fcCandidates[j].form);
    assert.equal(match, false, 'Patient and forecaster parameters must not overlap!');
  }
}

// Precompute trajectories
const trueSims = truePatients.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesTrue));
const fcSimsComplete = fcCandidates.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesComplete));
const fcSimsHidden = fcCandidates.map(p => simulateWithStates(baseConfig, p, hdRows, 0.25, dosesHidden));

function signCounts(errs) {
  let under = 0, over = 0, exact = 0;
  for (const e of errs) {
    if (Math.abs(e) < 1e-9) exact++;
    else if (e < 0) under++;
    else over++;
  }
  return { under, over, exact };
}

function pairedDiffs(absBoth, absCMMG) {
  let helped = 0, worsened = 0, tied = 0;
  const diffs = [];
  for (let i = 0; i < absBoth.length; i++) {
    const d = absBoth[i] - absCMMG[i];
    diffs.push(d);
    if (Math.abs(d) < 1e-9) tied++;
    else if (d < 0) helped++;
    else worsened++;
  }
  return {
    helped,
    worsened,
    tied,
    pctHelped: (100 * helped / absBoth.length).toFixed(1) + '%',
    medDiff: Number(median(diffs).toFixed(4)),
    meanDiff: Number(mean(diffs).toFixed(4))
  };
}

function runBenchmark(conditionKey, usePerturbations = false, isZeroNoise = false) {
  const rng = createRng(44556677);
  const N = truePatients.length;
  const M = fcCandidates.length;
  const assayCV = 0.04;

  const patientData = [];
  for (let k = 0; k < N; k++) {
    const dt = usePerturbations ? (rng.rand() * 0.5 - 0.25) : 0.0; // +/- 15 min (+/- 0.25 h)
    const tMeas = 28.0 + dt;
    const sim = trueSims[k];

    const trueState28 = getStateAt(sim, tMeas);
    const trueACV28 = trueState28.A / truePatients[k].vc;
    const trueCMMG28 = trueState28.M / truePatients[k].vm;
    const trueCMMG32 = interp(sim.t, sim.cols.cmmg, 32.0);

    const noiseACV = isZeroNoise ? 0.0 : rng.norm() * assayCV;
    const noiseCMMG = isZeroNoise ? 0.0 : rng.norm() * assayCV;

    const measACV = Math.max(0.01, trueACV28 * (1 + noiseACV));
    const measCMMG = Math.max(0.01, trueCMMG28 * (1 + noiseCMMG));

    patientData.push({
      tMeas,
      trueACV28,
      trueCMMG28,
      measACV,
      measCMMG,
      trueCMMG32
    });
  }

  const configurations = [
    { mode: 'complete', name: 'Complete History (Control)', assumedHist: '2 doses' },
    { mode: 'hidden', name: 'Hidden Dose (Fixed 1-Dose)', assumedHist: '1 dose' },
    { mode: 'mixture', name: 'Uncertain Dose (50/50 Mixture)', assumedHist: '50/50 mixture' }
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

    let sumW1 = 0, sumW2 = 0, sumESS = 0;

    for (let k = 0; k < N; k++) {
      const p = patientData[k];
      const target = p.trueCMMG32;

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
        const cmmg32Vals = [];
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
          cmmg32Vals.push(interp(sim.t, sim.cols.cmmg, 32.0));

          // Direct State Update:
          // CMMG-only: reset M = measCMMG * vm; unmeasured A and B remain at simulated values
          const suCMMGRes = stepPostHD(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          // Paired (ACV+CMMG): reset M = measCMMG * vm and A = measACV * vc; unmeasured B remains at simulated value
          const suBothRes = stepPostHD(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
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

        predER_CMMG = weightedMedian(cmmg32Vals, wCMMG);
        predER_Both = weightedMedian(cmmg32Vals, wBoth);
        predSU_Unw_CMMG = median(su_cmmg_pred);
        predSU_Unw_Both = median(su_both_pred);
        predSU_Rew_CMMG = weightedMedian(su_cmmg_pred, wCMMG);
        predSU_Rew_Both = weightedMedian(su_both_pred, wBoth);

      } else if (cfg.mode === 'mixture') {
        const logw_cmmg = [];
        const logw_both = [];
        const cmmg32Vals = [];
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
          cmmg32Vals.push(interp(sim.t, sim.cols.cmmg, 32.0));

          const suCMMGRes = stepPostHD(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          const suBothRes = stepPostHD(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
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
          cmmg32Vals.push(interp(sim.t, sim.cols.cmmg, 32.0));

          const suCMMGRes = stepPostHD(cand, [predState.A, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
          su_cmmg_pred.push(suCMMGRes.cmmg);

          const suBothRes = stepPostHD(cand, [p.measACV * cand.vc, predState.B, p.measCMMG * cand.vm], p.tMeas, 32.0);
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

        sumW1 += wH1;
        sumW2 += wH2;
        sumESS += ess;

        predER_CMMG = weightedMedian(cmmg32Vals, wCMMG);
        predER_Both = weightedMedian(cmmg32Vals, wBoth);
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
        seed: 44556677,
        patient_id: k,
        condition: conditionKey,
        scenario: cfg.mode,
        scenario_name: cfg.name,
        true_history: '2 doses (0h, 12h)',
        assumed_history: cfg.assumedHist,
        actual_draw_time_h: Number(p.tMeas.toFixed(4)),
        assumed_draw_time_h: 28.0,
        observed_acv_mg_L: Number(p.measACV.toFixed(4)),
        observed_cmmg_mg_L: Number(p.measCMMG.toFixed(4)),
        true_cmmg_32h_mg_L: Number(target.toFixed(4)),
        pred_cf: Number(predCF.toFixed(4)),
        pred_er_cmmg: Number(predER_CMMG.toFixed(4)),
        pred_er_both: Number(predER_Both.toFixed(4)),
        pred_su_unw_cmmg: Number(predSU_Unw_CMMG.toFixed(4)),
        pred_su_unw_both: Number(predSU_Unw_Both.toFixed(4)),
        pred_su_rew_cmmg: Number(predSU_Rew_CMMG.toFixed(4)),
        pred_su_rew_both: Number(predSU_Rew_Both.toFixed(4)),
        err_signed_cf: Number((predCF - target).toFixed(4)),
        err_signed_er_cmmg: Number((predER_CMMG - target).toFixed(4)),
        err_signed_er_both: Number((predER_Both - target).toFixed(4)),
        err_signed_su_unw_cmmg: Number((predSU_Unw_CMMG - target).toFixed(4)),
        err_signed_su_unw_both: Number((predSU_Unw_Both - target).toFixed(4)),
        err_signed_su_rew_cmmg: Number((predSU_Rew_CMMG - target).toFixed(4)),
        err_signed_su_rew_both: Number((predSU_Rew_Both - target).toFixed(4)),
        err_abs_cf: Number(Math.abs(predCF - target).toFixed(4)),
        err_abs_er_cmmg: Number(Math.abs(predER_CMMG - target).toFixed(4)),
        err_abs_er_both: Number(Math.abs(predER_Both - target).toFixed(4)),
        err_abs_su_unw_cmmg: Number(Math.abs(predSU_Unw_CMMG - target).toFixed(4)),
        err_abs_su_unw_both: Number(Math.abs(predSU_Unw_Both - target).toFixed(4)),
        err_abs_su_rew_cmmg: Number(Math.abs(predSU_Rew_CMMG - target).toFixed(4)),
        err_abs_su_rew_both: Number(Math.abs(predSU_Rew_Both - target).toFixed(4)),
        w_H1: Number(wH1.toFixed(4)),
        w_H2: Number(wH2.toFixed(4)),
        ess: Number(ess.toFixed(1))
      });
    }

    conditionSummaries.push({
      config: cfg.name,
      condition: conditionKey,
      perturbations: usePerturbations ? '+/- 15 min' : 'Exact (28.0h)',
      isZeroNoise,
      CF: {
        medAbs: Number(median(errs.CF.abs).toFixed(4)),
        medSigned: Number(median(errs.CF.signed).toFixed(4)),
        signs: signCounts(errs.CF.signed)
      },
      ER: {
        cmmgMedAbs: Number(median(errs.ER_CMMG.abs).toFixed(4)),
        cmmgMedSigned: Number(median(errs.ER_CMMG.signed).toFixed(4)),
        cmmgSigns: signCounts(errs.ER_CMMG.signed),
        bothMedAbs: Number(median(errs.ER_Both.abs).toFixed(4)),
        bothMedSigned: Number(median(errs.ER_Both.signed).toFixed(4)),
        bothSigns: signCounts(errs.ER_Both.signed),
        diffs: pairedDiffs(errs.ER_Both.abs, errs.ER_CMMG.abs)
      },
      SU_Unw: {
        cmmgMedAbs: Number(median(errs.SU_Unw_CMMG.abs).toFixed(4)),
        cmmgMedSigned: Number(median(errs.SU_Unw_CMMG.signed).toFixed(4)),
        cmmgSigns: signCounts(errs.SU_Unw_CMMG.signed),
        bothMedAbs: Number(median(errs.SU_Unw_Both.abs).toFixed(4)),
        bothMedSigned: Number(median(errs.SU_Unw_Both.signed).toFixed(4)),
        bothSigns: signCounts(errs.SU_Unw_Both.signed),
        diffs: pairedDiffs(errs.SU_Unw_Both.abs, errs.SU_Unw_CMMG.abs)
      },
      SU_Rew: {
        cmmgMedAbs: Number(median(errs.SU_Rew_CMMG.abs).toFixed(4)),
        cmmgMedSigned: Number(median(errs.SU_Rew_CMMG.signed).toFixed(4)),
        cmmgSigns: signCounts(errs.SU_Rew_CMMG.signed),
        bothMedAbs: Number(median(errs.SU_Rew_Both.abs).toFixed(4)),
        bothMedSigned: Number(median(errs.SU_Rew_Both.signed).toFixed(4)),
        bothSigns: signCounts(errs.SU_Rew_Both.signed),
        diffs: pairedDiffs(errs.SU_Rew_Both.abs, errs.SU_Rew_CMMG.abs)
      },
      mixtureStats: cfg.mode === 'mixture' ? {
        meanW_H1: Number((sumW1 / N).toFixed(4)),
        meanW_H2: Number((sumW2 / N).toFixed(4)),
        meanESS: Number((sumESS / N).toFixed(1))
      } : null
    });
  }

  return { conditionSummaries, patientRecords };
}

console.log('Running Condition 1: Exact 28.0h, 4% CV...');
const exactRun = runBenchmark('exact_28h_4pct_cv', false, false);

console.log('Running Condition 2: Perturbed +/-15min, 4% CV...');
const perturbedRun = runBenchmark('perturbed_15m_4pct_cv', true, false);

console.log('Running Condition 3: Zero-Noise Sanity (0% CV, Exact 28.0h)...');
const zeroNoiseRun = runBenchmark('zero_noise_28h', false, true);

const allSummaries = {
  metadata: {
    run_date: '2026-11-15',
    generator_seed: 44556677,
    n_virtual_patients: truePatients.length,
    n_forecast_candidates: fcCandidates.length,
    parameter_overlap: 0,
    configured_hd_clearance_mL_min: 81.8,
    configured_hd_clearance_L_h: 4.908,
    notes: 'In silico PK simulation only; not clinical decision support or validated external prediction.'
  },
  exact_4pct_cv: exactRun.conditionSummaries,
  perturbed_4pct_cv: perturbedRun.conditionSummaries,
  zero_noise_sanity: zeroNoiseRun.conditionSummaries
};

// Export JSON
const jsonPath = path.resolve(__dirname, 'cmmg-forecast-results.json');
fs.writeFileSync(jsonPath, JSON.stringify(allSummaries, null, 2), 'utf8');
console.log(`Saved JSON summary to ${jsonPath}`);

// Export CSV
const allPatientRecords = [
  ...exactRun.patientRecords,
  ...perturbedRun.patientRecords,
  ...zeroNoiseRun.patientRecords
];

const csvHeaders = Object.keys(allPatientRecords[0]);
const csvRows = [csvHeaders.join(',')];
for (const rec of allPatientRecords) {
  csvRows.push(csvHeaders.map(h => rec[h]).join(','));
}
const csvPath = path.resolve(__dirname, 'cmmg-forecast-patients.csv');
fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf8');
console.log(`Saved per-patient CSV (${allPatientRecords.length} rows) to ${csvPath}`);

console.log('\n=== EXACT (4% CV) SUMMARIES ===');
console.table(exactRun.conditionSummaries.map(s => ({
  config: s.config,
  CF_medAbs: s.CF.medAbs,
  CF_under: s.CF.signs.under,
  ER_cmmg_medAbs: s.ER.cmmgMedAbs,
  ER_both_medAbs: s.ER.bothMedAbs,
  ER_pctHelped: s.ER.diffs.pctHelped,
  SU_Unw_cmmg: s.SU_Unw.cmmgMedAbs,
  SU_Unw_both: s.SU_Unw.bothMedAbs,
  SU_Unw_pctHelped: s.SU_Unw.diffs.pctHelped,
  SU_Rew_cmmg: s.SU_Rew.cmmgMedAbs,
  SU_Rew_both: s.SU_Rew.bothMedAbs,
  SU_Rew_pctHelped: s.SU_Rew.diffs.pctHelped
})));

console.log('\n=== ZERO-NOISE SANITY SUMMARIES ===');
console.table(zeroNoiseRun.conditionSummaries.map(s => ({
  config: s.config,
  CF_medAbs: s.CF.medAbs,
  CF_under: s.CF.signs.under,
  ER_cmmg_medAbs: s.ER.cmmgMedAbs,
  ER_both_medAbs: s.ER.bothMedAbs,
  ER_pctHelped: s.ER.diffs.pctHelped,
  SU_Unw_cmmg: s.SU_Unw.cmmgMedAbs,
  SU_Unw_both: s.SU_Unw.bothMedAbs,
  SU_Unw_pctHelped: s.SU_Unw.diffs.pctHelped,
  SU_Rew_cmmg: s.SU_Rew.cmmgMedAbs,
  SU_Rew_both: s.SU_Rew.bothMedAbs,
  SU_Rew_pctHelped: s.SU_Rew.diffs.pctHelped
})));

module.exports = {
  allSummaries,
  exactResults: exactRun.conditionSummaries,
  perturbedResults: perturbedRun.conditionSummaries,
  zeroNoiseResults: zeroNoiseRun.conditionSummaries
};
