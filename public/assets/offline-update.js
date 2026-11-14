// Offer updates in the full simulator. Keep any unsaved work in its original tab.
(function () {
 "use strict";
 const service = navigator.serviceWorker;
 const status = document.getElementById("connectivityStatus");
 if (!service || !status) return;

 const notice = document.createElement("span");
 notice.setAttribute("role", "status");
 const message = document.createElement("span");
 const refresh = document.createElement("button");
 refresh.type = "button";
 refresh.className = "footer-link";
 refresh.textContent = "Refresh to update";
 notice.append(message, " ", refresh);
 notice.hidden = true;
 status.after(notice);

 let registration;
 let requested = false;
 let controlled = !!service.controller;

 function offer() {
   notice.hidden = false;
   message.textContent = "Update available. Refreshing clears unsaved inputs.";
   refresh.disabled = false;
 }

 service.addEventListener("controllerchange", () => {
   if (requested) location.reload();
   else if (controlled) offer();
   controlled = true;
 });

 refresh.addEventListener("click", () => {
   if (!registration?.waiting) {
     location.reload();
     return;
   }
   requested = true;
   refresh.disabled = true;
   registration.waiting.postMessage("ayflux-apply-update");
 });

 service.addEventListener("message", event => {
   if (event.data !== "ayflux-other-tabs-open") return;
   requested = false;
   message.textContent = "Save your work and close other AyFlux tabs, then refresh here. Refreshing clears unsaved inputs.";
   refresh.disabled = false;
 });

 service.ready.then(reg => {
   registration = reg;
   function watch(worker) {
     if (!worker) return;
     const check = () => {
       if (reg.waiting && service.controller) offer();
     };
     worker.addEventListener("statechange", check);
     check();
   }
   reg.addEventListener("updatefound", () => watch(reg.installing));
   watch(reg.installing || reg.waiting);
 });
})();
