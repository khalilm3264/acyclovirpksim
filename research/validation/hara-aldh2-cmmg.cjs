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

// Digitized Hara 2008 Figure 3 data (Mean serum CMMG in ug/mL, n=6 per group)
// Ticks calibration: Y=0 at y=642.5 px, Y=14 at y=59.5 px (41.643 px per ug/mL).
// Conversion to umol/L: C_umol_L = C_ug_mL * 1000 / 239.19 = C_ug_mL * 4.180777
const DIGITIZED_FIGURE3 = {
  units_observed: 'ug/mL',
  sampling_hours: [0, 1, 2, 3, 4, 6, 8, 12, 24, 44, 48],
  groups: {
    '*1/*1': {
      genotype: 'ALDH2 *1/*1 (wild-type, n=6)',
      marker: 'closed circle',
      means_ug_mL: [0.00, 0.22, 1.91, 3.17, 4.27, 4.44, 5.19, 5.70, 7.13, 6.60, 6.51],
      uncertainty_24_44_48: [0.05, 0.05, 0.05],
      sd_bars_upper_ug_mL: [0.00, 0.40, 2.70, 4.30, 5.40, 6.10, 7.10, 7.80, 10.00, 9.40, 9.30],
      ambiguous: [0, 1] // 0 and 1 h heavily overlapping near baseline
    },
    '*1/*2': {
      genotype: 'ALDH2 *1/*2 (heterozygous, n=6)',
      marker: 'opened circle',
      means_ug_mL: [0.00, 0.18, 1.40, 2.29, 3.06, 3.66, 4.35, 5.18, 7.83, 8.52, 8.69],
      uncertainty_24_44_48: [0.05, 0.05, 0.05],
      sd_bars_upper_ug_mL: [0.00, 0.35, 2.20, 3.40, 4.30, 4.90, 6.10, 7.50, 11.50, 12.70, 13.10],
      ambiguous: [0, 1]
    },
    '*2/*2': {
      genotype: 'ALDH2 *2/*2 (homozygous mutant, n=6)',
      marker: 'opened triangle',
      means_ug_mL: [0.00, 0.15, 1.02, 1.63, 2.25, 3.11, 3.84, 4.50, 5.94, 5.92, 5.92],
      uncertainty_24_44_48: [0.09, 0.09, 0.09], // triangle centroid vs. base range [5.80, 6.00]
      sd_bars_upper_ug_mL: [0.00, 0.30, 1.80, 2.70, 3.50, 4.10, 4.60, 5.20, 6.00, 6.00, 6.00],
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

  // State vector: [Mgut, C1A, C2A, Cald, C1M, C2M] in molar amounts/concentrations:
  // Mgut: umol
  // C1A, C2A: umol/L
  // Cald: apparent concentration in V1A (Mald / V1A, umol/L)
  // C1M, C2M: umol/L
  let s = [c.dose_umol, 0, 0, 0, 0, 0];

  const tarr = [];
  const cmmgTraj = [];
  const acvTraj = [];

  let aucCMMG = 0;
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

    // trapezoidal AUC integration
    if (step > 0) {
      aucCMMG += C1M * dt;
    }

    tarr.push(t);
    cmmgTraj.push((C1M * MW_CMMG) / 1000);
    acvTraj.push((C1A * MW_ACV) / 1000);

    // Derivatives
    const RateIn = c.Foral * c.ka * Mgut; // umol/h
    const dMgut = -c.ka * Mgut;
    const dC1A = (RateIn - c.QA * (C1A - C2A) - c.CLotherA * C1A - c.V1A * c.kfwd * C1A + c.V1A * c.krev * Cald) / c.V1A;
    const dC2A = (c.QA * (C1A - C2A)) / c.V2A;
    const dCald = c.kfwd * C1A - c.krev * Cald - kox * Cald;
    const dC1M = (c.V1A * kox * Cald - c.QM * (C1M - C2M) - c.CLnrM * C1M) / c.V1M;
    const dC2M = (c.QM * (C1M - C2M)) / c.V2M;

    s = [
      Mgut + dMgut * dt,
      C1A + dC1A * dt,
      C2A + dC2A * dt,
      Cald + dCald * dt,
      C1M + dC1M * dt,
      C2M + dC2M * dt
    ];
  }

  return {
    genotype: genotypeKey,
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

  // Convergence checks with step halving
  const fine11 = simulateGoogleAldh2('*1/*1', 0.00025);
  const fine12 = simulateGoogleAldh2('*1/*2', 0.00025);
  const fine22 = simulateGoogleAldh2('*2/*2', 0.00025);

  assert.ok(Math.abs(sim11.auc0_48_umol_h_L / fine11.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *1/*1');
  assert.ok(Math.abs(sim12.auc0_48_umol_h_L / fine12.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *1/*2');
  assert.ok(Math.abs(sim22.auc0_48_umol_h_L / fine22.auc0_48_umol_h_L - 1) < 0.0005, 'Convergence *2/*2');

  // Verify implementation check AUCs exactly
  // User prompt: "*1/*1: 928.5, *1/*2: 800.4, and *2/*2: 675.4 umol*h/L"
  assert.ok(Math.abs(sim11.auc0_48_umol_h_L - 928.5) < 0.2, `*1/*1 AUC expected ~928.5, got ${sim11.auc0_48_umol_h_L.toFixed(1)}`);
  assert.ok(Math.abs(sim12.auc0_48_umol_h_L - 800.4) < 0.2, `*1/*2 AUC expected ~800.4, got ${sim12.auc0_48_umol_h_L.toFixed(1)}`);
  assert.ok(Math.abs(sim22.auc0_48_umol_h_L - 675.4) < 0.2, `*2/*2 AUC expected ~675.4, got ${sim22.auc0_48_umol_h_L.toFixed(1)}`);

  // Comparison table at 24, 44, and 48 hours
  const keyHours = [24, 44, 48];
  const tableRows = [];

  keyHours.forEach((hour, hIdx) => {
    ['*1/*1', '*1/*2', '*2/*2'].forEach(gKey => {
      const obsUg = DIGITIZED_FIGURE3.groups[gKey].means_ug_mL[DIGITIZED_FIGURE3.sampling_hours.indexOf(hour)];
      const uncert = DIGITIZED_FIGURE3.groups[gKey].uncertainty_24_44_48[hIdx];
      const obsUmol = (obsUg * 1000) / MW_CMMG;

      const sim = gKey === '*1/*1' ? sim11 : (gKey === '*1/*2' ? sim12 : sim22);
      const predUg = sim.sampled[hour].CMMG_ug_mL;
      const predUmol = sim.sampled[hour].CMMG_umol_L;

      const errUg = predUg - obsUg;
      const errUmol = predUmol - obsUmol;
      const pctErr = (errUg / obsUg) * 100;

      tableRows.push({
        hour,
        genotype: gKey,
        obs_ug_mL: `${obsUg.toFixed(2)} ± ${uncert.toFixed(2)}`,
        pred_ug_mL: predUg.toFixed(2),
        err_ug_mL: (errUg >= 0 ? '+' : '') + errUg.toFixed(2),
        obs_umol_L: obsUmol.toFixed(2),
        pred_umol_L: predUmol.toFixed(2),
        err_umol_L: (errUmol >= 0 ? '+' : '') + errUmol.toFixed(2),
        pct_error: (pctErr >= 0 ? '+' : '') + pctErr.toFixed(1) + '%'
      });
    });
  });

  return {
    source: 'Hara et al. 2008, DMPK 23:306-312, Figure 3',
    model: 'Google Hypothesis ALDH2 Reversible-Redundant Model',
    implementation_check_auc: {
      '*1/*1': { target: 928.5, simulated: +sim11.auc0_48_umol_h_L.toFixed(1) },
      '*1/*2': { target: 800.4, simulated: +sim12.auc0_48_umol_h_L.toFixed(1) },
      '*2/*2': { target: 675.4, simulated: +sim22.auc0_48_umol_h_L.toFixed(1) }
    },
    tableRows,
    simulations: { '*1/*1': sim11, '*1/*2': sim12, '*2/*2': sim22 }
  };
}

function generateSvgOverlay(data, outputPath) {
  // Generate a clean vector SVG showing observed points with SD bars vs. model curves
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
  const xTicks = [0, 1, 2, 3, 4, 6, 8, 12, 24, 44, 48];
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
    // step through trajectory
    const step = 20; // sample every 20th point for clean SVG
    for (let i = 0; i < sim.tarr.length; i += step) {
      const xPx = scaleX(sim.tarr[i]);
      const yPx = scaleY(sim.cmmgTraj[i]);
      pathD += (pathD === '' ? 'M ' : ' L ') + `${xPx.toFixed(1)} ${yPx.toFixed(1)}`;
    }
    svg += `  <!-- Model ${gKey} -->\n`;
    svg += `  <path d="${pathD}" fill="none" stroke="${colors[gKey]}" stroke-width="2.5"/>\n`;
  });

  // Plot observed points with SD bars
  ['*1/*1', '*1/*2', '*2/*2'].forEach(gKey => {
    const grp = DIGITIZED_FIGURE3.groups[gKey];
    const col = colors[gKey];
    grp.means_ug_mL.forEach((mean, idx) => {
      const t = DIGITIZED_FIGURE3.sampling_hours[idx];
      const xPx = scaleX(t);
      const yPx = scaleY(mean);
      const yUpper = scaleY(grp.sd_bars_upper_ug_mL[idx]);

      // SD bar (one-sided upper bar as plotted in Hara)
      if (grp.sd_bars_upper_ug_mL[idx] > mean) {
        svg += `  <line x1="${xPx}" y1="${yPx}" x2="${xPx}" y2="${yUpper}" stroke="${col}" stroke-width="1.2"/>\n`;
        svg += `  <line x1="${xPx - 4}" y1="${yUpper}" x2="${xPx + 4}" y2="${yUpper}" stroke="${col}" stroke-width="1.2"/>\n`;
      }

      // Marker shape
      if (gKey === '*1/*1') {
        svg += `  <circle cx="${xPx}" cy="${yPx}" r="4.5" fill="${col}" stroke="#111" stroke-width="1"/>\n`;
      } else if (gKey === '*1/*2') {
        svg += `  <circle cx="${xPx}" cy="${yPx}" r="4.5" fill="#ffffff" stroke="${col}" stroke-width="2"/>\n`;
      } else {
        const poly = `${xPx},${(yPx - 5).toFixed(1)} ${(xPx - 5).toFixed(1)},${(yPx + 4.5).toFixed(1)} ${(xPx + 5).toFixed(1)},${(yPx + 4.5).toFixed(1)}`;
        svg += `  <polygon points="${poly}" fill="#ffffff" stroke="${col}" stroke-width="2"/>\n`;
      }
    });
  });

  // Legend
  const legX = padLeft + 20;
  const legY = padTop + 20;
  svg += `  <!-- Legend -->
  <rect x="${legX}" y="${legY}" width="290" height="110" fill="#ffffff" fill-opacity="0.9" stroke="#ccc" rx="4"/>
  <circle cx="${legX + 20}" cy="${legY + 22}" r="4.5" fill="${colors['*1/*1']}" stroke="#111" stroke-width="1"/>
  <line x1="${legX + 10}" y1="${legY + 22}" x2="${legX + 35}" y2="${legY + 22}" stroke="${colors['*1/*1']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 26}" font-size="11" fill="#222">ALDH2 *1/*1 (Obs: closed / Model: solid)</text>

  <circle cx="${legX + 20}" cy="${legY + 48}" r="4.5" fill="#ffffff" stroke="${colors['*1/*2']}" stroke-width="2"/>
  <line x1="${legX + 10}" y1="${legY + 48}" x2="${legX + 35}" y2="${legY + 48}" stroke="${colors['*1/*2']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 52}" font-size="11" fill="#222">ALDH2 *1/*2 (Obs: open circ / Model: solid)</text>

  <polygon points="${legX + 20},${legY + 70} ${legX + 15},${legY + 80} ${legX + 25},${legY + 80}" fill="#ffffff" stroke="${colors['*2/*2']}" stroke-width="2"/>
  <line x1="${legX + 10}" y1="${legY + 75}" x2="${legX + 35}" y2="${legY + 75}" stroke="${colors['*2/*2']}" stroke-width="2"/>
  <text x="${legX + 45}" y="${legY + 79}" font-size="11" fill="#222">ALDH2 *2/*2 (Obs: triangle / Model: solid)</text>

  <text x="${legX + 15}" y="${legY + 100}" font-size="10" fill="#666" font-style="italic">Note: Model *1/*1 > *1/*2 > *2/*2; Observed *1/*2 is highest at 24–48 h</text>
</svg>`;

  fs.writeFileSync(outputPath, svg, 'utf8');
}

if (require.main === module) {
  const comp = runComparison();
  console.log('=== Implementation Check 48-Hour CMMG AUCs ===');
  console.table(comp.implementation_check_auc);

  console.log('\n=== Observed vs. Predicted Serum CMMG at 24, 44, and 48 Hours ===');
  console.table(comp.tableRows);

  const svgPath = path.join(__dirname, 'hara-aldh2-overlay.svg');
  generateSvgOverlay(comp, svgPath);
  console.log(`\nGenerated overlay SVG: ${svgPath}`);
}

module.exports = {
  DIGITIZED_FIGURE3,
  GOOGLE_CONSTANTS,
  simulateGoogleAldh2,
  runComparison,
  generateSvgOverlay
};
