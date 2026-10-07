-- Ours: accounts, calendars, partner sharing, temporary availability, Google connection.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  short_name text not null,
  initial text not null,
  email text,
  color_hex text not null default '007AFF',
  work_start_minute int,
  work_end_minute int,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name text;
begin
  full_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(coalesce(new.email, 'You'), '@', 1)
  );
  insert into public.profiles (id, display_name, short_name, initial, email)
  values (
    new.id,
    full_name,
    split_part(full_name, ' ', 1),
    upper(left(full_name, 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Partnerships (one ongoing partner)
-- ---------------------------------------------------------------------------

create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'ended')),
  token text not null unique,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create index partnerships_host_idx on public.partnerships (host_id);
create index partnerships_partner_idx on public.partnerships (partner_id);

create unique index partnerships_one_open_host
  on public.partnerships (host_id)
  where status in ('pending', 'active');

create unique index partnerships_one_active_guest
  on public.partnerships (partner_id)
  where status = 'active' and partner_id is not null;

alter table public.partnerships enable row level security;

-- ---------------------------------------------------------------------------
-- Temporary availability shares
-- ---------------------------------------------------------------------------

create table public.share_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'active', 'expired', 'revoked')),
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index share_sessions_host_idx on public.share_sessions (host_id);
create index share_sessions_guest_idx on public.share_sessions (guest_id);

alter table public.share_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  partnership_id uuid references public.partnerships (id) on delete set null,
  title text not null,
  notes text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  visibility text not null check (visibility in ('private', 'partner', 'shared')),
  recurrence text not null default 'none' check (recurrence in ('none', 'daily', 'weekly', 'biweekly', 'monthly')),
  google_event_id text,
  source text not null default 'ours' check (source in ('ours', 'google')),
  updated_at timestamptz not null default now()
);

create index events_owner_start_idx on public.events (owner_id, start_at);
create unique index events_google_event_idx
  on public.events (owner_id, google_event_id)
  where google_event_id is not null;

alter table public.events enable row level security;

create or replace function public.touch_event_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_event_updated_at();

-- ---------------------------------------------------------------------------
-- Shared requests (partner or temporary guest)
-- ---------------------------------------------------------------------------

create table public.shared_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  partnership_id uuid references public.partnerships (id) on delete cascade,
  share_session_id uuid references public.share_sessions (id) on delete cascade,
  title text not null,
  notes text,
  location text,
  proposed_start timestamptz not null,
  proposed_end timestamptz not null,
  suggested_start timestamptz,
  suggested_end timestamptz,
  status text not null check (status in ('pending', 'accepted', 'suggested', 'declined')),
  created_at timestamptz not null default now(),
  check (partnership_id is not null or share_session_id is not null)
);

create index shared_requests_to_idx on public.shared_requests (to_user_id, status);
create index shared_requests_from_idx on public.shared_requests (from_user_id, status);

alter table public.shared_requests enable row level security;

create or replace function public.lock_request_parties()
returns trigger
language plpgsql
as $$
begin
  if new.from_user_id <> old.from_user_id or new.to_user_id <> old.to_user_id then
    raise exception 'Cannot reassign a request';
  end if;
  return new;
end;
$$;

create trigger shared_requests_lock_parties
  before update on public.shared_requests
  for each row execute function public.lock_request_parties();

-- ---------------------------------------------------------------------------
-- Google Calendar connection. Refresh token is not granted to the client.
-- ---------------------------------------------------------------------------

create table public.google_connections (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  google_email text,
  refresh_token text,
  calendar_id text not null default 'primary',
  sync_token text,
  last_sync_at timestamptz,
  connected_at timestamptz not null default now()
);

alter table public.google_connections enable row level security;

create table public.google_oauth_states (
  state text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.google_oauth_states enable row level security;

revoke all on public.google_connections from anon, authenticated;
grant select (user_id, google_email, calendar_id, last_sync_at, connected_at)
  on public.google_connections to authenticated;

revoke all on public.google_oauth_states from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.active_partner_id(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when host_id = uid then partner_id else host_id end
  from public.partnerships
  where status = 'active'
    and partner_id is not null
    and (host_id = uid or partner_id = uid)
  limit 1;
$$;

create or replace function public.open_partnership_exists(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.partnerships
    where status in ('pending', 'active')
      and (host_id = uid or partner_id = uid)
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id = public.active_partner_id(auth.uid())
    or id in (
      select case when host_id = auth.uid() then guest_id else host_id end
      from public.share_sessions
      where status = 'active'
        and expires_at > now()
        and (host_id = auth.uid() or guest_id = auth.uid())
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy partnerships_select on public.partnerships
  for select to authenticated
  using (host_id = auth.uid() or partner_id = auth.uid());

create policy share_sessions_select on public.share_sessions
  for select to authenticated
  using (host_id = auth.uid() or guest_id = auth.uid());

create policy events_select on public.events
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'partner'
      and owner_id = public.active_partner_id(auth.uid())
    )
    or (
      visibility = 'shared'
      and partnership_id in (
        select id from public.partnerships
        where host_id = auth.uid() or partner_id = auth.uid()
      )
    )
  );

create policy events_insert on public.events
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and source = 'ours'
    and (
      (visibility in ('private', 'partner') and partnership_id is null)
      or (
        visibility = 'shared'
        and partnership_id in (
          select id from public.partnerships
          where status = 'active'
            and (host_id = auth.uid() or partner_id = auth.uid())
        )
      )
    )
  );

create policy events_update on public.events
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'shared'
      and partnership_id in (
        select id from public.partnerships
        where host_id = auth.uid() or partner_id = auth.uid()
      )
    )
  )
  with check (
    owner_id = auth.uid()
    or (
      visibility = 'shared'
      and partnership_id in (
        select id from public.partnerships
        where host_id = auth.uid() or partner_id = auth.uid()
      )
    )
  );

create policy events_delete on public.events
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (
      visibility = 'shared'
      and partnership_id in (
        select id from public.partnerships
        where host_id = auth.uid() or partner_id = auth.uid()
      )
    )
  );

create policy requests_select on public.shared_requests
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy requests_insert on public.shared_requests
  for insert to authenticated
  with check (
    from_user_id = auth.uid()
    and (
      (
        partnership_id is not null
        and to_user_id = public.active_partner_id(auth.uid())
        and partnership_id in (
          select id from public.partnerships
          where status = 'active'
            and (host_id = auth.uid() or partner_id = auth.uid())
        )
      )
      or (
        share_session_id is not null
        and share_session_id in (
          select id from public.share_sessions
          where status = 'active'
            and expires_at > now()
            and (
              (host_id = auth.uid() and guest_id = to_user_id)
              or (guest_id = auth.uid() and host_id = to_user_id)
            )
        )
      )
    )
  );

create policy requests_update on public.shared_requests
  for update to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid())
  with check (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy google_connections_select on public.google_connections
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Partnership RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_partner_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.partnerships%rowtype;
  new_token text;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into existing
  from public.partnerships
  where host_id = uid and status = 'pending'
  limit 1;

  if found then
    return jsonb_build_object('token', existing.token, 'partnership_id', existing.id, 'status', existing.status);
  end if;

  if public.open_partnership_exists(uid) then
    raise exception 'You already share a calendar with someone';
  end if;

  new_token := encode(gen_random_bytes(16), 'hex');
  insert into public.partnerships (host_id, status, token)
  values (uid, 'pending', new_token)
  returning id into new_id;

  return jsonb_build_object('token', new_token, 'partnership_id', new_id, 'status', 'pending');
end;
$$;

create or replace function public.accept_partner_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.partnerships%rowtype;
  host_profile public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into row
  from public.partnerships
  where token = p_token and status = 'pending'
  for update;

  if not found then
    raise exception 'This invite is no longer available';
  end if;

  if row.host_id = uid then
    raise exception 'You cannot accept your own invite';
  end if;

  if public.open_partnership_exists(uid) then
    raise exception 'You already share a calendar with someone';
  end if;

  update public.partnerships
  set partner_id = uid, status = 'active'
  where id = row.id;

  select * into host_profile from public.profiles where id = row.host_id;

  return jsonb_build_object(
    'partnership_id', row.id,
    'host_id', row.host_id,
    'host_name', host_profile.display_name,
    'host_short_name', host_profile.short_name,
    'host_initial', host_profile.initial,
    'host_email', host_profile.email
  );
end;
$$;

create or replace function public.end_partnership()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  update public.partnerships
  set status = 'ended', ended_at = now()
  where status in ('pending', 'active')
    and (host_id = uid or partner_id = uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- Temporary share RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_share_session()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_token text;
  new_id uuid;
  expiry timestamptz;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  new_token := encode(gen_random_bytes(16), 'hex');
  expiry := now() + interval '7 days';
  insert into public.share_sessions (host_id, status, token, expires_at)
  values (uid, 'pending', new_token, expiry)
  returning id into new_id;

  return jsonb_build_object(
    'token', new_token,
    'session_id', new_id,
    'expires_at', expiry
  );
end;
$$;

create or replace function public.accept_share_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.share_sessions%rowtype;
  host_profile public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into row
  from public.share_sessions
  where token = p_token
  for update;

  if not found then
    raise exception 'This link is no longer available';
  end if;

  if row.host_id = uid then
    raise exception 'This is your own availability link';
  end if;

  if row.status = 'revoked' or row.expires_at <= now() then
    update public.share_sessions set status = 'expired' where id = row.id and status = 'pending';
    raise exception 'This availability link has expired';
  end if;

  if row.status = 'active' and row.guest_id is distinct from uid then
    raise exception 'Someone else is already using this link';
  end if;

  update public.share_sessions
  set guest_id = uid, status = 'active'
  where id = row.id;

  select * into host_profile from public.profiles where id = row.host_id;

  return jsonb_build_object(
    'session_id', row.id,
    'host_id', row.host_id,
    'host_name', host_profile.display_name,
    'host_short_name', host_profile.short_name,
    'host_initial', host_profile.initial,
    'expires_at', row.expires_at
  );
end;
$$;

create or replace function public.revoke_share_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  update public.share_sessions
  set status = 'revoked'
  where id = p_session_id
    and host_id = uid
    and status in ('pending', 'active');
end;
$$;

-- Merged busy blocks for the other person on an active share. No titles.
create or replace function public.busy_blocks(
  p_session_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns table (start_at timestamptz, end_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  sess public.share_sessions%rowtype;
  other_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into sess from public.share_sessions where id = p_session_id;
  if not found or sess.status <> 'active' or sess.expires_at <= now() then
    raise exception 'This availability share is not active';
  end if;

  if sess.host_id = uid then
    other_id := sess.guest_id;
  elsif sess.guest_id = uid then
    other_id := sess.host_id;
  else
    raise exception 'Not allowed';
  end if;

  if other_id is null then
    return;
  end if;

  return query
  with mine as (
    select e.start_at, e.end_at, e.recurrence
    from public.events e
    where e.owner_id = other_id
  ),
  raw as (
    select start_at, end_at
    from mine
    where recurrence = 'none'
      and start_at < p_end
      and end_at > p_start
    union all
    select
      start_at + (n || ' days')::interval,
      end_at + (n || ' days')::interval
    from mine
    cross join lateral generate_series(0, 400) as n
    where recurrence = 'daily'
      and start_at + (n || ' days')::interval < p_end
      and end_at + (n || ' days')::interval > p_start
      and start_at + (n || ' days')::interval >= date_trunc('day', p_start) - interval '1 day'
    union all
    select
      start_at + ((n * 7) || ' days')::interval,
      end_at + ((n * 7) || ' days')::interval
    from mine
    cross join lateral generate_series(0, 60) as n
    where recurrence = 'weekly'
      and start_at + ((n * 7) || ' days')::interval < p_end
      and end_at + ((n * 7) || ' days')::interval > p_start
    union all
    select
      start_at + ((n * 14) || ' days')::interval,
      end_at + ((n * 14) || ' days')::interval
    from mine
    cross join lateral generate_series(0, 30) as n
    where recurrence = 'biweekly'
      and start_at + ((n * 14) || ' days')::interval < p_end
      and end_at + ((n * 14) || ' days')::interval > p_start
    union all
    select
      start_at + (n || ' months')::interval,
      end_at + (n || ' months')::interval
    from mine
    cross join lateral generate_series(0, 6) as n
    where recurrence = 'monthly'
      and start_at + (n || ' months')::interval < p_end
      and end_at + (n || ' months')::interval > p_start
  ),
  ordered as (
    select
      start_at,
      end_at,
      max(end_at) over (
        order by start_at
        rows between unbounded preceding and 1 preceding
      ) as prev_max_end
    from raw
  ),
  marked as (
    select
      start_at,
      end_at,
      case
        when prev_max_end is null or start_at > prev_max_end then 1
        else 0
      end as is_new
    from ordered
  ),
  grouped as (
    select
      start_at,
      end_at,
      sum(is_new) over (order by start_at) as grp
    from marked
  )
  select min(grouped.start_at), max(grouped.end_at)
  from grouped
  group by grp
  order by 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accept a request. Couple plans become one shared event.
-- Temporary plans become a personal event on each calendar.
-- ---------------------------------------------------------------------------

create or replace function public.accept_shared_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.shared_requests%rowtype;
  start_ts timestamptz;
  end_ts timestamptz;
  my_event uuid;
  other_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select * into r from public.shared_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;

  if r.from_user_id <> uid and r.to_user_id <> uid then
    raise exception 'Not allowed';
  end if;

  if r.status not in ('pending', 'suggested') then
    raise exception 'Request is not open';
  end if;

  start_ts := coalesce(r.suggested_start, r.proposed_start);
  end_ts := coalesce(r.suggested_end, r.proposed_end);

  update public.shared_requests set status = 'accepted' where id = r.id;

  if r.partnership_id is not null then
    insert into public.events (
      owner_id, partnership_id, title, notes, location,
      start_at, end_at, visibility, recurrence, source
    ) values (
      uid, r.partnership_id, r.title, r.notes, r.location,
      start_ts, end_ts, 'shared', 'none', 'ours'
    )
    returning id into my_event;
  else
    other_id := case when r.from_user_id = uid then r.to_user_id else r.from_user_id end;

    insert into public.events (
      owner_id, title, notes, location, start_at, end_at, visibility, recurrence, source
    ) values (
      uid, r.title, r.notes, r.location, start_ts, end_ts, 'partner', 'none', 'ours'
    )
    returning id into my_event;

    insert into public.events (
      owner_id, title, notes, location, start_at, end_at, visibility, recurrence, source
    ) values (
      other_id, r.title, r.notes, r.location, start_ts, end_ts, 'partner', 'none', 'ours'
    );
  end if;

  return jsonb_build_object('event_id', my_event);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.active_partner_id(uuid) from public;
revoke all on function public.open_partnership_exists(uuid) from public;
grant execute on function public.active_partner_id(uuid) to authenticated;
grant execute on function public.open_partnership_exists(uuid) to authenticated;

revoke all on function public.create_partner_invite() from public;
revoke all on function public.accept_partner_invite(text) from public;
revoke all on function public.end_partnership() from public;
revoke all on function public.create_share_session() from public;
revoke all on function public.accept_share_session(text) from public;
revoke all on function public.revoke_share_session(uuid) from public;
revoke all on function public.busy_blocks(uuid, timestamptz, timestamptz) from public;
revoke all on function public.accept_shared_request(uuid) from public;

grant execute on function public.create_partner_invite() to authenticated;
grant execute on function public.accept_partner_invite(text) to authenticated;
grant execute on function public.end_partnership() to authenticated;
grant execute on function public.create_share_session() to authenticated;
grant execute on function public.accept_share_session(text) to authenticated;
grant execute on function public.revoke_share_session(uuid) to authenticated;
grant execute on function public.busy_blocks(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.accept_shared_request(uuid) to authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.partnerships to authenticated;
grant select on public.share_sessions to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update on public.shared_requests to authenticated;
grant select, insert, update, delete on public.google_connections to service_role;
grant select, insert, update, delete on public.google_oauth_states to service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_requests'
  ) then
    alter publication supabase_realtime add table public.shared_requests;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partnerships'
  ) then
    alter publication supabase_realtime add table public.partnerships;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'share_sessions'
  ) then
    alter publication supabase_realtime add table public.share_sessions;
  end if;
end $$;
