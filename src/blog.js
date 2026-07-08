import { bootLoader, dismissLoader } from "./loader.js";
import { bootTheme } from "./theme.js";
import { initSiteContent, getSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, icon, mountShell, renderBlogCard } from "./render.js";

let activeTag = "All";
let searchQuery = "";

function getAllTags() {
  const { blogPosts } = getSiteContent();
  const tagSet = new Set();
  blogPosts.forEach(p => (p.tags || []).forEach(t => tagSet.add(t)));
  return ["All", ...Array.from(tagSet).sort()];
}

function getFilteredPosts() {
  const { blogPosts } = getSiteContent();
  return blogPosts.filter(p => {
    if (p.published === false) return false;
    const matchesTag = activeTag === "All" || (p.tags || []).includes(activeTag);
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery) || p.excerpt.toLowerCase().includes(searchQuery) || (p.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    return matchesTag && matchesSearch;
  });
}

function renderTagBar() {
  const tags = getAllTags();
  return `
    <section class="v3-container" style="margin-bottom: var(--space-4);">
      <div class="v3-split" style="align-items: center; gap: var(--space-3);">
        <div style="flex: 1; max-width: 400px; position: relative;">
          <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input class="v3-input" type="search" placeholder="Search posts..." data-blog-search aria-label="Search blog posts" style="padding-left: 3rem;">
        </div>
        <div class="v3-tags" role="tablist" aria-label="Filter by tag" style="margin-top: 0; display: flex; align-items: center; gap: var(--space-2); overflow-x: auto; padding-bottom: 0.5rem;">
          ${tags.map(tag => {
            const safe = escapeHtml(tag);
            return `<button class="v3-tag ${tag === activeTag ? "is-active" : ""}" style="cursor: pointer;" type="button" role="tab" aria-selected="${tag === activeTag}" data-tag="${safe}">${safe}</button>`;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderGrid() {
  const posts = getFilteredPosts();
  const grid = document.querySelector("[data-blog-grid]");
  if (!grid) return;
  grid.innerHTML = posts.length
    ? posts.map(renderBlogCard).join("")
    : `<div class="empty-state"><h3>No posts found</h3><p>Try a different tag or search term.</p></div>`;
  bootInteractions(grid);
}

function renderPage() {
  document.querySelector("#blog-root").innerHTML = `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content reveal-up">
        <span class="eyebrow">Writing / Build Logs</span>
        <h1>AI systems, explained from the workbench.</h1>
        <p class="lede">
          Practical notes on Generative AI, RAG, product architecture, evaluation, and the decisions behind real implementations.
        </p>
      </div>
    </section>
    ${renderTagBar()}
    <section class="v3-section v3-container">
      <div class="v3-minimal-list" data-blog-grid aria-label="Blog posts"></div>
    </section>
  `;
  renderGrid();
  setupFilterEvents();
}

function setupFilterEvents() {
  document.querySelectorAll("[data-tag]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTag = btn.dataset.tag;
      document.querySelectorAll("[data-tag]").forEach(b => {
        b.classList.toggle("is-active", b.dataset.tag === activeTag);
        b.setAttribute("aria-selected", b.dataset.tag === activeTag);
      });
      renderGrid();
    });
  });

  document.querySelector("[data-blog-search]")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderGrid();
  });
}

bootLoader();
await initSiteContent();
mountShell("blog");
bootTheme();
renderPage();
bootInteractions(document.querySelector("#blog-root"));
dismissLoader();
