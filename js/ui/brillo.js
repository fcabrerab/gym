// El brillo de la 0.2.4 (prueba): una vuelta de luz de colores alrededor de lo que se acaba de elegir. Un interruptor
// al encenderse, una opción («Tema» en Ajustes) o un selector (Sesiones/Ejercicios, el tipo de ejercicio). El aro y su
// vuelta están en styles.css («Lo de la 0.2.4»): aquí solo se pone la clase «destello» un momento. El ejercicio
// abierto de Entreno lleva su aro sin JavaScript.

const MS_DESTELLO = 1000; // la vuelta dura 0,9 s (styles.css)
const temporizadores = new WeakMap();

// Da una vuelta de luz alrededor de «el». Si ya la estaba dando, empieza otra.
export function destellar(el) {
  if (!el?.isConnected) return;
  clearTimeout(temporizadores.get(el));
  el.classList.remove("destello");
  void el.offsetWidth; // sin esto, quitar y poner la clase seguidas no vuelve a empezar la animación
  el.classList.add("destello");
  temporizadores.set(el, setTimeout(() => {
    el.classList.remove("destello");
    temporizadores.delete(el);
  }, MS_DESTELLO));
}

// Escucha en todo el documento (también las hojas), después de que la app haya hecho lo suyo: si al elegir se volvió
// a pintar la pantalla, brilla el elemento nuevo que hace lo mismo y quedó elegido.
export function montarBrillo(doc = document) {
  doc.addEventListener("change", (ev) => {
    const el = ev.target;
    if (el?.classList?.contains("interruptor") && el.checked) destellar(el);
  });
  doc.addEventListener("click", (ev) => {
    const el = ev.target?.closest?.(".opcion, .selector-opcion");
    if (!el || el.disabled) return;
    const elegido = el.isConnected ? el : equivalente(doc, el);
    if (elegido?.classList.contains("activa")) destellar(elegido);
  });
}

function equivalente(doc, el) {
  const { accion, valor } = el.dataset;
  if (!accion) return null;
  const selector = `[data-accion="${CSS.escape(accion)}"]${valor == null ? "" : `[data-valor="${CSS.escape(valor)}"]`}`;
  return doc.querySelector(`.opcion${selector}, .selector-opcion${selector}`);
}
