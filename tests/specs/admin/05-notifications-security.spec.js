import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '../../fixtures.js';

// ═══════════════════════════════════════════════════════════════
// PHASE 6 SECOND-PASS AUDIT — STATIC REGRESSION GUARDS
//
// These are source-text assertions, not browser/DB tests: there is no
// disposable Supabase database reachable from this environment, so
// nothing here claims to prove RLS/grant/RPC behavior against a live
// database (see the Phase 6 independent audit report for what actually
// requires that and is explicitly marked "not verified live"). What
// these guards DO prove, by reading the actual shipped source files:
//   - the exact vulnerable policy text can never be reintroduced by
//     schema.sql (the audit's C1 finding) without this suite failing;
//   - the exact non-constant-time comparison pattern can never return
//     to send-notification (the audit's H1 finding) without this suite
//     failing;
//   - the files that must never contain a secret, don't.
// Playwright is used here purely as the project's existing test
// runner/reporter — these tests never open a page.
// ═══════════════════════════════════════════════════════════════

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

test.describe('Phase 6 — static security regression guards (C1 / H1 / H2 / H3)', () => {

  test('C1 — schema.sql never recreates the open notifications INSERT policy', async () => {
    const schema = read('supabase/schema.sql');
    // The exact vulnerable call: an INSERT policy with WITH CHECK (true)
    // and no TO clause (applies to PUBLIC, including anon). Match on the
    // specific policy name + 'true' check together, not just "insert",
    // so a legitimate future insert policy with a real condition doesn't
    // false-positive this guard.
    const vulnerablePattern = /_create_policy_if_not_exists\(\s*'Service role can insert notifications'\s*,\s*'notifications'\s*,\s*'insert'\s*,\s*null\s*,\s*'true'\s*\)/;
    expect(schema).not.toMatch(vulnerablePattern);
    // And confirm the fix is actually present: schema.sql must itself
    // drop that exact policy name rather than silently omitting it (so a
    // database that still has it from before this fix gets cleaned up).
    expect(schema).toMatch(/drop policy if exists "Service role can insert notifications" on public\.notifications/);
  });

  test('C1 — no other SQL/seed/doc file recreates the vulnerable policy', async () => {
    const candidates = [
      'supabase/seed.sql',
      'supabase/notifications_migration.sql',
      'supabase/phase5_shipping_migration.sql',
      'supabase/phase4_orders_payments_migration.sql',
      'supabase/phase3_seller_kyc_migration.sql',
      'supabase/phase1_auth_hardening_migration.sql',
      'supabase/phase0_security_rbac_migration.sql',
    ];
    for (const file of candidates) {
      const full = path.join(ROOT, file);
      if (!fs.existsSync(full)) continue;
      const content = fs.readFileSync(full, 'utf8');
      expect(content, `${file} must not grant an unrestricted notifications INSERT`).not.toMatch(
        /insert\s+into\s+public\.notifications|'notifications'\s*,\s*'insert'\s*,\s*null\s*,\s*'true'/i
      );
    }
  });

  test('H1 — send-notification compares the internal secret in constant time, with no fallback', async () => {
    const fn = read('supabase/functions/send-notification/index.ts');
    // The vulnerable pattern this guards against: a direct !== compare
    // of the header against the configured secret.
    expect(fn).not.toMatch(/req\.headers\.get\('x-internal-secret'\)\s*!==\s*INTERNAL_SECRET/);
    // The fix must be present: a timing-safe comparison helper, used on
    // the request path, with no truthy-fallback branch that accepts a
    // request when the secret is unset.
    expect(fn).toMatch(/timingSafeEqual/);
    expect(fn).toMatch(/!INTERNAL_SECRET/);
  });

  test('H1 — send-notification never falls back to accepting an unverified request', async () => {
    const fn = read('supabase/functions/send-notification/index.ts');
    // Every code path to the service-role client / insert must stay
    // behind the secretIsValid gate — i.e. the client creation happens
    // strictly after the 401 early-return, not before it.
    const unauthorizedIdx = fn.indexOf("status: 401");
    const clientIdx = fn.indexOf('createClient(');
    expect(unauthorizedIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(-1);
    expect(clientIdx).toBeGreaterThan(unauthorizedIdx);
  });

  test('H2 — role_permissions grants staff self-read access to their own role', async () => {
    const migration = read('supabase/phase6_notifications_security_migration.sql');
    expect(migration).toMatch(/create policy "Staff can view own role's permissions" on public\.role_permissions for select/);
    expect(migration).toMatch(/staff_role_id from public\.staff_members\s*\n\s*where user_id = auth\.uid\(\) and status = 'active'/);
  });

  test('H3 — README documents the INTERNAL_FUNCTION_SECRET deployment checklist', async () => {
    const readme = read('README.md');
    expect(readme).toMatch(/INTERNAL_FUNCTION_SECRET/);
    expect(readme).toMatch(/supabase secrets set INTERNAL_FUNCTION_SECRET/);
    expect(readme).toMatch(/send-individual-notification/);
    expect(readme).toMatch(/on-order-status/);
    expect(readme).toMatch(/on-shipment-status/);
  });

  test('No service-role key or internal secret is ever referenced in client (web/mobile) source', async () => {
    const clientFiles = [
      'supabase-client.jsx',
      'mobile/clorivo-mobile/src/lib/supabase.js',
    ];
    for (const file of clientFiles) {
      const content = read(file);
      expect(content, `${file} must not reference the service-role key`).not.toMatch(/SERVICE_ROLE|service_role/);
      expect(content, `${file} must not reference the internal function secret`).not.toMatch(/INTERNAL_FUNCTION_SECRET|INTERNAL_SECRET|x-internal-secret/);
    }
  });

  test('All four webhook functions forward the internal secret to send-notification', async () => {
    const webhookFiles = [
      'supabase/functions/on-new-order/index.ts',
      'supabase/functions/on-order-status/index.ts',
      'supabase/functions/on-shipment-status/index.ts',
      'supabase/functions/on-new-message/index.ts',
    ];
    for (const file of webhookFiles) {
      const content = read(file);
      expect(content, `${file} must send x-internal-secret`).toMatch(/x-internal-secret/);
      expect(content, `${file} must read INTERNAL_FUNCTION_SECRET from env`).toMatch(/Deno\.env\.get\('INTERNAL_FUNCTION_SECRET'\)/);
    }
  });

  test('notifications.type column has no CHECK constraint that could reject RPC-inserted values', async () => {
    const schema = read('supabase/schema.sql');
    const tableMatch = schema.match(/create table if not exists public\.notifications \(([\s\S]*?)\);/);
    expect(tableMatch).toBeTruthy();
    expect(tableMatch[1]).not.toMatch(/check\s*\(/i);
  });

});
