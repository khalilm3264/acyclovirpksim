'use strict';
// Research experiment. Run with odex@3.0.0-rc.4 installed in Node's module path.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { Solver } = require('odex');
const engine = require('../../public/assets/pk-engine.js');
const { subjects, configFor } = require('./boelaert-capd.cjs');

// Substitute only the compartment integration step in a private research copy.
// Event scheduling, PD drains, clipping, CSF updates and trapezoidal AUC stay
// identical. Restarting ODEX at each output interval deliberately isolates
// integrator differences, rather than measuring its best possible speed.
function adaptiveEngine() {
 const filename = path.resolve(__dirname, '../../public/assets/pk-engine.js');
 let source = fs.readFileSync(filename, 'utf8');
 const start = source.indexOf('  function stage(x,k,f)');
 const end = source.indexOf('  const kidney=flux(6)', start);
 const update = '  const y=x.map((v,j)=>v+step*(k1[j]+2*k2[j]+2*k3[j]+k4[j])/6);';
 assert.ok(start >= 0 && end > start && source.includes(update), 'Integration block changed; review the experiment adapter.');
 source = source.slice(0, start) + `  const solver = new Solver((time, state) => rhs(...state.slice(0,6), time), 10,
   {absoluteTolerance:1e-10, relativeTolerance:1e-10, denseOutput:false});
  const solution = solver.solve(t, x.concat([0,0,0,0]), t+step);
  if(Math.abs(solution.xEnd-(t+step))>1e-9)throw new Error('ODEX failed to reach the interval end');
  const flux = j => solution.y[j];
` + source.slice(end);
 source = source.replace(update, '  const y=solution.y.slice(0,6);');
 const context = { module: { exports: {} }, Solver, console };
 vm.runInNewContext(source, context, { filename });
 return context.module.exports;
}
function run(api, subject, step) {
 const config = configFor(subject);
 const mode = 'Peritoneal dialysis';
 const errors = api.validate(config, mode);
 assert.equal(errors.length, 0);
 return api.single(config, api.drawParams(config)[0], api.scheduleFor(mode, config), step, api.buildDoses(config));
}
function metrics(output) {
 const at = time => output.cols.plasma[output.t.findIndex(t => Math.abs(t-time)<1e-8)];
 return {
  day1PeakMgL: at(1), day1TroughMgL: at(24), day5PeakMgL: at(97), day5TroughMgL: at(120),
  aucMgHL: output.summary.auc, drainedMg: output.summary.mass,
  maxMassResidualMg: Math.max(...output.accounting.map(row => Math.abs(row.residual)))
 };
}
const adaptive = adaptiveEngine();
const rows = [];
for (const subject of subjects) {
 const methods = [['rk4',engine,.25],['rk4-half',engine,.125],['odex',adaptive,.25],['odex-half',adaptive,.125]];
 for (const [method, api, step] of methods) {
  run(api, subject, step); // warm-up
  const times = [];
  let output;
  for (let repeat=0; repeat<3; repeat++) {
   const start=performance.now(); output=run(api,subject,step); times.push(performance.now()-start);
  }
  const values=metrics(output);
  assert.ok(Object.values(values).every(Number.isFinite));
  assert.ok(values.maxMassResidualMg < 1e-6);
  rows.push({patient:subject.id,method,stepHours:step,...values,medianRuntimeMs:times.sort((a,b)=>a-b)[1]});
 }
}
const comparisons=subjects.map(subject=>{
 const patientRows=rows.filter(row=>row.patient===subject.id);
 const reference=patientRows.find(row=>row.method==='odex-half');
 return {patient:subject.id,relativeDifferencePct:patientRows.map(row=>({method:row.method,
  ...Object.fromEntries(['day1PeakMgL','day1TroughMgL','day5PeakMgL','day5TroughMgL','aucMgHL','drainedMg'].map(key=>[key,100*(row[key]-reference[key])/reference[key]]))}))};
});
console.log(JSON.stringify({node:process.version,odex:require('odex/package.json').version,
 scope:'Boelaert patients 1, 4 and 5; default coefficients. ODEX restarts at every output/event interval. AUC and CSF retain the production updates. Timings include a VM context and are not browser benchmarks.',rows,comparisons},null,2));
