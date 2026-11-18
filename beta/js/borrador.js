// El borrador de la rutina (desde la 1.2.0: D-123). En Rutina nada se guarda al momento: lo que se cambia (los días,
// sus ejercicios y su orden, y la hoja de un ejercicio abierta desde Rutina) va aquí, con la copia de la rutina de
// cuando se empezó a cambiar («base») y la que se va cambiando («datos»). «Guardar» lo pasa a los datos de verdad de
// una vez; «Cancelar» lo tira. Vive en gym-beta-borrador (siempre por almacen.js), así que aguanta que el móvil cierre la
// app a mitad. Sin interfaz: la pone js/ui/rutina.js. Entreno usa siempre lo guardado.

import * as almacen from "./almacen.js";
import { CLAVE_BORRADOR } from "./almacen.js";
import * as S from "./sesion.js";
import { ESQUEMA, validarDatos } from "./modelo.js";
import { ahora } from "./util.js";

// Los campos de un ejercicio de la biblioteca (los mismos en todos los días que lo tienen).
const CAMPOS = ["name", "image", "muscleGroup", "pr", "tipo", "incremento", "notas"];

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const esRutina = (r) => esObjeto(r) && Array.isArray(r.dias) && esObjeto(r.ejercicios);
const rutinaDe = (d) => ({ dias: structuredClone(d.dias), ejercicios: structuredClone(d.ejercicios) });

// Igualdad de datos como JSON: las listas, en orden; los objetos, sin mirar el orden de sus claves.
export function iguales(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => iguales(x, b[i]));
  }
  if (!esObjeto(a) || !esObjeto(b)) return false;
  const ka = Object.keys(a).filter((k) => a[k] !== undefined);
  const kb = Object.keys(b).filter((k) => b[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => iguales(a[k], b[k]));
}

function valido(b) {
  return esObjeto(b) && b.esquema === ESQUEMA && esRutina(b.base) && esRutina(b.datos) && validarDatos({ esquema: ESQUEMA, ...b.datos }).ok;
}

// --- Leer y escribir ---

let cache = { texto: undefined, valor: null };

// El borrador guardado ({esquema, creado, n, base, datos}) o null (no hay, o no se entiende). Lo que devuelve es el de
// la caché: no se toca.
function leer() {
  const texto = almacen.leer(CLAVE_BORRADOR);
  if (texto !== cache.texto) {
    let valor = null;
    if (texto != null) {
      try {
        const b = JSON.parse(texto);
        if (valido(b)) valor = b;
      } catch {
        valor = null;
      }
    }
    cache = { texto, valor };
  }
  return cache.valor;
}

// Lo escribe (o lo quita, con null). false si no se pudo (almacenamiento lleno: almacen.js ya lo avisa).
function poner(b) {
  if (b == null) {
    almacen.borrar(CLAVE_BORRADOR);
    return true;
  }
  return almacen.escribir(CLAVE_BORRADOR, JSON.stringify(b));
}

const oyentes = new Set();

// Avisa de cada cambio del borrador hecho en esta ventana (app.js: quitar el «Deshacer» de antes y la barra).
export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

function avisarCambio() {
  for (const fn of oyentes) {
    try {
      fn();
    } catch (err) {
      console.error(err);
    }
  }
}

// deshacer() de un cambio: vuelve a dejar el borrador como estaba antes («textoAntes»), solo si nadie lo ha cambiado
// después (si no, no toca nada y devuelve false, como almacen.mutar).
function deshacerHasta(textoAntes) {
  const textoTras = almacen.leer(CLAVE_BORRADOR);
  return () => {
    if (almacen.leer(CLAVE_BORRADOR) !== textoTras) return false;
    if (textoAntes == null) almacen.borrar(CLAVE_BORRADOR);
    else if (!almacen.escribir(CLAVE_BORRADOR, textoAntes)) return false;
    avisarCambio();
    return true;
  };
}

// --- Lo que usa Rutina ---

// ¿Hay cambios sin guardar? (Un borrador que vuelve a quedar como su base se quita solo: hay borrador = hay cambios.)
export function hay() {
  return leer() != null;
}

// Los ejercicios de verdad con lo que el borrador cambió respecto a su base, campo a campo; los que solo tiene el
// borrador (creados en él), enteros. Devuelve una copia.
export function mezclarEjercicios(base, real, borr) {
  const r = structuredClone(real);
  for (const [id, x] of Object.entries(borr)) {
    const antes = base[id];
    if (!r[id] || !antes) {
      r[id] = structuredClone(x);
      continue;
    }
    for (const campo of CAMPOS) if (!iguales(x[campo], antes[campo])) r[id][campo] = x[campo];
  }
  return r;
}

// Lo que pinta Rutina: los datos de verdad con los días del borrador y, en la biblioteca, lo cambiado en el borrador
// encima de lo de verdad (así se ve, por ejemplo, una marca nueva de un entreno hecho mientras tanto). Una copia.
export function vista() {
  const real = almacen.datos();
  const b = leer();
  if (!b || !real) return real;
  return { ...real, dias: structuredClone(b.datos.dias), ejercicios: mezclarEjercicios(b.base.ejercicios, real.ejercicios, b.datos.ejercicios) };
}

// Cambia el borrador (si no hay, lo empieza con la rutina guardada). fn recibe {dias, ejercicios} y lo cambia (o
// devuelve otro). Si no cambia nada, no se toca; si vuelve a quedar como su base, el borrador se quita. Devuelve
// deshacer(), que lo deja como estaba (solo si nadie lo ha cambiado después; si no, devuelve false).
export function cambiar(fn) {
  const textoAntes = almacen.leer(CLAVE_BORRADOR);
  const previo = leer();
  const real = almacen.datos();
  const b = previo ? structuredClone(previo) : { esquema: ESQUEMA, creado: ahora(), n: 0, base: rutinaDe(real), datos: rutinaDe(real) };
  const r = fn(b.datos);
  if (esRutina(r)) b.datos = { dias: r.dias, ejercicios: r.ejercicios };
  if (iguales(b.datos, previo ? previo.datos : b.base)) return () => false;
  b.n += 1; // así cada cambio deja un texto distinto (el «deshacer» lo usa para saber si hubo otro después)
  if (!poner(iguales(b.datos, b.base) ? null : b)) return () => false;
  avisarCambio();
  return deshacerHasta(textoAntes);
}

// Tira el borrador («Cancelar»). Devuelve deshacer(), que lo vuelve a poner si no se ha empezado otro.
export function descartar() {
  const textoAntes = almacen.leer(CLAVE_BORRADOR);
  if (textoAntes == null) return () => false;
  almacen.borrar(CLAVE_BORRADOR);
  avisarCambio();
  return deshacerHasta(textoAntes);
}

// Qué tiene sin guardar: los días cambiados (su nombre, sus días de la semana, sus ejercicios, su orden, o algo de la
// biblioteca de un ejercicio que tienen) y si ha cambiado el orden de los días.
export function cambios() {
  const b = leer();
  if (!b) return { dias: [], orden: false };
  const base = new Map(b.base.dias.map((d) => [d.id, d]));
  const tocados = new Set(Object.keys(b.datos.ejercicios).filter((id) => !iguales(b.datos.ejercicios[id], b.base.ejercicios[id])));
  const dias = b.datos.dias
    .filter((d) => !iguales(d, base.get(d.id)) || d.ejercicios.some((e) => tocados.has(e.exerciseId)))
    .map((d) => d.id);
  const orden = !iguales(b.datos.dias.map((d) => d.id), b.base.dias.map((d) => d.id));
  return { dias, orden };
}

// «Guardar»: pasa el borrador a los datos de verdad en un solo cambio (un solo rev) y lo quita.
// - Los días, los del borrador. Si los de verdad han cambiado desde que se empezó (otra ventana, una copia cargada, la
//   hoja de un ejercicio abierta desde Entreno), no se pisan sin {pisar: true}: devuelve {ok: false, motivo: "cambiada"}.
// - Los ejercicios, campo a campo: lo cambiado en el borrador, encima de lo de verdad (lo que cambió fuera y el borrador
//   no tocó, como la marca de un entreno, se queda); los nuevos, enteros. La marca cambiada, con su entrada en el
//   historial de marcas (S.cambiarMarca, como al cambiarla a mano).
// Devuelve {ok: true} o {ok: false, motivo: "cambiada" | "bloqueado"} (otra ventana tiene datos de una versión más nueva).
export function guardar({ pisar = false } = {}) {
  const b = leer();
  if (!b) return { ok: true };
  almacen.sincronizar();
  if (almacen.bloqueado()) return { ok: false, motivo: "bloqueado" };
  if (!pisar && !iguales(almacen.datos().dias, b.base.dias)) return { ok: false, motivo: "cambiada" };
  const t = ahora();
  almacen.mutar((d) => {
    let r = d;
    const marcas = [];
    for (const [id, x] of Object.entries(b.datos.ejercicios)) {
      const antes = b.base.ejercicios[id];
      const actual = r.ejercicios[id];
      if (!actual || !antes) {
        // Creado en el borrador (o ya no está en los de verdad): entero, y su marca, como un cambio de marca.
        r.ejercicios[id] = { ...structuredClone(x), pr: actual?.pr ?? null };
        if ((x.pr ?? null) !== (actual?.pr ?? null)) marcas.push([id, x.pr ?? null]);
        continue;
      }
      for (const campo of CAMPOS) {
        if (campo !== "pr" && !iguales(x[campo], antes[campo])) actual[campo] = x[campo];
      }
      if (!iguales(x.pr, antes.pr) && (x.pr ?? null) !== (actual.pr ?? null)) marcas.push([id, x.pr ?? null]);
    }
    r.dias = structuredClone(b.datos.dias);
    for (const [id, kg] of marcas) r = S.cambiarMarca(r, id, kg, t, "a-mano");
    return r;
  });
  poner(null);
  avisarCambio();
  return { ok: true };
}
