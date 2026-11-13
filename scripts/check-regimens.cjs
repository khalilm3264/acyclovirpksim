// Browser check: regimen comparison, post-HD dose timing and the scorecard residual figure.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');

async function main(){
 const root=path.resolve(__dirname,'../public');
 const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)||!fs.statSync(file,{throwIfNoEntry:false})?.isFile()){response.writeHead(404).end();return;}
  response.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  const plasma=()=>page.evaluate(()=>window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[]);
  await ready();
  await page.fill('#num_crcl','5');await page.locator('#num_crcl').dispatchEvent('change');await ready();
  await page.fill('#regimenName','Unadjusted');await page.click('#saveRegimen');
  await page.fill('#labelBsa','1.73');await page.locator('#labelBsa').dispatchEvent('change');
  await page.waitForFunction(()=>!document.querySelector('#labelAdjust').disabled);
  await page.click('#labelAdjust');await ready();
  await page.fill('#regimenName','Label');await page.click('#saveRegimen');
  // Frozen: later edits leave saved rows intact.
  const before=await page.$$eval('#regimenRows tr',trs=>trs.slice(0,2).map(tr=>tr.textContent));
  await page.fill('#num_weight','60');await page.locator('#num_weight').dispatchEvent('change');await ready();
  const after=await page.$$eval('#regimenRows tr',trs=>trs.slice(0,2).map(tr=>tr.cells[1].textContent));
  assert.match(after[0],/700 mg/);assert.match(after[1],/350 mg/);assert.equal(before.length,2);
  assert.equal(await page.locator('#regimenRows tr').count(),3,'two saved rows and the current row');
  assert.match(await page.textContent('#regimenCaption'),/start of the last dose/);
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const s=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[];return s.some(x=>x.name==='Unadjusted')&&s.some(x=>x.name==='Label');},null,{timeout:60000});
  // Prediction exercise: results hidden, then revealed with a verdict.
  await page.check('#predictMode');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('#plasmaChart')).visibility),'hidden');
  assert.equal(await page.locator('#regimenRows tr').count(),2,'current row hidden while predicting');
  assert.match(await page.textContent('#regimenRows'),/\?/);assert.match(await page.textContent('#regimenRows'),/Doses at hour 0, 8, 16/);
  await page.selectOption('#predictChoice','0');await page.click('#revealPrediction');
  assert.match(await page.textContent('#predictResult'),/^(Correct|Not this time)\. Highest trough acyclovir: Unadjusted/);
  assert.equal(await page.evaluate(()=>document.querySelector('main').classList.contains('predicting')),false);
  // Post-HD timing preview for IV acyclovir on intermittent HD.
  await page.selectOption('#primary','Intermittent HD');await ready();
  await page.waitForFunction(()=>!document.querySelector('#applyPostHd').disabled,null,{timeout:60000});
  assert.match(await page.textContent('#postHdRule'),/additional dose is given after each dialysis/);
  const added=await page.$$eval('#postHdRows tr',trs=>trs.filter(tr=>/Added after HD/.test(tr.textContent)).length);
  assert.ok(added>=1);
  const doseRows=await page.locator('#postHdRows tr').count();
  await page.click('#applyPostHd');await ready();
  assert.equal(await page.evaluate(()=>document.querySelector('#customDoseSummary')!==null),true,'now a custom schedule');
  assert.ok(await page.locator('#applyPostHd').isDisabled(),'not offered again for a custom schedule');
  // Provenance view for a published case and the scorecard column.
  await page.selectOption('#studySelect','vasquez');
  await page.waitForFunction(()=>!document.querySelector('#studyProvenance').classList.contains('hidden'));
  assert.match(await page.textContent('#studyProvenanceCounts'),/8 reported by the source, 2 calculated from reported values, 2 assumed by AyFlux, 1 unknown/);
  assert.match(await page.textContent('#studyProvenanceRows'),/Time from last dose to admission\s*Unknown/);
  await page.selectOption('#studySelect','laskin-normal');
  await page.waitForFunction(()=>/not yet been recorded/.test(document.querySelector('#studyProvenanceCounts').textContent));
  // Residual figure on the Methods tab.
  await page.click('[data-tab="method"]');
  await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#residualFigure')),null,{timeout:120000});
  const points=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#residualFigure')).getOption().series.filter(s=>s.type==='scatter').reduce((n,s)=>n+s.data.length,0));
  const prov=await page.$$eval('#scorecardRows tr',trs=>trs.map(tr=>tr.cells[5]?.textContent||''));
  assert.ok(prov.some(t=>/R 8 C 2 A 2 U 1/.test(t)),'Vasquez counts in the scorecard');assert.ok(prov.some(t=>/Not yet recorded/.test(t)));
  assert.equal(points,await page.evaluate(()=>window.AyFluxStudies.STUDIES.reduce((n,s)=>n+s.points.length+(s.cmmgPoints||[]).length,0)));
  assert.ok(doseRows>0);
  assert.deepEqual(errors,[]);
  // Per-study table under the residuals figure: one row per study, label peaks/troughs, Boelaert author-fitted.
  await page.waitForFunction(n=>document.querySelectorAll('#residualRows tr').length===n,await page.evaluate(()=>window.AyFluxStudies.STUDIES.length),{timeout:120000});
  const residualText=await page.textContent('#residualRows');
  assert.match(residualText,/US label 5 mg\/kg[^]*?All below 1 \(underpredicted\)[^]*?0\.\d\d at 73 h[^]*?0\.\d\d at 80 h/);
  assert.match(residualText,/Boelaert 1987 CAPD, patient 1[^]*?All above 1 \(overpredicted\)[^]*?\(author-fitted\)/);
  assert.match(residualText,/\(CMMG\)/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  console.log('Regimen comparison, post-HD timing and residual figure checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
