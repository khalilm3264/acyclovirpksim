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
  // Tabs expose selection, support manual keyboard activation and return to results.
  assert.equal(await page.locator('#tabs[role="tablist"] [role="tab"]').count(),7);
  assert.equal(await page.locator('#tabs [aria-selected="true"]').getAttribute('id'),'tab-concentration');
  await page.locator('#tab-concentration').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-clearance');
  assert.ok(await page.locator('#concentration').isVisible(),'Arrow keys move focus without changing panels');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#clearance').isVisible());
  assert.equal(await page.locator('#tab-clearance').getAttribute('aria-selected'),'true');
  await page.keyboard.press('End');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-method');
  await page.keyboard.press('Space');
  assert.ok(await page.locator('#method').isVisible());
  assert.ok(await page.locator('#reference').isVisible());
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-concentration');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-method');
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-concentration');
  assert.equal(await page.locator('#tabs [tabindex="0"]').count(),1);
  // Results first: summary, then the plasma graph, then the optional comparison tools.
  const order=await page.evaluate(()=>{const top=s=>document.querySelector(s).getBoundingClientRect().top+scrollY;
   return {summary:top('.summary-card'),chart:top('#plasmaChart'),tools:top('#comparisonTools'),baseline:top('#baselinePanel'),regimen:top('#regimenPanel')};});
  assert.ok(order.summary<order.chart&&order.chart<order.tools&&order.tools<order.baseline&&order.baseline<order.regimen,JSON.stringify(order));
  // Comparison instructions precede actions and every form field has a visible label.
  for(const [status,action] of [['baselineStatus','saveBaseline'],['regimenStatus','regimenName'],['postHdRule','applyPostHd']]) {
   const boxes=await page.evaluate(([status,action])=>({text:document.getElementById(status).getBoundingClientRect().bottom,action:document.getElementById(action).getBoundingClientRect().top}),[status,action]);
   assert.ok(boxes.action>=boxes.text,'Comparison action follows its instructions: '+action);
  }
  for(const id of ['regimenName','predictMetric','predictChoice']) {
   assert.ok(await page.locator('label[for="'+id+'"]').isVisible(),'Visible comparison field label: '+id);
  }
  // Summary hierarchy: three plasma acyclovir numbers lead, the rest are secondary, and the guide names the level to read.
  assert.deepEqual(await page.$$eval('#metrics .metric.primary .key',n=>n.map(e=>e.textContent)),['Peak plasma acyclovir','Plasma acyclovir AUC','Plasma acyclovir trough']);
  assert.ok(await page.locator('#metrics .metric.minor').count()>=5);
  assert.match(await page.textContent('#levelGuide'),/start with plasma acyclovir/);
  assert.match(await page.textContent('#troughMetric'),/just before the last dose/);
  const primaryWidths=await page.locator('#metrics .metric.primary').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().width));
  const metricsWidth=await page.locator('#metrics').evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(primaryWidths.every(width=>width>metricsWidth*0.28),'Primary metrics use the available row');
  await page.locator('#levelGuide summary').click();
  assert.ok(await page.locator('#levelGuide details p').isVisible());
  await page.locator('#levelGuide summary').click();
  await page.locator('.graph-help summary').click();
  assert.ok(await page.locator('.graph-help .zoom-hint').isVisible());
  await page.locator('.graph-help summary').click();
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
  const navBounds=await page.locator('#tabs').boundingBox();
  const finalTabBounds=await page.locator('#tab-method').boundingBox();
  assert.ok(finalTabBounds.width>navBounds.width*0.98,'Final phone tab fills its row');
  for(const button of await page.locator('#tabs [role="tab"]').all()) {
   const bounds=await button.boundingBox();assert.ok(bounds.height>=39.9,'Tab touch target');
  }
  const troughWidth=await page.locator('#troughMetric').evaluate(el=>el.getBoundingClientRect().width);
  const phoneMetricsWidth=await page.locator('#metrics').evaluate(el=>el.getBoundingClientRect().width);
  assert.ok(troughWidth>phoneMetricsWidth*0.9,'Phone trough uses a full row');
  for(const id of ['concUnit','csv']) {
   const height=await page.locator('#'+id).evaluate(el=>el.getBoundingClientRect().height);
   assert.ok(height>=39.9,'Phone picker '+id+' target height '+height);
  }
  await page.locator('#scenarioDifference summary').click();
  for(const id of ['saveBaseline','clearBaseline','regimenName','saveRegimen','predictMetric','predictChoice','revealPrediction','differenceFrom','differenceTo','applyPostHd']) {
   const bounds=await page.locator('#'+id).boundingBox();
   assert.ok(bounds.height>=39.9,'Comparison phone target '+id+' '+JSON.stringify(bounds));
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,'Comparison phone field fits '+id);
  }
  const predictionFields=await page.locator('.predict-row .comparison-field').evaluateAll(fields=>fields.map(field=>field.getBoundingClientRect().top));
  assert.ok(predictionFields[1]>predictionFields[0],'Prediction fields stack on a phone');
  await page.locator('#scenarioDifference summary').click();
  // Guide navigation follows all content at desktop and phone widths.
  for (const width of [1280,390]) {
   await page.setViewportSize({width,height:900});
   for (const guide of ['/learn/index.html','/learn/interoperability/index.html',
    '/explore/index.html','/research/pediatric/index.html','/research/pediatric/evidence.html',
    '/research/sampling/index.html','/research/exchanges/index.html','/research/mass-recovery/index.html']) {
    await page.goto('http://127.0.0.1:'+server.address().port+guide);
    assert.equal(await page.locator('header.site-header .ay-guide-link[href="/"]').count(),1);
    assert.equal(await page.locator('footer.site-footer').count(),1);
    assert.equal(await page.locator('main > :last-child.actions a[href="/"]').count(),1);
    await page.locator('main > .actions').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('main > .actions a').isVisible());
    for (const control of await page.locator('.tool-controls select, .tool-controls input[type="number"], main .btn').all()) {
     const bounds=await control.boundingBox();
     if (bounds && await control.isVisible()) {
      const id=await control.getAttribute('id');
      assert.ok(bounds.height >= (width < 640 ? 39.9 : 34.9),guide+' control '+id+' '+JSON.stringify(bounds));
     }
    }
    const dimensions=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert.ok(dimensions.page<=dimensions.viewport+2,guide+' '+JSON.stringify(dimensions));
   }
  }
  assert.deepEqual(errors,[]);
  console.log('Results-first layout, summary hierarchy and dosing-weight checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
