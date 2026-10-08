-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 0: Security foundation + RBAC
-- Run in Supabase SQL Editor AFTER all previous migrations.
-- Already applied directly to the live project (kpwebnoqsjlxxiamwsst).
--
-- Scope (per the approved technical plan, Phase 0 only):
--   1. profiles.status (active/suspended/banned) — account-level gate
--   2. permissions / staff_roles / role_permissions / staff_members —
--      granular RBAC, independent of profiles.role
--   3. has_permission() / is_active_account() / is_verified_seller() —
--      SECURITY DEFINER helpers usable inside RLS policies
--   4. audit_logs + log_audit() — tamper-resistant audit trail
--      (actor_id always derived from auth.uid() server-side, never a
--      client-supplied parameter, so a client cannot forge entries)
--   5. Fix the 3 real advisories found in the architecture review:
--      mutable search_path (5 functions), anon-executable
--      SECURITY DEFINER functions, and the products RLS gap that let
--      an unapproved seller write products with no verification check
--
-- NOT in Phase 0 (explicitly deferred to their own phases per the
-- approved plan): brands, product workflow states beyond what exists,
-- orders/payments/shipping/coupons/flash deals/analytics tables. This
-- migration only touches what Phase 0 needs.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ACCOUNT STATUS + STAFF ROLE VALUE ──────────────────────────
alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active','suspended','banned'));
create index if not exists profiles_status_idx on public.profiles(status);

-- profiles.role was limited to buyer/seller/admin — 'staff' is a 4th top-level
-- role (per the approved plan: CUSTOMER/SELLER/ADMIN/STAFF). A staff account's
-- concrete permissions still come entirely from staff_members/role_permissions
-- below, never hardcoded per role name.
alter table public.profiles
  drop constraint profiles_role_check,
  add constraint profiles_role_check check (role = any (array['buyer','seller','admin','staff']));

-- ─── 2. RBAC TABLES ─────────────────────────────────────────────────
create table if not exists public.permissions (
  key         text primary key,         -- e.g. 'products.create'
  module      text not null,            -- e.g. 'products' — groups permissions in the admin UI
  label       text not null,            -- e.g. 'Create products'
  created_at  timestamptz not null default now()
);

create table if not exists public.staff_roles (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null unique,    -- e.g. 'Catalog Manager'
  description  text,
  is_system    boolean not null default false, -- protects seeded roles from deletion
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id         uuid not null references public.staff_roles(id) on delete cascade,
  permission_key  text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table if not exists public.staff_members (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null unique references public.profiles(id) on delete cascade,
  staff_role_id  uuid not null references public.staff_roles(id),
  status         text not null default 'active' check (status in ('active','suspended')),
  invited_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists staff_members_role_idx on public.staff_members(staff_role_id);

alter table public.permissions enable row level security;
alter table public.staff_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_members enable row level security;

create policy "Authenticated can read permission catalog" on public.permissions for select
  using (auth.role() = 'authenticated');
create policy "Admins and staff.manage can write permission catalog" on public.permissions for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.manage'));

create policy "Staff can view roles" on public.staff_roles for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.view'));
create policy "Admins and staff.manage can write roles" on public.staff_roles for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.manage'));

create policy "Staff can view role permissions" on public.role_permissions for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.view'));
create policy "Admins and staff.manage can write role permissions" on public.role_permissions for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.manage'));

create policy "Admins, staff.view and self can view staff members" on public.staff_members for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or public.has_permission(auth.uid(), 'staff.view')
    or user_id = auth.uid()
  );
create policy "Admins and staff.manage can write staff members" on public.staff_members for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin' or public.has_permission(auth.uid(), 'staff.manage'));

-- ─── 3. SECURITY DEFINER HELPERS (used inside RLS policies) ────────
-- role='admin' is always the Super Admin — full bypass, matches the existing
-- "Admins can manage X" policies already used throughout the schema.
create or replace function public.has_permission(p_user_id uuid, p_permission text)
returns boolean
language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'admin' and p.status = 'active'
  ) or exists (
    select 1
    from public.staff_members sm
    join public.role_permissions rp on rp.role_id = sm.staff_role_id
    join public.profiles p on p.id = sm.user_id
    where sm.user_id = p_user_id
      and sm.status = 'active'
      and p.status = 'active'
      and rp.permission_key = p_permission
  );
$$;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.is_active_account(p_user_id uuid)
returns boolean
language sql security definer set search_path = public, pg_temp stable
as $$
  select coalesce((select status from public.profiles where id = p_user_id) = 'active', false);
$$;
grant execute on function public.is_active_account(uuid) to authenticated, anon;

-- A seller may sell only once their shop is verified AND active. This is the
-- concrete enforcement the seller workflow (Phase 3) will build on top of —
-- Phase 0 wires it into the one seller-write RLS path that already exists.
create or replace function public.is_verified_seller(p_user_id uuid)
returns boolean
language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1 from public.shops s
    where s.seller_id = p_user_id and s.is_verified = true and s.is_active = true
  );
$$;
grant execute on function public.is_verified_seller(uuid) to authenticated;

-- ─── 4. AUDIT LOGS ──────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id             uuid primary key default uuid_generate_v4(),
  actor_id       uuid references public.profiles(id),
  actor_role     text,
  action         text not null,
  resource_type  text,
  resource_id    text,
  before         jsonb,
  after          jsonb,
  ip             text,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type, resource_id);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;
-- Deliberately NO insert policy for anon/authenticated — the only way to write
-- a row is through log_audit() below, which hardcodes actor_id to auth.uid().
drop policy if exists "Admins and permitted staff can read audit logs" on public.audit_logs;
create policy "Admins and permitted staff can read audit logs" on public.audit_logs for select
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or public.has_permission(auth.uid(), 'audit.view')
  );

create or replace function public.log_audit(
  p_action text, p_resource_type text default null, p_resource_id text default null,
  p_before jsonb default null, p_after jsonb default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  insert into public.audit_logs (actor_id, actor_role, action, resource_type, resource_id, before, after)
  values (auth.uid(), v_role, p_action, p_resource_type, p_resource_id, p_before, p_after)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.log_audit(text, text, text, jsonb, jsonb) to authenticated;

-- ─── 5. FIX REAL ADVISORIES FOUND IN THE ARCHITECTURE REVIEW ───────
-- 5a. Mutable search_path on pre-existing functions.
alter function public.update_conversation_on_message() set search_path = public, pg_temp;
alter function public._create_policy_if_not_exists(text, text, text) set search_path = public, pg_temp;
alter function public.handle_updated_at() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.seed_demo_products(uuid) set search_path = public, pg_temp;

-- 5b. SECURITY DEFINER functions callable by anon/authenticated via RPC that
-- should only ever run as triggers (trigger execution is not gated by these
-- grants, so revoking here does not break the on_auth_user_created trigger).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.seed_demo_products(uuid) from public, anon, authenticated;

-- 5c. Seller-write RLS on products had no verification check at all — any
-- seller with a shop row (verified or not) could create/edit products.
alter policy "Sellers can manage their products" on public.products
  using (
    shop_id in (select id from public.shops where seller_id = auth.uid())
    and public.is_active_account(auth.uid())
    and public.is_verified_seller(auth.uid())
  );
alter policy "Sellers can manage own products by seller_id" on public.products
  using (
    seller_id = auth.uid()
    and public.is_active_account(auth.uid())
    and public.is_verified_seller(auth.uid())
  );

-- ─── 6. SEED: Super Admin role + a starter permission catalog ─────
insert into public.staff_roles (name, description, is_system)
values ('Super Admin', 'Full platform access — mirrors profiles.role = admin', true)
on conflict (name) do nothing;

insert into public.permissions (key, module, label) values
  ('products.view','products','View products'), ('products.create','products','Create products'),
  ('products.edit','products','Edit products'), ('products.delete','products','Delete products'),
  ('products.approve','products','Approve/reject products'),
  ('categories.view','categories','View categories'), ('categories.create','categories','Create categories'),
  ('categories.edit','categories','Edit categories'), ('categories.delete','categories','Delete/archive categories'),
  ('brands.view','brands','View brands'), ('brands.create','brands','Create brands'),
  ('brands.edit','brands','Edit brands'), ('brands.approve','brands','Approve/reject brands'),
  ('orders.view','orders','View orders'), ('orders.edit','orders','Edit orders'),
  ('orders.cancel','orders','Cancel orders'), ('orders.refund','orders','Refund orders'),
  ('sellers.view','sellers','View sellers'), ('sellers.approve','sellers','Approve/reject sellers'),
  ('sellers.suspend','sellers','Suspend/ban sellers'),
  ('customers.view','customers','View customers'), ('customers.suspend','customers','Suspend/ban customers'),
  ('staff.view','staff','View staff'), ('staff.manage','staff','Create/edit/remove staff and roles'),
  ('settings.manage','settings','Manage platform settings'),
  ('reports.view','reports','View reports and analytics'),
  ('audit.view','audit','View audit logs'),
  ('marketing.manage','marketing','Manage coupons, flash deals, banners')
on conflict (key) do nothing;

-- Super Admin gets every permission that exists today or is added later via
-- this same seed pattern (role='admin' already bypasses has_permission()
-- entirely, so this grant is informational/for future staff cloning, not load-bearing).
insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), key from public.permissions
on conflict do nothing;
