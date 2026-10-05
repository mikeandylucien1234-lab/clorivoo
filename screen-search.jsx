// screen-search.jsx — Search Results Page

const SEARCH_INDEX = PRODUCTS.map((p, i) => ({
  ...p, variant:'', brand: p.seller || 'CLORIVO', color: ['Purple','Gold','Silver','Black','Blue'][i % 5],
  inStock: true, freeDelivery: p.price > 15, condition:'New', tint: i % 5,
}));

window._RECENT_SEARCHES = window._RECENT_SEARCHES || [];
const POPULAR_SEARCHES = [];
const CAT_TABS = [
  { key:'all',        label:'All',         icon:'grid' },
  { key:'electronics',label:'Phones',      icon:'smartphone' },
  { key:'accessories',label:'Accessories', icon:'headphones' },
  { key:'home',       label:'Home',        icon:'home' },
  { key:'fashion',    label:'Fashion',     icon:'shoppingBag' },
];
const SORTS = [
  { key:'popular',    label:'Popularity' },
  { key:'newest',     label:'Latest' },
  { key:'price_low',  label:'Lowest Price' },
  { key:'price_high', label:'Highest Price' },
  { key:'rating',     label:'Best Rating' },
];
function sortSearch(items, key) {
  const arr = [...items];
  if (key === 'price_low')  arr.sort((a,b) => a.price - b.price);
  if (key === 'price_high') arr.sort((a,b) => b.price - a.price);
  if (key === 'rating')     arr.sort((a,b) => (b.rating||0) - (a.rating||0));
  if (key === 'newest')     arr.sort((a,b) => b.id - a.id);
  return arr;
}

// ─── QUICK VIEW SHEET ──────────────────────────────────────────
function QuickViewSheet({ product, onClose, onAddToCart, onViewDetails }) {
  if (!product) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.55)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'sheetFadeIn 0.25s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:C.white, borderRadius:'20px 20px 0 0', padding:'20px 20px 28px', boxShadow:'0 -8px 40px rgba(14,11,31,0.2)', animation:'sheetIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.hairline, margin:'0 auto 16px' }} />
        <div style={{ display:'flex', gap:14 }}>
          <Img label="" tint={product.tint} style={{ width:100, height:100, borderRadius:14, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, lineHeight:1.3 }}>{product.title}</div>
            {product.variant && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:2 }}>{product.variant}</div>}
            {product.rating && (
              <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:5 }}>
                <Icon name="star" size={12} color="#F59E0B" filled />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{product.rating} ({product.reviews || product.sold})</span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:6 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17, fontWeight:800, color:C.primary }}>${product.price.toFixed(2)}</span>
              {product.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.mute, textDecoration:'line-through' }}>${product.oldPrice.toFixed(2)}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9999, border:'none', background:C.paper, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, height:32 }}>
            <Icon name="x" size={16} color={C.mute} />
          </button>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => onViewDetails(product)}>View Details</Btn>
          <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => onAddToCart(product)} disabled={!product.inStock}>
            <Icon name="cart" size={15} color="#fff" /> Add to Cart
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH RESULT CARD (list view) ───────────────────────────
function SearchResultRow({ p, wished, onOpen, onToggleWish, onAddToCart, onQuickView }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:12, boxShadow:'0 1px 6px rgba(14,11,31,0.05)', display:'flex', gap:10 }}>
      <div onClick={() => onOpen(p)} style={{ position:'relative', cursor:'pointer', flexShrink:0 }}>
        <Img label="" tint={p.tint} style={{ width:80, height:80, borderRadius:10 }} />
        {p.discount > 0 && <div style={{ position:'absolute', top:4, left:4, background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:700, padding:'1px 5px', borderRadius:6 }}>-{p.discount}%</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div onClick={() => onOpen(p)} style={{ flex:1, paddingRight:8, cursor:'pointer' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, lineHeight:1.3 }}>{p.title}</div>
            {p.variant && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:1 }}>{p.variant}</div>}
          </div>
          <button onClick={() => onToggleWish(p)} style={{ width:28, height:28, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={wished ? 'heartFill' : 'heart'} size={18} color={wished ? C.primary : C.mute} filled={wished} />
          </button>
        </div>
        {p.rating && (
          <div style={{ display:'flex', alignItems:'center', gap:4, margin:'4px 0' }}>
            <Icon name="star" size={11} color="#F59E0B" filled />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{p.rating} {p.reviews ? `(${p.reviews})` : ''}</span>
          </div>
        )}
        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:5 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:C.primary }}>${p.price.toFixed(2)}</span>
          {p.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice.toFixed(2)}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color: p.inStock ? C.success : C.warning }}>{p.inStock ? 'In Stock' : 'Low Stock'}</span>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => onQuickView(p)} style={{ width:30, height:30, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="eye" size={14} color={C.mute} />
            </button>
            <button onClick={() => onAddToCart(p)} disabled={!p.inStock} style={{ width:30, height:30, borderRadius:9999, border:'none', background: p.inStock ? C.primary : C.hairline, cursor: p.inStock ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="cart" size={14} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SKELETON ──────────────────────────────────────────────────
function SearchSkeleton({ grid }) {
  const shimmer = { background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', borderRadius:8 };
  if (grid) return <div style={{ borderRadius:14, overflow:'hidden' }}><div style={{ width:'100%', height:140, ...shimmer, borderRadius:0 }} /><div style={{ padding:10, display:'flex', flexDirection:'column', gap:8 }}><div style={{ height:12, width:'80%', ...shimmer }} /><div style={{ height:12, width:'40%', ...shimmer }} /></div></div>;
  return (
    <div style={{ display:'flex', gap:10, padding:12, background:C.white, borderRadius:16 }}>
      <div style={{ width:80, height:80, borderRadius:10, flexShrink:0, ...shimmer }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
        <div style={{ height:13, width:'70%', ...shimmer }} />
        <div style={{ height:11, width:'40%', ...shimmer }} />
        <div style={{ height:13, width:'30%', ...shimmer }} />
      </div>
    </div>
  );
}

// ─── SEARCH SCREEN ──────────────────────────────────────────────
function SearchScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const inputRef = React.useRef(null);

  const [query, setQuery] = React.useState(params.query || '');
  const [committed, setCommitted] = React.useState(!!params.query);
  const [focused, setFocused] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [recents, setRecents] = React.useState(window._RECENT_SEARCHES);
  const [view, setView] = React.useState('list');
  const [catTab, setCatTab] = React.useState('all');
  const [sortKey, setSortKey] = React.useState('popular');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({ brand:'all', color:'all', maxPrice:1500, inStockOnly:false, discountOnly:false, minRating:0 });
  const [visibleCount, setVisibleCount] = React.useState(6);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [wishlist, setWishlist] = React.useState((window._WISHLIST || []).map(w => w.id));
  const [toast, setToast] = React.useState(null);
  const [quickViewProduct, setQuickViewProduct] = React.useState(null);

  React.useEffect(() => { window._RECENT_SEARCHES = recents; }, [recents]);
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced live search
  React.useEffect(() => {
    if (!query.trim()) { setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [query]);

  function commitSearch(q) {
    const value = (q ?? query).trim();
    if (!value) return;
    setQuery(value);
    setCommitted(true);
    setFocused(false);
    setVisibleCount(6);
    setRecents(prev => [value, ...prev.filter(r => r.toLowerCase() !== value.toLowerCase())].slice(0, 8));
  }
  function clearSearch() {
    setQuery(''); setCommitted(false); setFocused(true);
    inputRef.current?.focus();
  }
  function removeRecent(term) {
    setRecents(prev => prev.filter(r => r !== term));
  }
  function toggleWish(p) {
    const already = wishlist.includes(p.id);
    if (already) {
      window._WISHLIST = (window._WISHLIST || []).filter(w => w.id !== p.id);
      setWishlist(prev => prev.filter(id => id !== p.id));
      setToast({ type:'success', message:'Removed from wishlist' });
    } else {
      window._WISHLIST = [...(window._WISHLIST || []), { id:p.id, name:p.title, variant:p.variant||'', price:p.price, oldPrice:p.oldPrice, discount:p.discount, category:p.category, brand:p.brand, inStock:p.inStock, addedAt:new Date().toISOString(), popularity:p.rating?Math.round(p.rating*20):50, tint:p.tint, alertOn:false }];
      setWishlist(prev => [...prev, p.id]);
      setToast({ type:'success', message:'Added to wishlist' });
    }
  }
  function addToCart(p) {
    if (!p.inStock) return;
    (window.CART_ITEMS || (window.CART_ITEMS = [])).push({ product:{ id:p.id, title:p.title, price:p.price }, qty:1, variant:p.variant||'', seller:p.brand });
    setToast({ type:'success', message:`${p.title} added to cart` });
  }
  function openProduct(p) { navigate('pdp', { product:p }); }
  function handleLoadMore() { setLoadingMore(true); setTimeout(() => { setVisibleCount(v => v + 6); setLoadingMore(false); }, 500); }

  const q = query.trim().toLowerCase();
  let results = q ? SEARCH_INDEX.filter(p =>
    p.title.toLowerCase().includes(q) || (p.category||'').includes(q) || (p.brand||'').toLowerCase().includes(q)
  ) : [];
  if (catTab !== 'all') results = results.filter(p => p.category === catTab);
  results = results.filter(p =>
    (filters.brand === 'all' || p.brand === filters.brand) &&
    (filters.color === 'all' || p.color === filters.color) &&
    p.price <= filters.maxPrice &&
    (!filters.inStockOnly || p.inStock) &&
    (!filters.discountOnly || p.discount) &&
    (p.rating || 0) >= filters.minRating
  );
  results = sortSearch(results, sortKey);
  const visibleResults = results.slice(0, visibleCount);

  const suggestions = q && !committed ? SEARCH_INDEX.filter(p => p.title.toLowerCase().includes(q)).slice(0, 5) : [];
  const brands = ['all', ...new Set(SEARCH_INDEX.map(p => p.brand))];
  const colors = ['all', ...new Set(SEARCH_INDEX.map(p => p.color))];
  const recentlyViewed = PRODUCTS.slice(0, 4);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '16px 32px' : '12px 16px', display:'flex', alignItems:'center', gap:10, width: isDesktop ? '100%' : undefined }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <div style={{ flex:1, height:42, display:'flex', alignItems:'center', gap:8, padding:'0 14px', borderRadius:9999, background:C.paper, border:`1.5px solid ${focused ? C.primary : C.hairline}`, boxShadow: focused ? `0 0 0 3px ${C.primarySoft}` : 'none', transition:'all .15s' }}>
            <Icon name="search" size={16} color={C.mute} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onKeyDown={e => { if (e.key === 'Enter') commitSearch(); }}
              placeholder="Search products, brands, categories…"
              style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}
            />
            {query && (
              <button onClick={clearSearch} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                <Icon name="x" size={16} color={C.mute} />
              </button>
            )}
          </div>
          <button onClick={() => navigate('cart')} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <Icon name="cart" size={21} color={C.ink} />
            <Badge count={(window.CART_ITEMS || []).length} />
          </button>
        </div>

        {/* Suggestions dropdown */}
        {focused && suggestions.length > 0 && (
          <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '0 32px 12px' : '0 16px 12px', width: isDesktop ? '100%' : undefined }}>
            <div style={{ background:C.white, border:`1px solid ${C.hairline}`, borderRadius:12, overflow:'hidden', boxShadow:'0 4px 16px rgba(14,11,31,0.08)' }}>
              {suggestions.map((s, i) => (
                <button key={s.id} onClick={() => commitSearch(s.title)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px', border:'none', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', background:'none', cursor:'pointer', textAlign:'left' }}>
                  <Icon name="search" size={14} color={C.mute} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>{s.title}{s.variant ? ` — ${s.variant}` : ''}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '16px 32px 0' : '12px 16px 0', width: isDesktop ? '100%' : undefined }}>

          {/* Pre-search: recent + popular + recently viewed */}
          {!committed && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {recents.length > 0 && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Recent Searches</span>
                    <button onClick={() => setRecents([])} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>Clear All</button>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {recents.map(r => (
                      <div key={r} style={{ display:'inline-flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'7px 8px 7px 14px', background:C.white }}>
                        <button onClick={() => commitSearch(r)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{r}</button>
                        <button onClick={() => removeRecent(r)} style={{ border:'none', background:C.paper, borderRadius:9999, width:18, height:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Icon name="x" size={10} color={C.mute} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {POPULAR_SEARCHES.length > 0 && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                  <Icon name="zap" size={15} color={C.primary} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Trending Searches</span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {POPULAR_SEARCHES.map(t => (
                    <Chip key={t} onClick={() => commitSearch(t)}>{t}</Chip>
                  ))}
                </div>
              </div>
              )}

              {recentlyViewed.length > 0 && (
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:10 }}>Recently Viewed</div>
                <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr', gap:12 }}>
                  {recentlyViewed.map((p, i) => (
                    <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} />
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {/* Results */}
          {committed && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                <div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Results for "{query}"</span>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:2 }}>{loading ? 'Searching…' : `${results.length} results found`}</div>
                </div>
                <button onClick={clearSearch} style={{ border:'none', background:C.primarySoft, color:C.primaryDeep, borderRadius:9999, padding:'7px 14px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, flexShrink:0 }}>Clear</button>
              </div>

              <div style={{ display:'flex', gap:8, overflowX:'auto', padding:'12px 0' }}>
                {CAT_TABS.map(c => (
                  <button key={c.key} onClick={() => setCatTab(c.key)} style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:6, border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 14px', background: catTab===c.key ? C.primary : C.white, color: catTab===c.key ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, boxShadow: catTab===c.key ? 'none' : '0 1px 4px rgba(14,11,31,0.06)' }}>
                    <Icon name={c.icon} size={13} color={catTab===c.key ? '#fff' : C.mute} />
                    {c.label}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:14 }}>
                <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer', flexShrink:0 }}>
                  <Icon name="sliders" size={14} color={C.ink} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Filters</span>
                </button>
                <button onClick={() => setSortOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer', minWidth:0 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink, whiteSpace:'nowrap' }}>{SORTS.find(s=>s.key===sortKey).label}</span>
                  <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)', flexShrink:0 }} />
                </button>
                <div style={{ marginLeft:'auto', display:'flex', border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:2, background:C.white, flexShrink:0 }}>
                  <button onClick={() => setView('grid')} style={{ width:30, height:30, borderRadius:9999, border:'none', background: view==='grid' ? C.primarySoft : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="grid" size={14} color={view==='grid' ? C.primary : C.mute} />
                  </button>
                  <button onClick={() => setView('list')} style={{ width:30, height:30, borderRadius:9999, border:'none', background: view==='list' ? C.primarySoft : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="list" size={14} color={view==='list' ? C.primary : C.mute} />
                  </button>
                </div>
              </div>

              {loading && (
                <div style={{ display: view==='grid' ? 'grid' : 'flex', flexDirection: view==='grid' ? undefined : 'column', gridTemplateColumns: view==='grid' ? (isDesktop?'repeat(5,1fr)':'1fr 1fr') : undefined, gap:12 }}>
                  {[...Array(view==='grid'?6:3)].map((_, i) => <SearchSkeleton key={i} grid={view==='grid'} />)}
                </div>
              )}

              {!loading && results.length === 0 && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 20px', gap:14 }}>
                  <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="search" size={36} color={C.primary} />
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No results for "{query}"</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:280 }}>Try different keywords, check your spelling, or browse our categories instead.</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                    {POPULAR_SEARCHES.slice(0,4).map(t => <Chip key={t} onClick={() => commitSearch(t)}>{t}</Chip>)}
                  </div>
                  <Btn variant="primary" size="md" onClick={() => navigate('categories')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>Browse Categories</Btn>
                </div>
              )}

              {!loading && visibleResults.length > 0 && view === 'list' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {visibleResults.map(p => (
                    <SearchResultRow key={p.id} p={p} wished={wishlist.includes(p.id)} onOpen={openProduct} onToggleWish={toggleWish} onAddToCart={addToCart} onQuickView={setQuickViewProduct} />
                  ))}
                </div>
              )}

              {!loading && visibleResults.length > 0 && view === 'grid' && (
                <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                  {visibleResults.map((p, i) => (
                    <ProductCard key={p.id} product={p} size="md" tint={p.tint} specs={p.variant} onPress={() => openProduct(p)} onAddToCart={() => addToCart(p)} />
                  ))}
                </div>
              )}

              {!loading && visibleCount < results.length && (
                <div style={{ textAlign:'center', marginTop:16 }}>
                  <button onClick={handleLoadMore} disabled={loadingMore} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
                    {loadingMore ? 'Loading…' : 'Load More Results'}
                  </button>
                </div>
              )}

              {!loading && results.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                    <Icon name="zap" size={15} color={C.primary} />
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Trending Searches</span>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {POPULAR_SEARCHES.map(t => <Chip key={t} onClick={() => commitSearch(t)}>{t}</Chip>)}
                  </div>
                </div>
              )}
            </div>
          )}
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
      <Modal open={filterOpen} title="Filter Results" onClose={() => setFilterOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Brand</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {brands.map(b => <Chip key={b} active={filters.brand === b} onClick={() => setFilters(f => ({ ...f, brand:b }))}>{b === 'all' ? 'All' : b}</Chip>)}
            </div>
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Color</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {colors.map(c => <Chip key={c} active={filters.color === c} onClick={() => setFilters(f => ({ ...f, color:c }))}>{c === 'all' ? 'All' : c}</Chip>)}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Max Price</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary }}>${filters.maxPrice}</span>
            </div>
            <input type="range" min="0" max="1500" step="10" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))} style={{ width:'100%', accentColor: C.primary }} />
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Minimum Rating</div>
            <div style={{ display:'flex', gap:8 }}>
              {[0,3,4,4.5].map(r => (
                <Chip key={r} active={filters.minRating === r} onClick={() => setFilters(f => ({ ...f, minRating:r }))}>{r === 0 ? 'Any' : `${r}+ ★`}</Chip>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>In Stock Only</span>
            <Switch checked={filters.inStockOnly} onChange={v => setFilters(f => ({ ...f, inStockOnly:v }))} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Discounted Only</span>
            <Switch checked={filters.discountOnly} onChange={v => setFilters(f => ({ ...f, discountOnly:v }))} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setFilters({ brand:'all', color:'all', maxPrice:1500, inStockOnly:false, discountOnly:false, minRating:0 })}>Reset</Btn>
            <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => setFilterOpen(false)}>Apply</Btn>
          </div>
        </div>
      </Modal>

      <QuickViewSheet product={quickViewProduct} onClose={() => setQuickViewProduct(null)} onAddToCart={p => { addToCart(p); setQuickViewProduct(null); }} onViewDetails={p => { setQuickViewProduct(null); openProduct(p); }} />

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

Object.assign(window, { SearchScreen });
