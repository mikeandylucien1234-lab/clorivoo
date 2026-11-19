// screen-store.jsx — Public Seller Store Page
// Real data only: the shop itself (sbGetShop/sbGetShopByName), its real
// banners (already nested inside sbGetShop's own select), its real published
// products (sbSearchProducts scoped to shop_id), and its real reviews
// (sbGetShopReviews). No fictitious seller, banner, category, or review is
// ever shown — a field with no real data behind it is simply not rendered.

const SORTS = [
  { key:'popular', label:'Popular', api:'popular' },
  { key:'newest',  label:'Latest', api:'newest' },
  { key:'price_low', label:'Lowest Price', api:'price_low' },
  { key:'price_high', label:'Highest Price', api:'price_high' },
  { key:'rating', label:'Top Rated', api:'rating' },
];

// ─── ANNOUNCEMENT MARQUEE — only rendered when the shop has a real ticker ──
function AnnouncementBar({ text }) {
  const [paused, setPaused] = React.useState(false);
  const { navigate } = useNav();
  return (
    <div
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)} onTouchEnd={() => setTimeout(() => setPaused(false), 1500)}
      onClick={() => navigate('notifications')}
      style={{ background:`linear-gradient(135deg, ${C.primaryDeep} 0%, ${C.primary} 100%)`, overflow:'hidden', padding:'8px 0', cursor:'pointer', flexShrink:0 }}
    >
      <div style={{ display:'flex', width:'max-content', animation: paused ? 'none' : 'marquee 16s linear infinite' }}>
        {[0,1].map(i => (
          <span key={i} style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:'#fff', whiteSpace:'nowrap', paddingRight:40 }}>{text}</span>
        ))}
      </div>
    </div>
  );
}

// ─── BANNER CAROUSEL — real shop_banners rows only ─────────────────────
function BannerCarousel({ banners }) {
  const active = (banners || []).filter(b => b.is_active !== false);
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const dragRef = React.useRef({ startX:0, dragging:false });
  const { navigate } = useNav();

  React.useEffect(() => {
    if (paused || active.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % active.length), 4000);
    return () => clearInterval(t);
  }, [paused, active.length]);

  function resumeSoon() { setPaused(true); setTimeout(() => setPaused(false), 3500); }

  function onPointerDown(e) { dragRef.current = { startX: e.clientX, dragging:true }; setPaused(true); }
  function onPointerUp(e) {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    if (dx < -40) setIndex(i => (i + 1) % active.length);
    else if (dx > 40) setIndex(i => (i - 1 + active.length) % active.length);
    dragRef.current.dragging = false;
    resumeSoon();
  }

  if (active.length === 0) return null;

  return (
    <div style={{ position:'relative', padding:'12px 16px 0' }}>
      <div
        onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={() => dragRef.current.dragging && onPointerUp({ clientX: dragRef.current.startX })}
        style={{ position:'relative', height:120, borderRadius:16, overflow:'hidden', touchAction:'pan-y', cursor:'grab' }}
      >
        {active.map((b, i) => (
          <div key={b.id} onClick={() => i === index && b.cta_url && navigate('categories')} style={{ position:'absolute', inset:0, opacity: i === index ? 1 : 0, transition:'opacity 0.4s ease', pointerEvents: i === index ? 'auto' : 'none' }}>
            <Img label="" src={b.image_url} tint={i % 5} style={{ width:'100%', height:'100%' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(14,11,31,0.55) 0%, rgba(14,11,31,0.05) 70%)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 18px' }}>
              {b.title && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:'#fff' }}>{b.title}</span>}
              {b.subtitle && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.9)', marginTop:2 }}>{b.subtitle}</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'center', gap:5, marginTop:8 }}>
        {active.map((b, i) => (
          <button key={b.id} onClick={() => { setIndex(i); resumeSoon(); }} style={{ width: i === index ? 16 : 6, height:6, borderRadius:9999, border:'none', background: i === index ? C.primary : C.hairline, cursor:'pointer', transition:'width 0.2s' }} />
        ))}
      </div>
    </div>
  );
}

// ─── RATING STARS (compact) ───────────────────────────────────
function StarRow({ rating, size=12 }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <Icon key={i} name="star" size={size} color={i <= Math.round(rating) ? '#F59E0B' : C.hairline} filled={i <= Math.round(rating)} />
      ))}
    </div>
  );
}

// Real rating breakdown computed from the shop's own reviews — all zero
// (not invented) when there are no reviews yet.
function computeRatingBreakdown(reviews) {
  const total = reviews.length;
  return [5,4,3,2,1].map(stars => {
    const count = reviews.filter(r => r.rating === stars).length;
    return { stars, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

// ─── SELLER STORE PAGE ─────────────────────────────────────────
function SellerStoreScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();

  const [userId, setUserId] = React.useState(null);
  React.useEffect(() => { sbGetUser().then(u => setUserId(u?.id || null)); }, []);

  // shop: undefined = resolving, null = genuinely not found, object = found.
  const [shop, setShop] = React.useState(undefined);
  React.useEffect(() => {
    let cancelled = false;
    async function resolve() {
      let s = null;
      if (params.shopId) s = await sbGetShop(params.shopId);
      if (!s && params.shopName) s = await sbGetShopByName(params.shopName);
      if (!cancelled) setShop(s || null);
    }
    resolve();
    return () => { cancelled = true; };
  }, [params.shopId, params.shopName]);

  const [tab, setTab] = React.useState('home');
  const [following, setFollowing] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const [sortKey, setSortKey] = React.useState('popular');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({ categoryId:'all', maxPrice:1000, discountOnly:false });
  const [catFilter, setCatFilter] = React.useState('all');
  const [visibleCount, setVisibleCount] = React.useState(6);
  const [reviewCount, setReviewCount] = React.useState(3);

  React.useEffect(() => {
    setFollowing((window._FOLLOWED_SHOPS || []).includes(shop?.id));
  }, [shop?.id]);

  // products: null = loading, [] = none/error — real published products of
  // this exact shop only (shop_id-scoped, active + approved, same catalog
  // rules as every other buyer-facing listing).
  const [products, setProducts] = React.useState(null);
  React.useEffect(() => {
    if (!shop?.id) return;
    setProducts(null);
    const apiSort = SORTS.find(s => s.key === sortKey)?.api || 'popular';
    sbSearchProducts({ shopId: shop.id, sort: apiSort, limit: 60 })
      .then(({ data }) => setProducts((data || []).map(_withCardFields)))
      .catch(() => setProducts([]));
  }, [shop?.id, sortKey]);

  // reviews: null = loading, [] = none/error — real reviews for this seller.
  const [reviews, setReviews] = React.useState(null);
  React.useEffect(() => {
    if (!shop?.seller_id) return;
    sbGetShopReviews(shop.seller_id).then(({ data }) => setReviews(data || [])).catch(() => setReviews([]));
  }, [shop?.seller_id]);

  function toggleFollow() {
    if (!shop) return;
    const list = window._FOLLOWED_SHOPS || (window._FOLLOWED_SHOPS = []);
    if (following) {
      window._FOLLOWED_SHOPS = list.filter(id => id !== shop.id);
      setToast({ type:'success', message:`Unfollowed ${shop.name}` });
    } else {
      window._FOLLOWED_SHOPS = [...list, shop.id];
      setToast({ type:'success', message:`Now following ${shop.name}` });
    }
    setFollowing(f => !f);
  }
  async function addToCart(p) {
    const { error } = await sbAddToCart({ userId, product: p, qty: 1, price: p.price, mode: 'increment' });
    if (error) { setToast({ type:'error', message: error.message || 'Could not add this to your cart.' }); return; }
    setToast({ type:'success', message:`${p.title} added to cart` });
  }

  // Real categories — derived from this shop's own real products, never a
  // separate/fictitious category list.
  const categories = React.useMemo(() => {
    const byId = new Map();
    (products || []).forEach(p => {
      if (!p.categories?.id) return;
      const row = byId.get(p.categories.id) || { key: p.categories.id, label: p.categories.name, count: 0 };
      row.count += 1;
      byId.set(p.categories.id, row);
    });
    return [...byId.values()];
  }, [products]);

  const safeProducts = products || [];
  let filteredProducts = safeProducts.filter(p =>
    (filters.categoryId === 'all' || p.categories?.id === filters.categoryId) &&
    p.price <= filters.maxPrice &&
    (!filters.discountOnly || p.discount)
  );
  if (catFilter !== 'all') filteredProducts = filteredProducts.filter(p => p.categories?.id === catFilter);
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const ratingBreakdown = React.useMemo(() => computeRatingBreakdown(reviews || []), [reviews]);

  const tabs = [
    { key:'home', label:'Home' },
    { key:'products', label:'All Products' },
    { key:'categories', label:'Categories' },
    { key:'reviews', label:`Reviews${shop ? ` (${shop.reviews_count ?? 0})` : ''}` },
    { key:'about', label:'About' },
  ];

  // ── Loading (resolving which shop this is) ──
  if (shop === undefined) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:'90%', maxWidth:400, borderRadius:20, height:170, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
        </div>
      </div>
    );
  }

  // ── Genuinely not found ──
  if (shop === null) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24 }}>
        <Icon name="store" size={40} color={C.mute} />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>Store not found</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:280 }}>This seller's store couldn't be found. It may have been removed or the link is incorrect.</div>
        <Btn variant="primary" onClick={() => navigate('home')}>Back to Home</Btn>
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0 }}>
        {!isDesktop && (
          <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button onClick={goBack} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="arrowLeft" size={20} color={C.ink} />
              </button>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{shop.name}</span>
            </div>
            <div style={{ display:'flex', gap:2, alignItems:'center' }}>
              <button onClick={() => navigate('search')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="search" size={20} color={C.ink} />
              </button>
              <button onClick={() => navigate('cart')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <Icon name="cart" size={21} color={C.ink} />
                <Badge count={(window.CART_ITEMS || []).length} />
              </button>
            </div>
          </div>
        )}
      </div>

      {shop.ticker_active && shop.ticker_text && <AnnouncementBar text={shop.ticker_text} />}

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, padding: isDesktop ? '20px 32px 0' : undefined }}>

          <div style={{ margin: isDesktop ? 0 : '12px 16px 0', borderRadius:20, background: shop.brand_color ? `linear-gradient(135deg, ${shop.brand_color}cc 0%, ${shop.brand_color} 100%)` : `linear-gradient(135deg, ${C.primaryDeep} 0%, ${C.primary} 100%)`, padding:'18px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', right:-30, top:-30, width:150, height:150, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
              <div style={{ width:64, height:64, borderRadius:14, background:'#1A1420', border:'2px solid rgba(255,255,255,0.3)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {shop.logo_url ? <Img label="" src={shop.logo_url} style={{ width:'100%', height:'100%' }} /> : <Icon name="store" size={24} color="#fff" />}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:'#fff' }}>{shop.name}</span>
                  {shop.is_verified && (
                    <div style={{ width:16, height:16, borderRadius:9999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="check" size={9} color={C.primary} sw={3} />
                    </div>
                  )}
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2 }}>Member since {new Date(shop.created_at).toLocaleDateString('en-US', { month:'long', year:'numeric' })}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                  <StarRow rating={shop.rating || 0} size={12} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:'#fff' }}>{(shop.rating || 0).toFixed(1)}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.8)' }}>({shop.reviews_count || 0} reviews)</span>
                </div>
              </div>
              <Btn variant={following ? 'secondary' : 'primary'} size="sm" onClick={toggleFollow} style={following ? { background:'rgba(255,255,255,0.15)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.4)' } : { background:'#fff', color:C.primaryDeep }}>
                {following ? 'Following' : 'Follow'}
              </Btn>
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.85)', marginTop:10, position:'relative' }}>
              {(shop.followers || 0).toLocaleString()} followers
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', padding: isDesktop ? '18px 0 0' : '14px 16px 0', position:'sticky', top:0, background:C.paper, zIndex:10 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ flexShrink:0, border:'none', cursor:'pointer', borderRadius:9999, padding:'9px 16px', background: tab===t.key ? C.primary : C.white, color: tab===t.key ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, boxShadow: tab===t.key ? 'none' : '0 1px 4px rgba(14,11,31,0.06)', transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: isDesktop ? '16px 0 0' : '14px 16px 0' }}>

            {/* HOME TAB */}
            {tab === 'home' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <BannerCarousel banners={shop.shop_banners} />

                {shop.promo_text && (
                  <div style={{ background:C.primarySoft, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="shoppingBag" size={17} color={C.primary} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primaryDeep }}>Welcome to {shop.name}!</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep }}>{shop.promo_text}</div>
                    </div>
                  </div>
                )}

                {categories.length > 0 && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Categories</span>
                    <button onClick={() => setTab('categories')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>See All</button>
                  </div>
                  <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
                    {categories.map(c => (
                      <button key={c.key} onClick={() => { setCatFilter(c.key); setTab('products'); }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', flexShrink:0, width:76 }}>
                        <div style={{ width:56, height:56, borderRadius:16, background:C.white, boxShadow:'0 2px 8px rgba(14,11,31,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Icon name="tag" size={23} color={C.primary} />
                        </div>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.ink, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', width:'100%' }}>{c.label}</span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color:C.mute }}>{c.count} items</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Popular Products</span>
                    {safeProducts.length > 0 && (
                      <button onClick={() => setTab('products')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>See All</button>
                    )}
                  </div>
                  {products === null ? (
                    <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                      {[0,1,2,3].map(i => <div key={i} style={{ height:220, borderRadius:14, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
                    </div>
                  ) : safeProducts.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'30px 16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>This store hasn't published any products yet.</div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                      {safeProducts.slice(0, isDesktop ? 5 : 4).map((p, i) => (
                        <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} onAddToCart={() => addToCart(p)} />
                      ))}
                    </div>
                  )}
                </div>

                {safeProducts.length > 0 && (
                  <Btn variant="secondary" size="md" wide onClick={() => setTab('products')}>
                    <Icon name="grid" size={16} color={C.ink} /> View All Products
                  </Btn>
                )}
              </div>
            )}

            {/* ALL PRODUCTS TAB */}
            {tab === 'products' && (
              <div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                  <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer', flexShrink:0 }}>
                    <Icon name="sliders" size={14} color={C.ink} />
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Filter</span>
                  </button>
                  <button onClick={() => setSortOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>{SORTS.find(s=>s.key===sortKey).label}</span>
                    <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)' }} />
                  </button>
                  <span style={{ marginLeft:'auto', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, flexShrink:0 }}>{filteredProducts.length} products</span>
                </div>

                {products === null ? (
                  <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                    {[0,1,2,3].map(i => <div key={i} style={{ height:220, borderRadius:14, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
                  </div>
                ) : (
                <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                  {visibleProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} onAddToCart={() => addToCart(p)} />
                  ))}
                </div>
                )}
                {products !== null && filteredProducts.length === 0 && (
                  <div style={{ textAlign:'center', padding:'50px 20px' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No products match your filters</span>
                  </div>
                )}
                {visibleCount < filteredProducts.length && (
                  <div style={{ textAlign:'center', marginTop:16 }}>
                    <button onClick={() => setVisibleCount(v => Math.min(v + 6, filteredProducts.length))} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
                      Load More Products
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CATEGORIES TAB */}
            {tab === 'categories' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {categories.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'30px 16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No categories yet.</div>
                ) : categories.map(c => (
                  <button key={c.key} onClick={() => { setCatFilter(c.key); setTab('products'); }} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:14, padding:'14px 16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="tag" size={20} color={C.primary} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>{c.label}</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{c.count} items</div>
                    </div>
                    <Icon name="chevronRight" size={16} color={C.mute} />
                  </button>
                ))}
              </div>
            )}

            {/* REVIEWS TAB */}
            {tab === 'reviews' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:34, fontWeight:800, color:C.ink }}>{(shop.rating || 0).toFixed(1)}</div>
                    <StarRow rating={shop.rating || 0} size={14} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:4 }}>Based on {shop.reviews_count || 0} reviews</div>
                  </div>
                  <div style={{ flex:1, minWidth:160, display:'flex', flexDirection:'column', gap:5 }}>
                    {ratingBreakdown.map(r => (
                      <div key={r.stars} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, width:38 }}>{r.stars} star</span>
                        <div style={{ flex:1, height:6, borderRadius:9999, background:C.hairline, overflow:'hidden' }}>
                          <div style={{ width:`${r.pct}%`, height:'100%', background:'#F59E0B', borderRadius:9999 }} />
                        </div>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, width:30, textAlign:'right' }}>{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {reviews === null ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {[0,1].map(i => <div key={i} style={{ height:100, borderRadius:16, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
                  </div>
                ) : reviews.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'30px 16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No reviews yet.</div>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {reviews.slice(0, reviewCount).map(r => (
                    <div key={r.id} style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <Avatar size={38} initials={(r.buyer_name || 'A').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} />
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{r.buyer_name || 'Anonymous'}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                            <StarRow rating={r.rating} size={11} />
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(r.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      {r.comment && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, lineHeight:1.5 }}>{r.comment}</div>}
                    </div>
                  ))}
                </div>
                )}

                {reviews && reviewCount < reviews.length && (
                  <div style={{ textAlign:'center' }}>
                    <button onClick={() => setReviewCount(c => c + 3)} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
                      Load More Reviews
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ABOUT TAB */}
            {tab === 'about' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {shop.description && (
                  <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:8 }}>About This Seller</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.6 }}>{shop.description}</div>
                  </div>
                )}

                <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                  {[
                    { icon:'store', label:'Store Name', value: shop.name },
                    { icon:'calendar', label:'Member Since', value: new Date(shop.created_at).toLocaleDateString('en-US', { month:'long', year:'numeric' }) },
                    { icon:'package', label:'Products', value: String(safeProducts.length) },
                    { icon:'trendingUp', label:'Total Sales', value: String(shop.total_sales || 0) },
                  ].filter(row => row.value).map((row, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                      <Icon name={row.icon} size={17} color={C.mute} />
                      <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{row.label}</span>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, textAlign:'right' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <Btn variant="primary" size="lg" wide onClick={() => navigate('chat', { shopId: shop.id, shopName: shop.name })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
                  <Icon name="messageSquare" size={16} color="#fff" /> Contact Seller
                </Btn>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sort modal */}
      <Modal open={sortOpen} title="Sort By" onClose={() => setSortOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => { setSortKey(s.key); setSortOpen(false); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{s.label}</span>
              {sortKey === s.key && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>

      {/* Filter modal */}
      <Modal open={filterOpen} title="Filter Products" onClose={() => setFilterOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {categories.length > 0 && (
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Category</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Chip active={filters.categoryId === 'all'} onClick={() => setFilters(f => ({ ...f, categoryId:'all' }))}>All</Chip>
              {categories.map(c => (
                <Chip key={c.key} active={filters.categoryId === c.key} onClick={() => setFilters(f => ({ ...f, categoryId:c.key }))}>{c.label}</Chip>
              ))}
            </div>
          </div>
          )}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Max Price</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary }}>${filters.maxPrice}</span>
            </div>
            <input type="range" min="0" max="1000" step="10" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))} style={{ width:'100%', accentColor: C.primary }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Discounted Only</span>
            <Switch checked={filters.discountOnly} onChange={v => setFilters(f => ({ ...f, discountOnly:v }))} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setFilters({ categoryId:'all', maxPrice:1000, discountOnly:false })}>Reset</Btn>
            <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => setFilterOpen(false)}>Apply</Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { SellerStoreScreen });
