import { supabaseFetch, getSupabaseConfig } from "./supabase-client.js";

const AUTH_KEY = "sameer-focus-auth-v1";

/**
 * Check if the user is authenticated for Focus OS.
 * Returns the stored profile or null.
 */
export function checkFocusAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.email && data.name) return data;
    return null;
  } catch {
    return null;
  }
}

/**
 * Save auth to localStorage after successful validation or registration.
 */
function saveAuth(profile) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(profile));
}

/**
 * Clear Focus OS auth (sign out).
 */
export function clearFocusAuth() {
  localStorage.removeItem(AUTH_KEY);
}

/**
 * Register a new Focus OS user with Supabase.
 */
export async function registerFocusUser(name, email) {
  const config = getSupabaseConfig();
  const profile = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    created_at: new Date().toISOString()
  };

  if (config.url && config.anonKey) {
    try {
      await supabaseFetch("focus_users", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(profile)
      });
    } catch {
      // Supabase unavailable — still register locally
    }
  }

  const authData = { name: profile.name, email: profile.email };
  saveAuth(authData);
  return authData;
}

/**
 * Validate an email against Supabase focus_users table.
 *
 * Design note: This is a lightweight, trust-based login for a personal
 * portfolio productivity tool — not a security-critical system. Anyone who
 * knows a registered email can access Focus OS. For stricter auth,
 * integrate Supabase Auth with magic links or OTP.
 */
export async function validateFocusEmail(email) {
  const normalized = email.trim().toLowerCase();

  // Always verify against Supabase if available
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const rows = await supabaseFetch(
        `focus_users?email=eq.${encodeURIComponent(normalized)}&select=name,email&limit=1`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0];
        const authData = { name: user.name, email: user.email };
        saveAuth(authData);
        return authData;
      }
    } catch {
      // Supabase unavailable — fall back to localStorage below
    }
  }

  // Fallback: only trust localStorage if Supabase was unreachable
  const local = checkFocusAuth();
  if (local && local.email === normalized) return local;

  return null;
}

/**
 * Render the Focus OS authentication gate UI.
 */
export function renderAuthGate(container, onSuccess) {
  container.innerHTML = `
    <section class="focus-hero">
      <canvas class="focus-canvas" data-neural-canvas aria-hidden="true"></canvas>
      <div data-animate="slide-right">
        <p class="eyebrow">Focus OS</p>
        <h1>Deep work, made simple.</h1>
        <p class="lede">Sign in with your email or create a profile to get started.</p>
      </div>
    </section>

    <section class="focus-auth-gate">
      <div class="auth-card" id="auth-login-card">
        <h2>Welcome back</h2>
        <p>Enter your email to continue.</p>
        <form data-login-form>
          <input name="email" type="email" placeholder="your@email.com" required autocomplete="email">
          <button class="primary-link" type="submit">Continue</button>
        </form>
        <p class="auth-status" data-login-status></p>
        <p class="auth-toggle">New here? <button type="button" class="text-link" data-show-register>Create a profile</button></p>
      </div>

      <div class="auth-card is-hidden" id="auth-register-card">
        <h2>Create your profile</h2>
        <p>Your email is all you need to sign in next time.</p>
        <form data-register-form>
          <input name="name" placeholder="Your name" required autocomplete="name">
          <input name="email" type="email" placeholder="your@email.com" required autocomplete="email">
          <button class="primary-link" type="submit">Get started</button>
        </form>
        <p class="auth-status" data-register-status></p>
        <p class="auth-toggle">Already have an account? <button type="button" class="text-link" data-show-login>Sign in</button></p>
      </div>
    </section>
  `;

  const loginCard = container.querySelector("#auth-login-card");
  const registerCard = container.querySelector("#auth-register-card");

  container.querySelector("[data-show-register]").addEventListener("click", () => {
    loginCard.classList.add("is-hidden");
    registerCard.classList.remove("is-hidden");
  });

  container.querySelector("[data-show-login]").addEventListener("click", () => {
    registerCard.classList.add("is-hidden");
    loginCard.classList.remove("is-hidden");
  });

  // Email login form
  container.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = container.querySelector("[data-login-status]");
    const email = new FormData(event.currentTarget).get("email").toString().trim();
    status.textContent = "Checking...";
    status.className = "auth-status";

    const result = await validateFocusEmail(email);
    if (result) {
      status.textContent = `Welcome back, ${result.name}!`;
      status.className = "auth-status is-success";
      setTimeout(() => onSuccess(result), 600);
    } else {
      status.textContent = "No account found. Create a profile first.";
      status.className = "auth-status is-error";
    }
  });

  // Registration form
  container.querySelector("[data-register-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = container.querySelector("[data-register-status]");
    const form = new FormData(event.currentTarget);
    const name = form.get("name").toString().trim();
    const email = form.get("email").toString().trim();

    if (!name || !email) {
      status.textContent = "Please fill in all fields.";
      status.className = "auth-status is-error";
      return;
    }

    status.textContent = "Creating your profile...";
    status.className = "auth-status";

    const result = await registerFocusUser(name, email);
    status.textContent = `Welcome, ${result.name}! Redirecting...`;
    status.className = "auth-status is-success";
    setTimeout(() => onSuccess(result), 800);
  });
}
