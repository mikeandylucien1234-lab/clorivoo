// screen-wishlist.jsx — Wishlist / Favorites system
// Pages: WishlistScreen, WishlistSharedScreen, WishlistNotificationsScreen, WishlistAlertsScreen
// Shared: WishlistQuickActionsSheet

window._WISHLIST = window._WISHLIST || [
  { id:1, name:'iPhone 14 Pro Max',  variant:'256GB, Deep Purple', price:1099, oldPrice:1299, discount:15, category:'electronics', brand:'Apple', inStock:true,  addedAt:'2024-05-14', popularity:98, tint:0, alertOn:true  },
  { id:2, name:'Sony WH-1000XM5',    variant:'Wireless Headphone',  price:299,  oldPrice:349,  discount:14, category:'electronics', brand:'Sony',  inStock:true,  addedAt:'2024-05-10', popularity:87, tint:1, alertOn:false },
  { id:3, name:'Fashion Handbag',     variant:'Brown, Leather',       price:39,   oldPrice:59,   discount:34, category:'fashion',     brand:'Fashion House', inStock:true, addedAt:'2024-05-02', popularity:62, tint:2, alertOn:false },
  { id:4, name:'Nike Air Max 270',    variant:'Black, Size 42',     price:129,  oldPrice:159,  discount:19, category:'fashion',     brand:'Nike',   inStock:false, addedAt:'2024-04-28', popularity:91, tint:3, alertOn:true  },
];
window._PRICE_ALERT_LOG = window._PRICE_ALERT_LOG || [
  { id:1, itemName:'iPhone 14 Pro Max', kind:'price_drop', message:'Price dropped from $1,299 to $1,099 (−15%)', at:'2024-05-15T09:00:00', read:false },
  { id:2, itemName:'Nike Air Max 270',  kind:'back_in_stock', message:'Back in stock at your saved size', at:'2024-05-13T14:00:00', read:false },
  { id:3, itemName:'Sony WH-1000XM5',   kind:'price_drop', message:'Price dropped from $349 to $299 (−14%)', at:'2024-05-09T11:00:00', read:true },
];

const SORTS = [
  { key:'newest',       label:'Newest First' },
  { key:'price_low',    label:'Price: Low to High' },
  { key:'price_high',   label:'Price: High to Low' },
  { key:'popularity',   label:'Most Popular' },
  { key:'discount',     label:'Biggest Discount' },
];

function applySort(items, sortKey) {
  const arr = [...items];
  if (sortKey === 'newest')     arr.sort((a,b) => new Date(b.addedAt) - new Date(a.addedAt));
  if (sortKey === 'price_low')  arr.sort((a,b) => a.price - b.price);
  if (sortKey === 'price_high') arr.sort((a,b) => b.price - a.price);
  if (sortKey === 'popularity') arr.sort((a,b) => b.popularity - a.popularity);
  if (sortKey === 'discount')   arr.sort((a,b) => (b.discount||0) - (a.discount||0));
  return arr;
}

// ─── QUICK ACTIONS BOTTOM SHEET ───────────────────────────────
function WishlistQuickActionsSheet({ item, onClose, onAddToCart, onToggleAlert, onShare, onRemove }) {
  const [dragY, setDragY] = React.useState(0);
  const dragRef = React.useRef({ startY:0, dragging:false });

  if (!item) return null;

  function onPointerDown(e) {
    dragRef.current = { startY: e.clientY, dragging:true };
  }
  function onPointerMove(e) {
    if (!dragRef.current.dragging) return;
    const dy = e.clientY - dragRef.current.startY;
    if (dy > 0) setDragY(dy);
  }
  function onPointerUp() {
    if (dragY > 90) onClose();
    else setDragY(0);
    dragRef.current.dragging = false;
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.55)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'sheetFadeIn 0.25s ease' }}>
      <div
        onClick={e => e.stopPropagation()}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        style={{ width:'100%', maxWidth:480, background:C.white, borderRadius:'20px 20px 0 0', padding:'20px 20px 28px', boxShadow:'0 -8px 40px rgba(14,11,31,0.2)', transform:`translateY(${dragY}px)`, transition: dragRef.current.dragging ? 'none' : 'transform 0.2s', animation:'sheetIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94)', touchAction:'none' }}
      >
        <div style={{ width:36, height:4, borderRadius:2, background:C.hairline, margin:'0 auto 16px', cursor:'grab' }} />

        <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
          <Img label="" tint={item.tint} style={{ width:64, height:64, borderRadius:12, flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14.5, fontWeight:700, color:C.ink }}>{item.name}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:1 }}>{item.variant}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:4 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</span>
              {item.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, textDecoration:'line-through' }}>${item.oldPrice.toFixed(2)}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9999, border:'none', background:C.paper, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="x" size={16} color={C.mute} />
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <button onClick={() => { onAddToCart(item); onClose(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="cart" size={17} color={C.primary} />
            </div>
            <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>Add to Cart</span>
            <Icon name="chevronRight" size={16} color={C.mute} />
          </button>
          <button onClick={() => onToggleAlert(item)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:38, height:38, borderRadius:10, background: item.alertOn ? '#ECFDF5' : C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="bell" size={17} color={item.alertOn ? C.success : C.mute} />
            </div>
            <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>{item.alertOn ? 'Price Alert On' : 'Notify Me If Price Drops'}</span>
            <Icon name="chevronRight" size={16} color={C.mute} />
          </button>
          <button onClick={() => onShare(item)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="share" size={17} color={C.mute} />
            </div>
            <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>Share</span>
            <Icon name="chevronRight" size={16} color={C.mute} />
          </button>
          <button onClick={() => { onRemove(item); onClose(); }} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'#FEF2F2', borderRadius:12, cursor:'pointer', textAlign:'left', marginTop:6 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="trash" size={17} color={C.danger} />
            </div>
            <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.danger }}>Remove from Wishlist</span>
          </button>
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:C.primarySoft, borderRadius:14, padding:'14px 16px', marginTop:16 }}>
          <Icon name="shield" size={16} color={C.primary} style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep, lineHeight:1.5 }}>Why create a wishlist? Save your favorite products, get notified on price drops, and never miss a good deal.</span>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT ROW (list view) ───────────────────────────────────
function WishlistRow({ item, onOpen, onMore, onToggleFav, onRemove, onAddToCart }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:12, boxShadow:'0 1px 6px rgba(14,11,31,0.05)', display:'flex', gap:10 }}>
      <div onClick={() => onOpen(item)} style={{ cursor:'pointer', flexShrink:0 }}>
        <Img label="" tint={item.tint} style={{ width:80, height:80, borderRadius:10 }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div onClick={() => onOpen(item)} style={{ flex:1, paddingRight:8, cursor:'pointer' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, lineHeight:1.3, marginBottom:2 }}>{item.name}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:6 }}>{item.variant}</div>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={() => onToggleFav(item)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="heartFill" size={18} color={C.primary} filled />
            </button>
            <button onClick={() => onRemove(item)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="trash" size={17} color={C.mute} />
            </button>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:5 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</span>
          {item.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, textDecoration:'line-through' }}>${item.oldPrice.toFixed(2)}</span>}
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:4, background: item.inStock ? '#ECFDF5' : '#FFFBEB', borderRadius:6, padding:'2px 8px', marginBottom:8 }}>
          <div style={{ width:6, height:6, borderRadius:9999, background: item.inStock ? C.success : C.warning }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color: item.inStock ? C.success : C.warning }}>{item.inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => onAddToCart(item)} disabled={!item.inStock} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:36, borderRadius:9999, border:`1.5px solid ${item.inStock ? C.primary : C.hairline}`, background: item.inStock ? C.white : C.paper, cursor: item.inStock ? 'pointer' : 'default', opacity: item.inStock ? 1 : 0.55 }}>
            <Icon name="cart" size={14} color={item.inStock ? C.primary : C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color: item.inStock ? C.primary : C.mute }}>Add to Cart</span>
          </button>
          <button onClick={() => onMore(item)} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="moreHorizontal" size={16} color={C.mute} sw={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCT TILE (grid view) ───────────────────────────────────
function WishlistTile({ item, onOpen, onMore, onRemove, onAddToCart }) {
  return (
    <div style={{ background:C.white, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
      <div onClick={() => onOpen(item)} style={{ position:'relative', cursor:'pointer' }}>
        <Img label="" tint={item.tint} style={{ width:'100%', height:140 }} />
        {item.discount && <div style={{ position:'absolute', top:8, left:8, background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, padding:'2px 7px', borderRadius:9999 }}>-{item.discount}%</div>}
        <button onClick={e => { e.stopPropagation(); onRemove(item); }} style={{ position:'absolute', top:6, right:6, width:28, height:28, borderRadius:9999, background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="heartFill" size={14} color={C.primary} filled />
        </button>
      </div>
      <div style={{ padding:10 }}>
        <div onClick={() => onOpen(item)} style={{ cursor:'pointer' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.3, marginBottom:2, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical' }}>{item.name}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:4, background: item.inStock ? '#ECFDF5' : '#FFFBEB', borderRadius:6, padding:'1px 6px', margin:'4px 0' }}>
            <div style={{ width:5, height:5, borderRadius:9999, background: item.inStock ? C.success : C.warning }} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:600, color: item.inStock ? C.success : C.warning }}>{item.inStock ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</span>
            {item.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.mute, textDecoration:'line-through' }}>${item.oldPrice.toFixed(2)}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:8 }}>
          <button onClick={() => onAddToCart(item)} disabled={!item.inStock} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, height:32, borderRadius:9999, border:`1.5px solid ${item.inStock ? C.primary : C.hairline}`, background:C.white, cursor: item.inStock ? 'pointer' : 'default', opacity: item.inStock ? 1 : 0.55 }}>
            <Icon name="cart" size={12} color={item.inStock ? C.primary : C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color: item.inStock ? C.primary : C.mute }}>Add</span>
          </button>
          <button onClick={() => onMore(item)} style={{ width:32, height:32, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="moreHorizontal" size={14} color={C.mute} sw={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WISHLIST MAIN PAGE ───────────────────────────────────────
function WishlistScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [items, setItems] = React.useState(window._WISHLIST);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState(window._WISHLIST_VIEW || 'list');
  const [sortKey, setSortKey] = React.useState('newest');
  const [sortOpen, setSortOpen] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState({ category:'all', maxPrice:2000, brand:'all', inStockOnly:false });
  const [activeSheet, setActiveSheet] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const loggedIn = false; // demo: sync banner shown for guests

  React.useEffect(() => { window._WISHLIST = items; }, [items]);
  React.useEffect(() => { window._WISHLIST_VIEW = view; }, [view]);
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const categories = ['all', ...new Set(window._WISHLIST.map(i => i.category))];
  const brands = ['all', ...new Set(window._WISHLIST.map(i => i.brand))];

  let visible = items.filter(i =>
    (filters.category === 'all' || i.category === filters.category) &&
    (filters.brand === 'all' || i.brand === filters.brand) &&
    i.price <= filters.maxPrice &&
    (!filters.inStockOnly || i.inStock)
  );
  visible = applySort(visible, sortKey);

  function removeItem(item) {
    setItems(prev => prev.filter(i => i.id !== item.id));
    setToast({ type:'success', message:`${item.name} removed from wishlist` });
  }
  function addToCart(item) {
    (window.CART_ITEMS || (window.CART_ITEMS = [])).push({ product:{ id:item.id, title:item.name, price:item.price }, qty:1, variant:item.variant });
    setToast({ type:'success', message:`${item.name} added to cart` });
  }
  function toggleAlert(item) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, alertOn: !i.alertOn } : i));
    setActiveSheet(prev => prev && prev.id === item.id ? { ...prev, alertOn: !prev.alertOn } : prev);
    setToast({ type:'success', message: item.alertOn ? 'Price alert turned off' : 'We\'ll notify you if the price drops' });
  }
  function shareItem(item) {
    setToast({ type:'success', message:'Opening share sheet…' });
  }
  function openPdp(item) {
    navigate('pdp', { product: { id:item.id, title:item.name, price:item.price, oldPrice:item.oldPrice } });
  }

  const resultCount = visible.length;

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
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
              <button onClick={() => setToast({ type:'success', message:'Opening search…' })} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="search" size={21} color={C.mute} />
              </button>
              <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <Icon name="cart" size={22} color={C.ink} />
                <Badge count={(window.CART_ITEMS || []).length} />
              </button>
              <button onClick={() => navigate('wishlist-alerts')} style={{ width:40, height:40, border:'none', background:C.primarySoft, borderRadius:9999, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="heartFill" size={17} color={C.primary} filled />
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: isDesktop ? '24px 32px 0' : '4px 20px 0', maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Wishlist</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2 }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
          </div>
          {isDesktop && (
            <button onClick={() => navigate('wishlist-shared')} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'9px 16px', cursor:'pointer' }}>
              <Icon name="share" size={15} color={C.ink} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Share Wishlist</span>
            </button>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: isDesktop ? '14px 32px 0' : '10px 20px 0', maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
            <div style={{ background:C.primarySoft, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <Icon name="heart" size={17} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.primaryDeep }}>Add your favorite items and find them easily later.</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '16px 32px 0' : '10px 20px 0', width: isDesktop ? '100%' : undefined }}>

          {items.length > 0 && (
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
              <button onClick={() => setFilterOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer', flexShrink:0 }}>
                <Icon name="sliders" size={14} color={C.ink} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>Filter</span>
              </button>
              <button onClick={() => setSortOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'8px 14px', cursor:'pointer', minWidth:0, overflow:'hidden' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{SORTS.find(s=>s.key===sortKey).label}</span>
                <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)', flexShrink:0 }} />
              </button>
              <div style={{ marginLeft:'auto', display:'flex', border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:2, background:C.white }}>
                <button onClick={() => setView('grid')} style={{ width:30, height:30, borderRadius:9999, border:'none', background: view==='grid' ? C.primarySoft : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="grid" size={14} color={view==='grid' ? C.primary : C.mute} />
                </button>
                <button onClick={() => setView('list')} style={{ width:30, height:30, borderRadius:9999, border:'none', background: view==='list' ? C.primarySoft : 'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="list" size={14} color={view==='list' ? C.primary : C.mute} />
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ background:C.white, borderRadius:16, padding:12, display:'flex', gap:10 }}>
                  <div style={{ width:80, height:80, borderRadius:10, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', flexShrink:0 }} />
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                    <div style={{ height:14, width:'60%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
                    <div style={{ height:11, width:'40%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && <WishlistEmptyState onBrowse={() => navigate('home')} />}

          {!loading && items.length > 0 && resultCount === 0 && (
            <div style={{ textAlign:'center', padding:'50px 20px' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>No items match your filters</span>
            </div>
          )}

          {!loading && resultCount > 0 && view === 'list' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {visible.map(item => (
                <WishlistRow key={item.id} item={item} onOpen={openPdp} onMore={setActiveSheet} onToggleFav={removeItem} onRemove={removeItem} onAddToCart={addToCart} />
              ))}
            </div>
          )}

          {!loading && resultCount > 0 && view === 'grid' && (
            <div style={{ display:'grid', gridTemplateColumns: isDesktop ? 'repeat(5, 1fr)' : '1fr 1fr', gap:12 }}>
              {visible.map(item => (
                <WishlistTile key={item.id} item={item} onOpen={openPdp} onMore={setActiveSheet} onRemove={removeItem} onAddToCart={addToCart} />
              ))}
            </div>
          )}

          {!loading && items.length > 0 && !loggedIn && (
            <div style={{ marginTop:16, background:C.white, borderRadius:16, padding:'16px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ width:40, height:40, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="heart" size={19} color={C.primary} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>Your favorites, everywhere!</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Log in to sync your wishlist across all your devices.</div>
              </div>
              <Btn variant="primary" size="sm" onClick={() => navigate('login')}>Log In</Btn>
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
      <Modal open={filterOpen} title="Filter Wishlist" onClose={() => setFilterOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Category</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {categories.map(c => (
                <Chip key={c} active={filters.category === c} onClick={() => setFilters(f => ({ ...f, category:c }))}>{c === 'all' ? 'All' : c.charAt(0).toUpperCase()+c.slice(1)}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Brand</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {brands.map(b => (
                <Chip key={b} active={filters.brand === b} onClick={() => setFilters(f => ({ ...f, brand:b }))}>{b === 'all' ? 'All' : b}</Chip>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Max Price</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary }}>${filters.maxPrice}</span>
            </div>
            <input type="range" min="0" max="2000" step="10" value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))} style={{ width:'100%', accentColor: C.primary }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>In Stock Only</span>
            <Switch checked={filters.inStockOnly} onChange={v => setFilters(f => ({ ...f, inStockOnly:v }))} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setFilters({ category:'all', maxPrice:2000, brand:'all', inStockOnly:false })}>Reset</Btn>
            <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => setFilterOpen(false)}>Apply</Btn>
          </div>
        </div>
      </Modal>

      <WishlistQuickActionsSheet
        item={activeSheet}
        onClose={() => setActiveSheet(null)}
        onAddToCart={addToCart}
        onToggleAlert={toggleAlert}
        onShare={shareItem}
        onRemove={removeItem}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <BottomNav active={4} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 1) navigate('categories');
        else if (i === 2) navigate('cart');
        else if (i === 3) navigate('tracking');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}

// ─── EMPTY STATE ───────────────────────────────────────────────
function WishlistEmptyState({ onBrowse }) {
  const recommended = PRODUCTS.slice(0, 4);
  const { navigate } = useNav();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'30px 10px 10px' }}>
      <div style={{ width:120, height:120, borderRadius:9999, background:`linear-gradient(135deg, ${C.primarySoft} 0%, #EDE7FF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <Icon name="heart" size={52} color={C.primary} />
        <div style={{ position:'absolute', top:8, right:10, width:20, height:20, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(14,11,31,0.1)' }}>
          <Icon name="plus" size={11} color={C.primary} sw={3} />
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink, marginBottom:5 }}>Your wishlist is empty</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, maxWidth:280 }}>Tap the heart icon on any product to save it here for later.</div>
      </div>
      <Btn variant="primary" size="md" onClick={onBrowse} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>Continue Shopping</Btn>

      <div style={{ width:'100%', marginTop:14 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>You Might Like</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {recommended.map((p, i) => (
            <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product:p })} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED COLLECTION PAGE ────────────────────────────────────
function WishlistSharedScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [isPublic, setIsPublic] = React.useState(true);
  const [toast, setToast] = React.useState(null);
  const items = window._WISHLIST;
  const shareUrl = 'clorivo.com/w/johndoe-2024';

  function copyLink() {
    navigator.clipboard?.writeText(`https://${shareUrl}`)
      .then(() => setToast({ type:'success', message:'Link copied to clipboard' }))
      .catch(() => setToast({ type:'error', message:'Could not copy link' }));
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Share Wishlist</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:14, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div style={{ borderRadius:20, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'22px 20px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ width:52, height:52, borderRadius:9999, background:'rgba(255,255,255,0.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', position:'relative' }}>
            <Icon name="heartFill" size={24} color="#fff" filled />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:'#fff', position:'relative' }}>John's Wishlist</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.9)', marginTop:3, position:'relative' }}>{items.length} items · Shared collection</div>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Icon name={isPublic ? 'globe' : 'lock'} size={17} color={C.mute} />
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{isPublic ? 'Public Wishlist' : 'Private Wishlist'}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{isPublic ? 'Anyone with the link can view it' : 'Only you can view it'}</div>
              </div>
            </div>
            <Switch checked={isPublic} onChange={setIsPublic} />
          </div>
          {isPublic && (
            <>
              <div style={{ display:'flex', gap:10 }}>
                <div style={{ flex:1, height:44, border:`1.5px solid ${C.hairline}`, borderRadius:12, display:'flex', alignItems:'center', padding:'0 12px', overflow:'hidden' }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, color:C.mute, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{shareUrl}</span>
                </div>
                <button onClick={copyLink} style={{ width:44, height:44, borderRadius:12, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="copy" size={17} color={C.ink} />
                </button>
              </div>
              <Btn variant="primary" size="md" wide onClick={() => setToast({ type:'success', message:'Opening share sheet…' })} style={{ marginTop:12, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
                <Icon name="share" size={15} color="#fff" /> Share to Social
              </Btn>
            </>
          )}
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Items in This Wishlist</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.map(item => (
              <div key={item.id} style={{ background:C.white, borderRadius:14, padding:10, display:'flex', gap:10, alignItems:'center', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
                <Img label="" tint={item.tint} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{item.name}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── WISHLIST NOTIFICATIONS PAGE ──────────────────────────────
function WishlistNotificationsScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [log, setLog] = React.useState(window._PRICE_ALERT_LOG);

  React.useEffect(() => { window._PRICE_ALERT_LOG = log; }, [log]);

  function markRead(id) {
    setLog(prev => prev.map(n => n.id === id ? { ...n, read:true } : n));
  }
  function markAllRead() {
    setLog(prev => prev.map(n => ({ ...n, read:true })));
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Wishlist Updates</span>
          </div>
          <button onClick={markAllRead} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>Mark all read</button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '20px 0 40px' : '14px 16px 40px', display:'flex', flexDirection:'column', gap:10, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
        {log.length === 0 && (
          <div style={{ textAlign:'center', padding:'50px 20px' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>No wishlist updates yet</span>
          </div>
        )}
        {log.map(n => (
          <button key={n.id} onClick={() => markRead(n.id)} style={{ display:'flex', gap:12, background: n.read ? C.white : C.primarySoft, borderRadius:14, padding:'14px 16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
            <div style={{ width:38, height:38, borderRadius:9999, background: n.kind === 'price_drop' ? '#ECFDF5' : '#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name={n.kind === 'price_drop' ? 'tag' : 'package'} size={17} color={n.kind === 'price_drop' ? C.success : '#4A6FD4'} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{n.itemName}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:1 }}>{n.message}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:4 }}>{new Date(n.at).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</div>
            </div>
            {!n.read && <div style={{ width:8, height:8, borderRadius:9999, background:C.primary, flexShrink:0, marginTop:4 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PRICE DROP ALERTS SETTINGS PAGE ──────────────────────────
function WishlistAlertsScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [items, setItems] = React.useState(window._WISHLIST);
  const [pushOn, setPushOn] = React.useState(true);
  const [emailOn, setEmailOn] = React.useState(true);
  const [backInStockOn, setBackInStockOn] = React.useState(true);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { window._WISHLIST = items; }, [items]);

  function toggleItemAlert(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, alertOn: !i.alertOn } : i));
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Price Alerts</span>
          </div>
          <button onClick={() => navigate('wishlist-notifications')} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="bell" size={19} color={C.mute} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '20px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Alert Settings</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
              <Icon name="bell" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Push Notifications</span>
              <Switch checked={pushOn} onChange={setPushOn} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="mail" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Email Alerts</span>
              <Switch checked={emailOn} onChange={setEmailOn} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="package" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Back in Stock Alerts</span>
              <Switch checked={backInStockOn} onChange={setBackInStockOn} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Tracked Items</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {items.map(item => (
              <div key={item.id} style={{ background:C.white, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 6px rgba(14,11,31,0.05)' }}>
                <Img label="" tint={item.tint} style={{ width:48, height:48, borderRadius:10, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{item.name}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.primary }}>${item.price.toFixed(2)}</div>
                </div>
                <Switch checked={item.alertOn} onChange={() => toggleItemAlert(item.id)} />
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Add items to your wishlist to track price alerts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { WishlistScreen, WishlistSharedScreen, WishlistNotificationsScreen, WishlistAlertsScreen });
