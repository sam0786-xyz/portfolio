import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultContent, mergeContent, renderBlogPostDocument, renderHomeDocument, renderPublicDocument } from "./src/ssr.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnv([".env", "supabase/.env"]);
const port = Number(process.env.PORT || env.PORT || 8080);
const host = process.env.HOST || env.HOST || "0.0.0.0";
const SITE_URL = (process.env.SITE_URL || env.SITE_URL || "https://sam18.xyz").replace(/\/$/, "");

// Static serving is allowlist-based: only these top-level directories and
// root files are ever readable over HTTP. Everything else (server.mjs,
// package.json, Dockerfile, cookie.txt, supabase/*, data/*, dotfiles, …) 404s.
const PUBLIC_DIRS = new Set(["assets", "src", "blog", "certificates", "cms", "focus", "linkedin", "studio"]);
const PUBLIC_ROOT_FILES = new Set(["index.html", "v3.css", "robots.txt", "sitemap.xml", "llms.txt", "favicon.ico", "manifest.webmanifest"]);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || "sam.xyz";
const DEFAULT_ADMIN_HASH = "pbkdf2_sha256$210000$sameer-portfolio-admin-v1$fe2ed834797469c62a4774d0ec580f12fb8f3dfdd5730e9d3ba95193354798de";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
const SESSION_SECRET = loadSessionSecret();
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const loginAttempts = new Map();

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || env.Supabase_URL || "https://rygkdlltqpdnkohelqnb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.Anon_key || env.Supabase_publisable_key || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.Supabase_service_key || env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.service_role_key || env.Supabase_service_key || "";

// Résumé is stored in a private Supabase Storage bucket so re-uploads survive
// Cloud Run restarts. It is served back through /assets/<RESUME_OBJECT> (see
// the GET intercept), which keeps the public URL stable and same-origin.
const RESUME_BUCKET = process.env.RESUME_BUCKET || env.RESUME_BUCKET || "resume";
const RESUME_OBJECT = "mohammad-sameer-resume.pdf";

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
    console.warn("WARNING: SESSION_SECRET is missing in production. Using an ephemeral secret. Sessions will be invalidated on restart. Set SESSION_SECRET via environment variable for persistence.");
  }
  // Fallback: read or generate a persistent local secret (or ephemeral if read-only)
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

function clientIp(request) {
  // On Cloud Run / any reverse proxy, socket.remoteAddress is the proxy — all
  // visitors share it. Use the first hop of X-Forwarded-For so one attacker
  // cannot rate-limit-lock every other visitor (including the admin).
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || request.socket.remoteAddress || "local";
}

function isRateLimited(request) {
  const key = clientIp(request);
  const now = Date.now();
  const attempt = loginAttempts.get(key) || { count: 0, resetAt: now + 1000 * 60 * 10 };
  if (attempt.resetAt < now) {
    loginAttempts.set(key, { count: 0, resetAt: now + 1000 * 60 * 10 });
    return false;
  }
  return attempt.count >= 8;
}

function recordFailedLogin(request) {
  const key = clientIp(request);
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
  try {
    await mkdir(join(root, "data"), { recursive: true });
    await writeFile(join(root, "data", "site-content.json"), `${JSON.stringify(content, null, 2)}\n`);
  } catch (err) {
    console.warn("Failed to write local site-content.json, proceeding to remote sync", err.message);
  }
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
  const remote = await supabaseFetch(`blog_posts?${visibility}select=${select}&order=date.desc,updated_at.desc`, { method: "GET" });
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

// Upload the résumé PDF to Supabase Storage (upsert). Uses the service key so
// it works against a private bucket with no policies. Returns true on success.
async function uploadResumeToStorage(buffer) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return false;
  try {
    const response = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${RESUME_BUCKET}/${RESUME_OBJECT}`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/pdf",
          "x-upsert": "true",
          "cache-control": "3600"
        },
        body: buffer
      }
    );
    if (!response.ok) {
      const summary = (await response.text()).substring(0, 100).replace(/\n/g, " ");
      console.error(`Résumé storage upload failed [${response.status}]:`, summary);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Résumé storage upload error:", err.message || "Unknown error");
    return false;
  }
}

// Fetch the résumé PDF back from Storage. Returns a Buffer, or null if it is
// not there / Storage is unavailable (caller falls back to the static asset).
async function fetchResumeFromStorage() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${RESUME_BUCKET}/${RESUME_OBJECT}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (err) {
    console.error("Résumé storage fetch error:", err.message || "Unknown error");
    return null;
  }
}

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function buildRssFeed(posts) {
  const items = posts
    .map((post) => `
    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${SITE_URL}/blog/${xmlEscape(post.slug)}/</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${xmlEscape(post.slug)}/</guid>
      <description>${xmlEscape(post.excerpt)}</description>
      <pubDate>${new Date(post.date || post.createdAt || Date.now()).toUTCString()}</pubDate>
      ${(post.tags || []).map((tag) => `<category>${xmlEscape(tag)}</category>`).join("")}
    </item>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Mohammad Sameer — AI/ML Field Notes</title>
    <link>${SITE_URL}/blog/</link>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Notes on Generative AI, RAG, evaluation, and building production ML systems.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
}

function buildSitemap(posts) {
  const staticRoutes = [
    { loc: "/", freq: "weekly", priority: "1.0" },
    { loc: "/blog/", freq: "weekly", priority: "0.8" },
    { loc: "/certificates/", freq: "monthly", priority: "0.7" },
    { loc: "/linkedin/", freq: "monthly", priority: "0.6" }
  ];
  const staticUrls = staticRoutes
    .map((route) => `  <url>\n    <loc>${SITE_URL}${route.loc}</loc>\n    <changefreq>${route.freq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`)
    .join("\n");
  const postUrls = posts
    .map((post) => `  <url>\n    <loc>${SITE_URL}/blog/${xmlEscape(post.slug)}/</loc>\n    <lastmod>${String(post.updatedAt || post.date || "").slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${staticUrls}\n${postUrls}\n</urlset>\n`;
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

async function getPublicContent() {
  let content = defaultContent();
  const stored = await readSiteContent();
  if (stored) content = mergeContent(content, stored);
  const posts = await readBlogPosts(false);
  content.blogPosts = posts.length ? posts : defaultContent().blogPosts;
  return content;
}

async function renderPublicPage(page, templatePath) {
  const [template, content] = await Promise.all([
    readFile(join(root, templatePath), "utf8"),
    getPublicContent()
  ]);
  return renderPublicDocument(template, content, page);
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
    const buffer = Buffer.from(match[1], "base64");
    // Source of truth: Supabase Storage (survives container restarts).
    const persisted = await uploadResumeToStorage(buffer);
    // Best-effort local cache so the static fallback stays current on this
    // instance even before the next Storage read.
    try {
      await mkdir(join(root, "assets"), { recursive: true });
      await writeFile(join(root, "assets", RESUME_OBJECT), buffer);
    } catch (err) {
      console.warn("Local résumé cache write failed:", err.message);
    }
    json(response, 200, { ok: true, url: `/assets/${RESUME_OBJECT}`, persisted });
    return true;
  }

  return false;
}

function resolvePath(urlPath) {
  let cleanUrl;
  try {
    cleanUrl = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  } catch {
    return null; // malformed percent-encoding
  }
  const normalized = normalize(cleanUrl || "index.html");
  if (normalized.startsWith("..") || normalized.includes("\0")) return null;

  const parts = normalized.split(sep).filter(Boolean);
  if (!parts.length) return null;
  // Never expose dotfiles/dotdirs (.env, .session-secret, .git, …).
  if (parts.some((part) => part.startsWith("."))) return null;

  if (parts.length === 1) {
    // A single segment is either a whitelisted root file (index.html, v3.css…)
    // or a directory index request like "/blog" → "/blog/index.html".
    if (!PUBLIC_ROOT_FILES.has(parts[0]) && !PUBLIC_DIRS.has(parts[0])) return null;
  } else if (!PUBLIC_DIRS.has(parts[0])) {
    return null;
  }
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

  // Collapse file-style URLs into one canonical URL per public page. This
  // avoids duplicate indexing when a crawler discovers an /index.html path.
  const canonicalRedirects = new Map([
    ["/index.html", "/"],
    ["/blog/index.html", "/blog/"],
    ["/certificates/index.html", "/certificates/"],
    ["/linkedin/index.html", "/linkedin/"],
    ["/focus/index.html", "/focus/"]
  ]);
  if (request.method === "GET" && canonicalRedirects.has(url)) {
    response.writeHead(301, { location: canonicalRedirects.get(url), "cache-control": "public, max-age=86400" });
    response.end();
    return;
  }

  // Dynamic feeds: generated from live blog data so they never drift.
  if (request.method === "GET" && (url === "/blog/rss.xml" || url === "/rss.xml" || url === "/feed.xml")) {
    try {
      const xml = buildRssFeed(await readBlogPosts(false));
      response.writeHead(200, { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" });
      response.end(xml);
      return;
    } catch (error) {
      console.error("RSS generation failed:", error.message);
    }
  }

  if (request.method === "GET" && url === "/sitemap.xml") {
    try {
      const xml = buildSitemap(await readBlogPosts(false));
      response.writeHead(200, { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" });
      response.end(xml);
      return;
    } catch (error) {
      console.error("Sitemap generation failed:", error.message);
    }
  }

  // Résumé download: prefer the copy in Supabase Storage (persists across
  // restarts); fall back to the committed static asset if Storage is empty or
  // unavailable. Same-origin URL keeps the "download" attribute working.
  if (request.method === "GET" && url === `/assets/${RESUME_OBJECT}`) {
    const fromStorage = await fetchResumeFromStorage();
    if (fromStorage) {
      response.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${RESUME_OBJECT}"`,
        "cache-control": "public, max-age=300"
      });
      response.end(fromStorage);
      return;
    }
    // else: fall through to static file serving below
  }

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

  const publicPageRoutes = new Map([
    ["/blog", ["blog", "blog/index.html"]],
    ["/blog/", ["blog", "blog/index.html"]],
    ["/certificates", ["certificates", "certificates/index.html"]],
    ["/certificates/", ["certificates", "certificates/index.html"]],
    ["/linkedin", ["linkedin", "linkedin/index.html"]],
    ["/linkedin/", ["linkedin", "linkedin/index.html"]],
    ["/focus", ["focus", "focus/index.html"]],
    ["/focus/", ["focus", "focus/index.html"]]
  ]);
  if (request.method === "GET" && publicPageRoutes.has(url)) {
    try {
      const [page, templatePath] = publicPageRoutes.get(url);
      const html = await renderPublicPage(page, templatePath);
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(html);
      return;
    } catch (error) {
      console.error(`SSR failed for ${url}:`, error.message);
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
      if (!post) {
        // Unknown slug: return a real 404 instead of silently serving the
        // first post (which created duplicate content under infinite URLs).
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
        response.end("Not found");
        return;
      }
      const esc = (s) => xmlEscape(s);
      const title = esc(post.title) + " | Mohammad Sameer";
      const desc = esc(post.excerpt);
      const cover = esc(absoluteUrl(post.cover || "/assets/neural-console.png"));
      const postUrl = `${SITE_URL}/blog/${esc(slug)}/`;

      const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: absoluteUrl(post.cover || "/assets/neural-console.png"),
            datePublished: post.date,
            dateModified: post.updatedAt || post.date,
            keywords: (post.tags || []).join(", "),
            author: { "@type": "Person", name: "Mohammad Sameer", url: SITE_URL },
            publisher: { "@type": "Person", name: "Mohammad Sameer", url: SITE_URL },
            mainEntityOfPage: { "@type": "WebPage", "@id": postUrl }
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
              { "@type": "ListItem", position: 2, name: "Blog", item: SITE_URL + "/blog/" },
              { "@type": "ListItem", position: 3, name: post.title, item: postUrl }
            ]
          }
        ]
      };

      let html = renderBlogPostDocument(body.toString("utf8"), await getPublicContent(), post);
      html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
      html = html.replace(/<meta name="description" content="[^"]*">/, "");
      const ogTags = `
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${postUrl}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:url" content="${postUrl}">
    <meta property="og:image" content="${cover}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="${cover}">
    <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll("<", "\\u003c")}</script>
        `.trim();
      html = html.replace("</head>", `  ${ogTags}\n  </head>`);
      body = Buffer.from(html, "utf8");
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
