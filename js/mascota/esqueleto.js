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

// Su sexo, a elegir (D-139): «Ella», «Él» o «Sin definir» (el de serie, y el de una mascota sin ese dato). Solo
// cambian las proporciones, nunca con forma de pecho ni nada en la entrepierna: los hombros (de base y lo que crecen al
// definirse), su grosor, la cadera (la mitad de lo que separa las piernas), la cintura (lo que se estrecha el tronco
// abajo), los glúteos y las piernas que gana al definirse, los brazos y lo que se le marca el pecho (en «Ella», nada:
// ni manchas redondas ni líneas debajo; con el pecho encendido, una franja plana arriba, junto a las clavículas).
export const SEXOS = Object.freeze(['neutro', 'ella', 'el']);
export const CUERPOS = Object.freeze({
  el: Object.freeze({ hombros: [8.5, 3.2], rHombros: 1, cadera: 4.5, caderaR: 1.1, cintura: 1, gluteos: 0, piernas: 0, brazos: 1, pecho: 1, manos: 1, pies: 1, barriga: 1 }),
  neutro: Object.freeze({ hombros: [7.9, 2.2], rHombros: 0.95, cadera: 5, caderaR: 1.15, cintura: 0.91, gluteos: 0.25, piernas: 0.22, brazos: 0.95, pecho: 0.55, manos: 0.97, pies: 0.97, barriga: 1 }),
  // D-141, más femenina: hombros más estrechos (y que crecen menos), cintura más marcada, cadera algo más ancha, brazos
  // más finos, manos y pies algo más pequeños y, gordita, una barriga algo menos honda (con la cintura más estrecha,
  // de lado sobresalía de más: D-139); nunca con forma de pecho
  ella: Object.freeze({ hombros: [6.6, 0.9], rHombros: 0.84, cadera: 5.8, caderaR: 1.1, cintura: 0.74, gluteos: 0.55, piernas: 0.5, brazos: 0.85, pecho: 0, manos: 0.88, pies: 0.9, barriga: 0.82 }),
});
export const cuerpoDeSexo = (sexo) => CUERPOS[sexo] || CUERPOS.neutro;
// Su pelo, con «Ella» (D-141): dos coletas (el de serie), una coleta alta, un moño o una coleta baja (la de la 1.5.0).
// Cómo es cada uno, en PEINADOS de traje-neon.js.
export const PEINADOS = Object.freeze(['coletas', 'alta', 'mono', 'coleta']);

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
  const S = cuerpo.proporciones || CUERPOS.neutro, def = cuerpo.def || 0; // su sexo (D-139)
  const rT = M.rTronco + 1.4 * g, rB = (M.rBrazo + 0.5 * g) * S.brazos, rPi = M.rPierna + 0.6 * g + S.piernas * def;
  const w = cuerpo.anchoHombros, ancho = S.cadera, rH = (M.rHombros + 0.6 * g) * S.rHombros;
  const aL = pose.lumbar, aP = aL + pose.pecho, aC = aP + pose.cabeza;
  const iL = pose.inclinar * 0.45, iP = pose.inclinar;
  const q = {}, manchas = [], detalles = [];
  // «mas», lo que la cambia (D-139): «escorzo», la normal hacia fuera de un músculo de la pierna (si la pierna viene hacia
  // nosotros, se aplasta y luego se quita: así no queda un círculo en la ingle); «lado», «prof» y «frente», sus otros dos
  // semiejes (un elipsoide de verdad: la barriga, ancha de frente y plana de lado); «liso», sin brillo.
  const mancha = (parte, musculos, c, eje, largo, ancho, mas = {}) => manchas.push({ parte, musculos, c, eje, largo, ancho, ...mas });

  q.pelvis = [0, 0, 0];
  const uL = arriba(aL, iL), uP = arriba(aP, iP);
  const dL = [cos(aL), sen(aL), 0], dP = [cos(aP), sen(aP), 0];
  const fL = cruz(uL, dL), fP = cruz(uP, dP); // su delante
  q.lumbar = mas(q.pelvis, uL, M.lumbar);
  q.cintura = mas(q.pelvis, uL, rT * 0.72); // donde acaba el tronco: más arriba que la pelvis (D-135, D-139: nada redondo entre las piernas)
  q.cuello = mas(q.lumbar, uP, M.pecho);
  q.cabeza = mas(q.cuello, arriba(aC, iP * 0.8 + pose.cabezaAd * 0.2), M.cuello + M.cabeza);
  // un punto del tronco: x a su derecha, y hacia abajo desde el cuello, z hacia su delante
  const enTronco = (x, y, z) => (y <= M.pecho
    ? mas(mas(mas(q.cuello, dP, x), uP, -y), fP, z)
    : mas(mas(mas(q.pelvis, dL, x), uL, M.pecho + M.lumbar - y), fL, z));

  for (const [l, s] of [['I', -1], ['D', 1]]) q['pelvis' + l] = mas([s * ancho * 0.8, 0, 0], uL, rT * 0.5);
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
    const Hc = [s * ancho, 0, 0];
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
    // D-139: el cuádriceps, más abajo en el muslo (lejos de la ingle); los tres, con su normal para el escorzo
    const nKm = nK.map((v) => -v);
    if (cu > 0.12) mancha('pierna' + l, ['cuadriceps' + l], mas(entre(Hc, K, 0.6), nKm, rPi * 0.4 + cu * 0.35), dM, 7.5 + cu * 0.6, rPi * 0.7 + cu * 0.55, { escorzo: nKm });
    if (is > 0.12) mancha('pierna' + l, ['isquios' + l], mas(entre(Hc, K, 0.56), nK, rPi * 0.4 + is * 0.35), dM, 7.5 + is * 0.6, rPi * 0.7 + is * 0.5, { escorzo: nK });
    if (ge > 0.12) mancha('pierna' + l, ['gemelos' + l], mas(entre(K, A, 0.3), nC, rPi * 0.35 + ge * 0.3), dS, 6 + ge * 0.5, rPi * 0.7 + ge * 0.5, { escorzo: nC });

    // tronco: pectoral, dorsal y glúteo de este lado
    const pc = (b['pecho' + l] || 0) * S.pecho, dl = b.dorsales || 0;
    if (pc > 0.12) mancha('tronco', ['pecho' + l], enTronco(s * w * 0.42, 9.5, rT * 0.55), dP, w * 0.4 + pc * 0.3, 3.2 + pc * 0.7);
    if (dl > 0.12) {
      const a1 = enTronco(s * rT * 0.8, 9, -0.5), a2 = enTronco(s * rT * 0.5, 25, -0.5);
      mancha('tronco', ['dorsales'], mas(entre(a1, a2, 0.4), dP, s * dl * 0.45), unidad(entre(a2, a1, 1).map((v, i) => v - a2[i])), 8 + dl * 0.4, 2.2 + dl * 0.9);
    }

    // las líneas de un cuerpo definido (de frente o de espaldas)
    const vp = (ver['pecho' + l] || 0) * S.pecho;
    if (vp > 0.03) detalles.push({ cara: 1, fuerza: vp, puntos: [enTronco(s * 1.2, 12.5, rT), enTronco(s * w * 0.45, 15, rT * 0.95), enTronco(s * w * 0.85, 11, rT * 0.6)] });
    [16.5, 22, 27.5].forEach((y, i) => {
      const va = ver['abs' + (i + 1)] || 0;
      if (va > 0.03) detalles.push({ cara: 1, fuerza: va, puntos: [enTronco(s * 1.4, y, rT * 0.98), enTronco(s * 4.6, y, rT * 0.9)] });
    });
    const vl = ver.lumbares || 0;
    if (vl > 0.03) detalles.push({ cara: -1, fuerza: vl, puntos: [enTronco(s * 2.6, 25, -rT), enTronco(s * 2.6, 34, -rT)] });
  }
  const vc = Math.max(ver.abs1 || 0, (ver.pechoI || 0) * S.pecho, (ver.pechoD || 0) * S.pecho);
  if (vc > 0.03) detalles.push({ cara: 1, fuerza: vc, puntos: [enTronco(0, 12.5, rT), enTronco(0, 31, rT * 0.98)] });
  // los glúteos (D-139): su volumen, una sola franja ancha y sin brillo, más arriba (de espaldas, nada redondo entre las
  // piernas), que nunca se enciende; lo que siente, una franja fina más arriba aún, en los riñones
  const gl = (b.gluteos || 0) + S.gluteos * def;
  mancha('tronco', [], enTronco(0, M.pecho + M.lumbar - 4.8, -(rT * 0.55 + gl * 0.3)), dL, ancho * 0.75 + 4 + gl * 0.5, 3 + gl * 0.42, { liso: true });
  mancha('tronco', ['gluteos'], enTronco(0, M.pecho + M.lumbar - 8.5, -rT * 0.5), dL, ancho * 0.7 + 3, 2 + gl * 0.15, { liso: true });
  // la línea de los glúteos (D-139): corta y por encima de la ingle (antes bajaba entre las piernas)
  if ((ver.gluteos || 0) > 0.03) detalles.push({ cara: -1, fuerza: ver.gluteos, puntos: [enTronco(0, M.pecho + M.lumbar - 7.5, -rT), enTronco(0, M.pecho + M.lumbar - 3.5, -rT * 0.92)] });
  // «Ella», con el pecho encendido o muy marcado: una franja plana arriba, junto a las clavículas (nunca dos manchas)
  const pcE = Math.max(b.pechoI || 0, b.pechoD || 0) * (1 - S.pecho);
  if (S.pecho < 0.5 && pcE > 0.3) mancha('tronco', ['pechoI', 'pechoD'], enTronco(0, 5.5, rT * 0.6), dP, w * 0.72, 1.6 + 0.2 * Math.min(pcE, 3), { liso: true });
  // la barriga (gordito, D-139): a la altura de la tripa, ancha de frente y plana de lado, con lo de abajo dentro de la
  // cadera (sin colgar ni dejar un hueco debajo) y sin brillo
  const r = cuerpo.vientre;
  if (r > 2) {
    mancha('tronco', [], mas(mas(q.pelvis, uL, 10.5 + r * 0.15), fL, r * 0.36), uL, r * 0.78, rT * 0.9 + r * 0.2,
      { lado: dL, prof: r * 0.66 * (S.barriga ?? 1), frente: fL, liso: true });
  }

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
    // el tronco, hasta la cintura; la cadera, una barra ancha de lado a lado (como los hombros)
    // (D-139: la cadera, subida: su borde de abajo queda dentro de la U invertida que hacen las piernas al salir)
    { nombre: 'tronco', clave: -1, segmentos: [[p.cuello, p.cintura, rT], [p.pelvisI, p.pelvisD, rT * 0.62], [p.hombroI, p.hombroD, rH]], manchas: [],
      cintura: S.cintura, caderaR: S.caderaR },
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
  const zTronco = (p.cuello[2] + p.pelvis[2]) / 2;
  const ingle = vista(mas(q.pelvis, uL, -rT * 0.5)); // D-139: la ingle, algo por debajo de la pelvis
  for (const m of manchas) {
    const c = vista(m.c), a = vista(mas(m.c, m.eje, m.largo)), z = vista(mas(m.c, m.eje, -m.largo));
    const dx = a[0] - z[0], dy = a[1] - z[1];
    // «detras»: la de detrás del tronco (los glúteos, de frente): la tapa el tronco, así que no se pinta
    const detras = m.parte === 'tronco' && c[2] < zTronco - 1.5;
    if (m.prof) {
      // un elipsoide de verdad (la barriga, D-139): su silueta, de sus tres semiejes ya vistos desde la pantalla
      let sxx = 0, sxy = 0, syy = 0;
      for (const [v, k] of [[m.eje, m.largo], [m.lado, m.ancho], [m.frente, m.prof]]) {
        const e = vista(mas(m.c, v, k)), x = e[0] - c[0], y = e[1] - c[1];
        sxx += x * x; sxy += x * y; syy += y * y;
      }
      const tr = (sxx + syy) / 2, de = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
      porNombre[m.parte].manchas.push({ c, rx: Math.sqrt(tr + de), ry: Math.sqrt(Math.max(0.01, tr - de)),
        rot: 0.5 * Math.atan2(2 * sxy, sxx - syy), musculos: m.musculos, detras: false, liso: true });
      continue;
    }
    let ancho = m.ancho;
    if (m.escorzo) {
      // D-139: un músculo de la pierna, con la pierna hacia nosotros (o del lado que no se ve): se aplasta y se quita;
      // y nunca cerca de la ingle (con su brillo, a más de 3 unidades de ella)
      const k = Math.hypot(dx, dy) / (2 * m.largo);
      if (k < 0.7 || vista(mas(m.c, m.escorzo, 1))[2] - c[2] < -0.6) continue;
      ancho *= 0.55 + 0.45 * tramo(k, 0.7, 1);
      const rMax = Math.max(Math.hypot(dx, dy) / 2, ancho) + 2.6;
      if (Math.hypot(c[0] - ingle[0], c[1] - ingle[1]) - rMax < 3) continue;
    }
    porNombre[m.parte].manchas.push({ c, rx: Math.max(Math.hypot(dx, dy) / 2, ancho * 0.9), ry: ancho,
      rot: Math.atan2(dy, dx), musculos: m.musculos, detras, ...(m.liso ? { liso: true } : {}) });
  }
  partes.sort((x, y) => x.clave - y.clave);

  // un punto de la cara (x a la derecha, y hacia abajo, desde el centro de la cabeza), ya visto desde la pantalla; con
  // «atras», el de la nuca (para lo que da la vuelta a la cabeza, como la cinta)
  const asiente = pose.cabezaAd + iP * 0.5, girada = pose.cabezaGiro;
  const cara = (x, y, encima = 0.4, atras = false) => {
    const R = M.cabeza + encima;
    let z = (atras ? -1 : 1) * Math.sqrt(Math.max(0, R * R - x * x - y * y));
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
