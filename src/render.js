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

const skillLogos = {
  "generative ai": "https://cdn.simpleicons.org/openai/52c7b8",
  "rag": "https://cdn.simpleicons.org/readthedocs/52c7b8",
  "langchain": "https://cdn.simpleicons.org/langchain/52c7b8",
  "gemini llms": "https://cdn.simpleicons.org/googlegemini/52c7b8",
  "scikit-learn": "https://cdn.simpleicons.org/scikitlearn/52c7b8",
  "tensorflow": "https://cdn.simpleicons.org/tensorflow/52c7b8",
  "python": "https://cdn.simpleicons.org/python/52c7b8",
  "c++": "https://cdn.simpleicons.org/cplusplus/52c7b8",
  "java": "https://cdn.simpleicons.org/oracle/52c7b8",
  "sql": "https://cdn.simpleicons.org/postgresql/52c7b8",
  "fastapi": "https://cdn.simpleicons.org/fastapi/52c7b8",
  "jwt authentication": "https://cdn.simpleicons.org/jsonwebtokens/52c7b8",
  "aws": "https://cdn.simpleicons.org/amazonaws/52c7b8",
  "gcp": "https://cdn.simpleicons.org/googlecloud/52c7b8",
  "azure": "https://cdn.simpleicons.org/microsoftazure/52c7b8",
  "dynamodb": "https://cdn.simpleicons.org/amazondynamodb/52c7b8",
  "qdrant": "https://cdn.simpleicons.org/qdrant/52c7b8",
  "elevenlabs": "https://cdn.simpleicons.org/elevenlabs/52c7b8",
  "twilio": "https://cdn.simpleicons.org/twilio/52c7b8",
  "next.js": "https://cdn.simpleicons.org/nextdotjs/52c7b8",
  "typescript": "https://cdn.simpleicons.org/typescript/52c7b8",
  "tailwind css": "https://cdn.simpleicons.org/tailwindcss/52c7b8",
  "framer motion": "https://cdn.simpleicons.org/framer/52c7b8",
  "supabase": "https://cdn.simpleicons.org/supabase/52c7b8",
  "resend": "https://cdn.simpleicons.org/resend/52c7b8",
  "gmail api": "https://cdn.simpleicons.org/gmail/52c7b8",
  "gemini 2.5 flash": "https://cdn.simpleicons.org/googlegemini/52c7b8",
  "gemini": "https://cdn.simpleicons.org/googlegemini/52c7b8",
  "pydub": "https://cdn.simpleicons.org/python/52c7b8"
};

export function skillIcon(name) {
  const key = (typeof name === "string" && name) ? name.toLowerCase() : "";
  const url = skillLogos[key] || skillLogos["generative ai"];
  return `<img class="skill-svg" src="${url}" alt="${escapeHtml(name || "skill")}" loading="lazy">`;
}

/**
 * Return a small inline logo for a project tech tag.
 */
export function techTagLogo(tag) {
  const key = (typeof tag === "string" && tag) ? tag.toLowerCase() : "";
  const url = skillLogos[key];
  if (!url) return "";
  return `<img class="tech-tag-logo" src="${url}" alt="" loading="lazy">`;
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
        <p>AI/ML Engineer | GenAI | Cloud | Data Science</p>
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
    <article class="blog-card" data-animate="fade-up">
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
  const wantEmbed = options.embed !== false;
  const hasEmbed = wantEmbed && post.embedHtml;
  return `
    <article class="linkedin-card ${hasEmbed ? "has-embed" : ""}" data-animate="fade-up">
      ${
        hasEmbed
          ? `<div class="linkedin-embed">${post.embedHtml}</div>`
          : `
            <div class="linkedin-fallback">
              <div class="linkedin-mark" aria-hidden="true">in</div>
              <p class="eyebrow">${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.publishedAt))}</p>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.summary)}</p>
              <div class="tag-row">${(post.tags || []).map(item => `<span class="pill">${icon("tag")}&nbsp;${escapeHtml(item)}</span>`).join("")}</div>
            </div>
          `
      }
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
