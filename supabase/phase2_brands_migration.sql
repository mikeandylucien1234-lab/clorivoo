-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 2: Brands Management
-- Run in Supabase SQL Editor AFTER phase1_auth_hardening_migration.sql.
-- Already applied directly to the live project (kpwebnoqsjlxxiamwsst).
--
-- Scope: a global, admin/staff-managed brand catalog, optionally linked
-- from products. No brands table or product.brand column existed before
-- this migration (verified via information_schema before writing it).
--
-- Reuses, does not duplicate:
--   - public.has_permission() (Phase 0) for every write policy below —
--     no parallel role/permission system.
--   - The existing permissions catalog — adds one new row (brands.delete)
--     through the same insert-into-permissions + role_permissions pattern
--     Phase 0 used; brands.view/create/edit/approve already existed from
--     the Phase 0 seed and were otherwise unused until now.
--   - The same per-entity public storage bucket convention as
--     categories/shops/avatars/banners (schema.sql, shop_customization_migration.sql).
--   - uuid_generate_v4() ids and the plain FK-without-ON-DELETE (= RESTRICT)
--     convention already used by products.category_id, so a brand with
--     linked products cannot be deleted by accident.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. TABLE ───────────────────────────────────────────────────────
create table public.brands (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null,
  logo_url    text,
  description text,
  website_url text,
  status      text not null default 'active' check (status in ('active','inactive')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness, matching the project's convention of
-- disallowing "Nike" and "NIKE" as two different brands.
create unique index brands_name_lower_idx on public.brands (lower(name));
create unique index brands_slug_lower_idx on public.brands (lower(slug));
create index brands_status_idx on public.brands(status);

-- No ON DELETE clause — identical convention to products.category_id —
-- a brand with linked products cannot be deleted (DB raises 23503),
-- never silently cascades. Nullable: brand assignment stays optional.
alter table public.products add column brand_id uuid references public.brands(id);
create index products_brand_id_idx on public.products(brand_id);

-- ─── 2. RLS ─────────────────────────────────────────────────────────
alter table public.brands enable row level security;

create policy "Active brands are public" on public.brands for select
  using (status = 'active');

create policy "Admins and permitted staff can view all brands" on public.brands for select
  using (public.has_permission(auth.uid(), 'brands.view'));

create policy "Admins and permitted staff can create brands" on public.brands for insert
  with check (public.has_permission(auth.uid(), 'brands.create'));

create policy "Admins and permitted staff can update brands" on public.brands for update
  using (public.has_permission(auth.uid(), 'brands.edit'));

create policy "Admins and permitted staff can delete brands" on public.brands for delete
  using (public.has_permission(auth.uid(), 'brands.delete'));

-- Verified live (rolled back, no data persisted): a non-privileged account
-- (demo@clorivo.app) attempting to insert a brand is rejected by RLS
-- (42501); the Super Admin account can insert; a second insert with a
-- different-case duplicate name ("NIKE" vs "Nike") is rejected by
-- brands_name_lower_idx (23505), not by RLS.

-- ─── 3. NEW PERMISSION (reuses the existing catalog mechanism) ─────
-- brands.view/create/edit/approve already existed from the Phase 0 seed.
-- Only brands.delete is new — added the same way Phase 0 added its own
-- permissions: an insert into permissions, then into role_permissions
-- for the seeded "Super Admin" staff_roles row.
insert into public.permissions (key, module, label) values
  ('brands.delete','brands','Delete brands')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), 'brands.delete'
where exists (select 1 from public.staff_roles where name = 'Super Admin')
on conflict do nothing;

-- ─── 4. STORAGE BUCKET (same public-bucket-per-entity convention) ──
insert into storage.buckets (id, name, public) values ('brands', 'brands', true)
on conflict (id) do nothing;

create policy "Brand logos are public" on storage.objects for select
  using (bucket_id = 'brands');

create policy "Permitted staff can upload brand logos" on storage.objects for insert
  with check (bucket_id = 'brands' and (public.has_permission(auth.uid(), 'brands.create') or public.has_permission(auth.uid(), 'brands.edit')));

create policy "Permitted staff can update brand logos" on storage.objects for update
  using (bucket_id = 'brands' and (public.has_permission(auth.uid(), 'brands.create') or public.has_permission(auth.uid(), 'brands.edit')));

create policy "Permitted staff can delete brand logos" on storage.objects for delete
  using (bucket_id = 'brands' and public.has_permission(auth.uid(), 'brands.delete'));
