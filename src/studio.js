import { bootTheme } from "./theme.js";
import { getSiteContent, initSiteContent, saveSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, mountShell } from "./render.js";

const DB_NAME = "sameer-admin-writing-studio";
const STORE = "drafts";
const DRAFT_ID = "admin-draft";

const defaultDraft = {
  title: "Untitled AI field note",
  html: `
    <h1>Untitled AI field note</h1>
    <p>Start with a question, add evidence, then turn the answer into something anyone can explore.</p>
    <blockquote>observe - prototype - evaluate - explain - improve</blockquote>
  `,
  updatedAt: new Date().toISOString()
};

let editor;
let preview;
let titleInput;
let statusNode;
let saveTimer;
let activeMode = "editor";

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

async function readDraft() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).get(DRAFT_ID);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    const raw = localStorage.getItem(DRAFT_ID);
    return raw ? JSON.parse(raw) : null;
  }
}

async function writeDraft(draft) {
  const payload = { ...draft, id: DRAFT_ID, updatedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_ID, JSON.stringify(payload));
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

function currentDraft() {
  return {
    title: titleInput.value.trim() || "Untitled AI field note",
    html: editor.innerHTML,
    updatedAt: new Date().toISOString()
  };
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  setStatus("Saving protected draft...");
  saveTimer = window.setTimeout(async () => {
    await writeDraft(currentDraft());
    setStatus(`Protected draft saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  }, 450);
}

function syncPreview() {
  if (!preview) return;
  preview.innerHTML = `
    <p class="eyebrow">Preview / CMS draft</p>
    <h1>${escapeHtml(titleInput.value.trim() || "Untitled AI field note")}</h1>
    ${editor.innerHTML}
  `;
}

function command(name, value = null) {
  editor.focus();
  document.execCommand(name, false, value);
  syncPreview();
  scheduleSave();
}

function insertHtml(html) {
  editor.focus();
  document.execCommand("insertHTML", false, html);
  syncPreview();
  scheduleSave();
}

function renderStudio() {
  document.querySelector("#studio-root").innerHTML = `
    <section class="page-hero">
      <p class="eyebrow">Admin writing studio</p>
      <h1>Write, preview, diagram, plot, and publish from the CMS.</h1>
      <p class="lede">A protected workspace for AI/ML field notes, diagrams, equations, and article drafts.</p>
    </section>

    <section class="studio-shell" aria-label="Blog writing studio">
      <div class="studio-topbar">
        <input class="studio-title" data-title-input value="${escapeHtml(defaultDraft.title)}" aria-label="Draft title">
        <div class="segmented" aria-label="Editor mode">
          <button type="button" class="is-active" data-mode="editor">Editor</button>
          <button type="button" data-mode="preview">Preview</button>
        </div>
        <div class="inline-actions studio-actions">
          <button class="primary-link" type="button" data-publish-blog>Save to CMS blog</button>
          <button class="secondary-link" type="button" data-export="json">Export JSON</button>
          <button class="secondary-link" type="button" data-export="mdx">Export MDX</button>
          <label class="file-label">
            Import
            <input type="file" accept="application/json" data-import>
          </label>
        </div>
      </div>

      <div class="studio-meta-bar">
        <label class="studio-tags-label">Tags
          <input class="studio-tags-input" data-tags-input placeholder="AI/ML, RAG, Tutorial" value="AI/ML, Field Note">
        </label>
      </div>

      <div class="studio-toolbar" aria-label="Editor tools">
        <select class="studio-select" data-block aria-label="Block style">
          <option value="p">Text</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
        <button class="tool-button" type="button" title="Bold" data-command="bold">B</button>
        <button class="tool-button" type="button" title="Italic" data-command="italic">I</button>
        <button class="tool-button" type="button" title="Underline" data-command="underline">U</button>
        <button class="tool-button" type="button" title="Quote" data-command="formatBlock" data-value="blockquote">Quote</button>
        <button class="tool-button" type="button" title="Bulleted list" data-command="insertUnorderedList">List</button>
        <button class="tool-button" type="button" title="Numbered list" data-command="insertOrderedList">1 2</button>
        <span class="toolbar-divider"></span>
        <button class="tool-button" type="button" title="Horizontal rule" data-tool="hr">HR</button>
        <button class="tool-button" type="button" title="Code block" data-tool="code">Code</button>
        <button class="tool-button" type="button" title="Table" data-tool="table">Table</button>
        <button class="tool-button" type="button" title="Image" data-tool="image">Image</button>
        <span class="toolbar-divider"></span>
        <button class="tool-button" type="button" title="Math block" data-tool="math">Math</button>
        <button class="tool-button" type="button" title="Mermaid diagram" data-tool="mermaid">Mermaid</button>
        <button class="tool-button" type="button" title="Legacy diagram" data-tool="diagram">Diagram</button>
        <button class="tool-button" type="button" title="Equation plot" data-tool="plot">Plot</button>
        <button class="tool-button" type="button" title="Freehand drawing" data-tool="draw">Draw</button>
        <span class="toolbar-divider"></span>
        <button class="tool-button" type="button" title="Add citation" data-tool="cite">Cite</button>
      </div>

      <div class="studio-body">
        <section class="editor-pane" data-pane="editor">
          <article class="editor-surface" contenteditable="true" spellcheck="true" data-editor></article>
        </section>
        <section class="preview-pane is-hidden" data-pane="preview">
          <article class="preview-surface article-body" data-preview></article>
        </section>
        <aside class="studio-side" aria-label="Draft details">
          <div class="side-panel">
            <p class="eyebrow">Draft state</p>
            <h3>Draft state</h3>
            <p data-save-status>Loading protected draft...</p>
          </div>
          <div class="side-panel">
            <p class="eyebrow">Blocks</p>
            <p>Text, tables, math, diagrams, plots, images, and drawings.</p>
          </div>
          <div class="side-panel">
            <p class="eyebrow">Publish path</p>
            <p>Save the current draft into CMS blog content, then refine it from the admin JSON editor when needed.</p>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function slugify(value) {
  return String(value || "untitled-field-note")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "untitled-field-note";
}

function estimateReadingTime(html) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

async function publishDraftToCms() {
  const draft = currentDraft();
  const slug = slugify(draft.title);
  const plain = draft.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const tagsInput = document.querySelector("[data-tags-input]");
  const tagsRaw = tagsInput ? tagsInput.value : "AI/ML, Field Note";
  const tags = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
  const post = {
    slug,
    title: draft.title,
    excerpt: plain.slice(0, 180) || "AI/ML field note from Mohammad Sameer's writing studio.",
    date: new Date().toISOString().slice(0, 10),
    tags,
    cover: "/assets/neural-console.png",
    readingTime: estimateReadingTime(draft.html),
    body: draft.html
  };
  const content = getSiteContent();
  const blogPosts = Array.isArray(content.blogPosts) ? [...content.blogPosts] : [];
  const existingIndex = blogPosts.findIndex((item) => item.slug === slug);
  if (existingIndex >= 0) {
    blogPosts[existingIndex] = { ...blogPosts[existingIndex], ...post };
  } else {
    blogPosts.unshift(post);
  }
  const saved = await saveSiteContent({ ...content, blogPosts });
  setStatus(saved ? "Saved to CMS blog content." : "Saved in browser. Sign in through the admin server to persist it.");
}

function setMode(mode) {
  activeMode = mode;
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode);
  });
  document.querySelector('[data-pane="editor"]').classList.toggle("is-hidden", mode !== "editor");
  document.querySelector('[data-pane="preview"]').classList.toggle("is-hidden", mode !== "preview");
  if (mode === "preview") syncPreview();
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

function renderMathFigure(source) {
  const safe = escapeHtml(source.trim());
  return `
    <figure class="math-block" data-math="${safe}">
      <div class="math-render">\\[${safe}\\]</div>
      <figcaption>Equation block</figcaption>
      <code>${safe}</code>
    </figure>
  `;
}

function openMathTool() {
  const initial = "L(\\theta)=\\frac{1}{n}\\sum_{i=1}^{n}(y_i-\\hat{y_i})^2";
  openModal(
    "Math block",
    `
      <textarea data-math-source>${escapeHtml(initial)}</textarea>
      <div class="preview-box" data-math-preview>${renderMathFigure(initial)}</div>
    `,
    (modal) => insertHtml(renderMathFigure(modal.querySelector("[data-math-source]").value)),
    (modal) => {
      const textarea = modal.querySelector("[data-math-source]");
      const previewBox = modal.querySelector("[data-math-preview]");
      textarea.addEventListener("input", () => {
        previewBox.innerHTML = renderMathFigure(textarea.value);
      });
    }
  );
}

function parseDiagram(source) {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith("graph "));
  const labels = new Map();
  const edges = [];

  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_]+)(?:\[(.*?)\])?\s*[-=]*>\s*([A-Za-z0-9_]+)(?:\[(.*?)\])?/);
    if (match) {
      const [, from, fromLabel, to, toLabel] = match;
      labels.set(from, fromLabel || from);
      labels.set(to, toLabel || to);
      edges.push([from, to]);
    }
  }

  if (!labels.size) {
    labels.set("A", "Idea");
    labels.set("B", "Prototype");
    labels.set("C", "Evaluate");
    edges.push(["A", "B"], ["B", "C"]);
  }

  return { labels, edges };
}

function renderDiagram(source) {
  const { labels, edges } = parseDiagram(source);
  const nodes = Array.from(labels.entries());
  const width = 720;
  const height = Math.max(260, nodes.length * 92);
  const positions = new Map(nodes.map(([id], index) => [id, { x: width / 2, y: 48 + index * 86 }]));
  const edgeSvg = edges
    .map(([from, to]) => {
      const a = positions.get(from);
      const b = positions.get(to);
      if (!a || !b) return "";
      return `<path d="M ${a.x} ${a.y + 26} C ${a.x} ${a.y + 54}, ${b.x} ${b.y - 54}, ${b.x} ${b.y - 26}" fill="none" stroke="currentColor" stroke-width="2" opacity="0.42" marker-end="url(#arrow)"/>`;
    })
    .join("");
  const nodeSvg = nodes
    .map(([id, label]) => {
      const point = positions.get(id);
      return `
        <g transform="translate(${point.x - 130} ${point.y - 28})">
          <rect width="260" height="56" rx="8" fill="var(--panel-solid)" stroke="var(--line-strong)"/>
          <text x="130" y="35" text-anchor="middle" fill="var(--text)" font-size="15" font-family="Inter, sans-serif">${escapeHtml(label)}</text>
        </g>
      `;
    })
    .join("");

  return `
    <svg class="diagram-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Generated diagram">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"></path>
        </marker>
      </defs>
      ${edgeSvg}
      ${nodeSvg}
    </svg>
  `;
}

function renderDiagramFigure(source) {
  return `
    <figure class="diagram-block" data-diagram="${escapeHtml(source)}">
      ${renderDiagram(source)}
      <figcaption>Confirmed diagram from text syntax</figcaption>
    </figure>
  `;
}

function openDiagramTool() {
  const initial = "graph TD\nIdea[AI idea] --> Prototype[Prototype]\nPrototype --> Evaluate[Evaluate]\nEvaluate --> Explain[Explain]";
  openModal(
    "Diagram",
    `
      <textarea data-diagram-source>${escapeHtml(initial)}</textarea>
      <div class="preview-box" data-diagram-preview>${renderDiagram(initial)}</div>
    `,
    (modal) => insertHtml(renderDiagramFigure(modal.querySelector("[data-diagram-source]").value)),
    (modal) => {
      const textarea = modal.querySelector("[data-diagram-source]");
      const previewBox = modal.querySelector("[data-diagram-preview]");
      textarea.addEventListener("input", () => {
        previewBox.innerHTML = renderDiagram(textarea.value);
      });
    }
  );
}

function compileExpression(expression) {
  const clean = expression.trim().replace(/^y\s*=\s*/i, "");
  if (!clean || /[^0-9xX+\-*/().,\s^a-zA-Z]/.test(clean)) {
    throw new Error("Unsupported expression");
  }
  const names = ["sin", "cos", "tan", "abs", "sqrt", "log", "exp", "pow", "min", "max", "floor", "ceil"];
  let body = clean.replace(/\^/g, "**").replace(/\bX\b/g, "x");
  for (const name of names) {
    body = body.replace(new RegExp(`\\b${name}\\b`, "g"), `Math.${name}`);
  }
  body = body.replace(/\bpi\b/gi, "Math.PI").replace(/\be\b/g, "Math.E");
  return new Function("x", `"use strict"; return (${body});`);
}

function drawPlot(canvas, expression) {
  const dpr = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  canvas.width = Math.max(640, Math.floor(box.width * dpr));
  canvas.height = Math.max(300, Math.floor(320 * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#d8d5cb";
  ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i += 1) {
    const x = width / 2 + (i / 10) * (width * 0.44);
    const y = height / 2 - (i / 10) * (height * 0.38);
    ctx.beginPath();
    ctx.moveTo(x, 12);
    ctx.lineTo(x, height - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(width - 12, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#303030";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, height / 2);
  ctx.lineTo(width - 12, height / 2);
  ctx.moveTo(width / 2, 12);
  ctx.lineTo(width / 2, height - 12);
  ctx.stroke();

  const fn = compileExpression(expression);
  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let px = 0; px <= width; px += 2) {
    const x = ((px - width / 2) / (width * 0.44)) * 10;
    const yValue = fn(x);
    if (!Number.isFinite(yValue)) {
      started = false;
      continue;
    }
    const py = height / 2 - (yValue / 10) * (height * 0.38);
    if (py < -height || py > height * 2) {
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

function openPlotTool() {
  const initial = "sin(x) + x^2 / 18";
  openModal(
    "Equation plot",
    `
      <input data-plot-source value="${escapeHtml(initial)}" aria-label="Equation">
      <canvas class="plot-canvas" data-plot-canvas></canvas>
      <div class="preview-box" data-plot-error hidden></div>
    `,
    (modal) => {
      const canvas = modal.querySelector("[data-plot-canvas]");
      const source = modal.querySelector("[data-plot-source]").value;
      drawPlot(canvas, source);
      const image = canvas.toDataURL("image/png");
      insertHtml(`
        <figure class="plot-block" data-expression="${escapeHtml(source)}">
          <img src="${image}" alt="Plot of ${escapeHtml(source)}">
          <figcaption>Confirmed equation plot: ${escapeHtml(source)}</figcaption>
        </figure>
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

function openDrawTool() {
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
      insertHtml(`
        <figure class="drawing-block">
          <img src="${canvas.toDataURL("image/png")}" alt="Inserted freehand drawing">
          <figcaption>Confirmed freehand diagram</figcaption>
        </figure>
      `);
    },
    setupDrawingCanvas
  );
}

function setupDrawingCanvas(modal) {
  const canvas = modal.querySelector("[data-drawing-canvas]");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const image = ctx.getImageData(0, 0, Math.max(1, canvas.width), Math.max(1, canvas.height));
    canvas.width = Math.max(640, Math.floor(box.width * dpr));
    canvas.height = Math.max(340, Math.floor(340 * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    try {
      ctx.putImageData(image, 0, 0);
    } catch {}
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
  canvas.addEventListener("pointerup", () => {
    drawing = false;
  });
  modal.querySelectorAll("[data-draw-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.drawMode;
    });
  });
  modal.querySelector("[data-draw-clear]").addEventListener("click", () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  });
}

let citeCounter = 0;

function openMermaidTool() {
  const initial = `graph TD
    A[Data Collection] --> B[Preprocessing]
    B --> C[Model Training]
    C --> D[Evaluation]
    D --> E[Deployment]
    D -->|Iterate| B`;
  openModal(
    "Mermaid diagram",
    `
      <p class="modal-hint">Write <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noreferrer">Mermaid syntax</a> — flowcharts, sequence, class, ER, gantt, etc.</p>
      <textarea data-mermaid-source>${escapeHtml(initial)}</textarea>
    `,
    (modal) => {
      const code = modal.querySelector("[data-mermaid-source]").value.trim();
      insertHtml(`<pre class="mermaid">${escapeHtml(code)}</pre>`);
    }
  );
}

function openCiteTool() {
  openModal(
    "Add citation",
    `
      <label>Author(s) <input data-cite-author placeholder="Vaswani et al."></label>
      <label>Title <input data-cite-title placeholder="Attention Is All You Need"></label>
      <label>URL <input data-cite-url placeholder="https://arxiv.org/abs/1706.03762"></label>
      <label>Year <input data-cite-year placeholder="2017"></label>
    `,
    (modal) => {
      citeCounter++;
      const author = modal.querySelector("[data-cite-author]").value.trim() || "Unknown";
      const title = modal.querySelector("[data-cite-title]").value.trim() || "Untitled";
      const url = modal.querySelector("[data-cite-url]").value.trim();
      const year = modal.querySelector("[data-cite-year]").value.trim() || "";

      // Insert inline reference
      insertHtml(`<sup class="cite-ref"><a href="#cite-${citeCounter}">[${citeCounter}]</a></sup>`);

      // Ensure citations footer exists, then append
      let footer = editor.querySelector(".citations");
      if (!footer) {
        editor.insertAdjacentHTML("beforeend", `<footer class="citations"><h3>References</h3><ol class="citation-list"></ol></footer>`);
        footer = editor.querySelector(".citations");
      }
      const ol = footer.querySelector(".citation-list");
      const li = document.createElement("li");
      li.id = `cite-${citeCounter}`;
      li.className = "citation-item";
      li.innerHTML = `${escapeHtml(author)}${year ? ` (${escapeHtml(year)})` : ""}. <em>${escapeHtml(title)}</em>.${url ? ` <a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>` : ""}`;
      ol.appendChild(li);
      syncPreview();
      scheduleSave();
    }
  );
}

function insertCodeBlock() {
  openModal(
    "Code block",
    `<textarea data-code-source>const model = "human-in-the-loop";</textarea>`,
    (modal) => insertHtml(`<pre><code>${escapeHtml(modal.querySelector("[data-code-source]").value)}</code></pre>`)
  );
}

function insertTable() {
  insertHtml(`
    <table class="studio-table">
      <tbody>
        <tr><th>Metric</th><th>Value</th><th>Note</th></tr>
        <tr><td>Accuracy</td><td>0.92</td><td>Validation set</td></tr>
        <tr><td>Latency</td><td>240 ms</td><td>Prototype run</td></tr>
      </tbody>
    </table>
  `);
}

function insertImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      insertHtml(`
        <figure class="drawing-block">
          <img src="${reader.result}" alt="${escapeHtml(file.name)}">
          <figcaption>${escapeHtml(file.name)}</figcaption>
        </figure>
      `);
    };
    reader.readAsDataURL(file);
  });
  input.click();
}

function downloadBlob(filename, type, body) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([body], { type }));
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 800);
}

function nodeText(node) {
  return node.textContent.replace(/\n{3,}/g, "\n\n").trim();
}

function htmlToMdx(html) {
  const container = document.createElement("div");
  container.innerHTML = html;
  const lines = [];
  for (const child of container.children) {
    const tag = child.tagName.toLowerCase();
    if (tag === "h1") lines.push(`# ${nodeText(child)}`);
    else if (tag === "h2") lines.push(`## ${nodeText(child)}`);
    else if (tag === "h3") lines.push(`### ${nodeText(child)}`);
    else if (tag === "blockquote") lines.push(`> ${nodeText(child)}`);
    else if (tag === "pre") lines.push(`\`\`\`\n${nodeText(child)}\n\`\`\``);
    else if (tag === "ul") lines.push(Array.from(child.children).map((item) => `- ${nodeText(item)}`).join("\n"));
    else if (tag === "ol") lines.push(Array.from(child.children).map((item, index) => `${index + 1}. ${nodeText(item)}`).join("\n"));
    else if (tag === "figure" && child.dataset.math) lines.push(`\`\`\`math\n${child.dataset.math}\n\`\`\``);
    else if (tag === "figure" && child.dataset.diagram) lines.push(`\`\`\`mermaid\n${child.dataset.diagram}\n\`\`\``);
    else if (tag === "figure" && child.querySelector("img")) lines.push(`![${nodeText(child.querySelector("figcaption") || child)}](${child.querySelector("img").src})`);
    else if (tag === "table") lines.push(nodeText(child));
    else lines.push(nodeText(child));
  }
  return `---\ntitle: "${titleInput.value.trim() || "Untitled AI field note"}"\ndate: "${new Date().toISOString().slice(0, 10)}"\ntags: ["AI", "ML"]\n---\n\n${lines.filter(Boolean).join("\n\n")}\n`;
}

function setupEvents() {
  editor = document.querySelector("[data-editor]");
  preview = document.querySelector("[data-preview]");
  titleInput = document.querySelector("[data-title-input]");
  statusNode = document.querySelector("[data-save-status]");

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });

  document.querySelector("[data-block]").addEventListener("change", (event) => {
    command("formatBlock", event.target.value);
  });

  document.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => command(button.dataset.command, button.dataset.value || null));
  });

  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      const tool = button.dataset.tool;
      if (tool === "hr") insertHtml("<hr>");
      if (tool === "code") insertCodeBlock();
      if (tool === "table") insertTable();
      if (tool === "image") insertImage();
      if (tool === "math") openMathTool();
      if (tool === "mermaid") openMermaidTool();
      if (tool === "diagram") openDiagramTool();
      if (tool === "plot") openPlotTool();
      if (tool === "draw") openDrawTool();
      if (tool === "cite") openCiteTool();
    });
  });

  document.querySelector('[data-export="json"]').addEventListener("click", () => {
    downloadBlob("sameer-studio-draft.json", "application/json", JSON.stringify(currentDraft(), null, 2));
  });

  document.querySelector('[data-export="mdx"]').addEventListener("click", () => {
    downloadBlob("sameer-studio-draft.mdx", "text/markdown", htmlToMdx(editor.innerHTML));
  });

  document.querySelector("[data-publish-blog]").addEventListener("click", async () => {
    try {
      setStatus("Saving draft into CMS blog content...");
      await publishDraftToCms();
    } catch (error) {
      setStatus(`CMS save failed: ${error.message}`);
    }
  });

  document.querySelector("[data-import]").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const imported = JSON.parse(reader.result);
        if (typeof imported.html !== "string") throw new Error("Draft HTML missing");
        editor.innerHTML = imported.html;
        titleInput.value = imported.title || defaultDraft.title;
        syncPreview();
        await writeDraft(currentDraft());
        setStatus("Imported draft saved in the protected workspace");
      } catch (error) {
        setStatus(`Import failed: ${error.message}`);
      }
    };
    reader.readAsText(file);
  });

  editor.addEventListener("input", () => {
    syncPreview();
    scheduleSave();
  });
  titleInput.addEventListener("input", () => {
    syncPreview();
    scheduleSave();
  });
}

async function hydrateDraft() {
  const draft = (await readDraft()) || defaultDraft;
  titleInput.value = draft.title || defaultDraft.title;
  editor.innerHTML = draft.html || defaultDraft.html;
  syncPreview();
  setStatus(draft.updatedAt ? `Protected draft restored from ${new Date(draft.updatedAt).toLocaleString()}` : "Protected draft ready");
}

const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" }).catch(() => null);
const session = sessionResponse?.ok ? await sessionResponse.json() : { authenticated: false };
if (!session.authenticated) {
  window.location.href = "/cms/";
  throw new Error("Admin login required.");
}

await initSiteContent();
mountShell("studio");
bootTheme();
renderStudio();
setupEvents();
hydrateDraft();
bootInteractions(document.querySelector("#studio-root"));
