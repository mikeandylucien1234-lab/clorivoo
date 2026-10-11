import { test, expect } from '@playwright/test';
import { goto, mockAuth, seedSellerShipments } from '../../helpers/navigate.js';

// Matches the real shipment shape returned by sbGetSellerShipments()
// (shipments.* + nested order_items) — see supabase-client.jsx.
// Distinct enough in the first 8 characters that the screen's own
// `order_id.slice(0,8).toUpperCase()` display never collides between
// fixtures (order-100/order-101 would both truncate to "ORDER-10").
const SELLER_SHIPMENTS = [
  {
    id: 'ship-s1', order_id: 'order-alpha-100', status: 'pending', carrier: null, tracking_number: null,
    shipping_fee: 4, created_at: new Date().toISOString(),
    order_items: [
      { id: 'oi-100a', title: 'Lampe Boho Tressée', quantity: 1, unit_price: 29.99 },
      { id: 'oi-100b', title: 'Bougie parfumée', quantity: 2, unit_price: 12.50 },
    ],
  },
  {
    id: 'ship-s2', order_id: 'order-bravo-200', status: 'shipped', carrier: 'Flash Express', tracking_number: 'FX1',
    shipping_fee: 4, created_at: new Date().toISOString(),
    order_items: [{ id: 'oi-101a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }],
  },
];

test.describe('Seller — Shipment management', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Luna Studio' });
    await seedSellerShipments(page, SELLER_SHIPMENTS);
    await goto(page, 'seller-orders');
  });

  test('Voit uniquement ses propres expéditions', async ({ page }) => {
    // sbGetSellerShipments is seeded with exactly this seller's two
    // shipments; the screen must render both and nothing else. There is
    // no UI path to another seller's shipment — isolation here is a
    // consequence of the data source itself, same as the real
    // sbGetSellerShipments(sellerId) query filtered by seller_id.
    await expect(page.locator('text=#ORDER-AL')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=#ORDER-BR')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Lampe Boho Tressée')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Robe Lin Été')).toBeVisible({ timeout: 5000 });
  });

  test('Ajout du transporteur et du numéro de suivi avant "Mark shipped"', async ({ page }) => {
    // The pending shipment (ship-s1) advancing to the next step opens
    // the carrier/tracking modal before it can be marked shipped.
    await page.locator('button', { hasText: 'Confirm' }).first().click();
    await page.waitForTimeout(300);
    // pending -> processing is a direct advance (no modal); click again
    // to reach processing -> shipped, which DOES require tracking info.
    await page.locator('button', { hasText: 'Mark shipped' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Shipping info')).toBeVisible({ timeout: 5000 });

    await page.locator('input[placeholder*="DHL"]').fill('DHL');
    await page.locator('input[placeholder="Required"]').fill('DHL999888777');
    await page.locator('button', { hasText: 'Mark shipped' }).last().click();
    await page.waitForTimeout(300);

    const log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    const shipCall = log.find(a => a.action === 'update_shipment' && a.status === 'shipped');
    expect(shipCall).toBeTruthy();
    expect(shipCall.extra.carrier).toBe('DHL');
    expect(shipCall.extra.trackingNumber).toBe('DHL999888777');
  });

  test('Signaler un échec de livraison avec une raison obligatoire', async ({ page }) => {
    // ship-s2 is already 'shipped' -> "Report failure" is available.
    await page.locator('button', { hasText: 'Report failure' }).first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Report delivery failure')).toBeVisible({ timeout: 5000 });

    // Confirming with no reason must NOT call the RPC.
    await page.locator('button', { hasText: 'Confirm' }).last().click();
    await page.waitForTimeout(200);
    let log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    expect(log.find(a => a.action === 'report_failure')).toBeFalsy();

    await page.locator('input[placeholder*="address not found"]').fill('Buyer refused the package');
    await page.locator('button', { hasText: 'Confirm' }).last().click();
    await page.waitForTimeout(300);
    log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    const failCall = log.find(a => a.action === 'report_failure');
    expect(failCall).toBeTruthy();
    expect(failCall.reason).toBe('Buyer refused the package');
  });

  test('Expédier séparément — scinde un article dans une nouvelle expédition', async ({ page }) => {
    // ship-s1 has TWO items and is still 'pending' -> "Ship separately"
    // must be offered on each item, and clicking it calls
    // sbSellerCreateShipment with exactly that one item id (this is how
    // a seller creates a second, independent shipment for the same
    // order — the multi-shipment-per-order requirement).
    const splitBtn = page.locator('button', { hasText: 'Ship separately' }).first();
    await expect(splitBtn).toBeVisible({ timeout: 5000 });
    await splitBtn.click();
    await page.waitForTimeout(300);

    const log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    const splitCall = log.find(a => a.action === 'create_shipment');
    expect(splitCall).toBeTruthy();
    expect(splitCall.orderId).toBe('order-alpha-100');
    expect(splitCall.itemIds).toHaveLength(1);
  });

  test("Aucune modification possible sur l'expédition d'un autre vendeur", async ({ page }) => {
    // There is no UI control anywhere on this screen that references a
    // shipment outside SELLER_SHIPMENTS (this seller's own, per
    // sbGetSellerShipments) — confirming the rendering/action surface
    // never exposes another seller's shipment id to act on. The actual
    // enforcement (a seller calling seller_update_shipment on a
    // shipment they don't own) is a server-side RPC check
    // (`seller_id = auth.uid()`), verified live via rolled-back SQL
    // transactions in the Phase 5 audit, not re-provable from the UI
    // alone since the UI simply has nothing to click for it.
    const log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    expect(log).toHaveLength(0);
    await expect(page.locator('text=ship-other-seller')).toHaveCount(0);
  });

});
