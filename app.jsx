// app.jsx — Navigation · Theme · Router · App
// Must be the last script loaded; calls ReactDOM.createRoot

// ─── NAV PROVIDER ────────────────────────────────────────────
function NavProvider({ children }) {
  const [stack, setStack]     = React.useState([{ screen:'splash', params:{} }]);
  const [navKey, setNavKey]   = React.useState(0);
  const [direction, setDir]   = React.useState('forward');

  const navigate = React.useCallback((screen, params = {}) => {
    setDir('forward');
    setStack(prev => [...prev, { screen, params }]);
    setNavKey(k => k + 1);
  }, []);

  const goBack = React.useCallback(() => {
    setStack(prev => {
      if (prev.length <= 1) return prev;
      setDir('back');
      setNavKey(k => k + 1);
      return prev.slice(0, -1);
    });
  }, []);

  const replace = React.useCallback((screen, params = {}) => {
    setStack(prev => [...prev.slice(0, -1), { screen, params }]);
    setNavKey(k => k + 1);
  }, []);

  const current = stack[stack.length - 1];

  React.useEffect(() => { window.__navigate = navigate; window.__goBack = goBack; }, [navigate, goBack]);

  return (
    <NavContext.Provider value={{ navigate, goBack, replace, current, stack, direction }}>
      {children}
    </NavContext.Provider>
  );
}

// ─── THEME PROVIDER ──────────────────────────────────────────
function ThemeProvider({ children }) {
  const [dark, setDark] = React.useState(false);
  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── SCREEN ROUTER ───────────────────────────────────────────
const SCREENS = {
  // V1
  splash:       () => window.SplashScreen,
  onboarding:   () => window.OnboardingScreen,
  login:        () => window.LoginScreen,
  register:     () => window.RegisterScreen,
  'forgot-password': () => window.ForgotPasswordScreen,
  'otp-verify':      () => window.OtpVerifyScreen,
  'reset-password':  () => window.ResetPasswordScreen,
  'auth-success':    () => window.AuthSuccessScreen,
  home:         () => window.HomeScreen,
  pdp:          () => window.ProductDetailsScreen,
  cart:         () => window.CartScreen,
  checkout:     () => window.CheckoutScreen,
  tracking:     () => window.TrackingScreen,
  wishlist:     () => window.WishlistScreen,
  profile:      () => window.ProfileScreen,
  chat:         () => window.ChatScreen,
  // V2 — Seller
  'become-seller':  () => window.BecomeSellerScreen,
  'kyc-doc':        () => window.KycDocScreen,
  'kyc-back':       () => window.KycBackScreen,
  'kyc-selfie':     () => window.KycSelfieScreen,
  'kyc-success':    () => window.KycSuccessScreen,
  'seller-home':    () => window.SellerDashboardScreen,
  'seller-orders':  () => window.SellerOrdersScreen,
  'shop-customize': () => window.ShopCustomizeScreen,
  // V2 — CJ Import
  'cj-connect':     () => window.CjConnectScreen,
  'cj-search':      () => window.CjSearchScreen,
  'cj-publish':     () => window.CjPublishScreen,
  // V2 — Admin
  'admin':          () => window.AdminDashboardScreen,
  'admin-kyc':      () => window.AdminKycScreen,
  'admin-banners':  () => window.AdminBannersScreen,
  // Notifications + Messages
  'notifications':  () => window.NotificationsScreen,
  'messages-list':  () => window.MessagesListScreen,
  'category':       () => window.CategoryScreen,
};

function ScreenRouter() {
  const { current, navKey, direction } = useNav();
  const { screen, params } = current;
  const Screen = (SCREENS[screen] || SCREENS.home)();
  const anim   = direction === 'back' ? 'slideFromLeft' : 'slideFromRight';

  return (
    <div key={navKey} style={{ position:'absolute', inset:0, animation:`${anim} 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both` }}>
      <Screen params={params || {}} />
    </div>
  );
}

// ─── CHAT SCREEN (real Supabase messaging) ───────────────────
function ChatScreen({ params = {} }) {
  const { goBack } = useNav();
  const [messages, setMessages]  = React.useState([]);
  const [input, setInput]        = React.useState('');
  const [sending, setSending]    = React.useState(false);
  const [currentUser, setUser]   = React.useState(null);
  const scrollRef                = React.useRef(null);

  const convId   = params.conversationId ?? 'demo-conv';
  const shopName = params.shopName ?? 'luna.studio';

  React.useEffect(() => {
    sbGetUser().then(u => setUser(u));
    sbGetMessages(convId).then(({ data }) => {
      if (data?.length) setMessages(data);
      else setMessages([
        { id:'dm1', sender_id:'seller', content:"Bonjour ! Oui ce modèle est disponible. Autre question ?", created_at: new Date(Date.now()-3600000).toISOString() },
        { id:'dm2', sender_id:'buyer',  content:"Vous l'avez en olive foncé ?", created_at: new Date(Date.now()-1800000).toISOString() },
      ]);
    });
    const unsub = sbSubscribeToMessages(convId, msg => {
      setMessages(prev => [...prev, msg]);
    });
    return unsub;
  }, [convId]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    const tempMsg = { id: 'tmp-' + Date.now(), sender_id: currentUser?.id ?? 'buyer', content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    const { data } = await sbSendMessage(convId, currentUser?.id ?? 'buyer', content);
    if (data) setMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m));
    setSending(false);
  }

  const myId = currentUser?.id ?? 'buyer';

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}` }}>
        <NavBar title={shopName} onBack={goBack}
          right={<div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:8, height:8, borderRadius:9999, background:C.success }} /><span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.success, fontWeight:500 }}>En ligne</span></div>}
        />
      </div>
      {/* Safety banner */}
      <div style={{ margin:'10px 16px 0', padding:'10px 14px', background:'#FFFBEB', borderRadius:10, border:`1px solid #F59E0B`, display:'flex', gap:8, alignItems:'flex-start' }}>
        <Icon name="zap" size={14} color="#D97706" style={{ marginTop:1, flexShrink:0 }} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#92400E', lineHeight:1.4 }}>Restez sur clorivo. Ne payez jamais en dehors de la plateforme.</span>
      </div>
      {/* Messages */}
      <div ref={scrollRef} style={{ flex:1, padding:'14px 16px', overflowY:'auto', display:'flex', flexDirection:'column', gap:10, paddingBottom:20 }}>
        {messages.map((msg, i) => {
          const isMine = msg.sender_id === myId;
          return (
            <div key={msg.id ?? i} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', background: isMine ? C.primary : C.white, borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding:'10px 14px', maxWidth:'78%', border: isMine ? 'none' : `1px solid ${C.hairline}` }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color: isMine ? '#fff' : C.ink, lineHeight:1.4 }}>{msg.content}</span>
            </div>
          );
        })}
      </div>
      {/* Input */}
      <div style={{ padding:'10px 16px 28px', background:C.white, borderTop:`1px solid ${C.hairline}`, display:'flex', gap:8, alignItems:'center' }}>
        <div style={{ flex:1, minHeight:42, border:`1.5px solid ${C.hairline}`, borderRadius:12, display:'flex', alignItems:'center', padding:'0 14px', background:C.paper }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Écrivez un message…"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}
          />
        </div>
        <button onClick={handleSend} disabled={!input.trim() || sending} style={{ width:40, height:40, borderRadius:10, background: input.trim() ? C.primary : C.hairline, border:'none', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>
          <Icon name="arrowLeft" size={18} color="#fff" style={{ transform:'rotate(180deg)' }} />
        </button>
      </div>
    </div>
  );
}
window.ChatScreen = ChatScreen;

// ─── MAIN APP ─────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <NavProvider>
        <AppInner />
      </NavProvider>
    </ThemeProvider>
  );
}

function AppInner() {
  const { dark } = useTheme();

  return (
    <div className={`clorivo-frame${dark ? ' dark' : ''}`} style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', background: dark ? '#0F0C1E' : C.paper }}>
      <DesktopNav />
      <div style={{ flex:1, position:'relative' }}>
        <ScreenRouter />
      </div>
    </div>
  );
}

// Render
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
