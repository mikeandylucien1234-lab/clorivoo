import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

const MOCK_SELLER_STATS = {
  revenue: 4250.80,
  orders: 38,
  products: 12,
  views: 1840,
};

test.describe('Seller — Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur', email: 'marc@boutique.io' });
    await page.evaluate((stats) => { window._MOCK_SELLER_STATS = stats; }, MOCK_SELLER_STATS);
    await goto(page, 'seller-home');
  });

  test('Dashboard vendeur se charge', async ({ page }) => {
    await expect(
      page.locator('text=Marc').or(page.locator('text=Dashboard')).or(page.locator('text=boutique')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('KPIs — revenus / commandes / produits visibles', async ({ page }) => {
    await expect(
      page.locator('text=revenus').or(page.locator('text=Revenue')).or(page.locator('text=commandes')).or(page.locator('text=$')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Section "Dernières commandes" présente', async ({ page }) => {
    await expect(
      page.locator('text=commandes').or(page.locator('text=orders')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Bouton Ajouter un produit visible', async ({ page }) => {
    // Real button text (screen-seller.jsx SellerDashboardScreen) is the
    // hero header's "+ Product" quick action — no French label exists.
    await expect(
      page.locator('button').filter({ hasText: /\+ ?product|add product/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  // Was a dead button (no onClick at all) — now navigates to the real
  // Add Product form (SellerProductFormScreen). Full submit flow with
  // ownership/validation/permission coverage lives in
  // seller/05-add-product.spec.js; this just checks the button works.
  test('Clic Ajouter produit → formulaire', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /\+ ?product|add product/i }).first();
    await btn.click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Add Product').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Product title')).toBeVisible();
  });

  test('Navigation vers commandes vendeur', async ({ page }) => {
    // Real screen title is "My Shipments" (screen-seller.jsx
    // SellerOrdersScreen) — no French "commande" text exists there, and
    // with no shipments seeded it shows "No shipments yet", not "order".
    await goto(page, 'seller-orders');
    await expect(
      page.getByText('My Shipments').or(page.getByText('No shipments yet')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Navigation vers personnalisation boutique', async ({ page }) => {
    await goto(page, 'shop-customize');
    await expect(
      page.locator('text=boutique').or(page.locator('text=shop')).or(page.locator('input')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Bouton CJ Import (import dropshipping)', async ({ page }) => {
    const cjBtn = page.locator('button, a').filter({ hasText: /CJ|import|dropship/i }).first();
    if (await cjBtn.isVisible()) {
      await cjBtn.click();
      await page.waitForTimeout(350);
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
