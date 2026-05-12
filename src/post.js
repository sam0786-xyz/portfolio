import { bootLoader, dismissLoader } from "./loader.js";
import { bootTheme } from "./theme.js";
import { initSiteContent } from "./content-store.js";
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
    const level = h.tagName === "H3" ? "toc-sub" : "";
    items.push(`<a class="toc-link ${level}" href="#${id}">${escapeHtml(h.textContent)}</a>`);
  });
  return `
    <nav class="post-toc" aria-label="Table of contents">
      <p class="toc-title">Contents</p>
      ${items.join("")}
    </nav>
  `;
}

/* ═══ Share buttons ═══ */

function shareButtons(post) {
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(post.title);
  return `
    <div class="share-bar">
      <span class="share-label">Share</span>
      <button class="share-btn" data-share="copy" title="Copy link" aria-label="Copy link">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <a class="share-btn" href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" rel="noreferrer" title="Share on X" aria-label="Share on X">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-7-8.5L19.5 4H18l-5 6.2L9 4z" fill="currentColor"/></svg>
      </a>
      <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noreferrer" title="Share on LinkedIn" aria-label="Share on LinkedIn">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" fill="none" stroke="currentColor" stroke-width="2"/><rect x="2" y="9" width="4" height="12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="4" r="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
      </a>
    </div>
  `;
}

/* ═══ Citation footnotes — add backlinks ═══ */

function processCitations(container) {
  const refs = container.querySelectorAll(".cite-ref a");
  refs.forEach((a, i) => {
    const id = `cite-ref-${i}`;
    a.id = id;
    // Find matching citation item and add backlink
    const targetId = a.getAttribute("href")?.replace("#", "");
    if (targetId) {
      const target = container.querySelector(`#${targetId}`);
      if (target) {
        const back = document.createElement("a");
        back.href = `#${id}`;
        back.className = "cite-back";
        back.textContent = "↩";
        back.title = "Back to text";
        target.appendChild(back);
      }
    }
  });
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
  // Load Prism CSS + JS from CDN
  if (!document.querySelector('link[href*="prism"]')) {
    const theme = document.documentElement.dataset.theme === "dark" ? "prism-tomorrow" : "prism";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://cdn.jsdelivr.net/npm/prismjs@1/themes/${theme}.min.css`;
    document.head.appendChild(link);
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
    const progress = Math.min(1, Math.max(0, -rect.top / total));
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

/* ═══ Render ═══ */

function renderPost() {
  const post = getPostFromLocation();
  document.title = `${post.title} | Mohammad Sameer`;
  const root = document.querySelector("#post-root");
  const dateStr = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(post.date));

  root.innerHTML = `
    <article class="article-shell">
      <header class="article-header">
        <p class="eyebrow">${dateStr} · ${post.readingTime}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="article-excerpt">${escapeHtml(post.excerpt)}</p>
        <div class="tag-row">${renderPills(post.tags)}</div>
        ${shareButtons(post)}
      </header>
      <img class="article-cover" src="${post.cover}" alt="">
      <div class="article-layout">
        <div class="article-body" data-article-body>
          ${post.body}
        </div>
        <aside class="article-sidebar" data-article-sidebar></aside>
      </div>
    </article>
  `;

  // Build TOC and insert into sidebar
  const body = root.querySelector("[data-article-body]");
  const sidebar = root.querySelector("[data-article-sidebar]");
  sidebar.innerHTML = buildToc(body);

  // Process citations
  processCitations(body);

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
