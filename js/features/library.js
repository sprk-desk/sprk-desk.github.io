// Bookshelf -> Knowledge Library & Share Book Tabs
import { state, persistLocalCollection } from "../state.js";
import { supabase } from "../services/supabase.js";
import { escapeHtml, generateId } from "../utils/dom.js";
import { syncSavedResourceUpsert, syncSavedResourceDelete } from "../services/database-service.js";

const STARTER_GUIDES = [
  {
    id: "guide_pomodoro",
    title: "25/5 Focus Blocks",
    category: "Focus",
    spine: "#df7761",
    summary: "Short rhythmic intervals preserve working memory.",
    audience: "public",
    author: "SPRK"
  },
  {
    id: "guide_active_recall",
    title: "Active Recall Notes",
    category: "Method",
    spine: "#6ba689",
    summary: "Write three memory bullets after every page.",
    audience: "public",
    author: "SPRK"
  }
];

export const libraryFeature = {
  skin: "library",
  eyebrow: "",
  title: "Bookshelf",
  icon: "📚",
  render(container) {
    let tab = "browse"; // browse | share
    let query = "";
    let statusMsg = "";

    const renderView = () => {
      const items = [...STARTER_GUIDES, ...(state.libraryResources || [])].filter((r) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q);
      });

      container.innerHTML = `
        <nav class="sprk-tabs sprk-tabs-bookshelf" role="tablist">
          <button type="button" class="sprk-tab ${tab === "browse" ? "is-active" : ""}" data-ltab="browse">📚 Guides (${items.length})</button>
          <button type="button" class="sprk-tab ${tab === "share" ? "is-active" : ""}" data-ltab="share">+ Share Book</button>
        </nav>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        ${tab === "browse" ? `
          <div style="margin-bottom:12px;">
            <input id="lib-search" class="sprk-input" type="search" placeholder="Search shelf..." value="${escapeHtml(query)}" />
          </div>
          <div style="display:grid;gap:10px;">
            ${items.map((item, idx) => {
              const bookmarked = state.localSavedResources.some((s) => s.id === item.id);
              const spine = item.spine || ["#df7761", "#6ba689", "#e6be67", "#6c8eb1"][idx % 4];
              return `
                <div class="sprk-card sprk-book-card">
                  <div style="display:flex;gap:12px;min-width:0;">
                    <span class="sprk-book-spine" style="background:${escapeHtml(spine)};" aria-hidden="true"></span>
                    <div style="min-width:0;">
                      <strong style="font-size:14.5px;">${escapeHtml(item.title)}</strong>
                      <div class="sprk-meta" style="margin:3px 0 4px;">
                        <span>${escapeHtml(item.category)}</span>
                        <span aria-hidden="true">·</span>
                        <span>${escapeHtml(item.author || "Community")}</span>
                      </div>
                      <p style="margin:0;font-size:12.5px;color:var(--muted);">${escapeHtml(item.summary)}</p>
                    </div>
                  </div>
                  <button type="button" class="sprk-btn ${bookmarked ? "sprk-btn-primary" : ""}" data-bookmark="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 12px;align-self:center;">
                    ${bookmarked ? "✓ Saved" : "Save"}
                  </button>
                </div>
              `;
            }).join("")}
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
              ${supabase.configured && state.user ? "Publish" : "🔒 Sign in Required"}
            </button>
          </form>
        `}
      `;

      container.querySelectorAll("[data-ltab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.ltab;
          renderView();
        });
      });

      container.querySelector("#lib-search")?.addEventListener("input", (e) => {
        query = e.target.value;
        renderView();
      });

      container.querySelectorAll("[data-bookmark]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.bookmark;
          const exists = state.localSavedResources.some((s) => s.id === id);
          if (exists) {
            persistLocalCollection("localSavedResources", state.localSavedResources.filter((s) => s.id !== id));
            syncSavedResourceDelete(id);
          } else {
            const found = items.find((i) => i.id === id);
            if (found) {
              persistLocalCollection("localSavedResources", [found, ...state.localSavedResources]);
              syncSavedResourceUpsert(found);
            }
          }
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
