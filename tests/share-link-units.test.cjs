'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('public/assets/simulator-ui.js');
const E=require('../public/assets/pk-engine.js');
const section=(start,end)=>{const i=ui.indexOf(start),j=ui.indexOf(end,i);assert.ok(i>=0&&j>i,start);return ui.slice(i,j);};

test('µmol/L display uses the molar masses the engine uses, and leaves non-concentrations alone',()=>{
 const context={document:{getElementById:()=>null}};
 vm.runInNewContext(section('const MOLAR_MASS=','function tableOpen(')+';this.api={unitFactor,unitLabel,unitText,shown,setConcUnit,CONCENTRATION_KEYS};',context);
 const u=context.api;
 assert.equal(u.shown(2,'acyclovir'),2);assert.equal(u.unitLabel(),'mg/L');
 u.setConcUnit('umol');
 assert.equal(u.unitLabel(),'µmol/L');
 // The plotted CMMG marker (2.58 mg/L in the engine) must read 10.8 µmol/L.
 assert.ok(Math.abs(u.shown(E.MARKER,'cmmg')-10.8)<1e-9);
 assert.ok(Math.abs(u.shown(1,'acyclovir')-1000/225.21)<1e-12);
 assert.equal(u.shown(350),350,'amounts in mg are not converted');
 assert.equal(u.unitText('Plasma acyclovir AUC (mg·h/L)'),'Plasma acyclovir AUC (µmol·h/L)');
 assert.equal(JSON.stringify(u.CONCENTRATION_KEYS),JSON.stringify({plasma:'acyclovir',csf:'acyclovir',cmmg:'cmmg',csfCmmg:'cmmg'}));
 u.setConcUnit('nonsense');assert.equal(u.unitLabel(),'mg/L');
 assert.match(read('public/assets/pk-engine.js'),/const MARKER=10\.8\*239\.19\/1000;/);
 assert.match(read('public/assets/pk-engine.js'),/ACV_MW=225\.21/);
});

test('share codes round-trip Unicode and reject anything that is not base64url',()=>{
 const context={TextEncoder,TextDecoder,btoa,atob,Uint8Array};
 vm.runInNewContext(section('function encodeShare(','function shareLink(')+';this.api={encodeShare,decodeShare};',context);
 const text=JSON.stringify({v:1,c:{route:'Valacyclovir oral',note:'µmol — ✓'},p:'CRRT'});
 const code=context.api.encodeShare(text);
 assert.match(code,/^[A-Za-z0-9_-]+$/);
 assert.equal(context.api.decodeShare(code),text);
 for(const bad of ['','abc def','<script>','a+b/c='])assert.throws(()=>context.api.decodeShare(bad),/damaged or incomplete/);
});

test('shared links go through full validation, never carry measurements, and leave the address bar',()=>{
 const share=section('// ---------- Shareable links','$(\'undoImport\')');
 // Building: observations are skipped and only non-default settings are sent.
 assert.match(share,/if\(key==='observations'\)continue;/);
 assert.match(share,/JSON\.stringify\(c\[key\]\)!==JSON\.stringify\(E\.DEFAULTS\[key\]\)/);
 // Reading: the same validator as file import, on a defaults-filled configuration; measurements refused.
 assert.match(share,/parseConfiguration\(\{format:'acyclovir-pk-simulator',schemaVersion:2,config:\{\.\.\.structuredClone\(E\.DEFAULTS\),\.\.\.data\.c\}/);
 assert.match(share,/hasOwnProperty\.call\(data\.c,'observations'\)\)throw/);
 // The fragment is removed before anything is parsed or applied.
 const open=share.slice(share.indexOf('function openSharedLink'));
 assert.ok(open.indexOf('history.replaceState')<open.indexOf('readShare(hash)'));
 assert.ok(open.indexOf('readShare(hash)')<open.indexOf('applyVersion(state)'));
 // Nothing here talks to a server or writes storage, and no markup is built from link content.
 assert.doesNotMatch(share,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|innerHTML/);
 const html=read('public/index.html');
 for(const id of ['copyShareLink','shareLinkField','concUnit'])assert.ok(html.includes('id="'+id+'"'),id);
 // No third-party script is loaded on the page that reads share links.
 assert.doesNotMatch(html,/<script[^>]+src="https?:/);
 assert.match(html,/<script src="\.\/assets\/simulator-ui\.js">/);
});
