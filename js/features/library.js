// Bookshelf -> Knowledge Library, Spaced-Repetition Flashcards & Share Book Tabs
import { state, persistLocalCollection } from "../state.js";
import { supabase } from "../services/supabase.js";
import { escapeHtml, generateId } from "../utils/dom.js";
import { syncSavedResourceUpsert, syncSavedResourceDelete } from "../services/database-service.js";
import {
  STARTER_GUIDES,
  createFlashcard,
  reviewFlashcard,
  getDueFlashcards
} from "../utils/study-tools.js";

export const libraryFeature = {
  skin: "library",
  eyebrow: "",
  title: "Bookshelf",
  icon: "📚",
  render(container, { param }) {
    let tab = param === "flashcards" ? "flashcards" : "browse"; // browse | flashcards | share
    let query = "";
    let statusMsg = "";
    let showBack = false;

    const renderView = () => {
      const sp = state.spectatingRoom;
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const cards = sp ? [] : (state.localFlashcards || []);
      const dueCards = sp ? [] : getDueFlashcards(cards, Date.now());
      const activeCard = dueCards[0] || null;
      if (sp) tab = "browse";

      const ownerItems = sp
        ? [...(sp.savedResources || []), ...(sp.libraryResources || [])]
        : [...STARTER_GUIDES, ...(state.libraryResources || [])];

      const items = ownerItems.filter((r) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q);
      });

      container.innerHTML = `
        ${sp ? `
          <div class="sprk-card" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
            <strong>${escapeHtml(sp.profile?.displayName || "Student")}'s Bookshelf (${ownerItems.length})</strong>
            <span class="sprk-meta">Saved &amp; shared guides</span>
          </div>
        ` : `
          <nav class="sprk-tabs sprk-tabs-bookshelf" role="tablist">
            <button type="button" class="sprk-tab ${tab === "browse" ? "is-active" : ""}" data-ltab="browse">${seriousMode ? `Guides (${items.length})` : `📚 Guides (${items.length})`}</button>
            <button type="button" class="sprk-tab ${tab === "flashcards" ? "is-active" : ""}" data-ltab="flashcards">${seriousMode ? `Flashcards (${dueCards.length} due)` : `🗂 Flashcards (${dueCards.length} due)`}</button>
            <button type="button" class="sprk-tab ${tab === "share" ? "is-active" : ""}" data-ltab="share">+ Share Book</button>
          </nav>
        `}

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "browse" ? `
          <div style="margin-bottom:12px;">
            <input id="lib-search" class="sprk-input" type="search" placeholder="Search shelf..." value="${escapeHtml(query)}" />
          </div>
          <div id="lib-guides-list" style="display:grid;gap:10px;"></div>
        ` : tab === "flashcards" ? `
          <div style="display:grid;gap:14px;">
            ${activeCard ? `
              <div class="sprk-flashcard-stage" data-flashcard-id="${escapeHtml(activeCard.id)}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span class="sprk-badge-chip">${escapeHtml(activeCard.deck || "General")}</span>
                  <span class="sprk-meta tabular-nums">${dueCards.length} due · Reps ${activeCard.reps || 0}</span>
                </div>

                <div style="font-size:16px;font-weight:700;line-height:1.45;">
                  ${escapeHtml(activeCard.front)}
                </div>

                ${showBack ? `
                  <div style="padding-top:12px;border-top:1.5px solid rgba(52,44,37,0.16);font-size:14px;line-height:1.5;color:var(--ink);" id="flashcard-back-text">
                    ${escapeHtml(activeCard.back)}
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="sprk-btn" data-rate-card="again" style="min-height:34px;padding:4px 12px;">Again (10m)</button>
                    <button type="button" class="sprk-btn" data-rate-card="hard" style="min-height:34px;padding:4px 12px;">Hard (1d)</button>
                    <button type="button" class="sprk-btn sprk-btn-primary" data-rate-card="good" style="min-height:34px;padding:4px 12px;">Good</button>
                    <button type="button" class="sprk-btn" data-rate-card="easy" style="min-height:34px;padding:4px 12px;">Easy (4d+)</button>
                  </div>
                ` : `
                  <div>
                    <button type="button" class="sprk-btn sprk-btn-primary" id="flashcard-reveal-btn">Show Answer</button>
                  </div>
                `}
              </div>
            ` : `
              <div class="sprk-card">
                <strong>All due flashcards reviewed</strong>
                <p class="sprk-meta" style="margin:4px 0 0;">${cards.length} card(s) in your spaced-repetition deck.</p>
              </div>
            `}

            <form id="flashcard-add-form" class="sprk-card">
              <strong style="font-size:13.5px;display:block;margin-bottom:8px;">+ Add Flashcard</strong>
              <div class="sprk-grid-2">
                <label class="sprk-field">
                  <span class="sprk-label">Deck / Subject</span>
                  <input id="fc-deck" class="sprk-input" type="text" maxlength="40" value="General" required />
                </label>
                <label class="sprk-field">
                  <span class="sprk-label">Front Prompt</span>
                  <input id="fc-front" class="sprk-input" type="text" maxlength="180" placeholder="Question or theorem..." required />
                </label>
              </div>
              <label class="sprk-field">
                <span class="sprk-label">Back Answer</span>
                <textarea id="fc-back" class="sprk-textarea" style="min-height:60px;" maxlength="360" placeholder="Recall answer..." required></textarea>
              </label>
              <button type="submit" class="sprk-btn sprk-btn-primary" style="min-height:36px;">Add Card</button>
            </form>

            ${cards.length > 0 ? `
              <div class="sprk-card" style="display:grid;gap:6px;">
                <strong style="font-size:13px;">Deck Cards (${cards.length})</strong>
                ${cards.slice(0, 12).map((c) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);">
                    <div style="min-width:0;">
                      <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.front)}</div>
                      <div class="sprk-meta">${escapeHtml(c.deck)} · Interval ${c.intervalDays || 0}d</div>
                    </div>
                    <button type="button" class="sprk-btn" data-del-card="${escapeHtml(c.id)}" aria-label="Delete flashcard" style="min-height:30px;padding:2px 9px;">×</button>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </div>
        ` : `
          <form id="lib-upload-form" class="sprk-card">
            <div class="sprk-grid-2">
              <label class="sprk-field">
                <span class="sprk-label">Title</span>
                <input id="lib-title" class="sprk-input" type="text" required maxlength="80" />
              </label>
              <label class="sprk-field">
                <span class="sprk-label">Audience</span>
                <select id="lib-audience" class="sprk-select">
                  <option value="private">Private</option>
                  <option value="friends">Friends</option>
                  <option value="public">Public</option>
                </select>
              </label>
            </div>
            <label class="sprk-field">
              <span class="sprk-label">Notes</span>
              <textarea id="lib-summary" class="sprk-textarea" style="min-height:70px;" required maxlength="400"></textarea>
            </label>
            <button type="submit" class="sprk-btn sprk-btn-primary" ${!supabase.configured || !state.user ? "disabled" : ""}>
              ${supabase.configured && state.user ? "Publish" : "Sign in Required"}
            </button>
          </form>
        `}
      `;

      const renderGuidesList = () => {
        const listEl = container.querySelector("#lib-guides-list");
        if (!listEl) return;
        const baseList = sp
          ? [...(sp.savedResources || []), ...(sp.libraryResources || [])]
          : [...STARTER_GUIDES, ...(state.libraryResources || [])];
        const filtered = baseList.filter((r) => {
          if (!query) return true;
          const q = query.toLowerCase();
          return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q);
        });
        listEl.innerHTML = filtered.length === 0
          ? `<div class="sprk-empty">${sp ? "This student hasn't saved or shared any books on their shelf yet." : "No guides match your search."}</div>`
          : filtered.map((item, idx) => {
            const bookmarked = !sp && state.localSavedResources.some((s) => s.id === item.id);
            const spine = item.spine || ["#df7761", "#6ba689", "#e6be67", "#6c8eb1"][idx % 4];
            return `
              <div class="sprk-card sprk-book-card">
                <div style="display:flex;gap:12px;min-width:0;">
                  <span class="sprk-book-spine" style="background:${escapeHtml(spine)};" aria-hidden="true"></span>
                  <div style="min-width:0;">
                    <strong style="font-size:14.5px;">${escapeHtml(item.title)}</strong>
                    <div class="sprk-meta" style="margin:3px 0 4px;">
                      <span>${escapeHtml(item.category || "Book")}</span>
                      <span aria-hidden="true">·</span>
                      <span>${escapeHtml(item.author || (sp ? sp.profile?.displayName : "Community") || "Community")}</span>
                    </div>
                    <p style="margin:0;font-size:12.5px;color:var(--muted);">${escapeHtml(item.summary || "")}</p>
                  </div>
                </div>
                ${sp ? "" : `
                  <button type="button" class="sprk-btn ${bookmarked ? "sprk-btn-primary" : ""}" data-bookmark="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 12px;align-self:center;">
                    ${bookmarked ? "Saved" : "Save"}
                  </button>
                `}
              </div>
            `;
          }).join("");

        listEl.querySelectorAll("[data-bookmark]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.bookmark;
            const exists = state.localSavedResources.some((s) => s.id === id);
            if (exists) {
              persistLocalCollection("localSavedResources", state.localSavedResources.filter((s) => s.id !== id));
              syncSavedResourceDelete(id);
            } else {
              const found = filtered.find((i) => i.id === id);
              if (found) {
                persistLocalCollection("localSavedResources", [found, ...state.localSavedResources]);
                syncSavedResourceUpsert(found);
              }
            }
            renderGuidesList();
          });
        });
      };
      renderGuidesList();

      container.querySelectorAll("[data-ltab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ltab;
          showBack = false;
          renderView();
        });
      });

      container.querySelector("#lib-search")?.addEventListener("input", (e) => {
        query = e.target.value;
        renderGuidesList();
      });

      container.querySelector("#flashcard-reveal-btn")?.addEventListener("click", () => {
        showBack = true;
        renderView();
      });

      container.querySelectorAll("[data-rate-card]").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!activeCard) return;
          const updated = reviewFlashcard(activeCard, btn.dataset.rateCard, Date.now());
          const next = cards.map((c) => (c.id === activeCard.id ? updated : c));
          persistLocalCollection("localFlashcards", next);
          showBack = false;
          statusMsg = `Scheduled "${activeCard.front.slice(0, 32)}" (${updated.intervalDays}d interval).`;
          renderView();
        });
      });

      container.querySelector("#flashcard-add-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const deck = container.querySelector("#fc-deck")?.value.trim() || "General";
        const front = container.querySelector("#fc-front")?.value.trim();
        const back = container.querySelector("#fc-back")?.value.trim();
        if (!front || !back) return;
        const card = createFlashcard({ id: generateId("card"), deck, front, back, nowMs: Date.now() });
        persistLocalCollection("localFlashcards", [card, ...cards]);
        statusMsg = `Added flashcard to ${deck}.`;
        showBack = false;
        renderView();
      });

      container.querySelectorAll("[data-del-card]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delCard;
          persistLocalCollection("localFlashcards", cards.filter((c) => c.id !== id));
          showBack = false;
          renderView();
        });
      });

      container.querySelector("#lib-upload-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = container.querySelector("#lib-title").value.trim();
        const audience = container.querySelector("#lib-audience").value;
        const summary = container.querySelector("#lib-summary").value.trim();
        const { data, error } = await supabase.insert("library_resources", {
          id: generateId("res"),
          author_id: state.user.id,
          title,
          summary,
          audience
        });
        statusMsg = error ? error.message : "Published!";
        if (data?.[0]) state.libraryResources = [data[0], ...state.libraryResources];
        tab = "browse";
        renderView();
      });
    };

    renderView();
  }
};
