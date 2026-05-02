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
  "stats",
  "skills",
  "experience",
  "projects",
  "linkedinPosts",
  "education",
  "responsibilities",
  "certificates",
  "blogPosts"
];

function renderCms() {
  content = getSiteContent();
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
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/cms/";
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
}

const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" }).catch(() => null);
const session = sessionResponse?.ok ? await sessionResponse.json() : { authenticated: false };
if (!session.authenticated) {
  window.location.href = "/cms/";
  throw new Error("Admin login required.");
}

await initSiteContent();
mountShell("cms");
bootTheme();
renderCms();
setupCmsEvents();
bootInteractions(document.querySelector("#cms-root"));
