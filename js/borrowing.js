async function approveRequest(requestId) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "administrator")
    return showMessage("Only an administrator may approve requests.");

  const { data: request, error } = await supabaseClient
    .from("borrowing_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (error) return showMessage(error.message);
  if (request.requester_id === profile.id)
    return showMessage("You cannot approve your own request.");

  const { error: updateError } = await supabaseClient
    .from("borrowing_requests")
    .update({
      status: "Approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "Pending");
  if (updateError) return showMessage(updateError.message);
  await createAuditLog(
    "APPROVED",
    "Borrowing",
    requestId,
    "Approved borrowing request",
  );
  window.location.reload();
}

async function rejectRequest(requestId) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "administrator")
    return showMessage("Only an administrator may reject requests.");
  const { error } = await supabaseClient
    .from("borrowing_requests")
    .update({ status: "Rejected" })
    .eq("id", requestId)
    .eq("status", "Pending");
  if (error) return showMessage(error.message);
  await createAuditLog(
    "REJECTED",
    "Borrowing",
    requestId,
    "Rejected borrowing request",
  );
  window.location.reload();
}

function showMessage(message) {
  window.alert(message);
}

async function loadAvailableEquipment() {
  const profile = await requirePageRole(["requester"]);
  if (!profile) return;
  renderPageShell(
    profile,
    "Request equipment",
    `<div class="request-intro"><div><p class="eyebrow">Equipment request</p><h2>Reserve what your work needs.</h2><p class="dashboard-intro">Choose an available asset, explain the purpose, and set an expected return date.</p></div><span class="request-status"><i></i> Requester access</span></div><form id="request-form" class="panel stack-form"><h3>New borrowing request</h3><label>Equipment<select id="equipment" required><option value="">Loading available equipment...</option></select></label><label>Purpose<textarea id="purpose" rows="4" required></textarea></label><label>Expected return date<input id="return-date" type="date" required /></label><button class="button button-primary" type="submit">Submit request</button><p id="request-message" class="form-hint" role="status"></p></form>`,
  );
  const { data, error } = await supabaseClient
    .from("equipment")
    .select("*")
    .eq("status", "Available")
    .order("asset_code");
  const select = document.querySelector("#equipment");
  if (error) return setPageMessage("#request-message", error.message, true);
  select.innerHTML = data.length
    ? data
        .map(
          (item) =>
            `<option value="${item.id}">${escapeHtml(item.asset_code)} - ${escapeHtml(item.equipment_name)}</option>`,
        )
        .join("")
    : '<option value="">No available equipment</option>';
  document
    .querySelector("#request-form")
    ?.addEventListener("submit", submitRequest);
}

async function submitRequest(event) {
  event.preventDefault();
  const profile = await getCurrentProfile();
  if (!profile) return;
  const equipmentId = document.querySelector("#equipment").value;
  const purpose = document.querySelector("#purpose").value.trim();
  const returnDate = document.querySelector("#return-date").value;
  const { data: equipment, error: equipmentError } = await supabaseClient
    .from("equipment")
    .select("status")
    .eq("id", equipmentId)
    .single();
  if (equipmentError)
    return setPageMessage("#request-message", equipmentError.message, true);
  if (equipment.status !== "Available")
    return setPageMessage(
      "#request-message",
      "Only available equipment may be requested.",
      true,
    );
  const { data, error } = await supabaseClient
    .from("borrowing_requests")
    .insert({
      equipment_id: equipmentId,
      requester_id: profile.id,
      purpose,
      expected_return_date: returnDate,
      status: "Pending",
    })
    .select()
    .single();
  if (error) return setPageMessage("#request-message", error.message, true);
  await createAuditLog(
    "REQUESTED",
    "Borrowing",
    data.id,
    "Submitted borrowing request",
  );
  setPageMessage("#request-message", "Request submitted as Pending.");
  event.currentTarget.reset();
}

async function loadBorrowingPage(mode) {
  const allowedRoles =
    mode === "admin"
      ? ["administrator"]
      : ["administrator", "laboratory_staff"];
  const profile = await requirePageRole(allowedRoles);
  if (!profile) return;
  let query = supabaseClient
    .from("borrowing_requests")
    .select(
      "*, equipment(asset_code, equipment_name), profiles:requester_id(full_name, email)",
    )
    .order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error)
    return renderPageShell(
      profile,
      "Borrowing",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
  const rows = data.length
    ? data
        .map(
          (request) =>
            `<tr><td>#${request.id}</td><td>${escapeHtml(request.equipment?.asset_code || "-")}</td><td>${escapeHtml(request.profiles?.full_name || request.profiles?.email || "-")}</td><td>${statusBadge(request.status)}</td><td>${formatDate(request.expected_return_date)}</td><td>${borrowingActions(request, profile.role)}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6">No borrowing requests found.</td></tr>';
  renderPageShell(
    profile,
    mode === "admin" ? "Borrowing requests" : "Borrowing desk",
    `<p class="dashboard-intro">Review and progress equipment transactions.</p><div class="panel table-wrap"><table><thead><tr><th>ID</th><th>Asset</th><th>Requester</th><th>Status</th><th>Return date</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
  document
    .querySelectorAll('[data-action="approve"]')
    .forEach((button) =>
      button.addEventListener("click", () => approveRequest(button.dataset.id)),
    );
  document
    .querySelectorAll('[data-action="reject"]')
    .forEach((button) =>
      button.addEventListener("click", () => rejectRequest(button.dataset.id)),
    );
  document
    .querySelectorAll('[data-action="release"]')
    .forEach((button) =>
      button.addEventListener("click", () =>
        releaseEquipment(button.dataset.id),
      ),
    );
  document
    .querySelectorAll('[data-action="return"]')
    .forEach((button) =>
      button.addEventListener("click", () =>
        returnEquipment(button.dataset.id, false),
      ),
    );
  document
    .querySelectorAll('[data-action="damage"]')
    .forEach((button) =>
      button.addEventListener("click", () =>
        returnEquipment(button.dataset.id, true),
      ),
    );
}

function borrowingActions(request, role) {
  const actions = [];
  if (role === "administrator" && request.status === "Pending")
    actions.push(
      `<button class="button button-primary" data-action="approve" data-id="${request.id}">Approve</button>`,
      `<button class="button button-danger" data-action="reject" data-id="${request.id}">Reject</button>`,
    );
  if (
    (role === "administrator" || role === "laboratory_staff") &&
    request.status === "Approved"
  )
    actions.push(
      `<button class="button button-primary" data-action="release" data-id="${request.id}">Release</button>`,
    );
  if (
    (role === "administrator" || role === "laboratory_staff") &&
    request.status === "Released"
  )
    actions.push(
      `<button class="button button-primary" data-action="return" data-id="${request.id}">Return</button>`,
      `<button class="button button-danger" data-action="damage" data-id="${request.id}">Damaged</button>`,
    );
  return actions.join(" ") || "-";
}

async function releaseEquipment(requestId) {
  const profile = await getCurrentProfile();
  if (!profile || !["administrator", "laboratory_staff"].includes(profile.role))
    return showMessage("Access denied.");
  const { data: request, error } = await supabaseClient
    .from("borrowing_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (error) return showMessage(error.message);
  if (request.status !== "Approved")
    return showMessage("Only Approved requests may be released.");
  const timestamp = new Date().toISOString();
  const { error: requestError } = await supabaseClient
    .from("borrowing_requests")
    .update({ status: "Released", released_at: timestamp })
    .eq("id", requestId)
    .eq("status", "Approved");
  if (requestError) return showMessage(requestError.message);
  const { error: equipmentError } = await supabaseClient
    .from("equipment")
    .update({ status: "Borrowed" })
    .eq("id", request.equipment_id);
  if (equipmentError) return showMessage(equipmentError.message);
  await createAuditLog(
    "RELEASED",
    "Borrowing",
    requestId,
    "Equipment released to requester",
  );
  window.location.reload();
}

async function returnEquipment(requestId, damaged = false) {
  const profile = await getCurrentProfile();
  if (!profile || !["administrator", "laboratory_staff"].includes(profile.role))
    return showMessage("Access denied.");
  const { data: request, error } = await supabaseClient
    .from("borrowing_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (error) return showMessage(error.message);
  if (request.status !== "Released")
    return showMessage("Only released equipment can be returned.");
  const timestamp = new Date().toISOString();
  const { error: requestError } = await supabaseClient
    .from("borrowing_requests")
    .update({ status: "Returned", returned_at: timestamp })
    .eq("id", requestId)
    .eq("status", "Released");
  if (requestError) return showMessage(requestError.message);
  const { error: equipmentError } = await supabaseClient
    .from("equipment")
    .update({ status: damaged ? "Damaged" : "Available" })
    .eq("id", request.equipment_id);
  if (equipmentError) return showMessage(equipmentError.message);
  await createAuditLog(
    "RETURNED",
    "Borrowing",
    requestId,
    damaged ? "Equipment returned damaged" : "Equipment returned",
  );
  window.location.reload();
}
