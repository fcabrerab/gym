// Copias de seguridad: exportar en el formato que importa la normal (más la clave «beta»), leer una copia con
// validación y vista previa sin tocar nada, aplicarla, y las copias automáticas en IndexedDB (gym-beta-copias).

import { VERSION } from "./version.js";
import {
  ESQUEMA, AJUSTES_NORMAL, LIMITES, TIPOS, normalizarAjustes, normalizarIncremento, normalizarEjercicio, normalizarMarca,
  sesionValida, marcaValida, apunteValido, normalizarApunte, apartarRaros, completarSesion,
} from "./modelo.js";
import { fusionarComoLaNormal, datosDesdeSnapshot, cargarBase, sanear } from "./normal.js";
import { fechaLocal, recortar, diasEntre } from "./util.js";

const esObjeto = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const dos = (n) => String(n).padStart(2, "0");

export const TEXTO_NO_PARECE = "Este archivo no parece una copia del gimnasio.";
export const TEXTO_FORMA_RARA = "Este archivo no se puede cargar: tiene datos con una forma que la beta no entiende.";

// --- Exportar ---

export function construirExportacion(datos, ahoraMs) {
  const a = datos.ajustes;
  const exportacion = {
    gymApp: true,
    version: 1,
    exportedAt: new Date(ahoraMs).toISOString(),
    settings: {
      timerAlert: a.timerAlert !== false,
      timerSound: a.timerSound !== false,
      timerNotification: a.timerNotification !== false,
      transitionMinutes: Number(a.transitionMinutes) || 0,
    },
    days: datos.dias.map((d) => ({
      id: d.id,
      label: d.label,
      title: d.title,
      subtitle: d.subtitle ?? "",
      exercises: d.ejercicios.map((e) => {
        const x = datos.ejercicios[e.exerciseId] || {};
        return {
          exerciseId: e.exerciseId,
          name: x.name ?? "",
          image: x.image ?? "",
          muscleGroup: x.muscleGroup ?? "",
          pr: x.pr ?? null,
          series: e.series,
          reps: e.reps,
          rest: e.rest,
        };
      }),
    })),
    beta: {
      esquema: ESQUEMA,
      version: VERSION,
      ajustes: {
        tema: a.tema,
        vibracion: a.vibracion,
        pantallaEncendida: a.pantallaEncendida,
        descansoAlMarcar: a.descansoAlMarcar,
        descansoConSonido: a.descansoConSonido === true,
        segundosPorSerie: a.segundosPorSerie,
        recordatorioCopiaDias: a.recordatorioCopiaDias,
      },
      ejercicios: Object.fromEntries(Object.entries(datos.ejercicios).map(([id, x]) => [id, {
        name: x.name, image: x.image, muscleGroup: x.muscleGroup, pr: x.pr ?? null, tipo: x.tipo, incremento: x.incremento, notas: x.notas,
      }])),
      dias: Object.fromEntries(datos.dias.map((d) => [d.id, { diasSemana: d.diasSemana }])),
      sesiones: datos.sesiones,
      marcas: datos.marcas,
      apuntes: datos.apuntes,
    },
  };
  if (datos.descartado?.length) exportacion.beta.descartado = datos.descartado;
  return exportacion;
}

// «gym-beta-copia-2026-11-04-1930.json», con la fecha local.
export function nombreArchivo(ahoraMs) {
  const d = new Date(ahoraMs);
  return `gym-beta-copia-${fechaLocal(ahoraMs)}-${dos(d.getHours())}${dos(d.getMinutes())}.json`;
}

function descargar(texto, nombre) {
  const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { metodo: "descargada", nombre };
}

// Comparte el archivo (menú de compartir) o, si no se puede, lo descarga. Se llama dentro del mismo clic y
// sin esperar nada antes de compartir (si no, el navegador no deja abrir el menú).
// Devuelve una promesa con {metodo: "compartida" | "descargada" | null, nombre, cancelado?}.
export function guardarCopia(datos, ahoraMs, { forzarDescarga = false } = {}) {
  const texto = JSON.stringify(construirExportacion(datos, ahoraMs), null, 2);
  const nombre = nombreArchivo(ahoraMs);
  let archivo = null;
  try {
    archivo = new File([texto], nombre, { type: "application/json" });
  } catch {
    archivo = null;
  }
  let sePuede = false;
  try {
    sePuede = !forzarDescarga && Boolean(archivo) && typeof navigator.share === "function" && Boolean(navigator.canShare?.({ files: [archivo] }));
  } catch {
    sePuede = false;
  }
  if (sePuede) {
    return navigator.share({ files: [archivo], title: "Copia de Gym Beta" })
      .then(() => ({ metodo: "compartida", nombre }))
      .catch((err) => (err?.name === "AbortError" ? { metodo: null, cancelado: true, nombre } : descargar(texto, nombre)));
  }
  return Promise.resolve(descargar(texto, nombre));
}

// ¿Deja este navegador compartir una copia (.json) con el menú de compartir? Chrome de Android no deja compartir
// archivos .json: allí la copia se descarga (y Ajustes lo dice así).
export function puedeCompartirCopias() {
  try {
    const prueba = new File(["{}"], "copia.json", { type: "application/json" });
    return typeof navigator.share === "function" && Boolean(navigator.canShare?.({ files: [prueba] }));
  } catch {
    return false;
  }
}

// --- Importar ---

function esDiffAntiguo(v) {
  const objetos = ["exercises", "days"].filter((k) => v[k] !== undefined);
  const listas = ["daysAdded", "daysRemoved", "dayOrder"].filter((k) => v[k] !== undefined);
  if (objetos.length + listas.length === 0) return false;
  return objetos.every((k) => esObjeto(v[k])) && listas.every((k) => Array.isArray(v[k]));
}

const contar = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// Lee y valida una copia (File, Blob o texto) sin tocar nada. Devuelve {ok: false, error} o
// {ok: true, tipo, datosNuevos, resumen, avisos, traeHistorial, traeAjustesBeta}.
// opciones: actuales (datos de la beta, para conservar tipo, incremento y notas), ahoraMs y cargar (la rutina publicada).
export async function leerCopia(archivo, { actuales = null, ahoraMs = Date.now(), cargar = cargarBase } = {}) {
  let texto;
  try {
    const tamano = typeof archivo === "string" ? new Blob([archivo]).size : archivo.size;
    if (tamano > LIMITES.archivoBytes) return { ok: false, error: "El archivo es demasiado grande (más de 5 MB)." };
    texto = typeof archivo === "string" ? archivo : await archivo.text();
  } catch {
    return { ok: false, error: "No se ha podido leer el archivo." };
  }
  let v;
  try {
    v = JSON.parse(texto);
  } catch {
    return { ok: false, error: "Este archivo no se puede leer: no es un JSON válido." };
  }
  if (!esObjeto(v)) return { ok: false, error: TEXTO_NO_PARECE };
  try {
    if (Array.isArray(v.days)) return leerExportacion(v, { actuales, ahoraMs });
    if (esDiffAntiguo(v)) return await leerDiff(v, { actuales, ahoraMs, cargar });
  } catch (err) {
    // Solo los errores pensados para la persona salen tal cual; los técnicos (en inglés), con un texto fijo.
    return { ok: false, error: err?.paraLaPersona ? err.message : TEXTO_FORMA_RARA };
  }
  return { ok: false, error: TEXTO_NO_PARECE };
}

const unir = (partes) => (partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0] || "");

function leerExportacion(v, { actuales, ahoraMs }) {
  if (v.days.length === 0) return { ok: false, error: "La copia no trae ningún día." };
  for (const dia of v.days) {
    if (!esObjeto(dia) || typeof dia.id !== "string" || !dia.id.trim()) return { ok: false, error: "La copia tiene un día sin identificador." };
  }
  for (const dia of v.days) {
    const lista = Array.isArray(dia.exercises) ? dia.exercises : [];
    if (lista.some((e) => !esObjeto(e) || typeof e.exerciseId !== "string" || !e.exerciseId.trim())) {
      return { ok: false, error: `La copia tiene un ejercicio sin identificador (día ${recortar(dia.label, 20) || dia.id}).` };
    }
  }
  const beta = esObjeto(v.beta) ? v.beta : null;
  if (beta && Number(beta.esquema) > ESQUEMA) {
    return { ok: false, error: "Esta copia es de una versión más nueva de la beta. Actualiza la beta y vuelve a intentarlo." };
  }
  const avisos = [];
  if (esObjeto(v.settings)) {
    const raras = Object.keys(v.settings).filter((k) => !AJUSTES_NORMAL.includes(k) && k !== "includeTransitionTime");
    if (raras.length) avisos.push(`Se ignoran ajustes que no se conocen: ${raras.join(", ")}.`);
  }
  const traeEjerciciosBeta = Boolean(beta && esObjeto(beta.ejercicios));
  const { datos, resumen } = datosDesdeSnapshot(v, {
    origen: "importado", ahoraMs, modo: "importar", tema: actuales?.ajustes?.tema ?? "auto",
    bibliotecaActual: traeEjerciciosBeta ? null : actuales?.ejercicios ?? null, avisosPrevios: avisos,
  });
  let traeHistorial = false;
  let traeAjustesBeta = false;
  const raros = { sesiones: 0, marcas: 0, apuntes: 0 };
  if (beta) {
    if (esObjeto(beta.ajustes)) {
      const normales = Object.fromEntries(AJUSTES_NORMAL.map((k) => [k, datos.ajustes[k]]));
      datos.ajustes = { ...normalizarAjustes({ ...datos.ajustes, ...beta.ajustes }), ...normales };
      traeAjustesBeta = true;
    }
    if (traeEjerciciosBeta) {
      for (const [id, x] of Object.entries(beta.ejercicios)) {
        if (!esObjeto(x)) continue;
        if (datos.ejercicios[id]) {
          const e = datos.ejercicios[id];
          if (TIPOS.includes(x.tipo)) e.tipo = x.tipo;
          e.incremento = normalizarIncremento(x.incremento);
          e.notas = recortar(x.notas, LIMITES.notas);
        } else {
          datos.ejercicios[id] = normalizarEjercicio({ ...x, id });
        }
      }
    }
    if (esObjeto(beta.dias)) {
      for (const dia of datos.dias) {
        const ds = beta.dias[dia.id]?.diasSemana;
        if (Array.isArray(ds)) dia.diasSemana = [...new Set(ds.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))];
      }
    }
    if (Array.isArray(beta.sesiones) || Array.isArray(beta.marcas)) {
      traeHistorial = true;
      // Lo que tiene forma rara no se carga, pero tampoco se pierde: va a «descartado» (y se exporta otra vez).
      const descartado = [];
      datos.sesiones = apartarRaros(beta.sesiones, sesionValida, "sesion", descartado)
        .map((s) => completarSesion(structuredClone(s))).sort((a, b) => a.inicio - b.inicio);
      raros.sesiones = descartado.length;
      const marcas = apartarRaros(beta.marcas, marcaValida, "marca", descartado);
      raros.marcas = descartado.length - raros.sesiones;
      // Las marcas de la copia mandan; si un ejercicio no tiene ninguna, se apunta la que trae su día.
      const conMarca = new Set(marcas.map((m) => m.exerciseId));
      for (const x of Object.values(datos.ejercicios)) {
        if (x.pr != null && !conMarca.has(x.id)) marcas.push({ exerciseId: x.id, kg: x.pr, fecha: ahoraMs, motivo: "importada" });
      }
      datos.marcas = marcas;
      for (const [id, x] of Object.entries(datos.ejercicios)) {
        const ultima = [...marcas].reverse().find((m) => m.exerciseId === id);
        x.pr = ultima ? normalizarMarca(ultima.kg) : null;
      }
      datos.apuntes = apartarRaros(beta.apuntes, apunteValido, "apunte", descartado).map(normalizarApunte);
      raros.apuntes = descartado.length - raros.sesiones - raros.marcas;
      datos.descartado = [...(Array.isArray(beta.descartado) ? beta.descartado : []), ...descartado];
      const partes = [];
      if (raros.sesiones) partes.push(contar(raros.sesiones, "sesión", "sesiones"));
      if (raros.marcas) partes.push(contar(raros.marcas, "cambio de marca", "cambios de marca"));
      if (raros.apuntes) partes.push(contar(raros.apuntes, "apunte", "apuntes"));
      if (partes.length) datos.origen.avisos.push(`${unir(partes)} con datos raros no se cargan; se guardan aparte.`);
    }
  }
  return {
    ok: true,
    tipo: beta ? "beta" : "normal",
    datosNuevos: datos,
    avisos: datos.origen.avisos,
    traeHistorial,
    traeAjustesBeta,
    raros,
    resumen: {
      fecha: typeof v.exportedAt === "string" ? v.exportedAt : null,
      de: beta ? "beta" : "versión normal",
      ...resumen,
      sesiones: traeHistorial ? datos.sesiones.length : null,
    },
  };
}

// Un diff antiguo tiene que traer algo que se reconozca de la rutina publicada (un día o un ejercicio que existen,
// o días añadidos, quitados u ordenados). Si no, casi seguro es otro archivo (y cargarlo lo dejaría todo de serie).
function pareceDiff(v, base) {
  const dias = new Set(base.rutina.days.map((d) => d.id));
  const ejercicios = new Set(base.ejercicios.map((e) => e.id));
  if (Array.isArray(v.daysAdded) && v.daysAdded.some((d) => esObjeto(d) && typeof d.id === "string" && d.id)) return true;
  if (Array.isArray(v.daysRemoved) && v.daysRemoved.some((id) => dias.has(id))) return true;
  if (Array.isArray(v.dayOrder) && v.dayOrder.some((id) => dias.has(id))) return true;
  if (esObjeto(v.days) && Object.keys(v.days).some((id) => dias.has(id))) return true;
  return esObjeto(v.exercises) && Object.keys(v.exercises).some((id) => ejercicios.has(id));
}

async function leerDiff(v, { actuales, ahoraMs, cargar }) {
  let base;
  try {
    base = await cargar();
  } catch {
    return { ok: false, error: "Para cargar este tipo de copia hace falta conexión." };
  }
  const avisos = [];
  // Las formas raras (p. ej. «removed: 7») se quitan con su aviso, como al copiar la normal: así no salen errores
  // técnicos en inglés.
  const limpio = sanear(v, avisos, "de la copia");
  if (!pareceDiff(limpio, base)) return { ok: false, error: TEXTO_NO_PARECE };
  const snap = fusionarComoLaNormal(limpio, base.rutina, base.ejercicios);
  const usados = new Set(snap.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  const conocidos = new Set(base.ejercicios.map((e) => e.id));
  const sobran = Object.keys(esObjeto(limpio.exercises) ? limpio.exercises : {}).filter((id) => !conocidos.has(id) && !usados.has(id));
  if (sobran.length) {
    const lista = sobran.slice(0, 3).join(", ") + (sobran.length > 3 ? ", …" : "");
    avisos.push(`Se ignoran ${contar(sobran.length, "dato", "datos")} de ejercicios que ya no existen (${lista}).`);
  }
  const publicada = fusionarComoLaNormal({}, base.rutina, base.ejercicios);
  const sinCambios = JSON.stringify(snap) === JSON.stringify(publicada);
  const { datos, resumen } = datosDesdeSnapshot(snap, {
    origen: "importado", ahoraMs, modo: "importar", ejerciciosBase: base.ejercicios,
    tema: actuales?.ajustes?.tema ?? "auto", bibliotecaActual: actuales?.ejercicios ?? null, avisosPrevios: avisos,
  });
  return {
    ok: true,
    tipo: "diff",
    datosNuevos: datos,
    avisos: datos.origen.avisos,
    traeHistorial: false,
    traeAjustesBeta: false,
    sinCambios,
    raros: { sesiones: 0, marcas: 0, apuntes: 0 },
    resumen: { fecha: null, de: "copia antigua", ...resumen, sesiones: null },
  };
}

// Aplica una copia leída sobre los datos actuales (puro). Sin historial en la copia, se conservan el historial,
// las marcas (con una entrada «importada» por cada marca que cambie), los apuntes y los ajustes propios de la beta.
export function aplicarCopia(actuales, leida, ahoraMs) {
  const d = structuredClone(leida.datosNuevos);
  if (actuales) {
    if (!leida.traeHistorial) {
      d.sesiones = structuredClone(actuales.sesiones);
      d.marcas = structuredClone(actuales.marcas);
      d.apuntes = structuredClone(actuales.apuntes);
      d.descartado = structuredClone(actuales.descartado || []);
      for (const [id, x] of Object.entries(d.ejercicios)) {
        const antes = actuales.ejercicios[id]?.pr ?? null;
        if ((x.pr ?? null) !== antes) d.marcas.push({ exerciseId: id, kg: x.pr ?? null, fecha: ahoraMs, motivo: "importada" });
      }
      for (const [id, x] of Object.entries(actuales.ejercicios)) {
        if (!d.ejercicios[id]) d.ejercicios[id] = structuredClone(x);
      }
    }
    if (!leida.traeAjustesBeta) {
      for (const k of Object.keys(d.ajustes)) {
        if (!AJUSTES_NORMAL.includes(k) && actuales.ajustes[k] !== undefined) d.ajustes[k] = actuales.ajustes[k];
      }
    }
    d.copia = structuredClone(actuales.copia);
    d.creado = actuales.creado;
  }
  d.origen = { tipo: "importado", fecha: ahoraMs, avisos: leida.avisos };
  return d;
}

// --- Recordatorio de copia ---

// Texto del aviso si toca guardar una copia (o null): sin copia, solo cuando ya hay alguna sesión; con copia,
// si tiene más de «recordatorioCopiaDias» días y hay cambios desde entonces. «Más tarde» lo pospone.
export function necesitaCopia(datos, ahoraMs, posponerHasta = null) {
  if (!datos) return null;
  if (posponerHasta && ahoraMs < posponerHasta) return null;
  const dias = datos.ajustes?.recordatorioCopiaDias ?? 7;
  const ultima = datos.copia?.ultima ?? null;
  if (ultima == null) return datos.sesiones.length > 0 ? "Aún no has guardado ninguna copia de la beta." : null;
  if (!(datos.actualizado > ultima)) return null;
  const n = diasEntre(ultima, ahoraMs);
  if (n <= dias) return null;
  return `Hace ${n} días que no guardas una copia de la beta.`;
}

// --- Copias automáticas (IndexedDB) ---

const NOMBRE_BD = "gym-beta-copias";
const ALMACEN = "copias";
export const MAX_COPIAS_AUTO = 10;
let conexion = null;

function abrirBd() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Sin IndexedDB"));
  if (!conexion) {
    conexion = new Promise((resolver, rechazar) => {
      const r = indexedDB.open(NOMBRE_BD, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(ALMACEN)) r.result.createObjectStore(ALMACEN, { keyPath: "id", autoIncrement: true });
      };
      r.onsuccess = () => {
        const bd = r.result;
        // Si otra pestaña (o una prueba) quiere borrar la base, se cierra la conexión para no bloquearla.
        bd.onversionchange = () => { bd.close(); conexion = null; };
        resolver(bd);
      };
      r.onerror = () => rechazar(r.error);
      r.onblocked = () => rechazar(new Error("Base bloqueada"));
    });
    conexion.catch(() => { conexion = null; });
  }
  return conexion;
}

function pedir(bd, modo, accion) {
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const r = accion(tx.objectStore(ALMACEN));
    let valor;
    if (r) r.onsuccess = () => { valor = r.result; };
    tx.oncomplete = () => resolver(valor);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
}

export function resumenCorto(datos) {
  const n = datos?.sesiones?.length ?? 0;
  const dias = datos?.dias?.length ?? 0;
  return `${contar(dias, "día", "días")} · ${contar(n, "sesión", "sesiones")}`;
}

// Guarda una copia automática. Espera como mucho «espera» ms y devuelve true si llegó a guardarse.
// Nunca lanza: si IndexedDB falla, devuelve false.
export function guardarCopiaAuto(datos, motivo, ahoraMs, { espera = 2000 } = {}) {
  let texto;
  try {
    texto = typeof datos === "string" ? datos : JSON.stringify(datos);
  } catch {
    return Promise.resolve(false);
  }
  const resumen = typeof datos === "string" ? "datos en texto" : resumenCorto(datos);
  const trabajo = (async () => {
    const bd = await abrirBd();
    await pedir(bd, "readwrite", (s) => s.add({ fecha: ahoraMs, motivo, resumen, version: VERSION, datos: texto }));
    const claves = await pedir(bd, "readonly", (s) => s.getAllKeys());
    if (claves.length > MAX_COPIAS_AUTO) {
      const sobran = claves.slice(0, claves.length - MAX_COPIAS_AUTO);
      await pedir(bd, "readwrite", (s) => { sobran.forEach((k) => s.delete(k)); return null; });
    }
    return true;
  })().catch(() => false);
  return Promise.race([trabajo, new Promise((r) => setTimeout(() => r(false), espera))]);
}

// Las copias automáticas, de la más nueva a la más vieja (sin los datos, para listar).
export async function listarCopiasAuto() {
  const bd = await abrirBd();
  const todas = await pedir(bd, "readonly", (s) => s.getAll());
  return (todas || []).map(({ datos, ...resto }) => ({ ...resto, bytes: datos?.length ?? 0 })).sort((a, b) => b.id - a.id);
}

export async function leerCopiaAuto(id) {
  const bd = await abrirBd();
  return pedir(bd, "readonly", (s) => s.get(id));
}

export async function copiasAutoFuncionan() {
  try {
    await abrirBd();
    return true;
  } catch {
    return false;
  }
}
