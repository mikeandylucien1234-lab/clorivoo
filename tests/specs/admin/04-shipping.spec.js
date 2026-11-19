import { test, expect } from '../../fixtures.js';
import { goto, mockAuth, seedAdminShipments, seedAccessCtx } from '../../helpers/navigate.js';

// Matches sbAdminGetShipments()'s real result shape exactly.
const SHIPMENTS_RESULT = {
  shipments: [
    {
      id: 'ship-adm-1', order_id: 'order-adm-100', status: 'shipped', carrier: 'DHL', tracking_number: 'DHL1',
      shipping_fee: 4, profiles: { full_name: 'Seller One' }, shops: { name: 'Luna Studio' },
      order_items: [{ id: 'oi-1', title: 'Lampe Boho Tressée' }],
    },
    {
      id: 'ship-adm-2', order_id: 'order-adm-200', status: 'failed', carrier: null, tracking_number: null,
      shipping_fee: 4, profiles: { full_name: 'Seller Two' }, shops: { name: 'TechZone' },
      order_items: [{ id: 'oi-2', title: 'Écouteurs Pro Max' }],
    },
  ],
  totalShipments: 2, totalPages: 1, currentPage: 1,
};

test.describe('Admin — Shipping management panel', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await seedAdminShipments(page, SHIPMENTS_RESULT);
  });

  test('Panneau Shipping accessible avec shipping.manage', async ({ page }) => {
    await seedAccessCtx(page, { isAdmin: true, isStaff: false, permissions: ['shipping.view', 'shipping.manage'] });
    await goto(page, 'admin', { section: 'shipping' });
    await expect(page.locator('text=Shipping').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Luna Studio')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=TechZone')).toBeVisible({ timeout: 8000 });
  });

  test('Recherche et filtres présents', async ({ page }) => {
    await seedAccessCtx(page, { isAdmin: true, isStaff: false, permissions: ['shipping.view', 'shipping.manage'] });
    await goto(page, 'admin', { section: 'shipping' });
    await expect(page.locator('input[placeholder*="tracking number"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button', { hasText: 'Delivery exceptions' })).toBeVisible({ timeout: 8000 });
    // Status filter buttons render their raw status string (e.g. "delivered"),
    // capitalized only via CSS text-transform — the actual text node is lowercase.
    await expect(page.locator('button', { hasText: /^delivered$/i })).toBeVisible({ timeout: 8000 });
  });

  test('Override requiert une note obligatoire', async ({ page }) => {
    await seedAccessCtx(page, { isAdmin: true, isStaff: false, permissions: ['shipping.view', 'shipping.manage'] });
    await goto(page, 'admin', { section: 'shipping' });

    await page.locator('button[title="Override"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=Override shipment')).toBeVisible({ timeout: 8000 });

    // Submit with no note: AdminShipmentOverrideModal.submit() validates
    // client-side (note.trim()) and returns before ever calling
    // sbAdminOverrideShipment — so the mock's own call log must stay
    // empty, and the inline error message must show instead.
    await page.locator('button', { hasText: 'Apply override' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('text=A note explaining this correction is required.')).toBeVisible({ timeout: 8000 });
    let log = await page.evaluate(() => window._ADMIN_ACTIONS_LOG ?? []);
    expect(log).toHaveLength(0);

    await page.locator('input').last().fill('Buyer confirmed receipt by phone');
    await page.locator('button', { hasText: 'Apply override' }).click();
    await page.waitForTimeout(300);
    log = await page.evaluate(() => window._ADMIN_ACTIONS_LOG ?? []);
    const withNote = log.find(a => a.note === 'Buyer confirmed receipt by phone');
    expect(withNote).toBeTruthy();
  });

  test('Bouton Override absent sans la permission shipping.manage', async ({ page }) => {
    // A staff member with only shipping.view (no shipping.manage) must
    // see the shipments list but never the override action — gated by
    // can('shipping.manage') exactly like the server-side RPC check.
    await seedAccessCtx(page, { isAdmin: false, isStaff: true, permissions: ['shipping.view'] });
    await goto(page, 'admin', { section: 'shipping' });
    await expect(page.locator('text=Luna Studio')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button[title="Override"]')).toHaveCount(0);
  });

});
