import { bootTheme } from "./theme.js";
import { initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { mountShell, renderBlogCards } from "./render.js";

function renderPage() {
  document.querySelector("#blog-root").innerHTML = `
    <section class="page-hero">
      <p class="eyebrow">Blog</p>
      <h1>Field notes from AI/ML learning and building.</h1>
      <p class="lede">
        Essays, experiments, diagrams, and implementation notes that show how the work is reasoned through.
      </p>
      <div class="hero-actions">
        <a class="primary-link" href="/#writing">Featured writing</a>
      </div>
    </section>
    <section class="blog-grid" aria-label="Blog posts">${renderBlogCards()}</section>
  `;
}

await initSiteContent();
mountShell("blog");
bootTheme();
renderPage();
bootInteractions(document.querySelector("#blog-root"));
