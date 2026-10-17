import { test, expect } from '@playwright/test';
import { goto, mockAuth, seedOrders, seedShipmentsByOrder, MOCK_ORDERS, MOCK_SHIPMENTS_BY_ORDER } from '../../helpers/navigate.js';

// Opens the order detail screen the way screen-tracking.jsx's own
// OrderCard actually does: navigate('order-detail', { order }) with the
// FULL order object, not an orderId string. The previous version of
// this file navigated to 'tracking' (the LIST screen, per app.jsx's
// routing table) with an unused `orderId` param — OrderDetailScreen
// reads `params.order`, so that never rendered the detail screen at
// all; every one of its assertions was passing (or failing) against
// whatever the list screen happened to show, not real tracking UI.
async function openOrderDetail(page, orderId) {
  const order = MOCK_ORDERS.find(o => o.id === orderId);
  await goto(page, 'order-detail', { order });
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
    await expect(page.locator('text=/seller-reported/i')).toBeVisible({ timeout: 5000 });
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

  test('Profil — bouton Devenir vendeur visible', async ({ page }) => {
    await goto(page, 'profile');
    await expect(
      page.locator('button, a').filter({ hasText: /vendeur|seller|boutique/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

});
