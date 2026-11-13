/* SPDX-License-Identifier: AGPL-3.0-only */
(function(){
'use strict';
const $=id=>document.getElementById(id),library=window.AyFluxLiterature;
let generation=0,current=null;
for(const study of library.cases()){
 const option=document.createElement('option');option.value=study.id;option.textContent=study.label;$('literatureCase').append(option);
}
function clear(){
 generation++;current?.terminate();current=null;
 window.AyFluxCharts.dispose($('literaturePlot'));
 $('literaturePlot').classList.add('hidden');$('literatureRows').replaceChildren();
 const study=library.cases().find(s=>s.id===$('literatureCase').value);
 $('literatureNote').textContent=study.note;
 $('literatureSource').href='https://doi.org/'+study.doi;
 $('literatureSource').textContent='DOI '+study.doi;
 $('literatureStatus').textContent='';
}
$('literatureCase').addEventListener('change',clear);
$('runLiterature').addEventListener('click',async()=>{
 clear();const version=generation;
 try{
  current=new Worker('/assets/research-worker.js');
  const result=await new Promise((resolve,reject)=>{
   current.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);
   current.onerror=()=>reject(Error('Literature worker could not run. Reload and try again.'));
   current.postMessage({id:version,action:'case',caseId:$('literatureCase').value});
  });
  current?.terminate();current=null;
  if(version!==generation)return;
  const {study,time,values,alternative,auc,alternativeAuc}=result.data;
  const rows=study.interval?
   [['CSF CMMG AUC, hours '+study.interval.join('–')+' (mg·h/L)',study.observedAuc,auc,alternativeAuc]]:
   study.points.map(point=>{
    const index=time.findIndex(t=>Math.abs(t-point.time)<1e-8);
    return ['Plasma at '+point.time+' h (mg/L), group SD '+point.sd.toFixed(3),point.value,values[index],null];
   });
  for(const [label,observed,predicted,other] of rows){
   const tr=document.createElement('tr');
   for(const text of [label,observed.toFixed(3),predicted.toFixed(3),other===null?'—':other.toFixed(3)]){
    const td=document.createElement('td');td.textContent=text;tr.append(td);
   }
   $('literatureRows').append(tr);
  }
  $('literatureStatus').textContent='Calculation '+result.elapsedMs.toFixed(0)+' ms. Published values are group summaries. Curves use nominal parameters.';
  await window.AyFluxCharts.ensure();
  if(version!==generation)return;
  const charts=window.AyFluxCharts,series=[charts.line('Nominal model',time,values,'#285a7b')];
  if(alternative)series.push(charts.line('Previous default CSF coefficient 0.25',time,alternative,'#b55b16',2,'dashed'));
  if(study.points.length)series.push({name:'Published group mean',type:'scatter',symbolSize:10,data:study.points.map(v=>[v.time,v.value])});
  const option=charts.options(series,'Time since first dose (hours)',(study.analyte==='plasma'?'Plasma acyclovir':'CSF CMMG')+' (mg/L)');
  $('literaturePlot').classList.remove('hidden');charts.draw($('literaturePlot'),option);
 }catch(error){if(version===generation)$('literatureStatus').textContent=error.message;}
});
$('downloadLiterature').addEventListener('click',()=>{
 const study=library.cases().find(s=>s.id===$('literatureCase').value);
 const data=library.configuration(study.id);
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='ayflux-'+study.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
clear();
})();
