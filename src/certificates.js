import { bootLoader, dismissLoader } from "./loader.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { bootTheme } from "./theme.js";
import { escapeHtml, icon, mountShell, renderCertificates } from "./render.js";

function renderPage() {
  const { profile, certificates } = getSiteContent();
  document.querySelector("#certificates-root").innerHTML = `
    <section class="v3-hero v3-container">
      <div class="v3-hero-content reveal-up">
        <span class="eyebrow">Credentials / Proof</span>
        <h1>Verified learning, mapped to practical AI work.</h1>
        <p class="lede">
          A focused credential timeline for AI, ML, cloud, and production engineering skills, designed to make verification fast.
        </p>
      </div>
    </section>

    <section class="v3-section v3-container">
      <div class="v3-minimal-list" aria-label="Certificate timeline">
        ${renderCertificates(false)}
      </div>
    </section>
  `;
}

bootLoader();
await initSiteContent();
mountShell("certificates");
bootTheme();
renderPage();
bootInteractions(document.querySelector("#certificates-root"));
dismissLoader();
