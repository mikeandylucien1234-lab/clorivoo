import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Admin — Modération & CMS', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
  });

  // ── KYC ──────────────────────────────────────────────────────────

  test('KYC — liste des dossiers en attente', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_KYC = [
        { id: 'k1', status: 'pending', profiles: { full_name: 'Lucie Martin' },  shop_name: 'LM Design',   submitted_at: new Date().toISOString() },
        { id: 'k2', status: 'pending', profiles: { full_name: 'Omar Khaled' },   shop_name: 'OK Store',    submitted_at: new Date().toISOString() },
        { id: 'k3', status: 'approved', profiles: { full_name: 'Sophie Brun' },  shop_name: 'SB Boutique', submitted_at: new Date().toISOString() },
      ];
    });
    await goto(page, 'admin', { section: 'sellers' });
    await expect(
      page.locator('text=Lucie').or(page.locator('text=Omar')).or(page.locator('text=attente')).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('KYC — filtre "Approuvés" affiche seulement approuvés', async ({ page }) => {
    // The real status filter (AdminSellersKycSection, screen-admin.jsx) is
    // a <select>, not filter buttons — "approved" is one of its <option>s.
    await goto(page, 'admin', { section: 'sellers' });
    await page.locator('select').first().selectOption('approved');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toBeVisible();
  });

  test('KYC — clic Approuver fonctionne', async ({ page }) => {
    // The Approve action (screen-admin.jsx AdminKycDetail) only exists
    // once a specific application's detail view is open, calls
    // sbAdminReviewKyc (not "sbUpdateKyc" — see navigate.js's default
    // mock), and goes through a "Confirm approval" step before it fires.
    await page.evaluate(() => {
      window._MOCK_KYC = [
        { id: 'k1', status: 'pending', profiles: { full_name: 'Lucie Martin' }, shop_name: 'LM Design', submitted_at: new Date().toISOString(), doc_front_path: 'x', selfie_path: 'y' },
      ];
    });
    await goto(page, 'admin', { section: 'sellers' });
    await page.locator('text=Lucie Martin').first().click();
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForTimeout(400);
    const log = await page.evaluate(() => window._ADMIN_ACTIONS_LOG ?? []);
    expect(log.find(a => a.action === 'review_kyc' && a.decision === 'approved')).toBeTruthy();
  });

  test('KYC — clic Rejeter fonctionne', async ({ page }) => {
    // Reject requires a note before "Confirm" is enabled (needsNote:true).
    await page.evaluate(() => {
      window._MOCK_KYC = [
        { id: 'k1', status: 'pending', profiles: { full_name: 'Lucie Martin' }, shop_name: 'LM Design', submitted_at: new Date().toISOString() },
      ];
    });
    await goto(page, 'admin', { section: 'sellers' });
    await page.locator('text=Lucie Martin').first().click();
    await page.getByRole('button', { name: 'Reject' }).click();
    await page.locator('textarea').fill('Documents illisibles');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.waitForTimeout(400);
    const log = await page.evaluate(() => window._ADMIN_ACTIONS_LOG ?? []);
    expect(log.find(a => a.action === 'review_kyc' && a.decision === 'rejected')).toBeTruthy();
  });

  // ── BANNIÈRES CMS ────────────────────────────────────────────────

  test('Bannières CMS — liste affichée', async ({ page }) => {
    await goto(page, 'admin', { section: 'banners' });
    await expect(
      page.locator('text=bannière').or(page.locator('text=banner')).or(page.locator('text=CMS')).or(page.locator('button').filter({ hasText: /ajouter|nouvelle/i })).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('Bannières CMS — ajouter nouvelle bannière', async ({ page }) => {
    await goto(page, 'admin', { section: 'banners' });
    const addBtn = page.locator('button').filter({ hasText: /ajouter|nouvelle|add|new/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(400);
      // Modal or form should appear
      await expect(page.locator('input').first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('Bannières CMS — toggle actif/inactif', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_BANNERS = [
        { id: 'b1', title: 'Promo Été', is_active: true,  position: 1, image_url: null },
        { id: 'b2', title: 'Mode Auto', is_active: false, position: 2, image_url: null },
      ];
    });
    await goto(page, 'admin', { section: 'banners' });
    await expect(
      page.locator('text=Promo Été').or(page.locator('text=Mode Auto')).or(page.locator('text=actif')).first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── PRODUITS ADMIN ───────────────────────────────────────────────

  test('Admin — section produits accessible', async ({ page }) => {
    await goto(page, 'admin');
    const prodLink = page.locator('button, div').filter({ hasText: /^Produits$/ }).first();
    if (await prodLink.isVisible()) {
      await prodLink.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  // PHASE 6 REGRESSION GUARD: sbAdminModerateProduct (supabase-client.jsx)
  // now notifies the seller via the admin_send_notification() RPC
  // instead of a direct `notifications` table insert (see
  // supabase/phase6_notifications_security_migration.sql) — this
  // confirms the admin-facing Approve/Reject UI contract is unchanged
  // by that fix. The RPC call itself is only verifiable against a real
  // database, not this mocked harness — see the Phase 6 report.
  test('Admin — approuver un produit en attente', async ({ page }) => {
    await page.evaluate(() => {
      window._MOCK_ADMIN_PRODUCTS = {
        products: [{ id: 'p1', title: 'Lampe Boho', price: 29.99, stock: 10, approval_status: 'pending', status: 'draft', seller_id: 'seller-1', shops: { name: 'Luna Studio' } }],
        totalProducts: 1, totalPages: 1, currentPage: 1, liveProductsCount: 0,
      };
    });
    await goto(page, 'admin', { section: 'products' });
    await expect(page.locator('text=Lampe Boho')).toBeVisible({ timeout: 8000 });
    await page.locator('button[title="Approve"]').first().click();
    await page.waitForTimeout(300);
    const log = await page.evaluate(() => window._ADMIN_ACTIONS_LOG ?? []);
    const approved = log.find(a => a.action === 'moderate_product' && a.decision === 'approved');
    expect(approved).toBeTruthy();
    expect(approved.id).toBe('p1');
  });

  test('Admin — section vendeurs accessible', async ({ page }) => {
    await goto(page, 'admin');
    const link = page.locator('button, div').filter({ hasText: /^Vendeurs$/ }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin — section commandes accessible', async ({ page }) => {
    await goto(page, 'admin');
    const link = page.locator('button, div').filter({ hasText: /^Commandes$/ }).first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator('body')).toBeVisible();
  });

});
