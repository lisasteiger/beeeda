export type Product = {
  productId: string; name: string; size?: string; status: 'draft' | 'active' | 'archived'; priceCents: number;
  shippingClass: 'small' | 'large'; description: string; materials: string; measurements: string;
  care: string; cover: string; hero: string; thumbnail: string; archiveImage: string;
  gallery: string[]; displayOrder: number; available?: number | null; soldOut?: boolean; relatedProducts?: string[]
}
export type CartLine = { productId: string; quantity: number }
export function orderedProducts<T extends { productId: string; displayOrder?: number | string }>(products: readonly T[]): T[] {
  const order = (product: T) => Number(product.displayOrder) || 0
  return [...products].sort((a, b) => order(a) - order(b) || a.productId.localeCompare(b.productId, 'de'))
}
export function nextShopProduct(products: Product[], currentId: string) {
  const available = orderedProducts(products.filter(product => product.status === 'active' && !product.soldOut))
  if (!available.length || (available.length === 1 && available[0]!.productId === currentId)) return
  const index = available.findIndex(product => product.productId === currentId)
  return available[(index + 1) % available.length]
}
export function productSuggestions(products: Product[], currentId: string, limit = 5, selectedIds?: readonly string[]) {
  const available = orderedProducts(products.filter(product => product.status === 'active' && !product.soldOut && (product.cover || product.thumbnail || product.hero)))
  if (selectedIds) {
    const byId = new Map(available.filter(product => product.productId !== currentId).map(product => [product.productId, product]))
    return [...new Set(selectedIds)].flatMap(id => byId.has(id) ? [byId.get(id)!] : []).slice(0, limit)
  }
  const index = available.findIndex(product => product.productId === currentId)
  return [...available.slice(index + 1), ...available.slice(0, index + 1)]
    .filter(product => product.productId !== currentId).slice(0, limit)
}
export function shippingCents(lines: { quantity: number; shippingClass: string }[]) {
  if (!lines.length) return 0
  return lines.reduce((sum, line) => sum + line.quantity, 0) >= 2 || lines.some(line => line.shippingClass !== 'small') ? 900 : 200
}
export const money = (cents: number) => 'CHF ' + (cents / 100).toFixed(2)
export function validateCart(input: unknown): CartLine[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) throw new Error('Bitte prüfe deinen Warenkorb.')
  const seen = new Set<string>()
  return input.map(line => {
    if (!line || typeof line.productId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(line.productId) ||
      !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 || seen.has(line.productId)) {
      throw new Error('Ungültige Artikel oder Mengen im Warenkorb.')
    }
    seen.add(line.productId)
    return { productId: line.productId, quantity: line.quantity }
  })
}


export type AdminData = {
  products: { productId: string; name: string; status: string; onHand: number; enabled: boolean; available: number }[];
  orders: { id: string; status: string; created_at: string; paid_at: string | null; total_cents: number; items: unknown; customer: unknown }[]
}
