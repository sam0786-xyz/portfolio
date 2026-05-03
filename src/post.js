import { bootLoader, dismissLoader } from "./loader.js";
import { bootTheme } from "./theme.js";
import { initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { escapeHtml, getPostFromLocation, mountShell, renderPills } from "./render.js";
import { renderBlogReactions } from "./blog-reactions.js";

function renderPost() {
  const post = getPostFromLocation();
  document.title = `${post.title} | Mohammad Sameer`;
  const root = document.querySelector("#post-root");
  root.innerHTML = `
    <article class="article-shell">
      <img class="article-cover" src="${post.cover}" alt="">
      <div class="article-body">
        <p class="eyebrow">${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(post.date))} / ${post.readingTime}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="lede">${escapeHtml(post.excerpt)}</p>
        <div class="tag-row">${renderPills(post.tags)}</div>
        ${post.body}
      </div>
    </article>
  `;
  renderBlogReactions(root.querySelector(".article-body"), post.slug);
}

bootLoader();
await initSiteContent();
mountShell("blog");
bootTheme();
renderPost();
bootInteractions(document.querySelector("#post-root"));
dismissLoader();

