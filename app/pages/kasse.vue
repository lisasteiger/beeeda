<script setup lang="ts">
const { ready, catalog, lines, valid, refresh } = useCart()
const busy = ref(false)
const message = ref('')
const route = useRoute()
const { data: reservation, refresh: refreshReservation } = await useFetch('/api/checkout/current')
const requestKey = useState<string>('checkout-request', () => '')
useHead({ title: 'Kasse – Beeeda' })
onMounted(async () => {
  if (route.query.cancelled) await cancel()
  await refresh()
})
async function resume() {
  busy.value = true
  try {
    const result = await $fetch('/api/checkout/resume', { method: 'POST' })
    window.location.assign(result.url)
  } catch (error: any) { message.value = error.data?.message || 'Bitte prüfe deine Reservierung.'; await refreshReservation(); await refresh() }
  finally { busy.value = false }
}
async function cancel() {
  busy.value = true
  try {
    await $fetch('/api/checkout/cancel', { method: 'POST' })
    message.value = 'Deine Reservierung wurde aufgehoben.'
    requestKey.value = ''
    await refreshReservation(); await refresh()
  } catch (error: any) { message.value = error.data?.message || 'Die Reservierung konnte noch nicht aufgehoben werden.' }
  finally { busy.value = false }
}
async function pay() {
  busy.value = true
  message.value = ''
  if (!requestKey.value) requestKey.value = crypto.randomUUID()
  try {
    const result = await $fetch('/api/checkout', { method: 'POST', body: { items: lines.value, requestKey: requestKey.value } })
    window.location.assign(result.url)
  } catch (error: any) {
    message.value = error.data?.message || 'Die Zahlung konnte nicht gestartet werden. Bitte versuche es nochmals.'
    await refresh()
  } finally { busy.value = false }
}
watch(lines, () => { requestKey.value = '' }, { deep: true })
</script>
<template>
  <main class="cart-page">
    <header class="cart-heading"><h1>Kasse</h1></header>
    <div v-if="ready && lines.length" class="cart-layout">
      <section class="checkout-intro"><p>Lieferung ausschliesslich in die Schweiz.</p><p>Deine Lieferadresse und Zahlungsart gibst du im nächsten Schritt bei Stripe ein.</p><p v-if="!catalog?.checkoutReady">Der Online-Kauf wird gerade eingerichtet.</p><p v-else-if="!valid">Bitte prüfe die verfügbare Menge im Warenkorb.</p><a class="cart-remove" href="/warenkorb">Zurück zum Warenkorb</a></section>
      <section v-if="reservation" class="checkout-intro"><p>Du hast eine offene Reservierung.</p><p v-for="item in reservation.items" :key="item.productId">{{ item.quantity }} × {{ item.name }}</p><button class="cart-button" :disabled="busy" @click="resume">Zahlung fortsetzen</button> <button class="cart-remove" :disabled="busy" @click="cancel">Reservierung aufheben</button></section>
      <CartSummary checkout><button class="cart-button" :disabled="busy || Boolean(reservation) || !catalog?.checkoutReady || !valid" @click="pay">{{ busy ? 'Wird vorbereitet …' : 'Zur Zahlung' }}</button><p class="cart-message" role="alert">{{ message }}</p></CartSummary>
    </div>
    <div v-else-if="ready" class="cart-empty"><p>Dein Warenkorb ist leer.</p><a class="cart-button" href="/">Weiterstöbern</a></div>
  </main>
</template>
