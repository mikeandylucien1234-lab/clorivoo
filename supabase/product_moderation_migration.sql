-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — Product moderation migration
-- Run in Supabase SQL Editor AFTER schema.sql
--
-- Adds an approval workflow on top of the existing `status`
-- (active/draft/archived) column, which already covers Published vs
-- Draft. A product can be Approved but still in Draft (not yet
-- published), so these are kept as two independent fields rather than
-- collapsing them into one enum.
-- ═══════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending','approved','rejected'));
alter table public.products
  add column if not exists rejection_reason text;

-- Existing rows predate moderation and were all admin-created — leave them approved.
update public.products set approval_status = 'approved' where approval_status is null;

create index if not exists products_approval_status_idx on public.products(approval_status);

-- Admin-created products aren't tied to a seller's shop — they're platform inventory.
-- shop_id was NOT NULL, which made every admin "+ New product" insert fail RLS/NOT NULL
-- silently (the UI never checked the error), so nothing the admin created ever actually
-- persisted. Making it nullable lets the admin Products page actually save.
alter table public.products alter column shop_id drop not null;

-- Defense in depth: public reads should never surface an unapproved product even if its
-- `status` is somehow 'active' (e.g. a bug upstream, or a future seller-submission path
-- that doesn't go through this admin flow).
drop policy if exists "Active products are public" on public.products;
create policy "Active products are public" on public.products for select
  using (status = 'active' and approval_status = 'approved');

-- ─── STAFF MODERATOR ACCESS (found missing during the same audit) ──
-- Only two ALL policies existed on products before this: role='admin',
-- and the two seller-own-shop ones. A staff member holding
-- 'products.approve' (seeded in Phase 0, never granted an actual RLS
-- path) had no policy letting them reach any row here at all —
-- confirmed live: an UPDATE from such a session matched 0 rows,
-- blocked by RLS before protect_product_moderation_fields_trg below
-- even runs. This is what actually lets a permitted staff moderator
-- (not just role='admin') approve/reject, per the same
-- has_permission() check the trigger uses — the trigger alone cannot
-- compensate for an RLS policy that never let the row through.
drop policy if exists "Permitted staff can moderate products" on public.products;
create policy "Permitted staff can moderate products" on public.products for all to authenticated
  using (public.has_permission(auth.uid(), 'products.approve'));

-- ─── ANON READ ACCESS FIX ────────────────────────────────────────────
-- Found investigating the fix above: none of the non-public policies on
-- products carried a `TO` clause, so they applied implicitly to every
-- role, anon included. Postgres must evaluate every applicable policy's
-- USING clause for a query, even ones that can't grant it — and anon has
-- no EXECUTE on is_active_account()/has_permission() (revoked by Phase 1),
-- so a bare anon SELECT on products errored out entirely instead of just
-- falling through to "Active products are public". Scoping these 4
-- policies to `authenticated` is the idiomatic fix: Postgres then skips
-- their USING clauses for anon altogether, and the public SELECT policy
-- (unchanged) still lets anon read approved+active rows. This only
-- narrows who these 4 policies apply to — their USING conditions are
-- untouched — so it cannot grant anon any access it didn't already have.
drop policy if exists "Sellers can manage own products by seller_id" on public.products;
create policy "Sellers can manage own products by seller_id" on public.products for all to authenticated
  using (seller_id = auth.uid() and public.is_active_account(auth.uid()) and public.is_verified_seller(auth.uid()));

drop policy if exists "Sellers can manage their products" on public.products;
create policy "Sellers can manage their products" on public.products for all to authenticated
  using (shop_id in (select id from shops where shops.seller_id = auth.uid()) and public.is_active_account(auth.uid()) and public.is_verified_seller(auth.uid()));

drop policy if exists "Admins can manage all products" on public.products;
create policy "Admins can manage all products" on public.products for all to authenticated
  using ((select role from profiles where profiles.id = auth.uid()) = 'admin');

-- ─── SELLER SELF-MODERATION PROTECTION ──────────────────────────────
-- Group B audit finding: schema.sql's "Sellers can manage their products"
-- is a FOR ALL policy scoped only by shop_id/seller_id, with no WITH
-- CHECK restricting which columns a seller may change on their own row.
-- Combined with approval_status's own DEFAULT above ('approved' — correct
-- for the pre-moderation admin-only products this column was added for),
-- a seller could set approval_status='approved' directly (bypassing the
-- review queue entirely), or simply omit the column on a raw INSERT and
-- get the same result from the default.
--
-- Same pattern as protect_profile_privileged_fields_trg
-- (phase1_auth_hardening_migration.sql): a BEFORE INSERT OR UPDATE
-- trigger forces/reverts approval_status and rejection_reason unless the
-- acting user holds 'products.approve' — seeded in Phase 0's permission
-- catalog already, granted to Super Admin there already, but never
-- actually enforced anywhere until now. role='admin' bypasses
-- has_permission() itself, so sbAdminCreateProduct (explicit
-- approval_status:'approved' on insert) and sbAdminModerateProduct
-- (explicit approval_status/rejection_reason on update) are unaffected.
-- `status` (active/draft/archived — publish/unpublish) is deliberately
-- left out: that's a publish toggle a seller legitimately owns on their
-- own already-approved listings, not moderation metadata, and the
-- policy above already keeps an unapproved product unlisted regardless
-- of its `status` value.
create or replace function public.protect_product_moderation_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if not public.has_permission(auth.uid(), 'products.approve') then
      new.approval_status := 'pending';
      new.rejection_reason := null;
    end if;
    return new;
  end if;

  if new.approval_status is distinct from old.approval_status
     and not public.has_permission(auth.uid(), 'products.approve') then
    new.approval_status := old.approval_status;
  end if;
  if new.rejection_reason is distinct from old.rejection_reason
     and not public.has_permission(auth.uid(), 'products.approve') then
    new.rejection_reason := old.rejection_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_product_moderation_fields_trg on public.products;
create trigger protect_product_moderation_fields_trg
before insert or update on public.products
for each row execute function public.protect_product_moderation_fields();

-- Trigger functions are invoked by the trigger mechanism itself, never via
-- PostgREST RPC — matches the same revoke already applied to
-- protect_profile_privileged_fields() in Phase 1 for the identical reason.
revoke execute on function public.protect_product_moderation_fields() from public, anon, authenticated;
