// AdminHomepageSection's 6 persisted section toggles (platform_settings
// key='homepage', replacing window._HOME_SECTIONS) and the new
// "Popular Shops" curation (homepage_featured_shops table). Mocked
// like every other spec in this suite.
import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Admin — Homepage management (mocked outcomes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo', email: 'admin@clorivo.io' });
  });

  test('loads real saved config on open (not stale defaults) and cross-links to the right sections', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_HOMEPAGE_CONFIG = { hero: false, shops: true, deals: false, categories: true, featured: true, videos: false };
    });
    await goto(page, 'admin', { section: 'homepage' });
    const heroRow = page.getByTestId('homepage-toggle-hero');
    await expect(heroRow).toBeVisible({ timeout: 8000 });
    await expect(heroRow.locator('button')).toHaveCSS('justify-content', 'flex-start'); // OFF, matches mocked saved value
    await expect(page.getByRole('button', { name: /Manage Banners/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Manage Flash Deals/i })).toBeVisible();
  });

  test('toggling a section saves it and reflects Saved/Error states correctly', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_HOMEPAGE_CONFIG = { hero: true, shops: true, deals: true, categories: true, featured: true, videos: true };
      window.sbAdminSetHomepageConfig = async (cfg) => {
        window.__lastConfig = cfg;
        await new Promise(r => setTimeout(r, 150));
        return { error: null };
      };
    });
    await goto(page, 'admin', { section: 'homepage' });
    const videosRow = page.getByTestId('homepage-toggle-videos');
    await expect(videosRow).toBeVisible({ timeout: 8000 });
    await videosRow.locator('button').click();
    await expect(videosRow.getByText('Saving…')).toBeVisible({ timeout: 3000 });
    await expect(videosRow.getByText('Saved')).toBeVisible({ timeout: 5000 });
    const lastConfig = await page.evaluate(() => window.__lastConfig);
    expect(lastConfig.videos).toBe(false);
  });

  test('a failed save reverts the toggle — never claims it saved', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_HOMEPAGE_CONFIG = { hero: true, shops: true, deals: true, categories: true, featured: true, videos: true };
      window.sbAdminSetHomepageConfig = async () => ({ error: { message: 'simulated failure' } });
    });
    await goto(page, 'admin', { section: 'homepage' });
    const row = page.getByTestId('homepage-toggle-hero');
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.locator('button').click();
    await expect(row.getByText('Could not save — tap to retry')).toBeVisible({ timeout: 5000 });
    await expect(row.locator('button')).toHaveCSS('justify-content', 'flex-end'); // reverted to ON
  });

  test('a staff account without settings.manage sees the toggles disabled (read-only), never able to write', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_HOMEPAGE_CONFIG = { hero: true, shops: true, deals: true, categories: true, featured: true, videos: true };
      window._MOCK_ACCESS_CTX = { role: 'staff', isAdmin: false, isStaff: true, permissions: ['orders.view'] };
    });
    await goto(page, 'admin', { section: 'homepage' });
    const row = page.getByTestId('homepage-toggle-hero');
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row.locator('button')).toBeDisabled();
    await expect(page.getByText('Read-only — the settings.manage permission is required')).toBeVisible();
  });

  test('searching and adding a real shop saves the curated, ordered list', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_HOMEPAGE_FEATURED_SHOPS = [];
      window._MOCK_SHOP_SEARCH_RESULTS = [{ id: 'shop-1', name: 'Luna Studio' }];
    });
    await goto(page, 'admin', { section: 'homepage' });
    await expect(page.getByPlaceholder(/Search real shops/)).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/Search real shops/).fill('Luna');
    await expect(page.getByText('Luna Studio')).toBeVisible({ timeout: 3000 });
    await page.getByText('Luna Studio').click();
    const actions = await page.evaluate(() => window._ADMIN_ACTIONS_LOG);
    const call = actions.find(a => a.action === 'set_homepage_featured_shops');
    expect(call.ids).toEqual(['shop-1']);
  });
});
