/*
 * AyFlux OSP CSV result parser and comparison utilities.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 * Local file parsing; does not upload user content.
 */
(function(root,factory) {
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports) module.exports=api;
 if(root)root.AyFluxOspImport=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const MOLECULAR_WEIGHTS=Object.freeze({acyclovir:225.21,cmmg:239.19});
 function parseCSV(input){
  if(typeof input!=="string"||input.length>4*1024*1024)throw Error("CSV is empty or larger than 4 MB.");
  const text=input.replace(/^\uFEFF/,"");
  const firstLine=text.split(/\r?\n/,1)[0];
  const count=(symbol)=>(firstLine.match(new RegExp(symbol==="\t"?"\\t":symbol===";"?";":",","g"))||[]).length;
  const delimiter=count("\t")>count(",")&&count("\t")>count(";")?"\t":count(";")>count(",")?";":",";
  const rows=[],row=[];let cell="",quoted=false;
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(quoted){
    if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}
    else if(ch==='"')quoted=false;
    else cell+=ch;
   }else if(ch==='"'){
    if(cell!=="")throw Error("Malformed quote in CSV.");
    quoted=true;
   }else if(ch===delimiter){row.push(cell);cell="";}
   else if(ch==="\r"||ch==="\n"){
    if(ch==="\r"&&text[i+1]==="\n")i++;
    row.push(cell);cell="";
    if(row.some(v=>v.trim()!==""))rows.push(row.slice());
    row.length=0;
    if(rows.length>30001)throw Error("CSV exceeds 30,000 rows.");
   }else cell+=ch;
  }
  if(quoted)throw Error("Unterminated quoted field.");
  row.push(cell);
  if(row.some(v=>v.trim()!==""))rows.push(row.slice());
  if(rows.length<2)throw Error("CSV needs a header and at least one data row.");
  const headers=rows.shift().map(s=>s.trim());
  if(headers.length<2||headers.some(s=>!s))throw Error("CSV header is missing or incomplete.");
  if(rows.some(r=>r.length!==headers.length))throw Error("CSV rows have inconsistent column counts.");
  return {delimiter,headers,rows};
 }
 function toNumber(text,decimalComma=false){
  const trimmed=String(text).trim();
  if(!trimmed)return NaN;
  const normalized=decimalComma?trimmed.replace(/\./g,"").replace(",","."):trimmed;
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/.test(normalized))return NaN;
  return Number(normalized);
 }
 function selectSeries(table,{timeColumn,concentrationColumn,timeUnit="h",concentrationUnit="mg/L",analyte="acyclovir",decimalComma=false}={}){
  const timeIndex=table.headers.indexOf(timeColumn),valueIndex=table.headers.indexOf(concentrationColumn);
  if(timeIndex<0||valueIndex<0||timeIndex===valueIndex)throw Error("Choose distinct time and concentration columns.");
  const timeScale={h:1,min:1/60,day:24}[timeUnit];
  if(!timeScale)throw Error("Unsupported time unit.");
  let valueScale;
  if(concentrationUnit==="mg/L"||concentrationUnit==="ug/mL")valueScale=1;
  else if(concentrationUnit==="umol/L"){
   if(!MOLECULAR_WEIGHTS[analyte])throw Error("Select the correct molecule for molar conversion.");
   valueScale=MOLECULAR_WEIGHTS[analyte]/1000;
  }else throw Error("Unsupported concentration unit.");
  const out=[];
  for(const row of table.rows){
   const t=toNumber(row[timeIndex],decimalComma),v=toNumber(row[valueIndex],decimalComma);
   if(!Number.isFinite(t)||t<0||!Number.isFinite(v)||v<0)throw Error("CSV includes invalid, negative, or missing numeric values.");
   out.push({time:t*timeScale,concentration:v*valueScale});
  }
  out.sort((a,b)=>a.time-b.time);
  if(out.length<2||out.length>30000||out.at(-1).time<=out[0].time)throw Error("At least two distinct sample times are required.");
  return {time:out.map(p=>p.time),concentration:out.map(p=>p.concentration)};
 }
 function interpolate(times,values,t){
  if(!times.length||t<times[0]||t>times.at(-1))return null;
  let lo=0,hi=times.length-1;
  while(hi-lo>1){const k=(lo+hi)>>1;if(times[k]<=t)lo=k;else hi=k;}
  if(t===times[lo])return values[lo];
  if(t===times[hi])return values[hi];
  const d=times[hi]-times[lo];
  return d>0?values[lo]+(values[hi]-values[lo])*(t-times[lo])/d:values[lo];
 }
 function compareCurves(model,external){
  if(!model||!external||model.time.length!==model.concentration.length)throw Error("Inconsistent model curve.");
  const points=[];
  for(let i=0;i<external.time.length;i++){
   const pred=interpolate(model.time,model.concentration,external.time[i]);
   if(pred!==null && Number.isFinite(pred))points.push({time:external.time[i],model:pred,external:external.concentration[i],difference:pred-external.concentration[i]});
  }
  if(points.length<2)throw Error("No adequate overlapping time window between curves.");
  const mean=f=>points.reduce((sum,p)=>sum+f(p),0)/points.length;
  return {points,rmse:Math.sqrt(mean(p=>p.difference*p.difference)),
   mae:mean(p=>Math.abs(p.difference)),bias:mean(p=>p.difference)};
 }
 return {MOLECULAR_WEIGHTS,parseCSV,selectSeries,interpolate,compareCurves};
});
