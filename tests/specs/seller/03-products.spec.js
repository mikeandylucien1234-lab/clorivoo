import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, MOCK_PRODUCTS } from '../../helpers/navigate.js';

test.describe('Seller — Gestion des produits', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });
    await page.evaluate((prods) => { window._MOCK_PRODUCTS = prods; }, MOCK_PRODUCTS);
  });

  test('CJ Connect — saisie clé API', async ({ page }) => {
    // screen-cj.jsx CjConnectScreen has a real "API Key" labeled Input.
    await goto(page, 'cj-connect');
    await expect(
      page.getByText('API Key').or(page.locator('input')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('CJ Search — champ de recherche', async ({ page }) => {
    // CjSearchScreen's "search bar" (screen-cj.jsx) is a static, non-
    // interactive <div><span>wireless earbuds</span></div> — a visual
    // placeholder, not a real <input>; this screen has zero <input>
    // elements. Asserting the visible search affordance text is the
    // accurate equivalent of "the search field is present".
    await goto(page, 'cj-search');
    await expect(page.getByText('wireless earbuds')).toBeVisible({ timeout: 5000 });
  });

  test('CJ Search — recherche produits', async ({ page }) => {
    // No real search exists to perform (see note above) — this is a
    // static mock catalog. Confirm the catalog itself renders without
    // crashing, which is the only thing actually testable here today.
    await goto(page, 'cj-search');
    await expect(page.getByText('+ Import').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('CJ Publish — écran de publication', async ({ page }) => {
    await goto(page, 'cj-publish', { product: MOCK_PRODUCTS[0] });
    await expect(
      page.locator('text=Publier').or(page.locator('text=publish')).or(page.locator('text=Lampe')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('CJ Publish — markup price visible', async ({ page }) => {
    // Real label is "Margin $X.XX (Y%)" (screen-cj.jsx) — no French
    // "marge"/"prix" text exists on this screen.
    await goto(page, 'cj-publish', { product: MOCK_PRODUCTS[0] });
    await expect(page.getByText('Margin', { exact: false }).first()).toBeVisible({ timeout: 5000 });
  });

  // GENUINE APPLICATION GAP, NOT A STALE SELECTOR: SellerOrdersScreen
  // (screen-seller.jsx, "My Shipments") has no status-filter control of
  // any kind — it unconditionally renders every one of the seller's
  // shipments with no tabs/buttons/dropdown to narrow by status. There
  // is nothing to select, in French or English. Flagged rather than
  // retargeted at unrelated content.
  test.fixme('Commandes vendeur — filtre statut', async ({ page }) => {
    await goto(page, 'seller-orders');
    await expect(
      page.locator('text=En attente').or(page.locator('text=Expédié')).or(page.locator('text=Livré')).or(page.locator('text=Tout')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Commandes vendeur — bouton marquer expédié', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_SELLER_ORDERS = [
        { id: 'so1', status: 'pending', total: 49.99, buyer_name: 'Alice D.', items: [{ product_title: 'Lampe', qty: 1 }], created_at: new Date().toISOString() },
      ];
    });
    await goto(page, 'seller-orders');
    const expBtn = page.locator('button').filter({ hasText: /expédier|marquer|ship/i }).first();
    if (await expBtn.isVisible()) {
      await expBtn.click();
      await page.waitForTimeout(400);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Personnalisation boutique — nom modifiable', async ({ page }) => {
    await goto(page, 'shop-customize');
    const nameInput = page.locator('input').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('Ma Super Boutique');
      await expect(nameInput).toHaveValue('Ma Super Boutique');
    }
  });

  test('Personnalisation boutique — bouton sauvegarder', async ({ page }) => {
    // ShopCustomizeScreen (screen-shop.jsx) opens on its "Preview" tab by
    // default — the "Save & preview" button only renders on the
    // "Customize" tab, which must be selected first.
    await goto(page, 'shop-customize');
    await page.getByRole('button', { name: 'Customize', exact: true }).click();
    await expect(
      page.locator('button').filter({ hasText: /sauvegarder|enregistrer|save/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

});
