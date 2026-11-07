-- Einheitlicher Versand CHF 7.50. Alte Beträge bleiben für bestehende Bestellungen
-- und den Übergang zum neuen Deployment gültig. Keine Bestellungen werden geändert.
begin;
alter table public.orders drop constraint if exists orders_shipping_cents_check;
alter table public.orders add constraint orders_shipping_cents_check
  check (shipping_cents in (200,750,900));

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
    or p_shipping not in (200,750,900) then raise exception 'invalid_cart'; end if;
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

commit;
