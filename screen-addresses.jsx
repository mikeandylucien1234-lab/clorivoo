// screen-addresses.jsx — Address Management

window._ADDRESSES = window._ADDRESSES || [
  { id:1, label:'Home', line1:'14 Roquette Street', city:'Paris', country:'France', zip:'75011', phone:'+33 6 12 34 56 78', instructions:'Ring the bell twice', isDefault:true },
  { id:2, label:'Work', line1:'22 Rue du Faubourg', city:'Paris', country:'France', zip:'75012', phone:'+33 6 98 76 54 32', instructions:'', isDefault:false },
];

function AddressesScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [addresses, setAddresses] = React.useState(window._ADDRESSES);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState({ label:'', line1:'', city:'', country:'', zip:'', phone:'', instructions:'' });
  const [errors, setErrors] = React.useState({});
  const [toast, setToast] = React.useState(null);
  const [locating, setLocating] = React.useState(false);

  React.useEffect(() => { window._ADDRESSES = addresses; }, [addresses]);

  function openNewForm() {
    setEditingId(null);
    setForm({ label:'', line1:'', city:'', country:'', zip:'', phone:'', instructions:'' });
    setErrors({});
    setFormOpen(true);
  }
  function openEditForm(addr) {
    setEditingId(addr.id);
    setForm({ label:addr.label, line1:addr.line1, city:addr.city, country:addr.country, zip:addr.zip, phone:addr.phone, instructions:addr.instructions || '' });
    setErrors({});
    setFormOpen(true);
  }
  function removeAddress(id) {
    setAddresses(prev => prev.filter(a => a.id !== id));
    setToast({ type:'success', message:'Address deleted' });
  }
  function setDefault(id) {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
    setToast({ type:'success', message:'Default address updated' });
  }
  function validate() {
    const e = {};
    if (!form.label.trim()) e.label = 'Required';
    if (!form.line1.trim()) e.line1 = 'Required';
    if (!form.city.trim())  e.city  = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function saveAddress() {
    if (!validate()) return;
    if (editingId) {
      setAddresses(prev => prev.map(a => a.id === editingId ? { ...a, ...form } : a));
      setToast({ type:'success', message:'Address updated' });
    } else {
      const id = Math.max(0, ...addresses.map(a => a.id)) + 1;
      setAddresses(prev => [...prev, { id, ...form, isDefault: prev.length === 0 }]);
      setToast({ type:'success', message:'Address added' });
    }
    setFormOpen(false);
  }
  function useCurrentLocation() {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => { setLocating(false); setForm(f => ({ ...f, city: f.city || 'Port-au-Prince', country: f.country || 'Haiti' })); setToast({ type:'success', message:'Location detected' }); },
        () => { setLocating(false); setToast({ type:'error', message:'Could not access your location' }); },
        { timeout:4000 }
      );
    } else {
      setTimeout(() => { setLocating(false); setToast({ type:'error', message:'Location services unavailable' }); }, 800);
    }
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Shipping Addresses</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:12, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {addresses.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', gap:14 }}>
            <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="mapPin" size={38} color={C.primary} />
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No saved addresses</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center' }}>Add a shipping address to speed up checkout</div>
          </div>
        )}

        {addresses.map(addr => (
          <div key={addr.id} style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', flex:1, minWidth:0 }}>
                <div style={{ width:36, height:36, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                  <Icon name="mapPin" size={17} color={C.primary} />
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>{addr.label}</span>
                    {addr.isDefault && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:800, color:C.primary, background:C.primarySoft, borderRadius:6, padding:'2px 6px', textTransform:'uppercase' }}>Default</span>}
                  </div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.5 }}>{addr.line1}<br />{addr.zip} {addr.city}, {addr.country}<br />{addr.phone}</div>
                  {addr.instructions && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:4, fontStyle:'italic' }}>Note: {addr.instructions}</div>}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:14, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.hairline}` }}>
              <button onClick={() => openEditForm(addr)} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer' }}>
                <Icon name="edit" size={13} color={C.primary} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>Edit</span>
              </button>
              {!addr.isDefault && (
                <button onClick={() => setDefault(addr.id)} style={{ border:'none', background:'none', cursor:'pointer' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.mute }}>Set as Default</span>
                </button>
              )}
              <button onClick={() => removeAddress(addr.id)} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer', marginLeft:'auto' }}>
                <Icon name="trash" size={13} color={C.danger} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.danger }}>Delete</span>
              </button>
            </div>
          </div>
        ))}

        <button onClick={openNewForm} style={{ width:'100%', height:52, border:`2px dashed ${C.primary}`, borderRadius:14, background:C.primarySoft, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Icon name="plus" size={18} color={C.primary} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Add New Address</span>
        </button>
      </div>

      <Modal open={formOpen} title={editingId ? 'Edit Address' : 'Add New Address'} onClose={() => setFormOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <button onClick={useCurrentLocation} disabled={locating} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, border:`1.5px solid ${C.primary}`, background:C.primarySoft, borderRadius:12, height:44, cursor:'pointer' }}>
            <Icon name={locating ? 'refreshCw' : 'mapPin'} size={15} color={C.primary} style={{ animation: locating ? 'spin 0.8s linear infinite' : 'none' }} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>{locating ? 'Detecting location…' : 'Use My Current Location'}</span>
          </button>
          <Input label="Label (e.g. Home, Work)" placeholder="Home" value={form.label} onChange={e => setForm(f => ({ ...f, label:e.target.value }))} error={errors.label} />
          <Input label="Street Address" placeholder="14 Roquette Street" value={form.line1} onChange={e => setForm(f => ({ ...f, line1:e.target.value }))} error={errors.line1} />
          <div style={{ display:'flex', gap:10 }}>
            <Input label="City" placeholder="Paris" value={form.city} onChange={e => setForm(f => ({ ...f, city:e.target.value }))} error={errors.city} style={{ flex:1 }} />
            <Input label="ZIP Code" placeholder="75011" value={form.zip} onChange={e => setForm(f => ({ ...f, zip:e.target.value }))} style={{ flex:1 }} />
          </div>
          <Input label="Country" placeholder="France" value={form.country} onChange={e => setForm(f => ({ ...f, country:e.target.value }))} />
          <Input label="Phone Number" placeholder="+509 34 56 78 90" value={form.phone} onChange={e => setForm(f => ({ ...f, phone:e.target.value }))} error={errors.phone} />
          <Input label="Delivery Instructions (optional)" placeholder="e.g. Ring the bell twice" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions:e.target.value }))} />
          <Btn variant="primary" size="lg" wide onClick={saveAddress} style={{ marginTop:6 }}>Save Address</Btn>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { AddressesScreen });
