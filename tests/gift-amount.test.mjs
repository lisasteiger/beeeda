import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCart, cartUnitPrice, shippingCents } from '../shared/shop.ts'

test('voucher-only orders cost CHF 2 shipping, mixed orders retain CHF 7.50', () => {
  assert.equal(shippingCents([{ quantity: 1, customAmount: true }]), 200)
  assert.equal(shippingCents([{ quantity: 3, customAmount: true }]), 200)
  assert.equal(shippingCents([{ quantity: 1, customAmount: true }, { quantity: 1 }]), 750)
  assert.equal(shippingCents([{ quantity: 1 }]), 750)
  assert.equal(shippingCents([]), 0)
})

test('voucher values survive cart validation and determine the charged unit price', () => {
  const [line] = validateCart([{ productId: 'Gutschein', quantity: 2, amountCents: 7525 }])
  assert.equal(line.amountCents, 7525)
  assert.equal(cartUnitPrice({ priceCents: 5000, customAmount: true }, line) * line.quantity, 15050)
  for (const amountCents of [100, 100000]) {
    assert.equal(cartUnitPrice({ priceCents: 5000, customAmount: true }, { amountCents }), amountCents)
  }
})

test('custom prices cannot override ordinary products and invalid voucher values are rejected', () => {
  assert.equal(cartUnitPrice({ priceCents: 4990 }, {}), 4990)
  assert.throws(() => cartUnitPrice({ priceCents: 4990 }, { amountCents: 100 }))
  assert.throws(() => cartUnitPrice({ priceCents: 5000, customAmount: true }, {}))
  for (const amountCents of [0, -100, 99, 100001, 100.5, '5000', null, NaN, Infinity]) {
    assert.throws(() => validateCart([{ productId: 'Gutschein', quantity: 1, amountCents }]))
    assert.throws(() => cartUnitPrice({ priceCents: 5000, customAmount: true }, { amountCents }))
  }
})
