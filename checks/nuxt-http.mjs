import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
const cwd = new URL('..', import.meta.url).pathname

test('Nuxt SSR, legacy URLs, checkout disabled without secrets, and admin protection', async () => {
  const socket = createServer()
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve))
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port), NUXT_SUPABASE_SECRET_KEY: '', NUXT_STRIPE_SECRET_KEY: '', NUXT_STRIPE_WEBHOOK_SECRET: '' }
  const child = spawn(process.execPath, ['.output/server/index.mjs'], { cwd, env, stdio: ['ignore','pipe','pipe'] })
  let output = ''
  const capture = chunk => { output += chunk }
  child.stdout.on('data', capture); child.stderr.on('data', capture)
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server did not start: ' + output)), 15000)
      const ready = chunk => { if (String(chunk).includes('Listening on')) { clearTimeout(timer); resolve() } }
      child.stdout.on('data', ready)
      child.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited ' + code + ': ' + output)) })
    })
    const base = 'http://127.0.0.1:' + port
    for (const path of ['/', '/produkte/pinks-chaos', '/produkt02', '/warenkorb', '/kasse', '/impressum', '/ueber-uns', '/ruecksendungen', '/verwaltung']) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200, path)
      const html = await response.text()
      assert.match(html, /Beeeda/)
      assert.doesNotMatch(html, /Bedastrasse/)
    }
    const product = await (await fetch(base + '/produkte/pinks-chaos')).text()
    assert.equal((await fetch(base + '/archiv')).status, 404)
    assert.equal((await fetch(base + '/archiv.html')).status, 404)
    assert.match(product, /Pinks Chaos/)
    assert.match(product, /Wolle, Seide, Kaschmir/)
    assert.match(product, /CHF 49\.60/)
    assert.equal((await fetch(base + '/pinkchaos.html', { redirect: 'manual' })).headers.get('location'), '/produkte/pinks-chaos')
    assert.equal((await fetch(base + '/produkte/produkt02')).status, 404)
    const catalog = await (await fetch(base + '/api/catalog')).json()
    assert.equal(catalog.checkoutReady, false)
    assert.equal(catalog.products[0].available, null)
    assert.equal(catalog.products[0].productId, 'pinks-chaos')
    assert.equal(catalog.products[0].priceCents, 4960)
    assert.equal((await fetch(base + '/api/admin/shop')).status, 401)
    assert.equal((await fetch(base + '/api/maintenance/reconcile')).status, 401)
    assert.equal((await fetch(base + '/api/checkout', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' })).status, 403)
    assert.equal((await fetch(base + '/api/checkout', { method: 'POST', headers: { origin: 'https://beeeda.ch', 'content-type': 'application/json' }, body: '{}' })).status, 503)
    assert.equal((await fetch(base + '/api/stripe/webhook', { method: 'POST', body: '{}' })).status, 400)
    // Local SQLite files and legacy simulated payment endpoints are never served.
    assert.equal((await fetch(base + '/.local/shop.sqlite')).status, 404)
    assert.equal((await fetch(base + '/api/orders/confirm-test', { method: 'POST', body: '{}' })).status, 404)
  } finally { child.kill('SIGTERM') }
})
