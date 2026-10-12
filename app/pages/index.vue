<script setup lang="ts">
const { catalog } = useCart()
const returning = ref(useRoute().query.back !== undefined)
useHead(() => ({ htmlAttrs: { class: returning.value ? 'home-page returning-from-subsite' : 'home-page' } }))
const products = computed(() => (catalog.value?.products || []).filter(product => product.status !== 'draft'))
// Retain the original carousel images while the remaining products are being prepared.
const previews = [
  { cover: '/assets/02.png', name: 'Produkt 02', href: '/produkt02', sold: false },
  { cover: '/assets/07.png', name: 'Produktvorschau', href: undefined, sold: false },
  { cover: '/assets/03.png', name: 'Produktvorschau', href: undefined, sold: false },
  { cover: '/assets/05.png', name: 'Produktvorschau', href: undefined, sold: true },
  { cover: '/assets/06.png', name: 'Produktvorschau', href: undefined, sold: true }
]
const slides = computed(() => [
  ...products.value.map(product => ({ cover: product.cover, name: product.name, href: '/produkte/' + product.productId, sold: product.soldOut || product.status === 'archived' })),
  ...previews.filter(preview => !catalog.value?.products.some(product => product.cover === preview.cover))
])
onMounted(() => {
  requestAnimationFrame(() => { returning.value = false })
  // Full-page anchors retain the existing entrance animation and isolate carousel listeners.
  const script = document.createElement('script')
  script.src = '/carousel.js'
  document.body.append(script)
})
</script>
<template>
  <main id="carousel" class="carousel" aria-label="Produkte">
    <div class="carousel-inner">
      <div v-for="slide in slides" :key="slide.cover" class="item" :data-sold="slide.sold">
        <a :href="slide.href" class="image-link" draggable="false"><img :src="slide.cover" :alt="slide.name + (slide.sold ? ' – verkauft' : '')" /></a>
      </div>
    </div>
    <img id="carousel-sold" class="carousel-sold" src="/assets/verkauft.svg" alt="" aria-hidden="true" />
    <p v-if="catalog && !slides.length" class="empty-shop">Neue Produkte folgen bald.</p>
  </main>
</template>
