<script setup lang="ts">
const { data: product } = await useAsyncData('placeholder-02', () => queryCollection('products').where('productId', '=', 'produkt02').first())
if (product.value?.status === 'active' || product.value?.status === 'archived') await navigateTo('/produkte/produkt02', { redirectCode: 302 })
useHead({ title: 'Produkt 02 – Beeeda' })
</script>
<template><main class="subsite produkt02"><section class="gallery product-gallery"><div class="gallery-image"><img class="gallery-slide" src="/assets/02_2.png" alt="Produkt 02" /></div></section><section class="detail-content"><h1>Produkt 02</h1><p class="description-text">Diese Unterseite wird noch gestaltet.</p></section></main></template>
