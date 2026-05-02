import { getSupabaseConfig, saveSupabaseConfig, supabaseFetch } from "./supabase-client.js";

const FOCUS_KEY = "sameer-focus-os-v1";

export const defaultFocusState = {
  settings: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4
  },
  tasks: [],
  sessions: [],
  updatedAt: new Date().toISOString()
};

export function createId(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export { getSupabaseConfig, saveSupabaseConfig };

export async function loadFocusState() {
  const local = readLocalState();
  const remote = await tryLoadSupabase();
  return remote || local;
}

export async function saveFocusState(state) {
  const next = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(FOCUS_KEY, JSON.stringify(next));
  await trySaveSupabase(next);
  return next;
}

export function readLocalState() {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (!raw) return structuredClone(defaultFocusState);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultFocusState),
      ...parsed,
      settings: { ...defaultFocusState.settings, ...(parsed.settings || {}) },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : []
    };
  } catch {
    return structuredClone(defaultFocusState);
  }
}

async function tryLoadSupabase() {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return null;

  try {
    const [tasks, sessions, settingsRows] = await Promise.all([
      supabaseFetch("focus_tasks?select=*"),
      supabaseFetch("focus_sessions?select=*"),
      supabaseFetch("focus_settings?select=*&limit=1")
    ]);
    const settings = settingsRows?.[0]
      ? {
          focusMinutes: settingsRows[0].focus_minutes,
          shortBreakMinutes: settingsRows[0].short_break_minutes,
          longBreakMinutes: settingsRows[0].long_break_minutes,
          longBreakInterval: settingsRows[0].long_break_interval
        }
      : defaultFocusState.settings;
    return {
      settings,
      tasks: (tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        date: task.date,
        priority: task.priority,
        status: task.status,
        estimatedSessions: task.estimated_sessions
      })),
      sessions: (sessions || []).map((session) => ({
        id: session.id,
        mode: session.mode,
        durationMinutes: session.duration_minutes,
        completedAt: session.completed_at
      })),
      updatedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function trySaveSupabase(state) {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return false;

  try {
    await Promise.all([
      supabaseFetch("focus_settings", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          id: "default",
          focus_minutes: state.settings.focusMinutes,
          short_break_minutes: state.settings.shortBreakMinutes,
          long_break_minutes: state.settings.longBreakMinutes,
          long_break_interval: state.settings.longBreakInterval
        })
      }),
      supabaseFetch("focus_tasks", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(
          state.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            date: task.date,
            priority: task.priority,
            status: task.status,
            estimated_sessions: task.estimatedSessions || 1
          }))
        )
      }),
      supabaseFetch("focus_sessions", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(
          state.sessions.map((session) => ({
            id: session.id,
            mode: session.mode,
            duration_minutes: session.durationMinutes,
            completed_at: session.completedAt
          }))
        )
      })
    ]);
    return true;
  } catch {
    return false;
  }
}

// supabaseFetch is now imported from supabase-client.js

export function calculateStreak(sessions) {
  const days = new Set(
    sessions
      .filter((session) => session.mode === "focus")
      .map((session) => todayKey(new Date(session.completedAt)))
  );
  let streak = 0;
  const cursor = new Date();
  while (days.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
