/*
 * AyFlux opt-in offline app shell (static resources only).
 * Copyright (C) 2026 Muhammad Khalil
 * SPDX-License-Identifier: AGPL-3.0-only
 */
(function(){
 "use strict";
 const target=document.getElementById("connectivityStatus");
 function update(){if(target)target.textContent=navigator.onLine?"Online":"Offline — cached pages only";}
 window.addEventListener("online",update);window.addEventListener("offline",update);
 update();
 if(!("serviceWorker" in navigator))return;
 const host=location.hostname;
 // GitHub Pages mirrors may be hosted under a project subpath; do not register a root-scope worker there.
 if(host!=="ayflux.org"&&host!=="www.ayflux.org"&&host!=="localhost"&&host!=="127.0.0.1")return;
 window.addEventListener("load",()=>{
  navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(error=>{
   if(target)target.title="Offline setup unavailable: "+error.message;
  });
 });
})();
