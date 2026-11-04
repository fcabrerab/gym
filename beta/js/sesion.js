// Lógica pura de la sesión de entreno: empezar, apuntar, editar y borrar series, los valores propuestos,
// el siguiente ejercicio, terminar (con las marcas), el resumen, el historial por ejercicio y la sugerencia
// de peso. Nada toca el almacenamiento: las funciones reciben los datos y la hora y devuelven copias.

import { idSesion, leerRango, redondear } from "./util.js";
import { diaPorId, nombreDia, seriesDelDia } from "./modelo.js";

export const HORAS_ABANDONO = 6;

export function empezarSesion(diaId, ahoraMs) {
  return { id: idSesion(ahoraMs), diaId, inicio: ahoraMs, ultimoCambio: ahoraMs, actual: null, pospuestos: [], pesoElegido: {}, ejercicios: {} };
}

export function hechasDe(sesion, exerciseId) {
  return sesion?.ejercicios?.[exerciseId] || [];
}

export function totalSeries(sesion) {
  return Object.values(sesion?.ejercicios || {}).reduce((n, lista) => n + lista.length, 0);
}

export function marcarSerie(sesion, exerciseId, { kg = null, reps }, ahoraMs) {
  const s = structuredClone(sesion);
  (s.ejercicios[exerciseId] ||= []).push({ kg: kg ?? null, reps, t: ahoraMs });
  s.actual = exerciseId;
  s.ultimoCambio = ahoraMs;
  s.pospuestos = (s.pospuestos || []).filter((id) => id !== exerciseId);
  return s;
}

export function editarSerie(sesion, exerciseId, indice, { kg = null, reps }, ahoraMs) {
  const s = structuredClone(sesion);
  const lista = s.ejercicios[exerciseId];
  if (!lista?.[indice]) return s;
  lista[indice] = { ...lista[indice], kg: kg ?? null, reps };
  s.ultimoCambio = ahoraMs;
  return s;
}

export function borrarSerie(sesion, exerciseId, indice, ahoraMs) {
  const s = structuredClone(sesion);
  const lista = s.ejercicios[exerciseId];
  if (!lista?.[indice]) return s;
  lista.splice(indice, 1);
  if (lista.length === 0) delete s.ejercicios[exerciseId];
  s.ultimoCambio = ahoraMs;
  return s;
}

// Deshace un ✓: quita la serie de ese ejercicio con esa hora, si sigue ahí. Devuelve la sesión nueva o null.
export function quitarSerieMarcada(sesion, exerciseId, t, ahoraMs) {
  const lista = sesion?.ejercicios?.[exerciseId];
  const i = Array.isArray(lista) ? lista.findIndex((x) => x.t === t) : -1;
  if (i < 0) return null;
  return borrarSerie(sesion, exerciseId, i, ahoraMs);
}

// Una sesión está abandonada si su último cambio es de hace más de 6 h. Solo cuenta el tiempo, no el día del
// calendario: quien entrena pasada la medianoche sigue con la misma sesión.
export function abandonada(sesion, ahoraMs) {
  if (!sesion) return false;
  const ultimo = Number(sesion.ultimoCambio);
  if (!Number.isFinite(ultimo)) return true;
  return ahoraMs - ultimo > HORAS_ABANDONO * 3600000;
}

// Series hechas del día (cada ejercicio cuenta como mucho sus series planificadas) y las planificadas.
export function progreso(dia, sesion) {
  let hechas = 0;
  for (const e of dia?.ejercicios || []) hechas += Math.min(e.series, hechasDe(sesion, e.exerciseId).length);
  return { hechas, plan: seriesDelDia(dia) };
}

export function quedanSeries(dia, sesion) {
  const p = progreso(dia, sesion);
  return Math.max(0, p.plan - p.hechas);
}

export function completo(entrada, sesion) {
  return hechasDe(sesion, entrada.exerciseId).length >= entrada.series;
}

// El siguiente ejercicio sin acabar: después del actual en el orden del día (y luego desde el principio),
// saltando los pospuestos; si solo quedan pospuestos, el primero de ellos. Si no queda nada, null.
export function siguientePendiente(dia, sesion, desdeId = null, pospuestosExtra = []) {
  const lista = dia?.ejercicios || [];
  const pospuestos = new Set([...(sesion?.pospuestos || []), ...pospuestosExtra]);
  const i = lista.findIndex((e) => e.exerciseId === desdeId);
  const orden = i >= 0 ? [...lista.slice(i + 1), ...lista.slice(0, i + 1)] : lista;
  const pendientes = orden.filter((e) => !completo(e, sesion));
  const normal = pendientes.find((e) => !pospuestos.has(e.exerciseId));
  if (normal) return normal.exerciseId;
  const pospuesto = lista.find((e) => pospuestos.has(e.exerciseId) && !completo(e, sesion));
  return pospuesto ? pospuesto.exerciseId : null;
}

// --- Historial ---

export function seriesDe(sesionGuardada, exerciseId) {
  return sesionGuardada?.ejercicios?.find((e) => e.exerciseId === exerciseId)?.series || [];
}

// La última sesión terminada que tiene este ejercicio (si se da diaId, solo de ese día).
export function ultimaSesionCon(datos, exerciseId, diaId = null) {
  for (let i = datos.sesiones.length - 1; i >= 0; i -= 1) {
    const s = datos.sesiones[i];
    if (diaId && s.diaId !== diaId) continue;
    if (seriesDe(s, exerciseId).length) return s;
  }
  return null;
}

// «La última vez»: la última sesión de este día con el ejercicio o, si no hay, la de cualquier día.
export function ultimaVez(datos, diaId, exerciseId) {
  const s = ultimaSesionCon(datos, exerciseId, diaId) || ultimaSesionCon(datos, exerciseId);
  return s ? { sesion: s, series: seriesDe(s, exerciseId) } : null;
}

// Valores con los que se rellena la serie «indice» (0 = la primera) del ejercicio en el día.
// Peso: el de la serie anterior de hoy (si ya se ha hecho alguna; así manda el peso que se está usando hoy);
// si no, el de la sugerencia aceptada; si no, el de esa serie la última vez en este día; si no, el de la
// primera serie de la última vez en cualquier día; si no, la marca; y si no hay nada, 0 («Pon el peso»).
// Repeticiones: las de esa serie la última vez en este día; si no, las de la serie anterior de hoy; si no,
// el mínimo del rango (o 10).
export function valoresPropuestos(datos, sesion, diaId, exerciseId, indice) {
  const x = datos.ejercicios[exerciseId] || {};
  const tipo = x.tipo || "peso";
  const conPeso = tipo === "peso";
  const entrada = diaPorId(datos, diaId)?.ejercicios.find((e) => e.exerciseId === exerciseId);
  const rango = leerRango(entrada?.reps);
  const repsMin = rango ? rango.min : tipo === "tiempo" ? 30 : 10;
  const hoy = hechasDe(sesion, exerciseId);
  const anteriorHoy = indice > 0 ? hoy[indice - 1] || hoy[hoy.length - 1] : null;
  const sesionDia = ultimaSesionCon(datos, exerciseId, diaId);
  const serieDia = sesionDia ? seriesDe(sesionDia, exerciseId)[indice] : null;
  const sesionCualquiera = ultimaSesionCon(datos, exerciseId);
  const primeraCualquiera = sesionCualquiera ? seriesDe(sesionCualquiera, exerciseId)[0] : null;
  const elegido = sesion?.pesoElegido?.[exerciseId];

  let reps;
  let origenReps;
  if (serieDia) { reps = serieDia.reps; origenReps = "ultima-dia"; }
  else if (anteriorHoy) { reps = anteriorHoy.reps; origenReps = "anterior"; }
  else { reps = repsMin; origenReps = "rango"; }

  let kg = null;
  let origen = "nada";
  if (conPeso) {
    if (anteriorHoy && anteriorHoy.kg != null) { kg = anteriorHoy.kg; origen = "anterior"; }
    else if (elegido != null) { kg = elegido; origen = "sugerencia"; }
    else if (serieDia && serieDia.kg != null) { kg = serieDia.kg; origen = "ultima-dia"; }
    else if (primeraCualquiera && primeraCualquiera.kg != null) { kg = primeraCualquiera.kg; origen = "ultima"; }
    else if (x.pr != null) { kg = x.pr; origen = "marca"; }
  }
  const faltaPeso = conPeso && !(kg > 0);
  if (conPeso && kg == null) kg = 0;
  return { kg: conPeso ? kg : null, reps, faltaPeso, origen, origenReps };
}

// Termina la sesión: la guarda en el historial (ordenada por inicio) y sube la marca de cada ejercicio con peso
// cuya serie más pesada la supere. Devuelve {datos, guardada, marcasNuevas}.
export function terminarSesion(datos, sesion, ahoraMs, { fin = ahoraMs } = {}) {
  const d = structuredClone(datos);
  const dia = diaPorId(d, sesion.diaId);
  const orden = dia ? dia.ejercicios.map((e) => e.exerciseId) : [];
  const conSeries = Object.keys(sesion.ejercicios || {}).filter((id) => sesion.ejercicios[id]?.length);
  const ids = [...orden.filter((id) => conSeries.includes(id)), ...conSeries.filter((id) => !orden.includes(id))];
  const ejercicios = ids.map((id) => {
    const x = d.ejercicios[id] || {};
    const entrada = dia?.ejercicios.find((e) => e.exerciseId === id);
    return {
      exerciseId: id,
      nombre: x.name || id,
      tipo: x.tipo || "peso",
      plan: entrada ? { series: entrada.series, reps: entrada.reps, rest: entrada.rest } : null,
      series: structuredClone(sesion.ejercicios[id]),
    };
  });
  const guardada = {
    id: sesion.id,
    diaId: sesion.diaId,
    diaNombre: dia ? nombreDia(dia) : "Día",
    inicio: sesion.inicio,
    fin: Math.max(fin, sesion.inicio),
    seriesPlan: seriesDelDia(dia),
    ejercicios,
  };
  d.sesiones = [...d.sesiones.filter((s) => s.id !== sesion.id), guardada].sort((a, b) => a.inicio - b.inicio);
  const marcasNuevas = [];
  for (const e of ejercicios) {
    if (e.tipo !== "peso") continue;
    const x = d.ejercicios[e.exerciseId];
    const max = Math.max(0, ...e.series.map((s) => s.kg ?? 0));
    if (x && max > 0 && (x.pr == null || max > x.pr)) {
      marcasNuevas.push({ exerciseId: e.exerciseId, nombre: x.name, kg: max, antes: x.pr });
      x.pr = max;
      d.marcas.push({ exerciseId: e.exerciseId, kg: max, fecha: guardada.fin, motivo: "sesion", sesionId: sesion.id });
    }
  }
  return { datos: d, guardada, marcasNuevas };
}

export function volumen(series) {
  return series.reduce((v, s) => v + (s.kg != null && s.kg > 0 ? s.kg * s.reps : 0), 0);
}

export function volumenSesion(s) {
  return s.ejercicios.reduce((v, e) => v + (e.tipo === "peso" ? volumen(e.series) : 0), 0);
}

// Resumen de una sesión guardada: duración, series, marcas nuevas, volumen y comparación con la anterior de ese día.
export function resumenSesion(datos, guardada) {
  const hechas = guardada.ejercicios.reduce((n, e) => n + e.series.length, 0);
  const marcas = datos.marcas.filter((m) => m.sesionId === guardada.id)
    .map((m) => ({ exerciseId: m.exerciseId, nombre: datos.ejercicios[m.exerciseId]?.name || m.exerciseId, kg: m.kg }));
  const vol = volumenSesion(guardada);
  const anteriores = datos.sesiones.filter((s) => s.diaId === guardada.diaId && s.inicio < guardada.inicio);
  const anterior = anteriores[anteriores.length - 1] || null;
  let comparacion = null;
  if (anterior) {
    const volAnterior = volumenSesion(anterior);
    let masPeso = 0;
    for (const e of guardada.ejercicios) {
      if (e.tipo !== "peso") continue;
      const antes = seriesDe(anterior, e.exerciseId);
      if (!antes.length) continue;
      const maxHoy = Math.max(...e.series.map((s) => s.kg ?? 0));
      const maxAntes = Math.max(...antes.map((s) => s.kg ?? 0));
      if (maxHoy > maxAntes) masPeso += 1;
    }
    // Solo se compara el volumen si hoy se ha hecho al menos el 80 % de las series de la vez anterior
    // (con una sesión a medias, un «−70 %» no dice nada útil).
    const hechasAntes = anterior.ejercicios.reduce((n, e) => n + e.series.length, 0);
    const comparable = hechasAntes > 0 && hechas >= 0.8 * hechasAntes;
    comparacion = {
      fecha: anterior.inicio,
      porcentaje: volAnterior > 0 && comparable ? Math.round(((vol - volAnterior) / volAnterior) * 100) : null,
      masPeso,
    };
  }
  return { duracion: guardada.fin - guardada.inicio, hechas, plan: guardada.seriesPlan, marcas, volumen: vol, comparacion };
}

// Borra una sesión del historial, quita sus marcas y rehace la marca de cada ejercicio afectado con la última
// entrada que le quede (o null).
export function borrarSesion(datos, sesionId) {
  const d = structuredClone(datos);
  d.sesiones = d.sesiones.filter((s) => s.id !== sesionId);
  const afectados = new Set(d.marcas.filter((m) => m.sesionId === sesionId).map((m) => m.exerciseId));
  d.marcas = d.marcas.filter((m) => m.sesionId !== sesionId);
  for (const id of afectados) {
    const ultima = [...d.marcas].reverse().find((m) => m.exerciseId === id);
    if (d.ejercicios[id]) d.ejercicios[id].pr = ultima ? ultima.kg ?? null : null;
  }
  return d;
}

// Cambia la marca a mano (o la quita con null) y deja la entrada con su fecha y motivo.
export function cambiarMarca(datos, exerciseId, kg, ahoraMs, motivo = "a-mano") {
  const d = structuredClone(datos);
  if (!d.ejercicios[exerciseId]) return d;
  d.ejercicios[exerciseId].pr = kg ?? null;
  d.marcas.push({ exerciseId, kg: kg ?? null, fecha: ahoraMs, motivo });
  return d;
}

// Mejor serie: con peso, la de más kg (y, si empatan, la de más repeticiones); en corporal y por tiempo, la de
// más repeticiones o segundos.
export function mejorSerie(series, tipo = "peso") {
  let mejor = null;
  for (const s of series || []) {
    if (!mejor) { mejor = s; continue; }
    if (tipo === "peso") {
      const a = s.kg ?? 0;
      const b = mejor.kg ?? 0;
      if (a > b || (a === b && s.reps > mejor.reps)) mejor = s;
    } else if (s.reps > mejor.reps) {
      mejor = s;
    }
  }
  return mejor;
}

// 1RM estimado (Epley), redondeado a 0,5 kg: 80 × 10 → 106,5.
export function e1rm(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return null;
  if (reps === 1) return kg;
  return redondear(kg * (1 + reps / 30), 0.5);
}

// Historial de un ejercicio: una fila por sesión (de la más vieja a la más nueva).
export function historialEjercicio(datos, exerciseId) {
  const tipo = datos.ejercicios[exerciseId]?.tipo || "peso";
  return datos.sesiones
    .map((s) => ({ sesion: s, series: seriesDe(s, exerciseId) }))
    .filter((f) => f.series.length)
    .map((f) => ({
      sesionId: f.sesion.id, inicio: f.sesion.inicio, diaId: f.sesion.diaId, diaNombre: f.sesion.diaNombre,
      series: f.series, mejor: mejorSerie(f.series, tipo),
    }));
}

// Sugerencia de doble progresión, solo con peso y con la última sesión de ESTE día:
// todas las series planificadas al mismo peso y con el máximo del rango → subir; alguna por debajo del mínimo → mantener.
export function sugerencia(datos, diaId, exerciseId) {
  const x = datos.ejercicios[exerciseId];
  if (!x || x.tipo !== "peso") return null;
  const entrada = diaPorId(datos, diaId)?.ejercicios.find((e) => e.exerciseId === exerciseId);
  const rango = leerRango(entrada?.reps);
  if (!entrada || !rango || rango.unidad !== "reps") return null;
  const s = ultimaSesionCon(datos, exerciseId, diaId);
  if (!s) return null;
  const series = seriesDe(s, exerciseId);
  const plan = s.ejercicios.find((e) => e.exerciseId === exerciseId)?.plan?.series ?? entrada.series;
  const pesos = series.map((z) => z.kg).filter((k) => k != null && k > 0);
  if (!pesos.length) return null;
  const primeras = series.slice(0, plan);
  if (primeras.length >= plan && primeras.every((z) => z.kg === primeras[0].kg && z.kg > 0 && z.reps >= rango.max)) {
    return {
      tipo: "subir",
      kg: redondear(primeras[0].kg + (x.incremento || 2.5), 0.25),
      porque: `La última vez llegaste a ${rango.max} en todas las series.`,
    };
  }
  if (series.some((z) => z.reps < rango.min)) {
    return { tipo: "mantener", kg: Math.max(...pesos), porque: `La última vez alguna serie se quedó por debajo de ${rango.min}.` };
  }
  return null;
}

// --- Qué día se abre ---

// 1) el de la sesión en curso (si no está abandonada); 2) el elegido hoy; 3) el que toca hoy; 4) si hoy no toca
// nada, el siguiente día de la semana con entreno (con el banner de descanso); 5) si ningún día tiene días de la
// semana, el primero.
export function elegirDia(datos, sesion, ui, ahoraMs, hoyTexto) {
  const existe = (id) => datos.dias.some((d) => d.id === id);
  if (sesion && !abandonada(sesion, ahoraMs) && existe(sesion.diaId)) return { diaId: sesion.diaId, motivo: "sesion" };
  if (ui?.diaElegido && ui.diaElegido.fecha === hoyTexto && existe(ui.diaElegido.id)) return { diaId: ui.diaElegido.id, motivo: "elegido" };
  const hoy = new Date(ahoraMs).getDay();
  const deHoy = datos.dias.find((d) => (d.diasSemana || []).includes(hoy));
  if (deHoy) return { diaId: deHoy.id, motivo: "hoy" };
  for (let k = 1; k <= 7; k += 1) {
    const w = (hoy + k) % 7;
    const proximo = datos.dias.find((d) => (d.diasSemana || []).includes(w));
    if (proximo) return { diaId: proximo.id, motivo: "descanso", proximoDiaSemana: w };
  }
  return { diaId: datos.dias[0]?.id ?? null, motivo: "primero" };
}
