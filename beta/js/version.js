// Versión de la beta. La misma VERSION está en ../sw.js y en la meta «gym-beta-version» de ../index.html: cada
// cambio en un archivo de beta/ obliga a subirla en los tres sitios (una prueba de tests/ comprueba que coinciden).
export const VERSION = "0.2.1";
export const FECHA_VERSION = "2026-11-04";

// Novedades por versión, de la más nueva a la más vieja. Se enseñan en Ajustes → Beta → Novedades y, la primera
// vez, en «Qué tiene de nuevo».
export const NOVEDADES = [
  {
    version: "0.2.1",
    fecha: "2026-11-04",
    cambios: [
      "La app se abre en la última versión que elegiste: si pasas a la beta con el botón «Beta», la próxima vez se abre la beta; con «Versión normal», la normal.",
      "Las notificaciones llevan iconos propios: el de la app y, arriba en la barra del móvil, una mancuerna.",
      "La notificación del descanso marca la hora a la que acaba.",
      "Nuevo en Ajustes → Descanso: «Descanso con sonido (aviso más fiable)», apagado de serie. Durante el descanso suena un tic-tac muy suave con el aviso dentro, así que llega a su hora aunque bloquees el móvil, y en la pantalla de bloqueo se ve el descanso con su barra y sus botones.",
      "También en Ajustes → Descanso: qué hacer si el aviso no llega con el móvil bloqueado.",
    ],
  },
  {
    version: "0.2.0",
    fecha: "2026-11-04",
    cambios: [
      "Apunta cada serie con su peso y sus repeticiones; el descanso empieza solo.",
      "Un solo descanso, siempre a la vista abajo, con −15 s, +15 s, pausa y saltar (y «Deshacer» si lo saltas sin querer).",
      "Botón «Descanso» en cada ejercicio para empezarlo cuando quieras.",
      "Abre el día que toca hoy, y al volver a la app te deja en el ejercicio que estabas haciendo.",
      "Historial de sesiones y de marcas, con una gráfica por ejercicio.",
      "Sugerencia de peso según lo que hiciste la última vez ese día.",
      "Copias de seguridad con vista previa, copias automáticas y aviso si la versión normal ha cambiado.",
      "Deshacer al borrar, y un doble toque ya no apunta dos series.",
      "Toca «BETA» arriba para apuntar un fallo o una idea en cualquier momento.",
    ],
  },
];
