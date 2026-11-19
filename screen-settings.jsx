// screen-settings.jsx — App Settings + Security & Privacy

function SettingsRow({ icon, label, value, onClick, right }) {
  return (
    <button onClick={onClick} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'13px 16px', border:'none', background:'none', cursor: onClick ? 'pointer' : 'default', textAlign:'left' }}>
      <Icon name={icon} size={17} color={C.mute} />
      <span style={{ flex:1, fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink }}>{label}</span>
      {right ? right : (
        <>
          {value && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{value}</span>}
          {onClick && <Icon name="chevronRight" size={15} color={C.mute} />}
        </>
      )}
    </button>
  );
}
function SettingsGroup({ title, children }) {
  return (
    <div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>{title}</div>
      <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', flexDirection:'column' }}>
        {React.Children.map(children, (c, i) => (
          <div style={{ borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────
function SettingsScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [lang, setLang] = React.useState('English');
  const [currency, setCurrency] = React.useState('USD ($)');
  const [theme, setTheme] = React.useState('Light');
  const [pushOn, setPushOn] = React.useState(true);
  const [emailOn, setEmailOn] = React.useState(true);
  const [promoOn, setPromoOn] = React.useState(false);
  const [prefModal, setPrefModal] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Settings</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <SettingsGroup title="Preferences">
          <SettingsRow icon="globe" label="Language" value={lang} onClick={() => setPrefModal('lang')} />
          <SettingsRow icon="dollarSign" label="Currency" value={currency} onClick={() => setPrefModal('currency')} />
          <SettingsRow icon={theme === 'Light' ? 'sun' : 'moon'} label="Theme" value={theme} onClick={() => setPrefModal('theme')} />
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <SettingsRow icon="bell" label="Push Notifications" right={<Switch checked={pushOn} onChange={setPushOn} />} />
          <SettingsRow icon="mail" label="Email Notifications" right={<Switch checked={emailOn} onChange={setEmailOn} />} />
          <SettingsRow icon="tag" label="Promotions & Offers" right={<Switch checked={promoOn} onChange={setPromoOn} />} />
        </SettingsGroup>

        <SettingsGroup title="Privacy & Security">
          <SettingsRow icon="shield" label="Security & Privacy" onClick={() => navigate('security')} />
          <SettingsRow icon="lock" label="Change Password" onClick={() => navigate('personal-info')} />
        </SettingsGroup>

        <SettingsGroup title="Support">
          <SettingsRow icon="lifeBuoy" label="Help Center" onClick={() => navigate('support')} />
          <SettingsRow icon="messageSquare" label="Live Chat" onClick={() => navigate('chat')} />
          <SettingsRow icon="fileText" label="Terms & Conditions" onClick={() => setToast({ type:'success', message:'Opening Terms & Conditions…' })} />
          <SettingsRow icon="info" label="About CLORIVO" onClick={() => setToast({ type:'success', message:'CLORIVO — Your trusted Haitian marketplace' })} />
        </SettingsGroup>

        <div style={{ textAlign:'center', padding:'6px 0 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:C.hairline }}>CLORIVO v1.0.0</div>
      </div>

      <Modal open={prefModal === 'lang'} title="Select Language" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['English', 'Français', 'Kreyòl Ayisyen', 'Español'].map(l => (
            <button key={l} onClick={() => { setLang(l); setPrefModal(null); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{l}</span>
              {lang === l && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={prefModal === 'currency'} title="Select Currency" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['USD ($)', 'HTG (G)', 'EUR (€)'].map(c => (
            <button key={c} onClick={() => { setCurrency(c); setPrefModal(null); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{c}</span>
              {currency === c && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={prefModal === 'theme'} title="Select Theme" onClose={() => setPrefModal(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {['Light', 'Dark', 'System'].map(t => (
            <button key={t} onClick={() => { setTheme(t); setPrefModal(null); setToast({ type:'success', message:`Theme set to ${t}` }); }} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 4px', border:'none', borderTop:`1px solid ${C.hairline}`, background:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink }}>{t}</span>
              {theme === t && <Icon name="check" size={16} color={C.primary} sw={2.5} />}
            </button>
          ))}
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

// ─── SECURITY & PRIVACY ──────────────────────────────────────
function SecurityScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [twoFA, setTwoFA] = React.useState(true);
  const [biometric, setBiometric] = React.useState(false);
  const [profileVisible, setProfileVisible] = React.useState(true);
  const [dataSharing, setDataSharing] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [confirmRevoke, setConfirmRevoke] = React.useState(false);

  const loginActivity = [
    { device:'iPhone 15 Pro', location:'Port-au-Prince, Haiti', time:'Active now', current:true },
    { device:'Chrome on Windows', location:'Miami, USA',          time:'2 days ago', current:false },
    { device:'Safari on MacBook', location:'Paris, France',       time:'1 week ago', current:false },
  ];

  function revokeAllSessions() {
    setConfirmRevoke(false);
    setToast({ type:'success', message:'All other sessions have been signed out' });
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <div style={{ maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, padding: isDesktop ? '20px 0' : '14px 20px', display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={goBack} style={{ width:36, height:36, borderRadius:9999, border:`1.5px solid ${C.hairline}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="arrowLeft" size={18} color={C.ink} />
          </button>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>Security & Privacy</span>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding: isDesktop ? '24px 0 40px' : '16px 16px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 640 : undefined, margin: isDesktop ? '0 auto' : undefined, width: isDesktop ? '100%' : undefined }}>

        <SettingsGroup title="Authentication">
          <SettingsRow icon="lock" label="Change Password" onClick={() => navigate('personal-info')} />
          <SettingsRow icon="shield" label="Two-Factor Authentication" right={<Switch checked={twoFA} onChange={v => { setTwoFA(v); setToast({ type:'success', message: v ? '2FA enabled' : '2FA disabled' }); }} />} />
          <SettingsRow icon="smartphone" label="Biometric Login (Face ID / Touch ID)" right={<Switch checked={biometric} onChange={v => { setBiometric(v); setToast({ type:'success', message: v ? 'Biometric login enabled' : 'Biometric login disabled' }); }} />} />
        </SettingsGroup>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:700, color:C.ink, marginBottom:8 }}>Login Activity</div>
          <div style={{ background:C.white, borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
            {loginActivity.map((d, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
                <Icon name="smartphone" size={17} color={d.current ? C.primary : C.mute} />
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, fontWeight:600, color:C.ink }}>{d.device}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute }}>{d.location}</div>
                </div>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color: d.current ? C.success : C.mute, fontWeight: d.current ? 700 : 400 }}>{d.time}</span>
              </div>
            ))}
          </div>
          {!confirmRevoke ? (
            <Btn variant="secondary" size="sm" wide onClick={() => setConfirmRevoke(true)} style={{ marginTop:10, color:C.danger, borderColor:'#FCA5A5' }}>Sign Out All Other Sessions</Btn>
          ) : (
            <div style={{ background:'#FEF2F2', borderRadius:14, padding:14, display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.danger, fontWeight:600 }}>Sign out every device except this one?</span>
              <div style={{ display:'flex', gap:10 }}>
                <Btn variant="danger" size="sm" style={{ flex:1 }} onClick={revokeAllSessions}>Yes, Sign Out</Btn>
                <Btn variant="secondary" size="sm" style={{ flex:1 }} onClick={() => setConfirmRevoke(false)}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>

        <SettingsGroup title="Privacy Settings">
          <SettingsRow icon="user" label="Public Profile Visibility" right={<Switch checked={profileVisible} onChange={setProfileVisible} />} />
          <SettingsRow icon="barChart" label="Share Usage Data" right={<Switch checked={dataSharing} onChange={setDataSharing} />} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow icon="user" label="View Personal Information" onClick={() => navigate('personal-info')} />
          <SettingsRow icon="trash" label="Delete My Account" onClick={() => navigate('personal-info')} />
        </SettingsGroup>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

Object.assign(window, { SettingsScreen, SecurityScreen });
