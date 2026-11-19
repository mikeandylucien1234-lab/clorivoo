-- ═══════════════════════════════════════════════════════════════
-- CLORIVO — PHASE 4: Orders, Payments, Commissions & Refunds
-- NOT applied to production. Written and tested exclusively in
-- BEGIN...ROLLBACK transactions against the live project
-- (kpwebnoqsjlxxiamwsst) — see Phase 4 report for the exact test
-- transcript. Run this file manually in the Supabase SQL editor
-- (or via a reviewed `apply_migration`) only after explicit approval.
--
-- PREREQUISITES (run before this file, in addition to schema.sql and
-- Phase 0–3): product_moderation_migration.sql. create_order() (§13
-- below) reads and checks products.approval_status, a column that file
-- adds — not schema.sql, not any Phase 0–3 file. On the live project
-- this was already applied (dated before Phase 4 in the project's own
-- migration history), so the dependency was invisible there; a clean
-- database built only from schema.sql + Phase 0–3 has create_order()
-- fail at runtime ("column approval_status does not exist") the first
-- time anyone calls it, even though the migration itself applies with
-- no error (CREATE FUNCTION doesn't validate a plpgsql body's column
-- references until first execution). Found and fixed during local
-- Postgres 17 integration testing — see that report for the exact
-- failure.
--
-- Business rules applied here, as approved by the user on 2026-10-10:
--   - Commission: 10% of the product subtotal, EXCLUDING shipping fees.
--     Rate is stored server-side (commission_rules) and snapshotted onto
--     each order at creation time — never computed only in the frontend,
--     never editable by a seller, never retroactively changed.
--   - Currency: USD, fixed, recorded explicitly on every new order. No
--     conversion logic. Historical orders (there are none in production
--     today — see audit) are never touched retroactively.
--   - Payment confirmation: creating an order NEVER marks it paid. No
--     payment integration (MonCash/NatCash/card) is actually connected —
--     see the Phase 4 report for exactly what remains to configure.
--     payment_status starts and stays 'pending' until a permitted human
--     explicitly records a provider confirmation through
--     admin_confirm_payment(); nothing in this migration can mark a
--     payment "paid" from the browser side alone.
--
-- Audit findings this migration fixes (verified against the live schema
-- before writing any of this):
--   1. "Buyers can create orders" (orders, INSERT, WITH CHECK buyer_id =
--      auth.uid() only) let a client insert ANY total/status/payment_status
--      directly. sbCreateOrder() / mobile createOrder() both hard-coded
--      payment_status:'paid' on every order. Fixed by dropping that
--      policy and this table's INSERT path entirely in favor of the one
--      new create_order() RPC, which recomputes price/stock/discount
--      server-side and always starts payment_status='pending'.
--   2. "Orders can be inserted with items" (order_items, INSERT) had the
--      same shape of problem — client-supplied unit_price trusted
--      outright, plus a real bug: the client code inserted a `price`
--      key against a column actually named `unit_price`, so every
--      order_items row ever written would have unit_price=0. Fixed the
--      same way — order_items are now only ever written by create_order().
--   3. "Sellers can update order status" (orders, UPDATE, USING only, NO
--      WITH CHECK) let any seller with one item on an order rewrite that
--      order's total, payment_status, buyer_id — anything. Fixed by
--      removing sellers' direct UPDATE access to `orders` altogether;
--      sellers now only ever touch their own order_items.fulfillment_status
--      (new column), through a trigger that reverts every other column
--      and only allows the one-step-forward transitions
--      pending->processing->shipped->delivered.
--   4. order_items had no fulfillment tracking per seller at all — only
--      one order-wide `status`. Multi-vendor orders could not express
--      "seller A shipped, seller B hasn't". Fixed with the new
--      order_items.fulfillment_status column.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ORDERS / ORDER_ITEMS — additive columns + constraint extension ──
alter table public.orders
  add column if not exists currency text not null default 'USD',
  add column if not exists commission_rate numeric;

alter table public.orders
  drop constraint orders_payment_status_check,
  add constraint orders_payment_status_check check (payment_status = any (array[
    'pending','paid','failed','refunded','partially_refunded'
  ]));

alter table public.order_items
  add column if not exists fulfillment_status text not null default 'pending'
    check (fulfillment_status = any (array['pending','processing','shipped','delivered','cancelled']));

-- ─── 2. COMMISSION RULES — the one place the rate is ever defined ──────
create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  rate numeric not null check (rate >= 0 and rate <= 1),
  basis text not null default 'product_subtotal_excl_shipping',
  effective_from timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);
alter table public.commission_rules enable row level security;

-- Approved rate: 10% of product subtotal, excluding shipping, effective
-- immediately. Orders created before this row's effective_from (there are
-- none — orders table is empty) are never retroactively affected; the
-- snapshot trigger below only reads the rule active at each order's own
-- creation time.
insert into public.commission_rules (rate, basis, effective_from, note)
values (0.10, 'product_subtotal_excl_shipping', now(), 'Phase 4 initial rate — approved by project owner 2026-10-10');

-- No INSERT/UPDATE policy exists for any client role, intentionally: the
-- rate is a business decision that changes by a new reviewed migration,
-- never through the admin UI or any RPC. This alone guarantees no
-- seller (or admin click) can ever change it at runtime.
create policy "Permitted staff can view commission rules" on public.commission_rules for select
  using (public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'orders.view'));

-- ─── 3. PAYMENT INTENTS — one row per payment attempt ──────────────────
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id),
  provider text not null check (provider = any (array['moncash','natcash','card','cod','wallet'])),
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status = any (array['pending','processing','succeeded','failed','cancelled'])),
  provider_reference text,
  idempotency_key text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles(id)
);
create unique index if not exists payment_intents_provider_ref_uq
  on public.payment_intents (provider, provider_reference) where provider_reference is not null;
alter table public.payment_intents enable row level security;

create policy "Buyers see their own payment intents" on public.payment_intents for select
  using (buyer_id = auth.uid());
create policy "Permitted staff view all payment intents" on public.payment_intents for select
  using (public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'payments.confirm'));
-- No INSERT/UPDATE policy for any client role: writes only happen inside
-- record_payment_attempt() / admin_confirm_payment() (SECURITY DEFINER),
-- so nobody can forge or flip a payment's status via a direct REST call.

-- ─── 4. PAYMENT WEBHOOK EVENTS — idempotency ledger for future gateways ─
-- No policies at all: only the service_role (used by a future Edge
-- Function receiving a real provider webhook) can write here. Documents
-- the idempotency contract a real integration must honor; nothing reads
-- or writes this table yet because no provider is connected (see report).
create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  result text
);
create unique index if not exists payment_webhook_events_provider_event_uq
  on public.payment_webhook_events (provider, event_id);
alter table public.payment_webhook_events enable row level security;

-- ─── 5. COMMISSION LEDGER — realized accounting entries only ──────────
-- Rows are created only when a payment is actually confirmed (never at
-- order creation — a pending order has no realized revenue), and reversed
-- proportionally when a refund succeeds. No seller-facing policy exists:
-- this is an internal accounting record, not a "balance" — the task
-- explicitly forbids presenting any amount as available without a real
-- settlement/payout system, which does not exist yet.
create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  shop_id uuid references public.shops(id),
  payment_intent_id uuid references public.payment_intents(id),
  gross_amount numeric not null,
  commission_rate numeric not null,
  commission_amount numeric not null,
  net_amount numeric not null,
  entry_type text not null default 'charge' check (entry_type = any (array['charge','refund_reversal'])),
  related_refund_id uuid,
  status text not null default 'confirmed' check (status = any (array['confirmed','reversed'])),
  created_at timestamptz not null default now()
);
alter table public.commission_ledger enable row level security;
create policy "Permitted staff view commission ledger" on public.commission_ledger for select
  using (public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'orders.view'));
-- No insert/update policy for any client role — written only inside
-- admin_confirm_payment() / admin_record_refund_result().

-- ─── 6. REFUND REQUESTS — the business decision ────────────────────────
-- order_item_id (nullable, additive): when set, this request concerns ONE
-- specific line item (and therefore one specific seller) rather than the
-- whole order — see admin_record_refund_result() for how this changes
-- the commission reconciliation. Left null, a request behaves exactly as
-- before (order-wide, proportional across every seller on the order).
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  order_item_id uuid references public.order_items(id),
  requested_by uuid not null references public.profiles(id),
  reason text not null,
  amount_requested numeric not null check (amount_requested > 0),
  amount_approved numeric,
  status text not null default 'requested' check (status = any (array[
    'requested','under_review','approved','rejected','processing','succeeded','failed'
  ])),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.refund_requests enable row level security;
create policy "Buyers see their own refund requests" on public.refund_requests for select
  using (requested_by = auth.uid());
create policy "Permitted staff view all refund requests" on public.refund_requests for select
  using (public.has_permission(auth.uid(), 'orders.refund') or public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'payments.confirm'));
-- No insert/update policy: created only by request_refund(), decided only
-- by admin_decide_refund() (both SECURITY DEFINER) — a buyer cannot
-- fabricate an "approved" request and a seller cannot touch this table at all.

-- ─── 7. REFUNDS — the actual provider-side transaction record ─────────
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.refund_requests(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  order_item_id uuid references public.order_items(id),
  payment_intent_id uuid references public.payment_intents(id),
  provider text,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status = any (array['pending','processing','succeeded','failed'])),
  provider_reference text,
  recorded_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create unique index if not exists refunds_provider_ref_uq
  on public.refunds (provider, provider_reference) where provider_reference is not null;
alter table public.refunds enable row level security;
create policy "Buyers see refunds on their own orders" on public.refunds for select
  using (order_id in (select id from public.orders where buyer_id = auth.uid()));
create policy "Permitted staff view all refunds" on public.refunds for select
  using (public.has_permission(auth.uid(), 'orders.refund') or public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'payments.confirm'));
-- No insert/update policy: written only by admin_record_refund_result().

alter table public.commission_ledger
  add constraint commission_ledger_related_refund_id_fkey
  foreign key (related_refund_id) references public.refunds(id);

-- ─── 8. PERMISSIONS (existing catalog mechanism — no parallel system) ──
insert into public.permissions (key, module, label) values
  ('payments.view', 'payments', 'View payments and commission ledger'),
  ('payments.confirm', 'payments', 'Confirm payments and record refund results')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select (select id from public.staff_roles where name = 'Super Admin'), k
from (values ('payments.view'), ('payments.confirm')) as t(k)
where exists (select 1 from public.staff_roles where name = 'Super Admin')
on conflict do nothing;

-- ─── 9. COMMISSION / CURRENCY SNAPSHOT (BEFORE INSERT on orders) ──────
create or replace function public.snapshot_order_commission_rate()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if new.commission_rate is null then
    select rate into new.commission_rate from public.commission_rules
      where effective_from <= coalesce(new.created_at, now())
      order by effective_from desc limit 1;
  end if;
  if new.currency is null then
    new.currency := 'USD';
  end if;
  return new;
end;
$$;
revoke execute on function public.snapshot_order_commission_rate() from public, anon, authenticated;

create trigger snapshot_order_commission_rate_trg
before insert on public.orders
for each row execute function public.snapshot_order_commission_rate();

-- ─── 10. CLOSE THE orders SELF-SERVICE FINANCIAL ESCALATION ────────────
create or replace function public.protect_order_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
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

  -- payments.confirm — the one other legitimate direct write to `orders`:
  -- admin_confirm_payment() (payment_status -> paid/failed, plus the
  -- matching pending->confirmed status bump only on a successful
  -- payment) and admin_record_refund_result() (payment_status ->
  -- refunded/partially_refunded). Narrowly scoped to those exact values
  -- and that exact status transition — everything else about the row,
  -- including any other column the caller's UPDATE statement tried to
  -- set, is reset to OLD below, the same way the orders.cancel branch
  -- above only ever applies its own one sanctioned change. Neither
  -- function is weakened or bypassed by this — this only lets their
  -- own, already permission-checked UPDATE actually persist instead of
  -- being silently reverted. (Second-pass fix: found during local
  -- Postgres 17 integration testing — admin_confirm_payment()'s and
  -- admin_record_refund_result()'s own UPDATEs to orders were being
  -- silently discarded by this trigger, since payments.confirm was
  -- never one of its allowed permissions, even though both functions
  -- already correctly check for it themselves before attempting the
  -- update. orders.refund was audited too: neither admin_initiate_refund()
  -- nor admin_decide_refund() ever updates `orders` directly, so no
  -- branch for it was added here — there is nothing for it to protect.)
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

  -- No other direct client update to `orders` is permitted at all — every
  -- other write path (payment confirmation, refunds, commission) goes
  -- through its own dedicated, permission-checked RPC instead.
  return old;
end;
$$;
revoke execute on function public.protect_order_fields() from public, anon, authenticated;

create trigger protect_order_fields_trg
before update on public.orders
for each row execute function public.protect_order_fields();

-- ─── 11. CLOSE THE order_items SELF-SERVICE ESCALATION ─────────────────
-- A seller may move ONLY their own items' fulfillment_status forward one
-- step at a time (pending->processing->shipped->delivered); every other
-- column, and any other status jump (including straight to 'cancelled'),
-- is silently reverted — independent of whatever RLS policy let the row
-- through.
create or replace function public.protect_order_item_fields()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_requested_status text;
  allowed_next text[];
begin
  if public.has_permission(auth.uid(), 'orders.edit') then
    if new.fulfillment_status is distinct from old.fulfillment_status then
      perform public.log_audit('order_item_status_changed', 'order_items', new.id::text,
        jsonb_build_object('status', old.fulfillment_status),
        jsonb_build_object('status', new.fulfillment_status, 'order_id', new.order_id));
    end if;
    return new;
  end if;

  if old.seller_id is distinct from auth.uid() then
    return old; -- not this seller's item: block entirely
  end if;

  v_requested_status := new.fulfillment_status;
  allowed_next := case old.fulfillment_status
    when 'pending' then array['processing']
    when 'processing' then array['shipped']
    when 'shipped' then array['delivered']
    else array[]::text[]
  end;

  new := old; -- revert every column a seller might have tried to change

  if v_requested_status is not null and v_requested_status = any(allowed_next) then
    new.fulfillment_status := v_requested_status;
    perform public.log_audit('order_item_status_changed', 'order_items', new.id::text,
      jsonb_build_object('status', old.fulfillment_status),
      jsonb_build_object('status', v_requested_status, 'order_id', new.order_id));
  end if;

  return new;
end;
$$;
revoke execute on function public.protect_order_item_fields() from public, anon, authenticated;

create trigger protect_order_item_fields_trg
before update on public.order_items
for each row execute function public.protect_order_item_fields();

-- ─── 12. RLS — replace the two insecure direct-insert policies ────────
drop policy "Buyers can create orders" on public.orders;
drop policy "Orders can be inserted with items" on public.order_items;
drop policy "Sellers can update order status" on public.orders;

create policy "Permitted staff can view all orders" on public.orders for select
  using (
    public.has_permission(auth.uid(), 'orders.view') or public.has_permission(auth.uid(), 'orders.edit')
    or public.has_permission(auth.uid(), 'orders.cancel') or public.has_permission(auth.uid(), 'orders.refund')
    or public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'payments.confirm')
  );
create policy "Permitted staff can update orders" on public.orders for update
  using (public.has_permission(auth.uid(), 'orders.edit') or public.has_permission(auth.uid(), 'orders.cancel'));

create policy "Sellers can update fulfillment status of their items" on public.order_items for update
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());
create policy "Permitted staff can view all order items" on public.order_items for select
  using (
    public.has_permission(auth.uid(), 'orders.view') or public.has_permission(auth.uid(), 'orders.edit')
    or public.has_permission(auth.uid(), 'orders.cancel') or public.has_permission(auth.uid(), 'orders.refund')
    or public.has_permission(auth.uid(), 'payments.view') or public.has_permission(auth.uid(), 'payments.confirm')
  );
create policy "Permitted staff can update order items" on public.order_items for update
  using (public.has_permission(auth.uid(), 'orders.edit'));

-- Note: "Admins see all orders" (checks profiles.role='admin' directly)
-- and the buyer/seller SELECT policies from earlier phases are untouched.

-- ─── 13. create_order() — the ONLY way an order comes into existence ──
-- Sources items from the buyer's own persisted cart (never from a
-- client-supplied items list), re-reads price/stock/availability from
-- `products` under a row lock (prevents oversell/stale-price races),
-- recomputes subtotal/discount/total server-side, and always starts
-- status='pending' / payment_status='pending'. Clears the cart on success.
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
begin
  if v_buyer is null then raise exception 'Authentication required'; end if;
  if p_payment_method not in ('moncash','natcash','card','cod','wallet') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  select id into v_cart_id from public.carts where user_id = v_buyer;
  if v_cart_id is null then raise exception 'Cart is empty'; end if;

  -- PASS 1: lock every cart line's product row, validate it, and sum the
  -- real subtotal — no write to orders/order_items/products here yet.
  -- (Second-pass fix: orders used to be inserted with 0/0/0/0 placeholders
  -- and corrected by a follow-up UPDATE below — but protect_order_fields_trg
  -- (§10 above) fires on every UPDATE to orders and, since the ordering
  -- buyer has neither orders.edit nor an orders.cancel transition, silently
  -- reverted that UPDATE to OLD, leaving every real order permanently
  -- stuck at subtotal/total_amount = 0 in the table despite this function's
  -- own return value reporting the correct total. Confirmed by live
  -- execution against a local Postgres 17 test database — see that
  -- report. Fixed by computing the real totals BEFORE the single INSERT
  -- below, so orders is only ever INSERTed here, never UPDATEd, and
  -- protect_order_fields_trg is never involved in order creation at all —
  -- the trigger itself is unchanged and still protects the row from any
  -- later UPDATE exactly as before.)
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

  -- No shipping-cost model exists yet (the current checkout always sends
  -- shippingFee: 0) — documented limitation, not a Phase 4 invention.
  v_total := v_subtotal - v_discount + v_shipping_fee;

  -- The ONE write to orders — with the real, already-computed totals, so
  -- no follow-up UPDATE (and therefore no collision with
  -- protect_order_fields_trg) is ever needed.
  insert into public.orders (
    buyer_id, status, subtotal, discount, shipping_fee, total_amount,
    promo_code, shipping_address, shipping_method, payment_method, payment_status
  ) values (
    v_buyer, 'pending', v_subtotal, v_discount, v_shipping_fee, v_total,
    p_promo_code, coalesce(p_shipping_address, '{}'::jsonb), coalesce(p_shipping_method, 'standard'),
    p_payment_method, 'pending'
  ) returning id into v_order_id;

  -- PASS 2: same locked rows (the FOR UPDATE lock from PASS 1 is held for
  -- the rest of this transaction), now actually write order_items and
  -- decrement stock.
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
    insert into public.order_items (order_id, product_id, shop_id, seller_id, title, image_url, variant, quantity, unit_price)
    values (v_order_id, v_item.product_id, v_item.shop_id, v_item.seller_id, v_item.title,
            v_item.images[1], coalesce(v_item.variant, '{}'::jsonb), v_item.quantity, v_item.price);

    update public.products set stock = stock - v_item.quantity where id = v_item.product_id;
  end loop;

  delete from public.cart_items where cart_id = v_cart_id;

  perform public.log_audit('order_created', 'orders', v_order_id::text, null,
    jsonb_build_object('total_amount', v_total, 'item_count', v_item_count));

  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'total_amount', v_total,
    'subtotal', v_subtotal, 'discount', v_discount, 'payment_status', 'pending');
end;
$$;
revoke all on function public.create_order(jsonb, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text) to authenticated;

-- ─── 14. record_payment_attempt() — buyer logs an attempt, server sets amount ──
create or replace function public.record_payment_attempt(
  p_order_id uuid, p_provider text, p_provider_reference text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_intent_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid();
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.payment_status <> 'pending' then
    raise exception 'This order is not awaiting payment (status: %)', v_order.payment_status;
  end if;
  if p_provider not in ('moncash','natcash','card','cod','wallet') then
    raise exception 'Invalid provider: %', p_provider;
  end if;

  insert into public.payment_intents (order_id, buyer_id, provider, amount, currency, status, provider_reference)
  values (p_order_id, auth.uid(), p_provider, v_order.total_amount, v_order.currency, 'pending', p_provider_reference)
  returning id into v_intent_id;

  perform public.log_audit('payment_attempt_recorded', 'payment_intents', v_intent_id::text, null,
    jsonb_build_object('order_id', p_order_id, 'provider', p_provider));

  return jsonb_build_object('ok', true, 'intent_id', v_intent_id, 'amount', v_order.total_amount, 'currency', v_order.currency);
end;
$$;
revoke all on function public.record_payment_attempt(uuid, text, text) from public, anon;
grant execute on function public.record_payment_attempt(uuid, text, text) to authenticated;

-- ─── 15. admin_confirm_payment() — the ONLY way payment_status becomes 'paid' ──
-- Requires payments.confirm. Nothing else in this schema can set
-- orders.payment_status to 'paid'. Creates one commission_ledger 'charge'
-- row per seller in the order, using the rate snapshotted on the order at
-- creation time (never today's rate, never client-supplied).
create or replace function public.admin_confirm_payment(
  p_intent_id uuid, p_result text, p_provider_reference text default null, p_notes text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_intent record;
  v_order record;
  v_rate numeric;
  v_seller record;
begin
  if not public.has_permission(auth.uid(), 'payments.confirm') then
    raise exception 'Permission denied: payments.confirm required';
  end if;
  if p_result not in ('succeeded','failed') then raise exception 'Invalid result: %', p_result; end if;

  select * into v_intent from public.payment_intents where id = p_intent_id for update;
  if v_intent.id is null then raise exception 'Payment intent not found'; end if;
  if v_intent.status in ('succeeded','failed') then
    raise exception 'This payment attempt was already resolved (status: %)', v_intent.status;
  end if;

  select * into v_order from public.orders where id = v_intent.order_id for update;
  if p_result = 'succeeded' and v_order.payment_status = 'paid' then
    raise exception 'This order is already marked paid — refusing to process a second successful payment';
  end if;

  update public.payment_intents set
    status = p_result,
    provider_reference = coalesce(p_provider_reference, provider_reference),
    failure_reason = case when p_result = 'failed' then p_notes else null end,
    confirmed_at = now(), confirmed_by = auth.uid(), updated_at = now()
  where id = p_intent_id;

  if p_result = 'succeeded' then
    update public.orders set payment_status = 'paid',
      status = case when status = 'pending' then 'confirmed' else status end
    where id = v_order.id;

    v_rate := coalesce(v_order.commission_rate, 0);

    for v_seller in
      select seller_id, shop_id, sum(unit_price * quantity) as gross
      from public.order_items where order_id = v_order.id
      group by seller_id, shop_id
    loop
      insert into public.commission_ledger (
        order_id, seller_id, shop_id, payment_intent_id, gross_amount, commission_rate, commission_amount, net_amount, entry_type, status
      ) values (
        v_order.id, v_seller.seller_id, v_seller.shop_id, p_intent_id, v_seller.gross, v_rate,
        round(v_seller.gross * v_rate, 2), round(v_seller.gross * (1 - v_rate), 2), 'charge', 'confirmed'
      );
    end loop;
  else
    update public.orders set payment_status = 'failed' where id = v_order.id;
  end if;

  perform public.log_audit('payment_' || p_result, 'payment_intents', p_intent_id::text,
    jsonb_build_object('status', v_intent.status), jsonb_build_object('status', p_result));

  return jsonb_build_object('ok', true, 'status', p_result);
end;
$$;
revoke all on function public.admin_confirm_payment(uuid, text, text, text) from public, anon;
grant execute on function public.admin_confirm_payment(uuid, text, text, text) to authenticated;

-- ─── 15b. refundable_amount() — the one place the refund cap is computed ──
-- Shared by request_refund / admin_initiate_refund / admin_record_refund_result
-- so the three can never disagree. Two independent caps, both enforced:
--   - order-wide: never refund more than the order's own total_amount,
--     across ALL requests/refunds on it, item-scoped or not;
--   - item-level (only when p_order_item_id is given): never refund more
--     than that single item's own unit_price*quantity, across its own
--     requests/refunds. The final cap is whichever is smaller.
-- Guards total_amount = 0 explicitly: such an order (100% discount) has
-- nothing left to refund, by definition, not a division error.
-- p_exclude_request_id (additive): when checking the cap for a request
-- that ALREADY EXISTS (i.e. from admin_record_refund_result, recording
-- the outcome of the very request being resolved), that request's own
-- amount_requested must not count against itself as "already reserved" —
-- otherwise an approved request's remaining cap would always compute to
-- zero against its own reservation. request_refund/admin_initiate_refund
-- (creating a NEW request) pass no exclusion, since there is no self to
-- exclude yet.
create or replace function public.refundable_amount(p_order_id uuid, p_order_item_id uuid default null, p_exclude_request_id uuid default null)
returns numeric
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_order_total numeric;
  v_order_refunded numeric;
  v_order_requested numeric;
  v_order_remaining numeric;
  v_item_total numeric;
  v_item_refunded numeric;
  v_item_requested numeric;
  v_item_remaining numeric;
begin
  select total_amount into v_order_total from public.orders where id = p_order_id;
  if v_order_total is null then raise exception 'Order not found'; end if;
  if v_order_total <= 0 then return 0; end if;

  select coalesce(sum(amount), 0) into v_order_refunded from public.refunds
    where order_id = p_order_id and status = 'succeeded';
  select coalesce(sum(amount_requested), 0) into v_order_requested from public.refund_requests
    where order_id = p_order_id and status in ('requested','under_review','approved','processing')
      and (p_exclude_request_id is null or id <> p_exclude_request_id);
  v_order_remaining := greatest(v_order_total - v_order_refunded - v_order_requested, 0);

  if p_order_item_id is null then
    return v_order_remaining;
  end if;

  select unit_price * quantity into v_item_total from public.order_items
    where id = p_order_item_id and order_id = p_order_id;
  if v_item_total is null then raise exception 'Order item not found on this order'; end if;
  if v_item_total <= 0 then return 0; end if;

  select coalesce(sum(amount), 0) into v_item_refunded from public.refunds
    where order_item_id = p_order_item_id and status = 'succeeded';
  select coalesce(sum(amount_requested), 0) into v_item_requested from public.refund_requests
    where order_item_id = p_order_item_id and status in ('requested','under_review','approved','processing')
      and (p_exclude_request_id is null or id <> p_exclude_request_id);
  v_item_remaining := greatest(v_item_total - v_item_refunded - v_item_requested, 0);

  return least(v_order_remaining, v_item_remaining);
end;
$$;
revoke all on function public.refundable_amount(uuid, uuid, uuid) from public, anon, authenticated;

-- ─── 16. request_refund() — buyer requests, amount capped server-side ──
-- p_order_item_id (optional, additive): when the buyer is complaining
-- about one specific product, pass its order_items.id so the cap and the
-- eventual commission reversal apply to that seller only, not the whole
-- order. Omit it (as before) for a whole-order refund.
create or replace function public.request_refund(
  p_order_id uuid, p_reason text, p_amount numeric default null, p_order_item_id uuid default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_remaining numeric;
  v_amount numeric;
  v_request_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = auth.uid();
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.payment_status not in ('paid','partially_refunded') then
    raise exception 'This order has not been paid, so it cannot be refunded (status: %)', v_order.payment_status;
  end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A reason is required'; end if;
  if p_order_item_id is not null and not exists (
    select 1 from public.order_items where id = p_order_item_id and order_id = p_order_id
  ) then
    raise exception 'This item does not belong to this order';
  end if;

  v_remaining := public.refundable_amount(p_order_id, p_order_item_id);
  if v_remaining <= 0 then raise exception 'No refundable amount remains on this order'; end if;

  v_amount := coalesce(p_amount, v_remaining);
  if v_amount <= 0 or v_amount > v_remaining then
    raise exception 'Requested amount (%) exceeds the refundable amount (%)', v_amount, v_remaining;
  end if;

  insert into public.refund_requests (order_id, order_item_id, requested_by, reason, amount_requested, status)
  values (p_order_id, p_order_item_id, auth.uid(), p_reason, v_amount, 'requested')
  returning id into v_request_id;

  perform public.log_audit('refund_requested', 'refund_requests', v_request_id::text, null,
    jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id, 'amount_requested', v_amount));

  return jsonb_build_object('ok', true, 'request_id', v_request_id, 'amount_requested', v_amount);
end;
$$;
revoke all on function public.request_refund(uuid, text, numeric, uuid) from public, anon;
grant execute on function public.request_refund(uuid, text, numeric, uuid) to authenticated;

-- ─── 16b. admin_initiate_refund() — admin/staff-initiated goodwill refund ──
-- Same amount caps as request_refund(), but callable by orders.refund
-- staff on any order (not just the buyer's own), and lands directly in
-- 'approved' since the admin's own action is the approval decision —
-- the actual provider-side execution still only happens through
-- admin_record_refund_result(), never here.
create or replace function public.admin_initiate_refund(
  p_order_id uuid, p_reason text, p_amount numeric default null, p_order_item_id uuid default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_remaining numeric;
  v_amount numeric;
  v_request_id uuid;
begin
  if not public.has_permission(auth.uid(), 'orders.refund') then
    raise exception 'Permission denied: orders.refund required';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then raise exception 'Order not found'; end if;
  if v_order.payment_status not in ('paid','partially_refunded') then
    raise exception 'This order has not been paid, so it cannot be refunded (status: %)', v_order.payment_status;
  end if;
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A reason is required'; end if;
  if p_order_item_id is not null and not exists (
    select 1 from public.order_items where id = p_order_item_id and order_id = p_order_id
  ) then
    raise exception 'This item does not belong to this order';
  end if;

  v_remaining := public.refundable_amount(p_order_id, p_order_item_id);
  if v_remaining <= 0 then raise exception 'No refundable amount remains on this order'; end if;

  v_amount := coalesce(p_amount, v_remaining);
  if v_amount <= 0 or v_amount > v_remaining then
    raise exception 'Requested amount (%) exceeds the refundable amount (%)', v_amount, v_remaining;
  end if;

  insert into public.refund_requests (order_id, order_item_id, requested_by, reason, amount_requested, amount_approved, status, decided_by, decided_at, decision_notes)
  values (p_order_id, p_order_item_id, auth.uid(), p_reason, v_amount, v_amount, 'approved', auth.uid(), now(), 'Admin-initiated')
  returning id into v_request_id;

  perform public.log_audit('refund_initiated_by_admin', 'refund_requests', v_request_id::text, null,
    jsonb_build_object('order_id', p_order_id, 'order_item_id', p_order_item_id, 'amount_requested', v_amount));

  return jsonb_build_object('ok', true, 'request_id', v_request_id, 'amount_requested', v_amount);
end;
$$;
revoke all on function public.admin_initiate_refund(uuid, text, numeric, uuid) from public, anon;
grant execute on function public.admin_initiate_refund(uuid, text, numeric, uuid) to authenticated;

-- ─── 17. admin_decide_refund() — the business decision (orders.refund) ──
create or replace function public.admin_decide_refund(
  p_request_id uuid, p_decision text, p_notes text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_req record;
begin
  if not public.has_permission(auth.uid(), 'orders.refund') then
    raise exception 'Permission denied: orders.refund required';
  end if;
  if p_decision not in ('under_review','approved','rejected') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  select * into v_req from public.refund_requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'Refund request not found'; end if;
  if v_req.status not in ('requested','under_review') then
    raise exception 'This request was already decided (status: %)', v_req.status;
  end if;
  if p_decision = 'rejected' and (p_notes is null or btrim(p_notes) = '') then
    raise exception 'A rejection requires a reason';
  end if;

  update public.refund_requests set
    status = p_decision,
    amount_approved = case when p_decision = 'approved' then v_req.amount_requested else amount_approved end,
    decided_by = auth.uid(), decided_at = now(), decision_notes = p_notes, updated_at = now()
  where id = p_request_id;

  perform public.log_audit('refund_' || p_decision, 'refund_requests', p_request_id::text,
    jsonb_build_object('status', v_req.status), jsonb_build_object('status', p_decision));

  return jsonb_build_object('ok', true, 'status', p_decision);
end;
$$;
revoke all on function public.admin_decide_refund(uuid, text, text) from public, anon;
grant execute on function public.admin_decide_refund(uuid, text, text) to authenticated;

-- ─── 18. admin_record_refund_result() — real provider-side outcome only ──
-- No simulated success: this only records what a permitted human
-- (payments.confirm) attests actually happened at the provider (or, once
-- a real gateway is connected, what its API/webhook confirmed).
--
-- Amount rules (apply to EVERY result, not just 'succeeded'):
--   - required, must be > 0 (the `refunds.amount` column itself also has
--     a CHECK(amount > 0) as a second, independent guard);
--   - capped by refundable_amount(), which enforces both the order-wide
--     cap and, when this request is scoped to one item
--     (refund_requests.order_item_id), that item's own cap too;
--   - also capped by amount_approved, the figure a human actually approved.
-- A 'failed' result NEVER touches orders.payment_status or
-- commission_ledger — only 'succeeded' does, and only once per request
-- (idempotency: a request already in 'succeeded' or 'failed' is terminal
-- and is rejected by the status check below).
create or replace function public.admin_record_refund_result(
  p_request_id uuid, p_result text, p_amount numeric, p_provider_reference text default null, p_notes text default null
) returns jsonb
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  v_req record;
  v_order record;
  v_refund_id uuid;
  v_remaining numeric;
  v_denominator numeric;
  v_intent record;
  v_seller record;
  v_ratio numeric;
  v_total_succeeded numeric;
begin
  if not public.has_permission(auth.uid(), 'payments.confirm') then
    raise exception 'Permission denied: payments.confirm required';
  end if;
  if p_result not in ('processing','succeeded','failed') then raise exception 'Invalid result: %', p_result; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be a positive number (got %)', p_amount;
  end if;

  select * into v_req from public.refund_requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'Refund request not found'; end if;
  if v_req.status not in ('approved','processing') then
    raise exception 'This refund must be approved before it can be recorded (status: %)', v_req.status;
  end if;

  select * into v_order from public.orders where id = v_req.order_id for update;

  -- Cohérence du montant avec la demande concernée: capé à la fois par ce
  -- qui reste réellement remboursable (ordre + article le cas échéant) ET
  -- par le montant que l'admin a approuvé — quel que soit le résultat.
  v_remaining := public.refundable_amount(v_req.order_id, v_req.order_item_id, p_request_id);
  if p_amount > v_remaining or (v_req.amount_approved is not null and p_amount > v_req.amount_approved) then
    raise exception 'Refund amount (%) exceeds what remains refundable (%) or the approved amount (%)', p_amount, v_remaining, v_req.amount_approved;
  end if;

  select * into v_intent from public.payment_intents
    where order_id = v_req.order_id and status = 'succeeded' order by confirmed_at desc limit 1;

  insert into public.refunds (refund_request_id, order_id, order_item_id, payment_intent_id, provider, amount, currency, status, provider_reference, recorded_by, notes, confirmed_at)
  values (p_request_id, v_req.order_id, v_req.order_item_id, v_intent.id, coalesce(v_intent.provider, v_order.payment_method), p_amount, v_order.currency,
          p_result, p_provider_reference, auth.uid(), p_notes, case when p_result = 'succeeded' then now() else null end)
  returning id into v_refund_id;

  update public.refund_requests set status = p_result, updated_at = now() where id = p_request_id;

  -- 'processing' and 'failed' stop here: no order/commission mutation at
  -- all, so a failed or in-flight attempt can never move money or alter
  -- what a seller is owed.
  if p_result = 'succeeded' then
    select coalesce(sum(amount), 0) into v_total_succeeded from public.refunds
      where order_id = v_req.order_id and status = 'succeeded';
    update public.orders set payment_status = case
      when v_total_succeeded >= v_order.total_amount then 'refunded' else 'partially_refunded'
    end where id = v_req.order_id;

    if v_req.order_item_id is not null then
      -- Item-scoped refund: reverse ONLY the seller who owns that item,
      -- for exactly the refunded amount — never touches any other
      -- seller's commission on a multi-vendor order, and never scales by
      -- that seller's OTHER items in the same order (commission_rate is a
      -- flat percentage, so the commission on any refunded sub-amount of
      -- one item is simply amount * rate, independent of the rest of the
      -- seller's order).
      select cl.seller_id, cl.shop_id, cl.commission_rate into v_seller
      from public.commission_ledger cl
      join public.order_items oi on oi.id = v_req.order_item_id
      where cl.order_id = v_req.order_id and cl.entry_type = 'charge' and cl.status = 'confirmed'
        and cl.seller_id = oi.seller_id
      limit 1;

      if v_seller.seller_id is not null then
        insert into public.commission_ledger (
          order_id, seller_id, shop_id, gross_amount, commission_rate, commission_amount, net_amount, entry_type, status, related_refund_id
        ) values (
          v_req.order_id, v_seller.seller_id, v_seller.shop_id,
          -p_amount, v_seller.commission_rate,
          round(-p_amount * v_seller.commission_rate, 2),
          round(-p_amount * (1 - v_seller.commission_rate), 2),
          'refund_reversal', 'confirmed', v_refund_id
        );
      end if;
    else
      -- Order-wide refund: reverse every seller's charge proportionally
      -- to this refund's share of the order's own total.
      v_denominator := v_order.total_amount;
      if v_denominator > 0 then
        v_ratio := p_amount / v_denominator;
        for v_seller in
          select seller_id, shop_id, gross_amount, commission_rate, commission_amount, net_amount
          from public.commission_ledger where order_id = v_req.order_id and entry_type = 'charge' and status = 'confirmed'
        loop
          insert into public.commission_ledger (
            order_id, seller_id, shop_id, gross_amount, commission_rate, commission_amount, net_amount, entry_type, status, related_refund_id
          ) values (
            v_req.order_id, v_seller.seller_id, v_seller.shop_id,
            round(-v_seller.gross_amount * v_ratio, 2), v_seller.commission_rate,
            round(-v_seller.commission_amount * v_ratio, 2), round(-v_seller.net_amount * v_ratio, 2),
            'refund_reversal', 'confirmed', v_refund_id
          );
        end loop;
      end if;
      -- v_denominator = 0 means the order itself had total_amount = 0 (a
      -- 100%-discount order) — nothing was ever charged, so there is no
      -- commission to reverse and no division is attempted.
    end if;
  end if;

  perform public.log_audit('refund_' || p_result, 'refunds', v_refund_id::text, null,
    jsonb_build_object('order_id', v_req.order_id, 'order_item_id', v_req.order_item_id, 'amount', p_amount));

  return jsonb_build_object('ok', true, 'refund_id', v_refund_id, 'status', p_result);
end;
$$;
revoke all on function public.admin_record_refund_result(uuid, text, numeric, text, text) from public, anon;
grant execute on function public.admin_record_refund_result(uuid, text, numeric, text, text) to authenticated;

-- Verified in rolled-back transactions against the live project in the
-- original Phase 4 pass (see that report for the full transcript):
-- create_order() recomputes real prices/stock and always starts
-- pending/pending; a buyer cannot insert into orders/order_items
-- directly any more; a seller cannot move another seller's item, skip a
-- fulfillment step, or touch any other order_items column; a seller
-- cannot update `orders` directly at all; a non-permitted staff member
-- is denied by admin_confirm_payment/admin_decide_refund/
-- admin_record_refund_result; double-confirming the same payment intent
-- is rejected; commission is only realized on confirmed payment.
--
-- Added in the post-audit correction pass (NOT yet live-tested — see
-- that report's own test section for what's verified by inspection only
-- vs. what's still pending a rolled-back-transaction pass):
--   - refundable_amount() replacing the inline cap math in all three
--     refund-amount functions, with an explicit total_amount<=0 guard;
--   - order_item_id on refund_requests/refunds, so a refund can be
--     precisely scoped to one seller's item instead of always
--     splitting proportionally across every seller on the order;
--   - admin_record_refund_result() validating p_amount (positive,
--     capped) for 'processing' and 'failed' too, not only 'succeeded';
--   - the order-wide commission-reversal division is skipped entirely
--     (not guarded with a try/catch — avoided outright) when
--     total_amount = 0, instead of ever dividing by it.
