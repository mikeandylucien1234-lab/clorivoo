/**
 * Helpers to drive the Clorivo SPA (JSX/HTML prototype).
 * All navigation goes through window.__navigate / window.__goBack exposed by app.jsx.
 */

/**
 * app.jsx is the last of ~25 text/babel scripts Babel transpiles in-browser
 * on every page load; window.__navigate is only defined once that finishes.
 * page.goto()'s own load-event resolution does not guarantee Babel's
 * DOMContentLoaded-triggered transform pass has completed, so calling
 * window.__navigate immediately after goto()/a fresh page load can race it
 * and throw "window.__navigate is not a function". Wait for the real
 * readiness condition (the function existing) instead of a fixed sleep.
 */
async function waitForAppReady(page) {
  await page.waitForFunction(() => typeof window.__navigate === 'function', null, { timeout: 15000 });
}

/** Navigate to a named screen programmatically (bypasses splash/onboarding) */
export async function goto(page, screen, params = {}) {
  await waitForAppReady(page);
  // Previously worked around a missing `navKey` in NavContext.Provider
  // (app.jsx) that made same-screen navigations silently keep stale
  // component state — fixed directly in app.jsx now, so this helper no
  // longer needs to bounce through a neutral screen.
  await page.evaluate(
    ([s, p]) => window.__navigate(s, p),
    [screen, params],
  );
  await page.waitForTimeout(350); // animation
}

/** Tap the back button or call goBack() */
export async function goBack(page) {
  await waitForAppReady(page);
  await page.evaluate(() => window.__goBack());
  await page.waitForTimeout(300);
}

// Shared by mockAuth() below — applied through BOTH page.evaluate() (so it
// takes effect on the page instance that is already loaded, which is what
// every spec actually needs) and page.addInitScript() (so it also applies
// if a test ever does a real page.goto()/reload after calling mockAuth()).
//
// Why page.evaluate() is required, not just addInitScript(): every spec
// calls page.goto('/') once, then mockAuth(page, ...), then navigates
// in-app via window.__navigate() (goto() in this file) — never a second
// real browser navigation. addInitScript() only runs before a page's own
// scripts on a *future* navigation/reload; registering it after the page
// has already loaded has no effect on that already-loaded page at all.
// Since supabase-client.jsx's own `Object.assign(window, {sbGetUser, ...})`
// already ran during that one real page load (assigning the REAL,
// unmocked implementations), an addInitScript()-only mock was silently
// inert for the entire suite — every mocked value was always replaced by
// the real supabase-client.jsx functions, which return null/empty with
// no real backend configured, and the screens rendered their own built-in
// defaults instead of the seeded mock data.
//
// page.evaluate() runs this same override function against the CURRENT
// page right now, after supabase-client.jsx's Object.assign has already
// run (so there is nothing left to overwrite it again before the SPA
// navigation that follows reads these functions).
function applyAuthMockOverrides({ role, name, email }) {
    // Stub window._supabase + sbGetUser used throughout the screens
    window._MOCK_USER = { id: `mock-${role}-id`, role, user_metadata: { full_name: name }, email };
    window._supabase = true;
    // Several screens (screen-account.jsx's ProfileScreen, screen-seller.jsx's
    // SellerDashboardScreen's initial sellerName state, etc.) read this
    // legacy, pre-Supabase demo global directly — never sbGetUser() at
    // all. screen-account.jsx seeds it with `window._PROFILE ||= {name:
    // 'New User', ...}` on script load, which already ran by the time any
    // spec calls mockAuth() (after the one real page.goto()) — this
    // unconditional assignment overwrites that default with the real mock.
    window._PROFILE = {
      name, email, phone: '', dob: '', gender: '', nationality: '',
      memberSince: new Date().toISOString().slice(0, 10), verified: false, avatar: null,
      role, status: 'active',
    };

    // Override the helper functions loaded from supabase-client.jsx
    window.sbGetUser       = async () => window._MOCK_USER;
    // Real sbGetProfile() hits the real (unconfigured-but-not-null, since
    // the CDN supabase-js client itself still constructs fine against a
    // placeholder URL) _sb client and hangs/errors against a real network
    // call — every screen that reads role/shop linkage via sbGetProfile()
    // needs this mocked the same as sbGetUser() above.
    window.sbGetProfile    = async () => window._MOCK_PROFILE ?? { id: window._MOCK_USER?.id, role, shop_id: null };
    // The seller's own shop — SellerProductFormScreen (screen-seller.jsx)
    // resolves ownership through this, not profiles.shop_id (nothing in
    // the real schema keeps that column populated).
    window.sbGetMyShop     = async () => window._MOCK_SHOP ?? (role === 'seller' ? { id: 'mock-shop-id', seller_id: window._MOCK_USER?.id, name: 'Mock Shop' } : null);
    window.sbSellerCreateProduct = async (shopId, sellerId, product) => {
      window._SELLER_ACTIONS_LOG = window._SELLER_ACTIONS_LOG ?? [];
      window._SELLER_ACTIONS_LOG.push({ action: 'create_product', shopId, sellerId, product });
      if (!shopId) return { data: null, error: { message: 'No shop found for this seller.' } };
      return { data: { id: 'mock-new-product', shop_id: shopId, seller_id: sellerId, ...product, status: 'draft', approval_status: 'pending' }, error: null };
    };
    window.sbGetProducts   = async () => ({ data: window._MOCK_PRODUCTS ?? [] });
    window.sbGetShops      = async () => ({ data: window._MOCK_SHOPS ?? [] });
    // Real sbGetCategoryTree() falls back to an always-empty [] without a
    // configured backend (see CATEGORY_FALLBACK in supabase-client.jsx) —
    // without this override the home screen's nav category chips can only
    // ever render "All", never any real category.
    window.sbGetCategoryTree = async () => window._MOCK_CATEGORIES ?? [];
    // AdminProductsSection (screen-admin.jsx) — was entirely unmocked.
    window.sbAdminGetProducts = async () => window._MOCK_ADMIN_PRODUCTS ?? { products: [], totalProducts: 0, totalPages: 0, currentPage: 1, liveProductsCount: 0 };
    window.sbGetActiveBrands = async () => [];
    window.sbSubscribeAdminProducts = () => () => {};
    // PHASE 6: sbAdminModerateProduct now calls admin_send_notification()
    // via the RPC path (supabase-client.jsx) instead of inserting into
    // notifications directly — that internal call isn't reachable from
    // test code (the Playwright mock architecture overrides whole sb*
    // wrapper functions, not the private `_sb` client calls inside
    // them), so this mock verifies the UI's observable contract
    // (product id + decision in, a logged attempt out), the same way
    // every other admin action in this suite is tested.
    window.sbAdminModerateProduct = async (id, decision, reason) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ action: 'moderate_product', id, decision, reason });
      return { error: null };
    };
    // AdminBannersSection (screen-admin.jsx) keeps its own hardcoded
    // default banners unless sbGetBanners() returns non-empty data — an
    // unconditional {data:[]} here silently ignored any seeded
    // window._MOCK_BANNERS forever, regardless of what a spec seeded.
    window.sbGetBanners    = async () => ({ data: window._MOCK_BANNERS ?? [] });
    window.sbGetCart       = async () => ({ data: window._MOCK_CART ?? [] });
    window.sbUpsertCartItem = async () => ({ error: null });
    window.sbCreateOrder   = async () => ({ data: { id: 'mock-order-1', status: 'pending' }, error: null });
    // sbGetOrders/sbGetOrder return PLAIN values (an array / a single row),
    // never {data, error} — matching the real functions in
    // supabase-client.jsx exactly. A {data:...} wrapper here previously
    // made OrdersListScreen's `data.length` check always undefined,
    // silently falling back to its own empty MOCK_ORDERS regardless of
    // what this mock provided.
    window.sbGetOrders     = async () => window._MOCK_ORDERS ?? [];
    window.sbGetOrder      = async (orderId) => (window._MOCK_ORDERS ?? []).find(o => o.id === orderId) ?? null;
    window.sbGetOrderShipments = async (orderId) => (window._MOCK_SHIPMENTS_BY_ORDER ?? {})[orderId] ?? [];
    window.sbCancelOrder   = async (orderId) => ({ data: { id: orderId, status: 'cancelled' }, error: null });
    window.sbGetConversations = async () => ({ data: [] });
    window.sbGetMessages   = async () => ({ data: [] });
    window.sbSendMessage   = async () => ({ error: null });
    window.sbSubscribeToMessages = () => () => {};
    window.sbGetNotifications    = async () => ({ data: [] });
    window.sbMarkNotificationRead = async () => ({});
    window.sbSignIn        = async () => ({ data: { user: window._MOCK_USER }, error: null });
    window.sbSignUp        = async () => ({ data: { user: window._MOCK_USER }, error: null });
    window.sbSignOut       = async () => ({});

    // BecomeSellerScreen (screen-seller.jsx) gates its whole form behind
    // `sbGetMyKyc().then(...)` and stays on "Loading…" forever without a
    // mock — it was entirely unmocked, so no seller-onboarding spec could
    // ever get past the loading state regardless of any selector used.
    window.sbGetMyKyc      = async () => window._MOCK_MY_KYC ?? null;
    window.sbSubmitKyc     = async () => ({ data: { id: 'mock-kyc-1' }, error: null });
    // AdminKycDetail's submitDecision() (screen-admin.jsx) calls
    // sbAdminReviewKyc(kycId, decision, notes) — not "sbUpdateKyc", which
    // is not a real exported function anywhere in supabase-client.jsx and
    // was silently falling through to the real, unconfigured client.
    window.sbAdminReviewKyc = async (kycId, decision, notes) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ action: 'review_kyc', kycId, decision, notes });
      return { error: null };
    };

    // Phase 5 — seller shipment management (mobile-shaped client is
    // separate; these are the web sb* wrappers from supabase-client.jsx).
    window.sbGetSellerShipments = async () => window._MOCK_SELLER_SHIPMENTS ?? [];
    window.sbSellerCreateShipment = async (orderId, itemIds) => {
      window._SELLER_ACTIONS_LOG = window._SELLER_ACTIONS_LOG ?? [];
      window._SELLER_ACTIONS_LOG.push({ action: 'create_shipment', orderId, itemIds });
      return { data: { ok: true, shipment_id: 'mock-new-shipment' }, error: null };
    };
    window.sbSellerUpdateShipment = async (shipmentId, status, extra) => {
      window._SELLER_ACTIONS_LOG = window._SELLER_ACTIONS_LOG ?? [];
      window._SELLER_ACTIONS_LOG.push({ action: 'update_shipment', shipmentId, status, extra });
      // SellerOrdersScreen's reload() re-fetches via sbGetSellerShipments()
      // after every advance — mutate the seeded array in place so the
      // next fetch reflects the new status (e.g. "Mark shipped" only
      // appears after a prior "Confirm" has actually taken effect).
      const s = (window._MOCK_SELLER_SHIPMENTS ?? []).find(x => x.id === shipmentId);
      if (s) { s.status = status; if (extra?.carrier !== undefined) s.carrier = extra.carrier; if (extra?.trackingNumber !== undefined) s.tracking_number = extra.trackingNumber; }
      return { data: { ok: true, status }, error: null };
    };
    window.sbSellerReportDeliveryFailure = async (shipmentId, reason) => {
      window._SELLER_ACTIONS_LOG = window._SELLER_ACTIONS_LOG ?? [];
      window._SELLER_ACTIONS_LOG.push({ action: 'report_failure', shipmentId, reason });
      const s = (window._MOCK_SELLER_SHIPMENTS ?? []).find(x => x.id === shipmentId);
      if (s) s.status = 'failed';
      return { data: { ok: true, status: 'failed' }, error: null };
    };

    // Phase 5 — admin shipping panel + access context. AdminShellScreen
    // calls sbGetMyAccessContext() whenever window._supabase is truthy
    // (set above); without this stub it would hit the real, unconfigured
    // client and the admin specs would hang/error on every test.
    //
    // Group B fix: the real sbGetMyAccessContext() (supabase-client.jsx)
    // always includes `role` on the returned context — screen-account.jsx's
    // ProfileScreen now reads accessCtx.role to decide Seller Dashboard vs
    // Become a Seller (Priority 1 fix). This mock was missing `role`
    // entirely, so every mocked role silently read as `undefined` there —
    // the seller-dashboard spec below would have falsely passed or failed
    // regardless of the real fix.
    window.sbGetMyAccessContext = async () => window._MOCK_ACCESS_CTX ?? { role, isAdmin: role === 'admin', isStaff: role === 'staff', permissions: window._MOCK_PERMISSIONS ?? [] };
    window.sbAdminGetStats = async () => window._MOCK_ADMIN_STATS ?? { users: 0, sellers: 0, orders: 0, gmv: 0 };
    window.sbAdminGetUsers = async () => [];
    // AdminSellersKycSection (screen-admin.jsx) calls this directly — it
    // was entirely unmocked, so it always hit the real, unconfigured
    // client and the KYC specs' seeded window._MOCK_KYC never reached it.
    window.sbAdminGetKycRequests = async ({ status = 'ALL' } = {}) => {
      const all = window._MOCK_KYC ?? [];
      const filtered = status === 'ALL' ? all : all.filter(k => (k.status || '').toLowerCase() === status.toLowerCase());
      return { requests: filtered, totalRequests: filtered.length, totalPages: 1, currentPage: 1 };
    };
    // AdminKycDetail (screen-admin.jsx) calls this singular form directly
    // on mount — a SEPARATE function from the list's sbAdminGetKycRequests
    // above, also entirely unmocked, so opening any application's detail
    // view (e.g. to Approve/Reject) always showed "Couldn't load this
    // application" regardless of what the list rendered correctly.
    window.sbAdminGetKycRequest = async (id) => (window._MOCK_KYC ?? []).find(k => k.id === id) ?? null;
    window.sbAdminGetKycDocUrl = async () => null;
    // AdminKycDetail also loads a "Decision history" panel via this call
    // on every mount — likewise unmocked, left silently rejecting against
    // the real client otherwise.
    window.sbAdminGetAuditLogs = async () => ({ logs: window._MOCK_ADMIN_AUDIT_LOGS ?? [] });
    // Never actually invoke the real send-broadcast Edge Function from a
    // test — this never calls a real network endpoint or sends anything
    // to a real device, it only records what would have been sent.
    window.sbAdminSendBroadcast = async ({ segment, type, title, body } = {}) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ action: 'send_broadcast', segment, type, title, body });
      return { data: { recipients: (window._MOCK_BROADCAST_RECIPIENTS ?? 3) }, error: null };
    };
    window.sbSubscribeAdminOrders = () => () => {};
    window.sbAdminGetShipments = async () => window._MOCK_ADMIN_SHIPMENTS ?? { shipments: [], totalShipments: 0, totalPages: 0, currentPage: 1 };
    window.sbAdminGetCarriersList = async () => [];
    window.sbAdminOverrideShipment = async (shipmentId, fields, note) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ shipmentId, fields, note });
      if (!note || !note.trim()) return { data: null, error: { message: 'An admin override requires a note explaining the correction' } };
      return { data: { ok: true, status: fields?.status }, error: null };
    };

    // AdminNotifSection's 5 persisted preferences (notification_preferences
    // table) — without this default, every spec that renders Notifications
    // but doesn't override these two itself (every pre-existing spec, since
    // these functions didn't exist before this feature) would fall through
    // to the real, unconfigured-for-tests Supabase client and make a real
    // network call on every mount, same class of bug these other defaults
    // all exist to avoid.
    window.sbGetMyAdminNotificationPrefs = async () => window._MOCK_ADMIN_NOTIF_PREFS ?? { newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false };
    window.sbSetMyAdminNotificationPref = async (key, value) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ action: 'set_notification_pref', key, value });
      return { error: null };
    };

    // AdminHealthSection — same reasoning: these didn't exist before that
    // feature, so no pre-existing spec mocks them, and without a default
    // any spec that happens to render Health would hit the real client.
    window.sbAdminHealthPing = async () => ({ ok: true });
    window.sbAdminCheckAuthService = async () => ({ ok: true });
    window.sbAdminCheckStorageService = async () => ({ ok: true });
    window.sbAdminCheckEdgeFunctions = async () => ({ ok: true });
    window.sbAdminCheckRealtime = async () => ({ ok: true });
    window.sbAdminRecordHealthCheck = async () => ({ data: { ok: true }, error: null });
    window.sbAdminGetHealthHistory = async () => ([]);

    // Owner Vault — same reasoning again.
    window.sbAmIOwner = async () => false;
    window.sbAdminGetOwnerVaultOverview = async () => ({ data: null, error: { message: 'Permission denied: Owner access required' } });
}

/** Mock Supabase auth so tests don't need a real backend */
export async function mockAuth(page, { role = 'buyer', name = 'Test User', email = 'test@clorivo.io' } = {}) {
  // The actual fix: apply to the page as it exists right now.
  await page.evaluate(applyAuthMockOverrides, { role, name, email });
  // Defensive: also apply on any future real navigation/reload.
  await page.addInitScript(applyAuthMockOverrides, { role, name, email });
}

/** Seed mock products into the window so screens can render them */
export async function seedProducts(page, products) {
  await page.evaluate((prods) => { window._MOCK_PRODUCTS = prods; }, products);
}

/** Seed the home screen's nav category chips (sbGetCategoryTree) */
export async function seedCategories(page, categories) {
  await page.evaluate((c) => { window._MOCK_CATEGORIES = c; }, categories);
}

export const MOCK_CATEGORIES = [
  { id: 'cat-tech', name: 'Tech', slug: 'tech', show_in_navigation: true, show_in_menu: true, position: 1, children: [] },
  { id: 'cat-home', name: 'Home & Kitchen', slug: 'home-kitchen', show_in_navigation: true, show_in_menu: true, position: 2, children: [] },
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion', show_in_navigation: true, show_in_menu: true, position: 3, children: [] },
];

/** Seed the buyer's order list (sbGetOrders) */
export async function seedOrders(page, orders) {
  await page.evaluate((o) => { window._MOCK_ORDERS = o; }, orders);
}

/** Seed per-order shipment detail (sbGetOrderShipments), keyed by order id */
export async function seedShipmentsByOrder(page, byOrder) {
  await page.evaluate((m) => { window._MOCK_SHIPMENTS_BY_ORDER = m; }, byOrder);
}

/** Seed a seller's own shipments list (sbGetSellerShipments) */
export async function seedSellerShipments(page, shipments) {
  await page.evaluate((s) => { window._MOCK_SELLER_SHIPMENTS = s; }, shipments);
}

/** Seed the admin shipping panel's paginated result (sbAdminGetShipments) */
export async function seedAdminShipments(page, result) {
  await page.evaluate((r) => { window._MOCK_ADMIN_SHIPMENTS = r; }, result);
}

/** Seed the admin access context (sbGetMyAccessContext) */
export async function seedAccessCtx(page, ctx) {
  await page.evaluate((c) => { window._MOCK_ACCESS_CTX = c; }, ctx);
}

// screen-pdp.jsx's discount badge reads p.discount directly (a precomputed
// percentage) — it is never derived from price/compare_price at render
// time, so a mock lacking this field can never show the badge regardless
// of any selector. discount:38 here matches round((79.99-49.99)/79.99*100).
export const MOCK_PRODUCTS = [
  { id: 'p1', title: 'Lampe Boho Tressée', price: 49.99, compare_price: 79.99, discount: 38, images: [], category: 'Maison', status: 'active', shops: { name: 'luna.studio', is_verified: true } },
  { id: 'p2', title: 'Écouteurs Pro Max', price: 89.99, compare_price: 129.99, discount: 31, images: [], category: 'Tech',   status: 'active', shops: { name: 'TechZone',    is_verified: true } },
  { id: 'p3', title: 'Robe Lin Été',       price: 34.99, compare_price: null,   images: [], category: 'Mode',   status: 'active', shops: { name: 'Fashion House', is_verified: false } },
];

// Shapes mirror exactly what sbGetOrders()/sbGetOrder() return for real
// (orders.* columns + nested order_items/shipments), NOT a UI-level
// shape — normalizeRemoteOrder() in screen-tracking.jsx is what turns
// this into display fields. `status` here is orders.status (pending/
// cancelled, the whole-order record), never the derived per-shipment
// rollup — that's computed by computeOrderFulfillmentStatus(shipments).
export const MOCK_ORDERS = [
  {
    id: 'order-1', status: 'pending', total_amount: 59.98, created_at: new Date().toISOString(),
    order_items: [
      { id: 'oi-1a', title: 'Lampe Boho Tressée', quantity: 1, unit_price: 29.99 },
      { id: 'oi-1b', title: 'Écouteurs Pro Max', quantity: 1, unit_price: 29.99 },
    ],
    // Two sellers, two independent shipments — one shipped with
    // seller-provided tracking, one still delivered already.
    shipments: [{ status: 'shipped' }, { status: 'delivered' }],
  },
  {
    id: 'order-2', status: 'pending', total_amount: 89.99, created_at: new Date().toISOString(),
    order_items: [{ id: 'oi-2a', title: 'Écouteurs Pro Max', quantity: 1, unit_price: 89.99 }],
    shipments: [{ status: 'delivered' }],
  },
  {
    id: 'order-3', status: 'pending', total_amount: 34.99, created_at: new Date().toISOString(),
    order_items: [{ id: 'oi-3a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }],
    shipments: [{ status: 'cancelled' }],
  },
  {
    id: 'order-4', status: 'pending', total_amount: 34.99, created_at: new Date().toISOString(),
    order_items: [{ id: 'oi-4a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }],
    shipments: [{ status: 'returned' }],
  },
  {
    id: 'order-5', status: 'pending', total_amount: 34.99, created_at: new Date().toISOString(),
    order_items: [{ id: 'oi-5a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }],
    shipments: [{ status: 'failed' }],
  },
];

// Per-order shipment DETAIL, keyed by order id — what sbGetOrderShipments(orderId)
// returns: full shipment rows with their own order_items + immutable history,
// exactly as OrderDetailScreen renders them (one independent card each).
export const MOCK_SHIPMENTS_BY_ORDER = {
  'order-1': [
    {
      id: 'ship-1a', order_id: 'order-1', seller_id: 'seller-a', status: 'shipped',
      carrier: 'Flash Express', tracking_number: 'FX123456789', shipping_fee: 4,
      order_items: [{ id: 'oi-1a', title: 'Lampe Boho Tressée', quantity: 1, unit_price: 29.99 }],
      shipment_status_history: [
        { status: 'pending', source: 'system', note: null, created_at: new Date(Date.now() - 3600_000).toISOString() },
        { status: 'shipped', source: 'seller', note: 'Seller-reported tracking update', created_at: new Date().toISOString() },
      ],
    },
    {
      id: 'ship-1b', order_id: 'order-1', seller_id: 'seller-b', status: 'delivered',
      carrier: 'DHL', tracking_number: 'DHL987654321', shipping_fee: 4, delivered_at: new Date().toISOString(),
      order_items: [{ id: 'oi-1b', title: 'Écouteurs Pro Max', quantity: 1, unit_price: 29.99 }],
      shipment_status_history: [
        { status: 'pending', source: 'system', note: null, created_at: new Date(Date.now() - 7200_000).toISOString() },
        { status: 'shipped', source: 'seller', note: null, created_at: new Date(Date.now() - 3600_000).toISOString() },
        { status: 'delivered', source: 'seller', note: null, created_at: new Date().toISOString() },
      ],
    },
  ],
  'order-3': [
    { id: 'ship-3a', order_id: 'order-3', seller_id: 'seller-a', status: 'cancelled', order_items: [{ id: 'oi-3a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }], shipment_status_history: [] },
  ],
  'order-4': [
    { id: 'ship-4a', order_id: 'order-4', seller_id: 'seller-a', status: 'returned', order_items: [{ id: 'oi-4a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }], shipment_status_history: [] },
  ],
  'order-5': [
    { id: 'ship-5a', order_id: 'order-5', seller_id: 'seller-a', status: 'failed', failure_reason: 'Address not found', order_items: [{ id: 'oi-5a', title: 'Robe Lin Été', quantity: 1, unit_price: 34.99 }], shipment_status_history: [] },
  ],
};
