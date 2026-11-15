// Browser check: frozen saved-comparison lifecycle across settings replacement and delayed results.
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
  await page.addInitScript(()=>{
   const RealWorker=window.Worker;
   window.Worker=class extends RealWorker{
    constructor(...args){super(...args);this.addEventListener('message',event=>{
     if(window.holdComparisonResults){event.stopImmediatePropagation();window.heldWorker=this;window.heldResult=event.data;}
    });}
   };
  });
  await page.goto('http://127.0.0.1:'+server.address().port);
  const ready=()=>page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  await ready();
  await page.fill('#num_dose','500');await ready();
  await page.fill('#regimenName','Frozen 500 mg');await page.click('#saveRegimen');
  await page.click('#saveBaseline');
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  const comparisonCurves=()=>page.evaluate(()=>Object.fromEntries(window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().series.filter(s=>s.name==='Frozen 500 mg'||s.name?.startsWith('Baseline:')).map(s=>[s.name,s.data])));
  const waitComparisons=()=>page.waitForFunction(()=>{const chart=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'));const s=chart?.getOption().series||[];return s.some(s=>s.name==='Frozen 500 mg')&&s.some(s=>s.name?.startsWith('Baseline:'));});
  await waitComparisons();const frozen=await comparisonCurves();
  const savedLabel=await page.locator('#regimenRows tr').first().locator('td').nth(1).textContent();
  assert.match(savedLabel,/500 mg/);
  const verify=async expected=>{
   await page.waitForFunction(expected=>{const s=window.AyFluxResearchBridge.snapshot();return s.updated&&Object.entries(expected).every(([key,value])=>JSON.stringify(s.config[key])===JSON.stringify(value));},expected,{timeout:60000});
   await ready();await page.click('[data-tab="concentration"]');await page.locator('#plasmaChart').scrollIntoViewIfNeeded();await waitComparisons();
   assert.deepEqual(await comparisonCurves(),frozen);
   assert.equal(await page.locator('#regimenRows tr').first().locator('td').nth(1).textContent(),savedLabel);
  };
  await page.click('[data-tab="research"]');await page.click('#resetDefaults');await verify({dose:700});
  await page.click('[data-tab="research"]');await page.click('#undoImport');
  await page.click('[data-tab="concentration"]');await verify({dose:500});
  const payload=await page.evaluate(()=>({format:'acyclovir-pk-simulator',schemaVersion:2,config:{...window.RenalPKV7.DEFAULTS,dose:250},primary:'No dialysis',visibleScenarios:['No dialysis'],appearance:{palette:'standard'}}));
  await page.setInputFiles('#loadConfig',{name:'comparison-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});await verify({dose:250});
  await page.click('[data-tab="research"]');await page.locator('[data-guided="noKidney"]').click();await verify({dose:700,crcl:0});
  await page.selectOption('#studySelect','laskin-normal');await verify(await page.evaluate(()=>window.AyFluxStudies.find('laskin-normal').config));
  // Keep Worker completion under explicit control: assertions do not rely on machine speed.
  await page.evaluate(()=>{
   window.holdComparisonResults=true;
   const horizon=document.querySelector('#num_horizon');horizon.value='24';horizon.dispatchEvent(new Event('input',{bubbles:true}));
   const input=document.querySelector('#num_dose');
   for(const value of ['525','550','575']){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}
  });
  await page.waitForFunction(()=>!!window.heldResult,null,{timeout:60000});
  assert.equal(await page.locator('#saveRegimen').isDisabled(),true);
  assert.equal(await page.locator('#saveBaseline').isDisabled(),true);
  assert.equal(await page.textContent('#baselineDelta'),'','do not describe old results as current');
  assert.match(await page.textContent('#regimenCaption'),/common window 0–96 h/,'pending current horizon must not shorten the saved-only table');
  await page.click('#clearBaseline');
  assert.equal(await page.locator('#clearBaseline').isDisabled(),true);
  assert.doesNotMatch(await page.textContent('#baselineStatus'),/Frozen baseline/);
  await page.locator('[data-remove-regimen="0"]').click();
  await page.evaluate(()=>window.heldWorker.onmessage({data:window.heldResult}));await ready();
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{const series=window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().series;return !series.some(s=>s.name==='Frozen 500 mg'||s.name?.startsWith('Baseline:'));});
  assert.deepEqual(await comparisonCurves(),{});
  assert.equal(await page.locator('[data-remove-regimen]').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Saved baseline and regimen curves/labels survive Reset, Undo, JSON import, guided/study presets; rapid changes disable saves, and delayed Worker completion preserves clear/remove.');
 }finally{try{await browser?.close();}finally{server.close();}}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
