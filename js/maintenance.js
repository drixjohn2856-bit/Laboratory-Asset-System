async function loadMaintenancePage() {
  const profile = await requirePageRole([
    "administrator",
    "laboratory_staff",
  ]);
  if (!profile) return;
  const { data: records, error } = await supabaseClient
    .from("maintenance_requests")
    .select(
      "*, equipment(asset_code, equipment_name), profiles:requested_by(full_name, email)",
    )
    .order("created_at", { ascending: false });
  if (error)
    return renderPageShell(
      profile,
      "Maintenance",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
  const canManage = ["administrator", "laboratory_staff"].includes(
    profile.role,
  );
  const visible =
    profile.role === "requester"
      ? records.filter((item) => item.requested_by === profile.id)
      : records;
  const rows = visible.length
    ? visible
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.equipment?.asset_code || "-")}</td><td>${escapeHtml(item.profiles?.full_name || item.profiles?.email || "-")}</td><td>${escapeHtml(item.problem_description)}</td><td>${statusBadge(item.maintenance_status)}</td><td>${escapeHtml(item.priority)}</td><td>${canManage && item.maintenance_status !== "Completed" ? `<button class="button button-primary complete-maintenance" data-id="${item.id}">Complete</button>` : "-"}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6">No maintenance requests found.</td></tr>';
  renderPageShell(
    profile,
    "Maintenance",
    `<div class="panel table-wrap"><table><thead><tr><th>Asset</th><th>Requested by</th><th>Problem</th><th>Status</th><th>Priority</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
  document
    .querySelectorAll(".complete-maintenance")
    .forEach((button) =>
      button.addEventListener("click", () =>
        completeMaintenance(button.dataset.id),
      ),
    );
}

async function completeMaintenance(id) {
  const { data: maintenanceRequest, error: requestError } =
    await supabaseClient
      .from("maintenance_requests")
      .select("equipment_id, maintenance_status")
      .eq("id", id)
      .single();
  if (requestError) return window.alert(requestError.message);
  if (maintenanceRequest.maintenance_status === "Completed")
    return window.alert("This maintenance request is already completed.");
  const { error } = await supabaseClient
    .from("maintenance_requests")
    .update({
      maintenance_status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return window.alert(error.message);
  const { error: equipmentError } = await supabaseClient
    .from("equipment")
    .update({ status: "Available" })
    .eq("id", maintenanceRequest.equipment_id);
  if (equipmentError) return window.alert(equipmentError.message);
  await createAuditLog(
    "COMPLETED",
    "Maintenance",
    id,
    "Completed maintenance request",
  );
  loadMaintenancePage();
}

if (document.querySelector("[data-maintenance-page]")) loadMaintenancePage();
