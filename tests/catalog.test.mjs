import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { productSuggestions } from '../shared/shop.ts'

const source = stripTypeScriptTypes(readFileSync(new URL('../server/api/catalog.get.ts', import.meta.url), 'utf8'))
  .replace(/^import .*\n/, '').replace('export default ', 'globalThis.handler = ')
const products = ['one', 'two', 'three'].map(productId => ({ productId, status: 'active', cover: '/assets/' + productId + '.webp' }))

test('inventory failures preserve product recommendations and disable checkout', async () => {
  for (const failure of ['sync', 'availability', 'network']) {
    const context = vm.createContext({
      defineEventHandler: handler => handler,
      productList: async () => [...products, { productId: 'draft', status: 'draft' }],
      useRuntimeConfig: () => ({ supabaseSecretKey: 'test', stripeSecretKey: 'test', stripeWebhookSecret: 'test' }),
      synchronizeContentInventory: async () => { if (failure === 'sync') throw new Error('Sync failed') },
      database: () => ({ rpc: async () => {
        if (failure === 'network') throw new Error('Network failed')
        return { error: { message: 'Availability failed' } }
      } }),
      console: { error() {} }
    })
    vm.runInContext(source, context)
    const catalog = await context.handler({})
    assert.equal(catalog.checkoutReady, false)
    assert.equal(catalog.products.length, 3)
    assert.ok(catalog.products.every(product => product.available === null))
    assert.deepEqual(productSuggestions(catalog.products, 'one').map(product => product.productId), ['three', 'two'])
  }
})
