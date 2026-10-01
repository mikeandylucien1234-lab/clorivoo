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
  checkout:          () => window.CheckoutAddressScreen,
  'checkout-payment':() => window.CheckoutPaymentScreen,
  'order-confirmation': () => window.OrderConfirmationScreen,
  'payment-failed':  () => window.PaymentFailedScreen,
  tracking:     () => window.OrdersListScreen,
  'order-detail': () => window.OrderDetailScreen,
  wishlist:     () => window.WishlistScreen,
  'wishlist-shared':        () => window.WishlistSharedScreen,
  'wishlist-notifications': () => window.WishlistNotificationsScreen,
  'wishlist-alerts':        () => window.WishlistAlertsScreen,
  profile:      () => window.ProfileScreen,
  chat:         () => window.ChatScreen,
  // V2 — Seller
  'seller-welcome':      () => window.SellerWelcomeScreen,
  'become-seller':       () => window.BecomeSellerScreen,
  'kyc-verify-identity': () => window.KycVerifyIdentityScreen,
  'kyc-doc':             () => window.KycDocScreen,
  'kyc-selfie-intro':    () => window.KycSelfieIntroScreen,
  'kyc-selfie':          () => window.KycSelfieScreen,
  'kyc-review':          () => window.KycReviewScreen,
  'kyc-success':         () => window.KycSuccessScreen,
  'store':          () => window.SellerStoreScreen,
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
  'notification-detail':   () => window.NotificationDetailScreen,
  'notification-settings': () => window.NotificationSettingsScreen,
  'messages-list':  () => window.MessagesListScreen,
  'categories':     () => window.CategoriesScreen,
  'search':         () => window.SearchScreen,
  'category':       () => window.CategoryScreen,
  // V2 — Account & Profile
  'personal-info':    () => window.PersonalInfoScreen,
  'edit-profile':     () => window.EditProfileScreen,
  'addresses':        () => window.AddressesScreen,
  'payment-methods':  () => window.PaymentMethodsScreen,
  'wallet':           () => window.WalletScreen,
  'settings':         () => window.SettingsScreen,
  'security':         () => window.SecurityScreen,
  'support':          () => window.SupportTicketsScreen,
  'premium':          () => window.PremiumScreen,
  'invite':           () => window.InviteFriendsScreen,
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
