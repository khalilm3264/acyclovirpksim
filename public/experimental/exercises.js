(() => {
  const get = (id) => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  function plot(id, label, start, end, yMax, unit, xUnit, lines, markers) {
    const svg = document.createElementNS(svgNS, 'svg');
    function add(tag, attrs, text) {
      const el = document.createElementNS(svgNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      if (text) el.textContent = text;
      svg.append(el);
    }
    svg.setAttribute('viewBox', '0 0 480 155');
    svg.setAttribute('width', '100%');
    svg.style.maxWidth = '600px';
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
    const x = (t) => 50 + (410 * (t - start)) / (end - start),
      y = (v) => 118 - (91 * v) / yMax;
    add('path', { d: 'M50 27V118H460', fill: 'none', stroke: '#52667c' });
    function title(tx, ty, txt) {
      add('text', { x: tx, y: ty, fill: '#28485e', 'font-size': 12 }, txt);
    }
    title(5, 19, unit);
    title(20, 34, String(yMax));
    title(35, 120, '0');
    title(46, 141, String(start));
    title(445, 141, String(end));
    title(210, 143, xUnit);
    for (const [fn, color, width] of lines) {
      const points = Array.from({ length: 401 }, (_, i) => {
        const t = start + ((end - start) * i) / 400;
        return x(t) + ',' + y(fn(t));
      }).join(' ');
      add('polyline', { points, fill: 'none', stroke: color, 'stroke-width': width });
    }
    for (const [t, v, color] of markers) add('circle', { cx: x(t), cy: y(v), r: 4, fill: color });
    get(id).replaceChildren(svg);
  }
  function peaks() {
    const minutes = Number(get('spread').value);
    get('spread-value').value = minutes + ' min';
    const curves = Array.from({ length: 5 }, (_, i) => (t) => {
      const u = Math.max(0, t - (i * minutes) / 240);
      return 5 * u * Math.exp(1 - u);
    });
    const mean = (t) => curves.reduce((s, fn) => s + fn(t), 0) / curves.length;
    const peak = Math.max(...Array.from({ length: 801 }, (_, i) => mean(i / 100)));
    plot(
      'peaks-plot',
      'Five individual concentration curves and their group mean',
      0,
      8,
      5,
      'mg/L',
      'Hours since dose',
      [...curves.map((f) => [f, '#9daeb9', 1.2]), [mean, '#126590', 3]],
      []
    );
    get('peaks-result').textContent =
      'Peak of group mean: ' + peak.toFixed(2) + ' mg/L. Mean of individual peaks: 5.00 mg/L.';
  }
  function timing() {
    const day = Number(get('serum-day').value),
      serum = (t) => 4 * 2 ** ((7 - t) / 2);
    get('serum-value').value = String(day);
    plot(
      'timing-plot',
      'Blue serum decline with selected serum draw and orange fixed CSF point',
      5,
      12,
      8,
      'µmol/L',
      'Study day',
      [[serum, '#126590', 2]],
      [
        [day, serum(day), '#126590'],
        [7, 1, '#ac531f']
      ]
    );
    get('timing-result').textContent =
      'CSF (orange), day 7: 1.00 µmol/L. Serum (blue), day ' +
      day +
      ': ' +
      serum(day).toFixed(2) +
      ' µmol/L. ' +
      (day === 7 ? 'Same-time' : 'Different-day') +
      ' CSF/serum ratio: ' +
      (1 / serum(day)).toFixed(2) +
      '.';
  }
  const study = [
    [23.77, 69.5, 349],
    [25.7, 88.78, 273],
    [29.12, 103.31, 234],
    [30.61, 121.9, 187]
  ];
  function interaction() {
    const index = Number(document.querySelector('input[name="interaction"]:checked').value);
    const labels = ['Mean individual peak', 'Total exposure (AUC to infinity)', 'Renal clearance'];
    const units = ['µmol/L', 'µmol·h/L', 'mL/min'];
    get('drug-result').replaceChildren(
      ...study[index].map((v, i) => {
        const li = document.createElement('li'),
          change = Math.round(100 * (v / study[0][i] - 1));
        li.textContent =
          labels[i] +
          ': ' +
          v.toFixed(i === 2 ? 0 : 2) +
          ' ' +
          units[i] +
          ' (' +
          (change > 0 ? '+' : '') +
          change +
          '%)';
        return li;
      })
    );
  }
  get('spread').addEventListener('input', peaks);
  get('serum-day').addEventListener('input', timing);
  document
    .querySelectorAll('input[name="interaction"]')
    .forEach((el) => el.addEventListener('change', interaction));
  peaks();
  timing();
  interaction();
})();
