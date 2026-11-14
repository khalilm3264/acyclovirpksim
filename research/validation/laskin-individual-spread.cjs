// Am J Med 1982 Table I, p. 198: six rows in source order. Do not match
// identifiers to the other paper. Compare distributions within sampling times.
'use strict';
const assert = require('node:assert/strict');
const {subjects,hours,profile}=require('./laskin-fitted-distribution.cjs');
const observed=[
  [32.6,23.8,16.1,13.5,9.1,4.4,1.8],
  [36.1,16.1,8.5,7.3,4.6,1.6,.65],
  [24.9,14.9,8.5,7.3,4.9,2.15,.79],
  [22.8,18.2,8.9,6.5,3.4,1,.35],
  [24.9,14.9,9.3,10.5,8.2,3.2,1.4],
  [83.9,17.5,10.3,8,8.2,4.1,1.7]
];
const printedMeans=[37.5,17.6,10.3,8.9,6.4,2.74,1.12];
const printedSDs=[23.3,3.3,2.9,2.7,2.4,1.38,.60];
function describe(values) {
  const sorted=values.toSorted((a,b)=>a-b), n=sorted.length;
  const mean=values.reduce((a,b)=>a+b,0)/n;
  const sd=Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/(n-1));
  const median=(sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2;
  return {mean,median,sd,min:sorted[0],max:sorted.at(-1)};
}
if (require.main === module) {
  const observedStats=printedMeans.map((m,i)=>{
    const values=observed.map(row=>row[i]), stats=describe(values);
    const tolerance=i<5?.050001:.005001;
    assert.ok(Math.abs(stats.mean-m)<tolerance);
    assert.ok(Math.abs(stats.sd-printedSDs[i])<tolerance);
    const omit=values.map((_,j)=>describe(values.filter((x,k)=>k!==j)).mean);
    return {...stats,omitOneMean:[Math.min(...omit),Math.max(...omit)]};
  });
  const results={};
  for (const fitted of [false,true]) {
    const curves=subjects.map(subj=>profile(subj,fitted,1/64));
    results[fitted?'sourceFit':'weightOnly']=hours.slice(0,6).map((hour,i)=>({
      hour,...describe(curves.map(curve=>curve[i]))}));
  }
  console.log(JSON.stringify({observed,observedStats,results},null,2));
}
module.exports = {observed};
