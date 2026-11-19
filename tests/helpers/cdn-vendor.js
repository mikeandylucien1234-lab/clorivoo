/**
 * Serves the exact CDN scripts Clorivo.html loads (React, ReactDOM,
 * @babel/standalone, @supabase/supabase-js) from local npm-installed
 * copies instead of letting the browser fetch them from unpkg.com /
 * cdn.jsdelivr.net. This exists only to run the Playwright suite in
 * environments whose network policy denies those two CDN hosts
 * (e.g. this sandbox) — Clorivo.html itself is never touched, and a
 * real deployment still loads from the real CDNs exactly as before.
 *
 * Each request is still intercepted at the browser-network layer with
 * Playwright's own page.route(): the browser's request to unpkg.com /
 * cdn.jsdelivr.net is answered locally before it is ever dispatched
 * over the network, so nothing is tunneled or routed around the
 * sandbox's CONNECT denial for those hosts — the denied request is
 * simply never made.
 *
 * Integrity: for the three scripts Clorivo.html pins with a
 * `integrity="sha384-..."` attribute (react, react-dom, babel), the
 * local file's own SHA-384 is computed and compared byte-for-byte
 * against that exact hash before every test run. A mismatch throws
 * immediately and fails the whole run — this is not a soft warning.
 * supabase-js is not pinned in Clorivo.html at all (its <script src>
 * is a floating "@2" tag with no integrity attribute), so there is no
 * hash to check it against; see SUPABASE_JS_VERSION below for how that
 * version is chosen and documented instead.
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTS_ROOT = path.resolve(__dirname, '..');

// Exact versions Clorivo.html's <script> tags reference. React,
// react-dom and @babel/standalone are version-pinned there directly;
// @supabase/supabase-js's tag floats on "@2" with no integrity hash,
// so we pin it here to the latest 2.x release as of this test
// infrastructure's creation (2.117.3) — the same thing jsdelivr would
// currently resolve "@2" to. If Clorivo.html is ever changed to pin an
// exact supabase-js version, update SUPABASE_JS_VERSION to match.
export const SUPABASE_JS_VERSION = '2.117.3';

// SHA-384 integrity hashes exactly as declared in Clorivo.html's own
// <script integrity="sha384-..."> attributes (lines ~144-146). Kept
// here as plain literals (not re-read from Clorivo.html at runtime) so
// a future accidental edit to Clorivo.html's pinned versions is caught
// as a loud mismatch rather than silently re-trusting whatever is
// there then.
const EXPECTED_INTEGRITY = {
  react:
    'sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L',
  reactDom:
    'sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm',
  babelStandalone:
    'sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y',
};

function sha384Base64(filePath) {
  const buf = readFileSync(filePath);
  return 'sha384-' + createHash('sha384').update(buf).digest('base64');
}

function assertIntegrity(label, filePath, expected) {
  const actual = sha384Base64(filePath);
  if (actual !== expected) {
    throw new Error(
      `[cdn-vendor] Integrity check FAILED for ${label}.\n` +
      `  file:     ${filePath}\n` +
      `  expected: ${expected}\n` +
      `  actual:   ${actual}\n` +
      `This must match the integrity= attribute Clorivo.html declares for this ` +
      `script exactly. Refusing to serve a local copy that does not match — ` +
      `fix the installed package version, do not relax this check.`
    );
  }
}

// Resolved once per process: {urlPattern, localPath, contentType}[].
// Integrity is verified eagerly here (not lazily per-request) so a
// mismatch fails the whole run immediately, before any test executes,
// rather than only on first navigation.
// react/react-dom/@babel/standalone's package.json "exports" maps only
// expose their main entry points to Node's resolver — require.resolve()
// on a UMD subpath like 'react/umd/react.development.js' is rejected
// with "not defined by exports" even though the file is physically
// present in the installed package. We only need the file's path on
// disk (to read its bytes), not to actually import it as a module, so
// resolve each package's own package.json (which every "exports" map
// still allows) and join the known-good UMD subpath onto its directory
// instead of asking Node's resolver to approve that subpath.
function packageDir(pkgName) {
  return path.dirname(require.resolve(`${pkgName}/package.json`));
}

function resolveVendoredScripts() {
  const reactPath = path.join(packageDir('react'), 'umd', 'react.development.js');
  const reactDomPath = path.join(packageDir('react-dom'), 'umd', 'react-dom.development.js');
  const babelPath = path.join(packageDir('@babel/standalone'), 'babel.min.js');
  // @supabase/supabase-js ships only an unminified UMD build
  // (dist/umd/supabase.js) in this version — no dist/umd/supabase.min.js
  // exists in the published npm package, unlike the on-the-fly-minified
  // file jsdelivr happens to serve at the `.min.js` URL. Same code,
  // same behavior, just not whitespace-minified. There is no integrity
  // hash declared for this script in Clorivo.html to check either copy
  // against.
  const supabasePath = path.join(packageDir('@supabase/supabase-js'), 'dist', 'umd', 'supabase.js');

  assertIntegrity('react@18.3.1', reactPath, EXPECTED_INTEGRITY.react);
  assertIntegrity('react-dom@18.3.1', reactDomPath, EXPECTED_INTEGRITY.reactDom);
  assertIntegrity('@babel/standalone@7.29.0', babelPath, EXPECTED_INTEGRITY.babelStandalone);

  // Exact URL strings, copied verbatim from Clorivo.html's own
  // <script src="..."> attributes — not globs — so a route can only
  // ever match the precise script Clorivo.html actually requests.
  return [
    {
      urlPattern: 'https://unpkg.com/react@18.3.1/umd/react.development.js',
      localPath: reactPath,
      contentType: 'application/javascript',
    },
    {
      urlPattern: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
      localPath: reactDomPath,
      contentType: 'application/javascript',
    },
    {
      urlPattern: 'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
      localPath: babelPath,
      contentType: 'application/javascript',
    },
    {
      urlPattern: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
      localPath: supabasePath,
      contentType: 'application/javascript',
    },
  ];
}

let _cached = null;
function getVendoredScripts() {
  if (!_cached) _cached = resolveVendoredScripts();
  return _cached;
}

/**
 * Registers route interception on the given BrowserContext for every
 * CDN script Clorivo.html loads, fulfilling each from the local,
 * integrity-verified copy instead of letting the request reach the
 * network. Call once per test (per context) before navigating.
 */
export async function installCdnVendorRoutes(context) {
  const scripts = getVendoredScripts();
  for (const { urlPattern, localPath, contentType } of scripts) {
    await context.route(urlPattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType,
        body: readFileSync(localPath),
      });
    });
  }
}
