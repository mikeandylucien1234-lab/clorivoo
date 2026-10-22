// screen-messages.jsx — Buyer <-> Seller Messaging (real Supabase + Realtime)
// Every conversation/message/offer here is real: sbGetConversations,
// sbGetMessages, sbSendMessage (routes through the server-side send_chat_message
// RPC — anti-scam filter runs before anything is ever inserted), sbSubscribeToMessages
// (Supabase Realtime), sbGetOffersForConversation/sbCreatePriceOffer/sbRespondToOffer.
// No fictitious conversations, no local-only state pretending to be chat history.

const REPORT_REASONS = [
  { key:'external_payment_request', label:'Asked to pay outside Clorivo' },
  { key:'contact_sharing_attempt',  label:'Tried to share contact info' },
  { key:'suspected_fraud',          label:'Suspected fraud' },
  { key:'fake_payment',             label:'Fake payment claim' },
  { key:'harassment',               label:'Harassment' },
  { key:'threats',                 label:'Threats' },
  { key:'misleading_product',      label:'Misleading product' },
  { key:'confidential_info_request', label:'Asked for confidential info' },
  { key:'other',                   label:'Other' },
];

const BLOCKED_CATEGORY_LABELS = {
  phone: 'a phone number',
  email: 'an email address',
  social_messaging: 'an invitation to another messaging app',
  link: 'a link',
  off_platform_payment: 'a request to pay outside Clorivo',
  personal_confidential: 'a request for confidential/personal information',
  platform_bypass: 'an attempt to take this conversation off Clorivo',
};

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

// ─── CONVERSATION ROW ──────────────────────────────────────────
function ConvoRow({ conv, userId, onOpen }) {
  const isBuyer = conv.buyer_id === userId;
  const other = isBuyer ? conv.seller : conv.buyer;
  const displayName = conv.shops?.name || other?.full_name || 'User';
  const unread = isBuyer ? (conv.buyer_unread || 0) : (conv.seller_unread || 0);
  const initial = (displayName[0] || '?').toUpperCase();

  return (
    <div
      onClick={() => onOpen(conv)}
      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', background: unread > 0 ? '#F4F1FF' : C.white, borderBottom:`1px solid ${C.hairline}`, cursor:'pointer' }}
    >
      <div style={{ position:'relative', flexShrink:0 }}>
        <div style={{ width:48, height:48, borderRadius:9999, background: conv.shops?.brand_color || C.primary, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          {conv.shops?.logo_url ? <Img label="" src={conv.shops.logo_url} style={{ width:48, height:48 }} /> : <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:18, color:'#fff' }}>{initial}</span>}
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight: unread > 0 ? 700 : 500, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</span>
          {conv.shops?.is_verified && (
            <div style={{ width:16, height:16, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="check" size={9} color="#fff" sw={3} />
            </div>
          )}
        </div>
        {conv.products?.title && (
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.primary, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Re: {conv.products.title}</div>
        )}
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color: unread > 0 ? C.ink : C.mute, fontWeight: unread > 0 ? 500 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.last_message || 'No messages yet'}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{timeAgo(conv.last_message_at)}</span>
        {unread > 0 ? (
          <div style={{ minWidth:20, height:20, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color:'#fff' }}>{unread}</span>
          </div>
        ) : (
          <Icon name="chevronRight" size={14} color={C.hairline} />
        )}
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
  const [userId, setUserId] = React.useState(null);
  // null = loading, [] = genuinely empty/error (never backfilled with demo data)
  const [conversations, setConversations] = React.useState(null);
  const [loadError, setLoadError] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  function load(uid) {
    setLoadError(null);
    sbGetConversations(uid).then(({ data, error }) => {
      if (error) { setLoadError(error); return; }
      setConversations(data);
    }).catch(err => setLoadError(err || { message: 'Network error' }));
  }

  React.useEffect(() => {
    sbGetUser().then(u => {
      const uid = u?.id || null;
      setUserId(uid);
      if (uid) load(uid);
      else setConversations([]);
    });
  }, []);

  React.useEffect(() => {
    if (!userId) return;
    return sbSubscribeToConversations(userId, updated => {
      setConversations(prev => (prev || []).map(c => c.id === updated.id ? { ...c, ...updated } : c));
    });
  }, [userId]);

  const safeConvos = conversations || [];
  const active = safeConvos;
  const tabs = [
    { key:'all',    label:'All',    count: active.reduce((n,c) => n + ((c.buyer_id === userId ? c.buyer_unread : c.seller_unread) || 0), 0) },
    { key:'unread', label:'Unread', count: active.filter(c => ((c.buyer_id === userId ? c.buyer_unread : c.seller_unread) || 0) > 0).length },
  ];

  const q = search.trim().toLowerCase();
  let filtered = active.filter(c => {
    if (!q) return true;
    const name = (c.shops?.name || (c.buyer_id === userId ? c.seller?.full_name : c.buyer?.full_name) || '').toLowerCase();
    const product = (c.products?.title || '').toLowerCase();
    const last = (c.last_message || '').toLowerCase();
    return name.includes(q) || product.includes(q) || last.includes(q);
  });
  if (tab === 'unread') filtered = filtered.filter(c => ((c.buyer_id === userId ? c.buyer_unread : c.seller_unread) || 0) > 0);
  filtered = [...filtered].sort((a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at));

  function openConvo(conv) {
    navigate('chat', { conversationId: conv.id });
  }

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
          </div>
        )}

        <div style={{ padding: isDesktop ? '24px 32px 0' : '6px 20px 0', maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Messages</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, marginTop:2, marginBottom:12 }}>Chat with sellers about products — contact and payments stay on Clorivo.</div>

          <div style={{ display:'flex', alignItems:'center', gap:10, background:C.paper, border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'10px 14px', marginBottom:12 }}>
            <Icon name="search" size={16} color={C.mute} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by shop, product, or message" style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }} />
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

      <div style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 16 }}>
        <div style={{ maxWidth: isDesktop ? 760 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          {conversations === null && [...Array(5)].map((_, i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'12px 20px' }}>
              <div style={{ width:48, height:48, borderRadius:9999, flexShrink:0, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                <div style={{ height:13, width:'50%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
                <div style={{ height:11, width:'75%', borderRadius:6, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />
              </div>
            </div>
          ))}

          {conversations !== null && loadError && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', gap:14 }}>
              <Icon name="alertTriangle" size={36} color={C.danger} />
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>Couldn't load your messages</div>
              <Btn variant="primary" size="md" onClick={() => load(userId)}>Try Again</Btn>
            </div>
          )}

          {conversations !== null && !loadError && filtered.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 24px', gap:14 }}>
              <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="messageSquare" size={36} color={C.primary} />
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>No messages</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center' }}>Start a conversation from a product or seller store page.</div>
            </div>
          )}

          {conversations !== null && !loadError && filtered.map(conv => (
            <ConvoRow key={conv.id} conv={conv} userId={userId} onOpen={openConvo} />
          ))}
        </div>
      </div>

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

// ─── SECURITY BANNER (system component — never a message, never re-sent,
// never counted in unread/message totals) ──────────────────────
function SecurityBanner({ compact }) {
  if (compact) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#FFF8E8', borderBottom:`1px solid #F3E5BC` }}>
        <span style={{ fontSize:12 }}>🔒</span>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:'#8A6400', flex:1 }}>Keep chats & payments on Clorivo. Never share passwords or verification codes.</span>
      </div>
    );
  }
  return (
    <div style={{ margin:'10px 16px', background:'#FFF8E8', border:'1px solid #F3E5BC', borderRadius:12, padding:'12px 14px', display:'flex', gap:10 }}>
      <span style={{ fontSize:18, flexShrink:0 }}>🔒</span>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'#6B5200', lineHeight:1.5 }}>
        <strong>CLORIVO SECURITY REMINDER</strong><br />
        Never share your phone number, email address, social media accounts, passwords, verification codes, banking information, or personal details with other users.
        Keep all conversations and payments on Clorivo. Never accept requests to communicate or complete transactions outside the platform.
        Clorivo will never ask you to share your password or verification code in a chat.
      </div>
    </div>
  );
}

// ─── PRODUCT CARD (top of conversation) ────────────────────────
function ConversationProductCard({ product, onView }) {
  if (!product) return null;
  return (
    <div onClick={() => onView(product)} style={{ margin:'10px 16px 0', background:C.white, border:`1px solid ${C.hairline}`, borderRadius:14, padding:10, display:'flex', gap:10, alignItems:'center', cursor:'pointer' }}>
      <Img label="" src={product.images?.[0]} tint={0} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.ink, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{product.title}</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.primary, marginTop:2 }}>${Number(product.price).toFixed(2)}</div>
      </div>
      <Icon name="chevronRight" size={16} color={C.mute} />
    </div>
  );
}

// ─── OFFER CARD ─────────────────────────────────────────────────
const OFFER_STATUS_META = {
  PENDING:   { label:'Pending',   color:C.warning, bg:'#FFF6E5' },
  ACCEPTED:  { label:'Accepted',  color:C.success, bg:'#EFF9F4' },
  DECLINED:  { label:'Declined',  color:C.danger,  bg:'#FDEDED' },
  COUNTERED: { label:'Countered', color:C.primary, bg:C.primarySoft },
  EXPIRED:   { label:'Expired',   color:C.mute,    bg:C.paper },
  CANCELLED: { label:'Cancelled', color:C.mute,    bg:C.paper },
};

function OfferCard({ offer, userId, onAccept, onDecline, onCounter, onCancel, busy }) {
  const meta = OFFER_STATUS_META[offer.status] || OFFER_STATUS_META.PENDING;
  const isMine = offer.proposed_by === userId;
  const isExpired = offer.status === 'PENDING' && new Date(offer.expires_at) < new Date();
  const canRespond = offer.status === 'PENDING' && !isMine && !isExpired;
  const canCancel = offer.status === 'PENDING' && isMine && !isExpired;

  return (
    <div style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth:280, background:C.white, border:`1.5px solid ${C.hairline}`, borderRadius:14, padding:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.ink }}>{isMine ? 'Your Offer' : 'Offer'}</span>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, color:meta.color, background:meta.bg, borderRadius:9999, padding:'2px 8px' }}>{isExpired ? 'Expired' : meta.label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:800, color:C.primary }}>${Number(offer.offered_price).toFixed(2)}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, textDecoration:'line-through' }}>${Number(offer.original_price).toFixed(2)}</span>
      </div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginBottom: (canRespond || canCancel) ? 10 : 0 }}>Qty: {offer.quantity} · Expires {new Date(offer.expires_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</div>
      {canRespond && (
        <div style={{ display:'flex', gap:6 }}>
          <button disabled={busy} onClick={() => onAccept(offer)} style={{ flex:1, height:32, border:'none', borderRadius:9999, background:C.success, color:'#fff', fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Accept</button>
          <button disabled={busy} onClick={() => onCounter(offer)} style={{ flex:1, height:32, border:`1.5px solid ${C.primary}`, borderRadius:9999, background:C.white, color:C.primary, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Counter</button>
          <button disabled={busy} onClick={() => onDecline(offer)} style={{ flex:1, height:32, border:`1.5px solid ${C.hairline}`, borderRadius:9999, background:C.white, color:C.danger, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Decline</button>
        </div>
      )}
      {canCancel && (
        <button disabled={busy} onClick={() => onCancel(offer)} style={{ width:'100%', height:32, border:`1.5px solid ${C.hairline}`, borderRadius:9999, background:C.white, color:C.mute, fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, cursor:'pointer' }}>Cancel Offer</button>
      )}
      {offer.status === 'ACCEPTED' && isMine && (
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.success, marginTop:6 }}>Accepted — proceed to Checkout to complete your purchase.</div>
      )}
    </div>
  );
}

// ─── MESSAGE BUBBLE ──────────────────────────────────────────
function MessageBubble({ msg, isMine, onReport }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
      <div style={{ position:'relative', maxWidth:'78%' }}>
        <div
          onClick={() => !isMine && onReport(msg)}
          title={!isMine ? 'Tap to report this message' : undefined}
          style={{ background: isMine ? C.primary : C.white, borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding:'10px 14px', border: isMine ? 'none' : `1px solid ${C.hairline}`, cursor: isMine ? 'default' : 'pointer' }}
        >
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color: isMine ? '#fff' : C.ink, lineHeight:1.4, whiteSpace:'pre-wrap' }}>{msg.content}</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, color:C.mute }}>{new Date(msg.created_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</span>
        {isMine && (
          <div style={{ display:'flex' }}>
            <Icon name="check" size={11} color={msg.read_at ? C.primary : C.mute} sw={2.5} />
            <Icon name="check" size={11} color={msg.read_at ? C.primary : C.mute} sw={2.5} style={{ marginLeft:-6 }} />
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

  const [userId, setUserId] = React.useState(null);
  // conv: undefined = resolving, null = not found/not allowed, object = ready
  const [conv, setConv] = React.useState(undefined);
  const [timeline, setTimeline] = React.useState(null); // merged messages+offers, null = loading
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [blockedNotice, setBlockedNotice] = React.useState('');
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [reportTarget, setReportTarget] = React.useState(null); // { reportedId, messageExcerpt? }
  const [reportReason, setReportReason] = React.useState('');
  const [reportDetails, setReportDetails] = React.useState('');
  const [confirmAction, setConfirmAction] = React.useState(null); // 'block' | 'clear'(local only)
  const [offerFormOpen, setOfferFormOpen] = React.useState(null); // { mode:'new'|'counter', offer? }
  const [offerPrice, setOfferPrice] = React.useState('');
  const [offerQty, setOfferQty] = React.useState('1');
  const [offerBusy, setOfferBusy] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => { sbGetUser().then(u => setUserId(u?.id || null)); }, []);

  // Resolve the conversation: by id if given, else get-or-create from a
  // shop/product context (e.g. "Contact Seller" / "Make an Offer").
  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function resolve() {
      if (params.conversationId) {
        const row = await sbGetConversation(params.conversationId);
        if (cancelled) return;
        if (!row || (row.buyer_id !== userId && row.seller_id !== userId)) { setConv(null); return; }
        setConv(row);
        return;
      }
      if (params.shopId) {
        const shop = await sbGetShop(params.shopId);
        if (!shop) { if (!cancelled) setConv(null); return; }
        const { data } = await sbGetOrCreateConversation(userId, shop.seller_id, shop.id, params.productId || null);
        if (cancelled) return;
        if (!data?.id) { setConv(null); return; }
        const row = await sbGetConversation(data.id);
        if (!cancelled) setConv(row || null);
        return;
      }
      if (!cancelled) setConv(null);
    }
    resolve();
    return () => { cancelled = true; };
  }, [userId, params.conversationId, params.shopId, params.productId]);

  const isBuyer = conv ? conv.buyer_id === userId : null;
  const otherId = conv ? (isBuyer ? conv.seller_id : conv.buyer_id) : null;
  const otherName = conv ? (conv.shops?.name || (isBuyer ? conv.seller?.full_name : conv.buyer?.full_name) || 'User') : '';

  function buildTimeline(messages, offers) {
    const items = [
      ...messages.map(m => ({ kind:'message', at: m.created_at, data: m })),
      ...offers.map(o => ({ kind:'offer', at: o.created_at, data: o })),
    ];
    items.sort((a, b) => new Date(a.at) - new Date(b.at));
    return items;
  }

  function loadTimeline() {
    if (!conv?.id) return;
    Promise.all([sbGetMessages(conv.id), sbGetOffersForConversation(conv.id)]).then(([m, o]) => {
      setTimeline(buildTimeline(m.data || [], o.data || []));
    }).catch(() => setTimeline([]));
  }

  React.useEffect(() => {
    if (!conv?.id || !userId) return;
    loadTimeline();
    sbMarkConversationRead(conv.id, isBuyer ? 'buyer' : 'seller');
    const unsubMsg = sbSubscribeToMessages(conv.id, newMsg => {
      setTimeline(prev => [...(prev || []), { kind:'message', at: newMsg.created_at, data: newMsg }]);
      sbMarkConversationRead(conv.id, isBuyer ? 'buyer' : 'seller');
    });
    const unsubOffers = sbSubscribeToOffers(conv.id, (offer, eventType) => {
      setTimeline(prev => {
        const list = prev || [];
        if (eventType === 'INSERT') return [...list, { kind:'offer', at: offer.created_at, data: offer }];
        return list.map(item => (item.kind === 'offer' && item.data.id === offer.id) ? { ...item, data: offer } : item);
      });
    });
    return () => { unsubMsg(); unsubOffers(); };
  }, [conv?.id, userId]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [timeline]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !conv?.id) return;
    setSending(true);
    setBlockedNotice('');
    const { data, error } = await sbSendMessage(conv.id, userId, text);
    setSending(false);
    if (error) { setToast({ type:'error', message: error.message || "Couldn't send your message." }); return; }
    if (!data.ok) {
      const label = BLOCKED_CATEGORY_LABELS[data.blockedCategory] || 'content that isn\'t allowed here';
      setBlockedNotice(`Your message wasn't sent — it looks like it contains ${label}. For your safety, keep contact info and payments on Clorivo.`);
      return;
    }
    setInput('');
    // Realtime subscription will append the confirmed row; this is just a
    // fast local echo so the sender doesn't wait on the round trip.
    setTimeline(prev => [...(prev || []), { kind:'message', at: data.message.created_at, data: data.message }]);
  }

  async function openOfferForm(mode, offer) {
    setOfferFormOpen({ mode, offer });
    setOfferPrice(mode === 'counter' ? String(offer.offered_price) : '');
    setOfferQty(String(mode === 'counter' ? offer.quantity : 1));
  }

  async function submitOffer() {
    const price = Number(offerPrice);
    const qty = parseInt(offerQty, 10) || 1;
    if (!price || price <= 0) { setToast({ type:'error', message:'Enter a valid price.' }); return; }
    setOfferBusy(true);
    let result;
    if (offerFormOpen.mode === 'new') {
      result = await sbCreatePriceOffer(conv.id, conv.products?.id, price, qty);
    } else {
      result = await sbRespondToOffer(offerFormOpen.offer.id, 'counter', price, qty);
    }
    setOfferBusy(false);
    if (result.error) { setToast({ type:'error', message: result.error.message || 'Could not submit the offer.' }); return; }
    setOfferFormOpen(null);
    loadTimeline();
  }

  async function respondOffer(offer, decision) {
    setOfferBusy(true);
    const { error } = await sbRespondToOffer(offer.id, decision);
    setOfferBusy(false);
    if (error) { setToast({ type:'error', message: error.message || 'Could not update the offer.' }); return; }
    loadTimeline();
    if (decision === 'accept') setToast({ type:'success', message:'Offer accepted — head to Checkout to complete your purchase.' });
  }

  function openReportMessage(msg) {
    setReportTarget({ reportedId: otherId, messageId: msg.id });
    setReportReason('');
    setReportDetails('');
    setMoreOpen(false);
  }
  function openReportUser() {
    setReportTarget({ reportedId: otherId });
    setReportReason('');
    setReportDetails('');
    setMoreOpen(false);
  }
  async function submitReport() {
    if (!reportReason) { setToast({ type:'error', message:'Choose a reason.' }); return; }
    const { error } = await sbReportUser(reportTarget.reportedId, conv.id, reportReason, reportDetails || null);
    if (error) { setToast({ type:'error', message: error.message || 'Could not submit the report.' }); return; }
    setReportTarget(null);
    setToast({ type:'success', message:'Report submitted. Our team will review it.' });
  }

  async function doBlock() {
    setConfirmAction(null);
    const { error } = await sbBlockUser(userId, otherId);
    if (error) { setToast({ type:'error', message: error.message || 'Could not block this user.' }); return; }
    setToast({ type:'success', message:`${otherName} has been blocked — you won't receive new messages from them.` });
    setMoreOpen(false);
  }

  if (conv === undefined || userId === null) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <StatusBar />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Loading conversation…</div>
      </div>
    );
  }
  if (conv === null) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24 }}>
        <StatusBar />
        <Icon name="messageSquare" size={40} color={C.mute} />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>Conversation not found</div>
        <Btn variant="primary" onClick={() => navigate('messages')}>Back to Messages</Btn>
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:'rgba(255,255,255,0.92)', backdropFilter:'blur(10px)', borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <div onClick={() => conv.shops?.id && navigate('store', { shopId: conv.shops.id, shopName: conv.shops.name })} style={{ width:38, height:38, borderRadius:9999, background: conv.shops?.brand_color || C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor: conv.shops?.id ? 'pointer' : 'default', overflow:'hidden' }}>
            {conv.shops?.logo_url ? <Img label="" src={conv.shops.logo_url} style={{ width:38, height:38 }} /> : <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:15, color:'#fff' }}>{(otherName[0] || '?').toUpperCase()}</span>}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{otherName}</span>
              {conv.shops?.is_verified && (
                <div style={{ width:15, height:15, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name="check" size={8} color="#fff" sw={3} />
                </div>
              )}
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute }}>{isBuyer ? 'Seller' : 'Buyer'}</span>
          </div>
          <button onClick={() => setMoreOpen(true)} style={{ width:36, height:36, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="moreHorizontal" size={19} color={C.ink} sw={2.5} />
          </button>
        </div>
        <SecurityBanner compact />
      </div>

      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'10px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <ConversationProductCard product={conv.products} onView={p => navigate('pdp', { product: p })} />
        <SecurityBanner />

        {timeline === null && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[0,1,2].map(i => <div key={i} style={{ height:40, width: i % 2 ? '60%' : '45%', alignSelf: i % 2 ? 'flex-end' : 'flex-start', borderRadius:14, background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite' }} />)}
          </div>
        )}
        {timeline !== null && timeline.length === 0 && (
          <div style={{ textAlign:'center', padding:'30px 16px', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Say hello — ask about size, color, availability, or make an offer.</div>
        )}
        {timeline !== null && timeline.map((item, i) => (
          item.kind === 'message'
            ? <MessageBubble key={'m'+item.data.id} msg={item.data} isMine={item.data.sender_id === userId} onReport={openReportMessage} />
            : <OfferCard key={'o'+item.data.id} offer={item.data} userId={userId} busy={offerBusy}
                onAccept={o => respondOffer(o, 'accept')} onDecline={o => respondOffer(o, 'decline')}
                onCancel={o => respondOffer(o, 'cancel')} onCounter={o => openOfferForm('counter', o)} />
        ))}
      </div>

      {blockedNotice && (
        <div style={{ margin:'0 16px 8px', background:'#FDEDED', border:'1px solid #F6C9C9', borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'flex-start', gap:8 }}>
          <Icon name="alertTriangle" size={14} color={C.danger} style={{ flexShrink:0, marginTop:1 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger }}>{blockedNotice}</span>
        </div>
      )}

      <div style={{ padding:'10px 16px', paddingBottom: isDesktop ? 16 : 24, background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', flexDirection:'column', gap:8 }}>
        {conv.products?.id && (
          <button onClick={() => openOfferForm('new')} style={{ alignSelf:'flex-start', display:'flex', alignItems:'center', gap:6, border:`1.5px solid ${C.primary}`, background:C.primarySoft, borderRadius:9999, padding:'6px 12px', cursor:'pointer' }}>
            <Icon name="tag" size={13} color={C.primary} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:700, color:C.primary }}>Make an Offer</span>
          </button>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Message — no links, contacts, or media"
            style={{ flex:1, height:44, border:`1.5px solid ${C.hairline}`, borderRadius:9999, padding:'0 16px', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink, outline:'none' }}
          />
          <button onClick={handleSend} disabled={sending || !input.trim()} style={{ width:44, height:44, borderRadius:9999, border:'none', background: input.trim() ? C.primary : C.hairline, cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="send" size={18} color="#fff" />
          </button>
        </div>
      </div>

      {/* More menu */}
      <Modal open={moreOpen} title={otherName} onClose={() => setMoreOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {conv.shops?.id && (
            <button onClick={() => { setMoreOpen(false); navigate('store', { shopId: conv.shops.id, shopName: conv.shops.name }); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', background:'none', cursor:'pointer', textAlign:'left' }}>
              <Icon name="store" size={17} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>View Store</span>
            </button>
          )}
          <button onClick={openReportUser} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="flag" size={17} color="#D97706" />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:'#D97706' }}>{isBuyer ? 'Report Seller' : 'Report Buyer'}</span>
          </button>
          <button onClick={() => { setMoreOpen(false); setConfirmAction('block'); }} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
            <Icon name="ban" size={17} color={C.danger} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.danger }}>Block {otherName}</span>
          </button>
        </div>
      </Modal>

      {/* Report modal (user or specific message) */}
      <Modal open={!!reportTarget} title={reportTarget?.messageId ? 'Report This Message' : `Report ${otherName}`} onClose={() => setReportTarget(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {REPORT_REASONS.map(r => (
              <label key={r.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px', cursor:'pointer' }}>
                <input type="radio" name="reportReason" checked={reportReason === r.key} onChange={() => setReportReason(r.key)} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>{r.label}</span>
              </label>
            ))}
          </div>
          <Input label="Additional details (optional)" value={reportDetails} onChange={e => setReportDetails(e.target.value)} />
          <Btn variant="primary" size="md" wide onClick={submitReport}>Submit Report</Btn>
        </div>
      </Modal>

      {/* Block confirmation */}
      <Modal open={confirmAction === 'block'} title={`Block ${otherName}?`} onClose={() => setConfirmAction(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.mute }}>You will no longer receive messages from {otherName}. This does not cancel any existing order.</span>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="secondary" size="md" style={{ flex:1 }} onClick={() => setConfirmAction(null)}>Cancel</Btn>
            <Btn size="md" style={{ flex:1, color:'#fff', background:C.danger }} onClick={doBlock}>Block</Btn>
          </div>
        </div>
      </Modal>

      {/* Offer form (new or counter) */}
      <Modal open={!!offerFormOpen} title={offerFormOpen?.mode === 'counter' ? 'Counter Offer' : 'Make an Offer'} onClose={() => setOfferFormOpen(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {conv.products?.price && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>Listed price: ${Number(conv.products.price).toFixed(2)}</div>
          )}
          <Input label="Your price ($)" type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} />
          <Input label="Quantity" type="number" value={offerQty} onChange={e => setOfferQty(e.target.value)} />
          <Btn variant="primary" size="md" wide onClick={submitOffer} disabled={offerBusy}>{offerBusy ? 'Sending…' : 'Send Offer'}</Btn>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { MessagesListScreen, ChatScreen });
