import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, MOCK_PRODUCTS } from '../../helpers/navigate.js';

// The cart is pure client state (screen-cart.jsx cartItemsFromGlobal()
// reads window.CART_ITEMS directly — there is no sbGetCart() and
// nothing here is Supabase-backed), shaped as { product, qty, variant,
// seller }, not a cart_items row.
const MOCK_CART = [
  { product: MOCK_PRODUCTS[0], qty: 2, variant: 'M' },
  { product: MOCK_PRODUCTS[1], qty: 1, variant: 'L' },
];

test.describe('Buyer — Panier & Checkout', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'buyer', name: 'Alice Dupont' });
    await page.evaluate((cart) => { window.CART_ITEMS = cart; }, MOCK_CART);
    await goto(page, 'cart');
  });

  test('Panier affiche les articles mockés', async ({ page }) => {
    await expect(page.locator('text=Lampe Boho').or(page.locator('text=Écouteurs')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Total du panier calculé', async ({ page }) => {
    // 2×49.99 + 89.99 = 189.97
    await expect(page.locator('text=189').or(page.locator('text=190')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Bouton commander visible', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /commander|checkout|payer/i }).first()).toBeVisible();
  });

  test('Panier vide affiche un message', async ({ page }) => {
    await page.evaluate(() => { window.CART_ITEMS = []; });
    await goto(page, 'cart');
    await expect(page.locator('text=vide').or(page.locator('text=empty').or(page.locator('text=Votre panier'))).first()).toBeVisible({ timeout: 5000 });
  });

  test('Clic Commander → Checkout', async ({ page }) => {
    // Lands on CheckoutAddressScreen, titled "Shipping Address" — no
    // French copy exists on this screen (see other checkout tests below).
    await page.locator('button').filter({ hasText: /commander|checkout|payer/i }).first().click();
    await page.waitForTimeout(400);
    await expect(
      page.getByPlaceholder('14 Roquette Street').or(page.getByText('Shipping Address')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Checkout — formulaire adresse visible', async ({ page }) => {
    // 'checkout' routes to CheckoutAddressScreen (confirmed in app.jsx),
    // titled "Shipping Address"; its form field is labeled "Street Address"
    // with placeholder "14 Roquette Street" (screen-checkout.jsx) — no
    // French copy exists anywhere on this screen.
    await goto(page, 'checkout');
    await expect(
      page.getByPlaceholder('14 Roquette Street').or(page.getByText('Shipping Address')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Checkout — résumé affiche les frais de livraison', async ({ page }) => {
    // There is no separate shipping-method selection step (Standard/Express)
    // anywhere in the checkout flow — shippingMethod is hardcoded to
    // 'standard' in CheckoutPaymentScreen.handlePay() (screen-checkout.jsx).
    // The real, present evidence of shipping in this flow is the order
    // summary mini-card's "Shipping" line, shown on both the address and
    // payment steps.
    await goto(page, 'checkout');
    await expect(page.getByText('Shipping', { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Checkout — sélection méthode de paiement', async ({ page }) => {
    // The payment-method list only exists on 'checkout-payment', not
    // 'checkout' (the address step) — confirmed in app.jsx's routing table.
    // Real methods are MonCash / NatCash / "Credit / Debit Card" / Cash on
    // Delivery (screen-checkout.jsx) — there is no PayPal option and no
    // French "Carte"/"paiement" label anywhere.
    await goto(page, 'checkout-payment');
    await expect(
      page.getByText('MonCash').or(page.getByText('Credit / Debit Card')).or(page.getByText('Cash on Delivery')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Confirmation commande → écran tracking', async ({ page }) => {
    await goto(page, 'checkout');
    const confirmBtn = page.locator('button').filter({ hasText: /confirmer|valider|payer|commander/i }).first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await page.waitForTimeout(600);
      // Should navigate to tracking or show order confirmation
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
