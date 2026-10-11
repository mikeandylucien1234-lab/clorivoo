import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUPABASE_URL      = 'https://kpwebnoqsjlxxiamwsst.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwd2Vibm9xc2pseHhpYW13c3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjcxNzMsImV4cCI6MjEwNjIwMzE3M30.9okYEL47QM1vZUR-wTQP2b0TZWbabSA8sLXJMUrT41U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ─── AUTH ─────────────────────────────────────────────────────────
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } },
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function signInWithOAuth(provider) {
  const redirectTo = Platform.OS === 'web'
    ? window.location.origin
    : 'clorivo://auth/callback';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  return { data, error };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// Uses Supabase Auth's built-in recovery email directly — no custom Edge
// Function involved, so no secret key (Resend, service role) is ever
// touched from the client. Mirrors the web app's sbResetPasswordForEmail.
export async function resetPasswordForEmail(email) {
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}${window.location.pathname}`
    : 'clorivo://reset-password';
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { data, error };
}

// ─── PROFILE ──────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
}

export async function savePushToken(userId, token) {
  await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
}

// ─── PRODUCTS ─────────────────────────────────────────────────────
export async function getProducts({ categorySlug, categoryId, shopId, seller_id, limit = 20, offset = 0 } = {}) {
  let q = supabase
    .from('products')
    .select('*, shops(id,name,is_verified,brand_color,followers,seller_id), categories(id,name,slug)')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  if (shopId)     q = q.eq('shop_id', shopId);
  if (seller_id)  q = q.eq('seller_id', seller_id);
  if (categoryId) {
    q = q.eq('category_id', categoryId);
  } else if (categorySlug) {
    // First try matching by category_id via slug lookup, then fallback to text field
    const { data: cat } = await supabase.from('categories').select('id,parent_id').eq('slug', categorySlug).maybeSingle();
    if (cat) {
      // If it's a parent category, include products from all its subcategories too
      const { data: subs } = await supabase.from('categories').select('id').eq('parent_id', cat.id);
      const ids = [cat.id, ...(subs ?? []).map(s => s.id)];
      q = q.in('category_id', ids);
    } else {
      q = q.ilike('category', `%${categorySlug}%`);
    }
  }
  const { data, error } = await q;
  return { data: data ?? [], error };
}

export async function getProduct(id) {
  const { data } = await supabase
    .from('products')
    .select('*, shops(id,name,slug,is_verified,brand_color,followers,description), categories(id,name)')
    .eq('id', id)
    .single();
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase.from('products').insert(product).select().single();
  return { data, error };
}

export async function updateProduct(id, updates) {
  const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
  return { data, error };
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return { error };
}

// ─── SHOPS ────────────────────────────────────────────────────────
export async function getShops(limit = 10) {
  const { data } = await supabase.from('shops').select('*').eq('is_active', true)
    .order('followers', { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getShopBySeller(sellerId) {
  const { data } = await supabase.from('shops').select('*, shop_banners(*)').eq('seller_id', sellerId).single();
  return data;
}

export async function createShop(shop) {
  const { data, error } = await supabase.from('shops').insert(shop).select().single();
  return { data, error };
}

export async function updateShop(id, updates) {
  const { data, error } = await supabase.from('shops').update(updates).eq('id', id).select().single();
  return { data, error };
}

// ─── CATEGORIES ───────────────────────────────────────────────────
export async function getCategories() {
  const { data } = await supabase.from('categories').select('*').is('parent_id', null).order('position');
  return data ?? [];
}

export async function getSubCategories(parentId) {
  const { data } = await supabase.from('categories').select('*').eq('parent_id', parentId).order('position');
  return data ?? [];
}

// ─── CART ─────────────────────────────────────────────────────────
export async function getCart(userId) {
  const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) return [];
  const { data } = await supabase.from('cart_items')
    .select('*, products(id,title,price,compare_price,images,shops(name))')
    .eq('cart_id', cart.id);
  return data ?? [];
}

export async function upsertCartItem(userId, productId, variant, quantity, price) {
  let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) {
    const { data } = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
    cart = data;
  }
  if (quantity <= 0) {
    await supabase.from('cart_items').delete()
      .eq('cart_id', cart.id).eq('product_id', productId);
    return;
  }
  await supabase.from('cart_items').upsert(
    { cart_id: cart.id, product_id: productId, variant, quantity, unit_price: price },
    { onConflict: 'cart_id,product_id,variant' }
  );
}

export async function clearCart(userId) {
  const { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
  if (cart) await supabase.from('cart_items').delete().eq('cart_id', cart.id);
}

// ─── ORDERS ───────────────────────────────────────────────────────
// Creation goes exclusively through the create_order() RPC (Phase 4):
// it re-reads real price/stock from `products` server-side and
// recomputes totals from the buyer's own persisted cart — nothing here
// is trusted from the client. The order always starts
// status='pending' / payment_status='pending'; nothing on this client
// can mark it paid.
export async function createOrder(userId, shippingAddress, shippingMethod = 'standard', paymentMethod = 'card') {
  const { data, error } = await supabase.rpc('create_order', {
    p_shipping_address: shippingAddress ?? {},
    p_shipping_method: shippingMethod,
    p_payment_method: paymentMethod,
  });
  if (error) throw error;
  const order = await getOrder(data.order_id);
  await recordPaymentAttempt(order.id, paymentMethod);
  return order;
}

// Logs a payment attempt — the amount is read server-side from the
// order itself. This never marks anything paid; only an admin with
// payments.confirm can do that, after a real provider confirmation.
export async function recordPaymentAttempt(orderId, provider, providerReference = null) {
  const { data, error } = await supabase.rpc('record_payment_attempt', {
    p_order_id: orderId, p_provider: provider, p_provider_reference: providerReference,
  });
  if (error) throw error;
  return data;
}

export async function getOrders(userId) {
  const { data } = await supabase.from('orders')
    .select('*, order_items(title,quantity,price,image_url)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getOrder(orderId) {
  const { data } = await supabase.from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId).single();
  return data;
}

// Returns orders grouped with ONLY this seller's own order_items — a
// multi-vendor order's other sellers' items never appear here, and this
// seller's fulfillment_status is tracked per item, never as one
// whole-order status (Phase 4: orders.status is no longer writable by a
// plain seller at all; only order_items.fulfillment_status is, one at a
// time, for the seller's own rows).
export async function getSellerOrders(userId, limit = 50) {
  const { data } = await supabase.from('order_items')
    .select('id, order_id, fulfillment_status, quantity, unit_price, title, orders!inner(id, created_at, total_amount, shipping_address, shipping_method)')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const byOrder = new Map();
  for (const item of data ?? []) {
    const o = item.orders;
    if (!o) continue;
    if (!byOrder.has(o.id)) {
      byOrder.set(o.id, {
        id: o.id, created_at: o.created_at, total_amount: o.total_amount,
        shipping_address: o.shipping_address, shipping_method: o.shipping_method,
        items: [],
      });
    }
    byOrder.get(o.id).items.push({
      id: item.id, fulfillment_status: item.fulfillment_status,
      quantity: item.quantity, unit_price: item.unit_price, title: item.title,
    });
  }
  return Array.from(byOrder.values());
}

// Advances ONE of this seller's own order_items one fulfillment step —
// RLS + the protect_order_item_fields trigger both enforce seller_id
// ownership and the one-step-forward rule server-side; this is just the
// client call, with no local-state optimism on error.
export async function advanceItemFulfillment(orderItemId, nextStatus) {
  const { error } = await supabase.from('order_items')
    .update({ fulfillment_status: nextStatus })
    .eq('id', orderItemId);
  if (error) throw error;
}

export async function getSellerStats(userId) {
  const [{ count: ordersCount }, { data: products }] = await Promise.all([
    supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
    supabase.from('products').select('id,price,rating').eq('seller_id', userId).eq('status', 'active'),
  ]);
  const productsCount = products?.length ?? 0;
  const ratedProducts = (products ?? []).filter(p => p.rating != null);
  const avgRating = ratedProducts.length
    ? ratedProducts.reduce((s, p) => s + p.rating, 0) / ratedProducts.length
    : null;
  // revenue: sum order_items price*qty for last 30 days
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: recentItems } = await supabase.from('order_items')
    .select('unit_price,quantity').eq('seller_id', userId).gte('created_at', since);
  const revenue30d = (recentItems ?? []).reduce((s, i) => s + (i.unit_price ?? 0) * (i.quantity ?? 1), 0);
  return { orders_count: ordersCount ?? 0, products_count: productsCount, avg_rating: avgRating, revenue_30d: revenue30d };
}

// ─── MESSAGES ─────────────────────────────────────────────────────
export async function getConversations(userId) {
  const { data } = await supabase.from('conversations')
    .select('*, shops(id,name,brand_color,is_verified), buyer:profiles!buyer_id(id,full_name,avatar_url), seller:profiles!seller_id(id,full_name,avatar_url), messages(id,content,sender_id,read_at,created_at)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  // Sort messages desc so [0] is the latest
  return (data ?? []).map(c => ({
    ...c,
    messages: (c.messages ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  }));
}

export async function getMessages(conversationId) {
  const { data } = await supabase.from('messages')
    .select('*, sender:profiles(id,full_name,avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function sendMessage(conversationId, senderId, content) {
  const { data, error } = await supabase.from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content })
    .select('*, sender:profiles(id,full_name)').single();
  return { data, error };
}

export async function getOrCreateConversation(buyerId, sellerId, shopId, productId) {
  let { data } = await supabase.from('conversations').select('id')
    .eq('buyer_id', buyerId).eq('seller_id', sellerId).maybeSingle();
  if (!data) {
    const res = await supabase.from('conversations')
      .insert({ buyer_id: buyerId, seller_id: sellerId, shop_id: shopId, product_id: productId })
      .select('id').single();
    data = res.data;
  }
  return data;
}

// ─── BANNERS (homepage CMS) ───────────────────────────────────────
export async function getBanners() {
  const { data, error } = await supabase.from('banners')
    .select('*')
    .eq('is_active', true)
    .order('position');
  if (error) { console.warn('getBanners error:', error.message); return []; }
  return data ?? [];
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────
export async function getNotifications(userId) {
  const { data } = await supabase.from('notifications').select('*')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return data ?? [];
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function createNotification(userId, type, title, body, data = {}) {
  await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
}

// ─── REALTIME ─────────────────────────────────────────────────────
export function subscribeToMessages(conversationId, callback) {
  const channel = supabase.channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, payload => callback(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── STORAGE ──────────────────────────────────────────────────────
export async function uploadFile(path, blob, contentType = 'image/jpeg') {
  const { data, error } = await supabase.storage.from('products').upload(path, blob, { upsert: true, contentType });
  if (error) { console.warn('Upload error:', error.message); return null; }
  const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
  return publicUrl;
}

// Resize image so the longest dimension is at least `minPx` pixels (default 900).
// Uses dynamic import so expo-image-manipulator doesn't crash on web.
async function resizeForSharpness(uri, minPx = 900) {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    const img = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
    const { width, height } = img;
    const longest = Math.max(width, height);
    if (longest >= minPx) return uri;
    const scale = minPx / longest;
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: Math.round(width * scale), height: Math.round(height * scale) } }],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch {
    return uri; // fallback: upload original
  }
}

export async function uploadImage(bucket, path, uri) {
  const processedUri = await resizeForSharpness(uri);
  const response = await fetch(processedUri);
  const blob = await response.blob();
  const contentType = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg';
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType });
  if (error) {
    // Bucket may not exist — try creating it (public) then retry
    if (error.message?.includes('Bucket not found') || error.statusCode === 400) {
      await supabase.storage.createBucket(bucket, { public: true }).catch(() => {});
      const { error: err2 } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType });
      if (err2) return { url: null, error: err2 };
    } else {
      return { url: null, error };
    }
  }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: publicUrl, error: null };
}

export async function uploadVideo(path, uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const contentType = blob.type || 'video/mp4';
  const { data, error } = await supabase.storage.from('videos').upload(path, blob, { upsert: true, contentType });
  if (error) return { url: null, error };
  const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path);
  return { url: publicUrl, error: null };
}

// ─── PRODUCT VIDEOS ───────────────────────────────────────────────
export async function getProductVideos(limit = 10) {
  const { data } = await supabase.from('product_videos')
    .select('*, products(id,title,price,compare_price,images), shops(id,name,brand_color)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getSellerVideos(sellerId) {
  const { data } = await supabase.from('product_videos')
    .select('*, products(id,title,price,images)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createProductVideo(video) {
  const { data, error } = await supabase.from('product_videos').insert(video).select().single();
  return { data, error };
}

export async function deleteProductVideo(id) {
  const { error } = await supabase.from('product_videos').delete().eq('id', id);
  return { error };
}

export async function incrementVideoViews(id) {
  await supabase.rpc('increment_video_views', { video_id: id }).catch(() => {});
}

// ─── NOTIFICATION TEMPLATES ───────────────────────────────────────
export async function getNotificationTemplates() {
  const { data } = await supabase.from('notification_templates')
    .select('*').order('key');
  return data ?? [];
}

export async function upsertNotificationTemplate(template) {
  const { data, error } = await supabase.from('notification_templates')
    .upsert(template, { onConflict: 'key' }).select().single();
  return { data, error };
}

// ─── EXPO PUSH (direct — no server, no quota) ─────────────────────
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(messages) {
  // Expo accepts up to 100 per request; we batch automatically
  const BATCH = 100;
  let sent = 0;
  for (let i = 0; i < messages.length; i += BATCH) {
    const batch = messages.slice(i, i + BATCH);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    sent += batch.length;
  }
  return sent;
}

// ─── NOTIFICATION BROADCAST ───────────────────────────────────────
export async function sendBroadcastNotification({ segment = 'all', type = 'promo', title, body, data = {} }) {
  // 1. Fetch all target push tokens directly (no Edge Function = no quota)
  let query = supabase.from('profiles').select('id, push_token').not('push_token', 'is', null);
  if (segment === 'buyers')  query = query.eq('role', 'buyer');
  if (segment === 'sellers') query = query.eq('role', 'seller');
  const { data: profiles, error } = await query;
  if (error) return { data: null, error };

  const valid = (profiles ?? []).filter(p => p.push_token?.startsWith('ExponentPushToken['));

  // 2. Insert in-app notifications in bulk
  if (valid.length > 0) {
    await supabase.from('notifications').insert(
      valid.map(p => ({ user_id: p.id, type, title, body, data }))
    );
  }

  // 3. Send push notifications directly to Expo (unlimited, free)
  const messages = valid.map(p => ({ to: p.push_token, title, body, data, sound: 'default' }));
  const sent = await sendExpoPush(messages);
  return { data: { recipients: sent }, error: null };
}

// ─── SEND TO ONE USER ─────────────────────────────────────────────
export async function sendNotificationToUser({ userId, type = 'system', title, body, data = {} }) {
  // Insert in-app notification
  const { error: insertErr } = await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
  if (insertErr) return { error: insertErr };

  // Fetch push token and send if available
  const { data: profile } = await supabase.from('profiles').select('push_token').eq('id', userId).single();
  if (profile?.push_token?.startsWith('ExponentPushToken[')) {
    await sendExpoPush([{ to: profile.push_token, title, body, data, sound: 'default' }]);
  }
  return { error: null };
}

// ─── FETCH USERS FOR ADMIN PICKER ────────────────────────────────
export async function searchUsers(query) {
  const { data } = await supabase.from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);
  return data ?? [];
}

export async function getRecentNotificationsSent(limit = 20) {
  const { data } = await supabase.from('notifications')
    .select('id, title, body, type, created_at, user_id, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getNotificationStats() {
  const [{ count: total }, { count: unread }] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }).is('read_at', null),
  ]);
  return { total: total ?? 0, unread: unread ?? 0 };
}

export async function getUnreadNotificationCount(userId) {
  const { count } = await supabase.from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}

export function subscribeToNotifications(userId, callback) {
  // Use a unique channel name per subscription instance to avoid
  // "cannot add callbacks after subscribe()" on remount / StrictMode
  const channelName = `notifications:${userId}:${Date.now()}`;
  const channel = supabase.channel(channelName)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, payload => callback(payload.new))
    .subscribe();
  return () => supabase.removeChannel(channel);
}
