import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultContent, mergeContent, renderHomeDocument } from "./src/ssr.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnv([".env", "supabase/.env"]);
const port = Number(process.env.PORT || env.PORT || 8080);
const host = process.env.HOST || env.HOST || "0.0.0.0";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || "sam.xyz";
const DEFAULT_ADMIN_HASH = "pbkdf2_sha256$210000$sameer-portfolio-admin-v1$fe2ed834797469c62a4774d0ec580f12fb8f3dfdd5730e9d3ba95193354798de";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
const SESSION_SECRET = loadSessionSecret();
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const loginAttempts = new Map();

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || env.Supabase_URL || "https://rygkdlltqpdnkohelqnb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.Anon_key || env.Supabase_publisable_key || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.Supabase_service_key || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.service_role_key || env.Supabase_service_key || "";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function loadEnv(paths) {
  const result = {};
  for (const path of paths) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) continue;
    const lines = readFileSync(absolute, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

function loadSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  const isProd = (process.env.NODE_ENV || env.NODE_ENV || "").toLowerCase() === "production";
  if (isProd) {
    console.error("FATAL: SESSION_SECRET is required in production. Set it via environment variable or .env file.");
    process.exit(1);
  }
  // Dev-only fallback: read or generate a persistent local secret
  const secretPath = join(root, ".session-secret");
  try {
    const stored = readFileSync(secretPath, "utf8").trim();
    if (stored.length >= 32) return stored;
  } catch { /* file doesn't exist yet */ }
  const generated = randomBytes(32).toString("hex");
  try {
    writeFileSync(secretPath, generated + "\n", { mode: 0o600 });
  } catch { /* read-only fs, use ephemeral secret */ }
  return generated;
}

function json(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error("Request too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function signSession(payload) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function isSecureRequest(request) {
  const forwardedProto = String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const nodeEnv = String(process.env.NODE_ENV || env.NODE_ENV || "").toLowerCase();
  return forwardedProto === "https" || nodeEnv === "production";
}

function makeSessionCookie(request) {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${ADMIN_USERNAME}|${expiresAt}`;
  const secure = isSecureRequest(request) ? " Secure;" : "";
  return `sameer_admin=${payload}.${signSession(payload)}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearSessionCookie(request) {
  const secure = isSecureRequest(request) ? " Secure;" : "";
  return `sameer_admin=; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=0`;
}

function getSession(request) {
  const raw = parseCookies(request).sameer_admin;
  if (!raw || !raw.includes(".")) return null;
  const lastDot = raw.lastIndexOf(".");
  const payload = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);
  
  const expected = Buffer.from(signSession(payload), "hex");
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  
  const [username, expiresAt] = payload.split("|");
  if (username !== ADMIN_USERNAME || Number(expiresAt) < Date.now()) return null;
  
  return { username, expiresAt: Number(expiresAt) };
}

function requireAdmin(request, response) {
  if (getSession(request)) return true;
  json(response, 401, { ok: false, error: "Admin login required." });
  return false;
}

function verifyPassword(password) {
  const [algorithm, iterations, salt, expectedHex] = ADMIN_PASSWORD_HASH.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !expectedHex) return false;
  const actual = pbkdf2Sync(password, salt, Number(iterations), Buffer.from(expectedHex, "hex").length, "sha256");
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function isRateLimited(request) {
  const key = request.socket.remoteAddress || "local";
  const now = Date.now();
  const attempt = loginAttempts.get(key) || { count: 0, resetAt: now + 1000 * 60 * 10 };
  if (attempt.resetAt < now) {
    loginAttempts.set(key, { count: 0, resetAt: now + 1000 * 60 * 10 });
    return false;
  }
  return attempt.count >= 8;
}

function recordFailedLogin(request) {
  const key = request.socket.remoteAddress || "local";
  const now = Date.now();
  const attempt = loginAttempts.get(key) || { count: 0, resetAt: now + 1000 * 60 * 10 };
  attempt.count += 1;
  loginAttempts.set(key, attempt);
}

function slugify(value) {
  return String(value || "untitled-field-note")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "untitled-field-note";
}

function asTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function stripMarkup(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadingTime(value) {
  const words = stripMarkup(value).split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function normalizeBlogPost(input = {}, existing = {}) {
  const title = String(input.title ?? existing.title ?? "Untitled AI field note").trim() || "Untitled AI field note";
  const markdown = String(input.markdown ?? existing.markdown ?? "");
  const body = String(input.body ?? existing.body ?? (markdown ? `<p>${stripMarkup(markdown)}</p>` : "<p>Draft body pending.</p>"));
  const excerptSource = input.excerpt ?? existing.excerpt ?? stripMarkup(markdown || body).slice(0, 180);
  const explicitPublished = Object.prototype.hasOwnProperty.call(input, "published");
  return {
    slug: slugify(input.slug ?? existing.slug ?? title),
    title,
    excerpt: String(excerptSource || "AI/ML field note from Mohammad Sameer's writing studio.").trim(),
    date: String(input.date ?? existing.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    tags: asTags(input.tags ?? existing.tags ?? ["AI/ML", "Field Note"]),
    cover: String(input.cover ?? existing.cover ?? "/assets/neural-console.png").trim() || "/assets/neural-console.png",
    readingTime: String(input.readingTime ?? input.reading_time ?? existing.readingTime ?? existing.reading_time ?? estimateReadingTime(markdown || body)),
    markdown,
    body,
    published: explicitPublished ? Boolean(input.published) : Boolean(existing.published ?? true),
    createdAt: input.createdAt ?? input.created_at ?? existing.createdAt ?? existing.created_at ?? new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function blogRowToPost(row) {
  return normalizeBlogPost({
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date,
    tags: row.tags,
    cover: row.cover,
    readingTime: row.reading_time,
    body: row.body,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function blogPostToRow(post) {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    tags: post.tags,
    cover: post.cover,
    reading_time: post.readingTime,
    body: post.body,
    published: post.published !== false,
    created_at: post.createdAt,
    updated_at: post.updatedAt
  };
}

async function readSiteContent() {
  const remote = await supabaseFetch("site_content?id=eq.main&select=content", { method: "GET" });
  if (Array.isArray(remote) && remote[0]?.content) return remote[0].content;
  try {
    return JSON.parse(await readFile(join(root, "data", "site-content.json"), "utf8"));
  } catch {
    return null;
  }
}

async function writeSiteContent(content) {
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(join(root, "data", "site-content.json"), `${JSON.stringify(content, null, 2)}\n`);
  await supabaseFetch("site_content", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: "main", content })
  });
}

function sortBlogPosts(posts) {
  return [...posts].sort((a, b) => {
    const dateDelta = new Date(b.date || 0) - new Date(a.date || 0);
    if (dateDelta) return dateDelta;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
}

async function readBlogPosts(includeDrafts = false) {
  const visibility = includeDrafts ? "" : "published=eq.true&";
  const select = "slug,title,excerpt,date,tags,cover,reading_time,body,published,created_at,updated_at";
  const remote = await supabaseFetch(`blog_posts?${visibility}select=${select}&order=date.desc&order=updated_at.desc`, { method: "GET" });
  if (Array.isArray(remote) && remote.length) return remote.map(blogRowToPost);

  const content = await readSiteContent();
  const posts = Array.isArray(content?.blogPosts) ? content.blogPosts.map((post) => normalizeBlogPost(post)) : [];
  const fallbackPosts = defaultContent().blogPosts.map((post) => normalizeBlogPost(post));
  const visiblePosts = includeDrafts ? posts : posts.filter((post) => post.published !== false);
  return sortBlogPosts(visiblePosts.length ? visiblePosts : fallbackPosts);
}

async function mirrorBlogPosts(posts) {
  const content = (await readSiteContent()) || { version: 4 };
  content.blogPosts = sortBlogPosts(posts).map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    tags: post.tags,
    cover: post.cover,
    readingTime: post.readingTime,
    markdown: post.markdown || "",
    body: post.body,
    published: post.published !== false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  }));
  content.updatedAt = new Date().toISOString();
  await writeSiteContent(content);
}

async function saveBlogPost(slug, payload) {
  const posts = await readBlogPosts(true);
  const existingIndex = slug ? posts.findIndex((post) => post.slug === slug) : -1;
  const existing = existingIndex >= 0 ? posts[existingIndex] : {};
  const post = normalizeBlogPost(payload, existing);
  const collides = posts.some((item, index) => item.slug === post.slug && index !== existingIndex);
  if (collides) {
    const error = new Error("A post with this slug already exists.");
    error.statusCode = 409;
    throw error;
  }

  const remoteResult = await supabaseFetch(existingIndex >= 0 ? `blog_posts?slug=eq.${encodeURIComponent(slug)}` : "blog_posts", {
    method: existingIndex >= 0 ? "PATCH" : "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(blogPostToRow(post))
  });

  if (existingIndex >= 0) posts[existingIndex] = post;
  else posts.unshift(post);
  await mirrorBlogPosts(posts);
  return { post, source: remoteResult ? "supabase" : "json" };
}

async function deleteBlogPost(slug) {
  const posts = await readBlogPosts(true);
  const next = posts.filter((post) => post.slug !== slug);
  if (next.length === posts.length) {
    const error = new Error("Blog post not found.");
    error.statusCode = 404;
    throw error;
  }
  const remoteResult = await supabaseFetch(`blog_posts?slug=eq.${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
  await mirrorBlogPosts(next);
  return { source: remoteResult ? "supabase" : "json" };
}

async function supabaseFetch(path, options = {}) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  try {
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const scrubbedPath = path.split("?")[0];
      const errorText = await response.text();
      // Keep a scrubbed error summary, but remove full text if it contains sensitive info?
      // "log only the route or table identifier and a scrubbed error summary"
      const errorSummary = errorText.substring(0, 100).replace(/\n/g, " ");
      console.error(`Supabase error [${response.status}] for ${scrubbedPath}:`, errorSummary);
      return null;
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    const scrubbedPath = path.split("?")[0];
    console.error(`Supabase fetch failed for ${scrubbedPath}:`, err.message || "Unknown error");
    return null;
  }
}

async function renderHomePage() {
  const template = await readFile(join(root, "index.html"), "utf8");
  let content = defaultContent();
  const stored = await readSiteContent();
  if (stored) content = mergeContent(content, stored);
  const posts = await readBlogPosts(false);
  content.blogPosts = posts.length ? posts : defaultContent().blogPosts;
  return renderHomeDocument(template, content);
}

async function handleApi(request, response) {
  const url = request.url?.split("?")[0] || "";

  if (url === "/api/public-config" && request.method === "GET") {
    json(response, 200, {
      supabaseConfigured: Boolean(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)),
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY
    });
    return true;
  }

  if (url === "/api/admin/session" && request.method === "GET") {
    json(response, 200, { ok: true, authenticated: Boolean(getSession(request)) });
    return true;
  }

  if (url === "/api/admin/login" && request.method === "POST") {
    if (isRateLimited(request)) {
      json(response, 429, { ok: false, error: "Too many login attempts. Try again later." });
      return true;
    }
    const body = await readJsonBody(request);
    const usernameOk = String(body.username || "") === ADMIN_USERNAME;
    const passwordOk = verifyPassword(String(body.password || ""));
    if (!usernameOk || !passwordOk) {
      recordFailedLogin(request);
      json(response, 401, { ok: false, error: "Invalid admin credentials." });
      return true;
    }
    json(response, 200, { ok: true }, { "set-cookie": makeSessionCookie(request) });
    return true;
  }

  if (url === "/api/admin/logout" && request.method === "POST") {
    json(response, 200, { ok: true }, { "set-cookie": clearSessionCookie(request) });
    return true;
  }

  if (url === "/api/blog-posts" && request.method === "GET") {
    json(response, 200, { ok: true, posts: await readBlogPosts(Boolean(getSession(request))) });
    return true;
  }

  const blogPostMatch = url.match(/^\/api\/blog-posts\/([^/]+)$/);
  if (blogPostMatch && request.method === "GET") {
    const slug = decodeURIComponent(blogPostMatch[1]);
    const post = (await readBlogPosts(Boolean(getSession(request)))).find((item) => item.slug === slug);
    if (!post) {
      json(response, 404, { ok: false, error: "Blog post not found." });
      return true;
    }
    json(response, 200, { ok: true, post });
    return true;
  }

  if (url === "/api/blog-posts" && request.method === "POST") {
    if (!requireAdmin(request, response)) return true;
    const result = await saveBlogPost("", await readJsonBody(request));
    json(response, 200, { ok: true, ...result });
    return true;
  }

  if (blogPostMatch && request.method === "PATCH") {
    if (!requireAdmin(request, response)) return true;
    const result = await saveBlogPost(decodeURIComponent(blogPostMatch[1]), await readJsonBody(request));
    json(response, 200, { ok: true, ...result });
    return true;
  }

  if (blogPostMatch && request.method === "DELETE") {
    if (!requireAdmin(request, response)) return true;
    const result = await deleteBlogPost(decodeURIComponent(blogPostMatch[1]));
    json(response, 200, { ok: true, ...result });
    return true;
  }

  if (url === "/api/site-content" && request.method === "GET") {
    json(response, 200, { ok: true, content: await readSiteContent() });
    return true;
  }

  if (url === "/api/site-content" && request.method === "POST") {
    if (!requireAdmin(request, response)) return true;
    const content = await readJsonBody(request);
    await writeSiteContent(content);
    json(response, 200, { ok: true, url: "/data/site-content.json" });
    return true;
  }

  if (url === "/api/site-content" && request.method === "DELETE") {
    if (!requireAdmin(request, response)) return true;
    await rm(join(root, "data", "site-content.json"), { force: true });
    json(response, 200, { ok: true });
    return true;
  }

  if (url === "/api/resume" && request.method === "POST") {
    if (!requireAdmin(request, response)) return true;
    const payload = await readJsonBody(request);
    const dataUrl = String(payload.dataUrl || "");
    const match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
    if (!match) {
      json(response, 400, { ok: false, error: "Only PDF uploads are supported." });
      return true;
    }
    await mkdir(join(root, "assets"), { recursive: true });
    const filename = "mohammad-sameer-resume.pdf";
    await writeFile(join(root, "assets", filename), Buffer.from(match[1], "base64"));
    json(response, 200, { ok: true, url: `/assets/${filename}` });
    return true;
  }

  return false;
}

function isPrivatePath(urlPath) {
  const cleanUrl = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const parts = normalize(cleanUrl || "index.html").split(sep);
  return parts.some((part) => part.startsWith(".")) || parts.includes("supabase") && parts.includes(".env");
}

function resolvePath(urlPath) {
  if (isPrivatePath(urlPath)) return null;
  const cleanUrl = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const normalized = normalize(cleanUrl || "index.html");
  if (normalized.startsWith("..")) return null;
  return join(root, normalized);
}

async function resolveFile(urlPath) {
  const direct = resolvePath(urlPath);
  if (!direct) return null;

  // Serve the blog post template for any /blog/{slug}/ path without a physical directory
  const cleanUrl = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const blogMatch = cleanUrl.match(/^blog\/([a-z0-9][a-z0-9-]*)\/?$/i);
  if (blogMatch) {
    // Prefer a physical directory first (e.g. blog/genai-field-notes/index.html)
    try {
      const nested = join(direct, "index.html");
      await stat(nested);
      return nested;
    } catch {}
    // Fall back to the shared blog post template
    const template = join(root, "blog", "genai-field-notes", "index.html");
    try {
      await stat(template);
      return template;
    } catch {}
  }

  try {
    const info = await stat(direct);
    if (info.isFile()) return direct;
    if (info.isDirectory()) {
      const nested = join(direct, "index.html");
      await stat(nested);
      return nested;
    }
  } catch {}

  if (!extname(direct)) {
    const html = `${direct}.html`;
    try {
      await stat(html);
      return html;
    } catch {}
  }

  return null;
}

createServer(async (request, response) => {
  try {
    if (await handleApi(request, response)) return;
  } catch (error) {
    json(response, error.statusCode || 500, { ok: false, error: error.message });
    return;
  }

  const url = request.url?.split("?")[0] || "/";

  // Server-render the home page so crawlers, ATS systems, and link-preview
  // bots receive the real content instead of an empty JavaScript shell.
  if (request.method === "GET" && (url === "/" || url === "/index.html")) {
    try {
      const html = await renderHomePage();
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(html);
      return;
    } catch (error) {
      console.error("SSR failed, falling back to static index.html:", error.message);
    }
  }

  const adminOnlyRoutes = new Set(["/cms", "/cms/", "/cms/index.html", "/studio", "/studio/", "/studio/index.html"]);
  const targetUrl = adminOnlyRoutes.has(url) && !getSession(request) ? `/cms/login.html?next=${encodeURIComponent(url)}` : request.url || "/";
  const target = await resolveFile(targetUrl);

  if (!target) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end("Not found");
    return;
  }

  let body = await readFile(target);

  if (extname(target) === ".html" && url.startsWith("/blog/")) {
    const slug = url.split("/")[2];
    if (slug) {
      const posts = await readBlogPosts(false);
      const post = posts.find(p => p.slug === slug);
      if (post) {
        const escapeStr = (s) => String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
        const title = escapeStr(post.title) + " | Mohammad Sameer";
        const desc = escapeStr(post.excerpt);
        const cover = post.cover ? (post.cover.startsWith("http") ? post.cover : `https://sam18.xyz${post.cover}`) : "https://sam18.xyz/assets/neural-console.png";
        
        let html = body.toString("utf8");
        html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
        html = html.replace(/<meta name="description" content="[^"]*">/, "");
        const ogTags = `
    <meta name="description" content="${desc}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="https://sam18.xyz/blog/${escapeStr(slug)}">
    <meta property="og:image" content="${cover}">
    <meta name="twitter:card" content="summary_large_image">
        `.trim();
        html = html.replace("</head>", `  ${ogTags}\n  </head>`);
        body = Buffer.from(html, "utf8");
      }
    }
  }

  response.writeHead(200, {
    "content-type": types[extname(target)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  response.end(body);
}).listen(port, host, () => {
  console.log(`Portfolio running at http://${host}:${port}`);
});
