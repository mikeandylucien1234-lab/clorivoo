// screen-admin.jsx — Admin Console (mobile-adapted) · Overview · KYC · Banners

// ─── ADMIN TOGGLE ──────────────────────────────────────────────
function AdminToggle({ initial }) {
  const [on, setOn] = React.useState(!!initial);
  return (
    <button onClick={() => setOn(o => !o)} style={{ width:42, height:24, borderRadius:9999, border:'none', cursor:'pointer', background: on ? C.primary : 'rgba(255,255,255,0.15)', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: on ? 21 : 3, width:18, height:18, borderRadius:9999, background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
    </button>
  );
}

// ─── ADMIN SIDEBAR NAV ─────────────────────────────────────────
function AdminSidebar({ active, onNav }) {
  const items = [
    { icon:'barChart', label:'Overview', key:'overview' },
    { icon:'user',     label:'Users',    key:'users' },
    { icon:'store',    label:'Sellers',         key:'sellers', badge:14 },
    { icon:'lock',     label:'KYC',             key:'kyc',  badge:8 },
    { icon:'zap',      label:'Reports',    key:'reports', badge:3 },
    { icon:'camera',   label:'Banners',       key:'banners' },
    { icon:'settings', label:'Settings',      key:'settings' },
  ];
  return (
    <div style={{ width:52, background:'#0F0C1E', height:'100%', display:'flex', flexDirection:'column', padding:'14px 0', alignItems:'center', gap:4, flexShrink:0 }}>
      {/* Logo mark */}
      <div style={{ width:34, height:34, borderRadius:9, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:20, color:'#fff' }}>c</span>
      </div>
      {items.map((item, i) => (
        <button key={i} onClick={() => onNav(item.key)} style={{
          width:44, height:44, borderRadius:10, border:'none', cursor:'pointer',
          background: active === item.key ? 'rgba(108,77,255,0.25)' : 'transparent',
          display:'flex', alignItems:'center', justifyContent:'center',
          position:'relative', flexShrink:0,
          transition:'background 0.15s',
        }}>
          <Icon name={item.icon} size={18} color={active === item.key ? C.primary : 'rgba(255,255,255,0.4)'} />
          {item.badge > 0 && (
            <div style={{ position:'absolute', top:6, right:6, width:14, height:14, borderRadius:9999, background:C.danger, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:8, fontWeight:700, color:'#fff' }}>{item.badge}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── ADMIN — Overview ─────────────────────────────────────────
function AdminDashboardScreen() {
  const { navigate, goBack } = useNav();
  const [section, setSection] = React.useState('overview');
  const [settingsOpen, setSettingsOpen] = React.useState(null);
  const [adminStats, setAdminStats] = React.useState(null);

  React.useEffect(() => {
    sbAdminGetStats().then(s => setAdminStats(s));
  }, []);

  const kpis = [
    { k:'GMV',           v: adminStats ? '$' + Math.round((adminStats.gmv??184000)/1000) + 'k' : '$184k', d:'+12%' },
    { k:'Orders',     v: adminStats ? String(adminStats.orders??4281) : '4,281', d:'+8%' },
    { k:'Users',  v: adminStats ? String(adminStats.users??12480) : '12,480', d:'+18%' },
    { k:'Sellers',      v: adminStats ? String(adminStats.sellers??342) : '342', d:'+4%' },
    { k:'KYC pending',v: adminStats ? String(adminStats.pendingKyc??14) : '14', d:'!' },
    { k:'Return rate',   v:'1.9%', d:'−0.3' },
  ];
  const pending = [
    { icon:'store', label:'atelier.lune', sub:'New shop · FR', badge:'review' },
    { icon:'lock',  label:'M. Otieno',    sub:'KYC · KE',               badge:'urgent' },
    { icon:'zap',   label:'Report',  sub:'against shop #2841',   badge:'review' },
  ];

  const sectionMeta = {
    overview: { title:"Overview", sub:'Last 7 days',          url:'admin.clorivo.com/dashboard' },
    users:    { title:'Users',    sub:'12,480 active accounts',     url:'admin.clorivo.com/users' },
    sellers:  { title:'Sellers',        sub:'342 shops · 14 pending', url:'admin.clorivo.com/sellers' },
    reports:  { title:'Reports',    sub:'3 to handle',               url:'admin.clorivo.com/reports' },
    settings: { title:'Settings',      sub:'Platform configuration', url:'admin.clorivo.com/settings' },
  };
  const meta = sectionMeta[section] || sectionMeta.overview;

  const usersList = [
    { name:'Alex Martin',   email:'alex@mail.com',   role:'Buyer', status:'active',    tint:0 },
    { name:'Mary Otieno',   email:'maryo@mail.com',  role:'Seller',  status:'active',    tint:1 },
    { name:'Sophie Park',   email:'spark@mail.com',  role:'Buyer', status:'active',    tint:2 },
    { name:'Jun Wei',       email:'jwei@mail.com',   role:'Seller',  status:'suspended', tint:3 },
    { name:'Léa Dubois',    email:'lea.d@mail.com',  role:'Buyer', status:'active',    tint:4 },
  ];
  const sellersList = [
    { name:'luna.studio',   cat:'Home & Decor', sales:'$12.4k', rating:4.9, status:'verified',  tint:0 },
    { name:'TechZone',      cat:'Electronics',  sales:'$48.1k', rating:4.7, status:'verified',  tint:1 },
    { name:'atelier.lune',  cat:'Crafts',     sales:'—',      rating:0,   status:'pending',  tint:2 },
    { name:'Fashion House', cat:'Fashion',          sales:'$22.7k', rating:4.6, status:'verified',  tint:3 },
  ];
  const reportsList = [
    { subject:'Counterfeit product',   target:'shop #2841', time:'2h ago', severity:'urgent' },
    { subject:'Fraudulent review',      target:'@fastdeals',     time:'5h ago', severity:'medium' },
    { subject:'Inappropriate content',  target:'product #9921',  time:'1d ago', severity:'medium' },
  ];
  const settingsList = [
    { key:'commission', icon:'creditCard', label:'Platform commission', detail:'8.5%' },
    { key:'shipping',   icon:'truck',      label:'Shipping fees',     detail:'Configured' },
    { key:'security',   icon:'lock',       label:'Security & 2FA',         detail:'Enabled' },
    { key:'notifs',     icon:'bell',       label:'System notifications',  detail:'On' },
    { key:'roles',      icon:'user',       label:'Roles & permissions',    detail:'4 roles' },
  ];

  // Detail content for each settings sub-option
  const settingsDetails = {
    commission: {
      title:'Platform commission',
      rows:[
        { type:'slider', label:'Overall rate', value:'8.5%' },
        { type:'kv', k:'Home & Decor', v:'8.0%' },
        { type:'kv', k:'Electronics',  v:'6.5%' },
        { type:'kv', k:'Fashion',          v:'10.0%' },
        { type:'kv', k:'Commission revenue (30d)', v:'$15,640', accent:true },
      ],
    },
    shipping: {
      title:'Shipping fees',
      rows:[
        { type:'kv', k:'Standard (5–8d)', v:'$3.99' },
        { type:'kv', k:'Express (2–3d)',  v:'$8.99' },
        { type:'kv', k:'Free shipping threshold',  v:'$30.00' },
        { type:'toggle', k:'Free shipping enabled', on:true },
        { type:'toggle', k:'Real-time tracking',           on:true },
      ],
    },
    security: {
      title:'Security & 2FA',
      rows:[
        { type:'toggle', k:'Two-factor authentication', on:true },
        { type:'toggle', k:'Biometric login',   on:true },
        { type:'toggle', k:'Login alerts',        on:false },
        { type:'kv', k:'Active sessions', v:'3 devices' },
        { type:'kv', k:'Last security check', v:'2d ago' },
      ],
    },
    notifs: {
      title:'System notifications',
      rows:[
        { type:'toggle', k:'New orders',    on:true },
        { type:'toggle', k:'New sellers',       on:true },
        { type:'toggle', k:'Urgent reports',    on:true },
        { type:'toggle', k:'Weekly reports',  on:false },
        { type:'toggle', k:'Marketing emails',       on:false },
      ],
    },
    roles: {
      title:'Roles & permissions',
      rows:[
        { type:'kv', k:'Super Admin', v:'1 member' },
        { type:'kv', k:'Moderator',  v:'4 members' },
        { type:'kv', k:'Support',     v:'8 members' },
        { type:'kv', k:'Analyst',    v:'2 members' },
        { type:'toggle', k:'Invite new members', on:true },
      ],
    },
  };

  function handleNav(key) {
    if (key === 'kyc')     navigate('admin-kyc');
    else if (key === 'banners') navigate('admin-banners');
    else { setSection(key); setSettingsOpen(null); }
  }

  // Chart data
  const W = 230, H = 70;
  const data = [60,85,72,105,90,130,118,145];
  const maxV = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length-1)) * W, H - (v/maxV)*(H-10) - 4]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;

  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      {/* Browser chrome */}
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <div style={{ background:'#1A1630', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#FF6058','#FFBD2E','#28C941'].map((c, i) => <div key={i} style={{ width:9, height:9, borderRadius:9999, background:c }} />)}
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'4px 10px', display:'flex', alignItems:'center', gap:6 }}>
            <Icon name="lock" size={10} color="rgba(255,255,255,0.4)" />
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'rgba(255,255,255,0.5)' }}>{meta.url}</span>
          </div>
          <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
            <Icon name="x" size={16} color='rgba(255,255,255,0.4)' />
          </button>
        </div>
      </div>

      {/* Layout: sidebar + main */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <AdminSidebar active={section} onNav={handleNav} />

        {/* Main content */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', background:'#0F0C1E', display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:'#EDE9F7', letterSpacing:'-0.02em', whiteSpace:'nowrap', lineHeight:1.2 }}>{meta.title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{meta.sub}</div>
            </div>
            <Avatar size={28} initials="A" />
          </div>

          {/* ── OVERVIEW ── */}
          {section === 'overview' && <>
          {/* KPI grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background:'#1A1630', borderRadius:10, padding:'10px 10px' }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:3 }}>{k.k}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:'#EDE9F7' }}>{k.v}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:600, color:C.success, marginTop:2 }}>↗ {k.d}</div>
              </div>
            ))}
          </div>

          {/* GMV chart */}
          <div style={{ background:'#1A1630', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:'#EDE9F7' }}>GMV trend</span>
              <div style={{ display:'flex', gap:6 }}>
                {['7d','30d','90d'].map((l, i) => (
                  <span key={i} style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color: i === 0 ? C.primary : 'rgba(255,255,255,0.3)', fontWeight: i === 0 ? 600 : 400, cursor:'pointer' }}>{l}</span>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H }}>
              <defs>
                <linearGradient id="adminG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.primary} stopOpacity="0.3"/>
                  <stop offset="100%" stopColor={C.primary} stopOpacity="0"/>
                </linearGradient>
              </defs>
              <polygon points={area} fill="url(#adminG)" />
              <polyline points={polyline} fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3.5" fill={C.primary} />
            </svg>
          </div>

          {/* Pending approvals */}
          <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:'#EDE9F7' }}>Pending action</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.primary, fontWeight:500, cursor:'pointer' }}>See all</span>
            </div>
            {pending.map((p, i) => (
              <div key={i} onClick={() => p.sub.includes('KYC') && navigate('admin-kyc')} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor:'pointer' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={p.icon} size={15} color='rgba(255,255,255,0.5)' />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#EDE9F7' }}>{p.label}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>{p.sub}</div>
                </div>
                <span style={{ background: p.badge === 'urgent' ? C.danger : 'rgba(108,77,255,0.3)', color: p.badge === 'urgent' ? '#fff' : C.primary, fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:9999 }}>{p.badge}</span>
              </div>
            ))}
          </div>
          </>}

          {/* ── USERS ── */}
          {section === 'users' && <>
          <div style={{ display:'flex', gap:8 }}>
            {[['Total','12,480'],['Buyers','11,902'],['Sellers','578']].map((s,i) => (
              <div key={i} style={{ flex:1, background:'#1A1630', borderRadius:10, padding:'10px' }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.4)' }}>{s[0]}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:'#EDE9F7', marginTop:2 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:'#EDE9F7' }}>Recent accounts</div>
            {usersList.map((u, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <Avatar size={32} initials={u.name.split(' ').map(n=>n[0]).join('')} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#EDE9F7' }}>{u.name}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email} · {u.role}</div>
                </div>
                <span style={{ background: u.status === 'active' ? 'rgba(31,138,91,0.2)' : 'rgba(209,67,67,0.2)', color: u.status === 'active' ? C.success : C.danger, fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:9999 }}>{u.status}</span>
              </div>
            ))}
          </div>
          </>}

          {/* ── SELLERS ── */}
          {section === 'sellers' && <>
          <div style={{ display:'flex', gap:8 }}>
            {[['Active','342'],['Pending','14'],['Suspended','6']].map((s,i) => (
              <div key={i} style={{ flex:1, background:'#1A1630', borderRadius:10, padding:'10px' }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.4)' }}>{s[0]}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:'#EDE9F7', marginTop:2 }}>{s[1]}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:'#EDE9F7' }}>Shops</div>
            {sellersList.map((s, i) => (
              <div key={i} onClick={() => s.status === 'pending' && navigate('admin-kyc')} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor:'pointer' }}>
                <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', flexShrink:0 }}><Img label="" tint={s.tint} style={{ width:32, height:32 }} /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#EDE9F7' }}>{s.name}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>{s.cat}{s.rating > 0 ? ` · ⭐ ${s.rating}` : ''}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:'#EDE9F7' }}>{s.sales}</div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color: s.status === 'verified' ? C.success : C.warning }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
          </>}

          {/* ── REPORTS ── */}
          {section === 'reports' && <>
          <div style={{ background:'rgba(209,67,67,0.12)', border:`1px solid rgba(209,67,67,0.3)`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <Icon name="zap" size={18} color={C.danger} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'#EDE9F7', fontWeight:500 }}>3 reports need your attention</span>
          </div>
          <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
            {reportsList.map((r, i) => (
              <div key={i} style={{ padding:'12px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:'#EDE9F7' }}>{r.subject}</span>
                  <span style={{ background: r.severity === 'urgent' ? C.danger : 'rgba(198,138,0,0.25)', color: r.severity === 'urgent' ? '#fff' : C.warning, fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:9999 }}>{r.severity}</span>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Target: {r.target} · {r.time}</div>
                <div style={{ display:'flex', gap:8 }}>
                  <button style={{ flex:1, height:32, borderRadius:8, border:'none', background:'rgba(255,255,255,0.08)', color:'#EDE9F7', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, cursor:'pointer' }}>Review</button>
                  <button style={{ flex:1, height:32, borderRadius:8, border:'none', background:C.primary, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, cursor:'pointer' }}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
          </>}

          {/* ── SETTINGS ── */}
          {section === 'settings' && !settingsOpen && <>
          <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
            {settingsList.map((s, i) => (
              <div key={i} onClick={() => setSettingsOpen(s.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', cursor:'pointer' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'rgba(108,77,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={s.icon} size={16} color={C.primary} />
                </div>
                <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:'#EDE9F7' }}>{s.label}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.45)' }}>{s.detail}</span>
                <Icon name="chevronRight" size={15} color='rgba(255,255,255,0.3)' />
              </div>
            ))}
          </div>
          <button onClick={goBack} style={{ height:44, borderRadius:12, border:'none', background:'rgba(209,67,67,0.15)', color:C.danger, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Icon name="logOut" size={16} color={C.danger} /> Exit console
          </button>
          </>}

          {/* ── SETTINGS · DETAIL ── */}
          {section === 'settings' && settingsOpen && (() => {
            const d = settingsDetails[settingsOpen];
            return (
              <>
                <button onClick={() => setSettingsOpen(null)} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0 }}>
                  <Icon name="arrowLeft" size={16} color='rgba(255,255,255,0.5)' />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.5)' }}>Settings</span>
                </button>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:'#EDE9F7', letterSpacing:'-0.02em' }}>{d.title}</div>
                <div style={{ background:'#1A1630', borderRadius:12, overflow:'hidden' }}>
                  {d.rows.map((r, i) => (
                    <div key={i} style={{ padding:'14px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      {r.type === 'kv' && (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.7)' }}>{r.k}</span>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color: r.accent ? C.success : '#EDE9F7' }}>{r.v}</span>
                        </div>
                      )}
                      {r.type === 'slider' && (
                        <div>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.7)' }}>{r.label}</span>
                            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:700, color:C.primary }}>{r.value}</span>
                          </div>
                          <div style={{ height:6, borderRadius:9999, background:'rgba(255,255,255,0.08)', position:'relative' }}>
                            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'42%', background:C.primary, borderRadius:9999 }} />
                            <div style={{ position:'absolute', left:'42%', top:'50%', transform:'translate(-50%,-50%)', width:16, height:16, borderRadius:9999, background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }} />
                          </div>
                        </div>
                      )}
                      {r.type === 'toggle' && (
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.7)' }}>{r.k}</span>
                          <AdminToggle initial={r.on} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setSettingsOpen(null)} style={{ height:44, borderRadius:12, border:'none', background:C.primary, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, cursor:'pointer' }}>
                  Save changes
                </button>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN — KYC Review ───────────────────────────────────────
function AdminKycScreen() {
  const { goBack } = useNav();
  const [decision, setDecision] = React.useState(null);
  const [kycRequests, setKycRequests] = React.useState([]);
  const [currentIdx, setCurrentIdx]  = React.useState(0);

  React.useEffect(() => {
    sbAdminGetKycRequests().then(data => setKycRequests(data ?? []));
  }, []);

  const current = kycRequests[currentIdx];

  async function handleDecision(status) {
    if (current) await sbAdminUpdateKyc(current.id, status, '');
    setDecision(status);
    setTimeout(() => {
      setDecision(null);
      if (currentIdx < kycRequests.length - 1) setCurrentIdx(i => i + 1);
      else goBack();
    }, 1000);
  }

  const checks = [
    { label:'Document validity', status:'pass' },
    { label:'Name match', status:'pass' },
    { label:'Face match (98%)', status:'pass' },
    { label:'Sanctions screening', status:'pass' },
    { label:'Duplicate account', status:'review' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <div style={{ background:'#1A1630', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#FF6058','#FFBD2E','#28C941'].map((c, i) => <div key={i} style={{ width:9, height:9, borderRadius:9999, background:c }} />)}
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'4px 10px', display:'flex', alignItems:'center', gap:6 }}>
            <Icon name="lock" size={10} color="rgba(255,255,255,0.4)" />
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'rgba(255,255,255,0.5)' }}>admin.clorivo.com/kyc/m_otieno</span>
          </div>
          <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
            <Icon name="x" size={16} color='rgba(255,255,255,0.4)' />
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <AdminSidebar active="kyc" onNav={() => {}} />
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', background:'#0F0C1E', display:'flex', flexDirection:'column', gap:12 }}>
          {/* Queue nav */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <Icon name="arrowLeft" size={14} color='rgba(255,255,255,0.4)' />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.4)' }}>Queue</span>
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.3)' }}>8 pending · #1</span>
          </div>
          {/* Applicant */}
          <div style={{ display:'flex', gap:10, alignItems:'flex-start', background:'#1A1630', borderRadius:12, padding:'12px' }}>
            <Avatar size={44} initials={(current?.profiles?.full_name ?? 'KYC').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:'#EDE9F7' }}>{current?.profiles?.full_name ?? 'Mary Otieno'}</span>
                <span style={{ background:'rgba(209,67,67,0.2)', color:C.danger, fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:9999 }}>pending</span>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{current?.profiles?.email ?? 'maryo@mail.com'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>Shop: "{current?.shop_name ?? 'kibo.crafts'}"</div>
            </div>
          </div>
          {/* Documents */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
            {['ID front','ID back','Selfie'].map((t, i) => (
              <div key={i} style={{ borderRadius:8, overflow:'hidden', background:'#1A1630' }}>
                <Img label="" tint={i} style={{ height:70, borderRadius:0 }} />
                <div style={{ padding:'5px 6px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.7)' }}>{t}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.success }}>✓</span>
                </div>
              </div>
            ))}
          </div>
          {/* Automated checks */}
          <div style={{ background:'#1A1630', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#EDE9F7', marginBottom:8 }}>Automated checks</div>
            {checks.map((c, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.6)' }}>{c.label}</span>
                <span style={{ background: c.status === 'pass' ? 'rgba(31,138,91,0.2)' : 'rgba(198,138,0,0.2)', color: c.status === 'pass' ? C.success : C.warning, fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:9999 }}>{c.status}</span>
              </div>
            ))}
          </div>
          {/* Admin note */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:500, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>Admin note</div>
            <div style={{ background:'#1A1630', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 12px', minHeight:50 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.3)' }}>Add a note…</span>
            </div>
          </div>
          {/* Decision */}
          {decision ? (
            <div style={{ background: decision === 'approve' ? 'rgba(31,138,91,0.15)' : 'rgba(209,67,67,0.15)', borderRadius:12, padding:'14px', textAlign:'center' }}>
              <Icon name="checkCircle" size={28} color={decision === 'approve' ? C.success : C.danger} />
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color: decision === 'approve' ? C.success : C.danger, marginTop:6 }}>
                {decision === 'approve' ? 'Approved — seller account activated' : 'Rejected — email sent to applicant'}
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => handleDecision('rejected')}>
                <Icon name="x" size={14} color={C.danger} /> Reject
              </Btn>
              <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid rgba(255,255,255,0.15)`, background:'transparent' }}>Request more</Btn>
              <Btn variant="primary" size="sm" style={{ flex:1.4 }} onClick={() => handleDecision('approved')}>
                <Icon name="check" size={14} color="#fff" sw={2.5} /> Approve
              </Btn>
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN — Banners CMS ──────────────────────────────────────
function AdminBannersScreen() {
  const { goBack } = useNav();
  const [banners, setBanners] = React.useState([
    { id:'b1', title:'Spring sale · 70% off', is_active:true,  bg_color:C.primary },
    { id:'b2', title:"Mother's Day",          is_active:true,  bg_color:'#C97B5A' },
    { id:'b3', title:'Summer preview',        is_active:false, bg_color:'#3B3730' },
  ]);
  const [editBanner, setEditBanner] = React.useState(null);
  const [editTitle, setEditTitle]   = React.useState('');

  const [signupBanner, setSignupBanner] = React.useState(null);
  const [signupTitle, setSignupTitle]       = React.useState('');
  const [signupSubtitle, setSignupSubtitle] = React.useState('');
  const [uploading, setUploading]           = React.useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    sbGetBanners().then(({ data }) => {
      if (data?.length) setBanners(data);
    });
    sbGetSignupBanner().then(b => {
      if (b) { setSignupBanner(b); setSignupTitle(b.title || ''); setSignupSubtitle(b.subtitle || ''); }
    });
  }, []);

  async function handleSaveBanner() {
    if (!editBanner) return;
    const updated = { ...editBanner, title: editTitle };
    const { data } = await sbUpsertBanner(updated);
    if (data) setBanners(prev => prev.map(b => b.id === data.id ? data : b));
    setEditBanner(null);
  }

  async function handleToggleBanner(b) {
    const updated = { ...b, is_active: !b.is_active };
    const { data } = await sbUpsertBanner(updated);
    if (data) setBanners(prev => prev.map(x => x.id === data.id ? data : x));
  }

  async function handleSignupImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `signup-success/${Date.now()}-${file.name}`;
    const { url, error } = await sbUploadFile('banners', path, file);
    setUploading(false);
    if (error || !url) return;
    const { data } = await sbUpsertBanner({
      ...(signupBanner || {}),
      placement: 'signup_success',
      is_active: true,
      position: 1,
      image_url: url,
      title: signupTitle,
      subtitle: signupSubtitle,
    });
    if (data) setSignupBanner(data);
  }

  async function handleSaveSignupText() {
    const { data } = await sbUpsertBanner({
      ...(signupBanner || {}),
      placement: 'signup_success',
      is_active: true,
      position: 1,
      title: signupTitle,
      subtitle: signupSubtitle,
    });
    if (data) setSignupBanner(data);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <div style={{ background:'#1A1630', padding:'8px 16px', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', gap:5 }}>
            {['#FF6058','#FFBD2E','#28C941'].map((c, i) => <div key={i} style={{ width:9, height:9, borderRadius:9999, background:c }} />)}
          </div>
          <div style={{ flex:1, background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'4px 10px', display:'flex', alignItems:'center', gap:6 }}>
            <Icon name="lock" size={10} color="rgba(255,255,255,0.4)" />
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'rgba(255,255,255,0.5)' }}>admin.clorivo.com/banners</span>
          </div>
          <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
            <Icon name="x" size={16} color='rgba(255,255,255,0.4)' />
          </button>
        </div>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <AdminSidebar active="banners" onNav={() => {}} />
        <div style={{ flex:1, overflowY:'auto', padding:'14px 14px', background:'#0F0C1E', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ── Signup success banner ── */}
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:'#EDE9F7', letterSpacing:'-0.02em' }}>Signup Success Banner</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>Shown to buyers right after they create an account</div>
          </div>
          <div style={{ background:'#1A1630', borderRadius:14, padding:12, display:'flex', flexDirection:'column', gap:10 }}>
            <div onClick={() => fileInputRef.current?.click()} style={{ height:110, borderRadius:12, overflow:'hidden', position:'relative', cursor:'pointer', background: signupBanner?.image_url ? undefined : 'rgba(255,255,255,0.05)', border: signupBanner?.image_url ? 'none' : '1.5px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {signupBanner?.image_url ? (
                <img src={signupBanner.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <Icon name="camera" size={22} color="rgba(255,255,255,0.4)" />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>{uploading ? 'Uploading…' : 'Upload banner image'}</span>
                </div>
              )}
              {signupBanner?.image_url && (
                <div style={{ position:'absolute', bottom:6, right:6, background:'rgba(14,11,31,0.65)', borderRadius:8, padding:'4px 8px', display:'flex', alignItems:'center', gap:5 }}>
                  <Icon name="camera" size={12} color="#fff" />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'#fff' }}>{uploading ? 'Uploading…' : 'Replace'}</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleSignupImageChange} style={{ display:'none' }} />

            <input value={signupTitle} onChange={e => setSignupTitle(e.target.value)} placeholder="Optional caption title" style={{ height:38, border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'0 10px', background:'rgba(255,255,255,0.05)', color:'#EDE9F7', fontFamily:"'Inter',sans-serif", fontSize:13, outline:'none' }} />
            <input value={signupSubtitle} onChange={e => setSignupSubtitle(e.target.value)} placeholder="Optional caption subtitle" style={{ height:38, border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'0 10px', background:'rgba(255,255,255,0.05)', color:'#EDE9F7', fontFamily:"'Inter',sans-serif", fontSize:13, outline:'none' }} />
            <Btn variant="primary" size="sm" onClick={handleSaveSignupText}>Save Caption</Btn>
          </div>

          {/* ── Homepage banners ── */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:'#EDE9F7', letterSpacing:'-0.02em' }}>Homepage Banners</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.4)' }}>{banners.filter(b=>b.is_active).length} active</div>
            </div>
            <Btn variant="primary" size="sm">+ New</Btn>
          </div>

          {/* Banner cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {banners.map((b, i) => (
              <div key={b.id ?? i} onClick={() => { setEditBanner(b); setEditTitle(b.title); }} style={{ borderRadius:10, overflow:'hidden', background:'#1A1630', cursor:'pointer' }}>
                <div style={{ height:60, background:b.bg_color ?? b.color ?? C.primary, display:'flex', alignItems:'center', padding:'0 10px', position:'relative' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:'#fff', lineHeight:1.2 }}>{b.title}</span>
                </div>
                <div style={{ padding:'6px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ background: b.is_active ? '#EFF9F4' : '#F5F5F5', color: b.is_active ? C.success : C.mute, fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:9999 }}>{b.is_active ? 'live' : 'inactive'}</span>
                  <button onClick={e => { e.stopPropagation(); handleToggleBanner(b); }} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:9, color:'rgba(255,255,255,0.4)' }}>
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {editBanner && (
            <div style={{ background:'#252138', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:'#EDE9F7' }}>Edit Banner</div>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ height:38, border:'1.5px solid rgba(255,255,255,0.12)', borderRadius:8, padding:'0 10px', background:'rgba(255,255,255,0.05)', color:'#EDE9F7', fontFamily:"'Inter',sans-serif", fontSize:13, outline:'none' }} />
              <div style={{ display:'flex', gap:8 }}>
                <Btn size="sm" style={{ flex:1, color:'rgba(255,255,255,0.5)', border:'1.5px solid rgba(255,255,255,0.12)', background:'transparent' }} onClick={() => setEditBanner(null)}>Cancel</Btn>
                <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={handleSaveBanner}>Save</Btn>
              </div>
            </div>
          )}

          <div style={{ height:16 }} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboardScreen, AdminKycScreen, AdminBannersScreen });
