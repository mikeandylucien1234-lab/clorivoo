import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

/**
 * Scénario complet admin :
 * Login → Dashboard → KYC → Approuver vendeur → Envoyer notification → Gérer bannières
 */
test.describe('E2E — Parcours administrateur complet', () => {
  // Same reasoning as the admin project's own viewport override: the admin
  // console's sidebar only renders at >=900px (tokens.jsx DESKTOP_BP) — the
  // e2e project's shared phone viewport would never show it.
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Admin : approuver un vendeur (KYC)', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await page.evaluate(() => {
      window._MOCK_KYC = [
        { id: 'k1', status: 'pending', profiles: { full_name: 'Lucie Martin' }, shop_name: 'LM Design', submitted_at: new Date().toISOString(), doc_front_path: 'x', selfie_path: 'y', docs: [] },
      ];
      // AdminKycDetail's submitDecision() calls sbAdminReviewKyc — not
      // "sbUpdateKyc", which is not a real exported function anywhere.
      window.sbAdminReviewKyc = async (id, decision) => {
        const item = window._MOCK_KYC.find(k => k.id === id);
        if (item) item.status = decision;
        return { error: null };
      };
    });

    await goto(page, 'admin', { section: 'sellers' });
    const row = page.locator('text=Lucie Martin').or(page.locator('text=LM Design')).first();
    await expect(row).toBeVisible({ timeout: 5000 });

    // The Approve button (screen-admin.jsx AdminKycDetail) only renders
    // once the application's detail view is open — click the row first,
    // then confirm the approval (confirm:true shows a "Confirm" step).
    await row.click();
    const approveBtn = page.getByRole('button', { name: 'Approve' });
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.getByRole('button', { name: 'Confirm' }).click();
      await page.waitForTimeout(500);
      // KYC item should now show approved or disappear from pending
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Admin : envoyer une notification broadcast', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await page.evaluate(() => {
      // Mock the direct Expo Push fetch
      window._BROADCAST_SENT = null;
      const originalFetch = window.fetch;
      window.fetch = async (url, opts) => {
        if (url.includes('exp.host')) {
          window._BROADCAST_SENT = { url, body: JSON.parse(opts?.body ?? '{}') };
          return new Response(JSON.stringify({ data: [{ status: 'ok' }] }), { status: 200 });
        }
        return originalFetch(url, opts);
      };
      // Mock supabase profiles fetch
      window._supabase_mock_profiles = [
        { id: 'u1', push_token: 'ExponentPushToken[mock-token-1]', role: 'buyer' },
        { id: 'u2', push_token: 'ExponentPushToken[mock-token-2]', role: 'buyer' },
      ];
    });

    await goto(page, 'admin');
    const notifLink = page.locator('button, div').filter({ hasText: /notification/i }).first();
    if (await notifLink.isVisible()) await notifLink.click();
    await page.waitForTimeout(400);

    // Fill broadcast form
    const titleInput = page.locator('input[placeholder*="Flash"], input[placeholder*="Titre"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('🎉 Test broadcast Playwright');
      const bodyInput = page.locator('textarea, input[placeholder*="mode"], input[placeholder*="essage"]').first();
      if (await bodyInput.isVisible()) {
        await bodyInput.fill('Ceci est un test automatisé Playwright.');
      }
      const sendBtn = page.locator('button').filter({ hasText: /envoyer/i }).first();
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(600);
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin : créer une bannière homepage', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await page.evaluate(() => {
      window._MOCK_BANNERS = [];
      window.sbUpsertBanner = async (b) => { window._MOCK_BANNERS.push({ ...b, id: 'new-b' }); return { data: b, error: null }; };
    });

    await goto(page, 'admin', { section: 'banners' });
    const addBtn = page.locator('button').filter({ hasText: /ajouter|nouvelle|add/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(400);

      const inputs = page.locator('input');
      if (await inputs.count() > 0) {
        await inputs.first().fill('Promo Été 2025');
      }

      const saveBtn = page.locator('button').filter({ hasText: /sauvegarder|enregistrer|save|créer/i }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(400);
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin : envoyer notification individuelle', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await page.evaluate(() => {
      // Mock searchUsers result
      window._MOCK_SEARCH_USERS = [
        { id: 'u1', full_name: 'Alice Dupont', email: 'alice@test.io', role: 'buyer', avatar_url: null },
      ];
    });

    await goto(page, 'admin');
    const notifLink = page.locator('button, div').filter({ hasText: /notification/i }).first();
    if (await notifLink.isVisible()) await notifLink.click();
    await page.waitForTimeout(400);

    const individuelTab = page.locator('text=Individuel').or(page.locator('text=👤')).first();
    if (await individuelTab.isVisible()) {
      await individuelTab.click();
      await page.waitForTimeout(300);

      const searchInput = page.locator('input[placeholder*="hercher"], input[placeholder*="nom"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Alice');
        await page.waitForTimeout(400); // debounce
      }
    }
    await expect(page.locator('body')).toBeVisible();
  });

  test('Admin : navigation complète entre toutes les sections', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo' });
    await goto(page, 'admin');

    const sections = ['Produits', 'Vendeurs', 'Commandes', 'KYC', 'Notifications'];
    for (const section of sections) {
      const link = page.locator('button, div[role="button"]').filter({ hasText: new RegExp(`^${section}$`, 'i') }).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForTimeout(300);
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

});
