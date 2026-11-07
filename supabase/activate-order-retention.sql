-- Run AFTER 202611050001_order_retention.sql, in the LIVE project's SQL Editor.
-- Activation enables daily permanent deletion according to the agreed policy.
begin;
create extension if not exists pg_cron;
select cron.schedule(
  'beeeda-order-retention',
  '15 3 * * *',
  'select public.shop_purge_orders();'
);
commit;

-- Check activation (does not delete anything):
select jobname, schedule, command, active from cron.job
where jobname = 'beeeda-order-retention';
