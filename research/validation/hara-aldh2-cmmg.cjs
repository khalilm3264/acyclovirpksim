// Hara et al. 2008, Figure 3 CMMG vs. Google ALDH2 Reversible-Redundant Model
// doi:10.2133/dmpk.23.306.
//
// Evaluates whether Google's ALDH2 pharmacogenomic model (idea_report_4080292048723247105.pdf)
// predicts serum CMMG accumulation across ALDH2 genotype groups (*1/*1, *1/*2, *2/*2) in anuric ESRD.
// Educational and exploratory research only; never for clinical dosing.

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Molar masses
const MW_ACV = 225.21; // g/mol
const MW_CMMG = 239.19; // g/mol
const MW_VAL = 324.34; // g/mol (valacyclovir base)

// Axis Calibration from Hara et al. 2008 Figure 3 (native resolution 988 x 809 px)
// Dual calibration verified:
// 1. Embedded raster (988 x 809 px): y0=748.5 px, y14=165.5 px (41.643 px per ug/mL); x0=164.5, x48=951.7 (16.399 px/h)
// 2. 4 px/pt PDF render (1000 x 688 px): y0=625 px, y14=64 px (~40.07 px per ug/mL); x0=181, x48=950 (16.02 px/h)
const CALIBRATION = {
  raster_988x809: {
    y0_px: 748.5,
    y14_px: 165.5,
    scale_y: (748.5 - 165.5) / 14.0, // 41.64286 px / (ug/mL)
    x0_px: 164.5,
    x48_px: 951.7,
    scale_x: (951.7 - 164.5) / 48.0 // 16.399 px / h
  },
  pdf_render_1000x688: {
    y0_px: 625.0,
    y14_px: 64.0,
    scale_y: (625.0 - 64.0) / 14.0, // 40.0714 px / (ug/mL)
    x0_px: 181.0,
    x48_px: 950.0,
    scale_x: (950.0 - 181.0) / 48.0 // 16.021 px / h
  }
};

// Repeated marker extractions at 24, 44, and 48 hours:
// Reading 1: outer envelope / boundary bounds extraction
// Reading 2: visual centroid / inner lumen extraction
// Records raw coordinates, concentrations, and difference between readings.
const RAW_READINGS_24_44_48 = {
  '*1/*1': {
    24: { r1_y_px: 451.6, r1_ug: 7.13, r2_y_px: 463.0, r2_ug: 6.86, diff_ug: 0.27, rounded_ug: 7.1 },
    44: { r1_y_px: 473.6, r1_ug: 6.60, r2_y_px: 474.5, r2_ug: 6.58, diff_ug: 0.02, rounded_ug: 6.6 },
    48: { r1_y_px: 477.4, r1_ug: 6.51, r2_y_px: 478.2, r2_ug: 6.49, diff_ug: 0.02, rounded_ug: 6.5 }
  },
  '*1/*2': {
    24: { r1_y_px: 422.4, r1_ug: 7.83, r2_y_px: 436.2, r2_ug: 7.50, diff_ug: 0.33, rounded_ug: 7.8 },
    44: { r1_y_px: 393.7, r1_ug: 8.52, r2_y_px: 395.4, r2_ug: 8.48, diff_ug: 0.04, rounded_ug: 8.5 },
    48: { r1_y_px: 386.6, r1_ug: 8.69, r2_y_px: 388.3, r2_ug: 8.65, diff_ug: 0.04, rounded_ug: 8.7 }
  },
  '*2/*2': {
    24: { r1_y_px: 501.0, r1_ug: 5.94, r2_y_px: 502.5, r2_ug: 5.91, diff_ug: 0.03, rounded_ug: 6.0 },
    44: { r1_y_px: 502.0, r1_ug: 5.92, r2_y_px: 502.8, r2_ug: 5.90, diff_ug: 0.02, rounded_ug: 5.9 },
    48: { r1_y_px: 502.0, r1_ug: 5.92, r2_y_px: 503.7, r2_ug: 5.88, diff_ug: 0.04, rounded_ug: 5.9 }
  }
};

// Digitized dataset with directional SD endpoints:
// At 24, 44, and 48 hours, both readings confirm *1/*2 is the highest plotted mean.
// Early means (0-1 h) overlap near baseline and cannot resolve genotype ordering;
// percentage errors for 0 and 1 h are omitted.
// SD endpoints preserve published direction (upper vs lower caps); unreadable endpoints are null.
const DIGITIZED_FIGURE3 = {
  units_observed: 'ug/mL',
  sampling_hours: [0, 1, 2, 3, 4, 6, 8, 12, 24, 44, 48],
  groups: {
    '*1/*1': {
      genotype: 'ALDH2 *1/*1 (wild-type, n=6)',
      marker: 'closed circle',
      means_ug_mL: [0.00, 0.22, 1.91, 3.17, 4.27, 4.44, 5.19, 5.70, 7.1, 6.6, 6.5],
      uncertainty_24_44_48: [0.1, 0.1, 0.1],
      sd_upper_ug_mL: [null, null, 2.70, 4.30, 5.40, 6.10, 7.10, 7.80, null, null, null],
      sd_lower_ug_mL: [null, null, null, null, null, null, null, null, 4.02, 4.57, 4.67],
      ambiguous: [0, 1]
    },
    '*1/*2': {
      genotype: 'ALDH2 *1/*2 (heterozygous, n=6)',
      marker: 'open circle',
      means_ug_mL: [0.00, 0.18, 1.40, 2.29, 3.06, 3.66, 4.35, 5.18, 7.8, 8.5, 8.7],
      uncertainty_24_44_48: [0.1, 0.1, 0.1],
      sd_upper_ug_mL: [null, null, 2.20, 3.40, 4.30, 4.90, 6.10, 7.50, 11.50, 12.70, 13.10],
      sd_lower_ug_mL: [null, null, null, null, null, null, null, null, null, null, null],
      ambiguous: [0, 1]
    },
    '*2/*2': {
      genotype: 'ALDH2 *2/*2 (homozygous mutant, n=6)',
      marker: 'open triangle',
      means_ug_mL: [0.00, 0.15, 1.02, 1.63, 2.25, 3.11, 3.84, 4.50, 6.0, 5.9, 5.9],
      uncertainty_24_44_48: [0.1, 0.1, 0.1],
      sd_upper_ug_mL: [null, null, 1.80, 2.70, 3.50, 4.10, 4.60, 5.20, null, null, null],
      sd_lower_ug_mL: [null, null, null, null, null, null, null, null, 2.46, 1.28, 0.90],
      ambiguous: [0, 1]
    }
  }
};

// Google ALDH2 Reversible-Redundant Model Parameters
// From idea_report_4080292048723247105.pdf, Pages 4-6
const GOOGLE_CONSTANTS = {
  reference_ffm_kg: 55,
  dose_mg: 1000,
  dose_umol: (1000 / MW_VAL) * 1000, // 3083.184 umol
  Foral: 0.545,
  ka: 0.95, // h^-1
  V1A: 14.5, // L
  V2A: 28.5, // L
  QA: 18.0, // L/h
  CLotherA: 0.05, // L/h
  V1M: 15.0, // L
  V2M: 30.0, // L
  QM: 15.0, // L/h
  CLnrM: 0.12, // L/h
  kfwd: 0.1203, // h^-1
  krev: 0.1965, // h^-1
  kaldh_red: 0.2962, // h^-1 (redundant cytosolic ALDH1A1/B1)
  genotypes: {
    '*1/*1': { kaldh2: 4.0049 }, // 100% activity
    '*1/*2': { kaldh2: 0.4005 }, // 10% activity
    '*2/*2': { kaldh2: 0.0400 }  // 1% activity
  }
};

function simulateGoogleAldh2(genotypeKey, dt = 0.0005, horizon = 48.0) {
  const c = GOOGLE_CONSTANTS;
  const kaldh2 = c.genotypes[genotypeKey].kaldh2;
  const kox = kaldh2 + c.kaldh_red;

  let s = [c.dose_umol, 0, 0, 0, 0, 0];

  const tarr = [];
  const cmmgTraj = [];
  const acvTraj = [];

  let aucCMMG = 0, previousCMMG = 0, eliminated = 0, formed = 0;
  const samplingHours = DIGITIZED_FIGURE3.sampling_hours;
  const sampled = {};
  let sampleIdx = 0;

  const totalSteps = Math.round(horizon / dt);
  for (let step = 0; step <= totalSteps; step++) {
    const t = step * dt;
    const [Mgut, C1A, C2A, Cald, C1M, C2M] = s;

    if (sampleIdx < samplingHours.length && Math.abs(t - samplingHours[sampleIdx]) < dt / 2) {
      sampled[samplingHours[sampleIdx]] = {
        time_h: samplingHours[sampleIdx],
        CMMG_umol_L: C1M,
        CMMG_ug_mL: (C1M * MW_CMMG) / 1000,
        ACV_umol_L: C1A,
        ACV_ug_mL: (C1A * MW_ACV) / 1000
      };
      sampleIdx++;
    }

    if (step > 0) {
      aucCMMG += (previousCMMG + C1M) * dt / 2;
    }

    previousCMMG = C1M;
    tarr.push(t);
    cmmgTraj.push((C1M * MW_CMMG) / 1000);
    acvTraj.push((C1A * MW_ACV) / 1000);

    if (step === totalSteps) break;

    const RateIn = c.Foral * c.ka * Mgut;
    const dMgut = -c.ka * Mgut;
    const dC1A = (RateIn - c.QA * (C1A - C2A) - c.CLotherA * C1A - c.V1A * c.kfwd * C1A + c.V1A * c.krev * Cald) / c.V1A;
    const dC2A = (c.QA * (C1A - C2A)) / c.V2A;
    const dCald = c.kfwd * C1A - c.krev * Cald - kox * Cald;
    const dC1M = (c.V1A * kox * Cald - c.QM * (C1M - C2M) - c.CLnrM * C1M) / c.V1M;
    const dC2M = (c.QM * (C1M - C2M)) / c.V2M;

    eliminated += (c.CLotherA * C1A + c.CLnrM * C1M) * dt;
    formed += c.V1A * kox * Cald * dt;
    s = [
      Mgut + dMgut * dt,
      C1A + dC1A * dt,
      C2A + dC2A * dt,
      Cald + dCald * dt,
      C1M + dC1M * dt,
      C2M + dC2M * dt
    ];
  }

  assert.equal(sampleIdx, samplingHours.length);
  const parent = c.V1A * s[1] + c.V2A * s[2];
  const intermediate = c.V1A * s[3];
  const metabolite = c.V1M * s[4] + c.V2M * s[5];
  const residual = c.Foral * s[0] + parent + intermediate + metabolite + eliminated - c.Foral * c.dose_umol;
  assert.ok(Math.abs(residual) < 1e-6, 'molar mass balance');
  assert.ok(s.every(value => value >= 0 && Number.isFinite(value)));

  return {
    genotype: genotypeKey,
    finalMolarAmounts: { parent, intermediate, metabolite, eliminated, formed, residual },
    auc0_48_umol_h_L: aucCMMG,
    sampled,
    tarr,
    cmmgTraj,
    acvTraj
  };
}

function runComparison() {
  const sim11 = simulateGoogleAldh2('*1/*1');
  const sim12 = simulateGoogleAldh2('*1/*2');
  const sim22 = simulateGoogleAldh2('*2/*2');

  // Numerical convergence check with step halving
  const fine11 = simulateGoogleAldh2('*1/*1', 0.00025);
  const fine12 = simulateGoogleAldh2('*1/*2', 0.00025);
  const fine22 = simulateGoogleAldh2('*2/*2', 0.00025);

  assert.ok(Math.abs(sim11.auc0_48_umol_h_L / fine11.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *1/*1');
  assert.ok(Math.abs(sim12.auc0_48_umol_h_L / fine12.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *1/*2');
  assert.ok(Math.abs(sim22.auc0_48_umol_h_L / fine22.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *2/*2');

  // Implementation check target AUCs
  assert.ok(Math.abs(sim11.auc0_48_umol_h_L - 928.5) < 0.2, `*1/*1 AUC expected ~928.5, got ${sim11.auc0_48_umol_h_L.toFixed(1)}`);
  assert.ok(Math.abs(sim12.auc0_48_umol_h_L - 800.4) < 0.2, `*1/*2 AUC expected ~800.4, got ${sim12.auc0_48_umol_h_L.toFixed(1)}`);
  assert.ok(Math.abs(sim22.auc0_48_umol_h_L - 675.4) < 0.2, `*2/*2 AUC expected ~675.4, got ${sim22.auc0_48_umol_h_L.toFixed(1)}`);

  // Independent matrix exponential calculation check
  const exact = {
    '*1/*1': [21.53910171355388, 27.564635936557988, 28.175973247558105],
    '*1/*2': [18.47116760935054, 25.09694442430041, 25.880460605121492],
    '*2/*2': [15.4297253225962, 22.20880949323225, 23.107168227207413]
  };
  for (const sim of [sim11, sim12, sim22]) {
    [24, 44, 48].forEach((hour, i) => {
      assert.ok(Math.abs(sim.sampled[hour].CMMG_umol_L - exact[sim.genotype][i]) < 0.003);
    });
  }

  // Code check: 48-hour concentrations (6.74, 6.19, 5.53 mg/L)
  assert.equal(sim11.sampled[48].CMMG_ug_mL.toFixed(2), '6.74', '48h *1/*1 check');
  assert.equal(sim12.sampled[48].CMMG_ug_mL.toFixed(2), '6.19', '48h *1/*2 check');
  assert.equal(sim22.sampled[48].CMMG_ug_mL.toFixed(2), '5.53', '48h *2/*2 check');

  // Code check: 12-hour concentrations (3.37, 2.70, 2.12 mg/L)
  assert.equal(sim11.sampled[12].CMMG_ug_mL.toFixed(2), '3.37', '12h *1/*1 check');
  assert.equal(sim12.sampled[12].CMMG_ug_mL.toFixed(2), '2.70', '12h *1/*2 check');
  assert.equal(sim22.sampled[12].CMMG_ug_mL.toFixed(2), '2.12', '12h *2/*2 check');

  // Full comparison table across all 11 published sampling times
  const allHours = DIGITIZED_FIGURE3.sampling_hours;
  const fullTableRows = [];
  const keyTableRows = [];

  allHours.forEach(hour => {
    ['*1/*1', '*1/*2', '*2/*2'].forEach(gKey => {
      const idx = allHours.indexOf(hour);
      const obsUg = DIGITIZED_FIGURE3.groups[gKey].means_ug_mL[idx];
      const obsUmol = obsUg !== null ? (obsUg * 1000) / MW_CMMG : null;

      const sim = gKey === '*1/*1' ? sim11 : (gKey === '*1/*2' ? sim12 : sim22);
      const predUg = sim.sampled[hour].CMMG_ug_mL;
      const predUmol = sim.sampled[hour].CMMG_umol_L;

      const isAmbiguous = hour <= 1;
      const errUg = obsUg !== null ? predUg - obsUg : null;
      const errUmol = obsUmol !== null ? predUmol - obsUmol : null;

      const pctErrStr = isAmbiguous || obsUg === null || obsUg === 0
        ? '—'
        : (errUg >= 0 ? '+' : '') + ((errUg / obsUg) * 100).toFixed(1) + '%';

      let obsLabel = obsUg !== null ? obsUg.toFixed(1) : 'null';
      if ([24, 44, 48].includes(hour)) {
        const u = DIGITIZED_FIGURE3.groups[gKey].uncertainty_24_44_48[[24, 44, 48].indexOf(hour)];
        obsLabel = `${obsUg.toFixed(1)} ± ${u.toFixed(1)}`;
      } else if (isAmbiguous) {
        obsLabel = `${obsUg !== null ? obsUg.toFixed(2) : '—'} [unresolved]`;
      }

      const row = {
        hour,
        genotype: gKey,
        obs_ug_mL: obsLabel,
        pred_ug_mL: predUg.toFixed(2),
        err_ug_mL: errUg !== null ? (errUg >= 0 ? '+' : '') + errUg.toFixed(2) : '—',
        obs_umol_L: obsUmol !== null ? obsUmol.toFixed(2) : '—',
        pred_umol_L: predUmol.toFixed(2),
        err_umol_L: errUmol !== null ? (errUmol >= 0 ? '+' : '') + errUmol.toFixed(2) : '—',
        pct_error: pctErrStr
      };

      fullTableRows.push(row);
      if ([24, 44, 48].includes(hour)) {
        keyTableRows.push(row);
      }
    });
  });

  return {
    source: 'Hara et al. 2008, DMPK 23:306-312, Figure 3 and Tables 1-3',
    model: 'Google Hypothesis ALDH2 Reversible-Redundant Model',
    calibration: CALIBRATION,
    raw_readings_24_44_48: RAW_READINGS_24_44_48,
    implementation_check_auc: {
      '*1/*1': { target: 928.5, simulated: +sim11.auc0_48_umol_h_L.toFixed(1) },
      '*1/*2': { target: 800.4, simulated: +sim12.auc0_48_umol_h_L.toFixed(1) },
      '*2/*2': { target: 675.4, simulated: +sim22.auc0_48_umol_h_L.toFixed(1) }
    },
    keyTableRows,
    fullTableRows,
    simulations: { '*1/*1': sim11, '*1/*2': sim12, '*2/*2': sim22 }
  };
}

function generateSvgOverlay(data, outputPath) {
  const width = 800;
  const height = 550;
  const padLeft = 80;
  const padRight = 40;
  const padTop = 60;
  const padBottom = 70;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xMax = 48.0;
  const yMax = 14.0;

  const scaleX = x => padLeft + (x / xMax) * plotW;
  const scaleY = y => padTop + (1 - y / yMax) * plotH;

  const colors = {
    '*1/*1': '#1f77b4', // blue
    '*1/*2': '#ff7f0e', // orange
    '*2/*2': '#2ca02c'  // green
  };

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color:#ffffff; font-family:sans-serif;">
  <text x="${width / 2}" y="32" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">Hara 2008 Figure 3 vs. Google ALDH2 Model CMMG Accumulation</text>
  <text x="${width / 2}" y="50" text-anchor="middle" font-size="12" fill="#555">Single oral 1,000 mg valacyclovir in anuric ESRD (0–48 h pre-dialysis)</text>

  <!-- Plot Box -->
  <rect x="${padLeft}" y="${padTop}" width="${plotW}" height="${plotH}" fill="#fafafa" stroke="#333" stroke-width="1.2"/>

  <!-- Y-axis ticks and labels -->
`;

  for (let y = 0; y <= 14; y += 2) {
    const yPx = scaleY(y);
    svg += `  <line x1="${padLeft - 6}" y1="${yPx}" x2="${padLeft}" y2="${yPx}" stroke="#333" stroke-width="1"/>\n`;
    svg += `  <line x1="${padLeft}" y1="${yPx}" x2="${padLeft + plotW}" y2="${yPx}" stroke="#eee" stroke-width="1" stroke-dasharray="2,2"/>\n`;
    svg += `  <text x="${padLeft - 12}" y="${yPx + 4}" text-anchor="end" font-size="12" fill="#333">${y}</text>\n`;
  }
  svg += `  <text x="${padLeft - 45}" y="${padTop + plotH / 2}" text-anchor="middle" font-size="13" font-weight="bold" fill="#222" transform="rotate(-90 ${padLeft - 45} ${padTop + plotH / 2})">Serum CMMG (µg/mL)</text>\n`;

  // X-axis ticks
  const xTicks = [0, 12, 24, 36, 48];
  xTicks.forEach(x => {
    const xPx = scaleX(x);
    svg += `  <line x1="${xPx}" y1="${padTop + plotH}" x2="${xPx}" y2="${padTop + plotH + 6}" stroke="#333" stroke-width="1"/>\n`;
    svg += `  <text x="${xPx}" y="${padTop + plotH + 20}" text-anchor="middle" font-size="11" fill="#333">${x}</text>\n`;
  });
  svg += `  <text x="${padLeft + plotW / 2}" y="${padTop + plotH + 48}" text-anchor="middle" font-size="13" font-weight="bold" fill="#222">Time post-dose (hours)</text>\n`;

  // Plot model curves
  ['*1/*1', '*1/*2', '*2/*2'].forEach(gKey => {
    const sim = data.simulations[gKey];
    let pathD = '';
    const step = 20;
    for (let i = 0; i < sim.tarr.length; i += step) {
      const xPx = scaleX(sim.tarr[i]);
      const yPx = scaleY(sim.cmmgTraj[i]);
      pathD += (pathD === '' ? 'M ' : ' L ') + `${xPx.toFixed(1)} ${yPx.toFixed(1)}`;
    }
    svg += `  <!-- Model ${gKey} -->\n`;
    svg += `  <path d="${pathD}" fill="none" stroke="${colors[gKey]}" stroke-width="2.5"/>\n`;
  });

  // Plot observed points with directional SD bars and reading allowance
  ['*1/*1', '*1/*2', '*2/*2'].forEach(gKey => {
    const grp = DIGITIZED_FIGURE3.groups[gKey];
    const col = colors[gKey];
    grp.means_ug_mL.forEach((mean, idx) => {
      if (mean === null) return;
      const t = DIGITIZED_FIGURE3.sampling_hours[idx];
      const xPx = scaleX(t);
      const yPx = scaleY(mean);

      const upperVal = grp.sd_upper_ug_mL[idx];
      const lowerVal = grp.sd_lower_ug_mL[idx];

      if (upperVal !== null && upperVal > mean) {
        const yUpper = scaleY(upperVal);
        svg += `  <line x1="${xPx}" y1="${yPx}" x2="${xPx}" y2="${yUpper}" stroke="${col}" stroke-width="1.2"/>\n`;
        svg += `  <line x1="${xPx - 4}" y1="${yUpper}" x2="${xPx + 4}" y2="${yUpper}" stroke="${col}" stroke-width="1.2"/>\n`;
      }

      if (lowerVal !== null && lowerVal < mean) {
        const yLower = scaleY(lowerVal);
        svg += `  <line x1="${xPx}" y1="${yPx}" x2="${xPx}" y2="${yLower}" stroke="${col}" stroke-width="1.2"/>\n`;
        svg += `  <line x1="${xPx - 4}" y1="${yLower}" x2="${xPx + 4}" y2="${yLower}" stroke="${col}" stroke-width="1.2"/>\n`;
      }

      // Marker shape
      if (gKey === '*1/*1') {
        svg += `  <circle cx="${xPx}" cy="${yPx}" r="4.5" fill="${col}" stroke="#111" stroke-width="1"/>\n`;
      } else if (gKey === '*1/*2') {
        svg += `  <circle cx="${xPx}" cy="${yPx}" r="4.5" fill="#ffffff" stroke="${col}" stroke-width="2"/>\n`;
      } else {
        svg += `  <path d="M ${xPx},${(yPx - 5).toFixed(1)} L ${(xPx - 5).toFixed(1)},${(yPx + 4.5).toFixed(1)} L ${(xPx + 5).toFixed(1)},${(yPx + 4.5).toFixed(1)} Z" fill="#ffffff" stroke="${col}" stroke-width="2"/>\n`;
      }
    });
  });

  // Legend
  const legX = padLeft + 20;
  const legY = padTop + 20;
  svg += `  <!-- Legend -->
  <rect x="${legX}" y="${legY}" width="310" height="110" fill="#ffffff" fill-opacity="0.9" stroke="#ccc" rx="4"/>
  <circle cx="${legX + 20}" cy="${legY + 22}" r="4.5" fill="${colors['*1/*1']}" stroke="#111" stroke-width="1"/>
  <line x1="${legX + 10}" y1="${legY + 22}" x2="${legX + 35}" y2="${legY + 22}" stroke="${colors['*1/*1']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 26}" font-size="11" fill="#222">ALDH2 *1/*1 (Obs: closed / Model: solid)</text>

  <circle cx="${legX + 20}" cy="${legY + 48}" r="4.5" fill="#ffffff" stroke="${colors['*1/*2']}" stroke-width="2"/>
  <line x1="${legX + 10}" y1="${legY + 48}" x2="${legX + 35}" y2="${legY + 48}" stroke="${colors['*1/*2']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 52}" font-size="11" fill="#222">ALDH2 *1/*2 (Obs: open circ / Model: solid)</text>

  <path d="M ${legX + 20},${legY + 70} L ${legX + 15},${legY + 80} L ${legX + 25},${legY + 80} Z" fill="#ffffff" stroke="${colors['*2/*2']}" stroke-width="2"/>
  <line x1="${legX + 10}" y1="${legY + 75}" x2="${legX + 35}" y2="${legY + 75}" stroke="${colors['*2/*2']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 79}" font-size="11" fill="#222">ALDH2 *2/*2 (Obs: triangle / Model: solid)</text>

  <text x="${legX + 15}" y="${legY + 100}" font-size="10" fill="#666" font-style="italic">Model: *1/*1 > *1/*2 > *2/*2; Plotted mean: *1/*2 highest at 24–48 h</text>
</svg>`;

  fs.writeFileSync(outputPath, svg, 'utf8');
}

if (require.main === module) {
  const comp = runComparison();
  console.log('=== Implementation Check 48-Hour CMMG AUCs ===');
  console.table(comp.implementation_check_auc);

  console.log('\n=== Key Comparison at 24, 44, and 48 Hours ===');
  console.table(comp.keyTableRows);

  console.log('\n=== Full 11-Point Comparison Table ===');
  console.table(comp.fullTableRows);

  const svgPath = path.join(__dirname, 'hara-aldh2-overlay.svg');
  generateSvgOverlay(comp, svgPath);
  console.log(`\nGenerated overlay SVG: ${svgPath}`);
}

module.exports = {
  CALIBRATION,
  RAW_READINGS_24_44_48,
  DIGITIZED_FIGURE3,
  GOOGLE_CONSTANTS,
  simulateGoogleAldh2,
  runComparison,
  generateSvgOverlay
};
