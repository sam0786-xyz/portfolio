import { getSiteContent } from "./content-store.js";

export const pages = [
  { label: "Workbench", href: "/", id: "home" },
  { label: "Focus OS", href: "/focus/", id: "focus" },
  { label: "Certificates", href: "/certificates/", id: "certificates" },
  { label: "Blog", href: "/blog/", id: "blog" },
  { label: "LinkedIn", href: "/linkedin/", id: "linkedin" }
];

export function icon(name) {
  const icons = {
    download: "M12 3v10m0 0 4-4m-4 4-4-4M5 17v3h14v-3",
    cms: "M4 6h16M4 12h16M4 18h10",
    focus: "M12 8v4l3 2M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    spark: "M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z",
    check: "M20 6L9 17l-5-5",
    tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
    mail: "M4 4h16v16H4zM4 7l8 6 8-6",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.34 1.9.63 2.8a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.29 1.84.5 2.8.63A2 2 0 0 1 22 16.92z",
    linkedin: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 4a2 2 0 1 0 0.01 0",
    github: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-6.5.08-1.6-.5-3.13-1.6-4.3.15-1.3.15-2.6-.1-3.7 0 0-1.3-.4-4.3 1.6a14.7 14.7 0 0 0-8 0C3 .1 1.7.5 1.7.5c-.25 1.1-.25 2.4-.1 3.7A6.3 6.3 0 0 0 0 8.5C0 13 3 15 6 15a4.8 4.8 0 0 0-1 3.5V22",
    link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.spark}"></path></svg>`;
}

const skillIcons = {
  "generative ai": "M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z",
  "rag": "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
  "langchain": "M13.19 8.69a4.5 4.5 0 0 1 1.81 7.28l-4.24 4.25a4.5 4.5 0 1 1-6.36-6.36l.71-.71M10.81 15.31a4.5 4.5 0 0 1-1.81-7.28l4.24-4.25a4.5 4.5 0 1 1 6.36 6.36l-.71.71",
  "gemini llms": "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z",
  "scikit-learn": "M22 12h-4l-3 9L9 3l-3 9H2",
  "tensorflow": "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  "python": "M12 2C6.48 2 2 3.79 2 6v3c0 2.21 4.48 4 10 4s10-1.79 10-4V6c0-2.21-4.48-4-10-4zM2 12v3c0 2.21 4.48 4 10 4s10-1.79 10-4v-3",
  "c++": "M6 3v18h12V9l-6-6H6zM14 3v6h6M9 13h6M12 10v6",
  "java": "M8 21s-1-1-1-4c0-3 3-3 3-3s1 0 2 1l2-2s-1-2-4-2-5 3-5 5 3 5 3 5zM12 3s6 2 6 10c0 4-2 5-2 5",
  "sql": "M12 8c-3.31 0-6 1.34-6 3v6c0 1.66 2.69 3 6 3s6-1.34 6-3v-6c0-1.66-2.69-3-6-3zM6 11c0 1.66 2.69 3 6 3s6-1.34 6-3",
  "fastapi": "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "jwt authentication": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "aws": "M2 20h20M7 20V8l5-5 5 5v12",
  "gcp": "M4.5 16.5c-1.5 0-2.5-1-2.5-2.5s1-2.5 2.5-2.5c.3 0 .5 0 .8.1C6 9.4 8 8 10.5 8c3 0 5.5 2 6 4.5.4 0 .8-.1 1.2-.1 2 0 3.8 1.5 3.8 3.5S19.7 19.5 17.7 19.5H4.5",
  "azure": "M13 3l-8 16h6l-1.5-4L18 3H13zM8 19l3-6 5 6H8z",
  "dynamodb": "M12 3c-4.42 0-8 1.34-8 3s3.58 3 8 3 8-1.34 8-3-3.58-3-8-3zM4 9c0 1.66 3.58 3 8 3s8-1.34 8-3M4 15c0 1.66 3.58 3 8 3s8-1.34 8-3M4 9v12c0 1.66 3.58 3 8 3s8-1.34 8-3V9",
  "qdrant": "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "elevenlabs": "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  "twilio": "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.34 1.9.63 2.8a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.29 1.84.5 2.8.63A2 2 0 0 1 22 16.92z"
};

export function skillIcon(name) {
  const key = name.toLowerCase();
  const path = skillIcons[key] || skillIcons["generative ai"];
  return `<svg class="skill-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(value) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
}

export function mountShell(active) {
  const { profile } = getSiteContent();
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");
  if (header) {
    header.innerHTML = `
      <a class="brand-mark" href="/" aria-label="Mohammad Sameer home">
        <span class="brand-sigil">MS</span>
        <span>
          <strong>Mohammad Sameer</strong>
          <small>AI/ML Engineer</small>
        </span>
      </a>
      <nav class="site-nav" aria-label="Primary navigation">
        ${pages
          .map(
            (page) => `
              <a class="${page.id === active ? "is-active" : ""}" href="${page.href}">
                ${page.label}
              </a>
            `
          )
          .join("")}
      </nav>
      <button class="theme-toggle" type="button" data-theme-toggle>
        <span class="toggle-track" aria-hidden="true">
          <span class="toggle-orbit"></span>
          <span class="toggle-core"></span>
        </span>
      </button>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <div>
        <strong>© ${new Date().getFullYear()} ${profile.name}</strong>
        <p>Built with curiosity and AI agents.</p>
      </div>
      <div class="footer-links">
        ${profile.socials
          .map((link) => `<a href="${link.href}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>${link.label}</a>`)
          .join("")}
      </div>
    `;
  }
}

export function renderPills(items) {
  return items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
}

export function renderContactLinks() {
  const { profile } = getSiteContent();
  return profile.socials
    .map(
      (link) => `
        <a class="command-link" href="${link.href}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>
          <span>${link.label}</span>
          <span aria-hidden="true">-&gt;</span>
        </a>
      `
    )
    .join("");
}

export function renderCertificateCard(certificate) {
  const hasLink = Boolean(certificate.verificationUrl);
  return `
    <article class="credential-card">
      <div class="credential-media ${certificate.mediaUrl ? "" : "is-empty"}">
        ${
          certificate.mediaUrl
            ? `<img src="${certificate.mediaUrl}" alt="${escapeHtml(certificate.title)} certificate preview">`
            : `<span>Verified link ready</span>`
        }
      </div>
      <div class="credential-body">
        <p class="eyebrow">${escapeHtml(certificate.issuer)} / ${formatDate(certificate.issuedAt)}</p>
        <h3>${escapeHtml(certificate.title)}</h3>
        <p>${escapeHtml(certificate.summary)}</p>
        <div class="tag-row">${renderPills(certificate.skills)}</div>
        <a class="verify-link ${hasLink ? "" : "is-disabled"}" href="${hasLink ? certificate.verificationUrl : "#"}" ${hasLink ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>
          ${hasLink ? "Verify credential" : "Add verification URL"}
        </a>
      </div>
    </article>
  `;
}

export function renderCertificates(featuredOnly = false) {
  const { certificates } = getSiteContent();
  const list = featuredOnly ? certificates.filter((certificate) => certificate.featured) : certificates;
  return list.map(renderCertificateCard).join("");
}

export function renderBlogCard(post) {
  return `
    <article class="blog-card">
      <img src="${post.cover}" alt="" loading="lazy">
      <div>
        <p class="eyebrow">${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.date))} / ${post.readingTime}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <div class="tag-row">${renderPills(post.tags)}</div>
        <a class="text-link" href="/blog/${post.slug}/">Read field note</a>
      </div>
    </article>
  `;
}

export function renderBlogCards() {
  const { blogPosts } = getSiteContent();
  return blogPosts.map(renderBlogCard).join("");
}

export function renderLinkedInCard(post, options = {}) {
  return `
    <article class="linkedin-card" data-animate="fade-up">
      <div class="linkedin-fallback">
        <div class="linkedin-mark" aria-hidden="true">in</div>
        <p class="eyebrow">${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.publishedAt))}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary)}</p>
        <div class="tag-row">${(post.tags || []).map(item => `<span class="pill">${icon("tag")}&nbsp;${escapeHtml(item)}</span>`).join("")}</div>
      </div>
      <a class="text-link" href="${post.url}" target="_blank" rel="noreferrer">Open on LinkedIn</a>
    </article>
  `;
}

export function renderLinkedInCards(featuredOnly = false, options = {}) {
  const { linkedinPosts } = getSiteContent();
  const posts = featuredOnly ? linkedinPosts.filter((post) => post.featured) : linkedinPosts;
  if (!posts.length) {
    return `<article class="empty-state" data-animate="fade-up"><h3>No LinkedIn posts yet</h3><p>Add public LinkedIn post links.</p></article>`;
  }
  return posts.map((post) => renderLinkedInCard(post, options)).join("");
}

export function getPostFromLocation() {
  const { blogPosts } = getSiteContent();
  if (!blogPosts.length) {
    return {
      slug: "empty",
      title: "No posts yet",
      excerpt: "Add a published blog post.",
      date: new Date().toISOString().slice(0, 10),
      tags: ["Draft"],
      cover: "/assets/neural-console.png",
      readingTime: "1 min read",
      body: "<p>Add a post to publish writing here.</p>"
    };
  }
  const parts = window.location.pathname.split("/").filter(Boolean);
  const slug = parts.at(-1) || blogPosts[0].slug;
  return blogPosts.find((post) => post.slug === slug) || blogPosts[0];
}
