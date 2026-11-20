// Cerebro de la mascota: qué hace en cada momento y cómo pasa de una cosa a otra.
// Vive sola sobre las superficies que le dan (el borde de arriba de cada tarjeta) y reacciona a lo que pasa:
// una serie acabada, un récord, un toque. No dibuja: cada paso devuelve un «fotograma» que pinta el traje.
// Nunca toca la app: solo mira las superficies.

import { POSE_BASE, MEDIDAS, mezclar, normalizar, cinematica, masBajo, lerp, limitar, suave, tramo } from './esqueleto.js';
import { GESTOS, GRUPOS, CARAS, MUSCULOS } from './gestos.js';

const MARGEN = 14;        // px que deja hasta el borde de una tarjeta
const VELOCIDAD = 34;     // px por segundo al pasear
const TRANSICION = 0.28;  // s para pasar de una acción a otra
const SUENO_TRAS = 50;    // s sin que le pase nada hasta tener sueño del todo
const BOMBEO_DURA = 150;  // s que tarda en irse el bombeo (en la app de verdad, unas horas)
const MEDIO_TUBO = 2.4;   // unidades: lo que sobresale el tubo por debajo de los pies

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
 * superficies(): [{ id, x1, x2, y }] en píxeles del escenario (el borde de arriba de cada tarjeta).
 * alCambiar(texto): lo que hace ahora, para enseñarlo.
 */
export function crearMascota({ superficies, escala = 0.55, azar = Math.random, alCambiar = () => {}, autonoma = true } = {}) {
  const entre = (a, b) => a + (b - a) * azar();
  const unoDe = (lista) => lista[Math.floor(azar() * lista.length)];

  const m = {
    t: 0, x: 0, sup: null, forma: 0.25, escala,
    sueno: 0, accion: null, cola: [], previa: null, avisado: '',
    musc: Object.fromEntries(Object.keys(MUSCULOS).map((k) => [k, { bombeo: 0, contr: 0 }])),
    cara: null,
    mirada: { x: 0, y: 0, ox: 0, oy: 0, hasta: 0 },
    ladeo: 0,
    parpadeo: { proximo: 1.2, t0: -9, doble: 0 },
    efectos: [],
    trans: null,
    ultimo: null,
    destello: 0,
    toques: [],
  };

  // ——— Dónde está ———
  const lista = () => superficies() || [];
  function sup() {
    const l = lista();
    let s = l.find((x) => x.id === m.sup);
    if (!s && l.length) {
      const orden = [...l].sort((a, b) => a.y - b.y);
      s = orden[Math.min(1, orden.length - 1)];
      m.sup = s.id;
      m.x = (s.x1 + s.x2) / 2;
    }
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
  function bombear(claves) {
    for (const k of claves) m.musc[k].bombeo = Math.min(1, m.musc[k].bombeo + 0.4);
  }

  // El cuerpo según la forma de fondo (gordito → definido) y cómo está cada músculo.
  function cuerpoDe(resp = 0) {
    const def = tramo(m.forma, 0.5, 1);    // definido: de la mitad para arriba
    const gord = tramo(m.forma, 0.45, 0.05); // gordito: de la mitad para abajo
    const bultos = {}, ver = {}, luz = {};
    for (const k in MUSCULOS) {
      const [a, b, c] = MUSCULOS[k], s = m.musc[k];
      const d = k.startsWith('abs') ? def * def : def;
      bultos[k] = a * d + b * s.bombeo + c * s.contr;
      ver[k] = Math.max(d, s.bombeo * 0.85, s.contr);
      luz[k] = s.contr;
    }
    for (const l of ['I', 'D']) bultos['deltoides' + l] = Math.max(bultos['hombros' + l], bultos['hombrosPost' + l]);
    return { anchoHombros: 8.5 + 3.5 * def, vientre: gord * (13 + 0.9 * resp), bultos, ver, luz, tubo: 4.6 + 1.1 * gord };
  }

  // ——— Las acciones ———
  // Cada una: { nombre, actualizar(dt) → salida, hecha, … }. La salida: la pose, en qué se apoya
  // («pies», «cadera» o «tumbado») y el punto del mundo donde se apoya (x, y), más lo que haga falta.

  function quieto(dur = entre(2, 5)) {
    const fase = entre(0, 6);
    return {
      nombre: 'Mira a su alrededor', t: 0,
      actualizar(dt) {
        this.t += dt;
        if (m.t > m.mirada.hasta) mirarAlAzar();
        const s = Math.sin(0.9 * m.t + fase);
        return { pose: { ...POSE_BASE, lumbar: 1.8 * s, musloI: 7 + 1.2 * s, musloD: 7 - 1.2 * s }, apoyo: 'pies', x: m.x, y: sup().y };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  function caminar(destino) {
    let v = 0, fase = 0;
    return {
      nombre: 'Pasea', t: 0,
      alEmpezar() {
        const s = sup();
        destino = limitar(destino, s.x1 + MARGEN, s.x2 - MARGEN);
      },
      actualizar(dt) {
        this.t += dt;
        const falta = destino - m.x, dir = Math.sign(falta) || 1;
        v = lerp(v, Math.min(VELOCIDAD, Math.abs(falta) * 3 + 5), Math.min(1, dt * 6));
        m.x += dir * Math.min(Math.abs(falta), v * dt);
        const ritmo = Math.min(1, v / VELOCIDAD);
        fase += dt * 2 * Math.PI * 1.25 * ritmo;
        const sn = Math.sin(fase);
        const levI = Math.max(0, sn) * ritmo, levD = Math.max(0, -sn) * ritmo;
        mirarCara(3.8 * dir, 0.8, 0.2);
        return {
          pose: {
            ...POSE_BASE,
            musloI: 6 + 12 * levI, rodillaI: -46 * levI, escPiernaI: 1 - 0.1 * levI,
            musloD: 6 + 12 * levD, rodillaD: -46 * levD, escPiernaD: 1 - 0.1 * levD,
            brazoI: 14 + 9 * sn * ritmo, codoI: -16, brazoD: 14 - 9 * sn * ritmo, codoD: -16,
            lumbar: 3.5 * dir * ritmo, giro: 2.2 * sn * ritmo, estirar: 0.012 * Math.abs(Math.cos(fase)) * ritmo,
          },
          apoyo: 'pies', x: m.x, y: sup().y,
        };
      },
      get hecha() { return Math.abs(destino - m.x) < 0.5; },
    };
  }

  // Salta de su tarjeta a la de arriba o a la de abajo, rodeándolas por un lado.
  function planearSalto() {
    const s0 = sup();
    if (!s0) return null;
    const orden = [...lista()].sort((a, b) => a.y - b.y);
    const i = orden.findIndex((s) => s.id === s0.id);
    const opciones = [];
    for (const s1 of [orden[i - 1], orden[i + 1]].filter(Boolean)) {
      const sube = s1.y < s0.y;
      const tapa = sube ? s1 : s0; // la tarjeta que hay que rodear
      for (const lado of [-1, 1]) {
        const borde = lado < 0 ? tapa.x1 : tapa.x2;
        const x0 = sube ? borde + lado * 22 : borde - lado * 14;
        const x1 = sube ? borde - lado * 24 : borde + lado * 30;
        if (x0 < s0.x1 + MARGEN || x0 > s0.x2 - MARGEN || x1 < s1.x1 + MARGEN || x1 > s1.x2 - MARGEN) continue;
        opciones.push({ x0, s1, x1 });
      }
    }
    return opciones.length ? unoDe(opciones) : null;
  }
  function saltar(destino, x1) {
    const PREP = 0.24, ATERRIZA = 0.3;
    let x0, y0, y1, cima, vuelo, llego = false;
    return {
      nombre: 'Salta a otra tarjeta', t: 0, interrumpible: false,
      alEmpezar() {
        x0 = m.x;
        y0 = sup().y;
        y1 = destino.y;
        this.nombre = y1 < y0 ? 'Salta a la tarjeta de arriba' : 'Baja de un salto';
        cima = Math.max(Math.min(y0, y1) - (y1 < y0 ? 26 : 16), 140 * m.escala); // que no se le salga la cabeza por arriba
        vuelo = 0.42 + Math.min(0.35, Math.abs(y0 - y1) / 600 + Math.abs(x1 - x0) / 900);
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const dir = Math.sign(x1 - x0) || 1;
        if (t < PREP) {
          const u = suave(t / PREP);
          mirarCara(3 * dir, y1 < y0 ? -2.6 : 2.6, 0.3);
          return {
            pose: { ...POSE_BASE, musloI: 7 + 23 * u, rodillaI: -58 * u, musloD: 7 + 23 * u, rodillaD: -58 * u,
              brazoI: 14 + 26 * u, brazoD: 14 + 26 * u, codoI: -30, codoD: -30, estirar: -0.04 * u },
            apoyo: 'pies', x: x0, y: y0,
          };
        }
        if (t < PREP + vuelo) {
          const u = (t - PREP) / vuelo, r = Math.sin(Math.PI * u);
          const y = lerp(y0, y1, u) - 4 * ((y0 + y1) / 2 - cima) * u * (1 - u);
          return {
            pose: { ...POSE_BASE, musloI: 8 + 14 * r, rodillaI: -95 * r, escMusloI: 1 - 0.3 * r, musloD: 5, rodillaD: -12 * r,
              brazoI: 60 + 90 * r, brazoD: 60 + 90 * r, codoI: 10, codoD: 10, estirar: 0.06 * (1 - r) }, // una rodilla arriba
            apoyo: 'pies', x: lerp(x0, x1, u), y,
          };
        }
        if (!llego) {
          llego = true;
          m.sup = destino.id;
          m.x = x1;
        }
        const k = Math.sin(Math.PI * Math.min(1, (t - PREP - vuelo) / ATERRIZA));
        return {
          pose: { ...POSE_BASE, musloI: 7 + 22 * k, rodillaI: -48 * k, musloD: 7 + 22 * k, rodillaD: -48 * k,
            brazoI: 14 + 30 * k, brazoD: 14 + 30 * k, estirar: -0.06 * k },
          apoyo: 'pies', x: x1, y: y1,
        };
      },
      get hecha() { return vuelo !== undefined && this.t >= PREP + vuelo + ATERRIZA; },
    };
  }

  function sentarse(dur = entre(6, 11)) {
    const fase = entre(0, 6);
    return {
      nombre: 'Se sienta en el borde', t: 0, transicion: 0.45,
      actualizar(dt) {
        this.t += dt;
        const modorra = m.sueno > 0.55 ? tramo(this.t, Math.min(dur * 0.35, 6), Math.min(dur, 12)) : 0;
        const col = Math.sin(this.t * 2.2 + fase) * (1 - modorra);
        if (modorra < 0.3 && m.t > m.mirada.hasta) mirarAlAzar();
        if (modorra >= 0.3) mirarCara(0, 2.4, 0.3);
        if (modorra > 0.5) this.nombre = 'Le entra sueño';
        return {
          pose: {
            ...POSE_BASE,
            musloI: 10, escMusloI: 0.3, rodillaI: -10 + 14 * col, musloD: 10, escMusloD: 0.3, rodillaD: -10 - 14 * col,
            brazoI: 34, codoI: -12, brazoD: 34, codoD: -12, hombros: 0.6 - modorra,
            cabeza: 10 * modorra * (0.55 + 0.45 * Math.sin(this.t * 1.4)),
          },
          apoyo: 'cadera', x: m.x, y: sup().y,
          ojos: modorra > 0.6 ? Math.max(0.12, 1 - (modorra - 0.6) * 2.2) : 1,
        };
      },
      get hecha() { return this.t >= dur; },
    };
  }

  // Duerme tumbada boca arriba, con las piernas cruzadas y una mano detrás de la cabeza.
  function dormir(dur = entre(12, 22)) {
    const espejo = azar() < 0.5;
    let proxZ = 1;
    return {
      nombre: 'Duerme', t: 0, transicion: 0.9, dormida: true,
      alEmpezar() {
        m.cara = null;
        const s = sup(), largo = 80 * m.escala, cola = 40 * m.escala; // hacia la cabeza y hacia los pies
        m.x = espejo ? limitar(m.x, s.x1 + largo, s.x2 - cola) : limitar(m.x, s.x1 + cola, s.x2 - largo);
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
            ...POSE_BASE, giro: 90, lumbar: -14, pecho: -2, cabeza: -6 + 1.2 * r,
            musloI: 60, rodillaI: -98, musloD: -50, rodillaD: 98,
            brazoI: 150, codoI: 70, brazoD: -10, codoD: 0,
          },
          apoyo: 'tumbado', x: m.x, y: sup().y, espejo, cara: 'dormida', respira: 4.6,
        };
      },
      get hecha() { return this.t >= dur; },
      alTerminar() {
        m.sueno = 0.12;
        m.cola.unshift(gesto(GESTOS.desperezarse));
      },
    };
  }

  // Se esconde detrás de su tarjeta, se asoma por el borde, mira a un lado y a otro, y sale de un salto.
  function asomarse() {
    let s, ojos, todo;
    return {
      nombre: 'Se esconde', t: 0,
      alEmpezar() {
        s = sup();
        const cin = cinematica(POSE_BASE, cuerpoDe(0));
        const pies = Math.max(cin.p.pieI[1], cin.p.pieD[1]) + MEDIO_TUBO;
        ojos = (pies - (cin.p.cabeza[1] - 1)) * m.escala;
        todo = (pies - (cin.p.cabeza[1] - MEDIDAS.cabeza - MEDIO_TUBO)) * m.escala + 4;
      },
      actualizar(dt) {
        const t = (this.t += dt);
        const asomado = ojos - 7 * m.escala; // los ojos, por encima del borde; las manos, agarradas a él
        let hundir = 0, pose = POSE_BASE, dx = 0;
        if (t < 0.3) {
          const u = suave(t / 0.3);
          pose = { ...POSE_BASE, musloI: 7 + 18 * u, rodillaI: -34 * u, musloD: 7 + 18 * u, rodillaD: -34 * u, estirar: -0.03 * u };
        } else if (t < 0.62) {
          hundir = todo * suave((t - 0.3) / 0.32);
        } else if (t < 1.6) {
          hundir = todo;
        } else if (t < 4.0) {
          hundir = lerp(todo, asomado, suave((t - 1.6) / 0.6));
          pose = { ...POSE_BASE, brazoI: 110, codoI: 105, brazoD: 110, codoD: 105 }; // las manos, a los lados de la cara
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
          pose = { ...POSE_BASE, brazoI: 14 + 120 * r, brazoD: 14 + 120 * r, codoI: 10, codoD: 10,
            musloI: 7 + 14 * r, rodillaI: -30 * r, musloD: 7 + 14 * r, rodillaD: -30 * r };
        }
        return {
          pose, apoyo: 'pies', x: m.x + dx, y: s.y + hundir,
          ocultar: { x1: s.x1, x2: s.x2, y: s.y }, sombra: hundir < 3,
        };
      },
      get hecha() { return this.t >= 4.42; },
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
        return { pose, apoyo: 'pies', x: m.x, y: sup().y, espejo };
      },
      get hecha() { return this.t >= def.dur; },
    };
  }

  // ——— Qué hacer ahora ———
  function elegir() {
    const s = sup();
    const salto = planearSalto();
    const opciones = [
      ['quieto', 3], ['pasear', 3.2], ['saltar', salto ? 1.8 : 0], ['sentarse', 1 + 3 * m.sueno],
      ['asomarse', 0.9], ['desperezarse', 0.45], ['rascarse', 0.45], ['mirarte', 0.7], ['dormir', m.sueno > 0.7 ? 3 : 0],
    ].filter(([n, p]) => p > 0 && (n !== m.previa || n === 'quieto' || n === 'pasear'));
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
      case 'pasear': return [caminar(entre(s.x1 + MARGEN, s.x2 - MARGEN))];
      case 'saltar': return [caminar(salto.x0), saltar(salto.s1, salto.x1)];
      case 'sentarse': return m.sueno > 0.55 ? [sentarse(), dormir()] : [sentarse()];
      case 'dormir': return [sentarse(entre(3, 5)), dormir()];
      case 'asomarse': {
        const x = limitar(m.x, s.x1 + 34, s.x2 - 34);
        return Math.abs(x - m.x) < 1 ? [asomarse()] : [caminar(x), asomarse()];
      }
      case 'desperezarse': case 'rascarse': case 'mirarte': return [gesto(GESTOS[elegida])];
      default: return [quieto()];
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
    if (!m.cola.length) m.cola = autonoma ? elegir() : [quieto(1e9)];
    empezar(m.cola.shift());
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
    m.sueno = Math.min(1, m.sueno + dt / SUENO_TRAS);
    for (const k in m.musc) {
      const s = m.musc[k];
      s.contr = 0;
      s.bombeo = Math.max(0, s.bombeo - dt / BOMBEO_DURA);
    }
    m.destello = 0;
    if (!sup()) return null;
    if (!m.accion || m.accion.hecha) siguiente();
    const salida = m.accion.actualizar(dt);
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

    // de la acción anterior a esta, sin saltos
    let u = 1;
    if (m.trans) {
      m.trans.t += dt;
      u = suave(m.trans.t / m.trans.dur);
      pose = mezclar(m.trans.pose, pose, u);
    }
    const cuerpo = cuerpoDe(salida.dormida ? r : r * 0.4);
    const cin = cinematica(pose, cuerpo, { espejo: !!salida.espejo, apoyo: salida.apoyo });
    let abajo;
    if (salida.apoyo === 'pies') abajo = Math.max(cin.p.pieI[1], cin.p.pieD[1]) + MEDIO_TUBO;
    else if (salida.apoyo === 'cadera') abajo = 3;
    else abajo = masBajo(cin) + MEDIO_TUBO;
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
      const cx = salida.apoyo === 'tumbado' ? raiz[0] + ((cin.p.cabeza[0] + cin.p.pieD[0]) / 2) * m.escala : raiz[0];
      const s = debajo(cx, pies - 3);
      if (s) {
        const h = Math.max(0, s.y - pies);
        sombra = { x: cx, y: s.y, rx: (salida.apoyo === 'tumbado' ? 62 : 26) * m.escala * (1 - 0.5 * Math.min(1, h / 120)),
          fuerza: 1 - Math.min(1, h / 140) };
      }
    }

    const f = {
      t: m.t, cin, raiz, escala: m.escala, pose, apoyo: salida.apoyo, cuerpo, cara, abiertos,
      mirada: [m.mirada.x, m.mirada.y], efectos: m.efectos.map((e) => ({ ...e, edad: m.t - e.t0 })),
      ocultar, sombra, destello: m.destello, accion: m.accion.nombre,
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
    // Un toque en el escenario: si es en ella, reacciona; si no, mira hacia allí (y a veces se acerca).
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
      m.toques = m.toques.filter((t) => m.t - t < 3);
      m.toques.push(m.t);
      if (m.accion?.dormida) reaccionar([gesto(GESTOS.saludo)]);
      else if (m.toques.length >= 2) reaccionar([gesto(GESTOS.cosquillas)]);
      else reaccionar([gesto(GESTOS.susto), gesto(GESTOS.saludo)]);
      return true;
    },
    contiene(px, py) {
      const f = m.ultimo;
      if (!f) return false;
      if (f.ocultar && py > f.ocultar.y && px > f.ocultar.x1 && px < f.ocultar.x2) return false;
      const P = f.cin.p, q = [(px - f.raiz[0]) / m.escala, (py - f.raiz[1]) / m.escala];
      if (Math.hypot(q[0] - P.cabeza[0], q[1] - P.cabeza[1]) < MEDIDAS.cabeza + 10) return true;
      const tramos = [['pelvis', 'cuello'], ['hombroI', 'codoI'], ['codoI', 'manoI'], ['hombroD', 'codoD'], ['codoD', 'manoD'],
        ['caderaI', 'rodillaI'], ['rodillaI', 'pieI'], ['caderaD', 'rodillaD'], ['rodillaD', 'pieD']];
      return tramos.some(([a, b]) => distSeg(q, P[a], P[b]) < 12);
    },
    // Para probar: hacer una cosa ya («dormir», «sentarse», «asomarse», «pasear», «saltar» o un gesto).
    hacer(nombre) {
      const s = sup();
      const otras = {
        dormir: () => [dormir(1e9)],
        sentarse: () => [sentarse(1e9)],
        asomarse: () => [asomarse()],
        pasear: () => [caminar(m.x < (s.x1 + s.x2) / 2 ? s.x2 : s.x1)],
        saltar: () => {
          const p = planearSalto();
          return p ? [caminar(p.x0), saltar(p.s1, p.x1)] : [quieto()];
        },
      };
      if (GESTOS[nombre]) reaccionar([gesto(GESTOS[nombre], { espejo: false })]);
      else if (otras[nombre]) {
        m.cola = otras[nombre]();
        empezar(m.cola.shift());
      }
    },
    reubicar() {
      const s = sup();
      if (s) m.x = limitar(m.x, s.x1 + MARGEN, s.x2 - MARGEN);
    },
    // Dónde tiene la cabeza, en px del escenario (para apuntarle, o para poner algo junto a ella).
    get cabeza() {
      const f = m.ultimo;
      return f ? [f.raiz[0] + f.cin.p.cabeza[0] * m.escala, f.raiz[1] + f.cin.p.cabeza[1] * m.escala] : null;
    },
    get escala() { return m.escala; },
    set escala(v) { m.escala = v; },
    get forma() { return m.forma; },
    set forma(v) { m.forma = limitar(v, 0, 1); },
    get accion() { return m.accion?.nombre || ''; },
  };
  return api;
}
