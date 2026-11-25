(function (root) {
  'use strict';
  const weight = 59.5;
  const impaired = 8.5;
  const estimatedBaseline = ((140 - 77) * weight * 0.85) / (72 * (96 / 88.4));
  // Figure 1 rendered at 240 dpi, with crop origin (100, 140).
  const anchors = { x0: 209, x14: 778, y300: 398, y003: 606 };
  const stars = [
    [303, 403],
    [373, 430],
    [453, 454],
    [477, 470],
    [497, 498],
    [537, 531],
    [745, 585]
  ];
  const observations = stars.map(([x, y], i) => ({
    day: ((x - anchors.x0) * 14) / (anchors.x14 - anchors.x0),
    concentration: i
      ? 300 * 10 ** ((4 * (anchors.y300 - y)) / (anchors.y003 - anchors.y300))
      : 229.9
  }));
  const timeZero = observations[0].day;
  const scale = (weight / 70) ** 0.75;
  const vc = 0.32 * weight;
  const vp = 0.37 * weight;
  const q = 10 * scale;
  function crcl(day, scenario) {
    if (scenario === 'fixed') return impaired;
    const start = scenario === 'earlier' ? 3 : 4;
    const end = scenario === 'earlier' ? 10 : 12;
    const fraction = Math.max(0, Math.min(1, (day - start) / (end - start)));
    return impaired + fraction * (estimatedBaseline - impaired);
  }
  function replay(scenario, end = 14, maxStep = 0.0025) {
    const concentration = observations[0].concentration;
    const n = Math.ceil((end - timeZero) / maxStep);
    const h = (end - timeZero) / n;
    let a = concentration * vc;
    let b = concentration * vp;
    const curve = [{ day: timeZero, concentration }];
    function rates(day, A, B) {
      const central = A / vc;
      const exchange = q * (central - B / vp);
      const cl = (1.72 + 0.202 * crcl(day, scenario)) * scale;
      return [24 * (-cl * central - exchange), 24 * exchange];
    }
    for (let i = 0; i < n; i++) {
      const day = timeZero + i * h;
      const k1 = rates(day, a, b);
      const k2 = rates(day + h / 2, a + (h * k1[0]) / 2, b + (h * k1[1]) / 2);
      const k3 = rates(day + h / 2, a + (h * k2[0]) / 2, b + (h * k2[1]) / 2);
      const k4 = rates(day + h, a + h * k3[0], b + h * k3[1]);
      a += (h * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6;
      b += (h * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6;
      curve.push({ day: day + h, concentration: a / vc });
    }
    return curve;
  }
  const api = {
    observations,
    timeZero,
    impaired,
    estimatedBaseline,
    crcl,
    replay
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AyFluxAkiRecovery = api;
})(globalThis);
