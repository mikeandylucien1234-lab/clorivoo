import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Seller — Onboarding & KYC', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'seller', name: 'Marc Vendeur', email: 'marc@boutique.io' });
  });

  test('Écran Devenir Vendeur — pitch affiché', async ({ page }) => {
    // Real screen title (screen-seller.jsx BecomeSellerScreen) is "Create
    // Seller Account" with a "Personal information" section — no French
    // "vendeur"/"boutique"/"Commencer" text exists.
    await goto(page, 'become-seller');
    await expect(page.getByText('Create Seller Account').or(page.getByText('Personal information')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Become Seller — bouton CTA visible', async ({ page }) => {
    await goto(page, 'become-seller');
    await expect(
      page.locator('button').filter({ hasText: /continue|next|submit/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('KYC — étape pièce d\'identité', async ({ page }) => {
    await goto(page, 'kyc-doc');
    await expect(page.getByText('Upload Documents')).toBeVisible({ timeout: 5000 });
  });

  test('KYC — bouton upload visible', async ({ page }) => {
    // UploadZone's clickable control (screen-seller.jsx) is a plain
    // <div onClick=...>, not a <button> — a button-tag-only selector can
    // never match it regardless of its text.
    await goto(page, 'kyc-doc');
    await expect(page.getByText('Tap to choose a photo').first()).toBeVisible({ timeout: 5000 });
  });

  // Was a genuine crash (ReferenceError: flash is not defined,
  // screen-seller.jsx KycSelfieScreen) — fixed by declaring the missing
  // `const [flash, setFlash] = React.useState(false)` for the camera
  // flash-toggle button. Re-enabled now that the screen renders.
  test('KYC — étape selfie', async ({ page }) => {
    await goto(page, 'kyc-selfie');
    await expect(
      page.getByText('Face Verification').or(page.getByText('Position your face in the circle')).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('KYC — flash toggle ne plante pas l\'écran', async ({ page }) => {
    await goto(page, 'kyc-selfie');
    await page.getByText('Flash').click();
    await page.waitForTimeout(200);
    // Toggling flash must not crash the screen a second time — regression
    // guard for the exact bug this fix addresses.
    await expect(page.getByText('Face Verification')).toBeVisible();
  });

  test('KYC — prendre un selfie active le bouton Continue', async ({ page }) => {
    // The shutter button opens a native camera/file picker via a hidden
    // <input type="file" accept="image/*" capture="user"> — there is no
    // custom getUserMedia() camera feed to drive in this prototype, so
    // "taking a live selfie" is simulated the same way a real mobile
    // browser's native camera picker hands a captured photo back to the
    // page: as a file on that same input.
    await goto(page, 'kyc-selfie');
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();
    await page.locator('input[type="file"]').setInputFiles({ name: 'selfie.png', mimeType: 'image/png', buffer: Buffer.from('fake-image-bytes') });
    await page.waitForTimeout(200);
    await expect(page.getByText('Photo ready')).toBeVisible();
    await expect(continueBtn).toBeEnabled();
  });

  test('KYC Success — confirmation d\'envoi', async ({ page }) => {
    // Real text (screen-seller.jsx KycSuccessScreen): "Your Application Has
    // Been Submitted" — no "envoyé"/"reçu"/"succès"/"✅" exists.
    await goto(page, 'kyc-success');
    await expect(page.getByText('Submitted', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('KYC Success — bouton continuer', async ({ page }) => {
    await goto(page, 'kyc-success');
    await expect(
      page.locator('button').filter({ hasText: /continuer|accueil|home|dashboard/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });

});
