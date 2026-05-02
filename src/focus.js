import { bootInteractions } from "./animations.js";
import { initSiteContent } from "./content-store.js";
import {
  calculateStreak,
  createId,
  loadFocusState,
  saveFocusState,
  saveSupabaseConfig,
  todayKey
} from "./focus-store.js";
import { escapeHtml, mountShell, renderPills } from "./render.js";
import { bootTheme } from "./theme.js";

let state;
let timer = {
  mode: "focus",
  running: false,
  remaining: 25 * 60,
  total: 25 * 60,
  intervalId: 0,
  focusCycle: 0
};
let calendarDate = new Date();

const modeLabels = {
  focus: "Focus",
  short: "Short break",
  long: "Long break"
};

function minutesForMode(mode) {
  if (mode === "short") return state.settings.shortBreakMinutes;
  if (mode === "long") return state.settings.longBreakMinutes;
  return state.settings.focusMinutes;
}

function resetTimer(mode = timer.mode) {
  stopTimer();
  timer.mode = mode;
  timer.total = minutesForMode(mode) * 60;
  timer.remaining = timer.total;
  renderTimer();
}

function startTimer() {
  if (timer.running) return;
  timer.running = true;
  document.querySelector("[data-timer-card]")?.classList.add("is-running");
  timer.intervalId = window.setInterval(() => {
    timer.remaining = Math.max(0, timer.remaining - 1);
    renderTimer();
    if (timer.remaining === 0) completeSession();
  }, 1000);
  renderTimer();
}

function stopTimer() {
  timer.running = false;
  window.clearInterval(timer.intervalId);
  document.querySelector("[data-timer-card]")?.classList.remove("is-running");
}

async function completeSession() {
  stopTimer();
  const duration = Math.round(timer.total / 60);
  state.sessions.unshift({
    id: createId("session"),
    mode: timer.mode,
    durationMinutes: duration,
    completedAt: new Date().toISOString()
  });

  if (timer.mode === "focus") {
    timer.focusCycle += 1;
    const nextMode = timer.focusCycle % state.settings.longBreakInterval === 0 ? "long" : "short";
    await persist();
    resetTimer(nextMode);
    renderFocus();
  } else {
    await persist();
    resetTimer("focus");
    renderFocus();
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function renderFocus() {
  const streak = calculateStreak(state.sessions);
  document.querySelector("#focus-root").innerHTML = `
    <section class="focus-hero">
      <canvas class="focus-canvas" data-neural-canvas aria-hidden="true"></canvas>
      <div data-animate="slide-right">
        <p class="eyebrow">Focus OS</p>
        <h1>Pomodoro, tasks, calendar, and streaks in one workspace.</h1>
        <p class="lede">A local-first productivity layer for building AI projects without losing the rhythm of deep work.</p>
      </div>
      <aside class="streak-panel" data-animate="slide-left">
        <span class="streak-flame" aria-hidden="true"></span>
        <strong>${streak}</strong>
        <p>day focus streak</p>
      </aside>
    </section>

    <section class="focus-layout">
      <article class="timer-card" data-timer-card data-animate="fade-up">
        <div class="mode-switch" aria-label="Timer modes">
          ${Object.keys(modeLabels)
            .map((mode) => `<button type="button" class="${timer.mode === mode ? "is-active" : ""}" data-mode="${mode}">${modeLabels[mode]}</button>`)
            .join("")}
        </div>
        <div class="timer-orb" data-timer-orb>
          <div class="timer-core">
            <span data-timer-mode>${modeLabels[timer.mode]}</span>
            <strong data-time>${formatTime(timer.remaining)}</strong>
            <small>${timer.running ? "Running" : "Ready"}</small>
          </div>
        </div>
        <div class="timer-actions">
          <button class="primary-link" type="button" data-start>${timer.running ? "Running" : "Start"}</button>
          <button class="secondary-link" type="button" data-pause>Pause</button>
          <button class="secondary-link" type="button" data-reset>Reset</button>
          <button class="secondary-link" type="button" data-complete>Complete</button>
        </div>
      </article>

      <article class="settings-panel" data-animate="fade-up">
        <p class="eyebrow">Customize sessions</p>
        <form class="settings-grid" data-settings-form>
          ${numberField("focusMinutes", "Focus", state.settings.focusMinutes)}
          ${numberField("shortBreakMinutes", "Short break", state.settings.shortBreakMinutes)}
          ${numberField("longBreakMinutes", "Long break", state.settings.longBreakMinutes)}
          ${numberField("longBreakInterval", "Long break every", state.settings.longBreakInterval)}
          <button class="primary-link" type="submit">Save timing</button>
        </form>
        <details class="supabase-details">
          <summary>Supabase sync settings</summary>
          <form data-supabase-form>
            <input name="url" placeholder="https://project-ref.supabase.co">
            <input name="anonKey" placeholder="Supabase anon key">
            <button class="secondary-link" type="submit">Save sync config</button>
          </form>
        </details>
      </article>
    </section>

    <section class="focus-workspace">
      <article class="task-panel" data-animate="slide-right">
        <div class="section-header compact-header">
          <div>
            <p class="eyebrow">Task queue</p>
            <h2>Plan your next deep-work block.</h2>
          </div>
        </div>
        <form class="task-form" data-task-form>
          <input name="title" required placeholder="Task title">
          <input name="date" type="date" value="${todayKey()}">
          <select name="priority" aria-label="Priority">
            <option>High</option>
            <option selected>Medium</option>
            <option>Low</option>
          </select>
          <input name="estimatedSessions" type="number" min="1" max="12" value="1" aria-label="Estimated sessions">
          <button class="primary-link" type="submit">Add task</button>
        </form>
        <div class="task-list" data-task-list></div>
      </article>

      <article class="calendar-panel" data-animate="slide-left">
        <div class="calendar-top">
          <button class="tool-button" type="button" data-calendar-prev aria-label="Previous month">Prev</button>
          <h2 data-calendar-title></h2>
          <button class="tool-button" type="button" data-calendar-next aria-label="Next month">Next</button>
        </div>
        <div class="calendar-grid" data-calendar></div>
      </article>
    </section>

    <section class="focus-insights" data-animate="fade-up">
      <article>
        <p class="eyebrow">Today</p>
        <strong>${sessionsToday()}</strong>
        <span>focus sessions completed</span>
      </article>
      <article>
        <p class="eyebrow">Total</p>
        <strong>${state.sessions.filter((session) => session.mode === "focus").length}</strong>
        <span>focus sessions logged</span>
      </article>
      <article>
        <p class="eyebrow">Open tasks</p>
        <strong>${state.tasks.filter((task) => task.status !== "done").length}</strong>
        <span>waiting for a calendar slot</span>
      </article>
    </section>
  `;

  renderTimer();
  renderTasks();
  renderCalendar();
  setupEvents();
  bootInteractions(document.querySelector("#focus-root"));
}

function numberField(name, label, value) {
  return `
    <label>
      ${label}
      <input name="${name}" type="number" min="1" max="180" value="${escapeHtml(value)}">
    </label>
  `;
}

function renderTimer() {
  const timeNode = document.querySelector("[data-time]");
  const modeNode = document.querySelector("[data-timer-mode]");
  const orb = document.querySelector("[data-timer-orb]");
  if (!timeNode || !orb) return;
  const progress = 1 - timer.remaining / timer.total;
  timeNode.textContent = formatTime(timer.remaining);
  modeNode.textContent = modeLabels[timer.mode];
  orb.style.setProperty("--timer-progress", `${progress * 360}deg`);
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === timer.mode);
  });
  document.querySelector("[data-start]").textContent = timer.running ? "Running" : "Start";
  document.querySelector("[data-timer-card]").classList.toggle("is-running", timer.running);
}

function renderTasks() {
  const list = document.querySelector("[data-task-list]");
  if (!list) return;
  const sorted = [...state.tasks].sort((a, b) => `${a.date}${a.status}`.localeCompare(`${b.date}${b.status}`));
  list.innerHTML = sorted.length
    ? sorted
        .map(
          (task) => `
            <article class="task-item ${task.status === "done" ? "is-done" : ""}">
              <button type="button" data-toggle-task="${task.id}" aria-label="Toggle task">${task.status === "done" ? "Done" : "Todo"}</button>
              <div>
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.date)} / ${escapeHtml(task.priority)} / ${escapeHtml(task.estimatedSessions || 1)} session</p>
                <div class="tag-row">${renderPills([task.status || "todo"])}</div>
              </div>
              <button class="tool-button" type="button" data-delete-task="${task.id}" aria-label="Delete task">X</button>
            </article>
          `
        )
        .join("")
    : `<div class="empty-state"><h3>No tasks yet</h3><p>Add a task and it will appear on the calendar automatically.</p></div>`;
}

function renderCalendar() {
  const title = document.querySelector("[data-calendar-title]");
  const grid = document.querySelector("[data-calendar]");
  if (!title || !grid) return;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  title.textContent = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarDate);

  const days = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = todayKey(day);
    const tasks = state.tasks.filter((task) => task.date === key);
    const sessions = state.sessions.filter((session) => todayKey(new Date(session.completedAt)) === key && session.mode === "focus");
    days.push(`
      <div class="calendar-day ${day.getMonth() !== month ? "is-muted" : ""} ${key === todayKey() ? "is-today" : ""}">
        <strong>${day.getDate()}</strong>
        ${tasks.slice(0, 3).map((task) => `<span class="calendar-task ${task.status === "done" ? "is-done" : ""}">${escapeHtml(task.title)}</span>`).join("")}
        ${sessions.length ? `<small>${sessions.length} focus</small>` : ""}
      </div>
    `);
  }
  grid.innerHTML = `<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>${days.join("")}`;
}

function sessionsToday() {
  return state.sessions.filter((session) => session.mode === "focus" && todayKey(new Date(session.completedAt)) === todayKey()).length;
}

async function persist() {
  state = await saveFocusState(state);
  renderTasks();
  renderCalendar();
}

function setupEvents() {
  document.querySelector("[data-start]").addEventListener("click", startTimer);
  document.querySelector("[data-pause]").addEventListener("click", () => {
    stopTimer();
    renderTimer();
  });
  document.querySelector("[data-reset]").addEventListener("click", () => resetTimer(timer.mode));
  document.querySelector("[data-complete]").addEventListener("click", completeSession);
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => resetTimer(button.dataset.mode));
  });

  document.querySelector("[data-settings-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.settings = {
      focusMinutes: Number(form.get("focusMinutes")),
      shortBreakMinutes: Number(form.get("shortBreakMinutes")),
      longBreakMinutes: Number(form.get("longBreakMinutes")),
      longBreakInterval: Number(form.get("longBreakInterval"))
    };
    await persist();
    resetTimer(timer.mode);
  });

  document.querySelector("[data-task-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.tasks.unshift({
      id: createId("task"),
      title: form.get("title").toString().trim(),
      date: form.get("date").toString(),
      priority: form.get("priority").toString(),
      estimatedSessions: Number(form.get("estimatedSessions") || 1),
      status: "todo",
      createdAt: new Date().toISOString()
    });
    event.currentTarget.reset();
    event.currentTarget.querySelector('[name="date"]').value = todayKey();
    await persist();
  });

  document.querySelector("[data-task-list]").addEventListener("click", async (event) => {
    const toggleId = event.target.closest("[data-toggle-task]")?.dataset.toggleTask;
    const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;
    if (toggleId) {
      state.tasks = state.tasks.map((task) => (task.id === toggleId ? { ...task, status: task.status === "done" ? "todo" : "done" } : task));
      await persist();
    }
    if (deleteId) {
      state.tasks = state.tasks.filter((task) => task.id !== deleteId);
      await persist();
    }
  });

  document.querySelector("[data-calendar-prev]").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.querySelector("[data-calendar-next]").addEventListener("click", () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.querySelector("[data-supabase-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveSupabaseConfig({
      url: form.get("url").toString().trim(),
      anonKey: form.get("anonKey").toString().trim()
    });
  });
}

await initSiteContent();
state = await loadFocusState();
timer.remaining = state.settings.focusMinutes * 60;
timer.total = timer.remaining;
mountShell("focus");
bootTheme();
renderFocus();
