'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../public/research/pediatric/model.js');
const base = { ...m.defaults };
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} vs ${b}`);

test('published Table 2 reference values and weight scaling', () => {
  const p = m.parameters(base); near(p.cl, 5.15); near(p.v, 16.2);
  near(m.parameters({ ...base, weight: 30 }).cl / p.cl, 2 ** 0.75);
  near(m.parameters({ ...base, weight: 30 }).v / p.v, 2);
  assert.deepEqual(m.parameters({ ...base, age: 18 }), p);
});
test('analytical solution agrees with independent amount-state RK4 integration', () => {
  for (const cfg of [base, { ...base, weight: 3.1, egfr: 56, interval: 4, infusion: 0.25 }, { ...base, weight: 66, egfr: 399, infusion: 4 }]) {
    const p = m.parameters(cfg), dt = 0.005;
    let amount = 0;
    for (let step = 0; step < cfg.interval * cfg.doses / dt; step++) {
      const time = step * dt;
      // Determine constant input on this interval, avoiding the right-boundary discontinuity.
      const phase = (time + dt / 2) % cfg.interval;
      const rate = phase < cfg.infusion ? cfg.dose * cfg.weight / cfg.infusion : 0;
      const derivative = a => rate - p.cl / p.v * a;
      const k1 = derivative(amount), k2 = derivative(amount + dt * k1 / 2), k3 = derivative(amount + dt * k2 / 2), k4 = derivative(amount + dt * k3);
      amount += dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
      if (step % 50 === 49) near(amount / p.v, m.concentration((step + 1) * dt, cfg, p), 1e-7);
    }
  }
});
test('dose boundaries are continuous; zero dose is zero; dose response is linear', () => {
  const p = m.parameters(base);
  for (const t of [1, 8, 9, 16]) near(m.concentration(t - 1e-9, base, p), m.concentration(t + 1e-9, base, p), 1e-7);
  near(m.concentration(4, { ...base, dose: 20 }), 2 * m.concentration(4, base));
  assert.ok(m.simulate({ ...base, dose: 0 }, 10).every(r => r.typical === 0 && r.p95 === 0));
});
test('integrated single-dose exposure obeys dose / clearance mass balance', () => {
  const c = { ...base, doses: 1 }, p = m.parameters(c), dt = 0.002;
  let auc = 0;
  for (let t = 0; t < 150; t += dt) auc += (m.concentration(t, c, p) + m.concentration(t + dt, c, p)) * dt / 2;
  near(auc, c.dose * c.weight / p.cl, 1e-5);
});
test('higher eGFR reduces exposure; steady-state agrees with long-course superposition', () => {
  assert.ok(m.summary({ ...base, egfr: 300 }).aucPerInterval < m.summary(base).aucPerInterval);
  const s = m.summary(base), c = { ...base, doses: 12 };
  near(m.concentration(11 * c.interval + c.infusion, c), s.ssPeak, 1e-8);
  near(m.concentration(12 * c.interval, c), s.ssTrough, 1e-8);
});
test('out-of-domain and nonfinite inputs are rejected', () => {
  for (const [key, value] of [['age', 0.5], ['egfr', 0], ['egfr', 400], ['weight', 3], ['dose', -1], ['infusion', 0], ['doses', 2.5], ['interval', NaN]]) assert.throws(() => m.parameters({ ...base, [key]: value }), RangeError);
});
test('fixed-seed ensemble is reproducible, nonnegative and ordered', () => {
  const a = m.simulate(base, 50), b = m.simulate(base, 50);
  assert.deepEqual(a, b);
  assert.ok(a.every(r => r.p05 >= 0 && r.p05 <= r.p50 && r.p50 <= r.p95));
  for (let n = 0; n < base.doses; n++) assert.ok(a.some(r => r.time === n * base.interval + base.infusion));
});
