// Supabase Edge Function: send-individual-notification
// Sends one push + in-app notification to a single, admin-chosen user.
// Deploy: supabase functions deploy send-individual-notification
//
// New in Phase 6, replacing the mobile app's previous sendNotificationToUser()
// (mobile/clorivo-mobile/src/lib/supabase.js), which inserted into
// notifications and read the target's push_token directly from the
// client. Same architecture as send-broadcast: the privileged work
// (permission check + insert) happens inside the admin_send_notification()
// SECURITY DEFINER RPC, scoped to the caller's own verified JWT — this
// function only does the outbound Expo push call with the token the
// RPC already authorized releasing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface IndividualPayload {
  userId: string;
  type?:  'order' | 'message' | 'promo' | 'system';
  title:  string;
  body:   string;
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

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { userId, type = 'system', title, body }: IndividualPayload = await req.json();

  const { data, error } = await callerClient.rpc('admin_send_notification', {
    p_user_id: userId, p_type: type, p_title: title, p_body: body,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!data?.ok) {
    // admin_send_notification() reports a permission denial via this
    // returned {ok:false, error} value, not a raised exception — so its
    // own audit-log row survives the call instead of being rolled back
    // (PL/pgSQL has no autonomous-transaction mechanism). Must be
    // checked here so a denial is never reported as a 200 success.
    return new Response(JSON.stringify({ error: data?.error ?? 'Unauthorized' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const token: string | null = data?.push_token ?? null;
  if (token?.startsWith('ExponentPushToken[')) {
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default' }),
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});
