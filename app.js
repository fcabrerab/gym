const STORAGE_KEY = "gym-routine-data-v1";
const MODE_KEY = "gym-ui-mode-v1";

const state = {
  base: null,
  custom: loadLocalData(),
  activeDay: "day-1",
  mode: localStorage.getItem(MODE_KEY) || "workout",
};

const els = {
  app: document.getElementById("app"),
  dayNav: document.getElementById("dayNav"),
  workoutModeBtn: document.getElementById("workoutModeBtn"),
  editorModeBtn: document.getElementById("editorModeBtn"),
};

const cardTemplate = document.getElementById("exerciseCardTemplate");

init();

async function init() {
  state.base = await loadJson("./data/routine.json");
  state.exercises = await loadJson("./data/exercises.json");
  ensureLocalShape();
  bindShellEvents();
  render();
  registerServiceWorker();
}

function bindShellEvents() {
  els.workoutModeBtn.addEventListener("click", () => setMode("workout"));
  els.editorModeBtn.addEventListener("click", () => setMode("editor"));
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem(MODE_KEY, mode);
  render();
}

function loadLocalData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

async function loadJson(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  return res.json();
}

function saveLocalData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.custom));
}

function ensureLocalShape() {
  state.custom.exercises ||= {};
  state.custom.days ||= {};
  for (const exercise of state.exercises) {
    state.custom.exercises[exercise.id] ||= {};
  }
  saveLocalData();
}

function getMergedRoutine() {
  const days = state.base.days.map((day) => {
    const dayCustom = state.custom.days[day.id] || {};
    const removed = new Set(dayCustom.removed || []);
    const orderMap = dayCustom.order || {};
    const overrides = dayCustom.exercises || {};
    const added = dayCustom.addedExercises || [];
    const exercises = day.exercises
      .filter((entry) => !removed.has(entry.exerciseId))
      .map((entry, index) => {
        const baseExercise = state.exercises.find((e) => e.id === entry.exerciseId);
        const localExercise = state.custom.exercises[entry.exerciseId] || {};
        const entryOverride = overrides[entry.exerciseId] || {};
        return {
          ...entry,
          ...entryOverride,
          order: orderMap[entry.exerciseId] ?? index,
          exercise: { ...baseExercise, ...localExercise },
        };
      })
      .concat(
        added.map((entry, index) => ({
          exerciseId: entry.exerciseId,
          series: entry.series,
          reps: entry.reps,
          rest: entry.rest,
          order: orderMap[entry.exerciseId] ?? (1000 + index),
          exercise: { ...(state.custom.exercises[entry.exerciseId] || {}), id: entry.exerciseId },
        }))
      )
      .sort((a, b) => a.order - b.order);
    return { ...day, ...dayCustom, exercises };
  });
  return { ...state.base, days };
}

function render() {
  const routine = getMergedRoutine();
  renderDayNav(routine.days);
  els.workoutModeBtn.classList.toggle("active", state.mode === "workout");
  els.editorModeBtn.classList.toggle("active", state.mode === "editor");
  els.workoutModeBtn.setAttribute("aria-pressed", String(state.mode === "workout"));
  els.editorModeBtn.setAttribute("aria-pressed", String(state.mode === "editor"));

  const day = routine.days.find((d) => d.id === state.activeDay) || routine.days[0];
  state.activeDay = day.id;
  if (state.mode === "workout") renderWorkout(day);
  else renderEditor(routine);
}

function renderDayNav(days) {
  els.dayNav.innerHTML = "";
  days.forEach((day) => {
    const btn = document.createElement("button");
    btn.className = `day-btn ${day.id === state.activeDay ? "active" : ""}`;
    btn.type = "button";
    btn.textContent = day.label;
    btn.addEventListener("click", () => {
      state.activeDay = day.id;
      render();
    });
    els.dayNav.appendChild(btn);
  });
}

function renderWorkout(day) {
  els.app.innerHTML = "";
  const section = document.createElement("section");
  section.className = "day-section";
  section.innerHTML = `
    <div class="day-header">
      <div>
        <h2 class="day-title">${day.title}</h2>
        <p class="day-subtitle">${day.subtitle}</p>
      </div>
      <div class="editor-actions">
        <button class="action-btn" id="exportBtn" type="button">Exportar datos</button>
        <button class="action-btn" id="importBtn" type="button">Importar datos</button>
      </div>
    </div>
    <div class="cards" id="cards"></div>
  `;
  els.app.appendChild(section);
  section.querySelector("#exportBtn").addEventListener("click", exportData);
  section.querySelector("#importBtn").addEventListener("click", importData);
  const cards = section.querySelector("#cards");
  day.exercises.forEach(({ exerciseId, series, reps, rest, exercise }) => {
    cards.appendChild(buildWorkoutCard(exercise, series, reps, rest));
  });
}

function buildWorkoutCard(exercise, series, reps, rest) {
  const node = cardTemplate.content.cloneNode(true);
  const img = node.querySelector(".exercise-image");
  const name = node.querySelector(".exercise-name");
  const input = node.querySelector(".pr-input");
  node.querySelector(".series-pill").textContent = `${series} series`;
  node.querySelector(".reps-pill").textContent = reps;
  node.querySelector(".rest-pill").textContent = `Descanso ${rest}`;
  node.querySelector(".muscle-pill").textContent = exercise.muscleGroup;
  img.src = exercise.image;
  img.alt = exercise.name;
  img.loading = "lazy";
  name.textContent = exercise.name;
  input.value = exercise.pr ?? "";
  input.setAttribute("aria-label", `PR actual de ${exercise.name}`);
  input.addEventListener("change", () => updatePr(exercise.id, input.value));
  return node;
}

function renderEditor(routine) {
  els.app.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "editor-panel";
  panel.innerHTML = `
    <div class="day-header">
      <div>
        <h2 class="day-title">Editor</h2>
        <p class="day-subtitle">Edita rutina, orden, imágenes y PR sin tocar código.</p>
      </div>
      <div class="editor-actions">
        <button class="action-btn" id="restoreLocalBtn" type="button">Restaurar datos locales</button>
        <button class="action-btn danger" id="restoreRoutineBtn" type="button">Restaurar rutina base</button>
      </div>
    </div>
    <div class="editor-grid" id="editorGrid"></div>
  `;
  els.app.appendChild(panel);
  panel.querySelector("#restoreLocalBtn").addEventListener("click", restoreLocalData);
  panel.querySelector("#restoreRoutineBtn").addEventListener("click", restoreBaseRoutine);
  const grid = panel.querySelector("#editorGrid");
  routine.days.forEach((day) => {
    const dayBox = document.createElement("div");
    dayBox.className = "editor-item";
    dayBox.innerHTML = `<strong>${day.label} - ${day.title}</strong><span class="muted">${day.subtitle}</span>`;
    day.exercises.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "editor-item";
      row.innerHTML = `
        <div class="editor-row">
          <input data-field="name" value="${escapeHtml(entry.exercise.name)}" placeholder="Nombre">
          <input data-field="series" type="number" min="1" value="${entry.series}">
          <input data-field="reps" value="${escapeHtml(entry.reps)}" placeholder="Repeticiones">
          <input data-field="rest" value="${escapeHtml(entry.rest)}" placeholder="Descanso">
          <input data-field="muscleGroup" value="${escapeHtml(entry.exercise.muscleGroup)}" placeholder="Grupo muscular">
          <input data-field="image" value="${escapeHtml(entry.exercise.image)}" placeholder="Ruta imagen">
          <input data-field="pr" type="number" min="0" step="0.5" value="${entry.exercise.pr ?? ""}" placeholder="PR">
        </div>
        <div class="editor-actions">
          <button class="order-btn" data-action="up" type="button">Subir</button>
          <button class="order-btn" data-action="down" type="button">Bajar</button>
          <button class="order-btn danger" data-action="remove" type="button">Eliminar</button>
        </div>
      `;
      bindEditorRow(row, day.id, entry.exercise.id);
      dayBox.appendChild(row);
    });
    const addBtn = document.createElement("button");
    addBtn.className = "action-btn";
    addBtn.type = "button";
    addBtn.textContent = `Añadir ejercicio a ${day.label}`;
    addBtn.addEventListener("click", () => addExercise(day.id));
    dayBox.appendChild(addBtn);
    grid.appendChild(dayBox);
  });
}

function bindEditorRow(row, dayId, exerciseId) {
  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const field = input.dataset.field;
      const value = input.type === "number" ? Number(input.value) : input.value;
      updateExerciseField(dayId, exerciseId, field, value);
    });
  });
  row.querySelector('[data-action="up"]').addEventListener("click", () => moveExercise(dayId, exerciseId, -1));
  row.querySelector('[data-action="down"]').addEventListener("click", () => moveExercise(dayId, exerciseId, 1));
  row.querySelector('[data-action="remove"]').addEventListener("click", () => removeExercise(dayId, exerciseId));
}

function updatePr(exerciseId, value) {
  state.custom.exercises[exerciseId] = { ...(state.custom.exercises[exerciseId] || {}), pr: value === "" ? "" : Number(value) };
  saveLocalData();
  render();
}

function updateExerciseField(dayId, exerciseId, field, value) {
  const dayCustom = state.custom.days[dayId] ||= {};
  const overrides = dayCustom.exercises ||= {};
  const current = overrides[exerciseId] ||= {};
  current[field] = value;
  if (field === "name" || field === "muscleGroup" || field === "image" || field === "pr") {
    state.custom.exercises[exerciseId] = { ...(state.custom.exercises[exerciseId] || {}), [field]: value };
  }
  saveLocalData();
  render();
}

function moveExercise(dayId, exerciseId, delta) {
  const dayCustom = state.custom.days[dayId] ||= {};
  const orderMap = dayCustom.order ||= {};
  const visible = getMergedRoutine().days.find((d) => d.id === dayId).exercises
    .map((entry, index) => ({ id: entry.exerciseId, order: orderMap[entry.exerciseId] ?? index, fallback: index }))
    .sort((a, b) => a.order - b.order);
  const index = visible.findIndex((entry) => entry.id === exerciseId);
  const target = index + delta;
  if (target < 0 || target >= visible.length) return;
  const temp = visible[index].order;
  visible[index].order = visible[target].order;
  visible[target].order = temp;
  visible.forEach((item, idx) => { orderMap[item.id] = idx; });
  saveLocalData();
  render();
}

function removeExercise(dayId, exerciseId) {
  const dayCustom = state.custom.days[dayId] ||= {};
  const removed = dayCustom.removed ||= [];
  const added = dayCustom.addedExercises ||= [];
  const addedIndex = added.findIndex((entry) => entry.exerciseId === exerciseId);
  if (addedIndex >= 0) {
    added.splice(addedIndex, 1);
    delete (dayCustom.order || {})[exerciseId];
  } else if (!removed.includes(exerciseId)) {
    removed.push(exerciseId);
  }
  saveLocalData();
  render();
}

function addExercise(dayId) {
  const id = `custom-${crypto.randomUUID()}`;
  const newExercise = {
    id,
    name: "Nuevo ejercicio",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    muscleGroup: "Grupo muscular",
  };
  state.custom.exercises[id] = newExercise;
  const dayCustom = state.custom.days[dayId] ||= {};
  dayCustom.addedExercises ||= [];
  dayCustom.addedExercises.push({ exerciseId: id, series: 3, reps: "8-12", rest: "2:00" });
  saveLocalData();
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.custom, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gym-local-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    state.custom = JSON.parse(await file.text());
    ensureLocalShape();
    render();
  };
  input.click();
}

function restoreLocalData() {
  state.custom = {};
  ensureLocalShape();
  render();
}

function restoreBaseRoutine() {
  const preservedPrs = state.custom.exercises || {};
  state.custom = { exercises: preservedPrs, days: {} };
  ensureLocalShape();
  render();
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
