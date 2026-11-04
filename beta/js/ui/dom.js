// Construcción del DOM sin HTML en texto: h() crea elementos con textContent y setAttribute, svg() crea SVG
// con createElementNS e icono() devuelve los iconos propios (SVG dibujado aquí, sin archivos ni fuentes).

const NS = "http://www.w3.org/2000/svg";

function anadir(el, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false || hijo === true) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
}

// h("button", {class: "boton", "data-accion": "x", on: {click: fn}}, "Texto", otroNodo)
// Los valores null, undefined o false no ponen el atributo; true lo pone vacío. «value» y «checked» van como
// propiedades (después de los hijos, para que un <select> ya tenga sus opciones).
export function h(etiqueta, atributos = null, ...hijos) {
  const el = document.createElement(etiqueta);
  let valor;
  let marcado;
  if (atributos) {
    for (const [k, v] of Object.entries(atributos)) {
      if (k === "on") {
        for (const [evento, fn] of Object.entries(v || {})) el.addEventListener(evento, fn);
        continue;
      }
      if (k === "value") { valor = v; continue; }
      if (k === "checked") { marcado = Boolean(v); continue; }
      if (v == null || v === false) continue;
      if (k === "style") throw new Error("Sin atributo style: usa clases (la CSP no lo deja).");
      if (k === "class") {
        const clase = Array.isArray(v) ? v.filter(Boolean).join(" ") : v;
        if (clase) el.className = clase;
        continue;
      }
      el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  anadir(el, hijos);
  if (valor !== undefined && valor !== null) el.value = String(valor);
  if (marcado !== undefined) el.checked = marcado;
  return el;
}

export function svg(etiqueta, atributos = null, ...hijos) {
  const el = document.createElementNS(NS, etiqueta);
  if (atributos) {
    for (const [k, v] of Object.entries(atributos)) {
      if (v == null || v === false) continue;
      if (k === "on") {
        for (const [evento, fn] of Object.entries(v || {})) el.addEventListener(evento, fn);
        continue;
      }
      if (k === "style") throw new Error("Sin atributo style: usa clases (la CSP no lo deja).");
      el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  anadir(el, hijos);
  return el;
}

export function vaciar(nodo) {
  nodo.replaceChildren();
  return nodo;
}

// Iconos de 24 × 24, de trazo (o de relleno los marcados con «r:»).
const TRAZOS = {
  check: ["M5 12.5l4.5 4.5L19 7.5"],
  mas: ["M12 5v14", "M5 12h14"],
  menos: ["M5 12h14"],
  pausa: ["M9 5.5v13", "M15 5.5v13"],
  seguir: ["r:M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"],
  saltar: ["M6 6.5l7.5 5.5L6 17.5z", "M17.5 6v12"],
  volver: ["M19 12H5", "M11 6l-6 6 6 6"],
  siguiente: ["M9 6l6 6-6 6"],
  papelera: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"],
  reloj: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 7.5V12l3 2"],
  entreno: ["M6.5 7.5v9", "M17.5 7.5v9", "M3.5 10v4", "M20.5 10v4", "M6.5 12h11"],
  historial: ["M4 19.5h16", "M5.5 15.5l4-5 3.5 3 5.5-7"],
  rutina: ["M4 5.5h16v14H4z", "M4 10h16", "M8.5 3v4", "M15.5 3v4"],
  ajustes: ["M4 7h9", "M17 7h3", "M4 17h3", "M11 17h9", "M15 4.5v5", "M9 14.5v5"],
  arriba: ["M12 19V5", "M6 11l6-6 6 6"],
  abajo: ["M12 5v14", "M6 13l6 6 6-6"],
  cerrar: ["M6 6l12 12", "M18 6L6 18"],
  lapiz: ["M4 20h4L19.5 8.5l-4-4L4 16z", "M13.5 6.5l4 4"],
  compartir: ["M12 3v12", "M7 8l5-5 5 5", "M5 13v7h14v-7"],
  descargar: ["M12 4v11", "M7 10.5l5 5 5-5", "M5 20h14"],
  info: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 11v6", "M12 7.5v.5"],
  despues: ["M4 12h11", "M11 6l6 6-6 6", "M20 5v14"],
  imagen: ["M4 5h16v14H4z", "M4 16l5-5 4 4 3-3 4 4", "M15 8.5h.5"],
  copia: ["M8 8h11v12H8z", "M5 16V4h11"],
  alerta: ["M12 3.5l9.5 16.5h-19z", "M12 10v4.5", "M12 17.2v.3"],
  trofeo: ["M8 4h8v5a4 4 0 0 1-8 0z", "M8 6H5v1a3 3 0 0 0 3 3", "M16 6h3v1a3 3 0 0 1-3 3", "M12 13v4", "M8.5 20h7", "M10 17h4"],
  campana: ["M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z", "M10 20.5h4"],
};

export function icono(nombre, { tamano = 24, clase = "" } = {}) {
  const trazos = TRAZOS[nombre] || TRAZOS.info;
  return svg("svg", {
    class: ["icono", clase].filter(Boolean).join(" "),
    viewBox: "0 0 24 24",
    width: tamano,
    height: tamano,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
    focusable: "false",
  }, trazos.map((d) => (d.startsWith("r:")
    ? svg("path", { d: d.slice(2), fill: "currentColor", stroke: "none" })
    : svg("path", { d }))));
}
