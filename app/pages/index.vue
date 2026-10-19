<script setup lang="ts">
import { orderedProducts } from '#shared/shop'
const { catalog } = useCart()
const { data: contentProducts } = await useAsyncData('carousel-products', () => queryCollection('products').all())
const carousel = ref<HTMLElement>()
const returning = ref(useRoute().query.back !== undefined)
useHead(() => ({ htmlAttrs: { class: returning.value ? 'home-page returning-from-subsite' : 'home-page' } }))
const products = computed(() => orderedProducts(contentProducts.value || []).filter(product => product.status !== 'draft'))
const slides = computed(() => products.value.map(product => {
  const sold = product.status === 'archived' || Boolean(catalog.value?.products.find(item => item.productId === product.productId)?.soldOut)
  return { id: product.productId, cover: product.cover, name: product.name, size: product.size || '', href: sold ? undefined : '/produkte/' + encodeURIComponent(product.productId), sold }
}))
let dispose: (() => void) | undefined
let stopWatching: (() => void) | undefined
let generation = 0
onMounted(() => {
  requestAnimationFrame(() => { returning.value = false })
  stopWatching = watch(slides, async () => {
    const current = ++generation
    await nextTick()
    const modulePath = '/carousel.js'
    const { initCarousel } = await import(/* @vite-ignore */ modulePath)
    if (current !== generation || !carousel.value) return
    const selected = carousel.value.dataset.currentProduct
    dispose?.()
    dispose = initCarousel(carousel.value, selected)
  }, { immediate: true, flush: 'post' })
})
onBeforeUnmount(() => { generation++; stopWatching?.(); dispose?.() })
</script>
<template>
  <main id="carousel" ref="carousel" class="carousel" aria-label="Produkte" tabindex="0">
    <div class="carousel-inner">
      <div v-for="slide in slides" :key="slide.id" class="item" :data-product-id="slide.id" :data-sold="slide.sold">
        <component :is="slide.href ? 'a' : 'span'" :href="slide.href" class="image-link" draggable="false"><img :src="slide.cover" :alt="slide.name + (slide.sold ? ' – verkauft' : '')" /></component>
      </div>
    </div>
    <span v-for="slide in slides" :key="'size-' + slide.id" class="site-link carousel-size">{{ slide.size }}</span>
    <img id="carousel-sold" class="carousel-sold" src="/assets/verkauft.svg" alt="" aria-hidden="true" />
    <p v-if="catalog && !slides.length" class="empty-shop">Neue Produkte folgen bald.</p>
  </main>
</template>
