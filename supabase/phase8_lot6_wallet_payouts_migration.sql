-- ─────────────────────────────────────────────────────────────────
-- CLORIVO — Phase 8, Lot 6: real seller Wallet / Payouts.
--
-- Security fix found while scoping this lot: "Seller manages own
-- withdrawals" (ALL, seller_id = auth.uid()) let a seller set their
-- own withdrawal_requests.status directly to 'approved' via a raw
-- client UPDATE — there was no actual admin-review gate at the
-- database level, only the UI's absence of a button for it. Replaced
-- with a SELECT-only policy; every write now goes through the RPCs
-- below (consistent with the rest of this project's sensitive-write
-- convention).
--
-- Also fixed during testing: the first draft of
-- seller_get_wallet_summary() filtered commission_ledger on
-- status = 'settled', a status value that does not exist on this
-- table (real values are 'confirmed'/'reversed') — it would silently
-- always have returned a zero balance. Caught before use by seeding a
-- real test row and observing the mismatch.
--
-- admin_get_withdrawal_requests() originally joined withdrawal_requests
-- to shops on seller_id directly, which (like the same mistake in
-- Lot 1's admin_get_support_tickets) fans a request out into one row
-- per shop for a seller owning more than one shop — fixed with a
-- correlated subquery, same as Lot 1.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

drop policy if exists "Seller manages own withdrawals" on public.withdrawal_requests;
create policy "Seller views own withdrawals" on public.withdrawal_requests
  for select using (seller_id = auth.uid());

insert into public.permissions (module, key, label)
select * from (values
  ('wallet','wallet.view','View seller payout requests'),
  ('wallet','wallet.manage','Approve or reject seller payout requests')
) as v(module, key, label)
where not exists (select 1 from public.permissions p where p.key = v.key);

create or replace function public.seller_get_wallet_summary()
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_seller uuid := auth.uid();
  v_earned numeric; v_withdrawn numeric; v_pending numeric;
begin
  if v_seller is null then raise exception 'Authentication required'; end if;

  select coalesce(sum(net_amount), 0) into v_earned
    from public.commission_ledger where seller_id = v_seller and status = 'confirmed';
  select coalesce(sum(amount), 0) into v_withdrawn
    from public.withdrawal_requests where seller_id = v_seller and status = 'approved';
  select coalesce(sum(amount), 0) into v_pending
    from public.withdrawal_requests where seller_id = v_seller and status = 'pending';

  return jsonb_build_object(
    'total_earned', v_earned, 'total_withdrawn', v_withdrawn,
    'pending_withdrawal', v_pending, 'available_balance', v_earned - v_withdrawn - v_pending
  );
end;
$function$;
revoke all on function public.seller_get_wallet_summary() from public, anon;
grant execute on function public.seller_get_wallet_summary() to authenticated;

create or replace function public.seller_request_withdrawal(p_amount numeric, p_method text, p_account_details text)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare
  v_seller uuid := auth.uid();
  v_summary jsonb;
  v_request record;
begin
  if v_seller is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_method is null or btrim(p_method) = '' then raise exception 'Payout method is required'; end if;

  if exists (select 1 from public.withdrawal_requests where seller_id = v_seller and status = 'pending') then
    raise exception 'You already have a pending payout request';
  end if;

  v_summary := public.seller_get_wallet_summary();
  if p_amount > (v_summary->>'available_balance')::numeric then
    raise exception 'Requested amount exceeds your available balance';
  end if;

  insert into public.withdrawal_requests (seller_id, amount, method, account_details, status)
  values (v_seller, p_amount, p_method, p_account_details, 'pending')
  returning * into v_request;

  perform public.log_audit('withdrawal_requested', 'withdrawal_requests', v_request.id::text, null,
    jsonb_build_object('amount', p_amount, 'method', p_method));
  return jsonb_build_object('ok', true, 'request', to_jsonb(v_request));
end;
$function$;
revoke all on function public.seller_request_withdrawal(numeric, text, text) from public, anon;
grant execute on function public.seller_request_withdrawal(numeric, text, text) to authenticated;

create or replace function public.admin_get_withdrawal_requests(p_status text default 'ALL')
returns jsonb language plpgsql stable security definer set search_path to 'public','pg_temp'
as $function$
declare v_result jsonb;
begin
  if not public.has_permission(auth.uid(), 'wallet.view') and not public.has_permission(auth.uid(), 'wallet.manage') then
    raise exception 'Permission denied: wallet.view required';
  end if;
  select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb) into v_result
  from (
    select jsonb_build_object(
      'id', w.id, 'amount', w.amount, 'method', w.method, 'account_details', w.account_details,
      'status', w.status, 'admin_note', w.admin_note, 'created_at', w.created_at,
      'seller_name', coalesce(
        p.full_name,
        (select s.name from public.shops s where s.seller_id = w.seller_id order by s.created_at limit 1),
        'Unknown seller'
      )
    ) as row_data, w.created_at
    from public.withdrawal_requests w
    left join public.profiles p on p.id = w.seller_id
    where p_status = 'ALL' or w.status = p_status
  ) q;
  return v_result;
end;
$function$;
revoke all on function public.admin_get_withdrawal_requests(text) from public, anon;
grant execute on function public.admin_get_withdrawal_requests(text) to authenticated;

create or replace function public.admin_decide_withdrawal(p_request_id uuid, p_decision text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare v_req record;
begin
  if not public.has_permission(auth.uid(), 'wallet.manage') then
    raise exception 'Permission denied: wallet.manage required';
  end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;

  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'Withdrawal request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'This request has already been decided'; end if;

  update public.withdrawal_requests set status = p_decision, admin_note = p_note where id = p_request_id;
  perform public.log_audit('withdrawal_decided', 'withdrawal_requests', p_request_id::text,
    jsonb_build_object('status', 'pending'), jsonb_build_object('status', p_decision, 'note', p_note));
  return jsonb_build_object('ok', true);
end;
$function$;
revoke all on function public.admin_decide_withdrawal(uuid, text, text) from public, anon;
grant execute on function public.admin_decide_withdrawal(uuid, text, text) to authenticated;
