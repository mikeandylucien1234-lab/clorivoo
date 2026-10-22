/**
 * Drop-in replacement for importing { test, expect } from '@playwright/test'.
 * Every spec imports test/expect from here instead so that, before any
 * page navigates, the browser context already has local, integrity-
 * verified stand-ins routed in for the four CDN scripts Clorivo.html
 * loads (react, react-dom, @babel/standalone, @supabase/supabase-js) —
 * see helpers/cdn-vendor.js for exactly what is served and how it is
 * verified. This changes nothing about what a spec asserts; it only
 * removes the test run's dependency on reaching unpkg.com / cdn.jsdelivr.net.
 *
 * Auto-fixture: declared with { auto: true } so it runs for every test
 * without any spec needing to request it explicitly.
 */
import { test as base, expect } from '@playwright/test';
import { installCdnVendorRoutes } from './helpers/cdn-vendor.js';

export const test = base.extend({
  _cdnVendor: [
    async ({ context }, use) => {
      await installCdnVendorRoutes(context);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
