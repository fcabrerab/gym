// Pantalla Rutina (el editor): lista de días (orden y añadir), cada día (nombre, título, nota, días de la
// semana, ejercicios en orden, añadir de la biblioteca o crear uno, eliminar con deshacer) y la hoja de cada
// ejercicio, con etiquetas visibles y cada campo validado al salir. Los campos guardan al cambiar y nunca se
// repinta la lista mientras se escribe.

import { h, icono, vaciar } from "./dom.js";
import { avisar, avisarDeshacer, confirmar, abrirHoja } from "./avisos.js";
import { ctx } from "./contexto.js";
import { miniatura, control, ponerErrorControl, boton, botonIcono, vacio, ayuda } from "./piezas.js";
import * as almacen from "../almacen.js";
import * as S from "../sesion.js";
import { LIMITES, TIPOS, NOMBRE_TIPO, diaPorId, nombreDia, normalizarImagen, normalizarIncremento } from "../modelo.js";
import {
  ahora, idCorto, leerNumero, leerDescanso, formatoDescanso, formatoNumero, recortar, sinTildes, plural, limitar, redondear,
  NOMBRES_DIA, INICIALES_DIA, ORDEN_SEMANA,
} from "../util.js";

function textoSemana(lista = []) {
  const nombres = ORDEN_SEMANA.filter((w) => lista.includes(w)).map((w) => NOMBRES_DIA[w]);
  if (!nombres.length) return "sin día fijo";
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

function enfocar(contenedor, accion, id) {
  const el = contenedor.querySelector(`[data-accion="${accion}"][data-id="${CSS.escape(id)}"]`);
  if (el && !el.disabled) el.focus({ preventScroll: true });
}

export function pintarRutina(contenedor, ruta) {
  if (ruta.nombre === "dia") return pintarDia(contenedor, ruta.param);
  const datos = almacen.datos();
  const n = datos.dias.length;
  const filas = datos.dias.map((d, i) => h("li", { class: "fila-con-orden" },
    h("button", { class: "fila", type: "button", "data-accion": "abrir-dia", "data-id": d.id },
      h("span", { class: "fila-textos" },
        h("span", { class: "fila-titulo" }, nombreDia(d)),
        h("span", { class: "fila-datos" }, `${plural(d.ejercicios.length, "ejercicio", "ejercicios")} · ${textoSemana(d.diasSemana)}`)),
      icono("siguiente", { tamano: 20, clase: "fila-flecha" })),
    h("div", { class: "botones-orden" },
      botonIcono("arriba", "subir-dia", `Subir ${d.label}`, { id: d.id, extra: { disabled: i === 0 } }),
      botonIcono("abajo", "bajar-dia", `Bajar ${d.label}`, { id: d.id, extra: { disabled: i === n - 1 } }))));
  vaciar(contenedor).append(h("div", { class: "pantalla-rutina" },
    h("h1", { class: "titulo-pantalla" }, "Rutina"),
    h("p", { class: "subtitulo-pantalla" }, "Toca un día para cambiar sus ejercicios. Las flechas cambian el orden de las pestañas."),
    h("ul", { class: "lista-filas" }, filas),
    n < LIMITES.dias
      ? boton("Añadir día", "anadir-dia", { clase: "boton-secundario boton-ancho", ico: "mas" })
      : ayuda(`Caben ${LIMITES.dias} días como mucho.`)));
  return undefined;
}

function campoTexto({ campo, rotulo, valor, ayudaTexto = "", max, id }) {
  const idCampo = `rutina-${campo}`;
  return h("div", { class: "campo" },
    h("label", { class: "campo-rotulo", for: idCampo }, rotulo),
    h("input", { class: "campo-texto", id: idCampo, type: "text", "data-campo": campo, "data-id": id, maxlength: String(max), value: valor ?? "", autocomplete: "off", "aria-describedby": `${idCampo}-ayuda ${idCampo}-error` }),
    ayudaTexto ? h("p", { class: "ayuda", id: `${idCampo}-ayuda` }, ayudaTexto) : null,
    h("p", { class: "campo-error", id: `${idCampo}-error` }));
}

function pintarDia(contenedor, id) {
  const datos = almacen.datos();
  const dia = diaPorId(datos, id);
  if (!dia) {
    vaciar(contenedor).append(h("div", { class: "pantalla-rutina" }, botonVolver(), vacio("Este día ya no existe.")));
    return;
  }
  const n = dia.ejercicios.length;
  const semana = h("div", { class: "semana", role: "group", "aria-label": "Qué días de la semana toca" },
    ORDEN_SEMANA.map((w) => h("button", {
      class: ["semana-dia", dia.diasSemana.includes(w) && "activo"], type: "button", "data-accion": "dia-semana", "data-id": dia.id,
      "data-dia": String(w), "aria-pressed": String(dia.diasSemana.includes(w)), "aria-label": NOMBRES_DIA[w],
    }, INICIALES_DIA[w])));
  const filas = dia.ejercicios.map((e, i) => {
    const x = datos.ejercicios[e.exerciseId] || { name: e.exerciseId };
    return h("li", { class: "fila-con-orden" },
      h("button", { class: "fila", type: "button", "data-accion": "editar-entrada", "data-id": e.exerciseId },
        miniatura(x, { tamano: 48 }),
        h("span", { class: "fila-textos" }, h("span", { class: "fila-titulo" }, x.name), h("span", { class: "fila-datos" }, `${e.series} × ${e.reps} · ${e.rest}`))),
      h("div", { class: "botones-orden" },
        botonIcono("arriba", "subir-ejercicio", `Subir ${x.name}`, { id: e.exerciseId, extra: { disabled: i === 0 } }),
        botonIcono("abajo", "bajar-ejercicio", `Bajar ${x.name}`, { id: e.exerciseId, extra: { disabled: i === n - 1 } })));
  });
  const unico = datos.dias.length <= 1;
  vaciar(contenedor).append(h("div", { class: "pantalla-rutina", "data-dia": dia.id },
    botonVolver(),
    h("h1", { class: "titulo-pantalla" }, nombreDia(dia)),
    h("div", { class: "tarjeta formulario" },
      campoTexto({ campo: "label", rotulo: "Nombre del día", valor: dia.label, ayudaTexto: "Sale en la pestaña, p. ej. Martes", max: LIMITES.label, id: dia.id }),
      campoTexto({ campo: "title", rotulo: "Título", valor: dia.title, ayudaTexto: "P. ej. Push", max: LIMITES.title, id: dia.id }),
      campoTexto({ campo: "subtitle", rotulo: "Nota (opcional)", valor: dia.subtitle, ayudaTexto: "P. ej. + abs", max: LIMITES.subtitle, id: dia.id }),
      h("div", { class: "campo" }, h("p", { class: "campo-rotulo" }, "Qué días de la semana toca"), semana,
        h("p", { class: "ayuda" }, "Ese día, la app abre este entreno."))),
    h("h2", { class: "seccion-titulo" }, "Ejercicios"),
    n ? h("ul", { class: "lista-filas" }, filas) : vacio("Este día no tiene ejercicios todavía."),
    n < LIMITES.ejerciciosPorDia
      ? boton("Añadir ejercicio", "anadir-ejercicio", { clase: "boton-principal boton-ancho", ico: "mas", id: dia.id })
      : ayuda(`Caben ${LIMITES.ejerciciosPorDia} ejercicios por día como mucho.`),
    h("div", { class: "zona-borrar" },
      boton("Duplicar este día", "duplicar-dia", { clase: "boton-secundario boton-ancho", ico: "copia", id: dia.id, extra: { disabled: datos.dias.length >= LIMITES.dias } }),
      h("button", { class: "boton boton-peligro-suave boton-ancho", type: "button", "data-accion": "eliminar-dia", "data-id": dia.id, disabled: unico, "aria-describedby": unico ? "ayuda-eliminar" : null },
        icono("papelera", { tamano: 20 }), h("span", null, "Eliminar este día")),
      unico ? h("p", { class: "ayuda", id: "ayuda-eliminar" }, "Tiene que quedar al menos un día.") : null)));
}

function botonVolver() {
  return h("button", { class: "boton-volver", type: "button", "data-accion": "volver-rutina" }, icono("volver", { tamano: 20 }), h("span", null, "Rutina"));
}

// --- Acciones de la pantalla ---

export function alAccionRutina(accion, el) {
  const id = el.dataset.id;
  const contenedor = el.closest("#pantalla");
  switch (accion) {
    case "abrir-dia": return ctx.irA(`#/rutina/dia/${encodeURIComponent(id)}`, "push");
    case "volver-rutina":
      if (history.state?.nivel > 1) return history.back();
      return ctx.irA("#/rutina", "replace");
    case "subir-dia": case "bajar-dia": {
      almacen.mutar((d) => {
        const i = d.dias.findIndex((x) => x.id === id);
        const j = i + (accion === "subir-dia" ? -1 : 1);
        if (i < 0 || j < 0 || j >= d.dias.length) return;
        [d.dias[i], d.dias[j]] = [d.dias[j], d.dias[i]];
      });
      ctx.repintar();
      return enfocar(contenedor, accion, id);
    }
    case "anadir-dia": return anadirDia();
    case "dia-semana": {
      const w = Number(el.dataset.dia);
      let activo = false;
      almacen.mutar((d) => {
        const dia = diaPorId(d, id);
        if (!dia) return;
        dia.diasSemana = dia.diasSemana.includes(w) ? dia.diasSemana.filter((x) => x !== w) : [...dia.diasSemana, w].sort();
        activo = dia.diasSemana.includes(w);
      });
      el.classList.toggle("activo", activo);
      el.setAttribute("aria-pressed", String(activo));
      return undefined;
    }
    case "subir-ejercicio": case "bajar-ejercicio": {
      const diaId = el.closest("[data-dia]")?.dataset.dia;
      almacen.mutar((d) => {
        const dia = diaPorId(d, diaId);
        if (!dia) return;
        const i = dia.ejercicios.findIndex((e) => e.exerciseId === id);
        const j = i + (accion === "subir-ejercicio" ? -1 : 1);
        if (i < 0 || j < 0 || j >= dia.ejercicios.length) return;
        [dia.ejercicios[i], dia.ejercicios[j]] = [dia.ejercicios[j], dia.ejercicios[i]];
      });
      ctx.repintar();
      return enfocar(contenedor, accion, id);
    }
    case "editar-entrada": {
      const diaId = el.closest("[data-dia]")?.dataset.dia;
      return abrirHojaEjercicio(diaId, id, { alCerrar: () => ctx.repintar() });
    }
    case "anadir-ejercicio": return hojaAnadir(id);
    case "eliminar-dia": return eliminarDia(id);
    case "duplicar-dia": return duplicarDia(id);
    default: return undefined;
  }
}

// Los campos del día guardan al cambiar (al salir del campo), sin repintar.
export function alCampoRutina(ev) {
  if (ev.type !== "change") return;
  const campo = ev.target?.dataset?.campo;
  const id = ev.target?.dataset?.id;
  if (!["label", "title", "subtitle"].includes(campo) || !id) return;
  const error = ev.target.closest(".campo")?.querySelector(".campo-error");
  const valor = recortar(ev.target.value, LIMITES[campo]);
  if (campo === "label" && !valor) {
    if (error) error.textContent = "El nombre del día no puede quedar vacío.";
    ev.target.setAttribute("aria-invalid", "true");
    return;
  }
  if (error) error.textContent = "";
  ev.target.removeAttribute("aria-invalid");
  ev.target.value = valor;
  almacen.mutar((d) => {
    const dia = diaPorId(d, id);
    if (dia) dia[campo] = valor;
  });
  const titulo = ev.target.closest(".pantalla-rutina")?.querySelector(".titulo-pantalla");
  const dia = diaPorId(almacen.datos(), id);
  if (titulo && dia) titulo.textContent = nombreDia(dia);
}

function anadirDia() {
  const datos = almacen.datos();
  if (datos.dias.length >= LIMITES.dias) return;
  let id = `day-${idCorto()}`;
  while (diaPorId(datos, id)) id = `day-${idCorto()}`;
  almacen.mutar((d) => {
    d.dias.push({ id, label: `Día ${d.dias.length + 1}`, title: "Nuevo día", subtitle: "", diasSemana: [], ejercicios: [] });
  });
  ctx.irA(`#/rutina/dia/${encodeURIComponent(id)}`, "push");
  avisar({ texto: "Día añadido. Ponle nombre y ejercicios." });
}

function duplicarDia(id) {
  const datos = almacen.datos();
  const dia = diaPorId(datos, id);
  if (!dia || datos.dias.length >= LIMITES.dias) return;
  let nuevo = `day-${idCorto()}`;
  while (diaPorId(datos, nuevo)) nuevo = `day-${idCorto()}`;
  const deshacer = almacen.mutar((d) => {
    const i = d.dias.findIndex((x) => x.id === id);
    const copia = { ...structuredClone(d.dias[i]), id: nuevo, label: recortar(`${dia.label} (2)`, LIMITES.label), diasSemana: [] };
    d.dias.splice(i + 1, 0, copia);
  });
  ctx.irA(`#/rutina/dia/${encodeURIComponent(nuevo)}`, "replace");
  avisarDeshacer(`Día duplicado: ${dia.label} (2)`, deshacer, () => ctx.irA("#/rutina", "replace"));
}

async function eliminarDia(id) {
  const datos = almacen.datos();
  const dia = diaPorId(datos, id);
  if (!dia || datos.dias.length <= 1) return;
  const sesion = almacen.leerSesion();
  if (sesion && sesion.diaId === id) {
    avisar({ texto: "Hay una sesión en marcha de este día: termínala o descártala antes de eliminarlo." });
    return;
  }
  const ok = await confirmar({
    titulo: "Eliminar el día",
    texto: `¿Eliminar ${nombreDia(dia)}? Los ejercicios siguen en la biblioteca y el historial no se toca.`,
    aceptar: "Eliminar",
    peligro: true,
  });
  if (!ok) return;
  const deshacer = almacen.mutar((d) => { d.dias = d.dias.filter((x) => x.id !== id); });
  ctx.irA("#/rutina", "replace");
  avisarDeshacer(`Día eliminado: ${nombreDia(dia)}`, deshacer, () => ctx.repintar());
}

// --- Hoja «Añadir ejercicio» ---

function hojaAnadir(diaId) {
  const datos = almacen.datos();
  const dia = diaPorId(datos, diaId);
  if (!dia) return;
  const enDia = new Set(dia.ejercicios.map((e) => e.exerciseId));
  const lista = Object.values(datos.ejercicios).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const filas = lista.map((x) => h("li", { "data-buscar": sinTildes(`${x.name} ${x.muscleGroup}`) },
    h("button", { class: "fila fila-biblioteca", type: "button", "data-accion": "elegir-biblioteca", "data-id": x.id, disabled: enDia.has(x.id) },
      miniatura(x, { tamano: 48 }),
      h("span", { class: "fila-textos" },
        h("span", { class: "fila-titulo" }, x.name),
        h("span", { class: "fila-datos" }, enDia.has(x.id) ? "Ya está en este día" : [x.muscleGroup, NOMBRE_TIPO[x.tipo]].filter(Boolean).join(" · "))))));
  let tipoNuevo = "peso";
  const tipos = h("div", { class: "selector selector-tipo", role: "group", "aria-label": "Tipo" },
    TIPOS.map((t) => h("button", { class: ["selector-opcion", t === tipoNuevo && "activa"], type: "button", "data-accion": "nuevo-tipo", "data-valor": t, "aria-pressed": String(t === tipoNuevo) }, NOMBRE_TIPO[t])));
  const sinResultados = h("p", { class: "ayuda", hidden: true }, "Ningún ejercicio coincide. Puedes crearlo abajo.");
  const cuerpo = [
    h("div", { class: "campo" },
      h("label", { class: "campo-rotulo", for: "buscar-ejercicio" }, "Buscar por nombre o grupo"),
      h("input", { class: "campo-texto", id: "buscar-ejercicio", type: "search", "data-campo": "buscar", autocomplete: "off", enterkeyhint: "search" })),
    h("ul", { class: "lista-filas lista-biblioteca" }, filas),
    sinResultados,
    h("section", { class: "tarjeta formulario crear-ejercicio" },
      h("h3", { class: "tarjeta-titulo" }, "Crear un ejercicio nuevo"),
      h("div", { class: "campo" },
        h("label", { class: "campo-rotulo", for: "nuevo-nombre" }, "Nombre"),
        h("input", { class: "campo-texto", id: "nuevo-nombre", type: "text", "data-campo": "nuevo-nombre", maxlength: String(LIMITES.nombre), autocomplete: "off" }),
        h("p", { class: "campo-error", id: "nuevo-nombre-error" })),
      h("div", { class: "campo" }, h("p", { class: "campo-rotulo" }, "Tipo"), tipos),
      h("div", { class: "campo" },
        h("label", { class: "campo-rotulo", for: "nuevo-grupo" }, "Grupo muscular"),
        h("input", { class: "campo-texto", id: "nuevo-grupo", type: "text", "data-campo": "nuevo-grupo", maxlength: String(LIMITES.grupo), autocomplete: "off", list: "grupos-existentes" }),
        datalistGrupos(datos)),
      boton("Crear y añadir", "crear-ejercicio", { clase: "boton-secundario boton-ancho", ico: "mas" })),
  ];
  const anadir = (exerciseId, nuevoEjercicio = null) => {
    const x = nuevoEjercicio || almacen.datos().ejercicios[exerciseId];
    const deshacer = almacen.mutar((d) => {
      if (nuevoEjercicio) d.ejercicios[exerciseId] = nuevoEjercicio;
      const dd = diaPorId(d, diaId);
      if (!dd || dd.ejercicios.some((e) => e.exerciseId === exerciseId) || dd.ejercicios.length >= LIMITES.ejerciciosPorDia) return;
      dd.ejercicios.push({ exerciseId, series: 3, reps: x.tipo === "tiempo" ? "30-45 s" : "8-12", rest: "2:00" });
    });
    hoja.cerrar().then(() => {
      ctx.repintar();
      avisarDeshacer(`Añadido a ${dia.label}: ${x.name}`, deshacer, () => ctx.repintar());
    });
  };
  const hoja = abrirHoja({
    titulo: `Añadir ejercicio a ${dia.label}`,
    cuerpo,
    clase: "hoja-alta",
    alAccion: (accion, el) => {
      if (accion === "elegir-biblioteca") anadir(el.dataset.id);
      else if (accion === "nuevo-tipo") {
        tipoNuevo = el.dataset.valor;
        for (const b of hoja.cuerpo.querySelectorAll('[data-accion="nuevo-tipo"]')) {
          b.classList.toggle("activa", b === el);
          b.setAttribute("aria-pressed", String(b === el));
        }
      } else if (accion === "crear-ejercicio") {
        const nombre = recortar(hoja.cuerpo.querySelector('[data-campo="nuevo-nombre"]').value, LIMITES.nombre);
        const error = hoja.cuerpo.querySelector("#nuevo-nombre-error");
        if (!nombre) {
          error.textContent = "El nombre no puede quedar vacío.";
          hoja.cuerpo.querySelector('[data-campo="nuevo-nombre"]').focus();
          return;
        }
        const grupo = recortar(hoja.cuerpo.querySelector('[data-campo="nuevo-grupo"]').value, LIMITES.grupo);
        const id = `custom-${crypto.randomUUID()}`;
        anadir(id, { id, name: nombre, image: "", muscleGroup: grupo, pr: null, tipo: tipoNuevo, incremento: 2.5, notas: "" });
      }
    },
    alCampo: (ev) => {
      if (ev.target?.dataset?.campo !== "buscar") return;
      const q = sinTildes(ev.target.value.trim());
      let visibles = 0;
      for (const li of hoja.cuerpo.querySelectorAll(".lista-biblioteca > li")) {
        const ok = !q || li.dataset.buscar.includes(q);
        li.hidden = !ok;
        if (ok) visibles += 1;
      }
      sinResultados.hidden = visibles > 0;
    },
  });
}

function datalistGrupos(datos) {
  const grupos = [...new Set(Object.values(datos.ejercicios).map((x) => x.muscleGroup).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  return h("datalist", { id: "grupos-existentes" }, grupos.map((g) => h("option", { value: g })));
}

// Elige otro día para mover o copiar un ejercicio (F35). Devuelve el id del día o null.
function elegirOtroDia({ titulo, diaId, exerciseId }) {
  return new Promise((resolver) => {
    let elegido = null;
    const datos = almacen.datos();
    const filas = datos.dias.filter((d) => d.id !== diaId).map((d) => {
      const ya = d.ejercicios.some((e) => e.exerciseId === exerciseId);
      const lleno = d.ejercicios.length >= LIMITES.ejerciciosPorDia;
      return h("li", null, h("button", { class: "fila fila-biblioteca", type: "button", "data-accion": "elegir-destino", "data-id": d.id, disabled: ya || lleno },
        h("span", { class: "fila-textos" },
          h("span", { class: "fila-titulo" }, nombreDia(d)),
          h("span", { class: "fila-datos" }, ya ? "Ya está en este día" : lleno ? `Ya tiene ${LIMITES.ejerciciosPorDia} ejercicios` : plural(d.ejercicios.length, "ejercicio", "ejercicios")))));
    });
    const hoja = abrirHoja({
      titulo,
      cuerpo: h("ul", { class: "lista-filas" }, filas),
      alAccion: (accion, el) => {
        if (accion === "elegir-destino") {
          elegido = el.dataset.id;
          hoja.cerrar();
        }
      },
      alCerrar: () => setTimeout(() => resolver(elegido), 0),
    });
  });
}

// --- Hoja del ejercicio (también se abre desde Entreno con «Editar») ---

const ATAJOS_REPS = ["8-12", "10-15", "12-15", "12-20"];
const ATAJOS_DESCANSO = ["1:00", "1:30", "2:00", "2:30", "3:00"];
const ATAJOS_INCREMENTO = [1, 2, 2.5, 5];

export function abrirHojaEjercicio(diaId, exerciseId, { alCerrar = null } = {}) {
  const datos = almacen.datos();
  const dia = diaPorId(datos, diaId);
  const entrada = dia?.ejercicios.find((e) => e.exerciseId === exerciseId);
  const x = datos.ejercicios[exerciseId];
  if (!dia || !entrada || !x) return;
  let tipo = x.tipo;
  let prPendiente = null; // la marca se guarda al salir del campo o al cerrar la hoja (no en cada toque de −/+)

  const chips = (accion, valores, formato = (v) => v) => h("div", { class: "chips" },
    valores.map((v) => h("button", { class: "chip", type: "button", "data-accion": accion, "data-valor": String(v) }, formato(v))));
  const campo = (nombre, rotulo, nodo, ayudaTexto = "") => h("div", { class: "campo", "data-bloque": nombre },
    h("label", { class: "campo-rotulo", for: `hoja-${nombre}` }, rotulo), nodo,
    ayudaTexto ? h("p", { class: "ayuda" }, ayudaTexto) : null,
    h("p", { class: "campo-error", id: `hoja-${nombre}-error` }));
  const texto = (nombre, valor, extra = {}) => h("input", { class: "campo-texto", id: `hoja-${nombre}`, type: "text", "data-campo": nombre, value: valor ?? "", autocomplete: "off", "aria-describedby": `hoja-${nombre}-error`, ...extra });

  const tipos = h("div", { class: "selector selector-tipo", role: "group", "aria-label": "Tipo" },
    TIPOS.map((t) => h("button", { class: ["selector-opcion", t === tipo && "activa"], type: "button", "data-accion": "tipo", "data-valor": t, "aria-pressed": String(t === tipo) }, NOMBRE_TIPO[t])));

  const bloqueMarca = h("div", { class: "solo-peso", hidden: tipo !== "peso" },
    control({ campo: "pr", rotulo: "Marca (kg)", valor: x.pr != null ? formatoNumero(x.pr) : "", unidad: "kg", inputmode: "decimal", id: exerciseId }),
    campo("incremento", "Sube de (kg)", h("div", null, texto("incremento", formatoNumero(x.incremento ?? 2.5), { inputmode: "decimal" }),
      chips("incremento-atajo", ATAJOS_INCREMENTO, (v) => formatoNumero(v))), "Lo que suman o restan −/+ al apuntar el peso."));

  const cuerpo = h("div", { class: "formulario" },
    campo("name", "Nombre", texto("name", x.name, { maxlength: String(LIMITES.nombre) })),
    h("div", { class: "campo" }, h("p", { class: "campo-rotulo" }, "Tipo"), tipos),
    control({ campo: "series", rotulo: "Series", valor: String(entrada.series), inputmode: "numeric", id: exerciseId, etiquetaMenos: "Una serie menos", etiquetaMas: "Una serie más" }),
    campo("reps", "Repeticiones", h("div", null, texto("reps", entrada.reps, { maxlength: String(LIMITES.reps) }), chips("reps-atajo", ATAJOS_REPS)),
      "Un número o un rango: 8-12, 10-15, 20-45 s/lado"),
    h("div", { class: "campo" },
      control({ campo: "rest", rotulo: "Descanso", valor: entrada.rest, inputmode: "text", id: exerciseId, textoMenos: "−15 s", textoMas: "+15 s", etiquetaMenos: "Quitar 15 segundos de descanso", etiquetaMas: "Añadir 15 segundos de descanso" }),
      chips("rest-atajo", ATAJOS_DESCANSO)),
    bloqueMarca,
    campo("muscleGroup", "Grupo muscular", texto("muscleGroup", x.muscleGroup, { maxlength: String(LIMITES.grupo), list: "grupos-existentes" })),
    datalistGrupos(datos),
    campo("notas", "Notas de la máquina", h("textarea", { class: "campo-texto campo-area", id: "hoja-notas", "data-campo": "notas", maxlength: String(LIMITES.notas), rows: "2", value: x.notas || "" }),
      "P. ej. asiento 4 · respaldo 2. Salen bajo el nombre al entrenar."),
    h("details", { class: "mas-opciones" }, h("summary", null, "Más opciones"),
      campo("image", "Imagen (dirección web)", texto("image", x.image, { inputmode: "url", maxlength: String(LIMITES.imagen) }), "Déjala vacía para usar la inicial sobre un color.")),
    datos.dias.length > 1 ? h("div", { class: "botones-otro-dia" },
      boton("Mover a otro día…", "mover-a-dia", { clase: "boton-secundario" }),
      boton("Copiar a otro día…", "copiar-a-dia", { clase: "boton-secundario", ico: "copia" })) : null,
    h("p", { class: "ayuda nota-pie" }, "El nombre, el tipo, la marca, el grupo, las notas y la imagen son los mismos en todos los días con este ejercicio. Series, repeticiones y descanso son de este día."),
    // Quitar va aparte, al final y lejos de «Hecho»: un toque con el pulgar no se va al botón de al lado.
    h("div", { class: "zona-borrar-hoja" },
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "quitar-ejercicio" }, icono("papelera", { tamano: 20 }), h("span", null, "Quitar de este día"))));

  const error = (nombre, mensaje) => {
    const p = cuerpo.querySelector(`#hoja-${nombre}-error`);
    const nodo = cuerpo.querySelector(`[data-campo="${nombre}"]`);
    if (p) {
      p.textContent = mensaje || "";
      if (mensaje) p.setAttribute("role", "alert");
      else p.removeAttribute("role");
    }
    if (nodo) {
      if (mensaje) nodo.setAttribute("aria-invalid", "true");
      else nodo.removeAttribute("aria-invalid");
    }
  };
  const guardarEntrada = (cambios) => almacen.mutar((d) => {
    const e = diaPorId(d, diaId)?.ejercicios.find((y) => y.exerciseId === exerciseId);
    if (e) Object.assign(e, cambios);
  });
  const guardarEjercicio = (cambios) => almacen.mutar((d) => {
    if (d.ejercicios[exerciseId]) Object.assign(d.ejercicios[exerciseId], cambios);
  });

  const validarYGuardar = (nombre, nodo) => {
    const valor = nodo.value;
    switch (nombre) {
      case "name": {
        const v = recortar(valor, LIMITES.nombre);
        if (!v) return error("name", "El nombre no puede quedar vacío.");
        error("name", "");
        nodo.value = v;
        guardarEjercicio({ name: v });
        hoja.nodo.querySelector(".hoja-titulo").textContent = v;
        return undefined;
      }
      case "series": {
        const n = leerNumero(valor);
        const ctrl = nodo.closest(".control");
        if (n == null || !Number.isInteger(n) || n < LIMITES.seriesMin || n > LIMITES.seriesMax) return ponerErrorControl(ctrl, "Pon entre 1 y 10 series.");
        ponerErrorControl(ctrl, "");
        return guardarEntrada({ series: n });
      }
      case "reps": {
        const v = recortar(valor, LIMITES.reps);
        if (!v) return error("reps", "Escribe las repeticiones, por ejemplo 8-12.");
        error("reps", "");
        nodo.value = v;
        return guardarEntrada({ reps: v });
      }
      case "rest": {
        const s = leerDescanso(valor);
        const ctrl = nodo.closest(".control");
        if (s == null) return ponerErrorControl(ctrl, "Escribe el descanso como 1:30 (minutos:segundos).");
        ponerErrorControl(ctrl, "");
        nodo.value = formatoDescanso(s);
        return guardarEntrada({ rest: formatoDescanso(s) });
      }
      case "pr": {
        const ctrl = nodo.closest(".control");
        const t = valor.trim();
        const kg = t ? leerNumero(t) : null;
        if (t && (kg == null || kg <= 0 || kg > LIMITES.kgMax)) return ponerErrorControl(ctrl, "Escribe un número, por ejemplo 82,5, o déjalo vacío.");
        ponerErrorControl(ctrl, "");
        prPendiente = null;
        const nuevo = kg == null ? null : redondear(kg, 0.01);
        if ((almacen.datos().ejercicios[exerciseId]?.pr ?? null) !== nuevo) {
          almacen.mutar((d) => S.cambiarMarca(d, exerciseId, nuevo, ahora(), "a-mano"));
        }
        return undefined;
      }
      case "incremento": {
        const n = leerNumero(valor);
        if (n == null || n < LIMITES.incrementoMin || n > LIMITES.incrementoMax) return error("incremento", "Pon un número entre 0,25 y 20.");
        error("incremento", "");
        nodo.value = formatoNumero(n);
        return guardarEjercicio({ incremento: normalizarIncremento(n) });
      }
      case "muscleGroup": {
        const v = recortar(valor, LIMITES.grupo);
        nodo.value = v;
        return guardarEjercicio({ muscleGroup: v });
      }
      case "notas": {
        const v = recortar(valor, LIMITES.notas);
        return guardarEjercicio({ notas: v });
      }
      case "image": {
        const t = valor.trim();
        const v = normalizarImagen(t);
        if (t && !v) return error("image", "Pon una dirección que empiece por https://.");
        error("image", "");
        return guardarEjercicio({ image: v });
      }
      default: return undefined;
    }
  };

  const hoja = abrirHoja({
    titulo: x.name,
    cuerpo,
    clase: "hoja-alta",
    pie: [boton("Hecho", "hecho", { clase: "boton-principal boton-ancho" })],
    alCampo: (ev) => {
      const nombre = ev.target?.dataset?.campo;
      if (!nombre) return;
      if (ev.type === "change") validarYGuardar(nombre, ev.target);
      else if (nombre === "pr") prPendiente = ev.target;
    },
    alAccion: (accion, el) => {
      const valorDe = (nombre) => cuerpo.querySelector(`[data-campo="${nombre}"]`);
      switch (accion) {
        case "tipo": {
          tipo = el.dataset.valor;
          for (const b of cuerpo.querySelectorAll('[data-accion="tipo"]')) {
            b.classList.toggle("activa", b === el);
            b.setAttribute("aria-pressed", String(b === el));
          }
          bloqueMarca.hidden = tipo !== "peso";
          guardarEjercicio({ tipo });
          return;
        }
        case "series-menos": case "series-mas": {
          const c = valorDe("series");
          const n = limitar((leerNumero(c.value) ?? 3) + (accion === "series-mas" ? 1 : -1), LIMITES.seriesMin, LIMITES.seriesMax);
          c.value = String(Math.round(n));
          validarYGuardar("series", c);
          return;
        }
        case "rest-menos": case "rest-mas": {
          const c = valorDe("rest");
          const s = limitar((leerDescanso(c.value) ?? 90) + (accion === "rest-mas" ? 15 : -15), 0, LIMITES.descansoMax);
          c.value = formatoDescanso(s);
          validarYGuardar("rest", c);
          return;
        }
        case "pr-menos": case "pr-mas": {
          const c = valorDe("pr");
          const inc = almacen.datos().ejercicios[exerciseId]?.incremento || 2.5;
          const n = limitar(redondear((leerNumero(c.value) ?? 0) + (accion === "pr-mas" ? inc : -inc), 0.25), 0, LIMITES.kgMax);
          c.value = n > 0 ? formatoNumero(n) : "";
          ponerErrorControl(c.closest(".control"), "");
          prPendiente = c;
          return;
        }
        case "reps-atajo": {
          const c = valorDe("reps");
          c.value = el.dataset.valor;
          validarYGuardar("reps", c);
          return;
        }
        case "rest-atajo": {
          const c = valorDe("rest");
          c.value = el.dataset.valor;
          validarYGuardar("rest", c);
          return;
        }
        case "incremento-atajo": {
          const c = valorDe("incremento");
          c.value = formatoNumero(Number(el.dataset.valor));
          validarYGuardar("incremento", c);
          return;
        }
        case "hecho":
          hoja.cerrar();
          return;
        case "mover-a-dia": case "copiar-a-dia": {
          const mover = accion === "mover-a-dia";
          const nombre = almacen.datos().ejercicios[exerciseId]?.name || x.name;
          elegirOtroDia({ titulo: mover ? `Mover a otro día: ${nombre}` : `Copiar a otro día: ${nombre}`, diaId, exerciseId }).then((destino) => {
            if (!destino) return;
            const deshacer = almacen.mutar((d) => {
              const origen = diaPorId(d, diaId);
              const dest = diaPorId(d, destino);
              const entradaActual = origen?.ejercicios.find((e) => e.exerciseId === exerciseId);
              if (!entradaActual || !dest || dest.ejercicios.some((e) => e.exerciseId === exerciseId) || dest.ejercicios.length >= LIMITES.ejerciciosPorDia) return;
              dest.ejercicios.push(structuredClone(entradaActual));
              if (mover) origen.ejercicios = origen.ejercicios.filter((e) => e.exerciseId !== exerciseId);
            });
            const destinoDia = diaPorId(almacen.datos(), destino);
            const texto = `${mover ? "Movido" : "Copiado"} a ${destinoDia?.label || "otro día"}: ${nombre}`;
            const avisarHecho = () => avisarDeshacer(texto, deshacer, () => ctx.repintar());
            if (mover) {
              prPendiente = null;
              hoja.cerrar().then(avisarHecho);
            } else {
              avisarHecho();
            }
          });
          return;
        }
        case "quitar-ejercicio": {
          prPendiente = null;
          const deshacer = almacen.mutar((d) => {
            const dd = diaPorId(d, diaId);
            if (dd) dd.ejercicios = dd.ejercicios.filter((e) => e.exerciseId !== exerciseId);
          });
          hoja.cerrar().then(() => {
            avisarDeshacer(`Quitado de ${dia.label}: ${x.name}`, deshacer, () => ctx.repintar());
          });
          return;
        }
        default:
      }
    },
    alCerrar: () => {
      // La marca tocada con −/+ (sin salir del campo) se guarda al cerrar.
      if (prPendiente && prPendiente.isConnected !== undefined) validarYGuardar("pr", prPendiente);
      alCerrar?.();
    },
  });
}
