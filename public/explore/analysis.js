// Derived views over the existing numerical engines. All inputs are local to the worker.
'use strict';
(function(root){
 const pk=root.RenalPKV7,m=root.AyFluxExplore;
 function at(time,values,h){
  let lo=0,hi=time.length-1;
  while(hi-lo>1){const k=(lo+hi)>>1;if(time[k]<=h)lo=k;else hi=k;}
  if(h<=time[0])return values[0];
  if(h>=time[hi])return values[hi];
  return values[lo]+(values[hi]-values[lo])*(h-time[lo])/(time[hi]-time[lo]);
 }
 function ensemble({config,mode,hour,modes}){
  const c=pk.effectiveConfig(config);
  if(!Number.isFinite(hour)||hour<0||hour>c.horizon)throw Error('Enter a time within the simulation window.');
  const params=pk.drawParams(c),points=[],groups=[],doses=pk.buildDoses(c);
  for(const scenario of new Set([mode,...modes])){
   const rows=pk.scheduleFor(scenario,c),events=pk.prepareEvents(c,rows,.25,doses),values=[];
   for(const p of params){
    const result=pk.single(c,p,rows,.25,doses,events);
    const plasma=at(result.t,result.cols.plasma,hour);
    values.push(plasma);
    if(scenario===mode)points.push([p.vc,p.other+p.form+p.renal*(c.renalMode==='profile'?pk.renalCrClAt(c,hour):1),result.summary.auc,plasma]);
   }
   groups.push({name:scenario,values:values.sort((a,b)=>a-b)});
  }
  return {points,groups,hour,mode};
 }
 function sweep({config,mode,key,metric}){
  const c={...pk.effectiveConfig(config),crclSource:'manual',draws:1,variability:0};
  const data=[];
  for(let step=-4;step<=4;step++){
   const input=c[key]*(1+step*.05),scenario={...c,[key]:input};
   if(pk.validate(scenario,mode).length)continue;
   const rows=pk.scheduleFor(mode,scenario),p=pk.drawParams(scenario)[0];
   data.push([input,pk.single(scenario,p,rows,.25).summary[metric]]);
  }
  return data;
 }
 function timeMap({config}){
  const c=m.config(config),hours=Array.from({length:49},(_,i)=>i*c.horizon/48);
  const starts=Array.from({length:9},(_,i)=>i*Math.min(24,c.horizon)/8);
  const data=starts.flatMap((hdStart,j)=>{
   const s=m.run({...c,hdStart},'Intermittent HD');
   return hours.map((t,i)=>[i,j,at(s.t,s.cols.plasma,t)]);
  });
  return {hours,starts,data};
 }
 function difference({grid,reference,hdStart}){
  return grid.ys.map((y,j)=>grid.xs.map((x,i)=>{
   const c={...grid.config,[grid.xKey]:x,[grid.yKey]:y};
   if(reference==='Intermittent HD'&&Number.isFinite(hdStart))c.hdStart=hdStart;
   return grid.z[j][i]-m.run(c,reference).summary[grid.metric];
  }));
 }
 root.AyFluxAnalysis={ensemble,sweep,timeMap,difference};
})(self);
