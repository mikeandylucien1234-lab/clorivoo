// screen-pdp.jsx — Product Details Page

function ProductDetailsScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const product  = params.product || PRODUCTS[0];
  const p        = product;

  const [selectedColor, setSelectedColor] = React.useState(0);
  const [selectedSize,  setSelectedSize]  = React.useState(1);
  const [activeTab,     setActiveTab]     = React.useState(0);
  const [liked,         setLiked]         = React.useState(false);
  const [imgSlide,      setImgSlide]      = React.useState(0);
  const [addedToCart,   setAddedToCart]   = React.useState(false);

  const colors  = ['#C97B5A','#3B3730','#E6E1D4','#7A8A6A'];
  const sizes   = ['XS','S','M','L','XL'];
  const reviews = [
    { name:'Marie L.', rating:5, text:'Qualité impeccable, exactement comme sur les photos. Livraison rapide.', date:'il y a 3 jours' },
    { name:'Thomas R.', rating:4, text:'Très beau produit, finitions soignées. Je recommande.', date:'il y a 1 semaine' },
  ];

  async function addToCart() {
    const user = await sbGetUser();
    const variant = { size: sizes[selectedSize], color: selectedColor };
    if (user) {
      await sbUpsertCartItem(user.id, p.id, variant, 1, p.price);
    } else {
      window.CART_ITEMS = [...window.CART_ITEMS, { product: p, qty:1, variant: sizes[selectedSize], seller: p.seller ?? p.shops?.name }];
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1800);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />

      {/* Scrollable area */}
      <div style={{ flex:1, overflowY:'auto', paddingTop: STATUS_H, paddingBottom: isDesktop ? 40 : 90 }}>
        <div style={{ maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '24px 32px 0' : undefined, display: isDesktop ? 'flex' : 'block', gap: isDesktop ? 48 : 0, alignItems: 'flex-start' }}>
        <div style={{ flex: isDesktop ? '0 0 50%' : undefined, position: isDesktop ? 'sticky' : undefined, top: isDesktop ? 16 : undefined }}>

        {/* Gallery */}
        <div style={{ position:'relative', height:320, borderRadius: isDesktop ? 16 : 0, overflow: isDesktop ? 'hidden' : 'visible' }}>
          <Img label={p.label} tint={p.id % 5} style={{ width:'100%', height:320, borderRadius:0 }} />
          {/* Overlaid controls */}
          <div style={{ position:'absolute', top:12, left:16, right:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setLiked(l => !l)} style={{ width:36, height:36, borderRadius:9999, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={liked ? 'heartFill' : 'heart'} size={18} color={liked ? C.danger : C.ink} filled={liked} />
              </button>
              <button style={{ width:36, height:36, borderRadius:9999, background:'rgba(255,255,255,0.88)', backdropFilter:'blur(8px)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="share" size={18} color={C.ink} />
              </button>
            </div>
          </div>
          {/* Slide dots */}
          <div style={{ position:'absolute', bottom:12, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
            {[0,1,2,3,4].map(i => (
              <button key={i} onClick={() => setImgSlide(i)} style={{ width: i === imgSlide ? 18 : 6, height:6, borderRadius:9999, background: i === imgSlide ? C.white : 'rgba(255,255,255,0.5)', border:'none', cursor:'pointer', padding:0, transition:'all 0.25s' }} />
            ))}
          </div>
          {/* Thumbnail strip */}
          <div style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:6 }}>
            {[0,1,2].map(i => (
              <div key={i} onClick={() => setImgSlide(i)} style={{ width:36, height:36, borderRadius:8, overflow:'hidden', border:`2px solid ${i === imgSlide ? C.primary : 'transparent'}`, cursor:'pointer' }}>
                <Img label="" tint={(p.id + i) % 5} style={{ width:36, height:36 }} />
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Info section */}
        <div style={{ padding: isDesktop ? '0' : '16px 20px', display:'flex', flexDirection:'column', gap:16, flex: isDesktop ? '0 0 50%' : undefined }}>

          {/* Price + title */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:700, color:C.primary }}>${p.price.toFixed(2)}</span>
              {p.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice}</span>}
              {p.discount && <span style={{ background:C.primarySoft, color:C.primaryDeep, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, padding:'3px 8px', borderRadius:9999 }}>-{p.discount}%</span>}
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:600, color:C.ink, letterSpacing:'-0.02em', lineHeight:1.3, marginBottom:8 }}>{p.title}</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Stars rating={p.rating || 4.8} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{p.rating || 4.8} · {(p.reviews || 2341).toLocaleString()} avis</span>
              {p.sold && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>· {p.sold}</span>}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>
              Couleur · <span style={{ fontWeight:400, color:C.mute }}>terracotta</span>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              {colors.map((c, i) => (
                <button key={i} onClick={() => setSelectedColor(i)} style={{ width:32, height:32, borderRadius:9999, background:c, border:`2.5px solid ${i === selectedColor ? C.primary : 'transparent'}`, outline: i === selectedColor ? `1.5px solid ${C.primarySoft}` : 'none', outlineOffset:1, cursor:'pointer', transition:'all 0.15s' }} />
              ))}
            </div>
          </div>

          {/* Size picker */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>Taille</div>
            <div style={{ display:'flex', gap:8 }}>
              {sizes.map((s, i) => (
                <button key={i} onClick={() => setSelectedSize(i)} style={{ width:44, height:44, borderRadius:10, border:`1.5px solid ${i === selectedSize ? C.primary : C.hairline}`, background: i === selectedSize ? C.primarySoft : C.white, color: i === selectedSize ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight: i === selectedSize ? 700 : 400, cursor:'pointer', transition:'all 0.15s' }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Seller strip */}
          <div onClick={() => {}} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`1.5px solid ${C.hairline}`, borderRadius:12, cursor:'pointer' }}>
            <Avatar size={40} initials={p.seller ? p.seller[0].toUpperCase() : 'L'} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>{p.seller || 'luna.studio'}</span>
                <div style={{ background:'#EFF9F4', borderRadius:9999, padding:'2px 7px', display:'flex', alignItems:'center', gap:3 }}>
                  <Icon name="check" size={11} color={C.success} sw={2.5} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.success }}>Vérifié</span>
                </div>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>2.4k abonnés · 99% d'avis positifs</span>
            </div>
            <Icon name="chevronRight" size={18} color={C.mute} />
          </div>

          {/* Delivery info */}
          <div style={{ display:'flex', gap:16 }}>
            {[
              { icon:'truck', text:'Livraison gratuite dès $30' },
              { icon:'package', text:'Expédition sous 2 jours' },
            ].map((info, i) => (
              <div key={i} style={{ flex:1, display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:C.paper, borderRadius:10 }}>
                <Icon name={info.icon} size={16} color={C.primary} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, lineHeight:1.3 }}>{info.text}</span>
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
              <Btn variant="secondary" size="lg" style={{ flex:1 }} onClick={addToCart}>
                {addedToCart ? <><Icon name="check" size={16} color={C.primary} /> Ajouté !</> : 'Ajouter au panier'}
              </Btn>
              <Btn variant="primary" size="lg" style={{ flex:1 }} onClick={() => navigate('cart')}>
                Acheter
              </Btn>
            </div>
          )}

          {/* Tabs */}
          <div>
            <div style={{ display:'flex', borderBottom:`1px solid ${C.hairline}`, marginBottom:14 }}>
              {['Description','Avis ('+( p.reviews||234 )+')', 'Livraison'].map((t, i) => (
                <button key={i} onClick={() => setActiveTab(i)} style={{ flex:1, height:40, border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight: i === activeTab ? 600 : 400, color: i === activeTab ? C.ink : C.mute, borderBottom: i === activeTab ? `2px solid ${C.primary}` : '2px solid transparent', transition:'all 0.2s', marginBottom:-1 }}>{t}</button>
              ))}
            </div>
            {activeTab === 0 && (
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, lineHeight:1.6 }}>
                Façonné à la main par des artisans, ce vase en terracotta nervurée marie robustesse et élégance minimaliste. Sa forme organique s'adapte à toutes les compositions florales. Produit d'origine certifiée.
                <br /><br />
                Dimensions : Ø 12 × H 22 cm · Poids : 680 g · Matière : terracotta naturelle
              </div>
            )}
            {activeTab === 1 && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:700, color:C.ink }}>{p.rating || 4.8}</div>
                  <div>
                    <Stars rating={p.rating || 4.8} size={16} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2 }}>{(p.reviews || 234).toLocaleString()} avis vérifiés</div>
                  </div>
                </div>
                {reviews.map((r, i) => (
                  <div key={i} style={{ borderTop:`1px solid ${C.hairline}`, paddingTop:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar size={28} initials={r.name[0]} />
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{r.name}</span>
                      </div>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{r.date}</span>
                    </div>
                    <Stars rating={r.rating} size={12} />
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5, marginTop:6 }}>{r.text}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  { icon:'truck', title:'Standard', detail:'5 à 8 jours ouvrés', price:'$3.99' },
                  { icon:'zap', title:'Express',  detail:'2 à 3 jours ouvrés', price:'$8.99' },
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
          </div>
        </div>
        </div>
      </div>

      {/* Sticky CTA — mobile only */}
      {!isDesktop && (
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 28px', background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', gap:10, alignItems:'center' }}>
        <button onClick={() => navigate('chat')} style={{ width:50, height:50, borderRadius:12, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, flexShrink:0 }}>
          <Icon name="message" size={19} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute }}>Chat</span>
        </button>
        <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={addToCart}>
          {addedToCart ? <><Icon name="check" size={16} color={C.primary} /> Ajouté !</> : 'Ajouter au panier'}
        </Btn>
        <Btn variant="primary" size="md" style={{ flex:1 }} onClick={() => navigate('cart')}>
          Acheter
        </Btn>
      </div>
      )}
    </div>
  );
}

Object.assign(window, { ProductDetailsScreen });
