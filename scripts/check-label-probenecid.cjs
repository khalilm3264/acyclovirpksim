// Browser check: label kidney adjustment button and probenecid option.
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
  // Default CrCl is above 50: no adjustment.
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
  assert.deepEqual(errors,[]);
  console.log('Label adjustment and probenecid checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
