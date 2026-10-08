// supabase-client.jsx — Supabase client + data helpers
// Configure your project URL and anon key below.
// Get them from: https://supabase.com/dashboard → your project → Settings → API

const SUPABASE_URL      = 'https://kpwebnoqsjlxxiamwsst.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd2Vibm9xc2pseHhpYW13c3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjcxNzMsImV4cCI6MjEwNjIwMzE3M30.9okYEL47QM1vZUR-wTQP2b0TZWbabSA8sLXJMUrT41U';

// ─── CLIENT INIT ─────────────────────────────────────────────────
const _isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _sb = null;
if (_isConfigured && window.supabase) {
  _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else if (_isConfigured) {
  console.warn('[Clorivo] Supabase JS not loaded — check CDN script order');
}

// Expose for debugging
window._supabase = _sb;

// ─── AUTH HELPERS ─────────────────────────────────────────────────
async function sbSignUp(email, password, fullName) {
  if (!_sb) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  return { data, error };
}

async function sbSignIn(email, password) {
  if (!_sb) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function sbSignOut() {
  if (!_sb) return;
  await _sb.auth.signOut();
}

async function sbResetPasswordForEmail(email) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.auth.resetPasswordForEmail(email);
  return { data, error };
}

async function sbVerifyRecoveryOtp(email, token) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.auth.verifyOtp({ email, token, type: 'recovery' });
  return { data, error };
}

async function sbUpdatePassword(newPassword) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.auth.updateUser({ password: newPassword });
  return { data, error };
}

async function sbGetSession() {
  if (!_sb) return null;
  const { data } = await _sb.auth.getSession();
  return data?.session ?? null;
}

async function sbGetUser() {
  if (!_sb) return null;
  const { data } = await _sb.auth.getUser();
  return data?.user ?? null;
}

async function sbGetProfile(userId) {
  if (!_sb || !userId) return null;
  const { data } = await _sb.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function sbUpdateProfile(userId, updates) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
}

// ─── PRODUCTS ────────────────────────────────────────────────────
async function sbGetProducts({ categorySlug, limit = 20, offset = 0, featured } = {}) {
  if (!_sb) return { data: PRODUCTS.map(_prodToSb), error: null };
  let q = _sb.from('products')
    .select('*, shops(id, name, slug, is_verified, rating), categories(id, name, slug)')
    .eq('status', 'active')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  if (featured) q = q.eq('is_featured', true);
  if (categorySlug) {
    const { data: cat } = await _sb.from('categories').select('id').eq('slug', categorySlug).single();
    if (cat) q = q.eq('category_id', cat.id);
  }
  const { data, error } = await q;
  if (error || !data?.length) return { data: PRODUCTS.map(_prodToSb), error };
  return { data, error };
}

async function sbGetProduct(id) {
  if (!_sb || !id) return null;
  const { data } = await _sb.from('products')
    .select('*, shops(id, name, slug, is_verified, rating, followers, description), categories(id, name)')
    .eq('id', id)
    .single();
  return data;
}

// ─── SHOPS ───────────────────────────────────────────────────────
async function sbGetShops({ limit = 10 } = {}) {
  if (!_sb) return { data: _DEMO_SHOPS, error: null };
  const { data, error } = await _sb.from('shops')
    .select('*')
    .eq('is_active', true)
    .order('followers', { ascending: false })
    .limit(limit);
  if (error || !data?.length) return { data: _DEMO_SHOPS, error };
  return { data, error };
}

async function sbGetShop(shopId) {
  if (!_sb) return null;
  const { data } = await _sb.from('shops').select('*, shop_banners(*)').eq('id', shopId).single();
  return data;
}

// ─── BANNERS ─────────────────────────────────────────────────────
async function sbGetBanners({ placement = 'homepage' } = {}) {
  if (!_sb) return { data: placement === 'homepage' ? _DEMO_BANNERS : [], error: null };
  const { data, error } = await _sb.from('banners')
    .select('*').eq('is_active', true).eq('placement', placement).order('position');
  if (error || !data?.length) return { data: placement === 'homepage' ? _DEMO_BANNERS : [], error };
  return { data, error };
}

// Convenience: the single banner shown on the "account created" success screen
async function sbGetSignupBanner() {
  const { data } = await sbGetBanners({ placement: 'signup_success' });
  return data?.[0] ?? null;
}

async function sbUpsertBanner(banner) {
  if (!_sb) {
    // Demo fallback — echo the banner back (with a generated id if new) so
    // the admin screen's optimistic local update still works without a
    // configured backend.
    return { data: { ...banner, id: banner.id || `local-${Date.now()}` }, error: null };
  }
  const { data, error } = await _sb.from('banners').upsert(banner).select().single();
  return { data, error };
}

async function sbDeleteBanner(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('banners').delete().eq('id', id);
  return { error };
}

// ─── CART ────────────────────────────────────────────────────────
async function sbGetCart(userId) {
  if (!_sb || !userId) {
    return { data: window.CART_ITEMS.map(ci => ({
      id: ci.product.id, product: ci.product, quantity: ci.qty,
      variant: { size: ci.variant }, price: ci.product.price,
    })), error: null };
  }
  const { data: cart } = await _sb.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) return { data: [], error: null };
  const { data, error } = await _sb.from('cart_items')
    .select('*, products(id, title, price, compare_price, images, shops(name))')
    .eq('cart_id', cart.id);
  return { data: data ?? [], error };
}

async function sbUpsertCartItem(userId, productId, variant, quantity, price) {
  if (!_sb || !userId) {
    // fallback: update window.CART_ITEMS
    const idx = window.CART_ITEMS.findIndex(i => i.product.id == productId);
    if (idx >= 0) window.CART_ITEMS[idx].qty = quantity;
    return { error: null };
  }
  // Ensure cart exists
  let { data: cart } = await _sb.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) {
    const { data } = await _sb.from('carts').insert({ user_id: userId }).select('id').single();
    cart = data;
  }
  if (quantity <= 0) {
    await _sb.from('cart_items')
      .delete()
      .eq('cart_id', cart.id)
      .eq('product_id', productId);
    return { error: null };
  }
  const { error } = await _sb.from('cart_items').upsert({
    cart_id: cart.id, product_id: productId, variant, quantity, price,
  }, { onConflict: 'cart_id,product_id,variant' });
  return { error };
}

async function sbClearCart(userId) {
  if (!_sb || !userId) { window.CART_ITEMS = []; return; }
  const { data: cart } = await _sb.from('carts').select('id').eq('user_id', userId).single();
  if (cart) await _sb.from('cart_items').delete().eq('cart_id', cart.id);
}

// ─── ORDERS ──────────────────────────────────────────────────────
async function sbCreateOrder(userId, { items, shippingAddress, shippingMethod, paymentMethod, subtotal, discount, shippingFee, total, promoCode }) {
  if (!_sb || !userId) {
    const fakeId = 'CLV' + Date.now();
    window._LAST_ORDER = { id: fakeId, status: 'confirmed', tracking_number: 'TRK' + Math.random().toString(36).slice(2,10).toUpperCase() };
    return { data: window._LAST_ORDER, error: null };
  }
  const { data: order, error } = await _sb.from('orders').insert({
    buyer_id: userId,
    status: 'confirmed',
    subtotal, discount, shipping_fee: shippingFee, total, promo_code: promoCode,
    shipping_address: shippingAddress,
    shipping_method: shippingMethod,
    payment_method: paymentMethod,
    payment_status: 'paid',
    tracking_number: 'TRK' + Math.random().toString(36).slice(2,10).toUpperCase(),
  }).select().single();
  if (error) return { data: null, error };

  if (items?.length) {
    await _sb.from('order_items').insert(items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      shop_id: item.shop_id,
      title: item.title,
      image_url: item.image_url,
      variant: item.variant,
      quantity: item.quantity,
      price: item.price,
    })));
  }

  window._LAST_ORDER = order;
  await sbClearCart(userId);
  return { data: order, error: null };
}

async function sbGetOrder(orderId) {
  if (!_sb) return window._LAST_ORDER ?? null;
  if (!orderId) return null;
  const { data } = await _sb.from('orders')
    .select('*, order_items(*, products(title, images))')
    .eq('id', orderId)
    .single();
  return data;
}

async function sbGetOrders(userId) {
  if (!_sb || !userId) return [];
  const { data } = await _sb.from('orders')
    .select('*, order_items(title, quantity, price)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

async function sbCancelOrder(orderId) {
  if (!_sb || !orderId) return { data: { id: orderId, status: 'cancelled' }, error: null };
  const { data, error } = await _sb.from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
    .select()
    .single();
  return { data, error };
}

// ─── MESSAGES ────────────────────────────────────────────────────
async function sbGetConversations(userId) {
  if (!_sb || !userId) return { data: _DEMO_CONVERSATIONS, error: null };
  const { data, error } = await _sb.from('conversations')
    .select('*, shops(id, name, brand_color, is_verified), buyer:profiles!buyer_id(id, full_name, avatar_url), seller:profiles!seller_id(id, full_name, avatar_url)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  if (error || !data?.length) return { data: _DEMO_CONVERSATIONS, error };
  return { data, error };
}

async function sbGetMessages(conversationId) {
  if (!_sb) return { data: _DEMO_MESSAGES, error: null };
  const { data, error } = await _sb.from('messages')
    .select('*, sender:profiles(id, full_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return { data: data ?? [], error };
}

async function sbSendMessage(conversationId, senderId, content) {
  if (!_sb) {
    const msg = { id: Date.now(), sender_id: senderId, content, created_at: new Date().toISOString(), conversation_id: conversationId };
    return { data: msg, error: null };
  }
  const { data, error } = await _sb.from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select('*, sender:profiles(id, full_name)')
    .single();
  return { data, error };
}

function sbSubscribeToMessages(conversationId, callback) {
  if (!_sb) return () => {};
  const channel = _sb.channel('messages:' + conversationId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, payload => callback(payload.new))
    .subscribe();
  return () => _sb.removeChannel(channel);
}

async function sbMarkConversationRead(conversationId, role) {
  if (!_sb) return;
  const field = role === 'buyer' ? 'buyer_unread' : 'seller_unread';
  await _sb.from('conversations').update({ [field]: 0 }).eq('id', conversationId);
}

async function sbGetOrCreateConversation(buyerId, sellerId, shopId, productId) {
  if (!_sb) return { data: { id: 'demo-conv' }, error: null };
  let { data, error } = await _sb.from('conversations')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('seller_id', sellerId)
    .eq('product_id', productId ?? null)
    .maybeSingle();
  if (!data) {
    ({ data, error } = await _sb.from('conversations')
      .insert({ buyer_id: buyerId, seller_id: sellerId, shop_id: shopId, product_id: productId })
      .select('id')
      .single());
  }
  return { data, error };
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────
async function sbGetNotifications(userId) {
  if (!_sb || !userId) return { data: _DEMO_NOTIFICATIONS, error: null };
  const { data, error } = await _sb.from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data?.length) return { data: _DEMO_NOTIFICATIONS, error };
  return { data, error };
}

async function sbMarkNotificationRead(id) {
  if (!_sb) return;
  await _sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

// ─── SELLER HELPERS ───────────────────────────────────────────────
async function sbGetSellerStats(shopId) {
  if (!_sb || !shopId) return _DEMO_SELLER_STATS;
  const [{ count: ordersCount }, { count: productsCount }, shop] = await Promise.all([
    _sb.from('order_items').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
    _sb.from('products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('status', 'active'),
    _sb.from('shops').select('total_sales, followers, rating').eq('id', shopId).single(),
  ]);
  return {
    orders: ordersCount ?? 0,
    products: productsCount ?? 0,
    revenue: (shop.data?.total_sales ?? 0) * 25,
    followers: shop.data?.followers ?? 0,
    rating: shop.data?.rating ?? 0,
  };
}

async function sbGetSellerOrders(shopId) {
  if (!_sb || !shopId) return _DEMO_SELLER_ORDERS;
  const { data } = await _sb.from('order_items')
    .select('*, orders(id, status, created_at, buyer_id, shipping_address)')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .limit(30);
  return data ?? _DEMO_SELLER_ORDERS;
}

// ─── ADMIN HELPERS ────────────────────────────────────────────────
// Revenue is recognized on payment_status='paid' (covers 'delivered' orders too, since
// those are paid by the time they ship). Refunds are tracked separately so they net out
// of revenue without being hidden. Commission rate is admin-configurable (Settings →
// Platform), not hardcoded, so Profit reflects whatever the admin has actually set.
async function sbAdminGetStats() {
  if (!_sb) return _DEMO_ADMIN_STATS;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const commissionRate = window._PLATFORM_SETTINGS?.commissionRate ?? 0.10;

  const [users, sellers, allOrders, todayOrders, kyc, recentOrdersRes] = await Promise.all([
    _sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'buyer'),
    _sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    _sb.from('orders').select('total_amount, status, payment_status, created_at'),
    _sb.from('orders').select('total_amount, status, payment_status, created_at').gte('created_at', startOfToday.toISOString()),
    _sb.from('kyc_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    _sb.from('orders').select('id, total_amount, status, created_at, profiles(full_name, email)').order('created_at', { ascending: false }).limit(5),
  ]);

  const orders = allOrders.data ?? [];
  const paid = orders.filter(o => o.payment_status === 'paid');
  const refunded = orders.filter(o => o.status === 'refunded' || o.payment_status === 'refunded');
  const totalRevenue = paid.reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const todaysRevenue = (todayOrders.data ?? []).filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total_amount ?? 0), 0);
  const totalRefunds = refunded.reduce((s, o) => s + (o.total_amount ?? 0), 0);

  return {
    users: users.count ?? 0,
    sellers: sellers.count ?? 0,
    orders: orders.length,
    ordersToday: (todayOrders.data ?? []).length,
    gmv: totalRevenue,
    totalRevenue,
    todaysRevenue,
    avgOrderValue: orders.length ? totalRevenue / orders.length : 0,
    profit: totalRevenue * commissionRate,
    refunds: totalRefunds,
    pendingKyc: kyc.count ?? 0,
    recentOrders: recentOrdersRes.data ?? [],
  };
}

// Buckets paid orders for the Sales Analytics chart. `range` is 'day' (last 24h, hourly),
// 'week' (7 days), 'month' (30 days) or 'year' (12 months). Aggregation happens
// client-side (consistent with the rest of this file) rather than via a SQL view, since
// the row volume here is small enough not to need one.
const _TIMESERIES_RANGES = {
  day:   { unit:'hour',  count:24 },
  week:  { unit:'day',   count:7 },
  month: { unit:'day',   count:30 },
  year:  { unit:'month', count:12 },
};
async function sbAdminGetSalesTimeseries(range = 'week') {
  if (!_sb) return [];
  const { unit, count } = _TIMESERIES_RANGES[range] || _TIMESERIES_RANGES.week;
  const commissionRate = window._PLATFORM_SETTINGS?.commissionRate ?? 0.10;

  const since = new Date();
  if (unit === 'hour') { since.setMinutes(0, 0, 0); since.setHours(since.getHours() - (count - 1)); }
  else if (unit === 'month') { since.setHours(0, 0, 0, 0); since.setDate(1); since.setMonth(since.getMonth() - (count - 1)); }
  else { since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (count - 1)); }

  const { data } = await _sb.from('orders')
    .select('total_amount, payment_status, created_at')
    .gte('created_at', since.toISOString())
    .eq('payment_status', 'paid');
  const orders = data ?? [];

  return [...Array(count)].map((_, i) => {
    const bucket = new Date(since);
    const next = new Date(since);
    if (unit === 'hour') { bucket.setHours(bucket.getHours() + i); next.setTime(bucket.getTime()); next.setHours(next.getHours() + 1); }
    else if (unit === 'month') { bucket.setMonth(bucket.getMonth() + i); next.setTime(bucket.getTime()); next.setMonth(next.getMonth() + 1); }
    else { bucket.setDate(bucket.getDate() + i); next.setTime(bucket.getTime()); next.setDate(next.getDate() + 1); }
    const bucketOrders = orders.filter(o => { const t = new Date(o.created_at).getTime(); return t >= bucket.getTime() && t < next.getTime(); });
    const revenue = bucketOrders.reduce((s, o) => s + (o.total_amount ?? 0), 0);
    return { date: bucket.toISOString(), revenue, orders: bucketOrders.length, profit: revenue * commissionRate };
  });
}

// Realtime: any insert/update on orders refreshes the dashboard without a manual reload.
// Supabase Realtime (Postgres logical replication over a WebSocket) is the native
// equivalent of a Socket.io push here — no separate socket server needed or possible on
// a serverless/static host like Vercel.
let _adminOrdersChannelSeq = 0;
function sbSubscribeAdminOrders(callback) {
  if (!_sb) return () => {};
  // Each caller gets its own uniquely-named channel — reusing a channel name across
  // concurrent subscribers makes supabase-js reject the second .on() with
  // "cannot add postgres_changes callbacks after subscribe()".
  const channel = _sb.channel(`admin-orders-${++_adminOrdersChannelSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
    .subscribe();
  return () => _sb.removeChannel(channel);
}

async function sbAdminGetKycRequests() {
  if (!_sb) return _DEMO_KYC_REQUESTS;
  const { data } = await _sb.from('kyc_requests')
    .select('*, profiles(full_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return data ?? _DEMO_KYC_REQUESTS;
}

async function sbAdminUpdateKyc(id, status, notes) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('kyc_requests')
    .update({ status, review_notes: notes, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  return { error };
}

async function sbAdminGetUsers() {
  if (!_sb) return null;
  const { data } = await _sb.from('profiles')
    .select('id, full_name, email, role, status, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  return data;
}

async function sbAdminUpdateUser(id, updates) {
  if (!_sb) return { error: null };
  const { data, error } = await _sb.from('profiles').update(updates).eq('id', id).select().single();
  return { data, error };
}

async function sbAdminCreateProduct(product) {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.from('products').insert(product).select().single();
  return { data, error };
}

async function sbAdminUpdateProduct(id, updates) {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.from('products').update(updates).eq('id', id).select().single();
  return { data, error };
}

async function sbAdminDeleteProduct(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('products').delete().eq('id', id);
  return { error };
}

// ─── FILE UPLOADS ─────────────────────────────────────────────────
async function sbUploadFile(bucket, path, file) {
  if (!_sb) {
    // Demo fallback — no Supabase Storage configured, so read the file
    // locally as a data URL. The image still shows up immediately across
    // the app; it just isn't persisted anywhere outside this session.
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result, error: null });
      reader.onerror = () => resolve({ url: null, error: { message: 'Could not read file' } });
      reader.readAsDataURL(file);
    });
  }
  const { data, error } = await _sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return { url: null, error };
  const { data: { publicUrl } } = _sb.storage.from(bucket).getPublicUrl(path);
  return { url: publicUrl, error: null };
}

// ─── DEMO FALLBACK DATA ───────────────────────────────────────────
function _prodToSb(p) {
  return {
    id: p.id,
    title: p.title,
    price: p.price,
    compare_price: p.oldPrice ?? null,
    discount: p.discount ?? null,
    sold_count: parseInt((p.sold ?? '0').replace(/\D/g,'')) || 0,
    rating: p.rating ?? 0,
    reviews_count: p.reviews ?? 0,
    images: [],
    image_url: p.image_url ?? null,
    shops: { name: p.seller ?? '', is_verified: false },
    categories: { name: p.category ?? '' },
    label: p.label ?? '',
    tint: p.id % 5,
  };
}

const _DEMO_SHOPS = [];
const _DEMO_BANNERS = [];
const _DEMO_CONVERSATIONS = [];
const _DEMO_MESSAGES = [];
const _DEMO_NOTIFICATIONS = [];
const _DEMO_SELLER_STATS = { orders:0, products:0, revenue:0, followers:0, rating:0 };
const _DEMO_SELLER_ORDERS = [];
const _DEMO_ADMIN_STATS = { users:0, sellers:0, orders:0, ordersToday:0, gmv:0, totalRevenue:0, todaysRevenue:0, avgOrderValue:0, profit:0, refunds:0, pendingKyc:0, recentOrders:[] };
const _DEMO_KYC_REQUESTS = [];

// Expose all helpers globally (used by screen files)
Object.assign(window, {
  sbSignUp, sbSignIn, sbSignOut, sbGetSession, sbGetUser, sbGetProfile, sbUpdateProfile,
  sbResetPasswordForEmail, sbVerifyRecoveryOtp, sbUpdatePassword,
  sbGetProducts, sbGetProduct,
  sbGetShops, sbGetShop,
  sbGetBanners, sbUpsertBanner, sbDeleteBanner, sbGetSignupBanner,
  sbGetCart, sbUpsertCartItem, sbClearCart,
  sbCreateOrder, sbGetOrder, sbGetOrders, sbCancelOrder,
  sbGetConversations, sbGetMessages, sbSendMessage,
  sbSubscribeToMessages, sbMarkConversationRead, sbGetOrCreateConversation,
  sbGetNotifications, sbMarkNotificationRead,
  sbGetSellerStats, sbGetSellerOrders,
  sbAdminGetStats, sbAdminGetSalesTimeseries, sbSubscribeAdminOrders,
  sbAdminGetKycRequests, sbAdminUpdateKyc, sbAdminGetUsers, sbAdminUpdateUser,
  sbAdminCreateProduct, sbAdminUpdateProduct, sbAdminDeleteProduct,
  sbUploadFile,
  _isConfigured,
});
