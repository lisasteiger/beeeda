import { currentOrder } from '../../utils/current-order'
import { checkOrigin, stripe, startSession, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  checkOrigin(event)
  const order = await currentOrder(event)
  if (!order || !['preparing','reserved'].includes(order.status)) return { cancelled: true }
  let session = await startSession(event, order)
  if (session.status === 'open') {
    try { session = await stripe(event).checkout.sessions.expire(session.id) }
    catch { session = await stripe(event).checkout.sessions.retrieve(session.id) }
  }
  await synchronizeSession(event, session)
  if (session.status !== 'expired') {
    throw createError({ statusCode: 409, message: 'Diese Zahlung wurde bereits gestartet oder abgeschlossen. Bitte prüfe die Bestätigung.' })
  }
  deleteCookie(event, 'beeeda-active-order', { path: '/' })
  return { cancelled: true }
})

