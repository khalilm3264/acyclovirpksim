/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const study = globalThis.OncologyStudy;
  const form = byId('scenario');
  const canvas = byId('curves');
  const metrics = byId('metrics');
  const status = byId('scenario-status');
  const lineStyles = [
    ['oral', '#20736c', []],
    ['transit', '#9c460d', [8, 5]],
    ['iv', '#36538d', [2, 4]]
  ];
  let comparison;

  function drawChart() {
    const { width, height } = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!comparison || !context || !width || !height) return;

    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.scale(scale, scale);
    const left = 34;
    const right = width - 12;
    const top = 27;
    const bottom = height - 44;
    const tick = Math.max(
      5,
      Math.ceil(Math.max(...lineStyles.map(([key]) => comparison[key].peak)) / 25) * 5
    );
    const x = (time) => left + (time / 8) * (right - left);
    const y = (concentration) => bottom - (concentration / (5 * tick)) * (bottom - top);

    context.font = '12px Arial, sans-serif';
    context.fillStyle = '#253e51';
    context.fillText('Plasma acyclovir (µmol/L)', left, 14);
    context.strokeStyle = '#d7e2e9';
    context.textAlign = 'right';
    context.beginPath();
    for (let v = 0; v <= 5 * tick; v += tick) {
      context.moveTo(left, y(v));
      context.lineTo(right, y(v));
      context.fillText(String(v), left - 6, y(v) + 4);
    }
    context.stroke();

    context.textAlign = 'center';
    for (let time = 0; time <= 8; time++) {
      context.fillText(String(time), x(time), bottom + 16);
    }
    context.fillText('Hours after dose seven', (left + right) / 2, height - 5);

    context.lineWidth = 2.4;
    for (const [key, color, dash] of lineStyles) {
      context.strokeStyle = color;
      context.setLineDash(dash);
      context.beginPath();
      comparison[key].points.forEach(([time, value], i) => {
        if (i === 0) context.moveTo(x(time), y(value));
        else context.lineTo(x(time), y(value));
      });
      context.stroke();
    }
  }

  function render() {
    if (!form.checkValidity()) return;
    const weight = byId('weight').valueAsNumber;
    const crcl = byId('crcl').valueAsNumber;
    comparison = study.compare(weight, crcl);
    const rows = [
      ['Oral, published', study.published.oral],
      ['Oral, default absorption', comparison.oral],
      ['Oral, two-stage absorption', comparison.transit],
      ['IV, published', study.published.iv],
      ['IV, simulated', comparison.iv]
    ];
    metrics.replaceChildren(
      ...rows.map(([label, row]) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = label;
        tr.append(th);
        for (const [key, decimals] of [
          ['peak', 1],
          ['peakHour', 2],
          ['auc', 1]
        ]) {
          const cell = document.createElement('td');
          const value = row[key];
          cell.textContent = Array.isArray(value)
            ? value.map((v) => v.toFixed(decimals)).join(' ± ')
            : value.toFixed(decimals);
          tr.append(cell);
        }
        return tr;
      })
    );
    status.textContent = `Showing simulations for ${weight} kg and ${crcl} mL/min creatinine clearance.`;
    drawChart();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    render();
  });
  new ResizeObserver(drawChart).observe(canvas);
  render();
})();
