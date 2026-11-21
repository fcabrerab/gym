// Versión de la app. La misma VERSION está en ../sw.js y en la meta «gym-beta-version» de ../index.html: cada
// cambio en un archivo de la app obliga a subirla en los tres sitios (una prueba de tests/ comprueba que coinciden).
// Hasta la 0.2.10 fue la beta, en beta/; desde la 1.0.0, es la app, en la dirección de siempre (D-121).
export const VERSION = "1.3.8";
export const FECHA_VERSION = "2026-11-21";

// Novedades por versión, de la más nueva a la más vieja. Se enseñan en Ajustes → La app → Novedades y, la primera
// vez, en «Qué tiene de nuevo».
export const NOVEDADES = [
  {
    version: "1.3.8",
    fecha: "2026-11-21",
    cambios: [
      "La mascota se deja coger: mantenla pulsada y se sube a tu dedo. Llévala adonde quieras (va haciendo equilibrios) y, al soltarla, cae en lo que haya debajo y se sacude. Mientras la llevas, la pantalla no se mueve.",
      "Con dos toques seguidos, salta de alegría; con tres o más, le haces cosquillas. Con uno, como siempre: se asusta y te saluda (en el descanso, choca los cinco).",
    ],
  },
  {
    version: "1.3.7",
    fecha: "2026-11-20",
    cambios: [
      "La mascota entiende el grupo muscular de tus ejercicios aunque lo escribas a tu manera: con o sin tildes y mayúsculas, con sinónimos (pectorales, glúteos, pantorrillas…) o en otro idioma (chest, shoulders, quads…). Si no lo entiende, te mira, como antes.",
    ],
  },
  {
    version: "1.3.6",
    fecha: "2026-11-20",
    cambios: [
      "La mascota tiene una mancuerna pequeña: en el descanso, a veces imita el ejercicio que acabas de hacer (un curl, un press, una sentadilla…), con su cara de esfuerzo.",
      "Y mientras entrenas, lleva una cinta en la cabeza; al terminar la sesión, se la quita.",
    ],
  },
  {
    version: "1.3.5",
    fecha: "2026-11-20",
    cambios: [
      "La mascota vive los momentos de tu entreno: cuando abres un ejercicio para empezar, calienta contigo; al terminar, lo celebra según cómo fue (todas las series, casi todas o unas pocas: siempre contenta), y lo ves al cerrar el resumen.",
      "Si bates una marca, saca un trofeo y lo lleva el resto del día (y a ratos presume de él).",
      "Si llevas días sin entrenar, al volver te espera dormida: se despierta y se alegra de verte, sin reproches. Y cuando vuelves tras unas horas, te saluda.",
    ],
  },
  {
    version: "1.3.4",
    fecha: "2026-11-20",
    cambios: [
      "La mascota tiene tu forma: su cuerpo sale de lo constante que eres con tu rutina (no de los kilos), de gordita a muy definida. Si lo dejas, se ablanda poco a poco; al volver, se recupera rápido.",
      "En cada entreno se marca un poco más, y los músculos que trabajas se le hinchan: el bombeo le dura unas horas, aunque cierres la app. Al día siguiente, alguna agujeta suave: a veces se queja, y con las piernas cargadas anda más despacio.",
      "Su ficha va en tus copias («Exportar datos» y la del PC): al cargar una, vuelve ella, con su nombre y su carácter. En su página, «Su forma» dice cómo está y por qué.",
    ],
  },
  {
    version: "1.3.3",
    fecha: "2026-11-20",
    cambios: [
      "La mascota ya no se queda calentando sin parar: calienta con movimientos distintos (los brazos, las rodillas, el tronco) y para en cuanto se acaba el descanso.",
      "Su tronco, rehecho: la cadera, más ancha, y la barriga, a la altura de la tripa.",
      "Ya no aparece de golpe en otro sitio: si la app vuelve a pintar su tarjeta, o la mueve al desplegar otra, sigue en ella.",
    ],
  },
  {
    version: "1.3.2",
    fecha: "2026-11-20",
    cambios: [
      "El descanso es el momento de la mascota: tras sentir la serie, recupera el aliento y se seca el sudor; luego descansa contigo (se sienta, bebe agua, mira cuánto queda) lejos del ejercicio abierto.",
      "Su luz se recarga durante el descanso, como una batería: sin mirar el reloj, ves cuánto te queda; al llenarse, brilla más que nunca. En los últimos 10 segundos calienta para el siguiente ejercicio y a los 3 se pone en guardia.",
      "Al empezar la serie vuelve a asomarse abajo, para no distraerte. Y si la tocas en el descanso, choca los cinco.",
    ],
  },
  {
    version: "1.3.1",
    fecha: "2026-11-20",
    cambios: [
      "La mascota se mueve por toda la pantalla: pasea y salta de tarjeta en tarjeta y sobre los botones, y para quedarse quieta busca un sitio donde no estorbe. Si su tarjeta se va al desplazarte, salta a otra.",
      "Ya no da tirones al desplazar la pantalla: va pegada a ella. Y si la tocas, se asusta, te saluda y se aparta.",
      "Brilla más y tiene sombra; en su página (Ajustes → Mascota → «Personalizarla») eliges cuánto brilla.",
    ],
  },
  {
    version: "1.3.0",
    fecha: "2026-11-20",
    cambios: [
      "Llega la mascota: un monigote de luz que vive en la app. Pasea por encima de las tarjetas, donde no tapa nada; se sienta, se esconde y se asoma, y si no pasa nada, se duerme. Tócala y verás.",
      "Siente cada serie: al apuntarla, ese músculo se le enciende un rato. Y celebra tus marcas.",
      "En el entreno se queda quieta, asomada abajo a la derecha, para no estorbar (o escondida, si lo prefieres).",
      "Tiene su página en Ajustes → Mascota: encenderla o apagarla, su nombre, su tamaño, el color de su luz y qué hace en el entreno. Su carácter le viene de nacimiento. Vive solo en este móvil, en una ficha suya: nunca cambia tus datos.",
    ],
  },
  {
    version: "1.2.1",
    fecha: "2026-11-20",
    cambios: [
      "Cuando hay una beta con cosas nuevas para probar, arriba, junto al nombre, sale «BETA ›», y en Ajustes → La app, «Probar la beta»: te llevan a ella. La beta usa tus mismos datos; para volver, toca «BETA» allí.",
    ],
  },
  {
    version: "1.2.0",
    fecha: "2026-11-19",
    cambios: [
      "En Rutina, los cambios ya no se guardan al momento: en cuanto cambias algo, abajo sale una barra con «Cancelar» y «Guardar». «Guardar» los guarda; «Cancelar» lo deja todo como estaba (y aún puedes deshacerlo).",
      "La hoja de cada ejercicio trae «Cancelar» y «Guardar» en vez de «Hecho». Si la cierras con cambios (con la X, Atrás o tocando fuera), te pregunta antes. Abierta desde Entreno, «Guardar» lo guarda al momento.",
      "Si sales de Rutina con cambios sin guardar, te pregunta si guardarlos o descartarlos. Y si el móvil cierra la app a mitad, no se pierden: Entreno te los recuerda, con «Revisar» y «Descartar».",
      "Añadir, duplicar y eliminar un día siguen siendo al momento; con cambios sin guardar, antes te pregunta qué hacer con ellos.",
    ],
  },
  {
    version: "1.1.0",
    fecha: "2026-11-18",
    cambios: [
      "En Rutina, el orden se cambia también arrastrando: mantén pulsado un día o un ejercicio y muévelo adonde quieras (cerca de arriba o de abajo, la pantalla se desplaza sola). Las flechas siguen ahí.",
      "Las flechas de un superset van a su derecha, como en los demás ejercicios; y los ejercicios sueltos vuelven a verse como tarjetas.",
      "Transiciones cortas en vez de saltos: al cambiar el orden, las filas se deslizan; y en Entreno, al abrir o cerrar un ejercicio, la tarjeta se despliega o se repliega. Si en el móvil tienes «Reducir movimiento» (o «Quitar animaciones»), nada se mueve.",
    ],
  },
  {
    version: "1.0.0",
    fecha: "2026-11-17",
    cambios: [
      "La beta pasa a ser la app del gimnasio, en la dirección de siempre (sin «beta» al final). La versión vieja se retira; tus datos siguen aquí, como estaban.",
      "El botón «BETA» de arriba es ahora un lápiz: sirve igual para apuntar un fallo o una idea desde cualquier pantalla.",
      "Fuera lo que comparaba con la versión vieja («Ver qué cambia», «Volver a copiar…» y su aviso). Tus datos de la versión vieja se quedan en el móvil, sin tocar.",
      "Si tenías los avisos desde el PC o la copia en el PC, siguen solos: no hay que volver a activarlos.",
    ],
  },
  {
    version: "0.2.10",
    fecha: "2026-11-16",
    cambios: [
      "El texto de la barra de descanso, si no cabe, ya no va de un lado a otro: ahora, al volver al principio, es un corte (no una vuelta hacia la derecha, que iba al revés de cómo se lee).",
    ],
  },
  {
    version: "0.2.9",
    fecha: "2026-11-15",
    cambios: [
      "Si el texto de la barra de descanso no cabe, ahora se mueve, como en un reproductor antiguo: una pausa, un paseo hasta el final, otra pausa y vuelta (con «Reducir movimiento» no se mueve, se queda con los puntos suspensivos).",
      "Quitada una raya que sobraba entre los enlaces de abajo (Editar…) y el separador de un superset.",
    ],
  },
  {
    version: "0.2.8",
    fecha: "2026-11-15",
    cambios: [
      "Los supersets, rehechos: los dos ejercicios van en una sola tarjeta, uno debajo del otro a toda la anchura (nada de dos columnas estrechas), con el descanso corto como separador entre ellos.",
      "En Entreno esa tarjeta no cambia al hacerlos: el que estás haciendo se expande dentro de ella, con sus controles, y el otro se queda al lado, replegado; nunca se separan.",
    ],
  },
  {
    version: "0.2.7",
    fecha: "2026-11-15",
    cambios: [
      "Supersets: en la hoja de un ejercicio, «Unir con otro ejercicio en superset…» los junta para hacerlos intercalados (una serie de uno, una del otro). Se ven lado a lado, con un descanso corto entre los dos (ajustable, 0:30 de base) y el de siempre al completar la pareja.",
      "Al reordenar en Rutina, el superset se mueve entero; «Separar el superset» lo deshace.",
      "En Entreno, el descanso corto cambia al otro ejercicio; el de siempre, al volver a empezar ronda.",
    ],
  },
  {
    version: "0.2.6",
    fecha: "2026-11-08",
    cambios: [
      "Las dos luces del aro ya no se cruzan: dan vueltas en el mismo sentido, a media vuelta una de otra, persiguiéndose; cada una con la cabeza blanca delante y la cola cian, azul y morada.",
      "Al abrir un ejercicio o marcar una serie dan una vuelta deprisa y luego siguen a su paso.",
    ],
  },
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
