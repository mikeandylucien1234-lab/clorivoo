// screen-store.jsx — Public Seller Store Page

const STORE_SELLER = {
  id:'luxe-store', name:'Luxe Store', verified:true, rating:4.8, reviews:256, followers:1247,
  memberSince:'2023-01-01', level:'Gold Seller', location:'Port-au-Prince, Haiti', responseTime:'Under 2 hours',
  bio:'Your one-stop shop for premium electronics, fashion and home goods at unbeatable prices. Trusted by thousands of happy customers across Haiti.',
  shipping:'Ships within 1–2 business days via Flash Express.',
  returns:'Free returns within 7 days of delivery, no questions asked.',
  hours:'Monday – Saturday, 9:00 AM – 6:00 PM',
  phone:'+509 34 56 78 90', email:'contact@luxestore.com',
};

const STORE_BANNERS = [
  { id:1, title:'Flash Sale Today',   subtitle:'Up to 50% off electronics', tint:0, active:true },
  { id:2, title:'New Arrivals',       subtitle:'This week\'s freshest drops', tint:1, active:true },
  { id:3, title:'Free Shipping',      subtitle:'On all orders over $50',    tint:2, active:true },
  { id:4, title:'Member Rewards',     subtitle:'Earn cashback on every order', tint:3, active:true },
];

const STORE_ANNOUNCEMENTS = [
  '🔥 Flash Sale Today — up to 50% off electronics',
  '🚚 Free Shipping on orders over $50',
  '🎉 New Arrivals just dropped — check them out',
];

const STORE_CATEGORIES = [
  { key:'smartphones', label:'Smartphones', icon:'smartphone', count:24 },
  { key:'electronics', label:'Electronics', icon:'zap',        count:18 },
  { key:'accessories', label:'Accessories', icon:'headphones', count:35 },
  { key:'fashion',     label:'Fashion',     icon:'shoppingBag',count:22 },
  { key:'home',        label:'Home',        icon:'home',       count:16 },
];

const STORE_REVIEWS = [
  { id:1, name:'Marc D.',  verified:true,  rating:5, date:'2024-05-12', comment:'Excellent service and quality products. Fast delivery and well packaged. I recommend!', images:[0,1], reply:null },
  { id:2, name:'Sophia R.', verified:true, rating:5, date:'2024-05-08', comment:'The iPhone arrived in perfect condition, exactly as described. Will buy again from this store.', images:[], reply:'Thank you so much for your kind words, Sophia! 🙏' },
  { id:3, name:'Jean P.',  verified:true,  rating:4, date:'2024-05-02', comment:'Good product overall, delivery took a bit longer than expected but support was very responsive.', images:[], reply:null },
  { id:4, name:'Alicia M.', verified:false, rating:5, date:'2024-04-27', comment:'Beautiful handbag, great quality leather. Exceeded my expectations!', images:[2], reply:null },
  { id:5, name:'Kevin T.', verified:true,  rating:3, date:'2024-04-20', comment:'Product is fine but packaging could be improved.', images:[], reply:'Thanks for the feedback, we\'ll work on it!' },
  { id:6, name:'Nadia F.', verified:true,  rating:5, date:'2024-04-14', comment:'Best seller on CLORIVO! Always fast, always genuine products.', images:[], reply:null },
];
const RATING_BREAKDOWN = [ { stars:5, pct:82 }, { stars:4, pct:12 }, { stars:3, pct:4 }, { stars:2, pct:1 }, { stars:1, pct:1 } ];

const SORTS = [
  { key:'popular', label:'Popular' },
  { key:'newest',  label:'Latest' },
  { key:'price_low', label:'Lowest Price' },
  { key:'price_high', label:'Highest Price' },
  { key:'rating', label:'Top Rated' },
];
function sortProducts(items, key) {
  const arr = [...items];
  if (key === 'price_low')  arr.sort((a,b) => a.price - b.price);
  if (key === 'price_high') arr.sort((a,b) => b.price - a.price);
  if (key === 'rating')     arr.sort((a,b) => (b.rating||0) - (a.rating||0));
  if (key === 'newest')     arr.sort((a,b) => b.id - a.id);
  return arr;
}

// ─── ANNOUNCEMENT MARQUEE ───────────────────────────────────────
function AnnouncementBar({ items }) {
  const [paused, setPaused] = React.useState(false);
  const { navigate } = useNav();
  const text = items.join('     •     ');
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

// ─── BANNER CAROUSEL ─────────────────────────────────────────
function BannerCarousel({ banners }) {
  const active = banners.filter(b => b.active);
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
          <div key={b.id} onClick={() => i === index && navigate('categories')} style={{ position:'absolute', inset:0, opacity: i === index ? 1 : 0, transition:'opacity 0.4s ease', pointerEvents: i === index ? 'auto' : 'none' }}>
            <Img label="" tint={b.tint} style={{ width:'100%', height:'100%' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(14,11,31,0.55) 0%, rgba(14,11,31,0.05) 70%)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'0 18px' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:'#fff' }}>{b.title}</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.9)', marginTop:2 }}>{b.subtitle}</span>
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

// ─── SELLER STORE PAGE ─────────────────────────────────────────
function SellerStoreScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const seller = STORE_SELLER;

  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('home');
  const [following, setFollowing] = React.useState(() => (window._FOLLOWED_SHOPS || []).includes(seller.id));
  const [followers, setFollowers] = React.useState(seller.followers);
  const [toast, setToast] = React.useState(null);

  const [sortKey, setSortKey] = React.useState('popular');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({ category:'all', maxPrice:200, discountOnly:false });
  const [catFilter, setCatFilter] = React.useState('all');
  const [visibleCount, setVisibleCount] = React.useState(6);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reviewCount, setReviewCount] = React.useState(3);

  React.useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  function toggleFollow() {
    const list = window._FOLLOWED_SHOPS || (window._FOLLOWED_SHOPS = []);
    if (following) {
      window._FOLLOWED_SHOPS = list.filter(id => id !== seller.id);
      setFollowers(f => f - 1);
      setToast({ type:'success', message:`Unfollowed ${seller.name}` });
    } else {
      window._FOLLOWED_SHOPS = [...list, seller.id];
      setFollowers(f => f + 1);
      setToast({ type:'success', message:`Now following ${seller.name}` });
    }
    setFollowing(f => !f);
  }
  function addToCart(p) {
    (window.CART_ITEMS || (window.CART_ITEMS = [])).push({ product:p, qty:1, variant:'', seller: seller.name });
    setToast({ type:'success', message:`${p.title} added to cart` });
  }
  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => { setVisibleCount(v => v + 6); setLoadingMore(false); }, 500);
  }

  let filteredProducts = PRODUCTS.filter(p =>
    (filters.category === 'all' || p.category === filters.category) &&
    p.price <= filters.maxPrice &&
    (!filters.discountOnly || p.discount)
  );
  if (catFilter !== 'all') filteredProducts = filteredProducts.filter(p => p.category === catFilter);
  filteredProducts = sortProducts(filteredProducts, sortKey);
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const tabs = [
    { key:'home', label:'Home' },
    { key:'products', label:'All Products' },
    { key:'categories', label:'Categories' },
    { key:'reviews', label:`Reviews (${seller.reviews})` },
    { key:'about', label:'About' },
  ];

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
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{seller.name}</span>
            </div>
            <div style={{ display:'flex', gap:2, alignItems:'center' }}>
              <button onClick={() => setToast({ type:'success', message:'Opening search…' })} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="search" size={20} color={C.ink} />
              </button>
              <button onClick={() => navigate('cart')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <Icon name="cart" size={21} color={C.ink} />
                <Badge count={(window.CART_ITEMS || []).length} />
              </button>
              <button onClick={() => setToast({ type:'success', message:'More options' })} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="moreHorizontal" size={19} color={C.ink} sw={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnnouncementBar items={STORE_ANNOUNCEMENTS} />

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, padding: isDesktop ? '20px 32px 0' : undefined }}>

          {loading ? (
            <div style={{ margin: isDesktop ? 0 : '12px 16px 0', borderRadius:20, height:170, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
          ) : (
            <div style={{ margin: isDesktop ? 0 : '12px 16px 0', borderRadius:20, background:`linear-gradient(135deg, ${C.primaryDeep} 0%, ${C.primary} 100%)`, padding:'18px 18px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', right:-30, top:-30, width:150, height:150, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
              <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
                <div style={{ width:64, height:64, borderRadius:14, background:'#1A1420', border:'2px solid rgba(255,255,255,0.3)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="crown" size={18} color="#F5C542" />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:7, fontWeight:800, color:'#F5C542', letterSpacing:'0.04em', marginTop:2 }}>LUXE</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:'#fff' }}>{seller.name}</span>
                    {seller.verified && (
                      <div style={{ width:16, height:16, borderRadius:9999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name="check" size={9} color={C.primary} sw={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2 }}>Member since {new Date(seller.memberSince).toLocaleDateString('en-US', { month:'long', year:'numeric' })}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                    <StarRow rating={seller.rating} size={12} />
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:'#fff' }}>{seller.rating}</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.8)' }}>({seller.reviews} reviews)</span>
                  </div>
                </div>
                <Btn variant={following ? 'secondary' : 'primary'} size="sm" onClick={toggleFollow} style={following ? { background:'rgba(255,255,255,0.15)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.4)' } : { background:'#fff', color:C.primaryDeep }}>
                  {following ? 'Following' : 'Follow'}
                </Btn>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.85)', marginTop:10, position:'relative' }}>
                {followers.toLocaleString()} followers · {seller.level}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:12, position:'relative' }}>
                {[
                  { icon:'truck', label:'Fast Delivery', sub:'2–3 business days' },
                  { icon:'package', label:'Authentic Products', sub:'100% guaranteed' },
                  { icon:'headphones', label:'Responsive Support', sub:'Replies within 24h' },
                ].map((c, i) => (
                  <div key={i} style={{ flex:1, background:'rgba(255,255,255,0.14)', borderRadius:12, padding:'8px 8px', textAlign:'center' }}>
                    <Icon name={c.icon} size={15} color="#fff" style={{ margin:'0 auto' }} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff', marginTop:4 }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <BannerCarousel banners={STORE_BANNERS} />

                <div style={{ background:C.primarySoft, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="shoppingBag" size={17} color={C.primary} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primaryDeep }}>Welcome to {seller.name}!</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep }}>Premium products at the best prices. Quality and satisfaction guaranteed.</div>
                  </div>
                  <button onClick={() => setTab('about')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.primary, flexShrink:0 }}>More</button>
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Categories</span>
                    <button onClick={() => setTab('categories')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>See All</button>
                  </div>
                  <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
                    {STORE_CATEGORIES.map(c => (
                      <button key={c.key} onClick={() => { setCatFilter(c.key); setTab('products'); }} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', flexShrink:0, width:76 }}>
                        <div style={{ width:56, height:56, borderRadius:16, background:C.white, boxShadow:'0 2px 8px rgba(14,11,31,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Icon name={c.icon} size={23} color={C.primary} />
                        </div>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.ink, textAlign:'center' }}>{c.label}</span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color:C.mute }}>{c.count} items</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Popular Products</span>
                    <button onClick={() => setTab('products')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>See All</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                    {sortProducts(PRODUCTS, 'rating').slice(0, isDesktop ? 5 : 4).map((p, i) => (
                      <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} onAddToCart={() => addToCart(p)} />
                    ))}
                  </div>
                </div>

                <Btn variant="secondary" size="md" wide onClick={() => setTab('products')}>
                  <Icon name="grid" size={16} color={C.ink} /> View All Products
                </Btn>
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

                <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
                  {visibleProducts.map((p, i) => (
                    <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} onAddToCart={() => addToCart(p)} />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <div style={{ textAlign:'center', padding:'50px 20px' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No products match your filters</span>
                  </div>
                )}
                {visibleCount < filteredProducts.length && (
                  <div style={{ textAlign:'center', marginTop:16 }}>
                    <button onClick={handleLoadMore} disabled={loadingMore} style={{ border:`1.5px solid ${C.primary}`, background:C.white, borderRadius:9999, height:42, padding:'0 24px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.primary }}>
                      {loadingMore ? 'Loading…' : 'Load More Products'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CATEGORIES TAB */}
            {tab === 'categories' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {STORE_CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => { setCatFilter(c.key); setTab('products'); }} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:14, padding:'14px 16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name={c.icon} size={20} color={C.primary} />
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
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:34, fontWeight:800, color:C.ink }}>{seller.rating}</div>
                    <StarRow rating={seller.rating} size={14} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:4 }}>Based on {seller.reviews} reviews</div>
                  </div>
                  <div style={{ flex:1, minWidth:160, display:'flex', flexDirection:'column', gap:5 }}>
                    {RATING_BREAKDOWN.map(r => (
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

                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {STORE_REVIEWS.slice(0, reviewCount).map(r => (
                    <div key={r.id} style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                        <Avatar size={38} initials={r.name.split(' ').map(n=>n[0]).join('')} />
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{r.name}</span>
                            {r.verified && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:800, color:C.success, background:'#ECFDF5', borderRadius:6, padding:'2px 6px' }}>Verified Purchase</span>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                            <StarRow rating={r.rating} size={11} />
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(r.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, lineHeight:1.5, marginBottom: r.images.length || r.reply ? 10 : 0 }}>{r.comment}</div>
                      {r.images.length > 0 && (
                        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                          {r.images.map(t => <Img key={t} label="" tint={t} style={{ width:56, height:56, borderRadius:10 }} />)}
                        </div>
                      )}
                      {r.reply && (
                        <div style={{ background:C.primarySoft, borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
                          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:C.primaryDeep, marginBottom:2 }}>Reply from {seller.name}</div>
                          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.primaryDeep }}>{r.reply}</div>
                        </div>
                      )}
                      <button onClick={() => setToast({ type:'success', message:'Thanks for your feedback!' })} style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer' }}>
                        <Icon name="thumbsUp" size={14} color={C.mute} />
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Helpful</span>
                      </button>
                    </div>
                  ))}
                </div>

                {reviewCount < STORE_REVIEWS.length && (
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
                <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:8 }}>About This Seller</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.6 }}>{seller.bio}</div>
                </div>

                <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                  {[
                    { icon:'store', label:'Store Name', value: seller.name },
                    { icon:'user',  label:'Seller Type', value:'Professional Seller' },
                    { icon:'calendar', label:'Member Since', value: new Date(seller.memberSince).toLocaleDateString('en-US', { month:'long', year:'numeric' }) },
                    { icon:'mapPin', label:'Address', value: seller.location },
                    { icon:'clock',  label:'Response Time', value: seller.responseTime },
                  ].map((row, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                      <Icon name={row.icon} size={17} color={C.mute} />
                      <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{row.label}</span>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, textAlign:'right' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Store Policies</div>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <Icon name="truck" size={17} color={C.primary} style={{ flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Shipping Policy</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{seller.shipping}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <Icon name="refreshCw" size={17} color={C.primary} style={{ flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Return Policy</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{seller.returns}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <Icon name="clock" size={17} color={C.primary} style={{ flexShrink:0, marginTop:1 }} />
                    <div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Business Hours</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{seller.hours}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Contact Information</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Icon name="mail" size={16} color={C.mute} />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{seller.email}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Icon name="smartphone" size={16} color={C.mute} />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{seller.phone}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    {['globe', 'camera', 'messageSquare'].map((ic, i) => (
                      <button key={i} onClick={() => setToast({ type:'success', message:'Opening link…' })} style={{ width:38, height:38, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name={ic} size={16} color={C.ink} />
                      </button>
                    ))}
                  </div>
                </div>

                <Btn variant="primary" size="lg" wide onClick={() => navigate('chat', { shopName: seller.name })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
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
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Category</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['all', ...new Set(PRODUCTS.map(p=>p.category))].map(c => (
                <Chip key={c} active={filters.category === c} onClick={() => setFilters(f => ({ ...f, category:c }))}>{c === 'all' ? 'All' : c.charAt(0).toUpperCase()+c.slice(1)}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Max Price</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary }}>${filters.maxPrice}</span>
            </div>
            <input type="range" min="0" max="200" step="5" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))} style={{ width:'100%', accentColor: C.primary }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Discounted Only</span>
            <Switch checked={filters.discountOnly} onChange={v => setFilters(f => ({ ...f, discountOnly:v }))} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setFilters({ category:'all', maxPrice:200, discountOnly:false })}>Reset</Btn>
            <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => setFilterOpen(false)}>Apply</Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { SellerStoreScreen });
