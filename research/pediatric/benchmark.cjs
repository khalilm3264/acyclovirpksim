/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const m = require('../../public/research/pediatric/model.js');
const scenarios = [
  { name: 'reference', ...m.defaults },
  { name: 'higher_egfr', ...m.defaults, egfr: 300 },
  { name: 'higher_weight', ...m.defaults, weight: 30 },
];
const results = { source: m.source, status: 'Equation reproduction only; generated model outputs, not measured clinical data', scenarios: scenarios.map(c => ({ input: c, summary: m.summary(c), concentrations: [0, 0.5, 1, 2, 4, 8, 9, 16, 24, 40, 41, 48].map(time_h => ({ time_h, plasma_mg_L: m.concentration(time_h, c) })) })) };
fs.writeFileSync(path.join(__dirname, 'reference-results.json'), JSON.stringify(results, null, 2) + '\n');
console.log('Wrote research/pediatric/reference-results.json');
