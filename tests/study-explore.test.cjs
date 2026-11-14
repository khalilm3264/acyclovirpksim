'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../public/assets/pk-engine.js');
const S=require('../public/assets/study-library.js');

test('provenance keeps what the paper reports apart from what AyFlux uses',()=>{
 const v=S.find('vasquez'),row=input=>v.provenance.find(r=>r.input===input);
 // Assumed or unknown inputs must say what the source gives, not repeat the AyFlux value.
 for(const study of S.STUDIES.filter(s=>s.provenance))for(const r of study.provenance)
  if(r.status==='assumed'||r.status==='unknown')assert.notEqual(r.reported,r.used,study.id+' '+r.input);
 assert.match(row('Time from last dose to admission').reported,/Not reported/);
 assert.match(row('Time from last dose to admission').used,/^4 h/);
 assert.match(row('Dose interval').reported,/Three times daily/);assert.equal(row('Dose interval').used,'Every 8 h');
});

test('published source records identify the reported duration of the first Vasquez session',()=>{
 const study=S.find('vasquez'),duration=study.provenance.find(r=>r.input==='First HD duration');
 assert.match(duration.source,/Br J Clin Pharmacol 2025, p. 2470/);
 assert.equal(duration.status,'reported');assert.equal(duration.used,'2 h');
 assert.deepEqual(study.points.map(point=>point[1]),[8.8,3.2]);
 for(const id of ['vasquez','boelaert-1','boelaert-4','boelaert-5'])assert.equal(S.find(id).sourceCheck,undefined);
});

test('exploring the Vasquez admission gap shifts both HD sessions and the simulation end',()=>{
 const v=S.find('vasquez'),o=S.configFor(v,E);
 assert.equal(v.explore.value,4);assert.equal(v.explore.input,'Time from last dose to admission');
 for(const gap of [0,4,8,24]){
  const x=S.exploreConfig(v,E,gap),shift=gap-4;
  assert.deepEqual(x.schedule.map(r=>[r.start,r.end]),o.schedule.map(r=>[r.start+shift,r.end+shift]));
  assert.equal(x.horizon,o.horizon+shift);assert.deepEqual(x.customDoses,o.customDoses,'doses unchanged');
  assert.deepEqual(E.validate(x,v.mode),[]);
 }
 assert.deepEqual(S.exploreConfig(v,E,4),o,'the reconstruction value reproduces the original');
});

test('exploring Boelaert residual CrCl changes only CrCl; values outside the bounds are refused',()=>{
 const b=S.find('boelaert-4'),o=S.configFor(b,E),x=S.exploreConfig(b,E,5);
 assert.equal(x.crcl,5);assert.equal(x.crclSource,'manual');
 assert.deepEqual({...x,crcl:o.crcl,crclSource:o.crclSource},o);
 assert.deepEqual(E.validate(x,b.mode),[]);
 for(const bad of [-1,31,NaN])assert.throws(()=>S.exploreConfig(b,E,bad),/from 0 to 30 mL\/min/);
 assert.throws(()=>S.exploreConfig(S.find('laskin-normal'),E,1),/No editable assumption/);
 // Exploring never alters the published values.
 assert.deepEqual(S.find('boelaert-4').points,b.points);
});
