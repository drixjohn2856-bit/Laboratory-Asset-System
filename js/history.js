async function loadHistoryPage() {
  const profile = await requirePageRole(["requester"]);
  if (!profile) return;
  const { data, error } = await supabaseClient
    .from("borrowing_requests")
    .select("*, equipment(asset_code, equipment_name)")
    .eq("requester_id", profile.id)
    .order("created_at", { ascending: false });
  if (error)
    return renderPageShell(
      profile,
      "Request history",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
  const rows = data.length
    ? data
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.equipment?.asset_code || "-")}</td><td>${escapeHtml(item.equipment?.equipment_name || "-")}</td><td>${statusBadge(item.status)}</td><td>${formatDate(item.expected_return_date)}</td><td>${escapeHtml(item.purpose)}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="5">No requests yet.</td></tr>';
  renderPageShell(
    profile,
    "Request history",
    `<div class="panel table-wrap"><table><thead><tr><th>Asset</th><th>Equipment</th><th>Status</th><th>Return date</th><th>Purpose</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
}

if (document.querySelector("[data-history-page]")) loadHistoryPage();
