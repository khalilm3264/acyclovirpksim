const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const f=require.resolve('../pk-engine-8fc1c9d.js'),e=require(f);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),'9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d');
const markers=require('./markers.json'),sample=markers.times_h;
const dx=(a,b,f)=>a.map((v,i)=>v+b[i]*f),k=1.636;
function run(arm,step,kind) {
 const [dose,every,doseCount,weight,crcl]=arm,start=(doseCount-1)*every,end=start+every;
 const c={...structuredClone(e.DEFAULTS),weight,crcl,crclSource:'manual',renalMode:'constant',route:'Valacyclovir oral',dosingMode:'repeat',dose,every,doseCount,horizon:end,draws:1,variability:0,observations:[]};
 assert.deepEqual(e.validate(c,'No dialysis'),[]);
 const p=e.drawParams(c)[0], doses=e.buildDoses(c);
 let time, y;
 if(kind!=='transit'){
   const r=e.single(c,p,[],step,doses.map(d=>({...d,time:d.time+(kind==='lag'?.590:0)})));
   time=r.t;y=r.cols.plasma;
 } else {
   let x=[0,0,0,0];time=[];y=[];
   const rhs=([A,B,T1,T2])=>{const ca=A/p.vc,ex=p.q*(ca-B/p.vp);return [k*T2-(p.other+p.renal+p.form)*ca-ex,ex,-k*T1,k*(T1-T2)];};
   for(let j=0;j<=end/step;j++){
     const t=j*step; for(const d of doses)if(Math.abs(d.time-t)<1e-9)x[2]+=d.amount*225.21/324.34*p.oralF;
     time.push(t); y.push(x[0]/p.vc);
     const a=rhs(x),b=rhs(dx(x,a,step/2)),d=rhs(dx(x,b,step/2)),f=rhs(dx(x,d,step)); x=x.map((v,i)=>v+step*(a[i]+2*b[i]+2*d[i]+f[i])/6);
   }
 }
 let auc=0;
 for(let i=1;i<time.length;i++) if(time[i-1]>=start-1e-9&&time[i]<=end+1e-9)auc+=(time[i]-time[i-1])*(y[i]+y[i-1])/2;
 const ts=sample.filter(h=>h<=every),v=ts.map(h=>y[time.findIndex(t=>Math.abs(t-start-h)<1e-9)]);assert.ok(v.every(Number.isFinite));
 const peak=Math.max(...v);return {peak,time:ts[v.indexOf(peak)],auc,v};
}

const mk=markers;
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
function calibration(xs,ys) {
 const xm=avg(xs),ym=avg(ys),slope=xs.reduce((s,x,i)=>s+(x-xm)*(ys[i]-ym),0)/xs.reduce((s,x)=>s+(x-xm)**2,0);
 return {intercept:ym-xm*slope,slope};
}
const cal=calibration(mk.y_ticks.map(([c])=>Math.log10(c)),mk.y_ticks.map(([,y])=>y));
assert.ok(mk.y_ticks.every(([c,y])=>Math.abs(y-cal.intercept-cal.slope*Math.log10(c))<=1));
const molMass=225.21, read=y=>10**((y-cal.intercept)/cal.slope)*molMass/1000;
const obs=mk.xy_px.map(([,y])=>read(y));
const auc=(ys,log=true)=>ys.slice(1).reduce((s,v,i)=>{const w=ys[i];return s+(sample[i+1]-sample[i])*(log&&w>v&&v>0?(w-v)/Math.log(w/v):(w+v)/2)},0);
const peak=v=>[Math.max(...v), sample[v.indexOf(Math.max(...v))]];
const range=v=>[Math.min(...v),Math.max(...v)];
function metrics(p,o) {
 const rm=(i,j)=>Math.sqrt(avg(p.slice(i,j).map((x,k)=>(x-o[i+k])**2)));
 return {rmse:rm(0,p.length),earlyRMSE:rm(0,5),lateRMSE:rm(5,p.length),auc:auc(p),aucLinear:auc(p,false),aucPO:auc(p)/auc(o),peak:peak(p)};
}
const uncertainty=Array.from({length:2**obs.length},(_,bits)=>mk.xy_px.map(([,y],i)=>read(y+(bits>>i&1?1:-1)*mk.assumed_marker_bound_px)));
const results={cal,obs,observed:{auc:auc(obs),aucLinear:auc(obs,false),peak:peak(obs),aucRange:range(uncertainty.map(y=>auc(y)))},weights:{}};
for(const weight of [55,70,85]){
 const models={};
 for(const kind of ['baseline','lag','transit']){
   const individual=[17,30,31].map(crcl=>{
     const a=run([1500,12,5,weight,crcl],1/128,kind),b=run([1500,12,5,weight,crcl],1/256,kind);
     assert.ok(a.v.length===sample.length&&a.v.every((x,i)=>Math.abs(x-b.v[i])<.0001));
     return a.v;
   });
   const pred=sample.map((_,i)=>avg(individual.map(s=>s[i]))), score=metrics(pred,obs), u=uncertainty.map(y=>metrics(pred,y));
   models[kind]={...score,pred,rmseRange:range(u.map(s=>s.rmse)),earlyRange:range(u.map(s=>s.earlyRMSE)),aucPORange:range(u.map(s=>s.aucPO))};
 }
 results.weights[weight]=models;
}
console.log(JSON.stringify(results,null,2));
