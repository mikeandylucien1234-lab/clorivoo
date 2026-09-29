// screen-cart.jsx — Cart + Checkout (redesigned per reference image)

// ─── CART ────────────────────────────────────────────────────
function CartScreen() {
  const { navigate, goBack } = useNav();
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

  const youMayLike = PRODUCTS.slice(4);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0 }}>
        {!isDesktop && (
        <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Greeting + name */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, lineHeight:1.2 }}>Hello 👋</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:17, color:C.ink, letterSpacing:'-0.03em', lineHeight:1.2 }}>Alex Martin</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:4, alignItems:'center' }}>
            <button style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="heart" size={22} color={C.mute} />
            </button>
            <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <Icon name="cart" size={22} color={C.ink} />
              <Badge count={checkedItems.length} />
            </button>
          </div>
        </div>
        )}

        {!isDesktop && (
        <div onClick={() => navigate('profile')} style={{ margin:'0 20px 12px', display:'flex', alignItems:'center', gap:8, background:C.primarySoft, borderRadius:10, padding:'8px 12px', cursor:'pointer' }}>
          <Icon name="mapPin" size={15} color={C.primary} />
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Deliver to · </span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primaryDeep }}>14 Roquette Street, 75011 Paris</span>
          </div>
          <Icon name="chevronRight" size={14} color={C.primary} />
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
          <button style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer' }}>
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
                    <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#ECFDF5', borderRadius:6, padding:'2px 8px', marginBottom:8 }}>
                      <div style={{ width:6, height:6, borderRadius:9999, background:C.success }} />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.success }}>In stock</span>
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
                    <button style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="heart" size={18} color={C.mute} />
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
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, paddingTop:10, borderTop:`1px solid ${C.hairline}` }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Total</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:C.primary }}>${total.toLocaleString()}</span>
            </div>
            <Btn variant="primary" size="md" wide onClick={() => navigate('checkout')}>
              Checkout ({checkedItems.length})
              <Icon name="arrowLeft" size={15} color="#fff" style={{ transform:'rotate(180deg)' }} />
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
        <Btn variant="primary" size="md" style={{ flex:1, maxWidth:200 }} onClick={() => navigate('checkout')}>
          Checkout ({checkedItems.length})
          <Icon name="arrowLeft" size={15} color="#fff" style={{ transform:'rotate(180deg)' }} />
        </Btn>
      </div>
      )}

      <BottomNav active={2} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 3) navigate('tracking');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}

// ─── CHECKOUT (Order Summary) ────────────────────────────────
function CheckoutScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [promoCode, setPromoCode]   = React.useState('');
  const [promoApplied, setPromoApplied] = React.useState(false);
  const [loading, setLoading]       = React.useState(false);
  const [hasAddress, setHasAddress] = React.useState(true);

  const subtotal  = 1566.00;
  const discount  = promoApplied ? 156.60 : 0;
  const shipping  = 0;
  const total     = subtotal - discount + shipping;

  async function placeOrder() {
    setLoading(true);
    const user = await sbGetUser();
    await sbCreateOrder(user?.id, {
      items: [],
      shippingAddress: { line1: '14 Roquette Street', city: 'Paris', country: 'FR', zip: '75011' },
      shippingMethod: 'standard',
      paymentMethod: 'card',
      subtotal, discount, shippingFee: shipping, total,
      promoCode: promoApplied ? promoCode : null,
    });
    setLoading(false);
    navigate('tracking');
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Order Summary</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0' : '14px 16px', display:'flex', flexDirection:'column', gap:12, paddingBottom: isDesktop ? 24 : 120, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Order summary card */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Subtotal */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Subtotal (4 items)</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.ink }}>${subtotal.toFixed(2)}</span>
            </div>
            {/* Discount */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Discount</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.danger }}>-${discount > 0 ? discount.toFixed(2) : '0.00'}</span>
            </div>
            {/* Shipping */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:12, borderBottom:`1px solid ${C.hairline}` }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Shipping</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.success }}>Free</span>
            </div>
            {/* Total */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:C.ink }}>Total</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:800, color:C.primary }}>${total.toFixed(2)}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Price includes all taxes and fees</span>
              <div style={{ width:16, height:16, borderRadius:9999, border:`1.5px solid ${C.mute}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute, fontWeight:700 }}>i</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust card */}
        <div style={{ background:C.primarySoft, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="checkCircle" size={18} color="#fff" />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.primaryDeep }}>Shop with confidence</span>
          </div>
          {[
            { icon:'truck',  text:'Free shipping on all orders' },
            { icon:'package',text:'Easy returns within 7 days' },
            { icon:'lock',   text:'100% secure payment' },
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderTop: i > 0 ? `1px solid rgba(108,77,255,0.15)` : 'none' }}>
              <Icon name={item.icon} size={16} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.primaryDeep }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Promo code */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Promo Code</div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, height:48, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'0 14px', display:'flex', alignItems:'center', background:C.paper }}>
              <input
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Enter promo code"
                style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}
              />
            </div>
            <Btn variant="primary" size="md" style={{ borderRadius:12, paddingLeft:20, paddingRight:20 }} onClick={() => { if (promoCode) setPromoApplied(true); }}>
              Apply
            </Btn>
          </div>
          {promoApplied && (
            <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
              <Icon name="checkCircle" size={14} color={C.success} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.success, fontWeight:500 }}>Code applied — −10% off your order</span>
            </div>
          )}
        </div>

        {/* Delivery address */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Shipping Address</div>
          {hasAddress ? (
            <div style={{ border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name="mapPin" size={16} color={C.primary} />
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>Home</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.5 }}>14 Roquette Street<br />75011 Paris, France<br />+33 6 12 34 56 78</div>
                  </div>
                </div>
                <button style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary, flexShrink:0 }}>Edit</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setHasAddress(true)} style={{ width:'100%', height:52, border:`2px dashed ${C.primary}`, borderRadius:12, background:C.primarySoft, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Icon name="plus" size={18} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Add an address</span>
            </button>
          )}
        </div>

        {/* Payment method */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Payment Method</div>
            <button style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary }}>Edit</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', border:`1.5px solid ${C.hairline}`, borderRadius:12 }}>
            {/* Mastercard logo */}
            <div style={{ display:'flex', flexShrink:0 }}>
              <div style={{ width:20, height:20, borderRadius:9999, background:'#EB001B' }} />
              <div style={{ width:20, height:20, borderRadius:9999, background:'#F79E1B', marginLeft:-8 }} />
            </div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, color:C.ink, flex:1 }}>•••• •••• •••• 4242</span>
            <div style={{ width:24, height:24, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="check" size={13} color="#fff" sw={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isDesktop ? '16px 0 24px' : '12px 16px 28px', background:C.white, borderTop:`1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
        <Btn variant="primary" size="lg" wide onClick={placeOrder} disabled={loading || !hasAddress}>
          {loading ? 'Processing…' : 'Proceed to Payment'}
          {!loading && <Icon name="arrowLeft" size={17} color="#fff" style={{ transform:'rotate(180deg)' }} />}
        </Btn>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:8 }}>
          <Icon name="lock" size={12} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Your data is protected</span>
        </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CartScreen, CheckoutScreen });
