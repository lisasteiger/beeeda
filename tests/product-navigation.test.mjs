import test from 'node:test'
import assert from 'node:assert/strict'
import { orderedProducts, nextShopProduct, productSuggestions } from '../shared/shop.ts'

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

const suggestions = Array.from({ length: 9 }, (_, index) => ({
  productId: 'product-' + index, name: 'Product ' + index, displayOrder: index,
  status: 'active', cover: '/assets/' + index + '.webp'
}))

test('five suggestions link to other available products and rotate on each product page', () => {
  const products = [...suggestions,
    { productId: 'draft', status: 'draft', cover: '/draft.webp' },
    { productId: 'archived', status: 'archived', cover: '/archived.webp' },
    { productId: 'sold', status: 'active', soldOut: true, cover: '/sold.webp' },
    { productId: 'no-image', status: 'active' }
  ]
  const first = productSuggestions(products, 'product-0')
  const second = productSuggestions(products, first[0].productId)
  assert.equal(first.length, 5)
  assert.equal(new Set(first.map(product => product.productId)).size, 5)
  assert.deepEqual(first.map(product => product.productId), ['product-1', 'product-2', 'product-3', 'product-4', 'product-5'])
  assert.deepEqual(second.map(product => product.productId), ['product-2', 'product-3', 'product-4', 'product-5', 'product-6'])
  assert.deepEqual(productSuggestions(suggestions, 'product-8').map(product => product.productId), ['product-0', 'product-1', 'product-2', 'product-3', 'product-4'])
  assert.deepEqual(productSuggestions([suggestions[0]], 'product-0'), [])
})

test('optional compact suggestions preserve the chosen order, cap at three, and reject stale or duplicate IDs', () => {
  assert.deepEqual(productSuggestions(suggestions, 'product-0', 3, []), [])
  const chosen = productSuggestions(suggestions, 'product-0', 3, ['product-0', 'missing', 'product-4', 'product-4', 'product-2', 'product-6', 'product-8'])
  assert.deepEqual(chosen.map(product => product.productId), ['product-4', 'product-2', 'product-6'])
  assert.deepEqual(productSuggestions([{ ...suggestions[1], soldOut: true }], 'product-0', 3, ['product-1']), [])
})
