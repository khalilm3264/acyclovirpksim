'use strict';
/**
 * AYFLUX EXTERNAL-REFERENCE CAPD CHECKS — UNFITTED RESEARCH ONLY.
 * The data are study-level summary statistics, not patient-level digitized samples.
 * Sources: Shah, Winer & Krasny (1986), Am J Kidney Dis 7:507–510.
 *          Burgess & Gill (1990), J Clin Pharmacol 30:997–1000.
 * No claim of dose recommendation, clinical validation or subject matching.
 */
const fs=require('node:fs');
const path=require('node:path');
const pk=require('../../public/assets/pk-engine.js');
const r=(x)=>Math.round(x*1e5)/1e5;
const rows=(starts,lengths,fill,glucose)=>starts.map((start,i)=>({
 sessionStart:null,start,dwell:lengths[i],fill,glucose,uf:null
}));
function build(c){
 const mode='Peritoneal dialysis',errors=pk.validate(c,mode);
 if(errors.length)throw Error('Invalid CAPD research config: '+errors.join('; '));
 const p=pk.drawParams(c)[0],s=pk.single(c,p,pk.scheduleFor(mode,c),.25,pk.buildDoses(c));
 const maxResidual=Math.max(...s.accounting.map(v=>Math.abs(v.residual)));
 return {config:c,sim:s,maxResidual};
}
function at(sim,t){
 const i=sim.t.findIndex(z=>Math.abs(z-t)<1e-8);
 if(i<0)throw Error('No sample at '+t);
 return i;
}
function metrics(sim,lo,hi){
 const left=at(sim,lo),right=at(sim,hi);
 let auc=0;
 for(let i=left+1;i<=right;i++){
  const dt=sim.t[i]-sim.t[i-1];
  auc+=.5*dt*(sim.cols.plasma[i]+sim.cols.plasma[i-1]);
 }
 const extract=j=>sim.accounting[j].parts.pdDrained;
 const pdMg=extract(right)-extract(left);
 return {start_hour:lo,end_hour:hi,auc_mg_h_L:r(auc),pd_drained_mg:r(pdMg),
  apparent_pd_clearance_mL_min:auc>0?r((pdMg/auc)*1000/60):null,
  plasma_at_start_mg_L:r(sim.cols.plasma[left]),
  plasma_at_end_mg_L:r(sim.cols.plasma[right])};
}
function studyConfig({weight,age,sex='male',doses,glucose=1.5,fill=2,exchanges,crcl=0}){
 const horizon=doses.at(-1).time+24;
 return {...pk.DEFAULTS,weight,age,sex,crcl,crclSource:'manual',renalMode:'constant',
  dosingMode:'custom',customDoses:doses.map(d=>({route:'Acyclovir IV',amount:d.amount,time:d.time,infusion:1})),
  route:'Acyclovir IV',horizon,pdMethod:'manual',pdRxEnabled:true,
  pdRxRows:exchanges.map(e=>({sessionStart:null,start:e[0],dwell:e[1],fill,glucose,uf:null})),
  pdVolume:fill,pdGlucose:glucose,pdTransport:1,draws:1,variability:0,trackMassBalance:true};
}
function shah(){
 // Publication: 75 y male, 55 kg; 5 mg/kg day 1 and 2.5 mg/kg days 2–7.
 // Exchanges ~07:00, 13:00 and 18:00–19:00. Exact exchange times and
 // glycemic content differ by day and are not fully documented.
 // This is an *illustrative* 6/6/12-h template under 3 uniform glucose levels.
 const weight=55,doses=Array.from({length:7},(_,day)=>({time:day*24,amount:weight*(day===0?5:2.5)}));
 const source={n:1,age_years:75,weight_kg:55,
  observed_pd_clearance_mL_min_mean:4.4,
  observed_day_recovery_pct:{day1:5.7,day4:10.8,day7:11},
  observed_dextrose_clearance_mL_min:{'1.5':2.6,'2.5':7.3,'4.25':8.3},
  observed_24h_postinfusion_trough_mg_L_approx:1.3,
  observed_terminal_half_life_h:17.1,
  measurement_note:'Recovery day1/4/7 differs by actual prescription and collection; digitized raw individual serial concentrations not supplied.'};
 let experiments=[];
 for(const glucose of [1.5,2.5,4.25]){
  for(const crcl of [0,5]){
   const c=studyConfig({weight,age:75,doses,glucose,fill:2,exchanges:[[0,6],[6,6],[12,12]],crcl});
   const {sim,maxResidual}=build(c);
   const days=[1,4,7].map(day=>{
    const m=metrics(sim,24*(day-1),24*day);
    return {...m,day,dose_mg:doses[day-1].amount,
     drained_mass_over_current_day_dose_pct:r(100*m.pd_drained_mg/doses[day-1].amount)};
   });
   experiments.push({glucose_pct:glucose,assumed_crcl_mL_min:crcl,
    source_prescription_note:'All three exchanges given identical dextrose for sensitivity only; study varied glucose and effluent volumes between days.',
    model_terminal_no_pd_half_life_h:r(sim.summary.modelHalfLife),
    total_7day_pd_recovery_mg:r(sim.accounting.at(-1).parts.pdDrained),
    max_mass_balance_residual_mg:maxResidual,days});
  }
 }
 return {study:'Shah et al. 1986',doi:'10.1016/S0272-6386(86)80193-7',
  evidence_type:'Single-patient CAPD summary + day-specific total effluent recovery',
  source,experiments};
}
function burgess(){
 // Four CAPD individuals, report cohort-weight mean 68.3 ± 15.9 kg;
 // 2x0.5g and 2x1g IV; all use 4 x 1.5L 1.5% dextrose exchanges.
 // Nominal 68.3kg ≠ four individual patient weights.
 const source={iv_capd_n:4,reported_cohort_mean_weight_kg:68.3,
  iv_500mg_n:2,iv_1000mg_n:2,
  observed_capd_clearance_mL_min_mean:3.4,observed_capd_clearance_mL_min_sd:.2,
  observed_iv_terminal_half_life_h_mean:13.2,observed_iv_terminal_half_life_h_sd:4.7,
  observed_total_body_clearance_mL_min_mean:39.7,observed_total_body_clearance_mL_min_sd:10,
  prescription:'Four 1.5 L 1.5% dextrose exchanges during 24h',
  note:'Total clearance from full exposure, not interchangeable with Dose/AUC_0-24; do not compare those.'};
 const experiments=[];
 for(const amount of [500,1000])for(const crcl of [0,5]){
  const c=studyConfig({weight:68.3,age:55,sex:'male',doses:[{time:0,amount}],glucose:1.5,
   fill:1.5,exchanges:[[0,6],[6,6],[12,6],[18,6]],crcl});
  const {sim,maxResidual}=build(c);
  const m=metrics(sim,0,24);
  experiments.push({nominal_iv_dose_mg:amount,assumed_crcl_mL_min:crcl,
   ...m,pd_recovered_pct_dose:r(m.pd_drained_mg/amount*100),
   model_no_pd_terminal_half_life_h:r(sim.summary.modelHalfLife),
   max_mass_balance_residual_mg:maxResidual});
 }
 return {study:'Burgess & Gill 1990',doi:'10.1002/j.1552-4604.1990.tb03585.x',
  evidence_type:'Four-person IV CAPD group summary; group means not patient-level matched',
  source,experiments};
}
function report(destination){
 const result={project:'AyFlux external CAPD holdout checks',version:'0.26.0',research_only:true,
  note:'Frozen engine with illustrative demographic/CrCl/prescription assumptions. No fitting to these external references. No risk or dosing predictions.',
  shah:shah(),burgess:burgess()};
 if(destination){fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n');}
 return result;
}
if(require.main===module)console.log(JSON.stringify(report(process.argv[2])));
module.exports={report,shah,burgess,metrics,build,studyConfig};
