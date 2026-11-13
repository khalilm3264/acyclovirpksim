/* AyFlux offline cache: only public static application files, never user data. */
"use strict";
const CACHE = "ayflux-static-v0.26.0-regimens-post-hd-20261113";
const CORE = [
 "/", "/index.html", "/manifest.webmanifest", "/app-icon.svg",
 "/favicon.ico", "/ayflux-molecular-logo.svg",
 "/assets/pk-engine.js", "/assets/simulator-ui.js", "/assets/study-library.js",
 "/assets/ayflux-exchange.js", "/assets/ayflux-version.js",
 "/assets/model-integrity.js", "/assets/research-workspace.js", "/assets/regimen-tools.js",
 "/assets/charts.js", "/assets/analysis-views.js",
 "/lite/", "/lite/lite.js",
 "/assets/fonts/poppins-latin-300-normal.woff2", "/assets/fonts/poppins-latin-800-normal.woff2",
 "/learn/", "/learn/learn.css", "/learn/interoperability/",
 "/learn/model-methods/", "/learn/dialysis/",
 "/license/", "/cite/", "/disclaimer/"
];
self.addEventListener("install", event => {
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
 event.waitUntil(Promise.all([
   caches.keys().then(names => Promise.all(names.filter(name => name.startsWith("ayflux-static-") && name !== CACHE).map(name => caches.delete(name)))),
   self.clients.claim()
 ]));
});
self.addEventListener("fetch", event => {
 const request = event.request;
 if(request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
 const url = new URL(request.url);
 if(url.pathname.startsWith("/cdn-cgi/") || request.headers.has("range")) return;
 if(request.mode === "navigate") {
   event.respondWith(fetch(request).then(response => {
     if(response.ok) { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(request,copy)).catch(()=>{}); }
     return response;
   }).catch(async () => (await caches.match(request,{ignoreSearch:true})) || (await caches.match("/"))));
   return;
 }
 event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached => cached || fetch(request).then(response => {
   if(response.ok && response.type === "basic" && (CORE.includes(url.pathname) || ["/assets/vendor/echarts-5.6.0.min.js","/assets/vendor/echarts-gl-2.0.9.min.js"].includes(url.pathname))) {
     const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request,copy)).catch(()=>{});
   }
   return response;
 })));
});


