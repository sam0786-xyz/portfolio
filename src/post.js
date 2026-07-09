import { bootLoader, dismissLoader } from "./loader.js";
import { bootTheme } from "./theme.js";
import { initSiteContent, getSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, getPostFromLocation, mountShell, renderPills } from "./render.js";
import { renderBlogReactions } from "./blog-reactions.js";

/* ═══ Build Table of Contents from headings ═══ */

function buildToc(container) {
  const headings = container.querySelectorAll("h2, h3");
  if (headings.length < 2) return "";
  const items = [];
  headings.forEach((h, i) => {
    const id = `heading-${i}`;
    h.id = id;
    const isSub = h.tagName === "H3";
    items.push(`<a class="toc-link" href="#${id}" style="display: block; padding: 0.25rem 0; color: var(--text-muted); font-size: 0.9rem; margin-left: ${isSub ? '1rem' : '0'}; text-decoration: none; transition: color 0.3s;">${escapeHtml(h.textContent)}</a>`);
  });
  return `
    <nav class="v3-card" aria-label="Table of contents" style="position: sticky; top: 4rem;">
      <h3 class="mono-text" style="color: var(--accent-1); margin-bottom: 1rem; text-transform: uppercase;">Contents</h3>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        ${items.join("")}
      </div>
    </nav>
  `;
}

/* ═══ Share buttons ═══ */

function shareButtons(post) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(post.title);
  return `
    <div style="display: flex; align-items: center; gap: 1rem; margin-top: 2rem;">
      <span class="mono-text" style="color: var(--text-dark);">SHARE</span>
      <button class="v3-btn v3-btn-glass" data-share="copy" title="Copy link" aria-label="Copy link" style="padding: 0.5rem; border-radius: 50%;">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <a class="v3-btn v3-btn-glass" href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" rel="noreferrer" title="Share on X" aria-label="Share on X" style="padding: 0.5rem; border-radius: 50%;">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-7-8.5L19.5 4H18l-5 6.2L9 4z" fill="currentColor"/></svg>
      </a>
      <a class="v3-btn v3-btn-glass" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noreferrer" title="Share on LinkedIn" aria-label="Share on LinkedIn" style="padding: 0.5rem; border-radius: 50%;">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="9" width="4" height="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </a>
    </div>
  `;
}



/* ═══ Load Mermaid from CDN ═══ */

async function renderMermaidBlocks(container) {
  const blocks = container.querySelectorAll("pre.mermaid");
  if (!blocks.length) return;
  try {
    const { default: mermaid } = await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
      fontFamily: "Inter, sans-serif"
    });
    await mermaid.run({ nodes: blocks });
  } catch (e) {
    console.warn("Mermaid rendering failed:", e);
  }
}

/* ═══ Load Prism for code highlighting ═══ */

async function highlightCode(container) {
  const codeBlocks = container.querySelectorAll("pre code");
  if (!codeBlocks.length) return;

  // Resolve theme-appropriate stylesheet
  const getThemeName = () => document.documentElement.dataset.theme === "dark" ? "prism-tomorrow" : "prism";
  let link = document.querySelector("link[data-prism-theme]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.prismTheme = "";
    link.href = `https://cdn.jsdelivr.net/npm/prismjs@1/themes/${getThemeName()}.min.css`;
    document.head.appendChild(link);

    // Watch for theme toggles and update the stylesheet
    new MutationObserver(() => {
      link.href = `https://cdn.jsdelivr.net/npm/prismjs@1/themes/${getThemeName()}.min.css`;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  try {
    const Prism = window.Prism || (await import("https://cdn.jsdelivr.net/npm/prismjs@1/prism.min.js").then(() => window.Prism));
    if (Prism) Prism.highlightAllUnder(container);
  } catch (e) {
    console.warn("Prism highlighting failed:", e);
  }
}

/* ═══ Reading progress bar ═══ */

function initProgressBar() {
  const bar = document.createElement("div");
  bar.className = "reading-progress";
  bar.innerHTML = `<div class="reading-progress-bar"></div>`;
  document.body.appendChild(bar);

  const fill = bar.querySelector(".reading-progress-bar");
  const article = document.querySelector(".article-body");
  if (!article) return;

  const update = () => {
    const rect = article.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    // Short posts (article shorter than the viewport) have nothing to scroll —
    // avoid dividing by zero/negative, which produced NaN width.
    const progress = total <= 0 ? (rect.top <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / total));
    fill.style.width = `${(progress * 100).toFixed(1)}%`;
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

/* ═══ TOC active tracking ═══ */

function initTocTracking() {
  const links = document.querySelectorAll(".toc-link");
  if (!links.length) return;
  const headingIds = Array.from(links).map(a => a.getAttribute("href").replace("#", ""));

  const update = () => {
    let activeId = headingIds[0];
    for (const id of headingIds) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 120) activeId = id;
    }
    links.forEach(a => a.classList.toggle("is-active", a.getAttribute("href") === `#${activeId}`));
  };
  window.addEventListener("scroll", update, { passive: true });
  update();
}

function renderPost() {
  const post = getPostFromLocation();
  document.title = `${post.title} | Mohammad Sameer`;
  const root = document.querySelector("#post-root");
  const dateStr = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(post.date));

  // Find prev/next posts
  const { blogPosts } = getSiteContent();
  const published = blogPosts.filter(p => p.published !== false);
  const currentIdx = published.findIndex(p => p.slug === post.slug);
  const prevPost = currentIdx > 0 ? published[currentIdx - 1] : null;
  const nextPost = currentIdx < published.length - 1 ? published[currentIdx + 1] : null;

  root.innerHTML = `
    <article class="v3-section v3-container reveal-up" style="max-width: 960px; margin: 0 auto;">
      <header style="margin-bottom: var(--space-5); text-align: center;">
        <div class="v3-tags" style="justify-content: center; margin-bottom: var(--space-3);">
          ${(post.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
        </div>
        <h1 style="margin-bottom: var(--space-2);">${escapeHtml(post.title)}</h1>
        <p class="lede" style="margin: 0 auto var(--space-3);">${escapeHtml(post.excerpt)}</p>
        <span class="mono-text">${dateStr} · ${post.readingTime}</span>
        ${shareButtons(post)}
      </header>

      <img class="article-cover" src="${escapeHtml(post.cover)}" alt="" style="width: 100%; border-radius: var(--radius-xl); margin-bottom: var(--space-6); border: 1px solid var(--glass-border);">

      <div class="article-layout">
        <div class="article-body" data-article-body>
          ${post.body}
        </div>
        <aside class="article-toc" data-article-sidebar></aside>
      </div>

      <!-- Author card -->
      <div class="v3-author-card">
        <div class="v3-author-avatar">MS</div>
        <div>
          <strong style="font-family: var(--font-display); display: block;">Mohammad Sameer</strong>
          <span class="mono-text" style="font-size: 0.8rem;">AI/ML Engineer · Generative AI</span>
        </div>
      </div>

      <!-- Post navigation -->
      ${(prevPost || nextPost) ? `
        <nav class="v3-post-nav" aria-label="Post navigation">
          ${prevPost ? `
            <a class="v3-post-nav-card" href="/blog/${prevPost.slug}/">
              <span class="v3-post-nav-label">← Previous</span>
              <span class="v3-post-nav-title">${escapeHtml(prevPost.title)}</span>
            </a>` : '<div></div>'}
          ${nextPost ? `
            <a class="v3-post-nav-card" href="/blog/${nextPost.slug}/" style="text-align: right;">
              <span class="v3-post-nav-label">Next →</span>
              <span class="v3-post-nav-title">${escapeHtml(nextPost.title)}</span>
            </a>` : '<div></div>'}
        </nav>
      ` : ''}
    </article>
  `;

  // Build TOC and insert into sidebar
  const body = root.querySelector("[data-article-body]");
  const sidebar = root.querySelector("[data-article-sidebar]");
  sidebar.innerHTML = buildToc(body);

  // Reactions
  renderBlogReactions(body, post.slug);

  // Bottom share
  body.insertAdjacentHTML("beforeend", shareButtons(post));

  // Progress bar
  initProgressBar();

  // TOC active tracking
  initTocTracking();

  // Async: Mermaid + code highlighting
  renderMermaidBlocks(body);
  highlightCode(body);

  // Copy link handler
  root.querySelectorAll('[data-share="copy"]').forEach(btn => {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href);
      btn.title = "Copied!";
      setTimeout(() => { btn.title = "Copy link"; }, 2000);
    });
  });
}

bootLoader();
await initSiteContent();
mountShell("blog");
bootTheme();
renderPost();
bootInteractions(document.querySelector("#post-root"));
dismissLoader();
