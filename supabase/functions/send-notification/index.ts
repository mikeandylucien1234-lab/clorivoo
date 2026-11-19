// Supabase Edge Function: send-notification
// Sends an Expo push notification + saves it to the notifications table
// Deploy: supabase functions deploy send-notification
//
// PHASE 6 SECURITY HARDENING: this function is called only by the
// Database-Webhook-triggered functions (on-new-order, on-order-status,
// on-shipment-status, on-new-message) — there is no "acting user" for
// a system-generated transactional notification (auth.uid() would be
// null for a server-to-server call), so this is NOT gated by
// has_permission() the way admin_send_broadcast/admin_send_notification
// are. Instead it requires a shared secret only those internal callers
// know (set once as the INTERNAL_FUNCTION_SECRET function secret and
// read from the same env var on both sides — never shipped to any
// client, web or mobile). A request with a missing/incorrect secret is
// rejected before the service-role client is even created.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const INTERNAL_SECRET = Deno.env.get('INTERNAL_FUNCTION_SECRET');

interface NotificationPayload {
  user_id: string;
  type: 'order' | 'message' | 'promo' | 'system';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// H1 fix (second-pass audit): plain `!==` on two strings short-circuits on
// the first differing byte, which is not a constant-time comparison. This
// hashes both sides to a fixed-length digest first (so the comparison cost
// never depends on the caller-supplied string's length or content) and then
// compares every byte of the digests without early exit.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const bufA = new Uint8Array(digestA);
  const bufB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret' } });
  }

  // Fail closed: no fallback for a missing/empty configured or provided
  // secret, and every comparison (even an empty-vs-empty one) still goes
  // through the constant-time path above.
  const providedSecret = req.headers.get('x-internal-secret');
  const secretIsValid =
    !!INTERNAL_SECRET &&
    typeof providedSecret === 'string' &&
    providedSecret.length > 0 &&
    (await timingSafeEqual(providedSecret, INTERNAL_SECRET));

  if (!secretIsValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const payload: NotificationPayload = await req.json();
  const { user_id, type, title, body, data = {} } = payload;

  // 1. Save to notifications table
  await supabase.from('notifications').insert({ user_id, type, title, body, data });

  // 2. Get push token
  const { data: profile } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', user_id)
    .single();

  if (profile?.push_token?.startsWith('ExponentPushToken[')) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify({
        to: profile.push_token,
        title,
        body,
        data,
        sound: 'default',
        badge: 1,
        channelId: type === 'message' ? 'messages' : 'default',
      }),
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
