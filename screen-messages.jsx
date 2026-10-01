// screen-messages.jsx — Messages Inbox + Individual Chat Conversation

window._CONVERSATIONS = window._CONVERSATIONS || [
  { id:'luxe',      shop:'Luxe Store',      initial:'L', color:'#1A1420', verified:true, type:'seller', online:true,  last:"Hi! Yes, the product is still available.", time:'10:30 AM', unread:2, pinned:false, archived:false, orderRelated:false, product:{ id:1, title:'iPhone 14 Pro Max', variant:'256GB, Deep Purple', price:1099, tint:0 } },
  { id:'techzone',  shop:'TechZone Haiti',  initial:'T', color:'#0D9488', verified:true, type:'seller', online:true,  last:"Thank you! I'll check and get back…",       time:'Yesterday', unread:1, pinned:false, archived:false, orderRelated:false },
  { id:'fashion',   shop:'Fashion House',   initial:'F', color:'#DB2777', verified:true, type:'seller', online:false, last:"Your order #CLV789456 has been shipped.",  time:'Yesterday', unread:0, pinned:false, archived:false, orderRelated:true },
  { id:'electro',   shop:'ElectroWorld',    initial:'E', color:'#D97706', verified:true, type:'seller', online:false, last:'Do you have this in black color?',          time:'May 18', unread:0, pinned:false, archived:false, orderRelated:false },
  { id:'support',   shop:'Clorivo Support', initial:'C', color:'#4A6FD4', verified:true, type:'support', online:true, last:'How can we help you today?',               time:'May 15', unread:0, pinned:false, archived:false, orderRelated:false, icon:'headphones' },
  { id:'home',      shop:'Home Essentials', initial:'H', color:'#16A34A', verified:true, type:'seller', online:false, last:'Thank you for your purchase! We appreciate it.', time:'May 12', unread:0, pinned:false, archived:false, orderRelated:true },
  { id:'sport',     shop:'Sport Center',    initial:'S', color:'#7C3AED', verified:true, type:'seller', online:false, last:'The size M is available.',                 time:'May 10', unread:0, pinned:false, archived:false, orderRelated:false },
  { id:'beauty',    shop:'Beauty Store',    initial:'B', color:'#EA580C', verified:true, type:'seller', online:false, last:'New collection is available now!',         time:'May 8', unread:0, pinned:false, archived:false, orderRelated:false },
];

const QUICK_REPLIES = ['Is this still available?', "What's the price?", 'Do you ship to my area?', 'Can I get a discount?'];

function seedThread(conv) {
  if (conv.id === 'luxe') {
    return [
      { id:1, from:'them', type:'text', text:'Hi John! Yes, the iPhone 14 Pro Max is still available in Deep Purple.', at:'2024-05-20T10:29:00', status:'seen' },
      { id:2, from:'me',   type:'text', text:'Hello! Is this iPhone 14 Pro Max still available?', at:'2024-05-20T10:28:00', status:'seen' },
      { id:3, from:'me',   type:'text', text:'Great! Do you offer delivery in Port-au-Prince?', at:'2024-05-20T10:29:30', status:'seen' },
      { id:4, from:'them', type:'text', text:'Yes, we do! Delivery in Port-au-Prince takes 1 to 2 business days.', at:'2024-05-20T10:29:45', status:'seen' },
      { id:5, from:'me',   type:'text', text:"Perfect! I'll place my order then.", at:'2024-05-20T10:30:00', status:'delivered' },
      { id:6, from:'them', type:'text', text:'Thank you! 🙏 If you have any other questions, feel free to ask.', at:'2024-05-20T10:30:15', status:'seen' },
    ].sort((a,b) => new Date(a.at) - new Date(b.at));
  }
  return [
    { id:1, from:'them', type:'text', text:conv.last, at:new Date(Date.now()-3600000).toISOString(), status:'seen' },
  ];
}

// ─── SWIPEABLE CONVERSATION ROW ─────────────────────────────────
function ConvoRow({ conv, onOpen, onPin, onArchive, onDelete }) {
  const [dragX, setDragX] = React.useState(0);
  const drag = React.useRef({ startX:0, dragging:false, baseX:0, moved:false });

  function onPointerDown(e) { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { startX: e.clientX, dragging:true, baseX: dragX, moved:false }; }
  function onPointerMove(e) {
    if (!drag.current.dragging) return;
    if (Math.abs(e.clientX - drag.current.startX) > 4) drag.current.moved = true;
    const dx = e.clientX - drag.current.startX + drag.current.baseX;
    setDragX(Math.max(-180, Math.min(0, dx)));
  }
  function onPointerUpEnd() {
    if (!drag.current.dragging) return;
    setDragX(prev => (prev < -90 ? -180 : 0));
    drag.current.dragging = false;
  }
  function openIt() {
    if (drag.current.moved) { drag.current.moved = false; return; }
    if (dragX !== 0) { setDragX(0); return; }
    onOpen(conv);
  }

  return (
    <div style={{ position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, display:'flex', justifyContent:'flex-end' }}>
        <button onClick={() => onPin(conv.id)} style={{ width:60, border:'none', background:'#F59E0B', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
          <Icon name="pin" size={16} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color:'#fff', fontWeight:600 }}>{conv.pinned ? 'Unpin' : 'Pin'}</span>
        </button>
        <button onClick={() => onArchive(conv.id)} style={{ width:60, border:'none', background:C.mute, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
          <Icon name="archive" size={16} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color:'#fff', fontWeight:600 }}>Archive</span>
        </button>
        <button onClick={() => onDelete(conv.id)} style={{ width:60, border:'none', background:C.danger, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3 }}>
          <Icon name="trash" size={16} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color:'#fff', fontWeight:600 }}>Delete</span>
        </button>
      </div>
      <div
        onClick={openIt}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUpEnd} onPointerLeave={onPointerUpEnd}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', background: conv.unread > 0 ? '#F4F1FF' : C.white, borderBottom:`1px solid ${C.hairline}`, cursor:'pointer', transform:`translateX(${dragX}px)`, transition: drag.current.dragging ? 'none' : 'transform 0.2s', touchAction:'pan-y' }}
      >
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:48, height:48, borderRadius:9999, background:conv.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {conv.icon ? <Icon name={conv.icon} size={20} color="#fff" /> : <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:20, color:'#fff' }}>{conv.initial}</span>}
          </div>
          {conv.online && <div style={{ position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:9999, background:C.success, border:`2px solid ${C.white}` }} />}
          {conv.pinned && (
            <div style={{ position:'absolute', top:-3, left:-3, width:16, height:16, borderRadius:9999, background:'#F59E0B', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${C.white}` }}>
              <Icon name="pin" size={8} color="#fff" />
            </div>
          )}
        </div>
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
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{conv.time}</span>
          {conv.unread > 0 ? (
            <div style={{ minWidth:20, height:20, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:'#fff' }}>{conv.unread}</span>
            </div>
          ) : (
            <Icon name="chevronRight" size={14} color={C.hairline} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MESSAGES INBOX ──────────────────────────────────────────
function MessagesListScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [conversations, setConversations] = React.useState(window._CONVERSATIONS);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pull, setPull] = React.useState(0);
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const touchRef = React.useRef({ startY:0, pulling:false });
  const scrollRef = React.useRef(null);

  React.useEffect(() => { window._CONVERSATIONS = conversations; }, [conversations]);
  React.useEffect(() => { const t = setTimeout(() => setLoading(false), 500); return () => clearTimeout(t); }, []);

  const active = conversations.filter(c => !c.archived);
  const tabs = [
    { key:'all',     label:'All',     count: active.reduce((n,c)=>n+c.unread,0) },
    { key:'orders',  label:'Orders',  count: active.filter(c=>c.orderRelated).length },
    { key:'sellers', label:'Sellers', count: active.filter(c=>c.type==='seller').length },
    { key:'unread',  label:'Unread',  count: active.filter(c=>c.unread>0).length },
  ];

  let filtered = active.filter(c => !search || c.shop.toLowerCase().includes(search.toLowerCase()) || c.last.toLowerCase().includes(search.toLowerCase()));
  if (tab === 'orders')  filtered = filtered.filter(c => c.orderRelated);
  if (tab === 'sellers') filtered = filtered.filter(c => c.type === 'seller');
  if (tab === 'unread')  filtered = filtered.filter(c => c.unread > 0);
  filtered = [...filtered].sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));

  function openConvo(conv) {
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread:0 } : c));
    navigate('chat', { conversationId: conv.id, shopName: conv.shop });
  }
  function pinConvo(id) { setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c)); setToast({ type:'success', message:'Conversation updated' }); }
  function archiveConvo(id) { setConversations(prev => prev.map(c => c.id === id ? { ...c, archived:true } : c)); setToast({ type:'success', message:'Conversation archived' }); }
  function deleteConvo(id) { setConversations(prev => prev.filter(c => c.id !== id)); setToast({ type:'success', message:'Conversation deleted' }); }

  async function handleRefresh() { setRefreshing(true); await new Promise(r => setTimeout(r, 700)); setRefreshing(false); setPull(0); }
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
            <button onClick={() => setComposeOpen(true)} style={{ width:38, height:38, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="edit" size={17} color={C.ink} />
            </button>
          </div>
        )}

        <div style={{ padding: isDesktop ? '24px 32px 0' : '6px 20px 0', maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Messages</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2, marginBottom:12 }}>Chat with sellers about your orders or any products.</div>

          <div style={{ display:'flex', alignItems:'center', gap:10, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'10px 14px', marginBottom:12 }}>
            <Icon name="search" size={16} color={C.mute} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages" style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }} />
            {search && <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}><Icon name="x" size={16} color={C.mute} /></button>}
          </div>

          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:12 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ height:34, padding:'0 16px', borderRadius:9999, border:'none', display:'inline-flex', alignItems:'center', gap:6, background: tab===t.key ? C.primary : C.paper, color: tab===t.key ? '#fff' : C.mute, fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ background: tab===t.key ? 'rgba(255,255,255,0.25)' : C.primarySoft, color: tab===t.key ? '#fff' : C.primary, fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, minWidth:18, height:18, borderRadius:9999, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        {(pull > 0 || refreshing) && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height: refreshing ? 44 : pull, transition: refreshing ? 'height .2s' : 'none', overflow:'hidden' }}>
            <Icon name="refreshCw" size={20} color={C.primary} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none', transform: !refreshing ? `rotate(${pull * 3}deg)` : undefined }} />
          </div>
        )}

        <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          {loading && [...Array(5)].map((_, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'12px 20px' }}>
              <div style={{ width:48, height:48, borderRadius:9999, flexShrink:0, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                <div style={{ height:13, width:'50%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
                <div style={{ height:11, width:'75%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', gap:14 }}>
              <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="messageSquare" size={36} color={C.primary} />
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No messages</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center' }}>Start a conversation from a product or seller store page.</div>
            </div>
          )}

          {!loading && filtered.map(conv => (
            <ConvoRow key={conv.id} conv={conv} onOpen={openConvo} onPin={pinConvo} onArchive={archiveConvo} onDelete={deleteConvo} />
          ))}
        </div>
      </div>

      <Modal open={composeOpen} title="New Message" onClose={() => setComposeOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {conversations.map(c => (
            <button key={c.id} onClick={() => { setComposeOpen(false); navigate('chat', { conversationId:c.id, shopName:c.shop }); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <div style={{ width:38, height:38, borderRadius:9999, background:c.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {c.icon ? <Icon name={c.icon} size={16} color="#fff" /> : <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15, color:'#fff' }}>{c.initial}</span>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.ink }}>{c.shop}</span>
            </button>
          ))}
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

// ─── PRODUCT / ORDER SHARE CARDS (in-thread) ───────────────────
function ProductMessageCard({ product, onView }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.hairline}`, borderRadius:14, padding:10, display:'flex', gap:10, alignItems:'center', maxWidth:280 }}>
      <Img label="" tint={product.tint || 0} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{product.title}</div>
        {product.variant && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>{product.variant}</div>}
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.primary, marginTop:2 }}>${product.price.toFixed(2)}</div>
      </div>
      <button onClick={() => onView(product)} style={{ border:`1.5px solid ${C.primary}`, background:C.white, color:C.primary, borderRadius:9999, padding:'6px 10px', fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, cursor:'pointer', flexShrink:0 }}>View Product</button>
    </div>
  );
}
function OrderMessageCard({ orderId, status, onView }) {
  const meta = (window.ORDER_STATUS_META && window.ORDER_STATUS_META[status]) || { label:status, color:C.primary, bg:C.primarySoft };
  return (
    <div style={{ background:C.white, border:`1px solid ${C.hairline}`, borderRadius:14, padding:12, maxWidth:260 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <Icon name="package" size={16} color={meta.color} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink }}>Order #{orderId}</span>
      </div>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, color:meta.color, background:meta.bg, borderRadius:9999, padding:'3px 9px' }}>{meta.label}</span>
      <button onClick={() => onView(orderId)} style={{ display:'block', width:'100%', marginTop:10, border:`1.5px solid ${C.primary}`, background:C.white, color:C.primary, borderRadius:9999, padding:'7px 0', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Track Order</button>
    </div>
  );
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────
function MessageBubble({ msg, onReply, onEdit, onDelete, onReact, onViewProduct, onViewOrder }) {
  const [showActions, setShowActions] = React.useState(false);
  const [swipeX, setSwipeX] = React.useState(0);
  const drag = React.useRef({ startX:0, dragging:false });
  const isMine = msg.from === 'me';

  function onPointerDown(e) { drag.current = { startX: e.clientX, dragging:true }; }
  function onPointerMove(e) {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX;
    const clamped = isMine ? Math.max(-50, Math.min(0, dx)) : Math.max(0, Math.min(50, dx));
    setSwipeX(clamped);
  }
  function onPointerUpEnd() {
    if (Math.abs(swipeX) > 30) onReply(msg);
    setSwipeX(0);
    drag.current.dragging = false;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUpEnd} onPointerLeave={onPointerUpEnd}
        onContextMenu={e => { e.preventDefault(); setShowActions(true); }}
        onDoubleClick={() => setShowActions(true)}
        style={{ position:'relative', maxWidth:'78%', transform:`translateX(${swipeX}px)`, transition: drag.current.dragging ? 'none' : 'transform .15s', touchAction:'pan-y' }}
      >
        {msg.replyTo && (
          <div style={{ background: isMine ? 'rgba(255,255,255,0.18)' : C.paper, borderLeft:`3px solid ${isMine ? 'rgba(255,255,255,0.6)' : C.primary}`, borderRadius:8, padding:'5px 9px', marginBottom:4 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color: isMine ? 'rgba(255,255,255,0.85)' : C.mute }}>{msg.replyTo}</span>
          </div>
        )}
        {msg.type === 'text' && (
          <div onClick={() => setShowActions(s => !s)} style={{ background: isMine ? C.primary : C.white, borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding:'10px 14px', border: isMine ? 'none' : `1px solid ${C.hairline}`, cursor:'pointer' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color: isMine ? '#fff' : C.ink, lineHeight:1.4 }}>{msg.text}{msg.edited && <span style={{ fontSize:10.5, opacity:0.7 }}> (edited)</span>}</span>
          </div>
        )}
        {msg.type === 'image' && (
          <img src={msg.image} style={{ maxWidth:200, borderRadius:14, display:'block' }} />
        )}
        {msg.type === 'product' && <ProductMessageCard product={msg.product} onView={onViewProduct} />}
        {msg.type === 'order' && <OrderMessageCard orderId={msg.orderId} status={msg.status} onView={onViewOrder} />}

        {msg.reaction && (
          <div style={{ position:'absolute', bottom:-10, [isMine?'right':'left']:8, background:C.white, border:`1px solid ${C.hairline}`, borderRadius:9999, padding:'1px 5px', fontSize:12, boxShadow:'0 1px 4px rgba(14,11,31,0.1)' }}>{msg.reaction}</div>
        )}

        {showActions && (
          <div style={{ position:'absolute', top:'100%', [isMine?'right':'left']:0, marginTop:14, background:C.white, border:`1px solid ${C.hairline}`, borderRadius:12, boxShadow:'0 4px 16px rgba(14,11,31,0.12)', display:'flex', zIndex:20, overflow:'hidden' }}>
            {['❤️','😂','👍','😮','😢'].map(e => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowActions(false); }} style={{ border:'none', background:'none', cursor:'pointer', padding:'8px 7px', fontSize:16 }}>{e}</button>
            ))}
            <button onClick={() => { onReply(msg); setShowActions(false); }} style={{ border:'none', borderLeft:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', padding:'8px 9px', display:'flex', alignItems:'center' }}><Icon name="cornerUpLeft" size={14} color={C.mute} /></button>
            {isMine && msg.type === 'text' && (
              <>
                <button onClick={() => { onEdit(msg); setShowActions(false); }} style={{ border:'none', borderLeft:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', padding:'8px 9px', display:'flex', alignItems:'center' }}><Icon name="edit" size={14} color={C.mute} /></button>
                <button onClick={() => { onDelete(msg.id); setShowActions(false); }} style={{ border:'none', borderLeft:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', padding:'8px 9px', display:'flex', alignItems:'center' }}><Icon name="trash" size={14} color={C.danger} /></button>
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute }}>{new Date(msg.at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</span>
        {isMine && (
          <div style={{ display:'flex' }}>
            <Icon name="check" size={11} color={msg.status === 'seen' ? C.primary : C.mute} sw={2.5} />
            {msg.status !== 'sent' && <Icon name="check" size={11} color={msg.status === 'seen' ? C.primary : C.mute} sw={2.5} style={{ marginLeft:-6 }} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INDIVIDUAL CHAT SCREEN ───────────────────────────────────
function ChatScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const conv = (window._CONVERSATIONS || []).find(c => c.id === params.conversationId) || window._CONVERSATIONS[0];
  const shopName = params.shopName || conv.shop;

  const [messages, setMessages] = React.useState(() => seedThread(conv));
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [safetyOpen, setSafetyOpen] = React.useState(true);
  const [replyTo, setReplyTo] = React.useState(null);
  const [editingId, setEditingId] = React.useState(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null); // 'block' | 'report' | 'clear'
  const [toast, setToast] = React.useState(null);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasOlder, setHasOlder] = React.useState(true);
  const scrollRef = React.useRef(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, typing]);

  function sendMessage(payload) {
    const msg = { id: Date.now(), from:'me', at:new Date().toISOString(), status:'sent', replyTo: replyTo ? `${replyTo.from === 'me' ? 'You' : shopName}: ${replyTo.text || 'Attachment'}`.slice(0,60) : null, ...payload };
    setMessages(prev => [...prev, msg]);
    setReplyTo(null);
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status:'delivered' } : m)), 600);
    setTimeout(() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status:'seen' } : m)), 1400);
    // simulate seller typing + auto-reply
    setTimeout(() => setTyping(true), 1600);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, { id: Date.now()+1, from:'them', type:'text', text:"Thanks for your message! We'll get back to you shortly.", at:new Date().toISOString(), status:'seen' }]);
    }, 3000);
  }

  function handleSend() {
    if (!input.trim() || sending) return;
    sendMessage({ type:'text', text: input.trim() });
    setInput('');
  }
  function handleQuickReply(text) { sendMessage({ type:'text', text }); }
  function handleAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendMessage({ type:'image', image: reader.result });
    reader.readAsDataURL(file);
  }
  function handleVoiceNote() { setToast({ type:'success', message:'Voice messages are coming soon' }); }
  function shareProduct() {
    const demo = conv.product || { id:1, title:'iPhone 14 Pro Max', variant:'256GB, Deep Purple', price:1099, tint:0 };
    sendMessage({ type:'product', product: demo });
  }
  function shareOrder() {
    const order = (window.MOCK_ORDERS || [])[0];
    sendMessage({ type:'order', orderId: order ? order.id : 'CLV789456', status: order ? order.status : 'in_transit' });
  }
  function reactTo(id, emoji) { setMessages(prev => prev.map(m => m.id === id ? { ...m, reaction: m.reaction === emoji ? null : emoji } : m)); }
  function deleteMsg(id) { setMessages(prev => prev.filter(m => m.id !== id)); setToast({ type:'success', message:'Message deleted' }); }
  function startEdit(msg) { setEditingId(msg.id); setInput(msg.text); }
  function saveEdit() {
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: input.trim(), edited:true } : m));
    setEditingId(null); setInput('');
  }
  function loadOlder() {
    setLoadingOlder(true);
    setTimeout(() => {
      setMessages(prev => [{ id:-Date.now(), from:'them', type:'text', text:'Hello! Thanks for reaching out to us.', at:new Date(Date.now()-7200000).toISOString(), status:'seen' }, ...prev]);
      setHasOlder(false);
      setLoadingOlder(false);
    }, 600);
  }
  function viewProduct(p) { navigate('pdp', { product: { id:p.id, title:p.title, price:p.price } }); }
  function viewOrderCard(orderId) {
    const order = (window.MOCK_ORDERS || []).find(o => o.id === orderId) || { id: orderId, status:'in_transit', placedAt: new Date().toISOString(), total:0, items:[] };
    navigate('order-detail', { order });
  }

  function doBlock() { setConfirmAction(null); setMoreOpen(false); setToast({ type:'success', message:`${shopName} has been blocked` }); setTimeout(goBack, 700); }
  function doReport() { setConfirmAction(null); setMoreOpen(false); setToast({ type:'success', message:'Report submitted. Our team will review this conversation.' }); }
  function doClear() { setConfirmAction(null); setMoreOpen(false); setMessages([]); setToast({ type:'success', message:'Conversation cleared' }); }

  let lastDate = null;

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '16px 0' : '12px 16px', display:'flex', alignItems:'center', gap:10, width: isDesktop ? '100%' : undefined }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <div onClick={() => conv.type === 'seller' && navigate('store', { shopName })} style={{ width:38, height:38, borderRadius:9999, background:conv.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor: conv.type==='seller' ? 'pointer' : 'default' }}>
            {conv.icon ? <Icon name={conv.icon} size={17} color="#fff" /> : <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:16, color:'#fff' }}>{conv.initial}</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shopName}</span>
              {conv.verified && (
                <div style={{ width:15, height:15, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="check" size={8} color="#fff" sw={3} />
                </div>
              )}
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color: typing ? C.primary : conv.online ? C.success : C.mute, fontWeight:500 }}>{typing ? 'Typing…' : conv.online ? 'Online' : 'Offline'}</span>
          </div>
          <button onClick={() => setToast({ type:'success', message:`Calling ${shopName}…` })} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="phone" size={18} color={C.ink} />
          </button>
          <button onClick={() => setMoreOpen(true)} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="moreHorizontal" size={19} color={C.ink} sw={2.5} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '14px 0' : '14px 16px' }} ref={scrollRef}>
        <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, display:'flex', flexDirection:'column', gap:12 }}>

          {safetyOpen && (
            <div style={{ padding:'10px 14px', background:'#FFFBEB', borderRadius:12, border:'1px solid #F5CD79', display:'flex', gap:8, alignItems:'flex-start' }}>
              <Icon name="shield" size={16} color="#D97706" style={{ marginTop:1, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:'#92400E', marginBottom:2 }}>For your safety</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'#92400E', lineHeight:1.4 }}>Do not share your contact information with the seller. This helps protect your money and your account.</div>
              </div>
              <button onClick={() => setSafetyOpen(false)} style={{ border:'none', background:'none', cursor:'pointer', flexShrink:0 }}>
                <Icon name="x" size={15} color="#92400E" />
              </button>
            </div>
          )}

          {conv.product && (
            <div onClick={() => viewProduct(conv.product)} style={{ cursor:'pointer' }}>
              <ProductMessageCard product={conv.product} onView={viewProduct} />
            </div>
          )}

          {hasOlder && (
            <div style={{ textAlign:'center' }}>
              <button onClick={loadOlder} disabled={loadingOlder} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>
                {loadingOlder ? 'Loading…' : 'Load earlier messages'}
              </button>
            </div>
          )}

          {messages.map(msg => {
            const dateStr = new Date(msg.at).toDateString();
            const showDate = dateStr !== lastDate;
            lastDate = dateStr;
            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={{ textAlign:'center', fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, margin:'4px 0' }}>
                    {new Date(msg.at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                  </div>
                )}
                <MessageBubble msg={msg} onReply={setReplyTo} onEdit={startEdit} onDelete={deleteMsg} onReact={reactTo} onViewProduct={viewProduct} onViewOrder={viewOrderCard} />
              </React.Fragment>
            );
          })}

          {typing && (
            <div style={{ alignSelf:'flex-start', background:C.white, border:`1px solid ${C.hairline}`, borderRadius:'14px 14px 14px 4px', padding:'12px 16px', display:'flex', gap:4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:9999, background:C.mute, animation:`typingDot 1.2s ${i*0.15}s infinite` }} />)}
            </div>
          )}
        </div>
      </div>

      {/* Quick replies */}
      {!input && !editingId && messages.length < 4 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', padding: isDesktop ? '0 0 10px' : '0 16px 10px', maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, flexShrink:0 }}>
          {QUICK_REPLIES.map(q => <Chip key={q} onClick={() => handleQuickReply(q)}>{q}</Chip>)}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:C.primarySoft, maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined, flexShrink:0 }}>
          <Icon name="cornerUpLeft" size={14} color={C.primary} />
          <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:12, color:C.primaryDeep, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>Replying to: {replyTo.text || 'Attachment'}</span>
          <button onClick={() => setReplyTo(null)} style={{ border:'none', background:'none', cursor:'pointer' }}><Icon name="x" size={14} color={C.primaryDeep} /></button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: isDesktop ? '10px 0 20px' : '10px 16px 24px', background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width:'100%', display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={shareProduct} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} title="Share product">
            <Icon name="paperclip" size={19} color={C.mute} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAttach} />
          <button onClick={() => fileRef.current?.click()} style={{ width:38, height:38, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} title="Send image">
            <Icon name="image" size={19} color={C.mute} />
          </button>
          <div style={{ flex:1, minHeight:42, border:`1.5px solid ${C.hairline}`, borderRadius:12, display:'flex', alignItems:'center', padding:'0 14px', background:C.paper }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (editingId ? saveEdit() : handleSend())}
              placeholder="Type a message…"
              style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}
            />
            <button onClick={() => setToast({ type:'success', message:'Emoji picker coming soon' })} style={{ border:'none', background:'none', cursor:'pointer', display:'flex' }}>
              <Icon name="smile" size={18} color={C.mute} />
            </button>
          </div>
          {input.trim() ? (
            <button onClick={editingId ? saveEdit : handleSend} style={{ width:40, height:40, borderRadius:10, background:C.primary, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="send" size={17} color="#fff" />
            </button>
          ) : (
            <button onClick={handleVoiceNote} style={{ width:40, height:40, borderRadius:10, background:C.paper, border:`1.5px solid ${C.hairline}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="mic" size={17} color={C.mute} />
            </button>
          )}
        </div>
      </div>

      {/* More menu bottom sheet */}
      <Modal open={moreOpen} title={shopName} onClose={() => setMoreOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {conv.type === 'seller' && (
            <button onClick={() => { setMoreOpen(false); navigate('store', { shopName }); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="store" size={17} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>View Store</span>
            </button>
          )}
          <button onClick={() => { setMoreOpen(false); shareOrder(); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="package" size={17} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Share an Order</span>
          </button>
          <button onClick={() => setConfirmAction('clear')} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="trash" size={17} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>Clear Conversation</span>
          </button>
          <button onClick={() => setConfirmAction('report')} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="flag" size={17} color="#D97706" />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:'#D97706' }}>Report {shopName}</span>
          </button>
          <button onClick={() => setConfirmAction('block')} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="ban" size={17} color={C.danger} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.danger }}>Block {shopName}</span>
          </button>
        </div>
      </Modal>

      {/* Confirm dialogs */}
      <Modal open={!!confirmAction} title={confirmAction === 'block' ? 'Block User' : confirmAction === 'report' ? 'Report User' : 'Clear Conversation'} onClose={() => setConfirmAction(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.mute }}>
            {confirmAction === 'block' && `You will no longer receive messages from ${shopName}. You can unblock them anytime from Settings.`}
            {confirmAction === 'report' && `Let us know what's wrong with this conversation. Our team will review it within 24 hours.`}
            {confirmAction === 'clear' && 'This will permanently delete all messages in this conversation.'}
          </span>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setConfirmAction(null)}>Cancel</Btn>
            <Btn variant="danger" size="md" style={{ flex:1 }} onClick={confirmAction === 'block' ? doBlock : confirmAction === 'report' ? doReport : doClear}>
              {confirmAction === 'block' ? 'Block' : confirmAction === 'report' ? 'Submit Report' : 'Clear'}
            </Btn>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { MessagesListScreen, ChatScreen });
