import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootTheme } from "./theme.js";
import { mountShell } from "./render.js";
import { renderHomeMarkup } from "./home-view.js";
import { mountGithubRepos } from "./github-repos.js";

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

// Progressive enhancement — fills the GitHub section if the API responds,
// otherwise the section stays hidden. Never blocks first render.
mountGithubRepos(document);
