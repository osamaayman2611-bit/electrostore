
/* =====================================================
   ElectroStore — Supabase Connection
   ===================================================== */

const SUPABASE_URL =
  "https://eugwwznrijawlzgtpjiz.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qx51bs9lgqeAt_eaWr6-kw_4Do4ZRhN";

if (!window.supabase) {
  console.error(
    "Supabase library not loaded. Check the script tags."
  );
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  console.log("Supabase client initialized.");
}
