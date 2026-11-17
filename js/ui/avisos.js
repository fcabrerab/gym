// Avisos breves (uno a la vez, con «Deshacer» si hace falta), hojas que salen desde abajo (Atrás y Esc las
// cierran), confirmaciones propias (nunca las del navegador) y anuncios para lectores de pantalla.

import { h, icono } from "./dom.js";

let zonaAvisos = null;
let zonaAnuncios = null;
let avisoActual = null;
let temporizadorAviso = null;
const pila = [];
let contador = 0;
const alCerrarTodas = new Set();
const MS_HOJA_RECIEN = 400;

// --- Avisos ---

export function montarAvisos(zona, anuncios) {
  zonaAvisos = zona;
  zonaAnuncios = anuncios;
  zona.addEventListener("click", (ev) => {
    const boton = ev.target.closest("button[data-accion]");
    if (!boton || !avisoActual || !zona.contains(boton)) return;
    const { alPulsar } = avisoActual;
    cerrarAviso();
    if (boton.dataset.accion !== "cerrar-aviso" && typeof alPulsar === "function") alPulsar();
  });
}

export function cerrarAviso() {
  if (temporizadorAviso) clearTimeout(temporizadorAviso);
  temporizadorAviso = null;
  avisoActual?.el.remove();
  avisoActual = null;
}

// avisar({texto, accion: "Deshacer", alPulsar, ms, fijo}). Dura 6 s, u 8 s con botón; «fijo» se queda hasta cerrarlo.
export function avisar({ texto, accion = null, alPulsar = null, ms = null, fijo = false, tipo = "normal" }) {
  if (!zonaAvisos) return { cerrar() {} };
  cerrarAviso();
  const deshacer = accion === "Deshacer";
  const el = h("div", { class: ["aviso", `aviso-${tipo}`, fijo && "aviso-fijo"] },
    h("p", { class: "aviso-texto" }, texto),
    accion && h("button", { class: "aviso-accion", type: "button", "data-accion": deshacer ? "deshacer" : "aviso-accion" }, accion),
    fijo && h("button", { class: "boton-icono aviso-cerrar", type: "button", "data-accion": "cerrar-aviso", "aria-label": "Cerrar el aviso" }, icono("cerrar")));
  zonaAvisos.append(el);
  avisoActual = { el, alPulsar, deshacer };
  if (!fijo) temporizadorAviso = setTimeout(() => { if (avisoActual?.el === el) cerrarAviso(); }, ms ?? (accion ? 8000 : 6000));
  return { cerrar() { if (avisoActual?.el === el) cerrarAviso(); } };
}

// Cierra el aviso de ahora solo si es un «Deshacer» (app.js lo llama cuando cambian los datos: ese deshacer ya
// no se refiere a lo último que se ha hecho).
export function cerrarAvisoDeshacer() {
  if (avisoActual?.deshacer) cerrarAviso();
}

// ¿Hay a la vista un aviso con «Deshacer»? (Un aviso que puede esperar no lo tapa: ver app.js.)
export function hayAvisoDeshacer() {
  return Boolean(avisoActual?.deshacer);
}

export const TEXTO_NO_DESHACER = "No se puede deshacer: ha habido cambios después.";

// Aviso con «Deshacer» para un cambio de datos. deshacer() devuelve false si ya no se puede (hubo otros cambios
// después): entonces no se toca nada y se dice. «despues» se llama tras deshacer (p. ej. repintar).
export function avisarDeshacer(texto, deshacer, despues = null, opciones = {}) {
  return avisar({
    ...opciones,
    texto,
    accion: "Deshacer",
    alPulsar: () => {
      if (deshacer() === false) {
        avisar({ texto: TEXTO_NO_DESHACER });
        return;
      }
      despues?.();
    },
  });
}

// Para lectores de pantalla (región aria-live aparte, invisible).
export function anunciar(texto) {
  if (!zonaAnuncios) return;
  zonaAnuncios.textContent = "";
  setTimeout(() => { zonaAnuncios.textContent = texto; }, 50);
}

// --- Hojas ---

export function hojaAbierta() {
  return pila.length > 0;
}

// Se llama una vez cuando se cierra la última hoja (para repintar lo que esperaba).
export function alCerrarseLasHojas(fn) {
  alCerrarTodas.add(fn);
  return () => alCerrarTodas.delete(fn);
}

// abrirHoja({titulo, cuerpo, pie, alAccion(accion, boton, ev), alCampo(ev), alCerrar, clase}).
// Cada hoja añade una entrada al historial: Atrás la cierra sin cambiar de pantalla.
export function abrirHoja({ titulo, cuerpo = null, pie = null, alAccion = null, alCampo = null, alCerrar = null, clase = "" }) {
  contador += 1;
  const id = contador;
  const previo = document.activeElement;
  const tituloId = `hoja-titulo-${id}`;
  const botonCerrar = h("button", { class: "boton-icono hoja-cerrar", type: "button", "data-accion": "cerrar-hoja", "aria-label": "Cerrar" }, icono("cerrar"));
  const nodoCuerpo = h("div", { class: "hoja-cuerpo" }, cuerpo);
  const nodoPie = pie ? h("div", { class: "hoja-pie" }, pie) : null;
  const hoja = h("div", { class: ["hoja", clase], role: "dialog", "aria-modal": "true", "aria-labelledby": tituloId, tabindex: "-1" },
    h("div", { class: "hoja-cabecera" }, h("h2", { class: "hoja-titulo", id: tituloId }, titulo), botonCerrar),
    nodoCuerpo, nodoPie);
  const capa = h("div", { class: "capa-hoja", "data-hoja": id }, h("div", { class: "hoja-fondo", "data-accion": "cerrar-hoja" }), hoja);
  const abiertaEn = performance.now();
  const entrada = { id, capa, hoja, cuerpo: nodoCuerpo, pie: nodoPie, alAccion, alCerrar, previo, cerrando: null, resolver: null, quitada: false };
  capa.addEventListener("click", (ev) => {
    const boton = ev.target.closest("[data-accion]");
    if (!boton || !capa.contains(boton) || boton.disabled) return;
    // Un toque de verdad en los primeros 400 ms es casi siempre el segundo de un doble toque (el que abrió la hoja):
    // no cuenta. Así un doble toque en «Seguir» no pasa también la confirmación siguiente.
    if (ev.isTrusted && performance.now() - abiertaEn < MS_HOJA_RECIEN) return;
    if (boton.dataset.accion === "cerrar-hoja") {
      cerrarHoja(id);
      return;
    }
    alAccion?.(boton.dataset.accion, boton, ev, entrada);
  });
  if (alCampo) {
    capa.addEventListener("input", (ev) => alCampo(ev, entrada));
    capa.addEventListener("change", (ev) => alCampo(ev, entrada));
  }
  capa.addEventListener("submit", (ev) => ev.preventDefault());
  document.body.append(capa);
  document.body.classList.add("con-hoja");
  pila.push(entrada);
  try {
    history.pushState({ ...(history.state || {}), hoja: id }, "");
  } catch {
    // Sin historial (raro): se cierra con sus botones.
  }
  // El foco va a la hoja (que lee su título): así no se abre el teclado ni se marca la × tras un toque.
  hoja.focus({ preventScroll: true });
  return {
    id,
    nodo: hoja,
    cuerpo: nodoCuerpo,
    pie: nodoPie,
    cerrar: () => cerrarHoja(id),
  };
}

function quitarHoja(entrada) {
  if (entrada.quitada) return;
  entrada.quitada = true;
  const i = pila.indexOf(entrada);
  if (i >= 0) pila.splice(i, 1);
  entrada.capa.remove();
  if (!pila.length) document.body.classList.remove("con-hoja");
  try {
    entrada.alCerrar?.();
  } catch (err) {
    console.error(err);
  }
  if (entrada.previo && entrada.previo.isConnected) entrada.previo.focus?.({ preventScroll: true });
  entrada.resolver?.();
  if (!pila.length) {
    for (const fn of alCerrarTodas) {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// Cierra una hoja (la de arriba si no se dice cuál). Devuelve una promesa que se cumple cuando ya está cerrada
// y su entrada del historial ya se ha quitado (así se puede abrir otra justo después sin líos).
export function cerrarHoja(id = null) {
  const entrada = id == null ? pila[pila.length - 1] : pila.find((e) => e.id === id);
  if (!entrada) return Promise.resolve();
  if (entrada.cerrando) return entrada.cerrando;
  entrada.cerrando = new Promise((resolver) => { entrada.resolver = resolver; });
  if (history.state?.hoja === entrada.id && pila[pila.length - 1] === entrada) {
    history.back();
    setTimeout(() => quitarHoja(entrada), 1500);
  } else {
    quitarHoja(entrada);
  }
  return entrada.cerrando;
}

// En «popstate»: quita las hojas que ya no tienen su entrada del historial. Devuelve true si cerró alguna.
export function alVolverAtras() {
  if (!pila.length) return false;
  const visible = history.state?.hoja ?? 0;
  const sobran = pila.filter((e) => e.id > visible);
  if (!sobran.length) return false;
  for (const e of sobran.reverse()) quitarHoja(e);
  return true;
}

// Esc cierra la hoja de arriba.
export function alPulsarTecla(ev) {
  if (ev.key === "Escape" && pila.length) {
    ev.preventDefault();
    cerrarHoja();
  }
}

// --- Confirmaciones ---

// confirmar({titulo, texto, aceptar, cancelar, peligro, invertir}) → Promise<boolean>. La promesa se cumple con la
// hoja ya cerrada. Con aceptar: null solo sale «cancelar» (para avisar sin dejar seguir). Con invertir, el botón de
// aceptar va a la izquierda (en el segundo paso de algo peligroso, para que un doble toque caiga en «Cancelar»).
export function confirmar({ titulo, texto = "", aceptar = "Aceptar", cancelar = "Cancelar", peligro = false, contenido = null, invertir = false }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const botonCancelar = h("button", { class: ["boton", aceptar ? "boton-secundario" : "boton-principal"], type: "button", "data-accion": "cancelar" }, cancelar);
    const botonAceptar = aceptar
      ? h("button", { class: ["boton", peligro ? "boton-peligro" : "boton-principal"], type: "button", "data-accion": "confirmar" }, aceptar)
      : null;
    const hoja = abrirHoja({
      titulo,
      clase: "hoja-confirmar",
      cuerpo: [texto ? h("p", { class: "hoja-texto" }, texto) : null, contenido],
      pie: invertir ? [botonAceptar, botonCancelar] : [botonCancelar, botonAceptar],
      alAccion: (accion) => {
        if (accion === "confirmar") {
          respuesta = true;
          hoja.cerrar();
        } else if (accion === "cancelar") {
          hoja.cerrar();
        }
      },
      alCerrar: () => setTimeout(() => resolver(respuesta), 0),
    });
  });
}
