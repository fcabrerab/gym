// Pantalla Entreno: pestañas de los días, banners, resumen del día, lista compacta de ejercicios con la serie
// actual (−/+ y ✓), terminar o descartar la sesión; y la barra de descanso y la capa «¡Te toca!», que app.js
// monta una sola vez fuera de la pantalla para que se vean en todas.
// Nunca se repinta toda la pantalla por una serie: solo el bloque del ejercicio y la línea de progreso.

import { h, icono, vaciar } from "./dom.js";
import { avisar, cerrarAviso, confirmar, abrirHoja, anunciar } from "./avisos.js";
import { ctx } from "./contexto.js";
import {
  miniatura, control, ponerErrorControl, banner, textoSerie, textoSeries, lineaDatos, textoBotonHecha, boton, vacio, ayuda,
  pasoEn, leerCamposEn,
} from "./piezas.js";
import { abrirHojaEjercicio } from "./rutina.js";
import { accionGuardarCopia, hojaCambiosNormal, normalHaCambiado, ocultarAvisoNormal } from "./ajustes.js";
import * as almacen from "../almacen.js";
import * as S from "../sesion.js";
import * as descanso from "../descanso.js";
import { estimarTiempo, tiempoRestante, diaPorId, LIMITES } from "../modelo.js";
import { necesitaCopia, guardarCopiaAuto } from "../copias.js";
import {
  ahora, fechaLocal, fechaCorta, diaMes, hora, haceDias, formatoKg, formatoNumero, formatoMinutos, formatoDuracion, formatoCuenta,
  formatoDescanso, leerNumero, leerDescanso, NOMBRES_DIA, abreviaturaDia, limitar, diasEntre, plural,
} from "../util.js";

const MS_RECIEN = 800; // tras un ✓, los ✓ no se pueden tocar durante este rato (un doble toque no apunta dos series)
const MS_CAPA = 4000;
const MS_CAPA_SALIENDO = 700;

const est = {
  nodo: null,
  banners: null,
  resumen: null,
  ayuda: null,
  todoHecho: null,
  lista: null,
  final: null,
  diaId: null,
  motivo: null,
  abierto: null,
  elegidos: {}, // {diaId: {exerciseId: kg}}: sugerencias aceptadas antes de empezar la sesión de ese día
  pospuestosSin: {}, // {diaId: [exerciseId]}: «Hacer después» antes de empezar la sesión de ese día
  verDias: false, // la fila de días se ve aunque haya una sesión en marcha (tras «Otros días»)
  primerToque: true,
  reloj: null,
  barra: null,
  capa: null,
  temporizadorCapa: null,
  temporizadorRecien: null,
  crono: null, // cronómetro de un ejercicio por tiempo: {id, inicio}
  intervaloCrono: null,
  fechaPintado: null,
};

const tituloDia = (dia) => (dia ? dia.title || dia.label : "otro día");

function datosDia() {
  const datos = almacen.datos();
  const dia = diaPorId(datos, est.diaId);
  const sesion = almacen.leerSesion();
  const enCurso = sesion && dia && sesion.diaId === dia.id && !S.abandonada(sesion, ahora()) ? sesion : null;
  return { datos, dia, sesion, enCurso };
}

// Una sesión que sigue viva: no está abandonada y su día existe todavía.
function sesionActiva(datos, sesion, t = ahora()) {
  return Boolean(sesion) && !S.abandonada(sesion, t) && Boolean(diaPorId(datos, sesion.diaId));
}

// Al volver a abrir la app se elige otra vez el día (app.js lo llama al arrancar).
export function reiniciarEntreno() {
  est.diaId = null;
  est.abierto = null;
  est.elegidos = {};
  est.pospuestosSin = {};
  est.verDias = false;
}

// --- Pintado ---

// Pinta Entreno. Con {desplazar: true} y una sesión en marcha, deja a la vista el ✓ del ejercicio abierto (al abrir
// la app o al volver de otra pantalla). Devuelve true si ha desplazado la pantalla.
export function pintarEntreno(contenedor, { desplazar = false } = {}) {
  const datos = almacen.datos();
  const sesion = almacen.leerSesion();
  const t = ahora();
  if (!est.diaId || !diaPorId(datos, est.diaId)) {
    est.motivo = S.elegirDia(datos, sesion, almacen.leerUi(), t, fechaLocal(t));
    est.diaId = est.motivo.diaId;
    const enCurso = sesion && sesion.diaId === est.diaId && !S.abandonada(sesion, t);
    est.abierto = enCurso ? sesion.actual : null;
  }
  est.fechaPintado = fechaLocal(t);
  est.banners = h("div", { class: "banners" });
  est.resumen = h("section", { class: "resumen-dia", "aria-label": "Resumen del día" });
  est.ayuda = h("div", { class: "ayuda-hueco" });
  est.todoHecho = h("div", { class: "todo-hecho-hueco" });
  est.lista = h("ol", { class: "lista-ej", "aria-label": "Ejercicios" });
  est.final = h("div", { class: "final-lista" });
  est.nodo = h("div", { class: "pantalla-entreno" }, est.banners, est.resumen, est.ayuda, est.todoHecho, est.lista, est.final);
  vaciar(contenedor).append(est.nodo);
  pintarPestanas();
  pintarBanners();
  pintarResumen();
  pintarAyuda();
  pintarLista();
  pintarFinal();
  arrancarReloj();
  return desplazar ? mostrarSerieActual() : false;
}

export function salirEntreno() {
  if (est.reloj) clearInterval(est.reloj);
  est.reloj = null;
  const fila = document.getElementById("fila-dias");
  if (fila) fila.hidden = true;
}

function arrancarReloj() {
  if (est.reloj) clearInterval(est.reloj);
  est.reloj = setInterval(() => {
    const { enCurso } = datosDia();
    if (enCurso && est.nodo?.isConnected) pintarResumen();
  }, 30000);
}

// Pestañas de los días. Con una sesión en marcha en el día que se ve, la fila se esconde (deja más sitio a la serie);
// «Otros días», junto al título, la vuelve a enseñar.
function pintarPestanas() {
  const fila = document.getElementById("fila-dias");
  if (!fila) return;
  const { datos, enCurso } = datosDia();
  const sesion = almacen.leerSesion();
  const hoy = new Date(ahora()).getDay();
  vaciar(fila);
  for (const d of datos.dias) {
    const esHoy = (d.diasSemana || []).includes(hoy);
    const elegida = d.id === est.diaId;
    fila.append(h("button", {
      class: ["pestana", elegida && "elegida", esHoy && "es-hoy"],
      type: "button",
      "data-accion": "elegir-dia",
      "data-id": d.id,
      "aria-pressed": String(elegida),
      "aria-current": esHoy ? "date" : null,
    },
    h("span", { class: "pestana-dia" }, esHoy ? "Hoy" : abreviaturaDia(d.label)),
    h("span", { class: "pestana-titulo" }, d.title || d.label),
    sesion?.diaId === d.id ? h("span", { class: "pestana-punto" }, h("span", { class: "solo-lector" }, " (sesión en marcha)")) : null));
  }
  fila.hidden = Boolean(enCurso) && !est.verDias;
  const elegida = fila.querySelector(".elegida");
  if (!fila.hidden && elegida && fila.scrollWidth > fila.clientWidth) {
    fila.scrollLeft = Math.max(0, elegida.offsetLeft - (fila.clientWidth - elegida.offsetWidth) / 2);
  }
  ajustarAltoCabecera();
}

// El alto real de la cabecera (con o sin la fila de días), ya, antes de desplazar: lo usan scroll-margin-top y los
// avisos de arriba. app.js lo vuelve a poner cuando cambia por otras razones (giro, tamaño de letra).
function ajustarAltoCabecera() {
  const cabecera = document.getElementById("cabecera");
  if (cabecera) document.documentElement.style.setProperty("--alto-cabecera-real", `${cabecera.offsetHeight}px`);
}

function pintarBanners() {
  if (!est.banners) return;
  const { datos, dia, sesion } = datosDia();
  const t = ahora();
  const ui = almacen.leerUi();
  const lista = [];
  const diaSesion = sesion ? diaPorId(datos, sesion.diaId) : null;
  const n = sesion ? plural(S.totalSeries(sesion), "serie", "series") : "";
  if (sesion && !diaSesion) {
    // Su día ya no está en la rutina (se cargó una copia, se volvió a la publicada…): solo se puede guardar o descartar.
    lista.push(banner({
      texto: `Tienes una sesión sin terminar de un día que ya no está en la rutina (${haceDias(sesion.ultimoCambio, t)}, ${n}).`,
      botones: [boton("Terminarla", "terminar-abandonada", { clase: "boton-principal" }), boton("Descartarla", "descartar-abandonada")],
      clase: "banner-aviso",
      icono: "alerta",
    }));
  } else if (sesion && S.abandonada(sesion, t)) {
    lista.push(banner({
      texto: `Tienes una sesión de ${tituloDia(diaSesion)} sin terminar (${haceDias(sesion.ultimoCambio, t)}, ${n}).`,
      botones: [boton("Terminarla", "terminar-abandonada", { clase: "boton-principal" }), boton("Seguir con ella", "seguir-abandonada")],
      clase: "banner-aviso",
      icono: "alerta",
    }));
  } else if (sesion && sesion.diaId !== est.diaId) {
    lista.push(banner({
      texto: `Tienes una sesión de ${tituloDia(diaSesion)} en marcha (${n}).`,
      botones: [boton(`Volver a ${tituloDia(diaSesion)}`, "ir-dia-sesion", { clase: "boton-principal" })],
      icono: "entreno",
    }));
  }
  if (ctx.version.nueva) {
    lista.push(banner({ texto: "Hay una versión nueva de la beta.", botones: [boton("Recargar", "recargar-version", { clase: "boton-principal" })], icono: "descargar" }));
  }
  // Durante una sesión no se enseña nada que empuje la lista hacia abajo (la copia y la normal pueden esperar).
  if (!sesionActiva(datos, sesion, t)) {
    const textoCopia = necesitaCopia(datos, t, ui.posponerCopiaHasta);
    if (textoCopia) {
      lista.push(banner({
        texto: textoCopia,
        botones: [boton("Guardar copia", "guardar-copia", { clase: "boton-principal" }), boton("Más tarde", "posponer-copia")],
        clase: "banner-aviso",
        icono: "copia",
      }));
    }
    const normal = normalHaCambiado(ui);
    if (normal) {
      lista.push(banner({
        texto: `La versión normal ha cambiado desde que la copiaste${normal.fecha ? ` (${diaMes(normal.fecha)})` : ""}.`,
        botones: [boton("Ver qué cambia", "ver-cambios-normal", { clase: "boton-principal" }), boton("Ahora no", "ocultar-aviso-normal")],
        icono: "copia",
      }));
    }
  }
  if (est.motivo?.motivo === "descanso" && est.diaId === est.motivo.diaId && !sesion) {
    lista.push(banner({ texto: `Hoy toca descanso. Próximo entreno: ${NOMBRES_DIA[est.motivo.proximoDiaSemana]}, ${tituloDia(dia)}.`, icono: "reloj" }));
  }
  const hechaHoy = datos.sesiones.filter((s) => s.diaId === est.diaId && diasEntre(s.inicio, t) === 0).pop();
  if (hechaHoy && !(sesion && sesion.diaId === est.diaId && !S.abandonada(sesion, t))) {
    lista.push(banner({ texto: "Sesión de hoy guardada.", botones: [boton("Ver", "ver-sesion", { id: hechaHoy.id })], clase: "banner-hecho", icono: "check" }));
  }
  vaciar(est.banners).append(...lista);
  est.banners.hidden = lista.length === 0;
}

function pintarResumen() {
  if (!est.resumen) return;
  const { datos, dia, enCurso } = datosDia();
  vaciar(est.resumen);
  if (!dia) return;
  const t = ahora();
  // La fila de días se esconde con una sesión en marcha (pintarPestanas); entonces «Otros días» la vuelve a enseñar.
  const otrosDias = enCurso && !est.verDias
    ? h("button", { class: "enlace-boton enlace-corto", type: "button", "data-accion": "ver-dias" }, "Otros días")
    : null;
  est.resumen.append(h("div", { class: "titulo-dia-fila" }, h("h1", { class: "titulo-dia" }, dia.title || dia.label), otrosDias));
  if (enCurso) {
    const p = S.progreso(dia, enCurso);
    const partes = [`${p.hechas} de ${p.plan} series`, `llevas ${formatoMinutos((t - enCurso.inicio) / 1000)}`];
    const resto = tiempoRestante(dia, enCurso, datos.ajustes);
    if (resto > 0) partes.push(`quedan ~${formatoMinutos(resto)}`, `fin ~${hora(t + resto * 1000)}`);
    const barra = h("span", { class: "progreso-barra" });
    barra.style.setProperty("width", `${p.plan ? Math.round((p.hechas / p.plan) * 100) : 0}%`);
    est.resumen.append(
      h("button", { class: "linea-dia", type: "button", "data-accion": "como-se-calcula" }, h("span", { class: "linea-dia-texto" }, partes.join(" · ")), icono("info", { tamano: 20 })),
      h("div", { class: "progreso", role: "progressbar", "aria-label": "Series hechas", "aria-valuemin": "0", "aria-valuemax": String(p.plan), "aria-valuenow": String(p.hechas) }, barra),
    );
  } else if (!dia.ejercicios.length) {
    est.resumen.append(h("p", { class: "linea-dia linea-dia-fija" }, `${dia.label} · sin ejercicios`));
  } else {
    const e = estimarTiempo(dia, datos.ajustes);
    const partes = [dia.label, plural(e.series, "serie", "series"), `~${formatoMinutos(e.total)}`];
    if (dia.subtitle) partes.push(dia.subtitle);
    est.resumen.append(h("button", { class: "linea-dia", type: "button", "data-accion": "como-se-calcula", "aria-label": `${partes.join(", ")}. Cómo se calcula el tiempo` },
      h("span", { class: "linea-dia-texto" }, partes.join(" · ")), icono("info", { tamano: 20 })));
  }
}

function pintarAyuda() {
  if (!est.ayuda) return;
  const { dia, sesion } = datosDia();
  vaciar(est.ayuda);
  if (!almacen.leerUi().ayudaSerieVista && !sesion && dia?.ejercicios.length) {
    est.ayuda.append(h("p", { class: "ayuda-serie" }, icono("info", { tamano: 20 }), h("span", null, "Marca cada serie con ✓ al terminarla: el descanso empieza solo.")));
  }
}

function pintarTodoHecho() {
  const { dia, enCurso } = datosDia();
  vaciar(est.todoHecho);
  if (enCurso && dia && S.quedanSeries(dia, enCurso) === 0) {
    est.todoHecho.append(h("div", { class: "tarjeta-destacada" },
      h("p", { class: "tarjeta-destacada-texto" }, "Has hecho todas las series."),
      boton("Terminar sesión", "terminar-sesion", { clase: "boton-principal" })));
  }
}

function pintarLista() {
  if (!est.lista) return;
  const { datos, dia, enCurso } = datosDia();
  vaciar(est.lista);
  vaciar(est.todoHecho);
  if (!dia) return;
  if (!dia.ejercicios.length) {
    est.lista.hidden = true;
    est.todoHecho.append(vacio("Este día no tiene ejercicios todavía.", boton("Añadir ejercicios", "anadir-ejercicios", { clase: "boton-principal" })));
    return;
  }
  est.lista.hidden = false;
  for (const entrada of dia.ejercicios) est.lista.append(bloque(entrada, datos, dia, enCurso));
  pintarTodoHecho();
}

function pintarFinal() {
  if (!est.final) return;
  const { enCurso } = datosDia();
  vaciar(est.final);
  if (enCurso) {
    est.final.append(
      boton("Terminar sesión", "terminar-sesion", { clase: "boton-secundario boton-ancho" }),
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "descartar-sesion" }, "Descartar la sesión"),
    );
  }
}

function bloqueDe(id) {
  return est.lista?.querySelector(`li[data-ej="${CSS.escape(id)}"]`) || null;
}

function pospuestos(enCurso, diaId) {
  return enCurso ? enCurso.pospuestos || [] : est.pospuestosSin[diaId] || [];
}

function bloque(entrada, datos, dia, enCurso) {
  const id = entrada.exerciseId;
  const x = datos.ejercicios[id] || { id, name: id, tipo: "peso", image: "", muscleGroup: "" };
  const hechas = S.hechasDe(enCurso, id);
  const completo = hechas.length >= entrada.series;
  const pospuesto = !completo && pospuestos(enCurso, dia.id).includes(id);
  const abierto = est.abierto === id;
  const li = h("li", { class: ["ej", abierto && "abierto", completo && "hecho"], "data-ej": id });

  const estado = completo
    ? h("span", { class: "ej-estado ej-estado-hecho" }, icono("check", { tamano: 20 }), h("span", null, `${hechas.length}/${entrada.series}`))
    : pospuesto
      ? h("span", { class: "ej-estado ej-estado-despues" }, "Después")
      : h("span", { class: "ej-estado" }, `${hechas.length}/${entrada.series}`);

  if (!abierto) {
    li.append(h("button", { class: "ej-fila", type: "button", "data-accion": "abrir-ejercicio", "data-id": id, "aria-expanded": "false" },
      miniatura(x, { tamano: 56 }),
      h("span", { class: "ej-textos" },
        h("span", { class: "ej-nombre" }, x.name),
        h("span", { class: "ej-datos" }, completo ? textoSeries(hechas, x.tipo) : lineaDatos(entrada, x))),
      estado));
    return li;
  }

  const plan = `${entrada.series} × ${entrada.reps} · descanso ${entrada.rest}`;
  const lineaGrupo = [x.muscleGroup, x.tipo === "peso" && x.pr != null ? `Marca ${formatoKg(x.pr)}` : null].filter(Boolean).join(" · ");
  li.append(h("div", { class: "ej-cabecera" },
    x.image
      ? h("button", { class: "ej-foto", type: "button", "data-accion": "ver-imagen", "data-id": id, "aria-label": `Ver la imagen de ${x.name}` }, miniatura(x, { tamano: 72 }))
      : h("span", { class: "ej-foto" }, miniatura(x, { tamano: 72 })),
    h("button", { class: "ej-cabecera-texto", type: "button", "data-accion": "abrir-ejercicio", "data-id": id, "aria-expanded": "true" },
      h("span", { class: "ej-nombre ej-nombre-completo" }, x.name),
      lineaGrupo ? h("span", { class: "ej-datos" }, lineaGrupo) : null,
      h("span", { class: "ej-datos" }, plan)),
    estado));

  const cuerpo = h("div", { class: "ej-cuerpo" });
  if (x.notas) cuerpo.append(h("p", { class: "ej-notas" }, icono("lapiz", { tamano: 18 }), h("span", null, x.notas)));
  const uv = S.ultimaVez(datos, dia.id, id);
  cuerpo.append(h("p", { class: "ultima-vez" }, uv
    ? `La última vez (${fechaCorta(uv.sesion.inicio)}): ${textoSeries(uv.series, x.tipo)}`
    : x.tipo === "peso" && x.pr != null ? `Sin registros todavía: empieza con tu marca (${formatoKg(x.pr)})` : "Sin registros todavía"));

  if (!completo && hechas.length === 0) {
    const sug = S.sugerencia(datos, dia.id, id);
    if (sug) {
      cuerpo.append(h("div", { class: "sugerencia" },
        h("div", { class: "sugerencia-fila" },
          h("p", { class: "sugerencia-texto" }, sug.tipo === "subir" ? `Prueba ${formatoKg(sug.kg)}` : `Mantén ${formatoKg(sug.kg)}`),
          h("button", { class: "boton boton-secundario boton-corto", type: "button", "data-accion": "usar-sugerencia", "data-id": id, "data-kg": String(sug.kg) }, "Usar")),
        h("p", { class: "sugerencia-porque" }, sug.porque)));
    }
  }

  if (hechas.length) {
    cuerpo.append(h("div", { class: "series-hechas" }, hechas.map((s, i) => h("button", {
      class: "pastilla-serie", type: "button", "data-accion": "editar-serie", "data-id": id, "data-indice": String(i),
      "aria-label": `Serie ${i + 1}: ${textoSerie(s, x.tipo)}. Editar`,
    }, icono("check", { tamano: 18 }), textoSerie(s, x.tipo)))));
  }

  if (!completo) {
    const indice = hechas.length;
    const sesionParaPropuesta = enCurso || { pesoElegido: est.elegidos[dia.id] || {}, ejercicios: {} };
    const prop = S.valoresPropuestos(datos, sesionParaPropuesta, dia.id, id, indice);
    const kgTexto = prop.kg == null ? "" : formatoNumero(prop.kg);
    const segundosDescanso = leerDescanso(entrada.rest) ?? 90;
    // El descanso también se empieza a mano (si se saltó, si se quiere descansar sin apuntar nada o si en Ajustes
    // está apagado «Empezar el descanso al marcar una serie»).
    const botonDescanso = segundosDescanso > 0
      ? h("button", { class: "boton boton-secundario boton-descanso", type: "button", "data-accion": "empezar-descanso", "data-id": id, "aria-label": `Empezar un descanso de ${formatoDescanso(segundosDescanso)}` },
        icono("reloj", { tamano: 18 }), h("span", null, `Descanso ${formatoDescanso(segundosDescanso)}`))
      : null;
    const tiempo = x.tipo === "tiempo";
    cuerpo.append(h("div", { class: "serie-actual" },
      h("div", { class: "serie-cabecera" }, h("p", { class: "serie-numero" }, `Serie ${indice + 1} de ${entrada.series}`), botonDescanso),
      h("div", { class: "controles" },
        x.tipo === "peso" ? control({ campo: "kg", rotulo: "Peso", valor: kgTexto, unidad: "kg", inputmode: "decimal", id, intro: "next", aviso: prop.faltaPeso ? "Pon el peso" : "", etiquetaMenos: `Quitar ${formatoNumero(x.incremento || 2.5)} kg`, etiquetaMas: `Añadir ${formatoNumero(x.incremento || 2.5)} kg` }) : null,
        control({ campo: "reps", rotulo: tiempo ? "Segundos" : "Repeticiones", valor: String(prop.reps ?? ""), unidad: tiempo ? "s" : "", inputmode: "numeric", id, etiquetaMenos: tiempo ? "Quitar 5 segundos" : "Una repetición menos", etiquetaMas: tiempo ? "Añadir 5 segundos" : "Una repetición más" })),
      tiempo ? botonCrono(id) : null,
      h("button", { class: "boton boton-hecha", type: "button", "data-accion": "serie-hecha", "data-id": id },
        icono("check", { tamano: 26 }), h("span", { class: "hecha-texto" }, textoBotonHecha(prop.kg, prop.reps, x.tipo)))));
  }

  cuerpo.append(h("div", { class: "ej-enlaces" },
    !completo && !pospuesto ? h("button", { class: "enlace-boton", type: "button", "data-accion": "posponer", "data-id": id }, icono("despues", { tamano: 20 }), h("span", null, "Hacer después")) : null,
    h("button", { class: "enlace-boton", type: "button", "data-accion": "ver-ejercicio", "data-id": id }, icono("historial", { tamano: 20 }), h("span", null, "Historial")),
    h("button", { class: "enlace-boton", type: "button", "data-accion": "editar-ejercicio", "data-id": id }, icono("lapiz", { tamano: 20 }), h("span", null, "Editar"))));
  li.append(cuerpo);
  return li;
}

// --- Cronómetro de los ejercicios por tiempo (F34) ---

function textoCrono(id) {
  if (est.crono?.id !== id) return "Cronómetro";
  return `Parar · ${formatoCuenta(Math.floor((ahora() - est.crono.inicio) / 1000))}`;
}

function botonCrono(id) {
  const enMarcha = est.crono?.id === id;
  return h("button", { class: ["boton", "boton-secundario", "boton-crono", enMarcha && "en-marcha"], type: "button", "data-accion": "cronometro", "data-id": id, "aria-pressed": String(enMarcha) },
    icono("reloj", { tamano: 20 }), h("span", { class: "crono-texto" }, textoCrono(id)));
}

function pararCrono() {
  if (est.intervaloCrono) clearInterval(est.intervaloCrono);
  est.intervaloCrono = null;
  est.crono = null;
}

// Primer toque: empieza a contar. Segundo toque: para y pone los segundos en el campo (sin apuntar la serie).
function alternarCrono(id) {
  const li = bloqueDe(id);
  if (est.crono?.id === id) {
    const segundos = limitar(Math.round((ahora() - est.crono.inicio) / 1000), 0, LIMITES.segundosMax);
    pararCrono();
    const campo = li?.querySelector('[data-campo="reps"]');
    if (campo) {
      campo.value = formatoNumero(segundos);
      ponerErrorControl(campo.closest(".control"), "");
    }
    actualizarTextoHecha(id);
    descanso.vibrarCorto();
    anunciar(`${segundos} segundos`);
  } else {
    pararCrono();
    est.crono = { id, inicio: ahora() };
    est.intervaloCrono = setInterval(() => {
      const boton = bloqueDe(est.crono?.id)?.querySelector('[data-accion="cronometro"] .crono-texto');
      if (!est.crono || !boton) {
        pararCrono();
        return;
      }
      boton.textContent = textoCrono(est.crono.id);
    }, 250);
  }
  for (const b of est.lista?.querySelectorAll('[data-accion="cronometro"]') || []) {
    const enMarcha = est.crono?.id === b.dataset.id;
    b.classList.toggle("en-marcha", enMarcha);
    b.setAttribute("aria-pressed", String(enMarcha));
    b.querySelector(".crono-texto").textContent = textoCrono(b.dataset.id);
  }
}

// Repinta solo los bloques indicados (y la línea de progreso, banners y final).
function repintarBloques(ids) {
  const { datos, dia, enCurso } = datosDia();
  if (!dia || !est.lista) return;
  for (const id of new Set(ids.filter(Boolean))) {
    const viejo = bloqueDe(id);
    const entrada = dia.ejercicios.find((e) => e.exerciseId === id);
    if (viejo && entrada) viejo.replaceWith(bloque(entrada, datos, dia, enCurso));
  }
  pintarResumen();
  pintarTodoHecho();
  pintarFinal();
  pintarBanners();
  pintarAyuda();
}

function repintarTodo() {
  if (est.nodo?.isConnected) pintarEntreno(est.nodo.parentElement);
}

function desplazarA(id) {
  const li = bloqueDe(id);
  // Salto inmediato (sin animación): es más fiable y respeta «reducir movimiento» sin más.
  if (li && typeof li.scrollIntoView === "function") li.scrollIntoView({ block: "start", behavior: "auto" });
}

// Deja el ✓ del ejercicio a la vista, por encima de la barra de descanso y de la navegación (el CSS le da ese
// margen con scroll-margin-bottom). Si ya se ve, no mueve nada.
function asegurarHechaVisible(id) {
  const boton = id ? bloqueDe(id)?.querySelector(".boton-hecha") : null;
  if (boton && typeof boton.scrollIntoView === "function") boton.scrollIntoView({ block: "nearest", behavior: "auto" });
}

// Con una sesión en marcha, lleva la pantalla al ejercicio abierto y deja su ✓ a la vista. Devuelve true si lo hizo.
function mostrarSerieActual() {
  const { enCurso } = datosDia();
  if (!enCurso || !est.abierto || !bloqueDe(est.abierto)) return false;
  desplazarA(est.abierto);
  asegurarHechaVisible(est.abierto);
  return true;
}

// Tras un ✓, los ✓ que hay en pantalla no se pueden tocar durante un momento (se ven más claros): un doble toque sin
// querer no apunta dos series, ni la del ejercicio siguiente si el dedo cae en su ✓.
function marcarRecien() {
  const botones = [...(est.lista?.querySelectorAll(".boton-hecha") || [])];
  for (const b of botones) b.classList.add("recien");
  if (est.temporizadorRecien) clearTimeout(est.temporizadorRecien);
  est.temporizadorRecien = setTimeout(() => {
    for (const b of botones) b.classList.remove("recien");
    est.temporizadorRecien = null;
  }, MS_RECIEN);
}

// --- Campos ---

function actualizarTextoHecha(id) {
  const li = bloqueDe(id);
  const x = almacen.datos().ejercicios[id];
  if (!li || !x) return;
  const t = li.querySelector(".hecha-texto");
  if (!t) return;
  const kg = leerNumero(li.querySelector('[data-campo="kg"]')?.value ?? "");
  const reps = leerNumero(li.querySelector('[data-campo="reps"]')?.value ?? "");
  t.textContent = textoBotonHecha(kg, reps, x.tipo);
}

// Cambios al escribir en los campos de la serie (sin repintar nada).
export function alCampoEntreno(ev) {
  const campo = ev.target?.dataset?.campo;
  if ((campo === "kg" || campo === "reps") && ev.type === "input") {
    ponerErrorControl(ev.target.closest(".control"), "");
    const id = ev.target.dataset.id;
    if (id) actualizarTextoHecha(id);
  }
}

// Intro en el último campo de la serie: se cierra el teclado (app.js) y aquí se deja el ✓ a la vista, sin apuntar nada.
export function alSoltarCampoEntreno(campo) {
  const id = campo?.closest?.("li[data-ej]")?.dataset.ej;
  if (id) asegurarHechaVisible(id);
}

// --- Acciones ---

export function alAccionEntreno(accion, el) {
  const id = el.dataset.id;
  switch (accion) {
    case "elegir-dia": return elegirDia(id);
    case "abrir-ejercicio": return alternarEjercicio(id);
    case "kg-menos": case "kg-mas": case "reps-menos": case "reps-mas": {
      const li = bloqueDe(id);
      const x = almacen.datos().ejercicios[id];
      if (li && x) {
        pasoEn(li, accion, x);
        actualizarTextoHecha(id);
      }
      return undefined;
    }
    case "serie-hecha":
      if (est.crono?.id === id) alternarCrono(id);
      return serieHecha(id);
    case "empezar-descanso": return descansoAMano(id);
    case "cronometro": return alternarCrono(id);
    case "editar-serie": return editarSerie(id, Number(el.dataset.indice));
    case "posponer": return posponer(id);
    case "ver-ejercicio": return ctx.irA(`#/historial/ejercicio/${encodeURIComponent(id)}`, "push");
    case "editar-ejercicio": return abrirHojaEjercicio(est.diaId, id, { alCerrar: () => repintarTodo() });
    case "ver-imagen": return verImagen(id);
    case "usar-sugerencia": return usarSugerencia(id, Number(el.dataset.kg));
    case "terminar-sesion": return accionTerminar();
    case "descartar-sesion": return accionDescartar();
    case "como-se-calcula": return hojaTiempo();
    case "terminar-abandonada": return terminarAbandonada();
    case "seguir-abandonada": return seguirAbandonada();
    case "descartar-abandonada": return descartarAbandonada();
    case "ir-dia-sesion": {
      const s = almacen.leerSesion();
      return s ? elegirDia(s.diaId) : undefined;
    }
    case "ver-dias":
      est.verDias = true;
      pintarPestanas();
      pintarResumen();
      return undefined;
    case "recargar-version": return ctx.version.recargar?.();
    case "guardar-copia": return accionGuardarCopia({ alTerminar: () => pintarBanners() });
    case "posponer-copia":
      almacen.cambiarUi((u) => { u.posponerCopiaHasta = ahora() + 2 * 86400000; });
      pintarBanners();
      return avisar({ texto: "Te lo recuerdo dentro de 2 días." });
    case "ver-cambios-normal": return hojaCambiosNormal({ alTerminar: () => pintarBanners() });
    case "ocultar-aviso-normal":
      ocultarAvisoNormal();
      pintarBanners();
      return avisar({ texto: "Hecho. Te avisaré si la versión normal vuelve a cambiar." });
    case "ver-sesion": return ctx.irA(`#/historial/sesion/${encodeURIComponent(id)}`, "push");
    case "anadir-ejercicios": return ctx.irA(`#/rutina/dia/${encodeURIComponent(est.diaId)}`, "push");
    default: return undefined;
  }
}

function elegirDia(id) {
  const datos = almacen.datos();
  if (!diaPorId(datos, id)) return;
  const t = ahora();
  est.diaId = id;
  const sesion = almacen.leerSesion();
  est.abierto = sesion && sesion.diaId === id && !S.abandonada(sesion, t) ? sesion.actual : null;
  almacen.cambiarUi((u) => { u.diaElegido = { id, fecha: fechaLocal(t) }; });
  repintarTodo();
  if (!mostrarSerieActual()) window.scrollTo?.({ top: 0 });
}

function alternarEjercicio(id) {
  const anterior = est.abierto;
  est.abierto = anterior === id ? null : id;
  const { enCurso } = datosDia();
  if (enCurso && enCurso.actual !== est.abierto) {
    almacen.guardarSesion({ ...enCurso, actual: est.abierto });
  }
  repintarBloques([anterior, id]);
  if (est.abierto) desplazarA(est.abierto);
}

function usarSugerencia(id, kg) {
  if (!Number.isFinite(kg)) return;
  const { dia, enCurso } = datosDia();
  if (enCurso) {
    almacen.guardarSesion({ ...enCurso, pesoElegido: { ...(enCurso.pesoElegido || {}), [id]: kg } });
  } else if (dia) {
    est.elegidos[dia.id] = { ...(est.elegidos[dia.id] || {}), [id]: kg };
  }
  const li = bloqueDe(id);
  const campo = li?.querySelector('[data-campo="kg"]');
  if (campo) {
    campo.value = formatoNumero(kg);
    ponerErrorControl(campo.closest(".control"), "");
    actualizarTextoHecha(id);
  }
  avisar({ texto: `Peso puesto: ${formatoKg(kg)}` });
}

// «Hacer después»: el ejercicio pasa al final y se abre el siguiente. Con «Deshacer» vuelve a su sitio.
function posponer(id) {
  const { datos, dia, enCurso } = datosDia();
  const x = datos.ejercicios[id];
  if (!dia) return;
  if (enCurso) {
    const s = { ...enCurso, pospuestos: [...new Set([...(enCurso.pospuestos || []), id])] };
    s.actual = S.siguientePendiente(dia, s, id);
    almacen.guardarSesion(s);
    est.abierto = s.actual === id ? null : s.actual;
  } else {
    est.pospuestosSin[dia.id] = [...new Set([...(est.pospuestosSin[dia.id] || []), id])];
    const sig = S.siguientePendiente(dia, null, id, est.pospuestosSin[dia.id]);
    est.abierto = sig === id ? null : sig;
  }
  repintarBloques([id, est.abierto]);
  if (est.abierto) desplazarA(est.abierto);
  avisar({ texto: `${x?.name || "Ejercicio"}: lo dejas para el final.`, accion: "Deshacer", alPulsar: () => deshacerPosponer(dia.id, id) });
}

function deshacerPosponer(diaId, id) {
  const s = almacen.leerSesion();
  if (s && s.diaId === diaId && !S.abandonada(s, ahora())) {
    almacen.guardarSesion({ ...s, pospuestos: (s.pospuestos || []).filter((p) => p !== id), actual: id });
  } else {
    est.pospuestosSin[diaId] = (est.pospuestosSin[diaId] || []).filter((p) => p !== id);
  }
  if (est.diaId !== diaId || !est.nodo?.isConnected) return;
  const anterior = est.abierto;
  est.abierto = id;
  repintarBloques([anterior, id]);
  desplazarA(id);
}

// Empieza a mano el descanso del ejercicio (sin apuntar nada).
function descansoAMano(id) {
  const { datos, dia, enCurso } = datosDia();
  const entrada = dia?.ejercicios.find((e) => e.exerciseId === id);
  const x = datos.ejercicios[id];
  if (!entrada || !x) return;
  const segundos = leerDescanso(entrada.rest) ?? 90;
  if (segundos <= 0) return;
  if (est.primerToque) {
    descanso.prepararAudio();
    est.primerToque = false;
  }
  const n = Math.min(S.hechasDe(enCurso, id).length + 1, entrada.series);
  descanso.empezarDescanso({
    exerciseId: id, diaId: dia.id, nombre: x.name, texto: `Te toca la serie ${n} de ${entrada.series}`,
    capa: `Serie ${n} de ${entrada.series} · ${x.name}`, duracion: segundos,
  });
  descanso.actualizarPantalla();
  asegurarHechaVisible(id);
}

// ✓ Hecha: valida, empieza la sesión si hace falta, guarda la serie, empieza el descanso y abre lo siguiente.
async function serieHecha(id) {
  let { datos, dia, sesion } = datosDia();
  if (!dia) return;
  const entrada = dia.ejercicios.find((e) => e.exerciseId === id);
  const x = datos.ejercicios[id];
  const li = bloqueDe(id);
  if (!entrada || !x || !li) return;
  const valores = leerCamposEn(li, x);
  if (!valores.ok) return;

  // Lo primero dentro del toque: el audio (para que el aviso pueda sonar luego) y la vibración corta.
  if (est.primerToque) {
    descanso.prepararAudio();
    est.primerToque = false;
  }
  if (datos.ajustes.vibracion) descanso.vibrarCorto();

  // Otra sesión de otro día, una abandonada (aunque sea de este día) o una de un día que ya no existe: se pregunta
  // antes de empezar otra.
  const vieja = sesion && (S.abandonada(sesion, ahora()) || !diaPorId(datos, sesion.diaId));
  if (sesion && (sesion.diaId !== dia.id || vieja)) {
    const otro = diaPorId(datos, sesion.diaId);
    const n = plural(S.totalSeries(sesion), "serie", "series");
    const seguir = await confirmar(vieja ? {
      titulo: "Hay una sesión sin terminar",
      texto: `Tienes una sesión de ${tituloDia(otro)} sin terminar (${haceDias(sesion.ultimoCambio, ahora())}, ${n}). ¿La guardas y empiezas una nueva?`,
      aceptar: "Guardar y empezar",
    } : {
      titulo: "Ya hay una sesión en marcha",
      texto: `Tienes una sesión de ${tituloDia(otro)} en marcha (${n}). ¿La terminas y empiezas ${tituloDia(dia)}?`,
      aceptar: "Terminar y empezar",
    });
    if (!seguir) return;
    if (S.totalSeries(sesion) > 0) {
      // Si no se pudo guardar (almacenamiento lleno), no se empieza otra: la vieja sigue ahí.
      if (!terminarYGuardar(sesion, vieja ? { fin: sesion.ultimoCambio } : {})) return;
      avisar({ texto: `Sesión de ${tituloDia(otro)} guardada.` });
    } else {
      almacen.borrarSesion();
    }
    ({ datos, dia, sesion } = datosDia());
  }

  const t = ahora();
  const abiertoAntes = est.abierto;
  let s = sesion;
  const nueva = !s;
  if (!s) {
    s = S.empezarSesion(dia.id, t);
    s.pesoElegido = { ...(est.elegidos[dia.id] || {}) };
    s.pospuestos = [...(est.pospuestosSin[dia.id] || [])];
  }
  const previasHoy = S.hechasDe(s, id);
  const indice = previasHoy.length;
  const estabaPospuesto = (s.pospuestos || []).includes(id);
  s = S.marcarSerie(s, id, valores, t);
  const quedanEj = entrada.series - (indice + 1);
  const quedanSesion = S.quedanSeries(dia, s);
  if (quedanEj <= 0) {
    const sig = S.siguientePendiente(dia, s, id);
    s.actual = sig;
    est.abierto = sig;
  } else {
    est.abierto = id;
  }
  if (!almacen.guardarSesion(s)) return;
  if (nueva) {
    delete est.elegidos[dia.id];
    delete est.pospuestosSin[dia.id];
  }
  if (!almacen.leerUi().ayudaSerieVista) almacen.cambiarUi((u) => { u.ayudaSerieVista = true; });

  let idDescanso = null;
  const segundos = leerDescanso(entrada.rest) ?? 90;
  if (datos.ajustes.descansoAlMarcar && quedanSesion > 0) {
    if (segundos > 0) {
      let texto;
      let capa;
      if (quedanEj > 0) {
        texto = `Te toca la serie ${indice + 2} de ${entrada.series}`;
        capa = `Serie ${indice + 2} de ${entrada.series} · ${x.name}`;
      } else {
        const sig = est.abierto ? datos.ejercicios[est.abierto] : null;
        texto = sig ? `Siguiente: ${sig.name}` : "Siguiente ejercicio";
        capa = texto;
      }
      idDescanso = descanso.empezarDescanso({ exerciseId: id, diaId: dia.id, nombre: x.name, texto, capa, duracion: segundos });
    } else if (descanso.idActual()) {
      // Descanso de 0:00 (encadenar ejercicios): el descanso de antes ya no vale.
      descanso.saltar();
    }
  }
  descanso.actualizarPantalla();

  repintarBloques([abiertoAntes, id, est.abierto]);
  pintarPestanas();
  marcarRecien();
  if (quedanEj <= 0 && est.abierto) desplazarA(est.abierto);
  asegurarHechaVisible(est.abierto);

  const maxPrevio = Math.max(0, ...previasHoy.map((p) => p.kg ?? 0));
  const marcaNueva = x.tipo === "peso" && valores.kg > 0 && (x.pr == null || valores.kg > x.pr) && valores.kg > maxPrevio;
  const deshacer = { sesionId: s.id, id, t, idDescanso, nueva, estabaPospuesto };
  avisar({
    texto: `Serie ${indice + 1} apuntada${marcaNueva ? `. Nueva marca en ${x.name}: ${formatoKg(valores.kg)}` : ""}`,
    accion: "Deshacer",
    alPulsar: () => deshacerSerie(deshacer),
  });
  if (marcaNueva) anunciar(`Nueva marca en ${x.name}: ${formatoKg(valores.kg)}`);
}

// Deshace un ✓ quitando justo esa serie (no vuelve a una foto de antes): si la sesión ya se terminó o es otra, no
// toca nada y lo dice. Si la sesión empezó con esa serie y no tiene más, se quita entera.
function deshacerSerie({ sesionId, id, t, idDescanso, nueva, estabaPospuesto }) {
  const actual = almacen.leerSesion();
  const yaGuardada = almacen.datos().sesiones.some((x) => x.id === sesionId);
  if (!actual || actual.id !== sesionId || yaGuardada) {
    avisar({ texto: "Ya no se puede deshacer: esa sesión ya está guardada." });
    return;
  }
  const sin = S.quitarSerieMarcada(actual, id, t, ahora());
  if (!sin) {
    avisar({ texto: "Esa serie ya no está." });
    return;
  }
  const pospuestosVuelta = estabaPospuesto ? [...new Set([...(sin.pospuestos || []), id])] : (sin.pospuestos || []);
  if (nueva && S.totalSeries(sin) === 0) {
    almacen.borrarSesion();
    // Vuelve lo que se había elegido antes de empezar (el «Hacer después» y la sugerencia aceptada).
    est.pospuestosSin[sin.diaId] = pospuestosVuelta;
    if (Object.keys(sin.pesoElegido || {}).length) est.elegidos[sin.diaId] = { ...sin.pesoElegido };
  } else {
    almacen.guardarSesion({ ...sin, pospuestos: pospuestosVuelta, actual: id });
  }
  if (idDescanso && descanso.idActual() === idDescanso) descanso.saltar();
  est.abierto = id;
  descanso.actualizarPantalla();
  repintarTodo();
  asegurarHechaVisible(id);
  avisar({ texto: "Serie quitada." });
}

// Vuelve a poner una sesión en curso tal como estaba (deshacer de editar o borrar una serie, o de descartar), solo si
// no hay otra en marcha y no se ha guardado ya en el historial.
function reponerSesion(copia, { soloSiEsLaMisma = true } = {}) {
  const actual = almacen.leerSesion();
  const yaGuardada = almacen.datos().sesiones.some((x) => x.id === copia.id);
  const valida = soloSiEsLaMisma ? actual?.id === copia.id : !actual;
  if (!valida || yaGuardada) {
    avisar({ texto: "Ya no se puede deshacer: la sesión ha cambiado o ya está guardada." });
    return false;
  }
  almacen.guardarSesion(copia);
  return true;
}

function editarSerie(id, indice) {
  const sesion = almacen.leerSesion();
  const serie = sesion?.ejercicios?.[id]?.[indice];
  const x = almacen.datos().ejercicios[id];
  if (!serie || !x) return;
  const tiempo = x.tipo === "tiempo";
  const cuerpo = h("div", null,
    h("div", { class: "controles controles-hoja" },
      x.tipo === "peso" ? control({ campo: "kg", rotulo: "Peso", valor: formatoNumero(serie.kg ?? 0), unidad: "kg", inputmode: "decimal", id, intro: "next" }) : null,
      control({ campo: "reps", rotulo: tiempo ? "Segundos" : "Repeticiones", valor: String(serie.reps), unidad: tiempo ? "s" : "", inputmode: "numeric", id })),
    // Borrar va aparte, lejos de «Guardar»: un toque con el pulgar no se va al botón de al lado.
    h("div", { class: "zona-borrar-hoja" },
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "borrar-serie" }, icono("papelera", { tamano: 20 }), h("span", null, "Borrar serie"))));
  const hoja = abrirHoja({
    titulo: `Serie ${indice + 1} · ${x.name}`,
    cuerpo,
    pie: [boton("Guardar", "guardar-serie", { clase: "boton-principal boton-ancho" })],
    alAccion: (accion) => {
      if (/-(menos|mas)$/.test(accion)) {
        pasoEn(hoja.cuerpo, accion, x);
        return;
      }
      const actual = almacen.leerSesion();
      if (!actual?.ejercicios?.[id]?.[indice]) {
        hoja.cerrar();
        return;
      }
      if (accion === "guardar-serie") {
        const v = leerCamposEn(hoja.cuerpo, x);
        if (!v.ok) return;
        almacen.guardarSesion(S.editarSerie(actual, id, indice, v, ahora()));
        hoja.cerrar().then(() => {
          repintarBloques([id]);
          avisar({ texto: `Serie ${indice + 1} cambiada`, accion: "Deshacer", alPulsar: () => { if (reponerSesion(actual)) repintarTodo(); } });
        });
      } else if (accion === "borrar-serie") {
        almacen.guardarSesion(S.borrarSerie(actual, id, indice, ahora()));
        est.abierto = id;
        hoja.cerrar().then(() => {
          repintarBloques([id]);
          avisar({ texto: `Serie ${indice + 1} borrada`, accion: "Deshacer", alPulsar: () => { if (reponerSesion(actual)) repintarTodo(); } });
        });
      }
    },
  });
}

function verImagen(id) {
  const x = almacen.datos().ejercicios[id];
  if (!x) return;
  const grande = h("div", { class: "imagen-grande" }, miniatura(x, { tamano: 200 }));
  abrirHoja({ titulo: x.name, cuerpo: [grande, x.muscleGroup ? h("p", { class: "ayuda" }, x.muscleGroup) : null] });
}

function hojaTiempo() {
  const { datos, dia, enCurso } = datosDia();
  if (!dia) return;
  const e = estimarTiempo(dia, datos.ajustes);
  const fila = (texto, valor, total = false) => h("div", { class: ["fila-tabla", total && "fila-total"] }, h("dt", null, texto), h("dd", null, valor));
  const filas = [
    fila(`Haciendo las series (${e.series} × ${e.segundosPorSerie} s)`, `~${formatoMinutos(e.trabajo)}`),
    fila("Descansos entre series", `~${formatoMinutos(e.descansos)}`),
    e.minutosCambio > 0 && e.nCambios > 0
      ? fila(`Cambios de ejercicio (${e.nCambios} × ${formatoNumero(e.minutosCambio)} min)`, `~${formatoMinutos(e.cambios)}`)
      : fila("Cambios de ejercicio", "0 min (desactivado)"),
    fila("Total", `~${formatoMinutos(e.total)}`, true),
  ];
  const cuerpo = [h("dl", { class: "tabla-tiempo" }, filas)];
  if (enCurso) {
    const resto = tiempoRestante(dia, enCurso, datos.ajustes);
    cuerpo.push(h("p", { class: "hoja-texto" }, resto > 0
      ? `Con lo que llevas hecho, quedan ~${formatoMinutos(resto)}: acabarías hacia las ${hora(ahora() + resto * 1000)}.`
      : "Ya has hecho todas las series."));
  }
  cuerpo.push(ayuda("Cuenta un descanso menos que series en cada ejercicio. Los segundos por serie y los minutos por cambio se cambian en Ajustes."));
  const hoja = abrirHoja({
    titulo: "Cómo se calcula el tiempo",
    cuerpo,
    pie: [boton("Ir a Ajustes", "ir-ajustes"), boton("Cerrar", "cerrar-hoja", { clase: "boton-principal" })],
    alAccion: (accion) => {
      if (accion === "ir-ajustes") hoja.cerrar().then(() => ctx.irA("#/ajustes", "push"));
    },
  });
}

// --- Terminar y descartar ---

// Guarda la sesión en el historial y, solo si se ha guardado de verdad, la quita de «en curso». Si el almacenamiento
// está lleno (o otra ventana tiene datos de una versión más nueva), la sesión sigue abierta y se dice: nunca se
// pierde un entreno. Devuelve el resultado de terminarSesion o null si no se pudo guardar.
export function terminarYGuardar(sesion, { fin } = {}) {
  cerrarAviso(); // el «Deshacer» de la última serie ya no vale: la sesión se va al historial
  if (almacen.bloqueado()) {
    avisar({ texto: "No se ha guardado la sesión: hay datos de una versión más nueva de la beta. Recarga para actualizar; la sesión sigue abierta.", fijo: true, tipo: "error" });
    return null;
  }
  let resultado = null;
  almacen.mutar((d) => {
    resultado = S.terminarSesion(d, sesion, ahora(), { fin: fin ?? ahora() });
    return resultado.datos;
  });
  // Copia automática «fin de sesión», en segundo plano (no se espera). Con el almacenamiento lleno es lo que guarda la
  // sesión: IndexedDB tiene su propio espacio.
  guardarCopiaAuto(almacen.datos(), "fin de sesión", ahora());
  if (!resultado || !almacen.todoGuardado()) {
    avisar({
      texto: "No se ha podido guardar la sesión: el almacenamiento del navegador está lleno. La sesión sigue abierta; guarda una copia en Ajustes.",
      fijo: true,
      tipo: "error",
    });
    return null;
  }
  almacen.borrarSesion();
  if (descanso.idActual()) descanso.saltar();
  descanso.actualizarPantalla();
  est.abierto = null;
  est.verDias = false;
  delete est.pospuestosSin[sesion.diaId];
  delete est.elegidos[sesion.diaId];
  return resultado;
}

async function accionTerminar() {
  const { dia, sesion } = datosDia();
  if (!sesion) return;
  const diaSesion = diaPorId(almacen.datos(), sesion.diaId) || dia;
  if (S.totalSeries(sesion) === 0) {
    const ok = await confirmar({ titulo: "Sesión sin series", texto: "No has apuntado ninguna serie. ¿Descartar la sesión?", aceptar: "Descartar", cancelar: "Seguir" });
    if (ok) {
      almacen.borrarSesion();
      if (descanso.idActual()) descanso.saltar();
      descanso.actualizarPantalla();
      est.verDias = false;
      repintarTodo();
    }
    return;
  }
  const quedan = S.quedanSeries(diaSesion, sesion);
  if (quedan > 0) {
    const ok = await confirmar({
      titulo: "Terminar la sesión",
      texto: `Te quedan ${plural(quedan, "serie", "series")}. ¿Terminar la sesión de todos modos?`,
      aceptar: "Terminar",
      cancelar: "Seguir entrenando",
    });
    if (!ok) return;
  }
  const r = terminarYGuardar(almacen.leerSesion() || sesion);
  if (!r) return;
  repintarTodo();
  window.scrollTo?.({ top: 0 });
  mostrarResumen(r);
}

function mostrarResumen({ guardada }) {
  const datos = almacen.datos();
  const r = S.resumenSesion(datos, guardada);
  const nombre = guardada.diaNombre.split(" · ").pop() || guardada.diaNombre || "Sesión";
  const cuerpo = [
    h("p", { class: "resumen-titulo" }, `${nombre} · ${fechaCorta(guardada.inicio)}`),
    h("p", { class: "resumen-cifras" }, `${formatoDuracion(r.duracion)} · ${r.hechas} de ${r.plan} series`),
  ];
  if (r.marcas.length) {
    cuerpo.push(h("div", { class: "resumen-marcas" }, h("p", { class: "resumen-rotulo" }, r.marcas.length === 1 ? "Marca nueva:" : "Marcas nuevas:"),
      h("ul", null, r.marcas.map((m) => h("li", null, `${m.nombre}, ${formatoKg(m.kg)}`)))));
  }
  if (r.volumen > 0) {
    let texto = `Volumen: ${formatoNumero(Math.round(r.volumen))} kg`;
    if (r.comparacion?.porcentaje != null) {
      const p = r.comparacion.porcentaje;
      texto += ` · ${p > 0 ? "+" : p < 0 ? "−" : ""}${formatoNumero(Math.abs(p))} % frente al ${fechaCorta(r.comparacion.fecha)}`;
    }
    cuerpo.push(h("p", null, texto));
  }
  if (r.comparacion?.masPeso) cuerpo.push(h("p", null, `${plural(r.comparacion.masPeso, "ejercicio", "ejercicios")} con más peso que la vez anterior.`));
  const textoCopia = necesitaCopia(datos, ahora(), almacen.leerUi().posponerCopiaHasta);
  if (textoCopia) {
    // «Guardar copia» como secundario: el único botón verde de la hoja es «Hecho».
    cuerpo.push(banner({ texto: textoCopia.replace(" de la beta", ""), botones: [boton("Guardar copia", "guardar-copia", { clase: "boton-secundario" })], clase: "banner-aviso", icono: "copia" }));
  }
  const hoja = abrirHoja({
    titulo: "Sesión guardada",
    cuerpo,
    pie: [boton("Hecho", "cerrar-hoja", { clase: "boton-principal boton-ancho" })],
    alAccion: (accion) => {
      if (accion === "guardar-copia") {
        accionGuardarCopia({ alTerminar: () => { pintarBanners(); hoja.cerrar(); } });
      }
    },
  });
}

async function accionDescartar() {
  const { sesion } = datosDia();
  if (!sesion) return;
  const dia = diaPorId(almacen.datos(), sesion.diaId);
  const n = S.totalSeries(sesion);
  const ok = await confirmar({
    titulo: "Descartar la sesión",
    texto: `¿Descartar la sesión de ${tituloDia(dia)}? Se borran sus ${plural(n, "serie", "series")}.`,
    aceptar: "Descartar",
    peligro: true,
  });
  if (!ok) return;
  descartarSesion(almacen.leerSesion() || sesion);
}

function descartarSesion(sesion) {
  cerrarAviso();
  const copia = structuredClone(sesion);
  almacen.borrarSesion();
  if (descanso.idActual()) descanso.saltar();
  descanso.actualizarPantalla();
  est.abierto = null;
  est.verDias = false;
  repintarTodo();
  avisar({
    texto: "Sesión descartada",
    accion: "Deshacer",
    alPulsar: () => {
      if (!reponerSesion(copia, { soloSiEsLaMisma: false })) return;
      est.abierto = copia.actual;
      descanso.actualizarPantalla();
      repintarTodo();
    },
  });
}

function terminarAbandonada() {
  const s = almacen.leerSesion();
  if (!s) return;
  const dia = diaPorId(almacen.datos(), s.diaId);
  if (S.totalSeries(s) === 0) {
    almacen.borrarSesion();
    repintarTodo();
    return;
  }
  const r = terminarYGuardar(s, { fin: s.ultimoCambio });
  if (!r) return;
  repintarTodo();
  avisar({ texto: `Sesión de ${tituloDia(dia)} guardada.`, accion: "Ver", alPulsar: () => ctx.irA(`#/historial/sesion/${encodeURIComponent(r.guardada.id)}`, "push") });
}

async function descartarAbandonada() {
  const s = almacen.leerSesion();
  if (!s) return;
  const ok = await confirmar({
    titulo: "Descartar la sesión",
    texto: `¿Descartar la sesión sin terminar? Se borran sus ${plural(S.totalSeries(s), "serie", "series")}.`,
    aceptar: "Descartar",
    peligro: true,
  });
  if (ok) descartarSesion(almacen.leerSesion() || s);
}

function seguirAbandonada() {
  const s = almacen.leerSesion();
  if (!s) return;
  almacen.guardarSesion({ ...s, ultimoCambio: ahora() });
  est.diaId = s.diaId;
  est.abierto = s.actual;
  descanso.actualizarPantalla();
  repintarTodo();
  mostrarSerieActual();
}

// Cambios que llegan de fuera (otra ventana, otra pantalla): se repinta entero.
export function refrescarEntreno() {
  repintarTodo();
}

// Al volver a la app o al llegar una versión nueva: se ponen al día la línea de progreso, las pestañas y los banners
// sin tocar la lista (así no se pierde lo que se estaba escribiendo). Si ha cambiado el día (medianoche) y no hay una
// sesión en marcha, se vuelve a elegir el día; con una sesión en marcha se sigue en el mismo día y ejercicio.
export function actualizarEntreno() {
  if (!est.nodo?.isConnected) return;
  const hoy = fechaLocal(ahora());
  if (est.fechaPintado && est.fechaPintado !== hoy) {
    est.fechaPintado = hoy;
    if (!datosDia().enCurso) {
      reiniciarEntreno();
      repintarTodo();
      return;
    }
  }
  pintarPestanas();
  pintarResumen();
  pintarBanners();
}

// Lo que se apunta con un fallo o una idea desde Entreno: el día, el ejercicio abierto y la serie.
export function contextoApunte() {
  const { datos, dia, enCurso } = datosDia();
  if (!dia) return "";
  const partes = [dia.title || dia.label];
  const x = est.abierto ? datos.ejercicios[est.abierto] : null;
  const entrada = x ? dia.ejercicios.find((e) => e.exerciseId === est.abierto) : null;
  if (x) {
    partes.push(x.name);
    if (entrada) {
      const hechas = S.hechasDe(enCurso, est.abierto).length;
      partes.push(hechas >= entrada.series ? "hecho" : `serie ${hechas + 1} de ${entrada.series}`);
    }
  }
  if (enCurso) partes.push(`sesión en marcha (${plural(S.totalSeries(enCurso), "serie", "series")})`);
  return partes.join(" · ");
}

// --- Barra de descanso y capa «¡Te toca!» ---

// La barra es de una sola fila: la cuenta (con lo que toca debajo) y cuatro botones de 48 px que nunca cambian de
// sitio ni de tamaño: −15 s, +15 s, Pausar/Seguir y Saltar.
export function montarBarra(nodo, capa) {
  est.barra = nodo;
  est.capa = capa;
  const b = (contenido, accion, extra = {}) => h("button", { class: "boton-barra", type: "button", "data-accion": accion, ...extra }, contenido);
  vaciar(nodo).append(
    h("div", { class: "barra-fila" },
      h("div", { class: "barra-izq" },
        h("span", { class: "barra-cuenta" }),
        h("span", { class: "barra-texto" })),
      h("div", { class: "barra-botones" },
        b("−15 s", "descanso-menos15", { "aria-label": "Quitar 15 segundos" }),
        b("+15 s", "descanso-mas15", { "aria-label": "Añadir 15 segundos" }),
        b([h("span", { class: "barra-icono" }), h("span", { class: "solo-lector barra-pausa-texto" }, "Pausar")], "descanso-pausa"),
        b([icono("saltar", { tamano: 22 }), h("span", { class: "solo-lector" }, "Saltar")], "descanso-saltar"))),
  );
  nodo.addEventListener("click", (ev) => {
    const boton = ev.target.closest("button[data-accion]");
    if (!boton || boton.disabled) return;
    switch (boton.dataset.accion) {
      case "descanso-menos15": return descanso.sumar(-15);
      case "descanso-mas15": return descanso.sumar(15);
      case "descanso-pausa": return descanso.alternarPausa();
      case "descanso-saltar": {
        // Saltar se puede deshacer: un toque sin querer no se lleva el descanso.
        const previo = descanso.saltar();
        if (previo) avisar({ texto: "Descanso saltado", accion: "Deshacer", alPulsar: () => descanso.reponer(previo) });
        return undefined;
      }
      default: return undefined;
    }
  });
  // Cerrarla con un toque: los ✓ no recogen toques un momento (un doble toque para cerrarla no apunta una serie).
  capa.addEventListener("click", () => {
    ocultarCapa();
    marcarRecien();
  });
  descanso.alCambiarDescanso((e) => pintarBarra(e));
  pintarBarra(descanso.estadoDescanso());
}

function pintarBarra(e) {
  const nodo = est.barra;
  if (!nodo) return;
  const visible = e.fase !== "nada";
  nodo.hidden = !visible;
  document.body.classList.toggle("con-descanso", visible);
  if (!visible) return;
  const cuenta = nodo.querySelector(".barra-cuenta");
  const texto = nodo.querySelector(".barra-texto");
  const final = e.fase === "te-toca" || e.fase === "acabo";
  nodo.classList.toggle("barra-final", final);
  nodo.classList.toggle("barra-pausa", e.fase === "pausa");
  if (e.fase === "te-toca") {
    cuenta.textContent = "¡Te toca!";
    texto.textContent = e.capa || e.detalle || "";
  } else if (e.fase === "acabo") {
    cuenta.textContent = "0:00";
    texto.textContent = e.texto;
  } else if (e.fase === "pausa") {
    cuenta.textContent = formatoCuenta(e.quedan);
    texto.textContent = `En pausa · ${e.capa || e.nombre || "Descanso"}`;
  } else {
    cuenta.textContent = formatoCuenta(e.quedan);
    texto.textContent = e.capa || e.texto || "Descanso";
  }
  // El botón de pausa solo se rehace cuando cambia (el tictac de cada segundo solo toca el texto de la cuenta).
  const pausa = nodo.querySelector('[data-accion="descanso-pausa"]');
  const enPausa = String(e.fase === "pausa");
  if (pausa.dataset.enPausa !== enPausa) {
    pausa.dataset.enPausa = enPausa;
    vaciar(pausa.querySelector(".barra-icono")).append(icono(enPausa === "true" ? "seguir" : "pausa", { tamano: 22 }));
    pausa.querySelector(".barra-pausa-texto").textContent = enPausa === "true" ? "Seguir" : "Pausar";
    pausa.setAttribute("aria-label", enPausa === "true" ? "Seguir con el descanso" : "Pausar el descanso");
  }
  for (const boton of nodo.querySelectorAll(".boton-barra")) boton.disabled = final;
}

// La capa a pantalla completa. «Toca para cerrar» va arriba, lejos del ✓. A los 4 s se vuelve transparente, pero
// 700 ms más sigue recogiendo los toques: si el dedo iba a cerrarla justo cuando se cierra sola, no cae en el ✓.
export function mostrarCapa({ titulo, texto }) {
  const c = est.capa;
  if (!c) return;
  vaciar(c).append(h("p", { class: "capa-pie" }, "Toca para cerrar"), h("p", { class: "capa-titulo" }, titulo), h("p", { class: "capa-texto" }, texto || ""));
  c.classList.remove("saliendo");
  c.hidden = false;
  if (est.temporizadorCapa) clearTimeout(est.temporizadorCapa);
  est.temporizadorCapa = setTimeout(desvanecerCapa, MS_CAPA);
}

function desvanecerCapa() {
  if (!est.capa || est.capa.hidden) return;
  est.capa.classList.add("saliendo");
  est.temporizadorCapa = setTimeout(ocultarCapa, MS_CAPA_SALIENDO);
}

function ocultarCapa() {
  if (est.temporizadorCapa) clearTimeout(est.temporizadorCapa);
  est.temporizadorCapa = null;
  if (est.capa) {
    est.capa.hidden = true;
    est.capa.classList.remove("saliendo");
  }
}
