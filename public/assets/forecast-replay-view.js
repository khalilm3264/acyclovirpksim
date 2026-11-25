/* SPDX-License-Identifier: AGPL-3.0-only */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const bridge = window.AyFluxResearchBridge;
  const start = $('runForecastReplay');
  const download = $('downloadForecastReplay');
  const status = $('forecastReplayStatus');
  const results = $('forecastReplayResults');
  const body = $('forecastReplayRows');
  const labels = {
    plasma: 'Plasma acyclovir',
    csf: 'CSF acyclovir',
    cmmg: 'Plasma CMMG',
    csfCmmg: 'CSF CMMG'
  };
  let completed = null;

  function key(snapshot) {
    const { forecastCutoff, ...config } = snapshot.config;
    return JSON.stringify([snapshot.primary, config]);
  }

  function reset(message) {
    completed = null;
    status.textContent = message;
    results.hidden = true;
    download.hidden = true;
    body.replaceChildren();
  }

  function render(rows) {
    const number = (value) => value.toFixed(2);
    const interval = ({ median, lower, upper }) =>
      `${number(median)} (${number(lower)}–${number(upper)})`;
    let better = 0;
    let worse = 0;
    for (const row of rows) {
      const tr = body.insertRow();
      for (const value of [
        row.cutoff,
        row.time,
        labels[row.analyte],
        row.fitted,
        number(row.observed),
        interval(row.population),
        interval(row.updated),
        number(row.improvement)
      ])
        tr.insertCell().textContent = value;
      if (row.improvement >= 0.005) better++;
      if (row.improvement <= -0.005) worse++;
    }
    status.textContent = `Smaller error for ${better}, larger error for ${worse}, and no difference at 0.01 mg/L precision for ${rows.length - better - worse} of ${rows.length} forecast targets. Positive values indicate smaller error.`;
    results.hidden = false;
    download.hidden = false;
  }

  start.addEventListener('click', () => {
    const snapshot = bridge.snapshot();
    if (!snapshot.updated) {
      reset('Run a successful simulation with the current settings first.');
      return;
    }
    if (new Set(snapshot.config.observations.map(({ time }) => time)).size < 2) {
      reset('Apply measurements at two or more different times to run the replay.');
      return;
    }
    const configKey = key(snapshot);
    reset('Running forecast replay…');
    start.disabled = true;
    let worker;
    function finish() {
      worker?.terminate();
      start.disabled = false;
    }
    try {
      worker = new Worker('/assets/research-worker.js');
      worker.onmessage = ({ data }) => {
        finish();
        const current = bridge.snapshot();
        if (!current.updated || key(current) !== configKey) {
          reset('Settings changed. Run the replay again.');
        } else if (data.error) {
          reset('Replay could not run. ' + data.error);
        } else {
          completed = { key: configKey, mode: snapshot.primary, rows: data.data };
          render(completed.rows);
        }
      };
      worker.onerror = () => {
        finish();
        reset('Replay could not run. Reload and try again.');
      };
      worker.postMessage({
        id: 1,
        action: 'forecast-replay',
        config: snapshot.config,
        mode: snapshot.primary
      });
    } catch {
      finish();
      reset('Replay could not run. Reload and try again.');
    }
  });

  window.addEventListener('ayflux:results-updated', () => {
    if (completed && key(bridge.snapshot()) !== completed.key)
      reset('Settings changed. Run the replay again.');
  });
  download.addEventListener('click', () => {
    const current = bridge.snapshot();
    if (!completed || !current.updated || key(current) !== completed.key) {
      reset('Settings changed. Run the replay again.');
      return;
    }
    const csv = [
      'scenario,cutoff_h,target_h,analyte,fit_rows,effective_sample_size,observed_mg_l,population_median_mg_l,population_lower90_mg_l,population_upper90_mg_l,updated_median_mg_l,updated_lower90_mg_l,updated_upper90_mg_l,absolute_error_reduction_mg_l',
      ...completed.rows.map((row) =>
        [
          completed.mode,
          row.cutoff,
          row.time,
          row.analyte,
          row.fitted,
          row.ess,
          row.observed,
          row.population.median,
          row.population.lower,
          row.population.upper,
          row.updated.median,
          row.updated.lower,
          row.updated.upper,
          row.improvement
        ].join(',')
      )
    ];
    const url = URL.createObjectURL(new Blob([csv.join('\n') + '\n'], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ayflux-forecast-replay.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
