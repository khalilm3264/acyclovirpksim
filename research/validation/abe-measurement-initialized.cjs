'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), {createHash}=require('node:crypto');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(process.argv[2] || __dirname+'/../../public/assets/pk-engine.js'),'utf8');
const sha256=createHash('sha256').update(source).digest('hex');
assert.equal(sha256,'9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d');
const marker='let a=0,b=0,m=0,oralDepot=0';
assert.equal(source.split(marker).length,2);
function load(src){const ctx={module:{exports:{}}};vm.runInNewContext(src,ctx);return ctx.module.exports;}
const stock=load(source);
const pk=load(source.replace(marker,'let a=c.anchor?.a??0,b=c.anchor?.b??0,m=c.anchor?.m??0,oralDepot=0'));
const base={...pk.DEFAULTS,weight:70,age:63,sex:'male',variability:0,draws:1,horizon:144};
const verify=[{type:'HD',start:0,end:4}];
assert.deepEqual(JSON.parse(JSON.stringify(pk.single(base,pk.drawParams(base)[0],verify,1/16,[]))),JSON.parse(JSON.stringify(stock.single(base,stock.drawParams(base)[0],verify,1/16,[]))));
const obs={day1:[11.2,36.4], day2:[5.39,16.37],day3:[2.26,7.22],day7DetectionLimit:0.1};
const profiles={
  fixed0:[0,0,0,0], fixed5:[5,5,5,5], fixed10:[10,10,10,10],
  recoveryLow:[0,2.5,5,10], recoveryModerate:[0,5,10,20],
  recoveryLate:[0,0,0,20],
};
function simulate(profile, hours, duration, weight, periphRatio, dt=1/16, hdCl=base.hdCl){
 const t=[0,...hours,144];
 const c={...base,weight,hdCl,renalMode:'profile',renalProfile:t.map((time,i)=>({time,crcl:profiles[profile][i]}))};
 const p=pk.drawParams(c)[0];
 c.anchor={a:obs.day1[0]*p.vc,b:obs.day1[0]*periphRatio*p.vp,m:obs.day1[1]*p.vm};
 const rows=t.slice(0,3).map(start=>({type:'HD',start,end:start+duration}));
 const result=pk.single(c,p,rows,dt,[]);
 const pred=t.map(time=>{
   const i=result.t.indexOf(time);
   assert(i>=0);
   return [result.cols.plasma[i],result.cols.cmmg[i]];
 });
 assert(pred[0].every((x,i)=>Math.abs(x-obs.day1[i])<1e-12));
 return {profile,hours,duration,weight,periphRatio,pred};
}
const grid=[], nominal={}, ratios={};
for(const profile of Object.keys(profiles)){
 nominal[profile]=simulate(profile,[24,48],4,70,1);
 const tight=simulate(profile,[24,48],4,70,1,1/32);
 assert(Math.max(...tight.pred.flat().map((x,i)=>Math.abs(x-nominal[profile].pred.flat()[i])))<1e-5);
 for(const gap1 of [20,24,28])for(const gap2 of [20,24,28])for(const duration of [3,4,5])for(const weight of [55,70,85])for(const ratio of [.5,1,1.5]){
  grid.push(simulate(profile,[gap1,gap1+gap2],duration,weight,ratio));
 }
 const subset=grid.filter(x=>x.profile===profile);
 ratios[profile]=[1,2,3].map((day,i)=>[0,1].map(j=>{
  const points=subset.map(x=>x.pred[day][j]);
  return [Math.min(...points),Math.max(...points)];
 }));
}
const within=(p,o,f)=>p.every((x,i)=>x>=o[i]/f&&x<=o[i]*f);
const matches=Object.fromEntries(Object.keys(profiles).map(key=>{const s=grid.filter(x=>x.profile===key);return [key,[1.25,2].map(f=>s.filter(x=>within(x.pred[1],obs.day2,f)&&within(x.pred[2],obs.day3,f)).length).concat(s.filter(x=>x.pred[3].every(y=>y<.1)).length,s.filter(x=>within(x.pred[1],obs.day2,1.25)&&within(x.pred[2],obs.day3,1.25)&&x.pred[3].every(y=>y<.1)).length)];}));
const hdSensitivity=[];
for(const profile of Object.keys(profiles))for(const hdCl of [60,base.hdCl,120,159]){
 const runs=grid.filter(x=>x.profile===profile).map(x=>simulate(profile,x.hours,x.duration,x.weight,x.periphRatio,1/16,hdCl));
 const earlyTwofold=runs.filter(x=>within(x.pred[1],obs.day2,2)&&within(x.pred[2],obs.day3,2));
 const lateBelowDetection=x=>x.pred[3].every(y=>y<obs.day7DetectionLimit);
 const nominalRun=runs.find(x=>x.duration===4&&x.weight===70&&x.periphRatio===1&&x.hours[0]===24&&x.hours[1]===48);
 hdSensitivity.push({profile,hdCl,scenarios:runs.length,earlyTwofold:earlyTwofold.length,lateBelowDetection:runs.filter(lateBelowDetection).length,both:earlyTwofold.filter(lateBelowDetection).length,nominal:nominalRun.pred});
}
console.log(JSON.stringify({engineSha256:sha256,obs,profiles,nominal,ranges:ratios,matches,grid,hdSensitivity},null,2));
