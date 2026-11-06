-- Studio stores the total offered quantity; Supabase keeps the remaining stock.
alter table public.inventory add column if not exists studio_quantity integer check (studio_quantity between 0 and 9999);
alter table public.inventory add column if not exists studio_sold_offset integer not null default 0 check (studio_sold_offset >= 0);
alter table public.inventory enable row level security;

create or replace function public.shop_sync_content_inventory(p_products jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  current_stock inventory;
  configured integer;
  paid integer;
  held integer;
  sold_offset integer;
  remaining integer;
begin
  if jsonb_typeof(p_products) <> 'array' then raise exception 'invalid_stock'; end if;
  for item in select value from jsonb_array_elements(p_products) order by value->>'productId' loop
    if coalesce(item->>'productId', '') = '' then raise exception 'invalid_stock'; end if;
    configured := coalesce((item->>'quantity')::integer, 1);
    if configured not between 0 and 9999 then raise exception 'invalid_stock'; end if;
    -- New products with an empty Studio field start as unique pieces.
    insert into inventory(product_id, on_hand, enabled, studio_quantity)
      values(item->>'productId', configured, true, configured) on conflict do nothing;
    select * into current_stock from inventory where product_id = item->>'productId' for update;
    -- Do not silently change legacy stock just by deploying this feature.
    if current_stock.studio_quantity is null and item->>'quantity' is null then continue; end if;
    -- Ordinary edits, reloads and deploys never replenish sold items.
    if current_stock.studio_quantity = configured then continue; end if;
    select coalesce(sum(oi.quantity), 0) into paid
      from order_items oi join orders o on o.id = oi.order_id
      where oi.product_id = current_stock.product_id and o.status = 'paid';
    sold_offset := current_stock.studio_sold_offset;
    -- A legacy unique piece may have been marked sold manually, without an order.
    if current_stock.studio_quantity is null and current_stock.on_hand = 0 and paid = 0 then sold_offset := 1; end if;
    remaining := greatest(0, configured - paid - sold_offset);
    select coalesce(sum(oi.quantity), 0) into held
      from order_items oi join orders o on o.id = oi.order_id
      where oi.product_id = current_stock.product_id and o.status in ('preparing', 'reserved');
    -- Apply a reduction after existing checkout reservations have settled.
    if remaining < held then continue; end if;
    update inventory set on_hand = remaining, studio_quantity = configured, studio_sold_offset = sold_offset
      where product_id = current_stock.product_id;
  end loop;
end;
$$;
revoke all on function public.shop_sync_content_inventory(jsonb) from public, anon, authenticated;
grant execute on function public.shop_sync_content_inventory(jsonb) to service_role;
