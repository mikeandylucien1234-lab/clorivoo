// screen-tracking.jsx — My Orders (list) + Order Tracking (detail)

// ─── STATUS METADATA ─────────────────────────────────────────
// This is the ORDER-LEVEL rollup only (mirrors computeOrderFulfillmentStatus /
// the order_fulfillment_summary SQL view) — it is a summary of potentially
// several independent, per-seller shipments, never a fabricated single
// status. "delivered" here only ever means every shipment on the order is
// delivered; a single seller's own progress can never produce it alone.
const ORDER_STATUS_META = {
  awaiting_shipment:  { label:'Awaiting Shipment', color:C.mute,    bg:C.paper,       step:0 },
  pending:            { label:'Preparing',         color:C.primary, bg:C.primarySoft, step:0 },
  processing:         { label:'Preparing',         color:C.primary, bg:C.primarySoft, step:0 },
  partially_shipped:  { label:'On The Way',        color:C.primary, bg:C.primarySoft, step:1 },
  delivered:          { label:'Delivered',         color:C.success, bg:'#ECFDF5',     step:2 },
  delivery_exception: { label:'Delivery Issue',    color:C.danger,  bg:'#FEF2F2',     step:1 },
  cancelled:          { label:'Cancelled',          color:C.danger,  bg:'#FEF2F2',     step:-1 },
};
const TRACKER_STEPS = [
  { key:'placed',    label:'Placed',    icon:'check' },
  { key:'shipping',  label:'Shipping',  icon:'truck' },
  { key:'delivered', label:'Delivered', icon:'checkCircle' },
];
const TABS = [
  { key:'all',        label:'All' },
  { key:'processing', label:'Processing' },
  { key:'shipped',    label:'Shipped' },
  { key:'delivered',  label:'Delivered' },
  { key:'cancelled',  label:'Cancelled' },
];
function tabForStatus(status) {
  if (status === 'awaiting_shipment' || status === 'pending' || status === 'processing') return 'processing';
  if (status === 'partially_shipped' || status === 'delivery_exception') return 'shipped';
  return status; // delivered | cancelled
}

// Per-shipment status metadata — these drive each shipment's own card on
// the detail page, independent of every other seller's shipment on the
// same order.
const SHIPMENT_STATUS_META = {
  pending:    { label:'Preparing',        color:C.primary, bg:C.primarySoft },
  processing: { label:'Preparing',        color:C.primary, bg:C.primarySoft },
  shipped:    { label:'Shipped',          color:C.primary, bg:C.primarySoft },
  in_transit: { label:'In Transit',       color:C.primary, bg:C.primarySoft },
  delivered:  { label:'Delivered',        color:C.success, bg:'#ECFDF5' },
  failed:     { label:'Delivery Issue',   color:C.danger,  bg:'#FEF2F2' },
  returned:   { label:'Returned',         color:C.danger,  bg:'#FEF2F2' },
  cancelled:  { label:'Cancelled',        color:C.mute,    bg:C.paper },
};
const HISTORY_SOURCE_LABEL = { seller: 'Reported by seller', admin_override: 'Updated by support', system: 'System', carrier_api: 'Verified by carrier' };

// ─── MOCK ORDERS (used when there is no real backend session) ─
const MOCK_ORDERS = [];

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
// Order-level only: 3 broad steps (Placed / Shipping / Delivered). A
// delivery exception on any one shipment still shows as "done" through
// the shipping step (something happened) but never advances to
// Delivered — that only happens once every shipment is delivered.
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
          {order.status === 'cancelled' && order.cancelledAt && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger, marginTop:6 }}>Cancelled on <span style={{ fontWeight:700 }}>{fmtDate(order.cancelledAt, { month:'long', day:'numeric' })}</span></div>
          )}
          {order.status === 'delivery_exception' && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger, marginTop:6, fontWeight:600 }}>One or more shipments need attention</div>
          )}
          {order.shipmentCount > 1 && order.status !== 'cancelled' && (
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:C.mute, marginTop:4 }}>{order.shipmentCount} shipments</div>
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
function OrdersListScreen({ params = {} }) {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const [tab, setTab] = React.useState(params.tab || 'all');
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

// Builds the order-level summary shown in the list and the detail hero.
// Deliberately carries NO fabricated carrier/origin/destination/timeline —
// those are real, per-shipment facts fetched separately via
// sbGetOrderShipments() and rendered as independent shipment cards.
function normalizeRemoteOrder(row) {
  const shipments = row.shipments || [];
  const status = row.status === 'cancelled' ? 'cancelled' : computeOrderFulfillmentStatus(shipments);
  return {
    id: row.id, status, placedAt: row.created_at, total: row.total_amount ?? row.total ?? 0,
    cancelledAt: row.status === 'cancelled' ? row.updated_at : null,
    shipmentCount: shipments.length,
    items: (row.order_items || []).map((it, i) => ({ title: it.title, variant: '', qty: it.quantity || 1, tint: i % 5 })),
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
  const [shipments, setShipments] = React.useState([]);
  const [toast, setToast] = React.useState(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    if (params.order?.id) {
      Promise.all([
        sbGetOrder(params.order.id),
        sbGetOrderShipments(params.order.id),
      ]).then(([data, ships]) => {
        if (!alive) return;
        if (ships) setShipments(ships);
        if (data) setOrder(prev => ({ ...prev, ...normalizeRemoteOrder({ ...data, shipments: ships }) }));
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
  const cancellable = ['awaiting_shipment', 'pending'].includes(order.status);
  const canReorder = ['delivered', 'cancelled'].includes(order.status);

  function copyTracking(trackingNumber) {
    navigator.clipboard.writeText(trackingNumber)
      .then(() => setToast({ type:'success', message:'Tracking number copied' }))
      .catch(() => setToast({ type:'error', message:'Could not copy tracking number' }));
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

          {order.status === 'cancelled' ? (
            <div style={{ marginTop:16, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:'rgba(255,255,255,0.9)' }}>
              {order.cancelledAt ? <>This order was cancelled on {fmtDate(order.cancelledAt, { month:'long', day:'numeric', year:'numeric' })}.</> : 'This order was cancelled.'}
            </div>
          ) : (
            <div style={{ marginTop:16, position:'relative' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.75)' }}>
                {shipments.length > 1
                  ? `${shipments.length} shipments from ${new Set(shipments.map(s=>s.seller_id)).size} seller${new Set(shipments.map(s=>s.seller_id)).size>1?'s':''}`
                  : shipments.length === 1 ? '1 shipment' : 'Awaiting shipment'}
              </div>
            </div>
          )}
        </div>

        {/* Progress tracker */}
        {order.status !== 'cancelled' && (
          <div style={{ background:C.white, borderRadius:16, padding:'18px 16px 6px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', overflowX:'auto', flexShrink:0 }}>
            <DetailTracker status={order.status} />
          </div>
        )}

        {order.status === 'delivery_exception' && (
          <div style={{ background:'#FEF2F2', borderRadius:16, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9999, background:C.white, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="alertTriangle" size={17} color={C.danger} />
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.danger }}>One or more shipments ran into a delivery issue — see details below.</div>
          </div>
        )}

        {/* Independent shipment cards — one per seller's shipment on this
            order. Never a single fabricated whole-order carrier/timeline;
            each shipment shows only its own, real, seller-reported data. */}
        {shipments.length === 0 && order.status !== 'cancelled' && (
          <div style={{ background:C.white, borderRadius:16, padding:'16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', textAlign:'center' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>The seller(s) haven't created a shipment yet.</span>
          </div>
        )}
        {shipments.map((s, idx) => {
          const sMeta = SHIPMENT_STATUS_META[s.status] ?? { label:s.status, color:C.mute, bg:C.paper };
          const history = s.shipment_status_history ?? [];
          return (
            <div key={s.id} style={{ background:C.white, borderRadius:16, padding:'16px 18px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink }}>
                  {shipments.length > 1 ? `Shipment ${idx + 1}` : 'Shipment'}
                </span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:700, color:sMeta.color, background:sMeta.bg, borderRadius:9999, padding:'4px 10px' }}>{sMeta.label}</span>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:12 }}>
                {(s.order_items ?? []).map(it => it.title).join(', ')}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                {s.carrier && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Carrier <span style={{ fontSize:10.5 }}>(seller-reported)</span></span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:700, color:C.ink }}>{s.carrier}</span>
                  </div>
                )}
                {s.tracking_number && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Tracking Number</span>
                    <button onClick={() => copyTracking(s.tracking_number)} style={{ display:'flex', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer' }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{s.tracking_number}</span>
                      <Icon name="copy" size={13} color={C.primary} />
                    </button>
                  </div>
                )}
                {s.estimated_delivery && s.status !== 'delivered' && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Estimated Delivery</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink }}>{fmtDate(s.estimated_delivery, { month:'long', day:'numeric' })}</span>
                  </div>
                )}
                {s.delivered_at && (
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Delivered On</span>
                    <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.success }}>{fmtDate(s.delivered_at, { month:'long', day:'numeric' })}</span>
                  </div>
                )}
                {s.status === 'failed' && s.failure_reason && (
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>Issue: {s.failure_reason}</div>
                )}
                {!s.carrier && !s.tracking_number && (s.status === 'pending' || s.status === 'processing') && (
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.mute }}>The seller hasn't shared tracking info yet.</div>
                )}
              </div>

              {history.length > 0 && (
                <div style={{ borderTop:`1px solid ${C.hairline}`, paddingTop:12 }}>
                  {history.slice().reverse().map((ev, i) => (
                    <div key={i} style={{ display:'flex', gap:12, position:'relative' }}>
                      {i < history.length - 1 && (
                        <div style={{ position:'absolute', left:5, top:16, width:2, height:'calc(100% - 4px)', background:C.hairline }} />
                      )}
                      <div style={{ width:12, height:12, borderRadius:9999, background: i === 0 ? sMeta.color : C.hairline, flexShrink:0, marginTop:4, zIndex:1 }} />
                      <div style={{ flex:1, paddingBottom: i < history.length - 1 ? 14 : 0 }}>
                        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight: i === 0 ? 700 : 500, color:C.ink, textTransform:'capitalize' }}>{(SHIPMENT_STATUS_META[ev.status]?.label ?? ev.status)}</div>
                        {ev.note && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>{ev.note}</div>}
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:C.mute, marginTop:3 }}>{fmtDateTime(ev.created_at)} · {HISTORY_SOURCE_LABEL[ev.source] ?? ev.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

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
          <Btn variant="secondary" size="md" wide onClick={() => setToast({ type:'success', message:'Invoice downloaded' })}>
            <Icon name="download" size={16} color={C.ink} /> Download Invoice
          </Btn>
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
