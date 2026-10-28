import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { queryCollection } from '@nuxt/content/nitro'
import { createError, getCookie, setCookie, getHeader, type H3Event } from 'h3'
import { validateCart, shippingCents, orderedProducts, type Product } from '#shared/shop'

export function database(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.supabaseSecretKey) throw createError({ statusCode: 503, message: 'Der Online-Kauf wird gerade eingerichtet.' })
  return createClient(config.supabaseUrl, config.supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } })
}
export function stripe(event: H3Event) {
  const config = useRuntimeConfig(event)
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) throw createError({ statusCode: 503, message: 'Die Zahlung wird gerade eingerichtet.' })
  return new Stripe(config.stripeSecretKey, { maxNetworkRetries: 2 })
}
export function owner(event: H3Event, create = false) {
  let token = getCookie(event, 'beeeda-owner')
  if (!token || !/^[a-f0-9-]{36}$/.test(token)) {
    if (!create) throw createError({ statusCode: 404, message: 'Bestellung nicht gefunden.' })
    token = randomUUID()
    setCookie(event, 'beeeda-owner', token, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 60 * 60 * 24 * 30 })
  }
  return createHash('sha256').update(token).digest('hex')
}
export function checkOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const allowed = new URL(useRuntimeConfig(event).public.siteUrl).origin
  if (origin === allowed || (import.meta.dev && origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) return
  throw createError({ statusCode: 403, message: 'Ungültiger Zugriff.' })
}
export function authorizedCron(event: H3Event) {
  const secret = useRuntimeConfig(event).cronSecret
  const header = getHeader(event, 'authorization') || ''
  const expected = 'Bearer ' + secret
  if (!secret || Buffer.byteLength(header) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
    throw createError({ statusCode: 401, message: 'Nicht autorisiert.' })
  }
}
export async function productList(event: H3Event) {
  const rows = await queryCollection(event, 'products').all()
  // Content's SQLite adapter can return integer columns as strings.
  return orderedProducts(rows.map(row => ({ ...row, priceCents: Number(row.priceCents), displayOrder: Number(row.displayOrder) }))) as Product[]
}
export async function synchronizeContentInventory(event: H3Event, products: Product[]) {
  const { error } = await database(event).rpc('shop_sync_content_inventory', {
    p_products: products.filter(product => product.status === 'active').map(product => ({
      productId: product.productId,
      quantity: product.stockQuantity == null ? null : Number(product.stockQuantity)
    }))
  })
  // Keep the existing shop available while the one-time database migration is pending.
  if (error?.code === 'PGRST202') {
    console.warn('Studio inventory requires migration 202610240001_studio_inventory.sql.')
    return
  }
  databaseError(error)
}
export async function priceCart(event: H3Event, input: unknown) {
  let lines
  try { lines = validateCart(input) } catch (error) { throw createError({ statusCode: 400, message: (error as Error).message }) }
  const products = await productList(event)
  await synchronizeContentInventory(event, products)
  const items = lines.map(line => {
    const product = products.find(product => product.productId === line.productId && product.status === 'active')
    if (!product || !Number.isSafeInteger(product.priceCents) || product.priceCents <= 0) throw createError({ statusCode: 409, message: 'Dieses Produkt ist nicht mehr erhältlich.' })
    return { productId: product.productId, quantity: line.quantity, name: product.name, priceCents: product.priceCents, shippingClass: product.shippingClass }
  })
  return { items, shipping: shippingCents(items) }
}
export function databaseError(error: { message: string } | null) {
  if (!error) return
  if (error.message.includes('out_of_stock')) throw createError({ statusCode: 409, message: 'Ein Produkt wurde inzwischen reserviert oder verkauft. Bitte prüfe deinen Warenkorb.' })
  if (error.message.includes('request_key_conflict')) throw createError({ statusCode: 409, message: 'Der Warenkorb wurde geändert. Bitte starte die Bestellung erneut.' })
  console.error('Shop database operation failed:', error.message)
  throw createError({ statusCode: 503, message: 'Die Bestellung kann gerade nicht verarbeitet werden.' })
}
export async function startSession(event: H3Event, order: any) {
  const payments = stripe(event)
  // Retrying the exact stored payload recovers a session after a network interruption.
  const session = order.stripe_session_id
    ? await payments.checkout.sessions.retrieve(order.stripe_session_id)
    : await payments.checkout.sessions.create(order.stripe_payload, { idempotencyKey: 'beeeda-order-' + order.id })
  const { error } = await database(event).rpc('shop_attach_session', { p_id: order.id, p_session: session.id })
  databaseError(error)
  return session
}
export async function synchronizeSession(event: H3Event, session: Stripe.Checkout.Session) {
  const id = session.metadata?.order_id
  if (!id) return
  const paid = session.payment_status === 'paid'
  if (!paid && session.status !== 'expired') return
  const { error } = await database(event).rpc('shop_finish', {
    p_id: id, p_session: session.id, p_paid: paid, p_amount: session.amount_total || 0,
    p_currency: session.currency || '', p_customer: paid ? {
      details: session.customer_details,
      shipping: session.collected_information?.shipping_details
    } : null
  })
  databaseError(error)
}
