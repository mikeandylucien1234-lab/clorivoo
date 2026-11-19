// screen-notifications.jsx — Notifications Center, Detail, and Settings

const NOTIF_CATEGORIES = [
  { key:'all',         label:'All' },
  { key:'orders',      label:'Orders' },
  { key:'promotions',  label:'Promotions' },
  { key:'system',      label:'System' },
  { key:'messages',    label:'Messages' },
  { key:'wallet',      label:'Wallet' },
  { key:'security',    label:'Security' },
];

const NOTIF_META = {
  shipped:         { icon:'truck',       bg:C.primarySoft, color:C.primary },
  delivered:       { icon:'package',     bg:'#FFF7ED',      color:'#E67E22' },
  cancelled:       { icon:'xCircle',     bg:'#FEF2F2',      color:C.danger },
  flash_sale:      { icon:'zap',         bg:'#ECFDF5',      color:C.success },
  new_arrival:     { icon:'gift',        bg:'#FFF1F2',      color:'#E85D75' },
  wishlist:        { icon:'heart',       bg:'#FFF1F2',      color:C.danger },
  reminder:        { icon:'bell',        bg:'#FFFBEB',      color:'#F59E0B' },
  seller_reply:    { icon:'messageSquare', bg:'#EEF2FF',    color:'#4A6FD4' },
  wallet_credit:   { icon:'wallet',      bg:C.primarySoft, color:C.primary },
  payment_failed:  { icon:'alertTriangle', bg:'#FEF2F2',    color:C.danger },
  password_changed:{ icon:'lock',        bg:'#EEF2FF',      color:'#4A6FD4' },
  login_alert:     { icon:'shield',      bg:'#FEF2F2',      color:C.danger },
};

function agoISO(hoursAgo) { return new Date(Date.now() - hoursAgo * 3600000).toISOString(); }
function inISO(hoursFromNow) { return new Date(Date.now() + hoursFromNow * 3600000).toISOString(); }

window._NOTIFICATIONS = window._NOTIFICATIONS || [];

function groupOf(createdAt) {
  const days = (Date.now() - new Date(createdAt)) / 86400000;
  if (days < 1) return 'new';
  if (days < 7) return 'week';
  return 'older';
}
function relTime(createdAt) {
  const mins = Math.floor((Date.now() - new Date(createdAt)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── SWIPEABLE NOTIFICATION CARD ────────────────────────────────
function NotifCard({ notif, onOpen, onMarkRead, onArchive, onDelete }) {
  const meta = NOTIF_META[notif.kind] || { icon:'bell', bg:C.paper, color:C.mute };
  const [dragX, setDragX] = React.useState(0);
  const drag = React.useRef({ startX:0, dragging:false, baseX:0, moved:false });

  function onPointerDown(e) { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { startX: e.clientX, dragging:true, baseX: dragX, moved:false }; }
  function onPointerMove(e) {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX + drag.current.baseX;
    if (Math.abs(e.clientX - drag.current.startX) > 4) drag.current.moved = true;
    setDragX(Math.max(-140, Math.min(0, dx)));
  }
  function onPointerUpEnd() {
    if (!drag.current.dragging) return;
    setDragX(prev => (prev < -70 ? -140 : 0));
    drag.current.dragging = false;
  }

  function openIt() {
    // Ignore the synthetic click that follows a drag's pointerup
    if (drag.current.moved) { drag.current.moved = false; return; }
    if (dragX !== 0) { setDragX(0); return; }
    onMarkRead(notif.id);
    onOpen(notif);
  }

  return (
    <div style={{ position:'relative', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
      <div style={{ position:'absolute', inset:0, display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => onArchive(notif.id)} style={{ width:70, border:'none', background:C.mute, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
          <Icon name="archive" size={17} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'#fff', fontWeight:600 }}>Archive</span>
        </button>
        <button onClick={() => onDelete(notif.id)} style={{ width:70, border:'none', background:C.danger, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
          <Icon name="trash" size={17} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'#fff', fontWeight:600 }}>Delete</span>
        </button>
      </div>
      <div
        onClick={openIt}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUpEnd} onPointerLeave={onPointerUpEnd}
        style={{ position:'relative', display:'flex', gap:12, padding:'14px', background: notif.unread ? C.primarySoft : C.white, cursor:'pointer', transform:`translateX(${dragX}px)`, transition: drag.current.dragging ? 'none' : 'transform 0.2s', touchAction:'pan-y' }}
      >
        <div style={{ width:44, height:44, borderRadius:12, background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={meta.icon} size={20} color={meta.color} />
        </div>
        <div style={{ flex:1, minWidth:0, paddingRight:10 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight: notif.unread ? 700 : 500, color:C.ink, lineHeight:1.3, marginBottom:3 }}>{notif.title}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, lineHeight:1.4, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{notif.body}</div>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{relTime(notif.createdAt)}</span>
        </div>
        {notif.unread && <div style={{ width:8, height:8, borderRadius:9999, background:C.primary, flexShrink:0, marginTop:4 }} />}
      </div>
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────
function NotifSkeleton() {
  const shimmer = { background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', borderRadius:8 };
  return (
    <div style={{ display:'flex', gap:12, padding:'14px', marginBottom:10 }}>
      <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, ...shimmer }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ height:13, width:'70%', ...shimmer }} />
        <div style={{ height:11, width:'90%', ...shimmer }} />
        <div style={{ height:10, width:'30%', ...shimmer }} />
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS MAIN PAGE ────────────────────────────────────
function NotificationsScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = React.useState('all');
  const [notifications, setNotifications] = React.useState(window._NOTIFICATIONS);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pull, setPull] = React.useState(0);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const touchRef = React.useRef({ startY:0, pulling:false });
  const scrollRef = React.useRef(null);

  React.useEffect(() => { window._NOTIFICATIONS = notifications; }, [notifications]);
  React.useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  const active = notifications.filter(n => !n.archived);
  const counts = { all: active.filter(n=>n.unread).length };
  NOTIF_CATEGORIES.slice(1).forEach(c => { counts[c.key] = active.filter(n => n.category === c.key && n.unread).length; });

  const filtered = tab === 'all' ? active : active.filter(n => n.category === tab);
  const groups = { new: [], week: [], older: [] };
  filtered.forEach(n => groups[groupOf(n.createdAt)].push(n));
  const unreadTotal = active.filter(n => n.unread).length;

  function markRead(id) { setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread:false } : n)); }
  function markAllRead() { setNotifications(prev => prev.map(n => ({ ...n, unread:false }))); setToast({ type:'success', message:'All notifications marked as read' }); }
  function archiveOne(id) { setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived:true } : n)); setToast({ type:'success', message:'Notification archived' }); }
  function deleteOne(id) { setNotifications(prev => prev.filter(n => n.id !== id)); setToast({ type:'success', message:'Notification deleted' }); }
  function clearAll() { setNotifications(prev => prev.map(n => ({ ...n, archived:true }))); setConfirmClear(false); setToast({ type:'success', message:'All notifications cleared' }); }

  function openNotif(notif) { navigate('notification-detail', { notif }); }

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 700));
    setRefreshing(false);
    setPull(0);
  }
  function onTouchStart(e) { if (scrollRef.current && scrollRef.current.scrollTop <= 0) touchRef.current = { startY: e.touches[0].clientY, pulling:true }; }
  function onTouchMove(e) { if (!touchRef.current.pulling) return; const dy = e.touches[0].clientY - touchRef.current.startY; if (dy > 0) setPull(Math.min(dy * 0.5, 80)); }
  function onTouchEnd() { if (touchRef.current.pulling && pull > 50) handleRefresh(); else setPull(0); touchRef.current.pulling = false; }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, flexShrink:0 }}>
        {!isDesktop && (
          <div style={{ padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div onClick={() => navigate('home')} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <div style={{ width:28, height:28, borderRadius:9, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name="shoppingBag" size={15} color="#fff" sw={2} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:18, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>CLORIVO</span>
            </div>
            <div style={{ display:'flex', gap:4, alignItems:'center' }}>
              <button onClick={() => navigate('notification-settings')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="settings" size={20} color={C.mute} />
              </button>
              <button onClick={() => setConfirmClear(true)} disabled={!active.length} style={{ width:40, height:40, border:'none', background:'none', cursor: active.length ? 'pointer' : 'default', opacity: active.length ? 1 : 0.4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="trash" size={19} color={C.danger} />
              </button>
            </div>
          </div>
        )}

        <div style={{ padding: isDesktop ? '24px 32px 0' : '4px 20px 0', maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Notifications</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2 }}>Stay updated on everything that matters.</div>
        </div>

        <div style={{ display:'flex', gap:8, overflowX:'auto', padding: isDesktop ? '14px 32px 14px' : '12px 20px 12px', maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          {NOTIF_CATEGORIES.map(c => {
            const activeTab = tab === c.key;
            const count = counts[c.key] || 0;
            return (
              <button key={c.key} onClick={() => setTab(c.key)} style={{
                flexShrink:0, display:'inline-flex', alignItems:'center', gap:6, border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 14px',
                background: activeTab ? C.primary : C.paper, color: activeTab ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, transition:'all .15s',
              }}>
                {c.label}
                {count > 0 && (
                  <span style={{ background: activeTab ? 'rgba(255,255,255,0.25)' : C.primarySoft, color: activeTab ? '#fff' : C.primary, fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, minWidth:18, height:18, borderRadius:9999, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        {(pull > 0 || refreshing) && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height: refreshing ? 44 : pull, transition: refreshing ? 'height .2s' : 'none', overflow:'hidden' }}>
            <Icon name="refreshCw" size={20} color={C.primary} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none', transform: !refreshing ? `rotate(${pull * 3}deg)` : undefined }} />
          </div>
        )}

        <div style={{ maxWidth: isDesktop ? 1000 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '4px 32px 24px' : '4px 16px', width: isDesktop ? '100%' : undefined }}>

          {loading && [...Array(4)].map((_, i) => <NotifSkeleton key={i} />)}

          {!loading && unreadTotal > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:C.primarySoft, borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primaryDeep }}>{unreadTotal} unread notification{unreadTotal > 1 ? 's' : ''}</span>
              <button onClick={markAllRead} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                <Icon name="checkCircle" size={14} color={C.primary} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Mark all read</span>
              </button>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', gap:14 }}>
              <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="bell" size={38} color={C.primary} />
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>You're all caught up!</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center' }}>No notifications here yet.</div>
            </div>
          )}

          {!loading && groups.new.length > 0 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <div style={{ width:6, height:6, borderRadius:9999, background:C.primary }} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, letterSpacing:'0.08em', textTransform:'uppercase' }}>New</span>
              </div>
              {groups.new.map(n => <NotifCard key={n.id} notif={n} onOpen={openNotif} onMarkRead={markRead} onArchive={archiveOne} onDelete={deleteOne} />)}
            </div>
          )}
          {!loading && groups.week.length > 0 && (
            <div style={{ marginBottom:8 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>This Week</div>
              {groups.week.map(n => <NotifCard key={n.id} notif={n} onOpen={openNotif} onMarkRead={markRead} onArchive={archiveOne} onDelete={deleteOne} />)}
            </div>
          )}
          {!loading && groups.older.length > 0 && (
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Older</div>
              {groups.older.map(n => <NotifCard key={n.id} notif={n} onOpen={openNotif} onMarkRead={markRead} onArchive={archiveOne} onDelete={deleteOne} />)}
            </div>
          )}
        </div>
      </div>

      <Modal open={confirmClear} title="Clear All Notifications" onClose={() => setConfirmClear(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.mute }}>This will archive every notification in your list. You can still find them later from support if needed.</span>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setConfirmClear(false)}>Cancel</Btn>
            <Btn variant="danger" size="md" style={{ flex:1 }} onClick={clearAll}>Clear All</Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {!isDesktop && (
        <BottomNav active={4} onTab={(i) => {
          if (i === 0) navigate('home');
          else if (i === 1) navigate('categories');
          else if (i === 2) navigate('cart');
          else if (i === 3) navigate('tracking');
          else if (i === 4) navigate('profile');
        }} />
      )}
    </div>
  );
}

// ─── NOTIFICATION DETAIL PAGE ────────────────────────────────────
function NotificationDetailScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const notif = params.notif;
  const [toast, setToast] = React.useState(null);

  if (!notif) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Btn variant="secondary" onClick={goBack}>Go back</Btn>
      </div>
    );
  }

  const meta = NOTIF_META[notif.kind] || { icon:'bell', bg:C.paper, color:C.mute };
  const isOrder = notif.category === 'orders';
  const heroColor = notif.kind === 'cancelled' || notif.kind === 'payment_failed' ? C.danger
    : notif.kind === 'delivered' ? C.success : C.primary;

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Notification Detail</span>
          </div>
          <button onClick={() => setToast({ type:'success', message:'More options' })} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
            <Icon name="moreHorizontal" size={19} color={C.ink} sw={2.5} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Hero banner */}
        <div style={{ borderRadius:20, background:`linear-gradient(135deg, ${heroColor} 0%, ${heroColor === C.primary ? C.primaryDeep : heroColor} 100%)`, padding:'32px 20px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position:'absolute', width:6, height:6, borderRadius:9999, background:'rgba(255,255,255,0.4)', top:`${(i * 31) % 100}%`, left:`${(i * 47) % 100}%` }} />
          ))}
          <div style={{ width:76, height:76, borderRadius:9999, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 4px', position:'relative' }}>
            <Icon name={meta.icon} size={36} color="#fff" />
          </div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, marginBottom:8 }}>{notif.title}</div>
          {notif.status && (
            <span style={{ display:'inline-block', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color: heroColor, background: notif.kind==='delivered' ? '#ECFDF5' : notif.kind==='cancelled' ? '#FEF2F2' : C.primarySoft, borderRadius:9999, padding:'4px 12px', marginBottom:10 }}>{notif.status}</span>
          )}
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, lineHeight:1.6, marginTop:6 }}>
            Hello {(window._PROFILE?.name || '').split(' ')[0] || 'there'},<br /><br />{notif.body}
          </div>
        </div>

        {isOrder && notif.trackingNumber && (
          <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Delivery Details</div>
            <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Carrier</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{notif.carrier}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Tracking Number</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{notif.trackingNumber}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Ship Date</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{new Date(notif.shipDate).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Estimated Delivery</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{new Date(notif.estimatedDelivery).toLocaleDateString('en-US', { month:'long', day:'numeric' })}</span>
              </div>
            </div>
            <Btn variant="primary" size="md" wide onClick={() => navigate('order-detail', { order: { id: notif.orderId, status: notif.kind==='delivered'?'delivered':'in_transit', placedAt: notif.shipDate, total: notif.items?.reduce((s,i)=>s+i.price,0) || 0, estimatedDelivery: notif.estimatedDelivery, deliveredAt: notif.kind==='delivered' ? notif.estimatedDelivery : undefined, carrier: notif.carrier, trackingNumber: notif.trackingNumber, origin:'Miami, USA', destination:'Port-au-Prince, Haiti', items: notif.items || [], timeline:[{ at: notif.shipDate, title: notif.title, desc: notif.body }] } })} style={{ marginTop:14, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
              <Icon name="truck" size={15} color="#fff" /> Track My Package
            </Btn>
          </div>
        )}

        {notif.items && notif.items.length > 0 && (
          <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Order Items</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {notif.items.map((it, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'center', paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                  <Img label="" tint={it.tint} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{it.title}</div>
                    <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{it.variant} · Qty 1</div>
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>${it.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notif.category === 'promotions' && (
          <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            {notif.discount && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Discount</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:C.success }}>-{notif.discount}%</span>
              </div>
            )}
            {notif.expiresAt && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Offer Expires</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{new Date(notif.expiresAt).toLocaleDateString('en-US', { month:'long', day:'numeric' })}</span>
              </div>
            )}
            <Btn variant="primary" size="md" wide onClick={() => navigate('categories')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
              <Icon name="tag" size={15} color="#fff" /> Shop the Sale
            </Btn>
          </div>
        )}

        {notif.category === 'wallet' && (
          <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Amount</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:800, color: notif.kind === 'payment_failed' ? C.danger : C.success }}>{notif.kind === 'payment_failed' ? '-' : '+'}${notif.amount?.toFixed(2)}</span>
            </div>
            <Btn variant="primary" size="md" wide onClick={() => navigate('wallet')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
              <Icon name="wallet" size={15} color="#fff" /> {notif.kind === 'payment_failed' ? 'Retry Payment' : 'View Wallet'}
            </Btn>
          </div>
        )}

        {notif.category === 'messages' && (
          <Btn variant="primary" size="md" wide onClick={() => navigate('chat', { shopName: notif.shopName })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
            <Icon name="messageSquare" size={15} color="#fff" /> Open Conversation
          </Btn>
        )}

        {notif.category === 'security' && (
          <Btn variant="secondary" size="md" wide onClick={() => navigate('security')}>
            <Icon name="shield" size={15} color={C.ink} /> Review Security Settings
          </Btn>
        )}

        <div style={{ background:C.white, borderRadius:16, padding:16, boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:6 }}>Need Help?</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginBottom:12 }}>Our support team is here to help you.</div>
          <Btn variant="secondary" size="md" wide onClick={() => navigate('support')}>
            <Icon name="headphones" size={15} color={C.ink} /> Contact Support
          </Btn>
        </div>

        <div style={{ textAlign:'center', fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, padding:'4px 0 8px' }}>
          Thank you for choosing CLORIVO. We appreciate your trust!
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── NOTIFICATION SETTINGS PAGE ──────────────────────────────
function NotificationSettingsScreen() {
  const { goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [pushOn, setPushOn] = React.useState(true);
  const [emailOn, setEmailOn] = React.useState(true);
  const [smsOn, setSmsOn] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState(true);
  const [quietHours, setQuietHours] = React.useState(false);
  const [quietFrom, setQuietFrom] = React.useState('22:00');
  const [quietTo, setQuietTo] = React.useState('07:00');
  const [categoryPrefs, setCategoryPrefs] = React.useState({ orders:true, promotions:true, system:true, messages:true, wallet:true, security:true });
  const [toast, setToast] = React.useState(null);

  function toggleCategory(key) { setCategoryPrefs(p => ({ ...p, [key]: !p[key] })); }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Notification Settings</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Delivery Channels</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
              <Icon name="bell" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Push Notifications</span>
              <Switch checked={pushOn} onChange={v => { setPushOn(v); setToast({ type:'success', message: v ? 'Push notifications enabled' : 'Push notifications disabled' }); }} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="mail" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Email Notifications</span>
              <Switch checked={emailOn} onChange={setEmailOn} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="smartphone" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>SMS Notifications</span>
              <Switch checked={smsOn} onChange={setSmsOn} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop:`1px solid ${C.hairline}` }}>
              <Icon name="volume2" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Notification Sound</span>
              <Switch checked={soundOn} onChange={setSoundOn} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Notification Categories</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            {NOTIF_CATEGORIES.slice(1).map((c, i) => (
              <div key={c.key} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>{c.label}</span>
                <Switch checked={categoryPrefs[c.key]} onChange={() => toggleCategory(c.key)} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Quiet Hours</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px' }}>
              <Icon name="moon" size={17} color={C.mute} />
              <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>Enable Quiet Hours</span>
              <Switch checked={quietHours} onChange={setQuietHours} />
            </div>
            {quietHours && (
              <div style={{ display:'flex', gap:10, padding:'0 16px 16px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:5 }}>From</div>
                  <input type="time" value={quietFrom} onChange={e => setQuietFrom(e.target.value)} style={{ width:'100%', height:44, border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, boxSizing:'border-box' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:5 }}>To</div>
                  <input type="time" value={quietTo} onChange={e => setQuietTo(e.target.value)} style={{ width:'100%', height:44, border:`1.5px solid ${C.hairline}`, borderRadius:10, padding:'0 12px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink, boxSizing:'border-box' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <Btn variant="primary" size="lg" wide onClick={() => setToast({ type:'success', message:'Notification preferences saved' })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
          Save Preferences
        </Btn>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { NotificationsScreen, NotificationDetailScreen, NotificationSettingsScreen });
