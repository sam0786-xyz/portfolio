import { bootLoader, dismissLoader } from "./loader.js";
import { getSiteContent, initSiteContent } from "./content-store.js";
import { bootInteractions } from "./animations.js";
import { bootTheme } from "./theme.js";
import { escapeHtml, icon, mountShell, renderCertificates } from "./render.js";

function renderPage() {
  const { profile, certificates } = getSiteContent();
  const featuredCount = certificates.filter((certificate) => certificate.featured).length;
  document.querySelector("#certificates-root").innerHTML = `
    <section class="page-hero page-hero-pro">
      <p class="eyebrow">Credentials / Proof</p>
      <h1>Verified learning, mapped to practical AI work.</h1>
      <p class="lede">
        A focused credential timeline for AI, ML, cloud, and production engineering skills, designed to make verification fast.
      </p>
      <div class="subpage-metrics" aria-label="Certificate summary">
        <span><strong>${certificates.length}</strong> credentials</span>
        <span><strong>${featuredCount}</strong> featured</span>
        <span><strong>AI/ML</strong> focus</span>
      </div>
    </section>

    <section class="timeline-intro">
      <div>
        <p class="eyebrow">Credential system</p>
        <h2>${escapeHtml(profile.name)} proof timeline</h2>
        <p>Issuer details, skills, previews, and verification links are organized as recruiter-readable evidence instead of a generic certificate dump.</p>
      </div>
      <a class="secondary-link" href="/#contact">${icon("mail")} Request details</a>
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
