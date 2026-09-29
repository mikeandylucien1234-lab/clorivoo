// screen-messages.jsx — Messages inbox (buyer ↔ sellers)

function MessagesListScreen() {
  const { navigate, goBack } = useNav();
  const [activeTab, setActiveTab] = React.useState(0);
  const [search, setSearch]       = React.useState('');

  const tabs = ['All','Orders','Sellers','Unread'];
  const [conversations, setConversations] = React.useState([]);

  React.useEffect(() => {
    sbGetUser().then(async user => {
      const { data } = await sbGetConversations(user?.id);
      if (data?.length) {
        setConversations(data.map(c => ({
          id: c.id,
          shop: c.shops?.name ?? 'Shop',
          initial: (c.shops?.name?.[0] ?? 'S').toUpperCase(),
          color: c.shops?.brand_color ?? '#6C4DFF',
          verified: c.shops?.is_verified ?? false,
          crown: false,
          online: false,
          last: c.last_message ?? '',
          time: _relTime(c.last_message_at),
          unread: c.buyer_unread ?? 0,
          raw: c,
        })));
      }
    });
  }, []);

  function _relTime(iso) {
    if (!iso) return '';
    const d = new Date(iso), now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff/60) + 'min';
    if (diff < 86400) return Math.floor(diff/3600) + 'h';
    if (diff < 604800) return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    return d.toLocaleDateString('en-US', { day:'numeric', month:'short' });
  }

  const filtered = conversations.filter(c => {
    const matchesSearch = !search || c.shop.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 0 ? true : activeTab === 1 ? c.last.includes('Order') : activeTab === 2 ? c.verified : activeTab === 3 ? c.unread > 0 : true;
    return matchesSearch && matchesTab;
  });

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, flex:1, overflowY:'auto' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:38, height:38, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-0.03em' }}>c</span>
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:17, color:C.ink, letterSpacing:'-0.03em' }}>CLORIVO</span>
            </div>
          </div>
          <button style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="plus" size={18} color={C.ink} />
          </button>
        </div>

        <div style={{ padding:'12px 20px 0' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:4 }}>Messages</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginBottom:14 }}>Chat with the sellers of your orders.</div>

          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', gap:10, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'10px 14px', marginBottom:14 }}>
            <Icon name="search" size={16} color={C.mute} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search messages"
              style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
                <Icon name="x" size={16} color={C.mute} />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:4 }}>
            {tabs.map((t, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                height:34, padding:'0 16px', borderRadius:9999,
                border:`1.5px solid ${i === activeTab ? C.primary : C.hairline}`,
                background: i === activeTab ? C.primary : C.white,
                color: i === activeTab ? '#fff' : C.mute,
                fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600,
                cursor:'pointer', flexShrink:0, transition:'all 0.15s',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <div style={{ padding:'8px 0' }}>
          {filtered.map((conv, i) => (
            <div key={conv.id} onClick={() => navigate('chat')} style={{
              display:'flex', alignItems:'center', gap:12,
              padding:'12px 20px',
              background: conv.unread > 0 ? `${C.primarySoft}44` : C.white,
              borderBottom:`1px solid ${C.hairline}`,
              cursor:'pointer',
              transition:'background 0.1s',
            }}>
              {/* Avatar */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:48, height:48, borderRadius:9999, background:conv.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:20, color:'#fff', letterSpacing:'-0.03em' }}>{conv.initial}</span>
                </div>
                {/* Crown badge */}
                {conv.crown && (
                  <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:9999, background:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.white}` }}>
                    <span style={{ fontSize:9 }}>👑</span>
                  </div>
                )}
                {/* Online indicator */}
                {conv.online && (
                  <div style={{ position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:9999, background:C.success, border:`2px solid ${C.white}` }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight: conv.unread > 0 ? 700 : 500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.shop}</span>
                  {conv.verified && (
                    <div style={{ width:16, height:16, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon name="check" size={9} color="#fff" sw={3} />
                    </div>
                  )}
                </div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color: conv.unread > 0 ? C.ink : C.mute, fontWeight: conv.unread > 0 ? 500 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.last}</div>
              </div>

              {/* Right side */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{conv.time}</span>
                {conv.unread > 0 ? (
                  <div style={{ width:20, height:20, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:'#fff' }}>{conv.unread}</span>
                  </div>
                ) : (
                  <Icon name="chevronRight" size={14} color={C.hairline} />
                )}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 32px', gap:12 }}>
            <div style={{ width:56, height:56, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="messageSquare" size={26} color={C.primary} />
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No messages</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, textAlign:'center' }}>Start a conversation from a product page.</div>
          </div>
        )}

        <div style={{ height:32 }} />
      </div>
    </div>
  );
}

Object.assign(window, { MessagesListScreen });
