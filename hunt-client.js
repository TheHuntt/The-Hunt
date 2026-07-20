/* ============================================================
   THE HUNT — shared client
   Include this on every page, AFTER the Supabase library:

   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="hunt-client.js"></script>

   Fill in your two values below — find them in your Supabase
   project: Dashboard → Project Settings → API.
   ============================================================ */

const SUPABASE_URL = "https://ksgjoyisnekbjjzcewnx.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ2pveWlzbmVrYmpqemNld254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MTMxNzUsImV4cCI6MjEwMDA4OTE3NX0.Gd3UTj2Vhq0L58kibztJoGP4Ijl-k6z03yoSUP8ogVQ";

const huntClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- auth ----

async function huntGetUser() {
  const { data: { user } } = await huntClient.auth.getUser();
  return user;
}

// Sends a one-click login link to the given email. No passwords.
async function huntSignIn(email) {
  const { error } = await huntClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  return error;
}

async function huntSignOut() {
  await huntClient.auth.signOut();
}

async function huntSetDisplayName(name) {
  const user = await huntGetUser();
  if (!user) return { error: "not logged in" };
  return await huntClient.from("profiles").upsert({ id: user.id, display_name: name });
}

async function huntGetProfile() {
  const user = await huntGetUser();
  if (!user) return null;
  const { data } = await huntClient.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return data;
}

// ---- progress ----

// Returns an array of stage numbers this user has completed, e.g. [1, 2]
async function huntGetProgress() {
  const user = await huntGetUser();
  if (!user) return [];
  const { data } = await huntClient.from("progress").select("stage").eq("user_id", user.id);
  return (data || []).map(r => r.stage);
}

async function huntHasCompleted(stage) {
  const done = await huntGetProgress();
  return done.includes(stage);
}

// ---- answer checking ----
// Calls the server-side Edge Function. The real answer never
// touches the browser — only true/false comes back.
async function huntSubmitAnswer(stage, guess) {
  const { data: { session } } = await huntClient.auth.getSession();
  if (!session) return { error: "not logged in" };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/check-answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ stage, guess })
  });
  return await res.json();
}

// ---- leaderboard ----

async function huntGetLeaderboard() {
  const { data } = await huntClient.from("leaderboard").select("*").limit(100);
  return data || [];
}
