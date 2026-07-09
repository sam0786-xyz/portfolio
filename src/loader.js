/**
 * Global page loader control.
 *
 * The lightweight #globalLoader spinner is inlined directly in each page's
 * HTML, so it paints on first byte with zero JS. These helpers just dismiss
 * that same element once the app module has finished its first render — there
 * is no second full-screen overlay and no artificial minimum display time,
 * which previously stacked two loaders and hid the SSR content for ~800ms on
 * every navigation.
 */

const LOADER_ID = "globalLoader";

export function bootLoader() {
  // The inline #globalLoader is already visible from the initial HTML.
  // Nothing to construct here — kept for a stable call site across entries.
}

export function dismissLoader() {
  const loader = document.getElementById(LOADER_ID);
  if (!loader) return;
  loader.classList.add("hidden");
  window.setTimeout(() => loader.remove(), 500);
}
