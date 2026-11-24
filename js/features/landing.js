// SPRK Desk — Main Landing Website (/)
import { state } from "../state.js";
import { bus } from "../core/event-bus.js";
import { setAppMode } from "../core/settings-manager.js";
import { presenceService } from "../services/presence-service.js";
import { navigateToPage, parseCurrentPage, getMostVisitedWorkspace, PAGE_ROUTES } from "../router.js";
import { sanitizeAvatarUrl, normalizePrivacySettings } from "../utils/profile-helpers.js";
import { computeStudyStreaks, summarizeFocusMinutes } from "../utils/timer-math.js";
import { escapeHtml, formatMinutesLabel, todayIsoDate } from "../utils/dom.js";

function privacyLabel(visibility) {
  if (visibility === "public") return "Public Room";
  if (visibility === "private") return "Private Room";
  return "Friends Only Room";
}

export function initLandingPage() {
  const shellEl = document.getElementById("sprk-home-shell");
  if (!shellEl) return;

  const isHomeActive = () => parseCurrentPage().page === PAGE_ROUTES.HOME;

  const openAccountTab = (tab = "feed") => {
    navigateToPage(PAGE_ROUTES.ACCOUNT);
    bus.emit("account:openTab", { tab });
  };

  const render = () => {
    const active = isHomeActive();
    shellEl.hidden = !active;
    if (!active) return;

    const preferredMode = getMostVisitedWorkspace(state.preferences?.appMode === "deepfocus" ? "deepfocus" : "cozy");
    const user = state.user;
    const prof = user || {
      publicId: "LOCAL",
      displayName: state.localProfile?.displayName || state.preferences?.localDisplayName || "Local Student",
      username: state.localProfile?.username || "",
      avatarPreset: state.localProfile?.avatarPreset || "☺",
      avatarUrl: state.localProfile?.avatarUrl || "",
      bio: state.localProfile?.bio || "",
      courseClass: state.localProfile?.courseClass || "",
      examAim: state.localProfile?.examAim || "",
      privacy: normalizePrivacySettings(state.localProfile?.privacy)
    };
    const privacy = normalizePrivacySettings(prof.privacy);
    const safeAvatarUrl = sanitizeAvatarUrl(prof.avatarUrl || "");
    const totalFocusMins = summarizeFocusMinutes(state.localStudyRecords).totalMinutes;
    const streakInfo = computeStudyStreaks(state.localStudyRecords, todayIsoDate());
    const presenceSnap = presenceService.getSnapshot(Date.now());
    const friendEntries = presenceSnap.entries || [];
    const studyingNowCount = friendEntries.filter((e) => e.presence?.status === "studying").length;
    const onlineNowCount = friendEntries.filter((e) => e.presence?.status === "studying" || e.presence?.status === "online").length;
    const incomingCount = (state.friendRequests?.incoming || []).length;
    const groupsCount = (state.studyGroups || []).length;
    const recentFeed = (state.socialFeed || []).slice(0, 2);

    shellEl.innerHTML = `
      <header class="home-topbar">
        <a href="/" class="home-brand" data-home-nav="home">
          <span class="home-brand-mark" aria-hidden="true">S</span>
          <span>SPRK Desk</span>
        </a>

        <button type="button" class="home-top-cta" id="home-launch-preferred">
          ${preferredMode === "deepfocus" ? "Open Deep Focus →" : "Open Cozy Study →"}
        </button>
      </header>

      <main class="home-main">
        <section class="home-hero" aria-labelledby="home-hero-heading">
          <div class="home-kicker">One Database · Two Study Environments · Connected Network</div>
          <h1 id="home-hero-heading" class="home-h1">Two ways to study.<br>One calm desk.</h1>
          <p class="home-lead">
            SPRK Desk brings together a playful, tactile virtual study room, a distraction-free Deep Focus studio, and a student-first social hub.
            Everything runs on the same database—notes, flashcards, timers, friends, study groups, and room privacy stay seamlessly in sync.
          </p>
          <div class="home-hero-actions">
            <button type="button" class="home-btn-primary" data-home-nav="cozy">Enter Cozy Study Room</button>
            <button type="button" class="home-btn-secondary home-btn-dark" data-home-nav="deepfocus">Enter Deep Focus Studio</button>
            <button type="button" class="home-btn-secondary" data-home-account-tab="${user ? "feed" : "auth"}">${user ? "Open Social & Account" : "Sign In & Social Hub"}</button>
          </div>
        </section>

        <section class="home-modes-grid" aria-label="Choose your study version">
          <article class="home-mode-card">
            <div class="home-mode-preview">
              <div class="home-mode-cozy-stage" aria-hidden="true">
                <img class="home-cozy-sprite" src="./assets/sprites/themes/comic/lamp.png" alt="" referrerpolicy="no-referrer" />
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
                <li>Interactive physical desk props &amp; movable room layout</li>
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
                A zero-clutter study stage built for sustained concentration. Every Cozy Study tool is unified under your active room theme with draggable Kanban planning, named focus sessions, and previewable atmospheres.
              </p>
              <ul class="home-mode-points">
                <li>Pomodoro, custom timer &amp; stopwatch with Zen mode (F) &amp; ⌘K</li>
                <li>Drag-and-drop Kanban tasks, Markdown notes, flashcards &amp; analytics</li>
                <li>Theme &amp; cosmetic previews, particle engine &amp; 9-channel sound mixer</li>
              </ul>
              <div class="home-mode-footer">
                <span class="home-route-code">/deep-focus</span>
                <button type="button" class="home-btn-primary home-btn-deepfocus" data-home-nav="deepfocus">Launch Deep Focus →</button>
              </div>
            </div>
          </article>
        </section>

        <section id="home-social" class="home-social-section" aria-labelledby="home-social-heading">
          <div class="home-social-top">
            <div class="home-section-head">
              <span class="home-kicker">Social &amp; Account Hub</span>
              <h2 id="home-social-heading" class="home-h2">Your student identity, study circle, and groups in one place.</h2>
              <p class="home-sublead">
                Explore classmates' public cards, share study updates on the feed, collaborate inside subject groups, and decide exactly who gets to visit your desk.
              </p>
            </div>
            <div class="home-social-top-actions">
              <button type="button" class="home-btn-primary" data-home-account-tab="${user ? "feed" : "auth"}">
                ${user ? "Open Full Social Hub →" : "Sign In / Join Network →"}
              </button>
            </div>
          </div>

          <div class="home-social-workspace">
            <article class="home-account-card">
              <div class="home-account-head">
                <div class="home-account-avatar">
                  ${safeAvatarUrl
                    ? `<img src="${escapeHtml(safeAvatarUrl)}" alt="${escapeHtml(prof.displayName)}" referrerpolicy="no-referrer" />`
                    : `<span>${escapeHtml(prof.avatarPreset || "☺")}</span>`}
                </div>
                <div class="home-account-id-block">
                  <div class="home-account-name-row">
                    <h3>${escapeHtml(prof.displayName || "Local Student")}</h3>
                    <span class="home-account-privacy">${escapeHtml(privacyLabel(privacy.roomVisibility))}</span>
                  </div>
                  <div class="home-account-meta">
                    ${prof.username ? `<span>@${escapeHtml(prof.username)}</span><span>·</span>` : ""}
                    <span class="tabular-nums">${escapeHtml(prof.publicId || "LOCAL")}</span>
                    <span>·</span>
                    <span>${user ? "Cloud Synced" : "Local Mode"}</span>
                  </div>
                  ${prof.courseClass || prof.examAim ? `
                    <div class="home-account-submeta">
                      ${[prof.courseClass, prof.examAim].filter(Boolean).map((v) => escapeHtml(v)).join(" · ")}
                    </div>
                  ` : ""}
                </div>
              </div>

              ${prof.bio ? `<p class="home-account-bio">${escapeHtml(prof.bio)}</p>` : `
                <p class="home-account-bio is-muted">
                  ${user
                    ? "Customize your bio, avatar, cover banner, and room privacy from your student profile."
                    : "Sign in with your free student account to get your SPRK- ID, save progress to the cloud, and connect with peers."}
                </p>
              `}

              <div class="home-account-stats">
                <div class="home-stat-cell">
                  <span class="home-stat-label">Focus Logged</span>
                  <strong class="home-stat-value tabular-nums">${formatMinutesLabel(totalFocusMins)}</strong>
                </div>
                <div class="home-stat-cell">
                  <span class="home-stat-label">Streak</span>
                  <strong class="home-stat-value tabular-nums">${streakInfo.currentStreak}d</strong>
                </div>
                <div class="home-stat-cell">
                  <span class="home-stat-label">Friends</span>
                  <strong class="home-stat-value tabular-nums">${friendEntries.length}</strong>
                </div>
                <div class="home-stat-cell">
                  <span class="home-stat-label">Groups</span>
                  <strong class="home-stat-value tabular-nums">${groupsCount}</strong>
                </div>
              </div>

              <div class="home-account-actions">
                <button type="button" class="home-btn-secondary" data-home-account-tab="feed">Study Feed</button>
                <button type="button" class="home-btn-secondary" data-home-account-tab="people">
                  People${incomingCount ? ` (+${incomingCount})` : ""}
                </button>
                <button type="button" class="home-btn-secondary" data-home-account-tab="groups">Groups</button>
                <button type="button" class="home-btn-secondary" data-home-account-tab="profile">Profile &amp; Privacy</button>
                ${!user ? `<button type="button" class="home-btn-primary" data-home-account-tab="auth">Sign In</button>` : ""}
              </div>
            </article>

            <aside class="home-social-live-col">
              <div class="home-live-card">
                <div class="home-live-card-head">
                  <div>
                    <span class="home-live-eyebrow">Live Study Circle</span>
                    <h3>${user ? `${onlineNowCount} online · ${studyingNowCount} focusing` : "Account &amp; Live Presence"}</h3>
                  </div>
                  <button type="button" class="home-text-btn" data-home-account-tab="people">Find People →</button>
                </div>

                ${user && friendEntries.length > 0 ? `
                  <div class="home-peer-mini-list">
                    ${friendEntries.slice(0, 3).map((entry) => {
                      const p = entry.presence || {};
                      const st = p.status || "offline";
                      const stText = st === "studying"
                        ? `Studying ${p.subject || "Focus"}`
                        : st === "online"
                          ? "Online"
                          : "Offline";
                      return `
                        <div class="home-peer-mini-row">
                          <span class="home-peer-dot is-${escapeHtml(st)}"></span>
                          <div class="home-peer-mini-info">
                            <strong>${escapeHtml(entry.displayName || "Student")}</strong>
                            <span>${escapeHtml(stText)}</span>
                          </div>
                          <span class="home-peer-id tabular-nums">${escapeHtml(entry.publicId || "")}</span>
                        </div>
                      `;
                    }).join("")}
                  </div>
                ` : `
                  <p class="home-live-copy">
                    ${user
                      ? "Add classmates by @username or SPRK- ID to see when they start Pomodoro sessions, inspect their achievements, or visit open rooms."
                      : "Connect an account to unlock real-time presence indicators, friend requests by SPRK- ID, and silent body-doubling halls."}
                  </p>
                `}
              </div>

              <div class="home-live-card">
                <div class="home-live-card-head">
                  <div>
                    <span class="home-live-eyebrow">Community Feed</span>
                    <h3>${recentFeed.length > 0 ? "Latest Student Updates" : "Milestones, Questions & Notes"}</h3>
                  </div>
                  <button type="button" class="home-text-btn" data-home-account-tab="feed">Open Feed →</button>
                </div>

                ${recentFeed.length > 0 ? `
                  <div class="home-feed-mini-list">
                    ${recentFeed.map((post) => `
                      <div class="home-feed-mini-item">
                        <div class="home-feed-mini-head">
                          <strong>${escapeHtml(post.author?.displayName || "Student")}</strong>
                          <span>${escapeHtml(post.subject || "General Study")}</span>
                        </div>
                        <p>${escapeHtml((post.content || "").slice(0, 120))}${(post.content || "").length > 120 ? "…" : ""}</p>
                      </div>
                    `).join("")}
                  </div>
                ` : `
                  <p class="home-live-copy">
                    Share completed study sessions, ask subject questions, filter posts between All Students and Friends, and react with supportive replies.
                  </p>
                `}
              </div>
            </aside>
          </div>

          <div class="home-social-pillars">
            <article class="home-pillar-card">
              <span class="home-shared-num">01</span>
              <h3>Public Cards &amp; Friend Network</h3>
              <p>Every student gets a unique <code>SPRK-</code> ID, custom <code>@username</code>, bio, cover banner, and favorite subjects. Search peers and manage friend requests cleanly.</p>
            </article>
            <article class="home-pillar-card">
              <span class="home-shared-num">02</span>
              <h3>Study Feed &amp; Reflections</h3>
              <p>Post updates, milestones, questions, or resource tips—publicly or just to friends—with instant likes and threaded study discussions.</p>
            </article>
            <article class="home-pillar-card">
              <span class="home-shared-num">03</span>
              <h3>Subject Groups &amp; Invite Codes</h3>
              <p>Build focused peer circles with 6-character invite codes, pinned group announcements, group chat, and shared silent Pomodoro rooms.</p>
            </article>
            <article class="home-pillar-card">
              <span class="home-shared-num">04</span>
              <h3>Strict Room Privacy Controls</h3>
              <p>Set your Cozy Study desk to Public, Friends Only, or Private. Room visitors can view your profile card, streaks, achievements, and bookshelf—never private diary or tasks.</p>
            </article>
          </div>
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
                <p>Track Pomodoro blocks, name each session after completion, drag-and-drop tasks across To Do, In Progress, and Done, and count down to exams.</p>
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
                <h3>Turntable Discs &amp; 9-Channel Sound Mixer</h3>
                <p>Blend procedural rain, wind, hearth fire, lo-fi tones, cafe murmur, and brown/pink/white noise with acoustic low-pass warmth and custom saved mixes.</p>
              </div>
            </div>
            <div class="home-shared-item">
              <span class="home-shared-num">04</span>
              <div>
                <h3>Friends, Silent Halls &amp; Room Visits</h3>
                <p>See live study progress across your circle, join synchronized silent body-doubling Pomodoro halls, and explore open friends' study desks.</p>
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
          <button type="button" class="home-footer-link" data-home-account-tab="feed">Social &amp; Account</button>
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

    shellEl.querySelectorAll("[data-home-account-tab]").forEach((el) => {
      el.addEventListener("click", () => {
        openAccountTab(el.dataset.homeAccountTab || "feed");
      });
    });

    shellEl.querySelector("#home-launch-preferred")?.addEventListener("click", () => {
      const target = preferredMode === "deepfocus" ? PAGE_ROUTES.DEEPFOCUS : PAGE_ROUTES.COZY;
      setAppMode(preferredMode, { syncUrl: false });
      navigateToPage(target);
    });
  };

  render();
  bus.on("page:changed", render);
  bus.on("auth:changed", render);
  bus.on("profile:changed", render);
  bus.on("friends:changed", render);
  bus.on("groups:changed", render);
  bus.on("socialFeed:changed", render);
  bus.on("preferences:changed", render);
}
