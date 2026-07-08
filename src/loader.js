/**
 * Sameer OS Loading Screen (V3 Glass & Void)
 * A clean, text-based loader that matches the new hero aesthetic.
 */

const LOADER_ID = "app-loader";
const MIN_DISPLAY_MS = 800;
let removalTimeout = null;
let dotsInterval = null;
let bootTime = 0;

function createLoaderDOM() {
  const existing = document.getElementById(LOADER_ID);
  if (existing) existing.remove();
  const loader = document.createElement("div");
  loader.id = LOADER_ID;
  
  // Apply inline styles to mimic v3-hero but fix it to the screen
  loader.style.position = "fixed";
  loader.style.top = "0";
  loader.style.left = "0";
  loader.style.width = "100vw";
  loader.style.height = "100vh";
  loader.style.zIndex = "9999";
  loader.style.display = "flex";
  loader.style.alignItems = "center";
  loader.style.justifyContent = "center";
  loader.style.background = "var(--bg, #030303)";
  loader.style.color = "var(--text-main, #f5f5f7)";
  loader.style.transition = "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
  
  loader.innerHTML = `
    <div class="v3-hero v3-container" style="display: flex; align-items: center; justify-content: center; height: 100%;">
      <div class="v3-hero-content reveal-up" style="text-align: center; max-width: 800px; padding: 2rem;">
        <p class="eyebrow" style="margin-bottom: 1rem; color: var(--accent-1, #4facfe);">Initializing</p>
        <h1 style="font-size: clamp(2.5rem, 6vw, 5rem); margin-bottom: 1.5rem; background: linear-gradient(135deg, var(--text-main), var(--text-muted)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Sameer OS</h1>
        <p class="lede" style="margin: 0 auto 3rem auto;">
          Connecting to the void<span class="loader-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>
        </p>
      
      <div style="display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-1, #4facfe); padding: 0.5rem 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 9999px;">content graph</span>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-2, #00f2fe); padding: 0.5rem 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 9999px;">AI signal</span>
        <span style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted, #a1a1a6); padding: 0.5rem 1rem; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 9999px;">interface ready</span>
      </div>
    </div>
  `;
  document.body.prepend(loader);

  // JS-driven dot cycling (cross-browser safe)
  let dotStep = 0;
  const dots = loader.querySelectorAll(".dot");
  if (dotsInterval) { clearInterval(dotsInterval); dotsInterval = null; }
  dotsInterval = setInterval(() => {
    dotStep = (dotStep + 1) % 4;
    dots.forEach((d, i) => { d.style.opacity = i < dotStep ? "1" : "0"; });
  }, 300);
}

export function bootLoader() {
  if (removalTimeout != null) { clearTimeout(removalTimeout); removalTimeout = null; }
  bootTime = Date.now();
  createLoaderDOM();

  // Safety: auto-dismiss after 6s in case dismissLoader is never called
  removalTimeout = setTimeout(() => dismissLoader(), 6000);
}

function fadeAndRemove() {
  if (dotsInterval) { clearInterval(dotsInterval); dotsInterval = null; }
  const loader = document.getElementById(LOADER_ID);
  if (!loader) return;
  loader.style.opacity = "0";
  loader.style.transform = "scale(1.02)";
  removalTimeout = setTimeout(() => { loader.remove(); removalTimeout = null; }, 600);
}

export function dismissLoader() {
  if (removalTimeout != null) { clearTimeout(removalTimeout); removalTimeout = null; }
  const elapsed = Date.now() - bootTime;
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  if (remaining > 0) {
    removalTimeout = setTimeout(fadeAndRemove, remaining);
  } else {
    fadeAndRemove();
  }
}
