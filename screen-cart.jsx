// screen-cart.jsx — Cart + Checkout (redesigned per reference image)

// ─── CART ────────────────────────────────────────────────────
// Guest cart: the existing local window.CART_ITEMS, unchanged.
function cartItemsFromGlobal() {
  return (window.CART_ITEMS || []).map(ci => ({
    id: ci.product.id,
    productId: ci.product.id, variantId: null, variantObj: null,
    name: ci.product.title,
    variant: ci.variant || '',
    price: Number(ci.product.price) || 0,
    oldPrice: ci.product.oldPrice != null ? Number(ci.product.oldPrice) : null,
    qty: ci.qty,
    inStock: true,
    seller: ci.seller || ci.product.seller || '',
    checked: true,
    _product: ci.product,
  }));
}

// Logged-in cart: the real Supabase cart_items — the exact same table
// create_order() reads at checkout. This is what was missing before: Product
// Details already persisted here for signed-in buyers, but this screen never
// read it back, so a signed-in buyer's cart page could show empty or stale
// data even though checkout (which queries cart_items directly, not this
// screen's state) would have worked correctly on the real data all along.
function cartItemsFromRows(rows) {
  return (rows || []).map(row => ({
    id: row.id, // cart_items row id — stable per product+variant combination
    productId: row.product_id, variantId: row.variant_id, variantObj: row.variant,
    name: row.products?.title || '',
    variant: row.variant?.size || row.variant?.color || '',
    price: Number(row.unit_price) || 0,
    oldPrice: row.products?.compare_price != null ? Number(row.products.compare_price) : null,
    qty: row.quantity,
    inStock: true,
    seller: row.products?.shops?.name || '',
    checked: true,
    _product: row.products,
  }));
}

function CartScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [userId, setUserId] = React.useState(undefined); // undefined = still checking, null = guest
  const [items, setItems] = React.useState(() => cartItemsFromGlobal());
  const [promoCode, setPromoCode]   = React.useState('');
  const [promoApplied, setPromoApplied] = React.useState(false);

  // Cart-load state — separate from `items` so a failed reload never has to
  // be confused with "confirmed empty". `cartLoadError` is the real Supabase
  // error object (never discarded); `hasLoadedCartOnce` tracks whether we've
  // ever gotten a *successful* response for this signed-in user, so the
  // empty-cart screen only ever renders once a real, error-free response
  // confirmed there is nothing in it — never on a network/Supabase failure.
  const [cartLoading, setCartLoading] = React.useState(false);
  const [cartLoadError, setCartLoadError] = React.useState(null);
  const [hasLoadedCartOnce, setHasLoadedCartOnce] = React.useState(false);

  function loadCart(uid) {
    setCartLoading(true);
    setCartLoadError(null);
    return sbGetCart(uid).then(({ data, error }) => {
      setCartLoading(false);
      if (error) {
        // Never interpret a Supabase error as "cart is empty" — keep whatever
        // items are already on screen (possibly none yet, if this is the
        // very first load) and surface the error instead.
        setCartLoadError(error);
        return;
      }
      setHasLoadedCartOnce(true);
      setItems(cartItemsFromRows(data));
    }).catch(err => {
      setCartLoading(false);
      setCartLoadError(err || { message: 'Network error' });
    });
  }

  React.useEffect(() => {
    sbGetUser().then(u => {
      const uid = u?.id || null;
      setUserId(uid);
      if (uid) loadCart(uid);
    });
  }, []);

  // Guest-only: keep window.CART_ITEMS (what every other screen's quick-add
  // reads/writes) in sync with this screen's own edits. For a signed-in
  // buyer, `items` already comes from — and every edit below writes straight
  // back to — the real cart_items table, so window.CART_ITEMS is left alone.
  React.useEffect(() => {
    if (userId) return;
    window.CART_ITEMS = items.map(i => ({
      product: i._product || { id:i.id, title:i.name, price:i.price, oldPrice:i.oldPrice, seller:i.seller },
      qty: i.qty, variant: i.variant, seller: i.seller,
    }));
  }, [items, userId]);

  const checkedItems  = items.filter(i => i.checked);
  const subtotal      = checkedItems.reduce((s, i) => s + i.price * i.qty, 0);
  const discount      = promoApplied ? Math.round(subtotal * 0.1) : 0;
  const total         = subtotal - discount;
  const allChecked    = items.every(i => i.checked);

  function toggleAll() {
    setItems(prev => prev.map(i => ({ ...i, checked: !allChecked })));
  }
  function toggleItem(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  // actionError: last failed write, shown as a dismissible banner.
  // pendingIds: item ids with a write currently in flight — their row's
  // controls are disabled so a second click can't fire a second write for
  // the same item while the first hasn't been confirmed yet.
  const [actionError, setActionError] = React.useState('');
  const [pendingIds, setPendingIds] = React.useState(() => new Set());
  function setPending(id, on) {
    setPendingIds(prev => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  // Signed-in: persist straight to the real cart via the existing
  // sbUpsertCartItem (qty<=0 already deletes the row there) — never touches
  // product/variant stock or reservations, only ever reads a variant's
  // availability (unchanged, pre-existing check inside sbUpsertCartItem).
  // The UI only shows the new quantity once that write actually succeeds; on
  // failure (including a stock refusal) the previous, real quantity is
  // restored and the failure is surfaced instead of being left invisible.
  // Guest: unchanged, local-only, no server round trip to wait for.
  async function updateQty(id, qty) {
    if (qty <= 0) return removeItem(id);
    if (pendingIds.has(id)) return; // a write for this item is already in flight
    const item = items.find(i => i.id === id);
    if (!item) return;
    const prevItems = items;
    setPending(id, true);
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
    if (userId) {
      const { error } = await sbUpsertCartItem(userId, item.productId, item.variantObj || {}, qty, item.price, item.variantId);
      if (error) {
        setItems(prevItems);
        setActionError(error.message || "Couldn't update the quantity — please try again.");
        setPending(id, false);
        return;
      }
    }
    setActionError('');
    setPending(id, false);
  }
  async function removeItem(id) {
    if (pendingIds.has(id)) return;
    const item = items.find(i => i.id === id);
    if (!item) return;
    const prevItems = items;
    setPending(id, true);
    setItems(prev => prev.filter(i => i.id !== id));
    if (userId) {
      const { error } = await sbUpsertCartItem(userId, item.productId, item.variantObj || {}, 0, item.price, item.variantId);
      if (error) {
        setItems(prevItems);
        setActionError(error.message || "Couldn't remove this item — please try again.");
        setPending(id, false);
        return;
      }
    }
    setActionError('');
    setPending(id, false);
  }
  function toggleWishlist(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, wishlisted: !i.wishlisted } : i));
  }
  // Removes only the checked items — unchecked items are left untouched,
  // whether the writes below succeed or not.
  async function clearSelected() {
    const removed = items.filter(i => i.checked);
    if (!removed.length || removed.some(i => pendingIds.has(i.id))) return;
    const prevItems = items;
    removed.forEach(i => setPending(i.id, true));
    setItems(prev => prev.filter(i => !i.checked));
    if (userId) {
      const results = await Promise.all(removed.map(item =>
        sbUpsertCartItem(userId, item.productId, item.variantObj || {}, 0, item.price, item.variantId)
      ));
      removed.forEach(i => setPending(i.id, false));
      const failed = results.find(r => r?.error);
      if (failed) {
        setItems(prevItems); // at least one write failed — restore the real, confirmed state
        setActionError(failed.error.message || "Couldn't clear some items — please try again.");
        return;
      }
    } else {
      removed.forEach(i => setPending(i.id, false));
    }
    setActionError('');
  }

  const [youMayLike, setYouMayLike] = React.useState(null); // null = loading, [] = none/error
  React.useEffect(() => {
    const excludeIds = new Set(items.map(i => i.productId).filter(Boolean));
    sbGetSimilarProducts({ limit: 8 })
      .then(({ data }) => setYouMayLike((data || []).filter(p => !excludeIds.has(p.id)).slice(0, 6).map(_withCardFields)))
      .catch(() => setYouMayLike([]));
    // Re-run only when the set of cart products changes, not on every qty/checked edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.productId).join(',')]);

  function goToCheckout() {
    navigate('checkout', { items: checkedItems, subtotal, discount, total });
  }

  // Signed-in and still waiting for the very first cart read: show a loading
  // state, never the empty-cart screen — we don't yet know if there's
  // anything in the cart.
  if (userId && cartLoading && !hasLoadedCartOnce) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0, padding:`${STATUS_H + 10}px 20px 12px` }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Cart</div>
        </div>
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Loading your cart…</div>
        </div>
      </div>
    );
  }

  // Signed-in, the very first load failed: we genuinely don't know what's in
  // the cart, so this is never shown as "empty" — a real error screen with a
  // retry action instead. Nothing here was ever cleared.
  if (userId && cartLoadError && !hasLoadedCartOnce) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0, padding:`${STATUS_H + 10}px 20px 12px` }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Cart</div>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:14 }}>
          <div style={{ width:88, height:88, borderRadius:9999, background:'#FDEDED', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="alertTriangle" size={36} color={C.danger} />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink }}>Couldn't load your cart</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:280 }}>{cartLoadError.message || 'Something went wrong while loading your cart. Your items are safe — please try again.'}</div>
          <Btn variant="primary" size="md" onClick={() => loadCart(userId)} style={{ marginTop:8, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
            Try Again
          </Btn>
        </div>
        <BottomNav active={2} onTab={(i) => {
          if (i === 0) navigate('home');
          else if (i === 1) navigate('categories');
          else if (i === 3) navigate('tracking');
          else if (i === 4) navigate('profile');
        }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0, padding:`${STATUS_H + 10}px 20px 12px` }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Cart (0)</div>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:14 }}>
          <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="cart" size={40} color={C.primary} />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink }}>Your cart is empty</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:260 }}>Looks like you haven't added anything yet. Start exploring and fill it up!</div>
          <Btn variant="primary" size="md" onClick={() => navigate('home')} style={{ marginTop:8, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
            Start Shopping
          </Btn>
        </div>
        <BottomNav active={2} onTab={(i) => {
          if (i === 0) navigate('home');
          else if (i === 1) navigate('categories');
          else if (i === 3) navigate('tracking');
          else if (i === 4) navigate('profile');
        }} />
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0 }}>
        {!isDesktop && (
        <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div onClick={() => navigate('home')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <div style={{ width:28, height:28, borderRadius:9, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="shoppingBag" size={15} color="#fff" sw={2} />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>CLORIVO</span>
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <button onClick={() => navigate('wishlist')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="heart" size={22} color={C.mute} />
            </button>
            <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <Icon name="cart" size={22} color={C.ink} />
              <Badge count={checkedItems.length} />
            </button>
          </div>
        </div>
        )}

        {/* Title */}
        <div style={{ padding: isDesktop ? '24px 32px 12px' : '0 20px 12px', maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Cart ({items.length})</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2 }}>{items.length} item{items.length > 1 ? 's' : ''} in your cart</div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 80 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '0 32px' : undefined, display: isDesktop ? 'flex' : 'block', gap: isDesktop ? 32 : 0, alignItems: 'flex-start' }}>
        <div style={{ flex: isDesktop ? '1 1 auto' : undefined, minWidth: 0 }}>

        {/* Free shipping banner */}
        <div style={{ margin:'10px 16px', background:C.primarySoft, borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <Icon name="truck" size={18} color={C.primary} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primaryDeep }}>Congratulations! You've got free shipping 🎉</span>
        </div>

        {/* Last failed cart write (quantity/remove/clear) — shown until the
            next successful write, so the user always knows when the screen
            doesn't yet reflect what's actually been saved. */}
        {actionError && (
          <div style={{ margin:'0 16px 10px', background:'#FDEDED', border:'1px solid #F6C9C9', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="alertTriangle" size={16} color={C.danger} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger, flex:1 }}>{actionError}</span>
            <button onClick={() => setActionError('')} style={{ border:'none', background:'none', cursor:'pointer', padding:2, display:'flex' }}>
              <Icon name="x" size={14} color={C.danger} />
            </button>
          </div>
        )}

        {/* Select all row */}
        <div style={{ padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={toggleAll}>
            <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${allChecked ? C.primary : C.hairline}`, background: allChecked ? C.primary : C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
              {allChecked && <Icon name="check" size={12} color="#fff" sw={3} />}
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink }}>Select all ({items.length})</span>
          </label>
          <button onClick={clearSelected} disabled={!checkedItems.length || checkedItems.some(i => pendingIds.has(i.id))} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor: checkedItems.length ? 'pointer' : 'default', opacity: (checkedItems.length && !checkedItems.some(i => pendingIds.has(i.id))) ? 1 : 0.4 }}>
            <Icon name="x" size={14} color={C.danger} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.danger }}>Clear</span>
          </button>
        </div>

        {/* Product items */}
        <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:0 }}>
          {items.map((item, idx) => (
            <div key={item.id} style={{ background:C.white, marginBottom:8, borderRadius:14, padding:'12px', display:'flex', gap:10, alignItems:'flex-start', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
              {/* Checkbox */}
              <div onClick={() => toggleItem(item.id)} style={{ width:20, height:20, borderRadius:5, border:`2px solid ${item.checked ? C.primary : C.hairline}`, background: item.checked ? C.primary : C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:18, cursor:'pointer', transition:'all 0.15s' }}>
                {item.checked && <Icon name="check" size={11} color="#fff" sw={3} />}
              </div>
              {/* Product image */}
              <div style={{ width:80, height:80, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
                <Img label="" tint={idx % 5} style={{ width:80, height:80 }} />
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, paddingRight:8 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, lineHeight:1.3, marginBottom:2 }}>{item.name}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:6 }}>{item.variant}</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:5 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</span>
                      {item.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, textDecoration:'line-through' }}>${item.oldPrice.toFixed(2)}</span>}
                    </div>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, background: item.inStock ? '#ECFDF5' : '#FFFBEB', borderRadius:6, padding:'2px 8px', marginBottom:8 }}>
                      <div style={{ width:6, height:6, borderRadius:9999, background: item.inStock ? C.success : C.warning }} />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color: item.inStock ? C.success : C.warning }}>{item.inStock ? 'In Stock' : 'Limited Stock'}</span>
                    </div>
                    {/* Qty stepper — disabled while a write for this item is in flight,
                        so a second tap can't fire a second (racing) write before the
                        first one is confirmed. */}
                    <div style={{ display:'flex', alignItems:'center', gap:0, border:`1.5px solid ${C.hairline}`, borderRadius:9999, width:'fit-content', opacity: pendingIds.has(item.id) ? 0.5 : 1 }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} disabled={pendingIds.has(item.id)} style={{ width:30, height:30, border:'none', background:'none', cursor: pendingIds.has(item.id) ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:16 }}>−</button>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} disabled={pendingIds.has(item.id)} style={{ width:30, height:30, border:'none', background:'none', cursor: pendingIds.has(item.id) ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:16 }}>+</button>
                    </div>
                  </div>
                  {/* Right icons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
                    <button onClick={() => removeItem(item.id)} disabled={pendingIds.has(item.id)} style={{ width:30, height:30, border:'none', background:'none', cursor: pendingIds.has(item.id) ? 'default' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: pendingIds.has(item.id) ? 0.5 : 1 }}>
                      <Icon name="x" size={18} color={C.mute} />
                    </button>
                    <button onClick={() => toggleWishlist(item.id)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name={item.wishlisted ? 'heartFill' : 'heart'} size={18} color={item.wishlisted ? C.danger : C.mute} filled={item.wishlisted} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* You may also like — real catalog products (sbGetSimilarProducts),
            excluding what's already in the cart. Hidden entirely while
            loading or when nothing qualifies, never backfilled with
            fictitious items. */}
        {(youMayLike === null || youMayLike.length > 0) && (
        <div style={{ padding:'10px 16px 0' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink, marginBottom:12 }}>You may also like</div>
          {youMayLike === null ? (
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:110, height:160, flexShrink:0, borderRadius:12, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
            </div>
          ) : (
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
            {youMayLike.map((p, i) => (
              <div key={p.id} style={{ width:110, flexShrink:0, display:'flex', flexDirection:'column', gap:6 }}>
                <div onClick={() => navigate('pdp',{product:p})} style={{ width:110, height:110, borderRadius:12, overflow:'hidden', cursor:'pointer' }}>
                  <Img label="" src={p.image_url || p.images?.[0]} tint={(i+2)%5} style={{ width:110, height:110 }} />
                </div>
                <div onClick={() => navigate('pdp',{product:p})} style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.ink, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', cursor:'pointer' }}>{p.title}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${p.price.toFixed(2)}</span>
                  <button onClick={() => { sbAddToCart({ userId, product: p, qty: 1, price: p.price, mode: 'increment' }); }} style={{ width:26, height:26, borderRadius:9999, background:C.primary, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="plus" size={14} color="#fff" sw={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
        )}

        </div>

        {/* Order summary — sidebar on desktop */}
        {isDesktop && (
          <div style={{ width:340, flexShrink:0, position:'sticky', top:16, background:C.white, borderRadius:16, padding:20, boxShadow:'0 2px 16px rgba(14,11,31,0.08)' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink, marginBottom:14 }}>Order Summary</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Subtotal ({checkedItems.length} items)</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.ink }}>${subtotal.toLocaleString()}</span>
            </div>
            {discount > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.success }}>Discount</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.success }}>-${discount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Taxes</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Calculated at checkout</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, paddingTop:10, borderTop:`1px solid ${C.hairline}` }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Total</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:C.primary }}>${total.toLocaleString()}</span>
            </div>
            <Btn variant="primary" size="md" wide onClick={() => goToCheckout()} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
              <Icon name="lock" size={14} color="#fff" />
              Proceed to Checkout
            </Btn>
          </div>
        )}
        </div>
      </div>

      {/* Sticky bottom CTA — mobile only */}
      {!isDesktop && (
      <div style={{ position:'absolute', bottom: NAV_H + HOME_H - 12, left:0, right:0, padding:'10px 16px', background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Total ({checkedItems.length} items)</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:800, color:C.primary }}>${total.toLocaleString()}</div>
        </div>
        <Btn variant="primary" size="md" style={{ flex:1, maxWidth:220, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }} onClick={() => goToCheckout()}>
          <Icon name="lock" size={14} color="#fff" />
          Proceed to Checkout
        </Btn>
      </div>
      )}

      <BottomNav active={2} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 1) navigate('categories');
        else if (i === 3) navigate('tracking');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}


Object.assign(window, { CartScreen });
