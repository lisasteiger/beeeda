import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const publicDir = resolve(root, 'public')
assert.ok(!existsSync(resolve(root, 'assets')), 'Bilder bitte nur unter public/assets/ ablegen; der alte Ordner assets/ darf nicht erneut angelegt werden.')

for (const file of readdirSync(resolve(root, 'content/products')).filter(file => file.endsWith('.json'))) {
  const product = JSON.parse(readFileSync(resolve(root, 'content/products', file), 'utf8'))
  const images = ['cover', 'hero', 'thumbnail', 'archiveImage'].map(field => [field, product[field]])
  images.push(...(product.gallery || []).map((image, index) => [`gallery[${index}]`, image]))
  for (const [field, image] of images) {
    if (!image || /^https?:\/\//.test(image)) continue
    const label = `${file}, ${field}: ${image}`
    assert.ok(image.startsWith('/') && !image.startsWith('//') && !/^\/public(?:\/|$)/.test(image), `${label} – Bildadresse muss z. B. /assets/bild.webp lauten, ohne public/.`)
    const path = resolve(publicDir, '.' + decodeURIComponent(image.split(/[?#]/)[0]))
    assert.ok(path.startsWith(publicDir + sep) && existsSync(path) && statSync(path).isFile(), `${label} – Bild fehlt unter public/.`)
  }
}
console.log('Produktbilder: Pfade und Dateien OK (ein gemeinsamer Bildordner).')
