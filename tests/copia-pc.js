// Copia en el PC (casos C1-C10): la beta habla con un PC de mentira (un fetch falso hacia …ts.net). Nada sale del PC
// de pruebas.

import { datosBeta, sesionInventada } from "./datos.js";

const DIRECCION = "https://f-pc-2.prueba.ts.net";
const SOLO_DIRECCION = { activo: false, direccion: DIRECCION, clave: null, estado: null, texto: "", cuando: null };
const hora = (texto) => new Date(texto).getTime();

export async function ejecutar(c) {
  const { caso, esperar, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, recargar, quitar, pulsar, textoDe, sinErrores, avisoActual } = c;
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    for (const [k, v] of Object.entries(extra)) guardar(k, v);
  };
  // Datos con una sesión de antes (la copia del PC solo se manda si hay algún entreno).
  const conSesion = async (n = 1) => {
    const datos = await datosBeta();
    for (let i = 0; i < n; i += 1) datos.sesiones.push(sesionInventada(datos, "tuesday-push", `2026-10-2${i}T18:00:00`, { soloPrimeros: 2, id: `s-prueba-${i}` }));
    return datos;
  };
  const estadoPc = () => leerJson("gym-beta-copia-pc");
  // El PC de mentira: contesta a fetch() hacia …ts.net como el hub; lo demás va al servidor de pruebas de siempre.
  const pcFalso = (b) => {
    const pc = { peticiones: [], caido: false, respuestas: {} };
    const original = b.w.fetch.bind(b.w);
    b.w.fetch = async (url, opciones = {}) => {
      const u = String(url);
      if (!u.includes(".ts.net")) return original(url, opciones);
      const destino = new URL(u);
      let cuerpo = null;
      try {
        cuerpo = opciones.body ? JSON.parse(opciones.body) : null;
      } catch {
        cuerpo = "no es JSON";
      }
      pc.peticiones.push({ url: u, ruta: destino.pathname, motivo: destino.searchParams.get("motivo"), metodo: opciones.method || "GET", texto: opciones.body, cuerpo, opciones });
      if (pc.caido) throw new b.w.TypeError("Failed to fetch");
      const r = pc.respuestas[destino.pathname] || { status: 200, json: { ok: true, guardada: true, archivo: "gym-beta-2026-11-03-180000.json", sesiones: cuerpo?.beta?.sesiones?.length ?? null } };
      return new b.w.Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json" } });
    };
    pc.copias = () => pc.peticiones.filter((p) => p.ruta === "/gimnasio/copia");
    return pc;
  };
  const anotarAvisos = (b) => {
    const textos = [];
    new b.w.MutationObserver(() => {
      const t = avisoActual(b.d);
      if (t && textos[textos.length - 1] !== t) textos.push(t);
    }).observe(b.d.getElementById("avisos"), { childList: true, subtree: true, characterData: true });
    return textos;
  };
  // Una serie y «Terminar sesión» (con series pendientes sale la confirmación).
  const entrenarYTerminar = async (b) => {
    if (!b.d.querySelector('li[data-ej="machine-chest-press"].abierto')) pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    pulsar(b.d, "serie-hecha", "machine-chest-press");
    await esperar(50);
    pulsar(b.d, "terminar-sesion");
    await esperar(50);
    pulsar(b.d, "confirmar");
    await hastaQueVirtual(() => textoDe(b.d, ".hoja-titulo") === "Sesión guardada", 3000);
  };
  const cerrarHoja = async (b) => {
    if (b.d.querySelector('[data-accion="cerrar-hoja"]')) pulsar(b.d, "cerrar-hoja");
    await hastaQueVirtual(() => !b.d.querySelector(".capa-hoja .hoja"), 2000);
  };
  const irAjustes = async (b) => {
    pulsar(b.d, "ir-ajustes");
    await esperar(50);
  };
  const interruptor = (b) => b.d.querySelector('input[data-ajuste="copia-pc"]');
  const botonMandar = (b) => b.d.querySelector('[data-accion="mandar-copia-pc"]');

  // C1 El recordatorio de copia, con la del PC
  {
    const { necesitaCopia } = await import("/beta/js/copias.js");
    const datos = { actualizado: 1000, sesiones: [{}], copia: null, ajustes: {} };
    const sin = necesitaCopia(datos, 5000, null, null);
    const alDia = necesitaCopia(datos, 5000, null, 1000);
    const vieja = necesitaCopia(datos, 5000, null, 999);
    caso(sin === "Aún no has guardado ninguna copia de la beta." && alDia === null && vieja === sin,
      `C1 con una copia en el PC que trae lo último, no hace falta guardar otra (sin: «${sin}», al día: ${alDia}, vieja: «${vieja}»)`);
  }

  // C2 Sin la dirección del PC: el interruptor apagado, el botón también, y nada sale al acabar un entreno
  {
    await preparar(await conSesion());
    const b = await cargarBeta();
    const pc = pcFalso(b);
    await irAjustes(b);
    caso(Boolean(interruptor(b)) && interruptor(b).disabled && !interruptor(b).checked && botonMandar(b)?.disabled === true
      && textoDe(b.d, "#estado-copia-pc").startsWith("Para usarla, pon antes la dirección de tu PC"),
    `C2 sin dirección: «Copia en el PC» apagada y sin botón (${textoDe(b.d, "#estado-copia-pc").slice(0, 60)}…)`);
    pulsar(b.d, "ir-entreno");
    await esperar(50);
    await entrenarYTerminar(b);
    await esperar(4000);
    caso(pc.peticiones.length === 0 && estadoPc() === null, `C2 …y al acabar el entreno no habla con nadie (${pc.peticiones.length})`);
    sinErrores(b, "C2");
    quitar(b);
  }

  // C3 Al acabar un entreno: la copia va al PC, como «Exportar datos», y no sale el aviso de guardar copia
  {
    const datos = await conSesion();
    await preparar(datos, { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": { activo: true, ultima: hora("2026-11-03T17:00:00"), sesiones: 1, estado: "bien", texto: "", cuando: hora("2026-11-03T17:00:00") } });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    await entrenarYTerminar(b);
    await hastaQueVirtual(() => pc.copias().length === 1 && estadoPc()?.sesiones === 2, 3000);
    const [p] = pc.copias();
    caso(p?.url === `${DIRECCION}/gimnasio/copia?motivo=fin` && p.metodo === "POST" && p.opciones.credentials === "omit" && p.opciones.mode === "cors"
      && p.opciones.headers?.["Content-Type"] === "application/json", `C3 al acabar el entreno, POST a ${p?.url} (sin cookies)`);
    caso(p?.cuerpo?.gymApp === true && p.cuerpo.version === 1 && Array.isArray(p.cuerpo.days) && p.cuerpo.days.length === datos.dias.length
      && p.cuerpo.beta?.sesiones?.length === 2 && p.texto.includes('\n  "days"'), `C3 …con la copia de «Exportar datos» (${p?.cuerpo?.beta?.sesiones?.length} sesiones, con sangría)`);
    const e = estadoPc();
    caso(e?.estado === "bien" && e.sesiones === 2 && Number.isFinite(e.ultima) && e.ultima >= leerJson("gym-beta-datos").actualizado,
      "C3 …y queda apuntada: bien, con 2 sesiones y la hora de sus datos");
    caso(textoDe(b.d, ".hoja-titulo") === "Sesión guardada" && !textoDe(b.d, ".capa-hoja").includes("no guardas una copia"),
      "C3 la hoja «Sesión guardada» no pide guardar copia (la del PC ya va)");
    await cerrarHoja(b);
    caso(!textoDe(b.d, ".banners").includes("no guardas una copia"), `C3 …ni Entreno («${textoDe(b.d, ".banners").slice(0, 80)}»)`);
    await esperar(4000);
    caso(pc.copias().length === 1, `C3 al rato, al abrir no se manda otra: el PC ya tiene lo último (${pc.copias().length})`);
    sinErrores(b, "C3");
    quitar(b);
  }

  // C4 Al abrir la beta: si el PC no tiene lo último, se le manda a los pocos segundos
  {
    await preparar(await conSesion(2), { "gym-beta-avisos-pc": SOLO_DIRECCION });
    let b = await cargarBeta();
    let pc = pcFalso(b);
    await esperar(1000);
    caso(pc.copias().length === 0, "C4 nada más abrir, todavía no");
    await hastaQueVirtual(() => pc.copias().length === 1 && estadoPc()?.estado === "bien", 4000);
    caso(pc.copias()[0]?.motivo === "abrir" && pc.copias()[0]?.cuerpo?.beta?.sesiones?.length === 2 && estadoPc()?.estado === "bien",
      `C4 a los pocos segundos, la manda (motivo ${pc.copias()[0]?.motivo}, ${pc.copias()[0]?.cuerpo?.beta?.sesiones?.length} sesiones, ${estadoPc()?.estado})`);
    b = await recargar(b);
    pc = pcFalso(b);
    await esperar(4500);
    caso(pc.copias().length === 0, "C4 al volver a abrir, con el PC al día, no manda otra");
    quitar(b);
    // Tras un fallo reciente, no se insiste al abrir; tras uno de hace rato, sí.
    const fallo = (minutos) => ({ activo: true, ultima: null, sesiones: null, estado: "sin-respuesta", texto: "El PC no responde.", cuando: hora("2026-11-03T18:00:00") - minutos * 60000 });
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": fallo(2) });
    b = await cargarBeta();
    pc = pcFalso(b);
    await esperar(4500);
    caso(pc.copias().length === 0, "C4 con un fallo de hace 2 min, al abrir no lo vuelve a intentar");
    quitar(b);
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": fallo(20) });
    b = await cargarBeta();
    pc = pcFalso(b);
    await hastaQueVirtual(() => pc.copias().length === 1 && estadoPc()?.estado === "bien", 4500);
    caso(pc.copias().length === 1 && estadoPc()?.estado === "bien", `C4 con uno de hace 20 min, sí (y queda bien: ${estadoPc()?.estado})`);
    quitar(b);
    // Sin ningún entreno todavía, nada que mandar.
    await preparar(await datosBeta(), { "gym-beta-avisos-pc": SOLO_DIRECCION });
    b = await cargarBeta();
    pc = pcFalso(b);
    await esperar(4500);
    caso(pc.copias().length === 0, "C4 sin ningún entreno, no manda nada");
    sinErrores(b, "C4");
    quitar(b);
  }

  // C5 Al volver a la beta (estaba en segundo plano), también
  {
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    pc.caido = true;
    await hastaQueVirtual(() => estadoPc()?.estado === "sin-respuesta", 4500);
    pc.caido = false;
    guardar("gym-beta-copia-pc", { ...estadoPc(), cuando: hora("2026-11-03T17:30:00") }); // como si hubiera pasado media hora
    b.espia.ocultar();
    await esperar(50);
    b.espia.mostrar();
    await hastaQueVirtual(() => pc.copias().length === 2 && estadoPc()?.estado === "bien", 3000);
    caso(pc.copias().length === 2 && pc.copias()[1].motivo === "abrir" && estadoPc()?.estado === "bien",
      `C5 al volver a la beta, la que faltaba sale (${pc.copias().length} intentos, ${estadoPc()?.estado})`);
    sinErrores(b, "C5");
    quitar(b);
  }

  // C6 Con el PC sin responder al acabar un entreno: se dice una vez y queda apuntado
  {
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": { activo: true, ultima: hora("2026-11-03T17:00:00"), sesiones: 1, estado: "bien", texto: "", cuando: hora("2026-11-03T17:00:00") } });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    pc.caido = true;
    const textos = anotarAvisos(b);
    await entrenarYTerminar(b);
    await cerrarHoja(b);
    await hastaQueVirtual(() => textos.some((t) => t.startsWith("No se ha podido guardar la copia en el PC")), 3000);
    caso(estadoPc()?.estado === "sin-respuesta" && estadoPc()?.texto.startsWith("El PC no responde") && estadoPc()?.sesiones === 1,
      `C6 sin respuesta del PC, queda apuntado (${estadoPc()?.estado}) y la última buena sigue (${estadoPc()?.sesiones} sesión)`);
    caso(textos.includes("No se ha podido guardar la copia en el PC: no responde. Se intentará otra vez al abrir la beta."),
      `C6 …y se dice: «${textos.find((t) => t.startsWith("No se ha podido")) || "nada"}»`);
    await esperar(5000);
    await entrenarYTerminar(b);
    await cerrarHoja(b);
    await esperar(3000);
    const veces = textos.filter((t) => t.startsWith("No se ha podido guardar la copia en el PC")).length;
    caso(pc.copias().length === 2 && veces === 1, `C6 con otro entreno, se intenta otra vez pero se dice una sola vez (${pc.copias().length} intentos, ${veces} aviso)`);
    await irAjustes(b);
    caso(textoDe(b.d, "#estado-copia-pc").startsWith("La última vez falló") && textoDe(b.d, "#estado-copia-pc").includes("La última llegó"),
      `C6 en Ajustes: «${textoDe(b.d, "#estado-copia-pc").slice(0, 90)}…»`);
    sinErrores(b, "C6");
    quitar(b);
  }

  // C7 «Mandar una copia ahora» en Ajustes: guardada, ya la tenía, y lo que el PC no deja
  {
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": { activo: true, ultima: hora("2026-11-03T17:00:00"), sesiones: 1, estado: "bien", texto: "", cuando: hora("2026-11-03T17:00:00") } });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    await irAjustes(b);
    caso(interruptor(b)?.checked === true && !interruptor(b).disabled && botonMandar(b)?.disabled === false
      && textoDe(b.d, "#estado-copia-pc") === "La última llegó hoy (3 nov, 17:00), con 1 sesión.",
    `C7 en Ajustes → Copia de seguridad: «Copia en el PC», encendida, con «${textoDe(b.d, "#estado-copia-pc")}»`);
    pulsar(b.d, "mandar-copia-pc");
    await hastaQueVirtual(() => avisoActual(b.d) !== "", 3000);
    caso(pc.copias().length === 1 && pc.copias()[0].motivo === "mano" && avisoActual(b.d) === "Copia guardada en el PC",
      `C7 «Mandar una copia ahora»: POST con motivo «mano» y «${avisoActual(b.d)}»`);
    await esperar(5000);
    pc.respuestas["/gimnasio/copia"] = { status: 200, json: { ok: true, guardada: false, archivo: "x.json", sesiones: 1 } };
    pulsar(b.d, "mandar-copia-pc");
    await hastaQueVirtual(() => avisoActual(b.d) === "El PC ya tenía esta copia", 3000);
    caso(avisoActual(b.d) === "El PC ya tenía esta copia", `C7 si el PC ya la tenía, lo dice: «${avisoActual(b.d)}»`);
    await esperar(5000);
    pc.respuestas["/gimnasio/copia"] = { status: 403, json: { ok: false, error: "no-permitido", texto: "esa cuenta de Tailscale no es la dueña del PC" } };
    pulsar(b.d, "mandar-copia-pc");
    await hastaQueVirtual(() => avisoActual(b.d).startsWith("El PC no la deja"), 3000);
    caso(avisoActual(b.d) === "El PC no la deja: esa cuenta de Tailscale no es la dueña del PC." && estadoPc()?.estado === "error"
      && textoDe(b.d, "#estado-copia-pc").startsWith("La última vez falló"), `C7 si el PC dice que no, se dice por qué: «${avisoActual(b.d)}»`);
    sinErrores(b, "C7");
    quitar(b);
  }

  // C8 El interruptor: apagada, no manda nada; al encenderla, manda lo que falte
  {
    await preparar(await conSesion(), { "gym-beta-avisos-pc": SOLO_DIRECCION, "gym-beta-copia-pc": { activo: true, ultima: hora("2026-11-03T17:00:00"), sesiones: 1, estado: "bien", texto: "", cuando: hora("2026-11-03T17:00:00") } });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    await irAjustes(b);
    interruptor(b).click();
    await esperar(50);
    caso(estadoPc()?.activo === false && textoDe(b.d, "#estado-copia-pc") === "Apagada: el PC no recibe copias." && botonMandar(b)?.disabled === true,
      "C8 apagada: queda apuntado, lo dice y el botón se apaga");
    pulsar(b.d, "ir-entreno");
    await esperar(50);
    await entrenarYTerminar(b);
    await cerrarHoja(b);
    await esperar(4000);
    caso(pc.copias().length === 0, `C8 …y al acabar un entreno no manda nada (${pc.copias().length})`);
    await irAjustes(b);
    interruptor(b).click();
    await hastaQueVirtual(() => pc.copias().length === 1 && estadoPc()?.sesiones === 2, 3000);
    caso(estadoPc()?.activo === true && pc.copias()[0]?.motivo === "abrir" && pc.copias()[0]?.cuerpo?.beta?.sesiones?.length === 2,
      "C8 al encenderla, manda ya lo que le faltaba al PC");
    sinErrores(b, "C8");
    quitar(b);
  }

  // C9 Con la dirección puesta después, en «Avisos desde el PC», la copia se enciende sola
  {
    await preparar(await conSesion());
    const b = await cargarBeta();
    pcFalso(b);
    await irAjustes(b);
    caso(interruptor(b)?.disabled === true, "C9 sin dirección, apagada");
    // Como el enlace de la página del PC (o «Activar»): la dirección queda en gym-beta-avisos-pc.
    const avisosPc = await import("/beta/js/avisos-pc.js");
    avisosPc.leerEnlace(`#avisos-pc=${DIRECCION}`);
    pulsar(b.d, "ir-entreno");
    await esperar(50);
    await irAjustes(b);
    caso(interruptor(b)?.disabled === false && interruptor(b)?.checked === true && textoDe(b.d, "#estado-copia-pc").startsWith("Aún no ha llegado ninguna"),
      `C9 con la dirección del PC, se enciende sola: «${textoDe(b.d, "#estado-copia-pc")}»`);
    sinErrores(b, "C9");
    quitar(b);
  }

  // C10 Solo a la dirección guardada, solo a /gimnasio/copia y nunca a otra web
  {
    await preparar(await conSesion(), { "gym-beta-avisos-pc": { ...SOLO_DIRECCION, direccion: "https://malo.example" } });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    const peticiones = [];
    const fetchAntes = b.w.fetch;
    b.w.fetch = (url, opciones) => {
      peticiones.push(String(url));
      return fetchAntes(url, opciones);
    };
    await esperar(4500);
    await irAjustes(b);
    caso(peticiones.every((u) => !u.includes("malo.example")) && pc.peticiones.length === 0 && interruptor(b)?.disabled === true,
      "C10 con una dirección que no es de Tailscale, no manda nada a ningún sitio");
    sinErrores(b, "C10");
    quitar(b);
  }
}
