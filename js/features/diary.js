// Notebook -> Private Owner-Only Diary & Study Notes
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, generateId } from "../utils/dom.js";

export const diaryFeature = {
  skin: "diary",
  eyebrow: "DESK NOTEBOOK · OWNER-ONLY PRIVATE",
  title: "Private Diary & Personal Notes",
  icon: "✎",
  render(container, { rerender }) {
    let activeFolder = "diary";
    let searchQuery = "";
    let editingId = null;

    const renderView = () => {
      const notes = (state.localDiary || []).filter((n) => {
        if ((n.folder || "diary") !== activeFolder) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
      });
      const current = notes.find((n) => n.id === editingId) || null;

      container.innerHTML = `
        <div class="sprk-notice" style="margin-bottom:12px;">
          <strong>Private Space:</strong> Entries here are owner-only (enforced at RLS & storage levels in Supabase; never visible to room visitors).
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div class="sprk-tabs" style="margin:0;">
            <button type="button" class="sprk-tab ${activeFolder === "diary" ? "is-active" : ""}" data-folder="diary">Private Diary</button>
            <button type="button" class="sprk-tab ${activeFolder === "notes" ? "is-active" : ""}" data-folder="notes">Study Notes</button>
          </div>
          <input id="diary-search" class="sprk-input" type="search" placeholder="Search entries..." value="${escapeHtml(searchQuery)}" style="max-width:220px;" />
        </div>

        <form id="diary-editor" class="sprk-card" style="margin-bottom:14px;">
          <label class="sprk-field">
            <span class="sprk-label">${activeFolder === "diary" ? "Diary Heading" : "Note Title"}</span>
            <input id="diary-title" class="sprk-input" type="text" required maxlength="80" value="${escapeHtml(current?.title || "")}" placeholder="Reflections from today's study session..." />
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Page Content</span>
            <textarea id="diary-body" class="sprk-textarea" required placeholder="Write freely...">${escapeHtml(current?.content || "")}</textarea>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="submit" class="sprk-btn sprk-btn-primary">${current ? "Update Page" : "Save Page"}</button>
            ${current ? `<button type="button" class="sprk-btn" id="diary-cancel-edit">New Entry</button>` : ""}
          </div>
        </form>

        <div style="display:grid;gap:8px;">
          ${notes.length === 0 ? `<div class="sprk-empty">No pages in this section yet.</div>` : notes.map((n) => `
            <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
              <div style="min-width:0;">
                <div class="sprk-hand" style="font-size:21px;font-weight:700;">${escapeHtml(n.title)}</div>
                <p style="margin:4px 0 6px;font-size:13px;white-space:pre-wrap;">${escapeHtml(n.content)}</p>
                <div class="sprk-meta">${escapeHtml((n.updatedAt || "").slice(0, 10))}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button type="button" class="sprk-btn" data-edit-note="${escapeHtml(n.id)}" style="min-height:32px;padding:4px 10px;">Edit</button>
                <button type="button" class="sprk-btn" data-del-note="${escapeHtml(n.id)}" aria-label="Delete ${escapeHtml(n.title)}" style="min-height:32px;padding:4px 10px;">×</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;

      container.querySelectorAll("[data-folder]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeFolder = btn.dataset.folder;
          editingId = null;
          renderView();
        });
      });

      container.querySelector("#diary-search")?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderView();
      });

      container.querySelector("#diary-cancel-edit")?.addEventListener("click", () => {
        editingId = null;
        renderView();
      });

      container.querySelector("#diary-editor")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = container.querySelector("#diary-title").value.trim();
        const content = container.querySelector("#diary-body").value.trim();
        if (!title || !content) return;
        const nowIso = new Date().toISOString();
        if (editingId) {
          persistLocalCollection(
            "localDiary",
            state.localDiary.map((n) => (n.id === editingId ? { ...n, title, content, updatedAt: nowIso } : n))
          );
          editingId = null;
        } else {
          const entry = {
            id: generateId("note"),
            folder: activeFolder,
            isDiary: activeFolder === "diary",
            title,
            content,
            updatedAt: nowIso
          };
          persistLocalCollection("localDiary", [entry, ...state.localDiary]);
        }
        rerender();
      });

      container.querySelectorAll("[data-edit-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          editingId = btn.dataset.editNote;
          renderView();
        });
      });

      container.querySelectorAll("[data-del-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delNote;
          persistLocalCollection("localDiary", state.localDiary.filter((n) => n.id !== id));
          if (editingId === id) editingId = null;
          renderView();
        });
      });
    };

    renderView();
  }
};
