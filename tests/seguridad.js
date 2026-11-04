// Seguridad (casos S1-S5 y más): palabras prohibidas en el código, CSP, XSS, versión, rutas, prefijo gym-beta-
// y que la beta nunca toca las claves de la normal.

import { datosBeta } from "./datos.js";

const PROHIBIDAS = [
  ["innerHTML", /innerHTML/],
  ["outerHTML =", /outerHTML\s*=/],
  ["insertAdjacentHTML", /insertAdjacentHTML/],
  ["document.write", /document\.write/],
  ["eval(", /\beval\s*\(/],
  ["new Function", /new\s+Function\b/],
  ["alert(", /\balert\s*\(/],
  ["confirm(", /\bconfirm\s*\(/],
  ["prompt(", /\bprompt\s*\(/],
  ["localStorage.clear", /localStorage\.clear/],
  ["caches.match(", /caches\.match\s*\(/],
  ["setAttribute(\"style\"", /setAttribute\(\s*["']style["']/],
  ["atributo style en HTML", /<[a-z][^>]*\sstyle\s*=/i],
  ["manejador en atributo", /<[a-z][^>]*\son[a-z]+\s*=/i],
];

// media-src con blob: es para el «Descanso con sonido» (un WAV hecho en la página, desde una URL de Blob).
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

export async function ejecutar(c) {
  const { caso, nota, esperar, limpiarBeta, guardar, cargarBeta, quitar, textoDe, sinErrores, leerNormal } = c;
  const texto = (ruta) => fetch(ruta, { cache: "no-store" }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${ruta}: ${r.status}`))));

  const sw = await texto("/beta/sw.js");
  const bloque = sw.match(/const ARCHIVOS = \[([\s\S]*?)\];/)?.[1] || "";
  const archivos = [...bloque.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const rutas = [...new Set(archivos.map((a) => (a === "./" ? "/beta/" : `/beta/${a.replace(/^\.\//, "")}`)))];
  const textos = {};
  for (const r of [...rutas, "/beta/sw.js"]) textos[r] = await texto(r);

  // S1 palabras prohibidas
  const hallazgos = [];
  for (const [ruta, t] of Object.entries(textos)) {
    for (const [nombre, re] of PROHIBIDAS) if (re.test(t)) hallazgos.push(`${ruta}: ${nombre}`);
  }
  caso(hallazgos.length === 0 && Object.keys(textos).length >= 20, `S1 ninguna palabra prohibida en ${Object.keys(textos).length} archivos${hallazgos.length ? ` (${hallazgos.join("; ")})` : ""}`);

  // ARCHIVOS lista todo beta/ (el servidor local enseña el contenido de las carpetas sin index.html)
  const listar = async (carpeta) => {
    const html = await texto(carpeta);
    return [...html.matchAll(/href="([^"?#]+)"/g)].map((m) => decodeURIComponent(m[1])).filter((h) => !h.endsWith("/") && !h.startsWith("."));
  };
  const enDisco = [
    ...["index.html", "styles.css", "manifest.json", "icon.svg"].map((f) => `/beta/${f}`),
    ...(await listar("/beta/js/")).map((f) => `/beta/js/${f}`),
    ...(await listar("/beta/js/ui/")).map((f) => `/beta/js/ui/${f}`),
  ];
  const faltan = enDisco.filter((r) => !rutas.includes(r));
  caso(faltan.length === 0 && rutas.includes("/beta/") && rutas.includes("/beta/index.html"), `ARCHIVOS de sw.js lista todo beta/ (${rutas.length} entradas)${faltan.length ? `; faltan ${faltan.join(", ")}` : ""}`);

  // S2 CSP
  const indice = textos["/beta/index.html"];
  const csp = indice.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
  caso(csp === CSP, `S2 index.html lleva la CSP${csp === CSP ? "" : `: «${csp}»`}`);

  // S4 la misma versión
  const { VERSION } = await import("/beta/js/version.js");
  const versionSw = sw.match(/const VERSION = "([^"]+)"/)?.[1];
  caso(versionSw === VERSION, `S4 VERSION de sw.js (${versionSw}) igual a la de js/version.js (${VERSION})`);
  const versionHtml = indice.match(/<meta name="gym-beta-version" content="([^"]+)"/)?.[1];
  caso(versionHtml === VERSION, `S4 la meta gym-beta-version de index.html (${versionHtml}) es la misma (${VERSION})`);
  const { NOVEDADES } = await import("/beta/js/version.js");
  caso(NOVEDADES[0]?.version === VERSION, `S4 las novedades empiezan por la versión actual (${NOVEDADES[0]?.version})`);

  // S5 sin «/gym/» a fuego
  const conGym = Object.entries(textos).filter(([, t]) => t.includes("/gym/")).map(([r]) => r);
  caso(conGym.length === 0, `S5 ningún archivo de beta/ tiene /gym/ a fuego${conGym.length ? ` (${conGym.join(", ")})` : ""}`);

  // Manifiesto
  const manifiesto = JSON.parse(textos["/beta/manifest.json"]);
  caso(manifiesto.name === "Gym Beta" && manifiesto.start_url === "./" && manifiesto.scope === "./" && !("id" in manifiesto), "El manifiesto es «Gym Beta», con start_url y scope «./» y sin id");

  // Prefijo: almacen.js se niega a escribir o borrar claves sin gym-beta-
  const almacen = await import("/beta/js/almacen.js");
  const antesNormal = leerNormal();
  let negadas = 0;
  for (const clave of ["gym-routine-data-v1", "gym-theme-v1", "otra-cosa"]) {
    try {
      almacen.escribir(clave, "x");
    } catch {
      negadas += 1;
    }
    try {
      almacen.borrar(clave);
    } catch {
      negadas += 1;
    }
  }
  caso(negadas === 6 && JSON.stringify(leerNormal()) === JSON.stringify(antesNormal) && localStorage.getItem("otra-cosa") === null,
    `almacen.js se niega a escribir y a borrar claves sin gym-beta- (${negadas} de 6)`);
  localStorage.setItem("otra-app-de-pages", "no tocar");
  localStorage.setItem("gym-beta-prueba", "x");
  const preferidaAntes = localStorage.getItem("gym-beta-preferida");
  localStorage.setItem("gym-beta-preferida", "beta");
  almacen.borrarTodoBeta();
  caso(localStorage.getItem("otra-app-de-pages") === "no tocar" && localStorage.getItem("gym-beta-prueba") === null && JSON.stringify(leerNormal()) === JSON.stringify(antesNormal),
    "borrarTodoBeta borra solo las claves gym-beta-");
  caso(localStorage.getItem("gym-beta-preferida") === "beta", "borrarTodoBeta no borra la versión elegida (gym-beta-preferida)");
  if (preferidaAntes === null) localStorage.removeItem("gym-beta-preferida"); else localStorage.setItem("gym-beta-preferida", preferidaAntes);
  localStorage.removeItem("otra-app-de-pages");

  // S3 XSS: un título de día con HTML sale como texto
  {
    await limpiarBeta();
    window.__xss = 0;
    const datos = await datosBeta();
    datos.dias[0].title = '<img src="/no-existe-xss.png" onerror="parent.__xss=(parent.__xss||0)+1">Push';
    datos.ejercicios["machine-chest-press"].name = "<b>Press</b><script>parent.__xss=9<\/script>";
    guardar("gym-beta-datos", datos);
    const b = await cargarBeta();
    await esperar(300);
    caso(!window.__xss && textoDe(b.d, ".titulo-dia").startsWith("<img") && !b.d.querySelector("#pantalla img[src*='no-existe-xss']"),
      `S3 un título con HTML sale como texto y no se ejecuta (${window.__xss || 0} ejecuciones; título «${textoDe(b.d, ".titulo-dia").slice(0, 40)}», listo ${b.listo}, pantalla ${b.d.body.dataset.pantalla})`);
    sinErrores(b, "S3");
    quitar(b);
  }

  // La CSP de verdad: un script en línea metido en la página no corre
  {
    await limpiarBeta();
    guardar("gym-beta-datos", await datosBeta());
    const b = await cargarBeta();
    window.__cspInline = 0;
    const s = b.d.createElement("script");
    s.textContent = "parent.__cspInline = 1";
    b.d.body.append(s);
    await esperar(50);
    caso(window.__cspInline === 0, "La CSP bloquea los scripts en línea dentro de la beta");
    quitar(b);
  }
  nota(`archivos revisados: ${rutas.length}`);
}
