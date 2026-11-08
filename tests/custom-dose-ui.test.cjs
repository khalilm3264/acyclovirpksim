'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../public/assets/pk-engine.js');

const src=fs.readFileSync(path.join(__dirname,'../public/assets/simulator-ui.js'),'utf8');
const begin=src.indexOf('function renderDoseRows(){');
const end=src.indexOf('function paintDoses(){',begin);
assert.ok(begin>=0&&end>begin,'Custom dose editor must exist');
const renderSource=src.slice(begin,end);

test('custom-dose editor renders infusion inputs only for IV rows',()=>{
 const data=[
  {time:0,route:'Valacyclovir oral',amount:1000},
  {time:12,route:'Acyclovir IV',amount:500,infusion:1}
 ];
 const elements={doseRows:{innerHTML:''},doseCountPreview:{textContent:''}};
 const $=id=>elements[id];
 const render=new Function('doseDraft','E','$','paintDoses','checkDoseDraft',renderSource+'\nreturn renderDoseRows;')
   (data,pk,$,()=>{},()=>[]);
 render();
 const html=elements.doseRows.innerHTML;
 const sections=html.split('<div class="dose-row ').slice(1);
 assert.equal(sections.length,2);
 assert.ok(sections[0].startsWith('dose-row--oral'));
 assert.ok(!sections[0].includes('IV infusion (hours)'));
 assert.ok(!sections[0].includes('data-dose-field="infusion"'));
 assert.ok(sections[1].includes('data-dose-field="infusion"'));
 assert.ok(sections[1].includes('IV infusion (hours)'));
 assert.ok(elements.doseCountPreview.textContent.includes('2 planned administrations'));

 // Changing the first row to IV should make the IV-only input appear.
 data[0].route='Acyclovir IV';data[0].infusion=1;
 render();
 assert.equal((elements.doseRows.innerHTML.match(/IV infusion \(hours\)/g)||[]).length,2);

 // Changing it back to oral should hide the IV input again.
 data[0].route='Valacyclovir oral';
 render();
 assert.equal((elements.doseRows.innerHTML.match(/IV infusion \(hours\)/g)||[]).length,1);
});

test('custom oral dose does not require infusion, but IV dose still does',()=>{
 const config={...pk.DEFAULTS,dosingMode:'custom',
  customDoses:[{time:0,route:'Valacyclovir oral',amount:1000}]};
 assert.deepEqual(pk.validateDoses(config),[]);
 assert.ok(pk.validateDoses({...config,customDoses:[{time:0,route:'Acyclovir IV',amount:500}]}).some(x=>x.includes('IV infusion')));
 assert.equal(pk.buildDoses(config)[0].infusion,0);
});
