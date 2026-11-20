// La mascota (D-133): su memoria (su ficha, aparte de tus datos), su carácter (de su semilla), su cerebro (vive sin
// errores; tranquila, ni pasea ni salta; en el rincón, asomada; si su tarjeta se va, aparece en otra), dónde se pone
// (solo donde, de pie, no tapa nada), su cuerpo de tus entrenos (la fase 2: la forma, el bombeo y las agujetas; su
// ficha, en tus copias) y, en la app, cómo se entera de cada serie, cómo se la toca y su página en Ajustes.
// En la beta sale de entrada; en la normal, solo si la enciendes.

import { datosBeta, sesionInventada, ms } from "./datos.js";

function azarDe(semilla) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function ejecutar(c) {
  const { caso, esperar, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, teclear, sinErrores, hastaQue, hastaQueVirtual, textoDe, avisoActual, hojaAbierta } = c;
  const { VERSION } = await import("/js/version.js");
  const memoria = await import("/js/mascota/memoria.js");
  const caracter = await import("/js/mascota/caracter.js");
  const { crearMascota, PESOS } = await import("/js/mascota/cerebro.js");
  const { calcularSuperficies } = await import("/js/mascota/escenario.js");
  const { GRUPOS } = await import("/js/mascota/gestos.js");
  const forma = await import("/js/mascota/forma.js");
  const copias = await import("/js/copias.js");
  const HORA = 3600000;
  const DIA = 24 * HORA;

  // MA1-MA4 Su memoria
  {
    await limpiarBeta();
    const f = memoria.leer({ ahora: 1000 });
    caso(f.v === memoria.VERSION && f.nacida === 1000 && Number.isInteger(f.semilla) && f.ajustes.encendida === null
      && f.ajustes.tamano === "normal" && localStorage.getItem(memoria.CLAVE) === null,
    "MA1 sin ficha, una nueva, que no se guarda hasta que hace falta");
    const g = memoria.leer({ ahora: 2000, crear: true });
    const g2 = memoria.leer({ ahora: 3000 });
    caso(g2.semilla === g.semilla && g2.nacida === 2000, "MA2 con «crear» se guarda: su semilla (y con ella su carácter) ya no cambia");
    memoria.cambiarAjustes({ tamano: "enorme", luz: "rosa", entreno: "escondida", nombre: "  Chispa   de luz con un nombre muy largo ", otra: 1 });
    const h = leerJson(memoria.CLAVE);
    caso(h.ajustes.tamano === "normal" && h.ajustes.luz === "rosa" && h.ajustes.entreno === "escondida"
      && h.ajustes.nombre === "Chispa de luz con un nom" && !("otra" in h.ajustes),
    `MA3 solo guarda lo que vale (el nombre, sin espacios de más y de ${memoria.NOMBRE_MAX} letras como mucho: «${h.ajustes.nombre}»)`);
    guardar(memoria.CLAVE, "{roto");
    const r = memoria.leer({ ahora: 5 });
    guardar(memoria.CLAVE, { v: 99, ajustes: { encendida: true }, semilla: 1 });
    const n = memoria.cambiarAjustes({ encendida: false });
    caso(r.v === memoria.VERSION && r.ajustes.luz === "verde" && n.masNueva && leerJson(memoria.CLAVE).v === 99 && memoria.encendida(n) === true,
      "MA4 una ficha rota: otra nueva; una de una versión más nueva: se lee y no se pisa");
    const nula = { ajustes: { encendida: null } };
    caso(memoria.encendida(nula, { beta: true }) && !memoria.encendida(nula, { beta: false }) && !memoria.encendida({ ajustes: { encendida: false } }, { beta: true }),
      "MA4 de entrada, encendida solo en la beta; lo que elijas manda");
    await limpiarBeta();
  }

  // MA5 Su carácter
  {
    const a = caracter.rasgosDe(12345);
    const b = caracter.rasgosDe(12345);
    const otra = caracter.rasgosDe(54321);
    const dentro = (x) => Object.values(x).every((v) => v >= 0.12 && v <= 0.88);
    const p = caracter.pesosDe(a);
    caso(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(otra) && dentro(a) && dentro(otra)
      && Object.keys(PESOS).every((k) => p[k] > 0) && /\.$/.test(caracter.describir(a))
      && caracter.suenoDe({ pereza: 0.9 }) < caracter.suenoDe({ pereza: 0.1 }),
    `MA5 su carácter sale de su semilla, siempre el mismo («${caracter.describir(a)}»), y cambia sus papeletas`);
  }

  // MA6-MA8 Su cerebro: 10 min de vida con series, récords y toques al azar
  {
    const azar = azarDe(7);
    let sups = [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 200, x2: 380, y: 520 }];
    let reubicada = 0;
    const m = crearMascota({ superficies: () => sups, azar, techo: () => 60, alReubicar: () => { reubicada += 1; } });
    m.pesos = caracter.pesosDe(caracter.rasgosDe(3));
    const grupos = Object.keys(GRUPOS);
    const vistas = new Set();
    let mal = 0;
    let fuera = 0;
    for (let i = 0; i < 30 * 600; i++) {
      if (i % 300 === 299) {
        const r = azar();
        if (r < 0.5) m.serie(grupos[Math.floor(azar() * grupos.length)]);
        else if (r < 0.6) m.record();
        else if (r < 0.8 && m.cabeza) m.tocar(...m.cabeza);
      }
      const f = m.paso(1 / 30);
      vistas.add(m.accion);
      if (!f || !f.raiz.every(Number.isFinite)) mal += 1;
      const s = sups.find((x) => x.id === m.superficie);
      if (!/Salta|Baja de un salto/.test(m.accion) && s && (f.raiz[0] < s.x1 - 2 || f.raiz[0] > s.x2 + 2)) fuera += 1;
    }
    caso(mal === 0 && fuera === 0 && vistas.size >= 8,
      `MA6 10 min de vida sin errores ni salirse de su sitio (${vistas.size} cosas: ${[...vistas].slice(0, 5).join(", ")}…)`);
    m.tranquila = true;
    const tranquila = new Set();
    for (let i = 0; i < 30 * 300; i++) {
      m.paso(1 / 30);
      if (i > 60) tranquila.add(m.accion);
    }
    caso(![...tranquila].some((x) => /Pasea|Salta|Baja de un salto/.test(x)), `MA7 tranquila (en el entreno), ni pasea ni salta (${[...tranquila].join(", ")})`);
    m.tranquila = false;
    const antes = m.superficie;
    sups = sups.filter((s) => s.id !== antes);
    const tras = new Set();
    for (let i = 0; i < 60; i++) {
      m.paso(1 / 30);
      tras.add(m.accion);
    }
    caso(m.superficie !== antes && ([...tras].some((x) => /Salta|Baja de un salto/.test(x)) || reubicada >= 1),
      `MA8 si su tarjeta se va, salta a otra (o, si estaba sintiendo algo, aparece allí fundiéndose): ${[...tras].join(", ")}`);
    sups = [{ id: "rincon", tipo: "rincon", x1: 300, x2: 396, y: 800, c1: 0, c2: 412 }];
    const enRincon = new Set();
    for (let i = 0; i < 30 * 60; i++) {
      m.paso(1 / 30);
      if (i > 60) enRincon.add(m.accion);
    }
    caso(enRincon.has("Se asoma desde abajo") && ![...enRincon].some((x) => /Pasea|Salta|Duerme|Se sienta/.test(x)),
      `MA8 en el rincón, solo asomada (${[...enRincon].join(", ")})`);
  }

  // MA9 Dónde se pone: solo donde, de pie, no tapa nada
  {
    const caja = document.createElement("div");
    caja.style.cssText = "position:fixed;left:0;top:0;width:400px;height:700px;background:#fff;font:16px sans-serif;z-index:9";
    caja.innerHTML = `<h1 style="margin:0;position:absolute;left:10px;top:100px;font-size:20px;line-height:24px">Título</h1>
      <div class="tarjeta" style="position:absolute;left:10px;top:200px;width:380px;height:60px;margin:0;padding:0"></div>
      <div class="tarjeta" style="position:absolute;left:10px;top:268px;width:380px;height:60px;margin:0;padding:0"></div>
      <button type="button" style="position:absolute;left:10px;top:420px;width:380px;height:30px;border:0;background:none;padding:0;text-align:left">Ver</button>
      <div class="tarjeta" style="position:absolute;left:10px;top:500px;width:380px;height:60px;margin:0;padding:0"><div class="fila" style="height:30px"></div></div>`;
    document.body.append(caja);
    const ids = new WeakMap();
    let n = 0;
    const idDe = (el) => {
      if (!ids.has(el)) ids.set(el, ++n);
      return ids.get(el);
    };
    const sups = calcularSuperficies({ raiz: caja, region: { y1: 40, y2: 690 }, alto: 82, idDe });
    caja.remove();
    const en = (y) => sups.filter((s) => Math.round(s.y) === y);
    const libres = (y) => en(y)[0]?.libres || [];
    const texto = sups.map((s) => `@${Math.round(s.y)}: ${s.libres.map(([a, b]) => `${Math.round(a)}-${Math.round(b)}`).join(" ") || "—"}`).join(" · ");
    caso(sups.length === 3 && en(200).length === 1 && en(268).length === 1 && en(500).length === 1
      && libres(200).length === 1 && libres(200)[0][0] > 60 && libres(268).length === 0
      && libres(500).length === 1 && libres(500)[0][0] > 30 && libres(500)[0][0] < 70 && libres(500)[0][1] - libres(500)[0][0] > 250,
    `MA9 puede ponerse en todas las tarjetas (una fila que empieza donde su tarjeta, no cuenta aparte); sus tramos libres (de pie, no tapa nada): junto a un título o a un botón sin caja, y ninguno entre dos tarjetas pegadas (${texto})`);
  }

  // MA20-MA22 Su cuerpo, de tus entrenos (forma.js; D-133, la fase 2)
  const d = await datosBeta();
  const T = ms("2026-11-20T12:00:00");
  const entrenos = (sesiones, enCurso = null) => ({ dias: d.dias, sesiones, ejercicios: d.ejercicios, enCurso });
  // «n» sesiones enteras a «porSem» por semana, la última hace «hace» días (y 3 h), de la más vieja a la más nueva
  const ritmo = (porSem, n, hace = 0, prefijo = "r") => Array.from({ length: n }, (_, i) => {
    const inicio = T - hace * DIA - 3 * HORA - (i * 7 * DIA) / porSem;
    return sesionInventada(d, d.dias[i % d.dias.length].id, new Date(inicio).toISOString(), { id: `${prefijo}-${i}` });
  }).reverse();
  const cuerpo = (sesiones, ahora = T, { nacida = null, enCurso = null } = {}) => forma.cuerpoDeTusEntrenos(entrenos(sesiones, enCurso), ahora, { nacida });
  const fondo = (sesiones, ahora = T, nacida = null) => cuerpo(sesiones, ahora, { nacida }).fondo;

  // MA20 La forma de fondo: de tu constancia con tu rutina
  {
    const e = entrenos(ritmo(5, 20));
    const antes = JSON.stringify(e);
    forma.cuerpoDeTusEntrenos(e, T, {});
    const intacto = JSON.stringify(e) === antes;
    const nueva = fondo([], T, T);
    const siempre = fondo(ritmo(5, 20));
    const aMedias = fondo(ritmo(2, 8));
    const dejado = fondo(ritmo(5, 20, 30));
    const dejadoAntes = fondo(ritmo(5, 20, 37, "a"));
    const vuelta = fondo([...ritmo(5, 20, 37, "a"), ...ritmo(5, 5, 0, "b")]);
    const entera = sesionInventada(d, "tuesday-push", "2026-11-20T09:00:00", { id: "entera" });
    const parcial = sesionInventada(d, "tuesday-push", "2026-11-20T09:00:00", { id: "parcial", soloPrimeros: 1 });
    const otraDelDia = sesionInventada(d, "thursday-pull", "2026-11-20T10:30:00", { id: "otra" });
    const ayer = sesionInventada(d, "thursday-pull", "2026-11-19T10:30:00", { id: "ayer" });
    const t = (x) => x.toFixed(2);
    caso(forma.entrenosPorSemana(d.dias) === 5 && intacto && nueva >= 0.3 && nueva <= 0.4 && siempre >= 0.85 && aMedias >= 0.35 && aMedias <= 0.65
      && dejado <= 0.2 && vuelta - dejadoAntes >= 0.3,
    `MA20 su forma de fondo sale de tu constancia con tu rutina (5 por semana), sin tocar tus datos: al empezar, ${t(nueva)}; siempre, ${t(siempre)}; a 2 por semana, ${t(aMedias)}; un mes sin ir, ${t(dejado)}; y al volver una semana, de ${t(dejadoAntes)} a ${t(vuelta)}`);
    caso(fondo([parcial]) < fondo([entera]) && fondo([entera, otraDelDia]) - fondo([entera]) < 0.01 && fondo([ayer, entera]) - fondo([entera]) > 0.08
      && forma.entrenosPorSemana([{ diasSemana: [] }, { diasSemana: [] }, {}]) === 3 && forma.entrenosPorSemana([{ diasSemana: [1, 3] }, { diasSemana: [] }]) === 3,
    "MA20 una sesión de pocas series cuenta menos; dos el mismo día, como una; y tu rutina: sus días de la semana (los que no tienen, uno cada uno)");
  }

  // MA21 El bombeo: cada serie hincha sus músculos y la marca un poco más; se va en 3 h, aunque cierres la app
  {
    const T0 = T - 5 * HORA;
    const conHora = (hora) => ({
      id: "s-pecho", diaId: "tuesday-push", diaNombre: "Martes", inicio: T0, fin: T0 + 10 * 60000, seriesPlan: 4,
      ejercicios: [{ exerciseId: "pec-deck", nombre: "Pec deck", tipo: "peso", plan: null,
        series: [1, 2, 3, 4].map((i) => (hora ? { kg: 40, reps: 10, t: T0 + i * 120000 } : { kg: 40, reps: 10 })) }],
    });
    const fin = T0 + 8 * 60000;
    const b1 = cuerpo([conHora(true)], fin + 1000);
    const b2 = cuerpo([conHora(true)], fin + HORA);
    const b3 = cuerpo([conHora(true)], fin + 3.1 * HORA);
    const sinHora = cuerpo([conHora(false)], fin + 30 * 60000);
    const enCurso = { id: "s-ahora", diaId: "thursday-pull", inicio: T - 5 * 60000, ejercicios: { "lat-pulldown": [{ kg: 40, reps: 10, t: T - 60000 }] } };
    const ahora = cuerpo([], T, { enCurso });
    caso(b1.bombeo.pechoI > 0.99 && Math.abs(b2.bombeo.pechoI - 2 / 3) < 0.02 && b3.bombeo.pechoI === 0 && b1.bombeo.bicepsI === 0
      && Math.abs(b1.general - (0.4 - 3 * (2 / 180))) < 0.01 && b2.general > 0 && b2.general < 0.1 && b1.bombeados.join() === "Pecho" && b3.bombeados.length === 0
      && sinHora.bombeo.pechoI > 0.5 && ahora.bombeo.dorsales > 0.38 && ahora.general > 0 && ahora.bombeados.join() === "Espalda",
    `MA21 el bombeo: 4 series de pecho lo hinchan entero (${b1.bombeo.pechoI.toFixed(2)}), a la hora le queda ${b2.bombeo.pechoI.toFixed(2)} y a las 3 h nada; el general, ${b1.general.toFixed(2)}; sin hora (una copia de antes), igual; y cuenta la sesión en marcha`);
    caso(Math.abs(forma.formaVisible(0.4, 1) - 0.7) < 1e-9 && forma.formaVisible(0.4, 0) === 0.4 && forma.formaVisible(1, 1) === 1,
      "MA21 con el bombeo general entero, se acerca a definida la mitad de lo que le falta");
  }

  // MA22 Las agujetas: al día siguiente, suaves; a veces se queja, y con las piernas cargadas anda más despacio
  {
    const Tq = T - 40 * HORA;
    const piernas = {
      id: "s-piernas", diaId: "wednesday-lower-a", diaNombre: "Miércoles", inicio: Tq - 20 * 60000, fin: Tq, seriesPlan: 6,
      ejercicios: [{ exerciseId: "leg-press", nombre: "Prensa", tipo: "peso", plan: null, series: Array.from({ length: 6 }, (_, i) => ({ kg: 100, reps: 10, t: Tq - (6 - i) * 120000 })) }],
    };
    const en = (horas) => cuerpo([piernas], Tq + horas * HORA).agujetas.cuadricepsI;
    const a30 = cuerpo([piernas], Tq + 30 * HORA);
    caso(Math.abs(en(30) - 0.72) < 0.03 && en(2) === 0 && en(12) > 0 && en(12) < 0.5 && en(5 * 24) === 0 && a30.doloridos.join() === "Cuádriceps"
      && a30.agujetas.pechoI === 0,
    `MA22 las agujetas: empiezan a las 8 h (a las 12, ${en(12).toFixed(2)}), en su punto al día siguiente (${en(30).toFixed(2)}, con 6 series) y se van a los 4 días`);
    const sitio = () => [{ id: "a", x1: 0, x2: 2000, y: 300 }];
    const andado = (cargadas) => {
      const m = crearMascota({ superficies: sitio, azar: azarDe(3), autonoma: false });
      m.ponerCuerpo({ agujetas: { cuadricepsI: cargadas, cuadricepsD: cargadas } });
      for (let i = 0; i < 10; i++) m.paso(1 / 30);
      m.hacer("pasear");
      m.paso(1 / 30);
      const x0 = m.cabeza[0];
      for (let i = 0; i < 60; i++) m.paso(1 / 30);
      return { recorrido: Math.abs(m.cabeza[0] - x0), dolorida: m.dolorida };
    };
    const sano = andado(0);
    const cargado = andado(0.8);
    const quejas = (cargadas, semilla) => {
      const m = crearMascota({ superficies: () => [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 200, x2: 380, y: 520 }], azar: azarDe(semilla), techo: () => 60 });
      m.ponerCuerpo({ agujetas: { cuadricepsI: cargadas, cuadricepsD: cargadas } });
      const vistas = new Set();
      for (let i = 0; i < 30 * 600; i++) {
        m.paso(1 / 30);
        vistas.add(m.accion);
      }
      return vistas;
    };
    caso(cargado.recorrido < sano.recorrido * 0.85 && cargado.dolorida === "piernas" && sano.dolorida === null
      && quejas(0.8, 11).has("Tiene agujetas en las piernas") && ![...quejas(0, 11)].some((x) => /agujetas/.test(x)),
    `MA22 con las piernas cargadas anda más despacio (${Math.round(cargado.recorrido)} px en 2 s; sin agujetas, ${Math.round(sano.recorrido)}) y a veces se queja de ellas; sin agujetas, nunca`);
  }

  // MA23 Su ficha, en tus copias: va en «beta.mascota» y vuelve al cargarla
  {
    await limpiarBeta();
    const sinFicha = copias.construirExportacion(await datosBeta(), ms("2026-11-20T10:00:00"));
    memoria.leer({ ahora: 1000, crear: true });
    memoria.cambiarAjustes({ nombre: "Chispa", luz: "rosa" });
    const ficha = leerJson(memoria.CLAVE);
    const exp = copias.construirExportacion(await datosBeta(), ms("2026-11-20T10:00:00"));
    const leida = await copias.leerCopia(JSON.stringify(exp), { actuales: null, ahoraMs: 5 });
    localStorage.removeItem(memoria.CLAVE);
    const vuelve = memoria.restaurar(leida.mascota);
    const tras = leerJson(memoria.CLAVE);
    memoria.anotar((f) => { f.vista = 123; });
    const otraVez = copias.construirExportacion(await datosBeta(), ms("2026-11-20T10:00:00"));
    caso(!("mascota" in sinFicha.beta) && exp.beta.mascota?.semilla === ficha.semilla && exp.beta.mascota.ajustes.nombre === "Chispa"
      && !("vista" in exp.beta.mascota) && JSON.stringify(otraVez) === JSON.stringify(exp)
      && leida.ok && vuelve && tras?.semilla === ficha.semilla && tras.ajustes.luz === "rosa" && tras.nacida === ficha.nacida,
    "MA23 su ficha va en la copia (beta.mascota; si nunca ha salido, no va; sin cuándo te vio, para que dos copias de lo mismo sean iguales) y al cargarla vuelve ella: su semilla, cuándo nació y sus ajustes");
    const deLaNormal = await copias.leerCopia(JSON.stringify({ ...exp, beta: undefined }), { actuales: null, ahoraMs: 5 });
    memoria.restaurar({ v: 99, semilla: 5, otra: 1 });
    const masNueva = leerJson(memoria.CLAVE);
    caso(deLaNormal.ok && deLaNormal.mascota === null && masNueva?.v === 99 && memoria.paraCopia()?.otra === 1
      && memoria.restaurar("x") === false && memoria.restaurar([1]) === false && memoria.restaurar(null) === false,
    "MA23 una copia sin ella no la trae; una ficha de una versión más nueva va y vuelve tal cual; lo que no es una ficha, no");
    await limpiarBeta();
  }

  // MA26 Los momentos de la sesión (D-135, la 3): al terminar lo celebra según cómo fue; antes de empezar, calienta; al
  // verte tras un rato, te saluda (y si llevas días sin entrenar, estaba dormida y se alegra); con trofeo, lo lleva
  {
    const sitio = () => [{ id: "a", x1: 20, x2: 380, y: 300 }];
    const nueva = (semilla = 5) => {
      const m = crearMascota({ superficies: sitio, azar: azarDe(semilla), autonoma: false });
      for (let i = 0; i < 10; i++) m.paso(1 / 30);
      return m;
    };
    const vive = (m, s) => {
      const vistas = [];
      for (let i = 0; i < Math.round(s * 30); i++) {
        m.paso(1 / 30);
        if (vistas[vistas.length - 1] !== m.accion) vistas.push(m.accion);
      }
      return vistas;
    };
    const fin = (d) => {
      const m = nueva();
      m.finSesion(d);
      return vive(m, 8).join(" → ");
    };
    const conMarca = fin({ series: 10, plan: 20, marcas: 1 });
    const completa = fin({ series: 20, plan: 20, marcas: 0 });
    const casi = fin({ series: 14, plan: 20, marcas: 0 });
    const poca = fin({ series: 3, plan: 20, marcas: 0 });
    caso(/^¡Celebra el récord! → Presume de trofeo/.test(conMarca) && /^¡Sesión completa!/.test(completa) && /^¡Bien hecho!/.test(casi) && /^Algo es algo/.test(poca),
      `MA26 al terminar lo celebra según cómo fue: con marca, ${conMarca.split(" → ").slice(0, 2).join(" y ")}; todas, ${completa.split(" → ")[0]}; casi todas, ${casi.split(" → ")[0]}; pocas, ${poca.split(" → ")[0]}`);
    const dormida = nueva();
    dormida.bienvenida({ dormida: true });
    dormida.paso(1 / 30);
    const primera = dormida.accion;
    const conSueno = vive(dormida, 14).join(" → ");
    const despierta = nueva();
    despierta.bienvenida();
    const sinSueno = vive(despierta, 6).join(" → ");
    caso(primera === "Duerme" && /^Duerme → Se despierta de golpe → ¡Qué alegría verte! → Te saluda → Te mira/.test(conSueno) && /^Te saluda → Te mira/.test(sinSueno),
      `MA26 al verte tras días sin entrenar, estaba dormida y se alegra (${conSueno}); si no, te saluda (${sinSueno})`);
    const cal = nueva();
    cal.calentarAntes("Pecho");
    const calienta = vive(cal, 9);
    cal.calentarAntes("Pecho");
    const otraVez = vive(cal, 3);
    caso(["Calienta los brazos", "Calienta las rodillas", "Calienta el tronco"].every((x) => calienta.includes(x)) && !otraVez.some((x) => /Calienta/.test(x)),
      `MA26 vas a empezar: calienta (${calienta.filter((x) => /Calienta/.test(x)).join(", ")}), como mucho una vez cada 10 min`);
    const conTrofeo = nueva();
    conTrofeo.trofeo = true;
    const f = conTrofeo.paso(1 / 30);
    const presume = (trofeo) => {
      const m = crearMascota({ superficies: () => [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 200, x2: 380, y: 520 }], azar: azarDe(13), techo: () => 60 });
      m.trofeo = trofeo;
      return new Set(vive(m, 600)).has("Presume de trofeo");
    };
    caso(f?.objeto?.tipo === "trofeo" && presume(true) && !presume(false),
      "MA26 con trofeo, lo lleva en la mano y a ratos presume de él; sin trofeo, nunca");
  }

  // MA27 Lo que sale de tus entrenos para sus momentos (forma.js): si hoy has batido una marca entrenando (su trofeo) y
  // si llevas días sin entrenar (más del doble de lo que suele haber entre dos entrenos de tu rutina, y 3 como poco)
  {
    const marca = { exerciseId: "pec-deck", kg: 50, fecha: ms("2026-11-20T10:00:00"), motivo: "sesion" };
    const trofeo = (marcas) => forma.cuerpoDeTusEntrenos({ ...entrenos([]), marcas }, T).trofeo;
    const hace = (dias, porSemana = null) => {
      const s = sesionInventada(d, "tuesday-push", new Date(T - dias * DIA).toISOString(), { id: `h-${dias}` });
      const dias3 = porSemana === 3 ? [{ id: "a", diasSemana: [1] }, { id: "b", diasSemana: [3] }, { id: "c", diasSemana: [5] }] : d.dias;
      return forma.cuerpoDeTusEntrenos({ dias: dias3, sesiones: [s], ejercicios: d.ejercicios }, T);
    };
    const nada = forma.cuerpoDeTusEntrenos(entrenos([]), T);
    caso(trofeo([marca]) && !trofeo([{ ...marca, fecha: ms("2026-11-19T20:00:00") }]) && !trofeo([{ ...marca, motivo: "a-mano" }])
      && !trofeo([{ ...marca, fecha: T + HORA }]) && !trofeo([]),
    "MA27 su trofeo: una marca batida hoy entrenando (no la de ayer, ni una puesta a mano)");
    caso(forma.llevasDiasSin(hace(4)) && !forma.llevasDiasSin(hace(2)) && !forma.llevasDiasSin(hace(4, 3)) && forma.llevasDiasSin(hace(6, 3))
      && nada.diasSin === null && !forma.llevasDiasSin(nada) && Math.abs(hace(4).diasSin - 4) < 0.1,
    "MA27 días sin entrenar: con tu rutina (5 por semana), desde 3; con 3 por semana, desde 5; y sin ningún entreno aún, no (no hay «vuelta»)");
  }

  // MA30 Sus accesorios (D-135, la 4): en el descanso imita tu ejercicio con una mancuerna pequeña (una vez por descanso,
  // el de la serie que acabas de hacer), y con una sesión en marcha lleva su cinta
  {
    const { IMITAR } = await import("/js/mascota/gestos.js");
    const { POSE_BASE } = await import("/js/mascota/esqueleto.js");
    const sitio = () => [{ id: "a", x1: 20, x2: 380, y: 300 }];
    const malas = [];
    for (const grupo of Object.keys(GRUPOS)) {
      const def = IMITAR[grupo];
      const m = crearMascota({ superficies: sitio, azar: azarDe(2), autonoma: false });
      for (let i = 0; i < 10; i++) m.paso(1 / 30);
      m.hacer(`imitar:${grupo}`);
      const poses = [];
      let f = null;
      for (let i = 0; i < 120; i++) {
        f = m.paso(1 / 30);
        poses.push(f.pose);
      }
      // cuánto del movimiento recorre (1: de la pose de partida a la del esfuerzo, entero)
      const ini = { ...POSE_BASE, ...(def?.a || {}) }, fin = { ...ini, ...(def?.b || {}) };
      const recorre = Math.max(0, ...Object.keys(def?.b || {}).filter((k) => Math.abs(fin[k] - ini[k]) > 1e-9).map((k) => {
        const v = poses.map((p) => p[k]);
        return (Math.max(...v) - Math.min(...v)) / Math.abs(fin[k] - ini[k]);
      }));
      const mancuernas = [].concat(f.objeto || []).filter((o) => o.tipo === "mancuerna").length;
      if (!def || m.accion !== def.nombre || mancuernas !== (def.manos === "ambas" ? 2 : 1) || recorre < 0.8 || !f.raiz.every(Number.isFinite)) {
        malas.push(`${grupo} (${m.accion}, ${mancuernas}, ${recorre.toFixed(2)})`);
      }
    }
    caso(malas.length === 0, `MA30 imita el ejercicio de cada grupo de la app (${Object.keys(GRUPOS).length}), con su mancuerna en la mano o una en cada una${malas.length ? `; mal: ${malas.join(", ")}` : ""}`);
    const descanso = (semilla) => {
      const m = crearMascota({ superficies: () => [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 40, x2: 360, y: 420 }], azar: azarDe(semilla) });
      for (let i = 0; i < 30; i++) m.paso(1 / 30);
      const total = 90;
      let veces = 0;
      let antes = "";
      for (let i = 0; i <= total * 30; i++) {
        const quedan = Math.max(0, Math.ceil(total - i / 30));
        m.descanso = { id: "d1", quedan, fraccion: 1 - quedan / total, pausa: false, grupoSiguiente: "Pecho", grupo: "Bíceps" };
        m.paso(1 / 30);
        if (m.accion !== antes && m.accion === "Imita tu curl de bíceps") veces += 1;
        antes = m.accion;
      }
      return veces;
    };
    const veces = [1, 2, 3, 4, 5, 6, 7, 8].map(descanso);
    const conCinta = crearMascota({ superficies: sitio, azar: azarDe(2), autonoma: false });
    conCinta.cinta = true;
    const f1 = conCinta.paso(1 / 30);
    conCinta.cinta = false;
    const f2 = conCinta.paso(1 / 30);
    const imita = veces.filter((v) => v === 1).length;
    caso(veces.every((v) => v <= 1) && imita >= 2 && imita <= 7 && f1?.cinta === true && f2?.cinta === false,
      `MA30 en el descanso, a veces imita tu ejercicio, una vez como mucho (en 8 descansos de 90 s: ${veces.join(", ")}); y su cinta, mientras hay sesión`);
  }

  // MA17 El descanso (D-135): se recupera, descansa, calienta a los 10 s y se pone en guardia a los 3; su luz se recarga;
  // y si la tocas, choca los cinco
  {
    const m = crearMascota({ superficies: () => [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 40, x2: 360, y: 420 }], azar: azarDe(11) });
    for (let i = 0; i < 30; i++) m.paso(1 / 30);
    const total = 60;
    const vistas = [];
    let cargaInicio = null;
    let cargaFin = 0;
    for (let i = 0; i <= total * 30; i++) {
      const quedan = Math.max(0, Math.ceil(total - i / 30));
      m.descanso = { id: "d1", quedan, fraccion: 1 - quedan / total, pausa: false, grupoSiguiente: "Pecho" };
      m.paso(1 / 30);
      if (vistas[vistas.length - 1] !== m.accion) vistas.push(m.accion);
      if (i === 45) cargaInicio = m.carga;
      if (i === total * 30) cargaFin = m.carga;
    }
    const donde = (n) => vistas.findIndex((v) => v.startsWith(n));
    caso(donde("Recupera el aliento") >= 0 && donde("Se seca el sudor") > donde("Recupera el aliento")
      && donde("Calienta") > donde("Se seca el sudor") && donde("¡Lista para la siguiente!") > donde("Calienta")
      && cargaInicio < 0.6 && cargaFin > 1.2,
    `MA17 en el descanso se recupera, descansa, calienta a los 10 s y se pone en guardia a los 3; su luz, de ${cargaInicio?.toFixed(2)} a ${cargaFin.toFixed(2)} (${vistas.join(" → ")})`);
    m.descanso = { id: "d2", quedan: 50, fraccion: 0.2, pausa: false, grupoSiguiente: "Pecho" };
    for (let i = 0; i < 30 * 8; i++) m.paso(1 / 30);
    if (m.cabeza) m.tocar(...m.cabeza);
    let choca = false;
    for (let i = 0; i < 30 * 5 && !choca; i++) {
      m.paso(1 / 30);
      choca = /Choca/.test(m.accion);
    }
    m.descanso = null;
    for (let i = 0; i < 30 * 3; i++) m.paso(1 / 30);
    caso(choca && Math.abs(m.carga - 1) < 0.1, `MA17 si la tocas en el descanso, choca los cinco; y sin descanso, su luz vuelve a la de siempre (${m.carga.toFixed(2)})`);
  }

  // MA19 Calentar para en cuanto se acaba el descanso (no se queda en bucle); y si la app vuelve a pintar su tarjeta
  // (otro elemento, el mismo sitio), sigue en ella: sin saltos ni fundidos
  {
    let sups = [{ id: "a", x1: 20, x2: 380, y: 300 }, { id: "b", x1: 40, x2: 360, y: 420 }];
    let fundidos = 0;
    const m = crearMascota({ superficies: () => sups, azar: azarDe(5), alReubicar: () => { fundidos += 1; } });
    for (let i = 0; i < 30; i++) m.paso(1 / 30);
    m.descanso = { id: "r", quedan: 9, fraccion: 0.85, pausa: false, grupoSiguiente: "Pecho" };
    const calentando = new Set();
    for (let i = 0; i < 30 * 6; i++) {
      m.paso(1 / 30);
      if (/^Calienta/.test(m.accion)) calentando.add(m.accion);
    }
    m.descanso = null;
    for (let i = 0; i < 6; i++) m.paso(1 / 30);
    const tras = m.accion;
    for (let i = 0; i < 30 * 4; i++) m.paso(1 / 30);
    for (let i = 0; i < 90 && /Salta|Baja de un salto/.test(m.accion); i++) m.paso(1 / 30);
    const antes = m.superficie;
    sups = sups.map((s) => (s.id === antes ? { ...s, id: `${s.id}-rehecha`, y: s.y + 2 } : s));
    const vistas = new Set();
    for (let i = 0; i < 10; i++) {
      m.paso(1 / 30);
      vistas.add(m.accion);
    }
    caso(calentando.size >= 2 && !/^Calienta|Lista/.test(tras) && m.superficie === `${antes}-rehecha` && fundidos === 0
      && ![...vistas].some((x) => /Salta|Baja de un salto/.test(x)),
    `MA19 calienta con movimientos distintos (${[...calentando].join(", ")}) y para al acabar el descanso (luego: ${tras}); y si la app vuelve a pintar su tarjeta, sigue en ella, sin saltos ni fundidos (${m.superficie})`);
  }

  const preparar = async () => {
    await limpiarBeta();
    guardar("gym-beta-datos", await datosBeta());
    guardar("gym-beta-ui", { versionVista: VERSION, versionVistaBeta: VERSION, ayudaSerieVista: true });
  };

  // MA10-MA14 En la beta: sale de entrada, siente cada serie, se la toca y tiene su página en Ajustes
  {
    await preparar();
    const b = await cargarBeta({ canal: "beta" });
    const llego = await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const m = b.w.__gymMascota;
    caso(Boolean(llego) && b.d.querySelectorAll(".mascota-capa").length === 1 && leerJson(memoria.CLAVE)?.v === memoria.VERSION,
      "MA10 en la beta sale de entrada (y nace: su ficha, aparte de tus datos)");
    m?.calcular();
    m?.avanzar(1);
    caso(m?.superficies.length >= 3 && m?.superficie != null, `MA10 tiene dónde ponerse: en cada tarjeta (${m?.superficies.length})`);
    const capa = () => b.d.querySelector(".mascota-capa");
    const enTarjeta = { sup: m?.superficie, pos: capa() && b.w.getComputedStyle(capa()).position };

    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(200);
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(200);
    // si estaba lejos del rincón, primero salta hasta él; luego siente el músculo
    const vistas = [];
    do {
      m?.avanzar(0.25);
      vistas.push(m?.accion);
    } while (!/pecho/i.test(m?.accion) && vistas.length < 16);
    const enRincon = capa() && b.w.getComputedStyle(capa()).position;
    caso(/^tarjeta/.test(enTarjeta.sup) && enTarjeta.pos === "absolute" && enRincon === "fixed",
      `MA16 encima de una tarjeta, su lienzo va pegado a la página (${enTarjeta.pos}: al desplazarla, sin tirones); en el rincón, a la pantalla (${enRincon})`);
    caso(/pecho/i.test(m?.accion) && m?.tranquila && m?.superficie === "rincon",
      `MA11 al apuntar una serie de pecho va a su rincón del entreno y la siente (${[...new Set(vistas)].join(" → ")}, ${m?.superficie})`);

    m?.avanzar(6); // ya fuera del rincón, en el descanso (D-135)
    for (let i = 0; i < 20 && /Salta|Baja de un salto/.test(m?.accion); i++) m?.avanzar(0.25); // quieta, no a medio salto
    const [hx, hy] = (m?.cabeza || [0, 0]).map(Math.round);
    let llega = 0;
    const contar = () => { llega += 1; };
    b.d.addEventListener("click", contar, true);
    const avisos = b.d.getElementById("avisos");
    avisos.hidden = true; // el «Deshacer» de la serie, si cae encima, se llevaría el toque (y está bien)
    const debajo = b.d.elementFromPoint(hx, hy) || b.d.body;
    debajo.dispatchEvent(new b.w.PointerEvent("pointerdown", { bubbles: true, clientX: hx, clientY: hy, isPrimary: true, pointerId: 1 }));
    debajo.dispatchEvent(new b.w.MouseEvent("click", { bubbles: true, clientX: hx, clientY: hy }));
    b.d.removeEventListener("click", contar, true);
    avisos.hidden = false;
    let reaccion = "";
    for (let i = 0; i < 16 && !reaccion; i++) {
      m?.avanzar(0.25);
      if (/susto|saluda|cosquillas|Choca/i.test(m?.accion)) reaccion = m.accion;
    }
    caso(llega === 0 && Boolean(reaccion) && leerJson(memoria.CLAVE)?.toques === 1,
      `MA12 tocarla: reacciona (${reaccion || m?.accion}; en el descanso, choca los cinco) y el toque no pulsa lo que tiene debajo`);

    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(100);
    pulsar(b.d, "ir-mascota");
    await esperar(100);
    const titulo = b.d.querySelector(".pantalla-mascota .titulo-pantalla")?.textContent;
    b.d.querySelector('[data-accion="mascota-tamano"][data-valor="grande"]')?.click();
    await esperar(50);
    b.d.querySelector('[data-accion="mascota-luz"][data-valor="violeta"]')?.click();
    await esperar(50);
    b.d.querySelector('[data-accion="mascota-brillo"][data-valor="intenso"]')?.click();
    await esperar(50);
    teclear(b.d, b.d.querySelector('[data-campo="mascota-nombre"]'), "Chispa");
    await esperar(50);
    const ficha = leerJson(memoria.CLAVE);
    caso(titulo === "Tu mascota" && ficha?.ajustes.tamano === "grande" && ficha?.ajustes.luz === "violeta" && ficha?.ajustes.nombre === "Chispa"
      && ficha?.ajustes.brillo === "intenso" && m?.escala === 0.68 && m?.luz === "violeta" && m?.brillo === 1.7
      && b.d.querySelector(".pantalla-mascota .titulo-pantalla")?.textContent === "Chispa",
    "MA13 su página en Ajustes: su tamaño, su luz, su brillo y su nombre, al momento");

    b.d.querySelector('[data-ajuste="mascota-encendida"]')?.click();
    await esperar(100);
    const apagada = !m?.viva && !b.d.querySelector(".mascota-capa") && leerJson(memoria.CLAVE)?.ajustes.encendida === false;
    b.d.querySelector('[data-ajuste="mascota-encendida"]')?.click();
    const vuelve = await hastaQue(() => m?.viva, 100);
    caso(apagada && Boolean(vuelve) && b.d.querySelectorAll(".mascota-capa").length === 1, "MA14 apagada, se va (y no gasta nada); encendida, vuelve");
    sinErrores(b, "MA10-MA14");
    quitar(b);
  }

  // MA18 En la app: tras sentir la serie, en el descanso sale del rincón, lejos del ejercicio abierto y con la luz baja; al
  // acabar el descanso, vuelve a asomarse en su rincón
  {
    await preparar();
    const b = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const m = b.w.__gymMascota;
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(200);
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(200);
    const vistas = [];
    for (let i = 0; i < 40 && (!m?.superficie || m?.superficie === "rincon"); i++) {
      m?.avanzar(0.25);
      vistas.push(m?.accion);
    }
    m?.avanzar(0.5);
    const fuera = m?.superficie;
    const abierto = b.d.querySelector(".ej.abierto")?.getBoundingClientRect();
    const sup = m?.superficies.find((s) => s.id === fuera);
    const lejos = Boolean(sup) && (!abierto || !(sup.y > abierto.top - 2 && sup.y - 82 < abierto.bottom && sup.x2 > abierto.left && sup.x1 < abierto.right));
    caso(Boolean(fuera) && fuera !== "rincon" && lejos && Boolean(m?.descanso) && m?.carga < 0.8,
      `MA18 tras sentir la serie, en el descanso sale del rincón (${fuera}), lejos del ejercicio abierto, con la luz baja (${m?.carga?.toFixed(2)}; ${[...new Set(vistas)].join(" → ")})`);
    pulsar(b.d, "descanso-saltar");
    await esperar(200);
    for (let i = 0; i < 24 && m?.superficie !== "rincon"; i++) m?.avanzar(0.25);
    caso(m?.superficie === "rincon" && !m?.descanso, `MA18 al acabar el descanso vuelve a su rincón (${m?.superficie})`);
    sinErrores(b, "MA18");
    quitar(b);
  }

  // MA24 En la app (la fase 2): su cuerpo sale de tus entrenos (con tu rutina entera las últimas semanas, definida); al
  // apuntar series, ese músculo se le hincha y se marca más; y su página lo dice («Su forma»)
  {
    await limpiarBeta();
    const base = await datosBeta();
    const T1 = ms("2026-11-03T18:00:00");
    const sesiones = Array.from({ length: 20 }, (_, i) => sesionInventada(base, base.dias[i % base.dias.length].id,
      new Date(T1 - DIA - (i * 7 * DIA) / 5).toISOString(), { id: `s-ma24-${i}` })).reverse();
    guardar("gym-beta-datos", await datosBeta({ sesiones }));
    guardar("gym-beta-ui", { versionVista: VERSION, versionVistaBeta: VERSION, ayudaSerieVista: true });
    const b = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const m = b.w.__gymMascota;
    const fondoAntes = m?.fondo;
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(200);
    for (let i = 0; i < 3; i++) {
      pulsar(b.d, "serie-hecha", "pec-deck");
      await esperar(150);
      pulsar(b.d, "descanso-saltar");
      await esperar(100);
    }
    await esperar(400);
    const pecho = m?.musculos?.pechoI?.bombeo;
    caso(fondoAntes >= 0.85 && pecho >= 0.95 && m?.general > 0.1 && m?.forma > m?.fondo,
      `MA24 en la app, su cuerpo sale de tus entrenos: con tu rutina entera, definida (${fondoAntes?.toFixed(2)}); al apuntar series, ese músculo se le hincha (pecho ${pecho?.toFixed(2)}) y se marca más (bombeo general, ${m?.general?.toFixed(2)})`);
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(100);
    pulsar(b.d, "ir-mascota");
    await esperar(100);
    const pagina = textoDe(b.d, ".pantalla-mascota");
    caso(/Su forma/.test(pagina) && /Muy definida/.test(pagina) && /Bombeo: Pecho/.test(pagina) && /En las últimas 4 semanas: \d+ días de entreno/.test(pagina),
      `MA24 su página dice cómo está y por qué («${pagina.slice(pagina.indexOf("Su forma"), pagina.indexOf("Su forma") + 150)}»)`);
    sinErrores(b, "MA24");
    quitar(b);
  }

  // MA25 Cargar una copia que la trae: lo dice, vuelve ella (y nace otra vez, con su carácter) y «Deshacer» deja la de antes
  {
    await preparar();
    const otra = { v: 1, nacida: ms("2026-10-01T10:00:00"), semilla: 4242, ajustes: { nombre: "Lumen", luz: "cian" }, vista: null, toques: 7 };
    const exp = copias.construirExportacion(await datosBeta(), ms("2026-11-03T10:00:00"), { mascota: otra });
    const b = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const antes = leerJson(memoria.CLAVE);
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(100);
    const input = b.d.querySelector('[data-campo="archivo"]');
    const dt = new b.w.DataTransfer();
    dt.items.add(new b.w.File([JSON.stringify(exp)], "copia.json", { type: "application/json" }));
    input.files = dt.files;
    input.dispatchEvent(new b.w.Event("change", { bubbles: true }));
    await hastaQue(() => hojaAbierta(b.d), 200);
    const previa = textoDe(b.d, ".capa-hoja:last-of-type .hoja");
    pulsar(b.d, "confirmar");
    await hastaQue(() => avisoActual(b.d).startsWith("Copia cargada"), 300);
    await hastaQue(() => b.w.__gymMascota?.viva, 100);
    const cargada = leerJson(memoria.CLAVE);
    const luz = b.w.__gymMascota?.luz;
    pulsar(b.d, "deshacer");
    await esperar(100);
    const deshecha = leerJson(memoria.CLAVE);
    caso(previa.includes("Con tu mascota, Lumen") && previa.includes("tus ajustes y tu mascota") && cargada?.semilla === 4242 && cargada?.toques === 7
      && luz === "cian" && Boolean(antes) && deshecha?.semilla === antes.semilla && b.d.querySelectorAll(".mascota-capa").length === 1,
    `MA25 cargar una copia que la trae: lo dice («Con tu mascota, Lumen»), vuelve ella (su semilla y su luz: ${luz}) y «Deshacer» deja la de antes`);
    sinErrores(b, "MA25");
    quitar(b);
  }

  // MA28 En la app (D-135, la 3): abres un ejercicio sin sesión en marcha y calienta; al terminar, lo celebra cuando
  // cierras el resumen (antes no: la tapa); y con una marca de hoy, lleva su trofeo
  {
    await preparar();
    const b = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const m = b.w.__gymMascota;
    m.avanzar(1);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(150);
    const antes = [];
    for (let i = 0; i < 16; i++) {
      m.avanzar(0.25);
      antes.push(m.accion);
    }
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(200);
    pulsar(b.d, "descanso-saltar");
    await esperar(100);
    pulsar(b.d, "terminar-sesion");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 3000);
    const pendiente = m.celebracionPendiente;
    m.avanzar(2);
    const tapada = m.accion;
    const sigue = Boolean(m.celebracionPendiente);
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    const despues = [];
    for (let i = 0; i < 12; i++) {
      m.avanzar(0.25);
      despues.push(m.accion);
    }
    caso(antes.some((x) => /^Calienta/.test(x)) && pendiente?.series === 1 && pendiente?.plan > 1 && sigue
      && !/Algo es algo|Bien hecho|Sesión completa|Celebra el récord/.test(tapada) && despues.some((x) => /Algo es algo|Celebra el récord/.test(x)) && !m.celebracionPendiente,
    `MA28 abres un ejercicio sin sesión en marcha y calienta (${[...new Set(antes)].filter((x) => /Calienta/.test(x)).join(", ")}); al terminar, lo celebra al cerrar el resumen, no antes (${[...new Set(despues)].join(" → ")})`);
    sinErrores(b, "MA28");
    quitar(b);
    await limpiarBeta();
    guardar("gym-beta-datos", await datosBeta({ cambios: (x) => x.marcas.push({ exerciseId: "pec-deck", kg: 60, fecha: ms("2026-11-03T12:00:00"), motivo: "sesion" }) }));
    guardar("gym-beta-ui", { versionVista: VERSION, versionVistaBeta: VERSION, ayudaSerieVista: true });
    const b2 = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b2.w.__gymMascota?.viva, 200);
    caso(b2.w.__gymMascota?.trofeo === true, "MA28 con una marca batida hoy entrenando, lleva su trofeo");
    sinErrores(b2, "MA28 (trofeo)");
    quitar(b2);
  }

  // MA29 Tras días sin entrenar, al abrir la app estaba dormida y se alegra de verte; si entrenaste ayer, te saluda
  {
    const T1 = ms("2026-11-03T18:00:00");
    const abrir = async (haceDias) => {
      await limpiarBeta();
      const base = await datosBeta();
      guardar("gym-beta-datos", await datosBeta({ sesiones: [sesionInventada(base, "thursday-pull", new Date(T1 - haceDias * DIA).toISOString(), { id: "s-ultima" })] }));
      guardar("gym-beta-ui", { versionVista: VERSION, versionVistaBeta: VERSION, ayudaSerieVista: true });
      guardar(memoria.CLAVE, { v: 1, nacida: T1 - 20 * DIA, semilla: 7, ajustes: {}, vista: T1 - 2 * DIA, toques: 0 });
      const b = await cargarBeta({ canal: "beta" });
      await hastaQue(() => b.w.__gymMascota?.viva, 200);
      const m = b.w.__gymMascota;
      const vistas = [];
      for (let i = 0; i < 48; i++) {
        m.avanzar(0.25);
        if (vistas[vistas.length - 1] !== m.accion) vistas.push(m.accion);
      }
      sinErrores(b, `MA29 (hace ${haceDias} días)`);
      quitar(b);
      return vistas;
    };
    const tras5 = await abrir(5);
    const tras1 = await abrir(1);
    caso(tras5.includes("Se despierta de golpe") && tras5.includes("¡Qué alegría verte!") && tras5.includes("Te saluda")
      && !tras1.includes("Se despierta de golpe") && !tras1.includes("¡Qué alegría verte!") && tras1.includes("Te saluda"),
    `MA29 tras días sin entrenar, al abrir la app estaba dormida y se alegra de verte (${tras5.slice(0, 5).join(" → ")}); si entrenaste ayer, te saluda (${tras1.slice(0, 3).join(" → ")})`);
    await limpiarBeta();
  }

  // MA31 En la app (D-135, la 4): con una sesión en marcha lleva su cinta (al terminarla, se la quita); y en el descanso
  // sabe qué ejercicio acabas de hacer, para imitarlo
  {
    await preparar();
    const b = await cargarBeta({ canal: "beta" });
    await hastaQue(() => b.w.__gymMascota?.viva, 200);
    const m = b.w.__gymMascota;
    const sinSesion = m.cinta;
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    await esperar(150);
    pulsar(b.d, "serie-hecha", "pec-deck");
    await esperar(200);
    m.avanzar(0.5);
    const conSesion = m.cinta;
    const grupo = m.descanso?.grupo;
    pulsar(b.d, "descanso-saltar");
    await esperar(100);
    pulsar(b.d, "terminar-sesion");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 3000);
    pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !hojaAbierta(b.d), 2000);
    m.avanzar(0.5);
    const tras = m.cinta;
    caso(!sinSesion && conSesion && grupo === "Pecho" && !tras,
      `MA31 con una sesión en marcha lleva su cinta (antes: ${sinSesion}; durante: ${conSesion}; al terminar: ${tras}) y en el descanso sabe qué acabas de hacer (${grupo})`);
    sinErrores(b, "MA31");
    quitar(b);
  }

  // MA15 En la app normal no sale ni guarda nada hasta que la enciendes en Ajustes
  {
    await preparar();
    const b = await cargarBeta();
    await esperar(300);
    const nada = !b.w.__gymMascota?.viva && !b.d.querySelector(".mascota-capa") && localStorage.getItem(memoria.CLAVE) === null;
    b.d.querySelector('#nav [data-accion="ir-ajustes"]').click();
    await esperar(100);
    const interruptor = b.d.querySelector('[data-ajuste="mascota-encendida"]');
    const apagado = Boolean(interruptor) && !interruptor.checked;
    interruptor?.click();
    const llega = await hastaQue(() => b.w.__gymMascota?.viva, 200);
    caso(nada && apagado && Boolean(llega), "MA15 en la app normal no sale ni guarda nada hasta que la enciendes en Ajustes; entonces llega");
    sinErrores(b, "MA15");
    quitar(b);
    await limpiarBeta();
  }
}
