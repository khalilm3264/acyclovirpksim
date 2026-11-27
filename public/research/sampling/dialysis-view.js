'use strict';

async function showDialysisSampling() {
  const response = await fetch('dialysis-data.json');
  if (!response.ok) throw new Error('Data unavailable');
  const { trials, scenarios } = await response.json();
  const selector = document.querySelector('#dialysis-mode');
  const status = document.querySelector('#dialysis-sampling-status');
  const rows = document.querySelector('#dialysis-sampling-rows');
  const note = document.querySelector('#dialysis-parameter-note');

  function render() {
    const scenario = scenarios.find(({ id }) => id === selector.value);
    rows.replaceChildren();
    for (const design of scenario.designs) {
      const row = rows.insertRow();
      const label = document.createElement('th');
      label.scope = 'row';
      label.textContent = design.label;
      row.append(label);
      for (const value of [
        design.times.join(', '),
        design.medianError.toFixed(2),
        design.medianWidth.toFixed(2),
        design.covered + ' / ' + trials
      ]) {
        row.insertCell().textContent = value;
      }
    }
    const [baseline] = scenario.designs;
    const boundary = scenario.designs.find(({ times }) => times.includes(scenario.boundary));
    status.textContent = scenario.boundaryLabel + ' at hour ' + scenario.boundary + '.';
    note.textContent =
      'With the dialysis-timed sample, the median 90% width of the systemic multiplier was ' +
      boundary.systemicWidth.toFixed(2) + ' (first trough alone: ' + baseline.systemicWidth.toFixed(2) +
      '). The dialysis multiplier width was ' + boundary.dialysisWidth.toFixed(2) +
      ' (first trough alone: ' + baseline.dialysisWidth.toFixed(2) + ').';
  }

  selector.addEventListener('change', render);
  render();
  document.querySelector('#dialysis-sampling-results').hidden = false;
}

showDialysisSampling().catch(() => {
  document.querySelector('#dialysis-sampling-status').textContent =
    'The dialysis sampling results could not be loaded. Refresh to retry.';
});
