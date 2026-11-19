# Running the Clorivo Playwright suite

## Why this exists

`Clorivo.html` loads React, ReactDOM, `@babel/standalone` and
`@supabase/supabase-js` from `unpkg.com` and `cdn.jsdelivr.net` via plain
`<script src="...">` tags — that file is never changed by this test
infrastructure, and a real deployment still loads those scripts from the
real CDNs exactly as before.

Some environments (notably network-policy-restricted sandboxes) deny
outbound access to `unpkg.com` / `cdn.jsdelivr.net` specifically. Without
those four scripts, `app.jsx` never finishes loading, `window.__navigate`
never gets defined, and every spec fails immediately with
`TypeError: window.__navigate is not a function` — a test-infrastructure
problem, not an application bug.

## How it's solved

- `helpers/cdn-vendor.js` installs **Playwright browser-level request
  interception** (`context.route()`) for the exact four CDN URLs
  `Clorivo.html` requests. Each is answered locally, from the same
  packages installed as devDependencies in `tests/package.json`
  (`react@18.3.1`, `react-dom@18.3.1`, `@babel/standalone@7.29.0`,
  `@supabase/supabase-js@2.117.3` — see that file's header comment for
  why 2.117.3 specifically), **before the browser's request is ever sent
  over the network**. The denied CONNECT to those hosts is never
  attempted; nothing is tunneled, proxied around, or otherwise bypassed.
- Before serving react, react-dom, or babel's local copy, their SHA-384
  hash is computed and compared **byte-for-byte** against the exact
  `integrity="sha384-..."` attribute `Clorivo.html` itself declares for
  that script. A mismatch throws and fails the run immediately — this
  guarantees a test can never silently run against different code than
  what `Clorivo.html` actually pins. (`@supabase/supabase-js`'s `<script>`
  tag has no `integrity` attribute in `Clorivo.html` — there is nothing to
  check it against; see the code comment in `cdn-vendor.js`.)
- `fixtures.js` wraps `@playwright/test`'s own `test`/`expect` with an
  `{ auto: true }` fixture that installs those routes on every test's
  browser context automatically. Every spec imports `test`/`expect` from
  `../../fixtures.js` instead of `@playwright/test` directly — a one-line
  import change, no assertion or test body touched.

Nothing here mocks or stubs the application's own logic: the real React,
real ReactDOM, real Babel, and real supabase-js run, unchanged, just served
from a local file instead of a CDN host for the duration of a test.

## Running the suite

Locally or in CI, with network access to install npm packages once
(`registry.npmjs.org`) but **no** access to `unpkg.com` /
`cdn.jsdelivr.net` required at test-run time:

```bash
cd tests
npm install
npx playwright install chromium   # once, if not already installed
npx playwright test
```

Same commands as before this change — `playwright.config.js` is
untouched; the `--project=buyer|seller|admin|e2e` filters still work.
On a CI runner with normal unrestricted internet access, the exact same
commands behave identically (the interception is harmless there too: it
answers from local, integrity-verified files instead of a real CDN
round-trip, which is also strictly faster and flake-proof against CDN
outages).

## If `Clorivo.html`'s pinned versions ever change

Update the versions in `tests/package.json`'s devDependencies and the
`EXPECTED_INTEGRITY` hashes in `helpers/cdn-vendor.js` to match. The
integrity check will fail loudly (before any test runs) if these ever
drift out of sync with what `Clorivo.html` actually declares.
