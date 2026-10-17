// Supabase Edge Function: on-shipment-status
// Triggered by Database Webhook on shipments UPDATE
// Sends email + push to the BUYER when ONE seller's shipment changes
// status. Never notifies any seller about another seller's shipment —
// this function only ever reads/sends to the order's buyer_id.
//
// Deploy: supabase functions deploy on-shipment-status
// Webhook: Dashboard → Database → Webhooks → shipments UPDATE → POST this function URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_URL   = `${SUPABASE_URL}/functions/v1/send-notification`;
const RESEND_URL   = 'https://api.resend.com/emails';
const FROM         = 'Clorivo <onboarding@resend.dev>';

const authHeader = () => ({
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
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

// Only these three transitions produce a buyer-facing notification — a
// shipment moving pending->processing, or an admin_override correction
// with no real-world meaning to the buyer, stays silent on purpose.
const STATUS_CONFIG: Record<string, { emoji: string; label: string; color: string; message: string; templateKey: string }> = {
  shipped:    { emoji: '📦', label: 'Expédié',           color: '#3B82F6', message: 'Un vendeur a expédié une partie de votre commande.', templateKey: 'shipment_shipped' },
  in_transit: { emoji: '🚚', label: 'En transit',        color: '#3B82F6', message: 'Votre colis est en chemin.',                          templateKey: 'shipment_shipped' },
  delivered:  { emoji: '🎉', label: 'Livré',             color: '#10B981', message: 'Un colis de votre commande est arrivé. Profitez bien de vos achats !', templateKey: 'shipment_delivered' },
  failed:     { emoji: '⚠️', label: 'Problème de livraison', color: '#EF4444', message: 'Un problème est survenu avec la livraison d\'un colis de votre commande.', templateKey: 'shipment_delivery_failed' },
};

function emailShipmentUpdate(order: any, shipment: any, shopName: string, buyerName: string): string {
  const cfg = STATUS_CONFIG[shipment.status];

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
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0E0B1F;">Expédition ${cfg.label}</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#6B7280;">Bonjour <strong>${buyerName}</strong>,</p>
    <p style="margin:0;font-size:15px;color:#6B7280;">${cfg.message}</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:#F9F8FF;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Commande</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#6C4DFF;">#${order.id.slice(0,8).toUpperCase()}</p></td>
        <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Vendu par</p>
            <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#0E0B1F;">${shopName}</p></td>
      </tr></table>
    </div>
    ${shipment.tracking_number ? `<div style="background:#ECFDF5;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:12px;color:#065F46;font-weight:600;text-transform:uppercase;">Numéro de suivi (fourni par le vendeur)</p>
      <p style="margin:0;font-size:16px;font-weight:800;color:#059669;font-family:monospace;">${shipment.tracking_number}</p>
      ${shipment.carrier ? `<p style="margin:4px 0 0;font-size:12px;color:#065F46;">Transporteur : ${shipment.carrier}</p>` : ''}
    </div>` : ''}
    ${shipment.status === 'failed' && shipment.failure_reason ? `<div style="background:#FEF2F2;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#991B1B;">${shipment.failure_reason}</p>
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
  const { record: shipment, old_record: oldShipment } = await req.json();

  // Only act on an actual status change, and only on transitions the
  // buyer cares about — never on an admin_override that merely corrects
  // a typo without a real status change, and never twice for the same
  // transition.
  if (!shipment || !oldShipment || shipment.status === oldShipment.status) {
    return new Response(JSON.stringify({ ok: true, skipped: true }));
  }
  const cfg = STATUS_CONFIG[shipment.status];
  if (!cfg) return new Response(JSON.stringify({ ok: true, skipped: 'status not buyer-facing' }));

  const { data: order } = await supabase
    .from('orders').select('id, buyer_id').eq('id', shipment.order_id).single();
  if (!order) return new Response(JSON.stringify({ ok: true, skipped: 'order not found' }));

  const [{ data: buyer }, { data: shop }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', order.buyer_id).single(),
    shipment.shop_id ? supabase.from('shops').select('name').eq('id', shipment.shop_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const buyerName  = buyer?.full_name ?? 'Client';
  const buyerEmail = buyer?.email;
  const shopName   = shop?.name ?? 'Un vendeur';

  // Push notification — to the BUYER only. No seller, on this order or
  // any other, is ever notified by this function.
  await fetch(NOTIFY_URL, {
    method: 'POST', headers: authHeader(),
    body: JSON.stringify({
      user_id: order.buyer_id,
      type: 'shipment',
      title: `${cfg.emoji} ${cfg.label} — ${shopName}`,
      body: `#${order.id.slice(0,8).toUpperCase()} — ${cfg.message.slice(0, 80)}`,
      data: { order_id: order.id, shipment_id: shipment.id },
    }),
  });

  if (buyerEmail) {
    await sendEmail(
      buyerEmail,
      `${cfg.emoji} ${cfg.label} — #${order.id.slice(0,8).toUpperCase()} — Clorivo`,
      emailShipmentUpdate(order, shipment, shopName, buyerName),
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
