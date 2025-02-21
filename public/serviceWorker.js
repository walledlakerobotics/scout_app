const cacheName = 'scout_app';

const assets = [
    '/',
    '/index.html',
    '/CSS/style.css',
    '/JS/app.js',
    '/JS/templates.js',
    '/images/favicon.ico',
    '/images/icon.png',
    '/manifest.webmanifest'
];

async function createCache() {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets);
    await self.skipWaiting();
}

async function processRequest(req) {
    const res = await caches.match(req);
    return res || await fetch(req);
}

async function clearOldCache() {
    const keys = await caches.keys();
    keys.forEach(async key => {
        if (key != cacheName) {
            await caches.delete(key);
        }
    });
    await self.clients.claim();
}

self.addEventListener('install', event => {
    event.waitUntil(createCache());
});

self.addEventListener('fetch', event => {
    event.respondWith(processRequest(event.request))
});

self.addEventListener('activate', event => {
    event.waitUntil(clearOldCache());
});