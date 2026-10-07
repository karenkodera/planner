import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

const calendarScope = "https://www.googleapis.com/auth/calendar.events";

function redirectUri(): string {
  return `${supabaseUrl}/functions/v1/google-oauth`;
}

function admin() {
  return createClient(supabaseUrl, serviceKey);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("code")) {
    return handleCallback(url);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Expected POST" }, 405);
  }

  const userId = await userIdFromRequest(req);
  if (!userId) return json({ error: "Not signed in" }, 401);
  if (!clientId || !clientSecret) return json({ error: "Google OAuth is not configured" }, 500);

  const state = crypto.randomUUID().replaceAll("-", "");
  const { error } = await admin().from("google_oauth_states").insert({
    state,
    user_id: userId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) return json({ error: error.message }, 500);

  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri());
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", calendarScope);
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);
  return json({ url: auth.toString() });
});

async function handleCallback(url: URL): Promise<Response> {
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const oauthError = url.searchParams.get("error");
  if (oauthError) return appRedirect(`error=${encodeURIComponent(oauthError)}`);

  const db = admin();
  const { data: row } = await db
    .from("google_oauth_states")
    .select("user_id, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return appRedirect("error=expired");
  }
  await db.from("google_oauth_states").delete().eq("state", state);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.refresh_token) {
    return appRedirect("error=token");
  }

  const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const calendar = await calendarRes.json();
  const email = calendar.id ?? null;

  const { error } = await db.from("google_connections").upsert({
    user_id: row.user_id,
    google_email: email,
    refresh_token: token.refresh_token,
    calendar_id: "primary",
    sync_token: null,
    connected_at: new Date().toISOString(),
  });
  if (error) return appRedirect("error=save");

  return appRedirect("connected=1");
}

function appRedirect(query: string): Response {
  return Response.redirect(`ours://google-callback?${query}`, 302);
}

async function userIdFromRequest(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const { data } = await admin().auth.getUser(header.slice(7));
  return data.user?.id ?? null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
