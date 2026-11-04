// Lo que las pantallas necesitan de app.js sin importarlo (app.js lo rellena al arrancar):
// irA(ruta, modo) cambia de pantalla; repintar() vuelve a pintar la actual; aplicarTema(tema) cambia el tema;
// version dice si hay una versión nueva esperando y cómo recargar.
export const ctx = {
  irA: () => {},
  repintar: () => {},
  aplicarTema: () => {},
  pantalla: () => "entreno",
  contextoApunte: () => "",
  version: { nueva: false, recargar: null, controlaLaBeta: () => false, buscar: null },
};
