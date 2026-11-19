import { database, productList, synchronizeContentInventory } from '../utils/shop'
export default defineEventHandler(async event => {
  const products = (await productList(event)).filter(product => product.status !== 'draft')
  const config = useRuntimeConfig(event)
  if (!config.supabaseSecretKey) return { products: products.map(product => ({ ...product, available: null, soldOut: false })), checkoutReady: false }
  try {
    await synchronizeContentInventory(event, products)
    const { data, error } = await database(event).rpc('shop_availability')
    if (error) throw error
    return {
      products: products.map(product => {
        const stock = data?.find((item: any) => item.product_id === product.productId)
        return { ...product, available: stock?.available ?? 0, soldOut: stock?.sold_out ?? false }
      }),
      checkoutReady: Boolean(config.stripeSecretKey && config.stripeWebhookSecret)
    }
  } catch (error) {
    console.error('Inventory unavailable:', error)
    return { products: products.map(product => ({ ...product, available: null, soldOut: false })), checkoutReady: false }
  }
})
