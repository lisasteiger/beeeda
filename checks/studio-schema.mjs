// Run after `pnpm exec nuxt prepare` or `pnpm build`.
import assert from 'node:assert/strict'
import { collections } from '../.nuxt/content/preview.mjs'

const properties = Object.values(collections.products.schema.definitions)[0].properties
for (const field of ['priceCents', 'displayOrder']) {
  // Nuxt Content currently treats JSON Schema `integer` as text, confusing Studio.
  assert.equal(collections.products.fields[field], 'number', `${field} must remain numeric in Studio`)
  assert.equal(properties[field].multipleOf, 1, `${field} must still require whole numbers`)
}
console.log('Studio numeric fields and whole-number validation: OK')
