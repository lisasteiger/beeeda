<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())
const { data: legalDocuments } = await useAsyncData('legal-documents', () => queryCollection('legal').all())
const route = useRoute()
const section = computed(() => route.query.inhalt === 'agb' ? 'AGB' : route.query.inhalt === 'datenschutz' ? 'Datenschutz' : 'Impressum')
const legalDocument = computed(() => legalDocuments.value?.find(document => document.path === '/rechtliches/' + (section.value === 'AGB' ? 'agb' : 'datenschutz')))
watch(section, async () => { await nextTick(); window.scrollTo(0, 0) })
useHead(() => ({ title: section.value + ' – Beeeda' }))
</script>
<template><main class="subsite info-page impressum-page" :class="section === 'Impressum' ? 'centered-impressum' : 'legal-document'">
  <template v-if="section === 'Impressum'">
  <p>{{ site?.businessName }}<br />{{ site?.street }}<br />{{ site?.postalCode }} {{ site?.city }}<br /><br /><a :href="'mailto:' + site?.email">{{ site?.email }}</a><br /><a href="https://www.instagram.com/beeeda.ch/">@beeeda.ch</a></p>
  <p>Inhalt und Gestaltung<br /><a href="https://lisasteiger.ch">Lisa Steiger</a></p><p>Urheberrecht<br />Die Inhalte und Bilder dieser Website sind urheberrechtlich geschützt. Eine Verwendung, Vervielfältigung oder Weitergabe bedarf der Zustimmung der jeweiligen Rechteinhaber.</p>
  </template>
  <ContentRenderer v-else-if="legalDocument" :value="legalDocument" class="legal-prose" />
</main></template>
