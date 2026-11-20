// La mascota (D-133): su memoria (su ficha, aparte de tus datos), su carácter (de su semilla), su cerebro (vive sin
// errores; tranquila, ni pasea ni salta; en el rincón, asomada; si su tarjeta se va, aparece en otra), dónde se pone
// (solo donde, de pie, no tapa nada) y, en la app, cómo se entera de cada serie, cómo se la toca y su página en Ajustes.
// En la beta sale de entrada; en la normal, solo si la enciendes.

import { datosBeta } from "./datos.js";

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
  const { caso, esperar, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, teclear, sinErrores, hastaQue } = c;
  const { VERSION } = await import("/js/version.js");
  const memoria = await import("/js/mascota/memoria.js");
  const caracter = await import("/js/mascota/caracter.js");
  const { crearMascota, PESOS } = await import("/js/mascota/cerebro.js");
  const { calcularSuperficies } = await import("/js/mascota/escenario.js");
  const { GRUPOS } = await import("/js/mascota/gestos.js");

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
    const donde = (n) => vistas.indexOf(n);
    caso(donde("Recupera el aliento") >= 0 && donde("Se seca el sudor") > donde("Recupera el aliento")
      && donde("Calienta para la siguiente") > donde("Se seca el sudor") && donde("¡Lista para la siguiente!") > donde("Calienta para la siguiente")
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
