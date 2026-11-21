// La mascota en la app (D-133): junta su cerebro (qué hace: cerebro.js), su traje (cómo se pinta: traje-neon.js), el
// escenario (dónde se pone y cuándo se ve: escenario.js), su memoria (sus ajustes y lo que recuerda: memoria.js), su
// carácter (caracter.js) y su cuerpo, de tus entrenos (forma.js), y escucha lo que pasa en la app (sucesos.js). La carga
// app.js, después de arrancar, solo si está encendida; si algo falla aquí, la app sigue igual. Cómo está hecha y cómo
// añadirle cosas, en LEEME.md.

import { crearMascota } from "./cerebro.js";
import { crearTrajeNeon } from "./traje-neon.js";
import { GRUPOS } from "./gestos.js";
import { crearEscenario } from "./escenario.js";
import * as memoria from "./memoria.js";
import { rasgosDe, pesosDe, suenoDe } from "./caracter.js";
import { cuerpoDeTusEntrenos, llevasDiasSin, BOMBEO_HORAS } from "./forma.js";
import { grupoDe } from "./grupos.js";
import { escuchar } from "../sucesos.js";
import { ahora, esBeta, esLocal, parametroLocal } from "../util.js";

export const ESCALAS = { pequena: 0.45, normal: 0.55, grande: 0.68 };
export const BRILLOS = { suave: 0.6, normal: 1, intenso: 1.7 };
const ALTO_DE_PIE = 135;  // lo que mide de pie, en unidades del esqueleto (con la cabeza)
const CUERPO_CADA = 5 * 60000; // cada cuánto mira otra vez su cuerpo (la forma y las agujetas cambian despacio)
const AUSENCIA = 6 * 3600000;  // tras este rato sin verte, al volver te da la bienvenida (D-135)
// Fotogramas por segundo: menos cuanto más tranquila (gasta menos batería).
const FPS = { moviendose: 30, calma: 20, dormida: 12 };

let app = { haySesion: () => false, descanso: () => null, entrenos: () => null, vibrar: () => {} };
let viva = null;
const sucesos = [];

// app: { haySesion(), descanso(), entrenos(), vibrar() } (¿hay una sesión de entreno en marcha?; el descanso, como lo
// da estadoDescanso() de js/descanso.js; una copia de tus entrenos, { dias, sesiones, ejercicios, enCurso }, para su
// cuerpo: forma.js; y una vibración corta al cogerla, si la tienes encendida). Se puede llamar más de una vez.
export function iniciar(adaptador = {}) {
  app = { ...app, ...adaptador };
  if (!sucesos.length) {
    sucesos.push(escuchar("serie", alSerie), escuchar("fin-sesion", alFinSesion), escuchar("preparar", alPreparar),
      escuchar("mascota", () => aplicar()));
  }
  aplicar();
}

// Con lo que diga su ficha: si está encendida, que esté (y con sus ajustes); si no, fuera. Con «renacer» (su ficha es
// otra: la de una copia cargada), vuelve a nacer, con su carácter.
export function aplicar({ renacer = false } = {}) {
  const f = memoria.leer({ crear: true });
  if (!memoria.encendida(f, { beta: esBeta() })) {
    parar();
    return;
  }
  if (renacer) parar();
  if (!viva) viva = nacer(f);
  viva.ajustar(f);
}

export function parar() {
  if (!viva) return;
  viva.quitar();
  viva = null;
}

// El grupo de cada ejercicio, como lo entiende ella (D-136, grupos.js: como lo escribas, en tu idioma; o ninguno).
function alSerie(d) {
  if (!viva) return;
  viva.modo();
  viva.pedirCuerpo(); // con la serie, su cuerpo (ya guardada en tu sesión)
  if (viva.oculta) return;
  const grupo = grupoDe(d.grupo);
  viva.grupoSiguiente = grupoDe(d.grupoSiguiente) || grupo;
  viva.grupoHecho = grupo; // en el descanso, imita ese ejercicio (D-135, la 4)
  if (GRUPOS[grupo]) viva.cerebro.serie(grupo);
  else viva.cerebro.hacerGesto("mirarte"); // un grupo que no entiende (o ninguno): te mira
  if (d.marca) viva.cerebro.record();
}

// Al terminar la sesión lo celebra según cómo fue (D-135), pero cuando la ves: al acabar sale la hoja del resumen, que
// la tapa, así que espera a que la cierres (vivir()).
function alFinSesion(d) {
  if (!viva) return;
  viva.modo();
  viva.pedirCuerpo();
  viva.celebrar = { series: d.series || 0, plan: d.plan || 0, marcas: d.marcas || 0 };
}

// Vas a empezar a entrenar (D-135): calienta ese grupo.
function alPreparar(d) {
  if (!viva || viva.oculta) return;
  viva.cerebro.calentarAntes(grupoDe(d.grupo));
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
  escenario = crearEscenario({ doc, win, alto: () => ALTO_DE_PIE * cerebro.escala + 8 });
  escenario.alCalcular = () => cerebro.reubicar();
  const traje = crearTrajeNeon(escenario.lienzo);
  const reducido = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  let oculta = false;
  let entreno = "rincon";
  let entrenando = false;
  let fuera = false; // en el descanso, fuera del rincón
  let grupoSiguiente = "";
  let grupoHecho = "";

  const ponerTema = () => { traje.tema = doc.documentElement.dataset.tema === "oscuro" ? "oscuro" : "claro"; };
  ponerTema();
  const vigiaTema = new MutationObserver(ponerTema);
  vigiaTema.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-tema"] });

  // En el entreno (en su pantalla, con una sesión en marcha): en la serie, asomada en el rincón; en el descanso, fuera,
  // lejos del ejercicio abierto (D-135); o escondida todo el rato, según sus ajustes.
  function modo() {
    const haySesion = Boolean(app.haySesion());
    cerebro.cinta = haySesion; // con una sesión en marcha, lleva su cinta (D-135, la 4)
    entrenando = doc.body.dataset.pantalla === "entreno" && haySesion;
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

  // Su cuerpo, de tus entrenos (forma.js, la fase 2): al nacer, al volver a la app (mientras estaba oculta, el tiempo
  // ha pasado), tras cada serie y al terminar, y cada 5 min. Si algo falla, sigue con el que tenía.
  let cuerpo = null;
  let pendiente = 0;
  function ponerAlDiaCuerpo() {
    win.clearTimeout(pendiente);
    pendiente = 0;
    let e = null;
    try {
      e = app.entrenos?.();
    } catch {
      e = null;
    }
    if (!e) return;
    cuerpo = cuerpoDeTusEntrenos(e, ahora(), { nacida: ficha.nacida });
    cerebro.ponerCuerpo(cuerpo);
    cerebro.trofeo = cuerpo.trofeo; // hoy has batido una marca: lo lleva el resto del día (D-135)
  }
  const pedirCuerpo = () => {
    if (!pendiente) pendiente = win.setTimeout(ponerAlDiaCuerpo, 300);
  };
  ponerAlDiaCuerpo();
  const cadaCuerpo = win.setInterval(ponerAlDiaCuerpo, CUERPO_CADA);

  // Cuándo te vio por última vez: tras 6 h sin verte, al volver te da la bienvenida; si llevas días sin entrenar, estaba
  // dormida y se alegra de verte (D-135).
  const verte = () => {
    if (doc.visibilityState !== "visible") return;
    const antes = memoria.leer().vista;
    const t = ahora();
    memoria.anotar((f) => { f.vista = t; });
    ponerAlDiaCuerpo();
    if (Number.isFinite(antes) && t - antes >= AUSENCIA) cerebro.bienvenida({ dormida: llevasDiasSin(cuerpo) });
  };
  verte();
  doc.addEventListener("visibilitychange", verte);

  // Los toques (D-135, la 5): uno, dos o tres seguidos (el cerebro sabe cuántos); y mantenerla pulsada la coge (en su
  // rincón del entreno, no). Cada toque y cada vez que la coges, apuntado en su ficha.
  const tocada = () => memoria.anotar((f) => { f.toques += 1; });
  escenario.escucharToques({
    contiene: (x, y) => cerebro.contiene(x, y),
    tocar: () => {
      cerebro.tocarla();
      tocada();
    },
    mirar: (x, y) => cerebro.mirar(x, y),
    puedeCoger: () => !oculta && cerebro.puedeCoger(),
    coger: (x, y) => {
      if (!cerebro.coger(x, y)) return false;
      tocada();
      try {
        app.vibrar?.();
      } catch {
        // la vibración es lo de menos
      }
      return true;
    },
    llevar: (x, y) => cerebro.llevar(x, y),
    soltar: (x, y) => cerebro.soltar(x, y),
  });

  function pintar(f) {
    escenario.medirLienzo(cerebro.escala, traje);
    if (!f) {
      traje.dibujar(null);
      return;
    }
    // encima de una tarjeta, pegada a la página (al desplazarla va con ella, sin tirones); en la barra de abajo o en tu
    // dedo, a la pantalla; y en tu dedo o cayendo de él, por encima de todo
    const s = escenario.superficies().find((x) => x.id === cerebro.superficie);
    const origen = escenario.colocar(f, { pegadaAPagina: !cerebro.cogida && Boolean(s && s.yDoc != null), encima: cerebro.enElAire });
    traje.dibujar(f, origen);
  }

  // Un paso de su vida: la celebración del final de la sesión, cuando ya no la tapa el resumen; el descanso de la app
  // (cuánto queda, para su carga y lo que hace; y, tras sentir la serie, fuera del rincón), sus superficies al día y lo
  // que hace.
  let celebrar = null;
  function vivir(dt) {
    if (celebrar && !escenario.tapada()) {
      cerebro.finSesion(celebrar);
      celebrar = null;
    }
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
    return { id: e.id, quedan: e.quedan, fraccion: 1 - e.quedan / total, pausa: e.fase === "pausa", grupoSiguiente, grupo: grupoHecho };
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
    pedirCuerpo,
    ponerAlDiaCuerpo,
    get cuerpo() { return cuerpo; },
    get celebrar() { return celebrar; },
    set celebrar(c) { celebrar = c; },
    get oculta() { return oculta; },
    get grupoSiguiente() { return grupoSiguiente; },
    set grupoSiguiente(g) { grupoSiguiente = g; },
    get grupoHecho() { return grupoHecho; },
    set grupoHecho(g) { grupoHecho = g; },
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
      win.clearInterval(cadaCuerpo);
      win.clearTimeout(pendiente);
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
    // su cuerpo: la forma que se le ve, la de fondo, el bombeo general, cada músculo y lo último de forma.js
    get forma() { return viva?.cerebro.forma ?? null; },
    get fondo() { return viva?.cerebro.fondo ?? null; },
    get general() { return viva?.cerebro.general ?? null; },
    get musculos() { return viva?.cerebro.musculos ?? null; },
    get dolorida() { return viva?.cerebro.dolorida ?? null; },
    get trofeo() { return Boolean(viva?.cerebro.trofeo); },
    get cinta() { return Boolean(viva?.cerebro.cinta); },
    get celebracionPendiente() { return viva?.celebrar ?? null; },
    // en tu dedo (D-135, la 5) y, si no, en el aire (cayendo de él)
    get cogida() { return Boolean(viva?.cerebro.cogida); },
    get enElAire() { return Boolean(viva?.cerebro.enElAire); },
    get cuerpo() { return viva?.cuerpo ?? null; },
    ponerAlDiaCuerpo() { viva?.ponerAlDiaCuerpo(); },
    hacer(nombre) { viva?.cerebro.hacer(nombre); },
    get cabeza() { return viva?.cerebro.cabeza ?? null; },
    get rasgos() { return viva?.rasgos ?? null; },
    avanzar(segundos) { viva?.avanzar(segundos); },
    calcular() { viva?.escenario.calcular(); },
  };
}
