import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { initSiteContent } from "./content-store.js";
import { icon, mountShell, renderLinkedInCards } from "./render.js";
import { bootTheme } from "./theme.js";

function renderPage() {
  document.querySelector("#linkedin-root").innerHTML = `
    <section class="page-hero page-hero-pro linkedin-hero">
      <p class="eyebrow">LinkedIn / Public Thinking</p>
      <h1>Short-form updates from the AI build cycle.</h1>
      <p class="lede">Selected posts, progress notes, and community updates from Mohammad Sameer's LinkedIn feed.</p>
      <div class="hero-actions">
        <a class="primary-link" href="https://linkedin.com/in/connect-to-sam-xyz" target="_blank" rel="noreferrer">${icon("linkedin")} Connect on LinkedIn</a>
        <a class="secondary-link" href="/blog/">${icon("arrow")} Read long-form notes</a>
      </div>
    </section>
    <section class="section linkedin-posts-only" aria-label="LinkedIn posts">
      <div class="section-header">
        <div>
          <p class="eyebrow">Highlights</p>
          <h2>Feed snapshots</h2>
        </div>
        <p>Embedded posts appear when LinkedIn allows them; each card always links back to the original post.</p>
      </div>
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
