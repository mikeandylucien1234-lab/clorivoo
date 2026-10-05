// screen-payments.jsx — Payment Methods Management

function cardBrand(number) {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  return 'card';
}
function brandLogo(brand, size=40) {
  if (brand === 'visa') return (
    <div style={{ width:size, height:size*0.65, borderRadius:6, background:'#1A1F71', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:size*0.27, fontWeight:800, color:'#fff', fontStyle:'italic' }}>VISA</span>
    </div>
  );
  if (brand === 'mastercard') return (
    <div style={{ display:'flex', flexShrink:0, width:size, justifyContent:'center' }}>
      <div style={{ width:size*0.5, height:size*0.5, borderRadius:9999, background:'#EB001B' }} />
      <div style={{ width:size*0.5, height:size*0.5, borderRadius:9999, background:'#F79E1B', marginLeft:-size*0.2 }} />
    </div>
  );
  return (
    <div style={{ width:size, height:size*0.65, borderRadius:6, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <Icon name="creditCard" size={size*0.4} color={C.primary} />
    </div>
  );
}

window._PAYMENT_METHODS = window._PAYMENT_METHODS || [];

function walletLogo(type, size=40) {
  const bg = type === 'moncash' ? 'linear-gradient(135deg,#EE3831 0%,#F58220 100%)'
    : type === 'natcash' ? 'linear-gradient(135deg,#0072BC 0%,#00A651 100%)'
    : 'linear-gradient(135deg,#003087 0%,#00A0E4 100%)';
  const label = type === 'moncash' ? 'MonCash' : type === 'natcash' ? 'NatCash' : 'PayPal';
  return (
    <div style={{ width:size, height:size*0.65, borderRadius:6, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:size*0.22, fontWeight:800, color:'#fff' }}>{label}</span>
    </div>
  );
}

function PaymentMethodsScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [methods, setMethods] = React.useState(window._PAYMENT_METHODS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState({ number:'', expiry:'', name:'', cvv:'' });
  const [errors, setErrors] = React.useState({});
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { window._PAYMENT_METHODS = methods; }, [methods]);

  function setDefault(id) {
    setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
    setToast({ type:'success', message:'Default payment method updated' });
  }
  function removeMethod(id) {
    setMethods(prev => prev.filter(m => m.id !== id));
    setToast({ type:'success', message:'Payment method removed' });
  }
  function validate() {
    const e = {};
    if (form.number.replace(/\s/g,'').length < 16) e.number = 'Invalid card number';
    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = 'MM/YY';
    if (form.cvv.length < 3) e.cvv = 'Invalid CVV';
    if (!form.name.trim()) e.name = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }
  function addCard() {
    if (!validate()) return;
    const clean = form.number.replace(/\s/g, '');
    const id = Math.max(0, ...methods.map(m => m.id)) + 1;
    setMethods(prev => [...prev, { id, type:'card', brand: cardBrand(clean), last4: clean.slice(-4), expiry: form.expiry, name: form.name, isDefault: prev.length === 0 }]);
    setFormOpen(false);
    setForm({ number:'', expiry:'', name:'', cvv:'' });
    setToast({ type:'success', message:'Card added successfully' });
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Payment Methods</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:10, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {methods.map(m => (
          <div key={m.id} style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', alignItems:'center', gap:14 }}>
            {m.type === 'card' ? brandLogo(m.brand) : walletLogo(m.type)}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>
                  {m.type === 'card' ? `${m.brand === 'visa' ? 'Visa' : m.brand === 'mastercard' ? 'Mastercard' : 'Card'} •••• ${m.last4}` : m.label}
                </span>
                {m.isDefault && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, fontWeight:800, color:C.primary, background:C.primarySoft, borderRadius:6, padding:'2px 6px', textTransform:'uppercase' }}>Default</span>}
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>
                {m.type === 'card' ? `Expires ${m.expiry} · ${m.name}` : m.phone || m.email}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
              {!m.isDefault && (
                <button onClick={() => setDefault(m.id)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color:C.primary }}>Set Default</button>
              )}
              <button onClick={() => removeMethod(m.id)} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color:C.danger }}>Remove</button>
            </div>
          </div>
        ))}

        {methods.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 24px', gap:14 }}>
            <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="creditCard" size={36} color={C.primary} />
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No payment methods yet</div>
          </div>
        )}

        <button onClick={() => setFormOpen(true)} style={{ width:'100%', height:52, border:`2px dashed ${C.primary}`, borderRadius:14, background:C.primarySoft, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4 }}>
          <Icon name="plus" size={18} color={C.primary} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Add New Card</span>
        </button>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 0' }}>
          <Icon name="lock" size={13} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Your card details are encrypted and stored securely</span>
        </div>
      </div>

      <Modal open={formOpen} title="Add New Card" onClose={() => setFormOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Input label="Card Number" placeholder="1234 5678 9012 3456" value={form.number} onChange={e => setForm(f => ({ ...f, number:e.target.value }))} error={errors.number} />
          <div style={{ display:'flex', gap:10 }}>
            <Input label="Expiry (MM/YY)" placeholder="08/28" value={form.expiry} onChange={e => setForm(f => ({ ...f, expiry:e.target.value }))} error={errors.expiry} style={{ flex:1 }} />
            <Input label="CVV" placeholder="123" type="password" value={form.cvv} onChange={e => setForm(f => ({ ...f, cvv:e.target.value }))} error={errors.cvv} style={{ flex:1 }} />
          </div>
          <Input label="Cardholder Name" placeholder="Jane Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} error={errors.name} />
          <Btn variant="primary" size="lg" wide onClick={addCard} style={{ marginTop:6 }}>Add Card</Btn>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { PaymentMethodsScreen });
