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
  if (!_sb) return { error: { message: 'Supabase non configuré' } };
  const { data, error } = await _sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  return { data, error };
}

async function sbSignIn(email, password) {
  if (!_sb) return { error: { message: 'Supabase non configuré' } };
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
  if (!_sb) return { error: { message: 'Non configuré' } };
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
  if (!_sb) return { error: { message: 'Non configuré' } };
  const { data, error } = await _sb.from('banners').upsert(banner).select().single();
  return { data, error };
}

async function sbDeleteBanner(id) {
  if (!_sb) return { error: { message: 'Non configuré' } };
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
    rating: shop.data?.rating ?? 4.9,
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
async function sbAdminGetStats() {
  if (!_sb) return _DEMO_ADMIN_STATS;
  const [users, sellers, orders, kyc] = await Promise.all([
    _sb.from('profiles').select('id', { count: 'exact', head: true }),
    _sb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    _sb.from('orders').select('total', { count: 'exact' }),
    _sb.from('kyc_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  const gmv = (orders.data ?? []).reduce((s, o) => s + (o.total ?? 0), 0);
  return {
    users: users.count ?? 0,
    sellers: sellers.count ?? 0,
    orders: orders.count ?? 0,
    gmv,
    pendingKyc: kyc.count ?? 0,
  };
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

// ─── FILE UPLOADS ─────────────────────────────────────────────────
async function sbUploadFile(bucket, path, file) {
  if (!_sb) return { url: null, error: { message: 'Non configuré' } };
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
    rating: p.rating ?? 4.8,
    reviews_count: p.reviews ?? 234,
    images: [],
    shops: { name: p.seller ?? 'luna.studio', is_verified: true },
    categories: { name: p.category ?? 'Maison' },
    label: p.label ?? '',
    tint: p.id % 5,
  };
}

const _DEMO_SHOPS = [
  { id:'demo-s1', name:'luna.studio',    brand_color:'#C97B5A', is_verified:true,  followers:2400, initial:'L' },
  { id:'demo-s2', name:'TechZone',       brand_color:'#4A6FD4', is_verified:true,  followers:5100, initial:'T' },
  { id:'demo-s3', name:'Fashion House',  brand_color:'#9B59B6', is_verified:true,  followers:1800, initial:'F' },
  { id:'demo-s4', name:'ceramix.co',     brand_color:'#7A8A6A', is_verified:true,  followers:900,  initial:'C' },
  { id:'demo-s5', name:'Luxe Store',     brand_color:'#1A1A2E', is_verified:true,  followers:3200, initial:'L' },
  { id:'demo-s6', name:'nature.home',    brand_color:'#27AE60', is_verified:false, followers:600,  initial:'N' },
  { id:'demo-s7', name:'ElectroWorld',   brand_color:'#E67E22', is_verified:true,  followers:4000, initial:'E' },
];

const _DEMO_BANNERS = [
  { id:'demo-b1', title:"Jusqu'à 70% offerts sur Maison & Cuisine", subtitle:"Offre printemps", cta_text:"Acheter maintenant", bg_color:'#6C4DFF', position:1 },
  { id:'demo-b2', title:'Nouvelle collection Mode', subtitle:'Tendances printemps-été', cta_text:'Découvrir', bg_color:'#059669', position:2 },
  { id:'demo-b3', title:'Tech à petits prix', subtitle:'Smartphones et accessoires', cta_text:'Explorer', bg_color:'#D97706', position:3 },
];

const _DEMO_CONVERSATIONS = [
  { id:'demo-c1', shops:{ name:'Luxe Store', brand_color:'#1A1A2E', is_verified:true }, last_message:"Thank you! 🙏 Si vous avez d'autres questions…", last_message_at: new Date(Date.now()-86400000).toISOString(), buyer_unread:1 },
  { id:'demo-c2', shops:{ name:'TechZone Haiti', brand_color:'#4A6FD4', is_verified:true }, last_message:"Merci ! Je vais vérifier et revenir vers vous…", last_message_at: new Date(Date.now()-172800000).toISOString(), buyer_unread:1 },
  { id:'demo-c3', shops:{ name:'Fashion House', brand_color:'#9B59B6', is_verified:true }, last_message:"📦 Commande #CLV789456 — Expédiée", last_message_at: new Date(Date.now()-259200000).toISOString(), buyer_unread:0 },
];

const _DEMO_MESSAGES = [
  { id:'dm1', sender_id:'seller', content:"Bonjour ! Comment puis-je vous aider ?", created_at: new Date(Date.now()-3600000).toISOString() },
  { id:'dm2', sender_id:'buyer',  content:"Bonjour, le produit est-il disponible en taille L ?", created_at: new Date(Date.now()-3000000).toISOString() },
  { id:'dm3', sender_id:'seller', content:"Oui, nous l'avons en L ! Délai de livraison : 3-5 jours.", created_at: new Date(Date.now()-2400000).toISOString() },
];

const _DEMO_NOTIFICATIONS = [
  { id:'dn1', type:'order', title:'Commande expédiée', body:'Votre commande #CLV001 est en route', read_at: null, created_at: new Date(Date.now()-3600000).toISOString() },
  { id:'dn2', type:'promo', title:'Vente flash — 2h restantes', body:'Jusqu\'à -70% sur la sélection', read_at: null, created_at: new Date(Date.now()-7200000).toISOString() },
  { id:'dn3', type:'system', title:'Bienvenue sur Clorivo 🎉', body:'Découvrez des milliers de produits', read_at: new Date().toISOString(), created_at: new Date(Date.now()-86400000).toISOString() },
];

const _DEMO_SELLER_STATS = { orders: 127, products: 34, revenue: 5248.00, followers: 2400, rating: 4.9 };
const _DEMO_SELLER_ORDERS = [
  { id:'so1', title:'Vase Terracotta', quantity:1, price:24.50, orders:{ status:'pending', created_at: new Date(Date.now()-3600000).toISOString() } },
  { id:'so2', title:'Mug Céramique', quantity:2, price:14.99, orders:{ status:'processing', created_at: new Date(Date.now()-86400000).toISOString() } },
];
const _DEMO_ADMIN_STATS = { users: 12480, sellers: 843, orders: 5621, gmv: 284920, pendingKyc: 14 };
const _DEMO_KYC_REQUESTS = [
  { id:'kyc1', profiles:{ full_name:'Marc Dupont', email:'marc@mail.com' }, shop_name:'Maison Dupont', status:'pending', created_at: new Date(Date.now()-86400000).toISOString() },
  { id:'kyc2', profiles:{ full_name:'Sophie Legrand', email:'sophie@mail.com' }, shop_name:'Sophie Bijoux', status:'pending', created_at: new Date(Date.now()-172800000).toISOString() },
];

// Expose all helpers globally (used by screen files)
Object.assign(window, {
  sbSignUp, sbSignIn, sbSignOut, sbGetSession, sbGetUser, sbGetProfile, sbUpdateProfile,
  sbResetPasswordForEmail, sbVerifyRecoveryOtp, sbUpdatePassword,
  sbGetProducts, sbGetProduct,
  sbGetShops, sbGetShop,
  sbGetBanners, sbUpsertBanner, sbDeleteBanner, sbGetSignupBanner,
  sbGetCart, sbUpsertCartItem, sbClearCart,
  sbCreateOrder, sbGetOrder, sbGetOrders,
  sbGetConversations, sbGetMessages, sbSendMessage,
  sbSubscribeToMessages, sbMarkConversationRead, sbGetOrCreateConversation,
  sbGetNotifications, sbMarkNotificationRead,
  sbGetSellerStats, sbGetSellerOrders,
  sbAdminGetStats, sbAdminGetKycRequests, sbAdminUpdateKyc,
  sbUploadFile,
  _isConfigured,
});
