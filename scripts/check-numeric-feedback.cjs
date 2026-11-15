'use strict';
const assert=require('node:assert/strict');
module.exports=async function checkNumericFeedback(page){
 const input=page.locator('#num_dose'),note=page.locator('#inputError_dose');
 const original=await input.inputValue(),max=Number(await input.getAttribute('max'));
 for(const value of ['',String(max+1),'-1']){
  await input.fill(value);
  assert.equal(await input.getAttribute('aria-invalid'),'true');
  assert.ok(await note.isVisible());
  assert.ok((await note.textContent()).includes('the simulation uses '+original+' mg'));
  assert.equal(await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().config.dose),Number(original));
  assert.equal(await input.getAttribute('aria-describedby'),'inputError_dose');
 }
 // Returning to the already accepted value must clear feedback without a calculation.
 await input.fill(original);
 assert.equal(await input.getAttribute('aria-invalid'),null);
 assert.equal(await input.evaluate(n=>n.validationMessage),'');
 assert.equal(await note.isVisible(),false);
 await input.fill('');
 const slider=page.locator('[data-k="dose"][data-role="range"]');
 await slider.evaluate((n,value)=>{n.value=value;n.dispatchEvent(new Event('input',{bubbles:true}));},original);
 assert.equal(await input.inputValue(),original);
 assert.equal(await note.isVisible(),false);
 await input.fill('');
 await slider.evaluate(n=>{n.value=725;n.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated&&window.AyFluxResearchBridge.snapshot().config.dose===725);
 assert.equal(await input.inputValue(),'725');
 assert.equal(await input.getAttribute('aria-invalid'),null);
 assert.equal(await note.isVisible(),false);
 await page.setViewportSize({width:320,height:568});
 await input.fill(String(max+1));
 assert.ok(await note.isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await input.fill(original);
 await page.waitForFunction(expected=>window.AyFluxResearchBridge.snapshot().updated&&window.AyFluxResearchBridge.snapshot().config.dose===expected,Number(original));
 await page.setViewportSize({width:1280,height:900});
 console.log('Invalid exact values explain retained settings; valid edits and sliders clear linked feedback.');
};
