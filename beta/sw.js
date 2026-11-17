// La beta ya es la app, en la carpeta de arriba (D-121). Este service worker sustituye al de la beta vieja (alcance
// beta/) solo para quitarlo: se activa enseguida, borra las cachés de la beta vieja (gym-beta-0.…; las de la app,
// de la 1.0.0 en adelante, y la de imágenes no se tocan), se da de baja y lleva sus ventanas a la app.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => /^gym-beta-0\./.test(n)).map((n) => caches.delete(n)));
    await self.registration.unregister();
    const app = new URL("../", self.location).href;
    // Solo las suyas (las de beta/, que manda él): la app de arriba no es suya y no se toca.
    const ventanas = await self.clients.matchAll({ type: "window" });
    await Promise.all(ventanas.map((v) => (v.navigate ? v.navigate(app).catch(() => null) : null)));
  })());
});
