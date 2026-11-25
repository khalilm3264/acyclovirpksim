const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const f=require.resolve('../pk-engine-8fc1c9d.js'),e=require(f);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),'9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d');
const sample=[0,1,2,3,4,6,8,12,24,44,48];
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
     const t=j*step; if(doses.some(d=>Math.abs(d.time-t)<1e-9))x[2]+=dose*225.21/324.34*p.oralF;
     time.push(t); y.push(x[0]/p.vc);
     const a=rhs(x),b=rhs(dx(x,a,step/2)),d=rhs(dx(x,b,step/2)),f=rhs(dx(x,d,step)); x=x.map((v,i)=>v+step*(a[i]+2*b[i]+2*d[i]+f[i])/6);
   }
 }
 let auc=0;
 for(let i=1;i<time.length;i++) if(time[i-1]>=start-1e-9&&time[i]<=end+1e-9)auc+=(time[i]-time[i-1])*(y[i]+y[i-1])/2;
 const ts=sample.filter(h=>h<=every),v=ts.map(h=>y[time.findIndex(t=>Math.abs(t-start-h)<1e-9)]);assert.ok(v.every(Number.isFinite));
 const peak=Math.max(...v);return {peak,time:ts[v.indexOf(peak)],auc,v};
}

const markers=require('./markers.json');
const earlyTimes=sample.slice(0,8),y0=647.5,pxPerMgL=(y0-59.5)/16;
assert.ok(markers.y_axis_ticks_px.every((y,i)=>Math.abs(y-(y0-2*i*pxPerMgL))<=.5));
const read=arr=>arr.map(([,y])=>(y0-y)/pxPerMgL);
const auc=v=>v.slice(1).reduce((a,y,i)=>{const x=v[i];return a+(earlyTimes[i+1]-earlyTimes[i])*(x>y&&y>0?(x-y)/Math.log(x/y):(x+y)/2)},0);
const peak=v=>({value:Math.max(...v),hour:earlyTimes[v.indexOf(Math.max(...v))]});
const rmse=(p,o)=>Math.sqrt(p.reduce((s,x,i)=>s+(x-o[i])**2,0)/o.length);
const corners=(points,delta)=>Array.from({length:2**points.length},(_,j)=>points.map((x,i)=>x+(j>>i&1?delta:-delta)));
let out={earlyTimes,calibration:{y0,pxPerMgL},predose:"zero for AUC only",groups:[]};
for(const g of markers.groups){
 const obs=read(g.xy), late=g.late_xy?read(g.late_xy):null, obsAUC=auc([0,...obs]);
 const models={};
 for(const kind of ['baseline','lag','transit']){
  const args=[1000,48,1,g.weight,g.crcl],a=run(args,1/128,kind),b=run(args,1/256,kind);
  assert.ok(a.v.every((x,i)=>Math.abs(x-b.v[i])<.0001));
  const early=a.v.slice(0,8), score=auc(early), intervals=corners(obs,3/pxPerMgL);
  const rm=intervals.map(y=>rmse(early.slice(1),y));
  const pr=intervals.map(y=>score/auc([0,...y]));
  models[kind]={v:a.v,peak:peak(early),rmse:rmse(early.slice(1),obs),auc:score,aucPO:score/obsAUC,rmseRange:[Math.min(...rm),Math.max(...rm)],aucPORange:[Math.min(...pr),Math.max(...pr)]};
 }
 out.groups.push({id:g.id,obs,peak:peak([0,...obs]),obsAUC,late,models});
}
console.log(JSON.stringify(out,null,2));
