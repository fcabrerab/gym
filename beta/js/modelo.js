// Modelo de datos de la beta (gym-beta-datos, esquema 1): valores por defecto, validación, reparación,
// migraciones, deducción del tipo de ejercicio y de los días de la semana, y el tiempo estimado.
// Todo son funciones puras: reciben la hora como parámetro y no tocan el almacenamiento.

import { leerDescanso, leerNumero, sinTildes, recortar, limitar, fechaValida } from "./util.js";

export const ESQUEMA = 1;

// Las cuatro primeras son las de la versión normal (mismo nombre y significado); el resto, de la beta.
export const AJUSTES_NORMAL = ["timerAlert", "timerSound", "timerNotification", "transitionMinutes"];

export const AJUSTES_POR_DEFECTO = Object.freeze({
  timerAlert: true,
  timerSound: true,
  timerNotification: true,
  transitionMinutes: 2,
  tema: "auto",
  vibracion: true,
  pantallaEncendida: true,
  descansoAlMarcar: true,
  // «Descanso con sonido (aviso más fiable)»: tic-tac de fondo con el aviso dentro (sonido.js). Apagado de serie:
  // mientras suena, Android pausa la música de otras apps.
  descansoConSonido: false,
  segundosPorSerie: 40,
  recordatorioCopiaDias: 7,
});

// Los textos tienen margen de sobra para lo que llega de la versión normal (que no pone límites): así copiar e
// importar no recortan nada en la práctica. Si algo pasa de aquí, se recorta con aviso.
export const LIMITES = Object.freeze({
  nombre: 120,
  label: 30,
  title: 80,
  subtitle: 80,
  reps: 40,
  notas: 300,
  apunte: 1000,
  grupo: 80,
  imagen: 500,
  seriesMin: 1,
  seriesMax: 10,
  descansoMax: 600,
  kgMax: 999.5,
  repsMax: 200,
  segundosMax: 600,
  incrementoMin: 0.25,
  incrementoMax: 20,
  segundosPorSerieMin: 10,
  segundosPorSerieMax: 180,
  cambioMax: 10,
  dias: 14,
  ejerciciosPorDia: 30,
  archivoBytes: 5 * 1024 * 1024,
  avisoTamano: 2 * 1024 * 1024,
  rescates: 3,
});

export const TIPOS = ["peso", "corporal", "tiempo"];
export const NOMBRE_TIPO = { peso: "Con peso", corporal: "Peso corporal", tiempo: "Por tiempo" };

// Cadena de migraciones: MIGRACIONES[n] pasa unos datos del esquema n al n+1. En el esquema 1 no hay ninguna.
export const MIGRACIONES = {};

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const esTexto = (v) => typeof v === "string";

// --- Validación de lo esencial ---

export function validarDatos(d) {
  if (!esObjeto(d)) return { ok: false, error: "No es un objeto." };
  if (typeof d.esquema !== "number" || !Number.isFinite(d.esquema)) return { ok: false, error: "Falta el número de esquema." };
  if (!Array.isArray(d.dias) || d.dias.length === 0) return { ok: false, error: "No hay ningún día." };
  if (!esObjeto(d.ejercicios)) return { ok: false, error: "Falta la biblioteca de ejercicios." };
  for (const dia of d.dias) {
    if (!esObjeto(dia) || !esTexto(dia.id) || !esTexto(dia.label) || !Array.isArray(dia.ejercicios)) {
      return { ok: false, error: "Hay un día con datos raros." };
    }
    for (const e of dia.ejercicios) {
      if (!esObjeto(e) || !esTexto(e.exerciseId) || !Number.isInteger(e.series) || !esTexto(e.reps) || !esTexto(e.rest)) {
        return { ok: false, error: `Hay un ejercicio con datos raros en ${dia.label}.` };
      }
      if (!esObjeto(d.ejercicios[e.exerciseId])) {
        return { ok: false, error: `Falta el ejercicio ${e.exerciseId} en la biblioteca.` };
      }
    }
  }
  return { ok: true };
}

// --- Normalización de piezas sueltas ---

export function normalizarAjustes(a = {}) {
  const r = { ...AJUSTES_POR_DEFECTO };
  if (!esObjeto(a)) return r;
  for (const clave of ["timerAlert", "timerSound", "timerNotification", "vibracion", "pantallaEncendida", "descansoAlMarcar", "descansoConSonido"]) {
    if (typeof a[clave] === "boolean") r[clave] = a[clave];
  }
  r.transitionMinutes = leerMinutosCambio(a.transitionMinutes, a.includeTransitionTime);
  if (["auto", "claro", "oscuro"].includes(a.tema)) r.tema = a.tema;
  const sps = leerNumero(a.segundosPorSerie);
  if (sps != null) r.segundosPorSerie = limitar(Math.round(sps), LIMITES.segundosPorSerieMin, LIMITES.segundosPorSerieMax);
  const dias = leerNumero(a.recordatorioCopiaDias);
  if (dias != null) r.recordatorioCopiaDias = limitar(Math.round(dias), 1, 60);
  return r;
}

// Minutos por cambio de ejercicio, como la normal: vacío da 2; lo demás, max(0, número), hasta 10.
// La forma antigua (includeTransitionTime) se migra igual que en la normal: true da 2 y false da 0.
export function leerMinutosCambio(valor, antiguo) {
  if (valor === undefined && typeof antiguo === "boolean") return antiguo ? 2 : 0;
  if (valor === undefined || valor === null || valor === "") return 2;
  const n = typeof valor === "string" ? leerNumero(valor) : Number(valor);
  return limitar(Math.max(0, Number(n) || 0), 0, LIMITES.cambioMax);
}

// La imagen solo vale si es una dirección o una ruta: «undefined», «null» o un texto cualquiera quedan vacíos.
// Una ruta relativa de la normal («images/press.png») se conserva tal cual: al pintarla se resuelve contra la
// carpeta de la normal, y al exportar vuelve igual.
export function normalizarImagen(v) {
  const t = recortar(v, LIMITES.imagen);
  if (!t || /^(undefined|null)$/i.test(t)) return "";
  if (/^(https:\/\/|http:\/\/|\/|\.\/|\.\.\/)/i.test(t)) return t;
  return /^[\w%-][\w.%/-]*\.[a-z0-9]{2,5}$/i.test(t) ? t : "";
}

// Una marca válida es un número mayor que 0 (hasta 999,5). «», 0, negativos y lo que no se entiende: null.
export function normalizarMarca(v) {
  const n = leerNumero(v);
  if (n == null || n <= 0) return null;
  return Math.min(n, LIMITES.kgMax);
}

export function normalizarSeries(v) {
  const n = leerNumero(v);
  if (n == null || !Number.isInteger(n) || n < LIMITES.seriesMin || n > LIMITES.seriesMax) return null;
  return n;
}

export function normalizarIncremento(v) {
  const n = leerNumero(v);
  if (n == null) return 2.5;
  return limitar(n, LIMITES.incrementoMin, LIMITES.incrementoMax);
}

// --- Deducciones al copiar o importar ---

const SEGUNDOS_EN_REPS = /\d\s*(s|seg|segundos)\b/i;

// «tiempo» si sus repeticiones son segundos; si no, «corporal» si no tiene marca (ni la tiene en la rutina
// publicada, cuando se conoce); si no, «peso». Así una prensa con la marca vaciada sigue siendo con peso.
export function deducirTipo({ reps = [], pr = null, prBase = null, conoceBase = false }) {
  if (reps.some((r) => SEGUNDOS_EN_REPS.test(String(r)))) return "tiempo";
  if (pr == null && (!conoceBase || normalizarMarca(prBase) == null)) return "corporal";
  return "peso";
}

const PREFIJOS_DIA = new Map([["sunday", 0], ["monday", 1], ["tuesday", 2], ["wednesday", 3], ["thursday", 4], ["friday", 5], ["saturday", 6]]);
const ETIQUETAS_DIA = new Map([["domingo", 0], ["lunes", 1], ["martes", 2], ["miercoles", 3], ["jueves", 4], ["viernes", 5], ["sabado", 6]]);

// Días de la semana de un día de la rutina: por el prefijo del id (tuesday-push → martes) o por su nombre.
export function deducirDiasSemana(id, label) {
  const prefijo = String(id ?? "").split("-")[0].toLowerCase();
  if (PREFIJOS_DIA.has(prefijo)) return [PREFIJOS_DIA.get(prefijo)];
  const etiqueta = sinTildes(label).trim();
  if (ETIQUETAS_DIA.has(etiqueta)) return [ETIQUETAS_DIA.get(etiqueta)];
  return [];
}

// --- Reparación de lo no esencial y migraciones ---

// Una sesión terminada con la forma que pintan Historial y las fichas: fechas de calendario de verdad, textos que
// son textos y series con números. Lo que no la cumple se aparta (al leer los datos y al cargar una copia).
export function sesionValida(s) {
  return esObjeto(s) && esTexto(s.id) && esTexto(s.diaId) && fechaValida(s.inicio) && fechaValida(s.fin)
    && (s.diaNombre === undefined || esTexto(s.diaNombre))
    && (s.seriesPlan === undefined || Number.isFinite(s.seriesPlan))
    && Array.isArray(s.ejercicios) && s.ejercicios.every((e) => esObjeto(e) && esTexto(e.exerciseId)
      && (e.nombre === undefined || esTexto(e.nombre)) && Array.isArray(e.series)
      && e.series.every((x) => esObjeto(x) && (x.kg === null || Number.isFinite(x.kg)) && Number.isFinite(x.reps)));
}

export function marcaValida(m) {
  return esObjeto(m) && esTexto(m.exerciseId) && (m.kg === null || Number.isFinite(m.kg)) && fechaValida(m.fecha);
}

export function apunteValido(a) {
  return esObjeto(a) && esTexto(a.texto) && fechaValida(a.fecha);
}

// Deja un apunte con todos sus campos de texto (el id hace falta para borrarlo).
export function normalizarApunte(a, i = 0) {
  const r = {
    id: esTexto(a.id) && a.id ? a.id : `a-${a.fecha}-${i}`,
    fecha: a.fecha,
    pantalla: esTexto(a.pantalla) ? a.pantalla : "",
    version: esTexto(a.version) ? a.version : "",
    texto: recortar(a.texto, LIMITES.apunte),
  };
  if (esTexto(a.contexto) && a.contexto) r.contexto = recortar(a.contexto, 200);
  return r;
}

// Completa lo opcional de una sesión válida (nombre del día y series planificadas).
export function completarSesion(s) {
  if (!esTexto(s.diaNombre)) s.diaNombre = "";
  if (!Number.isFinite(s.seriesPlan)) s.seriesPlan = s.ejercicios.reduce((n, e) => n + e.series.length, 0);
  for (const e of s.ejercicios) if (!esTexto(e.nombre)) e.nombre = e.exerciseId;
  return s;
}

// Separa una lista en lo válido y lo raro; lo raro se apunta en «descartado» con su tipo (no se pierde).
export function apartarRaros(lista, valido, tipo, descartado) {
  const buenos = [];
  for (const v of Array.isArray(lista) ? lista : []) {
    if (valido(v)) buenos.push(v);
    else descartado.push({ tipo, valor: v });
  }
  return buenos;
}

// Completa lo que falte y no es esencial. Lo que tiene forma rara se aparta en «descartado» (no se pierde).
export function reparar(entrada) {
  const d = structuredClone(entrada);
  const avisos = [];
  d.rev = Number.isFinite(d.rev) ? d.rev : 0;
  d.creado = Number.isFinite(d.creado) ? d.creado : 0;
  d.actualizado = Number.isFinite(d.actualizado) ? d.actualizado : d.creado;
  if (!esObjeto(d.origen)) d.origen = { tipo: "base", fecha: d.creado, avisos: [] };
  d.ajustes = normalizarAjustes(d.ajustes);
  d.descartado = Array.isArray(d.descartado) ? d.descartado : [];
  for (const [id, x] of Object.entries(d.ejercicios)) {
    d.ejercicios[id] = normalizarEjercicio({ ...x, id }, x);
  }
  for (const dia of d.dias) {
    dia.title = esTexto(dia.title) ? dia.title : "";
    dia.subtitle = esTexto(dia.subtitle) ? dia.subtitle : "";
    dia.diasSemana = Array.isArray(dia.diasSemana)
      ? [...new Set(dia.diasSemana.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))]
      : deducirDiasSemana(dia.id, dia.label);
  }
  const antes = d.descartado.length;
  d.sesiones = apartarRaros(d.sesiones, sesionValida, "sesion", d.descartado).map(completarSesion);
  const raras = d.descartado.length - antes;
  if (raras > 0) {
    avisos.push(raras === 1 ? "1 sesión con datos raros no se muestra." : `${raras} sesiones con datos raros no se muestran.`);
  }
  d.marcas = apartarRaros(d.marcas, marcaValida, "marca", d.descartado);
  d.apuntes = apartarRaros(d.apuntes, apunteValido, "apunte", d.descartado).map(normalizarApunte);
  d.copia = esObjeto(d.copia) ? { ultima: Number.isFinite(d.copia.ultima) ? d.copia.ultima : null, metodo: d.copia.metodo ?? null }
    : { ultima: null, metodo: null };
  return { datos: d, avisos };
}

export function normalizarEjercicio(x, previo = {}) {
  const tipo = TIPOS.includes(x.tipo) ? x.tipo : (TIPOS.includes(previo.tipo) ? previo.tipo : "peso");
  return {
    id: x.id,
    name: recortar(x.name, LIMITES.nombre) || "Ejercicio sin nombre",
    image: normalizarImagen(x.image),
    muscleGroup: recortar(x.muscleGroup, LIMITES.grupo),
    pr: normalizarMarca(x.pr),
    tipo,
    incremento: normalizarIncremento(x.incremento),
    notas: recortar(x.notas, LIMITES.notas),
  };
}

export function migrar(entrada, migraciones = MIGRACIONES, hasta = ESQUEMA) {
  let d = structuredClone(entrada);
  let n = Number(d.esquema) || 0;
  while (n < hasta) {
    const paso = migraciones[n];
    if (typeof paso !== "function") throw new Error(`No hay migración del esquema ${n}.`);
    d = paso(d);
    n += 1;
    d.esquema = n;
  }
  return d;
}

// --- Consultas pequeñas ---

export function diaPorId(datos, id) {
  return datos.dias.find((d) => d.id === id) || null;
}

export function nombreDia(dia) {
  return [dia.label, dia.title].filter(Boolean).join(" · ");
}

export function seriesDelDia(dia) {
  return (dia?.ejercicios || []).reduce((s, e) => s + (Number(e.series) || 0), 0);
}

// La marca de cada ejercicio es el kg de su última entrada en «marcas» (o null si no tiene ninguna).
export function rehacerMarcas(datos) {
  const ultima = new Map();
  for (const m of datos.marcas) ultima.set(m.exerciseId, m);
  for (const [id, x] of Object.entries(datos.ejercicios)) {
    x.pr = ultima.has(id) ? ultima.get(id).kg ?? null : null;
  }
  return datos;
}

// --- Tiempo estimado ---

// Trabajo = series × segundos por serie; descansos = (series − 1) × descanso de cada ejercicio;
// cambios = (ejercicios − 1) × minutos por cambio. El martes de la rutina publicada da ~53 min.
export function estimarTiempo(dia, ajustes = AJUSTES_POR_DEFECTO) {
  const T = Number(ajustes.segundosPorSerie) || AJUSTES_POR_DEFECTO.segundosPorSerie;
  const minutosCambio = Number(ajustes.transitionMinutes) || 0;
  const C = minutosCambio * 60;
  const ejercicios = dia?.ejercicios || [];
  let series = 0;
  let trabajo = 0;
  let descansos = 0;
  for (const e of ejercicios) {
    const n = Number(e.series) || 0;
    series += n;
    trabajo += n * T;
    descansos += Math.max(0, n - 1) * (leerDescanso(e.rest) ?? 0);
  }
  const nCambios = Math.max(0, ejercicios.length - 1);
  const cambios = nCambios * C;
  return { series, trabajo, descansos, cambios, nCambios, segundosPorSerie: T, minutosCambio, total: trabajo + descansos + cambios };
}

// Lo que queda de la sesión: por cada ejercicio con p series pendientes, p × T más sus descansos
// (uno menos si aún no se ha empezado), más un cambio por cada ejercicio sin empezar.
export function tiempoRestante(dia, sesion, ajustes = AJUSTES_POR_DEFECTO) {
  const T = Number(ajustes.segundosPorSerie) || AJUSTES_POR_DEFECTO.segundosPorSerie;
  const C = (Number(ajustes.transitionMinutes) || 0) * 60;
  let total = 0;
  for (const e of dia?.ejercicios || []) {
    const hechas = sesion?.ejercicios?.[e.exerciseId]?.length || 0;
    const p = Math.max(0, (Number(e.series) || 0) - hechas);
    if (p === 0) continue;
    const empezado = hechas > 0;
    total += p * T + Math.max(0, p - (empezado ? 0 : 1)) * (leerDescanso(e.rest) ?? 0);
    if (!empezado) total += C;
  }
  return total;
}
