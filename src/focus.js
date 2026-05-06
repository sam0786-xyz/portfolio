import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { initSiteContent } from "./content-store.js";
import {
  calculateStreak,
  createId,
  loadFocusState,
  saveFocusState,
  todayKey
} from "./focus-store.js";
import { escapeHtml, mountShell, renderPills } from "./render.js";
import { bootTheme } from "./theme.js";
import { checkFocusAuth, clearFocusAuth, renderAuthGate } from "./focus-auth.js";

/* ═══════════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════════ */

let state;
let timer = {
  mode: "focus",
  running: false,
  remaining: 50 * 60,
  total: 50 * 60,
  intervalId: 0,
  focusCycle: 0
};
let calendarDate = new Date();
let fullscreenActive = false;

const modeLabels = { focus: "Focus", short: "Short break", long: "Long break" };

/* ═══════════════════════════════════════════════════
   Harsh motivation — rotating reality-check quotes
   ═══════════════════════════════════════════════════ */

const harshQuotes = [
  // Phase 1: 0-25%
  [
    "Your competition is studying right now. What's your excuse?",
    "Nobody is coming to save you. Get to work.",
    "You didn't open this to stare at the screen. Focus.",
    "That phone can wait. Your future can't.",
    "Every second you waste, someone else gets ahead."
  ],
  // Phase 2: 25-50%
  [
    "Average people quit here. Prove you're not average.",
    "You scrolled for hours yesterday. Earn this session.",
    "Discipline beats motivation. Keep going.",
    "Your degree won't earn itself. Stay locked in.",
    "Comfort is the enemy of progress. Push through."
  ],
  // Phase 3: 50-75%
  [
    "Halfway done. The difference between ordinary and exceptional is right now.",
    "Pain is temporary. Regret is permanent. Don't stop.",
    "You'll thank yourself tonight. Keep the momentum.",
    "The hard part is staying consistent. Don't break the chain.",
    "This is where most people give up. You're not most people."
  ],
  // Phase 4: 75-100%
  [
    "Almost there. Finish what you started — no excuses.",
    "You're in the final stretch. Champions close strong.",
    "Don't you dare quit this close to the end.",
    "The last 25% separates winners from everyone else.",
    "Lock in. You're about to prove something to yourself."
  ]
];

function getMotivation(progress) {
  const phase = Math.min(3, Math.floor(progress * 4));
  const pool = harshQuotes[phase];
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ═══════════════════════════════════════════════════
   Timer helpers
   ═══════════════════════════════════════════════════ */

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
    if (fullscreenActive) updateFullscreen();
    if (timer.remaining === 0) completeSession();
  }, 1000);
  renderTimer();

  // Enter fullscreen if focus mode
  if (timer.mode === "focus") enterFullscreen();
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
    // After 3 consecutive focus sessions → long break, else short break
    const nextMode = timer.focusCycle % state.settings.longBreakInterval === 0 ? "long" : "short";
    await persist();
    exitFullscreen();
    resetTimer(nextMode);
    renderFocus();
    // Auto-start break after a 3s countdown
    autoStartBreak();
  } else {
    await persist();
    resetTimer("focus");
    renderFocus();
  }
}

function autoStartBreak() {
  let countdown = 3;
  const overlay = document.getElementById("focus-fullscreen");
  if (!overlay) {
    // No fullscreen, just start
    startTimer();
    return;
  }
  // Show countdown in a toast
  const toast = document.createElement("div");
  toast.className = "break-countdown-toast";
  toast.textContent = `Break starts in ${countdown}...`;
  document.body.appendChild(toast);

  const cdInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(cdInterval);
      toast.remove();
      startTimer();
    } else {
      toast.textContent = `Break starts in ${countdown}...`;
    }
  }, 1000);
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

/* ═══════════════════════════════════════════════════
   Fullscreen deep-work overlay
   ═══════════════════════════════════════════════════ */

function enterFullscreen() {
  if (fullscreenActive) return;
  fullscreenActive = true;

  // Try real fullscreen API
  document.documentElement.requestFullscreen?.().catch(() => {});

  const pendingTasks = state.tasks.filter(t => t.status !== "done");
  const sessionsUntilLong = state.settings.longBreakInterval - (timer.focusCycle % state.settings.longBreakInterval);
  const currentSession = (timer.focusCycle % state.settings.longBreakInterval) + 1;

  const overlay = document.createElement("div");
  overlay.id = "focus-fullscreen";
  overlay.innerHTML = `
    <button class="fs-exit" type="button" title="Exit fullscreen (Esc)" aria-label="Exit fullscreen">✕</button>

    <div class="fs-main">
      <div class="fs-timer-area">
        <div class="fs-session-counter">
          Session <strong>${currentSession}</strong> of <strong>${state.settings.longBreakInterval}</strong>
          <span>until long break</span>
        </div>
        <div class="fs-orb" data-fs-orb>
          <div class="fs-orb-inner">
            <span class="fs-mode" data-fs-mode>${modeLabels[timer.mode]}</span>
            <strong class="fs-time" data-fs-time>${formatTime(timer.remaining)}</strong>
          </div>
        </div>
        <div class="fs-signal">
          <div class="fs-signal-bar" data-fs-signal></div>
          <span class="fs-signal-label">Focus signal</span>
        </div>
        <p class="fs-motivation" data-fs-motivation>${getMotivation(0)}</p>
        <div class="fs-breathing" data-fs-breathing>
          <div class="fs-breath-ring"></div>
          <span>Breathe</span>
        </div>
        <div class="fs-actions">
          <button class="primary-link" type="button" data-fs-pause>Pause</button>
          <button class="secondary-link" type="button" data-fs-stop>End session</button>
        </div>
      </div>

      <aside class="fs-tasks">
        <h3>Pending Tasks</h3>
        <div class="fs-task-list">
          ${pendingTasks.length
            ? pendingTasks.map(t => `
              <div class="fs-task-item">
                <button class="task-circle" data-fs-toggle="${t.id}" aria-label="Complete task">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                </button>
                <span>${escapeHtml(t.title)}</span>
              </div>
            `).join("")
            : `<p class="fs-empty">All tasks done! Pure focus mode.</p>`
          }
        </div>
      </aside>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));

  // Events
  overlay.querySelector(".fs-exit").addEventListener("click", exitFullscreen);
  overlay.querySelector("[data-fs-pause]").addEventListener("click", () => {
    if (timer.running) {
      stopTimer();
      overlay.querySelector("[data-fs-pause]").textContent = "Resume";
    } else {
      startTimerSilent();
      overlay.querySelector("[data-fs-pause]").textContent = "Pause";
    }
  });
  overlay.querySelector("[data-fs-stop]").addEventListener("click", () => {
    stopTimer();
    exitFullscreen();
    renderTimer();
  });
  overlay.querySelectorAll("[data-fs-toggle]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.fsToggle;
      state.tasks = state.tasks.map(t => t.id === id ? { ...t, status: "done" } : t);
      btn.closest(".fs-task-item").classList.add("is-done");
      btn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      await persist();
    });
  });

  // Escape key
  document.addEventListener("keydown", handleEscKey);

  // Rotate motivation every 30 seconds
  startMotivationRotation();
}

let motivationInterval = null;
function startMotivationRotation() {
  clearInterval(motivationInterval);
  motivationInterval = setInterval(() => {
    const el = document.querySelector("[data-fs-motivation]");
    if (!el) { clearInterval(motivationInterval); return; }
    const progress = 1 - timer.remaining / timer.total;
    el.style.opacity = "0";
    setTimeout(() => {
      el.textContent = getMotivation(progress);
      el.style.opacity = "1";
    }, 300);
  }, 30000);
}

function handleEscKey(e) {
  if (e.key === "Escape") exitFullscreen();
}

function startTimerSilent() {
  if (timer.running) return;
  timer.running = true;
  document.querySelector("[data-timer-card]")?.classList.add("is-running");
  timer.intervalId = window.setInterval(() => {
    timer.remaining = Math.max(0, timer.remaining - 1);
    renderTimer();
    if (fullscreenActive) updateFullscreen();
    if (timer.remaining === 0) completeSession();
  }, 1000);
}

function updateFullscreen() {
  const timeEl = document.querySelector("[data-fs-time]");
  const signalEl = document.querySelector("[data-fs-signal]");
  const orbEl = document.querySelector("[data-fs-orb]");
  if (!timeEl) return;
  timeEl.textContent = formatTime(timer.remaining);
  const progress = 1 - timer.remaining / timer.total;
  if (signalEl) signalEl.style.width = `${Math.round(progress * 100)}%`;
  if (orbEl) orbEl.style.setProperty("--timer-progress", `${progress * 360}deg`);
}

function exitFullscreen() {
  fullscreenActive = false;
  clearInterval(motivationInterval);
  document.removeEventListener("keydown", handleEscKey);
  document.exitFullscreen?.().catch(() => {});
  const overlay = document.getElementById("focus-fullscreen");
  if (overlay) {
    overlay.classList.remove("is-visible");
    setTimeout(() => overlay.remove(), 400);
  }
}

/* ═══════════════════════════════════════════════════
   Main render
   ═══════════════════════════════════════════════════ */

function renderFocus() {
  const streak = calculateStreak(state.sessions);
  const todaySessions = sessionsToday();
  const totalFocus = state.sessions.filter(s => s.mode === "focus").length;
  const openTasks = state.tasks.filter(t => t.status !== "done").length;
  const currentCycleSession = (timer.focusCycle % state.settings.longBreakInterval) + 1;

  document.querySelector("#focus-root").innerHTML = `
    <section class="focus-hero">
      <canvas class="focus-canvas" data-neural-canvas aria-hidden="true"></canvas>
      <div data-animate="slide-right">
        <p class="eyebrow">Focus OS</p>
        <h1>Deep work, made simple.</h1>
        <p class="lede">A minimal productivity workspace to stay focused and ship faster.</p>
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
            .map(mode => `<button type="button" class="${timer.mode === mode ? "is-active" : ""}" data-mode="${mode}">${modeLabels[mode]}</button>`)
            .join("")}
        </div>
        <div class="timer-orb" data-timer-orb>
          <div class="timer-core">
            <span data-timer-mode>${modeLabels[timer.mode]}</span>
            <strong data-time>${formatTime(timer.remaining)}</strong>
            <small>${timer.running ? "Running" : "Ready"}</small>
            <small class="cycle-indicator">Session ${currentCycleSession}/${state.settings.longBreakInterval}</small>
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
          ${numberField("focusMinutes", "Focus (min)", state.settings.focusMinutes)}
          ${numberField("shortBreakMinutes", "Short break", state.settings.shortBreakMinutes)}
          ${numberField("longBreakMinutes", "Long break", state.settings.longBreakMinutes)}
          ${numberField("longBreakInterval", "Long break every", state.settings.longBreakInterval)}
          <button class="primary-link" type="submit">Save timing</button>
        </form>
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
        <strong>${todaySessions}</strong>
        <span>focus sessions completed</span>
      </article>
      <article>
        <p class="eyebrow">Total</p>
        <strong>${totalFocus}</strong>
        <span>focus sessions logged</span>
      </article>
      <article>
        <p class="eyebrow">Open tasks</p>
        <strong>${openTasks}</strong>
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
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.mode === timer.mode);
  });
  document.querySelector("[data-start]").textContent = timer.running ? "Running" : "Start";
  document.querySelector("[data-timer-card]").classList.toggle("is-running", timer.running);
}

/* ═══════════════════════════════════════════════════
   Task rendering — Circle checkboxes
   ═══════════════════════════════════════════════════ */

function renderTasks() {
  const list = document.querySelector("[data-task-list]");
  if (!list) return;
  const sorted = [...state.tasks].sort((a, b) => `${a.date}${a.status}`.localeCompare(`${b.date}${b.status}`));
  list.innerHTML = sorted.length
    ? sorted
        .map(
          task => `
            <article class="task-item ${task.status === "done" ? "is-done" : ""}">
              <button class="task-circle ${task.status === "done" ? "is-checked" : ""}" type="button" data-toggle-task="${task.id}" aria-label="Toggle task">
                ${task.status === "done"
                  ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                  : `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
                }
              </button>
              <div>
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.date)} · ${escapeHtml(task.priority)} · ${escapeHtml(task.estimatedSessions || 1)} session</p>
              </div>
              <button class="tool-button" type="button" data-delete-task="${task.id}" aria-label="Delete task">✕</button>
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
    const tasks = state.tasks.filter(task => task.date === key);
    const sessions = state.sessions.filter(session => todayKey(new Date(session.completedAt)) === key && session.mode === "focus");
    days.push(`
      <div class="calendar-day ${day.getMonth() !== month ? "is-muted" : ""} ${key === todayKey() ? "is-today" : ""}">
        <strong>${day.getDate()}</strong>
        ${tasks.slice(0, 3).map(task => `<span class="calendar-task ${task.status === "done" ? "is-done" : ""}">${escapeHtml(task.title)}</span>`).join("")}
        ${sessions.length ? `<small>${sessions.length} focus</small>` : ""}
      </div>
    `);
  }
  grid.innerHTML = `<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>${days.join("")}`;
}

function sessionsToday() {
  return state.sessions.filter(session => session.mode === "focus" && todayKey(new Date(session.completedAt)) === todayKey()).length;
}

async function persist() {
  state = await saveFocusState(state);
  renderTasks();
  renderCalendar();
}

/* ═══════════════════════════════════════════════════
   Event wiring
   ═══════════════════════════════════════════════════ */

function setupEvents() {
  document.querySelector("[data-start]").addEventListener("click", startTimer);
  document.querySelector("[data-pause]").addEventListener("click", () => {
    stopTimer();
    renderTimer();
  });
  document.querySelector("[data-reset]").addEventListener("click", () => resetTimer(timer.mode));
  document.querySelector("[data-complete]").addEventListener("click", completeSession);
  document.querySelectorAll("[data-mode]").forEach(button => {
    button.addEventListener("click", () => resetTimer(button.dataset.mode));
  });

  document.querySelector("[data-settings-form]").addEventListener("submit", async event => {
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

  document.querySelector("[data-task-form]").addEventListener("submit", async event => {
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

  document.querySelector("[data-task-list]").addEventListener("click", async event => {
    const toggleId = event.target.closest("[data-toggle-task]")?.dataset.toggleTask;
    const deleteId = event.target.closest("[data-delete-task]")?.dataset.deleteTask;
    if (toggleId) {
      state.tasks = state.tasks.map(task => (task.id === toggleId ? { ...task, status: task.status === "done" ? "todo" : "done" } : task));
      await persist();
    }
    if (deleteId) {
      state.tasks = state.tasks.filter(task => task.id !== deleteId);
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
}

/* ═══════════════════════════════════════════════════
   Boot
   ═══════════════════════════════════════════════════ */

bootLoader();
await initSiteContent();
mountShell("focus");
bootTheme();

const focusRoot = document.querySelector("#focus-root");
const auth = checkFocusAuth();

if (auth) {
  state = await loadFocusState();
  timer.remaining = state.settings.focusMinutes * 60;
  timer.total = timer.remaining;
  renderFocus();
} else {
  renderAuthGate(focusRoot, async () => {
    state = await loadFocusState();
    timer.remaining = state.settings.focusMinutes * 60;
    timer.total = timer.remaining;
    renderFocus();
  });
  bootInteractions(focusRoot);
}
dismissLoader();
