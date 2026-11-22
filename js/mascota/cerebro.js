// Cerebro de la mascota: qué hace en cada momento y cómo pasa de una cosa a otra.
// Vive sola sobre las superficies que le dan (el borde de arriba de cada tarjeta) y reacciona a lo que pasa:
// una serie acabada, un récord, un toque. No dibuja: cada paso devuelve un «fotograma» que pinta el traje.
// Nunca toca la app: solo mira las superficies.

// En la app (D-133), lo del prototipo (bocetos/mascota/v3/) y, además: su carácter (cuántas papeletas tiene cada cosa
// en el sorteo de qué hacer: «pesos», de caracter.js), el modo tranquilo (en el entreno: sin pasear ni saltar), saltos
// entre tramos libres de las tarjetas (no solo de borde a borde), un techo para la cabeza y qué hacer si su superficie
// se va de la pantalla. Y su cuerpo, de tus entrenos (la fase 2: forma.js, que se lo da con ponerCuerpo()): la forma
// de fondo, el bombeo (el de cada músculo y el general, que la marca más) y las agujetas, que se notan poco (alguna vez
// le duele y se queja; con las piernas cargadas, anda más despacio y salta menos). Y los toques (D-135, la 5): uno suelto
// espera un momento por si llega otro; dos seguidos, salta de alegría; tres o más, cosquillas; y si la mantienes pulsada,
// la coges: va de pie en tu dedo, haciendo equilibrios, y al soltarla cae donde toque y se sacude. Y el ritmo del día
// (D-135, la 6; dia.js, que se lo da mascota.js en «ritmo»): de noche, más dormilona; por la mañana, se despereza. Qué
// hace cada pieza y cómo añadir algo, en LEEME.md.
import { POSE_BASE, MEDIDAS, mezclar, normalizar, cinematica, lerp, limitar, suave, tramo, SEXOS, cuerpoDeSexo } from './esqueleto.js';
export { SEXOS, CUERPOS } from './esqueleto.js'; // su sexo, a elegir (D-139)
import { GESTOS, GRUPOS, CARAS, MUSCULOS, REGIONES, CON_TROFEO, IMITAR } from './gestos.js';
import { formaVisible, BOMBEO_SERIE, GENERAL_SERIE } from './forma.js';

const MARGEN = 14;        // px que deja hasta el borde de una tarjeta
const VELOCIDAD = 34;     // px por segundo al pasear
const TRANSICION = 0.28;  // s para pasar de una acción a otra
const SUENO_TRAS = 50;    // s sin que le pase nada hasta tener sueño del todo (por defecto: la app le da el suyo)
const BOMBEO_DURA = 150;  // s que tarda en irse el bombeo (por defecto: en la app, unas horas)

// Las papeletas de cada cosa en el sorteo de qué hacer (elegir()); su carácter las multiplica (caracter.js).
// En la app salta más y se queda quieta menos que en el prototipo (D-134: que se mueva entre las tarjetas).
// «agujetas»: las suyas con las agujetas en su punto (con menos, menos; sin, ninguna). «presumir»: solo con trofeo.
// «bostezar»: solo de noche (el ritmo del día, dia.js, le da sus papeletas; de día, ninguna).
export const PESOS = {
  quieto: 2.2, pasear: 3.2, saltar: 2.6, sentarse: 0.8, asomarse: 0.9, desperezarse: 0.4, rascarse: 0.45, mirarte: 0.7, dormir: 2.5,
  agujetas: 1.1, presumir: 0.9, bostezar: 0.7,
};
// En el modo tranquilo (en el entreno), solo estas: ni pasea ni salta.
export const TRANQUILAS = new Set(['quieto', 'sentarse', 'asomarse', 'desperezarse', 'rascarse', 'mirarte', 'dormir', 'agujetas', 'presumir', 'bostezar']);
// El ritmo del día de siempre (dia.js: ritmoDe()): de día, nada cambia.
const SIN_RITMO = { sueno: 1, siesta: 1, pesos: {} };
const CALENTAR_CADA = 600; // s: antes de empezar a entrenar, calienta como mucho una vez cada 10 min
const PASO = 22;          // grados que abre cada pierna al andar
const DOBLE = 0.35;       // s como mucho entre dos toques para que cuenten seguidos (dos, salta; tres o más, cosquillas)
const GRAVEDAD = 2600;    // px por segundo al cuadrado, al caer de tu dedo

// La cara se enciende como un tubo de neón (parpadea y se queda) y se apaga igual.
const ENCENDER = [[0, 0], [0.04, 0.85], [0.08, 0.2], [0.13, 0.95], [0.18, 0.5], [0.24, 1]];
const APAGAR = [[0, 1], [0.1, 0.45], [0.15, 0.8], [0.3, 0]];
function tabla(puntos, x) {
  for (let i = 1; i < puntos.length; i++) {
    const [x1, y1] = puntos[i];
    if (x <= x1) {
      const [x0, y0] = puntos[i - 1];
      return lerp(y0, y1, (x - x0) / (x1 - x0));
    }
  }
  return puntos[puntos.length - 1][1];
}
function encendido(e, dur) {
  const fin = dur - 0.3;
  if (e < 0.24) return tabla(ENCENDER, e);
  return e < fin ? 1 : tabla(APAGAR, e - fin);
}
function distSeg(q, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = limitar(((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  return Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t);
}

/**
 * superficies(): [{ id, x1, x2, y, c1?, c2? }] en píxeles del escenario: el tramo libre (de x1 a x2) del borde de
 *   arriba de una tarjeta (y) y los lados de esa tarjeta (c1 y c2; si faltan, los del tramo).
 * alCambiar(texto): lo que hace ahora, para enseñarlo.
 * alReubicar(): su superficie ya no está (se fue de la pantalla o cambió) y aparece en otra.
 * techo(): hasta dónde puede subir la cabeza al saltar, en px del escenario.
 */
export function crearMascota({ superficies, escala = 0.55, azar = Math.random, alCambiar = () => {}, autonoma = true,
  suenoTras = SUENO_TRAS, bombeoDura = BOMBEO_DURA, techo = () => 0, alReubicar = () => {}, reloj = () => null } = {}) {
  const entre = (a, b) => a + (b - a) * azar();
  const unoDe = (lista) => lista[Math.floor(azar() * lista.length)];

  const m = {
    t: 0, x: 0, sup: null, ultY: null, perdida: false, desde: null, llegada: 0, fondo: 0.25, general: 0, escala,
    descanso: null, rest: null, carga: 1, flash: -9, destinoSalto: null,
    pesos: {}, ritmo: SIN_RITMO, tranquila: false, suenoTras, bombeoDura, trofeo: false, calentado: -1e9, saludar: null, cinta: false,
    sueno: 0, accion: null, cola: [], previa: null, avisado: '',
    musc: Object.fromEntries(Object.keys(MUSCULOS).map((k) => [k, { bombeo: 0, contr: 0, agujetas: 0 }])),
    cara: null,
    mirada: { x: 0, y: 0, ox: 0, oy: 0, hasta: 0 },
    ladeo: 0,
    parpadeo: { proximo: 1.2, t0: -9, doble: 0 },
    efectos: [],
    trans: null,
    ultimo: null,
    destello: 0,
    rafaga: null,    // los toques seguidos: { n, ultimo }
    pendiente: null, // lo que hará con ellos si no llega otro: { n, cuando }
    cogida: null,    // si la llevas en el dedo: { x, y }, donde van sus pies
    sexo: 'neutro',  // D-140: «ella», «el» o «neutro» (sin definir, el de serie)
    coleta: true,    // D-141: «Ella» lleva siempre su coleta (se puede quitar para probar)
  };

  // ——— Dónde está ———
  const lista = () => superficies() || [];
  function sup() {
    const l = lista();
    let s = l.find((x) => x.id === m.sup);
    if (!s && l.length) {
      // La suya ya no está (se fue de la pantalla o cambió): la más cercana a donde estaba (la primera vez, la de más
      // arriba). Cómo llega (de un salto desde donde estaba o fundiéndose), lo decide paso().
      const y = m.ultY;
      // ¿La misma, rehecha? (la app volvió a pintar esa tarjeta: otro elemento, el mismo sitio). Entonces sigue ahí, sin
      // saltos ni fundidos.
      const misma = y != null && l.find((a) => Math.abs(a.y - y) < 8 && m.x >= a.x1 - 6 && m.x <= a.x2 + 6);
      if (misma) {
        m.sup = misma.id;
        m.ultY = misma.y;
        return misma;
      }
      const lejania = (a) => Math.abs(a.y - y) + 0.3 * Math.abs(limitar(m.x, a.x1, a.x2) - m.x);
      s = y == null ? [...l].sort((a, b) => a.y - b.y)[0] : l.reduce((a, b) => (lejania(b) < lejania(a) ? b : a));
      if (m.sup != null && y != null) {
        m.desde = { x: m.x, y };
        m.perdida = true;
      }
      m.sup = s.id;
      m.llegada = m.t;
      m.x = s.x2 - s.x1 < 2 * MARGEN ? (s.x1 + s.x2) / 2 : limitar(m.x || (s.x1 + s.x2) / 2, s.x1 + MARGEN, s.x2 - MARGEN);
    }
    if (s) m.ultY = s.y;
    return s;
  }
  // La superficie que hay debajo de un punto (para la sombra)
  function debajo(x, y) {
    let mejor = null;
    for (const s of lista()) if (x >= s.x1 && x <= s.x2 && s.y >= y && (!mejor || s.y < mejor.y)) mejor = s;
    return mejor;
  }

  // ——— Mirar, caras, efectos, músculos ———
  function mirarCara(ox, oy, dur) {
    m.mirada.ox = ox;
    m.mirada.oy = oy;
    m.mirada.hasta = m.t + dur;
  }
  function mirarAlAzar() {
    const [ox, oy] = unoDe([[0, 0], [0, 0], [-4, 0.5], [4, 0.5], [-3.5, 2.6], [3.5, 2.6], [0, 3], [-3, -2.2], [3, -2.2]]);
    mirarCara(ox, oy, entre(0.8, 2.6));
  }
  function mirarPunto(px, py, dur = 1.8) {
    const f = m.ultimo;
    if (!f) return;
    const cx = f.raiz[0] + f.cin.p.cabeza[0] * m.escala, cy = f.raiz[1] + f.cin.p.cabeza[1] * m.escala;
    const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 50);
    mirarCara((4.3 * k * dx) / d, (3.2 * k * dy) / d, dur);
  }
  const ponerCara = (nombre, dur) => { m.cara = { nombre, t0: m.t, dur }; };
  const efecto = (tipo) => m.efectos.push({ tipo, t0: m.t, dur: { z: 2.4, chispas: 1.1 }[tipo] || 1, giro: entre(0, 60) });
  // Cada serie: sus músculos, bombeados; y ella, un poco más marcada (el bombeo general). Al momento: luego forma.js lo
  // pone exacto, de tus sesiones.
  function bombear(claves) {
    for (const k of claves) m.musc[k].bombeo = Math.min(1, m.musc[k].bombeo + BOMBEO_SERIE);
    m.general = Math.min(1, m.general + GENERAL_SERIE);
  }
  // Si hoy tiene trofeo (D-135: has batido una marca entrenando), lo lleva en la mano derecha («como»: la pose de ese
  // brazo; de serie, CON_TROFEO, delante). Lo usan quieto(), caminar() y sentarse().
  const llevar = (pose, como = CON_TROFEO) => (m.trofeo ? { ...pose, ...como } : pose);
  const elTrofeo = () => (m.trofeo ? { tipo: 'trofeo', mano: 'D' } : null);
  // Cuánto le duele una zona (REGIONES: brazos, tronco o piernas), de 0 a 1.
  const dolor = (zona) => Math.max(0, ...REGIONES[zona].musculos.map((k) => m.musc[k].agujetas));
  // La zona que más le duele, o null si ninguna (o casi).
  function masDolorida() {
    let r = null;
    for (const z in REGIONES) if (dolor(z) > 0.12 && (!r || dolor(z) > dolor(r))) r = z;
    return r;
  }

  // El cuerpo según su forma (gordito → definido: la de fondo, más marcada con el bombeo general) y cómo está cada músculo.
  function cuerpoDe(resp = 0) {
    const forma = formaVisible(m.fondo, m.general);
    const def = tramo(forma, 0.5, 1);      // definido: de la mitad para arriba
    const gordo = tramo(forma, 0.45, 0.05); // gordito: de la mitad para abajo
    const bultos = {}, ver = {}, luz = {};
    for (const k in MUSCULOS) {
      const [a, b, c] = MUSCULOS[k], s = m.musc[k];
      const d = k.startsWith('abs') ? def * def : def;
      bultos[k] = a * d + b * s.bombeo + c * s.contr;
      ver[k] = Math.max(d, s.bombeo * 0.85, s.contr);
      luz[k] = s.contr;
    }
    for (const l of ['I', 'D']) bultos['deltoides' + l] = Math.max(bultos['hombros' + l], bultos['hombrosPost' + l]);
    // sus proporciones, por su sexo (D-139: CUERPOS de esqueleto.js)
    const S = cuerpoDeSexo(m.sexo);
    return { anchoHombros: S.hombros[0] + S.hombros[1] * def, vientre: gordo * (12 + 0.9 * resp), gordo, def, bultos, ver, luz,
      sexo: m.sexo, proporciones: S };
  }

  // ——— Las acciones ———
  // Cada una: { nombre, actualizar(dt) → salida, hecha, … }. La salida: la pose, en qué se apoya
  // («pies», «cadera» o «tumbado») y el punto del mundo donde se apoya (x, y), más lo que haga falta.

  function quieto(dur = entre(2, 5)) {
    const fase = entre(0, 6);
    return {
      nombre: 'Mira a su alrededor', t: 0, calma: true,
      actualizar(dt) {
        this.t += dt;
        if (m.t > m.mirada.hasta) mirarAlAzar();
        const s = Math.sin(0.9 * m.t + fase);
        return { pose: llevar({ ...POSE_BASE, lumbar: 1.8 * s, musloI: 4 + 1.2 * s, musloD: 4 - 1.2 * s }), apoyo: 'pies', x: m.x, y: sup().y, objeto: elTrofeo() };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  // Pasea de perfil, mirando hacia donde va, con la cabeza un poco girada hacia nosotros. Con agujetas en las piernas,
  // más despacio y con pasos más cortos (y las rodillas, más tiesas).
  function caminar(destino) {
    let v = 0, fase = 0;
    const cargadas = dolor('piernas');
    const velocidad = VELOCIDAD * (1 - 0.3 * cargadas), paso = PASO * (1 - 0.25 * cargadas), rodilla = 50 * (1 - 0.3 * cargadas);
    const zancada = () => 4 * (MEDIDAS.muslo + MEDIDAS.pierna) * Math.sin((paso * Math.PI) / 180) * m.escala;
    return {
      nombre: 'Pasea', t: 0, transicion: 0.35,
      alEmpezar() {
        const s = sup();
        destino = limitar(destino, s.x1 + MARGEN, s.x2 - MARGEN);
      },
      actualizar(dt) {
        this.t += dt;
        const s = sup(); // si su tramo libre ha encogido (la app cambió), no se sale de él
        destino = limitar(destino, s.x1 + MARGEN, s.x2 - MARGEN);
        const falta = destino - m.x, dir = Math.sign(falta) || 1;
        v = lerp(v, Math.min(velocidad, Math.abs(falta) * 3 + 5), Math.min(1, dt * 6));
        m.x += dir * Math.min(Math.abs(falta), v * dt);
        fase += (dt * 2 * Math.PI * v) / zancada();
        const ritmo = Math.min(1, v / velocidad), sn = Math.sin(fase), cs = Math.cos(fase);
        mirarCara(3 * dir, 0.6, 0.2);
        return {
          pose: llevar({
            ...POSE_BASE, orientacion: 90 * dir, cabezaGiro: -38 * dir, inclinar: 5 * ritmo,
            musloI: 2, musloD: 2,
            musloAdI: paso * sn * ritmo, rodillaAdI: -(5 + rodilla * Math.max(0, cs) * ritmo),
            musloAdD: -paso * sn * ritmo, rodillaAdD: -(5 + rodilla * Math.max(0, -cs) * ritmo),
            brazoI: 6, brazoD: 6, brazoAdI: -24 * sn * ritmo, brazoAdD: 24 * sn * ritmo, codoAdI: 28, codoAdD: 28,
            estirar: 0.012 * Math.abs(cs) * ritmo,
          }, { brazoD: 6, brazoAdD: 20, codoAdD: 90 }),
          apoyo: 'pies', x: m.x, y: sup().y, objeto: elTrofeo(),
        };
      },
      get hecha() { return Math.abs(destino - m.x) < 0.5; },
    };
  }

  // ¿Está bien ahí? Sin tramos libres apuntados (el prototipo, las pruebas), siempre; si no, dentro de uno: de pie,
  // ahí no tapa nada.
  function comodaEn(s, x) {
    return !s?.libres || s.libres.some(([a, b]) => x >= a - 2 && x <= b + 2);
  }
  // Un punto donde ponerse en s, cerca de «cerca» (a «alcance» como mucho): casi siempre dentro de un tramo libre, si
  // tiene; con «soloLibre», siempre (si tiene alguno).
  function puntoEn(s, cerca = null, alcance = Infinity, soloLibre = false) {
    const a0 = cerca == null ? -Infinity : cerca - alcance;
    const b0 = cerca == null ? Infinity : cerca + alcance;
    const dentro = ([a, b]) => [Math.max(a, s.x1 + MARGEN, a0), Math.min(b, s.x2 - MARGEN, b0)];
    const libres = (s.libres || []).map(dentro).filter(([a, b]) => b > a);
    if (libres.length && (soloLibre || azar() < 0.75)) {
      const [a, b] = unoDe(libres);
      return entre(a, b);
    }
    const [a, b] = dentro([s.x1, s.x2]);
    return b > a ? entre(a, b) : limitar(cerca ?? (s.x1 + s.x2) / 2, s.x1 + MARGEN, s.x2 - MARGEN);
  }

  // Salta a otra superficie cercana (arriba, abajo o a otro tramo a la misma altura), mejor a una con sitio libre: desde
  // donde está, o un poco más allá, hasta un punto de esa. Salta por delante de lo que haya en medio.
  function planearSalto() {
    const s0 = sup();
    if (!s0) return null;
    const opciones = [];
    for (const s1 of lista()) {
      if (s1.id === s0.id || s1.tipo === 'rincon' || s1.x2 - s1.x1 < 2 * MARGEN) continue;
      const dy = Math.abs(s1.y - s0.y);
      if (dy > 300) continue;
      if (dy < 24 && s1.x1 <= s0.x2 && s1.x2 >= s0.x1) continue; // a la misma altura y pegadas: mejor andar
      const x1 = puntoEn(s1, m.x, 200);
      const x0 = limitar(lerp(m.x, x1, 0.35), s0.x1 + MARGEN, s0.x2 - MARGEN);
      if (Math.abs(x1 - x0) > 240) continue;
      opciones.push({ x0, s1, x1, peso: (s1.libres?.length ? 2 : 1) * (1.15 - dy / 300) });
    }
    if (!opciones.length) return null;
    let r = azar() * opciones.reduce((a, o) => a + o.peso, 0);
    for (const o of opciones) if ((r -= o.peso) <= 0) return o;
    return opciones[opciones.length - 1];
  }
  // desde: { x, y } si no sale de su superficie sino de otro sitio (de donde estaba cuando se le fue la tarjeta).
  function saltar(destino, x1, desde = null) {
    const PREP = 0.26, ATERRIZA = 0.32;
    let x0, y0, y1, cima, vuelo, llego = false;
    return {
      nombre: 'Salta a otra tarjeta', t: 0, interrumpible: false,
      alEmpezar() {
        if (desde) m.x = desde.x;
        m.destinoSalto = destino.id;
        x0 = m.x;
        y0 = desde ? desde.y : sup().y;
        y1 = destino.y;
        this.nombre = y1 < y0 ? 'Salta a la tarjeta de arriba' : 'Baja de un salto';
        cima = Math.max(Math.min(y0, y1) - (y1 < y0 ? 26 : 16), techo() + 135 * m.escala); // que no se le salga la cabeza
        vuelo = 0.42 + Math.min(0.55, Math.abs(y0 - y1) / 700 + Math.abs(x1 - x0) / 900);
      },
      actualizar(dt) {
        const t = (this.t += dt);
        // si se desplaza la pantalla mientras salta, sus dos sitios van con ella
        const d = lista().find((s) => s.id === destino.id);
        if (d) y1 = d.y;
        if (!desde && !llego) y0 = sup().y;
        const dir = Math.sign(x1 - x0) || 1;
        const lado = { orientacion: 80 * dir, cabezaGiro: -30 * dir };
        if (t < PREP) {
          const u = suave(t / PREP);
          mirarCara(3 * dir, y1 < y0 ? -2.6 : 2.6, 0.3);
          return {
            pose: { ...POSE_BASE, ...lado, inclinar: 22 * u, musloAdI: 50 * u, rodillaAdI: -85 * u,
              musloAdD: 50 * u, rodillaAdD: -85 * u, brazoAdI: -40 * u, brazoAdD: -40 * u, estirar: -0.04 * u },
            apoyo: 'pies', x: x0, y: y0,
          };
        }
        if (t < PREP + vuelo) {
          const u = (t - PREP) / vuelo, r = Math.sin(Math.PI * u);
          const y = lerp(y0, y1, u) - 4 * ((y0 + y1) / 2 - cima) * u * (1 - u);
          return {
            pose: { ...POSE_BASE, ...lado, inclinar: 8 * r, musloAdI: 60 * r, rodillaAdI: -70 * r,
              musloAdD: -28 * r, rodillaAdD: -50 * r, brazoAdI: 150 * r, brazoAdD: 120 * r, codoAdI: 10, codoAdD: 10,
              estirar: 0.06 * (1 - r) },
            apoyo: 'pies', x: lerp(x0, x1, u), y,
          };
        }
        if (!llego) {
          llego = true;
          m.sup = destino.id;
          m.destinoSalto = null;
          m.llegada = m.t;
          m.x = x1;
        }
        const k = Math.sin(Math.PI * Math.min(1, (t - PREP - vuelo) / ATERRIZA));
        return {
          pose: { ...POSE_BASE, ...lado, inclinar: 18 * k, musloAdI: 45 * k, rodillaAdI: -78 * k,
            musloAdD: 45 * k, rodillaAdD: -78 * k, brazoAdI: 30 * k, brazoAdD: 30 * k, estirar: -0.05 * k },
          apoyo: 'pies', x: x1, y: y1,
        };
      },
      get hecha() { return vuelo !== undefined && this.t >= PREP + vuelo + ATERRIZA; },
    };
  }

  // Sentada en el borde de la tarjeta: los muslos hacia delante y las piernas colgando por delante.
  function sentarse(dur = entre(6, 11)) {
    const fase = entre(0, 6), lado = azar() < 0.5 ? -1 : 1;
    return {
      nombre: 'Se sienta en el borde', t: 0, transicion: 0.45, calma: true,
      actualizar(dt) {
        this.t += dt;
        const modorra = m.sueno > 0.55 ? tramo(this.t, Math.min(dur * 0.35, 6), Math.min(dur, 12)) : 0;
        const col = Math.sin(this.t * 2.2 + fase) * (1 - modorra);
        if (modorra < 0.3 && m.t > m.mirada.hasta) mirarAlAzar();
        if (modorra >= 0.3) mirarCara(0, 2.4, 0.3);
        if (modorra > 0.5) this.nombre = 'Le entra sueño';
        return {
          pose: llevar({
            ...POSE_BASE, orientacion: 18 * lado, cabezaGiro: -10 * lado, inclinar: -4 + 8 * modorra,
            musloI: 7, musloD: 7, musloAdI: 84, musloAdD: 84, rodillaAdI: -84 + 16 * col, rodillaAdD: -84 - 16 * col,
            brazoI: 26, brazoD: 26, brazoAdI: 6, brazoAdD: 6, codoAdI: 6, codoAdD: 6, hombros: 0.6 - modorra,
            cabeza: 8 * modorra * (0.55 + 0.45 * Math.sin(this.t * 1.4)), cabezaAd: 22 * modorra,
          }, { brazoD: 14, brazoAdD: 34, codoAdD: 64 }),
          apoyo: 'cadera', x: m.x, y: sup().y, objeto: elTrofeo(),
          ojos: modorra > 0.6 ? Math.max(0.12, 1 - (modorra - 0.6) * 2.2) : 1,
        };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  // Duerme tumbada boca arriba, con las rodillas dobladas y las manos detrás de la cabeza. Al despertar, se despereza
  // («alDespertar»: el gesto de después, o null si ya lleva otro en la cola).
  function dormir(dur = entre(12, 22), { alDespertar = 'desperezarse' } = {}) {
    const espejo = azar() < 0.5;
    let proxZ = 1;
    return {
      nombre: 'Duerme', t: 0, transicion: 0.9, dormida: true, calma: true,
      alEmpezar() {
        m.cara = null;
        const s = sup(), cabeza = 70 * m.escala, pies = 55 * m.escala;
        m.x = espejo ? limitar(m.x, s.x1 + pies, s.x2 - cabeza) : limitar(m.x, s.x1 + cabeza, s.x2 - pies);
      },
      actualizar(dt) {
        this.t += dt;
        if (this.t > proxZ) {
          efecto('z');
          proxZ = this.t + 1.7;
        }
        const r = Math.sin((this.t * 2 * Math.PI) / 4.6);
        return {
          pose: {
            ...POSE_BASE, orientacion: 90, giro: -90, cabezaGiro: -40, cabezaAd: -8, inclinar: -4, hombros: 0.6 * r,
            musloAdI: 58, rodillaAdI: -108, musloAdD: 76, rodillaAdD: -62, musloD: -4,
            brazoI: 16, brazoD: 16, brazoAdI: 166, brazoAdD: 166, codoAdI: 100, codoAdD: 100,
          },
          apoyo: 'tumbado', x: m.x, y: sup().y, espejo, cara: 'dormida', respira: 4.6,
        };
      },
      get hecha() { return this.t >= dur; },
      alTerminar() {
        m.sueno = 0.12;
        if (alDespertar) m.cola.unshift(gesto(GESTOS[alDespertar]));
      },
    };
  }
  // Lo que duerme cuando le entra sueño: de 12 a 22 s; de noche, más (el ritmo del día, dia.js).
  const siesta = () => entre(12, 22) * (m.ritmo.siesta || 1);

  // Se esconde detrás de su tarjeta, se asoma por el borde, mira a un lado y a otro, y sale de un salto.
  function asomarse() {
    let ojos, todo;
    return {
      nombre: 'Se esconde', t: 0,
      alEmpezar() {
        const cin = cinematica(POSE_BASE, cuerpoDe(0));
        ojos = (cin.pies - (cin.p.cabeza[1] - 1)) * m.escala;
        todo = (cin.pies - (cin.p.cabeza[1] - MEDIDAS.cabeza)) * m.escala + 6;
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const asomado = ojos - 7 * m.escala; // los ojos, por encima del borde; las manos, agarradas a él
        let hundir = 0, pose = POSE_BASE, dx = 0;
        if (t < 0.3) {
          const u = suave(t / 0.3);
          pose = { ...POSE_BASE, musloAdI: 40 * u, rodillaAdI: -70 * u, musloAdD: 40 * u, rodillaAdD: -70 * u, inclinar: 12 * u };
        } else if (t < 0.62) {
          hundir = todo * suave((t - 0.3) / 0.32);
        } else if (t < 1.6) {
          hundir = todo;
        } else if (t < 4.0) {
          hundir = lerp(todo, asomado, suave((t - 1.6) / 0.6));
          pose = { ...POSE_BASE, brazoI: 110, codoI: 105, brazoD: 110, codoD: 105, codoAdI: 0, codoAdD: 0 };
          if (t > 1.8 && this.nombre !== 'Se asoma') {
            this.nombre = 'Se asoma';
            ponerCara('curiosa', 2.1);
          }
          const mira = t < 2.5 ? -1 : t < 3.3 ? 1 : 0;
          mirarCara(4.3 * mira, mira ? 0.6 : 0, 0.2);
          dx = 2 * mira * tramo(t, 2.2, 2.5);
        } else {
          const u = Math.min(1, (t - 4.0) / 0.42);
          hundir = asomado * (1 - u) - (asomado / 2 + 14) * 4 * u * (1 - u);
          const r = Math.sin(Math.PI * u);
          pose = { ...POSE_BASE, brazoI: 10 + 120 * r, brazoD: 10 + 120 * r, codoI: 10, codoD: 10,
            musloAdI: 30 * r, rodillaAdI: -50 * r, musloAdD: 30 * r, rodillaAdD: -50 * r };
        }
        const s = sup(); // la de ahora (si se desplaza la pantalla, va con ella)
        return {
          pose, apoyo: 'pies', x: m.x + dx, y: s.y + hundir,
          ocultar: { x1: s.c1 ?? s.x1, x2: s.c2 ?? s.x2, y: s.y }, sombra: hundir < 3,
        };
      },
      get hecha() { return this.t >= 4.42; },
    };
  }

  // ——— El descanso (D-135) ———
  // Por el tiempo que queda: su luz se recarga (de apagada a más brillante que nunca: «recargada»), a los 10 s calienta
  // para el siguiente ejercicio y a los 3 se pone en guardia. m.descanso: { id, quedan, fraccion, pausa, grupoSiguiente }.
  function ponerAlDiaDescanso(dt) {
    const d = m.descanso;
    if (!d) {
      m.rest = null;
      m.carga = lerp(m.carga, 1, Math.min(1, dt * 1.5));
      return;
    }
    // un descanso nuevo; en más o menos 6 de cada 10, imitará tu ejercicio (para que no sea siempre lo mismo)
    if (m.rest?.id !== d.id) m.rest = { id: d.id, recuperada: false, calentando: false, guardia: false, recargada: false, imitara: azar() < 0.6 };
    m.sueno = Math.min(m.sueno, 0.3); // descansando contigo no le entra sueño
    m.carga = lerp(m.carga, 0.35 + 0.95 * limitar(d.fraccion, 0, 1), Math.min(1, dt * 3));
    if (!m.rest.recargada && d.fraccion >= 0.985) {
      m.rest.recargada = true;
      m.flash = m.t;
      efecto('chispas');
    }
    if (m.tranquila || d.pausa) return;
    // le han sumado tiempo: calentará (y se pondrá en guardia) más tarde
    if (m.rest.calentando && !m.rest.guardia && d.quedan > 12) m.rest.calentando = false;
    if (m.rest.guardia && d.quedan > 5) m.rest.guardia = false;
    if (!m.rest.calentando && d.quedan <= 10 && d.quedan > 3) {
      m.rest.calentando = m.rest.recuperada = true;
      reaccionar(calentar(d.grupoSiguiente));
    }
    if (!m.rest.guardia && d.quedan <= 3) {
      m.rest.guardia = m.rest.calentando = m.rest.recuperada = true;
      reaccionar([enGuardia()]);
    }
  }
  // Qué hace en el descanso: primero recupera el aliento y se seca el sudor; luego descansa contigo (se sienta, bebe,
  // mira cuánto queda, se estira…), mejor donde no tape nada.
  function enElDescanso(s) {
    const r = m.rest;
    const aSitio = (acciones) => (s.libres?.length && !comodaEn(s, m.x) ? [caminar(puntoEn(s, null, Infinity, true)), ...acciones] : acciones);
    if (r && !r.recuperada) {
      r.recuperada = true;
      return [gesto(GESTOS.jadear), gesto(GESTOS.secarse)];
    }
    // imitar tu ejercicio (el de la serie que acabas de hacer): en los descansos que toca, una vez
    const puedeImitar = r && r.imitara && !r.imitado && IMITAR[m.descanso?.grupo];
    const opciones = [['sentarse', 3], ['beber', 1.5], ['reloj', 1.4], ['desperezarse', 0.7], ['quieto', 1], ['mirarte', 0.8], ['pasear', 0.7],
      ['imitar', puedeImitar ? 2.5 : 0]]
      .filter(([n, p]) => p > 0 && (n !== m.previa || n === 'sentarse'));
    let x = azar() * opciones.reduce((a, [, p]) => a + p, 0);
    let elegida = opciones[0][0];
    for (const [n, p] of opciones) {
      if ((x -= p) <= 0) {
        elegida = n;
        break;
      }
    }
    m.previa = elegida;
    switch (elegida) {
      case 'sentarse': return aSitio([sentarse(entre(5, 9))]);
      case 'beber': return aSitio([gesto(GESTOS.beber)]);
      case 'reloj': return [mirarReloj()];
      case 'imitar':
        r.imitado = true;
        return aSitio([imitar(m.descanso.grupo)]);
      case 'desperezarse': return [gesto(GESTOS.desperezarse)];
      case 'mirarte': return [gesto(GESTOS.mirarte)];
      case 'pasear': return [caminar(puntoEn(s))];
      default: return aSitio([quieto()]);
    }
  }
  // Imita tu ejercicio (D-135, la 4): con su mancuerna pequeña (o dos), unas repeticiones del de ese grupo (IMITAR de
  // gestos.js), con cara de esfuerzo y ese músculo encendido en cada subida; al acabar, contenta.
  function imitar(grupo, reps = 4) {
    const def = IMITAR[grupo];
    const a = { ...POSE_BASE, ...def.a }, b = { ...a, ...def.b };
    const T = 1.2, entra = 0.35, sale = 0.6, dur = entra + reps * T + sale;
    const objeto = def.manos === 'ambas' ? [{ tipo: 'mancuerna', mano: 'I' }, { tipo: 'mancuerna', mano: 'D' }] : { tipo: 'mancuerna', mano: def.manos || 'D' };
    const musculos = GRUPOS[grupo]?.musculos || [];
    return {
      nombre: def.nombre, t: 0, transicion: 0.4,
      actualizar(dt) {
        const t = (this.t += dt);
        const dentro = t > entra && t < entra + reps * T;
        const u = dentro ? (1 - Math.cos((2 * Math.PI * (t - entra)) / T)) / 2 : 0;
        for (const k of musculos) m.musc[k].contr = Math.max(m.musc[k].contr, 0.55 * u);
        return { pose: mezclar(a, b, u), apoyo: 'pies', x: m.x, y: sup().y, cara: dentro ? 'esfuerzo' : 'contenta', objeto };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  // Mira la cuenta atrás de la barra del descanso.
  function mirarReloj() {
    return {
      nombre: 'Mira cuánto queda', t: 0, calma: true,
      actualizar(dt) {
        this.t += dt;
        const r = reloj();
        if (r) mirarPunto(r[0], r[1], 0.3);
        return { pose: { ...POSE_BASE, cabeza: 6 }, apoyo: 'pies', x: m.x, y: sup().y };
      },
      get hecha() { return this.t >= 2.2; },
    };
  }
  // Calienta para el siguiente ejercicio, un movimiento tras otro (los brazos, las rodillas, el tronco), y ese músculo
  // se le enciende a ratos. Cada movimiento para en cuanto ya no toca calentar («sobra»: en el descanso, calentarSobra;
  // antes de empezar a entrenar, cuando empiezas la sesión; si no, hace los tres).
  function calentar(grupo, sobra = calentarSobra) {
    const musculos = GRUPOS[grupo]?.musculos || [];
    const W = 2 * Math.PI;
    const mov = (nombre, pose) => ({
      nombre, t: 0,
      actualizar(dt) {
        const t = (this.t += dt);
        for (const k of musculos) m.musc[k].contr = Math.max(m.musc[k].contr, 0.3 + 0.4 * Math.max(0, Math.sin(t * 5)));
        if (m.t > m.mirada.hasta) mirarAlAzar();
        return { pose: { ...POSE_BASE, ...pose(t) }, apoyo: 'pies', x: m.x, y: sup().y, cara: 'esfuerzo' };
      },
      get hecha() { return this.t >= 2.4 || sobra(); },
    });
    const movimientos = [
      mov('Calienta los brazos', (t) => {
        const c = Math.cos(t * W * 1.1);
        return { brazoI: 30 + 22 * c, brazoD: 30 - 22 * c, brazoAdI: 28 * c, brazoAdD: -28 * c, codoI: 20, codoD: 20, alto: 2 * Math.max(0, Math.sin(t * W * 2.2)) };
      }),
      mov('Calienta las rodillas', (t) => {
        const s = Math.sin(t * W * 1.25);
        return { musloAdI: 55 * Math.max(0, s), rodillaAdI: -70 * Math.max(0, s), musloAdD: 55 * Math.max(0, -s), rodillaAdD: -70 * Math.max(0, -s),
          brazoI: 20, brazoD: 20, codoI: 60, codoD: 60 };
      }),
      mov('Calienta el tronco', (t) => ({ orientacion: 35 * Math.sin(t * W * 0.9), brazoI: 75, brazoD: 75, codoI: 70, codoD: 70, inclinar: 4 })),
    ];
    const primero = Math.floor(azar() * movimientos.length);
    return [...movimientos.slice(primero), ...movimientos.slice(0, primero)];
  }
  // ¿Ya no toca calentar? Se acabó el descanso, falta muy poco (se pone en guardia) o le han sumado tiempo.
  const calentarSobra = () => !m.descanso || m.descanso.quedan <= 3 || m.descanso.quedan > 12;
  // ¡Lista para la siguiente!: los puños arriba, un poco agachada y botando.
  function enGuardia() {
    return {
      nombre: '¡Lista para la siguiente!', t: 0,
      alEmpezar() { efecto('chispas'); },
      actualizar(dt) {
        const t = (this.t += dt);
        const b = Math.max(0, Math.sin(t * 2 * Math.PI * 1.6));
        return {
          pose: {
            ...POSE_BASE, brazoI: 62, codoI: 115, brazoD: 62, codoD: 115, brazoAdI: 20, brazoAdD: 20,
            musloAdI: 22, rodillaAdI: -40, musloAdD: 22, rodillaAdD: -40, inclinar: 6, alto: 2 * b,
          },
          apoyo: 'pies', x: m.x, y: sup().y, cara: 'esfuerzo',
        };
      },
      get hecha() { return this.t >= 4.5 || !m.descanso; }, // hasta que acaba el descanso
    };
  }

  // Asomada por el borde de la barra de abajo (en el rincón): solo los ojos y las manos por encima, así que casi no tapa
  // nada. Mira a un lado y a otro, sube y baja un poco y, si le entra sueño, se le cierran los ojos y se hunde.
  function vigilar(dur = entre(10, 22)) {
    const fase = entre(0, 6);
    let ojos = 0;
    return {
      nombre: 'Se asoma desde abajo', t: 0, calma: true, transicion: 0.5,
      alEmpezar() {
        const cin = cinematica(POSE_BASE, cuerpoDe(0));
        ojos = (cin.pies - (cin.p.cabeza[1] - 1)) * m.escala;
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const modorra = tramo(m.sueno, 0.6, 1);
        if (modorra < 0.5 && m.t > m.mirada.hasta) mirarAlAzar();
        if (modorra >= 0.5) mirarCara(0, 1.5, 0.3);
        const s = sup();
        const hundir = ojos - 7 * m.escala + 1.5 * Math.sin(t * 1.1 + fase) * (1 - modorra) + 4 * modorra * m.escala;
        return {
          pose: { ...POSE_BASE, brazoI: 110, codoI: 105, brazoD: 110, codoD: 105, codoAdI: 0, codoAdD: 0 },
          apoyo: 'pies', x: m.x, y: s.y + hundir,
          ocultar: { x1: s.c1 ?? s.x1, x2: s.c2 ?? s.x2, y: s.y }, sombra: false,
          ojos: modorra > 0.5 ? Math.max(0.1, 1 - (modorra - 0.5) * 1.8) : undefined,
        };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  // Un gesto de gestos.js, con su cara, sus músculos y sus efectos.
  const preparados = new Map();
  function cuadrosDe(def) {
    if (!preparados.has(def)) {
      let anterior = { ...POSE_BASE };
      const cuadros = [[0, anterior]];
      for (const [t, cambios] of def.cuadros) {
        anterior = { ...anterior, ...cambios };
        cuadros.push([t, anterior]);
      }
      preparados.set(def, cuadros);
    }
    return preparados.get(def);
  }
  function poseEn(cuadros, t) {
    for (let i = 1; i < cuadros.length; i++) {
      const [t1, p1] = cuadros[i];
      if (t < t1) {
        const [t0, p0] = cuadros[i - 1];
        return mezclar(p0, p1, suave((t - t0) / (t1 - t0)));
      }
    }
    return cuadros[cuadros.length - 1][1];
  }
  function gesto(def, { espejo = def.espejable ? azar() < 0.5 : false } = {}) {
    const cuadros = cuadrosDe(def);
    return {
      nombre: def.nombre, t: 0, interrumpible: false,
      actualizar(dt) {
        const t0 = this.t, t1 = (this.t += dt);
        for (const [ti, cara, dur] of def.cara || []) if (ti >= t0 && ti < t1) ponerCara(cara, dur);
        for (const [ti, tipo] of def.efectos || []) if (ti >= t0 && ti < t1) efecto(tipo);
        for (const [clave, a, b] of def.musculos || []) {
          const env = tramo(t1, a, a + 0.12) * (1 - tramo(t1, b - 0.18, b));
          if (env <= 0) continue;
          for (const k of clave === '*' ? Object.keys(m.musc) : [clave]) m.musc[k].contr = Math.max(m.musc[k].contr, env);
        }
        if (def.destello) {
          const [a, b] = def.destello;
          m.destello = Math.max(m.destello, tramo(t1, a, a + 0.15) * (1 - tramo(t1, b - 0.4, b)));
        }
        for (const [a, b, ox, oy] of def.mirar || []) if (t1 >= a && t1 < b) mirarCara(espejo ? -ox : ox, oy, 0.2);
        let pose = poseEn(cuadros, t1);
        for (const [a, b, campos, hz] of def.vibrar || []) {
          if (t1 < a || t1 > b) continue;
          const k = Math.sin(2 * Math.PI * hz * (t1 - a)) * tramo(t1, a, a + 0.1) * (1 - tramo(t1, b - 0.15, b));
          pose = { ...pose };
          for (const c in campos) pose[c] += campos[c] * k;
        }
        // lo que lleva en la mano (la botella, la toalla), en la otra si el gesto va al revés
        const obj = (def.objeto || []).find(([a, b]) => t1 >= a && t1 < b);
        const objeto = obj ? { tipo: obj[2], mano: espejo ? (obj[3] === 'D' ? 'I' : 'D') : obj[3] } : null;
        return { pose, apoyo: 'pies', x: m.x, y: sup().y, espejo, objeto };
      },
      get hecha() { return this.t >= def.dur; },
    };
  }

  // ——— Los toques (D-135, la 5) ———
  // Un toque en ella: uno suelto espera DOBLE s por si llega otro (unToque()); dos seguidos, salta de alegría; tres o más,
  // cosquillas, mientras sigas. Dormida, el primero la despierta y te saluda, sin esperar.
  function tocarla() {
    if (m.cogida) return;
    const r = m.rafaga && m.t - m.rafaga.ultimo <= DOBLE ? m.rafaga : (m.rafaga = { n: 0, ultimo: 0 });
    r.n += 1;
    r.ultimo = m.t;
    if (r.n >= 3) {
      m.pendiente = null;
      hacerCosquillas();
    } else if (r.n === 1 && m.accion?.dormida) {
      m.pendiente = null;
      reaccionar([gesto(GESTOS.saludo)]);
    } else m.pendiente = { n: r.n, cuando: m.t + DOBLE };
  }
  // Un toque suelto: se asusta, te saluda y se aparta, para no quedarse tapando lo que querías tocar; en el descanso,
  // choca los cinco.
  function unToque() {
    if (m.descanso) {
      reaccionar([gesto(GESTOS.chocar)]);
      return;
    }
    reaccionar([gesto(GESTOS.susto), gesto(GESTOS.saludo)]);
    const s = sup();
    if (!m.tranquila && s && s.tipo !== 'rincon') {
      const p = planearSalto();
      const lejos = m.x < (s.x1 + s.x2) / 2 ? s.x2 : s.x1;
      const irse = p ? [caminar(p.x0), saltar(p.s1, p.x1)] : [caminar(puntoEn(s, lejos, 120))];
      for (const a of irse) a.reaccion = true;
      m.cola.push(...irse);
    }
  }
  // Tres toques o más: cosquillas. Si ya se está riendo, sigue (sin volver a empezar el gesto).
  function hacerCosquillas() {
    const a = m.accion, nombre = GESTOS.cosquillas.nombre;
    if (a?.nombre === nombre && !a.hecha) {
      a.t = Math.min(a.t, 0.4);
      if (m.cara?.nombre === 'risa') m.cara.dur = m.t - m.cara.t0 + 1.3;
      else ponerCara('risa', 1.4);
      return;
    }
    if (m.cola.some((x) => x.nombre === nombre)) return;
    reaccionar([gesto(GESTOS.cosquillas)]);
  }

  // ——— Cogerla (D-135, la 5) ———
  // La llevas: de pie en la punta de tu dedo (sus pies, en el punto que le dan: un poco por encima del dedo, para que no
  // la tape), haciendo equilibrios. Se inclina al revés de como la mueves, como de pie en un autobús que arranca, con los
  // brazos abiertos, que agita si vas rápido; al parar, se balancea un poco y se endereza. Al cogerla, sube de un saltito
  // hasta tu dedo. No se acaba sola: la acaba soltar().
  function llevada() {
    let px = 0, py = 0, x0 = 0, y0 = 0, vx = 0, vy = 0, lado = 0, vlado = 0, agite = 0;
    return {
      nombre: 'Va en tu dedo', t: 0, interrumpible: false, cogida: true, transicion: 0.12,
      alEmpezar() {
        px = m.cogida.x;
        py = m.cogida.y;
        // desde donde tiene los pies ahora
        const f = m.ultimo;
        x0 = f ? f.raiz[0] : px;
        y0 = f ? f.raiz[1] + (f.pose.alto + f.cin.pies) * m.escala : py;
        ponerCara('sorpresa', 0.8);
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const c = m.cogida || { x: px, y: py };
        if (dt > 0) {
          const k = Math.min(1, dt * 12);
          vx = lerp(vx, (c.x - px) / dt, k);
          vy = lerp(vy, (c.y - py) / dt, k);
        }
        px = c.x;
        py = c.y;
        // como un muelle: se inclina al revés de como la mueves y, al parar, se balancea hasta enderezarse
        vlado += (90 * (limitar(-0.03 * vx, -26, 26) - lado) - 9 * vlado) * dt;
        lado = limitar(lado + vlado * dt, -34, 34);
        const rapido = Math.min(1, Math.hypot(vx, vy) / 900);
        agite = lerp(agite, rapido, Math.min(1, dt * 5));
        if (rapido > 0.25) mirarCara(4 * Math.sign(vx), 0.6 * Math.sign(vy), 0.25); // mira adónde la llevas
        else if (m.t > m.mirada.hasta) mirarCara(0, 0, 0.4);                        // y si no, a ti
        // al cogerla, sube de un saltito hasta tu dedo
        const u = Math.min(1, t / 0.24);
        const x = lerp(x0, c.x, suave(u)), y = lerp(y0, c.y, suave(u)) - 16 * Math.sin(Math.PI * u);
        const w = Math.sin(m.t * 15) * agite, b = Math.sin(m.t * 3.3) * (1 - agite);
        const doblar = 14 + 12 * agite;
        return {
          pose: {
            ...POSE_BASE, lumbar: 0.55 * lado, pecho: 0.35 * lado, cabeza: -0.3 * lado,
            brazoI: 80 + 8 * b + 34 * w - 0.5 * lado, brazoD: 80 - 8 * b - 34 * w + 0.5 * lado,
            codoI: 16, codoD: 16, brazoAdI: 8, brazoAdD: 8, codoAdI: 6, codoAdD: 6,
            musloI: 1, musloD: 1, musloAdI: 8, musloAdD: 8, rodillaAdI: -doblar, rodillaAdD: -doblar,
            estirar: limitar(0.00004 * vy, -0.04, 0.04),
          },
          apoyo: 'pies', x, y, cara: rapido > 0.45 ? 'risa' : 'contenta',
        };
      },
      get hecha() { return false; },
    };
  }
  // Donde cae si la sueltas con los pies en (x, y): la primera superficie de debajo; si no hay ninguna, la más cercana.
  function dondeCae(x, y) {
    let mejor = null, d0 = Infinity;
    for (const s of lista()) {
      const dy = s.y - y;
      const d = x >= s.x1 - 4 && x <= s.x2 + 4 && dy >= -6 ? dy : 1e4 + Math.abs(dy) + 2 * Math.abs(limitar(x, s.x1, s.x2) - x);
      if (d < d0) {
        d0 = d;
        mejor = s;
      }
    }
    return mejor;
  }
  // Al soltarla: cae hasta su superficie, cada vez más deprisa, con los brazos arriba y pataleando (si está más arriba,
  // salta hasta ella); aterriza agachándose y, si caía de alto, rebota un poco (en el modo tranquilo, sin rebote).
  function caer(destino, x1, desde) {
    const ATERRIZA = 0.22, REBOTE = 0.34;
    let y1 = destino.y, vuelo = 0, sube = false, rebote = 0, cima = 0;
    return {
      nombre: 'Se cae', t: 0, interrumpible: false, cayendo: true, transicion: 0.08,
      alEmpezar() {
        m.sup = destino.id;
        m.x = x1;
        m.ultY = destino.y;
        m.llegada = m.t;
        m.perdida = false;
        m.desde = null;
        m.destinoSalto = null;
        const h = y1 - desde.y;
        sube = h < -4;
        vuelo = sube ? 0.42 : limitar(Math.sqrt((2 * Math.max(0, h)) / GRAVEDAD), 0.1, 0.85);
        rebote = sube || m.tranquila ? 0 : 18 * tramo(h, 40, 320);
        cima = Math.min(desde.y, y1) - 24;
        if (sube) this.nombre = 'Salta a la tarjeta de arriba';
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const d = lista().find((s) => s.id === destino.id); // si se desplaza la pantalla mientras cae, va con ella
        if (d) y1 = d.y;
        if (t < vuelo) {
          const u = t / vuelo;
          const y = sube ? lerp(desde.y, y1, u) - 4 * ((desde.y + y1) / 2 - cima) * u * (1 - u) : lerp(desde.y, y1, u * u);
          const p = Math.sin(t * 24);
          mirarCara(0, 2.6, 0.2); // mira adónde cae
          return {
            pose: {
              ...POSE_BASE, brazoI: 150, brazoD: 150, codoI: 24, codoD: 24, codoAdI: 0, codoAdD: 0,
              musloAdI: 34 + 26 * p, rodillaAdI: -44 - 26 * Math.max(0, p), musloAdD: 34 - 26 * p, rodillaAdD: -44 - 26 * Math.max(0, -p),
              estirar: 0.03,
            },
            apoyo: 'pies', x: lerp(desde.x, x1, suave(u)), y, cara: 'sorpresa',
          };
        }
        const e = t - vuelo;
        const k = e < ATERRIZA ? Math.sin((Math.PI * e) / ATERRIZA) : 0; // se agacha al tocar el suelo
        const r = rebote && e >= ATERRIZA ? Math.sin(Math.PI * Math.min(1, (e - ATERRIZA) / REBOTE)) : 0;
        return {
          pose: {
            ...POSE_BASE, inclinar: 16 * k, musloAdI: 44 * k, rodillaAdI: -4 - 74 * k, musloAdD: 44 * k, rodillaAdD: -4 - 74 * k,
            brazoI: 10 + 40 * k + 60 * r, brazoD: 10 + 40 * k + 60 * r, estirar: -0.06 * k + 0.04 * r, alto: rebote * r,
          },
          apoyo: 'pies', x: x1, y: y1, cara: k > 0.2 ? 'sorpresa' : null,
        };
      },
      get hecha() { return vuelo > 0 && this.t >= vuelo + ATERRIZA + (rebote ? REBOTE : 0); },
    };
  }

  // ——— Qué hacer ahora ———
  function elegir() {
    const s = sup();
    if (s.tipo === 'rincon') {
      // en el rincón (en el entreno, o si no hay sitio libre en la pantalla): asomada, que casi no tapa
      m.previa = 'vigilar';
      return [vigilar()];
    }
    if (m.descanso && !m.tranquila) return enElDescanso(s);
    const salto = m.tranquila ? null : planearSalto();
    // Donde no está cómoda (de pie taparía algo) no se queda: pasea o salta a otro sitio; y si se para, antes va a uno
    // libre de su superficie.
    const incomoda = !m.tranquila && !comodaEn(s, m.x);
    // y cuanto más rato lleva en la misma, más ganas de irse a otra (se aburre)
    const aburrida = Math.min(1, (m.t - m.llegada) / 20);
    const ganas = incomoda
      ? { quieto: 0.15, sentarse: 0.1, dormir: 0.05, pasear: 0.8, saltar: 4 * (1 + aburrida) }
      : { saltar: 1 + 2 * aburrida, pasear: 1 + 0.5 * aburrida };
    const aSitio = (acciones) => (incomoda && s.libres?.length ? [caminar(puntoEn(s, null, Infinity, true)), ...acciones] : acciones);
    // sus papeletas, con su carácter y con la hora (el ritmo del día, dia.js: de noche, más dormilona)
    const k = (n) => PESOS[n] * (m.pesos[n] ?? 1) * (ganas[n] ?? 1) * (m.ritmo.pesos[n] ?? 1);
    const zona = masDolorida(); // con agujetas, a veces se queja de esa zona; con las piernas cargadas, salta menos
    const opciones = [
      ['quieto', k('quieto')], ['pasear', k('pasear')], ['saltar', salto ? k('saltar') * (1 - 0.6 * dolor('piernas')) : 0],
      ['sentarse', k('sentarse') * (1 + 3 * m.sueno)], ['asomarse', k('asomarse')], ['desperezarse', k('desperezarse')],
      ['rascarse', k('rascarse')], ['mirarte', k('mirarte')], ['dormir', m.sueno > 0.7 ? k('dormir') : 0],
      ['agujetas', zona ? k('agujetas') * dolor(zona) : 0], ['presumir', m.trofeo ? k('presumir') : 0],
      ['bostezar', m.ritmo.pesos.bostezar ? k('bostezar') : 0],
    ].filter(([n, p]) => p > 0 && (n !== m.previa || n === 'quieto' || n === 'pasear') && (!m.tranquila || TRANQUILAS.has(n)));
    let r = azar() * opciones.reduce((a, [, p]) => a + p, 0);
    let elegida = opciones[0][0];
    for (const [n, p] of opciones) {
      if ((r -= p) <= 0) {
        elegida = n;
        break;
      }
    }
    m.previa = elegida;
    switch (elegida) {
      case 'pasear': return [caminar(puntoEn(s))];
      case 'saltar': return [caminar(salto.x0), saltar(salto.s1, salto.x1)];
      case 'sentarse': return aSitio(m.sueno > 0.55 ? [sentarse(), dormir(siesta())] : [sentarse()]);
      case 'dormir': return aSitio([sentarse(entre(3, 5)), dormir(siesta())]);
      case 'asomarse': {
        const x = limitar(m.x, s.x1 + 34, s.x2 - 34);
        return Math.abs(x - m.x) < 1 ? [asomarse()] : [caminar(x), asomarse()];
      }
      case 'desperezarse': case 'rascarse': case 'mirarte': case 'presumir': case 'bostezar': return [gesto(GESTOS[elegida])];
      case 'agujetas': return aSitio([gesto(GESTOS[REGIONES[zona].gesto])]);
      default: return aSitio([quieto()]);
    }
  }

  function empezar(accion) {
    if (m.ultimo) {
      m.trans = { pose: normalizar(m.ultimo.pose), raiz: m.ultimo.raiz, apoyo: m.ultimo.apoyo,
        ocultar: m.ultimo.ocultar, t: 0, dur: accion.transicion ?? TRANSICION, raizTambien: false };
    }
    m.accion = accion;
    accion.alEmpezar?.();
  }
  function siguiente() {
    if (m.accion?.hecha) m.accion.alTerminar?.();
    while (m.cola.length && m.cola[0].hecha) m.cola.shift(); // lo que ya no toca (un calentamiento, si se acabó el descanso)
    if (!m.cola.length) m.cola = autonoma ? elegir() : [quieto(1e9)];
    empezar(m.cola.shift());
  }
  // Te ve tras un rato sin verte (D-135): te saluda. Si llevas días sin entrenar («dormida»), estaba dormida: se
  // despierta de golpe y se alegra de verte, sin reproches. La primera vez por la mañana, o de noche («despacio»: el
  // ritmo del día, dia.js), estaba dormida y se despierta despacio: se levanta bostezando y se despereza (y, si llevas
  // días sin entrenar, luego se alegra). En su rincón del entreno o en el descanso, nada.
  function darBienvenida({ dormida, despacio }) {
    const s = sup();
    if (!s || s.tipo === 'rincon' || m.descanso) return;
    if (!dormida && !despacio) {
      reaccionar([gesto(GESTOS.saludo), gesto(GESTOS.mirarte)]);
      return;
    }
    const acciones = despacio
      ? [dormir(entre(2.5, 3.5), { alDespertar: null }), Object.assign(gesto(GESTOS.bostezar, { espejo: false }), { transicion: 0.9 }),
        gesto(GESTOS.desperezarse), ...(dormida ? [gesto(GESTOS.alegria)] : []), gesto(GESTOS.saludo, { espejo: false })]
      : [dormir(entre(2.5, 3.5), { alDespertar: null }), gesto(GESTOS.despertar), gesto(GESTOS.alegria),
        gesto(GESTOS.saludo, { espejo: false }), gesto(GESTOS.mirarte)];
    for (const a of acciones) a.reaccion = true;
    m.cola = acciones.slice(1);
    empezar(acciones[0]);
    m.trans = null; // ya estaba dormida: no se tumba delante de ti
  }

  // Lo que le pasa (una serie, un récord, un toque): lo hace ya o, si está a media cosa, justo después.
  function reaccionar(acciones) {
    m.sueno = 0;
    for (const a of acciones) a.reaccion = true;
    const ahora = m.accion;
    if (ahora && ahora.interrumpible === false && !ahora.hecha) {
      m.cola = [...m.cola.filter((a) => a.reaccion), ...acciones].slice(-3);
      return;
    }
    if (ahora?.dormida) acciones.unshift(Object.assign(gesto(GESTOS.despertar), { reaccion: true }));
    m.cola = acciones.slice(1);
    empezar(acciones[0]);
  }

  // ——— Cada fotograma ———
  function paso(dt) {
    m.t += dt;
    m.sueno = Math.min(1, m.sueno + dt / (m.suenoTras * (m.ritmo.sueno || 1))); // de noche, le entra antes (dia.js)
    for (const k in m.musc) {
      const s = m.musc[k];
      s.contr = 0;
      s.bombeo = Math.max(0, s.bombeo - dt / m.bombeoDura);
    }
    m.general = Math.max(0, m.general - dt / m.bombeoDura);
    m.destello = 0;
    ponerAlDiaDescanso(dt);
    if (!sup()) return null;
    // los toques: si ya no llega otro, lo que toca (uno suelto o dos seguidos)
    if (m.pendiente && m.t >= m.pendiente.cuando) {
      const n = m.pendiente.n;
      m.pendiente = null;
      if (!m.cogida) {
        if (n >= 2) reaccionar([gesto(GESTOS.saltoAlegria)]);
        else unToque();
      }
    }
    if (m.saludar && !m.cogida) {
      darBienvenida(m.saludar); // ya tiene dónde ponerse
      m.saludar = null;
    }
    if (m.perdida && !m.cogida) { // en tu dedo, da igual: al soltarla, cae donde toque
      // Su superficie se fue. Si estaba cerca, salta desde donde estaba hasta la nueva; si no (o si estaba sintiendo
      // algo), aparece allí fundiéndose. Lo que tenía pensado era para la otra.
      m.perdida = false;
      const desde = m.desde;
      m.desde = null;
      m.cola = m.cola.filter((a) => a.reaccion && !a.hecha);
      m.destinoSalto = null;
      if (m.accion && (!m.accion.reaccion || m.accion.hecha)) m.accion = null; // un salto a medias (iba a la otra) o algo que ya acabó
      const s = sup();
      if (desde && Number.isFinite(desde.y) && Math.abs(desde.y - s.y) < 700 && !m.accion) {
        m.cola.unshift(saltar(s, puntoEn(s, desde.x, 240), desde));
      } else {
        m.trans = null;
        alReubicar();
      }
    }
    if (!m.accion || m.accion.hecha) siguiente();
    const salida = m.accion.actualizar(dt);
    if (m.t - m.flash < 0.9) m.destello = Math.max(m.destello, 1 - (m.t - m.flash) / 0.9); // «¡recargada!»
    if (m.accion.nombre !== m.avisado) alCambiar((m.avisado = m.accion.nombre));

    // los ojos van rápido; la cabeza se ladea despacio hacia donde mira
    m.mirada.x = lerp(m.mirada.x, m.mirada.ox, Math.min(1, dt * 14));
    m.mirada.y = lerp(m.mirada.y, m.mirada.oy, Math.min(1, dt * 14));
    m.ladeo = lerp(m.ladeo, m.mirada.ox * 1.3, Math.min(1, dt * 4));

    // respirar
    const r = Math.sin((m.t * 2 * Math.PI) / (salida.respira || 3.4));
    let pose = { ...salida.pose };
    pose.hombros += 0.45 * r;
    if (salida.apoyo === 'pies') pose.estirar += 0.006 * r;
    pose.cabeza += m.ladeo;
    pose = normalizar(pose);

    // de la acción anterior a esta, sin saltos (la orientación, por el lado más corto)
    let u = 1;
    if (m.trans) {
      m.trans.t += dt;
      u = suave(m.trans.t / m.trans.dur);
      pose = mezclar(m.trans.pose, pose, u, true);
    }
    const cuerpo = cuerpoDe(salida.dormida ? r : r * 0.4);
    const cin = cinematica(pose, cuerpo, { espejo: !!salida.espejo, apoyo: salida.apoyo });
    let abajo;
    if (salida.apoyo === 'pies') abajo = cin.pies;
    else if (salida.apoyo === 'cadera') abajo = cin.p.pelvis[1] + cin.radios.tronco * 0.7;
    else abajo = cin.bajo;
    let raiz = [salida.x, salida.y - (pose.alto + abajo) * m.escala];
    let ocultar = salida.ocultar || null;
    if (m.trans) {
      const tr = m.trans;
      if (!tr.raizTambien && (tr.apoyo !== salida.apoyo || Math.hypot(raiz[0] - tr.raiz[0], raiz[1] - tr.raiz[1]) > 3)) {
        tr.raizTambien = true;
      }
      if (tr.raizTambien) raiz = [lerp(tr.raiz[0], raiz[0], u), lerp(tr.raiz[1], raiz[1], u)];
      if (!ocultar && tr.ocultar) ocultar = tr.ocultar;
      if (tr.t >= tr.dur) m.trans = null;
    }

    // parpadear (a veces, dos veces seguidas)
    const pp = m.parpadeo;
    if (m.t >= pp.proximo) {
      pp.t0 = m.t;
      pp.proximo = m.t + entre(1.8, 5.5);
      if (azar() < 0.22) pp.doble = m.t + 0.3;
    }
    if (pp.doble && m.t >= pp.doble) {
      pp.t0 = m.t;
      pp.doble = 0;
    }
    const fp = (m.t - pp.t0) / 0.16;
    let abiertos = fp >= 0 && fp <= 1 ? 1 - 0.9 * Math.sin(Math.PI * fp) : 1;
    if (salida.ojos !== undefined) abiertos = Math.min(abiertos, salida.ojos);

    // la cara que le surge (y se le va)
    let cara = null;
    if (m.cara) {
      const e = m.t - m.cara.t0;
      if (e > m.cara.dur) m.cara = null;
      else cara = { ...CARAS[m.cara.nombre], nombre: m.cara.nombre, luz: encendido(e, m.cara.dur) };
    }
    if (!cara && salida.cara) cara = { ...CARAS[salida.cara], nombre: salida.cara, luz: 1 };

    m.efectos = m.efectos.filter((e) => m.t - e.t0 < e.dur);

    // la sombra, en la superficie de debajo (también al saltar)
    const pies = raiz[1] + (pose.alto + abajo) * m.escala;
    let sombra = null;
    if (salida.sombra !== false) {
      const cx = salida.apoyo === 'tumbado' ? raiz[0] + ((cin.p.cabeza[0] + cin.p.tobilloD[0]) / 2) * m.escala : raiz[0];
      const s = debajo(cx, pies - 3);
      if (s) {
        const h = Math.max(0, s.y - pies);
        sombra = { x: cx, y: s.y, rx: (salida.apoyo === 'tumbado' ? 64 : 28) * m.escala * (1 - 0.5 * Math.min(1, h / 120)),
          fuerza: 1 - Math.min(1, h / 140) };
      }
    }

    const f = {
      t: m.t, cin, raiz, escala: m.escala, pose, apoyo: salida.apoyo, cuerpo, cara, abiertos,
      mirada: [m.mirada.x, m.mirada.y], efectos: m.efectos.map((e) => ({ ...e, edad: m.t - e.t0 })),
      ocultar, sombra, destello: m.destello, accion: m.accion.nombre, carga: m.carga, objeto: salida.objeto || null, cinta: m.cinta,
      coleta: m.coleta && m.sexo === 'ella',
    };
    m.ultimo = f;
    return f;
  }

  const api = {
    paso,
    // Acabar una serie de un grupo de la app («muscleGroup»).
    serie(grupo) {
      const g = GRUPOS[grupo];
      if (!g) return;
      bombear(g.musculos);
      reaccionar([gesto(GESTOS[g.gesto])]);
    },
    record() { reaccionar([gesto(GESTOS.record)]); },
    // Al terminar la sesión (D-135), lo celebra según cómo fue: con marcas nuevas, el récord y su trofeo; con todas las
    // series, «¡sesión completa!»; con casi todas (el 60 % o más), «¡bien hecho!»; con menos, «algo es algo». Sin
    // reproches.
    finSesion({ series = 0, plan = 0, marcas = 0 } = {}) {
      const hecho = plan > 0 ? series / plan : 1;
      if (marcas > 0) reaccionar([gesto(GESTOS.record), gesto(GESTOS.presumir)]);
      else if (hecho >= 1) reaccionar([gesto(GESTOS.sesionCompleta)]);
      else if (hecho >= 0.6) reaccionar([gesto(GESTOS.bienHecho)]);
      else reaccionar([gesto(GESTOS.algoEsAlgo)]);
    },
    // Vas a empezar a entrenar (abres un ejercicio sin sesión en marcha, D-135): calienta ese grupo (los tres
    // movimientos), como mucho una vez cada 10 min.
    calentarAntes(grupo) {
      if (m.t - m.calentado < CALENTAR_CADA || sup()?.tipo === 'rincon') return;
      m.calentado = m.t;
      reaccionar(calentar(grupo, () => m.cinta)); // en cuanto empiezas la sesión (ya lleva su cinta), deja de calentar
    },
    // Te ve tras un rato sin verte (D-135): «dormida», si llevas días sin entrenar; «despacio», si se despierta despacio
    // (la primera vez por la mañana, o de noche: dia.js). La bienvenida, en cuanto tenga dónde ponerse: darBienvenida().
    bienvenida({ dormida = false, despacio = false } = {}) { m.saludar = { dormida: Boolean(dormida), despacio: Boolean(despacio) }; },
    // El ritmo del día (D-135, la 6; dia.js: ritmoDe()): { sueno, siesta, pesos }; sin él, lo de siempre.
    get ritmo() { return m.ritmo; },
    set ritmo(r) { m.ritmo = r && r.pesos ? r : SIN_RITMO; },
    // Su trofeo (D-135): si hoy has batido una marca entrenando, lo lleva el resto del día.
    get trofeo() { return m.trofeo; },
    set trofeo(v) { m.trofeo = Boolean(v); },
    // Su cinta (D-135, la 4): la lleva mientras hay una sesión en marcha.
    get cinta() { return m.cinta; },
    set cinta(v) { m.cinta = Boolean(v); },
    // Su sexo (D-139): «ella», «el» o «neutro» (sin definir; también lo que no sea uno de esos). Solo cambia sus
    // proporciones (CUERPOS de esqueleto.js). Y «Ella», con su coleta (D-141; coleta = false la quita, para probar).
    get sexo() { return m.sexo; },
    set sexo(v) { m.sexo = SEXOS.includes(v) ? v : 'neutro'; },
    get coleta() { return m.coleta; },
    set coleta(v) { m.coleta = Boolean(v); },
    // Un toque en el escenario: si es en ella, reacciona (tocarla()); si no, mira hacia allí (y a veces se acerca).
    tocar(px, py) {
      if (!api.contiene(px, py)) {
        mirarPunto(px, py);
        const s = sup(), a = m.accion;
        if (a && a.nombre === 'Mira a su alrededor' && py < s.y && py > s.y - 90 && px > s.x1 && px < s.x2 && azar() < 0.5) {
          m.cola = [caminar(px)];
          empezar(m.cola.shift());
        }
        return false;
      }
      tocarla();
      return true;
    },
    // Un toque que ya se sabe que es en ella (el escenario lo miró al bajar el dedo): uno suelto, dos o tres seguidos…
    tocarla,
    // Cogerla (D-135, la 5): ¿se puede ahora? (en el rincón del entreno, no). coger(x, y): sube a tu dedo, con los pies
    // en (x, y), y dice si la ha cogido; llevar(x, y): adonde va tu dedo; soltar(x, y): cae en la superficie de debajo
    // (o en la más cercana), se sacude y sigue con lo suyo (y con lo que le haya pasado mientras la llevabas).
    puedeCoger() {
      const s = sup();
      return Boolean(m.ultimo && s && s.tipo !== 'rincon');
    },
    coger(px, py) {
      if (!Number.isFinite(px) || !Number.isFinite(py) || !api.puedeCoger()) return false;
      m.pendiente = null;
      m.rafaga = null;
      m.sueno = 0;
      m.destinoSalto = null;
      m.cogida = { x: px, y: py };
      m.cola = [];
      empezar(llevada());
      return true;
    },
    llevar(px, py) {
      if (!m.cogida || !Number.isFinite(px) || !Number.isFinite(py)) return;
      m.cogida.x = px;
      m.cogida.y = py;
    },
    soltar(px, py) {
      if (!m.cogida) return;
      const x = Number.isFinite(px) ? px : m.cogida.x, y = Number.isFinite(py) ? py : m.cogida.y;
      m.cogida = null;
      const pendientes = m.cola.filter((a) => a.reaccion && !a.hecha); // lo que le pasó mientras la llevabas
      const s = dondeCae(x, y);
      if (!s) {
        m.cola = pendientes;
        m.accion = null;
        return;
      }
      const x1 = s.x2 - s.x1 < 2 * MARGEN ? (s.x1 + s.x2) / 2 : limitar(x, s.x1 + MARGEN, s.x2 - MARGEN);
      m.cola = [gesto(GESTOS.sacudirse), ...pendientes];
      empezar(caer(s, x1, { x, y }));
    },
    // ¿La llevas en el dedo? ¿Y en el aire (en tu dedo o cayendo de él)? Entonces el escenario la pone por encima de todo.
    get cogida() { return Boolean(m.cogida); },
    get enElAire() { return Boolean(m.cogida || (m.accion?.cayendo && !m.accion.hecha)); },
    contiene(px, py) {
      const f = m.ultimo;
      if (!f) return false;
      if (f.ocultar && py > f.ocultar.y && px > f.ocultar.x1 && px < f.ocultar.x2) return false;
      const q = [(px - f.raiz[0]) / m.escala, (py - f.raiz[1]) / m.escala];
      if (Math.hypot(q[0] - f.cin.p.cabeza[0], q[1] - f.cin.p.cabeza[1]) < MEDIDAS.cabeza + 9) return true;
      return f.cin.partes.some((parte) => parte.segmentos.some(([a, b, r]) => distSeg(q, a, b) < r + 8));
    },
    // Para probar: hacer una cosa ya («dormir», «sentarse», «asomarse», «pasear», «saltar» o un gesto).
    hacer(nombre) {
      const s = sup();
      const otras = {
        dormir: () => [dormir(1e9)],
        sentarse: () => [sentarse(1e9)],
        asomarse: () => [asomarse()],
        calentar: () => [calentar('Pecho')],
        guardia: () => [enGuardia()],
        reloj: () => [mirarReloj()],
        pasear: () => [caminar(m.x < (s.x1 + s.x2) / 2 ? s.x2 : s.x1)],
        saltar: () => {
          const p = planearSalto();
          return p ? [caminar(p.x0), saltar(p.s1, p.x1)] : [quieto()];
        },
      };
      const [accion, grupo] = String(nombre).split(':');
      if (GESTOS[nombre]) reaccionar([gesto(GESTOS[nombre], { espejo: false })]);
      else if (accion === 'imitar' && IMITAR[grupo]) {
        m.cola = [imitar(grupo, 1e3)];
        empezar(m.cola.shift());
      } else if (otras[nombre]) {
        m.cola = otras[nombre]();
        empezar(m.cola.shift());
      }
    },
    reubicar() {
      const s = sup();
      if (s) m.x = limitar(m.x, s.x1 + MARGEN, s.x2 - MARGEN);
    },
    // Un gesto de gestos.js por su nombre («saludo», «mirarte»…), como reacción: ya, o justo después.
    hacerGesto(nombre) {
      if (GESTOS[nombre]) reaccionar([gesto(GESTOS[nombre])]);
    },
    // Mira hacia un punto (un toque que no es para ella), sin moverse.
    mirar(px, py) { mirarPunto(px, py); },
    // En el entreno: sin pasear ni saltar (TRANQUILAS).
    get tranquila() { return m.tranquila; },
    set tranquila(v) { m.tranquila = Boolean(v); },
    // Su carácter: un número por cada cosa de PESOS (1, lo de siempre; 2, el doble de papeletas).
    get pesos() { return m.pesos; },
    set pesos(v) { m.pesos = v || {}; },
    set suenoTras(v) { m.suenoTras = Math.max(5, Number(v) || SUENO_TRAS); },
    set bombeoDura(v) { m.bombeoDura = Math.max(1, Number(v) || BOMBEO_DURA); },
    // ¿Está tranquila (de pie mirando, sentada o dormida)? El escenario pinta entonces menos veces por segundo.
    get calma() { return Boolean(m.accion?.calma); },
    get dormida() { return Boolean(m.accion?.dormida); },
    get superficie() { return m.sup; },
    // Adónde salta (mientras salta), o null.
    get destino() { return m.destinoSalto; },
    // El descanso de la app ({ id, quedan, fraccion, pausa, grupoSiguiente }) o null.
    set descanso(d) { m.descanso = d || null; },
    get descanso() { return m.descanso; },
    // Su luz: 1, la de siempre; en el descanso, de 0,35 (recién acabada la serie) a 1,3 («recargada»).
    get carga() { return m.carga; },
    // ¿Está reaccionando a algo (una serie, un récord, un toque), o lo tiene pendiente?
    get reaccionando() { return Boolean((m.accion?.reaccion && !m.accion.hecha) || m.cola.some((a) => a.reaccion)); },
    // Dónde tiene la cabeza, en px del escenario (para apuntarle, o para poner algo junto a ella).
    get cabeza() {
      const f = m.ultimo;
      return f ? [f.raiz[0] + f.cin.p.cabeza[0] * m.escala, f.raiz[1] + f.cin.p.cabeza[1] * m.escala] : null;
    },
    get escala() { return m.escala; },
    set escala(v) { m.escala = v; },
    // La forma que se le ve (de 0, gordita, a 1, definida): la de fondo, más marcada con el bombeo general. Ponerla
    // cambia la de fondo.
    get forma() { return formaVisible(m.fondo, m.general); },
    set forma(v) { m.fondo = limitar(Number(v) || 0, 0, 1); },
    get fondo() { return m.fondo; },
    get general() { return m.general; },
    // Su cuerpo, de tus entrenos (forma.js: cuerpoDeTusEntrenos()): la forma de fondo, el bombeo general y, por
    // músculo, el bombeo y las agujetas. Lo que falte, igual que estaba.
    ponerCuerpo({ fondo, general, bombeo, agujetas } = {}) {
      if (Number.isFinite(fondo)) m.fondo = limitar(fondo, 0, 1);
      if (Number.isFinite(general)) m.general = limitar(general, 0, 1);
      for (const k in m.musc) {
        if (Number.isFinite(bombeo?.[k])) m.musc[k].bombeo = limitar(bombeo[k], 0, 1);
        if (Number.isFinite(agujetas?.[k])) m.musc[k].agujetas = limitar(agujetas[k], 0, 1);
      }
    },
    // Para mirarla: el bombeo y las agujetas de cada músculo, y la zona que más le duele.
    get musculos() { return Object.fromEntries(Object.entries(m.musc).map(([k, s]) => [k, { bombeo: s.bombeo, agujetas: s.agujetas }])); },
    get dolorida() { return masDolorida(); },
    get accion() { return m.accion?.nombre || ''; },
  };
  return api;
}
