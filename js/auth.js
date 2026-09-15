const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    loginMessage.textContent =
      "Connect Supabase in js/supabase.js before signing in.";
    return;
  }

  const formData = new FormData(loginForm);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    loginMessage.textContent =
      profileError?.message || "Your user profile is not configured.";
    await supabaseClient.auth.signOut();
    return;
  }

  const dashboardByRole = {
    administrator: "admin/dashboard.html",
    laboratory_staff: "staff/dashboard.html",
    requester: "requester/dashboard.html",
  };
  window.location.href = dashboardByRole[profile.role] || "dashboard.html";
});
