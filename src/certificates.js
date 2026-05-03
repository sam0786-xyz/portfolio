import { bootLoader, dismissLoader } from "./loader.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { bootTheme } from "./theme.js";
import { escapeHtml, mountShell, renderCertificates } from "./render.js";

function renderPage() {
  const { profile } = getSiteContent();
  document.querySelector("#certificates-root").innerHTML = `
    <section class="page-hero">
      <p class="eyebrow">Certificates</p>
      <h1>Verified learning trail.</h1>
      <p class="lede">
        A timeline built for credential links, certificate previews, issuer details, and mapped skills.
      </p>
    </section>

    <section class="timeline-intro">
      <div>
        <h2>${escapeHtml(profile.name)} credential system</h2>
        <p>Add LinkedIn, issuer, or certificate verification URLs in the content data file and this page turns them into proof points.</p>
      </div>
    </section>

    <section class="credential-list" aria-label="Certificate timeline">
      ${renderCertificates(false)}
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
