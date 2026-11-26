import { currentOrder } from '../../utils/current-order'
export default defineEventHandler(async event => {
  if (!useRuntimeConfig(event).supabaseSecretKey) return null
  const order = await currentOrder(event)
  if (!order || !['preparing','reserved'].includes(order.status)) return null
  return { id: String(order.id), items: order.items as { productId: string; quantity: number; name: string }[] }
})

