// Supabase Edge Function: on-order-status
// Triggered by Database Webhook on orders UPDATE
// Sends email + push to buyer when order status changes
//
// Deploy: supabase functions deploy on-order-status
// Webhook: Dashboard → Database → Webhooks → orders UPDATE → POST this function URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_URL   = `${SUPABASE_URL}/functions/v1/send-notification`;
const RESEND_URL   = 'https://api.resend.com/emails';
const FROM         = 'Clorivo <onboarding@resend.dev>';

const authHeader = () => ({
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'x-internal-secret': Deno.env.get('INTERNAL_FUNCTION_SECRET') ?? '',
});

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

const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; message: string }> = {
  confirmed:  { emoji: '✅', label: 'Confirmée',   color: '#6C4DFF', message: 'Votre commande a été confirmée et est en cours de préparation.' },
  processing: { emoji: '⚙️', label: 'En traitement', color: '#3B82F6', message: 'Votre commande est en cours de traitement.' },
  shipped:    { emoji: '🚚', label: 'Expédiée',    color: '#3B82F6', message: 'Votre commande est en chemin ! Vous la recevrez bientôt.' },
  delivered:  { emoji: '🎁', label: 'Livrée',      color: '#10B981', message: 'Votre commande a été livrée. Profitez bien de vos achats !' },
  cancelled:  { emoji: '❌', label: 'Annulée',     color: '#EF4444', message: 'Votre commande a été annulée.' },
};

function emailStatusUpdate(order: any, status: string, buyerName: string, trackingNumber?: string): string {
  const cfg = STATUS_CONFIG[status] ?? { emoji: '📋', label: status, color: '#6C4DFF', message: 'Le statut de votre commande a été mis à jour.' };

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F4F2FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2FF;padding:40px 0;">
<tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(108,77,255,0.10);">
  <tr><td style="background:linear-gradient(135deg,#6C4DFF 0%,#8B6EFF 100%);padding:32px 40px;text-align:center;">
    <span style="font-size:30px;font-weight:900;color:#fff;letter-spacing:-1.5px;">clorivo</span>
    <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:3px;text-transform:uppercase;">shop · sell · ship</p>
  </td></tr>
  <tr><td style="padding:36px 40px 0;text-align:center;">
    <div style="width:64px;height:64px;border-radius:50%;background:${cfg.color}18;margin:0 auto 16px;text-align:center;line-height:64px;font-size:32px;">${cfg.emoji}</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0E0B1F;">Commande ${cfg.label}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#6B7280;">Bonjour <strong>${buyerName}</strong>,</p>
    <p style="margin:0;font-size:15px;color:#6B7280;">${cfg.message}</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:#F9F8FF;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Commande</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#6C4DFF;">#${order.id.slice(0,8).toUpperCase()}</p></td>
        <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Statut</p>
            <p style="margin:4px 0 0;"><span style="display:inline-block;background:${cfg.color}18;color:${cfg.color};font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;">${cfg.label}</span></p></td>
      </tr></table>
    </div>
    ${trackingNumber ? `<div style="background:#ECFDF5;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#065F46;font-weight:600;text-transform:uppercase;">Numéro de suivi</p>
      <p style="margin:0;font-size:16px;font-weight:800;color:#059669;font-family:monospace;">${trackingNumber}</p>
    </div>` : ''}
  </td></tr>
  <tr><td style="background:#F9F8FF;padding:20px 40px;border-top:1px solid #EDE9FF;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">© 2025 Clorivo — Des questions ? Contactez notre support.</p>
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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { record: order, old_record: oldOrder } = await req.json();

  // Only act on status changes
  if (!order || !oldOrder || order.status === oldOrder.status) {
    return new Response(JSON.stringify({ ok: true, skipped: true }));
  }

  const cfg = STATUS_CONFIG[order.status];
  if (!cfg) return new Response(JSON.stringify({ ok: true, skipped: 'unknown status' }));

  const { data: buyer } = await supabase
    .from('profiles').select('full_name, email').eq('id', order.buyer_id).single();

  const buyerName  = buyer?.full_name ?? 'Client';
  const buyerEmail = buyer?.email;

  // Push notification
  await fetch(NOTIFY_URL, {
    method: 'POST', headers: authHeader(),
    body: JSON.stringify({
      user_id: order.buyer_id,
      type: 'order',
      title: `${cfg.emoji} Commande ${cfg.label}`,
      body: `#${order.id.slice(0,8).toUpperCase()} — ${cfg.message.slice(0, 80)}`,
      data: { order_id: order.id },
    }),
  });

  // Email
  if (buyerEmail) {
    await sendEmail(
      buyerEmail,
      `${cfg.emoji} Commande ${cfg.label} — #${order.id.slice(0,8).toUpperCase()} — Clorivo`,
      emailStatusUpdate(order, order.status, buyerName, order.tracking_number),
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
