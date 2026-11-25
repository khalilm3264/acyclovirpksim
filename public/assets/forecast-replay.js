/* SPDX-License-Identifier: AGPL-3.0-only */
(function (root) {
  'use strict';

  function run(engine, config, mode) {
    const times = [...new Set((config.observations || []).map(({ time }) => time))]
      .filter((time) => Number.isFinite(time) && time >= 0 && time <= config.horizon)
      .sort((a, b) => a - b);
    const simulate = engine.createSimulator();
    const replayConfig = { ...config, fitMode: mode, requestedModes: [mode] };
    return times.slice(0, -1).flatMap((cutoff) => {
      const { forecast } = simulate({ ...replayConfig, forecastCutoff: cutoff })._validation;
      return forecast.targets.map(({ population, updated, ...target }) => ({
        ...target,
        cutoff,
        fitted: forecast.fitted,
        ess: forecast.ess,
        population,
        updated,
        improvement:
          Math.abs(population.median - target.observed) - Math.abs(updated.median - target.observed)
      }));
    });
  }

  const api = { run };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AyFluxForecastReplay = api;
})(globalThis);
