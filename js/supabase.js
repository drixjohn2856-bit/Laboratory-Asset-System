// Configure your Supabase project here when connecting a backend.
const SUPABASE_URL = "https://iosyaddgiwmtbedworis.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_BwYJWfE1wN7JTF-XBJLE1A_iUPuy7b6";

const isSupabaseConfigured = ![SUPABASE_URL, SUPABASE_ANON_KEY].some((value) =>
  value.startsWith("YOUR_"),
);

const supabaseClient =
  isSupabaseConfigured && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
