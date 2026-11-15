// Exercise actual JSON file handlers with deliberately delayed browser File reads.
'use strict';
const assert=require('node:assert/strict');
module.exports=async function checkConfigurationImportRace(page){
 const config=await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().config);
 const payload=dose=>JSON.stringify({format:'acyclovir-pk-simulator',schemaVersion:2,
  config:{...config,dose},primary:'No dialysis',visibleScenarios:['No dialysis'],
  appearance:{palette:'standard'}});
 const select=(name,dose)=>page.locator('#loadConfig').setInputFiles({
  name,mimeType:'application/json',buffer:Buffer.from(payload(dose))});
 await page.evaluate(()=>{
  const original=File.prototype.text;
  window.importReadControls=[];
  File.prototype.text=function(){
   if(this.name.startsWith('delayed-'))return new Promise((resolve,reject)=>{
    window.importReadControls.push({resolve,reject,file:this});
   });
   return original.call(this);
  };
  window.restoreImportFileText=()=>{File.prototype.text=original;};
 });
 try{
  await select('delayed-older.json',111);
  await select('newer.json',222);
  await page.waitForFunction(()=>document.querySelector('#num_dose').value==='222');
  const newerStatus=await page.locator('#researchStatus').textContent();
  await page.evaluate(async text=>{
   window.importReadControls.shift().resolve(text);
   await new Promise(resolve=>setTimeout(resolve,0));
  },payload(111));
  assert.equal(await page.locator('#num_dose').inputValue(),'222');
  assert.equal(await page.locator('#researchStatus').textContent(),newerStatus);

  for(const fail of [false,true]){
   await select('delayed-reset.json',111);
   await page.evaluate(()=>document.querySelector('#resetDefaults').click());
   assert.equal(await page.locator('#loadConfig').inputValue(),'');
   const resetStatus=await page.locator('#researchStatus').textContent();
   await page.evaluate(async ({fail,text})=>{
    const read=window.importReadControls.shift();
    fail?read.reject(Error('Read failed')):read.resolve(text);
    await new Promise(resolve=>setTimeout(resolve,0));
   },{fail,text:payload(111)});
   assert.equal(await page.locator('#num_dose').inputValue(),'700');
   assert.equal(await page.locator('#researchStatus').textContent(),resetStatus);
  }

  await select('delayed-failure.json',111);
  await select('delayed-current.json',333);
  await page.evaluate(async()=>{
   window.importReadControls.shift().reject(Error('Read failed'));
   await new Promise(resolve=>setTimeout(resolve,0));
  });
  assert.ok((await page.locator('#loadConfig').inputValue()).endsWith('delayed-current.json'));
  await page.evaluate(async text=>{
   window.importReadControls.shift().resolve(text);
   await new Promise(resolve=>setTimeout(resolve,0));
  },payload(333));
  assert.equal(await page.locator('#num_dose').inputValue(),'333');
  assert.equal(await page.locator('#loadConfig').inputValue(),'');
 }finally{
  await page.evaluate(()=>{
   window.restoreImportFileText();
   document.querySelector('#resetDefaults').click();
  });
  await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated &&
   window.AyFluxResearchBridge.snapshot().config.dose===700);
 }
 console.log('JSON import races preserve newer imports, resets, status and file selection.');
};
