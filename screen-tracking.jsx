// screen-tracking.jsx — Order Tracking

function TrackingScreen() {
  const { navigate, goBack } = useNav();

  const steps = [
    { label:'Order placed',      date:'Mar 13 · 1:42 PM', done:true,    icon:'check' },
    { label:'Payment confirmed',    date:'Mar 13 · 1:43 PM', done:true,    icon:'creditCard' },
    { label:'Packed by seller',date:'Mar 14 · 9:15 AM', done:true,    icon:'package' },
    { label:'In transit',           date:'Mar 15 · ongoing', done:true, icon:'truck', current:true },
    { label:'Out for delivery',date:'Mar 16',          done:false,   icon:'mapPin' },
    { label:'Delivered',                date:'Mar 16',          done:false,   icon:'checkCircle' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Order Tracking" onBack={goBack}
          right={
            <button onClick={() => navigate('chat')} style={{ width:44, height:44, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="message" size={20} color={C.primary} />
            </button>
          }
        />
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:14, paddingBottom:40 }}>

        {/* Hero status card */}
        <div style={{ borderRadius:16, background:`linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDeep} 100%)`, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ position:'absolute', left:-10, bottom:-40, width:100, height:100, borderRadius:9999, background:'rgba(255,255,255,0.05)' }} />
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'rgba(255,255,255,0.75)', marginBottom:6, letterSpacing:'0.04em' }}>ORDER #CL-29841</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', marginBottom:4 }}>Arriving Saturday</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:'rgba(255,255,255,0.85)', marginBottom:16 }}>Between 9:00 AM and 6:00 PM · Paris 75011</div>

          {/* Mini map */}
          <div style={{ borderRadius:10, background:'rgba(255,255,255,0.12)', padding:'10px 12px', overflow:'hidden', height:70, position:'relative' }}>
            <svg viewBox="0 0 320 60" style={{ width:'100%', height:'100%', position:'absolute', inset:0 }}>
              <defs>
                <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)"/>
                  <stop offset="70%" stopColor="rgba(255,255,255,0.9)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,0.35)"/>
                </linearGradient>
              </defs>
              <path d="M20 45 Q80 5 160 28 T300 15" fill="none" stroke="url(#routeGrad)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3"/>
              <circle cx="20" cy="45" r="5" fill="rgba(255,255,255,0.5)"/>
              <circle cx="165" cy="28" r="7" fill="#fff" opacity="0.9"/>
              <circle cx="165" cy="28" r="12" fill="rgba(255,255,255,0.2)"/>
              <circle cx="300" cy="15" r="5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
            </svg>
            <div style={{ position:'absolute', bottom:6, left:10, fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.65)' }}>Shanghai</div>
            <div style={{ position:'absolute', top:6, right:10, fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.65)' }}>Paris</div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px 18px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink, marginBottom:16, letterSpacing:'-0.02em' }}>Delivery steps</div>
          {steps.map((step, i) => (
            <div key={i} style={{ display:'flex', gap:14, position:'relative' }}>
              {/* Line */}
              {i < steps.length - 1 && (
                <div style={{ position:'absolute', left:15, top:30, width:2, height:'calc(100% - 10px)', background: step.done ? C.primary : C.hairline, zIndex:0, transition:'background 0.3s' }} />
              )}
              {/* Dot */}
              <div style={{ width:32, height:32, borderRadius:9999, background: step.current ? C.primary : step.done ? C.primarySoft : C.paper, border:`2px solid ${step.done ? C.primary : C.hairline}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, zIndex:1, transition:'all 0.3s' }}>
                <Icon name={step.icon} size={14} color={step.current ? '#fff' : step.done ? C.primary : C.mute} sw={step.current ? 2 : 1.5} />
              </div>
              {/* Content */}
              <div style={{ flex:1, paddingBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight: step.current || step.done ? 600 : 400, color: step.done ? C.ink : C.mute }}>{step.label}</span>
                  {step.current && (
                    <span style={{ background:C.primarySoft, color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:9999 }}>Ongoing</span>
                  )}
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, marginTop:2 }}>{step.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div style={{ background:C.white, borderRadius:16, padding:'14px 16px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink, marginBottom:12 }}>Items ordered</div>
          {window.CART_ITEMS.map((item, i) => (
            <div key={i} style={{ display:'flex', gap:12, paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
              <Img label="" tint={item.product.id % 5} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.ink }}>{item.product.title}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Qty {item.qty} · {item.variant}</div>
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:C.ink }}>${(item.product.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => navigate('chat')}>
            <Icon name="message" size={16} color={C.mute} />
            Contact
          </Btn>
          <Btn variant="ghost" size="md" style={{ flex:1 }}>
            <Icon name="help" size={16} color={C.primary} />
            Help
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TrackingScreen });
