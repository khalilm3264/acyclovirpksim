(function () {
  // Single-dose adult valacyclovir comparison. Run with Node to reproduce the Weller fits.
  // Disposition from drawParams at 8fc1c9d with variability zero. Amounts in mg.
  'use strict';
  const weller = {
    name: 'Weller · Development',
    times: [0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 6, 8],
    observed: [1, 1.92, 2.64, 2.95, 2.42, 1.97, 1.58, 1.13, 0.61, 0.35],
    vc: 23.872,
    vp: 27.602,
    q: 10.48891559414876,
    cl: 18.599621757544757
  };
  const phan = {
    times: [0, 0.5, 1, 2, 4, 8, 12],
    vc: 19.84,
    vp: 22.94,
    q: 9.129988638945196,
    cl: 20.935063949101334
  };
  const studies = [
    weller,
    { ...phan, name: 'Phan Figure 3, visit 2 · Held out', observed: [0, 1.336, 2.728, 2.296, 0.836, 0.252, 0.1] },
    { ...phan, name: 'Phan Figure 4, visit 1 · Held out', observed: [0, 1.19, 2.794, 2.168, 0.809, 0.225, 0.071] }
  ];
  const amount = ((500 * 225.21) / 324.34) * 0.545;
  // Convolve the two-compartment IV impulse response with first-order or Erlang-2 input.
  function concentration(s, time, stages, rate, lag = 0) {
    const t = time - lag;
    if (t <= 0) return 0;
    const k21 = s.q / s.vp;
    const sum = (s.q + s.cl) / s.vc + k21;
    const alpha = (sum + Math.sqrt(sum * sum - (4 * k21 * s.cl) / s.vc)) / 2;
    const beta = (k21 * s.cl) / s.vc / alpha;
    const fast = (alpha - k21) / (alpha - beta);
    function component(decay) {
      const z = (rate - decay) * t;
      const normalization = stages === 1 ? rate * t : (rate * t) ** 2;
      let integral;
      if (Math.abs(z) < 1e-4)
        integral = 1 / stages - z / (stages + 1) + (z * z) / (2 * (stages + 2));
      else if (stages === 1) integral = -Math.expm1(-z) / z;
      else integral = (-Math.expm1(-z) - z * Math.exp(-z)) / (z * z);
      return normalization * Math.exp(-decay * t) * integral;
    }
    return (amount / s.vc) * (fast * component(alpha) + (1 - fast) * component(beta));
  }
  function fit(stages) {
    // Search in increments of 0.001 using only the ten resolved Weller markers.
    let best = { ssr: Infinity };
    const upper = stages === 1 ? 1000 : 5000;
    for (let i = 1; i <= upper; i++) {
      const value = i / 1000;
      const rate = stages === 1 ? 1.8 : value;
      const lag = stages === 1 ? value : 0;
      const ssr = weller.times.reduce(
        (total, t, j) =>
          total + (concentration(weller, t, stages, rate, lag) - weller.observed[j]) ** 2,
        0
      );
      if (ssr < best.ssr) best = { value, ssr };
    }
    return best;
  }
  const api = { studies, amount, concentration, fit };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (require.main === module) console.log({ lag: fit(1), transit: fit(2) });
  } else window.oralComparison = api;
})();
