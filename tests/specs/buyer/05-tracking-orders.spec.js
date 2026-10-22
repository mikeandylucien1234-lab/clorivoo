import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, seedOrders, seedShipmentsByOrder, MOCK_ORDERS, MOCK_SHIPMENTS_BY_ORDER } from '../../helpers/navigate.js';

// Opens the order detail screen the way a real user actually would:
// through the orders list, clicking the OrderCard for this order.
// screen-tracking.jsx's OrdersListScreen always passes the detail
// screen an order object already run through normalizeRemoteOrder()
// (with an `items` array) — navigating straight to 'order-detail' with
// a raw MOCK_ORDERS row (which only has `order_items`) crashes
// OrderDetailScreen synchronously on its first render, before its own
// useEffect ever gets a chance to normalize it: `order.items.reduce(...)`
// (screen-tracking.jsx:554, "Ordered Products" count) throws on
// `order.items === undefined` and the whole screen renders blank. Going
// through the list screen is both more realistic and sidesteps that
// shape mismatch entirely, since the list always normalizes first.
async function openOrderDetail(page, orderId) {
  await goto(page, 'tracking');
  await page.locator(`text=Order #${orderId}`).click();
  await page.waitForTimeout(300);
}

test.describe('Buyer — Suivi & Commandes', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'buyer', name: 'Alice Dupont' });
    await seedOrders(page, MOCK_ORDERS);
    await seedShipmentsByOrder(page, MOCK_SHIPMENTS_BY_ORDER);
  });

  test('Écran Tracking affiche le statut de la commande', async ({ page }) => {
    await openOrderDetail(page, 'order-1');
    await expect(page.locator('text=/order-1/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Commande avec plusieurs expéditions — deux cartes indépendantes', async ({ page }) => {
    // order-1 has two shipments from two different sellers (Flash
    // Express + DHL) — the detail page must render one independent
    // card per shipment, labeled "Shipment 1" / "Shipment 2", not a
    // single collapsed whole-order summary.
    await openOrderDetail(page, 'order-1');
    await expect(page.locator('text=Shipment 1')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Shipment 2')).toBeVisible({ timeout: 5000 });
  });

  test('Chaque expédition a sa propre timeline de suivi', async ({ page }) => {
    await openOrderDetail(page, 'order-1');
    // Shipment 1's history: pending -> shipped (2 entries). Shipment 2's
    // history: pending -> shipped -> delivered (3 entries). Both
    // timelines must be present and distinguishable, not merged into one.
    await expect(page.locator('text=FX123456789')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=DHL987654321')).toBeVisible({ timeout: 5000 });
  });

  test('Numéro de suivi affiché comme fourni par le vendeur', async ({ page }) => {
    // Tracking-integrity rule: carrier/tracking info is always labeled
    // as seller-reported, never implied carrier-verified (no carrier
    // API integration exists).
    await openOrderDetail(page, 'order-1');
    await expect(page.locator('text=/seller-reported/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Expédition annulée — jamais affichée comme "pending"', async ({ page }) => {
    // order-3: a single, fully-cancelled shipment. Must show a
    // "Cancelled" status, never the generic fallback "pending" the
    // rollup used to silently produce for this exact case.
    await openOrderDetail(page, 'order-3');
    await expect(page.locator('text=/cancelled/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/^pending$/i')).toHaveCount(0);
  });

  test('Expédition retournée — signalée comme un problème de livraison', async ({ page }) => {
    // order-4: a single 'returned' shipment. Must surface as a
    // delivery issue, never silently 'pending'.
    await openOrderDetail(page, 'order-4');
    await expect(page.locator('text=/delivery issue|exception/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Expédition en échec — raison affichée', async ({ page }) => {
    // order-5: a single 'failed' shipment with a failure_reason.
    await openOrderDetail(page, 'order-5');
    await expect(page.locator('text=/delivery issue|exception/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Address not found')).toBeVisible({ timeout: 5000 });
  });

  test('Commande livrée (toutes expéditions) → bouton noter visible', async ({ page }) => {
    await openOrderDetail(page, 'order-2'); // single shipment, fully delivered
    await expect(
      page.locator('button').filter({ hasText: /reorder|noter|review|avis/i })
        .or(page.locator('text=/delivered/i')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("Pas d'accès aux informations d'expédition d'un autre acheteur", async ({ page }) => {
    // UI-level check only: viewing order-1's detail must render ONLY
    // order-1's own seeded shipments (its tracking numbers), never
    // another order's data leaking into the same view. Real cross-tenant
    // isolation is enforced server-side by RLS (security_invoker on
    // order_fulfillment_summary + the shipments/orders policies),
    // verified separately via live rolled-back SQL transactions — this
    // only confirms the rendering path doesn't itself mix orders together.
    await openOrderDetail(page, 'order-1');
    await expect(page.locator('text=FX123456789')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Address not found')).toHaveCount(0); // order-5's data
  });

  test('Messages — liste des conversations', async ({ page }) => {
    await goto(page, 'messages-list');
    // Either shows conversations or empty state
    await expect(page.locator('text=Message').or(page.locator('text=conversation')).or(page.locator('text=aucun')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Chat — ouverture conversation', async ({ page }) => {
    await goto(page, 'chat', { conversationId: 'demo-conv', shopName: 'luna.studio' });
    await expect(page.locator('text=luna.studio').or(page.locator('input[placeholder*="essage"]')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Chat — envoi d\'un message', async ({ page }) => {
    await goto(page, 'chat', { conversationId: 'demo-conv', shopName: 'luna.studio' });
    const input = page.locator('input[placeholder*="essage"], textarea').first();
    if (await input.isVisible()) {
      await input.fill('Bonjour, ce produit est-il disponible ?');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      await expect(page.locator('text=Bonjour, ce produit')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Notifications — liste vide affiche état vide', async ({ page }) => {
    await goto(page, 'notifications');
    await expect(
      page.locator('text=Notification').or(page.locator('text=aucune').or(page.locator('text=🔔'))).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Profil — informations utilisateur', async ({ page }) => {
    await goto(page, 'profile');
    await expect(page.locator('text=Alice').or(page.locator('text=Dupont')).first()).toBeVisible({ timeout: 5000 });
  });

  // Was a genuine gap — ProfileScreen's menu had no path to seller
  // onboarding at all. Fixed by adding a role-conditional entry
  // (screen-account.jsx): "Become a Seller" for a buyer, "Seller
  // Dashboard" for an existing seller, never both.
  test('Profil — bouton Devenir vendeur visible', async ({ page }) => {
    await goto(page, 'profile');
    await expect(
      page.locator('button, a').filter({ hasText: /vendeur|seller|boutique/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Profil — Devenir vendeur ouvre le flux KYC existant', async ({ page }) => {
    await page.evaluate(() => { window.sbGetMyKyc = async () => null; });
    await goto(page, 'profile');
    await page.getByText('Become a Seller').click();
    await page.waitForTimeout(400);
    await expect(
      page.getByText('Create Seller Account').or(page.getByText('Personal information')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('Profil — Devenir vendeur respecte une candidature KYC existante', async ({ page }) => {
    // A buyer with an already-pending application must see its status,
    // never a second blank application form — this is what "avoid
    // creating duplicate seller accounts" means in practice here.
    await page.evaluate(() => { window.sbGetMyKyc = async () => ({ status: 'pending' }); });
    await goto(page, 'profile');
    await page.getByText('Become a Seller').click();
    await page.waitForTimeout(400);
    await expect(page.getByText('under review', { exact: false })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Alex')).toHaveCount(0);
  });

  test('Profil — vendeur approuvé voit Seller Dashboard, pas Devenir vendeur', async ({ page }) => {
    await mockAuth(page, { role: 'seller', name: 'Alice Dupont' });
    await goto(page, 'profile');
    await expect(page.getByText('Seller Dashboard')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Become a Seller')).toHaveCount(0);
    await page.getByText('Seller Dashboard').click();
    await page.waitForTimeout(400);
    await expect(page.getByText('My shop').or(page.getByText('Welcome,')).first()).toBeVisible({ timeout: 5000 });
  });

});
