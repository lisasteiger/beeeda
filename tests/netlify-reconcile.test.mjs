import test from 'node:test'
import assert from 'node:assert/strict'
import reconcile, { config } from '../netlify/functions/reconcile.mjs'

test('Netlify schedule calls the protected reconciliation route and reports failures', async t => {
  assert.equal(config.schedule, '*/10 * * * *')
  const oldURL = process.env.URL
  const oldSecret = process.env.NUXT_CRON_SECRET
  t.after(() => {
    for (const [key, value] of [['URL', oldURL], ['NUXT_CRON_SECRET', oldSecret]]) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    t.mock.restoreAll()
  })
  process.env.URL = 'https://example.netlify.app'
  process.env.NUXT_CRON_SECRET = 'test-credential'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), options })
    return Response.json({ synchronized: 2 })
  })
  t.mock.method(console, 'info', () => {})
  await reconcile()
  assert.equal(calls[0].url, 'https://example.netlify.app/api/maintenance/reconcile')
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-credential')
  assert.equal(calls[0].options.redirect, 'error')
  assert.ok(calls[0].options.signal instanceof AbortSignal)
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }))
  await assert.rejects(reconcile(), /HTTP 503/)
  delete process.env.NUXT_CRON_SECRET
  await assert.rejects(reconcile(), /Serverkonfiguration fehlt/)
  assert.equal(calls.length, 1)
})
