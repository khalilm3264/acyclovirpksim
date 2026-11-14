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
 $('laskinCompareField').classList.toggle('hidden',study.id!=='laskin');
 $('literatureAlternative').textContent=study.alternative?'Previous CSF coefficient 0.25':'Comparison';
 $('literatureNote').textContent=study.note;
 $('literatureSource').href='https://doi.org/'+study.doi;
 $('literatureSource').textContent='DOI '+study.doi;
 $('literatureStatus').textContent='';
}
$('literatureCase').addEventListener('change',clear);
$('laskinCompare').addEventListener('change',clear);
$('runLiterature').addEventListener('click',async()=>{
 clear();const version=generation;
 try{
  current=new Worker('/assets/research-worker.js');
  const result=await new Promise((resolve,reject)=>{
   current.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data);
   current.onerror=()=>reject(Error('Literature worker could not run. Reload and try again.'));
   const caseId=$('literatureCase').value;
   let calibration=null;
   if(caseId==='laskin'&&$('laskinCompare').checked){
    const {vcScale,clearanceScale}=window.AyFluxResearchBridge.snapshot().config;
    calibration={vcScale,clearanceScale};
   }
   current.postMessage({id:version,action:'case',caseId,calibration});
  });
  if(version!==generation)return;
  current?.terminate();current=null;
  const {study,time,values,alternative,alternativeLabel,auc,alternativeAuc}=result.data;
  $('literatureAlternative').textContent=alternativeLabel||'Comparison';
  const rows=study.interval?
   [['CSF CMMG AUC, hours '+study.interval.join('–')+' (mg·h/L)',study.observedAuc,auc,alternativeAuc]]:
   study.points.map(point=>{
    const index=time.findIndex(t=>Math.abs(t-point.time)<1e-8);
    return ['Plasma at '+point.time+' h (mg/L), group SD '+point.sd.toFixed(3),point.value,values[index],alternative?.[index]??null];
   });
  function modelCell(value,observed){
   if(value===null)return '—';
   if(study.id!=='laskin')return value.toFixed(3);
   const difference=100*(value/observed-1);
   return value.toFixed(3)+' ('+(difference>=0?'+':'')+difference.toFixed(1)+'%)';
  }
  for(const [label,observed,predicted,other] of rows){
   const tr=document.createElement('tr');
   for(const text of [label,observed.toFixed(3),modelCell(predicted,observed),modelCell(other,observed)]){
    const td=document.createElement('td');td.textContent=text;tr.append(td);
   }
   $('literatureRows').append(tr);
  }
  $('literatureStatus').textContent=study.id==='laskin'?'Parentheses show the difference from the published mean.':'Published values are group summaries.';
  await window.AyFluxCharts.ensure();
  if(version!==generation)return;
  const charts=window.AyFluxCharts,series=[charts.line('Nominal model',time,values,'#285a7b')];
  if(alternative)series.push(charts.line(alternativeLabel,time,alternative,'#b55b16',2,'dashed'));
  if(study.points.length){
   series.push({name:'Published mean ± SD',type:'custom',z:5,
    dimensions:['Time (h)','Mean (mg/L)','Lower (mg/L)','Upper (mg/L)'],
    encode:{x:0,y:[1,2,3],tooltip:[1,2,3]},
    data:study.points.map(p=>[p.time,p.value,p.value-p.sd,p.value+p.sd]),
    renderItem:(_,api)=>{
     const [x,y]=api.coord([api.value(0),api.value(1)]);
     const low=api.coord([api.value(0),api.value(2)])[1],high=api.coord([api.value(0),api.value(3)])[1];
     const line=(x1,y1,x2,y2)=>({type:'line',shape:{x1,y1,x2,y2},style:{stroke:'#222',lineWidth:1.5}});
     return {type:'group',children:[line(x,low,x,high),line(x-4,low,x+4,low),line(x-4,high,x+4,high),
      {type:'circle',shape:{cx:x,cy:y,r:4},style:{fill:'#222'}}]};
    }});
  }
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
