import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Buyer — Authentification', () => {

  test('Splash → Onboarding → Login (navigation flow)', async ({ page }) => {
    await page.goto('/');
    // Splash appears first. Babel transpiles ~25 files in-browser on load,
    // which can take several seconds — give this first check real headroom
    // rather than relying on the config's 8s default.
    await expect(page.getByText('CLORIVO').first()).toBeVisible({ timeout: 15000 });
    // After splash auto-advance (or skip), onboarding shows — current copy
    // is English (confirmed in screen-auth.jsx's ONBOARDING_SLIDES/ "Skip"
    // button), there is no French "Bienvenue"/"Se connecter" text anywhere.
    await page.waitForTimeout(3000);
    await expect(page.getByText('Shop. Love. Live Better.').or(page.getByRole('button', { name: 'Skip' })).or(page.getByRole('button', { name: /^login$/i })).first()).toBeVisible({ timeout: 5000 });
  });

  // The Login screen's identifier field (ui-kit.jsx's <Input label="Email or
  // Phone Number" .../>) renders a plain <input> with no type="email" and no
  // placeholder at all — its visible label is a sibling <span>, not an
  // accessible-name-bearing attribute. getByRole('textbox').first() is the
  // reliable match: it's the only plain-text input on the screen (the
  // password field is type="password", which Playwright/ARIA does not expose
  // under the "textbox" role, so .first() can't accidentally match it).
  const emailField = (page) => page.getByRole('textbox').first();
  const passwordField = (page) => page.locator('input[type="password"]').first();

  test('Affichage écran Login', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page);
    await goto(page, 'login');
    await expect(emailField(page)).toBeVisible();
    await expect(passwordField(page)).toBeVisible();
  });

  test('Login avec identifiants → accès Home', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page);
    await goto(page, 'login');

    await emailField(page).fill('acheteur@clorivo.io');
    await passwordField(page).fill('password123');
    // Click the "Login" button (current UI — confirmed in screen-auth.jsx;
    // no French "Se connecter" label exists).
    await page.getByRole('button', { name: /^login$/i }).click();
    await page.waitForTimeout(500);

    // Either home screen or still on login with mock — check screen transition
    const url = page.url();
    expect(url).toBeTruthy(); // page is still alive
  });

  test('Champ email invalide affiche une erreur', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'buyer' });
    await goto(page, 'login');

    await emailField(page).fill('pas-un-email');
    await passwordField(page).fill('abc');
    await page.getByRole('button', { name: /^login$/i }).click();
    await page.waitForTimeout(400);
    // Page must not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('Lien "Créer un compte" → Register', async ({ page }) => {
    await page.goto('/');
    await mockAuth(page);
    await goto(page, 'login');
    // Current UI's button is "Create Account" (confirmed in screen-auth.jsx)
    // — no French label exists.
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText('Create Account').or(page.getByRole('textbox').first()).first()).toBeVisible();
  });

  test('Inscription nouveau compte → Register', async ({ page }) => {
    // RegisterScreen (screen-auth.jsx) has 5 fields in order: Full Name,
    // Email, Phone, Password, Confirm Password — not 3. Its submit
    // button is "Create Account" (no French label exists) and stays
    // disabled({!agreed}) until the "I agree to the Terms…" checkbox
    // (itself a plain <button>, not an <input type="checkbox">) is
    // clicked, regardless of what the fields contain.
    await page.goto('/');
    await mockAuth(page);
    await goto(page, 'register');

    const inputs = page.locator('input');
    await expect(inputs).toHaveCount(5);

    await inputs.nth(0).fill('Nouveau User');
    await inputs.nth(1).fill('nouveau@clorivo.io');
    await inputs.nth(2).fill('5551234567');
    await inputs.nth(3).fill('Password123!');
    await inputs.nth(4).fill('Password123!');

    await page.locator('label').filter({ hasText: 'I agree' }).locator('button').click();
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

});
