// Su cuerpo según tus entrenos (D-128, D-133: la fase 2). Lo saca de tus sesiones, que solo lee (le llega una copia):
// - la forma de fondo, de gordita (0) a definida (1), según lo constante que seas con tu propia rutina (no por los
//   kilos). Lo de los últimos días cuenta más: si lo dejas, se ablanda poco a poco, y al volver se recupera rápido;
// - el bombeo de cada músculo (cada serie, +0,4, hasta 1) y el general (cada serie la marca un poco más), que se van en
//   unas horas: como sale de la hora de cada serie, dura aunque cierres la app;
// - y las agujetas: cada serie deja las suyas en sus músculos, de las 8 h a los 4 días, en su punto de uno a dos días
//   después. Suaves: casi no se notan (D-133).
// Y, para sus momentos (D-135): cuándo fue tu último entreno (si llevas días sin entrenar, al volver te espera dormida)
// y si hoy has batido alguna marca entrenando (su trofeo, el resto del día).
// Funciones puras: reciben tus entrenos y la hora, y no tocan nada. Para cambiar cómo cuenta algo, las constantes de
// aquí abajo (lo que se espera de cada caso, en las pruebas MA20 a MA22 de tests/mascota.js).

import { GRUPOS, MUSCULOS } from "./gestos.js";
import { tramo, limitar } from "./esqueleto.js";
import { grupoDe as suGrupo } from "./grupos.js";
import { fechaLocal } from "../util.js";

export const BOMBEO_HORAS = 3;     // lo que tarda en irse el bombeo entero (de 1 a 0)
export const BOMBEO_SERIE = 0.4;   // lo que bombea cada serie a sus músculos
export const GENERAL_SERIE = 1 / 16; // lo que suma cada serie al bombeo general, si no se sabe cuántas tiene su día
export const MARCA_GENERAL = 0.5;  // con el bombeo general entero, se acerca a definida la mitad de lo que le falta
const MEMORIA_DIAS = 10;           // la constancia: lo de hace 10 días cuenta un tercio; lo de hace un mes, un 5 %
const PLENA = 0.85;                // con esta constancia (1: tu rutina entera), ya del todo definida
const SUELO = 0.08;                // lo más gordita, por mucho que lo dejes
const TECHO = 0.97;                // lo más definida de fondo
const AL_EMPEZAR = 0.26;           // la constancia de quien empieza (se olvida como lo demás): un poco blandita
const AGUJETAS_SERIE = 0.12;       // las agujetas de cada serie, en su punto
const UMBRAL = 0.15;               // desde aquí, un grupo «tiene» bombeo o agujetas (para su página)
const HORA = 3600000;
const DIA = 24 * HORA;

const lista = (v) => (Array.isArray(v) ? v : []);
const hora = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const cero = () => Object.fromEntries(Object.keys(MUSCULOS).map((k) => [k, 0]));

// Cuántos entrenos por semana pide tu rutina: uno por cada día de la semana que tenga un día de la rutina, más uno por
// cada día de la rutina sin día fijo. Si ninguno lo tiene, uno por día de la rutina (de 1 a 6).
export function entrenosPorSemana(dias = []) {
  const fijos = new Set();
  let sueltos = 0;
  for (const d of lista(dias)) {
    const ds = lista(d?.diasSemana).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
    if (ds.length) for (const n of ds) fijos.add(n);
    else sueltos += 1;
  }
  return fijos.size ? limitar(fijos.size + sueltos, 1, 7) : limitar(sueltos, 1, 6);
}

// Tus entrenos, uno por sesión (las guardadas de los últimos 4 meses y la de ahora, si no está ya guardada): cuándo
// empezó y acabó, cuántas series pedía su día y cada serie con su hora y su grupo. Una serie sin hora (de una copia de
// antes) va repartida entre el principio y el fin de su sesión. «primera»: cuándo empezó la primera de todas; «ultimo»:
// cuándo acabó la última con alguna serie (la de ahora, ahora), o null si aún no hay ninguna.
function sesionesDe({ sesiones, ejercicios, enCurso, dias } = {}, ahora) {
  // el grupo de cada ejercicio, como lo entiende ella (grupos.js: como lo escribas, en tu idioma; o ninguno)
  const grupoDe = (id) => suGrupo(ejercicios && typeof ejercicios === "object" ? ejercicios[id]?.muscleGroup : "");
  const r = [];
  let primera = Infinity;
  let ultimo = null;
  for (const s of lista(sesiones)) {
    const inicio = hora(s?.inicio);
    if (inicio == null) continue;
    const fin = Math.max(inicio, hora(s.fin) ?? inicio);
    primera = Math.min(primera, inicio);
    if (fin <= ahora && lista(s.ejercicios).some((e) => lista(e?.series).length)) ultimo = Math.max(ultimo ?? fin, fin);
    if (ahora - fin > 120 * DIA) continue;
    const todas = lista(s.ejercicios).flatMap((e) => lista(e?.series).map((x) => ({ x, grupo: grupoDe(e?.exerciseId) })));
    const series = todas.map(({ x, grupo }, i) => ({ t: hora(x?.t) ?? inicio + ((fin - inicio) * (i + 1)) / (todas.length + 1), grupo }));
    r.push({ id: s.id, inicio, fin, plan: Number(s.seriesPlan) || todas.length, series });
  }
  const inicio = hora(enCurso?.inicio);
  if (inicio != null && !r.some((s) => s.id === enCurso.id)) {
    const dia = lista(dias).find((d) => d?.id === enCurso.diaId);
    const series = Object.entries(enCurso.ejercicios && typeof enCurso.ejercicios === "object" ? enCurso.ejercicios : {})
      .flatMap(([id, l]) => lista(l).map((x) => ({ t: hora(x?.t) ?? ahora, grupo: grupoDe(id) })));
    const plan = lista(dia?.ejercicios).reduce((n, e) => n + (Number(e?.series) || 0), 0);
    primera = Math.min(primera, inicio);
    if (series.length) ultimo = ahora;
    r.push({ id: enCurso.id, inicio, fin: Math.max(inicio, ahora), plan: plan || series.length, series });
  }
  return { sesiones: r, primera, ultimo };
}

// La constancia: tus días de entreno, cada uno con lo que hiciste (una sesión con el 70 % de sus series o más cuenta
// entera; una de pocas, menos; dos el mismo día, como una), y lo de hace más tiempo, cada vez menos. 1 es seguir tu
// rutina entera. Quien empieza (o lleva poco con la app) parte de AL_EMPEZAR, que se olvida como lo demás.
function constanciaDe({ sesiones, primera }, porSemana, ahora, nacida) {
  const tau = MEMORIA_DIAS * DIA;
  const dias = new Map();
  for (const s of sesiones) {
    if (!s.series.length || s.inicio > ahora + 60000) continue; // sin series, o del futuro (un reloj raro)
    const q = Math.min(1, 0.3 + s.series.length / Math.max(1, s.plan));
    const clave = fechaLocal(s.inicio);
    const d = dias.get(clave) || { q: 0, t: 0 };
    d.q = Math.min(1, d.q + q);
    d.t = Math.max(d.t, Math.min(s.fin, ahora));
    dias.set(clave, d);
  }
  let suma = 0;
  let ultimas4 = 0;
  for (const { q, t } of dias.values()) {
    suma += q * Math.exp(-Math.max(0, ahora - t) / tau);
    if (ahora - t <= 28 * DIA) ultimas4 += 1;
  }
  const lleno = (porSemana / 7) * MEMORIA_DIAS; // lo que suma, de media, quien sigue su rutina siempre
  const desde = Math.min(primera, hora(nacida) ?? Infinity);
  const previa = AL_EMPEZAR * (Number.isFinite(desde) ? Math.exp(-Math.max(0, ahora - desde) / tau) : 1);
  return { valor: suma / lleno + previa, ultimas4 };
}

// El bombeo de ahora, el de cada músculo y el general, de las series de las últimas horas: cada una suma y todo baja a la
// vez (como en cerebro.js mientras está en pantalla). Y el de cada grupo, para su página.
function bombeoDe(sesiones, ahora) {
  const dura = BOMBEO_HORAS * HORA;
  const desde = ahora - 4 * dura;
  const eventos = [];
  for (const s of sesiones) {
    if (s.fin < desde) continue;
    const paso = 1 / Math.max(10, 0.75 * s.plan);
    for (const x of s.series) if (x.t >= desde && x.t <= ahora) eventos.push({ ...x, paso });
  }
  eventos.sort((a, b) => a.t - b.t);
  const musculos = cero();
  const grupos = {};
  let general = 0;
  let antes = null;
  const bajar = (t) => {
    if (antes != null) {
      const b = (t - antes) / dura;
      for (const k in musculos) musculos[k] = Math.max(0, musculos[k] - b);
      for (const g in grupos) grupos[g] = Math.max(0, grupos[g] - b);
      general = Math.max(0, general - b);
    }
    antes = t;
  };
  for (const e of eventos) {
    bajar(e.t);
    for (const k of GRUPOS[e.grupo]?.musculos || []) musculos[k] = Math.min(1, musculos[k] + BOMBEO_SERIE);
    if (GRUPOS[e.grupo]) grupos[e.grupo] = Math.min(1, (grupos[e.grupo] || 0) + BOMBEO_SERIE);
    general = Math.min(1, general + e.paso);
  }
  bajar(ahora);
  return { musculos, grupos, general };
}

// Cuánto le duele una serie hecha hace «horas»: empieza a las 8 h, está en su punto de las 24 a las 48 y se va a las 96.
export function perfilAgujetas(horas) {
  return tramo(horas, 8, 24) * tramo(horas, 96, 48);
}

function agujetasDe(sesiones, ahora) {
  const musculos = cero();
  const grupos = {};
  for (const s of sesiones) {
    if (ahora - s.fin > 4 * DIA + HORA) continue;
    for (const x of s.series) {
      const p = perfilAgujetas((ahora - x.t) / HORA);
      if (p <= 0 || !GRUPOS[x.grupo]) continue;
      for (const k of GRUPOS[x.grupo].musculos) musculos[k] = Math.min(1, musculos[k] + AGUJETAS_SERIE * p);
      grupos[x.grupo] = Math.min(1, (grupos[x.grupo] || 0) + AGUJETAS_SERIE * p);
    }
  }
  return { musculos, grupos };
}

/**
 * Su cuerpo ahora, de tus entrenos. entrenos: { dias, sesiones, ejercicios, enCurso } (tu rutina, tus sesiones
 * guardadas, la biblioteca de ejercicios, para el grupo de cada uno, y la sesión en marcha, si hay). nacida: cuándo
 * nació ella (sin entrenos, desde entonces se va olvidando de cómo empezó).
 * Devuelve { fondo, constancia, porSemana, ultimas4 (días que entrenaste en las últimas 4 semanas), bombeo y
 * agujetas (de 0 a 1, por músculo de gestos.js), general, bombeados y doloridos (los grupos de la app que los tienen,
 * de más a menos) } y, para sus momentos (D-135), { ultimoEntreno (cuándo acabó el último, o null), diasSin (los días
 * que llevas sin entrenar, o null si aún no has entrenado), trofeo (si hoy has batido alguna marca entrenando) }.
 * Para «trofeo», entrenos.marcas (tus marcas, como en tus datos).
 */
export function cuerpoDeTusEntrenos(entrenos = {}, ahora = Date.now(), { nacida = null } = {}) {
  const porSemana = entrenosPorSemana(entrenos?.dias);
  const todas = sesionesDe(entrenos || {}, ahora);
  const c = constanciaDe(todas, porSemana, ahora, nacida);
  const b = bombeoDe(todas.sesiones, ahora);
  const a = agujetasDe(todas.sesiones, ahora);
  const orden = (g) => Object.entries(g).filter(([, v]) => v >= UMBRAL).sort((x, y) => y[1] - x[1]).map(([k]) => k);
  const hoy = fechaLocal(ahora);
  return {
    fondo: SUELO + (TECHO - SUELO) * Math.min(1, c.valor / PLENA),
    constancia: c.valor,
    porSemana,
    ultimas4: c.ultimas4,
    bombeo: b.musculos,
    general: b.general,
    agujetas: a.musculos,
    bombeados: orden(b.grupos),
    doloridos: orden(a.grupos),
    ultimoEntreno: todas.ultimo,
    diasSin: todas.ultimo == null ? null : Math.max(0, (ahora - todas.ultimo) / DIA),
    trofeo: lista(entrenos?.marcas).some((m) => m?.motivo === "sesion" && hora(m.fecha) != null && m.fecha <= ahora && fechaLocal(m.fecha) === hoy),
  };
}

// ¿Llevas días sin entrenar? Más de los que suele haber entre dos entrenos de tu rutina (el doble), y 3 como poco: con
// la tuya (5 por semana), 3; con 3 por semana, 5; con 1, 14. Sin ningún entreno aún, no (no hay «vuelta»).
export function llevasDiasSin(c) {
  return c?.diasSin != null && c.diasSin >= Math.max(3, Math.ceil(14 / (c.porSemana || 1)));
}

// La forma que se le ve: la de fondo, más definida con el bombeo general del entreno.
export function formaVisible(fondo, general = 0) {
  return limitar(fondo + (1 - fondo) * MARCA_GENERAL * limitar(general, 0, 1), 0, 1);
}
