// Traje de neón con volumen (D-130), camino «orgánico» (trabajo, sobre «seguro», D-139): un cuerpo de arcilla blanda, como
// un juguete de vinilo. En vez de unir cápsulas con trazados, cada capa del cuerpo es un campo de distancias (lo lejos que
// está cada punto de su silueta) con uniones suaves (smooth-min): hombros, cintura, cadera, codos, rodillas, manos y pies
// se funden sin piezas. Se pinta píxel a píxel, a la resolución del lienzo y solo en la caja del cuerpo: el borde sale de
// la distancia (más grueso por fuera que por dentro) y la luz, de la pendiente del campo (cada parte, una almohada
// redonda, con la misma luz de arriba a la izquierda para todas), con un filo claro de neón por dentro del borde. El halo,
// del mismo campo en una rejilla gruesa: un resplandor que se apaga poco a poco. La cabeza, una bola de verdad, con la cara
// del globo; la cara, la cinta, las chispas y lo que lleva en la mano, con trazos, como siempre.
// No decide nada: otro estilo sería otro traje como este.
// En la app (D-133), además: el color de su luz (LUCES), un lienzo pequeño que va con ella («origen» de dibujar()) y la
// franja de la pantalla donde se ve («recorte»).

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
const suave = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
// Un cuerpo de verdad (D-138): cuánto engorda o adelgaza cada tramo en su raíz y en su punta, por su radio en el
// esqueleto: más gruesos junto al cuerpo y más finos hacia la muñeca y el tobillo.
// En el camino «orgánico», algo más rellenos y con menos punta: de juguete de vinilo.
const AFINAR = {
  brazo: [[1.3, 1.1], [1.12, 0.95]],    // brazo y antebrazo
  pierna: [[1.32, 1.06], [1.08, 0.9]],  // muslo y pierna (el pie, aparte: una zapatilla)
};
// ——— La arcilla (camino «orgánico») ———
// Cuánto se funde cada unión (smooth-min, en unidades: más, más blanda): las piezas del tronco entre sí, la raíz de cada
// brazo o pierna con el tronco, las articulaciones (codo, rodilla), la mano y el pie con su tramo, cada músculo con lo suyo,
// las piernas que van con el tronco (poco: si no, se unirían entre ellas como una falda) y la coleta.
const FUNDE = { tronco: 4.5, raiz: 4, junta: 2.4, mano: 2.2, pie: 2.2, musculo: 1.8, union: 1.6, coleta: 2 };
const RAIZ = 0.45; // lo de arriba del brazo o del muslo que se funde con el tronco (el resto no: no se pega a él)
// Lo hondo de la «almohada» de cada capa (unidades): hasta ahí, su luz se curva como algo redondo; más dentro, plana.
const ALMOHADA = { tronco: 8.5, extremidad: 5.2, cabeza: 18.2, coleta: 3 };
const BORDE_FUERA = 1.55, BORDE_DENTRO = 0.8; // el borde: más grueso en la silueta que donde una parte pasa por delante
// cada forma, algo más gorda que en el esqueleto: en la 1.4.0 el borde iba por fuera de ellas; aquí, por dentro
const ENGORDA = 1.25;
const HALO_PASO = 3;                         // la rejilla del halo (unidades); hasta dónde llega, en ESTILO
const LEJOS = 1e4;
const unidad = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const [LX, LY, LZ] = unidad([-0.45, -0.62, 0.64]);   // la luz, de arriba a la izquierda y algo de delante
const [LX2, LY2] = unidad([LX, LY]);                 // y en la pantalla (para el filo)
const [HX, HY, HZ] = unidad([LX, LY, LZ + 1]);       // entre la luz y nosotros (el brillo de la cabeza)
// Cada tema: los tonos de la sombra y de la luz (hacia el negro, −, o hacia el blanco, +), el filo de neón (cuánto y lo
// ancho), el brillo de la cabeza y el halo (lo que se apaga, en unidades, y su fuerza: el de cerca y el de lejos; y hasta
// dónde llega: en claro, más estrecho y más saturado, que si no parece una pegatina; en oscuro, un resplandor).
const ESTILO = {
  claro: { t0: -0.32, t1: 0.24, filo: 0.3, filoAncho: 1.9, brillo: 0.8, halo: [1.8, 3.2], haloK: [2.6, 2.2], alcance: 5.5 },
  oscuro: { t0: -0.4, t1: 0.17, filo: 0.62, filoAncho: 2.2, brillo: 0.72, halo: [2.8, 5.6], haloK: [1.4, 1.8], alcance: 9 },
};
const rgbs = new Map();
function rgbDe(color) {
  let v = rgbs.get(color);
  if (!v) {
    v = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    rgbs.set(color, v);
  }
  return v;
}
// Las formas del cuerpo (unidades, ya vistas desde la pantalla): un tramo que se estrecha (de radio r1 en a a r2 en b), un
// disco o una elipse; «k», cuánto se funde con lo de antes de su capa.
const tramoDe = (a, b, r1, r2, k = 0) => ({ t: 0, ax: a[0], ay: a[1], bx: b[0], by: b[1], r1: r1 + ENGORDA, r2: r2 + ENGORDA, k });
const discoDe = (c, r, k = 0) => ({ t: 1, cx: c[0], cy: c[1], r: r + ENGORDA, k });
const elipseDe = (c, rx, ry, rot, k = 0) => ({ t: 2, cx: c[0], cy: c[1], rx: Math.max(0.3, rx) + ENGORDA, ry: Math.max(0.3, ry) + ENGORDA, co: Math.cos(rot), si: Math.sin(rot), k });
function cajaForma(s) {
  if (s.t === 0) return [Math.min(s.ax - s.r1, s.bx - s.r2), Math.min(s.ay - s.r1, s.by - s.r2), Math.max(s.ax + s.r1, s.bx + s.r2), Math.max(s.ay + s.r1, s.by + s.r2)];
  const r = s.t === 1 ? s.r : Math.max(s.rx, s.ry);
  return [s.cx - r, s.cy - r, s.cx + r, s.cy + r];
}
// la distancia de un punto a una forma (para el halo, en su rejilla gruesa; el cuerpo lo hace en bloque, más deprisa)
function distancia(s, x, y) {
  if (s.t === 0) {
    const vx = s.bx - s.ax, vy = s.by - s.ay, l2 = vx * vx + vy * vy, px = x - s.ax, py = y - s.ay;
    const t = l2 > 1e-9 ? lim((px * vx + py * vy) / l2, 0, 1) : 0;
    const dx = px - vx * t, dy = py - vy * t;
    return Math.sqrt(dx * dx + dy * dy) - (s.r1 + (s.r2 - s.r1) * t);
  }
  if (s.t === 1) return Math.sqrt((x - s.cx) ** 2 + (y - s.cy) ** 2) - s.r;
  return distElipse(s, x - s.cx, y - s.cy);
}
// una elipse: la distancia a lo largo del rayo desde su centro (casi la de verdad, y sin saltos dentro)
function distElipse(s, x, y) {
  const lx = (x * s.co + y * s.si) / s.rx, ly = (-x * s.si + y * s.co) / s.ry;
  const q = Math.sqrt(lx * lx + ly * ly), g = Math.sqrt((lx * lx) / (s.rx * s.rx) + (ly * ly) / (s.ry * s.ry));
  return g > 1e-9 ? ((q - 1) * q) / g : -Math.min(s.rx, s.ry);
}

export function crearTrajeNeon(lienzo) {
  const ctx = lienzo.getContext('2d');
  const lienzos = [document.createElement('canvas'), document.createElement('canvas')]; // el cuerpo, en dos pases
  const lctx = lienzos.map((c) => c.getContext('2d'));
  let ancho = 0, alto = 0, dpr = 1, huesos = false, base = 1;
  let tema = 'claro', luz = 'verde', col = LUCES.verde.claro;
  let ox = 0, oy = 0, recorte = null; // dónde cae el lienzo (px del escenario) y la franja donde se ve
  let brillo = 1; // cuánto brilla su halo (su página de Ajustes: suave, normal o intenso)
  // la caja del cuerpo, en px del lienzo (X0, Y0; bw × bh), y de ahí a unidades (ux0, uy0; h unidades por px)
  let W = 0, H = 0, bw = 0, bh = 0, X0 = 0, Y0 = 0, ux0 = 0, uy0 = 0, h = 1, ppu = 1;
  let campos = [], imagenes = [null, null], palabras = [null, null], dueno = null;
  let hCap = 0, hCampo = null, hx0 = 0, hy0 = 0, hnx = 0, hny = 0; // el halo: su rejilla
  let hIni = new Int32Array(0), hFin = new Int32Array(0); // y, en cada fila de su rejilla, de qué nudo a qué nudo llega
  // la rejilla de los campos (un nudo cada 2 px de la imagen): su tamaño reservado (GW × GH) y el de ahora (gw × gh), su
  // paso en unidades (hc), dónde cae su primer nudo (gx0, gy0) y dónde puede haber campos (gi0…gj1); y, en cada nudo, la
  // distancia de la capa más cercana (Gmin)
  let GW = 0, GH = 0, gw = 0, gh = 0, hc = 2, gx0 = 0, gy0 = 0, gi0 = 0, gi1 = 0, gj0 = 0, gj1 = 0, Gmin = null;
  const val = new Float64Array(24);
  let copias = new Uint32Array(0), copiasD = new Uint8Array(0), copiasSi = new Uint8Array(0); // lo hondo, para la fila de abajo
  // de qué capa era cada parte en el fotograma de antes (para no saltar de una a otra en el límite)
  const antes = new Map();
  let tAntes = -1e9;

  function reservar(w, hh) {
    if (w <= W && hh <= H) return;
    W = Math.max(w, W, 64);
    H = Math.max(hh, H, 64);
    for (let i = 0; i < 2; i++) {
      lienzos[i].width = W;
      lienzos[i].height = H;
      imagenes[i] = lctx[i].createImageData(W, H);
      palabras[i] = new Uint32Array(imagenes[i].data.buffer);
    }
    dueno = new Uint8Array(W * H);
    GW = (W >> 1) + 4;
    GH = (H >> 1) + 4;
    campos = [];
    Gmin = new Float32Array(GW * GH);
  }
  function campoLibre(n) {
    while (campos.length <= n) campos.push(new Float32Array(GW * GH));
    return campos[n];
  }
  // ——— El cuerpo, en piezas que se funden ———
  // El tronco: la espalda (del cuello a la cintura), los hombros, que caen del cuello, los costados (de cada hombro a la
  // cintura, más estrecha, y de ella a la cadera), la pelvis, el cuello y sus manchas (el pecho, la barriga…): todo
  // fundido, como una judía blanda. D-139: sin la barra de la cadera; la pelvis, subida, es una U invertida que cierran
  // las raíces de las piernas; la cintura, según su sexo.
  function troncoDe(f, tronco) {
    const p = f.cin.p, k = FUNDE.tronco;
    const [[, , rT], [a0, b0, rP]] = tronco.segmentos;
    const rH = tronco.segmentos[2][2];
    const ci = tronco.cintura || 1, rCad = f.cin.radios.pierna * (tronco.caderaR || 1.1);
    const formas = [
      tramoDe(p.cuello, p.cintura, rT, rT * 0.94 * ci),
      tramoDe(a0, b0, rP, rP, k), // la pelvis, subida: su borde de abajo, dentro de la U
      tramoDe(p.cuello, mezcla(p.cuello, p.cabeza, 0.55), rT * 0.62, rT * 0.52, k), // el cuello, corto: la cabeza se asienta
    ];
    for (const l of ['I', 'D']) {
      const w = [p.cintura[0] + (p['cadera' + l][0] - p.pelvis[0]) * 0.7 * ci, p.cintura[1] + (p['cadera' + l][1] - p.pelvis[1]) * 0.7 * ci];
      formas.push(
        tramoDe(p.cuello, p['hombro' + l], rT * 0.74, rH * 0.92, k), // el hombro, que cae del cuello
        tramoDe(p['hombro' + l], w, rH * 0.95, rT * 0.62 * ci, k),   // el costado, hasta la cintura
        tramoDe(w, p['cadera' + l], rT * 0.62 * ci, rCad, k),        // y hasta la cadera
      );
    }
    for (const m of tronco.manchas) if (!m.detras) formas.push(elipseDe(m.c, m.rx, m.ry, m.rot, k));
    return formas;
  }
  // Un brazo o una pierna: cada tramo, más grueso en la raíz que en la punta, fundidos en el codo o la rodilla; la mano,
  // una manopla redonda; el pie, una zapatilla (un óvalo bajo, de verdad en 3D: de frente, ancho; de lado, largo); sus
  // músculos, como bultos de la misma arcilla. Y su raíz (lo de arriba del primer tramo), que se funde con el tronco.
  function extremidad(f, parte) {
    const brazo = parte.nombre.startsWith('brazo');
    const k = brazo ? AFINAR.brazo : AFINAR.pierna;
    const sg = parte.segmentos;
    const formas = [];
    for (let i = 0; i < 2 && i < sg.length; i++) {
      const [a, b, r] = sg[i];
      formas.push(tramoDe(a, b, r * k[i][0], r * k[i][1], i ? FUNDE.junta : 0));
    }
    if (brazo && sg[1]) formas.push(manopla(sg[0][2], sg[1]));
    else if (!brazo && sg[2]) formas.push(zapatilla(sg));
    for (const m of parte.manchas) if (!m.detras) formas.push({ ...elipseDe(m.c, m.rx, m.ry, m.rot, FUNDE.musculo), musculo: true });
    const [a0, b0, r0] = sg[0], [k1, k2] = k[0];
    return {
      formas,
      raiz: tramoDe(a0, mezcla(a0, b0, RAIZ), r0 * k1, r0 * (k1 + (k2 - k1) * RAIZ), FUNDE.raiz),
      origen: a0, r0: r0 * k1, vivos: vivosDe(f, parte.manchas),
    };
  }
  function manopla(rB, [codo, mano]) {
    const dx = mano[0] - codo[0], dy = mano[1] - codo[1], l = Math.hypot(dx, dy) || 1;
    const k = lim(l / 19, 0, 1); // de punta (el antebrazo hacia nosotros), redonda
    const ry = rB * 1.2, rx = ry + (rB * 1.4 - ry) * k;
    return elipseDe([mano[0] + (dx / l) * 1.1 * k, mano[1] + (dy / l) * 1.1 * k], rx, ry, Math.atan2(dy, dx), FUNDE.mano);
  }
  function zapatilla(sg) {
    const K = sg[0][1], A = sg[1][1], P = sg[2][1];
    const d = unidad([P[0] - A[0], P[1] - A[1], P[2] - A[2]]);
    let up = [K[0] - A[0], K[1] - A[1], K[2] - A[2]];
    const kd = up[0] * d[0] + up[1] * d[1] + up[2] * d[2];
    up = [up[0] - d[0] * kd, up[1] - d[1] * kd, up[2] - d[2] * kd];
    up = Math.hypot(...up) < 0.3 ? [0, -1, 0] : unidad(up);
    const lat = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]];
    const c = [A[0] + d[0] * 2.5 - up[0] * 1.0, A[1] + d[1] * 2.5 - up[1] * 1.0];
    let sxx = 0, sxy = 0, syy = 0;
    for (const [v, s] of [[d, 5.2], [lat, 4.3], [up, 2.7]]) {
      const x = v[0] * s, y = v[1] * s;
      sxx += x * x; sxy += x * y; syy += y * y;
    }
    const tr = (sxx + syy) / 2, de = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
    return elipseDe(c, Math.sqrt(tr + de), Math.sqrt(Math.max(0.09, tr - de)), 0.5 * Math.atan2(2 * sxy, sxx - syy), FUNDE.pie);
  }
  // los músculos que siente: se le encienden por dentro, con una luz suave que se apaga hacia su borde, y laten
  function vivosDe(f, manchas) {
    let r = null;
    for (const m of manchas) {
      if (m.detras) continue;
      const i = Math.max(0, ...m.musculos.map((k) => f.cuerpo.luz[k] || 0));
      if (i < 0.04) continue;
      const late = i * (0.7 + 0.3 * Math.sin(f.t * TAU * 3.2));
      const rx = m.rx + 1.6, ry = m.ry + 1.6, e = Math.max(rx, ry);
      (r ||= []).push({ cx: m.c[0], cy: m.c[1], co: Math.cos(m.rot), si: Math.sin(m.rot), rx, ry, a: lim(late * (m.liso ? 0.5 : 0.85), 0, 1),
        x0: m.c[0] - e, x1: m.c[0] + e, y0: m.c[1] - e, y1: m.c[1] + e });
    }
    return r;
  }
  // La coleta (D-139): dos tramos que se afinan, de arriba de la nuca hacia atrás y abajo, con un leve vaivén.
  function coletaDe(f) {
    const cara = f.cin.cara, v = Math.sin(f.t * 2.1) * 1.4;
    const a = cara(0, -8, -2.5, true), b = cara(v * 0.5, 4, 5, true), e = cara(v * 1.6, 19, 9, true);
    return [tramoDe(a, b, 4, 3.2), tramoDe(b, e, 3.2, 1.6, FUNDE.coleta)];
  }

  // Las capas, de atrás adelante (como en la 1.4.0): lo que queda muy detrás (más oscuro, cada parte aparte); el tronco,
  // con lo que está a su altura (de pie, las piernas: fundidas con él por la raíz y unidas por lo demás); y cada parte que
  // queda delante (un brazo, la cabeza…), en su orden. Con un margen para cambiar de capa (así, en el límite, no salta de
  // una a otra en cada fotograma).
  function capasDe(f) {
    const partes = f.cin.partes, p = f.cin.p;
    if (f.t < tAntes - 1e-6 || f.t - tAntes > 0.25) antes.clear();
    tAntes = f.t;
    const tronco = partes.find((x) => x.nombre === 'tronco');
    const tc = tronco ? tronco.clave : -1;
    const cuerpo = rgbDe(col.cuerpo), lejosRgb = rgbDe(col.lejos);
    const medio = tronco ? { tronco, formasT: troncoDe(f, tronco), raices: [], uniones: [], clave: tc, R: ALMOHADA.tronco, rgb: cuerpo,
      vivos: vivosDe(f, tronco.manchas) } : null;
    const lejos = [], delante = [];
    for (const parte of partes) {
      if (parte === tronco) continue;
      if (parte.centro) {
        delante.push({ cabeza: parte, clave: parte.clave, R: ALMOHADA.cabeza, rgb: cuerpo, cx: parte.centro[0], cy: parte.centro[1], r: parte.radio });
        continue;
      }
      const e = extremidad(f, parte);
      const pierna = parte.nombre.startsWith('pierna');
      const era = antes.get(parte.nombre);
      // D-139: una pierna solo va «lejos» si su cadera está detrás de verdad (casi de perfil)
      const mL = era === 'lejos' ? 0.8 : -0.4;
      const atras = (!pierna || p['cadera' + parte.nombre.slice(-1)][2] < -3.5 + mL) && parte.clave < -3 + mL;
      const donde = atras ? 'lejos' : medio && parte.clave <= tc + (era === 'delante' ? -0.6 : 0.6) ? 'medio' : 'delante';
      antes.set(parte.nombre, donde);
      if (donde === 'lejos') lejos.push({ formas: e.formas, clave: parte.clave, R: ALMOHADA.extremidad, rgb: lejosRgb, vivos: e.vivos });
      else if (donde === 'medio') {
        medio.raices.push(e.raiz);
        medio.uniones.push(e.formas);
        if (e.vivos) medio.vivos = [...(medio.vivos || []), ...e.vivos];
      } else {
        if (medio) medio.raices.push(e.raiz);
        delante.push({ formas: e.formas, clave: parte.clave, R: ALMOHADA.extremidad, rgb: cuerpo, raiz: e.origen, r0: e.r0, vivos: e.vivos });
      }
    }
    const capas = [...lejos, ...(medio ? [medio] : []), ...delante];
    const cab = delante.find((x) => x.cabeza);
    if (f.coleta && cab) {
      // D-139: la coleta corta de «Ella»: detrás de todo si queda detrás del cuerpo, si no junto a la cabeza
      const cola = coletaDe(f);
      const cp = { formas: cola, clave: tc, R: ALMOHADA.coleta, rgb: cuerpo, coleta: true };
      const zc = (f.cin.cara(0, 4, 5, true))[2], zH = cab.cabeza.centro[2];
      const i = capas.indexOf(cab);
      if (zc < tc - 2) capas.unshift(cp);
      else capas.splice(zc < zH ? i : i + 1, 0, cp);
      cp.clave = zc < tc - 2 ? tc - 3 : zc < zH ? cab.clave - 0.5 : cab.clave + 0.5;
    }
    return capas;
  }

  // ——— Los campos de cada capa ———
  // En una rejilla a la mitad de resolución que la imagen (un nudo cada 2 px: el nudo gi, en el centro del px 2·gi); al
  // pintar, cada px lee la distancia de los cuatro nudos de alrededor, y como es una distancia, su borde sigue nítido
  // (como las letras de un juego). Así cuesta la cuarta parte.
  // los nudos que puede tocar una forma (con lo que se funde y algo más)
  function region(c, m) {
    return [Math.max(gi0, Math.floor((c[0] - m - gx0) / hc)), Math.min(gi1, Math.ceil((c[2] + m - gx0) / hc)),
      Math.max(gj0, Math.floor((c[1] - m - gy0) / hc)), Math.min(gj1, Math.ceil((c[3] + m - gy0) / hc))];
  }
  // Una forma, en su región: F = la unión suave de F y ella (k = 0: la de siempre); con «sobre», F = min(F, unión suave de
  // «sobre» y ella) (la raíz de un brazo o una pierna, que se funde con el tronco, pero no con lo demás).
  function campoForma(F, s, sobre = null) {
    const GW_ = GW, gx0_ = gx0, gy0_ = gy0, hc_ = hc;
    const k = s.k, ik = k > 0 ? 0.25 / k : 0;
    const [i0, i1, j0, j1] = region(cajaForma(s), k + hc_);
    if (i0 > i1 || j0 > j1) return;
    const tipo = s.t;
    let vx = 0, vy = 0, inv = 0, dr = 0, cx = 0, cy = 0, co = 0, si = 0, irx = 0, iry = 0, irx2 = 0, iry2 = 0, rmin = 0;
    if (tipo === 0) {
      vx = s.bx - s.ax; vy = s.by - s.ay;
      const l2 = vx * vx + vy * vy;
      inv = l2 > 1e-9 ? 1 / l2 : 0;
      dr = s.r2 - s.r1; cx = s.ax; cy = s.ay;
    } else {
      cx = s.cx; cy = s.cy;
      if (tipo === 2) {
        co = s.co; si = s.si; irx = 1 / s.rx; iry = 1 / s.ry; irx2 = irx * irx; iry2 = iry * iry; rmin = -Math.min(s.rx, s.ry);
      }
    }
    const r1 = s.r1, rr = s.r;
    for (let j = j0; j <= j1; j++) {
      const y = gy0_ + j * hc_ - cy;
      let idx = j * GW_ + i0, x = gx0_ + i0 * hc_ - cx;
      for (let i = i0; i <= i1; i++, idx++, x += hc_) {
        let d;
        if (tipo === 0) {
          let t = (x * vx + y * vy) * inv;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const dx = x - vx * t, dy = y - vy * t;
          d = Math.sqrt(dx * dx + dy * dy) - (r1 + dr * t);
        } else if (tipo === 1) d = Math.sqrt(x * x + y * y) - rr;
        else {
          const lx = (x * co + y * si) * irx, ly = (y * co - x * si) * iry;
          const q = Math.sqrt(lx * lx + ly * ly), g = Math.sqrt(lx * lx * irx2 + ly * ly * iry2);
          d = g > 1e-9 ? ((q - 1) * q) / g : rmin;
        }
        const a = sobre === null ? F[idx] : sobre[idx];
        let v = a < d ? a : d;
        if (k > 0) {
          const q = k - (a > d ? a - d : d - a);
          if (q > 0) v -= q * q * ik;
        }
        if (sobre === null) F[idx] = v;
        else if (v < F[idx]) F[idx] = v;
      }
    }
  }
  function campoDe(F, formas) {
    for (let j = 0; j < gh; j++) F.fill(LEJOS, j * GW, j * GW + gw);
    for (const s of formas) campoForma(F, s);
  }
  const cajaDe = (formas) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of formas) {
      const b = cajaForma(s);
      if (b[0] < x0) x0 = b[0];
      if (b[1] < y0) y0 = b[1];
      if (b[2] > x1) x1 = b[2];
      if (b[3] > y1) y1 = b[3];
    }
    return [x0, y0, x1, y1];
  };
  // Cada capa, su campo: el tronco, sus piezas fundidas; luego, con él, la raíz de cada brazo y pierna (fundida solo con
  // el tronco) y las piernas que van a su altura (unidas a él, y entre ellas, muy poco); cada parte de delante o de
  // detrás (y la cabeza, una bola), el suyo. Y, de todas, la más cercana en cada nudo (para saltarse lo vacío).
  function calcularCampos(capas) {
    let n = 0;
    for (const c of capas) {
      if (!c.tronco) {
        c.F = campoLibre(n++);
        campoDe(c.F, formasDe(c));
        continue;
      }
      const FT = campoLibre(n++);
      campoDe(FT, c.formasT);
      if (!c.raices.length && !c.uniones.length) { c.F = FT; continue; }
      const FM = campoLibre(n++);
      FM.set(FT.subarray(0, gh * GW));
      for (const s of c.raices) campoForma(FM, s, FT);
      for (const formas of c.uniones) {
        const FL = campoLibre(n++);
        campoDe(FL, formas);
        const [i0, i1, j0, j1] = region(cajaDe(formas), FUNDE.union + hc), k = FUNDE.union, ik = 0.25 / k;
        for (let j = j0; j <= j1; j++) {
          let idx = j * GW + i0;
          for (let i = i0; i <= i1; i++, idx++) {
            const a = FM[idx], d = FL[idx];
            let v = a < d ? a : d;
            const q = k - (a > d ? a - d : d - a);
            if (q > 0) v -= q * q * ik;
            FM[idx] = v;
          }
        }
      }
      c.F = FM;
    }
    const Fs = capas.map((c) => c.F);
    for (let j = 0; j < gh; j++) {
      const a = j * GW, b = a + gw;
      Gmin.set(Fs[0].subarray(a, b), a);
      for (let l = 1; l < Fs.length; l++) {
        const F = Fs[l];
        for (let idx = a; idx < b; idx++) if (F[idx] < Gmin[idx]) Gmin[idx] = F[idx];
      }
    }
  }
  function formasDe(c) {
    if (c.cabeza) return c.formas || (c.formas = [discoDe(c.cabeza.centro, c.cabeza.radio)]);
    if (c.tronco) return [...c.formasT, ...c.uniones.flat()];
    return c.formas;
  }

  // ——— El halo: el mismo cuerpo, en una rejilla gruesa, que se apaga poco a poco ———
  // Aquí solo su rejilla (lo fuerte que es en cada nudo); se pinta con el cuerpo, en su misma imagen (componer()).
  function calcularHalo(f, capas) {
    const formas = capas.flatMap(formasDe).filter((s) => !s.musculo);
    if (!formas.length) return false;
    const [x0, y0, x1, y1] = cajaDe(formas);
    const A = ESTILO[tema].alcance, P = HALO_PASO;
    hx0 = x0 - A; hy0 = y0 - A;
    hnx = Math.ceil((x1 - x0 + 2 * A) / P) + 1; hny = Math.ceil((y1 - y0 + 2 * A) / P) + 1;
    if (hnx * hny > hCap) {
      hCap = Math.max(hnx * hny, hCap * 2, 1024);
      hCampo = new Float32Array(hCap);
    }
    hCampo.fill(A, 0, hnx * hny);
    for (const s of formas) {
      const b = cajaForma(s);
      const i0 = Math.max(0, Math.floor((b[0] - A - hx0) / P)), i1 = Math.min(hnx - 1, Math.ceil((b[2] + A - hx0) / P));
      const j0 = Math.max(0, Math.floor((b[1] - A - hy0) / P)), j1 = Math.min(hny - 1, Math.ceil((b[3] + A - hy0) / P));
      for (let j = j0; j <= j1; j++) {
        const y = hy0 + (j + 0.5) * P;
        for (let i = i0, idx = j * hnx + i0; i <= i1; i++, idx++) {
          const d = distancia(s, hx0 + (i + 0.5) * P, y);
          if (d < hCampo[idx]) hCampo[idx] = d;
        }
      }
    }
    const intensidad = brillo * Math.max(0.25, f.carga ?? 1); // en el descanso, la carga: de apagada a recargada
    const e = ESTILO[tema], l1 = e.halo[0], l2 = e.halo[1] * (0.8 + 0.2 * brillo);
    const i1 = col.halo1 * e.haloK[0] * (1 + 1.6 * f.destello) * intensidad, i2 = col.halo2 * e.haloK[1] * (1 + 2 * f.destello) * intensidad;
    if (hIni.length < hny) { hIni = new Int32Array(hny * 2); hFin = new Int32Array(hny * 2); }
    for (let j = 0; j < hny; j++) {
      let a = -1, b = -2;
      for (let i = 0, k = j * hnx; i < hnx; i++, k++) if (hCampo[k] < A - 0.5) { if (a < 0) a = i; b = i; }
      hIni[j] = a < 0 ? hnx : a;
      hFin[j] = b;
    }
    for (let k = 0, N = hnx * hny; k < N; k++) {
      const d = Math.max(0, hCampo[k]), fin = 1 - d / A; // y se apaga del todo en su alcance
      hCampo[k] = Math.min(1, (i1 * Math.exp(-d / l1) + i2 * Math.exp(-d / l2)) * fin * fin);
    }
    return true;
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
    ctx.beginPath();
    ctx.arc(0, 0, s.rx, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ——— El cuerpo, píxel a píxel ———
  // Compone las capas de la lista (sus números en «capas»), de atrás adelante, en la imagen q, y dice su región. Cada capa
  // que cubre el px: su color (su luz, una almohada redonda con la luz de arriba a la izquierda; el filo de neón por dentro
  // del borde; los músculos que siente, encendidos; la sombra de la cabeza en el cuello), su borde fino donde pasa por
  // delante de otra (más marcado cuanto más delante; en la raíz de un brazo o una pierna, se desvanece: sale del cuerpo sin
  // costura) y, al final, el borde grueso de la silueta. El primer pase lleva además el halo, debajo; con «encima» (el
  // segundo pase: lo que tapa la cara), lo de debajo es el primer pase. Lee de delante atrás y para en cuanto una capa
  // tapa del todo.
  function componer(capas, lista, q, encima) {
    const W_ = W, GW_ = GW, gw_ = gw, gh_ = gh, Gmin_ = Gmin, hCampo_ = hCampo, hnx_ = hnx, hny_ = hny, hx0_ = hx0, hy0_ = hy0, ppu_ = ppu, h_ = h, ux0_ = ux0, uy0_ = uy0, dueno_ = dueno, val_ = val, hc_ = hc, bw_ = bw, bh_ = bh;
    const n = lista.length, out = palabras[q], ab = imagenes[0].data;
    const Fs = [], AL = new Float64Array(n), BR = new Float64Array(n), BG = new Float64Array(n), BB = new Float64Array(n);
    const CAB = new Uint8Array(n), TRO = new Uint8Array(n), FX = new Float64Array(n), FY = new Float64Array(n), FA = new Float64Array(n);
    const FB = new Float64Array(n), CL = new Float64Array(n), VIV = [];
    const CI0 = new Int32Array(n), CI1 = new Int32Array(n), CJ0 = new Int32Array(n), CJ1 = new Int32Array(n); // su caja, en nudos
    const todas = [];
    lista.forEach((gi, l) => {
      const c = capas[gi];
      [CI0[l], CI1[l], CJ0[l], CJ1[l]] = region(cajaDe(formasDe(c)), (c.tronco ? FUNDE.tronco : 3) + hc);
      CI0[l]--; CJ0[l]--;
      Fs.push(c.F);
      AL[l] = c.R;
      [BR[l], BG[l], BB[l]] = c.rgb;
      CAB[l] = c.cabeza ? 1 : 0;
      TRO[l] = c.tronco ? 1 : 0;
      FX[l] = c.raiz ? c.raiz[0] : 0;
      FY[l] = c.raiz ? c.raiz[1] : 0;
      FA[l] = c.raiz ? c.r0 : -1;
      FB[l] = c.raiz ? c.r0 * 2.6 : 0;
      CL[l] = c.clave;
      VIV.push(c.vivos || null);
      todas.push(...formasDe(c));
    });
    const claves = capas.map((c) => c.clave);
    // el primer pase, toda la imagen (con el halo); el segundo, solo lo suyo
    let rg = [1, bw_ - 3, 1, bh_ - 3];
    if (encima) {
      const c = cajaDe(todas), m = 2 * h_;
      rg = [Math.max(1, Math.floor((c[0] - m - ux0_) / h_)), Math.min(bw_ - 3, Math.ceil((c[2] + m - ux0_) / h_)),
        Math.max(1, Math.floor((c[1] - m - uy0_) / h_)), Math.min(bh_ - 3, Math.ceil((c[3] + m - uy0_) / h_))];
    }
    const [i0, i1, j0, j1] = rg;
    if (encima) for (let j = j0; j <= j1; j++) out.fill(0, j * W_ + i0, j * W_ + i1 + 1);
    else {
      for (let j = 0; j < bh_; j++) {
        out.fill(0, j * W_, j * W_ + bw_);
        dueno_.fill(0, j * W_, j * W_ + bw_);
      }
    }
    const conHalo = !encima && hnx_ > 0, [HR, HG, HB] = rgbDe(col.halo), HRGB = (HB << 16) | (HG << 8) | HR;
    const e = ESTILO[tema], t0 = e.t0, dt = e.t1 - e.t0, filo = e.filo, iFilo = 1 / e.filoAncho, kBrillo = e.brillo;
    const [VR, VG, VB] = rgbDe(col.vivo);
    const [OR, OG, OB] = rgbDe(col.borde);
    // la sombra de la cabeza en el cuello y los hombros
    const cab = capas.find((c) => c.cabeza);
    const sx = cab ? cab.cx + 1 : 0, sy = cab ? cab.cy + 17 * 0.95 : 0, sR = 17 * 0.95, sR2 = sR * sR;
    const bF = BORDE_FUERA, bD = BORDE_DENTRO, medio = 0.5 / ppu_, hondo = -(bF + 1.5 / ppu_), banda = -(bD + 1.5 / ppu_);
    const ihc = 1 / hc_, pasoH = h_ / HALO_PASO;
    // lo hondo de una capa (sin borde ni filo): ahí la luz cambia muy despacio, y cada bloque de 2 × 2 px va de un color
    const hondoDe = -(bF + 0.55 * e.filoAncho + h_), libreDe = medio + 3 * h_; // (lo que queda del filo ahí apenas se ve)
    if (copias.length < bw_ + 2) { copias = new Uint32Array(bw_ * 2 + 4); copiasD = new Uint8Array(bw_ * 2 + 4); copiasSi = new Uint8Array(bw_ * 2 + 4); }
    copiasSi.fill(0);
    let usadoI0 = conHalo ? bw_ : i0, usadoI1 = conHalo ? -1 : i1;
    for (let j = j0; j <= j1; j++) {
      const uy = uy0_ + (j + 0.5) * h_;
      const gj = j >> 1, fy = (j & 1) * 0.5, filaCampo = gj + 1 < gh_;
      // el halo de esta fila: entre qué dos filas de su rejilla cae
      const hgy = (uy - hy0_) / HALO_PASO - 0.5, hj = Math.floor(hgy), hfy = hgy - hj, filaHalo = conHalo && hj >= 0 && hj < hny_ - 1;
      const hk0 = hj * hnx_;
      // (con el halo, solo el tramo de la fila al que llega: fuera no hay nada)
      let ia = i0, ib = i1;
      if (conHalo) {
        if (!filaHalo) continue;
        const s0 = Math.min(hIni[hj], hIni[hj + 1]), s1 = Math.max(hFin[hj], hFin[hj + 1]);
        if (s1 < s0) continue;
        ia = Math.max(i0, Math.floor((hx0_ + (s0 - 0.5) * HALO_PASO - ux0_) * ppu_ - 0.5));
        ib = Math.min(i1, Math.ceil((hx0_ + (s1 + 1.5) * HALO_PASO - ux0_) * ppu_));
        if (ia < usadoI0) usadoI0 = ia;
        if (ib > usadoI1) usadoI1 = ib;
      }
      let hgx = (ux0_ + (ia + 0.5) * h_ - hx0_) / HALO_PASO - 0.5;
      let idx = j * W_ + ia;
      if (!(j & 1)) copiasSi.fill(0, i0, i1 + 2);
      for (let i = ia; i <= ib; i++, idx++, hgx += pasoH) {
        if ((j & 1) && copiasSi[i]) { // lo hondo, copiado de la fila de arriba
          copiasSi[i] = 0;
          out[idx] = copias[i];
          if (!encima) dueno_[idx] = copiasD[i];
          continue;
        }
        const gi = i >> 1, fx = (i & 1) * 0.5, k = gj * GW_ + gi;
        // de delante atrás: la distancia de cada capa (y la de todo el cuerpo, G), hasta una que tape del todo
        let G = LEJOS, l0 = -1, tapa = -1, m = LEJOS;
        if (filaCampo && gi + 1 < gw_) {
          m = Gmin_[k];
          if (Gmin_[k + 1] < m) m = Gmin_[k + 1];
          if (Gmin_[k + GW_] < m) m = Gmin_[k + GW_];
          if (Gmin_[k + GW_ + 1] < m) m = Gmin_[k + GW_ + 1];
          if (m < medio) {
            for (let l = n - 1; l >= 0; l--) {
              if (gi < CI0[l] || gi > CI1[l] || gj < CJ0[l] || gj > CJ1[l]) { val_[l] = LEJOS; continue; }
              const F = Fs[l], a = F[k] + (F[k + 1] - F[k]) * fx, b = F[k + GW_] + (F[k + GW_ + 1] - F[k + GW_]) * fx;
              const v = a + (b - a) * fy;
              val_[l] = v;
              if (v < G) G = v;
              if (v <= -medio && l0 < 0) l0 = l;
              if (v <= hondo) { tapa = l; break; }
            }
          }
        }
        if (G >= medio) {
          let c = 0;
          if (filaHalo) {
            const hi = hgx | 0;
            if (hgx >= 0 && hi < hnx_ - 1) {
              const hk = hk0 + hi, a0 = hCampo_[hk], a1 = hCampo_[hk + 1], b0 = hCampo_[hk + hnx_], b1 = hCampo_[hk + hnx_ + 1];
              if (a0 + a1 + b0 + b1 > 0.016) {
                const hfx = hgx - hi, a = a0 + (a1 - a0) * hfx, ha = a + (b0 + (b1 - b0) * hfx - a) * hfy;
                c = (((ha * 255) | 0) << 24) | HRGB;
                out[idx] = c;
              }
            }
          }
          // un bloque de 2 × 2 del todo fuera del cuerpo (sus cuatro nudos): solo halo, que cambia muy despacio
          if (fx === 0 && fy === 0 && m >= medio && i < ib) {
            out[idx + 1] = c;
            if (j < j1) {
              copias[i] = copias[i + 1] = c;
              copiasD[i] = copiasD[i + 1] = 0;
              copiasSi[i] = copiasSi[i + 1] = 1;
            }
            i++; idx++; hgx += pasoH;
          }
          continue;
        }
        if (l0 < 0) l0 = tapa >= 0 ? tapa : 0;
        // ¿un bloque de 2 × 2 en lo hondo de su capa, lejos de las de delante? (sus cuatro nudos, hondos)
        let doble = false;
        if (fx === 0 && fy === 0 && tapa === l0 && i < ib) {
          const F = Fs[l0];
          if (F[k] <= hondoDe && F[k + 1] <= hondoDe && F[k + GW_] <= hondoDe && F[k + GW_ + 1] <= hondoDe) {
            doble = true;
            for (let l = l0 + 1; l < n; l++) if (val_[l] < libreDe) { doble = false; break; }
          }
        }
        // la capa de debajo de cada una (para su borde fino): la siguiente que cubre el px, o el primer pase
        let u = encima ? dueno_[idx] - 1 : -1;
        const cubre = encima ? ab[idx * 4 + 3] / 255 : 0;
        if (val_[l0] > banda && tapa !== l0) {
          for (let l = l0 - 1; l >= 0; l--) if (val_[l] <= 0) { u = lista[l]; break; }
        }
        let r = 0, g = 0, b = 0, hay = false, arriba = 0;
        for (let l = l0; l < n; l++) {
          const v = val_[l];
          let a = 0.5 - v * ppu_;
          if (a <= 0) continue;
          if (a > 1) a = 1;
          // su pendiente (de los cuatro nudos): hacia fuera
          const F = Fs[l], a0 = F[k], a1 = F[k + 1], b0 = F[k + GW_], b1 = F[k + GW_ + 1];
          let gx = ((a1 - a0) + ((b1 - b0) - (a1 - a0)) * fy) * ihc, gy = ((b0 - a0) + ((b1 - a1) - (b0 - a0)) * fx) * ihc;
          const gl = gx * gx + gy * gy;
          if (gl > 1) { const ig = 1 / Math.sqrt(gl); gx *= ig; gy *= ig; }
          let s = 1 + v / AL[l];
          s = s < 0 ? 0 : s > 1 ? 1 : s;
          const nz = Math.sqrt(1 - s * s), nx = gx * s, ny = gy * s;
          let w = (nx * LX + ny * LY + nz * LZ + 0.35) * (1 / 1.35);
          w = w < 0 ? 0 : w > 1 ? 1 : w;
          let t = t0 + dt * w;
          if (TRO[l] && cab) {
            const dx = ux0_ + (i + 0.5) * h_ - sx, dy = uy - sy, d2 = dx * dx + dy * dy;
            if (d2 < sR2) t -= 0.3 * (1 - Math.sqrt(d2) / sR);
          }
          let cr = BR[l], cg = BG[l], cb = BB[l];
          if (t > 0) { cr += (255 - cr) * t; cg += (255 - cg) * t; cb += (255 - cb) * t; } else { const kk = 1 + t; cr *= kk; cg *= kk; cb *= kk; }
          const vv = VIV[l];
          if (vv !== null) {
            const ux = ux0_ + (i + 0.5) * h_;
            for (let m = 0; m < vv.length; m++) {
              const z = vv[m];
              if (ux < z.x0 || ux > z.x1 || uy < z.y0 || uy > z.y1) continue;
              const dx = ux - z.cx, dy = uy - z.cy, lx = (dx * z.co + dy * z.si) / z.rx, ly = (dy * z.co - dx * z.si) / z.ry;
              const q2 = lx * lx + ly * ly;
              if (q2 >= 1) continue;
              const kk = z.a * (1 - q2) * (1 - q2);
              cr += (VR - cr) * kk; cg += (VG - cg) * kk; cb += (VB - cb) * kk;
            }
          }
          // el filo de neón: una franja clara justo por dentro del borde, más viva donde mira a la luz
          let fe = 1 + (v + bF) * iFilo;
          if (fe > 0) {
            if (fe > 1) fe = 1;
            const fa = gx * LX2 + gy * LY2;
            const kk = fe * fe * filo * (0.3 + 0.7 * (fa > 0 ? fa : 0));
            cr += (255 - cr) * kk; cg += (255 - cg) * kk; cb += (255 - cb) * kk;
          }
          if (CAB[l]) {
            const hv = nx * HX + ny * HY + nz * HZ;
            if (hv > 0.75) {
              let kk = (hv - 0.75) * 4;
              kk = kk * kk * kBrillo;
              cr += (255 - cr) * kk; cg += (255 - cg) * kk; cb += (255 - cb) * kk;
            }
          }
          // el borde fino, donde pasa por delante de otra
          if (u >= 0 && v > banda) {
            let sep = CAB[l] ? 1 : (CL[l] - claves[u] + 0.6) * 0.75; // (desde que pasa delante, ya algo: brazo y tronco, separados)
            if (sep > 0) {
              if (sep > 1) sep = 1;
              if (FA[l] > 0) {
                const dx = ux0_ + (i + 0.5) * h_ - FX[l], dy = uy - FY[l];
                sep *= suave((Math.sqrt(dx * dx + dy * dy) - FA[l]) / (FB[l] - FA[l]));
              }
              let bm = 0.5 + (v + bD) * ppu_;
              bm = bm < 0 ? 0 : bm > 1 ? 1 : bm;
              bm *= sep * 0.9;
              cr += (OR - cr) * bm; cg += (OG - cg) * bm; cb += (OB - cb) * bm;
            }
          }
          if (!hay) { r = cr; g = cg; b = cb; hay = true; } else { r += (cr - r) * a; g += (cg - g) * a; b += (cb - b) * a; }
          if (a >= 0.5) { u = lista[l]; arriba = lista[l] + 1; }
        }
        // el borde de la silueta (en el segundo pase, solo donde no hay nada debajo)
        let o = 0.5 + (G + bF) * ppu_;
        o = o < 0 ? 0 : o > 1 ? 1 : o;
        if (encima) o *= 1 - cubre;
        r += (OR - r) * o; g += (OG - g) * o; b += (OB - b) * o;
        let al = 0.5 - G * ppu_;
        al = al > 1 ? 1 : al;
        if (filaHalo && al < 1) {
          // el borde, sobre el halo
          const hi = hgx | 0;
          if (hgx >= 0 && hi < hnx_ - 1) {
            const hk = hk0 + hi, hfx = hgx - hi, a = hCampo_[hk] + (hCampo_[hk + 1] - hCampo_[hk]) * hfx;
            const ha = (a + (hCampo_[hk + hnx_] + (hCampo_[hk + hnx_ + 1] - hCampo_[hk + hnx_]) * hfx - a) * hfy) * (1 - al), A = al + ha;
            if (A > 0) { r = (r * al + HR * ha) / A; g = (g * al + HG * ha) / A; b = (b * al + HB * ha) / A; al = A; }
          }
        }
        out[idx] = (((al * 255) | 0) << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
        if (!encima) dueno_[idx] = arriba;
        if (doble) {
          const c = out[idx];
          out[idx + 1] = c;
          if (!encima) dueno_[idx + 1] = arriba;
          if (j < j1) {
            copias[i] = copias[i + 1] = c;
            copiasD[i] = copiasD[i + 1] = arriba;
            copiasSi[i] = copiasSi[i + 1] = 1;
          }
          i++; idx++; hgx += pasoH;
        }
      }
    }
    if (usadoI1 < usadoI0) return [1, 0, 1, 0];
    rg = [usadoI0, usadoI1, j0, j1];
    return rg;
  }
  // la imagen, al lienzo (de una vez: cada llamada tiene su coste fijo)
  function pasar(q, [i0, i1, j0, j1]) {
    if (i0 > i1 || j0 > j1) return;
    const w = i1 - i0 + 1, hh = j1 - j0 + 1;
    lctx[q].putImageData(imagenes[q], 0, 0, i0, j0, w, hh);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = base;
    ctx.drawImage(lienzos[q], i0, j0, w, hh, X0 + i0, Y0 + j0, w, hh);
    ctx.restore();
  }
  function enUnidades(f) {
    ctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
    ctx.translate(f.raiz[0], f.raiz[1]);
    ctx.scale(f.escala, f.escala);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Las capas del cuerpo: el primer pase, hasta la cabeza (y lo que no la toca), con el halo; luego, sobre él, las
  // líneas de un cuerpo definido (solo donde se ve el tronco), la cara y la cinta; y el segundo pase, lo que entra en la
  // cara.
  function pintarCuerpo(f, capas) {
    const formas = capas.flatMap(formasDe);
    if (!formas.length) return;
    const [x0, y0, x1, y1] = cajaDe(formas);
    hnx = 0;
    const conHalo = calcularHalo(f, capas);
    const k = f.escala, mg = conHalo ? ESTILO[tema].alcance - 1 : 2;
    X0 = lim(Math.floor((f.raiz[0] + (x0 - mg) * k - ox) * dpr) - 3, 0, lienzo.width);
    Y0 = lim(Math.floor((f.raiz[1] + (y0 - mg) * k - oy) * dpr) - 3, 0, lienzo.height);
    const X1 = lim(Math.ceil((f.raiz[0] + (x1 + mg) * k - ox) * dpr) + 3, 0, lienzo.width);
    const Y1 = lim(Math.ceil((f.raiz[1] + (y1 + mg) * k - oy) * dpr) + 3, 0, lienzo.height);
    bw = X1 - X0;
    bh = Y1 - Y0;
    if (bw < 6 || bh < 6) return;
    reservar(bw, bh);
    ppu = k * dpr;
    h = 1 / ppu;
    hc = 2 * h;
    ux0 = (X0 / dpr + ox - f.raiz[0]) / k;
    uy0 = (Y0 / dpr + oy - f.raiz[1]) / k;
    gx0 = ux0 + 0.5 * h;
    gy0 = uy0 + 0.5 * h;
    gw = (bw >> 1) + 2;
    gh = (bh >> 1) + 2;
    // dónde puede haber campos (las formas, con lo que más se funden), en nudos
    const mc = FUNDE.tronco + 2 * hc;
    gi0 = lim(Math.floor((x0 - mc - gx0) / hc), 0, gw - 2); gi1 = lim(Math.ceil((x1 + mc - gx0) / hc), 0, gw - 2);
    gj0 = lim(Math.floor((y0 - mc - gy0) / hc), 0, gh - 2); gj1 = lim(Math.ceil((y1 + mc - gy0) / hc), 0, gh - 2);
    calcularCampos(capas);
    // lo que va después de la cabeza y entra en la cara (la bola y la cinta), al segundo pase
    const iCab = capas.findIndex((c) => c.cabeza);
    const uno = [], dos = [];
    capas.forEach((c, i) => {
      if (iCab < 0 || i <= iCab) return uno.push(i);
      const cb = capas[iCab];
      (formasDe(c).some((s) => distancia(s, cb.cx, cb.cy) < cb.r - 1) ? dos : uno).push(i);
    });
    const rg = componer(capas, uno, 0, false);
    pasar(0, rg);
    enUnidades(f);
    ctx.globalAlpha = base;
    const it = capas.findIndex((c) => c.tronco);
    if (it >= 0) pintarDetalles(f, it + 1);
    if (iCab >= 0) {
      const parte = capas[iCab].cabeza;
      pintarCara(f, parte);
      if (f.cinta) pintarCinta(f, parte);
    }
    if (dos.length) pasar(1, componer(capas, dos, 1, true));
  }
  // las líneas de un cuerpo definido (las de delante, de frente; las de detrás, de espaldas), suaves, y solo donde se ve
  // el tronco (no por encima de un brazo que pasa por delante)
  function pintarDetalles(f, quien) {
    const visto = (x, y) => {
      const i = Math.floor((x - ux0) / h), j = Math.floor((y - uy0) / h);
      return i >= 0 && j >= 0 && i < bw && j < bh && dueno[j * W + i] === quien;
    };
    ctx.strokeStyle = col.detalle;
    ctx.lineWidth = 0.85;
    for (const d of f.cin.detalles) {
      const v = lim(d.cara * f.cin.frente * 2.5, 0, 1) * d.fuerza;
      if (v < 0.03) continue;
      const [a, b, e0] = d.puntos;
      // una línea corta de lado a lado (los abdominales), un arco suave hacia abajo: lóbulos, no una cremallera
      const lobulo = !e0 && Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
      const N = 8;
      const punto = (t) => (e0
        ? [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * b[0] + t * t * e0[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * b[1] + t * t * e0[1]]
        : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + (lobulo ? 3.2 * t * (1 - t) : 0)]);
      ctx.globalAlpha = v * (lobulo ? 0.55 : 0.6) * base;
      ctx.beginPath();
      let dentro = false;
      for (let i = 0; i < N; i++) {
        const p0 = punto(i / N), p1 = punto((i + 1) / N);
        if (!visto((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)) { dentro = false; continue; }
        if (!dentro) ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        dentro = true;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = base;
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

  function pintarCara(f, parte) {
    const cin = f.cin, zH = parte.centro[2];
    const [mx, my] = f.mirada;
    ctx.save(); // la cara, dentro de la bola
    ctx.beginPath();
    ctx.arc(parte.centro[0], parte.centro[1], parte.radio - 0.4, 0, TAU);
    ctx.clip();
    const vis = (q) => lim((q[2] - zH - 2) / 6, 0, 1); // (y se apaga antes de llegar al borde de la bola)
    // la mirada, menos en lo que da la vuelta a la bola: de perfil, el ojo no se sale de ella
    const en = (x, y, seguir = 1) => {
      const q = cin.cara(x, y), k = seguir * lim((q[2] - zH) / 11, 0, 1);
      return [q[0] + mx * k, q[1] + my * k, q[2]];
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
        const fuera = ex + 3 * s, dentro = ex - 3 * s;
        ctx.globalAlpha = luz * vis(en(ex, -8.5)) * base;
        if (tipoCeja === 'alegres') curva(fuera, -8.1, ex, -10.6, dentro, -8.1, 0.6);
        else if (tipoCeja === 'altas') curva(fuera, -10.2, ex, -12.8, dentro, -10.2, 0.6);
        else if (tipoCeja === 'fruncidas') curva(fuera, -10, ex, -9.1, dentro, -7.6, 0.6);
        else if (tipoCeja === 'preocupadas') curva(fuera, -7.8, ex, -8.9, dentro, -10.2, 0.6);
        else if (tipoCeja === 'relajadas') curva(fuera, -8.4, ex, -9.3, dentro, -8.4, 0.6);
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
    ctx.restore();
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


  function disco(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, Math.max(0.1, r), 0, TAU);
    c.fill();
  }

  function dibujar(f, origen = [0, 0]) {
    [ox, oy] = origen;
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
    pintarSombra(f);
    pintarCuerpo(f, capas);
    enUnidades(f);
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
      lienzo.width = Math.round(w * r);
      lienzo.height = Math.round(h * r);
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
