<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())
const parts = computed(() => site.value?.about.split(/(Lisa|Laura)/) || [])
useHead({ title: 'Über uns – Beeeda' })
</script>
<template><main class="subsite info-page impressum-page about-page"><p><template v-for="(part, index) in parts" :key="index"><a v-if="part === 'Lisa'" href="https://lisasteiger.ch">Lisa</a><a v-else-if="part === 'Laura'" href="https://www.instagram.com/lako.mio/">Laura</a><template v-else>{{ part }}</template></template></p></main></template>

