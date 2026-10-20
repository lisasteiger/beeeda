import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'

// Studio 1.7 only strips simple MIME names, leaving e.g. image/svg+xml in GitHub's base64 payload.
const broken = String.raw`replace(/^data:\w+\/\w+;base64,/,"")`
const prefix = /^data:[^;,]+;base64,/
const fixed = `replace(${prefix},"")`
for (const mime of ['image/webp', 'image/svg+xml', 'image/vnd.adobe.photoshop', 'application/octet-stream']) {
  assert.equal(`data:${mime};base64,aGVsbG8=`.replace(prefix, ''), 'aGVsbG8=')
}

const directory = new URL('../node_modules/nuxt-studio/dist/app/', import.meta.url)
let patched = 0
for (const file of readdirSync(directory).filter(file => /^main-.*\.js$/.test(file))) {
  const path = new URL(file, directory)
  const source = readFileSync(path, 'utf8')
  if (!source.includes(broken)) continue
  writeFileSync(path, source.replaceAll(broken, fixed))
  patched++
}
console.log(`Studio media base64 compatibility: OK (${patched} bundles updated).`)
