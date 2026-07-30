import { bootTheme } from "./theme.js";
import { bootLoader, dismissLoader } from "./loader.js";

const CMS_AUTH_KEY = "sameer-cms-auth-v1";
// SHA-256 of "sameer-admin-2026"
const ADMIN_HASH = "189dae6cfcc30b889226afa557f8c006c5b24b24468f0cfe9ea14df910789956";

bootLoader();
bootTheme();

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const form = document.querySelector("[data-admin-login]");
const status = document.querySelector("[data-login-status]");
const currentPath = window.location.pathname;
const inferredNext = currentPath.startsWith("/studio") || currentPath === "/cms/" || currentPath === "/cms" ? currentPath : "/cms/";
const nextUrl = new URLSearchParams(window.location.search).get("next") || inferredNext;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Checking credentials...";
  const body = Object.fromEntries(new FormData(form).entries());

  // Try server-side auth first (works with local dev server)
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (response.ok && payload.ok) {
      localStorage.setItem(CMS_AUTH_KEY, JSON.stringify({ authenticated: true, timestamp: Date.now() }));
      window.location.href = nextUrl.startsWith("/") ? nextUrl : "/cms/";
      return;
    }
    // If server explicitly rejected, don't fall through
    if (response.status === 401) {
      status.textContent = payload.error || "Invalid credentials.";
      return;
    }
  } catch {
    // Server unavailable (Netlify static) — fall through to client-side auth
  }

  // Client-side auth fallback (for Netlify / static hosting)
  const passwordHash = await sha256(String(body.password || ""));
  const usernameOk = String(body.username || "").toLowerCase() === "sam.xyz";

  if (usernameOk && passwordHash === ADMIN_HASH) {
    localStorage.setItem(CMS_AUTH_KEY, JSON.stringify({ authenticated: true, timestamp: Date.now() }));
    window.location.href = nextUrl.startsWith("/") ? nextUrl : "/cms/";
  } else {
    status.textContent = "Invalid credentials.";
  }
});

dismissLoader();
