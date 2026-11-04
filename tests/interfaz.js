// Flujos de la interfaz (casos I1-I15): la beta en un iframe de 412 × 915, manejada desde fuera.

import { HORA, ms, conImagenesLocales, diffsNormal, datosBeta, sesionInventada } from "./datos.js";

export async function ejecutar(c) {
  const {
    caso, nota, esperar, real, hastaQue, hastaQueVirtual, limpiarBeta, guardar, leerJson, leerNormal, CLAVES_NORMAL,
    cargarBeta, recargar, quitar, pulsar, existe, teclear, textoDe, avisoActual, hojaAbierta, sinErrores, clavesBeta,
  } = c;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const sesionGuardada = () => leerJson("gym-beta-sesion");
  const barraVisible = (d) => !d.getElementById("barra-descanso").hidden;
  const estadoDe = (d, id) => textoDe(d, `li[data-ej="${id}"] .ej-estado`);
  const textoHoja = (d) => textoDe(d, ".capa-hoja:last-of-type .hoja");
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    for (const [k, v] of Object.entries(extra)) guardar(k, v);
  };
  const conDescansosCortos = (d) => {
    for (const dia of d.dias) for (const e of dia.ejercicios) e.rest = "0:06";
    d.dias.find((x) => x.id === "tuesday-push").ejercicios[1].rest = "0:05";
  };
  const diffs = await diffsNormal();

  // I1 Primera vez con el diff N2 (imágenes locales)
  {
    await limpiarBeta();
    guardar("gym-routine-data-v1", await conImagenesLocales(diffs.N2));
    guardar("gym-theme-v1", "dark");
    guardar("gym-ui-mode-v1", "workout");
    guardar("gym-active-day-v1", "sunday-upper");
    const antes = leerNormal();
    const b = await cargarBeta();
    const texto = textoDe(b.d, "[data-resumen]");
    caso(b.listo === "1" && texto.includes("5 días") && texto.includes("versión normal"), `I1 la pantalla de la primera vez: «${texto.slice(0, 90)}…»`);
    pulsar(b.d, "empezar");
    await esperar(150);
    const pestanas = b.d.querySelectorAll('[data-accion="elegir-dia"]').length;
    const lineaPec = textoDe(b.d, 'li[data-ej="pec-deck"] .ej-datos');
    caso(pestanas === 5 && lineaPec.includes("50 kg"), `I1 tras Empezar: ${pestanas} pestañas y pec-deck «${lineaPec}»`);
    caso(b.d.documentElement.dataset.tema === "oscuro", `I1 el tema oscuro de la normal pasa a la beta (${b.d.documentElement.dataset.tema})`);
    caso(JSON.stringify(leerNormal()) === JSON.stringify(antes), "I1 las 4 claves de la normal siguen idénticas");
    const ajenas = Object.keys(localStorage).filter((k) => !CLAVES_NORMAL.includes(k) && !k.startsWith("gym-beta-"));
    caso(ajenas.length === 0 && clavesBeta().includes("gym-beta-datos"), `I1 todas las claves nuevas empiezan por gym-beta- (${clavesBeta().join(", ")})`);
    sinErrores(b, "I1");
    quitar(b);
  }

  // I2 Sin datos de la normal
  {
    await limpiarBeta();
    for (const k of CLAVES_NORMAL) localStorage.removeItem(k);
    const b = await cargarBeta();
    const texto = textoDe(b.d, "[data-resumen]");
    caso(texto.includes("rutina publicada") && texto.includes("5 días"), `I2 sin datos de la normal: «${texto.slice(0, 100)}…»`);
    caso(leerNormal()["gym-routine-data-v1"] === null, "I2 la beta no crea la clave de la normal");
    sinErrores(b, "I2");
    quitar(b);
  }

  // I3 Día de hoy
  {
    await preparar(await datosBeta());
    let b = await cargarBeta({ ahora: HORA.martes });
    const elegida = b.d.querySelector(".pestana.elegida");
    caso(elegida?.dataset.id === "tuesday-push" && textoDe(b.d, '[data-id="tuesday-push"] .pestana-dia') === "Hoy" && textoDe(b.d, ".titulo-dia") === "Push",
      `I3 el martes sale «Hoy» en Martes y abre ${textoDe(b.d, ".titulo-dia")}`);
    quitar(b);
    b = await cargarBeta({ ahora: HORA.lunes });
    const banners = textoDe(b.d, ".banners");
    caso(banners.includes("Hoy toca descanso. Próximo entreno: martes, Push."), `I3 el lunes: «${banners}»`);
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-ui": { diaElegido: { id: "sunday-upper", fecha: "2026-11-03" } } });
    b = await cargarBeta({ ahora: HORA.martes });
    caso(textoDe(b.d, ".titulo-dia") === "Upper", `I3 con el domingo elegido hoy abre ${textoDe(b.d, ".titulo-dia")}`);
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-ui": { diaElegido: { id: "sunday-upper", fecha: "2026-11-02" } } });
    b = await cargarBeta({ ahora: HORA.martes });
    caso(textoDe(b.d, ".titulo-dia") === "Push", `I3 con el domingo elegido ayer abre ${textoDe(b.d, ".titulo-dia")}`);
    pulsar(b.d, "elegir-dia", "thursday-pull");
    await esperar(50);
    caso(textoDe(b.d, ".titulo-dia") === "Pull" && leerJson("gym-beta-ui")?.diaElegido?.id === "thursday-pull", "I3 tocar una pestaña la recuerda solo hoy");
    sinErrores(b, "I3");
    quitar(b);
  }

  // I4 Apuntar series
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    const kg = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="kg"]');
    const reps = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="reps"]');
    caso(kg?.value === "80" && reps?.value === "8", `I4 al abrir, los valores propuestos: ${kg?.value} kg × ${reps?.value}`);
    pulsar(b.d, "kg-mas", "machine-chest-press");
    caso(kg.value === "82,5", `I4 «+» sube el incremento: ${kg.value}`);
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    const s = sesionGuardada();
    caso(estadoDe(b.d, "machine-chest-press") === "1/3" && s?.ejercicios?.["machine-chest-press"]?.[0]?.kg === 82.5,
      `I4 el ✓ deja «${estadoDe(b.d, "machine-chest-press")}» y guarda la serie (${JSON.stringify(s?.ejercicios?.["machine-chest-press"])})`);
    caso(barraVisible(b.d) && avisoActual(b.d).startsWith("Serie 1 apuntada"), `I4 sale la barra de descanso y el aviso «${avisoActual(b.d)}»`);
    const cuentaAntes = textoDe(b.d, ".barra-cuenta");
    await esperar(3000);
    await recargar(b, { ahora: "2026-11-03T18:00:05" });
    const cuentaDespues = textoDe(b.d, ".barra-cuenta");
    caso(estadoDe(b.d, "machine-chest-press") === "1/3" && barraVisible(b.d) && cuentaDespues < cuentaAntes,
      `I4 al recargar siguen «1/3» y la barra, con menos tiempo (${cuentaAntes} → ${cuentaDespues})`);
    caso(b.d.querySelector('li[data-ej="machine-chest-press"]')?.classList.contains("abierto"), "I4 al recargar sigue abierto el ejercicio de la sesión");
    sinErrores(b, "I4");
    quitar(b);
  }

  // I5 Deshacer, editar y borrar series
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(!sesionGuardada() && !barraVisible(b.d) && estadoDe(b.d, "machine-chest-press") === "0/3", "I5 deshacer el ✓ quita la serie, la sesión y la barra");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(30);
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(30);
    b.d.querySelector('[data-accion="editar-serie"][data-indice="0"]').click();
    await esperar(30);
    const hoja = hojaAbierta(b.d);
    hoja.querySelector('[data-accion="kg-mas"]').click();
    hoja.querySelector('[data-accion="guardar-serie"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    const editada = sesionGuardada()?.ejercicios?.["machine-chest-press"]?.[0]?.kg;
    caso(editada === 82.5 && avisoActual(b.d).startsWith("Serie 1 cambiada"), `I5 editar la serie 1: ${editada} kg (${avisoActual(b.d)})`);
    pulsar(b.d, "deshacer");
    await esperar(30);
    caso(sesionGuardada()?.ejercicios?.["machine-chest-press"]?.[0]?.kg === 80, "I5 deshacer la edición vuelve a 80 kg");
    b.d.querySelector('[data-accion="editar-serie"][data-indice="1"]').click();
    await esperar(30);
    hojaAbierta(b.d).querySelector('[data-accion="borrar-serie"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(sesionGuardada()?.ejercicios?.["machine-chest-press"]?.length === 1 && avisoActual(b.d).startsWith("Serie 2 borrada"), "I5 borrar la serie 2 la quita");
    pulsar(b.d, "deshacer");
    await esperar(30);
    caso(sesionGuardada()?.ejercicios?.["machine-chest-press"]?.length === 2, "I5 deshacer el borrado la vuelve a poner");
    sinErrores(b, "I5");
    quitar(b);
  }

  // I6 El foco y los nodos se conservan
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    const otras = [...b.d.querySelectorAll("li.ej")].filter((li) => li.dataset.ej !== "pec-deck");
    const kg = b.d.querySelector('li[data-ej="pec-deck"] [data-campo="kg"]');
    teclear(b.d, kg, "48,5", { cambio: false });
    pulsar(b.d, "reps-mas", "pec-deck");
    const kgDespues = b.d.querySelector('li[data-ej="pec-deck"] [data-campo="kg"]');
    caso(kgDespues === kg && kg.isConnected && kg.value === "48,5" && b.d.activeElement === kg,
      `I6 tras escribir y pulsar «+» de reps, el campo de kg es el mismo nodo, conserva «${kg.value}» y el foco`);
    const iguales = [...b.d.querySelectorAll("li.ej")].filter((li) => li.dataset.ej !== "pec-deck").every((li, i) => li === otras[i]);
    caso(iguales, "I6 las otras filas son los mismos nodos (no se repinta la lista)");
    caso(textoDe(b.d, 'li[data-ej="pec-deck"] .hecha-texto') === "Hecha · 48,5 kg × 11", `I6 el botón dice «${textoDe(b.d, 'li[data-ej="pec-deck"] .hecha-texto')}»`);
    teclear(b.d, kg, "abc", { cambio: false });
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(30);
    caso(!sesionGuardada() && textoDe(b.d, 'li[data-ej="pec-deck"] .control-error') === "Escribe un número, por ejemplo 82,5", "I6 un peso que no es un número saca el error junto al campo y no se guarda");
    sinErrores(b, "I6");
    quitar(b);
  }

  // I7 Un solo descanso
  {
    await preparar(await datosBeta({ cambios: conDescansosCortos }));
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(1200);
    pulsar(b.d, "elegir-dia", "sunday-upper");
    await esperar(100);
    const enDomingo = barraVisible(b.d);
    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(100);
    const enHistorial = barraVisible(b.d) && b.d.body.dataset.pantalla === "historial";
    const cuentaHistorial = textoDe(b.d, ".barra-cuenta");
    b.d.querySelector('#nav [data-accion="ir-entreno"]').click();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "entreno", 2000);
    caso(enDomingo && enHistorial && barraVisible(b.d) && cuentaHistorial < "0:06",
      `I7 la barra sigue al cambiar de día, en Historial y al volver (${cuentaHistorial})`);
    pulsar(b.d, "elegir-dia", "tuesday-push");
    await esperar(50);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(50);
    caso(leerJson("gym-beta-descanso")?.exerciseId === "pec-deck" && textoDe(b.d, ".barra-texto").includes("Pec deck / chest fly"),
      "I7 un ✓ en otro ejercicio sustituye el descanso");
    await esperar(7000);
    caso(b.espia.osciladores === 4, `I7 pasado el tiempo, el sonido suena 1 vez (${b.espia.osciladores / 4} veces)`);
    sinErrores(b, "I7");
    quitar(b);
  }

  // I8 Terminar la sesión
  {
    const datos = await datosBeta();
    datos.sesiones.push(sesionInventada(datos, "tuesday-push", "2026-10-27T18:00:00", { soloPrimeros: 2 }));
    await preparar(datos);
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "kg-mas", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    pulsar(b.d, "terminar-sesion");
    await esperar(50);
    caso(textoHoja(b.d).includes("Te quedan 22 series. ¿Terminar la sesión de todos modos?"), `I8 con series pendientes sale la confirmación: «${textoHoja(b.d).slice(0, 80)}»`);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 3000);
    const guardados = datosGuardados();
    caso(guardados.sesiones.length === 2 && !sesionGuardada() && !barraVisible(b.d), `I8 datos.sesiones tiene ${guardados.sesiones.length} y no hay sesión en curso`);
    const resumen = textoHoja(b.d);
    caso(resumen.includes("1 de 23 series") && resumen.includes("Press de pecho tumbado en máquina, 82,5 kg"), `I8 la hoja «Sesión guardada»: «${resumen.slice(0, 160)}»`);
    caso(guardados.ejercicios["machine-chest-press"].pr === 82.5, "I8 la marca sube al terminar");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(textoDe(b.d, ".banners").includes("Sesión de hoy guardada."), "I8 sale el banner «Sesión de hoy guardada.»");
    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(50);
    const filas = b.d.querySelectorAll('[data-accion="ver-sesion"]').length;
    caso(filas === 2 && textoDe(b.d, '[data-accion="ver-sesion"]').includes("Push"), `I8 en Historial salen ${filas} sesiones`);
    pulsar(b.d, "vista-ejercicios");
    await esperar(50);
    pulsar(b.d, "ver-ejercicio", "machine-chest-press");
    await esperar(50);
    const ficha = textoDe(b.d, "#pantalla");
    caso(ficha.includes("82,5×10") || ficha.includes("82,5×8"), "I8 la ficha del ejercicio tiene la serie de hoy");
    caso(Boolean(b.d.querySelector('svg.grafica[role="img"]')), "I8 con 2 sesiones sale la gráfica (svg role=img)");
    const etiqueta = b.d.querySelector("svg.grafica")?.getAttribute("aria-label") || "";
    caso(etiqueta.startsWith("Peso de la mejor serie: de 80 a 82,5 kg en 2 sesiones"), `I8 la gráfica se describe: «${etiqueta}»`);
    sinErrores(b, "I8");
    quitar(b);
  }

  // I9 Borrar una sesión desde su detalle y deshacer
  {
    const datos = await datosBeta();
    const s = sesionInventada(datos, "tuesday-push", "2026-11-01T18:00:00", { extra: 5 });
    datos.sesiones.push(s);
    datos.ejercicios["machine-chest-press"].pr = 85;
    datos.marcas.push({ exerciseId: "machine-chest-press", kg: 85, fecha: s.fin, motivo: "sesion", sesionId: s.id });
    await preparar(datos);
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(50);
    pulsar(b.d, "ver-sesion", s.id);
    await esperar(50);
    pulsar(b.d, "borrar-sesion", s.id);
    await esperar(50);
    caso(textoHoja(b.d).includes("¿Borrar la sesión del dom 1 nov? Se quitan sus series del historial y sus marcas."), `I9 confirmación: «${textoHoja(b.d).slice(0, 100)}»`);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => datosGuardados().sesiones.length === 0, 3000);
    caso(datosGuardados().sesiones.length === 0 && datosGuardados().ejercicios["machine-chest-press"].pr === 80 && avisoActual(b.d) === "Sesión borrada",
      "I9 borrar la sesión la quita y rehace la marca (85 → 80)");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(datosGuardados().sesiones.length === 1 && datosGuardados().ejercicios["machine-chest-press"].pr === 85, "I9 deshacer la devuelve con su marca");
    sinErrores(b, "I9");
    quitar(b);
  }

  // I10 Rutina
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await esperar(50);
    pulsar(b.d, "abrir-dia", "tuesday-push");
    await esperar(50);
    pulsar(b.d, "editar-entrada", "machine-chest-press");
    await esperar(50);
    let hoja = hojaAbierta(b.d);
    const rest = hoja.querySelector('[data-campo="rest"]');
    teclear(b.d, rest, "1,30");
    const entrada = () => datosGuardados().dias.find((d) => d.id === "tuesday-push").ejercicios.find((e) => e.exerciseId === "machine-chest-press");
    caso(entrada().rest === "1:30" && rest.value === "1:30", `I10 un descanso «1,30» se guarda «${entrada().rest}»`);
    teclear(b.d, rest, "abc");
    const error = textoDe(hoja, '[data-control="rest"] .control-error');
    caso(error === "Escribe el descanso como 1:30 (minutos:segundos)." && entrada().rest === "1:30", `I10 «abc» saca el error junto al campo y no se guarda («${error}»)`);
    const nombre = hoja.querySelector('[data-campo="name"]');
    teclear(b.d, nombre, "");
    caso(textoDe(hoja, "#hoja-name-error") === "El nombre no puede quedar vacío." && datosGuardados().ejercicios["machine-chest-press"].name !== "", "I10 un nombre vacío no se guarda");
    hoja.querySelector('[data-accion="quitar-ejercicio"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    caso(!existe(b.d, "editar-entrada", "machine-chest-press") && !entrada(), "I10 quitar el ejercicio del día");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(existe(b.d, "editar-entrada", "machine-chest-press") && Boolean(entrada()), "I10 deshacer lo vuelve a poner");
    const enBiblioteca = Object.keys(datosGuardados().ejercicios).length;
    pulsar(b.d, "anadir-ejercicio", "tuesday-push");
    await esperar(50);
    hoja = hojaAbierta(b.d);
    const yaEsta = hoja.querySelector('[data-accion="elegir-biblioteca"][data-id="pec-deck"]');
    caso(yaEsta?.disabled && yaEsta.textContent.includes("Ya está en este día"), "I10 en la biblioteca, lo que ya está en el día sale marcado y no se puede elegir");
    hoja.querySelector('[data-accion="elegir-biblioteca"][data-id="leg-press"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    const dia = datosGuardados().dias.find((d) => d.id === "tuesday-push");
    caso(dia.ejercicios.some((e) => e.exerciseId === "leg-press") && Object.keys(datosGuardados().ejercicios).length === enBiblioteca,
      "I10 añadir un ejercicio de la biblioteca no crea uno nuevo");
    pulsar(b.d, "dia-semana", "tuesday-push");
    caso(true, "I10 los días de la semana se pueden pulsar");
    sinErrores(b, "I10");
    quitar(b);
    const unDia = await datosBeta({ cambios: (d) => { d.dias = d.dias.slice(0, 1); } });
    await preparar(unDia);
    const b2 = await cargarBeta();
    b2.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await esperar(50);
    pulsar(b2.d, "abrir-dia", "tuesday-push");
    await esperar(50);
    const eliminar = b2.d.querySelector('[data-accion="eliminar-dia"]');
    caso(eliminar?.disabled && textoDe(b2.d, "#ayuda-eliminar") === "Tiene que quedar al menos un día.", "I10 con un solo día, «Eliminar este día» está desactivado");
    sinErrores(b2, "I10 un día");
    quitar(b2);
  }

  // I11, I12 y I15 Copias: exportar, importar con vista previa y copias automáticas
  {
    const copias = await import("/beta/js/copias.js");
    const datos = await datosBeta();
    await preparar(datos);
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);

    // I12 Exportar
    b.espia.compartir = "ok";
    pulsar(b.d, "guardar-copia");
    await hastaQueVirtual(() => avisoActual(b.d) === "Copia guardada", 2000);
    const tras1 = datosGuardados();
    caso(b.espia.compartidos.length === 1 && tras1.copia.metodo === "compartida" && tras1.copia.ultima > ms("2026-11-03T00:00:00") && avisoActual(b.d) === "Copia guardada",
      `I12 con compartir que va bien: se marca la copia y sale «${avisoActual(b.d)}»`);
    const archivo = b.espia.compartidos[0]?.files?.[0];
    caso(archivo?.name === "gym-beta-copia-2026-11-03-1800.json" && archivo.type === "application/json", `I12 el archivo compartido: ${archivo?.name}`);
    b.espia.compartir = "abortar";
    const ultima = tras1.copia.ultima;
    pulsar(b.d, "guardar-copia");
    await hastaQueVirtual(() => avisoActual(b.d) === "No se ha guardado la copia", 2000);
    caso(datosGuardados().copia.ultima === ultima && avisoActual(b.d) === "No se ha guardado la copia", "I12 si se cancela el menú de compartir, no se marca nada");
    b.espia.compartir = "no";
    pulsar(b.d, "guardar-copia");
    await hastaQueVirtual(() => avisoActual(b.d).startsWith("Copia descargada"), 2000);
    const exp = b.espia.blobs.length ? JSON.parse(await real(b.espia.blobs[b.espia.blobs.length - 1].text())) : null;
    caso(b.espia.descargas.length === 1 && b.espia.descargas[0].nombre.startsWith("gym-beta-copia-") && datosGuardados().copia.metodo === "descargada",
      `I12 sin compartir, se descarga: ${b.espia.descargas[0]?.nombre}`);
    caso(exp && Object.keys(exp.settings).sort().join() === "timerAlert,timerNotification,timerSound,transitionMinutes"
      && exp.days.flatMap((d) => d.exercises).every((e) => (e.pr === null || typeof e.pr === "number") && /^\d+:\d{2}$/.test(e.rest)),
    "I12 el JSON descargado tiene el formato de la normal");

    // I11 Importar
    const nAntes = (await real(copias.listarCopiasAuto())).length;
    const copiaBase = copias.construirExportacion(await datosBeta(), ms("2026-11-04T10:00:00"));
    delete copiaBase.beta;
    copiaBase.days.forEach((d) => d.exercises.forEach((e) => { if (e.exerciseId === "pec-deck") e.pr = 99; }));
    const meter = (texto, nombre) => {
      const input = b.d.querySelector('[data-campo="archivo"]');
      const dt = new b.w.DataTransfer();
      dt.items.add(new b.w.File([texto], nombre, { type: "application/json" }));
      input.files = dt.files;
      input.dispatchEvent(new b.w.Event("change", { bubbles: true }));
    };
    meter(JSON.stringify(copiaBase), "copia.json");
    await hastaQue(() => hojaAbierta(b.d), 200);
    const previa = textoHoja(b.d);
    caso(previa.includes("5 días · 38 ejercicios (22 distintos) · 17 marcas") && previa.includes("hecha con la versión normal") && previa.includes("Sin historial: se conserva el tuyo"),
      `I11 la vista previa: «${previa.slice(0, 170)}»`);
    caso(datosGuardados().ejercicios["pec-deck"].pr === 47, "I11 la vista previa no cambia nada");
    pulsar(b.d, "confirmar");
    await hastaQue(() => avisoActual(b.d).startsWith("Copia cargada"), 300);
    caso(datosGuardados().ejercicios["pec-deck"].pr === 99 && avisoActual(b.d) === "Copia cargada", `I11 al cargar, los datos cambian (${avisoActual(b.d)})`);
    const lista = await real(copias.listarCopiasAuto());
    caso(lista.length === nAntes + 1 && lista[0].motivo === "antes de cargar una copia", `I15 hay una copia automática más (${nAntes} → ${lista.length}), «${lista[0]?.motivo}»`);
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(datosGuardados().ejercicios["pec-deck"].pr === 47, "I11 con Deshacer vuelven los datos de antes");
    const antesRoto = localStorage.getItem("gym-beta-datos");
    meter("{esto no es json", "rota.json");
    await hastaQue(() => textoDe(b.d, "#error-carga") !== "", 200);
    caso(textoDe(b.d, "#error-carga") === "Este archivo no se puede leer: no es un JSON válido." && localStorage.getItem("gym-beta-datos") === antesRoto && !hojaAbierta(b.d),
      `I11 un JSON roto da su mensaje dentro de la app y no cambia nada («${textoDe(b.d, "#error-carga")}»)`);
    pulsar(b.d, "ver-copias-auto");
    await hastaQue(() => b.d.querySelectorAll('[data-accion="recuperar-copia"]').length > 0, 200);
    caso(b.d.querySelectorAll('[data-accion="recuperar-copia"]').length === lista.length, "I15 la lista de copias automáticas sale en Ajustes con su «Recuperar»");
    sinErrores(b, "I11/I12/I15");
    quitar(b);
  }

  // I13 Aviso de copia
  {
    const datos = await datosBeta();
    datos.copia = { ultima: ms("2026-10-26T10:00:00"), metodo: "descargada" };
    datos.actualizado = ms("2026-10-30T10:00:00");
    await preparar(datos);
    const b = await cargarBeta();
    caso(textoDe(b.d, ".banners").includes("Hace 8 días que no guardas una copia de la beta."), `I13 sale el banner: «${textoDe(b.d, ".banners")}»`);
    pulsar(b.d, "posponer-copia");
    await esperar(50);
    caso(!textoDe(b.d, ".banners").includes("Hace 8 días"), "I13 con «Más tarde» desaparece");
    sinErrores(b, "I13");
    quitar(b);
  }

  // I14 Atrás cierra la hoja sin cambiar de pantalla
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "como-se-calcula");
    await esperar(50);
    const abierta = Boolean(hojaAbierta(b.d)) && textoHoja(b.d).includes("Total");
    const total = textoDe(b.d, ".fila-total");
    b.w.history.back();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(abierta && !hojaAbierta(b.d) && b.w.location.hash === "#/entreno" && b.d.body.dataset.pantalla === "entreno", `I14 Atrás cierra la hoja (${total}) y sigue en Entreno`);
    caso(total === "Total~53 min", `I14 la hoja del tiempo dice «${total}»`);
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    b.w.history.back();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "entreno", 2000);
    caso(b.d.body.dataset.pantalla === "entreno", "I14 desde Ajustes, Atrás vuelve a Entreno");
    sinErrores(b, "I14");
    quitar(b);
  }
  nota("interfaz hecha");
}
