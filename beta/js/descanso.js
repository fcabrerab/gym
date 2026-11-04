// El temporizador de descanso: uno solo para toda la app, guardado en gym-beta-descanso para que sobreviva a
// cambiar de pantalla, recargar o cerrar. La cuenta sale siempre de «finEn» (una hora absoluta), así que se
// pone al día al volver aunque el móvil haya frenado los temporizadores. Al acabar: capa a pantalla completa,
// sonido, vibración y, si la app no está a la vista, una notificación. También lleva el Wake Lock.

import * as almacen from "./almacen.js";
import { ahora, formatoDescanso, hora, idCorto } from "./util.js";

export const ETIQUETA = "gym-beta-descanso";
export const VIBRACION_FIN = [400, 150, 400, 150, 800];
const MIN_SEGUNDOS = 5;
const MAX_SEGUNDOS = 600;
const MS_FINAL = 5000;
const MS_TARDE = 10000; // si el aviso llega más tarde que esto con la app a la vista, ya no suena: se dice cuánto hace
const MS_PAUSA_MAX = 30 * 60000; // un descanso en pausa olvidado se quita a la media hora

let deps = {
  ajustes: () => ({}),
  haySesion: () => false,
  anunciar: () => {},
  mostrarCapa: () => {},
};
let actual = null; // copia en memoria de gym-beta-descanso
let intervalo = null;
let ultimoSegundo = null;
let final = null; // {tipo: "te-toca" | "acabo", texto, hasta}
let temporizadorFinal = null;
let audio = null;
let pantalla = null;
let pidiendoPantalla = false;
const oyentes = new Set();

export function configurarDescanso(opciones) {
  deps = { ...deps, ...opciones };
}

export function alCambiarDescanso(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function emitir(tipo = "estado") {
  const e = estadoDescanso();
  for (const fn of oyentes) {
    try {
      fn(e, tipo);
    } catch (err) {
      console.error(err);
    }
  }
}

function segundosQuedan(g, t = ahora()) {
  if (!g) return 0;
  if (g.finEn == null) return Math.max(0, Math.round(g.quedan ?? 0));
  return Math.max(0, Math.ceil((g.finEn - t) / 1000));
}

// Lo que la barra tiene que enseñar: {fase: "nada" | "corriendo" | "pausa" | "te-toca" | "acabo", …}.
export function estadoDescanso() {
  if (final && actual) {
    return { fase: final.tipo, texto: final.texto, nombre: actual.nombre, quedan: 0, id: actual.id, detalle: actual.texto, capa: actual.capa || actual.texto };
  }
  if (!actual) return { fase: "nada" };
  return {
    fase: actual.finEn == null ? "pausa" : "corriendo",
    quedan: segundosQuedan(actual),
    nombre: actual.nombre,
    texto: actual.texto,
    capa: actual.capa || actual.texto,
    id: actual.id,
    exerciseId: actual.exerciseId,
    finEn: actual.finEn,
  };
}

export function idActual() {
  return actual?.id ?? null;
}

function guardar(g) {
  actual = g;
  almacen.guardarDescansoGuardado(g);
}

function arrancarTic() {
  if (!intervalo) intervalo = setInterval(tic, 250);
}

function pararTic() {
  if (intervalo) clearInterval(intervalo);
  intervalo = null;
}

function quitarFinal() {
  if (temporizadorFinal) clearTimeout(temporizadorFinal);
  temporizadorFinal = null;
  final = null;
}

// Empieza un descanso nuevo. Si había otro, lo sustituye: nunca hay dos. Un descanso de 0 s (para encadenar
// ejercicios) no empieza nada: devuelve null.
export function empezarDescanso({ exerciseId, diaId, nombre, texto, capa, duracion }) {
  const segundos = Math.min(MAX_SEGUNDOS, Math.max(0, Math.round(Number(duracion) || 0)));
  if (segundos <= 0) return null;
  quitarFinal();
  const g = {
    id: idCorto(), exerciseId, diaId, nombre, texto, capa: capa || texto, duracion: segundos,
    finEn: ahora() + segundos * 1000, quedan: null, avisado: false, terminadoEn: null,
  };
  guardar(g);
  ultimoSegundo = null;
  arrancarTic();
  deps.anunciar(`Descanso de ${formatoDescanso(segundos)}`);
  emitir("empezar");
  actualizarPantalla();
  return g.id;
}

export function pausar() {
  if (!actual || actual.finEn == null) return;
  guardar({ ...actual, quedan: segundosQuedan(actual), finEn: null, pausadoEn: ahora() });
  cerrarNotificaciones();
  emitir();
  actualizarPantalla();
}

export function seguir() {
  if (!actual || actual.finEn != null) return;
  const { pausadoEn, ...resto } = actual;
  guardar({ ...resto, finEn: ahora() + (actual.quedan ?? 0) * 1000, quedan: null });
  arrancarTic();
  emitir();
  actualizarPantalla();
}

export function alternarPausa() {
  if (!actual) return;
  if (actual.finEn == null) seguir();
  else pausar();
}

// ±15 s: nunca baja de 0:05 ni pasa de 10:00.
export function sumar(segundos) {
  if (!actual || final) return;
  const nuevo = Math.min(MAX_SEGUNDOS, Math.max(MIN_SEGUNDOS, segundosQuedan(actual) + segundos));
  if (actual.finEn == null) guardar({ ...actual, quedan: nuevo });
  else guardar({ ...actual, finEn: ahora() + nuevo * 1000 });
  ultimoSegundo = null;
  emitir();
}

// Acaba el descanso sin aviso (Saltar, deshacer la serie o terminar la sesión). Devuelve el descanso que había
// (para poder ponerlo otra vez con «Deshacer»), o null.
export function saltar() {
  const previo = actual && !final ? { ...actual } : null;
  pararTic();
  quitarFinal();
  if (actual || almacen.leerDescansoGuardado()) almacen.borrarDescansoGuardado();
  actual = null;
  cerrarNotificaciones();
  emitir("saltar");
  actualizarPantalla();
  return previo;
}

// Vuelve a poner un descanso que se saltó («Deshacer» de Saltar), tal como estaba: corriendo o en pausa.
export function reponer(g) {
  if (!g || !Number.isFinite(g.duracion)) return false;
  quitarFinal();
  guardar({ ...g, avisado: false, terminadoEn: null });
  ultimoSegundo = null;
  if (g.finEn != null) arrancarTic();
  emitir("empezar");
  actualizarPantalla();
  return true;
}

function tic() {
  if (!actual) {
    pararTic();
    return;
  }
  if (actual.finEn == null || final) return;
  const quedan = segundosQuedan(actual);
  if (quedan <= 0) {
    acabar();
    return;
  }
  if (quedan !== ultimoSegundo) {
    ultimoSegundo = quedan;
    emitir("tic");
  }
}

// Pone la cuenta al día (al volver a primer plano).
export function ponerAlDia() {
  tic();
}

function mostrarFinal(tipo, texto) {
  quitarFinal();
  final = { tipo, texto };
  const id = actual?.id;
  emitir("final");
  temporizadorFinal = setTimeout(() => {
    final = null;
    temporizadorFinal = null;
    const g = almacen.leerDescansoGuardado();
    if (g && g.id === id) almacen.borrarDescansoGuardado();
    if (actual?.id === id) actual = null;
    emitir("fin");
    actualizarPantalla();
  }, MS_FINAL);
}

function acabar() {
  pararTic();
  const fresco = almacen.leerDescansoGuardado();
  if (!fresco || fresco.id !== actual.id) {
    // Otra ventana lo cambió o lo quitó: se toma lo guardado.
    actual = fresco;
    if (actual) arrancarTic();
    emitir();
    return;
  }
  if (fresco.avisado) {
    // Ya lo avisó otra ventana: aquí solo se enseña.
    actual = fresco;
    mostrarFinal("te-toca", "¡Te toca!");
    return;
  }
  const t = ahora();
  const tarde = t - fresco.finEn;
  if (tarde > MS_TARDE && document.visibilityState !== "hidden") {
    // La página estuvo congelada (Android la para en segundo plano) y se vuelve a ella con el descanso acabado
    // hace rato: sin alarma tardía, como al volver a abrir la app. Si la app no está a la vista, el aviso (y su
    // notificación) siguen saliendo aunque lleguen tarde.
    guardar({ ...fresco, avisado: true, terminadoEn: t });
    mostrarFinal("acabo", `El descanso acabó hace ${textoHace(Math.round(tarde / 1000))}`);
    return;
  }
  guardar({ ...fresco, avisado: true, terminadoEn: t });
  efectosFin(actual);
  mostrarFinal("te-toca", "¡Te toca!");
}

// Al abrir la app con un descanso guardado: si aún corre, sigue; si acabó sin avisar, se dice cuánto hace
// (sin sonido); si ya se avisó hace más de 10 s, se borra.
export function restaurarDescanso() {
  const g = almacen.leerDescansoGuardado();
  actual = g;
  if (!g) return;
  const t = ahora();
  if (g.finEn == null) {
    // En pausa: se quita si lleva así más de media hora, o si no se sabe desde cuándo y no hay sesión en marcha.
    const pausadoEn = Number.isFinite(g.pausadoEn) ? g.pausadoEn : null;
    if ((pausadoEn != null && t - pausadoEn > MS_PAUSA_MAX) || (pausadoEn == null && !deps.haySesion())) {
      almacen.borrarDescansoGuardado();
      actual = null;
      return;
    }
    if (pausadoEn == null) guardar({ ...g, pausadoEn: t });
    emitir();
    return;
  }
  if (g.finEn > t && !g.avisado) {
    arrancarTic();
    emitir();
    return;
  }
  if (!g.avisado) {
    const hace = Math.round((t - g.finEn) / 1000);
    if (hace > 30 * 60) {
      almacen.borrarDescansoGuardado();
      actual = null;
      return;
    }
    guardar({ ...g, avisado: true, terminadoEn: t });
    mostrarFinal("acabo", `El descanso acabó hace ${textoHace(hace)}`);
    return;
  }
  if (t - (g.terminadoEn ?? g.finEn) > 10000) {
    almacen.borrarDescansoGuardado();
    actual = null;
    return;
  }
  mostrarFinal("te-toca", "¡Te toca!");
}

function textoHace(segundos) {
  if (segundos < 60) return `${Math.max(1, segundos)} s`;
  const min = Math.round(segundos / 60);
  return min === 1 ? "1 min" : `${min} min`;
}

// Cambios de otra ventana en gym-beta-descanso.
export function recargarDesdeFuera() {
  const g = almacen.leerDescansoGuardado();
  if (!g) {
    if (actual && !final) {
      actual = null;
      pararTic();
      emitir();
      actualizarPantalla();
    }
    return;
  }
  if (actual && g.id === actual.id && final) return;
  actual = g;
  quitarFinal();
  if (g.finEn != null && !g.avisado) arrancarTic();
  else if (g.avisado) mostrarFinal("te-toca", "¡Te toca!");
  emitir();
}

// --- Efectos del final ---

function efectosFin(g, { prueba = false } = {}) {
  const a = deps.ajustes() || {};
  if (a.timerAlert !== false) deps.mostrarCapa({ titulo: "¡Te toca!", texto: g.capa || g.texto });
  if (a.timerSound !== false) sonar();
  if (a.vibracion !== false) vibrar(VIBRACION_FIN);
  if (a.timerNotification !== false && (prueba || document.visibilityState === "hidden")) {
    notificar(g.texto, { body: g.nombre, renotify: true, vibrate: VIBRACION_FIN });
  }
  deps.anunciar(`Descanso terminado. ${g.texto}${g.nombre ? ` de ${g.nombre}` : ""}.`);
}

// «Probar aviso» de Ajustes: los mismos efectos, con notificación aunque la app esté a la vista.
export function probarAviso() {
  prepararAudio();
  efectosFin({ texto: "Te toca la serie 2 de 3", capa: "Serie 2 de 3 · Aviso de prueba", nombre: "Aviso de prueba" }, { prueba: true });
}

function vibrar(patron) {
  try {
    navigator.vibrate?.(patron);
  } catch {
    // Sin vibración en este navegador.
  }
}

export function vibrarCorto() {
  vibrar(30);
}

export function audioPreparado() {
  return Boolean(audio) && audio.state !== "closed";
}

// Crea y reanuda el AudioContext dentro de un toque (el primer ✓), para que luego el aviso pueda sonar.
export function prepararAudio() {
  const Clase = window.AudioContext || window.webkitAudioContext;
  if (!Clase) return;
  try {
    if (!audio || audio.state === "closed") audio = new Clase();
    const r = audio.resume?.();
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {
    audio = null;
  }
}

// El sonido de la normal: 4 pulsos de 0,35 s con 0,18 s entre ellos, 880 y 1046,5 Hz alternos.
function sonar() {
  if (!audio) prepararAudio();
  if (!audio) return;
  try {
    const r = audio.resume?.();
    if (r && typeof r.catch === "function") r.catch(() => {});
    const t0 = audio.currentTime;
    for (let i = 0; i < 4; i += 1) {
      const inicio = t0 + i * (0.35 + 0.18);
      const oscilador = audio.createOscillator();
      const ganancia = audio.createGain();
      oscilador.frequency.value = i % 2 === 0 ? 880 : 1046.5;
      ganancia.gain.setValueAtTime(0.001, inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.28, inicio + 0.02);
      ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + 0.35);
      oscilador.connect(ganancia).connect(audio.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.35);
    }
  } catch {
    // Sin sonido: quedan la capa, la vibración y la notificación.
  }
}

export function permisoNotificaciones() {
  if (typeof Notification === "undefined") return "no-existe";
  return Notification.permission;
}

// Notificación por el service worker de la beta (en Android, «new Notification()» no funciona en la página).
// Nunca se espera a navigator.serviceWorker.ready: sin service worker no se resolvería nunca.
async function notificar(titulo, opciones = {}) {
  try {
    if (permisoNotificaciones() !== "granted") return false;
    const registro = await navigator.serviceWorker?.getRegistration("./");
    if (!registro) return false;
    await registro.showNotification(titulo, { tag: ETIQUETA, icon: "./icon.svg", badge: "./icon.svg", ...opciones });
    return true;
  } catch {
    return false;
  }
}

async function cerrarNotificaciones() {
  try {
    const registro = await navigator.serviceWorker?.getRegistration("./");
    const lista = (await registro?.getNotifications?.({ tag: ETIQUETA })) || [];
    lista.forEach((n) => n.close());
  } catch {
    // Nada que cerrar.
  }
}

// Al ocultarse con un descanso en marcha: notificación silenciosa con la hora de fin (no se queda vieja).
// Al volver: se cierra, se pone al día la cuenta y se vuelve a pedir la pantalla encendida.
export function alCambiarVisibilidad() {
  if (document.visibilityState === "hidden") {
    const a = deps.ajustes() || {};
    if (actual && actual.finEn != null && !actual.avisado && !final && a.timerNotification !== false) {
      const texto = actual.texto ? actual.texto.charAt(0).toLowerCase() + actual.texto.slice(1) : "";
      notificar(`Descanso hasta las ${hora(actual.finEn)}`, { body: [actual.nombre, texto].filter(Boolean).join(" · "), silent: true, renotify: false });
    }
  } else {
    cerrarNotificaciones();
    tic();
    actualizarPantalla();
  }
}

// --- Pantalla encendida (Wake Lock) ---

// Con «pantalla encendida», toda la sesión; si no, solo mientras corre un descanso. Un descanso en pausa sin sesión
// en marcha no la pide (gastaría batería con la app olvidada).
function deberiaPantalla() {
  const a = deps.ajustes() || {};
  const haySesion = deps.haySesion();
  const corriendo = Boolean(actual) && !final && actual.finEn != null;
  const enPausa = Boolean(actual) && !final && actual.finEn == null;
  return (a.pantallaEncendida !== false && haySesion) || corriendo || (enPausa && haySesion);
}

// Pide o suelta el Wake Lock según haga falta: con «pantalla encendida», toda la sesión; si no, solo en el descanso.
export function actualizarPantalla() {
  if (deberiaPantalla()) {
    if (document.visibilityState === "visible") pedirPantalla();
  } else {
    soltarPantalla();
  }
}

async function pedirPantalla() {
  if (pantalla || pidiendoPantalla || !("wakeLock" in navigator)) return;
  pidiendoPantalla = true;
  try {
    const s = await navigator.wakeLock.request("screen");
    pidiendoPantalla = false;
    if (!deberiaPantalla()) {
      s.release().catch(() => {});
      return;
    }
    pantalla = s;
    s.addEventListener("release", () => {
      if (pantalla === s) pantalla = null;
    });
  } catch {
    pidiendoPantalla = false;
  }
}

function soltarPantalla() {
  if (!pantalla) return;
  const s = pantalla;
  pantalla = null;
  s.release().catch(() => {});
}

export function pantallaEncendidaExiste() {
  return "wakeLock" in navigator;
}
