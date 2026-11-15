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
  await require('./check-reference-navigation.cjs')(page);
  await require('./check-configuration-import-race.cjs')(page);
  await require('./check-timeline-replacement.cjs')(page);
  assert.equal(await page.locator('#jumpToWorkspace').isVisible(),false,'Mobile shortcut stays hidden on desktop');
  assert.equal(await page.locator('#jumpToInputs').isVisible(),false,'Mobile return stays hidden on desktop');
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
  const beforeJump=await Promise.all(['#num_weight','#num_dose','#primary'].map(selector=>page.inputValue(selector)));
  await page.locator('#jumpToWorkspace').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'tabs','Workspace shortcut moves keyboard focus');
  const returnBounds=await page.locator('#jumpToInputs').boundingBox();
  assert.ok(returnBounds.y>=-2&&returnBounds.y+returnBounds.height<=844,'Return link stays in view after jumping');
  await page.locator('#tab-timeline').click();
  await page.locator('#jumpToInputs').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'patientInputs');
  await page.locator('#jumpToWorkspace').click();
  assert.equal(await page.locator('#tab-timeline').getAttribute('aria-selected'),'true','Jump retains the chosen workspace tab');
  assert.deepEqual(await Promise.all(['#num_weight','#num_dose','#primary'].map(selector=>page.inputValue(selector))),beforeJump,'Jump links retain entered settings');
  for(const id of ['jumpToWorkspace','jumpToInputs']) {
   const height=await page.locator('#'+id).evaluate(el=>el.getBoundingClientRect().height);
   assert.ok(height>=39.9,'Mobile navigation target '+id);
  }
  await page.locator('#tab-concentration').click();
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
  await page.locator('#scenarioDifference summary').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#scenarioDifference').evaluate(el=>el.open),true,'Comparison details opens by keyboard');
  await page.locator('#differenceFrom').waitFor({state:'visible'});
  for(const id of ['saveBaseline','clearBaseline','regimenName','saveRegimen','predictMetric','predictChoice','revealPrediction','differenceFrom','differenceTo','applyPostHd']) {
   const bounds=await page.locator('#'+id).boundingBox();
   assert.ok(bounds.height>=39.9,'Comparison phone target '+id+' '+JSON.stringify(bounds));
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,'Comparison phone field fits '+id);
  }
  const predictionFields=await page.locator('.predict-row .comparison-field').evaluateAll(fields=>fields.map(field=>field.getBoundingClientRect().top));
  assert.ok(predictionFields[1]>predictionFields[0],'Prediction fields stack on a phone');
  await page.locator('#scenarioDifference summary').focus();
  await page.keyboard.press('Enter');
  // Timeline editors keep phone targets readable and the wide exchange table scrollable.
  await page.locator('#tab-timeline').click();
  assert.match(await page.textContent('#timelinePending'),/Apply custom timeline/);
  assert.match(await page.textContent('#dosePending'),/Apply custom timeline/);
  await page.locator('#addDose').click();
  await page.locator('#pdRxEnable').check();
  await page.locator('#generatePdRx').click();
  assert.ok(await page.locator('#pdRxRows tr').count()>0,'Generated exchange rows');
  async function checkTimelineLabels() {
   const fields=await page.locator('#scheduleRows input, #scheduleRows select, #doseRows input, #doseRows select').evaluateAll(fields=>fields.map(field=>({id:field.id,name:field.getAttribute('aria-label'),label:field.labels?.[0]?.textContent.trim()})));
   assert.ok(fields.length>0);
   assert.equal(new Set(fields.map(field=>field.id)).size,fields.length,'Timeline IDs are unique');
   for(const field of fields) {
    assert.ok(field.id&&field.label,'Each timeline field has an associated visible label');
    assert.ok(field.name.includes(field.label),'Accessible name includes the visible label');
    assert.match(field.name,/^(Session|Medication dose) [1-9][0-9]*: /);
   }
  }
  await checkTimelineLabels();
  await page.locator('label[for="timeline-session-2-start"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'timeline-session-2-start');
  await page.locator('#scheduleRows button[data-delete="0"]').click();
  await page.locator('#doseRows button[data-delete-dose="0"]').click();
  await checkTimelineLabels();
  await page.getByLabel('Medication dose 1: Medication / route',{exact:true}).selectOption('Valacyclovir oral');
  assert.equal(await page.getByLabel('Medication dose 1: IV infusion (hours)',{exact:true}).count(),0);
  await page.getByLabel('Medication dose 1: Medication / route',{exact:true}).selectOption('Acyclovir IV');
  await page.getByLabel('Medication dose 1: IV infusion (hours)',{exact:true}).waitFor();
  await checkTimelineLabels();

  for(const control of await page.locator('#scheduleRows input, #scheduleRows select, #scheduleRows button, #doseRows input, #doseRows select, #doseRows button, #pdRxRows input, #pdRxRows select, #pdRxRows button, #addRow, #addDose, #generatePdRx, #applyFullTimelineBottom').all()) {
   const bounds=await control.boundingBox();
   assert.ok(bounds.height>=39.9,'Timeline phone target '+await control.evaluate(el=>el.outerHTML)+' '+JSON.stringify(bounds));
  }
  const session=await page.locator('#scheduleRows .intervals').first().evaluate(row=>({width:row.getBoundingClientRect().width,mode:row.querySelector('select').getBoundingClientRect().width}));
  assert.ok(session.mode>session.width*0.9,'Phone session mode uses a full row');
  await page.locator('#pdRxTableWrap').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('#pdRxTableWrap').scrollLeft>0,null,{timeout:5000});
  assert.ok(await page.locator('#pdRxScrollHint').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Timeline tables scroll within the page');
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
  await require('./check-responsive-layout.cjs').checkResponsiveLayout('http://127.0.0.1:'+server.address().port);
  console.log('Results-first layout, summary hierarchy and dosing-weight checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
