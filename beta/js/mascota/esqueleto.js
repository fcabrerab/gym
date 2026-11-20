// Esqueleto de la mascota (D-130): medidas, volúmenes, poses y cinemática, en 3D.
// De una pose (ángulos) a los volúmenes del cuerpo ya vistos desde la pantalla: cápsulas (palitos con grosor)
// y manchas (la barriga, cada músculo). No pinta nada: cada traje los pinta a su manera.
// Unidades: las de los bocetos (la cabeza, de 17 de radio). Ángulos, en grados.
// Ejes del cuerpo: x a la derecha de la pantalla (cuando nos mira), y hacia abajo, z hacia nosotros (su delante).
// «I» y «D»: el lado izquierdo y el derecho de la pantalla, cuando nos mira.
// En brazos y piernas, «brazo», «codo», «muslo» y «rodilla» abren hacia fuera (igual en los dos lados);
// los «…Ad», hacia delante (doblar la rodilla es «rodillaAd» negativo).

export const MEDIDAS = Object.freeze({
  cadera: 4.5, lumbar: 19, pecho: 20, cuello: 3, cabeza: 17, hombroBajo: 5,
  brazo: 20, antebrazo: 19, muslo: 24, pierna: 22, pie: 6,
  rTronco: 7.5, rHombros: 6, rBrazo: 4.1, rPierna: 4.7, rPie: 3.6,
});

export const POSE_BASE = Object.freeze({
  orientacion: 0,   // hacia dónde mira el cuerpo: 0 a nosotros, 90 a la derecha, 180 de espaldas, −90 a la izquierda
  giro: 0,          // todo el cuerpo en el plano de la pantalla, alrededor de la pelvis (positivo: como el reloj)
  inclinar: 0,      // el tronco, hacia delante (positivo) o hacia atrás
  lumbar: 0, pecho: 0, cabeza: 0, // cada tramo, hacia un lado (positivo: a la derecha)
  cabezaGiro: 0, cabezaAd: 0,     // la cabeza: girarla (como «orientacion») y asentir (positivo: mira abajo)
  hombros: 0,       // encogerlos (unidades hacia arriba)
  brazoI: 10, brazoAdI: 0, codoI: -6, codoAdI: 14,
  brazoD: 10, brazoAdD: 0, codoD: -6, codoAdD: 14,
  musloI: 4, musloAdI: 0, rodillaI: 0, rodillaAdI: -4,
  musloD: 4, musloAdD: 0, rodillaD: 0, rodillaAdD: -4,
  puntillas: 0,     // de 0 (pies planos) a 1 (de puntillas)
  estirar: 0,       // estirarse (+) o aplastarse (−) desde donde se apoya
  alto: 0,          // despegue del suelo, en unidades (saltos)
});
export const CAMPOS = Object.keys(POSE_BASE);

export const lerp = (a, b, t) => a + (b - a) * t;
export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
export const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const tramo = (v, a, b) => suave((v - a) / (b - a)); // 0 antes de a, 1 después de b
const vuelta = (g) => ((g % 360) + 540) % 360 - 180;       // a [−180, 180)

// Con «corto», la orientación va por el lado más corto (para pasar de una acción a otra).
export function mezclar(a, b, t, corto = false) {
  const r = {};
  for (const k of CAMPOS) r[k] = a[k] + (corto && k === 'orientacion' ? vuelta(b[k] - a[k]) : b[k] - a[k]) * t;
  return r;
}
// Una vuelta entera (360) es lo mismo que de frente (0).
export function normalizar(pose) {
  const o = vuelta(pose.orientacion);
  return o === pose.orientacion ? pose : { ...pose, orientacion: o };
}

const RAD = Math.PI / 180;
const sen = (g) => Math.sin(g * RAD), cos = (g) => Math.cos(g * RAD);
// la dirección de un tramo: «abajo», girada hacia delante f grados y hacia el lado a grados
const dir = (a, f) => [cos(f) * sen(a), cos(f) * cos(a), sen(f)];
// «arriba» del tronco, inclinado a un lado (a) y hacia delante (i)
const arriba = (a, i) => [sen(a) * cos(i), -cos(a) * cos(i), sen(i)];
const mas = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];
const entre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unidad = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
// Lo que tiene el primer candidato de perpendicular a u (o el siguiente, si va casi igual que u).
function perpendicular(u, ...candidatos) {
  for (const v of [...candidatos, [0, -1, 0], [1, 0, 0]]) {
    const k = v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
    const w = [v[0] - u[0] * k, v[1] - u[1] * k, v[2] - u[2] * k], l = Math.hypot(w[0], w[1], w[2]);
    if (l > 0.3) return [w[0] / l, w[1] / l, w[2] / l];
  }
  return [0, 0, 1];
}

/**
 * De una pose a los volúmenes del cuerpo, con la pelvis en (0, 0) y la y hacia abajo.
 * cuerpo: { anchoHombros, vientre (radio de la barriga), gordo (0 a 1), bultos: {músculo: unidades}, ver: {músculo: 0 a 1} }.
 * Devuelve { p (puntos: x, y y la profundidad z, hacia nosotros), partes (por orden: lo de detrás, primero),
 * detalles (las líneas de un cuerpo definido), cara(x, y) (un punto de la cara), frente, pies, bajo, radios }.
 */
export function cinematica(pose, cuerpo, { espejo = false, apoyo = 'pies' } = {}) {
  const M = MEDIDAS, b = cuerpo.bultos || {}, ver = cuerpo.ver || {}, g = cuerpo.gordo || 0;
  const rT = M.rTronco + 1.4 * g, rB = M.rBrazo + 0.5 * g, rPi = M.rPierna + 0.6 * g, w = cuerpo.anchoHombros;
  const aL = pose.lumbar, aP = aL + pose.pecho, aC = aP + pose.cabeza;
  const iL = pose.inclinar * 0.45, iP = pose.inclinar;
  const q = {}, manchas = [], detalles = [];
  const mancha = (parte, musculos, c, eje, largo, ancho) => manchas.push({ parte, musculos, c, eje, largo, ancho });

  q.pelvis = [0, 0, 0];
  const uL = arriba(aL, iL), uP = arriba(aP, iP);
  const dL = [cos(aL), sen(aL), 0], dP = [cos(aP), sen(aP), 0];
  const fL = cruz(uL, dL), fP = cruz(uP, dP); // su delante
  q.lumbar = mas(q.pelvis, uL, M.lumbar);
  q.cuello = mas(q.lumbar, uP, M.pecho);
  q.cabeza = mas(q.cuello, arriba(aC, iP * 0.8 + pose.cabezaAd * 0.2), M.cuello + M.cabeza);
  // un punto del tronco: x a su derecha, y hacia abajo desde el cuello, z hacia su delante
  const enTronco = (x, y, z) => (y <= M.pecho
    ? mas(mas(mas(q.cuello, dP, x), uP, -y), fP, z)
    : mas(mas(mas(q.pelvis, dL, x), uL, M.pecho + M.lumbar - y), fL, z));

  for (const [l, s] of [['I', -1], ['D', 1]]) {
    // brazo
    const H = mas(mas(q.cuello, dP, s * w), uP, pose.hombros - M.hombroBajo);
    const a0 = -aP, f0 = -iP;
    const dB = dir(a0 + s * pose['brazo' + l], f0 + pose['brazoAd' + l]);
    const dA = dir(a0 + s * (pose['brazo' + l] + pose['codo' + l]), f0 + pose['brazoAd' + l] + pose['codoAd' + l]);
    const E = mas(H, dB, M.brazo);
    q['hombro' + l] = H;
    q['codo' + l] = E;
    q['mano' + l] = mas(E, dA, M.antebrazo);
    const nB = perpendicular(dB, dA, fP);                  // hacia donde se dobla el codo: el bíceps
    const lat = perpendicular(dB, [s, 0, 0], [0, -1, 0]); // por fuera: el deltoides
    const bi = b['biceps' + l] || 0, tr = b['triceps' + l] || 0, de = b['deltoides' + l] || 0;
    if (bi > 0.12) mancha('brazo' + l, ['biceps' + l], mas(entre(H, E, 0.52), nB, rB * 0.4 + bi * 0.35), dB, 6 + bi * 0.6, rB * 0.7 + bi * 0.55);
    if (tr > 0.12) mancha('brazo' + l, ['triceps' + l], mas(entre(H, E, 0.45), nB, -(rB * 0.4 + tr * 0.35)), dB, 6 + tr * 0.6, rB * 0.7 + tr * 0.5);
    if (de > 0.12) mancha('brazo' + l, ['hombros' + l, 'hombrosPost' + l], mas(mas(H, lat, rB * 0.45 + de * 0.35), dB, 2.5), dB, 4.5 + de * 0.5, rB * 0.8 + de * 0.55);

    // pierna; el pie, plano en el suelo salvo con la pierna muy doblada (entonces sigue a la espinilla)
    const Hc = [s * M.cadera, 0, 0];
    const aR = s * (pose['muslo' + l] + pose['rodilla' + l]);
    const fM = pose['musloAd' + l], fR = fM + pose['rodillaAd' + l];
    const dM = dir(s * pose['muslo' + l], fM), dS = dir(aR, fR);
    const kPie = limitar((Math.abs(fR) - 45) / 30, 0, 1);
    const plano = dir(aR, 90 - 55 * pose.puntillas), sigue = dir(aR, fR + 90 - 55 * pose.puntillas);
    const dF = unidad(entre(plano, sigue, kPie));
    const K = mas(Hc, dM, M.muslo), A = mas(K, dS, M.pierna);
    q['cadera' + l] = Hc;
    q['rodilla' + l] = K;
    q['tobillo' + l] = A;
    q['punta' + l] = mas(A, dF, M.pie);
    const nK = perpendicular(dM, dS, [0, 0, -1]);               // hacia donde se dobla la rodilla
    const nC = perpendicular(dS, dF.map((v) => -v), [0, 0, -1]); // la pantorrilla: al revés de la punta del pie
    const cu = b['cuadriceps' + l] || 0, is = b['isquios' + l] || 0, ge = b['gemelos' + l] || 0;
    if (cu > 0.12) mancha('pierna' + l, ['cuadriceps' + l], mas(entre(Hc, K, 0.45), nK, -(rPi * 0.4 + cu * 0.35)), dM, 8 + cu * 0.6, rPi * 0.7 + cu * 0.55);
    if (is > 0.12) mancha('pierna' + l, ['isquios' + l], mas(entre(Hc, K, 0.5), nK, rPi * 0.4 + is * 0.35), dM, 8 + is * 0.6, rPi * 0.7 + is * 0.5);
    if (ge > 0.12) mancha('pierna' + l, ['gemelos' + l], mas(entre(K, A, 0.3), nC, rPi * 0.35 + ge * 0.3), dS, 6 + ge * 0.5, rPi * 0.7 + ge * 0.5);

    // tronco: pectoral, dorsal y glúteo de este lado
    const pc = b['pecho' + l] || 0, dl = b.dorsales || 0, gl = b.gluteos || 0;
    if (pc > 0.12) mancha('tronco', ['pecho' + l], enTronco(s * w * 0.42, 9.5, rT * 0.55), dP, w * 0.4 + pc * 0.3, 3.2 + pc * 0.7);
    if (dl > 0.12) {
      const a1 = enTronco(s * rT * 0.8, 9, -0.5), a2 = enTronco(s * rT * 0.5, 25, -0.5);
      mancha('tronco', ['dorsales'], mas(entre(a1, a2, 0.4), dP, s * dl * 0.45), unidad(entre(a2, a1, 1).map((v, i) => v - a2[i])), 8 + dl * 0.4, 2.2 + dl * 0.9);
    }
    mancha('tronco', ['gluteos'], enTronco(s * 3.3, M.pecho + M.lumbar + 1.5, -(rT * 0.55 + gl * 0.3)), dL, 3.6 + gl * 0.4, 3.6 + gl * 0.65);

    // las líneas de un cuerpo definido (de frente o de espaldas)
    const vp = ver['pecho' + l] || 0;
    if (vp > 0.03) detalles.push({ cara: 1, fuerza: vp, puntos: [enTronco(s * 1.2, 12.5, rT), enTronco(s * w * 0.45, 15, rT * 0.95), enTronco(s * w * 0.85, 11, rT * 0.6)] });
    [16.5, 22, 27.5].forEach((y, i) => {
      const va = ver['abs' + (i + 1)] || 0;
      if (va > 0.03) detalles.push({ cara: 1, fuerza: va, puntos: [enTronco(s * 1.4, y, rT * 0.98), enTronco(s * 4.6, y, rT * 0.9)] });
    });
    const vl = ver.lumbares || 0;
    if (vl > 0.03) detalles.push({ cara: -1, fuerza: vl, puntos: [enTronco(s * 2.6, 25, -rT), enTronco(s * 2.6, 34, -rT)] });
  }
  const vc = Math.max(ver.abs1 || 0, ver.pechoI || 0, ver.pechoD || 0);
  if (vc > 0.03) detalles.push({ cara: 1, fuerza: vc, puntos: [enTronco(0, 12.5, rT), enTronco(0, 31, rT * 0.98)] });
  if ((ver.gluteos || 0) > 0.03) detalles.push({ cara: -1, fuerza: ver.gluteos, puntos: [enTronco(0, M.pecho + M.lumbar - 2, -rT), enTronco(0, M.pecho + M.lumbar + 5, -rT * 0.8)] });
  // la barriga (gordito), hacia delante
  const r = cuerpo.vientre;
  if (r > 2) mancha('tronco', [], mas(mas(q.pelvis, uL, r * 0.85), fL, r * 0.42), uL, r, r * 1.05);

  // Visto desde la pantalla: girado hacia donde mira, en espejo, estirado y girado en el plano.
  const ct = cos(pose.orientacion), st = sen(pose.orientacion);
  const e = pose.estirar;
  const gi = espejo ? -pose.giro : pose.giro, cg = cos(gi), sg = sen(gi);
  const cy = apoyo === 'pies' ? Math.max(q.tobilloI[1], q.tobilloD[1], q.puntaI[1], q.puntaD[1]) : 0;
  const vista = ([x, y, z]) => {
    let X = (x * ct + z * st) * (1 - e * 0.5);
    if (espejo) X = -X;
    const Y = cy + (y - cy) * (1 + e);
    return [X * cg - Y * sg, X * sg + Y * cg, (-x * st + z * ct) * (1 - e * 0.5)];
  };
  const p = {};
  for (const k in q) p[k] = vista(q[k]);

  // las partes, cada una con sus cápsulas y sus manchas, y su profundidad para ordenarlas
  const media = (...ks) => ks.reduce((a, k) => a + p[k][2], 0) / ks.length;
  const partes = [
    { nombre: 'tronco', clave: -1, segmentos: [[p.cuello, p.pelvis, rT], [p.hombroI, p.hombroD, M.rHombros + 0.6 * g]], manchas: [] },
    { nombre: 'cabeza', clave: p.cabeza[2] - 0.5, segmentos: [], manchas: [], centro: p.cabeza, radio: M.cabeza },
  ];
  for (const l of ['I', 'D']) {
    partes.push({ nombre: 'brazo' + l, clave: media('hombro' + l, 'codo' + l, 'mano' + l),
      segmentos: [[p['hombro' + l], p['codo' + l], rB], [p['codo' + l], p['mano' + l], rB * 0.92]], manchas: [] });
    partes.push({ nombre: 'pierna' + l, clave: media('cadera' + l, 'rodilla' + l, 'tobillo' + l) - 1.5,
      segmentos: [[p['cadera' + l], p['rodilla' + l], rPi], [p['rodilla' + l], p['tobillo' + l], rPi * 0.92],
        [p['tobillo' + l], p['punta' + l], M.rPie]], manchas: [] });
  }
  const porNombre = Object.fromEntries(partes.map((x) => [x.nombre, x]));
  for (const m of manchas) {
    const c = vista(m.c), a = vista(mas(m.c, m.eje, m.largo)), z = vista(mas(m.c, m.eje, -m.largo));
    const dx = a[0] - z[0], dy = a[1] - z[1];
    porNombre[m.parte].manchas.push({ c, rx: Math.max(Math.hypot(dx, dy) / 2, m.ancho * 0.9), ry: m.ancho,
      rot: Math.atan2(dy, dx), musculos: m.musculos });
  }
  partes.sort((x, y) => x.clave - y.clave);

  // un punto de la cara (x a la derecha, y hacia abajo, desde el centro de la cabeza), ya visto desde la pantalla
  const asiente = pose.cabezaAd + iP * 0.5, girada = pose.cabezaGiro;
  const cara = (x, y, encima = 0.4) => {
    const R = M.cabeza + encima;
    let z = Math.sqrt(Math.max(0, R * R - x * x - y * y));
    let yy = y * cos(asiente) + z * sen(asiente);
    z = -y * sen(asiente) + z * cos(asiente);
    const xx = x * cos(aC) - yy * sen(aC);
    yy = x * sen(aC) + yy * cos(aC);
    const x2 = xx * cos(girada) + z * sen(girada);
    z = -xx * sen(girada) + z * cos(girada);
    return vista([q.cabeza[0] + x2, q.cabeza[1] + yy, q.cabeza[2] + z]);
  };

  let bajo = p.cabeza[1] + M.cabeza;
  for (const parte of partes) {
    for (const [a, z, rr] of parte.segmentos) bajo = Math.max(bajo, a[1] + rr, z[1] + rr);
    for (const m of parte.manchas) bajo = Math.max(bajo, m.c[1] + Math.max(m.rx, m.ry) * 0.8);
  }
  const frente = vista(mas(q.cuello, fP, 1))[2] - p.cuello[2]; // 1 si nos mira de frente, −1 de espaldas
  return {
    p, partes, cara, frente, bajo,
    detalles: detalles.map((d) => ({ ...d, puntos: d.puntos.map(vista) })),
    pies: Math.max(p.tobilloI[1], p.tobilloD[1], p.puntaI[1], p.puntaD[1]) + M.rPie,
    radios: { tronco: rT, brazo: rB, pierna: rPi },
  };
}
