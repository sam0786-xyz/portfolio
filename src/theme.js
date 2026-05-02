const STORAGE_KEY = "sameer-theme";

export function getStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

export function setupThemeToggle() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;

  const syncLabel = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
  };

  syncLabel();

  button.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    const rect = button.getBoundingClientRect();
    const wipe = document.createElement("span");
    wipe.className = "eclipse-wipe";
    wipe.style.setProperty("--x", `${rect.left + rect.width / 2}px`);
    wipe.style.setProperty("--y", `${rect.top + rect.height / 2}px`);
    wipe.style.setProperty("--wipe-color", next === "dark" ? "#101114" : "#fbfaf6");
    document.body.append(wipe);
    button.classList.add("is-switching");

    window.setTimeout(() => {
      applyTheme(next);
      syncLabel();
    }, 180);

    window.setTimeout(() => {
      button.classList.remove("is-switching");
      wipe.remove();
    }, 760);
  });
}

export function bootTheme() {
  if (!document.documentElement.dataset.theme) {
    document.documentElement.dataset.theme = getStoredTheme();
  }
  setupThemeToggle();
}
