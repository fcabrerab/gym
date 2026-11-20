// Arranque de la app: lee los datos (o los copia de la versión vieja la primera vez), rescata los dañados, monta la
// barra de descanso, los avisos y la navegación inferior, lleva las rutas por hash y el botón Atrás (salir de Rutina
// con cambios sin guardar pregunta antes: D-123), el tema y el service worker (con la mudanza desde la beta: D-121). Es
// el ÚNICO módulo que hace algo al importarse: los demás solo declaran funciones.

import { VERSION } from "./version.js";
import * as almacen from "./almacen.js";
import * as borrador from "./borrador.js";
import * as descanso from "./descanso.js";
import * as avisosPc from "./avisos-pc.js";
import * as copiaPc from "./copia-pc.js";
import * as beta from "./beta.js";
import { copiarDesdeNormal, leerTemaNormal } from "./normal.js";
import { guardarCopiaAuto, listarCopiasAuto } from "./copias.js";
import { diaPorId } from "./modelo.js";
import { abandonada } from "./sesion.js";
import { ahora, parametroLocal, esLocal, esBeta, fechaLocal, diaMes, hora } from "./util.js";
import { h, vaciar } from "./ui/dom.js";
import {
  montarAvisos, avisar, cerrarAvisoDeshacer, confirmar, anunciar, alVolverAtras, alPulsarTecla, hojaAbierta, alCerrarseLasHojas, hayAvisoDeshacer,
} from "./ui/avisos.js";
import { ctx } from "./ui/contexto.js";
import { ayuda } from "./ui/piezas.js";
import {
  pintarEntreno, salirEntreno, alAccionEntreno, alCampoEntreno, alSoltarCampoEntreno, montarBarra, mostrarCapa, reiniciarEntreno,
  actualizarEntreno, contextoApunte, accionBarra,
} from "./ui/entreno.js";
import { pintarHistorial, alAccionHistorial, vistaHistorialGuardada } from "./ui/historial.js";
import { pintarRutina, alAccionRutina, alCampoRutina, actualizarBarra, resolverBorrador } from "./ui/rutina.js";
import {
  pintarAjustes, alAccionAjustes, alCampoAjustes, hojaNovedades, hojaApuntes, datosDeCopiaAuto, pedirPermisoNotificaciones,
  repintarAvisosPc, repintarCopiaPc,
} from "./ui/ajustes.js";
import * as arranque from "./ui/arranque.js";
import { montarBrillo } from "./ui/brillo.js";
import { pintarPaginaMascota } from "./ui/mascota.js";
import * as memoriaMascota from "./mascota/memoria.js";

const raiz = document.documentElement;
// Para js/vigia.js: los módulos han llegado (si no llegan, el vigía lo dice en vez de dejar «Cargando…»).
raiz.dataset.modulos = "1";

const pantalla = document.getElementById("pantalla");
const nav = document.getElementById("nav");
const filaDias = document.getElementById("fila-dias");
const cabecera = document.getElementById("cabecera");

let modo = "arranque"; // «arranque» (primera vez y errores) o «app»
let rutaActual = null;
let repintarPendiente = false;
let swRegistrado = false;
let textoDanado = null;
let destinoPendiente = null; // pestaña a la que ir cuando acabe el history.go() de volver desde un detalle
let enlaceAvisosPc = null; // se abrió con «#avisos-pc=…» (el enlace de la página de avisos del PC): «puesta» o «activa»
let ultimoLugar = null; // {hash, estado} de la última pantalla pintada: Atrás desde Rutina con cambios vuelve ahí y pregunta
let preguntandoSalir = false;

// --- Errores (para las pruebas y para entender fallos) ---

const errores = [];
window.addEventListener("error", (ev) => {
  errores.push({ tipo: "error", mensaje: String(ev.message || ev.error || "error"), fuente: ev.filename || "", linea: ev.lineno || 0, t: Date.now() });
});
window.addEventListener("unhandledrejection", (ev) => {
  errores.push({ tipo: "promesa", mensaje: String(ev.reason?.message || ev.reason || "promesa rechazada"), t: Date.now() });
});
if (esLocal()) window.__gymBeta = { errores, version: VERSION };

// --- Tema ---

const mqOscuro = window.matchMedia("(prefers-color-scheme: dark)");

function aplicarTema(tema = "auto") {
  const resuelto = tema === "claro" ? "claro" : tema === "oscuro" ? "oscuro" : (mqOscuro.matches ? "oscuro" : "claro");
  raiz.dataset.tema = resuelto;
  raiz.dataset.temaElegido = tema;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const oscuroMeta = (m.getAttribute("media") || "").includes("dark");
    const usarOscuro = tema === "auto" ? oscuroMeta : resuelto === "oscuro";
    m.setAttribute("content", usarOscuro ? "#131c2e" : "#ffffff");
  }
}

// --- Rutas ---

const RUTAS = [
  [/^#\/entreno$/, "entreno", "entreno"],
  [/^#\/historial$/, "historial", "historial"],
  [/^#\/historial\/ejercicios$/, "historial-ejercicios", "historial"],
  [/^#\/historial\/sesion\/(.+)$/, "sesion", "historial"],
  [/^#\/historial\/ejercicio\/(.+)$/, "ejercicio", "historial"],
  [/^#\/rutina$/, "rutina", "rutina"],
  [/^#\/rutina\/dia\/(.+)$/, "dia", "rutina"],
  [/^#\/ajustes$/, "ajustes", "ajustes"],
  [/^#\/ajustes\/mascota$/, "mascota", "ajustes"],
];

function leerRuta(hash) {
  for (const [re, nombre, tab] of RUTAS) {
    const m = String(hash || "").match(re);
    if (m) {
      let param = null;
      try {
        param = m[1] != null ? decodeURIComponent(m[1]) : null;
      } catch {
        param = m[1];
      }
      return { nombre, tab, param };
    }
  }
  return { nombre: "entreno", tab: "entreno", param: null };
}

// Detalles y pestañas: los detalles añaden una entrada al historial (Atrás vuelve); entre pestañas que no son
// Entreno se reemplaza (así Atrás vuelve a Entreno y, desde Entreno, cierra la app).
function irA(hash, modoHistorial = "push") {
  const nueva = leerRuta(hash);
  const nivel = history.state?.nivel ?? 0;
  if (nueva.nombre === "entreno") {
    if (nivel > 0) {
      history.go(-nivel);
      return;
    }
    history.replaceState({ nivel: 0 }, "", "#/entreno");
  } else if (modoHistorial === "replace") {
    history.replaceState({ nivel: Math.max(1, nivel) }, "", hash);
  } else {
    history.pushState({ nivel: nivel + 1 }, "", hash);
  }
  pintarRuta({ arriba: true });
}

// Salir de Rutina con cambios sin guardar: antes se pregunta «Guardar», «Descartar» o «Seguir editando» (D-123); si ya
// no quedan (guardados o descartados), se sigue con «despues».
function salirDeRutina(despues) {
  if (preguntandoSalir) return;
  preguntandoSalir = true;
  resolverBorrador().then((ok) => {
    preguntandoSalir = false;
    if (ok) despues();
  }, () => { preguntandoSalir = false; });
}

function irAPestana(tab) {
  if (rutaActual?.tab === "rutina" && tab !== "rutina" && borrador.hay()) {
    salirDeRutina(() => irAPestana(tab));
    return;
  }
  const actual = leerRuta(location.hash);
  const nivel = history.state?.nivel ?? 0;
  if (tab === "entreno") {
    if (actual.nombre === "entreno") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (nivel > 0) history.go(-nivel);
    else {
      history.replaceState({ nivel: 0 }, "", "#/entreno");
      pintarRuta({ arriba: true });
    }
    return;
  }
  const destino = tab === "historial" ? vistaHistorialGuardada() : `#/${tab}`;
  if (actual.tab === tab && actual.nombre === leerRuta(destino).nombre) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (actual.nombre === "entreno") {
    history.pushState({ nivel: 1 }, "", destino);
  } else if (nivel > 1) {
    // Desde un detalle (nivel 2 o más): primero se vuelve al nivel 1 y allí se cambia de pestaña. Así, después,
    // un solo Atrás vuelve a Entreno.
    destinoPendiente = destino;
    history.go(-(nivel - 1));
    return;
  } else {
    history.replaceState({ nivel: Math.max(1, nivel) }, "", destino);
  }
  pintarRuta({ arriba: true });
}

function pintarRuta({ arriba = false } = {}) {
  if (modo !== "app") return;
  const ruta = leerRuta(location.hash);
  const primera = !rutaActual;
  if (rutaActual?.tab === "entreno" && ruta.tab !== "entreno") salirEntreno();
  const cambia = !rutaActual || rutaActual.nombre !== ruta.nombre || rutaActual.param !== ruta.param;
  rutaActual = ruta;
  for (const b of nav.querySelectorAll("[data-accion^='ir-']")) {
    const activo = b.dataset.accion === `ir-${ruta.tab}`;
    b.classList.toggle("activo", activo);
    if (activo) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
  filaDias.hidden = ruta.tab !== "entreno";
  document.body.dataset.pantalla = ruta.tab;
  let desplazado = false;
  try {
    switch (ruta.tab) {
      case "historial": pintarHistorial(pantalla, ruta); break;
      case "rutina": pintarRutina(pantalla, ruta); break;
      case "ajustes":
        if (ruta.nombre === "mascota") pintarPaginaMascota(pantalla);
        else pintarAjustes(pantalla);
        break;
      default: desplazado = pintarEntreno(pantalla, { desplazar: arriba || primera });
    }
  } catch (err) {
    // Una pantalla que no se puede pintar no deja la anterior a la vista: se dice y se apunta el fallo.
    errores.push({ tipo: "pantalla", mensaje: `${ruta.nombre}: ${String(err?.message || err)}`, t: Date.now() });
    filaDias.hidden = true;
    arranque.pintarErrorPantalla(pantalla, { enEntreno: ruta.tab === "entreno" });
  }
  ultimoLugar = { hash: location.hash, estado: history.state };
  actualizarBarra();
  if (arriba && cambia && !desplazado) window.scrollTo(0, 0);
}

// Repinta la pantalla actual; si hay una hoja abierta, espera a que se cierre (para no borrar lo que se escribe).
function repintar() {
  if (modo !== "app") return;
  if (hojaAbierta()) {
    repintarPendiente = true;
    return;
  }
  repintarPendiente = false;
  pintarRuta();
}

// --- Eventos delegados ---

function despachar(accion, el, ev) {
  if (modo === "arranque") return accionArranque(accion, el);
  if (accion === "error-volver") return irAPestana("entreno");
  if (accion === "error-ajustes") return irAPestana("ajustes");
  switch (rutaActual?.tab) {
    case "historial": return alAccionHistorial(accion, el, ev);
    case "rutina": return alAccionRutina(accion, el, ev);
    case "ajustes": return alAccionAjustes(accion, el, ev);
    default: return alAccionEntreno(accion, el, ev);
  }
}

function alCampo(ev) {
  if (modo !== "app") return;
  switch (rutaActual?.tab) {
    case "rutina": return alCampoRutina(ev);
    case "ajustes": return alCampoAjustes(ev);
    case "entreno": return alCampoEntreno(ev);
    default: return undefined;
  }
}

// Intro en un campo de −/+: pasa al campo siguiente del mismo grupo (de Peso a Repeticiones) o, en el último, cierra
// el teclado (y en Entreno deja el ✓ a la vista). Nunca apunta la serie.
function alPulsarIntro(ev) {
  if (ev.key !== "Enter" || ev.isComposing || !ev.target?.classList?.contains("control-campo")) return;
  ev.preventDefault();
  const grupo = ev.target.closest(".controles") || ev.target.closest(".hoja-cuerpo") || ev.target.parentElement;
  const campos = [...grupo.querySelectorAll(".control-campo")];
  const siguiente = campos[campos.indexOf(ev.target) + 1];
  if (siguiente) {
    siguiente.focus();
    siguiente.select?.();
    return;
  }
  ev.target.blur();
  if (modo === "app" && rutaActual?.tab === "entreno") alSoltarCampoEntreno(ev.target);
}

function conectarEventos() {
  pantalla.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-accion]");
    if (!el || !pantalla.contains(el) || el.disabled) return;
    if (el.tagName === "A" && el.getAttribute("href")) return;
    despachar(el.dataset.accion, el, ev);
  });
  pantalla.addEventListener("input", alCampo);
  pantalla.addEventListener("change", alCampo);
  pantalla.addEventListener("submit", (ev) => ev.preventDefault());
  // Los −/+ no se quedan el foco: si se estaba escribiendo en un campo, el teclado sigue abierto.
  // Y con una sesión o un descanso en marcha, el primer toque prepara el sonido (por si se recargó a mitad) y, con
  // «Descanso con sonido», pone el sonido de fondo si al abrir la app el navegador no lo dejó.
  document.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest?.(".boton-paso")) ev.preventDefault();
    if (!descanso.audioPreparado() && (descanso.idActual() || almacen.leerSesion())) descanso.prepararAudio();
    descanso.alTocarPantalla();
  });
  filaDias.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-accion]");
    if (el && modo === "app") alAccionEntreno(el.dataset.accion, el, ev);
  });
  nav.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-accion^='ir-']");
    if (el && modo === "app") irAPestana(el.dataset.accion.slice(3));
  });
  // El lápiz (antes, «BETA»), arriba en todas las pantallas: apuntar un fallo o una idea al momento, con dónde se estaba.
  document.getElementById("boton-beta")?.addEventListener("click", () => {
    if (modo === "app" && almacen.datos()) hojaApuntes();
    else avisar({ texto: "Para apuntar un fallo o una idea, espera a que se abra la app." });
  });
  window.addEventListener("popstate", () => {
    if (alVolverAtras()) return;
    if (destinoPendiente) {
      const destino = destinoPendiente;
      destinoPendiente = null;
      history.replaceState({ nivel: 1 }, "", destino);
    }
    if (modo !== "app") return;
    // Atrás saliendo de Rutina con cambios sin guardar: se vuelve a poner Rutina, donde estaba, y se pregunta; si
    // ya no quedan cambios, Atrás otra vez (D-123).
    if (rutaActual?.tab === "rutina" && leerRuta(location.hash).tab !== "rutina" && borrador.hay() && ultimoLugar) {
      try {
        history.pushState(ultimoLugar.estado, "", ultimoLugar.hash);
      } catch {
        // Sin historial (raro): se pregunta igual.
      }
      salirDeRutina(() => history.back());
      return;
    }
    pintarRuta({ arriba: true });
  });
  document.addEventListener("keydown", (ev) => {
    alPulsarTecla(ev);
    alPulsarIntro(ev);
  });
  document.addEventListener("visibilitychange", () => {
    descanso.alCambiarVisibilidad();
    if (document.visibilityState === "visible" && modo === "app" && rutaActual?.tab === "entreno") actualizarEntreno();
    // Al volver a la app: si el PC no tiene lo último (p. ej., no respondía al acabar el entreno), se le manda.
    if (document.visibilityState === "visible" && modo === "app") copiaPc.alAbrir();
  });
  mqOscuro.addEventListener?.("change", () => aplicarTema(raiz.dataset.temaElegido || "auto"));
  // El alto real de la cabecera (cambia al esconder la fila de días): lo usan los avisos de arriba y los desplazamientos.
  if (cabecera && typeof ResizeObserver === "function") {
    new ResizeObserver(() => raiz.style.setProperty("--alto-cabecera-real", `${cabecera.offsetHeight}px`)).observe(cabecera);
  }
  alCerrarseLasHojas(() => {
    if (repintarPendiente) repintar();
  });
}

// --- Cambios del almacenamiento ---

let avisoCuota = null;
function alCambioAlmacen(e) {
  if (e.tipo === "cuota") {
    if (!avisoCuota) {
      avisoCuota = avisar({
        texto: "No se ha podido guardar: el almacenamiento del navegador está lleno. Guarda una copia en Ajustes y apunta el fallo.",
        fijo: true,
        tipo: "error",
      });
      setTimeout(() => { avisoCuota = null; }, 30000);
    }
    return;
  }
  if (e.tipo === "nuevo") {
    avisar({ texto: "Hay datos de una versión más nueva de la app (de otra ventana). Recarga para actualizar.", accion: "Recargar", alPulsar: () => location.reload(), fijo: true });
    return;
  }
  // Un «Deshacer» a la vista ya no se refiere a lo último que ha cambiado: se quita (y si se pulsara, no restauraría
  // nada porque almacen.js comprueba la revisión).
  if (e.tipo === "datos" || e.tipo === "otra-ventana") cerrarAvisoDeshacer();
  if (modo !== "app") return;
  if (e.tipo === "otra-ventana") {
    avisar({ texto: "Datos actualizados desde otra ventana" });
    aplicarTema(almacen.datos().ajustes.tema);
    repintar();
  } else if (e.tipo === "sesion" && e.fuera) {
    descanso.actualizarPantalla();
    if (rutaActual?.tab === "entreno") repintar();
  } else if (e.tipo === "descanso" && e.fuera) {
    descanso.recargarDesdeFuera();
  } else if (e.tipo === "borrador" && e.fuera) {
    // Otra ventana cambió los cambios de Rutina sin guardar: se vuelve a pintar (salvo mientras se escribe en un campo).
    const activo = document.activeElement;
    const escribiendo = pantalla.contains(activo) && /^(INPUT|TEXTAREA)$/.test(activo?.tagName || "");
    if (!escribiendo && ["rutina", "entreno"].includes(rutaActual?.tab)) repintar();
    else actualizarBarra();
  }
}

// --- Arranque ---

// La beta (D-124) lo dice arriba, junto al nombre, con un enlace a la app normal (la carpeta de arriba).
function marcarBeta() {
  if (!esBeta()) {
    // La app normal: si hay una beta más nueva en beta/, lo dice arriba, con un enlace a ella (D-134).
    beta.buscar().then((b) => {
      if (!b || document.querySelector(".marca-beta")) return;
      document.querySelector(".marca")?.append(h("a", {
        class: "marca-beta marca-ir-beta", href: "./beta/", title: `Hay una beta, la ${b.version}: toca para probarla`, "aria-label": `Hay una beta, la ${b.version}. Ir a la beta`,
      }, "BETA ›"));
      if (modo === "app" && rutaActual?.tab === "ajustes") repintar();
    });
    return;
  }
  document.title = "Gym Beta";
  document.documentElement.dataset.canal = "beta";
  document.querySelector(".marca")?.append(h("a", {
    class: "marca-beta", href: "../", title: "Estás en la beta: toca para ir a la app normal", "aria-label": "Beta. Ir a la app normal",
  }, "BETA"));
}

// Solo cuenta una sesión que sigue viva: no abandonada y de un día que existe.
function haySesionViva() {
  const s = almacen.leerSesion();
  const datos = almacen.datos();
  return Boolean(s) && !abandonada(s, ahora()) && Boolean(datos && diaPorId(datos, s.diaId));
}

// Lo que la mascota lee de tus entrenos, para su cuerpo (D-133, la fase 2): una copia (nunca los de verdad) de tu
// rutina, tus sesiones, la biblioteca (el grupo de cada ejercicio) y la sesión en marcha.
function entrenosParaLaMascota() {
  const d = almacen.datos();
  if (!d) return null;
  return structuredClone({ dias: d.dias, sesiones: d.sesiones, ejercicios: d.ejercicios, enCurso: almacen.leerSesion() });
}

// La mascota (D-133): aparte, cargada cuando la app ya ha arrancado y solo si está encendida (en la beta, de entrada).
// Si algo suyo falla, la app sigue igual (y se apunta). Se llama otra vez al cambiar sus ajustes: entonces llega, se
// pone al día o se va; con «renacer» (al cargar una copia que trae su ficha), vuelve a nacer.
let mascota = null;
let cargandoMascota = false;
function arrancarMascota({ renacer = false } = {}) {
  if (modo !== "app") return;
  if (mascota) {
    mascota.aplicar({ renacer });
    return;
  }
  if (cargandoMascota || !memoriaMascota.encendida(memoriaMascota.leer(), { beta: esBeta() })) return;
  cargandoMascota = true;
  import("./mascota/mascota.js")
    .then((m) => {
      mascota = m;
      m.iniciar({ haySesion: haySesionViva, descanso: () => descanso.estadoDescanso(), entrenos: entrenosParaLaMascota });
    })
    .catch((err) => errores.push({ tipo: "mascota", mensaje: String(err?.message || err), t: Date.now() }))
    .finally(() => { cargandoMascota = false; });
}

function montar() {
  marcarBeta();
  ctx.irA = irA;
  ctx.mascota = arrancarMascota;
  ctx.entrenosMascota = entrenosParaLaMascota;
  ctx.repintar = repintar;
  ctx.aplicarTema = aplicarTema;
  ctx.pantalla = () => rutaActual?.tab ?? "entreno";
  ctx.contextoApunte = contextoApunte;
  ctx.version.controlaElSw = () => navigator.serviceWorker?.controller?.scriptURL === new URL("./sw.js", location.href).href;
  montarAvisos(document.getElementById("avisos"), document.getElementById("anuncios"));
  descanso.configurarDescanso({
    ajustes: () => almacen.datos()?.ajustes || {},
    haySesion: haySesionViva,
    anunciar,
    mostrarCapa,
    // Un aviso que puede esperar (el del sonido de fondo) no tapa el «Deshacer» de la serie recién apuntada: sale
    // cuando ese se va.
    avisar: avisarLuego,
    accion: accionBarra,
  });
  avisosPc.configurarAvisosPc({
    avisar: avisarLuego,
    alCambiar: () => {
      if (modo === "app" && rutaActual?.tab === "ajustes") {
        repintarAvisosPc();
        repintarCopiaPc(); // usa la misma dirección del PC
      }
    },
  });
  copiaPc.configurarCopiaPc({
    avisar: avisarLuego,
    alCambiar: () => {
      if (modo === "app" && rutaActual?.tab === "ajustes") repintarCopiaPc();
    },
  });
  montarBarra(document.getElementById("barra-descanso"), document.getElementById("capa-fin"));
  almacen.escucharOtrasVentanas();
  almacen.alCambiar(alCambioAlmacen);
  // Cada cambio de Rutina sin guardar: un «Deshacer» a la vista ya no es lo último (se quita) y la barra se pone al día.
  borrador.alCambiar(() => {
    cerrarAvisoDeshacer();
    actualizarBarra();
  });
  conectarEventos();
  // Después de conectarEventos: la vuelta de luz se pone cuando la app ya ha hecho lo suyo con el toque.
  montarBrillo();
}

// Un aviso que puede esperar no tapa el «Deshacer» de la serie recién apuntada: sale cuando ese se va.
function avisarLuego(texto) {
  const intentar = () => (hayAvisoDeshacer() ? setTimeout(intentar, 1000) : avisar({ texto }));
  intentar();
}

function listo(valor = "1") {
  raiz.dataset.listo = valor;
}

function iniciarApp(avisos = []) {
  modo = "app";
  document.body.classList.remove("arrancando");
  aplicarTema(almacen.datos().ajustes.tema);
  // Si la sesión en curso ya está en el historial (se cortó entre los dos pasos de terminar), se quita.
  const s = almacen.leerSesion();
  if (s && almacen.datos().sesiones.some((x) => x.id === s.id)) almacen.borrarSesion();
  descanso.restaurarDescanso();
  descanso.actualizarPantalla();
  reiniciarEntreno();
  rutaActual = null;
  history.replaceState({ nivel: 0 }, "", "#/entreno");
  pintarRuta();
  listo("1");
  arrancarMascota();
  if (avisos.length) avisar({ texto: avisos.join(" ") });
  avisoVersion();
  registrarSW();
  // La copia en el PC: si no tiene lo último, se le manda a los pocos segundos (sin estorbar al arranque).
  setTimeout(() => {
    if (modo === "app") copiaPc.alAbrir();
  }, copiaPc.AL_ABRIR_MS);
  if (enlaceAvisosPc) {
    // Con el enlace de la página de avisos del PC: a Ajustes, con la dirección ya puesta (falta tocar «Activar»).
    const yaActivos = enlaceAvisosPc === "activa";
    enlaceAvisosPc = null;
    irAPestana("ajustes");
    document.getElementById("avisos-pc")?.scrollIntoView?.({ block: "center" });
    avisar({ texto: yaActivos ? "Los avisos desde el PC ya están activos con ese PC." : "Dirección del PC puesta: toca «Activar» en «Avisos desde el PC»." });
  }
}

// La versión que se había visto antes de este arranque (para la mudanza: si la página se recarga enseguida, el aviso de
// «App actualizada» sale después de recargar, no justo antes).
let versionVistaAntes = null;

// La versión vista se apunta en gym-beta-ui; la beta, aparte (versionVistaBeta), para que al ir de una a otra no salga
// cada vez «actualizada» (D-124).
const CAMPO_VERSION = () => (esBeta() ? "versionVistaBeta" : "versionVista");

function avisoVersion() {
  const ui = almacen.leerUi();
  const campo = CAMPO_VERSION();
  versionVistaAntes = ui[campo];
  if (!ui[campo]) {
    almacen.cambiarUi((u) => { u[campo] = VERSION; });
    return;
  }
  if (ui[campo] !== VERSION) {
    almacen.cambiarUi((u) => { u[campo] = VERSION; });
    avisar({ texto: `${esBeta() ? "Beta" : "App"} actualizada a la ${VERSION}`, accion: "Novedades", alPulsar: () => hojaNovedades() });
  }
}

const permisoActual = () => (typeof Notification === "undefined" ? "no-existe" : Notification.permission);

async function primeraVez() {
  modo = "arranque";
  delete raiz.dataset.listo;
  document.body.classList.add("arrancando");
  arranque.pintarPreparando(pantalla);
  const t = ahora();
  const r = await copiarDesdeNormal({ ahoraMs: t });
  if (!r.ok) {
    arranque.pintarErrorRed(pantalla, r.error);
    listo("error");
    registrarSW();
    return;
  }
  const borradoEn = almacen.leerUi().borradoEn;
  if (!almacen.ponerDatos(r.datos)) {
    arranque.pintarErrorRed(pantalla, "No se ha podido guardar: el almacenamiento del navegador está lleno.");
    listo("error");
    return;
  }
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    // Sin almacenamiento persistente: los datos siguen guardados igual.
  }
  almacen.cambiarUi((u) => {
    u[CAMPO_VERSION()] = VERSION;
    delete u.borradoEn;
  });
  aplicarTema(r.datos.ajustes.tema);
  const borrado = Number.isFinite(borradoEn) && t - borradoEn < 86400000;
  arranque.pintarPrimeraVez(pantalla, r, { permiso: permisoActual(), borrado });
  listo("1");
  registrarSW();
}

function pantallaDanados(texto) {
  modo = "arranque";
  textoDanado = texto;
  document.body.classList.add("arrancando");
  almacen.guardarRescate(texto, ahora());
  arranque.pintarDanados(pantalla);
  listo("error");
  registrarSW();
}

async function recuperarCopiaAuto(id, texto) {
  const leida = await datosDeCopiaAuto(id);
  if (!leida) return avisar({ texto: "Esa copia no se puede leer.", tipo: "error" });
  const ok = await confirmar({ titulo: "Recuperar esta copia", texto, aceptar: "Recuperar" });
  if (!ok) return undefined;
  almacen.ponerDatos(leida.datos);
  return iniciarApp(["Copia recuperada."]);
}

async function accionArranque(accion, el) {
  switch (accion) {
    case "empezar": return iniciarApp();
    case "reintentar": return primeraVez();
    case "recargar": return location.reload();
    case "permitir-avisos":
      return pedirPermisoNotificaciones().then((p) => arranque.pintarPermisoPedido(p));
    case "recuperar-borrado": {
      let lista = [];
      try {
        lista = await listarCopiasAuto();
      } catch {
        lista = [];
      }
      const copia = lista.find((c) => c.motivo === "antes de borrar todo");
      if (!copia) return avisar({ texto: "No hay ninguna copia automática de antes de borrar." });
      return recuperarCopiaAuto(copia.id, `¿Recuperar los datos de antes de borrar (${diaMes(copia.fecha)}, ${hora(copia.fecha)})? Se sustituye la rutina con la que se acaba de empezar.`);
    }
    case "descargar-danados": {
      const d = new Date(ahora());
      const dos = (n) => String(n).padStart(2, "0");
      const nombre = `gym-datos-danados-${fechaLocal(d.getTime())}-${dos(d.getHours())}${dos(d.getMinutes())}.json`;
      const url = URL.createObjectURL(new Blob([textoDanado ?? ""], { type: "application/json" }));
      const a = h("a", { href: url, download: nombre, hidden: true });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return avisar({ texto: `Descargado: ${nombre}` });
    }
    case "buscar-copias-danados": {
      const zona = document.getElementById("copias-danados");
      if (!zona) return undefined;
      vaciar(zona).append(ayuda("Buscando…"));
      try {
        const lista = await listarCopiasAuto();
        if (!lista.length) return vaciar(zona).append(ayuda("No hay copias automáticas en este móvil."));
        return vaciar(zona).append(h("ul", { class: "lista-filas" }, lista.map((c) => h("li", { class: "fila-con-boton" },
          h("span", { class: "fila-textos" }, h("span", { class: "fila-titulo" }, `${diaMes(c.fecha)}, ${hora(c.fecha)} · ${c.motivo}`), h("span", { class: "fila-datos" }, c.resumen)),
          h("button", { class: "boton boton-secundario boton-corto", type: "button", "data-accion": "recuperar-danado", "data-id": String(c.id) }, "Recuperar")))));
      } catch {
        return vaciar(zona).append(ayuda("Las copias automáticas no funcionan en este navegador."));
      }
    }
    case "recuperar-danado":
      return recuperarCopiaAuto(Number(el.dataset.id), "Tus datos dañados ya están guardados aparte. ¿Recuperar esta copia automática?");
    case "empezar-de-nuevo": {
      const ok = await confirmar({
        titulo: "Empezar de nuevo",
        texto: "Se empieza otra vez con la rutina de la versión vieja (o la publicada, si no hay). Tus datos dañados ya están guardados aparte.",
        aceptar: "Empezar de nuevo",
        peligro: true,
      });
      if (!ok) return undefined;
      return primeraVez();
    }
    default: return undefined;
  }
}

// --- La mudanza de la beta a la dirección de siempre (D-121) ---

// La primera vez que se abre la app aquí puede mandar todavía el service worker de la app vieja (si quedan sus
// cachés gym-pwa-…): ha dado el HTML nuevo, pero el resto lo da de su caché. sw.js lo sustituye sin esperar.
async function hayAppVieja() {
  try {
    return (await caches.keys()).some((n) => n.startsWith("gym-pwa-"));
  } catch {
    return false;
  }
}

// El service worker de la beta vieja (alcance …/beta/) ya no hace falta: se le quita su suscripción de avisos (los
// avisos desde el PC se piden ya con el de aquí: avisos-pc.js la crea sola en el próximo descanso) y se da de baja.
// Sus cachés las borra sw.js al activarse. Devuelve cuántos ha quitado.
async function quitarBetaVieja() {
  let quitados = 0;
  try {
    const alcance = new URL("./beta/", location.href).href;
    for (const reg of await navigator.serviceWorker.getRegistrations()) {
      if (reg.scope !== alcance) continue;
      const suscripcion = await Promise.resolve(reg.pushManager?.getSubscription()).catch(() => null);
      await suscripcion?.unsubscribe().catch(() => {});
      if (await reg.unregister().catch(() => false)) quitados += 1;
    }
  } catch {
    // Sin service workers no hay nada que quitar.
  }
  return quitados;
}

// --- Service worker y aviso de versión nueva ---

function registrarSW() {
  if (swRegistrado) return;
  swRegistrado = true;
  if (!("serviceWorker" in navigator) || parametroLocal("sinsw") !== null) return;
  // El aviso del PC llegó con la app a la vista (sw.js no saca notificación): la cuenta se pone al día por si iba tarde.
  navigator.serviceWorker.addEventListener("message", (ev) => {
    if (ev.data?.tipo === "aviso-pc") descanso.ponerAlDia();
  });
  navigator.serviceWorker.startMessages?.();
  // La beta (D-124) no registra service worker: la lleva el de la app normal (su alcance, la carpeta de arriba, la cubre), que deja
  // pasar sus archivos a la red sin guardarlos. Uno propio borraría las cachés de la normal al activarse (y la normal
  // quita los de beta/). Sus avisos y notificaciones van por el registro de la normal.
  if (esBeta()) return;
  let pedidoRecargar = false;
  let mudanza = false;
  let recargando = false;
  // En la mudanza (quedan cachés de la app vieja), al tomar el control el service worker nuevo se recarga una vez,
  // para tener la app entera con él.
  hayAppVieja().then((vieja) => {
    if (vieja) {
      mudanza = true;
      pedidoRecargar = true;
    }
  });
  quitarBetaVieja();
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Solo se recarga tras pulsar «Recargar» o en la mudanza; el cambio de la primera visita no recarga.
    if (pedidoRecargar && !recargando) {
      recargando = true;
      // En la mudanza, el aviso de «App actualizada» (con sus novedades) se deja para después de recargar.
      if (mudanza && versionVistaAntes && versionVistaAntes !== VERSION) {
        almacen.cambiarUi((u) => { u.versionVista = versionVistaAntes; });
      }
      location.reload();
    }
  });
  const marcarNueva = (sw) => {
    ctx.version.nueva = true;
    ctx.version.esperando = sw;
    if (modo === "app" && rutaActual?.tab === "entreno") actualizarEntreno();
  };
  navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).then((reg) => {
    if (reg.waiting && reg.active) marcarNueva(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const habiaActivo = Boolean(reg.active);
      const nuevo = reg.installing;
      if (!habiaActivo || !nuevo) return;
      nuevo.addEventListener("statechange", () => {
        if (nuevo.state === "installed") marcarNueva(nuevo);
      });
    });
    ctx.version.recargar = () => {
      const sw = reg.waiting || ctx.version.esperando;
      if (sw) {
        pedidoRecargar = true;
        sw.postMessage({ tipo: "activar" });
      } else {
        location.reload();
      }
    };
    ctx.version.buscar = async () => {
      try {
        await reg.update();
      } catch {
        return "error";
      }
      return reg.waiting || reg.installing ? "nueva" : "al-dia";
    };
    if (reg.active && navigator.onLine !== false) {
      reg.active.postMessage({ tipo: "comprobar" });
      const datos = almacen.datos();
      if (datos) {
        const urls = [...new Set(Object.values(datos.ejercicios).map((x) => x.image).filter((u) => /^https?:\/\//.test(u)))];
        if (urls.length) reg.active.postMessage({ tipo: "precargar-imagenes", urls });
      }
    }
  }).catch(() => {
    // Sin service worker la app funciona igual (solo con conexión).
  });
}

// El index.html y este JavaScript tienen que ser de la misma versión. Si no lo son (justo después de publicar una
// nueva, el HTML puede llegar de la red y los módulos de la caché vieja), no se arranca a medias: se activa la
// versión nueva y se recarga (o se ofrece «Recargar»).
function arrancarDesfase() {
  document.body.classList.add("arrancando");
  const zona = pantalla || document.body;
  arranque.pintarDesfase(zona);
  zona.addEventListener("click", (ev) => {
    if (ev.target.closest?.('[data-accion="recargar"]')) location.reload();
  });
  listo("error");
  if (!("serviceWorker" in navigator) || parametroLocal("sinsw") !== null) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
  navigator.serviceWorker.getRegistration("./").then(async (reg) => {
    if (!reg) return;
    const activar = (sw) => sw?.postMessage({ tipo: "activar" });
    if (reg.waiting) return activar(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener("statechange", () => {
        if (nuevo.state === "installed") activar(nuevo);
      });
    });
    await reg.update().catch(() => {});
    return undefined;
  }).catch(() => {});
}

// --- Empezar ---

function empezar() {
  enlaceAvisosPc = avisosPc.leerEnlace(location.hash);
  montar();
  const cargado = almacen.cargarDatos();
  switch (cargado.tipo) {
    case "vacio":
      aplicarTema(leerTemaNormal());
      primeraVez();
      break;
    case "danado":
      aplicarTema("auto");
      pantallaDanados(cargado.texto);
      break;
    case "nuevo":
      aplicarTema("auto");
      document.body.classList.add("arrancando");
      arranque.pintarEsquemaNuevo(pantalla);
      listo("error");
      registrarSW();
      break;
    case "migrado":
      guardarCopiaAuto(cargado.original, "antes de actualizar los datos", ahora());
      almacen.ponerDatos(cargado.datos);
      iniciarApp(cargado.avisos);
      break;
    default:
      iniciarApp(cargado.avisos);
  }
}

const versionHtml = document.querySelector('meta[name="gym-beta-version"]')?.getAttribute("content") ?? null;
if (versionHtml !== null && versionHtml !== VERSION) arrancarDesfase();
else empezar();
