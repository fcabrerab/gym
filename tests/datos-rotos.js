// Datos dañados, de una versión más nueva y almacenamiento lleno (casos R1-R3), más la reparación de lo no esencial.

import { datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const { caso, esperar, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, textoDe, sinErrores, clavesBeta, hastaQueVirtual } = c;
  const fotoBeta = () => Object.fromEntries(clavesBeta().sort().map((k) => [k, localStorage.getItem(k)]));

  // R1 JSON roto
  {
    await limpiarBeta();
    const roto = '{"esquema":1,"dias":[{"id":"tuesday-push"';
    localStorage.setItem("gym-beta-datos", roto);
    const b = await cargarBeta();
    const rescates = clavesBeta().filter((k) => k.startsWith("gym-beta-rescate-"));
    caso(rescates.length === 1 && localStorage.getItem(rescates[0]) === roto, `R1 se guarda aparte, con el texto idéntico (${rescates.join(", ")})`);
    caso(localStorage.getItem("gym-beta-datos") === roto, "R1 gym-beta-datos no cambia");
    caso(b.listo === "error" && textoDe(b.d, "#pantalla").includes("No se han podido leer tus datos de la beta"), `R1 sale la pantalla y data-listo="${b.listo}"`);
    pulsar(b.d, "descargar-danados");
    await esperar(50);
    const descarga = b.espia.descargas[0];
    caso(descarga?.nombre?.startsWith("gym-beta-datos-danados-") && b.espia.blobs.length === 1 && (await c.real(b.espia.blobs[0].text())) === roto, `R1 «Descargar los datos dañados» baja el texto crudo (${descarga?.nombre})`);
    sinErrores(b, "R1");
    quitar(b);
    const b2 = await cargarBeta();
    caso(clavesBeta().filter((k) => k.startsWith("gym-beta-rescate-")).length === 1, "R1 al volver a abrir no se duplica el rescate");
    quitar(b2);
  }

  // R2 Esquema más nuevo
  {
    await limpiarBeta();
    const nuevo = await datosBeta();
    nuevo.esquema = 99;
    guardar("gym-beta-datos", nuevo);
    const antes = fotoBeta();
    const b = await cargarBeta();
    caso(textoDe(b.d, "#pantalla").includes("Estos datos son de una versión más nueva de la beta. Recarga para actualizar.") && b.listo === "error",
      "R2 con esquema 99 sale el aviso de versión más nueva");
    caso(JSON.stringify(fotoBeta()) === JSON.stringify(antes), "R2 sin escribir nada");
    sinErrores(b, "R2");
    quitar(b);
  }

  // R3 Almacenamiento lleno al guardar una serie
  {
    await limpiarBeta();
    guardar("gym-beta-datos", await datosBeta());
    const b = await cargarBeta();
    const original = b.w.Storage.prototype.setItem;
    b.w.Storage.prototype.setItem = function lleno(clave, valor) {
      if (String(clave).startsWith("gym-beta-")) throw new b.w.DOMException("Lleno", "QuotaExceededError");
      return original.call(this, clave, valor);
    };
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    const aviso = textoDe(b.d, "#avisos .aviso-texto");
    caso(aviso === "No se ha podido guardar: el almacenamiento del navegador está lleno. Guarda una copia en Ajustes y apunta el fallo.", `R3 sale el aviso: «${aviso}»`);
    caso(b.espia.todosLosErrores().length === 0, `R3 sin excepciones sin atrapar (${b.espia.todosLosErrores().join(" | ") || "0"})`);
    b.w.Storage.prototype.setItem = original;
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    caso(Boolean(leerJson("gym-beta-sesion")), "R3 con sitio otra vez, la serie se guarda");
    quitar(b);
  }

  // R4 Lo no esencial con forma rara se aparta (no se pierde)
  {
    await limpiarBeta();
    const datos = await datosBeta();
    datos.sesiones = [{ id: "rara", sin: "forma" }];
    delete datos.ajustes;
    guardar("gym-beta-datos", datos);
    const b = await cargarBeta();
    await hastaQueVirtual(() => textoDe(b.d, "#avisos").length > 0, 500);
    caso(b.listo === "1" && textoDe(b.d, "#avisos").includes("1 sesión con datos raros no se muestra."), `R4 arranca y avisa: «${textoDe(b.d, "#avisos")}»`);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(50);
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    b.d.querySelector('[data-ajuste="vibracion"]').click();
    await esperar(50);
    const guardados = leerJson("gym-beta-datos");
    caso(guardados.descartado?.[0]?.valor?.id === "rara" && guardados.ajustes?.vibracion === false && guardados.ajustes?.timerSound === true,
      "R4 la sesión rara queda apartada en «descartado» y los ajustes que faltaban vuelven con sus valores");
    sinErrores(b, "R4");
    quitar(b);
  }

  // R5 Lo esencial roto (un día sin ejercicios en lista) también va a rescate
  {
    await limpiarBeta();
    const datos = await datosBeta();
    datos.dias[0].ejercicios = "nada";
    guardar("gym-beta-datos", datos);
    const b = await cargarBeta();
    caso(b.listo === "error" && clavesBeta().some((k) => k.startsWith("gym-beta-rescate-")), "R5 datos con un día roto: pantalla de error y rescate");
    quitar(b);
  }
}
