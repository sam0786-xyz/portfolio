import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { initSiteContent } from "./content-store.js";
import { icon, mountShell, renderLinkedInCards } from "./render.js";
import { bootTheme } from "./theme.js";

function renderPage() {
  document.querySelector("#linkedin-root").innerHTML = `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content reveal-up">
        <span class="eyebrow">LinkedIn / Public Thinking</span>
        <h1>Short-form updates from the AI build cycle.</h1>
        <p class="lede">Selected posts, progress notes, and community updates from Mohammad Sameer's LinkedIn feed.</p>
        <div class="v3-hero-ctas">
          <a class="v3-btn v3-btn-primary" href="https://linkedin.com/in/connect-to-sam-xyz" target="_blank" rel="noreferrer">Connect on LinkedIn</a>
          <a class="v3-btn v3-btn-glass" href="/blog/">Read long-form notes</a>
        </div>
      </div>
    </section>
    
    <section class="v3-section v3-container">
      <div class="v3-minimal-list">
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
