/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../../assets/pk-engine.js'));
  } else {
    root.OncologyStudy = factory(root.RenalPKV7);
  }
})(globalThis, (engine) => {
  'use strict';

  const interval = 8;
  const doses = 7;
  const lastDose = interval * (doses - 1);
  const acyclovirMgPerMicromole = 0.22521;
  const valacyclovirMgPerMicromole = 0.32434;
  const transitRate = 1.636;

  // Höglund et al., doi:10.1093/jac/47.6.855. Arithmetic mean and SD.
  const published = {
    oral: { auc: [76.3, 29.7], peak: [26.6, 10.5], peakHour: [2.01, 0.65] },
    iv: { auc: [64.2, 20.0], peak: [34.0, 11.9], peakHour: [0.95, 0.19] }
  };

  function simulate(config, useTransit, step) {
    const params = engine.drawParams(config)[0];
    const schedule = engine.buildDoses(config);
    const events = engine.prepareEvents(config, [], step, schedule);

    if (useTransit) {
      // Two equal first-order stages yield this fraction remaining upstream of central.
      const remaining = (age) => {
        const elapsed = Math.max(0, age) * transitRate;
        return (1 + elapsed) * Math.exp(-elapsed);
      };

      // Feed the released mass into the existing central compartment over each step.
      // Clear the native oral depot input to avoid counting the dose twice.
      events.oralDose.fill(0);
      events.ivRate = events.ivRate.map((_, i) => {
        const start = events.tarr[i];
        const end = events.tarr[i + 1];
        const released = schedule.reduce((sum, dose) => {
          const fraction = remaining(start - dose.time) - remaining(end - dose.time);
          return sum + dose.amount * fraction;
        }, 0);
        return (
          (released * params.oralF * acyclovirMgPerMicromole) /
          (valacyclovirMgPerMicromole * (end - start))
        );
      });
    }

    const result = engine.single(config, params, [], step, schedule, events);
    const first = result.t.indexOf(lastDose);
    const points = result.t
      .slice(first)
      .map((time, i) => [time - lastDose, result.cols.plasma[first + i] / acyclovirMgPerMicromole]);
    let auc = 0;
    let [peakHour, peak] = points[0];
    for (let i = 1; i < points.length; i++) {
      const [time, concentration] = points[i];
      const [previousTime, previousConcentration] = points[i - 1];
      auc += ((concentration + previousConcentration) / 2) * (time - previousTime);
      if (concentration > peak) {
        peak = concentration;
        peakHour = time;
      }
    }
    return { points, auc, peak, peakHour };
  }

  function compare(weight, crcl, step = 1 / 64) {
    const common = {
      ...engine.DEFAULTS,
      weight,
      crcl,
      crclSource: 'manual',
      renalMode: 'constant',
      dosingMode: 'repeat',
      doseCount: doses,
      every: interval,
      horizon: lastDose + interval,
      draws: 1,
      variability: 0
    };
    const oral = { ...common, route: 'Valacyclovir oral', dose: 1000 };
    const iv = { ...common, route: 'Acyclovir IV', dose: 5 * weight, infusion: 1 };
    return {
      oral: simulate(oral, false, step),
      transit: simulate(oral, true, step),
      iv: simulate(iv, false, step)
    };
  }

  return { compare, published };
});
