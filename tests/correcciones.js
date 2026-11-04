// Lo arreglado en la 0.2.0 tras las tres revisiones (fallos, datos y convivencia, uso en el móvil): un caso por
// arreglo, con la beta en un iframe y manejada desde fuera. Los datos son inventados o de data/*.json.

import { ms, datosBeta, sesionInventada, conImagenesLocales } from "./datos.js";

export async function ejecutar(c) {
  const {
    caso, esperar, hastaQue, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, recargar, quitar, pulsar, existe,
    teclear, textoDe, avisoActual, hojaAbierta, sinErrores, CLAVES_NORMAL,
  } = c;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const barraVisible = (d) => !d.getElementById("barra-descanso").hidden;
  const estadoDe = (d, id) => textoDe(d, `li[data-ej="${id}"] .ej-estado`);
  const textoHoja = (d) => textoDe(d, ".capa-hoja:last-of-type .hoja");
  const { VERSION } = await import("/beta/js/version.js");
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    guardar("gym-beta-ui", { versionVista: VERSION, ayudaSerieVista: true, ...(extra["gym-beta-ui"] || {}) });
    for (const [k, v] of Object.entries(extra)) if (k !== "gym-beta-ui") guardar(k, v);
  };
  const ir = async (b, pestana) => {
    b.d.querySelector(`#nav [data-accion="ir-${pestana}"]`).click();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === pestana, 1000);
  };
  const sesion = (id, diaId, ejercicios, { actual = null, ultimo = "2026-11-03T17:55:00" } = {}) => ({
    id, diaId, inicio: ms("2026-11-03T17:30:00"), ultimoCambio: ms(ultimo), actual, pospuestos: [], pesoElegido: {}, ejercicios,
  });

  // Medianoche: una serie a las 23:50 y vuelta a la app a las 00:02 sigue con la misma sesión.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: "2026-11-03T23:50:00" });
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    await recargar(b, { ahora: "2026-11-04T00:02:00" });
    const titulo = textoDe(b.d, ".titulo-dia");
    caso(titulo === "Push" && !textoDe(b.d, ".banners").includes("sin terminar") && estadoDe(b.d, "machine-chest-press") === "1/3",
      `medianoche: serie a las 23:50 y vuelta a las 00:02, sigue la sesión de ${titulo} sin «sin terminar»`);
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    caso(!hojaAbierta(b.d) && leerJson("gym-beta-sesion")?.ejercicios?.["machine-chest-press"]?.length === 2,
      "medianoche: la serie siguiente va a la misma sesión, sin preguntar si se guarda y se empieza otra");
    sinErrores(b, "medianoche");
    quitar(b);
  }

  // Descanso de 0:00 (encadenar ejercicios): el ✓ no lanza la alarma.
  {
    await preparar(await datosBeta({ cambios: (d) => { d.dias[0].ejercicios[0].rest = "0:00"; } }));
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    const sinBoton = !existe(b.d, "empezar-descanso", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(600);
    caso(sinBoton && !barraVisible(b.d) && b.d.getElementById("capa-fin").hidden && b.espia.osciladores === 0 && !b.espia.vibraciones.some(Array.isArray),
      "descanso 0:00: el ✓ no empieza descanso ni hace sonar el aviso (y no hay botón «Descanso»)");
    sinErrores(b, "descanso 0:00");
    quitar(b);
  }

  // El descanso se empieza a mano, también con «Empezar el descanso al marcar una serie» apagado.
  {
    await preparar(await datosBeta({ cambios: (d) => { d.ajustes.descansoAlMarcar = false; } }));
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(50);
    const sinBarra = !barraVisible(b.d);
    pulsar(b.d, "empezar-descanso", "pec-deck");
    await esperar(50);
    const g = leerJson("gym-beta-descanso");
    caso(sinBarra && barraVisible(b.d) && g?.duracion === 90 && g.texto === "Te toca la serie 2 de 3" && textoDe(b.d, ".barra-cuenta") === "1:30",
      `descanso a mano: con el ajuste apagado el ✓ no lo empieza y «Descanso 1:30» sí (${textoDe(b.d, ".barra-cuenta")})`);
    sinErrores(b, "descanso a mano");
    quitar(b);
  }

  // «Saltar» se puede deshacer; tras un ✓ los ✓ no recogen toques un momento; la fila de días se esconde en la sesión.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    const hecha = b.d.querySelector('[data-accion="serie-hecha"][data-id="machine-chest-press"]');
    const caja = hecha.getBoundingClientRect();
    const debajo = b.d.elementFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2);
    const bloqueado = hecha.classList.contains("recien") && b.w.getComputedStyle(hecha).pointerEvents === "none" && !debajo?.closest('[data-accion="serie-hecha"]');
    await esperar(900);
    const libre = !hecha.classList.contains("recien") && b.w.getComputedStyle(hecha).pointerEvents !== "none";
    caso(bloqueado && libre, "doble toque: justo tras un ✓, el ✓ no recoge toques (no se apuntan dos series); al momento vuelve a funcionar");
    const filaOculta = b.d.getElementById("fila-dias").hidden && existe(b.d, "ver-dias");
    pulsar(b.d, "ver-dias");
    await esperar(30);
    caso(filaOculta && !b.d.getElementById("fila-dias").hidden, "con una sesión en marcha se esconde la fila de días; «Otros días» la enseña");
    pulsar(b.d, "descanso-saltar");
    await esperar(50);
    const saltado = !barraVisible(b.d) && avisoActual(b.d) === "Descanso saltado";
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(saltado && barraVisible(b.d) && leerJson("gym-beta-descanso")?.finEn > 0 && textoDe(b.d, ".barra-cuenta").startsWith("2:"),
      `«Saltar» se puede deshacer: el descanso vuelve como estaba (${textoDe(b.d, ".barra-cuenta")})`);
    sinErrores(b, "saltar y doble toque");
    quitar(b);
  }

  // A 360 px, tras cada ✓ y al volver a abrir la app a mitad de sesión, el ✓ queda a la vista (ni bajo la barra ni bajo el aviso).
  {
    await preparar(await datosBeta({ cambios: (d) => { d.ejercicios["machine-chest-press"].notas = "Asiento 4 · respaldo 2"; } }));
    const b = await cargarBeta({ ancho: 360, alto: 780 });
    const visible = () => {
      const boton = b.d.querySelector("li.ej.abierto .boton-hecha");
      if (!boton) return false;
      const hecha = boton.getBoundingClientRect();
      const barra = barraVisible(b.d) ? b.d.getElementById("barra-descanso").getBoundingClientRect() : { top: b.w.innerHeight - 64 };
      const cabecera = b.d.getElementById("cabecera").getBoundingClientRect();
      const aviso = b.d.querySelector("#avisos .aviso")?.getBoundingClientRect();
      const tapa = aviso && aviso.top < hecha.bottom && aviso.bottom > hecha.top;
      return hecha.top >= cabecera.bottom && hecha.bottom <= barra.top && !tapa;
    };
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    const tras1 = visible();
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    const tras2 = visible();
    caso(tras1 && tras2, "a 360 px, tras cada ✓ el ✓ siguiente se ve entero (ni bajo la barra de descanso ni bajo el aviso)");
    const lado = b.d.querySelectorAll("li.ej.abierto .control");
    caso(lado.length === 2 && Math.abs(lado[0].getBoundingClientRect().top - lado[1].getBoundingClientRect().top) < 2, "a 360 px, Peso y Repeticiones van lado a lado");
    await recargar(b);
    caso(visible() && b.w.scrollY > 0, `al volver a abrir a mitad de sesión, la pantalla va al ejercicio en curso y su ✓ se ve (desplazada ${Math.round(b.w.scrollY)} px)`);
    sinErrores(b, "✓ a la vista");
    quitar(b);
  }

  // «Hacer después» con «Deshacer», y por día: no se cuela en otro día con el mismo ejercicio.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "posponer", "machine-chest-press");
    await esperar(50);
    const pospuesto = estadoDe(b.d, "machine-chest-press") === "Después" && avisoActual(b.d).endsWith("lo dejas para el final.");
    pulsar(b.d, "deshacer");
    await esperar(50);
    caso(pospuesto && estadoDe(b.d, "machine-chest-press") === "0/3" && b.d.querySelector('li[data-ej="machine-chest-press"]').classList.contains("abierto"),
      "«Hacer después» se puede deshacer: el ejercicio vuelve a su sitio, abierto");
    pulsar(b.d, "posponer", "machine-chest-press");
    await esperar(30);
    pulsar(b.d, "elegir-dia", "sunday-upper");
    await esperar(50);
    const domingo = estadoDe(b.d, "machine-chest-press");
    pulsar(b.d, "elegir-dia", "tuesday-push");
    await esperar(50);
    caso(domingo === "0/3" && estadoDe(b.d, "machine-chest-press") === "Después", `«Hacer después» del martes no se cuela en el domingo (${domingo}) y en el martes sigue`);
    sinErrores(b, "hacer después");
    quitar(b);
  }

  // Deshacer seguros: tras terminar la sesión no queda el «Deshacer» de la última serie; un cambio de datos quita el anterior.
  {
    const datos = await datosBeta();
    const dia = datos.dias.find((d) => d.id === "tuesday-push");
    const ejercicios = {};
    let t = ms("2026-11-03T17:00:00");
    dia.ejercicios.forEach((e, i) => {
      const n = i === dia.ejercicios.length - 1 ? e.series - 1 : e.series;
      ejercicios[e.exerciseId] = Array.from({ length: n }, () => ({ kg: datos.ejercicios[e.exerciseId].tipo === "peso" ? 20 : null, reps: 10, t: (t += 60000) }));
    });
    const ultimo = dia.ejercicios[dia.ejercicios.length - 1].exerciseId;
    datos.sesiones.push(sesionInventada(datos, "sunday-upper", "2026-11-01T18:00:00", { id: "s-vieja" }));
    await preparar(datos, { "gym-beta-sesion": sesion("s-casi", "tuesday-push", ejercicios, { actual: ultimo }) });
    const b = await cargarBeta();
    pulsar(b.d, "serie-hecha", ultimo);
    await esperar(50);
    const conDeshacer = existe(b.d, "deshacer");
    pulsar(b.d, "terminar-sesion");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 2000);
    caso(conDeshacer && !existe(b.d, "deshacer") && !leerJson("gym-beta-sesion") && datosGuardados().sesiones.some((s) => s.id === "s-casi"),
      "al terminar la sesión se quita el «Deshacer» de la última serie (ya no puede resucitarla)");
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    await ir(b, "historial");
    pulsar(b.d, "ver-sesion", "s-vieja");
    await esperar(50);
    pulsar(b.d, "borrar-sesion", "s-vieja");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => avisoActual(b.d) === "Sesión borrada", 2000);
    await ir(b, "rutina");
    pulsar(b.d, "bajar-dia", "tuesday-push");
    await esperar(50);
    const g = datosGuardados();
    caso(!existe(b.d, "deshacer") && g.dias[1].id === "tuesday-push" && g.sesiones.some((s) => s.id === "s-casi") && !g.sesiones.some((s) => s.id === "s-vieja"),
      "tras borrar una sesión, otro cambio (el orden de los días) quita su «Deshacer»: no se lleva por delante lo de después");
    // Atrás tras cambiar de pestaña desde un detalle: vuelve a Entreno.
    await ir(b, "historial");
    pulsar(b.d, "ver-sesion", "s-casi");
    await esperar(50);
    b.d.querySelector('#nav [data-accion="ir-rutina"]').click();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "rutina", 1000);
    const enRutina = b.w.location.hash === "#/rutina";
    b.w.history.back();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === "entreno", 1000);
    caso(enRutina && b.w.location.hash === "#/entreno", `Historial → detalle → Rutina → Atrás vuelve a Entreno (${b.w.location.hash})`);
    sinErrores(b, "deshacer seguros");
    quitar(b);
  }

  // Sesión de un día que ya no está en la rutina: se puede terminar o descartar.
  {
    await preparar(await datosBeta(), { "gym-beta-sesion": sesion("s-huerfana", "day-borrado", { "pec-deck": [{ kg: 40, reps: 10, t: ms("2026-11-03T17:40:00") }] }) });
    const b = await cargarBeta();
    const banner = textoDe(b.d, ".banners");
    const botones = existe(b.d, "terminar-abandonada") && existe(b.d, "descartar-abandonada");
    pulsar(b.d, "terminar-abandonada");
    await esperar(50);
    caso(banner.includes("de un día que ya no está en la rutina") && botones && !leerJson("gym-beta-sesion") && datosGuardados().sesiones.some((s) => s.id === "s-huerfana"),
      "sesión de un día que ya no existe: banner con «Terminarla» y «Descartarla»; «Terminarla» la guarda");
    sinErrores(b, "sesión huérfana");
    quitar(b);
  }

  // Almacenamiento lleno al terminar: la sesión no se borra ni sale «Sesión guardada».
  {
    await preparar(await datosBeta(), { "gym-beta-sesion": sesion("s-lleno", "tuesday-push", { "machine-chest-press": [{ kg: 80, reps: 10, t: ms("2026-11-03T17:50:00") }] }, { actual: "machine-chest-press" }) });
    const b = await cargarBeta();
    const original = b.w.Storage.prototype.setItem;
    b.w.Storage.prototype.setItem = function lleno(k, v) {
      if (k === "gym-beta-datos") throw new b.w.DOMException("Lleno", "QuotaExceededError");
      return original.call(this, k, v);
    };
    pulsar(b.d, "terminar-sesion");
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    pulsar(b.d, "confirmar");
    await esperar(400);
    b.w.Storage.prototype.setItem = original;
    caso(leerJson("gym-beta-sesion")?.id === "s-lleno" && !datosGuardados().sesiones.some((s) => s.id === "s-lleno")
      && textoDe(b.d, ".hoja-titulo") !== "Sesión guardada" && avisoActual(b.d).startsWith("No se ha podido guardar la sesión"),
    `almacenamiento lleno al terminar: la sesión sigue abierta y se dice («${avisoActual(b.d).slice(0, 50)}…»)`);
    sinErrores(b, "lleno al terminar");
    quitar(b);
  }

  // «BETA» apunta un fallo o una idea con dónde se estaba; Intro pasa de Peso a Repeticiones; 0 kg y fuera de rango.
  {
    await preparar(await datosBeta({ cambios: (d) => { d.ejercicios["pec-deck"].pr = null; } }));
    const b = await cargarBeta();
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    b.d.getElementById("boton-beta").click();
    await hastaQueVirtual(() => Boolean(hojaAbierta(b.d)), 1000);
    const hoja = hojaAbierta(b.d);
    teclear(b.d, hoja.querySelector('[data-campo="apunte"]'), "El peso propuesto no cuadra", { cambio: false });
    hoja.querySelector('[data-accion="guardar-apunte"]').click();
    await esperar(30);
    const a = datosGuardados().apuntes[0];
    caso(a?.pantalla === "entreno" && a.contexto?.includes("Press de pecho") && a.contexto.includes("serie 1 de 3"),
      `«BETA» abre los apuntes desde cualquier pantalla y guarda dónde se estaba («${a?.contexto}»)`);
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    const kg = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="kg"]');
    const reps = b.d.querySelector('li[data-ej="machine-chest-press"] [data-campo="reps"]');
    kg.focus();
    kg.dispatchEvent(new b.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const pasa = b.d.activeElement === reps;
    reps.dispatchEvent(new b.w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    caso(pasa && b.d.activeElement !== reps && !leerJson("gym-beta-sesion") && kg.getAttribute("enterkeyhint") === "next",
      "Intro en Peso pasa a Repeticiones; en Repeticiones cierra el teclado sin apuntar la serie");
    teclear(b.d, kg, "1000", { cambio: false });
    teclear(b.d, reps, "250", { cambio: false });
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(30);
    const errores = [...b.d.querySelectorAll('li[data-ej="machine-chest-press"] .control-error')].map((p) => p.textContent);
    caso(errores.join(" | ") === "Como mucho 999,5 kg. | Entre 0 y 200 repeticiones." && !leerJson("gym-beta-sesion"),
      `fuera de rango, cada campo dice su límite (${errores.join(" | ")})`);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    const texto = textoDe(b.d, 'li[data-ej="pec-deck"] .hecha-texto');
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(30);
    caso(texto === "Pon el peso" && !leerJson("gym-beta-sesion") && textoDe(b.d, 'li[data-ej="pec-deck"] [data-control="kg"] .control-error').startsWith("Pon el peso."),
      "con peso y sin peso puesto (0 kg), el ✓ dice «Pon el peso» y no apunta nada");
    sinErrores(b, "BETA, Intro y 0 kg");
    quitar(b);
  }

  // Un descanso que acabó hace rato (página congelada) con la app a la vista: sin alarma tardía. Oculta: aviso normal.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    b.espia.permiso = "granted";
    const g = { exerciseId: "pec-deck", diaId: "tuesday-push", nombre: "Pec deck", texto: "Te toca la serie 2 de 3", capa: "Serie 2 de 3 · Pec deck", duracion: 90, quedan: null, avisado: false, terminadoEn: null };
    guardar("gym-beta-descanso", { ...g, id: "tarde-1", finEn: ms("2026-11-03T18:00:00") - 20000 });
    await hastaQueVirtual(() => textoDe(b.d, ".barra-texto").startsWith("El descanso acabó hace"), 1500);
    caso(textoDe(b.d, ".barra-texto").startsWith("El descanso acabó hace") && b.d.getElementById("capa-fin").hidden && b.espia.osciladores === 0,
      `al volver con el descanso acabado hace rato: «${textoDe(b.d, ".barra-texto")}», sin sonido ni capa`);
    await esperar(5200);
    b.espia.ocultar();
    guardar("gym-beta-descanso", { ...g, id: "tarde-2", finEn: ms("2026-11-03T18:00:00") - 20000 });
    await hastaQueVirtual(() => b.espia.notificaciones.some((n) => n.titulo === "Te toca la serie 2 de 3"), 1500);
    caso(b.espia.notificaciones.some((n) => n.titulo === "Te toca la serie 2 de 3"), "con la app oculta, el aviso (y su notificación) sale aunque llegue tarde");
    b.espia.mostrar();
    sinErrores(b, "aviso tardío");
    quitar(b);
  }

  // Un descanso en pausa olvidado se quita; uno reciente se queda, sin pedir la pantalla encendida si no hay sesión.
  {
    const hora0 = ms("2026-11-03T18:00:00");
    const pausa = { id: "p1", exerciseId: "pec-deck", diaId: "tuesday-push", nombre: "Pec deck", texto: "Te toca la serie 2 de 3", capa: "Serie 2 de 3 · Pec deck", duracion: 90, finEn: null, quedan: 60, avisado: false, terminadoEn: null };
    await preparar(await datosBeta(), { "gym-beta-descanso": { ...pausa, pausadoEn: hora0 - 40 * 60000 } });
    let b = await cargarBeta();
    const vieja = !leerJson("gym-beta-descanso") && !barraVisible(b.d);
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-descanso": pausa });
    b = await cargarBeta();
    const sinHora = !leerJson("gym-beta-descanso");
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-descanso": { ...pausa, pausadoEn: hora0 - 60000 } });
    b = await cargarBeta();
    b.espia.ocultar();
    await esperar(30);
    b.espia.mostrar();
    await esperar(50);
    caso(vieja && sinHora && Boolean(leerJson("gym-beta-descanso")) && barraVisible(b.d) && b.espia.locks.length === 0,
      "descanso en pausa: de hace 40 min, o sin hora y sin sesión, se quita; uno reciente se queda sin pedir la pantalla encendida");
    sinErrores(b, "pausa olvidada");
    quitar(b);
  }

  // Las dos versiones a la vez: aviso de que la normal ha cambiado, qué cambia y volver a copiar quedándose con la marca más alta.
  {
    for (const k of CLAVES_NORMAL) localStorage.removeItem(k);
    guardar("gym-routine-data-v1", await conImagenesLocales({ exercises: { "pec-deck": { pr: 50 } } }));
    await preparar(await datosBeta({ cambios: (d) => {
      d.ejercicios["pec-deck"].pr = 60;
      d.marcas.push({ exerciseId: "pec-deck", kg: 60, fecha: ms("2026-11-02T18:00:00"), motivo: "sesion" });
    } }), { "gym-beta-ui": { normalCopiada: { huella: "0-otra", fecha: ms("2026-11-01T10:00:00") } } });
    const b = await cargarBeta();
    const banner = textoDe(b.d, ".banners");
    pulsar(b.d, "ver-cambios-normal");
    await hastaQue(() => textoHoja(b.d).includes("Marcas distintas"), 300);
    const cambios = textoHoja(b.d);
    caso(banner.includes("La versión normal ha cambiado desde que la copiaste (1 nov).") && cambios.includes("Pec deck / chest fly: aquí 60 kg · en la normal 50 kg"),
      `si la normal ha cambiado, Entreno lo dice y «Ver qué cambia» lo enseña («${cambios.slice(0, 90)}…»)`);
    pulsar(b.d, "copiar-normal");
    await hastaQue(() => textoHoja(b.d).includes("bajarían"), 300);
    const hoja = textoHoja(b.d);
    const casilla = b.d.querySelector("#quedarse-maxima");
    pulsar(b.d, "confirmar");
    await hastaQue(() => avisoActual(b.d).startsWith("Rutina copiada"), 300);
    caso(hoja.includes("Pec deck / chest fly: 60 kg → 50 kg") && casilla?.checked && datosGuardados().ejercicios["pec-deck"].pr === 60
      && leerJson("gym-beta-ui").normalCopiada?.huella !== "0-otra" && !textoDe(b.d, ".banners").includes("ha cambiado"),
    "«Volver a copiar» enseña qué marcas bajarían y, con la casilla marcada, se queda con la más alta");
    sinErrores(b, "la normal ha cambiado");
    quitar(b);
    c.restaurarNormal();
  }

  // Ajustes: «Guardar copia» dice lo que de verdad hace en el móvil, y el permiso de notificaciones que falta se ve.
  // Cargar una copia con datos raros lo dice en la vista previa; una copia antigua sin cambios no se deja cargar.
  {
    const copias = await import("/beta/js/copias.js");
    await preparar(await datosBeta());
    const b = await cargarBeta();
    b.espia.compartir = "no";
    await ir(b, "ajustes");
    caso(textoDe(b.d, '#pantalla [data-accion="guardar-copia"]') === "Descargar copia" && !existe(b.d, "descargar-copia") && textoDe(b.d, "#pantalla").includes("carpeta Descargas"),
      "sin poder compartir archivos .json (Chrome de Android), el botón dice «Descargar copia» y dónde queda");
    caso(textoDe(b.d, "#estado-permiso").startsWith("Falta el permiso") && b.d.querySelector('[data-ajuste="timerNotification"]').closest(".fila-interruptor").classList.contains("sin-permiso"),
      "sin permiso de notificaciones, Ajustes dice que no llegarán y el interruptor se ve apagado");
    const meter = async (texto) => {
      const input = b.d.querySelector('[data-campo="archivo"]');
      const dt = new b.w.DataTransfer();
      dt.items.add(new b.w.File([texto], "copia.json", { type: "application/json" }));
      input.files = dt.files;
      input.dispatchEvent(new b.w.Event("change", { bubbles: true }));
      await hastaQue(() => Boolean(hojaAbierta(b.d)) || Boolean(textoDe(b.d, "#error-carga")), 200);
    };
    const conRaras = await datosBeta();
    conRaras.sesiones = [sesionInventada(conRaras, "tuesday-push", "2026-10-27T18:00:00", { id: "s-buena" })];
    const exp = copias.construirExportacion(conRaras, ms("2026-11-03T10:00:00"));
    exp.beta.sesiones.push({ id: 5, diaId: null }, { ...exp.beta.sesiones[0], id: "s-rara", inicio: 1e17, fin: 1e17 + 1 });
    await meter(JSON.stringify(exp));
    const previa = textoHoja(b.d);
    pulsar(b.d, "cancelar");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(previa.includes("2 sesiones con datos raros no se cargan; se guardan aparte."), "la vista previa dice qué sesiones raras no se cargan");
    await meter('{"days": {"tuesday-push": {"removed": 7}}}');
    const sinCambios = textoHoja(b.d);
    const sinBotonCargar = !b.d.querySelector('.capa-hoja [data-accion="confirmar"]');
    pulsar(b.d, "cancelar");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    caso(sinCambios.includes("Esta copia no trae cambios") && sinBotonCargar, "una copia antigua sin cambios se enseña, pero no se deja cargar");
    sinErrores(b, "ajustes y copias");
    quitar(b);
  }

  // La primera vez ofrece permitir los avisos (fuera de cualquier serie).
  {
    await limpiarBeta();
    const b = await cargarBeta();
    const tarjeta = existe(b.d, "permitir-avisos");
    b.espia.permiso = "granted";
    pulsar(b.d, "permitir-avisos");
    await hastaQueVirtual(() => textoDe(b.d, "#tarjeta-permiso").startsWith("Hecho"), 1000);
    caso(tarjeta && textoDe(b.d, "#tarjeta-permiso").startsWith("Hecho: te avisaré"), "la primera vez se ofrece «Permitir avisos» y dice lo que ha pasado");
    sinErrores(b, "primera vez y avisos");
    quitar(b);
  }
}
