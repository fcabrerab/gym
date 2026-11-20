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
| `memoria.js` | **Lo que recuerda**: su ficha, en la clave `gym-beta-mascota`, aparte de tus datos. Guarda sus ajustes, cuándo nació, su semilla, cuándo te vio y cuántas veces la has tocado. Tiene versión: una ficha más nueva no se pisa. |
| `caracter.js` | **Cómo es**: curiosidad, pereza y juego, de 0 a 1, sacados de su semilla. Cambian sus papeletas y cuánto tarda en entrarle sueño. |

Fuera de esta carpeta:
- `js/sucesos.js`: lo que pasa en la app, contado para quien lo quiera oír (`serie`, `fin-sesion`, `mascota`).
- `js/ui/mascota.js`: su sección y su página en Ajustes (`#/ajustes/mascota`).
- `tests/mascota.js`: sus pruebas.

## Cómo vive

- **Con la app abierta**: pinta 30 fotogramas por segundo si se mueve, 20 si está tranquila y 12 si duerme. Si una hoja la tapa, sigue viviendo pero no se pinta.
- **Con la app oculta**: el navegador para los fotogramas, así que no gasta nada.
- **Cuando la pantalla se desplaza**: va con su tarjeta, pegada a la página (la mueve el navegador, sin tirones). Al pararse, se vuelve a mirar dónde hay sitio. Si su tarjeta se ha ido, salta a la más cercana; si está muy lejos, aparece allí fundiéndose.
- **Si la tocas**: se asusta, te saluda y se aparta, para no tapar lo que querías tocar.
- **En el entreno** (en su pantalla y con una sesión en marcha): se pone tranquila en el rincón (o se esconde, si así lo eliges). Al apuntar una serie, siente ese músculo. Con una marca nueva, la celebra.
- **«Reducir movimiento»** del móvil: siempre tranquila, sin pasear ni saltar.

## Cómo añadirle cosas

- **Un gesto**: sus cuadros, en `GESTOS` de `gestos.js`. Para que salga solo, añádelo en `elegir()` de `cerebro.js` y dale papeletas en `PESOS`. Para que reaccione a algo, usa `hacerGesto(nombre)`.
- **Un comportamiento** (algo que dure, como pasear o asomarse): una función como `quieto()` o `vigilar()` en `cerebro.js`. Devuelve `{ nombre, actualizar(dt), hecha }`, y `calma: true` si es tranquilo. Añádelo en `elegir()` y en `PESOS` (y en `TRANQUILAS`, si vale en el entreno).
- **Un rasgo de carácter**: en `rasgosDe()` de `caracter.js`, siempre al final (así los rasgos de antes no cambian). Luego en `describir()`, y úsalo en `pesosDe()` o en `suenoDe()`.
- **Un dato de memoria**: en `nueva()`, `sanear()` y `guardar()` de `memoria.js`. Si cambia la forma de uno que ya hay, sube `VERSION` y añade su paso en `migrar()`.
- **Un suceso de la app**: cuéntalo donde pasa, con `contar()` de `js/sucesos.js`, y apúntalo en su cabecera. Escúchalo en `iniciar()` de `mascota.js`.
- **Un ajuste en su página**: añádelo en `OPCIONES` y `AJUSTES` de `memoria.js`, ponlo en `js/ui/mascota.js` y aplícalo en `ajustar()` de `mascota.js`.
- **Otro traje** (otro estilo): un archivo como `traje-neon.js` con la misma forma (`dibujar(f, origen)`, `medidas()`, `tema`, `luz`, `recorte`).

Cada archivo nuevo va en `ARCHIVOS` de `sw.js`, para que funcione sin conexión, y cada cambio sube la versión, como el resto de la app.

## Lo que viene (D-133)

- **Fase 2, su cuerpo refleja tu forma**:
  - La forma de fondo, de gordito a definido, según lo constante que seas con tu rutina. Saldrá de tus sesiones, que ella solo lee.
  - El bombeo de cada entreno, que dura unas horas y se guarda en su ficha. Con agujetas al día siguiente que se noten poco.
  - Su ficha, también en «Exportar datos» y en la copia del PC.
- **Fase 3, se adapta a ti**: tu ritmo (te espera los días que sueles ir), cómo la tratas (más confiada si la tocas) y lo que entrenas. Todo moviendo poco a poco sus rasgos, guardados en su ficha.

## Probarla

- Pruebas: `tests/?solo=mascota`.
- Mirarla en local: con `?canal=beta` sale de entrada. Con `?mascota-azar=n`, su azar es siempre el mismo. En local, `window.__gymMascota` dice qué hace y dónde está, y `avanzar(segundos)` la hace vivir de golpe.
