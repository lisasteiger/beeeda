import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'

const source = stripTypeScriptTypes(readFileSync(new URL('../server/utils/shop.ts', import.meta.url), 'utf8'))
  .split('export function checkOrigin')[1].split('export function authorizedCron')[0]

function check(origin, siteUrl, development = false) {
  const context = vm.createContext({
    URL, getHeader: () => origin, useRuntimeConfig: () => ({ public: { siteUrl } }),
    createError: value => Object.assign(new Error(value.message), value)
  })
  vm.runInContext('function checkOrigin' + source.replaceAll('import.meta.dev', String(development)) + '\ncheckOrigin({})', context)
}

test('Checkout permits both owned domains across the production canonical redirect', () => {
  for (const configured of ['https://beeeda.ch', 'https://www.beeeda.ch']) {
    for (const origin of ['https://beeeda.ch', 'https://www.beeeda.ch']) assert.doesNotThrow(() => check(origin, configured))
  }
})

test('Origin protection still rejects foreign, missing, insecure and deceptive origins', () => {
  for (const origin of [undefined, 'null', 'http://beeeda.ch', 'https://beeeda.ch.evil.example', 'https://evil.example', 'https://www.beeeda.ch:8443', 'https://other.vercel.app', 'http://localhost:8001']) {
    assert.throws(() => check(origin, 'https://beeeda.ch'), error => error.statusCode === 403)
  }
  assert.doesNotThrow(() => check('https://preview.vercel.app', 'https://preview.vercel.app'))
  assert.throws(() => check('https://www.beeeda.ch', 'https://preview.vercel.app'), error => error.statusCode === 403)
  assert.doesNotThrow(() => check('http://localhost:8001', 'https://beeeda.ch', true))
  assert.throws(() => check('https://evil.example', 'https://beeeda.ch', true), error => error.statusCode === 403)
})
