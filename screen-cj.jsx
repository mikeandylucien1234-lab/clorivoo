// screen-cj.jsx — CJdropshipping : Connect · Browse · Edit & Publish

// ─── CJ CONNECT ───────────────────────────────────────────────
function CjConnectScreen() {
  const { navigate, goBack } = useNav();
  const [connected, setConnected] = React.useState(false);
  const [loading, setLoading]     = React.useState(false);

  function handleConnect() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setConnected(true); }, 1200);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Import Products" onBack={goBack} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 20px 40px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* Brand connection header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:26, color:'#fff', letterSpacing:'-0.04em' }}>c</span>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {[0,1,2].map(i => <div key={i} style={{ width:4, height:4, borderRadius:9999, background: connected ? C.success : C.hairline, transition:'background 0.3s' }} />)}
          </div>
          <div style={{ width:44, height:44, borderRadius:12, background:'#1E3A5F', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:11, color:'#fff', letterSpacing:'-0.02em' }}>CJ</span>
          </div>
        </div>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:6 }}>
            {connected ? 'Account connected!' : 'Connect your CJ account'}
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5 }}>
            {connected
              ? 'You can now import products from the CJ catalog.'
              : 'Sync your products, auto-forward orders, and track stock in real time.'}
          </div>
        </div>

        {!connected ? (
          <>
            <Input label="CJ Email" placeholder="seller@cj.com" type="email" iconLeft={<Icon name="mail" size={16} color={C.mute} />} />
            <div>
              <Input label="API Key" value="sk_live_••••••8421" iconLeft={<Icon name="lock" size={16} color={C.mute} />} type="password" />
            </div>
            <div style={{ background:C.primarySoft, border:`1.5px solid ${C.primary}`, borderRadius:12, padding:'12px 14px', display:'flex', gap:10 }}>
              <Icon name="help" size={16} color={C.primary} style={{ flexShrink:0, marginTop:1 }} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep, lineHeight:1.5 }}>
                Find your API key in CJ → Settings → Developer. We only use read + order endpoints.
              </span>
            </div>
            <Btn variant="primary" size="lg" wide onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting…' : 'Connect account'}
            </Btn>
          </>
        ) : (
          <>
            {/* Connected state */}
            <div style={{ background:'#EFF9F4', border:`1.5px solid ${C.success}`, borderRadius:14, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <Icon name="checkCircle" size={20} color={C.success} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.success }}>Sync active</span>
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute }}>seller@cj.com · API connected</div>
            </div>
            <Btn variant="primary" size="lg" wide onClick={() => navigate('cj-search')}>
              Browse the catalog
              <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
            </Btn>
          </>
        )}

        {/* Benefits list */}
        <div style={{ borderTop:`1px solid ${C.hairline}`, paddingTop:16 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>What you get</div>
          {[
            ['zap',       '1-click product import'],
            ['truck',     'Automatic stock sync'],
            ['package',   'Automatic order forwarding'],
            ['check',     'Unified shipping labels'],
          ].map(([icon, text], i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name={icon} size={15} color={C.primary} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CJ SEARCH ────────────────────────────────────────────────
function CjSearchScreen() {
  const { navigate, goBack } = useNav();
  const [activeFilter, setActiveFilter] = React.useState(0);
  const [imported, setImported]         = React.useState([]);

  const filters = ['All','EU Stock','Fast ship','< $10'];
  const catalog = [
    { id:1, title:'TWS Earbuds · Noise Cancel Pro', cost:4.20, sell:24.99, margin:20.79, ship:'EU · 3d', stock:2340 },
    { id:2, title:'Wireless mini buds BT 5.3',         cost:2.80, sell:15.99, margin:13.19, ship:'EU · 2d', stock:1180 },
    { id:3, title:'Open-ear sport clip Pro',            cost:6.10, sell:29.99, margin:23.89, ship:'CN · 8d', stock:8400 },
    { id:4, title:'Magnetic charger 15W',            cost:1.90, sell:12.99, margin:11.09, ship:'EU · 4d', stock:4200 },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="CJ Catalog" onBack={goBack} right={
          imported.length > 0 && (
            <div style={{ background:C.primarySoft, borderRadius:9999, padding:'4px 10px' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>Cart ({imported.length})</span>
            </div>
          )
        } />
        {/* Search */}
        <div style={{ padding:'8px 16px 0', display:'flex', gap:8 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'9px 14px' }}>
            <Icon name="search" size={16} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>wireless earbuds</span>
          </div>
          <button style={{ width:42, height:42, border:`1.5px solid ${C.hairline}`, borderRadius:12, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="settings" size={18} color={C.mute} />
          </button>
        </div>
        <div style={{ display:'flex', gap:8, padding:'8px 16px 12px', overflowX:'auto' }}>
          {filters.map((f, i) => <Chip key={i} active={activeFilter === i} onClick={() => setActiveFilter(i)}>{f}</Chip>)}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, paddingBottom:30 }}>
        {catalog.map((p, i) => {
          const isImported = imported.includes(p.id);
          return (
            <div key={i} style={{ background:C.white, borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', gap:12 }}>
              <Img label="" tint={i+2} style={{ width:72, height:72, borderRadius:10, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, lineHeight:1.3, marginBottom:4 }}>{p.title}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:6 }}>{p.ship} · stock {p.stock.toLocaleString()}</div>
                <div style={{ display:'flex', gap:6, alignItems:'baseline', marginBottom:4 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>cost</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:C.ink }}>${p.cost}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>→ sell</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:C.primary }}>${p.sell}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.success }}>margin ${p.margin.toFixed(2)}</span>
                  <Btn
                    variant={isImported ? 'soft' : 'primary'}
                    size="sm"
                    onClick={() => {
                      if (!isImported) {
                        setImported(prev => [...prev, p.id]);
                      } else {
                        navigate('cj-publish', { product: p });
                      }
                    }}
                  >
                    {isImported ? <><Icon name="check" size={13} color={C.primaryDeep} /> Imported</> : '+ Import'}
                  </Btn>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {imported.length > 0 && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 28px', background:C.white, borderTop:`1px solid ${C.hairline}` }}>
          <Btn variant="primary" size="lg" wide onClick={() => navigate('cj-publish', { product: catalog[0] })}>
            Edit and publish ({imported.length})
            <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── CJ PUBLISH ───────────────────────────────────────────────
function CjPublishScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const [title, setTitle]   = React.useState('TWS Earbuds — Noise Cancelling Pro');
  const [price, setPrice]   = React.useState('24.99');
  const [compare, setComp]  = React.useState('49.99');
  const [loading, setLoad]  = React.useState(false);

  const cost = 4.20;
  const margin = (parseFloat(price) || 0) - cost;
  const marginPct = cost > 0 ? ((margin / parseFloat(price)) * 100).toFixed(0) : 0;

  function publish() {
    setLoad(true);
    setTimeout(() => { setLoad(false); navigate('seller-home'); }, 1000);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Edit Before Publishing" onBack={goBack} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14, paddingBottom:100 }}>

        {/* Image strip */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>Product photos</div>
          <div style={{ display:'flex', gap:8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width:72, height:72, borderRadius:10, overflow:'hidden', border:`2px solid ${i === 0 ? C.primary : C.hairline}` }}>
                <Img label={`${i+1}`} tint={i+2} style={{ width:72, height:72 }} />
              </div>
            ))}
            <div style={{ width:72, height:72, borderRadius:10, border:`2px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <Icon name="plus" size={22} color={C.mute} />
            </div>
          </div>
        </div>

        <Input label="Product title" value={title} onChange={e => setTitle(e.target.value)} />

        <div style={{ display:'flex', gap:10 }}>
          <Input label="Your price" value={price} onChange={e => setPrice(e.target.value)} iconLeft={<span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, color:C.mute }}>$</span>} style={{ flex:1 }} />
          <Input label="Compare-at price" value={compare} onChange={e => setComp(e.target.value)} iconLeft={<span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, color:C.mute }}>$</span>} style={{ flex:1 }} />
        </div>

        {/* Margin indicator */}
        <div style={{ display:'flex', gap:8, alignItems:'center', background:'#EFF9F4', borderRadius:10, padding:'10px 14px' }}>
          <Icon name="barChart" size={16} color={C.success} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.success }}>Margin ${margin.toFixed(2)} ({marginPct}%)</span>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>· CJ cost ${cost}</span>
        </div>

        {/* Description */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute, marginBottom:8 }}>Description</div>
          <div style={{ border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'12px 14px', minHeight:90, background:C.white }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5 }}>Enjoy crystal-clear sound with this pair of active noise-cancelling TWS earbuds. 30h battery life with the charging case…</span>
          </div>
          <button style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
            <Icon name="zap" size={14} color={C.primary} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Rewrite with AI</span>
          </button>
        </div>

        {/* Tags */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute, marginBottom:8 }}>Categories & tags</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Chip active>Electronics</Chip>
            <Chip active>Audio</Chip>
            <Chip>+ Tag</Chip>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 20px 28px', background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', gap:10 }}>
        <Btn variant="secondary" size="md" style={{ flex:1 }}>Draft</Btn>
        <Btn variant="primary" size="md" style={{ flex:1.6 }} onClick={publish} disabled={loading}>
          {loading ? 'Publishing…' : 'Publish to shop →'}
        </Btn>
      </div>
    </div>
  );
}

Object.assign(window, { CjConnectScreen, CjSearchScreen, CjPublishScreen });
