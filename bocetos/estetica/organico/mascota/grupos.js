// Qué grupo de los suyos es el que escribes tú (D-136). El «Grupo muscular» de cada ejercicio es texto libre: la
// mascota no lo cambia, solo lo entiende como uno de sus 11 grupos (GRUPOS de gestos.js), o como ninguno («»).
// Sin mirar mayúsculas, tildes ni signos, con sinónimos y en otros idiomas (inglés, portugués, francés, italiano, alemán
// y catalán). Busca lo más concreto primero («bíceps femoral» es Isquios, antes que «bíceps») y, con dos grupos en el
// mismo texto («Pecho y tríceps»), el primero. Lo que no entiende sigue como antes: te mira, sin un músculo concreto.
// Una palabra nueva: en SINONIMOS, en su grupo (como se escribe; el plural con «s» o «es» ya vale).

const SINONIMOS = {
  'Pecho': ['pecho', 'pectoral', 'pectorales', 'pec', 'pecs', 'chest', 'peito', 'peitoral', 'peitorais', 'poitrine',
    'pectoraux', 'petto', 'pettorali', 'brust', 'brustmuskel', 'brustmuskulatur', 'pit', 'pectorals'],
  'Espalda': ['espalda', 'dorsal', 'dorsales', 'dorsal ancho', 'lat', 'lats', 'back', 'upper back', 'latissimus',
    'trapecio', 'trapecios', 'traps', 'trapezius', 'romboides', 'rhomboids', 'costas', 'dorsais', 'dorsaux',
    'grand dorsal', 'schiena', 'dorsali', 'rucken', 'oberer rucken', 'latissimus dorsi', 'esquena'],
  'Hombro': ['hombro', 'hombros', 'deltoides', 'deltoide', 'deltoides anterior', 'deltoides lateral', 'deltoides medio',
    'delt', 'delts', 'front delt', 'side delt', 'lateral delt', 'shoulder', 'shoulders', 'ombro', 'ombros', 'epaule',
    'epaules', 'deltoide anterior', 'spalla', 'spalle', 'schulter', 'schultern', 'espatlla', 'espatlles'],
  'Hombro posterior': ['hombro posterior', 'hombros posteriores', 'deltoides posterior', 'deltoide posterior',
    'deltoides trasero', 'rear delt', 'rear delts', 'rear deltoid', 'posterior deltoid', 'rear shoulder',
    'manguito rotador', 'rotador', 'rotadores', 'rotator cuff', 'ombro posterior', 'epaule arriere',
    'deltoide posterieur', 'deltoide posteriore', 'hintere schulter', 'espatlla posterior'],
  'Bíceps': ['biceps', 'bicep', 'bis', 'braquial', 'braquiales', 'brachialis', 'antebrazo', 'antebrazos', 'forearm',
    'forearms', 'brazo', 'brazos', 'arm', 'arms', 'bicipite', 'bicipiti', 'bizeps', 'braco', 'bracos', 'bras', 'braccio',
    'braccia', 'arme', 'brac'],
  'Tríceps': ['triceps', 'tricep', 'tris', 'tricipite', 'tricipiti', 'trizeps'],
  'Abdominales': ['abdominales', 'abdominal', 'abdomen', 'abs', 'ab', 'core', 'oblicuos', 'oblicuo', 'obliques',
    'recto abdominal', 'abdominais', 'abdominaux', 'abdos', 'addominali', 'addome', 'bauch', 'bauchmuskeln',
    'bauchmuskulatur', 'abdominals', 'abdominals obliqus'],
  'Cuádriceps': ['cuadriceps', 'cuadricep', 'quads', 'quad', 'quadriceps', 'quadricep', 'pierna', 'piernas', 'leg',
    'legs', 'muslo', 'muslos', 'thigh', 'thighs', 'tren inferior', 'lower body', 'quadricipite', 'quadricipiti', 'coxa',
    'coxas', 'perna', 'pernas', 'cuisse', 'cuisses', 'jambe', 'jambes', 'coscia', 'cosce', 'gamba', 'gambe',
    'quadrizeps', 'oberschenkel', 'beine', 'bein', 'cames', 'cuixa', 'cuixes', 'aductores', 'aductor', 'adductors',
    'adductor', 'adutores', 'adducteurs', 'adduttori', 'adduktoren'],
  'Isquios': ['isquios', 'isquio', 'isquiotibiales', 'isquiotibial', 'femoral', 'femorales', 'biceps femoral',
    'hamstrings', 'hamstring', 'hams', 'posterior de muslo', 'femorais', 'isquiotibiais', 'ischio jambiers',
    'ischios', 'ischiocrurali', 'femorali', 'beinbeuger', 'hintere oberschenkel', 'isquiotibials'],
  'Cadena posterior': ['cadena posterior', 'gluteos', 'gluteo', 'glutes', 'glute', 'gluteus', 'lumbares', 'lumbar',
    'espalda baja', 'zona lumbar', 'lower back', 'erectores', 'erector', 'posterior chain', 'cadera', 'caderas', 'hip',
    'hips', 'cadeia posterior', 'lombar', 'lombares', 'fessiers', 'fessier', 'lombaires', 'chaine posterieure',
    'glutei', 'lombari', 'catena posteriore', 'gesass', 'unterer rucken', 'gluti', 'lumbars', 'abductores', 'abductor',
    'abductors', 'abdutores', 'abducteurs', 'abduttori', 'abduktoren'],
  'Gemelos': ['gemelos', 'gemelo', 'pantorrilla', 'pantorrillas', 'soleo', 'calf', 'calves', 'gastrocnemio',
    'gastrocnemius', 'panturrilha', 'panturrilhas', 'mollet', 'mollets', 'polpaccio', 'polpacci', 'wade', 'waden',
    'bessons', 'panxell', 'panxells'],
};

// En minúsculas, sin tildes ni signos, con un espacio entre palabras.
export function normal(texto) {
  return String(texto ?? '').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// [frase normalizada, grupo, palabras], de la más concreta (más palabras, más larga) a la más general.
const FRASES = Object.entries(SINONIMOS)
  .flatMap(([grupo, lista]) => [...new Set([grupo, ...lista].map(normal))].filter(Boolean).map((f) => [f, grupo, f.split(' ').length]))
  .sort((a, b) => b[2] - a[2] || b[0].length - a[0].length);

const cache = new Map();

// El grupo de los suyos que es «texto» (uno de GRUPOS de gestos.js), o «» si no lo entiende.
export function grupoDe(texto) {
  const t = normal(texto);
  if (!t) return '';
  if (cache.has(t)) return cache.get(t);
  const con = ` ${t} `;
  let mejor = null;
  for (const [frase, grupo, palabras] of FRASES) {
    if (mejor && palabras < mejor.palabras) break; // ya hay una más concreta
    for (const forma of [frase, `${frase}s`, `${frase}es`]) {
      const donde = con.indexOf(` ${forma} `);
      if (donde >= 0 && (!mejor || palabras > mejor.palabras || donde < mejor.donde)) mejor = { grupo, palabras, donde };
    }
  }
  const r = mejor?.grupo || '';
  if (cache.size > 200) cache.clear();
  cache.set(t, r);
  return r;
}
