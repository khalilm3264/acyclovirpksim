'use strict';
const fs = require('node:fs');
const path = require('node:path');
const pk = require('../../public/assets/pk-engine.js');

const firstTrough = 24;
const heldOutTime = 72;
const drawsPerProfile = 24;
const seed = 20261120;
const gridScales = Array.from({ length: 13 }, (_, i) => 0.5 + i * 0.125);
const profiles = [
  { systemic: 0.82, dialysis: 1.38 },
  { systemic: 1.18, dialysis: 0.72 },
  { systemic: 1.04, dialysis: 0.98 }
];
const config = {
  ...pk.DEFAULTS, dose: 175, every: 24, infusion: 1, doseCount: 3, horizon: heldOutTime,
  weight: 70, crcl: 0, draws: 1, variability: 0, assayCV: 0.05,
  hdStart: 28, hdDuration: 4, hdRepeat: 24,
  pdRxEnabled: true,
  pdRxRows: [[0, 4], [4, 4], [8, 4], [12, 12]].map(([start, dwell]) => ({
    sessionStart: null, start, dwell, fill: 2, glucose: 1.36, uf: null
  }))
};
const modes = [
  { id: 'hd', label: 'Intermittent hemodialysis', mode: 'Intermittent HD', boundary: 32, boundaryLabel: 'End of HD' },
  { id: 'capd', label: 'Continuous ambulatory peritoneal dialysis', mode: 'Peritoneal dialysis', boundary: 36, boundaryLabel: 'At a CAPD exchange boundary' }
];

function run(dt = 0.125) {
  let state = seed;
  function uniform() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  }
  const normal = () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  const trials = profiles.length * drawsPerProfile;
  const scenarios = modes.map(({ id, label, mode, boundary, boundaryLabel }) => {
    const errors = pk.validate(config, mode);
    if (errors.length) throw new Error(errors.join('; '));
    const schedule = pk.scheduleFor(mode, config);
    const doses = pk.buildDoses(config);
    const timeline = pk.prepareEvents(config, schedule, dt, doses);
    const base = pk.drawParams(config)[0];
    const simulate = ({ systemic, dialysis }) => pk.single(
      { ...config, pdTransport: config.pdTransport * (id === 'capd' ? dialysis : 1) },
      { ...base, other: base.other * systemic, form: base.form * systemic,
        hd: base.hd * (id === 'hd' ? dialysis : 1) },
      schedule, dt, doses, timeline
    );
    const grid = gridScales.flatMap(systemic => gridScales.map(dialysis => ({ systemic, dialysis })));
    const raw = grid.map(simulate);
    const sampleAt = (course, time) => {
      const index = course.t.findIndex(hour => Math.abs(hour - time) < 1e-9);
      if (index < 0) throw new Error('Missing sampling time ' + time);
      return course.cols.plasma[index];
    };
    const eligible = [firstTrough, 25.5, boundary, 48];
    const designs = [
      { label: 'First trough only', times: [firstTrough] },
      { label: 'Add post-infusion sample', times: [firstTrough, 25.5] },
      { label: 'Add dialysis-timed sample', times: [firstTrough, boundary] },
      { label: 'Add second trough', times: [firstTrough, 48] }
    ];
    const cases = designs.map(() => []);
    const laterTroughs = raw.map(course => sampleAt(course, heldOutTime));
    const systemicScales = grid.map(p => p.systemic);
    const dialysisScales = grid.map(p => p.dialysis);
    for (const profile of profiles) {
      const truth = simulate(profile);
      const heldOutTruth = sampleAt(truth, heldOutTime);
      for (let i = 0; i < drawsPerProfile; i++) {
        const observations = eligible.map(time => {
          const mean = sampleAt(truth, time);
          return {
            time, role: 'fit', analyte: 'plasma',
            value: mean + Math.max(0.1, mean * config.assayCV) * normal()
          };
        });
        designs.forEach(({ times }, index) => {
          const fit = observations.filter(observation => times.includes(observation.time));
          const { weights } = pk.posterior(raw, { ...config, observations: fit });
          const trough = pk.weightedStat(laterTroughs, weights, 0.9);
          const systemic = pk.weightedStat(systemicScales, weights, 0.9);
          const dialysis = pk.weightedStat(dialysisScales, weights, 0.9);
          cases[index].push({
            error: Math.abs(trough.median - heldOutTruth),
            width: trough.upper - trough.lower,
            covered: heldOutTruth >= trough.lower && heldOutTruth <= trough.upper,
            systemicWidth: systemic.upper - systemic.lower,
            dialysisWidth: dialysis.upper - dialysis.lower
          });
        });
      }
    }
    const median = values => {
      const sorted = [...values].sort((a, b) => a - b);
      const center = (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
      return Number(center.toFixed(6));
    };
    return {
      id, label, boundary, boundaryLabel,
      designs: designs.map((design, index) => {
        const result = cases[index];
        return {
          ...design,
          medianError: median(result.map(x => x.error)),
          medianWidth: median(result.map(x => x.width)),
          covered: result.filter(x => x.covered).length,
          systemicWidth: median(result.map(x => x.systemicWidth)),
          dialysisWidth: median(result.map(x => x.dialysisWidth))
        };
      })
    };
  });
  return { seed, profiles, drawsPerProfile, trials, firstTrough, heldOutTime, gridScales, dt, scenarios };
}

if (require.main === module) {
  const output = process.argv[2] || path.join(__dirname, '../../public/research/sampling/dialysis-data.json');
  fs.writeFileSync(output, JSON.stringify(run(), null, 2) + '\n');
}
module.exports = { run };
