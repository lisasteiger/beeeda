import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validImageOrder } from '../server/utils/image-order.ts'

test('gallery can promote a detail image without losing, adding or duplicating images', () => {
  const original = ['/hero.webp', '/detail.webp', '/back.webp']
  assert.equal(validImageOrder(original, ['/detail.webp', '/hero.webp', '/back.webp']), true)
  for (const invalid of [null, ['/hero.webp'], ['/hero.webp', '/detail.webp', '/detail.webp'], ['/hero.webp', '/detail.webp', '/unknown.webp'], [null, '/detail.webp', '/back.webp']]) {
    assert.equal(validImageOrder(original, invalid), false)
  }
  assert.deepEqual(original, ['/hero.webp', '/detail.webp', '/back.webp'])
})
