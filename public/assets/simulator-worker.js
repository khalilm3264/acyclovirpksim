'use strict';
// Dedicated same-origin Web Worker running the shared PK model.
importScripts('/assets/pk-engine.js');
self.onmessage=event=>{
  const {id,config}=event.data;
  try { self.postMessage({id,data:self.RenalPKV7.simulateMany(config)}); }
  catch(error) { self.postMessage({id,error:error instanceof Error?error.message:String(error)}); }
};
