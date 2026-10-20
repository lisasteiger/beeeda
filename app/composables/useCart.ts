import { money, shippingCents, type CartLine, type Product } from '#shared/shop'
export function useCart() {
  const lines = useState<CartLine[]>('cart', () => [])
  const ready = useState('cart-ready', () => false)
  const { data: catalog, refresh } = useAsyncData<{ products: Product[]; checkoutReady: boolean }>('catalog', () => $fetch('/api/catalog'))
  onMounted(() => {
    if (ready.value) return
    try {
      const saved = JSON.parse(localStorage.getItem('beeeda.cart.v1') || '[]')
      const seen = new Set<string>()
      if (Array.isArray(saved)) lines.value = saved.slice(0, 50).flatMap(line => {
        const productId = line?.productId || line?.id
        if (typeof productId !== 'string' || !/^[a-z0-9-]{1,80}$/.test(productId) || seen.has(productId) || !Number.isInteger(line?.quantity) || line.quantity < 1) return []
        seen.add(productId)
        return [{ productId, quantity: Math.min(99, line.quantity) }]
      })
    } catch {}
    ready.value = true
  })
  if (import.meta.client) watch(lines, value => {
    try { localStorage.setItem('beeeda.cart.v1', JSON.stringify(value)) } catch {}
  }, { deep: true })
  const items = computed(() => lines.value.map(line => {
    const product = catalog.value?.products.find(product => product.productId === line.productId)
    return product ? { ...product, quantity: line.quantity } : null
  }).filter(item => item !== null))
  const count = computed(() => lines.value.reduce((sum, item) => sum + item.quantity, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.quantity * item.priceCents, 0))
  const shipping = computed(() => shippingCents(items.value))
  const valid = computed(() => Boolean(items.value.length && items.value.length === lines.value.length && items.value.every(item =>
    item.status === 'active' && item.available !== null && item.available !== undefined && item.quantity <= item.available)))
  function quantity(productId: string, value: number) {
    const product = catalog.value?.products.find(product => product.productId === productId)
    if (!product) return
    const max = product.available ?? 99
    const amount = Math.max(0, Math.min(max, Number.isFinite(value) ? Math.trunc(value) : 0))
    lines.value = [...lines.value.filter(line => line.productId !== productId), ...(amount ? [{ productId, quantity: amount }] : [])]
  }
  function add(productId: string) {
    quantity(productId, (lines.value.find(line => line.productId === productId)?.quantity || 0) + 1)
  }
  function remove(productId: string) { lines.value = lines.value.filter(line => line.productId !== productId) }
  function clear() { lines.value = [] }
  function completeOrder(orderId: string, purchased: CartLine[]) {
    let completed: string[] = []
    try { completed = JSON.parse(localStorage.getItem('beeeda.completed-orders') || '[]') } catch {}
    if (!Array.isArray(completed)) completed = []
    if (completed.includes(orderId)) return
    lines.value = lines.value.flatMap(line => {
      const quantity = line.quantity - (purchased.find(item => item.productId === line.productId)?.quantity || 0)
      return quantity > 0 ? [{ ...line, quantity }] : []
    })
    try { localStorage.setItem('beeeda.completed-orders', JSON.stringify([...completed.slice(-49), orderId])) } catch {}
  }
  return { lines, ready, catalog, refresh, items, count, subtotal, shipping, valid, quantity, add, remove, clear, completeOrder, money }
}
