import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_PORT = process.env.STATIC_SERVER_PORT ?? '4173';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,   // tests share a browser context per role, run sequentially per file
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },

  reporter: [
    ['html', { outputFolder: 'report', open: 'never' }],
    ['list'],
  ],

  // Serves Clorivo.html + the screen-*.jsx files over plain HTTP instead of
  // file://. Under file://, babel-standalone's `<script type="text/babel"
  // src="...">` tags fail to load (Chromium blocks the internal fetch as
  // cross-origin for local files), so window.__navigate — defined last, in
  // app.jsx — never exists and every test fails with "window.__navigate is
  // not a function" regardless of what's being tested. Plain HTTP removes
  // that restriction with no browser flags. BASE_URL still overrides this
  // (e.g. to point at a deployed preview) and skips starting the server.
  webServer: process.env.BASE_URL ? undefined : {
    command: `node ${path.resolve(__dirname, 'static-server.mjs')} ${STATIC_PORT}`,
    url: `http://localhost:${STATIC_PORT}/Clorivo.html`,
    reuseExistingServer: true,
    timeout: 10_000,
  },

  use: {
    // Root, not /Clorivo.html: specs call page.goto('/') and the static
    // server itself maps '/' to Clorivo.html (see static-server.mjs).
    baseURL: process.env.BASE_URL ?? `http://localhost:${STATIC_PORT}/`,
    headless: true,
    viewport: { width: 390, height: 844 },   // iPhone 14 Pro
    deviceScaleFactor: 2,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Some sandboxed runners (e.g. Claude Code's web container) pre-install
    // a specific Chromium build at PLAYWRIGHT_BROWSERS_PATH/chromium rather
    // than whatever revision the installed @playwright/test expects, so the
    // default browser resolution fails with "Executable doesn't exist".
    // When that env var is present, launch that exact binary instead of
    // letting Playwright resolve its own managed browser; everywhere else
    // (CI, local dev) this is unset and behavior is unchanged.
    //
    // The same sandboxes also route all outbound HTTPS through a local
    // forward proxy (HTTPS_PROXY) that terminates TLS with its own CA —
    // needed for the CDN scripts this prototype loads (React, ReactDOM,
    // @babel/standalone, Google Fonts). A freshly launched Chromium
    // neither uses that proxy nor trusts its CA by default, so those
    // requests fail (ERR_TUNNEL_CONNECTION_FAILED / ERR_CERT_AUTHORITY_
    // INVALID) unless both are configured explicitly here. This only
    // weakens TLS validation for this disposable, sandboxed test browser
    // instance — never for any real user or production traffic.
    launchOptions: {
      ...(process.env.PLAYWRIGHT_BROWSERS_PATH
        ? { executablePath: path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium') }
        : {}),
      ...(process.env.HTTPS_PROXY
        ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' }, args: ['--ignore-certificate-errors'] }
        : {}),
    },
  },

  projects: [
    { name: 'buyer',  testMatch: '**/buyer/**' },
    { name: 'seller', testMatch: '**/seller/**' },
    // The admin console is a desktop back-office surface: tokens.jsx's own
    // DESKTOP_BP is 900px, and AdminSidebarFull (screen-admin.jsx) returns
    // null below that width by design — there is no mobile sidebar to find
    // at all. Running these specs at the shared 390px phone viewport made
    // every sidebar-dependent assertion fail for a reason that has nothing
    // to do with the test or the app being broken; it was asking a mobile
    // viewport for a screen the app itself only renders at desktop width.
    { name: 'admin',  testMatch: '**/admin/**', use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'e2e',    testMatch: '**/e2e/**' },
  ],
});
