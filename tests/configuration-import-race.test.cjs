'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../public/assets/simulator-ui.js'),'utf8');

function workspace(){
 const elements=new Map(),history=[],messages=[];
 const $=id=>{
  if(!elements.has(id))elements.set(id,{value:'',textContent:'',classList:{
   hidden:true,add(){this.hidden=true;},toggle(_,hidden){this.hidden=hidden;}},
   addEventListener(type,fn){this[type]=fn;}});
  return elements.get(id);
 };
 const noop=()=>{},context={$,structuredClone,Set,c:{dose:700},concUnit:'mg',
  pendingConfigurationImport:null,primary:'No dialysis',visible:new Set(['No dialysis']),
  metricsSignature:'',tableRevision:0,studyOverlay:null,migratedPayload:null,
  paletteMode:'standard',draft:[],doseDraft:[],renalDraft:[],renalDirty:false,
  renalProfileEdited:false,measureDraft:[],rxDraft:[],researchRenderedPrimary:'',
  setPalette:noop,setConcUnit:noop,renderInputs:noop,renderSchedule:noop,
  renderDoseRows:noop,renderMeasureRows:noop,renderPdRxRows:noop,showScenarioNote:noop,
  researchStatus:message=>messages.push(message),alertMessage:noop,defer:noop,
  rememberVersion:label=>history.push({label,dose:context.c.dose}),
  E:{DEFAULTS:{dose:700}},parseConfiguration:input=>{
   if(!input.config)throw Error('Invalid configuration.');
   return {next:input.config,palette:'standard',migrating:!!input.old,
    converted:input.old?{converted:true}:null};
  }};
 vm.createContext(context);
 const apply=source.slice(source.indexOf('function applyVersion('),source.indexOf('function restoreVersion('));
 const load=source.slice(source.indexOf("$('loadConfig').addEventListener("),source.indexOf('\nopenSharedLink(true);'));
 const reset=source.slice(source.indexOf("$('resetDefaults').addEventListener("),source.indexOf("$('scenarioNoteClose').addEventListener("));
 vm.runInContext(apply+load+reset,context);
 function select(name){
  let resolve,reject;
  const text=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const target=$('loadConfig');target.value=name;
  const pending=target.change({target:{get files(){return [{name,size:100,text:()=>text}];},
   get value(){return target.value;},set value(value){target.value=value;}}});
  return {pending,resolve:input=>resolve(JSON.stringify(input)),raw:resolve,reject};
 }
 const payload=(dose,old=false)=>({config:{dose},primary:'No dialysis',visibleScenarios:['No dialysis'],old});
 return {$,context,history,messages,select,payload,last:()=>messages.at(-1)};
}

test('newer JSON import wins when the older read resolves last',async()=>{
 const w=workspace(),old=w.select('old.json'),fresh=w.select('fresh.json');
 fresh.resolve(w.payload(222,true));await fresh.pending;
 const message=w.last();old.resolve(w.payload(111));await old.pending;
 assert.equal(w.context.c.dose,222);
 assert.equal(w.history.length,1);
 assert.equal(w.history[0].dose,700);
 assert.equal(w.last(),message);
 assert.deepEqual(w.context.migratedPayload,{converted:true});
 assert.equal(w.$('downloadMigrated').classList.hidden,false);
});

for(const kind of ['valid','invalid','failure'])test('reset cancels stale JSON '+kind,async()=>{
 const w=workspace(),old=w.select('old.json');
 w.$('resetDefaults').click();const message=w.last();
 assert.equal(w.$('loadConfig').value,'');
 if(kind==='valid')old.resolve(w.payload(111,true));
 else if(kind==='invalid')old.raw('{bad JSON');
 else old.reject(Error('Read failed'));
 await old.pending;
 assert.equal(w.context.c.dose,700);
 assert.equal(w.history.length,1);
 assert.equal(w.last(),message);
 assert.equal(w.context.migratedPayload,null);
 assert.equal(w.$('downloadMigrated').classList.hidden,true);
 assert.equal(w.$('status').textContent,'');
});

test('stale read failure cannot clear a newer selected file or its status',async()=>{
 const w=workspace(),old=w.select('old.json'),fresh=w.select('fresh.json');
 old.reject(Error('Read failed'));await old.pending;
 assert.equal(w.$('loadConfig').value,'fresh.json');
 assert.equal(w.messages.length,0);
 fresh.resolve(w.payload(333));await fresh.pending;
 assert.equal(w.context.c.dose,333);
 assert.equal(w.$('loadConfig').value,'');
 assert.equal(w.history.length,1);
});

test('latest invalid JSON reports its error and clears only its own chooser',async()=>{
 const w=workspace(),current=w.select('invalid.json');
 current.raw('{bad JSON');await current.pending;
 assert.match(w.last(),/^Configuration not loaded, This is not valid JSON/);
 assert.equal(w.$('loadConfig').value,'');
 assert.equal(w.context.c.dose,700);
 assert.equal(w.history.length,0);
});

test('canceling the file selection invalidates a previous pending read',async()=>{
 const w=workspace(),old=w.select('old.json');
 await w.$('loadConfig').change({target:{files:[],value:''}});
 old.resolve(w.payload(111));await old.pending;
 assert.equal(w.context.c.dose,700);
 assert.equal(w.history.length,0);
 assert.equal(w.messages.length,0);
});

test('reset allows the same JSON file to be imported again',async()=>{
 const w=workspace(),old=w.select('same.json');
 w.$('resetDefaults').click();
 assert.equal(w.$('loadConfig').value,'');
 const retry=w.select('same.json');
 old.resolve(w.payload(111));await old.pending;
 assert.equal(w.$('loadConfig').value,'same.json');
 retry.resolve(w.payload(444));await retry.pending;
 assert.equal(w.context.c.dose,444);
 assert.equal(w.$('loadConfig').value,'');
});

test('an oversized newer selection invalidates an older pending import',async()=>{
 const w=workspace(),old=w.select('old.json');
 const target=w.$('loadConfig');target.value='large.json';
 await target.change({target:{files:[{size:1000001,name:'large.json'}],
  get value(){return target.value;},set value(value){target.value=value;}}});
 const message=w.last();old.resolve(w.payload(111));await old.pending;
 assert.match(message,/File is too large/);
 assert.equal(w.last(),message);
 assert.equal(w.context.c.dose,700);
 assert.equal(w.history.length,0);
});
