const cacheName = 'scout_app';

const assets = [
    '/',
    '/index.html',
    '/CSS/style.css',
    '/JS/app.js',
    '/JS/templates.js',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(assets)
            .then(self.skipWaiting())
        )
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(res => res || fetch(event.request))
    )
});