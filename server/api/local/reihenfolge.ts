import { readdir, readFile, writeFile, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { orderedProducts } from '#shared/shop'
import { validImageOrder } from '../../utils/image-order'

export default defineEventHandler(async event => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  const host = getHeader(event, 'host') || ''
  if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host)) throw createError({ statusCode: 403 })
  if (event.method !== 'GET' && getHeader(event, 'origin') !== `http://${host}`) throw createError({ statusCode: 403 })
  const directory = join(process.cwd(), 'content/products')
  const records = await Promise.all((await readdir(directory)).filter(name => name.endsWith('.json')).map(async file => {
    const raw = await readFile(join(directory, file), 'utf8')
    return { file, raw, product: JSON.parse(raw), revision: createHash('sha256').update(raw).digest('hex') }
  }))
  const products = orderedProducts(records.map(record => ({ ...record.product, revision: record.revision })))
  if (event.method === 'GET') return products.map(product => ({ productId: product.productId, name: product.name, status: product.status, cover: product.cover, hero: product.hero || product.cover || '', gallery: product.gallery || [], revision: product.revision }))
  if (event.method !== 'POST') throw createError({ statusCode: 405 })
  const body = await readBody(event)
  if (!Array.isArray(body?.changes) || body.changes.length > records.length) throw createError({ statusCode: 400 })
  const seen = new Set()
  const updates = body.changes.map((change: any) => {
    const record = records.find(record => record.product.productId === change.productId)
    if (!record || seen.has(change.productId)) throw createError({ statusCode: 400 })
    seen.add(change.productId)
    if (record.revision !== change.revision) throw createError({ statusCode: 409, message: 'In Studio wurden inzwischen Änderungen gespeichert. Bitte neu laden und nochmals sortieren.' })
    const product = { ...record.product }
    if (change.displayOrder !== undefined) {
      if (!Number.isSafeInteger(change.displayOrder) || change.displayOrder < 1 || change.displayOrder > records.length) throw createError({ statusCode: 400 })
      product.displayOrder = change.displayOrder
    }
    if (change.images !== undefined) {
      const original = [product.hero || product.cover || '', ...(product.gallery || [])]
      if (!validImageOrder(original, change.images)) throw createError({ statusCode: 400, message: 'Die Bildauswahl hat sich geändert. Bitte neu laden.' })
      product.hero = change.images[0]
      product.gallery = change.images.slice(1)
    }
    return { file: record.file, content: JSON.stringify(product, null, 2) + '\n' }
  })
  for (const update of updates) {
    const path = join(directory, update.file)
    await writeFile(path + '.sorting-tmp', update.content)
    await rename(path + '.sorting-tmp', path)
  }
  return { saved: true }
})
