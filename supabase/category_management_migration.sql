-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — Category management migration
-- Run in Supabase SQL Editor AFTER schema.sql
-- Already applied directly to the live project (kpwebnoqsjlxxiamwsst)
-- — this file documents that state for anyone re-provisioning a new
-- environment from scratch.
--
-- `categories` already existed (id/name/slug/icon/parent_id/position/
-- image_url/is_active) and was already hierarchical via parent_id and
-- already seeded with a real 2-level tree (Maison, Mode, Tech, …).
-- It was NOT the category system the app actually showed anyone: the
-- admin Categories page and the public Categories/Category screens
-- both read a separate, hardcoded `MAIN_CATEGORIES` JS array instead —
-- two disconnected "sources of truth" with different category lists.
-- This migration extends the real table with everything the admin
-- page needs (status workflow, visibility flags, SEO, banners,
-- attributes) so the database can be made the only source of truth,
-- and the app code (separate commit) deletes the hardcoded array and
-- reads this table everywhere instead.
--
-- Deliberately NOT built here, because nothing else in this app has
-- the supporting infrastructure and stubbing them would be fake:
--   - category_translations (i18n)   — no i18n system exists anywhere
--     else in Clorivo; every string in the app is hardcoded English.
--   - category view/click analytics  — no event-tracking pipeline
--     exists; a "views" counter nobody increments is just a fake 0.
--   - per-product attribute VALUES   — category_attributes below
--     defines the *schema* an admin can manage (e.g. Fashion has a
--     Size attribute), which is the actual ask ("category
--     attributes/filters"). Letting sellers fill in per-product
--     values is a Product-form feature in its own right and is not
--     wired up here; building a values table with no UI to write to
--     it would be unused scaffolding.
--   - a sync trigger that mirrors `status` back onto the legacy
--     `is_active` boolean — skipped because nothing in the app reads
--     categories.is_active (grepped the whole codebase). `status` is
--     the field every new read/write below actually uses.
-- ═══════════════════════════════════════════════════════════════

-- ─── CATEGORIES — extend existing table ───────────────────────────
alter table public.categories
  add column if not exists description         text,
  add column if not exists short_description   text,
  add column if not exists banner_desktop_url   text,
  add column if not exists banner_tablet_url    text,
  add column if not exists banner_mobile_url    text,
  add column if not exists status               text not null default 'active'
    check (status in ('draft','active','inactive','archived')),
  add column if not exists is_featured          boolean not null default false,
  add column if not exists show_on_homepage     boolean not null default false,
  add column if not exists show_in_navigation   boolean not null default true,
  add column if not exists show_in_menu         boolean not null default true,
  add column if not exists show_in_search       boolean not null default true,
  add column if not exists seo_title            text,
  add column if not exists seo_description      text,
  add column if not exists seo_keywords         text,
  add column if not exists canonical_url        text,
  add column if not exists og_image_url         text,
  add column if not exists default_view         text not null default 'grid'
    check (default_view in ('grid','list')),
  add column if not exists product_sort_default text not null default 'popular',
  add column if not exists created_by           uuid references public.profiles(id),
  add column if not exists updated_by           uuid references public.profiles(id),
  add column if not exists updated_at           timestamptz not null default now();

-- Backfill status from the pre-existing is_active boolean (everything was active).
update public.categories set status = case when is_active then 'active' else 'inactive' end;

create unique index if not exists categories_slug_idx on public.categories(slug);
create index if not exists categories_status_idx on public.categories(status);
create index if not exists categories_featured_idx on public.categories(is_featured) where is_featured = true;
create index if not exists categories_homepage_idx on public.categories(show_on_homepage) where show_on_homepage = true;

-- Public reads require an actually-active category (previously unrestricted `true`,
-- so a draft/archived category was publicly queryable). Admins still see everything
-- via the existing "Admins can manage categories" ALL policy (RLS policies are OR'd).
drop policy if exists "Categories are public" on public.categories;
create policy "Categories are public" on public.categories for select using (status = 'active');

-- ─── CATEGORY ATTRIBUTES ───────────────────────────────────────────
-- The schema of filterable/searchable fields for a category (e.g. Fashion → Size,
-- Color). A filterable attribute IS the category's filter definition — kept as one
-- table instead of a separate category_filters table to avoid two tables describing
-- the same thing.
create table if not exists public.category_attributes (
  id             uuid primary key default uuid_generate_v4(),
  category_id    uuid not null references public.categories(id) on delete cascade,
  name           text not null,
  type           text not null default 'text'
    check (type in ('text','number','boolean','select','multiselect','color','size','range')),
  options        jsonb not null default '[]', -- choices for select/multiselect/color/size
  is_required    boolean not null default false,
  is_filterable  boolean not null default true,
  is_searchable  boolean not null default false,
  is_sortable    boolean not null default false,
  display_order  int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists category_attributes_category_id_idx on public.category_attributes(category_id);

alter table public.category_attributes enable row level security;
drop policy if exists "Category attributes are public" on public.category_attributes;
create policy "Category attributes are public" on public.category_attributes for select using (true);
drop policy if exists "Admins manage category attributes" on public.category_attributes;
create policy "Admins manage category attributes" on public.category_attributes for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- ─── SECONDARY CATEGORIES ──────────────────────────────────────────
-- products.category_id (existing column) stays the Primary Category. This junction
-- table adds Secondary Categories without disturbing that existing relationship.
create table if not exists public.product_categories (
  product_id   uuid not null references public.products(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_id_idx on public.product_categories(category_id);

alter table public.product_categories enable row level security;
drop policy if exists "Product categories are public" on public.product_categories;
create policy "Product categories are public" on public.product_categories for select using (true);
drop policy if exists "Admins manage product categories" on public.product_categories;
create policy "Admins manage product categories" on public.product_categories for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
drop policy if exists "Sellers manage own product categories" on public.product_categories;
create policy "Sellers manage own product categories" on public.product_categories for all
  using (product_id in (select id from public.products where seller_id = auth.uid()));

-- ─── Existing FK behavior relied on for category deletion (documented, not changed) ──
-- products.category_id_fkey and categories.parent_id_fkey are both ON DELETE NO ACTION:
-- deleting a category that still has products or subcategories pointing to it fails
-- at the database level. The admin app must reassign/clear those references first
-- (move products, move or orphan subcategories) before a hard delete — which is
-- exactly the "never silently delete products" behavior this spec requires. Archiving
-- (status='archived') never hits this at all since it's a soft delete.
