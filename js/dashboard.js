async function renderDashboard() {
  const profile = await getCurrentProfile();
  if (!profile) return;

  const role = profile.role;
  const roleLabel =
    {
      administrator: "Administrator",
      laboratory_staff: "Lab staff",
      requester: "Requester",
    }[role] || role;
  const navigation =
    {
      administrator: [
        ["dashboard.html", "Overview"],
        ["users.html", "Users"],
        ["equipment.html", "Equipment"],
        ["borrowing.html", "Borrowing"],
        ["maintenance.html", "Maintenance"],
        ["reports.html", "Reports"],
        ["audit-logs.html", "Audit logs"],
      ],
      laboratory_staff: [
        ["dashboard.html", "Overview"],
        ["equipment.html", "Equipment"],
        ["borrowing.html", "Borrowing"],
        ["returns.html", "Returns"],
        ["maintenance.html", "Maintenance"],
      ],
      requester: [
        ["dashboard.html", "Overview"],
        ["equipment.html", "Available equipment"],
        ["request.html", "New request"],
        ["history.html", "History"],
      ],
    }[role] || [];
  const roleFolder = {
    administrator: "admin",
    laboratory_staff: "staff",
    requester: "requester",
  }[role];
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const currentFolder = pathParts[pathParts.length - 2];
  const isRootDashboard = !["admin", "staff", "requester"].includes(
    currentFolder,
  );
  const links = navigation
    .map(([href, label]) => {
      const target = isRootDashboard ? `${roleFolder}/${href}` : href;
      return `<a href="${target}" class="${href === "dashboard.html" ? "active" : ""}">${label}</a>`;
    })
    .join("");

  const [equipmentResult, borrowingResult, maintenanceResult] =
    await Promise.all([
      supabaseClient.from("equipment").select("status"),
      supabaseClient.from("borrowing_requests").select("status"),
      supabaseClient.from("maintenance_requests").select("maintenance_status"),
    ]);
  const availableAssets =
    equipmentResult.data?.filter((item) => item.status === "Available")
      .length || 0;
  const activeLoans =
    borrowingResult.data?.filter((item) => item.status === "Released").length ||
    0;
  const overdueLoans =
    borrowingResult.data?.filter((item) => item.status === "Overdue").length ||
    0;
  const openIssues =
    maintenanceResult.data?.filter(
      (item) => !["Completed", "Cancelled"].includes(item.maintenance_status),
    ).length || 0;

  document.querySelector("#app-shell").innerHTML =
    `<aside class="sidebar"><p class="brand">Lab Asset System</p><span class="nav-label">Workspace</span><nav class="nav">${links}</nav></aside><main class="main-content"><header class="topbar"><h1>${roleLabel} dashboard</h1><span class="user-menu">${profile.full_name || profile.email} · <a href="#" id="sign-out">Sign out</a></span></header><section class="content"><div class="page-heading"><div><p class="eyebrow">Today at the lab</p><h2>Good morning</h2><p class="dashboard-intro">Here is the current state of your laboratory assets.</p></div></div><div class="stat-grid"><article class="stat-card metric-accent"><span class="muted">Available assets</span><strong>${availableAssets}</strong></article><article class="stat-card metric-accent"><span class="muted">Active loans</span><strong>${activeLoans}</strong></article><article class="stat-card metric-accent warning"><span class="muted">Overdue loans</span><strong>${overdueLoans}</strong></article><article class="stat-card metric-accent danger"><span class="muted">Open issues</span><strong>${openIssues}</strong></article></div></section></main>`;
  document.querySelector("#sign-out")?.addEventListener("click", (event) => {
    event.preventDefault();
    signOut();
  });
}

renderDashboard();
