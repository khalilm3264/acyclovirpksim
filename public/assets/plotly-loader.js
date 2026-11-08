/*
 * AyFlux: load Plotly Basic only when a chart actually needs to render.
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 * The loader is tiny; the heavy library stays off the initial critical path.
 */
(function(root){
 "use strict";
 let pending=null;
 function ensure(){
  if(root.Plotly&&typeof root.Plotly.react==="function")return Promise.resolve(root.Plotly);
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
   const script=document.createElement("script");
   script.src="/assets/vendor/plotly-basic-3.3.1.min.js";
   script.async=true;
   script.onload=()=>{
    if(root.Plotly&&typeof root.Plotly.react==="function")resolve(root.Plotly);
    else reject(new Error("Plotly loaded without expected plotting functions."));
   };
   script.onerror=()=>reject(new Error("The chart library could not be loaded. Check your connection or try the Lite view."));
   document.head.appendChild(script);
  }).catch(error=>{pending=null;throw error;});
  return pending;
 }
 root.AyFluxPlotly=Object.freeze({ensure});
})(typeof window!=="undefined"?window:globalThis);
