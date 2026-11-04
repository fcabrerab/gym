// Pruebas de las funciones puras de la beta (casos L1-L10 y algunos más), importadas directamente de /beta/js/.

import { base, datosBeta, sesionInventada, diffsNormal, COPIAS_MALAS, ms } from "./datos.js";

export async function ejecutar({ caso, nota }) {
  const util = await import("/beta/js/util.js");
  const modelo = await import("/beta/js/modelo.js");
  const normal = await import("/beta/js/normal.js");
  const copias = await import("/beta/js/copias.js");
  const S = await import("/beta/js/sesion.js");
  const { VERSION } = await import("/beta/js/version.js");
  const { rutina, ejercicios } = await base();

  // L1 descansos
  const descansos = [["2", 120], ["90", 90], ["1:30", 90], ["1:30 ", 90], ["1,30", 90], ["1.30", 90], ["1'30", 90], ["2 min", 120], ["90s", 90], ["1:5", null], ["abc", null], ["1,5", 90], ["10:01", null]];
  const malDescanso = descansos.filter(([t, s]) => util.leerDescanso(t) !== s);
  caso(malDescanso.length === 0, `L1 leerDescanso lee bien ${descansos.length} formas${malDescanso.length ? `; fallan: ${malDescanso.map(([t]) => `«${t}» → ${util.leerDescanso(t)}`).join(", ")}` : ""}`);
  caso(util.formatoDescanso(90) === "1:30" && util.formatoDescanso(5) === "0:05" && util.formatoDescanso(600) === "10:00", "L1 formatoDescanso: 90 → 1:30, 5 → 0:05, 600 → 10:00");

  // L2 números
  const numeros = [["82,5", 82.5], ["82.5", 82.5], [" 80 ", 80], ["", null], ["abc", null], ["1,2,3", null]];
  const malNumero = numeros.filter(([t, n]) => util.leerNumero(t) !== n);
  caso(malNumero.length === 0 && util.formatoNumero(82.5) === "82,5" && util.formatoNumero(12340) === "12.340",
    `L2 leerNumero y formato es-ES (82,5 y 12.340)${malNumero.length ? `; fallan ${JSON.stringify(malNumero)}` : ""}`);

  // L3 rangos
  const r1 = util.leerRango("8-12");
  const r2 = util.leerRango("20-45 s/lado");
  const r3 = util.leerRango("6-12/lado");
  const r4 = util.leerRango("10");
  caso(r1?.min === 8 && r1.max === 12 && r1.unidad === "reps" && !r1.lado
    && r2?.min === 20 && r2.max === 45 && r2.unidad === "s" && r2.lado
    && r3?.lado === true && r3.unidad === "reps" && r4?.min === 10 && r4.max === 10 && util.leerRango("x") === null,
  "L3 leerRango: 8-12, 20-45 s/lado, 6-12/lado, 10 y x");

  // L4 tiempo estimado del martes de la rutina publicada
  const datos = await datosBeta();
  const martes = datos.dias.find((d) => d.id === "tuesday-push");
  const e = modelo.estimarTiempo(martes, datos.ajustes);
  caso(e.trabajo === 920 && e.descansos === 1440 && e.cambios === 840 && util.formatoMinutos(e.total) === "53 min",
    `L4 martes: trabajo ${e.trabajo} s, descansos ${e.descansos} s, cambios ${e.cambios} s → ${util.formatoMinutos(e.total)}`);
  const e0 = modelo.estimarTiempo(martes, { ...datos.ajustes, transitionMinutes: 0 });
  caso(util.formatoMinutos(e0.total) === "39 min", `L4 con 0 minutos por cambio: ${util.formatoMinutos(e0.total)}`);
  caso(util.formatoMinutos(3840) === "1 h 04 min" && util.formatoMinutos(20) === "<1 min", "L4 formatoMinutos: 1 h 04 min y <1 min");

  // L5 datosDesdeSnapshot
  const snap = {
    settings: { timerAlert: false, transitionMinutes: "" },
    days: [{
      id: "tuesday-push", label: "Martes", title: "Push", subtitle: "",
      exercises: [
        { exerciseId: "a", name: "Uno", image: "undefined", muscleGroup: "Pecho", pr: "", series: 0, reps: "8-12", rest: "1:5" },
        { exerciseId: "b", name: "", image: "https://x.invalid/b.webp", muscleGroup: "", pr: 0, series: 3, reps: "", rest: "2" },
        { exerciseId: "c", name: "Tres", image: "", muscleGroup: "", pr: "52,5", series: 4, reps: "10", rest: "1,30" },
        { exerciseId: "a", name: "Uno repetido", pr: 10, series: 3, reps: "8-12", rest: "1:00" },
      ],
    }],
  };
  const r = normal.datosDesdeSnapshot(snap, { origen: "importado", ahoraMs: 1, modo: "importar" });
  const x = r.datos.ejercicios;
  const dia = r.datos.dias[0];
  caso(x.a.pr === null && x.b.pr === null && x.c.pr === 52.5, `L5 pr «» y 0 dan null, «52,5» da 52,5 (${x.a.pr}, ${x.b.pr}, ${x.c.pr})`);
  caso(dia.ejercicios[0].series === 3 && dia.ejercicios[0].rest === "1:30" && r.avisos.some((a) => a.includes("«1:5» → 1:30")),
    `L5 series 0 → 3 y descanso «1:5» → 1:30 con aviso (${dia.ejercicios[0].series}, ${dia.ejercicios[0].rest})`);
  caso(dia.ejercicios.length === 3 && x.b.name === "Ejercicio sin nombre" && x.a.image === "" && x.b.image === "https://x.invalid/b.webp",
    "L5 el repetido se queda una vez, sin nombre → «Ejercicio sin nombre», imagen «undefined» → vacía");
  caso(dia.ejercicios[1].rest === "2:00" && dia.ejercicios[2].rest === "1:30" && dia.ejercicios[1].reps === "8-12",
    `L5 descanso «2» → 2:00, «1,30» → 1:30 y repeticiones vacías → 8-12`);
  caso(r.datos.ajustes.timerAlert === false && r.datos.ajustes.timerSound === true && r.datos.ajustes.transitionMinutes === 2,
    "L5 ajustes: timerAlert false se respeta, lo que falta va a true y transitionMinutes «» da 2");

  const tipos = Object.values(datos.ejercicios).reduce((t, z) => ({ ...t, [z.tipo]: [...(t[z.tipo] || []), z.id] }), {});
  caso(tipos.peso?.length === 17 && (tipos.corporal || []).sort().join() === "back-extension-45,crunches,dead-bug,reverse-crunch" && (tipos.tiempo || []).join() === "side-plank",
    `L5 tipos de la base: ${tipos.peso?.length} con peso, corporales ${tipos.corporal?.join(", ")}, por tiempo ${tipos.tiempo?.join(", ")}`);

  const diffs = await diffsNormal();
  const snapN2 = normal.fusionarComoLaNormal(diffs.N2, rutina, ejercicios);
  const datosN2 = normal.datosDesdeSnapshot(snapN2, { origen: "normal", ahoraMs: 1, ejerciciosBase: ejercicios }).datos;
  caso(datosN2.ejercicios["leg-press"].pr === null && datosN2.ejercicios["leg-press"].tipo === "peso"
    && datosN2.ejercicios["seated-leg-curl"].pr === null && datosN2.ejercicios["seated-leg-curl"].tipo === "peso" && datosN2.ejercicios["pec-deck"].pr === 50,
  "L5 con el diff N2, leg-press y seated-leg-curl se quedan sin marca pero siguen «con peso»; pec-deck 50");
  caso(datos.dias.map((d) => d.diasSemana.join()).join(" ") === "2 3 4 6 0", `L5 días de la semana: ${datos.dias.map((d) => d.diasSemana.join()).join(" ")}`);
  caso(modelo.deducirDiasSemana("day-x", "Miércoles").join() === "3" && modelo.deducirDiasSemana("day-x", "Día 6").length === 0,
    "L5 días de la semana por la etiqueta (Miércoles → 3) y sin nada si no se deduce");

  // L6 exportar
  const conSesion = await datosBeta({ sesiones: [] });
  conSesion.sesiones.push(sesionInventada(conSesion, "tuesday-push", "2026-11-01T18:00:00"));
  const exp = copias.construirExportacion(conSesion, ms("2026-11-04T10:00:00"));
  const claves = Object.keys(exp.settings).sort().join();
  caso(claves === "timerAlert,timerNotification,timerSound,transitionMinutes" && typeof exp.settings.timerAlert === "boolean" && typeof exp.settings.transitionMinutes === "number",
    `L6 settings con 4 claves exactas y de su tipo (${claves})`);
  const entradas = exp.days.flatMap((d) => d.exercises);
  const prPorId = new Map();
  let prMismo = true;
  for (const en of entradas) {
    if (prPorId.has(en.exerciseId) && prPorId.get(en.exerciseId) !== en.pr) prMismo = false;
    prPorId.set(en.exerciseId, en.pr);
  }
  caso(entradas.every((en) => en.pr === null || typeof en.pr === "number") && prMismo, "L6 todos los pr son número o null, iguales en todas las apariciones");
  caso(entradas.every((en) => Number.isInteger(en.series) && typeof en.reps === "string" && /^\d+:\d{2}$/.test(en.rest)), "L6 series entero, reps texto y rest m:ss");
  caso(Array.isArray(exp.beta?.sesiones) && exp.beta.sesiones.length === 1 && exp.beta.version === VERSION && exp.gymApp === true && exp.version === 1,
    "L6 la clave beta lleva las sesiones y la versión");
  caso(Object.keys(exp).join() === "gymApp,version,exportedAt,settings,days,beta", `L6 orden de las claves: ${Object.keys(exp).join(", ")}`);
  caso(copias.nombreArchivo(new Date(2026, 10, 4, 9, 5).getTime()) === "gym-beta-copia-2026-11-04-0905.json", "L6 nombre del archivo con la fecha local");
  const vuelta = await copias.leerCopia(JSON.stringify(exp), { actuales: null, ahoraMs: 5 });
  const limpio = (d) => { const c = structuredClone(d); delete c.rev; delete c.origen; delete c.copia; delete c.creado; delete c.actualizado; c.marcas = c.marcas.map((m) => ({ ...m, fecha: 0 })); return c; };
  const iguales = vuelta.ok && JSON.stringify(limpio(vuelta.datosNuevos)) === JSON.stringify(limpio({ ...conSesion, marcas: conSesion.marcas }));
  caso(iguales, `L6 ida y vuelta: leer la exportación da los mismos datos${vuelta.ok ? "" : ` (${vuelta.error})`}`);
  if (!iguales && vuelta.ok) {
    const a = limpio(vuelta.datosNuevos);
    const b = limpio(conSesion);
    for (const k of Object.keys(b)) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) nota(`difiere «${k}»: ${JSON.stringify(a[k]).slice(0, 160)} ≠ ${JSON.stringify(b[k]).slice(0, 160)}`);
  }

  // L7 copias malas
  for (const [nombre, [texto, mensaje]] of Object.entries(COPIAS_MALAS)) {
    const lr = await copias.leerCopia(texto, { actuales: null, ahoraMs: 1, cargar: async () => ({ rutina, ejercicios }) });
    caso(!lr.ok && lr.error === mensaje, `L7 ${nombre}: «${lr.error}»`);
  }
  const grande = await copias.leerCopia(new Blob(["x".repeat(5 * 1024 * 1024 + 10)]), { ahoraMs: 1 });
  caso(!grande.ok && grande.error === "El archivo es demasiado grande (más de 5 MB).", `L7 más de 5 MB: «${grande.error}»`);
  const sinRed = await copias.leerCopia(JSON.stringify(diffs.N2), { ahoraMs: 1, cargar: async () => { throw new Error("sin red"); } });
  caso(!sinRed.ok && sinRed.error === "Para cargar este tipo de copia hace falta conexión.", `L7 diff antiguo sin red: «${sinRed.error}»`);
  const diffBueno = await copias.leerCopia(JSON.stringify({ ...diffs.N2, exercises: { ...diffs.N2.exercises, "calf-raise": { pr: 9 } } }), { ahoraMs: 1, cargar: async () => ({ rutina, ejercicios }) });
  caso(diffBueno.ok && diffBueno.resumen.de === "copia antigua" && diffBueno.datosNuevos.ejercicios["pec-deck"].pr === 50 && diffBueno.avisos.some((a) => a.includes("calf-raise")),
    "L7 un diff antiguo se lee y avisa de los ids que ya no existen");

  // L8 sesión
  const d8 = await datosBeta();
  const s0 = S.empezarSesion("tuesday-push", ms("2026-11-03T18:00:00"));
  const p0 = S.valoresPropuestos(d8, s0, "tuesday-push", "machine-chest-press", 0);
  caso(p0.kg === 80 && p0.reps === 8 && p0.origen === "marca", `L8 sin historial: la marca y el mínimo del rango (${p0.kg} × ${p0.reps})`);
  const sinMarca = structuredClone(d8);
  sinMarca.ejercicios["machine-chest-press"].pr = null;
  const p6 = S.valoresPropuestos(sinMarca, s0, "tuesday-push", "machine-chest-press", 0);
  caso(p6.kg === 0 && p6.faltaPeso, "L8 sin marca ni historial: 0 kg y «Pon el peso»");
  const conHist = structuredClone(d8);
  const ses = sesionInventada(conHist, "tuesday-push", "2026-10-27T18:00:00", { extra: 2.5 });
  ses.ejercicios[0].series[1].reps = 9;
  conHist.sesiones.push(ses);
  const p2 = S.valoresPropuestos(conHist, s0, "tuesday-push", "machine-chest-press", 1);
  caso(p2.kg === 82.5 && p2.reps === 9, `L8 la serie 2 de la última vez de ese día (${p2.kg} × ${p2.reps})`);
  const s1 = S.marcarSerie(s0, "machine-chest-press", { kg: 85, reps: 8 }, ms("2026-11-03T18:05:00"));
  const p3 = S.valoresPropuestos(conHist, s1, "tuesday-push", "machine-chest-press", 1);
  caso(p3.kg === 85 && p3.reps === 9, `L8 con una serie hoy, el peso sigue el de hoy y las repeticiones las de la última vez (${p3.kg} × ${p3.reps})`);
  const otroDia = structuredClone(d8);
  otroDia.sesiones.push(sesionInventada(otroDia, "sunday-upper", "2026-11-01T18:00:00", { extra: 5 }));
  const p4 = S.valoresPropuestos(otroDia, s0, "tuesday-push", "machine-chest-press", 0);
  caso(p4.kg === 85 && p4.reps === 8 && p4.origen === "ultima", `L8 sin historial de ese día: el peso de la última vez en otro día y el mínimo del rango (${p4.kg} × ${p4.reps})`);
  const conElegido = { ...s0, pesoElegido: { "machine-chest-press": 87.5 } };
  const p1 = S.valoresPropuestos(conHist, conElegido, "tuesday-push", "machine-chest-press", 0);
  caso(p1.kg === 87.5, `L8 la sugerencia aceptada manda en el peso de la primera serie (${p1.kg})`);
  const s1b = S.marcarSerie(s0, "machine-chest-press", { kg: 70, reps: 12 }, 1);
  const p5 = S.valoresPropuestos(d8, s1b, "tuesday-push", "machine-chest-press", 1);
  caso(p5.kg === 70 && p5.reps === 12, `L8 sin historial, la serie anterior de hoy (${p5.kg} × ${p5.reps})`);

  const sFin = S.marcarSerie(S.marcarSerie(s0, "machine-chest-press", { kg: 82.5, reps: 10 }, 1), "pec-deck", { kg: 40, reps: 12 }, 2);
  const t1 = S.terminarSesion(d8, sFin, ms("2026-11-03T19:00:00"));
  caso(t1.datos.ejercicios["machine-chest-press"].pr === 82.5 && t1.datos.marcas.some((m) => m.motivo === "sesion" && m.exerciseId === "machine-chest-press" && m.sesionId === sFin.id)
    && t1.datos.ejercicios["pec-deck"].pr === 47 && t1.marcasNuevas.length === 1 && t1.datos.sesiones.length === 1,
  "L8 terminar sube la marca que se supera (con su entrada «sesion») y deja igual la que no");
  caso(t1.guardada.seriesPlan === 23 && t1.guardada.ejercicios.length === 2, `L8 la sesión guardada lleva ${t1.guardada.seriesPlan} series planificadas y solo los ejercicios con series`);
  const borrada = S.borrarSesion(t1.datos, sFin.id);
  caso(borrada.sesiones.length === 0 && borrada.ejercicios["machine-chest-press"].pr === 80, `L8 borrar la sesión rehace la marca (${borrada.ejercicios["machine-chest-press"].pr})`);
  const mejor = S.mejorSerie([{ kg: 80, reps: 10 }, { kg: 82.5, reps: 6 }, { kg: 82.5, reps: 8 }], "peso");
  caso(mejor.kg === 82.5 && mejor.reps === 8 && S.e1rm(80, 10) === 106.5 && S.e1rm(100, 1) === 100, "L8 mejor serie (82,5 × 8) y 1RM estimado (80 × 10 → 106,5)");
  const res = S.resumenSesion(t1.datos, t1.guardada);
  caso(res.hechas === 2 && res.plan === 23 && res.volumen === 82.5 * 10 + 40 * 12 && res.marcas.length === 1, `L8 resumen: ${res.hechas} de ${res.plan} series, volumen ${res.volumen}`);
  const dia8 = d8.dias.find((d) => d.id === "tuesday-push");
  const pos = { ...s0, pospuestos: ["pec-deck"] };
  caso(S.siguientePendiente(dia8, pos, "machine-chest-press") === "machine-shoulder-press", "L8 el siguiente pendiente salta los pospuestos");
  const casiTodo = structuredClone(s0);
  for (const en of dia8.ejercicios) if (en.exerciseId !== "pec-deck") casiTodo.ejercicios[en.exerciseId] = Array.from({ length: en.series }, () => ({ kg: 1, reps: 1, t: 1 }));
  casiTodo.pospuestos = ["pec-deck"];
  caso(S.siguientePendiente(dia8, casiTodo, "cable-external-rotation") === "pec-deck", "L8 cuando solo queda lo pospuesto, toca lo pospuesto");
  caso(S.abandonada({ ultimoCambio: ms("2026-11-02T22:00:00") }, ms("2026-11-03T08:00:00")) && !S.abandonada({ ultimoCambio: ms("2026-11-03T17:00:00") }, ms("2026-11-03T18:00:00")),
    "L8 sesión abandonada: de otro día sí; de hace 1 h no");

  // Qué día se abre
  const hoyMartes = S.elegirDia(d8, null, {}, ms("2026-11-03T18:00:00"), "2026-11-03");
  const hoyLunes = S.elegirDia(d8, null, {}, ms("2026-11-02T18:00:00"), "2026-11-02");
  const elegidoHoy = S.elegirDia(d8, null, { diaElegido: { id: "sunday-upper", fecha: "2026-11-03" } }, ms("2026-11-03T18:00:00"), "2026-11-03");
  const elegidoAyer = S.elegirDia(d8, null, { diaElegido: { id: "sunday-upper", fecha: "2026-11-02" } }, ms("2026-11-03T18:00:00"), "2026-11-03");
  caso(hoyMartes.diaId === "tuesday-push" && hoyLunes.motivo === "descanso" && hoyLunes.diaId === "tuesday-push" && hoyLunes.proximoDiaSemana === 2
    && elegidoHoy.diaId === "sunday-upper" && elegidoAyer.diaId === "tuesday-push",
  "elegirDia: el martes abre Push; el lunes, descanso con próximo el martes; lo elegido hoy manda y lo de ayer no");

  // L9 migrar con una cadena falsa
  const cadena = { 0: (d) => ({ ...d, nuevo: true }) };
  const migrado = modelo.migrar({ esquema: 0, viejo: 1 }, cadena, 1);
  let sinPaso = false;
  try {
    modelo.migrar({ esquema: 0 }, {}, 1);
  } catch {
    sinPaso = true;
  }
  caso(migrado.esquema === 1 && migrado.nuevo === true && migrado.viejo === 1 && sinPaso, "L9 migrar del esquema 0 al 1 con una cadena falsa (y error si falta un paso)");

  // L10 sugerencia
  const d10 = await datosBeta();
  const sub = sesionInventada(d10, "tuesday-push", "2026-10-27T18:00:00", { reps: 12 });
  d10.sesiones.push(sub);
  const sg = S.sugerencia(d10, "tuesday-push", "machine-chest-press");
  caso(sg?.tipo === "subir" && sg.kg === 82.5 && sg.porque === "La última vez llegaste a 12 en todas las series.", `L10 todas al máximo: «Prueba ${sg?.kg} kg» (${sg?.porque})`);
  const d10b = await datosBeta();
  const baja = sesionInventada(d10b, "tuesday-push", "2026-10-27T18:00:00", { reps: 10 });
  baja.ejercicios[0].series[2].reps = 6;
  d10b.sesiones.push(baja);
  const sm = S.sugerencia(d10b, "tuesday-push", "machine-chest-press");
  caso(sm?.tipo === "mantener" && sm.kg === 80, `L10 alguna por debajo del mínimo: «Mantén ${sm?.kg} kg»`);
  caso(S.sugerencia(d10b, "tuesday-push", "pec-deck") === null && S.sugerencia(d10b, "sunday-upper", "machine-chest-press") === null,
    "L10 en el rango sin llegar al máximo, o sin historial de ese día: ninguna sugerencia");

  // Recordatorio de copia
  const dc = await datosBeta();
  dc.copia = { ultima: ms("2026-10-26T10:00:00"), metodo: "descargada" };
  dc.actualizado = ms("2026-10-30T10:00:00");
  caso(copias.necesitaCopia(dc, ms("2026-11-03T18:00:00")) === "Hace 8 días que no guardas una copia de la beta."
    && copias.necesitaCopia(dc, ms("2026-11-03T18:00:00"), ms("2026-11-04T00:00:00")) === null
    && copias.necesitaCopia({ ...dc, actualizado: dc.copia.ultima }, ms("2026-11-03T18:00:00")) === null,
  "Recordatorio de copia: a los 8 días con cambios sí; pospuesto o sin cambios, no");

  // Volver a copiar desde la normal y cargar copias: lo que se conserva
  const actuales = await datosBeta();
  actuales.sesiones.push(sesionInventada(actuales, "tuesday-push", "2026-11-01T18:00:00"));
  actuales.ejercicios["pec-deck"].notas = "Asiento 3";
  actuales.ejercicios["pec-deck"].incremento = 5;
  const snapN2b = normal.fusionarComoLaNormal(diffs.N2, rutina, ejercicios);
  const nuevos = normal.datosDesdeSnapshot(snapN2b, { origen: "normal", ahoraMs: 9, ejerciciosBase: ejercicios }).datos;
  const recopiado = normal.aplicarRecopia(actuales, nuevos, 9);
  caso(recopiado.sesiones.length === 1 && recopiado.ejercicios["pec-deck"].pr === 50 && recopiado.ejercicios["pec-deck"].notas === "Asiento 3"
    && recopiado.ejercicios["pec-deck"].incremento === 5 && recopiado.marcas.some((m) => m.exerciseId === "pec-deck" && m.kg === 50 && m.motivo === "copia"),
  "aplicarRecopia conserva el historial, las notas y el incremento, y apunta la marca que cambia");
  const leidaNormal = await copias.leerCopia(JSON.stringify(normal.fusionarComoLaNormal(diffs.N2, rutina, ejercicios)), { actuales, ahoraMs: 9 });
  const cargada = copias.aplicarCopia(actuales, leidaNormal, 9);
  caso(leidaNormal.ok && !leidaNormal.traeHistorial && cargada.sesiones.length === 1 && cargada.ejercicios["pec-deck"].notas === "Asiento 3"
    && cargada.marcas.some((m) => m.motivo === "importada" && m.exerciseId === "pec-deck") && cargada.origen.tipo === "importado",
  "aplicarCopia sin historial conserva sesiones, notas y apunta las marcas «importada»");
  const expActual = copias.construirExportacion(actuales, 10);
  const otros = await datosBeta();
  const leidaBeta = await copias.leerCopia(JSON.stringify(expActual), { actuales: otros, ahoraMs: 11 });
  const cargadaBeta = copias.aplicarCopia(otros, leidaBeta, 11);
  caso(leidaBeta.traeHistorial && cargadaBeta.sesiones.length === 1 && cargadaBeta.ejercicios["pec-deck"].notas === "Asiento 3",
    "aplicarCopia con una copia de la beta sustituye el historial y trae las notas");

  // Tiempo restante
  const dr = await datosBeta();
  const diaR = dr.dias.find((d) => d.id === "tuesday-push");
  const restoInicio = modelo.tiempoRestante(diaR, null, dr.ajustes);
  caso(restoInicio === 920 + 1440 + 8 * 120, `tiempoRestante sin empezar: ${restoInicio} s (trabajo, descansos y un cambio por ejercicio)`);

  await correcciones({ caso, util, modelo, normal, copias, S, rutina, ejercicios });
}

// Lo arreglado en la 0.2.0 tras las revisiones (cada caso dice qué comprueba).
async function correcciones({ caso, util, modelo, normal, copias, S, rutina, ejercicios }) {
  const cargar = async () => ({ rutina: structuredClone(rutina), ejercicios: structuredClone(ejercicios) });
  const piezas = await import("/beta/js/ui/piezas.js");

  // Sesión abandonada: solo cuenta el tiempo (pasada la medianoche sigue la misma sesión).
  caso(!S.abandonada({ ultimoCambio: ms("2026-11-03T23:50:00") }, ms("2026-11-04T00:02:00"))
    && S.abandonada({ ultimoCambio: ms("2026-11-03T17:00:00") }, ms("2026-11-03T23:30:00")),
  "abandonada: 12 min pasada la medianoche no; más de 6 h sí");

  // Fechas imposibles: se enseñan como «—» en vez de romper la pantalla.
  caso(util.fechaCorta(1e17) === "—" && util.diaMes("ayer") === "—" && util.hora(NaN) === "—" && util.haceDias(1e17, 1) === "—" && util.diaMes(ms("2026-11-01T10:00:00")) === "1 nov",
    "fechas no válidas → «—» (fechaCorta, diaMes, hora y haceDias)");

  // Copias de la beta con sesiones, marcas y apuntes raros: se saltan CON aviso y se guardan aparte.
  const d0 = await datosBeta();
  d0.sesiones = [sesionInventada(d0, "tuesday-push", "2026-10-27T18:00:00", { id: "s-buena" })];
  // (La exportación comparte listas con los datos: se clona para no tocar d0 al meterle cosas raras.)
  const raro = structuredClone(copias.construirExportacion(d0, ms("2026-11-03T10:00:00")));
  raro.beta.sesiones.push({ id: 5, diaId: null }, { ...raro.beta.sesiones[0], id: "s-nombre", diaNombre: 5 }, { ...raro.beta.sesiones[0], id: "s-fecha", inicio: 1e17, fin: 1e17 + 1 });
  raro.beta.marcas.push({ exerciseId: "pec-deck", kg: "mucho", fecha: 1 });
  raro.beta.apuntes = [{ id: "a-1", fecha: "ayer", pantalla: "ajustes", version: "0.1.0", texto: "hola" }, { id: "a-2", fecha: ms("2026-11-02T10:00:00"), texto: "vale" }];
  const lr = await copias.leerCopia(JSON.stringify(raro), { actuales: d0, ahoraMs: 5, cargar });
  caso(lr.ok && lr.datosNuevos.sesiones.length === 1 && lr.raros.sesiones === 3 && lr.raros.marcas === 1 && lr.raros.apuntes === 1
    && lr.avisos.includes("3 sesiones, 1 cambio de marca y 1 apunte con datos raros no se cargan; se guardan aparte.")
    && lr.datosNuevos.descartado.length === 5 && lr.datosNuevos.apuntes.length === 1 && lr.datosNuevos.apuntes[0].pantalla === "",
  `copia con datos raros: se saltan con aviso y van a «descartado» (${JSON.stringify(lr.raros)}; ${lr.avisos?.at(-1)})`);
  const reparados = modelo.reparar({ ...d0, sesiones: [...d0.sesiones, { ...d0.sesiones[0], id: "s-mala", diaNombre: 3 }], apuntes: [{ texto: "x", fecha: "nunca" }] });
  caso(reparados.datos.sesiones.length === 1 && reparados.datos.descartado.length === 2 && reparados.avisos[0] === "1 sesión con datos raros no se muestra.",
    "reparar aparta también las sesiones con diaNombre raro y los apuntes sin fecha");

  // Copias antiguas (diff): casi vacías → no parecen una copia; formas raras → sin mensajes técnicos en inglés.
  for (const texto of ['{"days": {}}', '{"exercises": {"foo": 1}}', '{"dayOrder": []}', '{"daysAdded": [null]}']) {
    const r = await copias.leerCopia(texto, { ahoraMs: 1, cargar });
    caso(!r.ok && r.error === copias.TEXTO_NO_PARECE, `diff casi vacío ${texto}: «${r.error ?? "se acepta"}»`);
  }
  const conOrdenRaro = await copias.leerCopia('{"days": {"tuesday-push": {"exerciseOrder": 5}}}', { ahoraMs: 1, cargar });
  const conRemovedRaro = await copias.leerCopia('{"days": {"tuesday-push": {"removed": 7}}}', { ahoraMs: 1, cargar });
  const espanol = (r) => (r.ok ? r.avisos : [r.error]).every((t) => !/(is not|Cannot|property|undefined|iterable)/.test(t));
  caso(conOrdenRaro.ok && conRemovedRaro.ok && espanol(conOrdenRaro) && espanol(conRemovedRaro) && conRemovedRaro.sinCambios
    && conOrdenRaro.avisos.some((t) => t.includes("forma rara")),
  `diff con formas raras: se sanean con aviso en español y, si no queda nada, «sin cambios» (${conOrdenRaro.avisos?.[0]})`);
  caso((await copias.leerCopia(JSON.stringify((await diffsNormal()).N2), { ahoraMs: 1, cargar })).sinCambios === false, "un diff con cambios de verdad no sale como «sin cambios»");

  // Lo que llega de la normal: recortes con aviso, ajuste al límite y rutas de imagen relativas.
  const largo = normal.datosDesdeSnapshot({
    days: [{
      id: "d1", label: "Martes", title: "T".repeat(90), subtitle: "",
      exercises: [
        { exerciseId: "a", name: "Uno", image: "images/pec-deck.png", muscleGroup: "Pecho", pr: 10, series: 12, reps: "8-12", rest: "12:00" },
        { exerciseId: "b", name: "Dos", image: "null", muscleGroup: "", pr: null, series: 3, reps: "10", rest: "1:00" },
      ],
    }],
  }, { origen: "importado", ahoraMs: 1, modo: "importar" });
  const ea = largo.datos.dias[0].ejercicios[0];
  caso(largo.datos.dias[0].title.length === 80 && largo.avisos.some((t) => t.includes("se ha recortado a 80 letras")) && ea.series === 10 && ea.rest === "10:00"
    && largo.datos.ejercicios.a.image === "images/pec-deck.png" && largo.datos.ejercicios.b.image === "",
  `de la normal: recorte con aviso, 12 series → 10, «12:00» → 10:00, imagen relativa conservada (${ea.series}, ${ea.rest}, «${largo.datos.ejercicios.a.image}»)`);
  caso(modelo.normalizarImagen("javascript:alert(1)") === "" && modelo.normalizarImagen("../images/x.webp") === "../images/x.webp" && modelo.normalizarImagen("undefined") === "",
    "normalizarImagen: nada de «javascript:», sí rutas relativas, «undefined» vacío");

  // El tema de la normal: si nunca se eligió, la normal se ve oscura y la beta copia «oscuro».
  const temaAntes = localStorage.getItem("gym-theme-v1");
  localStorage.removeItem("gym-theme-v1");
  const sinTema = normal.leerTemaNormal();
  localStorage.setItem("gym-theme-v1", "light");
  const claro = normal.leerTemaNormal();
  if (temaAntes == null) localStorage.removeItem("gym-theme-v1"); else localStorage.setItem("gym-theme-v1", temaAntes);
  caso(sinTema === "oscuro" && claro === "claro", `tema de la normal: sin elegir → ${sinTema}; «light» → ${claro}`);

  // Las dos versiones a la vez: qué cambia, qué bajaría y quedarse con la marca más alta.
  caso(normal.huellaTexto('{"a":1}') === normal.huellaTexto('{"a":1}') && normal.huellaTexto('{"a":1}') !== normal.huellaTexto('{"a":2}') && normal.huellaTexto(null) === "vacia",
    "huella de los datos de la normal: igual con el mismo texto y distinta si cambia");
  const beta = await datosBeta({ cambios: (d) => { d.ejercicios["pec-deck"].pr = 60; d.ejercicios["leg-press"].pr = null; } });
  const laNormal = normal.datosDesdeSnapshot(normal.fusionarComoLaNormal({ exercises: { "lat-pulldown": { pr: 55 } } }, rutina, ejercicios), { origen: "normal", ahoraMs: 1, ejerciciosBase: ejercicios }).datos;
  const cmp = normal.compararConNormal(beta, laNormal);
  caso(cmp.marcas.length === 3 && cmp.marcas.some((m) => m.id === "lat-pulldown" && m.beta === 52 && m.normal === 55) && cmp.soloNormal.length === 0,
    `compararConNormal: ${cmp.marcas.map((m) => `${m.id} ${m.beta}/${m.normal}`).join(", ")}`);
  const efecto = normal.efectoEnLaNormal(beta, laNormal, ejercicios);
  caso(efecto.bajan.some((m) => m.id === "lat-pulldown" && m.de === 55 && m.a === 52) && efecto.publicadas.some((m) => m.id === "leg-press" && m.kg === 73),
    "efectoEnLaNormal: la marca de la normal que bajaría y la que saldría con la publicada");
  const bajan = normal.marcasQueBajan(beta, laNormal);
  const conMax = normal.aplicarRecopia(beta, laNormal, 9, { quedarseMaxima: true });
  const sinMax = normal.aplicarRecopia(beta, laNormal, 9);
  caso(bajan.some((m) => m.id === "pec-deck" && m.de === 60 && m.a === 47) && conMax.ejercicios["pec-deck"].pr === 60 && conMax.ejercicios["lat-pulldown"].pr === 55
    && sinMax.ejercicios["pec-deck"].pr === 47,
  "volver a copiar: dice qué marcas bajan y, con «quedarse con la más alta», no baja ninguna");

  // Mensajes de los campos de una serie, uno por caso (y 0 kg con peso es que falta el peso).
  caso(piezas.errorPeso(1000) === "Como mucho 999,5 kg." && piezas.errorPeso(0) === piezas.TEXTO_PON_EL_PESO && piezas.errorPeso(null) === "Escribe un número, por ejemplo 82,5"
    && piezas.errorPeso(-5) === "El peso no puede ser negativo." && piezas.errorPeso(80) === ""
    && piezas.errorReps(250, "peso") === "Entre 0 y 200 repeticiones." && piezas.errorReps(700, "tiempo") === "Entre 0 y 600 segundos." && piezas.errorReps(8.5, "peso").startsWith("Escribe un número entero"),
  "mensajes de error de peso y repeticiones, uno por caso");
  caso(piezas.textoBotonHecha(0, 10, "peso") === "Pon el peso" && piezas.textoBotonHecha(80, 10, "peso") === "Hecha · 80 kg × 10" && piezas.textoBotonHecha(null, 30, "tiempo") === "Hecha · 30 s",
    "el ✓ dice «Pon el peso» mientras falta");

  // «Deshacer» de un cambio de datos: solo si no ha habido otro después (no se lleva por delante lo de después).
  const almacen = await import("/beta/js/almacen.js");
  const textoAntes = localStorage.getItem("gym-beta-datos");
  localStorage.setItem("gym-beta-datos", JSON.stringify(await datosBeta()));
  almacen.cargarDatos();
  const deshacer1 = almacen.mutar((d) => { d.dias[0].title = "Uno"; });
  almacen.mutar((d) => { d.dias[1].title = "Dos"; });
  const viejo = deshacer1();
  const deshacer3 = almacen.mutar((d) => { d.dias[2].title = "Tres"; });
  const reciente = deshacer3();
  const final = JSON.parse(localStorage.getItem("gym-beta-datos"));
  caso(viejo === false && reciente === true && final.dias[0].title === "Uno" && final.dias[1].title === "Dos" && final.dias[2].title === "Pull",
    "deshacer de datos: si hubo otro cambio después no restaura nada (false); el último sí");
  // Si otra ventana guarda datos de una versión más nueva (esquema mayor), esta deja de escribir para no pisarlos.
  const masNuevo = { ...(await datosBeta()), esquema: 99, rev: 500 };
  localStorage.setItem("gym-beta-datos", JSON.stringify(masNuevo));
  const deshacerB = almacen.mutar((d) => { d.dias[0].title = "No"; });
  const sigue = JSON.parse(localStorage.getItem("gym-beta-datos"));
  caso(sigue.esquema === 99 && sigue.dias[0].title === "Push" && almacen.bloqueado() && deshacerB() === false,
    "con datos de una versión más nueva guardados por otra ventana, esta no escribe nada encima");
  almacen.borrarTodoBeta();
  if (textoAntes == null) localStorage.removeItem("gym-beta-datos"); else localStorage.setItem("gym-beta-datos", textoAntes);

  // Un descanso de 0 s no empieza nada.
  const descanso = await import("/beta/js/descanso.js");
  caso(descanso.empezarDescanso({ exerciseId: "x", diaId: "d", nombre: "X", texto: "t", duracion: 0 }) === null && !localStorage.getItem("gym-beta-descanso"),
    "empezarDescanso con 0 s no empieza ningún descanso");
}
