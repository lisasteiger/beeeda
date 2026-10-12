import { database, owner, stripe, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id') || ''
  if (!/^[a-f0-9-]{36}$/.test(id)) throw createError({ statusCode: 404, message: 'Bestellung nicht gefunden.' })
  const db = database(event)
  const shopper = owner(event)
  const { data: order, error } = await db.from('orders').select('id,status,stripe_session_id,total_cents,items').eq('id', id).eq('owner_hash', shopper).maybeSingle()
  if (error || !order) throw createError({ statusCode: 404, message: 'Bestellung nicht gefunden.' })
  if (order.stripe_session_id && !['paid','expired','cancelled'].includes(order.status)) {
    const session = await stripe(event).checkout.sessions.retrieve(order.stripe_session_id)
    await synchronizeSession(event, session)
    const { data } = await db.from('orders').select('status').eq('id', id).eq('owner_hash', shopper).single()
    if (data) order.status = data.status
  }
  return { id: String(order.id), status: String(order.status), totalCents: Number(order.total_cents), items: order.items as { productId: string; quantity: number }[] }
})
