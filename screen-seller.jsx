// screen-seller.jsx — Become Seller · KYC · Seller Dashboard · Orders

// ─── STEPPER COMPONENT ───────────────────────────────────────
function KycStepper({ step }) {
  const steps = ['Profile', 'KYC', 'Shop'];
  return (
    <div style={{ padding:'10px 20px 14px', background:C.white, borderBottom:`1px solid ${C.hairline}` }}>
      <div style={{ display:'flex', alignItems:'center' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:26, height:26, borderRadius:9999, background: i < step ? C.success : i === step ? C.primary : C.hairline, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.3s' }}>
                {i < step
                  ? <Icon name="check" size={13} color="#fff" sw={2.5} />
                  : <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color: i === step ? '#fff' : C.mute }}>{i+1}</span>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color: i <= step ? C.primary : C.mute, fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:2, borderRadius:1, background: i < step ? C.success : C.hairline, margin:'0 6px', marginBottom:16, transition:'background 0.3s' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── BECOME SELLER — Step 1 ───────────────────────────────────
function BecomeSellerScreen() {
  const { navigate, goBack } = useNav();
  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Become a Seller" onBack={goBack} />
        <KycStepper step={0} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:4 }}>Tell us about yourself</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>This information stays private and secure.</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Input label="First name" placeholder="Alex" style={{ flex:1 }} />
          <Input label="Last name" placeholder="Martin" style={{ flex:1 }} />
        </div>
        <Input label="Date of birth" placeholder="DD / MM / YYYY" />
        <Input label="Email address" placeholder="you@mail.com" type="email" iconLeft={<Icon name="mail" size={16} color={C.mute} />} />
        <div style={{ display:'flex', gap:10 }}>
          <Input label="Country code" placeholder="+1" style={{ width:80 }} />
          <Input label="Phone" placeholder="555 123 4567" style={{ flex:1 }} />
        </div>
        <Input label="Nationality" placeholder="American" />
        <Input label="Country of residence" placeholder="United States" iconLeft={<Icon name="mapPin" size={16} color={C.mute} />} />
        <Divider style={{ margin:'4px 0' }} />
        <div>
          <Input label="Your shop name" placeholder="Atelier Lune" iconLeft={<Icon name="store" size={16} color={C.mute} />} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:5 }}>This is what buyers will see</div>
        </div>
        <Btn variant="primary" size="lg" wide onClick={() => navigate('kyc-doc')}>
          Continue — ID Verification
          <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Doc front (camera, dark) ──────────────────────────
function KycDocScreen() {
  const { navigate, goBack } = useNav();
  const [captured, setCaptured] = React.useState(false);
  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <NavBar title="Verify Your Identity" onBack={goBack} transparent light />
        {/* Dark stepper */}
        <div style={{ padding:'6px 20px 12px', display:'flex', gap:6 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:9999, background: i === 0 ? C.primary : 'rgba(255,255,255,0.15)', transition:'background 0.3s' }} />)}
        </div>
      </div>
      <div style={{ flex:1, padding:'0 20px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>Front of your ID document</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>Position your passport or ID card within the frame</div>
        </div>
        {/* Viewfinder */}
        <div style={{ flex:1, border:`2px dashed ${captured ? C.success : C.primary}`, borderRadius:14, position:'relative', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', transition:'border-color 0.3s' }}>
          {/* Corner brackets */}
          {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([y,x], i) => (
            <div key={i} style={{ position:'absolute', [y]:10, [x]:10, width:24, height:24, borderTop: y==='top' ? `3px solid ${captured ? C.success : C.primary}` : 'none', borderBottom: y==='bottom' ? `3px solid ${captured ? C.success : C.primary}` : 'none', borderLeft: x==='left' ? `3px solid ${captured ? C.success : C.primary}` : 'none', borderRight: x==='right' ? `3px solid ${captured ? C.success : C.primary}` : 'none', transition:'border-color 0.3s' }} />
          ))}
          {captured
            ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <div style={{ width:56, height:56, borderRadius:9999, background:'rgba(31,138,91,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="check" size={28} color={C.success} sw={2.5} />
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.success, fontWeight:600 }}>Photo captured</span>
              </div>
            : <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:36, marginBottom:8, opacity:0.3 }}>▭</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.4 }}>Align all 4 corners<br/>Avoid glare</div>
              </div>
          }
        </div>
        {/* Security note */}
        <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
          <Icon name="lock" size={14} color='rgba(255,255,255,0.5)' style={{ marginTop:1, flexShrink:0 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.4 }}>Encrypted upload. Clorivo never shares your documents with sellers.</span>
        </div>
        <Btn variant="primary" size="lg" wide onClick={() => { if (!captured) { setCaptured(true); } else { navigate('kyc-back'); } }}>
          <Icon name="camera" size={17} color="#fff" />
          {captured ? 'Continue →' : 'Open camera'}
        </Btn>
        <div style={{ height:20 }} />
      </div>
    </div>
  );
}

// ─── KYC — Doc back (upload) ─────────────────────────────────
function KycBackScreen() {
  const { navigate, goBack } = useNav();
  const [uploaded, setUploaded] = React.useState(false);
  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Verify Your Identity" onBack={goBack} />
        <div style={{ padding:'6px 20px 12px', display:'flex', gap:6 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:9999, background: i <= 1 ? C.primary : C.hairline }} />)}
        </div>
      </div>
      <div style={{ flex:1, padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Back of your ID document</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:4 }}>Both sides are required for verification</div>
        </div>
        {/* Already uploaded card */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#EFF9F4', borderRadius:12, border:`1.5px solid ${C.success}` }}>
          <Img label="" tint={0} style={{ width:48, height:34, borderRadius:6, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Front · captured</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>passport_front.jpg · 1.2 MB</div>
          </div>
          <Icon name="checkCircle" size={20} color={C.success} />
        </div>
        {/* Upload zone */}
        <div onClick={() => setUploaded(true)} style={{ flex:1, border:`2px dashed ${uploaded ? C.success : C.hairline}`, borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer', background: uploaded ? '#EFF9F4' : C.white, transition:'all 0.2s', minHeight:160 }}>
          {uploaded
            ? <><Icon name="checkCircle" size={36} color={C.success} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.success }}>Back uploaded!</span></>
            : <>
                <div style={{ width:52, height:52, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="camera" size={24} color={C.primary} />
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:600, color:C.ink }}>Tap to upload the back</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>jpg, png · max 5 MB</div>
                <div style={{ display:'flex', gap:8 }}>
                  <Chip active>📷 Camera</Chip>
                  <Chip>🖼 Gallery</Chip>
                </div>
              </>
          }
        </div>
        <Btn variant="primary" size="lg" wide onClick={() => navigate('kyc-selfie')} disabled={!uploaded}>
          Continue →
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Selfie liveness ────────────────────────────────────
function KycSelfieScreen() {
  const { navigate, goBack } = useNav();
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setProgress(p => { if (p >= 4) { clearInterval(t); return 4; } return p + 1; }), 800);
    return () => clearInterval(t);
  }, []);

  const checks = [
    'Centered in the frame',
    'Good lighting',
    'Turn your head left…',
    'Turn right…',
    'Blink slowly',
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <NavBar title="Liveness Check" onBack={goBack} transparent light />
        <div style={{ padding:'6px 20px 12px', display:'flex', gap:6 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:9999, background: C.primary }} />)}
        </div>
      </div>
      <div style={{ flex:1, padding:'0 20px', display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:'#fff' }}>Look at the camera</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>Follow the dot, then blink slowly</div>
        </div>
        {/* Face oval */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ width:200, height:250, borderRadius:'50%', border:`3px solid ${progress >= 4 ? C.success : C.primary}`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color 0.5s' }}>
            <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`2px dashed ${C.primary}`, opacity:0.3 }} />
            <svg viewBox="0 0 80 100" style={{ width:'60%', opacity:0.35 }}>
              <ellipse cx="40" cy="45" rx="26" ry="34" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="30" cy="40" r="2.5" fill="#fff"/><circle cx="50" cy="40" r="2.5" fill="#fff"/>
              <path d="M32 60 Q40 68 48 60" fill="none" stroke="#fff" strokeWidth="1.5"/>
            </svg>
            {progress >= 4 && (
              <div style={{ position:'absolute', width:56, height:56, borderRadius:9999, background:'rgba(31,138,91,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="check" size={28} color={C.success} sw={2.5} />
              </div>
            )}
          </div>
          <div style={{ position:'absolute', bottom:-20, fontFamily:"'Inter',sans-serif", fontSize:13, color: progress >= 4 ? C.success : C.primary, fontWeight:600 }}>
            {progress >= 4 ? '✓ Verified' : '● Analyzing…'}
          </div>
        </div>
        {/* Checklist */}
        <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {checks.slice(0, Math.min(progress + 1, checks.length)).map((c, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', fontFamily:"'Inter',sans-serif", fontSize:13 }}>
              {i < progress ? <Icon name="check" size={14} color={C.success} sw={2} /> : <div style={{ width:14, height:14, borderRadius:9999, border:`1.5px solid ${C.primary}`, flexShrink:0 }} />}
              <span style={{ color: i < progress ? 'rgba(255,255,255,0.7)' : i === progress ? '#fff' : 'rgba(255,255,255,0.4)' }}>{c}</span>
            </div>
          ))}
        </div>
        <Btn variant="primary" size="lg" wide onClick={() => navigate('kyc-success')} disabled={progress < 4}>
          {progress < 4 ? 'Verifying…' : 'Finish setting up my seller account'}
        </Btn>
        <div style={{ height:20 }} />
      </div>
    </div>
  );
}

// ─── KYC — Success ────────────────────────────────────────────
function KycSuccessScreen() {
  const { navigate } = useNav();
  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32 }}>
      <StatusBar />
      <div style={{ width:80, height:80, borderRadius:9999, background:'#EFF9F4', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <Icon name="checkCircle" size={40} color={C.success} />
      </div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', textAlign:'center', marginBottom:10 }}>Application submitted!</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, textAlign:'center', lineHeight:1.5, marginBottom:32 }}>Your verification is being processed. You'll receive a confirmation within 24–48h.</div>
      <div style={{ background:C.primarySoft, borderRadius:12, padding:'14px 16px', width:'100%', marginBottom:24 }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Icon name="bell" size={18} color={C.primary} />
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primaryDeep }}>Notifications enabled</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>We'll let you know as soon as you're approved</div>
          </div>
        </div>
      </div>
      <Btn variant="primary" size="lg" wide onClick={() => navigate('home')}>Back to home</Btn>
    </div>
  );
}

// ─── SELLER DASHBOARD ─────────────────────────────────────────
function SellerDashboardScreen() {
  const { navigate } = useNav();
  const [stats, setStats] = React.useState(null);
  const [shopId, setShopId] = React.useState(null);
  const [sellerName, setSellerName] = React.useState('luna.studio');

  React.useEffect(() => {
    sbGetUser().then(async user => {
      if (!user) return;
      const profile = await sbGetProfile(user.id);
      if (profile?.shop_id) {
        setShopId(profile.shop_id);
        const s = await sbGetSellerStats(profile.shop_id);
        setStats(s);
        const shop = await sbGetShop(profile.shop_id);
        if (shop?.name) setSellerName(shop.name);
      } else {
        setStats(_DEMO_SELLER_STATS ?? { orders:38, products:15, revenue:2481.04, followers:2400, rating:4.9 });
      }
    });
  }, []);

  const kpis = [
    { k:'Orders', v: stats ? String(stats.orders)  : '38',   delta:'+12', up:true  },
    { k:'Revenue',   v: stats ? '$' + (stats.revenue ?? 842).toFixed(0) : '$842', delta:'+8%', up:true },
    { k:'Products',  v: stats ? String(stats.products) : '15',  delta:'+2',  up:true  },
    { k:'Rating',      v: stats ? String(stats.rating ?? 4.9) : '4.9', delta:'stable', up:true },
  ];
  const data = [120, 185, 142, 210, 175, 260, 230];
  const days = ['L','M','M','J','V','S','D'];
  const maxV = Math.max(...data);
  const W = 310, H = 80;
  const pts = data.map((v, i) => [(i / (data.length-1)) * W, H - (v/maxV)*(H-10) - 5]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;

  const navItems = [
    { icon:'package',  label:'Orders', badge:12, action: () => navigate('seller-orders') },
    { icon:'store',    label:'Products',  badge:0,  action: () => {} },
    { icon:'creditCard',label:'Wallet',   badge:0,  action: () => {} },
    { icon:'barChart', label:'Analytics', badge:0,  action: () => {} },
    { icon:'zap',      label:'Withdraw',   badge:0,  action: () => {} },
    { icon:'camera',   label:'CJ Import', badge:0,  action: () => navigate('cj-connect') },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      {/* Purple hero header */}
      <div style={{ paddingTop:STATUS_H, background:`linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDeep} 100%)`, padding:`${STATUS_H + 12}px 20px 20px`, flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:140, height:140, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <Avatar size={36} initials="LS" bg="rgba(255,255,255,0.2)" style={{ border:'2px solid rgba(255,255,255,0.3)' }} />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.75)' }}>Welcome,</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:'#fff' }}>{sellerName}</div>
          </div>
          <button onClick={() => navigate('home')} style={{ border:'none', background:'rgba(255,255,255,0.15)', borderRadius:9999, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Icon name="store" size={13} color="#fff" />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#fff', fontWeight:500 }}>Buyer mode</span>
          </button>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.75)', marginBottom:2 }}>Available balance</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>${(stats?.revenue ?? 2481.04).toFixed(2)}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2, marginBottom:14 }}>↗ +$184 this week</div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="soft" size="sm" style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>Withdraw</Btn>
          <Btn variant="soft" size="sm" style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>+ Product</Btn>
          <Btn variant="soft" size="sm" onClick={() => navigate('cj-connect')} style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>Import from CJ</Btn>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', paddingBottom:30, display:'flex', flexDirection:'column', gap:14 }}>
        {/* Shop preview card */}
        <div onClick={() => navigate('shop-customize')} style={{ background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:54, height:54, borderRadius:14, background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="store" size={26} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>My shop</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>Preview & customization · banners, logo, featured items</div>
          </div>
          <Icon name="chevronRight" size={18} color={C.mute} />
        </div>

        {/* KPI grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background:C.white, borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:4 }}>{k.k}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>{k.v}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color: k.up ? C.success : C.danger, marginTop:2 }}>
                {k.up ? '↗' : '↘'} {k.delta} vs yesterday
              </div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ background:C.white, borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>Revenue · 7 days</span>
            <div style={{ background:C.primarySoft, borderRadius:9999, padding:'4px 10px' }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:C.primary }}>$1 312</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, overflow:'visible' }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity="0.18"/>
                <stop offset="100%" stopColor={C.primary} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#sg)" />
            <polyline points={polyline} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill={C.primary} />
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="8" fill={C.primary} opacity="0.2" />
          </svg>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            {days.map((d, i) => <span key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.mute, flex:1, textAlign:'center' }}>{d}</span>)}
          </div>
        </div>

        {/* Quick nav grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
          {navItems.map((n, i) => (
            <button key={i} onClick={n.action} style={{ background:C.white, border:'none', borderRadius:14, padding:'14px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(14,11,31,0.05)', position:'relative' }}>
              <Icon name={n.icon} size={22} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:500, color:C.ink }}>{n.label}</span>
              {n.badge > 0 && (
                <div style={{ position:'absolute', top:8, right:12, width:18, height:18, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff' }}>{n.badge}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SELLER ORDERS ────────────────────────────────────────────
function SellerOrdersScreen() {
  const { navigate, goBack } = useNav();
  const [filter, setFilter] = React.useState(1);
  const filters = ['All 47','New 12','Packed 8','Shipped 23','Returns 4'];
  const orders = [
    { id:'#CL-29841', buyer:'A. Martin', sku:'Terracotta vase · M', qty:1, price:'$24.50', status:'new', urgent:true },
    { id:'#CL-29839', buyer:'M. Otieno',  sku:'Linen apron · oat', qty:2, price:'$56.00', status:'new', urgent:false },
    { id:'#CL-29836', buyer:'S. Park',    sku:'Oil burner',    qty:1, price:'$15.00', status:'packed', urgent:false },
    { id:'#CL-29830', buyer:'J. Wei',     sku:'Ceramic mug × 4', qty:4, price:'$36.00', status:'packed', urgent:false },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Orders" onBack={goBack} right={
          <button style={{ width:44, height:44, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="search" size={20} color={C.mute} />
          </button>
        } />
        <div style={{ display:'flex', gap:8, padding:'6px 16px 12px', overflowX:'auto' }}>
          {filters.map((f, i) => <Chip key={i} active={filter === i} onClick={() => setFilter(i)}>{f}</Chip>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, paddingBottom:30 }}>
        {orders.map((o, i) => (
          <div key={i} style={{ background:C.white, borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', gap:12 }}>
            <Img label="" tint={i % 5} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:C.primary }}>{o.id}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{o.price}</span>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.ink, marginBottom:2 }}>{o.sku}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:6 }}>{o.buyer} · qty {o.qty}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ background: o.status === 'new' ? C.primarySoft : C.paper, color: o.status === 'new' ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:9999 }}>{o.status}</span>
                {o.urgent && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.danger }}>Ship today</span>}
                <button style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>Process →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  BecomeSellerScreen, KycDocScreen, KycBackScreen, KycSelfieScreen, KycSuccessScreen,
  SellerDashboardScreen, SellerOrdersScreen,
});
