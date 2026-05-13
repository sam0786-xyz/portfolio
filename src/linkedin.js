import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { initSiteContent } from "./content-store.js";
import { mountShell, renderLinkedInCards } from "./render.js";
import { bootTheme } from "./theme.js";

function renderPage() {
  document.querySelector("#linkedin-root").innerHTML = `
    <section class="section linkedin-posts-only" aria-label="LinkedIn posts">
      <div class="linkedin-grid linkedin-grid-wide">
        ${renderLinkedInCards(false, { embed: true })}
      </div>
    </section>
  `;
  bootInteractions(document.querySelector("#linkedin-root"));
}

bootLoader();
await initSiteContent();
mountShell("linkedin");
bootTheme();
renderPage();
dismissLoader();
