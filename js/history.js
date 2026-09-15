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
            `<tr><td>${escapeHtml(item.equipment?.asset_code || "-")}</td><td>${escapeHtml(item.equipment?.equipment_name || "-")}</td><td>${statusBadge(item.status)}</td><td>${formatDate(item.expected_return_date)}</td><td>${escapeHtml(item.purpose)}</td><td>${item.status === "Released" ? `<button class="button button-danger report-damage" data-id="${item.id}">Report damage</button>` : "-"}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="6">No requests yet.</td></tr>';
  renderPageShell(
    profile,
    "Request history",
    `<div class="panel table-wrap"><table><thead><tr><th>Asset</th><th>Equipment</th><th>Status</th><th>Return date</th><th>Purpose</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
  document.querySelectorAll(".report-damage").forEach((button) =>
    button.addEventListener("click", () => reportDamage(button.dataset.id)),
  );
}

async function reportDamage(requestId) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const description = window.prompt("Describe the damage for staff:");
  if (!description?.trim()) return;
  const { data: request, error: requestError } = await supabaseClient
    .from("borrowing_requests")
    .select("equipment_id, status")
    .eq("id", requestId)
    .eq("requester_id", profile.id)
    .single();
  if (requestError) return window.alert(requestError.message);
  if (request.status !== "Released")
    return window.alert("Damage can only be reported for borrowed equipment.");
  const damagePrefix = `Damage reported from borrowing request #${requestId}:`;
  const { data: existingReport, error: reportLookupError } =
    await supabaseClient
      .from("maintenance_requests")
      .select("id")
      .eq("equipment_id", request.equipment_id)
      .eq("requested_by", profile.id)
      .ilike("problem_description", `${damagePrefix}%`)
      .maybeSingle();
  if (reportLookupError) return window.alert(reportLookupError.message);
  if (existingReport)
    return window.alert("Damage has already been reported for this request.");
  const { data, error } = await supabaseClient
    .from("maintenance_requests")
    .insert({
      equipment_id: request.equipment_id,
      requested_by: profile.id,
      problem_description: `${damagePrefix} ${description.trim()}`,
      priority: "High",
    })
    .select()
    .single();
  if (error) return window.alert(error.message);
  await createAuditLog(
    "CREATED",
    "Maintenance",
    data.id,
    `Damage reported from borrowing request #${requestId}`,
  );
  window.alert("Damage reported to staff.");
}

if (document.querySelector("[data-history-page]")) loadHistoryPage();
