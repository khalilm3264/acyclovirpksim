/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
(() => {
  const model = window.AyFluxPediatric;
  const $ = id => document.getElementById(id);
  const ns = 'http://www.w3.org/2000/svg';
  let last = null;
  function element(name, attrs, text) {
    const node = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function draw(rows) {
    const svg = $('chart');
    svg.querySelectorAll('g').forEach(node => node.remove());
    const g = element('g', {}); svg.append(g);
    const end = rows.at(-1).time;
    const ymax = Math.max(1, ...rows.map(r => Math.max(r.p95, r.comparison))) * 1.1;
    const x = t => 65 + 730 * t / end, y = c => 305 - 270 * c / ymax;
    for (let i = 0; i <= 5; i++) {
      const yy = y(ymax * i / 5);
      g.append(element('line', { x1: 65, x2: 795, y1: yy, y2: yy, stroke: '#d7e2e9' }));
      g.append(element('text', { x: 55, y: yy + 4, 'text-anchor': 'end' }, (ymax * i / 5).toFixed(1)));
      g.append(element('text', { x: x(end * i / 5), y: 325, 'text-anchor': 'middle' }, (end * i / 5).toFixed(1)));
    }
    g.append(element('text', { x: 65, y: 20 }, 'Plasma acyclovir (mg/L)'));
    g.append(element('text', { x: 430, y: 350, 'text-anchor': 'middle' }, 'Time (hours)'));
    const points = (list, key) => list.map(r => `${x(r.time)},${y(r[key])}`).join(' ');
    g.append(element('polygon', { points: points(rows, 'p95') + ' ' + points([...rows].reverse(), 'p05'), fill: '#c6dfed' }));
    g.append(element('polyline', { points: points(rows, 'typical'), fill: 'none', stroke: '#0072b2', 'stroke-width': 2.5 }));
    g.append(element('polyline', { points: points(rows, 'comparison'), fill: 'none', stroke: '#d55e00', 'stroke-width': 2.5, 'stroke-dasharray': '7 4' }));
  }
  function run(event) {
    if (event) event.preventDefault();
    try {
      const config = Object.fromEntries(Object.keys(model.defaults).map(key => [key, Number($(key).value)]));
      const comparison = { ...config, egfr: Number($('compare').value) };
      const p = model.parameters(comparison);
      const rows = model.simulate(config).map(row => ({ ...row, comparison: model.concentration(row.time, comparison, p) }));
      const stats = model.summary(config);
      draw(rows);
      $('metrics').replaceChildren();
      for (const [label, value, unit] of [ ['Clearance', stats.cl, 'L/h'], ['Volume', stats.v, 'L'], ['Half-life', stats.halfLife, 'h'], ['Steady-state peak', stats.ssPeak, 'mg/L'], ['Steady-state trough', stats.ssTrough, 'mg/L'], ['AUC per steady-state interval', stats.aucPerInterval, 'mg·h/L'] ]) {
        const item = document.createElement('div'), strong = document.createElement('strong'), caption = document.createElement('span');
        strong.textContent = `${value.toFixed(2)} ${unit}`; caption.textContent = label; item.append(strong, caption); $('metrics').append(item);
      }
      $('rows').replaceChildren();
      const fragment = document.createDocumentFragment();
      for (const row of rows) {
        const tr = document.createElement('tr');
        for (const key of ['time', 'typical', 'p05', 'p50', 'p95', 'comparison']) { const td = document.createElement('td'); td.textContent = row[key].toFixed(3); tr.append(td); }
        fragment.append(tr);
      }
      $('rows').append(fragment);
      $('status').textContent = `Selected eGFR ${config.egfr}; comparison ${comparison.egfr} mL/min/1.73 m². ${config.doses} doses of ${(config.dose * config.weight).toFixed(1)} mg. Simulated band: 1,000 individuals, fixed seed 20261109.`;
      $('error').textContent = '';
      last = { config, comparison, rows };
      $('export').disabled = false;
    } catch (error) {
      $('error').textContent = error.message;
      $('status').textContent = 'Inputs are invalid. Previously calculated results remain visible; update with valid inputs.';
      $('export').disabled = true;
    }
  }
  $('inputs').addEventListener('submit', run);
  $('inputs').addEventListener('input', () => { $('status').textContent = 'Inputs changed. Select Update curves to recalculate.'; $('export').disabled = true; });
  $('export').addEventListener('click', () => {
    if (!last) return;
    const { config: c, comparison, rows } = last;
    const header = 'model_doi,route,age_years,weight_kg,egfr_mL_min_1_73m2,comparison_egfr_mL_min_1_73m2,dose_mg_kg,interval_h,infusion_h,doses,ensemble_n,seed,time_h,typical_mg_L,p05_mg_L,p50_mg_L,p95_mg_L,comparison_typical_mg_L';
    const metadata = [model.source, 'IV', c.age, c.weight, c.egfr, comparison.egfr, c.dose, c.interval, c.infusion, c.doses, 1000, 20261109];
    const csv = [header, ...rows.map(r => [...metadata, r.time, r.typical, r.p05, r.p50, r.p95, r.comparison].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ayflux-pediatric-abdalla-iv.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  run();
})();
