const CACHE_NAME = "frc-scout-v7";
//thisll have to change later, but right now big list needs to happen
const ASSETS = ["/", "/manifest.json", "/HTML/scout.html", "/CSS/global.css", "/CSS/event-frc/event-frc.css", "/CSS/event-frc/scout.css", "/JS/theme.js", "/JS/DB.js", "/JS/event/scout-questions.js", "/JS/utils.js", "/JS/event/scout.js", "/JS/event/qrcode.js", "/Img/FIRST_mono.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => Promise.allSettled(ASSETS.map((url) => c.add(url).catch((err) => console.warn("Failed to cache:", url, err))))));
});

self.addEventListener("fetch", (e) => {
  // Only handle GET requests - Cache API doesn't support POST/PUT/DELETE/etc.
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        const resClone = networkRes.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, resClone));
        return networkRes;
      })
      .catch(() => caches.match(e.request))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
});
