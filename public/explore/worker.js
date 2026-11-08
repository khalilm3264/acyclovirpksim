/* AyFlux visual explorer worker. AGPL-3.0-only. */
'use strict';
importScripts('/assets/pk-engine.js','/explore/model.js');
self.onmessage=event=>{
 const {id,kind,payload}=event.data;
 try{
  const m=self.AyFluxExplore;
  if(kind==='grid'){
   const p=m.plan(payload),z=[];
   for(let j=0;j<p.ys.length;j++){
    const row=[];for(let i=0;i<p.xs.length;i++){const v=m.cell(p,i,j).summary[p.metric];if(!Number.isFinite(v))throw Error('Non-finite model output; narrow the input range.');row.push(v);}z.push(row);
    self.postMessage({id,progress:(j+1)/p.ys.length});
   }
   self.postMessage({id,result:{...p,z}});
  }else if(kind==='curve'){
   self.postMessage({id,result:m.run(m.config(payload.config),payload.mode,true)});
  }else throw Error('Unknown calculation.');
 }catch(e){self.postMessage({id,error:e.message});}
};
