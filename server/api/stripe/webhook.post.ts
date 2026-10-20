import { stripe, database, databaseError, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  const signature = getHeader(event, 'stripe-signature')
  const raw = await readRawBody(event, false)
  if (!signature || !raw) throw createError({ statusCode: 400, message: 'Signatur fehlt.' })
  let notification
  try { notification = stripe(event).webhooks.constructEvent(raw, signature, useRuntimeConfig(event).stripeWebhookSecret) }
  catch { throw createError({ statusCode: 400, message: 'Ungültige Signatur.' }) }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.expired'].includes(notification.type)) {
    await synchronizeSession(event, notification.data.object as any)
  }
  if (notification.type === 'checkout.session.async_payment_failed') {
    const session = notification.data.object as any
    if (session.metadata?.order_id) {
      const { error } = await database(event).rpc('shop_finish', {
        p_id: session.metadata.order_id, p_session: session.id, p_paid: false,
        p_amount: session.amount_total || 0, p_currency: session.currency || '', p_customer: null
      })
      databaseError(error)
    }
  }
  return { received: true }
})

