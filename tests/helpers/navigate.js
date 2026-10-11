/**
 * Helpers to drive the Clorivo SPA (JSX/HTML prototype).
 * All navigation goes through window.__navigate / window.__goBack exposed by app.jsx.
 */

/** Navigate to a named screen programmatically (bypasses splash/onboarding) */
export async function goto(page, screen, params = {}) {
  await page.evaluate(
    ([s, p]) => window.__navigate(s, p),
    [screen, params],
  );
  await page.waitForTimeout(350); // animation
}

/** Tap the back button or call goBack() */
export async function goBack(page) {
  await page.evaluate(() => window.__goBack());
  await page.waitForTimeout(300);
}

/** Mock Supabase auth so tests don't need a real backend */
export async function mockAuth(page, { role = 'buyer', name = 'Test User', email = 'test@clorivo.io' } = {}) {
  await page.addInitScript(({ role, name, email }) => {
    // Stub window._supabase + sbGetUser used throughout the screens
    window._MOCK_USER = { id: `mock-${role}-id`, role, user_metadata: { full_name: name }, email };
    window._supabase = true;

    // Override the helper functions loaded from supabase-client.jsx
    window.sbGetUser       = async () => window._MOCK_USER;
    window.sbGetProducts   = async () => ({ data: window._MOCK_PRODUCTS ?? [] });
    window.sbGetShops      = async () => ({ data: window._MOCK_SHOPS ?? [] });
    window.sbGetBanners    = async () => ({ data: [] });
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
      return { data: { ok: true, status }, error: null };
    };
    window.sbSellerReportDeliveryFailure = async (shipmentId, reason) => {
      window._SELLER_ACTIONS_LOG = window._SELLER_ACTIONS_LOG ?? [];
      window._SELLER_ACTIONS_LOG.push({ action: 'report_failure', shipmentId, reason });
      return { data: { ok: true, status: 'failed' }, error: null };
    };

    // Phase 5 — admin shipping panel + access context. AdminShellScreen
    // calls sbGetMyAccessContext() whenever window._supabase is truthy
    // (set above); without this stub it would hit the real, unconfigured
    // client and the admin specs would hang/error on every test.
    window.sbGetMyAccessContext = async () => window._MOCK_ACCESS_CTX ?? { isAdmin: role === 'admin', isStaff: role === 'staff', permissions: window._MOCK_PERMISSIONS ?? [] };
    window.sbAdminGetStats = async () => window._MOCK_ADMIN_STATS ?? { users: 0, sellers: 0, orders: 0, gmv: 0 };
    window.sbAdminGetUsers = async () => [];
    window.sbSubscribeAdminOrders = () => () => {};
    window.sbAdminGetShipments = async () => window._MOCK_ADMIN_SHIPMENTS ?? { shipments: [], totalShipments: 0, totalPages: 0, currentPage: 1 };
    window.sbAdminGetCarriersList = async () => [];
    window.sbAdminOverrideShipment = async (shipmentId, fields, note) => {
      window._ADMIN_ACTIONS_LOG = window._ADMIN_ACTIONS_LOG ?? [];
      window._ADMIN_ACTIONS_LOG.push({ shipmentId, fields, note });
      if (!note || !note.trim()) return { data: null, error: { message: 'An admin override requires a note explaining the correction' } };
      return { data: { ok: true, status: fields?.status }, error: null };
    };
  }, { role, name, email });
}

/** Seed mock products into the window so screens can render them */
export async function seedProducts(page, products) {
  await page.evaluate((prods) => { window._MOCK_PRODUCTS = prods; }, products);
}

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

export const MOCK_PRODUCTS = [
  { id: 'p1', title: 'Lampe Boho Tressée', price: 49.99, compare_price: 79.99, images: [], category: 'Maison', status: 'active', shops: { name: 'luna.studio', is_verified: true } },
  { id: 'p2', title: 'Écouteurs Pro Max', price: 89.99, compare_price: 129.99, images: [], category: 'Tech',   status: 'active', shops: { name: 'TechZone',    is_verified: true } },
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
