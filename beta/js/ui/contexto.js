// Lo que las pantallas necesitan de app.js sin importarlo (app.js lo rellena al arrancar):
// irA(ruta, modo) cambia de pantalla; repintar() vuelve a pintar la actual; aplicarTema(tema) cambia el tema;
// version dice si hay una versión nueva esperando y cómo recargar; mascota({ renacer }) la pone al día (o la trae, o se
// va) y entrenosMascota() da la copia de tus entrenos que lee para su cuerpo (D-133).
export const ctx = {
  irA: () => {},
  repintar: () => {},
  aplicarTema: () => {},
  pantalla: () => "entreno",
  contextoApunte: () => "",
  mascota: () => {},
  entrenosMascota: () => null,
  version: { nueva: false, recargar: null, controlaElSw: () => false, buscar: null },
};
