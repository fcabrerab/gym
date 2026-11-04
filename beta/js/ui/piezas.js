// Piezas de interfaz que usan varias pantallas: miniaturas con marcador propio, controles −/+, interruptores,
// botones, banners y los textos de series («80×10 · 80×9»).

import { h, icono } from "./dom.js";
import { formatoNumero, formatoKg, leerNumero, limitar, redondear } from "../util.js";
import { LIMITES } from "../modelo.js";

// Colores del marcador de imagen (todos con contraste ≥ 4,99:1 con el blanco); se elige por el grupo muscular.
const COLORES = 8;

export function colorGrupo(grupo) {
  let n = 0;
  for (const c of String(grupo || "")) n = (n * 31 + c.codePointAt(0)) >>> 0;
  return n % COLORES;
}

// Dirección de una imagen: las relativas («images/press.png») vienen de la normal y se resuelven contra su carpeta.
export function direccionImagen(imagen) {
  if (!imagen) return "";
  if (/^(https?:\/\/|\/)/i.test(imagen)) return imagen;
  try {
    return new URL(imagen, new URL("../", location.href)).href;
  } catch {
    return "";
  }
}

// Miniatura: un cuadrado con la inicial sobre el color del grupo; la imagen lo tapa solo si carga.
export function miniatura(ejercicio, { tamano = 56, clase = "" } = {}) {
  const nombre = ejercicio?.name || "?";
  const inicial = nombre.trim().charAt(0).toUpperCase() || "?";
  const caja = h("span", { class: ["mini", `mini-${tamano}`, `color-${colorGrupo(ejercicio?.muscleGroup || nombre)}`, clase], "aria-hidden": "true" },
    h("span", { class: "mini-inicial" }, inicial));
  const src = direccionImagen(ejercicio?.image);
  if (src) {
    const img = h("img", { class: "mini-img", alt: "", loading: "lazy", decoding: "async", src, referrerpolicy: "no-referrer" });
    img.addEventListener("load", () => {
      const lista = () => caja.classList.add("con-imagen");
      if (typeof img.decode === "function") img.decode().then(lista, lista);
      else lista();
    }, { once: true });
    img.addEventListener("error", () => img.remove(), { once: true });
    caja.append(img);
  }
  return caja;
}

export function boton(texto, accion, { clase = "boton-secundario", id = null, ico = null, extra = {} } = {}) {
  return h("button", { class: ["boton", clase], type: "button", "data-accion": accion, "data-id": id, ...extra },
    ico ? icono(ico, { tamano: 20 }) : null, h("span", null, texto));
}

export function botonIcono(nombreIcono, accion, etiqueta, { id = null, clase = "", extra = {} } = {}) {
  return h("button", { class: ["boton-icono", clase], type: "button", "data-accion": accion, "data-id": id, "aria-label": etiqueta, ...extra },
    icono(nombreIcono));
}

// Control −/+ con su campo en medio. El campo lleva data-campo; los botones, data-accion «<campo>-menos» y «<campo>-mas».
// Toda la caja del valor es la etiqueta del campo: tocarla en cualquier sitio (también donde pone «kg») abre el teclado.
// «intro» es la tecla Intro del teclado: «next» pasa al campo siguiente y «done» lo cierra.
export function control({ campo, rotulo, valor, unidad = "", inputmode = "decimal", accionMenos, accionMas, id = null, etiquetaMenos, etiquetaMas, textoMenos = null, textoMas = null, error = "", aviso = "", clase = "", intro = "done" }) {
  const idCampo = `campo-${campo}-${Math.random().toString(36).slice(2, 8)}`;
  const idError = `${idCampo}-error`;
  const entrada = h("input", {
    class: ["control-campo", aviso && "falta"],
    id: idCampo,
    type: "text",
    inputmode,
    autocomplete: "off",
    enterkeyhint: intro,
    "data-campo": campo,
    "data-id": id,
    "aria-describedby": idError,
    "aria-invalid": error ? "true" : null,
    value: valor ?? "",
  });
  return h("div", { class: ["control", clase], "data-control": campo },
    h("label", { class: "control-rotulo", for: idCampo }, rotulo),
    h("div", { class: "control-fila" },
      h("button", { class: ["boton-paso", textoMenos && "boton-paso-texto"], type: "button", "data-accion": accionMenos ?? `${campo}-menos`, "data-id": id, "aria-label": etiquetaMenos ?? `Menos ${rotulo.toLowerCase()}` }, textoMenos ?? icono("menos")),
      h("label", { class: "control-valor", for: idCampo }, entrada, unidad ? h("span", { class: "control-unidad" }, unidad) : null),
      h("button", { class: ["boton-paso", textoMas && "boton-paso-texto"], type: "button", "data-accion": accionMas ?? `${campo}-mas`, "data-id": id, "aria-label": etiquetaMas ?? `Más ${rotulo.toLowerCase()}` }, textoMas ?? icono("mas"))),
    h("p", { class: ["control-error", aviso && !error && "control-aviso"], id: idError, role: error ? "alert" : null }, error || aviso || ""));
}

export function ponerErrorControl(nodoControl, texto) {
  if (!nodoControl) return;
  const p = nodoControl.querySelector(".control-error");
  const campo = nodoControl.querySelector(".control-campo");
  if (p) {
    p.textContent = texto || "";
    p.classList.remove("control-aviso");
    if (texto) p.setAttribute("role", "alert");
    else p.removeAttribute("role");
  }
  if (campo) {
    if (texto) campo.setAttribute("aria-invalid", "true");
    else campo.removeAttribute("aria-invalid");
    campo.classList.remove("falta");
  }
}

// Fila con interruptor (checkbox con role="switch").
export function interruptor({ ajuste, rotulo, ayuda = "", marcado, desactivado = false, extra = null }) {
  const id = `ajuste-${ajuste}`;
  return h("div", { class: "fila-interruptor" },
    h("label", { class: "interruptor-texto", for: id }, h("span", { class: "interruptor-rotulo" }, rotulo), ayuda ? h("span", { class: "ayuda" }, ayuda) : null),
    h("input", { type: "checkbox", role: "switch", class: "interruptor", id, "data-ajuste": ajuste, checked: marcado, disabled: desactivado }),
    extra);
}

export function banner({ texto, botones = [], clase = "", icono: nombreIcono = "info" }) {
  return h("div", { class: ["banner", clase], role: "status" },
    h("div", { class: "banner-fila" }, icono(nombreIcono, { tamano: 20, clase: "banner-icono" }), h("p", { class: "banner-texto" }, texto)),
    botones.length ? h("div", { class: "banner-botones" }, botones) : null);
}

export function seccion(titulo, ...hijos) {
  return h("section", { class: "seccion" }, titulo ? h("h2", { class: "seccion-titulo" }, titulo) : null, ...hijos);
}

export function vacio(texto, ...extra) {
  return h("div", { class: "vacio" }, h("p", null, texto), ...extra);
}

export function ayuda(texto) {
  return h("p", { class: "ayuda" }, texto);
}

// --- Textos de series ---

// «80×10», «×12» (sin peso) o «30 s» (por tiempo).
export function textoSerie(serie, tipo = "peso") {
  if (!serie) return "";
  if (tipo === "tiempo") return `${formatoNumero(serie.reps)} s`;
  if (tipo === "corporal" || serie.kg == null) return `×${formatoNumero(serie.reps)}`;
  return `${formatoNumero(serie.kg)}×${formatoNumero(serie.reps)}`;
}

export function textoSeries(series, tipo = "peso") {
  return (series || []).map((s) => textoSerie(s, tipo)).join(" · ");
}

// «3 × 8-12 · 🏆 80 kg · ⏱ 2:30»: la marca con un trofeo y el descanso con un reloj, para que no se lea 80 kg como el
// peso de hoy (los lectores de pantalla oyen «marca» y «descanso»). Sin marca en corporal, por tiempo o si no hay.
export function lineaDatos(entrada, ejercicio) {
  const conMarca = (ejercicio?.tipo || "peso") === "peso" && ejercicio?.pr != null;
  return [
    `${entrada.series} × ${entrada.reps}`,
    conMarca ? [" · ", h("span", { class: "dato-icono" }, icono("trofeo", { tamano: 15 }), h("span", { class: "solo-lector" }, "marca "), formatoKg(ejercicio.pr))] : null,
    " · ",
    h("span", { class: "dato-icono" }, icono("reloj", { tamano: 15 }), h("span", { class: "solo-lector" }, "descanso "), entrada.rest),
  ];
}

// «80 kg × 10», «12 reps» o «30 s» para el botón «Hecha».
export function textoValores(kg, reps, tipo) {
  const r = reps == null || reps === "" ? "?" : formatoNumero(reps);
  if (tipo === "tiempo") return `${r} s`;
  if (tipo === "corporal") return `${r} reps`;
  const k = kg == null || kg === "" ? "?" : formatoNumero(kg);
  return `${k} kg × ${r}`;
}

// El texto del botón ✓: «Hecha · 80 kg × 10»; con peso y sin él (0 o vacío), «Pon el peso».
export function textoBotonHecha(kg, reps, tipo) {
  if (tipo === "peso" && !(Number(kg) > 0)) return "Pon el peso";
  return `Hecha · ${textoValores(kg, reps, tipo)}`;
}

// --- Campos de una serie (peso y repeticiones o segundos) ---

// −/+ en el campo, en su sitio y sin repintar: el peso de «incremento» en «incremento»; las repeticiones de 1 en 1
// y los segundos de 5 en 5.
export function pasoEn(contenedor, accion, x) {
  const [campo, sentido] = accion.split("-");
  const input = contenedor.querySelector(`[data-campo="${campo}"]`);
  if (!input) return;
  const signo = sentido === "mas" ? 1 : -1;
  const n = leerNumero(input.value) ?? 0;
  let nuevo;
  if (campo === "kg") nuevo = limitar(redondear(n + signo * (x.incremento || 2.5), 0.25), 0, LIMITES.kgMax);
  else {
    const salto = x.tipo === "tiempo" ? 5 : 1;
    nuevo = limitar(Math.round(n) + signo * salto, 0, x.tipo === "tiempo" ? LIMITES.segundosMax : LIMITES.repsMax);
  }
  input.value = formatoNumero(nuevo);
  ponerErrorControl(input.closest(".control"), "");
}

export const TEXTO_PON_EL_PESO = "Pon el peso. Si no lleva peso, cambia el tipo en Editar.";

// Qué falla en el peso de una serie (o "" si vale). Con peso, 0 es que falta: nunca se apunta «0 kg».
export function errorPeso(kg) {
  if (kg == null) return "Escribe un número, por ejemplo 82,5";
  if (kg < 0) return "El peso no puede ser negativo.";
  if (kg > LIMITES.kgMax) return `Como mucho ${formatoNumero(LIMITES.kgMax)} kg.`;
  if (kg === 0) return TEXTO_PON_EL_PESO;
  return "";
}

// Qué falla en las repeticiones (o en los segundos) de una serie, o "".
export function errorReps(reps, tipo) {
  const tiempo = tipo === "tiempo";
  if (reps == null || !Number.isInteger(reps)) return tiempo ? "Escribe los segundos, por ejemplo 30" : "Escribe un número entero, por ejemplo 10";
  const max = tiempo ? LIMITES.segundosMax : LIMITES.repsMax;
  if (reps < 0 || reps > max) return tiempo ? `Entre 0 y ${max} segundos.` : `Entre 0 y ${max} repeticiones.`;
  return "";
}

// Lee y valida los campos de la serie; si algo no vale, pone el error junto al campo y le da el foco.
export function leerCamposEn(contenedor, x) {
  const r = { ok: true, kg: null, reps: null };
  let primero = null;
  if (x.tipo === "peso") {
    const c = contenedor.querySelector('[data-campo="kg"]');
    const kg = leerNumero(c?.value ?? "");
    const error = errorPeso(kg);
    if (error) {
      ponerErrorControl(c?.closest(".control"), error);
      r.ok = false;
      primero ||= c;
    } else {
      r.kg = redondear(kg, 0.01);
      ponerErrorControl(c.closest(".control"), "");
    }
  }
  const c = contenedor.querySelector('[data-campo="reps"]');
  const reps = leerNumero(c?.value ?? "");
  const error = errorReps(reps, x.tipo);
  if (error) {
    ponerErrorControl(c?.closest(".control"), error);
    r.ok = false;
    primero ||= c;
  } else {
    r.reps = reps;
    ponerErrorControl(c.closest(".control"), "");
  }
  if (primero) primero.focus();
  return r;
}
