// Ueno et al., Cureus 2025, Figure 3. Source matrix = whole blood.
'use strict';
const assert=require('node:assert/strict');
const engine=require('../../public/assets/pk-engine.js');
const beforeHours=100/60, hdfHours=4, span=beforeHours+hdfHours;
const source={acv:[6.45,.85],cmmg:[10.5,.70],netUltrafiltrationL:1.6,substitutionL:4};
const drops=Object.fromEntries(['acv','cmmg'].map(k=>{
  const [pre,post]=source[k];
  return [k,{spanDropPct:100*(1-post/pre),spanApparentHalfLifeH:span*Math.LN2/Math.log(pre/post)}];
}));
const convectiveFlow=(source.netUltrafiltrationL+source.substitutionL)/hdfHours; // L/h
const rows=[];
for(const weight of [50,70,90]) for(const crcl of [0,5]) {
  const cfg={...engine.DEFAULTS,weight,crcl,crclSource:'manual',renalMode:'constant',
    draws:1,variability:0};
  const p=engine.drawParams(cfg)[0], intrinsic=p.mn+p.mr;
  const [pre,post]=source.cmmg;
  // For zero further formation, integrate the piecewise constant elimination rate.
  const minimumHdf=Math.max(0,(p.vm*Math.log(pre/post)-intrinsic*span)/hdfHours);
  const ratio=cl=>Math.exp(-(intrinsic*span+cl*hdfHours)/p.vm);
  assert.ok(Math.abs(ratio(minimumHdf)-post/pre)<1e-12);
  rows.push({weight,crcl,volumeL:p.vm,minimumEffectiveHdfMlMin:minimumHdf/.06,
    maximumDropWithConvectionAlonePct:100*(1-ratio(convectiveFlow)),
    maximumDropWithDefaultHdPct:100*(1-ratio(p.hd*cfg.metDial))});
}
console.log(JSON.stringify({source,beforeHours,hdfHours,span,drops,convectiveFlowLh:convectiveFlow,
  convectiveFlowMlMin:convectiveFlow/.06,rows},null,2));
