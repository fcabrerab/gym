// Funciones «conviene» y casos de datos que no entran en I1-I15: sugerencia y «Usar», notas, tiempo restante,
// «Hacer después», probar aviso, apuntes, rutina publicada, imagen grande, tira de la semana, duplicar día,
// cambios desde otra ventana, sesión ya guardada, aviso de versión nueva y recuperar una copia automática.

import { ms, HORA, datosBeta, sesionInventada } from "./datos.js";

export async function ejecutar(c) {
  const {
    caso, esperar, real, hastaQue, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, existe,
    textoDe, avisoActual, hojaAbierta, sinErrores,
  } = c;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const textoHoja = (d) => textoDe(d, ".capa-hoja:last-of-type .hoja");
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    for (const [k, v] of Object.entries(extra)) guardar(k, v);
  };

  // F23 sugerencia y «Usar»; F25 notas; F26 tiempo restante; F32 imagen grande
  {
    const datos = await datosBeta();
    datos.sesiones.push(sesionInventada(datos, "tuesday-push", "2026-10-27T18:00:00", { reps: 12 }));
    datos.ejercicios["machine-chest-press"].notas = "Asiento 4 · respaldo 2";
    datos.ejercicios["machine-chest-press"].image = "/images/icon.svg";
    await preparar(datos);
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    const bloque = () => textoDe(b.d, 'li[data-ej="machine-chest-press"]');
    caso(bloque().includes("Prueba 82,5 kg") && bloque().includes("La última vez llegaste a 12 en todas las series."), "F23 sale la sugerencia «Prueba 82,5 kg» con su porqué");
    caso(bloque().includes("Asiento 4 · respaldo 2"), "F25 las notas de la máquina salen bajo el nombre");
    caso(bloque().includes("La última vez (mar 27 oct): 80×12 · 80×12 · 80×12"), "«La última vez» con su fecha y sus series");
    pulsar(b.d, "usar-sugerencia", "machine-chest-press");
    const kg = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="kg"]');
    caso(kg.value === "82,5" && avisoActual(b.d) === "Peso puesto: 82,5 kg", "F23 «Usar» pone el peso");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    const kg2 = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="kg"]').value;
    caso(kg2 === "82,5" && leerJson("gym-beta-sesion").pesoElegido["machine-chest-press"] === 82.5, `F23 la serie 2 sigue con el peso elegido (${kg2})`);
    const linea = textoDe(b.d, ".linea-dia");
    caso(/^1 de 23 series · llevas <1 min · quedan ~\d+ min · fin ~\d\d:\d\d/.test(linea), `F26 durante la sesión: «${linea}»`);
    pulsar(b.d, "ver-imagen", "machine-chest-press");
    await esperar(50);
    caso(Boolean(hojaAbierta(b.d)?.querySelector(".imagen-grande .mini img")), "F32 la miniatura del ejercicio abierto enseña la imagen grande en una hoja");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    sinErrores(b, "F23/F25/F26/F32");
    quitar(b);
  }

  // Lo que se escribe en un campo sobrevive a ocultar la app y volver (no se repinta la lista)
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    const kg = b.d.querySelector('li[data-ej="pec-deck"] [data-campo="kg"]');
    c.teclear(b.d, kg, "52,5", { cambio: false });
    b.espia.ocultar();
    await esperar(100);
    b.espia.mostrar();
    await esperar(100);
    const despues = b.d.querySelector('li[data-ej="pec-deck"] [data-campo="kg"]');
    caso(despues === kg && kg.value === "52,5", `Al ocultar la app y volver, el campo sigue con «${despues?.value}»`);
    sinErrores(b, "volver a la app");
    quitar(b);
  }

  // F27 «Hacer después»
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "posponer", "machine-chest-press");
    await esperar(50);
    caso(textoDe(b.d, 'li[data-ej="machine-chest-press"] .ej-estado') === "Después" && b.d.querySelector('li[data-ej="pec-deck"]').classList.contains("abierto"),
      "F27 «Hacer después» lo marca «Después» y abre el siguiente");
    const dia = datosGuardados().dias.find((d) => d.id === "tuesday-push");
    for (const e of dia.ejercicios) {
      if (e.exerciseId === "machine-chest-press") continue;
      if (!b.d.querySelector(`li[data-ej="${e.exerciseId}"].abierto`)) pulsar(b.d, "abrir-ejercicio", e.exerciseId);
      for (let i = 0; i < e.series; i += 1) {
        pulsar(b.d, "serie-hecha", e.exerciseId);
        await esperar(10);
      }
    }
    await esperar(50);
    caso(b.d.querySelector('li[data-ej="machine-chest-press"]').classList.contains("abierto") && leerJson("gym-beta-sesion").pospuestos.includes("machine-chest-press"),
      "F27 al acabar lo demás, se abre lo pospuesto");
    caso(textoDe(b.d, ".tarjeta-destacada").length === 0, "Mientras queda lo pospuesto no sale «Has hecho todas las series»");
    for (let i = 0; i < 3; i += 1) {
      pulsar(b.d, "serie-hecha", "machine-chest-press");
      await esperar(10);
    }
    caso(textoDe(b.d, ".tarjeta-destacada").includes("Has hecho todas las series.") && !c.textoDe(b.d, "#barra-descanso").includes("Siguiente") , "Con todo hecho sale la tarjeta «Has hecho todas las series.» (y la última serie no empieza descanso)");
    sinErrores(b, "F27");
    quitar(b);
  }

  // F28 Probar aviso; F20 interruptores y tema; F29 novedades y apuntes
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    b.espia.permiso = "granted";
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    pulsar(b.d, "probar-aviso");
    await esperar(50);
    caso(!b.d.getElementById("capa-fin").hidden && b.espia.osciladores === 4 && b.espia.notificaciones.length === 1 && b.espia.notificaciones[0].opciones.tag === "gym-beta-descanso",
      "F28 «Probar aviso» lanza la capa, el sonido y una notificación de prueba aunque la app esté a la vista");
    b.d.getElementById("capa-fin").click();
    b.d.querySelector('[data-ajuste="timerSound"]').click();
    b.d.querySelector('[data-accion="tema"][data-valor="oscuro"]').click();
    await esperar(50);
    caso(datosGuardados().ajustes.timerSound === false && datosGuardados().ajustes.tema === "oscuro" && b.d.documentElement.dataset.tema === "oscuro",
      "F20 los interruptores y el tema valen al momento");
    caso(textoDe(b.d, "#estado-permiso").startsWith("Permiso concedido"), `F20 el estado del permiso: «${textoDe(b.d, "#estado-permiso")}»`);
    pulsar(b.d, "sps-mas");
    pulsar(b.d, "cambio-menos");
    await esperar(20);
    caso(datosGuardados().ajustes.segundosPorSerie === 45 && datosGuardados().ajustes.transitionMinutes === 1.5, "F10 segundos por serie y minutos por cambio con −/+");
    pulsar(b.d, "novedades");
    await esperar(50);
    caso(textoHoja(b.d).includes("Apunta cada serie con su peso y sus repeticiones"), "F29 la hoja de novedades");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    pulsar(b.d, "apuntes");
    await esperar(50);
    const area = hojaAbierta(b.d).querySelector('[data-campo="apunte"]');
    c.teclear(b.d, area, "El descanso del press se queda corto", { cambio: false });
    hojaAbierta(b.d).querySelector('[data-accion="guardar-apunte"]').click();
    await esperar(50);
    const apuntes = datosGuardados().apuntes;
    caso(apuntes.length === 1 && apuntes[0].texto === "El descanso del press se queda corto" && apuntes[0].pantalla === "ajustes", "F29 se guarda un apunte");
    hojaAbierta(b.d).querySelector('[data-accion="borrar-apunte"]').click();
    await esperar(30);
    caso(datosGuardados().apuntes.length === 0 && avisoActual(b.d) === "Apunte borrado", "F29 borrar un apunte");
    const deshacerBoton = b.d.querySelector('#avisos [data-accion="deshacer"]');
    const caja = deshacerBoton?.getBoundingClientRect();
    const encima = caja ? b.d.elementFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2) : null;
    caso(Boolean(encima && deshacerBoton.contains(encima)), "Con una hoja abierta, el aviso con «Deshacer» queda por encima y se puede tocar");
    pulsar(b.d, "deshacer");
    await esperar(30);
    caso(datosGuardados().apuntes.length === 1, "F29 deshacer el borrado del apunte");
    const copias = await import("/beta/js/copias.js");
    caso(copias.construirExportacion(datosGuardados(), 1).beta.apuntes.length === 1, "F29 los apuntes van en beta.apuntes al exportar");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    sinErrores(b, "F28/F29/F20");
    quitar(b);
  }

  // F31 Volver a la rutina publicada (conserva marcas e historial)
  {
    const datos = await datosBeta({ cambios: (d) => { d.dias = d.dias.slice(0, 2); d.dias[0].title = "Otra cosa"; d.ejercicios["pec-deck"].pr = 60; } });
    datos.sesiones.push(sesionInventada(datos, "tuesday-push", "2026-11-01T18:00:00"));
    await preparar(datos);
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    pulsar(b.d, "rutina-publicada");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQue(() => avisoActual(b.d).startsWith("Rutina publicada puesta"), 300);
    const g = datosGuardados();
    caso(g.dias.length === 5 && g.dias[0].title === "Push" && g.ejercicios["pec-deck"].pr === 60 && g.sesiones.length === 1,
      "F31 vuelve a los 5 días publicados y conserva las marcas y el historial");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(datosGuardados().dias.length === 2, "F31 con Deshacer vuelve lo de antes");
    sinErrores(b, "F31");
    quitar(b);
  }

  // F33 tira de la semana; F35 duplicar un día
  {
    const datos = await datosBeta();
    datos.sesiones.push(sesionInventada(datos, "sunday-upper", "2026-10-25T18:00:00", { id: "s-a" }));
    datos.sesiones.push(sesionInventada(datos, "sunday-upper", "2026-11-01T18:00:00", { id: "s-b" }));
    datos.sesiones.push(sesionInventada(datos, "tuesday-push", "2026-11-03T08:00:00", { id: "s-c" }));
    await preparar(datos);
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(50);
    const hechos = [...b.d.querySelectorAll(".tira-dia")].map((li) => li.classList.contains("hecho"));
    caso(hechos.join() === "false,true,false,false,false,false,false" && textoDe(b.d, ".tira-racha") === "3 semanas seguidas entrenando",
      `F33 la tira marca el martes y cuenta las semanas seguidas («${textoDe(b.d, ".tira-racha")}»)`);
    b.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await esperar(50);
    pulsar(b.d, "abrir-dia", "thursday-pull");
    await esperar(50);
    pulsar(b.d, "duplicar-dia", "thursday-pull");
    await esperar(50);
    const dias = datosGuardados().dias;
    caso(dias.length === 6 && dias[3].label === "Jueves (2)" && dias[3].ejercicios.length === 5 && dias[3].diasSemana.length === 0,
      "F35 duplicar un día lo pone detrás, con sus ejercicios y sin días de la semana");
    sinErrores(b, "F33/F35");
    quitar(b);
  }

  // F18 cambios desde otra ventana
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const d = datosGuardados();
    d.rev += 5;
    d.dias[0].title = "Empuje";
    localStorage.setItem("gym-beta-datos", JSON.stringify(d));
    await hastaQueVirtual(() => textoDe(b.d, ".titulo-dia") === "Empuje", 2000);
    caso(textoDe(b.d, ".titulo-dia") === "Empuje" && avisoActual(b.d) === "Datos actualizados desde otra ventana", "F18 un cambio de otra ventana se ve al momento, con su aviso");
    pulsar(b.d, "elegir-dia", "thursday-pull");
    b.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await esperar(50);
    pulsar(b.d, "subir-dia", "wednesday-lower-a");
    await esperar(50);
    const g = datosGuardados();
    caso(g.dias[0].id === "wednesday-lower-a" && g.dias[1].title === "Empuje" && g.rev === d.rev + 1, "F18 lo siguiente que se guarda parte de lo de la otra ventana (no lo pisa)");
    sinErrores(b, "F18");
    quitar(b);
  }

  // Sesión que ya está en el historial (se cortó entre los dos pasos de terminar) y sesión abandonada
  {
    const datos = await datosBeta();
    const s = sesionInventada(datos, "tuesday-push", "2026-11-03T17:00:00", { id: "s-repetida" });
    datos.sesiones.push(s);
    await preparar(datos, { "gym-beta-sesion": { id: "s-repetida", diaId: "tuesday-push", inicio: s.inicio, ultimoCambio: s.fin, actual: null, pospuestos: [], pesoElegido: {}, ejercicios: {} } });
    let b = await cargarBeta();
    caso(!leerJson("gym-beta-sesion"), "Al arrancar, una sesión en curso que ya está en el historial se quita");
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-sesion": { id: "s-vieja", diaId: "sunday-upper", inicio: ms("2026-11-01T18:00:00"), ultimoCambio: ms("2026-11-01T18:20:00"), actual: "pec-deck", pospuestos: [], pesoElegido: {}, ejercicios: { "pec-deck": [{ kg: 47, reps: 12, t: ms("2026-11-01T18:20:00") }] } } });
    b = await cargarBeta();
    const banner = textoDe(b.d, ".banners");
    caso(banner.includes("Tienes una sesión de Upper sin terminar (hace 2 días, 1 serie).") && textoDe(b.d, ".titulo-dia") === "Push",
      `Sesión abandonada: «${banner.slice(0, 80)}» y abre el día de hoy`);
    pulsar(b.d, "terminar-abandonada");
    await esperar(50);
    const g = datosGuardados();
    caso(g.sesiones.length === 1 && g.sesiones[0].fin === ms("2026-11-01T18:20:00") && !leerJson("gym-beta-sesion"), "«Terminarla» la guarda con el fin en su último cambio");
    sinErrores(b, "abandonada");
    quitar(b);
  }

  // Sesión abandonada del mismo día (un martes a medias y, una semana después, otro martes)
  {
    await preparar(await datosBeta(), { "gym-beta-sesion": { id: "s-semana-pasada", diaId: "tuesday-push", inicio: ms("2026-10-27T18:00:00"), ultimoCambio: ms("2026-10-27T18:10:00"), actual: "machine-chest-press", pospuestos: [], pesoElegido: {}, ejercicios: { "machine-chest-press": [{ kg: 80, reps: 10, t: ms("2026-10-27T18:05:00") }, { kg: 80, reps: 9, t: ms("2026-10-27T18:10:00") }] } } });
    const b = await cargarBeta();
    caso(textoDe(b.d, 'li[data-ej="machine-chest-press"] .ej-estado') === "0/3" && !existe(b.d, "terminar-sesion") && textoDe(b.d, ".banners").includes("sin terminar (hace 7 días, 2 series)"),
      "Una sesión abandonada del mismo día no cuenta como en curso: la lista empieza de cero y sale el banner");
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    caso(textoDe(b.d, ".capa-hoja .hoja").includes("¿La guardas y empiezas una nueva?"), "Al marcar una serie, pregunta antes de mezclarla con la sesión vieja");
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => leerJson("gym-beta-sesion")?.id !== "s-semana-pasada", 3000);
    await esperar(50);
    const nueva = leerJson("gym-beta-sesion");
    const g = datosGuardados();
    caso(g.sesiones.length === 1 && g.sesiones[0].id === "s-semana-pasada" && g.sesiones[0].fin === ms("2026-10-27T18:10:00")
      && nueva?.ejercicios?.["machine-chest-press"]?.length === 1 && nueva.inicio >= ms("2026-11-03T18:00:00"),
    "La vieja se guarda con su último cambio y la serie va a una sesión nueva de hoy");
    sinErrores(b, "abandonada del mismo día");
    quitar(b);
  }

  // Aviso de versión nueva vista por primera vez
  {
    await preparar(await datosBeta(), { "gym-beta-ui": { versionVista: "0.0.9" } });
    const b = await cargarBeta();
    const { VERSION } = await import("/beta/js/version.js");
    caso(avisoActual(b.d) === `Beta actualizada a la ${VERSION}` && existe(b.d, "aviso-accion") && leerJson("gym-beta-ui").versionVista === VERSION, `F29 al abrir una versión nueva: «${avisoActual(b.d)}» con «Novedades»`);
    quitar(b);
  }

  // F17 recuperar una copia automática
  {
    const copias = await import("/beta/js/copias.js");
    const vieja = await datosBeta({ cambios: (d) => { d.dias[0].title = "De la copia"; } });
    await preparar(await datosBeta());
    await real(copias.guardarCopiaAuto(vieja, "fin de sesión", ms("2026-11-02T19:34:00"), { espera: 60000 }));
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    pulsar(b.d, "ver-copias-auto");
    await hastaQue(() => existe(b.d, "recuperar-copia"), 200);
    caso(textoDe(b.d, "#copias-auto").includes("2 nov, 19:34 · fin de sesión"), `F17 la lista: «${textoDe(b.d, "#copias-auto").slice(0, 60)}»`);
    b.d.querySelector('[data-accion="recuperar-copia"]').click();
    await hastaQue(() => Boolean(hojaAbierta(b.d)), 200);
    pulsar(b.d, "confirmar");
    await hastaQue(() => avisoActual(b.d).startsWith("Copia recuperada"), 300);
    caso(datosGuardados().dias[0].title === "De la copia" && avisoActual(b.d) === "Copia recuperada", "F17 recuperar una copia automática");
    const lista = await real(copias.listarCopiasAuto());
    caso(lista[0].motivo === "antes de recuperar una copia", "F17 antes de recuperar se guarda otra copia automática");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(datosGuardados().dias[0].title === "Push", "F17 con Deshacer vuelven los datos de antes");
    for (let i = 0; i < 11; i += 1) await real(copias.guardarCopiaAuto(vieja, "fin de sesión", i, { espera: 60000 }));
    caso((await real(copias.listarCopiasAuto())).length === 10, "F17 se guardan como mucho 10 copias automáticas");
    sinErrores(b, "F17");
    quitar(b);
  }

  // F36 corregir series de sesiones pasadas (la marca no cambia)
  {
    const datos = await datosBeta();
    datos.sesiones.push(sesionInventada(datos, "tuesday-push", "2026-11-01T18:00:00", { id: "s-corregir" }));
    await preparar(datos);
    const b = await cargarBeta();
    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(50);
    pulsar(b.d, "ver-sesion", "s-corregir");
    await esperar(50);
    const pastilla = (i) => b.d.querySelector(`[data-accion="corregir-serie"][data-id="machine-chest-press"][data-indice="${i}"]`);
    pastilla(1).click();
    await esperar(50);
    hojaAbierta(b.d).querySelector('[data-accion="kg-mas"]').click();
    hojaAbierta(b.d).querySelector('[data-accion="guardar-serie-pasada"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    const serie = () => datosGuardados().sesiones[0].ejercicios[0].series;
    caso(serie()[1].kg === 82.5 && datosGuardados().ejercicios["machine-chest-press"].pr === 80 && avisoActual(b.d) === "Serie 2 corregida" && pastilla(1)?.textContent === "82,5×10",
      "F36 corregir una serie pasada cambia el historial y no la marca");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(serie()[1].kg === 80, "F36 deshacer la corrección");
    pastilla(0).click();
    await esperar(50);
    hojaAbierta(b.d).querySelector('[data-accion="borrar-serie-pasada"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await esperar(50);
    caso(serie().length === 2 && avisoActual(b.d) === "Serie 1 borrada", "F36 borrar una serie pasada");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(serie().length === 3, "F36 deshacer el borrado");
    sinErrores(b, "F36");
    quitar(b);
  }

  // F35 mover y copiar un ejercicio a otro día
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const enDia = (diaId, id) => datosGuardados().dias.find((d) => d.id === diaId).ejercicios.some((e) => e.exerciseId === id);
    b.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await esperar(50);
    pulsar(b.d, "abrir-dia", "tuesday-push");
    await esperar(50);
    pulsar(b.d, "editar-entrada", "machine-chest-press");
    await esperar(50);
    hojaAbierta(b.d).querySelector('[data-accion="mover-a-dia"]').click();
    await esperar(50);
    const domingo = b.d.querySelector('[data-accion="elegir-destino"][data-id="sunday-upper"]');
    caso(domingo?.disabled && domingo.textContent.includes("Ya está en este día"), "F35 un día donde ya está sale marcado y no se puede elegir");
    b.d.querySelector('[data-accion="elegir-destino"][data-id="thursday-pull"]').click();
    await hastaQueVirtual(() => !hojaAbierta(b.d), 3000);
    await esperar(50);
    caso(!enDia("tuesday-push", "machine-chest-press") && enDia("thursday-pull", "machine-chest-press") && avisoActual(b.d).startsWith("Movido a Jueves"),
      `F35 mover al jueves («${avisoActual(b.d)}»)`);
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(enDia("tuesday-push", "machine-chest-press") && !enDia("thursday-pull", "machine-chest-press"), "F35 deshacer el movimiento");
    pulsar(b.d, "editar-entrada", "pec-deck");
    await esperar(50);
    hojaAbierta(b.d).querySelector('[data-accion="copiar-a-dia"]').click();
    await esperar(50);
    b.d.querySelector('[data-accion="elegir-destino"][data-id="wednesday-lower-a"]').click();
    await hastaQueVirtual(() => b.d.querySelectorAll(".capa-hoja").length === 1, 3000);
    await esperar(50);
    caso(enDia("tuesday-push", "pec-deck") && enDia("wednesday-lower-a", "pec-deck") && avisoActual(b.d).startsWith("Copiado a Miércoles"), "F35 copiar al miércoles deja el ejercicio en los dos días");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    sinErrores(b, "F35");
    quitar(b);
  }

  // F34 cronómetro de los ejercicios por tiempo
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.miercoles });
    pulsar(b.d, "abrir-ejercicio", "side-plank");
    const campo = () => b.d.querySelector('li[data-ej="side-plank"] [data-campo="reps"]');
    caso(campo()?.value === "20" && existe(b.d, "cronometro", "side-plank") && !existe(b.d, "kg-mas", "side-plank"), "F34 por tiempo: segundos (sin peso) y botón de cronómetro");
    pulsar(b.d, "cronometro", "side-plank");
    await esperar(3200);
    const enMarcha = textoDe(b.d, 'li[data-ej="side-plank"] .crono-texto');
    pulsar(b.d, "cronometro", "side-plank");
    await esperar(50);
    caso(enMarcha === "Parar · 0:03" && campo().value === "3" && textoDe(b.d, 'li[data-ej="side-plank"] .hecha-texto') === "Hecha · 3 s",
      `F34 el cronómetro cuenta («${enMarcha}») y al pararlo pone los segundos`);
    pulsar(b.d, "serie-hecha", "side-plank");
    await esperar(50);
    caso(leerJson("gym-beta-sesion")?.ejercicios?.["side-plank"]?.[0]?.reps === 3 && leerJson("gym-beta-sesion").ejercicios["side-plank"][0].kg === null, "F34 la serie por tiempo se apunta en segundos y sin kg");
    sinErrores(b, "F34");
    quitar(b);
  }

  // B1-B5 el brillo de la 0.2.4: el aro del ejercicio abierto y la vuelta de luz al elegir algo
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const estilo = (el, pseudo) => b.w.getComputedStyle(el, pseudo);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    const abierto = b.d.querySelector('li[data-ej="pec-deck"]');
    const cerrado = b.d.querySelector("li.ej:not(.abierto)");
    const aro = estilo(abierto, "::before");
    const halo = estilo(abierto, "::after");
    caso(abierto.classList.contains("abierto") && aro.content !== "none" && (aro.backgroundImage.match(/conic-gradient/g) || []).length === 2
      && halo.filter.includes("blur") && estilo(cerrado, "::before").content === "none", "B1 el ejercicio abierto lleva el aro con sus dos luces y su resplandor; los cerrados, no");
    caso(aro.pointerEvents === "none" && halo.pointerEvents === "none" && aro.animationName.includes("aro-giro"), `B1 el aro gira y no recoge toques (${aro.animationName})`);
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(50);
    const nuevo = b.d.querySelector('li[data-ej="pec-deck"]');
    caso(nuevo !== abierto && nuevo.classList.contains("abierto") && estilo(nuevo, "::before").animationName.startsWith("aro-entrada"),
      "B2 al marcar una serie el ejercicio se vuelve a pintar y su aro da la vuelta rápida");

    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(50);
    const vib = b.d.querySelector('[data-ajuste="vibracion"]');
    if (vib.checked) {
      vib.click();
      await esperar(20);
    }
    caso(!vib.checked && !vib.classList.contains("destello"), "B3 al apagar un interruptor no brilla");
    vib.click();
    caso(vib.checked && vib.classList.contains("destello") && estilo(vib, "::after").animationName === "aro-destello", "B3 al encender un interruptor da una vuelta de luz");
    await esperar(1100);
    caso(!vib.classList.contains("destello"), "B3 la vuelta de luz se va sola");
    const tema = b.d.querySelector('[data-accion="tema"]:not(.activa)');
    tema.click();
    caso(tema.classList.contains("activa") && tema.classList.contains("destello"), "B4 la opción de tema elegida da una vuelta de luz");

    b.d.querySelector('#nav [data-accion="ir-historial"]').click();
    await esperar(50);
    b.d.querySelector('[data-accion="vista-ejercicios"]')?.click();
    await esperar(20);
    const elegido = b.d.querySelector('.selector-opcion.activa[data-accion="vista-ejercicios"]');
    caso(Boolean(elegido?.classList.contains("destello")), "B5 en Historial, «Ejercicios» da una vuelta de luz aunque la pantalla se vuelva a pintar");
    sinErrores(b, "B1-B5");
    quitar(b);
  }
}
