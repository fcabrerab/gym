// Pantalla Rutina (el editor): lista de días (orden y añadir), cada día (nombre, título, nota, días de la
// semana, ejercicios en orden, añadir de la biblioteca o crear uno, quitar con deshacer) y la hoja de cada
// ejercicio, con etiquetas visibles y cada campo validado al salir. Nunca se repinta la lista mientras se escribe. El
// orden (de los días y de los ejercicios) se cambia con las flechas o arrastrando una fila (D-122), y las filas se
// deslizan a su sitio nuevo en vez de saltar.
// Desde la 1.2.0 (D-123), nada de esto se guarda al momento: va al borrador (js/borrador.js) y abajo sale una barra con
// «Cancelar» y «Guardar». Al momento siguen añadir, duplicar y eliminar un día (con cambios sin guardar, antes se
// pregunta qué hacer con ellos) y la hoja de un ejercicio abierta desde Entreno (su «Guardar» guarda ya).

import { h, icono, vaciar } from "./dom.js";
import { avisar, avisarDeshacer, confirmar, elegir, abrirHoja } from "./avisos.js";
import { ctx } from "./contexto.js";
import { miniatura, control, ponerErrorControl, boton, botonIcono, vacio, ayuda } from "./piezas.js";
import { hacerArrastrable } from "./arrastre.js";
import { foto, animar } from "./movimiento.js";
import * as almacen from "../almacen.js";
import * as borrador from "../borrador.js";
import * as S from "../sesion.js";
import { LIMITES, TIPOS, NOMBRE_TIPO, DESCANSO_SUPERSET_DEFECTO, diaPorId, nombreDia, normalizarImagen, normalizarIncremento, parejaSuperset, agruparEjercicios } from "../modelo.js";
import {
  ahora, idCorto, leerNumero, leerDescanso, formatoDescanso, formatoNumero, recortar, sinTildes, plural, limitar, redondear,
  NOMBRES_DIA, INICIALES_DIA, ORDEN_SEMANA,
} from "../util.js";

// Lo que se ve y se cambia en Rutina: la rutina guardada con los cambios sin guardar encima.
const datosRutina = () => borrador.vista();

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

// --- Supersets (D-120): dos ejercicios del día, siempre seguidos en la lista, que se mueven juntos ---

const claveGrupo = (g) => (g.tipo === "solo" ? g.entrada.exerciseId : g.a.exerciseId);
const aplanar = (grupos) => grupos.flatMap((g) => (g.tipo === "solo" ? [g.entrada] : [g.a, g.b]));

// Sube o baja el grupo (solo o superset) al que pertenece el ejercicio, entero, pasando por encima del grupo
// vecino (que puede ser de 1 o de 2). Devuelve true si lo ha movido.
function moverGrupo(dia, exerciseId, sentido) {
  const grupos = agruparEjercicios(dia.ejercicios);
  const i = grupos.findIndex((g) => (g.tipo === "solo" ? g.entrada.exerciseId === exerciseId : g.a.exerciseId === exerciseId || g.b.exerciseId === exerciseId));
  const j = i + sentido;
  if (i < 0 || j < 0 || j >= grupos.length) return false;
  [grupos[i], grupos[j]] = [grupos[j], grupos[i]];
  dia.ejercicios = aplanar(grupos);
  return true;
}

// Lleva el grupo de esa clave (solo o superset, entero) al puesto «hasta» de la lista de grupos (al soltar un
// arrastre, D-122). Devuelve true si lo ha movido.
function moverGrupoA(dia, clave, hasta) {
  const grupos = agruparEjercicios(dia.ejercicios);
  const i = grupos.findIndex((g) => claveGrupo(g) === clave);
  if (i < 0 || !Number.isInteger(hasta) || hasta < 0 || hasta >= grupos.length || i === hasta) return false;
  const [g] = grupos.splice(i, 1);
  grupos.splice(hasta, 0, g);
  dia.ejercicios = aplanar(grupos);
  return true;
}

// Quita un ejercicio del día; si iba en un superset, su pareja se queda suelta (un superset es siempre de dos).
function quitarDelDia(dia, exerciseId) {
  const propio = dia.ejercicios.find((e) => e.exerciseId === exerciseId);
  if (propio?.supersetId) {
    for (const e of dia.ejercicios) {
      if (e !== propio && e.supersetId === propio.supersetId) {
        delete e.supersetId;
        delete e.restSuperset;
      }
    }
  }
  dia.ejercicios = dia.ejercicios.filter((e) => e.exerciseId !== exerciseId);
}

// --- Orden con transición y arrastrando (D-122) ---

// Las filas que se ordenan en pantalla (días o grupos de ejercicios), cada una con su clave: data-orden.
const piezasOrden = (contenedor) => [...contenedor.querySelectorAll("[data-orden]")].map((li) => [li.dataset.orden, li]);

// Cambia el orden (con «cambiar», que lo pone en el borrador), repinta y desliza cada fila desde donde estaba (también
// la que se soltaba, desde donde la dejó el dedo). Devuelve false si no había nada que cambiar.
function reordenar(contenedor, cambiar) {
  const antes = foto(piezasOrden(contenedor));
  if (!cambiar()) return false;
  ctx.repintar();
  animar(antes, piezasOrden(contenedor));
  return true;
}

// Al levantar una fila para arrastrarla, un toque de vibración (si está activada en Ajustes).
function vibrarAlLevantar() {
  if (almacen.datos()?.ajustes?.vibracion) navigator.vibrate?.(15);
}

function soltarDia(contenedor, clave, hasta) {
  return reordenar(contenedor, () => {
    const dias = datosRutina().dias;
    const i = dias.findIndex((x) => x.id === clave);
    if (i < 0 || !Number.isInteger(hasta) || hasta < 0 || hasta >= dias.length || i === hasta) return false;
    borrador.cambiar((d) => {
      const j = d.dias.findIndex((x) => x.id === clave);
      if (j < 0) return;
      const [x] = d.dias.splice(j, 1);
      d.dias.splice(hasta, 0, x);
    });
    return true;
  });
}

function soltarEjercicio(contenedor, diaId, clave, hasta) {
  return reordenar(contenedor, () => {
    const dia = diaPorId(datosRutina(), diaId);
    if (!dia || !moverGrupoA(structuredClone(dia), clave, hasta)) return false;
    borrador.cambiar((d) => {
      const dd = diaPorId(d, diaId);
      if (dd) moverGrupoA(dd, clave, hasta);
    });
    return true;
  });
}

// --- La barra «Cancelar · Guardar» (D-123) ---

// Fija sobre la navegación, en la lista de días y en cada día; solo se ve con cambios sin guardar.
function barraBorrador() {
  return h("div", { class: "barra-borrador", role: "region", "aria-label": "Cambios sin guardar", hidden: !borrador.hay() },
    h("div", { class: "barra-borrador-fila" },
      h("p", { class: "barra-borrador-texto" }, "Cambios sin guardar"),
      boton("Cancelar", "cancelar-rutina", { clase: "boton-secundario" }),
      boton("Guardar", "guardar-rutina", { clase: "boton-principal" })));
}

// Enseña u oculta la barra según haya cambios sin guardar; con {ya: true}, la enseña ya (se está escribiendo un cambio
// que llega al borrador al salir del campo). app.js la llama al pintar cada pantalla y con cada cambio del borrador.
export function actualizarBarra({ ya = false } = {}) {
  const barra = document.querySelector("#pantalla .barra-borrador");
  const ver = Boolean(barra) && (ya || borrador.hay());
  if (barra) barra.hidden = !ver;
  document.body.classList.toggle("con-borrador", ver);
}

// «Guardar»: pasa los cambios a tus datos. Si la rutina guardada ha cambiado mientras tanto, pregunta antes de pisarla.
// Devuelve true si se ha guardado.
export async function guardarBorrador() {
  let r = borrador.guardar();
  if (!r.ok && r.motivo === "cambiada") {
    const pisar = await confirmar({
      titulo: "La rutina ha cambiado",
      texto: "Mientras tenías estos cambios sin guardar, la rutina guardada cambió (en otra ventana, al cargar una copia o desde Entreno). Si guardas los tuyos, los días quedan como los tienes aquí.",
      aceptar: "Guardar los míos",
      cancelar: "Seguir editando",
    });
    if (!pisar) return false;
    r = borrador.guardar({ pisar: true });
  }
  if (!r.ok && r.motivo === "bloqueado") {
    avisar({ texto: "Hay datos de una versión más nueva de la app (de otra ventana). Recarga para actualizar.", accion: "Recargar", alPulsar: () => location.reload(), fijo: true });
  }
  return r.ok;
}

// Qué hacer con los cambios sin guardar antes de irse de Rutina (o de algo que va al momento): «Guardar», «Descartar» o
// seguir como se estaba. Devuelve true si ya no quedan (guardados o descartados) y se puede seguir.
export async function resolverBorrador({ texto = "Tienes cambios sin guardar en la rutina.", seguir = "Seguir editando", conDeshacer = true } = {}) {
  if (!borrador.hay()) return true;
  const r = await elegir({
    titulo: "Cambios sin guardar",
    texto,
    opciones: [
      { accion: "guardar-cambios", texto: "Guardar", clase: "boton-principal" },
      { accion: "descartar-cambios", texto: "Descartar", clase: "boton-peligro-suave" },
      { accion: "seguir-editando", texto: seguir, clase: "boton-secundario" },
    ],
  });
  if (r === "guardar-cambios") {
    const ok = await guardarBorrador();
    if (ok) avisar({ texto: "Cambios guardados." });
    return ok;
  }
  if (r === "descartar-cambios") {
    const deshacer = borrador.descartar();
    if (conDeshacer) avisarDeshacer("Cambios descartados.", deshacer, () => ctx.repintar());
    return true;
  }
  return false;
}

// Antes de «Guardar» o «Cancelar», lo que se está escribiendo en un campo del día llega al borrador (al salir del
// campo). Con el dedo ya pasa solo al tocar el botón; con el teclado o un lector de pantalla, no siempre. Si no, al
// repintar, el navegador lo mandaría después y volvería a empezar un borrador recién guardado o tirado.
function soltarFoco() {
  const activo = document.activeElement;
  if (activo && activo !== document.body && document.getElementById("pantalla")?.contains(activo)) activo.blur?.();
}

// Añadir, duplicar y eliminar un día van al momento: con cambios sin guardar, antes se pregunta qué hacer con ellos.
async function conCambiosResueltos(texto) {
  if (!borrador.hay()) return true;
  const ok = await resolverBorrador({ texto, seguir: "Cancelar", conDeshacer: false });
  ctx.repintar();
  return ok;
}

function cancelarBorrador() {
  const deshacer = borrador.descartar();
  ctx.repintar();
  avisarDeshacer("Cambios descartados.", deshacer, () => ctx.repintar());
}

// «Revisar» (el aviso de Entreno al volver con cambios sin guardar): al día cambiado, si es uno solo; si no, a la lista.
export function revisarBorrador() {
  const { dias, orden } = borrador.cambios();
  const id = !orden && dias.length === 1 ? dias[0] : null;
  ctx.irA(id ? `#/rutina/dia/${encodeURIComponent(id)}` : "#/rutina", "push");
}

// --- Pintado ---

export function pintarRutina(contenedor, ruta) {
  if (ruta.nombre === "dia") return pintarDia(contenedor, ruta.param);
  const datos = datosRutina();
  const sinGuardar = new Set(borrador.cambios().dias);
  const n = datos.dias.length;
  const filas = datos.dias.map((d, i) => h("li", { class: "fila-con-orden", "data-orden": d.id },
    h("button", { class: "fila", type: "button", "data-accion": "abrir-dia", "data-id": d.id },
      h("span", { class: "fila-textos" },
        h("span", { class: "fila-titulo" }, nombreDia(d)),
        h("span", { class: "fila-datos" }, `${plural(d.ejercicios.length, "ejercicio", "ejercicios")} · ${textoSemana(d.diasSemana)}`,
          sinGuardar.has(d.id) ? h("span", { class: "marca-sin-guardar" }, " · sin guardar") : null)),
      icono("siguiente", { tamano: 20, clase: "fila-flecha" })),
    h("div", { class: "botones-orden" },
      botonIcono("arriba", "subir-dia", `Subir ${d.label}`, { id: d.id, extra: { disabled: i === 0 } }),
      botonIcono("abajo", "bajar-dia", `Bajar ${d.label}`, { id: d.id, extra: { disabled: i === n - 1 } }))));
  const lista = h("ul", { class: "lista-filas lista-orden" }, filas);
  hacerArrastrable(lista, { alSoltar: (clave, hasta) => soltarDia(contenedor, clave, hasta), alLevantar: vibrarAlLevantar });
  vaciar(contenedor).append(h("div", { class: "pantalla-rutina" },
    h("h1", { class: "titulo-pantalla" }, "Rutina"),
    h("p", { class: "subtitulo-pantalla" }, n > 1
      ? "Toca un día para cambiar sus ejercicios. Para cambiar el orden de las pestañas, mantén pulsado un día y arrástralo, o usa las flechas."
      : "Toca un día para cambiar sus ejercicios."),
    lista,
    n < LIMITES.dias
      ? boton("Añadir día", "anadir-dia", { clase: "boton-secundario boton-ancho", ico: "mas" })
      : ayuda(`Caben ${LIMITES.dias} días como mucho.`),
    barraBorrador()));
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
  const datos = datosRutina();
  const dia = diaPorId(datos, id);
  if (!dia) {
    vaciar(contenedor).append(h("div", { class: "pantalla-rutina" }, botonVolver(), vacio("Este día ya no existe."), barraBorrador()));
    return;
  }
  const n = dia.ejercicios.length;
  const semana = h("div", { class: "semana", role: "group", "aria-label": "Qué días de la semana toca" },
    ORDEN_SEMANA.map((w) => h("button", {
      class: ["semana-dia", dia.diasSemana.includes(w) && "activo"], type: "button", "data-accion": "dia-semana", "data-id": dia.id,
      "data-dia": String(w), "aria-pressed": String(dia.diasSemana.includes(w)), "aria-label": NOMBRES_DIA[w],
    }, INICIALES_DIA[w])));
  const grupos = agruparEjercicios(dia.ejercicios);
  const nGrupos = grupos.length;
  // Un ejercicio suelto es una tarjeta («fila», como la de un día); uno de un superset, una fila dentro de la tarjeta
  // compartida («fila-superset-fila»). Desde la 0.2.8 hasta la 1.1.0, los sueltos también salían sin tarjeta.
  const filaMiembro = (e, clase = "fila") => {
    const x = datos.ejercicios[e.exerciseId] || { name: e.exerciseId };
    return h("button", { class: clase, type: "button", "data-accion": "editar-entrada", "data-id": e.exerciseId },
      miniatura(x, { tamano: 48 }),
      h("span", { class: "fila-textos" }, h("span", { class: "fila-titulo" }, x.name), h("span", { class: "fila-datos" }, `${e.series} × ${e.reps} · ${e.rest}`)));
  };
  const filas = grupos.map((g, i) => {
    const idGrupo = claveGrupo(g);
    const etiquetaOrden = g.tipo === "solo" ? (datos.ejercicios[g.entrada.exerciseId]?.name || "el ejercicio") : "el superset";
    const subirBajar = h("div", { class: "botones-orden" },
      botonIcono("arriba", "subir-ejercicio", `Subir ${etiquetaOrden}`, { id: idGrupo, extra: { disabled: i === 0 } }),
      botonIcono("abajo", "bajar-ejercicio", `Bajar ${etiquetaOrden}`, { id: idGrupo, extra: { disabled: i === nGrupos - 1 } }));
    if (g.tipo === "solo") return h("li", { class: "fila-con-orden", "data-orden": idGrupo }, filaMiembro(g.entrada), subirBajar);
    // Una sola tarjeta con los dos, uno debajo del otro a toda la anchura de la tarjeta (nada de dos columnas
    // estrechas: ahí no se lee bien), con el descanso corto como separador entre ellos; subir/bajar, a su derecha,
    // como en los demás (desde la 1.1.0: antes iban debajo).
    return h("li", { class: "fila-superset-grupo", "data-orden": idGrupo },
      h("div", { class: "fila-superset" },
        h("p", { class: "fila-superset-etiqueta" }, icono("enlace", { tamano: 15 }), h("span", null, "Superset")),
        filaMiembro(g.a, "fila-superset-fila"),
        h("p", { class: "fila-superset-separador" }, h("span", null, `⇄ descanso ${g.a.restSuperset}`)),
        filaMiembro(g.b, "fila-superset-fila")),
      subirBajar);
  });
  let lista = null;
  if (n) {
    lista = h("ul", { class: "lista-filas lista-orden" }, filas);
    hacerArrastrable(lista, { alSoltar: (clave, hasta) => soltarEjercicio(contenedor, dia.id, clave, hasta), alLevantar: vibrarAlLevantar });
  }
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
    nGrupos > 1 ? h("p", { class: "ayuda ayuda-orden" }, "Para cambiar el orden, mantén pulsado un ejercicio y arrástralo, o usa las flechas.") : null,
    lista || vacio("Este día no tiene ejercicios todavía."),
    n < LIMITES.ejerciciosPorDia
      ? boton("Añadir ejercicio", "anadir-ejercicio", { clase: "boton-principal boton-ancho", ico: "mas", id: dia.id })
      : ayuda(`Caben ${LIMITES.ejerciciosPorDia} ejercicios por día como mucho.`),
    h("div", { class: "zona-borrar" },
      boton("Duplicar este día", "duplicar-dia", { clase: "boton-secundario boton-ancho", ico: "copia", id: dia.id, extra: { disabled: datos.dias.length >= LIMITES.dias } }),
      h("button", { class: "boton boton-peligro-suave boton-ancho", type: "button", "data-accion": "eliminar-dia", "data-id": dia.id, disabled: unico, "aria-describedby": unico ? "ayuda-eliminar" : null },
        icono("papelera", { tamano: 20 }), h("span", null, "Eliminar este día")),
      unico ? h("p", { class: "ayuda", id: "ayuda-eliminar" }, "Tiene que quedar al menos un día.") : null),
    barraBorrador()));
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
      reordenar(contenedor, () => {
        borrador.cambiar((d) => {
          const i = d.dias.findIndex((x) => x.id === id);
          const j = i + (accion === "subir-dia" ? -1 : 1);
          if (i < 0 || j < 0 || j >= d.dias.length) return;
          [d.dias[i], d.dias[j]] = [d.dias[j], d.dias[i]];
        });
        return true;
      });
      return enfocar(contenedor, accion, id);
    }
    case "anadir-dia":
      return conCambiosResueltos("Añadir un día se guarda al momento: antes, guarda o descarta lo que tienes sin guardar.").then((ok) => ok && anadirDia());
    case "dia-semana": {
      const w = Number(el.dataset.dia);
      let activo = el.classList.contains("activo");
      borrador.cambiar((d) => {
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
      reordenar(contenedor, () => {
        borrador.cambiar((d) => {
          const dia = diaPorId(d, diaId);
          if (!dia) return;
          moverGrupo(dia, id, accion === "subir-ejercicio" ? -1 : 1);
        });
        return true;
      });
      return enfocar(contenedor, accion, id);
    }
    case "editar-entrada": {
      const diaId = el.closest("[data-dia]")?.dataset.dia;
      return abrirHojaEjercicio(diaId, id, { enBorrador: true, alCerrar: () => ctx.repintar() });
    }
    case "anadir-ejercicio": return hojaAnadir(id);
    case "eliminar-dia":
      return conCambiosResueltos("Eliminar un día se guarda al momento: antes, guarda o descarta lo que tienes sin guardar.").then((ok) => ok && eliminarDia(id));
    case "duplicar-dia":
      return conCambiosResueltos("Duplicar un día se guarda al momento: antes, guarda o descarta lo que tienes sin guardar.").then((ok) => ok && duplicarDia(id));
    case "guardar-rutina":
      soltarFoco();
      return guardarBorrador().then((ok) => {
        if (!ok) return;
        ctx.repintar();
        avisar({ texto: "Cambios guardados." });
      });
    case "cancelar-rutina":
      soltarFoco();
      return cancelarBorrador();
    default: return undefined;
  }
}

// Los campos del día van al borrador al salir del campo, sin repintar; mientras se escribe, la barra ya se ve.
export function alCampoRutina(ev) {
  const campo = ev.target?.dataset?.campo;
  const id = ev.target?.dataset?.id;
  if (!["label", "title", "subtitle"].includes(campo) || !id) return;
  if (ev.type === "input") {
    actualizarBarra({ ya: true });
    return;
  }
  if (ev.type !== "change") return;
  const error = ev.target.closest(".campo")?.querySelector(".campo-error");
  const valor = recortar(ev.target.value, LIMITES[campo]);
  if (campo === "label" && !valor) {
    if (error) error.textContent = "El nombre del día no puede quedar vacío.";
    ev.target.setAttribute("aria-invalid", "true");
    actualizarBarra();
    return;
  }
  if (error) error.textContent = "";
  ev.target.removeAttribute("aria-invalid");
  ev.target.value = valor;
  borrador.cambiar((d) => {
    const dia = diaPorId(d, id);
    if (dia) dia[campo] = valor;
  });
  // Por si no cambia nada (se ha vuelto a escribir lo de antes): la barra que salió al escribir se va.
  actualizarBarra();
  const titulo = ev.target.closest(".pantalla-rutina")?.querySelector(".titulo-pantalla");
  const dia = diaPorId(datosRutina(), id);
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

// --- Hoja «Añadir ejercicio» (al borrador) ---

function hojaAnadir(diaId) {
  const datos = datosRutina();
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
    const x = nuevoEjercicio || datosRutina().ejercicios[exerciseId];
    const deshacer = borrador.cambiar((d) => {
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

// Elige otro día de «datos» para mover o copiar un ejercicio (F35). Devuelve el id del día o null.
function elegirOtroDia({ titulo, diaId, exerciseId, datos }) {
  return new Promise((resolver) => {
    let elegido = null;
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

// Elige con qué otro ejercicio del mismo día (en «datos») formar un superset (D-120). Devuelve el exerciseId o null.
// Solo enseña los que todavía no están en un superset (uno ya emparejado habría que separarlo antes).
function elegirParaSuperset({ diaId, exerciseId, datos }) {
  return new Promise((resolver) => {
    let elegido = null;
    const dia = diaPorId(datos, diaId);
    const candidatos = (dia?.ejercicios || []).filter((e) => e.exerciseId !== exerciseId && !e.supersetId);
    const filas = candidatos.map((e) => {
      const x = datos.ejercicios[e.exerciseId] || { name: e.exerciseId };
      return h("li", null, h("button", { class: "fila fila-biblioteca", type: "button", "data-accion": "elegir-pareja", "data-id": e.exerciseId },
        miniatura(x, { tamano: 48 }), h("span", { class: "fila-textos" }, h("span", { class: "fila-titulo" }, x.name))));
    });
    const hoja = abrirHoja({
      titulo: "Unir en superset con…",
      cuerpo: candidatos.length ? h("ul", { class: "lista-filas" }, filas) : vacio("No queda ningún otro ejercicio libre en este día."),
      alAccion: (accion, el) => {
        if (accion === "elegir-pareja") {
          elegido = el.dataset.id;
          hoja.cerrar();
        }
      },
      alCerrar: () => setTimeout(() => resolver(elegido), 0),
    });
  });
}

// --- Hoja del ejercicio (también se abre desde Entreno con «Editar») ---
// Con su propia copia (D-123): lo que se toca no cambia nada hasta «Guardar»; «Cancelar» la cierra sin más, y la X, el
// fondo, Esc o Atrás, con cambios, preguntan antes («Guardar», «Descartar» o «Seguir editando»). Abierta desde Rutina,
// «Guardar» lo pasa al borrador (lo guarda la
// barra); desde Entreno, a tus datos, al momento. Lo que la cierra (unir o separar el superset, mover a otro día,
// quitar) aplica antes lo tocado, junto con lo suyo (un solo «Deshacer»); con algo mal escrito, no sigue y lo señala
// (salvo «Quitar», que deja fuera lo que no vale). Copiar a otro día se lleva las series, repeticiones y descanso que
// pone la hoja y no la cierra.

const ATAJOS_REPS = ["8-12", "10-15", "12-15", "12-20"];
const ATAJOS_DESCANSO = ["1:00", "1:30", "2:00", "2:30", "3:00"];
const ATAJOS_DESCANSO_SUPERSET = ["0:15", "0:20", "0:30", "0:40", "1:00"];
const ATAJOS_INCREMENTO = [1, 2, 2.5, 5];

// Lo de este día (la entrada) y lo de la biblioteca (igual en todos los días con este ejercicio).
const DE_LA_ENTRADA = ["series", "reps", "rest"];
const DEL_EJERCICIO = ["name", "tipo", "pr", "incremento", "muscleGroup", "notas", "image"];
// Los campos cuyo error va en su control −/+ (los demás, debajo del campo).
const EN_CONTROL = new Set(["series", "rest", "restSuperset", "pr"]);
// Cómo queda escrito un campo que vale (p. ej. «1,30» → «1:30»); los que no están aquí se dejan como se escribieron.
const TEXTO_CAMPO = {
  name: (v) => v, series: (v) => String(v), reps: (v) => v, rest: (v) => v, restSuperset: (v) => v, incremento: (v) => formatoNumero(v), muscleGroup: (v) => v,
};

// Lee un campo de la hoja: {valor} (ya normalizado) si vale, o {error}.
function leerCampoHoja(nombre, texto) {
  switch (nombre) {
    case "name": {
      const v = recortar(texto, LIMITES.nombre);
      return v ? { valor: v } : { error: "El nombre no puede quedar vacío." };
    }
    case "series": {
      const n = leerNumero(texto);
      return n == null || !Number.isInteger(n) || n < LIMITES.seriesMin || n > LIMITES.seriesMax ? { error: "Pon entre 1 y 10 series." } : { valor: n };
    }
    case "reps": {
      const v = recortar(texto, LIMITES.reps);
      return v ? { valor: v } : { error: "Escribe las repeticiones, por ejemplo 8-12." };
    }
    case "rest": {
      const s = leerDescanso(texto);
      return s == null ? { error: "Escribe el descanso como 1:30 (minutos:segundos)." } : { valor: formatoDescanso(s) };
    }
    case "restSuperset": {
      const s = leerDescanso(texto);
      return s == null ? { error: "Escribe el descanso como 0:30 (minutos:segundos)." } : { valor: formatoDescanso(limitar(s, 0, LIMITES.descansoMax)) };
    }
    case "pr": {
      const t = texto.trim();
      const kg = t ? leerNumero(t) : null;
      if (t && (kg == null || kg <= 0 || kg > LIMITES.kgMax)) return { error: "Escribe un número, por ejemplo 82,5, o déjalo vacío." };
      return { valor: kg == null ? null : redondear(kg, 0.01) };
    }
    case "incremento": {
      const n = leerNumero(texto);
      return n == null || n < LIMITES.incrementoMin || n > LIMITES.incrementoMax ? { error: "Pon un número entre 0,25 y 20." } : { valor: normalizarIncremento(n) };
    }
    case "muscleGroup": return { valor: recortar(texto, LIMITES.grupo) };
    case "notas": return { valor: recortar(texto, LIMITES.notas) };
    case "image": {
      const t = texto.trim();
      const v = normalizarImagen(t);
      return t && !v ? { error: "Pon una dirección que empiece por https://." } : { valor: v };
    }
    default: return { valor: texto };
  }
}

export function abrirHojaEjercicio(diaId, exerciseId, { enBorrador = false, alCerrar = null } = {}) {
  // Desde Rutina, sobre lo que se ve allí (con los cambios sin guardar); desde Entreno, sobre lo guardado.
  const datosAhora = () => (enBorrador ? borrador.vista() : almacen.datos());
  const cambiarEn = (fn) => (enBorrador ? borrador.cambiar(fn) : almacen.mutar(fn));
  const datos = datosAhora();
  const dia = diaPorId(datos, diaId);
  const entrada = dia?.ejercicios.find((e) => e.exerciseId === exerciseId);
  const x = datos.ejercicios[exerciseId];
  if (!dia || !entrada || !x) return;
  let tipo = x.tipo;

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

  // Superset (D-120): dos ejercicios del día, intercalados (una serie de uno, una del otro). Con pareja, su
  // descanso corto se ajusta aquí, como el de siempre; sin ella, un botón para unirlo con otro del mismo día.
  const parSuperset = parejaSuperset(dia, exerciseId);
  const bloqueSuperset = parSuperset
    ? h("div", { class: "tarjeta formulario" },
      h("h3", { class: "tarjeta-titulo" }, "Superset"),
      h("p", { class: "ayuda" }, `Va intercalado con ${datos.ejercicios[parSuperset.pareja.exerciseId]?.name || "otro ejercicio"}: una serie de uno, una del otro.`),
      h("div", { class: "campo" },
        control({
          campo: "restSuperset", rotulo: "Descanso entre los dos", valor: parSuperset.propio.restSuperset, inputmode: "text", id: exerciseId,
          textoMenos: "−5 s", textoMas: "+5 s", etiquetaMenos: "Quitar 5 segundos de descanso", etiquetaMas: "Añadir 5 segundos de descanso",
        }),
        chips("restSuperset-atajo", ATAJOS_DESCANSO_SUPERSET)),
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "separar-superset" }, icono("papelera", { tamano: 18 }), h("span", null, "Separar el superset")))
    : dia.ejercicios.length > 1
      ? boton("Unir con otro ejercicio en superset…", "unir-superset", { clase: "boton-secundario boton-ancho", ico: "enlace" })
      : null;

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
    bloqueSuperset,
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
    // Quitar va aparte, al final y lejos de «Guardar»: un toque con el pulgar no se va al botón de al lado.
    h("div", { class: "zona-borrar-hoja" },
      h("button", { class: "enlace-boton enlace-peligro", type: "button", "data-accion": "quitar-ejercicio" }, icono("papelera", { tamano: 20 }), h("span", null, "Quitar de este día"))));

  // --- La copia de la hoja: lo escrito en sus campos, comparado con lo que había al abrirla ---

  const nombres = ["name", "series", "reps", "rest", ...(parSuperset ? ["restSuperset"] : []), "pr", "incremento", "muscleGroup", "notas", "image"];
  const nodoDe = (nombre) => cuerpo.querySelector(`[data-campo="${nombre}"]`);
  // La huella de un campo: su valor normalizado o, si no vale, su texto (un campo sin tocar nunca cuenta como cambio).
  const huella = (nombre) => {
    const t = nodoDe(nombre)?.value ?? "";
    const r = leerCampoHoja(nombre, t);
    return r.error ? `!${t}` : JSON.stringify(r.valor);
  };
  const originales = Object.fromEntries(nombres.map((n) => [n, huella(n)]));
  const tipoOriginal = tipo;
  // La marca y lo que sube solo cuentan con peso: con otro tipo se dejan como estaban.
  const tocados = () => nombres.filter((n) => (tipo === "peso" || !["pr", "incremento"].includes(n)) && huella(n) !== originales[n]);
  const hayCambios = () => tipo !== tipoOriginal || tocados().length > 0;

  const error = (nombre, mensaje) => {
    const p = cuerpo.querySelector(`#hoja-${nombre}-error`);
    const nodo = nodoDe(nombre);
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
  // Valida un campo y enseña su error (o lo quita); si vale, lo deja bien escrito (1,30 → 1:30). Devuelve lo leído.
  const validar = (nombre) => {
    const nodo = nodoDe(nombre);
    if (!nodo) return { valor: undefined };
    const r = leerCampoHoja(nombre, nodo.value);
    if (EN_CONTROL.has(nombre)) ponerErrorControl(nodo.closest(".control"), r.error || "");
    else error(nombre, r.error || "");
    if (!r.error && TEXTO_CAMPO[nombre]) nodo.value = TEXTO_CAMPO[nombre](r.valor);
    if (nombre === "name" && !r.error) hoja.nodo.querySelector(".hoja-titulo").textContent = r.valor;
    return r;
  };
  // Lo tocado: {cambios: {campo: valor}, errores: [campo]}, enseñando los errores. Con {soloValidos: true}, lo que no
  // vale se deja fuera sin decir nada (para «Quitar de este día»).
  const recoger = ({ soloValidos = false } = {}) => {
    const cambios = {};
    const errores = [];
    for (const nombre of tocados()) {
      const r = soloValidos ? leerCampoHoja(nombre, nodoDe(nombre).value) : validar(nombre);
      if (r.error) errores.push(nombre);
      else cambios[nombre] = r.valor;
    }
    if (tipo !== tipoOriginal) cambios.tipo = tipo;
    return { cambios, errores };
  };
  // Con algo mal escrito, no se sigue: se va a lo primero que falla (el error ya se ve junto al campo).
  const hayErrores = (errores) => {
    if (!errores.length) return false;
    const nodo = nodoDe(errores[0]);
    nodo?.closest("details")?.setAttribute("open", "");
    nodo?.focus();
    return true;
  };
  // Pone lo tocado en d (el borrador o tus datos): lo de este día, en su entrada; el descanso corto, en los dos del
  // superset; lo de la biblioteca, en el ejercicio. La marca, en tus datos, con su entrada en el historial de marcas (en
  // el borrador, eso lo hace «Guardar» de la barra). Devuelve d (o los datos nuevos, con la marca).
  const ponerCambios = (d, cambios) => {
    const dd = diaPorId(d, diaId);
    const e = dd?.ejercicios.find((y) => y.exerciseId === exerciseId);
    if (e) for (const c of DE_LA_ENTRADA) if (c in cambios) e[c] = cambios[c];
    if ("restSuperset" in cambios && e?.supersetId) {
      for (const y of dd.ejercicios) if (y.supersetId === e.supersetId) y.restSuperset = cambios.restSuperset;
    }
    const ej = d.ejercicios[exerciseId];
    if (!ej) return d;
    for (const c of DEL_EJERCICIO) if (c !== "pr" && c in cambios) ej[c] = cambios[c];
    if ("pr" in cambios && (ej.pr ?? null) !== cambios.pr) {
      if (!enBorrador) return S.cambiarMarca(d, exerciseId, cambios.pr, ahora(), "a-mano");
      ej.pr = cambios.pr;
    }
    return d;
  };
  const nombreAhora = () => recortar(nodoDe("name")?.value, LIMITES.nombre) || x.name;
  // «Guardar» (su botón, o al cerrarla con cambios): con algo mal escrito, no sigue y lo señala; si no, lo tocado va al
  // borrador (desde Rutina) o a tus datos (desde Entreno), y la hoja se cierra.
  const guardarHoja = () => {
    const { cambios, errores } = recoger();
    if (hayErrores(errores)) return;
    if (Object.keys(cambios).length) cambiarEn((d) => ponerCambios(d, cambios));
    hoja.cerrar();
  };

  const hoja = abrirHoja({
    titulo: x.name,
    cuerpo,
    clase: "hoja-alta",
    pie: [boton("Cancelar", "cancelar-ejercicio", { clase: "boton-secundario" }), boton("Guardar", "guardar-ejercicio", { clase: "boton-principal" })],
    sinGuardar: hayCambios,
    alGuardar: guardarHoja,
    alCampo: (ev) => {
      const nombre = ev.target?.dataset?.campo;
      if (nombre && ev.type === "change") validar(nombre);
    },
    alAccion: (accion, el) => {
      const valorDe = (nombre) => nodoDe(nombre);
      switch (accion) {
        case "tipo": {
          tipo = el.dataset.valor;
          for (const b of cuerpo.querySelectorAll('[data-accion="tipo"]')) {
            b.classList.toggle("activa", b === el);
            b.setAttribute("aria-pressed", String(b === el));
          }
          bloqueMarca.hidden = tipo !== "peso";
          return;
        }
        case "series-menos": case "series-mas": {
          const c = valorDe("series");
          const n = limitar((leerNumero(c.value) ?? 3) + (accion === "series-mas" ? 1 : -1), LIMITES.seriesMin, LIMITES.seriesMax);
          c.value = String(Math.round(n));
          validar("series");
          return;
        }
        case "rest-menos": case "rest-mas": {
          const c = valorDe("rest");
          const s = limitar((leerDescanso(c.value) ?? 90) + (accion === "rest-mas" ? 15 : -15), 0, LIMITES.descansoMax);
          c.value = formatoDescanso(s);
          validar("rest");
          return;
        }
        case "pr-menos": case "pr-mas": {
          const c = valorDe("pr");
          const inc = leerCampoHoja("incremento", valorDe("incremento")?.value ?? "").valor ?? (x.incremento || 2.5);
          const n = limitar(redondear((leerNumero(c.value) ?? 0) + (accion === "pr-mas" ? inc : -inc), 0.25), 0, LIMITES.kgMax);
          c.value = n > 0 ? formatoNumero(n) : "";
          ponerErrorControl(c.closest(".control"), "");
          return;
        }
        case "reps-atajo": {
          valorDe("reps").value = el.dataset.valor;
          validar("reps");
          return;
        }
        case "rest-atajo": {
          valorDe("rest").value = el.dataset.valor;
          validar("rest");
          return;
        }
        case "restSuperset-menos": case "restSuperset-mas": {
          const c = valorDe("restSuperset");
          const s = limitar((leerDescanso(c.value) ?? DESCANSO_SUPERSET_DEFECTO) + (accion === "restSuperset-mas" ? 5 : -5), 0, LIMITES.descansoMax);
          c.value = formatoDescanso(s);
          validar("restSuperset");
          return;
        }
        case "restSuperset-atajo": {
          valorDe("restSuperset").value = el.dataset.valor;
          validar("restSuperset");
          return;
        }
        case "incremento-atajo": {
          valorDe("incremento").value = formatoNumero(Number(el.dataset.valor));
          validar("incremento");
          return;
        }
        case "cancelar-ejercicio":
          hoja.cerrar();
          return;
        case "guardar-ejercicio":
          guardarHoja();
          return;
        case "unir-superset": {
          const { cambios, errores } = recoger();
          if (hayErrores(errores)) return;
          elegirParaSuperset({ diaId, exerciseId, datos: datosAhora() }).then((parejaId) => {
            if (!parejaId) return;
            cambiarEn((d) => {
              const r = ponerCambios(d, cambios);
              const dd = diaPorId(r, diaId);
              const propio = dd?.ejercicios.find((e) => e.exerciseId === exerciseId);
              const otro = dd?.ejercicios.find((e) => e.exerciseId === parejaId);
              if (!propio || !otro || propio.supersetId || otro.supersetId) return r;
              const id = `ss-${crypto.randomUUID()}`;
              const descanso = formatoDescanso(DESCANSO_SUPERSET_DEFECTO);
              propio.supersetId = id;
              propio.restSuperset = descanso;
              otro.supersetId = id;
              otro.restSuperset = descanso;
              // Los deja seguidos, justo donde estaba el propio (así se mueven juntos al reordenar).
              const [sacado] = dd.ejercicios.splice(dd.ejercicios.indexOf(otro), 1);
              dd.ejercicios.splice(dd.ejercicios.indexOf(propio) + 1, 0, sacado);
              return r;
            });
            hoja.cerrar().then(() => avisar({ texto: "Superset creado." }));
          });
          return;
        }
        case "separar-superset": {
          const { cambios, errores } = recoger();
          if (hayErrores(errores)) return;
          cambiarEn((d) => {
            const r = ponerCambios(d, cambios);
            const dd = diaPorId(r, diaId);
            const propio = dd?.ejercicios.find((e) => e.exerciseId === exerciseId);
            if (!propio?.supersetId) return r;
            for (const e of dd.ejercicios) {
              if (e !== propio && e.supersetId === propio.supersetId) {
                delete e.supersetId;
                delete e.restSuperset;
              }
            }
            delete propio.supersetId;
            delete propio.restSuperset;
            return r;
          });
          hoja.cerrar().then(() => avisar({ texto: "Superset deshecho." }));
          return;
        }
        case "mover-a-dia": case "copiar-a-dia": {
          const mover = accion === "mover-a-dia";
          const { cambios, errores } = recoger();
          // Copiar solo se lleva lo de este día (series, repeticiones y descanso); mover aplica todo lo tocado.
          if (hayErrores(mover ? errores : errores.filter((n) => DE_LA_ENTRADA.includes(n)))) return;
          const nombre = nombreAhora();
          elegirOtroDia({ titulo: mover ? `Mover a otro día: ${nombre}` : `Copiar a otro día: ${nombre}`, diaId, exerciseId, datos: datosAhora() }).then((destino) => {
            if (!destino) return;
            const deshacer = cambiarEn((d) => {
              const r = mover ? ponerCambios(d, cambios) : d;
              const origen = diaPorId(r, diaId);
              const dest = diaPorId(r, destino);
              const actual = origen?.ejercicios.find((e) => e.exerciseId === exerciseId);
              if (!actual || !dest || dest.ejercicios.some((e) => e.exerciseId === exerciseId) || dest.ejercicios.length >= LIMITES.ejerciciosPorDia) return r;
              // La copia, suelta en el otro día (D-120): un superset necesita a los dos en el mismo día.
              const copia = structuredClone(actual);
              delete copia.supersetId;
              delete copia.restSuperset;
              if (!mover) for (const c of DE_LA_ENTRADA) if (c in cambios) copia[c] = cambios[c];
              dest.ejercicios.push(copia);
              if (mover) quitarDelDia(origen, exerciseId);
              return r;
            });
            const destinoDia = diaPorId(datosAhora(), destino);
            const aviso = `${mover ? "Movido" : "Copiado"} a ${destinoDia?.label || "otro día"}: ${nombre}`;
            const avisarHecho = () => avisarDeshacer(aviso, deshacer, () => ctx.repintar());
            if (mover) hoja.cerrar().then(avisarHecho);
            else avisarHecho();
          });
          return;
        }
        case "quitar-ejercicio": {
          const { cambios } = recoger({ soloValidos: true });
          const nombre = cambios.name || x.name;
          const deshacer = cambiarEn((d) => {
            const r = ponerCambios(d, cambios);
            const dd = diaPorId(r, diaId);
            if (dd) quitarDelDia(dd, exerciseId);
            return r;
          });
          hoja.cerrar().then(() => {
            avisarDeshacer(`Quitado de ${dia.label}: ${nombre}`, deshacer, () => ctx.repintar());
          });
          return;
        }
        default:
      }
    },
    alCerrar: () => alCerrar?.(),
  });
}
