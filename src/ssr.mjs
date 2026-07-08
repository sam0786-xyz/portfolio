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
  profile,
  projects,
  responsibilities,
  skills
} from "./data/content.js";
import { pages, escapeHtml } from "./render.js";
import { renderHomeMarkup } from "./home-view.js";

export function defaultContent() {
  return structuredClone({
    profile,
    skills,
    experience,
    projects,
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
    "education",
    "responsibilities",
    "certificates",
    "blogPosts",
    "linkedinPosts"
  ]) {
    if (Array.isArray(override[key])) next[key] = override[key];
  }
  return next;
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
  return `
      <div class="v3-container v3-footer">
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

/**
 * Inject the SSR header, home body, and footer into the index template.
 * Replaces the placeholder comments left in index.html. The <head> meta
 * (Open Graph, Twitter, JSON-LD) is authored statically in index.html so it
 * works even when the file is served by a static host.
 */
export function renderHomeDocument(template, content) {
  return template
    .replace("<!--SSR-HEADER-->", renderHeader("home"))
    .replace("<!--SSR-HOME-->", renderHomeMarkup(content))
    .replace("<!--SSR-FOOTER-->", renderFooter(content));
}
