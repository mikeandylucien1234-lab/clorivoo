// screen-tracking.jsx — My Orders (list) + Order Tracking (detail)

// ─── STATUS METADATA ─────────────────────────────────────────
const ORDER_STATUS_META = {
  confirmed:  { label:'Confirmed',  color:C.primary, bg:C.primarySoft, step:0 },
  preparing:  { label:'Preparing',  color:C.primary, bg:C.primarySoft, step:1 },
  shipped:    { label:'Shipped',    color:C.primary, bg:C.primarySoft, step:2 },
  in_transit: { label:'In Transit', color:C.primary, bg:C.primarySoft, step:3 },
  delivered:  { label:'Delivered',  color:C.success, bg:'#ECFDF5',     step:4 },
  cancelled:  { label:'Cancelled',  color:C.danger,  bg:'#FEF2F2',     step:-1 },
};
const TRACKER_STEPS = [
  { key:'confirmed',  label:'Confirmed',  icon:'check' },
  { key:'preparing',  label:'Preparing',  icon:'calendar' },
  { key:'shipped',    label:'Shipped',    icon:'package' },
  { key:'in_transit', label:'In Transit', icon:'truck' },
  { key:'delivered',  label:'Delivered',  icon:'checkCircle' },
];
const TABS = [
  { key:'all',        label:'All' },
  { key:'processing',label:'Processing' },
  { key:'shipped',    label:'Shipped' },
  { key:'delivered',  label:'Delivered' },
  { key:'cancelled',  label:'Cancelled' },
];
function tabForStatus(status) {
  if (status === 'confirmed' || status === 'preparing') return 'processing';
  if (status === 'shipped' || status === 'in_transit') return 'shipped';
  return status; // delivered | cancelled
}

// ─── MOCK ORDERS (used when there is no real backend session) ─
const MOCK_ORDERS = [
  {
    id:'CLV789456', status:'in_transit', placedAt:'2024-05-12T10:30:00', total:1409.40,
    estimatedDelivery:'2024-05-18', carrier:'Flash Express', trackingNumber:'FL123456789HT',
    origin:'Miami, USA', destination:'Port-au-Prince, Haiti',
    items:[
      { title:'iPhone 14 Pro Max',  variant:'256GB, Deep Purple', qty:1, tint:0 },
      { title:'Sony WH-1000XM5',    variant:'Wireless Headphone', qty:1, tint:1 },
      { title:'Fashion Handbag',     variant:'Brown, Leather',      qty:1, tint:2 },
      { title:'Nike Air Max 270',    variant:'Black, Size 42',    qty:1, tint:3 },
    ],
    timeline:[
      { at:'2024-05-15T08:45:00', title:'Your package is in transit', desc:'Arrived at sorting facility — Miami, USA' },
      { at:'2024-05-14T18:30:00', title:'Package shipped',            desc:'En route to Port-au-Prince, Haiti' },
      { at:'2024-05-14T14:10:00', title:'Picked up by carrier',       desc:'Miami, USA' },
      { at:'2024-05-13T11:20:00', title:'Ready for shipment',         desc:'Warehouse — Miami, USA' },
      { at:'2024-05-12T10:30:00', title:'Order confirmed',            desc:"Thank you! We've received your order." },
    ],
  },
  {
    id:'CLV782145', status:'delivered', placedAt:'2024-05-05T09:00:00', total:378.00,
    estimatedDelivery:'2024-05-11', deliveredAt:'2024-05-11',
    carrier:'Flash Express', trackingNumber:'FL998877665HT', origin:'Miami, USA', destination:'Port-au-Prince, Haiti',
    items:[
      { title:'AirPods Pro 2', variant:'White', qty:1, tint:4 },
      { title:'JBL Charge 5',  variant:'Black', qty:1, tint:1 },
    ],
    timeline:[
      { at:'2024-05-11T15:40:00', title:'Delivered',           desc:'Handed to recipient — Port-au-Prince, Haiti' },
      { at:'2024-05-10T09:15:00', title:'Out for delivery',    desc:'Port-au-Prince, Haiti' },
      { at:'2024-05-08T17:00:00', title:'In transit',          desc:'Arrived at local facility' },
      { at:'2024-05-06T12:00:00', title:'Package shipped',     desc:'Miami, USA' },
      { at:'2024-05-05T09:00:00', title:'Order confirmed',     desc:"Thank you! We've received your order." },
    ],
  },
  {
    id:'CLV778812', status:'preparing', placedAt:'2024-04-28T16:20:00', total:399.00,
    estimatedDelivery:'2024-05-17', carrier:'Flash Express', trackingNumber:'FL554433221HT',
    origin:'Miami, USA', destination:'Port-au-Prince, Haiti',
    items:[ { title:'Apple Watch Series 9', variant:'45mm, Midnight', qty:1, tint:2 } ],
    timeline:[
      { at:'2024-04-29T09:00:00', title:'Preparing your order', desc:'Seller is packing your items' },
      { at:'2024-04-28T16:20:00', title:'Order confirmed',      desc:"Thank you! We've received your order." },
    ],
  },
  {
    id:'CLV775230', status:'cancelled', placedAt:'2024-04-20T13:00:00', total:129.00,
    cancelledAt:'2024-04-21', carrier:'Flash Express', trackingNumber:'FL112233445HT',
    origin:'Miami, USA', destination:'Port-au-Prince, Haiti',
    items:[ { title:'JBL Charge 5', variant:'Blue', qty:1, tint:3 } ],
    timeline:[
      { at:'2024-04-21T10:00:00', title:'Order cancelled', desc:'Cancelled at your request' },
      { at:'2024-04-20T13:00:00', title:'Order confirmed', desc:"Thank you! We've received your order." },
    ],
  },
  {
    id:'CLV772109', status:'delivered', placedAt:'2024-04-15T11:00:00', total:39.00,
    estimatedDelivery:'2024-04-17', deliveredAt:'2024-04-17',
    carrier:'Flash Express', trackingNumber:'FL667788990HT', origin:'Miami, USA', destination:'Port-au-Prince, Haiti',
    items:[ { title:'Fashion Handbag', variant:'Brown, Leather', qty:1, tint:2 } ],
    timeline:[
      { at:'2024-04-17T14:00:00', title:'Delivered',       desc:'Handed to recipient — Port-au-Prince, Haiti' },
      { at:'2024-04-16T09:00:00', title:'Out for delivery', desc:'Port-au-Prince, Haiti' },
      { at:'2024-04-15T11:00:00', title:'Order confirmed', desc:"Thank you! We've received your order." },
    ],
  },
];

function fmtDate(iso, opts) {
  return new Date(iso).toLocaleDateString('en-US', opts || { month:'long', day:'numeric', year:'numeric' });
}
function fmtDateTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}
function daysUntil(iso) {
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  return d;
}

// ─── MINI PROGRESS TRACKER (used on order cards) ─────────────
function MiniTracker({ status }) {
  const meta = ORDER_STATUS_META[status];
  const currentStep = meta.step;
  const cancelled = status === 'cancelled';
  return (
    <div style={{ display:'flex', alignItems:'center', marginTop:10 }}>
      {TRACKER_STEPS.map((s, i) => {
        const done = !cancelled && i <= currentStep;
        return (
          <React.Fragment key={s.key}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:0 }}>
              <div style={{
                width:16, height:16, borderRadius:9999, flexShrink:0,
                background: cancelled ? (i === 0 ? C.danger : C.hairline) : done ? meta.color : C.white,
                border: done || (cancelled && i===0) ? 'none' : `1.5px solid ${C.hairline}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {done && !cancelled && <Icon name="check" size={8} color="#fff" sw={3} />}
                {cancelled && i === 0 && <Icon name="x" size={8} color="#fff" sw={3} />}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:8.5, color: done ? C.ink : C.mute, fontWeight: done ? 600 : 400, whiteSpace:'nowrap' }}>{s.label}</span>
            </div>
            {i < TRACKER_STEPS.length - 1 && (
              <div style={{ flex:1, height:2, background: !cancelled && i < currentStep ? meta.color : C.hairline, marginBottom:14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── ORDER CARD ───────────────────────────────────────────────
function OrderCard({ order, onPress }) {
  const meta = ORDER_STATUS_META[order.status];
  const firstItem = order.items[0];
  const itemCount = order.items.reduce((n, it) => n + it.qty, 0);
  return (
    <div onClick={onPress} style={{ background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 12px rgba(14,11,31,0.06)', cursor:'pointer' }}>
      <div style={{ display:'flex', gap:12 }}>
        <Img label="" tint={firstItem.tint} style={{ width:60, height:60, borderRadius:12, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink }}>Order #{order.id}</div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:700, color:meta.color, background:meta.bg, borderRadius:9999, padding:'3px 9px', flexShrink:0 }}>{meta.label}</span>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:2 }}>{fmtDate(order.placedAt, { month:'short', day:'numeric', year:'numeric' })}</div>
          {order.status !== 'cancelled' && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.ink, marginTop:6 }}>
              {order.status === 'delivered' ? 'Delivered ' : 'Estimated delivery '}
              <span style={{ fontWeight:700, color:C.primary }}>{fmtDate(order.deliveredAt || order.estimatedDelivery, { weekday:'long', month:'long', day:'numeric' })}</span>
            </div>
          )}
          {order.status === 'cancelled' && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger, marginTop:6 }}>Cancelled on <span style={{ fontWeight:700 }}>{fmtDate(order.cancelledAt, { month:'long', day:'numeric' })}</span></div>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{itemCount} item{itemCount > 1 ? 's' : ''} · <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, color:C.ink }}>${order.total.toFixed(2)}</span></span>
            <Icon name="chevronRight" size={16} color={C.mute} />
          </div>
        </div>
      </div>
      <MiniTracker status={order.status} />
    </div>
  );
}

// ─── SKELETON LOADER ──────────────────────────────────────────
function OrderCardSkeleton() {
  const shimmer = { background:'linear-gradient(90deg, #EFEDF5 25%, #F6F5FA 37%, #EFEDF5 63%)', backgroundSize:'400% 100%', animation:'shimmer 1.4s ease infinite', borderRadius:8 };
  return (
    <div style={{ background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 12px rgba(14,11,31,0.05)' }}>
      <div style={{ display:'flex', gap:12 }}>
        <div style={{ width:60, height:60, borderRadius:12, flexShrink:0, ...shimmer }} />
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ height:14, width:'60%', ...shimmer }} />
          <div style={{ height:11, width:'40%', ...shimmer }} />
          <div style={{ height:11, width:'70%', ...shimmer }} />
        </div>
      </div>
    </div>
  );
}

// ─── MY ORDERS (LIST) ─────────────────────────────────────────
function OrdersListScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = React.useState('all');
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [pull, setPull] = React.useState(0);
  const touchRef = React.useRef({ startY:0, pulling:false });
  const scrollRef = React.useRef(null);

  const loadOrders = React.useCallback(async () => {
    try {
      const user = await sbGetUser();
      const data = user ? await sbGetOrders(user.id) : [];
      setOrders(data && data.length ? data.map(normalizeRemoteOrder) : MOCK_ORDERS);
    } catch (e) {
      setOrders(MOCK_ORDERS);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadOrders();
    await new Promise(r => setTimeout(r, 500));
    setRefreshing(false);
    setPull(0);
  }

  function onTouchStart(e) {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchRef.current = { startY: e.touches[0].clientY, pulling: true };
    }
  }
  function onTouchMove(e) {
    if (!touchRef.current.pulling) return;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    if (dy > 0) setPull(Math.min(dy * 0.5, 80));
  }
  function onTouchEnd() {
    if (touchRef.current.pulling && pull > 50) handleRefresh();
    else setPull(0);
    touchRef.current.pulling = false;
  }

  const filtered = tab === 'all' ? orders : orders.filter(o => tabForStatus(o.status) === tab);

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
              <button onClick={() => navigate('notifications')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="bell" size={21} color={C.mute} />
              </button>
              <button onClick={() => navigate('cart')} style={{ width:40, height:40, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                <Icon name="cart" size={22} color={C.ink} />
                <Badge count={(window.CART_ITEMS || []).length} />
              </button>
            </div>
          </div>
        )}
        <div style={{ padding: isDesktop ? '24px 32px 0' : '0 20px', maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>My Orders</div>
        </div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', padding: isDesktop ? '14px 32px 14px' : '12px 20px 12px', maxWidth: isDesktop ? 1280 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                flexShrink:0, border:'none', cursor:'pointer', borderRadius:9999, padding:'8px 16px',
                background: active ? C.primary : C.paper, color: active ? '#fff' : C.mute,
                fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, transition:'all .15s',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        style={{ flex:1, overflowY:'auto', paddingBottom: isDesktop ? 40 : NAV_H + HOME_H + 24, position:'relative' }}
      >
        {(pull > 0 || refreshing) && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height: refreshing ? 44 : pull, transition: refreshing ? 'height .2s' : 'none', overflow:'hidden' }}>
            <Icon name="refreshCw" size={20} color={C.primary} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none', transform: !refreshing ? `rotate(${pull * 3}deg)` : undefined }} />
          </div>
        )}

        <div style={{ maxWidth: isDesktop ? 900 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '4px 32px 24px' : '4px 16px', display:'flex', flexDirection:'column', gap:12 }}>
          {loading && [...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}

          {!loading && filtered.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 24px', gap:14 }}>
              <div style={{ width:88, height:88, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="package" size={38} color={C.primary} />
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:C.ink }}>
                {tab === 'all' ? 'No orders yet' : `No ${TABS.find(t => t.key===tab).label.toLowerCase()} orders`}
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, textAlign:'center', maxWidth:260 }}>
                {tab === 'all' ? "You haven't placed any orders yet. Start shopping to see them here." : 'Try a different tab to see your other orders.'}
              </div>
              {tab === 'all' && (
                <Btn variant="primary" size="md" onClick={() => navigate('home')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
                  Start Shopping
                </Btn>
              )}
            </div>
          )}

          {!loading && filtered.map(order => (
            <OrderCard key={order.id} order={order} onPress={() => navigate('order-detail', { order })} />
          ))}
        </div>
      </div>

      <BottomNav active={3} onTab={(i) => {
        if (i === 0) navigate('home');
        else if (i === 1) navigate('categories');
        else if (i === 2) navigate('cart');
        else if (i === 4) navigate('profile');
      }} />
    </div>
  );
}

function normalizeRemoteOrder(row) {
  return {
    id: row.id, status: row.status || 'confirmed', placedAt: row.created_at, total: row.total || 0,
    estimatedDelivery: row.estimated_delivery, deliveredAt: row.delivered_at, cancelledAt: row.cancelled_at,
    carrier: 'Flash Express', trackingNumber: row.tracking_number, origin: 'Miami, USA', destination: 'Port-au-Prince, Haiti',
    items: (row.order_items || []).map((it, i) => ({ title: it.title, variant: '', qty: it.quantity || 1, tint: i % 5 })),
    timeline: [{ at: row.created_at, title:'Order confirmed', desc:"Thank you! We've received your order." }],
  };
}

// ─── HORIZONTAL PROGRESS TRACKER (detail page) ───────────────
function DetailTracker({ status }) {
  const meta = ORDER_STATUS_META[status];
  const currentStep = meta.step;
  const cancelled = status === 'cancelled';
  return (
    <div style={{ display:'flex', alignItems:'flex-start' }}>
      {TRACKER_STEPS.map((s, i) => {
        const done = !cancelled && i <= currentStep;
        const current = !cancelled && i === currentStep;
        return (
          <React.Fragment key={s.key}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:56, flexShrink:0 }}>
              <div style={{
                width:34, height:34, borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center',
                background: current ? C.primary : done ? C.primarySoft : C.white,
                border: done ? 'none' : `1.5px solid ${C.hairline}`,
                boxShadow: current ? `0 0 0 4px ${C.primarySoft}` : 'none',
              }}>
                <Icon name={s.icon} size={15} color={current ? '#fff' : done ? C.primary : C.mute} sw={current ? 2 : 1.5} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight: current ? 700 : 500, color: current ? C.primary : done ? C.ink : C.mute, textAlign:'center' }}>{s.label}</span>
            </div>
            {i < TRACKER_STEPS.length - 1 && (
              <div style={{ flex:1, height:2, background: done && i < currentStep ? C.primary : C.hairline, marginTop:17, borderRadius:2 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── ORDER TRACKING (DETAIL) ──────────────────────────────────
function OrderDetailScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [order, setOrder] = React.useState(params.order || null);
  const [toast, setToast] = React.useState(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (params.order?.id) {
      sbGetOrder(params.order.id).then(data => {
        if (alive && data) setOrder(prev => ({ ...prev, ...normalizeRemoteOrder(data) }));
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [params.order]);

  if (!order) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Btn variant="secondary" onClick={goBack}>Go back</Btn>
      </div>
    );
  }

  const meta = ORDER_STATUS_META[order.status];
  const cancellable = ['confirmed', 'preparing'].includes(order.status);
  const canReorder = ['delivered', 'cancelled'].includes(order.status);

  async function copyTracking() {
    try { await navigator.clipboard.writeText(order.trackingNumber); setToast({ type:'success', message:'Tracking number copied' }); }
    catch { setToast({ type:'error', message:'Could not copy tracking number' }); }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await sbCancelOrder(order.id);
      setOrder(prev => ({ ...prev, status:'cancelled', cancelledAt: new Date().toISOString() }));
      setToast({ type:'success', message:'Order cancelled successfully' });
    } catch (e) {
      setToast({ type:'error', message:'Failed to cancel order. Please try again.' });
    }
    setCancelling(false);
    setConfirmCancel(false);
  }

  function handleReorder() {
    order.items.forEach(it => {
      (window.CART_ITEMS || (window.CART_ITEMS = [])).push({ product:{ id:Math.random(), title:it.title, price: order.total / order.items.length }, qty: it.qty, variant: it.variant });
    });
    setToast({ type:'success', message:'Items added to your cart' });
    setTimeout(() => navigate('cart'), 700);
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 720 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="arrowLeft" size={18} color={C.ink} />
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Order Tracking</span>
          </div>
          <button onClick={() => navigate('chat')} style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer' }}>
            <Icon name="headphones" size={18} color={C.primary} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Support</span>
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:14, maxWidth: isDesktop ? 720 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        {/* Hero status card */}
        <div style={{ borderRadius:20, background: order.status === 'cancelled' ? `linear-gradient(135deg, ${C.danger} 0%, #A83333 100%)` : `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDeep} 100%)`, padding:'20px 20px', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:160, height:160, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'rgba(255,255,255,0.75)', marginBottom:6, letterSpacing:'0.04em' }}>ORDER #{order.id}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.85)' }}>Placed on {fmtDate(order.placedAt, { month:'long', day:'numeric', year:'numeric' })} · {new Date(order.placedAt).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}</div>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:'#fff', background:'rgba(255,255,255,0.22)', borderRadius:9999, padding:'5px 12px', flexShrink:0 }}>{meta.label}</span>
          </div>

          {order.status !== 'cancelled' ? (
            <div style={{ marginTop:16, position:'relative' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.75)' }}>{order.status === 'delivered' ? 'Delivered on' : 'Estimated Delivery'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                {fmtDate(order.deliveredAt || order.estimatedDelivery, { weekday:'long', month:'long', day:'numeric' })}
              </div>
              {order.status !== 'delivered' && daysUntil(order.estimatedDelivery) >= 0 && (
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.85)' }}>(In {daysUntil(order.estimatedDelivery)} day{daysUntil(order.estimatedDelivery) !== 1 ? 's' : ''})</div>
              )}
            </div>
          ) : (
            <div style={{ marginTop:16, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:'rgba(255,255,255,0.9)' }}>This order was cancelled on {fmtDate(order.cancelledAt, { month:'long', day:'numeric', year:'numeric' })}.</div>
          )}

          {/* Truck banner */}
          {order.status !== 'cancelled' && (
            <div style={{ borderRadius:12, background:'rgba(255,255,255,0.12)', padding:'10px 12px', overflow:'hidden', height:56, position:'relative', marginTop:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <Icon name="mapPin" size={16} color="rgba(255,255,255,0.7)" />
              <div style={{ flex:1, height:2, background:'repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 6px, transparent 6px 12px)', margin:'0 8px', position:'relative' }}>
                <div style={{ position:'absolute', top:-11, left: `${Math.min(90, Math.max(5, (meta.step / 4) * 90))}%`, transform:'translateX(-50%)' }}>
                  <Icon name="truck" size={20} color="#fff" />
                </div>
              </div>
              <Icon name="checkCircle" size={16} color="rgba(255,255,255,0.7)" />
            </div>
          )}
        </div>

        {/* Progress tracker */}
        {order.status !== 'cancelled' && (
          <div style={{ background:C.white, borderRadius:16, padding:'18px 16px 6px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', overflowX:'auto', flexShrink:0 }}>
            <DetailTracker status={order.status} />
          </div>
        )}

        {/* Info banner */}
        {order.timeline?.[0] && order.status !== 'cancelled' && (
          <div style={{ background:C.primarySoft, borderRadius:16, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="package" size={17} color={C.primary} />
            </div>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.primaryDeep }}>{order.timeline[0].title}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.primaryDeep }}>Last update: {fmtDateTime(order.timeline[0].at)}</div>
            </div>
          </div>
        )}

        {/* Shipping information */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Shipping Information</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Carrier</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{order.carrier}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Tracking Number</span>
              <button onClick={copyTracking} style={{ display:'flex', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer' }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{order.trackingNumber}</span>
                <Icon name="copy" size={13} color={C.primary} />
              </button>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Origin</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{order.origin}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Destination</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{order.destination}</span>
            </div>
          </div>
          <Btn variant="secondary" size="sm" wide onClick={() => setToast({ type:'success', message:'Opening carrier tracking site…' })} style={{ marginTop:14 }}>
            <Icon name="externalLink" size={14} color={C.ink} />
            Track on Carrier Site
          </Btn>
        </div>

        {/* Live tracking timeline */}
        {order.timeline?.length > 0 && (
          <div style={{ background:C.white, borderRadius:16, padding:'16px 18px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:14 }}>Live Tracking</div>
            {order.timeline.map((ev, i) => (
              <div key={i} style={{ display:'flex', gap:14, position:'relative' }}>
                {i < order.timeline.length - 1 && (
                  <div style={{ position:'absolute', left:6, top:18, width:2, height:'calc(100% - 6px)', background:C.hairline }} />
                )}
                <div style={{ width:14, height:14, borderRadius:9999, background: i === 0 ? (order.status==='cancelled'?C.danger:C.primary) : C.hairline, flexShrink:0, marginTop:4, zIndex:1 }} />
                <div style={{ flex:1, paddingBottom: i < order.timeline.length - 1 ? 18 : 0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight: i === 0 ? 700 : 500, color:C.ink }}>{ev.title}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, marginTop:1 }}>{ev.desc}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.mute, marginTop:3 }}>{fmtDateTime(ev.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ordered products */}
        <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, marginBottom:12 }}>Ordered Products ({order.items.reduce((n,i)=>n+i.qty,0)})</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {order.items.map((it, i) => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center', paddingTop: i > 0 ? 12 : 0, borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Img label="" tint={it.tint} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{it.title}</div>
                  {it.variant && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{it.variant}</div>}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute, flexShrink:0 }}>Qty {it.qty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {cancellable && !confirmCancel && (
            <Btn variant="secondary" size="md" wide onClick={() => setConfirmCancel(true)} style={{ color:C.danger, borderColor:'#FCA5A5' }}>
              <Icon name="xCircle" size={16} color={C.danger} /> Cancel Order
            </Btn>
          )}
          {confirmCancel && (
            <div style={{ background:'#FEF2F2', borderRadius:14, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger, fontWeight:600 }}>Are you sure you want to cancel this order?</span>
              <div style={{ display:'flex', gap:10 }}>
                <Btn variant="danger" size="sm" style={{ flex:1 }} onClick={handleCancel} disabled={cancelling}>{cancelling ? 'Cancelling…' : 'Yes, Cancel'}</Btn>
                <Btn variant="secondary" size="sm" style={{ flex:1 }} onClick={() => setConfirmCancel(false)}>Keep Order</Btn>
              </div>
            </div>
          )}
          {canReorder && (
            <Btn variant="soft" size="md" wide onClick={handleReorder}>
              <Icon name="refreshCw" size={16} color={C.primaryDeep} /> Reorder Items
            </Btn>
          )}
          <Btn variant="primary" size="lg" wide onClick={() => navigate('chat')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 8px 20px rgba(108,77,255,0.3)' }}>
            <Icon name="headphones" size={16} color="#fff" /> Need Help?
          </Btn>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { OrdersListScreen, OrderDetailScreen, ORDER_STATUS_META, MOCK_ORDERS });
