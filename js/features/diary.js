// Desk Notebook -> Private Diary, Study Notes & Write Tabs
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, generateId } from "../utils/dom.js";
import { syncNoteUpsert, syncNoteDelete } from "../services/database-service.js";

export const diaryFeature = {
  skin: "diary",
  eyebrow: "",
  title: "Desk Notebook",
  icon: "✎",
  render(container) {
    let tab = "diary"; // diary | notes | write
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
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-notebook" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "diary" ? "is-active" : ""}" data-dtab="diary">🔒 Diary</button>
            <button type="button" class="sprk-tab ${tab === "notes" ? "is-active" : ""}" data-dtab="notes">📝 Notes</button>
            <button type="button" class="sprk-tab ${tab === "write" ? "is-active" : ""}" data-dtab="write">✎ ${current ? "Edit" : "New"}</button>
          </nav>
          <span class="sprk-badge-chip">🔒 Owner-Only</span>
        </div>

        ${tab === "write" ? `
          <form id="diary-editor" class="sprk-card">
            <div style="display:flex;gap:8px;margin-bottom:10px;">
              <button type="button" class="sprk-btn ${activeFolder === "diary" ? "sprk-btn-primary" : ""}" data-target-folder="diary" style="min-height:32px;padding:4px 10px;">🔒 Diary</button>
              <button type="button" class="sprk-btn ${activeFolder === "notes" ? "sprk-btn-primary" : ""}" data-target-folder="notes" style="min-height:32px;padding:4px 10px;">📝 Notes</button>
            </div>
            <label class="sprk-field">
              <span class="sprk-label">${activeFolder === "diary" ? "Heading" : "Title"}</span>
              <input id="diary-title" class="sprk-input" type="text" required maxlength="80" value="${escapeHtml(current?.title || "")}" placeholder="Today's page..." />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Page</span>
              <textarea id="diary-body" class="sprk-textarea" required placeholder="Write freely...">${escapeHtml(current?.content || "")}</textarea>
            </label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="submit" class="sprk-btn sprk-btn-primary">${current ? "Update" : "Save Page"}</button>
              ${current ? `<button type="button" class="sprk-btn" id="diary-cancel-edit">Cancel</button>` : ""}
            </div>
          </form>
        ` : `
          <div style="margin-bottom:12px;">
            <input id="diary-search" class="sprk-input" type="search" placeholder="Search ${activeFolder}..." value="${escapeHtml(searchQuery)}" />
          </div>
          <div style="display:grid;gap:8px;">
            ${notes.length === 0 ? `<div class="sprk-empty">No pages yet.</div>` : notes.map((n) => `
              <div class="sprk-card" style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="min-width:0;">
                  <div class="sprk-hand" style="font-size:21px;font-weight:700;">${escapeHtml(n.title)}</div>
                  <p style="margin:4px 0 6px;font-size:13px;white-space:pre-wrap;">${escapeHtml(n.content)}</p>
                  <div class="sprk-meta">${escapeHtml((n.updatedAt || "").slice(0, 10))}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="sprk-btn" data-edit-note="${escapeHtml(n.id)}" style="min-height:32px;padding:4px 10px;">✎</button>
                  <button type="button" class="sprk-btn" data-del-note="${escapeHtml(n.id)}" aria-label="Delete ${escapeHtml(n.title)}" style="min-height:32px;padding:4px 10px;">×</button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      `;

      container.querySelectorAll("[data-dtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          tab = btn.dataset.dtab;
          if (tab === "diary" || tab === "notes") {
            activeFolder = tab;
            editingId = null;
          }
          renderView();
        });
      });

      container.querySelectorAll("[data-target-folder]").forEach((btn) => {
        btn.addEventListener("click", () => {
          activeFolder = btn.dataset.targetFolder;
          renderView();
        });
      });

      container.querySelector("#diary-search")?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderView();
      });

      container.querySelector("#diary-cancel-edit")?.addEventListener("click", () => {
        editingId = null;
        tab = activeFolder;
        renderView();
      });

      container.querySelector("#diary-editor")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = container.querySelector("#diary-title").value.trim();
        const content = container.querySelector("#diary-body").value.trim();
        if (!title || !content) return;
        const nowIso = new Date().toISOString();
        if (editingId) {
          const updatedList = state.localDiary.map((n) => (n.id === editingId ? { ...n, title, content, updatedAt: nowIso } : n));
          persistLocalCollection("localDiary", updatedList);
          const editedNote = updatedList.find((n) => n.id === editingId);
          if (editedNote) syncNoteUpsert(editedNote);
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
          syncNoteUpsert(entry);
        }
        tab = activeFolder;
        renderView();
      });

      container.querySelectorAll("[data-edit-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          editingId = btn.dataset.editNote;
          tab = "write";
          renderView();
        });
      });

      container.querySelectorAll("[data-del-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delNote;
          persistLocalCollection("localDiary", state.localDiary.filter((n) => n.id !== id));
          syncNoteDelete(id);
          if (editingId === id) editingId = null;
          renderView();
        });
      });
    };

    renderView();
  }
};
