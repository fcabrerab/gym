// Lo que pasa en la app, contado para quien lo quiera oír (hoy, la mascota: D-133). La app lo cuenta y sigue: quien
// escucha no le contesta ni puede cambiar nada de ella ni de tus datos (le llega una copia del detalle). Cada suceso es
// un CustomEvent «gym:<nombre>» en document:
//   serie         { exerciseId, grupo, tipo, kg, reps, marca, primera, grupoSiguiente, descanso }  al apuntar una serie
//                 (✓ Hecha). «grupo», el muscleGroup del ejercicio (o ""); «marca», si bate tu marca; «primera», si con
//                 ella empieza la sesión; «grupoSiguiente», el del ejercicio que toca después; «descanso», sus segundos.
//   fin-sesion    { series, marcas }                                    al terminar y guardar una sesión.
//   mascota       {}                                                    al cambiar los ajustes de la mascota.
// Un suceso nuevo: contarlo donde pasa, apuntarlo aquí y escucharlo donde haga falta.

const PREFIJO = "gym:";

export function contar(nombre, detalle = {}) {
  let copia = {};
  try {
    copia = structuredClone(detalle);
  } catch {
    copia = {};
  }
  document.dispatchEvent(new CustomEvent(PREFIJO + nombre, { detail: copia }));
}

// Escucha un suceso; devuelve cómo dejar de escucharlo. Si quien escucha falla, la app no se entera: el fallo sale
// aparte (como un error suelto de la página, que las pruebas ven).
export function escuchar(nombre, fn) {
  const alSuceder = (ev) => {
    try {
      fn(ev.detail || {});
    } catch (err) {
      setTimeout(() => { throw err; });
    }
  };
  document.addEventListener(PREFIJO + nombre, alSuceder);
  return () => document.removeEventListener(PREFIJO + nombre, alSuceder);
}
