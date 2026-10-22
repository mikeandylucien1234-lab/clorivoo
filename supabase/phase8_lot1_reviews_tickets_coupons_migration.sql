-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 8, Lot 1: wire Admin Reviews / Support Tickets /
-- Coupons to the real database (they were previously backed by
-- window._ADMIN_REVIEWS / window._TICKETS / window._COUPONS, pure
-- client-memory demo data, even though the reviews/support_tickets/
-- coupons tables already existed and were already written to by
-- buyers/sellers on the real side).
--
-- Idempotent: safe to re-run against a project where this already
-- applied.
-- ─────────────────────────────────────────────────────────────────

alter table public.reviews add column if not exists is_hidden boolean not null default false;

insert into public.permissions (module, key, label)
select * from (values
  ('reports','reports.moderate','Hide or restore product reviews'),
  ('support','support.view','View support tickets'),
  ('support','support.manage','Respond to and update support tickets')
) as v(module, key, label)
where not exists (select 1 from public.permissions p where p.key = v.key);

create or replace function public.admin_get_reviews(p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'reports.view') then
    raise exception 'Permission denied: reports.view required';
  end if;
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select r.created_at,
      jsonb_build_object(
        'id', r.id, 'rating', r.rating, 'comment', r.comment, 'is_hidden', r.is_hidden, 'created_at', r.created_at,
        'buyer_name', coalesce(r.buyer_name, p.full_name, 'Anonymous'), 'product_title', pr.title
      ) as row_data
    from public.reviews r
    left join public.profiles p on p.id = r.buyer_id
    left join public.products pr on pr.id = r.product_id
    where p_status = 'all' or (p_status = 'hidden' and r.is_hidden) or (p_status = 'published' and not r.is_hidden)
  ) s;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_reviews(text) from public, anon;
grant execute on function public.admin_get_reviews(text) to authenticated;

create or replace function public.admin_moderate_review(p_review_id uuid, p_hidden boolean)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_before boolean;
begin
  if not public.has_permission(auth.uid(), 'reports.moderate') then
    raise exception 'Permission denied: reports.moderate required';
  end if;
  select is_hidden into v_before from public.reviews where id = p_review_id for update;
  if v_before is null then raise exception 'Review not found'; end if;
  update public.reviews set is_hidden = p_hidden where id = p_review_id;
  perform public.log_audit(case when p_hidden then 'review_hidden' else 'review_restored' end, 'reviews', p_review_id::text,
    jsonb_build_object('is_hidden', v_before), jsonb_build_object('is_hidden', p_hidden));
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_moderate_review(uuid, boolean) from public, anon;
grant execute on function public.admin_moderate_review(uuid, boolean) to authenticated;

-- admin_get_support_tickets: the seller_name lookup uses a correlated
-- subquery (not a join) against shops, because a seller can own more
-- than one shop — a plain join fanned a single ticket out into one row
-- per shop, duplicating it in the admin list (caught during testing).
create or replace function public.admin_get_support_tickets(p_status text default 'all')
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'support.view') then
    raise exception 'Permission denied: support.view required';
  end if;
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', t.id, 'subject', t.subject, 'message', t.message, 'priority', t.priority,
      'status', t.status, 'response', t.response, 'created_at', t.created_at, 'updated_at', t.updated_at,
      'seller_name', coalesce(
        p.full_name,
        (select s.name from public.shops s where s.seller_id = t.seller_id order by s.created_at limit 1),
        'Unknown seller'
      )
    ) as row_data, t.created_at
    from public.support_tickets t
    left join public.profiles p on p.id = t.seller_id
    where p_status = 'all' or t.status = p_status
  ) q;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_support_tickets(text) from public, anon;
grant execute on function public.admin_get_support_tickets(text) to authenticated;

create or replace function public.admin_update_support_ticket(p_ticket_id uuid, p_status text default null, p_response text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_ticket record;
begin
  if not public.has_permission(auth.uid(), 'support.manage') then
    raise exception 'Permission denied: support.manage required';
  end if;
  if p_status is not null and p_status not in ('open','in_progress','closed') then
    raise exception 'Invalid status';
  end if;
  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  if v_ticket.id is null then raise exception 'Ticket not found'; end if;
  update public.support_tickets set
    status = coalesce(p_status, status),
    response = coalesce(p_response, response),
    updated_at = now()
  where id = p_ticket_id;
  perform public.log_audit('support_ticket_updated', 'support_tickets', p_ticket_id::text,
    jsonb_build_object('status', v_ticket.status), jsonb_build_object('status', coalesce(p_status, v_ticket.status)));
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_update_support_ticket(uuid, text, text) from public, anon;
grant execute on function public.admin_update_support_ticket(uuid, text, text) to authenticated;

-- Coupons with shop_id = null are platform-wide (the column is
-- nullable in the base schema specifically to support this).
create or replace function public.admin_get_coupons()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'marketing.manage') then
    raise exception 'Permission denied: marketing.manage required';
  end if;
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', c.id, 'code', c.code, 'discount_type', c.discount_type, 'discount_value', c.discount_value,
      'min_order_amount', c.min_order_amount, 'usage_limit', c.usage_limit, 'usage_count', c.usage_count,
      'expires_at', c.expires_at, 'is_active', c.is_active, 'created_at', c.created_at,
      'shop_name', s.name, 'scope', case when c.shop_id is null then 'platform' else 'shop' end
    ) as row_data, c.created_at
    from public.coupons c
    left join public.shops s on s.id = c.shop_id
  ) q;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_coupons() from public, anon;
grant execute on function public.admin_get_coupons() to authenticated;

create or replace function public.admin_create_coupon(p_code text, p_discount_type text, p_discount_value numeric, p_expires_at timestamptz default null, p_min_order_amount numeric default null, p_usage_limit integer default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_coupon record;
begin
  if not public.has_permission(auth.uid(), 'marketing.manage') then
    raise exception 'Permission denied: marketing.manage required';
  end if;
  if p_discount_type not in ('percent','fixed') then raise exception 'Invalid discount type'; end if;
  if p_discount_value is null or p_discount_value <= 0 then raise exception 'Discount value must be greater than zero'; end if;
  if p_code is null or btrim(p_code) = '' then raise exception 'Code is required'; end if;

  insert into public.coupons (shop_id, code, discount_type, discount_value, min_order_amount, usage_limit, expires_at, is_active)
  values (null, upper(btrim(p_code)), p_discount_type, p_discount_value, p_min_order_amount, p_usage_limit, p_expires_at, true)
  returning * into v_coupon;

  perform public.log_audit('coupon_created', 'coupons', v_coupon.id::text, null, jsonb_build_object('code', v_coupon.code));
  return jsonb_build_object('ok', true, 'coupon', to_jsonb(v_coupon));
end;
$function$;
revoke all on function public.admin_create_coupon(text, text, numeric, timestamptz, numeric, integer) from public, anon;
grant execute on function public.admin_create_coupon(text, text, numeric, timestamptz, numeric, integer) to authenticated;

create or replace function public.admin_update_coupon(p_coupon_id uuid, p_is_active boolean default null, p_expires_at timestamptz default null, p_discount_value numeric default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.has_permission(auth.uid(), 'marketing.manage') then
    raise exception 'Permission denied: marketing.manage required';
  end if;
  if not exists (select 1 from public.coupons where id = p_coupon_id) then raise exception 'Coupon not found'; end if;
  if p_discount_value is not null and p_discount_value <= 0 then raise exception 'Discount value must be greater than zero'; end if;

  update public.coupons set
    is_active = coalesce(p_is_active, is_active),
    expires_at = coalesce(p_expires_at, expires_at),
    discount_value = coalesce(p_discount_value, discount_value)
  where id = p_coupon_id;

  perform public.log_audit('coupon_updated', 'coupons', p_coupon_id::text, null, jsonb_build_object('is_active', p_is_active));
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_update_coupon(uuid, boolean, timestamptz, numeric) from public, anon;
grant execute on function public.admin_update_coupon(uuid, boolean, timestamptz, numeric) to authenticated;

create or replace function public.admin_delete_coupon(p_coupon_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
begin
  if not public.has_permission(auth.uid(), 'marketing.manage') then
    raise exception 'Permission denied: marketing.manage required';
  end if;
  delete from public.coupons where id = p_coupon_id;
  perform public.log_audit('coupon_deleted', 'coupons', p_coupon_id::text, null, null);
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_delete_coupon(uuid) from public, anon;
grant execute on function public.admin_delete_coupon(uuid) to authenticated;
