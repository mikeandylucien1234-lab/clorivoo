-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Admin Dashboard: Owner Vault, real backend + real gate.
--
-- SECURITY FIX (critical, applied now per explicit instruction): Owner
-- Vault was previously reachable by ANY account that can open the
-- Admin shell at all — the AdminSidebarFull "Owner Vault" button and
-- the 'ownervault' switch case had no permission check whatsoever, not
-- even has_permission(). A standard admin, or any staff member with
-- zero granted permissions, could already see it. Worse: this
-- project's has_permission() gives role='admin' a blanket bypass over
-- every permission key that exists — there is no permission string
-- that can ever be "admin, but not this one", so routing Owner access
-- through the normal permissions/role_permissions system (like every
-- other section) cannot work here: any permission key an admin lacks
-- is already irrelevant, admins pass regardless. A genuinely narrower
-- gate needs its own, independent primitive — hence owner_accounts
-- below, deliberately NOT wired into permissions/role_permissions, so
-- it can never be granted via Staff → Roles by an ordinary admin.
--
-- owner_accounts is a minimal, explicit allowlist — not a new role on
-- profiles (which still only needs 'admin' for its own purposes) and
-- not a broader privilege system. is_owner() also re-checks the
-- account is still an active admin, so suspending or demoting the
-- profile revokes Owner access automatically rather than leaving a
-- stale row with effective access. There is deliberately no RPC here
-- to grant/revoke Owner status from the UI — adding or removing an
-- owner is a direct database action (the same way this project's one
-- existing admin account was itself provisioned), never a
-- self-service admin action; building that flow is out of scope until
-- asked for.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.owner_accounts (
  id uuid primary key references public.profiles(id),
  granted_at timestamptz not null default now(),
  granted_by uuid references public.profiles(id),
  note text
);
alter table public.owner_accounts enable row level security;
-- No policies: this table is never queried directly by any client —
-- only through the SECURITY DEFINER functions below.

create or replace function public.is_owner(p_user_id uuid)
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select exists (
    select 1 from public.owner_accounts o
    join public.profiles p on p.id = o.id
    where o.id = p_user_id and p.role = 'admin' and p.status = 'active'
  );
$function$;
revoke all on function public.is_owner(uuid) from public, anon, authenticated;

-- Callable by any signed-in user, but only ever answers for the
-- CALLER's own id (auth.uid()) — never lets one account probe whether
-- another account is an Owner.
create or replace function public.am_i_owner()
returns boolean language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select public.is_owner(auth.uid());
$function$;
revoke all on function public.am_i_owner() from public, anon;
grant execute on function public.am_i_owner() to authenticated;

-- Single consolidated read for the whole Owner Vault screen. Reuses
-- existing tables/results instead of re-probing anything Health
-- already checks: the Database/Auth/Storage/Edge Functions/Realtime
-- rows here are literally the latest health_checks rows (phase9_
-- health_section_migration.sql), one per service — never a second,
-- duplicate probe. A service with no row yet is reported as
-- 'unchecked', never fabricated as healthy.
create or replace function public.admin_get_owner_vault_overview()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_health jsonb;
  v_staff_count integer;
  v_roles_count integer;
  v_audit_last jsonb;
  v_audit_total bigint;
  v_rate numeric;
  v_basis text;
  v_commission_confirmed numeric;
  v_commission_reversed numeric;
  v_settings_updated_at timestamptz;
begin
  if not public.is_owner(auth.uid()) then
    raise exception 'Permission denied: Owner access required';
  end if;

  select coalesce(jsonb_agg(row_data), '[]'::jsonb) into v_health
  from (
    select distinct on (service)
      service, status, latency_ms, message, checked_at
    from public.health_checks
    order by service, checked_at desc
  ) h,
  lateral (select to_jsonb(h) as row_data) j;

  select count(*) into v_staff_count from public.staff_members where status = 'active';
  select count(*) into v_roles_count from public.staff_roles;

  select to_jsonb(a) into v_audit_last from (
    select action, resource_type, created_at from public.audit_logs order by created_at desc limit 1
  ) a;
  select count(*) into v_audit_total from public.audit_logs;

  select rate, basis into v_rate, v_basis from public.commission_rules
    where effective_from <= now() order by effective_from desc limit 1;
  select coalesce(sum(net_amount) filter (where status = 'confirmed'), 0),
         coalesce(sum(net_amount) filter (where status = 'reversed'), 0)
    into v_commission_confirmed, v_commission_reversed
    from public.commission_ledger;

  select max(updated_at) into v_settings_updated_at from public.platform_settings;

  return jsonb_build_object(
    'project_ref', 'kpwebnoqsjlxxiamwsst',
    'health', v_health,
    'staff', jsonb_build_object('active_count', v_staff_count, 'roles_count', v_roles_count),
    'audit', jsonb_build_object('last', v_audit_last, 'total', v_audit_total),
    'commissions', jsonb_build_object(
      'rate', coalesce(v_rate, 0), 'basis', coalesce(v_basis, 'order_subtotal'),
      'confirmed_net_all_time', v_commission_confirmed, 'reversed_net_all_time', v_commission_reversed
    ),
    'settings_last_updated_at', v_settings_updated_at,
    'generated_at', now()
  );
end;
$function$;
revoke all on function public.admin_get_owner_vault_overview() from public, anon, authenticated;
grant execute on function public.admin_get_owner_vault_overview() to authenticated;
