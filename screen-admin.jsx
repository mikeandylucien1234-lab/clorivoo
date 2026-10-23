// screen-admin.jsx — Admin Console: full desktop business dashboard

// ─── SHARED ADMIN STATE (session-scoped, mirrors window._PROFILE pattern) ──
window._ADMIN_AUDIT_LOG   = window._ADMIN_AUDIT_LOG   || [];
window._REWARDS_CONFIG     = window._REWARDS_CONFIG    || { pointsPerDollar:1, referralBonus:10, minRedeem:500 };
window._ANNOUNCEMENT       = window._ANNOUNCEMENT       || { enabled:false, text:'', link:'' };
window._HOME_SECTIONS      = window._HOME_SECTIONS      || { hero:true, shops:true, deals:true, categories:true, featured:true, videos:true };
window._LOGIN_HISTORY      = window._LOGIN_HISTORY      || [];
window._SECURITY_SETTINGS  = window._SECURITY_SETTINGS  || { twoFactor:true, biometric:true, loginAlerts:false };
// System Notifications' 5 admin preferences used to live here
// (window._NOTIF_SETTINGS) — now persisted for real per-admin in the
// notification_preferences table; see AdminNotifSection.

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
    { key:'payments',   label:'Payments',    icon:'creditCard' },
    { key:'refunds',    label:'Refunds',     icon:'refreshCw' },
    { key:'commissions',label:'Commissions', icon:'dollarSign' },
    { key:'wallet',     label:'Wallet',      icon:'wallet' },
    { key:'shipping',   label:'Shipping',    icon:'truck' },
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
    { key:'trustsafety',    label:'Trust & Safety', icon:'shield' },
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
const PRODUCT_CONDITIONS = [
  { value:'new', label:'New' },
  { value:'open_box', label:'Open Box' },
  { value:'refurbished', label:'Refurbished' },
  { value:'used_like_new', label:'Used – Like New' },
  { value:'used_good', label:'Used – Good' },
  { value:'used_fair', label:'Used – Fair' },
];

function AdminProductDetail({ product, onBack, onSave, onDelete }) {
  const [form, setForm] = React.useState({
    id: product.id, title: product.title || '', price: String(product.price ?? ''),
    oldPrice: product.oldPrice != null ? String(product.oldPrice) : '',
    category_id: product.category_id || '', brand_id: product.brand_id || '', sku: product.sku || '', image_url: product.image_url || null,
    stock: product.stock != null ? String(product.stock) : '50',
    condition: product.condition || '',
    authenticity_statement: product.authenticity_statement || '',
    authenticity_proof_paths: product.authenticity_proof_paths || [],
  });
  const [categories, setCategories] = React.useState([]);
  const [brands, setBrands] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [proofUrls, setProofUrls] = React.useState({}); // path -> signed url | null (loading)
  const fileRef = React.useRef(null);
  const isNew = !product.id;
  const selectedBrand = brands.find(b => b.id === form.brand_id) || null;
  const riskLevel = selectedBrand?.risk_level || 'low';
  const needsAuthenticityStatement = riskLevel === 'medium' || riskLevel === 'high';
  // Condition is required for brand-new products (mirrors the DB trigger,
  // which only enforces it on INSERT) but never blocks saving an edit to
  // an existing product that predates this field — that would "break" old
  // listings exactly as the spec says not to.
  const canSave = form.title.trim() && parseFloat(form.price) > 0 && (isNew ? !!form.condition : true)
    && (!needsAuthenticityStatement || form.authenticity_statement.trim());

  async function revealProof(path) {
    setProofUrls(u => ({ ...u, [path]: null }));
    const url = await sbAdminGetAuthenticityProofUrl(path);
    setProofUrls(u => ({ ...u, [path]: url }));
  }

  // Variants only manageable once the product actually exists (has an
  // id) — same reasoning as the seller form, just without the batching:
  // every change here is its own immediate, persisted write.
  const [variants, setVariants] = React.useState([]);
  const [newVariant, setNewVariant] = React.useState({ size:'', color:'', sku:'', stock:'0', price_override:'', low_stock_threshold:'' });
  const [variantError, setVariantError] = React.useState('');
  const loadVariants = React.useCallback(() => {
    if (!product.id) return;
    sbGetProductVariants(product.id).then(setVariants);
  }, [product.id]);
  React.useEffect(() => { loadVariants(); }, [loadVariants]);

  async function saveVariantField(variant, field, value) {
    const payload = { ...variant, [field]: value };
    const { error } = await sbUpsertProductVariant(payload);
    if (error) { setVariantError(error.message); return; }
    setVariantError('');
    loadVariants();
  }
  async function addVariant() {
    if (!newVariant.sku.trim()) { setVariantError('SKU is required.'); return; }
    if (!newVariant.size.trim() && !newVariant.color.trim()) { setVariantError('Enter at least a size or a color.'); return; }
    const { error } = await sbUpsertProductVariant({
      product_id: product.id, sku: newVariant.sku.trim(), size: newVariant.size.trim() || null, color: newVariant.color.trim() || null,
      stock: parseInt(newVariant.stock) || 0, price_override: newVariant.price_override ? parseFloat(newVariant.price_override) : null,
      low_stock_threshold: newVariant.low_stock_threshold ? parseInt(newVariant.low_stock_threshold) : null,
    });
    if (error) { setVariantError(error.message); return; }
    setVariantError('');
    setNewVariant({ size:'', color:'', sku:'', stock:'0', price_override:'', low_stock_threshold:'' });
    loadVariants();
  }
  async function deleteVariant(id) {
    await sbDeleteProductVariant(id);
    loadVariants();
  }

  React.useEffect(() => { sbGetCategoryTree().then(tree => setCategories(_flattenCategories(tree))); }, []);
  // Only active brands are offered as new choices here. If this product is
  // already linked to a brand that's since been deactivated, fetch that one
  // brand too so its name still shows (and the value is never silently lost)
  // instead of pretending the selector has nothing selected.
  React.useEffect(() => {
    sbGetActiveBrands().then(async active => {
      if (product.brand_id && !active.some(b => b.id === product.brand_id)) {
        const current = await sbAdminGetBrand(product.brand_id);
        if (current) active = [...active, { ...current, inactive: true }];
      }
      setBrands(active);
    });
  }, []);

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

      <AdminField label="Brand (optional)">
        <select value={form.brand_id} onChange={e => setForm(f => ({ ...f, brand_id:e.target.value }))} aria-label="Brand"
          style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
          <option value="">— No brand —</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}{b.inactive ? ' (inactive)' : ''} {b.risk_level && b.risk_level !== 'low' ? `· ${b.risk_level} risk` : ''}</option>)}
        </select>
        {selectedBrand && riskLevel !== 'low' && (
          <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
            <Icon name="alertTriangle" size={12} color={riskLevel === 'high' ? C.danger : C.warning} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color: riskLevel === 'high' ? C.danger : C.warning }}>{riskLevel === 'high' ? 'High' : 'Medium'} risk brand — authenticity required</span>
          </div>
        )}
      </AdminField>

      <AdminField label={isNew ? 'Condition (required)' : 'Condition'}>
        <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition:e.target.value }))} aria-label="Condition"
          style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
          <option value="">— Select condition —</option>
          {PRODUCT_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </AdminField>

      {needsAuthenticityStatement && (
        <AdminField label="Authenticity statement (required)">
          <textarea value={form.authenticity_statement} onChange={e => setForm(f => ({ ...f, authenticity_statement:e.target.value }))} rows={3} aria-label="Authenticity statement"
            style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, resize:'vertical' }} />
        </AdminField>
      )}

      {form.authenticity_proof_paths.length > 0 && (
        <AdminField label="Authenticity proof documents">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {form.authenticity_proof_paths.map(path => (
              <div key={path} style={{ display:'flex', alignItems:'center', gap:8, fontFamily:"'Inter',sans-serif", fontSize:12 }}>
                <Icon name="lock" size={12} color={C.mute} />
                {proofUrls[path] ? (
                  <a href={proofUrls[path]} target="_blank" rel="noopener noreferrer" style={{ color:C.primary }}>View document (60s link)</a>
                ) : (
                  <button onClick={() => revealProof(path)} style={{ border:'none', background:'none', cursor:'pointer', padding:0, color:C.primary }}>
                    {proofUrls[path] === null ? 'Loading…' : 'Reveal document'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </AdminField>
      )}

      {!isNew && (
        <AdminField label="Variants">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {variants.length === 0 && (
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>No variants — this product uses the single Stock field above.</div>
            )}
            {variants.map(v => (
              <div key={v.id} style={{ display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:8 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.ink, minWidth:90 }}>{[v.size, v.color].filter(Boolean).join(' / ') || '—'}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.mute, minWidth:70 }}>{v.sku}</span>
                <input type="number" defaultValue={v.stock} onBlur={e => saveVariantField(v, 'stock', parseInt(e.target.value) || 0)}
                  style={{ width:60, height:30, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 6px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} title="Stock" />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>reserved: {v.reserved}</span>
                <StatusPill tone={(v.stock - v.reserved) <= 0 ? 'danger' : (v.low_stock_threshold != null && (v.stock - v.reserved) < v.low_stock_threshold) ? 'warning' : 'success'}>
                  {(v.stock - v.reserved) <= 0 ? 'out of stock' : (v.low_stock_threshold != null && (v.stock - v.reserved) < v.low_stock_threshold) ? 'low stock' : 'in stock'}
                </StatusPill>
                <button onClick={() => deleteVariant(v.id)} title="Delete variant" style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                  <Icon name="trash" size={13} color={C.danger} />
                </button>
              </div>
            ))}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <input value={newVariant.size} onChange={e => setNewVariant(v => ({ ...v, size:e.target.value }))} placeholder="Size" style={{ width:70, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'Inter',sans-serif", fontSize:12.5 }} />
              <input value={newVariant.color} onChange={e => setNewVariant(v => ({ ...v, color:e.target.value }))} placeholder="Color" style={{ width:80, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'Inter',sans-serif", fontSize:12.5 }} />
              <input value={newVariant.sku} onChange={e => setNewVariant(v => ({ ...v, sku:e.target.value }))} placeholder="SKU" style={{ width:90, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />
              <input type="number" value={newVariant.stock} onChange={e => setNewVariant(v => ({ ...v, stock:e.target.value }))} placeholder="Stock" style={{ width:60, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />
              <input type="number" value={newVariant.price_override} onChange={e => setNewVariant(v => ({ ...v, price_override:e.target.value }))} placeholder="Price (opt.)" style={{ width:85, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />
              <input type="number" value={newVariant.low_stock_threshold} onChange={e => setNewVariant(v => ({ ...v, low_stock_threshold:e.target.value }))} placeholder="Low alert" style={{ width:75, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />
              <Btn size="sm" onClick={addVariant}>+ Add</Btn>
            </div>
            {variantError && <div role="alert" style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.danger }}>{variantError}</div>}
          </div>
        </AdminField>
      )}

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
const KYC_STATUS_TONE = {
  not_submitted: 'mute', pending: 'warning', under_review: 'info',
  needs_changes: 'warning', approved: 'success', rejected: 'danger', suspended: 'danger',
};
const KYC_STATUS_LABEL = {
  not_submitted: 'not submitted', pending: 'pending', under_review: 'under review',
  needs_changes: 'needs changes', approved: 'approved', rejected: 'rejected', suspended: 'suspended',
};
const KYC_PAGE_SIZE = 20;

// ─── ADMIN — Seller Management / KYC Verification (real backend) ──
// List + search + status filter + pagination over kyc_requests, backed by
// sbAdminGetKycRequests(). Row click opens AdminKycDetail for the actual
// review workflow. Every decision button below is a hint only — the real
// authorization boundary is server-side (has_permission() inside
// admin_review_kyc()), so hiding a button here is defense-in-depth, not
// the protection itself.
function AdminSellersKycSection({ accessCtx }) {
  const [result, setResult] = React.useState({ requests:[], totalRequests:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [search, setSearch] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [openId, setOpenId] = React.useState(null);
  const [pendingCount, setPendingCount] = React.useState(null);

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetKycRequests({ page, limit:KYC_PAGE_SIZE, status, search }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  React.useEffect(() => {
    sbAdminGetKycRequests({ page:1, limit:1, status:'pending' }).then(r => setPendingCount(r.totalRequests ?? 0));
  }, []);

  if (openId) {
    return (
      <AdminKycDetail
        kycId={openId}
        accessCtx={accessCtx}
        onBack={() => setOpenId(null)}
        onChanged={() => { load(); sbAdminGetKycRequests({ page:1, limit:1, status:'pending' }).then(r => setPendingCount(r.totalRequests ?? 0)); }}
      />
    );
  }

  const { requests, totalRequests, totalPages } = result;
  const STATUS_FILTERS = ['ALL','pending','under_review','needs_changes','approved','rejected','suspended'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Seller Management / KYC Verification" sub={`${totalRequests} application${totalRequests===1?'':'s'}${pendingCount ? ` · ${pendingCount} pending review` : ''}`} />

      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 220px', minWidth:220 }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by name, email or shop…"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white, boxSizing:'border-box' }} />
        </div>
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}
          style={{ border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'0 10px', height:38, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }}>
          {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : KYC_STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      <AdminCard padded={false}>
        {loading ? <AdminEmptyRow text="Loading…" /> : requests.length === 0 ? (
          <AdminEmptyRow text="No KYC applications match these filters." />
        ) : requests.map((r, i) => (
          <div key={r.id} onClick={() => setOpenId(r.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', cursor:'pointer' }}>
            <Avatar size={34} initials={(r.profiles?.full_name || r.legal_first_name || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{r.profiles?.full_name || `${r.legal_first_name||''} ${r.legal_last_name||''}`.trim() || 'Unnamed applicant'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {r.profiles?.email || r.contact_email || ''}{(r.shop_name_requested || r.shop_name) ? ` · "${r.shop_name_requested || r.shop_name}"` : ''}
              </div>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, flexShrink:0 }}>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}</span>
            <StatusPill tone={KYC_STATUS_TONE[r.status] || 'mute'}>{KYC_STATUS_LABEL[r.status] || r.status}</StatusPill>
            <Icon name="chevronRight" size={14} color={C.mute} />
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

// ─── ADMIN — KYC application detail: secure doc review + decision ──
function AdminKycDocThumb({ label, path }) {
  const [url, setUrl] = React.useState(undefined);
  function reveal() {
    setUrl(null);
    sbAdminGetKycDocUrl(path).then(u => setUrl(u));
  }
  return (
    <div style={{ borderRadius:10, overflow:'hidden', border:`1px solid ${C.hairline}` }}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer"><Img src={url} style={{ height:90, borderRadius:0 }} /></a>
      ) : (
        <div style={{ height:90, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {!path ? (
            <Icon name="x" size={18} color={C.mute} />
          ) : url === null ? (
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Loading…</span>
          ) : (
            <button onClick={reveal} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <Icon name="eye" size={18} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.primary, fontWeight:600 }}>View (60s link)</span>
            </button>
          )}
        </div>
      )}
      <div style={{ padding:'5px 8px', display:'flex', justifyContent:'space-between', alignItems:'center', background:C.white }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:600, color:C.ink }}>{label}</span>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color: path ? C.success : C.mute }}>{path ? 'Provided' : 'Missing'}</span>
      </div>
    </div>
  );
}

function AdminKycInfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'5px 0' }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{label}</span>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink, fontWeight:600, textAlign:'right' }}>{value}</span>
    </div>
  );
}

function AdminKycDetail({ kycId, accessCtx, onBack, onChanged }) {
  const [kyc, setKyc] = React.useState(undefined);
  const [history, setHistory] = React.useState([]);
  const [confirming, setConfirming] = React.useState(null); // 'rejected' | 'needs_changes' | 'suspended' | 'approved'
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const refresh = React.useCallback(() => {
    sbAdminGetKycRequest(kycId).then(setKyc);
    sbAdminGetAuditLogs({ page:1, limit:20, resourceType:'kyc_requests', search:kycId }).then(r => setHistory(r.logs || []));
  }, [kycId]);
  React.useEffect(() => { refresh(); }, [refresh]);

  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);

  async function submitDecision(decision) {
    setBusy(true); setErr('');
    const { error } = await sbAdminReviewKyc(kycId, decision, notes.trim() || null);
    setBusy(false);
    if (error) { setErr(error.message || 'This action was rejected by the server.'); return; }
    logAdminAction(`KYC ${decision.replace('_',' ')}`, kyc?.shop_name_requested || kyc?.shop_name || kyc?.profiles?.full_name || kycId, 'kyc_requests', kycId);
    setConfirming(null); setNotes('');
    refresh();
    onChanged && onChanged();
  }

  if (kyc === undefined) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:640 }}>
        <BackLink onBack={onBack} />
        <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard>
      </div>
    );
  }
  if (kyc === null) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:640 }}>
        <BackLink onBack={onBack} />
        <AdminCard><AdminEmptyRow text="Couldn't load this application — it may have been removed." /></AdminCard>
      </div>
    );
  }

  const fullName = `${kyc.legal_first_name||''} ${kyc.legal_last_name||''}`.trim() || kyc.profiles?.full_name || 'Unnamed applicant';
  const complete = !!kyc.doc_front_path && !!kyc.selfie_path;

  const actions = [];
  if (['pending','under_review'].includes(kyc.status)) {
    if (can('kyc.review') && kyc.status === 'pending') actions.push({ key:'under_review', label:'Mark under review', tone:'secondary' });
    if (can('kyc.request_changes')) actions.push({ key:'needs_changes', label:'Request changes', tone:'secondary', needsNote:true, confirm:true });
    if (can('kyc.reject')) actions.push({ key:'rejected', label:'Reject', tone:'danger', needsNote:true, confirm:true });
    if (can('kyc.approve')) actions.push({ key:'approved', label:'Approve', tone:'primary', requireComplete:true, confirm:true });
  } else if (kyc.status === 'approved') {
    if (can('sellers.suspend')) actions.push({ key:'suspended', label:'Suspend seller', tone:'danger', needsNote:true, confirm:true });
  } else if (kyc.status === 'suspended') {
    if (can('kyc.approve')) actions.push({ key:'approved', label:'Reinstate', tone:'primary', confirm:true });
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:640 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <BackLink onBack={onBack} />
        <StatusPill tone={KYC_STATUS_TONE[kyc.status] || 'mute'}>{KYC_STATUS_LABEL[kyc.status] || kyc.status}</StatusPill>
      </div>

      <AdminCard style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
        <Avatar size={44} initials={fullName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} />
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:3 }}>{fullName}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{kyc.profiles?.email || kyc.contact_email || ''}{kyc.contact_phone ? ` · ${kyc.contact_phone}` : ''}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Shop: "{kyc.shop_name_requested || kyc.shop_name || '—'}"</div>
        </div>
      </AdminCard>

      <AdminCard>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, marginBottom:4 }}>Applicant details</div>
        <AdminKycInfoRow label="Date of birth" value={kyc.date_of_birth} />
        <AdminKycInfoRow label="Nationality" value={kyc.nationality} />
        <AdminKycInfoRow label="Origin country" value={kyc.origin_country} />
        <AdminKycInfoRow label="Destination country" value={kyc.destination_country} />
        <AdminKycInfoRow label="City" value={kyc.city} />
        <AdminKycInfoRow label="Document type" value={kyc.doc_type} />
        <AdminKycInfoRow label="Shop description" value={kyc.shop_description} />
        <AdminKycInfoRow label="Submitted" value={kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleString() : null} />
      </AdminCard>

      {kyc.requested_changes && (
        <div style={{ background:'#FFF6E5', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.warning, marginBottom:3 }}>Corrections requested</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink }}>{kyc.requested_changes}</div>
        </div>
      )}
      {kyc.review_notes && ['rejected','suspended'].includes(kyc.status) && (
        <div style={{ background:'#FDEDED', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.danger, marginBottom:3 }}>Reason on file</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink }}>{kyc.review_notes}</div>
        </div>
      )}

      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, marginBottom:8 }}>
          Documents {!complete && <span style={{ color:C.warning, fontWeight:600 }}>· incomplete, cannot be approved</span>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <AdminKycDocThumb label="ID front" path={kyc.doc_front_path} />
          <AdminKycDocThumb label="ID back" path={kyc.doc_back_path} />
          <AdminKycDocThumb label="Selfie" path={kyc.selfie_path} />
        </div>
      </div>

      {err && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{err}</div>}

      {confirming ? (
        <AdminCard style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>
            {confirming === 'approved' ? 'Confirm approval' : confirming === 'suspended' ? 'Confirm suspension' : confirming === 'rejected' ? 'Reason for rejection' : 'What needs to change?'}
          </div>
          {confirming !== 'approved' && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain the decision — this is shown to the seller." rows={3}
              style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, resize:'vertical' }} />
          )}
          <div style={{ display:'flex', gap:8 }}>
            <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setConfirming(null); setNotes(''); setErr(''); }} disabled={busy}>Cancel</Btn>
            <Btn size="sm" variant={confirming === 'approved' ? 'primary' : 'danger'} style={{ flex:1 }}
              disabled={busy || (confirming !== 'approved' && !notes.trim())}
              onClick={() => submitDecision(confirming)}>
              {busy ? 'Submitting…' : 'Confirm'}
            </Btn>
          </div>
        </AdminCard>
      ) : actions.length > 0 ? (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {actions.map(a => (
            <Btn key={a.key} size="sm" variant={a.tone === 'primary' ? 'primary' : a.tone === 'danger' ? 'danger' : 'secondary'}
              disabled={a.requireComplete && !complete}
              onClick={() => a.confirm ? setConfirming(a.key) : submitDecision(a.key)}>
              {a.label}
            </Btn>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>
          {kyc.status === 'rejected' || kyc.status === 'needs_changes' ? 'Waiting on the seller to resubmit.' : 'No action available for your role on this application.'}
        </div>
      )}

      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, marginBottom:8 }}>Decision history</div>
        <AdminCard padded={false}>
          {history.length === 0 ? <AdminEmptyRow text="No decisions recorded yet." /> : history.map((a, i) => (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <Icon name="fileText" size={13} color={C.primary} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>{a.action}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>by {a.profiles?.full_name || a.profiles?.email || 'admin'}</div>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(a.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}

function BackLink({ onBack }) {
  return (
    <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
      <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Sellers</span>
    </button>
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
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{r.k}</div>
                {r.sub && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color: r.subTone === 'danger' ? C.danger : r.subTone === 'success' ? C.success : C.mute, marginTop:2 }}>{r.sub}</div>}
              </div>
              <Switch checked={r.on} disabled={r.disabled} onChange={v => onToggle && onToggle(r.k, v)} />
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

  function openNew() { setDraft({ name:'', label:'', unit:'', default_value:'', type:'text', options:'', is_required:false, is_filterable:true, is_searchable:false, is_sortable:false, is_active:true, is_variant_option:false, display_order: attributes.length }); }
  function openEdit(a) { setDraft({ ...a, label: a.label || '', unit: a.unit || '', default_value: a.default_value || '', is_active: a.is_active !== false, is_variant_option: !!a.is_variant_option, options: (a.options||[]).join(', ') }); }
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
          <AdminField label="Display Label (optional)"><AdminTextInput value={draft.label} onChange={v => setDraft(d => ({ ...d, label:v }))} placeholder="Shown to sellers/buyers — defaults to the name above" /></AdminField>
          <AdminField label="Type">
            <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type:e.target.value }))} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
              {ATTR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </AdminField>
          {['select','multiselect','color','size'].includes(draft.type) && (
            <AdminField label="Options (comma-separated)"><AdminTextInput value={draft.options} onChange={v => setDraft(d => ({ ...d, options:v }))} placeholder="S, M, L, XL" /></AdminField>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <AdminField label="Unit (optional)"><AdminTextInput value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit:v }))} placeholder="GB, cm, kg…" /></AdminField>
            <AdminField label="Default value (optional)"><AdminTextInput value={draft.default_value} onChange={v => setDraft(d => ({ ...d, default_value:v }))} /></AdminField>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[['is_required','Required'],['is_filterable','Filterable'],['is_searchable','Searchable'],['is_sortable','Sortable'],['is_active','Active'],['is_variant_option','Variant option (SKU/stock)']].map(([f,label]) => (
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

// ─── ADMIN — Brands (real backend: brands table, RLS-gated via brands.* permissions) ──
const BRAND_PAGE_SIZE = 20;

function AdminBrandsSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [tab, setTab] = React.useState('brands'); // 'brands' | 'requests'
  const [result, setResult] = React.useState({ brands:[], totalBrands:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState(null); // { id } or {} for new, or null
  const [deleting, setDeleting] = React.useState(null); // brand row
  const [pendingRequestCount, setPendingRequestCount] = React.useState(null);

  React.useEffect(() => {
    sbAdminGetBrandRequests({ page:1, limit:1, status:'pending' }).then(r => setPendingRequestCount(r.totalRequests ?? 0));
  }, [tab]);

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetBrands({ page, limit:BRAND_PAGE_SIZE, status, search }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    const unsubscribe = sbSubscribeAdminBrands(() => load());
    return unsubscribe;
  }, [load]);

  async function handleStatus(brand, newStatus) {
    await sbAdminSetBrandStatus(brand.id, newStatus);
    logAdminAction('Changed brand status', `${brand.name} → ${newStatus}`);
    load();
  }

  if (editing) {
    return <AdminBrandDetail brand={editing} onBack={() => { setEditing(null); load(); }} />;
  }
  if (deleting) {
    return <AdminBrandDeleteModal brand={deleting} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); load(); }} />;
  }

  const { brands, totalBrands, totalPages } = result;
  const activeCount = brands.filter(b => b.status === 'active').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', gap:6 }} role="tablist" aria-label="Brands or Brand Requests">
        <button onClick={() => setTab('brands')} aria-pressed={tab === 'brands'} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: tab === 'brands' ? C.ink : C.paper, color: tab === 'brands' ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600 }}>Brands</button>
        <button onClick={() => setTab('requests')} aria-pressed={tab === 'requests'} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: tab === 'requests' ? C.ink : C.paper, color: tab === 'requests' ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
          Brand Requests {pendingRequestCount ? <span style={{ background: tab === 'requests' ? 'rgba(255,255,255,0.25)' : C.warning, color: tab === 'requests' ? '#fff' : '#fff', borderRadius:9999, padding:'1px 7px', fontSize:11 }}>{pendingRequestCount}</span> : null}
        </button>
      </div>

      {tab === 'requests' ? (
        <AdminBrandRequestsPanel can={can} onDecided={() => sbAdminGetBrandRequests({ page:1, limit:1, status:'pending' }).then(r => setPendingRequestCount(r.totalRequests ?? 0))} />
      ) : (
      <>
      <SectionTitle title="Brands" sub={`${totalBrands} brand${totalBrands === 1 ? '' : 's'} · ${activeCount} active on this page`}
        action={<Btn variant="primary" size="sm" onClick={() => setEditing({})}>+ New brand</Btn>} />

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Brand name or slug…" aria-label="Search brands"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }} role="tablist" aria-label="Filter brands by status">
        {['ALL','active','inactive'].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} aria-pressed={status === s} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === s ? C.ink : C.paper, color: status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s}</button>
        ))}
      </div>

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <Th>Brand</Th><Th>Status</Th><Th align="right">Products</Th><Th>Created</Th><Th align="right">Actions</Th>
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><AdminEmptyRow text="Loading brands…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={5}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : brands.length === 0 ? (
              <tr><td colSpan={5}><AdminEmptyRow text="No brands yet — add your first one." /></td></tr>
            ) : brands.map(b => (
              <tr key={b.id}>
                <Td>
                  <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setEditing({ id:b.id })}>
                    <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', flexShrink:0, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {b.logo_url ? <img src={b.logo_url} alt={`${b.name} logo`} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name="tag" size={15} color={C.primary} />}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:600 }}>{b.name}</div>
                      <div style={{ fontSize:11, color:C.mute, fontFamily:"'JetBrains Mono',monospace" }}>/{b.slug}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <select value={b.status} onChange={e => handleStatus(b, e.target.value)} aria-label={`Status for ${b.name}`}
                    style={{ border:'none', borderRadius:9999, padding:'4px 10px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, textTransform:'capitalize', background: b.status === 'active' ? '#EFF9F4' : C.paper, color: b.status === 'active' ? C.success : C.mute }}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </Td>
                <Td align="right">{b.productCount}</Td>
                <Td>{b.created_at ? new Date(b.created_at).toLocaleDateString() : '—'}</Td>
                <Td align="right">
                  <div style={{ display:'flex', gap:4, justifyContent:'flex-end', flexWrap:'wrap' }}>
                    <button onClick={() => setEditing({ id:b.id })} title="View / Edit" aria-label={`Edit ${b.name}`} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="edit" size={13} color={C.mute} />
                    </button>
                    <button onClick={() => handleStatus(b, b.status === 'active' ? 'inactive' : 'active')} title={b.status === 'active' ? 'Deactivate' : 'Activate'} aria-label={`${b.status === 'active' ? 'Deactivate' : 'Activate'} ${b.name}`} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name={b.status === 'active' ? 'eyeOff' : 'eye'} size={13} color={C.mute} />
                    </button>
                    <button onClick={() => setDeleting(b)} title="Delete" aria-label={`Delete ${b.name}`} style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
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
      </>
      )}
    </div>
  );
}

// Approve/reject brand requests — gated by brands.approve, same permission
// the admin_decide_brand_request() RPC itself checks server-side. Hiding
// the decide buttons here is defense-in-depth, not the real boundary.
function AdminBrandRequestsPanel({ can, onDecided }) {
  const [result, setResult] = React.useState({ requests:[], totalRequests:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('pending');
  const [rejecting, setRejecting] = React.useState(null); // request row
  const [rejectReason, setRejectReason] = React.useState('');
  const [busyId, setBusyId] = React.useState(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetBrandRequests({ page, limit:20, status }).then(r => { setResult(r); setLoading(false); });
  }, [page, status]);
  React.useEffect(() => { load(); }, [load]);

  const canDecide = can('brands.approve');

  async function decide(request, decision, reason = '') {
    setBusyId(request.id); setError('');
    const { error: err } = await sbAdminDecideBrandRequest(request.id, decision, reason);
    setBusyId(null);
    if (err) { setError(err.message || 'Could not record this decision.'); return; }
    logAdminAction(decision === 'approved' ? 'Approved brand request' : 'Rejected brand request', request.requested_name);
    setRejecting(null); setRejectReason('');
    load();
    onDecided?.();
  }

  const { requests, totalRequests, totalPages } = result;
  const STATUS_FILTERS = ['pending','approved','rejected','ALL'];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Brand Requests" sub={`${totalRequests} request${totalRequests === 1 ? '' : 's'}`} />

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }} role="tablist" aria-label="Filter brand requests by status">
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} aria-pressed={status === s} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === s ? C.ink : C.paper, color: status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s}</button>
        ))}
      </div>

      {error && <div role="alert" style={{ background:'#FDEDED', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>}

      <AdminCard padded={false}>
        {loading ? <AdminEmptyRow text="Loading…" /> : requests.length === 0 ? (
          <AdminEmptyRow text="No brand requests match this filter." />
        ) : requests.map((r, i) => (
          <div key={r.id} style={{ padding:'14px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none', display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>{r.requested_name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>
                  {r.profiles?.full_name || r.profiles?.email || 'Unknown seller'}{r.shops?.name ? ` · ${r.shops.name}` : ''} · {new Date(r.created_at).toLocaleDateString()}
                </div>
                {r.reason && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink, marginTop:6 }}>"{r.reason}"</div>}
                {r.status === 'rejected' && r.rejection_reason && (
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger, marginTop:4 }}>Rejected: {r.rejection_reason}</div>
                )}
              </div>
              <StatusPill tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</StatusPill>
            </div>

            {r.status === 'pending' && canDecide && (
              rejecting === r.id ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <AdminTextInput value={rejectReason} onChange={setRejectReason} placeholder="Reason for rejection (required)" />
                  <div style={{ display:'flex', gap:8 }}>
                    <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setRejecting(null); setRejectReason(''); }} disabled={busyId === r.id}>Cancel</Btn>
                    <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => { if (!rejectReason.trim()) { setError('A rejection reason is required.'); return; } decide(r, 'rejected', rejectReason); }} disabled={busyId === r.id}>Confirm rejection</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <Btn size="sm" variant="primary" style={{ flex:1 }} onClick={() => decide(r, 'approved')} disabled={busyId === r.id}>{busyId === r.id ? 'Working…' : 'Approve → create brand'}</Btn>
                  <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} onClick={() => setRejecting(r.id)} disabled={busyId === r.id}>Reject</Btn>
                </div>
              )
            )}
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

function AdminBrandDetail({ brand, onBack }) {
  const isNew = !brand.id;
  const [loading, setLoading] = React.useState(!isNew);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef(null);
  const [form, setForm] = React.useState({ name:'', slug:'', logo_url:null, description:'', website_url:'', status:'active', risk_level:'low' });

  React.useEffect(() => {
    if (isNew) return;
    sbAdminGetBrand(brand.id).then(data => {
      if (data) {
        setForm({
          name: data.name || '', slug: data.slug || '', logo_url: data.logo_url || null,
          description: data.description || '', website_url: data.website_url || '', status: data.status || 'active',
          risk_level: data.risk_level || 'low',
        });
        setSlugTouched(true);
      }
      setLoading(false);
    });
  }, [brand.id]);

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }
  function setName(v) { setForm(f => ({ ...f, name:v, slug: slugTouched ? f.slug : _slugify(v) })); }

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    const path = `${Date.now()}-${file.name}`;
    const { url, error: uploadError } = await sbUploadFile('brands', path, file);
    setUploading(false);
    if (uploadError || !url) { setError('Logo upload failed'); return; }
    set('logo_url', url);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Brand name is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }
    setSaving(true); setError('');
    const { error: saveError } = isNew ? await sbAdminCreateBrand(form) : await sbAdminUpdateBrand(brand.id, form);
    setSaving(false);
    if (saveError) { setError(saveError.message || 'Could not save brand'); return; }
    logAdminAction(isNew ? 'Created brand' : 'Updated brand', form.name);
    onBack();
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
        <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
          <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Brands</span>
        </button>
        <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:560 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Brands</span>
      </button>

      <SectionTitle title={isNew ? 'Create Brand' : `Edit "${form.name}"`} />

      {error && (
        <div role="alert" style={{ background:'#FDEDED', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>
      )}

      <AdminCard style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <AdminField label="Logo">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div onClick={() => fileRef.current?.click()} role="button" tabIndex={0} aria-label="Upload brand logo"
              style={{ width:72, height:72, borderRadius:12, overflow:'hidden', cursor:'pointer', background: form.logo_url ? undefined : C.paper, border: form.logo_url ? 'none' : `1.5px dashed ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {form.logo_url ? <img src={form.logo_url} alt="Brand logo" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Icon name="camera" size={20} color={C.mute} />}
            </div>
            <div>
              <Btn size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : form.logo_url ? 'Replace logo' : 'Upload logo'}</Btn>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:6 }}>PNG or JPG, square works best. Or paste a logo URL below.</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => handleUpload(e.target.files?.[0])} style={{ display:'none' }} />
          <div style={{ marginTop:8 }}><AdminTextInput value={form.logo_url || ''} onChange={v => set('logo_url', v)} placeholder="https://… (logo URL)" mono /></div>
        </AdminField>

        <AdminField label="Brand Name"><AdminTextInput value={form.name} onChange={setName} placeholder="e.g. Nike" /></AdminField>
        <AdminField label="Slug"><AdminTextInput value={form.slug} onChange={v => { setSlugTouched(true); set('slug', _slugify(v)); }} placeholder="nike" mono /></AdminField>
        <AdminField label="Description">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} aria-label="Brand description"
            style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, resize:'vertical' }} />
        </AdminField>
        <AdminField label="Website URL (optional)"><AdminTextInput value={form.website_url} onChange={v => set('website_url', v)} placeholder="https://nike.com" mono /></AdminField>
        <AdminField label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} aria-label="Brand status"
            style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </AdminField>
        <AdminField label="Risk level">
          <select value={form.risk_level} onChange={e => set('risk_level', e.target.value)} aria-label="Brand risk level"
            style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', background:C.white, color:C.ink, fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
            <option value="low">Low — no extra checks</option>
            <option value="medium">Medium — authenticity statement required</option>
            <option value="high">High — authenticity statement + proof required</option>
          </select>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:6 }}>Controls what sellers must provide when listing a product under this brand. Never treat "active" as legal authorization to sell every item under this brand.</div>
        </AdminField>
      </AdminCard>

      <div style={{ display:'flex', gap:8 }}>
        <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onBack}>Cancel</Btn>
        <Btn variant="primary" style={{ flex:1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create brand' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}

function AdminBrandDeleteModal({ brand, onClose, onDone }) {
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState('');
  const productCount = brand.productCount ?? 0;
  const blocked = productCount > 0;

  async function handleDeactivate() {
    setBusy(true);
    await sbAdminSetBrandStatus(brand.id, 'inactive');
    logAdminAction('Deactivated brand', brand.name);
    setBusy(false);
    onDone();
  }

  async function confirmDelete() {
    setBusy(true); setServerError('');
    const { error } = await sbAdminDeleteBrand(brand.id);
    setBusy(false);
    if (error) { setServerError(error.message); return; }
    logAdminAction('Deleted brand', brand.name);
    onDone();
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Delete ${brand.name}`} style={{ background:C.white, borderRadius:16, padding:20, maxWidth:440, width:'100%', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Delete "{brand.name}"?</div>

        {blocked ? (
          <>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>
              This brand has <strong>{productCount}</strong> product{productCount===1?'':'s'} linked to it. Deleting it would break those products' catalog data, so deletion is blocked. Deactivate it instead — it stays assigned to existing products but disappears from the brand picker for new ones.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onClose}>Cancel</Btn>
              <Btn size="sm" style={{ flex:1 }} onClick={handleDeactivate} disabled={busy}>{busy ? 'Working…' : 'Deactivate instead'}</Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>This brand has no linked products. This cannot be undone.</div>
            {serverError && <div role="alert" style={{ background:'#FDEDED', borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{serverError}</div>}
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={onClose}>Cancel</Btn>
              <Btn size="sm" style={{ flex:1, color:'#fff', background:C.danger, border:'none' }} onClick={confirmDelete} disabled={busy}>{busy ? 'Working…' : 'Delete brand'}</Btn>
            </div>
          </>
        )}
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

// ─── ADMIN — Backup (real Supabase export — replaces the old
// window.PRODUCTS-backed export, which always produced "products": []
// while telling the admin it included the catalog). Exports catalog data
// only — products, categories, brands — never credentials, tokens, or any
// other secret; the export query itself never selects such columns.
function AdminBackupSection() {
  const [exporting, setExporting] = React.useState(false);
  const [lastResult, setLastResult] = React.useState(null); // { counts, partial, error } of the last attempt
  const [toast, setToast] = React.useState(null);

  async function runExport() {
    setExporting(true);
    const { products, categories, brands, error, partial } = await sbAdminExportCatalog();
    setExporting(false);
    if (error) {
      setLastResult({ error });
      setToast({ type:'error', message: 'Backup failed — nothing was downloaded.' });
      return;
    }
    const payload = { products, categories, brands, exportedAt: new Date().toISOString(), counts: { products: products.length, categories: categories.length, brands: brands.length } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clorivo-backup-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    setLastResult({ counts: payload.counts, partial });
    logAdminAction('Exported backup', `${products.length} products, ${categories.length} categories, ${brands.length} brands${partial ? ' (partial — some reads failed)' : ''}`);
    setToast({ type: partial ? 'error' : 'success', message: partial ? 'Backup downloaded, but some data could not be read — see counts below.' : `Backup downloaded: ${products.length} products, ${categories.length} categories, ${brands.length} brands.` });
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Backup" sub="Export the real current catalog as JSON" />
      <AdminCard style={{ maxWidth:480, display:'flex', flexDirection:'column', gap:10 }}>
        <Btn variant="primary" onClick={runExport} disabled={exporting}>{exporting ? 'Exporting…' : 'Download backup (.json)'}</Btn>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Includes products, categories, and brands currently in Supabase. Never includes credentials, tokens, or other secrets.</span>
        {lastResult?.error && (
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger }}>Export failed: {lastResult.error.message || 'Unknown error.'}</span>
        )}
        {lastResult?.counts && (
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color: lastResult.partial ? C.warning : C.success }}>
            Last export: {lastResult.counts.products} products, {lastResult.counts.categories} categories, {lastResult.counts.brands} brands.
            {lastResult.partial ? ' Some data could not be read with your current permissions — this export is not guaranteed complete.' : ''}
          </span>
        )}
      </AdminCard>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── ADMIN — System Health: real, live checks against Database,
// Authentication, Storage, Edge Functions and Realtime (see
// supabase/phase9_health_section_migration.sql and
// supabase/functions/health-check). Replaces the previous hardcoded
// "Backend reachable: false — Project paused" placeholder. Every
// status below is observed on this exact page load / click — never
// hardcoded — and a failure is classified by cause (network, timeout,
// expired session, permission denied, or a real service error)
// instead of collapsed into one generic "down". ─────────────────────
const HEALTH_SERVICES = [
  { key:'database',       label:'Database',       icon:'archive', run: () => sbAdminHealthPing() },
  { key:'auth',           label:'Authentication', icon:'lock',    run: () => sbAdminCheckAuthService() },
  { key:'storage',        label:'Storage',        icon:'image',   run: () => sbAdminCheckStorageService() },
  { key:'edge_functions', label:'Edge Functions', icon:'zap',     run: () => sbAdminCheckEdgeFunctions() },
  { key:'realtime',       label:'Realtime',       icon:'globe',   run: () => sbAdminCheckRealtime() },
];
const HEALTH_CHECK_TIMEOUT_MS = 8000;
const HEALTH_AUTO_REFRESH_MS = 60000;

function _healthTimeoutRace(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve({ ok:false, errorType:'timeout', message:'Check timed out.' }), ms)),
  ]);
}

function AdminHealthSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canView = can('system.health');

  const [statuses, setStatuses] = React.useState(() => Object.fromEntries(HEALTH_SERVICES.map(s => [s.key, { state:'pending' }])));
  const [checking, setChecking] = React.useState(false);
  const [lastCheckedAt, setLastCheckedAt] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [, forceTick] = React.useState(0);

  const loadHistory = React.useCallback(() => {
    if (!canView) { setHistoryLoading(false); return; }
    sbAdminGetHealthHistory(30).then(h => { setHistory(h); setHistoryLoading(false); });
  }, [canView]);

  const runCheck = React.useCallback(async () => {
    if (!canView) return;
    setChecking(true);
    const results = await Promise.all(HEALTH_SERVICES.map(async (svc) => {
      const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const outcome = await _healthTimeoutRace(svc.run(), HEALTH_CHECK_TIMEOUT_MS);
      const latency = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      const status = outcome.ok ? 'ok' : (outcome.errorType === 'permission' ? 'degraded' : 'down');
      return { key: svc.key, status, latency: outcome.ok ? latency : null, errorType: outcome.errorType || null, message: outcome.message || null };
    }));
    const nextStatuses = {};
    results.forEach(r => { nextStatuses[r.key] = { state: r.status, latency: r.latency, errorType: r.errorType, message: r.message }; });
    setStatuses(nextStatuses);
    setLastCheckedAt(new Date().toISOString());
    setChecking(false);
    await sbAdminRecordHealthCheck(results.map(r => ({ service: r.key, status: r.status, latency_ms: r.latency, message: r.message })));
    loadHistory();
  }, [canView, loadHistory]);

  React.useEffect(() => { if (canView) runCheck(); }, [canView]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { loadHistory(); }, [loadHistory]);
  React.useEffect(() => {
    if (!canView) return;
    const id = setInterval(() => runCheck(), HEALTH_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [canView, runCheck]);
  React.useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 15000); // keeps "x ago" labels fresh
    return () => clearInterval(id);
  }, []);

  if (!canView) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle title="System Health" />
        <AdminCard style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'32px 20px', textAlign:'center' }}>
          <Icon name="lock" size={22} color={C.mute} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>You don't have access to System Health</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, maxWidth:360 }}>This section requires the <strong>system.health</strong> permission. Ask an admin to grant it under Staff → Roles.</div>
        </AdminCard>
      </div>
    );
  }

  const ok = HEALTH_SERVICES.filter(s => statuses[s.key]?.state === 'ok').length;
  const degraded = HEALTH_SERVICES.filter(s => statuses[s.key]?.state === 'degraded').length;
  const down = HEALTH_SERVICES.filter(s => statuses[s.key]?.state === 'down').length;
  const pending = HEALTH_SERVICES.filter(s => statuses[s.key]?.state === 'pending').length;
  const overall = pending === HEALTH_SERVICES.length ? 'pending' : down > 0 ? 'down' : degraded > 0 ? 'degraded' : 'ok';
  const overallLabel = overall === 'ok' ? 'All systems operational' : overall === 'degraded' ? 'Degraded — some checks need attention' : overall === 'down' ? 'Service disruption detected' : 'Running first check…';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle
        title="System Health"
        sub="Live checks against the real Database, Authentication, Storage, Edge Functions and Realtime services — nothing below is simulated."
        action={<Btn variant="primary" onClick={runCheck} disabled={checking}>{checking ? 'Checking…' : 'Check System'}</Btn>}
      />

      <AdminCard>
        <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
          <Icon
            name={checking ? 'refreshCw' : (overall === 'ok' ? 'checkCircle' : overall === 'down' ? 'xCircle' : overall === 'degraded' ? 'alertTriangle' : 'clock')}
            size={22}
            color={overall === 'ok' ? C.success : overall === 'down' ? C.danger : overall === 'degraded' ? C.warning : C.mute}
          />
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>{overallLabel}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{lastCheckedAt ? `Last checked ${fmtRelativeShort(lastCheckedAt)}` : 'Not checked yet this session'}</div>
          </div>
          <div style={{ display:'flex', gap:20 }}>
            {[['Operational', ok, C.success], ['Degraded', degraded, C.warning], ['Unavailable', down, C.danger]].map(([label, count, color]) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color }}>{count}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </AdminCard>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:12 }}>
        {HEALTH_SERVICES.map(svc => {
          const s = statuses[svc.key] || { state:'pending' };
          const tone = s.state === 'ok' ? 'success' : s.state === 'degraded' ? 'warning' : s.state === 'down' ? 'danger' : 'mute';
          return (
            <div key={svc.key} data-testid={`health-card-${svc.key}`}>
            <AdminCard>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <Icon name={svc.icon} size={16} color={C.mute} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, flex:1 }}>{svc.label}</span>
                <StatusPill tone={tone}>{s.state === 'pending' ? 'checking' : s.state}</StatusPill>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>
                {s.state === 'pending' ? 'Running first check…' : `${typeof s.latency === 'number' ? s.latency + ' ms · ' : ''}${lastCheckedAt ? fmtRelativeShort(lastCheckedAt) : ''}`}
              </div>
              {s.message && s.state !== 'ok' && (
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color: tone === 'danger' ? C.danger : C.warning, marginTop:6 }}>{s.message}</div>
              )}
            </AdminCard>
            </div>
          );
        })}
      </div>

      <AdminCard padded={false}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.hairline}`, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Check history</div>
        {historyLoading ? (
          <AdminEmptyRow text="Loading…" />
        ) : history.length === 0 ? (
          <AdminEmptyRow text="No checks recorded yet — click Check System above." />
        ) : history.map((h, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', flexWrap:'wrap' }}>
            <StatusPill tone={h.status === 'ok' ? 'success' : h.status === 'degraded' ? 'warning' : 'danger'}>{h.status}</StatusPill>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink, width:120, textTransform:'capitalize' }}>{String(h.service).replace('_',' ')}</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, width:80 }}>{typeof h.latency_ms === 'number' ? `${h.latency_ms} ms` : '—'}</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, flex:1, minWidth:120 }}>{h.message || ''}</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{fmtRelativeShort(h.checked_at)}</span>
          </div>
        ))}
      </AdminCard>
    </div>
  );
}

// ─── ADMIN — Owner Vault: restricted to explicit, individually-granted
// Owner accounts (public.owner_accounts / is_owner(), see
// supabase/phase9_owner_vault_migration.sql) — deliberately NOT the
// same gate as "any admin". has_permission() gives role='admin' a
// blanket bypass over every permission key, so there is no permission
// string that could ever mean "admin, but not this" — routing Owner
// access through the normal Staff → Roles permission system cannot
// work here. is_owner() is a separate, narrower allowlist instead, and
// there is deliberately no UI to grant it — adding an Owner is a
// direct database action.
function AdminOwnerVaultSection({ onNav }) {
  const [isOwner, setIsOwner] = React.useState(null); // null=checking, false=denied, true=granted
  const [overview, setOverview] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);

  const load = React.useCallback(() => {
    sbAmIOwner().then(owner => {
      setIsOwner(owner);
      if (!owner) return;
      sbAdminGetOwnerVaultOverview().then(({ data, error }) => {
        if (error) { setLoadError(error.message || 'Unable to load Owner Vault data.'); return; }
        setOverview(data);
        setLoadError(null);
      });
    });
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (isOwner === null) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle title="Owner Vault" />
        <AdminCard><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Checking access…</span></AdminCard>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle title="Owner Vault" />
        <AdminCard style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'32px 20px', textAlign:'center' }}>
          <Icon name="lock" size={22} color={C.mute} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>You don't have Owner access</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, maxWidth:420 }}>
            Owner Vault is restricted to specifically designated Owner accounts — this is separate from, and narrower than, full admin
            access. Being an admin does not grant this automatically. An existing Owner can grant Owner access to another account
            directly in the database (there is no self-service option by design); ask whoever manages CLORIVO's Supabase project.
          </div>
        </AdminCard>
      </div>
    );
  }

  const health = overview?.health || [];
  const dbCheck = health.find(h => h.service === 'database');
  const servicesChecked = health.length;
  const servicesDown = health.filter(h => h.status === 'down').length;
  const servicesDegraded = health.filter(h => h.status === 'degraded').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Owner Vault" sub="Sensitive platform overview — visible only to designated Owner accounts" action={
        <Btn variant="secondary" onClick={load}>Refresh</Btn>
      } />

      {loadError && (
        <AdminCard style={{ border:`1.5px solid ${C.danger}` }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{loadError}</span>
        </AdminCard>
      )}

      <AdminCard>
        <AdminField label="Supabase project">
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.ink }}>{overview?.project_ref || 'kpwebnoqsjlxxiamwsst'}</div>
        </AdminField>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Database reachable (from the last recorded check)</span>
            {dbCheck ? (
              <StatusPill tone={dbCheck.status === 'ok' ? 'success' : dbCheck.status === 'degraded' ? 'warning' : 'danger'}>{dbCheck.status}</StatusPill>
            ) : (
              <StatusPill tone="mute">never checked</StatusPill>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Frontend deployment status</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, fontStyle:'italic' }}>Not verifiable from inside the running app — check your hosting provider directly</span>
          </div>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:10 }}>
          A live Supabase project, a reachable backend, and a deployed frontend are three separate facts — this screen never collapses them into one status.
        </div>
      </AdminCard>

      <AdminCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Essential services</span>
          <button onClick={() => onNav('health')} style={{ border:'none', background:'none', color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, cursor:'pointer' }}>Open Health →</button>
        </div>
        {servicesChecked === 0 ? (
          <AdminEmptyRow text="No health checks recorded yet — run one from the Health section." />
        ) : (
          <>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:8 }}>
              {servicesChecked} service{servicesChecked === 1 ? '' : 's'} checked · {servicesDown} down · {servicesDegraded} degraded
            </div>
            {health.map((h, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.ink, textTransform:'capitalize' }}>{String(h.service).replace('_',' ')}</span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{fmtRelativeShort(h.checked_at)}</span>
                  <StatusPill tone={h.status === 'ok' ? 'success' : h.status === 'degraded' ? 'warning' : 'danger'}>{h.status}</StatusPill>
                </div>
              </div>
            ))}
          </>
        )}
      </AdminCard>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12 }}>
        <AdminCard>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Staff & Roles</span>
            <button onClick={() => onNav('staff')} style={{ border:'none', background:'none', color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Open →</button>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{overview?.staff?.active_count ?? 0} active staff · {overview?.staff?.roles_count ?? 0} roles</div>
        </AdminCard>
        <AdminCard>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Audit Log</span>
            <button onClick={() => onNav('auditlog')} style={{ border:'none', background:'none', color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Open →</button>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{overview?.audit?.total ?? 0} entries total</div>
          {overview?.audit?.last && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:4 }}>Last: {overview.audit.last.action} · {fmtRelativeShort(overview.audit.last.created_at)}</div>
          )}
        </AdminCard>
        <AdminCard>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Commissions</span>
            <button onClick={() => onNav('commissions')} style={{ border:'none', background:'none', color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Open →</button>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Rate: {((overview?.commissions?.rate ?? 0) * 100).toFixed(1)}% · Confirmed net: ${(overview?.commissions?.confirmed_net_all_time ?? 0).toFixed(2)}</div>
        </AdminCard>
        <AdminCard>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Platform Settings</span>
            <button onClick={() => onNav('settings')} style={{ border:'none', background:'none', color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Open →</button>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>
            {overview?.settings_last_updated_at ? `Last updated ${fmtRelativeShort(overview.settings_last_updated_at)}` : 'No recorded updates'}
          </div>
        </AdminCard>
      </div>

      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>
        {overview?.generated_at ? `Snapshot generated ${fmtRelativeShort(overview.generated_at)}` : ''}
      </div>
    </div>
  );
}

// ─── ADMIN — Trust & Safety Center (messaging anti-scam filter,
// buyer/seller reports, blocks, and progressive violation history —
// all backed by scam_filter_patterns / message_moderation_log /
// user_reports / user_blocks / user_violations). ────────────────────
const TRUST_SAFETY_REASON_LABELS = {
  external_payment_request: 'External payment request', contact_sharing_attempt: 'Contact-sharing attempt',
  suspected_fraud: 'Suspected fraud', fake_payment: 'Fake payment', harassment: 'Harassment', threats: 'Threats',
  misleading_product: 'Misleading product', confidential_info_request: 'Confidential info request', other: 'Other',
};
const TRUST_SAFETY_CATEGORY_LABELS = {
  phone: 'Phone number', email: 'Email address', social_messaging: 'Social / messaging app',
  link: 'Link', off_platform_payment: 'Off-platform payment', personal_confidential: 'Personal / confidential info',
  platform_bypass: 'Platform-bypass attempt',
};
function AdminTrustSafetySection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canModerate = can('trust_safety.moderate');
  const canView = canModerate || can('trust_safety.view');

  const [tab, setTab] = React.useState('overview'); // overview | reports | log
  const [stats, setStats] = React.useState(null);
  const [reports, setReports] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('OPEN');
  const [modLog, setModLog] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [reviewing, setReviewing] = React.useState(null);
  const [reviewDecision, setReviewDecision] = React.useState('REVIEWED');
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [applyViolation, setApplyViolation] = React.useState(false);
  const [violType, setViolType] = React.useState('scam_filter_evasion');
  const [violSeverity, setViolSeverity] = React.useState('warning');
  const [violAction, setViolAction] = React.useState('Warning issued to user');
  const [history, setHistory] = React.useState(null); // violations of the reported user, shown inside the review modal
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { if (canView) sbAdminGetTrustSafetyStats().then(setStats); }, [canView]);
  React.useEffect(() => {
    if (!canView || tab !== 'reports') return;
    setReports(null);
    sbAdminGetReports({ status: statusFilter }).then(setReports);
  }, [canView, tab, statusFilter]);
  React.useEffect(() => {
    if (!canView || tab !== 'log') return;
    setModLog(null);
    sbAdminGetModerationLog({}).then(setModLog);
  }, [canView, tab]);

  function openReview(report) {
    setReviewing(report); setReviewDecision('REVIEWED'); setReviewNotes('');
    setApplyViolation(false); setViolType('scam_filter_evasion'); setViolSeverity('warning');
    setViolAction('Warning issued to user'); setHistory(null);
    sbAdminGetUserViolations(report.reported_id).then(setHistory);
  }

  async function submitReview() {
    if (!reviewing) return;
    setSaving(true);
    const { error } = await sbAdminReviewReport(reviewing.id, reviewDecision, reviewNotes || null);
    if (error) {
      setSaving(false);
      setToast({ type:'error', message: error.message || 'Could not save this decision.' });
      return;
    }
    if (applyViolation) {
      const { error: vErr } = await sbAdminApplyViolation(reviewing.reported_id, violType, violSeverity, violAction, reviewing.id, reviewNotes || null);
      if (vErr) {
        setSaving(false);
        setToast({ type:'error', message: `Decision saved, but the violation could not be applied: ${vErr.message || 'unknown error'}` });
        return;
      }
    }
    setSaving(false);
    logAdminAction('Reviewed Trust & Safety report', `${reviewDecision}${applyViolation ? ` + ${violSeverity} violation` : ''} — report ${reviewing.id.slice(0,8)}`);
    setToast({ type:'success', message: 'Report decision saved.' });
    setReviewing(null);
    sbAdminGetReports({ status: statusFilter }).then(setReports);
    sbAdminGetTrustSafetyStats().then(setStats);
  }

  if (!canView) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle title="Trust & Safety" />
        <AdminCard><AdminEmptyRow text="You don't have permission to view Trust & Safety data." /></AdminCard>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Trust & Safety" sub="Messaging anti-scam filter, user reports, and moderation history" />

      <div style={{ display:'flex', gap:6 }}>
        {[['overview','Overview'], ['reports','Reports'], ['log','Blocked Messages']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding:'7px 14px', borderRadius:9, border:`1.5px solid ${tab === k ? C.primary : C.hairline}`,
            background: tab === k ? C.primarySoft : C.white, cursor:'pointer',
            fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color: tab === k ? C.primaryDeep : C.mute,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        stats === null ? <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard> : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                { label:'Blocked messages', value: stats.blocked_messages_total ?? 0 },
                { label:'Open reports', value: stats.reports_open ?? 0 },
                { label:'Total reports', value: stats.reports_total ?? 0 },
                { label:'Violations applied', value: stats.violations_total ?? 0 },
              ].map((s, i) => (
                <AdminCard key={i} style={{ flex:'1 1 160px', minWidth:150 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink }}>{s.value}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>{s.label}</div>
                </AdminCard>
              ))}
            </div>
            <AdminCard>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Blocked messages by category</div>
              {Object.keys(stats.blocked_by_category || {}).length === 0 ? (
                <AdminEmptyRow text="No blocked messages yet." />
              ) : Object.entries(stats.blocked_by_category).sort((a,b) => b[1]-a[1]).map(([cat, count]) => (
                <div key={cat} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.hairline}` }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{TRUST_SAFETY_CATEGORY_LABELS[cat] || cat}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.mute }}>{count}</span>
                </div>
              ))}
            </AdminCard>
          </div>
        )
      )}

      {tab === 'reports' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['OPEN','REVIEWED','DISMISSED','ACTIONED','ALL'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding:'5px 11px', borderRadius:7, border:`1px solid ${statusFilter === s ? C.primary : C.hairline}`,
                background: statusFilter === s ? C.primarySoft : C.white, cursor:'pointer',
                fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color: statusFilter === s ? C.primaryDeep : C.mute,
              }}>{s}</button>
            ))}
          </div>
          {reports === null ? <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard> : reports.length === 0 ? (
            <AdminCard><AdminEmptyRow text="No reports in this status." /></AdminCard>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {reports.map(r => (
                <AdminCard key={r.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>
                        {r.reporter?.full_name || 'Unknown'} reported {r.reported?.full_name || 'Unknown'}
                      </span>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{TRUST_SAFETY_REASON_LABELS[r.reason] || r.reason}</span>
                      {r.details && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, fontStyle:'italic' }}>"{r.details}"</span>}
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <StatusPill tone={r.status === 'OPEN' ? 'warning' : r.status === 'ACTIONED' ? 'danger' : r.status === 'DISMISSED' ? 'mute' : 'success'}>{r.status}</StatusPill>
                      {canModerate && r.status === 'OPEN' && (
                        <Btn variant="secondary" size="sm" onClick={() => openReview(r)}>Review</Btn>
                      )}
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'log' && (
        modLog === null ? <AdminCard><AdminEmptyRow text="Loading…" /></AdminCard> : modLog.length === 0 ? (
          <AdminCard><AdminEmptyRow text="No blocked messages yet." /></AdminCard>
        ) : (
          <AdminCard padded={false}>
            {modLog.map((m, i) => (
              <div key={m.id} style={{ padding:'12px 16px', borderBottom: i < modLog.length - 1 ? `1px solid ${C.hairline}` : 'none', display:'flex', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{m.sender?.full_name || 'Unknown'}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{TRUST_SAFETY_CATEGORY_LABELS[m.category] || m.category}{m.content_excerpt ? ` — "${m.content_excerpt}"` : ''}</span>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, flexShrink:0 }}>{new Date(m.created_at).toLocaleString()}</span>
              </div>
            ))}
          </AdminCard>
        )
      )}

      <Modal open={!!reviewing} title="Review report" onClose={() => !saving && setReviewing(null)}>
        {reviewing && (
          <div style={{ display:'flex', flexDirection:'column', gap:14, minWidth:320 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>
              {reviewing.reporter?.full_name || 'Unknown'} reported {reviewing.reported?.full_name || 'Unknown'} — {TRUST_SAFETY_REASON_LABELS[reviewing.reason] || reviewing.reason}
            </div>
            {history && history.length > 0 && (
              <AdminCard style={{ background:C.paper }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.ink, marginBottom:6 }}>Prior violations ({history.length})</div>
                {history.slice(0,5).map(v => (
                  <div key={v.id} style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, padding:'3px 0' }}>
                    {v.severity} — {v.violation_type} ({new Date(v.created_at).toLocaleDateString()})
                  </div>
                ))}
              </AdminCard>
            )}
            <AdminField label="Decision">
              <select value={reviewDecision} onChange={e => setReviewDecision(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
                <option value="REVIEWED">Reviewed (no action)</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="ACTIONED">Actioned</option>
              </select>
            </AdminField>
            <AdminField label="Notes">
              <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} rows={3} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'10px 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, resize:'vertical' }} />
            </AdminField>
            {canModerate && (
              <label style={{ display:'flex', alignItems:'center', gap:8, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, cursor:'pointer' }}>
                <input type="checkbox" checked={applyViolation} onChange={e => setApplyViolation(e.target.checked)} />
                Also apply a violation to the reported user
              </label>
            )}
            {applyViolation && (
              <div style={{ display:'flex', flexDirection:'column', gap:10, paddingLeft:4, borderLeft:`2px solid ${C.hairline}` }}>
                <AdminField label="Violation type">
                  <AdminTextInput value={violType} onChange={setViolType} placeholder="e.g. scam_filter_evasion" />
                </AdminField>
                <AdminField label="Severity">
                  <select value={violSeverity} onChange={e => setViolSeverity(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
                    <option value="warning">Warning</option>
                    <option value="restriction">Temporary restriction</option>
                    <option value="review">Admin review</option>
                    <option value="suspension">Suspension</option>
                  </select>
                </AdminField>
                <AdminField label="Action taken">
                  <AdminTextInput value={violAction} onChange={setViolAction} placeholder="e.g. Warning issued to user" />
                </AdminField>
              </div>
            )}
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <Btn variant="secondary" onClick={() => setReviewing(null)} disabled={saving}>Cancel</Btn>
              <Btn variant="primary" onClick={submitReview} disabled={saving}>{saving ? 'Saving…' : 'Save decision'}</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── ADMIN — Flash Deals (real Supabase data on products.is_flash_deal/
// flash_price/flash_starts_at/flash_ends_at — replaces the old
// window.PRODUCTS-backed mock, which was never connected to any real
// product and never persisted anything). ────────────────────────────
function AdminFlashDealsSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canEdit = can('products.edit') || can('products.approve');

  const [deals, setDeals] = React.useState(null); // null = loading
  const [toast, setToast] = React.useState(null);
  const [editing, setEditing] = React.useState(null); // form state for add/edit, or null
  const [saving, setSaving] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [confirmRemove, setConfirmRemove] = React.useState(null); // the deal row pending removal confirmation

  const load = React.useCallback(() => { sbAdminGetFlashDeals().then(setDeals); }, []);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(() => { sbAdminSearchProductsForFlashDeal(q).then(setSearchResults); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function openForm(product) {
    setEditing({
      id: product.id, title: product.title, price: Number(product.price),
      flashPrice: product.flash_price != null ? String(product.flash_price) : '',
      startsAt: product.flash_starts_at ? product.flash_starts_at.slice(0, 16) : '',
      endsAt: product.flash_ends_at ? product.flash_ends_at.slice(0, 16) : '',
      isActive: product.is_flash_deal ?? true,
    });
    setSearchQuery(''); setSearchResults([]);
  }

  async function saveDeal() {
    if (!editing) return;
    setSaving(true);
    const { error } = await sbAdminSetFlashDeal(editing.id, {
      flashPrice: editing.flashPrice,
      startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString() : null,
      endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString() : null,
      isActive: editing.isActive,
    });
    setSaving(false);
    if (error) { setToast({ type:'error', message: error.message }); return; }
    logAdminAction('Saved flash deal', editing.title, 'products', editing.id);
    setToast({ type:'success', message:'Flash deal saved.' });
    setEditing(null);
    load();
  }

  async function toggleActive(deal) {
    const { error } = await sbAdminSetFlashDeal(deal.id, {
      flashPrice: deal.flash_price, startsAt: deal.flash_starts_at, endsAt: deal.flash_ends_at, isActive: !deal.is_flash_deal,
    });
    if (error) { setToast({ type:'error', message: error.message }); return; }
    logAdminAction(deal.is_flash_deal ? 'Deactivated flash deal' : 'Reactivated flash deal', deal.title, 'products', deal.id);
    load();
  }

  async function doRemove() {
    if (!confirmRemove) return;
    await sbAdminRemoveFlashDeal(confirmRemove.id);
    logAdminAction('Removed flash deal', confirmRemove.title, 'products', confirmRemove.id);
    setToast({ type:'success', message:'Flash deal removed.' });
    setConfirmRemove(null);
    load();
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Flash Deals" sub={deals ? `${deals.length} promotion${deals.length === 1 ? '' : 's'} · live Supabase data` : 'Loading…'} />

      {canEdit && (
        <AdminCard>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Add a product to Flash Deals</div>
          <Input placeholder="Search products by name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchResults.length > 0 && (
            <div style={{ marginTop:8, border:`1px solid ${C.hairline}`, borderRadius:10, overflow:'hidden' }}>
              {searchResults.map((p, i) => (
                <button key={p.id} onClick={() => openForm(p)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', border:'none', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none', background:'none', cursor:'pointer', textAlign:'left' }}>
                  <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{p.title}{p.is_flash_deal ? ' · already a flash deal' : ''}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute }}>${Number(p.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </AdminCard>
      )}

      <AdminCard padded={false}>
        {deals === null ? (
          <div style={{ padding:16, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Loading…</div>
        ) : deals.length === 0 ? (
          <div style={{ padding:16, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No flash deals yet. Search above to add one.</div>
        ) : deals.map((p, i) => {
          const price = Number(p.price), flashPrice = Number(p.flash_price);
          const discountPct = flashPrice > 0 && price > 0 ? Math.round((1 - flashPrice / price) * 100) : 0;
          return (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none', flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 160px', minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{p.shops?.name || '—'}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.danger }}>${flashPrice.toFixed(2)}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.mute, textDecoration:'line-through' }}>${price.toFixed(2)}</div>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.danger, background:'#FDEDED', borderRadius:9999, padding:'2px 8px', flexShrink:0 }}>-{discountPct}%</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, flexShrink:0 }}>
                {p.flash_starts_at ? new Date(p.flash_starts_at).toLocaleDateString() : 'Any time'} → {p.flash_ends_at ? new Date(p.flash_ends_at).toLocaleDateString() : 'No end date'}
              </span>
              {canEdit ? <Switch checked={!!p.is_flash_deal} onChange={() => toggleActive(p)} /> : (
                <StatusPill tone={p.is_flash_deal ? 'success' : 'default'}>{p.is_flash_deal ? 'active' : 'inactive'}</StatusPill>
              )}
              {canEdit && (
                <button onClick={() => openForm(p)} title="Edit" style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                  <Icon name="edit" size={16} color={C.primary} />
                </button>
              )}
              {canEdit && (
                <button onClick={() => setConfirmRemove(p)} title="Remove" style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                  <Icon name="trash" size={16} color={C.danger} />
                </button>
              )}
            </div>
          );
        })}
      </AdminCard>

      {editing && (
        <Modal open title={`Flash Deal — ${editing.title}`} onClose={() => setEditing(null)}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Current price: ${editing.price.toFixed(2)} — the flash price must be lower than this.</div>
            <Input label="Flash price" type="number" step="0.01" value={editing.flashPrice} onChange={e => setEditing(s => ({ ...s, flashPrice: e.target.value }))} />
            <Input label="Starts at (optional)" type="datetime-local" value={editing.startsAt} onChange={e => setEditing(s => ({ ...s, startsAt: e.target.value }))} />
            <Input label="Ends at (optional)" type="datetime-local" value={editing.endsAt} onChange={e => setEditing(s => ({ ...s, endsAt: e.target.value }))} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>Active</span>
              <Switch checked={editing.isActive} onChange={v => setEditing(s => ({ ...s, isActive: v }))} />
            </div>
            <Btn variant="primary" size="md" wide onClick={saveDeal} disabled={saving}>{saving ? 'Saving…' : 'Save Flash Deal'}</Btn>
          </div>
        </Modal>
      )}

      {/* Destructive — only ever removed after this explicit confirmation step. */}
      <Modal open={!!confirmRemove} title="Remove this flash deal?" onClose={() => setConfirmRemove(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.mute }}>
            This removes the promotion from <strong>{confirmRemove?.title}</strong>. The product itself is not deleted or affected otherwise.
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setConfirmRemove(null)}>Cancel</Btn>
            <Btn size="md" style={{ flex:1, color:'#fff', background:C.danger }} onClick={doRemove}>Remove</Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── ADMIN — Inventory (Step 2 — real Supabase data, replaces the old
// window.PRODUCTS-backed mock) ──────────────────────────────────────
function AdminInventorySection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [result, setResult] = React.useState({ rows:[], totalRows:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [filter, setFilter] = React.useState('ALL');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [settings, setSettings] = React.useState(null);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [releasing, setReleasing] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const load = React.useCallback(() => {
    setLoading(true);
    sbAdminGetInventory({ page, limit:20, search, filter }).then(r => { setResult(r); setLoading(false); });
  }, [page, search, filter]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { sbAdminGetInventorySettings().then(setSettings); }, []);

  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  async function saveStock(variantOrRow, isVariant, value) {
    const stock = parseInt(value);
    if (isNaN(stock) || stock < 0) return;
    if (isVariant) await sbUpsertProductVariant({ ...variantOrRow, stock });
    else await sbAdminUpdateProduct(variantOrRow.id, { stock });
    load();
  }

  async function saveExpiry() {
    if (!settings) return;
    setSavingSettings(true);
    await sbAdminUpdateInventorySettings(settings);
    setSavingSettings(false);
    setToast({ type:'success', message:'Inventory settings saved.' });
  }

  async function releaseExpired() {
    setReleasing(true);
    await sbAdminReleaseExpiredReservations();
    setReleasing(false);
    setToast({ type:'success', message:'Expired reservations released.' });
    load();
  }

  const { rows, totalRows, totalPages } = result;
  const canEdit = can('products.edit') || can('products.approve');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Inventory" sub={`${totalRows} product${totalRows === 1 ? '' : 's'} · live Supabase data`} />

      {canEdit && settings && (
        <AdminCard style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Unpaid reservations auto-release after</span>
          <input type="number" value={settings.reservation_expiry_minutes}
            onChange={e => setSettings(s => ({ ...s, reservation_expiry_minutes: parseInt(e.target.value) || 0 }))}
            style={{ width:70, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>minutes</span>
          <Btn size="sm" onClick={saveExpiry} disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save'}</Btn>
          <Btn size="sm" style={{ marginLeft:'auto', color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={releaseExpired} disabled={releasing}>{releasing ? 'Releasing…' : 'Release expired holds now'}</Btn>
        </AdminCard>
      )}

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Product title or SKU…" aria-label="Search inventory"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }} role="tablist" aria-label="Filter inventory">
        {['ALL','OUT_OF_STOCK','LOW_STOCK'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }} aria-pressed={filter === f} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: filter === f ? C.ink : C.paper, color: filter === f ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600 }}>
            {f === 'ALL' ? 'All' : f === 'OUT_OF_STOCK' ? 'Out of stock' : 'Low stock'}
          </button>
        ))}
      </div>

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Product</Th><Th>Variant / SKU</Th><Th align="right">Stock</Th><Th align="right">Reserved</Th><Th align="right">Available</Th><Th>Status</Th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><AdminEmptyRow text="Loading inventory…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={6}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><AdminEmptyRow text="No products match these filters." /></td></tr>
            ) : rows.map(p => {
              const hasVariants = (p.product_variants?.length ?? 0) > 0;
              if (!hasVariants) {
                const available = p.stock ?? 0;
                const status = available === 0 ? 'out of stock' : available < 10 ? 'low stock' : 'in stock';
                return (
                  <tr key={p.id}>
                    <Td>{p.title}</Td>
                    <Td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11.5 }}>{p.sku || '—'}</Td>
                    <Td align="right">
                      {canEdit ? (
                        <input type="number" defaultValue={available} onBlur={e => saveStock(p, false, e.target.value)}
                          style={{ width:70, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} />
                      ) : available}
                    </Td>
                    <Td align="right">—</Td>
                    <Td align="right">{available}</Td>
                    <Td><StatusPill tone={status === 'out of stock' ? 'danger' : status === 'low stock' ? 'warning' : 'success'}>{status}</StatusPill></Td>
                  </tr>
                );
              }
              return p.product_variants.map((v, i) => {
                const available = Math.max(0, v.stock - v.reserved);
                const status = available === 0 ? 'out of stock' : (v.low_stock_threshold != null && available < v.low_stock_threshold) ? 'low stock' : 'in stock';
                return (
                  <tr key={v.id}>
                    <Td>{i === 0 ? p.title : ''}</Td>
                    <Td style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11.5 }}>{[v.size, v.color].filter(Boolean).join(' / ')} · {v.sku}</Td>
                    <Td align="right">
                      {canEdit ? (
                        <input type="number" defaultValue={v.stock} onBlur={e => saveStock(v, true, e.target.value)}
                          style={{ width:70, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} />
                      ) : v.stock}
                    </Td>
                    <Td align="right">{v.reserved}</Td>
                    <Td align="right">{available}</Td>
                    <Td><StatusPill tone={status === 'out of stock' ? 'danger' : status === 'low stock' ? 'warning' : 'success'}>{status}</StatusPill></Td>
                  </tr>
                );
              });
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
      <Toast toast={toast} onClose={() => setToast(null)} />
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
      stock: parseInt(form.stock) || 0, category_id: form.category_id || null, brand_id: form.brand_id || null, sku: form.sku || null,
      image_url: form.image_url,
      condition: form.condition || null,
      authenticity_statement: form.authenticity_statement || null,
      authenticity_proof_paths: form.authenticity_proof_paths || [],
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
                    <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setEditing({ id:p.id, title:p.title, price:p.price, oldPrice:p.compare_price, category_id:p.category_id || '', brand_id:p.brand_id || '', sku:p.sku, image_url:img || null, stock:p.stock })}>
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
                      <button onClick={() => setEditing({ id:p.id, title:p.title, price:p.price, oldPrice:p.compare_price, category_id:p.category_id || '', brand_id:p.brand_id || '', sku:p.sku, image_url:img || null, stock:p.stock })} title="Edit" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
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

function AdminOrdersSection({ accessCtx, initialDetailId = null, onConsumeInitialDetailId }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canEditStatus = can('orders.edit') || can('orders.cancel');
  const [result, setResult] = React.useState({ orders:[], totalOrders:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  // Opens straight into a specific order's detail when arriving from another
  // section's deep link (e.g. Shipping's "#orderId" link) — a plain visit to
  // Orders still starts on the list exactly as before (initialDetailId is
  // null by default, so this is a no-op then).
  const [detailId, setDetailId] = React.useState(initialDetailId);
  React.useEffect(() => { if (initialDetailId && onConsumeInitialDetailId) onConsumeInitialDetailId(); }, []);
  const [newOrderFlash, setNewOrderFlash] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState(null); // { orderId, from, to }
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [statusError, setStatusError] = React.useState('');

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

  // Applies only after the admin explicitly confirms via the bar below —
  // never on the raw select change — and surfaces a real server error
  // instead of silently swallowing it (e.g. a 'refunded' attempt, now
  // rejected by sbAdminUpdateOrderStatus; see that function for why).
  async function applyStatusChange() {
    if (!pendingStatus) return;
    setStatusBusy(true); setStatusError('');
    const { error } = await sbAdminUpdateOrderStatus(pendingStatus.orderId, pendingStatus.to);
    setStatusBusy(false);
    if (error) { setStatusError(error.message || 'Could not update this order.'); return; }
    logAdminAction('Updated order status', `#${pendingStatus.orderId.slice(0,8)} → ${pendingStatus.to}`);
    setPendingStatus(null);
    load();
  }

  // Used by AdminOrderDetail's own status selector — same confirm-before-apply
  // contract, just driven from that screen instead of this list's row.
  async function handleStatusChange(orderId, newStatus) {
    const { error } = await sbAdminUpdateOrderStatus(orderId, newStatus);
    if (error) return { error };
    logAdminAction('Updated order status', `#${orderId.slice(0,8)} → ${newStatus}`);
    load();
    return { error: null };
  }

  if (detailId) return <AdminOrderDetail orderId={detailId} accessCtx={accessCtx} onBack={() => { setDetailId(null); load(); }} onStatusChange={handleStatusChange} />;

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
        {/* 'refunded' is not a fulfillment status — see sbAdminUpdateOrderStatus — so it is not offered as a filter. Refund progress is shown via the Payment column/pill instead. */}
        {['ALL', ...ORDER_STATUSES].map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: status === s ? C.ink : C.paper, color: status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s}</button>
        ))}
      </div>

      {pendingStatus && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', background:'#FFF6E5', border:`1px solid ${C.warning}`, borderRadius:12, padding:'10px 14px' }}>
          <Icon name="alertTriangle" size={15} color={C.warning} />
          <span style={{ flex:1, minWidth:200, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>
            Change order #{pendingStatus.orderId.slice(0,8)} from <strong style={{ textTransform:'capitalize' }}>{pendingStatus.from}</strong> to <strong style={{ textTransform:'capitalize' }}>{pendingStatus.to}</strong>?
          </span>
          <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setPendingStatus(null)} disabled={statusBusy}>Cancel</Btn>
          <Btn size="sm" variant="primary" onClick={applyStatusChange} disabled={statusBusy}>{statusBusy ? 'Applying…' : 'Confirm'}</Btn>
        </div>
      )}
      {statusError && <div role="alert" style={{ background:'#FDEDED', borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{statusError}</div>}

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Order</Th><Th>Placed</Th><Th>Customer</Th><Th>Seller</Th><Th align="right">Total</Th><Th>Payment</Th><Th>Status</Th><Th align="right">Actions</Th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><AdminEmptyRow text="Loading orders…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={8}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8}><AdminEmptyRow text="No orders yet" /></td></tr>
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
                <Td><StatusPill tone={o.payment_status === 'paid' ? 'success' : o.payment_status === 'failed' ? 'danger' : o.payment_status === 'refunded' || o.payment_status === 'partially_refunded' ? 'mute' : 'warning'}>{o.payment_status || 'pending'}</StatusPill></Td>
                <Td>
                  <select value={o.status} disabled={!canEditStatus}
                    onChange={e => { if (e.target.value !== o.status) setPendingStatus({ orderId:o.id, from:o.status, to:e.target.value }); }}
                    title={canEditStatus ? undefined : 'You do not have permission to change order status (orders.edit or orders.cancel required).'}
                    style={{ border:'none', borderRadius:9999, padding:'4px 10px', cursor: canEditStatus ? 'pointer' : 'not-allowed', opacity: canEditStatus ? 1 : 0.6, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, textTransform:'capitalize', ...(() => { const t = { success:{bg:'#EFF9F4',fg:C.success}, danger:{bg:'#FDEDED',fg:C.danger}, warning:{bg:'#FFF6E5',fg:C.warning}, mute:{bg:C.paper,fg:C.mute}, primary:{bg:C.primarySoft,fg:C.primaryDeep}, info:{bg:'#EBF2FF',fg:'#2563EB'} }[ORDER_STATUS_TONE[o.status] || 'mute']; return { background:t.bg, color:t.fg }; })() }}>
                    {o.status === 'refunded' && <option value="refunded">refunded</option>}
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
                <Td align="right">
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => setDetailId(o.id)} title="View details" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="eye" size={14} color={C.mute} />
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

const PAYMENT_STATUS_TONE = { pending:'warning', paid:'success', failed:'danger', refunded:'mute', partially_refunded:'mute' };

function AdminOrderDetail({ orderId, accessCtx, onBack, onStatusChange }) {
  const [order, setOrder] = React.useState(null);
  const [fetching, setFetching] = React.useState(true);
  const [intents, setIntents] = React.useState([]);
  const [refunds, setRefunds] = React.useState([]);
  const [commissions, setCommissions] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const [startingRefund, setStartingRefund] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('');
  const [recordingRefundId, setRecordingRefundId] = React.useState(null);
  const [recordAmount, setRecordAmount] = React.useState('');
  const [recordRef, setRecordRef] = React.useState('');
  const [pendingAction, setPendingAction] = React.useState(null); // { message, run, danger }
  const [rejectingId, setRejectingId] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [restockingItemId, setRestockingItemId] = React.useState(null);
  const [restockQty, setRestockQty] = React.useState('');
  const [restockNotes, setRestockNotes] = React.useState('');

  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canEditStatus = can('orders.edit') || can('orders.cancel');

  const refresh = React.useCallback(() => {
    setFetching(true);
    Promise.all([
      sbAdminGetOrderDetail(orderId),
      sbAdminGetPaymentIntents({ orderId }),
      sbAdminGetRefundRequests({ orderId, limit: 50 }),
      sbAdminGetCommissionLedger({ orderId }),
    ]).then(([o, ints, refundsRes, ledger]) => {
      setOrder(o); setIntents(ints); setRefunds(refundsRes.requests || []); setCommissions(ledger || []); setFetching(false);
    });
  }, [orderId]);
  React.useEffect(() => { refresh(); }, [refresh]);

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

  // Separate from the refund workflow on purpose — money (refund) and
  // physical goods (return) are different facts. This never fires
  // automatically from a refund decision; an admin with orders.refund
  // must explicitly confirm the returned quantity here, and only that
  // validated quantity is restocked (admin_validate_return_and_restock).
  async function submitRestock(item) {
    const qty = parseInt(restockQty);
    if (!qty || qty <= 0) { setErr('Enter how many units were actually returned.'); return; }
    setBusy(true); setErr('');
    const { error } = await sbAdminValidateReturnAndRestock(item.id, qty, restockNotes.trim() || null);
    setBusy(false);
    if (error) { setErr(error.message || 'Could not record this return.'); return; }
    setRestockingItemId(null); setRestockQty(''); setRestockNotes('');
    refresh();
  }
  const alreadyRefunded = refunds.reduce((s, r) => s + (r.refunds || []).filter(x => x.status === 'succeeded').reduce((s2, x) => s2 + (x.amount || 0), 0), 0);
  const pendingRequestAmount = refunds.filter(r => ['requested','under_review','approved','processing'].includes(r.status)).reduce((s, r) => s + (r.amount_requested || 0), 0);
  const remaining = (order.total_amount ?? 0) - alreadyRefunded - pendingRequestAmount;
  const canRefund = ['paid','partially_refunded'].includes(order.payment_status) && remaining > 0;

  async function runAction(fn) {
    setBusy(true); setErr('');
    const { error } = await fn();
    setBusy(false);
    if (error) { setErr(error.message || 'This action was rejected by the server.'); return false; }
    refresh();
    return true;
  }

  // Every sensitive action on this page (status change, payment confirm/fail,
  // refund approve) routes through this bar instead of firing on click —
  // nothing here mutates local state optimistically; the UI only reflects
  // what the server actually confirmed, via refresh() inside runAction.
  function confirmThen(message, run, danger) { setPendingAction({ message, run, danger }); }
  async function runPendingAction() {
    if (!pendingAction) return;
    const ok = await runAction(pendingAction.run);
    if (ok) setPendingAction(null);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:640 }}>
      <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, padding:0, width:'fit-content' }}>
        <Icon name="arrowLeft" size={16} color={C.mute} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Orders</span>
      </button>

      <AdminCard>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink }}>Order #{order.id.slice(0,8)}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:2 }}>{new Date(order.created_at).toLocaleString('en-US', { month:'long', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <StatusPill tone={PAYMENT_STATUS_TONE[order.payment_status] || 'warning'}>{order.payment_status || 'pending'}</StatusPill>
            <StatusPill tone={tone}>{order.status}</StatusPill>
          </div>
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
          <div key={it.id} style={{ borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{it.title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{it.shops?.name || '—'} · Qty {it.quantity} · <span style={{ textTransform:'capitalize' }}>{it.fulfillment_status || 'pending'}</span></div>
            </div>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${(it.unit_price ?? 0).toFixed(2)}</span>
          </div>
          {can('orders.refund') && ['paid','partially_refunded','refunded'].includes(order.payment_status) && (
            restockingItemId === it.id ? (
              <div style={{ display:'flex', flexDirection:'column', gap:6, padding:'0 16px 12px' }}>
                <div style={{ display:'flex', gap:6 }}>
                  <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder={`Units returned (max ${it.quantity})`} max={it.quantity} min={1}
                    style={{ flex:1, height:34, border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'0 10px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} />
                </div>
                <input value={restockNotes} onChange={e => setRestockNotes(e.target.value)} placeholder="Notes (optional)"
                  style={{ height:34, border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'0 10px', fontFamily:"'Inter',sans-serif", fontSize:12.5 }} />
                <div style={{ display:'flex', gap:6 }}>
                  <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setRestockingItemId(null); setRestockQty(''); setRestockNotes(''); }} disabled={busy}>Cancel</Btn>
                  <Btn size="sm" variant="primary" style={{ flex:1 }} onClick={() => submitRestock(it)} disabled={busy}>{busy ? 'Saving…' : 'Confirm return & restock'}</Btn>
                </div>
              </div>
            ) : (
              <div style={{ padding:'0 16px 10px' }}>
                <button onClick={() => { setRestockingItemId(it.id); setRestockQty(''); setRestockNotes(''); }} style={{ border:'none', background:'none', cursor:'pointer', padding:0, fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.primary, fontWeight:600 }}>
                  Validate physical return &amp; restock this item
                </button>
              </div>
            )
          )}
          </div>
        ))}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', borderTop:`1px solid ${C.hairline}` }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Total</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:800, color:C.ink }}>${(order.total_amount ?? 0).toFixed(2)} {order.currency || 'USD'}</span>
        </div>
      </AdminCard>

      {pendingAction && (
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', background: pendingAction.danger ? '#FDEDED' : '#FFF6E5', border:`1px solid ${pendingAction.danger ? C.danger : C.warning}`, borderRadius:12, padding:'10px 14px' }}>
          <Icon name="alertTriangle" size={15} color={pendingAction.danger ? C.danger : C.warning} />
          <span style={{ flex:1, minWidth:200, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>{pendingAction.message}</span>
          <Btn size="sm" style={{ color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setPendingAction(null)} disabled={busy}>Cancel</Btn>
          <Btn size="sm" variant={pendingAction.danger ? 'danger' : 'primary'} onClick={runPendingAction} disabled={busy}>{busy ? 'Applying…' : 'Confirm'}</Btn>
        </div>
      )}
      {err && <div role="alert" style={{ background:'#FDEDED', borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{err}</div>}

      <AdminCard>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>Fulfillment status</div>
        <select value={order.status} disabled={!canEditStatus}
          onChange={e => {
            const to = e.target.value;
            if (to === order.status) return;
            confirmThen(
              <>Change this order's status from <strong style={{ textTransform:'capitalize' }}>{order.status}</strong> to <strong style={{ textTransform:'capitalize' }}>{to}</strong>?</>,
              () => onStatusChange(order.id, to),
              to === 'cancelled'
            );
          }}
          title={canEditStatus ? undefined : 'You do not have permission to change order status (orders.edit or orders.cancel required).'}
          style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white, cursor: canEditStatus ? 'pointer' : 'not-allowed', opacity: canEditStatus ? 1 : 0.6 }}>
          {order.status === 'refunded' && <option value="refunded">refunded</option>}
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </AdminCard>

      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:8 }}>Payment attempts</div>
        <AdminCard padded={false}>
          {intents.length === 0 ? <AdminEmptyRow text="No payment attempt recorded yet." /> : intents.map((it, i) => (
            <div key={it.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink, textTransform:'capitalize' }}>{it.provider} · ${Number(it.amount).toFixed(2)}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(it.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}{it.provider_reference ? ` · ref ${it.provider_reference}` : ''}</div>
              </div>
              <StatusPill tone={it.status === 'succeeded' ? 'success' : it.status === 'failed' ? 'danger' : 'warning'}>{it.status}</StatusPill>
              {it.status === 'pending' && can('payments.confirm') && (
                <div style={{ display:'flex', gap:6 }}>
                  <button disabled={busy} title="Mark failed" style={{ border:`1px solid ${C.danger}`, background:'#FDEDED', borderRadius:8, width:30, height:30, cursor:'pointer' }}
                    onClick={() => confirmThen(<>Mark this {it.provider} payment attempt of ${Number(it.amount).toFixed(2)} as <strong>failed</strong>?</>, () => sbAdminConfirmPayment(it.id, 'failed'), true)}>
                    <Icon name="x" size={14} color={C.danger} />
                  </button>
                  <button disabled={busy} title="Confirm paid" style={{ border:`1px solid ${C.success}`, background:'#EFF9F4', borderRadius:8, width:30, height:30, cursor:'pointer' }}
                    onClick={() => confirmThen(<>Confirm this {it.provider} payment of ${Number(it.amount).toFixed(2)} as <strong>succeeded</strong>? This marks the order paid and records seller commission.</>, () => sbAdminConfirmPayment(it.id, 'succeeded'), false)}>
                    <Icon name="check" size={14} color={C.success} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </AdminCard>
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>Refunds {remaining > 0 ? `· $${remaining.toFixed(2)} refundable` : ''}</span>
          {canRefund && can('orders.refund') && !startingRefund && (
            <Btn size="sm" variant="secondary" style={{ color:C.danger }} onClick={() => setStartingRefund(true)}>Start a refund</Btn>
          )}
        </div>

        {startingRefund && (
          <AdminCard style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:10 }}>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Reason — this is shown to the seller/buyer record." rows={2}
              style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, resize:'vertical' }} />
            <div style={{ display:'flex', gap:8 }}>
              <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setStartingRefund(false); setRefundReason(''); }} disabled={busy}>Cancel</Btn>
              <Btn size="sm" variant="danger" style={{ flex:1 }} disabled={busy || !refundReason.trim()}
                onClick={async () => { const ok = await runAction(() => sbAdminInitiateRefund(order.id, refundReason)); if (ok) { setStartingRefund(false); setRefundReason(''); } }}>
                Approve refund request
              </Btn>
            </div>
          </AdminCard>
        )}

        <AdminCard padded={false}>
          {refunds.length === 0 ? <AdminEmptyRow text="No refund activity on this order." /> : refunds.map((r, i) => (
            <div key={r.id} style={{ padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>${Number(r.amount_requested).toFixed(2)} requested</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{r.reason}</div>
                </div>
                <StatusPill tone={r.status === 'succeeded' ? 'success' : r.status === 'rejected' || r.status === 'failed' ? 'danger' : 'warning'}>{r.status}</StatusPill>
              </div>
              {r.status === 'requested' && can('orders.refund') && (
                rejectingId === r.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejecting — recorded on this refund request." rows={2}
                      style={{ border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, resize:'vertical' }} />
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => { setRejectingId(null); setRejectReason(''); }} disabled={busy}>Cancel</Btn>
                      <Btn size="sm" variant="danger" style={{ flex:1 }} disabled={busy || !rejectReason.trim()}
                        onClick={async () => { const ok = await runAction(() => sbAdminDecideRefund(r.id, 'rejected', rejectReason.trim())); if (ok) { setRejectingId(null); setRejectReason(''); } }}>
                        Confirm rejection
                      </Btn>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:6, marginTop:8 }}>
                    <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} disabled={busy}
                      onClick={() => setRejectingId(r.id)}>Reject</Btn>
                    <Btn size="sm" variant="primary" style={{ flex:1 }} disabled={busy}
                      onClick={() => confirmThen(<>Approve this ${Number(r.amount_requested).toFixed(2)} refund request?</>, () => sbAdminDecideRefund(r.id, 'approved'), false)}>Approve</Btn>
                  </div>
                )
              )}
              {['approved','processing'].includes(r.status) && can('payments.confirm') && (
                recordingRefundId === r.id ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={recordAmount} onChange={e => setRecordAmount(e.target.value)} placeholder={`Amount (≤ $${Number(r.amount_approved).toFixed(2)})`}
                        style={{ flex:1, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'7px 10px', fontFamily:"'JetBrains Mono',monospace", fontSize:12.5 }} />
                      <input value={recordRef} onChange={e => setRecordRef(e.target.value)} placeholder="Provider reference"
                        style={{ flex:1, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'7px 10px', fontFamily:"'Inter',sans-serif", fontSize:12.5 }} />
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setRecordingRefundId(null)} disabled={busy}>Cancel</Btn>
                      <Btn size="sm" style={{ flex:1, color:C.danger, border:`1.5px solid ${C.danger}`, background:'transparent' }} disabled={busy}
                        onClick={() => runAction(() => sbAdminRecordRefundResult(r.id, 'failed', r.amount_requested, recordRef || null, 'Recorded as failed'))}>Mark failed</Btn>
                      <Btn size="sm" variant="primary" style={{ flex:1 }} disabled={busy || !recordAmount}
                        onClick={async () => { const ok = await runAction(() => sbAdminRecordRefundResult(r.id, 'succeeded', parseFloat(recordAmount), recordRef || null)); if (ok) { setRecordingRefundId(null); setRecordAmount(''); setRecordRef(''); } }}>
                        Confirm refunded
                      </Btn>
                    </div>
                  </div>
                ) : (
                  <Btn size="sm" variant="secondary" style={{ marginTop:8 }} onClick={() => { setRecordingRefundId(r.id); setRecordAmount(String(r.amount_approved ?? '')); }}>Record provider result</Btn>
                )
              )}
            </div>
          ))}
        </AdminCard>
      </div>

      <div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, marginBottom:8 }}>Seller commission</div>
        <AdminCard padded={false}>
          {commissions.length === 0 ? <AdminEmptyRow text="No commission entries yet — created automatically once a payment is confirmed." /> : commissions.map((c, i) => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink }}>{c.shops?.name || 'Seller'} · {c.entry_type === 'refund_reversal' ? 'Refund reversal' : 'Charge'}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Gross ${Number(c.gross_amount).toFixed(2)} · Rate {(Number(c.commission_rate) * 100).toFixed(0)}% · {new Date(c.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color: Number(c.commission_amount) < 0 ? C.danger : C.ink }}>{Number(c.commission_amount) < 0 ? '-' : ''}${Math.abs(Number(c.commission_amount)).toFixed(2)}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>commission</div>
              </div>
              <StatusPill tone={c.status === 'confirmed' ? 'success' : 'warning'}>{c.status}</StatusPill>
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}

// ─── ADMIN SHIPPING MANAGEMENT ────────────────────────────────────
// Cross-order shipment search (requires shipping.view). Each row is one
// seller's shipment, never a whole-order summary, so a multi-vendor order
// shows up as one row per seller here. Override requires shipping.manage
// AND a mandatory note — enforced again server-side regardless of this
// screen's own gating.
const SHIPMENT_STATUS_TONE = { pending:'mute', processing:'primary', shipped:'info', in_transit:'info', delivered:'success', failed:'danger', returned:'danger', cancelled:'mute' };
const SHIPMENT_STATUSES = ['pending','processing','shipped','in_transit','delivered','failed','returned','cancelled'];

function AdminShippingSection({ accessCtx, onViewOrder }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const canView = can('shipping.view') || can('shipping.manage');
  const [result, setResult] = React.useState({ shipments:[], totalShipments:0, totalPages:0, currentPage:1 });
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState('ALL');
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [carrierInput, setCarrierInput] = React.useState('');
  const [carrier, setCarrier] = React.useState('');
  const [exceptionsOnly, setExceptionsOnly] = React.useState(false);
  const [carriers, setCarriers] = React.useState([]);
  const [detailShipment, setDetailShipment] = React.useState(null);
  const [overrideShipment, setOverrideShipment] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  const load = React.useCallback(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    sbAdminGetShipments({ page, limit:PAGE_SIZE, status, search, carrier, exceptionsOnly }).then(r => { setResult(r); setLoading(false); });
  }, [page, status, search, carrier, exceptionsOnly, canView]);

  React.useEffect(() => { load(); }, [load]);

  // Real carrier catalog (shipping_carriers) instead of free text, so the
  // filter and the override form can never drift into inconsistent spellings
  // of the same carrier. If the table has no rows yet, both fall back to a
  // plain text field rather than rendering a dropdown with nothing in it —
  // never fabricated carrier names.
  React.useEffect(() => { if (canView) sbAdminGetCarriersList().then(setCarriers); }, [canView]);

  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  React.useEffect(() => {
    const t = setTimeout(() => { setPage(1); setCarrier(carrierInput); }, 350);
    return () => clearTimeout(t);
  }, [carrierInput]);

  if (!canView) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <SectionTitle title="Shipping" />
        <AdminCard style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'32px 20px', textAlign:'center' }}>
          <Icon name="lock" size={22} color={C.mute} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>You don't have access to Shipping</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, maxWidth:360 }}>This section requires the <strong>shipping.view</strong> or <strong>shipping.manage</strong> permission. Ask an admin to grant it under Staff → Roles.</div>
        </AdminCard>
      </div>
    );
  }

  const { shipments, totalShipments, totalPages } = result;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Shipping" sub={`${totalShipments} shipment${totalShipments === 1 ? '' : 's'}`} />

      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ flex:'1 1 220px', position:'relative' }}>
          <Icon name="search" size={15} color={C.mute} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Order ID, shipment ID or tracking number…"
            style={{ width:'100%', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px 9px 34px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        </div>
        {carriers.length > 0 ? (
          <select value={carrier} onChange={e => { setCarrier(e.target.value); setCarrierInput(e.target.value); setPage(1); }}
            style={{ flex:'0 1 170px', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }}>
            <option value="">All carriers</option>
            {carriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input value={carrierInput} onChange={e => setCarrierInput(e.target.value)} placeholder="Carrier…"
            style={{ flex:'0 1 160px', border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'9px 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, background:C.white }} />
        )}
        <button onClick={() => { setExceptionsOnly(v => !v); setPage(1); }} style={{
          border: exceptionsOnly ? 'none' : `1.5px solid ${C.hairline}`, borderRadius:9999, padding:'8px 14px', cursor:'pointer',
          background: exceptionsOnly ? C.danger : C.white, color: exceptionsOnly ? '#fff' : C.ink,
          fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, display:'flex', alignItems:'center', gap:6,
        }}>
          <Icon name="alertTriangle" size={13} color={exceptionsOnly ? '#fff' : C.danger} /> Delivery exceptions
        </button>
      </div>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['ALL', ...SHIPMENT_STATUSES].map(s => (
          <button key={s} onClick={() => { setStatus(s); setExceptionsOnly(false); setPage(1); }} style={{ border:'none', borderRadius:9999, padding:'7px 14px', cursor:'pointer', background: !exceptionsOnly && status === s ? C.ink : C.paper, color: !exceptionsOnly && status === s ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, textTransform:'capitalize' }}>{s === 'ALL' ? 'All' : s.replace('_',' ')}</button>
        ))}
      </div>

      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Order</Th><Th>Seller</Th><Th>Items</Th><Th>Carrier / Tracking</Th><Th>Status</Th><Th align="right">Fee</Th><Th align="right">Actions</Th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Loading shipments…" /></td></tr>
            ) : result.timedOut ? (
              <tr><td colSpan={7}><AdminEmptyRow text="Couldn't reach the server — check your connection and try again." /></td></tr>
            ) : shipments.length === 0 ? (
              <tr><td colSpan={7}><AdminEmptyRow text="No shipments match these filters" /></td></tr>
            ) : shipments.map(s => (
              <tr key={s.id}>
                <Td>
                  {onViewOrder ? (
                    <button onClick={() => onViewOrder(s.order_id)} title="Open this order in Orders"
                      style={{ border:'none', background:'none', cursor:'pointer', padding:0, fontWeight:700, fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:C.primary, textDecoration:'underline' }}>
                      #{s.order_id.slice(0,8)}
                    </button>
                  ) : (
                    <span style={{ fontWeight:700, fontFamily:"'JetBrains Mono',monospace" }}>#{s.order_id.slice(0,8)}</span>
                  )}
                </Td>
                <Td>
                  <div style={{ fontWeight:600 }}>{s.profiles?.full_name || 'Seller'}</div>
                  <div style={{ fontSize:11, color:C.mute }}>{s.shops?.name || ''}</div>
                </Td>
                <Td style={{ fontSize:12 }}>{(s.order_items ?? []).map(it => it.title).join(', ') || '—'}</Td>
                <Td>
                  {s.tracking_number ? (
                    <>
                      <div style={{ fontWeight:600 }}>{s.carrier || '—'}</div>
                      <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:C.mute }}>{s.tracking_number}</div>
                    </>
                  ) : <span style={{ color:C.mute }}>—</span>}
                </Td>
                <Td><StatusPill tone={SHIPMENT_STATUS_TONE[s.status] || 'mute'}>{s.status.replace('_',' ')}</StatusPill></Td>
                <Td align="right" style={{ fontFamily:"'JetBrains Mono',monospace" }}>${(s.shipping_fee ?? 0).toFixed(2)}</Td>
                <Td align="right">
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => setDetailShipment(s)} title="View details" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon name="eye" size={14} color={C.mute} />
                    </button>
                    {can('shipping.manage') && (
                      <button onClick={() => setOverrideShipment(s)} title="Correct this shipment" style={{ border:`1px solid ${C.hairline}`, background:C.white, borderRadius:8, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Icon name="edit" size={14} color={C.mute} />
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

      {detailShipment && (
        <AdminShipmentDetail
          shipment={detailShipment}
          canManage={can('shipping.manage')}
          onClose={() => setDetailShipment(null)}
          onViewOrder={onViewOrder}
          onCorrect={() => { setOverrideShipment(detailShipment); setDetailShipment(null); }}
        />
      )}

      {overrideShipment && (
        <AdminShipmentOverrideModal
          shipment={overrideShipment}
          carriers={carriers}
          onClose={() => setOverrideShipment(null)}
          onDone={() => { setOverrideShipment(null); setToast({ type:'success', message:'Shipment updated.' }); load(); }}
          onLog={(detail) => logAdminAction('Overrode shipment', detail, 'shipments', overrideShipment.id)}
        />
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// Read-only: lets the admin inspect a shipment (items, tracking, full
// shipment_status_history timeline) without entering the correction form —
// "Correct this shipment" is one explicit extra click away, never implicit.
function AdminShipmentDetail({ shipment, canManage, onClose, onViewOrder, onCorrect }) {
  const s = shipment;
  const history = s.shipment_status_history ?? [];
  const HISTORY_SOURCE_LABEL = { seller:'Seller update', admin_override:'Admin correction', system:'System', carrier_api:'Carrier' };

  return (
    <Modal open title="Shipment details" onClose={onClose}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Order</div>
            {onViewOrder ? (
              <button onClick={() => { onViewOrder(s.order_id); onClose(); }} style={{ border:'none', background:'none', cursor:'pointer', padding:0, fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.primary, textDecoration:'underline' }}>
                #{s.order_id.slice(0,8)}
              </button>
            ) : (
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.ink }}>#{s.order_id.slice(0,8)}</div>
            )}
          </div>
          <StatusPill tone={SHIPMENT_STATUS_TONE[s.status] || 'mute'}>{s.status.replace('_',' ')}</StatusPill>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Seller</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{s.profiles?.full_name || 'Seller'} {s.shops?.name ? `· ${s.shops.name}` : ''}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{s.profiles?.email || ''}</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Items</div>
          {(s.order_items ?? []).length === 0 ? (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>—</div>
          ) : (s.order_items ?? []).map(it => (
            <div key={it.id} style={{ display:'flex', justifyContent:'space-between', fontFamily:"'Inter',sans-serif", fontSize:13 }}>
              <span style={{ color:C.ink }}>{it.title} <span style={{ color:C.mute }}>×{it.quantity}</span></span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.ink }}>${Number(it.unit_price ?? 0).toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, background:C.paper, borderRadius:12, padding:12 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Carrier</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{s.carrier || '—'}</div>
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Tracking number</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:C.ink }}>{s.tracking_number || '—'}</div>
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Estimated delivery</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{s.estimated_delivery ? new Date(s.estimated_delivery).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '—'}</div>
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Shipping fee</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:C.ink }}>${(s.shipping_fee ?? 0).toFixed(2)}</div>
          </div>
        </div>
        {s.failure_reason && (
          <div style={{ background:'#FDEDED', borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>Issue: {s.failure_reason}</div>
        )}

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginBottom:6 }}>History ({history.length})</div>
          {history.length === 0 ? (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No recorded status changes yet.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:220, overflowY:'auto' }}>
              {history.slice().reverse().map(h => (
                <div key={h.id} style={{ borderLeft:`2px solid ${h.source === 'admin_override' ? C.warning : C.hairline}`, paddingLeft:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, textTransform:'capitalize' }}>{h.status.replace('_',' ')}</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{new Date(h.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{HISTORY_SOURCE_LABEL[h.source] || h.source}{h.note ? ` — ${h.note}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canManage && <Btn wide onClick={onCorrect}>Correct this shipment</Btn>}
      </div>
    </Modal>
  );
}

function AdminShipmentOverrideModal({ shipment, carriers, onClose, onDone, onLog }) {
  const knownCarriers = React.useMemo(() => {
    const list = carriers || [];
    return shipment.carrier && !list.includes(shipment.carrier) ? [shipment.carrier, ...list] : list;
  }, [carriers, shipment.carrier]);
  const [status, setStatus] = React.useState(shipment.status);
  const [carrier, setCarrier] = React.useState(shipment.carrier || '');
  const [useOtherCarrier, setUseOtherCarrier] = React.useState(knownCarriers.length === 0);
  const [trackingNumber, setTrackingNumber] = React.useState(shipment.tracking_number || '');
  const [estimatedDelivery, setEstimatedDelivery] = React.useState(shipment.estimated_delivery || '');
  const [failureReason, setFailureReason] = React.useState(shipment.failure_reason || '');
  const [note, setNote] = React.useState('');
  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit() {
    setSaving(true);
    setError('');
    const { error: err } = await sbAdminOverrideShipment(shipment.id, {
      status, carrier: carrier || null, trackingNumber: trackingNumber || null, estimatedDelivery: estimatedDelivery || null,
      failureReason: status === 'failed' ? (failureReason.trim() || null) : null,
    }, note.trim());
    setSaving(false);
    if (err) { setError(err.message || 'Could not apply this override.'); return; }
    onLog(`#${shipment.order_id.slice(0,8)} → ${status} (${note.trim()})`);
    onDone();
  }

  const changed = status !== shipment.status || carrier !== (shipment.carrier || '') || trackingNumber !== (shipment.tracking_number || '') || estimatedDelivery !== (shipment.estimated_delivery || '');

  return (
    <Modal open title="Correct shipment" onClose={onClose}>
      <div style={{ marginBottom:14, fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>
        This is a correction tool, not a routine edit — every override is written to this shipment's permanent history with your note attached, and the buyer may be notified if the status actually changes.
      </div>
      <AdminField label="Status">
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5 }}>
          {SHIPMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </AdminField>
      <div style={{ height:10 }} />
      <AdminField label="Carrier">
        {useOtherCarrier || knownCarriers.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <AdminTextInput value={carrier} onChange={setCarrier} placeholder="e.g. DHL" />
            {knownCarriers.length > 0 && (
              <button onClick={() => setUseOtherCarrier(false)} style={{ border:'none', background:'none', cursor:'pointer', padding:0, textAlign:'left', fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.primary }}>Choose from the carrier list instead</button>
            )}
          </div>
        ) : (
          <select value={carrier} onChange={e => { if (e.target.value === '__other__') setUseOtherCarrier(true); else setCarrier(e.target.value); }}
            style={{ height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, width:'100%' }}>
            <option value="">No carrier</option>
            {knownCarriers.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__other__">Other…</option>
          </select>
        )}
      </AdminField>
      <div style={{ height:10 }} />
      <AdminField label="Tracking number"><AdminTextInput value={trackingNumber} onChange={setTrackingNumber} placeholder="Optional" mono /></AdminField>
      <div style={{ height:10 }} />
      <AdminField label="Estimated delivery">
        <input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)}
          style={{ width:'100%', height:40, border:`1.5px solid ${C.hairline}`, borderRadius:9, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, background:C.white }} />
      </AdminField>
      {status === 'failed' && (
        <>
          <div style={{ height:10 }} />
          <AdminField label="Failure reason">
            <AdminTextInput value={failureReason} onChange={setFailureReason} placeholder="e.g. Address not found — recipient unreachable" />
          </AdminField>
        </>
      )}
      <div style={{ height:10 }} />
      <AdminField label="Note (required)"><AdminTextInput value={note} onChange={setNote} placeholder="Why is this being corrected?" /></AdminField>
      {error && <div role="alert" style={{ marginTop:10, background:'#FDEDED', borderRadius:10, padding:'8px 12px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>}

      {confirming ? (
        <div style={{ marginTop:14, background: changed ? '#FFF6E5' : C.paper, border:`1px solid ${changed ? C.warning : C.hairline}`, borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'#92400E' }}>
            {changed ? <>Apply this correction — status <strong style={{ textTransform:'capitalize' }}>{status.replace('_',' ')}</strong>, carrier <strong>{carrier || '—'}</strong>, tracking <strong>{trackingNumber || '—'}</strong>? This is written to the shipment's permanent history.</>
                     : 'No field actually changed — this will only add a note to the history. Continue?'}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setConfirming(false)} disabled={saving}>Back</Btn>
            <Btn size="sm" variant="primary" style={{ flex:1 }} onClick={submit} disabled={saving}>{saving ? 'Applying…' : 'Confirm correction'}</Btn>
          </div>
        </div>
      ) : (
        <Btn wide onClick={() => { if (!note.trim()) { setError('A note explaining this correction is required.'); return; } setError(''); setConfirming(true); }} disabled={saving} style={{ marginTop:16 }}>
          Review correction
        </Btn>
      )}
    </Modal>
  );
}

// ─── NOTIFICATIONS (settings toggles + admin broadcast composer) ──
const BROADCAST_SEGMENTS = [
  { key:'all',     label:'All users' },
  { key:'buyers',  label:'Buyers' },
  { key:'sellers', label:'Sellers' },
];

const ADMIN_NOTIF_PREF_LABELS = {
  newOrders: 'New orders', newSellers: 'New sellers', urgentReports: 'Urgent reports',
  weeklyReports: 'Weekly reports', marketingEmails: 'Marketing emails',
};

function AdminNotifSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [segment, setSegment] = React.useState('all');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [confirming, setConfirming] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState('');
  const [toast, setToast] = React.useState(null);

  // Real, persisted-per-admin preferences (notification_preferences
  // table, RLS-scoped to auth.uid() — see sbGetMyAdminNotificationPrefs/
  // sbSetMyAdminNotificationPref in supabase-client.jsx). prefsLoaded
  // guards against rendering (and letting the admin toggle) stale
  // defaults before the real saved values have come back from Supabase.
  const [prefs, setPrefs] = React.useState(null);
  const [prefsLoaded, setPrefsLoaded] = React.useState(false);
  // Per-preference save status: 'saving' | 'saved' | 'error' | undefined (idle).
  const [saveStatus, setSaveStatus] = React.useState({});
  // Guards against a slower, earlier request overwriting the UI state
  // left by a faster, later one on the SAME preference (e.g. a rapid
  // double-toggle) — only the response matching the latest issued
  // request for that key is ever applied.
  const requestSeq = React.useRef({});

  React.useEffect(() => {
    sbGetMyAdminNotificationPrefs().then(p => { setPrefs(p); setPrefsLoaded(true); });
  }, []);

  async function handlePrefToggle(key, value) {
    const previous = prefs[key];
    const mySeq = (requestSeq.current[key] || 0) + 1;
    requestSeq.current[key] = mySeq;
    setPrefs(p => ({ ...p, [key]: value }));
    setSaveStatus(s => ({ ...s, [key]: 'saving' }));
    const { error: saveError } = await sbSetMyAdminNotificationPref(key, value);
    if (requestSeq.current[key] !== mySeq) return; // a newer request for this key already superseded this one
    if (saveError) {
      setPrefs(p => ({ ...p, [key]: previous })); // never leave a failed write looking saved
      setSaveStatus(s => ({ ...s, [key]: 'error' }));
      return;
    }
    setSaveStatus(s => ({ ...s, [key]: 'saved' }));
    setTimeout(() => {
      setSaveStatus(s => (s[key] === 'saved' ? { ...s, [key]: undefined } : s));
    }, 2500);
  }

  const canSend = title.trim() && body.trim() && !sending;

  async function handleConfirmSend() {
    if (!canSend) return;
    setSending(true); setError('');
    const { data, error: sendError } = await sbAdminSendBroadcast({ segment, type:'promo', title: title.trim(), body: body.trim() });
    setSending(false);
    if (sendError) { setError(sendError.message || 'Could not send this broadcast.'); return; }
    logAdminAction('Sent broadcast notification', `"${title.trim()}" → ${BROADCAST_SEGMENTS.find(s => s.key === segment)?.label}`, 'notifications', null);
    setConfirming(false);
    setToast({ type:'success', message:`Sent to ${data?.recipients ?? 0} recipient${data?.recipients === 1 ? '' : 's'}.` });
    setTitle(''); setBody('');
  }

  const prefStatusSub = (key) => {
    const s = saveStatus[key];
    if (s === 'saving') return 'Saving…';
    if (s === 'saved') return 'Saved';
    if (s === 'error') return 'Could not save — tap to retry';
    return undefined;
  };
  const prefStatusTone = (key) => saveStatus[key] === 'error' ? 'danger' : saveStatus[key] === 'saved' ? 'success' : undefined;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="System Notifications" sub={prefsLoaded ? 'Your own preferences — saved to your account, restored on every sign-in.' : 'Loading your saved preferences…'} />
      <AdminSettingsRows rows={!prefsLoaded ? [] : Object.keys(ADMIN_NOTIF_PREF_LABELS).map(key => ({
        type: 'toggle', k: ADMIN_NOTIF_PREF_LABELS[key], on: prefs[key],
        sub: prefStatusSub(key), subTone: prefStatusTone(key),
        disabled: saveStatus[key] === 'saving',
      }))} onToggle={(label, v) => {
        const key = Object.keys(ADMIN_NOTIF_PREF_LABELS).find(k => ADMIN_NOTIF_PREF_LABELS[k] === label);
        if (key) handlePrefToggle(key, v);
      }} />

      {can('notifications.broadcast') && (
        <>
          <SectionTitle title="Broadcast" sub="Push + in-app notification to a segment of users" />
          <AdminCard style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:480 }}>
            <AdminField label="Recipients">
              <div style={{ display:'flex', gap:8 }}>
                {BROADCAST_SEGMENTS.map(s => (
                  <button key={s.key} onClick={() => setSegment(s.key)} style={{
                    flex:1, padding:'8px 10px', borderRadius:9, cursor:'pointer',
                    border:`1.5px solid ${segment === s.key ? C.primary : C.hairline}`,
                    background: segment === s.key ? C.primarySoft : C.white,
                    color: segment === s.key ? C.primaryDeep : C.mute,
                    fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700,
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </AdminField>
            <AdminField label="Title"><AdminTextInput value={title} onChange={setTitle} placeholder="e.g. Flash sale — 24h only!" /></AdminField>
            <AdminField label="Message"><AdminTextInput value={body} onChange={setBody} placeholder="e.g. -40% on everything until midnight." /></AdminField>

            {(title || body) && (
              <div style={{ background:C.paper, borderRadius:12, padding:12 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.mute, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>Preview</div>
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:C.primary, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="bell" size={15} color="#fff" />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title || 'Notification title'}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:2 }}>{body || 'Message body…'}</div>
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>}

            {confirming ? (
              <div style={{ background:'#FFF6E5', border:`1px solid ${C.warning}`, borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'#92400E' }}>
                  Send "<strong>{title.trim()}</strong>" to <strong>{BROADCAST_SEGMENTS.find(s => s.key === segment)?.label}</strong>? This cannot be undone.
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <Btn size="sm" style={{ flex:1, color:C.mute, border:`1.5px solid ${C.hairline}`, background:'transparent' }} onClick={() => setConfirming(false)} disabled={sending}>Cancel</Btn>
                  <Btn size="sm" variant="primary" style={{ flex:1 }} onClick={handleConfirmSend} disabled={!canSend}>{sending ? 'Sending…' : 'Confirm & Send'}</Btn>
                </div>
              </div>
            ) : (
              <Btn variant="primary" size="md" wide onClick={() => setConfirming(true)} disabled={!canSend}>
                Review &amp; Send Broadcast
              </Btn>
            )}
          </AdminCard>
        </>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── ADMIN — Payments / Refunds / Commissions (real Supabase data;
// the RPCs/queries already existed and were only reachable nested
// inside AdminOrderDetail — these give them standalone sections). ──
function AdminPaymentsSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [intents, setIntents] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [busyId, setBusyId] = React.useState(null);
  const load = React.useCallback(() => { sbAdminGetPaymentIntents({ limit: 50 }).then(setIntents); }, []);
  React.useEffect(() => { load(); }, [load]);

  async function confirm(intentId, result) {
    setBusyId(intentId);
    const { error } = await sbAdminConfirmPayment(intentId, result);
    setBusyId(null);
    if (error) { setToast({ type:'error', message: error.message || 'Could not update this payment.' }); return; }
    setToast({ type:'success', message: `Payment marked ${result}.` });
    load();
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Payments" sub={intents === null ? 'Loading…' : `${intents.length} payment intents`} />
      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Order</Th><Th>Buyer</Th><Th>Provider</Th><Th align="right">Amount</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>
            {intents === null && <tr><td colSpan={6}><AdminEmptyRow text="Loading…" /></td></tr>}
            {intents !== null && intents.length === 0 && <tr><td colSpan={6}><AdminEmptyRow text="No payment intents yet." /></td></tr>}
            {(intents || []).map(p => (
              <tr key={p.id}>
                <Td><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>#{p.order_id?.slice(0,8)}</span></Td>
                <Td>{p.orders?.profiles?.full_name || p.orders?.profiles?.email || 'Unknown'}</Td>
                <Td>{p.provider}</Td>
                <Td align="right">${Number(p.amount).toFixed(2)}</Td>
                <Td><StatusPill tone={p.status === 'succeeded' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{p.status}</StatusPill></Td>
                <Td align="right">
                  {can('payments.confirm') && p.status === 'pending' && (
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button disabled={busyId===p.id} onClick={() => confirm(p.id, 'succeeded')} style={{ border:'none', background:'none', cursor:'pointer', color:C.success, fontSize:11.5, fontWeight:700, fontFamily:"'Inter',sans-serif" }}>Confirm</button>
                      <button disabled={busyId===p.id} onClick={() => confirm(p.id, 'failed')} style={{ border:'none', background:'none', cursor:'pointer', color:C.danger, fontSize:11.5, fontWeight:700, fontFamily:"'Inter',sans-serif" }}>Fail</button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function AdminRefundsSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [result, setResult] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [toast, setToast] = React.useState(null);
  const [busyId, setBusyId] = React.useState(null);
  const load = React.useCallback(() => { sbAdminGetRefundRequests({ status: statusFilter, limit: 50 }).then(setResult); }, [statusFilter]);
  React.useEffect(() => { load(); }, [load]);

  async function decide(requestId, decision) {
    setBusyId(requestId);
    const { error } = await sbAdminDecideRefund(requestId, decision);
    setBusyId(null);
    if (error) { setToast({ type:'error', message: error.message || 'Could not decide this refund.' }); return; }
    load();
  }
  async function recordResult(requestId, amount, resultStatus) {
    setBusyId(requestId);
    const { error } = await sbAdminRecordRefundResult(requestId, resultStatus, amount);
    setBusyId(null);
    if (error) { setToast({ type:'error', message: error.message || 'Could not record this refund result.' }); return; }
    load();
  }

  const requests = result?.requests || [];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Refunds" sub={result === null ? 'Loading…' : `${result.totalRequests} requests`} />
      <div style={{ display:'flex', gap:6 }}>
        {['ALL','PENDING','APPROVED','REJECTED','REFUNDED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding:'5px 11px', borderRadius:7, border:`1px solid ${statusFilter === s ? C.primary : C.hairline}`,
            background: statusFilter === s ? C.primarySoft : C.white, cursor:'pointer',
            fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color: statusFilter === s ? C.primaryDeep : C.mute,
          }}>{s}</button>
        ))}
      </div>
      <AdminCard padded={false}>
        {result === null ? <AdminEmptyRow text="Loading…" /> : requests.length === 0 ? <AdminEmptyRow text="No refund requests." /> : requests.map((r, i) => (
          <div key={r.id} style={{ padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>#{r.order_id?.slice(0,8)} — {r.orders?.profiles?.full_name || 'Unknown buyer'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{r.reason}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Requested: ${Number(r.amount_requested).toFixed(2)}{r.amount_approved != null ? ` · Approved: $${Number(r.amount_approved).toFixed(2)}` : ''}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <StatusPill tone={r.status === 'PENDING' ? 'warning' : r.status === 'REJECTED' ? 'danger' : r.status === 'REFUNDED' ? 'success' : 'mute'}>{r.status}</StatusPill>
              {can('orders.refund') && r.status === 'PENDING' && (
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="secondary" size="sm" disabled={busyId===r.id} onClick={() => decide(r.id, 'APPROVED')}>Approve</Btn>
                  <Btn variant="secondary" size="sm" disabled={busyId===r.id} onClick={() => decide(r.id, 'REJECTED')}>Reject</Btn>
                </div>
              )}
              {can('payments.confirm') && r.status === 'APPROVED' && (
                <Btn variant="primary" size="sm" disabled={busyId===r.id} onClick={() => recordResult(r.id, r.amount_approved ?? r.amount_requested, 'succeeded')}>Record refunded</Btn>
              )}
            </div>
          </div>
        ))}
      </AdminCard>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function AdminCommissionsSection() {
  const [ledger, setLedger] = React.useState(null);
  React.useEffect(() => { sbAdminGetCommissionLedger({ limit: 100 }).then(setLedger); }, []);
  const total = (ledger || []).reduce((sum, e) => sum + Number(e.commission_amount || 0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Commissions" sub={ledger === null ? 'Loading…' : `${ledger.length} entries · $${total.toFixed(2)} total commission`} />
      <AdminCard padded={false} style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><Th>Order</Th><Th>Shop</Th><Th align="right">Gross</Th><Th align="right">Rate</Th><Th align="right">Commission</Th><Th align="right">Net to seller</Th><Th>Status</Th></tr></thead>
          <tbody>
            {ledger === null && <tr><td colSpan={7}><AdminEmptyRow text="Loading…" /></td></tr>}
            {ledger !== null && ledger.length === 0 && <tr><td colSpan={7}><AdminEmptyRow text="No commission entries yet." /></td></tr>}
            {(ledger || []).map(e => (
              <tr key={e.id}>
                <Td><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>#{e.order_id?.slice(0,8)}</span></Td>
                <Td>{e.shops?.name || 'Unknown shop'}</Td>
                <Td align="right">${Number(e.gross_amount).toFixed(2)}</Td>
                <Td align="right">{(Number(e.commission_rate) * 100).toFixed(1)}%</Td>
                <Td align="right">${Number(e.commission_amount).toFixed(2)}</Td>
                <Td align="right">${Number(e.net_amount).toFixed(2)}</Td>
                <Td><StatusPill tone={e.status === 'confirmed' ? 'success' : e.status === 'reversed' ? 'danger' : 'mute'}>{e.status}</StatusPill></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminCard>
    </div>
  );
}

function AdminWalletSection({ accessCtx }) {
  const can = (key) => !!accessCtx?.isAdmin || !!accessCtx?.permissions?.includes(key);
  const [statusFilter, setStatusFilter] = React.useState('pending');
  const [requests, setRequests] = React.useState(null);
  const [toast, setToast] = React.useState(null);
  const [busyId, setBusyId] = React.useState(null);
  const load = React.useCallback(() => { sbAdminGetWithdrawalRequests(statusFilter === 'ALL' ? 'ALL' : statusFilter).then(setRequests); }, [statusFilter]);
  React.useEffect(() => { load(); }, [load]);

  async function decide(requestId, decision) {
    setBusyId(requestId);
    const { error } = await sbAdminDecideWithdrawal(requestId, decision);
    setBusyId(null);
    if (error) { setToast({ type:'error', message: error.message || 'Could not decide this payout request.' }); return; }
    load();
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SectionTitle title="Wallet" sub="Seller payout requests" />
      <div style={{ display:'flex', gap:6 }}>
        {['pending','approved','rejected','ALL'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            padding:'5px 11px', borderRadius:7, border:`1px solid ${statusFilter === s ? C.primary : C.hairline}`,
            background: statusFilter === s ? C.primarySoft : C.white, cursor:'pointer',
            fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color: statusFilter === s ? C.primaryDeep : C.mute,
          }}>{s}</button>
        ))}
      </div>
      <AdminCard padded={false}>
        {requests === null ? <AdminEmptyRow text="Loading…" /> : requests.length === 0 ? <AdminEmptyRow text="No payout requests." /> : requests.map((r, i) => (
          <div key={r.id} style={{ padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{r.seller_name} — ${Number(r.amount).toFixed(2)}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{r.method} · {r.account_details}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{new Date(r.created_at).toLocaleString()}{r.admin_note ? ` · ${r.admin_note}` : ''}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <StatusPill tone={r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'danger' : 'success'}>{r.status}</StatusPill>
              {can('wallet.manage') && r.status === 'pending' && (
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="secondary" size="sm" disabled={busyId===r.id} onClick={() => decide(r.id, 'approved')}>Approve</Btn>
                  <Btn variant="secondary" size="sm" disabled={busyId===r.id} onClick={() => decide(r.id, 'rejected')}>Reject</Btn>
                </div>
              )}
            </div>
          </div>
        ))}
      </AdminCard>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── MAIN SHELL ──────────────────────────────────────────────────
function AdminShellScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [section, setSection] = React.useState(params.section || 'overview');
  // Lets Shipping's "#orderId" link jump straight to that order's own detail
  // page inside Orders, instead of just switching tabs to the generic list.
  const [ordersDeepLinkId, setOrdersDeepLinkId] = React.useState(null);
  function goToOrder(orderId) { setOrdersDeepLinkId(orderId); setSection('orders'); }
  const [adminStats, setAdminStats] = React.useState(null);
  const [remoteUsers, setRemoteUsers] = React.useState(null);
  const [userDetail, setUserDetail] = React.useState(null);
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
    setUserDetail(null);
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


  // ── Sellers ── (real list/actions live in AdminSellersKycSection; this
  // empty array only feeds AdminOverview's legacy "pending shops" line,
  // superseded there by the real kycCount from sbAdminGetStats())
  const sellersList = [];

  const [toast, setToast] = React.useState(null);

  // ── Reviews ──
  const [reviews, setReviews] = React.useState(null);
  const loadReviews = React.useCallback(() => { sbAdminGetReviews('all').then(setReviews); }, []);
  React.useEffect(() => { if (section === 'reviews' || section === 'overview') loadReviews(); }, [section, loadReviews]);
  async function setReviewStatus(id, hidden) {
    const { error } = await sbAdminModerateReview(id, hidden);
    if (error) { setToast({ type:'error', message: error.message || 'Could not update this review.' }); return; }
    logAdminAction(hidden ? 'Hid review' : 'Restored review', id);
    loadReviews();
  }

  // ── Tickets ──
  const [tickets, setTickets] = React.useState(null);
  const loadTickets = React.useCallback(() => { sbAdminGetSupportTickets('all').then(setTickets); }, []);
  React.useEffect(() => { if (section === 'tickets') loadTickets(); }, [section, loadTickets]);
  async function setTicketStatus(id, status) {
    const { error } = await sbAdminUpdateSupportTicket(id, { status });
    if (error) { setToast({ type:'error', message: error.message || 'Could not update this ticket.' }); return; }
    logAdminAction('Updated ticket status', `${id} → ${status}`);
    loadTickets();
  }

  // ── Coupons ──
  const [coupons, setCoupons] = React.useState(null);
  const loadCoupons = React.useCallback(() => { sbAdminGetCoupons().then(setCoupons); }, []);
  React.useEffect(() => { if (section === 'coupons') loadCoupons(); }, [section, loadCoupons]);
  async function addCoupon() {
    const { error } = await sbAdminCreateCoupon({ code: `CODE${Date.now().toString().slice(-6)}`, discountType: 'percent', discountValue: 10 });
    if (error) { setToast({ type:'error', message: error.message || 'Could not create this coupon.' }); return; }
    logAdminAction('Created coupon', '');
    loadCoupons();
  }
  async function updateCoupon(id, field, value) {
    const patch = field === 'discount' ? { discountValue: value } : field === 'active' ? { isActive: value } : field === 'expiresAt' ? { expiresAt: value || null } : {};
    const { error } = await sbAdminUpdateCoupon(id, patch);
    if (error) { setToast({ type:'error', message: error.message || 'Could not update this coupon.' }); return; }
    loadCoupons();
  }
  async function deleteCoupon(id) {
    const { error } = await sbAdminDeleteCoupon(id);
    if (error) { setToast({ type:'error', message: error.message || 'Could not delete this coupon.' }); return; }
    logAdminAction('Deleted coupon', id);
    loadCoupons();
  }

  // ── Announcement / Homepage / Shop-by-category ──
  function saveAnnouncement(updates) { window._ANNOUNCEMENT = { ...window._ANNOUNCEMENT, ...updates }; logAdminAction('Updated announcement bar', updates.text ?? ''); forceTick(t => t + 1); }
  function toggleHomeSection(key, val) { window._HOME_SECTIONS = { ...window._HOME_SECTIONS, [key]: val }; forceTick(t => t + 1); }

  // ── Platform settings (persistent) ──
  const [platformSettings, setPlatformSettings] = React.useState(null);
  const [commissionRate, setCommissionRate] = React.useState(null);
  const loadPlatformSettings = React.useCallback(() => { sbAdminGetPlatformSettings().then(setPlatformSettings); }, []);
  const loadCommissionRate = React.useCallback(() => { sbAdminGetCommissionRate().then(setCommissionRate); }, []);
  React.useEffect(() => {
    if (['ga','metapixel','tiktok','searchconsole','settings'].includes(section)) loadPlatformSettings();
    if (section === 'settings') loadCommissionRate();
  }, [section, loadPlatformSettings, loadCommissionRate]);
  const seoConfig = (platformSettings && platformSettings.seo) || { ga:'', metaPixel:'', tiktok:'', searchConsole:'' };

  // ── SEO ──
  async function saveSeo(field, value) {
    const next = { ...seoConfig, [field]: value };
    const { error } = await sbAdminSetPlatformSetting('seo', next);
    if (error) { setToast({ type:'error', message: error.message || 'Could not save this setting.' }); return; }
    setPlatformSettings(s => ({ ...(s || {}), seo: next }));
  }

  // ── Rewards ──
  function saveRewards(field, value) { window._REWARDS_CONFIG = { ...window._REWARDS_CONFIG, [field]: value }; forceTick(t => t + 1); }

  // ── Roles / Security / Platform Settings toggles ──
  function toggleSecurity(field, value) { window._SECURITY_SETTINGS = { ...window._SECURITY_SETTINGS, [field]: value }; logAdminAction('Changed security setting', `${field} → ${value}`); forceTick(t => t + 1); }
  async function togglePlatformSetting(field, value) {
    const { error } = await sbAdminSetPlatformSetting(field, value);
    if (error) { setToast({ type:'error', message: error.message || 'Could not save this setting.' }); return; }
    logAdminAction('Changed platform setting', `${field} → ${value}`);
    setPlatformSettings(s => ({ ...(s || {}), [field]: value }));
  }

  const title = ADMIN_TITLES[section] || 'Dashboard';

  function renderSection() {
    switch (section) {
      case 'overview': return <AdminOverview adminStats={adminStats} onNav={onNav} sellersList={sellersList} reviews={reviews || []} kycCount={adminStats?.pendingKyc ?? 0} />;

      case 'orders': return <AdminOrdersSection accessCtx={accessCtx} initialDetailId={ordersDeepLinkId} onConsumeInitialDetailId={() => setOrdersDeepLinkId(null)} />;
      case 'shipping': return <AdminShippingSection accessCtx={accessCtx} onViewOrder={goToOrder} />;

      case 'payments': return <AdminPaymentsSection accessCtx={accessCtx} />;
      case 'refunds': return <AdminRefundsSection accessCtx={accessCtx} />;
      case 'commissions': return <AdminCommissionsSection />;
      case 'wallet': return <AdminWalletSection accessCtx={accessCtx} />;

      case 'products': return <AdminProductsSection accessCtx={accessCtx} />;

      case 'categories': return <AdminCategoriesSection />;

      case 'brands': return <AdminBrandsSection accessCtx={accessCtx} />;

      case 'inventory': return <AdminInventorySection accessCtx={accessCtx} />;

      case 'flashdeals': return <AdminFlashDealsSection accessCtx={accessCtx} />;

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

      case 'sellers': return <AdminSellersKycSection accessCtx={accessCtx} />;

      case 'reviews': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Reviews" sub={reviews === null ? 'Loading…' : `${reviews.length} reviews`} />
          <AdminCard padded={false}>
            {reviews === null ? <AdminEmptyRow text="Loading…" /> : reviews.length === 0 ? <AdminEmptyRow text="No reviews yet." /> : reviews.map((r, i) => (
              <div key={r.id} style={{ padding:'12px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none', opacity: r.is_hidden ? 0.5 : 1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{r.buyer_name}</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}> · {r.product_title || 'Unknown product'}</span>
                  </div>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#F59E0B' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginBottom:8 }}>{r.comment}</div>
                <button onClick={() => setReviewStatus(r.id, !r.is_hidden)} style={{ border:`1.5px solid ${C.hairline}`, background:C.white, borderRadius:8, padding:'5px 12px', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color: r.is_hidden ? C.success : C.danger }}>
                  {r.is_hidden ? 'Restore' : 'Hide review'}
                </button>
              </div>
            ))}
          </AdminCard>
        </div>
      );

      case 'tickets': return (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <SectionTitle title="Support Tickets" sub={tickets === null ? 'Loading…' : `${tickets.length} tickets`} />
            <AdminCard padded={false}>
              {tickets === null ? <AdminEmptyRow text="Loading…" /> : tickets.length === 0 ? <AdminEmptyRow text="No tickets" /> : tickets.map((t, i) => (
                <div key={t.id} style={{ display:'flex', flexDirection:'column', gap:6, padding:'11px 16px', borderTop: i>0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{t.subject} <span style={{ color:C.mute, fontWeight:500 }}>— {t.seller_name}</span></div>
                      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{t.id.slice(0,8)} · {new Date(t.created_at).toLocaleString()} · {t.priority}</div>
                    </div>
                    <select value={t.status} onChange={e => setTicketStatus(t.id, e.target.value)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:8, padding:'5px 8px', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, background:C.white }}>
                      {['open','in_progress','closed'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                    </select>
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>{t.message}</div>
                  {t.response && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep, background:C.primarySoft, borderRadius:8, padding:'8px 10px' }}>Response: {t.response}</div>}
                </div>
              ))}
            </AdminCard>
          </div>
        );

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
          <SectionTitle title="Coupons" sub={coupons === null ? 'Loading…' : `${coupons.length} codes`} action={<Btn variant="primary" size="sm" onClick={addCoupon}>+ New platform coupon</Btn>} />
          <AdminCard padded={false} style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><Th>Code</Th><Th>Scope</Th><Th align="right">Discount</Th><Th>Expires</Th><Th>Active</Th><Th></Th></tr></thead>
              <tbody>
                {coupons === null && <tr><td colSpan={6}><AdminEmptyRow text="Loading…" /></td></tr>}
                {coupons !== null && coupons.length === 0 && <tr><td colSpan={6}><AdminEmptyRow text="No coupons yet." /></td></tr>}
                {(coupons || []).map(c => (
                  <tr key={c.id}>
                    <Td><span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12.5, fontWeight:700, color:C.ink }}>{c.code}</span></Td>
                    <Td><span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{c.scope === 'platform' ? 'Platform-wide' : (c.shop_name || 'Shop')}</span></Td>
                    <Td align="right"><input type="number" value={c.discount_value} onChange={e => updateCoupon(c.id,'discount',parseFloat(e.target.value)||0)} style={{ width:56, textAlign:'right', border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 6px', fontFamily:"'JetBrains Mono',monospace", fontSize:12 }} />{c.discount_type === 'percent' ? '%' : '$'}</Td>
                    <Td><input type="date" value={c.expires_at ? c.expires_at.slice(0,10) : ''} onChange={e => updateCoupon(c.id,'expiresAt',e.target.value ? new Date(e.target.value).toISOString() : null)} style={{ border:`1.5px solid ${C.hairline}`, borderRadius:7, padding:'4px 6px', fontFamily:"'Inter',sans-serif", fontSize:12 }} /></Td>
                    <Td><Switch checked={c.is_active} onChange={v => updateCoupon(c.id,'active',v)} /></Td>
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
            <SectionTitle title={ADMIN_TITLES[section]} sub="Saved to the platform settings database" />
            <AdminCard style={{ maxWidth:480 }}>
              <AdminField label={labelMap[section]}>
                <AdminTextInput value={seoConfig[field] || ''} onChange={v => saveSeo(field, v)} placeholder="e.g. G-XXXXXXXXXX" mono />
              </AdminField>
            </AdminCard>
          </div>
        );
      }

      case 'notifications': return <AdminNotifSection accessCtx={accessCtx} />;

      case 'trustsafety': return <AdminTrustSafetySection accessCtx={accessCtx} />;

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

      case 'backup': return <AdminBackupSection />;

      case 'health': return <AdminHealthSection accessCtx={accessCtx} />;

      case 'settings': return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <SectionTitle title="Platform Settings" sub={commissionRate === null || platformSettings === null ? 'Loading…' : 'Persisted to the database — the commission rate is read by every new order.'} />
          <AdminSettingsRows rows={[
            { type:'number', k:'Marketplace commission rate', v: commissionRate === null ? '…' : (commissionRate.rate * 100).toFixed(1) },
            { type:'toggle', k:'Free shipping enabled', on: !!(platformSettings && platformSettings.free_shipping_enabled) },
            { type:'toggle', k:'Real-time tracking', on: platformSettings ? platformSettings.real_time_tracking_enabled !== false : true },
          ]} onToggle={(k, v) => {
            const map = { 'Free shipping enabled':'free_shipping_enabled', 'Real-time tracking':'real_time_tracking_enabled' };
            togglePlatformSetting(map[k], v);
          }} onNumber={async (k, v) => {
            if (k === 'Marketplace commission rate') {
              const pct = Math.max(0, Math.min(100, parseFloat(v) || 0));
              const { error } = await sbAdminSetCommissionRate(pct / 100);
              if (error) { setToast({ type:'error', message: error.message || 'Could not update the commission rate.' }); return; }
              logAdminAction('Changed platform setting', `commissionRate → ${pct}%`);
              setCommissionRate(r => ({ ...(r || {}), rate: pct / 100 }));
            }
          }} />
        </div>
      );

      case 'ownervault': return <AdminOwnerVaultSection onNav={onNav} />;

      default: return <AdminOverview adminStats={adminStats} onNav={onNav} sellersList={sellersList} reviews={reviews || []} kycCount={adminStats?.pendingKyc ?? 0} />;
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
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { AdminShellScreen });
