<script setup lang="ts">
import { money, productSuggestions, validGiftAmount } from '#shared/shop'
const route = useRoute()
const productId = String(route.params.id)
const { data: product } = await useAsyncData('product-' + productId, () => queryCollection('products').where('productId', '=', productId).first())
if (!product.value || product.value.status === 'draft') throw createError({ statusCode: 404, statusMessage: 'Produkt nicht gefunden' })
const giftAmount = ref('0')
const giftAmountCents = computed(() => /^\d+(?:[.,]\d{1,2})?$/.test(giftAmount.value.trim()) ? Math.round(Number(giftAmount.value.replace(',', '.')) * 100) : 0)
const amountValid = computed(() => !product.value?.customAmount || validGiftAmount(giftAmountCents.value))
const { catalog, ready, add, refresh } = useCart()
const stock = computed(() => catalog.value?.products.find(item => item.productId === productId))
await refresh()
const sold = computed(() => product.value?.status === 'archived' || stock.value?.soldOut)
const matchingProducts = computed(() => productSuggestions(catalog.value?.products || [], productId, 3, product.value?.relatedProducts || []))
const moreProducts = computed(() => productSuggestions(catalog.value?.products || [], productId, 3))
if (sold.value) await navigateTo('/', { redirectCode: 302 })
watch(sold, value => { if (value) navigateTo('/', { replace: true }) })
const detail = ref<HTMLElement>()
const confirmed = ref(false)
const confirmationImage = useState('purchase-confirmation-image', () => 'cool')
let timer: ReturnType<typeof setTimeout> | undefined
let observer: ResizeObserver | undefined
useHead({ title: product.value.name + ' – Beeeda' })
onMounted(() => {
  try { sessionStorage.setItem('beeeda.last-product', productId) } catch {}
  history.scrollRestoration = 'manual'
  observer = new ResizeObserver(() => {
    if (!detail.value) return
    const firstElement = detail.value.firstElementChild?.getBoundingClientRect()
    const lastElement = detail.value.lastElementChild?.getBoundingClientRect()
    if (firstElement && lastElement) detail.value.style.setProperty('--detail-center', ((firstElement.top + lastElement.bottom) / 2 - detail.value.getBoundingClientRect().top) + 'px')
    const buyButton = detail.value.querySelector('#buy-button')?.getBoundingClientRect()
    if (buyButton) detail.value.style.setProperty('--buy-center', ((buyButton.top + buyButton.bottom) / 2 - detail.value.getBoundingClientRect().top) + 'px')
  })
  if (detail.value) observer.observe(detail.value)
  refresh()
})
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(timer) })
function buy() {
  if (!amountValid.value) return
  add(productId, product.value?.customAmount ? giftAmountCents.value : undefined)
  try { confirmationImage.value = sessionStorage.getItem('beeeda.purchase-confirmation') || confirmationImage.value } catch {}
  confirmationImage.value = confirmationImage.value === 'yuhu' ? 'cool' : 'yuhu'
  try { sessionStorage.setItem('beeeda.purchase-confirmation', confirmationImage.value) } catch {}
  confirmed.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { confirmed.value = false }, 3000)
}
</script>
<template>
  <main v-if="product && !sold" class="subsite pinkchaos">
    <section class="gallery product-gallery" :aria-label="'Bild von ' + product.name"><div class="gallery-image"><img class="gallery-slide" :src="product.hero || product.cover" :alt="product.name + ', Gesamtansicht'" /></div></section>
    <section ref="detail" class="detail-content">
      <h1 v-if="product.productId !== 'Gutschein'">{{ product.name }}</h1>
      <p v-if="!product.customAmount" class="status">{{ product.status === 'archived' || stock?.soldOut ? 'Verkauft' : product.customAmount ? 'Betrag frei wählbar' : money(product.priceCents) }}<template v-if="product.makingMethod"><br /><span>{{ product.makingMethod }}</span></template><template v-if="stock?.available != null"><br /><span>{{ product.stockDisplay === 'Einzelstück' ? 'Einzelstück' : `Noch ${stock.available} Stück verfügbar` }}</span></template></p>
      <p class="description-text">{{ product.description }}</p>
      <details v-if="product.customAmount" class="product-info disclosure">
        <summary><span class="info-closed">+ Preise</span><span class="info-open">- Preise</span></summary>
        <p class="product-info pricing-info">{{ product.pricingInfo }}</p>
      </details>
      <details v-if="!product.customAmount" class="product-info disclosure">
        <summary><span class="info-closed">+ Infos</span><span class="info-open">- Infos</span></summary>
        <p class="product-info">{{ product.materials }}<br />{{ product.measurements }}<template v-if="product.materialBehavior"><br />{{ product.materialBehavior }}</template><template v-if="product.care"><br />{{ product.care }}</template></p>
        <p class="product-info product-contact">Die Farben können durch Fotografie und Bildschirmdarstellung leicht vom Original abweichen.<br />Hast du eine Frage zum Produkt? Schreib uns gerne an <a href="mailto:hi@beeeda.ch">hi@beeeda.ch</a>.</p>
      </details>
      <div v-if="product.customAmount" class="gift-amount">
        <label for="gift-amount">Dein Gutscheinbetrag in CHF</label>
        <input id="gift-amount" v-model="giftAmount" type="text" inputmode="decimal" autocomplete="off" :aria-invalid="!amountValid" />
      </div>
      <button id="buy-button" class="buy-button buy-graphic" :disabled="!amountValid || !ready || !catalog || product.status !== 'active' || stock?.soldOut || stock?.available === 0" aria-label="Kaufen" @click="buy"><img src="/assets/kaufen.svg" alt="" aria-hidden="true" /><span class="buy-label">Kaufen</span></button>
      <section v-if="matchingProducts.length" class="product-matching" aria-labelledby="matching-heading">
        <h2 id="matching-heading">Passende Produkte</h2>
        <ProductSuggestions :products="matchingProducts" />
      </section>
    </section>
    <section v-if="product.gallery?.length" class="gallery gallery-secondary" :aria-label="'Weitere Bilder von ' + product.name"><div v-for="(image, index) in product.gallery" :key="image" class="gallery-image"><img :src="image" :alt="product.name + ', Detail ' + (index + 1)" loading="lazy" /></div></section>
    <section v-if="moreProducts.length" class="product-discover" aria-label="Weitere Produkte">
      <ProductSuggestions :products="moreProducts" />
    </section>
  </main>
  <div v-if="confirmed" class="purchase-overlay" role="status"><img :src="'/assets/' + confirmationImage + '.svg'" :class="{ 'white-artwork': confirmationImage === 'yuhu' }" :alt="product?.name + ' ist jetzt im Warenkorb.'" /></div>
</template>
<style scoped>
.pricing-info { white-space: pre-line; }
.gift-amount { display: grid; justify-items: center; gap: 10px; margin: 24px 0; }
.gift-amount label, .gift-amount p { font-size: var(--corner-link-font-size); }
.gift-amount input { width: 160px; padding: 10px; border: 1px solid #737373; border-radius: 6px; font: inherit; text-align: center; }
.gift-amount p { margin: 0; }
</style>
