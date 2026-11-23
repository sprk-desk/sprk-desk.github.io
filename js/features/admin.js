// Trusted Platform Operations (strictly gated by verified backend admin role)
import { state } from "../state.js";
import { supabase } from "../services/supabase.js";
import { escapeHtml } from "../utils/dom.js";

export const adminFeature = {
  skin: "ops",
  eyebrow: "TRUSTED OPERATIONS · ADMIN ONLY",
  title: "Platform Operations",
  icon: "⚙",
  render(container) {
    if (!supabase.configured || state.user?.role !== "admin") {
      container.innerHTML = `
        <div class="sprk-notice">
          Access denied. Administrator operations require a verified backend <code>admin</code> role.
        </div>
      `;
      return;
    }

    let statusMsg = "";

    const renderView = async () => {
      const [reportsRes, logsRes] = await Promise.all([
        supabase.select("content_reports", "order=created_at.desc&limit=15"),
        supabase.select("admin_audit_logs", "order=created_at.desc&limit=15")
      ]);
      const reports = reportsRes.data || [];
      const logs = logsRes.data || [];

      container.innerHTML = `
        ${statusMsg ? `<div class="sprk-notice" style="margin-bottom:12px;">${escapeHtml(statusMsg)}</div>` : ""}

        <form id="admin-grant-form" class="sprk-card" style="margin-bottom:14px;">
          <h2 style="margin:0 0 8px;font-size:14px;">Grant Premium Entitlement (Audited)</h2>
          <div class="sprk-grid-2">
            <label class="sprk-field">
              <span class="sprk-label">Target User UUID</span>
              <input id="adm-uid" class="sprk-input" type="text" required />
            </label>
            <label class="sprk-field">
              <span class="sprk-label">Audit Reason</span>
              <input id="adm-reason" class="sprk-input" type="text" required placeholder="Testing / Support grant" />
            </label>
          </div>
          <button type="submit" class="sprk-btn sprk-btn-primary">Grant Premium</button>
        </form>

        <div class="sprk-card" style="margin-bottom:14px;">
          <h3 style="margin:0 0 8px;font-size:14px;">Open Content Reports (${reports.length})</h3>
          ${reports.length === 0 ? `<div class="sprk-meta">No reports pending.</div>` : reports.map((r) => `
            <div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:12px;">
              <strong>${escapeHtml(r.target_type)}</strong> · ${escapeHtml(r.reason)} · <em>${escapeHtml(r.status)}</em>
            </div>
          `).join("")}
        </div>

        <div class="sprk-card">
          <h3 style="margin:0 0 8px;font-size:14px;">Recent Audit Logs (${logs.length})</h3>
          ${logs.length === 0 ? `<div class="sprk-meta">No audit entries recorded.</div>` : logs.map((l) => `
            <div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.06);font-size:12px;">
              <strong>${escapeHtml(l.action)}</strong> · ${escapeHtml(l.reason)} · <span class="tabular-nums">${escapeHtml((l.created_at || "").slice(0, 16))}</span>
            </div>
          `).join("")}
        </div>
      `;

      container.querySelector("#admin-grant-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const { error } = await supabase.rpc("admin_grant_entitlement", {
          p_target_user_id: container.querySelector("#adm-uid").value.trim(),
          p_entitlement: "premium",
          p_reason: container.querySelector("#adm-reason").value.trim()
        });
        statusMsg = error ? error.message : "Premium entitlement granted and logged.";
        renderView();
      });
    };

    renderView();
  }
};
