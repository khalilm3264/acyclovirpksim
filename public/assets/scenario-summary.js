/* Local printable scenario handout. Copyright (C) 2026 Muhammad Khalil; AGPL-3.0-only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AyFluxScenarioSummary=api;})(typeof globalThis==='undefined'?this:globalThis,function(){
 'use strict';
 const number=(n,digits=2)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:digits});
 function snapshot(E,config,run,mode,meta={}){
  if(!E.MODES.includes(mode)||run?.mode!==mode)throw Error('The selected scenario has no current results.');
  if(!Array.isArray(run.time)||run.time.length<2||run.time.some((t,i)=>!Number.isFinite(t)||(i&&t<=run.time[i-1]))||Math.abs(run.time.at(-1)-config.horizon)>1e-7)throw Error('Update the simulation before creating a handout.');
  const c=E.effectiveConfig(config),fitCount=meta.fitCount??(config.observations||[]).filter(x=>x.role==='fit').length;
  const series={};
  for(const key of ['plasma','cmmg']){
   if(['median','lower','upper'].some(k=>!Array.isArray(run[key]?.[k])||run[key][k].length!==run.time.length||run[key][k].some(v=>!Number.isFinite(v))))throw Error('Chart data are incomplete.');
   series[key]=structuredClone(run[key]);
  }
  const regimen=c.dosingMode==='repeat'
   ? `${number(c.dose)} mg ${c.route}, every ${number(c.every)} h; ${run.doses.length} administrations within the window${c.route==='Acyclovir IV'?'; '+number(c.infusion)+' h infusions':''}.`
   : `${run.doses.length} custom administrations. `+run.doses.slice(0,6).map(d=>`${number(d.time)} h: ${number(d.amount)} mg ${d.route}${d.route==='Acyclovir IV'?' over '+number(d.infusion)+' h':''}`).join('; ')+(run.doses.length>6?'; additional doses are in the saved configuration.':'.');
  const kidney=c.renalMode==='profile'
   ? 'Time-varying CrCl: '+c.renalProfile.slice(0,5).map(p=>`${number(p.time)} h → ${number(p.crcl)} mL/min`).join('; ')+(c.renalProfile.length>5?'; further knots in configuration.':'.')
   : `${number(c.crcl)} mL/min${c.crclSource==='estimated'?' (Cockcroft–Gault; '+(c.cgWeight||'actual')+' weight)':' (entered)'}.`;
  const windows=run.rows.map(r=>({type:r.type,start:r.start,end:Math.min(c.horizon,r.end)}));
  let dialysis=mode==='No dialysis'?'No dialysis in this scenario.':windows.length+' dialysis windows: '+windows.slice(0,5).map(r=>`${r.type} ${number(r.start)}–${number(r.end)} h`).join('; ')+(windows.length>5?'; further windows in configuration.':'.');
  if(windows.some(r=>r.type==='HD'))dialysis+=` HD clearance: ${number(c.hdCl)} mL/min.`;
  if(windows.some(r=>r.type==='CRRT'))dialysis+=` CRRT: ${number(c.effluent)} mL/kg/h; sieving ${number(c.sieving)}, delivered fraction ${number(c.delivered)}.`;
  if(windows.some(r=>['CAPD','APD'].includes(r.type)))dialysis+=c.pdRxEnabled?` Exchange-level prescription: ${c.pdRxRows.length} rows; see saved configuration for the complete exchange table.`:` PD fill ${number(c.pdVolume)} L; ${c.pdMethod==='cycler'?c.apdCycles+' cycles/night':c.capdExchanges+' exchanges/day'}; dextrose ${number(c.pdGlucose)}%.`;
  const modifiers=[['vcScale','Central volume ×'],['clearanceScale','Parent clearance ×'],['formFactor','CMMG formation ×'],['metRenal','CMMG renal clearance ×'],['metDial','CMMG dialytic clearance ×'],['valF','Oral bioavailability '],['valKa','Oral absorption rate /h ']].filter(([k])=>c[k]!==E.DEFAULTS[k]).map(([k,label])=>label+number(c[k],4));
  if(c.probenecid)modifiers.push('Probenecid renal modifier enabled');
  const metric=(key,label,unit)=>{
   const value=run.summary[key];if(!Number.isFinite(value?.median))throw Error('Summary metrics are incomplete.');
   return {label,unit,value:structuredClone(value)};
  };
  // Only selected output arrays and human-readable settings enter the sheet; measurements never do.
  return {version:String(meta.version||'unknown'),generatedAt:meta.generatedAt||new Date().toISOString(),mode,horizon:c.horizon,
   patient:`Weight ${number(c.weight)} kg; age ${number(c.age)}; ${c.sex} coefficient.`,kidney,regimen,dialysis,modifiers,
   coverage:c.coverage,variability:c.variability,draws:c.draws,fitCount,
   time:run.time.slice(),series,windows,doseTimes:run.doses.map(d=>d.time),
   metrics:[metric('peak','Peak acyclovir','mg/L'),metric('auc','Acyclovir AUC, 0–'+number(c.horizon)+' h','mg·h/L'),metric('mPeak','Peak plasma CMMG','mg/L'),metric('mass','Removed by dialysis','mg'),metric('endPlasma','End-window acyclovir','mg/L')]};
 }
 function element(doc,tag,className,text){const n=doc.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
 function svgElement(doc,tag,attrs){const n=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs||{}))n.setAttribute(k,v);return n;}
 function chart(doc,s,key,title,color){
  const svg=svgElement(doc,'svg',{viewBox:'0 0 700 210',role:'img','aria-label':title+' model median and parameter band, in mg/L'});
  const left=52,right=686,top=20,bottom=177,values=s.series[key],max=Math.max(1,...values.upper)*1.05;
  const x=t=>left+(right-left)*t/s.horizon,y=v=>bottom-(bottom-top)*v/max;
  const add=(tag,attrs,text)=>{const el=svgElement(doc,tag,attrs);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
  add('rect',{x:0,y:0,width:700,height:210,fill:'#fff'});
  for(const w of s.windows)add('rect',{x:x(w.start),y:top,width:Math.max(0,x(w.end)-x(w.start)),height:bottom-top,fill:'#edf3f6'});
  for(let i=0;i<=4;i++){
   const v=max*i/4,py=y(v);add('line',{x1:left,x2:right,y1:py,y2:py,stroke:'#dce5eb'});
   add('text',{x:left-7,y:py+4,'text-anchor':'end',fill:'#345063','font-size':11},number(v,2));
  }
  for(const t of [0,s.horizon/2,s.horizon])add('text',{x:x(t),y:194,'text-anchor':'middle',fill:'#345063','font-size':11},number(t));
  const curve=arr=>s.time.map((t,i)=>x(t).toFixed(2)+','+y(arr[i]).toFixed(2)).join(' ');
  const band=curve(values.upper)+' '+s.time.map((t,i)=>x(t).toFixed(2)+','+y(values.lower[i]).toFixed(2)).reverse().join(' ');
  add('polygon',{points:band,fill:color,'fill-opacity':.14});
  for(const t of s.doseTimes)if(s.doseTimes.length<=24)add('line',{x1:x(t),x2:x(t),y1:top,y2:bottom,stroke:'#9aaab4','stroke-dasharray':'3 4','stroke-width':.7});
  add('polyline',{points:curve(values.median),fill:'none',stroke:color,'stroke-width':1.8});
  add('text',{x:left,y:12,fill:'#24485d','font-weight':700,'font-size':12},title+' (mg/L)');
  add('text',{x:right,y:207,'text-anchor':'end',fill:'#345063','font-size':10},'Time since simulation start (h)');
  return svg;
 }
 function show(doc,s){
  doc.getElementById('ayfluxScenarioSummary')?.remove();
  const dialog=element(doc,'dialog','ay-summary');dialog.id='ayfluxScenarioSummary';dialog.setAttribute('aria-labelledby','ay-summary-title');
  const tools=element(doc,'div','ay-summary-tools'),print=element(doc,'button','btn','Print / save PDF'),close=element(doc,'button','btn secondary','Close');
  print.type=close.type='button';print.addEventListener('click',()=>doc.defaultView.print());close.addEventListener('click',()=>dialog.close());tools.append(print,close);dialog.append(tools);
  const sheet=element(doc,'article','ay-summary-sheet'),title=element(doc,'h1',null,'AyFlux scenario summary');title.id='ay-summary-title';sheet.append(title);
  sheet.append(element(doc,'p','ay-summary-meta',`${s.mode} · AyFlux ${s.version} · ${new Date(s.generatedAt).toLocaleString(undefined,{timeZoneName:'short'})}`));
  sheet.append(element(doc,'p','ay-summary-notice','Educational model outputs only. Not validated for prescribing, toxicity assessment or dialysis decisions.'));
  const inputs=element(doc,'dl','ay-summary-inputs');
  for(const [label,value] of [['Patient inputs',s.patient],['Kidney function',s.kidney],['Medication',s.regimen],['Dialysis',s.dialysis],...(s.modifiers.length?[['Other modifiers',s.modifiers.join('; ')]]:[])])inputs.append(element(doc,'dt',null,label),element(doc,'dd',null,value));
  sheet.append(inputs);
  const metrics=element(doc,'div','ay-summary-metrics');
  for(const m of s.metrics){const card=element(doc,'div');card.append(element(doc,'span',null,m.label),element(doc,'strong',null,number(m.value.median)+' '+m.unit));metrics.append(card);}
  sheet.append(metrics,chart(doc,s,'plasma','Plasma acyclovir','#23658c'),chart(doc,s,'cmmg','Plasma CMMG (exploratory)','#9b6b1e'));
  const band=s.variability===0?'Nominal deterministic curves.':`Curves show model medians; shading is the assumed ${number(100*s.coverage)}% ${s.fitCount?'reweighted ':''}parameter band from ${s.draws} draws. Parameter bands are not validated clinical prediction intervals.`;
  sheet.append(element(doc,'p','ay-summary-foot',band+' '+(s.fitCount?`${s.fitCount} fitting measurements informed reweighting; individual measurements are omitted. `:'')+'Peak metrics summarize draw-wise peaks and may differ from peaks of the median curve. Grey areas mark dialysis windows; dashed lines mark administrations when 24 or fewer.'));
  sheet.append(element(doc,'p','ay-summary-foot','This handout summarizes the selected scenario; it is not a complete prescription or model file. Keep the saved configuration JSON and results CSV for the full inputs. Concentrations remain in mg/L. Methods and references: ayflux.org/learn/model-methods/.'));
  dialog.append(sheet);doc.body.append(dialog);doc.body.classList.add('ay-summary-open');
  dialog.addEventListener('close',()=>doc.body.classList.remove('ay-summary-open'));
  dialog.showModal();return dialog;
 }
 return {snapshot,show,chart};
});
