// El sonido del descanso: las medidas del aviso del final (descanso.js las usa para su pitido) y el «Descanso con
// sonido». Con ese ajuste, mientras corre el descanso suena un WAV hecho aquí: un ruido de fondo muy suave, un tic
// cada vez que la cuenta cambia de segundo y, al acabar, el mismo aviso de siempre. Chrome para Android congela al
// minuto una página oculta que no suena; con este audio no la congela, así que la cuenta, el aviso y la notificación
// llegan a su hora aunque el móvil esté bloqueado. Suena con un único <audio> fuera del DOM y lleva la Media Session:
// título, carátula, barra de progreso y botones en la pantalla de bloqueo. Nada se ejecuta al importar este módulo.

// El aviso del final: 4 pulsos de 0,35 s con 0,18 s entre ellos, 880 y 1046,5 Hz alternos, que suben de 0,001 a 0,28
// en 20 ms y bajan a 0,001 al acabar el pulso (rampas exponenciales, como las de la Web Audio de descanso.js).
export const AVISO = Object.freeze({
  pulsos: 4, duracion: 0.35, hueco: 0.18, frecuencias: Object.freeze([880, 1046.5]), pico: 0.28, suelo: 0.001, subida: 0.02,
});
export const SEGUNDOS_AVISO = 2; // lo que ocupa el aviso al final del WAV (1,94 s y un respiro)
export const MUESTRAS_POR_SEGUNDO = 8000;
// El ruido de fondo: un rumor grave (ruido con un filtro de paso bajo) de unos −50 dBFS. Casi no se oye, pero Chrome lo
// cuenta como audio audible (su umbral está hacia los −72 dBFS); el silencio no le vale.
const RUIDO_RMS = 0.003;
const RUIDO_FILTRO = 0.2;
// El tic-tac: 30 ms de un tono que se apaga enseguida, uno más agudo y otro más grave, alternos.
const TIC = Object.freeze({ duracion: 0.03, pico: 0.05, caida: 0.006, frecuencias: Object.freeze([1500, 1100]) });
// Los botones de la pantalla de bloqueo (los pone descanso.js; aquí solo se ponen y se quitan).
const ACCIONES = ["play", "pause", "nexttrack", "seekforward", "seekbackward"];

// --- El WAV ---

// El aviso en el instante «t» (segundos desde que empieza); 0 fuera de sus pulsos.
function muestraAviso(t) {
  const { pulsos, duracion, hueco, frecuencias, pico, suelo, subida } = AVISO;
  const i = Math.floor(t / (duracion + hueco));
  if (t < 0 || i >= pulsos) return 0;
  const tau = t - i * (duracion + hueco);
  if (tau >= duracion) return 0;
  const nivel = tau < subida
    ? suelo * (pico / suelo) ** (tau / subida)
    : pico * (suelo / pico) ** ((tau - subida) / (duracion - subida));
  return nivel * Math.sin(2 * Math.PI * frecuencias[i % 2] * tau);
}

const aMuestra = (x) => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

// Lo que se repite en todos los WAV, hecho una sola vez: 2 s de ruido de fondo (ruido uniforme de un xorshift de 32
// bits con semilla fija, por un filtro de paso bajo de un polo) y esos mismos 2 s con un tic al empezar cada segundo
// (el agudo y luego el grave). Así, hacer el WAV de un descanso largo es casi solo copiar.
let plantilla = null;
function hacerPlantilla() {
  if (plantilla) return plantilla;
  const f = MUESTRAS_POR_SEGUNDO;
  const ruido = new Float32Array(2 * f);
  const escala = RUIDO_RMS / (Math.sqrt(1 / 3) * Math.sqrt(RUIDO_FILTRO / (2 - RUIDO_FILTRO)));
  let azar = 0x2545f491;
  let filtrado = 0;
  for (let i = -64; i < ruido.length; i += 1) { // las 64 primeras, para que el filtro arranque
    azar ^= azar << 13;
    azar ^= azar >>> 17;
    azar ^= azar << 5;
    filtrado += RUIDO_FILTRO * ((azar >>> 0) / 2147483648 - 1 - filtrado);
    if (i >= 0) ruido[i] = filtrado * escala;
  }
  const conTics = Float32Array.from(ruido);
  for (let segundo = 0; segundo < 2; segundo += 1) {
    for (let j = 0; j < TIC.duracion * f; j += 1) {
      const desde = j / f;
      conTics[segundo * f + j] += TIC.pico * Math.min(1, desde / 0.001) * Math.exp(-desde / TIC.caida) * Math.sin(2 * Math.PI * TIC.frecuencias[segundo] * desde);
    }
  }
  plantilla = { ruido, soloRuido: Int16Array.from(ruido, aMuestra), conTics: Int16Array.from(conTics, aMuestra) };
  return plantilla;
}

// El WAV (PCM de 16 bits, mono, 8000 muestras por segundo) de un descanso al que le quedan «segundos»: el ruido de
// fondo de principio a fin, un tic cada vez que la cuenta cambia de segundo y, con «conAviso», el aviso justo al
// acabar. Dura «segundos» + SEGUNDOS_AVISO. Devuelve los bytes del archivo (siempre los mismos para los mismos datos).
export function wavDescanso(segundos, { conAviso = true } = {}) {
  const s = Math.max(0, Number(segundos) || 0);
  const f = MUESTRAS_POR_SEGUNDO;
  const n = Math.round((s + SEGUNDOS_AVISO) * f);
  const bytes = new Uint8Array(44 + n * 2);
  const v = new DataView(bytes.buffer);
  const letras = (pos, texto) => {
    for (let i = 0; i < texto.length; i += 1) v.setUint8(pos + i, texto.charCodeAt(i));
  };
  letras(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  letras(8, "WAVE");
  letras(12, "fmt ");
  v.setUint32(16, 16, true); // lo que ocupa el resto del bloque «fmt »
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, f, true);
  v.setUint32(28, f * 2, true); // bytes por segundo
  v.setUint16(32, 2, true); // bytes por muestra
  v.setUint16(34, 16, true); // bits por muestra
  letras(36, "data");
  v.setUint32(40, n * 2, true);
  const { ruido, soloRuido, conTics } = hacerPlantilla();
  const muestras = new Int16Array(bytes.buffer, 44, n);
  const periodo = conTics.length;
  // Copia «largo» muestras de «origen» (que se repite cada 2 s), empezando en su muestra «desde», en «pos».
  const copiar = (origen, desde, pos, largo) => {
    for (let hecho = 0; hecho < largo;) {
      const i = (desde + hecho) % periodo;
      const trozo = Math.min(largo - hecho, periodo - i);
      muestras.set(origen.subarray(i, i + trozo), pos + hecho);
      hecho += trozo;
    }
  };
  // La cuenta cambia de segundo cuando quedan «k» segundos justos (a los s − k): ahí va un tic, el agudo con k par y el
  // grave con k impar. El primero, con k = la parte entera de «s»; antes, solo ruido (el que lleva justo a ese tic).
  const finTics = Math.min(n, Math.round(s * f));
  const enteros = Math.floor(s);
  const primero = enteros >= 1 ? Math.min(finTics, Math.round((s - enteros) * f)) : finTics;
  const fase = enteros % 2 === 0 ? 0 : f;
  copiar(soloRuido, (fase - primero + periodo) % periodo, 0, primero);
  copiar(conTics, fase, primero, finTics - primero);
  // Desde «s», el aviso (y el mismo ruido de fondo debajo).
  for (let i = finTics; i < n; i += 1) {
    muestras[i] = aMuestra(ruido[(i - finTics) % periodo] + (conAviso ? muestraAviso((i - finTics) / f) : 0));
  }
  if (!LITTLE_ENDIAN) {
    for (let i = 44; i < bytes.length; i += 2) [bytes[i], bytes[i + 1]] = [bytes[i + 1], bytes[i]];
  }
  return bytes;
}

// --- El <audio> y la Media Session ---

const estado = {
  el: null, // el <audio>, uno solo y fuera del DOM
  url: null, // la URL de Blob del WAV puesto (la anterior se revoca)
  activo: false, // hay un descanso con sonido puesto (sonando o en pausa), con su Media Session
  sonando: false, // se le ha dicho que suene y no se ha parado, ni ha fallado, ni lo ha cortado Android
  conAviso: false, // el WAV puesto lleva el aviso al final
  id: null, // el descanso del WAV puesto
  avisoSonadoDe: null, // el descanso cuyo WAV llegó al final (su aviso ya ha sonado)
  turno: 0, // sube con cada WAV, pausa o parada: el fallo de un play() viejo no cuenta
};

function sesionMedios() {
  return typeof navigator !== "undefined" ? navigator.mediaSession ?? null : null;
}

function elemento() {
  if (estado.el) return estado.el;
  const el = new Audio();
  el.preload = "auto";
  // Llega al final: el aviso ya ha sonado y se quita todo.
  el.addEventListener("ended", () => {
    if (estado.conAviso) estado.avisoSonadoDe = estado.id;
    pararFondo();
  });
  // Lo ha cortado Android (una llamada, otra app que pone música): el descanso sigue, sin sonido de fondo.
  el.addEventListener("pause", () => {
    if (!estado.sonando || !el.paused || el.ended) return;
    estado.sonando = false;
    ponerEstado("paused");
  });
  estado.el = el;
  return el;
}

function ponerMedios({ titulo, artista, acciones = {} }) {
  const medios = sesionMedios();
  if (!medios) return;
  try {
    if (typeof MediaMetadata === "function") {
      medios.metadata = new MediaMetadata({
        title: titulo, artist: artista, album: "Gym Beta", artwork: [{ src: "./icono-512.png", sizes: "512x512", type: "image/png" }],
      });
    }
  } catch {
    // Sin título ni carátula: el audio suena igual.
  }
  for (const accion of ACCIONES) {
    try {
      medios.setActionHandler(accion, acciones[accion] || null);
    } catch {
      // Un botón que este navegador no tiene.
    }
  }
}

// «playing» o «paused» y, si se sabe, la barra de progreso: «total» segundos, de los que han pasado «posicion».
function ponerEstado(como, { total, posicion } = {}) {
  const medios = sesionMedios();
  if (!medios) return;
  try {
    medios.playbackState = como;
  } catch {
    // Sin estado: lo saca del <audio>.
  }
  if (typeof medios.setPositionState === "function" && Number.isFinite(total) && total > 0) {
    try {
      medios.setPositionState({ duration: total, playbackRate: 1, position: Math.min(total, Math.max(0, Number(posicion) || 0)) });
    } catch {
      // Sin barra de progreso.
    }
  }
}

function quitarMedios() {
  const medios = sesionMedios();
  if (!medios) return;
  try {
    medios.metadata = null;
  } catch {
    // Nada que quitar.
  }
  for (const accion of ACCIONES) {
    try {
      medios.setActionHandler(accion, null);
    } catch {
      // Un botón que este navegador no tiene.
    }
  }
  try {
    medios.playbackState = "none";
    medios.setPositionState?.();
  } catch {
    // Nada que quitar.
  }
}

// Pone a sonar el WAV de lo que queda del descanso «id» (segundos, conAviso) con su Media Session (titulo, artista,
// total, posicion, acciones). Hay que llamarla dentro de un toque. Devuelve una promesa: false si el navegador no deja
// sonar (y entonces queda todo quitado); true si suena o si otra llamada la ha sustituido.
export function sonarFondo({ id, segundos, conAviso, titulo, artista, total, posicion, acciones }) {
  const el = elemento();
  estado.turno += 1;
  const turno = estado.turno;
  let url;
  try {
    url = URL.createObjectURL(new Blob([wavDescanso(segundos, { conAviso })], { type: "audio/wav" }));
  } catch {
    pararFondo();
    return Promise.resolve(false);
  }
  el.src = url;
  if (estado.url) URL.revokeObjectURL(estado.url);
  Object.assign(estado, { url, activo: true, sonando: true, conAviso: Boolean(conAviso), id, avisoSonadoDe: null });
  ponerMedios({ titulo, artista, acciones });
  ponerEstado("playing", { total, posicion });
  let promesa;
  try {
    promesa = Promise.resolve(el.play());
  } catch (err) {
    promesa = Promise.reject(err);
  }
  return promesa.then(() => true, (err) => {
    // Si ya hay otro WAV, una pausa o una parada (AbortError), este fallo no cuenta.
    if (turno !== estado.turno || err?.name === "AbortError") return true;
    pararFondo();
    return false;
  });
}

// En pausa: el audio se para, pero la Media Session se queda (con «play» se sigue desde la pantalla de bloqueo).
export function pausarFondo({ total, posicion } = {}) {
  if (!estado.activo) return;
  estado.turno += 1;
  estado.sonando = false;
  try {
    estado.el?.pause();
  } catch {
    // Ya estaba parado.
  }
  ponerEstado("paused", { total, posicion });
}

// Lo quita todo: el audio, su URL y la Media Session. Si no hay nada puesto, no toca nada.
export function pararFondo() {
  if (!estado.activo && !estado.url) return;
  estado.turno += 1;
  Object.assign(estado, { activo: false, sonando: false, conAviso: false });
  const el = estado.el;
  if (el) {
    try {
      el.pause();
    } catch {
      // Ya estaba parado.
    }
    el.removeAttribute("src");
    el.load();
  }
  if (estado.url) URL.revokeObjectURL(estado.url);
  estado.url = null;
  quitarMedios();
}

// ¿Lleva el audio el aviso del final del descanso «id» (va a sonar o acaba de sonar)? Entonces no se repite.
export function avisoEnElFondo(id) {
  return id != null && ((estado.sonando && estado.conAviso && estado.id === id) || estado.avisoSonadoDe === id);
}

// ¿Hay un descanso con sonido puesto (sonando o en pausa)?
export function fondoPuesto() {
  return estado.activo;
}
