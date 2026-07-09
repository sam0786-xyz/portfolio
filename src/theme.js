/**
 * Theme control.
 *
 * The portfolio ships a single, deliberate "Glass & Void" dark theme. There is
 * no light stylesheet, so we pin the document to dark rather than leaving a
 * half-wired toggle that would render an unstyled page. If a real light theme
 * is added later, reintroduce the toggle here and the matching CSS variables.
 */

export function bootTheme() {
  document.documentElement.dataset.theme = "dark";
}
