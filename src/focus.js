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
    completedAt: new Date().toISOString(),
    taskId: timer.mode === "focus" ? state.activeTaskId || null : null
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

  const activeTask = state.tasks.find(t => t.id === state.activeTaskId && t.status !== "done");
  const pendingTasks = [...state.tasks.filter(t => t.status !== "done")]
    .sort((a, b) => (b.id === state.activeTaskId) - (a.id === state.activeTaskId));
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
        ${activeTask ? `<div class="fs-active-task">→ ${escapeHtml(activeTask.title)}</div>` : ""}
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
              <div class="fs-task-item ${t.id === state.activeTaskId ? "is-active" : ""}">
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
      if (state.activeTaskId === id) state.activeTaskId = null;
      btn.closest(".fs-task-item").classList.add("is-done");
      btn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--accent-green)" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="var(--accent-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
  const currentCycle = (timer.focusCycle % state.settings.longBreakInterval) + 1;

  const circumference = 2 * Math.PI * 96; // ring radius = 96

  document.querySelector("#focus-root").innerHTML = `
    <section class="focus-head v3-container">
      <div class="reveal-up">
        <span class="eyebrow">Focus OS / Private Workbench</span>
        <div class="focus-head-row">
          <h1 class="focus-title">Today's flow</h1>
          <span class="mono-text">${new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</span>
        </div>
        <div class="focus-today-strip" data-today-strip>${todayStripHtml()}</div>
      </div>
    </section>

    <section class="v3-section v3-container section-glow section-glow-teal" style="padding-top: 0;">
      <div class="focus-layout">
        <!-- Timer Card -->
        <article class="v3-card v3-card-static" data-timer-card>
          <button style="position: absolute; top: var(--space-2); right: var(--space-2); background: none; border: none; color: var(--text-dark); cursor: pointer;" type="button" data-gear-toggle title="Settings" aria-label="Timer settings">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          </button>

          <div data-settings-dropdown style="position: absolute; top: 3rem; right: var(--space-2); background: var(--bg-surface-0); padding: var(--space-3); border-radius: var(--radius-lg); border: 1px solid var(--glass-border); z-index: 10; width: 240px;">
            <form data-settings-form style="display: flex; flex-direction: column; gap: var(--space-2);">
              ${numberField("focusMinutes", "Focus (min)", state.settings.focusMinutes)}
              ${numberField("shortBreakMinutes", "Short break", state.settings.shortBreakMinutes)}
              ${numberField("longBreakMinutes", "Long break", state.settings.longBreakMinutes)}
              ${numberField("longBreakInterval", "Long break every", state.settings.longBreakInterval)}
              ${numberField("dailyGoal", "Daily goal (sessions)", state.settings.dailyGoal || 4)}
              <button class="v3-btn v3-btn-primary v3-btn-sm" type="submit" style="margin-top: var(--space-1);">Save</button>
            </form>
          </div>

          <div style="display: flex; gap: 4px; justify-content: center; margin-bottom: var(--space-4);">
            ${Object.keys(modeLabels).map(mode => `<button type="button" class="v3-btn v3-btn-sm ${timer.mode === mode ? "v3-btn-primary" : "v3-btn-glass"}" data-mode="${mode}">${modeLabels[mode]}</button>`).join("")}
          </div>

          <div class="focus-active-task" data-active-task></div>

          <!-- SVG Ring Timer -->
          <div class="v3-timer-ring" data-timer-orb>
            <svg viewBox="0 0 200 200">
              <circle class="ring-bg" cx="100" cy="100" r="96"/>
              <circle class="ring-progress" cx="100" cy="100" r="96"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${circumference}" data-ring-progress/>
            </svg>
            <div class="v3-timer-core">
              <span class="mono-text" style="color: var(--accent-1); font-size: 0.75rem; text-transform: uppercase;" data-timer-mode>${modeLabels[timer.mode]}</span>
              <strong style="font-family: var(--font-display); font-size: 3.5rem; font-weight: 200; line-height: 1;" data-time>${formatTime(timer.remaining)}</strong>
              <span class="mono-text" style="font-size: 0.75rem; color: var(--text-dark);">${timer.running ? "Running" : "Ready"} · ${currentCycle}/${state.settings.longBreakInterval}</span>
            </div>
          </div>

          <div style="display: flex; gap: var(--space-2); justify-content: center; margin-top: var(--space-4);">
            <button class="v3-btn v3-btn-primary" type="button" data-start>${timer.running ? "Running" : "Start"}</button>
            <button class="v3-btn v3-btn-glass" type="button" data-pause>Pause</button>
            <button class="v3-btn v3-btn-glass" type="button" data-reset>Reset</button>
            <button class="v3-btn v3-btn-glass" type="button" data-complete>Complete</button>
          </div>
        </article>

        <!-- Task Panel -->
        <article style="display: flex; flex-direction: column; gap: var(--space-4);">
          <div>
            <span class="eyebrow">Task queue</span>
            <h3>Pick a task, link it, focus.</h3>
          </div>
          <form data-task-form style="display: flex; flex-direction: column; gap: var(--space-2);">
            <input class="v3-input" name="title" required placeholder="Task title">
            <div style="display: grid; grid-template-columns: 1fr 1fr 80px; gap: var(--space-2);">
              <input class="v3-input" name="date" type="date" value="${todayKey()}" style="color-scheme: dark;">
              <select class="v3-input" name="priority"><option>High</option><option selected>Medium</option><option>Low</option></select>
              <input class="v3-input" name="estimatedSessions" type="number" min="1" max="12" value="1" placeholder="#">
            </div>
            <button class="v3-btn v3-btn-glass" type="submit">Add task</button>
          </form>
          <div data-task-list></div>
        </article>
      </div>
    </section>

    <!-- Calendar -->
    <section class="v3-section v3-container section-glow section-glow-purple reveal-up">
      <span class="eyebrow">Plan ahead</span>
      <h2 style="margin-bottom: var(--space-4);">Month view.</h2>
      <div class="v3-card v3-card-static">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
          <button class="v3-btn v3-btn-glass v3-btn-sm" type="button" data-calendar-prev>← Prev</button>
          <h3 data-calendar-title style="margin: 0;"></h3>
          <button class="v3-btn v3-btn-glass v3-btn-sm" type="button" data-calendar-next>Next →</button>
        </div>
        <div class="calendar-grid" data-calendar></div>
      </div>
    </section>

    <!-- Dashboard -->
    <section class="v3-section v3-container reveal-up">
      <span class="eyebrow">Productivity DNA</span>
      <h2 style="margin-bottom: var(--space-4);">Your hidden habits.</h2>
      <div class="v3-grid v3-grid-3" data-dashboard></div>
    </section>
  `;
  renderTimer(); renderTasks(); renderCalendar(); renderDashboard(); setupEvents();
  bootInteractions(document.querySelector("#focus-root"));
}

function numberField(n, l, v) { return `<label class="v3-label" style="display:flex;flex-direction:column;gap:4px;">${l}<input class="v3-input" name="${n}" type="number" min="1" max="180" value="${escapeHtml(v)}"></label>`; }

function todayStripHtml() {
  const goal = state.settings.dailyGoal || 4;
  const todaySess = sessionsToday();
  const minutesToday = state.sessions
    .filter(s => s.mode === "focus" && todayKey(new Date(s.completedAt)) === todayKey())
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const openTasks = state.tasks.filter(t => t.status !== "done").length;
  const streak = calculateStreak(state.sessions);
  const totalFocus = state.sessions.filter(s => s.mode === "focus").length;
  const dots = Array.from({ length: goal }, (_, i) => `<span class="session-dot ${i < todaySess ? "is-filled" : ""}"></span>`).join("");
  const overflow = todaySess > goal ? `<span class="session-dot-extra">+${todaySess - goal}</span>` : "";
  return `
    <div class="session-dots" title="Focus sessions today vs daily goal">${dots}${overflow}</div>
    <span class="focus-pill"><strong>${todaySess}/${goal}</strong> sessions today</span>
    <div class="focus-pills">
      <span class="focus-pill">🔥 <strong>${streak}</strong> day streak</span>
      <span class="focus-pill"><strong>${minutesToday}</strong> min today</span>
      <span class="focus-pill"><strong>${openTasks}</strong> open tasks</span>
      <span class="focus-pill"><strong>${totalFocus}</strong> all-time</span>
    </div>`;
}

function taskFocusCount(taskId) {
  return state.sessions.filter(s => s.mode === "focus" && s.taskId === taskId).length;
}

function renderActiveTask() {
  const el = document.querySelector("[data-active-task]");
  if (!el) return;
  const task = state.tasks.find(t => t.id === state.activeTaskId && t.status !== "done");
  el.innerHTML = task
    ? `→ <strong>${escapeHtml(task.title)}</strong> · ${taskFocusCount(task.id)}/${Math.max(1, task.estimatedSessions || 1)} sessions`
    : `<span class="focus-active-empty">No task linked — hit “Focus” on a task to track it</span>`;
}

function renderTimer() {
  const timeNode = document.querySelector("[data-time]");
  const ringEl = document.querySelector("[data-ring-progress]");
  if (!timeNode) return;
  const progress = 1 - timer.remaining / timer.total;
  const circumference = 2 * Math.PI * 96;
  timeNode.textContent = formatTime(timer.remaining);
  document.querySelector("[data-timer-mode]").textContent = modeLabels[timer.mode];
  if (ringEl) {
    ringEl.style.strokeDashoffset = `${circumference * (1 - progress)}`;
  }
  document.querySelectorAll("[data-mode]").forEach(b => {
    b.classList.remove("v3-btn-primary", "v3-btn-glass");
    b.classList.add(b.dataset.mode === timer.mode ? "v3-btn-primary" : "v3-btn-glass");
  });
  document.querySelector("[data-start]").textContent = timer.running ? "Running" : "Start";
  document.querySelector("[data-timer-card]")?.classList.toggle("is-running", timer.running);
}

function taskRow(task) {
  const done = task.status === "done";
  const est = Math.max(1, task.estimatedSessions || 1);
  const logged = taskFocusCount(task.id);
  const isActive = !done && state.activeTaskId === task.id;
  const progressDots = Array.from({ length: est }, (_, i) => `<i class="${i < logged ? "is-filled" : ""}"></i>`).join("");
  const overflow = logged > est ? `<span class="task-progress-extra">+${logged - est}</span>` : "";
  return `
    <div class="v3-minimal-row focus-task-row ${isActive ? "is-active" : ""}">
      <div class="focus-task-main">
        <button class="task-circle" type="button" data-toggle-task="${task.id}" style="color: ${done ? "var(--accent-green)" : "var(--text-dark)"};">
          ${done
            ? `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            : `<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}
        </button>
        <div>
          <h4 class="v3-row-title" style="${done ? "text-decoration: line-through; opacity: 0.4;" : ""}">${escapeHtml(task.title)}</h4>
          <span class="v3-row-meta"><span class="priority-dot p-${escapeHtml((task.priority || "medium").toLowerCase())}"></span>${escapeHtml(task.date)} · ${logged}/${est} sessions</span>
        </div>
      </div>
      <div class="focus-task-side">
        <span class="task-progress" title="${logged} of ${est} estimated sessions logged">${progressDots}${overflow}</span>
        ${done ? "" : `<button class="v3-btn v3-btn-sm ${isActive ? "v3-btn-primary" : "v3-btn-glass"}" type="button" data-focus-task="${task.id}">${isActive ? "Focusing" : "Focus"}</button>`}
        <button class="v3-btn v3-btn-glass v3-btn-sm v3-btn-icon" type="button" data-delete-task="${task.id}" title="Delete task">✕</button>
      </div>
    </div>`;
}

function renderTasks() {
  const list = document.querySelector("[data-task-list]");
  if (!list) return;
  const today = todayKey();
  const open = state.tasks.filter(t => t.status !== "done");
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const byPriorityThenDate = (a, b) =>
    (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1) || a.date.localeCompare(b.date);
  const groups = [
    ["Overdue", open.filter(t => t.date < today).sort(byPriorityThenDate), "is-overdue"],
    ["Today", open.filter(t => t.date === today).sort(byPriorityThenDate), ""],
    ["Upcoming", open.filter(t => t.date > today).sort((a, b) => a.date.localeCompare(b.date) || byPriorityThenDate(a, b)), ""],
    ["Done", state.tasks.filter(t => t.status === "done").slice(0, 6), "is-done-group"]
  ];
  const html = groups
    .filter(([, tasks]) => tasks.length)
    .map(([label, tasks, cls]) => `
      <div class="task-group-label ${cls}">${label} · ${tasks.length}</div>
      <div class="v3-minimal-list">${tasks.map(taskRow).join("")}</div>`)
    .join("");
  list.innerHTML = html || `<div style="padding: var(--space-4); color: var(--text-dark); text-align: center;">No tasks yet. Plan a session to begin.</div>`;
  renderActiveTask();
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

async function persist() {
  state = await saveFocusState(state);
  renderTasks();
  renderCalendar();
  const strip = document.querySelector("[data-today-strip]");
  if (strip) strip.innerHTML = todayStripHtml();
}

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
      longBreakInterval: clamp(Number(f.get("longBreakInterval")), 1, 10),
      dailyGoal: clamp(Number(f.get("dailyGoal")), 1, 12)
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
    const fid = e.target.closest("[data-focus-task]")?.dataset.focusTask;
    if (tid) {
      state.tasks = state.tasks.map(t => t.id === tid ? { ...t, status: t.status === "done" ? "todo" : "done" } : t);
      if (state.activeTaskId === tid && state.tasks.find(t => t.id === tid)?.status === "done") state.activeTaskId = null;
      await persist();
    }
    if (did) {
      if (state.activeTaskId === did) state.activeTaskId = null;
      state.tasks = state.tasks.filter(t => t.id !== did);
      await persist();
    }
    if (fid) {
      state.activeTaskId = state.activeTaskId === fid ? null : fid;
      await persist();
    }
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

  const statCard = (icon, value, label, sub) => `
    <div class="v3-card v3-card-static" style="padding: var(--space-3);">
      <span style="font-size: 1.2rem; display: block; margin-bottom: 6px;">${icon}</span>
      <span class="v3-stat-value" style="font-size: 1.4rem;">${value}</span>
      <strong style="display: block; font-size: 0.9rem; margin-top: 4px;">${label}</strong>
      <span class="mono-text" style="font-size: 0.75rem; color: var(--text-dark);">${sub}</span>
    </div>`;

  // Activity bar chart for last 7 days
  const activityBars = d.last7.map(day => {
    const height = Math.max(4, (day.count / d.maxLast7) * 48);
    return `<div style="flex:1; text-align:center;">
      <div class="v3-activity-bar" style="height:${height}px; margin: 0 auto; width: 100%;"></div>
      <span class="v3-activity-label">${day.day}</span>
    </div>`;
  }).join("");

  el.innerHTML = `
    ${statCard("🕐", d.peakHourLabel, "Peak focus hour", "Most productive time")}
    ${statCard("📅", d.peakDayLabel, "Strongest day", "Best day for deep work")}
    ${statCard("⚡", d.totalHours + "h", "Total focus time", `${d.totalSessions} sessions · ${d.activeDays} days`)}
    ${statCard("📊", d.avgPerDay, "Avg sessions/day", "On active days")}
    ${statCard("✅", d.completionRate + "%", "Task completion", d.completionRate >= 80 ? "Machine-level" : d.completionRate >= 50 ? "Room to improve" : "Start finishing")}
    ${statCard("🔥", d.streak + " days", "Current streak", d.streak >= 7 ? "Unstoppable" : d.streak >= 3 ? "Building momentum" : "Keep showing up")}
    <div class="v3-card v3-card-static" style="grid-column: 1 / -1; padding: var(--space-3);">
      <span class="eyebrow" style="margin-bottom: var(--space-2);">Last 7 days</span>
      <div class="v3-activity-bars">${activityBars}</div>
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
