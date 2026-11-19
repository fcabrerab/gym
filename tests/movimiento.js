// Lo de la 1.1.0 (D-122): ordenar arrastrando en Rutina (días y ejercicios, también un superset entero), las flechas
// del superset a su derecha, las transiciones (FLIP y «fantasmas») con y sin «Reducir movimiento», y que cambiar el
// orden a mitad de una sesión no estropea lo ya hecho. La app en un iframe de 412 × 915, manejada desde fuera; el
// dedo y el ratón, con PointerEvent de mentira.

import { HORA, datosBeta } from "./datos.js";

export async function ejecutar(c) {
  const {
    caso, nota, esperar, hastaQueVirtual, limpiarBeta, guardar, leerJson, cargarBeta, quitar, pulsar, existe, textoDe, sinErrores,
  } = c;
  const datosGuardados = () => leerJson("gym-beta-datos");
  const sesionGuardada = () => leerJson("gym-beta-sesion");
  const estadoDe = (d, id) => textoDe(d, `li[data-ej="${id}"] .ej-estado`);
  const { VERSION } = await import("/js/version.js");
  const preparar = async (datos) => {
    await limpiarBeta();
    guardar("gym-beta-datos", datos);
    guardar("gym-beta-ui", { versionVista: VERSION, ayudaSerieVista: true });
  };
  const ir = async (b, pestana) => {
    b.d.querySelector(`#nav [data-accion="ir-${pestana}"]`).click();
    await hastaQueVirtual(() => b.d.body.dataset.pantalla === pestana, 1000);
  };
  const abrirDiaEditor = async (b, id) => {
    await ir(b, "rutina");
    pulsar(b.d, "abrir-dia", id);
    await hastaQueVirtual(() => b.d.querySelector(`.pantalla-rutina[data-dia="${id}"]`), 1000);
  };
  // La rutina como se ve en Rutina: desde la 1.2.0, con lo que aún no se ha guardado (D-123); «Guardar», en su barra.
  const rutina = () => leerJson("gym-beta-borrador")?.datos ?? datosGuardados();
  const ordenDias = () => rutina().dias.map((d) => d.id);
  const ordenEj = (diaId) => rutina().dias.find((d) => d.id === diaId).ejercicios.map((e) => e.exerciseId);
  const guardarRutina = async (b) => {
    pulsar(b.d, "guardar-rutina");
    await esperar(50);
  };
  const filaOrden = (d, clave) => d.querySelector(`[data-orden="${CSS.escape(clave)}"]`);
  const centro = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  // Un PointerEvent como los del móvil (touch) o del ratón (mouse), en el punto dado.
  const puntero = (b, tipo, el, { x, y, id = 7, clase = "touch" }) => {
    el.dispatchEvent(new b.w.PointerEvent(tipo, {
      bubbles: true, cancelable: true, composed: true, pointerId: id, pointerType: clase, isPrimary: true,
      button: tipo === "pointermove" ? -1 : 0, buttons: tipo === "pointerup" || tipo === "pointercancel" ? 0 : 1, clientX: x, clientY: y,
    }));
  };
  const animando = (els) => [...els].filter((el) => el.getAnimations?.().some((a) => a.id === "movimiento" && a.playState === "running")).length;
  const fantasmas = (d) => d.querySelectorAll(".capa-movimiento > .fantasma");
  // Aquí las animaciones no avanzan solas (comun.js, espiar): las que se dejaron correr se acaban a mano y se mira que
  // no quede nada (ni fantasmas ni piezas movidas).
  const quieto = (b) => {
    b.espia.acabarAnimaciones();
    return hastaQueVirtual(() => fantasmas(b.d).length === 0 && animando(b.d.querySelectorAll("#pantalla *")) === 0, 1000);
  };
  // «Reducir movimiento» de mentira: la app lo pregunta con matchMedia cada vez.
  const reducirMovimiento = (b) => {
    const original = b.w.matchMedia.bind(b.w);
    b.w.matchMedia = (q) => (String(q).includes("prefers-reduced-motion")
      ? { matches: String(q).includes("reduce"), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
      : original(q));
  };
  const conSuperset = (d) => {
    const dia = d.dias.find((x) => x.id === "tuesday-push");
    const [a, b2] = dia.ejercicios;
    for (const e of [a, b2]) {
      e.supersetId = "ss-m";
      e.restSuperset = "0:20";
    }
  };

  // M1 Las flechas del superset, a su derecha (como en los demás), y los ejercicios sueltos, en tarjeta.
  {
    await preparar(await datosBeta({ cambios: conSuperset }));
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    const grupo = filaOrden(b.d, "machine-chest-press");
    const tarjeta = grupo?.querySelector(".fila-superset")?.getBoundingClientRect();
    const flechas = grupo?.querySelector(".botones-orden")?.getBoundingClientRect();
    const suelto = filaOrden(b.d, "machine-shoulder-press");
    const fila = suelto?.querySelector('[data-accion="editar-entrada"]');
    const rFila = fila?.getBoundingClientRect();
    caso(Boolean(tarjeta && flechas) && flechas.left >= tarjeta.right && flechas.top > tarjeta.top && flechas.bottom < tarjeta.bottom,
      `M1 las flechas del superset, a la derecha de su tarjeta y a su altura (tarjeta ${Math.round(tarjeta?.left)}–${Math.round(tarjeta?.right)}, flechas desde ${Math.round(flechas?.left)})`);
    caso(Boolean(rFila) && fila.classList.contains("fila") && Math.abs(rFila.width - tarjeta.width) < 1,
      `M1 un ejercicio suelto es una tarjeta («fila») tan ancha como la del superset (${Math.round(rFila?.width)} y ${Math.round(tarjeta?.width)})`);
    const ayudaOrden = textoDe(b.d, ".ayuda-orden");
    caso(ayudaOrden.includes("mantén pulsado") && ayudaOrden.includes("flechas"), `M1 la ayuda dice cómo ordenar: «${ayudaOrden}»`);
    sinErrores(b, "M1");
    quitar(b);
  }

  // M2 Las flechas, con transición: las filas se deslizan (y el foco sigue a la que se mueve). Con «Reducir
  // movimiento», al momento.
  {
    await preparar(await datosBeta({ cambios: conSuperset }));
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    b.espia.dejarAnimar = true;
    pulsar(b.d, "bajar-ejercicio", "machine-chest-press");
    const moviendose = animando(b.d.querySelectorAll("[data-orden]"));
    const foco = b.d.activeElement;
    caso(moviendose >= 2 && ordenEj("tuesday-push").slice(0, 3).join() === "machine-shoulder-press,machine-chest-press,pec-deck",
      `M2 bajar el superset: cambia al momento y ${moviendose} filas deslizándose`);
    caso(foco?.dataset?.accion === "bajar-ejercicio" && foco.dataset.id === "machine-chest-press", "M2 el foco sigue en la flecha del superset movido");
    caso(await quieto(b), "M2 al acabar, nada se queda movido");
    reducirMovimiento(b);
    pulsar(b.d, "subir-ejercicio", "machine-chest-press");
    caso(animando(b.d.querySelectorAll("[data-orden]")) === 0 && ordenEj("tuesday-push")[0] === "machine-chest-press" && !leerJson("gym-beta-borrador"),
      "M2 con «Reducir movimiento», subirlo no anima nada (y, de vuelta a como estaba, no queda nada sin guardar)");
    sinErrores(b, "M2");
    quitar(b);
  }

  // M3 Arrastrar un día con el dedo: mantener pulsado lo levanta, las demás filas se apartan, al soltar se guarda el
  // orden y el clic que pudiera llegar después no abre el día.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await ir(b, "rutina");
    const antes = ordenDias();
    const boton = b.d.querySelector('[data-accion="abrir-dia"][data-id="tuesday-push"]');
    const p0 = centro(boton);
    const destino = centro(filaOrden(b.d, "thursday-pull"));
    puntero(b, "pointerdown", boton, p0);
    await esperar(150);
    const levantadaPronto = filaOrden(b.d, "tuesday-push").classList.contains("arrastrando");
    await esperar(300);
    const levantada = filaOrden(b.d, "tuesday-push").classList.contains("arrastrando");
    caso(!levantadaPronto && levantada, `M3 con el dedo, la fila se levanta al mantenerla pulsada (a los 150 ms: ${levantadaPronto}; a los 450: ${levantada})`);
    puntero(b, "pointermove", boton, { x: p0.x, y: (p0.y + destino.y) / 2 });
    puntero(b, "pointermove", boton, { x: p0.x, y: destino.y + 6 });
    const apartadas = ["wednesday-lower-a", "thursday-pull"].every((id) => filaOrden(b.d, id).style.transform.includes("-"));
    const quieta = filaOrden(b.d, "saturday-lower-b").style.transform === "";
    caso(apartadas && quieta, "M3 al arrastrarla, las dos de debajo suben para dejarle sitio y las demás no se mueven");
    puntero(b, "pointerup", boton, { x: p0.x, y: destino.y + 6 });
    const despues = ordenDias();
    caso(JSON.stringify(despues) === JSON.stringify(["wednesday-lower-a", "thursday-pull", "tuesday-push", ...antes.slice(3)]),
      `M3 al soltarla, el orden nuevo guardado: ${despues.join(", ")}`);
    b.d.elementFromPoint(p0.x, destino.y + 6)?.click();
    await esperar(50);
    caso(b.w.location.hash === "#/rutina", `M3 el clic que llega al soltar no abre el día (${b.w.location.hash})`);
    caso(await quieto(b), "M3 la fila soltada se desliza a su sitio y al poco nada se mueve");
    await esperar(400);
    await guardarRutina(b);
    caso(JSON.stringify(datosGuardados().dias.map((d) => d.id)) === JSON.stringify(despues), "M3 con «Guardar», el orden nuevo queda guardado");
    pulsar(b.d, "abrir-dia", "thursday-pull");
    await esperar(50);
    caso(b.w.location.hash === "#/rutina/dia/thursday-pull", "M3 después, un toque normal abre el día como siempre");
    sinErrores(b, "M3");
    quitar(b);
  }

  // M4 Con el dedo, moverlo enseguida es desplazar la pantalla (no levanta nada); y un toque sigue abriendo el día.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await ir(b, "rutina");
    const antes = ordenDias();
    const boton = b.d.querySelector('[data-accion="abrir-dia"][data-id="tuesday-push"]');
    const p0 = centro(boton);
    puntero(b, "pointerdown", boton, p0);
    await esperar(60);
    puntero(b, "pointermove", boton, { x: p0.x, y: p0.y + 30 });
    await esperar(500);
    puntero(b, "pointerup", boton, { x: p0.x, y: p0.y + 30 });
    caso(!b.d.querySelector(".arrastrando, .ordenando") && JSON.stringify(ordenDias()) === JSON.stringify(antes),
      "M4 mover el dedo antes de tiempo no levanta la fila ni cambia el orden");
    puntero(b, "pointerdown", boton, p0);
    puntero(b, "pointerup", boton, p0);
    boton.click();
    await esperar(50);
    caso(b.w.location.hash === "#/rutina/dia/tuesday-push", "M4 un toque corto abre el día como siempre");
    sinErrores(b, "M4");
    quitar(b);
  }

  // M5 Con el ratón, el arrastre empieza al moverlo con el botón pulsado. Y si se cancela (pointercancel), todo vuelve
  // a su sitio sin guardar nada.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    await ir(b, "rutina");
    const antes = ordenDias();
    let boton = b.d.querySelector('[data-accion="abrir-dia"][data-id="sunday-upper"]');
    let p0 = centro(boton);
    const destino = centro(filaOrden(b.d, "wednesday-lower-a"));
    puntero(b, "pointerdown", boton, { ...p0, clase: "mouse", id: 1 });
    puntero(b, "pointermove", boton, { x: p0.x, y: p0.y - 10, clase: "mouse", id: 1 });
    const levantada = filaOrden(b.d, "sunday-upper").classList.contains("arrastrando");
    puntero(b, "pointermove", boton, { x: p0.x, y: destino.y - 6, clase: "mouse", id: 1 });
    puntero(b, "pointerup", boton, { x: p0.x, y: destino.y - 6, clase: "mouse", id: 1 });
    const despues = ordenDias();
    caso(levantada && JSON.stringify(despues) === JSON.stringify([antes[0], "sunday-upper", ...antes.slice(1, 4)]),
      `M5 con el ratón: se levanta al moverlo y se suelta en su sitio (${despues.join(", ")})`);
    b.d.elementFromPoint(p0.x, destino.y - 6)?.click();
    await esperar(50);
    caso(b.w.location.hash === "#/rutina", "M5 el clic del ratón al soltar no abre el día");
    await quieto(b);
    boton = b.d.querySelector('[data-accion="abrir-dia"][data-id="tuesday-push"]');
    p0 = centro(boton);
    puntero(b, "pointerdown", boton, p0);
    await esperar(450);
    puntero(b, "pointermove", boton, { x: p0.x, y: p0.y + 150 });
    puntero(b, "pointercancel", boton, { x: p0.x, y: p0.y + 150 });
    await esperar(400);
    const limpias = [...b.d.querySelectorAll("[data-orden]")].every((el) => el.style.transform === "" && !el.classList.contains("arrastrando") && !el.classList.contains("volviendo"));
    caso(JSON.stringify(ordenDias()) === JSON.stringify(despues) && limpias && !b.d.querySelector(".ordenando"),
      "M5 si el móvil cancela el gesto, el orden no cambia y las filas vuelven a su sitio");
    sinErrores(b, "M5");
    quitar(b);
  }

  // M6 Arrastrar un superset lo mueve entero (los dos, seguidos y en su orden); y uno suelto se puede poner delante.
  {
    await preparar(await datosBeta({ cambios: conSuperset }));
    const b = await cargarBeta({ ahora: HORA.martes });
    await abrirDiaEditor(b, "tuesday-push");
    let fila = filaOrden(b.d, "machine-chest-press");
    // En medio de la pantalla: cerca de arriba o de abajo, la pantalla se desplazaría sola mientras se espera.
    fila.scrollIntoView({ block: "center" });
    await esperar(50);
    let agarre = fila.querySelector(".fila-superset-etiqueta");
    let p0 = centro(agarre);
    let destino = centro(filaOrden(b.d, "rope-triceps-pushdown"));
    // Al bajar, cambia de puesto cuando su borde de abajo pasa la mitad de otra fila: hasta pasar la de destino (la
    // segunda de debajo) y no la siguiente.
    const dy = destino.y + 8 - fila.getBoundingClientRect().bottom;
    puntero(b, "pointerdown", agarre, p0);
    await esperar(450);
    puntero(b, "pointermove", agarre, { x: p0.x, y: p0.y + 40 });
    puntero(b, "pointermove", agarre, { x: p0.x, y: p0.y + dy });
    puntero(b, "pointerup", agarre, { x: p0.x, y: p0.y + dy });
    const orden = ordenEj("tuesday-push");
    const i = orden.indexOf("machine-chest-press");
    caso(orden[0] === "machine-shoulder-press" && orden[1] === "rope-triceps-pushdown" && i === 2 && orden[3] === "pec-deck",
      `M6 el superset, arrastrado entero: ${orden.slice(0, 5).join(", ")}`);
    caso(rutina().dias.find((d) => d.id === "tuesday-push").ejercicios.filter((e) => e.supersetId === "ss-m").length === 2,
      "M6 los dos siguen unidos en superset");
    await quieto(b);
    fila = filaOrden(b.d, "scaption-dumbbells");
    fila.scrollIntoView({ block: "center" });
    await esperar(50);
    agarre = fila.querySelector('[data-accion="editar-entrada"]');
    p0 = centro(agarre);
    destino = centro(filaOrden(b.d, "machine-shoulder-press"));
    puntero(b, "pointerdown", agarre, p0);
    await esperar(450);
    puntero(b, "pointermove", agarre, { x: p0.x, y: destino.y - 10 });
    puntero(b, "pointerup", agarre, { x: p0.x, y: destino.y - 10 });
    caso(ordenEj("tuesday-push")[0] === "scaption-dumbbells", `M6 un suelto, arrastrado al principio: ${ordenEj("tuesday-push").slice(0, 3).join(", ")}`);
    await esperar(450);
    caso(!b.d.querySelector(".capa-hoja"), "M6 soltar no abre la hoja del ejercicio");
    sinErrores(b, "M6");
    quitar(b);
  }

  // M7 Entreno: al abrir otro ejercicio, la tarjeta que se cierra se repliega (un fantasma, que no se toca) y la nueva
  // se despliega; al poco no queda nada. Con «Reducir movimiento», al momento y sin fantasmas.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    await quieto(b);
    const tarjetas = b.d.querySelectorAll("li.ej").length;
    b.espia.dejarAnimar = true;
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    const f = [...fantasmas(b.d)];
    const capa = b.d.querySelector(".capa-movimiento");
    const sinAcciones = f.every((x) => !x.querySelector("[data-accion], [data-ej], [id]"));
    caso(f.length >= 1 && capa?.inert && capa.getAttribute("aria-hidden") === "true" && sinAcciones,
      `M7 al abrir otro, la tarjeta que se cierra deja un fantasma sin botones, que no se toca ni se lee (${f.length})`);
    caso(animando(b.d.querySelectorAll("li.ej")) >= 1 && b.d.querySelectorAll("li.ej").length === tarjetas,
      "M7 las tarjetas se deslizan y la lista sigue teniendo las mismas");
    caso(b.d.querySelector('li[data-ej="pec-deck"]')?.classList.contains("abierto") && existe(b.d, "serie-hecha", "pec-deck"),
      "M7 mientras, el abierto ya es el nuevo y su ✓ ya está");
    const recortes = [...b.d.querySelectorAll("li.ej")].flatMap((el) => el.getAnimations()).filter((a) => a.id === "movimiento")
      .flatMap((a) => a.effect.getKeyframes()).filter((k) => k.clipPath && k.clipPath !== "none").length;
    caso(recortes >= 2, `M7 la que se abre se despliega (se va descubriendo hacia abajo: ${recortes} pasos con recorte)`);
    caso(await quieto(b), "M7 al acabar, ni fantasmas ni nada movido");
    b.espia.dejarAnimar = true;
    pulsar(b.d, "abrir-ejercicio", "machine-chest-press");
    const hay = fantasmas(b.d).length;
    await esperar(700);
    caso(hay >= 1 && fantasmas(b.d).length === 0, `M7 los fantasmas se quitan solos aunque la animación no llegue a acabar (${hay} → ${fantasmas(b.d).length})`);
    b.espia.acabarAnimaciones();
    reducirMovimiento(b);
    pulsar(b.d, "abrir-ejercicio", "pec-deck");
    caso(fantasmas(b.d).length === 0 && animando(b.d.querySelectorAll("li.ej")) === 0, "M7 con «Reducir movimiento», abrir otro no anima nada");
    sinErrores(b, "M7");
    quitar(b);
  }

  // M8 (lo que faltaba de D-120) A mitad de una sesión, cambiar el orden del día (arrastrando) no estropea lo hecho:
  // las series siguen, el ejercicio abierto también, y lo siguiente va por el orden nuevo.
  {
    await preparar(await datosBeta());
    const b = await cargarBeta({ ahora: HORA.martes });
    const primero = "machine-chest-press";
    pulsar(b.d, "abrir-ejercicio", primero);
    await esperar(50);
    pulsar(b.d, "kg-mas", primero);
    pulsar(b.d, "serie-hecha", primero);
    await esperar(900);
    const hechasAntes = sesionGuardada()?.ejercicios?.[primero]?.length;
    await abrirDiaEditor(b, "tuesday-push");
    const ultimo = ordenEj("tuesday-push").at(-1);
    filaOrden(b.d, primero).scrollIntoView({ block: "center" });
    await esperar(50);
    const agarre = filaOrden(b.d, primero).querySelector('[data-accion="editar-entrada"]');
    const p0 = centro(agarre);
    const destino = centro(filaOrden(b.d, ultimo));
    puntero(b, "pointerdown", agarre, p0);
    await esperar(450);
    puntero(b, "pointermove", agarre, { x: p0.x, y: (p0.y + destino.y) / 2 });
    puntero(b, "pointermove", agarre, { x: p0.x, y: destino.y + 10 });
    puntero(b, "pointerup", agarre, { x: p0.x, y: destino.y + 10 });
    const orden = ordenEj("tuesday-push");
    caso(orden.at(-1) === primero && orden[0] === "pec-deck", `M8 a mitad de la sesión, el primero pasa al final: ${orden.join(", ")}`);
    await esperar(450);
    await guardarRutina(b);
    await ir(b, "entreno");
    await esperar(100);
    const enLista = [...b.d.querySelectorAll(".lista-ej > li.ej")].map((li) => li.dataset.ej);
    const s = sesionGuardada();
    caso(hechasAntes === 1 && s?.ejercicios?.[primero]?.length === 1 && estadoDe(b.d, primero) === "1/3",
      `M8 su serie sigue apuntada (${s?.ejercicios?.[primero]?.length ?? 0}) y se ve «${estadoDe(b.d, primero)}»`);
    caso(enLista.at(-1) === primero && b.d.querySelector(`li[data-ej="${primero}"]`)?.classList.contains("abierto") && s?.actual === primero,
      "M8 en Entreno sale al final, y sigue abierto (es el que se estaba haciendo)");
    for (let i = 0; i < 2; i += 1) {
      pulsar(b.d, "serie-hecha", primero);
      await esperar(900);
    }
    const abierto = b.d.querySelector("li.ej.abierto")?.dataset.ej;
    caso(sesionGuardada()?.ejercicios?.[primero]?.length === 3 && estadoDe(b.d, primero).includes("3/3") && abierto === "pec-deck",
      `M8 al acabarlo, se abre el siguiente por el orden nuevo (el primero de la lista: ${abierto})`);
    sinErrores(b, "M8");
    quitar(b);
  }

  nota("movimiento hecho");
}
