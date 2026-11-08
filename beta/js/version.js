// Versión de la beta. La misma VERSION está en ../sw.js y en la meta «gym-beta-version» de ../index.html: cada
// cambio en un archivo de beta/ obliga a subirla en los tres sitios (una prueba de tests/ comprueba que coinciden).
export const VERSION = "0.2.5";
export const FECHA_VERSION = "2026-11-08";

// Novedades por versión, de la más nueva a la más vieja. Se enseñan en Ajustes → Beta → Novedades y, la primera
// vez, en «Qué tiene de nuevo».
export const NOVEDADES = [
  {
    version: "0.2.5",
    fecha: "2026-11-08",
    cambios: [
      "El aro de luz, rehecho: ahora son dos luces blancas con la punta de colores (cian, azul y morado) que dan vueltas en sentidos contrarios y se cruzan, con el aro oscuro entre ellas.",
      "Al abrir un ejercicio o marcar una serie, las dos salen juntas de arriba, deprisa, y luego siguen a su paso.",
    ],
  },
  {
    version: "0.2.4",
    fecha: "2026-11-07",
    cambios: [
      "Prueba de aspecto: lo elegido brilla con un aro de luz de colores. El ejercicio abierto lo lleva girando despacio y da una vuelta rápida al abrirlo y al marcar cada serie.",
      "En Ajustes, los interruptores al encenderlos y las opciones al elegirlas dan una vuelta de luz; también «Sesiones» y «Ejercicios» en Historial.",
      "Si el móvil tiene activado «Reducir movimiento», el aro no gira.",
    ],
  },
  {
    version: "0.2.3",
    fecha: "2026-11-07",
    cambios: [
      "Nuevo en Ajustes → Copia de seguridad: «Copia en el PC». Al acabar cada entreno, la beta manda sola una copia de tus datos a tu PC de casa; si no puede (sin Tailscale en el móvil o con el PC apagado), lo vuelve a intentar al abrirla.",
      "Usa la dirección del PC de «Avisos desde el PC» y viene encendida. Con «Mandar una copia ahora» la mandas cuando quieras.",
      "Mientras el PC tenga una copia con lo último, no sale el aviso de guardar copia.",
    ],
  },
  {
    version: "0.2.2",
    fecha: "2026-11-05",
    cambios: [
      "Nuevo en Ajustes → Descanso: «Avisos desde el PC». Tu PC de casa lleva la cuenta del descanso y te manda el aviso a su hora, aunque bloquees el móvil y sin pausar tu música. Hace falta Tailscale activo en el móvil y el PC encendido.",
      "Se activa una vez con la dirección de tu PC (o con el enlace de su página de avisos) y «Probar desde el PC» manda uno de prueba a los 10 s.",
      "Si el PC no responde, el aviso va como siempre.",
    ],
  },
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
