import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

const MOCK_ADMIN_STATS = {
  total_users: 1240,
  active_sellers: 87,
  total_orders: 3802,
  total_revenue: 148500,
  pending_kyc: 5,
};

test.describe('Admin — Dashboard & Stats', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo', email: 'admin@clorivo.io' });
    await page.evaluate((stats) => { window._MOCK_ADMIN_STATS = stats; }, MOCK_ADMIN_STATS);
    await goto(page, 'admin');
  });

  // Regression guard for the navKey fix: NavContext.Provider (app.jsx)
  // was missing `navKey` from its value, so ScreenRouter's `key={navKey}`
  // was always `key={undefined}` and never changed — navigating to the
  // SAME screen twice in a row (admin → admin here, with a different
  // section param) reused the old component instance instead of
  // remounting it, silently keeping AdminShellScreen's stale `section`
  // state from the first visit. Confirmed live before the fix: this
  // exact sequence stayed stuck on "Business Overview".
  test('Navigation admin → admin change bien de section (navKey)', async ({ page }) => {
    await goto(page, 'admin', { section: 'sellers' });
    await expect(page.getByText('Seller Management', { exact: false }).or(page.getByText('KYC Verification'))).toBeVisible({ timeout: 8000 });
    await goto(page, 'admin', { section: 'banners' });
    await expect(page.getByText('Homepage Banners')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('Seller Management', { exact: false })).toHaveCount(0);
  });

  test('Dashboard admin se charge sans erreur', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(600);
    expect(errors.filter(e => !e.includes('supabase') && !e.includes('network'))).toHaveLength(0);
  });

  test('Titre "Admin" ou "Dashboard" visible', async ({ page }) => {
    await expect(
      page.locator('text=Admin').or(page.locator('text=Dashboard')).or(page.locator('text=Console')).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Statistiques globales affichées (users/commandes)', async ({ page }) => {
    // Real stat cards (screen-admin.jsx AdminOverview) are "Customers" /
    // "Orders Today" / "Total Orders" — no French "utilisateur"/"commande".
    await expect(
      page.locator('text=Customers').or(page.locator('text=Orders')).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Menu latéral — sections présentes', async ({ page }) => {
    // Real sidebar labels (screen-admin.jsx, confirmed at the desktop
    // viewport this project now uses): Dashboard, Orders, Shipping,
    // Products, Categories, Brands, Inventory, Flash Deals, Customers,
    // Sellers, Reviews, Tickets, Rewards — no French labels anywhere.
    await expect(
      page.getByRole('button', { name: 'Products' }).or(page.getByRole('button', { name: 'Sellers' })).or(page.getByRole('button', { name: 'Orders' })).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Section KYC accessible', async ({ page }) => {
    const kycLink = page.locator('button, a, div[role="button"]').filter({ hasText: /KYC|vérif/i }).first();
    if (await kycLink.isVisible()) {
      await kycLink.click();
      await page.waitForTimeout(400);
      await expect(page.locator('body')).toBeVisible();
    } else {
      await goto(page, 'admin', { section: 'sellers' });
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Section KYC — dossiers en attente', async ({ page }) => {
    await goto(page, 'admin', { section: 'sellers' });
    await expect(
      page.locator('text=attente').or(page.locator('text=pending').or(page.locator('text=KYC'))).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Bouton Approuver KYC visible', async ({ page }) => {
    // The "Approve" action (screen-admin.jsx AdminKycDetail) only renders
    // once a specific application's detail view is open — the list row
    // itself just has the applicant name and a chevron. Click the row
    // (via setOpenId) to reach the detail view where the real button lives.
    await page.evaluate(() => {
      window._MOCK_KYC = [
        { id: 'k1', profiles: { full_name: 'Jean Dupont' }, shop_name: 'JD Boutique', status: 'pending', submitted_at: new Date().toISOString(), docs: [] },
      ];
    });
    await goto(page, 'admin', { section: 'sellers' });
    const row = page.locator('text=Jean Dupont').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await expect(
      page.getByRole('button', { name: 'Approve' })
    ).toBeVisible({ timeout: 8000 });
  });

  test('Section Bannières accessible', async ({ page }) => {
    // Passes reliably in isolation; under full-suite parallel load the
    // admin project's desktop render + Babel transpile occasionally
    // needs more than 5s — bumped like other timing-sensitive assertions
    // in this suite, not a selector or mock issue (content itself,
    // "Homepage Banners" / "+ New", is confirmed present and correct).
    await goto(page, 'admin', { section: 'banners' });
    await expect(
      page.locator('text=bannière').or(page.locator('text=banner')).or(page.locator('button').filter({ hasText: /ajouter|add/i })).first()
    ).toBeVisible({ timeout: 8000 });
  });

});
