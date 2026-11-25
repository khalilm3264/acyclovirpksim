(function () {
  'use strict';
  function compareInterruptions(pk, duration) {
    if (![0, 2, 4, 8].includes(duration)) throw new RangeError('Unsupported CRRT break duration.');
    const config = {
      ...pk.DEFAULTS,
      weight: 70,
      crcl: 0,
      route: 'Acyclovir IV',
      dose: 700,
      infusion: 1,
      every: 24,
      doseCount: 1,
      horizon: 24,
      effluent: 25,
      sieving: 0.95,
      delivered: 1,
      draws: 1,
      variability: 0,
      trackMassBalance: true
    };
    const [parameters] = pk.drawParams(config);
    return [config.infusion, config.horizon - duration].map((start) => {
      const end = start + duration;
      const schedule =
        duration === 0
          ? [{ type: 'CRRT', start: 0, end: config.horizon }]
          : [
              { type: 'CRRT', start: 0, end: start },
              { type: 'CRRT', start: end, end: config.horizon }
            ].filter((row) => row.end > row.start);
      const run = pk.single(config, parameters, schedule, 1 / 16);
      return {
        start,
        end,
        hours: schedule.reduce((sum, row) => sum + row.end - row.start, 0),
        plasma: run.cols.plasma.at(-1),
        removed: run.accounting.at(-1).parts.crrt
      };
    });
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = compareInterruptions;
    return;
  }
  const select = document.getElementById('crrt-break');
  function render() {
    const duration = Number(select.value);
    const body = document.getElementById('crrt-comparison');
    body.replaceChildren();
    const [early, late] = compareInterruptions(window.RenalPKV7, duration);
    for (const scenario of [early, late]) {
      const row = body.insertRow();
      const title = row.appendChild(document.createElement('th'));
      title.scope = 'row';
      title.textContent = duration
        ? 'Off from hour ' + scenario.start + ' to ' + scenario.end
        : 'Continuous';
      for (const value of [scenario.hours, scenario.plasma.toFixed(2), scenario.removed.toFixed(1)])
        row.insertCell().textContent = value;
    }
    document.getElementById('crrt-summary').textContent = duration
      ? 'With the later break, the predicted concentration before the next dose is ' +
        Math.abs(late.plasma - early.plasma).toFixed(2) +
        ' mg/L ' +
        (late.plasma >= early.plasma ? 'higher.' : 'lower.')
      : 'Both schedules deliver 24 hours of continuous dialysis.';
  }
  select.addEventListener('change', render);
  render();
})();
