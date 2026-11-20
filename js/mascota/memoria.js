// La memoria de la mascota (D-133): su ficha, en una clave suya, aparte de tus datos (la app normal no la mira, y la
// mascota nunca toca los tuyos). Hoy guarda sus ajustes (los de su página de Ajustes), cuándo nació, su semilla (de ella
// sale su carácter: caracter.js), cuándo te vio por última vez y cuántas veces la has tocado. Lo que recuerde de tus
// entrenos (la fase 2: tu forma, el bombeo de cada músculo) irá aquí también.
//
// Un dato nuevo: añadirlo en nueva() y en sanear() (con lo que vale si falta o no vale) y en guardar(). Si cambia la
// forma de uno que ya hay: subir VERSION y añadir su paso en migrar(). Una ficha de una versión más nueva (por ejemplo,
// de la beta, abierta luego con una app más vieja) se lee como está y no se pisa.

export const CLAVE = "gym-beta-mascota";
export const VERSION = 1;
export const NOMBRE_MAX = 24;
export const OPCIONES = {
  tamano: ["pequena", "normal", "grande"],
  luz: ["verde", "cian", "rosa", "ambar", "violeta"],
  entreno: ["rincon", "escondida"],
};
// «encendida: null» es lo de la app: en la beta, sí; en la normal, todavía no (D-133).
export const AJUSTES = { encendida: null, tamano: "normal", luz: "verde", entreno: "rincon", nombre: "" };

function semillaNueva() {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Math.floor(Math.random() * 2 ** 32) >>> 0;
  }
}

function nueva(ahora) {
  return { v: VERSION, nacida: ahora, semilla: semillaNueva(), ajustes: { ...AJUSTES }, vista: null, toques: 0, reparada: true };
}

// Solo lo que vale de unos ajustes (lo demás se ignora).
export function limpiarAjustes(a = {}) {
  const r = {};
  if (!a || typeof a !== "object") return r;
  if ("encendida" in a) r.encendida = a.encendida == null ? null : Boolean(a.encendida);
  for (const [k, valores] of Object.entries(OPCIONES)) if (valores.includes(a[k])) r[k] = a[k];
  if (typeof a.nombre === "string") r.nombre = a.nombre.replace(/\s+/g, " ").trim().slice(0, NOMBRE_MAX);
  return r;
}

const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function migrar(c) {
  // v1 es la primera: nada que migrar todavía.
  return c;
}

function sanear(c, ahora) {
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  if (Number(c.v) > VERSION) return { ...c, masNueva: true };
  const f = migrar(c);
  const semillaBien = Number.isInteger(f.semilla) && f.semilla >= 0 && f.semilla < 2 ** 32;
  const nacida = numero(f.nacida);
  return {
    v: VERSION,
    nacida: nacida ?? ahora,
    semilla: semillaBien ? f.semilla : semillaNueva(),
    ajustes: { ...AJUSTES, ...limpiarAjustes(f.ajustes) },
    vista: numero(f.vista),
    toques: Number.isInteger(f.toques) && f.toques >= 0 ? f.toques : 0,
    reparada: !semillaBien || nacida == null || Number(c.v) !== VERSION,
  };
}

// Su ficha (si no tiene, o no vale, una nueva). Con «crear», si era nueva o se ha reparado, se guarda ya: así su
// semilla, y con ella su carácter, no cambian de una vez a otra.
export function leer({ ahora = Date.now(), crear = false } = {}) {
  let crudo = null;
  try {
    crudo = JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    crudo = null;
  }
  const f = sanear(crudo, ahora) || nueva(ahora);
  if (crear && f.reparada && !f.masNueva) guardar(f);
  return f;
}

export function guardar(f) {
  if (!f || f.masNueva) return false;
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: VERSION, nacida: f.nacida, semilla: f.semilla, ajustes: { ...AJUSTES, ...limpiarAjustes(f.ajustes) }, vista: f.vista, toques: f.toques,
    }));
    f.reparada = false;
    return true;
  } catch {
    return false; // sin sitio en el navegador: sigue igual, sin recordarlo (tus datos van antes)
  }
}

export function cambiarAjustes(cambios, { ahora = Date.now() } = {}) {
  const f = leer({ ahora });
  if (f.masNueva) return f;
  f.ajustes = { ...f.ajustes, ...limpiarAjustes(cambios) };
  guardar(f);
  return f;
}

// Apunta algo que le pasa: «cambios» recibe la ficha y la cambia (cuándo te vio, un toque más…).
export function anotar(cambios, { ahora = Date.now() } = {}) {
  const f = leer({ ahora });
  if (f.masNueva) return f;
  cambios(f);
  guardar(f);
  return f;
}

export function encendida(f = leer(), { beta = false } = {}) {
  const e = f?.ajustes?.encendida;
  return e == null ? Boolean(beta) : Boolean(e);
}
