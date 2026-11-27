'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), crypto=require('node:crypto');
const pth=require('node:path').resolve(process.argv[2] || __dirname+'/../../public/assets/pk-engine.js');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(pth)).digest('hex'),'9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d');
const csv=fs.readFileSync(__dirname+'/shah1986_fig1_digitized.csv','utf8').trim().split(/\r?\n/).slice(1);
const protocol=[1,2.5,5,8,11,24,72,73,74,76,79,83,85,96,147,150,151,155,157,169];
const samples=csv.map((l,i)=>{const f=l.split(',');return {id:f[0],day:+f[1],tFig:+f[7],timing:f[12],obs:+f[10],nominal:protocol[i]};});
assert.equal(samples.length,20);
assert.equal(samples.filter(s=>s.timing!=='ambiguous').length,15);
const late=['D1_6','D4_1','D4_8','D7_6'];
const pk=require(pth),days=[1,4,7],obsRec=[5.7,10.8,11.0];
const schedule=Array.from({length:8},(_,i)=>({type:'PD',start:i*24,end:(i+1)*24}));
const customDoses=schedule.slice(0,7).map(({start})=>({time:start,route:'Acyclovir IV',amount:start===0?275:137.5,infusion:1}));
const known=[[1.5,1.5,2.5],[1.5,2.5,4.25],[1.5,1.5,4.25]];
function perms(x){return [...new Set(x.flatMap((a,i)=>x.flatMap((b,j)=>i===j?[]:[[a,b,x[3-i-j]].join(',')])) )].map(s=>s.split(',').map(Number));}
function evaluate(bsa,bagOrder,step,assumptions={}){
 const {crcl=2*bsa/1.73, pdScale=1, volumeScale=1, exchangeShift=0}=assumptions;
 const boundaries=[0,6+exchangeShift,12+exchangeShift,24];
 const exchange=(mix,sessionStart)=>mix.map((glucose,j)=>({sessionStart,start:boundaries[j],dwell:boundaries[j+1]-boundaries[j],fill:2,glucose,uf:null}));
 const c={...pk.DEFAULTS,weight:55,age:75,sex:'male',crcl,route:'Acyclovir IV',dosingMode:'custom',customDoses,schedule,pdRxEnabled:true,
  pdCl:pk.DEFAULTS.pdCl*pdScale,
  pdRxRows:[...exchange([1.5,1.5,1.5],null),...days.flatMap((d,i)=>exchange(bagOrder[i],(d-1)*24))],
  horizon:192,variability:0,draws:1,trackMassBalance:true};
 const mode='Custom sequence';assert.deepEqual(pk.validate(c,mode),[]);
 const params=pk.drawParams(c)[0];
 params.vc*=volumeScale;
 params.vp*=volumeScale;
 const r=pk.single(c,params,pk.scheduleFor(mode,c),step);
 assert.equal(r.drains.length,24);assert(r.drains.every(d=>d.complete));assert(Math.abs(r.accounting.at(-1).residual)<1e-7);
 const conc=t=>{const i=r.t.findIndex(x=>x>=t);assert(i>=0);if(r.t[i]===t)return r.cols.plasma[i];return r.cols.plasma[i-1]+(r.cols.plasma[i]-r.cols.plasma[i-1])*(t-r.t[i-1])/(r.t[i]-r.t[i-1]);};
 const recovery=days.map((day,i)=>{const st=(day-1)*24,en=day*24;
  const drained=r.drains.filter(d=>d.start>=st&&d.end<=en);assert.equal(drained.length,3);
  const mg=drained.reduce((a,d)=>a+d.mass,0);
  let auc=0;for(let j=r.t.indexOf(st)+1;j<=r.t.indexOf(en);j++)auc+=(r.t[j]-r.t[j-1])*(r.cols.plasma[j]+r.cols.plasma[j-1])/2;
  return {day,publishedPct:obsRec[i],pct:mg/customDoses[day-1].amount*100,cl:mg/auc/.06};
 });
 const points=samples.map(s=>{
  const pred=conc(s.nominal);
  const pre=late.indexOf(s.id);
  const lo=pre===3?168:pre>=0?s.nominal-2:Math.max((s.day-1)*24+1,Math.min(s.nominal,s.tFig)-.75);
  // Protect late samples before doses 2, 4 and 5 from crossing onto infusion.
  const hi=pre===3?170.02:pre>=0?s.nominal:Math.min(s.day*24,Math.max(s.nominal,s.tFig)+.75);
  const times=[lo,...r.t.filter(t=>t>lo&&t<hi),hi];
  const vals=times.map(conc);
  return {...s,pred,ratio:pred/s.obs,timingLo:lo,timingHi:hi,ratioLo:Math.min(...vals)/s.obs,ratioHi:Math.max(...vals)/s.obs};
 });
 return {bsa,crcl:c.crcl,bagOrder,points,recovery};
}
function summarize(points){const eligible=points.filter(p=>p.timing!=='ambiguous');return {primaryWithinTwofold:eligible.filter(p=>p.ratio>=.5&&p.ratio<=2).length,primaryN:eligible.length,primaryGMR:Math.exp(eligible.reduce((a,p)=>a+Math.log(p.ratio),0)/eligible.length)};}
const nominal=evaluate(1.55,known,1/16),fine=evaluate(1.55,known,1/32);
assert(nominal.points.every((p,i)=>Math.abs(p.pred-fine.points[i].pred)<.001));
assert(nominal.recovery.every((p,i)=>Math.abs(p.pct-fine.recovery[i].pct)<.001));
const runs=[];
for(const bsa of [1.4,1.55,1.7])for(const a of perms(known[0]))for(const b of perms(known[1]))for(const c of perms(known[2]))runs.push(evaluate(bsa,[a,b,c],1/16));
assert.equal(runs.length,162);
const range=x=>[Math.min(...x),Math.max(...x)];
const ranges={ratios:Object.fromEntries(late.map(id=>{const pts=runs.map(r=>r.points.find(p=>p.id===id));return [id,{fixedTime:range(pts.map(p=>p.ratio)),timingAndInputs:[Math.min(...pts.map(p=>p.ratioLo)),Math.max(...pts.map(p=>p.ratioHi))]}];})),
 recoveryPct:days.map((d,i)=>range(runs.map(r=>r.recovery[i].pct))),
 meanPdClearance:range(runs.map(r=>r.recovery.reduce((a,p)=>a+p.cl,0)/3)),
 primaryWithinTwofold:range(runs.map(r=>summarize(r.points).primaryWithinTwofold))};
const matrix=[];
for(const crcl of [0,nominal.crcl,3,5])for(const pdScale of [.75,1,1.5])for(const volumeScale of [.75,1,1.25])for(const exchangeShift of [-1,0,1]){
 const assumptions={crcl,pdScale,volumeScale,exchangeShift};
 const r=evaluate(1.55,known,1/16,assumptions);
 matrix.push({...assumptions,...summarize(r.points),inferredPredoseRatios:r.points.filter(p=>late.slice(0,3).includes(p.id)).map(p=>p.ratio),recovery:r.recovery});
}
console.log(JSON.stringify({nominal:{...nominal,...summarize(nominal.points)},ranges,runs:runs.length,grid:runs,matrix},null,2));
