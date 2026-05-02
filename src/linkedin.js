import { bootInteractions } from "./animations.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { escapeHtml, mountShell, renderLinkedInCards } from "./render.js";
import { bootTheme } from "./theme.js";

function renderPage() {
  const { linkedinPosts, profile } = getSiteContent();
  document.querySelector("#linkedin-root").innerHTML = `
    <section class="page-hero linkedin-hero">
      <p class="eyebrow">LinkedIn showcase</p>
      <h1>Public posts that show how the work is communicated.</h1>
      <p class="lede">
        Curated highlights from ${escapeHtml(profile.name)} with polished cards and optional official public LinkedIn embeds.
      </p>
      <div class="hero-actions">
        <a class="primary-link" href="${profile.socials.find((link) => link.label === "LinkedIn")?.href || "https://linkedin.com"}" target="_blank" rel="noreferrer">Open LinkedIn profile</a>
      </div>
    </section>

    <section class="linkedin-stats" data-animate="fade-up">
      <article>
        <strong>${linkedinPosts.length}</strong>
        <span>curated posts</span>
      </article>
      <article>
        <strong>${linkedinPosts.filter((post) => post.featured).length}</strong>
        <span>featured on home</span>
      </article>
      <article>
        <strong>${linkedinPosts.filter((post) => post.embedHtml).length}</strong>
        <span>native embeds</span>
      </article>
    </section>

    <section class="section">
      <div class="section-header" data-animate="fade-up">
        <div>
          <p class="eyebrow">Posts</p>
          <h2>LinkedIn cards with graceful embed fallback.</h2>
        </div>
        <p>Public LinkedIn embeds can be added from the protected admin area when a post supports LinkedIn's embed option.</p>
      </div>
      <div class="linkedin-grid linkedin-grid-wide">
        ${renderLinkedInCards(false, { embed: true })}
      </div>
    </section>
  `;
  bootInteractions(document.querySelector("#linkedin-root"));
}

await initSiteContent();
mountShell("linkedin");
bootTheme();
renderPage();
