// Run after `NITRO_PRESET=netlify pnpm build` with Studio credentials in .env.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { parseEnv } from 'node:util'

const env = parseEnv(readFileSync('.env', 'utf8'))
const keys = ['STUDIO_GITHUB_CLIENT_SECRET', 'NUXT_SUPABASE_SECRET_KEY', 'NUXT_STRIPE_SECRET_KEY', 'NUXT_STRIPE_WEBHOOK_SECRET']
for (const root of ['dist', '.netlify/functions-internal']) {
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.parentPath.includes('/node_modules/')) continue
    const bytes = readFileSync(`${entry.parentPath}/${entry.name}`)
    for (const key of keys) {
      if (env[key]) assert.ok(!bytes.includes(Buffer.from(env[key])), `${key} embedded in ${entry.name}`)
    }
  }
}

Object.assign(process.env, env)
const { default: handler } = await import('../.netlify/functions-internal/server/main.mjs')
const response = await handler(new Request('https://example.netlify.app/__nuxt_studio/auth/github'), {})
assert.equal(response.status, 302)
const target = new URL(response.headers.get('location'))
assert.equal(target.hostname, 'github.com')
assert.equal(target.searchParams.get('client_id'), env.STUDIO_GITHUB_CLIENT_ID)
console.log('No embedded credentials; Studio OAuth reads credentials at runtime: OK')
