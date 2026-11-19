// Supabase Edge Function: send-broadcast
// Sends a push notification to a segment of users (all, buyers, sellers)
// Deploy: supabase functions deploy send-broadcast
//
// PHASE 6 SECURITY HARDENING: this function no longer uses the
// service-role key or does the notifications insert itself. Every
// privileged step — verifying the caller is a real authenticated
// admin/permitted staff member (has_permission(auth.uid(),
// 'notifications.broadcast')), computing the recipient segment, and
// writing the notifications rows — now happens inside the
// admin_send_broadcast() SECURITY DEFINER RPC (see
// supabase/phase6_notifications_security_migration.sql), using the
// CALLER's own JWT, never a client-supplied user_id or role. This
// function's only remaining job is the one thing a Postgres RPC can't
// do directly: the outbound HTTP calls to Expo's push API, using the
// push tokens the RPC already decided are the right ones.
//
// A request with no valid session (no JWT, or a JWT belonging to a
// buyer/seller/unpermitted staff account) is rejected by the RPC
// itself, which is returned as 403 before any push is sent.
//
// admin_send_broadcast() reports a permission denial via a returned
// {ok:false, error} value, not a raised exception — raising would
// roll back the denial's own audit-log row (PL/pgSQL has no
// autonomous-transaction mechanism; confirmed by live testing). So
// both `error` (an actual unexpected DB/network failure) and
// `data.ok === false` (an authorization denial the RPC deliberately
// reported) must be checked here — neither path falls through to
// sending a push.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE    = 100;

interface BroadcastPayload {
  segment?: 'all' | 'buyers' | 'sellers';
  type?:    'promo' | 'marketing' | 'system';
  title:    string;
  body:     string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Caller-scoped client: carries the REAL requester's own JWT (anon
  // key is the project's public key, not a privilege — the RPC call
  // below runs as that specific user, with auth.uid() resolved from
  // the Authorization header, not from anything in the request body).
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { segment = 'all', type = 'promo', title, body }: BroadcastPayload = await req.json();

  const { data, error } = await callerClient.rpc('admin_send_broadcast', {
    p_segment: segment, p_type: type, p_title: title, p_body: body,
  });

  if (error) {
    // Validation failures (bad segment, missing title/body) still raise
    // and surface here — never a silent fallback to "send anyway."
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!data?.ok) {
    // A permission denial, reported as a value rather than an exception
    // so its own audit-log row survives — never a silent fallback to
    // "send anyway," and never reported as a 200 success.
    return new Response(JSON.stringify({ error: data?.error ?? 'Unauthorized' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const tokens: string[] = data?.push_tokens ?? [];
  let sent = 0;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE).map((to: string) => ({ to, title, body, sound: 'default' }));
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(batch),
    });
    sent += batch.length;
  }

  return new Response(JSON.stringify({ success: true, recipients: data?.recipients ?? sent }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
