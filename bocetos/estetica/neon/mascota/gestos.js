// Gestos de la mascota: qué hace al acabar una serie de cada grupo, en un récord, al tocarla y a ratos sola.
// Solo datos. Cada gesto: cuadros clave [segundo, cambios de la pose] (en grados, ver esqueleto.js), que heredan
// del anterior lo que no cambian (el primero, de la pose de pie); la cara [segundo, cara, duración]; los músculos
// que siente [clave, desde, hasta]; y, si hace falta, temblores, efectos, adónde mira y un destello.
// «orientacion»: 0 nos mira, 35 de tres cuartos, 180 de espaldas, 360 de frente otra vez (una vuelta entera).

const brazos = (b, c) => ({ brazoI: b, codoI: c, brazoD: b, codoD: c });
const brazosAd = (b, c) => ({ brazoAdI: b, codoAdI: c, brazoAdD: b, codoAdD: c });
const piernas = (m, r) => ({ musloI: m, rodillaI: r, musloD: m, rodillaD: r });
const piernasAd = (m, r) => ({ musloAdI: m, rodillaAdI: r, musloAdD: m, rodillaAdD: r });
const REPOSO = { ...brazos(10, -6), ...brazosAd(0, 14) };
const DE_PIE = { ...piernas(4, 0), ...piernasAd(0, -4) };
const EN_JARRAS = { ...brazos(52, -100), ...brazosAd(0, 0) };
// Cómo lleva el trofeo (D-135): en la mano derecha, delante, con el codo doblado (cerebro.js lo pone al estar quieta,
// al pasear y sentada).
export const CON_TROFEO = { brazoD: 12, codoD: 0, brazoAdD: 18, codoAdD: 92 };

// Caras del boceto del globo: los ojos, dos puntitos; las cejas y la boca solo salen al expresar algo.
export const CARAS = {
  contenta: { ojos: 'punto', cejas: 'alegres', boca: 'sonrisa' },
  orgullo: { ojos: 'feliz', cejas: 'alegres', boca: 'sonrisaGrande' },
  esfuerzo: { ojos: 'entornados', cejas: 'fruncidas', boca: 'apretada' },
  sorpresa: { ojos: 'grandes', cejas: 'altas', boca: 'o' },
  agotada: { ojos: 'entornados', cejas: 'preocupadas', boca: 'ondulada' },
  risa: { ojos: 'feliz', cejas: 'altas', boca: 'abierta', rubor: true },
  guino: { ojos: 'guino', cejas: 'alegres', boca: 'sonrisa' },
  curiosa: { ojos: 'punto', cejas: 'una', boca: null },
  bostezo: { ojos: 'apretados', cejas: 'altas', boca: 'oGrande' },
  tierna: { ojos: 'feliz', cejas: null, boca: 'pequena', rubor: true },
  sacudida: { ojos: 'apretados', cejas: 'fruncidas', boca: 'apretada' },
  dormida: { ojos: 'cerrados', cejas: null, boca: null, fija: true },
};

// Cada músculo: cuánto abulta (unidades) con la forma de fondo (definido), con el bombeo y al contraerlo.
export const MUSCULOS = {
  pechoI: [1, 1.2, 2.6], pechoD: [1, 1.2, 2.6],
  dorsales: [0.8, 1.2, 3.2],
  hombrosI: [1, 0.9, 1.6], hombrosD: [1, 0.9, 1.6],
  hombrosPostI: [1, 0.9, 1.6], hombrosPostD: [1, 0.9, 1.6],
  bicepsI: [1.3, 1.5, 4.2], bicepsD: [1.3, 1.5, 4.2],
  tricepsI: [0.9, 1.1, 3.2], tricepsD: [0.9, 1.1, 3.2],
  abs1: [1, 1, 1], abs2: [1, 1, 1], abs3: [1, 1, 1],
  cuadricepsI: [1.3, 1.3, 3], cuadricepsD: [1.3, 1.3, 3],
  isquiosI: [0.5, 0.9, 2.6], isquiosD: [0.5, 0.9, 2.6],
  gluteos: [0.8, 1, 2.2], lumbares: [1, 1, 1],
  gemelosI: [1.1, 1.1, 2.6], gemelosD: [1.1, 1.1, 2.6],
};

// Cómo imita tu ejercicio con una mancuerna pequeña (D-135, la 4): en el descanso, unas repeticiones del de la serie que
// acabas de hacer (cerebro.js: imitar()). Por grupo de la app: cómo se llama, en qué mano la lleva («D» o «ambas»), la
// pose de partida («a», sobre la de pie) y lo que cambia al hacer fuerza («b»).
export const IMITAR = {
  'Bíceps': { nombre: 'Imita tu curl de bíceps', manos: 'ambas',
    a: { orientacion: 40, ...brazos(8, 0), ...brazosAd(4, 10) }, b: { codoAdI: 135, codoAdD: 135 } },
  'Tríceps': { nombre: 'Imita tu extensión de tríceps', manos: 'D',
    a: { orientacion: 40, brazoD: 165, codoD: 0, brazoAdD: 0, codoAdD: -120 }, b: { codoAdD: -5 } },
  'Hombro': { nombre: 'Imita tu press de hombros', manos: 'ambas',
    a: { ...brazos(88, 92), ...brazosAd(0, 0) }, b: { ...brazos(165, 12) } },
  'Hombro posterior': { nombre: 'Imita tus pájaros', manos: 'ambas',
    a: { orientacion: 40, inclinar: 50, ...piernasAd(10, -16), ...brazos(8, -6), ...brazosAd(50, 6) }, b: { ...brazos(78, -6) } },
  'Pecho': { nombre: 'Imita tus aperturas', manos: 'ambas',
    a: { orientacion: 25, ...brazos(80, 10), ...brazosAd(10, 10) }, b: { ...brazos(18, 10), ...brazosAd(85, 10) } },
  'Espalda': { nombre: 'Imita tu remo', manos: 'D',
    a: { orientacion: 60, inclinar: 45, ...piernasAd(14, -20), ...brazos(6, 0), ...brazosAd(45, 0) }, b: { brazoAdD: -25, codoAdD: 75 } },
  'Cuádriceps': { nombre: 'Imita tu sentadilla', manos: 'D',
    a: { orientacion: 35, ...brazos(8, 0), ...brazosAd(20, 120) }, b: { ...piernasAd(82, -112), inclinar: 26 } },
  'Isquios': { nombre: 'Imita tu peso muerto', manos: 'ambas',
    a: { orientacion: 60, ...brazos(6, 0), ...brazosAd(0, 0) }, b: { inclinar: 68, ...piernasAd(10, -16), ...brazosAd(68, 0) } },
  'Gemelos': { nombre: 'Imita tus elevaciones de talones', manos: 'ambas',
    a: { orientacion: 35, ...brazos(8, 0), ...brazosAd(0, 0) }, b: { puntillas: 1, estirar: 0.015 } },
  'Abdominales': { nombre: 'Imita tu inclinación lateral', manos: 'D',
    a: { ...brazos(8, 0), ...brazosAd(0, 0) }, b: { lumbar: 14, pecho: 8, brazoI: 40, codoI: -60 } },
};
IMITAR['Cadena posterior'] = IMITAR['Isquios'];

// Por dónde le duelen las agujetas (D-133, la fase 2): cada zona, con sus músculos y su gesto.
export const REGIONES = {
  brazos: { gesto: 'agujetasBrazos', musculos: ['bicepsI', 'bicepsD', 'tricepsI', 'tricepsD', 'hombrosI', 'hombrosD', 'hombrosPostI', 'hombrosPostD'] },
  tronco: { gesto: 'agujetasTronco', musculos: ['pechoI', 'pechoD', 'dorsales', 'abs1', 'abs2', 'abs3', 'lumbares'] },
  piernas: { gesto: 'agujetasPiernas', musculos: ['cuadricepsI', 'cuadricepsD', 'isquiosI', 'isquiosD', 'gluteos', 'gemelosI', 'gemelosD'] },
};

// Los grupos de la app («muscleGroup» de data/exercises.json): su gesto y lo que bombean.
export const GRUPOS = {
  'Pecho': { gesto: 'pecho', musculos: ['pechoI', 'pechoD'] },
  'Espalda': { gesto: 'espalda', musculos: ['dorsales'] },
  'Hombro': { gesto: 'hombro', musculos: ['hombrosI', 'hombrosD'] },
  'Hombro posterior': { gesto: 'hombroPost', musculos: ['hombrosPostI', 'hombrosPostD'] },
  'Bíceps': { gesto: 'biceps', musculos: ['bicepsI', 'bicepsD'] },
  'Tríceps': { gesto: 'triceps', musculos: ['tricepsI', 'tricepsD'] },
  'Abdominales': { gesto: 'abdominales', musculos: ['abs1', 'abs2', 'abs3'] },
  'Cuádriceps': { gesto: 'cuadriceps', musculos: ['cuadricepsI', 'cuadricepsD'] },
  'Isquios': { gesto: 'isquios', musculos: ['isquiosI', 'isquiosD'] },
  'Cadena posterior': { gesto: 'cadena', musculos: ['gluteos', 'lumbares', 'isquiosI', 'isquiosD'] },
  'Gemelos': { gesto: 'gemelos', musculos: ['gemelosI', 'gemelosD'] },
};

export const GESTOS = {
  // ——— Una serie de cada grupo ———
  biceps: {
    nombre: 'Siente el bíceps', dur: 3.3,
    cuadros: [
      [0.35, { ...brazos(45, -28), ...brazosAd(0, 0), ...piernasAd(8, -14), hombros: -0.5, orientacion: 12 }],
      [0.75, { ...brazos(98, 108), ...piernasAd(0, -4), hombros: 2.2, estirar: 0.02 }],
      [1.1, { ...brazos(94, 124), hombros: 2.8 }],
      [1.4, { ...brazos(98, 108), hombros: 2.2 }],
      [1.75, { ...brazos(94, 124), hombros: 2.8 }],
      [2.35, { ...brazos(98, 112), hombros: 2.2 }],
      [2.85, { ...REPOSO, hombros: 0, estirar: -0.02, orientacion: 0 }],
      [3.3, { estirar: 0 }],
    ],
    cara: [[0.2, 'esfuerzo', 0.6], [0.85, 'orgullo', 1.9]],
    musculos: [['bicepsI', 0.6, 2.55], ['bicepsD', 0.6, 2.55]],
  },
  triceps: {
    nombre: 'Siente el tríceps', dur: 3.3, espejable: true,
    cuadros: [
      [0.3, { orientacion: 35, ...brazos(6, 0), ...brazosAd(-4, 100), hombros: 0.8 }],
      [0.65, { ...brazosAd(-14, -2), hombros: -1 }],
      [1.0, { ...brazosAd(-4, 100), hombros: 0.8 }],
      [1.4, { ...brazosAd(-16, -2), hombros: -1.2, estirar: 0.015 }],
      [2.35, {}],
      [2.85, { ...REPOSO, hombros: 0, estirar: 0, orientacion: 0 }],
      [3.3, {}],
    ],
    cara: [[0.15, 'esfuerzo', 1.5], [1.7, 'contenta', 1.3]],
    musculos: [['tricepsI', 0.5, 2.6], ['tricepsD', 0.5, 2.6]],
  },
  pecho: {
    nombre: 'Siente el pecho', dur: 3.5,
    cuadros: [
      [0.4, { ...EN_JARRAS, hombros: -1, estirar: 0.02, inclinar: -5 }],
      [2.9, {}],
      [3.5, { ...REPOSO, hombros: 0, estirar: 0, inclinar: 0 }],
    ],
    cara: [[0.35, 'contenta', 1.8], [2.3, 'guino', 1.2]],
    musculos: [['pechoI', 0.75, 1.0], ['pechoD', 1.05, 1.3], ['pechoI', 1.35, 1.6], ['pechoD', 1.65, 1.9],
      ['pechoI', 2.0, 2.75], ['pechoD', 2.0, 2.75]],
  },
  espalda: {
    nombre: 'Siente la espalda', dur: 3.9,
    cuadros: [
      [0.55, { orientacion: 180, ...brazos(30, -40) }],
      [0.95, { ...brazos(58, -112), ...brazosAd(0, 0), hombros: 1, estirar: 0.01 }],
      [1.5, { ...brazos(65, -120), hombros: 1.6, estirar: 0.02 }],
      [2.1, { ...brazos(60, -114), hombros: 1.2 }],
      [2.6, { ...brazos(65, -120), hombros: 1.6 }],
      [3.15, { ...REPOSO, hombros: 0, estirar: 0 }],
      [3.9, { orientacion: 360 }],
    ],
    cara: [[3.55, 'guino', 1.1]],
    musculos: [['dorsales', 0.85, 2.95]],
  },
  hombro: {
    nombre: 'Siente los hombros', dur: 3.4,
    cuadros: [
      [0.35, { ...brazos(88, 92), ...brazosAd(0, 0) }],
      [0.75, { ...brazos(155, 22), estirar: 0.015 }],
      [1.1, { ...brazos(88, 92), estirar: 0 }],
      [1.5, { ...brazos(155, 22), estirar: 0.02 }],
      [2.0, {}],
      [2.4, { ...REPOSO, hombros: 3, estirar: 0 }],
      [2.7, { hombros: -0.5 }],
      [3.0, { hombros: 2.6 }],
      [3.4, { hombros: 0 }],
    ],
    cara: [[0.3, 'esfuerzo', 1.75], [2.35, 'contenta', 1.2]],
    musculos: [['hombrosI', 0.55, 2.3], ['hombrosD', 0.55, 2.3]],
  },
  hombroPost: {
    nombre: 'Siente la parte de atrás de los hombros', dur: 3.7,
    cuadros: [
      [0.5, { orientacion: 180, ...brazos(22, -22), ...brazosAd(0, 0) }],
      [0.95, { ...brazos(93, -6), hombros: 0.6 }],
      [1.35, { ...brazos(24, -22), hombros: 0 }],
      [1.8, { ...brazos(95, -6), hombros: 0.8 }],
      [2.5, {}],
      [3.0, { ...REPOSO, hombros: 0 }],
      [3.7, { orientacion: 360 }],
    ],
    cara: [[3.35, 'contenta', 1.1]],
    musculos: [['hombrosPostI', 0.85, 2.75], ['hombrosPostD', 0.85, 2.75]],
  },
  cuadriceps: {
    nombre: 'Siente los cuádriceps', dur: 3.8, espejable: true,
    cuadros: [
      [0.3, { orientacion: 35 }],
      [0.7, { ...piernasAd(80, -115), inclinar: 28, ...brazos(6, 0), ...brazosAd(78, 0) }],
      [1.15, { ...piernasAd(4, -6), inclinar: 2, ...brazosAd(30, 10) }],
      [1.6, { ...piernasAd(80, -115), inclinar: 28, ...brazosAd(78, 0) }],
      [2.1, { ...piernasAd(4, -8), inclinar: 2, ...REPOSO }],
      [3.0, {}],
      [3.8, { ...DE_PIE, inclinar: 0, orientacion: 0 }],
    ],
    vibrar: [[2.15, 2.95, { musloAdI: 2.5, musloAdD: 2.5, rodillaAdI: -4, rodillaAdD: -4 }, 13]],
    cara: [[0.45, 'esfuerzo', 1.65], [2.15, 'agotada', 0.95], [3.05, 'contenta', 1]],
    musculos: [['cuadricepsI', 0.6, 3.0], ['cuadricepsD', 0.6, 3.0]],
  },
  isquios: {
    nombre: 'Siente los isquios', dur: 3.8, espejable: true,
    cuadros: [
      [0.35, { orientacion: 40, ...brazos(74, -6), ...brazosAd(0, 0) }],
      [0.75, { musloAdI: -6, rodillaAdI: -125 }],
      [1.15, { musloAdI: 0, rodillaAdI: -10 }],
      [1.5, { musloAdI: 0, rodillaAdI: -4, musloAdD: -6, rodillaAdD: -125 }],
      [1.9, { musloAdD: 0, rodillaAdD: -10 }],
      [2.3, { rodillaAdD: -4 }],
      [2.9, { ...REPOSO, orientacion: 0 }],
      [3.8, {}],
    ],
    vibrar: [[0.4, 2.3, { lumbar: 3, giro: 1.5 }, 1.6]],
    cara: [[0.3, 'esfuerzo', 2.0], [2.55, 'contenta', 1.1]],
    musculos: [['isquiosI', 0.6, 1.3], ['isquiosD', 1.35, 2.05]],
  },
  cadena: {
    nombre: 'Siente la cadena posterior', dur: 4.2, espejable: true,
    cuadros: [
      [0.3, { orientacion: 45 }],
      [0.75, { inclinar: 72, ...piernasAd(10, -22), ...brazos(4, 0), ...brazosAd(70, 0), cabezaAd: -30, hombros: -1 }],
      [1.0, {}],
      [1.5, { inclinar: -8, ...piernasAd(0, -4), ...brazosAd(-8, 6), cabezaAd: 0, estirar: 0.025 }],
      [1.95, { orientacion: 180, inclinar: 0, estirar: 0, hombros: 0 }],
      [2.2, { giro: 3, lumbar: -5 }],
      [2.45, { giro: -3, lumbar: 5 }],
      [2.7, { giro: 3, lumbar: -5 }],
      [2.95, { giro: 0, lumbar: 0 }],
      [3.4, {}],
      [4.2, { orientacion: 360, ...REPOSO }],
    ],
    cara: [[0.55, 'esfuerzo', 1.0], [3.8, 'risa', 1.2]],
    musculos: [['lumbares', 0.6, 1.6], ['isquiosI', 0.6, 1.5], ['isquiosD', 0.6, 1.5], ['gluteos', 1.0, 3.4]],
  },
  gemelos: {
    nombre: 'Siente los gemelos', dur: 3.5, espejable: true,
    cuadros: [
      [0.3, { orientacion: 35, ...EN_JARRAS }],
      [0.6, { puntillas: 1, estirar: 0.01 }],
      [0.9, { puntillas: 0, estirar: 0 }],
      [1.2, { puntillas: 1, estirar: 0.01 }],
      [1.5, { puntillas: 0, estirar: 0 }],
      [1.8, { puntillas: 1, estirar: 0.015 }],
      [2.3, {}],
      [2.55, { puntillas: 0, estirar: -0.045, ...piernasAd(14, -26) }],
      [2.78, { alto: 9, estirar: 0.03, ...piernasAd(6, -16) }],
      [3.02, { alto: 0, estirar: -0.035, ...piernasAd(14, -26) }],
      [3.5, { estirar: 0, ...DE_PIE, ...REPOSO, orientacion: 0 }],
    ],
    cara: [[0.35, 'esfuerzo', 2.0], [2.5, 'contenta', 1.1]],
    musculos: [['gemelosI', 0.45, 2.45], ['gemelosD', 0.45, 2.45]],
  },
  abdominales: {
    nombre: 'Siente los abdominales', dur: 3.6,
    cuadros: [
      [0.4, { inclinar: 26, hombros: 1.2, ...brazos(26, -100), ...brazosAd(10, 10), ...piernasAd(8, -14) }],
      [1.6, {}],
      [2.1, { inclinar: -6, ...EN_JARRAS, hombros: -0.8, estirar: 0.02, ...DE_PIE }],
      [3.0, {}],
      [3.6, { inclinar: 0, ...REPOSO, hombros: 0, estirar: 0 }],
    ],
    mirar: [[0.35, 1.75, 0, 3]],
    cara: [[0.3, 'esfuerzo', 1.55], [2.1, 'orgullo', 1.4]],
    musculos: [['abs1', 0.55, 2.95], ['abs2', 0.8, 2.95], ['abs3', 1.05, 2.95]],
  },

  // ——— Un récord ———
  record: {
    nombre: '¡Celebra el récord!', dur: 4.3, espejable: true,
    cuadros: [
      [0.25, { ...piernasAd(42, -76), inclinar: 16, ...brazosAd(-30, 20), estirar: -0.04 }],
      [0.42, { ...piernasAd(0, -4), inclinar: -4, ...brazos(150, 12), ...brazosAd(0, 0), estirar: 0.07, alto: 12 }],
      [0.75, { ...piernasAd(62, -100), inclinar: 6, ...brazos(160, 10), estirar: 0, alto: 64 }],
      [1.08, { ...piernasAd(6, -10), ...brazos(150, 12), alto: 8, estirar: 0.03 }],
      [1.2, { ...piernasAd(40, -70), inclinar: 14, alto: 0, estirar: -0.06 }],
      [1.48, { ...piernasAd(0, -4), inclinar: 0, ...brazos(140, 12), estirar: 0.01 }],
      [1.62, { ...piernasAd(22, -36), estirar: -0.03 }],
      [1.85, { orientacion: 180, alto: 16, ...piernasAd(10, -30), ...brazos(150, 10), estirar: 0.02 }],
      [2.08, { orientacion: 360, alto: 0, ...piernasAd(22, -38), estirar: -0.04 }],
      [2.3, { ...DE_PIE, estirar: 0, ...REPOSO, brazoD: 100, codoD: 80, codoAdD: 0 }], // el puño, arriba
      [2.52, { brazoD: 90, codoD: 104 }],
      [2.76, { brazoD: 100, codoD: 80 }],
      [3.0, { brazoD: 90, codoD: 104 }],
      [3.6, { brazoD: 10, codoD: -6, codoAdD: 14 }],
      [4.3, {}],
    ],
    cara: [[0.3, 'risa', 1.8], [2.25, 'orgullo', 1.7]],
    musculos: [['*', 0.45, 1.45]],
    efectos: [[0.55, 'chispas'], [1.25, 'chispas'], [2.3, 'chispas']],
    destello: [0.35, 1.7],
  },

  // ——— Al terminar la sesión, según cómo fue (D-135; cerebro.js: finSesion()). Sin reproches: siempre contenta ———
  sesionCompleta: { // todas las series: dos saltitos con los brazos arriba y saca músculo
    nombre: '¡Sesión completa!', dur: 3.6,
    cuadros: [
      [0.22, { ...piernasAd(34, -60), inclinar: 12, ...brazosAd(-20, 16), estirar: -0.04 }],
      [0.4, { ...piernasAd(0, -4), inclinar: -4, ...brazos(150, 14), ...brazosAd(0, 0), estirar: 0.05, alto: 18 }],
      [0.6, { ...piernasAd(30, -54), inclinar: 8, alto: 0, estirar: -0.04 }],
      [0.78, { ...piernasAd(0, -4), inclinar: -4, ...brazos(156, 10), estirar: 0.05, alto: 16 }],
      [0.98, { ...piernasAd(26, -46), inclinar: 6, alto: 0, estirar: -0.03 }],
      [1.3, { ...DE_PIE, inclinar: 0, estirar: 0, ...brazos(98, 108), ...brazosAd(0, 0), hombros: 2.2 }],
      [1.6, { ...brazos(94, 124), hombros: 2.8 }],
      [1.9, { ...brazos(98, 108), hombros: 2.2 }],
      [2.2, { ...brazos(94, 124), hombros: 2.8 }],
      [2.9, { ...REPOSO, hombros: 0 }],
      [3.6, {}],
    ],
    cara: [[0.15, 'risa', 1.2], [1.35, 'orgullo', 1.6]],
    musculos: [['*', 1.3, 2.5]],
    efectos: [[0.42, 'chispas'], [0.8, 'chispas']],
    destello: [0.4, 1.2],
  },
  bienHecho: { // casi todas: el puño arriba dos veces y asiente
    nombre: '¡Bien hecho!', dur: 2.6, espejable: true,
    cuadros: [
      [0.3, { brazoD: 100, codoD: 80, codoAdD: 0, inclinar: -3 }],
      [0.5, { brazoD: 90, codoD: 104 }],
      [0.7, { brazoD: 100, codoD: 80 }],
      [0.9, { brazoD: 90, codoD: 104 }],
      [1.5, { brazoD: 10, codoD: -6, codoAdD: 14, inclinar: 0 }],
      [1.75, { cabezaAd: 12 }],
      [2.0, { cabezaAd: -2 }],
      [2.2, { cabezaAd: 10 }],
      [2.6, { cabezaAd: 0 }],
    ],
    cara: [[0.2, 'contenta', 2.2]],
  },
  algoEsAlgo: { // pocas: te mira, asiente y te saluda (algo es algo)
    nombre: 'Algo es algo', dur: 2.4, espejable: true,
    cuadros: [
      [0.3, { cabeza: 6 }],
      [0.55, { cabezaAd: 12 }],
      [0.8, { cabezaAd: -2 }],
      [1.05, { cabezaAd: 10 }],
      [1.3, { cabezaAd: 0, brazoD: 120, codoD: 40, codoAdD: 0 }],
      [1.9, {}],
      [2.4, { brazoD: 10, codoD: -6, codoAdD: 14, cabeza: 0 }],
    ],
    vibrar: [[1.35, 1.9, { codoD: 20 }, 2.6]],
    mirar: [[0.1, 2.2, 0, 0]],
    cara: [[0.2, 'tierna', 2.0]],
  },
  presumir: { // con una marca nueva hoy: levanta su trofeo y lo luce (y luego lo lleva el resto del día)
    nombre: 'Presume de trofeo', dur: 3.0,
    cuadros: [
      [0.5, { brazoD: 160, codoD: 18, codoAdD: 0, brazoAdD: 6, inclinar: -4, hombros: 0.6 }],
      [2.2, {}],
      [3.0, { ...CON_TROFEO, inclinar: 0, hombros: 0 }],
    ],
    vibrar: [[0.6, 2.1, { brazoD: 3 }, 1.6]],
    cara: [[0.4, 'orgullo', 1.8]],
    efectos: [[0.55, 'chispas']],
    destello: [0.5, 1.6],
    objeto: [[0, 3.0, 'trofeo', 'D']],
  },

  // ——— Al volver tras días sin entrenar (D-135): dormida, se despierta y se alegra de verte. Sin reproches ———
  alegria: {
    nombre: '¡Qué alegría verte!', dur: 2.4,
    cuadros: [
      [0.2, { ...piernasAd(30, -54), inclinar: 10, ...brazosAd(-20, 16), estirar: -0.03 }],
      [0.4, { ...piernasAd(0, -4), inclinar: -6, ...brazos(150, 20), ...brazosAd(0, 0), estirar: 0.05, alto: 16 }],
      [0.6, { ...piernasAd(28, -50), inclinar: 6, alto: 0, estirar: -0.03 }],
      [0.8, { ...piernasAd(0, -4), inclinar: -6, ...brazos(154, 16), estirar: 0.05, alto: 14 }],
      [1.0, { ...piernasAd(22, -40), inclinar: 4, alto: 0, estirar: -0.02 }],
      [1.6, { ...DE_PIE, inclinar: 0, estirar: 0, ...REPOSO }],
      [2.4, {}],
    ],
    mirar: [[0.1, 2.2, 0, 0]],
    cara: [[0.1, 'risa', 1.8]],
    efectos: [[0.4, 'chispas']],
  },

  // ——— Al tocarla ———
  susto: {
    nombre: '¡Qué susto!', dur: 1.1,
    cuadros: [
      [0.12, { alto: 10, estirar: 0.05, ...brazos(62, 28), ...brazosAd(0, 0), inclinar: -10, ...piernasAd(10, -20) }],
      [0.3, { alto: 0, estirar: -0.04, ...piernasAd(16, -28) }],
      [0.55, { estirar: 0, ...brazos(20, -14), inclinar: 0, ...DE_PIE }],
      [1.1, { ...REPOSO }],
    ],
    cara: [[0.03, 'sorpresa', 0.9]],
    efectos: [[0.04, 'exclamacion']],
  },
  saludo: {
    nombre: 'Te saluda', dur: 2.1, espejable: true,
    cuadros: [[0.35, { brazoD: 150, codoD: 30, codoAdD: 0 }], [1.7, {}], [2.1, { brazoD: 10, codoD: -6, codoAdD: 14 }]],
    vibrar: [[0.4, 1.7, { codoD: 24 }, 2.6]],
    cara: [[0.2, 'contenta', 1.7]],
  },
  cosquillas: { // tres toques o más seguidos (D-135, la 5): mientras sigas, sigue riéndose (cerebro.js: hacerCosquillas())
    nombre: 'Le haces cosquillas', dur: 1.9,
    cuadros: [[0.2, { ...brazos(24, -120), ...brazosAd(10, 10), hombros: 1.5, inclinar: 10 }], [1.5, {}],
      [1.9, { ...REPOSO, hombros: 0, inclinar: 0 }]],
    vibrar: [[0.15, 1.55, { giro: 5, lumbar: -4 }, 6.5]],
    cara: [[0.1, 'risa', 1.6]],
  },
  saltoAlegria: { // dos toques seguidos (D-135, la 5): se agacha, salta dando una vuelta en el aire y aterriza con los brazos arriba
    nombre: '¡Salta de alegría!', dur: 1.8,
    cuadros: [
      [0.2, { ...piernasAd(42, -76), inclinar: 14, ...brazosAd(-30, 20), estirar: -0.05 }],
      [0.4, { ...piernasAd(4, -10), inclinar: -4, ...brazos(150, 14), ...brazosAd(0, 0), estirar: 0.07, alto: 22, orientacion: 120 }],
      [0.6, { ...piernasAd(56, -96), inclinar: 6, estirar: 0, alto: 40, orientacion: 260 }],
      [0.8, { ...piernasAd(8, -14), alto: 14, orientacion: 360, ...brazos(130, 18) }],
      [0.94, { ...piernasAd(38, -68), inclinar: 12, alto: 0, estirar: -0.06, ...brazos(70, 14) }],
      [1.2, { ...DE_PIE, inclinar: -4, estirar: 0.02, ...brazos(156, 12) }],
      [1.45, { ...brazos(146, 22) }],
      [1.8, { ...REPOSO, inclinar: 0, estirar: 0 }],
    ],
    cara: [[0.1, 'risa', 1.6]],
    efectos: [[0.5, 'chispas'], [1.22, 'chispas']],
    destello: [0.4, 1.1],
  },
  sacudirse: { // al soltarla de tu dedo (D-135, la 5), ya en el suelo: se sacude entera, como un perrito, y se recoloca
    nombre: 'Se sacude', dur: 1.8, espejable: true,
    cuadros: [
      [0.16, { inclinar: 8, ...brazos(26, -6), ...brazosAd(16, 26), hombros: 1.2, ...piernasAd(14, -24) }],
      [1.0, {}],
      [1.3, { ...REPOSO, ...DE_PIE, inclinar: 0, hombros: 0 }],
      [1.55, { cabezaAd: 9 }],
      [1.8, { cabezaAd: 0 }],
    ],
    vibrar: [[0.16, 1.02, { giro: 5, lumbar: 8, pecho: 6, cabeza: 10, brazoI: 16, brazoD: -16 }, 7.5]],
    cara: [[0.1, 'sacudida', 0.95], [1.15, 'contenta', 0.65]],
  },
  despertar: {
    nombre: 'Se despierta de golpe', dur: 1.0,
    cuadros: [[0.18, { alto: 8, estirar: 0.05, ...brazos(50, 20), ...brazosAd(0, 0) }], [0.4, { alto: 0, estirar: -0.03 }],
      [1.0, { ...REPOSO, estirar: 0 }]],
    cara: [[0.05, 'sorpresa', 0.8]],
    efectos: [[0.06, 'exclamacion']],
  },

  // ——— A ratos, sola ———
  desperezarse: {
    nombre: 'Se despereza', dur: 2.8,
    cuadros: [
      [0.6, { ...brazos(160, 8), ...brazosAd(0, 0), estirar: 0.04, inclinar: -8, hombros: 1.5 }],
      [1.7, { ...brazos(166, 4), estirar: 0.05 }],
      [2.3, { ...REPOSO, estirar: -0.015, inclinar: 0, hombros: 0 }],
      [2.8, { estirar: 0 }],
    ],
    cara: [[0.4, 'bostezo', 1.5], [2.2, 'contenta', 0.8]],
  },
  rascarse: {
    nombre: 'Se rasca la cabeza', dur: 2.3, espejable: true,
    cuadros: [[0.45, { brazoD: 158, codoD: 82, codoAdD: 0, cabeza: -5 }], [1.8, {}],
      [2.3, { brazoD: 10, codoD: -6, codoAdD: 14, cabeza: 0 }]],
    vibrar: [[0.5, 1.8, { codoD: 7 }, 5.5]],
    cara: [[0.35, 'curiosa', 1.6]],
  },
  mirarte: {
    nombre: 'Te mira', dur: 2.4, espejable: true,
    cuadros: [[0.4, { cabeza: 9 }], [1.9, {}], [2.4, { cabeza: 0 }]],
    mirar: [[0.2, 2.2, 0, 0]],
    cara: [[0.9, 'tierna', 1.1]],
  },
  bostezar: { // de noche (D-135, la 6; dia.js) y al despertar por la mañana: echa la cabeza atrás, abre mucho la boca y se la tapa
    nombre: 'Bosteza', dur: 2.5, espejable: true,
    cuadros: [
      [0.5, { cabezaAd: -12, hombros: 1.4, inclinar: -5, estirar: 0.02 }],
      [0.95, { brazoD: 96, codoD: 136, brazoAdD: 50, codoAdD: 0 }],
      [1.55, { cabezaAd: -14, hombros: 1.8 }],
      [2.1, { ...REPOSO, cabezaAd: 3, hombros: 0, inclinar: 0, estirar: 0 }],
      [2.5, { cabezaAd: 0 }],
    ],
    cara: [[0.2, 'bostezo', 1.8]],
  },

  // ——— Con agujetas (D-133, la fase 2): suaves, se notan poco (los elige cerebro.js, por la zona que más le duele) ———
  agujetasPiernas: { // una mano en la cadera y con la otra se frota el muslo, algo encorvada
    nombre: 'Tiene agujetas en las piernas', dur: 3.0, espejable: true,
    cuadros: [
      [0.45, { orientacion: 35, inclinar: 26, ...piernasAd(10, -16), brazoI: 52, codoI: -100, brazoAdI: 0, codoAdI: 0,
        brazoD: 4, codoD: 0, brazoAdD: 40, codoAdD: 10, hombros: 0.4 }],
      [2.2, {}],
      [3.0, { ...REPOSO, ...DE_PIE, orientacion: 0, inclinar: 0, hombros: 0 }],
    ],
    vibrar: [[0.5, 2.15, { brazoAdD: 10, codoAdD: 6 }, 2.6]],
    cara: [[0.3, 'agotada', 1.1]],
  },
  agujetasBrazos: { // intenta levantar los brazos, le tiemblan y los deja caer: ¡uf!
    nombre: 'Tiene agujetas en los brazos', dur: 3.0,
    cuadros: [
      [0.55, { ...brazos(52, -14), ...brazosAd(0, 0), hombros: 1 }],
      [1.25, { ...brazos(60, -10) }],
      [1.5, { ...REPOSO, hombros: 0 }],
      [1.9, { hombros: 2.2, inclinar: 4 }],
      [2.3, { hombros: -0.5 }],
      [3.0, { hombros: 0, inclinar: 0 }],
    ],
    vibrar: [[0.5, 1.3, { brazoI: 3, brazoD: 3, codoI: 4, codoD: 4 }, 7]],
    cara: [[0.3, 'esfuerzo', 1.1], [1.45, 'agotada', 1.0]],
  },
  agujetasTronco: {
    nombre: 'Tiene agujetas en el tronco', dur: 3.0, espejable: true,
    cuadros: [
      [0.45, { ...EN_JARRAS, orientacion: 30, inclinar: -12, estirar: 0.015, hombros: -0.5 }],
      [1.3, { lumbar: 6, pecho: 4 }],
      [2.1, { lumbar: -4, pecho: -2 }],
      [3.0, { ...REPOSO, orientacion: 0, inclinar: 0, lumbar: 0, pecho: 0, estirar: 0, hombros: 0 }],
    ],
    cara: [[0.3, 'agotada', 1.1], [2.2, 'contenta', 0.6]],
  },

  // ——— En el descanso (D-135). «objeto»: [desde, hasta, qué lleva, en qué mano] ———
  jadear: {
    nombre: 'Recupera el aliento', dur: 3.2,
    cuadros: [
      [0.45, { orientacion: 40, inclinar: 32, ...brazos(14, 6), ...brazosAd(38, 8), ...piernasAd(22, -36), hombros: 0.6 }],
      [2.7, {}],
      [3.2, { ...REPOSO, orientacion: 0, inclinar: 0, ...piernasAd(0, -4), hombros: 0 }],
    ],
    vibrar: [[0.45, 2.7, { hombros: 1.8, inclinar: 3 }, 2.4]],
    cara: [[0.2, 'agotada', 2.7]],
  },
  secarse: {
    nombre: 'Se seca el sudor', dur: 2.8, espejable: true,
    cuadros: [[0.45, { brazoD: 150, codoD: 104, codoAdD: 0, brazoAdD: 24, cabeza: -6 }], [2.1, {}],
      [2.8, { brazoD: 10, codoD: -6, codoAdD: 14, brazoAdD: 0, cabeza: 0 }]],
    vibrar: [[0.5, 2.0, { brazoAdD: 16, cabeza: 2 }, 1.8]],
    cara: [[0.2, 'agotada', 1.4], [1.7, 'contenta', 1.0]],
    objeto: [[0.05, 2.75, 'toalla', 'D']],
  },
  beber: {
    nombre: 'Bebe agua', dur: 3.2, espejable: true,
    cuadros: [[0.6, { brazoD: 70, codoD: 124, brazoAdD: 44, codoAdD: 0, cabeza: -12, inclinar: -4 }], [2.3, {}],
      [3.2, { brazoD: 10, codoD: -6, brazoAdD: 0, codoAdD: 14, cabeza: 0, inclinar: 0 }]],
    vibrar: [[0.8, 2.2, { cabeza: 1.5 }, 3]],
    cara: [[2.4, 'contenta', 0.8]],
    objeto: [[0, 3.2, 'botella', 'D']],
  },
  chocar: {
    nombre: '¡Choca esos cinco!', dur: 1.9, espejable: true,
    cuadros: [[0.35, { brazoD: 128, codoD: 16, codoAdD: 0, brazoAdD: 36, orientacion: 10 }], [1.4, {}],
      [1.9, { brazoD: 10, codoD: -6, codoAdD: 14, brazoAdD: 0, orientacion: 0 }]],
    cara: [[0.25, 'risa', 1.4]],
    efectos: [[0.55, 'chispas']],
    destello: [0.5, 1.1],
  },
};
