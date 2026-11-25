(() => {
  'use strict';
  const { observations, timeZero, impaired, estimatedBaseline, crcl, replay } =
    globalThis.AyFluxAkiRecovery;
  const NS = 'http://www.w3.org/2000/svg';
  const colors = {
    dark: '#1e3445',
    muted: '#526878',
    lines: '#c8d7e0',
    fixed: '#17617d',
    recovery: '#a44310'
  };
  const select = document.getElementById('recovery');
  const x = (day) => 68 + 42 * day;
  function elt(svg, tag, attrs, value) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (value !== undefined) el.textContent = value;
    svg.append(el);
    return el;
  }
  function line(svg, x1, y1, x2, y2, stroke = colors.lines) {
    elt(svg, 'line', { x1, y1, x2, y2, stroke });
  }
  function label(svg, xp, yp, content, anchor = 'start') {
    elt(
      svg,
      'text',
      {
        x: xp,
        y: yp,
        fill: colors.dark,
        'font-size': 15,
        'text-anchor': anchor
      },
      content
    );
  }
  function path(svg, points, color, dash = 'none') {
    elt(svg, 'polyline', {
      points: points.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' '),
      stroke: color,
      'stroke-dasharray': dash,
      'stroke-width': 2.4,
      fill: 'none',
      'stroke-linecap': 'round'
    });
  }
  function axes(svg, title, h, ticks, y, start, end) {
    svg.replaceChildren();
    label(svg, 68, 22, title);
    elt(svg, 'rect', {
      x: x(start),
      y: 38,
      width: x(end) - x(start),
      height: h - 38,
      fill: '#f2e7d6'
    });
    for (const [v, name] of ticks) {
      line(svg, x(0), y(v), x(14), y(v));
      label(svg, x(0) - 8, y(v) + 4, name, 'end');
    }
    line(svg, x(0), 38, x(0), h, colors.muted);
    line(svg, x(0), h, x(14), h, colors.muted);
    for (let d = 0; d <= 14; d += 2) {
      line(svg, x(d), h, x(d), h + 5, colors.muted);
      label(svg, x(d), h + 23, d, 'middle');
    }
    label(svg, x(7), h + 43, 'Figure-relative day', 'middle');
  }
  function sampleAt(curve, day) {
    const step = curve[1].day - curve[0].day;
    const index = Math.min(curve.length - 2, Math.max(0, Math.floor((day - timeZero) / step)));
    const u = curve[index],
      v = curve[index + 1];
    return u.concentration + ((v.concentration - u.concentration) * (day - u.day)) / step;
  }
  function render() {
    const scenario = select.value;
    const start = scenario === 'earlier' ? 3 : 4;
    const end = scenario === 'earlier' ? 10 : 12;
    const serum = document.getElementById('serum');
    const cy = (v) => 38 + (242 * (Math.log10(300) - Math.log10(v))) / 4;
    axes(
      serum,
      'Serum acyclovir (µmol/L, log scale)',
      280,
      [
        [300, '300'],
        [30, '30'],
        [3, '3'],
        [0.3, '0.3'],
        [0.03, '0.03']
      ],
      cy,
      start,
      end
    );
    const fixed = replay('fixed'),
      dynamic = replay(scenario);
    for (const [curve, color, dash] of [
      [fixed, colors.fixed, 'none'],
      [dynamic, colors.recovery, '7 5']
    ]) {
      const visible = curve.filter(
        (p, i) => p.concentration >= 0.03 && (i % 6 === 0 || i === curve.length - 1)
      );
      const last = visible[visible.length - 1];
      if (last) {
        const j = curve.findIndex((p) => p.concentration < 0.03);
        if (j > 0) {
          const u = curve[j - 1],
            v = curve[j];
          const f = (0.03 - u.concentration) / (v.concentration - u.concentration);
          visible.push({
            day: u.day + f * (v.day - u.day),
            concentration: 0.03
          });
        }
      }
      path(
        serum,
        visible.map((p) => [x(p.day), cy(p.concentration)]),
        color,
        dash
      );
    }
    for (const p of observations) {
      const marker = elt(serum, 'circle', {
        cx: x(p.day),
        cy: cy(p.concentration),
        r: 4.2,
        fill: colors.dark,
        stroke: 'white',
        'stroke-width': 1
      });
      elt(marker, 'title', {}, `Day ${p.day.toFixed(2)}: ${p.concentration.toPrecision(3)} µmol/L`);
    }
    const kidney = document.getElementById('kidney');
    const ky = (v) => 124 - (86 * v) / 45;
    axes(
      kidney,
      'Creatinine clearance input (mL/min)',
      124,
      [
        [0, '0'],
        [20, '20'],
        [40, '40']
      ],
      ky,
      start,
      end
    );
    path(
      kidney,
      [
        [timeZero, impaired],
        [14, impaired]
      ].map(([d, v]) => [x(d), ky(v)]),
      colors.fixed
    );
    path(
      kidney,
      [timeZero, start, end, 14].map((d) => [x(d), ky(crcl(d, scenario))]),
      colors.recovery,
      '7 5'
    );
    const probe = observations[3];
    const f = sampleAt(fixed, probe.day),
      d = sampleAt(dynamic, probe.day);
    document.getElementById('result').textContent =
      `At approximate day ${probe.day.toFixed(1)}, the reported concentration was about ${probe.concentration.toPrecision(2)} µmol/L. The fixed and recovering scenarios give ${f.toPrecision(2)} and ${d.toPrecision(2)} µmol/L. Recovery steepens the predicted tail, but neither scenario reproduces the observed persistence. Curves end where they fall below the chart’s lower limit, not at a measured zero.`;
  }
  select.addEventListener('change', render);
  render();
})();
