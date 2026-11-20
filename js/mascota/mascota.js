// La mascota en la app (D-133): junta su cerebro (qué hace: cerebro.js), su traje (cómo se pinta: traje-neon.js), el
// escenario (dónde se pone y cuándo se ve: escenario.js), su memoria (sus ajustes y lo que recuerda: memoria.js) y su
// carácter (caracter.js), y escucha lo que pasa en la app (sucesos.js). La carga app.js, después de arrancar, solo si
// está encendida; si algo falla aquí, la app sigue igual. Cómo está hecha y cómo añadirle cosas, en LEEME.md.

import { crearMascota } from "./cerebro.js";
import { crearTrajeNeon } from "./traje-neon.js";
import { GRUPOS } from "./gestos.js";
import { crearEscenario } from "./escenario.js";
import * as memoria from "./memoria.js";
import { rasgosDe, pesosDe, suenoDe } from "./caracter.js";
import { escuchar } from "../sucesos.js";
import { esBeta, esLocal, parametroLocal } from "../util.js";

export const ESCALAS = { pequena: 0.45, normal: 0.55, grande: 0.68 };
export const BRILLOS = { suave: 0.6, normal: 1, intenso: 1.7 };
const ALTO_DE_PIE = 135;  // lo que mide de pie, en unidades del esqueleto (con la cabeza)
const BOMBEO_HORAS = 3;   // lo que tarda en irse el bombeo de cada serie (D-128: unas horas)
const FORMA = 0.3;        // de 0 (gordito) a 1 (definido); en la fase 2, de tus entrenos
// Fotogramas por segundo: menos cuanto más tranquila (gasta menos batería).
const FPS = { moviendose: 30, calma: 20, dormida: 12 };

let app = { haySesion: () => false, descanso: () => null };
let viva = null;
const sucesos = [];

// app: { haySesion(), descanso() } (¿hay una sesión de entreno en marcha?; el descanso, como lo da estadoDescanso() de
// js/descanso.js). Se puede llamar más de una vez.
export function iniciar(adaptador = {}) {
  app = { ...app, ...adaptador };
  if (!sucesos.length) {
    sucesos.push(escuchar("serie", alSerie), escuchar("fin-sesion", alFinSesion), escuchar("mascota", aplicar));
  }
  aplicar();
}

// Con lo que diga su ficha: si está encendida, que esté (y con sus ajustes); si no, fuera.
export function aplicar() {
  const f = memoria.leer({ crear: true });
  if (!memoria.encendida(f, { beta: esBeta() })) {
    parar();
    return;
  }
  if (!viva) viva = nacer(f);
  viva.ajustar(f);
}

export function parar() {
  if (!viva) return;
  viva.quitar();
  viva = null;
}

function alSerie(d) {
  if (!viva) return;
  viva.modo();
  if (viva.oculta) return;
  viva.grupoSiguiente = d.grupoSiguiente || d.grupo || "";
  if (GRUPOS[d.grupo]) viva.cerebro.serie(d.grupo);
  else viva.cerebro.hacerGesto("mirarte"); // un ejercicio sin grupo (uno tuyo nuevo): te mira
  if (d.marca) viva.cerebro.record();
}

function alFinSesion(d) {
  if (!viva) return;
  viva.modo();
  if (d.marcas > 0) viva.cerebro.record();
  else viva.cerebro.hacerGesto("saludo");
}

// Para las pruebas (solo en local, con «?mascota-azar=n»): el mismo azar cada vez.
function azarDePrueba() {
  const n = Number(parametroLocal("mascota-azar"));
  if (!Number.isInteger(n) || n <= 0) return null;
  let a = n;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nacer(ficha) {
  const doc = document;
  const win = window;
  const rasgos = rasgosDe(ficha.semilla);
  let escenario = null;
  const cerebro = crearMascota({
    azar: azarDePrueba() || Math.random,
    superficies: () => escenario.superficies(),
    escala: ESCALAS[ficha.ajustes.tamano] || ESCALAS.normal,
    techo: () => escenario.region().y1,
    reloj: () => escenario.reloj(),
    alReubicar: () => escenario.aparecer(),
    suenoTras: suenoDe(rasgos),
    bombeoDura: BOMBEO_HORAS * 3600,
  });
  cerebro.pesos = pesosDe(rasgos);
  cerebro.forma = FORMA;
  escenario = crearEscenario({ doc, win, alto: () => ALTO_DE_PIE * cerebro.escala + 8 });
  escenario.alCalcular = () => cerebro.reubicar();
  const traje = crearTrajeNeon(escenario.lienzo);
  const reducido = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  let oculta = false;
  let entreno = "rincon";
  let entrenando = false;
  let fuera = false; // en el descanso, fuera del rincón
  let grupoSiguiente = "";

  const ponerTema = () => { traje.tema = doc.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro"; };
  ponerTema();
  const vigiaTema = new MutationObserver(ponerTema);
  vigiaTema.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-tema"] });

  // En el entreno (en su pantalla, con una sesión en marcha): en la serie, asomada en el rincón; en el descanso, fuera,
  // lejos del ejercicio abierto (D-135); o escondida todo el rato, según sus ajustes.
  function modo() {
    entrenando = doc.body.dataset.pantalla === "entreno" && Boolean(app.haySesion());
    const esconder = entrenando && entreno === "escondida";
    const enLaSerie = entrenando && !fuera;
    escenario.evitar = entrenando && fuera ? ".ej.abierto" : null;
    escenario.rincon = enLaSerie;
    cerebro.tranquila = enLaSerie || Boolean(reducido?.matches);
    if (esconder !== oculta) {
      oculta = esconder;
      escenario.lienzo.hidden = esconder;
      if (!esconder) escenario.aparecer();
    }
  }
  const vigiaPantalla = new MutationObserver(modo);
  vigiaPantalla.observe(doc.body, { attributes: true, attributeFilter: ["data-pantalla"] });
  const cadaRato = win.setInterval(modo, 3000); // una sesión que se descarta o se abandona no siempre avisa

  // Cuándo te vio por última vez (para la fase 2: si llevas días sin venir).
  const verte = () => {
    if (doc.visibilityState === "visible") memoria.anotar((f) => { f.vista = Date.now(); });
  };
  verte();
  doc.addEventListener("visibilitychange", verte);

  escenario.escucharToques({
    contiene: (x, y) => cerebro.contiene(x, y),
    tocar: (x, y) => {
      cerebro.tocar(x, y);
      memoria.anotar((f) => { f.toques += 1; });
    },
    mirar: (x, y) => cerebro.mirar(x, y),
  });

  function pintar(f) {
    escenario.medirLienzo(cerebro.escala, traje);
    if (!f) {
      traje.dibujar(null);
      return;
    }
    // encima de una tarjeta, pegada a la página (al desplazarla va con ella, sin tirones); en la barra de abajo, a la pantalla
    const s = escenario.superficies().find((x) => x.id === cerebro.superficie);
    const origen = escenario.colocar(f, { pegadaAPagina: Boolean(s && s.yDoc != null) });
    traje.dibujar(f, origen);
  }

  // Un paso de su vida: el descanso de la app (cuánto queda, para su carga y lo que hace; y, tras sentir la serie, fuera
  // del rincón), sus superficies al día y lo que hace.
  function vivir(dt) {
    const d = leerDescanso();
    cerebro.descanso = d;
    const sale = Boolean(d) && !cerebro.reaccionando;
    if (sale !== fuera) {
      fuera = sale;
      modo();
    }
    escenario.ponerAlDia([cerebro.superficie, cerebro.destino]);
    return cerebro.paso(dt);
  }

  function leerDescanso() {
    const e = app.descanso?.();
    if (!entrenando || !e || (e.fase !== "corriendo" && e.fase !== "pausa")) return null;
    const total = Math.max(1, e.duracion || 0, e.quedan || 0);
    return { id: e.id, quedan: e.quedan, fraccion: 1 - e.quedan / total, pausa: e.fase === "pausa", grupoSiguiente };
  }

  let raf = 0;
  let antes = 0;
  let acumulado = 0;
  function fotograma(t) {
    raf = win.requestAnimationFrame(fotograma);
    const dt = antes ? Math.min(0.25, Math.max(0, (t - antes) / 1000)) : 0;
    antes = t;
    acumulado += dt;
    const fps = cerebro.dormida ? FPS.dormida : cerebro.calma ? FPS.calma : FPS.moviendose;
    if (acumulado < 1 / fps - 0.004) return;
    const paso = Math.min(0.1, acumulado); // tras una pausa larga no da un salto
    acumulado = 0;
    if (oculta) return; // escondida en el entreno: ni vive ni se pinta (sale al terminar)
    const f = vivir(paso);
    if (escenario.tapada()) return; // detrás de una hoja: vive, pero no hace falta pintarla
    pintar(f);
  }
  raf = win.requestAnimationFrame(fotograma);
  escenario.aparecer();

  const viva = {
    cerebro,
    traje,
    escenario,
    rasgos,
    modo,
    get oculta() { return oculta; },
    get grupoSiguiente() { return grupoSiguiente; },
    set grupoSiguiente(g) { grupoSiguiente = g; },
    // Para las pruebas: vive «segundos» de golpe (a 30 fotogramas por segundo) y se pinta el último.
    avanzar(segundos) {
      let f = null;
      for (let i = 0; i < Math.round(segundos * 30); i++) f = vivir(1 / 30);
      pintar(f);
    },
    ajustar(f) {
      cerebro.escala = ESCALAS[f.ajustes.tamano] || ESCALAS.normal;
      traje.luz = f.ajustes.luz;
      traje.brillo = BRILLOS[f.ajustes.brillo] ?? 1;
      entreno = f.ajustes.entreno;
      modo();
      escenario.pedir(0); // con otro tamaño, otro sitio
    },
    quitar() {
      win.cancelAnimationFrame(raf);
      win.clearInterval(cadaRato);
      vigiaTema.disconnect();
      vigiaPantalla.disconnect();
      doc.removeEventListener("visibilitychange", verte);
      escenario.quitar();
    },
  };
  return viva;
}

// Para las pruebas (solo en local): qué hace y dónde está.
if (esLocal()) {
  window.__gymMascota = {
    get viva() { return Boolean(viva); },
    get accion() { return viva?.cerebro.accion || ""; },
    get tranquila() { return Boolean(viva?.cerebro.tranquila); },
    get superficie() { return viva?.cerebro.superficie ?? null; },
    get superficies() { return viva ? viva.escenario.superficies().map(({ id, x1, x2, y, tipo }) => ({ id, x1, x2, y, tipo })) : []; },
    get escala() { return viva?.cerebro.escala ?? null; },
    get luz() { return viva?.traje.luz ?? null; },
    get oculta() { return Boolean(viva?.oculta); },
    get enPagina() { return Boolean(viva?.escenario.enPagina); },
    get brillo() { return viva?.traje.brillo ?? null; },
    get carga() { return viva?.cerebro.carga ?? null; },
    get descanso() { return viva?.cerebro.descanso ?? null; },
    hacer(nombre) { viva?.cerebro.hacer(nombre); },
    get cabeza() { return viva?.cerebro.cabeza ?? null; },
    get rasgos() { return viva?.rasgos ?? null; },
    avanzar(segundos) { viva?.avanzar(segundos); },
    calcular() { viva?.escenario.calcular(); },
  };
}
