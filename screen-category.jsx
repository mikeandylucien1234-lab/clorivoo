// screen-category.jsx — Main Categories hub + Category product listing page
// Both screens read the real `categories` table (via sbGetCategoryTree / sbGetCategoryBySlug /
// sbGetProductsByCategory in supabase-client.jsx) — there is no local category list here
// anymore. Editing a category in the admin Categories page is what these screens show.

// ─── MAIN CATEGORIES PAGE (hub) ─────────────────────────────────
function CategoriesScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const cartCount = (window.CART_ITEMS || []).length;
  const [tree, setTree] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    sbGetCategoryTree().then(t => { setTree(t.filter(c => c.show_in_menu !== false)); setLoading(false); });
  }, []);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Top navbar */}
      {!isDesktop && (
      <div style={{ paddingTop:STATUS_H, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', borderBottom:`1px solid ${C.hairline}`, flexShrink:0, position:'relative', zIndex:20 }}>
        <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:26, height:26, borderRadius:8, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="shoppingBag" size={14} color="#fff" sw={2} />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>CLORIVO</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            <button onClick={() => navigate('search')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="search" size={19} color={C.ink} />
            </button>
            <button onClick={() => navigate('wishlist')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="heart" size={19} color={C.ink} />
            </button>
            <button onClick={() => navigate('cart')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <Icon name="cart" size={19} color={C.ink} />
              {cartCount > 0 && <Badge count={cartCount} />}
            </button>
          </div>
        </div>
      </div>
      )}

      <div style={{ flex:1, overflowY:'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '24px 32px 0' : undefined }}>

        {/* Search bar */}
        <div style={{ padding: isDesktop ? '0 0 16px' : '14px 16px 0', display:'flex', gap:8 }}>
          <div onClick={() => navigate('search')} style={{ flex:1, display:'flex', alignItems:'center', gap:10, background:C.white, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'11px 16px', cursor:'text' }}>
            <Icon name="search" size={17} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, flex:1 }}>Search products, brands, categories…</span>
          </div>
          <button style={{ width:44, height:44, border:`1.5px solid ${C.hairline}`, borderRadius:12, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="sliders" size={17} color={C.ink} />
          </button>
        </div>

        {/* Hero banner */}
        <div style={{ padding: isDesktop ? '16px 0 0' : '14px 16px 0' }}>
          <div style={{ borderRadius:18, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'22px 24px', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', minHeight:120 }}>
            <div style={{ position:'absolute', right:-30, top:-30, width:150, height:150, borderRadius:9999, background:'rgba(255,255,255,0.08)' }} />
            <div style={{ position:'absolute', right:10, bottom:-40, width:100, height:100, borderRadius:9999, background:'rgba(255,255,255,0.06)' }} />
            <div style={{ position:'relative', zIndex:1, flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.25, marginBottom:4 }}>Discover Top Categories</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Best products at the best prices</div>
              <button onClick={() => navigate('category')} style={{ background:'#fff', border:'none', borderRadius:9999, padding:'9px 18px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary }}>
                Shop Now
                <Icon name="arrowLeft" size={14} color={C.primary} style={{ transform:'rotate(180deg)' }} />
              </button>
            </div>
            <Icon name="shoppingBag" size={64} color="rgba(255,255,255,0.18)" style={{ position:'relative', zIndex:1, flexShrink:0 }} />
          </div>
        </div>

        {/* Category list */}
        <div style={{ padding: isDesktop ? '24px 0 0' : '20px 16px 0' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink, marginBottom:12 }}>All Categories</div>
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[0,1,2].map(i => <div key={i} style={{ height:78, borderRadius:16, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px 0', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No categories yet.</div>
          ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {tree.map((cat) => (
              <button key={cat.id} onClick={() => navigate('category', { category: cat.slug })} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, cursor:'pointer',
                background:C.white, border:`1px solid ${C.hairline}`, boxShadow:'0 1px 6px rgba(14,11,31,0.04)',
                textAlign:'left', transition:'transform 0.12s, box-shadow 0.12s',
              }}>
                <div style={{ width:48, height:48, borderRadius:14, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                  {cat.image_url ? <img src={cat.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name={cat.icon || 'tag'} size={22} color={C.primary} />}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14.5, fontWeight:700, color:C.ink }}>{cat.name}</div>
                  {cat.short_description && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.short_description}</div>}
                </div>
                {cat.children?.length > 0 && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, flexShrink:0 }}>{cat.children.length}</span>}
                <Icon name="chevronRight" size={17} color={C.mute} style={{ flexShrink:0 }} />
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Service info bar */}
        <div style={{ display:'flex', gap:10, padding: isDesktop ? '24px 0' : '20px 16px' }}>
          {[
            { icon:'truck', title:'Free Shipping', sub:'On orders over $50' },
            { icon:'package', title:'Free Returns', sub:'Within 7 days' },
            { icon:'help', title:'24/7 Support', sub:'Always available' },
          ].map((s, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', background:C.primarySoft, borderRadius:14, textAlign:'center' }}>
              <Icon name={s.icon} size={19} color={C.primary} />
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:C.primaryDeep, lineHeight:1.2 }}>{s.title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.primaryDeep, opacity:0.75 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        </div>
      </div>

      <BottomNav active={1} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 2) navigate('cart');
        else if (i === 3) navigate('tracking');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}

// ─── CATEGORY PRODUCT LISTING PAGE ──────────────────────────────
function CategoryScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const initialSlug = params.category || '';

  const [topLevel, setTopLevel] = React.useState([]);
  const [activeSlug, setActiveSlug] = React.useState(initialSlug);
  const [activeCategory, setActiveCategory] = React.useState(null); // full row for the active slug, or null = "All"
  const [children, setChildren] = React.useState([]);
  const [activeSub, setActiveSub] = React.useState(-1); // -1 = the category itself, not a subcategory
  const [sort, setSort]       = React.useState(0);
  const [view, setView]       = React.useState('grid');
  const [products, setProducts] = React.useState([]);
  const [visibleCount, setVisibleCount] = React.useState(8);
  const [loadingMore, setLoadingMore]   = React.useState(false);
  const [loadingProducts, setLoadingProducts] = React.useState(true);

  const sorts = ['Popular','Price ↑','Price ↓','Newest'];
  const sortParam = ['popular','price_asc','price_desc','newest'][sort];
  const specsByTint = ['Premium quality','Best seller','Limited stock','Top rated','New arrival'];

  React.useEffect(() => {
    sbGetCategoryTree().then(tree => setTopLevel(tree.filter(c => c.show_in_menu !== false)));
  }, []);

  // Resolve the active slug → category row + its children (for the subcategory pill row).
  React.useEffect(() => {
    let cancelled = false;
    if (!activeSlug) { setActiveCategory(null); setChildren([]); return; }
    sbGetCategoryBySlug(activeSlug).then(async cat => {
      if (cancelled || !cat) return;
      setActiveCategory(cat);
      const tree = await sbGetCategoryTree();
      const findNode = (list) => { for (const c of list) { if (c.id === cat.id) return c; const f = findNode(c.children || []); if (f) return f; } return null; };
      setChildren(findNode(tree)?.children || []);
    });
    return () => { cancelled = true; };
  }, [activeSlug]);

  // Fetch products for the active category (or all, when "All" is selected), re-run on sort change.
  React.useEffect(() => {
    setLoadingProducts(true);
    setVisibleCount(8);
    const subSlug = activeSub >= 0 ? children[activeSub]?.slug : null;
    const target = subSlug || activeSlug;
    const req = target
      ? sbGetProductsByCategory(target, { limit: 48, sort: sortParam })
      : sbGetProducts({ limit: 48 }).then(({ data }) => ({ data: data || [], category: null }));
    req.then(({ data }) => { setProducts(data); setLoadingProducts(false); });
  }, [activeSlug, activeSub, sortParam]);

  const visibleProducts = products.slice(0, visibleCount);

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => { setVisibleCount(v => Math.min(v + 8, products.length)); setLoadingMore(false); }, 400);
  }

  const headerTitle = activeCategory ? activeCategory.name : 'All Products';

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0, borderBottom:`1px solid ${C.hairline}` }}>
        {!isDesktop && (
        <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={goBack} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={22} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{headerTitle}</span>
          <button onClick={() => navigate('wishlist')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="heart" size={20} color={C.ink} />
          </button>
          <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <Icon name="cart" size={20} color={C.ink} />
            <Badge count={(window.CART_ITEMS || []).length} />
          </button>
        </div>
        )}

        {!isDesktop && (
        <div style={{ padding:'0 12px 10px' }}>
          <div onClick={() => navigate('search')} style={{ display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'9px 14px', cursor:'text' }}>
            <Icon name="search" size={16} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, flex:1 }}>Search in {headerTitle}…</span>
          </div>
        </div>
        )}

        {/* Category tabs — top-level categories from the real tree, "All" first */}
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, display:'flex', gap:8, padding: isDesktop ? '14px 32px' : '2px 12px 10px', overflowX:'auto' }}>
          <Chip active={!activeSlug} onClick={() => { setActiveSlug(''); setActiveSub(-1); }}>All</Chip>
          {topLevel.map((c) => (
            <Chip key={c.id} active={activeSlug === c.slug} onClick={() => { setActiveSlug(c.slug); setActiveSub(-1); }}>{c.name}</Chip>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined }}>

        {/* Subcategory scroll (icon pills) — real children of the active category */}
        {children.length > 0 && (
        <div style={{ display:'flex', gap:18, padding:'14px 16px 4px', overflowX:'auto' }}>
          <button onClick={() => setActiveSub(-1)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0, border:'none', background:'none', cursor:'pointer', width:64 }}>
            <div style={{ width:52, height:52, borderRadius:9999, background: activeSub === -1 ? C.primary : C.white, border: activeSub === -1 ? 'none' : `1.5px solid ${C.hairline}`, boxShadow: activeSub === -1 ? `0 6px 16px rgba(108,77,255,0.3)` : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
              <Icon name={activeCategory?.icon || 'grid'} size={21} color={activeSub === -1 ? '#fff' : C.mute} />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight: activeSub === -1 ? 700 : 500, color: activeSub === -1 ? C.primary : C.mute, textAlign:'center', lineHeight:1.2 }}>All</span>
          </button>
          {children.map((s, i) => (
            <button key={s.id} onClick={() => setActiveSub(i)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0, border:'none', background:'none', cursor:'pointer', width:64 }}>
              <div style={{ width:52, height:52, borderRadius:9999, background: activeSub === i ? C.primary : C.white, border: activeSub === i ? 'none' : `1.5px solid ${C.hairline}`, boxShadow: activeSub === i ? `0 6px 16px rgba(108,77,255,0.3)` : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                <Icon name={s.icon || 'tag'} size={21} color={activeSub === i ? '#fff' : C.mute} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight: activeSub === i ? 700 : 500, color: activeSub === i ? C.primary : C.mute, textAlign:'center', lineHeight:1.2 }}>{s.name}</span>
            </button>
          ))}
        </div>
        )}

        {/* Filter / sort bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'14px 16px 10px', overflowX:'auto' }}>
          <button style={{ display:'flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', flexShrink:0 }}>
            <Icon name="sliders" size={14} color={C.ink} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Filter</span>
          </button>
          <button onClick={() => setSort(s => (s + 1) % sorts.length)} style={{ display:'flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', flexShrink:0 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Sort by</span>
            <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)' }} />
          </button>
          <button style={{ display:'flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.primarySoft, cursor:'pointer', flexShrink:0 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primaryDeep }}>{sorts[sort]}</span>
            <Icon name="chevronRight" size={13} color={C.primaryDeep} style={{ transform:'rotate(90deg)' }} />
          </button>
          <div style={{ flex:1 }} />
          <div style={{ display:'flex', border:`1.5px solid ${C.hairline}`, borderRadius:9999, overflow:'hidden', flexShrink:0 }}>
            <button onClick={() => setView('grid')} style={{ width:32, height:32, border:'none', background: view === 'grid' ? C.primary : C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="grid" size={14} color={view === 'grid' ? '#fff' : C.mute} />
            </button>
            <button onClick={() => setView('list')} style={{ width:32, height:32, border:'none', background: view === 'list' ? C.primary : C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="list" size={14} color={view === 'list' ? '#fff' : C.mute} />
            </button>
          </div>
        </div>

        {/* Product grid */}
        {loadingProducts ? (
          <div style={{ padding:'0 16px', display:'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height:220, borderRadius:14, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No products in this category yet.</div>
        ) : (
        <div style={{ padding:'0 16px', display:'grid', gridTemplateColumns: view !== 'grid' ? '1fr' : isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
          {visibleProducts.map((p, i) => (
            <ProductCard
              key={p.id} product={p} size="md" tint={i % 5}
              specs={specsByTint[i % specsByTint.length]}
              onPress={() => navigate('pdp', { product: p })}
              onAddToCart={() => { window.CART_ITEMS = [...(window.CART_ITEMS || []), { product: p, qty:1, variant: null, seller: p.seller }]; }}
            />
          ))}
        </div>
        )}

        {/* Results count + Load more */}
        {!loadingProducts && visibleProducts.length > 0 && (
        <div style={{ padding:'16px 16px 4px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginBottom:12 }}>
            Showing 1–{Math.min(visibleCount, products.length)} of {products.length} products
          </div>
          {visibleCount < products.length && (
            <button onClick={handleLoadMore} disabled={loadingMore} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
              {loadingMore ? 'Loading…' : 'Load More Products'}
            </button>
          )}
        </div>
        )}
        <div style={{ height:20 }} />
        </div>
      </div>

      <BottomNav active={1} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 2) navigate('cart');
        else if (i === 3) navigate('tracking');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}

Object.assign(window, { CategoriesScreen, CategoryScreen });
