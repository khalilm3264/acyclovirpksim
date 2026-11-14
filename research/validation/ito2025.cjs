'use strict';
// Conditional washout comparison. Parameters come directly from the pinned engine.
// Only the admission central concentration is used for initialization.
const pk=require('../../public/assets/pk-engine.js');
const protocol=Object.freeze({
 weight:66.2,admissionMgL:14.1,followup:[{hour:15,mgL:3},{hour:39,mgL:0.5}],
 start:4.5,firstDuration:7,interruption:5.5,firstEffluentLh:2.1,secondEffluentLh:0.8,
 crcl:12.9,sieving:0.95,delivered:1,initialPeripheralRatio:1,dt:0.01
});
function evaluate(overrides={}){
 const c={...protocol,...overrides};
 const p=pk.drawParams({...pk.DEFAULTS,weight:c.weight,crcl:c.crcl,draws:1,variability:0})[0];
 let a=c.admissionMgL*p.vc,b=c.admissionMgL*c.initialPeripheralRatio*p.vp,t=0;
 const restart=c.start+c.firstDuration+c.interruption;
 function derivative(t,a,b){
  let effluent=0;
  if(t>=c.start&&t<c.start+c.firstDuration)effluent=c.firstEffluentLh;
  if(t>=restart)effluent=c.secondEffluentLh;
  const central=a/p.vc,peripheral=b/p.vp;
  const exchange=p.q*(central-peripheral);
  return [-(p.other+p.renal+p.form+effluent*c.sieving*c.delivered)*central-exchange,exchange];
 }
 const predictions=[];
 for(const observation of c.followup){
  while(t<observation.hour-1e-9){
   const boundaries=[c.start,c.start+c.firstDuration,restart,observation.hour].filter(x=>x>t+1e-9);
   const h=Math.min(c.dt,Math.min(...boundaries)-t);
   // Evaluate each step inside a single treatment interval.
   const mid=t+h/2;
   const k1=derivative(mid,a,b),k2=derivative(mid,a+h*k1[0]/2,b+h*k1[1]/2);
   const k3=derivative(mid,a+h*k2[0]/2,b+h*k2[1]/2),k4=derivative(mid,a+h*k3[0],b+h*k3[1]);
   a+=h*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6;
   b+=h*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;t+=h;
  }
  const predicted=a/p.vc;
  predictions.push({...observation,predictedMgL:predicted,predictedObserved:predicted/observation.mgL});
 }
 return {assumptions:c,predictions};
}
if(require.main===module)console.log(JSON.stringify({
 baseline:evaluate(),
 sensitivities:[
  evaluate({crcl:0}),evaluate({initialPeripheralRatio:0.5}),evaluate({initialPeripheralRatio:2}),
  evaluate({firstDuration:8.5,interruption:5}),
  evaluate({firstEffluentLh:0,secondEffluentLh:0}),evaluate({dt:0.005})
 ]
},null,2));
module.exports={protocol,evaluate};
