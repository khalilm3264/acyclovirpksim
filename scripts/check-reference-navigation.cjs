'use strict';
const assert=require('node:assert/strict');
module.exports=async function checkReferenceNavigation(page){
 const base=page.url().split('#')[0];
 async function reference(id){
  await page.waitForFunction(id=>document.querySelector('#tab-method').getAttribute('aria-selected')==='true'&&
   document.getElementById(id).getClientRects().length&&document.activeElement.id===id,id);
  const rect=await page.locator('#'+id).boundingBox();
  assert.ok(rect.y>=-2&&rect.y<900,'Reference target is scrolled into view');
 }
 // A fresh document models opening a copied citation in a new tab.
 await page.goto('about:blank');await page.goto(base+'#ref3');await reference('ref3');
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated);
 await page.fill('#num_dose','725');
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated&&window.AyFluxResearchBridge.snapshot().config.dose===725);
 await page.click('#tab-concentration');
 await page.goto(base+'#ref21');await reference('ref21');
 assert.equal(await page.locator('#num_dose').inputValue(),'725','Fragment navigation preserves unsaved settings');
 await page.goBack();await reference('ref3');
 assert.equal(await page.locator('#num_dose').inputValue(),'725');
 await page.click('#tab-concentration');await page.goto(base+'#ref9999');
 assert.equal(await page.locator('#tab-concentration').getAttribute('aria-selected'),'true','Unknown reference fragments do not change sections');
 // Restore the fresh default fixture expected by subsequent usability checks.
 await page.goto('about:blank');await page.goto(base);
 await page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated);
 console.log('Direct reference links, hash changes and Back reveal citations without resetting unsaved inputs.');
};
