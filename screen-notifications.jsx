// screen-notifications.jsx — Notifications center

function NotificationsScreen() {
  const { goBack } = useNav();
  const [activeTab, setActiveTab] = React.useState(0);
  const [notifications, setNotifications] = React.useState([
    { id:1, type:'order',   icon:'truck',   iconBg:'#EEF2FF', iconColor:'#4A6FD4', title:'Your order #CLV789456 has shipped', body:'Good news! Your package is on its way. Estimated delivery on May 18.', time:'4d ago', unread:true,  pinned:true,  group:'week' },
    { id:2, type:'promo',   icon:'zap',     iconBg:'#ECFDF5', iconColor:C.success,  title:'Special promo just for you 🎉',              body:'Enjoy 20% off all Fashion items. Offer valid until May 25.',  time:'4d ago', unread:true,  pinned:false, group:'week' },
    { id:3, type:'order',   icon:'package', iconBg:'#FFF7ED', iconColor:'#E67E22',  title:'Order delivered',                          body:'Order #CLV782145 was delivered successfully. Thanks for choosing CLORIVO!', time:'5d ago', unread:true,  pinned:false, group:'week' },
    { id:4, type:'system',  icon:'heart',   iconBg:'#FFF1F2', iconColor:C.danger,   title:'Added to your wishlist',                     body:'"Nike Air Max 270" was added to your list. Find it anytime you like!', time:'6d ago', unread:true, pinned:false, group:'week' },
    { id:5, type:'promo',   icon:'tag',     iconBg:'#F5F3FF', iconColor:C.primary,  title:'Flash deal · -65% on ceramics',         body:'Only 2 hours left. Don\'t miss this offer.',                           time:'8d ago', unread:false, pinned:false, group:'older' },
    { id:6, type:'order',   icon:'check',   iconBg:'#ECFDF5', iconColor:C.success,  title:'Payment confirmed',                        body:'Your payment of $75.04 was received. Order #CLV789456.',               time:'9d ago', unread:false, pinned:false, group:'older' },
    { id:7, type:'system',  icon:'star',    iconBg:'#FFFBEB', iconColor:'#F59E0B',  title:'Leave a review',                          body:'How was your experience with luna.studio?',                   time:'12d ago', unread:false, pinned:false, group:'older' },
  ]);

  const tabs = [
    { label:'All', count:4 },
    { label:'Orders', count:2 },
    { label:'Promos', count:2 },
    { label:'System', count:0 },
  ];

  const typeMap = { 0: null, 1:'order', 2:'promo', 3:'system' };
  const filtered = activeTab === 0 ? notifications : notifications.filter(n => n.type === typeMap[activeTab]);
  const weekNotifs  = filtered.filter(n => n.group === 'week');
  const olderNotifs = filtered.filter(n => n.group === 'older');
  const unreadCount = notifications.filter(n => n.unread).length;

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }

  function markRead(id) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  }

  function NotifCard({ notif }) {
    return (
      <div onClick={() => markRead(notif.id)} style={{ display:'flex', gap:12, padding:'14px 0', borderBottom:`1px solid ${C.hairline}`, cursor:'pointer', position:'relative' }}>
        {/* Icon */}
        <div style={{ width:44, height:44, borderRadius:12, background:notif.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon name={notif.icon} size={20} color={notif.iconColor} />
        </div>
        {/* Content */}
        <div style={{ flex:1, paddingRight:16 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight: notif.unread ? 700 : 500, color:C.ink, lineHeight:1.3, marginBottom:4 }}>{notif.title}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.4, marginBottom:6 }}>{notif.body}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{notif.time}</span>
            {notif.pinned && (
              <span style={{ background:C.primarySoft, color:C.primaryDeep, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:9999 }}>Pinned</span>
            )}
          </div>
        </div>
        {/* Unread dot */}
        {notif.unread && (
          <div style={{ position:'absolute', top:18, right:0, width:8, height:8, borderRadius:9999, background:C.primary }} />
        )}
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, flex:1, overflowY:'auto' }}>
        {/* Header */}
        <div style={{ padding:'16px 20px 0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:38, height:38, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Notifications</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginTop:2 }}>Stay up to date on everything that matters.</div>
            </div>
          </div>
          <button style={{ width:38, height:38, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="search" size={17} color={C.mute} />
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:8, padding:'14px 20px 0', overflowX:'auto' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)} style={{
              display:'inline-flex', alignItems:'center', gap:6, height:34, padding:'0 14px', borderRadius:9999, border:`1.5px solid ${i === activeTab ? C.primary : C.hairline}`, background: i === activeTab ? C.primary : C.white, cursor:'pointer', flexShrink:0, transition:'all 0.15s',
            }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color: i === activeTab ? '#fff' : C.mute }}>{t.label}</span>
              {t.count > 0 && (
                <span style={{ background: i === activeTab ? 'rgba(255,255,255,0.25)' : C.primarySoft, color: i === activeTab ? '#fff' : C.primary, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, width:20, height:20, borderRadius:9999, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Unread banner */}
        {unreadCount > 0 && (
          <div style={{ margin:'12px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', background:C.primarySoft, borderRadius:10, padding:'10px 14px' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.primaryDeep }}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>
            <button onClick={markAllRead} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <Icon name="checkCircle" size={14} color={C.primary} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Mark all read</span>
            </button>
          </div>
        )}

        {/* This week */}
        {weekNotifs.length > 0 && (
          <div style={{ padding:'16px 20px 0' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>This week</div>
            {weekNotifs.map(n => <NotifCard key={n.id} notif={n} />)}
          </div>
        )}

        {/* Older */}
        {olderNotifs.length > 0 && (
          <div style={{ padding:'16px 20px 0' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:C.mute, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Older</div>
            {olderNotifs.map(n => <NotifCard key={n.id} notif={n} />)}
          </div>
        )}
        <div style={{ height:32 }} />
      </div>
    </div>
  );
}

Object.assign(window, { NotificationsScreen });
