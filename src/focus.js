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
import { escapeHtml, mountShell } from "./render.js";
import { bootTheme } from "./theme.js";
import { checkFocusAuth, clearFocusAuth, renderAuthGate } from "./focus-auth.js";

/* ═══ State ═══ */

let state;
let timer = {
  mode: "focus",
  running: false,
  remaining: 50 * 60,
  total: 50 * 60,
  intervalId: 0,
  focusCycle: 0,
  startedAt: 0,       // Date.now() anchor for background-safe timing
  remainingAtStart: 0  // remaining when timer was started
};
let calendarDate = new Date();
let fullscreenActive = false;
let escKeyRegistered = false;
let breakCountdownId = null;
let breakToastEl = null;

const modeLabels = { focus: "Focus", short: "Short break", long: "Long break" };

/* ═══ Harsh motivation ═══ */

const harshQuotes = [
  [
    "Your competition is studying right now. What's your excuse?",
    "Nobody is coming to save you. Get to work.",
    "You didn't open this to stare at the screen. Focus.",
    "That phone can wait. Your future can't.",
    "Every second you waste, someone else gets ahead."
  ],
  [
    "Average people quit here. Prove you're not average.",
    "You scrolled for hours yesterday. Earn this session.",
    "Discipline beats motivation. Keep going.",
    "Your degree won't earn itself. Stay locked in.",
    "Comfort is the enemy of progress. Push through."
  ],
  [
    "Halfway done. The difference between ordinary and exceptional is right now.",
    "Pain is temporary. Regret is permanent. Don't stop.",
    "You'll thank yourself tonight. Keep the momentum.",
    "The hard part is staying consistent. Don't break the chain.",
    "This is where most people give up. You're not most people."
  ],
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

/* ═══ Timer core (background-safe via Date.now anchor) ═══ */

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

/**
 * Shared interval core — uses Date.now() anchor so background tabs
 * can't drift. Both startTimer and resume-from-pause use this.
 */
function startTimerCore() {
  if (timer.running) return;
  timer.running = true;
  timer.startedAt = Date.now();
  timer.remainingAtStart = timer.remaining;
  document.querySelector("[data-timer-card]")?.classList.add("is-running");

  timer.intervalId = window.setInterval(() => {
    const elapsed = Math.floor((Date.now() - timer.startedAt) / 1000);
    timer.remaining = Math.max(0, timer.remainingAtStart - elapsed);
    renderTimer();
    if (fullscreenActive) updateFullscreen();
    if (timer.remaining === 0) completeSession();
  }, 1000);
  renderTimer();
}

function startTimer() {
  startTimerCore();
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
    const nextMode = timer.focusCycle % state.settings.longBreakInterval === 0 ? "long" : "short";
    await persist();
    exitFullscreen();
    resetTimer(nextMode);
    renderFocus();
    autoStartBreak();
  } else {
    await persist();
    resetTimer("focus");
    renderFocus();
  }
}

function cleanupBreakCountdown() {
  if (breakCountdownId) { clearInterval(breakCountdownId); breakCountdownId = null; }
  if (breakToastEl) { breakToastEl.remove(); breakToastEl = null; }
}

function autoStartBreak() {
  cleanupBreakCountdown();
  let countdown = 3;
  breakToastEl = document.createElement("div");
  breakToastEl.className = "break-countdown-toast";
  breakToastEl.textContent = `Break starts in ${countdown}...`;
  document.body.appendChild(breakToastEl);

  breakCountdownId = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      cleanupBreakCountdown();
      startTimer();
    } else {
      if (breakToastEl) breakToastEl.textContent = `Break starts in ${countdown}...`;
    }
  }, 1000);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ═══ Fullscreen deep-work overlay ═══ */

function enterFullscreen() {
  if (fullscreenActive) return;
  fullscreenActive = true;
  document.documentElement.requestFullscreen?.().catch(() => {});

  const pendingTasks = state.tasks.filter(t => t.status !== "done");
  const currentSession = (timer.focusCycle % state.settings.longBreakInterval) + 1;

  const overlay = document.createElement("div");
  overlay.id = "focus-fullscreen";
  overlay.innerHTML = `
    <canvas class="fs-particles" data-fs-particles></canvas>
    <div class="fs-edge-pulse"></div>
    <button class="fs-exit" type="button" title="Exit (Esc)">✕</button>

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
        </div>
        <p class="fs-motivation" data-fs-motivation>${getMotivation(0)}</p>
        <div class="fs-breathing"><div class="fs-breath-ring"></div><span>Breathe</span></div>
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
                <button class="task-circle" data-fs-toggle="${t.id}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
                <span>${escapeHtml(t.title)}</span>
              </div>`).join("")
            : `<p class="fs-empty">All tasks done! Pure focus mode.</p>`}
        </div>
      </aside>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("is-visible"));

  // Start particle canvas
  startFsParticles(overlay.querySelector("[data-fs-particles]"));

  // Events
  overlay.querySelector(".fs-exit").addEventListener("click", exitFullscreen);
  overlay.querySelector("[data-fs-pause]").addEventListener("click", () => {
    if (timer.running) {
      stopTimer();
      overlay.querySelector("[data-fs-pause]").textContent = "Resume";
    } else {
      startTimerCore();
      overlay.querySelector("[data-fs-pause]").textContent = "Pause";
    }
  });
  overlay.querySelector("[data-fs-stop]").addEventListener("click", () => {
    stopTimer(); exitFullscreen(); renderTimer();
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

  // Escape key — guarded to prevent double-registration
  if (!escKeyRegistered) {
    document.addEventListener("keydown", handleEscKey);
    escKeyRegistered = true;
  }

  startMotivationRotation();
}

/* Fullscreen floating particles for intensity */
let fsParticleRaf = null;
function startFsParticles(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const particles = [];
  let w, h;

  function resize() { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight; }
  resize();

  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, phase: Math.random() * Math.PI * 2
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.phase += 0.02;
      const alpha = 0.15 + Math.sin(p.phase) * 0.1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(82,199,184,${alpha})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    }
    // Draw edges between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.strokeStyle = `rgba(82,199,184,${(1 - dist / 120) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    fsParticleRaf = requestAnimationFrame(draw);
  }
  draw();
}

let motivationInterval = null;
function startMotivationRotation() {
  clearInterval(motivationInterval);
  motivationInterval = setInterval(() => {
    const el = document.querySelector("[data-fs-motivation]");
    if (!el) { clearInterval(motivationInterval); return; }
    const progress = 1 - timer.remaining / timer.total;
    el.style.opacity = "0";
    setTimeout(() => { el.textContent = getMotivation(progress); el.style.opacity = "1"; }, 300);
  }, 20000);
}

function handleEscKey(e) { if (e.key === "Escape") exitFullscreen(); }

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
  cleanupBreakCountdown();
  clearInterval(motivationInterval);
  if (fsParticleRaf) { cancelAnimationFrame(fsParticleRaf); fsParticleRaf = null; }
  if (escKeyRegistered) { document.removeEventListener("keydown", handleEscKey); escKeyRegistered = false; }
  document.exitFullscreen?.().catch(() => {});
  const overlay = document.getElementById("focus-fullscreen");
  if (overlay) { overlay.classList.remove("is-visible"); setTimeout(() => overlay.remove(), 400); }
}

/* ═══ Main render ═══ */

function renderFocus() {
  const streak = calculateStreak(state.sessions);
  const todaySess = sessionsToday();
  const totalFocus = state.sessions.filter(s => s.mode === "focus").length;
  const openTasks = state.tasks.filter(t => t.status !== "done").length;
  const currentCycle = (timer.focusCycle % state.settings.longBreakInterval) + 1;

  document.querySelector("#focus-root").innerHTML = `
    <section class="focus-hero">
      <canvas class="focus-canvas" data-neural-canvas aria-hidden="true"></canvas>
      <div data-animate="slide-right">
        <p class="eyebrow">Focus OS / Private Workbench</p>
        <h1>Deep work with a timer, tasks, and proof.</h1>
        <p class="lede">A focused operating layer for planning sessions, running distraction-free blocks, and tracking visible momentum.</p>
        <div class="focus-hero-strip" aria-label="Focus OS features">
          <span>Pomodoro engine</span>
          <span>Task queue</span>
          <span>Calendar memory</span>
          <span>Habit analytics</span>
        </div>
      </div>
      <aside class="streak-panel" data-animate="slide-left">
        <span class="streak-flame" aria-hidden="true"></span>
        <strong>${streak}</strong>
        <p>day focus streak</p>
      </aside>
    </section>

    <section class="focus-timer-section">
      <article class="timer-card" data-timer-card data-animate="fade-up">
        <button class="timer-gear" type="button" data-gear-toggle title="Settings" aria-label="Timer settings">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <div class="timer-settings-dropdown" data-settings-dropdown>
          <form class="settings-grid" data-settings-form>
            ${numberField("focusMinutes", "Focus (min)", state.settings.focusMinutes)}
            ${numberField("shortBreakMinutes", "Short break", state.settings.shortBreakMinutes)}
            ${numberField("longBreakMinutes", "Long break", state.settings.longBreakMinutes)}
            ${numberField("longBreakInterval", "Long break every", state.settings.longBreakInterval)}
            <button class="primary-link" type="submit">Save</button>
          </form>
        </div>
        <div class="mode-switch">
          ${Object.keys(modeLabels).map(mode => `<button type="button" class="${timer.mode === mode ? "is-active" : ""}" data-mode="${mode}">${modeLabels[mode]}</button>`).join("")}
        </div>
        <div class="timer-orb" data-timer-orb>
          <div class="timer-core">
            <span data-timer-mode>${modeLabels[timer.mode]}</span>
            <strong data-time>${formatTime(timer.remaining)}</strong>
            <small>${timer.running ? "Running" : "Ready"}</small>
            <small class="cycle-indicator">Session ${currentCycle}/${state.settings.longBreakInterval}</small>
          </div>
        </div>
        <div class="timer-actions">
          <button class="primary-link" type="button" data-start>${timer.running ? "Running" : "Start"}</button>
          <button class="secondary-link" type="button" data-pause>Pause</button>
          <button class="secondary-link" type="button" data-reset>Reset</button>
          <button class="secondary-link" type="button" data-complete>Complete</button>
        </div>
      </article>
      <article class="task-panel" data-animate="slide-right">
        <div class="section-header compact-header"><div>
          <p class="eyebrow">Task queue</p>
          <h2>Plan your next deep-work block.</h2>
        </div></div>
        <form class="task-form" data-task-form>
          <input name="title" required placeholder="Task title">
          <input name="date" type="date" value="${todayKey()}">
          <select name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select>
          <input name="estimatedSessions" type="number" min="1" max="12" value="1">
          <button class="primary-link" type="submit">Add task</button>
        </form>
        <div class="task-list" data-task-list></div>
      </article>
    </section>

    <section class="focus-calendar-section">
      <article class="calendar-panel" data-animate="fade-up">
        <div class="calendar-top">
          <button class="tool-button" type="button" data-calendar-prev>Prev</button>
          <h2 data-calendar-title></h2>
          <button class="tool-button" type="button" data-calendar-next>Next</button>
        </div>
        <div class="calendar-grid" data-calendar></div>
      </article>
    </section>

    <section class="focus-insights" data-animate="fade-up">
      <article><p class="eyebrow">Today</p><strong>${todaySess}</strong><span>focus sessions</span></article>
      <article><p class="eyebrow">Total</p><strong>${totalFocus}</strong><span>sessions logged</span></article>
      <article><p class="eyebrow">Open</p><strong>${openTasks}</strong><span>tasks remaining</span></article>
    </section>

    <section class="productivity-dashboard" data-animate="fade-up">
      <div class="section-header compact-header"><div>
        <p class="eyebrow">Productivity DNA</p>
        <h2>Your hidden habits.</h2>
      </div></div>
      <div class="dashboard-grid" data-dashboard></div>
    </section>
  `;
  renderTimer(); renderTasks(); renderCalendar(); renderDashboard(); setupEvents();
  bootInteractions(document.querySelector("#focus-root"));
}

function numberField(n, l, v) { return `<label>${l}<input name="${n}" type="number" min="1" max="180" value="${escapeHtml(v)}"></label>`; }

function renderTimer() {
  const timeNode = document.querySelector("[data-time]");
  const orb = document.querySelector("[data-timer-orb]");
  if (!timeNode || !orb) return;
  const progress = 1 - timer.remaining / timer.total;
  timeNode.textContent = formatTime(timer.remaining);
  document.querySelector("[data-timer-mode]").textContent = modeLabels[timer.mode];
  orb.style.setProperty("--timer-progress", `${progress * 360}deg`);
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("is-active", b.dataset.mode === timer.mode));
  document.querySelector("[data-start]").textContent = timer.running ? "Running" : "Start";
  document.querySelector("[data-timer-card]").classList.toggle("is-running", timer.running);
}

function renderTasks() {
  const list = document.querySelector("[data-task-list]");
  if (!list) return;
  const sorted = [...state.tasks].sort((a, b) => `${a.date}${a.status}`.localeCompare(`${b.date}${b.status}`));
  list.innerHTML = sorted.length
    ? sorted.map(task => `
        <article class="task-item ${task.status === "done" ? "is-done" : ""}">
          <button class="task-circle ${task.status === "done" ? "is-checked" : ""}" type="button" data-toggle-task="${task.id}">
            ${task.status === "done"
              ? `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
              : `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}
          </button>
          <div><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.date)} · ${escapeHtml(task.priority)} · ${task.estimatedSessions || 1} session</p></div>
          <button class="tool-button" type="button" data-delete-task="${task.id}">✕</button>
        </article>`).join("")
    : `<div class="empty-state"><h3>No tasks yet</h3><p>Add a task to get started.</p></div>`;
}

function renderCalendar() {
  const title = document.querySelector("[data-calendar-title]");
  const grid = document.querySelector("[data-calendar]");
  if (!title || !grid) return;
  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  title.textContent = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(calendarDate);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(start); day.setDate(start.getDate() + i);
    const key = todayKey(day);
    const tasks = state.tasks.filter(t => t.date === key);
    const sess = state.sessions.filter(s => todayKey(new Date(s.completedAt)) === key && s.mode === "focus");
    days.push(`<div class="calendar-day ${day.getMonth() !== month ? "is-muted" : ""} ${key === todayKey() ? "is-today" : ""}">
      <strong>${day.getDate()}</strong>
      ${tasks.slice(0, 3).map(t => `<span class="calendar-task ${t.status === "done" ? "is-done" : ""}">${escapeHtml(t.title)}</span>`).join("")}
      ${sess.length ? `<small>${sess.length} focus</small>` : ""}
    </div>`);
  }
  grid.innerHTML = `<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>${days.join("")}`;
}

function sessionsToday() {
  return state.sessions.filter(s => s.mode === "focus" && todayKey(new Date(s.completedAt)) === todayKey()).length;
}

async function persist() { state = await saveFocusState(state); renderTasks(); renderCalendar(); }

function setupEvents() {
  document.querySelector("[data-start]").addEventListener("click", startTimer);
  document.querySelector("[data-pause]").addEventListener("click", () => { stopTimer(); renderTimer(); });
  document.querySelector("[data-reset]").addEventListener("click", () => resetTimer(timer.mode));
  document.querySelector("[data-complete]").addEventListener("click", completeSession);
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => resetTimer(b.dataset.mode)));

  document.querySelector("[data-settings-form]").addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const clamp = (v, min, max) => Math.max(min, Math.min(max, Math.round(v) || min));
    state.settings = {
      focusMinutes: clamp(Number(f.get("focusMinutes")), 1, 180),
      shortBreakMinutes: clamp(Number(f.get("shortBreakMinutes")), 1, 180),
      longBreakMinutes: clamp(Number(f.get("longBreakMinutes")), 1, 180),
      longBreakInterval: clamp(Number(f.get("longBreakInterval")), 1, 10)
    };
    await persist(); resetTimer(timer.mode);
    document.querySelector("[data-settings-dropdown]")?.classList.remove("is-open");
  });

  document.querySelector("[data-task-form]").addEventListener("submit", async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    state.tasks.unshift({ id: createId("task"), title: f.get("title").toString().trim(), date: f.get("date").toString(), priority: f.get("priority").toString(), estimatedSessions: Number(f.get("estimatedSessions") || 1), status: "todo", createdAt: new Date().toISOString() });
    e.currentTarget.reset(); e.currentTarget.querySelector('[name="date"]').value = todayKey();
    await persist();
  });

  document.querySelector("[data-task-list]").addEventListener("click", async e => {
    const tid = e.target.closest("[data-toggle-task]")?.dataset.toggleTask;
    const did = e.target.closest("[data-delete-task]")?.dataset.deleteTask;
    if (tid) { state.tasks = state.tasks.map(t => t.id === tid ? { ...t, status: t.status === "done" ? "todo" : "done" } : t); await persist(); }
    if (did) { state.tasks = state.tasks.filter(t => t.id !== did); await persist(); }
  });

  document.querySelector("[data-calendar-prev]").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
  document.querySelector("[data-calendar-next]").addEventListener("click", () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });

  // Gear toggle
  document.querySelector("[data-gear-toggle]").addEventListener("click", () => {
    document.querySelector("[data-settings-dropdown]").classList.toggle("is-open");
  });
}

/* ═══ Productivity Dashboard ═══ */

function computeInsights() {
  const focusSessions = state.sessions.filter(s => s.mode === "focus");
  const totalSessions = focusSessions.length;
  const totalMinutes = focusSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  // Best focus hour
  const hourCounts = new Array(24).fill(0);
  focusSessions.forEach(s => {
    const h = new Date(s.completedAt).getHours();
    hourCounts[h]++;
  });
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakHourLabel = totalSessions > 0 ? formatHour(peakHour) : "—";

  // Most productive day of week
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayCounts = new Array(7).fill(0);
  focusSessions.forEach(s => { dayCounts[new Date(s.completedAt).getDay()]++; });
  const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
  const peakDayLabel = totalSessions > 0 ? dayNames[peakDay] : "—";

  // Average sessions per active day
  const activeDays = new Set(focusSessions.map(s => todayKey(new Date(s.completedAt)))).size;
  const avgPerDay = activeDays > 0 ? (totalSessions / activeDays).toFixed(1) : "0";

  // Task completion rate
  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter(t => t.status === "done").length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Current week sessions vs average
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const thisWeekSessions = focusSessions.filter(s => new Date(s.completedAt) >= weekStart).length;

  // Longest streak
  const streak = calculateStreak(state.sessions);

  // Session intensity pattern (last 7 days)
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = todayKey(d);
    const count = focusSessions.filter(s => todayKey(new Date(s.completedAt)) === key).length;
    last7.push({ day: d.toLocaleDateString("en", { weekday: "short" }), count });
  }
  const maxLast7 = Math.max(1, ...last7.map(d => d.count));

  return { totalHours, totalSessions, peakHourLabel, peakDayLabel, avgPerDay, completionRate, thisWeekSessions, streak, last7, maxLast7, activeDays };
}

function formatHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function renderDashboard() {
  const el = document.querySelector("[data-dashboard]");
  if (!el) return;
  const d = computeInsights();

  el.innerHTML = `
    <div class="dash-card">
      <span class="dash-icon">🕐</span>
      <strong>${d.peakHourLabel}</strong>
      <p>Peak focus hour</p>
      <small>You're most productive around this time</small>
    </div>
    <div class="dash-card">
      <span class="dash-icon">📅</span>
      <strong>${d.peakDayLabel}</strong>
      <p>Strongest day</p>
      <small>Your best day for deep work</small>
    </div>
    <div class="dash-card">
      <span class="dash-icon">⚡</span>
      <strong>${d.totalHours}h</strong>
      <p>Total focus time</p>
      <small>${d.totalSessions} sessions across ${d.activeDays} days</small>
    </div>
    <div class="dash-card">
      <span class="dash-icon">📊</span>
      <strong>${d.avgPerDay}</strong>
      <p>Avg sessions/day</p>
      <small>On days you actually focused</small>
    </div>
    <div class="dash-card">
      <span class="dash-icon">✅</span>
      <strong>${d.completionRate}%</strong>
      <p>Task completion</p>
      <small>${d.completionRate >= 80 ? "Machine-level consistency" : d.completionRate >= 50 ? "Room to improve" : "Start finishing what you start"}</small>
    </div>
    <div class="dash-card">
      <span class="dash-icon">🔥</span>
      <strong>${d.streak} days</strong>
      <p>Current streak</p>
      <small>${d.streak >= 7 ? "You're unstoppable" : d.streak >= 3 ? "Building momentum" : "Keep showing up"}</small>
    </div>
    <div class="dash-card dash-card-wide">
      <span class="dash-icon">📈</span>
      <p class="dash-chart-title">Last 7 days</p>
      <div class="dash-bars">
        ${d.last7.map(day => `
          <div class="dash-bar-col">
            <div class="dash-bar" style="height:${Math.max(4, (day.count / d.maxLast7) * 100)}%"></div>
            <span>${day.day}</span>
          </div>
        `).join("")}
      </div>
      <small>${d.thisWeekSessions} sessions this week</small>
    </div>
  `;
}

/* ═══ Boot ═══ */

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
