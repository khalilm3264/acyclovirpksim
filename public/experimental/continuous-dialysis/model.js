(function (root) {
  'use strict';
  const rows = Object.freeze(
    [
      [1, 28, 20.9, 15.6, 19.2, 27.6],
      [2, 10.93, 8.26, 9.34, 19.8, 42],
      [4, 7.03, 5.26, 5.34, 21.8, 37.9],
      [5, 4.87, 3.59, 4.37, 24.6, 44.1],
      [7, 2.65, 2.03, 2.17, 26.3, 40.3],
      [8, 3.15, 2.51, 2.8, 21.2, 44.3]
    ].map(Object.freeze)
  );

  const methods = Object.freeze({
    postfilter: Object.freeze({
      label: 'Post-filter method',
      low: 19.2,
      high: 26.3
    }),
    effluent: Object.freeze({
      label: 'Effluent method',
      low: 27.6,
      high: 44.3
    })
  });
  const volumeL = (16.2 * 10) / 15; // Abdalla Table 2 volume, scaled to 10 kg.
  const endogenousMlMin = (25.9 + 33) / 2; // Fixed midpoint of case estimate.
  const anchorMgL = rows[0][1];
  function plasmaAt(hoursAfterH1, filterMlMin) {
    const clearanceLh = (filterMlMin + endogenousMlMin) * 0.06;
    return anchorMgL * Math.exp((-clearanceLh / volumeL) * hoursAfterH1);
  }
  const api = Object.freeze({
    rows,
    methods,
    volumeL,
    endogenousMlMin,
    anchorMgL,
    plasmaAt
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AyFluxCvvhdfReplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
