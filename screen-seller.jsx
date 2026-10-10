// screen-seller.jsx — Seller Welcome · Registration · Identity Verification · Dashboard · Orders

// ─── STEPPER COMPONENT ───────────────────────────────────────
function KycStepper({ step }) {
  const steps = ['Account', 'Verification', 'Face Scan', 'Complete'];
  return (
    <div style={{ padding:'10px 20px 14px', background:C.white, borderBottom:`1px solid ${C.hairline}` }}>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.mute, textAlign:'center', marginBottom:8 }}>Step {step + 1} of {steps.length}</div>
      <div style={{ display:'flex', alignItems:'center' }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ width:24, height:24, borderRadius:9999, background: i < step ? C.success : i === step ? C.primary : C.hairline, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.3s' }}>
                {i < step
                  ? <Icon name="check" size={12} color="#fff" sw={2.5} />
                  : <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:700, color: i === step ? '#fff' : C.mute }}>{i+1}</span>}
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:9.5, color: i <= step ? C.primary : C.mute, fontWeight: i === step ? 600 : 400, whiteSpace:'nowrap' }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex:1, height:2, borderRadius:1, background: i < step ? C.success : C.hairline, margin:'0 4px', marginBottom:16, transition:'background 0.3s' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── SELLER WELCOME ───────────────────────────────────────────
function SellerWelcomeScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const benefits = [
    { icon:'store',   text:'Millions of buyers' },
    { icon:'zap',     text:'Fast, secure payments' },
    { icon:'checkCircle', text:'Free registration' },
    { icon:'help',    text:'24/7 support' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:C.white, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, flex:1, overflowY:'auto', display:'flex', flexDirection:'column', alignItems: isDesktop ? 'center' : 'stretch' }}>
      <div style={{ width:'100%', maxWidth: isDesktop ? 460 : undefined, padding:'8px 24px 40px' }}>
        <button onClick={goBack} style={{ border:'none', background:'none', cursor:'pointer', padding:'8px 0 16px', display:'flex', color:C.mute }}>
          <Icon name="arrowLeft" size={20} color={C.mute} />
        </button>

        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:190, marginBottom:8 }}>
          <div style={{ position:'absolute', top:-10, left:'10%', width:150, height:150, borderRadius:9999, background:'radial-gradient(circle, rgba(108,77,255,0.14) 0%, transparent 70%)' }} />
          <div style={{ position:'absolute', bottom:-20, right:'8%', width:170, height:170, borderRadius:9999, background:'radial-gradient(circle, rgba(138,107,255,0.12) 0%, transparent 70%)' }} />
          <div style={{ width:120, height:120, borderRadius:9999, background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 16px 40px rgba(108,77,255,0.32)' }}>
            <Icon name="store" size={54} color="#fff" sw={1.6} />
          </div>
        </div>

        <div style={{ textAlign:'center', marginBottom:8 }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:26, fontWeight:800, color:C.ink, letterSpacing:'-0.03em' }}>Sell on CLORIVO</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, color:C.mute, marginTop:8, lineHeight:1.5, maxWidth:320, margin:'8px auto 0' }}>
            Create your shop and start selling products worldwide.
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:28 }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:C.paper, borderRadius:12 }}>
              <div style={{ width:36, height:36, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name={b.icon} size={17} color={C.primary} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:C.ink }}>{b.text}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:28 }}>
          <Btn variant="primary" size="lg" wide onClick={() => navigate('become-seller')} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
            Start Selling
          </Btn>
          <Btn variant="secondary" size="lg" wide onClick={() => navigate('seller-home')}>
            I Already Have an Account
          </Btn>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── BECOME SELLER — Step 1: Account ──────────────────────────
const KYC_STATUS_COPY = {
  pending:       { title:'Application under review', tone:'warning', body:'We received your application and are reviewing it. This usually takes 24–48 hours.' },
  under_review:  { title:'Application under review', tone:'warning', body:'A staff member is actively reviewing your documents.' },
  needs_changes: { title:'Changes requested', tone:'danger', body:'Please review the note below, then resubmit with the correction.' },
  rejected:      { title:'Application rejected', tone:'danger', body:'Your application was not approved. You can submit a new one below.' },
  approved:      { title:'You are an approved seller', tone:'success', body:'Your shop is active. Head to your seller dashboard to start listing products.' },
  suspended:     { title:'Selling suspended', tone:'danger', body:'Your ability to sell has been suspended. Contact support for details.' },
};

function KycStatusBanner({ kyc, onResubmit }) {
  const copy = KYC_STATUS_COPY[kyc.status] || KYC_STATUS_COPY.pending;
  const toneColors = { warning:{ bg:'#FFF6E5', fg:'#92400E' }, danger:{ bg:'#FDEDED', fg:C.danger }, success:{ bg:'#EFF9F4', fg:C.success } };
  const t = toneColors[copy.tone];
  const canResubmit = kyc.status === 'needs_changes' || kyc.status === 'rejected';
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, padding:'18px 20px' }}>
      <div style={{ background:t.bg, borderRadius:14, padding:'16px' }}>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:t.fg, marginBottom:6 }}>{copy.title}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, lineHeight:1.5 }}>{copy.body}</div>
        {kyc.status === 'needs_changes' && kyc.requested_changes && (
          <div style={{ marginTop:10, padding:'10px 12px', background:'#fff', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>
            <strong>Requested correction:</strong> {kyc.requested_changes}
          </div>
        )}
        {kyc.status === 'rejected' && kyc.review_notes && (
          <div style={{ marginTop:10, padding:'10px 12px', background:'#fff', borderRadius:10, fontFamily:"'Inter',sans-serif", fontSize:13, color:C.ink }}>
            <strong>Reason:</strong> {kyc.review_notes}
          </div>
        )}
      </div>
      {canResubmit && (
        <Btn variant="primary" size="lg" wide onClick={onResubmit} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` }}>
          Fix and resubmit
        </Btn>
      )}
    </div>
  );
}

function BecomeSellerScreen() {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [checkingKyc, setCheckingKyc] = React.useState(true);
  const [existingKyc, setExistingKyc] = React.useState(null);
  const [resubmitMode, setResubmitMode] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName:'', lastName:'', dob:'', email:'', countryCode:'+1', phone:'', nationality:'',
    originCountry:'', country:'', city:'', shopName:'', shopDescription:'',
  });

  React.useEffect(() => { sbGetMyKyc().then(k => { setExistingKyc(k); setCheckingKyc(false); }); }, []);

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }
  const canContinue = form.firstName.trim() && form.lastName.trim() && form.shopName.trim();

  if (checkingKyc) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}` }}><NavBar title="Create Seller Account" onBack={goBack} /></div>
        <div style={{ padding:40, textAlign:'center', fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Loading…</div>
      </div>
    );
  }

  if (existingKyc && !resubmitMode) {
    return (
      <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
        <StatusBar />
        <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}` }}><NavBar title="Seller Application" onBack={goBack} /></div>
        <KycStatusBanner kyc={existingKyc} onResubmit={() => {
          setForm(f => ({
            ...f,
            firstName: existingKyc.legal_first_name || '', lastName: existingKyc.legal_last_name || '',
            dob: existingKyc.date_of_birth || '', email: existingKyc.contact_email || '',
            phone: existingKyc.contact_phone || '', nationality: existingKyc.nationality || '',
            originCountry: existingKyc.origin_country || '', country: existingKyc.destination_country || '',
            city: existingKyc.city || '', shopName: existingKyc.shop_name_requested || existingKyc.shop_name || '',
            shopDescription: existingKyc.shop_description || '',
          }));
          setResubmitMode(true);
        }} />
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Create Seller Account" onBack={goBack} />
        <KycStepper step={0} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:14, maxWidth: isDesktop ? 600 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:4 }}>Personal information</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>This information stays private and secure.</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Input label="First Name" placeholder="Alex" value={form.firstName} onChange={set('firstName')} style={{ flex:1 }} />
          <Input label="Last Name" placeholder="Martin" value={form.lastName} onChange={set('lastName')} style={{ flex:1 }} />
        </div>
        <Input label="Date of Birth" placeholder="DD / MM / YYYY" value={form.dob} onChange={set('dob')} iconLeft={<Icon name="package" size={16} color={C.mute} />} />
        <Input label="Email Address" placeholder="you@mail.com" type="email" value={form.email} onChange={set('email')} iconLeft={<Icon name="mail" size={16} color={C.mute} />} />
        <div style={{ display:'flex', gap:10 }}>
          <Input label="Code" placeholder="+1" value={form.countryCode} onChange={set('countryCode')} style={{ width:80 }} />
          <Input label="Phone Number" placeholder="555 123 4567" value={form.phone} onChange={set('phone')} style={{ flex:1 }} />
        </div>
        <Input label="Nationality" placeholder="American" value={form.nationality} onChange={set('nationality')} />
        <div style={{ display:'flex', gap:10 }}>
          <Input label="Country of Origin" placeholder="Haiti" value={form.originCountry} onChange={set('originCountry')} style={{ flex:1 }} iconLeft={<Icon name="mapPin" size={16} color={C.mute} />} />
          <Input label="Country of Residence" placeholder="United States" value={form.country} onChange={set('country')} style={{ flex:1 }} iconLeft={<Icon name="mapPin" size={16} color={C.mute} />} />
        </div>
        <Input label="City" placeholder="Miami" value={form.city} onChange={set('city')} />
        <Divider style={{ margin:'4px 0' }} />
        <div>
          <Input label="Shop Name" placeholder="Atelier Lune" value={form.shopName} onChange={set('shopName')} iconLeft={<Icon name="store" size={16} color={C.mute} />} />
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:5 }}>This is what buyers will see</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.mute }}>Shop Description</span>
          <textarea value={form.shopDescription} onChange={e => setForm(f => ({ ...f, shopDescription:e.target.value }))} rows={3} placeholder="What do you sell?"
            style={{ border:`1.5px solid ${C.hairline}`, borderRadius:12, padding:'12px 14px', fontFamily:"'Inter',sans-serif", fontSize:14, color:C.ink, resize:'vertical' }} />
        </div>
        <Btn variant="primary" size="lg" wide disabled={!canContinue} onClick={() => navigate('kyc-verify-identity', { form, resubmitId: resubmitMode ? existingKyc?.id : undefined })} style={{ background: canContinue ? `linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` : undefined, boxShadow: canContinue ? '0 10px 28px rgba(108,77,255,0.35)' : 'none' }}>
          Continue
          <Icon name="arrowLeft" size={16} color="#fff" style={{ transform:'rotate(180deg)' }} />
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Step 2a: Verify Identity (document type) ───────────
function KycVerifyIdentityScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [docType, setDocType] = React.useState(null);
  const docTypes = [
    { key:'passport', icon:'mail',     label:'Passport',           detail:'Official travel document' },
    { key:'id',       icon:'user',     label:'National ID',        detail:'National or state ID card' },
    { key:'work',     icon:'store',    label:'Work Permit',        detail:'Proof of work or business permit' },
    { key:'license',  icon:'creditCard', label:'Driver License',   detail:'Permit, license or authorization' },
  ];
  const notes = [
    'Documents must be valid (not expired)',
    'All information must be clearly visible',
    'No screenshots allowed',
    'Photos must be real-time captures',
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Verify Your Identity" onBack={goBack} />
        <KycStepper step={1} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 600 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:4 }}>Verify Your Identity</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5 }}>For the safety of buyers and sellers, identity verification is required.</div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:10 }}>Choose document type</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {docTypes.map(d => (
              <button key={d.key} onClick={() => setDocType(d.key)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'14px', borderRadius:14, cursor:'pointer', textAlign:'left',
                border:`1.5px solid ${docType === d.key ? C.primary : C.hairline}`,
                background: docType === d.key ? C.primarySoft : C.white,
                boxShadow: docType === d.key ? `0 4px 16px rgba(108,77,255,0.14)` : '0 1px 4px rgba(14,11,31,0.04)',
                transition:'all 0.15s',
              }}>
                <div style={{ width:42, height:42, borderRadius:9999, background: docType === d.key ? C.primary : C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon name={d.icon} size={19} color={docType === d.key ? '#fff' : C.primary} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14.5, fontWeight:700, color:C.ink }}>{d.label}</div>
                  <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>{d.detail}</div>
                </div>
                <Icon name="chevronRight" size={17} color={docType === d.key ? C.primary : C.mute} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:C.primarySoft, borderRadius:12, padding:'12px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
            <Icon name="help" size={14} color={C.primaryDeep} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color:C.primaryDeep }}>Important notes</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {notes.map((n, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Icon name="check" size={12} color={C.primaryDeep} sw={2.5} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.primaryDeep }}>{n}</span>
              </div>
            ))}
          </div>
        </div>

        <Btn variant="primary" size="lg" wide disabled={!docType} onClick={() => navigate('kyc-doc', { ...params, docType })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow: docType ? '0 10px 28px rgba(108,77,255,0.35)' : 'none' }}>
          Continue
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Step 2b: Upload documents (front + back) ───────────
function KycDocScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [frontFile, setFrontFile] = React.useState(null);
  const [backFile, setBackFile]   = React.useState(null);
  const front = !!frontFile, back = !!backFile;
  const frontRef = React.useRef(null);
  const backRef = React.useRef(null);
  const docLabels = { passport:'Passport', id:'National ID', work:'Work Permit', license:'Driver License', student:'Student ID' };
  const docLabel = docLabels[params.docType] || 'ID document';

  function UploadZone({ done, fileName, onCapture }) {
    return (
      <div onClick={onCapture} style={{ border:`2px dashed ${done ? C.success : C.hairline}`, borderRadius:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', background: done ? '#EFF9F4' : C.white, transition:'all 0.2s', minHeight:150, padding:16 }}>
        {done ? (
          <>
            <Icon name="checkCircle" size={32} color={C.success} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.success }}>{fileName}</span>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Tap to replace</span>
          </>
        ) : (
          <>
            <div style={{ width:46, height:46, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="camera" size={20} color={C.primary} />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:600, color:C.ink, textAlign:'center' }}>Tap to choose a photo</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Upload Documents" onBack={goBack} />
        <KycStepper step={1} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 600 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>Selected document</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:19, fontWeight:800, color:C.ink, letterSpacing:'-0.02em' }}>{docLabel}</div>
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Front side {docLabel !== 'Passport' ? '(ID page)' : ''}</div>
          <UploadZone done={front} fileName={frontFile?.name} onCapture={() => frontRef.current?.click()} />
          <input ref={frontRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => setFrontFile(e.target.files?.[0] || null)} />
        </div>

        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, marginBottom:8 }}>Back side {docLabel === 'Passport' ? '(optional)' : ''}</div>
          <UploadZone done={back} fileName={backFile?.name} onCapture={() => backRef.current?.click()} />
          <input ref={backRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => setBackFile(e.target.files?.[0] || null)} />
        </div>

        <div style={{ background:C.paper, borderRadius:10, padding:'10px 14px', display:'flex', gap:8, alignItems:'flex-start' }}>
          <Icon name="lock" size={14} color={C.mute} style={{ marginTop:1, flexShrink:0 }} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, lineHeight:1.4 }}>Private upload. Clorivo never shares your documents with buyers or other sellers — only staff reviewing your application can see them.</span>
        </div>

        <Btn variant="primary" size="lg" wide disabled={!front} onClick={() => navigate('kyc-selfie-intro', { ...params, frontFile, backFile })} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow: front ? '0 10px 28px rgba(108,77,255,0.35)' : 'none' }}>
          Continue
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Step 3a: Face Verification Intro ───────────────────
function KycSelfieIntroScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const rules = [
    { icon:'camera',  text:'Take a clear, well-lit photo of your face' },
    { icon:'user',    text:'Ensure your face is clearly visible' },
    { icon:'x',       text:'Remove sunglasses or masks' },
    { icon:'lock',    text:'A staff member reviews this manually — it is not an automated biometric check' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Face Verification" onBack={goBack} />
        <KycStepper step={2} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:20, alignItems:'center', textAlign:'center', maxWidth: isDesktop ? 500 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div style={{ width:100, height:100, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', marginTop:8, animation:'floatY 3.2s ease-in-out infinite' }}>
          <Icon name="camera" size={44} color={C.primary} />
        </div>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:6 }}>Live Face Verification</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute, lineHeight:1.5, maxWidth:300 }}>We'll take a quick live selfie to confirm you match your ID document.</div>
        </div>
        <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:10, textAlign:'left' }}>
          {rules.map((r, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:C.white, border:`1px solid ${C.hairline}`, borderRadius:12 }}>
              <div style={{ width:32, height:32, borderRadius:9999, background:C.primarySoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon name={r.icon} size={15} color={C.primary} />
              </div>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13.5, color:C.ink, fontWeight:500 }}>{r.text}</span>
            </div>
          ))}
        </div>
        <Btn variant="primary" size="lg" wide onClick={() => navigate('kyc-selfie', params)} style={{ background:`linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)`, boxShadow:'0 10px 28px rgba(108,77,255,0.35)' }}>
          <Icon name="camera" size={17} color="#fff" />
          Start Camera
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Step 3b: Live selfie camera ─────────────────────────
function KycSelfieScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [selfieFile, setSelfieFile] = React.useState(null);
  const fileRef = React.useRef(null);
  // This is a photo for a staff member to manually compare against the ID
  // document — not an automated liveness/biometric match. The "progress"
  // below only reflects whether a photo has been selected, nothing more.
  const progress = selfieFile ? 4 : 0;

  const checks = [
    'Face clearly visible',
    'Good lighting',
    'No sunglasses or masks',
    'Matches the name on your ID',
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:'#0A0812', display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      <div style={{ paddingTop:STATUS_H, flexShrink:0 }}>
        <NavBar title="Face Verification" onBack={goBack} transparent light />
        <div style={{ padding:'6px 20px 4px' }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10.5, fontWeight:600, color:'rgba(255,255,255,0.5)', textAlign:'center', marginBottom:6 }}>Step 3 of 4</div>
          <div style={{ display:'flex', gap:6 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:9999, background: i <= 2 ? C.primary : 'rgba(255,255,255,0.15)' }} />)}
          </div>
        </div>
      </div>
      <div style={{ flex:1, padding:'10px 20px 0', display:'flex', flexDirection:'column', gap:14, maxWidth: isDesktop ? 480 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:20, fontWeight:800, color:'#fff' }}>Position your face in the circle</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:4 }}>Follow the instructions, then blink slowly</div>
        </div>
        {/* Face oval */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
          <div style={{ width:200, height:250, borderRadius:'50%', border:`3px solid ${progress >= 4 ? C.success : C.primary}`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color 0.5s', boxShadow: progress >= 4 ? `0 0 0 6px rgba(31,138,91,0.18)` : `0 0 0 6px rgba(108,77,255,0.15)` }}>
            <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:`2px dashed ${C.primary}`, opacity:0.3 }} />
            <svg viewBox="0 0 80 100" style={{ width:'60%', opacity:0.35 }}>
              <ellipse cx="40" cy="45" rx="26" ry="34" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="30" cy="40" r="2.5" fill="#fff"/><circle cx="50" cy="40" r="2.5" fill="#fff"/>
              <path d="M32 60 Q40 68 48 60" fill="none" stroke="#fff" strokeWidth="1.5"/>
            </svg>
            {progress >= 4 && (
              <div style={{ position:'absolute', width:56, height:56, borderRadius:9999, background:'rgba(31,138,91,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="check" size={28} color={C.success} sw={2.5} />
              </div>
            )}
          </div>
          <div style={{ position:'absolute', bottom:-20, fontFamily:"'Inter',sans-serif", fontSize:13, color: progress >= 4 ? C.success : C.primary, fontWeight:600 }}>
            {progress >= 4 ? '✓ Photo ready' : '○ Waiting for photo…'}
          </div>
        </div>
        {/* Checklist */}
        <div style={{ background:'rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:6 }}>
          {checks.slice(0, Math.min(progress + 1, checks.length)).map((c, i) => (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', fontFamily:"'Inter',sans-serif", fontSize:13 }}>
              {i < progress ? <Icon name="check" size={14} color={C.success} sw={2} /> : <div style={{ width:14, height:14, borderRadius:9999, border:`1.5px solid ${C.primary}`, flexShrink:0 }} />}
              <span style={{ color: i < progress ? 'rgba(255,255,255,0.7)' : i === progress ? '#fff' : 'rgba(255,255,255,0.4)' }}>{c}</span>
            </div>
          ))}
        </div>
        {/* Camera controls */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:32, padding:'6px 0 10px' }}>
          <button onClick={() => setFlash(f => !f)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer' }}>
            <div style={{ width:44, height:44, borderRadius:9999, background: flash ? C.primary : 'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="zap" size={18} color="#fff" />
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.6)' }}>Flash</span>
          </button>
          <button onClick={() => fileRef.current?.click()} style={{ width:64, height:64, borderRadius:9999, background:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 0 3px rgba(255,255,255,0.25)' }}>
            <div style={{ width:52, height:52, borderRadius:9999, background: progress >= 4 ? C.success : C.primary, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.3s' }}>
              <Icon name="camera" size={22} color="#fff" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display:'none' }} onChange={e => setSelfieFile(e.target.files?.[0] || null)} />
          <button style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, border:'none', background:'none', cursor:'pointer' }}>
            <div style={{ width:44, height:44, borderRadius:9999, background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </div>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:'rgba(255,255,255,0.6)' }}>Flip</span>
          </button>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.35)', textAlign:'center' }}>{selfieFile ? selfieFile.name : 'Tap the camera button to choose a photo'}</div>
        <Btn variant="primary" size="lg" wide onClick={() => navigate('kyc-review', { ...params, selfieFile })} disabled={progress < 4} style={{ background: progress >= 4 ? `linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` : undefined }}>
          Continue
        </Btn>
        <div style={{ height:16 }} />
      </div>
    </div>
  );
}

// ─── KYC — Step 4: Review & Submit ─────────────────────────────
function KycReviewScreen({ params = {} }) {
  const { navigate, goBack } = useNav();
  const isDesktop = useIsDesktop();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const f = params.form || {};
  const rows = [
    ['First Name', f.firstName || '—'],
    ['Last Name',  f.lastName  || '—'],
    ['Date of Birth', f.dob    || '—'],
    ['Email', f.email || '—'],
    ['Phone', f.phone ? `${f.countryCode || ''} ${f.phone}` : '—'],
    ['Nationality', f.nationality || '—'],
    ['Country of Origin', f.originCountry || '—'],
    ['Country of Residence', f.country || '—'],
    ['City', f.city || '—'],
    ['Shop Name', f.shopName || '—'],
    ['ID Document', params.docType || '—'],
  ];
  const hasFront = !!params.frontFile, hasSelfie = !!params.selfieFile;
  const canSubmit = hasFront && hasSelfie && !submitting;

  // Submitting creates a kyc_requests row with status forced to 'pending'
  // by the database regardless of anything sent here (see
  // protect_kyc_request_fields_trg) — no role or verification change
  // happens until an authorized reviewer calls admin_review_kyc().
  async function handleSubmit() {
    if (!canSubmit) { setError('A front document photo and a selfie are both required.'); return; }
    setSubmitting(true); setError('');
    const files = { front: params.frontFile, back: params.backFile, selfie: params.selfieFile };
    const { error: submitError } = params.resubmitId
      ? await sbResubmitKyc(params.resubmitId, { ...f, docType: params.docType }, files)
      : await sbSubmitKyc({ ...f, docType: params.docType }, files);
    setSubmitting(false);
    if (submitError) { setError(submitError.message || 'Could not submit your application.'); return; }
    navigate('kyc-success');
  }

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Review & Submit" onBack={goBack} />
        <KycStepper step={3} />
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'18px 20px 40px', display:'flex', flexDirection:'column', gap:16, maxWidth: isDesktop ? 600 : undefined, width:'100%', margin: isDesktop ? '0 auto' : undefined }}>
        <div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:22, fontWeight:800, color:C.ink, letterSpacing:'-0.03em', marginBottom:4 }}>Review your information</div>
          <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14, color:C.mute }}>Make sure everything is correct before submitting.</div>
        </div>

        <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.hairline}`, overflow:'hidden' }}>
          {rows.map(([label, value], i) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'12px 16px', borderTop: i > 0 ? `1px solid ${C.hairline}` : 'none' }}>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>{label}</span>
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:600, color:C.ink, textAlign:'right' }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background: hasFront ? '#EFF9F4' : '#FDEDED', borderRadius:12 }}>
            <Icon name={hasFront ? 'checkCircle' : 'x'} size={20} color={hasFront ? C.success : C.danger} />
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color: hasFront ? C.success : C.danger }}>{hasFront ? 'Document added' : 'Document missing'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Pending staff review</div>
            </div>
          </div>
          <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background: hasSelfie ? '#EFF9F4' : '#FDEDED', borderRadius:12 }}>
            <Icon name={hasSelfie ? 'checkCircle' : 'x'} size={20} color={hasSelfie ? C.success : C.danger} />
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, fontWeight:700, color: hasSelfie ? C.success : C.danger }}>{hasSelfie ? 'Photo added' : 'Photo missing'}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Pending staff review</div>
            </div>
          </div>
        </div>

        {error && (
          <div role="alert" style={{ background:'#FDEDED', border:`1px solid ${C.danger}`, borderRadius:10, padding:'10px 14px', fontFamily:"'Inter',sans-serif", fontSize:12.5, color:C.danger }}>{error}</div>
        )}

        <div style={{ flex:1 }} />
        <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
          <Icon name="lock" size={12} color={C.mute} />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.mute }}>Your documents are private — only authorized staff can review them</span>
        </div>
        <Btn variant="primary" size="lg" wide onClick={handleSubmit} disabled={!canSubmit} style={{ background: canSubmit ? `linear-gradient(135deg, ${C.primary} 0%, #8A6BFF 100%)` : undefined, boxShadow: canSubmit ? '0 10px 28px rgba(108,77,255,0.35)' : 'none' }}>
          {submitting ? 'Submitting…' : 'Submit Application'}
        </Btn>
      </div>
    </div>
  );
}

// ─── KYC — Success / Pending Approval ──────────────────────────
function KycSuccessScreen() {
  const { navigate } = useNav();
  const isDesktop = useIsDesktop();
  return (
    <div style={{ position:'absolute', inset:0, background:`linear-gradient(160deg, #12102A 0%, ${C.primaryDeep} 55%, ${C.primary} 100%)`, display:'flex', flexDirection:'column', alignItems:'center', overflow:'hidden' }}>
      <StatusBar light />
      {/* Confetti dots */}
      {[...Array(16)].map((_, i) => (
        <div key={i} style={{ position:'absolute', top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, borderRadius:9999, background: ['#fff','#FFD166','#8A6BFF','#4ADE80'][i % 4], opacity:0.5 }} />
      ))}
      <div style={{ width:'100%', maxWidth: isDesktop ? 440 : undefined, flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, position:'relative', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, position:'absolute', top: STATUS_H + 12 }}>
          <Icon name="shoppingBag" size={18} color="#fff" />
          <span style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>CLORIVO</span>
        </div>

        <div style={{ width:96, height:96, borderRadius:9999, background:'rgba(255,255,255,0.15)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
          <div style={{ width:72, height:72, borderRadius:9999, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="check" size={34} color={C.primary} sw={3} />
          </div>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:23, fontWeight:800, color:'#fff', letterSpacing:'-0.03em', textAlign:'center', marginBottom:10, lineHeight:1.3 }}>Your Application Has Been Submitted</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:14.5, color:'rgba(255,255,255,0.8)', textAlign:'center', lineHeight:1.5, marginBottom:28, maxWidth:300 }}>We are reviewing your information.</div>

        <div style={{ background:'rgba(255,255,255,0.1)', backdropFilter:'blur(6px)', borderRadius:16, padding:'16px', width:'100%', marginBottom:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:9999, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="package" size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.65)' }}>Application Status</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:'#fff' }}>Under Review</div>
            </div>
          </div>
          <div style={{ height:1, background:'rgba(255,255,255,0.15)' }} />
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:9999, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon name="bell" size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, color:'rgba(255,255,255,0.65)' }}>Estimated Review Time</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:'#fff' }}>24 – 48 Hours</div>
            </div>
          </div>
        </div>

        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12.5, color:'rgba(255,255,255,0.7)', textAlign:'center', marginBottom:24 }}>We'll send you an email once your account is active.</div>

        <Btn variant="dark" size="lg" wide onClick={() => navigate('home')} style={{ background:'#fff', color:C.primary }}>Go to Dashboard</Btn>
      </div>
    </div>
  );
}

// ─── SELLER DASHBOARD ─────────────────────────────────────────
function SellerDashboardScreen() {
  const { navigate } = useNav();
  const [stats, setStats] = React.useState(null);
  const [shopId, setShopId] = React.useState(null);
  const [sellerName, setSellerName] = React.useState(window._PROFILE?.name || 'My Shop');

  React.useEffect(() => {
    sbGetUser().then(async user => {
      if (!user) return;
      const profile = await sbGetProfile(user.id);
      if (profile?.shop_id) {
        setShopId(profile.shop_id);
        const s = await sbGetSellerStats(profile.shop_id);
        setStats(s);
        const shop = await sbGetShop(profile.shop_id);
        if (shop?.name) setSellerName(shop.name);
      } else {
        setStats(_DEMO_SELLER_STATS ?? { orders:0, products:0, revenue:0, followers:0, rating:0 });
      }
    });
  }, []);

  const kpis = [
    { k:'Orders',   v: stats ? String(stats.orders)  : '0' },
    { k:'Revenue',  v: stats ? '$' + (stats.revenue ?? 0).toFixed(0) : '$0' },
    { k:'Products', v: stats ? String(stats.products) : '0' },
    { k:'Rating',   v: stats && stats.rating ? String(stats.rating) : '—' },
  ];
  const sellerOrders = window._DEMO_SELLER_ORDERS || [];
  const data = [0,0,0,0,0,0,0];
  const days = ['M','T','W','T','F','S','S'];
  const maxV = Math.max(1, ...data);
  const W = 310, H = 80;
  const pts = data.map((v, i) => [(i / (data.length-1)) * W, H - (v/maxV)*(H-10) - 5]);
  const polyline = pts.map(p => p.join(',')).join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;

  const navItems = [
    { icon:'package',  label:'Orders', badge:sellerOrders.filter(o=>o.orders?.status==='pending').length, action: () => navigate('seller-orders') },
    { icon:'store',    label:'Products',  badge:0,  action: () => {} },
    { icon:'creditCard',label:'Wallet',   badge:0,  action: () => {} },
    { icon:'barChart', label:'Analytics', badge:0,  action: () => {} },
    { icon:'zap',      label:'Withdraw',   badge:0,  action: () => {} },
    { icon:'camera',   label:'CJ Import', badge:0,  action: () => navigate('cj-connect') },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar light />
      {/* Purple hero header */}
      <div style={{ paddingTop:STATUS_H, background:`linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDeep} 100%)`, padding:`${STATUS_H + 12}px 20px 20px`, flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:140, height:140, borderRadius:9999, background:'rgba(255,255,255,0.07)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <Avatar size={36} initials={sellerName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()} bg="rgba(255,255,255,0.2)" style={{ border:'2px solid rgba(255,255,255,0.3)' }} />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.75)' }}>Welcome,</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:16, fontWeight:700, color:'#fff' }}>{sellerName}</div>
          </div>
          <button onClick={() => navigate('home')} style={{ border:'none', background:'rgba(255,255,255,0.15)', borderRadius:9999, padding:'6px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Icon name="store" size={13} color="#fff" />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'#fff', fontWeight:500 }}>Buyer mode</span>
          </button>
        </div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:'rgba(255,255,255,0.75)', marginBottom:2 }}>Available balance</div>
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>${(stats?.revenue ?? 2481.04).toFixed(2)}</div>
        <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:'rgba(255,255,255,0.75)', marginTop:2, marginBottom:14 }}>↗ +$184 this week</div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="soft" size="sm" style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>Withdraw</Btn>
          <Btn variant="soft" size="sm" style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>+ Product</Btn>
          <Btn variant="soft" size="sm" onClick={() => navigate('cj-connect')} style={{ background:'rgba(255,255,255,0.18)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>Import from CJ</Btn>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', paddingBottom:30, display:'flex', flexDirection:'column', gap:14 }}>
        {/* Shop preview card */}
        <div onClick={() => navigate('shop-customize')} style={{ background:C.white, borderRadius:16, padding:'14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', cursor:'pointer', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:54, height:54, borderRadius:14, background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon name="store" size={26} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>My shop</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginTop:1 }}>Preview & customization · banners, logo, featured items</div>
          </div>
          <Icon name="chevronRight" size={18} color={C.mute} />
        </div>

        {/* KPI grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background:C.white, borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:4 }}>{k.k}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div style={{ background:C.white, borderRadius:14, padding:'14px 16px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:700, color:C.ink, letterSpacing:'-0.01em' }}>Revenue · 7 days</span>
            <div style={{ background:C.primarySoft, borderRadius:9999, padding:'4px 10px' }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:C.primary }}>$1 312</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, overflow:'visible' }}>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity="0.18"/>
                <stop offset="100%" stopColor={C.primary} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#sg)" />
            <polyline points={polyline} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="4" fill={C.primary} />
            <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="8" fill={C.primary} opacity="0.2" />
          </svg>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            {days.map((d, i) => <span key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:C.mute, flex:1, textAlign:'center' }}>{d}</span>)}
          </div>
        </div>

        {/* Quick nav grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
          {navItems.map((n, i) => (
            <button key={i} onClick={n.action} style={{ background:C.white, border:'none', borderRadius:14, padding:'14px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, boxShadow:'0 2px 10px rgba(14,11,31,0.05)', position:'relative' }}>
              <Icon name={n.icon} size={22} color={C.mute} />
              <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:500, color:C.ink }}>{n.label}</span>
              {n.badge > 0 && (
                <div style={{ position:'absolute', top:8, right:12, width:18, height:18, borderRadius:9999, background:C.primary, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:10, fontWeight:700, color:'#fff' }}>{n.badge}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SELLER ORDERS ────────────────────────────────────────────
function SellerOrdersScreen() {
  const { navigate, goBack } = useNav();
  const [filter, setFilter] = React.useState(1);
  const filters = ['All','New','Packed','Shipped','Returns'];
  const orders = [];
  return (
    <div style={{ position:'absolute', inset:0, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar />
      <div style={{ paddingTop:STATUS_H, background:C.white, borderBottom:`1px solid ${C.hairline}`, flexShrink:0 }}>
        <NavBar title="Orders" onBack={goBack} right={
          <button style={{ width:44, height:44, border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="search" size={20} color={C.mute} />
          </button>
        } />
        <div style={{ display:'flex', gap:8, padding:'6px 16px 12px', overflowX:'auto' }}>
          {filters.map((f, i) => <Chip key={i} active={filter === i} onClick={() => setFilter(i)}>{f}</Chip>)}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10, paddingBottom:30 }}>
        {orders.length === 0 && (
          <div style={{ padding:'40px 16px', textAlign:'center' }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.mute }}>No orders yet</span>
          </div>
        )}
        {orders.map((o, i) => (
          <div key={i} style={{ background:C.white, borderRadius:14, padding:'12px 14px', boxShadow:'0 2px 10px rgba(14,11,31,0.05)', display:'flex', gap:12 }}>
            <Img label="" tint={i % 5} style={{ width:52, height:52, borderRadius:10, flexShrink:0 }} />
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600, color:C.primary }}>{o.id}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:C.ink }}>{o.price}</span>
              </div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, fontWeight:500, color:C.ink, marginBottom:2 }}>{o.sku}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.mute, marginBottom:6 }}>{o.buyer} · qty {o.qty}</div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span style={{ background: o.status === 'new' ? C.primarySoft : C.paper, color: o.status === 'new' ? C.primaryDeep : C.mute, fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:9999 }}>{o.status}</span>
                {o.urgent && <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600, color:C.danger }}>Ship today</span>}
                <button style={{ marginLeft:'auto', border:'none', background:'none', cursor:'pointer', fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.primary }}>Process →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  SellerWelcomeScreen, BecomeSellerScreen,
  KycVerifyIdentityScreen, KycDocScreen, KycSelfieIntroScreen, KycSelfieScreen,
  KycReviewScreen, KycSuccessScreen,
  SellerDashboardScreen, SellerOrdersScreen,
});
