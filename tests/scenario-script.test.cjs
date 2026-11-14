'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../public/assets/pk-engine.js'),S=require('../public/assets/scenario-script.js');
const config=()=>structuredClone(E.DEFAULTS);
test('nominal exports resolve estimated CrCl and preserve active doses and model modifiers',()=>{
 const c={...config(),crclSource:'estimated',height:165,weight:100,cgWeight:'ideal',probenecid:true};
 const s=S.snapshot(E,c,'Intermittent HD','0.27.0');
 assert.equal(s.profile[0].crcl,E.cockcroftGault(c));
 assert.equal(s.params.renal,E.drawParams({...E.effectiveConfig(c),variability:0,draws:1})[0].renal);
 assert.deepEqual(s.doses,E.buildDoses(c));assert.equal(c.draws,E.DEFAULTS.draws);
 assert.ok(s.breaks.includes(c.hdStart));assert.ok(s.breaks.includes(c.hdStart+c.hdDuration));
 assert.match(S.generate(E,c,'No dialysis','python'),/DOP853/);
 assert.match(S.generate(E,c,'No dialysis','r'),/mrgsolve::mcode/);
});
test('exports reject unsupported PD and applied fitting instead of changing the reconstruction',()=>{
 assert.throws(()=>S.snapshot(E,config(),'Peritoneal dialysis'),/PD/);
 assert.throws(()=>S.snapshot(E,config(),'Custom sequence'),/PD/);
 const c={...config(),observations:[{time:1,value:1,role:'fit',analyte:'plasma'}]};
 assert.throws(()=>S.snapshot(E,c,'No dialysis'),/fitting/);
 assert.throws(()=>S.generate(E,config(),'No dialysis','invalid'),/Python or R/);
});
test('dynamic CRRT/HD exports use per-CrCl renal parameters and include every transition',()=>{
 const c={...config(),renalMode:'profile',crclSource:'manual',renalProfile:[{time:0,crcl:10},{time:12.7,crcl:0},{time:30,crcl:20}],schedule:[{type:'CRRT',start:0,end:12},{type:'HD',start:24.7,end:28.2}],dosingMode:'custom',customDoses:[{time:0,route:'Valacyclovir oral',amount:1000},{time:16.3,route:'Acyclovir IV',amount:500,infusion:1.7}]};
 const s=S.snapshot(E,c,'Custom sequence');
 assert.equal(s.params.renal,.202);assert.equal(s.params.mr,.12);
 for(const t of [12,12.7,16.3,18,24.7,28.2,30])assert.ok(s.breaks.includes(t));
 assert.equal(s.windows.length,2);assert.equal(s.doses[0].route,'Valacyclovir oral');
});
