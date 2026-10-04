// screen-home.jsx — Homepage A : deals feed

function HomeScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab]           = React.useState(0);
  const [activeCategory, setActiveCategory] = React.useState(0);
  const [cartCount, setCartCount]           = React.useState(window.CART_ITEMS.length);
  const [products, setProducts]             = React.useState(PRODUCTS.map((p,i) => ({...p, tint: i%5})));
  const [shops, setShops]                   = React.useState(null);
  const [banners, setBanners]               = React.useState(null);
  const [user, setUser]                     = React.useState(null);
  const [activeBanner, setActiveBanner]     = React.useState(0);

  const categories = ['All', 'Home', 'Tech', 'Beauty', 'Fashion', 'Kids'];

  React.useEffect(() => {
    sbGetUser().then(u => setUser(u));
    sbGetProducts({ limit: 12 }).then(({ data }) => { if (data?.length) setProducts(data.map((p,i) => ({...p, tint: i%5}))); });
    sbGetShops({ limit: 8 }).then(({ data }) => { if (data?.length) setShops(data); });
    sbGetBanners().then(({ data }) => { if (data?.length) setBanners(data); });
    if (window._supabase) {
      sbGetUser().then(async u => {
        if (u) {
          const { data } = await sbGetCart(u.id);
          setCartCount(data?.length ?? 0);
        }
      });
    }
  }, []);

  const heroBanners = (banners && banners.length) ? banners : [
    { id:'default', title:'Up to 70% off\nHome & Kitchen', subtitle:'Spring sale', cta_text:'Shop now', bg_color:C.primary },
  ];
  const heroBannerRaw = heroBanners[activeBanner % heroBanners.length] || heroBanners[0];
  const heroBanner = { ...heroBannerRaw, title: (heroBannerRaw.title || '').split('\n').flatMap((line, i) => i === 0 ? [line] : [<br key={i} />, line]) };

  React.useEffect(() => {
    if (heroBanners.length <= 1) return;
    const id = setInterval(() => setActiveBanner(i => (i + 1) % heroBanners.length), 4500);
    return () => clearInterval(id);
  }, [heroBanners.length]);

  const flashDeals = products.slice(0, 4);
  const forYou     = products.slice(2, 8);
  const displayShops = shops ?? [
    { id:'demo-s1', name:'luna.studio',    brand_color:'#C97B5A', is_verified:true,  initial:'L', online:true  },
    { id:'demo-s2', name:'TechZone',       brand_color:'#4A6FD4', is_verified:true,  initial:'T', online:true  },
    { id:'demo-s3', name:'Fashion House',  brand_color:'#9B59B6', is_verified:true,  initial:'F', online:false },
    { id:'demo-s4', name:'ceramix.co',     brand_color:'#7A8A6A', is_verified:true,  initial:'C', online:true  },
    { id:'demo-s5', name:'Luxe Store',     brand_color:'#1A1A2E', is_verified:true,  initial:'L', online:false },
    { id:'demo-s6', name:'nature.home',    brand_color:'#27AE60', is_verified:false, initial:'N', online:true  },
    { id:'demo-s7', name:'ElectroWorld',   brand_color:'#E67E22', is_verified:true,  initial:'E', online:false },
  ];
  const userName  = user?.user_metadata?.full_name?.split(' ')[0] ?? 'there';
  const userInitials = user?.user_metadata?.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() ?? 'AM';

  function goTab(i) {
    if (i === 1) navigate('categories');
    else if (i === 2) navigate('cart');
    else if (i === 3) navigate('tracking');
    else if (i === 4) navigate('profile');
    else setActiveTab(i);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: C.paper, display: 'flex', flexDirection: 'column' }}>
      <StatusBar />

      {/* Top bar */}
      {!isDesktop && (
      <div style={{ paddingTop: STATUS_H, background: C.white, borderBottom: `1px solid ${C.hairline}`, flexShrink: 0 }}>
        <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Greeting + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={42} initials={userInitials} />
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.mute, lineHeight: 1.2 }}>Hello 👋</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 17, color: C.ink, letterSpacing: '-0.03em', lineHeight: 1.2 }}>{userName}</div>
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => navigate('cart')} style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon name="cart" size={22} color={C.ink} />
              {cartCount > 0 && <Badge count={cartCount} />}
            </button>
            <button onClick={() => navigate('messages-list')} style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon name="messageSquare" size={22} color={C.ink} />
              <Badge count={2} />
            </button>
            <button onClick={() => navigate('notifications')} style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Icon name="bell" size={22} color={C.ink} />
              <Badge count={3} />
            </button>
          </div>
        </div>

        {/* Delivery address strip */}
        <div onClick={() => navigate('profile')} style={{ margin: '10px 20px 0', display: 'flex', alignItems: 'center', gap: 8, background: C.primarySoft, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
          <Icon name="mapPin" size={15} color={C.primary} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.mute }}>Deliver to · </span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.primaryDeep }}>14 Roquette Street, 75011 Paris</span>
          </div>
          <Icon name="chevronRight" size={14} color={C.primary} />
        </div>

        {/* Search bar */}
        <div onClick={() => navigate('search')} style={{ margin: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, background: C.paper, border: `1.5px solid ${C.hairline}`, borderRadius: 12, padding: '11px 14px', cursor: 'text' }}>
          <Icon name="search" size={18} color={C.mute} />
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.mute, flex: 1 }}>Search on Clorivo…</span>
          <div style={{ width: 1, height: 16, background: C.hairline }} />
          <Icon name="camera" size={18} color={C.mute} />
        </div>

        {/* Category chips */}
        <div style={{ display: 'flex', gap: 8, padding: '4px 20px 12px', overflowX: 'auto' }}>
          {categories.map((c, i) =>
          <Chip key={i} active={activeCategory === i} onClick={() => navigate('category', { category: c })}>{c}</Chip>
          )}
        </div>
      </div>
      )}

      {isDesktop && (
        <div style={{ background: C.white, borderBottom: `1px solid ${C.hairline}`, flexShrink: 0 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 8, padding: '14px 32px', overflowX: 'auto' }}>
            {categories.map((c, i) =>
            <Chip key={i} active={activeCategory === i} onClick={() => navigate('category', { category: c })}>{c}</Chip>
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined }}>

        {/* Hero banner — admin-managed (Admin Console › Banners › Homepage Banners) */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ borderRadius: 16, position: 'relative', overflow: 'hidden', minHeight: 150, background: heroBanner.image_url ? '#1A1630' : `linear-gradient(135deg, ${heroBanner.bg_color || heroBanner.color || C.primary} 0%, ${C.primaryDeep} 100%)` }}>
            {heroBanner.image_url ? (
              <>
                <img src={heroBanner.image_url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.5) 100%)' }} />
              </>
            ) : (
              <>
                <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: 9999, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ position: 'absolute', right: 20, bottom: -30, width: 90, height: 90, borderRadius: 9999, background: 'rgba(255,255,255,0.05)' }} />
              </>
            )}
            <div style={{ position: 'relative', padding: '18px 20px' }}>
              {heroBanner.subtitle && (
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{heroBanner.subtitle}</div>
              )}
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12 }}>{heroBanner.title}</div>
              <button onClick={() => navigate('search')} style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 9999, padding: '8px 18px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff' }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600 }}>{heroBanner.cta_text || 'Shop now'}</span>
                <Icon name="arrowLeft" size={14} color="#fff" style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          </div>
          {/* Banner dots */}
          {heroBanners.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 8 }}>
              {heroBanners.map((b, i) => (
                <button key={b.id ?? i} onClick={() => setActiveBanner(i)} style={{ width: i === activeBanner ? 16 : 5, height: 5, borderRadius: 9999, background: i === activeBanner ? C.primary : C.hairline, transition: 'all 0.3s', border: 'none', padding: 0, cursor: 'pointer' }} />
              ))}
            </div>
          )}
        </div>

        {/* clori+ promo strip + shortcuts */}
        <div style={{ padding: '14px 20px 0' }}>
          {/* Promo banner */}
          <div onClick={() => {}} style={{ display:'flex', alignItems:'center', gap:10, background:`linear-gradient(90deg, ${C.primarySoft} 0%, #E4DCFF 100%)`, borderRadius:12, padding:'10px 14px', marginBottom:16, cursor:'pointer' }}>
            <div style={{ background:C.primary, borderRadius:9999, padding:'4px 10px', flexShrink:0 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>clori+</span>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primaryDeep, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Try 1 month: free express shipping</span>
            <Icon name="chevronRight" size={16} color={C.primaryDeep} style={{ flexShrink:0 }} />
          </div>

          {/* Shortcuts strip */}
          <div style={{ display:'flex', gap:20, overflowX:'auto', paddingBottom:4 }}>
            {[
              { icon:'tag',        label:'Deals',       ic:'#D97706', badge:null,      badgeBg:null       },
              { icon:'share',      label:'Referrals',   ic:'#059669', badge:'EARN $',  badgeBg:C.success  },
              { icon:'zap',        label:'Flash Live',  ic:C.primary, badge:'LIVE',     badgeBg:C.danger   },
              { icon:'star',       label:'Coupons',     ic:'#2563EB', badge:null,       badgeBg:null       },
              { icon:'store',      label:'Shops',       ic:'#DB2777', badge:null,       badgeBg:null       },
              { icon:'package',    label:'Tracking',    ic:'#EA580C', badge:null,       badgeBg:null       },
              { icon:'creditCard', label:'Payments',    ic:'#16A34A', badge:'NEW',      badgeBg:'#2563EB'  },
            ].map((s, i) => (
              <div key={i} onClick={() => {}} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0, cursor:'pointer', width:52 }}>
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:34 }}>
                  <Icon name={s.icon} size={28} color={s.ic} sw={1.5} />
                  {s.badge && (
                    <div style={{ position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)', background:s.badgeBg, borderRadius:9999, padding:'2px 6px', whiteSpace:'nowrap', boxShadow:'0 1px 4px rgba(0,0,0,0.15)' }}>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:800, color:'#fff', letterSpacing:'0.02em' }}>{s.badge}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:500, color:C.ink, textAlign:'center', lineHeight:1.2, marginTop: s.badge ? 6 : 0 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Shops */}
        <div style={{ padding: '20px 20px 0' }}>
          <SectionHeader title="Popular Shops" onSeeAll={() => {}} style={{ marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {displayShops.map((shop, i) => {
              const initial = shop.initial ?? shop.name?.[0]?.toUpperCase() ?? 'S';
              const color   = shop.brand_color ?? '#6C4DFF';
              return (
                <div key={shop.id ?? i} onClick={() => {}} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flexShrink:0, cursor:'pointer', width:60 }}>
                  <div style={{ position:'relative' }}>
                    {shop.logo_url ? (
                      <img src={shop.logo_url} style={{ width:54, height:54, borderRadius:9999, objectFit:'cover', border:`2px solid ${C.hairline}` }} />
                    ) : (
                      <div style={{ width:54, height:54, borderRadius:9999, background:color, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.hairline}` }}>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:22, color:'#fff', letterSpacing:'-0.03em' }}>{initial}</span>
                      </div>
                    )}
                    {shop.is_verified && (
                      <div style={{ position:'absolute', bottom:1, right:1, width:17, height:17, borderRadius:9999, background:C.primary, border:`2px solid ${C.white}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="check" size={9} color="#fff" sw={3} />
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:500, color:C.ink, textAlign:'center', lineHeight:1.2, width:60, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shop.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flash Deals + Super Deals — side by side */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display:'flex', gap:10, background:C.white, borderRadius:16, padding:12, boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>

            {/* Flash Deals */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <Icon name="zap" size={13} color={C.primary} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.ink }}>Flash Deals</span>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:C.primary, background:C.primarySoft, borderRadius:9999, padding:'2px 6px' }}>01:42</span>
              </div>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                {PRODUCTS.slice(0,2).map((p,i) => (
                  <div key={p.id} onClick={() => navigate('pdp',{product:p})} style={{ flex:1, borderRadius:10, background:C.paper, overflow:'hidden', cursor:'pointer' }}>
                    <div style={{ position:'relative' }}>
                      <Img label="" tint={i} style={{ width:'100%', height:80, borderRadius:0 }} />
                      {p.discount && <div style={{ position:'absolute', top:4, left:4, background:C.primarySoft, color:C.primaryDeep, fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:9999 }}>-{p.discount}%</div>}
                    </div>
                    <div style={{ padding:'5px 6px' }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginBottom:2 }}>{p.title}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:C.primary }}>${p.price.toFixed(2)}</div>
                      {p.oldPrice && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => {}} style={{ width:'100%', height:30, border:`1.5px solid ${C.primary}`, borderRadius:9999, background:'transparent', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.primary }}>See all →</button>
            </div>

            {/* Divider */}
            <div style={{ width:1, background:C.hairline, flexShrink:0 }} />

            {/* Super Deals */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <Icon name="tag" size={13} color={'#D97706'} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.ink }}>Super Deals</span>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:'#D97706', background:'#FEF3C7', borderRadius:9999, padding:'2px 6px' }}>-70%</span>
              </div>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                {PRODUCTS.slice(2,4).map((p,i) => (
                  <div key={p.id} onClick={() => navigate('pdp',{product:p})} style={{ flex:1, borderRadius:10, background:C.paper, overflow:'hidden', cursor:'pointer' }}>
                    <div style={{ position:'relative' }}>
                      <Img label="" tint={i+2} style={{ width:'100%', height:80, borderRadius:0 }} />
                      {p.discount && <div style={{ position:'absolute', top:4, left:4, background:'#FEF3C7', color:'#D97706', fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:9999 }}>-{p.discount}%</div>}
                    </div>
                    <div style={{ padding:'5px 6px' }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginBottom:2 }}>{p.title}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:'#D97706' }}>${p.price.toFixed(2)}</div>
                      {p.oldPrice && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => {}} style={{ width:'100%', height:30, border:'1.5px solid #D97706', borderRadius:9999, background:'transparent', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:'#D97706' }}>See all →</button>
            </div>

          </div>
        </div>

        {/* Category Tiles */}
        <div style={{ padding: '20px 20px 0' }}>
          <SectionHeader title="Popular Categories" style={{ marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : '1fr 1fr', gap: 10 }}>
            {[
            { label: 'Home & Decor', tint: 0, sub: '1,200+ items', cat:'Home' },
            { label: 'Fashion & Style', tint: 1, sub: '3,400+ items', cat:'Fashion' },
            { label: 'Tech & Gadgets', tint: 2, sub: '890 items', cat:'Tech' },
            { label: 'Beauty & Care', tint: 3, sub: '560 items', cat:'Beauty' }].
            map((cat, i) =>
            <div key={i} onClick={() => navigate('category', { category: cat.cat })} style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(14,11,31,0.06)', position: 'relative', height: 110 }}>
                <Img label="" tint={cat.tint} style={{ position: 'absolute', inset: 0, borderRadius: 0 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(14,11,31,0.55) 0%, rgba(14,11,31,0.1) 60%)' }} />
                <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{cat.label}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{cat.sub}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Promo Banners */}
        <div style={{ padding: '20px 20px 0' }}>
          <SectionHeader title="Exclusive Offers" onSeeAll={() => {}} style={{ marginBottom: 12 }} />
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
            {[
              { color:'#059669', badge:'Exclusive · first order', oldPrice:'$39.99', price:'$24.50', desc:'Ribbed Terracotta Vase · M',   tint:0 },
              { color:'#6C4DFF', badge:'Flash sale · -65%',        oldPrice:'$24.00', price:'$8.99',  desc:'Artisan Ceramic Mug',       tint:1 },
              { color:'#D97706', badge:'Best seller',              oldPrice:'$58.00', price:'$22.00', desc:'Natural Linen Lampshade',          tint:2 },
              { color:'#DC2626', badge:'Last pieces',               oldPrice:'$40.00', price:'$15.00', desc:'Bamboo Oil Burner',     tint:3 },
            ].map((b, i) => (
              <div key={i} onClick={() => navigate('pdp',{ product: PRODUCTS[i] })} style={{ width:268, height:112, borderRadius:14, background:b.color, display:'flex', alignItems:'center', padding:'12px 14px', cursor:'pointer', flexShrink:0, position:'relative', overflow:'hidden' }}>
                {/* bg circle decoration */}
                <div style={{ position:'absolute', right:-20, top:-20, width:110, height:110, borderRadius:9999, background:'rgba(255,255,255,0.08)' }} />
                <div style={{ position:'absolute', right:50, bottom:-30, width:70, height:70, borderRadius:9999, background:'rgba(255,255,255,0.06)' }} />
                {/* Text */}
                <div style={{ flex:1, zIndex:1 }}>
                  <div style={{ background:'rgba(255,255,255,0.22)', borderRadius:9999, padding:'3px 8px', display:'inline-block', marginBottom:5 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff' }}>{b.badge}</span>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.75)', marginBottom:1 }}>
                    Before: <span style={{ textDecoration:'line-through' }}>{b.oldPrice}</span>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.1, marginBottom:3 }}>{b.price}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.85)', lineHeight:1.2 }}>{b.desc}</div>
                </div>
                {/* Product image */}
                <div style={{ width:78, height:88, flexShrink:0, borderRadius:10, overflow:'hidden', zIndex:1 }}>
                  <Img label="" tint={b.tint} style={{ width:78, height:88 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured — Sponsored Products */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink, letterSpacing:'-0.02em' }}>Featured</span>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>Highlighted picks from our sellers</div>
            </div>
            <button style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:2 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primary }}>See all</span>
              <Icon name="chevronRight" size={14} color={C.primary} />
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
            {PRODUCTS.map((p, i) => (
              <div key={p.id} style={{ position:'relative' }}>
                <ProductCard product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product: p })} />
                <div style={{ position:'absolute', top:8, left:8, background:'rgba(14,11,31,0.55)', backdropFilter:'blur(4px)', borderRadius:9999, padding:'2px 8px', pointerEvents:'none' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:600, color:'rgba(255,255,255,0.92)', letterSpacing:'0.02em' }}>Sponsored</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Videos */}
        <div style={{ padding:'20px 20px 0' }}>
          <div style={{ marginBottom:12 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink, letterSpacing:'-0.02em' }}>Product Videos</span>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>See the products in action</div>
          </div>
          <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
            {[
              { product:PRODUCTS[0], views:'1.2k', caption:'A unique vase\nmade by hand',       tint:0 },
              { product:PRODUCTS[1], views:'5.6k', caption:'The ceramic\neveryone wants', tint:1 },
              { product:PRODUCTS[2], views:'3.4k', caption:'Soft light for\nyour home',  tint:2 },
              { product:PRODUCTS[3], views:'2.1k', caption:'Feel the difference\nevery morning',   tint:3 },
              { product:PRODUCTS[4], views:'890',  caption:'The perfect bag\nfor every day',  tint:4 },
              { product:PRODUCTS[5], views:'4.2k', caption:"The chef's apron\nfor home",    tint:0 },
            ].map((v, i) => (
              <div key={i} onClick={() => navigate('pdp',{ product:v.product })} style={{ width:148, height:228, borderRadius:14, overflow:'hidden', cursor:'pointer', flexShrink:0, position:'relative', background:'#1a1a2e', boxShadow:'0 4px 16px rgba(14,11,31,0.12)' }}>
                {/* BG placeholder */}
                <Img label="" tint={v.tint} style={{ position:'absolute', inset:0, width:148, height:228, borderRadius:0 }} />
                {/* Gradient overlay */}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.72) 100%)' }} />
                {/* Top: play + views */}
                <div style={{ position:'absolute', top:10, left:10, display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:22, height:22, borderRadius:9999, background:'rgba(255,255,255,0.22)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="7" height="9" viewBox="0 0 7 9" fill="white"><path d="M0.5 0.5l6 4-6 4V0.5z"/></svg>
                  </div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#fff', textShadow:'0 1px 3px rgba(0,0,0,0.6)' }}>{v.views}</span>
                </div>
                {/* Caption */}
                <div style={{ position:'absolute', bottom:66, left:8, right:8, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:'#fff', lineHeight:1.35, textShadow:'0 1px 4px rgba(0,0,0,0.7)', whiteSpace:'pre-line' }}>
                  {v.caption}
                </div>
                {/* Product bar */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(255,255,255,0.96)', backdropFilter:'blur(6px)', padding:'7px 8px', display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:34, height:34, borderRadius:8, overflow:'hidden', flexShrink:0 }}>
                    <Img label="" tint={v.tint} style={{ width:34, height:34 }} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 }}>{v.product.title}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:C.ink }}>${v.product.price.toFixed(2)}</span>
                      {v.product.discount && (
                        <span style={{ background:C.success, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, padding:'1px 5px', borderRadius:4, letterSpacing:'0.02em' }}>{v.product.discount}% OFF</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* For You */}
        <div style={{ padding: '20px 20px 16px' }}>
          <SectionHeader title="Just For You" onSeeAll={() => {}} style={{ marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap: 12 }}>
            {forYou.map((p, i) =>
            <ProductCard key={p.id} product={p} size="md" tint={i + 2} onPress={() => navigate('pdp', { product: p })} />
            )}
          </div>
        </div>
        </div>
      </div>

      <BottomNav active={activeTab} onTab={goTab} />
    </div>);

}

Object.assign(window, { HomeScreen });
