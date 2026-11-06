-- Run once in Supabase SQL Editor. No browser may access these tables or functions.
create table if not exists public.inventory (
  product_id text primary key,
  on_hand integer not null default 0 check (on_hand >= 0),
  enabled boolean not null default true
);
create table if not exists public.orders (
  id uuid primary key,
  owner_hash text not null,
  request_key uuid not null,
  status text not null default 'preparing' check (status in ('preparing','reserved','paid','expired','cancelled')),
  items jsonb not null,
  shipping_cents integer not null check (shipping_cents in (200,900)),
  total_cents integer not null check (total_cents > 0),
  stripe_session_id text unique,
  stripe_payload jsonb not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  customer jsonb,
  unique (owner_hash, request_key)
);
create table if not exists public.order_items (
  order_id uuid not null references public.orders(id),
  product_id text not null references public.inventory(product_id),
  quantity integer not null check (quantity between 1 and 99),
  primary key(order_id, product_id)
);
create index if not exists order_items_product on public.order_items(product_id);
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.inventory, public.orders, public.order_items from anon, authenticated;
grant all on public.inventory, public.orders, public.order_items to service_role;

create or replace function public.shop_availability()
returns table(product_id text, available integer, sold_out boolean)
language sql security definer set search_path = public as $$
  select i.product_id,
    case when i.enabled then greatest(0, i.on_hand - coalesce((
      select sum(oi.quantity)::integer from order_items oi join orders o on o.id = oi.order_id
      where oi.product_id = i.product_id and o.status in ('preparing','reserved')
    ),0)) else 0 end,
    i.on_hand = 0
  from inventory i;
$$;

create or replace function public.shop_reserve(
  p_id uuid, p_owner text, p_request uuid, p_items jsonb,
  p_shipping integer, p_payload jsonb
) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  result orders;
  line jsonb;
  item_id text;
  amount integer;
  current_stock inventory;
  held integer;
  total integer := p_shipping;
begin
  -- Serialize retries for one shopper; stock locks below serialize competing shoppers.
  perform pg_advisory_xact_lock(hashtextextended(p_owner, 0));
  select * into result from orders where owner_hash = p_owner and request_key = p_request for update;
  if found then
    if result.items <> p_items then raise exception 'request_key_conflict'; end if;
    return result;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50
    or p_shipping not in (200,900) then raise exception 'invalid_cart'; end if;
  if (select count(*) <> count(distinct x->>'productId') from jsonb_array_elements(p_items) x)
    then raise exception 'invalid_cart'; end if;
  for line in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
    item_id := line->>'productId';
    amount := (line->>'quantity')::integer;
    if amount not between 1 and 99 or (line->>'priceCents')::integer <= 0 then raise exception 'invalid_cart'; end if;
    select * into current_stock from inventory where inventory.product_id = item_id for update;
    if not found or not current_stock.enabled then raise exception 'out_of_stock'; end if;
    select coalesce(sum(oi.quantity),0) into held from order_items oi join orders o on o.id = oi.order_id
      where oi.product_id = item_id and o.status in ('preparing','reserved');
    if current_stock.on_hand - held < amount then raise exception 'out_of_stock'; end if;
    total := total + amount * (line->>'priceCents')::integer;
  end loop;
  insert into orders(id,owner_hash,request_key,items,shipping_cents,total_cents,stripe_payload)
    values(p_id,p_owner,p_request,p_items,p_shipping,total,p_payload) returning * into result;
  insert into order_items(order_id,product_id,quantity)
    select p_id, x->>'productId', (x->>'quantity')::integer from jsonb_array_elements(p_items) x;
  return result;
end;
$$;

create or replace function public.shop_attach_session(p_id uuid, p_session text)
returns void language plpgsql security definer set search_path = public as $$
declare result orders;
begin
  select * into result from orders where id = p_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if result.stripe_session_id is not null and result.stripe_session_id <> p_session
    then raise exception 'session_conflict'; end if;
  if result.status in ('expired','cancelled') then raise exception 'order_closed'; end if;
  update orders set stripe_session_id = p_session,
    status = case when status = 'paid' then 'paid' else 'reserved' end where id = p_id;
end;
$$;

create or replace function public.shop_finish(
  p_id uuid, p_session text, p_paid boolean, p_amount integer, p_currency text, p_customer jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare result orders; line record;
begin
  select * into result from orders where id = p_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if result.stripe_session_id is not null and result.stripe_session_id <> p_session
    then raise exception 'session_conflict'; end if;
  if result.status = 'paid' then return; end if;
  if p_paid then
    if result.status not in ('preparing','reserved') then raise exception 'order_closed'; end if;
    if p_currency <> 'chf' or p_amount <> result.total_cents then raise exception 'payment_mismatch'; end if;
    -- Same lock order as reserve; atomic stock reduction and payment confirmation.
    for line in select * from order_items where order_id = p_id order by product_id loop
      update inventory set on_hand = on_hand - line.quantity
        where product_id = line.product_id and on_hand >= line.quantity;
      if not found then raise exception 'stock_inconsistent'; end if;
    end loop;
    update orders set status = 'paid', stripe_session_id = p_session, paid_at = now(), customer = p_customer where id = p_id;
  elsif result.status in ('preparing','reserved') then
    update orders set status = 'expired', stripe_session_id = p_session where id = p_id;
  end if;
end;
$$;
revoke all on function public.shop_availability() from public, anon, authenticated;
revoke all on function public.shop_reserve(uuid,text,uuid,jsonb,integer,jsonb) from public, anon, authenticated;
revoke all on function public.shop_attach_session(uuid,text) from public, anon, authenticated;
revoke all on function public.shop_finish(uuid,text,boolean,integer,text,jsonb) from public, anon, authenticated;
grant execute on function public.shop_availability() to service_role;
grant execute on function public.shop_reserve(uuid,text,uuid,jsonb,integer,jsonb) to service_role;
grant execute on function public.shop_attach_session(uuid,text) to service_role;
grant execute on function public.shop_finish(uuid,text,boolean,integer,text,jsonb) to service_role;

-- Initial example only. Re-running this must never replenish a sold piece.
insert into public.inventory(product_id, on_hand) values ('pinks-chaos', 1) on conflict do nothing;


-- Administration uses the same inventory row lock as the checkout.
create or replace function public.shop_set_inventory(p_product text, p_on_hand integer, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
declare held integer;
begin
  if p_on_hand not between 0 and 9999 then raise exception 'invalid_stock'; end if;
  insert into inventory(product_id,on_hand,enabled) values(p_product,0,false) on conflict do nothing;
  perform 1 from inventory where product_id = p_product for update;
  select coalesce(sum(oi.quantity),0) into held from order_items oi join orders o on o.id = oi.order_id
    where oi.product_id = p_product and o.status in ('preparing','reserved');
  if p_on_hand < held then raise exception 'below_reserved'; end if;
  update inventory set on_hand = p_on_hand, enabled = p_enabled where product_id = p_product;
end;
$$;
revoke all on function public.shop_set_inventory(text,integer,boolean) from public, anon, authenticated;
grant execute on function public.shop_set_inventory(text,integer,boolean) to service_role;
