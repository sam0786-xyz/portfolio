import { bootLoader, dismissLoader } from "./loader.js";
import { bootTheme } from "./theme.js";
import { initSiteContent, getSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, mountShell, renderBlogCard } from "./render.js";

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
    const matchesTag = activeTag === "All" || (p.tags || []).includes(activeTag);
    const matchesSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery) || p.excerpt.toLowerCase().includes(searchQuery) || (p.tags || []).some(t => t.toLowerCase().includes(searchQuery));
    return matchesTag && matchesSearch;
  });
}

function renderTagBar() {
  const tags = getAllTags();
  return `
    <div class="blog-filter-bar">
      <div class="blog-search-wrap">
        <svg class="blog-search-icon" viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        <input class="blog-search" type="search" placeholder="Search posts..." data-blog-search aria-label="Search blog posts">
      </div>
      <div class="blog-tags" role="tablist" aria-label="Filter by tag">
        ${tags.map(tag => {
          const safe = escapeHtml(tag);
          return `<button class="blog-tag-btn ${tag === activeTag ? "is-active" : ""}" type="button" role="tab" aria-selected="${tag === activeTag}" data-tag="${safe}">${safe}</button>`;
        }).join("")}
      </div>
    </div>
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
    ${renderTagBar()}
    <section class="blog-grid" data-blog-grid aria-label="Blog posts"></section>
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
