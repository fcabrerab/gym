// Utilidades sin efectos: reloj, fechas y formatos en español de España, y lectura tolerante de
// números, descansos y rangos de repeticiones. Nada se ejecuta al importar este módulo.

const HOSTS_LOCALES = ["127.0.0.1", "localhost"];

// Gancho de pruebas: «?ahora=2026-11-03T18:00:00» fija la hora local de arranque y el reloj sigue
// corriendo desde ahí. Solo vale en 127.0.0.1 y localhost; en cualquier otra dirección se ignora.
let gancho;

export function esLocal() {
  return typeof location !== "undefined" && HOSTS_LOCALES.includes(location.hostname);
}

// Lee un parámetro de la dirección solo en local (los ganchos de prueba no existen publicados).
export function parametroLocal(nombre) {
  if (!esLocal()) return null;
  try {
    return new URLSearchParams(location.search).get(nombre);
  } catch {
    return null;
  }
}

export function ahora() {
  if (gancho === undefined) {
    gancho = null;
    const valor = parametroLocal("ahora");
    if (valor) {
      const ms = new Date(valor).getTime();
      if (Number.isFinite(ms)) gancho = { fijado: ms, cargado: Date.now() };
    }
  }
  return gancho ? gancho.fijado + (Date.now() - gancho.cargado) : Date.now();
}

// --- Fechas ---

const dos = (n) => String(n).padStart(2, "0");

// Fecha local «AAAA-MM-DD».
export function fechaLocal(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function diaSemana(ms) {
  return new Date(ms).getDay();
}

function medianoche(ms) {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Días de calendario entre dos instantes (0 = el mismo día).
export function diasEntre(desdeMs, hastaMs) {
  return Math.round((medianoche(hastaMs) - medianoche(desdeMs)) / 86400000);
}

export const NOMBRES_DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const INICIALES_DIA = ["D", "L", "M", "X", "J", "V", "S"];
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // L M X J V S D

const F_CORTA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short" });
const F_DIA_MES = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const F_LARGA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const F_ANIO = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric" });
const F_HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const NUM = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

// Un instante que se puede pasar a fecha (Date admite hasta ±8,64e15 ms). Con datos raros (una copia
// tocada a mano), las fechas que no lo son se enseñan como «—» en vez de romper la pantalla.
export function fechaValida(ms) {
  return typeof ms === "number" && Number.isFinite(ms) && Math.abs(ms) <= 8.64e15;
}

const conFecha = (formato) => (ms) => (fechaValida(ms) ? formato(ms) : "—");

// «mar 3 nov»
export const fechaCorta = conFecha((ms) => F_CORTA.format(ms).replace(",", ""));

// «3 nov»
export const diaMes = conFecha((ms) => F_DIA_MES.format(ms));

// «martes 3 de noviembre»
export const fechaLarga = conFecha((ms) => F_LARGA.format(ms).replace(",", ""));

// «3 nov 2026»
export const fechaConAnio = conFecha((ms) => F_ANIO.format(ms));

// «19:42»
export const hora = conFecha((ms) => F_HORA.format(ms));

// «hoy», «ayer» o «hace 3 días»
export function haceDias(ms, ahoraMs) {
  if (!fechaValida(ms)) return "—";
  const n = diasEntre(ms, ahoraMs);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

// --- Números ---

export function formatoNumero(n) {
  return NUM.format(n);
}

export function formatoKg(n) {
  return n == null ? "" : `${NUM.format(n)} kg`;
}

// «82,5», «82.5» y « 80 » valen; lo demás es null. También acepta números ya hechos.
export function leerNumero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  if (!/^-?\d+(?:[.,]\d+)?$/.test(t)) return null;
  return Number(t.replace(",", "."));
}

export function limitar(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// Redondea a múltiplos de «paso» sin arrastrar errores de coma flotante (82.50000001 → 82.5).
export function redondear(n, paso = 0.5) {
  return Math.round(Math.round(n / paso) * paso * 1000) / 1000;
}

// --- Tiempos ---

// Lee un descanso escrito a mano y devuelve segundos (0-600) o null:
// «1:30», «1'30», «1,30» y «1.30» son 90; «1,5» son 90 (minutos con decimales); «2 min» son 120;
// «90s» son 90; un número suelto de 10 o menos son minutos («2» son 120) y si no, segundos («90»).
export function leerDescanso(valor) {
  const s = leerSegundos(valor);
  return s != null && s <= 600 ? s : null;
}

// Lo mismo que leerDescanso pero sin el tope de 10:00 (para ajustar al límite lo que llega de una copia).
export function leerSegundos(valor) {
  if (valor == null) return null;
  const t = String(valor).trim().toLowerCase();
  let s = null;
  let m;
  if ((m = t.match(/^(\d{1,2})\s*[:']\s*(\d{2})$/))) {
    if (Number(m[2]) <= 59) s = Number(m[1]) * 60 + Number(m[2]);
  } else if ((m = t.match(/^(\d{1,2})[.,](\d{2})$/))) {
    if (Number(m[2]) <= 59) s = Number(m[1]) * 60 + Number(m[2]);
  } else if ((m = t.match(/^(\d{1,2})[.,](\d)$/))) {
    s = Math.round((Number(m[1]) + Number(m[2]) / 10) * 60);
  } else if ((m = t.match(/^(\d+(?:[.,]\d+)?)\s*(?:min|mins|minutos?|m)$/))) {
    s = Math.round(Number(m[1].replace(",", ".")) * 60);
  } else if ((m = t.match(/^(\d+)\s*(?:s|seg|segs|segundos?)$/))) {
    s = Number(m[1]);
  } else if (/^\d+$/.test(t)) {
    const n = Number(t);
    s = n <= 10 ? n * 60 : n;
  }
  return s != null && Number.isFinite(s) && s >= 0 ? s : null;
}

// 90 → «1:30»
export function formatoDescanso(segundos) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${dos(s % 60)}`;
}

// Cuenta atrás: igual que el descanso, pero nunca negativa.
export const formatoCuenta = formatoDescanso;

// 3180 s → «53 min»; 3840 s → «1 h 04 min»; menos de 30 s → «<1 min».
export function formatoMinutos(segundos) {
  const min = Math.round(Math.max(0, segundos) / 60);
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${dos(min % 60)} min`;
}

export function formatoDuracion(ms) {
  return formatoMinutos(ms / 1000);
}

// «8-12» → {min 8, max 12}; «20-45 s/lado» → segundos y por lado; «10» → 10 y 10. Si no se entiende, null.
export function leerRango(valor) {
  if (valor == null) return null;
  const t = String(valor).trim().toLowerCase();
  const m = t.match(/^(\d+)(?:\s*[-–]\s*(\d+))?\s*(s|seg|segs|segundos)?\s*(\/\s*lado|por\s+lado)?$/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] != null ? Number(m[2]) : min;
  if (max < min) return null;
  return { min, max, unidad: m[3] ? "s" : "reps", lado: Boolean(m[4]) };
}

// --- Textos ---

export function sinTildes(texto) {
  return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Texto recortado a «max» caracteres (sin espacios alrededor).
export function recortar(valor, max) {
  const t = valor == null ? "" : String(valor).trim();
  return t.length > max ? t.slice(0, max).trim() : t;
}

// «Martes» → «Mar»; una etiqueta de 5 letras o menos se queda entera («Día 6»).
export function abreviaturaDia(label) {
  const t = String(label ?? "").trim();
  return t.length <= 5 ? t : t.slice(0, 3);
}

// 2 → «2 series»; 1 → «1 serie»
export function plural(n, uno, varios) {
  return `${formatoNumero(n)} ${n === 1 ? uno : varios}`;
}

// 123456 → «121 KB»; 2_200_000 → «2,1 MB»
export function formatoTamano(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${NUM.format(Math.round((bytes / (1024 * 1024)) * 10) / 10)} MB`;
}

// --- Identificadores ---

export function idCorto() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

export function idSesion(ms) {
  return `s-${ms}-${idCorto().slice(0, 4)}`;
}

export function idApunte(ms) {
  return `a-${ms}-${idCorto().slice(0, 4)}`;
}
