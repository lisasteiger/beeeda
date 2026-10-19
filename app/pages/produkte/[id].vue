<script setup lang="ts">
import { money, nextShopProduct } from '#shared/shop'
const route = useRoute()
const productId = String(route.params.id)
const { data: product } = await useAsyncData('product-' + productId, () => queryCollection('products').where('productId', '=', productId).first())
if (!product.value || product.value.status === 'draft') throw createError({ statusCode: 404, statusMessage: 'Produkt nicht gefunden' })
const { catalog, ready, add, refresh } = useCart()
const stock = computed(() => catalog.value?.products.find(item => item.productId === productId))
await refresh()
const sold = computed(() => product.value?.status === 'archived' || stock.value?.soldOut)
const nextProduct = computed(() => nextShopProduct(catalog.value?.products || [], productId))
if (sold.value) await navigateTo('/', { redirectCode: 302 })
watch(sold, value => { if (value) navigateTo('/', { replace: true }) })
const detail = ref<HTMLElement>()
const confirmed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | undefined
useHead({ title: product.value.name + ' – Beeeda' })
onMounted(() => {
  try { sessionStorage.setItem('beeeda.last-product', productId) } catch {}
  history.scrollRestoration = 'manual'
  observer = new ResizeObserver(() => {
    if (!detail.value) return
    const title = detail.value.querySelector('h1')?.getBoundingClientRect()
    const button = detail.value.querySelector('button')?.getBoundingClientRect()
    if (title && button) detail.value.style.setProperty('--detail-center', ((title.top + button.bottom) / 2 - detail.value.getBoundingClientRect().top) + 'px')
  })
  if (detail.value) observer.observe(detail.value)
  refresh()
})
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(timer) })
function buy() {
  add(productId)
  confirmed.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { confirmed.value = false }, 3000)
}
</script>
<template>
  <main v-if="product && !sold" class="subsite pinkchaos">
    <section class="gallery product-gallery" :aria-label="'Bild von ' + product.name"><div class="gallery-image"><img class="gallery-slide" :src="product.hero || product.cover" :alt="product.name + ', Gesamtansicht'" /></div></section>
    <section ref="detail" class="detail-content">
      <h1>{{ product.name }}</h1>
      <p class="status">{{ product.status === 'archived' || stock?.soldOut ? 'Verkauft' : money(product.priceCents) }}</p>
      <p class="description-text">{{ product.description }}</p>
      <details class="product-info disclosure">
        <summary><span class="info-closed">+ Infos</span><span class="info-open">Infos schliessen</span></summary>
        <p class="product-info">{{ product.materials }}<br />{{ product.measurements }}<template v-if="product.care"><br />{{ product.care }}</template></p>
      </details>
      <button id="buy-button" class="buy-button buy-graphic" :disabled="!ready || !catalog || product.status !== 'active' || stock?.soldOut || stock?.available === 0" aria-label="Kaufen" @click="buy"><img src="/assets/kaufen.svg" alt="" aria-hidden="true" /><span class="buy-label">Kaufen</span></button>
      <a v-if="nextProduct" class="product-next" :href="'/produkte/' + encodeURIComponent(nextProduct.productId)" :aria-label="'Nächstes Produkt: ' + nextProduct.name">Nächstes Produkt →</a>
    </section>
    <section class="gallery gallery-secondary" :aria-label="'Weitere Bilder von ' + product.name"><div v-for="(image, index) in product.gallery" :key="image" class="gallery-image"><img :src="image" :alt="product.name + ', Detail ' + (index + 1)" loading="lazy" /></div></section>
  </main>
  <div v-if="confirmed" class="purchase-overlay" role="status"><p><span>{{ product?.name }}</span><span>ist jetzt</span><span>im Warenkorb.</span></p></div>
</template>
