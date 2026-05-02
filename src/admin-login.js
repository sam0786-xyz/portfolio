import { bootTheme } from "./theme.js";

bootTheme();

const form = document.querySelector("[data-admin-login]");
const status = document.querySelector("[data-login-status]");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Checking credentials...";
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      status.textContent = payload.error || "Login failed.";
      return;
    }
    window.location.href = "/cms/";
  } catch {
    status.textContent = "Login service unavailable.";
  }
});
