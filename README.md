# Gym

PWA estática, sin backend, para llevar la rutina del gimnasio desde el móvil: series, descansos, supersets, marcas e
historial. Se publica con GitHub Pages en https://fcabrerab.github.io/gym/ y funciona sin conexión.

## Estructura

- `index.html`, `styles.css`, `manifest.json` e iconos (`icon.svg`, `icono-512.png`, `insignia-512.png`).
- `sw.js`: el service worker. Guarda la app para usarla sin conexión y enseña los avisos de descanso que manda el PC
  (Web Push).
- `js/`: la app, en módulos. `app.js` arranca (es el único que hace algo al importarse); `ui/` son las pantallas.
- `data/routine.json` y `data/exercises.json`: la rutina publicada, la de partida. No pasa por la caché de la app.
- `beta/`: la dirección vieja de la beta. Solo lleva a la app, con lo que traiga detrás, y su `sw.js` quita el service
  worker de la beta que quedara en el móvil.
- `tests/`: las pruebas. Solo corren en `localhost` o `127.0.0.1`: `tests/` (por tandas, con `?solo=…`) y
  `tests/sw.html` (el service worker y la mudanza).
- `scripts/apply-backup.mjs`: pasa un backup a la rutina publicada (abajo).

## De la beta a la app (1.0.0)

Hasta la 0.2.10 convivían dos versiones en la misma dirección: la vieja, en la raíz, y la beta, en `beta/`. Desde la
1.0.0, la beta es la app, en la raíz, y la vieja se retiró (sigue en el historial de git). Para que nada se perdiera:

- Los nombres internos siguen siendo `gym-beta-…` (claves de `localStorage`, cachés y base de copias): los datos no se
  movieron.
- La primera vez que se abre en un móvil sin datos suyos, copia los de la versión vieja (`gym-routine-data-v1`) si los
  hay, sin tocarlos nunca.
- El manifiesto conserva el `start_url` de la vieja (`./index.html`, sin `id`): es la identidad de la app instalada.
- La primera vez, aún manda el service worker de la vieja: el nuevo lo sustituye sin esperar, borra sus cachés y las
  de la beta, y la página se recarga una vez. La hoja de estilos va con `?1` para que el viejo no dé la suya.

## Versiones

Cada cambio sube la versión en tres sitios: `js/version.js` (con sus novedades), `sw.js` y la meta `gym-beta-version`
de `index.html`. Una prueba comprueba que coinciden.

## Actualizar la rutina publicada desde un backup

Cuando quieras que un backup exportado desde la app («Guardar copia») pase a ser la rutina por defecto publicada:

```bash
node scripts/apply-backup.mjs ruta/al/backup.json
```

Esto regenera `data/routine.json` y `data/exercises.json` a partir del backup. Revisa el diff y publica.

## Revisión local

```powershell
.\preview.ps1
```

Luego abre `http://localhost:4173/` (la app) o `http://localhost:4173/tests/` (las pruebas).
