// Esqueleto de la mascota: medidas, poses y cinemática (de una pose a los puntos del cuerpo).
// No dibuja nada: cada traje pinta estos puntos a su manera (D-130). Así, otro estilo es solo otro traje.
// Unidades: las de los bocetos (la cabeza, de 17 de radio); el traje las pasa a píxeles.
// Ángulos, en grados. En brazos y piernas, positivo es hacia fuera del cuerpo, igual en los dos lados.
// «I» y «D»: el lado izquierdo y el derecho de la pantalla.

export const MEDIDAS = Object.freeze({
  cadera: 4, lumbar: 21, pecho: 21, cuello: 4, cabeza: 17,
  hombroBajo: 5, brazo: 22, antebrazo: 21, muslo: 26.5, pierna: 25,
});

// De pie y tranquila, como el boceto 7.
export const POSE_BASE = Object.freeze({
  giro: 0,                       // todo el cuerpo, alrededor de la pelvis (positivo: como las agujas del reloj)
  lumbar: 0, pecho: 0, cabeza: 0, // inclinación de cada tramo (positivo: hacia la derecha)
  hombros: 0,                    // encogerlos (unidades hacia arriba)
  brazoI: 14, codoI: -10, brazoD: 14, codoD: -10,
  musloI: 7, rodillaI: 0, musloD: 7, rodillaD: 0,
  escTronco: 1, escMusloI: 1, escMusloD: 1, escPiernaI: 1, escPiernaD: 1, // escorzo: el largo aparente
  espaldas: 0,                   // 0 de frente, 1 de espaldas, 2 de frente otra vez (una vuelta entera)
  estirar: 0,                    // estirarse (+) o aplastarse (−) desde donde se apoya
  alto: 0,                       // despegue del suelo, en unidades (saltos)
});
export const CAMPOS = Object.keys(POSE_BASE);

export const lerp = (a, b, t) => a + (b - a) * t;
export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);
export const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
export const tramo = (v, a, b) => suave((v - a) / (b - a)); // 0 antes de a, 1 después de b

export function mezclar(a, b, t) {
  const r = {};
  for (const k of CAMPOS) r[k] = a[k] + (b[k] - a[k]) * t;
  return r;
}

// Una vuelta entera (espaldas 2) es lo mismo que de frente (0): así una mezcla no da la vuelta al revés.
export function normalizar(pose) {
  let e = pose.espaldas % 2;
  if (e >= 1.5) e -= 2;
  return e === pose.espaldas ? pose : { ...pose, espaldas: e };
}

const RAD = Math.PI / 180;
const hacia = (phi) => [Math.sin(phi * RAD), Math.cos(phi * RAD)]; // 0 abajo, 90 derecha, 180 arriba
const mas = (a, v, k) => [a[0] + v[0] * k, a[1] + v[1] * k];
const entre = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/**
 * De una pose a los puntos del cuerpo, con la pelvis en (0, 0) y la y hacia abajo.
 * cuerpo: { anchoHombros, vientre (radio de la barriga, 0 sin barriga), bultos: { clave: unidades } }.
 * Devuelve { p (puntos), c (controles de las curvas: los bultos de los músculos), frente, ladeo, ángulos… }.
 */
export function cinematica(pose, cuerpo, { espejo = false, apoyo = 'pies' } = {}) {
  const M = MEDIDAS;
  const b = cuerpo.bultos || {};
  const p = {};
  const c = {};
  const aL = pose.lumbar, aP = aL + pose.pecho, aC = aP + pose.cabeza;
  const arriba = (a) => hacia(180 - a);
  const derecha = (a) => hacia(90 - a);
  const et = pose.escTronco;

  p.pelvis = [0, 0];
  p.lumbar = mas(p.pelvis, arriba(aL), M.lumbar * et);
  p.cuello = mas(p.lumbar, arriba(aP), M.pecho * et);
  p.cabeza = mas(p.cuello, arriba(aC), M.cuello + M.cabeza);
  // x hacia la derecha; y hacia abajo, desde el cuello (pecho) o desde la pelvis (lumbar)
  const enPecho = (x, y) => mas(mas(p.cuello, derecha(aP), x), arriba(aP), -y * et);
  const enLumbar = (x, y) => mas(mas(p.pelvis, derecha(aL), x), arriba(aL), -y * et);

  const ancho = cuerpo.anchoHombros;
  for (const [lado, s] of [['I', -1], ['D', 1]]) {
    // brazo
    const H = mas(mas(p.cuello, derecha(aP), s * ancho), arriba(aP), pose.hombros - M.hombroBajo * et);
    const phiB = -aP + s * pose['brazo' + lado];
    const phiA = phiB + s * pose['codo' + lado];
    const E = mas(H, hacia(phiB), M.brazo);
    p['hombro' + lado] = H;
    p['codo' + lado] = E;
    p['mano' + lado] = mas(E, hacia(phiA), M.antebrazo);
    const lat = hacia(phiB + s * 90); // el lado de fuera del brazo
    const flex = Math.sign(pose['codo' + lado]) || -1; // hacia dónde se dobla el codo
    const bultoB = (b['biceps' + lado] || 0) - (b['triceps' + lado] || 0);
    c['brazo' + lado] = mas(entre(H, E, 0.5), lat, 2 * flex * bultoB);
    // deltoides: una tapa por fuera del hombro
    const dt = b['deltoides' + lado] || 0;
    const u = hacia(phiB);
    p['deltA' + lado] = mas(mas(H, u, -1.4), lat, -0.4);
    c['delt' + lado] = mas(mas(H, lat, 3.2 + 2.2 * dt), u, 1.4);
    p['deltB' + lado] = mas(mas(H, u, 6.5 + 1.4 * dt), lat, 1.9);

    // pierna
    const Hc = [s * M.cadera, 0];
    const phiM = s * pose['muslo' + lado];
    const phiP = phiM + s * pose['rodilla' + lado];
    const K = mas(Hc, hacia(phiM), M.muslo * pose['escMuslo' + lado]);
    const F = mas(K, hacia(phiP), M.pierna * pose['escPierna' + lado]);
    p['cadera' + lado] = Hc;
    p['rodilla' + lado] = K;
    p['pie' + lado] = F;
    const flexR = Math.sign(pose['rodilla' + lado]) || -1;
    const bultoM = (b['isquios' + lado] || 0) - (b['cuadriceps' + lado] || 0);
    c['muslo' + lado] = mas(entre(Hc, K, 0.5), hacia(phiM + s * 90), 2 * flexR * bultoM);
    c['pierna' + lado] = mas(entre(K, F, 0.34), hacia(phiP + s * 90), 2 * (b['gemelos' + lado] || 0));

    // pectoral: la línea de debajo
    const pc = b['pecho' + lado] || 0;
    p['pecA' + lado] = enPecho(s * 1.3, M.hombroBajo + 1.6);
    c['pec' + lado] = enPecho(s * ancho * 0.55, M.hombroBajo + 7.6 + 2.4 * pc);
    p['pecB' + lado] = enPecho(s * (ancho - 0.6), M.hombroBajo + 3.2);
    // la V de la espalda, del hombro a la cintura
    p['cintura' + lado] = enLumbar(s * 5.2, -5);
    c['dorsal' + lado] = mas(entre(H, p['cintura' + lado], 0.45), derecha(aP), s * (1.2 + 2 * (b.dorsales || 0)));
    // glúteos y lumbares (se ven de espaldas)
    const gl = b.gluteos || 0;
    p['glA' + lado] = enLumbar(s * 0.9, -4.5);
    c['gl' + lado] = enLumbar(s * (9 + 1.6 * gl), -4.5 - 0.6 * gl);
    p['glB' + lado] = enLumbar(s * (4.2 + 0.4 * gl), 4.8 + 0.9 * gl);
    p['lbA' + lado] = enLumbar(s * 2.8, -17.5);
    c['lb' + lado] = enLumbar(s * (3.4 + 1.3 * (b.lumbares || 0)), -12);
    p['lbB' + lado] = enLumbar(s * 2.8, -6.5);
  }
  // abdominales: tres filas de dos rayitas, a los lados de la columna
  const filas = [[enPecho(0, 14.5), derecha(aP)], [enLumbar(0, -14.5), derecha(aL)], [enLumbar(0, -8), derecha(aL)]];
  filas.forEach(([centro, dir], i) => {
    p[`abs${i + 1}Ia`] = mas(centro, dir, -4.6);
    p[`abs${i + 1}Ib`] = mas(centro, dir, -1.5);
    p[`abs${i + 1}Da`] = mas(centro, dir, 1.5);
    p[`abs${i + 1}Db`] = mas(centro, dir, 4.6);
  });
  // barriga (gordito): un óvalo apoyado en la pelvis
  p.vientre = enLumbar(0, -cuerpo.vientre * 0.9);

  // girarse (de espaldas), espejo, estirarse y el giro de todo el cuerpo
  const vuelta = Math.cos(Math.PI * pose.espaldas); // 1 de frente, −1 de espaldas
  const sx = (0.3 + 0.7 * Math.abs(vuelta)) * (espejo ? -1 : 1);
  const e = pose.estirar;
  const cy = apoyo === 'pies' ? Math.max(p.pieI[1], p.pieD[1]) : 0;
  const giro = espejo ? -pose.giro : pose.giro;
  const cg = Math.cos(giro * RAD), sg = Math.sin(giro * RAD);
  const mover = (q) => {
    const x = q[0] * sx * (1 - e * 0.5);
    const y = cy + (q[1] - cy) * (1 + e);
    return [x * cg - y * sg, x * sg + y * cg];
  };
  for (const k in p) p[k] = mover(p[k]);
  for (const k in c) c[k] = mover(c[k]);

  const signo = espejo ? -1 : 1;
  return {
    p, c,
    frente: vuelta,                                  // > 0: se le ve la cara
    ladeo: -Math.sin(Math.PI * pose.espaldas) * signo, // hacia dónde se le va la cara al girarse
    angCabeza: signo * aC + giro,
    angLumbar: signo * aL + giro,
    anchoX: Math.abs(sx) * (1 - e * 0.5),
    altoY: 1 + e,
    vientre: cuerpo.vientre,
  };
}

// El punto más bajo del cuerpo (para apoyarlo tumbado), en unidades.
export function masBajo(cin) {
  let y = cin.p.cabeza[1] + MEDIDAS.cabeza;
  for (const k of ['pieI', 'pieD', 'rodillaI', 'rodillaD', 'manoI', 'manoD', 'codoI', 'codoD', 'caderaI', 'caderaD', 'pelvis', 'cuello']) {
    if (cin.p[k][1] > y) y = cin.p[k][1];
  }
  if (cin.vientre > 0.5) y = Math.max(y, cin.p.vientre[1] + cin.vientre * cin.altoY);
  return y;
}
