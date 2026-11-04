// El temporizador de descanso (casos D1-D5), con descansos cortos y el reloj virtual.

import { ms, datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const { caso, esperar, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, textoDe, hojaAbierta, sinErrores } = c;
  const barraVisible = (d) => !d.getElementById("barra-descanso").hidden;
  const capaVisible = (d) => !d.getElementById("capa-fin").hidden;
  const descansoGuardado = () => leerJson("gym-beta-descanso");
  const cortos = (segundos) => (d) => {
    for (const dia of d.dias) for (const e of dia.ejercicios) e.rest = `0:${String(segundos).padStart(2, "0")}`;
  };
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    for (const [k, v] of Object.entries(extra)) guardar(k, v);
  };
  const marcar = async (b, id = "machine-chest-press") => {
    if (!b.d.querySelector(`li[data-ej="${id}"].abierto`)) pulsar(b.d, "abrir-ejercicio", id);
    pulsar(b.d, "serie-hecha", id);
    await esperar(30);
  };

  // D1 −15 s, +15 s, Pausar, Seguir y Saltar
  {
    await preparar(await datosBeta({ cambios: cortos(10) }));
    const b = await cargarBeta();
    await marcar(b);
    caso(barraVisible(b.d) && textoDe(b.d, ".barra-cuenta") === "0:10", `D1 empieza el descanso del ejercicio (${textoDe(b.d, ".barra-cuenta")})`);
    pulsar(b.d, "descanso-mas15");
    const mas = textoDe(b.d, ".barra-cuenta");
    pulsar(b.d, "descanso-menos15");
    const menos = textoDe(b.d, ".barra-cuenta");
    pulsar(b.d, "descanso-menos15");
    const minimo = textoDe(b.d, ".barra-cuenta");
    caso(mas === "0:25" && menos === "0:10" && minimo === "0:05", `D1 +15 s → ${mas}, −15 s → ${menos}, y no baja de 0:05 (${minimo})`);
    pulsar(b.d, "descanso-pausa");
    const enPausa = textoDe(b.d, ".barra-cuenta");
    await esperar(3000);
    caso(textoDe(b.d, ".barra-cuenta") === enPausa && descansoGuardado()?.finEn === null && textoDe(b.d, ".barra-texto").startsWith("En pausa")
      && textoDe(b.d, '[data-accion="descanso-pausa"]') === "Seguir", `D1 en pausa no avanza (${enPausa}) y el botón dice «Seguir»`);
    pulsar(b.d, "descanso-pausa");
    await esperar(1600);
    caso(textoDe(b.d, ".barra-cuenta") < enPausa && descansoGuardado()?.finEn > 0, `D1 al seguir, vuelve a correr (${textoDe(b.d, ".barra-cuenta")})`);
    pulsar(b.d, "descanso-saltar");
    await esperar(6000);
    caso(!barraVisible(b.d) && !descansoGuardado() && b.espia.osciladores === 0 && !capaVisible(b.d), "D1 Saltar acaba sin sonido ni aviso");
    sinErrores(b, "D1");
    quitar(b);
  }

  // D2 Al acabar: capa, vibración, sonido y sin notificación con la app a la vista
  {
    await preparar(await datosBeta({ cambios: cortos(5) }));
    const b = await cargarBeta();
    b.espia.permiso = "granted";
    await marcar(b);
    await hastaQueVirtual(() => capaVisible(b.d), 8000, 100);
    caso(capaVisible(b.d) && textoDe(b.d, ".capa-titulo") === "¡Te toca!" && textoDe(b.d, ".capa-texto") === "Serie 2 de 3 · Press de pecho tumbado en máquina",
      `D2 sale la capa: «${textoDe(b.d, "#capa-fin")}»`);
    const vibracionFin = b.espia.vibraciones.find((v) => Array.isArray(v));
    caso(JSON.stringify(vibracionFin) === "[400,150,400,150,800]", `D2 vibra con [400, 150, 400, 150, 800] (${JSON.stringify(b.espia.vibraciones)})`);
    caso(b.espia.osciladores === 4 && b.espia.notificaciones.length === 0, `D2 el sonido suena 1 vez y no hay notificación (${b.espia.osciladores / 4} sonidos, ${b.espia.notificaciones.length} notificaciones)`);
    caso(textoDe(b.d, ".barra-cuenta") === "¡Te toca!" && textoDe(b.d, "#capa-fin .capa-pie") === "Toca para cerrar", "D2 la barra dice «¡Te toca!» y la capa, «Toca para cerrar» (arriba)");
    await esperar(4200);
    caso(capaVisible(b.d) && b.d.getElementById("capa-fin").classList.contains("saliendo"), "D2 a los 4 s la capa se desvanece, pero un momento más sigue recogiendo los toques (no caen en el ✓)");
    await esperar(1300);
    caso(!capaVisible(b.d) && !barraVisible(b.d) && !descansoGuardado(), "D2 la capa se va a los 4 s y la barra a los 5 s");
    sinErrores(b, "D2");
    quitar(b);
  }

  // D3 Wake Lock: se pide en la primera serie y se suelta al terminar
  {
    await preparar(await datosBeta({ cambios: cortos(5) }));
    const b = await cargarBeta();
    await marcar(b);
    await esperar(50);
    const pedidos = b.espia.locks.length;
    await esperar(6000);
    await marcar(b);
    await esperar(50);
    const pedidosDespues = b.espia.locks.filter((s) => !s.released).length;
    pulsar(b.d, "terminar-sesion");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 3000);
    await esperar(50);
    const sinSoltar = b.espia.locks.filter((s) => !s.released).length;
    caso(pedidos === 1 && pedidosDespues === 1 && sinSoltar === 0, `D3 tras la primera serie, ${pedidos} pedido; durante la sesión, ${pedidosDespues} activo; al terminar, ${sinSoltar} sin soltar`);
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    sinErrores(b, "D3");
    quitar(b);
  }

  // D4 Al abrir con un descanso guardado
  {
    const hora = ms("2026-11-03T18:00:00");
    const base = { id: "prueba1", exerciseId: "machine-chest-press", diaId: "tuesday-push", nombre: "Press de pecho tumbado en máquina", texto: "Te toca la serie 2 de 3", capa: "Serie 2 de 3", duracion: 60, quedan: null };
    await preparar(await datosBeta(), { "gym-beta-descanso": { ...base, finEn: hora - 20000, avisado: true, terminadoEn: hora - 15000 } });
    let b = await cargarBeta();
    caso(!descansoGuardado() && !barraVisible(b.d), "D4 un descanso ya avisado hace más de 10 s se borra al cargar");
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-descanso": { ...base, finEn: hora - 40000, avisado: false, terminadoEn: null } });
    b = await cargarBeta();
    caso(barraVisible(b.d) && textoDe(b.d, ".barra-texto") === "El descanso acabó hace 40 s" && descansoGuardado()?.avisado === true,
      `D4 uno que acabó sin avisar dice «${textoDe(b.d, ".barra-texto")}» (y ya cuenta como avisado)`);
    await esperar(5500);
    caso(!barraVisible(b.d) && !descansoGuardado() && b.espia.osciladores === 0, "D4 …sin sonido, y a los 5 s se va");
    quitar(b);
    await preparar(await datosBeta(), { "gym-beta-descanso": { ...base, finEn: hora + 30000, avisado: false, terminadoEn: null } });
    b = await cargarBeta();
    caso(barraVisible(b.d) && textoDe(b.d, ".barra-cuenta") === "0:30", `D4 uno que aún corre sigue (${textoDe(b.d, ".barra-cuenta")})`);
    sinErrores(b, "D4");
    quitar(b);
  }

  // D5 Notificaciones con la app oculta
  {
    await preparar(await datosBeta({ cambios: cortos(8) }));
    const b = await cargarBeta();
    b.espia.permiso = "granted";
    await marcar(b);
    b.espia.ocultar();
    await esperar(100);
    const primera = b.espia.notificaciones[0];
    caso(primera?.titulo === "Descanso hasta las 18:00" && primera.opciones.silent === true && primera.opciones.tag === "gym-beta-descanso"
      && primera.opciones.body === "Press de pecho tumbado en máquina · te toca la serie 2 de 3",
    `D5 al ocultarse: «${primera?.titulo}» / «${primera?.opciones.body}», silenciosa y con su etiqueta`);
    await esperar(9000);
    const segunda = b.espia.notificaciones[1];
    caso(segunda?.titulo === "Te toca la serie 2 de 3" && segunda.opciones.renotify === true && segunda.opciones.tag === "gym-beta-descanso"
      && JSON.stringify(segunda.opciones.vibrate) === "[400,150,400,150,800]", `D5 al acabar: «${segunda?.titulo}»`);
    b.espia.mostrar();
    await esperar(100);
    caso(primera?.cerrada === true, "D5 al volver, se cierra la notificación de «Descanso hasta las…»");
    sinErrores(b, "D5");
    quitar(b);
  }
}
