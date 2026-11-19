-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Admin Dashboard: Homepage, real backend + real Admin →
-- Backend → Marketplace integration.
--
-- Replaces window._HOME_SECTIONS (lost on every reload, never reached
-- the real public Homepage either — screen-home.jsx read the SAME
-- window global, so a real visitor's browser never saw whatever an
-- admin set) with the platform_settings table already used for SEO/
-- commission config (admin_get_platform_settings/admin_set_platform_
-- setting already exist — reused as-is for writes, no new RPC needed
-- there). platform_settings has no public SELECT policy at all today
-- (only staff with settings.manage/products.view/edit can read it),
-- so a new, narrow, read-only public RPC is added instead of opening
-- RLS on the whole table — get_homepage_config() returns only the one
-- 'homepage' row's value, nothing else in that table.
--
-- Everything else the Homepage renders (hero banners, Flash Deals,
-- Featured products, Featured categories) is already real and already
-- admin-manageable through its own dedicated section (Banners,
-- Flash Deals, Products, Categories) — deliberately not duplicated
-- here. The one real gap found: "Popular Shops" had no curation
-- mechanism at all (sbGetShops() just orders by followers desc) and
-- no admin section manages it. Rather than add writable columns to
-- `shops` (sellers already hold an ALL-command RLS policy on their
-- own shop row — `is_featured_home`/`home_rank` columns there would
-- let a seller feature their own shop, which is an admin decision,
-- not a seller one), this is a new small, admin-only join table
-- instead, following the same pattern as health_checks/owner_accounts
-- this phase: RLS enabled, no write policy, written only through a
-- permission-gated RPC.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

insert into public.platform_settings (key, value)
select 'homepage', '{"hero":true,"shops":true,"deals":true,"categories":true,"featured":true,"videos":true}'::jsonb
where not exists (select 1 from public.platform_settings where key = 'homepage');

create or replace function public.get_homepage_config()
returns jsonb language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select coalesce(
    (select value from public.platform_settings where key = 'homepage'),
    '{"hero":true,"shops":true,"deals":true,"categories":true,"featured":true,"videos":true}'::jsonb
  );
$function$;
revoke all on function public.get_homepage_config() from public;
grant execute on function public.get_homepage_config() to anon, authenticated;

create table if not exists public.homepage_featured_shops (
  shop_id uuid primary key references public.shops(id) on delete cascade,
  rank integer not null,
  created_at timestamptz not null default now()
);
alter table public.homepage_featured_shops enable row level security;
drop policy if exists "Homepage featured shops are public" on public.homepage_featured_shops;
create policy "Homepage featured shops are public" on public.homepage_featured_shops
  for select using (true);
-- No write policy — admin_set_homepage_featured_shops() is the only path.

-- Full replace of the ordered list (simpler and safer than per-row
-- add/remove/reorder RPCs for a short admin-curated list): unknown or
-- inactive shop ids are silently skipped, never rejecting the whole
-- call for one bad id — same posture as Phase 9's webhook-result
-- validation.
create or replace function public.admin_set_homepage_featured_shops(p_shop_ids uuid[])
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_id uuid;
  v_rank integer := 0;
  v_inserted integer := 0;
begin
  if not public.has_permission(auth.uid(), 'settings.manage') then
    raise exception 'Permission denied: settings.manage required';
  end if;
  if p_shop_ids is null then
    raise exception 'p_shop_ids must be an array';
  end if;

  delete from public.homepage_featured_shops;
  foreach v_id in array p_shop_ids loop
    v_rank := v_rank + 1;
    if exists (select 1 from public.shops where id = v_id and is_active = true) then
      insert into public.homepage_featured_shops (shop_id, rank) values (v_id, v_rank)
      on conflict (shop_id) do update set rank = excluded.rank;
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  perform public.log_audit('homepage_featured_shops_changed', 'homepage_featured_shops', null, null,
    jsonb_build_object('shop_ids', p_shop_ids, 'count', v_inserted));
  return jsonb_build_object('ok', true, 'count', v_inserted);
end;
$function$;
revoke all on function public.admin_set_homepage_featured_shops(uuid[]) from public, anon;
grant execute on function public.admin_set_homepage_featured_shops(uuid[]) to authenticated;

-- Public read: the real, admin-curated shops for the Homepage, most-
-- recently-ranked first. The frontend falls back to its existing
-- followers-ordered query when this returns nothing — never a
-- fabricated list, and never a behavior change when nothing is
-- curated yet.
create or replace function public.get_homepage_featured_shops(p_limit integer default 8)
returns jsonb language sql stable security definer set search_path to 'public','pg_temp'
as $function$
  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  from (
    select to_jsonb(s) as row_data
    from public.homepage_featured_shops hfs
    join public.shops s on s.id = hfs.shop_id and s.is_active = true
    order by hfs.rank
    limit greatest(1, least(p_limit, 50))
  ) q;
$function$;
revoke all on function public.get_homepage_featured_shops(integer) from public;
grant execute on function public.get_homepage_featured_shops(integer) to anon, authenticated;
