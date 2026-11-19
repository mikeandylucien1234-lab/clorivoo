-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 8, Lot 4: a real, persistent wishlist.
-- Previously window._WISHLIST (pure client memory, lost on reload)
-- across screen-wishlist.jsx, screen-search.jsx, screen-public-shop.jsx
-- and the Profile stat tile in screen-account.jsx.
--
-- Scope: the core add/remove/list wishlist is now real and persistent.
-- Price-drop alerts and the "Shared Collection" link remain demo —
-- they are a separate feature (notification scheduling / public share
-- tokens) not attempted in this lot; documented as a known boundary,
-- not a cut corner.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint wishlists_unique unique (user_id, product_id)
);
create index if not exists wishlists_user_idx on public.wishlists(user_id);
alter table public.wishlists enable row level security;

drop policy if exists "Users manage their own wishlist" on public.wishlists;
create policy "Users manage their own wishlist" on public.wishlists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
