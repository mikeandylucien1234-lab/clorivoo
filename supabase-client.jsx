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
    .eq('approval_status', 'approved')
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

// ─── CATEGORIES — the one source of truth for the whole marketplace ──────
// `categories` (Supabase) replaces the old hardcoded MAIN_CATEGORIES JS arrays that
// used to live separately in screen-admin.jsx and screen-category.jsx. Every screen
// below reads this same table, so an edit in the admin is immediately what Home, the
// Categories page, Search, and seller product creation all see — there is no second
// list to fall out of sync.
const CATEGORY_FALLBACK = []; // no local demo category list anymore — see note above

function _buildCategoryTree(flat) {
  const byId = new Map(flat.map(c => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(c);
    else roots.push(c);
  }
  const sortRec = (list) => { list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); list.forEach(c => sortRec(c.children)); };
  sortRec(roots);
  return roots;
}

// Public: full active category tree, nested. Used by Home (nav/featured), the
// Categories hub, Category product-listing tabs, Search filters, and the seller/admin
// product category picker — one query, one shape, everywhere.
async function sbGetCategoryTree() {
  if (!_sb) return CATEGORY_FALLBACK;
  return _withTimeout((async () => {
    const { data, error } = await _sb.from('categories').select('*').order('position', { ascending: true });
    if (error || !data) return CATEGORY_FALLBACK;
    return _buildCategoryTree(data);
  })(), 10000, CATEGORY_FALLBACK);
}

async function sbGetCategoryBySlug(slug) {
  if (!_sb || !slug) return null;
  const { data } = await _sb.from('categories').select('*').eq('slug', slug).eq('status', 'active').single();
  return data ?? null;
}

// Ancestor chain root→leaf, for breadcrumbs and for "N-level" category URLs
// (/category/fashion/men/shoes).
async function sbGetCategoryBreadcrumb(categoryId) {
  if (!_sb || !categoryId) return [];
  const { data } = await _sb.from('categories').select('id, name, slug, parent_id');
  if (!data) return [];
  const byId = new Map(data.map(c => [c.id, c]));
  const chain = [];
  let cur = byId.get(categoryId);
  while (cur) { chain.unshift(cur); cur = cur.parent_id ? byId.get(cur.parent_id) : null; }
  return chain;
}

async function sbGetFeaturedCategories(limit = 8) {
  if (!_sb) return CATEGORY_FALLBACK;
  return _withTimeout((async () => {
    const { data } = await _sb.from('categories').select('*')
      .eq('is_featured', true).eq('show_on_homepage', true)
      .order('position', { ascending: true }).limit(limit);
    return data ?? [];
  })(), 10000, CATEGORY_FALLBACK);
}

async function sbGetCategoryAttributes(categoryId) {
  if (!_sb || !categoryId) return [];
  const { data } = await _sb.from('category_attributes').select('*').eq('category_id', categoryId).order('display_order', { ascending: true });
  return data ?? [];
}

// All descendant ids (self included) — used so "Fashion" also pulls products filed
// under its subcategories (Men, Women, …) instead of only directly-tagged ones.
function _collectDescendantIds(categoryId, flat) {
  const byParent = new Map();
  flat.forEach(c => { const k = c.parent_id || '__root__'; if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(c.id); });
  const ids = [categoryId];
  const queue = [categoryId];
  while (queue.length) {
    const cur = queue.shift();
    for (const childId of byParent.get(cur) || []) { ids.push(childId); queue.push(childId); }
  }
  return ids;
}

async function sbGetProductsByCategory(categoryIdOrSlug, { limit = 24, offset = 0, sort = 'popular' } = {}) {
  if (!_sb || !categoryIdOrSlug) return { data: [], category: null };
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryIdOrSlug);
  const { data: category } = await _sb.from('categories').select('*')
    .eq(isUuid ? 'id' : 'slug', categoryIdOrSlug).single();
  if (!category) return { data: [], category: null };

  const { data: allCats } = await _sb.from('categories').select('id, parent_id');
  const ids = _collectDescendantIds(category.id, allCats || [category]);

  let q = _sb.from('products').select('*, shops(id, name, slug, is_verified, rating), categories(id, name, slug)')
    .eq('status', 'active').eq('approval_status', 'approved')
    .in('category_id', ids)
    .range(offset, offset + limit - 1);
  if (sort === 'price_asc') q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else if (sort === 'newest') q = q.order('created_at', { ascending: false });
  else q = q.order('sold_count', { ascending: false });

  const { data } = await q;
  return { data: data ?? [], category };
}

// ─── CATEGORIES — ADMIN ────────────────────────────────────────────
async function sbAdminGetCategories(opts = {}) {
  const emptyResult = { categories: [], totalCategories: 0, totalPages: 0, currentPage: opts.page || 1 };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetCategoriesImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetCategoriesImpl({ page = 1, limit = 20, status = 'ALL', search = '', parentId = '' } = {}) {
  let query = _sb.from('categories').select('*', { count: 'exact' });
  if (status !== 'ALL') query = query.eq('status', status.toLowerCase());
  if (parentId === 'ROOT') query = query.is('parent_id', null);
  else if (parentId) query = query.eq('parent_id', parentId);
  const q = (search || '').trim();
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);

  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('position', { ascending: true }).range(from, from + limit - 1);
  if (error) return { categories: [], totalCategories: 0, totalPages: 0, currentPage: page };

  const ids = (data || []).map(c => c.id);
  let productCounts = {}, childCounts = {};
  if (ids.length) {
    const [{ data: prodRows }, { data: childRows }] = await Promise.all([
      _sb.from('products').select('category_id').in('category_id', ids),
      _sb.from('categories').select('parent_id').in('parent_id', ids),
    ]);
    (prodRows || []).forEach(r => { productCounts[r.category_id] = (productCounts[r.category_id] || 0) + 1; });
    (childRows || []).forEach(r => { childCounts[r.parent_id] = (childCounts[r.parent_id] || 0) + 1; });
  }
  const categories = (data || []).map(c => ({ ...c, productCount: productCounts[c.id] || 0, subcategoryCount: childCounts[c.id] || 0 }));

  return { categories, totalCategories: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetCategory(id) {
  if (!_sb || !id) return null;
  return _withTimeout((async () => {
    const [{ data: category }, attributes, breadcrumb] = await Promise.all([
      _sb.from('categories').select('*').eq('id', id).single(),
      sbGetCategoryAttributes(id),
      sbGetCategoryBreadcrumb(id),
    ]);
    if (!category) return null;
    return { ...category, attributes, breadcrumb };
  })(), 10000, null);
}

// True circularity guard: walks the proposed parent's own ancestor chain and refuses
// if the category being edited would become its own ancestor (Fashion → Men → Fashion).
async function _wouldCreateCycle(categoryId, proposedParentId) {
  if (!proposedParentId || proposedParentId === categoryId) return !!proposedParentId && proposedParentId === categoryId;
  const chain = await sbGetCategoryBreadcrumb(proposedParentId);
  return chain.some(c => c.id === categoryId);
}

function _categoryPayload(form) {
  const payload = {};
  const fields = ['name','slug','icon','parent_id','description','short_description','image_url',
    'banner_desktop_url','banner_tablet_url','banner_mobile_url','status','is_featured',
    'show_on_homepage','show_in_navigation','show_in_menu','show_in_search',
    'seo_title','seo_description','seo_keywords','canonical_url','og_image_url',
    'default_view','product_sort_default','position'];
  fields.forEach(f => { if (form[f] !== undefined) payload[f] = form[f] === '' && f === 'parent_id' ? null : form[f]; });
  return payload;
}

async function sbAdminCreateCategory(form) {
  if (!_sb) return { data: null, error: null };
  // A brand-new category has no id yet, so it can't already be its own ancestor —
  // the cycle check only matters on update, once the category exists.
  const user = await sbGetUser();
  const payload = { ..._categoryPayload(form), created_by: user?.id ?? null, updated_by: user?.id ?? null };
  const { data, error } = await _sb.from('categories').insert(payload).select().single();
  if (error?.code === '23505') return { data: null, error: { message: 'A category with this slug already exists' } };
  return { data, error };
}

async function sbAdminUpdateCategory(id, form) {
  if (!_sb) return { data: null, error: null };
  const payload = _categoryPayload(form);
  if (payload.parent_id) {
    const cyclic = await _wouldCreateCycle(id, payload.parent_id);
    if (cyclic) return { data: null, error: { message: 'Invalid parent category — a category cannot be its own descendant' } };
  }
  const user = await sbGetUser();
  payload.updated_by = user?.id ?? null;
  payload.updated_at = new Date().toISOString();
  const { data, error } = await _sb.from('categories').update(payload).eq('id', id).select().single();
  if (error?.code === '23505') return { data: null, error: { message: 'A category with this slug already exists' } };
  return { data, error };
}

async function sbAdminSetCategoryStatus(id, status) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('categories').update({ status }).eq('id', id);
  return { error };
}

async function sbAdminBulkCategoryStatus(ids, status) {
  if (!_sb || !ids?.length) return { error: null };
  const { error } = await _sb.from('categories').update({ status }).in('id', ids);
  return { error };
}

// Swap display order with the adjacent sibling (same parent) — a real, working
// reorder control without needing a drag-and-drop library.
async function sbAdminMoveCategory(id, direction) {
  if (!_sb) return { error: null };
  const { data: cat } = await _sb.from('categories').select('id, parent_id, position').eq('id', id).single();
  if (!cat) return { error: { message: 'Category not found' } };
  let sibQuery = _sb.from('categories').select('id, position').order('position', { ascending: direction === 'up' });
  sibQuery = cat.parent_id ? sibQuery.eq('parent_id', cat.parent_id) : sibQuery.is('parent_id', null);
  sibQuery = direction === 'up' ? sibQuery.lt('position', cat.position) : sibQuery.gt('position', cat.position);
  const { data: sibs } = await sibQuery.limit(1);
  const sib = sibs?.[0];
  if (!sib) return { error: null }; // already first/last — no-op, not an error
  await Promise.all([
    _sb.from('categories').update({ position: sib.position }).eq('id', cat.id),
    _sb.from('categories').update({ position: cat.position }).eq('id', sib.id),
  ]);
  return { error: null };
}

// Delete flow matching the spec: never silently drop products. `productAction` is
// 'move' (reassign to targetCategoryId), 'keep' (clear category_id), or 'archive'
// (don't touch products — archive this category instead of deleting it, the default
// and safest path). `childAction` is 'move' (reparent subcategories to
// targetCategoryId) or 'root' (make them top-level). The products/categories FK
// constraints are ON DELETE NO ACTION, so a hard delete fails loudly if anything was
// missed instead of silently cascading.
async function sbAdminDeleteCategory(id, { productAction = 'archive', targetCategoryId = null, childAction = 'root' } = {}) {
  if (!_sb) return { error: null };

  if (productAction === 'archive') {
    const { error } = await _sb.from('categories').update({ status: 'archived' }).eq('id', id);
    return { error, archived: true };
  }

  if (productAction === 'move' && targetCategoryId) {
    await _sb.from('products').update({ category_id: targetCategoryId }).eq('category_id', id);
  } else if (productAction === 'keep') {
    await _sb.from('products').update({ category_id: null }).eq('category_id', id);
  }

  if (childAction === 'move' && targetCategoryId) {
    await _sb.from('categories').update({ parent_id: targetCategoryId }).eq('parent_id', id);
  } else {
    await _sb.from('categories').update({ parent_id: null }).eq('parent_id', id);
  }

  const { error } = await _sb.from('categories').delete().eq('id', id);
  return { error, archived: false };
}

async function sbAdminSaveCategoryAttribute(attr) {
  if (!_sb) return { data: null, error: null };
  const payload = {
    category_id: attr.category_id, name: attr.name, type: attr.type || 'text',
    options: attr.options || [], is_required: !!attr.is_required, is_filterable: attr.is_filterable !== false,
    is_searchable: !!attr.is_searchable, is_sortable: !!attr.is_sortable, display_order: attr.display_order ?? 0,
  };
  if (attr.id) {
    const { data, error } = await _sb.from('category_attributes').update(payload).eq('id', attr.id).select().single();
    return { data, error };
  }
  const { data, error } = await _sb.from('category_attributes').insert(payload).select().single();
  return { data, error };
}

async function sbAdminDeleteCategoryAttribute(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('category_attributes').delete().eq('id', id);
  return { error };
}

// Secondary categories (products.category_id stays the Primary Category).
async function sbGetProductCategories(productId) {
  if (!_sb || !productId) return [];
  const { data } = await _sb.from('product_categories').select('category_id, categories(id, name, slug)').eq('product_id', productId);
  return (data || []).map(r => r.categories).filter(Boolean);
}

async function sbSetProductCategories(productId, categoryIds) {
  if (!_sb || !productId) return { error: null };
  await _sb.from('product_categories').delete().eq('product_id', productId);
  if (!categoryIds?.length) return { error: null };
  const { error } = await _sb.from('product_categories').insert(categoryIds.map(category_id => ({ product_id: productId, category_id })));
  return { error };
}

let _adminCategoriesChannelSeq = 0;
function sbSubscribeAdminCategories(callback) {
  if (!_sb) return () => {};
  const channel = _sb.channel(`admin-categories-${++_adminCategoriesChannelSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, callback)
    .subscribe();
  return () => _sb.removeChannel(channel);
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
// A stalled connection (slow network, a blocked host) otherwise leaves an admin screen
// spinning forever — Supabase's client has no built-in request timeout. Every admin
// fetch below races against this and falls back to an empty/zeroed result so the UI
// can always leave its loading state.
function _withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// Revenue is recognized on payment_status='paid' (covers 'delivered' orders too, since
// those are paid by the time they ship). Refunds are tracked separately so they net out
// of revenue without being hidden. Commission rate is admin-configurable (Settings →
// Platform), not hardcoded, so Profit reflects whatever the admin has actually set.
async function sbAdminGetStats() {
  if (!_sb) return _DEMO_ADMIN_STATS;
  return _withTimeout(_sbAdminGetStatsImpl(), 10000, { ..._DEMO_ADMIN_STATS, timedOut: true });
}
async function _sbAdminGetStatsImpl() {
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
  return _withTimeout(_sbAdminGetSalesTimeseriesImpl(range), 10000, []);
}
async function _sbAdminGetSalesTimeseriesImpl(range) {
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

const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

// Paginated, filterable, searchable order list for the admin Orders table.
// Search matches order id, buyer name/email, or shop name — PostgREST can't ilike across
// three joined tables in one query, so it's done as two lookups: resolve matching
// buyer/shop ids first, then filter orders by id/buyer_id/those shops' order_items.
async function sbAdminGetOrders(opts = {}) {
  const { page = 1 } = opts;
  const emptyResult = { orders: [], totalOrders: 0, totalPages: 0, currentPage: page };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetOrdersImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetOrdersImpl({ page = 1, limit = 10, status = 'ALL', search = '', dateFrom = null, dateTo = null } = {}) {
  let orderIdsFromSearch = null;
  const q = (search || '').trim();
  if (q) {
    const [byBuyer, byShop] = await Promise.all([
      _sb.from('profiles').select('id').or(`full_name.ilike.%${q}%,email.ilike.%${q}%`),
      _sb.from('shops').select('id').ilike('name', `%${q}%`),
    ]);
    const buyerIds = (byBuyer.data || []).map(p => p.id);
    const shopIds = (byShop.data || []).map(s => s.id);
    let orderIdsFromShops = [];
    if (shopIds.length) {
      const { data } = await _sb.from('order_items').select('order_id').in('shop_id', shopIds);
      orderIdsFromShops = (data || []).map(r => r.order_id);
    }
    orderIdsFromSearch = { buyerIds, orderIdsFromShops, raw: q };
  }

  let query = _sb.from('orders').select('*, profiles(full_name, email)', { count: 'exact' });
  if (status && status !== 'ALL') query = query.eq('status', status.toLowerCase());
  if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); query = query.lte('created_at', end.toISOString()); }
  if (orderIdsFromSearch) {
    const { buyerIds, orderIdsFromShops, raw } = orderIdsFromSearch;
    const idFilter = `id.eq.${raw}`; // exact UUID match, harmless no-op if `raw` isn't a UUID
    const orClauses = [idFilter];
    if (buyerIds.length) orClauses.push(`buyer_id.in.(${buyerIds.join(',')})`);
    if (orderIdsFromShops.length) orClauses.push(`id.in.(${orderIdsFromShops.join(',')})`);
    query = query.or(orClauses.join(','));
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return { orders: [], totalOrders: 0, totalPages: 0, currentPage: page };

  // Attach each order's shop name(s) — a second batched query, since PostgREST can't
  // embed order_items→shops alongside the orders.profiles embed cleanly in one call
  // while also paginating the outer orders list.
  const orderIds = (data || []).map(o => o.id);
  let shopsByOrder = {};
  if (orderIds.length) {
    const { data: items } = await _sb.from('order_items').select('order_id, shops(name)').in('order_id', orderIds);
    (items || []).forEach(it => {
      const name = it.shops?.name;
      if (!name) return;
      shopsByOrder[it.order_id] = shopsByOrder[it.order_id] || new Set();
      shopsByOrder[it.order_id].add(name);
    });
  }
  const orders = (data || []).map(o => ({ ...o, shopNames: [...(shopsByOrder[o.id] || [])] }));

  return { orders, totalOrders: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetOrderDetail(orderId) {
  if (!_sb || !orderId) return null;
  return _withTimeout((async () => {
    const { data } = await _sb.from('orders')
      .select('*, profiles(full_name, email, phone), order_items(*, shops(name))')
      .eq('id', orderId)
      .single();
    return data ?? null;
  })(), 10000, null);
}

async function sbAdminUpdateOrderStatus(orderId, status) {
  if (!_sb) return { error: null };
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === 'refunded') patch.payment_status = 'refunded';
  if (status === 'delivered' || status === 'confirmed' || status === 'processing' || status === 'shipped') patch.payment_status = 'paid';
  const { error } = await _sb.from('orders').update(patch).eq('id', orderId);
  return { error };
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

// Maps the admin product form's shape (title/price/oldPrice/image_url/…) onto the real
// `products` columns (compare_price/images[]/…) — the form previously sent fields that
// don't exist on the table (discount, image_url) and omitted ones that are required
// (stock was dropped entirely on create), so every admin-created product silently failed
// to persist and only ever existed in the client-side window.PRODUCTS array.
function _productFormToSb(form) {
  const payload = {};
  if (form.title !== undefined) payload.title = form.title;
  if (form.price !== undefined) payload.price = form.price;
  if (form.oldPrice !== undefined) payload.compare_price = form.oldPrice || null;
  if (form.stock !== undefined) payload.stock = form.stock ?? 0;
  if (form.category_id !== undefined) payload.category_id = form.category_id || null;
  if (form.sku !== undefined) payload.sku = form.sku || null;
  if (form.image_url !== undefined) payload.images = form.image_url ? [form.image_url] : [];
  return payload;
}

async function sbAdminCreateProduct(product) {
  if (!_sb) return { data: null, error: null };
  const payload = { ..._productFormToSb(product), status: 'active', approval_status: 'approved' };
  const { data, error } = await _sb.from('products').insert(payload).select().single();
  return { data, error };
}

async function sbAdminUpdateProduct(id, updates) {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.from('products').update(_productFormToSb(updates)).eq('id', id).select().single();
  return { data, error };
}

async function sbAdminDeleteProduct(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('products').delete().eq('id', id);
  return { error };
}

// Paginated, filterable, searchable product list for the admin Products table, plus the
// live-on-site count shown in the page subtitle. Search matches title, SKU or shop name —
// same two-step approach as sbAdminGetOrders, since PostgREST can't ilike through a join.
async function sbAdminGetProducts(opts = {}) {
  const { page = 1 } = opts;
  const emptyResult = { products: [], totalProducts: 0, totalPages: 0, currentPage: page, liveProductsCount: 0 };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetProductsImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetProductsImpl({ page = 1, limit = 12, status = 'ALL', search = '', categoryId = '' } = {}) {
  let shopIdsFromSearch = null;
  const q = (search || '').trim();
  if (q) {
    const { data } = await _sb.from('shops').select('id').ilike('name', `%${q}%`);
    shopIdsFromSearch = (data || []).map(s => s.id);
  }

  let query = _sb.from('products').select('*, shops(name), categories(name)', { count: 'exact' });
  if (status === 'PENDING') query = query.eq('approval_status', 'pending');
  else if (status === 'REJECTED') query = query.eq('approval_status', 'rejected');
  else if (status === 'PUBLISHED') query = query.eq('status', 'active').eq('approval_status', 'approved');
  else if (status === 'OUT_OF_STOCK') query = query.eq('stock', 0);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (q) {
    const orClauses = [`title.ilike.%${q}%`, `sku.ilike.%${q}%`];
    if (shopIdsFromSearch.length) orClauses.push(`shop_id.in.(${shopIdsFromSearch.join(',')})`);
    query = query.or(orClauses.join(','));
  }

  const from = (page - 1) * limit;
  const [{ data, count, error }, { count: liveCount }] = await Promise.all([
    query.order('created_at', { ascending: false }).range(from, from + limit - 1),
    _sb.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('approval_status', 'approved'),
  ]);
  if (error) return { products: [], totalProducts: 0, totalPages: 0, currentPage: page, liveProductsCount: liveCount ?? 0 };

  return { products: data ?? [], totalProducts: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page, liveProductsCount: liveCount ?? 0 };
}

// Approve publishes the product immediately; reject unpublishes it and records why.
// Either way, the seller (if any — admin-created products have no seller_id) gets a
// notification row, same mechanism sbGetNotifications already reads from.
async function sbAdminModerateProduct(id, decision, reason = '') {
  if (!_sb) return { error: null };
  const patch = decision === 'approved'
    ? { approval_status: 'approved', status: 'active', rejection_reason: null }
    : { approval_status: 'rejected', status: 'draft', rejection_reason: reason || null };
  const { data, error } = await _sb.from('products').update(patch).eq('id', id).select().single();
  if (!error && data?.seller_id) {
    await _sb.from('notifications').insert({
      user_id: data.seller_id,
      type: decision === 'approved' ? 'product_approved' : 'product_rejected',
      title: decision === 'approved' ? 'Product approved' : 'Product rejected',
      body: decision === 'approved'
        ? `"${data.title}" was approved and is now live.`
        : `"${data.title}" was rejected.${reason ? ' Reason: ' + reason : ''}`,
      data: { product_id: id },
    });
  }
  return { data, error };
}

async function sbAdminTogglePublish(id, published) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('products').update({ status: published ? 'active' : 'draft' }).eq('id', id);
  return { error };
}

let _adminProductsChannelSeq = 0;
function sbSubscribeAdminProducts(callback) {
  if (!_sb) return () => {};
  const channel = _sb.channel(`admin-products-${++_adminProductsChannelSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, callback)
    .subscribe();
  return () => _sb.removeChannel(channel);
}

async function sbGetCategoriesList() {
  if (!_sb) return [];
  return _withTimeout((async () => {
    const { data } = await _sb.from('categories').select('id, name').order('position', { ascending: true });
    return data ?? [];
  })(), 10000, []);
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
  sbAdminGetOrders, sbAdminGetOrderDetail, sbAdminUpdateOrderStatus, ORDER_STATUSES,
  sbAdminGetKycRequests, sbAdminUpdateKyc, sbAdminGetUsers, sbAdminUpdateUser,
  sbAdminCreateProduct, sbAdminUpdateProduct, sbAdminDeleteProduct,
  sbAdminGetProducts, sbAdminModerateProduct, sbAdminTogglePublish, sbSubscribeAdminProducts,
  sbGetCategoriesList,
  sbGetCategoryTree, sbGetCategoryBySlug, sbGetCategoryBreadcrumb, sbGetFeaturedCategories,
  sbGetCategoryAttributes, sbGetProductsByCategory,
  sbAdminGetCategories, sbAdminGetCategory, sbAdminCreateCategory, sbAdminUpdateCategory,
  sbAdminSetCategoryStatus, sbAdminBulkCategoryStatus, sbAdminMoveCategory, sbAdminDeleteCategory,
  sbAdminSaveCategoryAttribute, sbAdminDeleteCategoryAttribute,
  sbGetProductCategories, sbSetProductCategories, sbSubscribeAdminCategories,
  sbUploadFile,
  _isConfigured,
});
