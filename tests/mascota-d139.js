// La mascota, D-139 (con D-141): que nunca haya nada en la barriga baja ni en la entrepierna que pueda parecer genitales,
// en ninguna postura, forma, sexo ni lado. Recorre todos sus gestos (7 momentos de cada uno) y comportamientos (pasear,
// sentarse, dormir, asomarse, calentar, saltar, imitar cada grupo, llevarla en el dedo y soltarla, con trofeo…), las
// formas 0, 0,5 y 1 y sus tres sexos, y en cada fotograma mira, en los datos del esqueleto y en los píxeles pintados con
// su traje (con una luz de prueba: el borde, magenta; lo de detrás, azul):
//  · las manos: las dos juntas en la entrepierna, o una sola en medio de ella (por delante del cuerpo); y las rodillas,
//    juntas en el regazo;
//  · una mancha (un músculo, la barriga) encendida o redonda y con brillo en la zona, o una línea que baje a ella;
//  · un arco de contorno propio dentro del cuerpo (el borde de una bolita), un brillo redondo y aislado, algo que cuelgue
//    entre los muslos (tiene que ser una U invertida) y una barriga baja que sobresalga de lado;
//  · y que contiene() (los toques) cubra su silueta.
// Dos pasadas: en grande y en claro; y al tamaño de la app, en oscuro, a media luz (el descanso), con brillo intenso,
// otros momentos y fotogramas seguidos (para lo que recuerda el traje de un fotograma a otro).
// La zona, respecto a las caderas: de lado a lado, la mitad de lo que las separa más 5 unidades; de arriba abajo, desde
// 7 por encima de la línea de las caderas (de espaldas, 4) hasta 11 por debajo, siguiendo la dirección de la espalda.
// Para mirar un caso en grande o pasar más combinaciones: la página de trabajo de la que sale esta
// (prueba-d139.html, con «&ver=pose@t:forma:sexo», fuera del repo; LEEME.md de la mascota).

export async function ejecutar(c) {
  const { caso, nota } = c;
  const cer = await import("/js/mascota/cerebro.js");
  const tra = await import("/js/mascota/traje-neon.js");
  const ges = await import("/js/mascota/gestos.js");
  const PASADAS = [
    ["MD1", "en grande y en claro", "formas=0,0.5,1&max=6"],
    ["MD2", "al tamaño de la app, en oscuro, a media luz, intensa, en otros momentos y seguidos",
      "formas=0,0.5,1&max=6&tema=oscuro&escala=0.55&carga=0.5&brillo=1.7&desfase=0.11&seguidos=10"],
  ];
  try {
    for (const [id, que, consulta] of PASADAS) {
      const r = correr(cer, tra, ges, consulta);
      caso(r.fallos === 0, `${id} nada que parezca genitales, ${que} (${r.lineas[0].replace("RESULTADO ", "")}; ${r.lineas[1]})`);
      for (const l of r.lista.slice(0, 12)) nota(l);
      if (r.contiene != null) caso(r.contiene >= 99.5, `${id}b sus toques (contiene()) cubren su silueta: ${r.contiene.toFixed(1)} %`);
    }
  } finally {
    delete tra.LUCES.prueba;
  }
}

function correr({ crearMascota, SEXOS }, { crearTrajeNeon, LUCES }, { GESTOS, IMITAR }, consulta) {
  const q = new URLSearchParams(consulta);
  const E = Number(q.get('escala') || 2);   // la escala de la mascota (px CSS por unidad)
  const D = 2 / E;            // px del lienzo por px CSS: siempre 2 px por unidad
  const TEMA = q.get('tema') || 'claro', CARGA = Number(q.get('carga') || 1), BRILLO = Number(q.get('brillo') || 1);
  const SEGUIDOS = Number(q.get('seguidos') || 0); const COLETA = q.get('coleta') === '1', DESFASE = Number(q.get('desfase') || 0), BASE = q.get('luz') || 'verde';
  const W = 360, H = 360;     // el lienzo; la ingle, en el centro
  const formas = (q.get('formas') || '0,0.25,0.5,0.75,1').split(',').map(Number);
  const sexos = q.get('sexos') ? q.get('sexos').split(',') : (SEXOS ? [...SEXOS] : [null]);
  let solo = q.get('solo') ? new Set(q.get('solo').split(',')) : null;
  const maxLista = Number(q.get('max') || 25);
  let mirarContiene = q.get('contiene') !== '0';
  // un caso, para verlo
  const ver = q.get('ver');
  let verT = null, dbg = null;
  if (ver) {
    const [nom, resto = ''] = ver.split('@');
    const [t1, fo, sx] = resto.split(':');
    verT = Number(t1);
    formas.splice(0, formas.length, Number(fo || 0.5));
    if (sx) sexos.splice(0, sexos.length, sx);
    solo = new Set([nom]);
    mirarContiene = false;
  }

  // una luz de prueba: el borde, magenta; lo de detrás, azul (lo demás, como la verde)
  const v = LUCES[BASE];
  LUCES.prueba = { claro: { ...v.claro, borde: '#ff00ff', lejos: '#3050ff' }, oscuro: { ...v.oscuro, borde: '#ff00ff', lejos: '#3050ff' } };
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d', { willReadFrequently: true });
  const traje = crearTrajeNeon(lienzo);
  traje.medidas(W / D, H / D, D);
  traje.tema = TEMA;
  traje.brillo = BRILLO;
  traje.luz = 'prueba';

  // ——— las poses: [nombre, preparar(m), momentos] ———
  const casos = [];
  for (const [n, g] of Object.entries(GESTOS)) {
    const dur = g.dur || 3;
    casos.push([n, (m) => m.hacer(n), [0.1, 0.22, 0.35, 0.5, 0.65, 0.8, 0.92].map((k) => +(k * dur).toFixed(2))]);
  }
  const hacer = (n) => (m) => m.hacer(n);
  casos.push(['quieto', () => {}, [0.5, 2]]);
  casos.push(['pasear', hacer('pasear'), [0.3, 0.55, 0.8, 1.05, 1.3]]);
  casos.push(['sentarse', hacer('sentarse'), [0.5, 1.5, 3]]);
  casos.push(['dormir', hacer('dormir'), [1, 3, 6]]);
  casos.push(['asomarse', hacer('asomarse'), [1, 2.5]]);
  // calentar antes de empezar (hacer('calentar') del cerebro no vale: calentar() da una lista)
  for (const g of ['Cuádriceps', 'Pecho']) casos.push([`calentar:${g}`, (m) => m.calentarAntes?.(g), [0.8, 2, 3.5, 5]]);
  casos.push(['guardia', hacer('guardia'), [0.5, 1.5]]);
  casos.push(['reloj', hacer('reloj'), [0.5, 1.5]]);
  casos.push(['saltar', hacer('saltar'), [0.3, 0.6, 0.9, 1.2, 1.6, 2.2]]);
  for (const g of Object.keys(IMITAR || {})) casos.push([`imitar:${g}`, hacer(`imitar:${g}`), [0.6, 1.2, 1.8, 2.4]]);
  for (const n of ['quieto', 'pasear', 'sentarse']) {
    casos.push([`${n}+trofeo`, (m) => { m.trofeo = true; if (n !== 'quieto') m.hacer(n); }, [0.6, 1.4]]);
  }
  // llevarla en el dedo y soltarla (cae y se sacude): los momentos, desde que la coges
  casos.push(['llevar', (m) => {
    const c = m.cabeza; m.__dedo = [c[0], c[1] + 40]; m.coger?.(...m.__dedo);
  }, [0.5, 1, 1.5, 1.9, 2.2, 2.6, 3.2, 4.2], (m, t, dt) => {
    if (!m.__dedo || !m.llevar) return;
    if (t < 1.8) { m.__dedo[0] += 60 * dt * Math.sin(t * 3); m.__dedo[1] -= 30 * dt; m.llevar(...m.__dedo); }
    else if (!m.__suelta) { m.__suelta = true; m.soltar(...m.__dedo); }
  }]);

  const SUPS = [{ id: 's', x1: 40, x2: 900, y: 600 }, { id: 't', x1: 40, x2: 460, y: 470 }];
  const fallos = [], porDetector = {};
  let n = 0, nContiene = 0, dentro = 0, silueta = 0;
  const vistos = new Set();

  for (const sexo of sexos) for (const forma of formas) for (const [nombre, preparar, momentos, cada] of casos) {
    if (solo && !solo.has(nombre) && !(solo.has(nombre.split(':')[0]) && !ver)) continue;
    // su azar, el mismo para cada pose, forma y sexo (así «&ver=» repite el caso)
    let a = [...`${nombre}|${forma}|${sexo}`].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
    const azar = () => { a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const m = crearMascota({ superficies: () => SUPS, escala: E, azar, autonoma: false });
    m.forma = forma;
    if (sexo) m.sexo = sexo;
    if (COLETA) m.coleta = true;
    for (let i = 0; i < 20; i++) m.paso(1 / 30);
    preparar(m);
    let t = 0;
    for (const hasta of (ver ? [verT] : momentos.map((x) => +(x + DESFASE).toFixed(3)))) {
      let f = null;
      while (t < hasta - 1e-6) { const dt = 1 / 30; cada?.(m, t, dt); f = m.paso(dt); t += dt; if (SEGUIDOS && hasta - t < SEGUIDOS / 30 && t < hasta - 1e-6) traje.dibujar({ ...f, objeto: null, efectos: [], cinta: false, destello: 0, carga: CARGA, sombra: null }, [0, 0]); }
      f = f || m.paso(1 / 30);
      if (ver) dbg = { arcos: [], interior: [], claros: [] };
      n++;
      const etiqueta = `${nombre} t=${hasta} forma=${forma}${sexo ? ` sexo=${sexo}` : ''}`;
      for (const que of mirar(f)) {
        const clave = que.split(':')[0];
        porDetector[clave] = (porDetector[clave] || 0) + 1;
        if ((porDetector[clave] || 0) <= maxLista) fallos.push(`FALLO ${etiqueta}: ${que}`);
        vistos.add(etiqueta);
      }
      if (mirarContiene && n % 5 === 0) comprobarContiene(m, f);
    }
  }
  const total = Object.values(porDetector).reduce((s, x) => s + x, 0);
  const resumen = Object.entries(porDetector).map(([k, x]) => `${k}=${x}`).join(' ') || 'ninguno';
  const lineas = [`RESULTADO casos=${n} fallos=${vistos.size}`, `detectores: ${resumen} (en total ${total})`,
    `formas: ${formas.join(', ')} · sexos: ${sexos.map((s) => s ?? '(el camino no los entiende)').join(', ')} · poses: ${casos.length}`];
  if (mirarContiene) lineas.push(`CONTIENE: ${silueta ? ((100 * dentro) / silueta).toFixed(1) : '?'} % de la silueta dentro de contiene() (${nContiene} fotogramas, ${silueta} puntos)`);
  return { lineas, lista: fallos, fallos: vistos.size, contiene: mirarContiene && silueta ? (100 * dentro) / silueta : null };

  // ——— lo que mira en cada fotograma ———
  function mirar(f0) {
    const res = [];
    const f = { ...f0, objeto: null, efectos: [], cinta: false, destello: 0, carga: CARGA, sombra: null };
    const p = f.cin.p;
    // la zona, respecto a las caderas
    const H0 = [(p.caderaI[0] + p.caderaD[0]) / 2, (p.caderaI[1] + p.caderaD[1]) / 2];
    let d = [p.pelvis[0] - p.lumbar[0], p.pelvis[1] - p.lumbar[1]];
    let ld = Math.hypot(d[0], d[1]);
    if (ld < 6) { d = [p.pelvis[0] - p.cuello[0], p.pelvis[1] - p.cuello[1]]; ld = Math.hypot(d[0], d[1]); }
    d = ld < 6 ? [0, 1] : [d[0] / ld, d[1] / ld];
    const s = [-d[1], d[0]];
    const medio = Math.hypot(p.caderaD[0] - p.caderaI[0], p.caderaD[1] - p.caderaI[1]) / 2;
    const U = medio + 5, V0 = f.cin.frente > -0.3 ? -7 : -4, V1 = 11;
    const local = (x, y) => [(x - H0[0]) * s[0] + (y - H0[1]) * s[1], (x - H0[0]) * d[0] + (y - H0[1]) * d[1]];
    const enZona = (x, y) => { const [u, vv] = local(x, y); return Math.abs(u) <= U && vv >= V0 && vv <= V1; };
    const juntas = [];
    for (const l of ['I', 'D']) juntas.push([p['mano' + l], 7], [p['codo' + l], 5.5], [p['rodilla' + l], 8], [p['tobillo' + l], 6], [p['punta' + l], 6]);
    juntas.push([p.cabeza, 19]);
    const junta = (x, y) => juntas.some(([c, r]) => (x - c[0]) ** 2 + (y - c[1]) ** 2 < r * r);

    // 0. (D-141) las manos y las rodillas: dos manoplas o dos rodillas juntas en la entrepierna se leen como un par de
    // bolas; y una mano sola, justo en medio y por debajo de la línea de las caderas (de frente o de espaldas), como una
    // (solo lo que queda delante del cuerpo: una mano detrás de él no se ve encima de la entrepierna)
    const lc = (c) => local(c[0], c[1]);
    const enCentro = ([u, vv], ancho, v0, v1) => Math.abs(u) <= ancho && vv >= v0 && vv <= v1;
    const zP = p.pelvis[2], delanteDe = (c) => c[2] >= zP - 2;
    const mI = lc(p.manoI), mD = lc(p.manoD);
    const dM = Math.hypot(p.manoI[0] - p.manoD[0], p.manoI[1] - p.manoD[1]);
    if (delanteDe(p.manoI) && delanteDe(p.manoD) && enCentro(mI, medio + 2, -4, V1) && enCentro(mD, medio + 2, -4, V1) && dM < 11) {
      res.push(`manos: las dos juntas en la entrepierna (a ${dM.toFixed(1)} u)`);
    } else if (Math.abs(f.cin.frente) >= 0.5) {
      for (const [mm, c] of [[mI, p.manoI], [mD, p.manoD]]) {
        if (delanteDe(c) && enCentro(mm, Math.max(2.5, medio - 1), 1, 9)) res.push(`mano: una en medio de la entrepierna (u=${mm[0].toFixed(1)}, v=${mm[1].toFixed(1)})`);
      }
    }
    const kI = lc(p.rodillaI), kD = lc(p.rodillaD);
    const dK = Math.hypot(p.rodillaI[0] - p.rodillaD[0], p.rodillaI[1] - p.rodillaD[1]);
    const rRod = (f.cin.radios?.pierna || 3) * 1.1;
    if (Math.abs(f.cin.frente) >= 0.5 && enCentro(kI, medio + 4, -3, V1 + 3) && enCentro(kD, medio + 4, -3, V1 + 3) && dK < 2 * rRod + 2.5) {
      res.push(`rodillas: las dos juntas en el regazo (a ${dK.toFixed(1)} u)`);
    }

    // 1. datos: manchas y líneas
    for (const parte of f.cin.partes) {
      for (const mm of parte.manchas || []) {
        if (mm.detras) continue;
        let dentroZ = 0, tot = 0;
        for (let i = -1; i < 12; i++) {
          const ang = (i * Math.PI) / 6, k = i < 0 ? 0 : 0.6;
          const lx = Math.cos(ang) * mm.rx * k, ly = Math.sin(ang) * mm.ry * k;
          const x = mm.c[0] + lx * Math.cos(mm.rot) - ly * Math.sin(mm.rot), y = mm.c[1] + lx * Math.sin(mm.rot) + ly * Math.cos(mm.rot);
          tot++;
          if (enZona(x, y)) dentroZ++;
        }
        if (dentroZ / tot < 0.4) continue;
        const quien = (mm.musculos && mm.musculos.length) ? mm.musculos.join('+') : 'barriga';
        const luz = Math.max(0, ...(mm.musculos || []).map((k) => f.cuerpo?.luz?.[k] || 0));
        const rmax = Math.max(mm.rx, mm.ry), rmin = Math.max(0.01, Math.min(mm.rx, mm.ry));
        // encendido: en medio (entre las caderas) o redondo; uno alargado a lo largo del muslo, al lado, es el muslo
        if (luz > 0.04 && (Math.abs(local(mm.c[0], mm.c[1])[0]) <= medio + 1 || rmax / rmin < 1.6)) res.push(`encendido: ${quien} en la zona`);
        if (!mm.liso && rmax / rmin < 1.6) res.push(`mancha: ${quien} redonda y con brillo (${rmax.toFixed(1)}×${rmin.toFixed(1)})`);
      }
    }
    for (const dt of f.cin.detalles || []) {
      const vis = Math.min(1, Math.max(0, dt.cara * f.cin.frente * 2.5)) * dt.fuerza;
      if (vis < 0.05) continue;
      const pts = dt.puntos;
      let entra = false;
      for (let i = 0; i + 1 < pts.length && !entra; i++) {
        for (let k = 0; k <= 4; k++) {
          const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / 4, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / 4;
          if (enZona(x, y) && local(x, y)[1] >= 0) { entra = true; break; } // por debajo de la línea de las caderas
        }
      }
      if (entra) res.push(`línea: una línea de ${dt.cara > 0 ? 'delante' : 'detrás'} baja a la entrepierna`);
    }

    // 2. píxeles: el cuerpo entero, con la ingle en el centro del lienzo
    const k = f.escala * D, kc = f.escala;
    const pel = [f.raiz[0] + H0[0] * kc, f.raiz[1] + H0[1] * kc];
    const origen = [pel[0] - W / D / 2, pel[1] - H / D / 2];
    traje.dibujar(f, origen);
    const img = ctx.getImageData(0, 0, W, H).data;
    // de unidades (respecto a la pelvis del fotograma) a px del lienzo, y al revés
    const aPx = (x, y) => [Math.round((f.raiz[0] + x * kc - origen[0]) * D), Math.round((f.raiz[1] + y * kc - origen[1]) * D)];
    const aU = (X, Y) => [(X / D + origen[0] - f.raiz[0]) / kc, (Y / D + origen[1] - f.raiz[1]) / kc];
    // 0 fondo, 1 cuerpo, 2 borde, 3 lo de detrás
    const clase = (X, Y, data = img) => {
      if (X < 0 || Y < 0 || X >= W || Y >= H) return 0;
      const i = (Y * W + X) * 4, r = data[i], g = data[i + 1], b = data[i + 2], al = data[i + 3];
      if (al < 150) return 0;
      if (r > 110 && b > 110 && g < 0.8 * Math.min(r, b)) return 2;
      if (b > g + 30 && b > r + 30) return 3;
      return 1;
    };
    const luma = (X, Y) => { const i = (Y * W + X) * 4; return 0.2126 * img[i] + 0.7152 * img[i + 1] + 0.0722 * img[i + 2]; };
    // la caja de la zona, en px
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const [u, vv] of [[-U, V0], [U, V0], [-U, V1], [U, V1]]) {
      const x = H0[0] + u * s[0] + vv * d[0], y = H0[1] + u * s[1] + vv * d[1];
      const [X, Y] = aPx(x, y);
      x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
    }
    x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
    const zonaPx = (X, Y) => { const [x, y] = aU(X + 0.5, Y + 0.5); return enZona(x, y) && !junta(x, y); };
    if (dbg) {
      dbg.img = ctx.getImageData(0, 0, W, H);
      dbg.zona = [[-U, V0], [U, V0], [U, V1], [-U, V1]].map(([u, vv]) => aPx(H0[0] + u * s[0] + vv * d[0], H0[1] + u * s[1] + vv * d[1]));
      dbg.juntas = juntas.map(([c, r]) => [...aPx(c[0], c[1]), r * k]);
    }

    // 2a. arcos de contorno dentro del cuerpo
    const R4 = 4, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
    const interior = new Uint8Array(W * H);
    for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
      if (clase(X, Y) !== 2 || !zonaPx(X, Y)) continue;
      let ok = true;
      for (const [dx, dy] of dirs) {
        const c = clase(Math.round(X + dx * R4), Math.round(Y + dy * R4));
        if (c === 0 || c === 3) { ok = false; break; }
      }
      if (ok) { interior[Y * W + X] = 1; dbg?.interior.push([X, Y]); }
    }
    for (const comp of componentes(interior, x0, y0, x1, y1, 8)) {
      if (comp.length < 10) continue;
      const c = circulo(comp);
      if (!c) continue;
      const Ru = c.r / k;
      const [cx, cy] = aU(c.x, c.y);
      // un arco de verdad: de 3,8 a 9 unidades de radio, más de 140°, fino (no un pegote) y bien ajustado
      if (Ru < 3.8 || Ru > 9 || c.arco < 140 || c.error > 0.15 * c.r + 0.5 || comp.length < 16) continue;
      if (!enZona(cx, cy) || junta(cx, cy)) continue;
      res.push(`arco: contorno propio en arco (r=${Ru.toFixed(1)}, ${Math.round(c.arco)}°) en la zona`);
      dbg?.arcos.push(...comp);
    }

    // 2b. brillo aislado y redondeado
    const lumas = [];
    for (let Y = y0; Y <= y1; Y += 2) for (let X = x0; X <= x1; X += 2) if (clase(X, Y) === 1 && zonaPx(X, Y)) lumas.push(luma(X, Y));
    if (lumas.length > 20) {
      lumas.sort((a1, b1) => a1 - b1);
      const umbral = lumas[lumas.length >> 1] + 14;
      const claro = new Uint8Array(W * H);
      for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
        if (clase(X, Y) === 1 && luma(X, Y) > umbral && zonaPx(X, Y)) claro[Y * W + X] = 1;
      }
      for (const comp of componentes(claro, x0, y0, x1, y1, 4)) {
        const area = comp.length / (k * k);
        if (area < 3 || area > 140) continue;
        // del todo dentro de la zona (si toca su borde, es una franja que pasa)
        let toca = false;
        for (const [X, Y] of comp) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const X2 = X + dx * 2, Y2 = Y + dy * 2;
            if (X2 < x0 || Y2 < y0 || X2 > x1 || Y2 > y1 || !zonaPx(X2, Y2)) { toca = true; break; }
          }
          if (toca) break;
        }
        if (toca) continue;
        const asp = aspecto(comp);
        if (asp < 2.2) { res.push(`brillo: mancha de luz redondeada (${area.toFixed(0)} u², ${asp.toFixed(1)}:1) en la zona`); dbg?.claros.push(...comp); }
      }
    }

    // 2c. bulto entre los muslos: el hueco, bajando desde la línea de las caderas, con solo el tronco y las piernas
    // pintados (una mano que cuelga delante no cuenta). Cada columna: «fuera» (fuera del cuerpo ya en las caderas),
    // «lleno» (una pierna la tapa hasta abajo) o la altura del hueco. Cuenta un hueco con una pierna a cada lado, o el
    // que pasa por el centro (con las piernas detrás, lo de delante acaba ahí). De frente o de espaldas (hasta 45°): de
    // lado, lo de debajo de la cadera es el glúteo y el muslo.
    traje.dibujar({ ...f, cin: { ...f.cin, partes: f.cin.partes.filter((x) => !x.nombre.startsWith('brazo')) } }, origen);
    const imgP = ctx.getImageData(0, 0, W, H).data;
    const alturas = [];
    let centro = 0;
    for (let u = -U; u <= U + 1e-6; u += 0.5) {
      if (Math.abs(u) < 0.25) centro = alturas.length;
      const x = H0[0] + u * s[0], y = H0[1] + u * s[1];
      const [X, Y] = aPx(x, y);
      const c0 = clase(X, Y, imgP);
      if (c0 === 0 || c0 === 3) { alturas.push('fuera'); continue; }
      let h = 'lleno';
      for (let vv = 0.5; vv <= 13; vv += 0.5) {
        const [X2, Y2] = aPx(x + vv * d[0], y + vv * d[1]);
        const c2 = clase(X2, Y2, imgP);
        if (c2 === 0 || c2 === 3) { h = vv; break; } // lo de detrás (azul) cuenta como hueco: se ve el borde de delante
      }
      // si el hueco empieza en una rodilla o un pie (sentada, la rodilla queda en medio), esa columna no cuenta
      if (typeof h === 'number' && junta(x + h * d[0], y + h * d[1])) h = 'junta';
      if (dbg && typeof h === 'number') dbg.claros.push(aPx(x + h * d[0], y + h * d[1]));
      alturas.push(h);
    }
    let i0 = 0;
    while (i0 < alturas.length) {
      if (typeof alturas[i0] !== 'number') { i0++; continue; }
      let i1 = i0;
      while (i1 + 1 < alturas.length && typeof alturas[i1 + 1] === 'number') i1++;
      const lado = (j) => alturas[j] === 'lleno' || alturas[j] === 'junta';
      const entreMuslos = lado(i0 - 1) && lado(i1 + 1);
      // (un hueco de al menos 3 unidades de ancho: en una rendija entre las piernas juntas no cabe nada)
      if (i1 - i0 >= 5 && Math.abs(f.cin.frente) >= 0.7 && (entreMuslos || (i0 <= centro && centro <= i1))) {
        const tramoH = alturas.slice(i0, i1 + 1);
        const izq = [], der = [];
        tramoH.forEach((h, i) => { izq[i] = Math.min(h, i ? izq[i - 1] : Infinity); });
        for (let i = tramoH.length - 1; i >= 0; i--) der[i] = Math.min(tramoH[i], i < tramoH.length - 1 ? der[i + 1] : Infinity);
        let peor = 0;
        tramoH.forEach((h, i) => { peor = Math.max(peor, h - Math.max(izq[i], der[i])); });
        if (peor > 1.4) res.push(`bulto: algo cuelga entre los muslos (${peor.toFixed(1)} u por debajo de sus lados)`);
      }
      i0 = i1 + 1;
    }

    // 2d. barriga baja, de lado o de tres cuartos: con solo el tronco pintado
    const pies = (p.puntaI[0] - p.tobilloI[0] + p.puntaD[0] - p.tobilloD[0]) / 2;
    const delante = Math.sign(pies * s[0] + 0 * s[1]) || 0;
    if (Math.abs(f.cin.frente) < 0.9 && Math.abs(pies) > 1.5 && delante) {
      const tronco = f.cin.partes.filter((x) => x.nombre === 'tronco');
      traje.dibujar({ ...f, coleta: false, cin: { ...f.cin, partes: tronco } }, origen);
      const img2 = ctx.getImageData(0, 0, W, H).data;
      const borde = (vv, sg) => {
        const x = H0[0] + vv * d[0], y = H0[1] + vv * d[1];
        for (let u = 30; u >= 0; u -= 0.5) {
          const [X, Y] = aPx(x + sg * u * s[0], y + sg * u * s[1]);
          if (clase(X, Y, img2) !== 0) return u;
        }
        return null;
      };
      for (const sg of [delante]) {
        const ref = [];
        for (let vv = -30; vv <= -18; vv += 1) { const e = borde(vv, sg); if (e != null) ref.push(e); }
        if (ref.length < 5) continue;
        ref.sort((a1, b1) => a1 - b1);
        const r0 = ref[ref.length >> 1];
        let peor = -Infinity;
        for (let vv = -9; vv <= 3; vv += 0.5) { const e = borde(vv, sg); if (e != null) peor = Math.max(peor, e - r0); }
        if (peor > 4.5) res.push(`barriga: la barriga baja sale ${peor.toFixed(1)} u más que el pecho`);
      }
    }
    return [...new Set(res)];
  }

  // contiene() de su cerebro, contra la silueta pintada: cada punto del cuerpo tiene que estar dentro
  function comprobarContiene(m, f0) {
    if (!m.contiene) return;
    const f = { ...f0, objeto: null, efectos: [], cinta: false, destello: 0, carga: CARGA, sombra: null };
    const k = f.escala, p = f.cin.p;
    const origen = [f.raiz[0] + p.pelvis[0] * k - W / D / 2, f.raiz[1] + p.pelvis[1] * k - H / D / 2];
    traje.dibujar(f, origen);
    const img = ctx.getImageData(0, 0, W, H).data;
    nContiene++;
    for (let Y = 0; Y < H; Y += 3) for (let X = 0; X < W; X += 3) {
      if (img[(Y * W + X) * 4 + 3] < 200) continue;
      silueta++;
      if (m.contiene((X + 0.5) / D + origen[0], (Y + 0.5) / D + origen[1])) dentro++;
    }
  }

  // ——— utilidades ———
  function componentes(mapa, x0, y0, x1, y1, vecinos) {
    const visto = new Uint8Array(W * H), res = [];
    const V = vecinos === 8 ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
      const i = Y * W + X;
      if (!mapa[i] || visto[i]) continue;
      const comp = [], pila = [[X, Y]];
      visto[i] = 1;
      while (pila.length) {
        const [a1, b1] = pila.pop();
        comp.push([a1, b1]);
        for (const [dx, dy] of V) {
          const X2 = a1 + dx, Y2 = b1 + dy;
          if (X2 < x0 || Y2 < y0 || X2 > x1 || Y2 > y1) continue;
          const j = Y2 * W + X2;
          if (mapa[j] && !visto[j]) { visto[j] = 1; pila.push([X2, Y2]); }
        }
      }
      res.push(comp);
    }
    return res;
  }
  // un círculo que pase por esos puntos (Kasa), cuánto arco cubren (grados) y su error medio (px)
  function circulo(pts) {
    let sx = 0, sy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; }
    const mx = sx / pts.length, my = sy / pts.length;
    let suu = 0, suv = 0, svv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const [x, y] of pts) {
      const u = x - mx, w = y - my;
      suu += u * u; suv += u * w; svv += w * w; suuu += u * u * u; svvv += w * w * w; suvv += u * w * w; svuu += w * u * u;
    }
    const det = suu * svv - suv * suv;
    if (Math.abs(det) < 1e-6) return null;
    const b1 = 0.5 * (suuu + suvv), b2 = 0.5 * (svvv + svuu);
    const uc = (b1 * svv - b2 * suv) / det, vc = (suu * b2 - suv * b1) / det;
    const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / pts.length);
    const cx = uc + mx, cy = vc + my;
    let err = 0;
    const angs = [];
    for (const [x, y] of pts) { err += Math.abs(Math.hypot(x - cx, y - cy) - r); angs.push(Math.atan2(y - cy, x - cx)); }
    angs.sort((a1, b2_) => a1 - b2_);
    let hueco = angs[0] + 2 * Math.PI - angs[angs.length - 1];
    for (let i = 1; i < angs.length; i++) hueco = Math.max(hueco, angs[i] - angs[i - 1]);
    return { x: cx, y: cy, r, error: err / pts.length, arco: (360 * (2 * Math.PI - hueco)) / (2 * Math.PI) };
  }
  function aspecto(pts) {
    let sx = 0, sy = 0;
    for (const [x, y] of pts) { sx += x; sy += y; }
    const mx = sx / pts.length, my = sy / pts.length;
    let a1 = 0, b1 = 0, c1 = 0;
    for (const [x, y] of pts) { a1 += (x - mx) ** 2; b1 += (x - mx) * (y - my); c1 += (y - my) ** 2; }
    a1 /= pts.length; b1 /= pts.length; c1 /= pts.length;
    const tr = (a1 + c1) / 2, de = Math.sqrt(((a1 - c1) / 2) ** 2 + b1 * b1);
    return Math.sqrt((tr + de + 0.08) / (Math.max(0, tr - de) + 0.08));
  }
}
