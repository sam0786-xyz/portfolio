/**
 * Live GitHub repositories section (progressive enhancement).
 *
 * Fetches public repos from the GitHub REST API and renders the most notable
 * ones. This is intentionally best-effort: if the request fails (offline, rate
 * limit, private account) the section simply stays hidden, so a failure never
 * shows an empty or broken block. No token is used — unauthenticated GitHub
 * calls are enough for a low-traffic portfolio.
 */

import { escapeHtml } from "./render.js";
import { bootInteractions } from "./animations.js";

const GITHUB_USER = "sam0786-xyz";
const MAX_REPOS = 6;

const langColors = {
  Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  Jupyter: "#DA5B0B", "Jupyter Notebook": "#DA5B0B", HTML: "#e34c26",
  CSS: "#563d7c", Java: "#b07219", "C++": "#f34b7d", Go: "#00ADD8", Shell: "#89e051"
};

function repoCard(repo) {
  const lang = repo.language || "";
  const dot = lang ? `<span class="gh-lang-dot" style="background:${langColors[lang] || "var(--accent-1)"}"></span>` : "";
  return `
    <a class="v3-card gh-repo reveal-up" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">
      <div class="gh-repo-head">
        <span class="gh-repo-name">${escapeHtml(repo.name)}</span>
        <span class="gh-repo-stars" title="Stars">★ ${repo.stargazers_count || 0}</span>
      </div>
      <p class="gh-repo-desc">${escapeHtml(repo.description || "No description provided.")}</p>
      <div class="gh-repo-meta">
        ${lang ? `<span class="gh-repo-lang">${dot}${escapeHtml(lang)}</span>` : ""}
        <span class="gh-repo-updated">Updated ${new Date(repo.pushed_at).toLocaleDateString("en", { month: "short", year: "numeric" })}</span>
      </div>
    </a>`;
}

export async function mountGithubRepos(root = document) {
  const section = root.querySelector("[data-github-section]");
  const grid = root.querySelector("[data-github-grid]");
  if (!section || !grid) return;

  try {
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    // Most recently pushed first: the section should always lead with
    // whatever was just shipped, so regular activity is visible at a glance.
    const repos = (await response.json())
      .filter((repo) => !repo.fork && !repo.archived && !repo.private)
      .sort((a, b) => (new Date(b.pushed_at) - new Date(a.pushed_at)) || (b.stargazers_count - a.stargazers_count))
      .slice(0, MAX_REPOS);

    if (!repos.length) return; // nothing worth showing — leave hidden
    grid.innerHTML = repos.map(repoCard).join("");
    section.hidden = false;
    // Cards are injected after the initial bootInteractions pass, so wire up
    // their reveal-on-scroll animation now (otherwise they stay at opacity 0).
    bootInteractions(grid);
  } catch (error) {
    // Silent by design: keep the section hidden on any failure.
    console.warn("GitHub repos unavailable:", error.message);
  }
}
