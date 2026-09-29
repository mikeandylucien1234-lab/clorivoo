// screen-premium.jsx — CLORIVO Premium + Invite Friends

const PREMIUM_PLANS = [
  { id:'monthly', label:'Monthly', price:4.99, period:'/month' },
  { id:'yearly',  label:'Yearly',  price:39.99, period:'/year', badge:'Save 33%' },
];
const PREMIUM_BENEFITS = [
  { icon:'truck',   title:'Free Delivery',      desc:'Unlimited free shipping on every order' },
  { icon:'tag',     title:'Exclusive Deals',    desc:'Early access to flash sales and premium-only discounts' },
  { icon:'headphones', title:'VIP Support',     desc:'Priority live chat with our support team' },
  { icon:'gift',    title:'Bonus Cashback',     desc:'Earn 2x wallet cashback on every purchase' },
];

function PremiumScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [plan, setPlan] = React.useState('yearly');
  const [isPremium, setIsPremium] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  async function upgrade() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    setProcessing(false);
    setIsPremium(true);
    setToast({ type:'success', message:'Welcome to CLORIVO Premium!' });
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>CLORIVO Premium</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 120px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div style={{ borderRadius:20, background:'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', padding:'26px 20px', textAlign:'center', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.12)' }} />
          <div style={{ width:56, height:56, borderRadius:9999, background:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', position:'relative' }}>
            <Icon name="crown" size={28} color="#fff" />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:'#fff', position:'relative' }}>{isPremium ? "You're a Premium Member" : 'Unlock CLORIVO Premium'}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:4, position:'relative' }}>Free delivery, exclusive deals, and VIP support</div>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Premium Benefits</div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {PREMIUM_BENEFITS.map((b, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:38, height:38, borderRadius:10, background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={b.icon} size={18} color="#D97706" />
                </div>
                <div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:700, color:C.ink }}>{b.title}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:1 }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isPremium && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {PREMIUM_PLANS.map(p => {
              const active = plan === p.id;
              return (
                <div key={p.id} onClick={() => setPlan(p.id)} style={{ display:'flex', alignItems:'center', gap:14, background:C.white, borderRadius:16, padding:'16px', border: active ? `1.5px solid #D97706` : `1.5px solid ${C.hairline}`, cursor:'pointer' }}>
                  <div style={{ width:22, height:22, borderRadius:9999, border: active ? 'none' : `1.5px solid ${C.hairline}`, background: active ? '#D97706' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {active && <Icon name="check" size={12} color="#fff" sw={2.5} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>{p.label}</span>
                      {p.badge && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:800, color:'#D97706', background:'#FFFBEB', borderRadius:6, padding:'2px 7px' }}>{p.badge}</span>}
                    </div>
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17, fontWeight:800, color:C.ink }}>${p.price}<span style={{ fontSize:12, color:C.mute, fontFamily:"'Inter',sans-serif" }}>{p.period}</span></span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding: isDesktop ? '16px 0 24px' : '12px 16px 28px', background:C.white, borderTop:`1px solid ${C.hairline}` }}>
        <div style={{ maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined }}>
          {isPremium ? (
            <Btn variant="secondary" size="lg" wide onClick={goBack}>You're All Set</Btn>
          ) : (
            <Btn variant="primary" size="lg" wide onClick={upgrade} disabled={processing} style={{ background:'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', boxShadow:'0 8px 20px rgba(217,119,6,0.3)' }}>
              {processing ? 'Processing…' : `Go Premium — $${PREMIUM_PLANS.find(p=>p.id===plan).price}${PREMIUM_PLANS.find(p=>p.id===plan).period}`}
            </Btn>
          )}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── INVITE FRIENDS / REFERRAL ────────────────────────────────
function InviteFriendsScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [toast, setToast] = React.useState(null);
  const referralCode = 'JOHN2024';
  const invited = [
    { name:'Marie L.', status:'joined', reward:10 },
    { name:'Paul S.',  status:'pending', reward:0 },
  ];
  const totalEarned = invited.filter(i => i.status === 'joined').reduce((s,i)=>s+i.reward, 0);

  function copyCode() {
    navigator.clipboard?.writeText(referralCode)
      .then(() => setToast({ type:'success', message:'Referral code copied' }))
      .catch(() => setToast({ type:'error', message:'Could not copy code' }));
  }
  function share() {
    setToast({ type:'success', message:'Opening share sheet…' });
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Invite Friends</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 560 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div style={{ borderRadius:20, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'24px 20px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ width:56, height:56, borderRadius:9999, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', position:'relative' }}>
            <Icon name="gift" size={26} color="#fff" />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:'#fff', position:'relative' }}>Give $10, Get $10</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.9)', marginTop:4, position:'relative' }}>Invite friends and you'll both earn wallet credit</div>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginBottom:8 }}>Your referral code</div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, height:48, border:`1.5px dashed ${C.primary}`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:C.primarySoft }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17, fontWeight:800, color:C.primaryDeep, letterSpacing:'0.08em' }}>{referralCode}</span>
            </div>
            <button onClick={copyCode} style={{ width:48, height:48, borderRadius:12, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="copy" size={18} color={C.ink} />
            </button>
          </div>
          <Btn variant="primary" size="md" wide onClick={share} style={{ marginTop:12, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
            <Icon name="share" size={15} color="#fff" /> Share Invite Link
          </Btn>
        </div>

        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Your Invites</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.success }}>+${totalEarned.toFixed(2)} earned</span>
          </div>
          {invited.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
              <Avatar size={36} initials={f.name.split(' ').map(n=>n[0]).join('')} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{f.name}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color: f.status === 'joined' ? C.success : C.mute, textTransform:'capitalize' }}>{f.status}</div>
              </div>
              {f.reward > 0 && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.success }}>+${f.reward}</span>}
            </div>
          ))}
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { PremiumScreen, InviteFriendsScreen });
