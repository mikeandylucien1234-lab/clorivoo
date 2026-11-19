// AdminOwnerVaultSection logic tests (mocked, like every other spec in
// this suite). Owner Vault's gate is intentionally separate from the
// normal accessCtx/permissions system (sbAmIOwner(), not
// accessCtx.permissions) — see phase9_owner_vault_migration.sql for why
// (has_permission() gives role='admin' a blanket bypass, so no
// permission key could ever mean "admin, but not Owner"). These tests
// mock sbAmIOwner/sbAdminGetOwnerVaultOverview directly rather than
// seedAccessCtx for that reason.
import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Admin — Owner Vault (UI logic, mocked outcomes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo', email: 'admin@clorivo.io' });
  });

  test('a real Owner sees the dynamic dashboard, never the old "paused" message', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAmIOwner = async () => true;
      window.sbAdminGetOwnerVaultOverview = async () => ({
        data: {
          project_ref: 'kpwebnoqsjlxxiamwsst',
          health: [
            { service: 'database', status: 'ok', latency_ms: 40, checked_at: new Date().toISOString() },
            { service: 'storage', status: 'down', latency_ms: null, checked_at: new Date().toISOString() },
          ],
          staff: { active_count: 3, roles_count: 2 },
          audit: { last: { action: 'order_payment_status_changed', created_at: new Date().toISOString() }, total: 61 },
          commissions: { rate: 0.1, basis: 'order_subtotal', confirmed_net_all_time: 1234.5, reversed_net_all_time: 0 },
          settings_last_updated_at: new Date().toISOString(),
          generated_at: new Date().toISOString(),
        },
        error: null,
      });
    });
    await goto(page, 'admin', { section: 'ownervault' });
    await expect(page.getByText('kpwebnoqsjlxxiamwsst')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Backend project is paused')).toHaveCount(0);
    await expect(page.getByText('3 active staff')).toBeVisible();
    await expect(page.getByText('61 entries total')).toBeVisible();
    await expect(page.getByText(/Confirmed net: \$1234\.50/)).toBeVisible();
    // Never collapses "project active" / "backend reachable" / "frontend deployed" into one status.
    await expect(page.getByText('Not verifiable from inside the running app')).toBeVisible();
  });

  test('a standard admin who is NOT an Owner sees the access wall, never the dashboard', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAmIOwner = async () => false;
      window.sbAdminGetOwnerVaultOverview = async () => { throw new Error('should never be called'); };
    });
    await goto(page, 'admin', { section: 'ownervault' });
    await expect(page.getByText("You don't have Owner access")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('kpwebnoqsjlxxiamwsst')).toHaveCount(0);
    await expect(page.getByText(/does not grant this automatically/)).toBeVisible();
  });

  test('no secrets (anon key, tokens) ever appear in Owner Vault', async ({ page }) => {
    await page.evaluate(() => {
      window.sbAmIOwner = async () => true;
      window.sbAdminGetOwnerVaultOverview = async () => ({
        data: { project_ref: 'kpwebnoqsjlxxiamwsst', health: [], staff: { active_count: 0, roles_count: 0 }, audit: { last: null, total: 0 }, commissions: { rate: 0, basis: 'order_subtotal', confirmed_net_all_time: 0, reversed_net_all_time: 0 }, settings_last_updated_at: null, generated_at: new Date().toISOString() },
        error: null,
      });
    });
    await goto(page, 'admin', { section: 'ownervault' });
    await expect(page.getByText('kpwebnoqsjlxxiamwsst')).toBeVisible({ timeout: 8000 });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/eyJhbGci/); // JWT-shaped anon key
    expect(bodyText.toLowerCase()).not.toContain('service_role');
  });
});
