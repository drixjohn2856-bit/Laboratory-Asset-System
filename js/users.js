async function loadUsersPage() {
  const profile = await requirePageRole(["administrator"]);
  if (!profile) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    renderPageShell(
      profile,
      "Users",
      `<p class="error-message">${escapeHtml(error.message)}</p>`,
    );
    return;
  }

  const rows = data.length
    ? data
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item.email || "-")}</td><td>${statusBadge(item.role)}</td><td>${new Date(item.created_at).toLocaleDateString()}</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="4">No users found.</td></tr>';

  renderPageShell(
    profile,
    "User directory",
    `<p class="dashboard-intro">User accounts are created through Supabase Authentication. Manage roles through the database.</p><div class="panel table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  );
}

if (document.querySelector("[data-users-page]")) loadUsersPage();
