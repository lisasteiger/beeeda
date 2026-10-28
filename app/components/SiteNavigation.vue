<script setup lang="ts">
const route = useRoute()
const { count, ready } = useCart()
const home = computed(() => route.path === '/')
const product = computed(() => route.path.startsWith('/produkte/'))
const homeHref = computed(() => product.value ? '/?back&product=' + encodeURIComponent(String(route.params.id)) : '/?back')
const cart = computed(() => route.path === '/warenkorb')
const controls = ref<HTMLElement>()
useHead(() => ({
  htmlAttrs: { class: product.value ? 'pinkchaos-page' : home.value ? 'home-page' : '' },
  bodyAttrs: { class: route.path === '/warenkorb' || route.path === '/kasse' ? 'shopping-cart' : '' }
}))
function back() {
  if (product.value) { goHome(); return }
  if (cart.value) { window.location.href = '/'; return }
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back()
  else window.location.href = '/'
}
let homeTimer: ReturnType<typeof setTimeout> | undefined
function returnHome(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return
  event.preventDefault()
  goHome()
}
function goHome() {
  clearTimeout(homeTimer)
  document.body.classList.add('subsite-leaving')
  homeTimer = setTimeout(() => { window.location.href = homeHref.value }, 900)
}
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(() => {
    if (controls.value) document.documentElement.style.setProperty('--content-top', controls.value.getBoundingClientRect().bottom + 'px')
  })
  if (controls.value) observer.observe(controls.value)
})
onBeforeUnmount(() => { observer?.disconnect(); clearTimeout(homeTimer) })
</script>
<template>
  <a v-if="home" class="site-link contact-link" href="mailto:hi@beeeda.ch">schreib uns</a>
  <button v-if="!home && !cart" id="closePage" class="close-corner site-link archive-link" aria-label="Schliessen" @click="back">×</button>
  <a class="cart-link" href="/warenkorb">Warenkorb<span v-if="ready && count"> ({{ count }})</span></a>
  <a class="site-link impressum-link" href="/impressum">Impressum</a>
  <a class="site-link about-link" href="/ueber-uns">Über uns</a>
  <div class="logo-layer" :class="{ 'home-logo': home }">
    <img v-if="home" class="main-logo" src="/assets/LOGO-01.svg" alt="Beeeda" />
    <div v-else ref="controls" class="logo-controls">
      <a class="logo-link" :href="homeHref" aria-label="Zurück zum Carousel" @click="returnHome"><img class="logo" src="/assets/LOGO-01.svg" alt="Beeeda" /></a>
      <button v-if="cart" id="closePage" class="close-page site-link" @click="back">weiterstöbern</button>
    </div>
  </div>
</template>
