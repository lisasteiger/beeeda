import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import Stripe from 'stripe'
import { shippingCents, validateCart } from '../shared/shop.ts'

test('Shipping uses quantities, and cart boundary rejects duplicates and forged quantities', () => {
  assert.equal(shippingCents([]), 0)
  assert.equal(shippingCents([{ quantity: 1, shippingClass: 'small' }]), 200)
  assert.equal(shippingCents([{ quantity: 1, shippingClass: 'large' }]), 900)
  assert.equal(shippingCents([{ quantity: 2, shippingClass: 'small' }]), 900)
  assert.equal(shippingCents([{ quantity: 1, shippingClass: 'small' }, { quantity: 1, shippingClass: 'small' }]), 900)
  for (const input of [[], [{ productId: 'a', quantity: 0 }], [{ productId: 'a', quantity: 1.5 }], [{ productId: 'a', quantity: 100 }], [{ productId: 'a', quantity: 1 }, { productId: 'a', quantity: 1 }]]) assert.throws(() => validateCart(input))
})

test('Supabase SQL reserves and pays atomically; retries never sell a unique piece twice', async () => {
  const db = new PGlite()
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;')
  await db.exec(await readFile(new URL('../supabase/migrations/202610070001_shop.sql', import.meta.url), 'utf8'))
  const cart = JSON.stringify([{ productId: 'pinks-chaos', quantity: 1, name: 'Pinks Chaos', priceCents: 4960, shippingClass: 'small' }])
  const id = randomUUID(), request = randomUUID(), session = 'cs_test_one'
  const reserve = (order, owner, key = randomUUID(), items = cart, shipping = 200) =>
    db.query('select * from shop_reserve($1,$2,$3,$4::jsonb,$5,$6::jsonb)', [order, owner, key, items, shipping, '{}'])
  const availability = async () => (await db.query('select * from shop_availability()')).rows[0]
  const result = await reserve(id, 'buyer-1', request)
  assert.equal(result.rows[0].total_cents, 5160)
  assert.equal((await availability()).available, 0)
  assert.equal((await reserve(randomUUID(), 'buyer-1', request)).rows[0].id, id)
  await assert.rejects(reserve(randomUUID(), 'buyer-2'), /out_of_stock/)
  await assert.rejects(db.query('select shop_set_inventory($1,$2,$3)', ['pinks-chaos', 0, true]), /below_reserved/)
  await db.query('select shop_attach_session($1,$2)', [id, session])
  const finish = (amount, paid = true, sessionId = session) => db.query('select shop_finish($1,$2,$3,$4,$5,$6::jsonb)', [id, sessionId, paid, amount, 'chf', '{}'])
  await assert.rejects(finish(1), /payment_mismatch/)
  await assert.rejects(finish(5160, true, 'wrong'), /session_conflict/)
  await finish(5160)
  await finish(5160)
  await finish(5160, false) // A delayed expiry cannot undo a paid order.
  assert.equal((await availability()).sold_out, true)
  assert.equal((await db.query('select on_hand from inventory')).rows[0].on_hand, 0)
  await db.exec(await readFile(new URL('../supabase/migrations/202610070001_shop.sql', import.meta.url), 'utf8'))
  assert.equal((await db.query('select on_hand from inventory')).rows[0].on_hand, 0)
  await db.query('select shop_set_inventory($1,$2,$3)', ['pinks-chaos', 3, true])
  const multiple = JSON.stringify([{ productId: 'pinks-chaos', quantity: 2, name: 'Pinks Chaos', priceCents: 4960 }])
  const id2 = randomUUID()
  await reserve(id2, 'buyer-3', randomUUID(), multiple, 900)
  assert.equal((await availability()).available, 1)
  await assert.rejects(reserve(randomUUID(), 'buyer-4', randomUUID(), multiple, 900), /out_of_stock/)
  await db.query('select shop_finish($1,$2,$3,$4,$5,$6::jsonb)', [id2, 'cs_expired', false, 10820, 'chf', '{}'])
  assert.equal((await availability()).available, 3)
  // Supabase client roles have neither direct table access nor RPC execution.
  await db.exec('set role anon')
  await assert.rejects(db.query('select * from orders'), /permission denied/)
  await assert.rejects(db.query('select * from shop_availability()'), /permission denied/)
  await db.exec('reset role; set role authenticated')
  await assert.rejects(db.query('select * from inventory'), /permission denied/)
  await db.exec('reset role')
  await db.close()
})

test('Stripe rejects changed payloads and missing webhook signatures', () => {
  const stripe = new Stripe('sk_test_placeholder')
  const secret = 'whsec_test'
  const payload = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { payment_status: 'paid' } } })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  assert.equal(stripe.webhooks.constructEvent(payload, header, secret).id, 'evt_test')
  assert.throws(() => stripe.webhooks.constructEvent(payload + ' ', header, secret))
  assert.throws(() => stripe.webhooks.constructEvent(payload, '', secret))
})

