import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = readFileSync(new URL('../app/pages/produkte/[id].vue', import.meta.url), 'utf8')
  .match(/function buy\(\) \{[\s\S]*?\n\}/)[0]

test('purchase artwork alternates across clicks and page reloads, including unavailable storage', () => {
  const saved = new Map()
  function page(storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) }) {
    const context = vm.createContext({ confirmationImage: { value: 'cool' }, confirmed: { value: false },
      sessionStorage: storage, add() {}, productId: 'hat', timer: undefined, clearTimeout() {}, setTimeout() {} })
    vm.runInContext(source, context)
    return () => { context.buy(); return context.confirmationImage.value }
  }
  const buy = page()
  assert.equal(buy(), 'yuhu')
  assert.equal(buy(), 'cool')
  assert.equal(buy(), 'yuhu')
  assert.equal(page()(), 'cool')
  const offline = page({ getItem() { throw Error() }, setItem() { throw Error() } })
  assert.equal(offline(), 'yuhu')
  assert.equal(offline(), 'cool')
})
