// La mascota en Ajustes (D-133): su sección (encenderla o apagarla, y «Personalizarla») y su página (#/ajustes/mascota):
// su nombre, su tamaño, el color de su luz, qué hace en el entreno y cómo es. Lo que se elige va a su ficha
// (mascota/memoria.js), nunca a tus datos; la mascota en marcha se pone al día al momento (ctx.mascota(), de app.js).

import { h, icono, vaciar } from "./dom.js";
import { boton, interruptor, seccion, ayuda } from "./piezas.js";
import { ctx } from "./contexto.js";
import * as memoria from "../mascota/memoria.js";
import { rasgosDe, describir } from "../mascota/caracter.js";
import { esBeta, fechaConAnio } from "../util.js";

const TAMANOS = [["pequena", "Pequeña"], ["normal", "Normal"], ["grande", "Grande"]];
const LUCES = [["verde", "Verde"], ["cian", "Cian"], ["rosa", "Rosa"], ["ambar", "Ámbar"], ["violeta", "Violeta"]];
const ENTRENO = [
  ["rincon", "Quieta en un rincón", "Se asoma abajo a la derecha y desde allí siente cada serie."],
  ["escondida", "Escondida", "No sale mientras entrenas; vuelve al terminar."],
];

function opciones(lista, actual, accion, etiqueta, { muestra = null, desactivadas = false } = {}) {
  return h("div", { class: "opciones", role: "radiogroup", "aria-label": etiqueta },
    lista.map(([valor, texto, explicacion]) => h("button", {
      class: ["opcion", actual === valor && "activa"], type: "button", role: "radio", "aria-checked": String(actual === valor),
      "data-accion": accion, "data-valor": valor, disabled: desactivadas,
    },
    h("span", { class: "opcion-marca" }),
    muestra ? muestra(valor) : null,
    h("span", { class: "opcion-textos" }, h("span", null, texto), explicacion ? h("span", { class: "ayuda" }, explicacion) : null))));
}

// En la página principal de Ajustes.
export function seccionMascota() {
  const f = memoria.leer();
  const nombre = f.ajustes.nombre;
  return seccion("Mascota",
    interruptor({
      ajuste: "mascota-encendida", rotulo: nombre ? `${nombre}, tu mascota` : "Tu mascota", marcado: memoria.encendida(f, { beta: esBeta() }),
      desactivado: Boolean(f.masNueva), ayuda: "Un monigote de luz que vive en la app y siente cada serie. Solo mira: nunca cambia tus datos.",
    }),
    boton("Personalizarla", "ir-mascota", { clase: "boton-secundario boton-ancho" }));
}

export function pintarPaginaMascota(contenedor) {
  const f = memoria.leer({ crear: true });
  const a = f.ajustes;
  const encendida = memoria.encendida(f, { beta: esBeta() });
  const fija = Boolean(f.masNueva);
  const toques = f.toques === 1 ? "una vez" : `${f.toques} veces`;
  vaciar(contenedor).append(h("div", { class: "pantalla-ajustes pantalla-mascota" },
    h("div", { class: "cabecera-detalle" },
      h("button", { class: "boton-volver", type: "button", "data-accion": "mascota-volver" }, icono("volver", { tamano: 20 }), h("span", null, "Ajustes")),
      h("h1", { class: "titulo-pantalla" }, a.nombre || "Tu mascota"),
      h("p", { class: "subtitulo-pantalla" }, describir(rasgosDe(f.semilla)))),
    fija ? h("p", { class: "ayuda aviso-texto-fuerte" }, "Su ficha es de una versión más nueva de la app: aquí se ve como está, pero no se puede cambiar.") : null,
    seccion(null,
      interruptor({
        ajuste: "mascota-encendida", rotulo: "Encendida", marcado: encendida, desactivado: fija,
        ayuda: encendida ? "Pasea por encima de las tarjetas, donde no tapa nada, y siente cada serie." : "Apagada: no sale ni gasta nada.",
      })),
    seccion("Nombre",
      h("input", {
        class: "campo-texto", type: "text", "data-campo": "mascota-nombre", maxlength: String(memoria.NOMBRE_MAX), value: a.nombre,
        placeholder: "Sin nombre", autocomplete: "off", enterkeyhint: "done", "aria-label": "Su nombre", disabled: fija,
      }),
      ayuda("Para ti: no habla, así que no lo dice nunca.")),
    seccion("Tamaño", opciones(TAMANOS, a.tamano, "mascota-tamano", "Tamaño", { desactivadas: fija })),
    seccion("Color de su luz", opciones(LUCES, a.luz, "mascota-luz", "Color de su luz", {
      desactivadas: fija, muestra: (valor) => h("span", { class: ["muestra-luz", `luz-${valor}`], "aria-hidden": "true" }),
    })),
    seccion("En el entreno", opciones(ENTRENO, a.entreno, "mascota-entreno", "En el entreno", { desactivadas: fija })),
    seccion("Cómo es",
      ayuda("Su carácter le viene de nacimiento: cuánto pasea, se asoma, juega o se duerme. No habla ni te manda mensajes: mira, siente cada serie (ese músculo se le enciende un rato) y celebra tus marcas. Tócala y verás."),
      h("p", { class: "linea-dato" }, `Nació el ${fechaConAnio(f.nacida)}. La has tocado ${toques}.`),
      ayuda("Vive solo en este móvil, en una ficha suya, aparte de tus datos: nunca los cambia. Pronto, su cuerpo contará tu forma (de gordito a definido) y recordará tus entrenos."))));
}

function cambiar(cambios) {
  memoria.cambiarAjustes(cambios);
  ctx.mascota?.(); // la de la pantalla se pone al día (o se va, o llega)
  ctx.repintar();
}

export function alAccionMascota(accion, el) {
  switch (accion) {
    case "ir-mascota": return ctx.irA("#/ajustes/mascota");
    case "mascota-volver":
      if (history.state?.nivel > 1) return history.back();
      return ctx.irA("#/ajustes", "replace");
    case "mascota-tamano": return cambiar({ tamano: el.dataset.valor });
    case "mascota-luz": return cambiar({ luz: el.dataset.valor });
    case "mascota-entreno": return cambiar({ entreno: el.dataset.valor });
    default: return undefined;
  }
}

export function alCampoMascota(el, ev) {
  if (ev.type !== "change") return;
  if (el.dataset.ajuste === "mascota-encendida") cambiar({ encendida: el.checked });
  else if (el.dataset.campo === "mascota-nombre") cambiar({ nombre: el.value });
}
