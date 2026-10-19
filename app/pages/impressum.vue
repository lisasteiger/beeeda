<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())
useHead({ title: 'Impressum – Beeeda' })
</script>
<template><main class="subsite info-page impressum-page centered-impressum">
  <p>{{ site?.businessName }}<br />{{ site?.city }} SG<br /><br /><a :href="'mailto:' + site?.email">{{ site?.email }}</a><br /><a href="https://www.instagram.com/beeeda.ch/">@beeeda.ch</a></p>
  <p><a href="/ruecksendungen">Rücksendungen</a></p><p>Inhalt und Gestaltung<br /><a href="https://lisasteiger.ch">Lisa Steiger</a></p><p>Urheberrecht<br />Die Inhalte und Bilder dieser Website sind urheberrechtlich geschützt. Eine Verwendung, Vervielfältigung oder Weitergabe bedarf der Zustimmung der jeweiligen Rechteinhaber.</p>
</main></template>
