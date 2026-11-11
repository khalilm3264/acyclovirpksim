/* AyFlux visual explorer worker. AGPL-3.0-only. */
'use strict';
importScripts('/assets/pk-engine.js','/explore/model.js','/explore/analysis.js');
self.onmessage=event=>{
 const {id,kind,payload}=event.data;
 try{
  const m=self.AyFluxExplore;
  if(kind==='grid'){
   const p=m.plan(payload),z=[],scenarios=[];
   for(let j=0;j<p.ys.length;j++){
    const row=[];for(let i=0;i<p.xs.length;i++){const summary=m.cell(p,i,j).summary,v=summary[p.metric];scenarios.push([p.xs[i],p.ys[j],...Object.keys(m.metrics).map(key=>summary[key])]);if(!Number.isFinite(v))throw Error('Non-finite model output; narrow the input range.');row.push(v);}z.push(row);
    self.postMessage({id,progress:(j+1)/p.ys.length});
   }
   self.postMessage({id,result:{...p,z,scenarios}});
  }else if(kind==='curve'||kind==='accounting'){
   self.postMessage({id,result:m.run(m.config(payload.config),payload.mode,true)});
  }else if(Object.hasOwn(self.AyFluxAnalysis,kind)){
    self.postMessage({id,result:self.AyFluxAnalysis[kind](payload)});
   }else throw Error('Unknown calculation.');
 }catch(e){self.postMessage({id,error:e.message});}
};
