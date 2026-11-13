// Browser check: published-study overlay, evidence scorecard and CMMG/acyclovir AUC ratio readout.
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
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  const series=()=>page.evaluate(()=>window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[]);
  // Default page: ratio readout present, no measured points.
  await page.waitForFunction(()=>/CMMG\/acyclovir AUC ratio over hours \d+–\d+: \d+%/.test(document.querySelector('#cmmgRatioResult').textContent),null,{timeout:60000});
  assert.ok(!(await series()).some(s=>s.type==='scatter'));

  // Load Laskin 1982: regimen applied, 12 published means drawn at the published times and values.
  await page.selectOption('#studySelect','laskin-normal');
  await page.waitForFunction(()=>{
   const s=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[];
   return s.some(x=>x.type==='scatter'&&x.data.length===12);
  },null,{timeout:60000});
  const points=(await series()).find(s=>s.type==='scatter');
  assert.match(points.name,/Laskin 1982/);
  assert.deepEqual(points.data[3],[1,11.4]);
  assert.equal(await page.inputValue('#num_dose'),'395.5');
  assert.match(await page.textContent('#studyStatus'),/n=3/);
  assert.ok(await page.locator('#scenarioNote').isVisible());

  // Changing the regimen hides the points and says why; undo restores the previous settings.
  await page.fill('#num_dose','500');await page.locator('#num_dose').dispatchEvent('change');
  await page.waitForFunction(()=>/no longer match/.test(document.querySelector('#studyStatus').textContent));
  await page.waitForFunction(()=>{
   const s=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[];
   return s.length&&!s.some(x=>x.type==='scatter');
  },null,{timeout:60000});
  await page.selectOption('#studySelect','');
  assert.equal(await page.textContent('#studyStatus'),'');

  // Scorecard on the Methods tab: one row per study, finite ratios, figure, CSV and load buttons.
  const count=await page.evaluate(()=>window.AyFluxStudies.STUDIES.length);
  const pointCount=await page.evaluate(()=>window.AyFluxStudies.STUDIES.reduce((n,s)=>n+s.points.length+(s.cmmgPoints||[]).length,0));
  await page.click('[data-tab="method"]');
  await page.waitForFunction(n=>document.querySelectorAll('#scorecardRows [data-study]').length===n&&!document.querySelector('#scorecardCsv').disabled,count,{timeout:120000});
  const rows=await page.$$eval('#scorecardRows tr',trs=>trs.map(tr=>[...tr.cells].map(td=>td.textContent)));
  assert.equal(rows.length,count);
  for(const row of rows){assert.ok(Number(row[3])>0.3&&Number(row[3])<3,row.join(' | '));assert.match(row[4],/^\d+ of \d+$/);}
  assert.equal(rows[0][3],'0.77');
  assert.match(await page.textContent('#scorecardCaption'),new RegExp(pointCount+' points; bias ratio'));
  await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#scorecardFigure')),null,{timeout:60000});
  const figure=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#scorecardFigure')).getOption());
  assert.equal(figure.xAxis[0].type,'log');
  assert.equal(figure.series.filter(s=>s.type==='scatter').reduce((n,s)=>n+s.data.length,0),pointCount);
  // Residuals view: one point per published value, a line at predicted ÷ observed = 1,
  // and peak/trough markers only where the source labels the sample.
  await page.locator('#residualFigure').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#residualFigure')),null,{timeout:60000});
  const residual=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#residualFigure')).getOption());
  const unity=residual.series.find(s=>s.name==='Predicted = observed (1)');
  assert.ok(unity&&unity.data.every(p=>p[1]===1)&&unity.lineStyle.type==='solid');
  const residualPoints=residual.series.filter(s=>s.type==='scatter').flatMap(s=>s.data);
  assert.equal(residualPoints.length,pointCount);
  const peaks=residual.series.find(s=>s.name==='Reported peak').data,troughs=residual.series.find(s=>s.name==='Reported trough').data;
  assert.equal(peaks.length,8);assert.equal(troughs.length,9);
  assert.ok(troughs.every(p=>p.symbolRotate===180)&&peaks.every(p=>p.symbol==='triangle'&&p.symbolRotate===0));
  assert.equal(await page.locator('#residualRows tr').count(),count);
  assert.match(await page.textContent('#residualRows'),/All below 1 \(underpredicted\)/);
  assert.match(await page.textContent('#residualRows'),/\(author-fitted\)/);
  assert.match(await page.textContent('#residualStatus'),/points are below 1/);
  const [download]=await Promise.all([page.waitForEvent('download'),page.click('#scorecardCsv')]);
  const csv=fs.readFileSync(await download.path(),'utf8').trim().split('\n');
  assert.equal(csv.length,1+pointCount);
  assert.equal(download.suggestedFilename(),'ayflux_evidence_scorecard.csv');
  await page.click('#scorecardRows [data-study="laskin-anuric"]');
  await page.waitForFunction(()=>{
   const s=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[];
   return s.some(x=>x.type==='scatter'&&x.data.length===3);
  },null,{timeout:60000});
  assert.equal(await page.inputValue('#num_crcl'),'0');
  // Kacirova reports CMMG too: its points appear on the CMMG graph.
  await page.selectOption('#studySelect','kacirova');
  await page.locator('#cmmgChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
   const s=window.echarts?.getInstanceByDom(document.querySelector('#cmmgChart'))?.getOption()?.series||[];
   return s.some(x=>x.type==='scatter'&&x.data.length===2&&x.data[1][1]===0.64);
  },null,{timeout:60000});
  // A dialysis study switches the selected scenario.
  await page.selectOption('#studySelect','boelaert-4');
  await page.waitForFunction(()=>document.querySelector('#primary').value==='Peritoneal dialysis');
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>{
   const s=window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series||[];
   return s.some(x=>x.type==='scatter'&&x.data.length===4);
  },null,{timeout:60000});
  assert.deepEqual(errors,[]);
  console.log('Study overlay, scorecard and CMMG ratio checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
