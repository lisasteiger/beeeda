<script setup lang="ts">
const route = useRoute()
const orderId = String(route.query.order || '')
const { ready, completeOrder } = useCart()
const { data: order, refresh, error } = await useFetch<{ id: string; status: string; totalCents: number; items: { productId: string; quantity: number }[] }>('/api/orders/' + encodeURIComponent(orderId))
let timer: ReturnType<typeof setInterval> | undefined
watch(() => [order.value?.status, ready.value], () => {
  if (import.meta.client && ready.value && order.value?.status === 'paid') {
    completeOrder(order.value.id, order.value.items)
    clearInterval(timer)
  }
}, { immediate: true })
onMounted(() => {
  if (order.value?.status !== 'paid') timer = setInterval(() => refresh(), 4000)
})
onBeforeUnmount(() => clearInterval(timer))
useHead({ title: 'Bestellung – Beeeda' })
</script>
<template><main class="info-page order-result">
  <template v-if="order?.status === 'paid'"><h1>Danke für deine Bestellung.</h1><p>Deine Zahlung ist bestätigt.</p><p>Bestellnummer: {{ order.id }}</p></template>
  <template v-else-if="order?.status === 'expired' || order?.status === 'cancelled'"><h1>Zahlung nicht abgeschlossen.</h1><p>Du kannst deine Bestellung nochmals starten.</p></template>
  <template v-else-if="error"><h1>Bestellung nicht gefunden.</h1><p>Bitte öffne die Bestätigung im Browser, in dem du bestellt hast.</p></template>
  <template v-else><h1>Deine Zahlung wird geprüft.</h1><p>Die Bestätigung erscheint nach der Rückmeldung von Stripe.</p></template>
  <p><a href="/warenkorb">Zum Warenkorb</a></p>
</main></template>
