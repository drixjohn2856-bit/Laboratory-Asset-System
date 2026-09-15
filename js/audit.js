async function loadAuditPage() {
  const profile = await requirePageRole(["administrator"]);
  if (!profile) return;
  const { data, error } = await supabaseClient
    .from("audit_logs")
    .select("id, user_id, action, module, record_id, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error)
    return renderPageShell(
      profile,
      "Audit logs",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
  const userIds = [
    ...new Set(data.map((item) => item.user_id).filter(Boolean)),
  ];
  const { data: users } = userIds.length
    ? await supabaseClient
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] };
  const userMap = new Map((users || []).map((user) => [user.id, user]));
  const rows = data.length
    ? data
        .map((item) => {
          const user = userMap.get(item.user_id);
          const actionClass = String(item.action || "event")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-");
          return `<tr><td><span class="audit-date">${new Date(item.created_at).toLocaleDateString()}</span><span class="audit-time">${new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></td><td><strong class="audit-user">${escapeHtml(user?.full_name || user?.email || "Unknown user")}</strong><span class="audit-id">${escapeHtml(item.user_id || "-")}</span></td><td><span class="audit-action action-${actionClass}">${escapeHtml(item.action)}</span></td><td><span class="audit-module">${escapeHtml(item.module)}</span></td><td class="audit-description">${escapeHtml(item.description || "-")}</td></tr>`;
        })
        .join("")
    : '<tr><td class="audit-empty" colspan="5"><strong>No audit events yet</strong><span>System activity will appear here as actions are completed.</span></td></tr>';
  renderPageShell(
    profile,
    "Audit logs",
    `<div class="audit-intro"><div><p class="eyebrow">Governance / activity trail</p><p class="dashboard-intro">Immutable activity history for the laboratory system.</p></div><div class="audit-count"><strong>${data.length}</strong><span>events recorded</span></div></div><div class="panel audit-panel"><div class="audit-panel-heading"><div><h3>System activity</h3><p class="muted">Most recent actions across equipment, borrowing, and maintenance.</p></div><span class="audit-live"><i></i> Live log</span></div><div class="table-wrap"><table class="audit-table"><thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></div></div>`,
  );
}

if (document.querySelector("[data-audit-page]")) loadAuditPage();
