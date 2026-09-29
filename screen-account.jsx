// screen-account.jsx — Wishlist + Profile

// ─── WISHLIST ─────────────────────────────────────────────────
function WishlistScreen() {
  const { navigate } = useNav();
  const [activeCol, setActiveCol] = React.useState(0);
  const collections = ['All · 14', 'Home · 6', 'Gifts · 4', '+ New list'];
  const products    = PRODUCTS.slice(0, 8);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="My Wishlist" onBack={false}
          right={
            <button style={{ width:44, height:44, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="settings" size={20} color={C.mute} />
            </button>
          }
        />
        {/* Collection tabs */}
        <div style={{ display:'flex', gap:8, padding:'8px 16px 12px', overflowX:'auto' }}>
          {collections.map((c, i) => (
            <Chip key={i} active={i === activeCol} onClick={() => setActiveCol(i)}>{c}</Chip>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', paddingBottom: NAV_H + HOME_H }}>
        {/* Sort / filter row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{products.length} items</span>
          <button style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, color:C.mute }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13 }}>Sort</span>
            <Icon name="chevronRight" size={14} color={C.mute} style={{ transform:'rotate(90deg)' }} />
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} size="md" tint={i % 5} onPress={() => navigate('pdp', { product: p })} />
          ))}
        </div>
      </div>

      <BottomNav active={4} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 2) navigate('cart');
        else if (i === 3) navigate('tracking');
      }} />
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────
function ProfileScreen() {
  const { navigate } = useNav();
  const stats = [
    { value:'28', label:'orders' },
    { value:'14', label:'wishlist' },
    { value:'1.2k', label:'points' },
    { value:'Gold', label:'status' },
  ];
  const orderStatuses = [
    { icon:'creditCard', label:'To pay', count:1 },
    { icon:'package',    label:'To ship', count:0 },
    { icon:'truck',      label:'In transit', count:3 },
    { icon:'star',       label:'To review', count:2 },
  ];
  const menuGroups = [
    {
      items: [
        { icon:'package',    label:'My orders', detail:'3 in progress', action: () => navigate('tracking') },
        { icon:'mapPin',     label:'Addresses',       detail:'2 saved', action: () => {} },
        { icon:'creditCard', label:'Payments',       detail:'Visa, PayPal', action: () => {} },
      ],
    },
    {
      items: [
        { icon:'store', label:'Become a seller', detail:'Earn on clorivo', action: () => navigate('become-seller'), accent:true },
      ],
    },
    {
      items: [
        { icon:'help',     label:'Help & Support',   action: () => {} },
        { icon:'settings', label:'Settings',       action: () => {} },
        { icon:'lock',     label:'Admin console',    action: () => navigate('admin') },
        { icon:'logOut',   label:'Log out',   action: () => navigate('login'), danger:true },
      ],
    },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ flex:1, overflowY:'auto', paddingTop: STATUS_H, paddingBottom: NAV_H + HOME_H }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 0', background:C.white }}>
          {/* Greeting + user info */}
          <div style={{ display:'flex', alignItems:'center', gap:14, paddingBottom:12 }}>
            <div style={{ position:'relative' }}>
              <Avatar size={60} initials="AM" />
              <div style={{ position:'absolute', bottom:0, right:0, width:20, height:20, borderRadius:9999, background:C.primary, border:`2px solid ${C.white}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="camera" size={10} color="#fff" />
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginBottom:1 }}>Hello 👋</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Alex Martin</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>Member since March 2024 · ⭐ 4.9</div>
            </div>
            <button style={{ border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:9999, padding:'7px 14px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.ink }}>Edit</button>
          </div>

          {/* Delivery address strip */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.primarySoft, borderRadius:12, marginBottom:16, cursor:'pointer' }}>
            <Icon name="mapPin" size={16} color={C.primary} />
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginBottom:1 }}>Delivery address</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primaryDeep }}>14 Roquette Street, 75011 Paris</div>
            </div>
            <Icon name="chevronRight" size={14} color={C.primary} />
          </div>

          {/* Stats */}
          <div style={{ display:'flex', borderTop:`1px solid ${C.hairline}`, marginLeft:-20, marginRight:-20 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ flex:1, padding:'12px 8px', textAlign:'center', borderRight: i < stats.length - 1 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color:C.primary }}>{s.value}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Order quick row */}
        <div style={{ margin:'14px 16px 0', background:C.white, borderRadius:16, padding:'14px 10px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 8px', marginBottom:12 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>My orders</span>
            <button onClick={() => navigate('tracking')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.primary, fontWeight:500 }}>See all</button>
          </div>
          <div style={{ display:'flex', justifyContent:'space-around' }}>
            {orderStatuses.map((s, i) => (
              <button key={i} onClick={() => navigate('tracking')} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer', position:'relative', padding:'0 8px' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={s.icon} size={20} color={C.mute} />
                  {s.count > 0 && (
                    <div style={{ position:'absolute', top:0, right:4, width:18, height:18, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.white}` }}>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff' }}>{s.count}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, whiteSpace:'nowrap' }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu groups */}
        {menuGroups.map((group, gi) => (
          <div key={gi} style={{ margin:'14px 16px 0', background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
            {group.items.map((item, ii) => (
              <button key={ii} onClick={item.action} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                border:'none', borderTop: ii > 0 ? `1px solid ${C.hairline}` : 'none',
                background: item.accent ? C.primarySoft : C.white,
                cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ width:36, height:36, borderRadius:10, background: item.accent ? C.primary : item.danger ? '#FFF0F0' : C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={item.icon} size={17} color={item.accent ? '#fff' : item.danger ? C.danger : C.mute} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color: item.accent ? C.primaryDeep : item.danger ? C.danger : C.ink }}>{item.label}</div>
                  {item.detail && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>{item.detail}</div>}
                </div>
                {!item.danger && <Icon name="chevronRight" size={16} color={C.mute} />}
              </button>
            ))}
          </div>
        ))}

        {/* Version */}
        <div style={{ textAlign:'center', padding:'20px 0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.hairline }}>clorivo v1.0.0</div>
      </div>

      <BottomNav active={4} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 2) navigate('cart');
        else if (i === 3) navigate('tracking');
      }} />
    </div>
  );
}

Object.assign(window, { WishlistScreen, ProfileScreen });
