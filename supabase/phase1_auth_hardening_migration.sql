-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 1: Authentication, session & account security hardening
-- Run in Supabase SQL Editor AFTER phase0_security_rbac_migration.sql.
-- Already applied directly to the live project (kpwebnoqsjlxxiamwsst).
--
-- Scope — fixes for two real gaps found while auditing the existing
-- authentication/RBAC implementation (Phase 0), not a rebuild of it:
--
--   1. PRIVILEGE ESCALATION: the only UPDATE policy on public.profiles was
--      "Users can update own profile" USING (auth.uid() = id) with no
--      WITH CHECK restricting *which* columns change. Any authenticated
--      user could call `supabase.from('profiles').update({role:'admin',
--      status:'active'}).eq('id', myId)` directly from the client and RLS
--      would allow it — role/status were never actually protected.
--      Fixed with a BEFORE UPDATE trigger that reverts role/status unless
--      the acting user already holds the matching permission, independent
--      of whichever RLS policy let the row through (defense in depth).
--
--   2. BROKEN ADMIN WRITES (functional bug, found as a side effect of #1):
--      profiles had NO policy letting an admin/staff member update a
--      DIFFERENT user's row at all — sbAdminSetAccountStatus /
--      sbAdminUpdateUser / sbAdminAddStaffMember's role flip were silently
--      no-ops against any other account. Fixed with a dedicated admin/
--      permitted-staff UPDATE policy.
--
--   3. RPC OVER-EXPOSURE: has_permission(), is_active_account(),
--      is_verified_seller() and log_audit() were only ever explicitly
--      GRANTed to authenticated (+anon for is_active_account) — but
--      PostgreSQL grants EXECUTE on every new function to PUBLIC by
--      default, and that default grant was never revoked. The Supabase
--      advisor confirmed anon could call all four, including log_audit()
--      — meaning an unauthenticated client could insert rows into
--      audit_logs. Fixed by revoking EXECUTE from PUBLIC/anon on all four
--      and keeping only the explicit authenticated grants.
--
-- Verified live, inside rolled-back transactions (no data changed):
--   - A non-privileged account updating its own row to role='admin' is
--     reverted to its original role by the trigger.
--   - The same account cannot touch another account's row at all (0 rows).
--   - The Super Admin account can change another account's status.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CLOSE THE PUBLIC EXECUTE GRANT ON RBAC/AUDIT RPCS ──────────
revoke execute on function public.has_permission(uuid, text) from public, anon;
revoke execute on function public.is_active_account(uuid) from public, anon;
revoke execute on function public.is_verified_seller(uuid) from public, anon;
revoke execute on function public.log_audit(text, text, text, jsonb, jsonb) from public, anon;

grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_active_account(uuid) to authenticated;
grant execute on function public.is_verified_seller(uuid) to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb, jsonb) to authenticated;

-- ─── 2. ADMIN / PERMITTED-STAFF WRITE ACCESS TO OTHER PROFILES ─────
create policy "Admins and permitted staff can update any profile" on public.profiles for update
  using (
    public.has_permission(auth.uid(), 'staff.manage')
    or public.has_permission(auth.uid(), 'sellers.suspend')
    or public.has_permission(auth.uid(), 'customers.suspend')
  );

-- ─── 3. PROTECT role/status FROM BEING SET THROUGH ANY OTHER PATH ──
-- Fires on every UPDATE regardless of which policy allowed the row
-- through (self-update or the admin policy above), so self-escalation
-- through the self-update policy is blocked even though that policy's
-- USING clause only checks row ownership, not column intent.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.has_permission(auth.uid(), 'staff.manage') then
    new.role := old.role;
  end if;
  if new.status is distinct from old.status
     and not (public.has_permission(auth.uid(), 'staff.manage')
              or public.has_permission(auth.uid(), 'sellers.suspend')
              or public.has_permission(auth.uid(), 'customers.suspend')) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger protect_profile_privileged_fields_trg
before update on public.profiles
for each row execute function public.protect_profile_privileged_fields();

-- Trigger functions are invoked by the trigger mechanism itself, never via
-- PostgREST RPC — but by default Postgres still grants EXECUTE on them to
-- PUBLIC, which the advisor flags as a (harmless but needless) RPC surface.
-- Revoking it does not affect the trigger firing (verified live).
revoke execute on function public.protect_profile_privileged_fields() from public, anon, authenticated;
