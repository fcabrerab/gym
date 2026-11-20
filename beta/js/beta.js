// ¿Hay una beta? (D-124, D-134). La app normal mira, al arrancar, si en beta/ hay una app más nueva que ella: si la
// hay, arriba sale «BETA ›» y en Ajustes → La app, «Probar la beta», que llevan a ella. Sin beta en marcha, beta/ solo
// lleva a la app (no tiene js/version.js) y no sale nada; sin conexión, tampoco. La beta, en cambio, no mira nada:
// ella lleva a la normal (app.js, marcarBeta()).

import { VERSION } from "./version.js";

let encontrada = null;

// «1.3.0» frente a «1.2.1», número a número: más de 0 si a es más nueva, 0 si es la misma y menos de 0 si es más vieja.
export function compararVersiones(a, b) {
  const pa = String(a).split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// Busca la beta (su js/version.js, que solo trae datos). Devuelve { version, cambios } o null.
export async function buscar() {
  try {
    const m = await import("../beta/js/version.js");
    if (typeof m.VERSION === "string" && compararVersiones(m.VERSION, VERSION) > 0) {
      const cambios = Array.isArray(m.NOVEDADES?.[0]?.cambios) ? m.NOVEDADES[0].cambios : [];
      encontrada = { version: m.VERSION, cambios };
    }
  } catch {
    encontrada = null; // sin beta en marcha, o sin conexión
  }
  return encontrada;
}

export function disponible() {
  return encontrada;
}
