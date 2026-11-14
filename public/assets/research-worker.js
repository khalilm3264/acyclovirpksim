/* SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
importScripts('/assets/pk-engine.js','/assets/literature-cases.js');
self.onmessage=event=>{
 const {id,action,config,mode,caseId}=event.data;
 try{
  const started=performance.now();
  const data=action==='case'?self.AyFluxLiterature.runCase(caseId,undefined,event.data.calibration):self.RenalPKV7.simulate(config,mode).summary;
  self.postMessage({id,data,elapsedMs:performance.now()-started});
 }catch(error){self.postMessage({id,error:error.message||String(error)});}
};
