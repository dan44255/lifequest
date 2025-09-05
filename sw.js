const CACHE_NAME='lifequest-v8-1';
const ASSETS=[./,./index.html,./styles.css,./app.js,./manifest.webmanifest,./icons/icon-192.png,./icons/icon-512.png,./sounds/ui_click.wav,./sounds/quest_add.wav,./sounds/roll.wav,./sounds/quest_complete.wav,./sounds/badge.wav];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)))); self.clients.claim();});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});