// La única puerta de la beta a localStorage. Se niega a escribir o borrar cualquier clave que no empiece por
// «gym-beta-» (la normal comparte dirección y sus claves no se tocan). Guarda los datos con un número de
// revisión para notar los cambios de otra ventana y devuelve «deshacer» en cada cambio.

import { ESQUEMA, validarDatos, reparar, migrar } from "./modelo.js";
import { ahora } from "./util.js";

export const PREFIJO = "gym-beta-";
export const CLAVE_DATOS = "gym-beta-datos";
export const CLAVE_SESION = "gym-beta-sesion";
export const CLAVE_DESCANSO = "gym-beta-descanso";
export const CLAVE_UI = "gym-beta-ui";
export const PREFIJO_RESCATE = "gym-beta-rescate-";
// La última versión elegida («beta» o «normal»): la escribe la normal (su botón «Beta» y su «?normal») y la lee al
// abrirse para ir directa a la beta. «Borrar todos los datos de la beta» no la toca.
export const CLAVE_PREFERIDA = "gym-beta-preferida";

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const estado = {
  datos: null,
  texto: null,
  rev: 0,
  revGuardado: 0,
  pendiente: false, // hay cambios en memoria que no se pudieron guardar (almacenamiento lleno)
  bloqueado: false, // otra ventana guardó datos de una versión más nueva: esta no escribe nada
  oyentes: new Set(),
};

function emitir(tipo, extra = {}) {
  for (const fn of estado.oyentes) {
    try {
      fn({ tipo, ...extra });
    } catch (err) {
      console.error(err);
    }
  }
}

// Avisa de los cambios: «datos», «otra-ventana», «sesion», «descanso», «ui», «cuota» y «nuevo» (datos de una
// versión más nueva guardados por otra ventana).
export function alCambiar(fn) {
  estado.oyentes.add(fn);
  return () => estado.oyentes.delete(fn);
}

function comprobarClave(clave) {
  if (typeof clave !== "string" || !clave.startsWith(PREFIJO)) {
    throw new Error(`La beta no puede tocar la clave «${clave}».`);
  }
}

function esCuota(err) {
  return err && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22 || err.code === 1014);
}

// Escribe una clave de la beta. Si el almacenamiento está lleno, avisa y devuelve false (no lanza).
export function escribir(clave, texto) {
  comprobarClave(clave);
  try {
    localStorage.setItem(clave, texto);
    return true;
  } catch (err) {
    if (esCuota(err)) {
      emitir("cuota");
      return false;
    }
    throw err;
  }
}

export function borrar(clave) {
  comprobarClave(clave);
  localStorage.removeItem(clave);
}

export function leer(clave) {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function leerJson(clave) {
  const t = leer(clave);
  if (t == null) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

// --- Datos (gym-beta-datos) ---

// Lee los datos al arrancar. Devuelve {tipo: "vacio"} | {tipo: "danado", texto} | {tipo: "nuevo", texto} |
// {tipo: "ok" | "migrado", datos, avisos, original}. No escribe nada.
export function cargarDatos() {
  const texto = leer(CLAVE_DATOS);
  if (texto == null) return { tipo: "vacio" };
  let d;
  try {
    d = JSON.parse(texto);
  } catch {
    return { tipo: "danado", texto };
  }
  if (!esObjeto(d) || typeof d.esquema !== "number" || !Number.isFinite(d.esquema)) return { tipo: "danado", texto };
  if (d.esquema > ESQUEMA) return { tipo: "nuevo", texto };
  const original = d;
  let migrado = false;
  if (d.esquema < ESQUEMA) {
    try {
      d = migrar(d);
      migrado = true;
    } catch {
      return { tipo: "danado", texto };
    }
  }
  if (!validarDatos(d).ok) return { tipo: "danado", texto };
  const { datos, avisos } = reparar(d);
  estado.datos = datos;
  estado.texto = migrado ? null : texto;
  estado.rev = datos.rev;
  estado.revGuardado = migrado ? -1 : datos.rev;
  return { tipo: migrado ? "migrado" : "ok", datos, avisos, original };
}

export function datos() {
  return estado.datos;
}

// Guarda unos datos nuevos enteros (primera vez, migración). Devuelve true si se guardaron.
export function ponerDatos(nuevos) {
  if (estado.bloqueado) return false;
  const d = structuredClone(nuevos);
  d.rev = (Number.isFinite(estado.rev) ? estado.rev : 0) + 1;
  const texto = JSON.stringify(d);
  estado.datos = d;
  estado.texto = texto;
  estado.rev = d.rev;
  const ok = escribir(CLAVE_DATOS, texto);
  estado.pendiente = !ok;
  if (ok) estado.revGuardado = d.rev;
  emitir("datos");
  return ok;
}

// Si otra ventana guardó (su rev no es el que guardamos nosotros), se toman sus datos. Devuelve true si cambió.
export function sincronizar() {
  const texto = leer(CLAVE_DATOS);
  if (texto == null || texto === estado.texto || estado.pendiente) return false;
  let d;
  try {
    d = JSON.parse(texto);
  } catch {
    return false;
  }
  if (esObjeto(d) && Number(d.esquema) > ESQUEMA) {
    // Otra ventana ya tiene una versión más nueva de la beta: esta deja de escribir para no pisar sus datos.
    if (!estado.bloqueado) {
      estado.bloqueado = true;
      emitir("nuevo");
    }
    return false;
  }
  if (!esObjeto(d) || d.rev === estado.revGuardado || d.esquema !== ESQUEMA || !validarDatos(d).ok) return false;
  const { datos: reparados } = reparar(d);
  estado.datos = reparados;
  estado.texto = texto;
  estado.rev = reparados.rev;
  estado.revGuardado = reparados.rev;
  emitir("otra-ventana");
  return true;
}

// Cambia los datos: relee por si otra ventana guardó, aplica fn a una copia (puede devolver otro objeto),
// sube el rev, guarda y avisa. Devuelve deshacer(): vuelve a dejar los datos de antes (con un rev nuevo) solo si
// no ha habido otro cambio después; si lo ha habido, no toca nada y devuelve false (así nunca se lleva por
// delante lo que se hizo después, como terminar una sesión o cambiar el orden).
// Con {tocarActualizado: false} no cuenta como cambio para el aviso de copia (p. ej. al marcar la copia hecha).
export function mutar(fn, { tocarActualizado = true } = {}) {
  sincronizar();
  if (estado.bloqueado) {
    emitir("nuevo");
    return () => false;
  }
  const antes = structuredClone(estado.datos);
  const borrador = structuredClone(estado.datos);
  const r = fn(borrador);
  const nuevo = esObjeto(r) ? r : borrador;
  nuevo.rev = estado.rev + 1;
  if (tocarActualizado) nuevo.actualizado = ahora();
  else nuevo.actualizado = antes.actualizado;
  const texto = JSON.stringify(nuevo);
  estado.datos = nuevo;
  estado.texto = texto;
  estado.rev = nuevo.rev;
  const ok = escribir(CLAVE_DATOS, texto);
  estado.pendiente = !ok;
  if (ok) estado.revGuardado = nuevo.rev;
  emitir("datos");
  const revTras = nuevo.rev;
  return () => {
    sincronizar();
    if (estado.rev !== revTras || estado.bloqueado) return false;
    mutar(() => structuredClone(antes));
    return true;
  };
}

// La revisión de los datos en memoria (para saber si ha habido cambios después de uno dado).
export function revision() {
  return estado.rev;
}

// Reintenta guardar lo que quedó en memoria (después de un aviso de almacenamiento lleno).
export function reintentar() {
  if (!estado.pendiente || !estado.datos) return true;
  const ok = escribir(CLAVE_DATOS, JSON.stringify(estado.datos));
  if (ok) {
    estado.pendiente = false;
    estado.revGuardado = estado.rev;
  }
  return ok;
}

export function hayPendiente() {
  return estado.pendiente;
}

// true si lo último que se cambió está guardado de verdad (ni almacenamiento lleno ni datos más nuevos de otra ventana).
export function todoGuardado() {
  return !estado.pendiente && !estado.bloqueado;
}

export function bloqueado() {
  return estado.bloqueado;
}

// Lo que ocupan los datos guardados, en bytes (UTF-8).
export function tamanoDatos() {
  const t = estado.texto ?? leer(CLAVE_DATOS) ?? "";
  return new Blob([t]).size;
}

// --- Sesión en curso, descanso y estado de pantalla ---

export function leerSesion() {
  const s = leerJson(CLAVE_SESION);
  return esObjeto(s) && typeof s.id === "string" && typeof s.diaId === "string" && esObjeto(s.ejercicios) ? {
    pospuestos: [], pesoElegido: {}, actual: null, ...s,
  } : null;
}

export function guardarSesion(s) {
  const ok = escribir(CLAVE_SESION, JSON.stringify(s));
  emitir("sesion");
  return ok;
}

export function borrarSesion() {
  borrar(CLAVE_SESION);
  emitir("sesion");
}

export function leerDescansoGuardado() {
  const d = leerJson(CLAVE_DESCANSO);
  return esObjeto(d) && Number.isFinite(d.duracion) ? d : null;
}

export function guardarDescansoGuardado(d) {
  return escribir(CLAVE_DESCANSO, JSON.stringify(d));
}

export function borrarDescansoGuardado() {
  borrar(CLAVE_DESCANSO);
}

const UI_POR_DEFECTO = { diaElegido: null, posponerCopiaHasta: null, versionVista: null, vistaHistorial: "sesiones", ayudaSerieVista: false };

export function leerUi() {
  const u = leerJson(CLAVE_UI);
  return { ...UI_POR_DEFECTO, ...(esObjeto(u) ? u : {}) };
}

export function cambiarUi(fn) {
  const u = leerUi();
  fn(u);
  escribir(CLAVE_UI, JSON.stringify(u));
  emitir("ui");
  return u;
}

// --- Rescate y borrado ---

function clavesBeta() {
  const claves = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIJO)) claves.push(k);
  }
  return claves;
}

export function listarRescates() {
  return clavesBeta().filter((k) => k.startsWith(PREFIJO_RESCATE)).sort();
}

// Guarda aparte, sin tocarlo, el texto de unos datos que no se pudieron leer. Como mucho 3 (se borra el más viejo).
export function guardarRescate(texto, ahoraMs) {
  const ya = listarRescates().find((k) => leer(k) === texto);
  if (ya) return ya;
  const d = new Date(ahoraMs);
  const dos = (n) => String(n).padStart(2, "0");
  const clave = `${PREFIJO_RESCATE}${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}${dos(d.getSeconds())}`;
  if (!escribir(clave, texto)) return null;
  const todos = listarRescates();
  while (todos.length > 3) borrar(todos.shift());
  return clave;
}

// Borra solo las claves de la beta (nunca las de la normal). Las copias automáticas (IndexedDB) se conservan.
export function borrarTodoBeta() {
  for (const k of clavesBeta()) if (k !== CLAVE_PREFERIDA) borrar(k);
  estado.datos = null;
  estado.texto = null;
  estado.rev = 0;
  estado.revGuardado = 0;
  estado.pendiente = false;
  estado.bloqueado = false;
}

// --- Otras ventanas ---

// Escucha los cambios de otras ventanas o pestañas de la beta (evento «storage»). Lo llama app.js al arrancar.
export function escucharOtrasVentanas() {
  window.addEventListener("storage", (ev) => {
    if (ev.storageArea && ev.storageArea !== localStorage) return;
    if (ev.key === null || ev.key === CLAVE_DATOS) {
      if (estado.datos) sincronizar();
    }
    if (ev.key === null || ev.key === CLAVE_SESION) emitir("sesion", { fuera: true });
    if (ev.key === null || ev.key === CLAVE_DESCANSO) emitir("descanso", { fuera: true });
  });
}
