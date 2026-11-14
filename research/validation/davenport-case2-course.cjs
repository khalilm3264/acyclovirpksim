// Davenport et al. 1992, DOI 10.1016/S0272-6386(12)70234-2, p.648 case 2.
// Conditional terminal-shape comparison: oral ACV is NOT a supported engine route.
// A unit IV input establishes the terminal state; one fixed scale anchors the first
// pre-HD observation. No later state reset, replacement dose or parameter fitting.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const observed = {sessions: [[13,5],[8,3],[5,2]], interdialyticPct: [60,100*(5/3-1)]};
const starts = [48,72,96];
function simulate(weight, crcl, hdCl, duration, precedingPD, step) {
  const schedule = [...(precedingPD ? [{type:'PD',start:24,end:48}] : []),
    ...starts.map(start=>({type:'HD',start,end:start+duration}))];
  const c = {...structuredClone(engine.DEFAULTS),age:41,sex:'male',weight,crcl,
    crclSource:'manual',renalMode:'constant',hdCl,schedule,route:'Acyclovir IV',dose:1,
    dosingMode:'repeat',doseCount:1,infusion:1,horizon:102,draws:1,variability:0,
    pdRxEnabled:precedingPD,pdRxRows:[{start:0,dwell:1,fill:1,glucose:1.5,uf:null,sessionStart:null}],
    trackMassBalance:true};
  // PD template repeats every 24 h; explicitly provide all 24 one-hour cycles.
  if(precedingPD)c.pdRxRows=Array.from({length:24},(_,start)=>({...c.pdRxRows[0],start}));
  assert.deepEqual(engine.validate(c,'Custom sequence'),[]);
  const run=engine.single(c,engine.drawParams(c)[0],engine.scheduleFor('Custom sequence',c),step);
  const value=t=>{const i=run.t.indexOf(t);assert.ok(i>=0);return run.cols.plasma[i];};
  const scale=13/value(48); // fixed units/normalization; only once for entire trajectory
  const sampled=delay=>{
    const sessions=starts.map((start,i)=>{
      const pre=value(start)*scale,post=value(start+duration+delay)*scale;
      return {preHour:start,postHour:start+duration+delay,pre,post,
        preErrorPct:100*(pre/observed.sessions[i][0]-1),postErrorPct:100*(post/observed.sessions[i][1]-1),
        fallPct:100*(1-post/pre)};
    });
    const intervals=sessions.slice(0,2).map((s,i)=>{
      const end=starts[i]+duration,next=starts[i+1];
      const candidates=run.t.map((t,j)=>({t,c:run.cols.plasma[j]*scale})).filter(p=>p.t>=end&&p.t<=next);
      const peak=candidates.reduce((a,b)=>a.c>b.c?a:b);
      return {fromHour:s.postHour,toHour:next,nextPre:sessions[i+1].pre,
        changePct:100*(sessions[i+1].pre/s.post-1),
        // Peak refers to mathematical disconnect, independent of delayed observation.
        transientPeakHour:peak.t,transientPeakPct:100*(peak.c/(value(end)*scale)-1)};
    });
    return {delay,sessions,intervals};
  };
  const residual=run.accounting.at(-1).residual;
  assert.ok(Math.abs(residual)<1e-8);
  return {weight,crcl,hdCl,duration,precedingPD,sampled:[sampled(0),sampled(1)],residual};
}
const results=[];
for(const weight of [50,70,90])for(const crcl of [0,5])for(const hdCl of [81.8,159])
for(const duration of [4,5])for(const precedingPD of [false,true]) {
  const coarse=simulate(weight,crcl,hdCl,duration,precedingPD,.125);
  const fine=simulate(weight,crcl,hdCl,duration,precedingPD,.0625);
  for(let d=0;d<2;d++)for(let s=0;s<3;s++)for(const key of ['pre','post'])
    assert.ok(Math.abs(coarse.sampled[d].sessions[s][key]-fine.sampled[d].sessions[s][key])<.001);
  results.push(fine);
}
const range=values=>[Math.min(...values),Math.max(...values)];
const summary={
  sessionFallPct:[0,1,2].map(i=>range(results.flatMap(r=>r.sampled.map(s=>s.sessions[i].fallPct)))),
  interdialyticChangePct:[0,1].map(i=>range(results.flatMap(r=>r.sampled.map(s=>s.intervals[i].changePct)))),
  transientPeakPct:[0,1].map(i=>range(results.map(r=>r.sampled[0].intervals[i].transientPeakPct))),
  preConcentrations:[0,1,2].map(i=>range(results.map(r=>r.sampled[0].sessions[i].pre))),
  immediatePostConcentrations:[0,1,2].map(i=>range(results.map(r=>r.sampled[0].sessions[i].post)))
};
console.log(JSON.stringify({units:'µmol/L; hours; mL/min; kg',observed,
  history:'800 mg oral ACV twice daily for 5 days; first sample 48 h after last dose. Oral ACV not simulated.',
  assumptions:'One first-sample normalization; daily start spacing 24 h; 0/1 h post-HD delay; optional 24 h preceding 1 L/h PD with assumed 1.5% dextrose. No PD after first HD.',
  summary,results},null,2));
