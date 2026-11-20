// Gestos de la mascota: qué hace al acabar una serie de cada grupo, en un récord, al tocarla y a ratos sola.
// Solo datos. Cada gesto: cuadros clave [segundo, cambios de la pose] (en grados, ver esqueleto.js), que heredan
// del anterior lo que no cambian (el primero, de la pose de pie); la cara [segundo, cara, duración]; los músculos
// que siente [clave, desde, hasta]; y, si hace falta, temblores, efectos, adónde mira y un destello.

const brazos = (b, c) => ({ brazoI: b, codoI: c, brazoD: b, codoD: c });
const piernas = (m, r) => ({ musloI: m, rodillaI: r, musloD: m, rodillaD: r });
const REPOSO = brazos(14, -10);

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
      [0.35, { ...brazos(45, -28), ...piernas(11, -8), hombros: -0.5 }],
      [0.75, { ...brazos(98, 108), ...piernas(8, 0), hombros: 2.2, estirar: 0.02 }],
      [1.1, { ...brazos(94, 124), hombros: 2.8 }],
      [1.4, { ...brazos(98, 108), hombros: 2.2 }],
      [1.75, { ...brazos(94, 124), hombros: 2.8 }],
      [2.35, { ...brazos(98, 112), hombros: 2.2 }],
      [2.85, { ...REPOSO, hombros: 0, estirar: -0.02 }],
      [3.3, { estirar: 0 }],
    ],
    cara: [[0.2, 'esfuerzo', 0.6], [0.85, 'orgullo', 1.9]],
    musculos: [['bicepsI', 0.6, 2.55], ['bicepsD', 0.6, 2.55]],
  },
  triceps: {
    nombre: 'Siente el tríceps', dur: 3.2,
    cuadros: [
      [0.3, { ...brazos(24, -88), hombros: 0.8 }],
      [0.65, { ...brazos(17, -3), hombros: -1 }],
      [1.0, { ...brazos(24, -88), hombros: 0.8 }],
      [1.4, { ...brazos(17, -3), hombros: -1.2, estirar: 0.015 }],
      [2.3, { ...brazos(18, -3) }],
      [2.8, { ...REPOSO, hombros: 0, estirar: 0 }],
      [3.2, {}],
    ],
    cara: [[0.15, 'esfuerzo', 1.5], [1.7, 'contenta', 1.3]],
    musculos: [['tricepsI', 0.5, 2.6], ['tricepsD', 0.5, 2.6]],
  },
  pecho: {
    nombre: 'Siente el pecho', dur: 3.5,
    cuadros: [
      [0.4, { ...brazos(52, -100), hombros: -1, estirar: 0.02 }],
      [2.9, {}],
      [3.5, { ...REPOSO, hombros: 0, estirar: 0 }],
    ],
    cara: [[0.35, 'contenta', 1.8], [2.3, 'guino', 1.2]],
    musculos: [['pechoI', 0.75, 1.0], ['pechoD', 1.05, 1.3], ['pechoI', 1.35, 1.6], ['pechoD', 1.65, 1.9],
      ['pechoI', 2.0, 2.75], ['pechoD', 2.0, 2.75]],
  },
  espalda: {
    nombre: 'Siente la espalda', dur: 3.9,
    cuadros: [
      [0.55, { espaldas: 1, ...brazos(30, -40) }],
      [0.95, { ...brazos(58, -112), hombros: 1, estirar: 0.01 }],
      [1.5, { ...brazos(65, -120), hombros: 1.6, estirar: 0.02 }],
      [2.1, { ...brazos(60, -114), hombros: 1.2 }],
      [2.6, { ...brazos(65, -120), hombros: 1.6 }],
      [3.15, { ...REPOSO, hombros: 0, estirar: 0 }],
      [3.9, { espaldas: 2 }],
    ],
    cara: [[3.55, 'guino', 1.1]],
    musculos: [['dorsales', 0.85, 2.95]],
  },
  hombro: {
    nombre: 'Siente los hombros', dur: 3.4,
    cuadros: [
      [0.35, { ...brazos(88, 92) }],
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
      [0.5, { espaldas: 1, ...brazos(22, -22) }],
      [0.95, { ...brazos(93, -6), hombros: 0.6 }],
      [1.35, { ...brazos(24, -22), hombros: 0 }],
      [1.8, { ...brazos(95, -6), hombros: 0.8 }],
      [2.5, {}],
      [3.0, { ...REPOSO, hombros: 0 }],
      [3.7, { espaldas: 2 }],
    ],
    cara: [[3.35, 'contenta', 1.1]],
    musculos: [['hombrosPostI', 0.85, 2.75], ['hombrosPostD', 0.85, 2.75]],
  },
  cuadriceps: {
    nombre: 'Siente los cuádriceps', dur: 3.7,
    cuadros: [
      [0.45, { ...piernas(52, -98), ...brazos(80, -8) }],
      [0.9, { ...piernas(8, -2), ...brazos(30, -10) }],
      [1.35, { ...piernas(52, -98), ...brazos(80, -8) }],
      [1.85, { ...piernas(8, -2), ...REPOSO }],
      [2.9, { ...piernas(9, -3) }],
      [3.7, { ...piernas(7, 0) }],
    ],
    vibrar: [[1.95, 2.85, { musloI: 1.5, musloD: 1.5, rodillaI: 2.2, rodillaD: 2.2 }, 13]],
    cara: [[0.3, 'esfuerzo', 1.55], [1.95, 'agotada', 0.95], [2.95, 'contenta', 1]],
    musculos: [['cuadricepsI', 0.4, 2.85], ['cuadricepsD', 0.4, 2.85]],
  },
  isquios: {
    nombre: 'Siente los isquios', dur: 3.6, espejable: true,
    cuadros: [
      [0.3, { ...brazos(76, -6), musloD: 13, rodillaD: 40 }],
      [0.7, { musloD: 16, rodillaD: 150, escPiernaD: 0.62, lumbar: -4 }],
      [1.1, { musloD: 9, rodillaD: 10, escPiernaD: 1, lumbar: 0 }],
      [1.45, { musloD: 7, rodillaD: 0, musloI: 13, rodillaI: 40 }],
      [1.85, { musloI: 16, rodillaI: 150, escPiernaI: 0.62, lumbar: 4 }],
      [2.25, { musloI: 9, rodillaI: 10, escPiernaI: 1, lumbar: 0 }],
      [2.7, { ...REPOSO, musloI: 7, rodillaI: 0 }],
      [3.6, {}],
    ],
    vibrar: [[0.4, 2.3, { giro: 2.2 }, 1.6]],
    cara: [[0.25, 'esfuerzo', 2.0], [2.5, 'contenta', 1.1]],
    musculos: [['isquiosD', 0.55, 1.25], ['isquiosI', 1.7, 2.4]],
  },
  cadena: {
    nombre: 'Siente la cadena posterior', dur: 3.9,
    cuadros: [
      [0.5, { escTronco: 0.6, ...piernas(16, -24), ...brazos(4, 0), hombros: -1 }],
      [0.75, {}],
      [1.25, { escTronco: 1.04, ...piernas(7, 0), ...brazos(12, -6), estirar: 0.025 }],
      [1.65, { espaldas: 1, escTronco: 1, estirar: 0, hombros: 0 }],
      [1.9, { giro: 3, lumbar: -5 }],
      [2.15, { giro: -3, lumbar: 5 }],
      [2.4, { giro: 3, lumbar: -5 }],
      [2.65, { giro: 0, lumbar: 0 }],
      [3.15, {}],
      [3.9, { espaldas: 2, ...REPOSO }],
    ],
    cara: [[0.35, 'esfuerzo', 1.0], [3.55, 'risa', 1.2]],
    musculos: [['lumbares', 0.6, 1.55], ['isquiosI', 0.6, 1.45], ['isquiosD', 0.6, 1.45], ['gluteos', 0.9, 3.15]],
  },
  gemelos: {
    nombre: 'Siente los gemelos', dur: 3.3,
    cuadros: [
      [0.3, { escPiernaI: 1.2, escPiernaD: 1.2, estirar: 0.012 }],
      [0.6, { escPiernaI: 1, escPiernaD: 1, estirar: 0 }],
      [0.9, { escPiernaI: 1.2, escPiernaD: 1.2, estirar: 0.012 }],
      [1.2, { escPiernaI: 1, escPiernaD: 1, estirar: 0 }],
      [1.5, { escPiernaI: 1.22, escPiernaD: 1.22, estirar: 0.016 }],
      [2.1, {}],
      [2.4, { escPiernaI: 1, escPiernaD: 1, estirar: -0.045, ...piernas(12, -14) }],
      [2.62, { alto: 8, estirar: 0.03, ...piernas(9, -10) }],
      [2.86, { alto: 0, estirar: -0.035, ...piernas(12, -14) }],
      [3.3, { estirar: 0, ...piernas(7, 0) }],
    ],
    cara: [[0.2, 'esfuerzo', 1.95], [2.35, 'contenta', 1.1]],
    musculos: [['gemelosI', 0.2, 2.35], ['gemelosD', 0.2, 2.35]],
  },
  abdominales: {
    nombre: 'Siente los abdominales', dur: 3.6,
    cuadros: [
      [0.4, { escTronco: 0.82, hombros: 1.2, ...brazos(28, -95), ...piernas(10, -6) }],
      [1.6, {}],
      [2.1, { escTronco: 1.02, ...brazos(52, -100), hombros: -0.8, estirar: 0.02, ...piernas(7, 0) }],
      [3.0, {}],
      [3.6, { escTronco: 1, ...REPOSO, hombros: 0, estirar: 0 }],
    ],
    mirar: [[0.35, 1.75, 0, 3]],
    cara: [[0.3, 'esfuerzo', 1.55], [2.1, 'orgullo', 1.4]],
    musculos: [['abs1', 0.55, 2.95], ['abs2', 0.8, 2.95], ['abs3', 1.05, 2.95]],
  },

  // ——— Un récord ———
  record: {
    nombre: '¡Celebra el récord!', dur: 4.3, espejable: true,
    cuadros: [
      [0.25, { ...piernas(28, -52), ...brazos(30, -20), estirar: -0.05 }],
      [0.42, { ...piernas(8, 0), ...brazos(150, 12), estirar: 0.07, alto: 12 }],
      [0.75, { ...piernas(30, -75), ...brazos(160, 10), estirar: 0, alto: 64 }],
      [1.08, { ...piernas(10, -4), ...brazos(150, 12), alto: 8, estirar: 0.03 }],
      [1.2, { ...piernas(26, -46), alto: 0, estirar: -0.07 }],
      [1.48, { ...piernas(8, 0), ...brazos(140, 12), estirar: 0.01 }],
      [1.62, { ...piernas(14, -16), estirar: -0.03 }],
      [1.85, { espaldas: 1, alto: 16, ...piernas(9, -4), ...brazos(150, 10), estirar: 0.02 }],
      [2.08, { espaldas: 2, alto: 0, ...piernas(14, -18), estirar: -0.04 }],
      [2.3, { ...piernas(7, 0), estirar: 0, ...REPOSO, brazoD: 100, codoD: 80 }],   // el puño, arriba
      [2.52, { brazoD: 90, codoD: 104 }],
      [2.76, { brazoD: 100, codoD: 80 }],
      [3.0, { brazoD: 90, codoD: 104 }],
      [3.6, { brazoD: 14, codoD: -10 }],
      [4.3, {}],
    ],
    cara: [[0.3, 'risa', 1.8], [2.25, 'orgullo', 1.7]],
    musculos: [['*', 0.45, 1.45]],
    efectos: [[0.55, 'chispas'], [1.25, 'chispas'], [2.3, 'chispas']],
    destello: [0.35, 1.7],
  },

  // ——— Al tocarla ———
  susto: {
    nombre: '¡Qué susto!', dur: 1.1,
    cuadros: [
      [0.12, { alto: 10, estirar: 0.05, ...brazos(62, 28), ...piernas(12, -10) }],
      [0.3, { alto: 0, estirar: -0.04, ...piernas(12, -14) }],
      [0.55, { estirar: 0, ...brazos(20, -14), ...piernas(7, 0) }],
      [1.1, { ...REPOSO }],
    ],
    cara: [[0.03, 'sorpresa', 0.9]],
    efectos: [[0.04, 'exclamacion']],
  },
  saludo: {
    nombre: 'Te saluda', dur: 2.1, espejable: true,
    cuadros: [[0.35, { brazoD: 150, codoD: 30 }], [1.7, {}], [2.1, { brazoD: 14, codoD: -10 }]],
    vibrar: [[0.4, 1.7, { codoD: 24 }, 2.6]],
    cara: [[0.2, 'contenta', 1.7]],
  },
  cosquillas: {
    nombre: 'Le haces cosquillas', dur: 1.9,
    cuadros: [[0.2, { ...brazos(24, -120), hombros: 1.5, escTronco: 0.94 }], [1.5, {}],
      [1.9, { ...REPOSO, hombros: 0, escTronco: 1 }]],
    vibrar: [[0.15, 1.55, { giro: 5, lumbar: -4 }, 6.5]],
    cara: [[0.1, 'risa', 1.6]],
  },
  despertar: {
    nombre: 'Se despierta de golpe', dur: 1.0,
    cuadros: [[0.18, { alto: 8, estirar: 0.05, ...brazos(50, 20) }], [0.4, { alto: 0, estirar: -0.03 }],
      [1.0, { ...REPOSO, estirar: 0 }]],
    cara: [[0.05, 'sorpresa', 0.8]],
    efectos: [[0.06, 'exclamacion']],
  },

  // ——— A ratos, sola ———
  desperezarse: {
    nombre: 'Se despereza', dur: 2.8,
    cuadros: [
      [0.6, { ...brazos(160, 8), estirar: 0.04, escTronco: 1.03, hombros: 1.5 }],
      [1.7, { ...brazos(166, 4), estirar: 0.05 }],
      [2.3, { ...REPOSO, estirar: -0.015, escTronco: 1, hombros: 0 }],
      [2.8, { estirar: 0 }],
    ],
    cara: [[0.4, 'bostezo', 1.5], [2.2, 'contenta', 0.8]],
  },
  rascarse: {
    nombre: 'Se rasca la cabeza', dur: 2.3, espejable: true,
    cuadros: [[0.45, { brazoD: 158, codoD: 82, cabeza: -5 }], [1.8, {}], [2.3, { brazoD: 14, codoD: -10, cabeza: 0 }]],
    vibrar: [[0.5, 1.8, { codoD: 7 }, 5.5]],
    cara: [[0.35, 'curiosa', 1.6]],
  },
  mirarte: {
    nombre: 'Te mira', dur: 2.4, espejable: true,
    cuadros: [[0.4, { cabeza: 9 }], [1.9, {}], [2.4, { cabeza: 0 }]],
    mirar: [[0.2, 2.2, 0, 0]],
    cara: [[0.9, 'tierna', 1.1]],
  },
};
