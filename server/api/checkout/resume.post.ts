import { currentOrder } from '../../utils/current-order'
import { checkOrigin, startSession, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  checkOrigin(event)
  const order = await currentOrder(event)
  if (!order || !['preparing','reserved'].includes(order.status)) throw createError({ statusCode: 409, message: 'Keine offene Reservierung vorhanden.' })
  const session = await startSession(event, order)
  await synchronizeSession(event, session)
  if (session.status !== 'open' || !session.url) throw createError({ statusCode: 409, message: 'Diese Reservierung ist nicht mehr offen. Bitte prüfe deinen Warenkorb.' })
  return { url: session.url }
})

