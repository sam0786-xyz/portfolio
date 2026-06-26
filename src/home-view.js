/**
 * Shared, framework-free home-page renderer.
 *
 * This module is the single source of truth for the home page markup. It is
 * imported by BOTH:
 *   - the Node server (src/ssr.mjs) to inject real, crawlable text into the
 *     HTML that ships in the initial response (SEO / ATS / link previews), and
 *   - the browser (src/main.js) to paint the same markup client-side.
 *
 * Because crawler and browser render identical HTML, there is no flash and the
 * page source always contains the real content. Keep this file free of any
 * browser-only APIs (no document/window/localStorage) so it runs under Node.
 */

import { escapeHtml, formatDate, icon, skillIcon, techTagLogo } from "./render.js";

function heroContactType(href = "", label = "") {
  const key = `${label} ${href}`.toLowerCase();
  if (key.includes("mailto") || key.includes("email")) return "mail";
  if (key.includes("tel") || key.includes("phone")) return "phone";
  if (key.includes("linkedin")) return "linkedin";
  if (key.includes("github")) return "github";
  if (key.includes("resume") || key.includes(".pdf")) return "download";
  return "link";
}

function renderContactRow(profile) {
  const seen = new Set();
  const links = [];
  const add = (link) => {
    if (!link?.href) return;
    const key = link.href.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  if (profile.email) add({ label: "Email", href: `mailto:${profile.email}`, value: profile.email });
  if (profile.phone) add({ label: "Phone", href: `tel:${profile.phone.replace(/[^\d+]/g, "")}`, value: profile.phone });
  (profile.socials || []).forEach((link) => {
    const value = link.href.startsWith("mailto:")
      ? link.href.replace(/^mailto:/, "")
      : link.label.toLowerCase() === "resume"
        ? "Download PDF"
        : link.label;
    add({ ...link, value });
  });

  return links
    .map((link) => {
      const external = link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : "";
      const download = link.href.endsWith(".pdf") ? "download" : "";
      return `
        <a class="hx-contact" href="${escapeHtml(link.href)}" ${external} ${download} aria-label="${escapeHtml(link.label)}">
          <span class="hx-contact-icon" aria-hidden="true">${icon(heroContactType(link.href, link.label))}</span>
          <span class="hx-contact-text">
            <small>${escapeHtml(link.label)}</small>
            <strong>${escapeHtml(link.value || link.label)}</strong>
          </span>
        </a>`;
    })
    .join("");
}

function renderHero(profile) {
  const factRows = [
    profile.role && profile.company ? ["Role", `${profile.role} · ${profile.company}`] : null,
    profile.education ? ["Education", profile.education] : null,
    profile.location ? ["Based in", profile.location] : null,
    profile.semester ? ["Status", profile.semester] : null
  ].filter(Boolean);

  return `
    <section class="hx-hero" aria-labelledby="hx-hero-title">
      <div class="hx-hero-main">
        <p class="hx-eyebrow">AI / ML Engineer · Generative AI · Cloud</p>
        <h1 id="hx-hero-title" class="hx-name">${escapeHtml(profile.name)}</h1>
        <p class="hx-lede">${escapeHtml(profile.summary)}</p>
        <div class="hx-cta">
          <a class="hx-btn hx-btn-primary" href="${escapeHtml(profile.resumeUrl)}" download>${icon("download")} Download résumé</a>
          ${profile.email ? `<a class="hx-btn hx-btn-ghost" href="mailto:${escapeHtml(profile.email)}">${icon("mail")} Get in touch</a>` : ""}
        </div>
        <ul class="hx-status" aria-label="Current focus">
          ${(profile.status || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <div class="hx-contact-row">${renderContactRow(profile)}</div>
      </div>
      <aside class="hx-snapshot" aria-label="Profile snapshot">
        <p class="hx-snapshot-tag">Snapshot</p>
        <dl class="hx-facts">
          ${factRows
            .map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
            .join("")}
        </dl>
        <p class="hx-snapshot-foot">Open to AI/ML engineering & Generative AI roles.</p>
      </aside>
    </section>`;
}

function renderProjects(projects) {
  if (!projects.length) return "";
  return `
    <section class="hx-section" id="projects" aria-labelledby="hx-projects-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Projects</p>
        <h2 id="hx-projects-title">Things I've shipped</h2>
        <p class="hx-section-sub">Production GenAI systems, full-stack platforms, and automation pipelines.</p>
      </header>
      <div class="hx-projects">
        ${projects
          .map((project) => {
            const external = (project.href || "#").startsWith("http") ? 'target="_blank" rel="noreferrer"' : "";
            const hasLink = project.href && project.href !== "#";
            return `
              <article class="hx-card hx-project" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(project.type || "Project")}</span><span>${escapeHtml(project.status || "")}</span></p>
                <h3>${escapeHtml(project.title)}</h3>
                <p class="hx-card-summary">${escapeHtml(project.summary || "")}</p>
                ${project.impact ? `<p class="hx-impact">${icon("spark")} ${escapeHtml(project.impact)}</p>` : ""}
                <div class="hx-tags">${(project.tags || []).map((tag) => `<span class="hx-tag">${techTagLogo(tag)}${escapeHtml(tag)}</span>`).join("")}</div>
                ${hasLink ? `<a class="hx-link" href="${escapeHtml(project.href)}" ${external}>View project ${icon("arrow")}</a>` : ""}
              </article>`;
          })
          .join("")}
      </div>
    </section>`;
}

function renderSkills(skills) {
  if (!skills.length) return "";
  return `
    <section class="hx-section" id="skills" aria-labelledby="hx-skills-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Skills</p>
        <h2 id="hx-skills-title">Tools I build with</h2>
      </header>
      <div class="hx-skills">
        ${skills
          .map(
            (group) => `
              <article class="hx-card hx-skill-group" data-animate="fade-up">
                <h3>${escapeHtml(group.group)}</h3>
                <ul class="hx-skill-list">
                  ${group.items
                    .map((item) => `<li class="hx-skill"><span class="hx-skill-icon" aria-hidden="true">${skillIcon(item)}</span>${escapeHtml(item)}</li>`)
                    .join("")}
                </ul>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderExperience(experience) {
  if (!experience.length) return "";
  return `
    <section class="hx-section" id="experience" aria-labelledby="hx-exp-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Experience</p>
        <h2 id="hx-exp-title">Where I've worked</h2>
      </header>
      <div class="hx-timeline">
        ${experience
          .map(
            (item) => `
              <article class="hx-card hx-exp" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(item.period || "")}</span><span>${escapeHtml(item.location || "")}</span></p>
                <h3>${escapeHtml(item.role)} · ${escapeHtml(item.company)}</h3>
                <ul class="hx-bullets">
                  ${(item.highlights || []).map((line) => `<li>${icon("check")}<span>${escapeHtml(line)}</span></li>`).join("")}
                </ul>
                <div class="hx-tags">${(item.tags || []).map((tag) => `<span class="hx-tag">${techTagLogo(tag)}${escapeHtml(tag)}</span>`).join("")}</div>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderEducation(education) {
  if (!education.length) return "";
  return `
    <section class="hx-section" id="education" aria-labelledby="hx-edu-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Education</p>
        <h2 id="hx-edu-title">Academic background</h2>
      </header>
      <div class="hx-timeline">
        ${education
          .map(
            (item) => `
              <article class="hx-card hx-edu" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(item.period || "")}</span></p>
                <h3>${escapeHtml(item.degree)}</h3>
                <p class="hx-edu-school">${escapeHtml(item.school)}</p>
                <p class="hx-card-summary">${escapeHtml(item.location || "")}</p>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderLeadership(responsibilities) {
  if (!responsibilities.length) return "";
  return `
    <section class="hx-section" id="leadership" aria-labelledby="hx-lead-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Leadership</p>
        <h2 id="hx-lead-title">Community & responsibilities</h2>
      </header>
      <div class="hx-leadership">
        ${responsibilities
          .map((item) => {
            const active = (item.period || "").toLowerCase().includes("present");
            return `
              <article class="hx-card hx-role" data-animate="fade-up">
                <p class="hx-card-meta"><span class="hx-badge ${active ? "is-active" : ""}">${active ? "Active" : "Completed"}</span><span>${escapeHtml(item.period || "")}</span></p>
                <h3>${escapeHtml(item.title)}</h3>
                <p class="hx-card-summary">${escapeHtml(item.summary || "")}</p>
              </article>`;
          })
          .join("")}
      </div>
    </section>`;
}

function renderCertificates(certificates) {
  const featured = certificates.filter((c) => c.featured);
  if (!featured.length) return "";
  return `
    <section class="hx-section" id="certificates" aria-labelledby="hx-cert-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Certificates</p>
        <h2 id="hx-cert-title">Verified credentials</h2>
        <a class="hx-link" href="/certificates/">Full timeline ${icon("arrow")}</a>
      </header>
      <div class="hx-certs">
        ${featured
          .map((cert) => {
            const hasLink = Boolean(cert.verificationUrl);
            return `
              <article class="hx-card hx-cert" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(cert.issuer)}</span><span>${escapeHtml(formatDate(cert.issuedAt))}</span></p>
                <h3>${escapeHtml(cert.title)}</h3>
                <p class="hx-card-summary">${escapeHtml(cert.summary || "")}</p>
                <div class="hx-tags">${(cert.skills || []).map((s) => `<span class="hx-tag">${escapeHtml(s)}</span>`).join("")}</div>
                ${hasLink ? `<a class="hx-link" href="${escapeHtml(cert.verificationUrl)}" target="_blank" rel="noreferrer">Verify ${icon("arrow")}</a>` : ""}
              </article>`;
          })
          .join("")}
      </div>
    </section>`;
}

function renderWriting(blogPosts) {
  const posts = (blogPosts || []).filter((p) => p.published !== false);
  if (!posts.length) return "";
  return `
    <section class="hx-section" id="writing" aria-labelledby="hx-writing-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">Writing</p>
        <h2 id="hx-writing-title">Notes from the workbench</h2>
        <a class="hx-link" href="/blog/">All posts ${icon("arrow")}</a>
      </header>
      <div class="hx-writing">
        ${posts
          .slice(0, 3)
          .map(
            (post) => `
              <article class="hx-card hx-post" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(formatDate(post.date))}</span><span>${escapeHtml(post.readingTime || "")}</span></p>
                <h3>${escapeHtml(post.title)}</h3>
                <p class="hx-card-summary">${escapeHtml(post.excerpt || "")}</p>
                <div class="hx-tags">${(post.tags || []).map((t) => `<span class="hx-tag">${escapeHtml(t)}</span>`).join("")}</div>
                <a class="hx-link" href="/blog/${escapeHtml(post.slug)}/">Read note ${icon("arrow")}</a>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderLinkedIn(linkedinPosts) {
  const posts = (linkedinPosts || []).filter((p) => p.featured);
  if (!posts.length) return "";
  return `
    <section class="hx-section" id="linkedin" aria-labelledby="hx-li-title">
      <header class="hx-section-head">
        <p class="hx-eyebrow">LinkedIn</p>
        <h2 id="hx-li-title">Highlights from my feed</h2>
      </header>
      <div class="hx-writing">
        ${posts
          .map(
            (post) => `
              <article class="hx-card hx-post" data-animate="fade-up">
                <p class="hx-card-meta"><span>${escapeHtml(formatDate(post.publishedAt))}</span><span>LinkedIn</span></p>
                <h3>${escapeHtml(post.title)}</h3>
                <p class="hx-card-summary">${escapeHtml(post.summary || "")}</p>
                <div class="hx-tags">${(post.tags || []).map((t) => `<span class="hx-tag">${escapeHtml(t)}</span>`).join("")}</div>
                <a class="hx-link" href="${escapeHtml(post.url)}" target="_blank" rel="noreferrer">Open on LinkedIn ${icon("arrow")}</a>
              </article>`
          )
          .join("")}
      </div>
    </section>`;
}

function renderContactCta(profile) {
  return `
    <section class="hx-section hx-contact-cta" id="contact" aria-labelledby="hx-contact-title">
      <div class="hx-card hx-cta-card">
        <p class="hx-eyebrow">Get in touch</p>
        <h2 id="hx-contact-title">Let's build something useful.</h2>
        <p class="hx-section-sub">${escapeHtml(profile.role)} at ${escapeHtml(profile.company)} — open to AI/ML engineering and Generative AI opportunities.</p>
        <div class="hx-cta">
          ${profile.email ? `<a class="hx-btn hx-btn-primary" href="mailto:${escapeHtml(profile.email)}">${icon("mail")} Email me</a>` : ""}
          <a class="hx-btn hx-btn-ghost" href="${escapeHtml(profile.resumeUrl)}" download>${icon("download")} Résumé</a>
        </div>
      </div>
    </section>`;
}

/**
 * Render the full home page body for a given site content object.
 * @param {object} content - merged site content (profile, projects, skills, ...)
 * @returns {string} HTML string for #home-root
 */
export function renderHomeMarkup(content) {
  const {
    profile,
    projects = [],
    skills = [],
    experience = [],
    education = [],
    responsibilities = [],
    certificates = [],
    blogPosts = [],
    linkedinPosts = []
  } = content;

  return `
    <div class="hx-home">
      ${renderHero(profile)}
      ${renderProjects(projects)}
      ${renderExperience(experience)}
      ${renderSkills(skills)}
      ${renderWriting(blogPosts)}
      ${renderEducation(education)}
      ${renderLeadership(responsibilities)}
      ${renderCertificates(certificates)}
      ${renderLinkedIn(linkedinPosts)}
      ${renderContactCta(profile)}
    </div>`;
}
