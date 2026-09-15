async function loadMaintenancePage() {
  const profile = await requirePageRole([
    "administrator",
    "laboratory_staff",
    "requester",
  ]);
  if (!profile) return;
  const { data: equipment } = await supabaseClient
    .from("equipment")
    .select("id, asset_code, equipment_name")
    .order("asset_code");
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
  const form = canManage
    ? `<form id="maintenance-form" class="panel stack-form"><h3>Report an issue</h3><label>Equipment<select name="equipment_id" required>${equipment.map((item) => `<option value="${item.id}">${escapeHtml(item.asset_code)} - ${escapeHtml(item.equipment_name)}</option>`).join("")}</select></label><label>Priority<select name="priority"><option>Normal</option><option>Low</option><option>High</option><option>Urgent</option></select></label><label>Problem description<textarea name="problem_description" rows="3" required></textarea></label><button class="button button-primary">Create request</button><p id="maintenance-message" class="form-hint" role="status"></p></form>`
    : "";
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
    `${form}<div class="panel table-wrap"><table><thead><tr><th>Asset</th><th>Requested by</th><th>Problem</th><th>Status</th><th>Priority</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
  document
    .querySelector("#maintenance-form")
    ?.addEventListener("submit", createMaintenanceRequest);
  document
    .querySelectorAll(".complete-maintenance")
    .forEach((button) =>
      button.addEventListener("click", () =>
        completeMaintenance(button.dataset.id),
      ),
    );
}

async function createMaintenanceRequest(event) {
  event.preventDefault();
  const profile = await getCurrentProfile();
  const payload = Object.fromEntries(
    new FormData(event.currentTarget).entries(),
  );
  payload.requested_by = profile.id;
  const { data, error } = await supabaseClient
    .from("maintenance_requests")
    .insert(payload)
    .select()
    .single();
  if (error) return setPageMessage("#maintenance-message", error.message, true);
  await createAuditLog(
    "CREATED",
    "Maintenance",
    data.id,
    "Created maintenance request",
  );
  loadMaintenancePage();
}

async function completeMaintenance(id) {
  const { error } = await supabaseClient
    .from("maintenance_requests")
    .update({
      maintenance_status: "Completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return window.alert(error.message);
  await createAuditLog(
    "COMPLETED",
    "Maintenance",
    id,
    "Completed maintenance request",
  );
  loadMaintenancePage();
}

if (document.querySelector("[data-maintenance-page]")) loadMaintenancePage();
