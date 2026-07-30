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

function getLoader() {
  return document.getElementById(LOADER_ID);
}

export function showLoader() {
  const loader = getLoader();
  if (!loader) return;
  loader.classList.remove("hidden");
  loader.setAttribute("aria-hidden", "false");
  document.body?.setAttribute("aria-busy", "true");
}

function isSameDocumentNavigation(link, event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return true;
  if (link.target && link.target !== "_self") return true;
  if (link.hasAttribute("download") || link.dataset.noLoader !== undefined) return true;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) return true;

  const target = new URL(link.href, window.location.href);
  if (target.origin !== window.location.origin) return true;
  return target.pathname === window.location.pathname && target.search === window.location.search && target.hash !== "";
}

export function bootLoader() {
  // Paint immediately on normal document navigations, including links shared
  // by every page. Hash links, downloads and external links remain untouched.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || isSameDocumentNavigation(link, event)) return;
    showLoader();
  });

  // A back/forward-cache restore does not re-run every module reliably.
  window.addEventListener("pageshow", () => dismissLoader());
}

export function dismissLoader() {
  window.__portfolioLoaderReady = true;
  const loader = getLoader();
  if (!loader) return;
  loader.classList.add("hidden");
  loader.setAttribute("aria-hidden", "true");
  document.body?.removeAttribute("aria-busy");
  window.setTimeout(() => loader.remove(), 500);
}
