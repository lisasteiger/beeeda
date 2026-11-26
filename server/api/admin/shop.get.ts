import type { AdminData } from '#shared/shop'
import { requireShopAdmin } from '../../utils/admin'
import { database, databaseError, productList } from '../../utils/shop'
export default defineEventHandler(async (event): Promise<AdminData> => {
  await requireShopAdmin(event)
  const db = database(event)
  const [stock, available, orders] = await Promise.all([
    db.from('inventory').select('*'),
    db.rpc('shop_availability'),
    db.from('orders').select('id,status,created_at,paid_at,total_cents,items,customer').order('created_at', { ascending: false }).limit(100)
  ])
  databaseError(stock.error); databaseError(available.error); databaseError(orders.error)
  return {
    products: (await productList(event)).map(product => ({
      productId: product.productId, name: product.name, status: product.status,
      onHand: stock.data?.find(item => item.product_id === product.productId)?.on_hand ?? 0,
      enabled: stock.data?.find(item => item.product_id === product.productId)?.enabled ?? false,
      available: available.data?.find((item: any) => item.product_id === product.productId)?.available ?? 0
    })),
    orders: orders.data || []
  }
})

