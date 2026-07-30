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
        <div class="candidate-availability" aria-label="Availability and contact details">
          <span class="candidate-availability-status">${escapeHtml(profile.availability || "Open to opportunities")}</span>
          ${profile.phone ? `<a href="tel:${escapeHtml(profile.phone.replace(/[^+\d]/g, ""))}" aria-label="Call Mohammad Sameer at ${escapeHtml(profile.phone)}">${escapeHtml(profile.phone)}</a>` : ""}
        </div>
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

/* ── Projects (major work — unchanged "Selected Work" section) ── */
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

/* ── Mini Projects: the ongoing stream of smaller builds ──
   Separate from Selected Work. Managed via the CMS; the whole section stays
   hidden until at least one mini project exists. */
function renderMiniProjects(miniProjects) {
  if (!miniProjects?.length) return "";
  const sorted = [...miniProjects].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return `
    <section class="v3-section v3-container section-glow section-glow-teal" aria-labelledby="mini-heading">
      <div class="reveal-up" style="margin-bottom: var(--space-5);">
        <span class="eyebrow">Always Building</span>
        <h2 id="mini-heading">Mini Projects</h2>
        <p class="lede" style="font-size: 1rem; margin-top: var(--space-1);">Smaller builds from the ongoing AI engineering journey — shipped, written up, and pushed to GitHub.</p>
      </div>
      <div class="v3-grid v3-grid-3 stagger-children">
        ${sorted.map((mini) => {
          const href = mini.href && mini.href !== "#" ? mini.href : "";
          const isExternal = href.startsWith("http");
          const dateStr = mini.date
            ? new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(mini.date))
            : "";
          const inner = `
            <div class="mini-project-head">
              <h3 class="mini-project-title">${escapeHtml(mini.title)}</h3>
              ${dateStr ? `<span class="mini-project-date">${escapeHtml(dateStr)}</span>` : ""}
            </div>
            <p class="mini-project-summary">${escapeHtml(mini.summary || "")}</p>
            <div class="mini-project-foot">
              <div class="v3-tags">${(mini.tags || []).map(t => `<span class="v3-tag">${escapeHtml(t)}</span>`).join("")}</div>
              ${href ? `<span class="v3-project-link">${isExternal ? "View ↗" : "Read →"}</span>` : ""}
            </div>`;
          return href
            ? `<a class="v3-card mini-project reveal-up" href="${escapeHtml(href)}" ${isExternal ? 'target="_blank" rel="noreferrer"' : ""}>${inner}</a>`
            : `<article class="v3-card mini-project reveal-up">${inner}</article>`;
        }).join("")}
      </div>
    </section>`;
}

/* ── GitHub (populated client-side; hidden until it has data) ── */
const githubMark = `<svg class="gh-mark" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;

function renderGithub(profile) {
  const githubSocial = (profile?.socials || []).find((link) => /github\.com/i.test(link.href || ""));
  const profileUrl = githubSocial?.href || "https://github.com/sam0786-xyz";
  return `
    <section class="v3-section v3-container section-glow section-glow-teal" data-github-section hidden aria-labelledby="gh-heading">
      <div class="reveal-up gh-section-head" style="margin-bottom: var(--space-5);">
        <div>
          <span class="eyebrow">Open Source · Shipping Regularly</span>
          <h2 id="gh-heading" class="gh-heading">${githubMark} Latest from GitHub</h2>
        </div>
        <a class="v3-btn v3-btn-glass gh-profile-link" href="${escapeHtml(profileUrl)}" target="_blank" rel="noreferrer">${githubMark} View all repos</a>
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
    ${renderMiniProjects(content.miniProjects)}
    ${renderGithub(content.profile)}
  `;
}
