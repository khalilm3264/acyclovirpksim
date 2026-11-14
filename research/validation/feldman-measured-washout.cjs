// Feldman et al., J Infect Dis 1988;157:385–388, p386 Figure1.
// Measured triangles only; no reconstructed/predicted curve ordinates.
'use strict';
const assert=require('node:assert/strict');
const source={
 doi:'10.1093/infdis/157.2.385',pmid:3335815,
 sha256:'b3617edf3c19e6beb0e9106360e7d708e24127bb0fe6fd387bb846aab84ea062',
 render:'pdftoppm -f 2 -l 2 -scale-to 2600 -png feldman1988.pdf feldman-page',
 rasterWidth:1996,rasterHeight:2600,
 tickX:[1201.5,1278.5,1356.5,1434.5,1511.5],
 tickHour:[10,20,30,40,50],
 // Approximate horizontal triangle centers, read from the rendered original.
 markerX:[1479,1508,1540,1626,1675],
 measuredMicroM:[189,131,94,43,25],
 prose:{firstPostLastDoseH:5.6,lastPostLastDoseH:31,firstMicroM:190,lastMicroM:25},
 authorEliminationHalfLifeH:9.3
};
function regression(x,y){
 const mx=x.reduce((a,b)=>a+b,0)/x.length,my=y.reduce((a,b)=>a+b,0)/y.length;
 const slope=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/x.reduce((s,v)=>s+(v-mx)**2,0);
 const intercept=my-slope*mx;
 return {slope,intercept};
}
function clock(x,ticks=source.tickX){
 const a=regression(ticks,source.tickHour);return x.map(v=>a.intercept+a.slope*v);
}
function fit(t,c){
 const r=regression(t,c.map(Math.log));
 return {...r,apparentHalfLifeH:-Math.LN2/r.slope};
}
function endpoint(first=190,last=25,hours=25.4){return Math.LN2*hours/Math.log(first/last);}
const graphHour=clock(source.markerX);
const times=graphHour.map(t=>t-graphHour[0]+source.prose.firstPostLastDoseH);
const allFive=fit(times,source.measuredMicroM);
const anchoredTimes=source.markerX.map(x=>5.6+(x-source.markerX[0])*25.4/(source.markerX[4]-source.markerX[0]));
// Independent read-off perturbations. Corner-scenario envelopes, not exhaustive bounds or statistical confidence limits.
// ±3px triangle horizontal center; ±1px tick centers; optional ±0.5µM label rounding.
function corners(values,delta){
 return Array.from({length:2**values.length},(_,mask)=>values.map((v,i)=>v+((mask>>i)&1?delta:-delta)));
}
function range(includeRounding=false){
 let min=Infinity,max=-Infinity;
 const cs=includeRounding?corners(source.measuredMicroM,.5):[source.measuredMicroM];
 for(const ticks of corners(source.tickX,1))for(const xs of corners(source.markerX,3)){
  const t=clock(xs,ticks);
  for(const c of cs){const h=fit(t,c).apparentHalfLifeH;min=Math.min(min,h);max=Math.max(max,h);}
 }
 return {min,max};
}
// Translation of the graph's course-time origin must not affect the slope.
assert.ok(Math.abs(fit(graphHour,source.measuredMicroM).slope-allFive.slope)<1e-12);
assert.ok(Math.abs(fit([0,2,4],[8,4,2]).apparentHalfLifeH-2)<1e-12);
assert.ok(Math.abs(endpoint()-8.680794616334246)<1e-10);
const report={
 source,
 points:source.markerX.map((x,i)=>({xPixel:x,graphCourseHour:graphHour[i],postLastDoseHApprox:times[i],measuredMicroM:source.measuredMicroM[i]})),
 calibration:regression(source.tickX,source.tickHour),
 fivePointUnweightedLogLinear:allFive,
 graphReadingCornerEnvelopeH:range(false),
 graphReadingAndLabelRoundingCornerEnvelopeH:range(true),
 narrativeEndpointAnchoredFivePoint:fit(anchoredTimes,source.measuredMicroM),
 endpointOnly:{prose190to25H:endpoint(),figure189to25H:endpoint(189)},
 differenceFromAuthorPercent:100*(allFive.apparentHalfLifeH/source.authorEliminationHalfLifeH-1),
 limits:'Descriptive log-linear slope of five observations; not the reported weighted nonlinear two-compartment fit, a filter clearance, or independent model validation.'
};
console.log(JSON.stringify(report,null,2));

