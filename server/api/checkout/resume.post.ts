import { currentOrder } from '../../utils/current-order'
import { hasTermsAcceptance, termsVersion } from '#shared/legal'
import { checkOrigin, startSession, synchronizeSession } from '../../utils/shop'
export default defineEventHandler(async event => {
  checkOrigin(event)
  if (!hasTermsAcceptance(await readBody(event))) {
    throw createError({ statusCode: 400, message: 'Bitte stimme den aktuellen AGB zu.' })
  }
  const order = await currentOrder(event)
  if (!order || !['preparing','reserved'].includes(order.status)) throw createError({ statusCode: 409, message: 'Keine offene Reservierung vorhanden.' })
  if (order.stripe_payload?.metadata?.terms_version !== termsVersion || !order.stripe_payload?.metadata?.terms_accepted_at) {
    throw createError({ statusCode: 409, message: 'Bitte hebe diese ältere Reservierung auf und starte die Bestellung mit den aktuellen AGB erneut.' })
  }
  const session = await startSession(event, order)
  await synchronizeSession(event, session)
  if (session.status !== 'open' || !session.url) throw createError({ statusCode: 409, message: 'Diese Reservierung ist nicht mehr offen. Bitte prüfe deinen Warenkorb.' })
  return { url: session.url }
})
