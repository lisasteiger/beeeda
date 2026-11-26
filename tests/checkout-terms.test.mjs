import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import { hasTermsAcceptance, termsVersion } from '../shared/legal.ts'

function handler(file, body, overrides = {}) {
  const context = vm.createContext({
    URL,
    defineEventHandler: fn => fn, checkOrigin() {},
    readBody: async () => body, hasTermsAcceptance, termsVersion,
    createError: value => Object.assign(new Error(value.message), value),
    ...overrides
  })
  const source = stripTypeScriptTypes(readFileSync(new URL('../server/api/' + file, import.meta.url), 'utf8'))
    .replace(/^import .*\n/gm, '').replaceAll('import.meta.dev', 'false').replace('export default ', 'globalThis.handler = ')
  vm.runInContext(source, context)
  return context.handler
}

test('Both checkout entry points reject missing, forged and outdated acceptance before payment access', async () => {
  for (const body of [null, {}, {termsAccepted:'true',termsVersion}, {termsAccepted:false,termsVersion}, {termsAccepted:true,termsVersion:'old'}]) {
    for (const file of ['checkout.post.ts','checkout/resume.post.ts']) {
      await assert.rejects(handler(file, body)({}), error => error.statusCode === 400 && /AGB/.test(error.message))
    }
  }
})

test('New orders persist the accepted version and server timestamp with their Stripe payload', async () => {
  let stored
  const run = handler('checkout.post.ts', {termsAccepted:true,termsVersion,requestKey:'00000000-0000-4000-8000-000000000000',items:[]}, {
    stripe() {}, owner: () => 'owner', randomUUID: () => 'order',
    database: () => ({rpc: async (name, payload) => {
      stored = payload.p_payload
      return {data:{id:'order',status:'reserved'},error:null}
    }}),
    priceCart: async () => ({items:[],shipping:200}),
    useRuntimeConfig: () => ({public:{siteUrl:'https://beeeda.ch'}}),
    databaseError() {}, setCookie() {},
    startSession: async () => ({status:'open',url:'https://checkout.stripe.com/test'})
  })
  assert.equal((await run({})).url, 'https://checkout.stripe.com/test')
  assert.equal(stored.metadata.terms_version, termsVersion)
  assert.ok(Number.isFinite(Date.parse(stored.metadata.terms_accepted_at)))
})

test('Resume preserves accepted reservations and rejects legacy or changed terms', async () => {
  for (const metadata of [{}, {terms_version:'old',terms_accepted_at:'2026-11-01'}, {terms_version:termsVersion}]) {
    await assert.rejects(handler('checkout/resume.post.ts',{termsAccepted:true,termsVersion},{
      currentOrder: async () => ({status:'reserved',stripe_payload:{metadata}})
    })({}), error => error.statusCode === 409 && /Reservierung/.test(error.message))
  }
  const result = await handler('checkout/resume.post.ts',{termsAccepted:true,termsVersion},{
    currentOrder: async () => ({status:'reserved',stripe_payload:{metadata:{terms_version:termsVersion,terms_accepted_at:'2026-11-05'}}}),
    startSession: async () => ({status:'open',url:'https://checkout.stripe.com/test'}),
    synchronizeSession: async () => {}
  })({})
  assert.equal(result.url,'https://checkout.stripe.com/test')
})
