// El escenario de la mascota en la app (D-133, D-134): dónde puede ponerse y cómo se la ve.
// - Sus superficies: el borde de arriba de cada tarjeta y de cada cosa con caja de la pantalla (los botones, las
//   opciones…) y el de la barra de abajo. En cada una, sus tramos «libres»: donde, de pie, no tapa nada (ni texto, ni
//   botones, ni otra tarjeta). Pasea y salta por todas, pero para quedarse quieta busca un tramo libre (el cerebro).
//   En el entreno (el «rincón»), solo el rincón de abajo a la derecha, encima de la barra de abajo: allí se asoma.
// - Su lienzo: pequeño y va con ella. Encima de una tarjeta, pegado a la página: al desplazarla va con ella, sin
//   tirones (lo mueve el navegador, no JavaScript); en la barra de abajo o en el rincón, pegado a la pantalla. Queda
//   por debajo de la cabecera, las barras de abajo, las hojas y los avisos: lo que pasa por detrás de ellos se tapa.
// - Los toques: si la tocas a ella, el toque es suyo (no pulsa lo que haya debajo); si no, solo mira hacia allí. Si la
//   mantienes pulsada, la coges (D-135, la 5): mientras la llevas, va por encima de todo y la pantalla no se desplaza.
// No decide qué hace (eso es el cerebro) y nunca toca la app: solo la mira.

// Las tarjetas de la app y las cosas con caja donde puede ponerse (también una dentro de otra).
export const SUELOS = ".tarjeta, .seccion, .ej, .fila, .fila-con-boton, .fila-estatica, .fila-superset, .tarjeta-destacada, .vacio, .opcion, .boton";
// Lo que no hay que tapar al quedarse quieta (además del texto y de las tarjetas).
export const CONTROLES = "button, a[href], input, select, textarea, label, img, svg, canvas, video, [role='button']";
// Las barras de abajo, de la de más arriba a la de más abajo: la primera que se vea hace de suelo.
const BARRAS = [".barra-borrador", "#barra-descanso", "#nav"];
// Lo que queda por encima de ella: un toque ahí no es para ella.
const TAPAN = ".capa-hoja, .capa-fin, .avisos, .nav, .cabecera, .barra-descanso, .barra-borrador";
const AIRE = 6;        // px entre ella y lo que no tapa
const RINCON = 96;     // px de ancho del rincón
const DESPLAZAR = 280; // ms quieta la pantalla antes de volver a mirar dónde hay sitio
// Cogerla (D-135, la 5), como el arrastre de Rutina (js/ui/arrastre.js):
const MS_COGER = 350;       // ms con el dedo quieto en ella para cogerla (antes de que el móvil saque su menú)
const TOLERANCIA_DEDO = 10; // px: si el dedo se mueve más antes, está desplazando la pantalla: no es para ella
const UMBRAL_RATON = 6;     // px: con el ratón, moverla así con el botón pulsado ya la coge
const ALZAR_DEDO = 32;      // px por encima del dedo van sus pies, para que el dedo no la tape
const ALZAR_RATON = 4;      // con el ratón, casi en la punta de la flecha
const MS_SIN_CLIC = 600;    // tras soltar el dedo, el clic que llegue no pulsa lo de debajo

// ¿Se ve la caja de este control (fondo, borde o sombra), o solo lo que lleva dentro? Las imágenes y los campos, siempre.
function conCaja(el) {
  if (el.matches("img, svg, canvas, video, input, select, textarea")) return true;
  const cs = el.ownerDocument.defaultView.getComputedStyle(el);
  const transparente = (c) => c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c);
  return !transparente(cs.backgroundColor) || cs.boxShadow !== "none"
    || ["Top", "Right", "Bottom", "Left"].some((l) => parseFloat(cs[`border${l}Width`]) > 0 && cs[`border${l}Style`] !== "none" && !transparente(cs[`border${l}Color`]));
}

// Las superficies, en px de la ventana: [{ id, el, x1, x2, y, yDoc, c1, c2, tipo, libres }]. raiz: donde están las
// pantallas (#pantalla); abajo: la barra de abajo que se ve; region: { y1, y2 }, la franja entre la cabecera y esa
// barra; alto: lo que mide de pie, en px; idDe(el): un número fijo por elemento; scrollY: lo desplazada que está la
// página (yDoc = y + scrollY: la «y» en la página, que no cambia al desplazarla). libres: los tramos [x1, x2] donde,
// de pie, no tapa nada.
// evitar: { top, bottom, left, right } (o null): una zona donde no ponerse ni tapar (en el descanso, el ejercicio abierto).
export function calcularSuperficies({ raiz, abajo = null, region, alto, anchoMin = 46, idDe, scrollY = 0, evitar = null }) {
  const visible = (r) => r.width > 0 && r.height > 0 && r.bottom > region.y1 - alto && r.top < region.y2 + alto;
  const caja = (el, r) => ({ el, l: r.left, r: r.right, t: r.top, b: r.bottom });
  const obstaculos = [];
  const candidatas = [];
  const rango = raiz.ownerDocument.createRange();
  // Todo lo que se ve: las cajas (tarjetas, botones, opciones…), cada línea de texto y cada control con caja.
  const recorrer = (padre) => {
    for (let n = padre.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) continue;
        rango.selectNodeContents(n);
        for (const r of rango.getClientRects()) if (visible(r)) obstaculos.push(caja(null, r));
        continue;
      }
      if (n.nodeType !== 1 || n.hidden) continue;
      const r = n.getBoundingClientRect();
      if ((r.width > 0 || r.height > 0) && !visible(r)) continue; // fuera de la vista: ni ella ni lo de dentro
      if (n.matches(SUELOS)) {
        obstaculos.push(caja(n, r));
        candidatas.push({ el: n, r });
      } else if (n.matches(CONTROLES) && conCaja(n)) {
        obstaculos.push(caja(n, r));
      }
      if (!n.matches("svg, img, canvas, video, input, select, textarea")) recorrer(n);
    }
  };
  recorrer(raiz);
  // Una caja dentro de otra con el mismo borde de arriba (una fila que empieza donde su tarjeta): solo la de fuera.
  const unicas = candidatas.filter((c) => !candidatas.some((o) => o !== c && o.el.contains(c.el) && Math.abs(o.r.top - c.r.top) < 3));

  const libresDe = (el, y, x1, x2) => {
    let libres = [[x1, x2]];
    for (const o of obstaculos) {
      if (o.el && (o.el === el || o.el.contains(el))) continue;
      if (o.b <= y - alto || o.t >= y - 0.5) continue; // no toca la franja de encima
      const a = o.l - AIRE;
      const b = o.r + AIRE;
      libres = libres.flatMap(([p, q]) => (b <= p || a >= q ? [[p, q]] : [[p, Math.min(q, a)], [Math.max(p, b), q]].filter(([u, v]) => v - u > 0)));
      if (!libres.length) break;
    }
    return libres.filter(([p, q]) => q - p >= anchoMin);
  };
  const superficies = [];
  const poner = (el, r, tipo, fija) => {
    const y = r.top;
    if (y < region.y1 + alto * 0.5 || y > region.y2 + 0.5) return; // que se le vea al menos medio cuerpo
    const x1 = r.left + 8;
    const x2 = r.right - 8;
    if (x2 - x1 < anchoMin) return;
    if (evitar && y > evitar.top - 2 && y - alto < evitar.bottom && x2 > evitar.left && x1 < evitar.right) return;
    superficies.push({ id: `${tipo}-${idDe(el)}`, el, x1, x2, y, yDoc: fija ? null : y + scrollY, c1: r.left, c2: r.right, tipo, libres: libresDe(el, y, x1, x2) });
  };
  for (const { el, r } of unicas) poner(el, r, "tarjeta", false);
  if (abajo) {
    const r = abajo.getBoundingClientRect();
    if (r.height > 0) poner(abajo, { top: r.top, left: r.left + 4, right: r.right - 4 }, "abajo", true);
  }
  return superficies;
}

// alto(): lo que mide de pie, en px (cambia con su tamaño).
export function crearEscenario({ doc = document, win = window, alto, anchoMin = 46 } = {}) {
  const pantalla = doc.getElementById("pantalla");
  const cabecera = doc.getElementById("cabecera");
  const lienzo = doc.createElement("canvas");
  lienzo.className = "mascota-capa";
  lienzo.setAttribute("aria-hidden", "true");
  doc.body.append(lienzo);

  const ids = new WeakMap();
  let numero = 0;
  const idDe = (el) => {
    if (!ids.has(el)) ids.set(el, ++numero);
    return ids.get(el);
  };

  let lista = [];
  let rincon = false;
  let region = { y1: 0, y2: win.innerHeight };
  let pagina = { ancho: 0, alto: 0 };
  let pendiente = 0;
  let desplazando = 0;
  let lado = 0;
  let dpr = 1;
  let colocado = null;
  let enPagina = false;
  let porEncima = false;
  let evitar = null; // un selector: lo que no tapar (en el descanso, el ejercicio abierto)
  let alCalcular = () => {};
  const quitar = [];

  const barraAbajo = () => {
    for (const sel of BARRAS) {
      const b = doc.querySelector(sel);
      if (b && !b.hidden && b.offsetHeight > 0) return b;
    }
    return null;
  };
  function medir() {
    const c = cabecera?.getBoundingClientRect();
    const b = barraAbajo()?.getBoundingClientRect();
    region = { y1: Math.max(0, c && c.height ? c.bottom : 0), y2: b && b.height ? b.top : win.innerHeight };
    pagina = { ancho: doc.documentElement.clientWidth, alto: doc.documentElement.scrollHeight };
  }
  function rinconAhora() {
    const b = barraAbajo()?.getBoundingClientRect();
    const der = (b && b.width ? b.right : pagina.ancho) - 10;
    return { id: "rincon", el: null, x1: der - RINCON, x2: der, y: region.y2, yDoc: null, c1: 0, c2: pagina.ancho, tipo: "rincon", libres: [[der - RINCON, der]] };
  }
  function calcular() {
    win.clearTimeout(pendiente);
    pendiente = 0;
    medir();
    let todas = [];
    if (!rincon && pantalla) {
      const zona = evitar ? doc.querySelector(evitar)?.getBoundingClientRect() : null;
      todas = calcularSuperficies({ raiz: pantalla, abajo: barraAbajo(), region, alto: alto(), anchoMin, idDe, scrollY: win.scrollY, evitar: zona });
    }
    lista = todas.length ? todas : [rinconAhora()];
    alCalcular(lista);
  }
  // Volver a mirar dónde hay sitio, dentro de «ms» (si ya está pedido, vale ese).
  function pedir(ms = 120) {
    if (pendiente) return;
    pendiente = win.setTimeout(calcular, ms);
  }
  // En cada fotograma: la «y» de las de la página, con lo desplazada que está (sin medir: no cuesta); y las de «vivas» (la
  // suya y adónde salta), midiéndolas: si la app mueve su tarjeta (al desplegar otra), va con ella al momento.
  function ponerAlDia(vivas = []) {
    const sy = win.scrollY;
    let falta = false;
    for (const s of lista) {
      if (s.yDoc == null) continue;
      if (!s.el?.isConnected) falta = true;
      else if (vivas.includes(s.id)) {
        s.y = s.el.getBoundingClientRect().top;
        s.yDoc = s.y + sy;
      } else s.y = s.yDoc - sy;
    }
    if (falta) {
      lista = lista.filter((s) => s.yDoc == null || s.el?.isConnected);
      if (!lista.length) lista = [rinconAhora()];
      pedir(0);
    }
  }

  // Mientras se desplaza la pantalla, va con su tarjeta; cuando se para, se mira otra vez dónde hay sitio.
  const alDesplazar = () => {
    win.clearTimeout(desplazando);
    desplazando = win.setTimeout(() => {
      desplazando = 0;
      calcular();
    }, DESPLAZAR);
  };
  const alCambiarTamano = () => pedir(150);
  win.addEventListener("scroll", alDesplazar, { passive: true });
  win.addEventListener("resize", alCambiarTamano);
  quitar.push(() => win.removeEventListener("scroll", alDesplazar), () => win.removeEventListener("resize", alCambiarTamano));
  const vigia = new MutationObserver(() => {
    if (!desplazando) pedir(150);
  });
  if (pantalla) vigia.observe(pantalla, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden", "open", "aria-expanded"] });
  vigia.observe(doc.body, { childList: true, attributes: true, attributeFilter: ["data-pantalla", "class"] });
  for (const sel of BARRAS) {
    const b = doc.querySelector(sel);
    if (b) vigia.observe(b, { attributes: true, attributeFilter: ["hidden"] });
  }
  quitar.push(() => vigia.disconnect());
  // Por si algo cambia sin avisar (una animación que acaba, una imagen que carga): cada 2 s, otra vez.
  const cada = win.setInterval(() => {
    if (!desplazando && !doc.hidden) calcular();
  }, 2000);
  quitar.push(() => win.clearInterval(cada), () => win.clearTimeout(pendiente), () => win.clearTimeout(desplazando));

  // Los toques. contiene(x, y): si es en ella. Un toque corto en ella: tocar(x, y); en otro sitio: mirar(x, y).
  // Mantenerla pulsada (MS_COGER sin mover el dedo; con el ratón, también moverla) la coge, si puedeCoger(): coger(x, y)
  // (false si no la coge), llevar(x, y) mientras la llevas y soltar(x, y) al soltarla, con (x, y) donde van sus pies: por
  // encima del dedo, para que no la tape, y dentro de la pantalla. Si el dedo se mueve antes, está desplazando la
  // pantalla: ni toque ni nada. Lo que empezó en ella no pulsa lo de debajo, y mientras dura no sale el menú del móvil
  // ni se selecciona texto; mientras la llevas, la pantalla no se desplaza.
  function escucharToques({ contiene, tocar, mirar, puedeCoger = () => false, coger = () => false, llevar = () => {}, soltar = () => {} }) {
    // el dedo que empezó en ella: { id, x, y (donde bajó), ux, uy (donde está), raton, alzar, reloj, fase }; la fase:
    // «pulsada» (aún puede ser un toque o cogerla), «cogida», «larga» (pulsada donde no se puede coger) o «nada» (se
    // movió: desplaza la pantalla)
    let toque = null;
    let comer = -1; // hasta cuándo el clic que llegue es suyo (mientras dura el toque, siempre)
    const pies = (x, y, alzar) => [
      Math.min(Math.max(x, 14), win.innerWidth - 14),
      Math.min(Math.max(y - alzar, alto()), win.innerHeight - 4),
    ];
    const levantar = () => {
      const t = toque;
      if (!t || t.fase !== "pulsada") return;
      win.clearTimeout(t.reloj);
      t.fase = puedeCoger() && coger(...pies(t.ux, t.uy, t.alzar)) !== false ? "cogida" : "larga";
    };
    // Se acaba el toque: un toque corto, para ella; si la llevabas, la suelta donde esté el dedo.
    const acabar = (ts, valeToque) => {
      const t = toque;
      toque = null;
      if (!t) return;
      win.clearTimeout(t.reloj);
      comer = ts + MS_SIN_CLIC;
      if (t.fase === "cogida") soltar(...pies(t.ux, t.uy, t.alzar));
      else if (t.fase === "pulsada" && valeToque) tocar(t.x, t.y);
    };
    const ahora = () => win.performance.now();
    const alBajar = (ev) => {
      if (!ev.isPrimary) return;
      if (toque) acabar(ahora(), false); // el de antes no acabó bien (se soltó fuera de la ventana)
      comer = -1;
      if (lienzo.hidden || ev.button > 0) return;
      const x = ev.clientX;
      const y = ev.clientY;
      const tapa = doc.elementFromPoint(x, y)?.closest?.(TAPAN);
      if (tapa || y <= region.y1 || y >= region.y2 || !contiene(x, y)) {
        mirar(x, y);
        return;
      }
      const raton = ev.pointerType === "mouse";
      toque = { id: ev.pointerId, x, y, ux: x, uy: y, raton, alzar: raton ? ALZAR_RATON : ALZAR_DEDO, reloj: 0, fase: "pulsada" };
      toque.reloj = win.setTimeout(levantar, MS_COGER);
      comer = Infinity;
    };
    const alMover = (ev) => {
      const t = toque;
      if (!t || ev.pointerId !== t.id) return;
      t.ux = ev.clientX;
      t.uy = ev.clientY;
      if (t.fase === "cogida") {
        if (t.raton && !(ev.buttons & 1)) acabar(ev.timeStamp, false); // soltó el botón fuera de la ventana
        else llevar(...pies(t.ux, t.uy, t.alzar));
        return;
      }
      if (t.fase !== "pulsada") return;
      const d = Math.hypot(t.ux - t.x, t.uy - t.y);
      if (t.raton ? d < UMBRAL_RATON : d <= TOLERANCIA_DEDO) return;
      if (t.raton) levantar(); // con el ratón, moverla ya la coge
      else {
        win.clearTimeout(t.reloj);
        t.fase = "nada"; // desplaza la pantalla: no es para ella
      }
    };
    const alSubir = (ev) => {
      if (toque && ev.pointerId === toque.id) acabar(ev.timeStamp, true);
    };
    const alCancelar = (ev) => {
      if (toque && ev.pointerId === toque.id) acabar(ev.timeStamp, false);
    };
    // El toque que fue para ella no pulsa lo que haya debajo (ni el clic de soltarla, con el ratón).
    const alPulsar = (ev) => {
      if (ev.timeStamp > comer) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (!toque) comer = -1;
    };
    // Mientras la llevas, el dedo no desplaza la pantalla. Tiene que estar puesto desde antes de tocar (si no, el
    // navegador ya no deja pararlo), así que está siempre, pero solo para algo mientras la llevas.
    const alArrastrar = (ev) => {
      if (toque?.fase === "cogida" && ev.cancelable) ev.preventDefault();
    };
    // Ni el menú del móvil (mantener pulsado), ni seleccionar el texto de debajo, ni arrastrar una imagen.
    const sinMenu = (ev) => {
      if (toque && toque.fase !== "nada") ev.preventDefault();
    };
    // Si la app se va (otra app, la pantalla apagada) con ella en el dedo, la suelta.
    const alIrse = () => {
      if (toque?.fase === "cogida") acabar(ahora(), false);
    };
    const escuchas = [
      [win, "pointerdown", alBajar, { capture: true, passive: true }],
      [win, "pointermove", alMover, { capture: true, passive: true }],
      [win, "pointerup", alSubir, { capture: true, passive: true }],
      [win, "pointercancel", alCancelar, { capture: true, passive: true }],
      [win, "click", alPulsar, { capture: true }],
      [win, "touchmove", alArrastrar, { capture: true, passive: false }],
      [win, "contextmenu", sinMenu, { capture: true }],
      [win, "dragstart", sinMenu, { capture: true }],
      [doc, "selectstart", sinMenu, { capture: true }],
      [win, "blur", alIrse, false],
      [doc, "visibilitychange", alIrse, false],
    ];
    for (const [donde, tipo, fn, opciones] of escuchas) donde.addEventListener(tipo, fn, opciones);
    quitar.push(() => {
      if (toque) win.clearTimeout(toque.reloj);
      for (const [donde, tipo, fn, opciones] of escuchas) donde.removeEventListener(tipo, fn, opciones);
    });
  }

  // El lienzo, cuadrado y del tamaño justo para ella (y sus efectos) a esa escala.
  function medirLienzo(escala, traje) {
    const l = Math.ceil(320 * escala);
    const r = Math.min(3, win.devicePixelRatio || 1);
    if (l === lado && r === dpr) return;
    lado = l;
    dpr = r;
    lienzo.style.width = `${l}px`;
    lienzo.style.height = `${l}px`;
    traje.medidas(l, l, r);
  }
  // Pone el lienzo donde está ella (centrado en su cuerpo): pegado a la página (en una tarjeta) o a la pantalla (en la
  // barra de abajo, en el rincón o en tu dedo); con «encima» (en tu dedo o cayendo de él), por encima de la cabecera y
  // de las barras de abajo. Devuelve dónde cae su esquina, en px de la ventana.
  function colocar(f, { pegadaAPagina = true, encima = false } = {}) {
    if (encima !== porEncima) {
      porEncima = encima;
      lienzo.classList.toggle("encima", encima);
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const k in f.cin.p) {
      const [px, py] = f.cin.p[k];
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    const ox = Math.round(f.raiz[0] + ((x0 + x1) / 2) * f.escala - lado / 2);
    const oy = Math.round(f.raiz[1] + ((y0 + y1) / 2) * f.escala - lado / 2);
    if (pegadaAPagina) {
      // en la página, sin salirse de ella (si no, la haría más ancha o más larga)
      const sx = win.scrollX;
      const sy = win.scrollY;
      const px = Math.max(0, Math.min(ox + sx, pagina.ancho - lado));
      const py = Math.max(0, Math.min(oy + sy, pagina.alto - lado));
      ponerLienzo(true, px, py);
      return [px - sx, py - sy];
    }
    ponerLienzo(false, ox, oy);
    return [ox, oy];
  }
  function ponerLienzo(pagina_, x, y) {
    if (pagina_ !== enPagina) {
      lienzo.classList.toggle("en-pagina", pagina_);
      enPagina = pagina_;
      colocado = null;
    }
    if (!colocado || colocado[0] !== x || colocado[1] !== y) {
      lienzo.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      colocado = [x, y];
    }
  }

  calcular();
  return {
    lienzo,
    superficies: () => lista,
    region: () => region,
    calcular,
    pedir,
    ponerAlDia,
    escucharToques,
    medirLienzo,
    colocar,
    get enPagina() { return enPagina; },
    // En el descanso: lo que no tapar (un selector, o null).
    get evitar() { return evitar; },
    set evitar(sel) {
      if ((sel || null) === evitar) return;
      evitar = sel || null;
      calcular();
    },
    // Dónde está la cuenta atrás del descanso (para mirarla), en px de la ventana, o null.
    reloj() {
      const b = doc.getElementById("barra-descanso");
      if (!b || b.hidden) return null;
      const r = b.getBoundingClientRect();
      return r.height ? [r.left + 60, r.top + r.height / 2] : null;
    },
    set alCalcular(fn) { alCalcular = fn || (() => {}); },
    // En el entreno: solo el rincón.
    get rincon() { return rincon; },
    set rincon(si) {
      if (Boolean(si) === rincon) return;
      rincon = Boolean(si);
      calcular();
    },
    // Lo que la tapa entera (una hoja o el aviso de fin de descanso): mientras esté, no hace falta pintarla.
    tapada: () => Boolean(doc.querySelector(".capa-hoja, .capa-fin:not([hidden])")),
    // Aparece fundiéndose (al cambiar de sitio de golpe o al volver a salir).
    aparecer() {
      lienzo.getAnimations?.().forEach((a) => a.cancel());
      lienzo.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: "ease-out" });
    },
    quitar() {
      for (const q of quitar.splice(0)) q();
      lienzo.remove();
    },
  };
}
