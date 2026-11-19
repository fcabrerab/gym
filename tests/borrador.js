// Lo de la 1.2.0 (D-123): en Rutina, «Cancelar» y «Guardar». Los cambios van a un borrador (gym-beta-borrador), no a
// tus datos, hasta «Guardar»; la hoja del ejercicio, con su propia copia («Cancelar», «Guardar» y preguntar al cerrarla
// con cambios); salir de Rutina con cambios pregunta (otra pestaña o Atrás); el borrador aguanta que se cierre la app y
// Entreno lo recuerda; añadir, duplicar y eliminar un día siguen al momento (antes, qué hacer con los cambios); y si la
// rutina guardada cambia mientras tanto, «Guardar» pregunta antes de pisarla. La app en un iframe de 412 × 915.

import { HORA, datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const {
    caso, nota, esperar, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, recargar, quitar, pulsar, existe, teclear,
    textoDe, avisoActual, hojaAbierta, sinErrores,
  } = c;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const borradorGuardado = () => leerJson("gym-beta-borrador");
  const diaGuardado = (id) => datosGuardados().dias.find((d) => d.id === id);
  const { VERSION } = await import("/js/version.js");
  const preparar = async (datos) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    guardar("gym-beta-ui", { versionVista: VERSION, ayudaSerieVista: true });
  };
  const ir = async (b, pestana) => {
    b.d.querySelector(`#nav [data-accion="ir-${pestana}"]`).click();
    await esperar(50);
  };
  const abrirDiaEditor = async (b, id) => {
    await ir(b, "rutina");
    pulsar(b.d, "abrir-dia", id);
    await hastaQueVirtual(() => b.d.querySelector(`.pantalla-rutina[data-dia="${id}"]`), 1000);
  };
  const barra = (b) => b.d.querySelector(".barra-borrador")?.hidden === false;
  const campoDia = (b, campo) => b.d.querySelector(`.pantalla-rutina [data-campo="${campo}"]`);
  const hojas = (b) => b.d.querySelectorAll(".capa-hoja").length;
  const tituloHoja = (b) => textoDe(b.d, ".capa-hoja:last-of-type .hoja-titulo");
  const ordenEnPantalla = (b) => [...b.d.querySelectorAll('.pantalla-rutina [data-accion="editar-entrada"]')].map((el) => el.dataset.id);
  const abrirHojaDe = async (b, id) => {
    pulsar(b.d, "editar-entrada", id);
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    return hojaAbierta(b.d);
  };

  // G1 En un día, los cambios van al borrador (nada se guarda) y «Guardar» los guarda todos de una vez.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    const revAntes = datosGuardados().rev;
    await abrirDiaEditor(b, "tuesday-push");
    caso(!barra(b) && !b.d.body.classList.contains("con-borrador"), "G1 sin cambios, no hay barra");
    teclear(b.d, campoDia(b, "title"), "Empuje");
    b.d.querySelector('[data-accion="dia-semana"][data-dia="4"]').click();
    pulsar(b.d, "bajar-ejercicio", "machine-chest-press");
    await esperar(50);
    caso(barra(b) && b.d.body.classList.contains("con-borrador") && textoDe(b.d, ".barra-borrador").includes("Cambios sin guardar")
      && existe(b.d, "cancelar-rutina") && existe(b.d, "guardar-rutina"), "G1 al cambiar algo sale la barra «Cancelar · Guardar»");
    caso(diaGuardado("tuesday-push").title === "Push" && datosGuardados().rev === revAntes && textoDe(b.d, ".titulo-pantalla") === "Martes · Empuje"
      && ordenEnPantalla(b)[0] === "pec-deck", "G1 en Rutina se ve todo cambiado, pero en tus datos aún no hay nada");
    pulsar(b.d, "volver-rutina");
    await hastaQueVirtual(() => b.w.location.hash === "#/rutina", 1000);
    await esperar(50);
    const filaMartes = textoDe(b.d, '[data-accion="abrir-dia"][data-id="tuesday-push"]');
    caso(filaMartes.includes("sin guardar") && !textoDe(b.d, '[data-accion="abrir-dia"][data-id="thursday-pull"]').includes("sin guardar") && barra(b) && !hojaAbierta(b.d),
      `G1 en la lista de días (sin preguntar nada al volver a ella), el cambiado lo dice («${filaMartes}») y la barra sigue`);
    pulsar(b.d, "guardar-rutina");
    await esperar(50);
    const g = diaGuardado("tuesday-push");
    caso(g.title === "Empuje" && g.diasSemana.includes(4) && g.ejercicios[0].exerciseId === "pec-deck" && datosGuardados().rev === revAntes + 1,
      "G1 «Guardar» lo guarda todo de una vez (el título, el jueves y el orden, en un solo cambio)");
    caso(!barra(b) && !b.d.body.classList.contains("con-borrador") && !borradorGuardado() && avisoActual(b.d) === "Cambios guardados.",
      "G1 y la barra se va, con «Cambios guardados.»");
    await ir(b, "entreno");
    caso(b.d.body.dataset.pantalla === "entreno" && !hojaAbierta(b.d) && textoDe(b.d, ".titulo-dia") === "Empuje",
      "G1 sin nada pendiente, salir de Rutina no pregunta, y Entreno ya lo tiene");
    sinErrores(b, "G1");
    quitar(b);
  }

  // G2 «Cancelar» lo deja todo como estaba, con «Deshacer». Al escribir, la barra ya sale.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    teclear(b.d, campoDia(b, "title"), "Empuje");
    caso(barra(b) && borradorGuardado()?.datos?.dias?.find((d) => d.id === "tuesday-push")?.title === "Empuje", "G2 el cambio va al borrador (gym-beta-borrador)");
    pulsar(b.d, "cancelar-rutina");
    await esperar(50);
    caso(!barra(b) && !borradorGuardado() && campoDia(b, "title").value === "Push" && avisoActual(b.d) === "Cambios descartados." && existe(b.d, "deshacer"),
      "G2 «Cancelar» lo deja todo como estaba, con «Deshacer»");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(barra(b) && campoDia(b, "title").value === "Empuje" && diaGuardado("tuesday-push").title === "Push", "G2 «Deshacer» vuelve a poner los cambios (aún sin guardar)");
    pulsar(b.d, "cancelar-rutina");
    await esperar(50);
    const titulo = campoDia(b, "title");
    teclear(b.d, titulo, "Pus", { cambio: false });
    const yaSale = barra(b);
    teclear(b.d, titulo, "Push");
    caso(yaSale && !barra(b) && !borradorGuardado(), "G2 al escribir, la barra ya sale; si se deja como estaba, se va");
    sinErrores(b, "G2");
    quitar(b);
  }

  // G3 Ir a otra pestaña con cambios pregunta: «Guardar», «Descartar» o «Seguir editando».
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await ir(b, "rutina");
    pulsar(b.d, "bajar-dia", "tuesday-push");
    await esperar(50);
    await ir(b, "historial");
    caso(b.d.body.dataset.pantalla === "rutina" && tituloHoja(b) === "Cambios sin guardar" && existe(b.d, "guardar-cambios") && existe(b.d, "descartar-cambios")
      && textoDe(b.d, '[data-accion="seguir-editando"]') === "Seguir editando", "G3 ir a otra pestaña con cambios sin guardar pregunta: «Guardar», «Descartar» o «Seguir editando»");
    pulsar(b.d, "seguir-editando");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(b.d.body.dataset.pantalla === "rutina" && Boolean(borradorGuardado()) && barra(b), "G3 «Seguir editando» se queda en Rutina, con los cambios");
    await ir(b, "historial");
    pulsar(b.d, "descartar-cambios");
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "historial", 2000);
    caso(!borradorGuardado() && datosGuardados().dias[0].id === "tuesday-push" && avisoActual(b.d) === "Cambios descartados." && !b.d.body.classList.contains("con-borrador"),
      "G3 «Descartar» los tira y sigue a Historial");
    await ir(b, "rutina");
    pulsar(b.d, "bajar-dia", "tuesday-push");
    await esperar(50);
    await ir(b, "entreno");
    pulsar(b.d, "guardar-cambios");
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "entreno", 2000);
    caso(!borradorGuardado() && datosGuardados().dias[1].id === "tuesday-push" && avisoActual(b.d) === "Cambios guardados.", "G3 «Guardar» los guarda y sigue a Entreno");
    sinErrores(b, "G3");
    quitar(b);
  }

  // G4 Atrás: dentro de Rutina (del día a la lista) no pregunta; para salir de Rutina con cambios, vuelve a ella y pregunta.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    teclear(b.d, campoDia(b, "title"), "Empuje");
    b.w.history.back();
    await hastaQueVirtual(() => b.w.location.hash === "#/rutina", 1000);
    await esperar(50);
    caso(!hojaAbierta(b.d) && barra(b), "G4 Atrás del día a la lista de días no pregunta: los cambios siguen");
    b.w.history.back();
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    caso(tituloHoja(b) === "Cambios sin guardar" && b.w.location.hash === "#/rutina" && b.d.body.dataset.pantalla === "rutina",
      `G4 Atrás para salir de Rutina con cambios: se queda en Rutina y pregunta (${b.w.location.hash})`);
    pulsar(b.d, "seguir-editando");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    caso(b.w.location.hash === "#/rutina" && b.d.body.dataset.pantalla === "rutina" && barra(b), "G4 «Seguir editando»: en Rutina, con los cambios");
    b.w.history.back();
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    pulsar(b.d, "descartar-cambios");
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "entreno", 2000);
    caso(b.w.location.hash === "#/entreno" && !borradorGuardado() && diaGuardado("tuesday-push").title === "Push",
      `G4 «Descartar»: Atrás sigue a Entreno, sin los cambios (${b.w.location.hash})`);
    sinErrores(b, "G4");
    quitar(b);
  }

  // G5 Si la app se cierra a mitad, los cambios no se pierden: Entreno los recuerda, con «Revisar» y «Descartar».
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    teclear(b.d, campoDia(b, "title"), "Empuje");
    await recargar(b);
    const banner = textoDe(b.d, ".banners");
    caso(b.d.body.dataset.pantalla === "entreno" && banner.includes("Tienes cambios sin guardar en la rutina.") && existe(b.d, "revisar-borrador") && existe(b.d, "descartar-borrador"),
      `G5 al volver a abrir la app, Entreno avisa de los cambios sin guardar («${banner.slice(0, 60)}»)`);
    pulsar(b.d, "revisar-borrador");
    await hastaQueVirtual(() => b.d.querySelector('.pantalla-rutina[data-dia="tuesday-push"]'), 1000);
    caso(campoDia(b, "title")?.value === "Empuje" && barra(b) && diaGuardado("tuesday-push").title === "Push", "G5 «Revisar» lleva al día cambiado, con sus cambios y la barra");
    await recargar(b);
    pulsar(b.d, "descartar-borrador");
    await esperar(50);
    caso(!borradorGuardado() && !textoDe(b.d, ".banners").includes("sin guardar") && avisoActual(b.d) === "Cambios descartados.", "G5 «Descartar» en Entreno los tira");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(Boolean(borradorGuardado()) && textoDe(b.d, ".banners").includes("Tienes cambios sin guardar en la rutina."), "G5 y con «Deshacer», vuelven");
    sinErrores(b, "G5");
    quitar(b);
  }

  // G6 La hoja del ejercicio, con su copia: «Cancelar»; la X, Atrás y tocar fuera, con cambios, preguntan («Guardar»,
  // «Descartar» o «Seguir editando»); «Guardar» lo pasa a Rutina y la barra lo guarda (la marca, con su entrada en el
  // historial de marcas).
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    const reps = () => hojaAbierta(b.d)?.querySelector('[data-campo="reps"]');
    const filaPress = () => textoDe(b.d, '[data-accion="editar-entrada"][data-id="machine-chest-press"] .fila-datos');
    let hoja = await abrirHojaDe(b, "machine-chest-press");
    teclear(b.d, reps(), "6-8");
    pulsar(b.d, "cancelar-ejercicio");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(!borradorGuardado() && !barra(b) && filaPress().includes("8-12"), "G6 «Cancelar» cierra la hoja sin cambiar nada");
    hoja = await abrirHojaDe(b, "machine-chest-press");
    hoja.querySelector(".hoja-cerrar").click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(!hojaAbierta(b.d), "G6 sin cambios, la X la cierra sin preguntar");
    hoja = await abrirHojaDe(b, "machine-chest-press");
    teclear(b.d, reps(), "6-8");
    hoja.querySelector(".hoja-cerrar").click();
    await esperar(50);
    caso(hojas(b) === 2 && tituloHoja(b) === "Cambios sin guardar" && existe(b.d, "guardar-cambios") && existe(b.d, "descartar-cambios") && existe(b.d, "seguir-editando"),
      "G6 con cambios, la X pregunta: «Guardar», «Descartar» o «Seguir editando»");
    pulsar(b.d, "seguir-editando");
    await hastaQueVirtual(() => hojas(b) === 1, 2000);
    caso(hojaAbierta(b.d) === hoja && reps().value === "6-8", "G6 «Seguir editando» vuelve a la hoja, con lo escrito");
    b.w.history.back();
    await hastaQueVirtual(() => hojas(b) === 2, 1000);
    caso(tituloHoja(b) === "Cambios sin guardar" && hojaAbierta(b.d) === hoja, "G6 Atrás, con cambios, también pregunta (y la hoja sigue)");
    pulsar(b.d, "seguir-editando");
    await hastaQueVirtual(() => hojas(b) === 1, 2000);
    b.d.querySelector(".capa-hoja .hoja-fondo").click();
    await hastaQueVirtual(() => hojas(b) === 2, 1000);
    pulsar(b.d, "descartar-cambios");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(!borradorGuardado() && !barra(b) && filaPress().includes("8-12"), "G6 tocar fuera también pregunta; y «Descartar» la cierra sin cambiar nada");
    hoja = await abrirHojaDe(b, "machine-chest-press");
    teclear(b.d, reps(), "6-8");
    teclear(b.d, hoja.querySelector('[data-campo="pr"]'), "90");
    b.w.history.back();
    await hastaQueVirtual(() => hojas(b) === 2, 1000);
    pulsar(b.d, "guardar-cambios");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    const enBorrador = borradorGuardado()?.datos;
    caso(enBorrador?.dias.find((d) => d.id === "tuesday-push").ejercicios[0].reps === "6-8" && enBorrador.ejercicios["machine-chest-press"].pr === 90
      && diaGuardado("tuesday-push").ejercicios[0].reps === "8-12" && filaPress().includes("6-8") && barra(b) && b.w.location.hash === "#/rutina/dia/tuesday-push",
      "G6 Atrás con cambios y «Guardar»: lo pasa a Rutina (al borrador), sin guardarlo aún, y se queda en el día");
    const marcasAntes = datosGuardados().marcas.length;
    pulsar(b.d, "guardar-rutina");
    await esperar(50);
    const g = datosGuardados();
    const marca = g.marcas.at(-1);
    caso(g.dias.find((d) => d.id === "tuesday-push").ejercicios[0].reps === "6-8" && g.ejercicios["machine-chest-press"].pr === 90
      && g.marcas.length === marcasAntes + 1 && marca.exerciseId === "machine-chest-press" && marca.kg === 90 && marca.motivo === "a-mano",
      "G6 «Guardar» de la barra lo guarda, con la marca nueva en su historial (como al cambiarla a mano)");
    sinErrores(b, "G6");
    quitar(b);
  }

  // G7 Desde Entreno («Editar»), la hoja también tiene «Cancelar» y «Guardar», y «Guardar» guarda al momento.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    const series = () => diaGuardado("tuesday-push").ejercicios.find((e) => e.exerciseId === "pec-deck").series;
    const antes = series();
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(50);
    pulsar(b.d, "editar-ejercicio", "pec-deck");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    hojaAbierta(b.d).querySelector('[data-accion="series-mas"]').click();
    pulsar(b.d, "cancelar-ejercicio");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(series() === antes, "G7 desde Entreno, «Cancelar» no cambia nada");
    pulsar(b.d, "editar-ejercicio", "pec-deck");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    hojaAbierta(b.d).querySelector('[data-accion="series-mas"]').click();
    pulsar(b.d, "guardar-ejercicio");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    caso(series() === antes + 1 && !borradorGuardado() && b.d.body.dataset.pantalla === "entreno", `G7 desde Entreno, «Guardar» lo guarda al momento (${antes} → ${series()} series), sin borrador`);
    sinErrores(b, "G7");
    quitar(b);
  }

  // G8 Añadir, duplicar y eliminar un día van al momento: con cambios sin guardar, antes se pregunta qué hacer con ellos.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "thursday-pull");
    teclear(b.d, campoDia(b, "title"), "Tirón");
    pulsar(b.d, "duplicar-dia", "thursday-pull");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    caso(tituloHoja(b) === "Cambios sin guardar" && textoDe(b.d, '[data-accion="seguir-editando"]') === "Cancelar",
      "G8 duplicar un día con cambios sin guardar pregunta antes (con «Cancelar»)");
    pulsar(b.d, "seguir-editando");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    caso(datosGuardados().dias.length === 5 && Boolean(borradorGuardado()) && campoDia(b, "title").value === "Tirón", "G8 «Cancelar» no duplica nada y los cambios siguen");
    pulsar(b.d, "duplicar-dia", "thursday-pull");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    pulsar(b.d, "guardar-cambios");
    await hastaQueVirtual(() => datosGuardados().dias.length === 6, 2000);
    await esperar(50);
    const dias = datosGuardados().dias;
    caso(dias[2].title === "Tirón" && dias[3].label === "Jueves (2)" && dias[3].title === "Tirón" && !borradorGuardado() && avisoActual(b.d).startsWith("Día duplicado"),
      "G8 «Guardar» guarda los cambios y luego duplica el día (ya con ellos)");
    sinErrores(b, "G8");
    quitar(b);
  }

  // G9 Si la rutina guardada cambia mientras tanto (otra ventana), «Guardar» pregunta antes de pisarla; la marca que
  // cambió fuera y Rutina no tocó, se queda.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    teclear(b.d, campoDia(b, "title"), "Empuje");
    const otra = datosGuardados();
    otra.rev += 3;
    otra.dias.find((d) => d.id === "wednesday-lower-a").title = "Pierna";
    otra.ejercicios["pec-deck"].pr = 61;
    localStorage.setItem("gym-beta-datos", JSON.stringify(otra));
    await hastaQueVirtual(() => avisoActual(b.d) === "Datos actualizados desde otra ventana", 2000);
    caso(campoDia(b, "title")?.value === "Empuje" && barra(b), "G9 llega lo de otra ventana y los cambios sin guardar siguen");
    pulsar(b.d, "guardar-rutina");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    caso(tituloHoja(b) === "La rutina ha cambiado" && diaGuardado("tuesday-push").title === "Push", "G9 «Guardar» avisa de que la rutina guardada ha cambiado, sin pisar nada");
    pulsar(b.d, "cancelar");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(Boolean(borradorGuardado()) && barra(b) && diaGuardado("tuesday-push").title === "Push", "G9 «Seguir editando»: nada guardado, los cambios siguen");
    pulsar(b.d, "guardar-rutina");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => !borradorGuardado(), 2000);
    const g = datosGuardados();
    caso(g.dias.find((d) => d.id === "tuesday-push").title === "Empuje" && g.dias.find((d) => d.id === "wednesday-lower-a").title !== "Pierna" && g.ejercicios["pec-deck"].pr === 61,
      "G9 «Guardar los míos»: los días, como en Rutina; la marca que cambió fuera (y Rutina no tocó) se queda");
    sinErrores(b, "G9");
    quitar(b);
  }

  // G10 Unir en superset desde la hoja va al borrador (con lo tocado en ella); y quitar uno de un superset deja a su
  // pareja suelta (antes se quedaba con medio superset).
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    const dia = () => borradorGuardado()?.datos?.dias.find((d) => d.id === "tuesday-push");
    const hoja = await abrirHojaDe(b, "machine-shoulder-press");
    teclear(b.d, hoja.querySelector('[data-campo="reps"]'), "10-12");
    pulsar(b.d, "unir-superset");
    await hastaQueVirtual(() => hojas(b) === 2, 1000);
    pulsar(b.d, "elegir-pareja", "rope-triceps-pushdown");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 3000);
    await esperar(50);
    const par = dia()?.ejercicios.filter((e) => e.supersetId) || [];
    caso(par.length === 2 && par[0].exerciseId === "machine-shoulder-press" && par[1].exerciseId === "rope-triceps-pushdown" && par[0].reps === "10-12"
      && b.d.querySelectorAll(".fila-superset").length === 1 && !diaGuardado("tuesday-push").ejercicios.some((e) => e.supersetId) && avisoActual(b.d) === "Superset creado.",
      "G10 unir en superset desde la hoja: en Rutina (con lo tocado en la hoja), aún sin guardar");
    pulsar(b.d, "guardar-rutina");
    await esperar(50);
    caso(diaGuardado("tuesday-push").ejercicios.filter((e) => e.supersetId).length === 2, "G10 al guardar, el superset queda guardado");
    (await abrirHojaDe(b, "machine-shoulder-press")).querySelector('[data-accion="quitar-ejercicio"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    const pareja = dia()?.ejercicios.find((e) => e.exerciseId === "rope-triceps-pushdown");
    caso(Boolean(pareja) && !pareja.supersetId && !pareja.restSuperset && !dia().ejercicios.some((e) => e.exerciseId === "machine-shoulder-press"),
      "G10 quitar uno de un superset deja a su pareja suelta");
    sinErrores(b, "G10");
    quitar(b);
  }

  nota("borrador hecho");
}
