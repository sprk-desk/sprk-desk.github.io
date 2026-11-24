// Desk Notebook -> Private Diary, Markdown Study Notes, Preview & Export
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, generateId } from "../utils/dom.js";
import { renderSafeMarkdownHtml } from "../utils/study-tools.js";
import { syncNoteUpsert, syncNoteDelete } from "../services/database-service.js";

function downloadTextFile(filename, content, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
    let previewMd = false;
    let draftTitle = "";
    let draftContent = "";

    const syncDraftFromDom = () => {
      const titleInput = container.querySelector("#diary-title");
      const bodyInput = container.querySelector("#diary-body");
      if (titleInput) draftTitle = titleInput.value;
      if (bodyInput) draftContent = bodyInput.value;
    };

    const renderView = () => {
      const seriousMode = Boolean(state.preferences?.seriousMode);
      const notes = (state.localDiary || []).filter((n) => {
        if ((n.folder || "diary") !== activeFolder) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (n.title || "").toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
      });
      const current = notes.find((n) => n.id === editingId) || null;
      const editorTitle = tab === "write" ? draftTitle : "";
      const editorContent = tab === "write" ? draftContent : "";

      container.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <nav class="sprk-tabs sprk-tabs-notebook" style="margin:0;" role="tablist">
            <button type="button" class="sprk-tab ${tab === "diary" ? "is-active" : ""}" data-dtab="diary">${seriousMode ? "Journal" : "🔒 Diary"}</button>
            <button type="button" class="sprk-tab ${tab === "notes" ? "is-active" : ""}" data-dtab="notes">${seriousMode ? "Notes" : "📝 Notes"}</button>
            <button type="button" class="sprk-tab ${tab === "write" ? "is-active" : ""}" data-dtab="write">${seriousMode ? (current ? "Edit" : "New Entry") : `✎ ${current ? "Edit" : "New"}`}</button>
          </nav>
          <div style="display:flex;align-items:center;gap:6px;">
            ${notes.length > 0 ? `<button type="button" class="sprk-btn" id="diary-export-all" style="min-height:30px;padding:3px 10px;font-size:12px;">Export .md</button>` : ""}
            <span class="sprk-badge-chip">${seriousMode ? "Owner-Only" : "🔒 Owner-Only"}</span>
          </div>
        </div>

        ${tab === "write" ? `
          <form id="diary-editor" class="sprk-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <div style="display:flex;gap:8px;">
                <button type="button" class="sprk-btn ${activeFolder === "diary" ? "sprk-btn-primary" : ""}" data-target-folder="diary" style="min-height:32px;padding:4px 10px;">${seriousMode ? "Journal" : "🔒 Diary"}</button>
                <button type="button" class="sprk-btn ${activeFolder === "notes" ? "sprk-btn-primary" : ""}" data-target-folder="notes" style="min-height:32px;padding:4px 10px;">${seriousMode ? "Notes" : "📝 Notes"}</button>
              </div>
              <button type="button" class="sprk-btn ${previewMd ? "sprk-btn-primary" : ""}" id="diary-toggle-preview" style="min-height:32px;padding:4px 10px;">
                ${previewMd ? "Edit Text" : "Preview Markdown"}
              </button>
            </div>
            <label class="sprk-field">
              <span class="sprk-label">${activeFolder === "diary" ? "Heading" : "Title"}</span>
              <input id="diary-title" class="sprk-input" type="text" required maxlength="80" value="${escapeHtml(editorTitle)}" placeholder="Today's page..." />
            </label>
            <label class="sprk-field" ${previewMd ? "hidden" : ""}>
              <span class="sprk-label">Markdown Supported (# Headings, **bold**, \`code\`, - [ ] checklists)</span>
              <textarea id="diary-body" class="sprk-textarea" required placeholder="Write with optional Markdown...">${escapeHtml(editorContent)}</textarea>
            </label>
            ${previewMd ? `
              <div id="diary-md-preview" class="sprk-card sprk-md-body" style="margin-bottom:12px;">
                ${renderSafeMarkdownHtml(editorContent)}
              </div>
            ` : ""}
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
                <div style="min-width:0;flex:1;">
                  <div class="sprk-hand" style="font-size:21px;font-weight:700;margin-bottom:4px;">${escapeHtml(n.title)}</div>
                  <div class="sprk-md-body">${renderSafeMarkdownHtml(n.content)}</div>
                  <div class="sprk-meta" style="margin-top:6px;">${escapeHtml((n.updatedAt || "").slice(0, 10))}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="sprk-btn" data-edit-note="${escapeHtml(n.id)}" style="min-height:32px;padding:4px 10px;">${seriousMode ? "Edit" : "✎"}</button>
                  <button type="button" class="sprk-btn" data-del-note="${escapeHtml(n.id)}" aria-label="Delete ${escapeHtml(n.title)}" style="min-height:32px;padding:4px 10px;">×</button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      `;

      container.querySelectorAll("[data-dtab]").forEach((btn) => {
        btn.addEventListener("click", () => {
          syncDraftFromDom();
          tab = btn.dataset.dtab;
          previewMd = false;
          if (tab === "diary" || tab === "notes") {
            activeFolder = tab;
            editingId = null;
            draftTitle = "";
            draftContent = "";
          } else if (tab === "write" && !editingId && !draftTitle && !draftContent) {
            draftTitle = "";
            draftContent = "";
          }
          renderView();
        });
      });

      container.querySelectorAll("[data-target-folder]").forEach((btn) => {
        btn.addEventListener("click", () => {
          syncDraftFromDom();
          activeFolder = btn.dataset.targetFolder;
          renderView();
        });
      });

      container.querySelector("#diary-title")?.addEventListener("input", (e) => {
        draftTitle = e.target.value;
      });
      container.querySelector("#diary-body")?.addEventListener("input", (e) => {
        draftContent = e.target.value;
      });

      container.querySelector("#diary-export-all")?.addEventListener("click", () => {
        const md = notes
          .map((n) => `# ${n.title}\n_Updated: ${(n.updatedAt || "").slice(0, 10)}_\n\n${n.content}\n`)
          .join("\n---\n\n");
        downloadTextFile(`sprk-${activeFolder}.md`, md);
      });

      container.querySelector("#diary-toggle-preview")?.addEventListener("click", () => {
        syncDraftFromDom();
        previewMd = !previewMd;
        renderView();
      });

      container.querySelector("#diary-search")?.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderView();
      });

      container.querySelector("#diary-cancel-edit")?.addEventListener("click", () => {
        editingId = null;
        draftTitle = "";
        draftContent = "";
        previewMd = false;
        tab = activeFolder;
        renderView();
      });

      container.querySelector("#diary-editor")?.addEventListener("submit", (e) => {
        e.preventDefault();
        syncDraftFromDom();
        const title = draftTitle.trim();
        const content = draftContent.trim();
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
        draftTitle = "";
        draftContent = "";
        previewMd = false;
        tab = activeFolder;
        renderView();
      });

      container.querySelectorAll("[data-edit-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          editingId = btn.dataset.editNote;
          const note = (state.localDiary || []).find((n) => n.id === editingId);
          draftTitle = note?.title || "";
          draftContent = note?.content || "";
          previewMd = false;
          tab = "write";
          renderView();
        });
      });

      container.querySelectorAll("[data-del-note]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.delNote;
          persistLocalCollection("localDiary", state.localDiary.filter((n) => n.id !== id));
          syncNoteDelete(id);
          if (editingId === id) {
            editingId = null;
            draftTitle = "";
            draftContent = "";
          }
          renderView();
        });
      });
    };

    renderView();
  }
};
