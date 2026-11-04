// Pantalla Ajustes: aspecto, descanso (avisos, permiso de notificaciones, descanso con sonido, pantalla encendida,
// probar aviso y qué hacer si el aviso no llega con el móvil bloqueado), tiempo estimado, copia de seguridad (guardar, cargar con vista previa, copias automáticas), datos de la versión
// normal (qué ha cambiado, volver a copiar), la beta (versión, sin conexión, novedades, apuntes) y la zona peligrosa.
// Los cambios valen al momento.

import { h, icono, vaciar } from "./dom.js";
import { avisar, avisarDeshacer, cerrarAviso, confirmar, abrirHoja } from "./avisos.js";
import { ctx } from "./contexto.js";
import { boton, control, ponerErrorControl, interruptor, seccion, ayuda } from "./piezas.js";
import { terminarYGuardar } from "./entreno.js";
import * as almacen from "../almacen.js";
import * as descanso from "../descanso.js";
import * as S from "../sesion.js";
import { VERSION, FECHA_VERSION, NOVEDADES } from "../version.js";
import { ESQUEMA, LIMITES, validarDatos, reparar, migrar, diaPorId } from "../modelo.js";
import {
  guardarCopia, leerCopia, aplicarCopia, guardarCopiaAuto, listarCopiasAuto, leerCopiaAuto, copiasAutoFuncionan, puedeCompartirCopias,
} from "../copias.js";
import {
  copiarDesdeNormal, aplicarRecopia, cargarBase, cargarBaseGuardada, aplicarRutinaPublicada, marcasQueBajan, compararConNormal,
  efectoEnLaNormal, huellaNormal,
} from "../normal.js";
import {
  ahora, haceDias, diaMes, hora, fechaConAnio, formatoNumero, formatoKg, formatoTamano, leerNumero, limitar, idApunte, recortar, plural,
} from "../util.js";

const TEMAS = [["auto", "Automático (como el móvil)"], ["claro", "Claro"], ["oscuro", "Oscuro"]];
const NOMBRES_PANTALLA = { entreno: "Entreno", historial: "Historial", rutina: "Rutina", ajustes: "Ajustes" };

// --- Guardar copia (también desde los banners de Entreno y el resumen de la sesión) ---

// Se llama dentro del clic, sin esperar nada antes: así el menú de compartir puede abrirse.
export function accionGuardarCopia({ forzarDescarga = false, alTerminar = null } = {}) {
  const datos = almacen.datos();
  const t = ahora();
  return guardarCopia(datos, t, { forzarDescarga }).then((r) => {
    if (r.metodo) {
      almacen.mutar((d) => { d.copia = { ultima: t, metodo: r.metodo }; }, { tocarActualizado: false });
      avisar({ texto: r.metodo === "compartida" ? "Copia guardada" : `Copia descargada en la carpeta Descargas: ${r.nombre}` });
    } else {
      avisar({ texto: "No se ha guardado la copia" });
    }
    if (ctx.pantalla() === "ajustes") actualizarLineaCopia();
    alTerminar?.(r);
    return r;
  });
}

function lineaCopia() {
  const c = almacen.datos().copia;
  const t = ahora();
  if (!c?.ultima) return "Aún no has guardado ninguna copia.";
  return `Última copia: ${haceDias(c.ultima, t)} (${diaMes(c.ultima)}, ${hora(c.ultima)})`;
}

function actualizarLineaCopia() {
  const p = document.getElementById("linea-copia");
  if (p) p.textContent = lineaCopia();
}

// --- La versión normal: ¿ha cambiado desde la última copia? ---

// Si la normal ha cambiado desde que se copió (y no se ha dicho ya «Ahora no» a ese cambio), devuelve {fecha}; si no, null.
export function normalHaCambiado(ui = almacen.leerUi()) {
  const copiada = ui.normalCopiada;
  if (!copiada?.huella) return null;
  const actual = huellaNormal();
  if (actual === copiada.huella || actual === ui.normalAvisoOculto) return null;
  return { fecha: Number.isFinite(copiada.fecha) ? copiada.fecha : null, huella: actual };
}

export function ocultarAvisoNormal() {
  almacen.cambiarUi((u) => { u.normalAvisoOculto = huellaNormal(); });
}

export function apuntarCopiaNormal(huella, fecha) {
  almacen.cambiarUi((u) => {
    u.normalCopiada = { huella, fecha };
    u.normalAvisoOculto = null;
  });
}

const textoMarca = (kg) => (kg == null ? "sin marca" : formatoKg(kg));

// Hoja «Qué cambia» entre la beta y la normal: marcas, días, ejercicios y planes distintos.
export async function hojaCambiosNormal({ alTerminar = null } = {}) {
  const r = await copiarDesdeNormal({ ahoraMs: ahora(), cargar: cargarBaseGuardada });
  if (!r.ok) {
    avisar({ texto: r.error, tipo: "error" });
    return;
  }
  const datos = almacen.datos();
  const c = compararConNormal(datos, r.datos);
  ocultarAvisoNormal();
  if (c.total === 0) {
    almacen.cambiarUi((u) => { u.normalCopiada = { huella: r.huella, fecha: u.normalCopiada?.fecha ?? ahora() }; });
    avisar({ texto: "La versión normal no tiene cambios que afecten a la beta." });
    alTerminar?.();
    return;
  }
  const bloque = (titulo, lineas) => (lineas.length
    ? h("section", { class: "cambios-bloque" }, h("h3", { class: "tarjeta-titulo" }, titulo), h("ul", { class: "lista-avisos" }, lineas.map((l) => h("li", null, l))))
    : null);
  const cuerpo = [
    bloque(`Marcas distintas (${c.marcas.length})`, c.marcas.map((m) => `${m.nombre}: aquí ${textoMarca(m.beta)} · en la normal ${textoMarca(m.normal)}`)),
    bloque("Días que solo están en la normal", c.soloNormal),
    bloque("Días que solo están en la beta", c.soloBeta),
    bloque("Ejercicios distintos", c.ejercicios.map((e) => [
      e.soloNormal.length ? `${e.dia}: en la normal hay ${e.soloNormal.join(", ")}` : null,
      e.soloBeta.length ? `${e.dia}: aquí hay ${e.soloBeta.join(", ")}` : null,
    ].filter(Boolean).join(" · "))),
    bloque("Series, repeticiones o descanso distintos", c.plan.map((p) => `${p.dia} · ${p.nombre}: aquí ${p.beta} · en la normal ${p.normal}`)),
    ayuda("Para traer lo de la normal: «Volver a copiar» (puedes quedarte con la marca más alta de las dos). Para llevar lo de la beta a la normal: «Guardar copia» aquí e «Importar datos» allí."),
  ];
  const hoja = abrirHoja({
    titulo: "Qué cambia con la versión normal",
    cuerpo,
    clase: "hoja-alta",
    pie: [boton("Volver a copiar", "copiar-normal"), boton("Cerrar", "cerrar-hoja", { clase: "boton-principal" })],
    alAccion: (accion) => {
      if (accion === "copiar-normal") hoja.cerrar().then(() => recopiar());
    },
    alCerrar: () => alTerminar?.(),
  });
}

// Debajo de «Guardar copia»: qué pasaría en la normal si se carga allí esta copia (marcas que bajarían y ejercicios
// sin marca que saldrían con la publicada). Se calcula aparte, sin frenar el pintado.
function pintarEfectoNormal() {
  const zona = document.getElementById("efecto-normal");
  if (!zona) return;
  copiarDesdeNormal({ ahoraMs: ahora(), cargar: cargarBaseGuardada }).then((r) => {
    if (!r.ok || !zona.isConnected) return;
    const efecto = efectoEnLaNormal(almacen.datos(), r.datos, r.base.ejercicios);
    const lista = (items, texto) => items.slice(0, 4).map(texto).join(", ") + (items.length > 4 ? "…" : "");
    const lineas = [];
    if (efecto.bajan.length) {
      lineas.push(`bajarían ${plural(efecto.bajan.length, "marca", "marcas")} de la normal: ${lista(efecto.bajan, (m) => `${m.nombre} (${formatoKg(m.de)} → ${textoMarca(m.a)})`)}`);
    }
    if (efecto.publicadas.length) {
      lineas.push(`sin marca aquí, allí saldrán con la publicada: ${lista(efecto.publicadas, (m) => `${m.nombre} (${formatoKg(m.kg)})`)}`);
    }
    if (!lineas.length) return;
    vaciar(zona).append(h("div", { class: "aviso-texto-fuerte" },
      h("p", { class: "aviso-titulo" }, "Ojo, si cargas esta copia en la versión normal:"),
      h("ul", { class: "lista-avisos" }, lineas.map((l) => h("li", null, l)))));
  }).catch(() => {});
}

function lineaEstadoNormal() {
  const ui = almacen.leerUi();
  const fecha = Number.isFinite(ui.normalCopiada?.fecha) ? ` (${diaMes(ui.normalCopiada.fecha)})` : "";
  if (!ui.normalCopiada?.huella) return [h("p", { class: "linea-dato" }, "Copiada al empezar la beta.")];
  if (huellaNormal() === ui.normalCopiada.huella) return [h("p", { class: "linea-dato" }, `La versión normal no ha cambiado desde que la copiaste${fecha}.`)];
  return [
    h("p", { class: "linea-dato aviso-texto-fuerte" }, `La versión normal ha cambiado desde que la copiaste${fecha}.`),
    boton("Ver qué cambia", "ver-cambios-normal", { clase: "boton-secundario boton-ancho" }),
  ];
}

// --- Pintado ---

// La ayuda del interruptor «Notificación»: si falta el permiso se dice claro (no llegarán) y se ofrece pedirlo.
function ayudaNotificacion() {
  const p = descanso.permisoNotificaciones();
  if (p === "no-existe") return [ayuda("Este navegador no permite notificaciones.")];
  if (p === "granted") return [h("p", { class: "ayuda estado-bien" }, icono("check", { tamano: 18 }), h("span", null, "Permiso concedido. Avisan con el móvil bloqueado o con otra app delante."))];
  if (p === "denied") return [ayuda(`Permiso denegado: actívalo en los ajustes de Chrome para ${location.hostname}. Hasta entonces no llegarán.`)];
  return [
    h("p", { class: "ayuda aviso-permiso" }, "Falta el permiso: las notificaciones no llegarán hasta que lo des."),
    boton("Permitir notificaciones", "pedir-permiso", { clase: "boton-secundario", ico: "campana" }),
  ];
}

function pintarPermiso() {
  const zona = document.getElementById("estado-permiso");
  if (zona) vaciar(zona).append(...ayudaNotificacion());
  const fila = document.querySelector('[data-ajuste="timerNotification"]')?.closest(".fila-interruptor");
  fila?.classList.toggle("sin-permiso", descanso.permisoNotificaciones() !== "granted");
}

// «Si el aviso no llega con el móvil bloqueado»: plegado de serie, al final de la sección Descanso.
function consejosAviso() {
  const consejos = [
    "Android para la app cuando lleva más de un minuto sin estar a la vista (con el móvil bloqueado u otra app delante), y entonces el aviso puede no llegar, sobre todo en descansos de 2 o 3 minutos. No pasa si dejas puesto «Mantener la pantalla encendida durante la sesión» y no bloqueas el móvil.",
    "La notificación del descanso dice a qué hora acaba: aunque el aviso no suene, puedes mirarla en la pantalla de bloqueo.",
    "Si la notificación llega sin sonido o no se ve, mantén pulsada una notificación de la app (o búscala en los ajustes de Android) y revisa el sonido, el mensaje emergente y la pantalla de bloqueo. Mira también que No molestar esté apagado. La vibración la decide Android: la app no puede cambiarla.",
    "Para que el aviso llegue siempre a su hora, enciende «Descanso con sonido» (aquí arriba).",
  ];
  return h("details", { class: "detalles consejos-aviso" },
    h("summary", null, icono("info", { tamano: 20 }), h("span", null, "Si el aviso no llega con el móvil bloqueado"),
      h("span", { class: "consejos-flecha" }, icono("siguiente", { tamano: 20 }))),
    h("ul", { class: "lista-consejos" }, consejos.map((t) => h("li", null, t))));
}

export function pintarAjustes(contenedor) {
  const datos = almacen.datos();
  const a = datos.ajustes;
  const temas = h("div", { class: "opciones", role: "radiogroup", "aria-label": "Tema" },
    TEMAS.map(([valor, texto]) => h("button", {
      class: ["opcion", a.tema === valor && "activa"], type: "button", role: "radio", "aria-checked": String(a.tema === valor), "data-accion": "tema", "data-valor": valor,
    }, h("span", { class: "opcion-marca" }), h("span", null, texto))));

  const bytes = almacen.tamanoDatos();
  const tamano = h("p", { class: "ayuda" }, `Ocupan ${formatoTamano(bytes)}`);
  const avisoTamano = bytes > LIMITES.avisoTamano
    ? h("p", { class: "ayuda aviso-texto-fuerte" }, `Tus datos ocupan ${formatoTamano(bytes)}. Guarda una copia de vez en cuando.`) : null;

  // En Chrome de Android no se puede compartir un .json: allí el botón dice lo que de verdad hace (descargar).
  const comparte = puedeCompartirCopias();
  const enLaNormal = "Al cargarla en la versión normal se sustituyen su rutina y sus marcas.";
  const controlaBeta = ctx.version.controlaLaBeta();
  vaciar(contenedor).append(h("div", { class: "pantalla-ajustes" },
    h("h1", { class: "titulo-pantalla" }, "Ajustes"),
    seccion("Aspecto", h("p", { class: "campo-rotulo" }, "Tema"), temas),
    seccion("Descanso",
      interruptor({ ajuste: "timerAlert", rotulo: "Aviso a pantalla completa", marcado: a.timerAlert }),
      interruptor({ ajuste: "timerSound", rotulo: "Sonido", marcado: a.timerSound }),
      interruptor({ ajuste: "vibracion", rotulo: "Vibración", marcado: a.vibracion }),
      interruptor({ ajuste: "timerNotification", rotulo: "Notificación", ayuda: "Solo si la app no está a la vista.", marcado: a.timerNotification }),
      h("div", { class: "estado-permiso", id: "estado-permiso" }),
      interruptor({ ajuste: "descansoConSonido", rotulo: "Descanso con sonido (aviso más fiable)", marcado: a.descansoConSonido,
        ayuda: "Durante el descanso suena un tic-tac muy suave y el aviso va dentro del propio sonido: así llega a su hora aunque bloquees el móvil. En la pantalla de bloqueo se ve el descanso con su barra de progreso. Ojo: mientras suena, Android pausa la música de otras apps." }),
      interruptor({ ajuste: "descansoAlMarcar", rotulo: "Empezar el descanso al marcar una serie", marcado: a.descansoAlMarcar,
        ayuda: "Si lo apagas, el descanso se empieza con el botón «Descanso» de cada ejercicio." }),
      interruptor({ ajuste: "pantallaEncendida", rotulo: "Mantener la pantalla encendida durante la sesión", marcado: a.pantallaEncendida,
        ayuda: descanso.pantallaEncendidaExiste() ? "" : "Este navegador no deja mantener la pantalla encendida" }),
      boton("Probar aviso", "probar-aviso", { clase: "boton-secundario boton-ancho", ico: "reloj" }),
      ayuda("Lanza el aviso de fin de descanso: la capa, el sonido, la vibración y una notificación de prueba."),
      consejosAviso()),
    seccion("Tiempo estimado",
      control({ campo: "segundosPorSerie", rotulo: "Segundos por serie", valor: String(a.segundosPorSerie), unidad: "s", inputmode: "numeric", accionMenos: "sps-menos", accionMas: "sps-mas", etiquetaMenos: "5 segundos menos por serie", etiquetaMas: "5 segundos más por serie" }),
      control({ campo: "transitionMinutes", rotulo: "Minutos por cambio de ejercicio", valor: formatoNumero(a.transitionMinutes), unidad: "min", inputmode: "decimal", accionMenos: "cambio-menos", accionMas: "cambio-mas", etiquetaMenos: "Medio minuto menos por cambio", etiquetaMas: "Medio minuto más por cambio" }),
      ayuda("Sirven para calcular la duración de cada día.")),
    seccion("Copia de seguridad",
      h("p", { class: "linea-dato", id: "linea-copia" }, lineaCopia()),
      comparte
        ? boton("Guardar copia", "guardar-copia", { clase: "boton-principal boton-ancho", ico: "compartir" })
        : boton("Descargar copia", "guardar-copia", { clase: "boton-principal boton-ancho", ico: "descargar" }),
      ayuda(comparte
        ? `Se abre el menú de compartir para mandarla a Drive, Telegram o tu correo. ${enLaNormal}`
        : `Se guarda en la carpeta Descargas del móvil; desde allí puedes mandarla a Drive, Telegram o tu correo. ${enLaNormal}`),
      comparte ? h("button", { class: "enlace-boton", type: "button", "data-accion": "descargar-copia" }, icono("descargar", { tamano: 20 }), "Descargar el archivo") : null,
      h("div", { id: "efecto-normal", class: "efecto-normal" }),
      h("div", { class: "separador" }),
      boton("Cargar una copia", "cargar-copia", { clase: "boton-secundario boton-ancho", ico: "copia" }),
      h("input", { type: "file", accept: ".json,application/json", class: "oculto", "data-campo": "archivo", tabindex: "-1", "aria-hidden": "true" }),
      ayuda("Acepta copias de la beta y de la versión normal. Antes de cambiar nada verás qué trae."),
      h("p", { class: "campo-error", id: "error-carga" }),
      h("div", { class: "separador" }),
      boton("Ver copias automáticas", "ver-copias-auto", { clase: "boton-secundario boton-ancho" }),
      h("div", { id: "copias-auto", class: "copias-auto" }),
      h("p", { class: "linea-dato", id: "proteccion" }, "Protección de los datos: comprobando…"),
      tamano,
      avisoTamano),
    seccion("Datos de la versión normal",
      h("div", { id: "estado-normal", class: "estado-normal" }, lineaEstadoNormal()),
      boton("Volver a copiar desde la versión normal", "copiar-normal", { clase: "boton-secundario boton-ancho" }),
      ayuda("Cambia tu rutina, tus marcas y tus ajustes de la beta por los de la versión normal. Tu historial de la beta se queda. Antes se guarda una copia automática."),
      boton("Volver a la rutina publicada", "rutina-publicada", { clase: "boton-secundario boton-ancho" }),
      ayuda("Deja los días y ejercicios como en la rutina publicada. Conserva tus marcas y tu historial.")),
    seccion("Beta",
      h("p", { class: "linea-dato" }, `Estás en la beta, versión ${VERSION} (${fechaConAnio(new Date(`${FECHA_VERSION}T12:00:00`).getTime())}). La versión normal sigue igual y no ve estos datos.`),
      h("p", { class: "linea-dato", id: "sin-conexion" }, `Funciona sin conexión: ${controlaBeta ? "sí" : "todavía no"}`),
      controlaBeta ? null : ayuda("Se prepara sola la primera vez que la beta se abre con conexión: ciérrala y vuelve a abrirla con conexión, y ya funcionará sin ella."),
      boton("Buscar actualización", "buscar-actualizacion", { clase: "boton-secundario boton-ancho" }),
      boton("Novedades", "novedades", { clase: "boton-secundario boton-ancho" }),
      boton("Apuntar un fallo o una idea", "apuntes", { clase: "boton-secundario boton-ancho", ico: "lapiz" }),
      ayuda("También desde cualquier pantalla: toca «BETA» arriba."),
      h("a", { class: "enlace-boton", href: "../?normal" }, icono("volver", { tamano: 20 }), "Ir a la versión normal"),
      ayuda("La app se abre en la última versión que elegiste: si vuelves a la normal con este enlace o con el de arriba, la próxima vez se abrirá la normal.")),
    h("section", { class: "seccion zona-peligrosa" },
      h("h2", { class: "seccion-titulo" }, "Zona peligrosa"),
      h("button", { class: "boton boton-peligro-suave boton-ancho", type: "button", "data-accion": "borrar-todo" }, icono("papelera", { tamano: 20 }), h("span", null, "Borrar todos los datos de la beta")),
      ayuda("Borra la rutina, el historial y los ajustes de la beta en este móvil. La versión normal no se toca. Las copias automáticas se conservan."))));

  pintarPermiso();
  pintarEfectoNormal();
  // Lo que tarda (no bloquea el pintado).
  if (navigator.storage?.persisted) {
    navigator.storage.persisted().then((si) => pintarProteccion(si)).catch(() => pintarProteccion(null));
  } else {
    pintarProteccion(null);
  }
}

function pintarProteccion(protegidos) {
  const p = document.getElementById("proteccion");
  if (!p) return;
  vaciar(p);
  if (protegidos === true) {
    p.append("Protección de los datos: el navegador no los borrará solo.");
  } else if (protegidos === false) {
    p.append("Protección de los datos: si al móvil le falta espacio, el navegador podría borrarlos. ",
      h("button", { class: "boton boton-secundario boton-corto", type: "button", "data-accion": "pedir-proteccion" }, "Pedir protección"));
  } else {
    p.append("Protección de los datos: este navegador no lo dice.");
  }
}

// --- Cambios de campos ---

function cambiarAjuste(clave, valor) {
  almacen.mutar((d) => { d.ajustes[clave] = valor; });
}

export function alCampoAjustes(ev) {
  const el = ev.target;
  if (el?.dataset?.ajuste && ev.type === "change") {
    cambiarAjuste(el.dataset.ajuste, el.checked);
    if (el.dataset.ajuste === "pantallaEncendida") descanso.actualizarPantalla();
    if (el.dataset.ajuste === "timerNotification") pintarPermiso();
    // Con un descanso en marcha, el sonido de fondo se pone o se quita al momento (y «Sonido» decide si lleva el aviso).
    if (el.dataset.ajuste === "descansoConSonido" || el.dataset.ajuste === "timerSound") descanso.alCambiarAjusteSonido();
    return;
  }
  if (el?.dataset?.campo === "archivo" && ev.type === "change") {
    const archivo = el.files?.[0];
    el.value = "";
    if (archivo) leerYPrevisualizar(archivo);
    return;
  }
  if (ev.type !== "change") return;
  if (el?.dataset?.campo === "segundosPorSerie") {
    const n = leerNumero(el.value);
    const ctrl = el.closest(".control");
    if (n == null || n < LIMITES.segundosPorSerieMin || n > LIMITES.segundosPorSerieMax) {
      ponerErrorControl(ctrl, "Pon entre 10 y 180 segundos.");
      return;
    }
    ponerErrorControl(ctrl, "");
    el.value = String(Math.round(n));
    cambiarAjuste("segundosPorSerie", Math.round(n));
  } else if (el?.dataset?.campo === "transitionMinutes") {
    const n = leerNumero(el.value);
    const ctrl = el.closest(".control");
    if (n == null || n < 0 || n > LIMITES.cambioMax) {
      ponerErrorControl(ctrl, "Pon entre 0 y 10 minutos.");
      return;
    }
    ponerErrorControl(ctrl, "");
    el.value = formatoNumero(n);
    cambiarAjuste("transitionMinutes", n);
  }
}

// --- Acciones ---

export function pedirPermisoNotificaciones() {
  if (typeof Notification === "undefined") return Promise.resolve("no-existe");
  return Promise.resolve(Notification.requestPermission()).catch(() => null).then(() => descanso.permisoNotificaciones());
}

export function alAccionAjustes(accion, el) {
  const pantalla = el.closest("#pantalla") || document;
  switch (accion) {
    case "tema": {
      const tema = el.dataset.valor;
      cambiarAjuste("tema", tema);
      ctx.aplicarTema(tema);
      for (const b of pantalla.querySelectorAll('[data-accion="tema"]')) {
        b.classList.toggle("activa", b === el);
        b.setAttribute("aria-checked", String(b === el));
      }
      return undefined;
    }
    case "pedir-permiso":
      return pedirPermisoNotificaciones().then(() => pintarPermiso());
    case "probar-aviso": {
      const p = descanso.permisoNotificaciones();
      if (p === "default" && almacen.datos().ajustes.timerNotification) {
        return pedirPermisoNotificaciones().then(() => {
          pintarPermiso();
          descanso.probarAviso();
        });
      }
      descanso.probarAviso();
      return undefined;
    }
    case "sps-menos": case "sps-mas": {
      const c = pantalla.querySelector('[data-campo="segundosPorSerie"]');
      const n = limitar((leerNumero(c.value) ?? 40) + (accion === "sps-mas" ? 5 : -5), LIMITES.segundosPorSerieMin, LIMITES.segundosPorSerieMax);
      c.value = String(Math.round(n));
      ponerErrorControl(c.closest(".control"), "");
      cambiarAjuste("segundosPorSerie", Math.round(n));
      return undefined;
    }
    case "cambio-menos": case "cambio-mas": {
      const c = pantalla.querySelector('[data-campo="transitionMinutes"]');
      const n = limitar((leerNumero(c.value) ?? 2) + (accion === "cambio-mas" ? 0.5 : -0.5), 0, LIMITES.cambioMax);
      c.value = formatoNumero(n);
      ponerErrorControl(c.closest(".control"), "");
      cambiarAjuste("transitionMinutes", n);
      return undefined;
    }
    case "guardar-copia": return accionGuardarCopia();
    case "descargar-copia": return accionGuardarCopia({ forzarDescarga: true });
    case "cargar-copia": {
      const error = document.getElementById("error-carga");
      if (error) error.textContent = "";
      pantalla.querySelector('[data-campo="archivo"]')?.click();
      return undefined;
    }
    case "ver-copias-auto": return verCopiasAuto();
    case "recuperar-copia": return recuperarCopia(Number(el.dataset.id));
    case "pedir-proteccion":
      return navigator.storage?.persist?.().then((si) => {
        pintarProteccion(si);
        if (!si) avisar({ texto: "El navegador no la ha concedido. Suele darla a las apps instaladas que se usan a menudo." });
      }).catch(() => pintarProteccion(null));
    case "ver-cambios-normal":
      return hojaCambiosNormal({ alTerminar: () => {
        const zona = document.getElementById("estado-normal");
        if (zona) vaciar(zona).append(...lineaEstadoNormal());
      } });
    case "copiar-normal": return recopiar();
    case "rutina-publicada": return rutinaPublicada();
    case "buscar-actualizacion": return buscarActualizacion();
    case "novedades": return hojaNovedades();
    case "apuntes": return hojaApuntes();
    case "borrar-todo": return borrarTodo();
    default: return undefined;
  }
}

// --- Antes de cambiar los días ---

// Al cargar una copia, volver a copiar, volver a la publicada o recuperar una copia automática: si hay una sesión en
// curso de un día que no va a estar después, se pregunta si se termina antes (así no queda una sesión huérfana).
// Devuelve false si se cancela o si no se pudo guardar.
async function antesDeQuitarDias(diasNuevos, que) {
  const sesion = almacen.leerSesion();
  if (!sesion || diasNuevos.some((d) => d.id === sesion.diaId)) return true;
  const dia = diaPorId(almacen.datos(), sesion.diaId);
  const seguir = await confirmar({
    titulo: "Sesión en curso",
    texto: `Tienes una sesión en curso de ${dia ? dia.title || dia.label : "otro día"}, y ese día no estará después de ${que}. ¿Terminarla antes?`,
    aceptar: "Terminarla y seguir",
  });
  if (!seguir) return false;
  const actual = almacen.leerSesion();
  if (actual) {
    if (S.totalSeries(actual) > 0) {
      if (!terminarYGuardar(actual)) return false;
    } else {
      almacen.borrarSesion();
      if (descanso.idActual()) descanso.saltar();
    }
  }
  descanso.actualizarPantalla();
  return true;
}

// --- Cargar una copia ---

const contar = (n, uno, varios) => `${formatoNumero(n)} ${n === 1 ? uno : varios}`;

async function leerYPrevisualizar(archivo) {
  const error = document.getElementById("error-carga");
  if (error) error.textContent = "";
  const actuales = almacen.datos();
  const leida = await leerCopia(archivo, { actuales, ahoraMs: ahora() });
  if (!leida.ok) {
    if (error) {
      error.textContent = leida.error;
      error.setAttribute("role", "alert");
    }
    avisar({ texto: leida.error, tipo: "error" });
    return;
  }
  const r = leida.resumen;
  const fecha = r.fecha && Number.isFinite(Date.parse(r.fecha)) ? `${fechaConAnio(Date.parse(r.fecha))}, ${hora(Date.parse(r.fecha))}` : null;
  const origen = r.de === "beta" ? "hecha con la beta" : r.de === "versión normal" ? "hecha con la versión normal" : "copia antigua de la versión normal";
  const lineas = [
    h("p", { class: "vista-previa-linea" }, fecha ? `Copia del ${fecha} · ${origen}` : `Copia · ${origen}`),
    h("p", { class: "vista-previa-linea fuerte" }, `${contar(r.dias, "día", "días")} · ${contar(r.entradas, "ejercicio", "ejercicios")} (${formatoNumero(r.distintos)} distintos) · ${contar(r.marcas, "marca", "marcas")}`),
    h("p", { class: "vista-previa-linea" }, leida.traeHistorial
      ? contar(r.sesiones ?? 0, "sesión", "sesiones")
      : `Sin historial: se conserva el tuyo (${contar(actuales.sesiones.length, "sesión", "sesiones")})`),
  ];
  const raros = leida.raros || {};
  const partes = [];
  if (raros.sesiones) partes.push(contar(raros.sesiones, "sesión", "sesiones"));
  if (raros.marcas) partes.push(contar(raros.marcas, "cambio de marca", "cambios de marca"));
  if (raros.apuntes) partes.push(contar(raros.apuntes, "apunte", "apuntes"));
  if (partes.length) {
    lineas.push(h("p", { class: "vista-previa-linea aviso-texto-fuerte" }, `${partes.join(", ")} con datos raros no se cargan; se guardan aparte.`));
  }
  if (leida.avisos.length) {
    lineas.push(h("details", { class: "detalles" }, h("summary", null, `Avisos (${leida.avisos.length})`),
      h("ul", { class: "lista-avisos" }, leida.avisos.map((a) => h("li", null, a)))));
  }
  if (leida.sinCambios) {
    // Un diff sin cambios dejaría todo como la rutina publicada (y los ajustes de serie): no se deja cargar.
    lineas.push(h("p", { class: "vista-previa-linea aviso-texto-fuerte" }, "Esta copia no trae cambios: es la rutina publicada. No hace falta cargarla."));
    await confirmar({ titulo: "Cargar una copia", contenido: h("div", { class: "vista-previa" }, lineas), aceptar: null, cancelar: "Cerrar" });
    return;
  }
  lineas.push(h("p", { class: "ayuda" }, leida.traeHistorial
    ? "Se sustituyen tu rutina, tu historial, tus marcas y tus ajustes de la beta. Antes se guarda una copia automática."
    : "Se sustituyen tu rutina, tus marcas y tus ajustes de la beta. Antes se guarda una copia automática."));
  const ok = await confirmar({ titulo: "Cargar una copia", contenido: h("div", { class: "vista-previa" }, lineas), aceptar: "Cargar esta copia" });
  if (!ok) return;
  await cargarLeida(leida);
}

async function cargarLeida(leida) {
  const t = ahora();
  if (!(await antesDeQuitarDias(leida.datosNuevos.dias, "cargar la copia"))) return;
  const copiaHecha = await guardarCopiaAuto(almacen.datos(), "antes de cargar una copia", t);
  const deshacer = almacen.mutar((d) => aplicarCopia(d, leida, t));
  ctx.aplicarTema(almacen.datos().ajustes.tema);
  ctx.repintar();
  avisarDeshacer(copiaHecha ? "Copia cargada" : "Copia cargada (sin copia automática previa)", deshacer, () => {
    ctx.aplicarTema(almacen.datos().ajustes.tema);
    ctx.repintar();
  });
}

// --- Copias automáticas ---

async function verCopiasAuto() {
  const zona = document.getElementById("copias-auto");
  if (!zona) return;
  vaciar(zona).append(ayuda("Buscando…"));
  let lista;
  try {
    lista = await listarCopiasAuto();
  } catch {
    vaciar(zona).append(ayuda("Las copias automáticas no funcionan en este navegador."));
    return;
  }
  if (!lista.length) {
    vaciar(zona).append(ayuda("Aún no hay copias automáticas. Se guardan al terminar cada sesión y antes de cambios grandes."));
    return;
  }
  vaciar(zona).append(h("ul", { class: "lista-filas" }, lista.map((c) => h("li", { class: "fila-con-boton" },
    h("span", { class: "fila-textos" },
      h("span", { class: "fila-titulo" }, `${diaMes(c.fecha)}, ${hora(c.fecha)} · ${c.motivo}`),
      h("span", { class: "fila-datos" }, c.resumen)),
    h("button", { class: "boton boton-secundario boton-corto", type: "button", "data-accion": "recuperar-copia", "data-id": String(c.id) }, "Recuperar")))));
}

// Lee una copia automática y la deja lista para usar (migrada y reparada), o null si no se puede leer.
export async function datosDeCopiaAuto(id) {
  let registro;
  try {
    registro = await leerCopiaAuto(id);
  } catch {
    registro = null;
  }
  try {
    let d = JSON.parse(registro?.datos ?? "null");
    if (d && d.esquema < ESQUEMA) d = migrar(d);
    if (d && d.esquema === ESQUEMA && validarDatos(d).ok) return { registro, datos: reparar(d).datos };
  } catch {
    // Copia ilegible.
  }
  return null;
}

async function recuperarCopia(id) {
  const leida = await datosDeCopiaAuto(id);
  if (!leida) {
    avisar({ texto: "Esa copia no se puede leer.", tipo: "error" });
    return;
  }
  const { registro, datos } = leida;
  const ok = await confirmar({
    titulo: "Recuperar una copia automática",
    texto: `¿Recuperar la copia del ${diaMes(registro.fecha)}, ${hora(registro.fecha)} (${registro.motivo})? Se sustituyen tus datos de la beta. Antes se guarda una copia automática.`,
    aceptar: "Recuperar",
  });
  if (!ok) return;
  if (!(await antesDeQuitarDias(datos.dias, "recuperar la copia"))) return;
  const copiaHecha = await guardarCopiaAuto(almacen.datos(), "antes de recuperar una copia", ahora());
  const deshacer = almacen.mutar(() => datos);
  ctx.aplicarTema(almacen.datos().ajustes.tema);
  ctx.repintar();
  avisarDeshacer(copiaHecha ? "Copia recuperada" : "Copia recuperada (sin copia automática previa)", deshacer, () => {
    ctx.aplicarTema(almacen.datos().ajustes.tema);
    ctx.repintar();
  });
}

// --- Datos de la versión normal ---

// «Volver a copiar»: primero se lee la normal, para enseñar en la confirmación qué marcas bajarían y dejar elegir
// quedarse con la más alta de las dos (marcado de serie).
async function recopiar() {
  const t = ahora();
  const r = await copiarDesdeNormal({ ahoraMs: t });
  if (!r.ok) {
    avisar({ texto: r.error, tipo: "error" });
    return;
  }
  const bajan = marcasQueBajan(almacen.datos(), r.datos);
  const casilla = bajan.length ? h("input", { type: "checkbox", class: "casilla-caja", id: "quedarse-maxima", checked: true }) : null;
  const contenido = bajan.length
    ? h("div", { class: "marcas-bajan" },
      h("p", { class: "hoja-texto" }, `Con la copia bajarían ${plural(bajan.length, "marca", "marcas")} de la beta:`),
      h("ul", { class: "lista-avisos" }, bajan.map((m) => h("li", null, `${m.nombre}: ${formatoKg(m.de)} → ${textoMarca(m.a)}`))),
      h("label", { class: "casilla", for: "quedarse-maxima" }, casilla, h("span", null, "Quedarme con la marca más alta de las dos")))
    : null;
  const ok = await confirmar({
    titulo: "Volver a copiar desde la versión normal",
    texto: "Cambia tu rutina, tus marcas y tus ajustes de la beta por los de la versión normal. Tu historial de la beta se queda. Antes se guarda una copia automática.",
    contenido,
    aceptar: "Copiar",
  });
  if (!ok) return;
  const quedarseMaxima = Boolean(casilla?.checked);
  if (!(await antesDeQuitarDias(r.datos.dias, "volver a copiar"))) return;
  const copiaHecha = await guardarCopiaAuto(almacen.datos(), "antes de volver a copiar desde la versión normal", t);
  const deshacer = almacen.mutar((d) => aplicarRecopia(d, r.datos, t, { quedarseMaxima }));
  apuntarCopiaNormal(r.huella, t);
  ctx.repintar();
  avisarDeshacer(copiaHecha ? "Rutina copiada de la versión normal" : "Rutina copiada de la versión normal (sin copia automática previa)", deshacer, () => ctx.repintar());
}

async function rutinaPublicada() {
  const ok = await confirmar({
    titulo: "Volver a la rutina publicada",
    texto: "Deja los días y ejercicios como en la rutina publicada. Conserva tus marcas y tu historial. Antes se guarda una copia automática.",
    aceptar: "Volver a la publicada",
  });
  if (!ok) return;
  let base;
  try {
    base = await cargarBase();
  } catch {
    avisar({ texto: "No se ha podido leer la rutina publicada. Comprueba la conexión y vuelve a intentarlo.", tipo: "error" });
    return;
  }
  if (!(await antesDeQuitarDias(base.rutina.days, "volver a la rutina publicada"))) return;
  const t = ahora();
  const copiaHecha = await guardarCopiaAuto(almacen.datos(), "antes de volver a la rutina publicada", t);
  const deshacer = almacen.mutar((d) => aplicarRutinaPublicada(d, base, t));
  ctx.repintar();
  avisarDeshacer(copiaHecha ? "Rutina publicada puesta" : "Rutina publicada puesta (sin copia automática previa)", deshacer, () => ctx.repintar());
}

// --- Beta ---

async function buscarActualizacion() {
  if (!ctx.version.buscar) {
    avisar({ texto: "Sin service worker no se puede buscar ahora. Recarga la página con conexión." });
    return;
  }
  avisar({ texto: "Buscando…" });
  const r = await ctx.version.buscar();
  if (r === "nueva") avisar({ texto: "Hay una versión nueva de la beta.", accion: "Recargar", alPulsar: () => ctx.version.recargar?.() });
  else if (r === "error") avisar({ texto: "No se ha podido buscar: comprueba la conexión." });
  else avisar({ texto: "Ya tienes la última versión" });
}

export function hojaNovedades() {
  const cuerpo = NOVEDADES.map((n) => h("section", { class: "novedad" },
    h("h3", { class: "tarjeta-titulo" }, `Versión ${n.version} · ${fechaConAnio(new Date(`${n.fecha}T12:00:00`).getTime())}`),
    h("ul", { class: "lista-novedades" }, n.cambios.map((c) => h("li", null, c)))));
  abrirHoja({ titulo: "Novedades de la beta", cuerpo, pie: [boton("Cerrar", "cerrar-hoja", { clase: "boton-principal boton-ancho" })] });
}

// Hoja de apuntes: se abre desde Ajustes y tocando «BETA» arriba, en cualquier pantalla. Cada apunte guarda la
// pantalla y, en Entreno, el día, el ejercicio abierto y la serie.
export function hojaApuntes() {
  if (!almacen.datos()) return;
  const pantallaAhora = ctx.pantalla();
  const contexto = pantallaAhora === "entreno" ? ctx.contextoApunte?.() || "" : "";
  const lista = h("ul", { class: "lista-filas lista-apuntes" });
  const pintarLista = () => {
    const apuntes = [...almacen.datos().apuntes].reverse();
    vaciar(lista);
    if (!apuntes.length) {
      lista.append(h("li", { class: "fila-simple" }, "Aún no hay apuntes."));
      return;
    }
    for (const a of apuntes) {
      lista.append(h("li", { class: "fila-con-boton" },
        h("span", { class: "fila-textos" },
          h("span", { class: "fila-datos" }, [`${diaMes(a.fecha)}, ${hora(a.fecha)}`, NOMBRES_PANTALLA[a.pantalla] || a.pantalla, a.version].filter(Boolean).join(" · ")),
          a.contexto ? h("span", { class: "fila-datos" }, a.contexto) : null,
          h("span", { class: "fila-titulo apunte-texto" }, a.texto)),
        h("button", { class: "boton-icono", type: "button", "data-accion": "borrar-apunte", "data-id": a.id, "aria-label": "Borrar este apunte" }, icono("papelera"))));
    }
  };
  const area = h("textarea", { class: "campo-texto campo-area", id: "apunte-nuevo", "data-campo": "apunte", maxlength: String(LIMITES.apunte), rows: "4" });
  const cuerpo = [
    h("div", { class: "campo" },
      h("label", { class: "campo-rotulo", for: "apunte-nuevo" }, "Qué ha fallado o qué se te ocurre"),
      area,
      h("p", { class: "ayuda" }, contexto
        ? `Se apunta también dónde estabas: ${NOMBRES_PANTALLA[pantallaAhora]} · ${contexto}.`
        : `Se apunta también dónde estabas: ${NOMBRES_PANTALLA[pantallaAhora] || pantallaAhora}. Va dentro de las copias.`),
      h("p", { class: "campo-error", id: "apunte-error" })),
    boton("Guardar apunte", "guardar-apunte", { clase: "boton-principal boton-ancho" }),
    h("h3", { class: "seccion-titulo" }, "Tus apuntes"),
    lista,
    boton("Copiar todo", "copiar-apuntes", { clase: "boton-secundario boton-ancho", ico: "copia" }),
  ];
  pintarLista();
  abrirHoja({
    titulo: "Apuntar un fallo o una idea",
    cuerpo,
    clase: "hoja-alta",
    alAccion: (accion, el) => {
      if (accion === "guardar-apunte") {
        const texto = recortar(area.value, LIMITES.apunte);
        const error = document.getElementById("apunte-error");
        if (!texto) {
          if (error) error.textContent = "Escribe algo antes de guardar.";
          return;
        }
        if (error) error.textContent = "";
        const t = ahora();
        const apunte = { id: idApunte(t), fecha: t, pantalla: pantallaAhora, version: VERSION, texto };
        if (contexto) apunte.contexto = contexto;
        almacen.mutar((d) => { d.apuntes.push(apunte); });
        area.value = "";
        pintarLista();
        avisar({ texto: "Apunte guardado" });
      } else if (accion === "borrar-apunte") {
        const id = el.dataset.id;
        const deshacer = almacen.mutar((d) => { d.apuntes = d.apuntes.filter((a) => a.id !== id); });
        pintarLista();
        avisarDeshacer("Apunte borrado", deshacer, () => pintarLista());
      } else if (accion === "copiar-apuntes") {
        const texto = almacen.datos().apuntes.map((a) => [
          [`${diaMes(a.fecha)} ${hora(a.fecha)}`, NOMBRES_PANTALLA[a.pantalla] || a.pantalla, a.version].filter(Boolean).join(" · "),
          a.contexto || null,
          a.texto,
        ].filter(Boolean).join("\n")).join("\n\n");
        if (!texto) {
          avisar({ texto: "No hay apuntes que copiar." });
          return;
        }
        Promise.resolve(navigator.clipboard?.writeText(texto))
          .then(() => avisar({ texto: "Apuntes copiados" }))
          .catch(() => avisar({ texto: "No se han podido copiar. Guarda una copia: los apuntes van dentro." }));
      }
    },
  });
}

// --- Zona peligrosa ---

// Dos pasos. En el segundo, «Borrar todo» va a la izquierda: un doble toque en «Seguir» (a la derecha) cae en
// «Cancelar». Además, una hoja recién abierta no hace caso a los toques de los primeros 400 ms (avisos.js).
async function borrarTodo() {
  const seguir = await confirmar({
    titulo: "Borrar todos los datos de la beta",
    texto: "Borra la rutina, el historial y los ajustes de la beta en este móvil. La versión normal no se toca. Las copias automáticas se conservan.",
    aceptar: "Seguir",
    peligro: true,
  });
  if (!seguir) return;
  const borrar = await confirmar({
    titulo: "¿Borrar ahora?",
    texto: "Esto no se puede deshacer desde aquí. Antes se guarda una copia automática, que puedes recuperar luego.",
    aceptar: "Borrar todo",
    peligro: true,
    invertir: true,
  });
  if (!borrar) return;
  await guardarCopiaAuto(almacen.datos(), "antes de borrar todo", ahora());
  cerrarAviso();
  descanso.saltar();
  almacen.borrarTodoBeta();
  // Para que la pantalla de la primera vez ofrezca recuperar lo de antes de borrar.
  almacen.cambiarUi((u) => { u.borradoEn = ahora(); });
  location.reload();
}

export { copiasAutoFuncionan };
