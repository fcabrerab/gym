// Copia en el PC: al acabar cada entreno, la beta manda una copia de tus datos a tu PC de casa por Tailscale y el PC
// la guarda (todas las de los últimos 30 días y, de antes, dos por mes). Si no puede (sin Tailscale en el móvil o con
// el PC apagado), lo vuelve a intentar al abrir la beta. Es lo mismo que «Exportar datos»: la cargan la beta y la
// normal. Usa la dirección del PC de «Avisos desde el PC» (avisos-pc.js), que no está en el código: este repo es
// público. Sin entrenos todavía, no manda nada.
// Guarda en gym-beta-copia-pc, solo en este móvil: {activo, ultima, sesiones, estado, texto, cuando}. «ultima» es la
// hora de los datos de la última copia que llegó al PC (para saber si tiene lo último y para el recordatorio).

import * as almacen from "./almacen.js";
import { leer as leerAvisosPc, normalizarDireccion } from "./avisos-pc.js";
import { construirExportacion } from "./copias.js";
import { ahora, recortar } from "./util.js";

export const CLAVE = "gym-beta-copia-pc";
export const RUTA = "/gimnasio/copia";
export const AL_ABRIR_MS = 3000; // al abrir la beta, se espera esto antes de mirar si hay que mandar una
const ESPERA_MS = 20000; // lo que se espera al PC (una copia puede pesar unos cientos de KB)
const REINTENTO_MS = 10 * 60000; // tras un fallo, al abrir no se vuelve a intentar antes de esto
const POR_DEFECTO = { activo: true, ultima: null, sesiones: null, estado: null, texto: "", cuando: null };

let deps = { avisar: () => {}, alCambiar: () => {} };
let enCurso = null; // la promesa del envío en marcha
let momentoEnCurso = null; // la hora de los datos que van de camino
let falloAvisado = false; // el fallo al acabar un entreno se dice una vez cada vez que se abre la app

export function configurarCopiaPc(opciones) {
  deps = { ...deps, ...opciones };
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

export function alternar(activo) {
  cambiar((c) => { c.activo = Boolean(activo); });
}

// La dirección del PC, la de «Avisos desde el PC» (aunque los avisos estén apagados), o "".
export function direccion() {
  return normalizarDireccion(leerAvisosPc().direccion) || "";
}

export function estado() {
  return { ...leer(), direccion: direccion(), enviando: Boolean(enCurso) };
}

// ¿Tiene ya el PC una copia con todo lo último?
export function alDia(datos = almacen.datos()) {
  const c = leer();
  return Boolean(datos) && Number.isFinite(c.ultima) && !(datos.actualizado > c.ultima);
}

// Para el recordatorio de guardar copia: la hora de los datos de la última copia que tiene el PC (o de la que va de
// camino), o null si la copia en el PC está apagada o nunca ha llegado ninguna.
export function ultimaEnPc() {
  const c = leer();
  if (!c.activo) return null;
  if (enCurso && Number.isFinite(momentoEnCurso)) return momentoEnCurso;
  return Number.isFinite(c.ultima) ? c.ultima : null;
}

// --- Hablar con el PC ---

// {ok: true, datos} o {ok: false, red?, codigo?, texto}. Nunca lanza.
async function pedir(dir, ruta, texto) {
  const opciones = {
    method: "POST", mode: "cors", credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json" }, body: texto,
  };
  const control = typeof AbortController === "function" ? new AbortController() : null;
  const reloj = control ? setTimeout(() => control.abort(), ESPERA_MS) : null;
  if (control) opciones.signal = control.signal;
  try {
    const r = await fetch(`${dir}${ruta}`, opciones);
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

function textoFallo(r) {
  if (r.red) return "El PC no responde: mira que Tailscale esté activo en el móvil y el PC encendido.";
  if (r.codigo === 403) return `El PC no la deja: ${r.texto}.`;
  return `El PC no ha podido guardarla: ${r.texto}.`;
}

// Manda una copia al PC. motivo: «fin» (al acabar un entreno), «abrir» (al abrir la beta) o «mano» (el botón).
// Devuelve una promesa con {ok, guardada?, texto?}; nunca lanza. Si ya va una de camino, devuelve esa.
export function mandar(motivo = "mano") {
  if (enCurso) return enCurso;
  const dir = direccion();
  const datos = almacen.datos();
  if (!dir) return Promise.resolve({ ok: false, texto: "Falta la dirección de tu PC: ponla en «Avisos desde el PC» (Ajustes → Descanso)." });
  if (!datos) return Promise.resolve({ ok: false, texto: "Aún no hay datos que copiar." });
  const momento = ahora();
  let texto;
  try {
    texto = JSON.stringify(construirExportacion(datos, momento), null, 2);
  } catch {
    return Promise.resolve({ ok: false, texto: "No se ha podido preparar la copia." });
  }
  momentoEnCurso = momento;
  enCurso = (async () => {
    const r = await pedir(dir, `${RUTA}?motivo=${encodeURIComponent(motivo)}`, texto);
    if (r.ok) {
      falloAvisado = false;
      cambiar((c) => Object.assign(c, { ultima: momento, sesiones: datos.sesiones.length, estado: "bien", texto: "", cuando: ahora() }));
      return { ok: true, guardada: r.datos.guardada !== false };
    }
    const t = textoFallo(r);
    cambiar((c) => Object.assign(c, { estado: r.red ? "sin-respuesta" : "error", texto: t, cuando: ahora() }));
    return { ok: false, red: Boolean(r.red), texto: t };
  })().finally(() => {
    enCurso = null;
    momentoEnCurso = null;
    deps.alCambiar(leer());
  });
  deps.alCambiar(leer());
  return enCurso;
}

// Al acabar un entreno (entreno.js, con la sesión ya guardada): en segundo plano. Si falla, se dice una vez.
export function alGuardarSesion() {
  if (!leer().activo || !direccion()) return;
  mandar("fin").then((r) => {
    if (r.ok || falloAvisado) return;
    falloAvisado = true;
    deps.avisar(r.red
      ? "No se ha podido guardar la copia en el PC: no responde. Se intentará otra vez al abrir la beta."
      : `No se ha podido guardar la copia en el PC. ${r.texto}`);
  });
}

// Al abrir la beta o volver a ella (app.js): si el PC no tiene lo último, se le manda. Sin avisos: si falla, queda
// dicho en Ajustes, y el recordatorio de guardar copia sigue saliendo como siempre.
export function alAbrir() {
  const c = leer();
  const datos = almacen.datos();
  if (enCurso || !c.activo || !direccion() || !datos || !datos.sesiones?.length || alDia(datos)) return;
  if (c.estado !== "bien" && Number.isFinite(c.cuando) && ahora() - c.cuando < REINTENTO_MS) return;
  mandar("abrir");
}
