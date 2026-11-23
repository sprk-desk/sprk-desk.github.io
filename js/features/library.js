// Bookshelf -> Knowledge Library, Bookmarks, and Resource Sharing
import { state, persistLocalCollection } from "../state.js";
import { supabase } from "../services/supabase.js";
import { escapeHtml, generateId } from "../utils/dom.js";

const STARTER_GUIDES = [
  {
    id: "guide_pomodoro",
    title: "The Science of 25/5 Focus Blocks",
    category: "Focus Technique",
    summary: "Short rhythmic intervals preserve working memory and prevent afternoon burnout.",
    audience: "public",
    author: "SPRK Editorial"
  },
  {
    id: "guide_active_recall",
    title: "Active Recall & Spaced Review Notes",
    category: "Study Method",
    summary: "Close your textbook after each page and write three bullet points from memory.",
    audience: "public",
    author: "SPRK Editorial"
  }
];

export const libraryFeature = {
  skin: "library",
  eyebrow: "BOOKSHELF · KNOWLEDGE LIBRARY",
  title: "Knowledge Library",
  icon: "📚",
  render(container, { rerender }) {
    let query = "";
    let statusMsg = "";

    const renderView = () => {
      const items = [...STARTER_GUIDES, ...(state.libraryResources || [])].filter((r) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (r.title || "").toLowerCase().includes(q) || (r.category || "").toLowerCase().includes(q);
      });

      container.innerHTML = `
        <div style="display:flex;gap:10px;margin-bottom:14px;">
          <input id="lib-search" class="sprk-input" type="search" placeholder="Search guides, subjects, and notes..." value="${escapeHtml(query)}" />
        </div>

        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        <div style="display:grid;gap:10px;margin-bottom:16px;">
          ${items.map((item) => {
            const bookmarked = state.localSavedResources.some((s) => s.id === item.id);
            return `
              <div class="sprk-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                  <div>
                    <strong style="font-size:15px;">${escapeHtml(item.title)}</strong>
                    <div class="sprk-meta" style="margin:3px 0 6px;">
                      <span>${escapeHtml(item.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span>${escapeHtml(item.audience || "public")}</span>
                      <span aria-hidden="true">·</span>
                      <span>${escapeHtml(item.author || "Community")}</span>
                    </div>
                    <p style="margin:0;font-size:13px;color:var(--muted);">${escapeHtml(item.summary)}</p>
                  </div>
                  <button type="button" class="sprk-btn ${bookmarked ? "sprk-btn-primary" : ""}" data-bookmark="${escapeHtml(item.id)}" style="min-height:34px;padding:4px 12px;">
                    ${bookmarked ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <form id="lib-upload-form" class="sprk-card">
          <h3 style="margin:0 0 8px;font-size:14px;">Share a Study Resource</h3>
          <div class="sprk-grid-2">
            <label class="sprk-field">
              <span class="sprk-label">Title</span>
              <input id="lib-title" class="sprk-input" type="text" required maxlength="80" />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Audience</span>
              <select id="lib-audience" class="sprk-select">
                <option value="private">Private (Only Me)</option>
                <option value="friends">Friends</option>
                <option value="public">Public Library</option>
              </select>
            </label>
          </div>
          <label class="sprk-field">
            <span class="sprk-label">Summary / Notes</span>
            <textarea id="lib-summary" class="sprk-textarea" style="min-height:70px;" required maxlength="400"></textarea>
          </label>
          <button type="submit" class="sprk-btn sprk-btn-primary" ${!supabase.configured || !state.user ? "disabled" : ""}>
            ${supabase.configured && state.user ? "Publish Resource" : "Sign in with Supabase to Publish"}
          </button>
        </form>
      `;

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
          } else {
            const found = items.find((i) => i.id === id);
            if (found) persistLocalCollection("localSavedResources", [found, ...state.localSavedResources]);
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
        statusMsg = error ? error.message : "Resource published to Knowledge Library!";
        if (data?.[0]) state.libraryResources = [data[0], ...state.libraryResources];
        rerender();
      });
    };

    renderView();
  }
};
