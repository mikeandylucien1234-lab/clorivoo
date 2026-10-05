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

// Product catalog — empty until added via Admin > Products
const PRODUCTS = [];

// Cart state (shared across screens via window)
window.CART_ITEMS = window.CART_ITEMS || [];

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
  wallet:       ['M21 12V7H5a2 2 0 0 1 0-4h14v4','M3 5v14a2 2 0 0 0 2 2h16v-5','M18 12a2 2 0 0 0 0 4h4v-4z'],
  shield:       ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'],
  edit:         ['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7','M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'],
  trash:        ['M3 6h18','M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2','M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6','M10 11v6','M14 11v6'],
  alertTriangle:['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z','M12 9v4','M12 17h.01'],
  xCircle:      ['M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z','M15 9l-6 6','M9 9l6 6'],
  refreshCw:    ['M23 4v6h-6','M1 20v-6h6','M3.51 9a9 9 0 0 1 14.85-3.36L23 10','M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  headphones:   ['M3 18v-6a9 9 0 0 1 18 0v6','M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z','M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z'],
  copy:         ['M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z','M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  externalLink: ['M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6','M15 3h6v6','M10 14 21 3'],
  calendar:     ['M3 4h18v18H3z','M16 2v4','M8 2v4','M3 10h18'],
  archive:      ['M3 3h18v4H3z','M5 7v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7','M10 12h4'],
  crown:        ['M5 17h14l1-9-5 3-3-5-3 5-5-3z','M5 20h14'],
  gift:         ['M20 12v9H4v-9','M2 7h20v5H2z','M12 22V7','M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z','M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z'],
  users:        ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  download:     ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4','M7 10l5 5 5-5','M12 15V3'],
  monitor:      ['M2 3h20v14H2z','M8 21h8','M12 17v4'],
  globe:        ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z','M2 12h20','M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  dollarSign:   ['M12 1v22','M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  sun:          ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z','M12 1v2','M12 21v2','M4.22 4.22l1.42 1.42','M18.36 18.36l1.42 1.42','M1 12h2','M21 12h2','M4.22 19.78l1.42-1.42','M18.36 5.64l1.42-1.42'],
  moon:         ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  fileText:     ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z','M14 2v6h6','M16 13H8','M16 17H8','M10 9H8'],
  lifeBuoy:     ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z','M4.93 4.93l4.24 4.24','M14.83 14.83l4.24 4.24','M14.83 9.17l4.24-4.24','M9.17 14.83l-4.24 4.24'],
  clock:        ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 6v6l4 2'],
  info:         ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 16v-4','M12 8h.01'],
  smartphone:   ['M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z','M12 18h.01'],
  moreHorizontal: ['M5 12h.01','M12 12h.01','M19 12h.01'],
  thumbsUp:     ['M7 10v12','M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h.5a2.5 2.5 0 0 1 2.5 2.5z'],
  volume2:      ['M11 5 6 9H2v6h4l5 4z','M19.07 4.93a10 10 0 0 1 0 14.14','M15.54 8.46a5 5 0 0 1 0 7.07'],
  phone:        ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'],
  mic:          ['M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v4','M8 23h8'],
  image:        ['M3 3h18v18H3z','M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z','M21 15l-5-5L5 21'],
  paperclip:    ['M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'],
  smile:        ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M8 14s1.5 2 4 2 4-2 4-2','M9 9h.01','M15 9h.01'],
  flag:         ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z','M4 22V15'],
  ban:          ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M4.93 4.93l14.14 14.14'],
  send:         ['M22 2 11 13','M22 2l-7 20-4-9-9-4z'],
  cornerUpLeft: ['M9 17 4 12l5-5','M20 18v-2a4 4 0 0 0-4-4H4'],
  pin:          ['M12 17v5','M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1z'],
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
