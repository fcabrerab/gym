// Reordenar arrastrando (D-122), en una lista cuyas filas llevan data-orden="<clave>". Con el dedo: se mantiene
// pulsada una fila (MS_PULSAR) y se levanta; luego se arrastra. Con el ratón, basta con moverla con el botón pulsado.
// Las demás se apartan para dejarle sitio y, al soltar, alSoltar(clave, hasta) guarda el orden nuevo (y repinta).
// Un toque sigue siendo un toque y deslizar el dedo sigue moviendo la pantalla: solo una pulsación larga levanta la
// fila. Cerca de arriba o de abajo, la pantalla se desplaza sola. Las flechas siguen: son la forma de hacerlo con el
// teclado o un lector de pantalla.

const MS_PULSAR = 350; // ms con el dedo quieto para levantar la fila (antes de que el móvil saque su menú)
const TOLERANCIA_DEDO = 10; // px: si el dedo se mueve más antes de levantarla, está desplazando la pantalla
const UMBRAL_RATON = 6; // px: con el ratón, el arrastre empieza al moverlo así con el botón pulsado
const ZONA_BORDE = 72; // px bajo la cabecera o sobre la navegación donde la pantalla se desplaza sola
const VELOCIDAD_MAX = 16; // px por fotograma, con el dedo en el mismo borde
const MS_SIN_CLIC = 400; // tras soltar, el clic que pudiera llegar no abre la fila

export function hacerArrastrable(lista, { alSoltar, alLevantar = null }) {
  let pulsado = null; // {li, id, x0, y0, raton, temporizador}
  let arrastre = null; // {li, id, filas, desde, hasta, tops, altos, hueco, y0, y, scroll0, raf}

  const filas = () => [...lista.children].filter((el) => el.dataset.orden != null);

  const escuchas = [["pointermove", alMover], ["pointerup", alSoltarDedo], ["pointercancel", alCancelar], ["keydown", alTecla], ["blur", alCancelar]];
  const escuchar = (si) => {
    for (const [tipo, fn] of escuchas) {
      if (si) window.addEventListener(tipo, fn);
      else window.removeEventListener(tipo, fn);
    }
  };

  function alPulsar(ev) {
    if (pulsado || arrastre || ev.button !== 0 || !ev.isPrimary) return;
    if (ev.target.closest?.(".botones-orden, input, textarea, select, a")) return;
    const li = ev.target.closest?.("[data-orden]");
    if (!li || li.parentElement !== lista || filas().length < 2) return;
    const raton = ev.pointerType === "mouse";
    pulsado = { li, id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, raton, temporizador: null };
    if (!raton) pulsado.temporizador = setTimeout(levantar, MS_PULSAR);
    escuchar(true);
  }

  function alMover(ev) {
    if (arrastre) {
      if (ev.pointerId !== arrastre.id) return;
      arrastre.y = ev.clientY;
      colocar();
      return;
    }
    if (!pulsado || ev.pointerId !== pulsado.id) return;
    const d = Math.hypot(ev.clientX - pulsado.x0, ev.clientY - pulsado.y0);
    if (pulsado.raton) {
      if (d >= UMBRAL_RATON) {
        levantar();
        if (arrastre) {
          arrastre.y = ev.clientY;
          colocar();
        }
      }
    } else if (d > TOLERANCIA_DEDO) {
      terminar(); // desplaza la pantalla: no es un arrastre
    }
  }

  function levantar() {
    const p = pulsado;
    pulsado = null;
    if (!p) return;
    clearTimeout(p.temporizador);
    const todas = filas();
    const desde = todas.indexOf(p.li);
    if (!p.li.isConnected || desde < 0 || todas.length < 2) {
      terminar();
      return;
    }
    const rects = todas.map((el) => el.getBoundingClientRect());
    arrastre = {
      li: p.li, id: p.id, filas: todas, desde, hasta: desde,
      tops: rects.map((r) => r.top + window.scrollY), altos: rects.map((r) => r.height),
      hueco: Math.max(0, rects[1].top - rects[0].bottom),
      y0: p.y0, y: p.y0, scroll0: window.scrollY, raf: 0,
    };
    lista.classList.add("ordenando");
    p.li.classList.add("arrastrando");
    try {
      alLevantar?.();
    } catch {
      // La vibración es lo de menos.
    }
    colocar();
    arrastre.raf = requestAnimationFrame(desplazarSolo);
  }

  // La fila levantada sigue al dedo (sin salirse de la lista) y las demás se apartan para dejarle su hueco.
  function colocar() {
    const a = arrastre;
    if (!a) return;
    if (!a.li.isConnected) {
      alCancelar();
      return;
    }
    const n = a.filas.length;
    const ultimo = n - 1;
    const minimo = a.tops[0] - a.tops[a.desde];
    const maximo = a.tops[ultimo] + a.altos[ultimo] - (a.tops[a.desde] + a.altos[a.desde]);
    const dy = Math.min(maximo, Math.max(minimo, a.y - a.y0 + (window.scrollY - a.scroll0)));
    a.li.style.transform = `translateY(${dy}px) scale(1.02)`;
    // Cambia de puesto cuando su borde de delante (el de abajo al bajar, el de arriba al subir) pasa la mitad de otra
    // fila: así también llega al primer o al último puesto aunque sea más alta que las demás (un superset).
    const arriba = a.tops[a.desde] + dy;
    const abajo = arriba + a.altos[a.desde];
    let hasta = a.desde;
    for (let i = a.desde + 1; i < n; i += 1) if (a.tops[i] + a.altos[i] / 2 < abajo) hasta += 1;
    for (let i = 0; i < a.desde; i += 1) if (a.tops[i] + a.altos[i] / 2 > arriba) hasta -= 1;
    if (hasta === a.hasta) return;
    a.hasta = hasta;
    const paso = a.altos[a.desde] + a.hueco;
    for (let i = 0; i < n; i += 1) {
      if (i === a.desde) continue;
      let s = 0;
      if (a.desde < hasta && i > a.desde && i <= hasta) s = -paso;
      else if (hasta < a.desde && i >= hasta && i < a.desde) s = paso;
      a.filas[i].style.transform = s ? `translateY(${s}px)` : "";
    }
  }

  // Con el dedo cerca de arriba (bajo la cabecera) o de abajo (sobre la navegación), la pantalla se desplaza sola.
  function desplazarSolo() {
    const a = arrastre;
    if (!a) return;
    const arriba = (document.getElementById("cabecera")?.getBoundingClientRect().bottom ?? 0) + ZONA_BORDE;
    const abajo = (document.getElementById("nav")?.getBoundingClientRect().top ?? window.innerHeight) - ZONA_BORDE;
    let v = 0;
    if (a.y < arriba) v = -Math.ceil(VELOCIDAD_MAX * Math.min(1, (arriba - a.y) / ZONA_BORDE));
    else if (a.y > abajo) v = Math.ceil(VELOCIDAD_MAX * Math.min(1, (a.y - abajo) / ZONA_BORDE));
    if (v) {
      const antes = window.scrollY;
      window.scrollBy(0, v);
      if (window.scrollY !== antes) colocar();
    }
    if (arrastre === a) a.raf = requestAnimationFrame(desplazarSolo);
  }

  function alSoltarDedo(ev) {
    if (pulsado && ev.pointerId === pulsado.id) {
      terminar(); // un toque (o una pulsación corta): sigue su clic de siempre
      return;
    }
    const a = arrastre;
    if (!a || ev.pointerId !== a.id) return;
    sinClicDespues();
    if (a.hasta === a.desde || !a.li.isConnected) {
      devolver(a);
      return;
    }
    let hecho = false;
    try {
      hecho = alSoltar(a.li.dataset.orden, a.hasta) !== false;
    } finally {
      terminar();
      // Si no se ha repintado (no se pudo guardar), la fila vuelve a su sitio.
      if (!hecho || a.li.isConnected) devolver(a);
    }
  }

  function alCancelar(ev) {
    const activo = arrastre?.id ?? pulsado?.id;
    if (ev?.pointerId != null && ev.pointerId !== activo) return; // es de otro dedo
    const a = arrastre;
    terminar();
    if (a) {
      sinClicDespues();
      devolver(a);
    }
  }

  function alTecla(ev) {
    if (ev.key === "Escape" && arrastre) {
      ev.preventDefault();
      alCancelar();
    }
  }

  // Deja de seguir el dedo (sin tocar las filas).
  function terminar() {
    if (pulsado) clearTimeout(pulsado.temporizador);
    pulsado = null;
    if (arrastre) cancelAnimationFrame(arrastre.raf);
    arrastre = null;
    escuchar(false);
  }

  // Las filas vuelven a su sitio (deslizándose, salvo con «Reducir movimiento»: el CSS lo decide) y se limpian.
  function devolver(a) {
    a.li.classList.remove("arrastrando");
    a.li.classList.add("volviendo");
    for (const el of a.filas) el.style.transform = "";
    setTimeout(() => {
      if (arrastre) return; // otro arrastre en marcha en la misma lista: ya se limpiará al acabar ese
      lista.classList.remove("ordenando");
      for (const el of a.filas) el.classList.remove("volviendo");
    }, 220);
  }

  // Tras levantar una fila, el clic que pueda llegar al soltar (con el ratón, o tras una pulsación sin moverse) no la
  // abre: se lo queda esto, una sola vez y solo un momento.
  function sinClicDespues() {
    const hasta = performance.now() + MS_SIN_CLIC;
    const comer = (ev) => {
      document.removeEventListener("click", comer, true);
      if (performance.now() > hasta) return;
      ev.preventDefault();
      ev.stopPropagation();
    };
    document.addEventListener("click", comer, true);
    setTimeout(() => document.removeEventListener("click", comer, true), MS_SIN_CLIC);
  }

  lista.addEventListener("pointerdown", alPulsar);
  // Mientras se arrastra, el dedo no desplaza la pantalla (lo hace desplazarSolo). Tiene que estar puesto desde antes de
  // tocar (si no, el navegador ya no deja pararlo).
  lista.addEventListener("touchmove", (ev) => {
    if (arrastre && ev.cancelable) ev.preventDefault();
  }, { passive: false });
  // Ni el menú del móvil (mantener pulsado) ni arrastrar la imagen de la miniatura.
  lista.addEventListener("contextmenu", (ev) => {
    if (pulsado || arrastre) ev.preventDefault();
  });
  lista.addEventListener("dragstart", (ev) => ev.preventDefault());

  return {
    // Para las pruebas y por si la pantalla cambia a mitad: deja de arrastrar y devuelve las filas a su sitio.
    cancelar: () => alCancelar(),
    arrastrando: () => Boolean(arrastre),
  };
}
