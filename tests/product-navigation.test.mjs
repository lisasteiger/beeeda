import test from 'node:test'
import assert from 'node:assert/strict'
import { orderedProducts, nextShopProduct } from '../shared/shop.ts'

test('Studio order is numeric and ties are stable regardless of query order', () => {
  const products = [
    { productId: 'c', displayOrder: '10' },
    { productId: 'b', displayOrder: 2 },
    { productId: 'a', displayOrder: 2 },
    { productId: 'd' }
  ]
  assert.deepEqual(orderedProducts(products).map(product => product.productId), ['d', 'a', 'b', 'c'])
  assert.deepEqual(orderedProducts([...products].reverse()), orderedProducts(products))
  assert.equal(products[0].productId, 'c')
})

test('next product follows the carousel order, skips drafts and sold products, and wraps', () => {
  const products = [
    { productId: 'a', displayOrder: 3, status: 'active' },
    { productId: 'b', displayOrder: 1, status: 'active' },
    { productId: 'draft', displayOrder: 2, status: 'draft' },
    { productId: 'sold', displayOrder: 2, status: 'active', soldOut: true },
    { productId: 'archived', displayOrder: 2, status: 'archived' }
  ]
  assert.equal(nextShopProduct(products, 'b').productId, 'a')
  assert.equal(nextShopProduct(products, 'a').productId, 'b')
  assert.equal(nextShopProduct([products[0]], 'a'), undefined)
  assert.equal(nextShopProduct([], 'a'), undefined)
})
