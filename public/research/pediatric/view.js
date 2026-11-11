/* Copyright (C) 2026 Muhammad Khalil. SPDX-License-Identifier: AGPL-3.0-only */
'use strict';
(() => {
  const model = window.AyFluxPediatric;
  const $ = id => document.getElementById(id);
  let last=null;
  const charts=window.AyFluxCharts;
  function draw(rows){
   const t=rows.map(r=>r.time),values=key=>rows.map(r=>r[key]);
   const series=[charts.band('90% model interval',t,values('p05'),values('p95'),'#c6dfed'),
    charts.line('Selected eGFR',t,values('typical'),'#0072b2'),charts.line('Comparison eGFR',t,values('comparison'),'#d55e00',2,'dashed')];
   charts.ensure().then(()=>charts.draw($('chart'),charts.options(series,'Time (hours)','Plasma acyclovir (mg/L)')))
    .catch(error=>{$('error').textContent=error.message+' Results are available in the table.';});
  }
  function drawMap(){
   if(!last||!$('pediatricMapPanel').open)return;
   const c=last.config,metric=$('pediatricMetric').value,fixed=$('pediatricConvention').value==='absolute';
   const xs=[...new Set([3.1,5,10,15,25,40,55,66,c.weight])].sort((a,b)=>a-b);
   const ys=[...new Set([56,80,120,164,200,250,300,350,399,c.egfr])].sort((a,b)=>a-b);
   const data=[];
   ys.forEach((egfr,j)=>xs.forEach((weight,i)=>{
    const dose=fixed?c.dose*c.weight/weight:c.dose;
    if(metric==='aucPerInterval'&&dose>30)return;
    data.push([i,j,model.summary({...c,weight,egfr,dose:metric==='aucPerInterval'?dose:c.dose})[metric]]);
   }));
   const unit={cl:'L/h',halfLife:'h',aucPerInterval:'mg·h/L'}[metric];
   const option=charts.heatmap(xs,ys,data,'Weight (kg)','eGFR (mL/min/1.73 m²)',unit);
   option.series.push({type:'scatter',symbol:'diamond',symbolSize:13,itemStyle:{color:'#e26b21',borderWidth:1,borderColor:'#222'},tooltip:{show:false},data:[[xs.indexOf(c.weight),ys.indexOf(c.egfr)]]});
   $('pediatricConvention').disabled=metric!=='aucPerInterval';
   $('pediatricMapNote').textContent='Diamond: selected child. '+(metric!=='aucPerInterval'?'This outcome is independent of dose.':fixed?'Fixed '+Number((c.dose*c.weight).toFixed(2))+' mg. Blank cells exceed the model input limit of 30 mg/kg.':'Fixed '+c.dose+' mg/kg per dose.');
   charts.ensure().then(()=>{if($('pediatricMapPanel').open)charts.draw($('pediatricMap'),option);}).catch(e=>{$('error').textContent=e.message;});
  }
  $('pediatricMapPanel').addEventListener('toggle',drawMap);
  for(const id of ['pediatricMetric','pediatricConvention'])$(id).onchange=drawMap;
  function run(event) {
    if (event) event.preventDefault();
    try {
      const config = Object.fromEntries(Object.keys(model.defaults).map(key => [key, Number($(key).value)]));
      const comparison = { ...config, egfr: Number($('compare').value) };
      const p = model.parameters(comparison);
      const rows = model.simulate(config).map(row => ({ ...row, comparison: model.concentration(row.time, comparison, p) }));
      const stats = model.summary(config);
      draw(rows);
      $('metrics').replaceChildren();
      for (const [label, value, unit] of [ ['Clearance', stats.cl, 'L/h'], ['Volume', stats.v, 'L'], ['Half-life', stats.halfLife, 'h'], ['Steady-state peak', stats.ssPeak, 'mg/L'], ['Steady-state trough', stats.ssTrough, 'mg/L'], ['AUC per steady-state interval', stats.aucPerInterval, 'mg·h/L'] ]) {
        const item = document.createElement('div'), strong = document.createElement('strong'), caption = document.createElement('span');
        strong.textContent = `${value.toFixed(2)} ${unit}`; caption.textContent = label; item.append(strong, caption); $('metrics').append(item);
      }
      $('rows').replaceChildren();
      const fragment = document.createDocumentFragment();
      for (const row of rows) {
        const tr = document.createElement('tr');
        for (const key of ['time', 'typical', 'p05', 'p50', 'p95', 'comparison']) { const td = document.createElement('td'); td.textContent = row[key].toFixed(3); tr.append(td); }
        fragment.append(tr);
      }
      $('rows').append(fragment);
      $('status').textContent = `Selected eGFR ${config.egfr}; comparison ${comparison.egfr} mL/min/1.73 m². ${config.doses} doses of ${(config.dose * config.weight).toFixed(1)} mg. Simulated band: 1,000 individuals, fixed seed 20261109.`;
      $('error').textContent = '';
      last = { config, comparison, rows };drawMap();
      $('export').disabled = false;
    } catch (error) {
      $('error').textContent = error.message;
      $('status').textContent = 'Inputs are invalid. Previously calculated results remain visible; update with valid inputs.';
      $('export').disabled = true;
    }
  }
  $('inputs').addEventListener('submit', run);
  $('inputs').addEventListener('input', () => { $('status').textContent = 'Inputs changed. Select Update curves to recalculate.'; $('export').disabled = true; });
  $('export').addEventListener('click', () => {
    if (!last) return;
    const { config: c, comparison, rows } = last;
    const header = 'model_doi,route,age_years,weight_kg,egfr_mL_min_1_73m2,comparison_egfr_mL_min_1_73m2,dose_mg_kg,interval_h,infusion_h,doses,ensemble_n,seed,time_h,typical_mg_L,p05_mg_L,p50_mg_L,p95_mg_L,comparison_typical_mg_L';
    const metadata = [model.source, 'IV', c.age, c.weight, c.egfr, comparison.egfr, c.dose, c.interval, c.infusion, c.doses, 1000, 20261109];
    const csv = [header, ...rows.map(r => [...metadata, r.time, r.typical, r.p05, r.p50, r.p95, r.comparison].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'ayflux-pediatric-abdalla-iv.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  run();
})();
