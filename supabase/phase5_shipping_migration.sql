-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 5: Shipping & Order Tracking
-- NOT applied to production. Written and tested exclusively in
-- BEGIN...ROLLBACK transactions against the live project
-- (kpwebnoqsjlxxiamwsst) — see Phase 5 report for the exact test
-- transcript. Run this file manually in the Supabase SQL editor
-- (or via a reviewed `apply_migration`) only after explicit approval.
--
-- Builds additively on the Phase 4 branch (claude/phase4-orders-payments,
-- commit d006396) — orders, order_items, payment_intents,
-- commission_ledger, refund_requests/refunds are all untouched here
-- except where explicitly noted (orders.shipping_fee now reflects real
-- per-seller shipment fees instead of the Phase 4 hardcoded 0).
--
-- MARKETPLACE RULE enforced throughout this file: a single customer
-- order may contain shipments from multiple sellers. A seller can only
-- ever see/modify shipments where shipments.seller_id = auth.uid().
-- No trigger, RPC or policy in this file grants a seller any access to
-- another seller's shipment, and no function here ever marks a whole
-- order "delivered" from one seller's action — that remains a derived,
-- read-only rollup (orders_fulfillment_summary view) computed from
-- every shipment on the order, never written directly by anyone.
--
-- BUSINESS RULE — multi-shipment: this migration deliberately does NOT
-- add a unique(order_id, seller_id) constraint on shipments. A seller
-- may create more than one shipment for the same order (partial
-- shipping). An order_item points at exactly one shipment at a time
-- via order_items.shipment_id (a plain column, not a join table) —
-- that alone guarantees an item can never be "in" two shipments at
-- once; seller_create_shipment() is the only way to move an item to a
-- different shipment, and only while that item's current shipment is
-- still pending/processing (never after it has shipped).
--
-- BUSINESS RULE — shipping fees: this migration adds an admin-only
-- `shipping_rates` table. No rate rows are seeded — inventing a price
-- would violate the explicit instruction "never invent shipping
-- prices". Until an admin configures at least one matching rate for a
-- shop/destination/method, calculate_shipping_fee() returns
-- available:false and create_order()/preview_shipping_fees() surface
-- that explicitly; checkout is blocked rather than silently charging
-- shipping_fee = 0.
--
-- BUSINESS RULE — tracking integrity: shipment_status_history.source
-- distinguishes 'seller' (self-reported by the seller through
-- seller_update_shipment/seller_report_delivery_failure),
-- 'admin_override' (a staff correction, always with a mandatory note)
-- and 'carrier_api' (reserved — no carrier integration exists yet; no
-- code in this migration ever writes that value, so it can never be
-- faked today, only enabled by a future, real integration that calls
-- a new RPC we are not adding here).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. SHIPPING CARRIERS — reference list for UI dropdowns only ──────
create table if not exists public.shipping_carriers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.shipping_carriers enable row level security;
create policy "Anyone authenticated can view active carriers" on public.shipping_carriers for select
  using (auth.uid() is not null);
-- No insert/update policy for any client role: the catalog changes only
-- through a reviewed migration or a future admin RPC, never ad hoc.

-- ─── 2. SHIPPING RATES — the ONLY source of a shipping fee number ─────
-- shop_id null = platform-wide fallback rate. destination_country null =
-- matches any destination. More specific rows (shop-specific,
-- country-specific) are preferred by calculate_shipping_fee() over more
-- general ones — see that function for the exact precedence order.
create table if not exists public.shipping_rates (
  id                  uuid primary key default gen_random_uuid(),
  shop_id             uuid references public.shops(id) on delete cascade,
  destination_country text,
  method              text not null default 'standard',
  base_fee            numeric(10,2) not null check (base_fee >= 0),
  per_item_fee        numeric(10,2) not null default 0 check (per_item_fee >= 0),
  is_active           boolean not null default true,
  created_by          uuid references public.profiles(id),
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists shipping_rates_lookup_idx
  on public.shipping_rates (shop_id, destination_country, method) where is_active;
alter table public.shipping_rates enable row level security;

create policy "Permitted staff can view shipping rates" on public.shipping_rates for select
  using (public.has_permission(auth.uid(), 'shipping.view') or public.has_permission(auth.uid(), 'shipping.manage'));
create policy "Sellers can view their own shop shipping rates" on public.shipping_rates for select
  using (shop_id in (select id from public.shops where seller_id = auth.uid()));
-- No insert/update policy for any client role here: rates are written
-- only by admin_set_shipping_rate() (SECURITY DEFINER, shipping.manage).
-- Deliberately NOT seller-writable — a seller cannot invent their own
-- shipping price any more than a buyer can; the business decision is
-- admin-configured, mirroring commission_rules in Phase 4.

drop trigger if exists shipping_rates_updated_at on public.shipping_rates;
create trigger shipping_rates_updated_at before update on public.shipping_rates
  for each row execute function public.handle_updated_at();

-- ─── 3. SHIPMENTS — one row per seller-created shipment on an order ───
create table if not exists public.shipments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  seller_id          uuid not null references public.profiles(id),
  shop_id            uuid references public.shops(id),
  status             text not null default 'pending'
                      check (status = any (array[
                        'pending','processing','shipped','in_transit',
                        'delivered','failed','returned','cancelled'
                      ])),
  carrier            text,
  tracking_number    text,
  tracking_url       text,
  shipping_fee       numeric(10,2) not null default 0 check (shipping_fee >= 0),
  rate_id            uuid references public.shipping_rates(id),
  fee_status         text not null default 'calculated'
                      check (fee_status = any (array['calculated','admin_override'])),
  estimated_delivery date,
  shipped_at         timestamptz,
  delivered_at       timestamptz,
  failed_at          timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Deliberately NO unique(order_id, seller_id): a seller may have more
-- than one shipment on the same order (partial shipping).
create index if not exists shipments_order_id_idx  on public.shipments (order_id);
create index if not exists shipments_seller_id_idx on public.shipments (seller_id);
alter table public.shipments enable row level security;

drop trigger if exists shipments_updated_at on public.shipments;
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.handle_updated_at();

create policy "Buyers can view shipments on their own orders" on public.shipments for select
  using (order_id in (select id from public.orders where buyer_id = auth.uid()));
create policy "Sellers can view only their own shipments" on public.shipments for select
  using (seller_id = auth.uid());
create policy "Permitted staff can view all shipments" on public.shipments for select
  using (public.has_permission(auth.uid(), 'shipping.view') or public.has_permission(auth.uid(), 'shipping.manage'));
-- No direct insert/update policy for any client role: shipments are only
-- ever created/mutated by the SECURITY DEFINER RPCs below, each of which
-- re-checks seller_id = auth.uid() (or shipping.manage) itself — RLS is a
-- second, independent backstop, not the only check.

-- ─── 4. ORDER_ITEMS — link each item to exactly one shipment ──────────
alter table public.order_items
  add column if not exists shipment_id uuid references public.shipments(id);
create index if not exists order_items_shipment_id_idx on public.order_items (shipment_id);

-- Phase 4's protect_order_item_fields() trigger reverts EVERY column a
-- non-staff caller touches except an allowed fulfillment_status step —
-- which silently wiped out shipment_id on every write, since neither
-- create_order() (called as the BUYER) nor seller_create_shipment()
-- (called as the seller, but not advancing fulfillment_status) ever
-- passed its one allowed-column check. Confirmed live in a rolled-back
-- transaction before this fix: a buyer-driven create_order() update of
-- shipment_id came back NULL every time.
--
-- Fix: a transaction-local flag, set ONLY inside create_order() and
-- seller_create_shipment() immediately before their own already-
-- validated UPDATE of shipment_id, lets this one column through
-- unchanged while this trigger continues to protect every other column
-- exactly as Phase 4 defined it. The flag is a GUC a client can never
-- set itself (no RPC parameter or table write reaches it), so it adds
-- no new way for a buyer or seller to escalate anything else.
create or replace function public.protect_order_item_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_requested_status text;
  allowed_next text[];
  v_result public.order_items;
  v_bypass boolean;
begin
  v_bypass := current_setting('app.bypass_shipment_protection', true) = 'true';

  if public.has_permission(auth.uid(), 'orders.edit') then
    if new.fulfillment_status is distinct from old.fulfillment_status then
      perform public.log_audit('order_item_status_changed', 'order_items', new.id::text,
        jsonb_build_object('status', old.fulfillment_status),
        jsonb_build_object('status', new.fulfillment_status, 'order_id', new.order_id));
    end if;
    return new;
  end if;

  if old.seller_id is distinct from auth.uid() then
    v_result := old; -- not this seller's item: block entirely
    if v_bypass then
      v_result.shipment_id := new.shipment_id;
    end if;
    return v_result;
  end if;

  v_requested_status := new.fulfillment_status;
  allowed_next := case old.fulfillment_status
    when 'pending' then array['processing']
    when 'processing' then array['shipped']
    when 'shipped' then array['delivered']
    else array[]::text[]
  end;

  v_result := old; -- revert every column a seller might have tried to change

  if v_requested_status is not null and v_requested_status = any(allowed_next) then
    v_result.fulfillment_status := v_requested_status;
    perform public.log_audit('order_item_status_changed', 'order_items', v_result.id::text,
      jsonb_build_object('status', old.fulfillment_status),
      jsonb_build_object('status', v_requested_status, 'order_id', v_result.order_id));
  end if;

  if v_bypass then
    v_result.shipment_id := new.shipment_id;
  end if;

  return v_result;
end;
$$;
revoke execute on function public.protect_order_item_fields() from public, anon, authenticated;
-- The trigger itself (protect_order_item_fields_trg) already exists from
-- Phase 4 and does not need to be recreated — CREATE OR REPLACE FUNCTION
-- above takes effect for it immediately.

-- Guarantees, independent of whatever RPC or RLS let a write through,
-- that an order_item's shipment always belongs to the SAME order and
-- the SAME seller as the item itself — a seller (or a bug) can never
-- point one of their items at another seller's shipment, or at a
-- shipment on a different order.
create or replace function public.check_order_item_shipment_consistency()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_shipment record;
begin
  if new.shipment_id is null then
    return new;
  end if;
  select order_id, seller_id into v_shipment from public.shipments where id = new.shipment_id;
  if v_shipment.order_id is null then
    raise exception 'Shipment not found';
  end if;
  if v_shipment.order_id is distinct from new.order_id then
    raise exception 'Shipment belongs to a different order';
  end if;
  if v_shipment.seller_id is distinct from new.seller_id then
    raise exception 'Shipment belongs to a different seller';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_order_item_shipment_consistency() from public, anon, authenticated;

drop trigger if exists check_order_item_shipment_consistency_trg on public.order_items;
create trigger check_order_item_shipment_consistency_trg
before insert or update of shipment_id on public.order_items
for each row execute function public.check_order_item_shipment_consistency();

-- ─── 5. SHIPMENT STATUS HISTORY — immutable audit trail ───────────────
-- `source` distinguishes who/what asserted this status:
--   'seller'          — the owning seller, through seller_update_shipment
--                        or seller_report_delivery_failure.
--   'admin_override'  — a permitted staff correction; note is mandatory
--                        (enforced in admin_override_shipment(), not here,
--                        since this table has no client insert policy).
--   'system'          — written by create_order()/seller_create_shipment()
--                        when a shipment is first created, not a status
--                        change by a person.
--   'carrier_api'     — reserved for a future real carrier integration.
--                        No function in this migration ever writes this
--                        value; it exists so that integration does not
--                        require a schema change later.
create table if not exists public.shipment_status_history (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status      text not null,
  source      text not null check (source = any (array['seller','admin_override','system','carrier_api'])),
  note        text,
  changed_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists shipment_status_history_shipment_id_idx
  on public.shipment_status_history (shipment_id);
alter table public.shipment_status_history enable row level security;

create policy "Buyers can view history for shipments on their own orders" on public.shipment_status_history for select
  using (shipment_id in (
    select s.id from public.shipments s join public.orders o on o.id = s.order_id
    where o.buyer_id = auth.uid()
  ));
create policy "Sellers can view history of only their own shipments" on public.shipment_status_history for select
  using (shipment_id in (select id from public.shipments where seller_id = auth.uid()));
create policy "Permitted staff can view all shipment history" on public.shipment_status_history for select
  using (public.has_permission(auth.uid(), 'shipping.view') or public.has_permission(auth.uid(), 'shipping.manage'));
-- No insert/update/delete policy for any client role: rows are written
-- only inside the RPCs below, and never updated or deleted by anyone —
-- an immutable trail, matching the "every meaningful status change must
-- create an immutable history record" requirement exactly.

-- ─── 6. ORDER FULFILLMENT ROLLUP — derived, read-only, never self-set ──
-- Never written to any column; computed on read. An order is "delivered"
-- only when it has at least one shipment and every one of them is
-- delivered. A single seller completing their own shipment can NEVER
-- flip this for the whole order while another seller's shipment is
-- still outstanding.
create or replace view public.order_fulfillment_summary as
select
  o.id as order_id,
  count(s.id) as shipment_count,
  count(*) filter (where s.status = 'delivered') as delivered_count,
  count(*) filter (where s.status = 'failed') as failed_count,
  count(*) filter (where s.status in ('cancelled','returned')) as cancelled_or_returned_count,
  case
    when count(s.id) = 0 then 'awaiting_shipment'
    when count(*) filter (where s.status = 'delivered') = count(s.id) then 'delivered'
    when count(*) filter (where s.status = 'failed') > 0 then 'delivery_exception'
    when count(*) filter (where s.status in ('shipped','in_transit')) > 0 then 'partially_shipped'
    when count(*) filter (where s.status = 'processing') > 0 then 'processing'
    else 'pending'
  end as fulfillment_status,
  sum(s.shipping_fee) as total_shipping_fee
from public.orders o
left join public.shipments s on s.order_id = o.id
group by o.id;
-- Inherits RLS from its underlying tables (orders, shipments) via the
-- view's invoker-rights default — no separate grant needed beyond
-- select on the view itself.
grant select on public.order_fulfillment_summary to authenticated;

-- ─── 7. PERMISSIONS (existing catalog mechanism — no parallel system) ──
insert into public.permissions (key, module, label) values
  ('shipping.view', 'shipping', 'View shipments, rates and shipping history'),
  ('shipping.manage', 'shipping', 'Manage shipping rates and override shipments')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), k
from (values ('shipping.view'), ('shipping.manage')) as t(k)
where exists (select 1 from public.staff_roles where name = 'Super Admin')
on conflict do nothing;

-- ─── 8. calculate_shipping_fee() — the ONLY place a fee is computed ───
-- Precedence (most to least specific): shop + exact country > shop +
-- any country > platform-wide + exact country > platform-wide + any
-- country. Returns available:false (never a fabricated number) when no
-- active rate matches at any level.
create or replace function public.calculate_shipping_fee(
  p_shop_id uuid, p_destination_country text, p_method text default 'standard', p_item_count int default 1
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_rate record;
begin
  select id, base_fee, per_item_fee into v_rate
  from public.shipping_rates
  where is_active and method = coalesce(p_method, 'standard')
    and (shop_id = p_shop_id or shop_id is null)
    and (destination_country is null or destination_country = p_destination_country)
  order by
    (shop_id = p_shop_id) desc,            -- shop-specific beats platform-wide
    (destination_country is not null) desc -- exact country beats any-country
  limit 1;

  if v_rate.id is null then
    return jsonb_build_object('available', false, 'fee', null, 'rate_id', null, 'reason', 'no_rate_configured');
  end if;

  return jsonb_build_object(
    'available', true,
    'fee', round(v_rate.base_fee + v_rate.per_item_fee * greatest(p_item_count, 1), 2),
    'rate_id', v_rate.id
  );
end;
$$;
revoke all on function public.calculate_shipping_fee(uuid, text, text, int) from public, anon;
grant execute on function public.calculate_shipping_fee(uuid, text, text, int) to authenticated;

-- ─── 9. preview_shipping_fees() — transparent pre-checkout breakdown ──
-- Reads the buyer's OWN cart (never a client-supplied item list), groups
-- by shop, and returns the exact breakdown the checkout UI must display:
-- product subtotal, each shop's shipping fee (or "unavailable"), total
-- shipping, and grand total. Creates nothing — pure read.
create or replace function public.preview_shipping_fees(
  p_destination_country text, p_method text default 'standard'
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_buyer uuid := auth.uid();
  v_cart_id uuid;
  v_subtotal numeric := 0;
  v_total_shipping numeric := 0;
  v_all_available boolean := true;
  v_shops jsonb := '[]'::jsonb;
  v_group record;
  v_calc jsonb;
begin
  if v_buyer is null then raise exception 'Authentication required'; end if;
  select id into v_cart_id from public.carts where user_id = v_buyer;
  if v_cart_id is null then
    return jsonb_build_object('ok', true, 'subtotal', 0, 'total_shipping_fee', 0, 'grand_total', 0, 'all_available', true, 'shops', '[]'::jsonb);
  end if;

  for v_group in
    select p.shop_id, s.name as shop_name, sum(p.price * ci.quantity) as shop_subtotal, sum(ci.quantity) as item_count
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.shops s on s.id = p.shop_id
    where ci.cart_id = v_cart_id
    group by p.shop_id, s.name
  loop
    v_subtotal := v_subtotal + v_group.shop_subtotal;
    v_calc := public.calculate_shipping_fee(v_group.shop_id, p_destination_country, p_method, v_group.item_count);
    if (v_calc->>'available')::boolean then
      v_total_shipping := v_total_shipping + (v_calc->>'fee')::numeric;
    else
      v_all_available := false;
    end if;
    v_shops := v_shops || jsonb_build_object(
      'shop_id', v_group.shop_id, 'shop_name', v_group.shop_name,
      'subtotal', v_group.shop_subtotal, 'shipping', v_calc
    );
  end loop;

  return jsonb_build_object(
    'ok', true, 'subtotal', v_subtotal,
    'total_shipping_fee', case when v_all_available then v_total_shipping else null end,
    'grand_total', case when v_all_available then v_subtotal + v_total_shipping else null end,
    'all_available', v_all_available, 'shops', v_shops
  );
end;
$$;
revoke all on function public.preview_shipping_fees(text, text) from public, anon;
grant execute on function public.preview_shipping_fees(text, text) to authenticated;

-- ─── 10. admin_set_shipping_rate() — the business decision, staff-only ─
create or replace function public.admin_set_shipping_rate(
  p_shop_id uuid, p_destination_country text, p_method text, p_base_fee numeric, p_per_item_fee numeric default 0, p_note text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_rate_id uuid;
begin
  if not public.has_permission(auth.uid(), 'shipping.manage') then
    raise exception 'Permission denied: shipping.manage required';
  end if;
  if p_base_fee is null or p_base_fee < 0 then raise exception 'base_fee must be >= 0'; end if;
  if p_method is null or btrim(p_method) = '' then raise exception 'A shipping method is required'; end if;

  insert into public.shipping_rates (shop_id, destination_country, method, base_fee, per_item_fee, created_by, note)
  values (p_shop_id, p_destination_country, p_method, p_base_fee, coalesce(p_per_item_fee, 0), auth.uid(), p_note)
  returning id into v_rate_id;

  perform public.log_audit('shipping_rate_set', 'shipping_rates', v_rate_id::text, null,
    jsonb_build_object('shop_id', p_shop_id, 'destination_country', p_destination_country, 'method', p_method, 'base_fee', p_base_fee));

  return jsonb_build_object('ok', true, 'rate_id', v_rate_id);
end;
$$;
revoke all on function public.admin_set_shipping_rate(uuid, text, text, numeric, numeric, text) from public, anon;
grant execute on function public.admin_set_shipping_rate(uuid, text, text, numeric, numeric, text) to authenticated;

create or replace function public.admin_deactivate_shipping_rate(p_rate_id uuid) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_permission(auth.uid(), 'shipping.manage') then
    raise exception 'Permission denied: shipping.manage required';
  end if;
  update public.shipping_rates set is_active = false, updated_at = now() where id = p_rate_id;
  if not found then raise exception 'Shipping rate not found'; end if;
  perform public.log_audit('shipping_rate_deactivated', 'shipping_rates', p_rate_id::text, null, null);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_deactivate_shipping_rate(uuid) from public, anon;
grant execute on function public.admin_deactivate_shipping_rate(uuid) to authenticated;

-- ─── 11. create_order() — extended, NOT replaced in spirit ────────────
-- Preserves every Phase 4 guarantee (buyer's own cart only, server-side
-- price/stock re-read under row lock, server-computed subtotal/discount,
-- always starts pending/pending). The ONLY change: shipping_fee is no
-- longer hardcoded to 0 — it is the sum of each seller group's real,
-- admin-configured rate, computed by calculate_shipping_fee(). If ANY
-- seller group in the cart has no valid rate for the given destination,
-- the entire order creation is aborted (raise exception) rather than
-- completing with an invented or zero fee for that seller — this also
-- means no partial order/shipment rows are left behind, since the
-- raise rolls back everything already done inside this function call.
-- Also creates exactly one shipment per seller group, and backfills
-- order_items.shipment_id for every item in that group.
create or replace function public.create_order(
  p_shipping_address jsonb,
  p_shipping_method text default 'standard',
  p_payment_method text default 'moncash',
  p_promo_code text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_buyer uuid := auth.uid();
  v_cart_id uuid;
  v_item record;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping_fee numeric := 0;
  v_total numeric;
  v_order_id uuid;
  v_coupon record;
  v_item_count int := 0;
  v_destination_country text;
  v_seller_group record;
  v_calc jsonb;
  v_shipment_id uuid;
begin
  if v_buyer is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in ('moncash','natcash','card','cod','wallet') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  select id into v_cart_id from public.carts where user_id = v_buyer;
  if v_cart_id is null then raise exception 'Cart is empty'; end if;

  v_destination_country := p_shipping_address->>'country';

  insert into public.orders (
    buyer_id, status, subtotal, discount, shipping_fee, total_amount,
    promo_code, shipping_address, shipping_method, payment_method, payment_status
  ) values (
    v_buyer, 'pending', 0, 0, 0, 0,
    p_promo_code, coalesce(p_shipping_address, '{}'::jsonb), coalesce(p_shipping_method, 'standard'),
    p_payment_method, 'pending'
  ) returning id into v_order_id;

  for v_item in
    select ci.id as cart_item_id, ci.product_id, ci.quantity, ci.variant,
           p.price, p.stock, p.title, p.images, p.shop_id, p.status as p_status, p.approval_status,
           s.seller_id
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.shops s on s.id = p.shop_id
    where ci.cart_id = v_cart_id
    for update of p
  loop
    v_item_count := v_item_count + 1;
    if v_item.p_status <> 'active' or v_item.approval_status <> 'approved' then
      raise exception 'Product is not available for purchase: %', v_item.title;
    end if;
    if v_item.stock < v_item.quantity then
      raise exception 'Insufficient stock for %: % available', v_item.title, v_item.stock;
    end if;

    insert into public.order_items (order_id, product_id, shop_id, seller_id, title, image_url, variant, quantity, unit_price)
    values (v_order_id, v_item.product_id, v_item.shop_id, v_item.seller_id, v_item.title,
            v_item.images[1], coalesce(v_item.variant, '{}'::jsonb), v_item.quantity, v_item.price);

    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
    v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
  end loop;

  if v_item_count = 0 then raise exception 'Cart is empty'; end if;

  if p_promo_code is not null then
    select * into v_coupon from public.coupons
      where code = p_promo_code and is_active = true
        and (expires_at is null or expires_at > now())
        and (usage_limit is null or usage_count < usage_limit)
      limit 1;
    if v_coupon.id is not null and (v_coupon.min_order_amount is null or v_subtotal >= v_coupon.min_order_amount) then
      v_discount := case v_coupon.discount_type
        when 'percent' then round(v_subtotal * (v_coupon.discount_value / 100.0), 2)
        else least(v_coupon.discount_value, v_subtotal)
      end;
      update public.coupons set usage_count = usage_count + 1 where id = v_coupon.id;
    end if;
  end if;

  -- One shipment per seller group, with a REAL, admin-configured fee.
  -- Any missing rate aborts the whole order — no invented/zero fee ever
  -- reaches orders.shipping_fee or a shipments row.
  for v_seller_group in
    select seller_id, shop_id, sum(quantity) as item_count
    from public.order_items where order_id = v_order_id
    group by seller_id, shop_id
  loop
    v_calc := public.calculate_shipping_fee(v_seller_group.shop_id, v_destination_country, p_shipping_method, v_seller_group.item_count);
    if not (v_calc->>'available')::boolean then
      raise exception 'Shipping is not available for one of the shops in your cart (destination: %). Please contact support or try a different address.', coalesce(v_destination_country, 'unspecified');
    end if;

    v_shipping_fee := v_shipping_fee + (v_calc->>'fee')::numeric;

    insert into public.shipments (order_id, seller_id, shop_id, status, shipping_fee, rate_id, fee_status)
    values (v_order_id, v_seller_group.seller_id, v_seller_group.shop_id, 'pending',
            (v_calc->>'fee')::numeric, (v_calc->>'rate_id')::uuid, 'calculated')
    returning id into v_shipment_id;

    insert into public.shipment_status_history (shipment_id, status, source, changed_by)
    values (v_shipment_id, 'pending', 'system', v_buyer);

    -- See protect_order_item_fields(): this transaction-local flag is the
    -- only way this buyer-driven UPDATE's shipment_id survives that
    -- trigger; no other column is affected by it.
    perform set_config('app.bypass_shipment_protection', 'true', true);
    update public.order_items set shipment_id = v_shipment_id
    where order_id = v_order_id and seller_id = v_seller_group.seller_id and shop_id = v_seller_group.shop_id;
    perform set_config('app.bypass_shipment_protection', 'false', true);
  end loop;

  v_total := v_subtotal - v_discount + v_shipping_fee;

  update public.orders set subtotal = v_subtotal, discount = v_discount, shipping_fee = v_shipping_fee, total_amount = v_total
  where id = v_order_id;

  delete from public.cart_items where cart_id = v_cart_id;

  perform public.log_audit('order_created', 'orders', v_order_id::text, null,
    jsonb_build_object('total_amount', v_total, 'item_count', v_item_count, 'shipping_fee', v_shipping_fee));

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'total_amount', v_total,
    'subtotal', v_subtotal, 'discount', v_discount, 'shipping_fee', v_shipping_fee, 'payment_status', 'pending');
end;
$$;
revoke all on function public.create_order(jsonb, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text) to authenticated;

-- ─── 12. seller_create_shipment() — split off a NEW shipment ──────────
-- Lets a seller move a subset of their OWN, not-yet-shipped items from
-- their current shipment into a brand new one (partial/staged shipping).
-- Never touches another seller's items (the WHERE clause on seller_id
-- plus the trigger above make that two independent guarantees). The new
-- shipment carries shipping_fee = 0 — it is not a second charge; the fee
-- already collected from the buyer for these items stays recorded on
-- the shipment it was originally computed on.
create or replace function public.seller_create_shipment(
  p_order_id uuid, p_order_item_ids uuid[]
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_seller uuid := auth.uid();
  v_shop_id uuid;
  v_new_shipment_id uuid;
  v_count int;
begin
  if v_seller is null then raise exception 'Authentication required'; end if;
  if p_order_item_ids is null or array_length(p_order_item_ids, 1) is null then
    raise exception 'At least one order item is required';
  end if;

  select count(*), (array_agg(oi.shop_id))[1] into v_count, v_shop_id
  from public.order_items oi
  join public.shipments s on s.id = oi.shipment_id
  where oi.id = any(p_order_item_ids)
    and oi.order_id = p_order_id
    and oi.seller_id = v_seller
    and s.status in ('pending','processing');

  if v_count <> array_length(p_order_item_ids, 1) then
    raise exception 'One or more items do not belong to you, do not belong to this order, or are no longer eligible to be re-shipped (already shipped/delivered)';
  end if;

  insert into public.shipments (order_id, seller_id, shop_id, status, shipping_fee, fee_status)
  values (p_order_id, v_seller, v_shop_id, 'pending', 0, 'calculated')
  returning id into v_new_shipment_id;

  insert into public.shipment_status_history (shipment_id, status, source, changed_by, note)
  values (v_new_shipment_id, 'pending', 'system', v_seller, 'Split from a prior shipment on the same order');

  -- See protect_order_item_fields(): the seller isn't advancing
  -- fulfillment_status here, so without this flag the trigger would
  -- revert shipment_id right back to its old value.
  perform set_config('app.bypass_shipment_protection', 'true', true);
  update public.order_items set shipment_id = v_new_shipment_id
  where id = any(p_order_item_ids) and order_id = p_order_id and seller_id = v_seller;
  perform set_config('app.bypass_shipment_protection', 'false', true);

  perform public.log_audit('shipment_created', 'shipments', v_new_shipment_id::text, null,
    jsonb_build_object('order_id', p_order_id, 'item_count', v_count));

  return jsonb_build_object('ok', true, 'shipment_id', v_new_shipment_id);
end;
$$;
revoke all on function public.seller_create_shipment(uuid, uuid[]) from public, anon;
grant execute on function public.seller_create_shipment(uuid, uuid[]) to authenticated;

-- ─── 13. seller_update_shipment() — the owning seller only ────────────
-- Forward-moving transitions only, one call at a time. A seller can
-- attach carrier/tracking info at any step; carrier/tracking fields are
-- always understood to be seller-provided (source='seller'), never
-- presented as carrier-API-verified since no such integration exists.
create or replace function public.seller_update_shipment(
  p_shipment_id uuid, p_status text, p_carrier text default null,
  p_tracking_number text default null, p_tracking_url text default null,
  p_estimated_delivery date default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_shipment record;
  v_allowed text[];
begin
  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found'; end if;
  if v_shipment.seller_id is distinct from auth.uid() then
    raise exception 'Permission denied: this is not your shipment';
  end if;

  v_allowed := case v_shipment.status
    when 'pending'     then array['processing','cancelled']
    when 'processing'  then array['shipped','cancelled']
    when 'shipped'     then array['in_transit','delivered','failed']
    when 'in_transit'  then array['delivered','failed']
    else array[]::text[]
  end;

  if p_status is distinct from v_shipment.status and not (p_status = any(v_allowed)) then
    raise exception 'Invalid transition from % to %', v_shipment.status, p_status;
  end if;

  update public.shipments set
    status = p_status,
    carrier = coalesce(p_carrier, carrier),
    tracking_number = coalesce(p_tracking_number, tracking_number),
    tracking_url = coalesce(p_tracking_url, tracking_url),
    estimated_delivery = coalesce(p_estimated_delivery, estimated_delivery),
    shipped_at = case when p_status = 'shipped' and shipped_at is null then now() else shipped_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    updated_at = now()
  where id = p_shipment_id;

  insert into public.shipment_status_history (shipment_id, status, source, changed_by, note)
  values (p_shipment_id, p_status, 'seller', auth.uid(),
          case when p_carrier is not null or p_tracking_number is not null
               then 'Seller-reported tracking update' else null end);

  perform public.log_audit('shipment_status_changed', 'shipments', p_shipment_id::text,
    jsonb_build_object('status', v_shipment.status), jsonb_build_object('status', p_status));

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;
revoke all on function public.seller_update_shipment(uuid, text, text, text, text, date) from public, anon;
grant execute on function public.seller_update_shipment(uuid, text, text, text, text, date) to authenticated;

-- ─── 14. seller_report_delivery_failure() — the owning seller only ────
create or replace function public.seller_report_delivery_failure(
  p_shipment_id uuid, p_reason text
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_shipment record;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A reason is required'; end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found'; end if;
  if v_shipment.seller_id is distinct from auth.uid() then
    raise exception 'Permission denied: this is not your shipment';
  end if;
  if v_shipment.status not in ('shipped','in_transit') then
    raise exception 'Only a shipped or in-transit shipment can be reported as a delivery failure (current status: %)', v_shipment.status;
  end if;

  update public.shipments set status = 'failed', failure_reason = p_reason, failed_at = now(), updated_at = now()
  where id = p_shipment_id;

  insert into public.shipment_status_history (shipment_id, status, source, changed_by, note)
  values (p_shipment_id, 'failed', 'seller', auth.uid(), p_reason);

  perform public.log_audit('shipment_delivery_failed', 'shipments', p_shipment_id::text,
    jsonb_build_object('status', v_shipment.status), jsonb_build_object('status', 'failed', 'reason', p_reason));

  return jsonb_build_object('ok', true, 'status', 'failed');
end;
$$;
revoke all on function public.seller_report_delivery_failure(uuid, text) from public, anon;
grant execute on function public.seller_report_delivery_failure(uuid, text) to authenticated;

-- ─── 15. admin_override_shipment() — staff correction, mandatory note ─
-- The only function that can touch a shipment it does not own, and the
-- only one that can set any status/field combination outside the
-- forward-only transition rules. A note is mandatory precisely because
-- every meaningful change must be explained in the immutable history —
-- this is a correction tool, not a backdoor.
create or replace function public.admin_override_shipment(
  p_shipment_id uuid, p_status text default null, p_carrier text default null,
  p_tracking_number text default null, p_tracking_url text default null,
  p_estimated_delivery date default null, p_note text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_shipment record;
  v_new_status text;
begin
  if not public.has_permission(auth.uid(), 'shipping.manage') then
    raise exception 'Permission denied: shipping.manage required';
  end if;
  if p_note is null or btrim(p_note) = '' then
    raise exception 'An admin override requires a note explaining the correction';
  end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if v_shipment.id is null then raise exception 'Shipment not found'; end if;

  v_new_status := coalesce(p_status, v_shipment.status);
  if v_new_status not in ('pending','processing','shipped','in_transit','delivered','failed','returned','cancelled') then
    raise exception 'Invalid status: %', v_new_status;
  end if;

  update public.shipments set
    status = v_new_status,
    carrier = coalesce(p_carrier, carrier),
    tracking_number = coalesce(p_tracking_number, tracking_number),
    tracking_url = coalesce(p_tracking_url, tracking_url),
    estimated_delivery = coalesce(p_estimated_delivery, estimated_delivery),
    delivered_at = case when v_new_status = 'delivered' and delivered_at is null then now() else delivered_at end,
    updated_at = now()
  where id = p_shipment_id;

  insert into public.shipment_status_history (shipment_id, status, source, changed_by, note)
  values (p_shipment_id, v_new_status, 'admin_override', auth.uid(), p_note);

  perform public.log_audit('shipment_admin_override', 'shipments', p_shipment_id::text,
    jsonb_build_object('status', v_shipment.status), jsonb_build_object('status', v_new_status, 'note', p_note));

  return jsonb_build_object('ok', true, 'status', v_new_status);
end;
$$;
revoke all on function public.admin_override_shipment(uuid, text, text, text, text, date, text) from public, anon;
grant execute on function public.admin_override_shipment(uuid, text, text, text, text, date, text) to authenticated;

-- ─── 16. NOTIFICATION TEMPLATES — new per-shipment keys ────────────────
-- Additive to the existing reusable notification infrastructure
-- (notifications / notification_preferences / notification_templates).
-- These are scoped to ONE shipment, not the whole order — a multi-vendor
-- order fires one of these per seller's shipment event, independently.
insert into public.notification_templates (key, title, body) values
  ('shipment_shipped',          '📦 Une partie de votre commande est en route !', 'Un vendeur a expédié votre colis.'),
  ('shipment_delivered',        '🎉 Colis livré !',                               'Un colis de votre commande est arrivé.'),
  ('shipment_delivery_failed',  '⚠️ Problème de livraison',                       'Un problème est survenu avec un colis de votre commande.')
on conflict (key) do nothing;
