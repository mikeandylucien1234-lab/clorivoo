// screen-support.jsx — Help Center & Support Tickets

const FAQS = [
  { q:'How do I track my order?', a:'Go to My Orders from your profile, select the order, and view its live tracking timeline.' },
  { q:'What payment methods do you accept?', a:'We accept Visa, Mastercard, PayPal, Apple Pay, Google Pay, MonCash, NatCash, Cash on Delivery, and your CLORIVO Wallet balance.' },
  { q:'How do I cancel an order?', a:'Orders can be cancelled from the Order Tracking page while they are still Confirmed or Preparing.' },
  { q:'How long does delivery take?', a:'Most orders arrive within 3–7 business days depending on your location and the seller.' },
  { q:'How do I become a seller on CLORIVO?', a:'Visit Profile → Become a Seller and complete the quick verification process.' },
];

window._TICKETS = window._TICKETS || [
  { id:'TCK-3821', subject:'Order not received', status:'open',   createdAt:'2024-05-10' },
  { id:'TCK-3790', subject:'Refund question',    status:'closed', createdAt:'2024-04-22' },
];

function SupportTicketsScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = React.useState('faq');
  const [openFaq, setOpenFaq] = React.useState(null);
  const [tickets, setTickets] = React.useState(window._TICKETS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState({ subject:'', message:'' });
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => { window._TICKETS = tickets; }, [tickets]);

  function submitTicket() {
    if (!form.subject.trim() || !form.message.trim()) { setToast({ type:'error', message:'Please fill in all fields' }); return; }
    const id = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    setTickets(prev => [{ id, subject: form.subject, status:'open', createdAt: new Date().toISOString().slice(0,10) }, ...prev]);
    setForm({ subject:'', message:'' });
    setFormOpen(false);
    setToast({ type:'success', message:'Support ticket submitted' });
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0 0' : '14px 20px 0', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Help & Support</span>
        </div>
        <div style={{ display:'flex', gap:8, padding: isDesktop ? '14px 0' : '12px 20px', maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          {[{k:'faq',l:'FAQ'},{k:'tickets',l:'My Tickets'},{k:'contact',l:'Contact Us'}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{ border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 16px', background: tab===t.k ? C.primary : C.paper, color: tab===t.k ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600 }}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '20px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:12, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {tab === 'faq' && (
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'14px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{f.q}</span>
                  <Icon name="chevronRight" size={15} color={C.mute} style={{ transform: openFaq === i ? 'rotate(90deg)' : 'none', transition:'transform .15s', flexShrink:0 }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding:'0 16px 16px' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.6 }}>{f.a}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'tickets' && (
          <>
            {tickets.length === 0 && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 24px', gap:14 }}>
                <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="lifeBuoy" size={36} color={C.primary} />
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No support tickets</div>
              </div>
            )}
            {tickets.map(t => (
              <div key={t.id} style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:9999, background: t.status === 'open' ? C.primarySoft : '#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="fileText" size={17} color={t.status === 'open' ? C.primary : C.success} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{t.subject}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{t.id} · {new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color: t.status === 'open' ? C.primary : C.success, background: t.status === 'open' ? C.primarySoft : '#ECFDF5', borderRadius:9999, padding:'3px 9px', textTransform:'capitalize' }}>{t.status}</span>
              </div>
            ))}
            <button onClick={() => setFormOpen(true)} style={{ width:'100%', height:52, border:`2px dashed ${C.primary}`, borderRadius:14, background:C.primarySoft, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Icon name="plus" size={18} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Submit New Ticket</span>
            </button>
          </>
        )}

        {tab === 'contact' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => navigate('chat')} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:16, padding:'16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ width:44, height:44, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="messageSquare" size={20} color={C.primary} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Live Chat</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Chat with our support team now</div>
              </div>
              <Icon name="chevronRight" size={16} color={C.mute} />
            </button>
            <button onClick={() => setToast({ type:'success', message:'Calling +509 34 56 78 90…' })} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:16, padding:'16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ width:44, height:44, borderRadius:9999, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="headphones" size={20} color={C.success} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Call Support</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>+509 34 56 78 90</div>
              </div>
              <Icon name="chevronRight" size={16} color={C.mute} />
            </button>
            <button onClick={() => setToast({ type:'success', message:'Opening support@clorivo.com…' })} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:16, padding:'16px', border:'none', cursor:'pointer', textAlign:'left', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ width:44, height:44, borderRadius:9999, background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="mail" size={20} color="#F59E0B" />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Email Support</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>support@clorivo.com</div>
              </div>
              <Icon name="chevronRight" size={16} color={C.mute} />
            </button>
          </div>
        )}
      </div>

      <Modal open={formOpen} title="Submit a Ticket" onClose={() => setFormOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Input label="Subject" placeholder="What do you need help with?" value={form.subject} onChange={e => setForm(f => ({ ...f, subject:e.target.value }))} />
          <div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute }}>Message</span>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message:e.target.value }))} rows={4}
              placeholder="Describe your issue in detail…"
              style={{ width:'100%', marginTop:5, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'12px 14px', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink, resize:'vertical', boxSizing:'border-box' }} />
          </div>
          <Btn variant="primary" size="lg" wide onClick={submitTicket} style={{ marginTop:4 }}>Submit Ticket</Btn>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { SupportTicketsScreen });
