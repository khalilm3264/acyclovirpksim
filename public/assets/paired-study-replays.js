/* SPDX-License-Identifier: AGPL-3.0-only */
(function (root) {
  'use strict';
  const commonJs = typeof module === 'object' && module.exports;
  const pk = commonJs ? require('./pk-engine.js') : root.RenalPKV7;
  const studies = commonJs ? require('./study-library.js') : root.AyFluxStudies;
  const literature = commonJs ? require('./literature-cases.js') : root.AyFluxLiterature;
  const renalMultiplier = 0.75;
  const evidence = {
    means: 'Published group mean',
    individual: 'Individual assay',
    fitted: 'Author-fitted value'
  };
  const analytes = {
    plasma: ['Acyclovir', 'Plasma'],
    cmmg: ['CMMG', 'Plasma'],
    csfCmmg: ['CMMG', 'CSF']
  };
  const phases = {
    peak: 'Peak',
    trough: 'Predose trough',
    'post-infusion': 'Post-infusion',
    serial: 'Serial sample'
  };
  const caseIds = ['laskin-normal', 'laskin-anuric', 'kacirova', 'smith-ckd', 'boelaert-4'];
  const sources = {
    'laskin-normal': 'https://doi.org/10.1128/AAC.21.5.804',
    'laskin-anuric': 'https://doi.org/10.1038/clpt.1982.83',
    kacirova: 'https://www.klinickafarmakologie.cz/incpdfs/far-202204-0002_10_001.pdf',
    'boelaert-4': 'https://doi.org/10.1093/jac/20.1.69'
  };

  function getCases() {
    const smith = literature.cases().find((study) => study.id === 'smith-ckd');
    return caseIds.map((id) => {
      if (id === smith.id)
        return { id, label: smith.label, url: 'https://doi.org/' + smith.doi, smith };
      const study = studies.find(id);
      return { id, label: study.short, url: sources[id], study };
    });
  }

  // A bound only tells us which side of the limit the observation falls on.
  function errorFor(prediction, reference) {
    if (reference.upperBound)
      return { compatible: prediction < reference.value, signed: null, absolute: null };
    const signed = prediction - reference.value;
    return { signed, absolute: Math.abs(signed) };
  }

  function auc(run, key, [start, end]) {
    let area = 0;
    let lastTime = start;
    let lastValue = studies.interp(run.t, run.cols[key], start);
    const values = run.cols[key];
    run.t.forEach((time, index) => {
      if (time <= start || time >= end) return;
      const value = values[index];
      area += ((time - lastTime) * (lastValue + value)) / 2;
      lastTime = time;
      lastValue = value;
    });
    return area + ((end - lastTime) * (lastValue + studies.interp(run.t, run.cols[key], end))) / 2;
  }

  function recoveryFor(run, doses, [start, end]) {
    const mass = run.drains
      .filter((drain) => drain.complete && drain.end > start && drain.end <= end)
      .reduce((sum, drain) => sum + drain.mass, 0);
    const dose = doses
      .filter((dose) => dose.time >= start && dose.time < end)
      .reduce((sum, dose) => sum + dose.amount, 0);
    return { mass, dose, percent: (100 * mass) / dose };
  }

  function compare(id) {
    const selected = getCases().find((item) => item.id === id);
    if (!selected) throw Error('Unknown study replay.');
    const { study, smith, label, url } = selected;
    const capd = id === 'boelaert-4';
    const config = pk.effectiveConfig({
      ...(smith ? smith.config : studies.configFor(study, pk)),
      draws: 1,
      variability: 0,
      trackMassBalance: capd
    });
    const mode = (smith || study).mode;
    const errors = pk.validate(config, mode);
    if (errors.length) throw Error(errors.join('; '));

    const schedule = pk.scheduleFor(mode, config);
    const doses = pk.buildDoses(config);
    const step = 0.125;
    const timeline = pk.prepareEvents(config, schedule, step, doses);
    const baseParams = pk.drawParams(config)[0];
    const change = smith
      ? { name: 'CMMG CSF partition coefficient', key: 'km', value: smith.alternative }
      : {
          name: 'Parent acyclovir renal clearance (L/h)',
          key: 'renal',
          value: baseParams.renal * renalMultiplier
        };
    const simulate = (params) => pk.single(config, params, schedule, step, doses, timeline);
    const baseline = simulate(baseParams);
    const variant = simulate({ ...baseParams, [change.key]: change.value });
    const references = smith
      ? [
          // Smith 2010 Table 1. Systemic value copied from the source-specific
          // smith-systemic-exposure runner (148 µmol·h/L, converted to mass units).
          {
            analyte: 'cmmg',
            specimen: 'Serum',
            window: smith.interval,
            value: (148 * 239.19) / 1000
          },
          { analyte: 'csfCmmg', window: smith.interval, value: smith.observedAuc }
        ]
      : studies.pointsOf(study).map((point) => ({
          analyte: point.analyte,
          specimen: id === 'kacirova' ? 'Serum' : 'Plasma',
          time: point.time,
          kind: point.kind,
          value: point.observed
        }));
    const rows = references.map((reference) => {
      const [analyte, modelSpecimen] = analytes[reference.analyte];
      const measure = (run) =>
        reference.window
          ? auc(run, reference.analyte, reference.window)
          : studies.interp(run.t, run.cols[reference.analyte], reference.time);
      const a = measure(baseline);
      const b = measure(variant);
      return {
        ...reference,
        analyte,
        specimen: reference.specimen || modelSpecimen,
        modelSpecimen,
        phase: reference.window ? 'Fifth dose interval AUC' : phases[reference.kind],
        unit: reference.window ? 'mg·h/L' : 'mg/L',
        evidence: smith ? evidence.means : evidence[studies.evidenceKind(study)],
        baseline: a,
        variant: b,
        baselineError: errorFor(a, reference),
        variantError: errorFor(b, reference)
      };
    });

    const recovery = capd
      ? [
          [96, 120],
          [0, 120]
        ].map((window) => ({
          window,
          baseline: recoveryFor(baseline, doses, window),
          variant: recoveryFor(variant, doses, window)
        }))
      : null;
    return {
      label,
      url,
      note: (smith || study).note,
      change: {
        name: change.name,
        baseline: baseParams[change.key],
        variant: change.value,
        label: smith ? 'Previous coefficient' : 'Renal multiplier ×0.75'
      },
      rows,
      recovery
    };
  }

  if (commonJs) {
    module.exports = { compare, errorFor };
    return;
  }

  const element = (id) => root.document.getElementById(id);
  const selector = element('pairedReplayCase');
  if (!selector) return;
  for (const { id, label } of getCases()) selector.add(new Option(label, id));

  const number = (value) => Number(value.toPrecision(4)).toString();
  const signed = (value) => (value > 0 ? '+' : '') + number(value);
  const formatError = (error) =>
    error.signed === null
      ? error.compatible
        ? 'Below bound'
        : 'At or above bound'
      : signed(error.signed) + ' / ' + number(error.absolute);
  function direction(row) {
    if (row.upperBound)
      return row.baselineError.compatible === row.variantError.compatible
        ? 'Same bound result'
        : row.variantError.compatible
          ? 'Within bound'
          : 'Outside bound';
    const difference = row.variantError.absolute - row.baselineError.absolute;
    if (Math.abs(difference) < 1e-10) return 'Same';
    return difference < 0 ? 'Closer' : 'Farther';
  }
  function addRow(body, values) {
    const tr = body.insertRow();
    const heading = root.document.createElement('th');
    heading.scope = 'row';
    heading.textContent = values[0];
    tr.append(heading);
    for (const value of values.slice(1)) tr.insertCell().textContent = value;
  }
  element('runPairedReplay').addEventListener('click', () => {
    const status = element('pairedReplayStatus');
    const results = element('pairedReplayResults');
    results.hidden = true;
    try {
      const { label, url, note, change, rows, recovery } = compare(selector.value);
      const source = element('pairedReplaySource');
      source.href = url;
      source.textContent = label + ' source';
      element('pairedReplayNote').textContent = note;
      const body = element('pairedReplayRows');
      body.replaceChildren();
      for (const row of rows)
        addRow(body, [
          row.analyte +
            ' · ' +
            row.specimen +
            (row.specimen === row.modelSpecimen
              ? ''
              : ' (model: ' + row.modelSpecimen.toLowerCase() + ')'),
          (row.window ? row.window.join('–') : number(row.time)) + ' h · ' + row.phase,
          row.evidence,
          (row.upperBound ? '<' : '') + number(row.value) + ' ' + row.unit,
          number(row.baseline),
          number(row.variant),
          formatError(row.baselineError),
          formatError(row.variantError),
          direction(row)
        ]);

      const recoveryBlock = element('pairedRecovery');
      recoveryBlock.hidden = !recovery;
      if (recovery) {
        const format = ({ mass, dose, percent }) =>
          number(mass) + ' mg / ' + number(dose) + ' mg (' + number(percent) + '%)';
        const recoveryRows = element('pairedRecoveryRows');
        recoveryRows.replaceChildren();
        for (const row of recovery)
          addRow(recoveryRows, [
            row.window.join('–') + ' h',
            format(row.baseline),
            format(row.variant)
          ]);
      }

      status.textContent =
        change.name +
        ' · baseline ' +
        number(change.baseline) +
        ' · variant ' +
        number(change.variant) +
        ' (' +
        change.label +
        ').';
      results.hidden = false;
    } catch (error) {
      status.textContent = 'Comparison unavailable. ' + error.message;
    }
  });
  selector.addEventListener('change', () => {
    element('pairedReplayResults').hidden = true;
    element('pairedReplayStatus').textContent = '';
  });
})(typeof self !== 'undefined' ? self : globalThis);
