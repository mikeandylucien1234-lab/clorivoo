// screen-public-shop.jsx — Public Shop : the buyer-facing global catalog.
//
// This is NOT the seller dashboard (screen-store.jsx → SellerStoreScreen) or
// the seller's own shop editor (screen-shop.jsx → ShopCustomizeScreen) — both
// are seller-only tools and are untouched by this file. Public Shop is the
// page a buyer opens to browse everything sellable on CLORIVO: real products,
// real categories, real brands, via sbSearchProducts (also used by Search
// Results) — no local product list, no duplicate data-fetching logic.

function PublicShopScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();

  const [query, setQuery]           = React.useState('');
  const [topCategories, setTopCategories] = React.useState([]);
  const [subCategories, setSubCategories] = React.useState([]);
  const [categoryId, setCategoryId] = React.useState('');
  const [subCategoryId, setSubCategoryId] = React.useState('');
  const [brands, setBrands]         = React.useState([]);
  const [brandId, setBrandId]       = React.useState('');
  const [maxPrice, setMaxPrice]     = React.useState(1500);
  const [sort, setSort]             = React.useState('popular');
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [products, setProducts]     = React.useState(null); // null = loading
  const [totalCount, setTotalCount] = React.useState(0); // real server-side total for the current filters
  const [loadState, setLoadState]   = React.useState('loading'); // loading | error | success
  const [loadingMore, setLoadingMore]   = React.useState(false);
  const [wishlist, setWishlist]     = React.useState([]);
  const [toast, setToast]           = React.useState(null);
  const [userId, setUserId]         = React.useState(null);
  const categoryTreeRef = React.useRef([]);
  const PAGE_SIZE = 24;

  React.useEffect(() => {
    sbGetCategoryTree().then(tree => { categoryTreeRef.current = tree; setTopCategories(tree.filter(c => c.show_in_menu !== false)); });
    sbGetActiveBrands().then(setBrands);
    sbGetUser().then(u => { setUserId(u?.id || null); if (u?.id) sbGetWishlist(u.id).then(items => setWishlist(items.map(i => i.id))); });
  }, []);

  // Subcategory chips for whichever top category is selected — real children
  // from the same tree already loaded, no second fetch.
  React.useEffect(() => {
    if (!categoryId) { setSubCategories([]); setSubCategoryId(''); return; }
    const node = categoryTreeRef.current.find(c => c.id === categoryId);
    setSubCategories(node?.children || []);
    setSubCategoryId('');
  }, [categoryId]);

  // Real server-side pagination: every filter/sort change resets to page 1
  // (offset 0, fresh array) via this effect; "Load More" (below) is the only
  // thing that advances the offset and appends. No arbitrary cap — the real
  // total (`count`) tells us when there's nothing left to fetch.
  React.useEffect(() => {
    setLoadState('loading');
    const t = setTimeout(() => {
      sbSearchProducts({
        query,
        categoryId: subCategoryId || categoryId || '',
        brandId,
        sort,
        maxPrice,
        limit: PAGE_SIZE,
        offset: 0,
        withCount: true,
      }).then(({ data, error, count }) => {
        if (error) { setLoadState('error'); setProducts([]); return; }
        setProducts((data || []).map(_withCardFields));
        setTotalCount(count ?? 0);
        setLoadState('success');
      }).catch(() => { setLoadState('error'); setProducts([]); });
    }, 350);
    return () => clearTimeout(t);
  }, [query, categoryId, subCategoryId, brandId, sort, maxPrice]);

  const safeProducts = products || [];
  const visibleProducts = safeProducts;

  // Appends the next real page (offset = how many rows we already have) —
  // never re-fetches a page we already have, so nothing already shown can be
  // duplicated, and nothing between pages is skipped.
  function handleLoadMore() {
    setLoadingMore(true);
    sbSearchProducts({
      query,
      categoryId: subCategoryId || categoryId || '',
      brandId,
      sort,
      maxPrice,
      limit: PAGE_SIZE,
      offset: safeProducts.length,
    }).then(({ data, error }) => {
      setLoadingMore(false);
      if (error) return;
      setProducts(prev => [...(prev || []), ...(data || []).map((p, i) => _withCardFields(p, (prev || []).length + i))]);
    }).catch(() => setLoadingMore(false));
  }

  async function toggleWish(p) {
    if (!userId) { setToast({ type:'error', message:'Please sign in to use your wishlist.' }); return; }
    const already = wishlist.includes(p.id);
    if (already) {
      setWishlist(prev => prev.filter(id => id !== p.id));
      const { error } = await sbRemoveFromWishlist(userId, p.id);
      if (error) { setWishlist(prev => [...prev, p.id]); setToast({ type:'error', message:'Could not remove from wishlist.' }); return; }
      setToast({ type:'success', message:'Removed from wishlist' });
    } else {
      setWishlist(prev => [...prev, p.id]);
      const { error } = await sbAddToWishlist(userId, p.id);
      if (error) { setWishlist(prev => prev.filter(id => id !== p.id)); setToast({ type:'error', message:'Could not add to wishlist.' }); return; }
      setToast({ type:'success', message:'Added to wishlist' });
    }
  }
  // A quick "Add to Cart" from a grid card never guesses a variant: if the
  // product actually has real variants (size/color with their own stock),
  // we open Product Details so the buyer picks one — the existing variant
  // selector, not a fabricated choice here. Only a product with no variants
  // at all is added directly, exactly as before.
  async function addToCart(p) {
    const variants = await sbGetProductVariants(p.id);
    if (variants && variants.length > 0) {
      navigate('pdp', { product: p });
      return;
    }
    const { error } = await sbAddToCart({ userId, product: p, qty: 1, price: p.price, mode: 'increment' });
    if (error) { setToast({ type:'error', message: error.message || 'Could not add this to your cart.' }); return; }
    setToast({ type:'success', message:`${p.title} added to cart` });
  }

  const SORTS = [
    { key:'popular',    label:'Popularity' },
    { key:'newest',     label:'Newest' },
    { key:'price_low',  label:'Price: Low to High' },
    { key:'price_high', label:'Price: High to Low' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0, borderBottom:`1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '14px 32px 0' : '8px 12px 0', display:'flex', alignItems:'center', gap:8 }}>
          {!isDesktop && (
            <button onClick={goBack} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={22} color={C.ink} />
            </button>
          )}
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em', flex:1 }}>Shop</span>
          <button onClick={() => navigate('wishlist')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="heart" size={20} color={C.ink} />
          </button>
          <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <Icon name="cart" size={20} color={C.ink} />
            <Badge count={(window.CART_ITEMS || []).length} />
          </button>
        </div>

        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '12px 32px' : '10px 12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'9px 14px' }}>
            <Icon name="search" size={16} color={C.mute} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the shop…"
              style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }} />
            {query && (
              <button onClick={() => setQuery('')} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                <Icon name="x" size={15} color={C.mute} />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs — real top-level categories */}
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, display:'flex', gap:8, padding: isDesktop ? '0 32px 14px' : '0 12px 10px', overflowX:'auto' }}>
          <Chip active={!categoryId} onClick={() => setCategoryId('')}>All</Chip>
          {topCategories.map(c => (
            <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>{c.name}</Chip>
          ))}
        </div>

        {/* Subcategory chips — real children of the selected top category */}
        {subCategories.length > 0 && (
          <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, display:'flex', gap:8, padding: isDesktop ? '0 32px 14px' : '0 12px 10px', overflowX:'auto' }}>
            <Chip active={!subCategoryId} onClick={() => setSubCategoryId('')}>All {topCategories.find(c=>c.id===categoryId)?.name}</Chip>
            {subCategories.map(s => (
              <Chip key={s.id} active={subCategoryId === s.id} onClick={() => setSubCategoryId(s.id)}>{s.name}</Chip>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined }}>

          {/* Filter / sort bar */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px 10px', overflowX:'auto' }}>
            <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', flexShrink:0 }}>
              <Icon name="sliders" size={14} color={C.ink} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Filters{brandId || maxPrice < 1500 ? ' •' : ''}</span>
            </button>
            {SORTS.map(s => (
              <button key={s.key} onClick={() => setSort(s.key)} style={{ display:'flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${C.hairline}`, background: sort===s.key ? C.primarySoft : C.white, cursor:'pointer', flexShrink:0 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color: sort===s.key ? C.primaryDeep : C.ink }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Product grid — Loading / Error / Empty / Success */}
          {loadState === 'loading' && (
            <div style={{ padding:'0 16px', display:'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
              {[0,1,2,3,4,5].map(i => <div key={i} style={{ height:220, borderRadius:14, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
            </div>
          )}

          {loadState === 'error' && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'50px 20px', textAlign:'center' }}>
              <Icon name="alertTriangle" size={30} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.mute }}>Couldn't load the shop right now. Please try again shortly.</span>
            </div>
          )}

          {loadState === 'success' && visibleProducts.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'50px 20px', textAlign:'center' }}>
              <Icon name="package" size={30} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>No products match these filters</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Try a different category, brand or price range.</span>
            </div>
          )}

          {loadState === 'success' && visibleProducts.length > 0 && (
            <div style={{ padding:'0 16px', display:'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
              {visibleProducts.map((p, i) => (
                <div key={p.id} style={{ position:'relative' }}>
                  <ProductCard product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product: p })} onAddToCart={() => addToCart(p)} />
                  <button onClick={() => toggleWish(p)} style={{ position:'absolute', top:6, right:6, width:28, height:28, borderRadius:9999, border:'none', background:'rgba(255,255,255,0.92)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={wishlist.includes(p.id) ? 'heartFill' : 'heart'} size={14} color={wishlist.includes(p.id) ? C.primary : C.mute} filled={wishlist.includes(p.id)} />
                  </button>
                  {p.shops?.name && (
                    <div style={{ padding:'2px 10px', fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.shops.name}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {loadState === 'success' && safeProducts.length < totalCount && (
            <div style={{ textAlign:'center', margin:'16px 0' }}>
              <button onClick={handleLoadMore} disabled={loadingMore} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter modal — real brands + price, same pattern as Search */}
      <Modal open={filterOpen} title="Filter Shop" onClose={() => setFilterOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Brand</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <Chip active={!brandId} onClick={() => setBrandId('')}>All</Chip>
              {brands.map(b => <Chip key={b.id} active={brandId === b.id} onClick={() => setBrandId(b.id)}>{b.name}</Chip>)}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Max Price</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary }}>${maxPrice}</span>
            </div>
            <input type="range" min="0" max="1500" step="10" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width:'100%', accentColor: C.primary }} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => { setBrandId(''); setMaxPrice(1500); }}>Reset</Btn>
            <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => setFilterOpen(false)}>Apply</Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {!isDesktop && (
        <BottomNav active={0} onTab={(i) => {
          if (i === 0) navigate('home');
          else if (i === 1) navigate('categories');
          else if (i === 2) navigate('cart');
          else if (i === 3) navigate('tracking');
          else if (i === 4) navigate('profile');
        }} />
      )}
    </div>
  );
}

Object.assign(window, { PublicShopScreen });
