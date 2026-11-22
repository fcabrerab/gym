// El ritmo del día de la mascota (D-135, la 6): de noche, más dormilona; por la mañana, se despereza.
// Funciones puras, con la hora de tu móvil: cuánto es de noche y cuánto por la mañana (cuantaNoche(), cuantaManana()),
// qué cambia de ella (ritmoDe(), que mascota.js le da al cerebro) y cómo te recibe al verte (recibimiento(), que usa
// mascota.js al abrir la app o volver a ella). De día no cambia nada; y con una sesión en marcha tampoco: entrenando,
// está despierta contigo. No guarda nada.
import { tramo } from "./esqueleto.js";

const HORA = 3600000;
export const AUSENCIA = 6 * HORA;       // tras este rato sin verte, al volver te da la bienvenida (D-135, la 3)
const AMANECE = 5;                     // a esta hora empieza la mañana: si no te ha visto desde antes, aún dormía
const SIN_VERTE_MANANA = 3 * HORA;     // y para el «buenos días», al menos este rato sin verte

// Lo de siempre (de día, con una sesión en marcha o sin hora).
export const NEUTRO = Object.freeze({ noche: 0, manana: 0, sueno: 1, siesta: 1, pesos: Object.freeze({}) });

// La hora de tu móvil (de 0 a 24, con decimales) de un momento en ms.
export function horaDe(ms) {
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60;
}
const enElDia = (hora) => ((hora % 24) + 24) % 24;

// Cuánto es de noche, de 0 a 1: nada de 9 a 20; sube de 20 a 23; del todo de 23 a 5; baja de 5 a 9.
export function cuantaNoche(hora) {
  const h = enElDia(hora);
  if (h >= 20) return tramo(h, 20, 23);
  if (h < AMANECE) return 1;
  return 1 - tramo(h, AMANECE, 9);
}

// Cuánto es por la mañana, de 0 a 1: sube de 5 a 6:30, del todo hasta las 10 y baja hasta las 12.
export function cuantaManana(hora) {
  const h = enElDia(hora);
  if (h < AMANECE || h >= 12) return 0;
  return tramo(h, AMANECE, 6.5) * (1 - tramo(h, 10, 12));
}

// Qué cambia de ella con la hora: «sueno» multiplica lo que tarda en entrarle sueño (de noche, menos de la mitad);
// «siesta», lo que duerme (de noche, un 60 % más); y «pesos», sus papeletas de PESOS (cerebro.js): de noche salta y pasea
// menos, se sienta y se duerme más y a veces bosteza (de día, nunca: «bostezar» no tiene papeletas); por la mañana, se
// despereza más. Con una sesión en marcha, lo de siempre.
export function ritmoDe(hora, { conSesion = false } = {}) {
  if (conSesion || !Number.isFinite(hora)) return NEUTRO;
  const n = cuantaNoche(hora);
  const m = cuantaManana(hora);
  if (n === 0 && m === 0) return NEUTRO;
  return {
    noche: n,
    manana: m,
    sueno: 1 - 0.55 * n,
    siesta: 1 + 0.6 * n,
    pesos: { saltar: 1 - 0.65 * n, pasear: 1 - 0.4 * n, sentarse: 1 + 0.6 * n, dormir: 1 + 0.5 * n, bostezar: 1.6 * n, desperezarse: 1 + 2 * m },
  };
}

// Cómo te recibe al verte, o null si nada especial. antes: cuándo te vio por última vez (ms); ahora: ms; diasSin: si
// llevas días sin entrenar (forma.js: llevasDiasSin()). Devuelve { despacio, dormida }:
// - La primera vez por la mañana (no te ha visto desde antes de las 5 y lleva 3 h sin verte): estaba dormida y se
//   despierta despacio, bostezando, se despereza y te saluda («despacio»).
// - Tras 6 h sin verte (AUSENCIA): te saluda; de noche, estaba dormida y se despierta despacio.
// - En los dos casos, si llevas días sin entrenar, estaba dormida y además se alegra de verte («dormida», D-135, la 3;
//   sin «despacio», se despierta de golpe). Sin reproches.
export function recibimiento({ antes, ahora, diasSin = false } = {}) {
  if (!Number.isFinite(antes) || !Number.isFinite(ahora) || ahora < antes) return null;
  const hora = horaDe(ahora);
  const lejos = ahora - antes;
  const d = new Date(ahora);
  const amanecer = new Date(d.getFullYear(), d.getMonth(), d.getDate(), AMANECE).getTime();
  const dormida = Boolean(diasSin);
  if (cuantaManana(hora) >= 0.5 && antes < amanecer && lejos >= SIN_VERTE_MANANA) return { despacio: true, dormida };
  if (lejos >= AUSENCIA) return { despacio: cuantaNoche(hora) >= 0.5, dormida };
  return null;
}
