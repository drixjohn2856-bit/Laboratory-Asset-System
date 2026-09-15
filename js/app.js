const roleNames = {
  administrator: "Administrator",
  laboratory_staff: "Laboratory staff",
  requester: "Requester",
};

const roleNavigation = {
  administrator: [
    ["dashboard.html", "Dashboard"],
    ["users.html", "Users"],
    ["equipment.html", "Equipment"],
    ["borrowing.html", "Borrowing"],
    ["maintenance.html", "Maintenance"],
    ["reports.html", "Reports"],
    ["audit-logs.html", "Audit logs"],
  ],
  laboratory_staff: [
    ["dashboard.html", "Dashboard"],
    ["equipment.html", "Equipment"],
    ["borrowing.html", "Borrowing"],
    ["returns.html", "Returns"],
    ["maintenance.html", "Maintenance"],
  ],
  requester: [
    ["dashboard.html", "Dashboard"],
    ["equipment.html", "Available equipment"],
    ["request.html", "Request equipment"],
    ["history.html", "My requests"],
  ],
};

async function requirePageRole(allowedRoles = []) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (allowedRoles.length && !allowedRoles.includes(profile.role)) {
    window.location.href = "../dashboard.html";
    return null;
  }
  return profile;
}

function renderPageShell(profile, title, content) {
  const currentPage =
    window.location.pathname.split("/").pop() || "dashboard.html";
  const links = (roleNavigation[profile.role] || [])
    .map(
      ([href, label]) =>
        `<a href="${href}" class="${href === currentPage ? "active" : ""}">${label}</a>`,
    )
    .join("");
  document.body.innerHTML = `<div class="app-shell"><aside class="sidebar"><p class="brand">Lab Asset System</p><span class="nav-label">Workspace</span><nav class="nav">${links}</nav></aside><main class="main-content"><header class="topbar"><h1>${title}</h1><span class="user-menu">${escapeHtml(profile.full_name || profile.email || "User")} · <a href="#" id="sign-out">Sign out</a></span></header><section class="content">${content}</section></main></div>`;
  document
    .querySelector("#sign-out")
    ?.addEventListener("click", async (event) => {
      event.preventDefault();
      await signOut();
    });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}

function setPageMessage(selector, message, isError = false) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = message;
    element.classList.toggle("error-message", isError);
  }
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function statusBadge(status) {
  return `<span class="badge">${escapeHtml(status)}</span>`;
}

async function createAuditLog(action, module, recordId, description) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !supabaseClient) return;
  const { error } = await supabaseClient.from("audit_logs").insert({
    user_id: currentUser.id,
    action,
    module,
    record_id: recordId,
    description,
  });
  if (error) console.error("Audit log error:", error);
}
