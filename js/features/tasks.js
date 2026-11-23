// Pinboard -> Sticky-Note Tasks, Deadlines, and Study Goals
import { state, persistLocalCollection } from "../state.js";
import { escapeHtml, generateId, todayIsoDate } from "../utils/dom.js";

export const tasksFeature = {
  skin: "tasks",
  eyebrow: "CORK PINBOARD · TASKS & GOALS",
  title: "Tasks, Deadlines & Goals",
  icon: "📌",
  render(container, { rerender }) {
    const tasks = state.localTasks || [];
    const goals = state.localGoals || [];
    const today = todayIsoDate();
    const todayFocusMins = Math.round(
      (state.localStudyRecords || [])
        .filter((r) => r.date === today && (r.mode || "focus") === "focus")
        .reduce((a, b) => a + (b.durationSeconds || 0), 0) / 60
    );

    container.innerHTML = `
      <form id="task-add-form" class="sprk-card" style="margin-bottom:14px;">
        <div class="sprk-grid-2">
          <label class="sprk-field">
            <span class="sprk-label">Sticky Note Task</span>
            <input id="task-title" class="sprk-input" type="text" required maxlength="100" placeholder="Finish problem set 4..." />
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Subject</span>
            <input id="task-subject" class="sprk-input" type="text" maxlength="40" value="General" />
          </label>
        </div>
        <div class="sprk-grid-3">
          <label class="sprk-field">
            <span class="sprk-label">Priority</span>
            <select id="task-priority" class="sprk-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Due Date</span>
            <input id="task-due" class="sprk-input" type="date" />
          </label>
          <label class="sprk-field">
            <span class="sprk-label">Note Paper</span>
            <select id="task-color" class="sprk-select">
              <option value="butter">Butter Yellow</option>
              <option value="mint">Sage Mint</option>
              <option value="peach">Warm Peach</option>
              <option value="sky">Powder Blue</option>
            </select>
          </label>
        </div>
        <button type="submit" class="sprk-btn sprk-btn-primary">Pin Note to Board</button>
      </form>

      <div class="sprk-grid-2" style="margin-bottom:16px;">
        ${tasks.length === 0 ? `<div class="sprk-empty" style="grid-column:1/-1;background:rgba(255,255,255,0.75);border-radius:10px;">Your pinboard is clear!</div>` : tasks.map((t) => `
          <div class="sprk-sticky-note" data-color="${escapeHtml(t.noteColor || "butter")}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
                <input type="checkbox" data-toggle-task="${escapeHtml(t.id)}" ${t.completed ? "checked" : ""} style="margin-top:4px;width:18px;height:18px;" />
                <span class="sprk-hand" style="${t.completed ? "text-decoration:line-through;opacity:0.6;" : ""}">${escapeHtml(t.title)}</span>
              </label>
              <button type="button" class="sprk-btn" data-delete-task="${escapeHtml(t.id)}" aria-label="Delete task ${escapeHtml(t.title)}" style="min-height:30px;padding:2px 8px;">×</button>
            </div>
            <div class="sprk-meta" style="margin-top:8px;">
              <span>${escapeHtml(t.subject || "General")}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(t.priority || "medium")}</span>
              ${t.dueDate ? `<span aria-hidden="true">·</span><span>Due ${escapeHtml(t.dueDate)}</span>` : ""}
            </div>
          </div>
        `).join("")}
      </div>

      <div class="sprk-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <h3 style="margin:0;font-size:14px;">Study Goals</h3>
        </div>
        ${goals.map((g) => {
          const pct = Math.min(100, Math.round((todayFocusMins / Math.max(1, g.targetMinutes)) * 100));
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;">
                <strong>${escapeHtml(g.title)}</strong>
                <span class="tabular-nums">${todayFocusMins} / ${g.targetMinutes}m</span>
              </div>
              <div style="height:8px;border-radius:99px;background:rgba(52,44,37,0.12);overflow:hidden;margin-top:4px;">
                <div style="height:100%;width:${pct}%;background:var(--accent);"></div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.querySelector("#task-add-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = container.querySelector("#task-title").value.trim();
      if (!title) return;
      const newTask = {
        id: generateId("task"),
        title,
        subject: container.querySelector("#task-subject").value.trim() || "General",
        priority: container.querySelector("#task-priority").value,
        dueDate: container.querySelector("#task-due").value || "",
        noteColor: container.querySelector("#task-color").value,
        completed: false
      };
      persistLocalCollection("localTasks", [newTask, ...state.localTasks]);
      rerender();
    });

    container.querySelectorAll("[data-toggle-task]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const id = cb.dataset.toggleTask;
        persistLocalCollection(
          "localTasks",
          state.localTasks.map((t) => (t.id === id ? { ...t, completed: cb.checked } : t))
        );
        rerender();
      });
    });

    container.querySelectorAll("[data-delete-task]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.deleteTask;
        persistLocalCollection("localTasks", state.localTasks.filter((t) => t.id !== id));
        rerender();
      });
    });
  }
};
