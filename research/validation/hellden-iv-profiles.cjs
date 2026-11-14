// Helldén 2010 thesis, preliminary Paper V, Figure 7, printed p. 20 (PDF p. 30).
// Group profiles, µmol/L, from vector-marker centres in the original PDF.
// X 100.08–262.74 pt = 0–24 h. Y 334.64–505.28 pt = 100–0.001 µmol/L (log).
// Time is snapped to the adjacent nominal sampling time. Blank markers are absent.
'use strict';
const assert = require('node:assert/strict');
const engine = require('../../public/assets/pk-engine.js');
const times = [0,.25,.5,1,2,3,4,6,8,12,24];
const groups = [
  {group:'healthy',n:6,dose:100,crcls:[90,120],
    parent:[12.818,7.302,4.921,3.323,1.893,1.240,.963,.579,.370,.154,null],
    cmmg:[null,.199,.271,.312,.264,.178,.154,.068,.018,null,null]},
  {group:'CKD',n:6,dose:50,crcls:[25,45,60],
    parent:[13.001,8.064,6.441,4.716,3.370,2.764,2.146,1.531,1.155,.640,.161],
    cmmg:[null,.170,.246,.325,.385,.431,.375,.325,.275,.191,null]},
  {group:'HD',n:4,dose:50,crcls:[0,2],
    parent:[12.818,7.302,6.001,4.921,3.931,3.323,3.052,2.508,2.116,.963,.706],
    cmmg:[.083,.303,.687,1.046,1.597,1.789,2.116,2.884,3.140,4.280,4.160]}
];
function summarize(parent, cmmg) {
  const indices = times.map((t,i) => t >= 1 && t <= 8 ? i : -1).filter(i => i >= 0);
  function auc(values) {
    return indices.slice(1).reduce((sum,i,j) => sum +
      (values[i] + values[indices[j]]) / 2 * (times[i] - times[indices[j]]), 0);
  }
  const parentAuc = auc(parent), cmmgAuc = auc(cmmg);
  return {parentAuc,cmmgAuc,ratio:cmmgAuc/parentAuc, parent8:parent[8],cmmg8:cmmg[8]};
}
function calculate(group, crcl, infusion, slope, step) {
  const config = {...structuredClone(engine.DEFAULTS), dose:group.dose, infusion, doseCount:1, crcl,
    weight:70, renalMode:'constant', crclSource:'manual', schedule:[], variability:0,
    draws:1, horizon:24+infusion, metRenal:slope/2};
  assert.deepEqual(engine.validate(config,'No dialysis'),[]);
  const out = engine.single(config,engine.drawParams(config)[0],[],step);
  // Figure 7 starts with parent present. Assume plotted zero is end of IV administration.
  const values = (name,mw) => times.map(t => {
    const i=out.t.indexOf(t+infusion); assert.ok(i>=0); return out.cols[name][i]*1000/mw;
  });
  return summarize(values('plasma',225.21),values('cmmg',239.19));
}
const results = groups.map(g => {
  const observed=summarize(g.parent,g.cmmg), scenarios=[];
  for (const crcl of g.crcls) for (const infusion of [.25,1]) for (const slope of [2,3.7474]) {
    const coarse=calculate(g,crcl,infusion,slope,.125);
    const fine=calculate(g,crcl,infusion,slope,.0625);
    for(const k of Object.keys(fine)) assert.ok(Math.abs(coarse[k]-fine[k])<.0001,k);
    scenarios.push({crcl,infusion,slope,...fine});
  }
  return {...g,observed,scenarios};
});
console.log(JSON.stringify({times,results},null,2));
