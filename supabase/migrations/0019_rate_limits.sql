-- ============================================================================
-- Rate limiting for edge functions.
--
-- The two public-facing functions (vet-share, scan-upload) had no throttle. vet-share runs with
-- verify_jwt off, so anyone on the internet can call it as fast as they like: that's free rein to
-- brute-force share tokens and to run up the Supabase bill. scan-upload needs a JWT but a single
-- compromised account could still hammer it.
--
-- This is a fixed-window counter in Postgres rather than in-memory state, because edge functions
-- are horizontally scaled — a per-instance counter is trivially bypassed by spraying requests
-- across instances.
--
-- Identifiers are SHA-256 hashed by the CALLER before they get here, so raw client IPs are never
-- written to the database. The hash is one-way and the table is unreadable to every client role.
-- ============================================================================

create table public.rate_limit_hits (
  bucket       text        not null,          -- which endpoint, e.g. 'vet-share'
  key_hash     text        not null,          -- sha256(ip or user id); never the raw value
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (bucket, key_hash, window_start)
);

-- No policies are defined, so with RLS on and forced, no client role can read or write this
-- table at all. Only the SECURITY DEFINER function below touches it.
alter table public.rate_limit_hits enable row level security;
alter table public.rate_limit_hits force row level security;

-- Supabase grants all privileges on new public tables to anon/authenticated by default. RLS
-- alone already blocks them, but that makes safety depend on the continued absence of a policy;
-- dropping the grants makes it safe by construction instead.
revoke all on public.rate_limit_hits from public, anon, authenticated;

-- ============================================================================
-- consume_rate_limit — records one hit and reports whether the caller is still under the limit.
--
-- Returns true when the request should proceed, false when it should be rejected. The INSERT ..
-- ON CONFLICT DO UPDATE is a single atomic statement, so concurrent callers can't race past the
-- limit by reading a stale count.
--
-- Blocked requests still increment the counter. That's deliberate: someone who keeps hammering
-- while throttled stays throttled for the rest of the window rather than getting a fresh
-- allowance the moment they slow down.
-- ============================================================================
create or replace function public.consume_rate_limit(
  p_bucket       text,
  p_key_hash     text,
  p_limit        integer,
  p_window_secs  integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  w_start timestamptz;
  n integer;
begin
  if p_limit <= 0 or p_window_secs <= 0 then
    raise exception 'invalid rate limit parameters';
  end if;

  -- Snap to the window boundary so every caller in the same period shares one row.
  w_start := to_timestamp(floor(extract(epoch from now()) / p_window_secs) * p_window_secs);

  insert into public.rate_limit_hits (bucket, key_hash, window_start, count)
  values (p_bucket, p_key_hash, w_start, 1)
  on conflict (bucket, key_hash, window_start)
  do update set count = public.rate_limit_hits.count + 1
  returning public.rate_limit_hits.count into n;

  -- Opportunistic garbage collection. A dedicated cron job would be tidier, but this keeps the
  -- table bounded with no extra moving parts and costs roughly one delete per 200 requests.
  if random() < 0.005 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end $$;

-- Only the service role may call this — it is invoked by edge functions holding the service key,
-- never from the browser. A client that could call it directly could inflate another user's
-- counter and lock them out.
revoke execute on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
