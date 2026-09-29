// screen-wallet.jsx — CLORIVO Wallet

window._WALLET_BALANCE = window._WALLET_BALANCE ?? 45.50;
window._WALLET_TX = window._WALLET_TX || [
  { id:1, type:'cashback', label:'Cashback · Order #CLV782145', amount:+7.56,  date:'2024-05-11' },
  { id:2, type:'deposit',  label:'Top up via MonCash',           amount:+50.00, date:'2024-05-08' },
  { id:3, type:'payment',  label:'Order #CLV775230',             amount:-12.90, date:'2024-04-21' },
  { id:4, type:'promo',    label:'Welcome bonus',                amount:+10.00, date:'2024-04-01' },
  { id:5, type:'payment',  label:'Order #CLV772109',             amount:-39.00, date:'2024-04-15' },
];

function txMeta(type) {
  if (type === 'deposit')  return { icon:'download', color:C.success, bg:'#ECFDF5' };
  if (type === 'cashback') return { icon:'gift',      color:C.primary, bg:C.primarySoft };
  if (type === 'promo')    return { icon:'tag',       color:'#F59E0B', bg:'#FFFBEB' };
  return { icon:'cart', color:C.danger, bg:'#FEF2F2' };
}

function WalletScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [balance, setBalance] = React.useState(window._WALLET_BALANCE);
  const [tx, setTx] = React.useState(window._WALLET_TX);
  const [modal, setModal] = React.useState(null); // 'deposit' | 'withdraw' | 'transfer'
  const [amount, setAmount] = React.useState('');
  const [recipient, setRecipient] = React.useState('');
  const [toast, setToast] = React.useState(null);
  const [processing, setProcessing] = React.useState(false);

  React.useEffect(() => { window._WALLET_BALANCE = balance; window._WALLET_TX = tx; }, [balance, tx]);

  function addTx(entry) {
    setTx(prev => [{ id: Date.now(), date: new Date().toISOString().slice(0,10), ...entry }, ...prev]);
  }

  async function confirmAction() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setToast({ type:'error', message:'Enter a valid amount' }); return; }
    if ((modal === 'withdraw' || modal === 'transfer') && val > balance) { setToast({ type:'error', message:'Insufficient wallet balance' }); return; }
    setProcessing(true);
    await new Promise(r => setTimeout(r, 900));
    if (modal === 'deposit') {
      setBalance(b => b + val);
      addTx({ type:'deposit', label:'Wallet top up', amount: val });
      setToast({ type:'success', message:`$${val.toFixed(2)} added to your wallet` });
    } else if (modal === 'withdraw') {
      setBalance(b => b - val);
      addTx({ type:'payment', label:'Withdrawal to bank account', amount: -val });
      setToast({ type:'success', message:`$${val.toFixed(2)} withdrawal requested` });
    } else if (modal === 'transfer') {
      if (!recipient.trim()) { setProcessing(false); setToast({ type:'error', message:'Enter a recipient' }); return; }
      setBalance(b => b - val);
      addTx({ type:'payment', label:`Transfer to ${recipient}`, amount: -val });
      setToast({ type:'success', message:`$${val.toFixed(2)} sent to ${recipient}` });
    }
    setProcessing(false);
    setModal(null);
    setAmount('');
    setRecipient('');
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>CLORIVO Wallet</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:14, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Balance card */}
        <div style={{ borderRadius:20, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'22px 20px', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.8)', position:'relative' }}>Available Balance</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:34, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', position:'relative' }}>${balance.toFixed(2)}</div>
          <div style={{ display:'flex', gap:10, marginTop:16, position:'relative' }}>
            <button onClick={() => setModal('deposit')} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'rgba(255,255,255,0.16)', borderRadius:12, padding:'10px 0', cursor:'pointer' }}>
              <Icon name="download" size={17} color="#fff" style={{ transform:'rotate(180deg)' }} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color:'#fff' }}>Top Up</span>
            </button>
            <button onClick={() => setModal('withdraw')} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'rgba(255,255,255,0.16)', borderRadius:12, padding:'10px 0', cursor:'pointer' }}>
              <Icon name="download" size={17} color="#fff" />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color:'#fff' }}>Withdraw</span>
            </button>
            <button onClick={() => setModal('transfer')} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'rgba(255,255,255,0.16)', borderRadius:12, padding:'10px 0', cursor:'pointer' }}>
              <Icon name="users" size={17} color="#fff" />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:600, color:'#fff' }}>Transfer</span>
            </button>
          </div>
        </div>

        {/* Promo rewards */}
        <div style={{ background:'#FFFBEB', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:9999, background:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="gift" size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:'#92400E' }}>You've earned $17.56 in cashback & rewards</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'#92400E' }}>Automatically added to your wallet balance</div>
          </div>
        </div>

        {/* Transaction history */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Transaction History</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {tx.map((t, i) => {
              const meta = txMeta(t.type);
              return (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <div style={{ width:38, height:38, borderRadius:9999, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon name={meta.icon} size={17} color={meta.color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{t.label}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{new Date(t.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</div>
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color: t.amount > 0 ? C.success : C.ink }}>{t.amount > 0 ? '+' : '-'}${Math.abs(t.amount).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={!!modal} title={modal === 'deposit' ? 'Top Up Wallet' : modal === 'withdraw' ? 'Withdraw Funds' : 'Transfer Balance'} onClose={() => setModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {modal === 'transfer' && (
            <Input label="Recipient (email or phone)" placeholder="jane@example.com" value={recipient} onChange={e => setRecipient(e.target.value)} />
          )}
          <Input label="Amount (USD)" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g,''))} />
          {(modal === 'withdraw' || modal === 'transfer') && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>Available balance: ${balance.toFixed(2)}</div>
          )}
          <Btn variant="primary" size="lg" wide onClick={confirmAction} disabled={processing} style={{ marginTop:4 }}>
            {processing ? 'Processing…' : modal === 'deposit' ? 'Top Up' : modal === 'withdraw' ? 'Withdraw' : 'Send'}
          </Btn>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { WalletScreen });
