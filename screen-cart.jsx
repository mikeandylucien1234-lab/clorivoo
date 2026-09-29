// screen-cart.jsx — Cart + Checkout (redesigned per reference image)

// ─── CART ────────────────────────────────────────────────────
function CartScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [items, setItems] = React.useState([
    { id:1, name:'iPhone 14 Pro Max',  variant:'256GB, Deep Purple', price:1099, oldPrice:1299, qty:1, inStock:true, seller:'TechZone Haiti',  checked:true },
    { id:2, name:'Sony WH-1000XM5',    variant:'Wireless Headphone',  price:299,  oldPrice:349,  qty:1, inStock:true, seller:'TechZone Haiti',  checked:true },
    { id:3, name:'Fashion Handbag',     variant:'Brown, Leather',       price:39,   oldPrice:59,   qty:1, inStock:true, seller:'Fashion House',   checked:true },
    { id:4, name:'Nike Air Max 270',    variant:'Black, Size 42',     price:129,  oldPrice:159,  qty:1, inStock:true, seller:'Sport Center',    checked:true },
  ]);
  const [promoCode, setPromoCode]   = React.useState('');
  const [promoApplied, setPromoApplied] = React.useState(false);

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
  function updateQty(id, qty) {
    if (qty <= 0) setItems(prev => prev.filter(i => i.id !== id));
    else setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }
  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }
  function toggleWishlist(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, wishlisted: !i.wishlisted } : i));
  }
  function clearSelected() {
    setItems(prev => prev.filter(i => !i.checked));
  }

  const youMayLike = PRODUCTS.slice(4);

  function goToCheckout() {
    navigate('checkout', { items: checkedItems, subtotal, discount, total });
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

        {/* Select all row */}
        <div style={{ padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={toggleAll}>
            <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${allChecked ? C.primary : C.hairline}`, background: allChecked ? C.primary : C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
              {allChecked && <Icon name="check" size={12} color="#fff" sw={3} />}
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink }}>Select all ({items.length})</span>
          </label>
          <button onClick={clearSelected} disabled={!checkedItems.length} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor: checkedItems.length ? 'pointer' : 'default', opacity: checkedItems.length ? 1 : 0.4 }}>
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
                    {/* Qty stepper */}
                    <div style={{ display:'flex', alignItems:'center', gap:0, border:`1.5px solid ${C.hairline}`, borderRadius:9999, width:'fit-content' }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:16 }}>−</button>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:16 }}>+</button>
                    </div>
                  </div>
                  {/* Right icons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
                    <button onClick={() => removeItem(item.id)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
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

        {/* You may also like */}
        <div style={{ padding:'10px 16px 0' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink, marginBottom:12 }}>You may also like</div>
          <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4 }}>
            {youMayLike.map((p, i) => (
              <div key={p.id} onClick={() => navigate('pdp',{product:p})} style={{ width:110, flexShrink:0, cursor:'pointer', display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ width:110, height:110, borderRadius:12, overflow:'hidden' }}>
                  <Img label="" tint={(i+2)%5} style={{ width:110, height:110 }} />
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.ink, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.title}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${p.price.toFixed(2)}</span>
                  <button style={{ width:26, height:26, borderRadius:9999, background:C.primary, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="plus" size={14} color="#fff" sw={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
