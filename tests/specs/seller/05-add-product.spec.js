import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Seller — Add Product', () => {

  test('Seller can submit a new product for review', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });
    await goto(page, 'seller-product-new');

    await page.getByPlaceholder('e.g. Boho Woven Lamp').fill('Handwoven Rattan Basket');
    await page.getByPlaceholder('29.99').fill('24.99');
    await page.getByPlaceholder('1', { exact: true }).fill('10');
    await page.getByRole('button', { name: 'Submit for Review' }).click();
    await page.waitForTimeout(400);

    await expect(page.getByText('Product submitted')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Handwoven Rattan Basket', { exact: false })).toBeVisible();

    // Ownership + moderation state: shop_id/seller_id resolved from the
    // caller's own shop, never auto-approved like admin-authored products.
    const log = await page.evaluate(() => window._SELLER_ACTIONS_LOG ?? []);
    const created = log.find(a => a.action === 'create_product');
    expect(created).toBeTruthy();
    expect(created.shopId).toBeTruthy();
    expect(created.sellerId).toBeTruthy();
    expect(created.product.title).toBe('Handwoven Rattan Basket');
  });

  test('Submit is disabled without a title or a price', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });
    await goto(page, 'seller-product-new');

    const submitBtn = page.getByRole('button', { name: 'Submit for Review' });
    await expect(submitBtn).toBeDisabled();

    await page.getByPlaceholder('e.g. Boho Woven Lamp').fill('No price yet');
    await expect(submitBtn).toBeDisabled();

    await page.getByPlaceholder('29.99').fill('0');
    await expect(submitBtn).toBeDisabled();

    await page.getByPlaceholder('29.99').fill('15');
    await expect(submitBtn).toBeEnabled();
  });

  test('A buyer with no shop cannot reach the form', async ({ page }) => {
    // Real barrier is RLS (products insert policy requires shop_id in the
    // caller's own shops, or seller_id = auth.uid()) — this screen-level
    // check is defense in depth, same as every other admin/seller guard
    // in this codebase, so sbSellerCreateProduct is never even reachable
    // for a buyer with no shop of their own.
    await page.goto('/');
    await mockAuth(page, { role: 'buyer', name: 'Alice Dupont' });
    await goto(page, 'seller-product-new');
    await expect(page.getByText('Sellers only')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('e.g. Boho Woven Lamp')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Become a Seller' })).toBeVisible();
  });

  test('A seller with no shop yet cannot reach the form', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur' });
    await page.evaluate(() => { window.sbGetMyShop = async () => null; });
    await goto(page, 'seller-product-new');
    await expect(page.getByText('Sellers only')).toBeVisible({ timeout: 5000 });
  });

});
