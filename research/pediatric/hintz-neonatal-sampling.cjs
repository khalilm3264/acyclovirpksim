// Hintz et al., 1982, Am J Med 73(1A):210–214. Source group means ± SD, µmol/L.
'use strict';
const assert = require('node:assert/strict');
const {profiles,indexedClearances,compare} = require('./neonatal-model-comparison.cjs');
const source=[
  {dose:5,peak:30.0,sdPeak:9.9,trough:5.3,sdTrough:3.4},
  {dose:10,peak:61.2,sdPeak:18.3,trough:10.1,sdTrough:8.4},
  {dose:15,peak:86.1,sdPeak:23.5,trough:13.8,sdTrough:11.1}
];
const rows=source.map(g=>{
  const peakMgL=g.peak*.22521, troughMgL=g.trough*.22521;
  // Assumed one-hour infusion and end-infusion/predose samples on an 8-h cycle.
  const apparentH=7*Math.LN2/Math.log(peakMgL/troughMgL);
  const scenarios=profiles.flatMap(p=>indexedClearances.map(indexed=>{
    const r=compare(p,indexed,g.dose);
    const models=Object.fromEntries(Object.entries(r.summaries).map(([name,m])=>{
      assert.ok(Math.abs(7*Math.LN2/Math.log(m.ssPeak/m.ssTrough)-m.halfLife)<1e-10);
      return [name,{peakMgL:m.ssPeak,troughMgL:m.ssTrough,halfLifeH:m.halfLife,
        peakRatio:m.ssPeak/peakMgL,troughRatio:m.ssTrough/troughMgL}];
    }));
    return {...p,indexed,models};
  }));
  return {...g,peakMgL,troughMgL,apparentH,scenarios};
});
console.log(JSON.stringify({sourceTerminalHalfLifeH:3.78,sdTerminalHalfLifeH:1.21,rows},null,2));
