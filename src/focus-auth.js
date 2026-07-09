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

  // Verify against Supabase via a security-definer RPC. The focus_users table
  // no longer exposes a public `SELECT *` (which would let anyone dump every
  // visitor's name + email); the RPC only ever returns an exact-email match.
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const rows = await supabaseFetch("rpc/focus_user_lookup", {
        method: "POST",
        body: JSON.stringify({ p_email: normalized })
      });
      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0];
        const authData = { name: user.name, email: user.email };
        saveAuth(authData);
        return authData;
      }
    } catch {
      // Supabase/RPC unavailable — fall back to localStorage below
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
    <div class="v3-container v3-section reveal-up" style="min-height: 80vh; display: flex; align-items: center; justify-content: center;">
      <div style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 4rem; border-radius: 24px; max-width: 500px; width: 100%;">
        <span class="eyebrow" style="text-align: center; display: block; margin-bottom: 1rem;">Private Tool</span>
        <h1 style="text-align: center; margin-bottom: 1rem; font-size: 2.5rem;">Focus OS</h1>
        <p class="lede" style="text-align: center; margin-bottom: 3rem;">A productivity layer for deep work and session tracking.</p>

        <!-- Login Card -->
        <div id="auth-login-card">
          <form data-login-form style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Email Address</label>
              <input name="email" type="email" required placeholder="name@example.com" autocomplete="email" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; color: #fff; font-family: inherit;">
            </div>
            <button class="v3-btn v3-btn-primary" type="submit" style="width: 100%; padding: 1rem;">Sign in</button>
          </form>
          <p data-login-status style="text-align: center; color: var(--accent-1); min-height: 1.5rem; margin: 1rem 0 0; font-size: 0.9rem;"></p>
          <p style="text-align: center; margin-top: 2rem; font-size: 0.9rem; color: var(--text-muted);">
            New here? <button type="button" class="v3-btn" data-show-register style="padding: 0; background: none; border: none; color: var(--accent-1); text-decoration: underline;">Create a profile</button>
          </p>
        </div>

        <!-- Register Card -->
        <div id="auth-register-card" style="display: none;">
          <form data-register-form style="display: flex; flex-direction: column; gap: 1.5rem;">
            <div>
              <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Display Name</label>
              <input name="name" type="text" placeholder="Your name" autocomplete="name" required style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; color: #fff; font-family: inherit;">
            </div>
            <div>
              <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Email Address</label>
              <input name="email" type="email" required placeholder="name@example.com" autocomplete="email" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 12px; color: #fff; font-family: inherit;">
            </div>
            <button class="v3-btn v3-btn-primary" type="submit" style="width: 100%; padding: 1rem;">Get Started</button>
          </form>
          <p data-register-status style="text-align: center; color: var(--accent-1); min-height: 1.5rem; margin: 1rem 0 0; font-size: 0.9rem;"></p>
          <p style="text-align: center; margin-top: 2rem; font-size: 0.9rem; color: var(--text-muted);">
            Already have an account? <button type="button" class="v3-btn" data-show-login style="padding: 0; background: none; border: none; color: var(--accent-1); text-decoration: underline;">Sign in</button>
          </p>
        </div>

      </div>
    </div>
  `;

  const loginCard = container.querySelector("#auth-login-card");
  const registerCard = container.querySelector("#auth-register-card");

  container.querySelector("[data-show-register]").addEventListener("click", () => {
    loginCard.style.display = "none";
    registerCard.style.display = "block";
  });

  container.querySelector("[data-show-login]").addEventListener("click", () => {
    registerCard.style.display = "none";
    loginCard.style.display = "block";
  });

  // Email login form
  container.querySelector("[data-login-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = container.querySelector("[data-login-status]");
    const email = new FormData(event.currentTarget).get("email").toString().trim();
    status.textContent = "Checking...";
    status.style.color = "var(--text-muted)";

    const result = await validateFocusEmail(email);
    if (result) {
      status.textContent = `Welcome back, ${result.name}!`;
      status.style.color = "var(--accent-green)";
      setTimeout(() => onSuccess(result), 600);
    } else {
      status.textContent = "No account found. Create a profile first.";
      status.style.color = "var(--accent-1)";
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
      status.style.color = "var(--accent-1)";
      return;
    }

    status.textContent = "Creating your profile...";
    status.style.color = "var(--text-muted)";

    const result = await registerFocusUser(name, email);
    status.textContent = `Welcome, ${result.name}! Redirecting...`;
    status.style.color = "var(--accent-green)";
    setTimeout(() => onSuccess(result), 800);
  });
}
