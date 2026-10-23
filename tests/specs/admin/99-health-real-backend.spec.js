// Manual, opt-in verification spec for the Admin "System Health" section
// against the REAL Supabase backend (project kpwebnoqsjlxxiamwsst) — not
// the mocked-auth suite under tests/specs/. Every other admin spec uses
// mockAuth() (tests/helpers/navigate.js) to stub window.sb* functions
// entirely; Health's whole point is to prove the real Database, Auth,
// Storage, Edge Functions and Realtime services are genuinely reachable,
// so it must sign in with a REAL Supabase Auth session and let every
// sbAdminHealthPing/sbAdminCheck*/sbAdminRecordHealthCheck call hit the
// real network — nothing here is mocked.
//
// Opt-in: every test here is skipped (test.skip at describe level) unless
// QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD are set in the environment, so a
// plain `npm test` / CI run without those variables never touches the
// real network and never requires real credentials. Run it explicitly:
//
//   QA_ADMIN_EMAIL=... QA_ADMIN_PASSWORD=... \
//   QA_STAFF_NO_HEALTH_EMAIL=... QA_STAFF_NO_HEALTH_PASSWORD=... \
//   npx playwright test specs/admin/99-health-real-backend.spec.js --project=admin
//
// Credentials are read from the environment only — never hardcoded here
// and never committed anywhere.
import { test, expect } from '../../fixtures.js';
import { goto } from '../../helpers/navigate.js';

const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD;
const STAFF_EMAIL = process.env.QA_STAFF_NO_HEALTH_EMAIL;
const STAFF_PASSWORD = process.env.QA_STAFF_NO_HEALTH_PASSWORD;

test.describe('Admin — System Health (real backend)', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'QA_ADMIN_EMAIL / QA_ADMIN_PASSWORD not set — skipping real-backend Health tests.');

  test('real admin: all 5 services check ok, history persists, no hardcoded placeholder text', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.sbSignIn === 'function');
    const signIn = await page.evaluate(async ([email, pass]) => {
      const { data, error } = await window.sbSignIn(email, pass);
      return { ok: !!data?.user, error: error?.message };
    }, [ADMIN_EMAIL, ADMIN_PASSWORD]);
    expect(signIn.ok, `sign-in failed: ${signIn.error}`).toBe(true);

    await goto(page, 'admin', { section: 'health' });

    // Never the old hardcoded placeholder text again.
    await expect(page.getByText('Project paused')).toHaveCount(0);

    await expect(page.getByRole('button', { name: /Check System/i })).toBeVisible({ timeout: 10000 });
    // First automatic check already ran on mount — wait for it to settle,
    // then click again explicitly to prove the button itself works.
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /Check System/i }).click();
    await expect(page.getByText(/Checking…/)).toBeVisible({ timeout: 3000 }).catch(() => {});
    await expect(page.getByText('All systems operational')).toBeVisible({ timeout: 15000 });

    for (const label of ['Database', 'Authentication', 'Storage', 'Edge Functions', 'Realtime']) {
      const card = page.locator('div', { hasText: label }).first();
      await expect(card.getByText('ok', { exact: true })).toBeVisible({ timeout: 10000 });
    }

    // History recorded server-side — not fabricated client-side: reload
    // the page (fresh React state) and confirm the history table still
    // shows the just-recorded rows, proving they came from the database.
    await page.reload();
    await page.waitForFunction(() => typeof window.sbSignIn === 'function');
    await page.evaluate(async ([email, pass]) => { await window.sbSignIn(email, pass); }, [ADMIN_EMAIL, ADMIN_PASSWORD]);
    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText('Check history')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('No checks recorded yet')).toHaveCount(0);
  });

  test('simulated service failure (client-side network intercept, never a real outage) is classified correctly', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.sbSignIn === 'function');
    await page.evaluate(async ([email, pass]) => { await window.sbSignIn(email, pass); }, [ADMIN_EMAIL, ADMIN_PASSWORD]);

    // Force the Storage list call to fail — a test-browser-only network
    // intercept, never touching the real Supabase Storage service.
    await context.route('**/storage/v1/object/list/categories**', route => route.fulfill({ status: 500, body: JSON.stringify({ message: 'simulated failure' }) }));

    await goto(page, 'admin', { section: 'health' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Check System/i }).click();
    await page.waitForTimeout(3000);

    const storageCard = page.locator('div', { hasText: 'Storage' }).first();
    await expect(storageCard.getByText(/down|degraded/)).toBeVisible({ timeout: 10000 });
    // The other 4 services must stay unaffected — proves failures are
    // isolated per-service, not collapsed into one global flag.
    const dbCard = page.locator('div', { hasText: 'Database' }).first();
    await expect(dbCard.getByText('ok', { exact: true })).toBeVisible({ timeout: 10000 });

    await context.unroute('**/storage/v1/object/list/categories**');
  });

  test('timeout on one service is reported as a timeout, not a generic failure', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.sbSignIn === 'function');
    await page.evaluate(async ([email, pass]) => { await window.sbSignIn(email, pass); }, [ADMIN_EMAIL, ADMIN_PASSWORD]);

    // Delay the Edge Function call well past HEALTH_CHECK_TIMEOUT_MS (8s).
    await context.route('**/functions/v1/health-check', async route => {
      await new Promise(r => setTimeout(r, 12000));
      await route.continue();
    });

    await goto(page, 'admin', { section: 'health' });
    await page.getByRole('button', { name: /Check System/i }).click();
    const edgeCard = page.locator('div', { hasText: 'Edge Functions' }).first();
    await expect(edgeCard.getByText('down')).toBeVisible({ timeout: 15000 });
    await expect(edgeCard.getByText(/timed out/i)).toBeVisible({ timeout: 2000 });

    await context.unroute('**/functions/v1/health-check');
  });

  test('a staff account WITHOUT system.health sees the permission wall, never a fake "down" status', async ({ page }) => {
    test.skip(!STAFF_EMAIL || !STAFF_PASSWORD, 'QA_STAFF_NO_HEALTH_EMAIL / QA_STAFF_NO_HEALTH_PASSWORD not set.');
    await page.goto('/');
    await page.waitForFunction(() => typeof window.sbSignIn === 'function');
    const signIn = await page.evaluate(async ([email, pass]) => {
      const { data, error } = await window.sbSignIn(email, pass);
      return { ok: !!data?.user, error: error?.message };
    }, [STAFF_EMAIL, STAFF_PASSWORD]);
    expect(signIn.ok, `sign-in failed: ${signIn.error}`).toBe(true);

    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText("You don't have access to System Health")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('system.health')).toBeVisible();
    // Confirms this is a permission wall (section never rendered), not a
    // service reporting itself "down" to an unprivileged viewer.
    await expect(page.getByRole('button', { name: /Check System/i })).toHaveCount(0);
  });
});
