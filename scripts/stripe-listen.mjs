import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { parseEnv } from 'node:util'
import assert from 'node:assert/strict'

function setting(source, name, value) {
  const line = `${name}=${value}`
  const pattern = new RegExp(`^${name}=.*$`, 'm')
  return pattern.test(source) ? source.replace(pattern, () => line) : `${source.trimEnd()}\n${line}\n`
}
if (process.argv.includes('--check')) {
  const updated = setting('OTHER=keep\nNUXT_STRIPE_WEBHOOK_SECRET=old\n', 'NUXT_STRIPE_WEBHOOK_SECRET', 'whsec_example')
  assert.equal(parseEnv(updated).NUXT_STRIPE_WEBHOOK_SECRET, 'whsec_example')
  assert.equal(parseEnv(updated).OTHER, 'keep')
  assert.equal(parseEnv(setting('OTHER=keep\n', 'NEW', 'value')).NEW, 'value')
  console.log('Stripe listener configuration check passed.')
  process.exit(0)
}

const env = parseEnv(readFileSync('.env', 'utf8'))
if (!env.NUXT_STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('Bitte einen Stripe-Testschlüssel in .env hinterlegen.')
  process.exit(1)
}
mkdirSync('.local/stripe', { recursive: true })
const listener = spawn('node_modules/.bin/stripe', [
  'listen', '--skip-update', '--color', 'off', '--events-from', '@self',
  '--config', '.local/stripe/config.toml',
  '--events', 'checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired',
  '--forward-to', 'http://localhost:8001/api/stripe/webhook'
], {
  env: { ...process.env, STRIPE_API_KEY: env.NUXT_STRIPE_SECRET_KEY },
  stdio: ['ignore', 'pipe', 'pipe']
})
let buffer = '', ready = false
function output(chunk) {
  // Never forward CLI output: its startup message contains a private signing key.
  buffer = (buffer + chunk.toString()).slice(-8192)
  const secret = buffer.match(/whsec_[A-Za-z0-9]+/)?.[0]
  if (!ready && secret) {
    let source = readFileSync('.env', 'utf8')
    source = setting(source, 'NUXT_STRIPE_WEBHOOK_SECRET', secret)
    source = setting(source, 'NUXT_PUBLIC_SITE_URL', 'http://localhost:8001')
    writeFileSync('.env.stripe-tmp', source, { mode: 0o600 })
    renameSync('.env.stripe-tmp', '.env')
    ready = true
    console.log('Stripe-Testwebhooks verbunden. Schlüssel lokal gespeichert; Rückkehradresse ist localhost:8001.')
  }
  if (/\[200\]/.test(chunk.toString())) console.log('Stripe-Zahlungsereignis vom Shop akzeptiert (HTTP 200).')
}
listener.stdout.on('data', output)
listener.stderr.on('data', output)
listener.on('error', () => { console.error('Stripe CLI konnte nicht gestartet werden.'); process.exitCode = 1 })
listener.on('close', code => { console.log(`Stripe-Weiterleitung beendet (${code ?? 'Signal'}).`); process.exitCode = code ?? 0 })
process.on('SIGINT', () => listener.kill('SIGINT'))
process.on('SIGTERM', () => listener.kill('SIGTERM'))
