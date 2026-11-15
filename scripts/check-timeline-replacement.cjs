'use strict';
const assert=require('node:assert/strict');
module.exports=async function checkTimelineReplacement(page){
 const ready=()=>page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated);
 const state=()=>page.evaluate(()=>window.AyFluxResearchBridge.snapshot());
 async function reset(){await page.click('#tab-research');await page.click('#resetDefaults');await ready();}
 async function dirtyEditors(){
  await page.click('#tab-timeline');await page.click('#addDose');await page.click('#presetHD');
  const end=page.locator('#scheduleRows [data-field="end"]').first();
  await end.fill('10');await end.press('Tab');
  assert.equal(await page.locator('#timelineErrors').isVisible(),true);
  assert.equal(await page.locator('#dosePending').isVisible(),true);
 }
 async function verifyReplacement(dose){
  await page.click('#tab-timeline');
  assert.equal(await page.locator('#timelinePending').isVisible(),false);
  assert.equal(await page.locator('#dosePending').isVisible(),false);
  assert.equal(await page.locator('#timelineErrors').isVisible(),false);
  assert.equal((await state()).config.dosingMode,'repeat');
  await page.click('#applyFullTimeline');await ready();
  const restored=await state(),run=restored.results[restored.primary];
  assert.equal(restored.config.dosingMode,'repeat','Applying the restored timeline must not activate the example custom doses');
  assert.equal(run.doses.length,12);
  assert.ok(run.doses.every(d=>d.amount===dose&&d.route==='Acyclovir IV'));
 }
 await reset();const defaults=(await state()).config;
 await dirtyEditors();await reset();await verifyReplacement(700);

 // Undo restores the committed 550 mg regimen, not an abandoned editor draft.
 await reset();await page.fill('#num_dose','550');await ready();await reset();
 await dirtyEditors();await page.click('#tab-research');await page.click('#undoImport');await ready();
 await verifyReplacement(550);

 await reset();await dirtyEditors();await page.click('#tab-research');
 const payload={format:'acyclovir-pk-simulator',schemaVersion:2,config:{...defaults,dose:625},primary:'No dialysis',visibleScenarios:['No dialysis'],appearance:{palette:'standard'}};
 await page.locator('#loadConfig').setInputFiles({name:'replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated&&window.AyFluxResearchBridge.snapshot().config.dose===625);await verifyReplacement(625);
 // Discarding drafts must still preserve an intentionally custom regimen.
 await page.click('#tab-research');
 const custom={...payload,config:{...defaults,dosingMode:'custom',customDoses:[{time:0,route:'Acyclovir IV',amount:500,infusion:1},{time:24,route:'Acyclovir IV',amount:250,infusion:1}]}};
 await page.locator('#loadConfig').setInputFiles({name:'custom.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))});
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated&&window.AyFluxResearchBridge.snapshot().config.dosingMode==='custom');
 await dirtyEditors();await reset();await page.click('#undoImport');await ready();await page.click('#tab-timeline');
 assert.equal(await page.locator('#dosePending').isVisible(),false);
 await page.click('#applyFullTimeline');await ready();
 const restored=await state();assert.equal(restored.config.dosingMode,'custom');
 assert.deepEqual(restored.results[restored.primary].doses.map(d=>d.amount),[500,250]);
 await reset();await page.click('#tab-concentration');
 console.log('Reset, Undo and JSON import discard abandoned edits, preserve repeating doses and retain intentional custom regimens.');
};
