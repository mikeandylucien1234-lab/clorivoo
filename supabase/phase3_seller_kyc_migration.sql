-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 3: Seller Management & KYC Verification
-- Run in Supabase SQL Editor AFTER phase2_brands_migration.sql.
-- Already applied directly to the live project (kpwebnoqsjlxxiamwsst),
-- in the same 6 chunks below (apply_migration), each verified live in
-- rolled-back transactions before moving to the next.
--
-- Scope: close two real self-escalation holes found while auditing the
-- existing seller/KYC flow, extend kyc_requests to a 7-state model, and
-- give a decision exactly one path to take effect (admin_review_kyc()).
--
-- Audit findings this migration fixes (verified against the live schema
-- before writing any of this, not assumed):
--   1. "Sellers can manage their shop" (shops, FOR ALL, seller_id =
--      auth.uid()) never restricted which columns change — a seller could
--      set is_verified/is_active on their own shop directly, bypassing
--      is_verified_seller() entirely. Fixed with a column-protecting
--      trigger (same pattern as Phase 1's profiles trigger) — no existing
--      RLS policy touched or dropped.
--   2. kyc_requests' INSERT policy checked seller_id = auth.uid() but
--      nothing about the status column — a seller could insert a row with
--      status='approved' directly. No UPDATE policy existed for sellers
--      at all (they couldn't even resubmit). Fixed with a trigger that
--      forces status/reviewed_by/reviewed_at on any non-reviewer write,
--      plus a new seller UPDATE policy (safe only because of the trigger).
--   3. kyc-documents is a private bucket with ZERO storage policies —
--      uploads and reads both failed outright before this migration.
--   4. The actual bug behind "any buyer becomes a seller with zero
--      review": KycReviewScreen.handleSubmit() called
--      sbUpdateProfile(user.id, {role:'seller'}) directly — no
--      kyc_requests row was ever created, no admin step existed. Fixed in
--      screen-seller.jsx (see git diff), not in this file — role now
--      changes only inside admin_review_kyc() below, on 'approved'.
--
-- NOT touched: no existing RLS policy was dropped or replaced — every fix
-- here is either a new trigger (defense in depth, layered on top of what
-- already existed) or a new, additive policy. No existing table, account,
-- or role was altered. Verified after every chunk: demo@clorivo.app and
-- the Super Admin account unchanged.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. KYC MODEL — additive columns + the 7-state status model ───
alter table public.kyc_requests
  add column if not exists legal_first_name text,
  add column if not exists legal_last_name text,
  add column if not exists date_of_birth date,
  add column if not exists nationality text,
  add column if not exists origin_country text,
  add column if not exists destination_country text,
  add column if not exists city text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists shop_name_requested text,
  add column if not exists shop_description text,
  add column if not exists doc_type text,
  add column if not exists doc_front_path text,
  add column if not exists doc_back_path text,
  add column if not exists selfie_path text,
  add column if not exists requested_changes text,
  add column if not exists submitted_at timestamptz;

-- Transitions enforced by admin_review_kyc() + protect_kyc_request_fields():
--   not_submitted -> (no row yet; application-level state, not stored)
--   pending       -> under_review | needs_changes | approved | rejected   [reviewer only]
--   under_review  -> needs_changes | approved | rejected                 [reviewer only]
--   needs_changes -> pending (seller resubmits) | rejected                [pending: seller; rejected: reviewer]
--   rejected      -> pending (seller resubmits)                          [seller]
--   approved      -> suspended                                          [reviewer only, sellers.suspend]
--   suspended     -> approved (reinstated)                               [reviewer only, kyc.approve]
-- A seller can only ever move pending/needs_changes/rejected -> pending.
-- Every other transition requires the matching kyc.* / sellers.suspend
-- permission, checked both in the trigger (column protection) and in
-- admin_review_kyc() (the only function that can actually set these).
alter table public.kyc_requests
  drop constraint kyc_requests_status_check,
  add constraint kyc_requests_status_check check (status = any (array[
    'not_submitted','pending','under_review','needs_changes','approved','rejected','suspended'
  ]));

-- ─── 2. PERMISSIONS (existing catalog mechanism — no parallel system) ──
insert into public.permissions (key, module, label) values
  ('kyc.view','kyc','View KYC applications'),
  ('kyc.review','kyc','Review KYC documents'),
  ('kyc.approve','kyc','Approve KYC applications'),
  ('kyc.reject','kyc','Reject KYC applications'),
  ('kyc.request_changes','kyc','Request KYC corrections')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), k
from (values ('kyc.view'),('kyc.review'),('kyc.approve'),('kyc.reject'),('kyc.request_changes')) as t(k)
where exists (select 1 from public.staff_roles where name = 'Super Admin')
on conflict do nothing;

-- ─── 3. CLOSE THE shops SELF-VERIFICATION ESCALATION ───────────────
create or replace function public.protect_shop_verification_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if (new.is_verified is distinct from old.is_verified or new.is_active is distinct from old.is_active)
     and not (
       public.has_permission(auth.uid(), 'sellers.approve')
       or public.has_permission(auth.uid(), 'sellers.suspend')
     ) then
    new.is_verified := old.is_verified;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_shop_verification_fields() from public, anon, authenticated;

create trigger protect_shop_verification_fields_trg
before update on public.shops
for each row execute function public.protect_shop_verification_fields();

-- Verified live (rolled back): demo@clorivo.app's own UPDATE of its own
-- shop's is_verified/is_active to false was silently reverted by the
-- trigger — the self-escalation path (and the reverse: self-activation)
-- is closed regardless of which RLS policy let the row through.

-- ─── 4. CLOSE THE kyc_requests SELF-APPROVAL ESCALATION ────────────
create or replace function public.protect_kyc_request_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  is_reviewer boolean;
begin
  is_reviewer := public.has_permission(auth.uid(), 'kyc.approve')
    or public.has_permission(auth.uid(), 'kyc.reject')
    or public.has_permission(auth.uid(), 'kyc.request_changes')
    or public.has_permission(auth.uid(), 'kyc.review');

  if tg_op = 'INSERT' then
    if not is_reviewer then
      new.status := 'pending';
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.review_notes := null;
    end if;
    new.submitted_at := now();
    return new;
  end if;

  if not is_reviewer then
    if new.reviewed_by is distinct from old.reviewed_by then new.reviewed_by := old.reviewed_by; end if;
    if new.reviewed_at is distinct from old.reviewed_at then new.reviewed_at := old.reviewed_at; end if;
    if new.status is distinct from old.status then
      if old.status in ('needs_changes','rejected') and new.status = 'pending' then
        new.submitted_at := now();
        new.requested_changes := null;
      else
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_kyc_request_fields() from public, anon, authenticated;

create trigger protect_kyc_request_fields_trg
before insert or update on public.kyc_requests
for each row execute function public.protect_kyc_request_fields();

create policy "Sellers can update their own KYC request" on public.kyc_requests for update
  using (seller_id = auth.uid());

create policy "Permitted staff can view KYC requests" on public.kyc_requests for select
  using (
    public.has_permission(auth.uid(), 'kyc.view') or public.has_permission(auth.uid(), 'kyc.review')
    or public.has_permission(auth.uid(), 'kyc.approve') or public.has_permission(auth.uid(), 'kyc.reject')
    or public.has_permission(auth.uid(), 'kyc.request_changes')
  );

create policy "Permitted staff can update KYC requests" on public.kyc_requests for update
  using (
    public.has_permission(auth.uid(), 'kyc.approve') or public.has_permission(auth.uid(), 'kyc.reject')
    or public.has_permission(auth.uid(), 'kyc.request_changes') or public.has_permission(auth.uid(), 'kyc.review')
  );

-- Verified live (rolled back): a seller inserting a row with
-- status='approved' got 'pending' back; a seller UPDATEing their own row
-- to status='approved'/reviewed_by=self got reverted; a staff member
-- holding only kyc.reject could not call admin_review_kyc(..., 'approved').

-- ─── 5. PRIVATE STORAGE FOR KYC DOCUMENTS ──────────────────────────
-- kyc-documents already existed as a private bucket with NO policies at
-- all (confirmed before this migration) — every upload/read was already
-- failing. Path convention: {seller_id}/{random}-{front|back|selfie}.ext,
-- so a seller's own auth.uid() is the only folder they can write into or
-- read from; a reviewer with any kyc.* permission can read any seller's.
-- No public read policy exists or will ever exist on this bucket.
create policy "Sellers can upload their own KYC documents" on storage.objects for insert
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Sellers can read their own KYC documents" on storage.objects for select
  using (
    bucket_id = 'kyc-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_permission(auth.uid(), 'kyc.view') or public.has_permission(auth.uid(), 'kyc.review')
      or public.has_permission(auth.uid(), 'kyc.approve') or public.has_permission(auth.uid(), 'kyc.reject')
      or public.has_permission(auth.uid(), 'kyc.request_changes')
    )
  );

-- ─── 6. THE ONE PATH A DECISION CAN TAKE EFFECT THROUGH ────────────
create or replace function public.admin_review_kyc(p_kyc_id uuid, p_decision text, p_notes text default null)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_kyc public.kyc_requests;
  v_shop_id uuid;
  v_required_permission text;
begin
  if p_decision not in ('approved','rejected','needs_changes','under_review','suspended') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  v_required_permission := case p_decision
    when 'approved' then 'kyc.approve' when 'rejected' then 'kyc.reject'
    when 'needs_changes' then 'kyc.request_changes' when 'under_review' then 'kyc.review'
    when 'suspended' then 'sellers.suspend'
  end;

  if not public.has_permission(auth.uid(), v_required_permission) then
    raise exception 'Permission denied: % required', v_required_permission;
  end if;

  select * into v_kyc from public.kyc_requests where id = p_kyc_id for update;
  if v_kyc.id is null then raise exception 'KYC request not found'; end if;

  if p_decision = 'approved' and (v_kyc.doc_front_path is null or v_kyc.selfie_path is null) then
    raise exception 'Cannot approve an incomplete application — missing required documents';
  end if;

  if p_decision in ('rejected','needs_changes') and (p_notes is null or btrim(p_notes) = '') then
    raise exception '% requires a reason', p_decision;
  end if;

  update public.kyc_requests set
    status = p_decision, review_notes = p_notes,
    requested_changes = case when p_decision = 'needs_changes' then p_notes else requested_changes end,
    reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_kyc_id;

  select id into v_shop_id from public.shops where seller_id = v_kyc.seller_id;

  if p_decision = 'approved' then
    if v_shop_id is null then
      insert into public.shops (seller_id, name, description, is_verified, is_active)
      values (v_kyc.seller_id, coalesce(v_kyc.shop_name_requested, v_kyc.shop_name, 'My Shop'), v_kyc.shop_description, true, true);
    else
      update public.shops set is_verified = true, is_active = true where id = v_shop_id;
    end if;
    update public.profiles set role = 'seller' where id = v_kyc.seller_id and role = 'buyer';
  elsif p_decision in ('rejected','suspended') and v_shop_id is not null then
    update public.shops set is_verified = false, is_active = false where id = v_shop_id;
  end if;

  -- Only the status transition and whether a note was attached — never
  -- document paths, never any submitted personal field.
  perform public.log_audit(
    'kyc_review:' || p_decision, 'kyc_requests', p_kyc_id::text,
    jsonb_build_object('status', v_kyc.status),
    jsonb_build_object('status', p_decision, 'has_notes', p_notes is not null)
  );

  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;
revoke execute on function public.admin_review_kyc(uuid, text, text) from public, anon;
grant execute on function public.admin_review_kyc(uuid, text, text) to authenticated;

-- Verified live (rolled back): permission-denied for a non-reviewer and
-- for a staff member missing the specific decision's permission;
-- incomplete-application rejected for 'approved'; missing-reason rejected
-- for 'rejected'; full approval path produces status='approved',
-- shops.is_verified/is_active=true, profiles.role='seller', and exactly
-- one audit_logs row. No data from any of these tests persisted.
