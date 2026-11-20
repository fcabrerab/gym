// Traje de neón (D-130): el cuerpo del boceto 7 (tubos de luz) con la cara del boceto 2 (dos puntitos;
// las cejas y la boca se encienden como un tubo al expresar algo y se apagan).
// El resplandor va con trazos superpuestos, sin filtros de desenfoque: gasta poco en el móvil.
// Solo pinta el fotograma que le da el cerebro: no decide nada. Otro estilo sería otro archivo como este.

const NS = 'http://www.w3.org/2000/svg';
const RAD = Math.PI / 180;

const ESTILO = `
.mn-capa { --mn-tubo: light-dark(#16a34a, #22c55e); --mn-vivo: light-dark(#4ade80, #bbf7d0);
  --mn-nucleo: light-dark(#f7fee7, #f0fdf4); --mn-halo: light-dark(rgb(22 163 74 / .2), rgb(34 197 94 / .26));
  --mn-halo2: light-dark(rgb(22 163 74 / .08), rgb(34 197 94 / .11)); --mn-borde: light-dark(rgb(20 83 45 / .6), transparent);
  --mn-ojo: light-dark(#14532d, #f0fdf4); --mn-ojo-halo: light-dark(transparent, rgb(74 222 128 / .55));
  --mn-cristal: light-dark(rgb(34 197 94 / .2), rgb(34 197 94 / .3)); --mn-cristal2: light-dark(rgb(34 197 94 / .05), rgb(34 197 94 / .04));
  --mn-brillo: light-dark(rgb(255 255 255 / .95), rgb(240 253 244 / .5)); --mn-rubor: light-dark(rgb(244 114 182 / .55), rgb(249 168 212 / .5));
  --mn-sombra: light-dark(rgb(22 163 74 / .3), rgb(34 197 94 / .38)); --mn-hueso: light-dark(#334155, #cbd5e1);
  }
.mn { --t: 4.6px; }
.mn-h2 { stroke: var(--mn-halo2); stroke-width: calc(var(--t) + 11px); }
.mn-h1 { stroke: var(--mn-halo); stroke-width: calc(var(--t) + 4.5px); }
.mn-bo { stroke: var(--mn-borde); stroke-width: calc(var(--t) + 1.4px); }
.mn-tu { stroke: var(--mn-tubo); stroke-width: var(--t); }
.mn-nu { stroke: var(--mn-nucleo); stroke-width: 1.5px; }
.mn-fino.mn-h1 { stroke-width: 6.5px; } .mn-fino.mn-bo { stroke-width: 3.8px; }
.mn-fino.mn-tu { stroke-width: 2.6px; } .mn-fino.mn-nu { stroke-width: .9px; }
.mn-de { stroke: var(--mn-vivo); stroke-width: calc(var(--t) + 9px); }
.mn-lh { stroke: var(--mn-vivo); stroke-width: 10px; opacity: .45; }
.mn-lt { stroke: var(--mn-vivo); stroke-width: 4px; }
.mn-ln { stroke: #ffffff; stroke-width: 1.8px; }
.mn-gl { fill: none; stroke: var(--mn-brillo); stroke-width: 1.7px; stroke-linecap: round; }
.mn-ojo { fill: var(--mn-ojo); } .mn-ojo-h { fill: var(--mn-ojo-halo); }
.mn-ru { fill: var(--mn-rubor); }
.mn-cr0 { stop-color: var(--mn-cristal); } .mn-cr1 { stop-color: var(--mn-cristal2); }
.mn-so0 { stop-color: var(--mn-sombra); } .mn-so1 { stop-color: transparent; }
.mn-hu { fill: none; stroke: var(--mn-hueso); stroke-width: 1.2px; stroke-dasharray: 3 2; }
.mn-ar { fill: var(--mn-hueso); }
.mn-huesos { display: none; }
.mn.ver-huesos .mn-huesos { display: inline; }
.mn.ver-huesos .mn-traje { opacity: .3; }
`;

const n1 = (v) => Math.round(v * 10) / 10;
const P2 = (q) => `${n1(q[0])} ${n1(q[1])}`;
const L = (a, b) => `M${P2(a)}L${P2(b)}`;
const Q = (a, c, b) => `M${P2(a)}Q${P2(c)} ${P2(b)}`;
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
// Solo el principio de una curva (de 0 a t): así un músculo «se dibuja» poco a poco al definirse.
function trozoQ(a, c, b, t) {
  if (t <= 0.03) return '';
  if (t >= 0.995) return Q(a, c, b);
  const q0 = lerp2(a, c, t), q1 = lerp2(c, b, t);
  return Q(a, q0, lerp2(q0, q1, t));
}
const trozoL = (a, b, t) => (t <= 0.03 ? '' : L(a, lerp2(a, b, Math.min(1, t))));
const circulo = (c, r) => `M${n1(c[0] - r)} ${n1(c[1])}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0`;
function elipse(c, rx, ry, ang) {
  const ux = Math.cos(ang * RAD) * rx, uy = Math.sin(ang * RAD) * rx;
  const a = [c[0] + ux, c[1] + uy], b = [c[0] - ux, c[1] - uy], arco = `${n1(rx)} ${n1(ry)} ${n1(ang)} 1 0`;
  return `M${P2(a)}A${arco} ${P2(b)}A${arco} ${P2(a)}`;
}

export function crearTrajeNeon(svg, { prefijo = 'mn' } = {}) {
  const nuevo = (tag, attrs, padre) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    padre.appendChild(e);
    return e;
  };
  const id = (n) => `${prefijo}-${n}`;
  svg.classList.add('mn-capa');
  nuevo('style', {}, svg).textContent = ESTILO;
  const defs = nuevo('defs', {}, svg);
  const cr = nuevo('radialGradient', { id: id('cristal'), cx: '.36', cy: '.3', r: '.8' }, defs);
  nuevo('stop', { offset: '0', class: 'mn-cr0' }, cr);
  nuevo('stop', { offset: '1', class: 'mn-cr1' }, cr);
  const so = nuevo('radialGradient', { id: id('sombra') }, defs);
  nuevo('stop', { offset: '0', class: 'mn-so0' }, so);
  nuevo('stop', { offset: '1', class: 'mn-so1' }, so);
  const tapa = nuevo('path', { 'clip-rule': 'evenodd' }, nuevo('clipPath', { id: id('tapa'), clipPathUnits: 'userSpaceOnUse' }, defs));
  // Las formas, una vez cada una; las capas de luz las usan con <use>.
  const forma = (n) => nuevo('path', { id: id(n), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, defs);
  const fCuerpo = forma('cuerpo'), fDetalle = forma('detalle'), fLuz = forma('luz'), fCara = forma('cara');

  const raiz = nuevo('g', { class: 'mn' }, svg);
  const sombra = nuevo('ellipse', { fill: `url(#${id('sombra')})` }, raiz);
  const cuerpo = nuevo('g', {}, raiz);
  const traje = nuevo('g', { class: 'mn-traje' }, cuerpo);
  const capas = (ref, clases, padre) => clases.map((c) => nuevo('use', { href: `#${id(ref)}`, class: c }, padre));
  const [destello] = capas('cuerpo', ['mn-de'], traje);
  const cristal = nuevo('circle', { r: 17, fill: `url(#${id('cristal')})` }, traje);
  capas('cuerpo', ['mn-h2', 'mn-h1', 'mn-bo', 'mn-tu', 'mn-nu'], traje);
  capas('detalle', ['mn-h1 mn-fino', 'mn-bo mn-fino', 'mn-tu mn-fino', 'mn-nu mn-fino'], traje);
  const luz = nuevo('g', {}, traje);
  capas('luz', ['mn-lh', 'mn-lt', 'mn-ln'], luz);
  const brillo = nuevo('path', { class: 'mn-gl' }, traje);
  const ojos = [0, 1].map(() => ({ h: nuevo('ellipse', { class: 'mn-ojo-h' }, traje), o: nuevo('ellipse', { class: 'mn-ojo' }, traje) }));
  const cara = nuevo('g', {}, traje);
  capas('cara', ['mn-h1 mn-fino', 'mn-bo mn-fino', 'mn-tu mn-fino', 'mn-nu mn-fino'], cara);
  const rubor = [0, 1].map(() => nuevo('ellipse', { class: 'mn-ru', rx: 3.3, ry: 1.9 }, traje));
  const efectos = nuevo('g', {}, traje);
  const fEfectos = [];
  const huesos = nuevo('g', { class: 'mn-huesos' }, cuerpo);
  const hHuesos = nuevo('path', { class: 'mn-hu' }, huesos), hArt = nuevo('path', { class: 'mn-ar' }, huesos);

  let tuboAntes = 0, ancho = 0, alto = 0;
  const poner = (e, k, v) => e.setAttribute(k, v);

  function dibujar(f) {
    if (!f) return;
    const { p: P, c: C } = f.cin;
    const cu = f.cuerpo, v = cu.ver;
    poner(cuerpo, 'transform', `translate(${n1(f.raiz[0])} ${n1(f.raiz[1])}) scale(${f.escala})`);
    if (Math.abs(cu.tubo - tuboAntes) > 0.04) {
      tuboAntes = cu.tubo;
      raiz.style.setProperty('--t', `${n1(cu.tubo)}px`);
    }
    const fr = f.cin.frente;
    const deFrente = lim(fr * 3, 0, 1), deEspaldas = lim(-fr * 3, 0, 1);

    // El cuerpo: la cabeza, el tronco (con barriga si está gordito), los brazos y las piernas.
    let d = circulo(P.cabeza, 17);
    const r = f.cin.vientre;
    const tot = dist(P.cuello, P.lumbar) + dist(P.lumbar, P.pelvis);
    if (r > 3.5) d += elipse(P.vientre, r * 1.06 * f.cin.anchoX, r * f.cin.altoY, f.cin.angLumbar);
    const hasta = tot * (1 - Math.min(0.92, (r > 3.5 ? 1.85 * r : 0) / tot)); // del cuello a lo alto de la barriga
    const l1 = dist(P.cuello, P.lumbar);
    d += hasta <= l1 ? L(P.cuello, lerp2(P.cuello, P.lumbar, hasta / l1))
      : `M${P2(P.cuello)}L${P2(P.lumbar)}L${P2(lerp2(P.lumbar, P.pelvis, (hasta - l1) / (tot - l1)))}`;
    d += L(P.hombroI, P.hombroD);
    for (const l of ['I', 'D']) {
      d += Q(P['hombro' + l], C['brazo' + l], P['codo' + l]) + L(P['codo' + l], P['mano' + l]);
      d += Q(P['cadera' + l], C['muslo' + l], P['rodilla' + l]) + Q(P['rodilla' + l], C['pierna' + l], P['pie' + l]);
    }
    poner(fCuerpo, 'd', d);

    // Los detalles de un cuerpo definido (o bombeado): se dibujan poco a poco.
    let dd = '';
    for (const l of ['I', 'D']) {
      dd += trozoQ(P['pecA' + l], C['pec' + l], P['pecB' + l], v['pecho' + l] * deFrente);
      dd += trozoQ(P['hombro' + l], C['dorsal' + l], P['cintura' + l], v.dorsales);
      const delt = Math.max(v['hombros' + l] * deFrente, v['hombrosPost' + l] * deEspaldas);
      dd += trozoQ(P['deltA' + l], C['delt' + l], P['deltB' + l], delt);
      dd += trozoQ(P['glA' + l], C['gl' + l], P['glB' + l], v.gluteos * deEspaldas);
      dd += trozoQ(P['lbA' + l], C['lb' + l], P['lbB' + l], v.lumbares * deEspaldas);
    }
    for (const k of [1, 2, 3]) {
      const t = v['abs' + k] * deFrente;
      dd += trozoL(P[`abs${k}Ib`], P[`abs${k}Ia`], t) + trozoL(P[`abs${k}Da`], P[`abs${k}Db`], t);
    }
    poner(fDetalle, 'd', dd || 'M0 0');

    // El músculo que siente: se le enciende y late.
    const l = cu.luz;
    let dl = '', max = 0;
    const sentir = (k, trazo) => {
      if (l[k] > 0.04) {
        dl += trazo();
        max = Math.max(max, l[k]);
      }
    };
    for (const s of ['I', 'D']) {
      sentir('biceps' + s, () => Q(P['hombro' + s], C['brazo' + s], P['codo' + s]));
      sentir('triceps' + s, () => Q(P['hombro' + s], C['brazo' + s], P['codo' + s]));
      sentir('cuadriceps' + s, () => Q(P['cadera' + s], C['muslo' + s], P['rodilla' + s]));
      sentir('isquios' + s, () => Q(P['cadera' + s], C['muslo' + s], P['rodilla' + s]));
      sentir('gemelos' + s, () => Q(P['rodilla' + s], C['pierna' + s], P['pie' + s]));
      sentir('pecho' + s, () => Q(P['pecA' + s], C['pec' + s], P['pecB' + s]));
      sentir('hombros' + s, () => Q(P['deltA' + s], C['delt' + s], P['deltB' + s]));
      sentir('hombrosPost' + s, () => Q(P['deltA' + s], C['delt' + s], P['deltB' + s]));
    }
    sentir('dorsales', () => Q(P.hombroI, C.dorsalI, P.cinturaI) + Q(P.hombroD, C.dorsalD, P.cinturaD));
    sentir('gluteos', () => Q(P.glAI, C.glI, P.glBI) + Q(P.glAD, C.glD, P.glBD));
    sentir('lumbares', () => Q(P.lbAI, C.lbI, P.lbBI) + Q(P.lbAD, C.lbD, P.lbBD));
    for (const k of [1, 2, 3]) sentir('abs' + k, () => L(P[`abs${k}Ib`], P[`abs${k}Ia`]) + L(P[`abs${k}Da`], P[`abs${k}Db`]));
    poner(fLuz, 'd', dl || 'M0 0');
    poner(luz, 'opacity', n1(max * (0.75 + 0.25 * Math.sin(f.t * 2 * Math.PI * 3.2)) * 100) / 100);
    poner(destello, 'opacity', n1(f.destello * (0.4 + 0.12 * Math.sin(f.t * 47)) * 100) / 100);

    // La cabeza de cristal, su brillo y la cara.
    const H = P.cabeza;
    poner(cristal, 'cx', n1(H[0]));
    poner(cristal, 'cy', n1(H[1]));
    poner(brillo, 'd', `M${n1(H[0] - 10.4)} ${n1(H[1] - 3.5)}A11 11 0 0 1 ${n1(H[0] - 4)} ${n1(H[1] - 10.2)}`);
    dibujarCara(f, H);
    dibujarEfectos(f, H);
    sombraYTapa(f);
    if (raiz.classList.contains('ver-huesos')) dibujarHuesos(P);
  }

  function dibujarCara(f, H) {
    const fr = f.cin.frente, vis = lim(fr * 2.5, 0, 1);
    const a = f.cin.angCabeza * RAD, ca = Math.cos(a), sa = Math.sin(a);
    const lado = f.cin.ladeo * 9, junto = Math.max(0.25, Math.abs(fr));
    const [mx, my] = f.mirada;
    // de la cara (x a la derecha, y hacia abajo, desde el centro de la cabeza) al cuerpo
    const en = (x, y, seguir = 1) => {
      const xx = x * junto + lado;
      return [H[0] + xx * ca - y * sa + mx * seguir, H[1] + xx * sa + y * ca + my * seguir];
    };
    const q = (x0, y0, cx, cy, x1, y1, s) => `M${P2(en(x0, y0, s))}Q${P2(en(cx, cy, s))} ${P2(en(x1, y1, s))}`;
    const ln = (x0, y0, x1, y1, s) => `M${P2(en(x0, y0, s))}L${P2(en(x1, y1, s))}`;

    const c = f.cara;
    const tipo = c ? c.ojos : 'punto';
    const encendida = c ? c.luz : 0;
    let d = '';
    [-6.5, 6.5].forEach((ex, i) => {
      // los puntitos de los ojos (parpadean); otras formas de ojos se encienden como la boca
      const propio = tipo === 'guino' ? (i === 0 ? 'punto' : 'feliz') : tipo;
      const punto = propio === 'punto' || propio === 'grandes';
      const rad = propio === 'grandes' ? 2.3 + 0.7 * encendida : 2.3;
      const centro = en(ex, -1);
      const o = ojos[i];
      const alfa = (punto ? 1 : 1 - encendida) * vis;
      for (const [el, extra] of [[o.h, 1.6], [o.o, 0]]) {
        poner(el, 'cx', n1(centro[0]));
        poner(el, 'cy', n1(centro[1]));
        poner(el, 'rx', n1((rad + extra) * junto));
        poner(el, 'ry', n1((rad + extra) * Math.max(0.12, f.abiertos)));
        poner(el, 'transform', `rotate(${n1(f.cin.angCabeza)} ${n1(centro[0])} ${n1(centro[1])})`);
        poner(el, 'opacity', n1(alfa * 100) / 100);
      }
      if (!c || punto) return;
      if (propio === 'feliz') d += q(ex - 2.8, 0, ex, -3.6, ex + 2.8, 0);
      else if (propio === 'cerrados') d += q(ex - 2.8, -1.4, ex, 1.8, ex + 2.8, -1.4);
      else if (propio === 'entornados') d += ln(ex - 2.7, -0.8, ex + 2.7, -0.8);
      else if (propio === 'apretados') {
        const s = Math.sign(ex);
        d += `M${P2(en(ex - 2.4 * s, -3))}L${P2(en(ex + 1.6 * s, -1))}L${P2(en(ex - 2.4 * s, 1))}`;
      }
    });
    if (c) {
      // cejas
      [-6.5, 6.5].forEach((ex) => {
        const s = Math.sign(ex); // +1 la de la derecha; su punta de dentro es la de la izquierda
        const tipoCeja = c.cejas === 'una' ? (s < 0 ? 'altas' : 'relajadas') : c.cejas;
        const fuera = ex + 3 * s, dentro = ex - 3 * s;
        if (tipoCeja === 'alegres') d += q(fuera, -7.6, ex, -10, dentro, -7.6, 0.6);
        else if (tipoCeja === 'altas') d += q(fuera, -9.8, ex, -12.4, dentro, -9.8, 0.6);
        else if (tipoCeja === 'fruncidas') d += ln(fuera, -9.6, dentro, -7.2, 0.6);
        else if (tipoCeja === 'preocupadas') d += ln(fuera, -7.4, dentro, -9.8, 0.6);
        else if (tipoCeja === 'relajadas') d += q(fuera, -8, ex, -8.9, dentro, -8, 0.6);
      });
      // boca
      const b = c.boca, sb = 0.4;
      if (b === 'sonrisa') d += q(-4.2, 7.4, 0, 11.4, 4.2, 7.4, sb);
      else if (b === 'sonrisaGrande') d += q(-5.4, 6.8, 0, 13.6, 5.4, 6.8, sb);
      else if (b === 'abierta') d += q(-5.2, 6.6, 0, 14.4, 5.2, 6.6, sb) + `L${P2(en(-5.2, 6.6, sb))}`;
      else if (b === 'pequena') d += q(-2.4, 8.2, 0, 10.2, 2.4, 8.2, sb);
      else if (b === 'apretada') d += ln(-3.8, 8.6, 3.8, 8.6, sb);
      else if (b === 'ondulada') d += q(-4, 8.6, -2, 7, 0, 8.6, sb) + `Q${P2(en(2, 10.2, sb))} ${P2(en(4, 8.6, sb))}`;
      else if (b === 'o') d += elipse(en(0, 9.2, sb), 2.2 * junto, 2.6, f.cin.angCabeza);
      else if (b === 'oGrande') d += elipse(en(0, 9.8, sb), 3.1 * junto, 4.4, f.cin.angCabeza);
    }
    poner(fCara, 'd', d || 'M0 0');
    poner(cara, 'opacity', n1(encendida * vis * 100) / 100);
    rubor.forEach((e, i) => {
      const pos = en(i ? 10.5 : -10.5, 4.6, 0.3);
      poner(e, 'cx', n1(pos[0]));
      poner(e, 'cy', n1(pos[1]));
      poner(e, 'opacity', c && c.rubor ? n1(encendida * vis * 100) / 100 : 0);
    });
  }

  // Zetas al dormir, chispas en un récord y la exclamación de un susto.
  function dibujarEfectos(f, H) {
    f.efectos.forEach((e, i) => {
      let g = fEfectos[i];
      if (!g) {
        g = nuevo('g', {}, efectos);
        g.forma = nuevo('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
        const sel = `#${id('ef' + i)}`;
        g.forma.id = id('ef' + i);
        ['mn-h1 mn-fino', 'mn-tu mn-fino', 'mn-nu mn-fino'].forEach((c) => nuevo('use', { href: sel, class: c }, g));
        fEfectos[i] = g;
      }
      const u = e.edad / e.dur;
      let d = '', alfa = 1;
      if (e.tipo === 'z') {
        const k = 0.75 + 0.55 * u, cx = H[0] + 11 + 12 * u + 3 * Math.sin(u * 7), cy = H[1] - 20 - 18 * u;
        d = `M${n1(cx - 3 * k)} ${n1(cy - 3 * k)}H${n1(cx + 3 * k)}L${n1(cx - 3 * k)} ${n1(cy + 3 * k)}H${n1(cx + 3 * k)}`;
        alfa = Math.sin(Math.PI * u);
      } else if (e.tipo === 'chispas') {
        for (let j = 0; j < 6; j++) {
          const ang = (e.giro + j * 60) * RAD, rr = 22 + 30 * u, k = 4.5 * (1 - u) + 1;
          const cx = H[0] + Math.cos(ang) * rr, cy = H[1] + Math.sin(ang) * rr;
          const [a, b] = j % 2 ? [[k * 0.7071, k * 0.7071], [-k * 0.7071, k * 0.7071]] : [[k, 0], [0, k]]; // cruz o aspa
          d += `M${n1(cx - a[0])} ${n1(cy - a[1])}L${n1(cx + a[0])} ${n1(cy + a[1])}`;
          d += `M${n1(cx - b[0])} ${n1(cy - b[1])}L${n1(cx + b[0])} ${n1(cy + b[1])}`;
        }
        alfa = 1 - u * u;
      } else if (e.tipo === 'exclamacion') {
        const k = u < 0.12 ? 0.4 + 7.1 * u : u < 0.2 ? 1.25 - 3.1 * (u - 0.12) : 1;
        const cx = H[0] + 20, cy = H[1] - 22;
        d = `M${n1(cx)} ${n1(cy - 7 * k)}L${n1(cx)} ${n1(cy + 1 * k)}M${n1(cx)} ${n1(cy + 5 * k)}L${n1(cx)} ${n1(cy + 5.1 * k)}`;
        alfa = 1 - lim((u - 0.75) / 0.25, 0, 1);
      }
      g.forma.setAttribute('d', d || 'M0 0');
      g.setAttribute('opacity', n1(alfa * 100) / 100);
      g.style.display = '';
    });
    for (let i = f.efectos.length; i < fEfectos.length; i++) fEfectos[i].style.display = 'none';
  }

  function sombraYTapa(f) {
    const s = f.sombra;
    if (s) {
      poner(sombra, 'cx', n1(s.x));
      poner(sombra, 'cy', n1(s.y));
      poner(sombra, 'rx', n1(s.rx));
      poner(sombra, 'ry', n1(s.rx * 0.17));
      poner(sombra, 'opacity', n1(s.fuerza * 100) / 100);
    } else poner(sombra, 'opacity', 0);
    // Escondida detrás de una tarjeta: se tapa lo que queda por debajo de su borde de arriba.
    if (f.ocultar) {
      const o = f.ocultar, W = ancho + 200, Hh = alto + 200;
      poner(tapa, 'd', `M-200 -200H${W}V${Hh}H-200ZM${n1(o.x1)} ${n1(o.y)}H${n1(o.x2)}V${Hh}H${n1(o.x1)}Z`);
      poner(raiz, 'clip-path', `url(#${id('tapa')})`);
    } else raiz.removeAttribute('clip-path');
  }

  function dibujarHuesos(P) {
    const cad = [['pelvis', 'lumbar'], ['lumbar', 'cuello'], ['cuello', 'cabeza'], ['hombroI', 'hombroD']];
    for (const l of ['I', 'D']) {
      cad.push(['hombro' + l, 'codo' + l], ['codo' + l, 'mano' + l], ['pelvis', 'cadera' + l],
        ['cadera' + l, 'rodilla' + l], ['rodilla' + l, 'pie' + l]);
    }
    poner(hHuesos, 'd', cad.map(([a, b]) => L(P[a], P[b])).join(''));
    const art = ['pelvis', 'lumbar', 'cuello', 'cabeza', 'hombroI', 'hombroD', 'codoI', 'codoD', 'manoI', 'manoD',
      'caderaI', 'caderaD', 'rodillaI', 'rodillaD', 'pieI', 'pieD'];
    poner(hArt, 'd', art.map((k) => circulo(P[k], k === 'cabeza' ? 2.2 : 1.6)).join(''));
  }

  return {
    dibujar,
    medidas(w, h) {
      ancho = w;
      alto = h;
    },
    set huesos(si) { raiz.classList.toggle('ver-huesos', !!si); },
    get huesos() { return raiz.classList.contains('ver-huesos'); },
  };
}
