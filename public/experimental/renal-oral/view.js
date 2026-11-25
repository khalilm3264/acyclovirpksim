(function () {
  'use strict';
  const data = window.renalOralData;
  const get = (id) => document.getElementById(id);
  const models = [
    ['baseline', 'One stage', '#767680', 'dashed'],
    ['lag', 'Fixed lag', '#ac5914', 'dotted'],
    ['transit', 'Two stages', '#176b85', 'solid']
  ];
  const fixed = (v, n = 2) => Number(v).toFixed(n);
  const range = (r, n = 2) => fixed(r[0], n) + '–' + fixed(r[1], n);
  let chart;

  const select = get('study');
  data.cases.forEach((c, i) => select.add(new Option(c.label, String(i))));

  function row(body, cells) {
    const tr = body.insertRow();
    for (const cell of cells) tr.insertCell().textContent = cell;
  }

  function context(c) {
    if (c.study === 'hara')
      return (
        'Six adults on hemodialysis, one 1,000 mg dose, before their dialysis session. ' +
        'Inputs: ' +
        c.weight +
        ' kg and measured creatinine clearance ' +
        c.crcl +
        ' mL/min (Table 1 group means). The zero-hour point is assumed and used only for AUC.'
      );
    return (
      'Three adults with chronic kidney disease, fifth 1,500 mg dose every 12 hours. ' +
      'Average of simulated people with creatinine clearance ' +
      c.crcl.join(', ') +
      ' mL/min. Weight was not reported; ' +
      c.weight +
      ' kg is ' +
      (c.weight === 70 ? 'the main assumption.' : 'a sensitivity case.')
    );
  }

  function render() {
    const c = data.cases[Number(select.value)];
    const times = c.times;
    get('context').textContent = context(c);
    get('caption').textContent =
      'Plasma acyclovir · ' + times[0] + '–' + times.at(-1) + ' hours after the studied dose';

    const metrics = get('metrics');
    metrics.replaceChildren();
    row(metrics, [
      'Observed (digitized)',
      '—',
      fixed(c.observedPeak),
      String(c.observedPeakHour),
      fixed(c.observedAuc) + (c.observedAucRange ? ' (' + range(c.observedAucRange) + ')' : ''),
      '1'
    ]);
    for (const [key, name] of models) {
      const m = c.models[key];
      row(metrics, [
        name,
        fixed(m.rmse) + ' (' + range(m.rmseRange) + ')',
        fixed(m.peak),
        String(m.peakHour),
        fixed(m.auc),
        fixed(m.aucPO, 3) + ' (' + range(m.aucPORange, 3) + ')'
      ]);
    }

    get('rmseNote').textContent =
      c.study === 'smith'
        ? 'RMSE split by time: ' +
          models
            .map(
              ([key, name]) =>
                name +
                ' ' +
                fixed(c.models[key].earlyRmse) +
                ' mg/L at 0–2 h and ' +
                fixed(c.models[key].lateRmse) +
                ' mg/L at 3–12 h'
            )
            .join('; ') +
          '. The ranking can change with weight and scoring rule, so no model is claimed best overall.'
        : 'RMSE uses the seven digitized points from 1 to 12 hours.';

    const points = get('points');
    points.replaceChildren();
    times.forEach((t, j) => {
      const at = (key) => c.curves[key][c.drawGrid.indexOf(t)];
      const observed = c.zeroAssumed && j === 0 ? '0 (assumed)' : fixed(c.observed[j], 3);
      row(points, [String(t), observed, ...models.map(([key]) => fixed(at(key), 3))]);
    });

    if (!chart) return;
    const names = ['Observed', ...models.map((m) => m[1])];
    chart.setOption(
      {
        animation: false,
        legend: { type: 'scroll', top: 4, data: names },
        grid: { top: 55, left: 56, right: 14, bottom: 48 },
        xAxis: {
          type: 'value',
          min: 0,
          max: times.at(-1),
          name: 'Hours after dose',
          nameLocation: 'middle',
          nameGap: 28
        },
        yAxis: { type: 'value', name: 'mg/L' },
        series: [
          {
            name: 'Observed',
            type: 'scatter',
            symbolSize: 8,
            itemStyle: { color: '#292e36' },
            z: 5,
            data: times
              .map((t, j) => [t, c.observed[j]])
              .filter((_, j) => !(c.zeroAssumed && j === 0))
          },
          ...models.map(([key, name, color, style]) =>
            window.AyFluxCharts.line(name, c.drawGrid, c.curves[key], color, 2, style)
          )
        ]
      },
      true
    );
  }

  select.addEventListener('change', render);
  render();
  window.AyFluxCharts.ensure()
    .then((echarts) => {
      chart = echarts.init(get('plot'));
      render();
      window.addEventListener('resize', () => chart.resize());
    })
    .catch(() => {
      get('plot').textContent = 'Chart unavailable. See the tables below.';
      get('plot').style.height = 'auto';
    });
})();
