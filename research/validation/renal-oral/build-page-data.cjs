'use strict';
// Builds public/experimental/renal-oral/data.js from the stored Hara and Smith scores.
// Metrics are copied from hara/scores.json and smith/scores.json unchanged. The only new
// numbers are dense model curves for drawing, simulated with the same frozen engine and
// the same three absorption models; the build asserts they pass through the scored values
// at every sampling time.
//
//   node research/validation/renal-oral/build-page-data.cjs          # write data.js
//   node research/validation/renal-oral/build-page-data.cjs --check  # fail if data.js is stale

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const enginePath = path.join(__dirname, 'pk-engine-8fc1c9d.js');
assert.equal(
  crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex'),
  '9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d',
  'frozen engine must be unmodified 8fc1c9d'
);
const e = require(enginePath);
const hara = require('./hara/scores.json');
const haraMarkers = require('./hara/markers.json');
const smith = require('./smith/scores.json');
const smithMarkers = require('./smith/markers.json');
const outPath = path.join(__dirname, '../../../public/experimental/renal-oral/data.js');

const STEP = 1 / 128;
const DRAW = 1 / 8;
const K_TR = 1.636;
const LAG = 0.59;
const dx = (a, b, f) => a.map((v, i) => v + b[i] * f);

// Same model definitions as hara/score.cjs and smith/score.cjs.
function simulate(dose, every, doseCount, weight, crcl, kind) {
  const start = (doseCount - 1) * every;
  const end = start + every;
  const c = {
    ...structuredClone(e.DEFAULTS),
    weight, crcl, crclSource: 'manual', renalMode: 'constant', route: 'Valacyclovir oral',
    dosingMode: 'repeat', dose, every, doseCount, horizon: end, draws: 1, variability: 0, observations: []
  };
  assert.deepEqual(e.validate(c, 'No dialysis'), []);
  const p = e.drawParams(c)[0];
  const doses = e.buildDoses(c);
  let time, y;
  if (kind !== 'transit') {
    const r = e.single(c, p, [], STEP, doses.map(d => ({ ...d, time: d.time + (kind === 'lag' ? LAG : 0) })));
    time = r.t;
    y = r.cols.plasma;
  } else {
    let x = [0, 0, 0, 0];
    time = [];
    y = [];
    const cl = p.other + p.renal + p.form;
    const rhs = ([A, B, T1, T2]) => {
      const ca = A / p.vc, ex = p.q * (ca - B / p.vp);
      return [K_TR * T2 - cl * ca - ex, ex, -K_TR * T1, K_TR * (T1 - T2)];
    };
    for (let j = 0; j <= end / STEP; j++) {
      const t = j * STEP;
      for (const d of doses) if (Math.abs(d.time - t) < 1e-9) x[2] += d.amount * 225.21 / 324.34 * p.oralF;
      time.push(t);
      y.push(x[0] / p.vc);
      const a = rhs(x), b = rhs(dx(x, a, STEP / 2)), d = rhs(dx(x, b, STEP / 2)), f = rhs(dx(x, d, STEP));
      x = x.map((v, i) => v + STEP * (a[i] + 2 * b[i] + 2 * d[i] + f[i]) / 6);
    }
  }
  return h => {
    const i = time.findIndex(t => Math.abs(t - start - h) < 1e-9);
    assert.ok(i >= 0, `time ${h} on grid`);
    return y[i];
  };
}

const round = (v, n = 4) => +v.toFixed(n);
const grid = window => Array.from({ length: Math.round(window / DRAW) + 1 }, (_, i) => i * DRAW);
const KINDS = ['baseline', 'lag', 'transit'];

function curves(dose, every, doseCount, weight, crcls, window, sampleTimes, scored) {
  const out = {};
  for (const kind of KINDS) {
    const runs = crcls.map(crcl => simulate(dose, every, doseCount, weight, crcl, kind));
    const at = h => runs.reduce((s, f) => s + f(h), 0) / runs.length;
    sampleTimes.forEach((h, i) =>
      assert.ok(Math.abs(at(h) - scored[kind][i]) < 1e-9, `${kind} curve matches scored value at ${h} h`));
    out[kind] = grid(window).map(h => round(at(h)));
  }
  return out;
}

function modelMetrics(m, peakValue, peakHour) {
  return {
    rmse: round(m.rmse, 3), rmseRange: m.rmseRange.map(v => round(v, 3)),
    peak: round(peakValue, 4), peakHour,
    auc: round(m.auc, 2), aucPO: round(m.aucPO, 3), aucPORange: m.aucPORange.map(v => round(v, 3))
  };
}

const cases = [];
for (const g of hara.groups) {
  const meta = haraMarkers.groups.find(x => x.id === g.id);
  const times = hara.earlyTimes;
  const scored = Object.fromEntries(KINDS.map(k => [k, g.models[k].v.slice(0, times.length)]));
  cases.push({
    id: `hara-${g.id}`,
    study: 'hara',
    label: `Hara 2008 · ALDH2 ${g.id}`,
    weight: meta.weight, crcl: meta.crcl, weightAssumed: false,
    times, observed: [0, ...g.obs].map(v => round(v)), zeroAssumed: true,
    observedPeak: round(g.peak.value, 4), observedPeakHour: g.peak.hour, observedAuc: round(g.obsAUC, 2),
    drawGrid: grid(12),
    curves: curves(1000, 48, 1, meta.weight, [meta.crcl], 12, times, scored),
    models: Object.fromEntries(KINDS.map(k => [k, modelMetrics(g.models[k], g.models[k].peak.value, g.models[k].peak.hour)]))
  });
}
for (const weight of ['70', '55', '85']) {
  const w = smith.weights[weight];
  const times = smithMarkers.times_h;
  const scored = Object.fromEntries(KINDS.map(k => [k, w[k].pred]));
  cases.push({
    id: `smith-ckd-${weight}`,
    study: 'smith',
    label: weight === '70' ? 'Smith 2010 · CKD' : `Smith 2010 · CKD (${weight} kg sensitivity)`,
    weight: Number(weight), crcl: [17, 30, 31], weightAssumed: true,
    times, observed: smith.obs.map(v => round(v)), zeroAssumed: false,
    observedPeak: round(smith.observed.peak[0], 4), observedPeakHour: smith.observed.peak[1],
    observedAuc: round(smith.observed.auc, 2), observedAucRange: smith.observed.aucRange.map(v => round(v, 2)),
    drawGrid: grid(12),
    curves: curves(1500, 12, 5, Number(weight), [17, 30, 31], 12, times, scored),
    models: Object.fromEntries(KINDS.map(k => [k, {
      ...modelMetrics(w[k], w[k].peak[0], w[k].peak[1]),
      earlyRmse: round(w[k].earlyRMSE, 3), lateRmse: round(w[k].lateRMSE, 3)
    }]))
  });
}

const data = {
  engineCommit: '8fc1c9d97590c81d3fbcf65ecb1f0ead273ab4a0',
  kTr: K_TR, lag: LAG, baselineKa: e.DEFAULTS.valKa ?? 1.8,
  cases
};
async function main() {
  const prettier = require('prettier');
  const raw = `// Generated by research/validation/renal-oral/build-page-data.cjs. Do not edit by hand.\n` +
    `window.renalOralData = ${JSON.stringify(data)};\n`;
  const options = await prettier.resolveConfig(outPath);
  const text = await prettier.format(raw, { ...options, filepath: outPath });
  if (process.argv.includes('--check')) {
    assert.equal(fs.readFileSync(outPath, 'utf8'), text, 'data.js is stale; rerun build-page-data.cjs');
    console.log(`Verified ${cases.length} renal oral replay cases`);
  } else {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, text);
    console.log(`Wrote ${path.relative(process.cwd(), outPath)} (${cases.length} cases)`);
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
