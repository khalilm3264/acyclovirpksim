// Browser check: label kidney adjustment button, probenecid option and blood-brain barrier choice.
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
  await page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  // Label comparison requires an explicit BSA; at 1.73 m² the default CrCl needs no adjustment.
  await page.fill('#labelBsa','1.73');await page.locator('#labelBsa').dispatchEvent('change');
  assert.ok(await page.locator('#labelAdjust').isDisabled());
  assert.match(await page.textContent('#labelAdjustTip'),/needs no adjustment/);
  // CrCl 5: half the dose every 24 h; current curve becomes the baseline.
  await page.fill('#num_crcl','5');await page.locator('#num_crcl').dispatchEvent('change');
  await page.waitForFunction(()=>!document.querySelector('#labelAdjust').disabled);
  assert.match(await page.textContent('#labelAdjustTip'),/50% of the dose every 24 h: 350 mg every 24 h/);
  await page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  await page.click('#labelAdjust');
  assert.equal(await page.inputValue('#num_dose'),'350');assert.equal(await page.inputValue('#num_every'),'24');
  assert.ok(await page.locator('#labelAdjust').isDisabled(),'cannot apply twice');
  await page.waitForFunction(()=>/Baseline → current/.test(document.querySelector('#baselineDelta')?.textContent||''),null,{timeout:60000});
  // Probenecid raises exposure and appears in the scenario description.
  const auc=()=>page.evaluate(()=>document.querySelectorAll('.summary-card .metric')[1]?.textContent||'');
  await page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  await page.check('#probenecid');
  await page.waitForFunction(()=>/with probenecid/.test(document.querySelector('#scenarioSummary')?.textContent||document.body.textContent),null,{timeout:60000});
  // Loading a control study resets probenecid; enabling it hides the reference points.
  await page.selectOption('#studySelect','laskin-normal');
  await page.waitForFunction(()=>!document.querySelector('#saveBaseline').disabled,null,{timeout:60000});
  await page.check('#probenecid');
  await page.waitForFunction(()=>/no longer match/.test(document.querySelector('#studyStatus').textContent),null,{timeout:60000});
  // Blood-brain barrier choice sets both CSF partitions, shows in the description, and reads Custom after a manual edit.
  assert.equal(await page.inputValue('#csfBarrier'),'intact');
  await page.selectOption('#csfBarrier','damaged');
  await page.waitForFunction(()=>/damaged blood–brain barrier/.test(document.body.textContent),null,{timeout:60000});
  await page.click('aside a[href="#advanced"]');
  await page.waitForFunction(()=>document.querySelector('#tab-advanced').getAttribute('aria-selected')==='true');
  await page.click('#advancedCsf summary');
  assert.equal(Number(await page.inputValue('#num_csfMetRatio')),0.11);assert.equal(Number(await page.inputValue('#num_csfRatio')),0.37);
  await page.fill('#num_csfMetRatio','0.2');await page.dispatchEvent('#num_csfMetRatio','input');
  await page.waitForFunction(()=>document.querySelector('#csfBarrier')?.value==='custom',null,{timeout:10000});
  await page.selectOption('#csfBarrier','intact');
  await page.waitForFunction(()=>Number(document.querySelector('#num_csfMetRatio')?.value)===0.025,null,{timeout:10000});
  assert.deepEqual(errors,[]);

  const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const phoneErrors=[];phone.on('pageerror',error=>phoneErrors.push(error.message));
  await phone.goto('http://127.0.0.1:'+server.address().port+'/#advancedCmmg');
  await phone.waitForFunction(()=>document.querySelector('#tab-advanced').getAttribute('aria-selected')==='true'&&document.querySelector('#advancedCmmg').open);
  assert.equal(await phone.evaluate(()=>document.activeElement===document.querySelector('#advancedCmmg summary')),true);
  assert.equal(await phone.locator('#num_valF').count(),0,'repeat IV does not show oral absorption assumptions');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth),390,'advanced panel and tabs fit the phone');
  assert.equal(await phone.inputValue('#draws'),'120');
  assert.equal(await phone.inputValue('#coverage'),'0.9');
  assert.equal(await phone.inputValue('#num_assayCV'),'0.15');
  assert.equal(await phone.locator('[data-toggle="showBands"]').isChecked(),true);
  await phone.fill('#num_formFactor','1.5');
  await phone.locator('#num_formFactor').dispatchEvent('change');
  await phone.selectOption('#colorPalette','accessible');
  await phone.selectOption('#draws','30');
  await phone.selectOption('#coverage','0.8');
  await phone.uncheck('[data-toggle="showBands"]');
  await phone.selectOption('#route','Valacyclovir oral');
  await phone.click('#advancedOral summary');
  assert.equal(await phone.locator('#num_valF').isVisible(),true);
  assert.equal(await phone.locator('#num_valKa').isVisible(),true);
  assert.equal(await phone.locator('#advancedCmmg').evaluate(el=>el.open),true);
  await phone.fill('#workspaceQuery','assay cv');
  await phone.getByRole('link',{name:/Uncertainty and fitting settings/}).click();
  assert.equal(new URL(phone.url()).hash,'#advancedUncertainty');
  await phone.click('#advancedAssumptions a[href="#configurationPanel"]');
  const downloadPromise=phone.waitForEvent('download');
  await phone.click('#saveConfig');
  const download=await downloadPromise;
  const saved=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(saved.schemaVersion,2);
  assert.equal(saved.config.formFactor,1.5);
  assert.equal(saved.config.draws,30);
  assert.equal(saved.config.coverage,0.8);
  assert.equal(saved.config.showBands,false);
  assert.equal(saved.config.route,'Valacyclovir oral');
  assert.equal(saved.appearance.palette,'accessible');
  assert.deepEqual(phoneErrors,[]);
  await phone.close();
  console.log('Label adjustment, probenecid, blood-brain barrier and advanced-settings checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

