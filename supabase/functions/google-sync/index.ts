import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

type Conn = {
  user_id: string;
  refresh_token: string;
  calendar_id: string;
  sync_token: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Expected POST" }, 405);

  const header = req.headers.get("Authorization") ?? "";
  const jwt = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData } = await admin.auth.getUser(jwt);
  const userId = userData.user?.id;
  if (!userId) return json({ error: "Not signed in" }, 401);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "import");
  if (action === "disconnect") {
    await admin.from("google_connections").delete().eq("user_id", userId);
    return json({ ok: true });
  }

  const { data: conn } = await admin
    .from("google_connections")
    .select("user_id, refresh_token, calendar_id, sync_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (!conn?.refresh_token) return json({ ok: true, connected: false });

  const access = await refreshAccessToken(conn.refresh_token);
  if (!access) return json({ error: "Google token refresh failed" }, 502);

  if (action === "import") {
    await importEvents(admin, conn as Conn, access);
    return json({ ok: true });
  }

  if (action === "upsert") {
    await pushEvent(admin, conn as Conn, access, String(body.event_id ?? ""));
    return json({ ok: true });
  }

  if (action === "delete") {
    const googleId = String(body.google_event_id ?? "");
    if (googleId) await deleteGoogleEvent(conn as Conn, access, googleId);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  return res.ok ? data.access_token ?? null : null;
}

async function importEvents(admin: ReturnType<typeof createClient>, conn: Conn, access: string) {
  const calendar = encodeURIComponent(conn.calendar_id || "primary");
  let pageToken = "";
  let syncToken = conn.sync_token;
  const collected: GoogleEvent[] = [];
  let nextSync: string | null = null;

  for (let page = 0; page < 10; page++) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`);
    if (syncToken) {
      url.searchParams.set("syncToken", syncToken);
    } else {
      const min = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const max = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
      url.searchParams.set("timeMin", min);
      url.searchParams.set("timeMax", max);
      url.searchParams.set("singleEvents", "true");
    }
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    if (res.status === 410) {
      syncToken = null;
      pageToken = "";
      collected.length = 0;
      continue;
    }
    if (!res.ok) break;
    const data = await res.json();
    collected.push(...(data.items ?? []));
    nextSync = data.nextSyncToken ?? nextSync;
    pageToken = data.nextPageToken ?? "";
    if (!pageToken) break;
  }

  for (const item of collected) {
    const oursId = item.extendedProperties?.private?.ours_event_id;
    if (oursId) continue;
    if (!item.id) continue;

    if (item.status === "cancelled") {
      await admin.from("events").delete().eq("owner_id", conn.user_id).eq("google_event_id", item.id);
      continue;
    }

    const range = eventRange(item);
    if (!range) continue;

    const { data: existing } = await admin
      .from("events")
      .select("id")
      .eq("owner_id", conn.user_id)
      .eq("google_event_id", item.id)
      .maybeSingle();

    const row = {
      owner_id: conn.user_id,
      title: item.summary || "Busy",
      notes: item.description ?? null,
      location: item.location ?? null,
      start_at: range.start,
      end_at: range.end,
      visibility: "partner",
      recurrence: "none",
      google_event_id: item.id,
      source: "google",
    };

    if (existing?.id) {
      await admin.from("events").update(row).eq("id", existing.id);
    } else {
      await admin.from("events").insert(row);
    }
  }

  await admin.from("google_connections").update({
    sync_token: nextSync,
    last_sync_at: new Date().toISOString(),
  }).eq("user_id", conn.user_id);
}

async function pushEvent(
  admin: ReturnType<typeof createClient>,
  conn: Conn,
  access: string,
  eventId: string,
) {
  if (!eventId) return;
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!event || event.owner_id !== conn.user_id) return;
  if (event.visibility === "shared") return;

  const calendar = encodeURIComponent(conn.calendar_id || "primary");
  const payload = {
    summary: event.title,
    description: event.notes,
    location: event.location,
    start: { dateTime: event.start_at },
    end: { dateTime: event.end_at },
    extendedProperties: { private: { ours_event_id: event.id } },
  };

  if (event.google_event_id) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(event.google_event_id)}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return;
  }

  if (event.source !== "ours") return;

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendar}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return;
  const created = await res.json();
  if (created.id) {
    await admin.from("events").update({ google_event_id: created.id }).eq("id", event.id);
  }
}

async function deleteGoogleEvent(conn: Conn, access: string, googleEventId: string) {
  const calendar = encodeURIComponent(conn.calendar_id || "primary");
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendar}/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${access}` } },
  );
}

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: { ours_event_id?: string } };
};

function eventRange(item: GoogleEvent): { start: string; end: string } | null {
  if (item.start?.dateTime && item.end?.dateTime) {
    return { start: item.start.dateTime, end: item.end.dateTime };
  }
  if (item.start?.date && item.end?.date) {
    return {
      start: `${item.start.date}T00:00:00Z`,
      end: `${item.end.date}T00:00:00Z`,
    };
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
