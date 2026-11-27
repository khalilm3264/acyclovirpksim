const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const enginePath=path.resolve(process.argv[2] || path.join(__dirname, '../../public/assets/pk-engine.js'));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex'),'9c370f46ebb986e7192afe7b6822aa31ed6faff34f91856fa580acbbad4c139d');
const pk=require(enginePath), arms=require('./laskin-iv-figure1-markers.json'), out=[];
const auc=(rows,key)=>rows.slice(1).reduce((s,r,i)=>s+(r.t-rows[i].t)*(r[key]+rows[i][key])/2,0);
for(const a of arms){
 const mode='No dialysis', c={...pk.DEFAULTS,age:a.age,weight:a.wt,crcl:a.cr*a.bsa/1.73,route:'Acyclovir IV',dosingMode:'repeat',dose:a.wt*a.dose,doseCount:1,infusion:1,horizon:24,draws:1,variability:0,observations:[]};
 assert.deepEqual(pk.validate(c,mode),[]);
 const run=(dt)=>pk.single(c,pk.drawParams(c)[0],pk.scheduleFor(mode,c),dt);
 const p=run(1/64), q=run(1/128);
 const sample=(r,t)=>{const j=r.t.findIndex(x=>Math.abs(t-x)<1e-8);assert.ok(j>=0);return r.cols.plasma[j];};
 const [x0,x24,y100,y001]=a.axis;
 const rows=[{t:1,obs:a.peak,source:'printed_peak',status:'separate_anchor'},...a.pts.map(([t,x,y])=>({t,plot_t:(x-x0)*24/(x24-x0),x,y,obs:10**(2-4*(y-y100)/(y001-y100)),source:'fig1_mean_marker',status:t===15?'figure_time_not_in_methods':'primary'}))].map(r=>{const pred=sample(p,r.t);assert.ok(Math.abs(pred-sample(q,r.t))<0.001);return {...r,pred,ratio:pred/r.obs,residual:pred-r.obs};});
 const prim=rows.filter(r=>r.status==='primary'), plot=rows.filter(r=>r.source==='fig1_mean_marker');
 const summary=(r)=>({window:[r.at(0).t,r.at(-1).t],n:r.length,observed:auc(r,'obs'),predicted:auc(r,'pred'),ratio:auc(r,'pred')/auc(r,'obs')});
 out.push({dose:a.dose,crcl:c.crcl,rows,primary:summary(prim),incl15:summary(plot),peakPlus:summary(rows.filter(r=>r.t!==15))});
}
const keys=['t','plot_t','x','y','obs','pred','ratio','residual','source','status'];
fs.writeFileSync('laskin-iv-figure1-replay.csv',['dose_mg_kg,crcl_ml_min,t_h,figure_time_h,figure_x_px,figure_y_px,observed_mg_L,predicted_mg_L,p_over_o,p_minus_o_mg_L,source,scoring_status',...out.flatMap(a=>a.rows.map(r=>[a.dose,a.crcl.toFixed(4),...keys.map(k=>typeof r[k]==='number'?+r[k].toFixed(5):r[k]??'')].join(',')))].join('\n')+'\n');
fs.writeFileSync('summary.json',JSON.stringify(out,null,2));
for(const a of out) console.log(a.dose,a.primary,a.rows.map(r=>[r.t,+r.obs.toFixed(3),+r.pred.toFixed(3),+r.residual.toFixed(3)]));
