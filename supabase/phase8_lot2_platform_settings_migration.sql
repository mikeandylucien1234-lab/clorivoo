-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 8, Lot 2: persist Admin Platform Settings / SEO
-- settings, and wire the commission-rate field to the real
-- commission_rules table (which already drove order.commission_rate
-- via the snapshot_order_commission_rate() trigger — the admin UI's
-- commission field was a disconnected, non-persistent duplicate of it
-- in window._PLATFORM_SETTINGS, not the real source of truth).
--
-- `platform_settings` (key/value, jsonb) already existed in this
-- project (used by release_expired_variant_reservations() for
-- inventory.reservation_expiry_minutes) — this migration only adds a
-- generic admin-gated read/write RPC pair on top of it, it does not
-- recreate the table. SEO fields are stored together under the single
-- key 'seo'; free_shipping_enabled / real_time_tracking_enabled are
-- separate boolean keys.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
alter table public.platform_settings enable row level security;
-- No direct policy at all: only SECURITY DEFINER RPCs (bypass RLS) read/write this table.

create or replace function public.admin_get_platform_settings()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'settings.manage') then
    raise exception 'Permission denied: settings.manage required';
  end if;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_result from public.platform_settings;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_platform_settings() from public, anon;
grant execute on function public.admin_get_platform_settings() to authenticated;

create or replace function public.admin_set_platform_setting(p_key text, p_value jsonb)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.has_permission(auth.uid(), 'settings.manage') then
    raise exception 'Permission denied: settings.manage required';
  end if;
  insert into public.platform_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update set value = p_value, updated_at = now(), updated_by = auth.uid();
  perform public.log_audit('platform_setting_changed', 'platform_settings', p_key, null, jsonb_build_object('value', p_value));
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_set_platform_setting(text, jsonb) from public, anon;
grant execute on function public.admin_set_platform_setting(text, jsonb) to authenticated;

create or replace function public.admin_get_commission_rate()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_rate numeric; v_basis text;
begin
  if not public.has_permission(auth.uid(), 'settings.manage') then
    raise exception 'Permission denied: settings.manage required';
  end if;
  select rate, basis into v_rate, v_basis from public.commission_rules
    where effective_from <= now() order by effective_from desc limit 1;
  return jsonb_build_object('rate', coalesce(v_rate, 0), 'basis', coalesce(v_basis, 'order_subtotal'));
end;
$function$;
revoke all on function public.admin_get_commission_rate() from public, anon;
grant execute on function public.admin_get_commission_rate() to authenticated;

create or replace function public.admin_set_commission_rate(p_rate numeric, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_rule record;
begin
  if not public.has_permission(auth.uid(), 'settings.manage') then
    raise exception 'Permission denied: settings.manage required';
  end if;
  if p_rate is null or p_rate < 0 or p_rate > 1 then
    raise exception 'Commission rate must be between 0 and 1';
  end if;
  insert into public.commission_rules (rate, basis, effective_from, created_by, note)
  values (p_rate, 'order_subtotal', now(), auth.uid(), p_note)
  returning * into v_rule;
  perform public.log_audit('commission_rate_changed', 'commission_rules', v_rule.id::text, null, jsonb_build_object('rate', p_rate));
  return jsonb_build_object('ok', true, 'rate', v_rule.rate);
end;
$function$;
revoke all on function public.admin_set_commission_rate(numeric, text) from public, anon;
grant execute on function public.admin_set_commission_rate(numeric, text) to authenticated;
