/* Minimal, dependency-free OOXML export for OSP concentration-data import.
 * Copyright 2026 Muhammad Khalil. AGPL-3.0-only. */
(function(root){
'use strict';
const enc=new TextEncoder();
const xml=s=>String(s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(data){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function zip(files){const parts=[],central=[];let offset=0;
 for(const [name,source] of Object.entries(files)){const filename=enc.encode(name),data=enc.encode(source),check=crc(data);const h=new Uint8Array(30+filename.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,check,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,filename.length,true);h.set(filename,30);
 const c=new Uint8Array(46+filename.length),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint32(16,check,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,filename.length,true);d.setUint32(42,offset,true);c.set(filename,46);central.push(c);parts.push(h,data);offset+=h.length+data.length;
 }const size=central.reduce((a,v)=>a+v.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,central.length,true);v.setUint16(10,central.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);const out=new Uint8Array(offset+size+22);let pos=0;for(const a of [...parts,...central,end]){out.set(a,pos);pos+=a.length;}return out;
}
function workbook(results,names,version='AyFlux'){
 if(!Array.isArray(names)||!names.length)throw Error('No scenarios to export.');
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main',rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships',pkg='http://schemas.openxmlformats.org/package/2006/relationships';
 const files={},sheets=[];const headers=['Time [h]','Concentration [mg/l]','Scenario','Molecule','Compartment','Data type','Statistic','Software'];
 function cell(value,col,row){const ref=String.fromCharCode(65+col)+row;if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite exported value');return `<c r="${ref}"><v>${value}</v></c>`;}return `<c r="${ref}" t="inlineStr"${row===1?' s="1"':''}><is><t xml:space="preserve">${xml(value)}</t></is></c>`;}
 for(const name of names){const sim=results?.[name];if(!Array.isArray(sim?.time)||sim.time.length<2||sim.time.length>100000)throw Error('Missing or invalid scenario time series.');
 for(const [key,molecule,compartment] of [['plasma','Acyclovir','Plasma'],['csf','Acyclovir','CSF'],['cmmg','CMMG','Plasma'],['csfCmmg','CMMG','CSF']]){
 if(!Array.isArray(sim[key]?.median)||sim[key].median.length!==sim.time.length)throw Error('Missing concentration series: '+key);
 const index=sheets.length+1,sheetName=`${names.indexOf(name)+1}_${key}`;sheets.push({index,name:sheetName});
 const rows=[headers,...sim.time.map((t,i)=>{if(!Number.isFinite(t)||t<0||(i&&t<sim.time[i-1]))throw Error('Invalid time values');const value=sim[key].median[i];if(!Number.isFinite(value)||value<0)throw Error('Invalid concentration');return [t,value,name,molecule,compartment,'Simulated prediction','Median',version];})];
 files[`xl/worksheets/sheet${index}.xml`]=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="2" width="25" customWidth="1"/><col min="3" max="8" width="24" customWidth="1"/></cols><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,j,i+1)).join('')}</row>`).join('')}</sheetData><autoFilter ref="A1:H${rows.length}"/></worksheet>`;
 }}
 files['[Content_Types].xml']=`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map(s=>`<Override PartName="/xl/worksheets/sheet${s.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
 files['_rels/.rels']=`<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
 files['xl/workbook.xml']=`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>${sheets.map(s=>`<sheet name="${s.name}" sheetId="${s.index}" r:id="rId${s.index}"/>`).join('')}</sheets></workbook>`;
 files['xl/_rels/workbook.xml.rels']=`<Relationships xmlns="${pkg}">${sheets.map(s=>`<Relationship Id="rId${s.index}" Type="${rel}/worksheet" Target="worksheets/sheet${s.index}.xml"/>`).join('')}<Relationship Id="styles" Type="${rel}/styles" Target="styles.xml"/></Relationships>`;
 files['xl/styles.xml']=`<styleSheet xmlns="${ns}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
 return zip(files);
}
const api={workbook};if(typeof module==='object')module.exports=api;else root.AyFluxXlsx=api;
})(typeof globalThis!=='undefined'?globalThis:this);
