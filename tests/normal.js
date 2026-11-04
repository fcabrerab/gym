// Equivalencia con la normal de verdad (casos N1-N8): la fusión de la beta da lo mismo que la exportación de la normal;
// la normal importa la copia de la beta (N9); y las claves de la normal no cambian (N10).
// Va la última: la normal registra su service worker (alcance /) y desde entonces controla también /beta/.

import { base, diffsNormal, conImagenesLocales, datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const { caso, nota, esperar, real, hastaQue, hastaQueVirtual, limpiarBeta, guardar, leerNormal, CLAVES_NORMAL, cargarNormal, cargarBeta, quitar, pulsar, textoDe, sinErrores } = c;
  const { rutina, ejercicios } = await base();
  const normal = await import("/beta/js/normal.js");
  const copias = await import("/beta/js/copias.js");

  const espiarNormal = (f) => {
    const w = f.contentWindow;
    const d = f.contentDocument;
    const e = { alertas: [], blobs: [], input: null };
    w.confirm = () => true;
    w.alert = (m) => e.alertas.push(String(m));
    w.URL.createObjectURL = (b) => { e.blobs.push(b); return "about:blank"; };
    w.URL.revokeObjectURL = () => {};
    const crear = d.createElement.bind(d);
    d.createElement = (tag, ...resto) => {
      const el = crear(tag, ...resto);
      if (/^(input|a)$/i.test(String(tag))) el.click = () => {};
      if (/^input$/i.test(String(tag))) e.input = el;
      return el;
    };
    return e;
  };
  const exportarNormal = async (f, e) => {
    f.contentDocument.getElementById("exportBtnGlobal").click();
    await esperar(50);
    return JSON.parse(await real(e.blobs[e.blobs.length - 1].text()));
  };
  const limpio = (v) => JSON.parse(JSON.stringify(v));

  // N1-N8
  const diffs = await diffsNormal();
  for (const [nombre, diff] of Object.entries(diffs)) {
    for (const k of CLAVES_NORMAL) localStorage.removeItem(k);
    const conImagenes = await conImagenesLocales(diff);
    guardar("gym-routine-data-v1", conImagenes);
    const f = await cargarNormal();
    const e = espiarNormal(f);
    const exportada = await exportarNormal(f, e);
    const beta = normal.fusionarComoLaNormal(conImagenes, rutina, ejercicios);
    const igualDias = JSON.stringify(limpio(exportada.days)) === JSON.stringify(limpio(beta.days));
    const igualAjustes = JSON.stringify(limpio(exportada.settings)) === JSON.stringify(limpio(beta.settings));
    caso(igualDias && igualAjustes, `${nombre} la fusión de la beta da lo mismo que la normal (${beta.days.length} días, ${beta.days.reduce((n, d) => n + d.exercises.length, 0)} entradas)`);
    if (!igualDias) {
      const a = limpio(exportada.days);
      const b = limpio(beta.days);
      for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
        if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) nota(`${nombre} día ${i}: normal ${JSON.stringify(a[i]).slice(0, 200)} · beta ${JSON.stringify(b[i]).slice(0, 200)}`);
      }
    }
    if (!igualAjustes) nota(`${nombre} ajustes: normal ${JSON.stringify(exportada.settings)} · beta ${JSON.stringify(beta.settings)}`);
    quitar({ f });
  }
  // N5 de cerca: lo que la normal hace raro, la beta lo arregla al pasarlo a sus datos
  {
    const snap = normal.fusionarComoLaNormal(diffs.N5, rutina, ejercicios);
    const jueves = snap.days.find((d) => d.id === "thursday-pull").exercises;
    const miercoles = snap.days.find((d) => d.id === "wednesday-lower-a").exercises;
    const r = normal.datosDesdeSnapshot(snap, { origen: "normal", ahoraMs: 1, ejerciciosBase: ejercicios });
    caso(jueves.find((x) => x.exerciseId === "leg-press")?.name === "" && miercoles.filter((x) => x.exerciseId === "crunches").length === 2
      && r.datos.ejercicios["leg-press"].name === "Prensa de piernas sentada"
      && r.datos.dias.find((d) => d.id === "wednesday-lower-a").ejercicios.filter((x) => x.exerciseId === "crunches").length === 1
      && r.datos.ejercicios["custom-x"].pr === 20,
    "N5 como en la normal, leg-press sale sin nombre en el jueves y crunches dos veces; en la beta, con nombre y una vez");
  }

  // N9 La normal importa la copia de la beta
  {
    for (const k of CLAVES_NORMAL) localStorage.removeItem(k);
    guardar("gym-routine-data-v1", await conImagenesLocales({}));
    const datos = await datosBeta();
    for (const x of Object.values(datos.ejercicios)) x.image = "/images/icon.svg";
    datos.ejercicios["pec-deck"].pr = 52.5;
    datos.dias.find((d) => d.id === "tuesday-push").ejercicios[0].rest = "3:00";
    datos.dias.find((d) => d.id === "tuesday-push").title = "Empuje";
    datos.sesiones.push({ id: "s-1", diaId: "tuesday-push", diaNombre: "Martes · Empuje", inicio: 1, fin: 2, seriesPlan: 23, ejercicios: [] });
    const copia = copias.construirExportacion(datos, Date.now());
    const f = await cargarNormal();
    const e = espiarNormal(f);
    f.contentDocument.getElementById("importBtnGlobal").click();
    const dt = new f.contentWindow.DataTransfer();
    dt.items.add(new f.contentWindow.File([JSON.stringify(copia, null, 2)], "gym-beta-copia.json", { type: "application/json" }));
    e.input.files = dt.files;
    let error = null;
    try {
      await real(e.input.onchange());
    } catch (err) {
      error = err;
    }
    await esperar(200);
    const guardado = JSON.parse(localStorage.getItem("gym-routine-data-v1"));
    caso(!error && e.alertas.length === 0, `N9 la normal importa la copia de la beta sin alert ni error (${e.alertas.join(" | ") || "ninguno"})`);
    caso(!("beta" in guardado), "N9 la normal no guarda la clave beta");
    const exportada = await exportarNormal(f, e);
    const campos = (dias) => dias.map((d) => ({ id: d.id, label: d.label, title: d.title, exercises: d.exercises.map((x) => [x.exerciseId, x.name, x.pr, x.series, x.reps, x.rest]) }));
    caso(JSON.stringify(campos(exportada.days)) === JSON.stringify(campos(copia.days)), "N9 la exportación de la normal da los mismos días, con los mismos pr, name, series, reps y rest");
    caso(JSON.stringify(exportada.settings) === JSON.stringify(copia.settings), `N9 y los mismos ajustes (${JSON.stringify(exportada.settings)})`);
    quitar({ f });
  }

  // N10 Las claves de la normal no cambian por usar la beta (primera vez, volver a copiar y borrar todo)
  {
    await limpiarBeta();
    for (const k of CLAVES_NORMAL) localStorage.removeItem(k);
    guardar("gym-routine-data-v1", await conImagenesLocales(diffs.N3));
    guardar("gym-theme-v1", "light");
    guardar("gym-ui-mode-v1", "editor");
    guardar("gym-active-day-v1", "thursday-pull");
    const antes = leerNormal();
    const b = await cargarBeta();
    pulsar(b.d, "empezar");
    await esperar(100);
    caso(textoDe(b.d, ".titulo-dia") === "Empuje", `N10 la beta abre el martes con el título de la normal («${textoDe(b.d, ".titulo-dia")}»)`);
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    pulsar(b.d, "copiar-normal");
    // Primero lee la normal (para decir qué marcas bajarían) y después pregunta.
    await hastaQue(() => Boolean(b.d.querySelector('.capa-hoja [data-accion="confirmar"]')), 300);
    pulsar(b.d, "confirmar");
    await hastaQue(() => textoDe(b.d, "#avisos").startsWith("Rutina copiada de la versión normal"), 300);
    caso(textoDe(b.d, "#avisos").startsWith("Rutina copiada de la versión normal"), `N10 «Volver a copiar desde la versión normal»: «${textoDe(b.d, "#avisos .aviso-texto")}»`);
    pulsar(b.d, "borrar-todo");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => c.hojaAbierta(b.d) && textoDe(b.d, ".capa-hoja:last-of-type .hoja-titulo") === "¿Borrar ahora?", 2000);
    const recarga = new Promise((resolver) => { b.f.onload = resolver; });
    pulsar(b.d, "confirmar");
    await hastaQue(() => Promise.race([recarga.then(() => true), Promise.resolve(false)]), 300);
    await c.esperarListo(b.f);
    caso(textoDe(b.f.contentDocument, "[data-resumen]").includes("Hemos copiado tu rutina"), "N10 «Borrar todos los datos de la beta» vuelve a la primera vez");
    caso(JSON.stringify(leerNormal()) === JSON.stringify(antes), "N10 las 4 claves de la normal valen exactamente lo mismo que antes");
    // Tras borrar todo, la primera vez ofrece recuperar lo de antes (la copia automática «antes de borrar todo»).
    const d2 = b.f.contentDocument;
    const ofrece = Boolean(d2.querySelector('[data-accion="recuperar-borrado"]'));
    d2.querySelector('[data-accion="recuperar-borrado"]')?.click();
    await hastaQue(() => Boolean(d2.querySelector('.capa-hoja [data-accion="confirmar"]')), 300);
    d2.querySelector('.capa-hoja [data-accion="confirmar"]')?.click();
    await hastaQue(() => d2.body.dataset.pantalla === "entreno" && textoDe(d2, ".titulo-dia") !== "", 300);
    caso(ofrece && textoDe(d2, ".titulo-dia") === "Empuje" && textoDe(d2, "#avisos").includes("Copia recuperada"),
      `N10 tras borrar todo se ofrece recuperar los datos de antes, y vuelven («${textoDe(d2, ".titulo-dia")}»)`);
    caso(JSON.stringify(leerNormal()) === JSON.stringify(antes), "N10 …y la normal sigue igual");
    sinErrores(b, "N10");
    quitar(b);
  }

  // Al acabar, se da de baja el service worker de la normal (alcance /): así no se queda controlando tests/ ni
  // /beta/ en lo que quede de esta ejecución.
  try {
    for (const reg of await real(navigator.serviceWorker.getRegistrations())) {
      if (new URL(reg.scope).pathname === "/") await real(reg.unregister());
    }
  } catch {
    // Sin service worker: nada que quitar.
  }
}
