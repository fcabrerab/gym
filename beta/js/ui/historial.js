// Pantalla Historial: sesiones (con la tira de la semana) y ejercicios; el detalle de una sesión (borrar con
// deshacer) y el de un ejercicio (marca, mejor serie, 1RM estimado, gráfica SVG propia y cambios de marca).

import { h, svg, icono, vaciar } from "./dom.js";
import { avisarDeshacer, confirmar, abrirHoja } from "./avisos.js";
import { ctx } from "./contexto.js";
import { boton, control, ponerErrorControl, textoSerie, textoSeries, vacio, seccion, pasoEn, leerCamposEn } from "./piezas.js";
import * as almacen from "../almacen.js";
import * as S from "../sesion.js";
import { LIMITES, normalizarMarca } from "../modelo.js";
import { cargarBaseGuardada } from "../normal.js";
import {
  ahora, fechaCorta, fechaLarga, diaMes, hora, formatoKg, formatoNumero, formatoDuracion, leerNumero, redondear, limitar,
  diasEntre, INICIALES_DIA, ORDEN_SEMANA,
} from "../util.js";

const est = { limite: 50 };

const MOTIVOS = {
  copia: "copia de la versión normal",
  sesion: "sesión",
  "a-mano": "a mano",
  importada: "copia cargada",
};

function nombreCorto(sesion) {
  const nombre = typeof sesion.diaNombre === "string" ? sesion.diaNombre : "";
  return nombre.split(" · ").pop() || nombre || "Sesión";
}

function cabeceraDetalle(titulo, subtitulo = null) {
  return h("div", { class: "cabecera-detalle" },
    h("button", { class: "boton-volver", type: "button", "data-accion": "volver" }, icono("volver", { tamano: 20 }), h("span", null, "Volver")),
    h("h1", { class: "titulo-pantalla" }, titulo),
    subtitulo ? h("p", { class: "subtitulo-pantalla" }, subtitulo) : null);
}

export function pintarHistorial(contenedor, ruta) {
  if (ruta.nombre === "sesion") return pintarSesion(contenedor, ruta.param);
  if (ruta.nombre === "ejercicio") return pintarEjercicio(contenedor, ruta.param);
  const vista = ruta.nombre === "historial-ejercicios" ? "ejercicios" : "sesiones";
  const selector = h("div", { class: "selector", role: "group", "aria-label": "Qué ver" },
    h("button", { class: ["selector-opcion", vista === "sesiones" && "activa"], type: "button", "data-accion": "vista-sesiones", "aria-pressed": String(vista === "sesiones") }, "Sesiones"),
    h("button", { class: ["selector-opcion", vista === "ejercicios" && "activa"], type: "button", "data-accion": "vista-ejercicios", "aria-pressed": String(vista === "ejercicios") }, "Ejercicios"));
  const cuerpo = vista === "sesiones" ? listaSesiones() : listaEjercicios();
  vaciar(contenedor).append(h("div", { class: "pantalla-historial" }, h("h1", { class: "titulo-pantalla" }, "Historial"), selector, cuerpo));
  return undefined;
}

// --- Sesiones ---

function tiraSemana(datos, t) {
  const hoy = new Date(t);
  const deLunes = (hoy.getDay() + 6) % 7;
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - deLunes).getTime();
  const dias = ORDEN_SEMANA.map((w, i) => {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - deLunes + i).getTime();
    const hecho = datos.sesiones.some((s) => diasEntre(inicio, s.inicio) === 0);
    const esHoy = i === deLunes;
    return h("li", { class: ["tira-dia", hecho && "hecho", esHoy && "es-hoy"] },
      h("span", { class: "tira-letra" }, INICIALES_DIA[w]),
      h("span", { class: "tira-marca" }, hecho ? icono("check", { tamano: 18 }) : null),
      h("span", { class: "solo-lector" }, hecho ? " entreno hecho" : ""));
  });
  // Semanas seguidas con al menos una sesión (contando la actual solo si ya tiene alguna).
  const semana = 7 * 86400000;
  const tieneSemana = (desde) => datos.sesiones.some((s) => s.inicio >= desde && s.inicio < desde + semana);
  let n = 0;
  let desde = tieneSemana(lunes) ? lunes : lunes - semana;
  while (tieneSemana(desde) && n < 520) {
    n += 1;
    desde -= semana;
  }
  return h("div", { class: "tira" },
    h("p", { class: "tira-titulo" }, "Esta semana"),
    h("ol", { class: "tira-dias" }, dias),
    n > 0 ? h("p", { class: "tira-racha" }, n === 1 ? "1 semana seguida entrenando" : `${n} semanas seguidas entrenando`) : null);
}

function listaSesiones() {
  const datos = almacen.datos();
  const t = ahora();
  const sesiones = [...datos.sesiones].reverse();
  if (!sesiones.length) {
    return h("div", null, tiraSemana(datos, t), vacio("Aún no hay sesiones. Cuando termines tu primer entreno en la beta, aparecerá aquí."));
  }
  const filas = sesiones.slice(0, est.limite).map((s) => {
    const hechas = s.ejercicios.reduce((n, e) => n + e.series.length, 0);
    return h("li", null, h("button", { class: "fila", type: "button", "data-accion": "ver-sesion", "data-id": s.id },
      h("span", { class: "fila-textos" },
        h("span", { class: "fila-titulo" }, `${fechaCorta(s.inicio)} · ${nombreCorto(s)}`),
        h("span", { class: "fila-datos" }, `${formatoDuracion(s.fin - s.inicio)} · ${hechas}/${s.seriesPlan} series`)),
      icono("siguiente", { tamano: 20, clase: "fila-flecha" })));
  });
  return h("div", null,
    tiraSemana(datos, t),
    h("ul", { class: "lista-filas" }, filas),
    sesiones.length > est.limite ? boton("Ver más", "ver-mas", { clase: "boton-secundario boton-ancho" }) : null);
}

function pintarSesion(contenedor, id) {
  const datos = almacen.datos();
  const s = datos.sesiones.find((x) => x.id === id);
  if (!s) {
    vaciar(contenedor).append(h("div", { class: "pantalla-historial" }, cabeceraDetalle("Sesión"), vacio("Esta sesión ya no está en el historial.")));
    return;
  }
  const r = S.resumenSesion(datos, s);
  // Cada serie se puede tocar para corregirla (F36).
  const lista = s.ejercicios.map((e) => h("li", { class: "fila-estatica ejercicio-sesion" },
    h("button", { class: "fila-enlace fila-enlace-titulo", type: "button", "data-accion": "ver-ejercicio", "data-id": e.exerciseId },
      h("span", { class: "fila-titulo" }, e.nombre), icono("siguiente", { tamano: 20, clase: "fila-flecha" })),
    h("div", { class: "series-hechas series-pasadas" }, e.series.map((x, i) => h("button", {
      class: "pastilla-serie", type: "button", "data-accion": "corregir-serie", "data-id": e.exerciseId, "data-sesion": s.id, "data-indice": String(i),
      "aria-label": `Serie ${i + 1} de ${e.nombre}: ${textoSerie(x, e.tipo)}. Corregir`,
    }, textoSerie(x, e.tipo))))));
  const extra = [];
  if (r.volumen > 0) extra.push(`Volumen: ${formatoNumero(Math.round(r.volumen))} kg`);
  if (r.marcas.length) extra.push(r.marcas.length === 1 ? "1 marca nueva" : `${r.marcas.length} marcas nuevas`);
  vaciar(contenedor).append(h("div", { class: "pantalla-historial" },
    cabeceraDetalle(`${nombreCorto(s)} · ${fechaLarga(s.inicio)}`, `${hora(s.inicio)}–${hora(s.fin)} · ${formatoDuracion(s.fin - s.inicio)} · ${r.hechas}/${s.seriesPlan} series`),
    extra.length ? h("p", { class: "ayuda" }, extra.join(" · ")) : null,
    lista.length ? h("p", { class: "ayuda ayuda-corregir" }, "Toca una serie para corregirla.") : null,
    lista.length ? h("ul", { class: "lista-filas" }, lista) : vacio("Esta sesión no tiene series."),
    h("div", { class: "zona-borrar" }, h("button", { class: "boton boton-peligro-suave boton-ancho", type: "button", "data-accion": "borrar-sesion", "data-id": s.id },
      icono("papelera", { tamano: 20 }), h("span", null, "Borrar esta sesión")))));
}

async function borrarSesion(id) {
  const s = almacen.datos().sesiones.find((x) => x.id === id);
  if (!s) return;
  const ok = await confirmar({
    titulo: "Borrar la sesión",
    texto: `¿Borrar la sesión del ${fechaCorta(s.inicio)}? Se quitan sus series del historial y sus marcas.`,
    aceptar: "Borrar",
    peligro: true,
  });
  if (!ok) return;
  const deshacer = almacen.mutar((d) => S.borrarSesion(d, id));
  ctx.irA("#/historial", "replace");
  avisarDeshacer("Sesión borrada", deshacer, () => ctx.repintar());
}

// Corregir una serie de una sesión pasada (F36). La marca no cambia (la decides tú); la mejor serie y la
// gráfica salen del historial, así que se rehacen solas.
function corregirSerie(sesionId, exerciseId, indice) {
  const datos = almacen.datos();
  const s = datos.sesiones.find((x) => x.id === sesionId);
  const e = s?.ejercicios.find((x) => x.exerciseId === exerciseId);
  const serie = e?.series[indice];
  if (!serie) return;
  const x = { tipo: e.tipo, incremento: datos.ejercicios[exerciseId]?.incremento || 2.5 };
  const cuerpo = h("div", null,
    h("div", { class: "controles controles-hoja" },
      e.tipo === "peso" ? control({ campo: "kg", rotulo: "Peso", valor: formatoNumero(serie.kg ?? 0), unidad: "kg", inputmode: "decimal", id: exerciseId, intro: "next" }) : null,
      control({ campo: "reps", rotulo: e.tipo === "tiempo" ? "Segundos" : "Repeticiones", valor: String(serie.reps), unidad: e.tipo === "tiempo" ? "s" : "", inputmode: "numeric", id: exerciseId })),
    h("p", { class: "ayuda" }, "Corregir una serie pasada no cambia tu marca; la mejor serie y la gráfica sí se rehacen."),
    // Borrar va aparte, lejos de «Guardar».
    h("div", { class: "zona-borrar-hoja" },
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "borrar-serie-pasada" }, icono("papelera", { tamano: 20 }), h("span", null, "Borrar serie"))));
  const cambiarSerie = (fn) => almacen.mutar((d) => {
    const ss = d.sesiones.find((y) => y.id === sesionId);
    const ee = ss?.ejercicios.find((y) => y.exerciseId === exerciseId);
    if (!ee?.series[indice]) return;
    fn(ss, ee);
  });
  const hoja = abrirHoja({
    titulo: `Serie ${indice + 1} · ${e.nombre}`,
    cuerpo,
    pie: [boton("Guardar", "guardar-serie-pasada", { clase: "boton-principal boton-ancho" })],
    alAccion: (accion) => {
      if (/-(menos|mas)$/.test(accion)) {
        pasoEn(hoja.cuerpo, accion, x);
        return;
      }
      let deshacer = null;
      let texto = "";
      if (accion === "guardar-serie-pasada") {
        const v = leerCamposEn(hoja.cuerpo, x);
        if (!v.ok) return;
        deshacer = cambiarSerie((ss, ee) => { ee.series[indice] = { ...ee.series[indice], kg: e.tipo === "peso" ? v.kg : null, reps: v.reps }; });
        texto = `Serie ${indice + 1} corregida`;
      } else if (accion === "borrar-serie-pasada") {
        deshacer = cambiarSerie((ss, ee) => {
          ee.series.splice(indice, 1);
          if (!ee.series.length) ss.ejercicios = ss.ejercicios.filter((y) => y !== ee);
        });
        texto = `Serie ${indice + 1} borrada`;
      }
      if (!deshacer) return;
      hoja.cerrar().then(() => {
        ctx.repintar();
        avisarDeshacer(texto, deshacer, () => ctx.repintar());
      });
    },
  });
}

// --- Ejercicios ---

function listaEjercicios() {
  const datos = almacen.datos();
  const filas = Object.values(datos.ejercicios).map((x) => {
    const hist = S.historialEjercicio(datos, x.id);
    const ultima = hist.length ? hist[hist.length - 1].inicio : null;
    return { x, ultima, n: hist.length };
  }).filter((f) => f.ultima != null || f.x.pr != null)
    .sort((a, b) => (b.ultima ?? -1) - (a.ultima ?? -1) || a.x.name.localeCompare(b.x.name, "es"));
  if (!filas.length) return vacio("Aún no hay ejercicios con marca ni registros.");
  return h("ul", { class: "lista-filas" }, filas.map(({ x, ultima }) => {
    const partes = [];
    if (x.tipo === "peso" && x.pr != null) partes.push(`Marca ${formatoKg(x.pr)}`);
    partes.push(ultima ? `última vez ${diaMes(ultima)}` : "sin registros");
    return h("li", null, h("button", { class: "fila", type: "button", "data-accion": "ver-ejercicio", "data-id": x.id },
      h("span", { class: "fila-textos" }, h("span", { class: "fila-titulo" }, x.name), h("span", { class: "fila-datos" }, partes.join(" · "))),
      icono("siguiente", { tamano: 20, clase: "fila-flecha" })));
  }));
}

function pintarEjercicio(contenedor, id) {
  const datos = almacen.datos();
  const x = datos.ejercicios[id];
  if (!x) {
    vaciar(contenedor).append(h("div", { class: "pantalla-historial" }, cabeceraDetalle("Ejercicio"), vacio("Este ejercicio ya no está en la biblioteca.")));
    return;
  }
  const hist = S.historialEjercicio(datos, id);
  const todas = hist.flatMap((f) => f.series);
  const mejor = S.mejorSerie(todas, x.tipo);
  const marcas = datos.marcas.filter((m) => m.exerciseId === id);
  const ultimaMarca = marcas[marcas.length - 1];
  const dato = (rotulo, valor, pie = null, accion = null) => h("div", { class: "dato" },
    h("span", { class: "dato-rotulo" }, rotulo),
    h("span", { class: "dato-valor" }, valor),
    pie ? h("span", { class: "dato-pie" }, pie) : null,
    accion);
  const datosFila = [];
  if (x.tipo === "peso") {
    datosFila.push(dato("Marca", x.pr != null ? formatoKg(x.pr) : "—", x.pr != null && ultimaMarca ? `desde el ${diaMes(ultimaMarca.fecha)}` : null,
      h("button", { class: "boton boton-secundario boton-corto", type: "button", "data-accion": "cambiar-marca", "data-id": id }, "Cambiar")));
    datosFila.push(dato("Mejor serie", mejor ? `${formatoNumero(mejor.kg ?? 0)} × ${formatoNumero(mejor.reps)}` : "—"));
    const rm = mejor ? S.e1rm(mejor.kg, mejor.reps) : null;
    datosFila.push(dato("1RM estimado", rm ? formatoKg(rm) : "—", "Lo que podrías levantar una vez (cálculo de Epley)"));
  } else {
    datosFila.push(dato("Mejor serie", mejor ? textoSerie(mejor, x.tipo) : "—"));
    datosFila.push(dato("Sesiones", formatoNumero(hist.length)));
  }
  const sesiones = [...hist].reverse().map((f) => h("li", { class: "fila-estatica" },
    h("button", { class: "fila-enlace", type: "button", "data-accion": "ver-sesion", "data-id": f.sesionId },
      h("span", { class: "fila-titulo" }, `${diaMes(f.inicio)} · ${(f.diaNombre || "").split(" · ")[0]}`),
      h("span", { class: "fila-datos" }, textoSeries(f.series, x.tipo)))));
  const cambios = [...marcas].reverse().map((m) => h("li", { class: "fila-simple" },
    `${diaMes(m.fecha)} · ${m.kg != null ? formatoKg(m.kg) : "sin marca"} · ${MOTIVOS[m.motivo] || m.motivo || "—"}`));
  vaciar(contenedor).append(h("div", { class: "pantalla-historial" },
    cabeceraDetalle(x.name, [x.muscleGroup, x.tipo === "corporal" ? "peso corporal" : x.tipo === "tiempo" ? "por tiempo" : null].filter(Boolean).join(" · ") || null),
    h("div", { class: "datos-fila" }, datosFila),
    h("section", { class: "tarjeta" }, grafica(hist, x.tipo)),
    seccion("Sesiones", hist.length ? h("ul", { class: "lista-filas" }, sesiones) : vacio("Sin registros todavía.")),
    x.tipo === "peso" ? seccion("Cambios de marca", cambios.length ? h("ul", { class: "lista-simple" }, cambios) : vacio("Sin cambios de marca.")) : null));
}

function hojaMarca(id) {
  const datos = almacen.datos();
  const x = datos.ejercicios[id];
  if (!x) return;
  const cuerpo = h("div", { class: "controles controles-hoja" },
    control({ campo: "pr", rotulo: "Marca (kg)", valor: x.pr != null ? formatoNumero(x.pr) : "", unidad: "kg", inputmode: "decimal", id,
      etiquetaMenos: `Quitar ${formatoNumero(x.incremento || 2.5)} kg`, etiquetaMas: `Añadir ${formatoNumero(x.incremento || 2.5)} kg` }));
  // La marca publicada de este ejercicio: la normal no guarda «sin marca» al cargar una copia y pone esa.
  let publicada = null;
  cargarBaseGuardada().then((b) => { publicada = normalizarMarca(b.ejercicios.find((e) => e.id === id)?.pr); }).catch(() => {});
  const guardar = (kg) => {
    const antes = x.pr ?? null;
    if (kg === antes) {
      hoja.cerrar();
      return;
    }
    const deshacer = almacen.mutar((d) => S.cambiarMarca(d, id, kg, ahora(), "a-mano"));
    const texto = kg != null
      ? `Marca cambiada a ${formatoKg(kg)}`
      : publicada != null
        ? `Marca quitada. Si cargas una copia en la versión normal, allí saldrá la publicada (${formatoKg(publicada)}).`
        : "Marca quitada";
    hoja.cerrar().then(() => {
      ctx.repintar();
      avisarDeshacer(texto, deshacer, () => ctx.repintar());
    });
  };
  const hoja = abrirHoja({
    titulo: `Marca · ${x.name}`,
    cuerpo: [cuerpo, h("p", { class: "ayuda" }, "La marca la decides tú; la mejor serie sale de lo que apuntas."),
      // Quitar va aparte, lejos de «Guardar».
      h("div", { class: "zona-borrar-hoja" },
        h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "quitar-marca" }, icono("papelera", { tamano: 20 }), h("span", null, "Quitar marca")))],
    pie: [boton("Guardar", "guardar-marca", { clase: "boton-principal boton-ancho" })],
    alAccion: (accion) => {
      const campo = hoja.cuerpo.querySelector('[data-campo="pr"]');
      if (accion === "pr-menos" || accion === "pr-mas") {
        const n = leerNumero(campo.value) ?? 0;
        const paso = (x.incremento || 2.5) * (accion === "pr-mas" ? 1 : -1);
        campo.value = formatoNumero(limitar(redondear(n + paso, 0.25), 0, LIMITES.kgMax));
        ponerErrorControl(campo.closest(".control"), "");
      } else if (accion === "quitar-marca") {
        guardar(null);
      } else if (accion === "guardar-marca") {
        const texto = campo.value.trim();
        if (!texto) return guardar(null);
        const kg = leerNumero(texto);
        if (kg == null || kg <= 0 || kg > LIMITES.kgMax) {
          ponerErrorControl(campo.closest(".control"), "Escribe un número, por ejemplo 82,5, o déjalo vacío.");
          return undefined;
        }
        guardar(redondear(kg, 0.01));
      }
      return undefined;
    },
  });
}

// --- Gráfica (SVG propio) ---

function escala(min, max, tipo) {
  const pasos = tipo === "peso" ? [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200] : [1, 2, 5, 10, 20, 25, 50, 100];
  for (const p of pasos) {
    const a = Math.floor(min / p) * p;
    const b = Math.ceil(max / p) * p;
    const n = Math.round((b - a) / p);
    if (n === 0) return a - p >= 0 ? [a - p, a, a + p] : [a, a + p, a + 2 * p];
    if (n === 1) return a - p >= 0 && max - a < (b - min) ? [a - p, a, b] : [a, b, b + p];
    if (n === 2) return [a, a + p, b];
  }
  return [min, (min + max) / 2, max];
}

function grafica(hist, tipo) {
  const unidad = tipo === "peso" ? "kg" : tipo === "tiempo" ? "s" : "reps";
  const titulo = tipo === "peso" ? "Peso de la mejor serie (kg)" : tipo === "tiempo" ? "Segundos de la mejor serie" : "Repeticiones de la mejor serie";
  const puntos = hist.slice(-12).map((f) => ({ f, valor: tipo === "peso" ? f.mejor.kg ?? 0 : f.mejor.reps }));
  if (puntos.length < 2) {
    return h("div", null, h("h2", { class: "tarjeta-titulo" }, titulo), h("p", { class: "ayuda" }, "La gráfica aparece cuando haya al menos 2 sesiones con este ejercicio."));
  }
  const W = 360;
  const H = 176;
  const izq = 40;
  const der = 16;
  const arriba = 26;
  const abajo = 26;
  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const lineas = escala(min, max, tipo);
  const y0 = lineas[0];
  const y1 = lineas[lineas.length - 1];
  const x = (i) => izq + (i * (W - izq - der)) / (puntos.length - 1);
  const y = (v) => arriba + (H - arriba - abajo) * (1 - (v - y0) / (y1 - y0 || 1));
  const detalle = h("p", { class: "grafica-detalle", "aria-live": "polite" }, "Toca un punto para ver su sesión.");
  const textoPunto = (p) => {
    const m = p.f.mejor;
    return tipo === "peso" ? [`${fechaCorta(p.f.inicio)}: `, h("strong", null, formatoNumero(m.kg ?? 0)), ` × ${formatoNumero(m.reps)}`]
      : [`${fechaCorta(p.f.inicio)}: `, h("strong", null, formatoNumero(m.reps)), ` ${unidad}`];
  };
  const nodos = [];
  // Rejilla: tres líneas continuas en valores redondos, con su etiqueta a la izquierda.
  for (const v of lineas) {
    nodos.push(svg("line", { class: "grafica-rejilla", x1: izq, x2: W - der, y1: y(v), y2: y(v) }));
    nodos.push(svg("text", { class: "grafica-eje", x: izq - 8, y: y(v) + 4, "text-anchor": "end" }, formatoNumero(v)));
  }
  // Fechas: solo la primera y la última, dentro del alto.
  nodos.push(svg("text", { class: "grafica-eje", x: izq, y: H - 6, "text-anchor": "start" }, diaMes(puntos[0].f.inicio)));
  nodos.push(svg("text", { class: "grafica-eje", x: W - der, y: H - 6, "text-anchor": "end" }, diaMes(puntos[puntos.length - 1].f.inicio)));
  // Línea.
  nodos.push(svg("polyline", { class: "grafica-linea", points: puntos.map((p, i) => `${x(i)},${y(p.valor)}`).join(" ") }));
  // Puntos, cada uno con una zona invisible de toda su columna para tocarlo.
  const columna = (W - izq - der) / (puntos.length - 1);
  const grupos = puntos.map((p, i) => {
    const ancho = Math.max(24, columna);
    const etiqueta = tipo === "peso"
      ? `${fechaCorta(p.f.inicio)}: ${formatoNumero(p.f.mejor.kg ?? 0)} kilos por ${formatoNumero(p.f.mejor.reps)}`
      : `${fechaCorta(p.f.inicio)}: ${formatoNumero(p.f.mejor.reps)} ${unidad}`;
    const g = svg("g", { class: "grafica-punto", tabindex: "0", "aria-label": etiqueta },
      svg("rect", { class: "grafica-zona", x: x(i) - ancho / 2, y: arriba - 12, width: ancho, height: H - arriba - abajo + 24 }),
      svg("circle", { class: "grafica-marca", cx: x(i), cy: y(p.valor), r: 4 }));
    const elegir = () => {
      for (const otro of grupos) otro.classList.remove("elegido");
      g.classList.add("elegido");
      vaciar(detalle).append(...textoPunto(p));
    };
    g.addEventListener("click", elegir);
    g.addEventListener("focus", elegir);
    return g;
  });
  nodos.push(...grupos);
  // Etiquetas directas: el último punto y el máximo (si es otro), en color de texto y encima del punto.
  const ultimo = puntos.length - 1;
  const iMax = valores.lastIndexOf(max);
  const etiquetaDirecta = (i, texto) => {
    const px = x(i);
    const ancla = px > W - der - 24 ? "end" : px < izq + 24 ? "start" : "middle";
    return svg("text", { class: "grafica-valor", x: ancla === "end" ? px + 4 : ancla === "start" ? px - 4 : px, y: y(puntos[i].valor) - 10, "text-anchor": ancla }, texto);
  };
  nodos.push(etiquetaDirecta(ultimo, formatoNumero(puntos[ultimo].valor)));
  if (iMax !== ultimo && max > puntos[ultimo].valor) {
    const cerca = Math.abs(x(iMax) - x(ultimo)) < 44 && Math.abs(y(max) - y(puntos[ultimo].valor)) < 16;
    if (!cerca) nodos.push(etiquetaDirecta(iMax, `máx. ${formatoNumero(max)}`));
  }
  const resumen = tipo === "peso"
    ? `Peso de la mejor serie: de ${formatoNumero(min)} a ${formatoNumero(max)} kg en ${puntos.length} sesiones, del ${diaMes(puntos[0].f.inicio)} al ${diaMes(puntos[ultimo].f.inicio)}`
    : `${titulo}: de ${formatoNumero(min)} a ${formatoNumero(max)} ${unidad} en ${puntos.length} sesiones, del ${diaMes(puntos[0].f.inicio)} al ${diaMes(puntos[ultimo].f.inicio)}`;
  const dibujo = svg("svg", { class: "grafica", viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": resumen, preserveAspectRatio: "xMidYMid meet" }, nodos);
  return h("div", { class: "grafica-caja" }, h("h2", { class: "tarjeta-titulo" }, titulo), detalle, dibujo);
}

// --- Acciones ---

export function alAccionHistorial(accion, el) {
  const id = el.dataset.id;
  switch (accion) {
    case "vista-sesiones":
      almacen.cambiarUi((u) => { u.vistaHistorial = "sesiones"; });
      return ctx.irA("#/historial", "replace");
    case "vista-ejercicios":
      almacen.cambiarUi((u) => { u.vistaHistorial = "ejercicios"; });
      return ctx.irA("#/historial/ejercicios", "replace");
    case "ver-sesion": return ctx.irA(`#/historial/sesion/${encodeURIComponent(id)}`, "push");
    case "ver-ejercicio": return ctx.irA(`#/historial/ejercicio/${encodeURIComponent(id)}`, "push");
    case "borrar-sesion": return borrarSesion(id);
    case "corregir-serie": return corregirSerie(el.dataset.sesion, id, Number(el.dataset.indice));
    case "cambiar-marca": return hojaMarca(id);
    case "ver-mas":
      est.limite += 50;
      return ctx.repintar();
    case "volver":
      if (history.state?.nivel > 0) return history.back();
      return ctx.irA(almacen.leerUi().vistaHistorial === "ejercicios" ? "#/historial/ejercicios" : "#/historial", "replace");
    default: return undefined;
  }
}

export function vistaHistorialGuardada() {
  return almacen.leerUi().vistaHistorial === "ejercicios" ? "#/historial/ejercicios" : "#/historial";
}

