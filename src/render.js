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
  "generative ai": "https://cdn.simpleicons.org/googlegemini/52c7b8",
  "rag": "https://cdn.simpleicons.org/readthedocs/52c7b8",
  "langchain": "https://cdn.simpleicons.org/langchain/52c7b8",
  "gemini llms": "https://cdn.simpleicons.org/googlegemini/52c7b8",
  "scikit-learn": "https://cdn.simpleicons.org/scikitlearn/52c7b8",
  "tensorflow": "https://cdn.simpleicons.org/tensorflow/52c7b8",
  "python": "https://cdn.simpleicons.org/python/52c7b8",
  "c++": "https://cdn.simpleicons.org/cplusplus/52c7b8",
  "java": "https://cdn.simpleicons.org/openjdk/52c7b8",
  "sql": "https://cdn.simpleicons.org/postgresql/52c7b8",
  "fastapi": "https://cdn.simpleicons.org/fastapi/52c7b8",
  "jwt authentication": "https://cdn.simpleicons.org/jsonwebtokens/52c7b8",
  "aws": "https://cdn.simpleicons.org/amazonwebservices/52c7b8",
  "gcp": "https://cdn.simpleicons.org/googlecloud/52c7b8",
  "azure": "https://cdn.simpleicons.org/azure/52c7b8",
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
  "pydub": "https://cdn.simpleicons.org/python/52c7b8",
  "cloud firestore": "https://cdn.simpleicons.org/firebase/52c7b8",
  "astral uv": "https://cdn.simpleicons.org/python/52c7b8",
  "apple shortcuts": "https://cdn.simpleicons.org/apple/52c7b8"
};

export function skillIcon(name) {
  const key = (typeof name === "string" && name) ? name.toLowerCase() : "";
  const url = skillLogos[key];
  // Unknown skills previously fell back to the Gemini logo, mislabeling every
  // unmapped tag. Show a neutral spark glyph instead so the icon never lies.
  if (!url) {
    return `<svg class="skill-svg skill-svg-generic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z" fill="currentColor"/></svg>`;
  }
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

export function mountShell(active = "home") {
  // Ensure background layering
  if (!document.querySelector(".void-bg")) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div class="void-bg"></div>
       <div class="grid-pattern"></div>
       <div class="noise-overlay"></div>
       <div class="glow-orb orb-1"></div>
       <div class="glow-orb orb-2"></div>`
    );
    const voidBg = document.querySelector(".void-bg");
    document.addEventListener("mousemove", (e) => {
      voidBg.style.setProperty("--mouse-x", `${e.clientX}px`);
      voidBg.style.setProperty("--mouse-y", `${e.clientY}px`);
    });
  }
  const { profile } = getSiteContent();
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");
  
  if (header) {
    header.innerHTML = `
      <nav class="v3-dock" aria-label="Primary navigation">
        ${pages
          .map(
            (page) => `
              <a class="v3-dock-link ${page.id === active ? "is-active" : ""}" href="${page.href}">
                ${escapeHtml(page.label)}
              </a>
            `
          )
          .join("")}
      </nav>
    `;
  }

  if (footer) {
    const year = new Date().getFullYear();
    const phoneHref = profile.phone ? profile.phone.replace(/[^+\d]/g, "") : "";
    footer.innerHTML = `
      <div class="v3-container v3-footer">
        <div class="v3-footer-cta">
          <span class="eyebrow">${escapeHtml(profile.availability || "Available for opportunities")}</span>
          <h2>Let's build something together.</h2>
          <p class="lede" style="margin: var(--space-2) auto var(--space-4);">I'm always interested in challenging AI/ML roles and collaborations.</p>
          <div class="v3-hero-ctas footer-contact-actions">
            ${profile.email ? `<a class="v3-btn v3-btn-primary" href="mailto:${escapeHtml(profile.email)}">Email me</a>` : ""}
            ${profile.phone ? `<a class="v3-btn v3-btn-glass" href="tel:${escapeHtml(phoneHref)}">Call ${escapeHtml(profile.phone)}</a>` : ""}
          </div>
        </div>
        <div class="v3-footer-grid">
          <div class="v3-footer-brand">
            <strong style="font-family: var(--font-display); font-size: 1.2rem;">${escapeHtml(profile.name)}</strong>
            <p>${escapeHtml(profile.summary)}</p>
          </div>
          <div class="v3-footer-links">
            <span class="mono-text" style="color: var(--text-dark); margin-bottom: var(--space-1); display: block; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem;">Pages</span>
            ${pages.map(p => `<a href="${p.href}">${escapeHtml(p.label)}</a>`).join("")}
          </div>
          <div class="v3-footer-links">
            <span class="mono-text" style="color: var(--text-dark); margin-bottom: var(--space-1); display: block; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem;">Connect</span>
            ${(profile.socials || [])
              .map((link) => `<a href="${escapeHtml(link.href)}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>${escapeHtml(link.label)}</a>`)
              .join("")}
          </div>
        </div>
        <div class="v3-footer-bottom">
          <span>© ${year} ${escapeHtml(profile.name)}. All rights reserved.</span>
          <button class="v3-back-to-top" onclick="window.scrollTo({top:0,behavior:'smooth'})">Back to top ↑</button>
        </div>
      </div>
    `;
  }
}

export function renderPills(items) {
  return items.map((item) => `<span class="v3-tag">${escapeHtml(item)}</span>`).join("");
}

export function renderContactLinks() {
  const { profile } = getSiteContent();
  return profile.socials
    .map(
      (link) => `
        <a class="v3-btn v3-btn-glass" href="${link.href}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>
          <span>${link.label}</span>
          <span aria-hidden="true" style="margin-left: 0.5rem; font-family: var(--font-mono); color: var(--accent-1);">-&gt;</span>
        </a>
      `
    )
    .join("");
}

export function renderCertificateCard(certificate) {
  const hasLink = Boolean(certificate.verificationUrl);
  return `
    <a href="${hasLink ? certificate.verificationUrl : "#"}" class="v3-minimal-row reveal-up" ${hasLink ? 'target="_blank" rel="noreferrer"' : 'aria-disabled="true"'}>
      <div>
        <h3 class="v3-row-title">${escapeHtml(certificate.title)}</h3>
        <span class="v3-row-meta">${escapeHtml(certificate.issuer)} · ${formatDate(certificate.issuedAt)}</span>
      </div>
      <div class="v3-tags">
        ${(certificate.skills || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    </a>
  `;
}

export function renderCertificates(featuredOnly = false) {
  const { certificates } = getSiteContent();
  const list = featuredOnly ? certificates.filter((certificate) => certificate.featured) : certificates;
  return list.map(renderCertificateCard).join("");
}

export function renderBlogCard(post) {
  const dateStr = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.date));
  return `
    <a href="/blog/${post.slug}/" class="v3-minimal-row reveal-up">
      <div>
        <h3 class="v3-row-title">${escapeHtml(post.title)}</h3>
        <span class="v3-row-meta">${dateStr} · ${post.readingTime}</span>
      </div>
      <div class="v3-tags">
        ${(post.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    </a>
  `;
}

export function renderBlogCards() {
  const { blogPosts } = getSiteContent();
  return blogPosts.filter(p => p.published !== false).map(renderBlogCard).join("");
}

export function sanitizeLinkedInEmbed(embedHtml) {
  if (!embedHtml) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(embedHtml, "text/html");
    const iframe = doc.querySelector("iframe");
    if (!iframe) return "";

    if (doc.body.children.length !== 1 || doc.body.firstElementChild !== iframe) {
      return "";
    }

    const src = iframe.getAttribute("src") || "";
    const isTrustedLinkedIn = /^https:\/\/(www\.)?linkedin\.com\/embed\/feed\/update\/urn:li:(share|ugcPost|activity):\d+\/?(?:\?.*)?$/.test(src);
    if (!isTrustedLinkedIn) return "";

    const width = iframe.getAttribute("width") || "504";
    const height = iframe.getAttribute("height") || "1000";
    const frameborder = iframe.getAttribute("frameborder") || "0";
    const allowfullscreen = iframe.hasAttribute("allowfullscreen") ? "allowfullscreen" : "";
    const title = iframe.getAttribute("title") || "Embedded post";

    return `<iframe src="${escapeHtml(src)}" width="${escapeHtml(width)}" height="${escapeHtml(height)}" frameborder="${escapeHtml(frameborder)}" ${allowfullscreen ? "allowfullscreen" : ""} title="${escapeHtml(title)}"></iframe>`;
  } catch (e) {
    return "";
  }
}

export function renderLinkedInCard(post, options = {}) {
  if (post.embedHtml) {
    return `
      <div class="reveal-up" style="display: flex; justify-content: center; margin-bottom: var(--space-4);">
        ${post.embedHtml}
      </div>
    `;
  }

  const dateStr = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.publishedAt));
  return `
    <a href="${post.url}" class="v3-minimal-row reveal-up" target="_blank" rel="noreferrer">
      <div>
        <h3 class="v3-row-title">${escapeHtml(post.title)}</h3>
        <span class="v3-row-meta">LinkedIn · ${dateStr}</span>
      </div>
      <div class="v3-tags">
        ${(post.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
      </div>
    </a>
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
