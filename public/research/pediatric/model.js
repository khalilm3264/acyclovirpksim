/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
(function (root) {
  'use strict';
  const source = '10.1128/AAC.01426-20';
  const defaults = Object.freeze({ age: 4, weight: 15, egfr: 164, dose: 10, interval: 8, infusion: 1, doses: 6 });
  function validate(c) {
    const limits = { age: [1, 18], weight: [3.1, 66], egfr: [56, 399], dose: [0, 30], interval: [4, 24], infusion: [0.25, 4], doses: [1, 12] };
    for (const [key, [min, max]] of Object.entries(limits)) {
      if (!Number.isFinite(c[key]) || c[key] < min || c[key] > max) throw new RangeError(`${key} must be between ${min} and ${max}.`);
    }
    if (!Number.isInteger(c.doses)) throw new RangeError('Number of doses must be an integer.');
    if (c.infusion > c.interval) throw new RangeError('Infusion cannot exceed the dosing interval.');
    return c;
  }
  function parameters(c) {
    validate(c);
    return { cl: 5.15 * (c.weight / 15) ** 0.75 * (c.egfr / 164) ** 0.658, v: 16.2 * c.weight / 15 };
  }
  // Exact superposition of finite infusions; concentration is continuous at dose boundaries.
  function concentration(t, c, p = parameters(c)) {
    if (!Number.isFinite(t) || t < 0) throw new RangeError('Time must be finite and nonnegative.');
    const k = p.cl / p.v, rate = c.dose * c.weight / c.infusion;
    let value = 0;
    for (let n = 0; n < c.doses; n++) {
      const elapsed = t - n * c.interval;
      if (elapsed <= 0) break;
      value += rate / p.cl * -Math.expm1(-k * Math.min(elapsed, c.infusion)) * Math.exp(-k * Math.max(0, elapsed - c.infusion));
    }
    return value;
  }
  function summary(c, p = parameters(c)) {
    const k = p.cl / p.v;
    const ssPeak = (c.dose * c.weight / c.infusion / p.cl) * -Math.expm1(-k * c.infusion) / -Math.expm1(-k * c.interval);
    return { cl: p.cl, v: p.v, halfLife: Math.LN2 / k, ssPeak, ssTrough: ssPeak * Math.exp(-k * (c.interval - c.infusion)), aucPerInterval: c.dose * c.weight / p.cl };
  }
  function normalGenerator(seed) {
    let state = seed >>> 0;
    const uniform = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + 0.5) / 4294967296; };
    return () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  }
  function quantile(sorted, q) {
    const at = (sorted.length - 1) * q, lo = Math.floor(at);
    return sorted[lo] + (sorted[Math.ceil(at)] - sorted[lo]) * (at - lo);
  }
  function simulate(c, count = 1000, seed = 20261109) {
    const p = parameters(c);
    if (!Number.isInteger(count) || count < 10 || count > 2000) throw new RangeError('Ensemble size must be 10–2000.');
    const normal = normalGenerator(seed);
    // Table 2 IIV interpreted as log-scale SD (omega); zero covariance is an explicit assumption.
    const population = Array.from({ length: count }, () => ({ cl: p.cl * Math.exp(0.389 * normal()), v: p.v * Math.exp(0.434 * normal()) }));
    const end = c.doses * c.interval;
    const times = new Set(Array.from({ length: 241 }, (_, i) => end * i / 240));
    for (let n = 0; n < c.doses; n++) { times.add(n * c.interval); times.add(n * c.interval + c.infusion); }
    return [...times].sort((a, b) => a - b).map(time => {
      const values = population.map(individual => concentration(time, c, individual)).sort((a, b) => a - b);
      return { time, typical: concentration(time, c, p), p05: quantile(values, 0.05), p50: quantile(values, 0.5), p95: quantile(values, 0.95) };
    });
  }
  const api = { source, defaults, validate, parameters, concentration, summary, simulate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AyFluxPediatric = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
