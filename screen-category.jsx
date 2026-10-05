// screen-category.jsx — Main Categories hub + Category product listing page

const MAIN_CATEGORIES = [
  { slug:'Electronics',        tab:'Tech',    icon:'zap',       desc:'Phones, laptops, accessories', count:0 },
  { slug:'Fashion',            tab:'Fashion', icon:'tag',       desc:'Clothes, shoes, accessories',  count:0 },
  { slug:'Home & Living',      tab:'Home',    icon:'home',      desc:'Decor, furniture, kitchenware', count:0 },
  { slug:'Beauty & Health',    tab:'Beauty',  icon:'heart',     desc:'Perfume, skincare, makeup',    count:0 },
  { slug:'Baby & Kids',        tab:'Kids',    icon:'star',      desc:'Baby gear, toys, equipment',   count:0 },
  { slug:'Sports & Outdoors',  tab:'Sport',   icon:'barChart',  desc:'Fitness, camping, cycling',    count:0 },
  { slug:'Automotive',         tab:'All',     icon:'truck',     desc:'Car & bike accessories',       count:0 },
  { slug:'Office & Business',  tab:'All',     icon:'briefcase', desc:'Office supplies, stationery',  count:0 },
  { slug:'Food & Grocery',     tab:'Kitchen', icon:'utensils',  desc:'Local products, drinks, snacks', count:0 },
  { slug:'Pets',               tab:'All',     icon:'heartFill', desc:'Food, accessories, toys',      count:0 },
];

// ─── MAIN CATEGORIES PAGE (hub) ─────────────────────────────────
function CategoriesScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const cartCount = (window.CART_ITEMS || []).length;

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
            <button style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
          <div onClick={() => {}} style={{ flex:1, display:'flex', alignItems:'center', gap:10, background:C.white, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'11px 16px', cursor:'text' }}>
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
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {MAIN_CATEGORIES.map((cat, i) => (
              <button key={i} onClick={() => navigate('category', { category: cat.tab })} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, cursor:'pointer',
                background:C.white, border:`1px solid ${C.hairline}`, boxShadow:'0 1px 6px rgba(14,11,31,0.04)',
                textAlign:'left', transition:'transform 0.12s, box-shadow 0.12s',
              }}>
                <div style={{ width:48, height:48, borderRadius:14, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={cat.icon} size={22} color={C.primary} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14.5, fontWeight:700, color:C.ink }}>{cat.slug}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.desc}</div>
                </div>
                {cat.count > 0 && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, flexShrink:0 }}>{cat.count}+</span>}
                <Icon name="chevronRight" size={17} color={C.mute} style={{ flexShrink:0 }} />
              </button>
            ))}
          </div>
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
  const initial = params.category || 'All';

  const categories = ['All','Home','Tech','Beauty','Fashion','Kids','Sport','Kitchen'];
  const [active, setActive]   = React.useState(categories.includes(initial) ? initial : 'All');
  const [sort, setSort]       = React.useState(0);
  const [view, setView]       = React.useState('grid');
  const [visibleCount, setVisibleCount] = React.useState(8);
  const [loadingMore, setLoadingMore]   = React.useState(false);

  const subCatsByCategory = {
    'All':    [{ label:'Trending', icon:'zap' }, { label:'New', icon:'tag' }, { label:'Best sellers', icon:'star' }, { label:'Deals', icon:'tag' }],
    'Home':   [{ label:'Decor', icon:'home' }, { label:'Kitchen', icon:'utensils' }, { label:'Lighting', icon:'zap' }, { label:'Textiles', icon:'tag' }, { label:'Storage', icon:'package' }],
    'Tech':   [{ label:'Phones', icon:'camera' }, { label:'Laptops', icon:'settings' }, { label:'Accessories', icon:'package' }, { label:'Audio', icon:'messageSquare' }, { label:'Smartwatches', icon:'zap' }],
    'Beauty': [{ label:'Skincare', icon:'heart' }, { label:'Makeup', icon:'star' }, { label:'Fragrance', icon:'zap' }, { label:'Hair', icon:'settings' }],
    'Fashion':[{ label:'Women', icon:'tag' }, { label:'Men', icon:'tag' }, { label:'Bags', icon:'shoppingBag' }, { label:'Shoes', icon:'package' }, { label:'Jewelry', icon:'star' }],
    'Kids':   [{ label:'Toys', icon:'star' }, { label:'Clothing', icon:'tag' }, { label:'Baby care', icon:'heart' }],
    'Sport':  [{ label:'Fitness', icon:'barChart' }, { label:'Outdoor', icon:'truck' }, { label:'Cycling', icon:'zap' }],
    'Kitchen':[{ label:'Utensils', icon:'utensils' }, { label:'Appliances', icon:'zap' }, { label:'Tableware', icon:'package' }],
  };
  const subCats = subCatsByCategory[active] || subCatsByCategory['All'];
  const sorts = ['Popular','Price ↑','Price ↓','Newest'];
  const specsByTint = ['Premium quality','Best seller','Limited stock','Top rated','New arrival'];

  // Build product list (dup PRODUCTS for a fuller grid)
  let products = [...PRODUCTS, ...PRODUCTS.map(p => ({ ...p, id: p.id + 100 }))];
  if (sort === 1) products = products.sort((a,b) => a.price - b.price);
  else if (sort === 2) products = products.sort((a,b) => b.price - a.price);

  const [activeSub, setActiveSub] = React.useState(0);
  const visibleProducts = products.slice(0, visibleCount);

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => { setVisibleCount(v => Math.min(v + 8, products.length)); setLoadingMore(false); }, 500);
  }

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
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em', flex:1 }}>{active === 'All' ? 'All Products' : active}</span>
          <button onClick={() => navigate('wishlist')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="heart" size={20} color={C.ink} />
          </button>
          <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <Icon name="cart" size={20} color={C.ink} />
            <Badge count={window.CART_ITEMS.length} />
          </button>
        </div>
        )}

        {!isDesktop && (
        <div style={{ padding:'0 12px 10px' }}>
          <div onClick={() => {}} style={{ display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'9px 14px', cursor:'text' }}>
            <Icon name="search" size={16} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, flex:1 }}>Search in {active}…</span>
          </div>
        </div>
        )}

        {/* Category tabs */}
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, display:'flex', gap:8, padding: isDesktop ? '14px 32px' : '2px 12px 10px', overflowX:'auto' }}>
          {categories.map((c, i) => (
            <Chip key={i} active={active === c} onClick={() => { setActive(c); setActiveSub(0); setVisibleCount(8); }}>{c}</Chip>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined }}>

        {/* Subcategory scroll (icon pills) */}
        <div style={{ display:'flex', gap:18, padding:'14px 16px 4px', overflowX:'auto' }}>
          {subCats.map((s, i) => (
            <button key={i} onClick={() => setActiveSub(i)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0, border:'none', background:'none', cursor:'pointer', width:64 }}>
              <div style={{ width:52, height:52, borderRadius:9999, background: activeSub === i ? C.primary : C.white, border: activeSub === i ? 'none' : `1.5px solid ${C.hairline}`, boxShadow: activeSub === i ? `0 6px 16px rgba(108,77,255,0.3)` : 'none', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                <Icon name={s.icon} size={21} color={activeSub === i ? '#fff' : C.mute} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight: activeSub === i ? 700 : 500, color: activeSub === i ? C.primary : C.mute, textAlign:'center', lineHeight:1.2 }}>{s.label}</span>
            </button>
          ))}
        </div>

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

        {/* Results count + Load more */}
        <div style={{ padding:'16px 16px 4px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginBottom:12 }}>
            Showing 1–{Math.min(visibleCount, products.length)} of {products.length}+ products
          </div>
          {visibleCount < products.length && (
            <button onClick={handleLoadMore} disabled={loadingMore} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
              {loadingMore ? 'Loading…' : 'Load More Products'}
            </button>
          )}
        </div>
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

Object.assign(window, { CategoriesScreen, CategoryScreen, MAIN_CATEGORIES });
