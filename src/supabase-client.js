const SUPABASE_CONFIG_KEY = "sameer-supabase-config";

export async function hydrateSupabaseConfig() {
  const current = getSupabaseConfig();
  if (current.url && current.anonKey) return current;

  try {
    const response = await fetch("/api/public-config", { cache: "no-store" });
    if (!response.ok) return current;
    const payload = await response.json();
    const next = payload.supabaseUrl && payload.supabaseAnonKey
      ? { url: payload.supabaseUrl, anonKey: payload.supabaseAnonKey }
      : current;
    if (next.url && next.anonKey) {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(next));
      return next;
    }
  } catch {}

  return current;
}

export function getSupabaseConfig() {
  const globalConfig = window.SAMEER_SUPABASE || {};
  try {
    const stored = JSON.parse(localStorage.getItem(SUPABASE_CONFIG_KEY) || "{}");
    return {
      url: stored.url || globalConfig.url || "",
      anonKey: stored.anonKey || globalConfig.anonKey || ""
    };
  } catch {
    return { url: globalConfig.url || "", anonKey: globalConfig.anonKey || "" };
  }
}

export function saveSupabaseConfig(config) {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
}

export async function supabaseFetch(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) throw new Error("Supabase config missing");
  const response = await fetch(`${config.url.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
