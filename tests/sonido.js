// El «Descanso con sonido» (beta/js/sonido.js y su uso en descanso.js): el WAV (cabecera, duración, el aviso al final
// y un fondo que no es silencio), que Chrome lo lee dentro de la beta (con su CSP), el ajuste (apagado de serie, se
// guarda y va en «beta» al exportar, nunca en «settings»), los consejos de Ajustes, y la Media Session y el <audio>
// con espías: metadata, barra de progreso, botones de la pantalla de bloqueo, pausar, seguir, ±15 s, saltar, el final
// sin doble pitido y qué pasa si el navegador no deja sonar. Descansos cortos y el reloj virtual.

import { ms, datosBeta } from "./datos.js";

// Lee un WAV de 16 bits: la cabecera, las muestras (de −1 a 1) y lo que dura.
function leerWav(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const letras = (pos, n) => String.fromCharCode(...bytes.slice(pos, pos + n));
  const cab = {
    riff: letras(0, 4), tamano: v.getUint32(4, true), wave: letras(8, 4), fmt: letras(12, 4), tamFmt: v.getUint32(16, true),
    formato: v.getUint16(20, true), canales: v.getUint16(22, true), frecuencia: v.getUint32(24, true), bytesSegundo: v.getUint32(28, true),
    bloque: v.getUint16(32, true), bits: v.getUint16(34, true), data: letras(36, 4), tamDatos: v.getUint32(40, true),
  };
  const n = Math.floor((bytes.byteLength - 44) / 2);
  const muestras = new Float32Array(n);
  for (let i = 0; i < n; i += 1) muestras[i] = v.getInt16(44 + i * 2, true) / 32768;
  return { cab, muestras, segundos: n / (cab.frecuencia || 1) };
}

const tramo = (m, f, desde, hasta) => m.subarray(Math.max(0, Math.round(desde * f)), Math.min(m.length, Math.round(hasta * f)));
const pico = (t) => t.reduce((x, y) => Math.max(x, Math.abs(y)), 0);
const rms = (t) => Math.sqrt(t.reduce((s, y) => s + y * y, 0) / Math.max(1, t.length));
// Lo fuerte que suena una frecuencia en un tramo (Goertzel).
function energia(t, f, hz) {
  const k = 2 * Math.cos((2 * Math.PI * hz) / f);
  let s1 = 0;
  let s2 = 0;
  for (const x of t) {
    const s0 = x + k * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - k * s1 * s2;
}
// «0:43» → 43
const segundosDe = (texto) => {
  const [m, s] = String(texto).split(":").map(Number);
  return m * 60 + s;
};

export async function ejecutar(c) {
  const {
    caso, esperar, real, hastaQue, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, textoDe, avisoActual, sinErrores,
  } = c;
  const sonido = await import("/beta/js/sonido.js");
  const { VERSION } = await import("/beta/js/version.js");
  const F = sonido.MUESTRAS_POR_SEGUNDO;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const barraVisible = (d) => !d.getElementById("barra-descanso").hidden;
  const capaVisible = (d) => !d.getElementById("capa-fin").hidden;
  const conSonido = (segundos) => (d) => {
    for (const dia of d.dias) for (const e of dia.ejercicios) e.rest = `0:${String(segundos).padStart(2, "0")}`;
    d.ajustes.descansoConSonido = true;
  };
  const preparar = async (datos) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    guardar("gym-beta-ui", { versionVista: VERSION, ayudaSerieVista: true });
  };
  const marcar = async (b, id = "machine-chest-press") => {
    if (!b.d.querySelector(`li[data-ej="${id}"].abierto`)) pulsar(b.d, "abrir-ejercicio", id);
    pulsar(b.d, "serie-hecha", id);
    await esperar(30);
  };
  const ir = async (b, pestana) => {
    b.d.querySelector(`#nav [data-accion="ir-${pestana}"]`).click();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === pestana, 1000);
  };

  // S1 El WAV: cabecera, duración, el aviso al final, el fondo y los tics
  {
    const s = 7.25;
    const { cab, muestras, segundos } = leerWav(sonido.wavDescanso(s));
    caso(cab.riff === "RIFF" && cab.wave === "WAVE" && cab.fmt === "fmt " && cab.tamFmt === 16 && cab.formato === 1 && cab.canales === 1
      && cab.frecuencia === 8000 && cab.bytesSegundo === 16000 && cab.bloque === 2 && cab.bits === 16 && cab.data === "data"
      && cab.tamDatos === muestras.length * 2 && cab.tamano === 36 + cab.tamDatos,
    `S1 cabecera de un WAV PCM de 16 bits, mono y 8000 Hz (${cab.riff} ${cab.wave} ${cab.formato} ${cab.canales} ${cab.frecuencia} ${cab.bits})`);
    caso(Math.abs(segundos - (s + sonido.SEGUNDOS_AVISO)) < 1 / F, `S1 dura lo que queda del descanso más el aviso (${segundos} s para 7,25 s)`);
    // El aviso: 4 pulsos fuertes justo tras los 7,25 s, de 880 y 1046,5 Hz alternos, y casi nada entre ellos.
    const pulsos = [0, 1, 2, 3].map((i) => tramo(muestras, F, s + i * 0.53, s + i * 0.53 + 0.35));
    const huecos = [0, 1, 2].map((i) => tramo(muestras, F, s + i * 0.53 + 0.36, s + (i + 1) * 0.53 - 0.01));
    const tonos = pulsos.map((t) => (energia(t, F, 880) > energia(t, F, 1046.5) ? 880 : 1046.5));
    caso(pulsos.every((t) => pico(t) > 0.22) && huecos.every((t) => pico(t) < 0.02) && tonos.join() === "880,1046.5,880,1046.5"
      && pico(tramo(muestras, F, s - 0.6, s - 0.05)) < 0.02,
    `S1 al final, el aviso de siempre: 4 pulsos (picos ${pulsos.map((t) => pico(t).toFixed(2)).join(", ")}) de ${tonos.join(", ")} Hz, y antes nada fuerte`);
    // El fondo entre dos tics: no es silencio (Chrome cuenta como audible lo que pasa de −72 dBFS), pero es muy suave.
    const fondo = tramo(muestras, F, 0.4, 1.2);
    const dbfs = 20 * Math.log10(rms(fondo) || 1e-9);
    caso(dbfs > -66 && dbfs < -40 && pico(fondo) < 0.02, `S1 el fondo no es silencio y es muy suave (${dbfs.toFixed(1)} dBFS)`);
    // Los tics: uno cada vez que la cuenta cambia de segundo (con 7,25 s, a los 0,25 s, 1,25 s… 6,25 s) y nada antes.
    const tics = [7, 6, 5, 4, 3, 2, 1].map((n) => pico(tramo(muestras, F, s - n, s - n + 0.03)));
    caso(tics.every((p) => p > 0.02 && p < 0.1) && pico(tramo(muestras, F, 0, 0.2)) < 0.015,
      `S1 un tic suave en cada cambio de segundo (${tics.map((p) => p.toFixed(3)).join(", ")}) y ninguno antes del primero`);
    const sinAviso = leerWav(sonido.wavDescanso(s, { conAviso: false }));
    caso(Math.abs(sinAviso.segundos - (s + sonido.SEGUNDOS_AVISO)) < 1 / F && pico(tramo(sinAviso.muestras, F, s, s + 2)) < 0.02,
      "S1 con «Sonido» apagado, el final del WAV no lleva el aviso");
    const corto = leerWav(sonido.wavDescanso(0.5));
    const largo = sonido.wavDescanso(600);
    caso(Math.abs(corto.segundos - 2.5) < 1 / F && pico(tramo(corto.muestras, F, 0, 0.45)) < 0.015 && pico(tramo(corto.muestras, F, 0.5, 0.85)) > 0.22
      && (largo.byteLength - 44) / 2 === 602 * F,
    "S1 con medio segundo, sin tics y el aviso a los 0,5 s; con 10 min, 602 s justos");
  }

  // S2 Chrome lee el WAV dentro de la beta (su CSP deja media-src blob:) y le da la duración esperada
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const violaciones = [];
    b.d.addEventListener("securitypolicyviolation", (ev) => violaciones.push(ev.violatedDirective));
    const el = new b.w.Audio();
    el.preload = "auto";
    el.src = b.w.URL.createObjectURL(new b.w.Blob([sonido.wavDescanso(3)], { type: "audio/wav" }));
    await hastaQue(() => el.readyState >= 1 || Boolean(el.error), 300);
    caso(el.readyState >= 1 && !el.error && Math.abs(el.duration - 5) < 0.01 && violaciones.length === 0,
      `S2 Chrome lee el WAV dentro de la beta: ${el.error ? `error ${el.error.code}` : `${el.duration} s`}${violaciones.length ? `; CSP: ${violaciones.join(", ")}` : ""}`);
    quitar(b);
  }

  // S3 El ajuste: apagado de serie, los datos de antes valen, va en «beta» al exportar (nunca en «settings»)
  {
    const modelo = await import("/beta/js/modelo.js");
    const copias = await import("/beta/js/copias.js");
    caso(modelo.AJUSTES_POR_DEFECTO.descansoConSonido === false && modelo.normalizarAjustes({}).descansoConSonido === false
      && modelo.normalizarAjustes({ descansoConSonido: "sí" }).descansoConSonido === false && modelo.normalizarAjustes({ descansoConSonido: true }).descansoConSonido === true,
    "S3 «descansoConSonido» apagado de serie; un valor raro vale apagado y true se respeta");
    const viejos = await datosBeta();
    delete viejos.ajustes.descansoConSonido;
    caso(modelo.validarDatos(viejos).ok && modelo.reparar(viejos).datos.ajustes.descansoConSonido === false, "S3 unos datos de antes, sin el ajuste, siguen valiendo (apagado)");
    const con = await datosBeta({ cambios: (d) => { d.ajustes.descansoConSonido = true; } });
    const exp = copias.construirExportacion(con, ms("2026-11-05T10:00:00"));
    caso(exp.beta.ajustes.descansoConSonido === true && Object.keys(exp.settings).sort().join() === "timerAlert,timerNotification,timerSound,transitionMinutes",
      "S3 al exportar va en «beta» y no en «settings» (que sigue con los 4 de la normal)");
    const vuelta = await copias.leerCopia(JSON.stringify(exp), { actuales: null, ahoraMs: 5 });
    const deLaNormal = structuredClone(exp);
    delete deLaNormal.beta;
    const leida = await copias.leerCopia(JSON.stringify(deLaNormal), { actuales: con, ahoraMs: 5 });
    caso(vuelta.ok && vuelta.datosNuevos.ajustes.descansoConSonido === true && leida.ok && copias.aplicarCopia(con, leida, 5).ajustes.descansoConSonido === true,
      "S3 una copia de la beta lo trae y una de la versión normal no lo toca");
  }

  // S4 Ajustes → Descanso: el interruptor (apagado de serie, se guarda al momento) y los consejos plegables
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    await ir(b, "ajustes");
    const interruptor = b.d.querySelector('[data-ajuste="descansoConSonido"]');
    const fila = interruptor?.closest(".fila-interruptor")?.textContent || "";
    caso(Boolean(interruptor) && !interruptor.checked && fila.includes("Descanso con sonido (aviso más fiable)") && fila.includes("tic-tac muy suave")
      && fila.includes("barra de progreso") && fila.includes("Android pausa la música de otras apps"),
    "S4 «Descanso con sonido (aviso más fiable)», apagado y con su ayuda");
    interruptor.click();
    await esperar(30);
    caso(datosGuardados().ajustes.descansoConSonido === true && b.espia.audios.length === 0, "S4 encenderlo se guarda al momento (y sin descanso en marcha no suena nada)");
    const consejos = b.d.querySelector("details.consejos-aviso");
    const resumen = consejos?.querySelector("summary");
    caso(Boolean(consejos) && !consejos.open && resumen.textContent.trim() === "Si el aviso no llega con el móvil bloqueado" && consejos.closest(".seccion")?.textContent.startsWith("Descanso"),
      "S4 los consejos «Si el aviso no llega con el móvil bloqueado» salen plegados en la sección Descanso");
    resumen.click();
    await esperar(30);
    const texto = consejos.textContent;
    caso(consejos.open && consejos.querySelectorAll("li").length === 4 && texto.includes("más de un minuto") && texto.includes("«Mantener la pantalla encendida durante la sesión»")
      && texto.includes("a qué hora acaba") && texto.includes("mensaje emergente") && texto.includes("No molestar") && texto.includes("La vibración la decide Android")
      && texto.includes("enciende «Descanso con sonido»"),
    "S4 al abrirlos, los 4 consejos: Android para la app al minuto, la hora en la notificación, los ajustes de Android y el descanso con sonido");
    sinErrores(b, "S4");
    quitar(b);
  }

  // S5 Con el ajuste: el WAV de lo que queda y su Media Session; la barra y la pantalla de bloqueo lo cambian
  {
    await preparar(await datosBeta({ cambios: conSonido(30) }));
    const b = await cargarBeta();
    const e = b.espia;
    const m = e.medios;
    e.permiso = "granted";
    const wavDe = async (i) => leerWav(new Uint8Array(await real(e.blobDe.get(e.audios[i].src).arrayBuffer())));
    const barra = () => textoDe(b.d, ".barra-cuenta");
    const posicion = () => m.posiciones[m.posiciones.length - 1];
    await marcar(b);
    const w1 = await wavDe(0);
    caso(e.audios.length === 1 && e.audios[0].src.startsWith("blob:") && Math.abs(w1.segundos - 32) < 0.1,
      `S5 el ✓ pone a sonar el WAV de lo que queda más el aviso (${e.audios.length} play(), ${w1.segundos.toFixed(2)} s para 0:30)`);
    const md = m.metadata;
    caso(md?.title === "Descanso · Press de pecho tumbado en máquina" && md.artist === "Te toca la serie 2 de 3" && md.album === "Gym Beta"
      && md.artwork?.[0]?.src.endsWith("/beta/icono-512.png") && md.artwork[0].sizes === "512x512" && md.artwork[0].type === "image/png",
    `S5 Media Session: «${md?.title}» / «${md?.artist}» / «${md?.album}», con el icono de la app`);
    caso(["pause", "play", "nexttrack", "seekforward", "seekbackward"].every((a) => typeof m.botones[a] === "function") && m.playbackState === "playing"
      && posicion()?.duration === 30 && posicion().position < 0.5 && posicion().playbackRate === 1,
    `S5 botones de pausa, seguir, saltar y ±15 s, y la barra de progreso (${JSON.stringify(posicion())})`);
    await esperar(2000);
    pulsar(b.d, "descanso-mas15");
    const w2 = await wavDe(1);
    caso(e.audios.length === 2 && e.revocadas.includes(e.audios[0].src) && Math.abs(w2.segundos - 2 - segundosDe(barra())) <= 1
      && posicion()?.duration === 45 && Math.abs(posicion().position - 2) < 0.6,
    `S5 +15 s: un WAV nuevo (${w2.segundos.toFixed(2)} s con ${barra()}), la URL vieja revocada y la barra a 45 s con 2 ya pasados (${JSON.stringify(posicion())})`);
    pulsar(b.d, "descanso-menos15");
    caso(e.audios.length === 3 && posicion()?.duration === 30 && Math.abs(posicion().position - 2) < 0.6, `S5 −15 s: otro WAV y la barra vuelve a 30 s (${JSON.stringify(posicion())})`);
    const pausasAntes = e.pausasAudio;
    pulsar(b.d, "descanso-pausa");
    await esperar(30);
    caso(e.pausasAudio > pausasAntes && e.audios.length === 3 && m.playbackState === "paused" && m.metadata?.title?.startsWith("Descanso")
      && leerJson("gym-beta-descanso")?.finEn === null,
    "S5 Pausar (barra): el audio se para y la pantalla de bloqueo sigue con el descanso, en pausa");
    pulsar(b.d, "descanso-pausa");
    await esperar(30);
    const w4 = await wavDe(3);
    caso(e.audios.length === 4 && m.playbackState === "playing" && Math.abs(w4.segundos - 2 - segundosDe(barra())) <= 1,
      `S5 Seguir (barra): suena otra vez, con un WAV de lo que queda (${w4.segundos.toFixed(2)} s con ${barra()})`);
    // Los botones de la pantalla de bloqueo: lo mismo que los de la barra.
    m.botones.pause();
    await esperar(30);
    const enPausa = leerJson("gym-beta-descanso")?.finEn === null && textoDe(b.d, ".barra-texto").startsWith("En pausa") && m.playbackState === "paused";
    m.botones.play();
    await esperar(30);
    caso(enPausa && leerJson("gym-beta-descanso")?.finEn > 0 && m.playbackState === "playing" && e.audios.length === 5,
      "S5 pantalla de bloqueo: pausa y seguir, como en la barra");
    const antes = segundosDe(barra());
    m.botones.seekforward();
    await esperar(30);
    const mas = segundosDe(barra());
    m.botones.seekbackward();
    await esperar(30);
    const menos = segundosDe(barra());
    caso(Math.abs(mas - antes - 15) <= 1 && Math.abs(menos - antes) <= 1 && e.audios.length === 7,
      `S5 pantalla de bloqueo: +15 s y −15 s, como en la barra (${antes} → ${mas} → ${menos} s), con un WAV nuevo cada vez`);
    const ultimo = e.audios[e.audios.length - 1].src;
    m.botones.nexttrack();
    await esperar(30);
    caso(!barraVisible(b.d) && !leerJson("gym-beta-descanso") && avisoActual(b.d) === "Descanso saltado" && Boolean(b.d.querySelector('#avisos [data-accion="deshacer"]'))
      && m.metadata === null && Object.keys(m.botones).length === 0 && m.playbackState === "none" && e.revocadas.includes(ultimo) && e.audios[0].el.getAttribute("src") === null,
    "S5 pantalla de bloqueo: saltar acaba el descanso como en la barra («Descanso saltado» con «Deshacer») y quita el audio y la Media Session");
    pulsar(b.d, "deshacer");
    await esperar(30);
    caso(barraVisible(b.d) && e.audios.length === 8 && m.metadata?.title === "Descanso · Press de pecho tumbado en máquina" && m.playbackState === "playing",
      "S5 «Deshacer» vuelve a poner el descanso, y su sonido");
    e.ocultar();
    await esperar(50);
    const aviso = e.notificaciones[e.notificaciones.length - 1];
    caso(aviso?.titulo.startsWith("Descanso hasta las") && aviso.opciones.timestamp === leerJson("gym-beta-descanso")?.finEn,
      "S5 al ocultarse, la notificación lleva como hora el final del descanso");
    e.mostrar();
    await esperar(50);
    await ir(b, "ajustes");
    b.d.querySelector('[data-ajuste="descansoConSonido"]').click();
    await esperar(30);
    caso(m.metadata === null && m.playbackState === "none" && barraVisible(b.d) && datosGuardados().ajustes.descansoConSonido === false,
      "S5 al apagar el ajuste con el descanso en marcha, el sonido se quita al momento (el descanso sigue)");
    sinErrores(b, "S5");
    quitar(b);
  }

  // S6 El final con el sonido puesto: capa y vibración, pero el pitido no se repite (va dentro del audio); cuando el
  // audio acaba, se quita todo
  {
    await preparar(await datosBeta({ cambios: conSonido(2) }));
    const b = await cargarBeta();
    const e = b.espia;
    await marcar(b);
    const sonaba = e.audios.length === 1 && e.medios.playbackState === "playing";
    await hastaQueVirtual(() => capaVisible(b.d), 4000, 50);
    caso(sonaba && capaVisible(b.d) && e.osciladores === 0 && e.vibraciones.some(Array.isArray) && e.medios.metadata !== null && e.audios[0].el.getAttribute("src") !== null,
      `S6 al acabar: capa y vibración, sin el pitido aparte (pitidos: ${e.osciladores / 4}) y el audio sigue con su aviso`);
    e.audios[0].el.dispatchEvent(new b.w.Event("ended"));
    await esperar(30);
    caso(e.medios.metadata === null && Object.keys(e.medios.botones).length === 0 && e.medios.playbackState === "none"
      && e.audios[0].el.getAttribute("src") === null && e.revocadas.includes(e.audios[0].src),
    "S6 cuando el audio acaba, se quitan el audio, su URL y la Media Session");
    sinErrores(b, "S6");
    quitar(b);
  }

  // S7 Si el navegador no deja sonar: se avisa una vez (sin tapar el «Deshacer» de la serie) y el final va como siempre
  {
    await preparar(await datosBeta({ cambios: conSonido(2) }));
    const b = await cargarBeta();
    const e = b.espia;
    e.playFalla = "NotAllowedError";
    await marcar(b);
    const tapado = avisoActual(b.d);
    // Al deshacer la serie se va su «Deshacer» y sale el aviso que esperaba.
    pulsar(b.d, "deshacer");
    await hastaQueVirtual(() => avisoActual(b.d).startsWith("No se pudo"), 2000, 50);
    caso(e.audios.length === 1 && tapado === "Serie 1 apuntada" && avisoActual(b.d) === "No se pudo poner el sonido de fondo: el aviso va como siempre"
      && e.medios.metadata === null && Object.keys(e.medios.botones).length === 0,
    `S7 no tapa el «Deshacer» de la serie («${tapado}») y luego avisa: «${avisoActual(b.d)}»`);
    await marcar(b);
    await esperar(1200);
    const sinRepetir = e.audios.length === 2 && avisoActual(b.d) === "Serie 1 apuntada";
    await hastaQueVirtual(() => capaVisible(b.d), 4000, 50);
    caso(sinRepetir && capaVisible(b.d) && e.osciladores === 4, `S7 no vuelve a avisar y, al acabar, suena el pitido de siempre (pitidos: ${e.osciladores / 4})`);
    sinErrores(b, "S7");
    quitar(b);
  }

  // S8 Al abrir la app con un descanso en marcha (sin un toque, el navegador puede no dejar sonar): no se avisa de
  // nada y el primer toque pone el sonido. Con descanso.js cargado en esta página y su <audio> con espías.
  {
    const descanso = await import("/beta/js/descanso.js");
    const reproducir = HTMLMediaElement.prototype.play;
    const llamadas = [];
    let falla = "NotAllowedError";
    HTMLMediaElement.prototype.play = function play() {
      llamadas.push(this.src);
      return falla ? Promise.reject(new DOMException("No se deja", falla)) : Promise.resolve();
    };
    const medios = { metadata: null, playbackState: "none", setActionHandler() {}, setPositionState() {} };
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: medios });
    const avisos = [];
    descanso.configurarDescanso({ ajustes: () => ({ descansoConSonido: true }), avisar: (t) => avisos.push(t) });
    try {
      guardar("gym-beta-descanso", {
        id: "s8", exerciseId: "pec-deck", diaId: "tuesday-push", nombre: "Pec deck", texto: "Te toca la serie 2 de 3", duracion: 60,
        finEn: Date.now() + 40000, quedan: null, avisado: false, terminadoEn: null,
      });
      descanso.restaurarDescanso();
      await esperar(0);
      const alAbrir = llamadas.length === 1 && avisos.length === 0 && medios.metadata === null;
      falla = null;
      descanso.alTocarPantalla();
      await esperar(0);
      caso(alAbrir && llamadas.length === 2 && medios.metadata?.title === "Descanso · Pec deck" && medios.playbackState === "playing" && avisos.length === 0,
        `S8 al abrir con un descanso en marcha, si no deja sonar no se avisa (${avisos.length} avisos) y el primer toque lo pone (play(): ${llamadas.length})`);
      descanso.saltar();
      caso(medios.metadata === null && medios.playbackState === "none" && !leerJson("gym-beta-descanso"), "S8 y al saltar el descanso se quita");
    } finally {
      descanso.saltar();
      descanso.configurarDescanso({ ajustes: () => ({}), avisar: () => {} });
      HTMLMediaElement.prototype.play = reproducir;
      delete navigator.mediaSession;
    }
  }
}
