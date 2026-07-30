import {
  defaultSiteContent,
  exportSiteContent,
  getSiteContent,
  initSiteContent,
  resetSiteContent,
  saveSiteContent
} from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { bootLoader, dismissLoader } from "./loader.js";
import { escapeHtml, mountShell } from "./render.js";
import { bootTheme } from "./theme.js";

let content;
let statusNode;

/* ═══ Render ═══ */

function renderCms() {
  content = getSiteContent();
  const posts = content.blogPosts || [];

  document.querySelector("#cms-root").innerHTML = `
      <section class="v3-hero v3-container reveal-up" style="min-height: 50vh; padding-top: 100px;">
        <div class="v3-hero-content">
          <p class="eyebrow">Admin CMS</p>
          <h1>Update the portfolio, resume, and content model.</h1>
          <p class="lede">
            Saves to the project when the local server is running. Also keeps a browser fallback so you can preview changes instantly.
          </p>
          <div class="v3-hero-ctas">
            <a class="v3-btn v3-btn-primary" href="${content.profile.resumeUrl}" download data-resume-download>Download current resume</a>
            <a class="v3-btn v3-btn-glass" href="/studio/">Open writing studio</a>
            <a class="v3-btn v3-btn-glass" href="/">Preview home</a>
          </div>
        </div>
      </section>

      <section class="v3-container v3-section reveal-up">
        <div class="v3-card" style="padding: var(--space-4); margin-bottom: var(--space-5);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-3);">
            <div>
              <p class="eyebrow">Admin status</p>
              <h2 style="margin: 0; font-size: 1.5rem;">Source control for portfolio content.</h2>
              <p data-cms-status style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Ready.</p>
            </div>
            <div style="display: flex; gap: var(--space-2); align-items: center;">
              <button class="v3-btn v3-btn-primary" type="button" data-save-cms>${svgIcon("save")} Save All</button>
              <button class="v3-btn v3-btn-glass" type="button" data-admin-logout>Sign out</button>
              <button class="v3-btn v3-btn-glass" type="button" data-reset-cms>Reset</button>
            </div>
          </div>
        </div>

        <div class="v3-grid v3-grid-2">
          <form class="v3-card" data-profile-form>
            <p class="eyebrow">Profile</p>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              ${profileField("name", "Name")}
              ${profileField("role", "Role")}
              ${profileField("company", "Company")}
              ${profileField("education", "Education")}
              ${profileField("semester", "Current state")}
              ${profileField("location", "Location")}
              ${profileField("availability", "Availability")}
              ${profileField("phone", "Phone")}
              ${profileField("email", "Email")}
              ${profileField("resumeUrl", "Resume URL")}
              <label class="v3-label">
                Summary
                <textarea class="v3-input" data-profile-field="summary" rows="4">${escapeHtml(content.profile.summary)}</textarea>
              </label>
            </div>
          </form>

          <section class="v3-card">
            <p class="eyebrow">Resume manager</p>
            <h3 class="text-heading" style="margin-bottom: var(--space-2);">Upload a new PDF resume</h3>
            <p class="lede" style="font-size: 1rem; margin-bottom: var(--space-4);">The admin server stores the uploaded PDF as <code>assets/mohammad-sameer-resume.pdf</code>.</p>
            <label class="v3-card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed var(--glass-border-strong); padding: var(--space-5); cursor: pointer; text-align: center; margin-bottom: var(--space-3);">
              <span style="font-family: var(--font-display); font-size: 1.2rem; color: var(--accent-1); margin-bottom: 8px;">Choose PDF resume</span>
              <input type="file" accept="application/pdf" data-resume-upload style="display: none;">
              <span style="font-size: 0.9rem; color: var(--text-muted);">Click to browse</span>
            </label>
            <div style="display: flex; gap: var(--space-3);">
              <a class="v3-btn v3-btn-glass" href="${content.profile.resumeUrl}" download data-resume-download-secondary>Download resume</a>
              <a class="v3-btn v3-btn-glass" href="${content.profile.resumeUrl}" target="_blank" rel="noreferrer" data-resume-open>Open resume</a>
            </div>
          </section>
        </div>

        <!-- Status Chips -->
        <section class="v3-card" style="margin-top: var(--space-5);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div><p class="eyebrow">Status Chips</p><h3 class="text-heading" style="margin: 0;">Hero tagline chips</h3></div>
          </div>
          <div data-chip-editor="status">
            <div class="v3-tags" data-chip-list="status" style="margin-bottom: var(--space-4);">
              ${(content.profile.status || []).map((chip, i) => `
                <span class="v3-tag">${escapeHtml(chip)} <button type="button" data-remove-chip="${i}" title="Remove" style="margin-left: 8px; cursor: pointer; color: var(--accent-1);">&times;</button></span>
              `).join("")}
            </div>
            <div style="display: flex; gap: var(--space-2); max-width: 400px;">
              <input type="text" class="v3-input" placeholder="Add a chip…" data-chip-input="status">
              <button type="button" class="v3-btn v3-btn-glass" data-add-chip="status">+ Add</button>
            </div>
          </div>
        </section>

        <!-- Social Links -->
        <section class="v3-card" style="margin-top: var(--space-5);">
          <div style="margin-bottom: var(--space-4);">
            <p class="eyebrow">Social Links</p><h3 class="text-heading" style="margin: 0;">Profile links in hero</h3>
          </div>
          <div data-link-editor="socials" style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${(content.profile.socials || []).map((link, i) => `
              <div class="cms-link-row" data-link-index="${i}" style="display: grid; grid-template-columns: 1fr 2fr auto; gap: var(--space-2); align-items: center;">
                <input type="text" class="v3-input" value="${escapeHtml(link.label || "")}" placeholder="Label" data-link-label="${i}">
                <input type="text" class="v3-input" value="${escapeHtml(link.href || "")}" placeholder="URL" data-link-href="${i}">
                <button type="button" class="v3-btn v3-btn-glass" style="color: #ff453a;" data-remove-link="${i}" title="Remove">&times;</button>
              </div>
            `).join("")}
            <button type="button" class="v3-btn v3-btn-glass" data-add-link="socials" style="align-self: flex-start; margin-top: var(--space-2);">+ Add Link</button>
          </div>
        </section>

        <!-- Skills -->
        <section class="v3-card" style="margin-top: var(--space-5);">
          <div style="margin-bottom: var(--space-4);">
            <p class="eyebrow">Skills</p><h3 class="text-heading" style="margin: 0;">Grouped skill badges</h3>
          </div>
          <div data-skills-editor style="display: flex; flex-direction: column; gap: var(--space-5);">
            ${(content.skills || []).map((group, gi) => `
              <div class="v3-card" data-skill-group="${gi}" style="background: var(--bg-surface-0);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
                  <input type="text" class="v3-input" value="${escapeHtml(group.group)}" placeholder="Group name" data-skill-group-name="${gi}" style="max-width: 300px; font-weight: bold;">
                  <button type="button" class="v3-btn v3-btn-glass" style="color: #ff453a;" data-remove-skill-group="${gi}">&times;</button>
                </div>
                <div class="v3-tags" data-skill-chips="${gi}" style="margin-bottom: var(--space-3);">
                  ${(group.items || []).map((skill, si) => `
                    <span class="v3-tag">${escapeHtml(skill)} <button type="button" data-remove-skill="${gi}-${si}" title="Remove" style="margin-left: 8px; cursor: pointer; color: var(--accent-1);">&times;</button></span>
                  `).join("")}
                </div>
                <div style="display: flex; gap: var(--space-2); max-width: 400px;">
                  <input type="text" class="v3-input" placeholder="Add skill…" data-skill-input="${gi}">
                  <button type="button" class="v3-btn v3-btn-glass" data-add-skill="${gi}">+ Add</button>
                </div>
              </div>
            `).join("")}
            <button type="button" class="v3-btn v3-btn-glass" data-add-skill-group style="align-self: flex-start;">+ Add Skill Group</button>
          </div>
        </section>

        <!-- Experience -->
        ${renderCardSection("Experience", "experience", content.experience || [], [
          { key: "role", label: "Role", type: "text" },
          { key: "company", label: "Company", type: "text" },
          { key: "location", label: "Location", type: "text" },
          { key: "period", label: "Period", type: "text" },
          { key: "tags", label: "Tags (comma separated)", type: "tags" },
          { key: "highlights", label: "Highlights (one per line)", type: "lines" }
        ])}

        <!-- Projects -->
        ${renderCardSection("Projects", "projects", content.projects || [], [
          { key: "title", label: "Title", type: "text" },
          { key: "type", label: "Type", type: "text" },
          { key: "status", label: "Status", type: "text" },
          { key: "summary", label: "Summary", type: "textarea" },
          { key: "impact", label: "Impact", type: "text" },
          { key: "tags", label: "Tags (comma separated)", type: "tags" },
          { key: "href", label: "Link URL", type: "text" }
        ])}

        <!-- Mini Projects (ongoing smaller builds; separate from Selected Work) -->
        ${renderCardSection("Mini Projects", "miniProjects", content.miniProjects || [], [
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary (one or two lines)", type: "textarea" },
          { key: "date", label: "Date (YYYY-MM-DD)", type: "text" },
          { key: "tags", label: "Tags (comma separated)", type: "tags" },
          { key: "href", label: "Link (GitHub repo or blog post)", type: "text" }
        ])}

        <!-- Education -->
        ${renderCardSection("Education", "education", content.education || [], [
          { key: "degree", label: "Degree", type: "text" },
          { key: "school", label: "School", type: "text" },
          { key: "location", label: "Location", type: "text" },
          { key: "period", label: "Period", type: "text" }
        ])}

        <!-- Responsibilities -->
        ${renderCardSection("Responsibilities / Leadership", "responsibilities", content.responsibilities || [], [
          { key: "title", label: "Title", type: "text" },
          { key: "period", label: "Period", type: "text" },
          { key: "summary", label: "Summary", type: "textarea" }
        ])}

        <!-- Certificates -->
        ${renderCardSection("Certificates", "certificates", content.certificates || [], [
          { key: "title", label: "Title", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "issuedAt", label: "Issued at", type: "text" },
          { key: "credentialId", label: "Credential ID", type: "text" },
          { key: "verificationUrl", label: "Verification URL", type: "text" },
          { key: "mediaUrl", label: "Media URL", type: "text" },
          { key: "skills", label: "Tags (comma separated)", type: "tags" },
          { key: "summary", label: "Summary", type: "textarea" },
          { key: "featured", label: "Featured", type: "checkbox" }
        ])}

        <!-- LinkedIn Posts -->
        ${renderCardSection("LinkedIn Posts", "linkedinPosts", content.linkedinPosts || [], [
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary", type: "textarea" },
          { key: "url", label: "LinkedIn Post URL", type: "text" },
          { key: "publishedAt", label: "Published date", type: "text" },
          { key: "tags", label: "Tags (comma separated)", type: "tags" },
          { key: "embedHtml", label: "Embed iframe HTML", type: "textarea" },
          { key: "featured", label: "Featured", type: "checkbox" }
        ])}

        <!-- Blog Manager -->
        <section class="v3-card" style="margin-top: var(--space-5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
              <div>
                <p class="eyebrow">Blog Manager</p>
                <h3 class="text-heading" style="margin: 0;">All field notes</h3>
              </div>
              <a class="v3-btn v3-btn-primary" href="/studio/">
                ${svgIcon("edit")} New Post
              </a>
            </div>
            <div class="v3-minimal-list" data-cms-blog-table>
              ${posts.length ? posts.map((p) => `
                <div class="v3-minimal-row" style="grid-template-columns: 2fr 1fr auto; gap: var(--space-4);">
                  <div>
                    <h4 style="font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 4px;">${escapeHtml(p.title)}</h4>
                    <span class="mono-text">${escapeHtml(p.slug)} — ${escapeHtml(p.date || "No date")}</span>
                  </div>
                  <span class="v3-tag" style="background: ${p.published === false ? 'rgba(255,153,0,0.2)' : 'rgba(0,255,0,0.2)'}; color: ${p.published === false ? '#ff9900' : '#00ff00'}; width: fit-content; align-self: center;">
                    ${p.published === false ? "Draft" : "Live"}
                  </span>
                  <div style="display: flex; gap: var(--space-2);">
                    <a class="v3-btn v3-btn-glass" href="/studio/#${escapeHtml(p.slug)}" title="Edit">Edit</a>
                    <button class="v3-btn v3-btn-glass" type="button" data-toggle-publish="${escapeHtml(p.slug)}">
                      ${p.published === false ? "Publish" : "Unpublish"}
                    </button>
                    <button class="v3-btn v3-btn-glass" style="color: #ff453a;" type="button" data-delete-post="${escapeHtml(p.slug)}" title="Delete">Delete</button>
                    ${p.published !== false ? `<a class="v3-btn v3-btn-glass" href="/blog/${escapeHtml(p.slug)}/" target="_blank">View</a>` : ""}
                  </div>
                </div>
              `).join("") : `
                <div class="v3-card" style="text-align: center; border: 1px dashed var(--glass-border-strong);">
                  <p class="lede">No blog posts yet.</p>
                  <a href="/studio/" class="v3-btn v3-btn-primary" style="margin-top: var(--space-3);">Write your first post &rarr;</a>
                </div>
              `}
            </div>
          </section>

        <!-- Advanced JSON Tools (collapsed) -->
        <details class="v3-card" style="margin-top: var(--space-5);">
          <summary style="cursor: pointer; font-family: var(--font-mono); font-weight: bold; color: var(--text-muted); outline: none;">
            ${svgIcon("code")} Advanced: Export / Import / Full JSON
          </summary>
          <div style="margin-top: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3);">
            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
              <button class="v3-btn v3-btn-glass" type="button" data-export-cms>Export JSON</button>
              <label class="v3-btn v3-btn-glass" style="cursor: pointer;">
                Import JSON
                <input type="file" accept="application/json" data-import-cms style="display: none;">
              </label>
              <button class="v3-btn v3-btn-glass" type="button" data-load-defaults>Load defaults</button>
            </div>
            <textarea class="v3-input" data-full-json style="min-height: 300px; font-family: var(--font-mono); font-size: 0.85rem;" spellcheck="false">${escapeHtml(JSON.stringify(content, null, 2))}</textarea>
            <button class="v3-btn v3-btn-primary" type="button" data-apply-full-json style="align-self: flex-end;">Apply full JSON</button>
          </div>
        </details>

    </section>
  `;
  statusNode = document.querySelector("[data-cms-status]");
}

/* ═══ Helpers ═══ */

function svgIcon(name) {
  const paths = {
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    plus: '<path d="M12 2v20M2 12h20"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'
  };
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function profileField(key, label) {
  return `
    <label class="v3-label">
      ${label}
      <input class="v3-input" data-profile-field="${key}" value="${escapeHtml(content.profile[key] || "")}">
    </label>
  `;
}

function renderCardSection(title, sectionKey, items, fields) {
  return `
    <section class="v3-card" style="margin-top: var(--space-5);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <div><p class="eyebrow">${title}</p><h3 class="text-heading" style="margin: 0;">${items.length} item${items.length !== 1 ? "s" : ""}</h3></div>
        <button type="button" class="v3-btn v3-btn-glass" data-add-card="${sectionKey}">+ Add New</button>
      </div>
      <div data-card-list="${sectionKey}" style="display: flex; flex-direction: column; gap: var(--space-4);">
        ${items.map((item, i) => renderCardItem(sectionKey, item, i, fields)).join("")}
      </div>
    </section>
  `;
}

function renderCardItem(sectionKey, item, index, fields) {
  const fieldHtml = fields.map(f => {
    const val = item[f.key];
    if (f.type === "checkbox") {
      return `<label class="v3-label" style="display: flex; align-items: center; gap: 8px;"><input type="checkbox" data-card-field="${sectionKey}:${index}:${f.key}" ${val ? "checked" : ""}> ${f.label}</label>`;
    }
    if (f.type === "textarea" || f.type === "lines") {
      const textVal = Array.isArray(val) ? val.join("\\n") : (val || "");
      return `<label class="v3-label">${f.label}<textarea class="v3-input" data-card-field="${sectionKey}:${index}:${f.key}" rows="4">${escapeHtml(String(textVal))}</textarea></label>`;
    }
    const tagStr = Array.isArray(val) ? val.join(", ") : (val || "");
    return `<label class="v3-label">${f.label}<input type="text" class="v3-input" data-card-field="${sectionKey}:${index}:${f.key}" value="${escapeHtml(String(tagStr))}"></label>`;
  }).join("");

  const label = item.title || item.role || item.degree || item.group || `Item ${index + 1}`;
  return `
    <details class="v3-card" data-card-index="${index}" style="background: var(--bg-surface-0);">
      <summary style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-family: var(--font-display); font-size: 1.2rem; outline: none; padding: 4px;">
        <span>${escapeHtml(String(label))}</span>
        <button type="button" class="v3-btn v3-btn-glass" style="color: #ff453a; padding: 6px 12px;" data-remove-card="${sectionKey}:${index}" title="Remove">Delete</button>
      </summary>
      <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--glass-border);">
        ${fieldHtml}
      </div>
    </details>
  `;
}

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

/* ═══ Read structured forms ═══ */

// Field schema for each card section (duplicated from render for read)
const cardSchemas = {
  experience: [
    { key: "role", type: "text" }, { key: "company", type: "text" }, { key: "location", type: "text" },
    { key: "period", type: "text" }, { key: "tags", type: "tags" }, { key: "highlights", type: "lines" }
  ],
  projects: [
    { key: "title", type: "text" }, { key: "type", type: "text" }, { key: "status", type: "text" },
    { key: "summary", type: "textarea" }, { key: "impact", type: "text" }, { key: "tags", type: "tags" },
    { key: "href", type: "text" }
  ],
  miniProjects: [
    { key: "title", type: "text" }, { key: "summary", type: "textarea" }, { key: "date", type: "text" },
    { key: "tags", type: "tags" }, { key: "href", type: "text" }
  ],
  education: [
    { key: "degree", type: "text" }, { key: "school", type: "text" }, { key: "location", type: "text" },
    { key: "period", type: "text" }
  ],
  responsibilities: [
    { key: "title", type: "text" }, { key: "period", type: "text" }, { key: "summary", type: "textarea" }
  ],
  certificates: [
    { key: "title", type: "text" }, { key: "issuer", type: "text" }, { key: "issuedAt", type: "text" },
    { key: "credentialId", type: "text" }, { key: "verificationUrl", type: "text" }, { key: "mediaUrl", type: "text" },
    { key: "skills", type: "tags" }, { key: "summary", type: "textarea" }, { key: "featured", type: "checkbox" }
  ],
  linkedinPosts: [
    { key: "title", type: "text" }, { key: "summary", type: "textarea" }, { key: "url", type: "text" },
    { key: "publishedAt", type: "text" }, { key: "tags", type: "tags" }, { key: "embedHtml", type: "textarea" },
    { key: "featured", type: "checkbox" }
  ]
};

function readCms() {
  const next = structuredClone(content);

  // Profile fields
  document.querySelectorAll("[data-profile-field]").forEach((field) => {
    next.profile[field.dataset.profileField] = field.value.trim();
  });

  // Status chips
  next.profile.status = Array.from(document.querySelectorAll('[data-chip-list="status"] .cms-chip'))
    .map(el => el.textContent.replace("×", "").trim())
    .filter(Boolean);

  // Social links
  const linkCount = document.querySelectorAll("[data-link-editor='socials'] .cms-link-row").length;
  next.profile.socials = [];
  for (let i = 0; i < linkCount; i++) {
    const label = document.querySelector(`[data-link-label="${i}"]`)?.value?.trim() || "";
    const href = document.querySelector(`[data-link-href="${i}"]`)?.value?.trim() || "";
    if (label || href) next.profile.socials.push({ label, href });
  }

  // Skills
  const skillGroups = document.querySelectorAll("[data-skill-group]");
  next.skills = Array.from(skillGroups).map((groupEl) => {
    const gi = groupEl.dataset.skillGroup;
    const groupName = document.querySelector(`[data-skill-group-name="${gi}"]`)?.value?.trim() || "";
    const items = Array.from(groupEl.querySelectorAll(".v3-tag"))
      .map(el => el.textContent.replace("×", "").trim())
      .filter(Boolean);
    return { group: groupName, items };
  });

  // Card sections
  for (const sectionKey of Object.keys(cardSchemas)) {
    const schema = cardSchemas[sectionKey];
    const fields = document.querySelectorAll(`[data-card-field^="${sectionKey}:"]`);
    const indexSet = new Set();
    fields.forEach(f => {
      const parts = f.dataset.cardField.split(":");
      indexSet.add(Number(parts[1]));
    });
    const indices = Array.from(indexSet).sort((a, b) => a - b);
    next[sectionKey] = indices.map(i => {
      const item = {};
      for (const def of schema) {
        const el = document.querySelector(`[data-card-field="${sectionKey}:${i}:${def.key}"]`);
        if (!el) continue;
        if (def.type === "checkbox") item[def.key] = el.checked;
        else if (def.type === "tags") item[def.key] = el.value.split(",").map(s => s.trim()).filter(Boolean);
        else if (def.type === "lines") item[def.key] = el.value.split("\n").map(s => s.trim()).filter(Boolean);
        else item[def.key] = el.value.trim();
      }
      return item;
    });
  }

  return next;
}

/* ═══ Persist ═══ */

async function persist(next) {
  content = next;
  const savedToServer = await saveSiteContent(next);
  const jsonEl = document.querySelector("[data-full-json]");
  if (jsonEl) jsonEl.value = JSON.stringify(next, null, 2);
  setStatus(savedToServer ? "Saved to project files and browser storage." : "Saved locally. Server save unavailable.");
}

function downloadBlob(filename, type, body) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([body], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 800);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function uploadResume(file) {
  if (!file) return;
  if (file.type !== "application/pdf") {
    setStatus("Please choose a PDF resume.");
    return;
  }

  setStatus("Uploading resume...");
  const dataUrl = await readFileAsDataUrl(file);
  let resumeUrl = dataUrl;

  try {
    const response = await fetch("/api/resume", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, dataUrl })
    });
    if (response.ok) {
      const payload = await response.json();
      resumeUrl = payload.url;
    }
  } catch {}

  const next = readCms();
  next.profile.resumeUrl = resumeUrl;
  next.profile.socials = next.profile.socials.map((link) =>
    link.label.toLowerCase() === "resume" ? { ...link, href: resumeUrl } : link
  );
  await persist(next);
  renderCms();
  setupCmsEvents();
  setStatus("Resume updated. Download buttons now point to the new file.");
}

/* ═══ Events ═══ */

function setupCmsEvents() {
  document.querySelector("[data-save-cms]").addEventListener("click", async () => {
    try {
      setStatus("Saving...");
      await persist(readCms());
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  });

  document.querySelector("[data-admin-logout]").addEventListener("click", async () => {
    localStorage.removeItem("sameer-cms-auth-v1");
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch {}
    window.location.href = "/cms/login.html";
  });

  document.querySelector("[data-reset-cms]").addEventListener("click", async () => {
    if (!confirm("Reset all content to defaults? This cannot be undone.")) return;
    await resetSiteContent();
    content = defaultSiteContent();
    renderCms();
    setupCmsEvents();
    setStatus("Reset to resume-derived defaults.");
  });

  // Advanced tools
  document.querySelector("[data-export-cms]")?.addEventListener("click", () => {
    downloadBlob("sameer-site-content.json", "application/json", exportSiteContent());
  });

  document.querySelector("[data-import-cms]")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await persist(JSON.parse(reader.result));
        renderCms();
        setupCmsEvents();
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  });

  document.querySelector("[data-apply-full-json]")?.addEventListener("click", async () => {
    try {
      await persist(JSON.parse(document.querySelector("[data-full-json]").value));
      renderCms();
      setupCmsEvents();
    } catch (error) {
      setStatus(`Full JSON failed: ${error.message}`);
    }
  });

  document.querySelector("[data-load-defaults]")?.addEventListener("click", async () => {
    await persist(defaultSiteContent());
    renderCms();
    setupCmsEvents();
  });

  document.querySelector("[data-resume-upload]")?.addEventListener("change", (event) => {
    uploadResume(event.target.files?.[0]);
  });

  // Status chips
  setupChipEditor("status", () => content.profile.status, (val) => { content.profile.status = val; });

  // Social links
  document.querySelector('[data-add-link="socials"]')?.addEventListener("click", () => {
    content.profile.socials = content.profile.socials || [];
    content.profile.socials.push({ label: "", href: "" });
    renderCms();
    setupCmsEvents();
  });
  document.querySelectorAll("[data-remove-link]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.removeLink);
      content.profile.socials.splice(i, 1);
      renderCms();
      setupCmsEvents();
    });
  });

  // Skills
  setupSkillEditors();

  // Card sections
  for (const key of Object.keys(cardSchemas)) {
    setupCardSection(key);
  }

  // Blog manager: toggle publish
  document.querySelectorAll("[data-toggle-publish]").forEach((button) => {
    button.addEventListener("click", async () => {
      const slug = button.dataset.togglePublish;
      const post = content.blogPosts?.find((p) => p.slug === slug);
      if (post) {
        post.published = post.published === false ? true : false;
        await persist(content);
        renderCms();
        setupCmsEvents();
        setStatus(`"${post.title}" is now ${post.published ? "published" : "a draft"}.`);
      }
    });
  });

  // Blog manager: delete post
  document.querySelectorAll("[data-delete-post]").forEach((button) => {
    button.addEventListener("click", async () => {
      const slug = button.dataset.deletePost;
      const post = content.blogPosts?.find((p) => p.slug === slug);
      if (!post) return;
      if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
      content.blogPosts = (content.blogPosts || []).filter((p) => p.slug !== slug);
      await persist(content);
      renderCms();
      setupCmsEvents();
      setStatus(`Deleted "${post.title}".`);
    });
  });
}

function setupChipEditor(chipKey, getter, setter) {
  const addBtn = document.querySelector(`[data-add-chip="${chipKey}"]`);
  const input = document.querySelector(`[data-chip-input="${chipKey}"]`);
  if (!addBtn || !input) return;

  const doAdd = () => {
    const val = input.value.trim();
    if (!val) return;
    const arr = getter() || [];
    arr.push(val);
    setter(arr);
    renderCms();
    setupCmsEvents();
  };
  addBtn.addEventListener("click", doAdd);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });

  document.querySelectorAll(`[data-chip-list="${chipKey}"] [data-remove-chip]`).forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.removeChip);
      const arr = getter() || [];
      arr.splice(i, 1);
      setter(arr);
      renderCms();
      setupCmsEvents();
    });
  });
}

function setupSkillEditors() {
  document.querySelector("[data-add-skill-group]")?.addEventListener("click", () => {
    content.skills = content.skills || [];
    content.skills.push({ group: "New Group", items: [] });
    renderCms();
    setupCmsEvents();
  });

  document.querySelectorAll("[data-remove-skill-group]").forEach(btn => {
    btn.addEventListener("click", () => {
      const gi = Number(btn.dataset.removeSkillGroup);
      content.skills.splice(gi, 1);
      renderCms();
      setupCmsEvents();
    });
  });

  document.querySelectorAll("[data-add-skill]").forEach(btn => {
    const gi = Number(btn.dataset.addSkill);
    const input = document.querySelector(`[data-skill-input="${gi}"]`);
    const doAdd = () => {
      const val = input?.value?.trim();
      if (!val) return;
      content.skills[gi].items.push(val);
      renderCms();
      setupCmsEvents();
    };
    btn.addEventListener("click", doAdd);
    input?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); doAdd(); } });
  });

  document.querySelectorAll("[data-remove-skill]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [gi, si] = btn.dataset.removeSkill.split("-").map(Number);
      content.skills[gi].items.splice(si, 1);
      renderCms();
      setupCmsEvents();
    });
  });
}

function setupCardSection(sectionKey) {
  document.querySelector(`[data-add-card="${sectionKey}"]`)?.addEventListener("click", () => {
    content[sectionKey] = content[sectionKey] || [];
    const blank = {};
    for (const f of cardSchemas[sectionKey]) {
      if (f.type === "checkbox") blank[f.key] = false;
      else if (f.type === "tags" || f.type === "lines") blank[f.key] = [];
      else blank[f.key] = "";
    }
    content[sectionKey].push(blank);
    renderCms();
    setupCmsEvents();
  });

  document.querySelectorAll(`[data-remove-card^="${sectionKey}:"]`).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parts = btn.dataset.removeCard.split(":");
      const i = Number(parts[1]);
      content[sectionKey].splice(i, 1);
      renderCms();
      setupCmsEvents();
    });
  });
}

/* ═══ Auth ═══ */

const CMS_AUTH_KEY = "sameer-cms-auth-v1";

function checkClientAuth() {
  try {
    const raw = localStorage.getItem(CMS_AUTH_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.authenticated && Date.now() - data.timestamp < 1000 * 60 * 60 * 8) return true;
    localStorage.removeItem(CMS_AUTH_KEY);
    return false;
  } catch {
    return false;
  }
}

/* ═══ Boot ═══ */

let authenticated = false;

bootLoader();

try {
  const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
  if (sessionResponse.ok) {
    const session = await sessionResponse.json();
    authenticated = session.authenticated === true;
  }
} catch {}

if (!authenticated) {
  authenticated = checkClientAuth();
}

if (!authenticated) {
  window.location.href = "/cms/login.html";
  throw new Error("Admin login required.");
}

await initSiteContent();
mountShell("cms");
bootTheme();
renderCms();
setupCmsEvents();
bootInteractions(document.querySelector("#cms-root"));
dismissLoader();
