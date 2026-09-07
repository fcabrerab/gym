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
