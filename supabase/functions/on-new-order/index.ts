// Supabase Edge Function: on-new-order
// Triggered by Database Webhook on orders INSERT
// 1. Sends push notification to buyer + sellers
// 2. Sends confirmation email to buyer
// 3. Sends new-order email to each seller
//
// Deploy: supabase functions deploy on-new-order
// Webhook: Dashboard → Database → Webhooks → orders INSERT → POST this function URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const NOTIFY_URL   = `${SUPABASE_URL}/functions/v1/send-notification`;
const RESEND_URL   = 'https://api.resend.com/emails';
const FROM         = 'Clorivo <onboarding@resend.dev>';

// x-internal-secret is what proves to send-notification (Phase 6
// hardening) that this call comes from a trusted internal webhook
// function, not an arbitrary request carrying only the service key.
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

function emailOrderConfirmation(order: any, items: any[], buyerName: string): string {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:12px;vertical-align:top;width:60px;">
            ${i.image_url
              ? `<img src="${i.image_url}" width="56" height="56" style="border-radius:8px;object-fit:cover;display:block;"/>`
              : `<div style="width:56px;height:56px;background:#F0EDFF;border-radius:8px;"></div>`}
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0 0 3px;font-size:14px;font-weight:600;color:#0E0B1F;">${i.title}</p>
            ${i.variant && Object.keys(i.variant).length
              ? `<p style="margin:0 0 3px;font-size:12px;color:#9CA3AF;">${Object.entries(i.variant).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>`
              : ''}
            <p style="margin:0;font-size:12px;color:#6B7280;">Qté : ${i.quantity}</p>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#0E0B1F;">$${Number(i.unit_price * i.quantity).toFixed(2)}</p>
          </td>
        </tr></table>
      </td>
    </tr>`).join('');

  const addr    = order.shipping_address ?? {};
  const addrStr = [addr.street, addr.city, addr.zip, addr.country].filter(Boolean).join(', ');

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
    <div style="width:64px;height:64px;border-radius:50%;background:#ECFDF5;margin:0 auto 16px;text-align:center;line-height:64px;font-size:32px;">🎉</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0E0B1F;">Commande confirmée !</h1>
    <p style="margin:0 0 4px;font-size:15px;color:#6B7280;">Bonjour <strong>${buyerName}</strong>,</p>
    <p style="margin:0;font-size:15px;color:#6B7280;">Votre commande a bien été reçue et est en cours de traitement.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:#F9F8FF;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Numéro</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#6C4DFF;">#${order.id.slice(0,8).toUpperCase()}</p></td>
        <td style="text-align:right;"><p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Total</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#0E0B1F;">$${Number(order.total_amount).toFixed(2)}</p></td>
      </tr></table>
    </div>
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0E0B1F;">Articles commandés</h2>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    ${addrStr ? `<div style="margin-top:20px;background:#F9F8FF;border-radius:12px;padding:14px 18px;">
      <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;">Livraison à</p>
      <p style="margin:0;font-size:14px;color:#0E0B1F;">${addrStr}</p>
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

function emailNewOrderSeller(order: any, sellerItems: any[], shopName: string): string {
  const itemRows = sellerItems.map(i => `
    <tr><td style="padding:10px 0;border-bottom:1px solid #F3F4F6;font-size:14px;color:#0E0B1F;">
      <strong>${i.title}</strong> × ${i.quantity}
      <span style="float:right;font-weight:700;">$${Number(i.unit_price * i.quantity).toFixed(2)}</span>
    </td></tr>`).join('');

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
    <div style="width:64px;height:64px;border-radius:50%;background:#EFF6FF;margin:0 auto 16px;text-align:center;line-height:64px;font-size:32px;">📦</div>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0E0B1F;">Nouvelle commande !</h1>
    <p style="margin:0;font-size:15px;color:#6B7280;">Bonjour <strong>${shopName}</strong>, vous avez reçu une nouvelle commande.</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <div style="background:#F0EDFF;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#6C4DFF;font-weight:600;">Commande #${order.id.slice(0,8).toUpperCase()}</p>
      <p style="margin:6px 0 0;font-size:26px;font-weight:900;color:#0E0B1F;">$${Number(order.total_amount).toFixed(2)}</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    <div style="margin-top:20px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#6B7280;">Connectez-vous à votre tableau de bord pour traiter cette commande.</p>
    </div>
  </td></tr>
  <tr><td style="background:#F9F8FF;padding:20px 40px;border-top:1px solid #EDE9FF;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">© 2025 Clorivo</p>
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
  const { record: order } = await req.json();

  // Fetch order items + buyer profile
  const [{ data: items }, { data: buyer }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', order.id),
    supabase.from('profiles').select('full_name, email').eq('id', order.buyer_id).single(),
  ]);

  const allItems   = items ?? [];
  const buyerName  = buyer?.full_name ?? 'Client';
  const buyerEmail = buyer?.email;

  // Push + email to buyer
  await fetch(NOTIFY_URL, {
    method: 'POST', headers: authHeader(),
    body: JSON.stringify({
      user_id: order.buyer_id,
      type: 'order',
      title: 'Commande confirmée 🎉',
      body: `Commande #${order.id.slice(0,8).toUpperCase()} — $${Number(order.total_amount).toFixed(2)}`,
      data: { order_id: order.id },
    }),
  });

  if (buyerEmail) {
    await sendEmail(
      buyerEmail,
      `Commande confirmée #${order.id.slice(0,8).toUpperCase()} — Clorivo`,
      emailOrderConfirmation(order, allItems, buyerName),
    );
  }

  // Group items by seller
  const sellerMap = new Map<string, typeof allItems>();
  for (const item of allItems) {
    if (!item.seller_id) continue;
    if (!sellerMap.has(item.seller_id)) sellerMap.set(item.seller_id, []);
    sellerMap.get(item.seller_id)!.push(item);
  }

  // Push + email to each seller
  for (const [sellerId, sellerItems] of sellerMap) {
    await fetch(NOTIFY_URL, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({
        user_id: sellerId,
        type: 'order',
        title: 'Nouvelle commande 📦',
        body: `$${Number(order.total_amount).toFixed(2)} — ${sellerItems.length} article(s)`,
        data: { order_id: order.id },
      }),
    });

    const [{ data: sellerProfile }, { data: shop }] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', sellerId).single(),
      supabase.from('shops').select('name').eq('seller_id', sellerId).maybeSingle(),
    ]);

    if (sellerProfile?.email) {
      await sendEmail(
        sellerProfile.email,
        `Nouvelle commande #${order.id.slice(0,8).toUpperCase()} — Clorivo`,
        emailNewOrderSeller(order, sellerItems, shop?.name ?? sellerProfile.full_name ?? 'Vendeur'),
      );
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
