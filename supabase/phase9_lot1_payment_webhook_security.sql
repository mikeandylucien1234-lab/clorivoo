-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 9, Lot 1: payment webhook processing core.
--
-- Adds the single, idempotent, server-only entry point a payment
-- provider's Edge Function webhook will call once its own signature
-- verification has passed: process_payment_webhook(). This migration
-- does NOT add any payment provider integration, any secret key, or
-- any Edge Function — it only builds the database-side guarantees
-- that integration will depend on:
--
--   * Idempotency: payment_webhook_events has a pre-existing unique
--     index on (provider, event_id). A duplicate delivery of the
--     same event hits that unique_violation and returns
--     {ok:true, duplicate:true} without touching any other table.
--   * No double confirmation: an intent already in a terminal state
--     ('succeeded'/'failed'/'cancelled') short-circuits to
--     {ok:true, already_resolved:true}. A *second, distinct* intent
--     on an order whose payment_status is already 'paid' is blocked
--     by the same early-exit, so a second payment can never confirm
--     an already-paid order.
--   * No invented confirmations: p_result is restricted to
--     ('processing','succeeded','failed','cancelled') — anything
--     else raises rather than silently mapping to a status.
--   * Commissions fire exactly once per order: the commission_ledger
--     insert loop only runs inside the 'succeeded' branch, which is
--     only reachable once per intent (guarded by the idempotency
--     insert + the two early-exits above).
--   * Stock conversion reuses the same deadlock-avoidance pattern as
--     admin_confirm_payment()/cancel_order(): variant rows are locked
--     in ascending id order before the per-item update loop.
--
-- protect_order_fields() (the BEFORE UPDATE trigger on orders) has no
-- branch for a server-to-server caller with no auth.uid() at all, so
-- it would otherwise silently discard this function's own, pre-
-- validated orders UPDATE. Fixed by adding one new bypass branch,
-- keyed on a session-local GUC the function sets/clears around its
-- own write (same pattern as the pre-existing
-- app.bypass_shipment_protection used by cancel_order()). The new
-- branch only ever forwards a payment_status transition to 'paid' or
-- 'failed' — never an arbitrary field change — and the flag itself
-- (set_config) lives in pg_catalog, which PostgREST never exposes, so
-- no client of any role can set it. Empirically verified this phase:
-- `SET ROLE authenticated` + a direct call to process_payment_webhook
-- fails with "permission denied for function process_payment_webhook"
-- (no EXECUTE grant to authenticated/anon at all — only the service
-- role, i.e. an Edge Function, can call it).
--
-- admin_get_payment_webhook_events() gives admins read-only
-- visibility into the webhook event log (gated by the pre-existing
-- 'payments.view' permission) since the table itself has RLS enabled
-- with no policies.
--
-- Security/reliability test pass completed this phase (QA data only,
-- all synthetic rows cleaned up afterward): duplicate webhook replay
-- never double-processes; a second intent cannot confirm an
-- already-paid order; invalid p_result values are rejected; a
-- terminal-state flip (failed -> succeeded) is rejected; commissions
-- are created exactly once despite repeated confirmation attempts;
-- the bypass flag is unreachable by any authenticated/anon caller;
-- webhook_events.result and audit log entries carry only
-- provider/event_id/status strings, never raw payload or secrets.
-- Webhook *signature* verification (point 3 of that pass) is an
-- Edge-Function-layer concern and does not exist yet — it will be
-- verified when each provider's Edge Function is built, not here.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

alter table public.payment_webhook_events enable row level security;

create or replace function public.protect_order_fields()
returns trigger language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_requested_payment_status text;
  v_requested_status text;
begin
  if public.has_permission(auth.uid(), 'orders.edit') then
    if new.status is distinct from old.status then
      perform public.log_audit('order_status_changed', 'orders', new.id::text,
        jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
    end if;
    return new;
  end if;

  if public.has_permission(auth.uid(), 'orders.cancel') and new.status = 'cancelled' and old.status in ('pending','confirmed') then
    new := old;
    new.status := 'cancelled';
    new.updated_at := now();
    perform public.log_audit('order_cancelled', 'orders', new.id::text,
      jsonb_build_object('status', old.status), jsonb_build_object('status', 'cancelled'));
    return new;
  end if;

  if public.has_permission(auth.uid(), 'payments.confirm') then
    v_requested_payment_status := new.payment_status;
    v_requested_status := new.status;
    if v_requested_payment_status is distinct from old.payment_status
       and v_requested_payment_status in ('paid','failed','refunded','partially_refunded') then
      new := old;
      new.payment_status := v_requested_payment_status;
      if v_requested_payment_status = 'paid' and old.status = 'pending' and v_requested_status = 'confirmed' then
        new.status := 'confirmed';
      end if;
      new.updated_at := now();
      perform public.log_audit('order_payment_status_changed', 'orders', new.id::text,
        jsonb_build_object('payment_status', old.payment_status), jsonb_build_object('payment_status', v_requested_payment_status));
      return new;
    end if;
  end if;

  -- Fallback: cancel_order() already verified (buyer ownership OR orders.cancel permission)
  -- before issuing its UPDATE. Forward only the 'cancelled' transition it itself produced.
  if current_setting('app.bypass_shipment_protection', true) = 'true'
     and new.status = 'cancelled' and old.status in ('pending','confirmed','processing') then
    new := old;
    new.status := 'cancelled';
    new.updated_at := now();
    perform public.log_audit('order_cancelled', 'orders', new.id::text,
      jsonb_build_object('status', old.status), jsonb_build_object('status', 'cancelled'));
    return new;
  end if;

  -- Fallback: process_payment_webhook() already verified the event through
  -- webhook signature verification (in the Edge Function) and its own
  -- idempotency gate before issuing this UPDATE. Forward only the
  -- payment_status transition it itself produced — never an arbitrary one.
  if current_setting('app.bypass_payment_webhook_protection', true) = 'true'
     and new.payment_status is distinct from old.payment_status
     and new.payment_status in ('paid','failed') then
    v_requested_payment_status := new.payment_status;
    v_requested_status := new.status;
    new := old;
    new.payment_status := v_requested_payment_status;
    if v_requested_payment_status = 'paid' and old.status = 'pending' and v_requested_status = 'confirmed' then
      new.status := 'confirmed';
    end if;
    new.updated_at := now();
    perform public.log_audit('order_payment_status_changed', 'orders', new.id::text,
      jsonb_build_object('payment_status', old.payment_status), jsonb_build_object('payment_status', v_requested_payment_status));
    return new;
  end if;

  return old;
end;
$function$;

create or replace function public.process_payment_webhook(
  p_provider text,
  p_event_id text,
  p_intent_id uuid,
  p_result text,
  p_provider_reference text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_event_row record;
  v_intent record;
  v_order record;
  v_rate numeric;
  v_seller record;
  v_item record;
  v_variant_ids uuid[];
begin
  if p_result not in ('processing','succeeded','failed','cancelled') then
    raise exception 'Invalid result: %', p_result;
  end if;
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'A provider event id is required for idempotency';
  end if;

  begin
    insert into public.payment_webhook_events (provider, event_id, payload, received_at)
    values (p_provider, p_event_id, p_payload, now())
    returning * into v_event_row;
  exception when unique_violation then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end;

  select * into v_intent from public.payment_intents where id = p_intent_id for update;
  if v_intent.id is null then
    update public.payment_webhook_events set processed_at = now(), result = 'error: intent not found' where id = v_event_row.id;
    raise exception 'Payment intent not found';
  end if;
  if v_intent.provider <> p_provider then
    update public.payment_webhook_events set processed_at = now(), result = 'error: provider mismatch' where id = v_event_row.id;
    raise exception 'Provider mismatch for this payment intent';
  end if;

  if v_intent.status in ('succeeded','failed','cancelled') then
    update public.payment_webhook_events set processed_at = now(), result = 'skipped: already resolved' where id = v_event_row.id;
    return jsonb_build_object('ok', true, 'already_resolved', true);
  end if;

  select * into v_order from public.orders where id = v_intent.order_id for update;
  if p_result = 'succeeded' and v_order.payment_status = 'paid' then
    update public.payment_webhook_events set processed_at = now(), result = 'skipped: order already paid' where id = v_event_row.id;
    return jsonb_build_object('ok', true, 'already_resolved', true);
  end if;

  update public.payment_intents set
    status = p_result,
    provider_reference = coalesce(p_provider_reference, provider_reference),
    failure_reason = case when p_result in ('failed','cancelled') then 'Reported by provider webhook' else failure_reason end,
    confirmed_at = case when p_result in ('succeeded','failed','cancelled') then now() else confirmed_at end,
    updated_at = now()
  where id = p_intent_id;

  if p_result = 'succeeded' then
    perform set_config('app.bypass_payment_webhook_protection', 'true', true);
    update public.orders set payment_status = 'paid',
      status = case when status = 'pending' then 'confirmed' else status end
    where id = v_order.id;
    perform set_config('app.bypass_payment_webhook_protection', 'false', true);

    v_rate := coalesce(v_order.commission_rate, 0);
    for v_seller in
      select seller_id, shop_id, sum(unit_price * quantity) as gross
      from public.order_items where order_id = v_order.id group by seller_id, shop_id
    loop
      insert into public.commission_ledger (
        order_id, seller_id, shop_id, payment_intent_id, gross_amount, commission_rate, commission_amount, net_amount, entry_type, status
      ) values (
        v_order.id, v_seller.seller_id, v_seller.shop_id, p_intent_id, v_seller.gross, v_rate,
        round(v_seller.gross * v_rate, 2), round(v_seller.gross * (1 - v_rate), 2), 'charge', 'confirmed'
      );
    end loop;

    select array_agg(distinct variant_id order by variant_id) into v_variant_ids
    from public.order_items
    where order_id = v_order.id and reservation_status = 'active' and variant_id is not null;
    if v_variant_ids is not null then
      perform 1 from public.product_variants where id = any(v_variant_ids) order by id for update;
    end if;

    perform set_config('app.bypass_shipment_protection', 'true', true);
    for v_item in
      select oi.id, oi.variant_id, oi.quantity, oi.reservation_status
      from public.order_items oi
      where order_id = v_order.id and reservation_status = 'active'
      order by oi.id for update of oi
    loop
      if v_item.reservation_status is distinct from 'active' then continue; end if;
      if v_item.variant_id is not null then
        update public.product_variants set stock = stock - v_item.quantity, reserved = reserved - v_item.quantity
        where id = v_item.variant_id;
      end if;
      update public.order_items set reservation_status = 'converted' where id = v_item.id and reservation_status = 'active';
    end loop;
    perform set_config('app.bypass_shipment_protection', 'false', true);
  elsif p_result in ('failed','cancelled') then
    perform set_config('app.bypass_payment_webhook_protection', 'true', true);
    update public.orders set payment_status = 'failed' where id = v_order.id;
    perform set_config('app.bypass_payment_webhook_protection', 'false', true);
  end if;

  update public.payment_webhook_events set processed_at = now(), result = 'processed: ' || p_result where id = v_event_row.id;
  perform public.log_audit('payment_webhook_' || p_result, 'payment_intents', p_intent_id::text, null,
    jsonb_build_object('provider', p_provider, 'event_id', p_event_id));

  return jsonb_build_object('ok', true, 'status', p_result);
end;
$function$;
-- Deliberately NOT granted to authenticated/anon: only callable by the
-- service role, i.e. an Edge Function holding the service key after it
-- has independently verified the provider's webhook signature.
revoke all on function public.process_payment_webhook(text, text, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_get_payment_webhook_events(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'payments.view') then
    raise exception 'Permission denied: payments.view required';
  end if;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.received_at desc), '[]'::jsonb) into v_result
  from (select * from public.payment_webhook_events order by received_at desc limit p_limit) e;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_payment_webhook_events(integer) from public, anon;
grant execute on function public.admin_get_payment_webhook_events(integer) to authenticated;
