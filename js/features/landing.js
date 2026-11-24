// SPRK Desk — Main Landing Website (/)
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { setAppMode } from "../core/settings-manager.js";
import { navigateToPage, parseCurrentPage, PAGE_ROUTES } from "../router.js";
import { escapeHtml } from "../utils/dom.js";

export function initLandingPage() {
  const shellEl = document.getElementById("sprk-home-shell");
  if (!shellEl) return;

  const isHomeActive = () => parseCurrentPage().page === PAGE_ROUTES.HOME;

  const render = () => {
    const active = isHomeActive();
    shellEl.hidden = !active;
    if (!active) return;

    const preferredMode = state.preferences?.appMode === "deepfocus" ? "deepfocus" : "cozy";
    const accountLabel = state.user ? (state.user.displayName || "Account") : "Account / Sign In";

    shellEl.innerHTML = `
      <header class="home-topbar">
        <a href="/" class="home-brand" data-home-nav="home">
          <span class="home-brand-mark" aria-hidden="true">S</span>
          <span>SPRK Desk</span>
        </a>

        <nav class="home-nav" aria-label="Main website navigation">
          <button type="button" class="home-nav-link is-active" data-scroll-sec="#home-aim">About</button>
          <button type="button" class="home-nav-link" data-home-nav="cozy">Cozy Study</button>
          <button type="button" class="home-nav-link" data-home-nav="deepfocus">Deep Focus</button>
          <button type="button" class="home-nav-link" data-home-nav="account">${escapeHtml(accountLabel)}</button>
        </nav>

        <button type="button" class="home-top-cta" id="home-launch-preferred">
          ${preferredMode === "deepfocus" ? "Open Deep Focus →" : "Open Cozy Study →"}
        </button>
      </header>

      <main class="home-main">
        <section class="home-hero" aria-labelledby="home-hero-heading">
          <div class="home-kicker">One Database · Two Study Environments</div>
          <h1 id="home-hero-heading" class="home-h1">Two ways to study.<br>One calm desk.</h1>
          <p class="home-lead">
            SPRK Desk brings together a playful, tactile virtual study room and a distraction-free Deep Focus studio.
            Both versions run on the exact same database, tools, notes, flashcards, audio mixer, and friend network—choose the atmosphere that fits your session.
          </p>
          <div class="home-hero-actions">
            <button type="button" class="home-btn-primary" data-home-nav="cozy">Enter Cozy Study Room</button>
            <button type="button" class="home-btn-secondary home-btn-dark" data-home-nav="deepfocus">Enter Deep Focus Studio</button>
            <button type="button" class="home-btn-secondary" data-home-nav="account">Account &amp; Friends</button>
          </div>
        </section>

        <section class="home-modes-grid" aria-label="Choose your study version">
          <article class="home-mode-card">
            <div class="home-mode-preview">
              <div class="home-mode-cozy-stage" aria-hidden="true">
                <img class="home-cozy-sprite" src="./assets/sprites/themes/comic/plant.png" alt="" referrerpolicy="no-referrer" />
                <img class="home-cozy-sprite is-main" src="./assets/sprites/themes/comic/computer.png" alt="" referrerpolicy="no-referrer" />
                <img class="home-cozy-sprite" src="./assets/sprites/themes/comic/mug.png" alt="" referrerpolicy="no-referrer" />
                <img class="home-cozy-sprite" src="./assets/sprites/themes/comic/buddy.png" alt="" referrerpolicy="no-referrer" />
              </div>
            </div>
            <div class="home-mode-body">
              <span class="home-mode-eyebrow">Gamified Virtual Study Room</span>
              <h2 class="home-mode-title">Cozy Study</h2>
              <p class="home-mode-desc">
                An illustrated desk where every physical object opens a real study tool. Earn Study Credits, customize 16 room themes and object skins, visit friends' rooms, and study alongside your desk buddy.
              </p>
              <ul class="home-mode-points">
                <li>19 interactive physical desk props &amp; movable room layout</li>
                <li>Study Credits wallet, Merchant Bird shop, skins &amp; keepsakes</li>
                <li>Weather window, adjustable desk lamp warmth &amp; live study circle</li>
              </ul>
              <div class="home-mode-footer">
                <span class="home-route-code">/cozy-study</span>
                <button type="button" class="home-btn-primary" data-home-nav="cozy">Launch Cozy Study →</button>
              </div>
            </div>
          </article>

          <article class="home-mode-card is-deepfocus">
            <div class="home-mode-preview">
              <img src="./assets/backdrops/ocean_coast.jpg" alt="Serene coastal Deep Focus workspace backdrop" referrerpolicy="no-referrer" />
            </div>
            <div class="home-mode-body">
              <span class="home-mode-eyebrow">Distraction-Free Focus Studio</span>
              <h2 class="home-mode-title">Deep Focus</h2>
              <p class="home-mode-desc">
                A zero-clutter, glassmorphic study stage built for sustained concentration. Every Cozy Study feature is rebuilt into quiet, streamlined panels with draggable Kanban planning and zero gamification noise.
              </p>
              <ul class="home-mode-points">
                <li>Pomodoro, custom timer &amp; stopwatch with Zen mode (F) &amp; ⌘K</li>
                <li>Drag-and-drop Kanban tasks, Markdown notes, flashcards &amp; analytics</li>
                <li>Custom backdrops, particle engine &amp; 8-channel sound mixer</li>
              </ul>
              <div class="home-mode-footer">
                <span class="home-route-code">/deep-focus</span>
                <button type="button" class="home-btn-primary" style="background:#38bdf8;color:#08111f;" data-home-nav="deepfocus">Launch Deep Focus →</button>
              </div>
            </div>
          </article>
        </section>

        <section aria-labelledby="home-shared-heading">
          <div class="home-section-head">
            <span class="home-kicker">Unified Architecture</span>
            <h2 id="home-shared-heading" class="home-h2">Same database, same tools, zero lock-in.</h2>
            <p class="home-sublead">
              Switch seamlessly between Cozy Study and Deep Focus at any moment—your tasks, focus logs, diary entries, and friends are always in sync.
            </p>
          </div>

          <div class="home-shared-list">
            <div class="home-shared-item">
              <span class="home-shared-num">01</span>
              <div>
                <h3>Focus Timer, Kanban &amp; Exam Planning</h3>
                <p>Track Pomodoro blocks, pin or drag-and-drop tasks across To Do, In Progress, and Done, monitor weekly subject hour budgets, and count down to exams.</p>
              </div>
            </div>
            <div class="home-shared-item">
              <span class="home-shared-num">02</span>
              <div>
                <h3>Private Diary, Markdown Notes &amp; Flashcards</h3>
                <p>Write owner-only journal pages and Markdown study notes with live preview, export to .md, and review decks with spaced-repetition scheduling.</p>
              </div>
            </div>
            <div class="home-shared-item">
              <span class="home-shared-num">03</span>
              <div>
                <h3>Turntable Discs &amp; 8-Channel Sound Mixer</h3>
                <p>Blend procedural rain, wind, hearth fire, lo-fi tones, cafe murmur, and brown/pink/white noise with acoustic low-pass warmth and custom saved mixes.</p>
              </div>
            </div>
            <div class="home-shared-item">
              <span class="home-shared-num">04</span>
              <div>
                <h3>Friends, Silent Halls &amp; Room Visits</h3>
                <p>See live study activity, join synchronized silent body-doubling Pomodoro halls, inspect friends' student cards on /account, and visit their study rooms.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="home-aim" class="home-aim-panel" aria-labelledby="home-aim-heading">
          <div>
            <span class="home-kicker">Aim of SPRK Desk</span>
            <h2 id="home-aim-heading" class="home-aim-quote">
              “A study workspace should adapt to your energy—playful when starting feels hard, and silent when flow takes over.”
            </h2>
          </div>
          <div class="home-aim-copy">
            <p>
              Most productivity tools force a single mood: either overloaded with streaks and popups, or sterile spreadsheets that feel cold late at night.
              SPRK Desk was built so students can keep all their work in one reliable workspace while choosing between two purposefully designed interfaces.
            </p>
            <p>
              Whether you work locally in your browser or connect your Supabase student account for cloud sync and live friend visits, your data belongs to you—with full JSON, CSV, and Markdown export built right in.
            </p>
          </div>
        </section>
      </main>

      <footer class="home-footer">
        <div>Created with ❤️ by <strong>Shashank Pathak</strong></div>
        <div class="home-footer-links">
          <button type="button" class="home-footer-link" data-home-nav="cozy">Cozy Study</button>
          <button type="button" class="home-footer-link" data-home-nav="deepfocus">Deep Focus</button>
          <button type="button" class="home-footer-link" data-home-nav="account">Account &amp; Friends</button>
        </div>
      </footer>
    `;

    shellEl.querySelectorAll("[data-home-nav]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const target = el.dataset.homeNav;
        if (target === "cozy") {
          setAppMode("cozy", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.COZY);
        } else if (target === "deepfocus") {
          setAppMode("deepfocus", { syncUrl: false });
          navigateToPage(PAGE_ROUTES.DEEPFOCUS);
        } else if (target === "account") {
          navigateToPage(PAGE_ROUTES.ACCOUNT);
        } else {
          navigateToPage(PAGE_ROUTES.HOME);
        }
      });
    });

    shellEl.querySelector("#home-launch-preferred")?.addEventListener("click", () => {
      const target = preferredMode === "deepfocus" ? PAGE_ROUTES.DEEPFOCUS : PAGE_ROUTES.COZY;
      setAppMode(preferredMode, { syncUrl: false });
      navigateToPage(target);
    });

    shellEl.querySelectorAll("[data-scroll-sec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        shellEl.querySelector(btn.dataset.scrollSec)?.scrollIntoView({ behavior: "smooth" });
      });
    });
  };

  render();
  bus.on("page:changed", render);
  bus.on("auth:changed", render);
  bus.on("preferences:changed", render);
}
