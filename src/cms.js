import {
  defaultSiteContent,
  exportSiteContent,
  getSiteContent,
  initSiteContent,
  resetSiteContent,
  saveSiteContent
} from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, mountShell } from "./render.js";
import { bootTheme } from "./theme.js";

let content;
let statusNode;

const editableArrays = [
  "skills",
  "experience",
  "projects",
  "linkedinPosts",
  "education",
  "responsibilities",
  "certificates"
];
function renderCms() {
  content = getSiteContent();
  const posts = content.blogPosts || [];

  document.querySelector("#cms-root").innerHTML = `
      <section class="page-hero">
        <p class="eyebrow">Admin CMS</p>
        <h1>Update the portfolio, resume, and content model.</h1>
        <p class="lede">
          Saves to the project when the local server is running. Also keeps a browser fallback so you can preview changes instantly.
        </p>
        <div class="hero-actions">
          <a class="primary-link" href="${content.profile.resumeUrl}" download data-resume-download>Download current resume</a>
          <a class="secondary-link" href="/studio/">Open writing studio</a>
          <a class="secondary-link" href="/">Preview home</a>
        </div>
      </section>

      <section class="cms-shell">
        <div class="cms-topbar">
          <div>
            <p class="eyebrow">Admin status</p>
            <h2>Source control for portfolio content.</h2>
            <p data-cms-status>Ready.</p>
          </div>
          <div class="inline-actions cms-actions">
            <button class="primary-link" type="button" data-save-cms>Save CMS</button>
            <button class="secondary-link" type="button" data-export-cms>Export JSON</button>
            <label class="file-label">
              Import JSON
              <input type="file" accept="application/json" data-import-cms>
            </label>
            <button class="secondary-link" type="button" data-admin-logout>Sign out</button>
            <button class="secondary-link" type="button" data-reset-cms>Reset</button>
          </div>
        </div>

        <div class="cms-grid">
          <form class="cms-panel" data-profile-form>
            <p class="eyebrow">Profile</p>
            ${profileField("name", "Name")}
            ${profileField("role", "Role")}
            ${profileField("company", "Company")}
            ${profileField("education", "Education")}
            ${profileField("semester", "Current state")}
            ${profileField("location", "Location")}
            ${profileField("phone", "Phone")}
            ${profileField("email", "Email")}
            ${profileField("resumeUrl", "Resume URL")}
            <label>
              Summary
              <textarea data-profile-field="summary">${escapeHtml(content.profile.summary)}</textarea>
            </label>
            <label>
              Status chips JSON
              <textarea data-profile-field="status">${escapeHtml(JSON.stringify(content.profile.status, null, 2))}</textarea>
            </label>
            <label>
              Social links JSON
              <textarea data-profile-field="socials">${escapeHtml(JSON.stringify(content.profile.socials, null, 2))}</textarea>
            </label>
          </form>

          <section class="cms-panel">
            <p class="eyebrow">Resume manager</p>
            <h3>Upload a new PDF resume</h3>
            <p>The admin server stores the uploaded PDF as <code>assets/mohammad-sameer-resume.pdf</code>.</p>
            <label class="upload-zone">
              <span>Choose PDF resume</span>
              <input type="file" accept="application/pdf" data-resume-upload>
            </label>
            <div class="inline-actions">
              <a class="secondary-link" href="${content.profile.resumeUrl}" download data-resume-download-secondary>Download resume</a>
              <a class="secondary-link" href="${content.profile.resumeUrl}" target="_blank" rel="noreferrer" data-resume-open>Open resume</a>
            </div>
          </section>
        </div>

        <section class="cms-panel cms-blog-manager" style="margin-top: 14px;">
            <div class="cms-blog-manager-header">
              <div>
                <p class="eyebrow">Blog Manager</p>
                <h3>All field notes</h3>
              </div>
              <div class="inline-actions" style="margin: 0; gap: 10px;">
                <a class="primary-link" href="/studio/" style="display: inline-flex; align-items: center; gap: 6px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  New Post
                </a>
              </div>
            </div>
            <div class="cms-blog-table" data-cms-blog-table>
              ${posts.length ? posts.map((p) => `
                <div class="cms-blog-row">
                  <div class="cms-blog-row-info">
                    <strong>${escapeHtml(p.title)}</strong>
                    <small>${escapeHtml(p.slug)} — ${escapeHtml(p.date || "No date")}</small>
                  </div>
                  <span class="cms-blog-status ${p.published === false ? "is-draft" : "is-live"}">${p.published === false ? "Draft" : "Live"}</span>
                  <div class="cms-blog-row-actions">
                    <a class="cms-action-btn" href="/studio/#${escapeHtml(p.slug)}" title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      Edit
                    </a>
                    <button class="cms-action-btn" type="button" data-toggle-publish="${escapeHtml(p.slug)}" title="${p.published === false ? "Publish" : "Unpublish"}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p.published === false ? '<path d="M12 2v20M2 12h20"/>' : '<path d="M18 6 6 18M6 6l12 12"/>'}</svg>
                      ${p.published === false ? "Publish" : "Unpublish"}
                    </button>
                    <button class="cms-action-btn cms-action-danger" type="button" data-delete-post="${escapeHtml(p.slug)}" title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Delete
                    </button>
                    ${p.published !== false ? `<a class="cms-action-btn" href="/blog/${escapeHtml(p.slug)}/" target="_blank" title="View live">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      View
                    </a>` : ""}
                  </div>
                </div>
              `).join("") : `
                <div class="empty-state-small" style="padding: 20px; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--radius); text-align: center;">
                  No blog posts yet. <a href="/studio/" style="color: var(--teal); font-weight: bold;">Write your first post &rarr;</a>
                </div>
              `}
            </div>
          </section>

      <section class="cms-panel">
        <p class="eyebrow">Section editors</p>
        <h3>Edit structured content</h3>
        <div class="cms-editor-grid">
          ${editableArrays.map((key) => jsonEditor(key, content[key])).join("")}
        </div>
      </section>

      <section class="cms-panel">
        <p class="eyebrow">Full content JSON</p>
        <h3>Advanced editor for anything on the website</h3>
        <textarea class="cms-full-json" data-full-json>${escapeHtml(JSON.stringify(content, null, 2))}</textarea>
        <div class="inline-actions">
          <button class="secondary-link" type="button" data-apply-full-json>Apply full JSON</button>
          <button class="secondary-link" type="button" data-load-defaults>Load resume defaults</button>
        </div>
      </section>
    </section>
  `;
  statusNode = document.querySelector("[data-cms-status]");
}

function profileField(key, label) {
  return `
    <label>
      ${label}
      <input data-profile-field="${key}" value="${escapeHtml(content.profile[key] || "")}">
    </label>
  `;
}

function jsonEditor(key, value) {
  return `
    <label class="json-card">
      <span>${key}</span>
      <textarea data-json-field="${key}">${escapeHtml(JSON.stringify(value, null, 2))}</textarea>
    </label>
  `;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function readCms() {
  const next = structuredClone(content);

  document.querySelectorAll("[data-profile-field]").forEach((field) => {
    const key = field.dataset.profileField;
    if (key === "status" || key === "socials") {
      next.profile[key] = JSON.parse(field.value);
    } else {
      next.profile[key] = field.value.trim();
    }
  });

  document.querySelectorAll("[data-json-field]").forEach((field) => {
    next[field.dataset.jsonField] = JSON.parse(field.value);
  });

  return next;
}

async function persist(next) {
  content = next;
  const savedToServer = await saveSiteContent(next);
  document.querySelector("[data-full-json]").value = JSON.stringify(next, null, 2);
  setStatus(savedToServer ? "Saved to project files, Supabase when configured, and browser storage." : "Saved locally. Admin session or server save is unavailable.");
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

function setupCmsEvents() {
  document.querySelector("[data-save-cms]").addEventListener("click", async () => {
    try {
      await persist(readCms());
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  });

  document.querySelector("[data-export-cms]").addEventListener("click", () => {
    downloadBlob("sameer-site-content.json", "application/json", exportSiteContent());
  });

  document.querySelector("[data-admin-logout]").addEventListener("click", async () => {
    localStorage.removeItem("sameer-cms-auth-v1");
    try { await fetch("/api/admin/logout", { method: "POST" }); } catch {}
    window.location.href = "/cms/login.html";
  });

  document.querySelector("[data-import-cms]").addEventListener("change", (event) => {
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

  document.querySelector("[data-reset-cms]").addEventListener("click", async () => {
    await resetSiteContent();
    content = defaultSiteContent();
    renderCms();
    setupCmsEvents();
    setStatus("Reset to resume-derived defaults.");
  });

  document.querySelector("[data-apply-full-json]").addEventListener("click", async () => {
    try {
      await persist(JSON.parse(document.querySelector("[data-full-json]").value));
      renderCms();
      setupCmsEvents();
    } catch (error) {
      setStatus(`Full JSON failed: ${error.message}`);
    }
  });

  document.querySelector("[data-load-defaults]").addEventListener("click", async () => {
    await persist(defaultSiteContent());
    renderCms();
    setupCmsEvents();
  });

  document.querySelector("[data-resume-upload]").addEventListener("change", (event) => {
    uploadResume(event.target.files?.[0]);
  });

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

const CMS_AUTH_KEY = "sameer-cms-auth-v1";

function checkClientAuth() {
  try {
    const raw = localStorage.getItem(CMS_AUTH_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // Expire after 8 hours
    if (data.authenticated && Date.now() - data.timestamp < 1000 * 60 * 60 * 8) return true;
    localStorage.removeItem(CMS_AUTH_KEY);
    return false;
  } catch {
    return false;
  }
}

let authenticated = false;

// Try server session first (local dev server)
try {
  const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
  if (sessionResponse.ok) {
    const session = await sessionResponse.json();
    authenticated = session.authenticated === true;
  }
} catch {
  // Server unavailable (Netlify) — fall through
}

// Fallback: check client-side auth token
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
