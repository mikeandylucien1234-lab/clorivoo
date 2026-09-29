// ui-kit.jsx — Clorivo shared components
// Requires: tokens.jsx loaded first

// ─── IMAGE PLACEHOLDER ──────────────────────────────────────
function Img({ label, style = {}, tint = 0 }) {
  const tints = [
    'linear-gradient(135deg,#f0ecfd 0%,#e4daf9 50%,#ede5ff 100%)',
    'linear-gradient(135deg,#fdf0ec 0%,#f9e0d4 50%,#fde8e0 100%)',
    'linear-gradient(135deg,#ecf4fd 0%,#d4e4f9 50%,#e0eeff 100%)',
    'linear-gradient(135deg,#ecfdf4 0%,#d4f9e4 50%,#e0fff0 100%)',
    'linear-gradient(135deg,#fdfaec 0%,#f9f0d4 50%,#fdf8e0 100%)',
  ];
  return (
    <div style={{ position:'relative', overflow:'hidden', background: tints[tint % tints.length], ...style }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(ellipse at 35% 45%, rgba(108,77,255,0.07) 0%, transparent 65%)' }} />
      {label && (
        <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(255,255,255,0.78)', backdropFilter:'blur(6px)', borderRadius:4, padding:'3px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.mute, whiteSpace:'nowrap' }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── BUTTON ─────────────────────────────────────────────────
function Btn({ variant='primary', size='md', wide, children, onClick, disabled, style={} }) {
  const [pressed, setPressed] = React.useState(false);
  const V = {
    primary:   { background:C.primary, color:'#fff', border:'none' },
    secondary: { background:'transparent', color:C.ink, border:`1.5px solid ${C.hairline}` },
    ghost:     { background:'transparent', color:C.primary, border:'none' },
    soft:      { background:C.primarySoft, color:C.primaryDeep, border:'none' },
    danger:    { background:C.danger, color:'#fff', border:'none' },
    outline:   { background:'transparent', color:C.primary, border:`1.5px solid ${C.primary}` },
    dark:      { background:C.ink, color:'#fff', border:'none' },
  };
  const S = {
    sm: { height:36, padding:'0 16px', fontSize:13, borderRadius:9999, fontWeight:600, gap:6 },
    md: { height:44, padding:'0 20px', fontSize:15, borderRadius:9999, fontWeight:600, gap:8 },
    lg: { height:52, padding:'0 24px', fontSize:16, borderRadius:9999, fontWeight:700, gap:8 },
  };
  const v = V[variant] || V.primary;
  const s = S[size] || S.md;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        ...v, ...s,
        width: wide ? '100%' : 'auto',
        display:'inline-flex', alignItems:'center', justifyContent:'center',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition:'opacity 0.12s, transform 0.1s',
        fontFamily:"'Inter',sans-serif",
        letterSpacing:'-0.01em',
        ...style,
      }}>
      {children}
    </button>
  );
}

// ─── INPUT ──────────────────────────────────────────────────
function Input({ label, placeholder, value, onChange, type='text', iconLeft, iconRight, error, hint, style={} }) {
  const [focused, setFocused] = React.useState(false);
  const [show, setShow]       = React.useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...style }}>
      {label && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute, letterSpacing:'-0.01em' }}>{label}</span>}
      <div style={{
        height:50, display:'flex', alignItems:'center', gap:10,
        border:`1.5px solid ${error ? C.danger : focused ? C.primary : C.hairline}`,
        borderRadius:12,
        padding:'0 14px',
        background:C.white,
        boxShadow: focused && !error ? `0 0 0 3px ${C.primarySoft}` : 'none',
        transition:'border-color 0.15s, box-shadow 0.15s',
      }}>
        {iconLeft && <span style={{ color:C.mute, display:'flex' }}>{iconLeft}</span>}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex:1, border:'none', outline:'none', background:'transparent',
            fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:400,
            color:C.ink, '::placeholder':{ color:C.mute },
          }}
        />
        {isPassword && (
          <button onClick={() => setShow(s => !s)} style={{ border:'none', background:'none', cursor:'pointer', padding:0, display:'flex', color:C.mute }}>
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} color={C.mute} />
          </button>
        )}
        {iconRight && !isPassword && <span style={{ color:C.mute, display:'flex' }}>{iconRight}</span>}
      </div>
      {(error || hint) && (
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color: error ? C.danger : C.mute }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

// ─── CHIP ────────────────────────────────────────────────────
function Chip({ active, children, onClick, style={} }) {
  return (
    <button onClick={onClick} style={{
      display:'inline-flex', alignItems:'center', gap:4,
      height:32, padding:'0 14px', borderRadius:9999,
      fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500,
      border:`1.5px solid ${active ? C.primary : C.hairline}`,
      background: active ? C.primarySoft : C.white,
      color: active ? C.primaryDeep : C.mute,
      cursor:'pointer', whiteSpace:'nowrap',
      transition:'all 0.15s',
      flexShrink:0,
      ...style,
    }}>{children}</button>
  );
}

// ─── NAVBAR ─────────────────────────────────────────────────
function NavBar({ title, onBack, right, transparent, light, style={} }) {
  const bg = transparent ? 'transparent' : C.white;
  const textColor = light ? 'rgba(255,255,255,0.95)' : C.ink;
  return (
    <div style={{
      height:44, display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 6px', background:bg,
      borderBottom: transparent ? 'none' : `1px solid ${C.hairline}`,
      flexShrink:0,
      ...style,
    }}>
      <button onClick={onBack} style={{ width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'none', cursor:'pointer', borderRadius:10 }}>
        {onBack !== false && <Icon name="arrowLeft" size={22} color={textColor} />}
      </button>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:600, color:textColor, letterSpacing:'-0.015em', flex:1, textAlign:'center' }}>
        {title}
      </span>
      <div style={{ width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {right || null}
      </div>
    </div>
  );
}

// ─── STATUS BAR ─────────────────────────────────────────────
// Clorivo is a real site, not a phone mockup — no fake device status bar.
function StatusBar() {
  return null;
}

// ─── BOTTOM NAV (mobile only) ────────────────────────────────
function BottomNav({ active = 0, onTab }) {
  const isDesktop = useIsDesktop();
  if (isDesktop) return null;
  const tabs = [
    { icon:'home',     label:'Home'       },
    { icon:'grid',     label:'Categories' },
    { icon:'cart',     label:'Cart'       },
    { icon:'package',  label:'Orders'     },
    { icon:'user',     label:'Profile'    },
  ];
  return (
    <div style={{ position:'absolute', bottom:0, left:0, right:0, height:NAV_H, background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', justifyContent:'space-around', paddingBottom:HOME_H, zIndex:100 }}>
      {tabs.map((t, i) => {
        const isActive = i === active;
        return (
          <button key={i} onClick={() => onTab && onTab(i)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, border:'none', background:'none', cursor:'pointer', padding:'4px 10px', borderRadius:10, flex:1 }}>
            <Icon name={t.icon} size={22} color={isActive ? C.primary : C.mute} sw={isActive ? 2 : 1.5} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight: isActive ? 600 : 400, color: isActive ? C.primary : C.mute, letterSpacing:'-0.01em' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── DESKTOP TOP NAV (desktop only, global) ──────────────────
function DesktopNav() {
  const isDesktop = useIsDesktop();
  const { current, navigate } = useNav();
  if (!isDesktop) return null;

  const screen = current?.screen;
  const hideOn = ['splash', 'onboarding', 'login', 'register', 'forgot-password', 'otp-verify', 'reset-password', 'auth-success',
    'seller-welcome', 'become-seller', 'kyc-verify-identity', 'kyc-doc', 'kyc-selfie-intro', 'kyc-selfie', 'kyc-review', 'kyc-success'];
  if (hideOn.includes(screen)) return null;

  const links = [
    { key:'home',     label:'Home',       icon:'home'  },
    { key:'category', label:'Categories', icon:'grid'  },
    { key:'tracking', label:'Orders',     icon:'package' },
    { key:'profile',  label:'Profile',    icon:'user'  },
  ];
  const cartCount = (window.CART_ITEMS || []).reduce((n, it) => n + (it.qty || 1), 0);

  return (
    <div style={{ height:72, flexShrink:0, background:C.white, borderBottom:`1px solid ${C.hairline}`, display:'flex', alignItems:'center', position:'sticky', top:0, zIndex:500 }}>
      <div style={{ width:'100%', maxWidth:1280, margin:'0 auto', padding:'0 32px', display:'flex', alignItems:'center', gap:32 }}>
        <div onClick={() => navigate('home')} style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.primary, letterSpacing:'-0.03em', cursor:'pointer', flexShrink:0 }}>
          clorivo
        </div>

        <nav style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
          {links.map(l => {
            const isActive = screen === l.key;
            return (
              <button key={l.key} onClick={() => navigate(l.key)} style={{
                display:'flex', alignItems:'center', gap:7, border:'none', cursor:'pointer',
                background: isActive ? C.primarySoft : 'transparent',
                color: isActive ? C.primaryDeep : C.mute,
                fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600,
                padding:'9px 16px', borderRadius:9999, transition:'background 0.15s',
              }}>
                <Icon name={l.icon} size={17} color={isActive ? C.primaryDeep : C.mute} sw={isActive ? 2 : 1.5} />
                {l.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex:1, maxWidth:420 }}>
          <div style={{ height:40, display:'flex', alignItems:'center', gap:8, padding:'0 14px', borderRadius:9999, background:C.paper, border:`1.5px solid ${C.hairline}` }}>
            <Icon name="search" size={16} color={C.mute} />
            <input placeholder="Search on clorivo…" style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }} />
          </div>
        </div>

        <button onClick={() => navigate('notifications')} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', padding:8, borderRadius:10, color:C.mute, flexShrink:0 }}>
          <Icon name="bell" size={20} />
        </button>

        <button onClick={() => navigate('cart')} style={{ position:'relative', border:'none', background:'none', cursor:'pointer', display:'flex', padding:8, borderRadius:10, color: screen === 'cart' ? C.primary : C.mute, flexShrink:0 }}>
          <Icon name="cart" size={20} color={screen === 'cart' ? C.primary : C.mute} sw={screen === 'cart' ? 2 : 1.5} />
          {cartCount > 0 && (
            <span style={{ position:'absolute', top:2, right:2, minWidth:16, height:16, borderRadius:9999, background:C.primary, color:'#fff', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', fontFamily:"'Inter',sans-serif" }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ────────────────────────────────────────────
function ProductCard({ product, size='md', onPress, tint }) {
  const p = product;
  const w = size === 'sm' ? 140 : 170;
  const imgH = size === 'sm' ? 140 : 170;
  const [liked, setLiked] = React.useState(false);
  return (
    <div onClick={onPress} style={{ width:w, borderRadius:12, background:C.white, boxShadow:'0 2px 12px rgba(14,11,31,0.06)', overflow:'hidden', cursor:'pointer', flexShrink:0 }}>
      <div style={{ position:'relative' }}>
        <Img label={p.label} tint={tint || (p.id % 5)} style={{ width:w, height:imgH }} />
        {p.discount && (
          <div style={{ position:'absolute', top:8, left:8, background:C.primarySoft, color:C.primaryDeep, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:9999 }}>-{p.discount}%</div>
        )}
        <button onClick={e => { e.stopPropagation(); setLiked(l => !l); }} style={{ position:'absolute', top:6, right:6, width:30, height:30, borderRadius:9999, background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name={liked ? 'heartFill' : 'heart'} size={15} color={liked ? C.danger : C.mute} filled={liked} />
        </button>
      </div>
      <div style={{ padding:'8px 10px 10px' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:400, color:C.ink, lineHeight:1.3, marginBottom:4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{p.title}</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.primary }}>${p.price.toFixed(2)}</span>
          {p.oldPrice && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:400, color:C.mute, textDecoration:'line-through' }}>${p.oldPrice}</span>}
        </div>
        {p.sold && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute, marginTop:2 }}>{p.sold}</div>}
      </div>
    </div>
  );
}

// ─── PRODUCT CARD WIDE (for cart / lists) ───────────────────
function ProductCardWide({ product, qty, variant, onRemove, onQtyChange }) {
  const p = product;
  return (
    <div style={{ display:'flex', gap:12, padding:'12px 0' }}>
      <Img label="" tint={p.id % 5} style={{ width:72, height:72, borderRadius:10, flexShrink:0 }} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.ink, lineHeight:1.3 }}>{p.title}</div>
        {variant && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{variant}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:C.primary }}>${(p.price * qty).toFixed(2)}</span>
          <div style={{ display:'flex', alignItems:'center', gap:0, border:`1.5px solid ${C.hairline}`, borderRadius:9999, overflow:'hidden' }}>
            <button onClick={() => onQtyChange && onQtyChange(qty - 1)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.mute }}>
              <Icon name="minus" size={14} />
            </button>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, minWidth:20, textAlign:'center' }}>{qty}</span>
            <button onClick={() => onQtyChange && onQtyChange(qty + 1)} style={{ width:30, height:30, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.primary }}>
              <Icon name="plus" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AVATAR ─────────────────────────────────────────────────
function Avatar({ size=36, initials='?', bg, style={} }) {
  return (
    <div style={{ width:size, height:size, borderRadius:9999, background: bg || C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, ...style }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:size*0.38, fontWeight:700, color:C.primaryDeep, letterSpacing:'-0.02em' }}>{initials}</span>
    </div>
  );
}

// ─── SECTION HEADER ─────────────────────────────────────────
function SectionHeader({ title, onSeeAll, style={} }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', ...style }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:700, color:C.ink, letterSpacing:'-0.02em' }}>{title}</span>
      {onSeeAll && (
        <button onClick={onSeeAll} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:2, color:C.primary }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500 }}>See all</span>
          <Icon name="chevronRight" size={14} color={C.primary} />
        </button>
      )}
    </div>
  );
}

// ─── DIVIDER ────────────────────────────────────────────────
function Divider({ style={} }) {
  return <div style={{ height:1, background:C.hairline, ...style }} />;
}

// ─── MODAL ──────────────────────────────────────────────────
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(14,11,31,0.55)', backdropFilter:'blur(2px)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:480, maxHeight:'80vh', background:C.white, borderRadius:'20px 20px 0 0', padding:'20px 20px 28px', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(14,11,31,0.2)', animation:'sheetIn 0.25s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.hairline, margin:'0 auto 16px' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:17, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{title}</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:9999, border:'none', background:C.paper, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="x" size={16} color={C.mute} />
          </button>
        </div>
        <div style={{ overflowY:'auto', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── RATING STARS ────────────────────────────────────────────
function Stars({ rating = 5, size = 13 }) {
  return (
    <div style={{ display:'flex', gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? '#F59E0B' : C.hairline} stroke={i <= Math.round(rating) ? '#F59E0B' : C.hairline} strokeWidth={1.5}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

// ─── BADGE (notification dot) ───────────────────────────────
function Badge({ count, style={} }) {
  if (!count) return null;
  return (
    <div style={{ position:'absolute', top:-3, right:-3, minWidth:16, height:16, borderRadius:9999, background:C.danger, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${C.white}`, ...style }}>
      <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:700, color:'#fff', padding:'0 3px' }}>{count > 99 ? '99+' : count}</span>
    </div>
  );
}

Object.assign(window, {
  Img, Btn, Input, Chip, NavBar, StatusBar,
  BottomNav, DesktopNav, ProductCard, ProductCardWide,
  Avatar, SectionHeader, Divider, Stars, Badge, Modal,
});
