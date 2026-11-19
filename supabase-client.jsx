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
// emailRedirectTo/redirectTo below use the browser's own origin rather than a
// hardcoded domain — the confirmation/recovery link then always points back at
// wherever the app is actually deployed (production domain, a preview deploy,
// etc.) instead of whatever Dashboard "Site URL" happens to be set to. The
// Supabase Dashboard's Redirect URLs allowlist must still include that origin
// (see the Phase 1 report) — this is a defense-in-depth code fix, not a
// substitute for that Dashboard setting.
function _authReturnUrl() {
  try { return window.location.origin + window.location.pathname; } catch (e) { return undefined; }
}

async function sbSignUp(email, password, fullName) {
  if (!_sb) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName }, emailRedirectTo: _authReturnUrl() },
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
  const { data, error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo: _authReturnUrl() });
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

// ─── RBAC — permissions / staff roles / staff members ─────────────────────
// profiles.role stays a simple top-level discriminator (buyer/seller/admin/staff).
// A 'staff' account's *actual* capabilities come entirely from staff_members →
// staff_role_id → role_permissions → permissions, never from the role name
// itself — new staff roles (Catalog Manager, Finance Manager, …) are just rows,
// no code change needed. role='admin' bypasses all of this (Super Admin).
const _DEMO_ACCESS_CONTEXT = { role: null, status: 'active', isAdmin: false, isStaff: false, staffRoleId: null, staffRoleName: null, permissions: [] };

// What the CURRENT signed-in user can do — used to gate UI (never the real
// barrier; RLS + has_permission() on the server are). Returns null if signed out.
async function sbGetMyAccessContext() {
  if (!_sb) return null;
  const user = await sbGetUser();
  if (!user) return null;
  const profile = await sbGetProfile(user.id);
  if (!profile) return null;
  const ctx = { role: profile.role, status: profile.status, isAdmin: profile.role === 'admin', isStaff: false, staffRoleId: null, staffRoleName: null, permissions: [] };
  if (ctx.isAdmin) return ctx;
  const { data: staffRow } = await _sb.from('staff_members').select('id, status, staff_role_id, staff_roles(name)').eq('user_id', user.id).maybeSingle();
  if (staffRow && staffRow.status === 'active') {
    ctx.isStaff = true;
    ctx.staffRoleId = staffRow.staff_role_id;
    ctx.staffRoleName = staffRow.staff_roles?.name ?? null;
    const { data: perms } = await _sb.from('role_permissions').select('permission_key').eq('role_id', staffRow.staff_role_id);
    ctx.permissions = (perms || []).map(p => p.permission_key);
  }
  return ctx;
}

// Real, server-side check for one permission — use this (not the cached
// context above) before anything consequential, since has_permission() is
// SECURITY DEFINER and always reflects the live grant, not a stale client copy.
async function sbHasPermission(permissionKey) {
  if (!_sb) return false;
  const user = await sbGetUser();
  if (!user) return false;
  const { data, error } = await _sb.rpc('has_permission', { p_user_id: user.id, p_permission: permissionKey });
  return !error && data === true;
}

async function sbGetPermissionsCatalog() {
  if (!_sb) return [];
  const { data } = await _sb.from('permissions').select('*').order('module', { ascending: true });
  return data ?? [];
}

async function sbAdminGetStaffRoles() {
  if (!_sb) return [];
  const { data } = await _sb.from('staff_roles').select('*, role_permissions(permission_key)').order('created_at', { ascending: true });
  return (data || []).map(r => ({ ...r, permissions: (r.role_permissions || []).map(p => p.permission_key) }));
}

async function sbAdminCreateStaffRole(name, description) {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.from('staff_roles').insert({ name, description: description || null }).select().single();
  return { data, error };
}

async function sbAdminUpdateStaffRole(id, updates) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('staff_roles').update(updates).eq('id', id);
  return { error };
}

async function sbAdminDeleteStaffRole(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('staff_roles').delete().eq('id', id);
  return { error };
}

// Replace-all pattern for a role's permission set (delete then insert), same
// approach as sbSetProductCategories — simplest correct option without a
// multi-statement transaction primitive available from the client.
async function sbAdminSetRolePermissions(roleId, permissionKeys) {
  if (!_sb) return { error: null };
  await _sb.from('role_permissions').delete().eq('role_id', roleId);
  if (!permissionKeys?.length) return { error: null };
  const { error } = await _sb.from('role_permissions').insert(permissionKeys.map(permission_key => ({ role_id: roleId, permission_key })));
  return { error };
}

async function sbAdminGetStaffMembers() {
  if (!_sb) return [];
  const { data } = await _sb.from('staff_members').select('*, profiles(full_name, email), staff_roles(name)').order('created_at', { ascending: false });
  return data ?? [];
}

// No user-search UI exists yet, so staff are added by the email of an
// existing account — looks it up via profiles (RLS-readable: profiles has no
// blanket public-read policy, so this only resolves accounts the admin's own
// session is already allowed to see, which is fine since the caller is admin).
async function sbAdminFindUserByEmail(email) {
  if (!_sb || !email) return null;
  const { data } = await _sb.from('profiles').select('id, email, full_name, role').ilike('email', email.trim()).maybeSingle();
  return data ?? null;
}

async function sbAdminAddStaffMember(userId, staffRoleId) {
  if (!_sb) return { data: null, error: null };
  const user = await sbGetUser();
  const { data, error } = await _sb.from('staff_members').insert({ user_id: userId, staff_role_id: staffRoleId, invited_by: user?.id ?? null }).select().single();
  if (!error) await _sb.from('profiles').update({ role: 'staff' }).eq('id', userId).neq('role', 'admin');
  return { data, error };
}

async function sbAdminUpdateStaffMember(id, updates) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('staff_members').update(updates).eq('id', id);
  return { error };
}

async function sbAdminRemoveStaffMember(id, userId) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('staff_members').delete().eq('id', id);
  if (!error && userId) await _sb.from('profiles').update({ role: 'buyer' }).eq('id', userId).eq('role', 'staff');
  return { error };
}

// ─── ACCOUNT STATUS (suspend/ban — admins and sellers.suspend/customers.suspend) ──
async function sbAdminSetAccountStatus(userId, status) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('profiles').update({ status }).eq('id', userId);
  return { error };
}

// ─── AUDIT LOG ──────────────────────────────────────────────────────
// actor_id is always derived server-side from auth.uid() inside log_audit() —
// never a parameter here — so a client can log its own actions but can never
// forge an entry attributed to someone else.
async function sbLogAudit(action, resourceType, resourceId, before, after) {
  if (!_sb) return;
  try { await _sb.rpc('log_audit', { p_action: action, p_resource_type: resourceType ?? null, p_resource_id: resourceId != null ? String(resourceId) : null, p_before: before ?? null, p_after: after ?? null }); }
  catch (e) { /* audit logging must never break the admin action it's logging */ }
}

async function sbAdminGetAuditLogs({ page = 1, limit = 30, resourceType = '', search = '' } = {}) {
  const empty = { logs: [], total: 0, totalPages: 0, currentPage: page };
  if (!_sb) return empty;
  let query = _sb.from('audit_logs').select('*, profiles(full_name, email)', { count: 'exact' });
  if (resourceType) query = query.eq('resource_type', resourceType);
  const q = (search || '').trim();
  if (q) query = query.or(`action.ilike.%${q}%,resource_id.ilike.%${q}%`);
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return empty;
  return { logs: data ?? [], total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

// ─── ADMIN: CATALOG BACKUP ──────────────────────────────────────────
// Real export of the actual catalog in Supabase — replaces the old
// `window.PRODUCTS` (always empty) that silently produced a backup file
// with "products": [] every time while the UI claimed it included the
// catalog. Deliberately selects an explicit column list (not `*`) for
// products so a sensitive column added later (e.g. a storage path) is
// never swept into an export file just because it exists on the table —
// nothing here is a secret, password, token, or private credential.
// `error` is only set if every one of the three reads failed; a partial
// result (e.g. categories/brands readable but products blocked by RLS for
// a lower-privilege staff account) still returns whatever DID come back,
// so the caller can report real counts instead of claiming completeness.
async function sbAdminExportCatalog() {
  if (!_sb) return { products: [], categories: [], brands: [], error: { message: 'Not configured' } };
  const [productsRes, categoriesRes, brandsRes] = await Promise.all([
    _sb.from('products').select('id,title,description,price,compare_price,stock,sku,status,approval_status,category_id,brand_id,shop_id,seller_id,images,tags,rating,reviews_count,sold_count,is_featured,is_flash_deal,flash_price,flash_starts_at,flash_ends_at,created_at,updated_at'),
    _sb.from('categories').select('*'),
    _sb.from('brands').select('*'),
  ]);
  const allFailed = productsRes.error && categoriesRes.error && brandsRes.error;
  return {
    products: productsRes.data ?? [],
    categories: categoriesRes.data ?? [],
    brands: brandsRes.data ?? [],
    error: allFailed ? (productsRes.error || categoriesRes.error || brandsRes.error) : null,
    partial: !!(productsRes.error || categoriesRes.error || brandsRes.error),
  };
}

// Routes through the existing send-broadcast Edge Function (supabase/functions/
// send-broadcast) rather than querying profiles/push tokens and inserting into
// notifications directly from this client, the way the mobile app's own
// sendBroadcastNotification() does — that bulk-reads every user's push token
// client-side and relies entirely on RLS to stop abuse. The notifications
// table's own insert policy ("Service role can insert notifications") has no
// actual role restriction in its WITH CHECK clause (`true`), so doing this
// directly from here, or from any authenticated client, would currently let
// ANY signed-in user broadcast to the whole user base — a pre-existing gap
// this function does not attempt to fix (would mean touching RLS/edge
// function deployment, out of scope here). The Edge Function at least keeps
// the bulk profile read and the actual push-token fan-out server-side,
// behind a function invocation that requires a valid session JWT; it does
// not itself verify the caller is an admin either, so the real boundary
// today is still just this screen's own can('notifications.broadcast')
// check — UI-level defense in depth, not a substitute for fixing the RLS
// policy and adding a role check inside the function itself.
async function sbAdminSendBroadcast({ segment = 'all', type = 'promo', title, body } = {}) {
  if (!_sb) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.functions.invoke('send-broadcast', { body: { segment, type, title, body } });
  if (error) return { data: null, error };
  return { data, error: null };
}

// ─── PRODUCTS ────────────────────────────────────────────────────
// Demo fallback (PRODUCTS) only applies when there is no Supabase client at
// all (local preview with no backend configured). Once a real connection
// exists, an empty result or an error is returned as-is — callers must show
// their own empty/error state instead of silently substituting fictitious
// products for real (possibly zero) data.
async function sbGetProducts({ categorySlug, limit = 20, offset = 0, featured } = {}) {
  if (!_sb) return { data: PRODUCTS.map(_prodToSb), error: null };
  let q = _sb.from('products')
    .select('*, shops(id, name, slug, is_verified, rating), categories(id, name, slug), brands(id, name, slug, logo_url, risk_level)')
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
  return { data: data ?? [], error };
}

async function sbGetProduct(id) {
  if (!_sb || !id) return null;
  const { data } = await _sb.from('products')
    .select('*, shops(id, name, slug, is_verified, rating, followers, description), categories(id, name), brands(id, name, slug, logo_url, risk_level)')
    .eq('id', id)
    .single();
  return data;
}

// Real buyer-facing search — replaces the fictitious local SEARCH_INDEX that
// used to live in screen-search.jsx. Text match on title/description; real
// category_id / brand_id filters against the actual taxonomy (same tables the
// admin and category pages use), not a hardcoded tab list.
// Also used as the general "browse all" fetch for the Public Shop catalog —
// `query` is optional there (blank = no text filter, just category/brand/price/
// sort), so this one function covers both Search Results and Public Shop
// without a second, duplicate implementation.
// Return shape is always { data, error, count }, in every branch — including
// when no Supabase client exists at all. `count` is only populated (non-null)
// when `withCount` is requested, since it costs an extra planner pass; it is
// the true total number of matching rows server-side (not just the page
// size), what real pagination needs to know whether more pages exist.
// Never silently turns a real Supabase error into an empty success — `error`
// is always passed through as-is.
async function sbSearchProducts({ query = '', categoryId = '', brandId = '', shopId = '', sort = 'popular', limit = 60, offset = 0, maxPrice = null, withCount = false } = {}) {
  if (!_sb) return { data: [], error: null, count: null };
  const q = (query || '').trim();
  let req = _sb.from('products')
    .select('*, shops(id, name, slug, is_verified, rating), categories(id, name, slug), brands(id, name, slug, logo_url, risk_level)', withCount ? { count: 'exact' } : undefined)
    .eq('status', 'active').eq('approval_status', 'approved')
    .range(offset, offset + limit - 1);
  if (q) req = req.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  if (categoryId) req = req.eq('category_id', categoryId);
  if (brandId) req = req.eq('brand_id', brandId);
  if (shopId) req = req.eq('shop_id', shopId);
  if (maxPrice != null) req = req.lte('price', maxPrice);
  if (sort === 'price_low') req = req.order('price', { ascending: true });
  else if (sort === 'price_high') req = req.order('price', { ascending: false });
  else if (sort === 'newest') req = req.order('created_at', { ascending: false });
  else if (sort === 'rating') req = req.order('rating', { ascending: false });
  else req = req.order('sold_count', { ascending: false });
  const { data, error, count } = await req;
  return { data: data || [], error, count: withCount ? (count ?? 0) : null };
}

// Real products already belonging to a product the buyer is looking at or
// has in their cart — "Similar Products"/"You may also like" everywhere they
// appear. Replaces the fictitious global `PRODUCTS` constant (always empty
// in production) these sections used to read from. Same catalog rules as
// every other buyer-facing listing: active + approved only. `excludeId` keeps
// the current product out of its own "similar" list.
async function sbGetSimilarProducts({ categoryId = '', excludeId = '', limit = 8 } = {}) {
  if (!_sb) return { data: [], error: null };
  let req = _sb.from('products')
    .select('*, shops(id, name, slug), categories(id, name, slug), brands(id, name, slug)')
    .eq('status', 'active').eq('approval_status', 'approved')
    .limit(limit);
  if (categoryId) req = req.eq('category_id', categoryId);
  if (excludeId) req = req.neq('id', excludeId);
  req = req.order('sold_count', { ascending: false });
  const { data, error } = await req;
  return { data: data || [], error };
}

// Real, up-to-date "Flash Deals" row for the Homepage — only products an
// admin actually flagged `is_flash_deal` AND whose promo window (if any
// start/end was set) covers right now. Never a fake countdown: the caller
// decides how/whether to show `flash_ends_at`, which is either a real
// timestamp or null (no deadline set for this deal).
async function sbGetActiveFlashDeals(limit = 6) {
  if (!_sb) return { data: [], error: null };
  const nowIso = new Date().toISOString();
  const { data, error } = await _sb.from('products')
    .select('*, shops(id, name, slug), categories(id, name, slug), brands(id, name, slug)')
    .eq('status', 'active').eq('approval_status', 'approved')
    .eq('is_flash_deal', true)
    .or(`flash_starts_at.is.null,flash_starts_at.lte.${nowIso}`)
    .or(`flash_ends_at.is.null,flash_ends_at.gte.${nowIso}`)
    .order('flash_ends_at', { ascending: true, nullsFirst: false })
    .limit(limit);
  return { data: data || [], error };
}

// ─── ADMIN: FLASH DEALS (persisted on products — no new table) ───────────
// Lists every product currently flagged as a flash deal, regardless of
// whether its window is active yet/still — the admin needs to see and edit
// upcoming and expired ones too, not just the live ones sbGetActiveFlashDeals
// shows to buyers.
async function sbAdminGetFlashDeals() {
  if (!_sb) return [];
  const { data } = await _sb.from('products')
    .select('id, title, price, compare_price, flash_price, flash_starts_at, flash_ends_at, is_flash_deal, images, shops(name)')
    .eq('is_flash_deal', true)
    .order('flash_ends_at', { ascending: true, nullsFirst: false });
  return data ?? [];
}

// Lets the admin find any product (any status) to add it to a flash deal —
// reuses the same `products` table/columns as everywhere else, no second
// catalog. Deliberately not status-filtered: the "Admins can manage all
// products" RLS policy already covers reading/writing any product.
async function sbAdminSearchProductsForFlashDeal(query, limit = 20) {
  if (!_sb) return [];
  const q = (query || '').trim();
  let req = _sb.from('products').select('id, title, price, compare_price, is_flash_deal, shops(name)').limit(limit);
  if (q) req = req.ilike('title', `%${q}%`);
  req = req.order('title', { ascending: true });
  const { data } = await req;
  return data ?? [];
}

// Creates/updates a flash deal on a real product. `flashPrice` must be a
// positive number strictly below the product's current `price` — enforced
// both here (clear error before any write) and by the `flash_price_valid`
// CHECK constraint in the database (the real guarantee). `endsAt` before
// `startsAt` is rejected the same way, backed by `flash_dates_valid`.
async function sbAdminSetFlashDeal(productId, { flashPrice, startsAt = null, endsAt = null, isActive = true } = {}) {
  if (!_sb) return { data: null, error: null };
  const { data: product } = await _sb.from('products').select('price').eq('id', productId).single();
  if (!product) return { data: null, error: { message: 'Product not found' } };
  const price = Number(flashPrice);
  if (!Number.isFinite(price) || price <= 0 || price >= Number(product.price)) {
    return { data: null, error: { message: `The flash price must be a positive number lower than the current price ($${Number(product.price).toFixed(2)}).` } };
  }
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    return { data: null, error: { message: 'The end date must be after the start date.' } };
  }
  const { data, error } = await _sb.from('products').update({
    is_flash_deal: isActive, flash_price: price, flash_starts_at: startsAt || null, flash_ends_at: endsAt || null,
  }).eq('id', productId).select().single();
  return { data, error };
}

// Only ever called after the caller has already confirmed with the admin —
// this function itself does not ask for confirmation, the UI must.
async function sbAdminRemoveFlashDeal(productId) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('products').update({
    is_flash_deal: false, flash_price: null, flash_starts_at: null, flash_ends_at: null,
  }).eq('id', productId);
  return { error };
}

// ─── SHOPS — public store page ────────────────────────────────────────
// Best-effort lookup by name, for the few call sites (e.g. a conversation
// thread) that don't yet carry a real shop id. Not a substitute for passing
// a real shopId where one is available (see sbGetShop) — a name match can be
// ambiguous or stale if a shop renames itself.
async function sbGetShopByName(name) {
  if (!_sb || !name) return null;
  const { data } = await _sb.from('shops').select('*, shop_banners(*)').ilike('name', name.trim()).limit(1).maybeSingle();
  return data ?? null;
}

// Real, published reviews for a seller's whole store (not one product) —
// used by the public store page's Reviews tab. Empty array (not an error)
// when the seller genuinely has none yet; `error` is still passed through
// for a real failure so the caller can tell the two apart.
async function sbGetShopReviews(sellerId, { limit = 50 } = {}) {
  if (!_sb || !sellerId) return { data: [], error: null };
  const { data, error } = await _sb.from('reviews')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
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

async function sbGetProductsByCategory(categoryIdOrSlug, { limit = 24, offset = 0, sort = 'popular', brandId = '' } = {}) {
  if (!_sb || !categoryIdOrSlug) return { data: [], category: null };
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryIdOrSlug);
  const { data: category } = await _sb.from('categories').select('*')
    .eq(isUuid ? 'id' : 'slug', categoryIdOrSlug).single();
  if (!category) return { data: [], category: null };

  const { data: allCats } = await _sb.from('categories').select('id, parent_id');
  const ids = _collectDescendantIds(category.id, allCats || [category]);

  let q = _sb.from('products').select('*, shops(id, name, slug, is_verified, rating), categories(id, name, slug), brands(id, name, slug, logo_url, risk_level)')
    .eq('status', 'active').eq('approval_status', 'approved')
    .in('category_id', ids)
    .range(offset, offset + limit - 1);
  if (brandId) q = q.eq('brand_id', brandId);
  if (sort === 'price_asc') q = q.order('price', { ascending: true });
  else if (sort === 'price_desc') q = q.order('price', { ascending: false });
  else if (sort === 'newest') q = q.order('created_at', { ascending: false });
  else q = q.order('sold_count', { ascending: false });

  const { data } = await q;
  return { data: data ?? [], category };
}

// ─── PRODUCT ATTRIBUTE VALUES — what a given product actually has for each of
// its category's attribute templates. category_attributes stays the template
// (admin-managed); this is the per-product value storage the templates were
// missing. Kept distinct from product_variants.attributes (Étape 2 variants —
// commercial options with their own SKU/stock), per is_variant_option on the
// template row.
async function sbGetProductAttributeValues(productId) {
  if (!_sb || !productId) return [];
  const { data } = await _sb.from('product_attribute_values')
    .select('*, category_attributes(id, name, label, type, unit, is_variant_option, display_order)')
    .eq('product_id', productId);
  return (data || []).sort((a, b) => (a.category_attributes?.display_order ?? 0) - (b.category_attributes?.display_order ?? 0));
}

// `values` is { [category_attribute_id]: stringValue }. Empty/blank values are
// removed rather than stored. Additive upserts — never touches product_variants.
async function sbSetProductAttributeValues(productId, values) {
  if (!_sb || !productId) return { error: null };
  const entries = Object.entries(values || {});
  const toUpsert = entries.filter(([, v]) => v !== '' && v != null)
    .map(([category_attribute_id, value]) => ({ product_id: productId, category_attribute_id, value: String(value) }));
  const toClear = entries.filter(([, v]) => v === '' || v == null).map(([id]) => id);
  if (toClear.length) {
    await _sb.from('product_attribute_values').delete().eq('product_id', productId).in('category_attribute_id', toClear);
  }
  if (toUpsert.length) {
    const { error } = await _sb.from('product_attribute_values').upsert(toUpsert, { onConflict: 'product_id,category_attribute_id' });
    if (error) return { error };
  }
  return { error: null };
}

// ─── SMART CATEGORY SUGGESTION (Phase 5) — rule-based keyword matching, no
// external AI call exists in this project, so none is claimed. Scores every
// leaf-ish category by how many of its own name's words appear in the
// product's title/description and returns the best match above a minimum
// score. The seller must still confirm — this never assigns a category by
// itself.
function sbSuggestCategory(title, description, flatCategories) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const words = new Set(text.split(/[^a-z0-9]+/).filter(w => w.length > 2));
  if (!words.size || !flatCategories?.length) return null;
  let best = null, bestScore = 0;
  for (const c of flatCategories) {
    const catWords = (c.name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (!catWords.length) continue;
    const hits = catWords.filter(w => words.has(w)).length;
    const score = hits / catWords.length;
    if (hits > 0 && score > bestScore) { bestScore = score; best = c; }
  }
  return best && bestScore >= 0.5 ? best : null;
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
    label: attr.label || null, unit: attr.unit || null, default_value: attr.default_value || null,
    is_active: attr.is_active !== false, is_variant_option: !!attr.is_variant_option,
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

// ─── BRANDS (Phase 2) ───────────────────────────────────────────────
// Writes are gated server-side by RLS (brands.create/edit/delete via
// has_permission) — these helpers never decide who's allowed, they just
// surface whatever the database already enforces.
function _brandPayload(form) {
  const payload = {};
  const fields = ['name','slug','logo_url','description','website_url','status','risk_level'];
  fields.forEach(f => { if (form[f] !== undefined) payload[f] = form[f] === '' && f !== 'name' && f !== 'slug' ? null : form[f]; });
  return payload;
}

// Public, active-only — the list a seller's product form and any public
// catalog page should offer. Inactive brands stay reachable only via the
// admin endpoints below, never through this one.
async function sbGetActiveBrands() {
  if (!_sb) return [];
  return _withTimeout((async () => {
    const { data } = await _sb.from('brands').select('id, name, slug, logo_url, risk_level').eq('status', 'active').order('name', { ascending: true });
    return data ?? [];
  })(), 10000, []);
}

async function sbAdminGetBrands(opts = {}) {
  const emptyResult = { brands: [], totalBrands: 0, totalPages: 0, currentPage: opts.page || 1 };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetBrandsImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetBrandsImpl({ page = 1, limit = 20, status = 'ALL', search = '' } = {}) {
  let query = _sb.from('brands').select('*', { count: 'exact' });
  if (status !== 'ALL') query = query.eq('status', status.toLowerCase());
  const q = (search || '').trim();
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);

  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return { brands: [], totalBrands: 0, totalPages: 0, currentPage: page };

  const ids = (data || []).map(b => b.id);
  let productCounts = {};
  if (ids.length) {
    const { data: prodRows } = await _sb.from('products').select('brand_id').in('brand_id', ids);
    (prodRows || []).forEach(r => { productCounts[r.brand_id] = (productCounts[r.brand_id] || 0) + 1; });
  }
  const brands = (data || []).map(b => ({ ...b, productCount: productCounts[b.id] || 0 }));

  return { brands, totalBrands: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetBrand(id) {
  if (!_sb || !id) return null;
  const { data } = await _sb.from('brands').select('*').eq('id', id).single();
  return data;
}

async function sbAdminCreateBrand(form) {
  if (!_sb) return { data: null, error: null };
  const user = await sbGetUser();
  const payload = { ..._brandPayload(form), created_by: user?.id ?? null };
  const { data, error } = await _sb.from('brands').insert(payload).select().single();
  if (error?.code === '23505') return { data: null, error: { message: 'A brand with this name or slug already exists' } };
  return { data, error };
}

async function sbAdminUpdateBrand(id, form) {
  if (!_sb) return { data: null, error: null };
  const payload = { ..._brandPayload(form), updated_at: new Date().toISOString() };
  const { data, error } = await _sb.from('brands').update(payload).eq('id', id).select().single();
  if (error?.code === '23505') return { data: null, error: { message: 'A brand with this name or slug already exists' } };
  return { data, error };
}

async function sbAdminSetBrandStatus(id, status) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('brands').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  return { error };
}

// The brands.brand_id FK on products has no ON DELETE clause (= RESTRICT),
// so the database itself refuses to delete a brand with linked products —
// this never silently orphans or cascades into product data. The UI is
// expected to check productCount and offer deactivation instead before
// ever calling this for a brand that still has products.
async function sbAdminDeleteBrand(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('brands').delete().eq('id', id);
  if (error?.code === '23503') return { error: { message: 'This brand still has products linked to it — deactivate it instead, or move those products to another brand first.' } };
  return { error };
}

let _adminBrandsChannelSeq = 0;
function sbSubscribeAdminBrands(callback) {
  if (!_sb) return () => {};
  const channel = _sb.channel(`admin-brands-${++_adminBrandsChannelSeq}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, callback)
    .subscribe();
  return () => _sb.removeChannel(channel);
}

// ─── BRAND REQUESTS (Step 1) ────────────────────────────────────────
// A seller can never create/activate a brand directly — this is the only
// path from "my brand isn't in the list" to a usable brands row, and it
// always goes through admin_decide_brand_request() (brands.approve).
async function sbRequestBrand(sellerId, shopId, requestedName, reason) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const payload = { seller_id: sellerId, shop_id: shopId || null, requested_name: (requestedName || '').trim(), reason: (reason || '').trim() || null };
  if (!payload.requested_name) return { data: null, error: { message: 'A brand name is required' } };
  const { data, error } = await _sb.from('brand_requests').insert(payload).select().single();
  return { data, error };
}

async function sbGetMyBrandRequests(sellerId) {
  if (!_sb || !sellerId) return [];
  const { data } = await _sb.from('brand_requests').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
  return data ?? [];
}

async function sbAdminGetBrandRequests(opts = {}) {
  const emptyResult = { requests: [], totalRequests: 0, totalPages: 0, currentPage: opts.page || 1 };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetBrandRequestsImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetBrandRequestsImpl({ page = 1, limit = 20, status = 'pending' } = {}) {
  let query = _sb.from('brand_requests').select('*, profiles(full_name, email), shops(name)', { count: 'exact' });
  if (status !== 'ALL') query = query.eq('status', status);
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return { requests: [], totalRequests: 0, totalPages: 0, currentPage: page };
  return { requests: data ?? [], totalRequests: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminDecideBrandRequest(requestId, decision, rejectionReason = '') {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.rpc('admin_decide_brand_request', {
    p_request_id: requestId, p_decision: decision, p_rejection_reason: decision === 'rejected' ? (rejectionReason || null) : null,
  });
  return { data, error };
}

// Authenticity proof documents — private bucket, same random-path-under-
// own-folder pattern as _sbUploadKycDoc, so RLS (storage.foldername(name))[1])
// is what actually keeps one seller's documents from another's, not just the UI.
async function sbUploadAuthenticityProof(userId, file) {
  if (!_sb || !file) return null;
  const ext = (file.name || '').split('.').pop() || 'pdf';
  const rand = (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const path = `${userId}/${rand}-authenticity-proof.${ext}`;
  const { error } = await _sb.storage.from('authenticity-proofs').upload(path, file, { upsert: false });
  if (error) return null;
  return path;
}

// Admin-only reveal — the bucket's own RLS (products.approve or the
// uploader's own folder) is the real guarantee, this signed URL is just
// how a permitted viewer actually sees the file for 60 seconds.
async function sbAdminGetAuthenticityProofUrl(path) {
  if (!_sb || !path) return null;
  const { data, error } = await _sb.storage.from('authenticity-proofs').createSignedUrl(path, 60);
  if (error) return null;
  return data?.signedUrl ?? null;
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

// ─── HOMEPAGE — admin-curated "Popular Shops", real per-click
// behavior unchanged when nothing is curated: get_homepage_featured_
// shops() (public RPC) returns [] until an admin actually curates a
// list via sbAdminSetHomepageFeaturedShops(), and the caller falls
// back to the existing followers-ordered sbGetShops() in that case —
// never a behavior change for a site with no curation set up yet.
async function sbGetHomepageFeaturedShops(limit = 8) {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('get_homepage_featured_shops', { p_limit: limit });
  if (error) return [];
  return data ?? [];
}

async function sbAdminSetHomepageFeaturedShops(shopIds) {
  if (!_sb) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.rpc('admin_set_homepage_featured_shops', { p_shop_ids: shopIds });
  return { data, error };
}

// Admin curation screen needs to search/pick real active shops by name —
// no existing helper does this (sbGetShops always orders by followers and
// never filters by a search term).
async function sbAdminSearchShops(query, limit = 20) {
  if (!_sb) return [];
  let q = _sb.from('shops').select('id, name, slug, logo_url, is_active, followers').eq('is_active', true);
  if (query && query.trim()) q = q.ilike('name', `%${query.trim()}%`);
  const { data, error } = await q.order('followers', { ascending: false }).limit(limit);
  if (error) return [];
  return data ?? [];
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

// variantId is optional (null for legacy no-variant products). When set,
// this re-reads the variant's own stock/reserved before adding to cart —
// a real check, not a guarantee (the only hard guarantee is create_order's
// row-locked check at checkout), just so the cart doesn't silently accept
// more than is realistically available.
async function sbUpsertCartItem(userId, productId, variant, quantity, price, variantId = null) {
  if (!_sb || !userId) {
    // fallback: update window.CART_ITEMS
    const idx = window.CART_ITEMS.findIndex(i => i.product.id == productId);
    if (idx >= 0) window.CART_ITEMS[idx].qty = quantity;
    return { error: null };
  }
  if (variantId && quantity > 0) {
    const { data: v } = await _sb.from('product_variants').select('stock, reserved').eq('id', variantId).single();
    if (v && (v.stock - v.reserved) < quantity) {
      return { error: { message: `Only ${Math.max(0, v.stock - v.reserved)} unit(s) available for this variant.` } };
    }
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
    cart_id: cart.id, product_id: productId, variant, variant_id: variantId, quantity, unit_price: price,
  }, { onConflict: 'cart_id,product_id,variant' });
  return { error };
}

// ─── CENTRALIZED ADD-TO-CART ──────────────────────────────────────────
// The single add-to-cart entry point for Product Details, Public Shop,
// Search Results and Category Pages — all four call this instead of each
// keeping its own copy of the logged-in/guest branching logic.
//
// Logged-in: persists to the real Supabase cart (the same `carts`/`cart_items`
// tables create_order() reads at checkout) via the existing sbUpsertCartItem —
// unchanged, so this never touches product/variant stock or reservations,
// only ever reads a variant's availability (read-only check, already there).
// mode:'increment' (the quick "Add to Cart" buttons on a grid) adds `qty` on
// top of whatever is already in the cart for that exact product+variant,
// read first so a second click doesn't overwrite the existing quantity —
// avoids the "incorrect duplicate" failure mode. mode:'set' (Product
// Details' own quantity stepper) replaces it.
//
// Guest: the existing local window.CART_ITEMS fallback, same shape every
// other screen already reads, also increment- or set-aware.
async function sbAddToCart({ userId, product, variant = null, variantId = null, qty = 1, price, mode = 'increment' }) {
  const unitPrice = price != null ? price : Number(product.price);
  if (!_sb || !userId) {
    const list = window.CART_ITEMS || (window.CART_ITEMS = []);
    const variantLabel = variant?.size || variant?.color || null;
    const idx = list.findIndex(ci => ci.product?.id === product.id && (ci.variant || null) === variantLabel);
    if (idx >= 0) {
      list[idx] = { ...list[idx], qty: mode === 'set' ? qty : list[idx].qty + qty };
    } else {
      list.push({ product, qty, variant: variantLabel, seller: product.shops?.name || product.seller || null });
    }
    window.CART_ITEMS = [...list];
    return { error: null };
  }
  if (mode === 'set') {
    return sbUpsertCartItem(userId, product.id, variant || {}, qty, unitPrice, variantId);
  }

  // mode:'increment' — optimistic-concurrency (compare-and-swap) retry loop,
  // built entirely out of the existing cart_items table/columns: no new SQL
  // function and no migration. The earlier version read the current quantity
  // then wrote current+qty as two separate round trips; two near-simultaneous
  // calls (a double-click, two tabs) could both read the same starting
  // quantity and the second plain upsert would silently overwrite the first's
  // result, losing one increment. Here the write is conditioned on the
  // quantity still being what we just read (`.eq('quantity', existing.quantity)`
  // on the UPDATE); if another call changed it first, zero rows match, we
  // re-read the fresh quantity and try again. This closes the lost-update
  // race without touching create_order()/stock/reservations — those remain
  // the only hard, row-locked guarantee at checkout time; this is a
  // best-effort correctness improvement for the cart stage only.
  let { data: cart } = await _sb.from('carts').select('id').eq('user_id', userId).single();
  if (!cart) {
    const { data, error: cartErr } = await _sb.from('carts').insert({ user_id: userId }).select('id').single();
    if (cartErr) return { error: cartErr };
    cart = data;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    let existingQ = _sb.from('cart_items').select('id, quantity').eq('cart_id', cart.id).eq('product_id', product.id);
    existingQ = variantId ? existingQ.eq('variant_id', variantId) : existingQ.is('variant_id', null);
    const { data: existing } = await existingQ.maybeSingle();
    const targetQty = (existing?.quantity || 0) + qty;

    // Same stock check sbUpsertCartItem already does — unchanged logic,
    // just evaluated against the real post-increment total.
    if (variantId) {
      const { data: v } = await _sb.from('product_variants').select('stock, reserved').eq('id', variantId).single();
      if (v && (v.stock - v.reserved) < targetQty) {
        return { error: { message: `Only ${Math.max(0, v.stock - v.reserved)} unit(s) available for this variant.` } };
      }
    }

    if (!existing) {
      const { error: insErr } = await _sb.from('cart_items').insert({
        cart_id: cart.id, product_id: product.id, variant: variant || {}, variant_id: variantId, quantity: qty, unit_price: unitPrice,
      });
      if (!insErr) return { error: null };
      if (insErr.code !== '23505') return { error: insErr }; // real error, not a concurrent-insert race
      continue; // someone else just inserted this exact row — retry as an update below
    }

    const { data: updated, error: updErr } = await _sb.from('cart_items')
      .update({ quantity: targetQty, unit_price: unitPrice })
      .eq('id', existing.id)
      .eq('quantity', existing.quantity) // CAS: only applies if nobody else changed it since our read above
      .select('id');
    if (updErr) return { error: updErr };
    if (updated && updated.length > 0) return { error: null };
    // 0 rows affected — another concurrent write updated this row first; loop and retry with a fresh read.
  }
  return { error: { message: "Couldn't update your cart — please try again." } };
}

// Called once right after a successful sign-in or sign-up (screen-auth.jsx),
// always from a point where the caller has just confirmed a real
// authenticated session (sbSignIn's returned session, or sbGetUser() for the
// social/OAuth path) — this function itself takes no part in deciding
// whether the user is authenticated, it only ever runs after that is true.
// Folds whatever was added to the local guest cart into the account's real
// Supabase cart, one existing sbAddToCart({mode:'increment'}) call per item —
// never overwrites an existing persisted quantity, just adds to it, and the
// same CAS-based sbAddToCart handles the "no duplicate row" guarantee.
// Any item that fails to merge (e.g. a stock refusal) is kept in the guest
// cart instead of being silently dropped, so a partial failure never loses
// data — only the items that actually persisted are cleared.
// No-op (and safe to call) when there is nothing to merge.
async function sbMergeGuestCartIntoAccount(userId) {
  const guestItems = window.CART_ITEMS || [];
  if (!_sb || !userId || guestItems.length === 0) return { error: null };
  const remaining = [];
  let firstError = null;
  for (const ci of guestItems) {
    if (!ci?.product?.id) continue;
    const { error } = await sbAddToCart({
      userId, product: ci.product, variant: ci.variant ? { size: ci.variant } : null,
      variantId: ci.variantId || null, qty: ci.qty || 1, price: ci.product.price, mode: 'increment',
    });
    if (error) { firstError = firstError || error; remaining.push(ci); }
  }
  window.CART_ITEMS = remaining;
  return { error: firstError };
}

// ─── PRODUCT VARIANTS (Step 2) ───────────────────────────────────────
// Public, active-product-only — what the PDP and cart are allowed to
// offer a shopper. RLS independently enforces the same "active product"
// boundary, this just avoids a wasted round trip to a draft/rejected one.
async function sbGetProductVariants(productId) {
  if (!_sb || !productId) return [];
  const { data } = await _sb.from('product_variants').select('*').eq('product_id', productId).order('size', { ascending: true });
  return data ?? [];
}

// Seller (own shop only, enforced by RLS) or admin. sku must be globally
// unique — the database constraint is the real guarantee, this surfaces
// a readable error instead of a raw Postgres one.
async function sbUpsertProductVariant(variant) {
  if (!_sb) return { data: null, error: null };
  const payload = {
    product_id: variant.product_id, sku: variant.sku, size: variant.size || null, color: variant.color || null,
    price_override: variant.price_override === '' || variant.price_override == null ? null : variant.price_override,
    stock: variant.stock ?? 0, low_stock_threshold: variant.low_stock_threshold === '' || variant.low_stock_threshold == null ? null : variant.low_stock_threshold,
  };
  // Generalized variant options beyond size/color (e.g. RAM/Storage as purchase
  // options with their own SKU/stock) — additive, never touches the fixed
  // columns above (Étape 2).
  if (variant.attributes !== undefined) payload.attributes = variant.attributes || {};
  const { data, error } = variant.id
    ? await _sb.from('product_variants').update(payload).eq('id', variant.id).select().single()
    : await _sb.from('product_variants').insert(payload).select().single();
  if (error?.code === '23505') return { data: null, error: { message: 'This SKU is already used by another variant' } };
  return { data, error };
}

async function sbDeleteProductVariant(id) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('product_variants').delete().eq('id', id);
  return { error };
}

// ─── INVENTORY (Step 2 — real Supabase-backed admin view) ──────────
async function sbAdminGetInventory(opts = {}) {
  const emptyResult = { rows: [], totalRows: 0, totalPages: 0, currentPage: opts.page || 1 };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetInventoryImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetInventoryImpl({ page = 1, limit = 20, search = '', filter = 'ALL' } = {}) {
  let query = _sb.from('products').select('id, title, sku, stock, status, approval_status, product_variants(id, sku, size, color, stock, reserved, low_stock_threshold)', { count: 'exact' });
  const q = (search || '').trim();
  if (q) query = query.or(`title.ilike.%${q}%,sku.ilike.%${q}%`);
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('title', { ascending: true }).range(from, from + limit - 1);
  if (error) return { rows: [], totalRows: 0, totalPages: 0, currentPage: page };
  let rows = data ?? [];
  if (filter === 'OUT_OF_STOCK') rows = rows.filter(p => (p.stock ?? 0) === 0);
  else if (filter === 'LOW_STOCK') rows = rows.filter(p => {
    if (p.product_variants?.length) return p.product_variants.some(v => v.low_stock_threshold != null && (v.stock - v.reserved) > 0 && (v.stock - v.reserved) < v.low_stock_threshold);
    return (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10;
  });
  return { rows, totalRows: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetInventorySettings() {
  if (!_sb) return { reservation_expiry_minutes: 30 };
  const { data } = await _sb.from('platform_settings').select('value').eq('key', 'inventory').single();
  return data?.value ?? { reservation_expiry_minutes: 30 };
}

async function sbAdminUpdateInventorySettings(settings) {
  if (!_sb) return { error: null };
  const user = await sbGetUser();
  const { error } = await _sb.from('platform_settings')
    .update({ value: settings, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq('key', 'inventory');
  return { error };
}

async function sbAdminReleaseExpiredReservations() {
  if (!_sb) return { error: null };
  const { error } = await _sb.rpc('release_expired_variant_reservations');
  return { error };
}

async function sbAdminValidateReturnAndRestock(orderItemId, quantityReturned, notes) {
  if (!_sb) return { data: null, error: null };
  const { data, error } = await _sb.rpc('admin_validate_return_and_restock', {
    p_order_item_id: orderItemId, p_quantity_returned: quantityReturned, p_notes: notes || null,
  });
  return { data, error };
}

async function sbClearCart(userId) {
  if (!_sb || !userId) { window.CART_ITEMS = []; return; }
  const { data: cart } = await _sb.from('carts').select('id').eq('user_id', userId).single();
  if (cart) await _sb.from('cart_items').delete().eq('cart_id', cart.id);
}

// ─── ORDERS ──────────────────────────────────────────────────────
// Creation goes exclusively through the create_order() RPC: it re-reads
// real price/stock/availability from `products` under a row lock and
// recomputes subtotal/discount/total server-side from the buyer's own
// persisted cart — nothing here is trusted from the browser. The order
// always starts status='pending' / payment_status='pending'; nothing in
// this function (or anywhere else on the client) can mark it paid.
async function sbCreateOrder(userId, { shippingAddress, shippingMethod = 'standard', paymentMethod = 'moncash', promoCode = null } = {}) {
  if (!_sb || !userId) {
    const fakeId = 'CLV' + Date.now();
    window._LAST_ORDER = { id: fakeId, status: 'pending', payment_status: 'pending', tracking_number: 'TRK' + Math.random().toString(36).slice(2,10).toUpperCase() };
    return { data: window._LAST_ORDER, error: null };
  }
  const { data, error } = await _sb.rpc('create_order', {
    p_shipping_address: shippingAddress ?? {},
    p_shipping_method: shippingMethod,
    p_payment_method: paymentMethod,
    p_promo_code: promoCode,
  });
  if (error) return { data: null, error };

  const order = await sbGetOrder(data.order_id);
  window._LAST_ORDER = order;
  return { data: order, error: null };
}

// Logs a payment attempt against an order already created by
// sbCreateOrder(); the amount is read server-side from the order itself,
// never supplied by the client. This does NOT mark anything paid — only
// admin_confirm_payment() (server-side, permission-gated) can do that.
async function sbRecordPaymentAttempt(orderId, provider, providerReference = null) {
  if (!_sb) return { data: { ok: true, intent_id: 'demo' }, error: null };
  const { data, error } = await _sb.rpc('record_payment_attempt', {
    p_order_id: orderId, p_provider: provider, p_provider_reference: providerReference,
  });
  return { data, error };
}

// ─── REFUNDS (buyer side) ──────────────────────────────────────────
// orderItemId (optional): scope the refund to one line item instead of
// the whole order — the server then caps it to that item's own value
// and, once recorded, reverses only that item's seller's commission.
async function sbRequestRefund(orderId, reason, amount = null, orderItemId = null) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('request_refund', { p_order_id: orderId, p_reason: reason, p_amount: amount, p_order_item_id: orderItemId });
  return { data, error };
}

async function sbGetMyRefundRequests(orderId = null) {
  if (!_sb) return [];
  let q = _sb.from('refund_requests').select('*, refunds(*)').order('created_at', { ascending: false });
  if (orderId) q = q.eq('order_id', orderId);
  const { data } = await q;
  return data ?? [];
}

// ─── ADMIN: PAYMENTS, COMMISSIONS & REFUNDS ────────────────────────
async function sbAdminGetPaymentIntents({ orderId = null, limit = 50 } = {}) {
  if (!_sb) return [];
  let q = _sb.from('payment_intents').select('*, orders(id, buyer_id, total_amount, profiles(full_name, email))').order('created_at', { ascending: false }).limit(limit);
  if (orderId) q = q.eq('order_id', orderId);
  const { data } = await q;
  return data ?? [];
}

// The ONLY client call that can ever move payment_status to 'paid' — and
// it only succeeds server-side for a caller holding payments.confirm.
async function sbAdminConfirmPayment(intentId, result, providerReference = null, notes = null) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('admin_confirm_payment', {
    p_intent_id: intentId, p_result: result, p_provider_reference: providerReference, p_notes: notes,
  });
  return { data, error };
}

async function sbAdminGetRefundRequests({ page = 1, limit = 20, status = 'ALL', search = '', orderId = null } = {}) {
  const empty = { requests: [], totalRequests: 0, totalPages: 0, currentPage: page };
  if (!_sb) return empty;
  let query = _sb.from('refund_requests').select('*, orders(id, total_amount, payment_status, profiles(full_name, email)), refunds(*)', { count: 'exact' });
  if (status !== 'ALL') query = query.eq('status', status);
  if (orderId) query = query.eq('order_id', orderId);
  const q = (search || '').trim();
  if (q) query = query.ilike('reason', `%${q}%`);
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return empty;
  return { requests: data ?? [], totalRequests: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

// Admin/staff-initiated goodwill refund (not started by the buyer) — still
// capped at the refundable amount, still a distinct step from actually
// recording a provider result below.
async function sbAdminInitiateRefund(orderId, reason, amount = null, orderItemId = null) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('admin_initiate_refund', { p_order_id: orderId, p_reason: reason, p_amount: amount, p_order_item_id: orderItemId });
  return { data, error };
}

// The business decision (approve/reject a refund request) — requires orders.refund.
async function sbAdminDecideRefund(requestId, decision, notes = null) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('admin_decide_refund', { p_request_id: requestId, p_decision: decision, p_notes: notes });
  return { data, error };
}

// Recording what actually happened at the provider — requires
// payments.confirm. Never call this to simulate a success; only to
// record a real, verified provider-side outcome.
async function sbAdminRecordRefundResult(requestId, result, amount, providerReference = null, notes = null) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('admin_record_refund_result', {
    p_request_id: requestId, p_result: result, p_amount: amount, p_provider_reference: providerReference, p_notes: notes,
  });
  return { data, error };
}

async function sbAdminGetCommissionLedger({ orderId = null, limit = 50 } = {}) {
  if (!_sb) return [];
  let q = _sb.from('commission_ledger').select('*, shops(name)').order('created_at', { ascending: false }).limit(limit);
  if (orderId) q = q.eq('order_id', orderId);
  const { data } = await q;
  return data ?? [];
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
    .select('*, order_items(title, quantity, price), shipments(status)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

// Phase 5: a single order may carry one shipment per seller (or more, if
// a seller splits their own items into several). Each shipment's own
// items and immutable status history are nested so the tracking page can
// render independent per-seller cards and timelines — never a single
// fabricated whole-order carrier/timeline.
async function sbGetOrderShipments(orderId) {
  if (!_sb || !orderId) return [];
  const { data, error } = await _sb.from('shipments')
    .select('*, order_items(id, title, quantity, unit_price), shipment_status_history(status, source, note, created_at)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(s => ({
    ...s,
    shipment_status_history: (s.shipment_status_history ?? []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
}

// Mirrors the order_fulfillment_summary SQL view's CASE logic exactly
// (see that view in phase5_shipping_migration.sql for the full
// documented combination table). Every one of the 8 shipment statuses
// is explicitly accounted for:
//   1. no shipments                              -> 'awaiting_shipment'
//   2. every shipment 'cancelled'                 -> 'cancelled' (never
//      silently falls through to 'pending')
//   3. any shipment 'failed' or 'returned'         -> 'delivery_exception'
//      (a return is treated as an exception, same as a failure)
//   4. every NON-cancelled shipment 'delivered',   -> 'delivered'
//      and at least one is delivered (a cancelled shipment is excluded
//      from "required" — documented business rule, not invented here)
//   5. any shipment 'shipped'/'in_transit'         -> 'partially_shipped'
//   6. any shipment 'processing'                   -> 'processing'
//   7. otherwise (only 'pending', or 'pending'      -> 'pending'
//      mixed with 'cancelled')
function computeOrderFulfillmentStatus(shipments) {
  if (!shipments || shipments.length === 0) return 'awaiting_shipment';
  const all = shipments.length;
  const cancelled = shipments.filter(s => s.status === 'cancelled').length;
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const nonCancelled = all - cancelled;
  if (cancelled === all) return 'cancelled';
  if (shipments.some(s => s.status === 'failed' || s.status === 'returned')) return 'delivery_exception';
  if (delivered > 0 && delivered === nonCancelled) return 'delivered';
  if (shipments.some(s => s.status === 'shipped' || s.status === 'in_transit')) return 'partially_shipped';
  if (shipments.some(s => s.status === 'processing')) return 'processing';
  return 'pending';
}

// Routed through cancel_order() (SECURITY DEFINER) rather than a raw
// client UPDATE: it is the only place that releases this order's
// reservations (variant.reserved, or legacy products.stock) and it
// refuses once the order has shipped or been paid — a paid order goes
// through the existing refund workflow instead.
async function sbCancelOrder(orderId) {
  if (!_sb || !orderId) return { data: { id: orderId, status: 'cancelled' }, error: null };
  const { data, error } = await _sb.rpc('cancel_order', { p_order_id: orderId });
  return { data, error };
}

// ─── MESSAGES ────────────────────────────────────────────────────
async function sbGetConversations(userId) {
  if (!_sb || !userId) return { data: [], error: null };
  const { data, error } = await _sb.from('conversations')
    .select('*, shops(id, name, logo_url, brand_color, is_verified), products(id, title, price, images), buyer:profiles!buyer_id(id, full_name, avatar_url), seller:profiles!seller_id(id, full_name, avatar_url)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
  return { data: data ?? [], error };
}

async function sbGetMessages(conversationId) {
  if (!_sb) return { data: _DEMO_MESSAGES, error: null };
  const { data, error } = await _sb.from('messages')
    .select('*, sender:profiles(id, full_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return { data: data ?? [], error };
}

// The ONLY way a message can ever be sent — routes through send_chat_message()
// (SECURITY DEFINER), which authenticates, verifies participant membership,
// checks the recipient hasn't blocked the sender, and runs the server-side
// anti-scam filter BEFORE any insert. Direct INSERT on `messages` is closed
// at the RLS level (see migration) — there is no other path, client-side or
// otherwise, that can place a row in that table.
// Returns { data: {ok:true, message} | {ok:false, blockedCategory}, error }.
// `error` is only set for a genuine failure (auth/participant/validation) —
// a blocked message is NOT an error, it's a normal, successful refusal the
// caller must check `data.ok` for.
async function sbSendMessage(conversationId, senderId, content) {
  if (!_sb) {
    const msg = { id: Date.now(), sender_id: senderId, content, created_at: new Date().toISOString(), conversation_id: conversationId };
    return { data: { ok: true, message: msg }, error: null };
  }
  const { data, error } = await _sb.rpc('send_chat_message', { p_conversation_id: conversationId, p_content: content });
  if (error) return { data: null, error };
  return { data: { ok: data.ok, message: data.message ?? null, blockedCategory: data.blocked_category ?? null }, error: null };
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
  // Also sets a real read_at on the other party's messages (for sent/
  // delivered/read ticks) — a participant-scoped RPC since there is no
  // direct UPDATE policy on `messages`.
  await _sb.rpc('mark_messages_read', { p_conversation_id: conversationId });
}

async function sbGetConversation(conversationId) {
  if (!_sb || !conversationId) return null;
  const { data } = await _sb.from('conversations')
    .select('*, shops(id, name, logo_url, brand_color, is_verified), products(id, title, price, images), buyer:profiles!buyer_id(id, full_name, avatar_url), seller:profiles!seller_id(id, full_name, avatar_url)')
    .eq('id', conversationId)
    .maybeSingle();
  return data ?? null;
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

// ─── OFFERS ──────────────────────────────────────────────────────────
// Reads the real `offers` table (RLS: participants only). Every write
// (create/accept/decline/counter/cancel) goes through the RPCs below —
// there is no direct INSERT/UPDATE policy on this table at all.
async function sbGetOffersForConversation(conversationId) {
  if (!_sb || !conversationId) return { data: [], error: null };
  const { data, error } = await _sb.from('offers')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return { data: data ?? [], error };
}

async function sbCreatePriceOffer(conversationId, productId, offeredPrice, quantity = 1) {
  if (!_sb) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('create_price_offer', {
    p_conversation_id: conversationId, p_product_id: productId, p_offered_price: offeredPrice, p_quantity: quantity,
  });
  if (error) return { data: null, error };
  return { data: data.offer, error: null };
}

// decision: 'accept' | 'decline' | 'counter' | 'cancel'
async function sbRespondToOffer(offerId, decision, counterPrice = null, counterQuantity = null) {
  if (!_sb) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('respond_to_offer', {
    p_offer_id: offerId, p_decision: decision, p_counter_price: counterPrice, p_counter_quantity: counterQuantity,
  });
  if (error) return { data: null, error };
  return { data: data.offer, error: null };
}

function sbSubscribeToOffers(conversationId, callback) {
  if (!_sb) return () => {};
  const channel = _sb.channel('offers:' + conversationId)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'offers', filter: `conversation_id=eq.${conversationId}`,
    }, payload => callback(payload.new ?? payload.old, payload.eventType))
    .subscribe();
  return () => _sb.removeChannel(channel);
}

// Live updates to the conversation list itself (new last_message/unread
// counts) — lets the inbox refresh without a manual reload.
function sbSubscribeToConversations(userId, callback) {
  if (!_sb || !userId) return () => {};
  const channel = _sb.channel('conversations:' + userId)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `buyer_id=eq.${userId}` }, payload => callback(payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `seller_id=eq.${userId}` }, payload => callback(payload.new))
    .subscribe();
  return () => _sb.removeChannel(channel);
}

// ─── REPORTS & BLOCKS (Trust & Safety) ────────────────────────────────
async function sbReportUser(reportedId, conversationId, reason, details = null) {
  if (!_sb) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('report_user', {
    p_reported_id: reportedId, p_conversation_id: conversationId, p_reason: reason, p_details: details,
  });
  return { data, error };
}

// user_blocks RLS already scopes all access to blocker_id = auth.uid(), so
// a direct table call is safe here — no server-side validation beyond
// ownership is needed for a user managing their own block list.
async function sbBlockUser(blockerId, blockedId) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('user_blocks').insert({ blocker_id: blockerId, blocked_id: blockedId });
  return { error };
}
async function sbUnblockUser(blockerId, blockedId) {
  if (!_sb) return { error: null };
  const { error } = await _sb.from('user_blocks').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  return { error };
}
async function sbGetMyBlockedUsers(blockerId) {
  if (!_sb || !blockerId) return [];
  const { data } = await _sb.from('user_blocks').select('blocked_id').eq('blocker_id', blockerId);
  return (data || []).map(r => r.blocked_id);
}

// ─── ADMIN — TRUST & SAFETY CENTER ─────────────────────────────────────
async function sbAdminGetTrustSafetyStats() {
  if (!_sb) return null;
  const { data, error } = await _sb.rpc('admin_get_trust_safety_stats');
  if (error) return null;
  return data;
}

async function sbAdminGetReports({ status = 'ALL', limit = 50 } = {}) {
  if (!_sb) return [];
  let q = _sb.from('user_reports')
    .select('*, reporter:profiles!reporter_id(id, full_name, email), reported:profiles!reported_id(id, full_name, email)')
    .order('created_at', { ascending: false }).limit(limit);
  if (status !== 'ALL') q = q.eq('status', status);
  const { data } = await q;
  return data ?? [];
}

async function sbAdminReviewReport(reportId, decision, notes = null) {
  if (!_sb) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_review_report', { p_report_id: reportId, p_decision: decision, p_notes: notes });
  return { data, error };
}

async function sbAdminGetUserViolations(userId) {
  if (!_sb || !userId) return [];
  const { data } = await _sb.from('user_violations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return data ?? [];
}

async function sbAdminApplyViolation(userId, violationType, severity, action, relatedReportId = null, notes = null) {
  if (!_sb) return { data: null, error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_apply_violation', {
    p_user_id: userId, p_violation_type: violationType, p_severity: severity, p_action: action,
    p_related_report_id: relatedReportId, p_notes: notes,
  });
  return { data, error };
}

async function sbAdminGetModerationLog({ limit = 50 } = {}) {
  if (!_sb) return [];
  const { data } = await _sb.from('message_moderation_log')
    .select('*, sender:profiles(id, full_name, email)')
    .order('created_at', { ascending: false }).limit(limit);
  return data ?? [];
}

// ─── ADMIN — REVIEWS / SUPPORT TICKETS / COUPONS ──────────────────────
async function sbAdminGetReviews(status = 'all') {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('admin_get_reviews', { p_status: status });
  if (error) return [];
  return data ?? [];
}
async function sbAdminModerateReview(reviewId, hidden) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_moderate_review', { p_review_id: reviewId, p_hidden: hidden });
  return { data, error };
}
async function sbAdminGetSupportTickets(status = 'all') {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('admin_get_support_tickets', { p_status: status });
  if (error) return [];
  return data ?? [];
}
async function sbAdminUpdateSupportTicket(ticketId, { status = null, response = null } = {}) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_update_support_ticket', { p_ticket_id: ticketId, p_status: status, p_response: response });
  return { data, error };
}
async function sbAdminGetCoupons() {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('admin_get_coupons');
  if (error) return [];
  return data ?? [];
}
async function sbAdminCreateCoupon({ code, discountType, discountValue, expiresAt = null, minOrderAmount = null, usageLimit = null }) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_create_coupon', {
    p_code: code, p_discount_type: discountType, p_discount_value: discountValue,
    p_expires_at: expiresAt, p_min_order_amount: minOrderAmount, p_usage_limit: usageLimit,
  });
  return { data, error };
}
async function sbAdminUpdateCoupon(couponId, { isActive = null, expiresAt = null, discountValue = null } = {}) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_update_coupon', {
    p_coupon_id: couponId, p_is_active: isActive, p_expires_at: expiresAt, p_discount_value: discountValue,
  });
  return { data, error };
}
async function sbAdminDeleteCoupon(couponId) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { error } = await _sb.rpc('admin_delete_coupon', { p_coupon_id: couponId });
  return { error };
}

// ─── SELLER WALLET / PAYOUTS ───────────────────────────────────────
async function sbGetSellerWalletSummary() {
  if (!_sb) return { total_earned: 0, total_withdrawn: 0, pending_withdrawal: 0, available_balance: 0 };
  const { data, error } = await _sb.rpc('seller_get_wallet_summary');
  if (error) return { total_earned: 0, total_withdrawn: 0, pending_withdrawal: 0, available_balance: 0 };
  return data;
}
async function sbGetMyWithdrawals(sellerId) {
  if (!_sb || !sellerId) return [];
  const { data } = await _sb.from('withdrawal_requests').select('*').eq('seller_id', sellerId).order('created_at', { ascending: false });
  return data ?? [];
}
async function sbSellerRequestWithdrawal(amount, method, accountDetails) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('seller_request_withdrawal', { p_amount: amount, p_method: method, p_account_details: accountDetails });
  return { data, error };
}
async function sbAdminGetWithdrawalRequests(status = 'ALL') {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('admin_get_withdrawal_requests', { p_status: status });
  if (error) return [];
  return data ?? [];
}
async function sbAdminDecideWithdrawal(requestId, decision, note = null) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_decide_withdrawal', { p_request_id: requestId, p_decision: decision, p_note: note });
  return { data, error };
}

// ─── WISHLIST ──────────────────────────────────────────────────────
async function sbGetWishlist(userId) {
  if (!_sb || !userId) return [];
  const { data, error } = await _sb.from('wishlists')
    .select('id, created_at, products(*, categories(name), brands(name), shops(name))')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).filter(row => row.products).map((row, idx) => {
    const card = _toCard(row.products, idx);
    return { ...card, name: card.title, popularity: card.rating ? Math.round(card.rating * 20) : 50, wishlistId: row.id, addedAt: row.created_at, alertOn: false };
  });
}
async function sbAddToWishlist(userId, productId) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { error } = await _sb.from('wishlists').insert({ user_id: userId, product_id: productId });
  if (error && error.code === '23505') return { error: null };
  return { error };
}
async function sbRemoveFromWishlist(userId, productId) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { error } = await _sb.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId);
  return { error };
}
async function sbGetWishlistCount(userId) {
  if (!_sb || !userId) return 0;
  const { count } = await _sb.from('wishlists').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count ?? 0;
}

// ─── ADMIN — PLATFORM SETTINGS (persistent key/value table) ───────────
async function sbAdminGetPlatformSettings() {
  if (!_sb) return {};
  const { data, error } = await _sb.rpc('admin_get_platform_settings');
  if (error) return {};
  return data ?? {};
}
async function sbAdminSetPlatformSetting(key, value) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_set_platform_setting', { p_key: key, p_value: value });
  return { data, error };
}

// ─── HOMEPAGE — the 6 section toggles (hero/shops/deals/categories/
// featured/videos). get_homepage_config() is a narrow, public RPC
// (platform_settings itself has no public SELECT policy — only staff
// with settings.manage/products.view/edit can read the whole table)
// so BOTH the real public Homepage and this Admin screen call the
// same function; only writes go through the existing, permission-
// gated admin_set_platform_setting('homepage', ...) — reused as-is,
// no new write path needed. Same defaults as the old, non-persistent
// window._HOME_SECTIONS so behavior is identical until an admin
// actually changes something.
const HOMEPAGE_CONFIG_DEFAULTS = { hero: true, shops: true, deals: true, categories: true, featured: true, videos: true };
async function sbGetHomepageConfig() {
  if (!_sb) return { ...HOMEPAGE_CONFIG_DEFAULTS };
  const { data, error } = await _sb.rpc('get_homepage_config');
  if (error || !data) return { ...HOMEPAGE_CONFIG_DEFAULTS };
  return { ...HOMEPAGE_CONFIG_DEFAULTS, ...data };
}
async function sbAdminSetHomepageConfig(fullConfig) {
  return sbAdminSetPlatformSetting('homepage', fullConfig);
}
async function sbAdminGetCommissionRate() {
  if (!_sb) return { rate: 0, basis: 'order_subtotal' };
  const { data, error } = await _sb.rpc('admin_get_commission_rate');
  if (error) return { rate: 0, basis: 'order_subtotal' };
  return data;
}
async function sbAdminSetCommissionRate(rate, note = null) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.rpc('admin_set_commission_rate', { p_rate: rate, p_note: note });
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

// ─── ADMIN — personal notification preferences (System Notifications) ──
// Reuses the existing notification_preferences table (user_id, type,
// push/in_app/email, unique on (user_id,type), RLS "Own preferences":
// user_id = auth.uid()) instead of a new table — it already existed
// (Phase 6) but was never wired to any screen. The 5 admin toggles map
// to one row each ('admin_' prefixed type, distinct from any future
// buyer/seller preference type in the same table); the single on/off
// switch this UI exposes is written to all three channel columns
// together so the table's existing channel granularity isn't silently
// narrowed, only unused for now. Defaults mirror the prior hardcoded
// window._NOTIF_SETTINGS values exactly — same behavior, now persisted
// per-admin and enforced by RLS server-side, not just in the UI.
const ADMIN_NOTIF_PREF_TYPES = {
  newOrders: 'admin_new_orders',
  newSellers: 'admin_new_sellers',
  urgentReports: 'admin_urgent_reports',
  weeklyReports: 'admin_weekly_reports',
  marketingEmails: 'admin_marketing_emails',
};
const ADMIN_NOTIF_PREF_DEFAULTS = { newOrders: true, newSellers: true, urgentReports: true, weeklyReports: false, marketingEmails: false };

async function sbGetMyAdminNotificationPrefs() {
  const defaults = { ...ADMIN_NOTIF_PREF_DEFAULTS };
  if (!_sb) return defaults;
  const user = await sbGetUser();
  if (!user) return defaults;
  const types = Object.values(ADMIN_NOTIF_PREF_TYPES);
  const { data, error } = await _sb.from('notification_preferences').select('type, in_app').eq('user_id', user.id).in('type', types);
  if (error || !data) return defaults;
  const byType = Object.fromEntries(data.map(r => [r.type, r.in_app]));
  const result = { ...defaults };
  for (const [key, type] of Object.entries(ADMIN_NOTIF_PREF_TYPES)) {
    if (byType[type] !== undefined && byType[type] !== null) result[key] = byType[type];
  }
  return result;
}

async function sbSetMyAdminNotificationPref(key, value) {
  const type = ADMIN_NOTIF_PREF_TYPES[key];
  if (!type) return { error: { message: 'Unknown preference' } };
  if (!_sb) return { error: { message: 'Supabase not configured' } };
  const user = await sbGetUser();
  if (!user) return { error: { message: 'Authentication required' } };
  const { error } = await _sb.from('notification_preferences')
    .upsert({ user_id: user.id, type, push: value, in_app: value, email: value }, { onConflict: 'user_id,type' });
  return { error };
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

// Phase 5: shipments are the real unit of fulfillment, one row per
// seller-created shipment on an order (a seller may have more than one
// shipment per order — partial shipping). This returns ONLY this
// seller's own shipments, each with its own order_items nested under
// it — never another seller's shipment on the same multi-vendor order.
async function sbGetSellerShipments(sellerId, limit = 50) {
  if (!_sb || !sellerId) return [];
  const { data, error } = await _sb.from('shipments')
    .select('id, order_id, status, carrier, tracking_number, tracking_url, shipping_fee, estimated_delivery, shipped_at, delivered_at, failed_at, failure_reason, created_at, order_items(id, title, quantity, unit_price)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

// Splits a subset of this seller's own, not-yet-shipped items on an
// order into a brand-new shipment (partial/staged shipping). The server
// RPC independently re-checks ownership and eligibility.
async function sbSellerCreateShipment(orderId, orderItemIds) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('seller_create_shipment', { p_order_id: orderId, p_order_item_ids: orderItemIds });
  return { data, error };
}

// Advances one of this seller's own shipments. carrier/tracking fields
// are always seller-provided — no carrier API integration exists yet,
// so nothing here is presented as carrier-verified.
async function sbSellerUpdateShipment(shipmentId, status, { carrier = null, trackingNumber = null, trackingUrl = null, estimatedDelivery = null } = {}) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('seller_update_shipment', {
    p_shipment_id: shipmentId, p_status: status, p_carrier: carrier,
    p_tracking_number: trackingNumber, p_tracking_url: trackingUrl, p_estimated_delivery: estimatedDelivery,
  });
  return { data, error };
}

async function sbSellerReportDeliveryFailure(shipmentId, reason) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('seller_report_delivery_failure', { p_shipment_id: shipmentId, p_reason: reason });
  return { data, error };
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

// 'refunded' is deliberately excluded: it is a payment_status outcome, never
// a fulfillment status, and no backend RPC ever sets orders.status to it —
// see sbAdminUpdateOrderStatus above.
const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled'];

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

// ─── ADMIN SHIPPING MANAGEMENT ──────────────────────────────────────
// Cross-order shipment search for staff with shipping.view/shipping.manage:
// by order id, tracking number, seller or carrier, plus a dedicated filter
// for shipments currently in a delivery exception (status = 'failed').
async function sbAdminGetShipments(opts = {}) {
  const { page = 1 } = opts;
  const emptyResult = { shipments: [], totalShipments: 0, totalPages: 0, currentPage: page };
  if (!_sb) return emptyResult;
  return _withTimeout(_sbAdminGetShipmentsImpl(opts), 10000, { ...emptyResult, timedOut: true });
}
async function _sbAdminGetShipmentsImpl({ page = 1, limit = 15, status = 'ALL', search = '', sellerId = '', carrier = '', exceptionsOnly = false } = {}) {
  // shipment_status_history embedded here too (not just on the buyer-facing
  // sbGetOrderShipments) so the admin panel can show the real audit trail —
  // same immutable table, same rows, read-only from this side.
  let query = _sb.from('shipments').select(
    '*, orders(id, buyer_id, profiles(full_name, email)), profiles!shipments_seller_id_fkey(full_name, email), shops(name), order_items(id, title, quantity, unit_price), shipment_status_history(id, status, source, note, created_at)',
    { count: 'exact' }
  );

  if (exceptionsOnly) query = query.eq('status', 'failed');
  else if (status && status !== 'ALL') query = query.eq('status', status);
  if (sellerId) query = query.eq('seller_id', sellerId);
  if (carrier) query = query.ilike('carrier', `%${carrier}%`);

  const q = (search || '').trim();
  if (q) {
    const orClauses = [`tracking_number.ilike.%${q}%`, `order_id.eq.${q}`, `id.eq.${q}`];
    query = query.or(orClauses.join(','));
  }

  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return { shipments: [], totalShipments: 0, totalPages: 0, currentPage: page };
  const shipments = (data ?? []).map(s => ({
    ...s,
    shipment_status_history: (s.shipment_status_history ?? []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
  return { shipments, totalShipments: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetCarriersList() {
  if (!_sb) return [];
  const { data } = await _sb.from('shipping_carriers').select('name').eq('is_active', true).order('name');
  return (data ?? []).map(c => c.name);
}

// The only function that can touch a shipment it does not own — requires
// shipping.manage, and the server rejects the call outright without a
// note explaining the correction (enforced again here client-side only
// to fail fast; the real guarantee is the RPC's own check).
async function sbAdminOverrideShipment(shipmentId, { status = null, carrier = null, trackingNumber = null, trackingUrl = null, estimatedDelivery = null, failureReason = null } = {}, note) {
  if (!_sb) return { data: null, error: { message: 'Not available in demo mode' } };
  const { data, error } = await _sb.rpc('admin_override_shipment', {
    p_shipment_id: shipmentId, p_status: status, p_carrier: carrier,
    p_tracking_number: trackingNumber, p_tracking_url: trackingUrl,
    p_estimated_delivery: estimatedDelivery, p_note: note,
    p_failure_reason: failureReason,
  });
  return { data, error };
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

// Fulfillment status ONLY — this must never touch payment_status. 'refunded'
// is a payment outcome, not a fulfillment step, and is reachable exclusively
// through the admin_initiate_refund → admin_decide_refund →
// admin_record_refund_result workflow (sbAdminInitiateRefund /
// sbAdminDecideRefund / sbAdminRecordRefundResult) — the only path that also
// writes refund_requests/refunds and reverses commission_ledger. A direct
// UPDATE here used to also force payment_status to 'paid' or 'refunded',
// which could mark an order paid/refunded with no payment_intents,
// refund_requests or commission_ledger trail at all. Fixed: this function
// now writes `status` only, and refuses 'refunded' outright.
async function sbAdminUpdateOrderStatus(orderId, status) {
  if (!_sb) return { error: null };
  if (status === 'refunded') {
    return { error: { message: 'Use the Refunds workflow on the order to refund it — status cannot be set to "refunded" directly.' } };
  }
  const { error } = await _sb.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  return { error };
}

// ─── SELLER KYC (Phase 3) ───────────────────────────────────────────
// Every status change below goes through admin_review_kyc() — the single
// place that checks the matching kyc.*/sellers.suspend permission, blocks
// an incomplete approval, requires a reason for a refusal/correction
// request, flips shops.is_verified/is_active, promotes the profile to
// 'seller' on approval, and writes one audit_logs row. These helpers never
// decide who's allowed — the RPC and the RLS/triggers behind it do.
async function sbAdminGetKycRequests({ page = 1, limit = 20, status = 'ALL', search = '' } = {}) {
  const empty = { requests: [], totalRequests: 0, totalPages: 0, currentPage: page };
  if (!_sb) return empty;
  let query = _sb.from('kyc_requests').select('*, profiles(full_name, email)', { count: 'exact' });
  if (status !== 'ALL') query = query.eq('status', status);
  const q = (search || '').trim();
  if (q) query = query.or(`shop_name.ilike.%${q}%,shop_name_requested.ilike.%${q}%,legal_first_name.ilike.%${q}%,legal_last_name.ilike.%${q}%`);
  const from = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1);
  if (error) return empty;
  return { requests: data ?? [], totalRequests: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit), currentPage: page };
}

async function sbAdminGetKycRequest(id) {
  if (!_sb || !id) return null;
  const { data } = await _sb.from('kyc_requests').select('*, profiles(full_name, email)').eq('id', id).single();
  return data ?? null;
}

// Short-lived (60s) signed URL — never a permanent/public one. Requires the
// caller to already pass the storage SELECT policy (own folder, or a
// kyc.view/review/approve/reject/request_changes permission); this call
// fails outright for anyone else.
async function sbAdminGetKycDocUrl(path) {
  if (!_sb || !path) return null;
  const { data, error } = await _sb.storage.from('kyc-documents').createSignedUrl(path, 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function sbAdminReviewKyc(kycId, decision, notes) {
  if (!_sb) return { error: null };
  const { data, error } = await _sb.rpc('admin_review_kyc', { p_kyc_id: kycId, p_decision: decision, p_notes: notes || null });
  return { data, error };
}

// ─── SELLER-SIDE KYC SUBMISSION ─────────────────────────────────────
async function sbGetMyKyc() {
  if (!_sb) return null;
  const user = await sbGetUser();
  if (!user) return null;
  const { data } = await _sb.from('kyc_requests').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

// Random, unpredictable path under the seller's own folder — storage RLS
// keys off (storage.foldername(name))[1], so this is also what keeps one
// seller from ever reaching another's documents, not just the UI.
async function _sbUploadKycDoc(userId, file, label) {
  if (!file) return null;
  const ext = (file.name || '').split('.').pop() || 'jpg';
  const rand = (window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const path = `${userId}/${rand}-${label}.${ext}`;
  const { error } = await _sb.storage.from('kyc-documents').upload(path, file, { upsert: false });
  if (error) return null;
  return path;
}

async function sbSubmitKyc(form, files = {}) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const user = await sbGetUser();
  if (!user) return { error: { message: 'Not signed in' } };

  const [doc_front_path, doc_back_path, selfie_path] = await Promise.all([
    _sbUploadKycDoc(user.id, files.front, 'front'),
    _sbUploadKycDoc(user.id, files.back, 'back'),
    _sbUploadKycDoc(user.id, files.selfie, 'selfie'),
  ]);
  if (!doc_front_path || !selfie_path) {
    return { error: { message: 'Front document photo and selfie are both required.' } };
  }

  const payload = {
    seller_id: user.id,
    legal_first_name: form.firstName || null, legal_last_name: form.lastName || null,
    date_of_birth: form.dob || null, nationality: form.nationality || null,
    origin_country: form.originCountry || null, destination_country: form.country || null,
    city: form.city || null, contact_email: form.email || null,
    contact_phone: form.phone ? `${form.countryCode || ''} ${form.phone}`.trim() : null,
    shop_name: form.shopName || null, shop_name_requested: form.shopName || null,
    shop_description: form.shopDescription || null, doc_type: form.docType || null,
    doc_front_path, doc_back_path, selfie_path,
  };
  // status is never sent — protect_kyc_request_fields_trg forces 'pending'
  // on insert for anyone without a review permission regardless.
  const { data, error } = await _sb.from('kyc_requests').insert(payload).select().single();
  return { data, error };
}

async function sbResubmitKyc(kycId, form, files = {}) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const user = await sbGetUser();
  if (!user) return { error: { message: 'Not signed in' } };

  const uploads = {};
  if (files.front) uploads.doc_front_path = await _sbUploadKycDoc(user.id, files.front, 'front');
  if (files.back) uploads.doc_back_path = await _sbUploadKycDoc(user.id, files.back, 'back');
  if (files.selfie) uploads.selfie_path = await _sbUploadKycDoc(user.id, files.selfie, 'selfie');

  const payload = {
    legal_first_name: form.firstName || null, legal_last_name: form.lastName || null,
    date_of_birth: form.dob || null, nationality: form.nationality || null,
    origin_country: form.originCountry || null, destination_country: form.country || null,
    city: form.city || null, contact_email: form.email || null,
    contact_phone: form.phone ? `${form.countryCode || ''} ${form.phone}`.trim() : null,
    shop_name_requested: form.shopName || null, shop_description: form.shopDescription || null,
    doc_type: form.docType || null, status: 'pending', ...uploads,
  };
  const { data, error } = await _sb.from('kyc_requests').update(payload).eq('id', kycId).select().single();
  return { data, error };
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
  if (form.brand_id !== undefined) payload.brand_id = form.brand_id || null;
  if (form.sku !== undefined) payload.sku = form.sku || null;
  if (form.image_url !== undefined) payload.images = form.image_url ? [form.image_url] : [];
  if (form.condition !== undefined) payload.condition = form.condition || null;
  if (form.authenticity_statement !== undefined) payload.authenticity_statement = form.authenticity_statement || null;
  if (form.authenticity_proof_paths !== undefined) payload.authenticity_proof_paths = form.authenticity_proof_paths || [];
  return payload;
}

async function sbAdminCreateProduct(product) {
  if (!_sb) return { data: null, error: null };
  const payload = { ..._productFormToSb(product), status: 'active', approval_status: 'approved' };
  const { data, error } = await _sb.from('products').insert(payload).select().single();
  return { data, error };
}

// The seller's own shop — created server-side by admin_review_kyc() the
// moment their KYC is approved (seller_id = the approved applicant), so
// any profile with role 'seller' is guaranteed to have exactly one. Read
// directly from shops rather than profiles.shop_id, which nothing in the
// schema keeps populated.
async function sbGetMyShop(sellerId) {
  if (!_sb || !sellerId) return null;
  const { data } = await _sb.from('shops').select('*').eq('seller_id', sellerId).single();
  return data ?? null;
}

// Sellers can update their own shop directly — RLS ("Sellers can manage
// their shop": seller_id = auth.uid()) already covers this, no RPC needed.
async function sbUpdateShop(shopId, patch) {
  if (!_sb) return { error: { message: 'Not configured' } };
  const { data, error } = await _sb.from('shops').update(patch).eq('id', shopId).select().single();
  return { data, error };
}

// Seller-submitted products start exactly where the admin moderation
// queue (AdminProductsSection / sbAdminModerateProduct) expects an
// unreviewed listing to start — draft + pending — never auto-published
// like sbAdminCreateProduct's own (admin-authored) products above.
// shop_id/seller_id are set from the caller's own shop; RLS ("Sellers
// can manage their products": shop_id in (select id from shops where
// seller_id = auth.uid())) independently rejects any other shop_id for
// a non-admin session regardless of what's passed here.
async function sbSellerCreateProduct(shopId, sellerId, product) {
  if (!_sb) return { data: null, error: { message: 'Supabase not configured' } };
  if (!shopId) return { data: null, error: { message: 'No shop found for this seller.' } };
  const payload = { ..._productFormToSb(product), shop_id: shopId, seller_id: sellerId, status: 'draft', approval_status: 'pending' };
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

  let query = _sb.from('products').select('*, shops(name), categories(name), brands(name)', { count: 'exact' });
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
  // PHASE 6: notifications has no direct client insert policy anymore
  // (see phase6_notifications_security_migration.sql) — this moderating
  // admin's own session calls the same permission-checked RPC the
  // broadcast/individual-send UI uses. role='admin' auto-passes
  // has_permission() for any key, so this keeps working unchanged for
  // every admin account; a non-admin can never reach this code path at
  // all (AdminProductsSection is admin-console-only).
  if (!error && data?.seller_id) {
    await _sb.rpc('admin_send_notification', {
      p_user_id: data.seller_id,
      p_type: decision === 'approved' ? 'product_approved' : 'product_rejected',
      p_title: decision === 'approved' ? 'Product approved' : 'Product rejected',
      p_body: decision === 'approved'
        ? `"${data.title}" was approved and is now live.`
        : `"${data.title}" was rejected.${reason ? ' Reason: ' + reason : ''}`,
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

// ─── ADMIN — System Health (real checks, not placeholders) ────────
// Each function below performs one REAL round trip against a real
// Supabase service and reports what actually happened — never a
// hardcoded "ok". The shared classifier distinguishes network
// failure, timeout, expired session, and permission denial so the
// Health UI never confuses "no permission" with "service is down".
function _classifyHealthError(error, thrown) {
  if (thrown) {
    const msg = String(thrown?.message || thrown || '');
    if (thrown?.name === 'AbortError') return { errorType:'timeout', message:'Request timed out.' };
    if (/fetch|network/i.test(msg)) return { errorType:'network', message:'Network error — unable to reach Supabase.' };
    return { errorType:'unknown', message: msg.slice(0, 200) || 'Unexpected error.' };
  }
  const msg = String(error?.message || '');
  if (/permission denied|system\.health required/i.test(msg)) return { errorType:'permission', message:'Permission denied — system.health required.' };
  if (/jwt|session|not authenticated|auth session missing/i.test(msg)) return { errorType:'session_expired', message:'Session expired — please sign in again.' };
  if (/fetch|network/i.test(msg)) return { errorType:'network', message:'Network error — unable to reach Supabase.' };
  return { errorType:'unknown', message: msg.slice(0, 200) || 'Unexpected error.' };
}

// Database check target: the caller times this exact round trip
// (admin_health_ping() over PostgREST) — success + elapsed time IS the
// real database/API latency, not a simulated one.
async function sbAdminHealthPing() {
  if (!_sb) return { ok:false, errorType:'network', message:'Supabase not configured' };
  try {
    const { data, error } = await _sb.rpc('admin_health_ping');
    if (error) return { ok:false, ..._classifyHealthError(error) };
    return { ok:true, data };
  } catch (e) {
    return { ok:false, ..._classifyHealthError(null, e) };
  }
}

// auth.getUser() makes a real round trip to Supabase Auth to validate
// the current JWT server-side (unlike getSession(), which only reads
// the locally cached token) — a genuine Auth-service availability
// check, and it also surfaces an expired/invalid session as an error.
async function sbAdminCheckAuthService() {
  if (!_sb) return { ok:false, errorType:'network', message:'Supabase not configured' };
  try {
    const { data, error } = await _sb.auth.getUser();
    if (error) return { ok:false, ..._classifyHealthError(error) };
    if (!data?.user) return { ok:false, errorType:'session_expired', message:'No active session.' };
    return { ok:true };
  } catch (e) {
    return { ok:false, ..._classifyHealthError(null, e) };
  }
}

// Lists (not downloads) the 'categories' bucket — public, non-sensitive
// — so this never exposes private files (kyc-documents, seller-files, …).
async function sbAdminCheckStorageService() {
  if (!_sb) return { ok:false, errorType:'network', message:'Supabase not configured' };
  try {
    const { data, error } = await _sb.storage.from('categories').list('', { limit: 1 });
    if (error) return { ok:false, ..._classifyHealthError(error) };
    return { ok:true };
  } catch (e) {
    return { ok:false, ..._classifyHealthError(null, e) };
  }
}

// Invokes the dedicated health-check Edge Function (see
// supabase/functions/health-check) rather than any real, consequential
// function (send-email, on-new-order, …) — this one does nothing but
// confirm it was reached and can do real work via the caller's own JWT.
async function sbAdminCheckEdgeFunctions() {
  if (!_sb) return { ok:false, errorType:'network', message:'Supabase not configured' };
  try {
    const { data, error } = await _sb.functions.invoke('health-check');
    if (error) {
      const status = error?.context?.status;
      if (status === 403) return { ok:false, errorType:'permission', message:'Permission denied — system.health required.' };
      if (status === 401) return { ok:false, errorType:'session_expired', message:'Session expired — please sign in again.' };
      return { ok:false, ..._classifyHealthError(error) };
    }
    return { ok:true, data };
  } catch (e) {
    return { ok:false, ..._classifyHealthError(null, e) };
  }
}

// Opens a real, disposable Realtime channel and waits for the actual
// 'SUBSCRIBED' confirmation from the server — never reports realtime
// as active without that confirmation. Always cleans up the channel.
async function sbAdminCheckRealtime(timeoutMs = 6000) {
  if (!_sb) return { ok:false, errorType:'network', message:'Supabase not configured' };
  return new Promise((resolve) => {
    let settled = false;
    const channel = _sb.channel(`health-check-${Date.now()}`);
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { _sb.removeChannel(channel); } catch (e) {}
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok:false, errorType:'timeout', message:'Realtime did not confirm a subscription in time.' }), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') finish({ ok:true });
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        finish({ ok:false, errorType: status === 'TIMED_OUT' ? 'timeout' : 'unknown', message: `Realtime channel reported: ${status}` });
      }
    });
  });
}

// p_results: array of { service, status, latency_ms, message } objects
// built from the real checks above — the RPC itself re-validates every
// field before writing (see phase9_health_section_migration.sql).
async function sbAdminRecordHealthCheck(results) {
  if (!_sb) return { data:null, error:{ message:'Supabase not configured' } };
  const { data, error } = await _sb.rpc('admin_record_health_check', { p_results: results });
  return { data, error };
}

async function sbAdminGetHealthHistory(limit = 50) {
  if (!_sb) return [];
  const { data, error } = await _sb.rpc('admin_get_health_history', { p_limit: limit });
  if (error) return [];
  return data ?? [];
}

// ─── ADMIN — Owner Vault ────────────────────────────────────────────
// is_owner() is a deliberately separate, narrower gate than
// has_permission() — every admin bypasses every permission key, so
// routing Owner-only access through the normal permission system
// cannot work here (see phase9_owner_vault_migration.sql). This wraps
// am_i_owner(), which only ever answers for the caller's own account.
async function sbAmIOwner() {
  if (!_sb) return false;
  const { data, error } = await _sb.rpc('am_i_owner');
  return !error && data === true;
}

async function sbAdminGetOwnerVaultOverview() {
  if (!_sb) return { data: null, error: { message: 'Supabase not configured' } };
  const { data, error } = await _sb.rpc('admin_get_owner_vault_overview');
  return { data, error };
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
  sbGetProducts, sbGetProduct, sbSearchProducts, sbGetSimilarProducts,
  sbGetProductAttributeValues, sbSetProductAttributeValues, sbSuggestCategory,
  sbGetShops, sbGetShop, sbGetShopByName, sbGetShopReviews,
  sbGetActiveFlashDeals, sbAdminGetFlashDeals, sbAdminSearchProductsForFlashDeal,
  sbAdminSetFlashDeal, sbAdminRemoveFlashDeal,
  sbGetBanners, sbUpsertBanner, sbDeleteBanner, sbGetSignupBanner,
  sbGetCart, sbUpsertCartItem, sbClearCart, sbAddToCart, sbMergeGuestCartIntoAccount,
  sbGetProductVariants, sbUpsertProductVariant, sbDeleteProductVariant,
  sbAdminGetInventory, sbAdminGetInventorySettings, sbAdminUpdateInventorySettings,
  sbAdminReleaseExpiredReservations, sbAdminValidateReturnAndRestock,
  sbCreateOrder, sbGetOrder, sbGetOrders, sbCancelOrder,
  sbGetOrderShipments, computeOrderFulfillmentStatus,
  sbRecordPaymentAttempt, sbRequestRefund, sbGetMyRefundRequests,
  sbAdminGetPaymentIntents, sbAdminConfirmPayment,
  sbAdminGetRefundRequests, sbAdminInitiateRefund, sbAdminDecideRefund, sbAdminRecordRefundResult,
  sbAdminGetCommissionLedger,
  sbGetConversations, sbGetConversation, sbGetMessages, sbSendMessage,
  sbSubscribeToMessages, sbMarkConversationRead, sbGetOrCreateConversation,
  sbSubscribeToConversations,
  sbGetOffersForConversation, sbCreatePriceOffer, sbRespondToOffer, sbSubscribeToOffers,
  sbReportUser, sbBlockUser, sbUnblockUser, sbGetMyBlockedUsers,
  sbAdminGetTrustSafetyStats, sbAdminGetReports, sbAdminReviewReport,
  sbAdminGetUserViolations, sbAdminApplyViolation, sbAdminGetModerationLog,
  sbAdminGetReviews, sbAdminModerateReview, sbAdminGetSupportTickets, sbAdminUpdateSupportTicket,
  sbAdminGetCoupons, sbAdminCreateCoupon, sbAdminUpdateCoupon, sbAdminDeleteCoupon,
  sbAdminGetPlatformSettings, sbAdminSetPlatformSetting, sbAdminGetCommissionRate, sbAdminSetCommissionRate,
  sbGetWishlist, sbAddToWishlist, sbRemoveFromWishlist, sbGetWishlistCount,
  sbGetSellerWalletSummary, sbGetMyWithdrawals, sbSellerRequestWithdrawal,
  sbAdminGetWithdrawalRequests, sbAdminDecideWithdrawal,
  sbGetNotifications, sbMarkNotificationRead,
  sbGetSellerStats, sbGetSellerOrders,
  sbGetSellerShipments, sbSellerCreateShipment, sbSellerUpdateShipment, sbSellerReportDeliveryFailure,
  sbAdminGetShipments, sbAdminGetCarriersList, sbAdminOverrideShipment,
  sbAdminGetStats, sbAdminGetSalesTimeseries, sbSubscribeAdminOrders,
  sbAdminGetOrders, sbAdminGetOrderDetail, sbAdminUpdateOrderStatus, ORDER_STATUSES,
  sbAdminGetKycRequests, sbAdminGetKycRequest, sbAdminGetKycDocUrl, sbAdminReviewKyc,
  sbGetMyKyc, sbSubmitKyc, sbResubmitKyc,
  sbAdminGetUsers, sbAdminUpdateUser,
  sbAdminCreateProduct, sbAdminUpdateProduct, sbAdminDeleteProduct,
  sbAdminGetProducts, sbAdminModerateProduct, sbAdminTogglePublish, sbSubscribeAdminProducts,
  sbGetMyShop, sbUpdateShop, sbSellerCreateProduct,
  sbGetCategoriesList,
  sbGetMyAccessContext, sbHasPermission, sbGetPermissionsCatalog,
  sbAdminGetStaffRoles, sbAdminCreateStaffRole, sbAdminUpdateStaffRole, sbAdminDeleteStaffRole, sbAdminSetRolePermissions,
  sbAdminGetStaffMembers, sbAdminFindUserByEmail, sbAdminAddStaffMember, sbAdminUpdateStaffMember, sbAdminRemoveStaffMember,
  sbAdminSetAccountStatus, sbLogAudit, sbAdminGetAuditLogs, sbAdminExportCatalog, sbAdminSendBroadcast,
  sbGetCategoryTree, sbGetCategoryBySlug, sbGetCategoryBreadcrumb, sbGetFeaturedCategories,
  sbGetCategoryAttributes, sbGetProductsByCategory,
  sbAdminGetCategories, sbAdminGetCategory, sbAdminCreateCategory, sbAdminUpdateCategory,
  sbAdminSetCategoryStatus, sbAdminBulkCategoryStatus, sbAdminMoveCategory, sbAdminDeleteCategory,
  sbAdminSaveCategoryAttribute, sbAdminDeleteCategoryAttribute,
  sbGetProductCategories, sbSetProductCategories, sbSubscribeAdminCategories,
  sbGetActiveBrands, sbAdminGetBrands, sbAdminGetBrand, sbAdminCreateBrand, sbAdminUpdateBrand,
  sbAdminSetBrandStatus, sbAdminDeleteBrand, sbSubscribeAdminBrands,
  sbRequestBrand, sbGetMyBrandRequests, sbAdminGetBrandRequests, sbAdminDecideBrandRequest,
  sbUploadAuthenticityProof, sbAdminGetAuthenticityProofUrl,
  sbUploadFile,
  sbAdminHealthPing, sbAdminCheckAuthService, sbAdminCheckStorageService,
  sbAdminCheckEdgeFunctions, sbAdminCheckRealtime,
  sbAdminRecordHealthCheck, sbAdminGetHealthHistory,
  sbAmIOwner, sbAdminGetOwnerVaultOverview,
  sbGetMyAdminNotificationPrefs, sbSetMyAdminNotificationPref,
  sbGetHomepageFeaturedShops, sbAdminSetHomepageFeaturedShops, sbAdminSearchShops,
  sbGetHomepageConfig, sbAdminSetHomepageConfig,
  _isConfigured,
});
