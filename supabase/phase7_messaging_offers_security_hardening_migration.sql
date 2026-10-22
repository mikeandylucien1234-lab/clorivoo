-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 7: Secure Marketplace Messaging & Offers
-- Consolidates everything applied this phase that was NOT already
-- captured by the tracked Supabase migrations
-- (messaging_offers_trust_safety_tables, seed_scam_filter_patterns,
-- scam_detection_functions, send_chat_message_function): the
-- remaining RPC functions, the automatic-offer-expiration cron job,
-- hardened versions of send_chat_message / detect_scam_content /
-- respond_to_offer (rate-limiting, double-submission protection,
-- a fixed word-boundary regex bug, and broadened anti-scam pattern
-- coverage found during the Section 11 multilingual test battery),
-- and the new/fixed scam_filter_patterns rows.
--
-- Idempotent: every statement is CREATE OR REPLACE / safe re-insert,
-- so re-running this against the live project (where these objects
-- already exist) is a no-op.
-- ─────────────────────────────────────────────────────────────────

-- ─── Offer lifecycle RPCs ───────────────────────────────────────
create or replace function public.create_price_offer(p_conversation_id uuid, p_product_id uuid, p_offered_price numeric, p_quantity integer default 1)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_conv record;
  v_product record;
  v_seller_id uuid;
  v_offer record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_offered_price is null or p_offered_price <= 0 then raise exception 'The offered price must be greater than zero'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Quantity must be a positive number'; end if;

  select * into v_conv from public.conversations where id = p_conversation_id for update;
  if v_conv.id is null then raise exception 'Conversation not found'; end if;
  if v_conv.buyer_id <> v_user and v_conv.seller_id <> v_user then
    raise exception 'You are not a participant in this conversation';
  end if;

  select id, price, shop_id, status, approval_status into v_product from public.products where id = p_product_id for update;
  if v_product.id is null then raise exception 'Product not found'; end if;
  if v_product.status <> 'active' or v_product.approval_status <> 'approved' then
    raise exception 'This product is not available';
  end if;

  select seller_id into v_seller_id from public.shops where id = v_product.shop_id;
  if v_seller_id is null then raise exception 'This product has no seller shop'; end if;

  if exists (
    select 1 from public.offers
    where conversation_id = p_conversation_id and product_id = p_product_id and status = 'PENDING'
  ) then
    raise exception 'There is already a pending offer for this product in this conversation';
  end if;

  insert into public.offers (
    conversation_id, product_id, buyer_id, seller_id, original_price, offered_price, quantity, proposed_by
  ) values (
    p_conversation_id, p_product_id, v_conv.buyer_id, v_seller_id, v_product.price, p_offered_price, p_quantity, v_user
  ) returning * into v_offer;

  perform public.log_audit('offer_created', 'offers', v_offer.id::text, null,
    jsonb_build_object('offered_price', p_offered_price, 'quantity', p_quantity));

  return jsonb_build_object('ok', true, 'offer', to_jsonb(v_offer));
end;
$function$;
revoke all on function public.create_price_offer(uuid, uuid, numeric, integer) from public, anon;
grant execute on function public.create_price_offer(uuid, uuid, numeric, integer) to authenticated;

-- respond_to_offer: accept / decline / counter / cancel.
-- Hardening applied this phase: the inline "mark EXPIRED" update on
-- the expiry path was dead code (it was always rolled back by the
-- RAISE EXCEPTION that followed it in the same transaction) — removed.
-- Expiry is still fully enforced via the expires_at check below, and
-- the expire_stale_offers() cron job sweeps the status within 10 min.
create or replace function public.respond_to_offer(p_offer_id uuid, p_decision text, p_counter_price numeric default null, p_counter_quantity integer default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_offer record;
  v_product record;
  v_new_offer record;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('accept','decline','counter','cancel') then raise exception 'Invalid decision'; end if;

  select * into v_offer from public.offers where id = p_offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  if v_offer.buyer_id <> v_user and v_offer.seller_id <> v_user then
    raise exception 'You are not a party to this offer';
  end if;

  if v_offer.status <> 'PENDING' then
    raise exception 'This offer is no longer pending (status: %)', v_offer.status;
  end if;
  if v_offer.expires_at < now() then
    raise exception 'This offer has expired and can no longer be acted on';
  end if;

  if v_offer.proposed_by = v_user and p_decision <> 'cancel' then
    raise exception 'You cannot accept, decline, or counter your own offer — wait for the other party to respond';
  end if;

  if p_decision = 'cancel' then
    if v_offer.proposed_by <> v_user then raise exception 'Only the person who made this offer can cancel it'; end if;
    update public.offers set status = 'CANCELLED', decided_at = now(), decided_by = v_user where id = v_offer.id returning * into v_offer;
    return jsonb_build_object('ok', true, 'offer', to_jsonb(v_offer));
  end if;

  if p_decision = 'decline' then
    update public.offers set status = 'DECLINED', decided_at = now(), decided_by = v_user where id = v_offer.id returning * into v_offer;
    return jsonb_build_object('ok', true, 'offer', to_jsonb(v_offer));
  end if;

  if p_decision = 'accept' then
    select id, status, approval_status into v_product from public.products where id = v_offer.product_id;
    if v_product.id is null or v_product.status <> 'active' or v_product.approval_status <> 'approved' then
      raise exception 'This product is no longer available';
    end if;
    update public.offers set status = 'ACCEPTED', decided_at = now(), decided_by = v_user where id = v_offer.id returning * into v_offer;
    perform public.log_audit('offer_accepted', 'offers', v_offer.id::text, null, jsonb_build_object('offered_price', v_offer.offered_price));
    return jsonb_build_object('ok', true, 'offer', to_jsonb(v_offer));
  end if;

  if p_decision = 'counter' then
    if p_counter_price is null or p_counter_price <= 0 then raise exception 'The counter-offer price must be greater than zero'; end if;
    update public.offers set status = 'COUNTERED', decided_at = now(), decided_by = v_user where id = v_offer.id;
    insert into public.offers (
      conversation_id, product_id, buyer_id, seller_id, original_price, offered_price, quantity, proposed_by, parent_offer_id
    ) values (
      v_offer.conversation_id, v_offer.product_id, v_offer.buyer_id, v_offer.seller_id, v_offer.original_price,
      p_counter_price, coalesce(p_counter_quantity, v_offer.quantity), v_user, v_offer.id
    ) returning * into v_new_offer;
    return jsonb_build_object('ok', true, 'offer', to_jsonb(v_new_offer));
  end if;
end;
$function$;
revoke all on function public.respond_to_offer(uuid, text, numeric, integer) from public, anon;
grant execute on function public.respond_to_offer(uuid, text, numeric, integer) to authenticated;

create or replace function public.expire_stale_offers() returns void language sql security definer set search_path to 'public','pg_temp'
as $function$ update public.offers set status='EXPIRED' where status='PENDING' and expires_at < now(); $function$;
revoke all on function public.expire_stale_offers() from public, anon, authenticated;
grant execute on function public.expire_stale_offers() to service_role;

select cron.schedule('expire-stale-offers', '*/10 * * * *', $cron$select public.expire_stale_offers();$cron$)
where not exists (select 1 from cron.job where jobname = 'expire-stale-offers');

-- ─── Reporting / moderation RPCs ────────────────────────────────
create or replace function public.report_user(p_reported_id uuid, p_conversation_id uuid, p_reason text, p_details text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_report record;
  v_recent_count int;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_reported_id = v_user then raise exception 'You cannot report yourself'; end if;
  if p_reason not in ('external_payment_request','contact_sharing_attempt','suspected_fraud','fake_payment','harassment','threats','misleading_product','confidential_info_request','other') then
    raise exception 'Invalid report reason';
  end if;

  if p_conversation_id is not null then
    if not exists (
      select 1 from public.conversations
      where id = p_conversation_id and (buyer_id = v_user or seller_id = v_user)
        and (buyer_id = p_reported_id or seller_id = p_reported_id)
    ) then
      raise exception 'You can only report a user from a conversation you both participate in';
    end if;
  end if;

  select count(*) into v_recent_count from public.user_reports
  where reporter_id = v_user and created_at > now() - interval '10 minutes';
  if v_recent_count >= 5 then
    raise exception 'Too many reports submitted recently — please try again later';
  end if;

  insert into public.user_reports (reporter_id, reported_id, conversation_id, reason, details)
  values (v_user, p_reported_id, p_conversation_id, p_reason, p_details)
  returning * into v_report;

  return jsonb_build_object('ok', true, 'report_id', v_report.id);
end;
$function$;
revoke all on function public.report_user(uuid, uuid, text, text) from public, anon;
grant execute on function public.report_user(uuid, uuid, text, text) to authenticated;

create or replace function public.admin_review_report(p_report_id uuid, p_decision text, p_notes text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_report record;
begin
  if not public.has_permission(auth.uid(), 'trust_safety.moderate') then
    raise exception 'Permission denied: trust_safety.moderate required';
  end if;
  if p_decision not in ('REVIEWED','DISMISSED','ACTIONED') then raise exception 'Invalid decision'; end if;

  select * into v_report from public.user_reports where id = p_report_id for update;
  if v_report.id is null then raise exception 'Report not found'; end if;

  update public.user_reports set status = p_decision, reviewed_at = now(), reviewed_by = auth.uid() where id = p_report_id;

  perform public.log_audit('report_reviewed', 'user_reports', p_report_id::text,
    jsonb_build_object('status', v_report.status), jsonb_build_object('status', p_decision, 'notes', p_notes));

  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_review_report(uuid, text, text) from public, anon;
grant execute on function public.admin_review_report(uuid, text, text) to authenticated;

create or replace function public.admin_apply_violation(p_user_id uuid, p_violation_type text, p_severity text, p_action text, p_related_report_id uuid default null, p_notes text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_violation record;
begin
  if not public.has_permission(auth.uid(), 'trust_safety.moderate') then
    raise exception 'Permission denied: trust_safety.moderate required';
  end if;
  if p_severity not in ('warning','restriction','review','suspension') then raise exception 'Invalid severity'; end if;

  insert into public.user_violations (user_id, violation_type, severity, action_taken, related_report_id, decided_by, notes)
  values (p_user_id, p_violation_type, p_severity, p_action, p_related_report_id, auth.uid(), p_notes)
  returning * into v_violation;

  if p_severity = 'suspension' then
    update public.profiles set status = 'suspended' where id = p_user_id;
  end if;

  perform public.log_audit('violation_applied', 'user_violations', v_violation.id::text, null,
    jsonb_build_object('user_id', p_user_id, 'severity', p_severity, 'action', p_action));

  return jsonb_build_object('ok', true, 'violation_id', v_violation.id);
end;
$function$;
revoke all on function public.admin_apply_violation(uuid, text, text, text, uuid, text) from public, anon;
grant execute on function public.admin_apply_violation(uuid, text, text, text, uuid, text) to authenticated;

create or replace function public.admin_get_trust_safety_stats()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_blocked_total int;
  v_by_category jsonb;
  v_reports_open int;
  v_reports_total int;
  v_violations_total int;
begin
  if not public.has_permission(auth.uid(), 'trust_safety.view') and not public.has_permission(auth.uid(), 'trust_safety.moderate') then
    raise exception 'Permission denied: trust_safety.view required';
  end if;

  select count(*) into v_blocked_total from public.message_moderation_log;
  select coalesce(jsonb_object_agg(category, cnt), '{}'::jsonb) into v_by_category
    from (select category, count(*) as cnt from public.message_moderation_log group by category) s;
  select count(*) filter (where status = 'OPEN') into v_reports_open from public.user_reports;
  select count(*) into v_reports_total from public.user_reports;
  select count(*) into v_violations_total from public.user_violations;

  return jsonb_build_object(
    'blocked_messages_total', v_blocked_total,
    'blocked_by_category', v_by_category,
    'reports_open', v_reports_open,
    'reports_total', v_reports_total,
    'violations_total', v_violations_total
  );
end;
$function$;
revoke all on function public.admin_get_trust_safety_stats() from public, anon;
grant execute on function public.admin_get_trust_safety_stats() to authenticated;

create or replace function public.mark_messages_read(p_conversation_id uuid) returns void language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and (buyer_id = v_user or seller_id = v_user)
  ) then
    raise exception 'You are not a participant in this conversation';
  end if;

  update public.messages set read_at = now()
  where conversation_id = p_conversation_id and sender_id <> v_user and read_at is null;
end;
$function$;
revoke all on function public.mark_messages_read(uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid) to authenticated;

-- ─── Hardened detect_scam_content: fixes the warning-context guard
-- so negated share-verb phrasing is recognized across conjugations
-- (e.g. Spanish "compartas", French "partagez ... jamais") instead of
-- only exact dictionary forms. ───────────────────────────────────
create or replace function public.detect_scam_content(p_text text)
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_norm text; v_rule record; v_warning_context boolean;
begin
  v_norm := public.normalize_scam_check_text(p_text);
  v_warning_context :=
    v_norm ~* '\y(never|don.?t|do not|pa janm|jamais|ne jamais|nunca|ne)\y.{0,30}\m(shar|give|tell|send|partag|pataje|compart)'
    or v_norm ~* '\m(shar|give|tell|send|partag|pataje|compart)\w*.{0,30}\y(jamais|never|nunca|janm)\y';
  for v_rule in
    select id, category, pattern, severity from public.scam_filter_patterns
    where is_active = true
      and not (v_warning_context and category in ('personal_confidential', 'social_messaging'))
    order by category
  loop
    if v_norm ~* v_rule.pattern then
      return jsonb_build_object('allowed', v_rule.severity <> 'block', 'category', v_rule.category, 'pattern_id', v_rule.id, 'severity', v_rule.severity);
    end if;
  end loop;
  return jsonb_build_object('allowed', true);
end;
$function$;
revoke all on function public.detect_scam_content(text) from public, anon, authenticated;
grant execute on function public.detect_scam_content(text) to service_role;

-- ─── Hardened send_chat_message: adds the double-submission guard
-- and per-sender rate limiting required by Section 10 (these were
-- missing from the first version — found during the test battery). ──
create or replace function public.send_chat_message(p_conversation_id uuid, p_content text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_sender uuid := auth.uid();
  v_conv record;
  v_detection jsonb;
  v_message record;
  v_other uuid;
  v_trimmed text;
  v_recent_count int;
  v_dup_count int;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;

  v_trimmed := btrim(coalesce(p_content, ''));
  if v_trimmed = '' then raise exception 'Message cannot be empty'; end if;
  if length(v_trimmed) > 2000 then raise exception 'Message is too long'; end if;

  select * into v_conv from public.conversations where id = p_conversation_id for update;
  if v_conv.id is null then raise exception 'Conversation not found'; end if;
  if v_conv.buyer_id <> v_sender and v_conv.seller_id <> v_sender then
    raise exception 'You are not a participant in this conversation';
  end if;

  v_other := case when v_conv.buyer_id = v_sender then v_conv.seller_id else v_conv.buyer_id end;

  if exists (select 1 from public.user_blocks where blocker_id = v_other and blocked_id = v_sender) then
    raise exception 'You can no longer message this user';
  end if;

  select count(*) into v_dup_count from public.messages
    where conversation_id = p_conversation_id and sender_id = v_sender
      and content = v_trimmed and created_at > now() - interval '3 seconds';
  if v_dup_count > 0 then
    raise exception 'Duplicate message — please wait a moment before resending';
  end if;

  select count(*) into v_recent_count from public.messages
    where sender_id = v_sender and created_at > now() - interval '60 seconds';
  if v_recent_count >= 20 then
    raise exception 'You are sending messages too quickly — please slow down';
  end if;

  v_detection := public.detect_scam_content(v_trimmed);
  if not (v_detection->>'allowed')::boolean then
    insert into public.message_moderation_log (conversation_id, sender_id, category, pattern_id, content_excerpt)
    values (p_conversation_id, v_sender, v_detection->>'category', (v_detection->>'pattern_id')::uuid, left(v_trimmed, 60));
    return jsonb_build_object('ok', false, 'blocked_category', v_detection->>'category');
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_sender, v_trimmed)
  returning * into v_message;

  return jsonb_build_object('ok', true, 'message', to_jsonb(v_message));
end;
$function$;
revoke all on function public.send_chat_message(uuid, text) from public, anon;
grant execute on function public.send_chat_message(uuid, text) to authenticated;

-- ─── New / fixed anti-scam patterns found by the Section 11
-- multilingual test battery (bare-mention of unambiguous messaging
-- app brand names, verb-conjugation-tolerant payment/share-verb
-- matching, an explicit Clorivo platform-bypass phrase, English
-- "verification code" ordering, and home-address detection). ────────
insert into public.scam_filter_patterns (category, language, pattern, description, severity)
select * from (values
  ('social_messaging','all','\ywhatsapp\y|\ywasap\y|\ytelegram\y|\ysnapchat\y|\ywechat\y|\yviber\y', 'Bare mention of an unambiguous off-platform messaging app brand (messenger/signal/imo excluded as common English words)', 'block'),
  ('off_platform_payment','all','\m(send|pay|transfer|envoie|envoye|voye|mand|envi|paga)\w*.{0,25}\y(zelle|cash\s*app|cashapp|venmo|paypal|western\s*union|moneygram|moncash|natcash)\y','Request/offer to pay via an off-platform payment app (verb prefix, any conjugation)','block'),
  ('off_platform_payment','all','\y(zelle|cash\s*app|cashapp|venmo|paypal|western\s*union|moneygram|moncash|natcash)\y.{0,25}\m(send|pay|transfer|envoie|envoye|voye|mand|envi|paga)','Off-platform payment app mentioned near a payment verb (any conjugation)','block'),
  ('platform_bypass','all','\y(en\s*dehors|outside|fuera|deyo)\y.{0,20}\yclorivo\y|\yclorivo\y.{0,20}\y(en\s*dehors|outside|fuera|deyo)\y','Request to transact outside Clorivo specifically','block'),
  ('personal_confidential','en','\yverification\s*code\y|\ysecurity\s*code\y','English order: "verification code" / "security code"','block'),
  ('personal_confidential','all','\yhome\s*address\y|\ymy\s*address\y|\ymon\s*adresse\y|\ymi\s*direccion\y|\yadres\s*mwen\y|\d{1,5}\s+\w+(\s+\w+){0,2}\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\y','Home/street address sharing','block')
) as new_patterns(category, language, pattern, description, severity)
where not exists (
  select 1 from public.scam_filter_patterns p
  where p.category = new_patterns.category and p.pattern = new_patterns.pattern
);
