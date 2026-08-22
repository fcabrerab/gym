const STORAGE_KEY = "gym-routine-data-v1";
const MODE_KEY = "gym-ui-mode-v1";
const THEME_KEY = "gym-theme-v1";
const CACHE_BUSTER = "v2";

const state = {
  base: null,
  custom: loadLocalData(),
  activeDay: localStorage.getItem("gym-active-day-v1") || null,
  mode: localStorage.getItem(MODE_KEY) || "workout",
  theme: localStorage.getItem(THEME_KEY) || "dark",
};

const els = {
  app: document.getElementById("app"),
  dayNav: document.getElementById("dayNav"),
  modeToggleBtn: document.getElementById("modeToggleBtn"),
  themeLightBtn: document.getElementById("themeLightBtn"),
  themeDarkBtn: document.getElementById("themeDarkBtn"),
  timerAlertSetting: document.getElementById("timerAlertSetting"),
  timerSoundSetting: document.getElementById("timerSoundSetting"),
  timerNotificationSetting: document.getElementById("timerNotificationSetting"),
  addDayMenuBtn: document.getElementById("addDayMenuBtn"),
  exportBtnGlobal: document.getElementById("exportBtnGlobal"),
  importBtnGlobal: document.getElementById("importBtnGlobal"),
  restoreLocalBtnGlobal: document.getElementById("restoreLocalBtnGlobal"),
  restoreRoutineBtnGlobal: document.getElementById("restoreRoutineBtnGlobal"),
};

const timers = new Map();

const cardTemplate = document.getElementById("exerciseCardTemplate");

init();

async function init() {
  state.base = await loadJson("./data/routine.json");
  state.exercises = await loadJson("./data/exercises.json");
  ensureLocalShape();
  state.activeDay = pickInitialDayId();
  persistActiveDay();
  bindShellEvents();
  applyTheme(state.theme);
  render();
  registerServiceWorker();
}

function bindShellEvents() {
  els.modeToggleBtn?.addEventListener("click", () => setMode(state.mode === "workout" ? "editor" : "workout"));
  els.themeLightBtn?.addEventListener("click", () => setTheme("light"));
  els.themeDarkBtn?.addEventListener("click", () => setTheme("dark"));
  bindTimerSettings();
  document.addEventListener("click", handleGlobalClick);
  els.addDayMenuBtn?.addEventListener("click", () => { addDay(); closeMenus(); });
  els.exportBtnGlobal?.addEventListener("click", () => { exportData(); closeMenus(); });
  els.importBtnGlobal?.addEventListener("click", () => { importData(); closeMenus(); });
  els.restoreLocalBtnGlobal?.addEventListener("click", () => { restoreLocalData(); closeMenus(); });
  els.restoreRoutineBtnGlobal?.addEventListener("click", () => { restoreBaseRoutine(); closeMenus(); });
}

function setMode(mode) {
  state.mode = mode;
  localStorage.setItem(MODE_KEY, mode);
  render();
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const themeColor = theme === "light" ? "#f8fafc" : "#0f172a";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeColor);
  [els.themeLightBtn, els.themeDarkBtn].forEach((button) => button?.classList.remove("active"));
  const activeButton = theme === "light" ? els.themeLightBtn : els.themeDarkBtn;
  activeButton?.classList.add("active");
  activeButton?.setAttribute("aria-pressed", "true");
  [els.themeLightBtn, els.themeDarkBtn]
    .filter((button) => button && button !== activeButton)
    .forEach((button) => button.setAttribute("aria-pressed", "false"));
}

function bindTimerSettings() {
  state.custom.settings ||= { timerAlert: true, timerSound: true, timerNotification: true };
  const settings = state.custom.settings;
  const controls = [
    [els.timerAlertSetting, "timerAlert"],
    [els.timerSoundSetting, "timerSound"],
    [els.timerNotificationSetting, "timerNotification"],
  ];
  controls.forEach(([control, key]) => {
    if (!control) return;
    control.checked = settings[key] !== false;
    control.addEventListener("change", () => {
      settings[key] = control.checked;
      saveLocalData();
    });
  });
  saveLocalData();
}

function handleGlobalClick(event) {
  const details = document.querySelectorAll(".mini-menu[open]");
  details.forEach((detail) => {
    if (!detail.contains(event.target)) detail.removeAttribute("open");
  });
}

function closeMenus() {
  document.querySelectorAll(".mini-menu[open]").forEach((detail) => detail.removeAttribute("open"));
}

function persistActiveDay() {
  if (state.activeDay) localStorage.setItem("gym-active-day-v1", state.activeDay);
}

function pickInitialDayId() {
  const days = state.base?.days || [];
  const ids = days.map((d) => d.id);
  const todayMap = {
    monday: "monday-rest",
    tuesday: "tuesday-push",
    wednesday: "wednesday-lower-a",
    thursday: "thursday-pull",
    friday: "friday-rest",
    saturday: "saturday-lower-b",
    sunday: "sunday-upper",
  };
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase();
  const preferred = todayMap[weekday];
  if (state.activeDay && ids.includes(state.activeDay)) return state.activeDay;
  if (preferred && ids.includes(preferred)) return preferred;
  const labelMatch = days.find((day) => day.label.toLowerCase() === weekday);
  if (labelMatch) return labelMatch.id;
  return ids[0] || null;
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
  state.custom.daysAdded ||= [];
  state.custom.daysRemoved ||= [];
  state.custom.dayOrder ||= [];
  for (const exercise of state.exercises) {
    state.custom.exercises[exercise.id] ||= {};
  }
  saveLocalData();
}

function getMergedRoutine() {
  const baseDays = state.base.days.filter((day) => !(state.custom.daysRemoved || []).includes(day.id));
  const addedDays = (state.custom.daysAdded || []).map((day) => ({
    ...day,
    exercises: day.exercises || [],
  }));
  const allDays = [...baseDays, ...addedDays];
  const days = allDays.map((day) => {
    const dayCustom = state.custom.days[day.id] || {};
    const removed = new Set(dayCustom.removed || []);
    const orderMap = dayCustom.order || {};
    const savedExerciseOrder = dayCustom.exerciseOrder || [];
    const exerciseRank = new Map(savedExerciseOrder.map((id, index) => [id, index]));
    const overrides = dayCustom.exercises || {};
    const added = dayCustom.addedExercises || [];
    const exercises = (day.exercises || [])
      .filter((entry) => !removed.has(entry.exerciseId))
      .map((entry, index) => {
        const baseExercise = state.exercises.find((e) => e.id === entry.exerciseId);
        const localExercise = state.custom.exercises[entry.exerciseId] || {};
        const entryOverride = overrides[entry.exerciseId] || {};
        return {
          ...entry,
          ...entryOverride,
          order: exerciseRank.has(entry.exerciseId) ? exerciseRank.get(entry.exerciseId) : (orderMap[entry.exerciseId] ?? index),
          exercise: { ...baseExercise, ...localExercise },
        };
      })
      .concat(
        added.map((entry, index) => ({
          exerciseId: entry.exerciseId,
          series: entry.series,
          reps: entry.reps,
          rest: entry.rest,
          order: exerciseRank.has(entry.exerciseId) ? exerciseRank.get(entry.exerciseId) : (orderMap[entry.exerciseId] ?? (1000 + index)),
          exercise: { ...(state.custom.exercises[entry.exerciseId] || {}), id: entry.exerciseId },
        }))
      )
      .sort((a, b) => a.order - b.order);
    return { ...day, ...dayCustom, exercises };
  });
  const savedOrder = state.custom.dayOrder || [];
  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  days.sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id) : savedOrder.length + allDays.findIndex((day) => day.id === a.id);
    const bRank = rank.has(b.id) ? rank.get(b.id) : savedOrder.length + allDays.findIndex((day) => day.id === b.id);
    return aRank - bRank;
  });
  return { ...state.base, days };
}

function render() {
  const routine = getMergedRoutine();
  state.activeDay = routine.days.some((d) => d.id === state.activeDay) ? state.activeDay : pickInitialDayId();
  persistActiveDay();
  renderDayNav(routine.days);
  els.modeToggleBtn.classList.toggle("active", state.mode === "editor");
  els.modeToggleBtn.textContent = state.mode === "workout" ? "✎" : "✓";
  els.modeToggleBtn.setAttribute("aria-label", state.mode === "workout" ? "Cambiar a modo editar" : "Volver al entreno");
  els.modeToggleBtn.setAttribute("aria-pressed", String(state.mode === "editor"));
  if (els.addDayMenuBtn) els.addDayMenuBtn.hidden = state.mode !== "editor";

  const day = routine.days.find((d) => d.id === state.activeDay) || routine.days[0];
  state.activeDay = day.id;
  persistActiveDay();
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
      persistActiveDay();
      render();
    });
    if (state.mode === "editor" && day.id === state.activeDay) {
      const x = document.createElement("span");
      x.className = "day-close";
      x.textContent = "×";
      x.title = "Eliminar día";
      x.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        if (confirm(`¿Eliminar ${day.label} - ${day.title}?`)) removeDay(day.id);
      });
      btn.appendChild(x);
    }
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
        <p class="day-subtitle">${day.subtitle} · ~${estimateRestMinutes(day)} minutos</p>
      </div>
    </div>
    <div class="cards" id="cards"></div>
  `;
  els.app.appendChild(section);
  const cards = section.querySelector("#cards");
  day.exercises.forEach(({ exerciseId, series, reps, rest, exercise }) => {
    cards.appendChild(buildWorkoutCard(exercise, series, reps, rest));
  });
}

function estimateRestMinutes(day) {
  const totalSeconds = (day.exercises || []).reduce((total, entry) => {
    return total + parseRestSeconds(entry.rest) * Number(entry.series || 0);
  }, 0);
  return Math.max(0, Math.round(totalSeconds / 60));
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
  const restButton = node.querySelector(".rest-btn");
  restButton.dataset.seconds = parseRestSeconds(rest);
  restButton.addEventListener("click", () => toggleRestTimer(restButton, parseRestSeconds(rest), exercise.name));
  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.className = "rest-stop-btn";
  stopButton.textContent = "Stop";
  stopButton.hidden = true;
  stopButton.addEventListener("click", () => stopRestTimer(restButton, stopButton, rest));
  restButton.after(stopButton);
  return node;
}

function parseRestSeconds(value) {
  const match = String(value).match(/^(\d+):([0-5]\d)$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Math.max(0, Number(value) || 0);
}

function toggleRestTimer(button, seconds, exerciseName) {
  const existing = timers.get(button);
  if (existing) {
    if (existing.paused) {
      existing.paused = false;
      existing.interval = setInterval(() => tickRestTimer(button, existing, exerciseName), 1000);
      button.textContent = `Pausa ${formatTimer(existing.remaining)}`;
    } else {
      existing.paused = true;
      clearInterval(existing.interval);
      button.textContent = `Continuar ${formatTimer(existing.remaining)}`;
    }
    return;
  }
  const timer = { remaining: seconds, paused: false, interval: null };
  timers.set(button, timer);
  button.classList.add("timer-running");
  const stopButton = button.nextElementSibling;
  if (stopButton) stopButton.hidden = false;
  button.textContent = `Pausa ${formatTimer(seconds)}`;
  timer.interval = setInterval(() => tickRestTimer(button, timer, exerciseName), 1000);
  if (state.custom.settings?.timerNotification && "Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

function tickRestTimer(button, timer, exerciseName) {
  timer.remaining -= 1;
  if (timer.remaining > 0) {
    button.textContent = `${timer.paused ? "Continuar" : "Pausa"} ${formatTimer(timer.remaining)}`;
    return;
  }
  clearInterval(timer.interval);
  timers.delete(button);
  if (button.nextElementSibling) button.nextElementSibling.hidden = true;
  button.classList.remove("timer-running");
  button.classList.add("timer-done");
  button.textContent = "Descanso terminado";
  if (state.custom.settings?.timerAlert !== false) showTimerAlert(button, exerciseName);
  if (state.custom.settings?.timerSound !== false) playTimerSound();
  if (state.custom.settings?.timerNotification !== false && "Notification" in window && Notification.permission === "granted") {
    new Notification("Descanso terminado", { body: `${exerciseName}: listo para la siguiente serie.` });
  }
  setTimeout(() => { if (button.isConnected) { button.classList.remove("timer-done"); button.textContent = `Descanso ${button.dataset.seconds}`; } }, 4500);
}

function stopRestTimer(button, stopButton, originalRest) {
  const timer = timers.get(button);
  if (timer) clearInterval(timer.interval);
  timers.delete(button);
  button.classList.remove("timer-running", "timer-alert", "timer-done");
  button.textContent = `Descanso ${originalRest}`;
  stopButton.hidden = true;
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function showTimerAlert(button, exerciseName) {
  button.classList.add("timer-alert");
  button.setAttribute("aria-label", `Descanso terminado para ${exerciseName}`);
  setTimeout(() => button.classList.remove("timer-alert"), 4500);
}

function playTimerSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.45);
}

function renderEditor(routine) {
  els.app.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "editor-shell";
  panel.innerHTML = `
    <div class="day-header">
      <div>
        <h2 class="day-title">Editor</h2>
        <p class="day-subtitle">Edita rutina, orden, imágenes y PR sin tocar código.</p>
      </div>
    </div>
    <div class="editor-grid" id="editorGrid"></div>
  `;
  els.app.appendChild(panel);
  const grid = panel.querySelector("#editorGrid");
  const day = routine.days.find((d) => d.id === state.activeDay) || routine.days[0];
  if (!day) {
    grid.innerHTML = '<div class="empty-state">No hay días en la rutina.</div>';
    return;
  }
  const dayBox = document.createElement("div");
  dayBox.className = "editor-item editor-day";
  dayBox.innerHTML = `
    <div class="editor-day-header">
      <div>
        <input class="day-name-input" data-day-field="label" value="${escapeHtml(day.label)}" aria-label="Nombre del día">
        <div class="muted">
          <input class="day-name-input day-subtitle-input" data-day-field="title" value="${escapeHtml(day.title)}" aria-label="Título del día">
        </div>
      </div>
      <div class="editor-actions">
        <button class="action-btn" id="moveDayUpBtn" type="button">Subir día</button>
        <button class="action-btn" id="moveDayDownBtn" type="button">Bajar día</button>
        <button class="action-btn danger" id="removeDayBtn" type="button">Eliminar día</button>
      </div>
    </div>
  `;
  dayBox.querySelector("#moveDayUpBtn").addEventListener("click", () => moveDay(day.id, -1));
  dayBox.querySelector("#moveDayDownBtn").addEventListener("click", () => moveDay(day.id, 1));
  dayBox.querySelector("#removeDayBtn").addEventListener("click", () => {
    if (confirm(`¿Eliminar ${day.label} - ${day.title}?`)) removeDay(day.id);
  });
  dayBox.querySelectorAll("[data-day-field]").forEach((input) => {
    const saveField = (shouldRender) => updateDayField(day.id, input.dataset.dayField, input.value, shouldRender);
    input.addEventListener("input", () => saveField(false));
    input.addEventListener("change", () => saveField(true));
  });

  const exerciseList = document.createElement("div");
  exerciseList.className = "editor-stack";
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
    exerciseList.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "action-btn";
  addBtn.type = "button";
  addBtn.textContent = `Añadir ejercicio a ${day.label}`;
  addBtn.addEventListener("click", () => addExercise(day.id));
  dayBox.appendChild(exerciseList);
  dayBox.appendChild(addBtn);

  grid.appendChild(dayBox);
}

function bindEditorRow(row, dayId, exerciseId) {
  row.querySelectorAll("input").forEach((input) => {
    const saveField = (shouldRender) => {
      const field = input.dataset.field;
      const value = input.type === "number" ? Number(input.value) : input.value;
      updateExerciseField(dayId, exerciseId, field, value, shouldRender);
    };
    input.addEventListener("input", () => saveField(false));
    input.addEventListener("change", () => saveField(true));
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

function updateExerciseField(dayId, exerciseId, field, value, shouldRender = true) {
  const dayCustom = state.custom.days[dayId] ||= {};
  const overrides = dayCustom.exercises ||= {};
  const current = overrides[exerciseId] ||= {};
  current[field] = value;
  if (field === "name" || field === "muscleGroup" || field === "image" || field === "pr") {
    state.custom.exercises[exerciseId] = { ...(state.custom.exercises[exerciseId] || {}), [field]: value };
  }
  saveLocalData();
  if (shouldRender) render();
}

function moveExercise(dayId, exerciseId, delta) {
  const dayCustom = state.custom.days[dayId] ||= {};
  const orderMap = dayCustom.order ||= {};
  const visible = getMergedRoutine().days.find((d) => d.id === dayId)?.exercises || [];
  const ordered = visible.map((entry) => entry.exerciseId);
  const index = ordered.indexOf(exerciseId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  dayCustom.exerciseOrder = ordered;
  ordered.forEach((id, idx) => { orderMap[id] = idx; });
  saveLocalData();
  render();
}

function moveDay(dayId, delta) {
  const visibleDays = getMergedRoutine().days;
  const index = visibleDays.findIndex((day) => day.id === dayId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= visibleDays.length) return;
  const orderedIds = visibleDays.map((day) => day.id);
  [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
  state.custom.dayOrder = orderedIds;
  saveLocalData();
  render();
}

function updateDayField(dayId, field, value, shouldRender = true) {
  const day = state.base.days.find((d) => d.id === dayId);
  if (day) {
    const dayCustom = state.custom.days[dayId] ||= {};
    dayCustom[field] = value;
  } else {
    const addedDay = state.custom.daysAdded.find((d) => d.id === dayId);
    if (!addedDay) return;
    addedDay[field] = value;
  }
  saveLocalData();
  if (shouldRender) render();
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

function addDay() {
  const id = `day-${crypto.randomUUID().slice(0, 8)}`;
  const count = (getMergedRoutine().days || []).length + 1;
  state.custom.daysAdded.push({
    id,
    label: `Día ${count}`,
    title: "Nuevo día",
    subtitle: "Editor",
    exercises: [],
  });
  state.activeDay = id;
  persistActiveDay();
  saveLocalData();
  render();
}

function removeDay(dayId) {
  const addedIndex = state.custom.daysAdded.findIndex((day) => day.id === dayId);
  if (addedIndex >= 0) {
    state.custom.daysAdded.splice(addedIndex, 1);
  } else if (!(state.custom.daysRemoved || []).includes(dayId)) {
    state.custom.daysRemoved.push(dayId);
  }
  delete state.custom.days[dayId];
  state.activeDay = pickInitialDayId();
  persistActiveDay();
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
    state.activeDay = pickInitialDayId();
    persistActiveDay();
    render();
  };
  input.click();
}

function restoreLocalData() {
  state.custom = {};
  ensureLocalShape();
  state.activeDay = pickInitialDayId();
  persistActiveDay();
  render();
}

function restoreBaseRoutine() {
  const preservedPrs = state.custom.exercises || {};
  state.custom = { exercises: preservedPrs, days: {} };
  ensureLocalShape();
  state.activeDay = pickInitialDayId();
  persistActiveDay();
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
