import { supabaseFetch, getSupabaseConfig } from "./supabase-client.js";

/**
 * Render blog reactions (like/dislike) and comments section.
 */
export function renderBlogReactions(container, slug) {
  const section = document.createElement("section");
  section.className = "blog-reactions";
  section.innerHTML = `
    <div class="reactions-bar">
      <button class="reaction-btn" data-reaction="like" title="Like">
        <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
        <span data-like-count>0</span>
      </button>
      <button class="reaction-btn" data-reaction="dislike" title="Dislike">
        <svg viewBox="0 0 24 24"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10zM17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
        <span data-dislike-count>0</span>
      </button>
    </div>

    <div class="comments-section">
      <h3>Comments</h3>
      <form class="comment-form" data-comment-form>
        <input name="name" placeholder="Your name" required autocomplete="name">
        <textarea name="body" placeholder="Share your thoughts..." required rows="3"></textarea>
        <button class="primary-link" type="submit">Post comment</button>
      </form>
      <div class="comment-list" data-comment-list></div>
    </div>
  `;
  container.appendChild(section);

  loadReactions(section, slug);
  loadComments(section, slug);

  // Reaction handlers
  let reactionInFlight = false;
  section.querySelectorAll("[data-reaction]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (reactionInFlight) return;
      reactionInFlight = true;
      section.querySelectorAll(".reaction-btn").forEach(b => b.disabled = true);
      try {
        await handleReaction(section, slug, btn.dataset.reaction);
      } finally {
        reactionInFlight = false;
        section.querySelectorAll(".reaction-btn").forEach(b => b.disabled = false);
      }
    });
  });

  // Comment form
  section.querySelector("[data-comment-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = form.get("name").toString().trim();
    const body = form.get("body").toString().trim();
    if (!name || !body) return;
    const ok = await postComment(section, slug, name, body);
    if (ok) formEl.reset();
  });
}

async function loadReactions(section, slug) {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const rows = await supabaseFetch(`blog_reactions?post_slug=eq.${encodeURIComponent(slug)}&select=reaction`);
      if (Array.isArray(rows)) {
        const likes = rows.filter(r => r.reaction === "like").length;
        const dislikes = rows.filter(r => r.reaction === "dislike").length;
        section.querySelector("[data-like-count]").textContent = likes;
        section.querySelector("[data-dislike-count]").textContent = dislikes;
      }
    } catch {}
  }
}

async function handleReaction(section, slug, type) {
  const userKey = `blog-reacted-${slug}`;
  if (localStorage.getItem(userKey)) return; // one reaction per post

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) return;

  try {
    await supabaseFetch("blog_reactions", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ post_slug: slug, reaction: type })
    });
    // Only update UI + localStorage after successful persist
    localStorage.setItem(userKey, type);
    const counter = section.querySelector(`[data-${type}-count]`);
    counter.textContent = Number(counter.textContent) + 1;
    section.querySelector(`[data-reaction="${type}"]`).classList.add("is-active");
  } catch (err) {
    console.error("Failed to save reaction:", err);
    // Don't update UI — user can retry
  }
}

async function loadComments(section, slug) {
  const list = section.querySelector("[data-comment-list]");
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    try {
      const rows = await supabaseFetch(
        `blog_comments?post_slug=eq.${encodeURIComponent(slug)}&select=name,body,created_at&order=created_at.desc&limit=50`
      );
      if (Array.isArray(rows) && rows.length) {
        list.innerHTML = rows.map(renderComment).join("");
        return;
      }
    } catch {}
  }
  list.innerHTML = `<p class="comment-empty">No comments yet. Be the first!</p>`;
}

async function postComment(section, slug, name, body) {
  const config = getSupabaseConfig();
  const comment = { post_slug: slug, name, body, created_at: new Date().toISOString() };

  if (!config.url || !config.anonKey) return false;

  try {
    await supabaseFetch("blog_comments", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(comment)
    });
    // Only insert into DOM after successful persist
    const list = section.querySelector("[data-comment-list]");
    const empty = list.querySelector(".comment-empty");
    if (empty) empty.remove();
    list.insertAdjacentHTML("afterbegin", renderComment(comment));
    return true;
  } catch (err) {
    console.error("Failed to post comment:", err);
    const list = section.querySelector("[data-comment-list]");
    list.insertAdjacentHTML("afterbegin", `<p class="comment-error" style="color:var(--danger,#e55)">Failed to post comment. Please try again.</p>`);
    setTimeout(() => {
      const errEl = list.querySelector(".comment-error");
      if (errEl) errEl.remove();
    }, 4000);
    return false;
  }
}

function renderComment(comment) {
  const date = new Date(comment.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  return `
    <article class="comment-card">
      <div class="comment-meta">
        <strong>${escapeStr(comment.name)}</strong>
        <span>${date}</span>
      </div>
      <p>${escapeStr(comment.body)}</p>
    </article>
  `;
}

function escapeStr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
