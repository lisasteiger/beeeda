import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

test('Retention deletes only settled, due orders and preserves sold stock and legal holds', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
    for (const file of ['202610070001_shop.sql', '202610240001_studio_inventory.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
    }
    const add = async (status, age, paidAge = null) => {
      const id = randomUUID()
      await db.query(`insert into orders(id,owner_hash,request_key,status,items,shipping_cents,total_cents,stripe_payload,created_at,paid_at,customer)
        values($1,'owner',$2,$3,'[]',200,1200,'{}',now()-$4::interval,
          case when $5::text is null then null else now()-$5::interval end,'{"email":"private@example.com"}')`,
      [id, randomUUID(), status, age, paidAge])
      await db.query("insert into order_items values($1,'pinks-chaos',1)", [id])
      return id
    }
    const legacy = await add('expired', '5 years')
    const migration = await readFile(new URL('../supabase/migrations/202611050001_order_retention.sql', import.meta.url), 'utf8')
    await db.exec(migration)
    assert.equal((await db.query('select closed_at > now() - interval \'1 minute\' as recent from orders where id=$1', [legacy])).rows[0].recent, true)
    const expired = await add('expired', '40 days')
    const cancelled = await add('cancelled', '40 days')
    const recent = await add('expired', '40 days')
    const held = await add('expired', '40 days')
    const pending = await add('preparing', '12 years')
    const reserved = await add('reserved', '12 years')
    const paid = await add('paid', '12 years', '12 years')
    const paidHeld = await add('paid', '12 years', '12 years')
    const paidRecent = await add('paid', '12 years', '1 day')
    const thisYear = await add('paid', '10 years', '10 years')
    const noPaidDate = await add('paid', '12 years')
    await db.query('update orders set retention_hold=true where id=any($1::uuid[])', [[held, paidHeld]])
    await db.exec('alter table orders disable trigger shop_record_closure')
    await db.query("update orders set closed_at=now()-interval '31 days' where id=any($1::uuid[])", [[expired, cancelled, held]])
    await db.exec('alter table orders enable trigger shop_record_closure')
    // Repeated status updates must not restart the retention window.
    await db.query("update orders set status='expired' where id=$1", [expired])
    // Make stock consistent with four paid purchases. No active holds in this
    // stock example: unresolved records remain on a different disabled product.
    await db.exec("insert into inventory values('unresolved',10,false,null,0)")
    await db.query("update order_items set product_id='unresolved' where order_id=any($1::uuid[])", [[pending,reserved,noPaidDate]])
    await db.exec("update inventory set studio_quantity=4, on_hand=0 where product_id='pinks-chaos'")
    await db.exec(migration) // Installation is repeatable and never purges.
    assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n, 12)
    assert.equal((await db.query('select shop_purge_orders() as n')).rows[0].n, 3)
    const remaining = (await db.query('select id from orders')).rows.map(row => row.id)
    for (const id of [expired,cancelled,paid]) assert.ok(!remaining.includes(id))
    for (const id of [legacy,recent,held,pending,reserved,paidHeld,paidRecent,thisYear,noPaidDate]) assert.ok(remaining.includes(id))
    assert.equal((await db.query('select count(*)::int as n from order_items where order_id=any($1::uuid[])', [[expired,cancelled,paid]])).rows[0].n, 0)
    assert.equal((await db.query("select studio_sold_offset from inventory where product_id='pinks-chaos'")).rows[0].studio_sold_offset, 1)
    await db.query('select shop_sync_content_inventory($1::jsonb)', [JSON.stringify([{productId:'pinks-chaos',quantity:5}])])
    assert.equal((await db.query("select on_hand from inventory where product_id='pinks-chaos'")).rows[0].on_hand, 1)
    assert.equal((await db.query('select shop_purge_orders() as n')).rows[0].n, 0)
    for (const role of ['anon','authenticated']) {
      await db.exec('set role ' + role)
      await assert.rejects(db.query('select shop_purge_orders()'), /permission denied/)
      await db.exec('reset role')
    }
  } finally { await db.close() }
})
