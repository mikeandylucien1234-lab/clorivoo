// Supabase Edge Function: health-check
// Deploy: supabase functions deploy health-check
//
// Purpose: a dedicated, side-effect-free probe the Admin Dashboard's
// Health section invokes to verify Edge Functions are actually
// deployed and reachable. Every other deployed function in this
// project (send-email, on-new-order, …) does real, consequential
// work — invoking one of those just to "check if functions work"
// would send a real email or push notification. This function does
// nothing but confirm it was reached and that it can do real work on
// the caller's behalf.
//
// Same security posture as send-broadcast: no service-role key here.
// The privileged check — is this caller a real authenticated
// admin/permitted staff member (has_permission(auth.uid(),
// 'system.health')) — happens inside admin_health_ping(), a
// SECURITY DEFINER RPC, called with the CALLER's own JWT forwarded
// through a caller-scoped client. A request with no valid session, or
// a JWT belonging to an unpermitted account, is rejected by the RPC
// itself and surfaces here as 403 — this function never decides
// authorization on its own.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

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

  // Caller-scoped client: the RPC below runs AS this specific user,
  // via auth.uid() resolved from the forwarded Authorization header —
  // never a client-supplied user id or role.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await callerClient.rpc('admin_health_ping');

  if (error) {
    // Covers both an actual DB/network failure and the RPC's own
    // "Permission denied: system.health required" exception — either
    // way this is never reported as a 200 success.
    const status = /permission denied/i.test(error.message) ? 403 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ ok: true, function: 'health-check', server_time: data?.server_time ?? null }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
