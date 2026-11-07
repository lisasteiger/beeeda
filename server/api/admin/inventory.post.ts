import { requireShopAdmin } from '../../utils/admin'
import { database, databaseError, productList, checkOrigin } from '../../utils/shop'
export default defineEventHandler(async event => {
  checkOrigin(event)
  await requireShopAdmin(event)
  const body = await readBody(event)
  if (typeof body?.productId !== 'string' || !Number.isInteger(body.onHand) || body.onHand < 0 || body.onHand > 9999 || typeof body.enabled !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Bitte einen Bestand zwischen 0 und 9999 eingeben.' })
  }
  const products = await productList(event)
  if (!products.some(product => product.productId === body.productId)) throw createError({ statusCode: 404, message: 'Produkt nicht gefunden.' })
  const { error } = await database(event).rpc('shop_set_inventory', {
    p_product: body.productId, p_on_hand: body.onHand, p_enabled: body.enabled
  })
  if (error?.message.includes('below_reserved')) throw createError({ statusCode: 409, message: 'Der Bestand darf die bereits reservierte Menge nicht unterschreiten.' })
  databaseError(error)
  return { saved: true }
})

