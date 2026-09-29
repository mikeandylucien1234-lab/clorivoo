// screen-category.jsx — Category browse / listing page

function CategoryScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const initial = params.category || 'All';

  const categories = ['All','Home','Tech','Beauty','Fashion','Kids','Sport','Kitchen'];
  const [active, setActive]   = React.useState(categories.includes(initial) ? initial : 'All');
  const [sort, setSort]       = React.useState(0);
  const [view, setView]       = React.useState('grid');

  const subCats = {
    'All':    ['Trending','New arrivals','Best sellers','Deals'],
    'Home':   ['Decor','Kitchen','Lighting','Textiles','Storage'],
    'Tech':   ['Audio','Phones','Accessories','Gaming'],
    'Beauty': ['Skincare','Makeup','Fragrance','Hair'],
    'Fashion':['Women','Men','Bags','Shoes','Jewelry'],
    'Kids':   ['Toys','Clothing','Baby care'],
    'Sport':  ['Fitness','Outdoor','Cycling'],
    'Kitchen':['Utensils','Appliances','Tableware'],
  };
  const sorts = ['Popular','Price ↑','Price ↓','Newest'];

  // Build product list (dup PRODUCTS for a fuller grid)
  let products = [...PRODUCTS, ...PRODUCTS.map(p => ({ ...p, id: p.id + 100 }))];
  if (sort === 1) products = products.sort((a,b) => a.price - b.price);
  else if (sort === 2) products = products.sort((a,b) => b.price - a.price);

  const [activeSub, setActiveSub] = React.useState(0);

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
          {/* Search */}
          <div onClick={() => {}} style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'9px 14px', cursor:'text' }}>
            <Icon name="search" size={16} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, flex:1 }}>Search in {active}…</span>
          </div>
          <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <Icon name="cart" size={22} color={C.ink} />
            <Badge count={window.CART_ITEMS.length} />
          </button>
        </div>
        )}

        {/* Category tabs */}
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, display:'flex', gap:8, padding: isDesktop ? '14px 32px' : '2px 12px 10px', overflowX:'auto' }}>
          {categories.map((c, i) => (
            <Chip key={i} active={active === c} onClick={() => { setActive(c); setActiveSub(0); }}>{c}</Chip>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: NAV_H + HOME_H }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined }}>

        {/* Category hero */}
        <div style={{ margin:'12px 16px 0', borderRadius:16, overflow:'hidden', position:'relative', height:96 }}>
          <Img label="" tint={categories.indexOf(active) % 5} style={{ position:'absolute', inset:0, borderRadius:0 }} />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${C.primary}dd, ${C.primaryDeep}aa)` }} />
          <div style={{ position:'absolute', inset:0, padding:'16px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.03em' }}>{active}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:2 }}>{products.length} products · up to -70%</div>
          </div>
        </div>

        {/* Sub-categories */}
        <div style={{ display:'flex', gap:8, padding:'14px 16px 0', overflowX:'auto' }}>
          {(subCats[active] || []).map((s, i) => (
            <button key={i} onClick={() => setActiveSub(i)} style={{
              height:32, padding:'0 14px', borderRadius:9999, flexShrink:0, cursor:'pointer',
              border:`1.5px solid ${activeSub === i ? C.primary : C.hairline}`,
              background: activeSub === i ? C.primary : C.white,
              color: activeSub === i ? '#fff' : C.mute,
              fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600,
            }}>{s}</button>
          ))}
        </div>

        {/* Sort / view bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
          <div style={{ display:'flex', gap:8, overflowX:'auto' }}>
            {sorts.map((s, i) => (
              <button key={i} onClick={() => setSort(i)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight: sort === i ? 700 : 500, color: sort === i ? C.primary : C.mute, whiteSpace:'nowrap' }}>{s}</button>
            ))}
          </div>
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} style={{ width:32, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:8, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name={view === 'grid' ? 'grid' : 'package'} size={16} color={C.mute} />
          </button>
        </div>

        {/* Product grid */}
        <div style={{ padding:'0 16px', display:'grid', gridTemplateColumns: view !== 'grid' ? '1fr' : isDesktop ? 'repeat(auto-fill, minmax(190px, 1fr))' : '1fr 1fr', gap:12 }}>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product: p })} />
          ))}
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

Object.assign(window, { CategoryScreen });
