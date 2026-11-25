(function () {
  'use strict';

  const model = window.AyFluxTabletFood;
  const ns = 'http://www.w3.org/2000/svg';
  const fed = '#a43f13';
  const fasted = '#215b87';
  const x0 = 60;
  const x1 = 606;
  const y0 = 252;
  const y1 = 20;

  function draw(svg, series, timeMax, concentrationMax, timeTicks, yTicks) {
    svg.querySelector('g')?.remove();
    const g = document.createElementNS(ns, 'g');
    svg.append(g);

    function add(tag, attrs, label) {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      if (label !== undefined) node.textContent = label;
      g.append(node);
    }

    const x = (time) => x0 + ((x1 - x0) * time) / timeMax;
    const y = (concentration) => y0 - ((y0 - y1) * concentration) / concentrationMax;
    for (const tick of yTicks) {
      add('line', { x1: x0, x2: x1, y1: y(tick), y2: y(tick), stroke: '#c9d6de' });
      add('text', { x: x0 - 7, y: y(tick) + 4, 'text-anchor': 'end' }, tick.toFixed(1));
    }
    for (const tick of timeTicks)
      add('text', { x: x(tick), y: y0 + 21, 'text-anchor': 'middle' }, String(tick));
    add('path', { d: `M${x0},${y1}V${y0}H${x1}`, fill: 'none', stroke: '#526b7c' });
    add('text', { x: (x0 + x1) / 2, y: 293, 'text-anchor': 'middle' }, 'Hours after dose');
    add(
      'text',
      { x: 16, y: 138, 'text-anchor': 'middle', transform: 'rotate(-90 16 138)' },
      'Plasma acyclovir (mg/L)'
    );

    for (const { points, color, dash, marker } of series) {
      add('polyline', {
        points: points.map(([t, c]) => `${x(t)},${y(c)}`).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': 2.5,
        'stroke-dasharray': dash || 'none'
      });
      for (const [t, c] of points) {
        if (marker === 'circle') add('circle', { cx: x(t), cy: y(c), r: 3.2, fill: color });
        if (marker === 'square')
          add('rect', { x: x(t) - 3, y: y(c) - 3, width: 6, height: 6, fill: color });
      }
    }
  }

  const rows = [...document.querySelectorAll('#measured tbody tr')].map((row) =>
    [...row.cells].map((cell) => Number(cell.textContent))
  );
  draw(
    document.getElementById('observed-chart'),
    [
      { points: rows.map(([t, a]) => [t, a / 1000]), color: fed, marker: 'circle' },
      {
        points: rows.map(([t, , c]) => [t, c / 1000]),
        color: fasted,
        dash: '7 5',
        marker: 'square'
      }
    ],
    24,
    1,
    [0, 4, 8, 12, 16, 20, 24],
    [0, 0.2, 0.4, 0.6, 0.8, 1]
  );

  const toggle = document.getElementById('slower');

  function update() {
    const referenceKa = model.parameters.referenceKa;
    const comparisonKa = toggle.checked ? model.parameters.slowKa : referenceKa;
    const points = (ka) =>
      Array.from({ length: 241 }, (_, i) => [i / 20, model.concentration(i / 20, ka)]);

    draw(
      document.getElementById('model-chart'),
      [
        { points: points(comparisonKa), color: fed },
        { points: points(referenceKa), color: fasted, dash: '7 5' }
      ],
      12,
      2.5,
      [0, 2, 4, 6, 8, 10, 12],
      [0, 0.5, 1, 1.5, 2, 2.5]
    );
    document.getElementById('rate-caption').textContent =
      `Reference ${referenceKa.toFixed(1)} h⁻¹ · Comparison ${comparisonKa.toFixed(1)} h⁻¹`;
    for (const [id, ka] of [
      ['reference', referenceKa],
      ['comparison', comparisonKa]
    ]) {
      const result = model.endpoints(ka);
      document.getElementById(`${id}-peak`).textContent = result.cmax.toFixed(3);
      document.getElementById(`${id}-time`).textContent = result.tmax.toFixed(2);
      document.getElementById(`${id}-auc`).textContent = result.aucInfinity.toFixed(2);
    }
  }

  toggle.addEventListener('change', update);
  update();
})();
