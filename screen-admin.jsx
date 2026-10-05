// screen-admin.jsx — Admin Console: full desktop business dashboard

// ─── SHARED ADMIN STATE (session-scoped, mirrors window._PROFILE pattern) ──
window._ADMIN_AUDIT_LOG   = window._ADMIN_AUDIT_LOG   || [];
window._BRANDS            = window._BRANDS            || [
  { id:'br1', name:'Clorivo Essentials', logo_url:null },
  { id:'br2', name:'Nova Home',          logo_url:null },
  { id:'br3', name:'Pulse Tech',         logo_url:null },
];
window._COUPONS           = window._COUPONS           || [
  { id:'cp1', code:'WELCOME10', discount:10, active:true,  expiresAt:'2026-12-31' },
  { id:'cp2', code:'FLASH25',   discount:25, active:true,  expiresAt:'2026-11-15' },
  { id:'cp3', code:'SUMMER20',  discount:20, active:false, expiresAt:'2026-08-01' },
];
window._ADMIN_REVIEWS     = window._ADMIN_REVIEWS      || [
  { id:'rv1', product:'Ribbed Terracotta Vase · M', author:'Alex Martin',  rating:5, text:'Beautiful quality, exactly as pictured.', status:'published' },
  { id:'rv2', product:'Artisan Ceramic Mug',        author:'Sophie Park',  rating:2, text:'Arrived chipped, disappointed.',          status:'published' },
  { id:'rv3', product:'Bamboo Oil Burner',          author:'Jun Wei',      rating:1, text:'Obvious fake review spam link: bit.ly/x', status:'published' },
];
window._STAFF              = window._STAFF             || [
  { id:'st1', name: window._PROFILE?.name || 'You', email: window._PROFILE?.email || '', role:'Owner', tint:0 },
  { id:'st2', name:'Mireille Jean',  email:'mireille@clorivo.com', role:'Moderator', tint:1 },
  { id:'st3', name:'Patrick Louis',  email:'patrick@clorivo.com',  role:'Support',   tint:2 },
];
window._REWARDS_CONFIG     = window._REWARDS_CONFIG    || { pointsPerDollar:1, referralBonus:10, minRedeem:500 };
window._ANNOUNCEMENT       = window._ANNOUNCEMENT       || { enabled:true, text:'Free shipping on orders over $50 — this week only!', link:'' };
window._HOME_SECTIONS      = window._HOME_SECTIONS      || { hero:true, shops:true, deals:true, categories:true, featured:true, videos:true };
window._HOME_CHIPS         = window._HOME_CHIPS         || ['All', 'Home', 'Tech', 'Beauty', 'Fashion', 'Kids'];
window._SEO_CONFIG         = window._SEO_CONFIG         || { ga:'', metaPixel:'', tiktok:'', searchConsole:'' };
window._LOGIN_HISTORY      = window._LOGIN_HISTORY      || [
  { who: window._PROFILE?.name || 'You', device:'Chrome · macOS', at: new Date(Date.now()-3600000).toISOString(), ip:'102.89.23.14' },
  { who: window._PROFILE?.name || 'You', device:'Safari · iPhone', at: new Date(Date.now()-86400000).toISOString(), ip:'102.89.23.14' },
];
window._NOTIF_SETTINGS     = window._NOTIF_SETTINGS     || { newOrders:true, newSellers:true, urgentReports:true, weeklyReports:false, marketingEmails:false };
window._ROLES_SETTINGS     = window._ROLES_SETTINGS     || { allowInvite:true };
window._SECURITY_SETTINGS  = window._SECURITY_SETTINGS  || { twoFactor:true, biometric:true, loginAlerts:false };
window._PLATFORM_SETTINGS  = window._PLATFORM_SETTINGS  || { freeShipping:true, realTimeTracking:true };

function logAdminAction(action, detail) {
  window._ADMIN_AUDIT_LOG = [{ action, detail, at:new Date().toISOString(), by: window._PROFILE?.name || 'Admin' }, ...window._ADMIN_AUDIT_LOG].slice(0, 200);
}

// ─── NAV CONFIG (matches the reference dashboard's grouping) ──────
const ADMIN_NAV = [
  { key:'overview', label:'Dashboard', icon:'barChart' },
  { group:'Catalog', items:[
    { key:'orders',     label:'Orders',      icon:'cart' },
    { key:'products',   label:'Products',    icon:'package' },
    { key:'categories', label:'Categories',  icon:'grid' },
    { key:'brands',     label:'Brands',      icon:'tag' },
    { key:'inventory',  label:'Inventory',   icon:'archive' },
    { key:'flashdeals', label:'Flash Deals', icon:'zap' },
  ]},
  { group:'Customers', items:[
    { key:'customers', label:'Customers', icon:'user' },
    { key:'sellers',   label:'Sellers',   icon:'store' },
    { key:'reviews',   label:'Reviews',   icon:'star' },
    { key:'tickets',   label:'Tickets',   icon:'messageSquare' },
    { key:'rewards',   label:'Rewards',   icon:'gift' },
    { key:'coupons',   label:'Coupons',   icon:'tag' },
  ]},
  { group:'Content', items:[
    { key:'banners',         label:'Banners',          icon:'camera' },
    { key:'announcement',    label:'Announcement Bar', icon:'volume2' },
    { key:'homepage',        label:'Homepage',         icon:'home' },
    { key:'shopbycategory',  label:'Shop by Category', icon:'grid' },
  ]},
  { group:'SEO', items:[
    { key:'ga',             label:'Google Analytics', icon:'barChart' },
    { key:'metapixel',      label:'Meta Pixel',       icon:'share' },
    { key:'tiktok',         label:'TikTok',           icon:'monitor' },
    { key:'searchconsole',  label:'Search Console',   icon:'search' },
  ]},
  { group:'System', items:[
    { key:'notifications',  label:'Notifications',  icon:'bell' },
    { key:'roles',          label:'Roles',          icon:'shield' },
    { key:'staff',          label:'Staff',          icon:'users' },
    { key:'security',       label:'Security',       icon:'lock' },
    { key:'loginhistory',   label:'Login History',  icon:'clock' },
    { key:'auditlog',       label:'Audit Log',      icon:'fileText' },
    { key:'integrations',   label:'Integrations',   icon:'zap' },
    { key:'apikeys',        label:'API Keys',       icon:'copy' },
    { key:'backup',         label:'Backup',         icon:'download' },
    { key:'health',         label:'Health',         icon:'shield' },
    { key:'settings',       label:'Settings',       icon:'settings' },
  ]},
];
const ADMIN_TITLES = (() => {
  const m = { overview:'Business Overview', ownervault:'Owner Vault' };
  ADMIN_NAV.forEach(n => { if (n.items) n.items.forEach(it => { m[it.key] = it.label; }); });
  return m;
})();

// ─── SMALL SHARED UI BITS (light-theme, matches reference) ─────────
function AdminCard({ children, style={}, padded=true }) {
  return <div style={{ background:C.white, border:`1px solid ${C.hairline}`, borderRadius:14, padding: padded ? '16px 18px' : 0, ...style }}>{children}</div>;
}
function AdminField({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.mute }}>{label}</span>
      {children}
    </div>
  );
}
function AdminTextInput({ value, onChange, placeholder, mono }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{
      height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink,
      fontFamily: mono ? "'JetBrains Mono',monospace" : "'Inter',sans-serif", fontSize:13.5, outline:'none',
    }} />
  );
}
function AdminEmptyRow({ text }) {
  return <div style={{ padding:'24px 16px', textAlign:'center', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{text}</div>;
}
function StatusPill({ tone, children }) {
  const tones = {
    success: { bg:'#EFF9F4', fg:C.success },
    danger:  { bg:'#FDEDED', fg:C.danger },
    warning: { bg:'#FFF6E5', fg:C.warning },
    mute:    { bg:C.paper,   fg:C.mute },
    primary: { bg:C.primarySoft, fg:C.primaryDeep },
  };
  const t = tones[tone] || tones.mute;
  return <span style={{ background:t.bg, color:t.fg, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:9999, textTransform:'capitalize', whiteSpace:'nowrap' }}>{children}</span>;
}
function SectionTitle({ title, sub, action }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink, letterSpacing:'-0.01em' }}>{title}</div>
        {sub && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:2 }}>{sub}</div>}
      </div>
      {action}
    </div>
  );
}
function Th({ children, align }) {
  return <th style={{ textAlign: align || 'left', padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:`1px solid ${C.hairline}` }}>{children}</th>;
}
function Td({ children, align, style={} }) {
  return <td style={{ textAlign: align || 'left', padding:'12px 14px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, borderBottom:`1px solid ${C.hairline}`, ...style }}>{children}</td>;
}

// ─── ADMIN — User Detail ────────────────────────────────────────
function AdminUserDetail({ user, onBack, onSave }) {
  const [role, setRole] = React.useState(user.role);
  const [status, setStatus] = React.useState(user.status);
  const [saved, setSaved] = React.useState(false);
  const dirty = role !== user.role || status !== user.status;

  async function handleSave() {
    await onSave({ role, status });
    setSaved(true);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:520 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Back</span>
      </button>

      <AdminCard style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Avatar size={48} initials={user.name.split(' ').map(n=>n[0]).join('')} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>{user.name}</span>
            {user.isYou && <StatusPill tone="primary">you</StatusPill>}
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{user.email}</div>
        </div>
      </AdminCard>

      {user.isYou && (
        <div style={{ background:C.primarySoft, border:`1px solid ${C.primary}33`, borderRadius:10, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep }}>
          This is the account signed in on this device. Changes here write straight to its Profile page.
        </div>
      )}

      <AdminField label="Role">
        <div style={{ display:'flex', gap:8 }}>
          {['Buyer','Seller','Admin'].map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ flex:1, height:38, borderRadius:9, border: role === r ? `1.5px solid ${C.primary}` : `1.5px solid ${C.hairline}`, background: role === r ? C.primarySoft : C.white, color: role === r ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, cursor:'pointer' }}>{r}</button>
          ))}
        </div>
      </AdminField>

      <AdminField label="Account status">
        <div style={{ display:'flex', gap:8 }}>
          {['active','suspended'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ flex:1, height:38, borderRadius:9, border: status === s ? `1.5px solid ${s === 'active' ? C.success : C.danger}` : `1.5px solid ${C.hairline}`, background: status === s ? (s === 'active' ? '#EFF9F4' : '#FDEDED') : C.white, color: status === s ? (s === 'active' ? C.success : C.danger) : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>{s}</button>
          ))}
        </div>
      </AdminField>

      {status === 'suspended' && (
        <div style={{ background:'#FDEDED', border:`1px solid ${C.danger}33`, borderRadius:10, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger }}>
          Suspending shows a restriction notice on this user's Profile page and blocks checkout until reactivated.
        </div>
      )}

      {saved ? (
        <div style={{ background:'#EFF9F4', borderRadius:10, padding:'12px', textAlign:'center', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.success, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Icon name="checkCircle" size={16} color={C.success} /> Saved — synced to the user's account
        </div>
      ) : (
        <Btn variant="primary" onClick={handleSave} disabled={!dirty}>Save changes</Btn>
      )}
    </div>
  );
}

// ─── ADMIN — Product Detail ─────────────────────────────────────
function AdminProductDetail({ product, onBack, onSave, onDelete }) {
  const [form, setForm] = React.useState({
    id: product.id, title: product.title || '', price: String(product.price ?? ''),
    oldPrice: product.oldPrice != null ? String(product.oldPrice) : '', discount: product.discount != null ? String(product.discount) : '',
    category: product.category || 'home', seller: product.seller || '', image_url: product.image_url || null,
    stock: product.stock != null ? String(product.stock) : '50',
  });
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef(null);
  const isNew = !product.id;
  const canSave = form.title.trim() && parseFloat(form.price) > 0;

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `products/${Date.now()}-${file.name}`;
    const { url, error } = await sbUploadFile('products', path, file);
    setUploading(false);
    if (error || !url) return;
    setForm(f => ({ ...f, image_url: url }));
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:520 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Products</span>
      </button>

      <div onClick={() => fileRef.current?.click()} style={{ height:160, borderRadius:12, overflow:'hidden', position:'relative', cursor:'pointer', background: form.image_url ? undefined : C.paper, border: form.image_url ? 'none' : `1.5px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {form.image_url ? (
          <img src={form.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <Icon name="camera" size={22} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{uploading ? 'Uploading…' : 'Upload product photo'}</span>
          </div>
        )}
        {form.image_url && (
          <div style={{ position:'absolute', bottom:6, right:6, background:'rgba(14,11,31,0.65)', borderRadius:8, padding:'4px 8px', display:'flex', alignItems:'center', gap:5 }}>
            <Icon name="camera" size={12} color="#fff" />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'#fff' }}>{uploading ? 'Uploading…' : 'Replace'}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display:'none' }} />

      <AdminTextInput value={form.title} onChange={v => setForm(f => ({ ...f, title:v }))} placeholder="Product title" />

      <div style={{ display:'flex', gap:8 }}>
        <AdminTextInput value={form.price} onChange={v => setForm(f => ({ ...f, price:v }))} placeholder="Price" mono />
        <AdminTextInput value={form.oldPrice} onChange={v => setForm(f => ({ ...f, oldPrice:v }))} placeholder="Compare-at (optional)" mono />
        <AdminTextInput value={form.stock} onChange={v => setForm(f => ({ ...f, stock:v }))} placeholder="Stock" mono />
      </div>

      <AdminField label="Category">
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {['home','fashion','tech','beauty','kids'].map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, category:c }))} style={{ height:32, padding:'0 12px', borderRadius:9999, border: form.category === c ? `1.5px solid ${C.primary}` : `1.5px solid ${C.hairline}`, background: form.category === c ? C.primarySoft : C.white, color: form.category === c ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize' }}>{c}</button>
          ))}
        </div>
      </AdminField>

      <div style={{ display:'flex', gap:8, marginTop:4 }}>
        {!isNew && (
          <Btn size="sm" style={{ color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => onDelete(form)}>
            <Icon name="x" size={13} color={C.danger} /> Delete
          </Btn>
        )}
        <Btn variant="primary" style={{ flex:1 }} onClick={() => onSave(form)} disabled={!canSave}>{isNew ? 'Create product' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}

// ─── ADMIN — KYC Review (reached from Sellers) ──────────────────
function AdminKycPanel({ onBack }) {
  const [decision, setDecision] = React.useState(null);
  const [kycRequests, setKycRequests] = React.useState([]);
  const [currentIdx, setCurrentIdx]  = React.useState(0);

  React.useEffect(() => { sbAdminGetKycRequests().then(data => setKycRequests(data ?? [])); }, []);

  const current = kycRequests[currentIdx];
  const checks = [
    { label:'Document validity', status:'pass' },
    { label:'Name match', status:'pass' },
    { label:'Face match (98%)', status:'pass' },
    { label:'Sanctions screening', status:'pass' },
    { label:'Duplicate account', status:'review' },
  ];

  async function handleDecision(status) {
    if (current) await sbAdminUpdateKyc(current.id, status, '');
    logAdminAction(status === 'approved' ? 'Approved seller KYC' : 'Rejected seller KYC', current?.shop_name || current?.profiles?.full_name || '—');
    setDecision(status);
    setTimeout(() => {
      setDecision(null);
      if (currentIdx < kycRequests.length - 1) setCurrentIdx(i => i + 1);
      else onBack();
    }, 1000);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0 }}>
          <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Sellers</span>
        </button>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{kycRequests.length} pending · #{currentIdx+1}</span>
      </div>

      <AdminCard style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <Avatar size={44} initials={(current?.profiles?.full_name ?? 'KYC').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} />
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>{current?.profiles?.full_name ?? 'Mary Otieno'}</span>
            <StatusPill tone="danger">pending</StatusPill>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{current?.profiles?.email ?? 'maryo@mail.com'}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Shop: "{current?.shop_name ?? 'kibo.crafts'}"</div>
        </div>
      </AdminCard>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {['ID front','ID back','Selfie'].map((t, i) => (
          <div key={i} style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${C.hairline}` }}>
            <Img label="" tint={i} style={{ height:70, borderRadius:0 }} />
            <div style={{ padding:'5px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', background:C.white }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:600, color:C.ink }}>{t}</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.success }}>✓</span>
            </div>
          </div>
        ))}
      </div>

      <AdminCard>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, marginBottom:8 }}>Automated checks</div>
        {checks.map((c, i) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{c.label}</span>
            <StatusPill tone={c.status === 'pass' ? 'success' : 'warning'}>{c.status}</StatusPill>
          </div>
        ))}
      </AdminCard>

      {decision ? (
        <div style={{ background: decision === 'approved' ? '#EFF9F4' : '#FDEDED', borderRadius:12, padding:'14px', textAlign:'center' }}>
          <Icon name="checkCircle" size={28} color={decision === 'approved' ? C.success : C.danger} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color: decision === 'approved' ? C.success : C.danger, marginTop:6 }}>
            {decision === 'approved' ? 'Approved — seller account activated' : 'Rejected — email sent to applicant'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:8 }}>
          <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => handleDecision('rejected')}>
            <Icon name="x" size={14} color={C.danger} /> Reject
          </Btn>
          <Btn variant="primary" size="sm" style={{ flex:1.4 }} onClick={() => handleDecision('approved')}>
            <Icon name="check" size={14} color="#fff" sw={2.5} /> Approve
          </Btn>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN SIDEBAR (full desktop, grouped) ──────────────────────
function AdminSidebarFull({ active, onNav, isDesktop }) {
  const { navigate } = useNav();
  if (!isDesktop) return null;
  return (
    <div style={{ width:240, background:C.white, borderRight:`1px solid ${C.hairline}`, height:'100%', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
      <div style={{ padding:'18px 18px 14px', display:'flex', alignItems:'center', gap:9, borderBottom:`1px solid ${C.hairline}` }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="shoppingBag" size={16} color="#fff" sw={2} />
        </div>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>CLORIVO</span>
      </div>

      <div style={{ flex:1, padding:'12px 10px', display:'flex', flexDirection:'column', gap:2 }}>
        {ADMIN_NAV.map((entry, gi) => entry.group ? (
          <div key={gi} style={{ marginTop:12 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:'0.06em', textTransform:'uppercase', padding:'4px 10px 6px' }}>{entry.group}</div>
            {entry.items.map(item => (
              <button key={item.key} onClick={() => onNav(item.key)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
                background: active === item.key ? C.primarySoft : 'transparent', marginBottom:1,
              }}>
                <Icon name={item.icon} size={16} color={active === item.key ? C.primary : C.mute} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight: active === item.key ? 700 : 500, color: active === item.key ? C.primaryDeep : C.ink }}>{item.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <button key={gi} onClick={() => onNav(entry.key)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
            background: active === entry.key ? C.primarySoft : 'transparent',
          }}>
            <Icon name={entry.icon} size={17} color={active === entry.key ? C.primary : C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight: active === entry.key ? 700 : 600, color: active === entry.key ? C.primaryDeep : C.ink }}>{entry.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding:'10px', borderTop:`1px solid ${C.hairline}`, display:'flex', flexDirection:'column', gap:2 }}>
        <button onClick={() => navigate('home')} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:'none', background:'transparent', cursor:'pointer', textAlign:'left' }}>
          <Icon name="externalLink" size={15} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:500, color:C.mute }}>View Storefront</span>
        </button>
        <button onClick={() => onNav('ownervault')} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:'none', background: active === 'ownervault' ? C.primarySoft : 'transparent', cursor:'pointer', textAlign:'left' }}>
          <Icon name="lock" size={15} color={active === 'ownervault' ? C.primary : '#C68A00'} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color: active === 'ownervault' ? C.primaryDeep : '#C68A00' }}>Owner Vault</span>
        </button>
      </div>
    </div>
  );
}

function fmtRelativeShort(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs/24)}d ago`;
}

// ─── ADMIN TOPBAR ────────────────────────────────────────────────
function AdminTopbar({ title, onNav }) {
  const { navigate } = useNav();
  const { dark, setDark } = useTheme();
  const [query, setQuery] = React.useState('');
  const [showNotifs, setShowNotifs] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const recent = window._ADMIN_AUDIT_LOG.slice(0, 6);

  return (
    <div style={{ height:60, flexShrink:0, background:C.white, borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:16, padding:'0 20px', position:'relative', zIndex:30 }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, flexShrink:0 }}>{title}</span>
      <div style={{ flex:1, maxWidth:420, display:'flex', alignItems:'center', gap:8, background:C.paper, border:`1px solid ${C.hairline}`, borderRadius:9999, padding:'8px 14px' }}>
        <Icon name="search" size={15} color={C.mute} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" style={{ border:'none', outline:'none', background:'transparent', flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }} />
      </div>
      <div style={{ flex:1 }} />
      <button onClick={() => setDark(d => !d)} style={{ width:36, height:36, borderRadius:9999, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={dark ? 'sun' : 'moon'} size={17} color={C.mute} />
      </button>
      <div style={{ position:'relative' }}>
        <button onClick={() => { setShowNotifs(v => !v); setShowMenu(false); }} style={{ width:36, height:36, borderRadius:9999, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <Icon name="bell" size={17} color={C.mute} />
          {recent.length > 0 && <div style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:9999, background:C.danger }} />}
        </button>
        {showNotifs && (
          <div style={{ position:'absolute', right:0, top:44, width:300, background:C.white, border:`1px solid ${C.hairline}`, borderRadius:12, boxShadow:'0 12px 32px rgba(14,11,31,0.14)', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.hairline}`, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink }}>Recent admin activity</div>
            {recent.length === 0 ? <AdminEmptyRow text="No activity yet" /> : recent.map((a, i) => (
              <div key={i} style={{ padding:'10px 14px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.ink }}>{a.action}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:1 }}>{a.detail} · {fmtRelativeShort(a.at)}</div>
              </div>
            ))}
            <button onClick={() => { setShowNotifs(false); onNav('auditlog'); }} style={{ width:'100%', border:'none', background:C.paper, padding:'9px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>View full audit log</button>
          </div>
        )}
      </div>
      <div style={{ position:'relative' }}>
        <button onClick={() => { setShowMenu(v => !v); setShowNotifs(false); }} style={{ border:'none', background:'none', cursor:'pointer', padding:0 }}>
          <Avatar size={34} initials={(window._PROFILE?.name || 'A').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} />
        </button>
        {showMenu && (
          <div style={{ position:'absolute', right:0, top:44, width:200, background:C.white, border:`1px solid ${C.hairline}`, borderRadius:12, boxShadow:'0 12px 32px rgba(14,11,31,0.14)', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${C.hairline}` }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink }}>{window._PROFILE?.name || 'Admin'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{window._PROFILE?.email || ''}</div>
            </div>
            <button onClick={() => navigate('home')} style={{ width:'100%', textAlign:'left', border:'none', background:'none', padding:'10px 14px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink }}>View Storefront</button>
            <button onClick={() => navigate('login')} style={{ width:'100%', textAlign:'left', border:'none', background:'none', padding:'10px 14px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>Log out</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMIN — Dashboard Overview ─────────────────────────────────
function AdminOverview({ adminStats, onNav }) {
  const orders = window.MOCK_ORDERS || [];
  const revenue = orders.reduce((s,o) => s + (o.total||0), 0);
  const [chartMode, setChartMode] = React.useState('Revenue');
  const W = 680, H = 160;
  const data = [60,85,72,105,90,130,118,145,120,160,150,175];
  const maxV = Math.max(...data);
  const pts = data.map((v, i) => [(i / (data.length-1)) * W, H - (v/maxV)*(H-16) - 8]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;

  const kpis = [
    { icon:'dollarSign', color:C.primary,  k:"Today's Revenue", v:`$${(revenue/8).toFixed(0)}`, d:'+12%', up:true },
    { icon:'barChart',   color:'#8A6BFF',  k:'Total Revenue',   v:`$${revenue.toFixed(0)}`,       d:'+18%', up:true },
    { icon:'cart',       color:C.success,  k:'Orders Today',    v:String(Math.round(orders.length/3)), d:'+8%', up:true },
    { icon:'package',    color:'#D97706',  k:'Total Orders',    v:String(orders.length),          d:'+8%', up:true },
    { icon:'users',      color:'#2563EB',  k:'Customers',       v: adminStats ? String(adminStats.users ?? 8) : '8', d:'+4%', up:true },
    { icon:'user',       color:C.success,  k:'New Customers',   v:'2', d:'+100%', up:true },
    { icon:'zap',        color:'#8A6BFF',  k:'Conversion Rate', v:'3.2%', d:'+0.4', up:true },
    { icon:'barChart',   color:'#D97706',  k:'Avg Order Value', v:`$${orders.length ? (revenue/orders.length).toFixed(0) : 0}`, d:'−1.2%', up:false },
    { icon:'wallet',     color:C.success,  k:'Profit',          v:`$${(revenue*0.22).toFixed(0)}`, d:'+9%', up:true },
    { icon:'refreshCw',  color:C.danger,   k:'Refunds',         v:'$0', d:'—', up:null },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Business Overview" sub="Welcome back — here's how your store is performing in real time." />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:12 }}>
        {kpis.map((k, i) => (
          <AdminCard key={i}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:9999, background:`${k.color}1A`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name={k.icon} size={16} color={k.color} />
              </div>
              {k.up != null && (
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color: k.up ? C.success : C.danger }}>{k.up ? '↗' : '↘'} {k.d}</span>
              )}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:800, color:C.ink }}>{k.v}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>{k.k}</div>
          </AdminCard>
        ))}
      </div>

      <AdminCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Sales Analytics</span>
          <div style={{ display:'flex', gap:4, background:C.paper, borderRadius:9999, padding:3 }}>
            {['Revenue','Orders','Profit'].map(m => (
              <button key={m} onClick={() => setChartMode(m)} style={{ border:'none', borderRadius:9999, padding:'6px 14px', cursor:'pointer', background: chartMode === m ? C.primary : 'transparent', color: chartMode === m ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600 }}>{m}</button>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H }}>
          <defs>
            <linearGradient id="adminOverviewG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={C.primary} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {[0.25,0.5,0.75].map((f,i) => <line key={i} x1={0} x2={W} y1={H*f} y2={H*f} stroke={C.hairline} strokeDasharray="4 4" />)}
          <polygon points={area} fill="url(#adminOverviewG)" />
          <polyline points={polyline} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4.5" fill={C.primary} />
        </svg>
      </AdminCard>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <AdminCard padded={false}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Recent orders</span>
            <button onClick={() => onNav('orders')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>View all</button>
          </div>
          {orders.slice(0,4).map((o,i) => (
            <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="package" size={14} color={C.primary} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>#{o.id}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{(o.status||'').replace('_',' ')}</div>
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.ink }}>${o.total?.toFixed(2)}</span>
            </div>
          ))}
        </AdminCard>
        <AdminCard padded={false}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Pending action</span>
          </div>
          {[
            { icon:'store', label:'atelier.lune', sub:'New shop pending review', nav:'sellers' },
            { icon:'lock',  label:'M. Otieno',    sub:'KYC awaiting decision',   nav:'sellers' },
            { icon:'star',  label:'1 flagged review', sub:'Possible spam',       nav:'reviews' },
          ].map((p,i) => (
            <div key={i} onClick={() => onNav(p.nav)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', cursor:'pointer' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name={p.icon} size={14} color={C.mute} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>{p.label}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{p.sub}</div>
              </div>
              <Icon name="chevronRight" size={14} color={C.mute} />
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}

// ─── Reusable simple settings-list section (kv / toggle rows) ──
function AdminSettingsRows({ rows, onToggle }) {
  return (
    <AdminCard padded={false}>
      {rows.map((r, i) => (
        <div key={i} style={{ padding:'14px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
          {r.type === 'kv' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{r.k}</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13.5, fontWeight:700, color: r.accent ? C.success : C.ink }}>{r.v}</span>
            </div>
          )}
          {r.type === 'toggle' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{r.k}</span>
              <Switch checked={r.on} onChange={v => onToggle && onToggle(r.k, v)} />
            </div>
          )}
        </div>
      ))}
    </AdminCard>
  );
}

// ─── ADMIN — Banners CMS (section, embedded in shell) ───────────
function AdminBannersSection({ onLog }) {
  const [banners, setBanners] = React.useState([
    { id:'b1', title:'Spring sale · 70% off', is_active:true,  bg_color:C.primary },
    { id:'b2', title:"Mother's Day",          is_active:true,  bg_color:'#C97B5A' },
    { id:'b3', title:'Summer preview',        is_active:false, bg_color:'#3B3730' },
  ]);
  const [editBanner, setEditBanner]   = React.useState(null);
  const [editTitle, setEditTitle]     = React.useState('');
  const [editSubtitle, setEditSubtitle] = React.useState('');
  const [editCta, setEditCta]         = React.useState('');
  const [editColor, setEditColor]     = React.useState(C.primary);
  const [editUploading, setEditUploading] = React.useState(false);
  const editFileInputRef = React.useRef(null);

  const [signupBanner, setSignupBanner] = React.useState(null);
  const [signupTitle, setSignupTitle]       = React.useState('');
  const [signupSubtitle, setSignupSubtitle] = React.useState('');
  const [uploading, setUploading]           = React.useState(false);
  const fileInputRef = React.useRef(null);

  React.useEffect(() => {
    sbGetBanners().then(({ data }) => { if (data?.length) setBanners(data); });
    sbGetSignupBanner().then(b => { if (b) { setSignupBanner(b); setSignupTitle(b.title || ''); setSignupSubtitle(b.subtitle || ''); } });
  }, []);

  function openEditBanner(b) {
    setEditBanner(b); setEditTitle(b.title || ''); setEditSubtitle(b.subtitle || ''); setEditCta(b.cta_text || ''); setEditColor(b.bg_color || b.color || C.primary);
  }
  function openNewBanner() { openEditBanner({ placement:'homepage', is_active:true, position: banners.length + 1 }); }

  async function handleSaveBanner() {
    if (!editBanner) return;
    const updated = { ...editBanner, title: editTitle, subtitle: editSubtitle, cta_text: editCta, bg_color: editColor, placement: editBanner.placement || 'homepage' };
    const { data } = await sbUpsertBanner(updated);
    if (data) setBanners(prev => prev.some(b => b.id === data.id) ? prev.map(b => b.id === data.id ? data : b) : [...prev, data]);
    onLog && onLog('Saved homepage banner', editTitle);
    setEditBanner(null);
  }
  async function handleDeleteBanner(b) {
    if (!b.id) return;
    await sbDeleteBanner(b.id);
    setBanners(prev => prev.filter(x => x.id !== b.id));
    onLog && onLog('Deleted homepage banner', b.title || '');
    setEditBanner(null);
  }
  async function handleEditImageChange(e) {
    const file = e.target.files?.[0];
    if (!file || !editBanner) return;
    setEditUploading(true);
    const path = `homepage/${Date.now()}-${file.name}`;
    const { url, error } = await sbUploadFile('banners', path, file);
    setEditUploading(false);
    if (error || !url) return;
    setEditBanner(b => ({ ...b, image_url: url }));
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
    const { data } = await sbUpsertBanner({ ...(signupBanner || {}), placement:'signup_success', is_active:true, position:1, image_url:url, title:signupTitle, subtitle:signupSubtitle });
    if (data) setSignupBanner(data);
    onLog && onLog('Updated signup banner photo', '');
  }
  async function handleSaveSignupText() {
    const { data } = await sbUpsertBanner({ ...(signupBanner || {}), placement:'signup_success', is_active:true, position:1, title:signupTitle, subtitle:signupSubtitle });
    if (data) setSignupBanner(data);
    onLog && onLog('Updated signup banner text', signupTitle);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Signup Success Banner" sub="Shown to buyers right after they create an account" />
      <AdminCard style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:480 }}>
        <div onClick={() => fileInputRef.current?.click()} style={{ height:120, borderRadius:12, overflow:'hidden', position:'relative', cursor:'pointer', background: signupBanner?.image_url ? undefined : C.paper, border: signupBanner?.image_url ? 'none' : `1.5px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {signupBanner?.image_url ? (
            <img src={signupBanner.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
              <Icon name="camera" size={22} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{uploading ? 'Uploading…' : 'Upload banner image'}</span>
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
        <AdminTextInput value={signupTitle} onChange={setSignupTitle} placeholder="Optional caption title" />
        <AdminTextInput value={signupSubtitle} onChange={setSignupSubtitle} placeholder="Optional caption subtitle" />
        <Btn variant="primary" size="sm" onClick={handleSaveSignupText}>Save Caption</Btn>
      </AdminCard>

      <SectionTitle title="Homepage Banners" sub={`${banners.filter(b=>b.is_active).length} active`} action={<Btn variant="primary" size="sm" onClick={openNewBanner}>+ New</Btn>} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
        {banners.map((b, i) => (
          <div key={b.id ?? i} onClick={() => openEditBanner(b)} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${C.hairline}`, cursor:'pointer', background:C.white }}>
            <div style={{ height:80, background: b.image_url ? undefined : (b.bg_color ?? b.color ?? C.primary), display:'flex', alignItems:'center', padding:'0 12px', position:'relative' }}>
              {b.image_url && <img src={b.image_url} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
              <span style={{ position:'relative', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.2, textShadow: b.image_url ? '0 1px 4px rgba(0,0,0,0.6)' : 'none' }}>{b.title || 'Untitled banner'}</span>
            </div>
            <div style={{ padding:'8px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <StatusPill tone={b.is_active ? 'success' : 'mute'}>{b.is_active ? 'live' : 'inactive'}</StatusPill>
              <button onClick={e => { e.stopPropagation(); handleToggleBanner(b); }} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>
                {b.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editBanner && (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:480 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{editBanner.id ? 'Edit Banner' : 'New Banner'}</div>

          <div onClick={() => editFileInputRef.current?.click()} style={{ height:100, borderRadius:10, overflow:'hidden', position:'relative', cursor:'pointer', background: editBanner.image_url ? undefined : C.paper, border: editBanner.image_url ? 'none' : `1.5px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {editBanner.image_url ? (
              <img src={editBanner.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <Icon name="camera" size={18} color={C.mute} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute }}>{editUploading ? 'Uploading…' : 'Upload banner photo (optional)'}</span>
              </div>
            )}
            {editBanner.image_url && (
              <div style={{ position:'absolute', bottom:5, right:5, background:'rgba(14,11,31,0.65)', borderRadius:7, padding:'3px 7px', display:'flex', alignItems:'center', gap:4 }}>
                <Icon name="camera" size={11} color="#fff" />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, color:'#fff' }}>{editUploading ? 'Uploading…' : 'Replace'}</span>
              </div>
            )}
          </div>
          <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditImageChange} style={{ display:'none' }} />

          <AdminTextInput value={editTitle} onChange={setEditTitle} placeholder="Title" />
          <AdminTextInput value={editSubtitle} onChange={setEditSubtitle} placeholder="Subtitle / kicker (optional)" />
          <AdminTextInput value={editCta} onChange={setEditCta} placeholder="Button text (default: Shop now)" />

          {!editBanner.image_url && (
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginBottom:6 }}>Background color</div>
              <div style={{ display:'flex', gap:7 }}>
                {[C.primary, '#C97B5A', '#059669', '#D97706', '#DB2777', '#3B3730'].map(c => (
                  <button key={c} onClick={() => setEditColor(c)} style={{ width:26, height:26, borderRadius:9999, background:c, border: editColor === c ? `2.5px solid ${C.ink}` : '2.5px solid transparent', cursor:'pointer' }} />
                ))}
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {editBanner.id && (
              <Btn size="sm" style={{ color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => handleDeleteBanner(editBanner)}>
                <Icon name="x" size={13} color={C.danger} />
              </Btn>
            )}
            <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setEditBanner(null)}>Cancel</Btn>
            <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={handleSaveBanner}>Save</Btn>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

// ─── MAIN SHELL ──────────────────────────────────────────────────
function AdminShellScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [section, setSection] = React.useState(params.section || 'overview');
  const [adminStats, setAdminStats] = React.useState(null);
  const [remoteUsers, setRemoteUsers] = React.useState(null);
  const [userDetail, setUserDetail] = React.useState(null);
  const [productDetail, setProductDetail] = React.useState(null);
  const [sellerPanel, setSellerPanel] = React.useState(null); // 'kyc' | null
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [, forceTick] = React.useState(0);

  React.useEffect(() => {
    sbAdminGetStats().then(s => setAdminStats(s));
    sbAdminGetUsers().then(u => { if (u) setRemoteUsers(u); });
    const id = setInterval(() => forceTick(t => t + 1), 800);
    return () => clearInterval(id);
  }, []);

  function onNav(key) {
    setSection(key);
    setUserDetail(null); setProductDetail(null); setSellerPanel(null);
    setMobileNavOpen(false);
  }

  // ── Users / Customers ──
  const youRow = {
    id:'you', isYou:true, tint:0,
    name: window._PROFILE?.name ?? 'You',
    email: window._PROFILE?.email ?? '',
    role: (window._PROFILE?.role ?? 'buyer') === 'seller' ? 'Seller' : (window._PROFILE?.role === 'admin' ? 'Admin' : 'Buyer'),
    status: window._PROFILE?.status ?? 'active',
  };
  const demoUsers = [
    { name:'Alex Martin',   email:'alex@mail.com',   role:'Buyer', status:'active',    tint:1 },
    { name:'Mary Otieno',   email:'maryo@mail.com',  role:'Seller',  status:'active',    tint:2 },
    { name:'Sophie Park',   email:'spark@mail.com',  role:'Buyer', status:'active',    tint:3 },
    { name:'Jun Wei',       email:'jwei@mail.com',   role:'Seller',  status:'suspended', tint:4 },
    { name:'Léa Dubois',    email:'lea.d@mail.com',  role:'Buyer', status:'active',    tint:0 },
  ];
  const usersList = [youRow, ...(remoteUsers
    ? remoteUsers.filter(u => u.email !== youRow.email).map((u, i) => ({
        id: u.id, name: u.full_name || u.email || 'User', email: u.email || '',
        role: u.role === 'seller' ? 'Seller' : (u.role === 'admin' ? 'Admin' : 'Buyer'),
        status: u.status || 'active', tint: i % 5,
      }))
    : demoUsers)];

  async function handleSaveUserDetail(updates) {
    if (!userDetail) return;
    if (userDetail.isYou) {
      window._PROFILE = { ...window._PROFILE, role: updates.role.toLowerCase(), status: updates.status };
      try { const user = await sbGetUser(); if (user) await sbUpdateProfile(user.id, { role: updates.role.toLowerCase(), status: updates.status }); } catch (e) {}
    } else if (userDetail.id) {
      await sbAdminUpdateUser(userDetail.id, { role: updates.role.toLowerCase(), status: updates.status });
      setRemoteUsers(prev => (prev || []).map(u => u.id === userDetail.id ? { ...u, role: updates.role.toLowerCase(), status: updates.status } : u));
    }
    logAdminAction('Updated customer', `${userDetail.name} → ${updates.role}, ${updates.status}`);
    setUserDetail(null);
  }

  // ── Products ──
  function openNewProduct() {
    setProductDetail({ id:null, title:'', price:'', oldPrice:'', discount:'', category:'home', seller: window._PROFILE?.name ?? 'Admin', image_url:null, stock:'50' });
  }
  async function handleSaveProduct(form) {
    const price = parseFloat(form.price) || 0;
    const oldPrice = form.oldPrice ? parseFloat(form.oldPrice) : undefined;
    const discount = form.discount ? parseInt(form.discount) : (oldPrice ? Math.round((1 - price/oldPrice) * 100) : undefined);
    const stock = form.stock !== undefined ? parseInt(form.stock) || 0 : 50;
    if (form.id) {
      const existing = window.PRODUCTS.find(p => p.id === form.id);
      if (existing) Object.assign(existing, { title: form.title, price, oldPrice, discount, category: form.category, image_url: form.image_url, stock });
      await sbAdminUpdateProduct(form.id, { title: form.title, price, compare_price: oldPrice ?? null, discount: discount ?? null, image_url: form.image_url });
      logAdminAction('Updated product', form.title);
    } else {
      const newId = Math.max(0, ...window.PRODUCTS.map(p => typeof p.id === 'number' ? p.id : 0)) + 1;
      window.PRODUCTS.push({ id:newId, title: form.title, price, oldPrice, discount, seller: form.seller, rating:4.8, reviews:0, category: form.category, label:'product photo', image_url: form.image_url, stock });
      await sbAdminCreateProduct({ title: form.title, price, compare_price: oldPrice ?? null, discount: discount ?? null, image_url: form.image_url });
      logAdminAction('Created product', form.title);
    }
    forceTick(t => t + 1);
    setProductDetail(null);
  }
  async function handleDeleteProduct(form) {
    if (form.id) {
      const idx = window.PRODUCTS.findIndex(p => p.id === form.id);
      if (idx >= 0) window.PRODUCTS.splice(idx, 1);
      await sbAdminDeleteProduct(form.id);
      logAdminAction('Deleted product', form.title);
    }
    forceTick(t => t + 1);
    setProductDetail(null);
  }

  // ── Categories ──
  function addCategory() {
    window.MAIN_CATEGORIES.push({ slug:'New Category', tab:'All', icon:'tag', desc:'Edit this category', count:0 });
    logAdminAction('Added category', 'New Category');
    forceTick(t => t + 1);
  }
  function updateCategory(i, field, value) {
    window.MAIN_CATEGORIES[i] = { ...window.MAIN_CATEGORIES[i], [field]: value };
    forceTick(t => t + 1);
  }
  function deleteCategory(i) {
    const removed = window.MAIN_CATEGORIES.splice(i, 1);
    logAdminAction('Deleted category', removed[0]?.slug || '');
    forceTick(t => t + 1);
  }

  // ── Sellers ──
  const [sellersList, setSellersList] = React.useState(() => [
    { name:'luna.studio',   cat:'Home & Decor', sales:'$12.4k', rating:4.9, status:'verified',  tint:0 },
    { name:'TechZone',      cat:'Electronics',  sales:'$48.1k', rating:4.7, status:'verified',  tint:1 },
    { name:'atelier.lune',  cat:'Crafts',     sales:'—',      rating:0,   status:'pending',  tint:2 },
    { name:'Fashion House', cat:'Fashion',          sales:'$22.7k', rating:4.6, status:'verified',  tint:3 },
  ]);
  function toggleSellerStatus(name) {
    setSellersList(prev => prev.map(s => s.name === name ? { ...s, status: s.status === 'suspended' ? 'verified' : 'suspended' } : s));
    logAdminAction('Toggled seller status', name);
  }

  // ── Orders ──
  const [orderStatusOverrides, setOrderStatusOverrides] = React.useState({});
  function setOrderStatus(id, status) {
    setOrderStatusOverrides(prev => ({ ...prev, [id]: status }));
    logAdminAction('Updated order status', `#${id} → ${status}`);
  }

  // ── Reviews ──
  function setReviewStatus(id, status) {
    window._ADMIN_REVIEWS = window._ADMIN_REVIEWS.map(r => r.id === id ? { ...r, status } : r);
    logAdminAction(status === 'hidden' ? 'Hid review' : 'Restored review', id);
    forceTick(t => t + 1);
  }

  // ── Tickets ──
  function setTicketStatus(id, status) {
    window._TICKETS = (window._TICKETS || []).map(t => t.id === id ? { ...t, status } : t);
    logAdminAction('Updated ticket status', `${id} → ${status}`);
    forceTick(t => t + 1);
  }

  // ── Coupons ──
  function addCoupon() {
    window._COUPONS = [...window._COUPONS, { id:`cp${Date.now()}`, code:'NEWCODE', discount:10, active:true, expiresAt:'' }];
    logAdminAction('Created coupon', 'NEWCODE');
    forceTick(t => t + 1);
  }
  function updateCoupon(id, field, value) {
    window._COUPONS = window._COUPONS.map(c => c.id === id ? { ...c, [field]: value } : c);
    forceTick(t => t + 1);
  }
  function deleteCoupon(id) {
    window._COUPONS = window._COUPONS.filter(c => c.id !== id);
    logAdminAction('Deleted coupon', id);
    forceTick(t => t + 1);
  }

  // ── Brands ──
  function addBrand() {
    window._BRANDS = [...window._BRANDS, { id:`br${Date.now()}`, name:'New Brand', logo_url:null }];
    forceTick(t => t + 1);
  }
  function updateBrand(id, name) {
    window._BRANDS = window._BRANDS.map(b => b.id === id ? { ...b, name } : b);
    forceTick(t => t + 1);
  }
  function deleteBrand(id) {
    window._BRANDS = window._BRANDS.filter(b => b.id !== id);
    forceTick(t => t + 1);
  }

  // ── Staff ──
  function addStaff() {
    window._STAFF = [...window._STAFF, { id:`st${Date.now()}`, name:'New teammate', email:'', role:'Support', tint: window._STAFF.length % 5 }];
    logAdminAction('Invited staff member', 'New teammate');
    forceTick(t => t + 1);
  }
  function updateStaff(id, field, value) {
    window._STAFF = window._STAFF.map(s => s.id === id ? { ...s, [field]: value } : s);
    forceTick(t => t + 1);
  }
  function removeStaff(id) {
    window._STAFF = window._STAFF.filter(s => s.id !== id);
    logAdminAction('Removed staff member', id);
    forceTick(t => t + 1);
  }

  // ── Inventory / Flash deals ──
  function updateStock(id, value) {
    const p = window.PRODUCTS.find(p => p.id === id);
    if (p) p.stock = Math.max(0, parseInt(value) || 0);
    forceTick(t => t + 1);
  }
  function toggleFlash(id) {
    const p = window.PRODUCTS.find(p => p.id === id);
    if (p) p.isFlash = !p.isFlash;
    logAdminAction('Toggled flash deal', p?.title || '');
    forceTick(t => t + 1);
  }

  // ── Announcement / Homepage / Shop-by-category ──
  function saveAnnouncement(updates) { window._ANNOUNCEMENT = { ...window._ANNOUNCEMENT, ...updates }; logAdminAction('Updated announcement bar', updates.text ?? ''); forceTick(t => t + 1); }
  function toggleHomeSection(key, val) { window._HOME_SECTIONS = { ...window._HOME_SECTIONS, [key]: val }; forceTick(t => t + 1); }
  function updateChip(i, value) { window._HOME_CHIPS = window._HOME_CHIPS.map((c,idx) => idx === i ? value : c); forceTick(t => t + 1); }
  function addChip() { window._HOME_CHIPS = [...window._HOME_CHIPS, 'New']; forceTick(t => t + 1); }
  function removeChip(i) { window._HOME_CHIPS = window._HOME_CHIPS.filter((_,idx) => idx !== i); forceTick(t => t + 1); }

  // ── SEO ──
  function saveSeo(field, value) { window._SEO_CONFIG = { ...window._SEO_CONFIG, [field]: value }; forceTick(t => t + 1); }

  // ── Rewards ──
  function saveRewards(field, value) { window._REWARDS_CONFIG = { ...window._REWARDS_CONFIG, [field]: value }; forceTick(t => t + 1); }

  // ── Notifications / Roles / Security / Platform Settings toggles ──
  function toggleNotif(field, value) { window._NOTIF_SETTINGS = { ...window._NOTIF_SETTINGS, [field]: value }; forceTick(t => t + 1); }
  function toggleRole(field, value) { window._ROLES_SETTINGS = { ...window._ROLES_SETTINGS, [field]: value }; forceTick(t => t + 1); }
  function toggleSecurity(field, value) { window._SECURITY_SETTINGS = { ...window._SECURITY_SETTINGS, [field]: value }; logAdminAction('Changed security setting', `${field} → ${value}`); forceTick(t => t + 1); }
  function togglePlatformSetting(field, value) { window._PLATFORM_SETTINGS = { ...window._PLATFORM_SETTINGS, [field]: value }; logAdminAction('Changed platform setting', `${field} → ${value}`); forceTick(t => t + 1); }

  const title = ADMIN_TITLES[section] || 'Dashboard';

  function renderSection() {
    switch (section) {
      case 'overview': return <AdminOverview adminStats={adminStats} onNav={onNav} />;

      case 'orders': {
        const orders = window.MOCK_ORDERS || [];
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title="Orders" sub={`${orders.length} orders`} />
            <AdminCard padded={false} style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr><Th>Order</Th><Th>Placed</Th><Th align="right">Total</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {orders.length === 0 ? <tr><td colSpan={4}><AdminEmptyRow text="No orders yet" /></td></tr> : orders.map(o => {
                    const status = orderStatusOverrides[o.id] || o.status;
                    return (
                      <tr key={o.id}>
                        <Td style={{ fontWeight:700 }}>#{o.id}</Td>
                        <Td>{o.placedAt ? new Date(o.placedAt).toLocaleDateString() : '—'}</Td>
                        <Td align="right" style={{ fontFamily:"'JetBrains Mono',monospace" }}>${o.total?.toFixed(2)}</Td>
                        <Td>
                          <select value={status} onChange={e => setOrderStatus(o.id, e.target.value)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'5px 8px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, background:C.white }}>
                            {['confirmed','preparing','shipped','in_transit','delivered','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                          </select>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AdminCard>
          </div>
        );
      }

      case 'products': return productDetail ? (
        <AdminProductDetail product={productDetail} onBack={() => setProductDetail(null)} onSave={handleSaveProduct} onDelete={handleDeleteProduct} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Products" sub={`${window.PRODUCTS.length} products live on Home, Search & Category`} action={<Btn variant="primary" size="sm" onClick={openNewProduct}>+ New product</Btn>} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap:12 }}>
            {window.PRODUCTS.map((p, i) => (
              <div key={p.id ?? i} onClick={() => setProductDetail(p)} style={{ borderRadius:12, overflow:'hidden', border:`1px solid ${C.hairline}`, cursor:'pointer', background:C.white }}>
                <div style={{ height:100, position:'relative', background: p.image_url ? undefined : ['#F0ECFD','#FDF0EC','#ECF4FD','#ECFDF4','#FDFAEC'][i % 5] }}>
                  {p.image_url && <img src={p.image_url} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
                  {p.discount && <div style={{ position:'absolute', top:6, left:6, background:C.danger, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:9999 }}>-{p.discount}%</div>}
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.ink, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{p.title}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:C.primary, marginTop:3 }}>${Number(p.price).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      case 'categories': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Categories" sub={`${window.MAIN_CATEGORIES.length} categories`} action={<Btn variant="primary" size="sm" onClick={addCategory}>+ New category</Btn>} />
          <AdminCard padded={false}>
            {window.MAIN_CATEGORIES.map((c, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={c.icon || 'tag'} size={16} color={C.primary} />
                </div>
                <input value={c.slug} onChange={e => updateCategory(i,'slug',e.target.value)} style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }} />
                <input value={c.desc} onChange={e => updateCategory(i,'desc',e.target.value)} style={{ flex:1.4, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }} />
                <button onClick={() => deleteCategory(i)} style={{ border:'none', background:'none', cursor:'pointer', padding:4, flexShrink:0 }}><Icon name="trash" size={15} color={C.danger} /></button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'brands': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Brands" sub={`${window._BRANDS.length} brands`} action={<Btn variant="primary" size="sm" onClick={addBrand}>+ New brand</Btn>} />
          <AdminCard padded={false}>
            {window._BRANDS.map((b, i) => (
              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="tag" size={15} color={C.mute} /></div>
                <input value={b.name} onChange={e => updateBrand(b.id, e.target.value)} style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }} />
                <button onClick={() => deleteBrand(b.id)} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}><Icon name="trash" size={15} color={C.danger} /></button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'inventory': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Inventory" sub="Stock levels across all products" />
          <AdminCard padded={false} style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>Product</Th><Th align="right">Stock</Th><Th>Status</Th></tr></thead>
              <tbody>
                {window.PRODUCTS.map(p => {
                  const stock = p.stock ?? 50;
                  return (
                    <tr key={p.id}>
                      <Td>{p.title}</Td>
                      <Td align="right"><input type="number" value={stock} onChange={e => updateStock(p.id, e.target.value)} style={{ width:70, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} /></Td>
                      <Td>{stock === 0 ? <StatusPill tone="danger">out of stock</StatusPill> : stock < 10 ? <StatusPill tone="warning">low stock</StatusPill> : <StatusPill tone="success">in stock</StatusPill>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminCard>
        </div>
      );

      case 'flashdeals': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Flash Deals" sub="Toggle which products appear in Flash Deals on Home" />
          <AdminCard padded={false}>
            {window.PRODUCTS.map((p, i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{p.title}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute }}>${Number(p.price).toFixed(2)}</span>
                <Switch checked={!!p.isFlash} onChange={() => toggleFlash(p.id)} />
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'customers': return userDetail ? (
        <AdminUserDetail user={userDetail} onBack={() => setUserDetail(null)} onSave={handleSaveUserDetail} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Customers" sub={`${usersList.length}+ accounts`} />
          <div style={{ display:'flex', gap:10 }}>
            {[['Total', String(usersList.length)],['Buyers', String(usersList.filter(u=>u.role==='Buyer').length)],['Sellers', String(usersList.filter(u=>u.role==='Seller').length)]].map((s,i) => (
              <AdminCard key={i} style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{s[0]}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:C.ink, marginTop:2 }}>{s[1]}</div>
              </AdminCard>
            ))}
          </div>
          <AdminCard padded={false}>
            {usersList.map((u, i) => (
              <div key={u.id ?? i} onClick={() => setUserDetail(u)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', cursor:'pointer' }}>
                <Avatar size={32} initials={u.name.split(' ').map(n=>n[0]).join('')} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{u.name}</span>
                    {u.isYou && <StatusPill tone="primary">you</StatusPill>}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{u.email} · {u.role}</div>
                </div>
                <StatusPill tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</StatusPill>
                <Icon name="chevronRight" size={14} color={C.mute} />
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'sellers': return sellerPanel === 'kyc' ? (
        <AdminKycPanel onBack={() => setSellerPanel(null)} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Sellers" sub={`${sellersList.length} shops`} />
          <div style={{ display:'flex', gap:10 }}>
            {[['Active', sellersList.filter(s=>s.status==='verified').length],['Pending', sellersList.filter(s=>s.status==='pending').length],['Suspended', sellersList.filter(s=>s.status==='suspended').length]].map((s,i) => (
              <AdminCard key={i} style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{s[0]}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:700, color:C.ink, marginTop:2 }}>{s[1]}</div>
              </AdminCard>
            ))}
          </div>
          <AdminCard padded={false}>
            {sellersList.map((s, i) => (
              <div key={i} onClick={() => s.status === 'pending' && setSellerPanel('kyc')} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', cursor: s.status === 'pending' ? 'pointer' : 'default' }}>
                <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', flexShrink:0 }}><Img label="" tint={s.tint} style={{ width:32, height:32 }} /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{s.name}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{s.cat}{s.rating > 0 ? ` · ⭐ ${s.rating}` : ''}</div>
                </div>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:600, color:C.ink }}>{s.sales}</span>
                <StatusPill tone={s.status === 'verified' ? 'success' : s.status === 'suspended' ? 'danger' : 'warning'}>{s.status}</StatusPill>
                {s.status !== 'pending' && (
                  <button onClick={e => { e.stopPropagation(); toggleSellerStatus(s.name); }} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
                    <Icon name={s.status === 'suspended' ? 'checkCircle' : 'x'} size={16} color={s.status === 'suspended' ? C.success : C.danger} />
                  </button>
                )}
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'reviews': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Reviews" sub={`${window._ADMIN_REVIEWS.length} reviews`} />
          <AdminCard padded={false}>
            {window._ADMIN_REVIEWS.map((r, i) => (
              <div key={r.id} style={{ padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', opacity: r.status === 'hidden' ? 0.5 : 1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{r.author}</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}> · {r.product}</span>
                  </div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#F59E0B' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginBottom:8 }}>{r.text}</div>
                <button onClick={() => setReviewStatus(r.id, r.status === 'hidden' ? 'published' : 'hidden')} style={{ border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color: r.status === 'hidden' ? C.success : C.danger }}>
                  {r.status === 'hidden' ? 'Restore' : 'Hide review'}
                </button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'tickets': {
        const tickets = window._TICKETS || [];
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title="Support Tickets" sub={`${tickets.length} tickets`} />
            <AdminCard padded={false}>
              {tickets.length === 0 ? <AdminEmptyRow text="No tickets" /> : tickets.map((t, i) => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{t.subject}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{t.id} · {t.createdAt}</div>
                  </div>
                  <select value={t.status} onChange={e => setTicketStatus(t.id, e.target.value)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'5px 8px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, background:C.white }}>
                    {['open','in_progress','closed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              ))}
            </AdminCard>
          </div>
        );
      }

      case 'rewards': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Rewards" sub="Loyalty points configuration" />
          <AdminCard style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:420 }}>
            <AdminField label="Points earned per $1 spent">
              <AdminTextInput value={String(window._REWARDS_CONFIG.pointsPerDollar)} onChange={v => saveRewards('pointsPerDollar', v)} mono />
            </AdminField>
            <AdminField label="Referral bonus ($)">
              <AdminTextInput value={String(window._REWARDS_CONFIG.referralBonus)} onChange={v => saveRewards('referralBonus', v)} mono />
            </AdminField>
            <AdminField label="Minimum points to redeem">
              <AdminTextInput value={String(window._REWARDS_CONFIG.minRedeem)} onChange={v => saveRewards('minRedeem', v)} mono />
            </AdminField>
          </AdminCard>
        </div>
      );

      case 'coupons': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Coupons" sub={`${window._COUPONS.length} codes`} action={<Btn variant="primary" size="sm" onClick={addCoupon}>+ New coupon</Btn>} />
          <AdminCard padded={false} style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>Code</Th><Th align="right">Discount</Th><Th>Expires</Th><Th>Active</Th><Th></Th></tr></thead>
              <tbody>
                {window._COUPONS.map(c => (
                  <tr key={c.id}>
                    <Td><input value={c.code} onChange={e => updateCoupon(c.id,'code',e.target.value.toUpperCase())} style={{ border:'none', outline:'none', background:'transparent', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.ink }} /></Td>
                    <Td align="right"><input type="number" value={c.discount} onChange={e => updateCoupon(c.id,'discount',parseInt(e.target.value)||0)} style={{ width:56, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 6px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />%</Td>
                    <Td><input type="date" value={c.expiresAt} onChange={e => updateCoupon(c.id,'expiresAt',e.target.value)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 6px', fontFamily:"'Inter',sans-serif", fontSize:12 }} /></Td>
                    <Td><Switch checked={c.active} onChange={v => updateCoupon(c.id,'active',v)} /></Td>
                    <Td align="right"><button onClick={() => deleteCoupon(c.id)} style={{ border:'none', background:'none', cursor:'pointer' }}><Icon name="trash" size={15} color={C.danger} /></button></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminCard>
        </div>
      );

      case 'banners': return <AdminBannersSection onLog={logAdminAction} />;

      case 'announcement': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Announcement Bar" sub="Shown as a top strip on the storefront Home page" />
          <AdminCard style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:480 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Enabled</span>
              <Switch checked={window._ANNOUNCEMENT.enabled} onChange={v => saveAnnouncement({ enabled:v })} />
            </div>
            <AdminField label="Message">
              <AdminTextInput value={window._ANNOUNCEMENT.text} onChange={v => saveAnnouncement({ text:v })} placeholder="Announcement text" />
            </AdminField>
            {window._ANNOUNCEMENT.enabled && (
              <div style={{ background:`linear-gradient(90deg, ${C.primary} 0%, #8A6BFF 100%)`, borderRadius:9999, padding:'8px 16px', textAlign:'center' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:'#fff' }}>{window._ANNOUNCEMENT.text}</span>
              </div>
            )}
          </AdminCard>
        </div>
      );

      case 'homepage': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Homepage" sub="Show or hide sections on the storefront Home page" />
          <AdminSettingsRows rows={[
            { type:'toggle', k:'Hero banner',          on:window._HOME_SECTIONS.hero },
            { type:'toggle', k:'Popular Shops',        on:window._HOME_SECTIONS.shops },
            { type:'toggle', k:'Flash & Super Deals',  on:window._HOME_SECTIONS.deals },
            { type:'toggle', k:'Popular Categories',   on:window._HOME_SECTIONS.categories },
            { type:'toggle', k:'Featured products',    on:window._HOME_SECTIONS.featured },
            { type:'toggle', k:'Product videos',       on:window._HOME_SECTIONS.videos },
          ]} onToggle={(k, v) => {
            const map = { 'Hero banner':'hero', 'Popular Shops':'shops', 'Flash & Super Deals':'deals', 'Popular Categories':'categories', 'Featured products':'featured', 'Product videos':'videos' };
            toggleHomeSection(map[k], v);
          }} />
        </div>
      );

      case 'shopbycategory': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Shop by Category" sub="Category chips shown at the top of Home" action={<Btn variant="primary" size="sm" onClick={addChip}>+ Add</Btn>} />
          <AdminCard padded={false}>
            {window._HOME_CHIPS.map((chip, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Icon name="grid" size={15} color={C.mute} />
                <input value={chip} onChange={e => updateChip(i, e.target.value)} style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }} />
                <button onClick={() => removeChip(i)} style={{ border:'none', background:'none', cursor:'pointer' }}><Icon name="trash" size={15} color={C.danger} /></button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'ga': case 'metapixel': case 'tiktok': case 'searchconsole': {
        const fieldMap = { ga:'ga', metapixel:'metaPixel', tiktok:'tiktok', searchconsole:'searchConsole' };
        const labelMap = { ga:'Google Analytics Measurement ID', metapixel:'Meta Pixel ID', tiktok:'TikTok Pixel ID', searchconsole:'Search Console verification tag' };
        const field = fieldMap[section];
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title={ADMIN_TITLES[section]} sub="Tracking ID saved for this session" />
            <AdminCard style={{ maxWidth:480 }}>
              <AdminField label={labelMap[section]}>
                <AdminTextInput value={window._SEO_CONFIG[field]} onChange={v => saveSeo(field, v)} placeholder="e.g. G-XXXXXXXXXX" mono />
              </AdminField>
            </AdminCard>
          </div>
        );
      }

      case 'notifications': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="System Notifications" />
          <AdminSettingsRows rows={[
            { type:'toggle', k:'New orders', on:window._NOTIF_SETTINGS.newOrders },
            { type:'toggle', k:'New sellers', on:window._NOTIF_SETTINGS.newSellers },
            { type:'toggle', k:'Urgent reports', on:window._NOTIF_SETTINGS.urgentReports },
            { type:'toggle', k:'Weekly reports', on:window._NOTIF_SETTINGS.weeklyReports },
            { type:'toggle', k:'Marketing emails', on:window._NOTIF_SETTINGS.marketingEmails },
          ]} onToggle={(k, v) => {
            const map = { 'New orders':'newOrders', 'New sellers':'newSellers', 'Urgent reports':'urgentReports', 'Weekly reports':'weeklyReports', 'Marketing emails':'marketingEmails' };
            toggleNotif(map[k], v);
          }} />
        </div>
      );

      case 'roles': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Roles & Permissions" />
          <AdminSettingsRows rows={[
            { type:'kv', k:'Owner', v:`${window._STAFF.filter(s=>s.role==='Owner').length} member` },
            { type:'kv', k:'Moderator', v:`${window._STAFF.filter(s=>s.role==='Moderator').length} members` },
            { type:'kv', k:'Support', v:`${window._STAFF.filter(s=>s.role==='Support').length} members` },
            { type:'toggle', k:'Allow staff to invite new members', on:window._ROLES_SETTINGS.allowInvite },
          ]} onToggle={(k, v) => toggleRole('allowInvite', v)} />
        </div>
      );

      case 'staff': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Staff" sub={`${window._STAFF.length} team members`} action={<Btn variant="primary" size="sm" onClick={addStaff}>+ Invite</Btn>} />
          <AdminCard padded={false}>
            {window._STAFF.map((s, i) => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Avatar size={30} initials={(s.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} />
                <input value={s.name} onChange={e => updateStaff(s.id,'name',e.target.value)} style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }} />
                <input value={s.email} onChange={e => updateStaff(s.id,'email',e.target.value)} placeholder="email" style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }} />
                <select value={s.role} onChange={e => updateStaff(s.id,'role',e.target.value)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'5px 8px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, background:C.white }}>
                  {['Owner','Moderator','Support','Analyst'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button onClick={() => removeStaff(s.id)} style={{ border:'none', background:'none', cursor:'pointer' }}><Icon name="trash" size={15} color={C.danger} /></button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'security': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Security & 2FA" />
          <AdminSettingsRows rows={[
            { type:'toggle', k:'Two-factor authentication', on:window._SECURITY_SETTINGS.twoFactor },
            { type:'toggle', k:'Biometric login', on:window._SECURITY_SETTINGS.biometric },
            { type:'toggle', k:'Login alerts', on:window._SECURITY_SETTINGS.loginAlerts },
            { type:'kv', k:'Active sessions', v:'3 devices' },
            { type:'kv', k:'Last security check', v:'2d ago' },
          ]} onToggle={(k, v) => {
            const map = { 'Two-factor authentication':'twoFactor', 'Biometric login':'biometric', 'Login alerts':'loginAlerts' };
            toggleSecurity(map[k], v);
          }} />
        </div>
      );

      case 'loginhistory': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Login History" />
          <AdminCard padded={false}>
            {window._LOGIN_HISTORY.map((l, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Icon name="monitor" size={16} color={C.mute} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{l.who} · {l.device}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{l.ip}</div>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{fmtRelativeShort(l.at)}</span>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'auditlog': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Audit Log" sub="Every admin action taken this session, newest first" />
          <AdminCard padded={false}>
            {window._ADMIN_AUDIT_LOG.length === 0 ? <AdminEmptyRow text="No admin actions yet — changes you make elsewhere in this console will show up here." /> : window._ADMIN_AUDIT_LOG.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="fileText" size={13} color={C.primary} /></div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{a.action}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.detail} · by {a.by}</div>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, flexShrink:0 }}>{fmtRelativeShort(a.at)}</span>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'integrations': {
        const supaConfigured = !!window._supabase;
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title="Integrations" />
            <AdminCard padded={false}>
              {[
                { name:'Supabase (database & auth)', status: supaConfigured ? 'connected' : 'not connected' },
                { name:'Stripe / card payments', status:'not connected' },
                { name:'MonCash', status:'not connected' },
                { name:'NatCash', status:'not connected' },
              ].map((it, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{it.name}</span>
                  <StatusPill tone={it.status === 'connected' ? 'success' : 'mute'}>{it.status}</StatusPill>
                </div>
              ))}
            </AdminCard>
          </div>
        );
      }

      case 'apikeys': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="API Keys" />
          <AdminCard style={{ maxWidth:560 }}>
            <AdminField label="Publishable key (Supabase anon key)">
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ flex:1, fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.ink, background:C.paper, borderRadius:8, padding:'10px 12px', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                  {typeof SUPABASE_ANON_KEY === 'string' ? SUPABASE_ANON_KEY.slice(0,18) + '…' + SUPABASE_ANON_KEY.slice(-10) : '—'}
                </div>
              </div>
            </AdminField>
          </AdminCard>
        </div>
      );

      case 'backup': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Backup" sub="Export the current session's catalog & content as JSON" />
          <AdminCard style={{ maxWidth:480, display:'flex', flexDirection:'column', gap:10 }}>
            <Btn variant="primary" onClick={() => {
              const payload = { products: window.PRODUCTS, categories: window.MAIN_CATEGORIES, exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `clorivo-backup-${Date.now()}.json`; a.click();
              URL.revokeObjectURL(url);
              logAdminAction('Exported backup', `${window.PRODUCTS.length} products, ${window.MAIN_CATEGORIES.length} categories`);
            }}>Download backup (.json)</Btn>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Includes products and categories currently in this session.</span>
          </AdminCard>
        </div>
      );

      case 'health': {
        const supaConfigured = !!window._supabase;
        const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title="System Health" />
            <AdminCard padded={false}>
              {[
                { name:'Browser connectivity', ok: online },
                { name:'Supabase client configured', ok: supaConfigured },
                { name:'Backend reachable', ok: false, note:'Project paused — see Owner Vault' },
              ].map((h, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <Icon name={h.ok ? 'checkCircle' : 'xCircle'} size={17} color={h.ok ? C.success : C.danger} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{h.name}</div>
                    {h.note && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{h.note}</div>}
                  </div>
                  <StatusPill tone={h.ok ? 'success' : 'danger'}>{h.ok ? 'ok' : 'issue'}</StatusPill>
                </div>
              ))}
            </AdminCard>
          </div>
        );
      }

      case 'settings': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Platform Settings" />
          <AdminSettingsRows rows={[
            { type:'kv', k:'Overall commission rate', v:'8.5%' },
            { type:'kv', k:'Standard shipping', v:'$3.99' },
            { type:'kv', k:'Express shipping', v:'$8.99' },
            { type:'kv', k:'Free shipping threshold', v:'$30.00' },
            { type:'toggle', k:'Free shipping enabled', on:window._PLATFORM_SETTINGS.freeShipping },
            { type:'toggle', k:'Real-time tracking', on:window._PLATFORM_SETTINGS.realTimeTracking },
          ]} onToggle={(k, v) => {
            const map = { 'Free shipping enabled':'freeShipping', 'Real-time tracking':'realTimeTracking' };
            togglePlatformSetting(map[k], v);
          }} />
        </div>
      );

      case 'ownervault': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Owner Vault" sub="Sensitive platform & billing information" />
          <AdminCard style={{ border:'1.5px solid #F6C97D', background:'#FFF9EE' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <Icon name="alertTriangle" size={18} color="#C68A00" />
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:'#8A5A00' }}>Backend project is paused</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'#8A5A00', marginTop:4, lineHeight:1.5 }}>
                  The Supabase project "clorivoo" (ref kpwebnoqsjlxxiamwsst) is currently paused. The account's free tier is already
                  at its 2 active-project limit, so it can't auto-resume. Until it's resumed, every admin edit (products, banners,
                  customers) persists only for this browser session — not across reloads or between visitors.
                  To fix: pause or delete another active project in this Supabase organization, or upgrade the plan, then resume
                  this project.
                </div>
              </div>
            </div>
          </AdminCard>
          <AdminCard>
            <AdminField label="Project reference">
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.ink }}>kpwebnoqsjlxxiamwsst</div>
            </AdminField>
          </AdminCard>
        </div>
      );

      default: return <AdminOverview adminStats={adminStats} onNav={onNav} />;
    }
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ flex:1, display:'flex', overflow:'hidden', paddingTop: isDesktop ? 0 : STATUS_H }}>
        <AdminSidebarFull active={section} onNav={onNav} isDesktop={isDesktop} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
          {isDesktop ? (
            <AdminTopbar title={title} onNav={onNav} />
          ) : (
            <div style={{ height:52, flexShrink:0, background:C.white, borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', gap:10, padding:'0 14px' }}>
              <button onClick={() => setMobileNavOpen(v => !v)} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
                <Icon name="list" size={20} color={C.ink} />
              </button>
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:14.5, fontWeight:700, color:C.ink }}>{title}</span>
              <button onClick={() => navigate('home')} style={{ border:'none', background:'none', cursor:'pointer', padding:4 }}>
                <Icon name="externalLink" size={18} color={C.mute} />
              </button>
            </div>
          )}

          {!isDesktop && mobileNavOpen && (
            <div style={{ position:'absolute', inset:0, top:52, background:'rgba(14,11,31,0.4)', zIndex:40 }} onClick={() => setMobileNavOpen(false)}>
              <div onClick={e => e.stopPropagation()} style={{ width:260, height:'100%', background:C.white, overflowY:'auto', padding:'10px' }}>
                {ADMIN_NAV.map((entry, gi) => entry.group ? (
                  <div key={gi} style={{ marginTop:10 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, color:C.mute, letterSpacing:'0.06em', textTransform:'uppercase', padding:'4px 10px 6px' }}>{entry.group}</div>
                    {entry.items.map(item => (
                      <button key={item.key} onClick={() => onNav(item.key)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background: section === item.key ? C.primarySoft : 'transparent' }}>
                        <Icon name={item.icon} size={16} color={section === item.key ? C.primary : C.mute} />
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight: section === item.key ? 700 : 500, color: section === item.key ? C.primaryDeep : C.ink }}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button key={gi} onClick={() => onNav(entry.key)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background: section === entry.key ? C.primarySoft : 'transparent' }}>
                    <Icon name={entry.icon} size={17} color={section === entry.key ? C.primary : C.mute} />
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight: section === entry.key ? 700 : 600, color: section === entry.key ? C.primaryDeep : C.ink }}>{entry.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '22px 28px' : '16px' }}>
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminShellScreen });
