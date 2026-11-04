// Copia de los datos de la versión normal. La normal guarda en «gym-routine-data-v1» un diff contra
// data/*.json; aquí se reproduce su fusión (getMergedRoutine + buildSnapshot de app.js) como una
// función pura y se pasa al modelo de la beta. La clave de la normal solo se LEE: nunca se escribe.

import { ESQUEMA, AJUSTES_POR_DEFECTO, AJUSTES_NORMAL, LIMITES, normalizarImagen, normalizarMarca, normalizarSeries,
  deducirTipo, deducirDiasSemana, leerMinutosCambio, normalizarEjercicio, nombreDia, TIPOS } from "./modelo.js";
import { leerDescanso, leerSegundos, leerNumero, formatoDescanso, recortar, formatoNumero } from "./util.js";

export const CLAVE_NORMAL = "gym-routine-data-v1";
export const CLAVE_TEMA_NORMAL = "gym-theme-v1";

export const TEXTO_SIN_RED = "No se ha podido leer la rutina publicada. Comprueba la conexión y vuelve a intentarlo.";
export const TEXTO_NORMAL_ILEGIBLE = "No se han podido leer los datos de la versión normal; se usa la rutina publicada.";

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// --- La fusión de la normal, copiada de su app.js (getMergedRoutine, migrateSettingsShape y buildSnapshot) ---

const DEFAULT_TRANSITION_MINUTES = 2;

// Devuelve {settings, days} exactamente como el buildSnapshot() de la normal (sin gymApp, version ni exportedAt).
// Las formas que la normal completa con ensureLocalShape() se completan aquí en una copia, nunca en la clave.
export function fusionarComoLaNormal(customEntrada, base, ejerciciosBase) {
  const custom = structuredClone(esObjeto(customEntrada) ? customEntrada : {});
  // ensureLocalShape()
  custom.exercises ||= {};
  custom.days ||= {};
  custom.daysAdded ||= [];
  custom.daysRemoved ||= [];
  custom.dayOrder ||= [];
  for (const exercise of ejerciciosBase) {
    custom.exercises[exercise.id] ||= {};
  }
  // migrateSettingsShape()
  {
    const settings = custom.settings;
    if (settings && settings.transitionMinutes === undefined && settings.includeTransitionTime !== undefined) {
      settings.transitionMinutes = settings.includeTransitionTime ? DEFAULT_TRANSITION_MINUTES : 0;
      delete settings.includeTransitionTime;
    }
  }
  // bindTimerSettings()
  custom.settings ||= { timerAlert: true, timerSound: true, timerNotification: true, transitionMinutes: DEFAULT_TRANSITION_MINUTES };

  // getMergedRoutine()
  const baseDays = base.days.filter((day) => !(custom.daysRemoved || []).includes(day.id));
  const addedDays = (custom.daysAdded || []).map((day) => ({
    ...day,
    exercises: day.exercises || [],
  }));
  const allDays = [...baseDays, ...addedDays];
  const days = allDays.map((day) => {
    const dayCustom = custom.days[day.id] || {};
    const removed = new Set(dayCustom.removed || []);
    const orderMap = dayCustom.order || {};
    const savedExerciseOrder = dayCustom.exerciseOrder || [];
    const exerciseRank = new Map(savedExerciseOrder.map((id, index) => [id, index]));
    const overrides = dayCustom.exercises || {};
    const added = dayCustom.addedExercises || [];
    const exercises = (day.exercises || [])
      .filter((entry) => !removed.has(entry.exerciseId))
      .map((entry, index) => {
        const baseExercise = ejerciciosBase.find((e) => e.id === entry.exerciseId);
        const localExercise = custom.exercises[entry.exerciseId] || {};
        const entryOverride = overrides[entry.exerciseId] || {};
        return {
          ...entry,
          ...entryOverride,
          order: exerciseRank.has(entry.exerciseId) ? exerciseRank.get(entry.exerciseId) : (orderMap[entry.exerciseId] ?? index),
          exercise: { ...baseExercise, ...localExercise },
        };
      })
      .concat(
        added.map((entry, index) => {
          const entryOverride = overrides[entry.exerciseId] || {};
          return {
            ...entry,
            ...entryOverride,
            order: exerciseRank.has(entry.exerciseId) ? exerciseRank.get(entry.exerciseId) : (orderMap[entry.exerciseId] ?? (1000 + index)),
            exercise: { ...(custom.exercises[entry.exerciseId] || {}), id: entry.exerciseId },
          };
        })
      )
      .sort((a, b) => a.order - b.order);
    return { ...day, ...dayCustom, exercises };
  });
  const savedOrder = custom.dayOrder || [];
  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  days.sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : savedOrder.length + allDays.findIndex((day) => day.id === a.id);
    const bRank = rank.has(b.id) ? rank.get(b.id) : savedOrder.length + allDays.findIndex((day) => day.id === b.id);
    return aRank - bRank;
  });

  // buildSnapshot()
  return {
    settings: { ...(custom.settings || {}) },
    days: days.map((day) => ({
      id: day.id,
      label: day.label,
      title: day.title,
      subtitle: day.subtitle,
      exercises: day.exercises.map((entry) => ({
        exerciseId: entry.exerciseId,
        name: entry.exercise?.name ?? "",
        image: entry.exercise?.image ?? "",
        muscleGroup: entry.exercise?.muscleGroup ?? "",
        pr: entry.exercise?.pr ?? null,
        series: entry.series,
        reps: entry.reps,
        rest: entry.rest,
      })),
    })),
  };
}

// --- Lectura de la clave de la normal (sin escribirla nunca) ---

// Deja como vacío lo que tenga un tipo que haría fallar la fusión, con su aviso. Sirve para la clave de la normal
// y para las copias antiguas (diff) que se cargan en Ajustes.
export function sanear(v, avisos, de = "de la versión normal") {
  const c = structuredClone(v);
  const forma = [["exercises", esObjeto], ["days", esObjeto], ["settings", esObjeto],
    ["daysAdded", Array.isArray], ["daysRemoved", Array.isArray], ["dayOrder", Array.isArray]];
  for (const [campo, valido] of forma) {
    if (c[campo] !== undefined && c[campo] !== null && !valido(c[campo])) {
      delete c[campo];
      avisos.push(`Un dato ${de} («${campo}») tenía una forma rara y no se usa.`);
    }
  }
  if (Array.isArray(c.daysAdded)) {
    const antes = c.daysAdded.length;
    c.daysAdded = c.daysAdded.filter((d) => esObjeto(d) && typeof d.id === "string" && (d.exercises === undefined || Array.isArray(d.exercises)));
    if (c.daysAdded.length !== antes) avisos.push(`Un día añadido ${de} tenía datos raros y no se usa.`);
  }
  if (esObjeto(c.days)) {
    for (const [id, dia] of Object.entries(c.days)) {
      if (!esObjeto(dia)) { delete c.days[id]; continue; }
      for (const [campo, valido] of [["removed", Array.isArray], ["exerciseOrder", Array.isArray], ["addedExercises", Array.isArray],
        ["order", esObjeto], ["exercises", esObjeto]]) {
        if (dia[campo] !== undefined && dia[campo] !== null && !valido(dia[campo])) {
          delete dia[campo];
          avisos.push(`Un dato del día ${id} ${de} tenía una forma rara y no se usa.`);
        }
      }
      if (Array.isArray(dia.addedExercises)) dia.addedExercises = dia.addedExercises.filter((e) => esObjeto(e) && typeof e.exerciseId === "string");
    }
  }
  return c;
}

// El tema que se ve en la normal: claro solo si se eligió «light»; si no (también si nunca se eligió), oscuro,
// que es el de la normal por defecto. «Automático» se elige luego en Ajustes.
export function leerTemaNormal() {
  let t = null;
  try { t = localStorage.getItem(CLAVE_TEMA_NORMAL); } catch { /* sin acceso: el de la normal por defecto */ }
  return t === "light" ? "claro" : "oscuro";
}

// Huella del texto de la clave de la normal (FNV-1a de 32 bits y la longitud). Sirve para notar que la normal ha
// cambiado desde la última copia sin guardar sus datos en la beta. La clave solo se lee.
export function huellaTexto(texto) {
  if (texto == null) return "vacia";
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${texto.length}-${h.toString(16)}`;
}

export function huellaNormal() {
  let texto = null;
  try { texto = localStorage.getItem(CLAVE_NORMAL); } catch { /* sin acceso: como vacía */ }
  return huellaTexto(texto);
}

// Lee la clave de la normal. Devuelve {custom, tipo: "normal" | "base", avisos, tema}.
export function leerNormal() {
  const avisos = [];
  let texto = null;
  try { texto = localStorage.getItem(CLAVE_NORMAL); } catch { /* sin acceso: rutina publicada */ }
  let custom = {};
  let tipo = "base";
  if (texto != null && texto !== "null") {
    try {
      const v = JSON.parse(texto);
      if (esObjeto(v)) {
        custom = sanear(v, avisos);
        tipo = "normal";
      } else {
        avisos.push(TEXTO_NORMAL_ILEGIBLE);
      }
    } catch {
      avisos.push(TEXTO_NORMAL_ILEGIBLE);
    }
  }
  return { custom, tipo, avisos, tema: leerTemaNormal() };
}

// La rutina publicada (data/*.json), con la ruta relativa a este módulo: vale en local y publicada.
export async function cargarBase() {
  const leer = async (ruta) => {
    const r = await fetch(new URL(ruta, import.meta.url), { cache: "no-cache" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const [rutina, ejercicios] = await Promise.all([leer("../../data/routine.json"), leer("../../data/exercises.json")]);
  if (!esObjeto(rutina) || !Array.isArray(rutina.days) || !Array.isArray(ejercicios)) throw new Error("La rutina publicada tiene una forma rara.");
  return { rutina, ejercicios };
}

// La rutina publicada, leída una sola vez por arranque: para comparar con la normal sin pedirla en cada pantalla.
let baseGuardada = null;
export function cargarBaseGuardada() {
  if (!baseGuardada) {
    baseGuardada = cargarBase();
    baseGuardada.catch(() => { baseGuardada = null; });
  }
  return baseGuardada.then((b) => structuredClone(b));
}

// --- Del formato de exportar ({settings, days}) a los datos de la beta ---

const nombreEntrada = (e) => recortar(e?.name, 40) || e?.exerciseId || "Ejercicio";

// Normaliza un snapshot y crea los datos de la beta. Sirve para copiar de la normal y para importar.
// opciones: origen ("normal" | "base" | "importado"), ahoraMs, ejerciciosBase (lista de data/exercises.json o null),
// tema, modo ("copia" | "importar"), diasBase (días de reserva si no queda ninguno al copiar), extras (ejercicios
// fuera de los días que también van a la biblioteca), bibliotecaActual (al importar: conserva tipo, incremento y notas)
// y avisosPrevios.
export function datosDesdeSnapshot(snap, opciones = {}) {
  const {
    origen = "normal", ahoraMs = Date.now(), ejerciciosBase = null, tema = "auto", modo = "copia",
    diasBase = null, extras = [], bibliotecaActual = null, avisosPrevios = [],
  } = opciones;
  const avisos = [...avisosPrevios];
  const baseMap = new Map((ejerciciosBase || []).map((e) => [e.id, e]));
  let fuente = Array.isArray(snap?.days) ? snap.days : [];
  // Recorta un texto a su límite y, si se ha cortado algo, lo dice (nada se recorta en silencio).
  const texto = (valor, max, donde) => {
    const t = recortar(valor, max);
    if (valor != null && String(valor).trim().length > max) avisos.push(`${donde}: se ha recortado a ${max} letras.`);
    return t;
  };

  const construir = (listaDias) => {
    const dias = [];
    const acumulado = new Map();
    const vistos = new Set();
    for (const dia of listaDias) {
      if (!esObjeto(dia) || typeof dia.id !== "string" || !dia.id.trim()) {
        avisos.push("Se ha saltado un día sin identificador.");
        continue;
      }
      if (vistos.has(dia.id)) {
        avisos.push(`Se ha saltado un día repetido (${dia.id}).`);
        continue;
      }
      if (dias.length >= LIMITES.dias) {
        avisos.push(`Solo caben ${LIMITES.dias} días: se ha saltado ${recortar(dia.label, 20) || dia.id}.`);
        continue;
      }
      vistos.add(dia.id);
      const label = texto(dia.label, LIMITES.label, `El nombre del día ${recortar(dia.label, 20) || dia.id}`) || `Día ${dias.length + 1}`;
      const entradas = [];
      for (const e of Array.isArray(dia.exercises) ? dia.exercises : []) {
        if (!esObjeto(e) || typeof e.exerciseId !== "string" || !e.exerciseId.trim()) {
          avisos.push(`${label}: se ha saltado un ejercicio sin identificador.`);
          continue;
        }
        const id = e.exerciseId;
        const donde = `${label} · ${nombreEntrada(e)}`;
        if (entradas.some((x) => x.exerciseId === id)) {
          avisos.push(`${donde}: estaba repetido en el día; se queda una vez.`);
          continue;
        }
        if (entradas.length >= LIMITES.ejerciciosPorDia) {
          avisos.push(`${donde}: solo caben ${LIMITES.ejerciciosPorDia} ejercicios por día.`);
          continue;
        }
        let series = normalizarSeries(e.series);
        if (series == null) {
          const n = leerNumero(e.series);
          // Por encima del máximo se ajusta al máximo; lo que no se entiende (o 0) pasa a 3.
          series = n != null && Number.isInteger(n) && n > LIMITES.seriesMax ? LIMITES.seriesMax : 3;
          avisos.push(`${donde}: series «${e.series ?? ""}» → ${series}.`);
        }
        let reps = texto(e.reps, LIMITES.reps, `${donde} (repeticiones)`);
        if (!reps) {
          reps = "8-12";
          avisos.push(`${donde}: repeticiones vacías → 8-12.`);
        }
        const segundos = leerDescanso(e.rest);
        let rest;
        if (segundos == null) {
          const largos = leerSegundos(e.rest);
          rest = largos != null && largos > LIMITES.descansoMax ? formatoDescanso(LIMITES.descansoMax) : "1:30";
          avisos.push(`${donde}: descanso «${e.rest ?? ""}» → ${rest}.`);
        } else {
          rest = formatoDescanso(segundos);
          if (String(e.rest).trim() !== rest) avisos.push(`${donde}: descanso «${e.rest}» → ${rest}.`);
        }
        entradas.push({ exerciseId: id, series, reps, rest });
        let a = acumulado.get(id);
        if (!a) {
          a = { name: "", image: "", muscleGroup: "", marcas: [], reps: [] };
          acumulado.set(id, a);
        }
        if (!a.name) a.name = texto(e.name, LIMITES.nombre, `${donde} (nombre)`);
        if (!a.image) a.image = normalizarImagen(e.image);
        if (!a.muscleGroup) a.muscleGroup = texto(e.muscleGroup, LIMITES.grupo, `${donde} (grupo)`);
        const pr = normalizarMarca(e.pr);
        if (pr != null) a.marcas.push(pr);
        a.reps.push(reps);
      }
      dias.push({
        id: dia.id,
        label,
        title: texto(dia.title, LIMITES.title, `${label} (título)`),
        subtitle: texto(dia.subtitle, LIMITES.subtitle, `${label} (nota)`),
        diasSemana: deducirDiasSemana(dia.id, label),
        ejercicios: entradas,
      });
    }
    return { dias, acumulado };
  };

  let { dias, acumulado } = construir(fuente);
  if (dias.length === 0) {
    if (modo === "importar") throw Object.assign(new Error("La copia no trae ningún día."), { paraLaPersona: true });
    if (diasBase) {
      avisos.push("La versión normal no tenía ningún día: se usa la rutina publicada.");
      ({ dias, acumulado } = construir(diasBase));
    }
  }

  // Biblioteca: lo común a todos los días, por exerciseId.
  const ejercicios = {};
  for (const [id, a] of acumulado) {
    const distintas = [...new Set(a.marcas)];
    const pr = distintas.length ? Math.max(...distintas) : null;
    if (distintas.length > 1) {
      avisos.push(`${a.name || id}: tenía marcas distintas en días distintos (${distintas.map(formatoNumero).join(" y ")} kg); se queda la mayor.`);
    }
    const previo = bibliotecaActual?.[id];
    const tipo = previo && TIPOS.includes(previo.tipo)
      ? previo.tipo
      : deducirTipo({ reps: a.reps, pr, prBase: baseMap.get(id)?.pr, conoceBase: Boolean(ejerciciosBase) });
    ejercicios[id] = normalizarEjercicio({
      id,
      name: a.name || "Ejercicio sin nombre",
      image: a.image,
      muscleGroup: a.muscleGroup,
      pr,
      tipo,
      incremento: previo?.incremento ?? 2.5,
      notas: previo?.notas ?? "",
    });
  }
  for (const x of extras) {
    if (!x || typeof x.id !== "string" || ejercicios[x.id]) continue;
    const pr = normalizarMarca(x.pr);
    const previo = bibliotecaActual?.[x.id];
    ejercicios[x.id] = normalizarEjercicio({
      id: x.id, name: x.name, image: x.image, muscleGroup: x.muscleGroup, pr,
      tipo: previo?.tipo ?? deducirTipo({ reps: [], pr, prBase: baseMap.get(x.id)?.pr, conoceBase: Boolean(ejerciciosBase) }),
      incremento: previo?.incremento ?? 2.5,
      notas: previo?.notas ?? "",
    });
  }

  const s = esObjeto(snap?.settings) ? snap.settings : {};
  const ajustes = {
    ...AJUSTES_POR_DEFECTO,
    timerAlert: s.timerAlert !== false,
    timerSound: s.timerSound !== false,
    timerNotification: s.timerNotification !== false,
    transitionMinutes: leerMinutosCambio(s.transitionMinutes, s.includeTransitionTime),
    tema,
  };

  const motivo = modo === "importar" ? "importada" : "copia";
  const marcas = Object.values(ejercicios).filter((x) => x.pr != null)
    .map((x) => ({ exerciseId: x.id, kg: x.pr, fecha: ahoraMs, motivo }));

  const distintos = new Set(dias.flatMap((d) => d.ejercicios.map((e) => e.exerciseId)));
  const datos = {
    esquema: ESQUEMA,
    rev: 0,
    creado: ahoraMs,
    actualizado: ahoraMs,
    origen: { tipo: origen, fecha: ahoraMs, avisos },
    ajustes,
    ejercicios,
    dias,
    sesiones: [],
    marcas,
    copia: { ultima: null, metodo: null },
    apuntes: [],
    descartado: [],
  };
  const resumen = {
    dias: dias.length,
    entradas: dias.reduce((n, d) => n + d.ejercicios.length, 0),
    distintos: distintos.size,
    marcas: [...distintos].filter((id) => ejercicios[id]?.pr != null).length,
  };
  return { datos, avisos, resumen };
}

// Ejercicios de la normal que no están en ningún día (los de data/exercises.json y los creados a mano):
// van a la biblioteca de la beta para poder añadirlos luego.
function extrasDeLaNormal(custom, ejerciciosBase, snap) {
  const enDias = new Set(snap.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  const locales = esObjeto(custom.exercises) ? custom.exercises : {};
  const extras = [];
  for (const b of ejerciciosBase) {
    if (!enDias.has(b.id)) extras.push({ ...b, ...(esObjeto(locales[b.id]) ? locales[b.id] : {}), id: b.id });
  }
  for (const [id, x] of Object.entries(locales)) {
    if (!enDias.has(id) && !ejerciciosBase.some((b) => b.id === id) && esObjeto(x) && x.name) extras.push({ ...x, id });
  }
  return extras;
}

// Copia completa desde la normal. Devuelve {ok: true, datos, avisos, resumen, origen} o {ok: false, error}.
export async function copiarDesdeNormal({ ahoraMs = Date.now(), cargar = cargarBase } = {}) {
  const normal = leerNormal();
  let base;
  try {
    base = await cargar();
  } catch {
    return { ok: false, error: TEXTO_SIN_RED };
  }
  const avisos = [...normal.avisos];
  let snap;
  let tipo = normal.tipo;
  try {
    snap = fusionarComoLaNormal(normal.custom, base.rutina, base.ejercicios);
  } catch {
    avisos.push(TEXTO_NORMAL_ILEGIBLE);
    tipo = "base";
    snap = fusionarComoLaNormal({}, base.rutina, base.ejercicios);
  }
  const diasBase = fusionarComoLaNormal({}, base.rutina, base.ejercicios).days;
  const r = datosDesdeSnapshot(snap, {
    origen: tipo, ahoraMs, ejerciciosBase: base.ejercicios, tema: normal.tema, modo: "copia",
    diasBase, extras: extrasDeLaNormal(normal.custom, base.ejercicios, snap), avisosPrevios: avisos,
  });
  return { ok: true, ...r, origen: tipo, base, huella: huellaNormal() };
}

// «Volver a copiar desde la versión normal»: cambia la rutina, las marcas y los cuatro ajustes de la normal,
// y conserva el historial, los apuntes, la copia y lo propio de la beta (tipo, incremento, notas, tema…).
// Con {quedarseMaxima: true}, cada marca se queda con la más alta de las dos (la de la beta o la de la normal).
export function aplicarRecopia(actuales, nuevos, ahoraMs, { quedarseMaxima = false } = {}) {
  const d = structuredClone(actuales);
  d.dias = structuredClone(nuevos.dias);
  for (const [id, x] of Object.entries(nuevos.ejercicios)) {
    const previo = d.ejercicios[id];
    const antes = previo?.pr ?? null;
    let pr = x.pr ?? null;
    if (quedarseMaxima && antes != null && (pr == null || antes > pr)) pr = antes;
    d.ejercicios[id] = previo
      ? { ...previo, name: x.name, image: x.image, muscleGroup: x.muscleGroup, pr }
      : { ...structuredClone(x), pr };
    if (pr !== antes) d.marcas.push({ exerciseId: id, kg: pr, fecha: ahoraMs, motivo: "copia" });
  }
  for (const k of AJUSTES_NORMAL) d.ajustes[k] = nuevos.ajustes[k];
  d.origen = { tipo: nuevos.origen.tipo, fecha: ahoraMs, avisos: nuevos.origen.avisos };
  return d;
}

// Las marcas que bajarían en la beta al volver a copiar desde la normal (la de la normal es menor o no hay).
export function marcasQueBajan(actuales, nuevos) {
  const lista = [];
  for (const [id, x] of Object.entries(nuevos.ejercicios)) {
    const antes = actuales.ejercicios[id]?.pr ?? null;
    const despues = x.pr ?? null;
    if (antes != null && (despues == null || despues < antes)) lista.push({ id, nombre: x.name, de: antes, a: despues });
  }
  return lista;
}

const planTexto = (e) => `${e.series} × ${e.reps} · ${e.rest}`;

// Qué cambia entre la beta y la normal: marcas, días que solo están en una, ejercicios añadidos o quitados de
// cada día y series, repeticiones o descanso distintos. Sirve para «Ver qué cambia».
export function compararConNormal(beta, normal) {
  const r = { marcas: [], soloNormal: [], soloBeta: [], ejercicios: [], plan: [] };
  const ids = new Set([...beta.dias, ...normal.dias].flatMap((d) => d.ejercicios.map((e) => e.exerciseId)));
  for (const id of ids) {
    const a = beta.ejercicios[id]?.pr ?? null;
    const b = normal.ejercicios[id]?.pr ?? null;
    if (a !== b && (beta.ejercicios[id] || normal.ejercicios[id])) {
      r.marcas.push({ id, nombre: (beta.ejercicios[id] || normal.ejercicios[id]).name, beta: a, normal: b });
    }
  }
  for (const d of normal.dias) if (!beta.dias.some((x) => x.id === d.id)) r.soloNormal.push(nombreDia(d));
  for (const d of beta.dias) if (!normal.dias.some((x) => x.id === d.id)) r.soloBeta.push(nombreDia(d));
  for (const dn of normal.dias) {
    const db = beta.dias.find((x) => x.id === dn.id);
    if (!db) continue;
    const nombre = (id) => (normal.ejercicios[id] || beta.ejercicios[id])?.name || id;
    const enB = new Set(db.ejercicios.map((e) => e.exerciseId));
    const enN = new Set(dn.ejercicios.map((e) => e.exerciseId));
    const soloN = [...enN].filter((id) => !enB.has(id)).map(nombre);
    const soloB = [...enB].filter((id) => !enN.has(id)).map(nombre);
    if (soloN.length || soloB.length) r.ejercicios.push({ dia: dn.label, soloNormal: soloN, soloBeta: soloB });
    for (const en of dn.ejercicios) {
      const eb = db.ejercicios.find((e) => e.exerciseId === en.exerciseId);
      if (eb && planTexto(eb) !== planTexto(en)) r.plan.push({ dia: dn.label, nombre: nombre(en.exerciseId), beta: planTexto(eb), normal: planTexto(en) });
    }
  }
  r.total = r.marcas.length + r.soloNormal.length + r.soloBeta.length + r.ejercicios.length + r.plan.length;
  return r;
}

// Qué pasaría en la normal si se carga en ella una copia de la beta: las marcas de la normal que bajarían y los
// ejercicios sin marca en la beta que en la normal saldrían con la marca publicada (la normal no guarda «sin marca»).
export function efectoEnLaNormal(beta, normal, ejerciciosBase) {
  const publicada = new Map((ejerciciosBase || []).map((e) => [e.id, normalizarMarca(e.pr)]));
  const bajan = [];
  const publicadas = [];
  const ids = new Set(beta.dias.flatMap((d) => d.ejercicios.map((e) => e.exerciseId)));
  for (const id of ids) {
    const x = beta.ejercicios[id];
    if (!x || x.tipo !== "peso") continue;
    const resultado = x.pr ?? publicada.get(id) ?? null;
    const actual = normal?.ejercicios?.[id]?.pr ?? null;
    if (x.pr == null && publicada.get(id) != null) publicadas.push({ id, nombre: x.name, kg: publicada.get(id) });
    if (actual != null && (resultado == null || resultado < actual)) bajan.push({ id, nombre: x.name, de: actual, a: resultado });
  }
  return { bajan, publicadas };
}

// «Volver a la rutina publicada»: los días y ejercicios de data/*.json, conservando las marcas, el historial
// y lo propio de cada ejercicio (tipo, incremento y notas).
export function aplicarRutinaPublicada(actuales, base, ahoraMs) {
  const snap = fusionarComoLaNormal({}, base.rutina, base.ejercicios);
  const { datos: publicados } = datosDesdeSnapshot(snap, { origen: "base", ahoraMs, ejerciciosBase: base.ejercicios, modo: "copia" });
  const d = structuredClone(actuales);
  d.dias = publicados.dias;
  for (const [id, x] of Object.entries(publicados.ejercicios)) {
    const previo = d.ejercicios[id];
    d.ejercicios[id] = previo ? { ...previo, name: x.name, image: x.image, muscleGroup: x.muscleGroup } : { ...x, pr: null };
  }
  return d;
}
