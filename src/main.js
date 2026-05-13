import { bootLoader, dismissLoader } from "./loader.js";
import { bootInteractions } from "./animations.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootTheme } from "./theme.js";
import {
  escapeHtml,
  mountShell,
  renderBlogCards,
  renderCertificateCard,
  renderLinkedInCards,
  renderPills,
  icon,
  skillIcon,
  techTagLogo
} from "./render.js";

function heroContactIcon(link) {
  const key = `${link.label || ""} ${link.href || ""}`.toLowerCase();
  if (key.includes("mailto") || key.includes("email")) return "mail";
  if (key.includes("tel") || key.includes("phone")) return "phone";
  if (key.includes("linkedin")) return "linkedin";
  if (key.includes("github")) return "github";
  if (key.includes("resume") || key.includes(".pdf")) return "download";
  return "link";
}

function renderHeroContacts(profile) {
  const seen = new Set();
  const links = [];

  const addLink = (link) => {
    if (!link?.href) return;
    const key = link.href.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    links.push(link);
  };

  if (profile.email) {
    addLink({
      label: "Email",
      href: `mailto:${profile.email}`,
      value: profile.email,
      className: "is-email"
    });
  }

  if (profile.phone) {
    addLink({
      label: "Phone",
      href: `tel:${profile.phone.replace(/[^\d+]/g, "")}`,
      value: profile.phone
    });
  }

  (profile.socials || []).forEach((link) => {
    const value = link.href.startsWith("mailto:")
      ? link.href.replace(/^mailto:/, "")
      : link.label.toLowerCase() === "resume"
        ? "Download PDF"
        : link.label;
    addLink({ ...link, value });
  });

  return links
    .map((link) => {
      const external = link.href.startsWith("http") ? 'target="_blank" rel="noreferrer"' : "";
      const download = link.href.endsWith(".pdf") ? "download" : "";
      return `
        <a class="hero-contact-link ${link.className || ""}" href="${escapeHtml(link.href)}" ${external} ${download} aria-label="${escapeHtml(link.label)}">
          <span class="hero-contact-icon">${icon(heroContactIcon(link))}</span>
          <span>
            <small>${escapeHtml(link.label)}</small>
            <strong>${escapeHtml(link.value || link.label)}</strong>
          </span>
        </a>
      `;
    })
    .join("");
}

function renderHome() {
  const { certificates, education, experience, profile, projects, responsibilities, skills } = getSiteContent();
  const safeProjects = projects.length
    ? projects
    : [{ title: "Project placeholder", type: "Placeholder", status: "Draft", summary: "Projects will appear here.", impact: "Impact details will appear here.", tags: ["Placeholder"], href: "#" }];
  const featuredProjects = safeProjects.map((project, index) => ({ ...project, index }));
  const root = document.querySelector("#home-root");

  root.innerHTML = `
    <div class="home-modern">
      <section class="hero hero-modern" aria-labelledby="hero-title">
        <canvas class="hero-neural" data-neural-canvas aria-hidden="true"></canvas>
        <div class="hero-copy" data-animate="slide-right">
          <div class="hero-contact-dock" aria-label="Contact and important links">
            ${renderHeroContacts(profile)}
          </div>
          <p class="eyebrow">AI portfolio / research OS</p>
          <h1 id="hero-title" class="hero-name">Mohammad<br>Sameer</h1>
          <p class="hero-positioning">AI/ML Engineer | GenAI | Cloud | Data Science</p>
          <p class="lede">
            ${escapeHtml(profile.role)} at ${escapeHtml(profile.company)}. I design practical AI systems, production interfaces, and learning notes around real engineering work.
          </p>
          <div class="hero-actions">
            <a class="primary-link" href="${profile.resumeUrl}" download>${icon("download")} Download resume</a>
          </div>
          <div class="status-strip" aria-label="Current status">
            ${renderPills(profile.status)}
          </div>
        </div>

        <div class="hero-stage" data-animate="slide-left">
          <div class="ai-workbench" aria-label="${escapeHtml(profile.avatarAlt)}">
            <canvas class="workbench-canvas" data-neural-canvas aria-hidden="true"></canvas>
            <div class="workbench-header">
              <span>sameer.ai</span>
              <span>live workbench</span>
            </div>
            <div class="model-node primary">
              <small>current vector</small>
              <strong>GenAI systems</strong>
            </div>
            <div class="model-node">
              <small>cloud layer</small>
              <strong>FastAPI / Supabase / AWS</strong>
            </div>
            <div class="model-node">
              <small>learning loop</small>
              <strong>Data Science + ML</strong>
            </div>
            <div class="signal-grid" aria-hidden="true">
              ${["RAG", "LLM", "API", "MLOps", "SQL", "UX"].map((item) => `<span>${item}</span>`).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="section editorial-band" id="projects">
        <div class="section-header" data-animate="fade-up">
          <div>
            <p class="eyebrow">Projects</p>
            <h2>What I've built.</h2>
          </div>
          <p>Select a project to explore the details.</p>
        </div>
        <div class="project-showcase">
          <div class="project-list" role="listbox" aria-label="Project selector" data-animate="slide-right">
            ${featuredProjects
              .map(
                (project) => `
                  <button class="${project.index === 0 ? "is-active" : ""}" type="button" data-project-index="${project.index}">
                    <span>${escapeHtml(project.title)}</span>
                    <small>${escapeHtml(project.type)}</small>
                  </button>
                `
              )
              .join("")}
          </div>
          <article class="project-spotlight" data-project-detail data-animate="slide-left">
            ${renderProjectDetail(safeProjects[0])}
          </article>
        </div>
      </section>

      <section class="section editorial-band writing-lab" id="writing">
        <div class="section-header" data-animate="fade-up">
          <div>
            <p class="eyebrow">Blog</p>
            <h2>Read the thinking behind the builds.</h2>
          </div>
          <a class="secondary-link" href="/blog/">${icon("arrow")} Read all posts</a>
        </div>
        <div class="blog-grid">${renderBlogCards()}</div>
      </section>

      <section class="section split-section" id="skills">
        <div class="sticky-copy" data-animate="slide-right">
          <p class="eyebrow">Skills</p>
          <h2>What I work with.</h2>
          <p>Filter by domain.</p>
          <div class="filter-rail" data-skill-filters>
            <button class="is-active" type="button" data-filter="all">All</button>
            <button type="button" data-filter="ai">AI</button>
            <button type="button" data-filter="backend">Backend</button>
            <button type="button" data-filter="cloud">Cloud</button>
          </div>
        </div>
        <div class="skill-cloud">
          ${skills
            .map(
              (skill) => `
                <article class="skill-panel airy-panel" data-skill-card="${skill.group.toLowerCase()} ${skill.items.join(" ").toLowerCase()}" data-animate="fade-up">
                  <h3>${escapeHtml(skill.group)}</h3>
                  <div class="skill-icon-grid">${skill.items.map(item => `<div class="skill-icon-card">${skillIcon(item)}<span>${escapeHtml(item)}</span></div>`).join("")}</div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section split-section" id="experience">
        <div class="sticky-copy" data-animate="slide-right">
          <p class="eyebrow">Experience</p>
          <h2>Where I've worked.</h2>
          <p>${escapeHtml(profile.education)}. ${escapeHtml(profile.location)}.</p>
        </div>
        <div class="timeline-stack">
          ${experience
            .map(
              (item) => `
                <article class="timeline-card" data-animate="fade-up">
                  <p class="eyebrow">${escapeHtml(item.period)} / ${escapeHtml(item.location)}</p>
                  <h3>${escapeHtml(item.role)} - ${escapeHtml(item.company)}</h3>
                  <ul>${item.highlights.map((line) => `<li>${icon("check")}${escapeHtml(line)}</li>`).join("")}</ul>
                  <div class="tag-row">${renderPills(item.tags)}</div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section" id="education">
        <div class="section-header" data-animate="fade-up">
          <div>
            <p class="eyebrow">Education</p>
            <h2>Education timeline.</h2>
          </div>
        </div>
        <div class="education-cards">
          ${education
            .map(
              (item) => `
                <article class="edu-card" data-animate="fade-up">
                  <div class="edu-icon">
                    <svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"></path></svg>
                  </div>
                  <div>
                    <p class="eyebrow">${escapeHtml(item.period)}</p>
                    <h3>${escapeHtml(item.degree)}</h3>
                    <p>${escapeHtml(item.school)} / ${escapeHtml(item.location)}</p>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section" id="leadership">
        <div class="section-header" data-animate="fade-up">
          <div>
            <p class="eyebrow">Leadership</p>
            <h2>Community roles.</h2>
          </div>
        </div>
        <div class="leadership-grid">
          ${responsibilities
            .map(
              (item) => `
                <article class="leadership-card" data-animate="fade-up">
                  <div class="leadership-icon">
                    <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </div>
                  <div>
                    <p class="eyebrow">${escapeHtml(item.period)}</p>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.summary)}</p>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="section editorial-band" id="certificates">
        <div class="section-header" data-animate="fade-up">
          <div>
            <p class="eyebrow">Certificates</p>
            <h2>Verified credentials.</h2>
          </div>
          <a class="secondary-link" href="/certificates/">${icon("arrow")} Full timeline</a>
        </div>
        <div class="credential-list">
          ${certificates.filter((certificate) => certificate.featured).map(renderCertificateCard).join("")}
        </div>
      </section>

      <section class="section linkedin-posts-only" id="linkedin" aria-label="LinkedIn posts">
        <div class="linkedin-grid">${renderLinkedInCards(true, { embed: false })}</div>
      </section>

    </div>
  `;
  setupHomeInteractions(safeProjects);
  bootInteractions(root);
}

function renderProjectDetail(project) {
  return `
    <div class="project-meta">
      <span>${escapeHtml(project.type)}</span>
      <span>${escapeHtml(project.status)}</span>
    </div>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.summary)}</p>
    <p><strong>${escapeHtml(project.impact || "Impact details will appear here.")}</strong></p>
    <div class="tag-row">${(project.tags || []).map(t => `<span class="pill">${techTagLogo(t)}${escapeHtml(t)}</span>`).join("")}</div>
    <a class="text-link" href="${project.href}">Open evidence</a>
  `;
}

function setupHomeInteractions(projects) {
  document.querySelectorAll("[data-project-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.projectIndex);
      document.querySelectorAll("[data-project-index]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      document.querySelector("[data-project-detail]").innerHTML = renderProjectDetail(projects[index]);
    });
  });

  document.querySelectorAll("[data-skill-filters] button").forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      document.querySelectorAll("[data-skill-filters] button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      document.querySelectorAll("[data-skill-card]").forEach((card) => {
        const text = card.dataset.skillCard;
        const show =
          filter === "all" ||
          (filter === "ai" && /ai|machine|rag|llm|gemini|tensorflow|scikit|langchain/.test(text)) ||
          (filter === "backend" && /python|fastapi|jwt|sql|api|java|c\+\+/.test(text)) ||
          (filter === "cloud" && /aws|gcp|azure|dynamodb|qdrant|twilio|elevenlabs/.test(text));
        card.hidden = !show;
      });
    });
  });
}

bootLoader();
await initSiteContent();
mountShell("home");
bootTheme();
renderHome();
dismissLoader();
