'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../public/assets/pk-engine.js'),S=require('../public/assets/scenario-summary.js');
function scenario(c={},mode='No dialysis'){
 const config={...structuredClone(E.DEFAULTS),variability:0,draws:1,...c};
 return {config,run:E.simulateMany({...config,requestedModes:[mode]})[mode],mode};
}
const make=({config,run,mode},meta)=>S.snapshot(E,config,run,mode,meta);
test('handout freezes the selected results and omits entered measurements and unrelated settings',()=>{
 const data=scenario(),secret=987654.321987;
 data.config.observations=[{time:2,value:secret,role:'fit',analyte:'plasma'}];data.config.privateNote='private patient name';
 const sheet=make(data,{version:'0.27.0',generatedAt:'2026-11-13T12:00:00Z'});
 assert.equal(sheet.fitCount,1);assert.equal(sheet.metrics.length,5);
 assert.equal(sheet.metrics[0].value.median,data.run.summary.peak.median);
 assert.ok(!JSON.stringify(sheet).includes(String(secret)));
 assert.ok(!JSON.stringify(sheet).includes('private patient name'));
 data.run.plasma.median[1]=-100;assert.ok(sheet.series.plasma.median[1]>=0);
 assert.equal(sheet.generatedAt,'2026-11-13T12:00:00Z');
});
test('handout rejects a missing, stale or mismatched scenario instead of labeling old results',()=>{
 const d=scenario();assert.throws(()=>S.snapshot(E,d.config,d.run,'CRRT'),/current results/);
 assert.throws(()=>make({...d,config:{...d.config,horizon:48}}),/Update/);
 d.run.time[1]=NaN;assert.throws(()=>make(d),/Update/);
});
test('handout reports estimated CrCl weight choice and PD prescription limitations',()=>{
 const d=scenario({crclSource:'estimated',height:170,weight:100,cgWeight:'adjusted',probenecid:true},'Peritoneal dialysis');
 const sheet=make(d);assert.match(sheet.kidney,/adjusted weight/);assert.match(sheet.dialysis,/PD fill/);
 assert.ok(sheet.modifiers.includes('Probenecid renal modifier enabled'));
 assert.equal(sheet.windows.length,d.run.rows.length);
});
test('long custom regimens are summarized explicitly while every plotted point is retained',()=>{
 const d=scenario({horizon:48,dosingMode:'custom',customDoses:Array.from({length:100},(_,i)=>({time:i*.4,amount:1,route:'Valacyclovir oral'}))});
 const sheet=make(d);assert.match(sheet.regimen,/100 custom administrations/);assert.match(sheet.regimen,/additional doses/);
 assert.equal(sheet.doseTimes.length,100);assert.equal(sheet.time.length,d.run.time.length);
});
