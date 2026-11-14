const test=require('node:test');
const assert=require('node:assert/strict');
const pk=require('../public/assets/pk-engine.js');
const {eventCSV,teachingNote}=require('../public/assets/teaching-exports.js');

test('event table preserves co-timed samples, mixed-route doses and dialysis boundaries',()=>{
 const mode='Intermittent HD';
 const c={...pk.DEFAULTS,fitMode:mode,hdStart:2,hdDuration:4,renalMode:'profile',
  renalProfile:[{time:0,crcl:0},{time:6,crcl:30}],dosingMode:'custom',
  customDoses:[{time:2,route:'Acyclovir IV',amount:100,infusion:2},{time:2,route:'Valacyclovir oral',amount:500}],
  observations:[{time:2,analyte:'cmmg',role:'holdout',value:0}]};
 const [header,...lines]=eventCSV(c,mode).trim().split('\r\n').map(s=>s.split(','));
 const rows=lines.map(values=>Object.fromEntries(header.map((k,i)=>[k,values[i]])));
 const atTwo=rows.filter(r=>r.TIME==='2');
 assert.deepEqual(atTwo.map(r=>r.EVID),['2','0','1','1']);
 assert.deepEqual(atTwo.map(r=>r.CMT),['1','4','1','3']);
 assert.deepEqual(atTwo.map(r=>r.RATE),['0','0','50','0']);
 assert.equal(atTwo[1].ROLE,'2');assert.equal(atTwo[1].DV,'0');
 assert.ok(atTwo.every(r=>r.CRCL==='10'&&r.RRT==='1'));
 assert.equal(rows.find(r=>r.TIME==='6').RRT,'0');
});

test('teaching note reports the simulated horizon, coverage and actual CG weight',()=>{
 const c={...pk.DEFAULTS,horizon:12,coverage:0.8,crclSource:'estimated',draws:1};
 const result=pk.simulate(pk.effectiveConfig(c),'No dialysis');
 const note=teachingNote(c,'No dialysis',result,{fitted:false},'No dialysis','test','');
 assert.match(note,/AUC \(0–12 h\)/);
 assert.match(note,/80% unfitted model interval/);
 assert.match(note,/Cockcroft–Gault using 70.0 kg/);
 assert.match(note,/Pre-dose plasma acyclovir at 8 h/);
});
