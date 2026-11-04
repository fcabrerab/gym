// El temporizador de descanso: uno solo para toda la app, guardado en gym-beta-descanso para que sobreviva a
// cambiar de pantalla, recargar o cerrar. La cuenta sale siempre de «finEn» (una hora absoluta), así que se
// pone al día al volver aunque el móvil haya frenado los temporizadores. Al acabar: capa a pantalla completa,
// sonido, vibración y, si la app no está a la vista, una notificación. También lleva el Wake Lock y, con
// «Descanso con sonido», el audio de fondo con su Media Session (sonido.js) al empezar, pausar, seguir, ±15 s y saltar.

import * as almacen from "./almacen.js";
import * as sonido from "./sonido.js";
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
  avisar: () => {},
  // Lo que hace cada botón de la barra («descanso-pausa», «descanso-saltar», «descanso-mas15», «descanso-menos15»).
  // app.js pone el de entreno.js (con su «Deshacer»); lo usan también los botones de la pantalla de bloqueo.
  accion: (nombre) => accionSinBarra(nombre),
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
  ponerFondo({ gesto: true });
  return g.id;
}

export function pausar() {
  if (!actual || actual.finEn == null) return;
  guardar({ ...actual, quedan: segundosQuedan(actual), finEn: null, pausadoEn: ahora() });
  cerrarNotificaciones();
  emitir();
  actualizarPantalla();
  ponerFondo({ gesto: true });
}

export function seguir() {
  if (!actual || actual.finEn != null) return;
  const { pausadoEn, ...resto } = actual;
  guardar({ ...resto, finEn: ahora() + (actual.quedan ?? 0) * 1000, quedan: null });
  arrancarTic();
  emitir();
  actualizarPantalla();
  ponerFondo({ gesto: true });
}

export function alternarPausa() {
  if (!actual) return;
  if (actual.finEn == null) seguir();
  else pausar();
}

// ±15 s: nunca baja de 0:05 ni pasa de 10:00. «total» (lo que dura el descanso con lo sumado o quitado) solo sirve
// para la barra de progreso de la pantalla de bloqueo.
export function sumar(segundos) {
  if (!actual || final) return;
  const antes = segundosQuedan(actual);
  const nuevo = Math.min(MAX_SEGUNDOS, Math.max(MIN_SEGUNDOS, antes + segundos));
  const total = Math.max(nuevo, totalDe(actual) + nuevo - antes);
  if (actual.finEn == null) guardar({ ...actual, quedan: nuevo, total });
  else guardar({ ...actual, finEn: ahora() + nuevo * 1000, total });
  ultimoSegundo = null;
  emitir();
  ponerFondo({ gesto: true });
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
  sonido.pararFondo();
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
  ponerFondo({ gesto: true });
  return true;
}

// Lo que dura el descanso entero (con lo sumado o quitado con ±15 s).
function totalDe(g) {
  return Number.isFinite(g?.total) ? g.total : Number(g?.duracion) || 0;
}

// Sin la barra (por ejemplo, en las pruebas que solo cargan este módulo): los mismos efectos, sin «Deshacer».
function accionSinBarra(nombre) {
  if (nombre === "descanso-pausa") alternarPausa();
  else if (nombre === "descanso-saltar") saltar();
  else if (nombre === "descanso-mas15") sumar(15);
  else if (nombre === "descanso-menos15") sumar(-15);
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
    // El sonido de fondo se quita solo al acabar su aviso; por si acaso, aquí ya no queda nada.
    sonido.pararFondo();
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
    sonido.pararFondo();
    if (actual) arrancarTic();
    emitir();
    return;
  }
  if (fresco.avisado) {
    // Ya lo avisó otra ventana: aquí solo se enseña (si aquí sonaba el fondo, su aviso acaba solo).
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
    sonido.pararFondo();
    mostrarFinal("acabo", `El descanso acabó hace ${textoHace(Math.round(tarde / 1000))}`);
    return;
  }
  guardar({ ...fresco, avisado: true, terminadoEn: t });
  // Con el sonido de fondo, el audio sigue: lleva el aviso dentro y se quita solo al acabar.
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
    // Sin un toque, el navegador puede no dejar sonar: entonces lo pone el primer toque (alTocarPantalla).
    ponerFondo({ gesto: false });
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

// Cambios de otra ventana en gym-beta-descanso. El sonido de fondo pasa a la ventana que lo ha cambiado (aquí se
// quita); si solo ha marcado el final de este mismo descanso, se deja acabar su aviso.
export function recargarDesdeFuera() {
  const g = almacen.leerDescansoGuardado();
  if (!(g && g.id === actual?.id && g.avisado)) sonido.pararFondo();
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
  // Con el sonido de fondo, el aviso ya va dentro del audio: aquí no se repite (sin doble pitido).
  if (a.timerSound !== false && (prueba || !sonido.avisoEnElFondo(g.id))) sonar();
  if (a.vibracion !== false) vibrar(VIBRACION_FIN);
  if (a.timerNotification !== false && (prueba || document.visibilityState === "hidden")) {
    notificar(g.texto, { body: g.nombre, renotify: true, vibrate: VIBRACION_FIN, timestamp: ahora() });
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

// El sonido de la normal: 4 pulsos de 0,35 s con 0,18 s entre ellos, 880 y 1046,5 Hz alternos (sonido.AVISO: el
// mismo que va al final del sonido de fondo).
function sonar() {
  if (!audio) prepararAudio();
  if (!audio) return;
  const { pulsos, duracion, hueco, frecuencias, pico, suelo, subida } = sonido.AVISO;
  try {
    const r = audio.resume?.();
    if (r && typeof r.catch === "function") r.catch(() => {});
    const t0 = audio.currentTime;
    for (let i = 0; i < pulsos; i += 1) {
      const inicio = t0 + i * (duracion + hueco);
      const oscilador = audio.createOscillator();
      const ganancia = audio.createGain();
      oscilador.frequency.value = frecuencias[i % 2];
      ganancia.gain.setValueAtTime(suelo, inicio);
      ganancia.gain.exponentialRampToValueAtTime(pico, inicio + subida);
      ganancia.gain.exponentialRampToValueAtTime(suelo, inicio + duracion);
      oscilador.connect(ganancia).connect(audio.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + duracion);
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
    await registro.showNotification(titulo, { tag: ETIQUETA, icon: "./icono-512.png", badge: "./insignia-512.png", ...opciones });
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

// Al ocultarse con un descanso en marcha: notificación silenciosa con la hora de fin (no se queda vieja), también
// como su hora («timestamp»). Al volver: se cierra, se pone al día la cuenta y se vuelve a pedir la pantalla encendida.
export function alCambiarVisibilidad() {
  if (document.visibilityState === "hidden") {
    const a = deps.ajustes() || {};
    if (actual && actual.finEn != null && !actual.avisado && !final && a.timerNotification !== false) {
      const texto = actual.texto ? actual.texto.charAt(0).toLowerCase() + actual.texto.slice(1) : "";
      notificar(`Descanso hasta las ${hora(actual.finEn)}`, {
        body: [actual.nombre, texto].filter(Boolean).join(" · "), silent: true, renotify: false, timestamp: actual.finEn,
      });
    }
  } else {
    cerrarNotificaciones();
    tic();
    actualizarPantalla();
  }
}

// --- Descanso con sonido (sonido.js) ---

let falloAvisado = false; // «No se pudo poner el sonido de fondo» sale una sola vez
let fondoPendiente = false; // al abrir la app no dejó sonar sin un toque: lo pone el primer toque

// Los botones de la pantalla de bloqueo: lo mismo que los de la barra. «play» también vuelve a poner el sonido si
// Android lo había cortado (una llamada, otra app con música) y el descanso sigue corriendo.
const BOTONES_BLOQUEO = {
  pause: () => {
    if (actual && !final && actual.finEn != null) deps.accion("descanso-pausa");
  },
  play: () => {
    if (!actual || final) return;
    if (actual.finEn == null) deps.accion("descanso-pausa");
    else ponerFondo({ gesto: true });
  },
  nexttrack: () => {
    if (actual && !final) deps.accion("descanso-saltar");
  },
  seekforward: () => {
    if (actual && !final) deps.accion("descanso-mas15");
  },
  seekbackward: () => {
    if (actual && !final) deps.accion("descanso-menos15");
  },
};

// Lo que enseña la pantalla de bloqueo: «Descanso · Press de pecho», «Te toca la serie 2 de 3» y la barra de progreso
// (el descanso entero y lo que ya ha pasado). «segundos»: lo que queda.
function datosFondo(g) {
  const quedan = g.finEn != null ? Math.max(0, g.finEn - ahora()) / 1000 : Math.max(0, Number(g.quedan) || 0);
  const total = Math.max(quedan, totalDe(g));
  return {
    id: g.id, segundos: quedan, titulo: g.nombre ? `Descanso · ${g.nombre}` : "Descanso", artista: g.texto || "", total, posicion: total - quedan,
  };
}

// Pone el sonido de fondo como toca: sonando con lo que queda (un WAV nuevo cada vez), en pausa o quitado. Con
// «gesto» viene de un toque: si el navegador no deja sonar, se avisa (una vez) y el aviso va como siempre.
function ponerFondo({ gesto = false } = {}) {
  fondoPendiente = false;
  const a = deps.ajustes() || {};
  if (!actual || final || a.descansoConSonido !== true) {
    sonido.pararFondo();
    return;
  }
  const datos = datosFondo(actual);
  if (actual.finEn == null) {
    sonido.pausarFondo(datos);
    return;
  }
  sonido.sonarFondo({ ...datos, conAviso: a.timerSound !== false, acciones: BOTONES_BLOQUEO }).then((suena) => {
    if (suena) return;
    if (!gesto) {
      fondoPendiente = true;
    } else if (!falloAvisado) {
      falloAvisado = true;
      deps.avisar("No se pudo poner el sonido de fondo: el aviso va como siempre");
    }
  });
}

// El primer toque en la pantalla (app.js): si al abrir la app no dejó poner el sonido de fondo, ahora sí.
export function alTocarPantalla() {
  if (fondoPendiente) ponerFondo({ gesto: true });
}

// Al cambiar «Descanso con sonido» o «Sonido» en Ajustes (con un toque): el sonido de fondo se pone, se quita o se
// rehace (con o sin el aviso al final).
export function alCambiarAjusteSonido() {
  ponerFondo({ gesto: true });
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
