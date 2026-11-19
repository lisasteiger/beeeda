<script setup lang="ts">
import { orderedProducts } from '#shared/shop'
const { catalog } = useCart()
const { data: contentProducts } = await useAsyncData('carousel-products', () => queryCollection('products').all())
const carousel = ref<HTMLElement>()
const homeScroll = ref<HTMLElement>()
const showProductsReturn = ref(false)
function updateProductsReturn() {
  const scroll = homeScroll.value
  showProductsReturn.value = Boolean(scroll && scroll.scrollTop > scroll.clientHeight / 2)
}
function showProducts() {
  homeScroll.value?.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
const returning = ref(useRoute().query.back !== undefined)
useHead(() => ({ htmlAttrs: { class: returning.value ? 'home-page returning-from-subsite' : 'home-page' } }))
const products = computed(() => orderedProducts(contentProducts.value || []).filter(product => product.status !== 'draft'))
const slides = computed(() => products.value.map(product => {
  const sold = product.status === 'archived' || Boolean(catalog.value?.products.find(item => item.productId === product.productId)?.soldOut)
  return { id: product.productId, cover: product.cover, name: product.name, size: product.size || '', href: sold ? undefined : '/produkte/' + encodeURIComponent(product.productId), sold, reduced: Boolean(product.reduced) }
}))
let dispose: (() => void) | undefined
let stopWatching: (() => void) | undefined
let generation = 0
onMounted(() => {
  updateProductsReturn()
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
  <main ref="homeScroll" class="home-scroll" @scroll.passive="updateProductsReturn">
  <section id="carousel" ref="carousel" class="carousel" aria-label="Produkte" tabindex="0">
    <div class="carousel-inner">
      <div v-for="slide in slides" :key="slide.id" class="item" :data-product-id="slide.id" :data-sold="slide.sold" :data-reduced="slide.reduced">
        <component :is="slide.href ? 'a' : 'span'" :href="slide.href" class="image-link" draggable="false"><img :src="slide.cover" :alt="slide.name + (slide.sold ? ' – verkauft' : slide.reduced ? ' – reduziert' : '')" /></component>
      </div>
    </div>
    <span v-for="slide in slides" :key="'size-' + slide.id" class="site-link carousel-size">{{ slide.size }}</span>
    <img id="carousel-sold" class="carousel-sold" src="/assets/verkauft.svg" alt="" aria-hidden="true" />
    <img v-if="slides.some(slide => slide.reduced && !slide.sold)" id="carousel-reduced" class="carousel-sold" :src="'/assets/reduziert.svg'" alt="" aria-hidden="true" />
    <p v-if="catalog && !slides.length" class="empty-shop">Neue Produkte folgen bald.</p>
  </section>
  <section id="ueber-uns" class="home-texts" aria-label="Über Beeeda">
    <div class="home-about"><div class="info-page impressum-page about-page"><AboutText /></div></div>
  </section>
  </main>
  <button v-show="showProductsReturn" class="products-return" type="button" @click="showProducts"><span aria-hidden="true">^</span> Produkte</button>
</template>
<style>
.home-scroll { height: 100dvh; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth; scroll-snap-type: y mandatory; }
.home-scroll > section { scroll-snap-align: start; }
.home-texts { min-height: 100dvh; scroll-snap-stop: always; }
.home-scroll .carousel { position: relative; touch-action: pan-y; }
.home-about { position: relative; z-index: 3; display: flex; align-items: center; background: #fff; padding: 48px 0; }
.home-about:first-child { padding-top: 50dvh; }
.home-about:last-child { padding-bottom: 50dvh; }
.home-about .about-page { min-height: 0; padding-block: 0; justify-content: center; }
.products-return { position: fixed; z-index: 7000; top: 150px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 0; color: #000; font: 700 var(--corner-link-font-size) "Google Sans", sans-serif; border: 0; background: none; cursor: pointer; padding: 6px; }
.products-return span { display: block; font-size: 1.5em; line-height: 0.6; }
@media (prefers-reduced-motion: reduce) { .home-scroll { scroll-behavior: auto; } }
</style>
