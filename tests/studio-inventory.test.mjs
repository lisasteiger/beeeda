import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

test('Studio stock defaults to one, preserves sales and legacy stock, and respects reservations', async () => {
  const db = new PGlite()
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
    for (const file of ['202610070001_shop.sql', '202610240001_studio_inventory.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'))
    }
    const sync = (productId, quantity) => db.query('select shop_sync_content_inventory($1::jsonb)', [JSON.stringify([{ productId, quantity }])])
    const stock = async product => (await db.query('select on_hand from inventory where product_id=$1', [product])).rows[0].on_hand
    await sync('single', null)
    assert.equal(await stock('single'), 1)
    await db.exec("insert into inventory(product_id,on_hand) values ('legacy-sold',0), ('legacy-multiple',4)")
    await sync('legacy-sold', null)
    await sync('legacy-multiple', null)
    assert.equal(await stock('legacy-sold'), 0)
    assert.equal(await stock('legacy-multiple'), 4)
    await sync('legacy-sold', 1)
    assert.equal(await stock('legacy-sold'), 0)

    await sync('multiple', 3)
    const order = randomUUID()
    const items = JSON.stringify([{ productId: 'multiple', quantity: 2, name: 'Multiple', priceCents: 1000 }])
    await db.query('select shop_reserve($1,$2,$3,$4::jsonb,900,$5::jsonb)', [order, 'buyer', randomUUID(), items, '{}'])
    await sync('multiple', 1) // A content edit must not invalidate an existing reservation.
    assert.equal(await stock('multiple'), 3)
    await db.query('select shop_finish($1,$2,true,2900,$3,$4::jsonb)', [order, 'cs_paid', 'chf', '{}'])
    assert.equal(await stock('multiple'), 1)
    await sync('multiple', 3) // An unchanged Studio file must not restock the two sold pieces.
    assert.equal(await stock('multiple'), 1)
    await sync('multiple', null) // Clearing means a total of one, already sold out here.
    assert.equal(await stock('multiple'), 0)
    await sync('multiple', 4) // Two sold + two available, including after an earlier decrease.
    assert.equal(await stock('multiple'), 2)
    await db.exec(await readFile(new URL('../supabase/migrations/202610240001_studio_inventory.sql', import.meta.url), 'utf8'))
    await sync('multiple', 4)
    assert.equal(await stock('multiple'), 2)
    await db.exec('set role anon')
    await assert.rejects(sync('single', 99), /permission denied/)
  } finally { await db.close() }
})
