// screen-pdp.jsx — Product Details Page

function ProductDetailsScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const product  = params.product || null;
  const p        = product;

  const [selectedColor, setSelectedColor] = React.useState(0);
  const [selectedSize,  setSelectedSize]  = React.useState(1);
  const [qty,           setQty]           = React.useState(1);
  const [activeTab,     setActiveTab]     = React.useState(0);
  const [liked,         setLiked]         = React.useState(false);
  const [imgSlide,      setImgSlide]      = React.useState(0);
  const [addedToCart,   setAddedToCart]   = React.useState(false);
  const [addingToCart,  setAddingToCart]  = React.useState(false);
  const [descExpanded,  setDescExpanded]  = React.useState(false);
  const [specsExpanded, setSpecsExpanded] = React.useState(false);
  const [cartCount,     setCartCount]     = React.useState((window.CART_ITEMS || []).length);

  if (!p) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24 }}>
        <Icon name="package" size={40} color={C.mute} />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>Product not found</div>
        <Btn variant="primary" onClick={() => navigate('home')}>Back to Home</Btn>
      </div>
    );
  }

  const colors  = [
    { name:'Deep Purple', hex:'#3B3760' },
    { name:'Gold',        hex:'#C9A876' },
    { name:'Silver',      hex:'#E6E1D4' },
    { name:'Space Black', hex:'#2A2A2E' },
  ];
  const sizes   = ['128GB','256GB','512GB','1TB'];
  const sku = `ID: ${100000 + p.id}`;
  const inStock = p.id % 3 !== 0;
  const category = (p.category || 'home').charAt(0).toUpperCase() + (p.category || 'home').slice(1);

  const ratingBreakdown = [
    { stars:5, pct:0 }, { stars:4, pct:0 }, { stars:3, pct:0 }, { stars:2, pct:0 }, { stars:1, pct:0 },
  ];
  const reviews = [];

  const specs = [
    { icon:'store',   label:'Brand',    value: p.seller || '—' },
    { icon:'tag',     label:'Category', value: category },
    { icon:'package', label:'Model',    value: p.title },
    { icon:'zap',     label:'Material', value:'Premium natural materials' },
    { icon:'truck',   label:'Origin',   value:'Ships from EU warehouse' },
    { icon:'settings',label:'SKU',      value: sku.replace('ID: ', '') },
  ];

  const similar = PRODUCTS.filter(x => x.id !== p.id).slice(0, 6);

  async function addToCart(buyNow) {
    setAddingToCart(true);
    const user = await sbGetUser();
    const variant = { size: sizes[selectedSize], color: colors[selectedColor].name };
    if (user) {
      await sbUpsertCartItem(user.id, p.id, variant, qty, p.price);
    } else {
      window.CART_ITEMS = [...(window.CART_ITEMS || []), { product: p, qty, variant: sizes[selectedSize], seller: p.seller ?? p.shops?.name }];
    }
    setCartCount((window.CART_ITEMS || []).length);
    setAddingToCart(false);
    if (buyNow) { navigate('cart'); return; }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  }

  const descriptionFull = `Handcrafted with premium materials, this ${p.title.toLowerCase()} blends everyday durability with a refined, minimalist look. Its versatile design adapts to any setting, whether at home or on the go. Every unit is quality-checked before shipping to guarantee a product that matches the photos exactly.

Dimensions: Ø 12 × H 22 cm · Weight: 680 g · Material: premium certified materials. Care instructions included in the package. Backed by our 7-day easy returns and official warranty.`;

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* ── Top Navigation Bar (sticky, glass effect) ── */}
      <div style={{ paddingTop:STATUS_H, background:'rgba(255,255,255,0.85)', backdropFilter:'blur(14px)', borderBottom:`1px solid ${C.hairline}`, flexShrink:0, position:'relative', zIndex:50 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={goBack} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={20} color={C.ink} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, justifyContent:'center' }}>
            <div style={{ width:22, height:22, borderRadius:7, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="shoppingBag" size={12} color="#fff" sw={2} />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>CLORIVO</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
            <button style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="share" size={19} color={C.ink} />
            </button>
            <button onClick={() => setLiked(l => !l)} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name={liked ? 'heartFill' : 'heart'} size={19} color={liked ? C.danger : C.ink} filled={liked} />
            </button>
            <button onClick={() => navigate('cart')} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <Icon name="cart" size={19} color={C.ink} />
              {cartCount > 0 && <Badge count={cartCount} />}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable area */}
      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : 90 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 32px 0' : undefined, display: isDesktop ? 'flex' : 'block', gap: isDesktop ? 48 : 0, alignItems: 'flex-start' }}>
        <div style={{ flex: isDesktop ? '0 1 calc(50% - 24px)' : undefined, position: isDesktop ? 'sticky' : undefined, top: isDesktop ? 16 : undefined }}>

        {/* Delivery notice banner */}
        <div style={{ margin: isDesktop ? '0 0 16px' : '12px 16px', display:'flex', alignItems:'center', gap:8, background:C.primarySoft, borderRadius:10, padding:'9px 12px', cursor:'pointer' }}>
          <Icon name="truck" size={16} color={C.primary} style={{ flexShrink:0 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:500, color:C.primaryDeep, flex:1 }}>Free shipping on orders over $50</span>
          <Icon name="chevronRight" size={14} color={C.primary} style={{ flexShrink:0 }} />
        </div>

        {/* Gallery */}
        <div style={{ position:'relative', height:320, margin: isDesktop ? '0' : '0 16px', width: isDesktop ? undefined : 'calc(100% - 32px)', borderRadius:18, overflow:'hidden' }}>
          <Img label={p.label} src={p.image_url} tint={(p.id + selectedColor) % 5} style={{ width:'100%', height:320, borderRadius:0 }} />
          {p.discount && (
            <div style={{ position:'absolute', top:12, left:12, background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:800, padding:'4px 10px', borderRadius:9999 }}>-{p.discount}%</div>
          )}
          {/* Overlaid controls */}
          <div style={{ position:'absolute', top:12, right:12, display:'flex', flexDirection:'column', gap:8 }}>
            <button onClick={() => setLiked(l => !l)} style={{ width:36, height:36, borderRadius:9999, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(14,11,31,0.1)' }}>
              <Icon name={liked ? 'heartFill' : 'heart'} size={17} color={liked ? C.danger : C.ink} filled={liked} />
            </button>
            <button style={{ width:36, height:36, borderRadius:9999, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(14,11,31,0.1)' }}>
              <Icon name="search" size={16} color={C.ink} />
            </button>
          </div>
          {/* Slide dots */}
          <div style={{ position:'absolute', bottom:12, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
            {[0,1,2,3,4].map(i => (
              <button key={i} onClick={() => setImgSlide(i)} style={{ width: i === imgSlide ? 18 : 6, height:6, borderRadius:9999, background: i === imgSlide ? C.white : 'rgba(255,255,255,0.5)', border:'none', cursor:'pointer', padding:0, transition:'all 0.25s' }} />
            ))}
          </div>
        </div>
        </div>

        {/* Info section */}
        <div style={{ padding: isDesktop ? '0' : '16px 20px', display:'flex', flexDirection:'column', gap:16, flex: isDesktop ? '0 1 calc(50% - 24px)' : undefined, minWidth:0 }}>

          {/* Category */}
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.primary, textTransform:'uppercase', letterSpacing:'0.04em' }}>{category}</div>

          {/* Title + rating + SKU */}
          <div style={{ marginTop:-10 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:700, color:C.ink, letterSpacing:'-0.02em', lineHeight:1.3, marginBottom:8 }}>{p.title}</div>
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <Stars rating={p.rating || 4.8} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{p.rating || 4.8} ({(p.reviews || 2341).toLocaleString()} reviews)</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.hairline }}>|</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute }}>{sku}</span>
            </div>
          </div>

          {/* Price + stock */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:C.primary }}>${p.price.toFixed(2)}</span>
              {p.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice}</span>}
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background: inStock ? '#EFF9F4' : '#FFFBEB', borderRadius:9999, padding:'4px 10px' }}>
              <div style={{ width:6, height:6, borderRadius:9999, background: inStock ? C.success : C.warning }} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color: inStock ? C.success : C.warning }}>{inStock ? 'In Stock' : 'Limited Stock'}</span>
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>
              Color · <span style={{ fontWeight:400, color:C.mute }}>{colors[selectedColor].name}</span>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {colors.map((c, i) => (
                <button key={i} onClick={() => setSelectedColor(i)} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer', padding:0,
                }}>
                  <div style={{ width:44, height:44, borderRadius:12, overflow:'hidden', border:`2px solid ${i === selectedColor ? C.primary : C.hairline}`, boxShadow: i === selectedColor ? `0 0 0 3px ${C.primarySoft}` : 'none', transition:'all 0.15s' }}>
                    <Img label="" tint={(p.id + i) % 5} style={{ width:44, height:44 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Storage / size picker */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>Storage</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {sizes.map((s, i) => (
                <button key={i} onClick={() => setSelectedSize(i)} style={{ height:40, padding:'0 16px', borderRadius:10, border:`1.5px solid ${i === selectedSize ? C.primary : C.hairline}`, background: i === selectedSize ? C.primarySoft : C.white, color: i === selectedSize ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight: i === selectedSize ? 700 : 500, cursor:'pointer', transition:'all 0.15s' }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Quantity selector */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>Quantity</div>
            <div style={{ display:'flex', alignItems:'center', gap:0, border:`1.5px solid ${C.hairline}`, borderRadius:10, width:'fit-content' }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:18 }}>−</button>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, minWidth:36, textAlign:'center' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(99, q + 1))} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.ink, fontSize:18 }}>+</button>
            </div>
          </div>

          {/* Seller strip */}
          <div onClick={() => navigate('store', { shopName: p.seller })} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1.5px solid ${C.hairline}`, borderRadius:12, cursor:'pointer' }}>
            <Avatar size={40} initials={p.seller ? p.seller[0].toUpperCase() : 'S'} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>{p.seller || 'Unknown seller'}</span>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>0 followers · New seller</span>
            </div>
            <Icon name="chevronRight" size={18} color={C.mute} />
          </div>

          {/* Shipping & guarantee info */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { icon:'truck', title:'Free Shipping', sub:'2–5 business days' },
              { icon:'package', title:'Free Returns', sub:'Within 7 days' },
              { icon:'checkCircle', title:'Official Warranty', sub:'12 months' },
            ].map((info, i) => (
              <div key={i} style={{ flex:'1 1 100px', minWidth:100, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', background:C.paper, borderRadius:12, textAlign:'center' }}>
                <div style={{ width:32, height:32, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={info.icon} size={15} color={C.primary} />
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.ink, lineHeight:1.2 }}>{info.title}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute }}>{info.sub}</div>
              </div>
            ))}
          </div>

          {/* Buy box — inline on desktop (no fixed bottom bar) */}
          {isDesktop && (
            <div style={{ display:'flex', gap:10, alignItems:'center', paddingTop:4 }}>
              <button onClick={() => navigate('chat')} style={{ width:52, height:52, borderRadius:12, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, flexShrink:0 }}>
                <Icon name="message" size={19} color={C.mute} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute }}>Chat</span>
              </button>
              <Btn variant="secondary" size="lg" style={{ flex:1 }} onClick={() => addToCart(false)} disabled={addingToCart}>
                {addedToCart ? <><Icon name="check" size={16} color={C.primary} /> Added!</> : addingToCart ? 'Adding…' : 'Add to Cart'}
              </Btn>
              <Btn variant="primary" size="lg" style={{ flex:1, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 24px rgba(108,77,255,0.3)' }} onClick={() => addToCart(true)} disabled={addingToCart}>
                Buy Now
              </Btn>
            </div>
          )}

          {/* Description */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Description</div>
            <div style={{
              fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.6, whiteSpace:'pre-line',
              maxHeight: descExpanded ? 999 : 66, overflow:'hidden', transition:'max-height 0.3s ease',
            }}>
              {descriptionFull}
            </div>
            <button onClick={() => setDescExpanded(e => !e)} style={{ border:'none', background:'none', cursor:'pointer', padding:0, marginTop:8, display:'flex', alignItems:'center', gap:3, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary }}>
              {descExpanded ? 'Show Less' : 'Read More'}
              <Icon name="chevronRight" size={13} color={C.primary} style={{ transform: descExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition:'transform 0.2s' }} />
            </button>
          </div>

          {/* Tabs */}
          <div>
            <div style={{ display:'flex', borderBottom:`1px solid ${C.hairline}`, marginBottom:14, overflowX:'auto' }}>
              {['Details','Reviews ('+( p.reviews||234 )+')', 'Shipping', 'Returns'].map((t, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ flex:'1 0 auto', height:40, padding:'0 12px', border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight: i === activeTab ? 700 : 400, color: i === activeTab ? C.ink : C.mute, borderBottom: i === activeTab ? `2px solid ${C.primary}` : '2px solid transparent', transition:'all 0.2s', marginBottom:-1, whiteSpace:'nowrap' }}>{t}</button>
              ))}
            </div>

            {/* Details tab — specifications */}
            {activeTab === 0 && (
              <div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {(specsExpanded ? specs : specs.slice(0, 4)).map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon name={s.icon} size={13} color={C.primary} />
                      </div>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, flex:1 }}>{s.label}</span>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, textAlign:'right' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSpecsExpanded(e => !e)} style={{ width:'100%', border:'none', background:'none', cursor:'pointer', padding:'10px 0 0', display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary }}>
                  {specsExpanded ? 'Hide Specifications' : 'View Full Specifications'}
                  <Icon name="chevronRight" size={13} color={C.primary} style={{ transform: specsExpanded ? 'rotate(-90deg)' : 'rotate(90deg)', transition:'transform 0.2s' }} />
                </button>
              </div>
            )}

            {/* Reviews tab */}
            {activeTab === 1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:36, fontWeight:700, color:C.ink }}>{p.rating || 4.8}</div>
                    <Stars rating={p.rating || 4.8} size={14} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:4 }}>{(p.reviews || 234).toLocaleString()} reviews</div>
                  </div>
                  <div style={{ flex:1, minWidth:160, display:'flex', flexDirection:'column', gap:5 }}>
                    {ratingBreakdown.map(r => (
                      <div key={r.stars} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, width:10 }}>{r.stars}</span>
                        <Icon name="star" size={11} color="#F59E0B" filled />
                        <div style={{ flex:1, height:6, borderRadius:9999, background:C.hairline, overflow:'hidden' }}>
                          <div style={{ width:`${r.pct}%`, height:'100%', background:'#F59E0B', borderRadius:9999 }} />
                        </div>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, width:28, textAlign:'right' }}>{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {reviews.map((r, i) => (
                  <div key={i} style={{ borderTop:`1px solid ${C.hairline}`, paddingTop:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar size={30} initials={r.name[0]} />
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{r.name}</span>
                            {r.verified && (
                              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:C.success, background:'#EFF9F4', borderRadius:9999, padding:'1px 6px' }}>Verified Buyer</span>
                            )}
                          </div>
                          <Stars rating={r.rating} size={11} />
                        </div>
                      </div>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, flexShrink:0 }}>{r.date}</span>
                    </div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5 }}>{r.text}</div>
                  </div>
                ))}
                <button style={{ border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, height:40, cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Load More Reviews</button>
              </div>
            )}

            {/* Shipping tab */}
            {activeTab === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { icon:'truck', title:'Standard', detail:'5 to 8 business days', price:'$3.99' },
                  { icon:'zap', title:'Express',  detail:'2 to 3 business days', price:'$8.99' },
                ].map((m, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1.5px solid ${C.hairline}`, borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name={m.icon} size={17} color={C.primary} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>{m.title}</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{m.detail}</div>
                    </div>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.ink }}>{m.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Returns tab */}
            {activeTab === 3 && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { icon:'checkCircle', title:'7-day easy returns', detail:'Change of mind? Return it within 7 days of delivery for a full refund.' },
                  { icon:'package',     title:'Free return shipping', detail:'We cover the cost of return shipping for eligible items.' },
                  { icon:'lock',        title:'Official warranty', detail:'12-month manufacturer warranty against defects.' },
                ].map((m, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', border:`1.5px solid ${C.hairline}`, borderRadius:12 }}>
                    <div style={{ width:36, height:36, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name={m.icon} size={17} color={C.primary} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, marginBottom:2 }}>{m.title}</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, lineHeight:1.4 }}>{m.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Similar products */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Similar Products</span>
              <button style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:2 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>See All</span>
                <Icon name="chevronRight" size={13} color={C.primary} />
              </button>
            </div>
            <div style={{ display:'flex', gap:12, overflowX:'auto', paddingBottom:4, margin: isDesktop ? '0' : '0 -20px', padding: isDesktop ? undefined : '0 20px 4px' }}>
              {similar.map((sp, i) => (
                <div key={sp.id} onClick={() => navigate('pdp', { product: sp })} style={{ width:140, flexShrink:0, cursor:'pointer' }}>
                  <div style={{ position:'relative', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
                    <Img label="" tint={(i+1)%5} style={{ width:140, height:140 }} />
                    {sp.discount && (
                      <div style={{ position:'absolute', top:6, left:6, background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:800, padding:'2px 6px', borderRadius:9999 }}>-{sp.discount}%</div>
                    )}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', marginBottom:4, minHeight:31 }}>{sp.title}</div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${sp.price.toFixed(2)}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
                      <Icon name="star" size={10} color="#F59E0B" filled />
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{sp.rating || 4.7}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Sticky bottom action bar — mobile only */}
      {!isDesktop && (
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 28px', background:'rgba(255,255,255,0.92)', backdropFilter:'blur(14px)', borderTop:`1px solid ${C.hairline}`, display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={() => navigate('chat')} style={{ width:50, height:50, borderRadius:12, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, flexShrink:0 }}>
          <Icon name="message" size={19} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute }}>Chat</span>
        </button>
        <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => addToCart(false)} disabled={addingToCart}>
          {addedToCart ? <><Icon name="check" size={16} color={C.primary} /> Added!</> : addingToCart ? 'Adding…' : 'Add to Cart'}
        </Btn>
        <Btn variant="primary" size="md" style={{ flex:1, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.32)' }} onClick={() => addToCart(true)} disabled={addingToCart}>
          Buy Now
        </Btn>
      </div>
      )}
    </div>
  );
}

Object.assign(window, { ProductDetailsScreen });
