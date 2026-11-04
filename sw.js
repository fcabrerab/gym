const CACHE = "gym-pwa-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./data/routine.json",
  "./data/exercises.json",
  "./images/icon.svg"
];
// La beta (beta/, con su propio service worker y sus cachés gym-beta-…) y las pruebas (tests/) conviven
// con esta versión en la misma dirección: este service worker no responde a sus peticiones ni borra sus cachés.
const AJENAS = ["./beta/", "./tests/"].map((ruta) => new URL(ruta, self.location).pathname);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Solo las versiones viejas de esta caché (gym-pwa-…); las de la beta no se tocan.
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith("gym-pwa-") && key !== CACHE)
    .map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin === self.location.origin && AJENAS.some((ruta) => url.pathname.startsWith(ruta))) return;
  // Se busca solo en la caché propia: en las de la beta puede haber copias de los mismos archivos.
  const propia = () => caches.open(CACHE);
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => propia().then((cache) => cache.match("./index.html"))));
    return;
  }
  event.respondWith(propia().then((cache) => cache.match(request)).then((cached) => cached || fetch(request).then((response) => {
    const copy = response.clone();
    propia().then((cache) => cache.put(request, copy));
    return response;
  }).catch(() => cached)));
});
