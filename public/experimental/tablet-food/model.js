(function (root) {
  'use strict';

  const parameters = Object.freeze({
    doseMg: 800,
    bioavailability: 0.15,
    volumeL: 30,
    clearanceLh: 24,
    referenceKa: 2,
    slowKa: 0.5
  });

  const absorbed = parameters.doseMg * parameters.bioavailability;
  const ke = parameters.clearanceLh / parameters.volumeL;
  const scale = absorbed / parameters.volumeL;

  function concentration(timeH, ka) {
    if (timeH <= 0) return 0;
    if (Math.abs(ka - ke) < 1e-9) return scale * ke * timeH * Math.exp(-ke * timeH);
    return scale * (ka / (ka - ke)) * (Math.exp(-ke * timeH) - Math.exp(-ka * timeH));
  }

  function endpoints(ka) {
    const tmax = Math.abs(ka - ke) < 1e-9 ? 1 / ke : Math.log(ka / ke) / (ka - ke);
    return {
      tmax,
      cmax: concentration(tmax, ka),
      aucInfinity: absorbed / parameters.clearanceLh
    };
  }

  const api = Object.freeze({ parameters, concentration, endpoints });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AyFluxTabletFood = api;
})(globalThis);
