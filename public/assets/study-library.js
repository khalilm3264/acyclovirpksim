// Published plasma acyclovir data that AyFlux can load as a regimen and overlay on the plasma chart.
// Every study here carries its own measured points; nothing is fitted to them. The same data drive the
// evidence scorecard on the Methods tab. Concentrations are group means in mg/L.
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
 const iv=(weight,crcl,dose,every,doseCount,horizon)=>({weight,crcl,crclSource:'manual',renalMode:'constant',route:'Acyclovir IV',
  dosingMode:'repeat',dose,every,doseCount,infusion:1,horizon});
 const STUDIES=[
  {id:'laskin-normal',legend:'Laskin 1982 means',label:'Laskin 1982: single 5 mg/kg IV dose, normal kidney function',short:'Laskin 1982 (normal kidney function)',
   ref:'ref41',cite:'[41]',n:3,statistic:'mean',mode:'No dialysis',config:iv(79.1,98,395.5,24,1,24),points:LASKIN_NORMAL,
   regimen:'5 mg/kg IV over 1 h, single dose',
   note:'Three adults with normal kidney function received 5 mg/kg IV over 1 hour. The paper reports a mean weight of 79.1 kg and an estimated CrCl of 90 mL/min/1.73 m², entered here as 98 mL/min at the mean body surface area of 1.89 m². The dots are the published group means; they were not used to set any AyFlux parameter.'},
  {id:'laskin-anuric',legend:'Laskin 1982 anuric means',label:'Laskin 1982: single 2.5 mg/kg IV dose, anuric, before dialysis',short:'Laskin 1982 (anuric, before dialysis)',
   ref:'ref1',cite:'[1]',n:6,statistic:'mean',mode:'No dialysis',config:iv(70,0,175,24,1,24),points:LASKIN_ANURIC,
   regimen:'2.5 mg/kg IV over 1 h, single dose, CrCl 0',
   note:'Six anuric hemodialysis patients received 2.5 mg/kg IV over 1 hour, sampled before their next dialysis session. Weight is a nominal 70 kg and CrCl is set to 0; neither is patient-matched. Published means were converted from µmol/L at 225.21 g/mol.'},
  {id:'label-5',legend:'Label 5 mg/kg means',label:'US IV label: 5 mg/kg every 8 hours, steady state',short:'US label 5 mg/kg q8h (steady state)',
   ref:'ref10',cite:'[10]',n:8,statistic:'mean',mode:'No dialysis',config:iv(70,95,350,8,10,80),points:[[73,9.8],[80,0.7]],
   regimen:'5 mg/kg IV over 1 h every 8 h',
   note:'The label reports a mean steady-state peak and trough for 8 adults with normal kidney function. AyFlux places them at the end of the tenth infusion (hour 73) and just before an eleventh dose (hour 80). Weight and CrCl are nominal assumptions.'},
  {id:'label-10',legend:'Label 10 mg/kg means',label:'US IV label: 10 mg/kg every 8 hours, steady state',short:'US label 10 mg/kg q8h (steady state)',
   ref:'ref10',cite:'[10]',n:7,statistic:'mean',mode:'No dialysis',config:iv(70,95,700,8,10,80),points:[[73,22.9],[80,1.9]],
   regimen:'10 mg/kg IV over 1 h every 8 h',
   note:'The label reports a mean steady-state peak and trough for 7 adults with normal kidney function. AyFlux places them at the end of the tenth infusion (hour 73) and just before an eleventh dose (hour 80). Weight and CrCl are nominal assumptions.'}
 ];
 function find(id){return STUDIES.find(study=>study.id===id)||null;}
 // Full simulator configuration for a study. Calibration multipliers carry over so the scorecard
 // reflects whatever calibration is active; every other setting comes from the defaults.
 function configFor(study,E,calibration={}){
  return {...structuredClone(E.DEFAULTS),observations:[],...structuredClone(study.config),
   vcScale:calibration.vcScale??1,clearanceScale:calibration.clearanceScale??1};
 }
 // True while the simulator still runs the study regimen, so measured points stay meaningful.
 function matches(study,config,mode){
  return !!study&&mode===study.mode&&Object.entries(study.config).every(([key,value])=>config[key]===value);
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
  const rows=study.points.map(([time,observed])=>{
   const predicted=interp(nominal.time,nominal.plasma.median,time),lower=interp(band.time,band.plasma.lower,time),upper=interp(band.time,band.plasma.upper,time);
   return {time,observed,predicted,lower,upper,inside:observed>=lower&&observed<=upper};
  });
  const gmr=Math.exp(rows.reduce((sum,row)=>sum+Math.log(row.predicted/row.observed),0)/rows.length);
  return {id:study.id,rows,gmr,inside:rows.filter(row=>row.inside).length,total:rows.length,coverage:config.coverage};
 }
 return {STUDIES,find,configFor,matches,score,interp};
});
