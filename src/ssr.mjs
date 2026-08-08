/**
 * Server-side rendering helpers.
 *
 * Produces the real, crawlable HTML for the home page (header, body, footer,
 * and SEO meta) so that search engines, ATS systems, and social link previews
 * receive the actual portfolio content in the initial HTTP response instead of
 * an empty JavaScript shell. The browser later hydrates the same markup.
 */

import {
  blogPosts,
  certificates,
  education,
  experience,
  linkedinPosts,
  miniProjects,
  profile,
  projects,
  responsibilities,
  skills
} from "./data/content.js";
import { pages, escapeHtml } from "./render.js";
import { portfolioAnswers, renderHomeMarkup } from "./home-view.js";

export function defaultContent() {
  return structuredClone({
    profile,
    skills,
    experience,
    projects,
    miniProjects,
    education,
    responsibilities,
    certificates,
    blogPosts,
    linkedinPosts
  });
}

/** Shallow, defensive merge of stored site content over the code defaults. */
export function mergeContent(base, override) {
  if (!override || typeof override !== "object") return base;
  const next = { ...base };
  next.profile = { ...base.profile, ...(override.profile || {}) };
  if (Array.isArray(override.profile?.socials)) next.profile.socials = override.profile.socials;
  for (const key of [
    "skills",
    "experience",
    "projects",
    "miniProjects",
    "education",
    "responsibilities",
    "certificates",
    "blogPosts",
    "linkedinPosts"
  ]) {
    if (key === "skills") next[key] = mergeSkills(base[key], override[key]);
    else if (Array.isArray(override[key])) next[key] = override[key];
  }
  return next;
}

function mergeSkills(baseSkills, overrideSkills) {
  if (!Array.isArray(overrideSkills) || !overrideSkills.length) return baseSkills;
  const defaultsByGroup = new Map(
    (baseSkills || []).map((group) => [String(group.group || group.category || "").trim().toLowerCase(), group])
  );
  const merged = overrideSkills
    .map((group) => {
      const key = String(group?.group || group?.category || "").trim().toLowerCase();
      return Array.isArray(group?.items) && group.items.length ? group : defaultsByGroup.get(key) || null;
    })
    .filter(Boolean);
  return merged.length ? merged : baseSkills;
}

function renderHeader(active = "home") {
  return `
      <nav class="v3-dock" aria-label="Primary navigation">
        ${pages
          .map((page) => `<a class="v3-dock-link ${page.id === active ? "is-active" : ""}" href="${page.href}">${escapeHtml(page.label)}</a>`)
          .join("")}
      </nav>`;
}

function renderFooter(content) {
  const p = content.profile;
  const phoneHref = p.phone ? p.phone.replace(/[^+\d]/g, "") : "";
  return `
      <div class="v3-container v3-footer">
        <div class="v3-footer-cta">
          <span class="eyebrow">${escapeHtml(p.availability || "Available for opportunities")}</span>
          <h2>Let's build something together.</h2>
          <p class="lede" style="margin: var(--space-2) auto var(--space-4);">I’m interested in challenging AI/ML roles and collaborations.</p>
          <div class="v3-hero-ctas footer-contact-actions">
            ${p.email ? `<a class="v3-btn v3-btn-primary" href="mailto:${escapeHtml(p.email)}">Email me</a>` : ""}
            ${p.phone ? `<a class="v3-btn v3-btn-glass" href="tel:${escapeHtml(phoneHref)}">Call ${escapeHtml(p.phone)}</a>` : ""}
          </div>
        </div>
        <div class="v3-footer-brand">
          <strong>${escapeHtml(p.name)}</strong>
        </div>
        <div class="v3-footer-links">
          ${(p.socials || [])
            .map((link) => `<a href="${escapeHtml(link.href)}" ${link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>${escapeHtml(link.label)}</a>`)
            .join("")}
        </div>
      </div>`;
}

function renderCertificatesMarkup(certificates = []) {
  return `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content">
        <span class="eyebrow">Credentials / Proof</span>
        <h1>Verified learning, mapped to practical AI work.</h1>
        <p class="lede">A focused credential timeline for AI, ML, cloud, and production engineering skills, designed to make verification fast.</p>
      </div>
    </section>
    <section class="v3-section v3-container">
      <div class="v3-minimal-list" aria-label="Certificate timeline">
        ${certificates.map((certificate) => `
          <article class="v3-minimal-row">
            <div>
              <h2 class="v3-row-title">${escapeHtml(certificate.title)}</h2>
              <span class="v3-row-meta">${escapeHtml(certificate.issuer)} · ${escapeHtml(certificate.issuedAt)}</span>
              ${certificate.summary ? `<p>${escapeHtml(certificate.summary)}</p>` : ""}
            </div>
            <div class="v3-tags">${(certificate.skills || []).map((skill) => `<span class="v3-tag">${escapeHtml(skill)}</span>`).join("")}</div>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderBlogMarkup(posts = []) {
  const published = posts.filter((post) => post.published !== false);
  return `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content">
        <span class="eyebrow">Writing / Build Logs</span>
        <h1>AI systems, explained from the workbench.</h1>
        <p class="lede">Practical notes on Generative AI, RAG, product architecture, evaluation, and the decisions behind real implementations.</p>
      </div>
    </section>
    <section class="v3-section v3-container">
      <div class="v3-minimal-list" aria-label="Blog posts">
        ${published.map((post) => `
          <article class="v3-minimal-row">
            <div>
              <h2 class="v3-row-title"><a href="/blog/${encodeURIComponent(post.slug)}/">${escapeHtml(post.title)}</a></h2>
              <p>${escapeHtml(post.excerpt)}</p>
              <span class="v3-row-meta">${escapeHtml(post.date)} · ${escapeHtml(post.readingTime || "")}</span>
            </div>
            <div class="v3-tags">${(post.tags || []).map((tag) => `<span class="v3-tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderLinkedInMarkup(posts = []) {
  return `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content">
        <span class="eyebrow">LinkedIn / Public Thinking</span>
        <h1>Short-form updates from the AI build cycle.</h1>
        <p class="lede">Selected posts, progress notes, and community updates from Mohammad Sameer's LinkedIn feed.</p>
        <div class="v3-hero-ctas"><a class="v3-btn v3-btn-primary" href="https://linkedin.com/in/connect-to-sam-xyz" target="_blank" rel="noreferrer">Connect on LinkedIn</a><a class="v3-btn v3-btn-glass" href="/blog/">Read long-form notes</a></div>
      </div>
    </section>
    <section class="v3-section v3-container">
      <div class="v3-minimal-list">
        ${posts.map((post) => `
          <article class="v3-minimal-row">
            <div>
              <h2 class="v3-row-title"><a href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">${escapeHtml(post.title)}</a></h2>
              ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}
              <span class="v3-row-meta">LinkedIn · ${escapeHtml(post.publishedAt || "")}</span>
            </div>
            <div class="v3-tags">${(post.tags || []).map((tag) => `<span class="v3-tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </article>`).join("")}
      </div>
    </section>`;
}

function renderFocusMarkup() {
  return `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content">
        <span class="eyebrow">Focus OS / Private Workbench</span>
        <h1>Focus sessions, tasks, and personal progress in one workspace.</h1>
        <p class="lede">Focus OS is Mohammad Sameer's private deep-work tool: a Pomodoro timer with task tracking, session history, calendar planning, and productivity insights.</p>
      </div>
    </section>`;
}

function renderBlogPostMarkup(post) {
  return `
    <article class="v3-section v3-container" style="max-width: 960px; margin: 0 auto;">
      <header style="margin-bottom: var(--space-5); text-align: center;">
        <div class="v3-tags" style="justify-content: center; margin-bottom: var(--space-3);">${(post.tags || []).map((tag) => `<span class="v3-tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="lede">${escapeHtml(post.excerpt)}</p>
        <span class="mono-text">${escapeHtml(post.date)} · ${escapeHtml(post.readingTime || "")}</span>
      </header>
      <img class="article-cover" src="${escapeHtml(post.cover || "/assets/neural-console.png")}" alt="" style="width: 100%; border-radius: var(--radius-xl); margin-bottom: var(--space-6);">
      <div class="article-body">${post.body || ""}</div>
    </article>`;
}

/** Inject meaningful public-page content into the static app shells for bots and no-JS visitors. */
export function renderPublicDocument(template, content, page) {
  const views = {
    blog: { rootId: "blog-root", active: "blog", markup: renderBlogMarkup(content.blogPosts) },
    certificates: { rootId: "certificates-root", active: "certificates", markup: renderCertificatesMarkup(content.certificates) },
    linkedin: { rootId: "linkedin-root", active: "linkedin", markup: renderLinkedInMarkup(content.linkedinPosts) },
    focus: { rootId: "focus-root", active: "focus", markup: renderFocusMarkup() }
  };
  const view = views[page];
  if (!view) return template;
  return template
    .replace(/<header\b([^>]*)>[\s\S]*?<\/header>/, `<header$1>${renderHeader(view.active)}</header>`)
    .replace(new RegExp(`<main id="${view.rootId}">[\\s\\S]*?<\\/main>`), `<main id="${view.rootId}">${view.markup}</main>`)
    .replace(/<footer\b([^>]*)>[\s\S]*?<\/footer>/, `<footer$1>${renderFooter(content)}</footer>`);
}

export function renderBlogPostDocument(template, content, post) {
  return template
    .replace(/<header\b([^>]*)>[\s\S]*?<\/header>/, `<header$1>${renderHeader("blog")}</header>`)
    .replace(/<main id="post-root">[\s\S]*?<\/main>/, `<main id="post-root">${renderBlogPostMarkup(post)}</main>`)
    .replace(/<footer\b([^>]*)>[\s\S]*?<\/footer>/, `<footer$1>${renderFooter(content)}</footer>`);
}

/**
 * Inject the SSR header, home body, and footer into the index template.
 * Replaces the placeholder comments left in index.html. The <head> meta
 * (Open Graph, Twitter, JSON-LD) is authored statically in index.html so it
 * works even when the file is served by a static host.
 */
export function renderHomeDocument(template, content) {
  const profile = content.profile || {};
  const siteUrl = "https://sam18.xyz/";
  const sameAs = (profile.socials || [])
    .map((link) => link.href)
    .filter((href) => /^https:\/\//.test(href || ""));
  const knowsAbout = (content.skills || []).flatMap((group) => group.items || []);
  const person = {
    "@type": "Person",
    "@id": "https://sam18.xyz/#person",
    name: profile.name || "Mohammad Sameer",
    jobTitle: profile.role || "AI/ML Engineer",
    description: profile.summary || "AI and Machine Learning engineer building production-ready applications.",
    url: siteUrl,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.phone ? { telephone: profile.phone } : {}),
    ...(profile.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location, addressCountry: "IN" } } : {}),
    ...(profile.company ? { worksFor: { "@type": "Organization", name: profile.company } } : {}),
    ...(knowsAbout.length ? { knowsAbout } : {}),
    ...(sameAs.length ? { sameAs } : {})
  };
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": "https://sam18.xyz/#website", url: siteUrl, name: "Mohammad Sameer — AI/ML Engineer Portfolio", inLanguage: "en-IN", publisher: { "@id": "https://sam18.xyz/#person" } },
      { "@type": "ProfilePage", "@id": "https://sam18.xyz/#profile", url: siteUrl, mainEntity: { "@id": "https://sam18.xyz/#person" } },
      person,
      {
        "@type": "FAQPage",
        mainEntity: portfolioAnswers(profile, content.skills).map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        }))
      }
    ]
  };
  return template
    .replace("<!--SSR-HEADER-->", renderHeader("home"))
    .replace("<!--SSR-HOME-->", renderHomeMarkup(content))
    .replace("<!--SSR-FOOTER-->", renderFooter(content))
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`);
}
