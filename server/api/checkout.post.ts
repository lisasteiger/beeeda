import { randomUUID } from 'node:crypto'
import { checkOrigin, owner, database, databaseError, priceCart, stripe, startSession } from '../utils/shop'
export default defineEventHandler(async event => {
  checkOrigin(event)
  stripe(event)
  const db = database(event)
  const shopper = owner(event, true)
  const body = await readBody(event)
  if (typeof body?.requestKey !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.requestKey)) {
    throw createError({ statusCode: 400, message: 'Ungültige Bestellung.' })
  }
  const { items, shipping } = await priceCart(event, body.items)
  const id = randomUUID()
  const siteUrl = new URL(useRuntimeConfig(event).public.siteUrl).origin
  const payload = {
    mode: 'payment',
    currency: 'chf',
    line_items: items.map(item => ({
      price_data: { currency: 'chf', unit_amount: item.priceCents, product_data: { name: item.name } },
      quantity: item.quantity
    })),
    shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: shipping, currency: 'chf' }, display_name: 'Versand Schweiz' } }],
    shipping_address_collection: { allowed_countries: ['CH'] },
    billing_address_collection: 'required',
    expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
    metadata: { order_id: id },
    success_url: siteUrl + '/bestellung?order=' + id,
    cancel_url: siteUrl + '/kasse?cancelled=1'
  }
  const { data: order, error } = await db.rpc('shop_reserve', {
    p_id: id, p_owner: shopper, p_request: body.requestKey, p_items: items, p_shipping: shipping, p_payload: payload
  })
  databaseError(error)
  if (order) setCookie(event, 'beeeda-active-order', order.id, { httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 86400 })
  if (!order || !['preparing', 'reserved'].includes(order.status)) {
    throw createError({ statusCode: 409, message: 'Diese Bestellung ist bereits abgeschlossen. Bitte starte erneut.' })
  }
  try {
    const session = await startSession(event, order)
    if (!session.url || session.status !== 'open') throw createError({ statusCode: 409, message: 'Bitte starte eine neue Bestellung.' })
    return { url: session.url }
  } catch (error: any) {
    if (error.statusCode) throw error
    // Never release stock on an uncertain network failure: Stripe may have created a payable session.
    console.error('Stripe session could not be recovered:', order.id, error.type || error.name)
    throw createError({ statusCode: 503, message: 'Die Zahlung konnte nicht gestartet werden. Bitte versuche es nochmals.' })
  }
})
