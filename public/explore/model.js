/* AyFlux visual explorer. Copyright 2026 Muhammad Khalil. AGPL-3.0-only. */
(function(root){
'use strict';
const pk=typeof module==='object'?require('../assets/pk-engine.js'):root.RenalPKV7;
const axes={crcl:{label:'CrCl (mL/min)',min:0,max:140},dose:{label:'Dose (mg)',min:0,max:6000},every:{label:'Dose interval (h)',min:1,max:48},hdDuration:{label:'HD duration (h)',min:.5,max:24},weight:{label:'Weight (kg)',min:30,max:200}};
const metrics={auc:{label:'Plasma acyclovir AUC',unit:'mg·h/L'},peak:{label:'Peak plasma acyclovir',unit:'mg/L'},csfPeak:{label:'Peak CSF acyclovir',unit:'mg/L'},mPeak:{label:'Peak plasma CMMG',unit:'mg/L'}};
function config(input){
 const c=pk.effectiveConfig({...structuredClone(pk.DEFAULTS),...structuredClone(input),draws:1,variability:0,observations:[]});
 c.crclSource='manual';return c;
}
function run(c,mode,track=false){
 if(!pk.MODES.includes(mode))throw Error('Choose a valid dialysis mode.');
 const errors=pk.validate(c,mode);if(errors.length)throw Error(errors.join('; '));
 // Bound the explicit step using nominal fastest disposition/absorption rates.
 const p=pk.drawParams(c)[0];
 const renal=c.renalMode==='profile'?p.renal*Math.max(...c.renalProfile.map(r=>r.crcl)):p.renal;
 const dt=Math.min(.125,.25/Math.max((p.other+renal+p.form+p.q+p.hd+p.crrt)/p.vc,p.q/p.vp,p.oralKa));
 return pk.single({...c,trackMassBalance:track},p,pk.scheduleFor(mode,c),dt);
}
function values(key,min,max,count,c,mode){
 const a=axes[key];if(!a)throw Error('Unsupported input axis.');
 if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max||min<a.min||max>a.max)throw Error(a.label+': enter an increasing range within '+a.min+'–'+a.max+'.');
 if(key==='dose'&&max>pk.MAX_DOSE_MG[c.route])throw Error('Dose range exceeds the simulator limit for this route.');
 if(['dose','every'].includes(key)&&c.dosingMode==='custom')throw Error('Dose and interval sweeps require repeat dosing; custom dose events are fixed.');
 if(key==='hdDuration'&&mode!=='Intermittent HD')throw Error('HD duration requires Intermittent HD mode.');
 if(key==='hdDuration'&&max>c.hdRepeat)throw Error('HD duration cannot exceed the HD repeat interval.');
 if(key==='crcl'&&c.renalMode==='profile')throw Error('CrCl sweeps require constant kidney function; change the main simulator profile first.');
 return Array.from({length:count},(_,i)=>min+(max-min)*i/(count-1));
}
function plan(input){
 const c=config(input.config),{mode,xKey,yKey,metric}=input;
 if(xKey===yKey)throw Error('Choose different X and Y inputs.');
 if(!metrics[metric])throw Error('Choose a valid output.');
 if(![7,11,15].includes(input.count))throw Error('Grid must be 7, 11 or 15 points per axis.');
 const xs=values(xKey,input.xMin,input.xMax,input.count,c,mode),ys=values(yKey,input.yMin,input.yMax,input.count,c,mode);
 return {config:c,mode,xKey,yKey,metric,xs,ys};
}
function cell(p,i,j){const c={...p.config,[p.xKey]:p.xs[i],[p.yKey]:p.ys[j]};return run(c,p.mode);}
const api={axes,metrics,config,run,plan,cell};
if(typeof module==='object')module.exports=api;else root.AyFluxExplore=api;
})(typeof self!=='undefined'?self:globalThis);
