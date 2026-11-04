// Vigía del arranque (script clásico, no módulo): si los módulos de la beta no llegan (mala cobertura la primera
// vez, antes de que el service worker los guarde), en vez de quedarse en «Cargando la beta…» para siempre, dice que no
// se ha podido abrir y ofrece volver a intentarlo o ir a la versión normal. app.js pone data-modulos en cuanto llega.
(function vigia() {
  var raiz = document.documentElement;
  var hecho = false;

  function fallo() {
    if (hecho || raiz.dataset.modulos || raiz.dataset.listo) return;
    hecho = true;
    // Un corte suelto (mala cobertura) suele arreglarse recargando: se reintenta solo una vez. Si esta carga ya era
    // una recarga, no se insiste (nada de bucles) y se dice.
    var navegacion = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    if (navegacion && navegacion.type !== "reload") {
      location.reload();
      return;
    }
    var pantalla = document.getElementById("pantalla") || document.body;
    var caja = document.createElement("div");
    caja.className = "pantalla-arranque";
    caja.setAttribute("role", "alert");
    var titulo = document.createElement("h1");
    titulo.className = "titulo-pantalla";
    titulo.textContent = "No se ha podido abrir la beta";
    var texto = document.createElement("p");
    texto.className = "arranque-texto";
    texto.textContent = "Puede que falte conexión. Vuelve a intentarlo; mientras tanto, la versión normal funciona igual.";
    var reintentar = document.createElement("button");
    reintentar.type = "button";
    reintentar.className = "boton boton-principal boton-ancho";
    reintentar.textContent = "Volver a intentarlo";
    reintentar.addEventListener("click", function recargar() { location.reload(); });
    var normal = document.createElement("a");
    normal.className = "enlace-boton";
    normal.href = "../?normal";
    normal.textContent = "Usar la versión normal";
    caja.append(titulo, texto, reintentar, normal);
    pantalla.replaceChildren(caja);
    raiz.dataset.listo = "error";
  }

  // El <script type="module"> avisa con «error» si no llega él o alguno de sus módulos.
  window.addEventListener("error", function alError(ev) {
    var el = ev.target;
    if (el && el.tagName === "SCRIPT" && el.type === "module") fallo();
  }, true);
  setTimeout(fallo, 8000);
}());
