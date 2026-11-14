// Exercise two deployments at a single origin with a persistent browser context.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../public');
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const oldSimulation = 'document.documentElement.dataset.priorShell = "true";';
const priorHtml = '<!doctype html><label>Measurement<input id="sample"></label>' +
 '<span id="connectivityStatus"></span><script src="/assets/pwa-register.js"></script>';
const bootstrap = '<script src="/assets/offline-update.js"></script>';
const deadline = {timeout: 60000};

async function check(browser, legacy) {
 let release = 'prior';
 const server = http.createServer((req, res) => {
   const pathname = new URL(req.url, 'http://localhost').pathname;
   let file = path.join(root, pathname);
   if (fs.statSync(file, {throwIfNoEntry: false})?.isDirectory()) file = path.join(file, 'index.html');
   res.setHeader('Cache-Control', 'no-store');
   res.setHeader('Content-Type', ({'.js':'text/javascript','.html':'text/html','.css':'text/css',
     '.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
   if (release === 'prior') {
     if (pathname === '/sw.js') {
       if (legacy) {
         // The deployed predecessor used network-first navigation, all-cache lookup and immediate activation.
         res.end(`const cacheName = 'ayflux-static-legacy';
           self.addEventListener('install', event => event.waitUntil(caches.open(cacheName)
             .then(cache => cache.addAll(['/','/assets/pwa-register.js','/assets/simulator-ui.js']))
             .then(() => self.skipWaiting())));
           self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
           self.addEventListener('fetch', event => event.respondWith(event.request.mode === 'navigate'
             ? fetch(event.request) : caches.match(event.request).then(hit => hit || fetch(event.request))));`);
       } else res.end(worker.replace(/^const CACHE = .+?;$/m, 'const CACHE = "ayflux-static-prior";'));
       return;
     }
     if (pathname === '/' || pathname === '/index.html') {
       res.end(priorHtml + (legacy ? '' : bootstrap)); return;
     }
     if (pathname === '/assets/simulator-ui.js') { res.end(oldSimulation); return; }
   }
   if (!fs.statSync(file, {throwIfNoEntry:false})?.isFile()) {res.writeHead(404).end();return;}
   fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const context = await browser.newContext();
 const origin = 'http://127.0.0.1:' + server.address().port;
 try {
   const page = await context.newPage();
   await page.goto(origin);
   await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, deadline);
   await page.fill('#sample', '7.15');
   release = 'next';
   await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
   await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).waiting, null, deadline);
   assert.equal(await page.inputValue('#sample'), '7.15');
   // Old clients only acquire the new update bootstrap on their next chosen navigation.
   if (legacy) {
     await page.reload();
     await page.getByRole('button', {name:'Refresh to update'}).waitFor();
     assert.equal(await page.evaluate(() => document.documentElement.dataset.priorShell), 'true');
   } else {
     const other = await context.newPage();
     await other.goto(origin + '/?second=1');
     await other.fill('#sample', '8.2');
     await page.getByRole('button', {name:'Refresh to update'}).click();
     await page.getByText(/close other AyFlux tabs/).waitFor();
     assert.equal(await other.inputValue('#sample'), '8.2');
     assert.equal(await page.inputValue('#sample'), '7.15');
     await other.close();
   }
   await Promise.all([
     page.waitForNavigation(),
     page.getByRole('button', {name:'Refresh to update'}).click()
   ]);
   await page.waitForFunction(() => window.AyFluxResearchBridge?.snapshot().updated, null, deadline);
   assert.equal(await page.evaluate(() => document.documentElement.dataset.priorShell), undefined);
   await page.selectOption('#csv', 'print');
   await page.locator('#ayfluxScenarioSummary[open]').waitFor();
   await context.setOffline(true);
   await page.reload();
   await page.waitForFunction(() => window.AyFluxResearchBridge?.snapshot().updated, null, deadline);
   await page.selectOption('#csv', 'print');
   await page.locator('#ayfluxScenarioSummary[open]').waitFor();
 } finally {
   await context.close();
   await new Promise(resolve => server.close(resolve));
 }
}

(async () => {
 const browser = await chromium.launch();
 try {
   await check(browser, true);
   await check(browser, false);
   console.log('Prior-worker migration, same-release navigation, unsaved tabs, update and offline print passed');
 } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode = 1;});
