import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { timingSafeEqual } from 'node:crypto'
import vm from 'node:vm'
const source = stripTypeScriptTypes(readFileSync(new URL('../server/utils/shop.ts', import.meta.url), 'utf8')).split('export function authorizedCron')[1].split('export async function productList')[0]
function authorize(header, vercelSecret, nuxtSecret = '') {
  const context = vm.createContext({ process: { env: { CRON_SECRET: vercelSecret } }, Buffer, timingSafeEqual,
    useRuntimeConfig: () => ({ cronSecret: nuxtSecret }), getHeader: () => header,
    createError: value => Object.assign(new Error(value.message), value) })
  vm.runInContext('function authorizedCron' + source + '\nauthorizedCron({})', context)
}
test('Vercel reconciliation runs every five minutes and requires its secret', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
  assert.deepEqual(config.crons, [{ path: '/api/maintenance/reconcile', schedule: '*/5 * * * *' }])
  assert.doesNotThrow(() => authorize('Bearer vercel-secret', 'vercel-secret', 'old-secret'))
  assert.doesNotThrow(() => authorize('Bearer old-secret', undefined, 'old-secret'))
  for (const header of ['', undefined, 'Bearer wrong', 'Bearer old-secret']) assert.throws(() => authorize(header, 'vercel-secret', 'old-secret'))
  assert.throws(() => authorize('Bearer ', undefined))
})
