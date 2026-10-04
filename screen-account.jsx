// screen-account.jsx — Wishlist + Profile Home + Personal Information + Edit Profile

// ─── DEMO PROFILE (persisted only for this session) ───────────
window._PROFILE = window._PROFILE || {
  name:'John Doe', email:'john.doe@gmail.com', phone:'+509 34 56 78 90',
  dob:'1995-05-15', gender:'Male', nationality:'Haitian',
  memberSince:'2024-01-01', verified:true, avatar:null,
  role:'buyer', status:'active',
};

// ─── PROFILE HOME ───────────────────────────────────────────────
function ProfileScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [profile, setProfile] = React.useState(window._PROFILE);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => setProfile({ ...window._PROFILE }), 500);
    return () => clearInterval(id);
  }, []);

  const orders = window.MOCK_ORDERS || [];
  const orderTab = s => (s === 'confirmed' || s === 'preparing') ? 'processing' : (s === 'shipped' || s === 'in_transit') ? 'shipped' : s;
  const orderCounts = {
    all: orders.length,
    processing: orders.filter(o => orderTab(o.status) === 'processing').length,
    shipped: orders.filter(o => orderTab(o.status) === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };
  const walletBalance = window._WALLET_BALANCE ?? 45.50;
  const wishlistCount = (window._WISHLIST || []).length;

  const stats = [
    { icon:'archive',     value: String(orderCounts.all), label:'Orders' },
    { icon:'checkCircle', value: String(orderCounts.processing), label:'In Progress' },
    { icon:'heart',       value: String(wishlistCount), label:'Wishlist' },
    { icon:'wallet',      value: `$${walletBalance.toFixed(2)}`, label:'Wallet' },
  ];
  const orderShortcuts = [
    { icon:'archive',    label:'All',       count: orderCounts.all,        tab:'all' },
    { icon:'checkCircle',label:'Processing',count: orderCounts.processing, tab:'processing' },
    { icon:'truck',      label:'Shipped',   count: orderCounts.shipped,    tab:'shipped' },
    { icon:'package',    label:'Delivered', count: orderCounts.delivered,  tab:'delivered' },
    { icon:'xCircle',    label:'Cancelled', count: orderCounts.cancelled,  tab:'cancelled' },
  ];
  const services = [
    { icon:'user',       label:'Personal Information', action: () => navigate('personal-info') },
    { icon:'mapPin',     label:'Shipping Addresses',   action: () => navigate('addresses') },
    { icon:'creditCard', label:'Payment Methods',      action: () => navigate('payment-methods') },
    { icon:'star',       label:'My Reviews',           action: () => setReviewsToast() },
    { icon:'lifeBuoy',   label:'Support Tickets',      action: () => navigate('support') },
    { icon:'settings',   label:'Settings',             action: () => navigate('settings') },
    { icon:'users',      label:'Invite Friends',       detail:'Earn $10', action: () => navigate('invite') },
    { icon:'lock',       label:'Admin Console',        action: () => navigate('admin') },
  ];
  const [toast, setToast] = React.useState(null);
  function setReviewsToast() { setToast({ type:'success', message:'You have no pending reviews' }); }

  function doLogout() {
    setConfirmLogout(false);
    navigate('login');
  }

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
              <button onClick={() => navigate('notifications')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="bell" size={21} color={C.mute} />
              </button>
              <button onClick={() => navigate('settings')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="settings" size={21} color={C.mute} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '24px 0' : '0 16px', width: isDesktop ? '100%' : undefined, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Admin suspension notice — reflects status changes made from the Admin Console */}
          {profile.status === 'suspended' && (
            <div style={{ borderRadius:14, background:'#FDEDED', border:'1px solid #F6C9C9', padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginTop: isDesktop ? 0 : 14 }}>
              <Icon name="lock" size={18} color={C.danger} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.danger }}>Your account has been suspended</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.danger, opacity:0.85, marginTop:1 }}>An administrator restricted this account. Contact support to appeal.</div>
              </div>
              <button onClick={() => navigate('support')} style={{ border:'none', background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, borderRadius:9999, padding:'7px 12px', cursor:'pointer', flexShrink:0 }}>Support</button>
            </div>
          )}

          {/* Profile card */}
          <div style={{ borderRadius:20, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'20px', position:'relative', overflow:'hidden', flexShrink:0, marginTop: isDesktop || profile.status === 'suspended' ? 0 : 14 }}>
            <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
            <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                {profile.avatar ? (
                  <img src={profile.avatar} style={{ width:64, height:64, borderRadius:9999, objectFit:'cover', border:'2.5px solid rgba(255,255,255,0.4)' }} />
                ) : (
                  <Avatar size={64} initials={profile.name.split(' ').map(n=>n[0]).join('')} bg="rgba(255,255,255,0.22)" style={{ border:'2.5px solid rgba(255,255,255,0.4)' }} />
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.8)' }}>Welcome back,</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>{profile.name}</span>
                  {profile.verified && (
                    <div style={{ width:16, height:16, borderRadius:9999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="check" size={9} color={C.primary} sw={3} />
                    </div>
                  )}
                  {profile.role === 'seller' && (
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff', background:'rgba(255,255,255,0.22)', borderRadius:9999, padding:'2px 8px' }}>Seller</span>
                  )}
                  {profile.role === 'admin' && (
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff', background:'rgba(255,255,255,0.22)', borderRadius:9999, padding:'2px 8px' }}>Admin</span>
                  )}
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.85)', marginTop:2 }}>{profile.email}</div>
              </div>
            </div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.18)', borderRadius:9999, padding:'5px 12px', marginTop:14 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.85)' }}>Member since</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:'#fff' }}>{fmtMonthYear(profile.memberSince)}</span>
            </div>
          </div>

          {/* Account overview */}
          <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Account Overview</span>
              <button onClick={() => navigate('tracking')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.primary, fontWeight:600 }}>View All</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
              {stats.map((s, i) => (
                <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={s.icon} size={18} color={C.primary} />
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{s.value}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute, textAlign:'center' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* My orders shortcuts */}
          <div style={{ background:C.white, borderRadius:16, padding:'14px 10px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 8px', marginBottom:12 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>My Orders</span>
              <button onClick={() => navigate('tracking')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.primary, fontWeight:600 }}>View All</button>
            </div>
            <div style={{ display:'flex', justifyContent:'space-around' }}>
              {orderShortcuts.map((s, i) => (
                <button key={i} onClick={() => navigate('tracking', { tab: s.tab })} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer', position:'relative', padding:'0 4px' }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name={s.icon} size={19} color={C.mute} />
                    {s.count > 0 && (
                      <div style={{ position:'absolute', top:-2, right:0, width:17, height:17, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.white}` }}>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:700, color:'#fff' }}>{s.count}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute, whiteSpace:'nowrap' }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet balance */}
          <div onClick={() => navigate('wallet')} style={{ borderRadius:16, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'16px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer' }}>
            <div style={{ width:44, height:44, borderRadius:9999, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="wallet" size={21} color="#fff" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.85)' }}>CLORIVO Balance</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:21, fontWeight:800, color:'#fff' }}>${walletBalance.toFixed(2)}</div>
            </div>
            <Btn variant="secondary" size="sm" onClick={e => { e.stopPropagation(); navigate('wallet'); }} style={{ background:'#fff', border:'none' }}>Top Up</Btn>
          </div>

          {/* Premium banner */}
          <div style={{ borderRadius:16, background:'#FFF7ED', padding:'16px 18px', display:'flex', alignItems:'center', gap:14, border:'1px solid #FDE9CE' }}>
            <div style={{ width:44, height:44, borderRadius:9999, background:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="crown" size={20} color="#fff" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:'#92400E' }}>Go CLORIVO Premium</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#92400E', marginTop:1 }}>Free shipping and exclusive deals</div>
            </div>
            <button onClick={() => navigate('premium')} style={{ border:'none', background:'#1F2937', color:'#fff', borderRadius:9999, padding:'9px 16px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, flexShrink:0 }}>
              Go Premium
            </button>
          </div>

          {/* Services */}
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
            <div style={{ padding:'14px 16px 4px', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>My Services</div>
            {services.map((item, ii) => (
              <button key={ii} onClick={item.action} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                border:'none', borderTop: `1px solid ${C.hairline}`,
                background:C.white, cursor:'pointer', textAlign:'left',
              }}>
                <div style={{ width:36, height:36, borderRadius:10, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={item.icon} size={17} color={C.mute} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink }}>{item.label}</div>
                </div>
                {item.detail && (
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.primary, background:C.primarySoft, borderRadius:9999, padding:'3px 9px', marginRight:4 }}>{item.detail}</span>
                )}
                <Icon name="chevronRight" size={16} color={C.mute} />
              </button>
            ))}
          </div>

          {/* Logout */}
          {!confirmLogout ? (
            <Btn variant="secondary" size="lg" wide onClick={() => setConfirmLogout(true)} style={{ color:C.danger, borderColor:'#FCA5A5' }}>
              <Icon name="logOut" size={17} color={C.danger} /> Log Out
            </Btn>
          ) : (
            <div style={{ background:'#FEF2F2', borderRadius:14, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger, fontWeight:600 }}>Are you sure you want to log out?</span>
              <div style={{ display:'flex', gap:10 }}>
                <Btn variant="danger" size="sm" style={{ flex:1 }} onClick={doLogout}>Yes, Log Out</Btn>
                <Btn variant="secondary" size="sm" style={{ flex:1 }} onClick={() => setConfirmLogout(false)}>Cancel</Btn>
              </div>
            </div>
          )}

          <div style={{ textAlign:'center', padding:'6px 0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.hairline }}>CLORIVO v1.0.0</div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {!isDesktop && (
        <BottomNav active={4} onTab={(i) => {
          if (i === 0) navigate('home');
          else if (i === 1) navigate('categories');
          else if (i === 2) navigate('cart');
          else if (i === 3) navigate('tracking');
        }} />
      )}
    </div>
  );
}

function fmtMonthYear(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month:'long', year:'numeric' });
}

// ─── PERSONAL INFORMATION ───────────────────────────────────────
function PersonalInfoScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [profile, setProfile] = React.useState(window._PROFILE);
  const [toast, setToast] = React.useState(null);
  const [pwModal, setPwModal] = React.useState(false);
  const [pwForm, setPwForm] = React.useState({ current:'', next:'', confirm:'' });
  const [pwError, setPwError] = React.useState('');
  const [twoFA, setTwoFA] = React.useState(true);
  const [devicesModal, setDevicesModal] = React.useState(false);
  const [prefModal, setPrefModal] = React.useState(null);
  const [lang, setLang] = React.useState('English');
  const [currency, setCurrency] = React.useState('USD ($)');
  const [notifOn, setNotifOn] = React.useState(true);
  const [theme, setTheme] = React.useState('Light');
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const basicRows = [
    { icon:'user',     label:'Full Name',    value:profile.name,  action: () => navigate('edit-profile') },
    { icon:'calendar', label:'Date of Birth',value:new Date(profile.dob).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}), action: () => navigate('edit-profile') },
    { icon:'user',     label:'Gender',       value:profile.gender, action: () => navigate('edit-profile') },
    { icon:'checkCircle', label:'Nationality', value:profile.nationality, action: () => navigate('edit-profile') },
  ];

  const devices = [
    { name:'iPhone 15 Pro · Port-au-Prince', current:true, lastActive:'Active now' },
    { name:'Chrome on Windows · Miami',      current:false, lastActive:'2 days ago' },
    { name:'Safari on MacBook · Paris',      current:false, lastActive:'1 week ago' },
  ];

  function submitPasswordChange() {
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    setPwError('');
    sbUpdatePassword && sbUpdatePassword(pwForm.next).catch(() => {});
    setPwModal(false);
    setPwForm({ current:'', next:'', confirm:'' });
    setToast({ type:'success', message:'Password updated successfully' });
  }

  function deleteAccount() {
    setConfirmDelete(false);
    setToast({ type:'success', message:'Account deletion request submitted' });
    setTimeout(() => navigate('login'), 1200);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Personal Information</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Avatar card */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            {profile.avatar ? (
              <img src={profile.avatar} style={{ width:60, height:60, borderRadius:9999, objectFit:'cover' }} />
            ) : (
              <Avatar size={60} initials={profile.name.split(' ').map(n=>n[0]).join('')} />
            )}
            <button onClick={() => navigate('edit-profile')} style={{ position:'absolute', bottom:-2, right:-2, width:24, height:24, borderRadius:9999, background:C.primary, border:`2px solid ${C.white}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Icon name="camera" size={11} color="#fff" />
            </button>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>{profile.name}</span>
              {profile.verified && (
                <div style={{ width:16, height:16, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="check" size={9} color="#fff" sw={3} />
                </div>
              )}
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2 }}>{profile.email}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{profile.phone}</div>
          </div>
        </div>

        {/* Basic information */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Basic Information</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            {basicRows.map((row, i) => (
              <button key={i} onClick={row.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', background:'none', cursor:'pointer', textAlign:'left' }}>
                <Icon name={row.icon} size={17} color={C.mute} />
                <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>{row.label}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{row.value}</span>
                <Icon name="chevronRight" size={15} color={C.mute} />
              </button>
            ))}
          </div>
        </div>

        {/* Account security */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Account Security</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <button onClick={() => setPwModal(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="lock" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Password</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>********</span>
              <Icon name="chevronRight" size={15} color={C.mute} />
            </button>
            <div style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="shield" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Two-Factor Authentication</span>
              <Switch checked={twoFA} onChange={v => { setTwoFA(v); setToast({ type:'success', message: v ? '2FA enabled' : '2FA disabled' }); }} />
            </div>
            <button onClick={() => setDevicesModal(true)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="smartphone" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Connected Devices</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{devices.length} devices</span>
              <Icon name="chevronRight" size={15} color={C.mute} />
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Preferences</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <button onClick={() => setPrefModal('lang')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="globe" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Language</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{lang}</span>
              <Icon name="chevronRight" size={15} color={C.mute} />
            </button>
            <button onClick={() => setPrefModal('currency')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="dollarSign" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Currency</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{currency}</span>
              <Icon name="chevronRight" size={15} color={C.mute} />
            </button>
            <div style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="bell" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Notifications</span>
              <Switch checked={notifOn} onChange={setNotifOn} />
            </div>
            <button onClick={() => setPrefModal('theme')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name={theme === 'Light' ? 'sun' : 'moon'} size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Theme</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{theme}</span>
              <Icon name="chevronRight" size={15} color={C.mute} />
            </button>
          </div>
        </div>

        {/* Delete account */}
        <div style={{ background:'#FEF2F2', borderRadius:16, padding:'16px' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.danger, marginBottom:4 }}>Delete My Account</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger, opacity:0.85, marginBottom:12 }}>This action is irreversible and will permanently delete your data.</div>
          {!confirmDelete ? (
            <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={14} color="#fff" /> Delete My Account
            </Btn>
          ) : (
            <div style={{ display:'flex', gap:10 }}>
              <Btn variant="danger" size="sm" style={{ flex:1 }} onClick={deleteAccount}>Yes, Delete Everything</Btn>
              <Btn variant="secondary" size="sm" style={{ flex:1 }} onClick={() => setConfirmDelete(false)}>Cancel</Btn>
            </div>
          )}
        </div>
      </div>

      {/* Password modal */}
      <Modal open={pwModal} title="Change Password" onClose={() => setPwModal(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Input label="Current Password" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current:e.target.value }))} />
          <Input label="New Password" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next:e.target.value }))} />
          <Input label="Confirm New Password" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm:e.target.value }))} error={pwError} />
          <Btn variant="primary" size="lg" wide onClick={submitPasswordChange} style={{ marginTop:4 }}>Update Password</Btn>
        </div>
      </Modal>

      {/* Devices modal */}
      <Modal open={devicesModal} title="Connected Devices" onClose={() => setDevicesModal(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {devices.map((d, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
              <Icon name="smartphone" size={18} color={d.current ? C.primary : C.mute} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{d.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color: d.current ? C.success : C.mute }}>{d.lastActive}</div>
              </div>
              {!d.current && (
                <button onClick={() => setToast({ type:'success', message:'Device signed out' })} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.danger }}>Sign Out</button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Preference modals */}
      <Modal open={prefModal === 'lang'} title="Select Language" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['English', 'Français', 'Kreyòl Ayisyen', 'Español'].map(l => (
            <button key={l} onClick={() => { setLang(l); setPrefModal(null); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{l}</span>
              {lang === l && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={prefModal === 'currency'} title="Select Currency" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['USD ($)', 'HTG (G)', 'EUR (€)'].map(c => (
            <button key={c} onClick={() => { setCurrency(c); setPrefModal(null); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{c}</span>
              {currency === c && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={prefModal === 'theme'} title="Select Theme" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['Light', 'Dark', 'System'].map(t => (
            <button key={t} onClick={() => { setTheme(t); setPrefModal(null); setToast({ type:'success', message:`Theme set to ${t}` }); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{t}</span>
              {theme === t && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── EDIT PROFILE ───────────────────────────────────────────────
function EditProfileScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [form, setForm] = React.useState({ ...window._PROFILE });
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const fileRef = React.useRef(null);

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('avatar', reader.result);
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const user = await sbGetUser();
      if (user) await sbUpdateProfile(user.id, { full_name: form.name, phone: form.phone });
    } catch (e) {}
    window._PROFILE = { ...form };
    setSaving(false);
    setToast({ type:'success', message:'Profile updated successfully' });
    setTimeout(goBack, 700);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Edit Profile</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative' }}>
            {form.avatar ? (
              <img src={form.avatar} style={{ width:88, height:88, borderRadius:9999, objectFit:'cover' }} />
            ) : (
              <Avatar size={88} initials={form.name.split(' ').map(n=>n[0]).join('')} />
            )}
            <button onClick={() => fileRef.current?.click()} style={{ position:'absolute', bottom:0, right:0, width:30, height:30, borderRadius:9999, background:C.primary, border:`2.5px solid ${C.white}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <Icon name="camera" size={13} color="#fff" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onPickPhoto} />
          </div>
          <button onClick={() => fileRef.current?.click()} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Change Photo</button>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:16, display:'flex', flexDirection:'column', gap:14, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} />
          <Input label="Email Address" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
          <Input label="Phone Number" value={form.phone} onChange={e => set('phone', e.target.value)} error={errors.phone} />
          <Input label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
          <div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute, letterSpacing:'-0.01em' }}>Gender</span>
            <div style={{ display:'flex', gap:8, marginTop:5 }}>
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} onClick={() => set('gender', g)} style={{ flex:1, height:44, borderRadius:12, border:`1.5px solid ${form.gender === g ? C.primary : C.hairline}`, background: form.gender === g ? C.primarySoft : C.white, cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color: form.gender === g ? C.primaryDeep : C.mute }}>{g}</button>
              ))}
            </div>
          </div>
          <Input label="Nationality" value={form.nationality} onChange={e => set('nationality', e.target.value)} />
        </div>

        <Btn variant="primary" size="lg" wide onClick={save} disabled={saving} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Btn>
        <Btn variant="secondary" size="lg" wide onClick={goBack}>Cancel</Btn>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { ProfileScreen, PersonalInfoScreen, EditProfileScreen });
