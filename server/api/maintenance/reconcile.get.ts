import { authorizedCron, database, stripe, startSession, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  authorizedCron(event)
  const { data: orders, error } = await database(event).from('orders').select('*').in('status', ['preparing','reserved']).order('created_at').limit(100)
  if (error) throw createError({ statusCode: 503, message: 'Abgleich fehlgeschlagen.' })
  let synchronized = 0
  for (const order of orders || []) {
    try {
      let session
      if (order.stripe_session_id) session = await stripe(event).checkout.sessions.retrieve(order.stripe_session_id)
      else {
        // Idempotency is guaranteed for at least 24h. Older unresolved holds need manual review.
        if (Date.now() - new Date(order.created_at).getTime() > 23 * 60 * 60 * 1000) {
          console.error('Manual review required for unresolved order:', order.id)
          continue
        }
        // A create request with the original (now expired) deadline can only recover an existing session.
        session = await startSession(event, order)
      }
      await synchronizeSession(event, session)
      synchronized++
    } catch (error: any) { console.error('Order reconciliation failed:', order.id, error.statusCode || error.type || error.name) }
  }
  return { synchronized }
})

