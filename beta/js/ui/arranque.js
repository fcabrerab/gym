// Pantallas del arranque: «Preparando la beta…», el resultado de la primera vez, el fallo de red, los datos
// dañados y los datos de una versión más nueva. Las acciones las maneja app.js.

import { h, icono, vaciar } from "./dom.js";
import { boton, ayuda } from "./piezas.js";
import { NOVEDADES } from "../version.js";
import { formatoNumero } from "../util.js";

const contar = (n, uno, varios) => `${formatoNumero(n)} ${n === 1 ? uno : varios}`;

export function pintarPreparando(contenedor) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "status" },
    h("p", { class: "arranque-titulo" }, "Preparando la beta…"),
    ayuda("Copiando tu rutina de la versión normal.")));
}

// La primera vez. Con {permiso: "default"} ofrece permitir los avisos (es lo que avisa con el móvil bloqueado), fuera
// de cualquier serie; con {borrado: true} (se acaba de borrar todo) ofrece recuperar lo de antes.
export function pintarPrimeraVez(contenedor, r, { permiso = null, borrado = false } = {}) {
  const cifras = `${contar(r.resumen.dias, "día", "días")}, ${contar(r.resumen.distintos, "ejercicio", "ejercicios")} y ${contar(r.resumen.marcas, "marca", "marcas")}`;
  const texto = r.origen === "normal"
    ? `Hemos copiado tu rutina de la versión normal: ${cifras}. Lo que hagas aquí no cambia la versión normal.`
    : `La versión normal no tenía datos en este móvil: se usa la rutina publicada (${cifras}). Lo que hagas aquí no cambia la versión normal.`;
  const novedades = NOVEDADES[0]?.cambios || [];
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque" },
    h("h1", { class: "titulo-pantalla" }, "Esta es la beta de tu app del gimnasio"),
    h("p", { class: "arranque-texto", "data-resumen": "1" }, texto),
    r.avisos?.length ? h("details", { class: "detalles" }, h("summary", null, `Detalles de la copia (${r.avisos.length})`),
      h("ul", { class: "lista-avisos" }, r.avisos.map((a) => h("li", null, a)))) : null,
    borrado ? h("section", { class: "tarjeta tarjeta-aviso" },
      h("p", { class: "arranque-texto" }, "¿Has borrado los datos de la beta sin querer? Antes de borrar se guardó una copia automática."),
      boton("Recuperar los datos de antes de borrar", "recuperar-borrado", { clase: "boton-secundario boton-ancho" })) : null,
    permiso === "default" ? h("section", { class: "tarjeta", id: "tarjeta-permiso" },
      h("p", { class: "arranque-texto" }, "¿Quieres que te avise del fin del descanso aunque el móvil esté bloqueado o con otra app delante?"),
      boton("Permitir avisos", "permitir-avisos", { clase: "boton-secundario boton-ancho", ico: "campana" })) : null,
    // «Empezar» antes de las novedades: así se ve sin desplazar.
    boton("Empezar", "empezar", { clase: "boton-principal boton-ancho" }),
    ayuda("Para volver a la versión normal, usa el enlace de arriba."),
    novedades.length ? h("section", { class: "tarjeta" }, h("h2", { class: "tarjeta-titulo" }, "Qué tiene de nuevo"),
      h("ul", { class: "lista-novedades" }, novedades.map((c) => h("li", null, c)))) : null));
}

// Después de pedir el permiso desde la primera vez: lo que ha pasado, en la misma tarjeta.
export function pintarPermisoPedido(permiso) {
  const tarjeta = document.getElementById("tarjeta-permiso");
  if (!tarjeta) return;
  vaciar(tarjeta).append(h("p", { class: "arranque-texto" }, permiso === "granted"
    ? "Hecho: te avisaré al acabar cada descanso, también con el móvil bloqueado."
    : "Sin permiso, el aviso solo sale con la app a la vista. Puedes darlo luego en Ajustes."));
}

// Pantalla para cuando el index.html y el JavaScript son de versiones distintas (justo después de publicar una
// versión nueva): no se arranca a medias; se recarga para tener la nueva entera.
export function pintarDesfase(contenedor) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "status" },
    h("h1", { class: "titulo-pantalla" }, "Hay una versión nueva de la beta"),
    h("p", { class: "arranque-texto" }, "Se está poniendo al día. Si no se recarga sola en unos segundos, pulsa Recargar."),
    boton("Recargar", "recargar", { clase: "boton-principal boton-ancho" }),
    ayuda("Mientras tanto, la versión normal funciona igual (enlace de arriba).")));
}

// Una pantalla que no se ha podido pintar (datos con una forma rara que se ha colado): se dice, en vez de dejar la
// anterior a medias.
export function pintarErrorPantalla(contenedor, { enEntreno = false } = {}) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "alert" },
    h("p", { class: "arranque-icono" }, icono("alerta", { tamano: 40 })),
    h("h1", { class: "titulo-pantalla" }, "No se ha podido abrir esta pantalla"),
    h("p", { class: "arranque-texto" }, "Algún dato tiene una forma rara. Tus datos siguen guardados: puedes guardar una copia en Ajustes y apuntar el fallo tocando «BETA» arriba."),
    enEntreno
      ? boton("Ir a Ajustes", "error-ajustes", { clase: "boton-principal boton-ancho" })
      : boton("Volver a Entreno", "error-volver", { clase: "boton-principal boton-ancho" })));
}

export function pintarErrorRed(contenedor, texto) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "alert" },
    h("h1", { class: "titulo-pantalla" }, "No se ha podido preparar la beta"),
    h("p", { class: "arranque-texto" }, texto),
    boton("Reintentar", "reintentar", { clase: "boton-principal boton-ancho" })));
}

export function pintarDanados(contenedor) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "alert" },
    h("p", { class: "arranque-icono" }, icono("alerta", { tamano: 40 })),
    h("h1", { class: "titulo-pantalla" }, "No se han podido leer tus datos de la beta"),
    h("p", { class: "arranque-texto" }, "Se han guardado aparte, sin tocarlos, por si hacen falta."),
    boton("Buscar copias automáticas", "buscar-copias-danados", { clase: "boton-principal boton-ancho" }),
    h("div", { id: "copias-danados", class: "copias-auto" }),
    boton("Descargar los datos dañados", "descargar-danados", { clase: "boton-secundario boton-ancho", ico: "descargar" }),
    boton("Empezar de nuevo copiando la versión normal", "empezar-de-nuevo", { clase: "boton-secundario boton-ancho" }),
    ayuda("La versión normal no se ve afectada.")));
}

export function pintarEsquemaNuevo(contenedor) {
  vaciar(contenedor).append(h("div", { class: "pantalla-arranque", role: "alert" },
    h("h1", { class: "titulo-pantalla" }, "Datos de una versión más nueva"),
    h("p", { class: "arranque-texto" }, "Estos datos son de una versión más nueva de la beta. Recarga para actualizar."),
    boton("Recargar", "recargar", { clase: "boton-principal boton-ancho" })));
}
