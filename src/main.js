import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootTheme } from "./theme.js";
import { mountShell } from "./render.js";
import { renderHomeMarkup } from "./home-view.js";

function renderHome() {
  const root = document.querySelector("#home-root");
  if (!root) return;
  root.innerHTML = renderHomeMarkup(getSiteContent());
  bootInteractions(root);
}

bootLoader();
await initSiteContent();
mountShell("home");
bootTheme();
renderHome();
dismissLoader();
