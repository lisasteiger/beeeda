<script setup lang="ts">
const { data: site } = await useAsyncData('site', () => queryCollection('site').first())
const name = ref(''), email = ref(''), order = ref(''), message = ref('')
function prepare() {
  location.href = 'mailto:' + site.value?.email + '?subject=' + encodeURIComponent('Rücksendung ' + order.value) +
    '&body=' + encodeURIComponent(name.value + '\n' + email.value + '\nBestellung: ' + order.value + '\n\n' + message.value)
}
useHead({ title: 'Rücksendungen – Beeeda' })
</script>
<template><main class="subsite info-page"><h1>Rücksendungen</h1><form class="return-form" @submit.prevent="prepare">
  <label for="return-name">Name</label><input id="return-name" v-model="name" required autocomplete="name" />
  <label for="return-email">E-Mail</label><input id="return-email" v-model="email" type="email" required autocomplete="email" />
  <label for="return-order">Bestellnummer</label><input id="return-order" v-model="order" />
  <label for="return-message">Nachricht</label><textarea id="return-message" v-model="message" rows="5" required />
  <button class="buy-button" type="submit">E-Mail vorbereiten</button><small>Öffnet dein E-Mail-Programm. Die Nachricht wird erst versendet, wenn du sie dort abschickst.</small>
</form></main></template>

