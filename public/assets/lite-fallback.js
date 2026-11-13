/*
 * AyFlux full-site slow-load escape hatch.
 * Copyright (C) 2026 Muhammad Khalil — SPDX-License-Identifier: AGPL-3.0-only.
 *
 * This is intentionally async and independent of external chart scripts, workers and all model
 * calculations. It NEVER redirects automatically or touches existing settings.
 */
(function(){
 "use strict";
 let ready=false,hidden=false,prompt=null;
 function clearPrompt(){ready=true;if(prompt){prompt.remove();prompt=null;}}
 if(document.documentElement.dataset.ayfluxReady==="true")ready=true;
 window.addEventListener("ayflux:charts-ready",clearPrompt);
 function offerLite(){
  if(hidden||ready||document.documentElement.dataset.ayfluxReady==="true")return;
  if(!document.body){setTimeout(offerLite,1200);return;}
  if(document.getElementById("liteFallbackPrompt"))return;
  prompt=document.createElement("aside");
  prompt.id="liteFallbackPrompt";
  prompt.setAttribute("aria-label","Lightweight simulator alternative");
  const label=document.createElement("strong");
  label.textContent="Still loading?";
  const text=document.createElement("p");
  text.textContent="Open the fixed-scenario quick view with basic controls.";
  const links=document.createElement("div");
  links.className="lite-fallback-actions";
  const link=document.createElement("a");
  link.href="/lite/";
  link.textContent="Open AyFlux Lite";
  const dismiss=document.createElement("button");
  dismiss.type="button";dismiss.textContent="Dismiss";
  dismiss.addEventListener("click",()=>{hidden=true;prompt?.remove();prompt=null;});
  links.append(link,dismiss);
  prompt.append(label,text,links);
  document.body.appendChild(prompt);
 }
 setTimeout(offerLite,9500);
})();
