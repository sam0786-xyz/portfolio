import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const env = loadEnv([".env", "supabase/.env"]);
const port = Number(process.env.PORT || env.PORT || 4173);
const host = process.env.HOST || env.HOST || "127.0.0.1";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || "sam.xyz";
const DEFAULT_ADMIN_HASH = "pbkdf2_sha256$210000$sameer-portfolio-admin-v1$b115dfcb8e54c1fd2464402b766df7431626cf77a0a6fee32254d1d686e9d94b";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH;
const SESSION_SECRET = process.env.SESSION_SECRET || env.SESSION_SECRET || randomBytes(32).toString("hex");
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const sessions = new Map();
const loginAttempts = new Map();

const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL || env.Supabase_URL || "https://rygkdlltqpdnkohelqnb.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.Anon_key || env.Supabase_publisable_key || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.service_role_key || "";

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

function signSession(id) {
  return createHmac("sha256", SESSION_SECRET).update(id).digest("hex");
}

function makeSessionCookie(id) {
  return `sameer_admin=${id}.${signSession(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearSessionCookie() {
  return "sameer_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

function getSession(request) {
  const raw = parseCookies(request).sameer_admin;
  if (!raw || !raw.includes(".")) return null;
  const [id, signature] = raw.split(".");
  if (signature !== signSession(id)) return null;
  const session = sessions.get(id);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(id);
    return null;
  }
  return session;
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

async function supabaseFetch(path, options = {}) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) return null;
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function handleApi(request, response) {
  const url = request.url?.split("?")[0] || "";

  if (url === "/api/public-config" && request.method === "GET") {
    json(response, 200, { supabaseConfigured: Boolean(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)) });
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
    const id = randomBytes(24).toString("hex");
    sessions.set(id, { username: ADMIN_USERNAME, expiresAt: Date.now() + SESSION_TTL_MS });
    json(response, 200, { ok: true }, { "set-cookie": makeSessionCookie(id) });
    return true;
  }

  if (url === "/api/admin/logout" && request.method === "POST") {
    const raw = parseCookies(request).sameer_admin;
    if (raw?.includes(".")) sessions.delete(raw.split(".")[0]);
    json(response, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
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
    json(response, 500, { ok: false, error: error.message });
    return;
  }

  const url = request.url?.split("?")[0] || "/";
  const adminOnlyRoutes = new Set(["/cms", "/cms/", "/cms/index.html", "/studio", "/studio/", "/studio/index.html"]);
  const targetUrl = adminOnlyRoutes.has(url) && !getSession(request) ? "/cms/login.html" : request.url || "/";
  const target = await resolveFile(targetUrl);

  if (!target) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end("Not found");
    return;
  }

  const body = await readFile(target);
  response.writeHead(200, {
    "content-type": types[extname(target)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  response.end(body);
}).listen(port, host, () => {
  console.log(`Portfolio running at http://${host}:${port}`);
});
