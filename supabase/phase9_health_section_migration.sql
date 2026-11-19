-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Admin Dashboard: Health section, real backend core.
--
-- Replaces the hardcoded "Backend reachable: false / Project paused"
-- placeholder in screen-admin.jsx with genuine, observed checks:
--
--   * Database  — the admin's own browser calls admin_health_ping()
--     over PostgREST and times the real round trip. Success proves
--     the database + API layer are reachable; the measured elapsed
--     time IS the real latency (there is nothing more authoritative
--     to measure server-side — the function's own execution is
--     effectively instant, the round trip is what matters).
--   * Authentication, Storage, Edge Functions, Realtime — each
--     verified directly from the browser against the real Supabase
--     services (auth.getUser(), storage.from(...).list(), a real
--     Edge Function invocation, a real Realtime channel subscribe).
--     None of this needs new SQL beyond the permission + the two
--     RPCs below; the rest lives in supabase-client.jsx.
--
-- New permission module 'system' (reuses the existing permissions /
-- role_permissions / has_permission() RBAC machinery — no new
-- mechanism, just one new row, exactly like every other section).
-- Admins (role='admin') always pass has_permission() regardless;
-- staff need this permission explicitly granted under Staff → Roles,
-- which lists it automatically since Roles reads the permissions
-- catalog dynamically.
--
-- health_checks is a thin, append-only history table — not a
-- fabricated one. Every row is written by admin_record_health_check(),
-- which validates each submitted result (known service name, known
-- status, clamped message length, non-negative latency) before
-- inserting, the same "trust internal, validate at the boundary"
-- posture used for the Phase 9 Lot 1 webhook payload. No direct
-- INSERT/UPDATE/DELETE policy exists on the table — the RPC is the
-- only sanctioned write path, consistent with the rest of the project.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

insert into public.permissions (module, key, label)
select * from (values
  ('system','system.health','View system health status and history')
) as v(module, key, label)
where not exists (select 1 from public.permissions p where p.key = v.key);

create table if not exists public.health_checks (
  id uuid primary key default uuid_generate_v4(),
  checked_at timestamptz not null default now(),
  checked_by uuid references public.profiles(id),
  service text not null check (service in ('database','auth','storage','edge_functions','realtime')),
  status text not null check (status in ('ok','degraded','down')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  message text
);
create index if not exists health_checks_checked_at_idx on public.health_checks (checked_at desc);

alter table public.health_checks enable row level security;
drop policy if exists "Staff view health history" on public.health_checks;
create policy "Staff view health history" on public.health_checks
  for select using (public.has_permission(auth.uid(), 'system.health'));

-- Lightweight liveness probe. Doubles as the "Database" check (the
-- browser times this exact round trip) and as the thing the
-- health-check Edge Function calls to prove it can itself reach the
-- database through the caller's own credentials (the "Edge Functions"
-- check is really "is the function deployed and reachable AND can it
-- do real work" — not just "does Deno respond").
create or replace function public.admin_health_ping()
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.has_permission(auth.uid(), 'system.health') then
    raise exception 'Permission denied: system.health required';
  end if;
  return jsonb_build_object('ok', true, 'server_time', now());
end;
$function$;
revoke all on function public.admin_health_ping() from public, anon;
grant execute on function public.admin_health_ping() to authenticated;

-- p_results: jsonb array of {service, status, latency_ms, message}.
-- Each element is validated against the same enums the table enforces
-- before insertion — a malformed or out-of-range element is skipped
-- (not rejected wholesale), so one bad entry can't block recording
-- the rest of a real check run.
create or replace function public.admin_record_health_check(p_results jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_item jsonb;
  v_service text;
  v_status text;
  v_latency integer;
  v_message text;
  v_inserted integer := 0;
begin
  if not public.has_permission(auth.uid(), 'system.health') then
    raise exception 'Permission denied: system.health required';
  end if;
  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'p_results must be a JSON array';
  end if;

  for v_item in select * from jsonb_array_elements(p_results) loop
    v_service := v_item->>'service';
    v_status  := v_item->>'status';
    v_message := left(coalesce(v_item->>'message', ''), 300);
    begin
      v_latency := nullif(v_item->>'latency_ms', '')::integer;
    exception when others then
      v_latency := null;
    end;
    if v_service not in ('database','auth','storage','edge_functions','realtime') then continue; end if;
    if v_status not in ('ok','degraded','down') then continue; end if;
    if v_latency is not null and v_latency < 0 then v_latency := null; end if;

    insert into public.health_checks (checked_by, service, status, latency_ms, message)
    values (auth.uid(), v_service, v_status, v_latency, nullif(v_message, ''));
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$function$;
revoke all on function public.admin_record_health_check(jsonb) from public, anon;
grant execute on function public.admin_record_health_check(jsonb) to authenticated;

create or replace function public.admin_get_health_history(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'system.health') then
    raise exception 'Permission denied: system.health required';
  end if;
  select coalesce(jsonb_agg(to_jsonb(h) order by h.checked_at desc), '[]'::jsonb) into v_result
  from (select service, status, latency_ms, message, checked_at from public.health_checks order by checked_at desc limit greatest(1, least(p_limit, 200))) h;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_health_history(integer) from public, anon;
grant execute on function public.admin_get_health_history(integer) to authenticated;
