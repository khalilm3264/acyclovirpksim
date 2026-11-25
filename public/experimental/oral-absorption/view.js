(function () {
  'use strict';
  const { studies, amount, concentration } = window.oralComparison;
  const get = (id) => document.getElementById(id);
  const models = [
    ['One stage', 1, 1.8, 0],
    ['Fixed lag', 1, 1.8, 0.59],
    ['Two stages', 2, 1.636, 0]
  ];
  let chart;
  function row(body, cells) {
    const tr = body.insertRow();
    for (const cell of cells) tr.insertCell().textContent = cell;
  }
  function render() {
    const index = Number(get('study').value),
      s = studies[index],
      times = s.times;
    const predict = (model, t) => concentration(s, t, ...model.slice(1));
    const curves = models.map((model) => times.map((t) => predict(model, t)));
    const values = [s.observed, ...curves],
      names = ['Observed', ...models.map((m) => m[0])];
    get('context').textContent =
      index === 0
        ? 'Seven adults. The fit uses ten resolved markers from 0.5 to 8 hours. The reconstruction uses 74.6 kg and creatinine clearance of 79.3 mL/min.'
        : 'Five adults in this treatment sequence. Points show valacyclovir alone. The reconstruction uses 62 kg and an assumed creatinine clearance of 105 mL/min.';
    get('caption').textContent = 'Plasma acyclovir · ' + times[0] + '–' + times.at(-1) + ' hours';
    get('metrics').replaceChildren();
    get('points').replaceChildren();
    values.forEach((v, i) => {
      const peak = Math.max(...v);
      const auc = v
        .slice(1)
        .reduce((sum, y, j) => sum + ((v[j] + y) * (times[j + 1] - times[j])) / 2, 0);
      row(get('metrics'), [
        names[i],
        peak.toFixed(2),
        times[v.indexOf(peak)],
        auc.toFixed(2),
        i ? (amount / s.cl).toFixed(2) : index === 0 ? '11.59' : '—'
      ]);
    });
    times.forEach((t, j) => row(get('points'), [t, ...values.map((v) => v[j].toFixed(3))]));
    if (!chart) return;
    const grid = Array.from({ length: times.at(-1) * 32 + 1 }, (_, j) => j / 32);
    chart.setOption(
      {
        animation: false,
        legend: { type: 'scroll', data: names },
        grid: { top: 55, left: 56, right: 14, bottom: 48 },
        xAxis: {
          type: 'value',
          max: times.at(-1),
          name: 'Hours',
          nameLocation: 'middle',
          nameGap: 28
        },
        yAxis: { type: 'value', name: 'mg/L' },
        series: [
          {
            name: names[0],
            type: 'scatter',
            symbolSize: 8,
            itemStyle: { color: '#292e36' },
            z: 5,
            data: times.map((t, j) => [t, s.observed[j]])
          },
          ...models.map((m, i) =>
            window.AyFluxCharts.line(
              m[0],
              grid,
              grid.map((t) => predict(m, t)),
              ['#767680', '#ac5914', '#176b85'][i],
              2,
              ['dashed', 'dotted', 'solid'][i]
            )
          )
        ]
      },
      true
    );
  }
  get('study').addEventListener('change', render);
  render();
  window.AyFluxCharts.ensure()
    .then((e) => {
      chart = e.init(get('plot'));
      render();
      window.addEventListener('resize', () => chart.resize());
    })
    .catch(() => {
      get('plot').textContent = 'Chart unavailable. See the concentration table below.';
      get('plot').style.height = 'auto';
    });
})();
