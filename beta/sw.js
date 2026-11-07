// Service worker de la beta: alcance la carpeta beta/. Solo toca cachés que empiezan por «gym-beta-». Y enseña los
// avisos del descanso que manda el PC por Web Push (abajo: «push»).
// Cada cambio en un archivo de beta/ obliga a subir VERSION aquí, en js/version.js y en la meta «gym-beta-version» de
// index.html (la prueba lo comprueba). Entre versiones no se quitan ni se renombran ids de index.html: así una
// versión vieja que arranque un momento con el HTML nuevo no se rompe (y app.js, al ver otra versión, recarga).
const VERSION = "0.2.3";
const CACHE = `gym-beta-${VERSION}`;
const CACHE_IMAGENES = "gym-beta-imagenes"; // sobrevive a las versiones
const MAX_IMAGENES = 80;
const PREFIJO = "gym-beta-";
const BASE = new URL("./", self.location).href; // …/beta/
const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./icon.svg",
  "./icono-512.png",
  "./insignia-512.png",
  "./js/app.js",
  "./js/vigia.js",
  "./js/version.js",
  "./js/util.js",
  "./js/modelo.js",
  "./js/almacen.js",
  "./js/normal.js",
  "./js/copias.js",
  "./js/sesion.js",
  "./js/sonido.js",
  "./js/descanso.js",
  "./js/avisos-pc.js",
  "./js/copia-pc.js",
  "./js/ui/dom.js",
  "./js/ui/avisos.js",
  "./js/ui/contexto.js",
  "./js/ui/piezas.js",
  "./js/ui/arranque.js",
  "./js/ui/entreno.js",
  "./js/ui/historial.js",
  "./js/ui/rutina.js",
  "./js/ui/ajustes.js",
];

const pedirFresco = (ruta) => new Request(new URL(ruta, BASE), { cache: "reload" });

self.addEventListener("install", (event) => {
  // Sin skipWaiting: la primera instalación se activa sola y las actualizaciones esperan a «Recargar».
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS.map(pedirFresco))));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter((n) => n.startsWith(PREFIJO) && n !== CACHE && n !== CACHE_IMAGENES)
      .map((n) => caches.delete(n)));
    // Quita a la normal el control de la primera visita.
    await self.clients.claim();
  })());
});

function conLimite(promesa, ms) {
  return Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("Sin respuesta a tiempo")), ms))]);
}

async function deLaCache(nombre, peticion, opciones) {
  const cache = await caches.open(nombre);
  return cache.match(peticion, opciones);
}

const INDICE = new URL("./index.html", BASE).href;
const versionDe = (html) => html.match(/<meta name="gym-beta-version" content="([^"]*)"/)?.[1] ?? null;

// Sin red y sin copia guardada: una página mínima (sin scripts) con el enlace a la normal, que sí funciona sin red.
function paginaSinConexion() {
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + "<title>Gym Beta</title><style>body{font:16px/1.4 system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:0 1rem}</style></head><body>"
    + "<h1>Sin conexión</h1><p>Esta beta todavía no está guardada en el móvil y no hay conexión.</p>"
    + '<p><a href="../?normal">Abrir la versión normal</a></p><p><a href="./">Volver a intentarlo</a></p></body></html>';
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Navegación: primero la red (con límite de 4 s). El index.html que llega solo se guarda si es de ESTA versión y si
// se pidió la beta (./ o ./index.html), nunca otro archivo abierto en una pestaña. Si llega el de otra versión (se
// acaba de publicar una nueva), se sigue con el guardado de esta, para no mezclar el HTML nuevo con los módulos
// viejos: la nueva llega entera con «Recargar». Mientras haya una versión esperando, igual. Sin red, la guardada.
async function navegar(request) {
  const url = new URL(request.url);
  const esLaBeta = url.origin + url.pathname === BASE || url.href.split(/[?#]/)[0] === INDICE;
  const guardada = async () => (await deLaCache(CACHE, INDICE)) || (await deLaCache(CACHE, BASE));
  if (esLaBeta && self.registration.waiting) {
    const g = await guardada();
    if (g) return g;
  }
  try {
    const respuesta = await conLimite(fetch(request), 4000);
    const html = (respuesta.headers.get("content-type") || "").includes("text/html");
    if (esLaBeta && respuesta.ok && html) {
      const version = versionDe(await respuesta.clone().text());
      if (version === VERSION) {
        const copia = respuesta.clone();
        caches.open(CACHE).then((cache) => cache.put(INDICE, copia)).catch(() => {});
      } else {
        self.registration.update().catch(() => {});
        const g = await guardada();
        if (g) return g;
      }
    }
    return respuesta;
  } catch {
    if (!esLaBeta) {
      const propio = await deLaCache(CACHE, request, { ignoreSearch: true });
      if (propio) return propio;
    }
    return (await guardada()) || paginaSinConexion();
  }
}

// Archivos propios: primero la caché de esta versión; si falta, la red (y se guarda si va bien).
async function propio(request) {
  const guardada = await deLaCache(CACHE, request, { ignoreSearch: true });
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) {
    const copia = respuesta.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copia)).catch(() => {});
  }
  return respuesta;
}

async function recortarImagenes() {
  const cache = await caches.open(CACHE_IMAGENES);
  const claves = await cache.keys();
  const sobran = claves.length - MAX_IMAGENES;
  for (let i = 0; i < sobran; i += 1) await cache.delete(claves[i]);
}

async function guardarImagen(url) {
  const respuesta = await fetch(url, { mode: "cors", credentials: "omit" });
  if (respuesta.ok) {
    const cache = await caches.open(CACHE_IMAGENES);
    await cache.put(url, respuesta.clone());
    await recortarImagenes();
  }
  return respuesta;
}

// Imágenes de otro origen: de la caché de imágenes; si no está, se piden con CORS y se guardan; si el servidor no
// deja CORS, se piden normal (sin guardar); sin red, error (y la página pone su marcador).
async function imagen(request) {
  const guardada = await deLaCache(CACHE_IMAGENES, request.url);
  if (guardada) return guardada;
  try {
    return await guardarImagen(request.url);
  } catch {
    try {
      return await fetch(request);
    } catch {
      return Response.error();
    }
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    if (url.href.startsWith(BASE)) event.respondWith(navegar(request));
    return;
  }
  if (url.origin === self.location.origin) {
    // Lo de fuera de beta/ (../data/*.json, la normal) va por la red normal y nunca a las cachés de la beta.
    if (url.href.startsWith(BASE)) event.respondWith(propio(request));
    return;
  }
  if (request.destination === "image" && /^https?:$/.test(url.protocol)) event.respondWith(imagen(request));
});

// Vuelve a guardar lo que falte de ARCHIVOS (por si alguien borró la caché: así se rehace sola con red).
async function comprobar() {
  const cache = await caches.open(CACHE);
  for (const ruta of ARCHIVOS) {
    const url = new URL(ruta, BASE).href;
    if (await cache.match(url)) continue;
    try {
      const respuesta = await fetch(pedirFresco(ruta));
      if (respuesta.ok) await cache.put(url, respuesta);
    } catch {
      // Sin red: se intentará en el próximo arranque.
    }
  }
}

async function precargar(urls) {
  const cache = await caches.open(CACHE_IMAGENES);
  for (const url of (urls || []).slice(0, MAX_IMAGENES)) {
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol) || u.origin === self.location.origin) continue;
      if (await cache.match(u.href)) continue;
      const respuesta = await fetch(u.href, { mode: "cors", credentials: "omit" });
      if (respuesta.ok) await cache.put(u.href, respuesta);
    } catch {
      // Si falla una imagen, se sigue con la siguiente.
    }
  }
  await recortarImagenes();
}

self.addEventListener("message", (event) => {
  const datos = event.data || {};
  if (datos.tipo === "activar") {
    self.skipWaiting();
  } else if (datos.tipo === "version") {
    event.source?.postMessage({ tipo: "version", version: VERSION });
  } else if (datos.tipo === "comprobar") {
    event.waitUntil(comprobar());
  } else if (datos.tipo === "precargar-imagenes") {
    event.waitUntil(precargar(datos.urls));
  }
});

// --- Avisos desde el PC (js/avisos-pc.js): llegan por Web Push aunque la app esté congelada ---

const ETIQUETA = "gym-beta-descanso"; // la de js/descanso.js: el aviso del PC sustituye al «Descanso hasta las…»
const ETIQUETA_PRUEBA = "gym-beta-prueba-pc";
const VIBRACION_FIN = [400, 150, 400, 150, 800];
const corto = (valor, max) => (typeof valor === "string" ? valor.trim().slice(0, max) : "");

async function avisoDelPc(datos) {
  const prueba = datos.tipo === "prueba";
  const id = typeof datos.id === "string" ? datos.id : null;
  const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const propias = ventanas.filter((c) => c.url.startsWith(BASE));
  if (!prueba && propias.some((c) => c.visibilityState === "visible")) {
    // La app está a la vista: avisa ella (capa, sonido y vibración); aquí no se repite.
    for (const c of propias) c.postMessage({ tipo: "aviso-pc", id });
    return;
  }
  if (!prueba && id) {
    const ya = await self.registration.getNotifications({ tag: ETIQUETA });
    if (ya.some((n) => n.data?.fin && n.data?.id === id)) return; // la app ya avisó de este descanso
  }
  await self.registration.showNotification(corto(datos.titulo, 80) || "¡Te toca!", {
    tag: prueba ? ETIQUETA_PRUEBA : ETIQUETA,
    body: corto(datos.texto, 160),
    icon: "./icono-512.png",
    badge: "./insignia-512.png",
    renotify: true,
    vibrate: VIBRACION_FIN,
    timestamp: Number.isFinite(datos.fin) ? datos.fin : Date.now(),
    data: { fin: !prueba, id, origen: "pc" },
  });
}

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = {};
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) datos = {};
  // Chrome exige enseñar algo por cada aviso que llega: si algo falla, sale uno sencillo.
  event.waitUntil(avisoDelPc(datos).catch(() => self.registration.showNotification("¡Te toca!", {
    tag: ETIQUETA, icon: "./icono-512.png", badge: "./insignia-512.png", data: { fin: true, id: null, origen: "pc" },
  })));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const propia = ventanas.find((c) => c.url.startsWith(BASE));
    if (propia) return propia.focus();
    return self.clients.openWindow(BASE);
  })());
});
