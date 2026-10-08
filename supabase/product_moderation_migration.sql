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
