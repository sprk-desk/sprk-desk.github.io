// SPRK Desk — Main Website (/) is unified into #sprk-account-shell (account-page.js)
export function initLandingPage() {
  const shellEl = document.getElementById("sprk-home-shell");
  if (!shellEl) return;
  shellEl.hidden = true;
  shellEl.innerHTML = "";
}
