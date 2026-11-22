// Traje de neón con volumen (D-130), con un cuerpo de verdad (D-138): un cuerpo de luz, con su halo; la cabeza, una
// bola con la cara del boceto del globo (dos puntitos por ojos; las cejas y la boca se encienden al expresar algo y se
// apagan).
// Pinta en un <canvas> los volúmenes que le da el esqueleto, por capas: lo de detrás, primero (y algo más oscuro). Cada
// capa es una sola silueta (capasDe()): el tronco, con hombros, cuello, cintura y cadera, y lo que está a su altura (de
// pie, las piernas); brazos y piernas, más gruesos junto al cuerpo, con manos de manopla y pies redondeados; y lo que
// queda delante sale del cuerpo sin costura.
// Camino «pulido» (D-139 y la pasada de estética): el mismo cuerpo por capas, acabado.
//  · Uniones de verdad: en el cuello, los hombros, la cintura, las axilas, la ingle, los codos y las rodillas, un relleno
//    de unión (filete()) con una curva tangente a los dos tramos, sin muescas.
//  · El contorno, con jerarquía: el de fuera, de toda la figura, más grueso abajo y a la derecha (la sombra) y más fino
//    y claro hacia la luz; el de dentro (entre capas), fino y más suave.
//  · El neón: entre el contorno y el cuerpo, una línea de luz que lo recorre (más viva arriba a la izquierda, apagada
//    en la cadera); en la cabeza, un aro de luz y un brillo fino.
//  · El volumen: cada tubo, sombreado a lo ancho; el tronco, con su luz de bola; los músculos, un bulto sombreado; el
//    que siente se enciende por dentro (como mucho 3 a la vez), con algo más de halo.
// Una sola luz, de arriba a la izquierda, para todo, sobre un marco fijo (no cambia al subir los brazos).
// No decide nada: otro estilo sería otro traje como este.
// En la app (D-133), además: el color de su luz (LUCES, a elegir en su página de Ajustes), un lienzo pequeño que va
// con ella («origen» de dibujar(); así se borra y se pinta poco) y la franja de la pantalla donde se ve («recorte»).

// Cada luz, en claro y en oscuro: el halo, el borde oscuro del tubo, el cuerpo (y lo de detrás, «lejos»), el brillo,
// el músculo encendido («vivo»), la tinta de la cara, los detalles, el rubor, la sombra y el esqueleto (para probar).
function luzDe({ halo, borde, bordeOscuro, cuerpo, lejos, vivo, vivoOscuro, tinta, detalle, rubor, sombra, sombraOscura }) {
  const base = { halo, cuerpo, lejos, tinta, brillo0: 'rgba(240, 253, 244, 0)' };
  return {
    // en claro, más halo y una sombra oscura (sobre el blanco, la de color apenas se veía; D-134)
    claro: { ...base, halo1: 0.2, halo2: 0.09, borde, brillo: 'rgba(240, 253, 244, 0.9)', vivo, detalle: `rgba(${detalle}, 0.5)`,
      rubor: rubor[0], sombra: 'rgba(15, 23, 42, 0.28)', sombra0: 'rgba(15, 23, 42, 0)', hueso: '#334155' },
    oscuro: { ...base, halo1: 0.3, halo2: 0.14, borde: bordeOscuro, brillo: 'rgba(240, 253, 244, 0.85)', vivo: vivoOscuro,
      detalle: `rgba(${detalle}, 0.55)`, rubor: rubor[1], sombra: `rgba(${sombraOscura}, 0.45)`, sombra0: `rgba(${sombraOscura}, 0)`,
      hueso: '#e2e8f0' },
  };
}
export const LUCES = {
  verde: luzDe({ halo: '#22c55e', borde: '#166534', bordeOscuro: '#15803d', cuerpo: '#22c55e', lejos: '#1b9e4b', vivo: '#bbf7d0',
    vivoOscuro: '#ecfccb', tinta: '#052e16', detalle: '5, 46, 22', rubor: ['rgba(244, 114, 182, 0.6)', 'rgba(249, 168, 212, 0.65)'],
    sombra: '22, 163, 74', sombraOscura: '34, 197, 94' }),
  cian: luzDe({ halo: '#22d3ee', borde: '#0e7490', bordeOscuro: '#0891b2', cuerpo: '#22d3ee', lejos: '#1aa9bf', vivo: '#cffafe',
    vivoOscuro: '#ecfeff', tinta: '#083344', detalle: '8, 51, 68', rubor: ['rgba(244, 114, 182, 0.6)', 'rgba(249, 168, 212, 0.65)'],
    sombra: '8, 145, 178', sombraOscura: '34, 211, 238' }),
  rosa: luzDe({ halo: '#f472b6', borde: '#9d174d', bordeOscuro: '#be185d', cuerpo: '#f472b6', lejos: '#d65a9b', vivo: '#fce7f3',
    vivoOscuro: '#fdf2f8', tinta: '#500724', detalle: '80, 7, 36', rubor: ['rgba(190, 24, 93, 0.5)', 'rgba(190, 24, 93, 0.55)'],
    sombra: '219, 39, 119', sombraOscura: '244, 114, 182' }),
  ambar: luzDe({ halo: '#fbbf24', borde: '#92400e', bordeOscuro: '#b45309', cuerpo: '#fbbf24', lejos: '#d9a11c', vivo: '#fef3c7',
    vivoOscuro: '#fffbeb', tinta: '#451a03', detalle: '69, 26, 3', rubor: ['rgba(244, 114, 182, 0.6)', 'rgba(249, 168, 212, 0.65)'],
    sombra: '217, 119, 6', sombraOscura: '251, 191, 36' }),
  violeta: luzDe({ halo: '#a78bfa', borde: '#5b21b6', bordeOscuro: '#6d28d9', cuerpo: '#a78bfa', lejos: '#8c70e0', vivo: '#ede9fe',
    vivoOscuro: '#f5f3ff', tinta: '#2e1065', detalle: '46, 16, 101', rubor: ['rgba(244, 114, 182, 0.6)', 'rgba(249, 168, 212, 0.65)'],
    sombra: '124, 58, 237', sombraOscura: '167, 139, 250' }),
};
const TAU = Math.PI * 2;
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// Los grosores, en unidades (a escala 1; por debajo de 0,75, algo más gruesos): el contorno de fuera (con su sesgo
// hacia abajo a la derecha: así es más fino hacia la luz y más grueso en la sombra), el de dentro, entre capas, y la
// línea de neón, entre el contorno y el cuerpo.
const GROSOR = { fuera: 1.45, sesgo: [0.36, 0.48], dentro: 0.6, neon: 0.65 };
const LUZ = [-0.6, -0.8]; // hacia dónde está la luz (arriba a la izquierda)
// Un cuerpo de verdad (D-138): cuánto engorda o adelgaza cada tramo en su raíz y en su punta, por su radio en el
// esqueleto: más gruesos junto al cuerpo y más finos hacia la muñeca y el tobillo.
const AFINAR = {
  brazo: [[1.2, 0.98], [1.0, 0.8]], // brazo y antebrazo
  pierna: [[1.24, 0.96], [0.98, 0.74]], // muslo y pierna (el pie, aparte: PIE)
};
// La mano, una manopla: un óvalo a lo largo del antebrazo, más ancho que la muñeca y
// algo grande, que le da encanto (por el radio del brazo).
const MANO = { largo: 1.42, ancho: 1.2, avance: 1.4 };
// El pie, una zapatilla pequeña y redondeada: un elipsoide de largo, ancho y alto, adelantado desde el tobillo, con la
// suela en el suelo.
const PIE = { largo: 6, ancho: 4.4, alto: 2.6, avance: 2.7, suela: 3.6 };
const HALO_RES = 0.5; // la resolución del halo, por la del lienzo: es un resplandor, y así cuesta mucho menos
const HALO_ANCHO_RES = 0.25; // y la del halo ancho, aún menos: al ampliarlo, se difumina solo
// Su luz: el cuerpo, un degradado de arriba a la izquierda (0) a abajo a la derecha (1) de un marco fijo, con su color
// mezclado hacia el blanco (+) o hacia el negro (−); la línea de neón, del centro de la cadera (apagada) hacia arriba a
// la izquierda (viva); y la de la cabeza, de arriba a la izquierda a abajo a la derecha.
const TONOS = {
  cuerpo: [[0, 0.2], [0.22, 0.06], [0.55, -0.05], [1, -0.24]],
  neon: { claro: [[0, 0.03], [0.4, 0.22], [1, 0.5]], oscuro: [[0, 0.1], [0.4, 0.34], [1, 0.64]] },
  neonCabeza: { claro: [[0, 0.62], [0.5, 0.36], [1, 0.1]], oscuro: [[0, 0.7], [0.5, 0.46], [1, 0.22]] },
};
// Los colores (#rrggbb o rgb(r, g, b)): en números, mezclados hacia el blanco (k > 0) o el negro (k < 0), entre sí y con
// su transparencia; todo guardado, que se pide en cada fotograma.
const rgbs = new Map();
function rgbDe(color) {
  let v = rgbs.get(color);
  if (!v) {
    v = color[0] === '#' ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) : color.match(/[\d.]+/g).slice(0, 3).map(Number);
    rgbs.set(color, v);
  }
  return v;
}
const colores = new Map();
function guardado(clave, hacer) {
  let v = colores.get(clave);
  if (v === undefined) {
    v = hacer();
    colores.set(clave, v);
  }
  return v;
}
function tono(color, k) {
  if (!k) return color;
  return guardado(`t${color}${k}`, () => {
    const hacia = k > 0 ? 255 : 0, t = Math.abs(k);
    return `rgb(${rgbDe(color).map((x) => Math.round(x + (hacia - x) * t)).join(', ')})`;
  });
}
function mezclaColor(a, b, t) {
  return guardado(`m${a}${b}${t}`, () => {
    const x = rgbDe(a), y = rgbDe(b);
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(', ')})`;
  });
}
function rgba(color, a) {
  const q = Math.round(lim(a, 0, 1) * 100) / 100;
  return guardado(`a${color}${q}`, () => `rgba(${rgbDe(color).join(', ')}, ${q})`);
}
const RAIZ = 0.42; // lo de arriba del brazo o del muslo que va con el tronco cuando la parte queda delante
const HISTERESIS = 1; // unidades de más para cambiar de capa (así, en el límite, no salta de una a otra)

// ——— Uniones de verdad ———
// Dos tramos { a, b, r1, r2 } que salen de una misma articulación (o casi): si entre los dos queda una muesca (el
// borde de cada uno, del lado del otro, se cruzan cerca de su arranque), un relleno con la curva tangente a los dos
// bordes, de largo «L» a cada lado. Para engordarlo (el borde, el halo…) se mueven sus bordes (trazado()).
function bordeHacia(T, hacia) {
  const dx = T.b[0] - T.a[0], dy = T.b[1] - T.a[1], d = Math.hypot(dx, dy);
  if (d <= Math.abs(T.r1 - T.r2) + 0.5) return null;
  const ang = Math.atan2(dy, dx), g = Math.acos((T.r1 - T.r2) / d);
  let mejor = null;
  for (const s of [1, -1]) {
    const n = [Math.cos(ang + s * g), Math.sin(ang + s * g)];
    const k = n[0] * (hacia[0] - T.a[0]) + n[1] * (hacia[1] - T.a[1]);
    if (!mejor || k > mejor.k) mejor = { k, n };
  }
  const n = mejor.n, p = [T.a[0] + T.r1 * n[0], T.a[1] + T.r1 * n[1]], q = [T.b[0] + T.r2 * n[0], T.b[1] + T.r2 * n[1]];
  const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
  return { p, n, e: [(q[0] - p[0]) / l, (q[1] - p[1]) / l], l };
}
function filete(T1, T2, L, minimo = 0.12) {
  const b1 = bordeHacia(T1, T2.b), b2 = bordeHacia(T2, T1.b);
  if (!b1 || !b2) return null;
  const den = b1.e[0] * b2.e[1] - b1.e[1] * b2.e[0];
  if (Math.abs(den) < minimo) return null; // casi paralelos: no hay muesca (o tan poca que no se ve)
  const wx = b2.p[0] - b1.p[0], wy = b2.p[1] - b1.p[1];
  const t1 = (wx * b2.e[1] - wy * b2.e[0]) / den, t2 = (wx * b1.e[1] - wy * b1.e[0]) / den;
  if (t1 < -2.5 || t2 < -2.5 || t1 > 0.6 * b1.l || t2 > 0.6 * b2.l) return null;
  // una muesca de verdad: cada borde se va hacia el lado de fuera del otro
  if (b1.n[0] * b2.e[0] + b1.n[1] * b2.e[1] <= 0.05 || b2.n[0] * b1.e[0] + b2.n[1] * b1.e[1] <= 0.05) return null;
  const l = Math.min(L, 0.85 * b1.l - t1, 0.85 * b2.l - t2);
  if (l < 0.5) return null;
  const C = [b1.p[0] + b1.e[0] * t1, b1.p[1] + b1.e[1] * t1];
  let P1 = [C[0] + b1.e[0] * l, C[1] + b1.e[1] * l], P2 = [C[0] + b2.e[0] * l, C[1] + b2.e[1] * l], n1 = b1.n, n2 = b2.n;
  // en el mismo sentido que todo lo demás (así, si se solapa con otra forma, sigue dentro)
  if ((P1[0] - C[0]) * (P2[1] - C[1]) - (P1[1] - C[1]) * (P2[0] - C[0]) < 0) [P1, P2, n1, n2] = [P2, P1, n2, n1];
  return { f: true, C, P1, P2, n1, n2 };
}
const invertir = (T) => ({ a: T.b, b: T.a, r1: T.r2, r2: T.r1 });

export function crearTrajeNeon(lienzo) {
  const real = lienzo.getContext('2d');
  let ctx = real; // donde se pinta (a medio brillo, el lienzo de la figura, que luego se pasa entero)
  const halo = document.createElement('canvas'); // el halo se pinta aparte para que no se acumule donde se cruzan
  const hctx = halo.getContext('2d');
  const haloAncho = document.createElement('canvas'); // y el halo ancho, aún más pequeño
  const actx = haloAncho.getContext('2d');
  const capa = document.createElement('canvas'); // y a medio brillo, toda la figura, que luego se pasa entera
  const cctx = capa.getContext('2d');
  let ancho = 0, alto = 0, dpr = 1, huesos = false, base = 1;
  let tema = 'claro', luz = 'verde', col = LUCES.verde.claro;
  let ox = 0, oy = 0, recorte = null; // dónde cae el lienzo (px del escenario) y la franja donde se ve
  let brillo = 1; // cuánto brilla su halo (su página de Ajustes: suave, normal o intenso)
  let memoria = new Map(), tMemoria = -1; // en qué capa iba cada parte en el fotograma anterior (HISTERESIS)

  function ovalo(c, m, extra) {
    c.beginPath();
    c.ellipse(m.c[0], m.c[1], Math.max(0.1, m.rx + extra), Math.max(0.1, m.ry + extra), m.rot, 0, TAU);
    c.fill();
  }
  function disco(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, Math.max(0.1, r), 0, TAU);
    c.fill();
  }
  // Las formas del cuerpo, engordadas «extra» unidades, todas en un solo trazado (todas giran en el mismo sentido, así
  // que donde se solapan siguen dentro: es su unión), para rellenarlo de una vez o para recortar con él. Cada forma:
  // { c, r } (un disco), { a, b, r1, r2 } (un tramo que se estrecha: un círculo de radio r1 en a, otro de radio r2 en b y
  // lo que hay entre los dos), { m } (una mancha: un músculo, la barriga, la mano, el pie) o { f } (el relleno de una
  // unión, filete()). Un tramo con «sinTapa» acaba en a con un corte recto, sin su media luna (D-139: la raíz de una
  // pierna que va delante, sin un arco de borde en la ingle); si se ve de punta (hacia nosotros), no se pinta.
  function rellenar(c, lista, extra) {
    trazado(c, lista, extra);
    c.fill();
  }
  function trazado(c, lista, extra, sinFiletes = false) {
    c.beginPath();
    for (const s of lista) {
      if (s.f) {
        if (sinFiletes) continue; // el halo, sin uniones ni músculos (no se notan en un resplandor)
        const k = extra / Math.max(0.3, 1 + s.n1[0] * s.n2[0] + s.n1[1] * s.n2[1]);
        const C = [s.C[0] + (s.n1[0] + s.n2[0]) * k, s.C[1] + (s.n1[1] + s.n2[1]) * k];
        c.moveTo(C[0], C[1]);
        c.lineTo(s.P1[0] + s.n1[0] * extra, s.P1[1] + s.n1[1] * extra);
        c.quadraticCurveTo(C[0], C[1], s.P2[0] + s.n2[0] * extra, s.P2[1] + s.n2[1] * extra);
      } else if (s.m) {
        if (sinFiletes && !s.m.bulto && !s.m.liso) continue;
        const m = s.m, rx = Math.max(0.1, m.rx + extra), ry = Math.max(0.1, m.ry + extra);
        c.moveTo(m.c[0] + rx * Math.cos(m.rot), m.c[1] + rx * Math.sin(m.rot));
        c.ellipse(m.c[0], m.c[1], rx, ry, m.rot, 0, TAU);
      } else if (s.c) {
        const r = Math.max(0.1, s.r + extra);
        c.moveTo(s.c[0] + r, s.c[1]);
        c.arc(s.c[0], s.c[1], r, 0, TAU);
      } else {
        const r1 = Math.max(0.1, s.r1 + extra), r2 = Math.max(0.1, s.r2 + extra);
        const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], d = Math.hypot(dx, dy);
        if (s.sinTapa) {
          if (d <= Math.abs(r1 - r2) + 0.5) continue;
          const ang = Math.atan2(dy, dx), g = Math.acos((r1 - r2) / d);
          c.moveTo(s.a[0] + r1 * Math.cos(ang + g), s.a[1] + r1 * Math.sin(ang + g));
          c.lineTo(s.a[0] + r1 * Math.cos(ang - g), s.a[1] + r1 * Math.sin(ang - g));
          c.arc(s.b[0], s.b[1], r2, ang - g, ang + g);
        } else if (d <= Math.abs(r1 - r2) + 1e-3) {
          const [q, r] = r1 >= r2 ? [s.a, r1] : [s.b, r2];
          c.moveTo(q[0] + r, q[1]);
          c.arc(q[0], q[1], r, 0, TAU);
        } else {
          const ang = Math.atan2(dy, dx), g = Math.acos((r1 - r2) / d);
          c.moveTo(s.a[0] + r1 * Math.cos(ang + g), s.a[1] + r1 * Math.sin(ang + g));
          c.arc(s.a[0], s.a[1], r1, ang + g, ang + TAU - g);
          c.arc(s.b[0], s.b[1], r2, ang - g, ang + g);
        }
      }
      c.closePath();
    }
  }

  // ——— Un cuerpo de verdad (D-138), acabado ———
  // El tronco: la espalda (de algo por debajo del cuello a la cintura: así se ve el cuello), los hombros, que caen del
  // arranque del cuello (el trapecio, de cada lado, más fino que antes), los costados (de cada hombro a la cintura, más
  // estrecha, y de ella a la cadera), la pelvis, el cuello y sus manchas (el pecho, la barriga…); y las uniones del
  // cuello con los hombros y de la cintura. Visto de lado, los hombros y la cadera se juntan solos (el esqueleto ya los
  // gira).
  // D-139: sin la barra de la cadera (asomaba redonda entre los muslos): la pelvis es lisa, una U invertida; por
  // abajo la cierran las raíces de las piernas, que se juntan en la ingle, y la cadera de cada lado acaba algo más fina
  // que el muslo (así sigue en él, sin un bulto redondo). La cintura, según su sexo («cintura»).
  function troncoDe(f, tronco) {
    const p = f.cin.p;
    const [[, , rT], [a0, b0, rP], [, , rH]] = tronco.segmentos;
    const ci = tronco.cintura || 1, rCad = f.cin.radios.pierna * (tronco.caderaR || 1.1);
    const dx = p.lumbar[0] - p.cuello[0], dy = p.lumbar[1] - p.cuello[1], dl = Math.hypot(dx, dy) || 1;
    const bajo = (k) => [p.cuello[0] + (dx / dl) * k, p.cuello[1] + (dy / dl) * k]; // bajando por la espalda
    const espalda = { a: bajo(4.2), b: p.cintura, r1: rT * 0.88, r2: rT * 0.94 * ci };
    const cuello = { a: bajo(2), b: mezcla(p.cuello, p.cabeza, 0.55), r1: rT * 0.6, r2: rT * 0.5 };
    const formas = [espalda, { a: a0, b: b0, r1: rP, r2: rP }, cuello];
    const uniones = [];
    for (const l of ['I', 'D']) {
      const w = [p.cintura[0] + (p['cadera' + l][0] - p.pelvis[0]) * 0.7 * ci, p.cintura[1] + (p['cadera' + l][1] - p.pelvis[1]) * 0.7 * ci];
      const trapecio = { a: bajo(2.4), b: p['hombro' + l], r1: rT * 0.5, r2: rH * 0.92 }; // el hombro, que cae del cuello
      const costado = { a: p['hombro' + l], b: w, r1: rH * 0.95, r2: rT * 0.62 * ci };   // el costado, hasta la cintura
      const cadera = { a: w, b: p['cadera' + l], r1: rT * 0.62 * ci, r2: rCad };          // y hasta la cadera
      formas.push(trapecio, costado, cadera);
      uniones.push(filete(cuello, trapecio, 2.4), filete(invertir(costado), cadera, 4.5));
    }
    for (const u of uniones) if (u) formas.push(u);
    for (const m of tronco.manchas) if (!m.detras) formas.push({ m });
    return { formas, costados: [formas[4], formas[7]] };
  }
  // La mano, una manopla (MANO): a lo largo del antebrazo (de punta, más redonda).
  function manoDe(parte) {
    const [[, E, r0], [, M]] = parte.segmentos;
    let ux = M[0] - E[0], uy = M[1] - E[1];
    const d = Math.hypot(ux, uy);
    if (d < 1e-3) [ux, uy] = [0, 1];
    else [ux, uy] = [ux / d, uy / d];
    const k = lim(d / 15, 0, 1); // cuánto se ve el antebrazo de largo
    const largo = r0 * (MANO.ancho + (MANO.largo - MANO.ancho) * k), anchoM = r0 * MANO.ancho;
    const c = [M[0] + ux * MANO.avance * k, M[1] + uy * MANO.avance * k];
    const formas = [{ m: { c, rx: largo, ry: anchoM, rot: Math.atan2(uy, ux), musculos: [], bulto: true } }];
    return formas;
  }
  // El pie (PIE): un elipsoide a lo largo del pie, con su ancho de lado a lado y su alto, visto desde la pantalla: de
  // frente, un óvalo achatado; de lado, una zapatilla. Con la suela en el suelo.
  function pieDe(parte) {
    const K = parte.segmentos[1][0], A = parte.segmentos[1][1], P = parte.segmentos[2][1];
    const k = 0.88 + 0.12 * (parte.segmentos[0][2] / 4.7);
    const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
    const uni = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cruz = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const dF = uni(sub(P, A));
    let arriba = uni(sub(K, A)), lado = cruz(dF, arriba);
    lado = Math.hypot(...lado) < 0.2 ? [1, 0, 0] : uni(lado);
    arriba = cruz(lado, dF);
    const bajar = PIE.suela - PIE.alto * k;
    const c = [A[0] + dF[0] * PIE.avance * k - arriba[0] * bajar, A[1] + dF[1] * PIE.avance * k - arriba[1] * bajar];
    let sxx = 0, sxy = 0, syy = 0;
    for (const [v, r] of [[dF, PIE.largo * k], [lado, PIE.ancho * k], [arriba, PIE.alto * k]]) {
      const x = v[0] * r, y = v[1] * r;
      sxx += x * x; sxy += x * y; syy += y * y;
    }
    const tr = (sxx + syy) / 2, de = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    return { m: { c, rx: Math.sqrt(tr + de), ry: Math.sqrt(Math.max(0.5, tr - de)), rot: 0.5 * Math.atan2(2 * sxy, sxx - syy),
      musculos: [], bulto: true } };
  }
  // Un brazo o una pierna: cada tramo, más grueso en la raíz que en la punta, con su mano o su pie, sus músculos y la
  // unión del codo o la rodilla. Si queda delante del tronco, va en su propia capa, pero su raíz (lo de arriba del
  // primer tramo y el deltoides) va también con el tronco y su borde empieza más abajo: así sale del cuerpo sin
  // costura y, más abajo, se ve delante.
  function extremidad(parte) {
    const brazo = parte.nombre.startsWith('brazo');
    const k = brazo ? AFINAR.brazo : AFINAR.pierna;
    const tramos = parte.segmentos.slice(0, 2).map(([a, b, r], i) => ({ a, b, r1: r * k[i][0], r2: r * k[i][1] }));
    const punta = brazo ? manoDe(parte) : [pieDe(parte)];
    const union = filete(invertir(tramos[0]), tramos[1], Math.min(tramos[0].r2, tramos[1].r1) * 1.1, 0.42); // doblado más de 25°
    const manchas = parte.manchas.filter((m) => !m.detras).map((m) => ({ m }));
    const hombro = manchas.filter((s) => s.m.musculos.some((x) => x.startsWith('hombros')));
    const t0 = tramos[0];
    const desde = (u) => ({ ...t0, a: mezcla(t0.a, t0.b, u), r1: t0.r1 + (t0.r2 - t0.r1) * u });
    const tubos = tramos.map((t) => ({ a: t.a, b: t.b, r1: t.r1, r2: t.r2 }));
    // D-139: en la pierna, su borde empieza sin tapa (sin un arco en la ingle)
    const arranque = brazo ? desde(RAIZ + 0.04) : { ...desde(RAIZ + 0.04), sinTapa: true };
    const resto = [...tramos.slice(1), ...punta, ...(union ? [union] : [])];
    return {
      formas: [...tramos, ...resto, ...manchas],
      raiz: [{ ...t0, b: mezcla(t0.a, t0.b, RAIZ), r2: t0.r1 + (t0.r2 - t0.r1) * RAIZ }, ...hombro],
      conBorde: [arranque, ...resto, ...manchas.filter((s) => !hombro.includes(s))],
      tubos,
      tubosDelante: [desde(RAIZ + 0.06), ...tubos.slice(1)],
      tramo0: t0,
    };
  }
  // Las capas del cuerpo, de atrás adelante. Cada una se pinta entera de una vez (su contorno, todas sus formas
  // engordadas; su línea de neón; su cuerpo encima), así que lo que va en la misma capa es un solo cuerpo, sin costuras:
  // lo que queda muy detrás (más oscuro); el tronco, con el cuello y lo que está a su altura (de pie, las piernas); y
  // cada parte que queda delante (un brazo, la cabeza…), una a una, en su orden. Cada parte se queda en su capa hasta
  // pasar el límite por HISTERESIS unidades (así no salta de una a otra en un par de fotogramas).
  function capasDe(f) {
    const dt = f.t - tMemoria;
    if (!(dt > 0 && dt < 0.3)) memoria = new Map();
    tMemoria = f.t;
    const partes = f.cin.partes, p = f.cin.p;
    const tronco = partes.find((x) => x.nombre === 'tronco');
    const tr = troncoDe(f, tronco);
    const medio = { formas: [...tr.formas], borde: [...tr.formas], tubos: [], color: col.cuerpo, tronco, troncoFormas: tr.formas };
    const lejos = { formas: [], borde: [], tubos: [], color: col.lejos, lejos: true };
    const delanteCapas = [];
    const enMedio = {};
    for (const parte of partes) {
      if (parte === tronco) continue;
      if (parte.centro) {
        const s = [{ c: parte.centro, r: parte.radio }];
        delanteCapas.push({ formas: s, borde: s, tubos: [], color: col.cuerpo, cabeza: parte });
        continue;
      }
      const e = extremidad(parte);
      const previa = memoria.get(parte.nombre);
      // D-139: una pierna solo va «lejos» (aparte, detrás) si su cadera está detrás de verdad (casi de perfil): si no,
      // el tronco acabaría en un bulto redondo encima de ella; así su raíz sigue con el tronco. Por eso, en las piernas,
      // la histéresis solo va hacia el tronco: para irse detrás o delante hace falta pasar el límite de siempre por
      // HISTERESIS; para quedarse, basta el de siempre (nunca va donde no iría sin ella)
      const pierna = parte.nombre.startsWith('pierna');
      const margen = (estado) => (previa === estado ? (pierna ? 0 : HISTERESIS) : previa ? -HISTERESIS : 0);
      const ml = margen('lejos');
      const atras = parte.clave < -3 + ml && (!pierna || p['cadera' + parte.nombre.slice(-1)][2] < -3.5 + ml);
      const estado = atras ? 'lejos' : parte.clave <= tronco.clave - margen('delante') ? 'medio' : 'delante';
      memoria.set(parte.nombre, estado);
      if (estado === 'lejos') {
        lejos.formas.push(...e.formas);
        lejos.borde.push(...e.formas);
        lejos.tubos.push(...e.tubos);
      } else if (estado === 'medio') {
        medio.formas.push(...e.formas);
        medio.borde.push(...e.formas);
        medio.tubos.push(...e.tubos);
        enMedio[parte.nombre] = e;
      } else {
        medio.formas.push(...e.raiz);
        medio.borde.push(...e.raiz);
        delanteCapas.push({ formas: e.formas, borde: e.conBorde, tubos: e.tubosDelante, color: col.cuerpo });
      }
    }
    // las axilas (con el brazo a la altura del tronco) y la ingle (con las dos piernas)
    const uniones = [];
    for (const l of ['I', 'D']) {
      const b = enMedio['brazo' + l];
      if (b) uniones.push(filete(b.tramo0, tr.costados[l === 'I' ? 0 : 1], 2.2));
    }
    if (enMedio.piernaI && enMedio.piernaD) uniones.push(filete(enMedio.piernaI.tramo0, enMedio.piernaD.tramo0, 2.6));
    for (const u of uniones) if (u) { medio.formas.push(u); medio.borde.push(u); }
    const capas = [...(lejos.formas.length ? [lejos] : []), medio, ...delanteCapas];
    if (f.coleta) {
      // D-139: la coleta corta de «Ella»: sale de la nuca, algo alta, y cae hacia atrás; detrás de todo si queda detrás
      // del cuerpo, si no junto a la cabeza (detrás o delante de ella)
      const cab = partes.find((x) => x.centro);
      const cola = coletaDe(f);
      const cp = { formas: cola, borde: cola, tubos: cola, color: col.cuerpo };
      const zc = cola[1].a[2], zH = cab.centro[2];
      const i = capas.findIndex((x) => x.cabeza);
      if (zc < tronco.clave - 2) capas.unshift(cp);
      else capas.splice(zc < zH ? i : i + 1, 0, cp);
    }
    return capas;
  }
  // La coleta (D-139): dos tramos que se afinan, de arriba de la nuca hacia atrás y abajo (hasta algo por debajo de
  // la cabeza), con un leve vaivén.
  function coletaDe(f) {
    const cara = f.cin.cara, v = Math.sin(f.t * 2.1) * 1.4;
    const a = cara(0, -8, -2.5, true), b = cara(v * 0.5, 4, 5, true), e = cara(v * 1.6, 19, 9, true);
    return [{ a, b, r1: 4, r2: 3.2 }, { a: b, b: e, r1: 3.2, r2: 1.6 }];
  }
  // dónde está, en px del escenario, con margen para el halo
  function caja(f) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const ver = (x, y, r) => {
      x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
    };
    for (const p of f.cin.partes) {
      if (p.centro) ver(p.centro[0], p.centro[1], p.radio);
      for (const [a, b, r] of p.segmentos) { ver(a[0], a[1], r); ver(b[0], b[1], r); }
      for (const m of p.manchas) ver(m.c[0], m.c[1], Math.max(m.rx, m.ry));
    }
    const k = f.escala, mg = 16 * k;
    return [
      lim(Math.floor(f.raiz[0] + x0 * k - mg), ox, ox + ancho), lim(Math.floor(f.raiz[1] + y0 * k - mg), oy, oy + alto),
      lim(Math.ceil(f.raiz[0] + x1 * k + mg), ox, ox + ancho), lim(Math.ceil(f.raiz[1] + y1 * k + mg), oy, oy + alto),
    ];
  }

  // El halo: uno ancho y suave (a muy poca resolución: al ampliarlo se difumina solo) y otro pegado al cuerpo; en claro,
  // más estrecho y de un color más hondo. Y el músculo que siente, encendido, con algo más de halo.
  function pintarHalo(f, capas, vivos) {
    const [x0, y0, x1, y1] = caja(f), w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const intensidad = brillo * Math.max(0.25, f.carga ?? 1); // en el descanso, la carga: de apagada a recargada
    const oscuro = tema === 'oscuro';
    const color = oscuro ? col.halo : tono(col.halo, -0.1);
    const ancha = oscuro ? 1 : 0.72;
    const todas = capas.flatMap((cp) => cp.formas);
    const pasar = (c, lc, res, extra, alfa, lista = todas, colorP = color, resumido = true) => {
      const hr = dpr * res;
      c.setTransform(hr, 0, 0, hr, -ox * hr, -oy * hr);
      c.clearRect(x0, y0, w, h);
      c.translate(f.raiz[0], f.raiz[1]);
      c.scale(f.escala, f.escala);
      c.fillStyle = colorP;
      trazado(c, lista, extra, resumido);
      c.fill();
      ctx.globalAlpha = Math.min(1, alfa) * base;
      ctx.drawImage(lc, (x0 - ox) * hr, (y0 - oy) * hr, w * hr, h * hr, x0, y0, w, h);
    };
    pasar(actx, haloAncho, HALO_ANCHO_RES, 7.5 * ancha * (0.8 + 0.2 * brillo), (col.halo1 + col.halo2) * 1.15 * (1 + 1.8 * f.destello) * intensidad);
    if (vivos.length) {
      const fuerza = Math.max(...vivos.map((v) => v.i));
      pasar(hctx, halo, HALO_RES, 3.5, 0.32 * fuerza * intensidad, vivos.map((v) => ({ m: v.m })), tono(col.halo, 0.25), false);
    }
    ctx.globalAlpha = 1;
  }

  function pintarSombra(f) {
    const s = f.sombra;
    if (!s || s.rx <= 0) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(1, 0.18);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx);
    g.addColorStop(0, col.sombra);
    g.addColorStop(1, col.sombra0);
    ctx.globalAlpha = s.fuerza;
    ctx.fillStyle = g;
    disco(ctx, 0, 0, s.rx);
    ctx.restore();
  }

  // Los músculos que siente, encendidos: los 3 que más (los demás, mucho menos), con su forma (para su halo).
  function encendidos(f) {
    const luzM = f.cuerpo?.luz || {};
    const top = new Set(Object.keys(luzM).filter((k) => luzM[k] >= 0.04).sort((a, b) => luzM[b] - luzM[a]).slice(0, 3));
    const intensidad = (m) => Math.max(0, ...m.musculos.map((k) => (luzM[k] || 0) * (top.has(k) ? 1 : 0.3)));
    const vivos = [];
    for (const parte of f.cin.partes) {
      for (const m of parte.manchas) {
        if (m.detras || m.liso) continue;
        const i = intensidad(m);
        if (i > 0.15) vivos.push({ m, i });
      }
    }
    return { intensidad, vivos };
  }

  // Las capas del cuerpo, una a una, encima del contorno de fuera de toda la figura (más grueso hacia la sombra, con su
  // color de la luz a la sombra): su contorno de dentro (fino y más suave, sobre lo de debajo), su línea de neón y su
  // cuerpo, ya con su luz (un degradado de arriba a la izquierda, el mismo en todas las capas, así que casan), y lo demás
  // de su luz (iluminar()). A medio brillo (cargándose en el descanso), toda la figura en un lienzo aparte y luego al de
  // verdad, entera (si no, se verían sus capas solapadas). Tras la cabeza, la cara y la cinta.
  function pintarCuerpo(f, capas, luces) {
    const marco = marcoDe(f);
    const aparte = base < 0.999;
    const baseReal = base;
    let zona = null;
    if (aparte) {
      zona = caja(f);
      if (zona[2] <= zona[0] || zona[3] <= zona[1]) return;
      cctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
      cctx.clearRect(zona[0], zona[1], zona[2] - zona[0], zona[3] - zona[1]);
      ctx = cctx;
      base = 1;
    }
    const oscuro = tema === 'oscuro';
    const kB = f.escala < 0.75 ? 1 + (0.75 - f.escala) * 1.1 : 1; // en pequeño, algo más gruesos
    const neon = GROSOR.neon * kB;
    const g = gradientes(ctx, f, marco, oscuro);
    ctx.save();
    ctx.translate(f.raiz[0], f.raiz[1]);
    ctx.scale(f.escala, f.escala);
    ctx.save();
    ctx.translate(GROSOR.sesgo[0] * kB, GROSOR.sesgo[1] * kB);
    ctx.fillStyle = g.fuera;
    rellenar(ctx, capas.flatMap((cp) => cp.borde), neon + GROSOR.fuera * kB);
    ctx.restore();
    capas.forEach((cp, i) => {
      // el contorno de dentro, solo en lo que va encima del tronco (brazos, cabeza, la pierna de delante): la primera
      // capa no tiene nada debajo (le basta el de fuera, que hacia la luz es del mismo color y casi del mismo grosor), y
      // el tronco, encima de lo de muy detrás, se separa de ello con su línea de neón (D-139: con una raya oscura más,
      // la redondez de la cadera quedaba colgando encima de la pierna de detrás)
      ctx.fillStyle = g.dentro;
      if (i > 0 && !cp.tronco) rellenar(ctx, cp.borde, neon + GROSOR.dentro * kB);
      // la línea de neón (lo de muy detrás, sin ella: así se queda al fondo; y D-139: su borde sigue siendo borde, como
      // antes, sin una franja de luz que deje la cadera colgando encima de la pierna de detrás)
      ctx.fillStyle = cp.cabeza ? g.neonCabeza : g.neon;
      if (!cp.lejos) rellenar(ctx, cp.borde, neon);
      ctx.fillStyle = cp.cabeza ? luzDeCabeza(ctx, cp.cabeza, cp.color) : cp.lejos ? g.cuerpoLejos : g.cuerpo;
      rellenar(ctx, cp.formas, 0);
      iluminar(ctx, f, cp, luces, oscuro);
      if (cp.cabeza) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = base;
        pintarCara(f, cp.cabeza);
        if (f.cinta) pintarCinta(f, cp.cabeza);
        ctx.restore();
      }
    });
    ctx.restore();
    if (aparte) {
      ctx = real;
      base = baseReal;
      const [x0, y0, x1, y1] = zona;
      ctx.globalAlpha = base;
      ctx.drawImage(capa, (x0 - ox) * dpr, (y0 - oy) * dpr, (x1 - x0) * dpr, (y1 - y0) * dpr, x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = 1;
    }
  }
  // Su marco fijo, en unidades, alrededor de la pelvis (para su luz, que va de una esquina a otra: así no cambia al
  // mover los brazos).
  function marcoDe(f) {
    const P = f.cin.p.pelvis;
    return { x0: P[0] - 50, y0: P[1] - 82, x1: P[0] + 50, y1: P[1] + 42 };
  }
  // Los degradados del fotograma: el cuerpo (y lo de detrás), la línea de neón (apagada en la cadera y más viva arriba a
  // la izquierda: dos círculos, el de dentro en la pelvis y el de fuera, grande, abajo a la derecha), la de la cabeza, el
  // contorno de fuera (de algo más claro hacia la luz a más oscuro en la sombra) y el de dentro.
  function gradientes(c, f, marco, oscuro) {
    const p = f.cin.p, m = mezcla(p.cuello, p.cintura, 0.3), lx = m[0] - 6, ly = m[1] - 7;
    const bola = (color, tonos) => {
      const gr = c.createRadialGradient(lx, ly, 1, lx + 5, ly + 7, 74);
      for (const [t, k] of tonos) gr.addColorStop(t, tono(color, k));
      return gr;
    };
    const lineal = (color, tonos) => {
      const gr = c.createLinearGradient(marco.x0, marco.y0, marco.x1, marco.y1);
      for (const [t, k] of tonos) gr.addColorStop(t, tono(color, k));
      return gr;
    };
    const P = f.cin.p.pelvis;
    const radial = (color, tonos) => {
      const gr = c.createRadialGradient(P[0], P[1] + 2, 6, P[0] + 16, P[1] + 22, 46);
      for (const [t, k] of tonos) gr.addColorStop(t, tono(color, k));
      return gr;
    };
    const tn = TONOS.neon[oscuro ? 'oscuro' : 'claro'];
    const borde = col.borde;
    const fuera = c.createLinearGradient(marco.x0, marco.y0, marco.x1, marco.y1);
    const dentro = oscuro ? tono(borde, -0.32) : mezclaColor(borde, col.cuerpo, 0.3);
    fuera.addColorStop(0, oscuro ? mezclaColor(borde, col.cuerpo, 0.3) : dentro);
    fuera.addColorStop(0.45, borde);
    fuera.addColorStop(1, tono(borde, oscuro ? -0.22 : -0.3));
    return {
      cuerpo: bola(col.cuerpo, TONOS.cuerpo),
      cuerpoLejos: bola(col.lejos, TONOS.cuerpo),
      neon: radial(col.cuerpo, tn),
      neonCabeza: lineal(col.cuerpo, TONOS.neonCabeza[oscuro ? 'oscuro' : 'claro']),
      fuera,
      dentro,
    };
  }
  // La cabeza, una bola: más clara arriba a la izquierda y más oscura en el borde de abajo a la derecha.
  function luzDeCabeza(c, cabeza, color) {
    const [x, y] = cabeza.centro, R = cabeza.radio;
    const g = c.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.15, x - R * 0.12, y - R * 0.15, R * 1.2);
    g.addColorStop(0, tono(color, 0.14));
    g.addColorStop(0.62, color);
    g.addColorStop(1, tono(color, -0.2));
    return g;
  }
  // Lo demás de la luz de una capa, dentro de ella (ya recortada a su cuerpo): el tronco, con su luz de bola; cada tubo,
  // sombreado a lo ancho; los músculos, la mano y el pie, un bulto (y el músculo que siente, encendido por dentro); en
  // el tronco, las líneas de un cuerpo definido (en relieve) y la sombra de la cabeza; y en la cabeza, su brillo.
  function iluminar(c, f, cp, luces, oscuro) {
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const claro = tono(cp.color, 0.62), hondo = tono(cp.color, -0.55);
    if (cp.cabeza) {
      const [x, y] = cp.cabeza.centro, R = cp.cabeza.radio, bx = x - R * 0.36, by = y - R * 0.4;
      const b = c.createRadialGradient(bx, by, 0, bx, by, R * 0.5);
      b.addColorStop(0, col.brillo);
      b.addColorStop(1, col.brillo0);
      c.fillStyle = b;
      disco(c, bx, by, R * 0.5);
      // un brillo fino, como el de un juguete de vinilo, junto al borde de arriba a la izquierda (lejos de la cara)
      c.strokeStyle = oscuro ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.8)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(x, y, R * 0.84, Math.PI * 1.06, Math.PI * 1.24);
      c.stroke();
      return;
    }
    for (const t of cp.tubos) tubo(c, t, claro, hondo);
    let degradado = null; // uno para todos los bultos de la capa (cada uno lo pinta en su sitio y a su tamaño)
    for (const s of cp.formas) {
      if (!s.m || s.m.liso || s.m.bulto) continue;
      degradado ??= degradadoBulto(c, claro, hondo);
      bulto(c, s.m, degradado);
    }
    for (const s of cp.formas) {
      if (!s.m || !s.m.musculos.length) continue;
      const m = s.m, i = luces.intensidad(m);
      if (i < 0.04) continue;
      const late = i * (0.7 + 0.3 * Math.sin(f.t * TAU * 3.2));
      if (m.liso) {
        // lo liso (la franja de los glúteos, la del pecho de «Ella», D-139), con una luz suave de su color, no blanca
        c.fillStyle = tono(cp.color, 0.4);
        c.globalAlpha = late * 0.7;
        ovalo(c, m, 0);
        c.globalAlpha = 1;
        continue;
      }
      // encendido por dentro: el neón del músculo, de su centro (casi blanco) a su borde (D-139: dentro de su capa)
      // (con la forma de su mancha: un dorsal, una franja en diagonal, no un óvalo redondo)
      const vivo = tono(cp.color, oscuro ? 0.7 : 0.6);
      c.save();
      c.translate(m.c[0], m.c[1]);
      c.rotate(m.rot);
      c.scale(Math.max(0.1, m.rx), Math.max(0.1, m.ry));
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, rgba(vivo, 0.9 * late));
      gr.addColorStop(0.5, rgba(vivo, 0.5 * late));
      gr.addColorStop(1, rgba(vivo, 0));
      c.fillStyle = gr;
      disco(c, 0, 0, 1);
      c.restore();
    }
    if (cp.tronco) {
      // las líneas de un cuerpo definido (las de delante, de frente; las de detrás, de espaldas), en relieve: una ranura
      // con su labio de luz encima; las que van de lado a lado, algo curvas
      for (const d of f.cin.detalles) {
        const v = lim(d.cara * f.cin.frente * 2.5, 0, 1) * d.fuerza;
        if (v < 0.03) continue;
        let [a, b, e] = d.puntos;
        if (!e && Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1])) {
          e = b;
          b = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2 + 0.9];
        }
        for (const [color, alfa, ancho, dx, dy] of [[claro, 0.5, 0.9, -0.35, -0.45], [hondo, 0.62, 0.75, 0, 0]]) {
          c.strokeStyle = rgba(color, alfa * v);
          c.lineWidth = ancho;
          c.beginPath();
          c.moveTo(a[0] + dx, a[1] + dy);
          if (e) c.quadraticCurveTo(b[0] + dx, b[1] + dy, e[0] + dx, e[1] + dy);
          else c.lineTo(b[0] + dx, b[1] + dy);
          c.stroke();
        }
      }
      // la sombra de la cabeza en el cuello (solo en él: así no hace falta recortar)
      const H = f.cin.p.cabeza, R = 17;
      const s = c.createRadialGradient(H[0] + 1, H[1] + R * 0.9, 0, H[0] + 1, H[1] + R * 0.9, R * 0.75);
      s.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      s.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.fillStyle = s;
      rellenar(c, [cp.troncoFormas[2]], 0);
    }
  }
  // Un tubo (brazo, muslo…), redondo: sombreado a lo ancho, con luz en su lado hacia la luz y sombra en el otro, que se
  // desvanecen hacia el medio (así, donde se tocan dos tramos, apenas se nota). De punta, nada.
  function tubo(c, { a, b, r1, r2 }, claro, hondo) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < Math.min(r1, r2) * 1.4) return;
    const ux = dx / d, uy = dy / d;
    let nx = -uy, ny = ux, s = nx * LUZ[0] + ny * LUZ[1];
    if (s < 0) [nx, ny, s] = [-nx, -ny, -s];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, rm = (r1 + r2) / 2;
    const gr = c.createLinearGradient(mx + nx * rm, my + ny * rm, mx - nx * rm, my - ny * rm);
    gr.addColorStop(0, rgba(claro, 0.34 * (0.35 + 0.65 * s)));
    gr.addColorStop(0.32, rgba(claro, 0));
    gr.addColorStop(0.55, rgba(hondo, 0));
    gr.addColorStop(1, rgba(hondo, 0.3 * (0.5 + 0.5 * s)));
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(a[0] + nx * r1, a[1] + ny * r1);
    c.lineTo(b[0] + nx * r2, b[1] + ny * r2);
    c.lineTo(b[0] - nx * r2, b[1] - ny * r2);
    c.lineTo(a[0] - nx * r1, a[1] - ny * r1);
    c.closePath();
    c.fill();
  }
  // Un bulto (un músculo): más claro arriba a la izquierda y algo más oscuro en su borde de abajo a la derecha, como un
  // volumen (no un pegote). El degradado, en un círculo de radio 1 (degradadoBulto()), se lleva a cada músculo.
  function degradadoBulto(c, claro, hondo) {
    const gr = c.createRadialGradient(LUZ[0] * 0.4, LUZ[1] * 0.4, 0, 0, 0, 1);
    gr.addColorStop(0, rgba(claro, 0.34));
    gr.addColorStop(0.5, rgba(claro, 0));
    gr.addColorStop(0.8, rgba(hondo, 0));
    gr.addColorStop(1, rgba(hondo, 0.2));
    return gr;
  }
  function bulto(c, m, degradado) {
    const R = Math.max(0.1, (m.rx + m.ry) * 0.55);
    c.save();
    c.translate(m.c[0], m.c[1]);
    c.scale(R, R);
    c.fillStyle = degradado;
    c.beginPath();
    c.ellipse(0, 0, Math.max(0.01, m.rx / R), Math.max(0.01, m.ry / R), m.rot, 0, TAU);
    c.fill();
    c.restore();
  }

  // La cinta (D-135, la 4): mientras entrenas, una cinta blanca alrededor de la cabeza, a la altura de la frente. Se
  // pinta lo que da hacia nosotros (de frente, en la frente; de espaldas, la nuca) y, si se ve, el nudo con sus puntas.
  function pintarCinta(f, parte) {
    const zH = parte.centro[2];
    const yb = -9.5, rb = Math.sqrt(17.6 * 17.6 - yb * yb);
    const punto = (th) => f.cin.cara(rb * Math.cos(th), yb, 0.6, Math.sin(th) < 0);
    const N = 40;
    const anillo = Array.from({ length: N + 1 }, (_, i) => punto((i / N) * 2 * Math.PI));
    const pintar = (color, ancho) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = ancho;
      for (let i = 0; i < N; i++) {
        const [a, b] = [anillo[i], anillo[i + 1]];
        if (a[2] < zH - 0.5 || b[2] < zH - 0.5) continue; // detrás de la cabeza
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    };
    ctx.save();
    ctx.lineCap = 'round';
    pintar(col.borde, 6.2);
    pintar('#f8fafc', 4.2);
    const nudo = punto(-Math.PI / 2); // en la nuca
    if (nudo[2] >= zH - 3) {
      const lado = Math.sign(nudo[0] - parte.centro[0]) || 1;
      for (const [dx, dy] of [[9, 5], [7, 11]]) {
        const fin = [nudo[0] + lado * dx, nudo[1] + dy];
        for (const [color, ancho] of [[col.borde, 4.6], ['#f8fafc', 2.8]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = ancho;
          ctx.beginPath();
          ctx.moveTo(nudo[0], nudo[1]);
          ctx.quadraticCurveTo(nudo[0] + lado * dx * 0.6, nudo[1] - 1, fin[0], fin[1]);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // La cara. La mirada mueve los ojos, las cejas y la boca, pero menos cuanto más cerca del borde (de perfil, el ojo
  // de cerca casi no se mueve) y nunca fuera de la cabeza (antes, de perfil, el ojo y su brillo se salían).
  function pintarCara(f, parte) {
    const cin = f.cin, zH = parte.centro[2], [hx, hy] = parte.centro, dentro = parte.radio - 3.4;
    const [mx, my] = f.mirada;
    const vis = (q) => lim((q[2] - zH) / 5, 0, 1);
    const en = (x, y, seguir = 1) => {
      const q = cin.cara(x, y);
      const k = seguir * lim((q[2] - zH) / 9, 0, 1);
      let X = q[0] + mx * k, Y = q[1] + my * k;
      const dx = X - hx, dy = Y - hy, d = Math.hypot(dx, dy);
      if (d > dentro) [X, Y] = [hx + (dx * dentro) / d, hy + (dy * dentro) / d];
      return [X, Y, q[2]];
    };
    const i0 = cin.cara(-4, 0), i1 = cin.cara(4, 0);
    const ang = Math.atan2(i1[1] - i0[1], i1[0] - i0[0]); // la horizontal de la cara, en pantalla
    const curva = (x0, y0, cx, cy, x1, y1, seguir = 1) => {
      const a = en(x0, y0, seguir), b = en(cx, cy, seguir), c = en(x1, y1, seguir);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
      ctx.stroke();
    };
    const c = f.cara, tipo = c ? c.ojos : 'punto', luz = c ? c.luz : 0;
    ctx.strokeStyle = col.tinta;
    ctx.fillStyle = col.tinta;
    [-6.3, 6.3].forEach((ex, i) => {
      const propio = tipo === 'guino' ? (i === 0 ? 'punto' : 'feliz') : tipo;
      const punto = propio === 'punto' || propio === 'grandes';
      const q = en(ex, -1.5), v = vis(q);
      if (v <= 0) return;
      const escorzo = lim((q[2] - zH) / 17, 0.3, 1);
      const r = propio === 'grandes' ? 2.4 + 0.8 * luz : 2.4;
      const alfa = (punto ? 1 : 1 - luz) * v;
      if (alfa > 0.02) {
        ctx.globalAlpha = alfa * base;
        ctx.fillStyle = col.tinta;
        ctx.beginPath();
        ctx.ellipse(q[0], q[1], r * escorzo, r * Math.max(0.12, f.abiertos), ang, 0, TAU);
        ctx.fill();
        if (f.abiertos > 0.6) {
          ctx.fillStyle = '#ffffff';
          disco(ctx, q[0] + 0.8 * escorzo, q[1] - 0.9, 0.7);
        }
      }
      if (c && !punto && luz > 0.02) {
        ctx.globalAlpha = luz * v * base;
        ctx.lineWidth = 1.5;
        if (propio === 'feliz') curva(ex - 2.8, -1, ex, -4.8, ex + 2.8, -1);
        else if (propio === 'cerrados') curva(ex - 2.8, -2.2, ex, 1.2, ex + 2.8, -2.2);
        else if (propio === 'entornados') curva(ex - 2.7, -1.4, ex, -1.9, ex + 2.7, -1.4);
        else if (propio === 'apretados') {
          const s = Math.sign(ex), a = en(ex - 2.4 * s, -4), b = en(ex + 1.6 * s, -1.8), d = en(ex - 2.4 * s, 0.4);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.lineTo(d[0], d[1]);
          ctx.stroke();
        }
      }
    });
    if (c && luz > 0.02) {
      ctx.lineWidth = 1.6;
      [-6.3, 6.3].forEach((ex) => {
        const s = Math.sign(ex), tipoCeja = c.cejas === 'una' ? (s < 0 ? 'altas' : 'relajadas') : c.cejas;
        if (!tipoCeja) return;
        const fuera = ex + 3 * s, dentroC = ex - 3 * s;
        ctx.globalAlpha = luz * vis(en(ex, -8.5)) * base;
        if (tipoCeja === 'alegres') curva(fuera, -8.1, ex, -10.6, dentroC, -8.1, 0.6);
        else if (tipoCeja === 'altas') curva(fuera, -10.2, ex, -12.8, dentroC, -10.2, 0.6);
        else if (tipoCeja === 'fruncidas') curva(fuera, -10, ex, -9.1, dentroC, -7.6, 0.6);
        else if (tipoCeja === 'preocupadas') curva(fuera, -7.8, ex, -8.9, dentroC, -10.2, 0.6);
        else if (tipoCeja === 'relajadas') curva(fuera, -8.4, ex, -9.3, dentroC, -8.4, 0.6);
      });
      const centro = en(0, 9, 0.4), vb = vis(centro);
      ctx.globalAlpha = luz * vb * base;
      const b = c.boca, escorzo = lim((centro[2] - zH) / 17, 0.3, 1);
      if (b === 'sonrisa') curva(-4.2, 7.6, 0, 11.6, 4.2, 7.6, 0.4);
      else if (b === 'sonrisaGrande') curva(-5.4, 7, 0, 13.6, 5.4, 7, 0.4);
      else if (b === 'pequena') curva(-2.4, 8.4, 0, 10.4, 2.4, 8.4, 0.4);
      else if (b === 'apretada') curva(-3.8, 8.8, 0, 8.6, 3.8, 8.8, 0.4);
      else if (b === 'ondulada') {
        curva(-4, 8.8, -2, 7.2, 0, 8.8, 0.4);
        curva(0, 8.8, 2, 10.4, 4, 8.8, 0.4);
      } else if (b === 'abierta') {
        const a = en(-5.2, 7, 0.4), m = en(0, 15, 0.4), d = en(5.2, 7, 0.4);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(m[0], m[1], d[0], d[1]);
        ctx.closePath();
        ctx.fill();
      } else if (b === 'o' || b === 'oGrande') {
        const q = en(0, b === 'o' ? 9.4 : 10, 0.4), [rx, ry] = b === 'o' ? [2.2, 2.6] : [3.1, 4.3];
        ctx.beginPath();
        ctx.ellipse(q[0], q[1], rx * escorzo, ry, ang, 0, TAU);
        ctx.stroke();
      }
      if (c.rubor) {
        ctx.fillStyle = col.rubor;
        for (const ex of [-10.5, 10.5]) {
          const q = en(ex, 4.8, 0.3);
          ctx.globalAlpha = luz * vis(q) * base;
          ctx.beginPath();
          ctx.ellipse(q[0], q[1], 3.2 * lim((q[2] - zH) / 17, 0.3, 1), 1.8, ang, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = base;
  }

  // Zetas al dormir, chispas en un récord y la exclamación de un susto, con los mismos tubos de luz.
  function pintarEfectos(f) {
    const H = f.cin.p.cabeza;
    for (const e of f.efectos) {
      const u = e.edad / e.dur, trazos = [];
      let alfa = 1;
      if (e.tipo === 'z') {
        const k = 0.8 + 0.6 * u, cx = H[0] + 13 + 12 * u + 3 * Math.sin(u * 7), cy = H[1] - 22 - 18 * u;
        trazos.push([[cx - 3 * k, cy - 3 * k], [cx + 3 * k, cy - 3 * k], [cx - 3 * k, cy + 3 * k], [cx + 3 * k, cy + 3 * k]]);
        alfa = Math.sin(Math.PI * u);
      } else if (e.tipo === 'chispas') {
        for (let j = 0; j < 6; j++) {
          const a = ((e.giro + j * 60) * Math.PI) / 180, rr = 24 + 30 * u, k = 4.5 * (1 - u) + 1.2;
          const cx = H[0] + Math.cos(a) * rr, cy = H[1] + Math.sin(a) * rr, d = k * 0.7071;
          if (j % 2) trazos.push([[cx - d, cy - d], [cx + d, cy + d]], [[cx - d, cy + d], [cx + d, cy - d]]); // aspa
          else trazos.push([[cx - k, cy], [cx + k, cy]], [[cx, cy - k], [cx, cy + k]]); // cruz
        }
        alfa = 1 - u * u;
      } else if (e.tipo === 'exclamacion') {
        const k = u < 0.12 ? 0.4 + 7.1 * u : u < 0.2 ? 1.25 - 3.1 * (u - 0.12) : 1;
        const cx = H[0] + 21, cy = H[1] - 23;
        trazos.push([[cx, cy - 7 * k], [cx, cy + 1 * k]], [[cx, cy + 5 * k], [cx, cy + 5.1 * k]]);
        alfa = 1 - lim((u - 0.75) / 0.25, 0, 1);
      }
      for (const [color, ancho] of [[col.borde, 3.6], [col.cuerpo, 2.4], [col.brillo, 0.9]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = ancho;
        ctx.globalAlpha = alfa * base;
        ctx.beginPath();
        for (const t of trazos) {
          ctx.moveTo(t[0][0], t[0][1]);
          for (const q of t.slice(1)) ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function pintarHuesos(f) {
    const p = f.cin.p;
    const pares = [['pelvis', 'lumbar'], ['lumbar', 'cuello'], ['cuello', 'cabeza'], ['hombroI', 'hombroD']];
    for (const l of ['I', 'D']) {
      pares.push(['hombro' + l, 'codo' + l], ['codo' + l, 'mano' + l], ['pelvis', 'cadera' + l],
        ['cadera' + l, 'rodilla' + l], ['rodilla' + l, 'tobillo' + l], ['tobillo' + l, 'punta' + l]);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col.hueso;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    for (const [a, b] of pares) {
      ctx.moveTo(p[a][0], p[a][1]);
      ctx.lineTo(p[b][0], p[b][1]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col.hueso;
    for (const k in p) disco(ctx, p[k][0], p[k][1], k === 'cabeza' ? 2.2 : 1.6);
  }

  // origen: dónde cae la esquina de arriba a la izquierda del lienzo, en px del escenario. En la app el lienzo es
  // pequeño y va con ella; en el prototipo, [0, 0] (el lienzo es todo el escenario).
  // Lo que lleva en la mano (D-135): la botella (de la mano hacia fuera, como el antebrazo), la toalla, que cuelga, el
  // trofeo, una copa dorada siempre derecha, con el pie en la mano, o una mancuerna pequeña, con la barra cruzada en el
  // puño y un disco a cada lado.
  function pintarObjeto(f, { tipo, mano }) {
    const p = f.cin.p;
    const m = p['mano' + mano];
    const c = p['codo' + mano];
    if (!m || !c) return;
    const d = Math.hypot(m[0] - c[0], m[1] - c[1]) || 1;
    const ux = (m[0] - c[0]) / d;
    const uy = (m[1] - c[1]) / d;
    const trazo = (puntos, color, ancho) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = ancho;
      ctx.beginPath();
      ctx.moveTo(puntos[0][0], puntos[0][1]);
      if (puntos.length === 3) ctx.quadraticCurveTo(puntos[1][0], puntos[1][1], puntos[2][0], puntos[2][1]);
      else ctx.lineTo(puntos[1][0], puntos[1][1]);
      ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = 'round';
    if (tipo === 'botella') {
      const a = [m[0] - ux * 3, m[1] - uy * 3];
      const b = [m[0] + ux * 9, m[1] + uy * 9];
      const t = [m[0] + ux * 12.5, m[1] + uy * 12.5];
      trazo([a, b], col.borde, 7.6);
      trazo([a, b], '#7dd3fc', 5.6);
      trazo([[a[0] - uy * 1.2, a[1] + ux * 1.2], [b[0] - uy * 1.2, b[1] + ux * 1.2]], 'rgba(255, 255, 255, 0.7)', 1.4);
      trazo([b, t], col.borde, 3.6);
    } else if (tipo === 'toalla') {
      const tira = [m, [m[0] + 7, m[1] + 8], [m[0] + 2, m[1] + 17]];
      trazo(tira, col.borde, 5.6);
      trazo(tira, '#f8fafc', 3.8);
    } else if (tipo === 'trofeo') {
      const oro = '#fbbf24';
      const [x, y] = [m[0], m[1] + 1];
      trazo([[x - 4, y], [x + 4, y]], col.borde, 4); // el pie
      trazo([[x - 4, y], [x + 4, y]], oro, 2.2);
      trazo([[x, y], [x, y - 6]], col.borde, 3.6); // el tallo
      trazo([[x, y], [x, y - 6]], oro, 1.8);
      for (const lado of [-1, 1]) { // las asas
        trazo([[x + lado * 5.5, y - 15.5], [x + lado * 10, y - 13.5], [x + lado * 5, y - 9.5]], col.borde, 3.2);
        trazo([[x + lado * 5.5, y - 15.5], [x + lado * 10, y - 13.5], [x + lado * 5, y - 9.5]], oro, 1.4);
      }
      ctx.beginPath(); // la copa
      ctx.moveTo(x - 7, y - 17);
      ctx.quadraticCurveTo(x - 7, y - 6, x, y - 6);
      ctx.quadraticCurveTo(x + 7, y - 6, x + 7, y - 17);
      ctx.closePath();
      ctx.fillStyle = oro;
      ctx.strokeStyle = col.borde;
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();
      trazo([[x - 4.5, y - 15], [x - 3.5, y - 9.5]], 'rgba(255, 255, 255, 0.75)', 1.4); // el brillo
    } else if (tipo === 'mancuerna') {
      const [px, py] = [-uy, ux]; // de lado a lado del puño: cruzada con el antebrazo
      const a = [m[0] - px * 6.5, m[1] - py * 6.5];
      const b = [m[0] + px * 6.5, m[1] + py * 6.5];
      trazo([a, b], col.borde, 3.8); // la barra
      trazo([a, b], '#e2e8f0', 2);
      for (const [cx, cy] of [a, b]) { // los discos
        const d1 = [cx - ux * 4.2, cy - uy * 4.2];
        const d2 = [cx + ux * 4.2, cy + uy * 4.2];
        trazo([d1, d2], col.borde, 7);
        trazo([d1, d2], '#94a3b8', 4.8);
      }
    }
    ctx.restore();
  }

  function dibujar(f, origen = [0, 0]) {
    [ox, oy] = origen;
    ctx = real;
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    ctx.clearRect(ox, oy, ancho, alto);
    if (!f) return;
    base = (huesos ? 0.3 : 1) * Math.min(1, 0.45 + 0.55 * (f.carga ?? 1)); // con poca carga, más apagada
    ctx.save();
    const izq = ox - 50, der = ox + ancho + 50, arriba = oy - 50, abajo = oy + alto + 50;
    if (recorte) {
      // solo se ve en esa franja (en la app, entre la cabecera y la barra de abajo: fuera, queda detrás de ellas)
      ctx.beginPath();
      ctx.rect(izq, recorte.y1, der - izq, Math.max(0, recorte.y2 - recorte.y1));
      ctx.clip();
    }
    if (f.ocultar) {
      // escondida detrás de una tarjeta: se tapa lo que queda por debajo de su borde de arriba
      const o = f.ocultar;
      ctx.beginPath();
      ctx.rect(izq, arriba, der - izq, Math.max(0, o.y - arriba));
      ctx.rect(izq, o.y, Math.max(0, o.x1 - izq), Math.max(0, abajo - o.y));
      ctx.rect(o.x2, o.y, Math.max(0, der - o.x2), Math.max(0, abajo - o.y));
      ctx.clip();
    }
    const capas = capasDe(f);
    const luces = encendidos(f);
    pintarSombra(f);
    pintarHalo(f, capas, luces.vivos);
    pintarCuerpo(f, capas, luces);
    ctx.translate(f.raiz[0], f.raiz[1]);
    ctx.scale(f.escala, f.escala);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = base;
    for (const o of [].concat(f.objeto || [])) pintarObjeto(f, o); // uno, o uno en cada mano
    pintarEfectos(f);
    if (huesos) pintarHuesos(f);
    ctx.restore();
  }

  return {
    dibujar,
    // el tamaño del escenario (px) y los píxeles de verdad por px de la pantalla
    medidas(w, h, r = 1) {
      ancho = w;
      alto = h;
      dpr = r;
      for (const c of [lienzo, capa]) {
        c.width = Math.round(w * r);
        c.height = Math.round(h * r);
      }
      halo.width = Math.round(w * r * HALO_RES);
      halo.height = Math.round(h * r * HALO_RES);
      haloAncho.width = Math.max(1, Math.round(w * r * HALO_ANCHO_RES));
      haloAncho.height = Math.max(1, Math.round(h * r * HALO_ANCHO_RES));
    },
    set tema(t) {
      tema = t === 'oscuro' ? 'oscuro' : 'claro';
      col = LUCES[luz][tema];
    },
    // el color de su luz: una de LUCES (si no, verde)
    set luz(l) {
      luz = LUCES[l] ? l : 'verde';
      col = LUCES[luz][tema];
    },
    get luz() { return luz; },
    // cuánto brilla: 1, lo de siempre; más, más halo
    set brillo(k) { brillo = Number.isFinite(k) && k > 0 ? k : 1; },
    get brillo() { return brillo; },
    // la franja donde se ve, { y1, y2 } en px del escenario (o null: en todo el lienzo)
    set recorte(r) { recorte = r && Number.isFinite(r.y1) && Number.isFinite(r.y2) ? { y1: r.y1, y2: r.y2 } : null; },
    set huesos(si) { huesos = !!si; },
    get huesos() { return huesos; },
  };
}
