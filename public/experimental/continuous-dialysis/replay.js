(function () {
  'use strict';
  const { rows, methods, plasmaAt } = globalThis.AyFluxCvvhdfReplay;
  const ns = 'http://www.w3.org/2000/svg';
  const colors = { pre: '#174c72', post: '#64427c', eff: '#965118' };
  function el(tag, attrs, label) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    if (label) node.textContent = label;
    return node;
  }

  function axes(container, title, elapsed = false) {
    const width = 432;
    const height = 228;
    const left = 40;
    const right = width - 16;
    const top = 13;
    const bottom = height - 42;
    const x = (t) => left + ((t - 1) / 7) * (right - left);
    const y = (c) => bottom - (c / 30) * (bottom - top);
    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'chart',
      role: 'img',
      'aria-label': title
    });
    svg.append(el('title', {}, title));
    for (const c of [0, 10, 20, 30]) {
      svg.append(
        el('line', {
          x1: left,
          x2: right,
          y1: y(c),
          y2: y(c),
          class: 'gridline'
        })
      );
      svg.append(el('text', { x: left - 7, y: y(c) + 4, 'text-anchor': 'end' }, String(c)));
    }
    for (const t of rows.map((row) => row[0])) {
      svg.append(
        el(
          'text',
          { x: x(t), y: bottom + 17, 'text-anchor': 'middle' },
          elapsed ? String(t - 1) : `H${t}`
        )
      );
    }
    svg.append(
      el(
        'text',
        { x: width / 2, y: height - 4, 'text-anchor': 'middle' },
        elapsed ? 'Hours after H1' : 'Published sample label'
      )
    );
    container.replaceChildren(svg);
    return { svg, x, y };
  }

  function marker(svg, x, y, color, shape, name) {
    const node =
      shape === 'square'
        ? el('rect', { x: x - 4.5, y: y - 4.5, width: 9, height: 9 })
        : shape === 'diamond'
          ? el('polygon', {
              points: `${x},${y - 5.5} ${x + 5.5},${y} ${x},${y + 5.5} ${x - 5.5},${y}`
            })
          : el('circle', { cx: x, cy: y, r: 5 });
    node.setAttribute('fill', color);
    node.setAttribute('stroke', '#fff');
    node.append(el('title', {}, name));
    svg.append(node);
  }

  function measuredChart(id, title, columns) {
    const { svg, x, y } = axes(document.getElementById(id), title);
    for (const row of rows) {
      for (const [column, label, color, shape] of columns) {
        marker(
          svg,
          x(row[0]),
          y(row[column]),
          color,
          shape,
          `H${row[0]} ${label}: ${row[column]} mg/L`
        );
      }
    }
  }
  measuredChart('plasma-chart', 'Measured pre- and post-filter plasma acyclovir in mg/L', [
    [1, 'prefilter', colors.pre, 'circle'],
    [2, 'post-filter', colors.post, 'diamond']
  ]);
  measuredChart('effluent-chart', 'Measured effluent acyclovir in mg/L', [
    [3, 'effluent', colors.eff, 'square']
  ]);
  document.getElementById('measurement-plots').hidden = false;

  const replay = document.getElementById('replay-controls');
  function render() {
    const selected = replay.querySelector('input[name="estimate"]:checked').value;
    const visible = selected === 'both' ? Object.keys(methods) : [selected];
    const { svg, x, y } = axes(
      document.getElementById('replay-chart'),
      'Modeled acyclovir decline in mg/L, with prefilter comparison points from the second sampled infusion',
      true
    );
    const times = Array.from({ length: 71 }, (_, i) => i / 10);
    const points = (ts, clearance) =>
      ts.map((t) => `${x(t + 1).toFixed(2)},${y(plasmaAt(t, clearance)).toFixed(2)}`);
    for (const key of visible) {
      const method = methods[key];
      const color = key === 'postfilter' ? colors.pre : colors.eff;
      svg.append(
        el('polygon', {
          points: [...points(times, method.low), ...points([...times].reverse(), method.high)].join(
            ' '
          ),
          fill: color,
          'fill-opacity': 0.17
        })
      );
      svg.append(
        el('polyline', {
          points: points(times, (method.low + method.high) / 2).join(' '),
          fill: 'none',
          stroke: color,
          'stroke-width': 2.4,
          ...(key === 'effluent' ? { 'stroke-dasharray': '6 4' } : {})
        })
      );
    }
    for (const row of rows.filter((entry) => [1, 4, 8].includes(entry[0]))) {
      marker(
        svg,
        x(row[0]),
        y(row[1]),
        '#172733',
        'circle',
        `H${row[0]} observed prefilter: ${row[1]} mg/L`
      );
    }
    const lines = visible.map((key) => {
      const { label, low, high } = methods[key];
      return `${label} (${key === 'effluent' ? 'dashed' : 'solid'}): ${plasmaAt(7, high).toFixed(2)}–${plasmaAt(7, low).toFixed(2)} mg/L`;
    });
    document.getElementById('replay-summary').textContent =
      `Illustrative H8 ranges: ${lines.join('; ')}. Black dots: 28, 7.03 and 3.15 mg/L observed at H1, H4 and H8.`;
  }
  replay.addEventListener('change', render);
  render();
  replay.hidden = false;
})();
