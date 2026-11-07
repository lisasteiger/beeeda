-- Install after both inventory migrations. No rows are deleted during installation.
begin;
alter table public.orders add column if not exists closed_at timestamptz;
alter table public.orders add column if not exists retention_hold boolean not null default false;

-- Older closed orders have no reliable closure date: start their 30 days now.
update public.orders set closed_at = now()
where status in ('expired', 'cancelled') and closed_at is null;

create or replace function public.shop_record_closure()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status in ('expired', 'cancelled') then
    if tg_op = 'INSERT' then
      new.closed_at := now();
    elsif old.status is distinct from new.status then
      new.closed_at := now();
    else
      new.closed_at := old.closed_at;
    end if;
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists shop_record_closure on public.orders;
create trigger shop_record_closure before insert or update on public.orders
for each row execute function public.shop_record_closure();
revoke all on function public.shop_record_closure() from public, anon, authenticated;

create or replace function public.shop_purge_orders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  old_order orders;
  line record;
  removed integer := 0;
begin
  -- Prevent overlapping manual/cron runs. Unresolved payments are never selected.
  if not pg_try_advisory_xact_lock(hashtextextended('beeeda-order-retention', 0)) then return 0; end if;
  for old_order in
    select * from orders
    where not retention_hold and (
      (status in ('expired', 'cancelled') and closed_at <= now() - interval '30 days')
      or (status = 'paid' and paid_at is not null
        and (date_trunc('year', greatest(created_at, paid_at) at time zone 'Europe/Zurich')
          + interval '11 years') at time zone 'Europe/Zurich' <= now())
    )
    order by created_at, id limit 500 for update skip locked
  loop
    if old_order.status = 'paid' then
      -- Retain only anonymous sold quantities, so later Studio edits cannot
      -- replenish products whose old purchase records have been deleted.
      for line in select product_id, quantity from order_items
        where order_id = old_order.id order by product_id
      loop
        update inventory set studio_sold_offset = studio_sold_offset + line.quantity
        where product_id = line.product_id;
      end loop;
    end if;
    delete from order_items where order_id = old_order.id;
    delete from orders where id = old_order.id;
    removed := removed + 1;
  end loop;
  return removed;
end;
$$;
revoke all on function public.shop_purge_orders() from public, anon, authenticated;
grant execute on function public.shop_purge_orders() to service_role;
commit;
