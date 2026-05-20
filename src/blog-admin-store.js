export function slugify(value) {
  return String(value || "untitled-field-note")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72) || "untitled-field-note";
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

export async function listBlogPosts() {
  const payload = await requestJson(`/api/blog-posts?t=${Date.now()}`, { cache: "no-store" });
  return Array.isArray(payload.posts) ? payload.posts : [];
}

export async function saveBlogPost(post, originalSlug = "") {
  const method = originalSlug ? "PATCH" : "POST";
  const path = originalSlug ? `/api/blog-posts/${encodeURIComponent(originalSlug)}` : "/api/blog-posts";
  return requestJson(path, {
    method,
    body: JSON.stringify(post)
  });
}

export async function deleteBlogPost(slug) {
  return requestJson(`/api/blog-posts/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

export function blankBlogPost() {
  const now = new Date().toISOString();
  return {
    slug: "untitled-field-note",
    title: "Untitled AI field note",
    excerpt: "Draft a concise promise for the reader.",
    date: now.slice(0, 10),
    tags: ["AI/ML", "Field Note"],
    cover: "/assets/neural-console.png",
    readingTime: "1 min read",
    markdown: "",
    body: "",
    published: false,
    createdAt: now,
    updatedAt: now
  };
}
