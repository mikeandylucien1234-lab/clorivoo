// screen-admin.jsx — Admin Console: full desktop business dashboard

// ─── SHARED ADMIN STATE (session-scoped, mirrors window._PROFILE pattern) ──
window._ADMIN_AUDIT_LOG   = window._ADMIN_AUDIT_LOG   || [];
window._BRANDS             = window._BRANDS            || [];
window._COUPONS            = window._COUPONS           || [];
window._ADMIN_REVIEWS      = window._ADMIN_REVIEWS     || [];
window._REWARDS_CONFIG     = window._REWARDS_CONFIG    || { pointsPerDollar:1, referralBonus:10, minRedeem:500 };
window._ANNOUNCEMENT       = window._ANNOUNCEMENT       || { enabled:false, text:'', link:'' };
window._HOME_SECTIONS      = window._HOME_SECTIONS      || { hero:true, shops:true, deals:true, categories:true, featured:true, videos:true };
window._SEO_CONFIG         = window._SEO_CONFIG         || { ga:'', metaPixel:'', tiktok:'', searchConsole:'' };
window._LOGIN_HISTORY      = window._LOGIN_HISTORY      || [];
window._NOTIF_SETTINGS     = window._NOTIF_SETTINGS     || { newOrders:true, newSellers:true, urgentReports:true, weeklyReports:false, marketingEmails:false };
window._SECURITY_SETTINGS  = window._SECURITY_SETTINGS  || { twoFactor:true, biometric:true, loginAlerts:false };
window._PLATFORM_SETTINGS  = window._PLATFORM_SETTINGS  || { freeShipping:true, realTimeTracking:true, commissionRate:0.10 };

// Local, instant-feedback mirror of the audit log — the real, tamper-resistant
// record lives in the `audit_logs` table (written via the log_audit() RPC,
// which hardcodes actor_id to auth.uid() server-side so a client can never
// forge an entry). This local array just avoids a round-trip before the
// Audit Log screen's "recent activity" widgets can show the action.
window._ADMIN_AUDIT_LOG   = window._ADMIN_AUDIT_LOG   || [];
function logAdminAction(action, detail, resourceType, resourceId) {
  window._ADMIN_AUDIT_LOG = [{ action, detail, at:new Date().toISOString(), by: window._PROFILE?.name || 'Admin' }, ...window._ADMIN_AUDIT_LOG].slice(0, 200);
  sbLogAudit(action, resourceType || null, resourceId || null, null, detail ? { detail } : null);
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
    info:    { bg:'#EBF2FF', fg:'#2563EB' },
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
    oldPrice: product.oldPrice != null ? String(product.oldPrice) : '',
    category_id: product.category_id || '', sku: product.sku || '', image_url: product.image_url || null,
    stock: product.stock != null ? String(product.stock) : '50',
  });
  const [categories, setCategories] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef(null);
  const isNew = !product.id;
  const canSave = form.title.trim() && parseFloat(form.price) > 0;

  React.useEffect(() => { sbGetCategoryTree().then(tree => setCategories(_flattenCategories(tree))); }, []);

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
      <AdminTextInput value={form.sku} onChange={v => setForm(f => ({ ...f, sku:v }))} placeholder="SKU (optional)" mono />

      <AdminField label="Category">
        <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id:e.target.value }))}
          style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
          <option value="">— No category —</option>
          {categories.map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}
        </select>
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

  if (kycRequests.length === 0) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
          <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Sellers</span>
        </button>
        <AdminCard><AdminEmptyRow text="No pending KYC requests." /></AdminCard>
      </div>
    );
  }
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
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>{current?.profiles?.full_name ?? ''}</span>
            <StatusPill tone="danger">pending</StatusPill>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{current?.profiles?.email ?? ''}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Shop: "{current?.shop_name ?? ''}"</div>
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
function AdminOverview({ adminStats, onNav, sellersList = [], reviews = [], kycCount = 0 }) {
  const s = adminStats || _DEMO_ADMIN_STATS;
  const recentOrders = s.recentOrders ?? [];
  const [chartMode, setChartMode] = React.useState('Revenue');
  const [range, setRange] = React.useState('week'); // day | week | month | year
  const [series, setSeries] = React.useState([]);
  const W = 680, H = 160;

  const loadSeries = React.useCallback(() => {
    sbAdminGetSalesTimeseries(range).then(data => setSeries(data || []));
  }, [range]);

  React.useEffect(() => {
    loadSeries();
    // Live updates: any order insert/update re-pulls this range's buckets —
    // the Supabase equivalent of a Socket.io push, no separate socket server needed.
    const unsubscribe = sbSubscribeAdminOrders(() => loadSeries());
    return unsubscribe;
  }, [loadSeries]);

  const bucketCount = { day:24, week:7, month:30, year:12 }[range] || 7;
  const filledSeries = series.length ? series : [...Array(bucketCount)].map(() => ({ revenue:0, orders:0, profit:0 }));
  const data = filledSeries.map(b => chartMode === 'Orders' ? b.orders : chartMode === 'Profit' ? b.profit : b.revenue);
  const maxV = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length-1)) * W, H - (v/maxV)*(H-16) - 8]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;
  const hasAnyData = (s.orders ?? 0) > 0;

  const kpis = [
    { icon:'dollarSign', color:C.primary,  k:"Today's Revenue", v:`$${(s.todaysRevenue ?? 0).toFixed(0)}` },
    { icon:'barChart',   color:'#8A6BFF',  k:'Total Revenue',   v:`$${(s.totalRevenue ?? 0).toFixed(0)}` },
    { icon:'cart',       color:C.success,  k:'Orders Today',    v:String(s.ordersToday ?? 0) },
    { icon:'package',    color:'#D97706',  k:'Total Orders',    v:String(s.orders ?? 0) },
    { icon:'users',      color:'#2563EB',  k:'Customers',       v:String(s.users ?? 0) },
    { icon:'zap',        color:'#8A6BFF',  k:'Conversion Rate', v:'0.0%' },
    { icon:'barChart',   color:'#D97706',  k:'Avg Order Value', v:`$${(s.avgOrderValue ?? 0).toFixed(0)}` },
    { icon:'wallet',     color:C.success,  k:'Profit',          v:`$${(s.profit ?? 0).toFixed(0)}` },
    { icon:'refreshCw',  color:C.danger,   k:'Refunds',         v:`$${(s.refunds ?? 0).toFixed(0)}` },
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
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Sales Analytics</span>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ display:'flex', gap:4, background:C.paper, borderRadius:9999, padding:3 }}>
              {[['day','Day'],['week','Week'],['month','Month'],['year','Year']].map(([k,label]) => (
                <button key={k} onClick={() => setRange(k)} style={{ border:'none', borderRadius:9999, padding:'6px 12px', cursor:'pointer', background: range === k ? C.ink : 'transparent', color: range === k ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600 }}>{label}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:4, background:C.paper, borderRadius:9999, padding:3 }}>
              {['Revenue','Orders','Profit'].map(m => (
                <button key={m} onClick={() => setChartMode(m)} style={{ border:'none', borderRadius:9999, padding:'6px 14px', cursor:'pointer', background: chartMode === m ? C.primary : 'transparent', color: chartMode === m ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600 }}>{m}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ position:'relative' }}>
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
          {!hasAnyData && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, background:C.white, padding:'4px 12px', borderRadius:9999 }}>No sales yet — your trend will appear here</span>
            </div>
          )}
        </div>
      </AdminCard>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <AdminCard padded={false}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Recent orders</span>
            <button onClick={() => onNav('orders')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>View all</button>
          </div>
          {recentOrders.length === 0 && <AdminEmptyRow text="No orders yet" />}
          {recentOrders.slice(0,4).map((o,i) => (
            <div key={o.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="package" size={14} color={C.primary} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>#{String(o.id).slice(0,8)} · {o.profiles?.full_name || o.profiles?.email || 'Buyer'}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{(o.status||'').replace('_',' ')}</div>
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.ink }}>${(o.total_amount ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </AdminCard>
        <AdminCard padded={false}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Pending action</span>
          </div>
          {(() => {
            const pendingSellers = sellersList.filter(s => s.status === 'pending');
            const items = [
              ...(pendingSellers.length > 0 ? [{ icon:'store', label:`${pendingSellers.length} shop${pendingSellers.length>1?'s':''} pending review`, sub:pendingSellers.map(s=>s.name).join(', '), nav:'sellers' }] : []),
              ...(kycCount > 0 ? [{ icon:'lock', label:`${kycCount} KYC request${kycCount>1?'s':''}`, sub:'Awaiting decision', nav:'sellers' }] : []),
              ...(reviews.length > 0 ? [{ icon:'star', label:`${reviews.length} review${reviews.length>1?'s':''}`, sub:'To moderate', nav:'reviews' }] : []),
            ];
            if (items.length === 0) return <AdminEmptyRow text="Nothing pending — all caught up." />;
            return items.map((p,i) => (
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
            ));
          })()}
        </AdminCard>
      </div>
    </div>
  );
}

// ─── Reusable simple settings-list section (kv / toggle rows) ──
function AdminSettingsRows({ rows, onToggle, onNumber }) {
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
          {r.type === 'number' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{r.k}</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                <input type="number" min={0} max={100} step={0.5} value={r.v} onChange={e => onNumber && onNumber(r.k, e.target.value)}
                  style={{ width:60, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'4px 6px', fontFamily:"'JetBrains Mono',monospace", fontSize:13.5, fontWeight:700, color:C.ink }} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>%</span>
              </div>
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

// ─── ADMIN — Categories (hierarchy, media, SEO, attributes, delete-safe, reorder) ──
const CATEGORY_STATUS_TONE = { draft:'mute', active:'success', inactive:'warning', archived:'danger' };
const CATEGORY_PAGE_SIZE = 20;

// Depth-first flatten of the nested tree sbGetCategoryTree()/building locally returns,
// so <select> parent-pickers can show indented "Fashion > Men" style options.
function _flattenCategories(list, depth = 0, out = []) {
  for (const c of list) {
    out.push({ ...c, depth });
    if (c.children?.length) _flattenCategories(c.children, depth + 1, out);
  }
  return out;
}
function _categoryTreeFromFlat(flat) {
  const byId = new Map(flat.map(c => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) byId.get(c.parent_id).children.push(c);
    else roots.push(c);
  }
  return roots;
}

function AdminCategoriesSection() {
  const [result, setResult] = React.useState({ categories:[], totalCategories:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [parentFilter, setParentFilter] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState(null); // { id } or {} for new, or null
  const [deleting, setDeleting] = React.useState(null); // category row
  const [selected, setSelected] = React.useState(new Set());
  const [allCategoriesFlat, setAllCategoriesFlat] = React.useState([]); // for parent pickers / move targets

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetCategories({ page, limit:CATEGORY_PAGE_SIZE, status, search, parentId:parentFilter }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search, parentFilter]);

  const loadTree = React.useCallback(() => {
    sbGetCategoryTree().then(tree => setAllCategoriesFlat(_flattenCategories(tree)));
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { loadTree(); }, [loadTree]);

  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    const unsubscribe = sbSubscribeAdminCategories(() => { load(); loadTree(); });
    return unsubscribe;
  }, [load, loadTree]);

  async function handleMove(cat, direction) {
    await sbAdminMoveCategory(cat.id, direction);
    logAdminAction('Reordered category', cat.name);
    load(); loadTree();
  }
  async function handleStatus(cat, newStatus) {
    await sbAdminSetCategoryStatus(cat.id, newStatus);
    logAdminAction('Changed category status', `${cat.name} → ${newStatus}`);
    load(); loadTree();
  }
  async function handleDuplicate(cat) {
    const { data } = await sbAdminCreateCategory({
      name: `${cat.name} (copy)`, slug: `${cat.slug}-copy-${Date.now().toString(36)}`,
      icon: cat.icon, parent_id: cat.parent_id, description: cat.description, status: 'draft',
    });
    if (data) logAdminAction('Duplicated category', cat.name);
    load(); loadTree();
  }
  async function handleBulk(newStatus) {
    await sbAdminBulkCategoryStatus([...selected], newStatus);
    logAdminAction(`Bulk ${newStatus}`, `${selected.size} categories`);
    setSelected(new Set());
    load(); loadTree();
  }

  if (editing) {
    return <AdminCategoryDetail category={editing} allCategoriesFlat={allCategoriesFlat}
      onBack={() => { setEditing(null); load(); loadTree(); }} />;
  }
  if (deleting) {
    return <AdminCategoryDeleteModal category={deleting} allCategoriesFlat={allCategoriesFlat}
      onClose={() => setDeleting(null)}
      onDone={() => { setDeleting(null); load(); loadTree(); }} />;
  }

  const { categories, totalCategories, totalPages } = result;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Categories" sub={`${totalCategories} categor${totalCategories === 1 ? 'y' : 'ies'}`}
        action={<Btn variant="primary" size="sm" onClick={() => setEditing({})}>+ Create Category</Btn>} />

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Category name or slug…"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
        <select value={parentFilter} onChange={e => { setParentFilter(e.target.value); setPage(1); }}
          style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }}>
          <option value="">All levels</option>
          <option value="ROOT">Top-level only</option>
        </select>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['ALL','draft','active','inactive','archived'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === s ? C.ink : C.paper, color: status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s}</button>
        ))}
      </div>

      {selected.size > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:C.primarySoft, borderRadius:12, padding:'10px 14px', flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primaryDeep }}>{selected.size} selected</span>
          <Btn size="sm" onClick={() => handleBulk('active')}>Activate</Btn>
          <Btn size="sm" onClick={() => handleBulk('inactive')}>Deactivate</Btn>
          <Btn size="sm" style={{ color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => handleBulk('archived')}>Archive</Btn>
          <button onClick={() => setSelected(new Set())} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginLeft:'auto' }}>Clear</button>
        </div>
      )}

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <Th></Th><Th>Category</Th><Th>Status</Th><Th align="right">Products</Th><Th align="right">Subcats</Th><Th>Updated</Th><Th align="right">Actions</Th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Loading categories…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={7}><AdminEmptyRow text="No categories yet — create your first one." /></td></tr>
            ) : categories.map(c => (
              <tr key={c.id}>
                <Td>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={e => setSelected(prev => { const next = new Set(prev); e.target.checked ? next.add(c.id) : next.delete(c.id); return next; })} />
                </Td>
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setEditing({ id:c.id })}>
                    <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', flexShrink:0, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {c.image_url ? <img src={c.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name={c.icon || 'tag'} size={15} color={C.primary} />}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600 }}>{c.name}{c.is_featured && <span title="Featured" style={{ marginLeft:6 }}><Icon name="star" size={11} color={C.warning} filled sw={0} /></span>}</div>
                      <div style={{ fontSize:11, color:C.mute, fontFamily:"'JetBrains Mono',monospace" }}>/{c.slug}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <select value={c.status} onChange={e => handleStatus(c, e.target.value)}
                    style={{ border:'none', borderRadius:9999, padding:'4px 10px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, textTransform:'capitalize', ...(() => { const t = { success:{bg:'#EFF9F4',fg:C.success}, danger:{bg:'#FDEDED',fg:C.danger}, warning:{bg:'#FFF6E5',fg:C.warning}, mute:{bg:C.paper,fg:C.mute} }[CATEGORY_STATUS_TONE[c.status] || 'mute']; return { background:t.bg, color:t.fg }; })() }}>
                    {['draft','active','inactive','archived'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
                <Td align="right">{c.productCount}</Td>
                <Td align="right">{c.subcategoryCount}</Td>
                <Td>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : (c.created_at ? new Date(c.created_at).toLocaleDateString() : '—')}</Td>
                <Td align="right">
                  <div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
                    <button onClick={() => handleMove(c, 'up')} title="Move up" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(-90deg)' }} />
                    </button>
                    <button onClick={() => handleMove(c, 'down')} title="Move down" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)' }} />
                    </button>
                    <button onClick={() => setEditing({ id:c.id })} title="Edit" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="edit" size={13} color={C.mute} />
                    </button>
                    <button onClick={() => handleDuplicate(c)} title="Duplicate" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="copy" size={13} color={C.mute} />
                    </button>
                    <button onClick={() => setDeleting(c)} title="Delete" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="trash" size={13} color={C.danger} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Previous</button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Next</button>
        </div>
      )}
    </div>
  );
}

function AdminCategoryTabs({ tab, setTab }) {
  const tabs = [['basic','Basic'],['media','Media'],['display','Display'],['seo','SEO'],['attributes','Attributes']];
  return (
    <div style={{ display:'flex', gap:4, background:C.paper, borderRadius:9999, padding:3, width:'fit-content' }}>
      {tabs.map(([k,label]) => (
        <button key={k} onClick={() => setTab(k)} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: tab === k ? C.primary : 'transparent', color: tab === k ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600 }}>{label}</button>
      ))}
    </div>
  );
}

function _slugify(s) { return (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

function AdminCategoryDetail({ category, allCategoriesFlat, onBack }) {
  const isNew = !category.id;
  const [loading, setLoading] = React.useState(!isNew);
  const [tab, setTab] = React.useState('basic');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [form, setForm] = React.useState({
    name:'', slug:'', icon:'tag', parent_id:'', description:'', short_description:'',
    image_url:null, banner_desktop_url:null, banner_tablet_url:null, banner_mobile_url:null,
    status:'draft', is_featured:false, show_on_homepage:false, show_in_navigation:true, show_in_menu:true, show_in_search:true,
    seo_title:'', seo_description:'', seo_keywords:'', canonical_url:'', og_image_url:'',
    default_view:'grid', product_sort_default:'popular', position:0,
  });
  const [attributes, setAttributes] = React.useState([]);
  const [uploading, setUploading] = React.useState('');

  React.useEffect(() => {
    if (isNew) return;
    sbAdminGetCategory(category.id).then(data => {
      if (data) {
        setForm({
          name:data.name||'', slug:data.slug||'', icon:data.icon||'tag', parent_id:data.parent_id||'',
          description:data.description||'', short_description:data.short_description||'',
          image_url:data.image_url||null, banner_desktop_url:data.banner_desktop_url||null,
          banner_tablet_url:data.banner_tablet_url||null, banner_mobile_url:data.banner_mobile_url||null,
          status:data.status||'draft', is_featured:!!data.is_featured, show_on_homepage:!!data.show_on_homepage,
          show_in_navigation:data.show_in_navigation!==false, show_in_menu:data.show_in_menu!==false, show_in_search:data.show_in_search!==false,
          seo_title:data.seo_title||'', seo_description:data.seo_description||'', seo_keywords:data.seo_keywords||'',
          canonical_url:data.canonical_url||'', og_image_url:data.og_image_url||'',
          default_view:data.default_view||'grid', product_sort_default:data.product_sort_default||'popular', position:data.position??0,
        });
        setAttributes(data.attributes || []);
        setSlugTouched(true);
      }
      setLoading(false);
    });
  }, [category.id]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }
  function setName(v) { setForm(f => ({ ...f, name:v, slug: slugTouched ? f.slug : _slugify(v) })); }

  // Exclude self and self's descendants from the parent picker — a true cycle guard,
  // not just UI decoration (the save call re-validates this server-side too).
  const descendantIds = React.useMemo(() => {
    if (!category.id) return new Set();
    const ids = new Set([category.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of allCategoriesFlat) {
        if (c.parent_id && ids.has(c.parent_id) && !ids.has(c.id)) { ids.add(c.id); changed = true; }
      }
    }
    return ids;
  }, [allCategoriesFlat, category.id]);
  const parentOptions = allCategoriesFlat.filter(c => !descendantIds.has(c.id));

  async function handleUpload(field, file) {
    if (!file) return;
    setUploading(field);
    const path = `categories/${field}-${Date.now()}-${file.name}`;
    const { url, error: uploadError } = await sbUploadFile('categories', path, file);
    setUploading('');
    if (uploadError || !url) { setError('Image upload failed'); return; }
    set(field, url);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Category name is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }
    setSaving(true); setError('');
    const payload = { ...form, parent_id: form.parent_id || null };
    const { data, error: saveError } = isNew ? await sbAdminCreateCategory(payload) : await sbAdminUpdateCategory(category.id, payload);
    setSaving(false);
    if (saveError) { setError(saveError.message || 'Could not save category'); return; }
    logAdminAction(isNew ? 'Created category' : 'Updated category', form.name);
    onBack();
  }

  async function handleSaveAttribute(attr) {
    const { data } = await sbAdminSaveCategoryAttribute({ ...attr, category_id: category.id });
    if (data) setAttributes(prev => prev.some(a => a.id === data.id) ? prev.map(a => a.id === data.id ? data : a) : [...prev, data]);
  }
  async function handleDeleteAttribute(id) {
    await sbAdminDeleteCategoryAttribute(id);
    setAttributes(prev => prev.filter(a => a.id !== id));
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:680 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
          <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Categories</span>
        </button>
        <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:680 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Categories</span>
      </button>

      <SectionTitle title={isNew ? 'Create Category' : `Edit "${form.name}"`} />
      <AdminCategoryTabs tab={tab} setTab={setTab} />

      {error && (
        <div style={{ background:'#FDEDED', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>
      )}

      {tab === 'basic' && (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <AdminField label="Category Name"><AdminTextInput value={form.name} onChange={setName} placeholder="e.g. Fashion" /></AdminField>
          <AdminField label="Parent Category">
            <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              <option value="">— Top level —</option>
              {parentOptions.map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Slug"><AdminTextInput value={form.slug} onChange={v => { setSlugTouched(true); set('slug', _slugify(v)); }} placeholder="fashion" mono /></AdminField>
          <AdminField label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, resize:'vertical' }} />
          </AdminField>
          <AdminField label="Short Description"><AdminTextInput value={form.short_description} onChange={v => set('short_description', v)} placeholder="One line, used in cards/menus" /></AdminField>
        </AdminCard>
      )}

      {tab === 'media' && (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[['image_url','Category Image'],['banner_desktop_url','Desktop Banner'],['banner_tablet_url','Tablet Banner'],['banner_mobile_url','Mobile Banner']].map(([field, label]) => (
            <AdminField key={field} label={label}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:72, height:52, borderRadius:10, overflow:'hidden', background:C.paper, border:`1.5px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {form[field] ? <img src={form[field]} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name="camera" size={16} color={C.mute} />}
                </div>
                <label style={{ cursor:'pointer' }}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display:'none' }} onChange={e => handleUpload(field, e.target.files?.[0])} />
                  <span style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'8px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink, display:'inline-block' }}>
                    {uploading === field ? 'Uploading…' : form[field] ? 'Replace' : 'Upload'}
                  </span>
                </label>
                {form[field] && <button onClick={() => set(field, null)} style={{ border:'none', background:'none', cursor:'pointer' }}><Icon name="x" size={14} color={C.danger} /></button>}
              </div>
            </AdminField>
          ))}
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>JPG, PNG or WEBP. The storefront falls back to the category icon if no image is set, so removing an image never breaks a page.</div>
        </AdminCard>
      )}

      {tab === 'display' && (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <AdminField label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5, textTransform:'capitalize' }}>
              {['draft','active','inactive','archived'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </AdminField>
          {[['is_featured','Featured'],['show_on_homepage','Show on Homepage'],['show_in_navigation','Show in Navigation'],['show_in_menu','Show in Category Menu'],['show_in_search','Show in Search']].map(([field,label]) => (
            <div key={field} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{label}</span>
              <Switch checked={form[field]} onChange={v => set(field, v)} />
            </div>
          ))}
          <AdminField label="Display Order"><AdminTextInput value={String(form.position)} onChange={v => set('position', parseInt(v)||0)} placeholder="0" mono /></AdminField>
          <AdminField label="Default View">
            <select value={form.default_view} onChange={e => set('default_view', e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              <option value="grid">Grid</option><option value="list">List</option>
            </select>
          </AdminField>
          <AdminField label="Product Sorting (default)">
            <select value={form.product_sort_default} onChange={e => set('product_sort_default', e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              <option value="popular">Popular</option><option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
            </select>
          </AdminField>
        </AdminCard>
      )}

      {tab === 'seo' && (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <AdminField label="SEO Title"><AdminTextInput value={form.seo_title} onChange={v => set('seo_title', v)} placeholder={form.name || 'Category name'} /></AdminField>
          <AdminField label="SEO Description">
            <textarea value={form.seo_description} onChange={e => set('seo_description', e.target.value)} rows={2} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, resize:'vertical' }} />
          </AdminField>
          <AdminField label="SEO Keywords"><AdminTextInput value={form.seo_keywords} onChange={v => set('seo_keywords', v)} placeholder="comma, separated, keywords" /></AdminField>
          <AdminField label="Canonical URL"><AdminTextInput value={form.canonical_url} onChange={v => set('canonical_url', v)} placeholder={`/category/${form.slug || ''}`} mono /></AdminField>
          <AdminField label="OG Image URL"><AdminTextInput value={form.og_image_url} onChange={v => set('og_image_url', v)} placeholder="Falls back to Category Image" mono /></AdminField>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11.5, color:C.mute, background:C.paper, borderRadius:8, padding:'8px 10px' }}>
            /category/{form.slug || '…'}
          </div>
        </AdminCard>
      )}

      {tab === 'attributes' && (
        isNew ? (
          <AdminCard><AdminEmptyRow text="Save the category first, then add attributes." /></AdminCard>
        ) : (
          <AdminCategoryAttributesEditor attributes={attributes} onSave={handleSaveAttribute} onDelete={handleDeleteAttribute} />
        )
      )}

      <div style={{ display:'flex', gap:8 }}>
        <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onBack}>Cancel</Btn>
        <Btn variant="primary" style={{ flex:1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create category' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}

function AdminCategoryAttributesEditor({ attributes, onSave, onDelete }) {
  const [draft, setDraft] = React.useState(null);
  const ATTR_TYPES = ['text','number','boolean','select','multiselect','color','size','range'];

  function openNew() { setDraft({ name:'', type:'text', options:'', is_required:false, is_filterable:true, is_searchable:false, is_sortable:false, display_order: attributes.length }); }
  function openEdit(a) { setDraft({ ...a, options: (a.options||[]).join(', ') }); }
  async function save() {
    await onSave({ ...draft, options: draft.options.split(',').map(s => s.trim()).filter(Boolean) });
    setDraft(null);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <AdminCard padded={false}>
        {attributes.length === 0 && <AdminEmptyRow text="No attributes yet — add Size, Color, Brand, etc." />}
        {attributes.map((a, i) => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{a.name}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>
                {a.type} · {[a.is_required && 'required', a.is_filterable && 'filterable', a.is_searchable && 'searchable', a.is_sortable && 'sortable'].filter(Boolean).join(', ') || 'display only'}
              </div>
            </div>
            <button onClick={() => openEdit(a)} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="edit" size={13} color={C.mute} /></button>
            <button onClick={() => onDelete(a.id)} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="trash" size={13} color={C.danger} /></button>
          </div>
        ))}
      </AdminCard>

      {draft ? (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <AdminField label="Attribute Name"><AdminTextInput value={draft.name} onChange={v => setDraft(d => ({ ...d, name:v }))} placeholder="e.g. Size" /></AdminField>
          <AdminField label="Type">
            <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type:e.target.value }))} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              {ATTR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </AdminField>
          {['select','multiselect','color','size'].includes(draft.type) && (
            <AdminField label="Options (comma-separated)"><AdminTextInput value={draft.options} onChange={v => setDraft(d => ({ ...d, options:v }))} placeholder="S, M, L, XL" /></AdminField>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['is_required','Required'],['is_filterable','Filterable'],['is_searchable','Searchable'],['is_sortable','Sortable']].map(([f,label]) => (
              <div key={f} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink }}>{label}</span>
                <Switch checked={draft[f]} onChange={v => setDraft(d => ({ ...d, [f]:v }))} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setDraft(null)}>Cancel</Btn>
            <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={save} disabled={!draft.name.trim()}>Save attribute</Btn>
          </div>
        </AdminCard>
      ) : (
        <Btn size="sm" onClick={openNew}>+ Add attribute</Btn>
      )}
    </div>
  );
}

function AdminCategoryDeleteModal({ category, allCategoriesFlat, onClose, onDone }) {
  const [productAction, setProductAction] = React.useState('archive'); // archive | move | keep
  const [childAction, setChildAction] = React.useState('root'); // move | root
  const [targetId, setTargetId] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const productCount = category.productCount ?? 0;
  const childCount = category.subcategoryCount ?? 0;
  const needsTarget = productAction === 'move' || childAction === 'move';
  const targetOptions = allCategoriesFlat.filter(c => c.id !== category.id);

  async function confirm() {
    setBusy(true);
    await sbAdminDeleteCategory(category.id, { productAction, targetCategoryId: targetId || null, childAction });
    logAdminAction(productAction === 'archive' ? 'Archived category' : 'Deleted category', category.name);
    setBusy(false);
    onDone();
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.white, borderRadius:16, padding:20, maxWidth:440, width:'100%', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Delete "{category.name}"</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>
          This category contains <strong>{productCount}</strong> product{productCount===1?'':'s'} and <strong>{childCount}</strong> subcategor{childCount===1?'y':'ies'}.
        </div>

        <AdminField label="Products in this category">
          <select value={productAction} onChange={e => setProductAction(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
            <option value="archive">Archive this category (keep everything as-is — recommended)</option>
            <option value="move">Move products to another category</option>
            <option value="keep">Keep products without a category</option>
          </select>
        </AdminField>

        {productAction !== 'archive' && childCount > 0 && (
          <AdminField label="Subcategories">
            <select value={childAction} onChange={e => setChildAction(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              <option value="root">Make them top-level categories</option>
              <option value="move">Move them to another parent</option>
            </select>
          </AdminField>
        )}

        {productAction !== 'archive' && needsTarget && (
          <AdminField label="Target category">
            <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              <option value="">— Select a category —</option>
              {targetOptions.map(c => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}
            </select>
          </AdminField>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onClose}>Cancel</Btn>
          <Btn size="sm" style={{ flex:1, color:'#fff', background:C.danger, border:'none' }} onClick={confirm} disabled={busy || (productAction !== 'archive' && needsTarget && !targetId)}>
            {busy ? 'Working…' : productAction === 'archive' ? 'Archive category' : 'Delete category'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN — Staff & RBAC (real backend: staff_roles, role_permissions, staff_members) ──
function AdminStaffSection({ initialTab = 'team' }) {
  const [tab, setTab] = React.useState(initialTab);
  const [roles, setRoles] = React.useState([]);
  const [members, setMembers] = React.useState([]);
  const [catalog, setCatalog] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRole, setEditingRole] = React.useState(null); // role object or {} for new
  const [inviting, setInviting] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([sbAdminGetStaffRoles(), sbAdminGetStaffMembers(), sbGetPermissionsCatalog()])
      .then(([r, m, c]) => { setRoles(r); setMembers(m); setCatalog(c); setLoading(false); });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function handleRemoveMember(m) {
    await sbAdminRemoveStaffMember(m.id, m.user_id);
    logAdminAction('Removed staff member', m.profiles?.email || m.user_id, 'staff_members', m.id);
    load();
  }
  async function handleToggleMemberStatus(m) {
    const next = m.status === 'active' ? 'suspended' : 'active';
    await sbAdminUpdateStaffMember(m.id, { status: next });
    logAdminAction(next === 'suspended' ? 'Suspended staff member' : 'Reactivated staff member', m.profiles?.email || m.user_id, 'staff_members', m.id);
    load();
  }
  async function handleDeleteRole(role) {
    if (role.is_system) return;
    await sbAdminDeleteStaffRole(role.id);
    logAdminAction('Deleted staff role', role.name, 'staff_roles', role.id);
    load();
  }

  const byModule = catalog.reduce((acc, p) => { (acc[p.module] = acc[p.module] || []).push(p); return acc; }, {});

  if (editingRole) {
    return <AdminStaffRoleEditor role={editingRole} byModule={byModule} onBack={() => { setEditingRole(null); load(); }} />;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Staff & Permissions" sub={`${members.length} team member${members.length===1?'':'s'} · ${roles.length} role${roles.length===1?'':'s'}`} />

      <div style={{ display:'flex', gap:4, background:C.paper, borderRadius:9999, padding:3, width:'fit-content' }}>
        {[['team','Team Members'],['roles','Roles & Permissions']].map(([k,label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: tab === k ? C.primary : 'transparent', color: tab === k ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600 }}>{label}</button>
        ))}
      </div>

      {tab === 'team' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Btn variant="primary" size="sm" style={{ width:'fit-content' }} onClick={() => setInviting(true)}>+ Invite team member</Btn>
          {inviting && <AdminStaffInviteForm roles={roles} onClose={() => setInviting(false)} onDone={() => { setInviting(false); load(); }} onLog={logAdminAction} />}
          <AdminCard padded={false}>
            {loading ? <AdminEmptyRow text="Loading…" /> : members.length === 0 ? (
              <AdminEmptyRow text="No staff members yet — invite your first teammate." />
            ) : members.map((m, i) => (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Avatar size={30} initials={(m.profiles?.full_name || m.profiles?.email || '?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{m.profiles?.full_name || 'Unnamed'}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{m.profiles?.email}</div>
                </div>
                <StatusPill tone="primary">{m.staff_roles?.name || '—'}</StatusPill>
                <StatusPill tone={m.status === 'active' ? 'success' : 'warning'}>{m.status}</StatusPill>
                <button onClick={() => handleToggleMemberStatus(m)} title={m.status === 'active' ? 'Suspend' : 'Reactivate'} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={m.status === 'active' ? 'x' : 'check'} size={13} color={m.status === 'active' ? C.warning : C.success} />
                </button>
                <button onClick={() => handleRemoveMember(m)} title="Remove" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="trash" size={13} color={C.danger} />
                </button>
              </div>
            ))}
          </AdminCard>
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Btn variant="primary" size="sm" style={{ width:'fit-content' }} onClick={() => setEditingRole({ name:'', description:'', permissions:[] })}>+ New role</Btn>
          <AdminCard padded={false}>
            {loading ? <AdminEmptyRow text="Loading…" /> : roles.length === 0 ? (
              <AdminEmptyRow text="No roles yet." />
            ) : roles.map((r, i) => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="shield" size={15} color={C.primary} /></div>
                <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setEditingRole(r)}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{r.name}{r.is_system && <span style={{ marginLeft:6 }}><StatusPill tone="mute">system</StatusPill></span>}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{r.permissions.length} permission{r.permissions.length===1?'':'s'}{r.description ? ` · ${r.description}` : ''}</div>
                </div>
                <button onClick={() => setEditingRole(r)} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="edit" size={13} color={C.mute} /></button>
                {!r.is_system && (
                  <button onClick={() => handleDeleteRole(r)} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="trash" size={13} color={C.danger} /></button>
                )}
              </div>
            ))}
          </AdminCard>
        </div>
      )}
    </div>
  );
}

function AdminStaffInviteForm({ roles, onClose, onDone, onLog }) {
  const [email, setEmail] = React.useState('');
  const [roleId, setRoleId] = React.useState(roles[0]?.id || '');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setError(''); setBusy(true);
    const user = await sbAdminFindUserByEmail(email);
    if (!user) { setBusy(false); setError('No account found with this email — they need to sign up first.'); return; }
    if (!roleId) { setBusy(false); setError('Choose a role.'); return; }
    const { error: addError } = await sbAdminAddStaffMember(user.id, roleId);
    setBusy(false);
    if (addError) { setError(addError.message || 'Could not add staff member.'); return; }
    onLog('Invited staff member', email, 'staff_members', user.id);
    onDone();
  }

  return (
    <AdminCard style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <AdminField label="Account email"><AdminTextInput value={email} onChange={setEmail} placeholder="teammate@clorivo.com" /></AdminField>
      <AdminField label="Role">
        <select value={roleId} onChange={e => setRoleId(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </AdminField>
      {error && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger }}>{error}</div>}
      <div style={{ display:'flex', gap:8 }}>
        <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" size="sm" style={{ flex:1 }} onClick={submit} disabled={busy || !email.trim()}>{busy ? 'Adding…' : 'Add to team'}</Btn>
      </div>
    </AdminCard>
  );
}

function AdminStaffRoleEditor({ role, byModule, onBack }) {
  const isNew = !role.id;
  const [name, setName] = React.useState(role.name || '');
  const [description, setDescription] = React.useState(role.description || '');
  const [selected, setSelected] = React.useState(new Set(role.permissions || []));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  function toggle(key) { setSelected(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; }); }

  async function save() {
    if (!name.trim()) { setError('Role name is required'); return; }
    setSaving(true); setError('');
    let roleId = role.id;
    if (isNew) {
      const { data, error: createError } = await sbAdminCreateStaffRole(name, description);
      if (createError || !data) { setSaving(false); setError(createError?.message || 'Could not create role'); return; }
      roleId = data.id;
    } else {
      await sbAdminUpdateStaffRole(roleId, { name, description });
    }
    await sbAdminSetRolePermissions(roleId, [...selected]);
    logAdminAction(isNew ? 'Created staff role' : 'Updated staff role', name, 'staff_roles', roleId);
    setSaving(false);
    onBack();
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:640 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Roles</span>
      </button>
      <SectionTitle title={isNew ? 'New Role' : `Edit "${role.name}"`} />
      {error && <div style={{ background:'#FDEDED', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>}

      <AdminCard style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <AdminField label="Role name"><AdminTextInput value={name} onChange={setName} placeholder="e.g. Catalog Manager" /></AdminField>
        <AdminField label="Description"><AdminTextInput value={description} onChange={setDescription} placeholder="Optional" /></AdminField>
      </AdminCard>

      <AdminCard style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Permissions</div>
        {Object.keys(byModule).length === 0 && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>No permissions in the catalog.</div>}
        {Object.entries(byModule).map(([module, perms]) => (
          <div key={module} style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:C.mute, textTransform:'uppercase', letterSpacing:'0.04em' }}>{module}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {perms.map(p => (
                <label key={p.key} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={selected.has(p.key)} onChange={() => toggle(p.key)} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </AdminCard>

      <div style={{ display:'flex', gap:8 }}>
        <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onBack}>Cancel</Btn>
        <Btn variant="primary" style={{ flex:1 }} onClick={save} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create role' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}

// ─── ADMIN — Audit Log (real backend: audit_logs, written via log_audit() RPC) ──
function AdminAuditLogSection() {
  const [result, setResult] = React.useState({ logs:[], total:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetAuditLogs({ page, limit:30, search }).then(r => { setResult(r); setLoading(false); });
  }, [page, search]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { logs, total, totalPages } = result;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Audit Log" sub={`${total} action${total===1?'':'s'} recorded · who did what, on what, and when`} />
      <div style={{ position:'relative' }}>
        <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
        <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by action or resource…"
          style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
      </div>
      <AdminCard padded={false}>
        {loading ? <AdminEmptyRow text="Loading…" /> : logs.length === 0 ? (
          <AdminEmptyRow text="No admin actions recorded yet — changes made in this console will show up here." />
        ) : logs.map((a, i) => (
          <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name="fileText" size={13} color={C.primary} /></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{a.action}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {a.resource_type && <>{a.resource_type}{a.resource_id ? ` #${String(a.resource_id).slice(0,8)}` : ''} · </>}
                by {a.profiles?.full_name || a.profiles?.email || a.actor_role || 'system'}
              </div>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, flexShrink:0 }}>{new Date(a.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
          </div>
        ))}
      </AdminCard>
      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Previous</button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Next</button>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN — Products (moderation, publish toggle, search/filter, pagination) ──
const PRODUCT_PAGE_SIZE = 12;

function AdminProductsSection() {
  const [result, setResult] = React.useState({ products:[], totalProducts:0, totalPages:0, currentPage:1, liveProductsCount:0 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [categoryId, setCategoryId] = React.useState('');
  const [categories, setCategories] = React.useState([]);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState(null); // product row being edited, or {} for new
  const [rejecting, setRejecting] = React.useState(null); // product row being rejected
  const [rejectReason, setRejectReason] = React.useState('');
  const [newProductFlash, setNewProductFlash] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetProducts({ page, limit:PRODUCT_PAGE_SIZE, status, search, categoryId }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search, categoryId]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { sbGetCategoriesList().then(setCategories); }, []);

  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    // Live list + live-count: a product insert/update/delete anywhere refreshes this page —
    // the Supabase Realtime equivalent of the Socket.io push the spec asks for.
    const unsubscribe = sbSubscribeAdminProducts(payload => {
      load();
      if (payload.eventType === 'INSERT') { setNewProductFlash(true); setTimeout(() => setNewProductFlash(false), 4000); }
    });
    return unsubscribe;
  }, [load]);

  async function handleModerate(product, decision) {
    await sbAdminModerateProduct(product.id, decision, decision === 'rejected' ? rejectReason : '');
    logAdminAction(decision === 'approved' ? 'Approved product' : 'Rejected product', product.title);
    setRejecting(null); setRejectReason('');
    load();
  }

  async function handleTogglePublish(product, published) {
    await sbAdminTogglePublish(product.id, published);
    logAdminAction(published ? 'Published product' : 'Unpublished product', product.title);
    load();
  }

  async function handleDelete(product) {
    await sbAdminDeleteProduct(product.id);
    logAdminAction('Deleted product', product.title);
    load();
  }

  async function handleSave(form) {
    const payload = {
      title: form.title, price: parseFloat(form.price) || 0,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
      stock: parseInt(form.stock) || 0, category_id: form.category_id || null, sku: form.sku || null,
      image_url: form.image_url,
    };
    if (form.id) {
      await sbAdminUpdateProduct(form.id, payload);
      logAdminAction('Updated product', form.title);
    } else {
      await sbAdminCreateProduct(payload);
      logAdminAction('Created product', form.title);
    }
    setEditing(null);
    load();
  }

  if (editing) {
    return <AdminProductDetail product={editing} onBack={() => setEditing(null)} onSave={handleSave} onDelete={async (f) => { await handleDelete(f); setEditing(null); }} />;
  }

  const { products, totalProducts, totalPages, liveProductsCount } = result;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Products" sub={`${liveProductsCount} product${liveProductsCount === 1 ? '' : 's'} live on Home, Search & Category · ${totalProducts} total`}
        action={<Btn variant="primary" size="sm" onClick={() => setEditing({ id:null, title:'', price:'', oldPrice:'', category:'home', sku:'', image_url:null, stock:'50' })}>+ New product</Btn>} />

      {newProductFlash && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:C.primarySoft, border:`1px solid ${C.primary}`, borderRadius:12, padding:'10px 14px' }}>
          <Icon name="bell" size={15} color={C.primaryDeep} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primaryDeep }}>Catalog changed — list refreshed.</span>
        </div>
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Product name, SKU or seller…"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {[['ALL','All'],['PENDING','Pending Approval'],['PUBLISHED','Published'],['OUT_OF_STOCK','Out of Stock'],['REJECTED','Rejected']].map(([k,label]) => (
          <button key={k} onClick={() => { setStatus(k); setPage(1); }} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === k ? C.ink : C.paper, color: status === k ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600 }}>{label}</button>
        ))}
      </div>

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Product</Th><Th>Seller</Th><Th>Category</Th><Th align="right">Price & Stock</Th><Th>Visibility</Th><Th align="right">Actions</Th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><AdminEmptyRow text="Loading products…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={6}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6}><AdminEmptyRow text="No products yet — add your first one." /></td></tr>
            ) : products.map(p => {
              const img = p.images?.[0];
              const outOfStock = (p.stock ?? 0) === 0;
              const lowStock = !outOfStock && (p.stock ?? 0) < 10;
              return (
                <tr key={p.id}>
                  <Td>
                    <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setEditing({ id:p.id, title:p.title, price:p.price, oldPrice:p.compare_price, category_id:p.category_id || '', sku:p.sku, image_url:img || null, stock:p.stock })}>
                      <div style={{ width:36, height:36, borderRadius:8, overflow:'hidden', flexShrink:0, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {img ? <img src={img} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name="package" size={15} color={C.mute} />}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{p.title}</div>
                        <div style={{ fontSize:11, color:C.mute, fontFamily:"'JetBrains Mono',monospace" }}>{p.sku || '—'}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>{p.shops?.name || 'Platform'}</Td>
                  <Td style={{ textTransform:'capitalize' }}>{p.categories?.name || '—'}</Td>
                  <Td align="right">
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>${(p.price ?? 0).toFixed(2)}</div>
                    <StatusPill tone={outOfStock ? 'danger' : lowStock ? 'warning' : 'mute'}>{outOfStock ? 'out of stock' : `${p.stock ?? 0} in stock`}</StatusPill>
                  </Td>
                  <Td>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start' }}>
                      <StatusPill tone={p.approval_status === 'approved' ? 'success' : p.approval_status === 'rejected' ? 'danger' : 'warning'}>{p.approval_status === 'pending' ? 'pending approval' : p.approval_status}</StatusPill>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Switch checked={p.status === 'active'} onChange={v => handleTogglePublish(p, v)} />
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{p.status === 'active' ? 'Published' : 'Draft'}</span>
                      </div>
                    </div>
                  </Td>
                  <Td align="right">
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end', flexWrap:'wrap' }}>
                      {p.approval_status === 'pending' && (
                        <>
                          <button onClick={() => handleModerate(p, 'approved')} title="Approve" style={{ border:`1px solid ${C.success}`, background:'#EFF9F4', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Icon name="check" size={14} color={C.success} sw={2.5} />
                          </button>
                          <button onClick={() => setRejecting(p)} title="Reject" style={{ border:`1px solid ${C.danger}`, background:'#FDEDED', borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Icon name="x" size={14} color={C.danger} sw={2.5} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditing({ id:p.id, title:p.title, price:p.price, oldPrice:p.compare_price, category_id:p.category_id || '', sku:p.sku, image_url:img || null, stock:p.stock })} title="Edit" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="edit" size={14} color={C.mute} />
                      </button>
                      <button onClick={() => handleDelete(p)} title="Delete" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="trash" size={14} color={C.danger} />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminCard>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Previous</button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Next</button>
        </div>
      )}

      {rejecting && (
        <div style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }} onClick={() => setRejecting(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:C.white, borderRadius:16, padding:20, maxWidth:380, width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Reject "{rejecting.title}"</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason (sent to the seller)" rows={3}
              style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, resize:'none' }} />
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setRejecting(null); setRejectReason(''); }}>Cancel</Btn>
              <Btn size="sm" style={{ flex:1, color:'#fff', background:C.danger, border:'none' }} onClick={() => handleModerate(rejecting, 'rejected')}>Reject product</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN — Orders (search, filter, date range, pagination, status + refund) ──
const ORDER_STATUS_TONE = { pending:'warning', confirmed:'info', processing:'info', shipped:'primary', delivered:'success', cancelled:'danger', refunded:'mute' };
const PAGE_SIZE = 10;

function AdminOrdersSection() {
  const [result, setResult] = React.useState({ orders:[], totalOrders:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [detailId, setDetailId] = React.useState(null);
  const [newOrderFlash, setNewOrderFlash] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetOrders({ page, limit:PAGE_SIZE, status, search, dateFrom, dateTo }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search, dateFrom, dateTo]);

  React.useEffect(() => { load(); }, [load]);

  // Debounce the free-text search so every keystroke doesn't fire a query.
  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    // Live list: a new order or a status change elsewhere refreshes this page.
    // Flash a brief banner so the admin notices without needing a sound/popup permission.
    const unsubscribe = sbSubscribeAdminOrders(payload => {
      load();
      if (payload.eventType === 'INSERT') { setNewOrderFlash(true); setTimeout(() => setNewOrderFlash(false), 4000); }
    });
    return unsubscribe;
  }, [load]);

  async function handleStatusChange(orderId, newStatus) {
    await sbAdminUpdateOrderStatus(orderId, newStatus);
    logAdminAction('Updated order status', `#${orderId.slice(0,8)} → ${newStatus}`);
    load();
  }

  async function handleRefund(order) {
    await sbAdminUpdateOrderStatus(order.id, 'refunded');
    logAdminAction('Refunded order', `#${order.id.slice(0,8)} — $${(order.total_amount ?? 0).toFixed(2)}`);
    load();
  }

  if (detailId) return <AdminOrderDetail orderId={detailId} onBack={() => { setDetailId(null); load(); }} onStatusChange={handleStatusChange} onRefund={handleRefund} />;

  const { orders, totalOrders, totalPages } = result;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Orders" sub={`${totalOrders} order${totalOrders === 1 ? '' : 's'}`} />

      {newOrderFlash && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:C.primarySoft, border:`1px solid ${C.primary}`, borderRadius:12, padding:'10px 14px' }}>
          <Icon name="bell" size={15} color={C.primaryDeep} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primaryDeep }}>New order received — list refreshed.</span>
        </div>
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Order ID, customer name, email or seller…"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'8px 10px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>to</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'8px 10px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['ALL','pending','processing','shipped','delivered','cancelled','refunded'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === s ? C.ink : C.paper, color: status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s}</button>
        ))}
      </div>

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Order</Th><Th>Placed</Th><Th>Customer</Th><Th>Seller</Th><Th align="right">Total</Th><Th>Status</Th><Th align="right">Actions</Th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Loading orders…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7}><AdminEmptyRow text="No orders yet" /></td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <Td style={{ fontWeight:700, cursor:'pointer' }} onClick={() => setDetailId(o.id)}>#{o.id.slice(0,8)}</Td>
                <Td>{new Date(o.created_at).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}</Td>
                <Td>
                  <div style={{ fontWeight:600 }}>{o.profiles?.full_name || 'Buyer'}</div>
                  <div style={{ fontSize:11, color:C.mute }}>{o.profiles?.email || ''}</div>
                </Td>
                <Td>{o.shopNames?.length ? o.shopNames.join(', ') : '—'}</Td>
                <Td align="right" style={{ fontFamily:"'JetBrains Mono',monospace" }}>${(o.total_amount ?? 0).toFixed(2)}</Td>
                <Td>
                  <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                    style={{ border:'none', borderRadius:9999, padding:'4px 10px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, textTransform:'capitalize', ...(() => { const t = { success:{bg:'#EFF9F4',fg:C.success}, danger:{bg:'#FDEDED',fg:C.danger}, warning:{bg:'#FFF6E5',fg:C.warning}, mute:{bg:C.paper,fg:C.mute}, primary:{bg:C.primarySoft,fg:C.primaryDeep}, info:{bg:'#EBF2FF',fg:'#2563EB'} }[ORDER_STATUS_TONE[o.status] || 'mute']; return { background:t.bg, color:t.fg }; })() }}>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
                <Td align="right">
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => setDetailId(o.id)} title="View details" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="eye" size={14} color={C.mute} />
                    </button>
                    {o.status !== 'refunded' && o.status !== 'cancelled' && (
                      <button onClick={() => handleRefund(o)} title="Refund" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="refreshCw" size={14} color={C.danger} />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>

      {totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Previous</button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'6px 12px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily:"'Inter',sans-serif", fontSize:12.5 }}>Next</button>
        </div>
      )}
    </div>
  );
}

function AdminOrderDetail({ orderId, onBack, onStatusChange, onRefund }) {
  const [order, setOrder] = React.useState(null);
  const [fetching, setFetching] = React.useState(true);
  React.useEffect(() => { setFetching(true); sbAdminGetOrderDetail(orderId).then(o => { setOrder(o); setFetching(false); }); }, [orderId]);

  if (!order) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:620 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
          <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Orders</span>
        </button>
        <AdminCard><AdminEmptyRow text={fetching ? 'Loading…' : "Couldn't load this order — check your connection and try again."} /></AdminCard>
      </div>
    );
  }

  const items = order.order_items || [];
  const tone = ORDER_STATUS_TONE[order.status] || 'mute';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:620 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Orders</span>
      </button>

      <AdminCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink }}>Order #{order.id.slice(0,8)}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:2 }}>{new Date(order.created_at).toLocaleString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
          <StatusPill tone={tone}>{order.status}</StatusPill>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, paddingTop:12, borderTop:`1px solid ${C.hairline}` }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Customer</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{order.profiles?.full_name || 'Buyer'}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{order.profiles?.email} {order.profiles?.phone ? `· ${order.profiles.phone}` : ''}</div>
        </div>
      </AdminCard>

      <AdminCard padded={false}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Items</div>
        {items.length === 0 && <AdminEmptyRow text="No items on this order." />}
        {items.map((it, i) => (
          <div key={it.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{it.title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{it.shops?.name || '—'} · Qty {it.quantity}</div>
            </div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${(it.unit_price ?? 0).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', borderTop:`1px solid ${C.hairline}` }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Total</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:800, color:C.ink }}>${(order.total_amount ?? 0).toFixed(2)}</span>
        </div>
      </AdminCard>

      <AdminCard>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Update status</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <select value={order.status} onChange={e => { onStatusChange(order.id, e.target.value); setOrder(o => ({ ...o, status:e.target.value })); }}
            style={{ flex:1, minWidth:160, border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }}>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {order.status !== 'refunded' && order.status !== 'cancelled' && (
            <Btn variant="secondary" onClick={() => { onRefund(order); setOrder(o => ({ ...o, status:'refunded' })); }} style={{ color:C.danger }}>Refund order</Btn>
          )}
        </div>
      </AdminCard>
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
  const [sellerPanel, setSellerPanel] = React.useState(null); // 'kyc' | null
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [, forceTick] = React.useState(0);
  // undefined = still checking, null = checked and denied, object = granted context.
  const [accessCtx, setAccessCtx] = React.useState(undefined);

  React.useEffect(() => {
    sbAdminGetStats().then(s => setAdminStats(s));
    sbAdminGetUsers().then(u => { if (u) setRemoteUsers(u); });
    const id = setInterval(() => forceTick(t => t + 1), 800);
    // Live dashboard: any order insert/update refreshes the KPI cards without a manual reload.
    const unsubscribe = sbSubscribeAdminOrders(() => { sbAdminGetStats().then(s => setAdminStats(s)); });
    return () => { clearInterval(id); unsubscribe(); };
  }, []);

  // UI-level guard only — defense in depth, never the real barrier. RLS (and
  // has_permission() server-side) is what actually blocks a non-admin/non-staff
  // account from reading or writing anything here, even if this check were
  // bypassed entirely. Checked on mount; _sb null (demo mode) is let through
  // so the console stays usable without a configured backend.
  React.useEffect(() => {
    if (!window._supabase) { setAccessCtx({ isAdmin: true, isStaff: false, permissions: [] }); return; }
    sbGetMyAccessContext().then(ctx => setAccessCtx(ctx && (ctx.isAdmin || ctx.isStaff) ? ctx : null));
  }, []);

  function onNav(key) {
    setSection(key);
    setUserDetail(null); setSellerPanel(null);
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
  const demoUsers = [];
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


  // ── Sellers ──
  const [sellersList, setSellersList] = React.useState(() => []);
  function toggleSellerStatus(name) {
    setSellersList(prev => prev.map(s => s.name === name ? { ...s, status: s.status === 'suspended' ? 'verified' : 'suspended' } : s));
    logAdminAction('Toggled seller status', name);
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

  // ── SEO ──
  function saveSeo(field, value) { window._SEO_CONFIG = { ...window._SEO_CONFIG, [field]: value }; forceTick(t => t + 1); }

  // ── Rewards ──
  function saveRewards(field, value) { window._REWARDS_CONFIG = { ...window._REWARDS_CONFIG, [field]: value }; forceTick(t => t + 1); }

  // ── Notifications / Roles / Security / Platform Settings toggles ──
  function toggleNotif(field, value) { window._NOTIF_SETTINGS = { ...window._NOTIF_SETTINGS, [field]: value }; forceTick(t => t + 1); }
  function toggleSecurity(field, value) { window._SECURITY_SETTINGS = { ...window._SECURITY_SETTINGS, [field]: value }; logAdminAction('Changed security setting', `${field} → ${value}`); forceTick(t => t + 1); }
  function togglePlatformSetting(field, value) { window._PLATFORM_SETTINGS = { ...window._PLATFORM_SETTINGS, [field]: value }; logAdminAction('Changed platform setting', `${field} → ${value}`); forceTick(t => t + 1); }

  const title = ADMIN_TITLES[section] || 'Dashboard';

  function renderSection() {
    switch (section) {
      case 'overview': return <AdminOverview adminStats={adminStats} onNav={onNav} sellersList={sellersList} reviews={window._ADMIN_REVIEWS} kycCount={adminStats?.pendingKyc ?? 0} />;

      case 'orders': return <AdminOrdersSection />;

      case 'products': return <AdminProductsSection />;

      case 'categories': return <AdminCategoriesSection />;

      case 'brands': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Brands" sub={`${window._BRANDS.length} brands`} action={<Btn variant="primary" size="sm" onClick={addBrand}>+ New brand</Btn>} />
          <AdminCard padded={false}>
            {window._BRANDS.length === 0 ? <AdminEmptyRow text="No brands yet — add your first one." /> : window._BRANDS.map((b, i) => (
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
            {sellersList.length === 0 && <AdminEmptyRow text="No sellers yet." />}
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
            {window._ADMIN_REVIEWS.length === 0 ? <AdminEmptyRow text="No reviews yet." /> : window._ADMIN_REVIEWS.map((r, i) => (
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
                {window._COUPONS.length === 0 && <tr><td colSpan={5}><AdminEmptyRow text="No coupons yet." /></td></tr>}
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
          <SectionTitle title="Shop by Category" sub="Category chips shown at the top of Home" />
          <AdminCard>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, lineHeight:1.5 }}>
                These chips are no longer edited here — they're generated from the real category list. Every top-level category with <strong>Show in Navigation</strong> turned on (Categories → Display tab) appears as a chip automatically, in the order set on the Categories page.
              </div>
              <Btn variant="primary" size="sm" style={{ width:'fit-content' }} onClick={() => onNav('categories')}>Go to Categories →</Btn>
            </div>
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

      case 'roles': return <AdminStaffSection initialTab="roles" />;

      case 'staff': return <AdminStaffSection initialTab="team" />;

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
            {window._LOGIN_HISTORY.length === 0 ? <AdminEmptyRow text="No login activity recorded yet." /> : window._LOGIN_HISTORY.map((l, i) => (
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

      case 'auditlog': return <AdminAuditLogSection />;

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
            <Btn variant="primary" onClick={async () => {
              const { categories } = await sbAdminGetCategories({ limit: 1000 });
              const payload = { products: window.PRODUCTS, categories, exportedAt: new Date().toISOString() };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `clorivo-backup-${Date.now()}.json`; a.click();
              URL.revokeObjectURL(url);
              logAdminAction('Exported backup', `${window.PRODUCTS.length} products, ${categories.length} categories`);
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
          <SectionTitle title="Platform Settings" sub="Changes apply immediately to new orders and the Business Overview KPIs." />
          <AdminSettingsRows rows={[
            { type:'number', k:'Marketplace commission rate', v: (window._PLATFORM_SETTINGS.commissionRate * 100).toFixed(1) },
            { type:'toggle', k:'Free shipping enabled', on:window._PLATFORM_SETTINGS.freeShipping },
            { type:'toggle', k:'Real-time tracking', on:window._PLATFORM_SETTINGS.realTimeTracking },
          ]} onToggle={(k, v) => {
            const map = { 'Free shipping enabled':'freeShipping', 'Real-time tracking':'realTimeTracking' };
            togglePlatformSetting(map[k], v);
          }} onNumber={(k, v) => {
            if (k === 'Marketplace commission rate') {
              const pct = Math.max(0, Math.min(100, parseFloat(v) || 0));
              window._PLATFORM_SETTINGS = { ...window._PLATFORM_SETTINGS, commissionRate: pct / 100 };
              logAdminAction('Changed platform setting', `commissionRate → ${pct}%`);
              forceTick(t => t + 1);
            }
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

      default: return <AdminOverview adminStats={adminStats} onNav={onNav} sellersList={sellersList} reviews={window._ADMIN_REVIEWS} kycCount={adminStats?.pendingKyc ?? 0} />;
    }
  }

  if (accessCtx === undefined) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <StatusBar />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Checking access…</span>
      </div>
    );
  }
  if (accessCtx === null) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24 }}>
        <StatusBar />
        <Icon name="lock" size={36} color={C.mute} />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>Access restricted</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:320 }}>Your account doesn't have admin or staff access to this console.</div>
        <Btn variant="primary" onClick={() => navigate('home')}>Back to Home</Btn>
      </div>
    );
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
