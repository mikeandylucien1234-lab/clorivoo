-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 6: Notifications security hardening
-- NOT applied to the live project. Written for review per the
-- Phase 6 security audit findings. Run once in the Supabase SQL
-- Editor (or via a migration tool) only after approval.
--
-- Fixes the audit's core finding: the notifications table's only
-- INSERT policy was `WITH CHECK (true)` applied to PUBLIC (every
-- role, including anon) despite being named "Service role can
-- insert notifications." Combined with send-broadcast/send-notification
-- having no caller-identity check of their own, this let anyone —
-- logged in or not — broadcast or insert notifications for any user.
--
-- Pattern mirrors the one already used correctly elsewhere in this
-- codebase (admin_review_kyc, admin_override_shipment, create_order):
-- a SECURITY DEFINER RPC is the only write path; the table itself has
-- no client-facing INSERT policy; has_permission() does the real
-- server-side check; log_audit() (already tamper-resistant — no
-- direct audit_logs insert policy exists for any client) records
-- every attempt.
--
-- UPDATED after the independent second-pass audit: section 5 below adds
-- the H2 fix (staff visibility of their own notification permissions).
-- The audit's other two fixes — C1 (schema.sql recreating the dropped
-- open INSERT policy on re-run) and H1 (constant-time secret comparison
-- in send-notification) — are not SQL changes; see schema.sql and
-- supabase/functions/send-notification/index.ts respectively.
--
-- UPDATED again (live-verification finding): sections 3 and 4's denied-
-- attempt audit log entry never actually survived. Both functions called
-- log_audit() and then `raise exception` in the same breath — PL/pgSQL
-- has no autonomous-transaction mechanism, so the uncaught exception
-- rolled back everything in the transaction, that log_audit() insert
-- included. Confirmed live, repeatedly, with a disposable PostgreSQL 17
-- database (every denial produced zero audit_logs rows). Fixed by
-- returning a structured {ok:false, error} result instead of raising on
-- permission denial — the function then completes without error, so the
-- transaction commits and the audit row persists. This required updating
-- supabase/functions/send-broadcast/index.ts and
-- supabase/functions/send-individual-notification/index.ts to check
-- `data.ok` (not just `error`) and respond 403 accordingly — every other
-- caller of these two RPCs either already ignores the result (web's
-- sbAdminModerateProduct, always admin-context) or only ever sees the
-- Edge Function's HTTP response (mobile, web's sbAdminSendBroadcast), so
-- no other file needed to change. has_permission() itself, RLS, and
-- every grant/revoke below are unchanged — only how a denial is reported
-- downstream of the unchanged check.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CLOSE THE OPEN POLICY ───────────────────────────────────────
-- The three original policies on notifications were:
--   'Users see their notifications'          (select, user_id = auth.uid())   — correct, untouched
--   'Users can update their notifications'   (update, user_id = auth.uid())   — correct, untouched
--   'Service role can insert notifications'  (insert, WITH CHECK (true))      — THE VULNERABILITY, dropped below
-- No replacement client-facing insert policy is created. Direct
-- `insert into notifications` from anon or authenticated is now
-- denied by default; the only ways a row gets created are:
--   a) the admin_send_broadcast() / admin_send_notification() RPCs
--      below, which run as SECURITY DEFINER (bypassing RLS only for
--      their own, now-authorized, insert) — reachable by any
--      authenticated client, gated by has_permission() inside the
--      function body, not by this table's RLS;
--   b) the send-notification Edge Function's internal use of the
--      service-role key (which always bypasses RLS regardless of
--      table policies) — unaffected by this DROP, still works for
--      every existing transactional flow (orders/payments/KYC/
--      shipping/messages), hardened separately at the Edge Function
--      layer (see the accompanying .ts changes, not applied by this
--      SQL file).
drop policy if exists "Service role can insert notifications" on public.notifications;

-- ─── 2. PERMISSION CATALOG ──────────────────────────────────────────
-- Did not exist before this migration — has_permission() had nothing
-- to check for notifications. Same seed pattern as the starter catalog
-- in phase0_security_rbac_migration.sql:230-248.
insert into public.permissions (key, module, label) values
  ('notifications.broadcast','notifications','Send broadcast notifications'),
  ('notifications.send_individual','notifications','Send a notification to one user')
on conflict (key) do nothing;

-- Super Admin (role='admin' bypasses has_permission() entirely already,
-- same as every other permission — this grant is informational/for
-- future staff-role cloning, not load-bearing, matching the existing
-- comment on this exact pattern in phase0).
insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), key
from public.permissions
where key in ('notifications.broadcast','notifications.send_individual')
on conflict do nothing;

-- ─── 3. admin_send_broadcast() ──────────────────────────────────────
-- The only path that may insert a batch of notifications for a
-- segment of users. auth.uid() is read server-side from the caller's
-- own verified JWT (via the RLS/RPC execution context) — it is never
-- a client-supplied parameter, so it cannot be spoofed by passing a
-- different user_id/role in the request body (there is no such
-- parameter at all).
create or replace function public.admin_send_broadcast(
  p_segment text default 'all',
  p_type    text default 'promo',
  p_title   text default null,
  p_body    text default null
)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_recipient_count int;
  v_push_tokens jsonb;
begin
  if p_segment not in ('all','buyers','sellers') then
    raise exception 'Invalid segment: %', p_segment;
  end if;
  if p_title is null or btrim(p_title) = '' or p_body is null or btrim(p_body) = '' then
    raise exception 'Title and body are required';
  end if;

  if not public.has_permission(auth.uid(), 'notifications.broadcast') then
    -- Audit the denied attempt too (item: "record every broadcast
    -- attempt" / "record success or failure") — log_audit() hardcodes
    -- actor_id to auth.uid() itself, so this entry cannot be forged
    -- to look like it came from someone else.
    --
    -- FIX (confirmed by live testing): this used to `raise exception`
    -- right after the log_audit() call above. PL/pgSQL has no
    -- autonomous-transaction mechanism, so an uncaught exception rolls
    -- back everything in the current transaction — including that
    -- insert — the instant it propagates out. The log entry never
    -- actually survived. Returning a structured {ok:false, error}
    -- result instead means the function completes without error, so
    -- the transaction commits normally and the audit row persists.
    -- The caller (send-broadcast Edge Function) checks `data.ok` and
    -- responds 403 itself — the permission check and its denial are
    -- unchanged; only how the denial is reported downstream changes.
    perform public.log_audit(
      'Broadcast denied (missing notifications.broadcast permission)',
      'notifications', null, null,
      jsonb_build_object('segment', p_segment, 'type', p_type, 'title', p_title)
    );
    return jsonb_build_object('ok', false, 'error', 'Permission denied: notifications.broadcast required');
  end if;

  with target as (
    select id, push_token
    from public.profiles
    where push_token is not null
      and public.is_active_account(id)  -- never spam a suspended/banned account
      and case p_segment
            when 'buyers'  then role = 'buyer'
            when 'sellers' then role = 'seller'
            else true
          end
  )
  insert into public.notifications (user_id, type, title, body, data)
  select id, p_type, p_title, p_body, jsonb_build_object('broadcast', true)
  from target;

  get diagnostics v_recipient_count = row_count;

  select coalesce(jsonb_agg(push_token), '[]'::jsonb) into v_push_tokens
  from public.profiles
  where push_token is not null
    and public.is_active_account(id)
    and case p_segment
          when 'buyers'  then role = 'buyer'
          when 'sellers' then role = 'seller'
          else true
        end;

  perform public.log_audit(
    'Sent broadcast notification', 'notifications', null, null,
    jsonb_build_object('segment', p_segment, 'type', p_type, 'title', p_title, 'recipients', v_recipient_count)
  );

  -- push_tokens is consumed server-side only, by the send-broadcast Edge
  -- Function's own fan-out to Expo — never rendered back to any client UI.
  return jsonb_build_object('ok', true, 'recipients', v_recipient_count, 'push_tokens', v_push_tokens);
end;
$$;

grant execute on function public.admin_send_broadcast(text, text, text, text) to authenticated;
revoke execute on function public.admin_send_broadcast(text, text, text, text) from public, anon;

-- ─── 4. admin_send_notification() ───────────────────────────────────
-- Same pattern, for a single targeted recipient — closes the same hole
-- for Scenario C in the audit (impersonating a transactional
-- notification to one named victim) and is what the web/mobile admin
-- "send to one user" UI should call instead of inserting directly.
create or replace function public.admin_send_notification(
  p_user_id uuid,
  p_type    text default 'system',
  p_title   text default null,
  p_body    text default null
)
returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_push_token text;
begin
  if p_user_id is null then
    raise exception 'A recipient user_id is required';
  end if;
  if p_title is null or btrim(p_title) = '' or p_body is null or btrim(p_body) = '' then
    raise exception 'Title and body are required';
  end if;

  if not public.has_permission(auth.uid(), 'notifications.send_individual') then
    -- Same fix and same reasoning as admin_send_broadcast() above: return
    -- a structured denial instead of raising, so this log_audit() call
    -- actually commits instead of being rolled back by a subsequent
    -- uncaught exception.
    perform public.log_audit(
      'Individual notification denied (missing notifications.send_individual permission)',
      'notifications', p_user_id::text, null,
      jsonb_build_object('title', p_title)
    );
    return jsonb_build_object('ok', false, 'error', 'Permission denied: notifications.send_individual required');
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (p_user_id, p_type, p_title, p_body, '{}'::jsonb);

  select push_token into v_push_token
  from public.profiles
  where id = p_user_id and public.is_active_account(id);

  perform public.log_audit(
    'Sent individual notification', 'notifications', p_user_id::text, null,
    jsonb_build_object('type', p_type, 'title', p_title)
  );

  return jsonb_build_object('ok', true, 'push_token', v_push_token);
end;
$$;

grant execute on function public.admin_send_notification(uuid, text, text, text) to authenticated;
revoke execute on function public.admin_send_notification(uuid, text, text, text) from public, anon;

-- ─── 5. STAFF CAN SEE THEIR OWN NOTIFICATION PERMISSIONS (H2 fix) ──────
-- `role_permissions`'s only pre-existing SELECT policy ("Staff can view
-- role permissions", phase0_security_rbac_migration.sql) requires
-- role='admin' OR has_permission(auth.uid(),'staff.view'). A staff
-- member who is granted notifications.broadcast / notifications.send_individual
-- but NOT staff.view (plausible for a marketing/support role scoped to
-- just notifications) gets an empty result from the client's own
-- `role_permissions` query in sbGetMyAccessContext(), so the web/mobile
-- Broadcast UI incorrectly hides itself from someone who IS authorized.
--
-- This never weakened server-side enforcement: has_permission() is
-- SECURITY DEFINER and reads role_permissions internally, bypassing RLS,
-- so a direct RPC call already succeeded for such a staff member even
-- before this fix — this is a UI-visibility bug, not a vulnerability,
-- and this policy addition does not touch has_permission() or either
-- RPC's authorization check, which remain authoritative.
--
-- Additive policy (RLS OR-combines all matching policies for a role) —
-- a staff member may now also see the permission rows that belong to
-- their OWN active staff role, regardless of staff.view. It does not
-- let them see other roles' permissions and grants no write access.
drop policy if exists "Staff can view own role's permissions" on public.role_permissions;
create policy "Staff can view own role's permissions" on public.role_permissions for select
  using (
    role_id in (
      select staff_role_id from public.staff_members
      where user_id = auth.uid() and status = 'active'
    )
  );
