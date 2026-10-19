<script setup lang="ts">
const { catalog } = useCart()
const returning = ref(useRoute().query.back !== undefined)
useHead(() => ({ htmlAttrs: { class: returning.value ? 'home-page returning-from-subsite' : 'home-page' } }))
const products = computed(() => (catalog.value?.products || []).filter(product => product.status !== 'draft'))
const slides = computed(() => products.value.map(product => ({ cover: product.cover, name: product.name, size: product.size || '', href: product.soldOut || product.status === 'archived' ? undefined : '/produkte/' + product.productId, sold: product.soldOut || product.status === 'archived' })))
onMounted(() => {
  requestAnimationFrame(() => { returning.value = false })
  // Full-page anchors retain the existing entrance animation and isolate carousel listeners.
  const script = document.createElement('script')
  script.type = 'module'
  script.src = '/carousel.js'
  document.body.append(script)
})
</script>
<template>
  <main id="carousel" class="carousel" aria-label="Produkte">
    <div class="carousel-inner">
      <div v-for="slide in slides" :key="slide.cover" class="item" :data-sold="slide.sold">
        <component :is="slide.href ? 'a' : 'span'" :href="slide.href" class="image-link" draggable="false"><img :src="slide.cover" :alt="slide.name + (slide.sold ? ' – verkauft' : '')" /></component>
      </div>
    </div>
    <span v-for="slide in slides" :key="'size-' + slide.cover" class="site-link carousel-size">{{ slide.size }}</span>
    <img id="carousel-sold" class="carousel-sold" src="/assets/verkauft.svg" alt="" aria-hidden="true" />
    <p v-if="catalog && !slides.length" class="empty-shop">Neue Produkte folgen bald.</p>
  </main>
</template>
