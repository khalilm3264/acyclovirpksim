'use strict';
const pk = require('../../public/assets/pk-engine.js');
const fs = require('node:fs');
const path = require('node:path');
function run() {
  const c = {...pk.DEFAULTS, draws:1, variability:0, horizon:16, doseCount:1, crcl:95, crclSource:'manual', assayCV:0.05};
  const base = pk.drawParams(c)[0];
  const scales = Array.from({length:21}, (_,i) => 0.6+i*0.04);
  const grid = scales.flatMap(clearance => scales.map(volume => ({clearance,volume})));
  const simulate = ({clearance,volume}) => pk.single(c, {...base, vc:base.vc*volume, renal:base.renal*clearance, other:base.other*clearance}, [], 0.025);
  const raw = grid.map(simulate);
  function at(one,t) { let j=one.t.findIndex(x=>x>=t);if(j===0)return one.cols.plasma[0];const f=(t-one.t[j-1])/(one.t[j]-one.t[j-1]);return one.cols.plasma[j-1]*(1-f)+one.cols.plasma[j]*f; }
  let state=20261110;
  const uniform=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+0.5)/4294967296;};
  const normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
  const cases=[];
  for(const truth of [{clearance:0.8,volume:1.2},{clearance:1.2,volume:0.8},{clearance:1,volume:1}]) {
    const reference=simulate(truth);
    for(let replicate=0;replicate<8;replicate++) {
      const observations=[0.5,1,2,4,8,12].map(time=>{const mean=at(reference,time);return {time,analyte:'plasma',role:'fit',value:mean+Math.max(0.1,mean*c.assayCV)*normal()};});
      const post=pk.posterior(raw,{...c,observations});
      const estimate=key=>pk.weightedStat(grid.map(p=>p[key]),post.weights,0.9);
      const clearance=estimate('clearance'),volume=estimate('volume');
      const holdoutTimes=[3,6,10];
      const holdoutRMSE=Math.sqrt(holdoutTimes.reduce((sum,t)=>{const prediction=raw.reduce((a,r,i)=>a+post.weights[i]*at(r,t),0);return sum+(prediction-at(reference,t))**2;},0)/holdoutTimes.length);
      cases.push({truth,replicate,clearance,volume,ess:post.ess,holdoutRMSE});
    }
  }
  return {seed:20261110,gridSize:grid.length,replicates:cases.length,assayCV:c.assayCV,
    design:'Uniform discrete prior on clearance and central-volume scale factors (0.6–1.4); only renal and other clearance are scaled. All other parameters fixed. Six noisy fit samples, three noise-free latent holdout times. Same-model, on-grid recovery; not external validation or full-model identifiability.',
    cases};
}
if(require.main===module)fs.writeFileSync(path.join(__dirname,'parameter-recovery.json'),JSON.stringify(run(),null,2)+'\n');
module.exports={run};
