// Browser check: regimen comparison (up to four frozen regimens) and the
// post-hemodialysis dose timing preview.
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
  const ready=()=>page.waitForFunction(()=>window.AyFluxResearchBridge.snapshot().updated&&document.querySelector('main').getAttribute('aria-busy')!=='true',null,{timeout:60000});
  const setNumber=async(key,value)=>{await page.fill('#num_'+key,String(value));await ready();};
  const series=()=>page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#plasmaChart')).getOption().series.filter(s=>s.name?.startsWith('Saved:')).map(s=>({name:s.name,y:s.data.map(p=>p[1])})));
  const tableRows=()=>page.$$eval('#regimenTableArea tbody tr',rows=>rows.map(r=>[...r.children].map(c=>c.textContent.trim())));
  await ready();

  // ---- Regimen comparison ----
  // A name with markup is cleaned; it never becomes an element.
  await page.fill('#regimenName','<img src=x onerror=alert(1)>Low');
  await page.click('#saveBaseline');await ready();
  await setNumber('dose',1400);
  await page.fill('#regimenName','High dose');await page.press('#regimenName','Enter');await ready();
  assert.equal(await page.locator('#regimenTableArea img').count(),0);
  await setNumber('dose',350);
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#plasmaChart'))?.getOption()?.series?.filter(s=>s.name?.startsWith('Saved:')).length===2,null,{timeout:60000});
  await page.waitForFunction(()=>document.querySelectorAll('#regimenTableArea tbody tr').length===3);
  const saved=await series();
  assert.deepEqual(saved.map(s=>s.name),['Saved: img src=x onerror=alert(1)Low','Saved: High dose']);
  let rows=await tableRows();
  assert.equal(rows.length,3);assert.match(rows[2][0],/Current settings/);
  // Same shared window for every row; linear model, so AUC scales with dose (700 → 1400 → 350).
  const header=await page.textContent('#regimenTableArea thead');
  assert.match(header,/Plasma acyclovir AUC 0–96 h \(mg·h\/L\)/);assert.match(header,/Peak plasma CMMG 0–96 h \(mg\/L\)/);
  const auc=rows.map(r=>Number(r[2]));
  assert.ok(Math.abs(auc[1]/auc[0]-2)<0.02&&Math.abs(auc[2]/auc[0]-0.5)<0.02,auc.join());
  assert.match(rows[0][3],/ at 88 h$/,'trough is read just before the last dose inside the window');
  assert.match(await page.textContent('#regimenTableArea'),/just before that dose/);
  // Later edits leave saved curves intact.
  await setNumber('crcl',10);
  await page.locator('#plasmaChart').scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  assert.deepEqual(await series(),saved);
  // A shorter simulation shortens the shared window for every row.
  await setNumber('horizon',48);
  await page.waitForFunction(()=>/AUC 0–48 h/.test(document.querySelector('#regimenTableArea thead')?.textContent||''));
  // Four at most; removing one frees a slot.
  for(const name of ['C','D']){await page.fill('#regimenName',name);await page.click('#saveBaseline');await ready();}
  await page.waitForFunction(()=>/4 of 4 regimens saved/.test(document.querySelector('#baselineStatus').textContent));
  assert.ok(await page.locator('#saveBaseline').isDisabled());assert.ok(await page.locator('#regimenName').isDisabled());
  assert.match(await page.textContent('#baselineStatus'),/4 of 4 regimens saved; remove one/);
  await page.click('#regimenTableArea [aria-label="Remove C"]');await ready();
  await page.waitForFunction(()=>/3 of 4 regimens saved/.test(document.querySelector('#baselineStatus').textContent));
  assert.ok(!(await page.locator('#saveBaseline').isDisabled()));
  // Display units follow the unit selector.
  await page.selectOption('#concUnit','umol');await ready();
  await page.waitForFunction(()=>/µmol·h\/L/.test(document.querySelector('#regimenTableArea thead')?.textContent||''));
  assert.match(await page.textContent('#regimenTableArea thead'),/µmol·h\/L/);
  await page.selectOption('#concUnit','mg');await ready();
  await page.click('#clearBaseline');await ready();
  await page.waitForFunction(()=>!document.querySelector('#regimenTableArea table'));

  // ---- Dose timing after hemodialysis ----
  await setNumber('horizon',96);await setNumber('crcl',95);await setNumber('dose',700);
  await page.selectOption('#primary','No dialysis');await ready();
  await page.click('[data-tab="research"]');
  await page.click('#previewPostHd');
  assert.match(await page.textContent('#postHdStatus'),/no intermittent hemodialysis/);
  assert.ok(await page.locator('#applyPostHd').isDisabled());
  await page.click('[data-tab="concentration"]');
  await page.selectOption('#primary','Intermittent HD');await ready();
  await page.click('[data-tab="research"]');
  await page.click('#previewPostHd');
  rows=await page.$$eval('#postHdArea tbody tr',rs=>rs.map(r=>[...r.children].map(c=>c.textContent.trim())));
  assert.equal(rows.length,14);
  assert.deepEqual(rows.filter(r=>r[5]==='Added').map(r=>[r[3],r[4]]),[['—','28'],['—','76']]);
  assert.ok(rows.filter(r=>r[5]==='Kept').every(r=>r[3]===r[4]));
  assert.match(await page.textContent('#postHdArea'),/additional dose after each dialysis session \[10\]/);
  assert.match(await page.textContent('#postHdStatus'),/Nothing has been changed/);
  assert.equal(await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().config.dosingMode),'repeat','preview alone changes nothing');
  // Any settings change makes the preview stale.
  await page.click('[data-tab="concentration"]');await setNumber('dose',600);await page.click('[data-tab="research"]');
  assert.match(await page.textContent('#postHdStatus'),/Settings changed/);
  assert.ok(await page.locator('#applyPostHd').isDisabled());
  // A session ending 1 h before a scheduled dose is flagged, and needs explicit confirmation.
  await page.click('[data-tab="concentration"]');await setNumber('dose',700);await setNumber('hdStart',27);await page.click('[data-tab="research"]');
  await page.click('#previewPostHd');
  assert.match(await page.textContent('#postHdArea'),/possible duplicate/);
  assert.ok(await page.locator('#applyPostHd').isDisabled());
  await page.check('#postHdConfirm');assert.ok(!(await page.locator('#applyPostHd').isDisabled()));
  await page.uncheck('#postHdConfirm');
  await page.click('[data-tab="concentration"]');await setNumber('hdStart',24);await page.click('[data-tab="research"]');
  await page.click('#previewPostHd');
  assert.ok(!(await page.locator('#applyPostHd').isDisabled()));
  await page.click('#applyPostHd');await ready();
  let config=await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().config);
  assert.equal(config.dosingMode,'custom');assert.equal(config.customDoses.length,14);
  assert.deepEqual(config.customDoses.filter(d=>d.time===28||d.time===76).map(d=>d.amount),[700,700]);
  await page.waitForFunction(()=>/1 of 4 regimens saved/.test(document.querySelector('#baselineStatus').textContent));
  // Undo restores the earlier schedule.
  await page.click('[data-tab="research"]');await page.click('#undoImport');await ready();
  config=await page.evaluate(()=>window.AyFluxResearchBridge.snapshot().config);
  assert.equal(config.dosingMode,'repeat');
  // Valacyclovir: the HD-day dose moves to the session end; other days are kept.
  await page.click('[data-tab="concentration"]');
  await page.selectOption('#route','Valacyclovir oral');await ready();
  await setNumber('dose',500);await setNumber('every',24);
  await page.click('[data-tab="research"]');await page.click('#previewPostHd');
  rows=await page.$$eval('#postHdArea tbody tr',rs=>rs.map(r=>[...r.children].map(c=>c.textContent.trim())));
  assert.deepEqual(rows.map(r=>[r[3],r[4],r[5]]),[['0','0','Kept'],['24','28','Moved'],['48','48','Kept'],['72','76','Moved']]);
  assert.match(await page.textContent('#postHdArea'),/VALTREX label.*\[8\]/);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log('Regimen comparison and post-dialysis dose timing checks passed.');
 }finally{await browser?.close();server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
