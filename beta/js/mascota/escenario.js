// El escenario de la mascota en la app (D-133): dónde puede ponerse y cómo se la ve.
// - Sus superficies: los tramos libres del borde de arriba de cada tarjeta, donde, de pie, no tapa nada (ni texto, ni
//   botones, ni otra tarjeta). Si no hay ninguno, o se está entrenando (el «rincón»), el de abajo a la derecha, encima de
//   la barra de abajo (la del descanso, si se ve; si no, la de las pestañas): allí se asoma y casi no tapa nada.
// - La franja donde se ve: entre la cabecera y esa barra (fuera de ella queda detrás, como si pasara por debajo).
// - Su lienzo: pequeño, encima de la app (por debajo de las hojas y los avisos), y va con ella.
// - Los toques: si la tocas a ella, el toque es suyo (no pulsa lo que haya debajo); si no, solo mira hacia allí.
// No decide qué hace (eso es el cerebro) y nunca toca la app: solo la mira.

// Las tarjetas de la app: las de fuera (una dentro de otra no cuenta).
export const SUELOS = ".tarjeta, .seccion, .ej, .fila, .fila-con-boton, .fila-estatica, .fila-superset, .tarjeta-destacada";
// Lo que, fuera de una tarjeta, no hay que tapar (además del texto).
export const CONTROLES = "button, a[href], input, select, textarea, label, img, svg, canvas, video, [role='button']";
// Lo que queda por encima de ella: un toque ahí no es para ella.
const TAPAN = ".capa-hoja, .capa-fin, .avisos, .nav, .cabecera, .barra-descanso";
const AIRE = 6;       // px entre ella y lo que no tapa
const RINCON = 96;    // px de ancho del rincón
const DESPLAZAR = 280; // ms quieta la pantalla antes de volver a mirar dónde hay sitio

// ¿Se ve la caja de este control (fondo, borde o sombra), o solo lo que lleva dentro? Las imágenes y los campos, siempre.
function conCaja(el) {
  if (el.matches("img, svg, canvas, video, input, select, textarea")) return true;
  const cs = el.ownerDocument.defaultView.getComputedStyle(el);
  const transparente = (c) => c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c);
  return !transparente(cs.backgroundColor) || cs.boxShadow !== "none"
    || ["Top", "Right", "Bottom", "Left"].some((l) => parseFloat(cs[`border${l}Width`]) > 0 && cs[`border${l}Style`] !== "none" && !transparente(cs[`border${l}Color`]));
}

// Las superficies libres, en px de la ventana. raiz: donde están las pantallas (#pantalla); abajo: la barra de abajo
// (su borde de arriba también es suelo si encima no hay nada); region: { y1, y2 }, donde se ve; alto: lo que mide de
// pie, en px; idDe(el): un número fijo por elemento (para que su superficie siga siendo la misma).
export function calcularSuperficies({ raiz, abajo = null, region, alto, anchoMin = 46, idDe }) {
  const visible = (r) => r.width > 0 && r.height > 0 && r.bottom > region.y1 - alto && r.top < region.y2 + alto;
  const caja = (el, r) => ({ el, l: r.left, r: r.right, t: r.top, b: r.bottom });
  const obstaculos = [];
  const tarjetas = [];
  const rango = raiz.ownerDocument.createRange();
  // Las tarjetas (las de fuera) cuentan enteras; fuera de ellas, cada línea de texto y cada control.
  const recorrer = (padre) => {
    for (let n = padre.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) {
        if (!n.nodeValue.trim()) continue;
        rango.selectNodeContents(n);
        for (const r of rango.getClientRects()) if (visible(r)) obstaculos.push(caja(null, r));
      } else if (n.nodeType === 1) {
        const r = n.getBoundingClientRect();
        if (n.matches(SUELOS)) {
          if (!visible(r)) continue;
          obstaculos.push(caja(n, r));
          tarjetas.push({ el: n, r });
        } else if (n.matches(CONTROLES)) {
          if (!visible(r)) continue;
          // Un botón o un enlace sin fondo ni borde (como un texto): cuenta lo que lleva dentro, no su caja entera.
          if (conCaja(n)) obstaculos.push(caja(n, r));
          else recorrer(n);
        } else if (visible(r) || (r.width === 0 && r.height === 0)) {
          recorrer(n);
        }
      }
    }
  };
  recorrer(raiz);

  const superficies = [];
  const tramos = (el, y, x1, x2, c1, c2, tipo) => {
    if (y - alto < region.y1 || y > region.y2 + 0.5) return; // de pie, se le saldría la cabeza por arriba
    let libres = [[x1, x2]];
    for (const o of obstaculos) {
      if (o.el && (o.el === el || o.el.contains(el))) continue;
      if (o.b <= y - alto || o.t >= y - 0.5) continue; // no toca la franja de encima
      const a = o.l - AIRE;
      const b = o.r + AIRE;
      libres = libres.flatMap(([p, q]) => (b <= p || a >= q ? [[p, q]] : [[p, Math.min(q, a)], [Math.max(p, b), q]].filter(([u, v]) => v - u > 0)));
      if (!libres.length) return;
    }
    libres.forEach(([p, q], i) => {
      if (q - p >= anchoMin) superficies.push({ id: `${tipo}-${idDe(el)}-${i}`, el, x1: p, x2: q, y, c1, c2, tipo });
    });
  };
  for (const { el, r } of tarjetas) tramos(el, r.top, r.left + 8, r.right - 8, r.left, r.right, "tarjeta");
  if (abajo) {
    const r = abajo.getBoundingClientRect();
    if (r.height > 0) tramos(abajo, r.top, r.left + 12, r.right - 12, r.left, r.right, "abajo");
  }
  return superficies;
}

// alto(): lo que mide de pie, en px (cambia con su tamaño).
export function crearEscenario({ doc = document, win = window, alto, anchoMin = 46 } = {}) {
  const pantalla = doc.getElementById("pantalla");
  const cabecera = doc.getElementById("cabecera");
  const nav = doc.getElementById("nav");
  const barra = doc.getElementById("barra-descanso");
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
  let pendiente = 0;
  let desplazando = 0;
  let lado = 0;
  let dpr = 1;
  let colocado = null;
  let alCalcular = () => {};
  const quitar = [];

  const barraAbajo = () => (barra && !barra.hidden && barra.offsetHeight > 0 ? barra : nav);
  function medirRegion() {
    const c = cabecera?.getBoundingClientRect();
    const b = barraAbajo()?.getBoundingClientRect();
    region = { y1: Math.max(0, c && c.height ? c.bottom : 0), y2: b && b.height ? b.top : win.innerHeight };
    return region;
  }
  function rinconAhora() {
    const b = barraAbajo()?.getBoundingClientRect();
    const ancho = doc.documentElement.clientWidth;
    const der = (b && b.width ? b.right : ancho) - 10;
    return { id: "rincon", el: null, x1: der - RINCON, x2: der, y: region.y2, c1: 0, c2: ancho, tipo: "rincon" };
  }
  function calcular() {
    win.clearTimeout(pendiente);
    pendiente = 0;
    medirRegion();
    let libres = [];
    if (!rincon && pantalla) {
      libres = calcularSuperficies({ raiz: pantalla, abajo: barraAbajo(), region, alto: alto(), anchoMin, idDe });
    }
    lista = libres.length ? libres : [rinconAhora()];
    alCalcular(lista);
  }
  // Volver a mirar dónde hay sitio, dentro de «ms» (si ya está pedido, vale ese).
  function pedir(ms = 120) {
    if (pendiente) return;
    pendiente = win.setTimeout(calcular, ms);
  }
  // En cada fotograma: la franja y la «y» de cada superficie, al día (si se desplaza la pantalla, van con su tarjeta).
  function ponerAlDia() {
    medirRegion();
    let falta = false;
    for (const s of lista) {
      if (s.tipo === "rincon") s.y = region.y2;
      else if (s.el?.isConnected) s.y = s.el.getBoundingClientRect().top;
      else falta = true;
    }
    if (falta) {
      lista = lista.filter((s) => s.tipo === "rincon" || s.el?.isConnected);
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
  if (barra) vigia.observe(barra, { attributes: true, attributeFilter: ["hidden"] });
  vigia.observe(doc.body, { attributes: true, attributeFilter: ["data-pantalla"] });
  quitar.push(() => vigia.disconnect());
  // Por si algo cambia sin avisar (una animación que acaba, una imagen que carga): cada 2 s, otra vez.
  const cada = win.setInterval(() => {
    if (!desplazando && !doc.hidden) calcular();
  }, 2000);
  quitar.push(() => win.clearInterval(cada), () => win.clearTimeout(pendiente), () => win.clearTimeout(desplazando));

  // Los toques: contiene(x, y) dice si es en ella; tocar(x, y), que la han tocado; mirar(x, y), que mire hacia allí.
  function escucharToques({ contiene, tocar, mirar }) {
    let tocada = -1;
    const alBajar = (ev) => {
      if (!ev.isPrimary || lienzo.hidden) return;
      const x = ev.clientX;
      const y = ev.clientY;
      const tapa = doc.elementFromPoint(x, y)?.closest?.(TAPAN);
      if (!tapa && y > region.y1 && y < region.y2 && contiene(x, y)) {
        tocada = ev.timeStamp;
        tocar(x, y);
      } else {
        tocada = -1;
        mirar(x, y);
      }
    };
    // El toque que fue para ella no pulsa lo que haya debajo.
    const alPulsar = (ev) => {
      if (tocada >= 0 && ev.timeStamp - tocada < 800) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      tocada = -1;
    };
    const alCancelar = () => { tocada = -1; };
    win.addEventListener("pointerdown", alBajar, { capture: true, passive: true });
    win.addEventListener("click", alPulsar, { capture: true });
    win.addEventListener("pointercancel", alCancelar, { capture: true, passive: true });
    quitar.push(() => {
      win.removeEventListener("pointerdown", alBajar, { capture: true });
      win.removeEventListener("click", alPulsar, { capture: true });
      win.removeEventListener("pointercancel", alCancelar, { capture: true });
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
  // Pone el lienzo donde está ella (centrado en su cuerpo) y devuelve dónde cae su esquina, en px de la ventana.
  function colocar(f) {
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
    const cx = f.raiz[0] + ((x0 + x1) / 2) * f.escala;
    const cy = f.raiz[1] + ((y0 + y1) / 2) * f.escala;
    const origen = [Math.round(cx - lado / 2), Math.round(cy - lado / 2)];
    if (!colocado || colocado[0] !== origen[0] || colocado[1] !== origen[1]) {
      lienzo.style.transform = `translate3d(${origen[0]}px, ${origen[1]}px, 0)`;
      colocado = origen;
    }
    return origen;
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
