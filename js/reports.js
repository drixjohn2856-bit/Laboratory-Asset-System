async function loadReportsPage() {
  const profile = await requirePageRole(["administrator"]);
  if (!profile) return;
  const [equipmentResult, borrowingResult, maintenanceResult] =
    await Promise.all([
      supabaseClient.from("equipment").select("status"),
      supabaseClient.from("borrowing_requests").select("status"),
      supabaseClient.from("maintenance_requests").select("maintenance_status"),
    ]);
  const error =
    equipmentResult.error || borrowingResult.error || maintenanceResult.error;
  if (error)
    return renderPageShell(
      profile,
      "Operational reports",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
  const count = (items, value) =>
    items.filter(
      (item) => item.status === value || item.maintenance_status === value,
    ).length;
  renderPageShell(
    profile,
    "Operational reports",
    `<p class="dashboard-intro">Live summary from the laboratory database.</p><div class="stat-grid"><article class="stat-card metric-accent"><span class="muted">Available equipment</span><strong>${count(equipmentResult.data, "Available")}</strong></article><article class="stat-card metric-accent warning"><span class="muted">Borrowed equipment</span><strong>${count(equipmentResult.data, "Borrowed")}</strong></article><article class="stat-card metric-accent danger"><span class="muted">Pending requests</span><strong>${count(borrowingResult.data, "Pending")}</strong></article><article class="stat-card metric-accent"><span class="muted">Open maintenance</span><strong>${maintenanceResult.data.filter((item) => item.maintenance_status !== "Completed" && item.maintenance_status !== "Cancelled").length}</strong></article></div>`,
  );
}

if (document.querySelector("[data-reports-page]")) loadReportsPage();
