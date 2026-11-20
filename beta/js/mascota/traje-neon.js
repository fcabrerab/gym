// Traje de neón con volumen (D-130): tubos de luz gruesos (un borde más oscuro, el cuerpo y un brillo arriba a la
// izquierda), con su halo; la cabeza, una bola con la cara del boceto del globo (dos puntitos por ojos; las cejas y
// la boca se encienden al expresar algo y se apagan).
// Pinta en un <canvas> los volúmenes que le da el esqueleto, por orden: lo de detrás, primero (y algo más oscuro).
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

export function crearTrajeNeon(lienzo) {
  const ctx = lienzo.getContext('2d');
  const halo = document.createElement('canvas'); // el halo se pinta aparte para que no se acumule donde se cruzan
  const hctx = halo.getContext('2d');
  let ancho = 0, alto = 0, dpr = 1, huesos = false, base = 1;
  let tema = 'claro', luz = 'verde', col = LUCES.verde.claro;
  let ox = 0, oy = 0, recorte = null; // dónde cae el lienzo (px del escenario) y la franja donde se ve
  let brillo = 1; // cuánto brilla su halo (su página de Ajustes: suave, normal o intenso)

  function capsula(c, a, b, r) {
    c.lineWidth = 2 * r;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0] + 0.01, b[1]);
    c.stroke();
  }
  function ovalo(c, m, extra) {
    c.beginPath();
    c.ellipse(m.c[0], m.c[1], Math.max(0.1, m.rx + extra), Math.max(0.1, m.ry + extra), m.rot, 0, TAU);
    c.fill();
  }
  function disco(c, x, y, r) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  // todos los volúmenes, engordados «extra» unidades (para el halo)
  function formas(c, f, extra) {
    for (const p of f.cin.partes) {
      if (p.centro) disco(c, p.centro[0], p.centro[1], p.radio + extra);
      for (const [a, b, r] of p.segmentos) capsula(c, a, b, r + extra);
      for (const m of p.manchas) if (!m.detras) ovalo(c, m, extra);
    }
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

  function pintarHalo(f) {
    const [x0, y0, x1, y1] = caja(f), w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    const intensidad = brillo * Math.max(0.25, f.carga ?? 1); // en el descanso, la carga: de apagada a recargada
    for (const [extra, alfa] of [[10 * (0.8 + 0.2 * brillo), col.halo2 * (1 + 2 * f.destello) * intensidad], [4.5, col.halo1 * (1 + 1.6 * f.destello) * intensidad]]) {
      hctx.setTransform(dpr, 0, 0, dpr, -ox * dpr, -oy * dpr);
      hctx.clearRect(x0, y0, w, h);
      hctx.translate(f.raiz[0], f.raiz[1]);
      hctx.scale(f.escala, f.escala);
      hctx.fillStyle = hctx.strokeStyle = col.halo;
      hctx.lineCap = 'round';
      formas(hctx, f, extra);
      ctx.globalAlpha = Math.min(1, alfa) * base;
      ctx.drawImage(halo, (x0 - ox) * dpr, (y0 - oy) * dpr, w * dpr, h * dpr, x0, y0, w, h);
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

  function pintarParte(f, parte) {
    // el borde, el cuerpo (más oscuro si está detrás) y el brillo
    ctx.strokeStyle = ctx.fillStyle = col.borde;
    for (const [a, b, r] of parte.segmentos) capsula(ctx, a, b, r + BORDE);
    for (const m of parte.manchas) if (!m.detras) ovalo(ctx, m, BORDE);
    ctx.strokeStyle = ctx.fillStyle = parte.clave < -3 ? col.lejos : col.cuerpo;
    for (const [a, b, r] of parte.segmentos) capsula(ctx, a, b, r);
    for (const m of parte.manchas) if (!m.detras) ovalo(ctx, m, 0);
    // el músculo que siente: se le enciende y late
    for (const m of parte.manchas) {
      if (m.detras) continue;
      const i = Math.max(0, ...m.musculos.map((k) => f.cuerpo.luz[k] || 0));
      if (i < 0.04) continue;
      const late = i * (0.7 + 0.3 * Math.sin(f.t * TAU * 3.2));
      ctx.fillStyle = col.vivo;
      ctx.globalAlpha = late * 0.45 * base;
      ovalo(ctx, m, 2.6);
      ctx.globalAlpha = late * base;
      ovalo(ctx, m, -0.5);
      ctx.globalAlpha = base;
    }
    ctx.strokeStyle = ctx.fillStyle = col.brillo;
    for (const [a, b, r] of parte.segmentos) {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      if (l < r) continue;
      const k = Math.min(0.32, (r * 0.7) / l), ox = -0.3 * r, oy = -0.38 * r;
      capsula(ctx, [a[0] + dx * k + ox, a[1] + dy * k + oy], [b[0] - dx * k + ox, b[1] - dy * k + oy], r * 0.2);
    }
    for (const m of parte.manchas) {
      if (m.detras) continue;
      const r = Math.min(m.rx, m.ry);
      ctx.beginPath();
      ctx.ellipse(m.c[0] - 0.3 * r, m.c[1] - 0.36 * r, m.rx * 0.4, m.ry * 0.28, m.rot, 0, TAU);
      ctx.fill();
    }
    // en el tronco, las líneas de un cuerpo definido (las de delante, de frente; las de detrás, de espaldas)
    if (parte.nombre === 'tronco') {
      ctx.strokeStyle = col.detalle;
      ctx.lineWidth = 1;
      for (const d of f.cin.detalles) {
        const v = lim(d.cara * f.cin.frente * 2.5, 0, 1) * d.fuerza;
        if (v < 0.03) continue;
        const [a, b, c] = d.puntos;
        ctx.globalAlpha = v * base;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        if (c) ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]);
        else ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
      ctx.globalAlpha = base;
    }
  }

  function pintarCabeza(f, parte) {
    const [x, y] = parte.centro, R = parte.radio;
    ctx.fillStyle = col.borde;
    disco(ctx, x, y, R + BORDE);
    ctx.fillStyle = col.cuerpo;
    disco(ctx, x, y, R);
    const g = ctx.createRadialGradient(x - R * 0.38, y - R * 0.42, 0, x - R * 0.38, y - R * 0.42, R * 0.6);
    g.addColorStop(0, col.brillo);
    g.addColorStop(1, col.brillo0);
    ctx.fillStyle = g;
    disco(ctx, x, y, R);
    pintarCara(f, parte);
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
  // Lo que lleva en la mano (D-135): la botella (de la mano hacia fuera, como el antebrazo), la toalla, que cuelga, o el
  // trofeo, una copa dorada siempre derecha, con el pie en la mano.
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
    pintarSombra(f);
    pintarHalo(f);
    ctx.translate(f.raiz[0], f.raiz[1]);
    ctx.scale(f.escala, f.escala);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = base;
    for (const parte of f.cin.partes) {
      if (parte.centro) pintarCabeza(f, parte);
      else pintarParte(f, parte);
    }
    if (f.objeto) pintarObjeto(f, f.objeto);
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
      for (const c of [lienzo, halo]) {
        c.width = Math.round(w * r);
        c.height = Math.round(h * r);
      }
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
