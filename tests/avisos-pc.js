// Avisos desde el PC (casos A1-A10): la beta habla con un PC de mentira (un fetch falso hacia …ts.net) y con el Web
// Push de mentira de los espías (comun.js). Nada sale del PC de pruebas.

import { datosBeta } from "./datos.js";

const DIRECCION = "https://f-pc-2.prueba.ts.net";
const BYTES_CLAVE = Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 4 : i));
const CLAVE_PC = btoa(String.fromCharCode(...BYTES_CLAVE)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function ejecutar(c) {
  const { caso, esperar, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, textoDe, sinErrores, teclear, avisoActual, esperarListo, urlBeta } = c;
  const cortos = (segundos) => (d) => {
    for (const dia of d.dias) for (const e of dia.ejercicios) e.rest = `0:${String(segundos).padStart(2, "0")}`;
  };
  const preparar = async (datos, extra = {}) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    for (const [k, v] of Object.entries(extra)) guardar(k, v);
  };
  const marcar = async (b, id = "machine-chest-press") => {
    if (!b.d.querySelector(`li[data-ej="${id}"].abierto`)) pulsar(b.d, "abrir-ejercicio", id);
    pulsar(b.d, "serie-hecha", id);
    await esperar(30);
  };
  const config = () => leerJson("gym-beta-avisos-pc");
  const ACTIVO = { activo: true, direccion: DIRECCION, clave: CLAVE_PC, estado: "bien", texto: "", cuando: null };

  // El PC de mentira: contesta a fetch() hacia …ts.net como el hub; lo demás va al servidor de pruebas de siempre.
  const pcFalso = (b) => {
    const pc = { peticiones: [], caido: false, respuestas: {} };
    const original = b.w.fetch.bind(b.w);
    b.w.fetch = async (url, opciones = {}) => {
      const u = String(url);
      if (!u.includes(".ts.net")) return original(url, opciones);
      const ruta = new URL(u).pathname;
      pc.peticiones.push({ url: u, ruta, metodo: opciones.method || "GET", cuerpo: opciones.body ? JSON.parse(opciones.body) : null, opciones });
      if (pc.caido) throw new b.w.TypeError("Failed to fetch");
      const extra = { "/avisos/clave": { clave: CLAVE_PC }, "/avisos/suscribir": { clave: CLAVE_PC, listo: true }, "/avisos/programar": { hora: "18:00:10" } }[ruta]
        ?? { habia: true, mandado: false };
      const r = pc.respuestas[ruta] || { status: 200, json: { ok: true, ...extra } };
      return new b.w.Response(JSON.stringify(r.json), { status: r.status, headers: { "Content-Type": "application/json" } });
    };
    pc.de = (ruta) => pc.peticiones.filter((p) => p.ruta === ruta);
    return pc;
  };
  const conSuscripcion = (b, bytes = BYTES_CLAVE) => {
    b.espia.suscripcion = b.espia.nuevaSuscripcion(bytes);
  };
  // Los textos de los avisos de la app, uno detrás de otro (para contar cuántas veces sale uno).
  const anotarAvisos = (b) => {
    const textos = [];
    new b.w.MutationObserver(() => {
      const t = avisoActual(b.d);
      if (t && textos[textos.length - 1] !== t) textos.push(t);
    }).observe(b.d.getElementById("avisos"), { childList: true, subtree: true, characterData: true });
    return textos;
  };

  // A1 La dirección del PC: solo https y …ts.net, sin ruta, usuario ni otro puerto
  {
    const m = await import("/beta/js/avisos-pc.js");
    const pruebas = [
      ["f-pc-2.taild411c0.ts.net", "https://f-pc-2.taild411c0.ts.net"],
      ["https://F-PC-2.taild411c0.ts.net/", "https://f-pc-2.taild411c0.ts.net"],
      ["  https://f-pc-2.taild411c0.ts.net  ", "https://f-pc-2.taild411c0.ts.net"],
      ["https://f-pc-2.taild411c0.ts.net:443", "https://f-pc-2.taild411c0.ts.net"],
      ["http://f-pc-2.taild411c0.ts.net", null],
      ["https://f-pc-2.taild411c0.ts.net:8443", null],
      ["https://f-pc-2.taild411c0.ts.net/avisos", null],
      ["https://f-pc-2.taild411c0.ts.net?x=1", null],
      ["https://a@f-pc-2.taild411c0.ts.net", null],
      ["https://malo.example", null],
      ["https://f-pc-2.taild411c0.ts.net.malo.example", null],
      ["https://ts.net", null],
      ["javascript:void(0)", null],
      ["", null],
    ];
    const mal = pruebas.filter(([t, esperado]) => m.normalizarDireccion(t) !== esperado);
    caso(mal.length === 0, `A1 la dirección del PC: solo https de Tailscale, sin ruta ni otro puerto (${pruebas.length - mal.length} de ${pruebas.length}${mal.length ? `; mal: ${mal.map(([t]) => t || "vacía").join(", ")}` : ""})`);
  }

  // A2 Activar desde Ajustes: la clave del PC, la suscripción y lo guardado
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const pc = pcFalso(b);
    b.espia.permiso = "granted";
    pulsar(b.d, "ir-ajustes");
    await esperar(50);
    const campo = b.d.getElementById("direccion-pc");
    caso(Boolean(campo) && Boolean(b.d.querySelector('[data-accion="activar-avisos-pc"]')) && textoDe(b.d, "#avisos-pc").startsWith("Avisos desde el PC"),
      "A2 en Ajustes → Descanso, «Avisos desde el PC» con su dirección y «Activar»");
    teclear(b.d, campo, "f-pc-2.prueba.ts.net");
    pulsar(b.d, "activar-avisos-pc");
    await hastaQueVirtual(() => pc.de("/avisos/suscribir").length === 1 && config()?.activo === true, 3000);
    const [clave] = pc.de("/avisos/clave");
    const [sus] = pc.de("/avisos/suscribir");
    const opciones = b.espia.suscribir[0];
    const bytes = opciones?.applicationServerKey ? Array.from(new Uint8Array(opciones.applicationServerKey)) : [];
    caso(clave?.url === `${DIRECCION}/avisos/clave` && clave.metodo === "GET" && clave.opciones.credentials === "omit" && clave.opciones.mode === "cors",
      `A2 pide la clave al PC (${clave?.url}), sin cookies`);
    caso(opciones?.userVisibleOnly === true && bytes.length === 65 && bytes[0] === 4 && bytes[64] === 64, "A2 se suscribe con userVisibleOnly y la clave del PC");
    caso(sus?.metodo === "POST" && sus.cuerpo?.suscripcion?.endpoint?.startsWith("https://fcm.googleapis.com/") && sus.cuerpo.suscripcion.keys?.auth === "AuthDeMentira"
      && sus.opciones.headers?.["Content-Type"] === "application/json", "A2 le manda la suscripción al PC");
    caso(config()?.activo === true && config()?.direccion === DIRECCION && config()?.clave === CLAVE_PC && config()?.estado === "bien",
      `A2 queda en gym-beta-avisos-pc (activo, ${config()?.direccion})`);
    caso(textoDe(b.d, "#estado-pc").startsWith("Activos con f-pc-2.prueba.ts.net") && Boolean(b.d.querySelector('[data-accion="probar-avisos-pc"]'))
      && Boolean(b.d.querySelector('[data-accion="desactivar-avisos-pc"]')), `A2 dice «${textoDe(b.d, "#estado-pc")}», con «Probar desde el PC» y «Desactivar»`);
    caso(avisoActual(b.d).startsWith("Avisos desde el PC activados"), `A2 avisa: «${avisoActual(b.d)}»`);
    sinErrores(b, "A2");
    quitar(b);
  }

  // A3 El descanso: pedir al empezar, cambiar con +15 s, quitar en pausa, pedir al seguir y quitar al saltar
  {
    await preparar(await datosBeta({ cambios: cortos(10) }), { "gym-beta-avisos-pc": ACTIVO });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    conSuscripcion(b);
    await marcar(b);
    await hastaQueVirtual(() => pc.de("/avisos/programar").length >= 1, 2000);
    const g = leerJson("gym-beta-descanso");
    const p1 = pc.de("/avisos/programar")[0]?.cuerpo;
    caso(p1?.clave === "descanso" && p1.id === g?.id && p1.titulo === "Te toca la serie 2 de 3" && p1.texto === "Press de pecho tumbado en máquina"
      && p1.en_ms > 9000 && p1.en_ms <= 10000 && p1.suscripcion?.endpoint === b.espia.suscripcion?.endpoint,
    `A3 al empezar el descanso, se le pide el aviso al PC (en ${p1?.en_ms} ms, «${p1?.titulo}» · «${p1?.texto}»)`);
    pulsar(b.d, "descanso-mas15");
    await hastaQueVirtual(() => pc.de("/avisos/programar").length >= 2, 2000);
    const p2 = pc.de("/avisos/programar")[1]?.cuerpo;
    caso(p2?.id === g?.id && p2.en_ms > 23000 && p2.en_ms <= 25000, `A3 +15 s lo cambia (en ${p2?.en_ms} ms)`);
    pulsar(b.d, "descanso-pausa");
    await hastaQueVirtual(() => pc.de("/avisos/cancelar").length >= 1, 2000);
    const c1 = pc.de("/avisos/cancelar")[0]?.cuerpo;
    caso(c1?.clave === "descanso" && c1.suscripcion?.endpoint === p1?.suscripcion?.endpoint && !c1.suscripcion.keys, "A3 en pausa, se quita (solo con la dirección de la suscripción)");
    pulsar(b.d, "descanso-pausa");
    await hastaQueVirtual(() => pc.de("/avisos/programar").length >= 3, 2000);
    caso(pc.de("/avisos/programar")[2]?.cuerpo?.en_ms > 20000, `A3 al seguir, se pide otra vez con lo que queda (${pc.de("/avisos/programar")[2]?.cuerpo?.en_ms} ms)`);
    pulsar(b.d, "descanso-saltar");
    await hastaQueVirtual(() => pc.de("/avisos/cancelar").length >= 2, 2000);
    caso(pc.de("/avisos/cancelar").length === 2 && pc.de("/avisos/programar").length === 3, "A3 Saltar lo quita");
    caso(pc.peticiones.every((p) => p.url.startsWith(`${DIRECCION}/avisos/`) && p.opciones.credentials === "omit"), "A3 todo va a la dirección guardada, sin cookies");
    sinErrores(b, "A3");
    quitar(b);
  }

  // A4 Si el descanso acaba solo, no se quita del PC (el PC ya lo manda)
  {
    await preparar(await datosBeta({ cambios: cortos(5) }), { "gym-beta-avisos-pc": ACTIVO });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    conSuscripcion(b);
    b.espia.permiso = "granted";
    await marcar(b);
    await hastaQueVirtual(() => !b.d.getElementById("capa-fin").hidden, 8000, 100);
    await esperar(5500);
    caso(pc.de("/avisos/programar").length === 1 && pc.de("/avisos/cancelar").length === 0,
      `A4 al acabar solo, no se quita del PC (${pc.de("/avisos/programar").length} pedido, ${pc.de("/avisos/cancelar").length} quitados)`);
    sinErrores(b, "A4");
    quitar(b);
  }

  // A5 Sin PC: se dice una vez y el aviso va como siempre
  {
    await preparar(await datosBeta({ cambios: cortos(5) }), { "gym-beta-avisos-pc": ACTIVO });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    pc.caido = true;
    conSuscripcion(b);
    b.espia.permiso = "granted";
    const textos = anotarAvisos(b);
    await marcar(b);
    b.espia.ocultar();
    await hastaQueVirtual(() => b.espia.notificaciones.some((n) => n.opciones.renotify === true), 9000, 100);
    const fin = b.espia.notificaciones.find((n) => n.opciones.renotify === true);
    caso(config()?.estado === "sin-respuesta" && config()?.activo === true, `A5 sin respuesta del PC, queda apuntado (${config()?.estado})`);
    caso(fin?.titulo === "Te toca la serie 2 de 3" && fin.data?.fin === true && fin.data?.origen === "app" && fin.data?.id === pc.de("/avisos/programar")[0]?.cuerpo?.id,
      "A5 …y el aviso de siempre sale igual (con su data, para no repetirse con el del PC)");
    b.espia.mostrar();
    await hastaQueVirtual(() => textos.includes("El PC no responde: el aviso del descanso va como siempre"), 8000, 100);
    await esperar(5500);
    await marcar(b);
    await esperar(7000);
    const veces = textos.filter((t) => t.startsWith("El PC no responde")).length;
    caso(veces === 1, `A5 «El PC no responde…» sale una sola vez, también con otro descanso (${veces})`);
    sinErrores(b, "A5");
    quitar(b);
  }

  // A6 Si ya llegó el aviso del PC, la app no saca otro al acabar
  {
    await preparar(await datosBeta({ cambios: cortos(5) }), { "gym-beta-avisos-pc": ACTIVO });
    const b = await cargarBeta();
    pcFalso(b);
    conSuscripcion(b);
    b.espia.permiso = "granted";
    await marcar(b);
    b.espia.ocultar();
    await esperar(100);
    const id = leerJson("gym-beta-descanso")?.id;
    // Como lo pondría sw.js: la misma etiqueta, data.fin y el id del descanso.
    const reg = await b.w.navigator.serviceWorker.getRegistration("./");
    await reg.showNotification("Te toca la serie 2 de 3", { tag: "gym-beta-descanso", renotify: true, data: { fin: true, id, origen: "pc" } });
    await esperar(6000);
    const delFinal = b.espia.notificaciones.filter((n) => n.data?.fin);
    caso(delFinal.length === 1 && delFinal[0].data.origen === "pc", `A6 con el aviso del PC ya puesto, la app no saca otro (${delFinal.map((n) => n.data.origen).join(", ") || "ninguno"})`);
    sinErrores(b, "A6");
    quitar(b);
  }

  // A7 El enlace de la página de avisos del PC: abre Ajustes con la dirección puesta, sin activar
  {
    await preparar(await datosBeta());
    const abrir = async (hash) => {
      const f = document.createElement("iframe");
      f.style.width = "412px";
      f.style.height = "915px";
      document.body.append(f);
      await new Promise((r) => { f.onload = r; f.src = `${urlBeta()}${hash}`; });
      await esperarListo(f);
      await esperar(100);
      return f;
    };
    let f = await abrir(`#avisos-pc=${encodeURIComponent(DIRECCION)}`);
    let d = f.contentDocument;
    caso(d.body.dataset.pantalla === "ajustes" && d.getElementById("direccion-pc")?.value === DIRECCION && config()?.activo === false && config()?.direccion === DIRECCION,
      `A7 con el enlace: Ajustes, con la dirección puesta y sin activar (${d.body.dataset.pantalla}, «${d.getElementById("direccion-pc")?.value}»)`);
    caso(!f.contentWindow.location.hash.includes("avisos-pc") && textoDe(d, "#avisos .aviso-texto").startsWith("Dirección del PC puesta"),
      `A7 …la dirección no se queda en la barra (${f.contentWindow.location.hash}) y lo dice`);
    f.remove();
    await preparar(await datosBeta(), { "gym-beta-avisos-pc": ACTIVO });
    f = await abrir(`#avisos-pc=${DIRECCION}`);
    d = f.contentDocument;
    caso(d.body.dataset.pantalla === "ajustes" && config()?.activo === true && textoDe(d, "#avisos .aviso-texto") === "Los avisos desde el PC ya están activos con ese PC.",
      `A7 si ya estaban activos con ese PC, siguen activos y lo dice («${textoDe(d, "#avisos .aviso-texto")}»)`);
    f.remove();
    await preparar(await datosBeta());
    f = await abrir("#avisos-pc=https://malo.example");
    d = f.contentDocument;
    caso(d.body.dataset.pantalla === "entreno" && config() === null, "A7 un enlace con otra dirección no cambia nada");
    f.remove();
  }

  // A8 Lo que no se activa: dirección mala, sin permiso, PC caído y PC que dice que no
  {
    await preparar(await datosBeta());
    const b = await cargarBeta();
    const pc = pcFalso(b);
    b.espia.permiso = "granted";
    pulsar(b.d, "ir-ajustes");
    await esperar(50);
    // Cada intento empieza sin el error del anterior y espera al suyo.
    const activar = async (texto) => {
      teclear(b.d, b.d.getElementById("direccion-pc"), texto);
      b.d.getElementById("error-pc").textContent = "";
      pulsar(b.d, "activar-avisos-pc");
      await hastaQueVirtual(() => textoDe(b.d, "#error-pc") !== "" && Boolean(b.d.querySelector('[data-accion="activar-avisos-pc"]:not([disabled])')), 4000);
    };
    await activar("http://f-pc-2.prueba.ts.net");
    caso(pc.peticiones.length === 0 && textoDe(b.d, "#error-pc").startsWith("Esa dirección no vale") && !config()?.activo,
      `A8 una dirección que no es https de Tailscale no se usa: «${textoDe(b.d, "#error-pc")}»`);
    b.espia.permiso = "denied";
    await activar(DIRECCION);
    caso(pc.peticiones.length === 0 && textoDe(b.d, "#error-pc").startsWith("Hace falta el permiso") && !config()?.activo,
      `A8 sin permiso de notificaciones, no se activa: «${textoDe(b.d, "#error-pc")}»`);
    b.espia.permiso = "granted";
    pc.caido = true;
    await activar(DIRECCION);
    caso(textoDe(b.d, "#error-pc").startsWith("El PC no responde") && !config()?.activo && b.espia.suscribir.length === 0,
      `A8 si el PC no responde, lo dice y no se activa: «${textoDe(b.d, "#error-pc").slice(0, 60)}…»`);
    pc.caido = false;
    pc.respuestas["/avisos/clave"] = { status: 403, json: { ok: false, error: "no-permitido", texto: "desde el propio PC (la tele) no hay botones" } };
    await activar(DIRECCION);
    caso(textoDe(b.d, "#error-pc") === "El PC no lo deja: desde el propio PC (la tele) no hay botones." && !config()?.activo,
      `A8 si el PC dice que no, se dice por qué: «${textoDe(b.d, "#error-pc")}»`);
    delete pc.respuestas["/avisos/clave"];
    b.espia.pushFalla = "NotAllowedError";
    await activar(DIRECCION);
    caso(textoDe(b.d, "#error-pc").startsWith("Hace falta el permiso") && !config()?.activo && pc.de("/avisos/suscribir").length === 0,
      `A8 si el navegador no deja suscribirse, no se activa: «${textoDe(b.d, "#error-pc")}»`);
    sinErrores(b, "A8");
    quitar(b);
  }

  // A9 «Probar desde el PC» y «Desactivar»
  {
    await preparar(await datosBeta({ cambios: cortos(5) }), { "gym-beta-avisos-pc": ACTIVO });
    const b = await cargarBeta();
    const pc = pcFalso(b);
    conSuscripcion(b);
    b.espia.permiso = "granted";
    pulsar(b.d, "ir-ajustes");
    await esperar(50);
    pulsar(b.d, "probar-avisos-pc");
    await hastaQueVirtual(() => pc.de("/avisos/programar").length === 1 && avisoActual(b.d) !== "", 2000);
    const p = pc.de("/avisos/programar")[0]?.cuerpo;
    caso(p?.clave === "prueba" && p.en_ms === 10000 && p.titulo === "Aviso de prueba desde el PC" && p.suscripcion?.endpoint,
      `A9 «Probar desde el PC» pide uno de prueba a los 10 s (${p?.clave}, ${p?.en_ms} ms)`);
    caso(avisoActual(b.d).startsWith("Aviso de prueba pedido"), `A9 …y lo dice: «${avisoActual(b.d)}»`);
    pulsar(b.d, "desactivar-avisos-pc");
    await hastaQueVirtual(() => config()?.activo === false && Boolean(b.d.querySelector('[data-accion="activar-avisos-pc"]')), 2000);
    caso(config()?.activo === false && b.espia.bajas === 1 && b.d.getElementById("direccion-pc")?.value === DIRECCION,
      `A9 «Desactivar» quita la suscripción (${b.espia.bajas}) y deja la dirección para volver a activar`);
    pulsar(b.d, "ir-entreno");
    await esperar(50);
    const antes = pc.peticiones.length;
    await marcar(b);
    await esperar(500);
    caso(pc.peticiones.length === antes, "A9 desactivados, el descanso ya no habla con el PC");
    sinErrores(b, "A9");
    quitar(b);
  }

  // A10 La suscripción perdida o de otra clave se rehace sola al empezar el descanso
  {
    await preparar(await datosBeta({ cambios: cortos(10) }), { "gym-beta-avisos-pc": ACTIVO });
    let b = await cargarBeta();
    let pc = pcFalso(b);
    await marcar(b);
    await hastaQueVirtual(() => pc.de("/avisos/programar").length === 1, 2000);
    caso(b.espia.suscribir.length === 1 && pc.de("/avisos/programar")[0]?.cuerpo?.suscripcion?.endpoint === b.espia.suscripcion?.endpoint,
      "A10 sin suscripción (el navegador la perdió), se rehace sola y se pide el aviso");
    pulsar(b.d, "descanso-saltar");
    await esperar(100);
    quitar(b);
    await preparar(await datosBeta({ cambios: cortos(10) }), { "gym-beta-avisos-pc": ACTIVO });
    b = await cargarBeta();
    pc = pcFalso(b);
    conSuscripcion(b, Uint8Array.from({ length: 65 }, () => 9));
    await marcar(b);
    await hastaQueVirtual(() => pc.de("/avisos/programar").length === 1, 2000);
    const bytes = b.espia.suscribir[0]?.applicationServerKey ? Array.from(new Uint8Array(b.espia.suscribir[0].applicationServerKey)) : [];
    caso(b.espia.bajas === 1 && b.espia.suscribir.length === 1 && bytes[64] === 64, "A10 con una suscripción de otra clave, se quita y se hace con la del PC");
    pulsar(b.d, "descanso-saltar");
    await esperar(100);
    sinErrores(b, "A10");
    quitar(b);
  }
}
