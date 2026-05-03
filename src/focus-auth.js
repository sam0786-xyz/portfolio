import { supabaseFetch, getSupabaseConfig } from "./supabase-client.js";

const AUTH_KEY = "sameer-focus-auth-v1";

/**
 * Generate a unique 8-char alphanumeric code in XXXX-XXXX format.
 */
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Check if the user is authenticated for Focus OS.
 * Returns the stored profile or null.
 */
export function checkFocusAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.code && data.name) return data;
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
 * Creates a unique code and saves the user profile.
 */
export async function registerFocusUser(name, email) {
  const config = getSupabaseConfig();
  const code = generateCode();
  const profile = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    unique_code: code,
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

  const authData = { name: profile.name, email: profile.email, code };
  saveAuth(authData);
  return authData;
}

/**
 * Validate a unique code against Supabase.
 * Falls back to localStorage if Supabase is unavailable.
 */
export async function validateFocusCode(code) {
  const normalized = code.trim().toUpperCase();

  // Check localStorage first
  const local = checkFocusAuth();
  if (local && local.code === normalized) return local;

  // Check Supabase
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const rows = await supabaseFetch(
        `focus_users?unique_code=eq.${encodeURIComponent(normalized)}&select=name,email,unique_code&limit=1`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0];
        const authData = { name: user.name, email: user.email, code: user.unique_code };
        saveAuth(authData);
        return authData;
      }
    } catch {
      // Supabase unavailable
    }
  }

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
        <p class="lede">Enter your unique code to access the workspace, or create a new profile to get started.</p>
      </div>
    </section>

    <section class="focus-auth-gate">
      <div class="auth-card" id="auth-code-card">
        <h2>Enter your code</h2>
        <p>If you already have a Focus OS code, enter it below.</p>
        <form data-code-form>
          <input
            name="code"
            placeholder="XXXX-XXXX"
            required
            maxlength="9"
            pattern="[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}"
            autocomplete="off"
            spellcheck="false"
            style="text-transform: uppercase; letter-spacing: 0.12em; text-align: center"
          >
          <button class="primary-link" type="submit">Unlock</button>
        </form>
        <p class="auth-status" data-code-status></p>
        <p class="auth-toggle">Don't have a code? <button type="button" class="text-link" data-show-register>Create a profile</button></p>
      </div>

      <div class="auth-card is-hidden" id="auth-register-card">
        <h2>Create your profile</h2>
        <p>We'll generate a unique code for you.</p>
        <form data-register-form>
          <input name="name" placeholder="Your name" required autocomplete="name">
          <input name="email" type="email" placeholder="Email address" required autocomplete="email">
          <button class="primary-link" type="submit">Get my code</button>
        </form>
        <p class="auth-status" data-register-status></p>
        <p class="auth-toggle">Already have a code? <button type="button" class="text-link" data-show-code>Enter it here</button></p>
      </div>

      <div class="auth-card is-hidden" id="auth-success-card">
        <h2>Welcome!</h2>
        <p>Your unique Focus OS code is:</p>
        <div class="auth-code-display" data-generated-code></div>
        <p><strong>Save this code!</strong> You'll need it to access Focus OS on any device.</p>
        <button class="primary-link" type="button" data-continue-btn>Continue to Focus OS</button>
      </div>
    </section>
  `;

  const codeCard = container.querySelector("#auth-code-card");
  const registerCard = container.querySelector("#auth-register-card");
  const successCard = container.querySelector("#auth-success-card");

  container.querySelector("[data-show-register]").addEventListener("click", () => {
    codeCard.classList.add("is-hidden");
    registerCard.classList.remove("is-hidden");
  });

  container.querySelector("[data-show-code]").addEventListener("click", () => {
    registerCard.classList.add("is-hidden");
    codeCard.classList.remove("is-hidden");
  });

  // Code validation form
  container.querySelector("[data-code-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = container.querySelector("[data-code-status]");
    const code = new FormData(event.currentTarget).get("code").toString().trim();
    status.textContent = "Validating...";
    status.className = "auth-status";

    const result = await validateFocusCode(code);
    if (result) {
      status.textContent = `Welcome back, ${result.name}!`;
      status.className = "auth-status is-success";
      setTimeout(() => onSuccess(result), 600);
    } else {
      status.textContent = "Invalid code. Please check and try again.";
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
    registerCard.classList.add("is-hidden");
    successCard.classList.remove("is-hidden");
    container.querySelector("[data-generated-code]").textContent = result.code;
  });

  // Continue button
  container.querySelector("[data-continue-btn]").addEventListener("click", () => {
    const auth = checkFocusAuth();
    if (auth) onSuccess(auth);
  });
}
