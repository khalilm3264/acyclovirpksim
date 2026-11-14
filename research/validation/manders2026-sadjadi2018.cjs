'use strict';

// Execute only the prespecified external evaluations in MANDERS2026-SADJADI2018-PROTOCOL.md.
// Changes no model equation or default; keeps Manders 2026 and Sadjadi 2018 outside the 37-point scorecard.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const MODEL_COMMIT = '304ce5308ea78907d18b07d8670c164295829eb3';
const ENGINE_BLOB = '17971df66e0a97b4d382572a582d35c444a3c83f';
const ENGINE_SHA256 = '019c02b31fb273fa0d019d9c0766d4f8dccacd08b0d758e0cdd2f247cdf3755c';
const PROTOCOL_PATH = 'research/validation/MANDERS2026-SADJADI2018-PROTOCOL.md';
const PROTOCOL_COMMIT = '29f271e9da1410f4d073ad9af9346b56f832387b';
const PROTOCOL_BLOB = '63919bd4e1b73e02ec66083e427516255988b5a2';
const PROTOCOL_SHA256 = '86f25be7b6ddd9d8eaf374974086f3cd87f9cd1b1a8ea7201c67434dd5582310';

const ALLOMETRIC_KEYS = ['q', 'other', 'renal', 'form', 'mr', 'mn'];

function normalizedLfBuffer(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
  return Buffer.from(raw, 'utf8');
}

function hashesFor(relPath) {
  const buf = normalizedLfBuffer(relPath);
  const blob = crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return {text: buf.toString('utf8'), blob, sha256};
}

function verifyPinnedArtifacts() {
  const assert = require('node:assert/strict');
  const eng = hashesFor('public/assets/pk-engine.js');
  assert.equal(eng.blob, ENGINE_BLOB, 'pk-engine.js blob must match 304ce53');
  assert.equal(eng.sha256, ENGINE_SHA256, 'pk-engine.js SHA-256 must match 304ce53');

  const proto = hashesFor(PROTOCOL_PATH);
  assert.equal(proto.blob, PROTOCOL_BLOB, 'Protocol blob must match pre-execution freeze');
  assert.equal(proto.sha256, PROTOCOL_SHA256, 'Protocol SHA-256 must match pre-execution freeze');

  // When running in a repo clone that contains PROTOCOL_COMMIT in history, verify git show too.
  try {
    execFileSync('git', ['rev-parse', '--verify', '-q', `${PROTOCOL_COMMIT}^{commit}`], {cwd: ROOT, stdio: 'ignore'});
    const committed = execFileSync('git', ['show', `${PROTOCOL_COMMIT}:${PROTOCOL_PATH}`], {cwd: ROOT, encoding: 'utf8'})
      .replace(/\r\n/g, '\n');
    assert.equal(proto.text, committed, 'Protocol on disk must match pre-execution commit');
  } catch (err) {
    if (err && err.code === 'ERR_ASSERTION') throw err;
  }
  return eng.text;
}

function loadPinnedEngine(engineSource) {
  const sandbox = {module: {exports: {}}, structuredClone};
  vm.runInNewContext(engineSource, sandbox, {filename: 'pk-engine-pinned.js'});
  return sandbox.module.exports;
}

function applyVariant(params, config, variant) {
  if (variant === 'default') return {...params};
  if (variant === 'renal-x0.75') return {...params, renal: params.renal * 0.75};
  if (variant === 'no-allometric') {
    const undo = Math.pow(70 / config.weight, 0.75);
    const out = {...params};
    for (const key of ALLOMETRIC_KEYS) out[key] *= undo;
    return out;
  }
  throw new Error(`Unknown variant: ${variant}`);
}

function atTime(run, targetTime) {
  const idx = run.t.findIndex(x => Math.abs(x - targetTime) < 1e-8);
  if (idx < 0) throw new Error(`Missing output time ${targetTime}`);
  return {plasma: run.cols.plasma[idx], csf: run.cols.csf[idx]};
}

function mostellerBsa(heightCm, weightKg) {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

const MANDERS_PRIMARY_CASES = [
  {id: 'A', sex: 'female', age: 16, weight: 54.4, heightAssumptionCm: 165, interDays: 6, contDaysActual: 8, simHours: 336, egfrBefore: 90, egfrDuring: 90, egfrDuringCensored105: 105, observedPlasma: 2.9, notes: 'eGFR >90 by Schwartz; 10 mg/kg q8h x6 d then 30 mg/kg/day cont x8 d'},
  {id: 'B', sex: 'female', age: 35, weight: 75.0, heightAssumptionCm: 165, interDays: 4, contDaysActual: 7, simHours: 264, egfrBefore: 90, egfrDuring: 90, egfrDuringCensored105: 105, observedPlasma: 2.9, notes: 'eGFR >90; 10 mg/kg q8h x4 d then 30 mg/kg/day cont x7 d'},
  {id: 'C', sex: 'female', age: 77, weight: 60.0, heightAssumptionCm: 165, interDays: 3, contDaysActual: 11, simHours: 336, egfrBefore: 78, egfrDuring: 79, egfrDuringCensored105: 79, observedPlasma: 5.1, notes: '10 mg/kg q8h x3 d then 30 mg/kg/day cont x11 d'},
  {id: 'D', sex: 'male', age: 78, weight: 89.0, heightAssumptionCm: 178, interDays: 2, contDaysActual: 16, simHours: 336, egfrBefore: 79, egfrDuring: 81, egfrDuringCensored105: 81, observedPlasma: 6.4, notes: 'Actual 18 d (2 d q8h + 16 d cont); simulated to engine max 336 h (12 d cont)'},
  {id: 'E', sex: 'female', age: 78, weight: 81.5, heightAssumptionCm: 165, interDays: 0, contDaysActual: 10, simHours: 240, egfrBefore: 58, egfrDuring: 80, egfrDuringCensored105: 80, observedPlasma: 8.1, notes: 'No intermittent phase; 30 mg/kg/day cont x10 d'},
  {id: 'G', sex: 'female', age: 21, weight: 69.0, heightAssumptionCm: 165, interDays: 6, contDaysActual: 8, simHours: 336, egfrBefore: 90, egfrDuring: 90, egfrDuringCensored105: 105, observedPlasma: 6.1, notes: 'eGFR >90; 10 mg/kg q8h x6 d then 30 mg/kg/day cont x8 d'},
];

const MANDERS_SURROGATES = [
  {id: 'during-raw', label: 'During acyclovir eGFR (numeric primary)', crclOf: c => c.egfrDuring},
  {id: 'before-raw', label: 'Before-start eGFR (numeric)', crclOf: c => c.egfrBefore},
  {id: 'during-censored-105', label: 'During eGFR (>90 treated as 105 mL/min)', crclOf: c => c.egfrDuringCensored105},
  {id: 'during-bsa-scaled', label: 'During eGFR scaled by Mosteller BSA / 1.73 (assumed heights 165 F / 178 M cm)', crclOf: c => c.egfrDuring * mostellerBsa(c.heightAssumptionCm, c.weight) / 1.73},
];

const MANDERS_VARIANTS = ['default', 'renal-x0.75', 'no-allometric'];

function buildMandersDoses(caseRow) {
  const customDoses = [];
  const interCount = caseRow.interDays * 3;
  for (let i = 0; i < interCount; i++) {
    customDoses.push({time: i * 8, route: 'Acyclovir IV', amount: 10 * caseRow.weight, infusion: 1});
  }
  const contStart = caseRow.interDays * 24;
  for (let t = contStart; t < caseRow.simHours - 1e-8; t += 12) {
    customDoses.push({time: t, route: 'Acyclovir IV', amount: 15 * caseRow.weight, infusion: 12});
  }
  return customDoses;
}

function summarizeMandersGroup(rows) {
  const logs = rows.map(r => Math.log(r.ratio));
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    n: rows.length,
    gmr: Math.exp(mean(logs)),
    aafe: Math.exp(mean(logs.map(Math.abs))),
    withinNarrow080To125: rows.filter(r => r.ratio >= 0.80 - 1e-12 && r.ratio <= 1.25 + 1e-12).length,
    withinTwofold: rows.filter(r => r.ratio >= 0.50 - 1e-12 && r.ratio <= 2.00 + 1e-12).length,
  };
}

function runMandersPrimary(E) {
  const assert = require('node:assert/strict');
  const combinations = [];
  const flatRows = [];
  let maxStepRelDiff = 0;
  let maxAnalyticRelDiff = 0;

  for (const surrogate of MANDERS_SURROGATES) {
    for (const variant of MANDERS_VARIANTS) {
      const caseResults = [];
      for (const c of MANDERS_PRIMARY_CASES) {
        const crcl = surrogate.crclOf(c);
        const customDoses = buildMandersDoses(c);
        const config = {
          ...structuredClone(E.DEFAULTS),
          age: c.age,
          sex: c.sex,
          weight: c.weight,
          crcl,
          crclSource: 'manual',
          renalMode: 'constant',
          route: 'Acyclovir IV',
          dosingMode: 'custom',
          customDoses,
          horizon: c.simHours,
          draws: 1,
          variability: 0,
          observations: [],
          schedule: [],
        };
        assert.deepEqual([...E.validate(config, 'No dialysis')], [], `Validation failed for Case ${c.id}`);
        const baseParams = E.drawParams(config)[0];
        const params = applyVariant(baseParams, config, variant);
        const doses = E.buildDoses(config);
        const run025 = E.single(config, params, [], 0.025, doses);
        const end = atTime(run025, config.horizon);

        const rateMgPerH = 1.25 * c.weight;
        const totalClLPerH = params.renal + params.other + params.form;
        const analyticCss = rateMgPerH / totalClLPerH;
        const analyticRelDiff = Math.abs(end.plasma - analyticCss) / analyticCss;
        assert.ok(analyticRelDiff < 0.001, `Analytical Css mismatch for Case ${c.id}: ${analyticRelDiff}`);
        maxAnalyticRelDiff = Math.max(maxAnalyticRelDiff, analyticRelDiff);

        // Step-size check (0.025 h vs 0.0125 h) on primary surrogate across all variants.
        let stepRelDiff = null;
        if (surrogate.id === 'during-raw') {
          const run0125 = E.single(config, params, [], 0.0125, doses);
          const endFine = atTime(run0125, config.horizon);
          stepRelDiff = Math.abs(end.plasma - endFine.plasma) / endFine.plasma;
          assert.ok(stepRelDiff < 0.001, `Step convergence failed for Case ${c.id}: ${stepRelDiff}`);
          maxStepRelDiff = Math.max(maxStepRelDiff, stepRelDiff);
        }

        const row = {
          caseId: c.id,
          surrogate: surrogate.id,
          variant,
          weightKg: c.weight,
          crclUsedMlMin: crcl,
          infusionRateMgH: rateMgPerH,
          modelTotalClLH: totalClLPerH,
          observedPlasmaMgL: c.observedPlasma,
          predictedPlasmaMgL: end.plasma,
          analyticCssMgL: analyticCss,
          analyticRelDiff,
          stepRelDiff,
          ratio: end.plasma / c.observedPlasma,
          relativeErrorPercent: 100 * (end.plasma / c.observedPlasma - 1),
        };
        caseResults.push(row);
        flatRows.push(row);
      }
      combinations.push({
        surrogate: surrogate.id,
        surrogateLabel: surrogate.label,
        variant,
        summary: summarizeMandersGroup(caseResults),
        cases: caseResults,
      });
    }
  }
  return {combinations, flatRows, maxStepRelDiff, maxAnalyticRelDiff};
}

function runMandersCaseFCsf(E) {
  const assert = require('node:assert/strict');
  const weight = 91.0;
  const observedCsf = 2.5;
  const gridRows = [];
  let maxStepRelDiff = 0;

  for (const doseMgKgDay of [30, 20]) {
    const blockMg = (doseMgKgDay / 2) * weight;
    const customDoses = [];
    for (let t = 0; t < 336 - 1e-8; t += 12) {
      customDoses.push({time: t, route: 'Acyclovir IV', amount: blockMg, infusion: 12});
    }
    for (const crcl of [25, 76]) {
      for (const [barrierName, csfRatio] of [['intact', 0.30], ['damaged', 0.37]]) {
        for (const variant of MANDERS_VARIANTS) {
          const config = {
            ...structuredClone(E.DEFAULTS),
            age: 48,
            sex: 'female',
            weight,
            crcl,
            crclSource: 'manual',
            renalMode: 'constant',
            csfRatio,
            route: 'Acyclovir IV',
            dosingMode: 'custom',
            customDoses,
            horizon: 336,
            draws: 1,
            variability: 0,
            observations: [],
            schedule: [],
          };
          assert.deepEqual([...E.validate(config, 'No dialysis')], [], 'Case F validation failed');
          const params = applyVariant(E.drawParams(config)[0], config, variant);
          const doses = E.buildDoses(config);
          const run025 = E.single(config, params, [], 0.025, doses);
          const end = atTime(run025, 336);
          if (variant === 'default') {
            const run0125 = E.single(config, params, [], 0.0125, doses);
            const fine = atTime(run0125, 336);
            const relDiff = Math.abs(end.csf - fine.csf) / fine.csf;
            assert.ok(relDiff < 0.001, `Case F CSF convergence failed: ${relDiff}`);
            maxStepRelDiff = Math.max(maxStepRelDiff, relDiff);
          }
          gridRows.push({
            doseMgKgDay,
            crclMlMin: crcl,
            barrier: barrierName,
            csfRatio,
            variant,
            predictedPlasmaMgL: end.plasma,
            predictedCsfMgL: end.csf,
            observedCsfMgL: observedCsf,
            csfPredObsRatio: end.csf / observedCsf,
          });
        }
      }
    }
  }
  return {
    patient: {caseId: 'F', sex: 'female', age: 48, weightKg: 91.0, observedPlasmaExcludedMgL: 43.4, exclusionReason: 'Direct PICC lumen contamination outlier reported by authors', observedCsfMgL: observedCsf},
    maxStepRelDiff,
    gridRows,
  };
}

function runSadjadiGrid(E) {
  const assert = require('node:assert/strict');
  const weights = [50, 70, 90];
  const dosesMgKgDay = [2.5, 5.0];
  const schedules = [
    {id: 'no-dialysis', label: 'No dialysis', mode: 'No dialysis', hdRepeat: 48},
    {id: 'daily-hd', label: 'Daily 4 h HD (t=12..16 q24h, hdCl=81.8 mL/min)', mode: 'Intermittent HD', hdRepeat: 24},
    {id: 'alt-hd', label: 'Alternate-day 4 h HD (t=12..16 q48h, hdCl=81.8 mL/min)', mode: 'Intermittent HD', hdRepeat: 48},
  ];
  const variants = ['default', 'no-allometric'];
  const rows = [];
  let maxStepRelDiff = 0;

  for (const weight of weights) {
    for (const doseMgKgDay of dosesMgKgDay) {
      for (const sched of schedules) {
        for (const variant of variants) {
          const config = {
            ...structuredClone(E.DEFAULTS),
            age: 80,
            sex: 'male',
            weight,
            crcl: 0,
            crclSource: 'manual',
            renalMode: 'constant',
            route: 'Acyclovir IV',
            dosingMode: 'repeat',
            dose: doseMgKgDay * weight,
            every: 24,
            doseCount: 5,
            infusion: 1,
            horizon: 120,
            hdStart: 12,
            hdDuration: 4,
            hdRepeat: sched.hdRepeat,
            draws: 1,
            variability: 0,
            observations: [],
            schedule: [],
          };
          assert.deepEqual([...E.validate(config, sched.mode)], [], `Sadjadi validation failed for ${weight}/${doseMgKgDay}/${sched.id}`);
          const params = applyVariant(E.drawParams(config)[0], config, variant);
          const schedRows = E.scheduleFor(sched.mode, config);
          const doses = E.buildDoses(config);
          const run025 = E.single(config, params, schedRows, 0.025, doses);
          const run0125 = E.single(config, params, schedRows, 0.0125, doses);

          const peak97 = atTime(run025, 97).plasma;
          const trough120 = atTime(run025, 120).plasma;
          const peakFine = atTime(run0125, 97).plasma;
          const troughFine = atTime(run0125, 120).plasma;
          const relP = Math.abs(peak97 - peakFine) / peakFine;
          const relT = Math.abs(trough120 - troughFine) / troughFine;
          assert.ok(relP < 0.001 && relT < 0.001, `Sadjadi step convergence failed: peak=${relP}, trough=${relT}`);
          maxStepRelDiff = Math.max(maxStepRelDiff, relP, relT);

          rows.push({
            weightKg: weight,
            doseMgKgDay,
            dailyDoseMg: doseMgKgDay * weight,
            schedule: sched.id,
            scheduleLabel: sched.label,
            variant,
            day5Peak97hMgL: peak97,
            day5Trough120hMgL: trough120,
            bracketsObserved2_1: trough120 <= 2.1 && 2.1 <= peak97,
            bracketsObserved6_3: trough120 <= 6.3 && 6.3 <= peak97,
            bracketsBoth: trough120 <= 2.1 && peak97 >= 6.3,
          });
        }
      }
    }
  }
  return {
    observedSerumMgL: [2.1, 6.3],
    maxStepRelDiff,
    rows,
  };
}

function evaluate() {
  const engineSource = verifyPinnedArtifacts();
  const E = loadPinnedEngine(engineSource);
  const mandersPrimary = runMandersPrimary(E);
  const mandersCaseF = runMandersCaseFCsf(E);
  const sadjadi = runSadjadiGrid(E);
  return {
    metadata: {
      nodeVersion: process.version,
      modelCommit: MODEL_COMMIT,
      engineBlob: ENGINE_BLOB,
      engineSha256: ENGINE_SHA256,
      protocolPath: PROTOCOL_PATH,
      protocolCommit: PROTOCOL_COMMIT,
      protocolBlob: PROTOCOL_BLOB,
      protocolSha256: PROTOCOL_SHA256,
    },
    manders2026: {
      primaryPlasma: mandersPrimary,
      caseFCsf: mandersCaseF,
    },
    sadjadi2018: sadjadi,
  };
}

function fmt(x, digits = 3) {
  return Number(x).toFixed(digits);
}

function buildEndpointsCsv(res) {
  const lines = ['study,section,case_or_cell,surrogate_or_schedule,variant,endpoint,crcl_mL_min,weight_kg,predicted_mg_L,observed_mg_L,ratio'];
  for (const r of res.manders2026.primaryPlasma.flatRows) {
    lines.push([
      'Manders2026', 'primary-plasma', `Case-${r.caseId}`, r.surrogate, r.variant, 'plasma_Css',
      fmt(r.crclUsedMlMin, 4), fmt(r.weightKg, 2), r.predictedPlasmaMgL.toPrecision(6), r.observedPlasmaMgL, r.ratio.toPrecision(6),
    ].join(','));
  }
  for (const r of res.manders2026.caseFCsf.gridRows) {
    lines.push([
      'Manders2026', 'case-F-csf', `dose-${r.doseMgKgDay}-${r.barrier}`, `crcl-${r.crclMlMin}`, r.variant, 'csf_Css',
      r.crclMlMin, 91, r.predictedCsfMgL.toPrecision(6), r.observedCsfMgL, r.csfPredObsRatio.toPrecision(6),
    ].join(','));
  }
  for (const r of res.sadjadi2018.rows) {
    lines.push([
      'Sadjadi2018', 'sensitivity-grid', `${r.weightKg}kg-${r.doseMgKgDay}mgkgday`, r.schedule, r.variant, 'day5_peak_97h',
      0, r.weightKg, r.day5Peak97hMgL.toPrecision(6), 6.3, (r.day5Peak97hMgL / 6.3).toPrecision(6),
    ].join(','));
    lines.push([
      'Sadjadi2018', 'sensitivity-grid', `${r.weightKg}kg-${r.doseMgKgDay}mgkgday`, r.schedule, r.variant, 'day5_trough_120h',
      0, r.weightKg, r.day5Trough120hMgL.toPrecision(6), 2.1, (r.day5Trough120hMgL / 2.1).toPrecision(6),
    ].join(','));
  }
  return lines.join('\n') + '\n';
}

function buildResultsMarkdown(res) {
  const m = res.metadata;
  const p = res.manders2026.primaryPlasma;
  const getCombo = (surr, v) => p.combinations.find(c => c.surrogate === surr && c.variant === v);
  const fRows = res.manders2026.caseFCsf.gridRows.filter(r => r.variant === 'default');

  const lines = [
    '# Manders 2026 & Sadjadi 2018 External Evaluations',
    '',
    `Executed with Node ${m.nodeVersion} after freezing [the pre-execution protocol](MANDERS2026-SADJADI2018-PROTOCOL.md) at commit \`${m.protocolCommit}\` (blob \`${m.protocolBlob}\`). The model is pinned to commit \`${m.modelCommit}\` (\`public/assets/pk-engine.js\` blob \`${m.engineBlob}\`), whose plasma and CSF acyclovir equations are identical to frozen manuscript commit \`8fc1c9d\`. All \`engine.validate(...)\` checks pass cleanly; no model parameter or default was tuned or changed.`,
    '',
    '## Part A: Manders et al. 2026 (`n = 6` primary steady-state plasma acyclovir)',
    '',
    `Max step-size difference (\`0.025 h\` vs \`0.0125 h\`) across all 18 primary-surrogate runs: **${(p.maxStepRelDiff * 100).toExponential(2)}%** (< 0.1%). Max difference vs analytical $R_0 / CL_{\\text{total}}$ across all 72 combinations: **${(p.maxAnalyticRelDiff * 100).toExponential(2)}%** (< 0.1%).`,
    '',
    '### Summary across prespecified kidney surrogates and model variants (`n = 6`: Cases A, B, C, D, E, G)',
    '',
    '| Kidney surrogate | Variant | GMR (bias) | AFE | Within 0.80–1.25 | Within twofold |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
  ];
  for (const c of p.combinations) {
    const s = c.summary;
    lines.push(`| \`${c.surrogate}\` | \`${c.variant}\` | ${fmt(s.gmr, 2)} | ${fmt(s.aafe, 2)} | ${s.withinNarrow080To125}/${s.n} | ${s.withinTwofold}/${s.n} |`);
  }

  lines.push('', '### Per-case predictions on primary surrogate (`during-raw` eGFR, mg/L)', '', '| Case (W, CrCl) | Observed | Default (ratio) | Renal ×0.75 (ratio) | No allometric (ratio) |', '| --- | ---: | ---: | ---: | ---: |');
  const d0 = getCombo('during-raw', 'default').cases;
  const d1 = getCombo('during-raw', 'renal-x0.75').cases;
  const d2 = getCombo('during-raw', 'no-allometric').cases;
  for (let i = 0; i < d0.length; i++) {
    lines.push(`| Case ${d0[i].caseId} (${d0[i].weightKg} kg, ${fmt(d0[i].crclUsedMlMin, 0)}) | ${fmt(d0[i].observedPlasmaMgL, 1)} | ${fmt(d0[i].predictedPlasmaMgL, 2)} (${fmt(d0[i].ratio, 2)}) | ${fmt(d1[i].predictedPlasmaMgL, 2)} (${fmt(d1[i].ratio, 2)}) | ${fmt(d2[i].predictedPlasmaMgL, 2)} (${fmt(d2[i].ratio, 2)}) |`);
  }

  lines.push(
    '',
    '### Secondary CSF check: Case F (`48 F`, `91.0 kg`, observed CSF `2.5 mg/L`; plasma `43.4 mg/L` excluded as PICC contamination)',
    '',
    `Step-size max difference on Case F: **${(res.manders2026.caseFCsf.maxStepRelDiff * 100).toExponential(2)}%**. Default model predictions across the \`2 × 2 × 2\` bounding grid:`,
    '',
    '| Dose (`mg/kg/day`) | CrCl (`mL/min`) | Barrier (`csfRatio`) | Predicted plasma (`mg/L`) | Predicted CSF (`mg/L`) | CSF pred/obs (vs `2.5 mg/L`) |',
    '| ---: | ---: | --- | ---: | ---: | ---: |',
  );
  for (const r of fRows) {
    lines.push(`| ${r.doseMgKgDay} | ${r.crclMlMin} | ${r.barrier} (${r.csfRatio}) | ${fmt(r.predictedPlasmaMgL, 2)} | ${fmt(r.predictedCsfMgL, 2)} | ${fmt(r.csfPredObsRatio, 2)} |`);
  }

  const sRows = res.sadjadi2018.rows;
  lines.push(
    '',
    '## Part B: Sadjadi et al. 2018 diagnostic reconstructability & sensitivity grid',
    '',
    'Sadjadi et al. 2018 (`doi:10.12659/AJCR.911520`) cannot be scored as a point-level validation benchmark because patient weight, cyclic PD exchange volumes/dwells, oral-acyclovir tablet absorption, resumed IV dose, and blood-draw timings relative to infusion and HD are unreported (and Case Report age `80` vs Abstract `83` conflicts). Instead, the prespecified bounded grid (`CrCl = 0`, 5 daily 1 h IV doses) maps which plausible steady-state `[trough 120 h, peak 97 h]` ranges span the reported elevated serum acyclovir concentrations (`2.1` and `6.3 mg/L`).',
    '',
    `Max step-size difference (\`0.025 h\` vs \`0.0125 h\`) across all 36 Sadjadi cells: **${(res.sadjadi2018.maxStepRelDiff * 100).toExponential(2)}%**.`,
    '',
    '| Weight (`kg`) | Dose (`mg/kg/day`) | Schedule | Variant | Day-5 trough `120 h` (`mg/L`) | Day-5 peak `97 h` (`mg/L`) | Brackets `2.1` / `6.3` |',
    '| ---: | ---: | --- | --- | ---: | ---: | --- |',
  );
  for (const r of sRows) {
    lines.push(`| ${r.weightKg} | ${r.doseMgKgDay} | ${r.schedule} | \`${r.variant}\` | ${fmt(r.day5Trough120hMgL, 2)} | ${fmt(r.day5Peak97hMgL, 2)} | ${r.bracketsObserved2_1 ? 'yes' : 'no'} / ${r.bracketsObserved6_3 ? 'yes' : 'no'} |`);
  }
  lines.push('');
  return lines.join('\n');
}

if (require.main === module) {
  const res = evaluate();
  const gitignoredDir = path.join(__dirname, 'results/manders2026-sadjadi2018');
  fs.mkdirSync(gitignoredDir, {recursive: true});
  fs.writeFileSync(path.join(gitignoredDir, 'results.json'), JSON.stringify(res, null, 2) + '\n');
  fs.writeFileSync(path.join(gitignoredDir, 'endpoints.csv'), buildEndpointsCsv(res));
  fs.writeFileSync(path.join(__dirname, 'manders2026-sadjadi2018-results.json'), JSON.stringify(res, null, 2) + '\n');
  fs.writeFileSync(path.join(__dirname, 'MANDERS2026-SADJADI2018-RESULTS.md'), buildResultsMarkdown(res));
  console.log('Saved Manders 2026 & Sadjadi 2018 results. combinations:', res.manders2026.primaryPlasma.combinations.length, 'sadjadi rows:', res.sadjadi2018.rows.length);
  for (const c of res.manders2026.primaryPlasma.combinations) {
    if (c.surrogate === 'during-raw' || c.variant === 'default') {
      console.log(`  [${c.surrogate} | ${c.variant}] GMR=${fmt(c.summary.gmr, 2)} AFE=${fmt(c.summary.aafe, 2)} narrow=${c.summary.withinNarrow080To125}/6 twofold=${c.summary.withinTwofold}/6`);
    }
  }
}

module.exports = {evaluate, buildEndpointsCsv, buildResultsMarkdown};
