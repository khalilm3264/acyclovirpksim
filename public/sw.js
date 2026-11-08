/* AyFlux offline cache: only public static application files, never user data. */
"use strict";
const CACHE = "ayflux-static-v0.23.0";
const CORE = [
 "/", "/index.html", "/manifest.webmanifest", "/app-icon.svg",
 "/favicon.ico", "/ayflux-logo.png",
 "/assets/pk-engine.js", "/assets/simulator-ui.js",
 "/assets/ayflux-exchange.js", "/assets/ayflux-version.js",
 "/assets/model-integrity.js", "/assets/research-workspace.js",
 "/assets/vendor/plotly-basic-3.3.1.min.js",
 "/lite/", "/lite/lite.js", "/assets/lite-fallback.js",
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
   if(response.ok && response.type === "basic" && (CORE.includes(url.pathname) || url.pathname === "/assets/vendor/plotly-cartesian-3.3.1.min.js")) {
     const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request,copy)).catch(()=>{});
   }
   return response;
 })));
});
