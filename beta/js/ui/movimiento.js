// Transiciones cortas (D-122): en vez de saltar, lo que cambia de sitio se desliza y una tarjeta que se abre o se
// cierra se despliega o se repliega. Es la técnica FLIP: antes del cambio se apunta dónde está cada pieza (foto());
// el cambio se hace al momento, como siempre (la página queda ya como debe: nada espera a la animación); y después
// (animar()) cada pieza sale de donde estaba y llega a su sitio en DURACION ms.
// Una tarjeta que se ha vuelto a pintar (otra caja, con otro alto) se funde desde la vieja: un «fantasma» con lo que
// tenía, sin botones ni campos (ni se toca ni lo lee un lector de pantalla), que se desvanece encima mientras el alto
// pasa del viejo al nuevo. Nada frena los toques: lo que se ve moverse es lo de verdad y el fantasma los deja pasar.
// Con «Reducir movimiento» no se anima nada (todo queda como antes de la 1.1.0: al momento).

export const DURACION = 200; // ms: corto, para que no frene en el gimnasio
const CURVA = "cubic-bezier(.2, 0, 0, 1)"; // arranca deprisa y frena al llegar
const ID = "movimiento"; // así se reconocen (y se cancelan) las animaciones de aquí
// Lo que sale por fuera de una tarjeta: el aro de luz del ejercicio abierto y su resplandor (styles.css, «Lo de la
// 0.2.4»). Al recortar la tarjeta mientras se despliega, se deja este margen para no cortarlos.
const MARGEN = 16;

let capa = null;

// ¿Se anima? No con «Reducir movimiento» ni en un navegador sin animaciones de JavaScript. Se pregunta cada vez (las
// pruebas lo cambian, y el móvil también, sin recargar).
export function animacionesActivas() {
  if (typeof Element === "undefined" || typeof Element.prototype.animate !== "function") return false;
  try {
    return !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  } catch {
    return true;
  }
}

// La foto: dónde está cada pieza ahora (tal como se ve, también a mitad de otra transición). «piezas», pares
// [clave, elemento]; la clave dice qué pieza nueva es la misma que una vieja. Sin animaciones, null (y animar() no
// hace nada).
export function foto(piezas) {
  if (!animacionesActivas()) return null;
  const m = new Map();
  for (const [clave, el] of piezas) {
    if (clave != null && el?.isConnected) m.set(String(clave), { el, rect: el.getBoundingClientRect() });
  }
  return m;
}

// Tras el cambio: cada pieza con la misma clave que en la foto sale de donde estaba y llega a su sitio. Con
// {fantasmas: true}, las que se han vuelto a pintar (otro elemento) se funden desde la vieja y su alto se anima.
export function animar(antes, piezas, { fantasmas = false } = {}) {
  if (!antes?.size || !animacionesActivas()) return;
  try {
    const lista = [...piezas].filter(([clave, el]) => clave != null && el?.isConnected);
    // Lo que quedaba de la transición anterior (si se toca deprisa) se quita antes de medir: así se mide dónde va
    // cada pieza de verdad. La foto ya se hizo con lo que se veía, así que no hay salto.
    quitarFantasmas();
    for (const [, el] of lista) cancelarEn(el);
    // Primero se mide todo; luego se anima (una animación empezada no cambia lo que se mide de las otras).
    const medidas = [];
    for (const [clave, el] of lista) {
      const a = antes.get(String(clave));
      if (a) medidas.push({ el, a, ahora: el.getBoundingClientRect() });
    }
    for (const { el, a, ahora } of medidas) {
      const dx = a.rect.left - ahora.left;
      const dy = a.rect.top - ahora.top;
      const dh = ahora.height - a.rect.height;
      const nueva = fantasmas && a.el !== el && !a.el.isConnected;
      if (!nueva && Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      const pasos = [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }];
      if (nueva && dh > 0.5) {
        // Crece: se va descubriendo hacia abajo, como si se desplegara.
        pasos[0].clipPath = `inset(${-MARGEN}px ${-MARGEN}px ${dh}px ${-MARGEN}px)`;
        pasos[1].clipPath = `inset(${-MARGEN}px)`;
      }
      marcarMientras(el, el.animate(pasos, { duration: DURACION, easing: CURVA, id: ID }));
      if (nueva) ponerFantasma(a.el, a.rect, ahora, dx, dy, dh);
    }
  } catch {
    // Si una animación falla, no pasa nada: la página ya está como debe (solo se pierde el movimiento).
  }
}

function cancelarEn(el) {
  for (const animacion of el.getAnimations?.() || []) {
    if (animacion.id === ID) animacion.cancel();
  }
}

// Mientras se mueve, la pieza lleva la clase «en-movimiento». Una pieza movida (con transform) hace de capa propia, y
// el resplandor del aro del ejercicio abierto (detrás de la tarjeta, z-index −1) se pintaría encima de su fondo: el
// CSS lo esconde con esa clase, solo esos 0,2 s.
function marcarMientras(el, animacion) {
  el.classList.add("en-movimiento");
  const fin = () => {
    const otra = el.getAnimations?.().some((x) => x !== animacion && x.id === ID && (x.playState === "running" || x.playState === "paused"));
    if (!otra) el.classList.remove("en-movimiento");
  };
  animacion.finished.then(fin, fin);
}

// La capa de los fantasmas: fija, encima de la pantalla pero debajo de la cabecera, la navegación, la barra de descanso
// y las hojas (styles.css); no recoge toques y no la lee un lector de pantalla.
function capaFantasmas() {
  if (capa?.isConnected) return capa;
  capa = document.createElement("div");
  capa.className = "capa-movimiento";
  capa.setAttribute("aria-hidden", "true");
  capa.inert = true;
  document.body.append(capa);
  return capa;
}

export function quitarFantasmas() {
  capa?.replaceChildren();
}

// Lo que se veía de una tarjeta vuelta a pintar (el elemento viejo, ya fuera de la página): se pone donde está la
// nueva, se mueve con ella y se desvanece encima; si la nueva es más baja, además se va recortando hasta su alto
// (como si se plegara). Sin nada que se pueda tocar, enfocar o encontrar: ni botones con acción ni ids.
function ponerFantasma(viejo, rectAntes, ahora, dx, dy, dh) {
  const f = document.createElement("div");
  f.className = viejo.className;
  f.classList.remove("abierto", "arrastrando");
  f.classList.add("fantasma");
  f.append(...viejo.childNodes);
  for (const n of f.querySelectorAll("[id], [for], [data-accion], [data-ej], [data-campo], [data-id], [data-orden]")) {
    for (const atributo of ["id", "for", "data-accion", "data-ej", "data-campo", "data-id", "data-orden"]) n.removeAttribute(atributo);
  }
  f.style.left = `${ahora.left}px`;
  f.style.top = `${ahora.top}px`;
  f.style.width = `${ahora.width}px`;
  f.style.height = `${rectAntes.height}px`;
  capaFantasmas().append(f);
  const pliega = dh < -0.5;
  const pasos = [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }];
  if (pliega) {
    pasos[0].clipPath = `inset(${-MARGEN}px ${-MARGEN}px 0px ${-MARGEN}px)`;
    pasos[1].clipPath = `inset(${-MARGEN}px ${-MARGEN}px ${-dh}px ${-MARGEN}px)`;
  }
  const quitar = () => f.remove();
  try {
    f.animate(pasos, { duration: DURACION, easing: CURVA, id: ID }).finished.then(quitar, quitar);
    // El desvanecido, aparte. Si la nueva es más alta, lo viejo (la fila replegada) se iría superponiendo a su
    // cabecera: se va enseguida. Si es más baja, primero se ve plegarse y luego se desvanece sobre la fila nueva.
    f.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: DURACION * (pliega ? 0.65 : 0.45), delay: pliega ? DURACION * 0.35 : 0, easing: "ease-out", fill: "both", id: ID,
    });
  } catch {
    quitar();
  }
  setTimeout(quitar, DURACION + 400); // por si la animación no llega a acabar (pestaña en segundo plano)
}
