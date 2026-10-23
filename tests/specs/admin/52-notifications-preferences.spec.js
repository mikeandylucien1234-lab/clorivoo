// AdminNotifSection's 5 personal notification preferences, now backed
// by the real notification_preferences table (RLS-scoped to
// auth.uid()) instead of window._NOTIF_SETTINGS. Mocked like every
// other spec in this suite — these test the component's load/save/
// error/race logic; see the final report for what was verified
// directly against the live project's RLS instead.
import { test, expect } from '../../fixtures.js';
import { goto, mockAuth } from '../../helpers/navigate.js';

test.describe('Admin — Notification preferences (persisted, mocked outcomes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await mockAuth(page, { role: 'admin', name: 'Admin Clorivo', email: 'admin@clorivo.io' });
  });

  test('loads saved preferences from the backend on open (not the old hardcoded defaults)', async ({ page }) => {
    await page.evaluate(() => {
      window.sbGetMyAdminNotificationPrefs = async () => ({ newOrders: false, newSellers: true, urgentReports: false, weeklyReports: true, marketingEmails: true });
    });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('New orders')).toBeVisible({ timeout: 8000 });
    // Switch for "New orders" should render OFF (false), not the old
    // hardcoded default of true — proves it's reading real saved state.
    const row = page.locator('div', { hasText: 'New orders' }).first();
    await expect(row.locator('button')).toHaveCSS('justify-content', 'flex-start'); // Switch renders OFF this way
  });

  test('toggling a preference saves it and shows Saved, then clears', async ({ page }) => {
    let savedCalls = [];
    await page.evaluate(() => {
      window.sbGetMyAdminNotificationPrefs = async () => ({ newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false });
      window.sbSetMyAdminNotificationPref = async (key, value) => {
        window.__savedCalls = window.__savedCalls || [];
        window.__savedCalls.push([key, value]);
        return { error: null };
      };
    });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('New orders')).toBeVisible({ timeout: 8000 });
    const row = page.locator('div', { hasText: 'New orders' }).first();
    await row.locator('button').click();
    await expect(page.getByText('Saving…')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });
    savedCalls = await page.evaluate(() => window.__savedCalls);
    expect(savedCalls).toEqual([['newOrders', false]]);
  });

  test('a failed save reverts the toggle and shows an error — never claims it saved', async ({ page }) => {
    await page.evaluate(() => {
      window.sbGetMyAdminNotificationPrefs = async () => ({ newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false });
      window.sbSetMyAdminNotificationPref = async () => ({ error: { message: 'simulated backend failure' } });
    });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('New orders')).toBeVisible({ timeout: 8000 });
    const row = page.locator('div', { hasText: 'New orders' }).first();
    await row.locator('button').click();
    await expect(page.getByText('Could not save — tap to retry')).toBeVisible({ timeout: 5000 });
    // Reverted to ON (the last confirmed value) — never left showing
    // the failed OFF value as if it had been saved.
    await expect(row.locator('button')).toHaveCSS('justify-content', 'flex-end');
    await expect(page.getByText('Saved')).toHaveCount(0);
  });

  test('reloading the section restores the persisted values (simulated reload)', async ({ page }) => {
    await page.evaluate(() => {
      window.__backend = { newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false };
      window.sbGetMyAdminNotificationPrefs = async () => ({ ...window.__backend });
      window.sbSetMyAdminNotificationPref = async (key, value) => { window.__backend[key] = value; return { error: null }; };
    });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('Weekly reports')).toBeVisible({ timeout: 8000 });
    const weeklyRow = page.locator('div', { hasText: 'Weekly reports' }).first();
    await weeklyRow.locator('button').click();
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });
    // Navigate away and back — a fresh mount re-reads from "the backend".
    await goto(page, 'admin', { section: 'overview' });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('Weekly reports')).toBeVisible({ timeout: 8000 });
    const weeklyRowAgain = page.locator('div', { hasText: 'Weekly reports' }).first();
    await expect(weeklyRowAgain.locator('button')).toHaveCSS('justify-content', 'flex-end'); // now ON, restored
  });

  test('the Broadcast panel still works unchanged alongside the new preferences', async ({ page }) => {
    await page.evaluate(() => {
      window.sbGetMyAdminNotificationPrefs = async () => ({ newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false });
      window.sbSetMyAdminNotificationPref = async () => ({ error: null });
    });
    await goto(page, 'admin', { section: 'notifications' });
    await expect(page.getByText('Broadcast')).toBeVisible({ timeout: 8000 });
    await page.getByPlaceholder(/Flash sale/).fill('Test broadcast');
    await page.getByPlaceholder(/-40% on everything/).fill('Body text');
    await page.getByRole('button', { name: /Review & Send Broadcast/i }).click();
    await expect(page.getByText(/This cannot be undone/)).toBeVisible({ timeout: 5000 });
  });
});
