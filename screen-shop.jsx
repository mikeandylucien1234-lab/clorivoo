// screen-shop.jsx — Seller shop customization + live preview

function ShopCustomizeScreen() {
  const { navigate, goBack } = useNav();
  const [tab, setTab] = React.useState('preview'); // preview | edit

  // Editable shop state
  const [shopName, setShopName]   = React.useState('luna.studio');
  const [shopBio, setShopBio]     = React.useState('Handmade decor pieces · ceramic & linen');
  const [accent, setAccent]       = React.useState('#6C4DFF');
  const [banners, setBanners]     = React.useState([
    { id:1, title:'New spring collection', sub:'-20% this week', color:'#6C4DFF', tint:0 },
    { id:2, title:'Limited terracotta edition',     sub:'One-of-a-kind pieces',      color:'#C97B5A', tint:1 },
  ]);
  const [bannerIdx, setBannerIdx] = React.useState(0);

  const accentOptions = ['#6C4DFF', '#C97B5A', '#1F8A5B', '#2563EB', '#DB2777'];
  const shopProducts  = PRODUCTS.slice(0, 6);

  React.useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(() => setBannerIdx(i => (i + 1) % banners.length), 2600);
    return () => clearInterval(t);
  }, [banners.length]);

  function addBanner() {
    const colors = ['#6C4DFF','#C97B5A','#1F8A5B','#2563EB','#DB2777','#EA580C'];
    const id = Date.now();
    setBanners(prev => [...prev, { id, title:'New banner', sub:'Tap to edit', color:colors[prev.length % colors.length], tint:prev.length % 5 }]);
  }
  function removeBanner(id) {
    setBanners(prev => prev.filter(b => b.id !== id));
    setBannerIdx(0);
  }

  // ─── LIVE PREVIEW (how buyers see the shop) ───
  function ShopPreview() {
    const b = banners[bannerIdx];
    return (
      <div style={{ margin:'0 16px', borderRadius:20, overflow:'hidden', border:`1px solid ${C.hairline}`, background:C.white, boxShadow:'0 8px 30px rgba(14,11,31,0.10)' }}>
        {/* mini status hint */}
        <div style={{ background:C.paper, padding:'5px 0', textAlign:'center', borderBottom:`1px solid ${C.hairline}` }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:C.mute, letterSpacing:'0.04em' }}>BUYER-SIDE PREVIEW</span>
        </div>
        {/* Cover */}
        <div style={{ height:84, position:'relative', overflow:'hidden' }}>
          <Img label="" tint={2} style={{ position:'absolute', inset:0, borderRadius:0 }} />
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg, ${accent}cc, ${accent}66)` }} />
          <button style={{ position:'absolute', top:8, left:8, width:26, height:26, borderRadius:9999, background:'rgba(255,255,255,0.85)', border:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="arrowLeft" size={14} color={C.ink} />
          </button>
        </div>
        {/* Shop header */}
        <div style={{ padding:'0 14px 12px', marginTop:-24 }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, marginBottom:8 }}>
            <div style={{ width:54, height:54, borderRadius:14, background:accent, border:`3px solid ${C.white}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:22, color:'#fff' }}>{shopName[0].toUpperCase()}</span>
            </div>
            <div style={{ flex:1, paddingBottom:2 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{shopName}</span>
                <div style={{ width:16, height:16, borderRadius:9999, background:accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="check" size={9} color="#fff" sw={3} />
                </div>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>2.4k followers · ⭐ 4.9</span>
            </div>
            <button style={{ background:accent, border:'none', borderRadius:9999, padding:'6px 14px', color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600 }}>Follow</button>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, lineHeight:1.4 }}>{shopBio}</div>
        </div>
        {/* Rotating banner */}
        {banners.length > 0 && (
          <div style={{ padding:'0 14px 12px' }}>
            <div style={{ height:88, borderRadius:12, background:`linear-gradient(135deg, ${b.color}, ${b.color}bb)`, padding:'12px 14px', position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ position:'absolute', right:-15, top:-15, width:80, height:80, borderRadius:9999, background:'rgba(255,255,255,0.1)' }} />
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1.15, zIndex:1 }}>{b.title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.85)', marginTop:3, zIndex:1 }}>{b.sub}</div>
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:4, marginTop:6 }}>
              {banners.map((_, i) => <div key={i} style={{ width: i === bannerIdx ? 14 : 5, height:5, borderRadius:9999, background: i === bannerIdx ? accent : C.hairline, transition:'all 0.3s' }} />)}
            </div>
          </div>
        )}
        {/* Product grid */}
        <div style={{ padding:'0 14px 14px' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:8 }}>Products ({shopProducts.length})</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
            {shopProducts.map((p, i) => (
              <div key={p.id} style={{ borderRadius:8, overflow:'hidden' }}>
                <Img label="" tint={i % 5} style={{ width:'100%', height:64, borderRadius:0 }} />
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700, color:C.ink, marginTop:3 }}>${p.price.toFixed(0)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      {/* Header */}
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="My Shop" onBack={goBack} right={
          <button onClick={() => navigate('home')} style={{ width:44, height:44, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="eye" size={20} color={C.primary} />
          </button>
        } />
        {/* Tabs */}
        <div style={{ display:'flex', padding:'0 16px' }}>
          {[['preview','Preview'],['edit','Customize']].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex:1, height:42, border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight: tab === k ? 700 : 500, color: tab === k ? C.primary : C.mute, borderBottom: tab === k ? `2px solid ${C.primary}` : '2px solid transparent', marginBottom:-1 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingTop:16, paddingBottom:40, display:'flex', flexDirection:'column', gap:14 }}>

        {/* PREVIEW TAB */}
        {tab === 'preview' && (
          <>
            <ShopPreview />
            <div style={{ margin:'0 16px' }}>
              <Btn variant="primary" size="lg" wide onClick={() => setTab('edit')}>
                <Icon name="settings" size={17} color="#fff" /> Customize my shop
              </Btn>
            </div>
          </>
        )}

        {/* EDIT TAB */}
        {tab === 'edit' && (
          <>
            {/* Logo & cover */}
            <div style={{ margin:'0 16px', background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>Logo & cover</div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={{ flex:1, height:80, border:`2px dashed ${C.hairline}`, borderRadius:12, background:C.paper, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Icon name="camera" size={20} color={C.primary} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Logo</span>
                </button>
                <button style={{ flex:2, height:80, border:`2px dashed ${C.hairline}`, borderRadius:12, background:C.paper, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}>
                  <Icon name="camera" size={20} color={C.primary} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Cover photo</span>
                </button>
              </div>
            </div>

            {/* Shop info */}
            <div style={{ margin:'0 16px', background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>Information</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <Input label="Shop name" value={shopName} onChange={e => setShopName(e.target.value)} iconLeft={<Icon name="store" size={16} color={C.mute} />} />
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute, marginBottom:5 }}>Description</div>
                  <div style={{ border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'10px 14px', background:C.white }}>
                    <textarea value={shopBio} onChange={e => setShopBio(e.target.value)} rows={2} style={{ width:'100%', border:'none', outline:'none', resize:'none', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink, background:'transparent' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Accent color */}
            <div style={{ margin:'0 16px', background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:12 }}>Shop color</div>
              <div style={{ display:'flex', gap:12 }}>
                {accentOptions.map((c, i) => (
                  <button key={i} onClick={() => setAccent(c)} style={{ width:38, height:38, borderRadius:9999, background:c, border:`3px solid ${accent === c ? C.ink : 'transparent'}`, outline: accent === c ? `1.5px solid ${c}` : 'none', outlineOffset:1, cursor:'pointer', transition:'all 0.15s' }} />
                ))}
              </div>
            </div>

            {/* Banners management */}
            <div style={{ margin:'0 16px', background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Banners ({banners.length})</span>
                <button onClick={addBanner} style={{ border:'none', background:C.primarySoft, borderRadius:9999, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <Icon name="plus" size={14} color={C.primary} sw={2.5} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>Add</span>
                </button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {banners.map((bn, i) => (
                  <div key={bn.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px', border:`1.5px solid ${C.hairline}`, borderRadius:12 }}>
                    <div style={{ width:48, height:48, borderRadius:10, background:`linear-gradient(135deg, ${bn.color}, ${bn.color}bb)`, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bn.title}</div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bn.sub}</div>
                    </div>
                    <button onClick={() => removeBanner(bn.id)} style={{ width:32, height:32, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="x" size={16} color={C.danger} />
                    </button>
                  </div>
                ))}
                {banners.length === 0 && (
                  <div style={{ textAlign:'center', padding:'16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No banners yet. Add one to showcase your offers.</div>
                )}
              </div>
            </div>

            {/* Featured products */}
            <div style={{ margin:'0 16px', background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>Featured products</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:12 }}>Drag to reorder · select featured items</div>
              <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                {shopProducts.map((p, i) => (
                  <div key={p.id} style={{ width:80, flexShrink:0, position:'relative' }}>
                    <div style={{ width:80, height:80, borderRadius:10, overflow:'hidden', border: i < 3 ? `2px solid ${C.primary}` : `2px solid transparent` }}>
                      <Img label="" tint={i % 5} style={{ width:80, height:80 }} />
                    </div>
                    {i < 3 && (
                      <div style={{ position:'absolute', top:4, right:4, width:18, height:18, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="star" size={10} color="#fff" filled />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <div style={{ margin:'0 16px' }}>
              <Btn variant="primary" size="lg" wide onClick={() => setTab('preview')}>
                <Icon name="check" size={17} color="#fff" sw={2.5} /> Save & preview
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ShopCustomizeScreen });
