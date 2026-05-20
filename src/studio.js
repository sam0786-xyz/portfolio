import { bootTheme } from "./theme.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, icon, mountShell, renderPills } from "./render.js";
import { blankBlogPost, deleteBlogPost, listBlogPosts, saveBlogPost, slugify as postSlugify } from "./blog-admin-store.js";

const DB_NAME = "sameer-admin-writing-studio";
const STORE = "drafts";
const DRAFT_PREFIX = "admin-draft:";

const defaultMarkdown = `# Untitled AI field note

Start with the question. Then add evidence, sketches, diagrams, equations, and the final learning.

> observe - prototype - evaluate - explain - improve

## Working idea

- What is the system doing?
- Where can it fail?
- What did I learn while building it?

\`\`\`mermaid
flowchart LR
  A[Question] --> B[Experiment]
  B --> C[Evaluation]
  C --> D[Post]
\`\`\`

$$
L(\\theta)=\\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y_i})^2
$$`;

const defaultDraft = {
  title: "Untitled AI field note",
  tags: "AI/ML, Field Note",
  markdown: defaultMarkdown,
  html: "",
  updatedAt: new Date().toISOString()
};

let editor;
let preview;
let titleInput;
let slugInput;
let excerptInput;
let dateInput;
let coverInput;
let publishedInput;
let tagsInput;
let statusNode;
let wordCountNode;
let postListNode;
let postSearchInput;
let selectedPostSlug = "";
let originalPostSlug = "";
let currentPosts = [];
let saveTimer;
let previewTimer;
let activeMode = "editor";
let mermaidPromise = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function draftStorageId(slug = selectedPostSlug || "new") {
  return `${DRAFT_PREFIX}${slug || "new"}`;
}

async function readDraft(slug = selectedPostSlug || "new") {
  const id = draftStorageId(slug);
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    const raw = localStorage.getItem(id);
    return raw ? JSON.parse(raw) : null;
  }
}

async function writeDraft(draft, slug = selectedPostSlug || "new") {
  const id = draftStorageId(slug);
  const payload = { ...draft, id, updatedAt: new Date().toISOString() };
  localStorage.setItem(id, JSON.stringify(payload));
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(payload);
      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();
    });
  } catch {}
}

function setStatus(message) {
  if (statusNode) statusNode.textContent = message;
}

function sanitizeUrl(url) {
  const value = String(url || "").trim().replace(/^<|>$/g, "");
  if (/^(https?:|mailto:|tel:|data:image\/|\/)/i.test(value)) return escapeHtml(value);
  return "#";
}

function tokenStore() {
  const tokens = [];
  return {
    add(html) {
      const key = `@@TOKEN_${tokens.length}@@`;
      tokens.push(html);
      return key;
    },
    restore(text) {
      return text.replace(/@@TOKEN_(\d+)@@/g, (_, index) => tokens[Number(index)] || "");
    }
  };
}

function formatInline(raw) {
  const tokens = tokenStore();
  let text = String(raw || "");
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, alt, url) =>
    tokens.add(`<img src="${sanitizeUrl(url)}" alt="${escapeHtml(alt)}" loading="lazy">`)
  );
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_, label, url) =>
    tokens.add(`<a href="${sanitizeUrl(url)}" ${String(url).startsWith("http") ? 'target="_blank" rel="noreferrer"' : ""}>${escapeHtml(label)}</a>`)
  );
  text = text.replace(/`([^`]+)`/g, (_, code) => tokens.add(`<code>${escapeHtml(code)}</code>`));
  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/\[\^([^\]]+)\]/g, '<sup><a href="#source-$1">[$1]</a></sup>');
  return tokens.restore(text);
}

function renderMathBlock(source) {
  const safe = escapeHtml(source.trim());
  return `
    <figure class="math-block" data-math="${safe}">
      <div class="math-render">\\[${safe}\\]</div>
      <figcaption>Equation block</figcaption>
      <code>${safe}</code>
    </figure>
  `;
}

function renderTable(lines) {
  const rows = lines.filter((line, index) => index !== 1).map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim())
  );
  return `
    <table>
      <thead><tr>${(rows[0] || []).map((cell) => `<th>${formatInline(cell)}</th>`).join("")}</tr></thead>
      <tbody>${rows.slice(1).map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function isTableStart(lines, index) {
  return Boolean(
    lines[index]?.includes("|") &&
    lines[index + 1]?.includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function extractFootnotes(lines) {
  const footnotes = [];
  const body = [];
  lines.forEach((line) => {
    const match = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (match) {
      footnotes.push({ id: match[1], body: match[2] });
    } else {
      body.push(line);
    }
  });
  return { body, footnotes };
}

function markdownToHtml(markdown) {
  const { body: lines, footnotes } = extractFootnotes(String(markdown || "").replace(/\r\n/g, "\n").split("\n"));
  const html = [];
  let index = 0;

  const isSpecial = (line, offset = 0) => {
    const value = line || "";
    return (
      /^```/.test(value) ||
      /^\$\$\s*$/.test(value) ||
      /^(#{1,4})\s+/.test(value) ||
      /^\s*([-*])\s+/.test(value) ||
      /^\s*\d+\.\s+/.test(value) ||
      /^\s*>\s?/.test(value) ||
      /^\s*---+\s*$/.test(value) ||
      isTableStart(lines, index + offset)
    );
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      if (lang.toLowerCase() === "mermaid") {
        html.push(`<pre class="mermaid">${escapeHtml(code.join("\n"))}</pre>`);
      } else if (lang.toLowerCase() === "math" || lang.toLowerCase() === "katex") {
        html.push(renderMathBlock(code.join("\n")));
      } else {
        html.push(`<pre><code class="${lang ? `language-${escapeHtml(lang)}` : ""}">${escapeHtml(code.join("\n"))}</code></pre>`);
      }
      continue;
    }

    if (/^\$\$\s*$/.test(line)) {
      const math = [];
      index += 1;
      while (index < lines.length && !/^\$\$\s*$/.test(lines[index])) {
        math.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(renderMathBlock(math.join("\n")));
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [lines[index], lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        tableLines.push(lines[index]);
        index += 1;
      }
      html.push(renderTable(tableLines));
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      html.push("<hr>");
      index += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map(formatInline).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isSpecial(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
  }

  if (footnotes.length) {
    html.push(`
      <footer class="sources-section" id="sources">
        <h3>Sources</h3>
        <ol class="sources-list">
          ${footnotes.map((item) => `<li id="source-${escapeHtml(item.id)}">${formatInline(item.body)}</li>`).join("")}
        </ol>
      </footer>
    `);
  }

  return html.join("\n");
}

function stripMarkdown(markdown) {
  return String(markdown || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, " ")
    .replace(/[#>*_`[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingTime(markdown) {
  const words = stripMarkdown(markdown).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function currentDraft() {
  const markdown = editor.value;
  const title = titleInput.value.trim() || "Untitled AI field note";
  const body = markdownToHtml(markdown);
  return {
    slug: postSlugify(slugInput.value || title),
    title,
    excerpt: excerptInput.value.trim() || stripMarkdown(markdown).slice(0, 180) || "AI/ML field note from Mohammad Sameer's writing studio.",
    date: dateInput.value || new Date().toISOString().slice(0, 10),
    cover: coverInput.value.trim() || "/assets/neural-console.png",
    tags: tagsInput.value.trim() || "AI/ML, Field Note",
    markdown,
    body,
    html: body,
    published: Boolean(publishedInput.checked),
    readingTime: estimateReadingTime(markdown),
    updatedAt: new Date().toISOString()
  };
}

function renderTagPills() {
  return renderPills(tagsInput.value.split(",").map((tag) => tag.trim()).filter(Boolean));
}

function updateWordCount() {
  const words = stripMarkdown(editor.value).split(/\s+/).filter(Boolean).length;
  if (wordCountNode) wordCountNode.textContent = `${words} words`;
}

function syncPreview() {
  if (!preview) return;
  const html = markdownToHtml(editor.value);
  preview.innerHTML = `
    <article class="studio-preview-article">
      <p class="eyebrow">Preview / public article</p>
      <h1>${escapeHtml(titleInput.value.trim() || "Untitled AI field note")}</h1>
      <div class="tag-row">${renderTagPills()}</div>
      <div class="article-body">${html}</div>
    </article>
  `;
  updateWordCount();
  renderPreviewMermaid();
}

async function renderPreviewMermaid() {
  const blocks = preview?.querySelectorAll("pre.mermaid");
  if (!blocks?.length) return;
  if (!mermaidPromise) {
    mermaidPromise = import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs").then((module) => {
      module.default.initialize({ startOnLoad: false, theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default" });
      return module.default;
    });
  }
  try {
    const mermaid = await mermaidPromise;
    await mermaid.run({ nodes: blocks });
  } catch (error) {
    console.warn("Mermaid preview render failed:", error);
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  setStatus("Saving protected draft...");
  saveTimer = window.setTimeout(async () => {
    await writeDraft(currentDraft());
    setStatus(`Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }, 450);
}

function isPreviewVisible() {
  return activeMode === "preview" || activeMode === "split";
}

function schedulePreviewSync() {
  if (!isPreviewVisible()) return;
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => syncPreview(), 600);
}

function renderStudio() {
  const blank = blankBlogPost();
  document.querySelector("#studio-root").innerHTML = `
    <section class="page-hero studio-hero">
      <p class="eyebrow">Admin writing studio</p>
      <h1>Command center for public field notes.</h1>
      <p class="lede">Create, edit, publish, and retire blog posts with Markdown source, rich technical inserts, and a production preview in one focused workspace.</p>
    </section>

    <section class="studio-shell studio-pro" aria-label="Blog writing studio">
      <aside class="studio-library" aria-label="Blog post manager">
        <div class="studio-library-header">
          <div>
            <p class="eyebrow">Post registry</p>
            <h2>Blog posts</h2>
          </div>
          <button class="tool-button" type="button" title="Create post" data-new-post>+</button>
        </div>
        <input class="studio-post-search" data-post-search type="search" placeholder="Search title, slug, tag" aria-label="Search posts">
        <div class="studio-post-list" data-post-list></div>
        <div class="studio-library-actions">
          <button class="secondary-link" type="button" data-duplicate-post>Duplicate</button>
          <button class="secondary-link danger-link" type="button" data-delete-post>Delete</button>
        </div>
      </aside>

      <div class="studio-workspace">
        <div class="studio-topbar">
          <input class="studio-title" data-title-input value="${escapeHtml(blank.title)}" aria-label="Post title">
          <div class="segmented" aria-label="Studio view mode">
            <button type="button" data-mode="split">Split</button>
            <button type="button" class="is-active" data-mode="editor">Markdown</button>
            <button type="button" data-mode="preview">Preview</button>
          </div>
          <div class="inline-actions studio-actions">
            <span class="studio-save-status" data-save-status>Loading posts...</span>
            <span class="studio-word-count" data-word-count>0 words</span>
            <button class="primary-link" type="button" data-save-post>${icon("spark")} Save post</button>
            <button class="secondary-link" type="button" data-toggle-published>Publish</button>
          </div>
        </div>

        <details class="studio-meta-details" style="margin-bottom: 12px; border: 1px solid var(--line); border-radius: var(--radius); background: color-mix(in srgb, var(--panel-solid), transparent 30%);">
          <summary style="padding: 10px 14px; font-weight: 700; cursor: pointer; user-select: none; font-size: 0.88rem; color: var(--teal); background: color-mix(in srgb, var(--panel), transparent 40%); display: flex; align-items: center; gap: 8px;">
            <span>Settings & Metadata</span>
          </summary>
          <div class="studio-meta-content" style="padding: 14px; display: grid; gap: 12px;">
            <div class="studio-meta-bar">
              <label>
                Slug
                <input class="studio-tags-input" data-slug-input placeholder="genai-field-notes" value="${escapeHtml(blank.slug)}">
              </label>
              <label>
                Date
                <input class="studio-tags-input" type="date" data-date-input value="${escapeHtml(blank.date)}">
              </label>
              <label class="studio-tags-label">
                Tags
                <input class="studio-tags-input" data-tags-input placeholder="AI/ML, RAG, Tutorial" value="${escapeHtml(blank.tags.join(", "))}">
              </label>
              <label>
                Cover URL
                <input class="studio-tags-input" data-cover-input placeholder="/assets/neural-console.png" value="${escapeHtml(blank.cover)}">
              </label>
              <label class="studio-published-toggle">
                <input type="checkbox" data-published-input>
                Published
              </label>
            </div>

            <label class="studio-excerpt-label" style="margin-top: 10px; display: grid; gap: 6px;">
              Excerpt
              <textarea class="studio-excerpt-input" data-excerpt-input placeholder="Write the promise of this post.">${escapeHtml(blank.excerpt)}</textarea>
            </label>

            <div class="studio-meta-actions" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; border-top: 1px solid var(--line); padding-top: 12px;">
              <span style="font-size: 0.72rem; color: var(--muted); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font);">Developer Tools:</span>
              <button class="secondary-link font-mono" type="button" data-export="json" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; height: 36px; display: inline-flex; align-items: center;">Export JSON</button>
              <button class="secondary-link font-mono" type="button" data-export="mdx" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; height: 36px; display: inline-flex; align-items: center;">Export MDX</button>
              <label class="file-label font-mono" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; height: 36px; border: 1px solid var(--line); border-radius: var(--radius); background: color-mix(in srgb, var(--panel), transparent 40%); font-weight: bold; cursor: pointer; display: inline-flex; align-items: center;">
                Import JSON
                <input type="file" accept="application/json" data-import style="display: none;">
              </label>
            </div>
          </div>
        </details>

        <div class="studio-toolbar" aria-label="Markdown tools">
          <select class="studio-select" data-block aria-label="Insert block style">
            <option value="">Block</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="quote">Quote</option>
            <option value="ul">List</option>
            <option value="ol">Numbered</option>
          </select>
          <button class="tool-button" type="button" title="Bold" data-wrap="bold">B</button>
          <button class="tool-button" type="button" title="Italic" data-wrap="italic">I</button>
          <button class="tool-button" type="button" title="Inline code" data-wrap="code">Code</button>
          <span class="toolbar-divider"></span>
          <button class="tool-button" type="button" title="Horizontal rule" data-tool="hr">HR</button>
          <button class="tool-button" type="button" title="Code fence" data-tool="code">Fence</button>
          <button class="tool-button" type="button" title="Table" data-tool="table">Table</button>
          <button class="tool-button" type="button" title="Image" data-tool="image">Image</button>
          <span class="toolbar-divider"></span>
          <button class="tool-button" type="button" title="Math block" data-tool="math">Math</button>
          <button class="tool-button" type="button" title="Mermaid diagram" data-tool="diagram">Diagram</button>
          <button class="tool-button" type="button" title="Equation plot" data-tool="plot">Plot</button>
          <button class="tool-button" type="button" title="Freehand drawing" data-tool="draw">Draw</button>
          <button class="tool-button" type="button" title="Source citation" data-tool="source">Source</button>
          <button class="tool-button" type="button" title="Studio help" data-tool="info">?</button>
        </div>

        <div class="studio-body" data-studio-body>
          <section class="editor-pane" data-pane="editor" aria-label="Markdown editor">
            <textarea class="editor-surface markdown-editor" data-editor spellcheck="true" aria-label="Markdown source"></textarea>
          </section>
          <section class="preview-pane" data-pane="preview" aria-label="Rendered preview">
            <div class="preview-surface" data-preview></div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function setMode(mode) {
  activeMode = mode;
  const body = document.querySelector("[data-studio-body]");
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  body.classList.toggle("is-editor-only", mode === "editor");
  body.classList.toggle("is-preview-only", mode === "preview");
  if (mode === "preview" || mode === "split") syncPreview();
}

function selectedText(fallback = "") {
  return editor.value.slice(editor.selectionStart, editor.selectionEnd) || fallback;
}

function replaceSelection(value, selectStart = 0, selectLength = 0) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  editor.setRangeText(value, start, end, "end");
  editor.focus();
  if (selectLength) editor.setSelectionRange(start + selectStart, start + selectStart + selectLength);
  scheduleSave();
}

function wrapSelection(prefix, suffix, fallback) {
  const text = selectedText(fallback);
  replaceSelection(`${prefix}${text}${suffix}`, prefix.length, text.length);
}

function prefixCurrentLines(prefixFactory) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const before = editor.value.slice(0, start);
  const selected = editor.value.slice(start, end) || "New line";
  const lineStart = before.lastIndexOf("\n") + 1;
  const current = editor.value.slice(lineStart, end);
  const lines = current.split("\n");
  const updated = lines.map((line, index) => `${prefixFactory(index)}${line.replace(/^\s*(#{1,4}|[-*>]|\d+\.)\s+/, "")}`).join("\n");
  editor.setSelectionRange(lineStart, end);
  replaceSelection(updated, 0, updated.length);
}

function insertMarkdown(markdown) {
  const spacer = editor.value && !editor.value.endsWith("\n") ? "\n\n" : "";
  replaceSelection(`${spacer}${markdown}`);
}

function fence(lang, body) {
  return `\`\`\`${lang}\n${body}\n\`\`\`\n`;
}

function applyBlock(value) {
  if (!value) return;
  if (value === "h1") prefixCurrentLines(() => "# ");
  if (value === "h2") prefixCurrentLines(() => "## ");
  if (value === "h3") prefixCurrentLines(() => "### ");
  if (value === "quote") prefixCurrentLines(() => "> ");
  if (value === "ul") prefixCurrentLines(() => "- ");
  if (value === "ol") prefixCurrentLines((index) => `${index + 1}. `);
}

function openModal(title, bodyHtml, onConfirm, onMount = () => {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="tool-button" type="button" data-close aria-label="Close">X</button>
      </header>
      <div class="modal-body">${bodyHtml}</div>
      <footer class="modal-actions">
        <button class="secondary-link" type="button" data-close>Cancel</button>
        <button class="primary-link" type="button" data-confirm>Confirm insert</button>
      </footer>
    </section>
  `;
  document.body.append(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelector("[data-confirm]").addEventListener("click", () => {
    onConfirm(backdrop);
    close();
  });
  onMount(backdrop);
  backdrop.querySelector("textarea, input, button")?.focus();
}

function insertCodeBlock() {
  openModal(
    "Code fence",
    `
      <label>Language <input data-code-lang value="js"></label>
      <label>Code <textarea data-code-source>const idea = "ship the learning";</textarea></label>
    `,
    (modal) => insertMarkdown(fence(modal.querySelector("[data-code-lang]").value.trim() || "text", modal.querySelector("[data-code-source]").value))
  );
}

function insertTable() {
  insertMarkdown(`| Metric | Value | Note |
| --- | --- | --- |
| Accuracy | 0.92 | Validation set |
| Latency | 240 ms | Prototype run |
`);
}

function insertMathBlock() {
  const initial = "L(\\theta)=\\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y_i})^2";
  openModal(
    "Math block",
    `
      <label>Equation <textarea data-math-source>${escapeHtml(initial)}</textarea></label>
      <div class="preview-box" data-math-preview>${renderMathBlock(initial)}</div>
    `,
    (modal) => insertMarkdown(`$$\n${modal.querySelector("[data-math-source]").value.trim()}\n$$\n`),
    (modal) => {
      const textarea = modal.querySelector("[data-math-source]");
      const previewBox = modal.querySelector("[data-math-preview]");
      textarea.addEventListener("input", () => {
        previewBox.innerHTML = renderMathBlock(textarea.value);
      });
    }
  );
}

function insertDiagramBlock() {
  const initial = `flowchart TD
  A[Question] --> B[Experiment]
  B --> C[Evaluation]
  C --> D[Publish]`;
  openModal(
    "Mermaid diagram",
    `
      <p class="modal-hint">Paste Mermaid syntax. Preview renders it when Mermaid is available.</p>
      <textarea data-mermaid-source>${escapeHtml(selectedText(initial))}</textarea>
    `,
    (modal) => insertMarkdown(fence("mermaid", modal.querySelector("[data-mermaid-source]").value.trim()))
  );
}

function compileExpression(expression) {
  const clean = expression.trim().replace(/^y\s*=\s*/i, "");
  if (!clean || /[^0-9xX+\-*/().,\s^a-zA-Z]/.test(clean)) throw new Error("Unsupported expression");
  const names = ["sin", "cos", "tan", "abs", "sqrt", "log", "exp", "pow", "min", "max", "floor", "ceil"];
  let body = clean.replace(/\^/g, "**").replace(/\bX\b/g, "x");
  names.forEach((name) => {
    body = body.replace(new RegExp(`\\b${name}\\b`, "g"), `Math.${name}`);
  });
  body = body.replace(/\bpi\b/gi, "Math.PI").replace(/\be\b/g, "Math.E");
  return new Function("x", `"use strict"; return (${body});`);
}

function drawPlot(canvas, expression) {
  const dpr = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  const cssWidth = Math.max(320, box.width || 640);
  const cssHeight = 320;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.strokeStyle = "#d8d5cb";
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i += 1) {
    const x = cssWidth / 2 + (i / 10) * (cssWidth * 0.44);
    const y = cssHeight / 2 - (i / 10) * (cssHeight * 0.38);
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x, cssHeight - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(cssWidth - 12, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#303030";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, cssHeight / 2);
  ctx.lineTo(cssWidth - 12, cssHeight / 2);
  ctx.moveTo(cssWidth / 2, 12);
  ctx.lineTo(cssWidth / 2, cssHeight - 12);
  ctx.stroke();

  const fn = compileExpression(expression);
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= cssWidth; px += 2) {
    const x = ((px - cssWidth / 2) / (cssWidth * 0.44)) * 10;
    const yValue = fn(x);
    if (!Number.isFinite(yValue)) {
      started = false;
      continue;
    }
    const py = cssHeight / 2 - (yValue / 10) * (cssHeight * 0.38);
    if (py < -cssHeight || py > cssHeight * 2) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "#303030";
  ctx.font = "14px sans-serif";
  ctx.fillText(`y = ${expression.replace(/^y\s*=\s*/i, "")}`, 18, 28);
}

function insertPlotBlock() {
  const initial = "sin(x) + x^2 / 18";
  openModal(
    "Equation plot",
    `
      <label>Expression <input data-plot-source value="${escapeHtml(initial)}"></label>
      <canvas class="plot-canvas" data-plot-canvas></canvas>
      <div class="preview-box" data-plot-error hidden></div>
    `,
    (modal) => {
      const canvas = modal.querySelector("[data-plot-canvas]");
      const source = modal.querySelector("[data-plot-source]").value;
      drawPlot(canvas, source);
      insertMarkdown(`![Equation plot: ${source}](${canvas.toDataURL("image/png")})

_Equation plot: ${source}_
`);
    },
    (modal) => {
      const input = modal.querySelector("[data-plot-source]");
      const canvas = modal.querySelector("[data-plot-canvas]");
      const error = modal.querySelector("[data-plot-error]");
      const update = () => {
        try {
          error.hidden = true;
          drawPlot(canvas, input.value);
        } catch (plotError) {
          error.hidden = false;
          error.textContent = plotError.message;
        }
      };
      window.setTimeout(update, 0);
      input.addEventListener("input", update);
    }
  );
}

function setupDrawingCanvas(modal) {
  const canvas = modal.querySelector("[data-drawing-canvas]");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    canvas.width = Math.floor(Math.max(320, box.width || 640) * dpr);
    canvas.height = Math.floor(340 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  };
  resize();
  let mode = "pen";
  let drawing = false;
  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const move = (event) => {
    if (!drawing) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = mode === "erase" ? "#ffffff" : "#101114";
    ctx.lineWidth = mode === "erase" ? 18 : 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };
  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", () => { drawing = false; });
  modal.querySelectorAll("[data-draw-mode]").forEach((button) => {
    button.addEventListener("click", () => { mode = button.dataset.drawMode; });
  });
  modal.querySelector("[data-draw-clear]").addEventListener("click", resize);
}

function insertDrawingBlock() {
  openModal(
    "Freehand drawing",
    `
      <div class="inline-actions">
        <button class="secondary-link" type="button" data-draw-mode="pen">Pen</button>
        <button class="secondary-link" type="button" data-draw-mode="erase">Erase</button>
        <button class="secondary-link" type="button" data-draw-clear>Clear</button>
      </div>
      <canvas class="drawing-canvas" data-drawing-canvas></canvas>
    `,
    (modal) => {
      const canvas = modal.querySelector("[data-drawing-canvas]");
      insertMarkdown(`![Freehand diagram](${canvas.toDataURL("image/png")})

_Freehand diagram_
`);
    },
    setupDrawingCanvas
  );
}

function insertImageBlock() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertMarkdown(`![${file.name}](${reader.result})
`);
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

function nextSourceId() {
  const ids = Array.from(editor.value.matchAll(/\[\^(\d+)\]:/g)).map((match) => Number(match[1]));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function insertSourceBlock() {
  openModal(
    "Source citation",
    `
      <p class="modal-hint">Adds a citation at the cursor and a source entry at the bottom.</p>
      <label>Title <input data-src-title placeholder="Attention Is All You Need"></label>
      <label>URL <input data-src-url placeholder="https://arxiv.org/abs/1706.03762"></label>
    `,
    (modal) => {
      const title = modal.querySelector("[data-src-title]").value.trim() || "Source";
      const rawUrl = modal.querySelector("[data-src-url]").value.trim();
      const id = nextSourceId();
      const citation = `[^${id}]`;
      const source = rawUrl ? `\n\n[^${id}]: [${title}](${rawUrl})\n` : `\n\n[^${id}]: ${title}\n`;
      replaceSelection(citation);
      editor.value = `${editor.value.trimEnd()}${source}`;
      syncPreview();
      scheduleSave();
    }
  );
}

function openInfoTool() {
  openModal(
    "Studio guide",
    `
      <div class="studio-help">
        <p><strong>Markdown first:</strong> Write on the left. The public article preview updates on the right.</p>
        <p><strong>Diagrams:</strong> Use Mermaid fenced blocks with <code>\`\`\`mermaid</code>.</p>
        <p><strong>Equations:</strong> Use <code>$$</code> blocks for display math.</p>
        <p><strong>Publishing:</strong> Publish writes into CMS blog content and keeps the draft available here.</p>
      </div>
    `,
    () => {}
  );
}

function downloadBlob(filename, type, body) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([body], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 800);
}

function tagsArray(value = tagsInput?.value || "") {
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function uniqueSlug(base, current = originalPostSlug) {
  const cleanBase = postSlugify(base);
  const used = new Set(currentPosts.filter((post) => post.slug !== current).map((post) => post.slug));
  if (!used.has(cleanBase)) return cleanBase;
  let index = 2;
  while (used.has(`${cleanBase}-${index}`)) index += 1;
  return `${cleanBase}-${index}`;
}

function postAsDraft(post) {
  const fallbackMarkdown = post.markdown || stripMarkdown(post.body || "") || defaultMarkdown;
  return {
    ...post,
    slug: post.slug || postSlugify(post.title),
    title: post.title || defaultDraft.title,
    excerpt: post.excerpt || "Draft a concise promise for the reader.",
    date: (post.date || new Date().toISOString()).slice(0, 10),
    cover: post.cover || "/assets/neural-console.png",
    tags: Array.isArray(post.tags) ? post.tags.join(", ") : post.tags || defaultDraft.tags,
    markdown: fallbackMarkdown,
    published: post.published !== false
  };
}

function renderPostList() {
  if (!postListNode) return;
  const query = (postSearchInput?.value || "").toLowerCase().trim();
  const posts = currentPosts.filter((post) => {
    const haystack = `${post.title} ${post.slug} ${(post.tags || []).join(" ")}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  const drafts = posts.filter((post) => post.published === false);
  const published = posts.filter((post) => post.published !== false);

  if (!posts.length) {
    postListNode.innerHTML = `<div class="empty-state studio-empty"><h3>No posts found</h3><p>Create a new field note or adjust the search.</p></div>`;
    return;
  }

  let html = "";

  html += `
    <div class="studio-list-section" style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--amber); margin-bottom: 8px; font-weight: 700;">Drafts (New)</h3>
      <div style="display: grid; gap: 8px;">
        ${drafts.length ? drafts.map((post) => `
          <button class="studio-post-row ${post.slug === originalPostSlug ? "is-active" : ""}" type="button" data-load-post="${escapeHtml(post.slug)}">
            <span>
              <strong>${escapeHtml(post.title)}</strong>
              <small>${escapeHtml(post.slug)} / ${escapeHtml(post.date || "No date")}</small>
            </span>
            <em class="is-draft">Draft</em>
          </button>
        `).join("") : `<div style="padding: 10px; font-size: 0.8rem; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--radius); text-align: center;">No active drafts.</div>`}
      </div>
    </div>
  `;

  html += `
    <div class="studio-list-section">
      <h3 style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal); margin-bottom: 8px; font-weight: 700;">Published (Done)</h3>
      <div style="display: grid; gap: 8px;">
        ${published.length ? published.map((post) => `
          <button class="studio-post-row ${post.slug === originalPostSlug ? "is-active" : ""}" type="button" data-load-post="${escapeHtml(post.slug)}">
            <span>
              <strong>${escapeHtml(post.title)}</strong>
              <small>${escapeHtml(post.slug)} / ${escapeHtml(post.date || "No date")}</small>
            </span>
            <em>Live</em>
          </button>
        `).join("") : `<div style="padding: 10px; font-size: 0.8rem; color: var(--muted); border: 1px dashed var(--line); border-radius: var(--radius); text-align: center;">No published posts yet.</div>`}
      </div>
    </div>
  `;

  postListNode.innerHTML = html;
}

function updatePublishControls() {
  const button = document.querySelector("[data-toggle-published]");
  if (button) button.textContent = publishedInput?.checked ? "Unpublish" : "Publish";
}

async function loadPost(post, options = {}) {
  const draftSlug = post.slug || "new";
  const draft = options.skipDraft ? null : await readDraft(draftSlug);
  const next = postAsDraft({ ...post, ...(draft || {}) });
  selectedPostSlug = next.slug;
  originalPostSlug = options.unsaved ? "" : post.slug || "";
  titleInput.value = next.title;
  slugInput.value = next.slug;
  excerptInput.value = next.excerpt;
  dateInput.value = next.date;
  coverInput.value = next.cover;
  tagsInput.value = next.tags;
  publishedInput.checked = Boolean(next.published);
  editor.value = next.markdown;
  renderPostList();
  updatePublishControls();
  syncPreview();
  setMode(activeMode);
  setStatus(draft?.updatedAt ? `Restored draft ${new Date(draft.updatedAt).toLocaleString()}` : "Post loaded.");
}

async function loadBlankPost() {
  const post = blankBlogPost();
  post.slug = uniqueSlug(post.slug, "");
  post.markdown = defaultMarkdown;
  post.published = false;
  await loadPost(post, { skipDraft: true, unsaved: true });
  setStatus("New unsaved post ready.");
}

async function refreshPosts(preferredSlug = originalPostSlug) {
  currentPosts = await listBlogPosts();
  renderPostList();
  const selected = currentPosts.find((post) => post.slug === preferredSlug) || currentPosts[0];
  if (selected) await loadPost(selected);
  else await loadBlankPost();
}

function currentPostPayload() {
  const draft = currentDraft();
  const slug = uniqueSlug(draft.slug || draft.title);
  slugInput.value = slug;
  return {
    slug,
    title: draft.title,
    excerpt: draft.excerpt,
    date: draft.date,
    tags: tagsArray(draft.tags),
    cover: draft.cover,
    readingTime: estimateReadingTime(draft.markdown),
    markdown: draft.markdown,
    body: draft.body,
    published: draft.published
  };
}

async function persistCurrentPost(message = "Saving post...") {
  setStatus(message);
  const payload = currentPostPayload();
  const priorSlug = originalPostSlug;
  const result = await saveBlogPost(payload, originalPostSlug);
  const saved = result.post;
  selectedPostSlug = saved.slug;
  originalPostSlug = saved.slug;
  await writeDraft(currentDraft(), saved.slug);
  currentPosts = currentPosts.filter((post) => post.slug !== priorSlug && post.slug !== saved.slug);
  currentPosts.unshift(saved);
  renderPostList();
  updatePublishControls();
  setStatus(result.source === "supabase" ? "Saved to Supabase and mirrored fallback JSON." : "Saved to fallback JSON. Supabase is unavailable.");
}

async function duplicateCurrentPost() {
  const draft = currentDraft();
  const title = `${draft.title} Copy`;
  const post = {
    ...draft,
    slug: uniqueSlug(`${draft.slug || draft.title}-copy`, ""),
    title,
    published: false
  };
  await loadPost(post, { skipDraft: true, unsaved: true });
  setStatus("Duplicated as an unsaved draft.");
}

async function deleteCurrentPost() {
  if (!originalPostSlug) {
    await loadBlankPost();
    return;
  }
  const ok = window.confirm(`Delete "${titleInput.value.trim()}" permanently?`);
  if (!ok) return;
  setStatus("Deleting post...");
  const result = await deleteBlogPost(originalPostSlug);
  currentPosts = currentPosts.filter((post) => post.slug !== originalPostSlug);
  renderPostList();
  setStatus(result.source === "supabase" ? "Deleted from Supabase and fallback JSON." : "Deleted from fallback JSON.");
  if (currentPosts[0]) await loadPost(currentPosts[0], { skipDraft: true });
  else await loadBlankPost();
}

function setupEvents() {
  editor = document.querySelector("[data-editor]");
  preview = document.querySelector("[data-preview]");
  titleInput = document.querySelector("[data-title-input]");
  slugInput = document.querySelector("[data-slug-input]");
  excerptInput = document.querySelector("[data-excerpt-input]");
  dateInput = document.querySelector("[data-date-input]");
  coverInput = document.querySelector("[data-cover-input]");
  publishedInput = document.querySelector("[data-published-input]");
  tagsInput = document.querySelector("[data-tags-input]");
  statusNode = document.querySelector("[data-save-status]");
  wordCountNode = document.querySelector("[data-word-count]");
  postListNode = document.querySelector("[data-post-list]");
  postSearchInput = document.querySelector("[data-post-search]");

  postListNode.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-load-post]");
    if (!button) return;
    const post = currentPosts.find((item) => item.slug === button.dataset.loadPost);
    if (post) await loadPost(post);
  });

  postSearchInput.addEventListener("input", renderPostList);

  document.querySelector("[data-new-post]").addEventListener("click", () => {
    loadBlankPost();
  });

  document.querySelector("[data-duplicate-post]").addEventListener("click", () => {
    duplicateCurrentPost().catch((error) => setStatus(`Duplicate failed: ${error.message}`));
  });

  document.querySelector("[data-delete-post]").addEventListener("click", () => {
    deleteCurrentPost().catch((error) => setStatus(`Delete failed: ${error.message}`));
  });

  document.querySelector("[data-save-post]").addEventListener("click", () => {
    persistCurrentPost().catch((error) => setStatus(`Save failed: ${error.message}`));
  });

  document.querySelector("[data-toggle-published]").addEventListener("click", () => {
    publishedInput.checked = !publishedInput.checked;
    updatePublishControls();
    persistCurrentPost(publishedInput.checked ? "Publishing post..." : "Unpublishing post...").catch((error) => {
      setStatus(`Publish state failed: ${error.message}`);
    });
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  document.querySelector("[data-block]").addEventListener("change", (event) => {
    applyBlock(event.target.value);
    event.target.value = "";
  });

  document.querySelectorAll("[data-wrap]").forEach((button) => {
    button.addEventListener("click", () => {
      const wrap = button.dataset.wrap;
      if (wrap === "bold") wrapSelection("**", "**", "bold text");
      if (wrap === "italic") wrapSelection("*", "*", "italic text");
      if (wrap === "code") wrapSelection("`", "`", "code");
    });
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      const tool = button.dataset.tool;
      if (tool === "hr") insertMarkdown("---\n");
      if (tool === "code") insertCodeBlock();
      if (tool === "table") insertTable();
      if (tool === "image") insertImageBlock();
      if (tool === "math") insertMathBlock();
      if (tool === "diagram") insertDiagramBlock();
      if (tool === "plot") insertPlotBlock();
      if (tool === "draw") insertDrawingBlock();
      if (tool === "source") insertSourceBlock();
      if (tool === "info") openInfoTool();
    });
  });

  document.querySelector('[data-export="json"]').addEventListener("click", () => {
    downloadBlob(`${currentDraft().slug}.json`, "application/json", JSON.stringify(currentPostPayload(), null, 2));
  });

  document.querySelector('[data-export="mdx"]').addEventListener("click", () => {
    const draft = currentDraft();
    downloadBlob(`${draft.slug}.mdx`, "text/markdown", `---\ntitle: "${draft.title}"\ndate: "${draft.date}"\ntags: [${tagsArray(draft.tags).map((tag) => `"${tag}"`).join(", ")}]\npublished: ${draft.published}\n---\n\n${editor.value}\n`);
  });

  document.querySelector("[data-import]").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);
        if (typeof imported.markdown !== "string" && typeof imported.html !== "string") throw new Error("Draft content missing");
        titleInput.value = imported.title || defaultDraft.title;
        slugInput.value = postSlugify(imported.slug || imported.title || defaultDraft.title);
        excerptInput.value = imported.excerpt || "Imported post draft.";
        dateInput.value = imported.date || new Date().toISOString().slice(0, 10);
        coverInput.value = imported.cover || "/assets/neural-console.png";
        tagsInput.value = Array.isArray(imported.tags) ? imported.tags.join(", ") : imported.tags || defaultDraft.tags;
        publishedInput.checked = Boolean(imported.published);
        editor.value = imported.markdown || stripMarkdown(imported.html);
        syncPreview();
        originalPostSlug = "";
        selectedPostSlug = slugInput.value;
        await writeDraft(currentDraft(), selectedPostSlug);
        updatePublishControls();
        setStatus("Imported draft saved.");
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  });

  editor.addEventListener("input", () => {
    schedulePreviewSync();
    scheduleSave();
  });
  titleInput.addEventListener("input", () => {
    if (!originalPostSlug) slugInput.value = postSlugify(titleInput.value);
    schedulePreviewSync();
    scheduleSave();
  });
  [slugInput, excerptInput, dateInput, coverInput, tagsInput, publishedInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (input === publishedInput) updatePublishControls();
      schedulePreviewSync();
      scheduleSave();
    });
    input.addEventListener("change", () => {
      if (input === publishedInput) updatePublishControls();
      schedulePreviewSync();
      scheduleSave();
    });
  });
}

async function hydrateStudio() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(window.location.search);
  const preferredSlug = hash || params.get("post") || params.get("slug") || originalPostSlug;

  try {
    await refreshPosts(preferredSlug);
  } catch (error) {
    setStatus(`Post list unavailable: ${error.message}`);
    const fallback = getSiteContent().blogPosts?.[0] || blankBlogPost();
    await loadPost(fallback, { skipDraft: false, unsaved: false });
  }
  updatePublishControls();

  window.addEventListener("hashchange", async () => {
    if (saveTimer) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
      await writeDraft(currentDraft());
    }
    const nextSlug = window.location.hash.slice(1);
    if (nextSlug && nextSlug !== originalPostSlug) {
      const matched = currentPosts.find((post) => post.slug === nextSlug);
      if (matched) await loadPost(matched);
    }
  });
}

const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" }).catch(() => null);
const session = sessionResponse?.ok ? await sessionResponse.json() : { authenticated: false };
if (!session.authenticated) {
  window.location.href = `/cms/login.html?next=${encodeURIComponent("/studio/")}`;
  throw new Error("Admin login required.");
}

await initSiteContent();
mountShell("studio");
bootTheme();
renderStudio();
setupEvents();
hydrateStudio();
bootInteractions(document.querySelector("#studio-root"));
