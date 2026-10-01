// screen-auth.jsx — Splash · Welcome · Login · Sign Up · Forgot Password · OTP · Reset Password · Success

// ─── SPLASH ──────────────────────────────────────────────────
const SPLASH_STAGES = [
  { at:0,  text:'Initializing CLORIVO…' },
  { at:20, text:'Checking your session…' },
  { at:42, text:'Syncing cart & wishlist…' },
  { at:64, text:'Loading preferences…' },
  { at:84, text:'Connecting services…' },
  { at:96, text:'Almost there…' },
];

// Placeholder hooks for a real deployment — structured so a backend can
// plug in without changing the navigation flow below.
function checkMaintenanceMode() { return false; }
function checkForceUpdate() { return null; } // would return a min version string to block on

async function decideSplashDestination() {
  if (checkMaintenanceMode()) return 'onboarding'; // would be 'maintenance' with a real screen
  try {
    const session = await sbGetSession();
    if (!session) {
      let onboarded = false;
      try { onboarded = localStorage.getItem('clorivo_onboarded') === '1'; } catch (e) {}
      if (!onboarded) { try { localStorage.setItem('clorivo_onboarded', '1'); } catch (e) {} }
      return onboarded ? 'login' : 'onboarding';
    }
    const user = await sbGetUser();
    const profile = user ? await sbGetProfile(user.id) : null;
    if (profile?.role === 'admin')  return 'admin';
    if (profile?.role === 'seller') return 'seller-home';
    return 'home';
  } catch (e) {
    return 'onboarding';
  }
}

function SplashScreen() {
  const { replace } = useNav();
  const { dark, setDark } = useTheme();
  const [progress, setProgress] = React.useState(0);
  const [destination, setDestination] = React.useState(null);

  // Automatic theme detection (light/dark splash)
  React.useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      setDark(mq.matches);
    } catch (e) {}
  }, []);

  // Resolve where to go while the progress bar plays
  React.useEffect(() => {
    let alive = true;
    decideSplashDestination().then(dest => { if (alive) setDestination(dest); });
    return () => { alive = false; };
  }, []);

  // Animated progress (percentage-driven loading)
  React.useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => Math.min(100, p + 2 + Math.random() * 3));
    }, 55);
    return () => clearInterval(t);
  }, []);

  // Navigate once both the animation finished AND we know the destination
  React.useEffect(() => {
    if (progress >= 100 && destination) {
      const t = setTimeout(() => replace(destination), 250);
      return () => clearTimeout(t);
    }
  }, [progress, destination]);

  const stageText = [...SPLASH_STAGES].reverse().find(s => progress >= s.at)?.text ?? SPLASH_STAGES[0].text;
  const bg = dark ? '#0F0C1E' : 'linear-gradient(180deg, #FBFAFF 0%, #F3EFFF 100%)';
  const ink = dark ? '#EDE9F7' : C.ink;
  const mute = dark ? '#9088A8' : C.mute;
  const cardBg = dark ? '#1A1630' : C.white;

  return (
    <div style={{ position:'absolute', inset:0, background:bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      <StatusBar />

      {/* Soft decorative blobs */}
      <div style={{ position:'absolute', top:-60, right:-60, width:260, height:260, borderRadius:9999, background: dark ? 'radial-gradient(circle, rgba(123,95,255,0.18) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(108,77,255,0.14) 0%, transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:-80, left:-70, width:240, height:240, borderRadius:9999, background: dark ? 'radial-gradient(circle, rgba(123,95,255,0.14) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(138,107,255,0.12) 0%, transparent 70%)' }} />

      <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', padding:'0 32px', maxWidth:360 }}>

        {/* Logo mark: padlock + heart, fade-scale-in with a soft glow pulse */}
        <div style={{ position:'relative', width:110, height:110, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, animation:'splashLogoIn 0.7s cubic-bezier(0.25,0.46,0.45,0.94) both' }}>
          <div style={{ position:'absolute', inset:0, borderRadius:9999, background:`radial-gradient(circle, ${C.primary}55 0%, transparent 72%)`, animation:'splashGlow 2.4s ease-in-out infinite' }} />
          <Icon name="lock" size={88} color={C.primary} filled sw={1} style={{ position:'relative' }} />
          <Icon name="heartFill" size={26} color="#fff" filled style={{ position:'absolute', top:'58%', left:'50%', transform:'translate(-50%,-50%)' }} />
        </div>

        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:34, color:C.primary, letterSpacing:'-0.03em', marginBottom:6, animation:'fadeUp 0.6s ease 0.15s both' }}>CLORIVO</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:500, fontSize:14, color:mute, marginBottom:36, animation:'fadeUp 0.6s ease 0.25s both' }}>Shop. Love. Live Better.</div>

        {/* Hero illustration */}
        <div style={{ position:'relative', width:260, height:200, marginBottom:30, animation:'fadeUp 0.6s ease 0.35s both' }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} style={{ position:'absolute', width:6, height:6, borderRadius:9999, background:['#F59E0B','#DB2777','#6C4DFF','#1F8A5B'][i%4], opacity:0.6, top:`${(i*29)%85}%`, left:`${(i*41)%90}%`, animation:`floatY ${2.6+(i%3)*0.4}s ease-in-out infinite ${i*0.2}s` }} />
          ))}

          <div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', width:34, height:30, borderRadius:'6px 6px 10px 10px', background:'#8A6BFF', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3s ease-in-out infinite' }}>
            <div style={{ width:16, height:4, borderRadius:9999, background:'rgba(255,255,255,0.7)' }} />
          </div>

          <div style={{ position:'absolute', top:50, left:28, width:30, height:42, borderRadius:8, background:'#2B2740', boxShadow:'0 6px 14px rgba(14,11,31,0.2)', animation:'floatY 3.4s ease-in-out infinite 0.3s' }}>
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="smartphone" size={14} color="rgba(255,255,255,0.5)" />
            </div>
          </div>

          <div style={{ position:'absolute', top:42, right:26, animation:'floatY 3.2s ease-in-out infinite 0.5s' }}>
            <Icon name="headphones" size={38} color="#1A1420" />
          </div>

          <div style={{ position:'absolute', top:14, left:40, width:20, height:20, background:'#F59E0B', borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(245,158,11,0.35)', animation:'floatY 2.8s ease-in-out infinite 0.1s' }}>
            <Icon name="tag" size={11} color="#fff" />
          </div>
          <div style={{ position:'absolute', top:18, right:50, width:28, height:28, background:'#fff', borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 14px rgba(14,11,31,0.12)', animation:'floatY 3.1s ease-in-out infinite 0.4s' }}>
            <Icon name="heartFill" size={14} color={C.primary} filled />
          </div>

          <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', width:160, height:110, borderRadius:16, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 20px 40px rgba(108,77,255,0.3)', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:10 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)', letterSpacing:'0.04em' }}>CLORIVO</span>
          </div>

          <div style={{ position:'absolute', bottom:0, left:6, width:42, height:34, background:'#C98D5A', borderRadius:4, boxShadow:'0 6px 12px rgba(14,11,31,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="lock" size={14} color="rgba(0,0,0,0.3)" />
          </div>

          <div style={{ position:'absolute', bottom:2, right:10, width:26, height:30, animation:'floatY 3.6s ease-in-out infinite 0.6s' }}>
            <div style={{ width:'100%', height:20, background:'#1F8A5B', borderRadius:'10px 10px 2px 2px' }} />
            <div style={{ width:22, height:14, background:'#fff', borderRadius:6, margin:'-4px auto 0' }} />
          </div>
        </div>

        <div style={{ textAlign:'center', marginBottom:28, animation:'fadeUp 0.6s ease 0.45s both' }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:ink }}>Everything you love, </span>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:800, color:C.primary }}>all in one place.</span>
        </div>

        {/* Progress bar + dynamic loading text */}
        <div style={{ width:220, animation:'fadeUp 0.6s ease 0.55s both' }}>
          <div style={{ width:'100%', height:6, borderRadius:9999, background: dark ? '#252138' : C.hairline, overflow:'hidden' }}>
            <div style={{ width:`${progress}%`, height:'100%', borderRadius:9999, background:`linear-gradient(90deg, ${C.primary} 0%, #8A6BFF 100%)`, transition:'width 0.15s linear' }} />
          </div>
          <div style={{ textAlign:'center', marginTop:10, fontFamily:"'Inter',sans-serif", fontSize:12.5, color:mute }}>{stageText}</div>
        </div>
      </div>
    </div>
  );
}

// ─── SHARED DECORATIVE ART (logo + illustration + purple blobs) ─
function AuthArt({ compact }) {
  const size = compact ? 150 : 230;
  return (
    <div style={{ position:'relative', width:'100%', height:size, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {/* Purple abstract blobs */}
      <div style={{ position:'absolute', top:-30, left:-40, width:160, height:160, borderRadius:9999, background:'radial-gradient(circle, rgba(108,77,255,0.16) 0%, transparent 70%)' }} />
      <div style={{ position:'absolute', bottom:-40, right:-30, width:180, height:180, borderRadius:9999, background:'radial-gradient(circle, rgba(138,107,255,0.14) 0%, transparent 70%)' }} />

      {!compact && (
        <>
          {/* Floating icon badges */}
          <div style={{ position:'absolute', top:6, left:'14%', width:38, height:38, borderRadius:12, background:C.white, boxShadow:'0 6px 18px rgba(108,77,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.2s ease-in-out infinite' }}>
            <Icon name="zap" size={17} color={C.primary} />
          </div>
          <div style={{ position:'absolute', top:26, right:'12%', width:34, height:34, borderRadius:9999, background:'#FFE9F0', boxShadow:'0 6px 18px rgba(219,39,119,0.15)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.6s ease-in-out infinite 0.4s' }}>
            <Icon name="heartFill" size={15} color="#DB2777" filled />
          </div>
          <div style={{ position:'absolute', bottom:20, left:'10%', width:36, height:36, borderRadius:12, background:C.white, boxShadow:'0 6px 18px rgba(108,77,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.4s ease-in-out infinite 0.2s' }}>
            <Icon name="tag" size={16} color="#D97706" />
          </div>
        </>
      )}

      {/* Central shopping cart mark */}
      <div style={{ width: compact ? 90 : 128, height: compact ? 90 : 128, borderRadius:9999, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 16px 40px rgba(108,77,255,0.32)' }}>
        <Icon name="cart" size={compact ? 42 : 58} color="#fff" sw={1.8} />
      </div>
    </div>
  );
}

// ─── AUTH PAGE SHELL (logo, back/skip, desktop centering) ────
function AuthShell({ children, onBack, topRight, isDesktop }) {
  return (
    <div style={{ position:'absolute', inset:0, background: isDesktop ? C.paper : C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop: STATUS_H, flex:1, overflowY:'auto', display:'flex', flexDirection:'column', alignItems: isDesktop ? 'center' : 'stretch' }}>
        <div style={{ width:'100%', maxWidth: isDesktop ? 440 : undefined, background: isDesktop ? C.white : undefined, borderRadius: isDesktop ? 20 : undefined, boxShadow: isDesktop ? '0 4px 32px rgba(14,11,31,0.08)' : undefined, margin: isDesktop ? '40px 0' : undefined }}>
          {(onBack || topRight) && (
            <div style={{ padding:'16px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              {onBack ? (
                <button onClick={onBack} style={{ border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:C.mute, padding:6, margin:-6 }}>
                  <Icon name="arrowLeft" size={20} color={C.mute} />
                </button>
              ) : <span />}
              {topRight}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── ONBOARDING ILLUSTRATIONS (one per slide) ────────────────
function OnboardingArtWelcome() {
  const { dark } = useTheme();
  return (
    <div style={{ position:'relative', width:220, height:180 }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position:'absolute', width:6, height:6, borderRadius:9999, background:['#F59E0B','#DB2777','#6C4DFF','#1F8A5B'][i%4], opacity:0.6, top:`${(i*27)%80}%`, left:`${(i*37)%88}%`, animation:`floatY ${2.6+(i%3)*0.4}s ease-in-out infinite ${i*0.2}s` }} />
      ))}
      <div style={{ position:'absolute', top:4, left:'50%', transform:'translateX(-50%)', animation:'floatY 3.2s ease-in-out infinite 0.5s' }}>
        <Icon name="headphones" size={42} color={dark ? '#EDE9F7' : '#1A1420'} />
      </div>
      <div style={{ position:'absolute', top:26, left:34, width:34, height:48, borderRadius:9, background:'#2B2740', boxShadow:'0 8px 16px rgba(14,11,31,0.22)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.4s ease-in-out infinite 0.2s' }}>
        <Icon name="smartphone" size={16} color="rgba(255,255,255,0.5)" />
      </div>
      <div style={{ position:'absolute', top:14, right:32, width:24, height:24, background:'#F59E0B', borderRadius:9999, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(245,158,11,0.35)', animation:'floatY 2.8s ease-in-out infinite 0.1s' }}>
        <Icon name="tag" size={12} color="#fff" />
      </div>
      <div style={{ position:'absolute', bottom:34, left:'50%', transform:'translateX(-50%)', width:140, height:96, borderRadius:16, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 20px 36px rgba(108,77,255,0.3)', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:10 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:800, color:'rgba(255,255,255,0.9)' }}>CLORIVO</span>
      </div>
      <div style={{ position:'absolute', bottom:22, left:4, width:38, height:30, background:'#C98D5A', borderRadius:4, boxShadow:'0 6px 12px rgba(14,11,31,0.15)' }} />
      <div style={{ position:'absolute', bottom:20, right:6, animation:'floatY 3.6s ease-in-out infinite 0.4s' }}>
        <div style={{ width:22, height:18, background:'#1F8A5B', borderRadius:'10px 10px 2px 2px' }} />
        <div style={{ width:18, height:12, background:'#fff', borderRadius:5, margin:'-3px auto 0' }} />
      </div>
    </div>
  );
}
function OnboardingArtDeals() {
  const { dark } = useTheme();
  return (
    <div style={{ position:'relative', width:240, height:220, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', width:170, height:170, borderRadius:9999, background: dark ? '#1E1535' : C.primarySoft }} />
      <div style={{ position:'relative', width:150, height:210, borderRadius:24, background:'#15111F', padding:6, boxShadow: dark ? '0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.5)' : '0 24px 48px rgba(14,11,31,0.3)', animation:'floatY 4s ease-in-out infinite' }}>
        <div style={{ width:'100%', height:'100%', borderRadius:18, background:C.white, overflow:'hidden', padding:7, display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4, background:C.paper, borderRadius:7, padding:'3px 7px', flexShrink:0 }}>
            <Icon name="search" size={9} color={C.mute} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:7, color:C.mute }}>Search products</span>
          </div>
          <div style={{ borderRadius:9, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, padding:'7px 9px', flexShrink:0 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, color:'#fff' }}>Mega Deals</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:6.5, color:'rgba(255,255,255,0.85)', marginBottom:3 }}>Up to 50% OFF</div>
            <div style={{ display:'inline-block', background:'#fff', borderRadius:9999, padding:'2px 7px', fontFamily:"'Inter',sans-serif", fontSize:6, fontWeight:700, color:C.primary }}>Shop Now</div>
          </div>
          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
            {['#F0ECFD','#FDF0EC','#ECF4FD','#ECFDF4'].map((c,i) => (
              <div key={i} style={{ flex:1, height:16, borderRadius:7, background:c }} />
            ))}
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:7, fontWeight:700, color:C.ink, flexShrink:0 }}>Flash Deals</div>
          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
            {[0,1].map(i => (
              <div key={i} style={{ flex:1, borderRadius:7, background:C.paper, padding:4 }}>
                <div style={{ width:'100%', height:34, borderRadius:5, background: i===0?'#E4DCFF':'#D4E4F9', marginBottom:3 }} />
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:6.5, fontWeight:700, color:C.primary }}>${i===0?'89.99':'199.00'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ position:'absolute', top:10, left:4, width:30, height:30, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 16px rgba(108,77,255,0.3)', animation:'floatY 3s ease-in-out infinite 0.2s' }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:800, color:'#fff' }}>%</span>
      </div>
      <div style={{ position:'absolute', top:30, right:0, width:28, height:28, borderRadius:10, background:C.white, boxShadow:'0 8px 16px rgba(14,11,31,0.12)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.4s ease-in-out infinite 0.4s' }}>
        <Icon name="creditCard" size={13} color={C.primary} />
      </div>
      <div style={{ position:'absolute', bottom:34, right:-4, width:30, height:30, borderRadius:10, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 16px rgba(108,77,255,0.3)', animation:'floatY 3.2s ease-in-out infinite 0.1s' }}>
        <Icon name="cart" size={14} color="#fff" />
      </div>
    </div>
  );
}
function OnboardingArtSecurity() {
  const { dark } = useTheme();
  return (
    <div style={{ position:'relative', width:220, height:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', width:170, height:170, borderRadius:9999, background: dark ? '#1E1535' : '#F0ECFD' }} />
      <div style={{ position:'absolute', bottom:8, width:130, height:28, borderRadius:9999, background: dark ? '#2A2248' : '#DCD3FA' }} />
      <div style={{ position:'relative', animation:'floatY 3.6s ease-in-out infinite' }}>
        <Icon name="shield" size={118} color={C.primary} filled sw={1} />
        <Icon name="lock" size={38} color="#fff" style={{ position:'absolute', top:'38%', left:'50%', transform:'translate(-50%,-50%)' }} />
      </div>
      <div style={{ position:'absolute', top:14, right:8, width:30, height:30, borderRadius:10, background:C.white, boxShadow:'0 8px 16px rgba(14,11,31,0.12)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3s ease-in-out infinite 0.2s' }}>
        <Icon name="creditCard" size={14} color={C.primary} />
      </div>
      <div style={{ position:'absolute', top:4, left:6, width:30, height:30, borderRadius:10, background:C.white, boxShadow:'0 8px 16px rgba(14,11,31,0.12)', display:'flex', alignItems:'center', justifyContent:'center', animation:'floatY 3.3s ease-in-out infinite 0.4s' }}>
        <Icon name="messageSquare" size={14} color={C.primary} />
      </div>
      <div style={{ position:'absolute', bottom:40, left:0, width:14, height:14, borderRadius:9999, background:'#F59E0B', opacity:0.7, animation:'floatY 2.6s ease-in-out infinite 0.1s' }} />
      <div style={{ position:'absolute', top:50, right:-4, width:10, height:10, borderRadius:9999, background:'#DB2777', opacity:0.6, animation:'floatY 2.9s ease-in-out infinite 0.3s' }} />
    </div>
  );
}

const ONBOARDING_SLIDES = [
  {
    key:'welcome', art:OnboardingArtWelcome, logo:true,
    title:'Everything you love,', titleAccent:'all in one place.',
    subtitle:'Discover millions of products from trusted sellers, all in one app.',
    cta:'Get Started',
  },
  {
    key:'deals', art:OnboardingArtDeals,
    title:'Best deals,', titleAccent:'every day.',
    subtitle:'Enjoy exclusive offers, flash sales, and discounts made just for you.',
    cta:'Next',
  },
  {
    key:'security', art:OnboardingArtSecurity,
    title:'Safe. Secure.', titleAccent:'Worry-free shopping.',
    subtitle:'Your security is our priority. Shop with confidence every time.',
    cta:'Start Shopping',
  },
];

function markOnboarded() { try { localStorage.setItem('clorivo_onboarded', '1'); } catch (e) {} }

// ─── ONBOARDING (3-slide carousel) ────────────────────────────
function OnboardingScreen() {
  const { navigate } = useNav();
  const { dark } = useTheme();
  const isDesktop = useIsDesktop();
  const [index, setIndex] = React.useState(0);
  const drag = React.useRef({ startX:0, dragging:false });
  const [dragX, setDragX] = React.useState(0);

  function finish() {
    markOnboarded();
    try {
      // Prepare sensible personalization defaults — real preference
      // screens live in Settings; onboarding just seeds them.
      if (!localStorage.getItem('clorivo_prefs')) {
        localStorage.setItem('clorivo_prefs', JSON.stringify({ language:'English', currency:'USD', notifications:true }));
      }
    } catch (e) {}
    navigate('register');
  }
  function handleCta() {
    if (index < ONBOARDING_SLIDES.length - 1) setIndex(i => i + 1);
    else finish();
  }
  function handleSkip() { markOnboarded(); navigate('login'); }

  function onPointerDown(e) { drag.current = { startX: e.clientX, dragging:true }; }
  function onPointerMove(e) {
    if (!drag.current.dragging) return;
    setDragX(e.clientX - drag.current.startX);
  }
  function onPointerUpEnd() {
    if (!drag.current.dragging) return;
    if (dragX < -60 && index < ONBOARDING_SLIDES.length - 1) setIndex(i => i + 1);
    else if (dragX > 60 && index > 0) setIndex(i => i - 1);
    setDragX(0);
    drag.current.dragging = false;
  }

  const slide = ONBOARDING_SLIDES[index];
  const bg = dark ? '#0F0C1E' : 'linear-gradient(180deg, #FBFAFF 0%, #F3EFFF 100%)';
  const ink = dark ? '#EDE9F7' : C.ink;
  const mute = dark ? '#9088A8' : C.mute;

  return (
    <div style={{ position:'absolute', inset:0, background:bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, display:'flex', justifyContent:'flex-end', padding:'14px 20px 0' }}>
        {index < ONBOARDING_SLIDES.length - 1 && (
          <button onClick={handleSkip} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:600, color:C.primary }}>Skip</button>
        )}
      </div>

      <div
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUpEnd} onPointerLeave={onPointerUpEnd}
        style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px', touchAction:'pan-y', cursor:'grab' }}
      >
        <div key={slide.key} style={{ display:'flex', flexDirection:'column', alignItems:'center', transform:`translateX(${dragX * 0.3}px)`, transition: drag.current.dragging ? 'none' : 'transform 0.2s', animation:'fadeUp 0.45s ease both', maxWidth:360, width:'100%' }}>
          {slide.logo && (
            <>
              <div style={{ position:'relative', width:76, height:76, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <Icon name="lock" size={62} color={C.primary} filled sw={1} />
                <Icon name="heartFill" size={18} color="#fff" filled style={{ position:'absolute', top:'58%', left:'50%', transform:'translate(-50%,-50%)' }} />
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:24, color:C.primary, letterSpacing:'-0.03em', marginBottom:2 }}>CLORIVO</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:mute, marginBottom:18 }}>Shop. Love. Live Better.</div>
            </>
          )}

          <slide.art />

          <div style={{ textAlign:'center', marginTop:24 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:ink, letterSpacing:'-0.02em' }}>{slide.title} </span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.primary, letterSpacing:'-0.02em' }}>{slide.titleAccent}</span>
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:mute, textAlign:'center', marginTop:8, lineHeight:1.5, maxWidth:300 }}>
            {slide.subtitle}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:20 }}>
        {ONBOARDING_SLIDES.map((s, i) => (
          <button key={s.key} onClick={() => setIndex(i)} style={{ width: i === index ? 22 : 7, height:7, borderRadius:9999, border:'none', background: i === index ? C.primary : C.hairline, cursor:'pointer', transition:'all 0.3s ease', padding:0 }} />
        ))}
      </div>

      <div style={{ padding: isDesktop ? '0 0 36px' : '0 24px 36px', maxWidth: isDesktop ? 360 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>
        <Btn variant="primary" size="lg" wide onClick={handleCta} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
          {slide.cta}
        </Btn>
        <div style={{ textAlign:'center', marginTop:14, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:mute }}>
          Already have an account? <span onClick={() => { markOnboarded(); navigate('login'); }} style={{ color:C.primary, fontWeight:700, cursor:'pointer' }}>Log in</span>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [identifier, setIdentifier] = React.useState('');
  const [pass, setPass]      = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [touched, setTouched] = React.useState(false);

  const idError   = touched && !identifier.trim() ? 'Email or phone number is required.' : '';
  const passError = touched && !pass ? 'Password is required.' : '';

  async function handleLogin() {
    setTouched(true);
    if (!identifier.trim() || !pass) return;
    setLoading(true); setErrorMsg('');
    const { error } = await sbSignIn(identifier.trim(), pass);
    setLoading(false);
    if (error) { setErrorMsg(error.message || 'Unable to sign in. Please check your credentials.'); return; }
    navigate('home');
  }

  return (
    <AuthShell
      isDesktop={isDesktop}
      onBack={goBack}
      topRight={
        <button onClick={() => navigate('register')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.primary }}>
          Sign Up
        </button>
      }
    >
      <div style={{ padding:'8px 24px 40px' }}>
        <AuthArt compact />

        <div style={{ textAlign:'center', marginTop:8, marginBottom:24 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.primary, letterSpacing:'-0.03em' }}>CLORIVO</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginTop:10 }}>Welcome back 👋</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, marginTop:4 }}>Sign in to continue</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input
            label="Email or Phone Number"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            iconLeft={<Icon name="mail" size={18} color={C.mute} />}
            error={idError}
          />
          <Input
            label="Password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            iconLeft={<Icon name="lock" size={18} color={C.mute} />}
            type="password"
            error={passError}
          />
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => navigate('forgot-password')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Forgot Password?</button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="x" size={14} color={C.danger} style={{ flexShrink:0 }} />
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop:22 }}>
          <Btn variant="primary" size="lg" wide onClick={handleLogin} disabled={loading} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            {loading ? 'Signing in…' : 'Login'}
          </Btn>
        </div>

        <SocialAuthBlock onDone={() => navigate('home')} />

        <div style={{ textAlign:'center', marginTop:24, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          Don't have an account?{' '}
          <button onClick={() => navigate('register')} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>
            Create Account
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── SOCIAL AUTH (shared by Login + Sign Up) ─────────────────
function SocialAuthBlock({ onDone }) {
  const [pressed, setPressed] = React.useState(null);

  const providers = [
    { key:'google', label:'Continue with Google', icon: (
      <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335"/><path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/><path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.95 13.04C2.43 15.98 5.48 18 9 18z" fill="#34A853"/></svg>
    ) },
    { key:'apple', label:'Continue with Apple', icon: (
      <svg width="16" height="18" viewBox="0 0 16 18" fill={C.ink}><path d="M13.53 9.52c-.02-2.38 1.94-3.52 2.03-3.58-1.1-1.62-2.82-1.84-3.44-1.87-1.46-.15-2.87.87-3.61.87-.75 0-1.9-.85-3.12-.82-1.6.02-3.07.93-3.9 2.36-1.67 2.9-.43 7.2 1.2 9.55.8 1.15 1.74 2.44 2.98 2.39 1.2-.05 1.65-.77 3.1-.77 1.44 0 1.85.77 3.11.75 1.28-.02 2.1-1.17 2.88-2.32.91-1.33 1.29-2.62 1.31-2.69-.03-.01-2.52-.97-2.54-3.87z"/><path d="M11.16 2.84c.67-.81 1.12-1.94 1-3.07-1 .04-2.17.67-2.87 1.5-.63.73-1.18 1.89-1.03 3 1.1.09 2.23-.56 2.9-1.43z"/></svg>
    ) },
    { key:'facebook', label:'Continue with Facebook', icon: (
      <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#1877F2" d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.51 3.41-3.51.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.42V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9z"/></svg>
    ) },
  ];

  async function handleProvider(key) {
    setPressed(key);
    // Real OAuth would call: await _supabase.auth.signInWithOAuth({ provider: key })
    setTimeout(() => { setPressed(null); onDone && onDone(); }, 400);
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:12, margin:'22px 0' }}>
        <Divider style={{ flex:1 }} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, whiteSpace:'nowrap' }}>or continue with</span>
        <Divider style={{ flex:1 }} />
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {providers.map(p => (
          <button key={p.key} onClick={() => handleProvider(p.key)} style={{
            height:48, border:`1.5px solid ${C.hairline}`, borderRadius:12,
            background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
            fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink,
            transform: pressed === p.key ? 'scale(0.98)' : 'scale(1)', opacity: pressed === p.key ? 0.7 : 1,
            transition:'transform 0.12s, opacity 0.12s',
          }}>
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>
    </>
  );
}

// ─── SIGN UP ──────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code:'+509', flag:'🇭🇹', name:'Haiti' },
  { code:'+1',   flag:'🇺🇸', name:'United States' },
  { code:'+1',   flag:'🇨🇦', name:'Canada' },
  { code:'+33',  flag:'🇫🇷', name:'France' },
  { code:'+44',  flag:'🇬🇧', name:'United Kingdom' },
];

function RegisterScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [name, setName]      = React.useState('');
  const [email, setEmail]    = React.useState('');
  const [countryIdx, setCountryIdx] = React.useState(0);
  const [phone, setPhone]    = React.useState('');
  const [pass, setPass]      = React.useState('');
  const [confirmPass, setConfirmPass] = React.useState('');
  const [agreed, setAgreed]  = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [showCountryPicker, setShowCountryPicker] = React.useState(false);
  const [modal, setModal] = React.useState(null); // 'terms' | 'privacy' | null

  const strength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 ? 2 : 3;
  const strengthColors = ['', C.danger, C.warning, C.success];
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];

  const [errorMsg, setErrorMsg] = React.useState('');

  const nameError    = touched && !name.trim() ? 'Full name is required.' : '';
  const emailError   = touched && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address.' : '';
  const phoneError   = touched && !phone.trim() ? 'Phone number is required.' : '';
  const passError    = touched && pass.length < 6 ? 'Password must be at least 6 characters.' : '';
  const confirmError = touched && confirmPass !== pass ? 'Passwords do not match.' : '';

  async function handleSubmit() {
    setTouched(true);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim() || pass.length < 6 || confirmPass !== pass || !agreed) return;
    setLoading(true); setErrorMsg('');
    const { error } = await sbSignUp(email, pass, name);
    setLoading(false);
    if (error) { setErrorMsg(error.message || 'Unable to create your account.'); return; }
    navigate('auth-success', { kind:'signup' });
  }

  return (
    <AuthShell
      isDesktop={isDesktop}
      onBack={goBack}
      topRight={
        <button onClick={() => navigate('login')} style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.primary }}>
          Login
        </button>
      }
    >
      <div style={{ padding:'8px 24px 40px' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:8 }}>
          <div style={{ width:64, height:64, borderRadius:9999, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 10px 28px rgba(108,77,255,0.3)', marginBottom:14 }}>
            <Icon name="plus" size={28} color="#fff" sw={2.5} />
          </div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:C.primary, letterSpacing:'-0.03em' }}>CLORIVO</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginTop:10 }}>Create your account</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginTop:4, textAlign:'center' }}>Fill in your details to get started</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:18 }}>
          <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} iconLeft={<Icon name="user" size={16} color={C.mute} />} error={nameError} />
          <Input label="Email Address" value={email} onChange={e => setEmail(e.target.value)} iconLeft={<Icon name="mail" size={18} color={C.mute} />} type="email" error={emailError} />

          {/* Phone with country code selector */}
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute }}>Phone Number</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setShowCountryPicker(s => !s)} style={{ position:'relative', height:50, minWidth:88, border:`1.5px solid ${C.hairline}`, borderRadius:12, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'0 10px', flexShrink:0 }}>
                <span style={{ fontSize:17 }}>{COUNTRY_CODES[countryIdx].flag}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink, fontWeight:500 }}>{COUNTRY_CODES[countryIdx].code}</span>
                <Icon name="chevronRight" size={13} color={C.mute} style={{ transform:'rotate(90deg)' }} />
                {showCountryPicker && (
                  <div style={{ position:'absolute', top:56, left:0, zIndex:20, background:C.white, borderRadius:12, boxShadow:'0 8px 24px rgba(14,11,31,0.14)', border:`1px solid ${C.hairline}`, overflow:'hidden', minWidth:180 }}>
                    {COUNTRY_CODES.map((c, i) => (
                      <div key={i} onClick={() => { setCountryIdx(i); setShowCountryPicker(false); }} style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: i === countryIdx ? C.primarySoft : 'transparent' }}>
                        <span style={{ fontSize:16 }}>{c.flag}</span>
                        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>{c.name}</span>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:C.mute, marginLeft:'auto' }}>{c.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
              <div style={{ flex:1, height:50, display:'flex', alignItems:'center', gap:10, border:`1.5px solid ${phoneError ? C.danger : C.hairline}`, borderRadius:12, padding:'0 14px', background:C.white }}>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" style={{ flex:1, border:'none', outline:'none', background:'transparent', fontFamily:"'Inter',sans-serif", fontSize:15, color:C.ink }} />
              </div>
            </div>
            {phoneError && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.danger }}>{phoneError}</span>}
          </div>

          <div>
            <Input label="Password" value={pass} onChange={e => setPass(e.target.value)} iconLeft={<Icon name="lock" size={18} color={C.mute} />} type="password" error={passError} />
            {pass.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= strength ? strengthColors[strength] : C.hairline, transition:'background 0.2s' }} />
                  ))}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color: strengthColors[strength], fontWeight:600, marginTop:4, display:'inline-block' }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>

          <Input label="Confirm Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} iconLeft={<Icon name="lock" size={18} color={C.mute} />} type="password" error={confirmError} />
        </div>

        <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginTop:18, cursor:'pointer' }}>
          <button onClick={() => setAgreed(a => !a)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${agreed ? C.primary : C.hairline}`, background: agreed ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, cursor:'pointer' }}>
            {agreed && <Icon name="check" size={12} color="#fff" sw={2.5} />}
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.5 }}>
            I agree to the{' '}
            <span onClick={() => setModal('terms')} style={{ color:C.primary, fontWeight:600, cursor:'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span onClick={() => setModal('privacy')} style={{ color:C.primary, fontWeight:600, cursor:'pointer' }}>Privacy Policy</span>
          </span>
        </label>

        {errorMsg && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop:22 }}>
          <Btn variant="primary" size="lg" wide onClick={handleSubmit} disabled={!agreed || loading} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow: agreed ? '0 10px 28px rgba(108,77,255,0.35)' : 'none' }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Btn>
        </div>

        <SocialAuthBlock onDone={() => navigate('auth-success', { kind:'signup' })} />

        <div style={{ textAlign:'center', marginTop:20, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          Already have an account?{' '}
          <button onClick={() => navigate('login')} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>Login</button>
        </div>
      </div>

      <Modal open={modal === 'terms'} title="Terms of Service" onClose={() => setModal(null)}>
        <p>By creating a CLORIVO account, you agree to use the platform responsibly, provide accurate information, and comply with all applicable laws. CLORIVO acts as a marketplace connecting buyers and sellers and is not directly responsible for the quality of third-party listings. Full terms are available on request.</p>
      </Modal>
      <Modal open={modal === 'privacy'} title="Privacy Policy" onClose={() => setModal(null)}>
        <p>CLORIVO collects the information you provide (name, email, phone) to create and secure your account, process orders, and improve your experience. We never sell your personal data to third parties. You may request access to or deletion of your data at any time from your account settings.</p>
      </Modal>
    </AuthShell>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────
function ForgotPasswordScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [identifier, setIdentifier] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleSend() {
    if (!identifier.trim()) { setErrorMsg('Enter your email or phone number.'); return; }
    setLoading(true); setErrorMsg('');
    const { error } = await sbResetPasswordForEmail(identifier.trim());
    setLoading(false);
    if (error) { setErrorMsg(error.message || 'Unable to send the verification code.'); return; }
    setSent(true);
    setTimeout(() => navigate('otp-verify', { email: identifier.trim(), purpose:'recovery' }), 900);
  }

  return (
    <AuthShell isDesktop={isDesktop} onBack={goBack}>
      <div style={{ padding:'16px 24px 40px' }}>
        <div style={{ width:64, height:64, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Icon name="lock" size={28} color={C.primary} />
        </div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Forgot Password?</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginTop:8, lineHeight:1.5, maxWidth:320, margin:'8px auto 0' }}>
            Enter the email or phone number linked to your account and we'll send you a verification code.
          </div>
        </div>

        <Input
          label="Email or Phone Number"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          iconLeft={<Icon name="mail" size={18} color={C.mute} />}
        />

        {errorMsg && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger }}>
            {errorMsg}
          </div>
        )}
        {sent && !errorMsg && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'#EFF9F4', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.success, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="checkCircle" size={15} color={C.success} />
            Verification code sent — redirecting…
          </div>
        )}

        <div style={{ marginTop:22 }}>
          <Btn variant="primary" size="lg" wide onClick={handleSend} disabled={loading || sent} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            {loading ? 'Sending…' : 'Send Verification Code'}
          </Btn>
        </div>

        <div style={{ textAlign:'center', marginTop:22, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          Remembered your password?{' '}
          <button onClick={() => navigate('login')} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>Login</button>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── OTP VERIFICATION ─────────────────────────────────────────
function OtpVerifyScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const email = params.email || '';
  const purpose = params.purpose || 'recovery';

  const [digits, setDigits] = React.useState(['', '', '', '', '', '']);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [countdown, setCountdown] = React.useState(60);
  const inputsRef = React.useRef([]);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function handleChange(i, val) {
    const v = val.replace(/\D/g, '').slice(-1);
    setDigits(prev => { const next = [...prev]; next[i] = v; return next; });
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
  }
  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus();
  }
  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(text.split('').concat(Array(6).fill('')).slice(0, 6));
    inputsRef.current[Math.min(text.length, 5)]?.focus();
  }

  const code = digits.join('');

  async function handleVerify() {
    if (code.length !== 6) { setErrorMsg('Enter the 6-digit code.'); return; }
    setLoading(true); setErrorMsg('');
    const { error } = await sbVerifyRecoveryOtp(email, code);
    setLoading(false);
    if (error) { setErrorMsg(error.message || 'Invalid or expired code.'); return; }
    navigate('reset-password', { email });
  }

  async function handleResend() {
    if (countdown > 0) return;
    setCountdown(60);
    setErrorMsg('');
    await sbResetPasswordForEmail(email);
  }

  return (
    <AuthShell isDesktop={isDesktop} onBack={goBack}>
      <div style={{ padding:'16px 24px 40px' }}>
        <div style={{ width:64, height:64, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Icon name="mail" size={26} color={C.primary} />
        </div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Verify Your Code</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginTop:8, lineHeight:1.5 }}>
            Enter the 6-digit code sent to{email ? <><br /><span style={{ fontWeight:600, color:C.ink }}>{email}</span></> : ' your email'}
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'center', gap:8 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputsRef.current[i] = el}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              inputMode="numeric"
              maxLength={1}
              style={{
                width:44, height:52, textAlign:'center', fontSize:22, fontWeight:700,
                fontFamily:"'JetBrains Mono',monospace", color:C.ink,
                border:`1.5px solid ${d ? C.primary : C.hairline}`, borderRadius:12,
                outline:'none', background:C.white, transition:'border-color 0.15s',
              }}
            />
          ))}
        </div>

        {errorMsg && (
          <div style={{ marginTop:16, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger, textAlign:'center' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop:24 }}>
          <Btn variant="primary" size="lg" wide onClick={handleVerify} disabled={loading || code.length !== 6} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            {loading ? 'Verifying…' : 'Verify'}
          </Btn>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          {countdown > 0 ? (
            <>Resend code in <span style={{ fontFamily:"'JetBrains Mono',monospace", color:C.ink, fontWeight:600 }}>0:{countdown.toString().padStart(2,'0')}</span></>
          ) : (
            <button onClick={handleResend} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>Resend Code</button>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

// ─── PASSWORD RESET ───────────────────────────────────────────
function ResetPasswordScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [pass, setPass] = React.useState('');
  const [confirmPass, setConfirmPass] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const strength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 ? 2 : 3;
  const strengthColors = ['', C.danger, C.warning, C.success];
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];

  const passError    = touched && pass.length < 6 ? 'Password must be at least 6 characters.' : '';
  const confirmError = touched && confirmPass !== pass ? 'Passwords do not match.' : '';

  async function handleReset() {
    setTouched(true);
    if (pass.length < 6 || confirmPass !== pass) return;
    setLoading(true); setErrorMsg('');
    const { error } = await sbUpdatePassword(pass);
    setLoading(false);
    if (error) { setErrorMsg(error.message || 'Unable to reset your password.'); return; }
    navigate('auth-success', { kind:'reset' });
  }

  return (
    <AuthShell isDesktop={isDesktop} onBack={goBack}>
      <div style={{ padding:'16px 24px 40px' }}>
        <div style={{ width:64, height:64, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <Icon name="lock" size={26} color={C.primary} />
        </div>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Reset Password</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, marginTop:8, lineHeight:1.5 }}>Create a new password for your account</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <Input label="New Password" value={pass} onChange={e => setPass(e.target.value)} iconLeft={<Icon name="lock" size={18} color={C.mute} />} type="password" error={passError} />
            {pass.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= strength ? strengthColors[strength] : C.hairline, transition:'background 0.2s' }} />
                  ))}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color: strengthColors[strength], fontWeight:600, marginTop:4, display:'inline-block' }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
          <Input label="Confirm New Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} iconLeft={<Icon name="lock" size={18} color={C.mute} />} type="password" error={confirmError} />
        </div>

        {errorMsg && (
          <div style={{ marginTop:14, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginTop:22 }}>
          <Btn variant="primary" size="lg" wide onClick={handleReset} disabled={loading} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            {loading ? 'Resetting…' : 'Reset Password'}
          </Btn>
        </div>
      </div>
    </AuthShell>
  );
}

// ─── SUCCESS STATE ────────────────────────────────────────────
function AuthSuccessScreen({ params = {} }) {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  const kind = params.kind || 'signup';
  const [banner, setBanner] = React.useState(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    setShow(true);
    sbGetSignupBanner().then(b => setBanner(b));
  }, []);

  const copy = kind === 'reset'
    ? { title:'Password Reset Successful', sub:'Your password has been updated. You can now sign in with your new password.' }
    : { title:'Account Successfully Created', sub:'Welcome to CLORIVO — start exploring millions of products from trusted sellers.' };

  return (
    <AuthShell isDesktop={isDesktop}>
      <div style={{ padding:'24px 24px 40px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {/* Editable banner — configured by the admin under Banners → Signup Success */}
        {banner?.image_url ? (
          <div style={{ width:'100%', height:150, borderRadius:18, overflow:'hidden', marginBottom:24, position:'relative' }}>
            <img src={banner.image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            {(banner.title || banner.subtitle) && (
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(14,11,31,0.6), transparent 60%)', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:14 }}>
                {banner.title && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:'#fff' }}>{banner.title}</span>}
                {banner.subtitle && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.85)' }}>{banner.subtitle}</span>}
              </div>
            )}
          </div>
        ) : (
          <div style={{ width:120, height:120, borderRadius:9999, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', margin:'20px 0 24px', boxShadow:'0 16px 40px rgba(108,77,255,0.32)', transform: show ? 'scale(1)' : 'scale(0.6)', opacity: show ? 1 : 0, transition:'all 0.45s cubic-bezier(0.25,1.5,0.5,1)' }}>
            <Icon name="checkCircle" size={56} color="#fff" sw={2} />
          </div>
        )}

        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', lineHeight:1.25 }}>{copy.title}</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, marginTop:10, lineHeight:1.5, maxWidth:320 }}>{copy.sub}</div>
        </div>

        <div style={{ width:'100%', marginTop:32 }}>
          <Btn variant="primary" size="lg" wide onClick={() => navigate(kind === 'reset' ? 'login' : 'home')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            Continue
          </Btn>
        </div>
      </div>
    </AuthShell>
  );
}

Object.assign(window, {
  SplashScreen, OnboardingScreen, LoginScreen, RegisterScreen,
  ForgotPasswordScreen, OtpVerifyScreen, ResetPasswordScreen, AuthSuccessScreen,
});
