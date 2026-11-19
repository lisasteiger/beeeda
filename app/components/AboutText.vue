<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())
const paragraphs = computed(() => site.value?.about.split(/\n{2,}/) || [])
const copy = ref<HTMLElement>()
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(() => {
    const last = copy.value?.lastElementChild
    if (last) copy.value?.style.setProperty('--last-text-height', last.getBoundingClientRect().height + 'px')
    const productsButton = document.querySelector('.products-return')
    const footer = document.querySelector('.about-link')
    if (productsButton?.getBoundingClientRect().height && footer) {
      const center = (productsButton.getBoundingClientRect().bottom + footer.getBoundingClientRect().top) / 2
      copy.value?.style.setProperty('--mobile-text-center', center + 'px')
    }
  })
  if (copy.value) observer.observe(copy.value)
  const productsButton = document.querySelector('.products-return')
  if (productsButton) observer.observe(productsButton)
  const footer = document.querySelector('.about-link')
  if (footer) observer.observe(footer)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<template><div ref="copy" class="about-copy"><p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p></div></template>
<style scoped>
.about-copy { width: 100%; }
.about-copy p { white-space: pre-line; margin: 0; }
.about-copy p + p { margin-top: 5lh; }
.home-about .about-copy::after { content: ''; display: block; height: max(0px, calc(50dvh - var(--last-text-height, 0px) / 2)); }
@media (max-width: 700px) {
  .home-about .about-copy::after { height: max(0px, calc(100dvh - var(--mobile-text-center, 60dvh) - var(--last-text-height, 0px) / 2)); }
}
</style>
