// Datos de prueba: solo inventados o sacados de data/*.json (públicos). Nunca datos reales de nadie.

export const HORA = {
  martes: "2026-11-03T18:00:00",
  lunes: "2026-11-02T18:00:00",
  miercoles: "2026-11-04T18:00:00",
};

export const ms = (texto) => new Date(texto).getTime();

let baseCache = null;
export async function base() {
  if (!baseCache) {
    const [rutina, ejercicios] = await Promise.all([
      fetch("/data/routine.json", { cache: "no-store" }).then((r) => r.json()),
      fetch("/data/exercises.json", { cache: "no-store" }).then((r) => r.json()),
    ]);
    baseCache = { rutina, ejercicios };
  }
  return structuredClone(baseCache);
}

// Pone todas las imágenes de la normal en local (para no ir a internet en las pruebas) sin quitar lo del diff.
export async function conImagenesLocales(diff = {}) {
  const { ejercicios } = await base();
  const d = structuredClone(diff);
  d.exercises ||= {};
  for (const e of ejercicios) d.exercises[e.id] = { image: "/images/icon.svg", ...(d.exercises[e.id] || {}) };
  return d;
}

// Los ocho diffs inventados de la normal (casos N1-N8 de la especificación).
export async function diffsNormal() {
  const { rutina } = await base();
  const martes = rutina.days.find((d) => d.id === "tuesday-push").exercises.map((e) => e.exerciseId).filter((id) => id !== "scaption-dumbbells");
  return {
    N1: {},
    N2: { exercises: { "pec-deck": { pr: 50 }, "leg-press": { pr: "" }, "seated-leg-curl": { pr: 0 } } },
    N3: { days: { "tuesday-push": { label: "Martes bis", title: "Empuje", removed: ["scaption-dumbbells"], exerciseOrder: [...martes].reverse() } } },
    // Orden inventado: el de la rutina publicada al revés, con el curl al final.
    N4: {
      days: {
        "sunday-upper": {
          order: {
            "cable-external-rotation": 0, "rope-triceps-pushdown": 1, "reverse-pec-deck": 2, "scaption-dumbbells": 3, "machine-shoulder-press": 4,
            "seated-row-cable": 5, "lat-pulldown": 6, "pec-deck": 7, "machine-chest-press": 8, "incline-dumbbell-curl": 9,
          },
        },
      },
    },
    N5: {
      exercises: { "custom-x": { id: "custom-x", name: "Remo con mancuerna inventado", image: "", muscleGroup: "Espalda", pr: 20 } },
      days: {
        "thursday-pull": {
          addedExercises: [
            { exerciseId: "custom-x", series: 3, reps: "10-12", rest: "1:30" },
            { exerciseId: "leg-press", series: 3, reps: "8-12", rest: "2:00" },
          ],
        },
        "wednesday-lower-a": { addedExercises: [{ exerciseId: "crunches", series: 2, reps: "8-15", rest: "1:30" }] },
      },
    },
    N6: {
      daysAdded: [{
        id: "day-abc12345", label: "Viernes", title: "Brazos", subtitle: "Extra",
        exercises: [
          { exerciseId: "hammer-curl-alternate", series: 3, reps: "10-12", rest: "1:30" },
          { exerciseId: "rope-triceps-pushdown", series: 3, reps: "10-15", rest: "1:15" },
        ],
      }],
      dayOrder: ["day-abc12345", "thursday-pull"],
      daysRemoved: ["saturday-lower-b"],
    },
    N7: { days: { "thursday-pull": { exercises: { "lat-pulldown": { series: 4, reps: "6-10", rest: "2:30" } } } } },
    N8: { settings: { timerAlert: true, timerSound: false, timerNotification: true, includeTransitionTime: false } },
  };
}

// Datos de la beta hechos a partir de data/*.json, con las imágenes vacías (sin red) y la hora fija.
export async function datosBeta({ sesiones = [], cambios = null, creado = ms("2026-10-20T10:00:00") } = {}) {
  const { rutina, ejercicios } = await base();
  const { fusionarComoLaNormal, datosDesdeSnapshot } = await import("/beta/js/normal.js");
  const snap = fusionarComoLaNormal({}, rutina, ejercicios);
  for (const d of snap.days) for (const e of d.exercises) e.image = "";
  const { datos } = datosDesdeSnapshot(snap, { origen: "base", ahoraMs: creado, ejerciciosBase: ejercicios });
  datos.sesiones = sesiones;
  datos.copia = { ultima: creado, metodo: "descargada" };
  if (cambios) cambios(datos);
  return datos;
}

// Una sesión terminada inventada de un día: cada ejercicio con sus series al peso de la marca (+ extra kg).
export function sesionInventada(datos, diaId, inicioTexto, { extra = 0, reps = null, soloPrimeros = null, id = null } = {}) {
  const dia = datos.dias.find((d) => d.id === diaId);
  const inicio = ms(inicioTexto);
  const lista = soloPrimeros ? dia.ejercicios.slice(0, soloPrimeros) : dia.ejercicios;
  let t = inicio;
  const ejercicios = lista.map((e) => {
    const x = datos.ejercicios[e.exerciseId];
    const series = [];
    for (let i = 0; i < e.series; i += 1) {
      t += 150000;
      series.push({ kg: x.tipo === "peso" ? (x.pr ?? 20) + extra : null, reps: reps ?? (x.tipo === "tiempo" ? 30 : 10), t });
    }
    return { exerciseId: e.exerciseId, nombre: x.name, tipo: x.tipo, plan: { series: e.series, reps: e.reps, rest: e.rest }, series };
  });
  return {
    id: id ?? `s-${inicio}-prue`,
    diaId,
    diaNombre: `${dia.label} · ${dia.title}`,
    inicio,
    fin: t + 60000,
    seriesPlan: dia.ejercicios.reduce((n, e) => n + e.series, 0),
    ejercicios,
  };
}

// Copias para importar, buenas y malas.
export const COPIAS_MALAS = {
  "JSON roto": ['{"days": [', "Este archivo no se puede leer: no es un JSON válido."],
  "objeto cualquiera": ['{"hola": 1}', "Este archivo no parece una copia del gimnasio."],
  "sin días": ['{"gymApp": true, "version": 1, "days": []}', "La copia no trae ningún día."],
  "día sin id": ['{"days": [{"label": "Martes", "exercises": []}]}', "La copia tiene un día sin identificador."],
  "ejercicio sin id": ['{"days": [{"id": "d1", "label": "Martes", "exercises": [{"name": "Algo"}]}]}', "La copia tiene un ejercicio sin identificador (día Martes)."],
  "beta más nueva": ['{"days": [{"id": "d1", "label": "Martes", "exercises": []}], "beta": {"esquema": 99}}', "Esta copia es de una versión más nueva de la beta. Actualiza la beta y vuelve a intentarlo."],
  "una lista": ["[1, 2, 3]", "Este archivo no parece una copia del gimnasio."],
};
