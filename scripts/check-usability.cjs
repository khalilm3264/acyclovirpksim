// Browser check: results-first layout, summary hierarchy, start-here strip and dosing-weight inputs.
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
  // Results first: summary, then the plasma graph, then the optional comparison tools.
  const order=await page.evaluate(()=>{const top=s=>document.querySelector(s).getBoundingClientRect().top+scrollY;
   return {summary:top('.summary-card'),chart:top('#plasmaChart'),tools:top('#comparisonTools'),baseline:top('#baselinePanel'),regimen:top('#regimenPanel')};});
  assert.ok(order.summary<order.chart&&order.chart<order.tools&&order.tools<order.baseline&&order.baseline<order.regimen,JSON.stringify(order));
  // Summary hierarchy: three plasma acyclovir numbers lead, the rest are secondary, and the guide names the level to read.
  assert.deepEqual(await page.$$eval('#metrics .metric.primary .key',n=>n.map(e=>e.textContent)),['Peak plasma acyclovir','Plasma acyclovir AUC','Plasma acyclovir trough']);
  assert.ok(await page.locator('#metrics .metric.minor').count()>=5);
  assert.match(await page.textContent('#levelGuide'),/start with plasma acyclovir/);
  assert.match(await page.textContent('#troughMetric'),/just before the last dose/);
  // Start-here strip can be dismissed.
  assert.ok(await page.isVisible('#startHere'));await page.click('#startHereClose');assert.ok(!(await page.isVisible('#startHere')));
  // Height unlocks BMI, ideal and adjusted body weight; Cockcroft–Gault can use them.
  assert.match(await page.textContent('#doseWeightTip'),/700 mg = 10 mg\/kg of actual weight\.$/);
  await page.fill('#num_weight','120');await page.dispatchEvent('#num_weight','input');
  await page.selectOption('#heightUnit','in');await page.fill('#heightValue','70');await page.dispatchEvent('#heightValue','change');
  assert.match(await page.textContent('#bodySizeTip'),/BMI 38\.0 kg\/m² · ideal body weight 73 kg · adjusted 91\.8 kg\..*no obesity-specific adjustment/);
  assert.match(await page.textContent('#doseWeightTip'),/5\.83 mg\/kg of actual weight · 9\.59 mg\/kg ideal · 7\.63 mg\/kg adjusted/);
  assert.equal(await page.inputValue('#sizeSex'),'male');
  await page.selectOption('#sizeSex','female');
  assert.match(await page.textContent('#bodySizeTip'),/ideal body weight 68\.5 kg/);
  await page.selectOption('#sizeSex','male');
  await page.selectOption('#crclSource','estimated');
  assert.equal(await page.textContent('#cgOutput'),'141.7 mL/min');
  assert.match(await page.textContent('#cgWeightTip'),/many hospital protocols use ideal or adjusted weight/);
  await page.selectOption('#cgWeight','ideal');assert.equal(await page.textContent('#cgOutput'),'86.2 mL/min');
  await page.selectOption('#cgWeight','adjusted');assert.equal(await page.textContent('#cgOutput'),'108.4 mL/min');
  await page.waitForFunction(()=>/CrCl 108\.4 mL\/min \(Cockcroft–Gault, adjusted body weight\)/.test(document.querySelector('#scenarioWords').textContent),null,{timeout:60000});
  // Clearing the height returns the estimate to actual weight.
  await page.fill('#heightValue','');await page.dispatchEvent('#heightValue','change');
  assert.equal(await page.textContent('#cgOutput'),'141.7 mL/min');assert.ok(await page.isDisabled('#cgWeight'));
  // An out-of-range height is rejected and changes nothing.
  await page.selectOption('#heightUnit','cm');await page.fill('#heightValue','20');await page.dispatchEvent('#heightValue','change');
  assert.equal(await page.textContent('#cgOutput'),'141.7 mL/min');
  // Phone width: no sideways scrolling.
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.documentElement.scrollWidth<=window.innerWidth+2,null,{timeout:10000});
  assert.deepEqual(errors,[]);
  console.log('Results-first layout, summary hierarchy and dosing-weight checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
