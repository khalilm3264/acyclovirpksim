'use strict';

const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');

// Hara 2008, doi:10.2133/dmpk.23.306. Table 1, Table 2 and HD results on page 310.
const observed = {plasmaPeak:10.60, plasmaAuc12:77.97, cmmgPeak:7.47,
  plasmaDeclinePct:69.4, cmmgDeclinePct:77.6};

function simulate(step = 0.0625, overrides = {}) {
  const config = {...structuredClone(engine.DEFAULTS), weight:56.2, crcl:0.93,
    crclSource:'manual', renalMode:'constant', route:'Valacyclovir oral', dosingMode:'repeat',
    dose:1000, doseCount:1, horizon:52, draws:1, variability:0, observations:[],
    schedule:[{type:'HD',start:48,end:52}], ...overrides};
  const mode = 'Custom sequence';
  assert.deepEqual(engine.validate(config, mode), []);
  const run = engine.single(config, engine.drawParams(config)[0], engine.scheduleFor(mode,config),
    step, engine.buildDoses(config));
  const at = (key,hour) => {
    const index = run.t.indexOf(hour);
    assert.ok(index>=0,'Missing hour '+hour);
    return run.cols[key][index];
  };
  const beforeHd = key => run.cols[key].filter((_,i)=>run.t[i]<=48);
  let plasmaAuc12=0;
  for(let i=1;i<run.t.length&&run.t[i]<=12;i++)
    plasmaAuc12+=(run.t[i]-run.t[i-1])*(run.cols.plasma[i]+run.cols.plasma[i-1])/2;
  const predicted = {plasmaPeak:Math.max(...beforeHd('plasma')), plasmaAuc12,
    cmmgPeak:Math.max(...beforeHd('cmmg')),
    plasmaDeclinePct:100*(1-at('plasma',52)/at('plasma',48)),
    cmmgDeclinePct:100*(1-at('cmmg',52)/at('cmmg',48))};
  return {config, observed, predicted, run};
}
function report() {
  const nominal=simulate(),finer=simulate(0.03125);
  for(const key of Object.keys(observed)) {
    assert.ok(Number.isFinite(nominal.predicted[key]),key);
    assert.ok(Math.abs(nominal.predicted[key]-finer.predicted[key])<0.01,key+' numerical convergence');
  }
  return {source:'10.2133/dmpk.23.306', engineConfig:nominal.config,
    endpoints:Object.keys(observed).map(key=>({endpoint:key,observed:observed[key],
      predicted:nominal.predicted[key],predictedObservedRatio:nominal.predicted[key]/observed[key]})),
    residualCrClSensitivity:[0,0.93,2.94].map(crcl=>({crcl,...simulate(0.0625,{crcl}).predicted}))};
}
if(require.main===module)console.log(JSON.stringify(report(),null,2));
module.exports={simulate,report};
