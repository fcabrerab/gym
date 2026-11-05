// Utilidades de las pruebas de la beta. Solo se usan en 127.0.0.1 o localhost (tests/index.html lo comprueba antes
// de importar nada). Cargan la beta (o la normal) en un iframe de la misma dirección y la manejan desde fuera.

export const CLAVES_NORMAL = ["gym-routine-data-v1", "gym-ui-mode-v1", "gym-theme-v1", "gym-active-day-v1"];

const lineas = [];
let prefijo = "";

function pintar(final = "") {
  let pre = document.getElementById("resultado");
  if (!pre) {
    pre = document.createElement("pre");
    pre.id = "resultado";
    document.body.prepend(pre);
  }
  pre.textContent = lineas.join("\n") + (final ? `\n${final}` : "");
}

export function suite(nombre) {
  prefijo = nombre ? `[${nombre}] ` : "";
}

export function caso(ok, texto) {
  lineas.push(`${ok ? "BIEN" : "FALLO"} ${prefijo}${texto}`);
  pintar();
  return ok;
}

export function nota(texto) {
  lineas.push(`  · ${prefijo}${texto}`);
  pintar();
}

export function fin() {
  if (rechazados) {
    lineas.push(`  · el servidor local de pruebas rechazó ${rechazados} peticiones (demasiadas conexiones seguidas en TIME_WAIT): si algo ha fallado por eso, espera unos minutos y repite`);
  }
  const bien = lineas.filter((l) => l.startsWith("BIEN")).length;
  const fallos = lineas.filter((l) => l.startsWith("FALLO")).length;
  pintar(`RESULTADO: ${bien} bien, ${fallos} fallos`);
}

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export function soloLocal() {
  return ["127.0.0.1", "localhost"].includes(location.hostname);
}

// Una petición pequeña para que el reloj virtual no avance. El servidor local de pruebas (HTTP/1.0) abre una conexión
// por petición y Windows las deja un rato en TIME_WAIT: si se lanzan muchas pruebas y capturas seguidas, se acaban los
// puertos y las peticiones fallan («Failed to fetch»). Entonces se espera un poco y se sigue, y al final se avisa.
let sondeos = 0;
let rechazados = 0;
export const contarSondeos = () => sondeos;
async function sondeo() {
  sondeos += 1;
  try {
    await fetch(`/images/icon.svg?espera=${Math.random()}`, { cache: "no-store" });
  } catch {
    rechazados += 1;
    await esperar(20);
  }
}

// Con --virtual-time-budget, Chrome sin ventana adelanta el reloj virtual mientras espera E/S que no es de red
// (IndexedDB, Cache Storage, service worker). Mientras haya una petición de red pendiente, el reloj no avanza:
// se encadenan peticiones pequeñas hasta que la promesa acaba (copiado de la auditoría). Si la promesa ya está
// cumplida (o se cumple en unos pocos microtiempos), no se pide nada: menos conexiones.
export async function real(promesa) {
  let hecho = false;
  let valor;
  let error;
  promesa.then((v) => { hecho = true; valor = v; }, (e) => { hecho = true; error = e; });
  for (let i = 0; i < 4 && !hecho; i += 1) await null;
  for (let i = 0; !hecho && i < 5000; i += 1) await sondeo();
  if (error) throw error;
  return valor;
}

// Repite cond() (que puede ser async) hasta que dé true, en tiempo real (para IndexedDB, cachés, service worker).
export async function hastaQue(cond, intentos = 400) {
  for (let i = 0; i < intentos; i += 1) {
    if (await real(Promise.resolve().then(cond))) return true;
    await sondeo();
  }
  return false;
}

// Repite cond() en tiempo virtual (para lo que depende de temporizadores de la app).
export async function hastaQueVirtual(cond, ms = 5000, paso = 50) {
  for (let t = 0; t <= ms; t += paso) {
    try {
      if (await cond()) return true;
    } catch {
      // Aún no está.
    }
    await esperar(paso);
  }
  return false;
}

// --- Almacenamiento ---

export function clavesBeta() {
  return Object.keys(localStorage).filter((k) => k.startsWith("gym-beta-"));
}

// Borra solo lo de la beta: sus claves y su base de copias automáticas.
export async function limpiarBeta() {
  for (const k of clavesBeta()) localStorage.removeItem(k);
  await real(new Promise((resolver) => {
    const r = indexedDB.deleteDatabase("gym-beta-copias");
    r.onsuccess = () => resolver(true);
    r.onerror = () => resolver(false);
  }));
}

let normalGuardada = null;

export function guardarNormal() {
  normalGuardada = Object.fromEntries(CLAVES_NORMAL.map((k) => [k, localStorage.getItem(k)]));
  return normalGuardada;
}

export function restaurarNormal() {
  if (!normalGuardada) return;
  for (const [k, v] of Object.entries(normalGuardada)) {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  }
}

export function leerNormal() {
  return Object.fromEntries(CLAVES_NORMAL.map((k) => [k, localStorage.getItem(k)]));
}

export function guardar(clave, valor) {
  localStorage.setItem(clave, typeof valor === "string" ? valor : JSON.stringify(valor));
}

export function leerJson(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave));
  } catch {
    return null;
  }
}

// --- Cargar la beta o la normal en un iframe ---

export async function esperarListo(f, ms = 10000) {
  for (let t = 0; t < ms; t += 25) {
    if (f.contentDocument?.documentElement?.dataset?.listo) return f.contentDocument.documentElement.dataset.listo;
    await esperar(25);
  }
  return null;
}

export function urlBeta({ ahora = "2026-11-03T18:00:00", sinsw = true } = {}) {
  const partes = [];
  if (sinsw) partes.push("sinsw");
  if (ahora) partes.push(`ahora=${ahora}`);
  return `/beta/${partes.length ? `?${partes.join("&")}` : ""}`;
}

function recursosBeta(f) {
  try {
    return f.contentWindow.performance.getEntriesByType("resource")
      .filter((e) => new URL(e.name).pathname.startsWith("/beta/"))
      .map((e) => `${new URL(e.name).pathname.replace("/beta/", "")}:${e.responseStatus ?? "?"}`);
  } catch {
    return [];
  }
}

// ¿Arrancó de verdad? Si los módulos no llegaron, el vigía (js/vigia.js) pone data-listo="error" sin data-modulos.
function arranco(f, listo) {
  return Boolean(listo) && !(listo === "error" && !f.contentDocument?.documentElement?.dataset?.modulos);
}

export async function cargarBeta({ ahora = "2026-11-03T18:00:00", ancho = 412, alto = 915, sinsw = true, espiar: conEspias = true } = {}) {
  const f = document.createElement("iframe");
  f.style.width = `${ancho}px`;
  f.style.height = `${alto}px`;
  document.body.append(f);
  await new Promise((resolver) => { f.onload = resolver; f.src = urlBeta({ ahora, sinsw }); });
  let listo = await esperarListo(f);
  if (!arranco(f, listo)) {
    // La app no llegó a arrancar: casi siempre es que el servidor local de pruebas cortó la descarga de algún
    // módulo. Se apunta lo que llegó y se carga otra vez (una sola).
    nota(`la beta no arrancó (${estadoPagina(f.contentDocument)}); recursos: ${recursosBeta(f).join(" ")}; se vuelve a cargar`);
    await new Promise((resolver) => { f.onload = resolver; f.contentWindow.location.reload(); });
    listo = await esperarListo(f);
  }
  const b = { f, w: f.contentWindow, d: f.contentDocument, listo, espia: null };
  if (!listo) nota(`la beta sigue sin arrancar: ${estadoPagina(f.contentDocument)}; recursos: ${recursosBeta(f).join(" ")}`);
  if (conEspias) b.espia = espiar(f);
  return b;
}

// Recarga el iframe y vuelve a poner los espías. Con «ahora», abre la beta a esa hora (el gancho ?ahora= vuelve a
// fijar el reloj en cada carga, así que para simular que pasa el tiempo hay que darle una hora posterior).
export async function recargar(b, { ahora = null } = {}) {
  const cargar = () => new Promise((resolver) => {
    b.f.onload = resolver;
    if (ahora) b.f.src = urlBeta({ ahora });
    else b.f.contentWindow.location.reload();
  });
  await cargar();
  b.listo = await esperarListo(b.f);
  if (!arranco(b.f, b.listo)) {
    // Como en cargarBeta: si un módulo no llegó (el servidor local cortó la descarga), se carga otra vez (una sola).
    nota(`la beta no arrancó al recargar (${estadoPagina(b.f.contentDocument)}); se vuelve a cargar`);
    await new Promise((resolver) => { b.f.onload = resolver; b.f.contentWindow.location.reload(); });
    b.listo = await esperarListo(b.f);
  }
  b.w = b.f.contentWindow;
  b.d = b.f.contentDocument;
  const anteriores = b.espia;
  b.espia = espiar(b.f);
  if (anteriores) b.espia.anteriores = anteriores;
  return b;
}

export function quitar(b) {
  b?.f?.remove();
}

export async function cargarNormal({ ancho = 412, alto = 915 } = {}) {
  const f = document.createElement("iframe");
  f.style.width = `${ancho}px`;
  f.style.height = `${alto}px`;
  document.body.append(f);
  await new Promise((resolver) => { f.onload = resolver; f.src = "/index.html"; });
  for (let i = 0; i < 160; i += 1) {
    if (f.contentDocument?.querySelector(".exercise-card, .empty-state, .editor-shell, .day-section")) break;
    await esperar(50);
  }
  await esperar(200);
  return f;
}

// --- Manejar la beta desde fuera ---

export function sel(accion, id = null) {
  return id == null ? `[data-accion="${accion}"]` : `[data-accion="${accion}"][data-id="${CSS.escape(id)}"]`;
}

export function estadoPagina(d) {
  const listo = d?.documentElement?.dataset?.listo ?? "sin data-listo";
  const pantalla = d?.body?.dataset?.pantalla ?? "sin pantalla";
  const texto = (d?.getElementById("pantalla")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
  return `listo ${listo}, pantalla ${pantalla}, «${texto}»`;
}

export function pulsar(d, accion, id = null) {
  const el = d.querySelector(sel(accion, id));
  if (!el) throw new Error(`No está ${sel(accion, id)} (${estadoPagina(d)})`);
  el.click();
  return el;
}

export function existe(d, accion, id = null) {
  return Boolean(d.querySelector(sel(accion, id)));
}

// Escribe en un campo como el teclado y lanza «change» (como al salir del campo).
export function teclear(d, input, texto, { cambio = true } = {}) {
  input.focus();
  d.execCommand("selectAll");
  if (texto === "") d.execCommand("delete");
  else d.execCommand("insertText", false, texto);
  if (cambio) input.dispatchEvent(new d.defaultView.Event("change", { bubbles: true }));
}

export function textoDe(d, selector) {
  return d.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function avisoActual(d) {
  return textoDe(d, "#avisos .aviso-texto");
}

export function hojaAbierta(d) {
  return d.querySelector(".capa-hoja .hoja");
}

// --- Espías dentro del iframe (se ponen antes del primer ✓) ---

export function espiar(f) {
  const w = f.contentWindow;
  const d = f.contentDocument;
  const e = {
    contextos: 0, osciladores: 0, vibraciones: [], locks: [], notificaciones: [], cerradas: 0,
    compartidos: [], compartir: "ok", blobs: [], descargas: [], alertas: 0, confirmaciones: 0, prompts: 0,
    permiso: "default", errores: [],
  };
  // Errores de la beta: los que ya apuntó app.js y los que lleguen desde ahora.
  e.erroresApp = () => (w.__gymBeta?.errores || []).map((x) => x.mensaje);
  w.addEventListener("error", (ev) => e.errores.push(String(ev.message || ev.error)));
  w.addEventListener("unhandledrejection", (ev) => e.errores.push(String(ev.reason?.message || ev.reason)));
  const errorConsola = w.console.error.bind(w.console);
  w.console.error = (...args) => {
    e.errores.push(`console.error: ${args.map((a) => a?.message || String(a)).join(" ")}`);
    errorConsola(...args);
  };
  w.alert = () => { e.alertas += 1; };
  w.confirm = () => { e.confirmaciones += 1; return true; };
  w.prompt = () => { e.prompts += 1; return null; };
  w.AudioContext = class {
    constructor() { e.contextos += 1; this.currentTime = 0; this.state = "running"; this.destination = {}; }
    createOscillator() { e.osciladores += 1; return { frequency: {}, connect: (g) => g, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (x) => x }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
  w.webkitAudioContext = w.AudioContext;
  Object.defineProperty(w.navigator, "vibrate", { configurable: true, value: (p) => { e.vibraciones.push(p); return true; } });
  Object.defineProperty(w.navigator, "wakeLock", {
    configurable: true,
    value: {
      request: async () => {
        const s = new w.EventTarget();
        s.released = false;
        s.release = async () => {
          if (!s.released) {
            s.released = true;
            s.dispatchEvent(new w.Event("release"));
          }
        };
        e.locks.push(s);
        return s;
      },
    },
  });
  const registro = {
    showNotification: async (titulo, opciones = {}) => {
      e.notificaciones.push({ titulo, opciones, data: opciones.data ?? null, cerrada: false, close() { if (!this.cerrada) { this.cerrada = true; e.cerradas += 1; } } });
    },
    getNotifications: async ({ tag } = {}) => e.notificaciones.filter((n) => !n.cerrada && (!tag || n.opciones.tag === tag)),
    // Web Push de mentira («Avisos desde el PC»): e.suscripcion es la de ahora; cada subscribe() se apunta en
    // e.suscribir y, con e.pushFalla = "NotAllowedError", falla como sin permiso.
    active: {},
    pushManager: {
      getSubscription: async () => e.suscripcion,
      subscribe: async (opciones) => {
        e.suscribir.push(opciones);
        if (e.pushFalla) throw new w.DOMException("No se deja", e.pushFalla);
        e.suscripcion = e.nuevaSuscripcion(opciones.applicationServerKey);
        return e.suscripcion;
      },
    },
  };
  e.suscribir = [];
  e.bajas = 0;
  e.pushFalla = null;
  e.suscripcion = null;
  e.nuevaSuscripcion = (clave) => {
    const s = {
      endpoint: `https://fcm.googleapis.com/fcm/send/prueba-${e.suscribir.length}`,
      options: { userVisibleOnly: true, applicationServerKey: clave ? new Uint8Array(clave).buffer : null },
      toJSON() { return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: "BClaveDeMentira", auth: "AuthDeMentira" } }; },
      unsubscribe: async () => { e.bajas += 1; if (e.suscripcion === s) e.suscripcion = null; return true; },
    };
    return s;
  };
  if (w.navigator.serviceWorker) {
    Object.defineProperty(w.navigator.serviceWorker, "getRegistration", { configurable: true, value: async () => registro });
  }
  if (w.Notification) {
    Object.defineProperty(w.Notification, "permission", { configurable: true, get: () => e.permiso });
    w.Notification.requestPermission = async () => e.permiso;
  }
  Object.defineProperty(w.navigator, "canShare", { configurable: true, value: () => e.compartir !== "no" });
  Object.defineProperty(w.navigator, "share", {
    configurable: true,
    value: async (datos) => {
      e.compartidos.push(datos);
      if (e.compartir === "abortar") throw new w.DOMException("Cancelado", "AbortError");
      if (e.compartir === "fallar") throw new w.DOMException("No se puede", "NotAllowedError");
    },
  });
  const crearUrl = w.URL.createObjectURL.bind(w.URL);
  e.blobDe = new Map(); // URL de Blob → su Blob (la CSP de la beta no deja hacer fetch de una URL blob:)
  w.URL.createObjectURL = (b) => {
    e.blobs.push(b);
    const url = crearUrl(b);
    e.blobDe.set(url, b);
    return url;
  };
  e.revocadas = [];
  const revocarUrl = w.URL.revokeObjectURL.bind(w.URL);
  w.URL.revokeObjectURL = (u) => { e.revocadas.push(u); return revocarUrl(u); };
  // El <audio> del «Descanso con sonido»: play() no suena de verdad; se apunta cada llamada con su src y, con
  // e.playFalla = "NotAllowedError", falla como cuando el navegador no deja sonar.
  e.audios = [];
  e.pausasAudio = 0;
  e.playFalla = null;
  w.HTMLMediaElement.prototype.play = function play() {
    e.audios.push({ el: this, src: this.src });
    return e.playFalla ? Promise.reject(new w.DOMException("No se deja", e.playFalla)) : Promise.resolve();
  };
  w.HTMLMediaElement.prototype.pause = function pause() { e.pausasAudio += 1; };
  // Media Session de mentira: la metadata, los botones de la pantalla de bloqueo, el estado y cada barra de progreso.
  const medios = { metadata: null, playbackState: "none", botones: {}, posiciones: [] };
  medios.setActionHandler = (accion, fn) => { if (fn) medios.botones[accion] = fn; else delete medios.botones[accion]; };
  medios.setPositionState = (p) => { medios.posiciones.push(p ?? null); };
  Object.defineProperty(w.navigator, "mediaSession", { configurable: true, value: medios });
  e.medios = medios;
  const clicOriginal = w.HTMLAnchorElement.prototype.click;
  w.HTMLAnchorElement.prototype.click = function clic() {
    if (this.download) {
      e.descargas.push({ nombre: this.download, href: this.href });
      return undefined;
    }
    return clicOriginal.call(this);
  };
  e.ocultar = () => {
    Object.defineProperty(d, "visibilityState", { configurable: true, get: () => "hidden" });
    Object.defineProperty(d, "hidden", { configurable: true, get: () => true });
    d.dispatchEvent(new w.Event("visibilitychange"));
  };
  e.mostrar = () => {
    Object.defineProperty(d, "visibilityState", { configurable: true, get: () => "visible" });
    Object.defineProperty(d, "hidden", { configurable: true, get: () => false });
    d.dispatchEvent(new w.Event("visibilitychange"));
  };
  e.todosLosErrores = () => [...e.erroresApp(), ...e.errores];
  e.dialogosNavegador = () => e.alertas + e.confirmaciones + e.prompts;
  return e;
}

// Comprueba al final de un caso de interfaz: ni errores de la beta ni diálogos del navegador.
export function sinErrores(b, texto = "") {
  if (!b?.espia) return true;
  const errores = b.espia.todosLosErrores();
  const dialogos = b.espia.dialogosNavegador();
  return caso(errores.length === 0 && dialogos === 0,
    `${texto ? `${texto}: ` : ""}sin errores de la beta (${errores.length ? errores.join(" | ") : "0"}) ni alert/confirm/prompt (${dialogos})`);
}
