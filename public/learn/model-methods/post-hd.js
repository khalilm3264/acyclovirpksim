// One-hour plasma acyclovir forecast conditioned on two measurements.
(function () {
  'use strict';
  function forecast(pk, { weight, hours, before, end }) {
    if (![weight, hours, before, end].every((x) => Number.isFinite(x) && x > 0)) {
      throw new RangeError('Enter a positive weight, duration and two quantified concentrations.');
    }
    const [p] = pk.drawParams({ ...pk.DEFAULTS, weight, crcl: 0, variability: 0, draws: 1 });
    const exchange = p.q / p.vp;
    // Solve dT/dt = exchange * (plasma - T) over HD. Plasma follows the
    // log-linear interpolant through the measurements, and T(0) = plasma(0).
    const exponent = Math.log(end) - Math.log(before) + exchange * hours;
    const retained = before * Math.exp(-exchange * hours);
    const integrated =
      Math.abs(exponent) < 1e-6 ? retained * (1 + exponent / 2) : (end - retained) / exponent;
    const tissue = retained + exchange * hours * integrated;
    // Exact central concentration after one hour off HD (two exponential modes).
    const loss = (p.other + p.form + p.renal) / p.vc;
    const outward = p.q / p.vc;
    const sum = loss + outward + exchange;
    const gap = Math.sqrt(sum * sum - 4 * loss * exchange);
    const fast = (sum + gap) / 2;
    const slow = (loss * exchange) / fast;
    const slope = outward * (tissue - end) - loss * end;
    const concentration =
      end * Math.exp(-fast) + ((slope + fast * end) * Math.exp(-slow) * -Math.expm1(-gap)) / gap;
    if (!Number.isFinite(concentration) || concentration <= 0) {
      throw new RangeError('These inputs exceed the numerical range of this calculation.');
    }
    return concentration;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = forecast;
    return;
  }
  const form = document.getElementById('hd-forecast');
  const comparison = document.getElementById('hd-compare');
  const result = document.getElementById('hd-result');
  const errors = document.getElementById('hd-errors');
  const fmt = (n) => Number(n.toPrecision(4)).toString();
  let saved;
  function reset() {
    saved = null;
    result.textContent = '';
    comparison.hidden = true;
    comparison.reset();
    errors.textContent = '';
  }
  form.addEventListener('input', reset);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    reset();
    const inputs = Object.fromEntries(
      [...new FormData(form)].map(([name, value]) => [name, Number(value)])
    );
    try {
      const estimate = forecast(window.RenalPKV7, inputs);
      saved = { estimate, baseline: inputs.end };
      result.textContent =
        'One-hour forecast: ' +
        fmt(estimate) +
        ' µmol/L. Carry-forward: ' +
        fmt(inputs.end) +
        ' µmol/L.';
      comparison.hidden = false;
    } catch (error) {
      result.textContent = error.message;
    }
  });
  comparison.addEventListener('input', () => {
    errors.textContent = '';
  });
  comparison.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!saved) return;
    const observed = comparison.elements.observed.valueAsNumber;
    errors.textContent =
      'Absolute error at one hour: ' +
      fmt(Math.abs(saved.estimate - observed)) +
      ' µmol/L for the forecast and ' +
      fmt(Math.abs(saved.baseline - observed)) +
      ' µmol/L for carry-forward.';
  });
})();
