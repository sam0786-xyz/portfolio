import {
  blogPosts,
  certificates,
  education,
  experience,
  linkedinPosts,
  profile,
  projects,
  responsibilities,
  skills,
  siteContentVersion,
  stats
} from "./data/content.js";

const CONTENT_KEY = "sameer-site-content-v6";
let contentCache = null;

export function defaultSiteContent() {
  return structuredClone({
    version: siteContentVersion,
    profile,
    stats,
    skills,
    experience,
    projects,
    linkedinPosts,
    education,
    responsibilities,
    certificates,
    blogPosts
  });
}

export async function initSiteContent() {
  let content = defaultSiteContent();
  let loaded = false;

  try {
    const response = await fetch(`/api/site-content?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      if (payload.content) {
        content = mergeContent(content, payload.content);
        loaded = true;
      }
    }
  } catch {}

  if (!loaded) {
    try {
      const response = await fetch(`/data/site-content.json?t=${Date.now()}`, { cache: "no-store" });
      if (response.ok) content = mergeContent(content, await response.json());
    } catch {}
  }

  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (raw) content = mergeContent(content, JSON.parse(raw));
  } catch {}

  try {
    const response = await fetch(`/api/blog-posts?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.posts)) content.blogPosts = payload.posts;
    }
  } catch {}

  contentCache = content;
  return contentCache;
}

export function getSiteContent() {
  if (contentCache) return contentCache;
  const fallback = defaultSiteContent();
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (!raw) return fallback;
    return mergeContent(fallback, JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export async function saveSiteContent(content) {
  contentCache = content;
  localStorage.setItem(CONTENT_KEY, JSON.stringify({ ...content, updatedAt: new Date().toISOString() }));

  try {
    const response = await fetch("/api/site-content", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(content)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function resetSiteContent() {
  localStorage.removeItem(CONTENT_KEY);
  contentCache = defaultSiteContent();
  try {
    await fetch("/api/site-content", { method: "DELETE" });
  } catch {}
}

export function exportSiteContent() {
  return JSON.stringify(getSiteContent(), null, 2);
}

function mergeContent(base, override) {
  if (!override || typeof override !== "object") return base;
  const next = { ...base, ...override };
  next.version = Math.max(Number(base.version) || 0, Number(override.version) || 0);
  next.profile = { ...base.profile, ...(override.profile || {}) };
  next.profile.socials = Array.isArray(override.profile?.socials)
    ? override.profile.socials
    : base.profile.socials;
  for (const key of [
    "stats",
    "skills",
    "experience",
    "projects",
    "linkedinPosts",
    "education",
    "responsibilities",
    "certificates",
    "blogPosts"
  ]) {
    next[key] = Array.isArray(override[key]) ? override[key] : base[key];
  }
  next.education = mergeEducation(base.education, next.education);
  return next;
}

function mergeEducation(baseEducation, overrideEducation) {
  const rawResult = Array.isArray(overrideEducation) ? [...overrideEducation] : [];
  const seen = new Set(rawResult.map((item) => `${item.school || ""}|${item.degree || ""}`.toLowerCase()));
  for (const item of baseEducation || []) {
    const key = `${item.school || ""}|${item.degree || ""}`.toLowerCase();
    if (!seen.has(key)) rawResult.push(item);
  }

  // Deduplicate by school name to prevent duplicate entries from old state / localStorage
  const finalResult = [];
  const schoolSeen = new Set();
  for (const item of rawResult) {
    const schoolKey = (item.school || "").trim().toLowerCase();
    if (!schoolSeen.has(schoolKey)) {
      schoolSeen.add(schoolKey);
      finalResult.push(item);
    } else {
      const existingIndex = finalResult.findIndex(x => (x.school || "").trim().toLowerCase() === schoolKey);
      if (existingIndex !== -1 && (item.degree || "").toLowerCase().includes("class 12")) {
        finalResult[existingIndex] = item;
      }
    }
  }
  return finalResult;
}
