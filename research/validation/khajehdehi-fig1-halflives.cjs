/** Descriptive read-off audit, not recovery of the authors' regressions.
 * Coordinates: primary PDF page 3 rendered at 1575 x 2100 pixels.
 * See KHAJEHDEHI-FIG1-HALFLIVES.md for calibration and limitations.
 */
const assert = require('node:assert/strict');
// Manually read circular marker centers, in left-to-right order. Integer pixels
// deliberately avoid implying subpixel precision from this scanned figure.
const RAW_POINTS = [
  [344,410],[400,257],[428,302],[465,334],[511,408],
  [632,542],[706,433],[743,452],[818,522],[837,577],[892,563],
  [1108,608],[1141,400],[1152,457],[1160,440],[1198,464],
  [1259,596],[1287,572],[1334,604]
].map(([x,y],i)=>({id:i+1,x,y}));
const CAL = {x0:267,x28:531,x76:651,x148:1333,y0:667,
  decade:360.8,tilt:-17/1073};
function convertPoint(p, dx=0, dy=0, cal=CAL) {
  const x=p.x+dx, y=p.y+dy;
  const t=x<560 ? (x-cal.x0)*28/(cal.x28-cal.x0)
    : 76+(x-cal.x76)*72/(cal.x148-cal.x76);
  const log10C=0.4+(cal.y0+cal.tilt*(x-cal.x0)-y)/cal.decade;
  return {...p,x,y,t,log10C,c:10**log10C};
}
function logLinearFit(points) {
  const n=points.length;
  assert(n>=2);
  const mt=points.reduce((s,p)=>s+p.t,0)/n;
  const ml=points.reduce((s,p)=>s+Math.log(p.c),0)/n;
  let xx=0,xy=0,yy=0;
  for (const p of points) {
    const x=p.t-mt,y=Math.log(p.c)-ml;
    xx+=x*x;xy+=x*y;yy+=y*y;
  }
  const slope=xy/xx;
  return {n,slope,halfLife:slope<0?-Math.LN2/slope:null,r2:xy*xy/(xx*yy)};
}
// Conservative windows do not bridge the axis break, another dose arrow, or HD.
// Point 2 lies at the F8 box endpoint; treat 3..5 as the safer early window.
const WINDOWS = [
  {label:'Early decline after F8 box',ids:[3,4,5]},
  {label:'Early endpoint sensitivity (F8 boundary ambiguous)',ids:[2,3,4,5]},
  {label:'After HD / third arrow, before fourth arrow',ids:[7,8,9,10]},
  {label:'Same interval, omit first marker',ids:[8,9,10]},
  {label:'CA210, after fifth arrow, before sixth arrow',ids:[13,14,15,16,17,18]},
  {label:'Same CA210 interval, omit first marker',ids:[14,15,16,17,18]}
];
function select(ids,cal=CAL) {
  return RAW_POINTS.filter(p=>ids.includes(p.id)).map(p=>convertPoint(p,0,0,cal));
}
function run() {
  console.log('Descriptive scan-derived fits; authors’ point selection is unknown.');
  console.log('id,x_px,y_px,time_h,log10C,C_mg_L');
  for (const p of RAW_POINTS.map(p=>convertPoint(p)))
    console.log([p.id,p.x,p.y,p.t.toFixed(1),p.log10C.toFixed(3),p.c.toFixed(2)].join(','));
  console.log('\nWindow | IDs | slope ln(C)/h | apparent half-life h | R² | coordinate sensitivity h');
  for (const w of WINDOWS) {
    const f=logLinearFit(select(w.ids));
    // Deterministic corner perturbations: each selected center may move ±2 px
    // independently in x and y. Enumerate every corner (at most 4^6=4096).
    const base=RAW_POINTS.filter(p=>w.ids.includes(p.id)), values=[];
    function corners(i,pts) {
      if(i===base.length){values.push(logLinearFit(pts).halfLife);return;}
      for(const dx of [-2,2]) for(const dy of [-2,2])
        corners(i+1,[...pts,convertPoint(base[i],dx,dy)]);
    }
    corners(0,[]);
    const lo=Math.min(...values),hi=Math.max(...values);
    console.log(`${w.label} | ${w.ids.join(',')} | ${f.slope.toFixed(4)} | ${f.halfLife.toFixed(1)} | ${f.r2.toFixed(3)} | ${lo.toFixed(1)}–${hi.toFixed(1)}`);
  }
  console.log('\nCalibration sensitivity (±2% panel x scale and log10 y scale; tilt fixed):');
  for(const w of WINDOWS) {
    const vals=[];
    for(const sx of [.98,1.02]) for(const sy of [.98,1.02]) {
      const cal={...CAL,x28:CAL.x0+(CAL.x28-CAL.x0)*sx,
        x148:CAL.x76+(CAL.x148-CAL.x76)*sx,decade:CAL.decade*sy};
      vals.push(logLinearFit(select(w.ids,cal)).halfLife);
    }
    console.log(`${w.label}: ${Math.min(...vals).toFixed(1)}–${Math.max(...vals).toFixed(1)} h`);
  }
}
// Checks exercise calibration and the regression mathematics, not proximity to
// any reported clinical number.
assert.equal(convertPoint({x:CAL.x76,y:CAL.y0}).t,76);
assert.equal(convertPoint({x:CAL.x148,y:CAL.y0}).t,148);
assert(Math.abs(logLinearFit([{t:0,c:8},{t:10,c:4},{t:20,c:2}]).halfLife-10)<1e-12);
assert(WINDOWS.every(w=>!w.ids.includes(6)&&!w.ids.includes(11)&&!w.ids.includes(12)&&!w.ids.includes(19)));
if(require.main===module) run();
module.exports={RAW_POINTS,CAL,WINDOWS,convertPoint,logLinearFit};
