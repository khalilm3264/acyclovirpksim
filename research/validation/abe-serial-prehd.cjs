#!/usr/bin/env node
'use strict';
// Research-only conditional course comparison; no parameter fitting or pooled scoring.
const fs=require('node:fs'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const E=require('./frozen/pk-engine-304ce53.js');
const engineBytes=fs.readFileSync(require.resolve('./frozen/pk-engine-304ce53.js'));
const engineBlob=crypto.createHash('sha1').update(`blob ${engineBytes.length}\0`).update(engineBytes).digest('hex');
assert.equal(engineBlob,'17971df66e0a97b4d382572a582d35c444a3c83f','Frozen adult engine changed; review protocol before updating');
const observed=[{day:1,acv:11.2,cmmg:36.4},{day:2,acv:5.39,cmmg:16.37},{day:3,acv:2.26,cmmg:7.22}];
const changes=observed.slice(1).map((r,i)=>({fromDay:observed[i].day,toDay:r.day,
 acvRatio:r.acv/observed[i].acv,cmmgRatio:r.cmmg/observed[i].cmmg}));
function run({gap,duration,hdCl,renal,weight=70},dt=.125){
 const first=160+gap;
 const profile=renal==='recovery';
 const c={...structuredClone(E.DEFAULTS),age:63,sex:'male',weight,crcl:renal==='anuric'?0:5,
 crclSource:'manual',renalMode:profile?'profile':'constant',
 renalProfile:[{time:0,crcl:5},{time:first,crcl:5},{time:first+48,crcl:10},{time:first+144,crcl:20}],
 route:'Valacyclovir oral',dosingMode:'repeat',dose:500,every:8,doseCount:21,
 horizon:first+144,draws:1,variability:0,observations:[],hdCl,
 schedule:[0,24,48].map(h=>({type:'HD',start:first+h,end:first+h+duration}))};
 assert.deepEqual(E.validate(c,'Custom sequence'),[]);
 const r=E.single(c,E.drawParams(c)[0],E.scheduleFor('Custom sequence',c),dt,E.buildDoses(c));
 const at=(key,t)=>{const i=r.t.findIndex(x=>Math.abs(x-t)<1e-8);assert.ok(i>=0);return r.cols[key][i];};
 const rows=observed.map(o=>{const t=first+24*(o.day-1);return {day:o.day,
 predictedAcv:at('plasma',t),predictedCmmg:at('cmmg',t)};});
 return {inputs:{gap,duration,hdCl,renal,weight},rows,
 changes:rows.slice(1).map((r,i)=>({fromDay:rows[i].day,toDay:r.day,
 acvRatio:r.predictedAcv/rows[i].predictedAcv,cmmgRatio:r.predictedCmmg/rows[i].predictedCmmg})),
 day7:{predictedAcv:at('plasma',first+144),predictedCmmg:at('cmmg',first+144),
 acvBelowLimit:at('plasma',first+144)<.1,cmmgBelowLimit:at('cmmg',first+144)<.1}};
}
const scenarios=[];
for(const gap of [8,24])for(const duration of [2,4])for(const hdCl of [81.8,159])for(const renal of ['anuric','constant5','recovery'])scenarios.push(run({gap,duration,hdCl,renal}));
const baseline={gap:8,duration:4,hdCl:81.8,renal:'constant5'};
const weightSensitivity=[50,90].map(weight=>run({...baseline,weight}));
const coarse=run(baseline),fine=run(baseline,.0625);
const maxRelativeStepDifference=Math.max(...coarse.rows.flatMap((r,i)=>['predictedAcv','predictedCmmg'].map(k=>Math.abs(r[k]/fine.rows[i][k]-1))));
assert.ok(maxRelativeStepDifference<.01,'Step-size check exceeds 1%');
assert.ok(scenarios.every(s=>s.rows.every(r=>r.predictedAcv>0&&r.predictedCmmg>0)));
const result={source:{doi:'10.2131/fts.8.229',url:'https://www.jstage.jst.go.jp/article/fts/8/7/8_229/_pdf',
 numerical:'Results p231: three pre-HD pairs; day7 both <0.1 µg/mL',
 graphical:'Fig3C p232 also has an early point between day1 and day2, following the first HD arrow. No exact concentration or draw/session-end timestamp supplied; excluded from numerical comparison.'},
 engineBlob,unit:'µg/mL (= mg/L)',observed,observedChanges:changes,day7Observed:{acv:{lessThan:.1},cmmg:{lessThan:.1}},
 assumptions:'500 mg valacyclovir q8h ×21 doses at hours 0..160; final dose 8 or 24h before day1; pre-HD samples exactly 24h apart; HD starts at those samples for three days; 2/4h duration; HD clearance 81.8/159 mL/min; weight70kg. CrCl profiles are hypothetical, not inferred from creatinine. Recovery begins day1. No subsequent doses. All other model parameters frozen.',
 scenarios,weightSensitivity,maxRelativeStepDifference,
 limits:'One patient, six dependent numerical observations and two censored day7 observations. No scoring, fitting, independent cohort addition, clearance estimate, body-mass removal or rebound estimate.'};
const json=JSON.stringify(result,null,2)+'\n';
if(process.argv[2])fs.writeFileSync(process.argv[2],json);else process.stdout.write(json);
