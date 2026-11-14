/* AyFlux offline cache: only public static application files, never user data. */
"use strict";
const CACHE = "ayflux-static-v0.27.0-safe-update-20261114";
const CORE = [
 "/assets/osp-import.js", "/assets/pwa-register.js", "/assets/offline-update.js", "/assets/simulator-worker.js", "/assets/osp-xlsx.js",
 "/assets/teaching-exports.js",
 "/assets/academic-exports.js", "/references/ayflux.bib",
 "/research/exchanges/", "/research/exchanges/view.js", "/research/exchanges/style.css",
 "/assets/research-worker.js", "/assets/literature-cases.js", "/assets/literature-workspace.js",
 "/", "/index.html", "/manifest.webmanifest", "/app-icon.svg",
 "/favicon.ico", "/ayflux-molecular-logo.svg",
 "/assets/pk-engine.js", "/assets/simulator-ui.js", "/assets/study-library.js", "/assets/regimen-tools.js",
 "/assets/scenario-summary.js", "/assets/scenario-summary.css",
 "/assets/scenario-script.js", "/assets/ayflux-exchange.js", "/assets/ayflux-version.js",
 "/assets/model-integrity.js", "/assets/research-workspace.js",
 "/assets/charts.js", "/assets/analysis-views.js",
 "/lite/", "/lite/lite.js",
 "/assets/fonts/poppins-latin-300-normal.woff2", "/assets/fonts/poppins-latin-800-normal.woff2",
 "/learn/", "/learn/learn.css", "/learn/interoperability/",
 "/learn/model-methods/", "/learn/dialysis/",
 "/license/", "/cite/", "/references/", "/disclaimer/"
];
self.addEventListener("install", event => {
 // Fill a separate release cache before this worker can serve an application shell.
 event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
   CORE.map(path => new Request(path, {cache: "reload"}))
 )));
});

self.addEventListener("message", event => {
 if (event.data !== "ayflux-apply-update" || !event.source) return;
 event.waitUntil((async () => {
   // Other tabs can have their own unsaved measurements and lazy-loaded scripts.
   const tabs = await self.clients.matchAll({type: "window", includeUncontrolled: true});
   if (tabs.some(tab => tab.id !== event.source.id)) {
     event.source.postMessage("ayflux-other-tabs-open");
     return;
   }
   await self.skipWaiting();
 })());
});

self.addEventListener("activate", event => {
 event.waitUntil((async () => {
   const names = await caches.keys();
   await Promise.all(names.filter(name => name.startsWith("ayflux-static-") && name !== CACHE)
     .map(name => caches.delete(name)));
   await self.clients.claim();
 })());
});

self.addEventListener("fetch", event => {
 const request = event.request;
 const url = new URL(request.url);
 if (request.method !== "GET" || url.origin !== self.location.origin ||
     url.pathname.startsWith("/cdn-cgi/") || request.headers.has("range")) return;
 event.respondWith((async () => {
   const cache = await caches.open(CACHE);
   const shellPath = url.pathname.replace(/\/index\.html$/, "/").replace(/([^/])$/, "$1/");
   if (CORE.includes(url.pathname) || (request.mode === "navigate" && CORE.includes(shellPath))) {
     const cached = await cache.match(CORE.includes(url.pathname) ? url.pathname : shellPath);
     if (cached) return cached;
   }
   if (request.mode === "navigate") {
     try {
       const response = await fetch(request);
       if (response.ok && !url.search) await cache.put(url.pathname, response.clone()).catch(() => {});
       return response;
     } catch {
       return await cache.match(url.pathname) || await cache.match("/") || Response.error();
     }
   }
   const vendor = ["/assets/vendor/echarts-6.1.0.min.js", "/assets/vendor/echarts-gl-2.1.0.min.js"];
   if (!vendor.includes(url.pathname)) return fetch(request);
   const cached = await cache.match(url.pathname);
   if (cached) return cached;
   const response = await fetch(request);
   if (response.ok && response.type === "basic") await cache.put(url.pathname, response.clone()).catch(() => {});
   return response;
 })());
});
