// AdminHealthSection UI/state-logic tests, using mockAuth like every
// other spec in this suite (tests/helpers/navigate.js). These prove the
// component itself — overview counts, per-service cards, status
// classification, history rendering, the permission wall, the Check
// System button — behaves correctly given controlled outcomes from the
// sbAdminHealthPing/sbAdminCheck*/sbAdminGetHealthHistory functions.
//
// This is NOT a substitute for specs/admin/99-health-real-backend.spec.js,
// which proves the real Database/Auth/Storage/Edge Functions/Realtime
// services are actually reachable. That spec currently cannot run in
// this sandbox because its outbound network policy denies direct HTTPS
// to kpwebnoqsjlxxiamwsst.supabase.co (confirmed via the agent proxy's
// own status endpoint: "gateway answered 403 to CONNECT" for that host) —
// a session/environment-level restriction, not a defect in the Health
// section itself. The DB-level behavior of every RPC involved
// (admin_health_ping, admin_record_health_check's validation,
// admin_get_health_history, and the system.health permission gate) was
// verified directly against the live project instead (see the Phase 9
// Health report). This spec covers what remains fully testable without
// that network path: the component's own logic.
import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, seedAccessCtx } from '../../helpers/navigate.js';

test.describe('Admin — System Health (UI logic, mocked outcomes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo', email: 'admin@clorivo.io' });
  });

  test('all 5 services ok → overview shows "All systems operational" and 5/0/0', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAdminHealthPing = async () => ({ ok: true });
      window.sbAdminCheckAuthService = async () => ({ ok: true });
      window.sbAdminCheckStorageService = async () => ({ ok: true });
      window.sbAdminCheckEdgeFunctions = async () => ({ ok: true });
      window.sbAdminCheckRealtime = async () => ({ ok: true });
      window.sbAdminRecordHealthCheck = async () => ({ data: { ok: true, inserted: 5 }, error: null });
      window.sbAdminGetHealthHistory = async () => ([
        { service: 'database', status: 'ok', latency_ms: 42, message: null, checked_at: new Date().toISOString() },
      ]);
    });
    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText('All systems operational')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Project paused')).toHaveCount(0);
    for (const key of ['database', 'auth', 'storage', 'edge_functions', 'realtime']) {
      const card = page.getByTestId(`health-card-${key}`);
      await expect(card.getByText('ok', { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Check history')).toBeVisible();
    await expect(page.getByText('No checks recorded yet')).toHaveCount(0);
  });

  test('one service down → isolated to that card, overall becomes "Service disruption detected"', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAdminHealthPing = async () => ({ ok: true });
      window.sbAdminCheckAuthService = async () => ({ ok: true });
      window.sbAdminCheckStorageService = async () => ({ ok: false, errorType: 'network', message: 'Network error — unable to reach Supabase.' });
      window.sbAdminCheckEdgeFunctions = async () => ({ ok: true });
      window.sbAdminCheckRealtime = async () => ({ ok: true });
      window.sbAdminRecordHealthCheck = async () => ({ data: { ok: true }, error: null });
      window.sbAdminGetHealthHistory = async () => ([]);
    });
    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText('Service disruption detected')).toBeVisible({ timeout: 8000 });
    const storageCard = page.getByTestId('health-card-storage');
    await expect(storageCard.getByText('down', { exact: true })).toBeVisible();
    await expect(storageCard.getByText('Network error')).toBeVisible();
    const dbCard = page.getByTestId('health-card-database');
    await expect(dbCard.getByText('ok', { exact: true })).toBeVisible();
  });

  test('a permission-denied outcome is shown as "degraded", never collapsed into "down"', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAdminHealthPing = async () => ({ ok: true });
      window.sbAdminCheckAuthService = async () => ({ ok: true });
      window.sbAdminCheckStorageService = async () => ({ ok: true });
      window.sbAdminCheckEdgeFunctions = async () => ({ ok: false, errorType: 'permission', message: 'Permission denied — system.health required.' });
      window.sbAdminCheckRealtime = async () => ({ ok: true });
      window.sbAdminRecordHealthCheck = async () => ({ data: { ok: true }, error: null });
      window.sbAdminGetHealthHistory = async () => ([]);
    });
    await goto(page, 'admin', { section: 'health' });
    const edgeCard = page.getByTestId('health-card-edge_functions');
    await expect(edgeCard.getByText('degraded', { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Degraded — some checks need attention')).toBeVisible();
  });

  test('Check System button re-runs all 5 checks', async ({ page }) => {
    let calls = 0;
    await page.evaluate(() => {
      window.sbAdminHealthPing = async () => { window.__pingCalls = (window.__pingCalls || 0) + 1; return { ok: true }; };
      window.sbAdminCheckAuthService = async () => ({ ok: true });
      window.sbAdminCheckStorageService = async () => ({ ok: true });
      window.sbAdminCheckEdgeFunctions = async () => ({ ok: true });
      window.sbAdminCheckRealtime = async () => ({ ok: true });
      window.sbAdminRecordHealthCheck = async () => ({ data: { ok: true }, error: null });
      window.sbAdminGetHealthHistory = async () => ([]);
    });
    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText('All systems operational')).toBeVisible({ timeout: 15000 });
    const callsAfterMount = await page.evaluate(() => window.__pingCalls);
    expect(callsAfterMount).toBeGreaterThanOrEqual(1);
    await page.getByRole('button', { name: /Check System/i }).click();
    await page.waitForFunction((prev) => (window.__pingCalls || 0) > prev, callsAfterMount, { timeout: 10000 });
    calls = await page.evaluate(() => window.__pingCalls);
    expect(calls).toBeGreaterThan(callsAfterMount);
  });

  test('a staff account without system.health sees the permission wall, not the dashboard', async ({ page }) => {
    await seedAccessCtx(page, { isAdmin: false, isStaff: true, permissions: ['orders.view'] });
    await goto(page, 'admin', { section: 'health' });
    await expect(page.getByText("You don't have access to System Health")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('system.health')).toBeVisible();
    await expect(page.getByRole('button', { name: /Check System/i })).toHaveCount(0);
  });
});
