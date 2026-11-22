// La memoria de la mascota (D-133): su ficha, en una clave suya, aparte de tus datos (la app normal no la mira, y la
// mascota nunca toca los tuyos). Hoy guarda sus ajustes (los de su página de Ajustes), cuándo nació, su semilla (de ella
// sale su carácter: caracter.js), cuándo te vio por última vez y cuántas veces la has tocado. Su cuerpo no hace falta
// guardarlo: sale de tus sesiones (forma.js). Su ficha va también en tus copias («beta.mascota»: paraCopia()) y vuelve
// al cargar una (restaurar()).
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
  brillo: ["suave", "normal", "intenso"],
  sexo: ["neutro", "ella", "el"], // D-140: «Sin definir» (el de serie, también el de una ficha de antes), «Ella» o «Él»
};
// «encendida: null» es lo de la app: en la beta, sí; en la normal, todavía no (D-133).
export const AJUSTES = { encendida: null, tamano: "normal", luz: "verde", entreno: "rincon", nombre: "", brillo: "normal", sexo: "neutro" };

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
  const f = sanear(leerCrudo(), ahora) || nueva(ahora);
  if (crear && f.reparada && !f.masNueva) guardar(f);
  return f;
}

// Lo que se guarda de una ficha (y lo que va en las copias).
function aGuardar(f) {
  return { v: VERSION, nacida: f.nacida, semilla: f.semilla, ajustes: { ...AJUSTES, ...limpiarAjustes(f.ajustes) }, vista: f.vista, toques: f.toques };
}

export function guardar(f) {
  if (!f || f.masNueva) return false;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(aGuardar(f)));
    f.reparada = false;
    return true;
  } catch {
    return false; // sin sitio en el navegador: sigue igual, sin recordarlo (tus datos van antes)
  }
}

function leerCrudo() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE));
    return c && typeof c === "object" && !Array.isArray(c) ? c : null;
  } catch {
    return null;
  }
}

// Su ficha para una copia de tus datos («Exportar datos» y la copia del PC), o null si aún no tiene (nunca ha salido).
// Sin cuándo te vio: cambia cada vez que abres la app, y dos copias de los mismos datos serían distintas (el PC no
// sabría que ya la tiene). Una de una versión más nueva, tal cual.
export function paraCopia({ ahora = Date.now() } = {}) {
  const c = leerCrudo();
  if (!c) return null;
  if (Number(c.v) > VERSION) return c;
  const f = aGuardar(sanear(c, ahora));
  delete f.vista;
  return f;
}

// Al cargar una copia que la trae: su ficha pasa a ser la de la copia (si no vale, nada). Una de una versión más nueva
// se guarda tal cual (esta app la lee sin pisarla). Devuelve true si se guardó.
export function restaurar(crudo, { ahora = Date.now() } = {}) {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return false;
  if (Number(crudo.v) > VERSION) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(crudo));
      return true;
    } catch {
      return false;
    }
  }
  return guardar(sanear(crudo, ahora));
}

// Para deshacer una copia cargada cuando antes no tenía ficha: sin ficha otra vez (la próxima vez nace una nueva).
export function olvidar() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // sin almacenamiento: no había nada que olvidar
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
