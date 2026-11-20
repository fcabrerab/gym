# La mascota

Un monigote de luz que vive en la app (D-133 del proyecto). Nació como prototipo aparte, en `bocetos/mascota/v3/`, y aquí vive dentro de la app. **Nunca cambia tus datos**: solo mira la pantalla y escucha lo que pasa.

## Las piezas

| Archivo | Qué hace |
|---|---|
| `mascota.js` | Lo junta todo y escucha a la app. La carga `js/app.js` después de arrancar, y solo si está encendida. Si falla, la app sigue igual. |
| `cerebro.js` | **Qué hace** en cada momento. Cuando acaba algo, sortea lo siguiente: cada cosa tiene sus papeletas (`PESOS`) y su carácter las multiplica. Lo que le pasa (una serie, un récord, un toque) se cuela delante. No dibuja: cada `paso(dt)` devuelve un fotograma. |
| `esqueleto.js` | **Cómo se mueve**: medidas, poses en 3D y cinemática. |
| `gestos.js` | Los gestos, solo datos: uno por grupo muscular de la app (`GRUPOS`, con el `muscleGroup` de `data/exercises.json`), más el récord, el saludo y los demás. También las caras (`CARAS`) y los músculos (`MUSCULOS`). |
| `traje-neon.js` | **Cómo se pinta**: tubos de luz con volumen, en un canvas, con el color de su luz (`LUCES`). Otro estilo sería otro traje. |
| `escenario.js` | **Dónde se pone y cuándo se ve**. Sus superficies son el borde de arriba de cada tarjeta y de cada cosa con caja (botones, opciones…), y el de la barra de abajo. En cada una apunta sus tramos «libres», donde de pie no tapa nada: pasea y salta por todas, pero para quedarse quieta busca uno libre. En el entreno usa el rincón de abajo a la derecha, y allí se asoma. Su lienzo, pequeño, va con ella: encima de una tarjeta, pegado a la página (al desplazarla no da tirones); en la barra de abajo, pegado a la pantalla. También lleva los toques. |
| `memoria.js` | **Lo que recuerda**: su ficha, en la clave `gym-beta-mascota`, aparte de tus datos. Guarda sus ajustes, cuándo nació, su semilla, cuándo te vio y cuántas veces la has tocado. Tiene versión: una ficha más nueva no se pisa. Va también en tus copias (`paraCopia()`, en `beta.mascota`) y vuelve al cargar una (`restaurar()`). |
| `forma.js` | **Su cuerpo, de tus entrenos** (la fase 2): la forma de fondo, de gordita a definida, por lo constante que eres con tu rutina (no por los kilos); el bombeo de cada músculo y el general, de las series de las últimas 3 h; y las agujetas, de las de hace uno o dos días. Funciones puras: lee una copia de tus entrenos y no guarda nada (por eso dura aunque cierres la app, y vuelve igual con una copia). |
| `caracter.js` | **Cómo es**: curiosidad, pereza y juego, de 0 a 1, sacados de su semilla. Cambian sus papeletas y cuánto tarda en entrarle sueño. |

Fuera de esta carpeta:
- `js/sucesos.js`: lo que pasa en la app, contado para quien lo quiera oír (`serie`, `fin-sesion`, `preparar`, `mascota`).
- `js/app.js`: la carga y le da lo que lee (`haySesion`, `descanso` y `entrenos`, una copia de tus entrenos para su cuerpo).
- `js/ui/mascota.js`: su sección y su página en Ajustes (`#/ajustes/mascota`), con «Su forma».
- `js/copias.js` y `js/ui/ajustes.js`: su ficha en «Exportar datos» y en la copia del PC, y al cargar una copia (con «Deshacer»).
- `tests/mascota.js`: sus pruebas.

## Cómo vive

- **Con la app abierta**: pinta 30 fotogramas por segundo si se mueve, 20 si está tranquila y 12 si duerme. Si una hoja la tapa, sigue viviendo pero no se pinta.
- **Con la app oculta**: el navegador para los fotogramas, así que no gasta nada.
- **Cuando la pantalla se desplaza**: va con su tarjeta, pegada a la página (la mueve el navegador, sin tirones). Al pararse, se vuelve a mirar dónde hay sitio. Si su tarjeta se ha ido, salta a la más cercana; si está muy lejos, aparece allí fundiéndose.
- **Si la tocas**: se asusta, te saluda y se aparta, para no tapar lo que querías tocar.
- **En el entreno** (en su pantalla y con una sesión en marcha): en la serie, asomada en el rincón. Al apuntar una serie, siente ese músculo (con una marca nueva, la celebra) y, si empieza un descanso, sale (D-135): recupera el aliento, se seca con la toalla y descansa contigo (se sienta, bebe, mira la cuenta atrás) lejos del ejercicio abierto. Su luz se recarga durante el descanso (de 0,35 a 1,3: «recargada»); a los 10 s calienta para el siguiente ejercicio y a los 3 se pone en guardia; al acabar, vuelve al rincón. Si eliges «Escondida», no sale en toda la sesión.
- **Su cuerpo** (`forma.js`, mirado al nacer, al volver a la app, tras cada serie, al terminar y cada 5 min): de fondo, según tu constancia con tu rutina (lo de los últimos 10 días cuenta más; si lo dejas un mes, gordita; una semana de vuelta y se recupera). Cada serie hincha sus músculos y la marca un poco más (el bombeo general); se le pasa en 3 h. Al día siguiente, agujetas suaves: a veces se queja de esa zona (`REGIONES` de `gestos.js`) y, con las piernas cargadas, anda más despacio y salta menos.
- **Los momentos de la sesión** (D-135): al abrir un ejercicio sin sesión en marcha (vas a empezar), calienta ese grupo (como mucho una vez cada 10 min: `calentarAntes()`). Al terminar, lo celebra según cómo fue (`finSesion()`: con una marca nueva, el récord y su trofeo; con todas las series, «¡Sesión completa!»; con el 60 % o más, «¡Bien hecho!»; con menos, «Algo es algo»; siempre contenta), pero cuando cierras el resumen, que la tapa (`vivir()` de `mascota.js`). Con una marca batida hoy entrenando, lleva su trofeo el resto del día (quieta, paseando y sentada) y a ratos presume de él. Si llevas 6 h sin abrir la app, al volver te saluda; y si además llevas días sin entrenar (`llevasDiasSin()` de `forma.js`), te espera dormida, se despierta y se alegra de verte (`bienvenida()`), sin reproches.
- **Sus accesorios** (D-135): en el descanso, la botella y la toalla; en más o menos 6 de cada 10 descansos, imita con una mancuerna pequeña (o dos) el ejercicio de la serie que acabas de hacer (`imitar()`, con `IMITAR` de `gestos.js`: uno por grupo de la app); con una sesión en marcha, lleva una cinta en la cabeza (`cinta`, que pinta `pintarCinta()` de `traje-neon.js`); y el trofeo, con una marca de hoy.
- **«Reducir movimiento»** del móvil: siempre tranquila, sin pasear ni saltar.

## Cómo añadirle cosas

- **Un gesto**: sus cuadros, en `GESTOS` de `gestos.js`. Para que salga solo, añádelo en `elegir()` de `cerebro.js` y dale papeletas en `PESOS`. Para que reaccione a algo, usa `hacerGesto(nombre)`.
- **Un comportamiento** (algo que dure, como pasear o asomarse): una función como `quieto()` o `vigilar()` en `cerebro.js`. Devuelve `{ nombre, actualizar(dt), hecha }`, y `calma: true` si es tranquilo. Añádelo en `elegir()` y en `PESOS` (y en `TRANQUILAS`, si vale en el entreno).
- **Un rasgo de carácter**: en `rasgosDe()` de `caracter.js`, siempre al final (así los rasgos de antes no cambian). Luego en `describir()`, y úsalo en `pesosDe()` o en `suenoDe()`.
- **Un dato de memoria**: en `nueva()`, `sanear()` y `aGuardar()` de `memoria.js` (así va también en las copias). Si cambia la forma de uno que ya hay, sube `VERSION` y añade su paso en `migrar()`. Lo que se pueda sacar de tus entrenos, mejor en `forma.js`, sin guardarlo.
- **Cómo cuenta su cuerpo**: las constantes de `forma.js` (cuánto recuerda tu constancia, cuánto bombea cada serie, cuándo salen las agujetas). Lo que hace con ello, en `cerebro.js` (`cuerpoDe()`, `dolor()`, `caminar()` y `elegir()`).
- **Un suceso de la app**: cuéntalo donde pasa, con `contar()` de `js/sucesos.js`, y apúntalo en su cabecera. Escúchalo en `iniciar()` de `mascota.js`.
- **Un ajuste en su página**: añádelo en `OPCIONES` y `AJUSTES` de `memoria.js`, ponlo en `js/ui/mascota.js` y aplícalo en `ajustar()` de `mascota.js`.
- **Otro traje** (otro estilo): un archivo como `traje-neon.js` con la misma forma (`dibujar(f, origen)`, `medidas()`, `tema`, `luz`, `recorte`).
- **Un accesorio en la mano**: su dibujo, en `pintarObjeto()` de `traje-neon.js`; quien lo lleva lo dice en su salida (`objeto: { tipo, mano }`, o una lista, uno en cada mano), o un gesto con `objeto` en `gestos.js`.

Cada archivo nuevo va en `ARCHIVOS` de `sw.js`, para que funcione sin conexión, y cada cambio sube la versión, como el resto de la app.

## Lo que viene (D-133, D-135)

- Hechas: la fase 1 (viva en la app), el descanso como su momento, la fase 2 (su cuerpo, de tus entrenos; su ficha, en tus copias), los momentos de la sesión (calienta, celebra, su trofeo y la bienvenida) y sus accesorios (la mancuerna con la que imita tu ejercicio y la cinta).
- Después, por este orden: tocarla más, el ritmo del día, la fase 3 y los trajes que se ganan.
- **Fase 3, se adapta a ti**: tu ritmo (te espera los días que sueles ir), cómo la tratas (más confiada si la tocas) y lo que entrenas. Todo moviendo poco a poco sus rasgos, guardados en su ficha.

## Probarla

- Pruebas: `tests/?solo=mascota`.
- Mirarla en local: con `?canal=beta` sale de entrada. Con `?mascota-azar=n`, su azar es siempre el mismo. En local, `window.__gymMascota` dice qué hace y dónde está (y su cuerpo: `forma`, `fondo`, `general`, `musculos`, `dolorida` y `cuerpo`; su `trofeo` y la `celebracionPendiente`), y `avanzar(segundos)` la hace vivir de golpe.
