#!/usr/bin/env node
// Convierte un backup exportado desde la app (formato snapshot autocontenido:
// { gymApp: true, version: 1, days: [...] }) en los archivos base publicados
// data/routine.json y data/exercises.json.
//
// Uso:
//   node scripts/apply-backup.mjs <ruta-al-backup.json>
//
// El script no tiene dependencias externas. Reconstruye exercises.json
// deduplicando por exerciseId (conserva el primer name/image/muscleGroup/pr
// que encuentra para cada id, que es el mismo criterio que ya se usaba al
// hornear backups anteriores a mano) y routine.json con solo los campos
// por-día (series/reps/rest), igual que el resto de la app espera.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail("falta la ruta al JSON de backup. Uso: node scripts/apply-backup.mjs <backup.json>");
}

let raw;
try {
  raw = readFileSync(inputPath, "utf8");
} catch (err) {
  fail(`no se pudo leer "${inputPath}": ${err.message}`);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  fail(`el archivo no es JSON válido: ${err.message}`);
}

if (!data || !Array.isArray(data.days) || !data.days.every((d) => d && Array.isArray(d.exercises))) {
  fail('el JSON no tiene el formato esperado (debe tener "days": [{ exercises: [...] }, ...]). ¿Es un backup exportado desde la app?');
}

const exercisesById = new Map();
const routineDays = [];

for (const day of data.days) {
  if (!day.id) fail(`hay un día sin "id" en el backup`);

  const routineExercises = [];
  for (const entry of day.exercises) {
    const { exerciseId, name, image, muscleGroup, pr, series, reps, rest } = entry;
    if (!exerciseId) fail(`día "${day.id}" tiene un ejercicio sin "exerciseId"`);

    if (!exercisesById.has(exerciseId)) {
      const exercise = { id: exerciseId, name: name ?? "", image: image ?? "", muscleGroup: muscleGroup ?? "" };
      if (pr !== null && pr !== undefined && pr !== "") exercise.pr = pr;
      exercisesById.set(exerciseId, exercise);
    }

    routineExercises.push({ exerciseId, series, reps, rest });
  }

  routineDays.push({
    id: day.id,
    label: day.label ?? "",
    title: day.title ?? "",
    subtitle: day.subtitle ?? "",
    exercises: routineExercises,
  });
}

const exercisesJson = [...exercisesById.values()];
const routineJson = { days: routineDays };

const exercisesPath = path.join(repoRoot, "data", "exercises.json");
const routinePath = path.join(repoRoot, "data", "routine.json");

writeFileSync(exercisesPath, JSON.stringify(exercisesJson, null, 2) + "\n", "utf8");
writeFileSync(routinePath, JSON.stringify(routineJson, null, 2) + "\n", "utf8");

console.log(`OK. Escrito:`);
console.log(`  ${path.relative(repoRoot, exercisesPath)} (${exercisesJson.length} ejercicios)`);
console.log(`  ${path.relative(repoRoot, routinePath)} (${routineDays.length} días)`);
console.log("");
console.log("Recuerda:");
console.log("  1. Revisar el diff antes de publicar.");
console.log('  2. Bumpear la versión de caché (?v=N en index.html y CACHE en sw.js).');
console.log("  3. Probar la app localmente si hay dudas.");
