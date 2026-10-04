// screen-checkout.jsx — Multi-step Checkout: Address → Payment → Confirmation / Failed

const WALLET_BALANCE = 45.50;

// ─── STEPPER ─────────────────────────────────────────────────
function CheckoutStepper({ step }) {
  const steps = [
    { n:1, label:'Cart' },
    { n:2, label:'Address' },
    { n:3, label:'Payment' },
    { n:4, label:'Confirmation' },
  ];
  return (
    <div style={{ display:'flex', alignItems:'flex-start', padding:'14px 20px 6px', gap:0 }}>
      {steps.map((s, i) => {
        const done = s.n < step, active = s.n === step;
        return (
          <React.Fragment key={s.n}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, width:60, flexShrink:0 }}>
              <div style={{
                width:28, height:28, borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center',
                background: done ? C.primary : active ? C.primary : C.white,
                border: active || done ? 'none' : `1.5px solid ${C.hairline}`,
                boxShadow: active ? `0 0 0 4px ${C.primarySoft}` : 'none',
              }}>
                {done ? <Icon name="check" size={13} color="#fff" sw={3} /> :
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color: active ? '#fff' : C.mute }}>{s.n}</span>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight: active ? 700 : 500, color: active ? C.primary : C.mute, textAlign:'center', whiteSpace:'nowrap' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:2, background: s.n < step ? C.primary : C.hairline, marginTop:13, borderRadius:2 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── SHARED TOP BAR ──────────────────────────────────────────
function CheckoutTopBar({ title, onBack, isDesktop }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0 0' : '14px 20px 0', width: isDesktop ? '100%' : undefined }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name="arrowLeft" size={18} color={C.ink} />
        </button>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{title}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:5, background:'#ECFDF5', borderRadius:9999, padding:'6px 12px' }}>
        <Icon name="shield" size={14} color={C.success} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.success }}>100% Secure</span>
      </div>
    </div>
  );
}

// ─── ORDER SUMMARY MINI CARD (reused on Address + Payment steps) ──
function OrderSummaryMini({ subtotal, discount, total }) {
  return (
    <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Order Summary</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Subtotal</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.ink }}>${subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Discount</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color: discount > 0 ? C.danger : C.mute }}>-${discount.toFixed(2)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', paddingBottom:10, borderBottom:`1px solid ${C.hairline}` }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Shipping</span>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.success }}>Free</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:C.ink }}>Total to pay</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:800, color:C.primary }}>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2: SHIPPING ADDRESS ────────────────────────────────
function CheckoutAddressScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const subtotal = params.subtotal ?? 0;
  const discount = params.discount ?? 0;
  const total    = params.total ?? 0;

  const [addresses, setAddresses] = React.useState([
    { id:1, label:'Home', line1:'14 Roquette Street', city:'Paris', country:'France', zip:'75011', phone:'+33 6 12 34 56 78', isDefault:true },
    { id:2, label:'Work', line1:'22 Rue du Faubourg', city:'Paris', country:'France', zip:'75012', phone:'+33 6 98 76 54 32', isDefault:false },
  ]);
  const [selectedId, setSelectedId] = React.useState(1);
  const [formOpen, setFormOpen]     = React.useState(false);
  const [editingId, setEditingId]   = React.useState(null);
  const [form, setForm] = React.useState({ label:'', line1:'', city:'', country:'', zip:'', phone:'' });
  const [errors, setErrors] = React.useState({});

  function openNewForm() {
    setEditingId(null);
    setForm({ label:'', line1:'', city:'', country:'', zip:'', phone:'' });
    setErrors({});
    setFormOpen(true);
  }
  function openEditForm(addr) {
    setEditingId(addr.id);
    setForm({ label:addr.label, line1:addr.line1, city:addr.city, country:addr.country, zip:addr.zip, phone:addr.phone });
    setErrors({});
    setFormOpen(true);
  }
  function removeAddress(id) {
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(prev => (addresses.find(a => a.id !== id) || {}).id);
  }
  function setDefault(id) {
    setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
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
    } else {
      const id = Math.max(0, ...addresses.map(a => a.id)) + 1;
      const newAddr = { id, ...form, isDefault: addresses.length === 0 };
      setAddresses(prev => [...prev, newAddr]);
      setSelectedId(id);
    }
    setFormOpen(false);
  }

  const selectedAddress = addresses.find(a => a.id === selectedId);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <CheckoutTopBar title="Shipping Address" onBack={goBack} isDesktop={isDesktop} />
        <CheckoutStepper step={2} />
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0' : '14px 16px', display:'flex', flexDirection:'column', gap:12, paddingBottom: isDesktop ? 24 : 110, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {addresses.length === 0 && (
          <div style={{ background:C.white, borderRadius:16, padding:'32px 20px', textAlign:'center', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <Icon name="mapPin" size={36} color={C.hairline} />
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginTop:10 }}>No saved addresses</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:4 }}>Add a shipping address to continue</div>
          </div>
        )}

        {addresses.map(addr => {
          const active = selectedId === addr.id;
          return (
            <div key={addr.id} onClick={() => setSelectedId(addr.id)} style={{ background:C.white, borderRadius:16, padding:'14px 16px', border: active ? `1.5px solid ${C.primary}` : `1.5px solid transparent`, boxShadow: active ? `0 0 0 3px ${C.primarySoft}` : '0 2px 10px rgba(14,11,31,0.05)', cursor:'pointer', transition:'all .15s' }}>
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
                  </div>
                </div>
                <div style={{ width:22, height:22, borderRadius:9999, border: active ? 'none' : `1.5px solid ${C.hairline}`, background: active ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {active && <Icon name="check" size={12} color="#fff" sw={2.5} />}
                </div>
              </div>
              <div style={{ display:'flex', gap:14, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.hairline}` }}>
                <button onClick={e => { e.stopPropagation(); openEditForm(addr); }} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer' }}>
                  <Icon name="edit" size={13} color={C.primary} />
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.primary }}>Edit</span>
                </button>
                {!addr.isDefault && (
                  <button onClick={e => { e.stopPropagation(); setDefault(addr.id); }} style={{ border:'none', background:'none', cursor:'pointer' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.mute }}>Set as default</span>
                  </button>
                )}
                {addresses.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeAddress(addr.id); }} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer', marginLeft:'auto' }}>
                    <Icon name="trash" size={13} color={C.danger} />
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.danger }}>Delete</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button onClick={openNewForm} style={{ width:'100%', height:52, border:`2px dashed ${C.primary}`, borderRadius:14, background:C.primarySoft, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Icon name="plus" size={18} color={C.primary} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Add New Address</span>
        </button>

        <OrderSummaryMini subtotal={subtotal} discount={discount} total={total} />
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isDesktop ? '16px 0 24px' : '12px 16px 28px', background:C.white, borderTop:`1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          <Btn variant="primary" size="lg" wide disabled={!selectedAddress}
            onClick={() => navigate('checkout-payment', { ...params, address: selectedAddress })}
            style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
            Continue to Payment
            <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
          </Btn>
        </div>
      </div>

      <Modal open={formOpen} title={editingId ? 'Edit Address' : 'Add New Address'} onClose={() => setFormOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Input label="Label (e.g. Home, Work)" placeholder="Home" value={form.label} onChange={e => setForm(f => ({ ...f, label:e.target.value }))} error={errors.label} />
          <Input label="Street Address" placeholder="14 Roquette Street" value={form.line1} onChange={e => setForm(f => ({ ...f, line1:e.target.value }))} error={errors.line1} />
          <div style={{ display:'flex', gap:10 }}>
            <Input label="City" placeholder="Paris" value={form.city} onChange={e => setForm(f => ({ ...f, city:e.target.value }))} error={errors.city} style={{ flex:1 }} />
            <Input label="ZIP Code" placeholder="75011" value={form.zip} onChange={e => setForm(f => ({ ...f, zip:e.target.value }))} style={{ flex:1 }} />
          </div>
          <Input label="Country" placeholder="France" value={form.country} onChange={e => setForm(f => ({ ...f, country:e.target.value }))} />
          <Input label="Phone Number" placeholder="+509 34 56 78 90" value={form.phone} onChange={e => setForm(f => ({ ...f, phone:e.target.value }))} error={errors.phone} />
          <Btn variant="primary" size="lg" wide onClick={saveAddress} style={{ marginTop:6 }}>Save Address</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── STEP 3: PAYMENT METHOD ──────────────────────────────────
function CheckoutPaymentScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const subtotal = params.subtotal ?? 0;
  const discount = params.discount ?? 0;
  const total    = params.total ?? 0;
  const address  = params.address;

  const [paymentMethod, setPaymentMethod] = React.useState('moncash');
  const [loading, setLoading] = React.useState(false);
  const [card, setCard] = React.useState({ number:'', expiry:'', cvv:'', name:'' });
  const [cardErrors, setCardErrors] = React.useState({});

  const walletInsufficient = total > WALLET_BALANCE;
  const accountSuspended = window._PROFILE?.status === 'suspended';

  function validateCard() {
    const e = {};
    if (card.number.replace(/\s/g, '').length < 16) e.number = 'Invalid card number';
    if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'MM/YY';
    if (card.cvv.length < 3) e.cvv = 'Invalid CVV';
    if (!card.name.trim()) e.name = 'Required';
    setCardErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePay() {
    if (accountSuspended) return;
    if (paymentMethod === 'card' && !validateCard()) return;
    if (paymentMethod === 'wallet' && walletInsufficient) return;

    setLoading(true);
    let success = true;
    try {
      const user = await sbGetUser();
      await sbCreateOrder(user?.id, {
        items: params.items || [],
        shippingAddress: address,
        shippingMethod: 'standard',
        paymentMethod,
        subtotal, discount, shippingFee: 0, total,
        promoCode: null,
      });
    } catch (e) {
      // Non-fatal for the demo flow — still proceed with the simulated result below
    }
    // Simulate a real payment gateway round-trip
    await new Promise(r => setTimeout(r, 1400));
    success = Math.random() > 0.12;
    setLoading(false);

    if (success) {
      navigate('order-confirmation', { ...params, paymentMethod });
    } else {
      navigate('payment-failed', { ...params, paymentMethod });
    }
  }

  const methods = [
    { id:'moncash', label:'MonCash', sub:'Pay with your MonCash wallet', featured:true, logo:(
      <div style={{ width:44, height:28, borderRadius:7, background:'linear-gradient(135deg,#EE3831 0%,#F58220 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, color:'#fff' }}>MonCash</span>
      </div>
    ) },
    { id:'natcash', label:'NatCash', sub:'Pay with your NatCash wallet', featured:true, logo:(
      <div style={{ width:44, height:28, borderRadius:7, background:'linear-gradient(135deg,#0072BC 0%,#00A651 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, color:'#fff' }}>NatCash</span>
      </div>
    ) },
    { id:'card', label:'Credit / Debit Card', sub:'Visa, Mastercard & more', logo:(
      <div style={{ display:'flex', flexShrink:0, width:44, justifyContent:'center', gap:2 }}>
        <div style={{ width:26, height:17, borderRadius:4, background:'#1A1F71', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:6.5, fontWeight:800, color:'#fff', fontStyle:'italic' }}>VISA</span>
        </div>
        <div style={{ display:'flex' }}>
          <div style={{ width:15, height:15, borderRadius:9999, background:'#EB001B' }} />
          <div style={{ width:15, height:15, borderRadius:9999, background:'#F79E1B', marginLeft:-6 }} />
        </div>
      </div>
    ) },
    { id:'cod', label:'Cash on Delivery', sub:'Pay when your order arrives', logo:(
      <div style={{ width:44, height:28, borderRadius:7, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name="package" size={15} color={C.primary} />
      </div>
    ) },
    { id:'wallet', label:'CLORIVO Wallet', sub:`Balance: $${WALLET_BALANCE.toFixed(2)}`, disabled: walletInsufficient, logo:(
      <div style={{ width:44, height:28, borderRadius:7, background:'linear-gradient(135deg,#6C4DFF 0%,#8A6BFF 100%)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon name="wallet" size={15} color="#fff" />
      </div>
    ) },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <CheckoutTopBar title="Payment" onBack={goBack} isDesktop={isDesktop} />
        <CheckoutStepper step={3} />
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0' : '14px 16px', display:'flex', flexDirection:'column', gap:12, paddingBottom: isDesktop ? 24 : 120, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Address summary */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Shipping Address</div>
            <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primary }}>Change</button>
          </div>
          {address ? (
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="mapPin" size={16} color={C.primary} />
              </div>
              <div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:3 }}>{address.label}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.5 }}>{address.line1}<br />{address.zip} {address.city}, {address.country}<br />{address.phone}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No address selected</div>
          )}
        </div>

        <OrderSummaryMini subtotal={subtotal} discount={discount} total={total} />

        {/* Payment methods */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:10 }}>Payment Method</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {methods.map(pm => {
              const active = paymentMethod === pm.id;
              return (
                <div key={pm.id}>
                  <div
                    onClick={() => !pm.disabled && setPaymentMethod(pm.id)}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                      border: active ? `1.5px solid ${C.primary}` : `1.5px solid ${C.hairline}`,
                      background: pm.disabled ? '#FAFAFA' : active ? C.primarySoft : (pm.featured ? 'rgba(238,56,49,0.03)' : C.white),
                      borderRadius:12, cursor: pm.disabled ? 'not-allowed' : 'pointer', opacity: pm.disabled ? 0.6 : 1, transition:'all .15s'
                    }}
                  >
                    {pm.logo}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>{pm.label}</span>
                        {pm.featured && (
                          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, color:C.primary, background:C.primarySoft, borderRadius:6, padding:'2px 6px', textTransform:'uppercase', letterSpacing:'0.03em' }}>Haiti</span>
                        )}
                      </div>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color: pm.disabled ? C.danger : C.mute }}>{pm.disabled ? 'Insufficient balance' : pm.sub}</span>
                    </div>
                    <div style={{ width:22, height:22, borderRadius:9999, border: active ? 'none' : `1.5px solid ${C.hairline}`, background: active ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {active && <Icon name="check" size={12} color="#fff" sw={2.5} />}
                    </div>
                  </div>

                  {active && pm.id === 'card' && (
                    <div style={{ padding:'12px 4px 4px', display:'flex', flexDirection:'column', gap:10 }}>
                      <Input label="Card Number" placeholder="1234 5678 9012 3456" value={card.number}
                        onChange={e => setCard(c => ({ ...c, number:e.target.value }))} error={cardErrors.number} />
                      <div style={{ display:'flex', gap:10 }}>
                        <Input label="Expiry (MM/YY)" placeholder="08/28" value={card.expiry}
                          onChange={e => setCard(c => ({ ...c, expiry:e.target.value }))} error={cardErrors.expiry} style={{ flex:1 }} />
                        <Input label="CVV" placeholder="123" value={card.cvv} type="password"
                          onChange={e => setCard(c => ({ ...c, cvv:e.target.value }))} error={cardErrors.cvv} style={{ flex:1 }} />
                      </div>
                      <Input label="Cardholder Name" placeholder="Jane Doe" value={card.name}
                        onChange={e => setCard(c => ({ ...c, name:e.target.value }))} error={cardErrors.name} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'4px 0' }}>
          <Icon name="lock" size={13} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>Your payment is secured with 256-bit SSL encryption</span>
        </div>
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isDesktop ? '16px 0 24px' : '12px 16px 28px', background:C.white, borderTop:`1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          {accountSuspended && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#FDEDED', border:'1px solid #F6C9C9', borderRadius:10, padding:'8px 12px', marginBottom:10 }}>
              <Icon name="lock" size={14} color={C.danger} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.danger, fontWeight:600 }}>Your account is suspended — checkout is disabled. Contact support to appeal.</span>
            </div>
          )}
          <Btn variant="primary" size="lg" wide onClick={handlePay} disabled={loading || accountSuspended}
            style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
            {loading ? 'Processing…' : (<><Icon name="lock" size={15} color="#fff" /> Pay ${total.toFixed(2)}</>)}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 4: ORDER CONFIRMATION / SUCCESS ────────────────────
function OrderConfirmationScreen({ params = {} }) {
  const { replace } = useNav();
  const isDesktop = useIsDesktop();
  const total = params.total ?? 0;
  const orderNumber = React.useMemo(() => `CLR-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const deliveryDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  }, []);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '20px 16px 40px', maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
        <CheckoutStepper step={4} />

        <div style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, borderRadius:24, padding:'36px 24px', textAlign:'center', position:'relative', overflow:'hidden', marginTop:14 }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} style={{ position:'absolute', width:6, height:6, borderRadius:9999, background:'rgba(255,255,255,0.5)', top:`${(i * 37) % 100}%`, left:`${(i * 53) % 100}%` }} />
          ))}
          <div style={{ width:72, height:72, borderRadius:9999, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', position:'relative' }}>
            <Icon name="checkCircle" size={38} color="#fff" />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:'#fff', marginBottom:6, position:'relative' }}>Order Confirmed!</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:'rgba(255,255,255,0.9)', position:'relative' }}>Thank you for shopping with CLORIVO</div>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'16px', marginTop:14, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Order Number</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.ink }}>{orderNumber}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Amount Paid</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.primary }}>${total.toFixed(2)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Payment Method</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink, textTransform:'capitalize' }}>{(params.paymentMethod || '').replace('cod', 'Cash on Delivery')}</span>
          </div>
        </div>

        <div style={{ background:C.primarySoft, borderRadius:16, padding:'14px 16px', marginTop:14, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="truck" size={19} color={C.primary} />
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primaryDeep }}>Estimated Delivery</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.primaryDeep }}>{deliveryDate}</div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
          <Btn variant="primary" size="lg" wide onClick={() => replace('tracking')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
            Track My Order
          </Btn>
          <Btn variant="secondary" size="lg" wide onClick={() => replace('home')}>
            Continue Shopping
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT FAILED ───────────────────────────────────────────
function PaymentFailedScreen({ params = {} }) {
  const { goBack, replace } = useNav();
  const isDesktop = useIsDesktop();
  const total = params.total ?? 0;

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '20px 16px 40px', maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, display:'flex', flexDirection:'column' }}>
        <CheckoutStepper step={3} />

        <div style={{ background:'#FEF2F2', borderRadius:24, padding:'36px 24px', textAlign:'center', marginTop:14 }}>
          <div style={{ width:72, height:72, borderRadius:9999, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Icon name="xCircle" size={38} color={C.danger} />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, marginBottom:6 }}>Payment Failed</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>We couldn't process your payment of ${total.toFixed(2)}. Your card or wallet may have been declined — please try again.</div>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', marginTop:14, display:'flex', alignItems:'flex-start', gap:10, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <Icon name="alertTriangle" size={18} color={C.warning} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, lineHeight:1.5 }}>No charge was made to your account. You can try again with the same payment method or switch to a different one.</span>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
          <Btn variant="primary" size="lg" wide onClick={goBack} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
            <Icon name="refreshCw" size={15} color="#fff" /> Try Again
          </Btn>
          <Btn variant="secondary" size="lg" wide onClick={() => replace('cart')}>
            Back to Cart
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CheckoutAddressScreen, CheckoutPaymentScreen, OrderConfirmationScreen, PaymentFailedScreen });
