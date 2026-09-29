// tokens.jsx — Clorivo Design System · "Premium Calme"
// Loaded first — exports everything to window

const C = {
  primary:     '#6C4DFF',
  primaryDeep: '#4F36CC',
  primarySoft: '#F1ECFF',
  ink:         '#0E0B1F',
  mute:        '#6B6880',
  hairline:    '#E8E6F0',
  paper:       '#FBFAFC',
  white:       '#FFFFFF',
  success:     '#1F8A5B',
  danger:      '#D14343',
  warning:     '#C68A00',
};

// Layout constants
const STATUS_H = 0;    // no fake device status bar — real site, not a phone mockup
const HOME_H   = 8;    // small bottom breathing room (was iOS home indicator space)
const NAV_H    = 64;   // bottom tab bar (mobile only)
const DESKTOP_BP = 900; // px — viewport width at which the desktop layout kicks in

// ─── RESPONSIVE HELPER ───────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(
    typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BP
  );
  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BP}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener ? mq.addEventListener('change', update) : mq.addListener(update);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', update) : mq.removeListener(update);
    };
  }, []);
  return isDesktop;
}

// Demo product data
const PRODUCTS = [
  { id:1, title:'Ribbed Terracotta Vase · M', price:24.50, oldPrice:39, discount:37, sold:'12k sold', seller:'luna.studio', rating:4.8, reviews:2341, category:'home', label:'product photo' },
  { id:2, title:'Artisan Ceramic Mug', price:8.99, oldPrice:24, discount:65, sold:'2.1k sold', seller:'ceramix.co', rating:4.7, reviews:892, category:'home', label:'product photo' },
  { id:3, title:'Natural Linen Lampshade', price:22.00, oldPrice:58, discount:60, sold:'890 sold', seller:'maison.deco', rating:4.6, reviews:340, category:'home', label:'product photo' },
  { id:4, title:'Bamboo Oil Burner', price:15.00, oldPrice:40, discount:62, sold:'1.4k sold', seller:'nature.home', rating:4.9, reviews:1102, category:'home', label:'product photo' },
  { id:5, title:'Natural Canvas Tote Bag', price:14.50, seller:'atelier.l', rating:4.5, reviews:234, category:'fashion', label:'product photo' },
  { id:6, title:'Washed Linen Apron · oat', price:28.00, seller:'slowthread', rating:4.8, reviews:567, category:'fashion', label:'product photo' },
  { id:7, title:'Beeswax Lavender Candle', price:11.00, seller:'waxcraft', rating:4.7, reviews:445, category:'home', label:'product photo' },
  { id:8, title:'Terracotta Velvet Cushion', price:32.00, oldPrice:48, discount:33, seller:'softroom', rating:4.6, reviews:189, category:'home', label:'product photo' },
  { id:9, title:'Gold Steel Oval Sunglasses', price:18.00, oldPrice:45, discount:60, sold:'3.2k sold', seller:'studio.vue', rating:4.4, reviews:678, category:'fashion', label:'product photo' },
  { id:10, title:'Marble & Brass Table Lamp', price:54.00, oldPrice:89, discount:39, seller:'lux.home', rating:4.9, reviews:312, category:'home', label:'product photo' },
];

// Cart state (shared across screens via window)
window.CART_ITEMS = window.CART_ITEMS || [
  { product: PRODUCTS[0], qty: 1, variant: 'M · terracotta', seller: 'luna.studio' },
  { product: PRODUCTS[6], qty: 2, variant: 'lavender', seller: 'waxcraft' },
];

// Icons — Lucide-compatible (24×24 viewBox, stroke paths)
const ICONS = {
  home:         ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  search:       ['M21 21l-4.35-4.35','M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z'],
  plus:         ['M12 5v14M5 12h14'],
  heart:        ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  heartFill:    ['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'],
  user:         ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  bell:         ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
  cart:         ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z','M3 6h18','M16 10a4 4 0 0 1-8 0'],
  arrowLeft:    ['M19 12H5','M12 19l-7-7 7-7'],
  chevronRight: ['M9 18l6-6-6-6'],
  chevronLeft:  ['M15 18l-6-6 6-6'],
  share:        ['M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98','M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z','M9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z','M21 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  message:      ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  eye:          ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z','M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  eyeOff:       ['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24','M1 1l22 22'],
  check:        ['M20 6L9 17l-5-5'],
  checkCircle:  ['M22 11.08V12a10 10 0 1 1-5.93-9.14','M22 4L12 14.01l-3-3'],
  x:            ['M18 6 6 18','M6 6l12 12'],
  minus:        ['M5 12h14'],
  mapPin:       ['M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z','M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  truck:        ['M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11v12','M9 17h6','M9 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0z','M20 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0z','M14 3h5l2 4v5h-7V3z'],
  package:      ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z','M3.27 6.96 12 12.01l8.73-5.05','M12 22.08V12'],
  star:         ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  creditCard:   ['M1 4h22v16H1z','M1 10h22'],
  settings:     ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  help:         ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3','M12 17h.01'],
  zap:          ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  store:        ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M9 22V12h6v10'],
  barChart:     ['M18 20V10','M12 20V4','M6 20v-6'],
  camera:       ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z','M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  tag:          ['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z','M7 7h.01'],
  grid:           ['M3 3h7v7H3z','M14 3h7v7h-7z','M14 14h7v7h-7z','M3 14h7v7H3z'],
  messageSquare:  ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  shoppingBag:    ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z','M3 6h18','M16 10a4 4 0 0 1-8 0'],
  lock:         ['M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z','M7 11V7a5 5 0 0 1 10 0v4'],
  logOut:       ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4','M16 17l5-5-5-5','M21 12H9'],
  mail:         ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z','M22 6l-10 7L2 6'],
  sliders:      ['M3 4h18l-7 8v6l-4 2v-8z'],
  list:         ['M8 6h13','M8 12h13','M8 18h13','M3 6h.01','M3 12h.01','M3 18h.01'],
  briefcase:    ['M20 7h-3V5.5A2.5 2.5 0 0 0 14.5 3h-5A2.5 2.5 0 0 0 7 5.5V7H4a1 1 0 0 0-1 1v3a1 1 0 0 0 .55.89l8 4a1 1 0 0 0 .9 0l8-4A1 1 0 0 0 21 11V8a1 1 0 0 0-1-1z','M9 5.5A.5.5 0 0 1 9.5 5h5a.5.5 0 0 1 .5.5V7H9z','M3 13.19V19a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5.81'],
  utensils:     ['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2','M7 2v20','M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7'],
};

// Icon component
function Icon({ name, size = 20, color = 'currentColor', sw = 1.5, filled = false, style = {} }) {
  const paths = ICONS[name] || [];
  const pathArr = typeof paths === 'string' ? [paths] : paths;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block', ...style }}>
      {pathArr.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// Contexts
const NavContext  = React.createContext(null);
const ThemeContext = React.createContext({ dark: false });
function useNav()   { return React.useContext(NavContext); }
function useTheme() { return React.useContext(ThemeContext); }

Object.assign(window, {
  C, PRODUCTS, ICONS, Icon,
  STATUS_H, HOME_H, NAV_H, DESKTOP_BP, useIsDesktop,
  NavContext, ThemeContext, useNav, useTheme,
});
