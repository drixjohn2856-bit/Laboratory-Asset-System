async function getCurrentUser() {
  if (!supabaseClient) return null;
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();
  if (error) {
    console.error(error);
    return null;
  }
  return user;
}

async function getCurrentProfile() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    window.location.href = "../login.html";
    return null;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(error);
    window.location.href = "../login.html";
    return null;
  }

  return data;
}

async function signOut() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  window.location.href = "../login.html";
}
