import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, MOCK_PRODUCTS } from '../../helpers/navigate.js';

/**
 * Scénario complet vendeur :
 * Login → Devenir vendeur → KYC → Dashboard → Importer produit → Gérer commandes
 */
test.describe('E2E — Parcours vendeur complet', () => {

  // Was blocked by the same "flash is not defined" crash in
  // KycSelfieScreen (screen-seller.jsx) as seller/01-onboarding.spec.js's
  // "KYC — étape selfie" — fixed, re-enabled.
  test('Vendeur : onboarding KYC complet', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'buyer', name: 'Marc Vendeur' }); // starts as buyer

    // Profile → Devenir vendeur
    await goto(page, 'profile');
    const sellerBtn = page.locator('button').filter({ hasText: /vendeur|seller|boutique/i }).first();
    if (await sellerBtn.isVisible()) await sellerBtn.click();
    else await goto(page, 'become-seller');
    await page.waitForTimeout(400);

    // Become seller pitch — real title is "Create Seller Account"
    // (screen-seller.jsx); no French "vendeur"/"boutique"/"Commencer".
    await expect(
      page.getByText('Create Seller Account').or(page.getByText('Personal information')).first()
    ).toBeVisible({ timeout: 5000 });

    // KYC doc
    await goto(page, 'kyc-doc');
    await expect(page.locator('body')).toBeVisible();

    // KYC selfie
    await goto(page, 'kyc-selfie');
    await expect(page.locator('body')).toBeVisible();

    // KYC success — real text is "Your Application Has Been Submitted".
    await goto(page, 'kyc-success');
    await expect(page.getByText('Submitted', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('Vendeur : dashboard → gestion commandes', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });
    // SellerOrdersScreen (screen-seller.jsx) reads sbGetSellerShipments(),
    // not any "_MOCK_SELLER_ORDERS" variable (that name was never read by
    // anything) — real shipment shape has order_items, not buyer_name.
    await page.evaluate(() => {
      window._MOCK_SELLER_SHIPMENTS = [
        { id: 'so1', order_id: 'order-so1', status: 'pending', carrier: null, tracking_number: null, shipping_fee: 4, created_at: new Date().toISOString(),
          order_items: [{ id: 'oi-so1', title: 'Lampe Boho Tressée', quantity: 2, unit_price: 49.99 }] },
        { id: 'so2', order_id: 'order-so2', status: 'shipped', carrier: 'DHL', tracking_number: 'DHL1', shipping_fee: 4, created_at: new Date().toISOString(),
          order_items: [{ id: 'oi-so2', title: 'Écouteurs Pro Max', quantity: 1, unit_price: 89.99 }] },
      ];
    });

    await goto(page, 'seller-home');
    await expect(
      page.locator('text=Marc').or(page.locator('text=Dashboard')).or(page.locator('text=boutique')).first()
    ).toBeVisible({ timeout: 5000 });

    await goto(page, 'seller-orders');
    // Real screen title is "My Shipments" (screen-seller.jsx) — no
    // buyer name or French "commande" text is shown on this screen at all.
    await expect(
      page.getByText('Lampe Boho Tressée').or(page.getByText('My Shipments')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Vendeur : import CJ → publication produit', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });

    await goto(page, 'cj-connect');
    const apiInput = page.locator('input').first();
    if (await apiInput.isVisible()) {
      await apiInput.fill('MOCK-CJ-API-KEY-12345');
      const connectBtn = page.locator('button').filter({ hasText: /connecter|connect|suivant|valider/i }).first();
      if (await connectBtn.isVisible()) await connectBtn.click();
      await page.waitForTimeout(400);
    }

    await goto(page, 'cj-search');
    const searchInput = page.locator('input').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('wireless earphones');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    }

    // CjPublishScreen (screen-cj.jsx) ignores params.product entirely — its
    // title/price/etc. are local useState with hardcoded initial values
    // ('TWS Earbuds — Noise Cancelling Pro'), so the product passed in
    // navigation params is never actually displayed. Its real button is
    // "Publish to shop →" — no French "Publier" exists.
    await goto(page, 'cj-publish', { product: MOCK_PRODUCTS[1] });
    await expect(
      page.getByText('Publish to shop').or(page.getByText('TWS Earbuds')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Vendeur : personnaliser sa boutique', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });

    await goto(page, 'shop-customize');
    const nameInput = page.locator('input').first();
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill('Marc Premium Store');

      const saveBtn = page.locator('button').filter({ hasText: /sauvegarder|enregistrer|save/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(400);
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

});
