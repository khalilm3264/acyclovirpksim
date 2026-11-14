// Published acyclovir (and CMMG) concentrations that AyFlux can load as a regimen and overlay on the
// plasma and CMMG charts. Nothing is fitted to them. The same data drive the evidence scorecard and
// predicted-vs-observed figure on the Methods tab. Concentrations are in mg/L. `points` are plasma
// acyclovir and `cmmgPoints` plasma CMMG, each as [hour, value].
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.AyFluxStudies=api;
})(typeof self!=='undefined'?self:this,function(){
 'use strict';
 const ACV_MW=225.21;
 // Laskin OL et al. Antimicrob Agents Chemother 1982;21:804, Table 1 (no probenecid), mean of 3 adults.
 const LASKIN_NORMAL=[[0.25,4.5],[0.5,6.35],[0.75,7.41],[1,11.4],[1.5,4.8],[2,3.08],[3,2.16],[4,1.39],[6,0.79],[8,0.47],[10,0.27],[12,0.14]];
 // Laskin OL et al. Clin Pharmacol Ther 1982;31:594 [1], interdialytic samples, µmol/L mean (n=6).
 const LASKIN_ANURIC=[[1,37.5],[8,10.3],[24,6.4]].map(([t,um])=>[t,um*ACV_MW/1000]);
 const um=values=>values.map(v=>v*ACV_MW/1000);
 // Boelaert J et al. J Antimicrob Chemother 1987;20:69 [6], Tables I-II: author-fitted day-1 and day-5
 // peak/trough (µmol/L) in the three CAPD patients without urinary recovery. Matches research/validation.
 const BOELAERT=[{id:1,sex:'male',age:22,weight:46.5,dose:110,values:[22,4.1,27.6,6.3]},
  {id:4,sex:'male',age:49,weight:59,dose:142,values:[19.3,2.3,22,3.0]},
  {id:5,sex:'female',age:39,weight:48,dose:122,values:[26.2,2.5,28.8,2.9]}];
 const CAPD_ROWS=[[0,4],[4,4],[8,4],[12,12]].map(([start,dwell])=>({sessionStart:null,start,dwell,fill:2,glucose:1.36,uf:null}));
 const boelaert=b=>({id:'boelaert-'+b.id,legend:'Boelaert pt '+b.id+' fitted',short:'Boelaert 1987 CAPD, patient '+b.id,
  label:'Boelaert 1987: IV acyclovir on CAPD, patient '+b.id,ref:'ref6',cite:'[6]',n:1,pointsLabel:'author-fitted peaks and troughs',
  group:'dialysis',mode:'Peritoneal dialysis',regimen:b.dose+' mg IV daily ×5, CAPD 4/4/4/12 h dwells, CrCl 0',
  config:{age:b.age,sex:b.sex,weight:b.weight,crcl:0,crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',dosingMode:'repeat',
   dose:b.dose,every:24,doseCount:5,infusion:1,horizon:120,pdMethod:'manual',pdRxEnabled:true,pdRxRows:CAPD_ROWS,pdVolume:2,pdGlucose:1.36},
  provenance:boelaertProvenance(b),sourceCheck:SOURCE_CHECK.boelaert,explore:EXPLORE.boelaert,
  points:[1,24,97,120].map((t,i)=>[t,b.values[i]*ACV_MW/1000]),kinds:['peak','trough','peak','trough'],
  note:'One continuous ambulatory PD patient ('+b.weight+' kg) given '+b.dose+' mg IV over 1 hour daily for 5 days, with four 2 L, 1.36% exchanges a day (dwells of 4, 4, 4 and 12 hours). The dots are the day-1 and day-5 peaks and troughs the authors derived from their own curve fits, not raw samples. No urinary recovery was reported, so CrCl is set to 0; that is an assumption.'});
 // Vasquez Vasquez J et al. Br J Clin Pharmacol 2025 [22], Table 1A: dialyzer-inlet plasma at the start and
 // end of the first HD session. The last dose to admission gap is not reported; 4 h is assumed.
 // Input provenance: how each reconstruction input was obtained. reported = stated in the source;
 // calculated = derived by AyFlux or the authors from reported values; assumed = set by AyFlux because
 // the source gives no value; unknown = not reported and with no effect assumed beyond what is listed.
 // Each row keeps two things apart: what the paper reports, and what AyFlux uses.
 const P=(input,status,reported,used,source)=>({input,status,reported,used,source});
 const BOELAERT_SOURCE='Boelaert 1987, Methods and Tables I–II';
 const boelaertProvenance=b=>[
  P('Dose','reported',b.dose+' mg IV over 1 h',b.dose+' mg IV over 1 h',BOELAERT_SOURCE),
  P('Dose times','reported','Every 24 h for 5 days','Every 24 h, five doses',BOELAERT_SOURCE+' (Methods)'),
  P('Weight','reported',b.weight+' kg',b.weight+' kg',BOELAERT_SOURCE+' (Table I)'),
  P('Residual kidney function','assumed','No CrCl reported. Urine was collected only from patients who were not anuric, and none is listed for this patient, which implies anuria','CrCl 0 mL/min',BOELAERT_SOURCE+' (Methods, Table II)'),
  P('PD prescription','reported','Four 2 L exchanges of 1.36% dextrose; dwells 4, 4, 4 and 12 h','Repeating 4/4/4/12 h dwells of 2 L, 1.36%',BOELAERT_SOURCE+' (Methods)'),
  P('Exchange times on the clock','reported','Fresh dialysate instilled over 10 min just before the infusion at time 0; each daily infusion started after the morning exchange','First exchange starts with the first infusion',BOELAERT_SOURCE+' (Methods)'),
  P('Peritoneal transport and ultrafiltration','assumed','Drained volumes were recorded but not published; transport type not reported','AyFlux default membrane parameters','Not reported'),
  P('Plasma values compared','calculated','Day-1 and day-5 peaks and troughs fitted by the authors; not raw samples','The fitted values, converted from µmol/L',BOELAERT_SOURCE+' (Tables I–II)'),
  P('Sample times','calculated','Not stated; implied by the fitted Cmax and Cmin','Hours 1, 24, 97 and 120: end of infusion and just before the next dose','Implied by the fitted values'),
  P('Dialysate recovery','reported','Percent of dose recovered in dialysate','Not used in the scorecard; used in case study 3',BOELAERT_SOURCE+' (Table II)')];
 const VASQUEZ_SOURCE='Vasquez Vasquez 2024 preprint (Authorea), case report';
 const VASQUEZ_PROVENANCE=[
  P('Dose','reported','Valacyclovir 1,000 mg, four doses','Valacyclovir 1,000 mg, four doses',VASQUEZ_SOURCE),
  P('Dose interval','assumed','Three times daily; clock times not given','Every 8 h',VASQUEZ_SOURCE),
  P('Time from last dose to admission','unknown','Not reported: she presented after the fourth dose','4 h (0 and 8 h in research/validation/vasquez-hd.cjs)',VASQUEZ_SOURCE),
  P('Weight','reported','49.9 kg','49.9 kg',VASQUEZ_SOURCE),
  P('Serum creatinine','reported','11.3 mg/dL; author eGFR 3.3 mL/min','11.3 mg/dL',VASQUEZ_SOURCE),
  P('Residual kidney function','calculated','No measured CrCl; urinary recovery 17.7 mg over 30 h','Cockcroft–Gault CrCl 3.70 mL/min from age, sex, weight and creatinine; urinary recovery not used',VASQUEZ_SOURCE),
  P('Admission to first HD','reported','16 h','16 h (first session at simulation hour 44)','Urine collected from admission to just before the first session'),
  P('First HD duration','calculated','4.5 h of HD in total; second session 2.5 h','2 h (4.5 − 2.5)',VASQUEZ_SOURCE),
  P('Gap between sessions','reported','14 h','14 h','Urine collected over 14 h between sessions'),
  P('Second HD duration','reported','2.5 h','2.5 h',VASQUEZ_SOURCE),
  P('HD drug clearance','assumed','Blood flow 250 and dialysate flow 500 mL/min; drug clearance not reported','AyFlux default 81.8 mL/min',VASQUEZ_SOURCE),
  P('Plasma values compared','reported','8.8 and 3.2 mg/L, dialyzer-inlet plasma at the start and end of the first session','Same values',VASQUEZ_SOURCE+', Table 1A'),
  P('Sample times','reported','Start and end of the first session','Simulation hours 44 and 46',VASQUEZ_SOURCE)];
 // Source checks still outstanding for the provenance rows, shown on the page.
 const SOURCE_CHECK={
  vasquez:'Pending source check: these rows were checked against the 2024 Authorea preprint. They have not yet been checked against the final Br J Clin Pharmacol 2025 article.'};
 // Boelaert 1987 rows were checked against the original paper on 2026-11-13: Table I (age, weight, dose,
 // fitted day-1 and day-5 Cmax/Cmin), Table II (dialysate recovery, peritoneal clearance, no urine listed)
 // and Methods (2 L 1.36% exchanges at 4/4/4/12 h, 60 min infusions for 5 days).
 // Assumptions a reader can vary. Bounds are interface limits for exploration, not plausibility claims.
 const EXPLORE={
  vasquez:{input:'Time from last dose to admission',label:'Hypothetical last-dose-to-admission gap',unit:'h',value:4,min:0,max:24},
  boelaert:{input:'Residual kidney function',label:'Hypothetical residual CrCl',unit:'mL/min',value:0,min:0,max:30}};
 const VASQUEZ_ADMISSION=28,VASQUEZ_HD=[{type:'HD',start:VASQUEZ_ADMISSION+16,end:VASQUEZ_ADMISSION+18},{type:'HD',start:VASQUEZ_ADMISSION+32,end:VASQUEZ_ADMISSION+34.5}];
 // Kacirova I et al. Klinicka farmakologie a farmacie 2022 [42]: one trough and one sample 25 min after the ninth infusion.
 const KACIROVA_DOSES=Array.from({length:9},(_,i)=>({time:i*8,route:'Acyclovir IV',amount:i<6?750:850,infusion:1}));
 const iv=(weight,crcl,dose,every,doseCount,horizon)=>({weight,crcl,crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',
  dosingMode:'repeat',dose,every,doseCount,infusion:1,horizon});
 const STUDIES=[
  {id:'laskin-normal',pointsLabel:'published means',legend:'Laskin 1982 means',label:'Laskin 1982: single 5 mg/kg IV dose, normal kidney function',short:'Laskin 1982 (normal kidney function)',
   ref:'ref41',cite:'[41]',n:3,statistic:'mean',mode:'No dialysis',config:iv(79.1,98,395.5,24,1,24),points:LASKIN_NORMAL,
   regimen:'5 mg/kg IV over 1 h, single dose',
   note:'Three adults with normal kidney function received 5 mg/kg IV over 1 hour. The paper reports a mean weight of 79.1 kg and an estimated CrCl of 90 mL/min/1.73 m², entered here as 98 mL/min at the mean body surface area of 1.89 m². The dots are the published group means; they were not used to set any AyFlux parameter.'},
  {id:'laskin-anuric',pointsLabel:'published means',legend:'Laskin 1982 anuric means',label:'Laskin 1982: single 2.5 mg/kg IV dose, anuric, before dialysis',short:'Laskin 1982 (anuric, before dialysis)',
   ref:'ref1',cite:'[1]',n:6,statistic:'mean',mode:'No dialysis',config:iv(70,0,175,24,1,24),points:LASKIN_ANURIC,
   regimen:'2.5 mg/kg IV over 1 h, single dose, CrCl 0',
   note:'Six anuric hemodialysis patients received 2.5 mg/kg IV over 1 hour, sampled before their next dialysis session. Weight is a nominal 70 kg and CrCl is set to 0; neither is patient-matched. Published means were converted from µmol/L at 225.21 g/mol.'},
  {id:'label-5',pointsLabel:'published means',legend:'Label 5 mg/kg means',label:'US IV label: 5 mg/kg every 8 hours, steady state',short:'US label 5 mg/kg q8h (steady state)',
   ref:'ref10',cite:'[10]',n:8,statistic:'mean',mode:'No dialysis',config:iv(70,95,350,8,10,80),points:[[73,9.8],[80,0.7]],kinds:['peak','trough'],
   regimen:'5 mg/kg IV over 1 h every 8 h',
   note:'The label reports a mean steady-state peak and trough for 8 adults with normal kidney function. AyFlux places them at the end of the tenth infusion (hour 73) and just before an eleventh dose (hour 80). Weight and CrCl are nominal assumptions.'},
  {id:'label-10',pointsLabel:'published means',legend:'Label 10 mg/kg means',label:'US IV label: 10 mg/kg every 8 hours, steady state',short:'US label 10 mg/kg q8h (steady state)',
   ref:'ref10',cite:'[10]',n:7,statistic:'mean',mode:'No dialysis',config:iv(70,95,700,8,10,80),points:[[73,22.9],[80,1.9]],kinds:['peak','trough'],
   regimen:'10 mg/kg IV over 1 h every 8 h',
   note:'The label reports a mean steady-state peak and trough for 7 adults with normal kidney function. AyFlux places them at the end of the tenth infusion (hour 73) and just before an eleventh dose (hour 80). Weight and CrCl are nominal assumptions.'},
  {id:'kacirova',legend:'Kacirova 2022 measured',short:'Kacirova 2022, one patient (with CMMG)',label:'Kacirova 2022: IV acyclovir, paired acyclovir and CMMG levels',
   ref:'ref42',cite:'[42]',n:1,pointsLabel:'measured concentrations',mode:'No dialysis',regimen:'750 mg IV q8h ×6, then 850 mg; estimated CrCl',
   config:{age:36,sex:'male',weight:86,scr:87/88.4,crclSource:'estimated',renalMode:'constant',dosingMode:'custom',customDoses:KACIROVA_DOSES,horizon:72},
   points:[[64,1.7],[65+25/60,8.9]],cmmgPoints:[[64,0.27],[65+25/60,0.64]],kinds:['trough','post-infusion'],cmmgKinds:['trough','post-infusion'],
   note:'A 36-year-old man (86 kg, serum creatinine 87 µmol/L) given 750 mg IV every 8 hours for two days, then 850 mg. The dots are a measured trough and a sample 25 minutes after the ninth infusion, for both acyclovir and CMMG (shown on the CMMG graph). AyFlux estimates CrCl by Cockcroft–Gault. The infusion length (1 hour) and which infusion was sampled are read from the paper\'s figure, and the preceding oral course is not simulated.'},
  {id:'vasquez',legend:'Vasquez 2025 measured',short:'Vasquez 2025, HD patient',label:'Vasquez 2025: oral valacyclovir with stage 5 CKD and hemodialysis',
   ref:'ref22',cite:'[22]',n:1,pointsLabel:'measured concentrations',group:'dialysis',mode:'Custom sequence',regimen:'Valacyclovir 1,000 mg q8h ×4, then two HD sessions; estimated CrCl',
   config:{age:69,sex:'female',weight:49.9,scr:11.3,crclSource:'estimated',renalMode:'constant',route:'Valacyclovir oral',dosingMode:'repeat',
    dose:1000,every:8,doseCount:4,schedule:VASQUEZ_HD,horizon:VASQUEZ_HD[1].end},
   provenance:VASQUEZ_PROVENANCE,sourceCheck:SOURCE_CHECK.vasquez,explore:EXPLORE.vasquez,
   points:[[VASQUEZ_HD[0].start,8.8],[VASQUEZ_HD[0].end,3.2]],kinds:['hd-start','hd-end'],
   note:'A 69-year-old woman (49.9 kg, serum creatinine 11.3 mg/dL) took four 1,000 mg valacyclovir doses 8 hours apart. The dots are dialyzer-inlet plasma levels at the start and end of her first 2-hour HD session. The paper does not give the time from the last dose to admission; AyFlux assumes 4 hours, so the first session starts at hour 44. research/validation/vasquez-hd.cjs shows how the result changes for 0 and 8 hours.'},
  ...BOELAERT.map(boelaert)
 ];
 // Teaching cases: published regimens with no measured concentrations. They load like a study but have
 // no points, so they are never scored and never enter the scorecard, CSV or residual table.
 // Moyses Neto M et al. Perit Dial Int 2026 [44], case 3. Cases 1 and 2 took oral acyclovir, a route
 // AyFlux does not model, so only the valacyclovir case is included.
 const MOYSES_SOURCE='Moysés Neto 2026, Table 1 and Case 3';
 const CASES=[
  {id:'moysesneto-apd-3',teaching:true,legend:'Moysés Neto 2026 case 3',short:'Moysés Neto 2026, cycler PD case 3',
   label:'Moysés Neto 2026: valacyclovir on cycler PD, neurotoxicity case (no levels)',ref:'ref44',cite:'[44]',n:1,
   pointsLabel:'no measured concentrations',group:'dialysis',mode:'Peritoneal dialysis',
   regimen:'Valacyclovir 500 mg q8h for 4 days on cycler PD (6 × 2 L, 60-minute dwells)',
   config:{age:80,sex:'male',weight:65,crcl:0,crclSource:'manual',renalMode:'constant',route:'Valacyclovir oral',dosingMode:'repeat',
    dose:500,every:8,doseCount:12,horizon:264,pdMethod:'cycler',apdCycles:6,apdDwell:1,apdHours:7.5,pdVolume:2},
   provenance:[
    P('Dose','reported','Valacyclovir 500 mg orally every 8 hours (authors: labeled dose for PD is 500 mg every 24 hours)','500 mg every 8 h',MOYSES_SOURCE),
    P('Duration','reported','Stopped after 4 days, when symptoms began','12 doses over 4 days',MOYSES_SOURCE),
    P('Age, sex, weight','reported','80-year-old man, 65 kg','80 years, male, 65 kg',MOYSES_SOURCE),
    P('Residual kidney function','unknown','Not reported; on PD for 18 months','CrCl 0 mL/min (assumed; residual function would lower every curve)','Not reported'),
    P('Cycler prescription','reported','12 L per session: 6 cycles of 2 L, 60-minute dwells','6 cycles of 2 L, 1-hour dwells; 7.5-hour session',MOYSES_SOURCE),
    P('Cycler start time and turnover','assumed','Not reported','Starts 20 h after the first dose, then daily; 15 minutes fill and drain per cycle','Not reported'),
    P('Peritoneal transport and dialysate glucose','assumed','Not reported','AyFlux default membrane parameters','Not reported'),
    P('Drug concentrations','unknown','None measured','Nothing to compare; this is a teaching case','Not reported')],
   explore:{input:'Residual kidney function',label:'Hypothetical residual CrCl',unit:'mL/min',value:0,min:0,max:30},
   points:[],
   note:'An 80-year-old man (65 kg) on cycler PD took valacyclovir 500 mg every 8 hours, three times the labeled PD dose, for herpes zoster. On day 4 he developed confusion, dysarthria, involuntary leg movements and ataxia. The drug was stopped, cycler PD continued unchanged, and he improved over 7 days. No drug levels were measured, so there are no dots: use this case to see how acyclovir and CMMG build up and fall, not to test the model. Residual kidney function was not reported and is set to 0.'}
 ];
 function find(id){return STUDIES.find(study=>study.id===id)||CASES.find(study=>study.id===id)||null;}
 // Full simulator configuration for a study. Calibration multipliers carry over so the scorecard
 // reflects whatever calibration is active; every other setting comes from the defaults.
 function configFor(study,E,calibration={}){
  return {...structuredClone(E.DEFAULTS),observations:[],...structuredClone(study.config),
   vcScale:calibration.vcScale??1,clearanceScale:calibration.clearanceScale??1};
 }
 // True while the simulator still runs the study regimen, so measured points stay meaningful.
 function matches(study,config,mode){
  return !!study&&!config.probenecid&&mode===study.mode&&Object.entries(study.config).every(([key,value])=>JSON.stringify(config[key])===JSON.stringify(value));
 }
 // Sample type as the source reports it: peak, trough, post-infusion, HD inlet at the start or end of
 // a session, or serial (a time course without a peak/trough label).
 function pointsOf(study){
  return study.points.map(([time,observed],i)=>({analyte:'plasma',time,observed,kind:study.kinds?.[i]||'serial'}))
   .concat((study.cmmgPoints||[]).map(([time,observed],i)=>({analyte:'cmmg',time,observed,kind:study.cmmgKinds?.[i]||'serial'})));
 }
 const STATUSES=['reported','calculated','assumed','unknown'];
 // Count of reconstruction inputs by provenance status, or null when not yet recorded.
 function provenanceCounts(study){
  if(!study.provenance)return null;
  const counts=Object.fromEntries(STATUSES.map(k=>[k,0]));
  for(const row of study.provenance)counts[row.status]++;
  return counts;
 }
 // Hours from the start of the most recent earlier dose to each sample. A sample taken at the moment
 // a dose starts (a trough) counts from the dose before it.
 function sinceDose(study,E,time){
  const starts=E.buildDoses(E.effectiveConfig(configFor(study,E))).map(d=>d.time).filter(t=>t<time-1e-9);
  return starts.length?time-Math.max(...starts):null;
 }
 // One row per published point for the CSV export, in mg/L.
 function csv(scores,calibration={}){
  const head=['study_id','citation','analyte','time_h','observed_mg_L','predicted_nominal_mg_L','interval_lower_mg_L','interval_upper_mg_L','inside_interval','point_type','central_volume_multiplier','clearance_multiplier','reference_id','regimen','scenario','subjects','assumptions','study_configuration_json','model_interval_fraction'];
  const cell=v=>typeof v==='string'&&/[",\n]/.test(v)?'"'+v.replaceAll('"','""')+'"':String(v);
  const lines=[head.join(',')];
  for(const score of scores){const study=find(score.id);for(const r of score.rows)lines.push([study.id,study.short+' '+study.cite,r.analyte,+r.time.toFixed(4),r.observed,+r.predicted.toPrecision(6),+r.lower.toPrecision(6),+r.upper.toPrecision(6),r.inside,study.pointsLabel,calibration.vcScale??1,calibration.clearanceScale??1,study.ref,study.regimen,study.mode,study.n,study.note,JSON.stringify(study.config),score.coverage].map(cell).join(','));}
  return lines.join('\n')+'\n';
 }
 // Bias and error magnitude are distinct: opposite errors cancel in GMR, not absolute fold error.
 function summarize(scores){
  const stats=rows=>{
   if(!rows.length)return null;
   const logs=rows.map(r=>Math.log(r.predicted/r.observed));
   return {total:rows.length,gmr:Math.exp(logs.reduce((a,b)=>a+b,0)/rows.length),
    absoluteFoldError:Math.exp(logs.reduce((a,b)=>a+Math.abs(b),0)/rows.length),
    withinTwo:rows.filter(r=>r.predicted/r.observed>=.5&&r.predicted/r.observed<=2).length,
    inside:rows.filter(r=>r.inside).length};
  };
  const all=scores.flatMap(s=>s.rows);
  const groups=[
   ['Plasma acyclovir — no dialysis',(s,r)=>s.mode==='No dialysis'&&r.analyte==='plasma'],
   ['Plasma acyclovir — dialysis',(s,r)=>s.mode!=='No dialysis'&&r.analyte==='plasma'],
   ['Plasma CMMG',(s,r)=>r.analyte==='cmmg']
  ].map(([name,test])=>({name,...stats(scores.flatMap(score=>score.rows.filter(r=>test(find(score.id),r))))}));
  return {overall:stats(all),groups,scenarios:scores.length,sources:new Set(scores.map(s=>find(s.id).ref)).size};
 }
 function interp(time,values,t){
  if(t<=time[0])return values[0];
  for(let i=1;i<time.length;i++)if(time[i]>=t){const f=(t-time[i-1])/(time[i]-time[i-1]);return values[i-1]+f*(values[i]-values[i-1]);}
  return values[values.length-1];
 }
 // Predicted/observed geometric mean ratio for the nominal (no-variability) curve, and how many
 // published means fall inside the model interval from Monte Carlo draws.
 function score(study,E,options={}){
  const config=configFor(study,E,options.calibration),mode=study.mode;
  const nominal=E.simulateMany({...config,variability:0,draws:1,requestedModes:[mode]})[mode];
  const band=E.simulateMany({...config,draws:options.draws||200,requestedModes:[mode]})[mode];
  const rows=pointsOf(study).map(({analyte,time,observed,kind})=>{
   const predicted=interp(nominal.time,nominal[analyte].median,time),lower=interp(band.time,band[analyte].lower,time),upper=interp(band.time,band[analyte].upper,time);
   return {analyte,time,observed,kind,sinceDose:sinceDose(study,E,time),predicted,lower,upper,inside:observed>=lower&&observed<=upper};
  });
  const gmr=Math.exp(rows.reduce((sum,row)=>sum+Math.log(row.predicted/row.observed),0)/rows.length);
  return {id:study.id,rows,gmr,inside:rows.filter(row=>row.inside).length,total:rows.length,coverage:config.coverage};
 }
 // Configuration with one reconstruction assumption changed (from #68). Vasquez: the hypothetical
 // gap from the last dose to admission shifts both HD sessions and the simulation end, relative to the
 // 4 h used by the reconstruction. Boelaert: residual CrCl replaces the assumed 0 mL/min.
 function exploreConfig(study,E,value,calibration={}){
  const spec=study.explore;
  if(!spec)throw new Error('No editable assumption for this study.');
  if(!Number.isFinite(value)||value<spec.min||value>spec.max)throw new Error('Enter a number from '+spec.min+' to '+spec.max+' '+spec.unit+'.');
  const config=configFor(study,E,calibration);
  if(study.id==='vasquez'){
   const shift=value-spec.value;
   config.schedule=config.schedule.map(session=>({...session,start:session.start+shift,end:session.end+shift}));
   config.horizon+=shift;
  }else{config.crcl=value;config.crclSource='manual';}
  return config;
 }
 // Per-study residual summary for the table under the residuals figure: predicted ÷ observed for
 // every scored point, the median (geometric mean of the two middle values when the count is even),
 // range, direction, and the samples the source reports as a peak or a trough. A study whose compared
 // plasma values are recorded as calculated (author-fitted) in its provenance is marked as such.
 function residualsByStudy(scores){
  return scores.map(score=>{
   const study=find(score.id),rows=score.rows.map(r=>({...r,ratio:r.predicted/r.observed}));
   const ratios=rows.map(r=>r.ratio).sort((a,b)=>a-b),mid=ratios.length>>1;
   const below=rows.filter(r=>r.ratio<1).length,above=rows.filter(r=>r.ratio>1).length;
   const fitted=study.provenance?.find(p=>p.input==='Plasma values compared')?.status==='calculated';
   return {id:study.id,short:study.short,cite:study.cite,total:rows.length,
    median:ratios.length%2?ratios[mid]:Math.sqrt(ratios[mid-1]*ratios[mid]),min:ratios[0],max:ratios[ratios.length-1],
    direction:below===rows.length?'below':above===rows.length?'above':'mixed',fitted:Boolean(fitted),
    peaks:rows.filter(r=>r.kind==='peak'),troughs:rows.filter(r=>r.kind==='trough')};
  });
 }
 // Classification follows how the source values entered the comparison.
 function evidenceKind(study){
  if(study.pointsLabel.includes('author-fitted'))return 'fitted';
  return study.n>1?'means':'individual';
 }
 function filterEvidence(studies,kind){
  return studies.filter(study=>kind==='all'||(kind==='measured'?evidenceKind(study)!=='fitted':evidenceKind(study)===kind));
 }
 return {evidenceKind,filterEvidence,STUDIES,CASES,find,configFor,matches,score,interp,pointsOf,sinceDose,provenanceCounts,STATUSES,residualsByStudy,exploreConfig,csv,summarize};
});

