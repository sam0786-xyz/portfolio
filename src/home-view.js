/**
 * V3 Home View — Final Quality Pass
 * Premium homepage with hero stats, full-width experience timeline,
 * grouped tech capabilities, project case studies, and full footer.
 */
import { escapeHtml, skillIcon } from "./render.js";
import { getSiteContent } from "./content-store.js";

/* ── Hero ── */
function resolveMetricValue(value, { projectCount, certCount }) {
  if (value === "auto:projects") return `${projectCount}+`;
  if (value === "auto:certs") return `${certCount}+`;
  return value;
}

function renderHero(profile, projects, certificates) {
  const projectCount = projects?.length || 0;
  const certCount = certificates?.length || 0;
  const metrics = Array.isArray(profile.metrics) && profile.metrics.length
    ? profile.metrics
    : [
        { value: "auto:projects", label: "Shipped projects" },
        { value: "auto:certs", label: "Certifications" },
        { value: "3", label: "Cloud platforms" },
        { value: "∞", label: "Curiosity" }
      ];

  return `
    <section class="v3-hero v3-container" aria-labelledby="v3-hero-title">
      <div class="v3-hero-content reveal-up">
        <span class="eyebrow">AI / ML Engineer · Generative AI · Cloud Architecture</span>
        <h1 id="v3-hero-title">${escapeHtml(profile.name)}</h1>
        <p class="lede">${escapeHtml(profile.summary)}</p>
        <div class="v3-hero-ctas">
          <a class="v3-btn v3-btn-primary" href="${escapeHtml(profile.resumeUrl)}" download>Download Résumé</a>
          ${profile.email ? `<a class="v3-btn v3-btn-glass" href="mailto:${escapeHtml(profile.email)}">Get in touch</a>` : ""}
        </div>
      </div>

      <!-- Stats bar -->
      <div class="v3-grid v3-grid-4 stagger-children reveal-up" style="margin-top: var(--space-6);">
        ${metrics.map((metric) => `
        <div class="v3-stat">
          <span class="v3-stat-value">${escapeHtml(resolveMetricValue(metric.value, { projectCount, certCount }))}</span>
          <span class="v3-stat-label">${escapeHtml(metric.label)}</span>
        </div>`).join("")}
      </div>
    </section>`;
}

/* ── Experience ── */
function renderExperience(experience) {
  if (!experience?.length) return "";
  return `
    <section class="v3-section v3-container section-glow section-glow-teal">
      <div class="reveal-up" style="margin-bottom: var(--space-5);">
        <span class="eyebrow">Career</span>
        <h2>Experience</h2>
      </div>
      <div class="v3-timeline stagger-children">
        ${experience.map((exp, i) => `
          <article class="v3-timeline-card reveal-up" style="transition-delay: ${i * 0.08}s">
            <div class="v3-timeline-node"></div>
            <div class="v3-timeline-header">
              <div>
                <h3 style="margin-bottom: 4px;">${escapeHtml(exp.role)}</h3>
                <span style="color: var(--accent-1); font-weight: 500; font-size: 0.95rem;">${escapeHtml(exp.company)}</span>
              </div>
              <span class="v3-timeline-period">${escapeHtml(exp.period)}</span>
            </div>
            <ul class="v3-timeline-highlights">
              ${(exp.highlights || []).map(h => `<li>${escapeHtml(h)}</li>`).join("")}
            </ul>
            <div class="v3-tags" style="margin-top: var(--space-3);">
              ${(exp.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
            </div>
          </article>
        `).join("")}
      </div>
    </section>`;
}

/* ── Tech Stack (fixed: uses group not category) ── */
function renderSkillsSection(skills) {
  if (!skills?.length) return "";

  const allSkills = skills.flatMap(g => g.items);
  const trackContent = [...allSkills, ...allSkills]
    .map(s => `<span class="v3-marquee-item">${escapeHtml(s)}</span>`)
    .join(' <span class="v3-marquee-item" style="color:var(--accent-1);-webkit-text-stroke:0">·</span> ');

  const groupCards = skills.map((g, i) => `
    <div class="v3-card reveal-up" style="transition-delay: ${i * 0.1}s">
      <span class="eyebrow" style="margin-bottom: var(--space-2); font-size: 0.75rem;">${escapeHtml(g.group || g.category || "Skills")}</span>
      <div class="v3-tags">
        ${g.items.map(item => `<span class="v3-tag">${skillIcon(item)} ${escapeHtml(item)}</span>`).join("")}
      </div>
    </div>
  `).join("");

  return `
    <section class="v3-section section-glow section-glow-purple">
      <div class="v3-container" style="margin-bottom: var(--space-4);">
        <div class="reveal-up">
          <span class="eyebrow">Capabilities</span>
          <h2>Tech Stack</h2>
        </div>
      </div>
      <div class="v3-marquee-container reveal-up" style="margin-bottom: var(--space-5);">
        <div class="v3-marquee-track">${trackContent}</div>
        <div class="v3-marquee-track reverse">${trackContent}</div>
      </div>
      <div class="v3-container">
        <div class="v3-grid v3-grid-3 stagger-children">
          ${groupCards}
        </div>
      </div>
    </section>`;
}

/* ── Projects ── */
function renderProjects(projects) {
  if (!projects?.length) return "";

  const gradients = [
    "linear-gradient(135deg, rgba(79,172,254,0.15) 0%, transparent 60%)",
    "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, transparent 60%)",
    "linear-gradient(135deg, rgba(52,211,153,0.12) 0%, transparent 60%)",
    "linear-gradient(135deg, rgba(249,115,22,0.12) 0%, transparent 60%)"
  ];

  return `
    <section class="v3-section v3-container section-glow section-glow-warm">
      <div class="reveal-up" style="margin-bottom: var(--space-5);">
        <span class="eyebrow">Portfolio</span>
        <h2>Selected Work</h2>
      </div>
      <div class="v3-staggered-grid">
        ${projects.map((proj, i) => {
          const href = proj.href && proj.href !== "#" ? proj.href : "";
          const isExternal = href.startsWith("http");
          const inner = `
            <div class="v3-project-content">
              <div class="v3-project-type">${escapeHtml(proj.type)}</div>
              <h3 class="v3-project-title">${escapeHtml(proj.title)}</h3>
              <p class="v3-project-summary">${escapeHtml(proj.summary)}</p>
              <div class="v3-project-meta">
                ${proj.status ? `<span class="v3-status v3-status-live">${escapeHtml(proj.status)}</span>` : ""}
                ${href ? `<span class="v3-project-link">${isExternal ? "Visit ↗" : "Read →"}</span>` : ""}
              </div>
              <div class="v3-tags" style="margin-top: var(--space-2);">
                ${(proj.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}
              </div>
            </div>`;
          const style = `background-image: ${gradients[i % gradients.length]};`;
          // Only emit a real link when there is somewhere to go; otherwise a
          // non-navigating card avoids dead "#" anchors.
          return href
            ? `<a href="${escapeHtml(href)}" class="v3-project-card reveal-up" style="${style}" ${isExternal ? 'target="_blank" rel="noreferrer"' : ""}>${inner}</a>`
            : `<article class="v3-project-card v3-project-card-static reveal-up" style="${style}">${inner}</article>`;
        }).join("")}
      </div>
    </section>`;
}

/* ── GitHub (populated client-side; hidden until it has data) ── */
function renderGithub() {
  return `
    <section class="v3-section v3-container section-glow section-glow-teal" data-github-section hidden aria-labelledby="gh-heading">
      <div class="reveal-up" style="margin-bottom: var(--space-5);">
        <span class="eyebrow">Open Source</span>
        <h2 id="gh-heading">Latest from GitHub</h2>
      </div>
      <div class="v3-grid v3-grid-3 stagger-children" data-github-grid></div>
    </section>`;
}

/* ── Export ── */
export function renderHomeMarkup(content) {
  return `
    ${renderHero(content.profile, content.projects, content.certificates)}
    ${renderExperience(content.experience)}
    ${renderSkillsSection(content.skills)}
    ${renderProjects(content.projects)}
    ${renderGithub()}
  `;
}
