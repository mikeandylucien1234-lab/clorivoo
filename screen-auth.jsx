// screen-auth.jsx — Splash · Onboarding C · Login · Register

// ─── SPLASH ──────────────────────────────────────────────────
function SplashScreen() {
  const { navigate } = useNav();
  const [dot, setDot] = React.useState(0);

  React.useEffect(() => {
    const t1 = setInterval(() => setDot(d => (d + 1) % 3), 500);
    const t2 = setTimeout(() => navigate('onboarding'), 2600);
    return () => { clearInterval(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
      <StatusBar />
      {/* Logo mark */}
      <div style={{ width:88, height:88, borderRadius:24, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(108,77,255,0.28)', marginBottom:20 }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:52, color:'#fff', letterSpacing:'-0.04em', lineHeight:1 }}>c</span>
      </div>
      {/* Wordmark */}
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:800, fontSize:30, color:C.ink, letterSpacing:'-0.04em', marginBottom:6 }}>clorivo</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:400, fontSize:14, color:C.mute, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:64 }}>shop · sell · ship</div>
      {/* Loader dots */}
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: i === dot ? 22 : 6, height:6, borderRadius:9999, background: i === dot ? C.primary : C.hairline, transition:'all 0.4s ease' }} />
        ))}
      </div>
    </div>
  );
}

// ─── ONBOARDING C — full-bleed + bottom sheet ────────────────
function OnboardingScreen() {
  const { navigate } = useNav();
  const [step, setStep]     = React.useState(0);
  const [exiting, setExit]  = React.useState(false);

  const slides = [
    { tint:0, label:'lifestyle · shopping',   title:'Bienvenue sur clorivo', sub:'Des millions de produits, des vendeurs vérifiés, des prix justes — tout au même endroit.' },
    { tint:1, label:'lifestyle · découverte',  title:'Des offres toute la journée', sub:'Ventes flash renouvelées chaque heure. Jusqu\'à -80% sur les meilleures sélections.' },
    { tint:2, label:'lifestyle · confiance',   title:'Achetez en confiance', sub:'Vendeurs certifiés, paiements 3D-secure, retours gratuits sous 30 jours.' },
  ];

  const s = slides[step];

  function next() {
    if (step < 2) { setExit(true); setTimeout(() => { setStep(step + 1); setExit(false); }, 200); }
    else navigate('login');
  }

  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
      <StatusBar light />
      {/* Full-bleed image */}
      <Img label={s.label} tint={s.tint} style={{ position:'absolute', inset:0, borderRadius:0 }} />
      {/* Vignette */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(14,11,31,0.08) 0%, rgba(14,11,31,0.55) 100%)' }} />

      {/* Skip */}
      <button onClick={() => navigate('login')} style={{ position:'absolute', top:60, right:20, zIndex:10, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', borderRadius:9999, padding:'7px 16px' }}>
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.9)' }}>Passer</span>
      </button>

      {/* Step dots */}
      <div style={{ position:'absolute', bottom:300, left:0, right:0, display:'flex', justifyContent:'center', gap:6, zIndex:10 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: i === step ? 20 : 6, height:6, borderRadius:9999, background: i === step ? C.white : 'rgba(255,255,255,0.4)', transition:'all 0.35s ease' }} />
        ))}
      </div>

      {/* Bottom sheet */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:C.white, borderRadius:'20px 20px 0 0', padding:'16px 24px 40px', zIndex:10, animation: exiting ? 'sheetFade 0.2s ease forwards' : 'sheetIn 0.35s cubic-bezier(0.25,0.46,0.45,0.94)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:C.hairline, margin:'0 auto 18px' }} />
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:8, lineHeight:1.15 }}>{s.title}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, lineHeight:1.5, marginBottom:24 }}>{s.sub}</div>
        <Btn variant="primary" size="lg" wide onClick={next}>
          {step < 2 ? 'Continuer' : 'Commencer'}
          <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
        </Btn>
        {step === 0 && (
          <button onClick={() => navigate('login')} style={{ width:'100%', marginTop:14, border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
            Déjà un compte ? <span style={{ color:C.primary, fontWeight:600 }}>Se connecter</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function LoginScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [email, setEmail]    = React.useState('');
  const [pass, setPass]      = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleLogin() {
    if (!email || !pass) { setErrorMsg('Remplissez tous les champs.'); return; }
    setLoading(true); setErrorMsg('');
    const { error } = await sbSignIn(email, pass);
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    navigate('home');
  }

  return (
    <div style={{ position:'absolute', inset:0, background: isDesktop ? C.paper : C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop: STATUS_H, flex:1, overflowY:'auto', display:'flex', flexDirection:'column', alignItems: isDesktop ? 'center' : 'stretch' }}>
      <div style={{ width:'100%', maxWidth: isDesktop ? 440 : undefined, background: isDesktop ? C.white : undefined, borderRadius: isDesktop ? 20 : undefined, boxShadow: isDesktop ? '0 4px 32px rgba(14,11,31,0.08)' : undefined, margin: isDesktop ? '40px 0' : undefined, padding:`${isDesktop ? 32 : STATUS_H + 8}px 24px 40px` }}>
        {/* Back */}
        <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:'0 0 24px', display:'flex', alignItems:'center', gap:6, color:C.mute }}>
          <Icon name="arrowLeft" size={20} color={C.mute} />
        </button>

        <div style={{ marginBottom:32 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:28, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:6 }}>Bon retour 👋</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute }}>Connectez-vous pour continuer</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input
            label="Adresse e-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            iconLeft={<Icon name="mail" size={18} color={C.mute} />}
            type="email"
          />
          <Input
            label="Mot de passe"
            value={pass}
            onChange={e => setPass(e.target.value)}
            iconLeft={<Icon name="lock" size={18} color={C.mute} />}
            type="password"
          />
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <div style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${C.primary}`, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="check" size={11} color={C.primary} sw={2.5} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Se souvenir de moi</span>
            </label>
            <button style={{ border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.primary }}>Mot de passe oublié ?</button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ marginTop:10, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:'#D14343' }}>
            {errorMsg}
          </div>
        )}
        <div style={{ marginTop:24 }}>
          <Btn variant="primary" size="lg" wide onClick={handleLogin} disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Btn>
        </div>

        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:12, margin:'20px 0' }}>
          <Divider style={{ flex:1 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, whiteSpace:'nowrap' }}>ou continuer avec</span>
          <Divider style={{ flex:1 }} />
        </div>

        {/* Social auth */}
        <div style={{ display:'flex', gap:10 }}>
          {['Google', 'Apple'].map((s, i) => (
            <button key={i} onClick={() => navigate('home')} style={{ flex:1, height:48, border:`1.5px solid ${C.hairline}`, borderRadius:12, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink }}>
              {s === 'Google' ? (
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" fill="#EA4335"/><path d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/><path d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" fill="#FBBC05"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.95 13.04C2.43 15.98 5.48 18 9 18z" fill="#34A853"/></svg>
              ) : (
                <svg width="16" height="18" viewBox="0 0 16 18" fill={C.ink}><path d="M13.53 9.52c-.02-2.38 1.94-3.52 2.03-3.58-1.1-1.62-2.82-1.84-3.44-1.87-1.46-.15-2.87.87-3.61.87-.75 0-1.9-.85-3.12-.82-1.6.02-3.07.93-3.9 2.36-1.67 2.9-.43 7.2 1.2 9.55.8 1.15 1.74 2.44 2.98 2.39 1.2-.05 1.65-.77 3.1-.77 1.44 0 1.85.77 3.11.75 1.28-.02 2.1-1.17 2.88-2.32.91-1.33 1.29-2.62 1.31-2.69-.03-.01-2.52-.97-2.54-3.87z"/><path d="M11.16 2.84c.67-.81 1.12-1.94 1-3.07-1 .04-2.17.67-2.87 1.5-.63.73-1.18 1.89-1.03 3 1.1.09 2.23-.56 2.9-1.43z"/></svg>
              )}
              {s}
            </button>
          ))}
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          Nouveau ici ?{' '}
          <button onClick={() => navigate('register')} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>
            Créer un compte
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── REGISTER ────────────────────────────────────────────────
function RegisterScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [name, setName]      = React.useState('');
  const [email, setEmail]    = React.useState('');
  const [pass, setPass]      = React.useState('');
  const [agreed, setAgreed]  = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const strength = pass.length === 0 ? 0 : pass.length < 6 ? 1 : pass.length < 10 ? 2 : 3;
  const strengthColors = ['', C.danger, C.warning, C.success];
  const strengthLabels = ['', 'Faible', 'Moyen', 'Fort'];

  const [errorMsg, setErrorMsg] = React.useState('');

  async function handleSubmit() {
    if (!agreed) return;
    if (!name || !email || !pass) { setErrorMsg('Remplissez tous les champs.'); return; }
    if (pass.length < 6) { setErrorMsg('Mot de passe trop court (6 caractères min.).'); return; }
    setLoading(true); setErrorMsg('');
    const { error } = await sbSignUp(email, pass, name);
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    navigate('home');
  }

  return (
    <div style={{ position:'absolute', inset:0, background: isDesktop ? C.paper : C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop: STATUS_H, flex:1, overflowY:'auto', display:'flex', flexDirection:'column', alignItems: isDesktop ? 'center' : 'stretch' }}>
      <div style={{ width:'100%', maxWidth: isDesktop ? 440 : undefined, background: isDesktop ? C.white : undefined, borderRadius: isDesktop ? 20 : undefined, boxShadow: isDesktop ? '0 4px 32px rgba(14,11,31,0.08)' : undefined, margin: isDesktop ? '40px 0' : undefined, padding:`${isDesktop ? 32 : STATUS_H + 8}px 24px 40px` }}>
        <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:'0 0 24px', display:'flex', color:C.mute }}>
          <Icon name="arrowLeft" size={20} color={C.mute} />
        </button>

        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:28, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:6 }}>Créer un compte</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute }}>Rejoignez +2M d'acheteurs</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="Nom complet" value={name} onChange={e => setName(e.target.value)} placeholder="Votre prénom et nom" />
          <Input label="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@mail.com" iconLeft={<Icon name="mail" size={18} color={C.mute} />} type="email" />
          <div>
            <Input label="Mot de passe" value={pass} onChange={e => setPass(e.target.value)} placeholder="8 caractères minimum" iconLeft={<Icon name="lock" size={18} color={C.mute} />} type="password" />
            {pass.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:9999, background: i <= strength ? strengthColors[strength] : C.hairline, transition:'background 0.3s' }} />
                  ))}
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color: strengthColors[strength] }}>{strengthLabels[strength]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms */}
        <label style={{ display:'flex', alignItems:'flex-start', gap:10, marginTop:18, cursor:'pointer' }}>
          <button onClick={() => setAgreed(a => !a)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${agreed ? C.primary : C.hairline}`, background: agreed ? C.primary : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, cursor:'pointer' }}>
            {agreed && <Icon name="check" size={12} color="#fff" sw={2.5} />}
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute, lineHeight:1.5 }}>
            J'accepte les{' '}
            <span style={{ color:C.primary, fontWeight:600 }}>conditions d'utilisation</span>
            {' '}et la{' '}
            <span style={{ color:C.primary, fontWeight:600 }}>politique de confidentialité</span>
          </span>
        </label>

        {errorMsg && (
          <div style={{ marginTop:10, padding:'10px 14px', background:'#FEF2F2', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:'#D14343' }}>
            {errorMsg}
          </div>
        )}
        <div style={{ marginTop:24 }}>
          <Btn variant="primary" size="lg" wide onClick={handleSubmit} disabled={!agreed || loading}>
            {loading ? 'Création…' : 'Continuer'}
            {!loading && <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />}
          </Btn>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>
          Déjà un compte ?{' '}
          <button onClick={() => navigate('login')} style={{ border:'none', background:'none', cursor:'pointer', color:C.primary, fontWeight:600, fontFamily:"'Inter',sans-serif", fontSize:14 }}>Se connecter</button>
        </div>
      </div>
      </div>
    </div>
  );
}

Object.assign(window, { SplashScreen, OnboardingScreen, LoginScreen, RegisterScreen });
