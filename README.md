# Gym Routine

PWA estática para consultar y editar una rutina de gimnasio desde móvil.

## Incluye

- Vista de entrenamiento optimizada para móvil
- Editor de rutina desde la propia interfaz
- Persistencia en `localStorage`
- Exportación e importación de datos
- `manifest.json` y `service worker`

## Estructura

- `index.html`
- `styles.css`
- `app.js`
- `data/routine.json`
- `data/exercises.json`
- `images/`

## Publicación

Pensada para GitHub Pages sin backend.

## Actualizar la rutina publicada desde un backup

Cuando quieras que un backup exportado desde la app (botón "Exportar datos") pase a ser la rutina por defecto publicada:

```bash
node scripts/apply-backup.mjs ruta/al/backup.json
```

Esto regenera `data/routine.json` y `data/exercises.json` a partir del backup. Revisa el diff, sube la versión de caché (`?v=N` en `index.html` y `CACHE` en `sw.js`) y publica normalmente.

## Revisión local

Para revisar antes de publicar:

```powershell
.\preview.ps1
```

Luego abre `http://localhost:4173/`.

## Beta (`beta/`)

Versión nueva en pruebas, publicada en `https://fcabrerab.github.io/gym/beta/` junto a la normal (botón «Beta» arriba). Convive con ella en la misma dirección:

- Sus datos van aparte, en claves `gym-beta-…`. La primera vez copia los de la normal y nunca escribe en ellos.
- Tiene su propio service worker y sus cachés `gym-beta-…`; el `sw.js` de la normal no responde a `beta/` ni a `tests/` y solo borra sus cachés `gym-pwa-…`.
- Lo que exporta la beta lo puede importar la normal.

Sus pruebas están en `tests/` y solo se ejecutan en `localhost` o `127.0.0.1`: con `.\preview.ps1`, abre `http://localhost:4173/tests/`.