async function loadEquipmentPage() {
  const profile = await requirePageRole([
    "administrator",
    "laboratory_staff",
    "requester",
  ]);
  if (!profile) return;
  const isAdmin = profile.role === "administrator";
  const { data, error } = await supabaseClient
    .from("equipment")
    .select("*")
    .order("asset_code");
  if (error) {
    renderPageShell(
      profile,
      "Equipment",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
    return;
  }
  const records = isAdmin
    ? data
    : data.filter((item) => item.status === "Available");
  const form = isAdmin
    ? `<form id="equipment-form" class="panel stack-form"><h3>Add equipment</h3><label>Asset code<input name="asset_code" required></label><label>Name<input name="equipment_name" required></label><label>Category<input name="category"></label><label>Description<textarea name="description" rows="3"></textarea></label><button class="button button-primary">Add equipment</button><p id="equipment-message" class="form-hint" role="status"></p></form>`
    : "";
  const rows = records.length
    ? records
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.asset_code)}</td><td>${escapeHtml(item.equipment_name)}</td><td>${escapeHtml(item.category || "-")}</td><td>${statusBadge(item.status)}</td>${isAdmin ? `<td><button class="button button-danger delete-equipment" data-id="${item.id}" type="button">Delete</button></td>` : ""}</tr>`,
        )
        .join("")
    : `<tr><td colspan="${isAdmin ? 5 : 4}">No equipment records found.</td></tr>`;
  renderPageShell(
    profile,
    isAdmin ? "Equipment register" : "Available equipment",
    `${isAdmin ? '<p class="dashboard-intro">Manage the laboratory inventory.</p>' : '<p class="dashboard-intro">Only equipment currently available for borrowing is shown.</p>'}${form}<div class="panel table-wrap"><table><thead><tr><th>Asset code</th><th>Name</th><th>Category</th><th>Status</th>${isAdmin ? "<th>Action</th>" : ""}</tr></thead><tbody>${rows}</tbody></table></div>`,
  );
  document
    .querySelector("#equipment-form")
    ?.addEventListener("submit", addEquipment);
  document
    .querySelectorAll(".delete-equipment")
    .forEach((button) =>
      button.addEventListener("click", () =>
        deleteEquipment(button.dataset.id),
      ),
    );
}

async function addEquipment(event) {
  event.preventDefault();
  const payload = Object.fromEntries(
    new FormData(event.currentTarget).entries(),
  );
  const { error } = await supabaseClient.from("equipment").insert(payload);
  if (error) return setPageMessage("#equipment-message", error.message, true);
  await createAuditLog(
    "CREATED",
    "Equipment",
    null,
    `Created asset ${payload.asset_code}`,
  );
  loadEquipmentPage();
}

async function deleteEquipment(id) {
  if (!window.confirm("Delete this equipment record?")) return;
  const { error } = await supabaseClient
    .from("equipment")
    .delete()
    .eq("id", id);
  if (error) return window.alert(error.message);
  await createAuditLog("DELETED", "Equipment", id, "Deleted equipment record");
  loadEquipmentPage();
}

if (document.querySelector("[data-equipment-page]")) loadEquipmentPage();
