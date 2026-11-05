// Avisos desde el PC: el PC de casa lleva la cuenta del descanso y, a su hora, manda el aviso por Web Push, que Chrome
// enseña aunque la app esté congelada (Android la para al minuto de no verse) y el móvil bloqueado, y sin sonido de
// fondo. La beta le habla por Tailscale; su dirección no está en el código (este repo es público): se escribe en
// Ajustes o llega con el enlace de la página de avisos del PC («#avisos-pc=https://…ts.net»).
// Al empezar un descanso se le pide el aviso; al pausarlo, cambiarlo con ±15 s o saltarlo, se cambia o se quita; al
// acabar solo, no se toca (el PC ya lo manda). Si el PC no responde, el aviso va como siempre (descanso.js).
// Guarda en gym-beta-avisos-pc, solo en este móvil: {activo, direccion, clave, estado, texto, cuando}.

import * as almacen from "./almacen.js";
import { alCambiarDescanso } from "./descanso.js";
import { ahora, recortar } from "./util.js";

export const CLAVE = "gym-beta-avisos-pc";
export const PRUEBA_MS = 10000; // «Probar desde el PC»: el aviso llega a los 10 s
const ESPERA_MS = 6000; // lo que se espera al PC en cada petición
const EN_MAX = 15 * 60000; // lo más lejos que el PC acepta un aviso
const SUFIJO = ".ts.net"; // solo direcciones de Tailscale (la CSP de index.html tampoco deja otras)
const POR_DEFECTO = { activo: false, direccion: "", clave: null, estado: null, texto: "", cuando: null };

let deps = { avisar: () => {}, alCambiar: () => {} };
let deseado = null; // el aviso que el PC debería tener: {id, finEn, titulo, texto} o null
let enviado = null; // el que tiene, según su última respuesta
let acabado = null; // el id del último descanso que acabó solo: su aviso ya no se cancela
let trabajando = false;
let falloAvisado = false; // «El PC no responde» sale una vez cada vez que se abre la app

export function configurarAvisosPc(opciones) {
  deps = { ...deps, ...opciones };
  alCambiarDescanso(alCambiarElDescanso);
}

// --- Lo guardado ---

export function leer() {
  let c = null;
  try {
    c = JSON.parse(almacen.leer(CLAVE) || "null");
  } catch {
    c = null;
  }
  return { ...POR_DEFECTO, ...(c && typeof c === "object" && !Array.isArray(c) ? c : {}) };
}

function cambiar(fn) {
  const c = leer();
  fn(c);
  almacen.escribir(CLAVE, JSON.stringify(c));
  deps.alCambiar(c);
  return c;
}

export function soportado() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof window.PushManager !== "undefined";
}

export function estado() {
  return { ...leer(), soportado: soportado() };
}

// «f-pc-2.xxxx.ts.net», con o sin «https://» y con o sin «/» al final → «https://f-pc-2.xxxx.ts.net». Si no es una
// dirección https de Tailscale (…ts.net), sin ruta, usuario ni otro puerto, null.
export function normalizarDireccion(texto) {
  let t = String(texto ?? "").trim();
  if (!t) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) t = `https://${t}`;
  let u;
  try {
    u = new URL(t);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (u.pathname !== "/" || u.search || u.hash) return null;
  const host = u.hostname.toLowerCase();
  if (!host.endsWith(SUFIJO) || host.length <= SUFIJO.length + 1 || host.split(".").some((p) => !p)) return null;
  return `https://${host}`;
}

// Al abrir la beta con «#avisos-pc=<dirección>» (el enlace de la página de avisos del PC): la deja puesta en Ajustes,
// sin activar nada (eso, con el botón). Devuelve «puesta», «activa» (ya estaban activos con ese PC) o null (no hay
// enlace o su dirección no vale).
export function leerEnlace(hash) {
  const m = String(hash || "").match(/^#avisos-pc=(.+)$/);
  if (!m) return null;
  let valor = m[1];
  try {
    valor = decodeURIComponent(valor);
  } catch {
    // Tal cual.
  }
  const direccion = normalizarDireccion(valor);
  if (!direccion) return null;
  const antes = leer();
  if (antes.activo && antes.direccion === direccion) return "activa";
  cambiar((c) => {
    if (c.direccion !== direccion) Object.assign(c, { direccion, activo: false, clave: null, estado: null, texto: "" });
  });
  return "puesta";
}

// --- Hablar con el PC ---

function deB64url(texto) {
  const b64 = String(texto).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64 + "===".slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
}

function mismaClave(s, clave) {
  const k = s?.options?.applicationServerKey;
  if (!k || !clave) return false;
  const a = new Uint8Array(k);
  const b = deB64url(clave);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// {ok: true, datos} o {ok: false, red?, codigo?, texto}. Nunca lanza.
async function pedir(direccion, ruta, cuerpo = null) {
  const opciones = { method: cuerpo ? "POST" : "GET", mode: "cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" };
  if (cuerpo) {
    opciones.headers = { "Content-Type": "application/json" };
    opciones.body = JSON.stringify(cuerpo);
  }
  const control = typeof AbortController === "function" ? new AbortController() : null;
  const reloj = control ? setTimeout(() => control.abort(), ESPERA_MS) : null;
  if (control) opciones.signal = control.signal;
  try {
    const r = await fetch(`${direccion}${ruta}`, opciones);
    let datos = null;
    try {
      datos = await r.json();
    } catch {
      datos = null;
    }
    if (r.ok && datos?.ok) return { ok: true, datos };
    return { ok: false, codigo: r.status, texto: typeof datos?.texto === "string" ? recortar(datos.texto, 200) : `contestó ${r.status}` };
  } catch {
    return { ok: false, red: true, texto: "no responde" };
  } finally {
    if (reloj) clearTimeout(reloj);
  }
}

async function registroSw() {
  try {
    return (await navigator.serviceWorker?.getRegistration("./")) || null;
  } catch {
    return null;
  }
}

// La suscripción de este móvil, hecha con la clave del PC. Con «crear», la hace si falta o si es de otra clave (hace
// falta el permiso de notificaciones). Lanza si el navegador no puede.
async function suscripcion(clave, { crear = false } = {}) {
  const reg = await registroSw();
  if (!reg?.pushManager) throw new Error("sin-push");
  let s = await reg.pushManager.getSubscription();
  if (s && clave && !mismaClave(s, clave)) {
    if (!crear) return null;
    await s.unsubscribe().catch(() => {});
    s = null;
  }
  if (!s && crear) {
    if (!reg.active) throw new Error("sin-sw");
    s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deB64url(clave) });
  }
  return s;
}

function datosSuscripcion(s) {
  const j = s.toJSON();
  return { endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth } };
}

function textoFallo(r) {
  if (r.red) {
    return "El PC no responde: mira que Tailscale esté activo en el móvil y el PC encendido (y, si Chrome lo pidió, que dejaras acceder a la red local).";
  }
  if (r.codigo === 403) return `El PC no lo deja: ${r.texto}.`;
  return `El PC no ha podido: ${r.texto}.`;
}

function textoSuscripcion(err) {
  if (err?.message === "sin-push") return "Este navegador no admite avisos desde el PC.";
  if (err?.message === "sin-sw") return "La beta aún se está preparando: vuelve a intentarlo en unos segundos.";
  if (err?.name === "NotAllowedError") return "Hace falta el permiso de notificaciones (en los ajustes de Chrome).";
  return "El navegador no ha podido suscribirse a los avisos.";
}

function apuntarFallo(texto, red) {
  cambiar((c) => Object.assign(c, { estado: red ? "sin-respuesta" : "error", texto, cuando: ahora() }));
}

function apuntarBien() {
  cambiar((c) => Object.assign(c, { estado: "bien", texto: "", cuando: ahora() }));
}

// --- Activar, probar y desactivar (Ajustes) ---

// Se llama dentro del toque en «Activar», sin esperar nada antes del permiso de notificaciones.
export async function activar(texto) {
  const direccion = normalizarDireccion(texto);
  if (!direccion) return { ok: false, texto: "Esa dirección no vale: tiene que ser la de tu PC en Tailscale, que acaba en .ts.net." };
  if (!soportado() || typeof Notification === "undefined") return { ok: false, texto: "Este navegador no admite avisos desde el PC." };
  let permiso = Notification.permission;
  if (permiso === "default") permiso = await Promise.resolve(Notification.requestPermission()).catch(() => Notification.permission);
  if (permiso !== "granted") return { ok: false, texto: "Hace falta el permiso de notificaciones (en los ajustes de Chrome)." };
  cambiar((c) => {
    if (c.direccion !== direccion) Object.assign(c, { direccion, activo: false, clave: null });
  });
  const r1 = await pedir(direccion, "/avisos/clave");
  if (!r1.ok || typeof r1.datos.clave !== "string") {
    const t = textoFallo(r1.ok ? { codigo: 0, texto: "no ha dado su clave" } : r1);
    apuntarFallo(t, r1.red);
    return { ok: false, texto: t };
  }
  let s;
  try {
    s = await suscripcion(r1.datos.clave, { crear: true });
  } catch (err) {
    const t = textoSuscripcion(err);
    apuntarFallo(t, false);
    return { ok: false, texto: t };
  }
  const r2 = await pedir(direccion, "/avisos/suscribir", { suscripcion: datosSuscripcion(s) });
  if (!r2.ok) {
    const t = textoFallo(r2);
    apuntarFallo(t, r2.red);
    return { ok: false, texto: t };
  }
  cambiar((c) => Object.assign(c, { activo: true, direccion, clave: r1.datos.clave, estado: "bien", texto: "", cuando: ahora() }));
  falloAvisado = false;
  enviado = null;
  sincronizar(); // si ya hay un descanso en marcha, que el PC lo sepa ya
  return { ok: true, listo: r2.datos.listo !== false };
}

export async function probar() {
  const c = leer();
  if (!c.activo) return { ok: false, texto: "Primero activa los avisos desde el PC." };
  let s;
  try {
    s = await suscripcion(c.clave, { crear: true });
  } catch (err) {
    const t = textoSuscripcion(err);
    apuntarFallo(t, false);
    return { ok: false, texto: t };
  }
  const r = await pedir(c.direccion, "/avisos/programar", {
    suscripcion: datosSuscripcion(s), clave: "prueba", en_ms: PRUEBA_MS,
    titulo: "Aviso de prueba desde el PC", texto: "Si lo ves con el móvil bloqueado, los avisos desde el PC funcionan.",
  });
  if (!r.ok) {
    const t = textoFallo(r);
    apuntarFallo(t, r.red);
    return { ok: false, texto: t };
  }
  apuntarBien();
  return { ok: true };
}

// Quita el aviso que tuviera el PC (si se puede), la suscripción de este móvil y lo guardado (menos la dirección).
export async function desactivar() {
  const c = leer();
  const habia = enviado;
  deseado = null;
  enviado = null;
  try {
    const s = await suscripcion(null);
    if (s) {
      if (habia && c.direccion) await pedir(c.direccion, "/avisos/cancelar", { suscripcion: { endpoint: s.endpoint }, clave: "descanso" });
      await s.unsubscribe().catch(() => {});
    }
  } catch {
    // Sin Web Push no hay nada que quitar.
  }
  cambiar((x) => Object.assign(x, { activo: false, clave: null, estado: null, texto: "", cuando: null }));
}

// --- El descanso ---

function alCambiarElDescanso(e, tipo) {
  if (tipo === "tic") return;
  const c = leer();
  if (!c.activo || !c.direccion || !c.clave) {
    deseado = null;
    enviado = null;
    return;
  }
  if (e.fase === "corriendo" && Number.isFinite(e.finEn)) {
    deseado = { id: e.id, finEn: e.finEn, titulo: recortar(e.texto, 80) || "¡Te toca!", texto: recortar(e.nombre, 160) };
  } else if (e.fase === "pausa" || e.fase === "nada") {
    deseado = null;
  } else {
    // «te-toca» o «acabo»: acabó solo y el PC ya lo manda (o lo ha mandado): no se cancela.
    acabado = e.id ?? null;
    deseado = null;
    enviado = null;
    return;
  }
  sincronizar();
}

const iguales = (a, b) => (!a && !b) || (Boolean(a) && Boolean(b) && a.id === b.id && Math.abs(a.finEn - b.finEn) < 500);

// Deja al PC con el aviso que toca, una petición detrás de otra (si se toca ±15 s varias veces seguidas, vale la última).
async function sincronizar() {
  if (trabajando) return;
  trabajando = true;
  try {
    for (let vuelta = 0; vuelta < 6 && !iguales(deseado, enviado); vuelta += 1) {
      const c = leer();
      if (!c.activo) break;
      const d = deseado;
      if (d) {
        const r = await programarDescanso(c, d);
        if (!r.ok) {
          enviado = null;
          fallo(r);
          break;
        }
        enviado = acabado === d.id ? null : d;
      } else {
        enviado = null;
        await cancelarDescanso(c);
      }
    }
  } finally {
    trabajando = false;
  }
}

async function programarDescanso(c, d) {
  let s;
  try {
    s = await suscripcion(c.clave, { crear: true });
  } catch (err) {
    return { ok: false, texto: textoSuscripcion(err), propio: true };
  }
  const en = Math.min(EN_MAX, Math.max(0, Math.round(d.finEn - ahora())));
  const r = await pedir(c.direccion, "/avisos/programar", {
    suscripcion: datosSuscripcion(s), clave: "descanso", en_ms: en, titulo: d.titulo, texto: d.texto, id: d.id,
  });
  if (r.ok) apuntarBien();
  return r;
}

async function cancelarDescanso(c) {
  try {
    const s = await suscripcion(null);
    if (s) await pedir(c.direccion, "/avisos/cancelar", { suscripcion: { endpoint: s.endpoint }, clave: "descanso" });
  } catch {
    // Sin suscripción no hay aviso que quitar.
  }
}

function fallo(r) {
  const t = r.propio ? r.texto : textoFallo(r);
  apuntarFallo(t, r.red);
  if (falloAvisado) return;
  falloAvisado = true;
  deps.avisar(r.red ? "El PC no responde: el aviso del descanso va como siempre" : "El PC no ha podido programar el aviso: va como siempre");
}
