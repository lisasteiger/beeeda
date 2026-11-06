import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { isProductId, validateCart, money, shippingCents } from '../shared/shop.ts'

const directory = new URL('../content/products/', import.meta.url)
const products = readdirSync(directory).filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(readFileSync(new URL(file, directory), 'utf8')))

test('all existing product IDs pass checkout validation without being renamed', () => {
  for (const product of products) {
    assert.ok(isProductId(product.productId), product.productId)
    const line = { productId: product.productId, quantity: 1 }
    assert.deepEqual(validateCart([line]), [line])
    assert.equal(decodeURIComponent(encodeURIComponent(product.productId)), product.productId)
  }
  for (const productId of [null, 1, '', ' ', '.', '..', 'a'.repeat(81), '/product', 'a/b', 'a\\b', 'a?b', 'a#b', 'a%b', '<script>', 'a\nb', 'a\u0000b']) {
    assert.equal(isProductId(productId), false, String(productId))
    assert.throws(() => validateCart([{ productId, quantity: 1 }]))
  }
  assert.throws(() => validateCart([{ productId: 'grüner Blob', quantity: 1 }, { productId: 'grüner Blob', quantity: 1 }]))
  for (const quantity of [0, -1, 1.5, 100, '1']) {
    assert.throws(() => validateCart([{ productId: 'grüner Blob', quantity }]))
  }
})

test('stored products with spaces and umlauts survive cart restoration', () => {
  const source = stripTypeScriptTypes(readFileSync(new URL('../app/composables/useCart.ts', import.meta.url), 'utf8'))
    .replace(/^import .*\n/m, '').replace('export function', 'function').replace('import.meta.client', 'false')
  const states = new Map(), mounted = []
  const saved = products.filter(product => product.status === 'active').map(product => ({ productId: product.productId, quantity: 1 }))
  const context = vm.createContext({
    isProductId, money, shippingCents,
    useState: (key, initial) => { if (!states.has(key)) states.set(key, { value: initial() }); return states.get(key) },
    useAsyncData: () => ({ data: { value: { products, checkoutReady: false } }, refresh() {} }),
    computed: fn => ({ get value() { return fn() } }),
    onMounted: fn => mounted.push(fn),
    localStorage: { getItem: () => JSON.stringify([...saved, { productId: '../invalid', quantity: 1 }]) }
  })
  vm.runInContext(source + '\nglobalThis.cart = useCart()', context)
  mounted.forEach(fn => fn())
  assert.deepEqual(JSON.parse(JSON.stringify(context.cart.lines.value)), saved)
  assert.equal(context.cart.items.value.length, saved.length)
  assert.equal(context.cart.valid.value, false, 'Accepting IDs must not enable checkout without verified stock')
})
