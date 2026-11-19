// La beta (D-124): esta misma app copiada en beta/; aquí, con «?canal=beta». Lo dice arriba (con un enlace a la app
// normal), apunta la versión vista aparte (la normal no avisa de «actualizada» al volver a ella), no registra service
// worker propio (borraría las cachés de la normal) y en Ajustes dice que es la beta, sin «Buscar actualización».

import { datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const { caso, esperar, real, limpiarBeta, guardar, leerJson, cargarBeta, quitar, textoDe, sinErrores } = c;
  const { VERSION } = await import("/js/version.js");
  const preparar = async () => {
    await limpiarBeta();
    guardar("gym-beta-datos", await datosBeta());
    guardar("gym-beta-ui", { versionVista: "1.1.0", ayudaSerieVista: true });
  };

  // BT1-BT3 Lo que la distingue, con el service worker de verdad (sin «?sinsw»).
  {
    await preparar();
    const b = await cargarBeta({ canal: "beta", sinsw: false });
    await esperar(300);
    const marca = b.d.querySelector(".marca .marca-beta");
    caso(marca?.textContent === "BETA" && marca.getAttribute("href") === "../" && b.d.title === "Gym Beta" && b.d.documentElement.dataset.canal === "beta",
      "BT1 la beta lo dice arriba («BETA», con un enlace a la app normal) y en el título");
    const ui = leerJson("gym-beta-ui");
    const registros = await real(b.w.navigator.serviceWorker.getRegistrations());
    caso(ui.versionVista === "1.1.0" && ui.versionVistaBeta === VERSION && registros.length === 0,
      `BT2 apunta su versión aparte (la normal sigue en ${ui.versionVista}; la beta, ${ui.versionVistaBeta}) y no registra service worker (${registros.length})`);
    for (const r of registros) await real(r.unregister());
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    const ajustes = textoDe(b.d, ".pantalla-ajustes");
    caso(ajustes.includes(`Versión ${VERSION} (beta)`) && ajustes.includes("Es la beta") && !b.d.querySelector('[data-accion="buscar-actualizacion"]')
      && !b.d.getElementById("sin-conexion") && b.d.querySelector('.pantalla-ajustes a[href="../"]')?.textContent === "Ir a la app normal",
    "BT3 en Ajustes dice que es la beta, con «Ir a la app normal» (sin «Buscar actualización»)");
    sinErrores(b, "BT1-BT3");
    quitar(b);
  }

  // BT4 Sin «?canal=beta», la de siempre: sin «BETA», y su versión vista, la de siempre.
  {
    await preparar();
    const b = await cargarBeta();
    const ui = leerJson("gym-beta-ui");
    caso(!b.d.querySelector(".marca-beta") && b.d.title === "Gym" && ui.versionVista === VERSION && !("versionVistaBeta" in ui),
      "BT4 la app normal no dice «BETA» y apunta su versión vista como siempre");
    sinErrores(b, "BT4");
    quitar(b);
  }
}
