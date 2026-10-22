// Supabase Edge Function: on-new-message
// Triggered by Database Webhook on messages INSERT
// Notifies the other participant of the conversation
// Deploy: supabase functions deploy on-new-message

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NOTIFY_URL  = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
const RESEND_URL  = 'https://api.resend.com/emails';
const FROM        = 'Clorivo <onboarding@resend.dev>';

async function sendEmail(to: string, subject: string, html: string) {
  const testOverride = Deno.env.get('TEST_EMAIL_OVERRIDE');
  const recipient = testOverride ?? to;
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [recipient], subject: testOverride ? `[TEST -> ${to}] ${subject}` : subject, html }),
  });
  if (!res.ok) console.error('Resend error:', await res.json().catch(() => ({})));
}

function emailNewMessage(senderName: string, messagePreview: string, productTitle?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F4F2FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2FF;padding:40px 0;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(108,77,255,0.10);">
  <tr><td style="background:linear-gradient(135deg,#6C4DFF 0%,#8B6EFF 100%);padding:32px 40px;text-align:center;">
    <span style="font-size:30px;font-weight:900;color:#fff;letter-spacing:-1.5px;">clorivo</span>
    <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:3px;text-transform:uppercase;">shop &middot; sell &middot; ship</p>
  </td></tr>
  <tr><td style="padding:36px 40px 0;text-align:center;">
    <div style="width:64px;height:64px;border-radius:50%;background:#F0EDFF;margin:0 auto 16px;text-align:center;line-height:64px;font-size:32px;">&#128172;</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0E0B1F;">Nouveau message</h1>
    <p style="margin:0;font-size:15px;color:#6B7280;"><strong>${senderName}</strong> vous a envoy&#233; un message.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    ${productTitle ? `<div style="background:#F0EDFF;border-radius:10px;padding:10px 14px;margin-bottom:16px;">
      <p style="margin:0;font-size:12px;color:#6C4DFF;font-weight:600;">&#128230; ${productTitle}</p>
    </div>` : ''}
    <div style="background:#F9F8FF;border-radius:12px;padding:16px 20px;border-left:4px solid #6C4DFF;">
      <p style="margin:0;font-size:15px;color:#0E0B1F;font-style:italic;">&ldquo;${messagePreview}&rdquo;</p>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#6B7280;">Ouvrez l'application Clorivo pour r&#233;pondre.</p>
    </div>
  </td></tr>
  <tr><td style="background:#F9F8FF;padding:20px 40px;border-top:1px solid #EDE9FF;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">&#169; 2025 Clorivo</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { record: message } = await req.json();
  const authHeader = {
    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    'Content-Type': 'application/json',
    'x-internal-secret': Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '',
  };

  // Get conversation participants
  const { data: conv } = await supabase
    .from('conversations')
    .select('buyer_id, seller_id, products(title)')
    .eq('id', message.conversation_id)
    .single();

  if (!conv) return new Response('ok');

  // Get sender name
  const { data: sender } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', message.sender_id)
    .single();

  const senderName = sender?.full_name ?? 'Quelqu\'un';
  const recipient  = message.sender_id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
  const productTitle = (conv.products as any)?.title;

  // Push notification
  await fetch(NOTIFY_URL, {
    method: 'POST', headers: authHeader,
    body: JSON.stringify({
      user_id: recipient,
      type: 'message',
      title: `${senderName}`,
      body: productTitle
        ? `A propos de "${productTitle}" : ${message.content.slice(0, 80)}`
        : message.content.slice(0, 100),
      data: { conversation_id: message.conversation_id },
    }),
  });

  // Email notification
  const { data: recipientProfile } = await supabase
    .from('profiles').select('email').eq('id', recipient).single();

  if (recipientProfile?.email) {
    await sendEmail(
      recipientProfile.email,
      `Nouveau message de ${senderName} — Clorivo`,
      emailNewMessage(senderName, message.content.slice(0, 200), productTitle),
    );
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
});
