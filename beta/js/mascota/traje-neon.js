// Traje de neón con volumen (D-130), con un cuerpo de verdad (D-138): un cuerpo de luz, con su halo; la cabeza, una
// bola con la cara del boceto del globo (dos puntitos por ojos; las cejas y la boca se encienden al expresar algo y se
// apagan).
// Pinta en un <canvas> los volúmenes que le da el esqueleto, por capas: lo de detrás, primero (y algo más oscuro). Cada
// capa es una sola silueta, con el borde solo por fuera (capasDe()): el tronco, con hombros, cintura, cadera y cuello,
// y lo que está a su altura (de pie, las piernas); brazos y piernas, más gruesos junto al cuerpo, con manos; y lo que
// queda delante sale del cuerpo sin costura. Una sola luz, de arriba a la izquierda, para todo (iluminar()).
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
const BORDE = 1.3; // grosor del borde oscuro, en unidades
const TAU = Math.PI * 2;
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// Un cuerpo de verdad (D-138): cuánto engorda o adelgaza cada tramo en su raíz y en su punta, por su radio en el
// esqueleto: más gruesos junto al cuerpo y más finos hacia la muñeca y el tobillo.
const AFINAR = {
  brazo: [[1.2, 0.98], [1.0, 0.8]],                   // brazo y antebrazo
  pierna: [[1.24, 0.96], [0.98, 0.74], [1.05, 0.86]], // muslo, pierna y pie
};
const MANO = 1.12; // la mano, algo más gruesa que la muñeca (por el radio del brazo)
const HALO_RES = 0.5; // la resolución del halo, por la del lienzo: es un resplandor, y así cuesta mucho menos
// Su luz (D-138): cada degradado, de arriba a la izquierda (0) a abajo a la derecha (1) de todo su cuerpo, con su color
// mezclado hacia el blanco (+) o hacia el negro (−) en cada punto: el cuerpo, y la franja de sombra y la de luz de cada
// tramo (más oscura y más clara que él donde caen).
const TONOS = {
  cuerpo: [[0, 0.22], [0.45, 0], [1, -0.2]],
  sombra: [[0, -0.04], [0.45, -0.14], [1, -0.3]],
  luz: [[0, 0.42], [0.45, 0.22], [1, 0.06]],
};
// Un color (#rrggbb) mezclado hacia el blanco (k > 0) o hacia el negro (k < 0); guardado, que se pide en cada fotograma.
const tonos = new Map();
function tono(color, k) {
  if (!k) return color;
  const clave = `${color}${k}`;
  let v = tonos.get(clave);
  if (!v) {
    const hacia = k > 0 ? 255 : 0, t = Math.abs(k);
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    v = `rgb(${rgb.map((x) => Math.round(x + (hacia - x) * t)).join(', ')})`;
    tonos.set(clave, v);
  }
  return v;
}
const RAIZ = 0.42; // lo de arriba del brazo o del muslo que va con el tronco cuando la parte queda delante

export function crearTrajeNeon(lienzo) {
  const ctx = lienzo.getContext('2d');
  const halo = document.createElement('canvas'); // el halo se pinta aparte para que no se acumule donde se cruzan
  const hctx = halo.getContext('2d');
  const capa = document.createElement('canvas'); // y cada capa del cuerpo, para que su luz no se salga de ella
  const cctx = capa.getContext('2d');
  let ancho = 0, alto = 0, dpr = 1, huesos = false, base = 1;
  let tema = 'claro', luz = 'verde', col = LUCES.verde.claro;
  let ox = 0, oy = 0, recorte = null; // dónde cae el lienzo (px del escenario) y la franja donde se ve
  let brillo = 1; // cuánto brilla su halo (su página de Ajustes: suave, normal o intenso)

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
  // lo que hay entre los dos) o { m } (una mancha: un músculo, la barriga).
  function rellenar(c, lista, extra) {
    trazado(c, lista, extra);
    c.fill();
  }
  function trazado(c, lista, extra) {
    c.beginPath();
    for (const s of lista) {
      if (s.m) {
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
        if (d <= Math.abs(r1 - r2) + 1e-3) {
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

  // ——— Un cuerpo de verdad (D-138) ———
  // El tronco: la espalda (del cuello a la cintura), los hombros, que caen del cuello (el trapecio, de cada lado), los
  // costados (de cada hombro a la cintura, más estrecha, y de ella a la cadera), la cadera, el cuello y sus manchas (el
  // pecho, la barriga…). Visto de lado, los hombros y la cadera se juntan solos (el esqueleto ya los gira).
  function troncoDe(f, tronco) {
    const p = f.cin.p;
    const [[, , rT], [, , rC], [, , rH]] = tronco.segmentos;
    const formas = [
      { a: p.cuello, b: p.cintura, r1: rT, r2: rT * 0.94 },
      { a: p.caderaI, b: p.caderaD, r1: rC, r2: rC },
      { a: p.cuello, b: mezcla(p.cuello, p.cabeza, 0.6), r1: rT * 0.62, r2: rT * 0.5 }, // el cuello
    ];
    for (const l of ['I', 'D']) {
      const w = [p.cintura[0] + (p['cadera' + l][0] - p.pelvis[0]) * 0.7, p.cintura[1] + (p['cadera' + l][1] - p.pelvis[1]) * 0.7];
      formas.push(
        { a: p.cuello, b: p['hombro' + l], r1: rT * 0.78, r2: rH * 0.92 },   // el hombro, que cae del cuello
        { a: p['hombro' + l], b: w, r1: rH * 0.95, r2: rT * 0.62 },          // el costado, hasta la cintura
        { a: w, b: p['cadera' + l], r1: rT * 0.62, r2: rC * 1.05 },          // y hasta la cadera
      );
    }
    for (const m of tronco.manchas) if (!m.detras) formas.push({ m });
    return formas;
  }
  // Un brazo o una pierna: cada tramo, más grueso en la raíz que en la punta, con su mano, y sus músculos. Si queda
  // delante del tronco, va en su propia capa, pero su raíz (lo de arriba del primer tramo y el deltoides) va también
  // con el tronco y su borde empieza más abajo: así sale del cuerpo sin costura y, más abajo, se ve delante.
  function extremidad(parte) {
    const brazo = parte.nombre.startsWith('brazo');
    const k = brazo ? AFINAR.brazo : AFINAR.pierna;
    const tramos = parte.segmentos.map(([a, b, r], i) => ({ a, b, r1: r * (k[i]?.[0] ?? 1), r2: r * (k[i]?.[1] ?? 1) }));
    const mano = brazo ? [{ c: parte.segmentos[1][1], r: parte.segmentos[0][2] * MANO }] : [];
    const manchas = parte.manchas.filter((m) => !m.detras).map((m) => ({ m }));
    const hombro = manchas.filter((s) => s.m.musculos.some((x) => x.startsWith('hombros')));
    const t0 = tramos[0];
    const desde = (u) => ({ ...t0, a: mezcla(t0.a, t0.b, u), r1: t0.r1 + (t0.r2 - t0.r1) * u });
    // las franjas de luz de cada tramo (sin el pie); si queda delante, desde algo más abajo de su raíz
    const bandas = tramos.slice(0, 2).map((t) => ({ a: t.a, b: t.b, r: Math.min(t.r1, t.r2) }));
    const corta = desde(RAIZ + 0.06);
    return {
      formas: [...tramos, ...mano, ...manchas],
      raiz: [{ ...t0, b: mezcla(t0.a, t0.b, RAIZ), r2: t0.r1 + (t0.r2 - t0.r1) * RAIZ }, ...hombro],
      conBorde: [desde(RAIZ + 0.04), ...tramos.slice(1), ...mano, ...manchas.filter((s) => !hombro.includes(s))],
      bandas,
      bandasDelante: [{ a: corta.a, b: corta.b, r: Math.min(corta.r1, corta.r2) }, ...bandas.slice(1)],
    };
  }
  // Las capas del cuerpo, de atrás adelante. Cada una se pinta entera de una vez (primero su borde, todas sus formas
  // engordadas; luego su cuerpo encima), así que lo que va en la misma capa es un solo cuerpo, sin costuras: lo que
  // queda muy detrás (más oscuro); el tronco, con el cuello y lo que está a su altura (de pie, las piernas); y cada parte
  // que queda delante (un brazo, la cabeza…), una a una, en su orden.
  function capasDe(f) {
    const partes = f.cin.partes;
    const tronco = partes.find((x) => x.nombre === 'tronco');
    const formasTronco = troncoDe(f, tronco);
    // el tronco, sin franjas (le basta su degradado; una franja en medio del pecho parecería una costura)
    const medio = { formas: [...formasTronco], borde: [...formasTronco], bandas: [], color: col.cuerpo, tronco };
    const lejos = { formas: [], borde: [], bandas: [], color: col.lejos };
    const delante = [];
    for (const parte of partes) {
      if (parte === tronco) continue;
      if (parte.centro) {
        const s = [{ c: parte.centro, r: parte.radio }];
        delante.push({ formas: s, borde: s, bandas: [], color: col.cuerpo, cabeza: parte });
        continue;
      }
      const e = extremidad(parte);
      if (parte.clave < -3) {
        lejos.formas.push(...e.formas);
        lejos.borde.push(...e.formas);
        lejos.bandas.push(...e.bandas);
      } else if (parte.clave <= tronco.clave) {
        medio.formas.push(...e.formas);
        medio.borde.push(...e.formas);
        medio.bandas.push(...e.bandas);
      } else {
        medio.formas.push(...e.raiz);
        medio.borde.push(...e.raiz);
        delante.push({ formas: e.formas, borde: e.conBorde, bandas: e.bandasDelante, color: col.cuerpo });
      }
    }
    return [...(lejos.formas.length ? [lejos] : []), medio, ...delante];
  }
  // todos los volúmenes, engordados «extra» unidades (para el halo)
  function formas(c, capas, extra) {
    rellenar(c, capas.flatMap((cp) => cp.formas), extra);
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
    const k = f.escala, mg = 14 * k;
    return [
      lim(Math.floor(f.raiz[0] + x0 * k - mg), ox, ox + ancho), lim(Math.floor(f.raiz[1] + y0 * k - mg), oy, oy + alto),
      lim(Math.ceil(f.raiz[0] + x1 * k + mg), ox, ox + ancho), lim(Math.ceil(f.raiz[1] + y1 * k + mg), oy, oy + alto),
    ];
  }

  function pintarHalo(f, capas) {
    const [x0, y0, x1, y1] = caja(f), w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const intensidad = brillo * Math.max(0.25, f.carga ?? 1); // en el descanso, la carga: de apagada a recargada
    const hr = dpr * HALO_RES; // el halo, a media resolución: es un resplandor (y así cuesta la cuarta parte)
    for (const [extra, alfa] of [[10 * (0.8 + 0.2 * brillo), col.halo2 * (1 + 2 * f.destello) * intensidad], [4.5, col.halo1 * (1 + 1.6 * f.destello) * intensidad]]) {
      hctx.setTransform(hr, 0, 0, hr, -ox * hr, -oy * hr);
      hctx.clearRect(x0, y0, w, h);
      hctx.translate(f.raiz[0], f.raiz[1]);
      hctx.scale(f.escala, f.escala);
      hctx.fillStyle = col.halo;
      formas(hctx, capas, extra);
      ctx.globalAlpha = Math.min(1, alfa) * base;
      ctx.drawImage(halo, (x0 - ox) * hr, (y0 - oy) * hr, w * hr, h * hr, x0, y0, w, h);
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

  // Las capas del cuerpo (D-138), una a una: su borde (todas sus formas, engordadas) y su cuerpo encima, ya con su luz
  // (un degradado de arriba a la izquierda, el mismo en todas las capas, así que casan), y lo demás de su luz
  // (iluminar()). A pleno brillo, directamente en el lienzo; a medio brillo (cargándose en el descanso), cada capa en un
  // lienzo aparte y luego al de verdad, entera (si no, se verían sus formas solapadas). Tras la cabeza, la cara y la cinta.
  function pintarCuerpo(f, capas) {
    const marco = marcoDe(f);
    const aparte = base < 0.999;
    for (const cp of capas) {
      let c = ctx, x0 = 0, y0 = 0, w = 0, h = 0;
      if (aparte) {
        [x0, y0, w, h] = cajaDe(f, cp);
        w -= x0;
        h -= y0;
        if (w <= 0 || h <= 0) continue;
        c = cctx;
        c.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
        c.clearRect(x0, y0, w, h);
      } else ctx.save();
      c.translate(f.raiz[0], f.raiz[1]);
      c.scale(f.escala, f.escala);
      c.fillStyle = col.borde;
      rellenar(c, cp.borde, BORDE);
      c.fillStyle = cp.cabeza ? luzDeCabeza(c, cp.cabeza, cp.color) : luzDe(c, marco, cp.color, TONOS.cuerpo);
      rellenar(c, cp.formas, 0);
      iluminar(c, f, cp, marco);
      if (aparte) {
        ctx.globalAlpha = base;
        ctx.drawImage(capa, (x0 - ox) * dpr, (y0 - oy) * dpr, w * dpr, h * dpr, x0, y0, w, h);
        ctx.globalAlpha = 1;
      } else ctx.restore();
      if (cp.cabeza) {
        ctx.save();
        ctx.translate(f.raiz[0], f.raiz[1]);
        ctx.scale(f.escala, f.escala);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = base;
        pintarCara(f, cp.cabeza);
        if (f.cinta) pintarCinta(f, cp.cabeza);
        ctx.restore();
      }
    }
  }
  // Dónde cae una capa, en px del escenario: solo eso se limpia, se ilumina y se pasa al lienzo (una capa de un brazo es
  // mucho más pequeña que todo el cuerpo).
  function cajaDe(f, cp) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const ver = (x, y, r) => {
      if (x - r < x0) x0 = x - r;
      if (y - r < y0) y0 = y - r;
      if (x + r > x1) x1 = x + r;
      if (y + r > y1) y1 = y + r;
    };
    for (const s of cp.formas) {
      if (s.m) ver(s.m.c[0], s.m.c[1], Math.max(s.m.rx, s.m.ry) + 3);
      else if (s.c) ver(s.c[0], s.c[1], s.r);
      else {
        ver(s.a[0], s.a[1], s.r1);
        ver(s.b[0], s.b[1], s.r2);
      }
    }
    const k = f.escala, mg = (BORDE + 1) * k + 2;
    return [
      lim(Math.floor(f.raiz[0] + x0 * k - mg), ox, ox + ancho), lim(Math.floor(f.raiz[1] + y0 * k - mg), oy, oy + alto),
      lim(Math.ceil(f.raiz[0] + x1 * k + mg), ox, ox + ancho), lim(Math.ceil(f.raiz[1] + y1 * k + mg), oy, oy + alto),
    ];
  }
  // Dónde está todo su cuerpo, en unidades (para su luz, que va de una esquina a otra, sea cual sea su postura).
  function marcoDe(f) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k in f.cin.p) {
      const [x, y] = f.cin.p[k];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const R = 18;
    return { x0: x0 - R, y0: y0 - R, x1: x1 + R, y1: y1 + R };
  }
  // El degradado de su luz, de arriba a la izquierda de todo su cuerpo («marco») a abajo a la derecha, con su color
  // mezclado hacia el blanco o el negro en cada punto (TONOS).
  function luzDe(c, marco, color, tonos) {
    const g = c.createLinearGradient(marco.x0, marco.y0, marco.x1, marco.y1);
    for (const [t, k] of tonos) g.addColorStop(t, tono(color, k));
    return g;
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
  // Lo demás de la luz de una capa (dentro de ella): cada tubo, redondo (una franja de sombra abajo a la derecha y otra
  // de luz arriba a la izquierda, en tonos del mismo degradado); los músculos, con un brillo suave (y el que siente,
  // encendido); en el tronco, las líneas de un cuerpo definido y la sombra de la cabeza; y en la cabeza, su brillo.
  function iluminar(c, f, cp, marco) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (cp.cabeza) {
      const [x, y] = cp.cabeza.centro, R = cp.cabeza.radio, bx = x - R * 0.38, by = y - R * 0.42;
      const b = c.createRadialGradient(bx, by, 0, bx, by, R * 0.55);
      b.addColorStop(0, col.brillo);
      b.addColorStop(1, col.brillo0);
      c.fillStyle = b;
      disco(c, bx, by, R * 0.55);
      c.restore();
      return;
    }
    if (cp.bandas.length) {
      const sombra = luzDe(c, marco, cp.color, TONOS.sombra), luz = luzDe(c, marco, cp.color, TONOS.luz);
      for (const t of cp.bandas) bandas(c, t, sombra, luz);
    }
    for (const s of cp.formas) {
      if (!s.m) continue;
      const m = s.m, r = Math.min(m.rx, m.ry);
      c.fillStyle = 'rgba(255, 255, 255, 0.2)';
      c.beginPath();
      c.ellipse(m.c[0] - 0.3 * r, m.c[1] - 0.36 * r, m.rx * 0.5, m.ry * 0.34, m.rot, 0, TAU);
      c.fill();
      // el músculo que siente: se le enciende y late
      const i = Math.max(0, ...m.musculos.map((k) => f.cuerpo.luz[k] || 0));
      if (i < 0.04) continue;
      const late = i * (0.7 + 0.3 * Math.sin(f.t * TAU * 3.2));
      c.fillStyle = col.vivo;
      c.globalAlpha = late * 0.5;
      ovalo(c, m, 2.6);
      c.globalAlpha = late;
      ovalo(c, m, -0.5);
      c.globalAlpha = 1;
    }
    if (cp.tronco) {
      // las líneas de un cuerpo definido (las de delante, de frente; las de detrás, de espaldas)
      c.strokeStyle = col.detalle;
      c.lineWidth = 0.9;
      for (const d of f.cin.detalles) {
        const v = lim(d.cara * f.cin.frente * 2.5, 0, 1) * d.fuerza;
        if (v < 0.03) continue;
        const [a, b, e] = d.puntos;
        c.globalAlpha = v * 0.85;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        if (e) c.quadraticCurveTo(b[0], b[1], e[0], e[1]);
        else c.lineTo(b[0], b[1]);
        c.stroke();
      }
      c.globalAlpha = 1;
      // la sombra de la cabeza en el cuello y los hombros (solo sobre el cuerpo)
      const H = f.cin.p.cabeza, R = 17;
      const s = c.createRadialGradient(H[0] + 1, H[1] + R * 0.95, 0, H[0] + 1, H[1] + R * 0.95, R * 0.95);
      s.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
      s.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.save();
      trazado(c, cp.formas, 0);
      c.clip();
      c.fillStyle = s;
      c.fillRect(H[0] - R, H[1], 2 * R, 2 * R);
      c.restore();
    }
    c.restore();
  }
  // Un tramo redondo: una franja de sombra abajo a la derecha y otra de luz arriba a la izquierda, dentro de él (con su
  // radio más fino, para que no se salgan) y opacas (así, donde se solapan, en las articulaciones, no se nota nada).
  function bandas(c, { a, b, r }, sombra, luz) {
    const linea = (dx, dy) => {
      c.beginPath();
      c.moveTo(a[0] + dx, a[1] + dy);
      c.lineTo(b[0] + dx + 0.01, b[1] + dy);
    };
    c.strokeStyle = sombra;
    c.lineWidth = r * 0.8;
    linea(r * 0.45, r * 0.42);
    c.stroke();
    c.strokeStyle = luz;
    c.lineWidth = r * 0.4;
    linea(-r * 0.36, -r * 0.4);
    c.stroke();
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
    const vis = (q) => lim((q[2] - zH) / 5, 0, 1);
    const en = (x, y, seguir = 1) => {
      const q = cin.cara(x, y);
      return [q[0] + mx * seguir, q[1] + my * seguir, q[2]];
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
    pintarHalo(f, capas);
    pintarCuerpo(f, capas);
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
