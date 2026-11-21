// La mascota en Ajustes (D-133): su sección (encenderla o apagarla, y «Personalizarla») y su página (#/ajustes/mascota):
// su nombre, su tamaño, el color de su luz, qué hace en el entreno, su forma (la fase 2: de tus entrenos, que solo lee)
// y cómo es. Lo que se elige va a su ficha (mascota/memoria.js), nunca a tus datos; la mascota en marcha se pone al día
// al momento (ctx.mascota(), de app.js).

import { h, icono, vaciar } from "./dom.js";
import { boton, interruptor, seccion, ayuda } from "./piezas.js";
import { ctx } from "./contexto.js";
import * as memoria from "../mascota/memoria.js";
import { rasgosDe, describir } from "../mascota/caracter.js";
import { cuerpoDeTusEntrenos, formaVisible } from "../mascota/forma.js";
import { ahora, esBeta, fechaConAnio } from "../util.js";

const TAMANOS = [["pequena", "Pequeña"], ["normal", "Normal"], ["grande", "Grande"]];
const LUCES = [["verde", "Verde"], ["cian", "Cian"], ["rosa", "Rosa"], ["ambar", "Ámbar"], ["violeta", "Violeta"]];
const BRILLOS = [["suave", "Suave"], ["normal", "Normal"], ["intenso", "Intenso"]];
const ENTRENO = [
  ["rincon", "Contigo en el descanso", "En la serie, asomada abajo a la derecha; en el descanso sale, se recarga de luz y calienta para la siguiente."],
  ["escondida", "Escondida", "No sale mientras entrenas; vuelve al terminar."],
];

// Cómo se la ve, por la forma que se le ve (la de fondo, más marcada con el bombeo del entreno: mascota/forma.js).
const ESTADOS = [[0.2, "Gordita y fuera de forma"], [0.38, "Un poco blandita"], [0.55, "En su punto"], [0.8, "En forma"], [Infinity, "Muy definida"]];
export const nombreForma = (forma) => ESTADOS.find(([hasta]) => forma < hasta)[1];
const unir = (l) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}` : l[0] || "");

// Su forma (la fase 2): de tus entrenos, que solo lee. Sin datos (aún no hay), nada.
function seccionForma(f) {
  const e = ctx.entrenosMascota();
  if (!e) return null;
  const c = cuerpoDeTusEntrenos(e, ahora(), { nacida: f.nacida });
  const dias = c.porSemana === 1 ? "1 día" : `${c.porSemana} días`;
  const hechos = c.ultimas4 === 0 ? "ninguno" : c.ultimas4 === 1 ? "1 día de entreno" : `${c.ultimas4} días de entreno`;
  return seccion("Su forma",
    h("p", { class: "linea-dato", "data-forma": formaVisible(c.fondo, c.general).toFixed(2) }, h("strong", null, nombreForma(formaVisible(c.fondo, c.general)))),
    h("p", { class: "linea-dato" }, `En las últimas 4 semanas: ${hechos}. Tu rutina: ${dias} por semana.`),
    c.general >= 0.15 ? h("p", { class: "linea-dato" }, "Con el bombeo de tu entreno, más marcada: se le pasa en unas horas.") : null,
    c.bombeados.length ? h("p", { class: "linea-dato" }, `Bombeo: ${unir(c.bombeados)}.`) : null,
    c.doloridos.length ? h("p", { class: "linea-dato" }, `Agujetas, suaves: ${unir(c.doloridos)}.`) : null,
    ayuda("Su cuerpo sale de lo constante que eres con tu rutina, no de los kilos: lo de los últimos días cuenta más; si lo dejas, se ablanda poco a poco, y al volver se recupera rápido. En cada entreno se marca un poco más, y al día siguiente puede tener alguna agujeta."));
}

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
      desactivado: Boolean(f.masNueva), ayuda: "Un monigote de luz que vive en la app, siente cada serie y tiene tu forma. Solo mira: nunca cambia tus datos.",
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
    seccion("Su brillo", opciones(BRILLOS, a.brillo, "mascota-brillo", "Su brillo", { desactivadas: fija })),
    seccion("En el entreno", opciones(ENTRENO, a.entreno, "mascota-entreno", "En el entreno", { desactivadas: fija })),
    seccionForma(f),
    seccion("Cómo es",
      ayuda("Su carácter le viene de nacimiento: cuánto pasea, se asoma, juega o se duerme. No habla ni te manda mensajes: mira, siente cada serie (ese músculo se le enciende un rato) y celebra tus marcas."),
      ayuda("Tócala: con un toque se asusta y te saluda (en el descanso, choca los cinco); con dos seguidos, salta de alegría; con tres o más, le haces cosquillas. Y si la mantienes pulsada, se sube a tu dedo: llévala adonde quieras y, al soltarla, cae en lo que haya debajo y se sacude. Mientras entrenas, en su rincón, no se deja coger."),
      ayuda("Tiene su ritmo, con la hora de tu móvil: de noche está más dormilona (bosteza, se sienta y se duerme antes y más rato) y por la mañana, la primera vez que te ve, estaba dormida: se despierta despacio y se despereza. Mientras entrenas, siempre despierta, contigo."),
      h("p", { class: "linea-dato" }, `Nació el ${fechaConAnio(f.nacida)}. La has tocado ${toques}.`),
      ayuda("Vive en este móvil, en una ficha suya, aparte de tus datos: nunca los cambia. Su ficha va también en tus copias («Exportar datos» y la del PC): al cargar una, vuelve ella, con su nombre y su carácter."))));
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
    case "mascota-brillo": return cambiar({ brillo: el.dataset.valor });
    default: return undefined;
  }
}

export function alCampoMascota(el, ev) {
  if (ev.type !== "change") return;
  if (el.dataset.ajuste === "mascota-encendida") cambiar({ encendida: el.checked });
  else if (el.dataset.campo === "mascota-nombre") cambiar({ nombre: el.value });
}
